<!--
@component
Redraws its children as a pencil sketch, a line drawing (light edges on a dark ground) or an
embossed relief, with `feConvolveMatrix` kernels (Sobel, Laplacian, directional emboss).

The output is opaque and fills the wrapper, so this is meant for images and illustrations, not
for text that has to stay readable. Every visual parameter is a prop (see `edgesSchema` for
ranges and defaults). The wrapper is a plain block; size it with `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import EdgesFilter from './EdgesFilter.svelte';
	import { edgesDefaults as d, type EdgesOptions } from './edges.js';

	type Props = Partial<EdgesOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof EdgesOptions> & {
			children?: Snippet;
		};

	let {
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
		color = d.color,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `edges-${uid}`;
</script>

<div class={['edges', className]} style:--_filter="url(#{id})" {...rest}>
	<svg class="defs" aria-hidden="true">
		<EdgesFilter
			{id}
			{mode}
			{operator}
			{size}
			{channels}
			{strength}
			{smoothing}
			{threshold}
			{lineWidth}
			{texture}
			{angle}
			{ink}
			{paper}
			{color}
		/>
	</svg>
	{@render children?.()}
</div>

<style>
	.edges {
		filter: var(--_filter);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
