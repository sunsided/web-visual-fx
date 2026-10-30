<!--
@component
Filter primitives (no `<filter>` element) for moving noise that stays cheap: feTurbulence is
computed once on a `tile` × `tile` subregion with `stitchTiles`, repeated over the region with
feTile, and each layer cuts a shifted tile back out with feOffset. Shifting by less than a tile is
enough because the tile repeats seamlessly; one or two layers (averaged without losing contrast)
are then tiled again into `result`.

The output is opaque (alpha 1), so later primitives can read its channels directly.

The containing filter must use user-space px (`primitiveUnits="userSpaceOnUse"`, the default) and
reach at least 2 × `tile` from the origin on both axes (see `regionExtent`).
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { MIX_K, type Offset } from './ripple.js';

	interface Props {
		/** Name of the final result; intermediate results are prefixed with it. */
		result: string;
		/** Tile edge in px. */
		tile: number;
		type?: 'fractalNoise' | 'turbulence';
		/** `"fx fy"`, already snapped to the tile (see `tileFrequency`). */
		baseFrequency: string;
		numOctaves: number;
		seed: number;
		/** One or two layer offsets, each in [0, tile) (see `flowOffset`). */
		offsets: Offset[];
	}

	let {
		result,
		tile,
		type = 'fractalNoise',
		baseFrequency,
		numOctaves,
		seed,
		offsets
	}: Props = $props();

	let layers = $derived(offsets.slice(0, 2));
</script>

<feTurbulence
	{type}
	{baseFrequency}
	{numOctaves}
	{seed}
	stitchTiles="stitch"
	x="0"
	y="0"
	width={tile}
	height={tile}
	result="{result}-raw"
/>
<!-- Alpha to 1: the noise's own alpha channel would otherwise premultiply the colors. -->
<feColorMatrix
	in="{result}-raw"
	type="matrix"
	values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1"
	x="0"
	y="0"
	width={tile}
	height={tile}
	result="{result}-tile"
/>
<feTile in="{result}-tile" result="{result}-plane" />
{#each layers as { dx, dy }, i (i)}
	<feOffset
		in="{result}-plane"
		{dx}
		{dy}
		x={tile}
		y={tile}
		width={tile}
		height={tile}
		result="{result}-{i}"
	/>
{/each}
{#if layers.length > 1}
	<feComposite
		in="{result}-0"
		in2="{result}-1"
		operator="arithmetic"
		k2={MIX_K.k2}
		k3={MIX_K.k3}
		k4={MIX_K.k4}
		x={tile}
		y={tile}
		width={tile}
		height={tile}
		result="{result}-mix"
	/>
{/if}
<feTile in={layers.length > 1 ? `${result}-mix` : `${result}-0`} {result} />
