<!--
@component
SVG `<filter>` that makes its input wobble like seen through water or hot air: moving, tiled
noise (`FlowNoise`) → feDisplacementMap, plus an optional color wash.

Works as `filter: url(#id)` on content and as `backdrop-filter: url(#id)` (Chromium only).
Must be rendered inside an `<svg>`. The region is in px of the filtered element's border box.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import FlowNoise from './FlowNoise.svelte';
	import { regionExtent, tileFrequency, type Offset } from './ripple.js';

	interface Props {
		id: string;
		/** Border-box size of the filtered element in px. */
		width: number;
		height: number;
		/** Region padding around the element in px (see `regionPadding`). */
		pad: number;
		/** Displacement scale in px. */
		strength: number;
		frequency: number;
		stretch: number;
		octaves: number;
		seed: number;
		tileSize: number;
		/** Current layer offsets (see `rippleOffsets`). */
		offsets: Offset[];
		tint?: string;
		tintOpacity?: number;
	}

	let {
		id,
		width,
		height,
		pad,
		strength,
		frequency,
		stretch,
		octaves,
		seed,
		tileSize,
		offsets,
		tint = '#000000',
		tintOpacity = 0
	}: Props = $props();

	let baseFrequency = $derived(tileFrequency(frequency, stretch, tileSize));
</script>

<filter
	{id}
	x={-pad}
	y={-pad}
	width={regionExtent(width, tileSize, pad)}
	height={regionExtent(height, tileSize, pad)}
	filterUnits="userSpaceOnUse"
	color-interpolation-filters="sRGB"
>
	<FlowNoise result="waves" tile={tileSize} {baseFrequency} numOctaves={octaves} {seed} {offsets} />
	<feDisplacementMap
		in="SourceGraphic"
		in2="waves"
		scale={strength}
		xChannelSelector="R"
		yChannelSelector="G"
		result="moved"
	/>
	{#if tintOpacity > 0}
		<feFlood flood-color={tint} flood-opacity={tintOpacity} />
		<!-- atop: only where the moved content is, so transparent parts stay transparent -->
		<feComposite in2="moved" operator="atop" />
	{/if}
</filter>
