<!--
@component
Trading-card style holographic foil: the card tilts towards the pointer in 3D, a rainbow foil
slides across an embossed relief, and a soft glare follows the pointer.

Pointer state lives in CSS custom properties on the card. A `requestAnimationFrame` loop smooths
the raw pointer position and writes three numbers, `--pointer-x`, `--pointer-y` (0–1) and
`--pointer-active` (0–1); CSS derives everything else from them (`--tilt-x`, `--tilt-y`,
`--foil-x`, `--foil-y`, shadow, glare, foil opacity). Nothing re-renders per frame.

Keyboard: the card is focusable, arrow keys tilt it (Shift: all the way), Escape or Home
straightens it. The instructions are its description and appear below it on keyboard focus. Touch works through pointer events. While nobody interacts, an optional idle
sweep sways the card (`idle`, `paused`). Under `prefers-reduced-motion` there is no tilt and no
motion at all: the foil rests at a fixed angle.

The `art` snippet is the illustration (gets the foil on top), `children` the text below it,
which sits on a nearly opaque (94%) plate above foil and glare so it keeps its contrast.

Tokens: `--holo-width`, `--holo-bg`, `--holo-padding`, `--holo-body-bg`, `--holo-body-color`.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import NoiseLayer from '../noise/NoiseLayer.svelte';
	import {
		foilBackground,
		holoDefaults as d,
		IDLE_ACTIVE,
		idlePoint,
		lerpFactor,
		nudge,
		pointerToUnit,
		REST,
		settled,
		STATIC_POSE,
		stepPose,
		type HoloOptions,
		type Point,
		type Pose
	} from './holo.js';

	type Props = Partial<HoloOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof HoloOptions> & {
			/** Stops the idle sweep (bind it to a `MotionToggle`). Pointer and keyboard still work. */
			paused?: boolean;
			/** Accessible name of the card. */
			label?: string;
			/** The illustration. */
			art?: Snippet;
			/** Text below the art. */
			children?: Snippet;
		};

	let {
		maxTilt = d.maxTilt,
		perspective = d.perspective,
		smoothing = d.smoothing,
		foilIntensity = d.foilIntensity,
		pattern = d.pattern,
		stripeWidth = d.stripeWidth,
		hueSpread = d.hueSpread,
		blendMode = d.blendMode,
		sparkle = d.sparkle,
		artOnly = d.artOnly,
		glare = d.glare,
		radius = d.radius,
		idle = d.idle,
		paused = false,
		label = 'Holographic card',
		art,
		children,
		class: className,
		...rest
	}: Props = $props();

	const hintId = $props.id();
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let foil = $derived(foilBackground(pattern, stripeWidth, hueSpread));

	let wrapper = $state<HTMLDivElement>();
	let card = $state<HTMLDivElement>();

	// Animation state. Plain variables, not $state: they change every frame and only ever reach
	// the DOM through style.setProperty, so Svelte has nothing to track or re-render.
	let pose: Pose = { ...REST };
	let input: Point | undefined;
	let source: 'pointer' | 'keyboard' | undefined;
	let onScreen = true;
	let raf = 0;
	let last = 0;
	const SWEEP_FRAME_MS = 1000 / 30 - 2;

	let sweeping = $derived(idle && !paused && !reducedMotion.current);

	function write(p: Pose) {
		card?.style.setProperty('--pointer-x', p.x.toFixed(4));
		card?.style.setProperty('--pointer-y', p.y.toFixed(4));
		card?.style.setProperty('--pointer-active', p.active.toFixed(4));
	}

	function target(now: number): Pose {
		if (input) return { ...input, active: 1 };
		if (sweeping && onScreen) return { ...idlePoint(now), active: IDLE_ACTIVE };
		return REST;
	}

	function frame(now: number) {
		// The idle sweep is slow; 30 fps is plenty and halves its cost. Input runs at full rate.
		const sweepOnly = !input && sweeping && onScreen;
		if (sweepOnly && last && now - last < SWEEP_FRAME_MS) {
			raf = requestAnimationFrame(frame);
			return;
		}
		const dt = last ? Math.min(now - last, 100) : 1000 / 60;
		last = now;
		const goal = target(now);
		pose = stepPose(pose, goal, lerpFactor(smoothing, dt));
		write(pose);
		// The idle sweep never settles; everything else stops the loop once it has arrived.
		if (!sweepOnly && settled(pose, goal)) {
			pose = goal;
			write(pose);
			raf = 0;
			last = 0;
			return;
		}
		raf = requestAnimationFrame(frame);
	}

	function wake() {
		if (!raf && !reducedMotion.current) raf = requestAnimationFrame(frame);
	}

	// Restart (or stop) the loop when anything it depends on changes.
	$effect(() => {
		if (reducedMotion.current) {
			cancelAnimationFrame(raf);
			raf = 0;
			pose = { ...STATIC_POSE };
			write(pose);
			return;
		}
		void sweeping;
		void smoothing;
		wake();
		return () => {
			cancelAnimationFrame(raf);
			raf = 0;
			last = 0;
		};
	});

	// Don't sway while scrolled out of view.
	onMount(() => {
		if (!wrapper) return;
		const observer = new IntersectionObserver(([entry]) => {
			onScreen = entry.isIntersecting;
			wake();
		});
		observer.observe(wrapper);
		return () => observer.disconnect();
	});

	function point(e: PointerEvent) {
		if (reducedMotion.current || !wrapper) return;
		// Measure the wrapper, not the card: the card's box changes while it rotates.
		input = pointerToUnit(e.clientX, e.clientY, wrapper.getBoundingClientRect());
		source = 'pointer';
		wake();
	}

	function release() {
		if (source !== 'pointer') return;
		input = undefined;
		source = undefined;
		wake();
	}

	function key(e: KeyboardEvent) {
		if (reducedMotion.current) return;
		const current = input ?? { x: 0.5, y: 0.5 };
		const next = nudge(current, e.key, e.shiftKey);
		// Only claim the key when it changes something, so Up/Down at an edge still scroll the page.
		if (!next || (next.x === current.x && next.y === current.y)) return;
		e.preventDefault();
		input = next;
		source = 'keyboard';
		wake();
	}

	function focus() {
		if (reducedMotion.current || source === 'pointer') return;
		input = { x: 0.5, y: 0.5 };
		source = 'keyboard';
		wake();
	}

	function blur() {
		if (source !== 'keyboard') return;
		input = undefined;
		source = undefined;
		wake();
	}
