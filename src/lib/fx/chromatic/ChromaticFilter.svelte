<!--
@component
SVG `<filter>` that splits its input into red, green and blue, moves each channel on its own and
screens them back together. Linear modes use `feOffset`; radial mode uses `feDisplacementMap`
with a gradient map, so the offset grows towards the edges.

Must be rendered inside an `<svg>`; reference it with `filter: url(#id)`.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { radialMap, radialScales, type ChannelOffsets } from './chromatic';

	interface Props {
		id: string;
		/** Size of the filtered element's border box in px. */
		width: number;
		height: number;
		/** Filter region padding around the element in px (see `regionPadding`). */
		pad: number;
		/** Linear modes: per-channel `feOffset` (see `channelOffsets`). */
		offsets: ChannelOffsets;
		/** Radial mode: offset at the element's edges in px. Wins over `offsets`. */
		radial?: number;
	}

	let { id, width, height, pad, offsets, radial }: Props = $props();

	const channels = ['r', 'g', 'b'] as const;

	// Keep one color channel (and alpha), drop the others.
	const only = {
		r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
		g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
		b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
	};

	// Only rebuilt on resize; the jitter changes the scales, not the map.
	let map = $derived(radial === undefined ? undefined : radialMap(width, height, pad));
	let scales = $derived(map && radial !== undefined ? radialScales(radial, map.edge) : undefined);
</script>

<!-- User-space px: for an HTML element the origin is its border box's top-left corner. -->
<filter
	{id}
	x={-pad}
	y={-pad}
	width={width + 2 * pad}
	height={height + 2 * pad}
	filterUnits="userSpaceOnUse"
	color-interpolation-filters="sRGB"
>
	{#if map}
		<!-- No x/y/width/height: covers the whole filter region. -->
		<feImage href={map.url} preserveAspectRatio="none" result="map" />
	{/if}
	{#each channels as c (c)}
		<feColorMatrix in="SourceGraphic" type="matrix" values={only[c]} result="only-{c}" />
		{#if scales}
			<feDisplacementMap
				in="only-{c}"
				in2="map"
				scale={scales[c]}
				xChannelSelector="R"
				yChannelSelector="G"
				result="moved-{c}"
			/>
		{:else}
			<feOffset in="only-{c}" dx={offsets[c].dx} dy={offsets[c].dy} result="moved-{c}" />
		{/if}
	{/each}
	<feBlend in="moved-r" in2="moved-g" mode="screen" result="rg" />
	<feBlend in="rg" in2="moved-b" mode="screen" />
</filter>
