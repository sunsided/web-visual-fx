<!--
@component
Decorative thumbnail of the pixelate effect: the landscape illustration as a mosaic.
-->
<script lang="ts">
	import Landscape from '../duotone/Landscape.svelte';
	import Pixelate from './Pixelate.svelte';
</script>

<div class="pixelate-preview" aria-hidden="true">
	<Pixelate size={14} class="mosaic">
		<Landscape />
	</Pixelate>
</div>

<style>
	.pixelate-preview {
		block-size: 100%;
	}

	.pixelate-preview :global(.mosaic) {
		block-size: 100%;
	}
</style>
