<!--
@component
SVG `<filter>` for the glitch: splits the input into red, green and blue, moves each channel
sideways by its split (`feOffset`), and on a glitch frame shifts horizontal slices of every
channel with `feDisplacementMap`, reading the row offsets from a generated map (`feImage`). The
three channels are screened back together.

Everything is in user-space px (the element's border box), so `width`/`height` must match the
filtered element and `map` must have one row per px (see `sliceMapUrl`). Must be rendered inside
an `<svg>`; reference it with `filter: url(#id)`.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import type { ChannelOffsets } from '../chromatic/chromatic.js';

	interface Props {
		id: string;
		width: number;
		height: number;
		/** Horizontal filter-region padding in px (see `glitchPadding`). */
		pad: number;
		/** Per-channel `feOffset` for the channel split. */
		offsets: ChannelOffsets;
		/** Slice map data URL; empty for a calm frame (no displacement). */
		map?: string;
		/** Per-channel `feDisplacementMap` scales (see `sliceScales`). */
		scales?: Record<'r' | 'g' | 'b', number>;
	}

	let { id, width, height, pad, offsets, map = '', scales }: Props = $props();

	const channels = ['r', 'g', 'b'] as const;

	// Keep one color channel (and alpha), drop the others.
	const only = {
		r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
		g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
		b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
	};
</script>

<!-- Slices only move sideways, so the region is padded horizontally only. -->
<filter
	{id}
	x={-pad}
	y="0"
	width={width + 2 * pad}
	{height}
	filterUnits="userSpaceOnUse"
	primitiveUnits="userSpaceOnUse"
	color-interpolation-filters="sRGB"
>
	{#if map && scales}
		<feImage
			href={map}
			x={-pad}
			y="0"
			width={width + 2 * pad}
			{height}
			preserveAspectRatio="none"
			result="map"
		/>
	{/if}
	{#each channels as c (c)}
		<feColorMatrix in="SourceGraphic" type="matrix" values={only[c]} result="only-{c}" />
		<feOffset in="only-{c}" dx={offsets[c].dx} dy="0" result="split-{c}" />
		{#if map && scales}
			<!-- Green in the map is 128 everywhere, so nothing moves vertically. -->
			<feDisplacementMap
				in="split-{c}"
				in2="map"
				scale={scales[c]}
				xChannelSelector="R"
				yChannelSelector="G"
				result="moved-{c}"
			/>
		{:else}
			<feOffset in="split-{c}" result="moved-{c}" />
		{/if}
	{/each}
	<feBlend in="moved-r" in2="moved-g" mode="screen" result="rg" />
	<feBlend in="rg" in2="moved-b" mode="screen" />
</filter>
