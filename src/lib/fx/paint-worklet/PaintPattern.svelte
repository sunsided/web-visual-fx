<!--
@component
Experimental tier. A generative pattern (confetti dots, squiggles or organic blobs) behind its
children, painted by a CSS Paint Worklet: `background-image: paint(vfx-pattern)`, driven by
registered custom properties (`--vfx-paint-*`, see `paintProperties`). With `border` the
pattern only fills a ring around the content.

The CSS Painting API only exists in Chromium. Everywhere else, and until the worklet module has
loaded, the layer shows a gradient twin with the same colors, scale and seed
(`fallbackBackground`). So does a pattern inside a link (`<a href>`), where Chromium refuses to
run `paint()` (see `insideLink`). The root carries `data-renderer="worklet" | "gradient"`.

`animate` animates the registered `--vfx-paint-phase` with CSS keyframes, which makes the
worklet repaint every frame. It stops under `prefers-reduced-motion: reduce` and pauses inside a
`[data-motion='paused']` region (see `MotionToggle`). The pattern layer is `aria-hidden`.

Tokens: `--paint-pattern-surface` (background inside the ring in border mode, default none).
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		fallbackBackground,
		PAINT_NAME,
		paintPatternDefaults as d,
		paintVars,
		PHASE_DURATION,
		type PaintPatternOptions
	} from './paint-worklet.js';
	import { insideLink, loadPaintWorklet } from './support.js';

	type Props = Partial<PaintPatternOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof PaintPatternOptions> & {
			children?: Snippet;
		};

	let {
		pattern = d.pattern,
		size = d.size,
		density = d.density,
		stroke = d.stroke,
		jitter = d.jitter,
		seed = d.seed,
		color1 = d.color1,
		color2 = d.color2,
		color3 = d.color3,
		background = d.background,
		border = d.border,
		borderWidth = d.borderWidth,
		radius = d.radius,
		animate = d.animate,
		speed = d.speed,
		renderer = d.renderer,
		class: className,
		style,
		children,
		...rest
	}: Props = $props();

	// Set once the worklet module is registered; stays false where the API doesn't exist.
	let ready = $state(false);
	let root: HTMLDivElement | undefined = $state();

	onMount(() => {
		// Chromium paints no `paint()` image inside a link (a `:visited` privacy guard), so a
		// pattern in e.g. a card-sized `<a>` would show only its background color: use the twin.
		if (insideLink(root ?? null)) return;
		let alive = true;
		loadPaintWorklet().then((ok) => {
			if (alive) ready = ok;
		});
		return () => {
			alive = false;
		};
	});

	let options = $derived({
		pattern,
		size,
		density,
		stroke,
		jitter,
		seed,
		color1,
		color2,
		color3,
		background,
		border,
		borderWidth,
		radius,
		animate,
		speed,
		renderer
	});

	let worklet = $derived(ready && renderer === 'auto');
	let fallback = $derived(worklet ? undefined : fallbackBackground(options));
	let vars = $derived(
		Object.entries(paintVars(options))
			.map(([k, v]) => `${k}: ${v}`)
			.join('; ')
	);
</script>

<div
	bind:this={root}
	class={['paint-pattern', { border, animate: animate && worklet }, className]}
	data-renderer={worklet ? 'worklet' : 'gradient'}
	style:--_bg={background}
	style:--_radius="{radius}px"
	style:--_border="{borderWidth}px"
	style:--_duration="{PHASE_DURATION / Math.max(speed, 0.01)}s"
	{style}
	{...rest}
>
	<div
		class="art"
		aria-hidden="true"
		style={vars}
		style:background-image={worklet ? `paint(${PAINT_NAME})` : fallback?.image}
		style:background-size={fallback?.size}
		style:background-position={fallback?.position}
	></div>
	{@render children?.()}
</div>

<style>
	.paint-pattern {
		position: relative;
		isolation: isolate;
		border-radius: var(--_radius);
	}

	.art {
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		background-color: var(--_bg);
	}

	/* Border ring: the whole box minus the content box leaves only the padding. */
	.border {
		padding: var(--_border);
		background: var(--paint-pattern-surface, none);
	}

	.border .art {
		padding: var(--_border);
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
	}

	/*
	 * The phase is a registered <number> (CSS.registerProperty in support.ts), so the keyframes
	 * interpolate it smoothly and every frame invalidates the paint() image.
	 */
	.animate .art {
		animation: paint-phase var(--_duration) linear infinite;
	}

	@keyframes paint-phase {
		from {
			--vfx-paint-phase: 0;
		}
		to {
			--vfx-paint-phase: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate .art {
			animation: none;
		}
	}
</style>
