<!--
@component
Prints its children as a halftone or dithered image.

- `mode="halftone"`: CSS only. The source is blurred and halved in brightness, a grid of radial
  gradient dots is added on top (`plus-lighter`), and `filter: contrast()` thresholds the sum
  into round dots. Monochrome output is recolored to ink and paper with three blend layers.
- `mode="dither"`: an SVG filter (`DitherFilter`) posterizes to `levels`, optionally with an
  ordered Bayer dither.

Every visual parameter is a prop (see `halftoneSchema` for ranges and defaults). The wrapper
clips its content; size it with `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import DitherFilter from './DitherFilter.svelte';
	import {
		dotGradient,
		halftoneDefaults as d,
		inkLayers,
		sourceBlur,
		thresholdContrast,
		type HalftoneOptions
	} from './halftone';

	type Props = Partial<HalftoneOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof HalftoneOptions> & {
			children?: Snippet;
		};

	let {
		mode = d.mode,
		monochrome = d.monochrome,
		ink = d.ink,
		paper = d.paper,
		dotSize = d.dotSize,
		angle = d.angle,
		softness = d.softness,
		levels = d.levels,
		dither = d.dither,
		matrixSize = d.matrixSize,
		pixelSize = d.pixelSize,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `dither-${uid}`;
	const dot = `radial-gradient(circle farthest-corner, ${dotGradient()})`;

	let layers = $derived(inkLayers(ink, paper));
	let sourceFilter = $derived(
		[monochrome ? 'grayscale(1)' : '', `blur(${sourceBlur(dotSize)}px)`, 'brightness(0.5)']
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class={['halftone', className]} {...rest}>
	{#if mode === 'dither'}
		<svg class="defs" aria-hidden="true">
			<DitherFilter
				id={filterId}
				{monochrome}
				{ink}
				{paper}
				{levels}
				{dither}
				{matrixSize}
				{pixelSize}
			/>
		</svg>
		<div class="source" style:filter="url(#{filterId})">
			{@render children?.()}
		</div>
	{:else}
		<div class="threshold" style:filter="contrast({thresholdContrast(softness)})">
			<div class="source" style:filter={sourceFilter}>
				{@render children?.()}
			</div>
			<div
				class="dots"
				aria-hidden="true"
				style:background-image={dot}
				style:background-size="{dotSize}px {dotSize}px"
				style:rotate="{angle}deg"
			></div>
		</div>
		{#if monochrome}
			<div class="ink" aria-hidden="true">
				<span style:background={layers.invert} style:mix-blend-mode="difference"></span>
				<span style:background={layers.lighten} style:mix-blend-mode="lighten"></span>
				<span style:background={layers.darken} style:mix-blend-mode="darken"></span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.halftone {
		position: relative;
		isolation: isolate;
		overflow: hidden;
	}

	.source,
	.threshold {
		block-size: 100%;
	}

	/* Transparent parts of the source count as paper: 50 % grey is the threshold's "white". */
	.threshold {
		position: relative;
		overflow: hidden;
		background: rgb(50% 50% 50%);
	}

	/* Oversized so the rotated grid still covers every corner. */
	.dots {
		position: absolute;
		inset: -50%;
		background-position: center;
		mix-blend-mode: plus-lighter;
		pointer-events: none;
	}

	.ink,
	.ink span {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
