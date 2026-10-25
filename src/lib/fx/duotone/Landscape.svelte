<!--
@component
Decorative, self-drawn SVG landscape (sky, sun, mountain ridges, lake, pines) with a full tonal
range from deep shadows to bright highlights. A stand-in for a photo when showing off image
filters. Fills its container (`slice`, like `object-fit: cover`).
-->
<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	const uid = $props.id();
	const sky = `sky-${uid}`;
	const sun = `sun-${uid}`;
	const water = `water-${uid}`;
	const haze = `haze-${uid}`;

	// Pines along the shore: [x, height]
	const pines = [
		[90, 210],
		[150, 260],
		[205, 190],
		[1290, 230],
		[1350, 290],
		[1420, 220],
		[1480, 270],
		[1545, 200]
	] as const;
</script>

<svg
	class={['landscape', className]}
	viewBox="0 0 1600 1000"
	preserveAspectRatio="xMidYMid slice"
	aria-hidden="true"
>
	<defs>
		<linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#16244a" />
			<stop offset="0.45" stop-color="#5b6fa8" />
			<stop offset="0.75" stop-color="#f2a65e" />
			<stop offset="1" stop-color="#ffe3b0" />
		</linearGradient>
		<radialGradient id={sun}>
			<stop offset="0" stop-color="#fffbe8" />
			<stop offset="0.25" stop-color="#fff1c2" />
			<stop offset="1" stop-color="#ffd58a" stop-opacity="0" />
		</radialGradient>
		<linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#e8a868" />
			<stop offset="0.3" stop-color="#55628f" />
			<stop offset="1" stop-color="#0c1226" />
		</linearGradient>
		<linearGradient id={haze} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#ffe3b0" stop-opacity="0" />
			<stop offset="1" stop-color="#ffe3b0" stop-opacity="0.55" />
		</linearGradient>
	</defs>

	<rect width="1600" height="640" fill="url(#{sky})" />
	<circle cx="640" cy="520" r="260" fill="url(#{sun})" />
	<circle cx="640" cy="520" r="62" fill="#fffdf2" />

	<!-- clouds -->
	<g fill="#fbe2c4" opacity="0.8">
		<ellipse cx="330" cy="250" rx="190" ry="26" />
		<ellipse cx="420" cy="225" rx="110" ry="22" />
		<ellipse cx="1240" cy="190" rx="220" ry="20" />
		<ellipse cx="760" cy="340" rx="150" ry="14" />
	</g>

	<!-- ridges, far to near -->
	<path
		d="M0 520 L140 450 L260 490 L420 380 L560 470 L700 420 L860 500 L1000 455 L1180 360 L1320 450 L1460 400 L1600 470 V640 H0 Z"
		fill="#8d7ba6"
	/>
	<path
		d="M0 560 L180 480 L300 530 L470 430 L640 560 L760 520 L900 600 L1040 540 L1220 450 L1380 540 L1600 500 V640 H0 Z"
		fill="#4c4a7c"
	/>
	<rect y="460" width="1600" height="180" fill="url(#{haze})" />
	<path
		d="M0 640 L120 590 L260 620 L420 575 L600 630 L820 600 L1000 632 L1200 590 L1400 625 L1600 595 V640 Z"
		fill="#1f2347"
	/>

	<!-- lake with the sun's reflection -->
	<rect y="640" width="1600" height="360" fill="url(#{water})" />
	<g fill="#fff4d6">
		<rect x="590" y="652" width="100" height="5" rx="2.5" opacity="0.9" />
		<rect x="560" y="672" width="160" height="4" rx="2" opacity="0.7" />
		<rect x="605" y="694" width="70" height="4" rx="2" opacity="0.6" />
		<rect x="530" y="720" width="220" height="3" rx="1.5" opacity="0.45" />
		<rect x="615" y="750" width="50" height="3" rx="1.5" opacity="0.4" />
	</g>
	<g fill="#c9d3f5" opacity="0.25">
		<rect x="120" y="760" width="380" height="2" />
		<rect x="300" y="820" width="520" height="2" />
		<rect x="1100" y="800" width="420" height="2" />
		<rect x="40" y="900" width="600" height="3" />
	</g>

	<!-- shore and pines -->
	<path d="M0 1000 V860 Q160 820 300 870 T560 1000 Z" fill="#070a16" />
	<path d="M1600 1000 V820 Q1440 800 1300 860 T1060 1000 Z" fill="#070a16" />
	<g fill="#070a16">
		{#each pines as [x, h] (x)}
			{@const base = x < 800 ? 880 : 850}
			<path
				d="M{x} {base - h} L{x + 34} {base - h * 0.55} H{x + 14} L{x + 46} {base - h * 0.2} H{x +
					16} L{x + 54} {base} H{x - 54} L{x - 16} {base - h * 0.2} H{x - 46} L{x - 14} {base -
					h * 0.55} H{x - 34} Z"
			/>
		{/each}
	</g>

	<!-- birds -->
	<g fill="none" stroke="#1f2347" stroke-width="5" stroke-linecap="round">
		<path d="M900 300 q16 -14 32 0 q16 -14 32 0" />
		<path d="M980 260 q12 -10 24 0 q12 -10 24 0" />
		<path d="M840 340 q10 -8 20 0 q10 -8 20 0" />
	</g>
</svg>

<style>
	.landscape {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}
</style>
