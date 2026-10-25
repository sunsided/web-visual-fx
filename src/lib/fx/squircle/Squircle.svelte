<!--
@component
Surface with superellipse corners that morphs smoothly when its shape or radius changes.

Uses CSS `corner-shape` where supported (Chromium 139+). Elsewhere it measures itself and
clips to a generated `clip-path: path()` with the same curve. A clip-path also clips outlines
and shadows, so in that mode don't rely on this element's own focus ring or box-shadow; put
them on a wrapper. Transitions are instant under `prefers-reduced-motion: reduce`.

Tokens: `--squircle-bg`, `--squircle-color`, `--squircle-padding`.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		cornerShapeCss,
		cornerShapeK,
		easingCss,
		squircleDefaults as d,
		superellipsePath,
		type SquircleOptions
	} from './squircle.js';
	import { supportsCornerShape } from './support.js';

	type Props = Partial<SquircleOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof SquircleOptions> & {
			/** The rendered element, e.g. to read its computed style. */
			element?: HTMLDivElement;
			children?: Snippet;
		};

	let {
		shape = d.shape,
		k = d.k,
		radius = d.radius,
		renderer = d.renderer,
		duration = d.duration,
		easing = d.easing,
		bounce = d.bounce,
		element = $bindable(),
		class: className,
		children,
		...rest
	}: Props = $props();

	// Decided after mount, so the prerendered HTML is the same for every browser.
	let supported = $state<boolean>();
	onMount(() => (supported = supportsCornerShape()));

	let mode = $derived(
		renderer === 'auto' ? (supported === false ? 'clip-path' : 'corner-shape') : renderer
	);

	let size = $state({ w: 0, h: 0 });

	/*
	 * Transitions are for shape changes only. They stay off until the first settled frame (so
	 * nothing morphs on load, when the clip or the detected mode is applied after hydration) and
	 * are switched off again for one frame whenever the size or the mode changes, so the clip
	 * follows a resize immediately instead of trailing it.
	 */
	let instant = $state(true);
	let frame = 0;

	function skipTransitions() {
		instant = true;
		cancelAnimationFrame(frame);
		// Two frames: the first renders with the new values, the second re-enables transitions.
		frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(() => (instant = false));
		});
	}

	$effect(() => {
		void mode;
		skipTransitions();
		return () => cancelAnimationFrame(frame);
	});

	// Only the clip-path needs the element's size (path() takes absolute coordinates).
	const measure: Attachment<HTMLElement> = (el) => {
		const observer = new ResizeObserver(([entry]) => {
			const box = entry.borderBoxSize[0];
			skipTransitions();
			size = { w: box.inlineSize, h: box.blockSize };
		});
		observer.observe(el);
		return () => observer.disconnect();
	};

	let clip = $derived(
		mode === 'clip-path' && size.w > 0
			? `path("${superellipsePath(size.w, size.h, radius, cornerShapeK(shape, k))}")`
			: undefined
	);
</script>

<div
	bind:this={element}
	class={['squircle', mode, { clipped: clip, instant }, className]}
	style:--_radius="{radius}px"
	style:--_shape={cornerShapeCss(shape, k)}
	style:--_clip={clip}
	style:--_duration="{duration}ms"
	style:--_easing={easingCss(easing, bounce)}
	{@attach mode === 'clip-path' ? measure : undefined}
	{...rest}
>
	{@render children?.()}
</div>

<style>
	.squircle {
		padding: var(--squircle-padding, var(--space-6));
		border-radius: var(--_radius);
		background: var(--squircle-bg, var(--color-accent-solid));
		color: var(--squircle-color, var(--color-on-accent));
		transition-property: corner-shape, border-radius, clip-path;
		transition-duration: var(--_duration);
		transition-timing-function: var(--_easing);
	}

	.corner-shape {
		corner-shape: var(--_shape);
	}

	/* The path is the whole shape. A border-radius would cut off squircle corners, which bulge out
	   further than round ones. */
	.clipped {
		border-radius: 0;
		clip-path: var(--_clip);
	}

	.instant {
		transition-duration: 0s;
	}

	@media (prefers-reduced-motion: reduce) {
		.squircle {
			transition-duration: 0s;
		}
	}
</style>
