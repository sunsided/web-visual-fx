<!--
@component
SVG `<filter>` that warps its input with turbulence: feTurbulence → feDisplacementMap.
Used as `backdrop-filter: url(#id)` by `GlassPanel`, but works as a regular `filter` too.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	interface Props {
		id: string;
		/** Displacement scale in px. */
		scale?: number;
		baseFrequency?: number;
		numOctaves?: number;
		seed?: number;
		type?: 'fractalNoise' | 'turbulence';
	}

	let {
		id,
		scale = 40,
		baseFrequency = 0.008,
		numOctaves = 2,
		seed = 7,
		type = 'fractalNoise'
	}: Props = $props();
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	<feTurbulence {type} {baseFrequency} {numOctaves} {seed} result="map" />
	<feDisplacementMap
		in="SourceGraphic"
		in2="map"
		{scale}
		xChannelSelector="R"
		yChannelSelector="G"
	/>
</filter>
