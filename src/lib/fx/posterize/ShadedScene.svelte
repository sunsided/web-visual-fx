<!--
@component
Decorative, self-drawn SVG still life of smoothly shaded spheres on a floor: soft radial
gradients, highlights and blurred contact shadows. A stand-in for a rendered or photographed
scene when showing off tone filters such as posterize and cel shading. Fills its container
(`slice`, like `object-fit: cover`).
-->
<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	const uid = $props.id();
	const ids = {
		wall: `wall-${uid}`,
		floor: `floor-${uid}`,
		shadow: `shadow-${uid}`,
		soft: `soft-${uid}`
	};

	// [cx, cy, r, light, base, dark]
	const balls = [
		[520, 590, 165, '#ffd9e4', '#ef476f', '#5c0a24'],
		[950, 620, 130, '#e3fbff', '#26a6c9', '#0b2a40'],
		[745, 700, 82, '#fff6cf', '#ffc43d', '#7a4a00'],
		[1170, 720, 70, '#e8ffe9', '#3fbf6a', '#0d3a1e']
	] as const;
</script>

<svg
	class={['shaded-scene', className]}
	viewBox="0 0 1600 1000"
	preserveAspectRatio="xMidYMid slice"
	aria-hidden="true"
>
	<defs>
		<linearGradient id={ids.wall} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#2b2f5c" />
			<stop offset="1" stop-color="#8f86c9" />
		</linearGradient>
		<radialGradient id={ids.floor} cx="0.4" cy="0" r="1">
			<stop offset="0" stop-color="#f3e3d0" />
			<stop offset="1" stop-color="#7d6a7f" />
		</radialGradient>
		<filter id={ids.soft} x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="18" />
		</filter>
		{#each balls as [cx, , , light, base, dark] (cx)}
			<radialGradient id="{ids.shadow}-{cx}" cx="0.36" cy="0.32" r="0.75">
				<stop offset="0" stop-color="#ffffff" />
				<stop offset="0.08" stop-color={light} />
				<stop offset="0.45" stop-color={base} />
				<stop offset="1" stop-color={dark} />
			</radialGradient>
		{/each}
	</defs>

	<rect width="1600" height="640" fill="url(#{ids.wall})" />
	<rect y="620" width="1600" height="380" fill="url(#{ids.floor})" />

	{#each balls as [cx, cy, r] (cx)}
		<ellipse
			cx={cx + r * 0.25}
			cy={cy + r * 0.95}
			rx={r * 0.95}
			ry={r * 0.22}
			fill="#1b1030"
			opacity="0.55"
			filter="url(#{ids.soft})"
		/>
	{/each}
	{#each balls as [cx, cy, r] (cx)}
		<circle {cx} {cy} {r} fill="url(#{ids.shadow}-{cx})" />
	{/each}
</svg>

<style>
	.shaded-scene {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}
</style>
