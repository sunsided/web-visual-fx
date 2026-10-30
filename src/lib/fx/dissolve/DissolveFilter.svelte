<!--
@component
SVG `<filter>` that burns content away through a noise threshold: feTurbulence → table-equalized
noise (optionally mixed with a direction ramp) → three feColorMatrix alpha steps that cut the
content, a scorched char band and a glowing ember band, merged over a blurred glow.
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)`. The primitives come
from `dissolvePrimitives`, shared with the `dissolve` transition.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		burnDefaults as d,
		dissolvePrimitives,
		filterAttrs,
		type BurnOptions
	} from './dissolve.js';

	interface Props extends Partial<BurnOptions> {
		id: string;
		progress?: number;
	}

	let {
		id,
		progress = 0,
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
		glow = d.glow
	}: Props = $props();

	let primitives = $derived(
		dissolvePrimitives(progress, {
			noiseScale,
			octaves,
			seed,
			origin,
			bias,
			ember,
			emberWidth,
			char,
			charWidth,
			sharpness,
			glow
		})
	);
	const attrs = filterAttrs();
</script>

<filter {id} {...attrs}>
	{#each primitives as p, i (`${i}-${p.tag}`)}
		<svelte:element this={p.tag} xmlns="http://www.w3.org/2000/svg" {...p.attrs}>
			{#each p.children ?? [] as c, j (`${j}-${c.tag}`)}
				<svelte:element this={c.tag} xmlns="http://www.w3.org/2000/svg" {...c.attrs} />
			{/each}
		</svelte:element>
	{/each}
</filter>
