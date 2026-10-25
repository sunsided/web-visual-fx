<!--
@component
SVG `<filter>` for a CRT tube: barrel distortion (feImage map → feDisplacementMap) followed by
bloom (feGaussianBlur → feComponentTransfer → feBlend screen).
Must be rendered inside an `<svg>`; reference it with CSS `filter: url(#id)`. `width` and
`height` are the filtered element's size in px (the displacement scale is in px).
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { barrelMapUrl, displacementScale } from './crt.js';

	interface Props {
		id: string;
		width: number;
		height: number;
		/** Barrel distortion strength, 0 = flat. */
		curvature?: number;
		/** Bloom strength, 0 = off. */
		glow?: number;
		/** Bloom blur radius in px (standard deviation). */
		glowRadius?: number;
	}

	let { id, width, height, curvature = 0.05, glow = 0.6, glowRadius = 4 }: Props = $props();

	const map = barrelMapUrl();
	// One scale for both axes: the shorter side, so the bulge looks round-ish on wide screens.
	let scale = $derived(displacementScale(curvature, Math.min(width, height)));
	let warp = $derived(curvature > 0 && width > 0 && height > 0);
</script>

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	{#if warp}
		<!--
			No x/y/width/height: the image then fills the filter region (the element) in every engine.
			Explicit pixel sizes came out ~20px short in WebKit, which left an undistorted strip.
		-->
		<feImage href={map} preserveAspectRatio="none" result="map" />
		<feDisplacementMap
			in="SourceGraphic"
			in2="map"
			{scale}
			xChannelSelector="R"
			yChannelSelector="G"
			result="warped"
		/>
	{:else}
		<feOffset in="SourceGraphic" result="warped" />
	{/if}
	{#if glow > 0}
		<feGaussianBlur in="warped" stdDeviation={glowRadius} />
		<feComponentTransfer result="bloom">
			<feFuncR type="linear" slope={glow} />
			<feFuncG type="linear" slope={glow} />
			<feFuncB type="linear" slope={glow} />
		</feComponentTransfer>
		<feBlend in="warped" in2="bloom" mode="screen" />
	{/if}
</filter>
