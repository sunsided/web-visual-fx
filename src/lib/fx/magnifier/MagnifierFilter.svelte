<!--
@component
SVG `<filter>` for a magnifying lens: a radial displacement map (`feImage`, see `lensMapUrl`)
placed over the lens's square drives `feDisplacementMap`, limited to that square, and the result
is laid over the untouched input with `feMerge`. Moving the lens only changes `x`/`y`; the map is
rebuilt only when its radius, zoom or profile change.

Everything is in user-space px. As `filter: url(#id)` on content, pass the element's size as
`width`/`height` and the lens's top-left corner as `x`/`y`. As `backdrop-filter` on the lens
itself, pass the lens size and `x = y = 0`. Must be rendered inside an `<svg>`.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	interface Props {
		id: string;
		/** Filter region size in px (the filtered element). */
		width: number;
		height: number;
		/** Top-left corner of the lens square in px. */
		x: number;
		y: number;
		/** Side of the lens square (2 × radius) in px. */
		size: number;
		/** Data URL of the lens map. */
		map: string;
		/** `feDisplacementMap` scale (see `lensScale`). */
		scale: number;
	}

	let { id, width, height, x, y, size, map, scale }: Props = $props();
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
	<feImage href={map} {x} {y} width={size} height={size} preserveAspectRatio="none" result="map" />
	<!-- Only the lens square is computed; the map is neutral in its corners outside the circle. -->
	<feDisplacementMap
		in="SourceGraphic"
		in2="map"
		{scale}
		xChannelSelector="R"
		yChannelSelector="G"
		{x}
		{y}
		width={size}
		height={size}
		result="lens"
	/>
	<feMerge>
		<feMergeNode in="SourceGraphic" />
		<feMergeNode in="lens" />
	</feMerge>
</filter>
