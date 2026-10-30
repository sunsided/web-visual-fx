<!--
@component
Posterizes its children into flat color bands, like a screen print or a cel-shaded frame, and
optionally draws dark ink lines along the edges for a toon look. Unlike Duotone or Halftone it
keeps the hues: every color channel is quantized on its own.

Every visual parameter is a prop (see `posterizeSchema` for ranges and defaults). The wrapper is a
plain block; size and layout it with `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import PosterizeFilter from './PosterizeFilter.svelte';
	import { posterizeDefaults as d, type PosterizeOptions } from './posterize.js';

	type Props = Partial<PosterizeOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof PosterizeOptions> & {
			children?: Snippet;
		};

	let {
		levels = d.levels,
		smoothing = d.smoothing,
		saturation = d.saturation,
		colorSpace = d.colorSpace,
		inkEdges = d.inkEdges,
		ink = d.ink,
		inkStrength = d.inkStrength,
		inkThreshold = d.inkThreshold,
		inkWidth = d.inkWidth,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `posterize-${uid}`;
</script>

<div class={['posterize', className]} style:--_filter="url(#{id})" {...rest}>
	<svg class="defs" aria-hidden="true">
		<PosterizeFilter
			{id}
			{levels}
			{smoothing}
			{saturation}
			{colorSpace}
			{inkEdges}
			{ink}
			{inkStrength}
			{inkThreshold}
			{inkWidth}
		/>
	</svg>
	{@render children?.()}
</div>

<style>
	.posterize {
		filter: var(--_filter);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
