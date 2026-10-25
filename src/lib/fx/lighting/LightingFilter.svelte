<!--
@component
SVG `<filter>` that lights a height map: feTurbulence and/or the blurred SourceAlpha as heights
→ feDiffuseLighting (+ feSpecularLighting) → multiplied onto a flat surface color.
Must be rendered inside an `<svg>`; reference it with `filter: url(#id)`.

Light coordinates are in the filtered element's user space: CSS px from its top-left corner.
The output is opaque over the whole filter region; the element's own colors are discarded and
only its alpha is used (as the "shape" relief).
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		lightingDefaults as d,
		toDistant,
		type LightingOptions,
		type Point
	} from './lighting.js';

	type Options = Pick<
		LightingOptions,
		| 'lightType'
		| 'elevation'
		| 'coneAngle'
		| 'lightingColor'
		| 'relief'
		| 'surfaceColor'
		| 'surfaceScale'
		| 'bumpFrequency'
		| 'bumpOctaves'
		| 'bumpSeed'
		| 'bumpAmount'
		| 'shapeBlur'
		| 'diffuseConstant'
		| 'specular'
		| 'specularConstant'
		| 'specularExponent'
	>;

	interface Props extends Partial<Options> {
		id: string;
		/** Light position in px from the element's top-left corner. */
		light: Point;
		/** Element size in px; the spot light aims at its center, the distant light is derived from it. */
		width: number;
		height: number;
	}

	let {
		id,
		light,
		width,
		height,
		lightType = d.lightType,
		elevation = d.elevation,
		coneAngle = d.coneAngle,
		lightingColor = d.lightingColor,
		relief = d.relief,
		surfaceColor = d.surfaceColor,
		surfaceScale = d.surfaceScale,
		bumpFrequency = d.bumpFrequency,
		bumpOctaves = d.bumpOctaves,
		bumpSeed = d.bumpSeed,
		bumpAmount = d.bumpAmount,
		shapeBlur = d.shapeBlur,
		diffuseConstant = d.diffuseConstant,
		specular = d.specular,
		specularConstant = d.specularConstant,
		specularExponent = d.specularExponent
	}: Props = $props();

	let distant = $derived(toDistant(light, elevation, { width, height }));
	let heightMap = $derived(
		relief === 'texture' ? 'noise' : relief === 'shape' ? 'shape' : 'height'
	);
</script>

{#snippet source()}
	{#if lightType === 'point'}
		<fePointLight x={light.x} y={light.y} z={elevation} />
	{:else if lightType === 'spot'}
		<feSpotLight
			x={light.x}
			y={light.y}
			z={elevation}
			pointsAtX={width / 2}
			pointsAtY={height / 2}
			pointsAtZ={0}
			limitingConeAngle={coneAngle}
		/>
	{:else}
		<feDistantLight azimuth={distant.azimuth} elevation={distant.elevation} />
	{/if}
{/snippet}

<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
	{#if relief !== 'shape'}
		<feTurbulence
			type="fractalNoise"
			baseFrequency={bumpFrequency}
			numOctaves={bumpOctaves}
			seed={bumpSeed}
			result="noise"
		/>
	{/if}
	{#if relief !== 'texture'}
		<feGaussianBlur in="SourceAlpha" stdDeviation={shapeBlur} result="shape" />
	{/if}
	{#if relief === 'both'}
		<!-- height = (1 − amount) · shape + amount · noise, on the alpha channel -->
		<feComposite
			in="shape"
			in2="noise"
			operator="arithmetic"
			k1="0"
			k2={1 - bumpAmount}
			k3={bumpAmount}
			k4="0"
			result="height"
		/>
	{/if}
	<feFlood flood-color={surfaceColor} result="surface" />
	<feDiffuseLighting
		in={heightMap}
		{surfaceScale}
		{diffuseConstant}
		lighting-color={lightingColor}
		result="diffuse"
	>
		{@render source()}
	</feDiffuseLighting>
	<!-- surface × light: k1 multiplies the two inputs channel by channel -->
	<feComposite
		in="surface"
		in2="diffuse"
		operator="arithmetic"
		k1="1"
		k2="0"
		k3="0"
		k4="0"
		result="lit"
	/>
	{#if specular}
		<feSpecularLighting
			in={heightMap}
			{surfaceScale}
			{specularConstant}
			{specularExponent}
			lighting-color={lightingColor}
			result="gloss"
		>
			{@render source()}
		</feSpecularLighting>
		<!-- lit + gloss: highlights are added on top -->
		<feComposite in="lit" in2="gloss" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
	{/if}
</filter>
