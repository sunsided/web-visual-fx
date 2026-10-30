<!--
@component
SVG `<filter>` that turns its input into a mosaic of `size`×`size` blocks with the classic
sample-and-hold chain: feFlood (one dot) → feComposite (crop to one cell) → feTile (a grid of
dots) → feComposite in (sample the source at the dots) → feMorphology dilate (grow each sample
into its block). With a gap or rounded tiles, a tiled feImage mask cuts the tile shapes and an
optional grout color fills behind them.
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)` on any element.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		isShaped,
		mosaicCell,
		pixelateDefaults as d,
		tileMaskUrl,
		type PixelateOptions
	} from './pixelate.js';

	type Props = Partial<
		Pick<PixelateOptions, 'size' | 'gap' | 'roundness' | 'fillGrout' | 'grout'>
	> & {
		id: string;
	};

	let {
		id,
		size = d.size,
		gap = d.gap,
		roundness = d.roundness,
		fillGrout = d.fillGrout,
		grout = d.grout
	}: Props = $props();

	let cell = $derived(mosaicCell(size));
	let shaped = $derived(isShaped(gap, roundness));
	let mask = $derived(shaped ? tileMaskUrl(cell.size, gap, roundness) : '');
</script>

<!-- sRGB: nothing here mixes colors, so a round trip through linearRGB would only cost precision. -->
<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	<feFlood
		x={cell.offset}
		y={cell.offset}
		width={cell.dot}
		height={cell.dot}
		flood-color="#fff"
		result="dot"
	/>
	<feComposite in="dot" in2="dot" x="0" y="0" width={cell.size} height={cell.size} result="cell" />
	<feTile in="cell" result="dots" />
	<feComposite in="SourceGraphic" in2="dots" operator="in" result="samples" />
	<feMorphology in="samples" operator="dilate" radius={cell.radius} result="blocks" />
	{#if shaped}
		<feImage
			href={mask}
			x="0"
			y="0"
			width={cell.size}
			height={cell.size}
			preserveAspectRatio="none"
			result="shape"
		/>
		<feTile in="shape" result="mask" />
		<feComposite in="blocks" in2="mask" operator="in" result="tiles" />
		{#if fillGrout}
			<feFlood flood-color={grout} result="grout" />
			<feMerge>
				<feMergeNode in="grout" />
				<feMergeNode in="tiles" />
			</feMerge>
		{/if}
	{/if}
</filter>