</script>

{#snippet foilLayer()}
	<div
		class="foil"
		aria-hidden="true"
		style:background-image={foil.image}
		style:background-size={foil.size}
		style:background-position={foil.position}
		style:background-blend-mode={foil.blend}
	>
		{#if sparkle > 0}
			<NoiseLayer
				class="sparkle"
				opacity={sparkle}
				blendMode="color-dodge"
				baseFrequency={0.75}
				numOctaves={2}
				contrast={3.5}
				brightness={-0.35}
			/>
		{/if}
	</div>
{/snippet}

<div
	class={['holo', className]}
	bind:this={wrapper}
	style:--_perspective="{perspective}px"
	onpointermove={point}
	onpointerdown={point}
	onpointerleave={release}
	onpointercancel={release}
	{...rest}
>
	<!--
		A focusable group: the card is a picture with text, not a control, but it has to take focus
		so keyboard users can tilt it with the arrow keys (described by the hint below).
	-->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="card"
		bind:this={card}
		role="group"
		aria-label={label}
		aria-describedby={reducedMotion.current ? undefined : hintId}
		aria-keyshortcuts={reducedMotion.current
			? undefined
			: 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Escape'}
		tabindex="0"
		style:--_max-tilt="{maxTilt}deg"
		style:--_radius="{radius}px"
		style:--_intensity={foilIntensity}
		style:--_blend={blendMode}
		style:--_glare={glare}
		onkeydown={key}
		onfocus={focus}
		onblur={blur}
	>
		<div class="art">
			{@render art?.()}
			{#if artOnly}
				{@render foilLayer()}
			{/if}
		</div>
		{#if !artOnly}
			{@render foilLayer()}
		{/if}
		<div class="glare" aria-hidden="true"></div>
		<div class="body">
			{@render children?.()}
		</div>
	</div>
	<!-- Read as the card's description, and shown below the card while it has keyboard focus. -->
	{#if !reducedMotion.current}
		<span id={hintId} class="hint">
			Use the arrow keys to tilt the card, Shift for a full tilt, Escape to straighten it.
		</span>
	{/if}
</div>

<style>
	.holo {
		position: relative;
		perspective: var(--_perspective);
		inline-size: var(--holo-width, 18rem);
		/* Lets touch drags tilt the card instead of scrolling the page. */
		touch-action: none;
	}

	.card {
		/* Written by the animation loop; these are the resting values. */
		--pointer-x: 0.5;
		--pointer-y: 0.5;
		--pointer-active: 0;

		/* Everything else is derived from those three numbers. */
		--tilt-x: calc((0.5 - var(--pointer-y)) * 2 * var(--_max-tilt));
		--tilt-y: calc((var(--pointer-x) - 0.5) * 2 * var(--_max-tilt));
		--foil-x: calc(var(--pointer-x) * 100%);
		--foil-y: calc(var(--pointer-y) * 100%);

		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-rows: auto 1fr;
		gap: var(--space-3);
		aspect-ratio: 5 / 7;
		padding: var(--holo-padding, var(--space-3));
		border-radius: var(--_radius);
		background: var(
			--holo-bg,
			linear-gradient(160deg, oklch(42% 0.09 260), oklch(30% 0.08 300) 55%, oklch(24% 0.06 330))
		);
		color: var(--holo-body-color, oklch(97% 0.01 285));
		transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
		scale: calc(1 + 0.04 * var(--pointer-active));
		box-shadow:
			calc((0.5 - var(--pointer-x)) * 40px) calc((0.5 - var(--pointer-y)) * 40px + 24px) 48px
				oklch(0% 0 0 / calc(0.25 + 0.2 * var(--pointer-active))),
			inset 0 0 0 1px oklch(100% 0 0 / 0.18);
		/* Pointer moves go through the JS smoothing; a CSS transition would only add lag. */
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.art {
		position: relative;
		z-index: 0;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: max(0px, calc(var(--_radius) - var(--space-2)));
		box-shadow: inset 0 0 0 1px oklch(100% 0 0 / 0.25);
	}

	.art > :global(:not(.foil)) {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}

	.foil {
		position: absolute;
		inset: 0;
		z-index: 1;
		isolation: isolate;
		border-radius: inherit;
		mix-blend-mode: var(--_blend);
		opacity: calc(var(--_intensity) * (0.4 + 0.6 * var(--pointer-active)));
		filter: brightness(0.75) contrast(1.4) saturate(1.3);
		pointer-events: none;
	}

	.foil :global(.sparkle) {
		border-radius: inherit;
	}

	.glare {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: inherit;
		background: radial-gradient(
			farthest-corner circle at var(--foil-x) var(--foil-y),
			oklch(100% 0 0 / 0.85),
			oklch(100% 0 0 / 0.2) 30%,
			oklch(0% 0 0 / 0.25) 85%
		);
		mix-blend-mode: overlay;
		opacity: calc(var(--_glare) * var(--pointer-active));
		pointer-events: none;
	}

	/* Text sits above foil and glare on a 94% opaque plate: ≥ 10:1 even over a pure white card. */
	.body {
		position: relative;
		z-index: 3;
		padding: var(--space-3);
		border-radius: max(0px, calc(var(--_radius) - var(--space-2)));
		background: var(--holo-body-bg, oklch(17% 0.03 285 / 0.94));
	}

	/* Visually hidden until the card has keyboard focus. */
	.hint {
		position: absolute;
		inset-block-start: calc(100% + var(--space-4));
		inset-inline: 0;
		z-index: 1;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.card:focus-visible + .hint {
		inline-size: auto;
		block-size: auto;
		clip-path: none;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-overlay);
		color: var(--color-text);
		font-size: var(--text-xs);
		line-height: var(--leading-tight);
		text-align: center;
		white-space: normal;
		box-shadow: var(--shadow-2);
	}

	/* The loop also stops and parks the foil at STATIC_POSE; this removes the tilt of that pose. */
	@media (prefers-reduced-motion: reduce) {
		.holo {
			/* Pointer input is ignored here, so don't keep touches from scrolling the page. */
			touch-action: auto;
		}

		.card {
			transform: none;
			scale: none;
		}
	}
</style>
