<!--
@component
Applies a duotone / gradient map to its children: everything inside (images, gradients, text)
is turned into luminance and recolored from `shadow` through `midtone` to `highlight`.

Every visual parameter is a prop (see `duotoneSchema` for ranges and defaults). The wrapper is a
plain block; size and layout it with `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import DuotoneFilter from './DuotoneFilter.svelte';
	import { duotoneDefaults as d, type DuotoneOptions } from './duotone';

	type Props = Partial<DuotoneOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof DuotoneOptions> & {
			children?: Snippet;
		};

	let {
		shadow = d.shadow,
		midtone = d.midtone,
		highlight = d.highlight,
		useMidtone = d.useMidtone,
		contrast = d.contrast,
		amount = d.amount,
		colorSpace = d.colorSpace,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `duotone-${uid}`;
</script>

<div class={['duotone', className]} style:--_filter="url(#{id})" {...rest}>
	<svg class="defs" aria-hidden="true">
		<DuotoneFilter
			{id}
			{shadow}
			{midtone}
			{highlight}
			{useMidtone}
			{contrast}
			{amount}
			{colorSpace}
		/>
	</svg>
	{@render children?.()}
</div>

<style>
	.duotone {
		filter: var(--_filter);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
