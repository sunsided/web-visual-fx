<!--
@component
SVG `<filter>` that maps luminance through a two- or three-stop color ramp (duotone / gradient
map): feColorMatrix (luminance) → feComponentTransfer (table) → optional feComposite mix.
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)` on any element.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		duotoneDefaults as d,
		contrastPivot,
		luminanceMatrix,
		stopsOf,
		tableValues,
		type DuotoneOptions
	} from './duotone';

	interface Props extends Partial<DuotoneOptions> {
		id: string;
	}

	let {
		id,
		shadow = d.shadow,
		midtone = d.midtone,
		highlight = d.highlight,
		useMidtone = d.useMidtone,
		contrast = d.contrast,
		amount = d.amount,
		colorSpace = d.colorSpace
	}: Props = $props();

	let matrix = $derived(luminanceMatrix(contrast, contrastPivot(colorSpace)).join(' '));
	let tables = $derived(
		tableValues(stopsOf({ shadow, midtone, highlight, useMidtone }), colorSpace)
	);
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters={colorSpace}>
	<feColorMatrix in="SourceGraphic" type="matrix" values={matrix} />
	<feComponentTransfer result="mapped">
		<feFuncR type="table" tableValues={tables[0]} />
		<feFuncG type="table" tableValues={tables[1]} />
		<feFuncB type="table" tableValues={tables[2]} />
	</feComponentTransfer>
	{#if amount < 1}
		<feComposite
			in="mapped"
			in2="SourceGraphic"
			operator="arithmetic"
			k1="0"
			k2={amount}
			k3={1 - amount}
			k4="0"
		/>
	{/if}
</filter>
