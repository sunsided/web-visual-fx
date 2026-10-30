<!--
@component
SVG `<filter>` for posterize / cel shading: [feGaussianBlur] → feColorMatrix saturate →
feComponentTransfer `type="discrete"` per channel (alpha forced to 1) → optional ink lines from
`EdgeMagnitude` (Sobel), turned into the alpha of a flat ink layer and merged on top →
feComposite in (back to the source's shape).

Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)` on any element.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import EdgeMagnitude from '../edges/EdgeMagnitude.svelte';
	import {
		EDGE_TO_ALPHA,
		posterizeDefaults as d,
		posterizeTable,
		type PosterizeOptions
	} from './posterize.js';

	interface Props extends Partial<PosterizeOptions> {
		id: string;
	}

	let {
		id,
		levels = d.levels,
		smoothing = d.smoothing,
		saturation = d.saturation,
		colorSpace = d.colorSpace,
		inkEdges = d.inkEdges,
		ink = d.ink,
		inkStrength = d.inkStrength,
		inkThreshold = d.inkThreshold,
		inkWidth = d.inkWidth
	}: Props = $props();

	let table = $derived(posterizeTable(levels));
	let source = $derived(smoothing > 0 ? 'soft' : 'SourceGraphic');
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters={colorSpace}>
	{#if smoothing > 0}
		<feGaussianBlur in="SourceGraphic" stdDeviation={smoothing} result="soft" />
	{/if}
	<feColorMatrix in={source} type="saturate" values={String(saturation)} />
	<!-- Alpha to 1: blurred, half-transparent borders keep their (unpremultiplied) color. The
	     final feComposite cuts the result back to the source's shape. -->
	<feComponentTransfer result="flat">
		<feFuncR type="discrete" tableValues={table} />
		<feFuncG type="discrete" tableValues={table} />
		<feFuncB type="discrete" tableValues={table} />
		<feFuncA type="linear" slope="0" intercept="1" />
	</feComponentTransfer>
	{#if inkEdges}
		<EdgeMagnitude
			in={source}
			result="edges"
			operator="sobel"
			size="3"
			channels="color"
			strength={inkStrength}
			smoothing={0}
			threshold={inkThreshold}
			lineWidth={inkWidth}
		/>
		<feColorMatrix in="edges" type="matrix" values={EDGE_TO_ALPHA} result="coverage" />
		<feFlood flood-color={ink} />
		<feComposite in2="coverage" operator="in" result="ink" />
		<feMerge>
			<feMergeNode in="flat" />
			<feMergeNode in="ink" />
		</feMerge>
	{/if}
	<feComposite in2="SourceGraphic" operator="in" />
</filter>
