<!--
@component
Decorative thumbnail of the duotone effect: the landscape illustration through a gradient map.
-->
<script lang="ts">
	import Duotone from './Duotone.svelte';
	import Landscape from './Landscape.svelte';
</script>

<div class="duotone-preview" aria-hidden="true">
	<Duotone class="map">
		<Landscape />
	</Duotone>
</div>

<style>
	.duotone-preview {
		block-size: 100%;
	}

	.duotone-preview :global(.map) {
		block-size: 100%;
	}
</style>
