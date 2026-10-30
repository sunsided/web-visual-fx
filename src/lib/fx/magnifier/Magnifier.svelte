<!--
@component
Magnifying lens over its children: a round loupe or fisheye that follows the mouse and zooms the
content under it, with an SVG `feDisplacementMap` driven by a generated radial map. The content
itself stays real, selectable text; only its pixels are bent.

Every visual parameter is a prop (see `magnifierSchema`). The lens position is `x`/`y` (0–1 of
the element, bindable). It is keyboard operable: the lens is focusable, the arrow keys move it
(Shift for bigger steps) and Home centers it. It is exposed as a slider whose value text reads
both coordinates. With a mouse it
follows the pointer (smoothed, unless the user prefers reduced motion); on touch screens drag the
lens itself, so the page still scrolls elsewhere. The lens never captures clicks from a mouse.

`backdrop` magnifies with `backdrop-filter: url()` on the lens instead of filtering the whole
content. That only processes the lens area, but renders in Chromium only (see
`../glass/support.ts`); elsewhere, or until mounted, the content filter is used.

Tokens: `--magnifier-ring` (ring color), `--magnifier-focus` (focus outline color).
-->
<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import { supportsBackdropSvgFilter } from '../glass/support.js';
	import { lerpFactor, pointerToUnit } from '../holo/holo.js';
	import MagnifierFilter from './MagnifierFilter.svelte';
	import {
		keyMove,
		lensMapUrl,
		lensScale,
		magnifierDefaults as d,
		positionText,
		type MagnifierOptions,
		type Point
	} from './magnifier.js';

	type Props = Partial<MagnifierOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof MagnifierOptions | 'x' | 'y'> & {
			/** Lens center across the element, 0–1. */
			x?: number;
			/** Lens center down the element, 0–1. */
			y?: number;
			/** Accessible name of the lens. */
			label?: string;
			/** Use the backdrop variant even where it isn't known to render. */
			forceBackdrop?: boolean;
			children?: Snippet;
		};

	let {
		radius = d.radius,
		zoom = d.zoom,
		profile = d.profile,
		rim = d.rim,
		smoothing = d.smoothing,
		ring = d.ring,
		shadow = d.shadow,
		backdrop = d.backdrop,
		x = $bindable(0.5),
		y = $bindable(0.5),
		label = 'Magnifier',
		forceBackdrop = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const contentId = `magnifier-${uid}`;
	const backdropId = `magnifier-bd-${uid}`;
	const hintId = `magnifier-hint-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	// Decided after mount to keep the prerendered HTML deterministic.
	let detected = $state(false);
	onMount(() => (detected = supportsBackdropSvgFilter()));
	let viaBackdrop = $derived(backdrop && (detected || forceBackdrop));

	let width = $state(0);
	let height = $state(0);

	// Where the lens is drawn: (x, y) directly, or following it with frame-rate independent
	// smoothing on a requestAnimationFrame loop that stops once the lens has arrived.
	let instant = $derived(reducedMotion.current || smoothing <= 0);
	let smoothed = $state<Point>({ x: 0.5, y: 0.5 });
	let shown = $derived(instant ? { x, y } : smoothed);

	$effect(() => {
		if (instant) return;
		const target = { x, y };
		// Start from wherever the lens is now, without re-running on every step.
		let from = untrack(() => smoothed);
		let last = performance.now();
		let raf = requestAnimationFrame(function step(now) {
			const t = lerpFactor(smoothing, now - last);
			last = now;
			from = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t };
			const done = Math.abs(target.x - from.x) < 1e-4 && Math.abs(target.y - from.y) < 1e-4;
			smoothed = done ? target : from;
			if (!done) raf = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(raf);
	});

	// The map depends only on the lens shape, not on its position. Built in the browser once the
	// element has a size, so the prerendered HTML doesn't carry a large data URL.
	let lens = $derived({ radius, zoom, profile, rim });
	let map = $derived(width > 0 ? lensMapUrl(lens) : '');
	let scale = $derived(lensScale(lens));
	let size = $derived(Math.max(2, Math.round(radius * 2)));
	let left = $derived(shown.x * width - size / 2);
	let top = $derived(shown.y * height - size / 2);
	let active = $derived(map !== '' && zoom > 1);

	function onpointermove(event: PointerEvent & { currentTarget: HTMLElement }) {
		if (event.pointerType === 'touch' && !dragging) return;
		const p = pointerToUnit(
			event.clientX,
			event.clientY,
			event.currentTarget.getBoundingClientRect()
		);
		x = p.x;
		y = p.y;
	}

	// Touch: drag the lens itself (it has touch-action: none), the rest of the page still scrolls.
	let dragging = $state(false);

	function onlenspointerdown(event: PointerEvent & { currentTarget: HTMLElement }) {
		if (event.pointerType !== 'touch') return;
		dragging = true;
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onlenspointerup() {
		dragging = false;
	}

	function onkeydown(event: KeyboardEvent) {
		const next = keyMove({ x, y }, event.key, event.shiftKey);
		if (!next) return;
		event.preventDefault();
		x = next.x;
		y = next.y;
	}
</script>

<div
	class={['magnifier', className]}
	data-backdrop={viaBackdrop || undefined}
	style:--_ring={ring}
	style:--_shadow={shadow}
	bind:offsetWidth={width}
	bind:offsetHeight={height}
	{onpointermove}
	{...rest}
>
	{#if active}
		<svg class="defs" aria-hidden="true">
			{#if viaBackdrop}
				<MagnifierFilter
					id={backdropId}
					width={size}
					height={size}
					x={0}
					y={0}
					{size}
					{map}
					{scale}
				/>
			{:else}
				<MagnifierFilter id={contentId} {width} {height} x={left} y={top} {size} {map} {scale} />
			{/if}
		</svg>
	{/if}
	<div class="content" style:filter={active && !viaBackdrop ? `url(#${contentId})` : null}>
		{@render children?.()}
	</div>
	<!-- A two-dimensional slider, as in common color pickers: valuenow is the x position and
	     valuetext reads both coordinates. -->
	<div
		class="lens"
		role="slider"
		aria-label={label}
		aria-describedby={hintId}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(x * 100)}
		aria-valuetext={positionText({ x, y })}
		tabindex="0"
		style:inline-size="{size}px"
		style:translate="{left}px {top}px"
		style:backdrop-filter={active && viaBackdrop ? `url(#${backdropId})` : null}
		{onkeydown}
		onpointerdown={onlenspointerdown}
		onpointerup={onlenspointerup}
		onpointercancel={onlenspointerup}
	></div>
	<p id={hintId} class="visually-hidden">
		Arrow keys move the lens, with Shift in bigger steps. Home centers it.
	</p>
</div>

<style>
	.magnifier {
		position: relative;
		overflow: hidden;
	}

	.content {
		block-size: 100%;
	}

	.lens {
		position: absolute;
		inset: 0 auto auto 0;
		aspect-ratio: 1;
		border-radius: 50%;
		/* A mouse always hovers the lens center, so it must not swallow clicks. */
		pointer-events: none;
		box-shadow:
			0 0 0 2px oklch(from var(--magnifier-ring, white) l c h / calc(var(--_ring) * 0.9)),
			0 0 0 5px oklch(0% 0 0 / calc(var(--_ring) * 0.25)),
			0 calc(18px * var(--_shadow)) calc(40px * var(--_shadow)) oklch(0% 0 0 / var(--_shadow));
		background: radial-gradient(
			circle at 30% 25%,
			oklch(100% 0 0 / calc(var(--_ring) * 0.35)),
			transparent 35%
		);
	}

	.lens:focus-visible {
		outline: 3px solid var(--magnifier-focus, var(--color-focus, oklch(70% 0.2 250)));
		outline-offset: 6px;
	}

	/* Touch screens: drag the lens itself. */
	@media (hover: none) {
		.lens {
			pointer-events: auto;
			touch-action: none;
		}
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
