<!--
@component
Frosted glass surface: backdrop blur + turbulence displacement + grain + thin lit rim.

Every visual parameter is a prop (see `glassSchema` for ranges and defaults).
Layout/typography of the content is up to you: pass `class`/`style` or wrap the children.

Tokens: `--glass-padding`, `--glass-color` (text color inside).
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import NoiseLayer from '../noise/NoiseLayer.svelte';
	import DisplacementFilter from './DisplacementFilter.svelte';
	import { glassDefaults as d, hexToRgba, type GlassOptions } from './glass';
	import { supportsBackdropSvgFilter } from './support';

	type Props = Partial<GlassOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof GlassOptions> & {
			/** Use the SVG displacement even where it isn't known to render (see `support.ts`). */
			forceDisplace?: boolean;
			children?: Snippet;
		};

	let {
		radius = d.radius,
		tint = d.tint,
		tintOpacity = d.tintOpacity,
		shadow = d.shadow,
		blur = d.blur,
		saturate = d.saturate,
		brightness = d.brightness,
		displace = d.displace,
		distortion = d.distortion,
		frequency = d.frequency,
		octaves = d.octaves,
		distortionSeed = d.distortionSeed,
		rimWidth = d.rimWidth,
		rimOpacity = d.rimOpacity,
		rimAngle = d.rimAngle,
		innerGlow = d.innerGlow,
		grain = d.grain,
		grainFrequency = d.grainFrequency,
		forceDisplace = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `glass-${uid}`;

	// Only include url() where it is known to render, so other browsers keep at least the blur.
	// Decided after mount to keep the prerendered HTML deterministic.
	let detected = $state(false);
	onMount(() => (detected = supportsBackdropSvgFilter()));
	let canDisplace = $derived(detected || forceDisplace);

	let backdrop = $derived(
		[
			canDisplace && displace && distortion > 0 ? `url(#${filterId})` : '',
			`blur(${blur}px)`,
			`saturate(${saturate})`,
			`brightness(${brightness})`
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div
	class={['glass', className]}
	style:--_radius="{radius}px"
	style:--_tint={hexToRgba(tint, tintOpacity)}
	style:--_shadow={shadow}
	style:--_backdrop={backdrop}
	style:--_rim-width="{rimWidth}px"
	style:--_rim-opacity={rimOpacity}
	style:--_rim-angle="{rimAngle}deg"
	style:--_glow={innerGlow}
	{...rest}
>
	{#if canDisplace && displace}
		<svg class="defs" aria-hidden="true">
			<DisplacementFilter
				id={filterId}
				scale={distortion}
				baseFrequency={frequency}
				numOctaves={octaves}
				seed={distortionSeed}
			/>
		</svg>
	{/if}
	{#if grain > 0}
		<NoiseLayer
			class="grain"
			opacity={grain}
			blendMode="soft-light"
			baseFrequency={grainFrequency}
			numOctaves={3}
			contrast={1.5}
		/>
	{/if}
	<div class="content">
		{@render children?.()}
	</div>
</div>

<style>
	.glass {
		position: relative;
		isolation: isolate;
		border-radius: var(--_radius);
		background: var(--_tint);
		color: var(--glass-color, inherit);
		-webkit-backdrop-filter: var(--_backdrop);
		backdrop-filter: var(--_backdrop);
		box-shadow:
			0 calc(30px * var(--_shadow)) calc(60px * var(--_shadow))
				oklch(0% 0 0 / calc(var(--_shadow) * 0.6)),
			inset 0 0 calc(40px * var(--_glow)) oklch(100% 0 0 / calc(var(--_glow) * 0.5));
	}

	/* Thin rim: a gradient border lit from --_rim-angle, cut out with a mask. */
	.glass::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		padding: var(--_rim-width);
		border-radius: inherit;
		background: linear-gradient(
			var(--_rim-angle),
			oklch(100% 0 0 / var(--_rim-opacity)) 0%,
			oklch(100% 0 0 / calc(var(--_rim-opacity) * 0.15)) 35%,
			oklch(100% 0 0 / calc(var(--_rim-opacity) * 0.05)) 65%,
			oklch(100% 0 0 / calc(var(--_rim-opacity) * 0.6)) 100%
		);
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
		pointer-events: none;
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	.glass :global(.grain) {
		border-radius: inherit;
		z-index: 0;
	}

	.content {
		position: relative;
		z-index: 1;
		padding: var(--glass-padding, var(--space-6));
	}
</style>
