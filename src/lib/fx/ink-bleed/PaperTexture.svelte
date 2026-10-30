<!--
@component
Absolutely positioned paper background that fills its nearest positioned ancestor: a flat
paper color with an embossed fiber texture (feTurbulence lit by feDiffuseLighting, multiplied
on top). Decorative.
-->
<script lang="ts">
	interface Props {
		color?: string;
		/** 0–1, strength of the embossed texture. */
		texture?: number;
		seed?: number;
		class?: string;
	}

	let { color = '#f3ede0', texture = 0.5, seed = 0, class: className }: Props = $props();

	const uid = $props.id();
	const id = `paper-${uid}`;
</script>

<svg class={['paper', className]} aria-hidden="true" style:background={color}>
	<filter {id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
		<!-- fine fibers on top of a faint, larger-scale cockle -->
		<feTurbulence type="fractalNoise" baseFrequency="0.9 0.6" numOctaves="3" {seed} />
		<feDiffuseLighting surfaceScale="1.6" diffuseConstant="1.05" lighting-color="#ffffff">
			<feDistantLight azimuth="235" elevation="58" />
		</feDiffuseLighting>
	</filter>
	<rect
		width="100%"
		height="100%"
		filter="url(#{id})"
		opacity={texture}
		style:mix-blend-mode="multiply"
	/>
</svg>

<style>
	.paper {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		pointer-events: none;
	}
</style>
