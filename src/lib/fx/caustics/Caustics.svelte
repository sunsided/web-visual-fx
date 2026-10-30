<!--
@component
Caustics: a dancing net of bright lines, like sunlight focused by waves onto a pool floor, laid
over the children. The children are washed with a water color and gently displaced by the same
moving surface, so they read as lying under water.

Every visual parameter is a prop (see `causticsSchema`). The motion is capped at `fps` and stands
still under `prefers-reduced-motion`, inside a `[data-motion="paused"]` region, offscreen, in
background tabs, and with `paused`. Works in every engine (plain SVG filter primitives).

The filtered content stays real, selectable text; only its pixels change. Text over caustics is
hard to read, so put the effect on a background layer.

Tokens: none; size and lay out the wrapper through `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { FlowClock } from '../ripple/flow-clock.svelte.js';
	import CausticsFilter from './CausticsFilter.svelte';
	import { causticsDefaults as d, causticsOffsets, type CausticsOptions } from './caustics.js';

	type Props = Partial<CausticsOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof CausticsOptions> & {
			/** Stop the motion, on top of the automatic pauses. */
			paused?: boolean;
			children?: Snippet;
		};

	let {
		lightColor = d.lightColor,
		intensity = d.intensity,
		lineWidth = d.lineWidth,
		sheen = d.sheen,
		frequency = d.frequency,
		octaves = d.octaves,
		warp = d.warp,
		seed = d.seed,
		tint = d.tint,
		tintOpacity = d.tintOpacity,
		wobble = d.wobble,
		animate = d.animate,
		speed = d.speed,
		direction = d.direction,
		fps = d.fps,
		tileSize = d.tileSize,
		paused = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `caustics-${uid}`;

	// Border-box size: the filter region is in px and has to cover two noise tiles.
	let width = $state(0);
	let height = $state(0);

	const clock = new FlowClock(() => ({ enabled: animate && speed > 0, fps, paused }));

	let offsets = $derived(causticsOffsets(clock.time, { speed, direction, tileSize }));
	let active = $derived(width > 0 && height > 0);
	// Displaced content can move half the wobble outwards.
	let pad = $derived(Math.ceil(wobble / 2) + 2);
</script>

<div
	class={['caustics', className]}
	style:filter={active ? `url(#${filterId})` : null}
	bind:offsetWidth={width}
	bind:offsetHeight={height}
	{@attach clock.attach}
	{...rest}
>
	{#if active}
		<svg class="defs" aria-hidden="true">
			<CausticsFilter
				id={filterId}
				{width}
				{height}
				{pad}
				{offsets}
				{lightColor}
				{intensity}
				{lineWidth}
				{sheen}
				{frequency}
				{octaves}
				{warp}
				{seed}
				{tint}
				{tintOpacity}
				{wobble}
				{tileSize}
			/>
		</svg>
	{/if}
	{@render children?.()}
</div>

<style>
	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
