<!--
@component
Makes its children look painted or written with ink on paper: their edges wander along paper
fibers and feather out (turbulence displacement, blur and an alpha threshold), optionally with
a darker pooled rim and granulation like a dried watercolor wash. Works on shapes, SVG, images
and text; text stays real, selectable text.

Every visual parameter is a prop (see `inkBleedSchema`; ready-made sets in `inkBleedPresets`).
With `paper` on, the wrapper paints a paper texture behind the content and multiplies the ink
onto it. Size and lay out the wrapper with `class`/`style`.

Tokens: `--ink-bleed-paper` (overrides `paperColor`).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import InkBleedFilter from './InkBleedFilter.svelte';
	import PaperTexture from './PaperTexture.svelte';
	import { inkBleedDefaults as d, type InkBleedOptions } from './ink-bleed.js';

	type Props = Partial<InkBleedOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof InkBleedOptions> & {
			children?: Snippet;
		};

	let {
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
		density = d.density,
		paper = d.paper,
		paperColor = d.paperColor,
		paperTexture = d.paperTexture,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `ink-bleed-${uid}`;

	let width = $state(0);
	let height = $state(0);
</script>

<div class={['ink-bleed', { paper }, className]} {...rest}>
	{#if paper}
		<PaperTexture color="var(--ink-bleed-paper, {paperColor})" texture={paperTexture} {seed} />
	{/if}
	<svg class="defs" aria-hidden="true">
		<InkBleedFilter
			{id}
			{width}
			{height}
			{spread}
			{roughness}
			{octaves}
			{seed}
			{blur}
			{threshold}
			{softness}
			{pool}
			{poolWidth}
			{grain}
			{grainSize}
			{density}
		/>
	</svg>
	<div class="ink" style:filter="url(#{id})" bind:clientWidth={width} bind:clientHeight={height}>
		{@render children?.()}
	</div>
</div>

<style>
	.ink-bleed {
		position: relative;
		isolation: isolate;
	}

	.ink {
		position: relative;
		block-size: 100%;
	}

	/* Ink soaks into the paper: its texture stays visible through the color. */
	.paper .ink {
		mix-blend-mode: multiply;
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
