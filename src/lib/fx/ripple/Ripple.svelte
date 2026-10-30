<!--
@component
Water ripple / heat haze: the children (or, in `backdrop` mode, whatever is behind the element)
wobble as if seen through moving water or rising hot air. Animated feTurbulence →
feDisplacementMap, with the noise computed on one small tile (see `FlowNoise`).

Every visual parameter is a prop (see `rippleSchema`; `ripplePresets` has water, heat haze and
underwater). The motion is capped at `fps` and stands still under `prefers-reduced-motion`,
inside a `[data-motion="paused"]` region, offscreen, in background tabs, and with `paused`.

Content mode works in every engine. Backdrop mode needs `backdrop-filter: url()`, which only
Chromium renders; elsewhere it falls back to `blur(fallbackBlur)` (`forceBackdrop` overrides the
check, see `supportsBackdropSvgFilter`). In backdrop mode the children are drawn unfiltered on
top, like on a glass panel.

The filtered content stays real, selectable text; only its pixels move.

Tokens: none; size and lay out the wrapper through `class`/`style`.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { hexToRgba } from '../glass/glass.js';
	import { supportsBackdropSvgFilter } from '../glass/support.js';
	import { FlowClock } from './flow-clock.svelte.js';
	import RippleFilter from './RippleFilter.svelte';
	import {
		rippleDefaults as d,
		regionPadding,
		rippleOffsets,
		type RippleOptions
	} from './ripple.js';

	type Props = Partial<RippleOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof RippleOptions> & {
			/** Stop the motion, on top of the automatic pauses. */
			paused?: boolean;
			/** Backdrop mode: use the SVG filter even where it isn't known to render. */
			forceBackdrop?: boolean;
			children?: Snippet;
		};

	let {
		strength = d.strength,
		frequency = d.frequency,
		stretch = d.stretch,
		octaves = d.octaves,
		seed = d.seed,
		animate = d.animate,
		speed = d.speed,
		direction = d.direction,
		crossWaves = d.crossWaves,
		fps = d.fps,
		tileSize = d.tileSize,
		tint = d.tint,
		tintOpacity = d.tintOpacity,
		backdrop = d.backdrop,
		fallbackBlur = d.fallbackBlur,
		paused = false,
		forceBackdrop = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `ripple-${uid}`;

	// Border-box size: the filter region is in px and has to cover two noise tiles.
	let width = $state(0);
	let height = $state(0);

	const clock = new FlowClock(() => ({ enabled: animate && speed > 0, fps, paused }));

	// Decided after mount so the prerendered HTML is the same everywhere.
	let detected = $state(false);
	onMount(() => (detected = supportsBackdropSvgFilter()));
	let svgBackdrop = $derived(backdrop && (detected || forceBackdrop));

	let offsets = $derived(rippleOffsets(clock.time, { speed, direction, crossWaves, tileSize }));
	let ready = $derived(width > 0 && height > 0);
	let useFilter = $derived(ready && (strength > 0 || (!backdrop && tintOpacity > 0)));
	let url = $derived(useFilter ? `url(#${filterId})` : null);

	let backdropValue = $derived.by(() => {
		if (!backdrop) return null;
		if (svgBackdrop) return url;
		return fallbackBlur > 0 ? `blur(${fallbackBlur}px)` : null;
	});
</script>

<div
	class={['ripple', className]}
	style:filter={backdrop ? null : url}
	style:--_backdrop={backdropValue}
	style:background-color={backdrop && tintOpacity > 0 ? hexToRgba(tint, tintOpacity) : null}
	bind:offsetWidth={width}
	bind:offsetHeight={height}
	{@attach clock.attach}
	{...rest}
>
	{#if useFilter && (!backdrop || svgBackdrop)}
		<svg class="defs" aria-hidden="true">
			<RippleFilter
				id={filterId}
				{width}
				{height}
				pad={regionPadding(strength)}
				{strength}
				{frequency}
				{stretch}
				{octaves}
				{seed}
				{tileSize}
				{offsets}
				{tint}
				tintOpacity={backdrop ? 0 : tintOpacity}
			/>
		</svg>
	{/if}
	{@render children?.()}
</div>

<style>
	.ripple {
		-webkit-backdrop-filter: var(--_backdrop, none);
		backdrop-filter: var(--_backdrop, none);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
