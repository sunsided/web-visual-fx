<!--
@component
SVG `<filter>` for edge detection, pencil sketch and emboss with `feConvolveMatrix`.

- sketch / edges: `EdgeMagnitude` (Sobel or Laplacian edge map) → [feTurbulence pencil grain,
  multiplied in with feComposite arithmetic] → feComponentTransfer table onto two colors (ink
  lines on paper for sketch, paper lines on ink for edges).
- emboss: feColorMatrix luminance → one directional feConvolveMatrix with bias 0.5 (mid-grey
  relief) → feComponentTransfer table onto the two colors.
- Optionally blended back onto the original colors (feBlend + feComposite arithmetic).

The result is opaque. Must be rendered inside an `<svg>`; reference it with CSS
`filter: url(#id)` on any element.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import EdgeMagnitude from './EdgeMagnitude.svelte';
	import {
		blendModeOf,
		convolveAttrs,
		edgesDefaults as d,
		embossKernel,
		grainCoefficients,
		opaqueLuminanceMatrix,
		rampTables,
		type EdgesOptions
	} from './edges.js';

	interface Props extends Partial<EdgesOptions> {
		id: string;
	}

	let {
		id,
		mode = d.mode,
		operator = d.operator,
		size = d.size,
		channels = d.channels,
		strength = d.strength,
		smoothing = d.smoothing,
		threshold = d.threshold,
		lineWidth = d.lineWidth,
		texture = d.texture,
		angle = d.angle,
		ink = d.ink,
		paper = d.paper,
		color = d.color
	}: Props = $props();

	const luminance = opaqueLuminanceMatrix().join(' ');

	let emboss = $derived(convolveAttrs(embossKernel(angle, size), strength));
	let grain = $derived(grainCoefficients(texture));
	// Sketch: no edge → paper, strong edge → ink. Edges: the other way round. Emboss: dark → ink.
	let tables = $derived(mode === 'edges' ? rampTables(ink, paper) : rampTables(paper, ink));
	let reliefTables = $derived(rampTables(ink, paper));
	let grainy = $derived(mode !== 'emboss' && texture > 0);
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	{#if mode === 'emboss'}
		{#if smoothing > 0}
			<feGaussianBlur in="SourceGraphic" stdDeviation={smoothing} />
		{/if}
		<feColorMatrix type="matrix" values={luminance} />
		<feConvolveMatrix
			order={emboss.order}
			kernelMatrix={emboss.kernelMatrix}
			divisor={emboss.divisor}
			bias={emboss.bias}
			edgeMode="duplicate"
			preserveAlpha="true"
			result="lines"
		/>
	{:else}
		<EdgeMagnitude
			result={grainy ? 'clean' : 'lines'}
			{operator}
			{size}
			{channels}
			{strength}
			{smoothing}
			{threshold}
			{lineWidth}
		/>
		{#if grainy}
			<!-- Long horizontal streaks: low frequency along x, high along y. -->
			<feTurbulence type="fractalNoise" baseFrequency="0.04 0.7" numOctaves="2" seed="7" />
			<feColorMatrix
				type="matrix"
				values="3 0 0 0 -1  3 0 0 0 -1  3 0 0 0 -1  0 0 0 0 1"
				result="grain"
			/>
			<feComposite
				in="clean"
				in2="grain"
				operator="arithmetic"
				k1={grain.k1}
				k2={grain.k2}
				result="lines"
			/>
		{/if}
	{/if}
	<feComponentTransfer in="lines" result="mapped">
		<feFuncR type="table" tableValues={(mode === 'emboss' ? reliefTables : tables)[0]} />
		<feFuncG type="table" tableValues={(mode === 'emboss' ? reliefTables : tables)[1]} />
		<feFuncB type="table" tableValues={(mode === 'emboss' ? reliefTables : tables)[2]} />
	</feComponentTransfer>
	{#if color > 0}
		<!-- Emboss lights the original with the raw grey relief; the others blend the drawing. -->
		<feBlend
			in={mode === 'emboss' ? 'lines' : 'mapped'}
			in2="SourceGraphic"
			mode={blendModeOf(mode)}
		/>
		{#if color < 1}
			<feComposite in2="mapped" operator="arithmetic" k2={color} k3={1 - color} />
		{/if}
	{/if}
</filter>
