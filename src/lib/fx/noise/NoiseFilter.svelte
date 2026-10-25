<!--
@component
SVG `<filter>` producing (optionally monochrome) turbulence noise.
Must be rendered inside an `<svg>`; reference it with `filter="url(#id)"`.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { turbulenceDefaults as d, type TurbulenceOptions } from './noise';

	interface Props extends Partial<TurbulenceOptions> {
		id: string;
	}

	let {
		id,
		type = d.type,
		baseFrequency = d.baseFrequency,
		stretch = d.stretch,
		numOctaves = d.numOctaves,
		seed = d.seed,
		stitchTiles = d.stitchTiles,
		monochrome = d.monochrome,
		contrast = d.contrast,
		brightness = d.brightness,
		alphaNoise = d.alphaNoise
	}: Props = $props();

	// Linear contrast around mid-grey: out = slope * in + intercept
	let intercept = $derived(0.5 - 0.5 * contrast + brightness);
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	<feTurbulence
		{type}
		baseFrequency="{baseFrequency} {baseFrequency * stretch}"
		{numOctaves}
		{seed}
		stitchTiles={stitchTiles ? 'stitch' : 'noStitch'}
		result="noise"
	/>
	{#if monochrome}
		<feColorMatrix type="saturate" values="0" />
	{/if}
	<feComponentTransfer>
		<feFuncR type="linear" slope={contrast} {intercept} />
		<feFuncG type="linear" slope={contrast} {intercept} />
		<feFuncB type="linear" slope={contrast} {intercept} />
		{#if !alphaNoise}
			<feFuncA type="linear" slope="0" intercept="1" />
		{/if}
	</feComponentTransfer>
</filter>
