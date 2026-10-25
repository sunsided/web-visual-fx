<!--
@component
SVG `<filter>` that refracts its input through a glass bezel: a precomputed displacement map
(`feImage`) drives `feDisplacementMap`, optionally once per color channel for a chromatic fringe,
and `feSpecularLighting` on the map's height channel adds the highlight.

Everything is in user-space px, so `width`/`height` must match the filtered element and `map`
must be generated at that size (see `displacementMap`). Used as `backdrop-filter: url(#id)` by
`LiquidGlass`.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		displacementScale,
		fringeScales,
		LIGHT_ELEVATION,
		specularSurfaceScale
	} from './liquid-glass';

	interface Props {
		id: string;
		width: number;
		height: number;
		/** Data URL of the displacement map (R/G: offset, B: height). */
		map: string;
		/** Largest displacement in px. */
		refraction?: number;
		/** Extra refraction of red (and less for blue), as a fraction of `refraction`. */
		fringe?: number;
		/** Used to scale the height channel back to px for the lighting. */
		bezel?: number;
		/** Weight of the highlight; 0 skips the lighting primitives. */
		specular?: number;
		/** feDistantLight azimuth in degrees. */
		lightAngle?: number;
	}

	let {
		id,
		width,
		height,
		map,
		refraction = 40,
		fringe = 0,
		bezel = 36,
		specular = 0.6,
		lightAngle = 225
	}: Props = $props();

	let scales = $derived(fringeScales(refraction, fringe));

	// Keep one color channel and make it opaque. Summing three copies that each carry the
	// backdrop's alpha would add the alphas up and turn translucent pixels opaque (and dark).
	// The alpha is restored afterwards from the green copy with operator="in".
	const only = {
		r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1',
		g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1',
		b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1'
	};
</script>

<filter
	{id}
	x="0"
	y="0"
	{width}
	{height}
	filterUnits="userSpaceOnUse"
	primitiveUnits="userSpaceOnUse"
	color-interpolation-filters="sRGB"
>
	<feImage href={map} x="0" y="0" {width} {height} preserveAspectRatio="none" result="map" />

	{#if fringe > 0}
		{#each ['r', 'g', 'b'] as const as c (c)}
			<feDisplacementMap
				in="SourceGraphic"
				in2="map"
				scale={scales[c]}
				xChannelSelector="R"
				yChannelSelector="G"
				result="shift-{c}"
			/>
			<feColorMatrix in="shift-{c}" type="matrix" values={only[c]} result="only-{c}" />
		{/each}
		<feComposite in="only-r" in2="only-g" operator="arithmetic" k2="1" k3="1" result="rg" />
		<feComposite in="rg" in2="only-b" operator="arithmetic" k2="1" k3="1" result="rgb" />
		<feComposite in="rgb" in2="shift-g" operator="in" result="refracted" />
	{:else}
		<feDisplacementMap
			in="SourceGraphic"
			in2="map"
			scale={displacementScale(refraction)}
			xChannelSelector="R"
			yChannelSelector="G"
			result="refracted"
		/>
	{/if}

	{#if specular > 0}
		<!-- Height lives in blue; lighting primitives read alpha as the height. -->
		<feColorMatrix
			in="map"
			type="matrix"
			values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0"
			result="height"
		/>
		<!-- Smooths the 8-bit steps, which the lighting's slope estimate would otherwise exaggerate. -->
		<feGaussianBlur in="height" stdDeviation="1.5" result="smooth" />
		<feSpecularLighting
			in="smooth"
			surfaceScale={specularSurfaceScale(bezel)}
			specularConstant="1"
			specularExponent="24"
			lighting-color="#fff"
			result="light"
		>
			<feDistantLight azimuth={lightAngle} elevation={LIGHT_ELEVATION} />
		</feSpecularLighting>
		<feComposite in="light" in2="refracted" operator="arithmetic" k2={specular} k3="1" />
	{/if}
</filter>
