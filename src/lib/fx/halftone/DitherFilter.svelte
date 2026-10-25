<!--
@component
SVG `<filter>` that posterizes its input to `levels` per channel, optionally with an ordered
(Bayer) dither: [feColorMatrix luminance] → feImage + feTile (threshold pattern) →
feComposite arithmetic → feComponentTransfer discrete → [feComponentTransfer ink/paper] →
feComposite in (keep the source's alpha).
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)` on any element.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { luminanceMatrix } from '../duotone/duotone';
	import {
		bayerTileUrl,
		discreteTable,
		halftoneDefaults as d,
		inkTables,
		quantizeCoefficients,
		type HalftoneOptions
	} from './halftone';

	type Props = Partial<
		Pick<
			HalftoneOptions,
			'monochrome' | 'ink' | 'paper' | 'levels' | 'dither' | 'matrixSize' | 'pixelSize'
		>
	> & { id: string };

	let {
		id,
		monochrome = d.monochrome,
		ink = d.ink,
		paper = d.paper,
		levels = d.levels,
		dither = d.dither,
		matrixSize = d.matrixSize,
		pixelSize = d.pixelSize
	}: Props = $props();

	let n = $derived(Number(matrixSize));
	let tile = $derived(bayerTileUrl(n, pixelSize));
	let k = $derived(quantizeCoefficients(levels));
	let table = $derived(discreteTable(levels));
	let inks = $derived(inkTables(ink, paper));
	const luminance = luminanceMatrix(1).join(' ');
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	{#if monochrome}
		<feColorMatrix in="SourceGraphic" type="matrix" values={luminance} result="source" />
	{/if}
	{#if dither}
		<feImage href={tile} x="0" y="0" width={n * pixelSize} height={n * pixelSize} result="cell" />
		<feTile in="cell" result="threshold" />
	{:else}
		<feFlood flood-color="#808080" result="threshold" />
	{/if}
	<feComposite
		in={monochrome ? 'source' : 'SourceGraphic'}
		in2="threshold"
		operator="arithmetic"
		k2={k.k2}
		k3={k.k3}
	/>
	<feComponentTransfer>
		<feFuncR type="discrete" tableValues={table} />
		<feFuncG type="discrete" tableValues={table} />
		<feFuncB type="discrete" tableValues={table} />
	</feComponentTransfer>
	{#if monochrome}
		<feComponentTransfer>
			<feFuncR type="table" tableValues={inks[0]} />
			<feFuncG type="table" tableValues={inks[1]} />
			<feFuncB type="table" tableValues={inks[2]} />
		</feComponentTransfer>
	{/if}
	<!-- The threshold layer is opaque, so transparent source areas picked up alpha 1/levels and a
	     visible pattern. Cut the result back to the source's shape. -->
	<feComposite in2="SourceGraphic" operator="in" />
</filter>
