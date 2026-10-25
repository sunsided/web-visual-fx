<!--
@component
Absolutely positioned noise overlay that fills its nearest positioned ancestor.
Give the container `isolation: isolate` so `blendMode` only blends with it.

Tokens: `--noise-opacity`, `--noise-blend-mode` (override the props).
-->
<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import type { SVGAttributes } from 'svelte/elements';
	import NoiseFilter from './NoiseFilter.svelte';
	import { maxSafeFps, noiseDefaults as d, type NoiseOptions } from './noise';

	type Props = Partial<NoiseOptions> & Omit<SVGAttributes<SVGSVGElement>, keyof NoiseOptions>;

	let {
		type = d.type,
		baseFrequency = d.baseFrequency,
		stretch = d.stretch,
		numOctaves = d.numOctaves,
		stitchTiles = d.stitchTiles,
		monochrome = d.monochrome,
		contrast = d.contrast,
		brightness = d.brightness,
		alphaNoise = d.alphaNoise,
		opacity = d.opacity,
		blendMode = d.blendMode,
		animate = d.animate,
		fps = d.fps,
		seed = d.seed,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `noise-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let frame = $state(0);
	let safeFps = $derived(maxSafeFps({ baseFrequency, stretch }, fps));

	$effect(() => {
		if (!animate || reducedMotion.current) return;
		const interval = 1000 / safeFps;
		let last = 0;
		let raf = requestAnimationFrame(function tick(now) {
			if (now - last >= interval) {
				last = now;
				frame = (frame + 1) % 1000;
			}
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});
</script>

<svg
	class={['noise', className]}
	aria-hidden="true"
	style:--_opacity={opacity}
	style:--_blend={blendMode}
	{...rest}
>
	<defs>
		<NoiseFilter
			{id}
			{type}
			{baseFrequency}
			{stretch}
			{numOctaves}
			{stitchTiles}
			{monochrome}
			{contrast}
			{brightness}
			{alphaNoise}
			seed={animate ? seed + frame : seed}
		/>
	</defs>
	<rect width="100%" height="100%" filter="url(#{id})" />
</svg>

<style>
	.noise {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		pointer-events: none;
		opacity: var(--noise-opacity, var(--_opacity));
		mix-blend-mode: var(--noise-blend-mode, var(--_blend));
	}
</style>
