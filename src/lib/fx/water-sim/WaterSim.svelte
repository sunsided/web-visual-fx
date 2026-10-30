<!--
@component
Experimental tier (WebGL2). An interactive water surface over an image: clicks and taps drop
stones, the pointer drags a wake, optional rain keeps it moving. The surface is a height field
stepped with the wave equation on the GPU (ping-pong float framebuffers) and the image is
refracted through it, with a sun glint on the slopes. Raw WebGL2, three small shaders.

The image is `src` (needs CORS if cross-origin) or, without it, a procedural tiled pool floor.
WebGL can't sample the page, so the water refracts that image, not the HTML around it; the
children render on top as ordinary, readable content.

Falls back to a still image (`src` or the tiles as CSS gradients) when WebGL2 or renderable
float textures are missing, before hydration, and while the context is lost; the context is
rebuilt when the browser restores it. The canvas pixel ratio is capped (`maxDpr`). The loop
runs only while the element is on screen and the tab is visible, stops once the water has
settled, and doesn't run at all under `prefers-reduced-motion: reduce`, with `paused`, or inside
a `[data-motion='paused']` region (see `MotionToggle`). Everything is released on destroy.

`renderer` (bindable, read-only) reports `pending`, `webgl2`, `static` or `lost`. `drop(x, y)`
(x, y from 0 to 1, top left) adds a drop from code, e.g. for a keyboard control.
-->
<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import { createWaterRenderer, type Drop, type WaterRenderer } from './gl.js';
	import { motionPaused } from './support.js';
	import {
		canvasSize,
		coverCrop,
		drawPoolFloor,
		nextRainDelay,
		pointerToUv,
		poolFloorCss,
		settleSteps,
		simSize,
		ticksFor,
		waterSimDefaults as d,
		type Size,
		type WaterRendererState,
		type WaterSimOptions
	} from './water-sim.js';

	type Props = Partial<WaterSimOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof WaterSimOptions> & {
			/** Image behind the water. Without it: a procedural pool floor. */
			src?: string;
			/** Stops the simulation (bind it to a `MotionToggle`). */
			paused?: boolean;
			/** Which renderer is active (read-only). */
			renderer?: WaterRendererState;
			children?: Snippet;
		};

	let {
		damping = d.damping,
		speed = d.speed,
		resolution = d.resolution,
		dropRadius = d.dropRadius,
		dropStrength = d.dropStrength,
		trail = d.trail,
		rain = d.rain,
		refraction = d.refraction,
		specular = d.specular,
		tint = d.tint,
		tintAmount = d.tintAmount,
		tileColor = d.tileColor,
		groutColor = d.groutColor,
		tileSize = d.tileSize,
		maxDpr = d.maxDpr,
		src,
		paused = false,
		renderer = $bindable('pending'),
		class: className,
		children,
		...rest
	}: Props = $props();

	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let root = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let cssWidth = $state(0);
	let cssHeight = $state(0);
	let dpr = $state(1);
	let onScreen = $state(true);
	let pageVisible = $state(true);
	let regionPaused = $state(false);
	// Bumped whenever a renderer is (re)created, so every setup effect reruns for it.
	let generation = $state(0);
	// True once the water has settled and nothing keeps it moving; the loop then stops.
	let idle = $state(true);
	let image = $state<HTMLImageElement>();

	// Per-frame state: plain variables, nothing to re-render.
	let water: WaterRenderer | undefined;
	let gl: WebGL2RenderingContext | null = null;
	let queue: Drop[] = [];
	let stepsSinceDrop = 0;
	let lastTrail: { x: number; y: number } | undefined;

	let css = $derived<Size>({ width: cssWidth, height: cssHeight });
	let backing = $derived(canvasSize(css, dpr, maxDpr));
	let sim = $derived(simSize(css, resolution));
	let live = $derived(renderer === 'webgl2' && cssWidth > 0 && cssHeight > 0);
	let moving = $derived(
		live && !reducedMotion.current && !paused && !regionPaused && onScreen && pageVisible
	);
	let running = $derived(moving && (!idle || rain > 0));
	let still = $derived.by(() => {
		if (src) return { image: `url(${JSON.stringify(src)})`, size: 'cover' };
		return poolFloorCss({ tileColor, groutColor, tileSize, tint, tintAmount });
	});

	function setup() {
		if (!canvas) return;
		try {
			gl = canvas.getContext('webgl2', {
				alpha: false,
				antialias: false,
				depth: false,
				stencil: false,
				premultipliedAlpha: false
			});
			if (!gl) throw new Error('WebGL2 unavailable');
			water = createWaterRenderer(gl);
			renderer = 'webgl2';
			generation++;
		} catch {
			water?.destroy();
			water = undefined;
			renderer = 'static';
		}
	}

	onMount(() => {
		if (!canvas || !root) return;
		const c = canvas;
		const lost = (e: Event) => {
			// preventDefault tells the browser we can handle a restore.
			e.preventDefault();
			water = undefined;
			renderer = 'lost';
		};
		const restored = () => setup();
		c.addEventListener('webglcontextlost', lost);
		c.addEventListener('webglcontextrestored', restored);
		setup();

		const observer = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting));
		observer.observe(root);
		const visibility = () => (pageVisible = !document.hidden);
		visibility();
		document.addEventListener('visibilitychange', visibility);

		// data-motion can be toggled anywhere above us; recheck on any change of the attribute.
		const node = root;
		const checkMotion = () => (regionPaused = motionPaused(node));
		checkMotion();
		const motion = new MutationObserver(checkMotion);
		motion.observe(document.documentElement, {
			subtree: true,
			attributes: true,
			attributeFilter: ['data-motion']
		});

		// Pixel ratio changes when the window moves to another screen or the page zooms.
		let query: MediaQueryList | undefined;
		const watchDpr = () => {
			dpr = window.devicePixelRatio || 1;
			query?.removeEventListener('change', watchDpr);
			query = matchMedia(`(resolution: ${dpr}dppx)`);
			query.addEventListener('change', watchDpr);
		};
		watchDpr();

		return () => {
			c.removeEventListener('webglcontextlost', lost);
			c.removeEventListener('webglcontextrestored', restored);
			observer.disconnect();
			motion.disconnect();
			query?.removeEventListener('change', watchDpr);
			document.removeEventListener('visibilitychange', visibility);
			water?.destroy();
			water = undefined;
			// Free the GPU context now instead of waiting for garbage collection; browsers cap
			// the number of live contexts per page.
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
			gl = null;
		};
	});

	// Load the image (if any).
	$effect(() => {
		if (!src) {
			image = undefined;
			return;
		}
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.decoding = 'async';
		let alive = true;
		img.onload = () => {
			if (alive) image = img;
		};
		img.src = src;
		return () => {
			alive = false;
		};
	});

	// Canvas backing store.
	$effect(() => {
		if (!canvas || !live) return;
		canvas.width = backing.width;
		canvas.height = backing.height;
		requestRender();
	});

	// Simulation grid; a new size clears the water.
	$effect(() => {
		void generation;
		if (!water || !live) return;
		water.resize(sim);
		requestRender();
	});

	// The texture behind the water, drawn at the canvas resolution (capped) with object-fit: cover.
	$effect(() => {
		void generation;
		if (!water || !live) return;
		const scale = Math.min(backing.width / css.width, 2048 / Math.max(css.width, css.height));
		const w = Math.max(1, Math.round(css.width * scale));
		const h = Math.max(1, Math.round(css.height * scale));
		const buffer = document.createElement('canvas');
		buffer.width = w;
		buffer.height = h;
		const ctx = buffer.getContext('2d');
		if (!ctx) return;
		if (image) {
			const crop = coverCrop(
				{ width: image.naturalWidth || w, height: image.naturalHeight || h },
				{ width: w, height: h }
			);
			ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
		} else {
			drawPoolFloor(ctx, w, h, scale, { tileColor, groutColor, tileSize });
		}
		water.setImage(buffer);
		requestRender();
	});

	// Redraw a still frame when the look changes while the loop isn't running.
	$effect(() => {
		void [refraction, specular, tint, tintAmount];
		requestRender();
	});

	let renderQueued = 0;
	function requestRender() {
		// untrack: callers are effects, and they shouldn't rerun just because the loop starts.
		if (renderQueued || untrack(() => running) || typeof requestAnimationFrame === 'undefined') {
			return;
		}
		renderQueued = requestAnimationFrame(() => {
			renderQueued = 0;
			draw();
		});
	}

	function draw() {
		if (!water || renderer !== 'webgl2' || !cssWidth || !cssHeight) return;
		water.render(backing, {
			refraction: [refraction / cssWidth, refraction / cssHeight],
			specular,
			tint,
			tintAmount
		});
	}

	// The simulation loop.
	$effect(() => {
		if (!running) return;
		let raf = 0;
		let last = 0;
		let carry = 0;
		let rainIn = nextRainDelay(rain, Math.random());
		const frame = (now: number) => {
			const dt = last ? Math.min((now - last) / 1000, 0.25) : 1 / 60;
			last = now;
			if (!water) return;
			if (rain > 0) {
				rainIn -= dt;
				while (rainIn <= 0) {
					queue.push({
						x: Math.random(),
						y: Math.random(),
						radius: cells(dropRadius) * (0.4 + Math.random() * 0.6),
						strength: dropStrength * (0.3 + Math.random() * 0.5)
					});
					rainIn += nextRainDelay(rain, Math.random());
				}
			} else {
				rainIn = nextRainDelay(1, Math.random());
			}
			// A handful of drops per frame is plenty; the rest would be invisible anyway.
			for (const drop of queue.splice(0, 8)) water.drop(drop);
			if (queue.length > 8) queue = [];
			const t = ticksFor(carry, dt);
			carry = t.carry;
			const steps = t.ticks * Math.round(speed);
			water.step(damping, steps);
			stepsSinceDrop += steps;
			draw();
			if (rain <= 0 && stepsSinceDrop > settleSteps(damping)) {
				idle = true;
				return;
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});

	/** Simulation cells for a length in CSS px. */
	function cells(px: number): number {
		return cssWidth ? (px * sim.width) / cssWidth : px;
	}

	function disturb(drop: Drop) {
		if (!moving) return;
		queue.push(drop);
		stepsSinceDrop = 0;
		idle = false;
	}

	/** Drops a stone at (x, y), both 0–1 from the top left. */
	export function drop(x: number, y: number, strength = dropStrength) {
		disturb({ x, y: 1 - y, radius: cells(dropRadius), strength });
	}

	function pointerdown(e: PointerEvent) {
		if (!root) return;
		const uv = pointerToUv(e.clientX, e.clientY, root.getBoundingClientRect());
		if (uv) disturb({ ...uv, radius: cells(dropRadius), strength: dropStrength });
	}

	function pointermove(e: PointerEvent) {
		if (!trail || !root) return;
		const rect = root.getBoundingClientRect();
		const uv = pointerToUv(e.clientX, e.clientY, rect);
		if (!uv) return;
		const p = { x: uv.x * rect.width, y: uv.y * rect.height };
		// One small drop per half radius of travel, so the wake doesn't depend on the event rate.
		if (lastTrail && Math.hypot(p.x - lastTrail.x, p.y - lastTrail.y) < dropRadius / 2) return;
		lastTrail = p;
		disturb({ ...uv, radius: cells(dropRadius * 0.6), strength: dropStrength * 0.12 });
	}
</script>

<div
	bind:this={root}
	bind:clientWidth={cssWidth}
	bind:clientHeight={cssHeight}
	class={['water-sim', className]}
	data-renderer={renderer}
	onpointerdown={pointerdown}
	onpointermove={pointermove}
	onpointerleave={() => (lastTrail = undefined)}
	{...rest}
>
	<div
		class={['still', { hidden: renderer === 'webgl2' }]}
		aria-hidden="true"
		style:background-image={still.image}
		style:background-size={still.size}
		style:--_tint={tint}
		style:--_tint-amount={src ? tintAmount : 0}
	></div>
	<canvas bind:this={canvas} class={{ hidden: renderer !== 'webgl2' }} aria-hidden="true"></canvas>
	{@render children?.()}
</div>

<style>
	.water-sim {
		position: relative;
		isolation: isolate;
		overflow: hidden;
	}

	canvas,
	.still {
		position: absolute;
		inset: 0;
		z-index: -1;
		inline-size: 100%;
		block-size: 100%;
	}

	canvas {
		display: block;
	}

	.still {
		background-position: center;
	}

	/* The tint over an image (the pool floor gradients already include it). */
	.still::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--_tint);
		opacity: var(--_tint-amount);
	}

	.hidden {
		visibility: hidden;
	}
</style>
