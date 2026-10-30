<!--
@component
Burns its children away through a noise pattern with a glowing ember edge. `progress` 0 shows
them untouched, 1 has burnt them away completely; animate it (e.g. with `Tween`) for a dismiss
or enter transition, or use the `dissolve` transition with `{#if}`.

Every visual parameter is a prop (see `dissolveSchema` for ranges and defaults). The filter is
only applied while `progress` is strictly between 0 and 1, so the resting states cost nothing.
At 1 the wrapper is `visibility: hidden`, which also takes it out of the accessibility tree.

Motion: with `mode="auto"` (the default) a user who prefers reduced motion gets a plain opacity
fade driven by the same `progress`. `mode="fade"` always fades.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import DissolveFilter from './DissolveFilter.svelte';
	import { dissolveDefaults as d, type DissolveOptions } from './dissolve.js';

	type Props = Partial<DissolveOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof DissolveOptions> & {
			children?: Snippet;
		};

	let {
		progress = d.progress,
		mode = d.mode,
		noiseScale = d.noiseScale,
		octaves = d.octaves,
		seed = d.seed,
		origin = d.origin,
		bias = d.bias,
		ember = d.ember,
		emberWidth = d.emberWidth,
		char = d.char,
		charWidth = d.charWidth,
		sharpness = d.sharpness,
		glow = d.glow,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `dissolve-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let p = $derived(Math.min(1, Math.max(0, progress)));
	let fade = $derived(mode === 'fade' || (mode === 'auto' && reducedMotion.current));
	let burning = $derived(!fade && p > 0 && p < 1);
</script>

<div
	class={['dissolve', className]}
	style:filter={burning ? `url(#${id})` : undefined}
	style:opacity={fade && p > 0 ? 1 - p : undefined}
	style:visibility={p >= 1 ? 'hidden' : undefined}
	{...rest}
>
	{#if burning}
		<svg class="defs" aria-hidden="true">
			<DissolveFilter
				{id}
				progress={p}
				{noiseScale}
				{octaves}
				{seed}
				{origin}
				{bias}
				{ember}
				{emberWidth}
				{char}
				{charWidth}
				{sharpness}
				{glow}
			/>
		</svg>
	{/if}
	{@render children?.()}
</div>

<style>
	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
