<!--
@component
Decorative thumbnail of the WebGL water: the tiled pool floor with light rain. Shows the still
pool floor where WebGL2 is missing; stands still under reduced motion.
-->
<script lang="ts">
	import WaterSim from './WaterSim.svelte';
</script>

<div class="water-preview" aria-hidden="true">
	<WaterSim rain={2} trail={false} tileSize={22} dropRadius={10} maxDpr={1.5} class="fill" />
</div>

<style>
	.water-preview {
		block-size: 100%;
		display: grid;
	}

	.water-preview :global(.fill) {
		block-size: 100%;
	}
</style>
