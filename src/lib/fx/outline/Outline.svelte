<!--
@component
Gives its children a die-cut sticker outline that follows their alpha: transparent images,
inline SVG icons and text all get a solid stroke around their actual shape, optionally with a
second keyline ring and a drop shadow under the whole sticker.

The wrapper pads itself by the outline's reach (and takes the same space back with a negative
margin), so the outline has room inside the filter region without changing the layout. Its
background must stay transparent: the filter outlines everything the element paints.

Every visual parameter is a prop (see `outlineSchema` for ranges and defaults).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import OutlineFilter from './OutlineFilter.svelte';
	import { outlineDefaults as d, outlinePadding, type OutlineOptions } from './outline.js';

	type Props = Partial<OutlineOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof OutlineOptions> & {
			children?: Snippet;
		};

	let {
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
		shadowOpacity = d.shadowOpacity,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `outline-${uid}`;

	let pad = $derived(
		outlinePadding({ width, ring, ringWidth, shadow, shadowX, shadowY, shadowBlur })
	);
</script>

<div class={['outline', className]} style:--_filter="url(#{id})" style:--_pad="{pad}px" {...rest}>
	<svg class="defs" aria-hidden="true">
		<OutlineFilter
			{id}
			{width}
			{color}
			{roundness}
			{ring}
			{ringWidth}
			{ringColor}
			{shadow}
			{shadowX}
			{shadowY}
			{shadowBlur}
			{shadowColor}
			{shadowOpacity}
		/>
	</svg>
	{@render children?.()}
</div>

<style>
	.outline {
		padding: var(--_pad);
		margin: calc(-1 * var(--_pad));
		filter: var(--_filter);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
