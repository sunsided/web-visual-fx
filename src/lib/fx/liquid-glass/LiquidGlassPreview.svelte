<!--
@component
Decorative thumbnail of the liquid glass effect: a refracting lens over the grid backdrop.
-->
<script lang="ts">
	import Scene from '#lib/components/organisms/Scene.svelte';
	import LiquidGlass from './LiquidGlass.svelte';
</script>

<div class="liquid-glass-preview" aria-hidden="true">
	<Scene kind="grid" animate={false} class="liquid-glass-preview-scene">
		<LiquidGlass radius={999} bezel={22} refraction={24} fringe={0.2} class="lens" />
	</Scene>
</div>

<style>
	.liquid-glass-preview {
		block-size: 100%;
	}

	.liquid-glass-preview :global(.liquid-glass-preview-scene) {
		display: grid;
		place-items: center;
		block-size: 100%;
	}

	.liquid-glass-preview :global(.lens) {
		inline-size: 60%;
		block-size: 55%;
	}
</style>
