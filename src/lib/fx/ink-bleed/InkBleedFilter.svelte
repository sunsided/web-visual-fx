<!--
@component
SVG `<filter>` that makes edges bleed like ink on paper: feTurbulence → feDisplacementMap (wander
the edges) → feGaussianBlur (wet) → feColorMatrix alpha soft step (re-form an edge), then
optionally a pooled pigment rim (feBlend multiply, masked near the edges), granulation (noise
mask) and density (feComponentTransfer).
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)`. `width` and
`height` are the filtered element's size in px, used to pad the filter region.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		grainMatrix,
		inkBleedDefaults as d,
		regionPadding,
		rimMatrix,
		stepMatrix,
		washAlpha,
		type InkBleedOptions
	} from './ink-bleed.js';

	type FilterOptions = Omit<InkBleedOptions, 'paper' | 'paperColor' | 'paperTexture'>;

	interface Props extends Partial<FilterOptions> {
		id: string;
		width?: number;
		height?: number;
	}

	let {
		id,
		width = 0,
		height = 0,
		spread = d.spread,
		roughness = d.roughness,
		octaves = d.octaves,
		seed = d.seed,
		blur = d.blur,
		threshold = d.threshold,
		softness = d.softness,
		pool = d.pool,
		poolWidth = d.poolWidth,
		grain = d.grain,
		grainSize = d.grainSize,
		density = d.density
	}: Props = $props();

	// Padding as a share of the element, so ink that bleeds past its box isn't cut off.
	let region = $derived.by(() => {
		const pad = regionPadding(spread, blur);
		const px = width > 0 ? pad / width : 0.1;
		const py = height > 0 ? pad / height : 0.1;
		return { x: -px, y: -py, width: 1 + 2 * px, height: 1 + 2 * py };
	});
</script>

<filter
	{id}
	x={region.x}
	y={region.y}
	width={region.width}
	height={region.height}
	color-interpolation-filters="sRGB"
>
	<feTurbulence
		type="fractalNoise"
		baseFrequency={1 / roughness}
		numOctaves={octaves}
		{seed}
		result="fibers"
	/>
	<feDisplacementMap
		in="SourceGraphic"
		in2="fibers"
		scale={spread}
		xChannelSelector="R"
		yChannelSelector="G"
		result="bled"
	/>
	<feGaussianBlur in="bled" stdDeviation={blur} result="wet" />
	<feColorMatrix in="wet" type="matrix" values={stepMatrix(threshold, softness)} result="ink" />
	{#if pool > 0}
		<!-- c × c: the same hue, darker and more saturated, like a thicker layer of pigment -->
		<feBlend in="ink" in2="ink" mode="multiply" result="dense" />
		<feGaussianBlur in="ink" stdDeviation={poolWidth} />
		<feColorMatrix type="matrix" values={rimMatrix()} result="rim" />
		<feComposite in="dense" in2="rim" operator="arithmetic" k1={pool} result="pooled" />
		<!-- the pigment that moved to the rim is missing from the middle of the wash -->
		<feComponentTransfer in="ink" result="wash">
			<feFuncA type="linear" slope={washAlpha(pool)} />
		</feComponentTransfer>
		<feComposite in="pooled" in2="wash" operator="over" result="pigment" />
	{:else}
		<feOffset in="ink" result="pigment" />
	{/if}
	{#if grain > 0}
		<feTurbulence
			type="fractalNoise"
			baseFrequency={1 / grainSize}
			numOctaves="2"
			seed={seed + 1}
		/>
		<feColorMatrix type="matrix" values={grainMatrix(grain)} result="granules" />
		<feComposite in="pigment" in2="granules" operator="arithmetic" k1="1" result="settled" />
	{:else}
		<feOffset in="pigment" result="settled" />
	{/if}
	<feComponentTransfer in="settled">
		<feFuncA type="linear" slope={density} />
	</feComponentTransfer>
</filter>
