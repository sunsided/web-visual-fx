<!--
@component
SVG `<filter>` that lays a dancing net of light over its input, like sunlight on a pool floor:
turbulence ridges (feTurbulence type="turbulence" → feComponentTransfer table), bent by a second,
moving noise (feDisplacementMap), lit with feFlood and feSpecularLighting, and screened over the
content, which is tinted and gently displaced by the same moving noise.

Must be rendered inside an `<svg>`; reference it with `filter: url(#id)`. The region is in px of
the filtered element's border box.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import FlowNoise from '../ripple/FlowNoise.svelte';
	import { regionExtent, tileFrequency } from '../ripple/ripple.js';
	import {
		WARP_FREQUENCY_RATIO,
		causticsDefaults as d,
		ridgeTable,
		warpTileSize,
		type CausticsOffsets,
		type CausticsOptions
	} from './caustics.js';

	type Props = Partial<Omit<CausticsOptions, 'animate' | 'speed' | 'direction' | 'fps'>> & {
		id: string;
		/** Border-box size of the filtered element in px. */
		width: number;
		height: number;
		/** Region padding around the element in px. */
		pad: number;
		/** Current noise offsets (see `causticsOffsets`). */
		offsets: CausticsOffsets;
	};

	let {
		id,
		width,
		height,
		pad,
		offsets,
		lightColor = d.lightColor,
		intensity = d.intensity,
		lineWidth = d.lineWidth,
		sheen = d.sheen,
		frequency = d.frequency,
		octaves = d.octaves,
		warp = d.warp,
		seed = d.seed,
		tint = d.tint,
		tintOpacity = d.tintOpacity,
		wobble = d.wobble,
		tileSize = d.tileSize
	}: Props = $props();

	let warpTile = $derived(warpTileSize(tileSize));
	let cellFrequency = $derived(tileFrequency(frequency, 1, tileSize));
	let warpFrequency = $derived(tileFrequency(frequency * WARP_FREQUENCY_RATIO, 1, warpTile));
	let table = $derived(ridgeTable(lineWidth));
</script>

<filter
	{id}
	x={-pad}
	y={-pad}
	width={regionExtent(width, warpTile, pad)}
	height={regionExtent(height, warpTile, pad)}
	filterUnits="userSpaceOnUse"
	color-interpolation-filters="sRGB"
>
	<!-- Ridge noise, drifting slowly. -->
	<FlowNoise
		result="cells"
		type="turbulence"
		tile={tileSize}
		baseFrequency={cellFrequency}
		numOctaves={octaves}
		{seed}
		offsets={[offsets.cells]}
	/>
	<!-- Smooth noise from two crossing wave trains: the moving water surface. -->
	<FlowNoise
		result="surface"
		tile={warpTile}
		baseFrequency={warpFrequency}
		numOctaves={2}
		seed={seed + 1}
		offsets={offsets.warp}
	/>

	<!-- The surface bends the net. -->
	<feDisplacementMap
		in="cells"
		in2="surface"
		scale={warp}
		xChannelSelector="R"
		yChannelSelector="G"
		result="bent"
	/>
	<!-- Ridge value into alpha (white), then keep only the ridges. -->
	<feColorMatrix
		in="bent"
		type="matrix"
		values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0"
		result="height"
	/>
	<feComponentTransfer in="height">
		<feFuncA type="table" tableValues={table} />
	</feComponentTransfer>
	<feGaussianBlur stdDeviation="0.6" result="lines" />

	<!-- Flat light plus a specular glint on one side of each line. -->
	<feFlood flood-color={lightColor} />
	<feComposite in2="lines" operator="in" result="glow" />
	{#if sheen > 0}
		<feSpecularLighting
			in="lines"
			surfaceScale="3"
			specularConstant="1"
			specularExponent="20"
			lighting-color={lightColor}
		>
			<feDistantLight azimuth="225" elevation="55" />
		</feSpecularLighting>
		<feComposite in2="lines" operator="in" result="glint" />
		<feComposite
			in="glow"
			in2="glint"
			operator="arithmetic"
			k2={intensity}
			k3={sheen * intensity}
			result="light"
		/>
	{:else}
		<feComposite in="glow" operator="arithmetic" k2={intensity} result="light" />
	{/if}

	<!-- The floor: content seen through the moving surface, washed with the water color. -->
	{#if wobble > 0}
		<feDisplacementMap
			in="SourceGraphic"
			in2="surface"
			scale={wobble}
			xChannelSelector="R"
			yChannelSelector="G"
			result="floor"
		/>
	{:else}
		<feOffset in="SourceGraphic" result="floor" />
	{/if}
	{#if tintOpacity > 0}
		<feFlood flood-color={tint} flood-opacity={tintOpacity} />
		<feComposite in2="floor" operator="atop" result="floor" />
	{/if}

	<!-- Light only where there is floor, screened on top. -->
	<feComposite in="light" in2="floor" operator="in" result="light" />
	<feBlend in="light" in2="floor" mode="screen" />
</filter>
