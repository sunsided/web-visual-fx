<!--
@component
SVG `<filter>` that melts nearby shapes into each other: feGaussianBlur → feColorMatrix alpha
threshold → (optionally) feComposite atop the source graphic.
Must be rendered inside an `<svg>`; reference it with `filter: url(#id)` on a container.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { filterRegion, gooDefaults as d, gooMatrix, type GooOptions } from './gooey';

	interface Props extends Partial<GooOptions> {
		id: string;
	}

	let {
		id,
		blur = d.blur,
		sharpness = d.sharpness,
		offset = d.offset,
		keepColors = d.keepColors,
		region = d.region
	}: Props = $props();

	let r = $derived(filterRegion(region));
</script>

<filter {id} x={r.x} y={r.y} width={r.width} height={r.height} color-interpolation-filters="sRGB">
	<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
	<feColorMatrix in="blur" type="matrix" values={gooMatrix(sharpness, offset)} result="goo" />
	{#if keepColors}
		<feComposite in="SourceGraphic" in2="goo" operator="atop" />
	{/if}
</filter>
