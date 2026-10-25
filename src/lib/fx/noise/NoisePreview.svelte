<!--
@component
Decorative thumbnail of the noise effect: a gradient with a grain overlay.
-->
<script lang="ts">
	import NoiseLayer from './NoiseLayer.svelte';
</script>

<div class="noise-preview" aria-hidden="true">
	<NoiseLayer opacity={0.4} blendMode="overlay" />
</div>

<style>
	.noise-preview {
		position: relative;
		isolation: isolate;
		block-size: 100%;
		background: linear-gradient(
			135deg,
			oklch(62% 0.2 340),
			oklch(58% 0.19 285) 55%,
			oklch(70% 0.14 220)
		);
	}
</style>
