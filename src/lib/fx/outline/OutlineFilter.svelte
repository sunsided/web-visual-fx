<!--
@component
SVG `<filter>` that draws a sticker outline around whatever its input's alpha covers:
feMorphology dilate on SourceAlpha → [feGaussianBlur + feColorMatrix threshold, to round the
corners] → feFlood + feComposite in (color it), optionally a second, wider ring and a drop
shadow of the whole silhouette, all merged under the SourceGraphic.

The filter region is the element's own box (`0 0 100% 100%`), so the element needs empty room
around its content for the outline to grow into (see `outlinePadding`; `Outline` does this).
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)` on any element.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		outerRadius,
		outlineDefaults as d,
		roundingBlur,
		roundingMatrix,
		type OutlineOptions
	} from './outline.js';

	interface Props extends Partial<OutlineOptions> {
		id: string;
	}

	let {
		id,
		width = d.width,
		color = d.color,
		roundness = d.roundness,
		ring = d.ring,
		ringWidth = d.ringWidth,
		ringColor = d.ringColor,
		shadow = d.shadow,
		shadowX = d.shadowX,
		shadowY = d.shadowY,
		shadowBlur = d.shadowBlur,
		shadowColor = d.shadowColor,
		shadowOpacity = d.shadowOpacity
	}: Props = $props();

	const threshold = roundingMatrix();

	// One silhouette per ring: [result name, dilate radius, color].
	let layers = $derived([
		['stroke', width, color],
		...(ring ? [['ring', outerRadius({ width, ring, ringWidth }), ringColor]] : [])
	] as [string, number, string][]);
	let outer = $derived(layers[layers.length - 1][0]);
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	{#each layers as [name, radius, fill] (name)}
		{@const blur = roundingBlur(radius, roundness)}
		<feMorphology
			in="SourceAlpha"
			operator="dilate"
			{radius}
			result={blur > 0 ? `${name}-square` : `${name}-alpha`}
		/>
		{#if blur > 0}
			<feGaussianBlur in="{name}-square" stdDeviation={blur} />
			<feColorMatrix type="matrix" values={threshold} result="{name}-alpha" />
		{/if}
		<feFlood flood-color={fill} />
		<feComposite in2="{name}-alpha" operator="in" result={name} />
	{/each}
	{#if shadow}
		<feGaussianBlur in="{outer}-alpha" stdDeviation={shadowBlur} />
		<feOffset dx={shadowX} dy={shadowY} result="shadow-alpha" />
		<feFlood flood-color={shadowColor} flood-opacity={shadowOpacity} />
		<feComposite in2="shadow-alpha" operator="in" result="shadow" />
	{/if}
	<feMerge>
		{#if shadow}
			<feMergeNode in="shadow" />
		{/if}
		{#each [...layers].reverse() as [name] (name)}
			<feMergeNode in={name} />
		{/each}
		<feMergeNode in="SourceGraphic" />
	</feMerge>
</filter>
