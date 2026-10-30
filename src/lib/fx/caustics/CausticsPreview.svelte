<!--
@component
Decorative thumbnail of the caustics effect: light nets dancing on a tiled pool floor.
-->
<script lang="ts">
	import Caustics from './Caustics.svelte';
	import PoolFloor from './PoolFloor.svelte';
</script>

<div class="caustics-preview" aria-hidden="true">
	<Caustics frequency={0.02} warp={30} wobble={3} tileSize={128} fps={24} class="pool">
		<PoolFloor --pool-tile="24px" />
	</Caustics>
</div>

<style>
	.caustics-preview {
		block-size: 100%;
		overflow: hidden;
	}

	/* Bleed past the card so the wobbly edges stay hidden. */
	.caustics-preview :global(.pool) {
		block-size: calc(100% + 8px);
		margin: -4px;
	}
</style>
