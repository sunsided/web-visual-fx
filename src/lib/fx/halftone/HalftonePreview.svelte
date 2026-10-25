<!--
@component
Decorative thumbnail of the halftone effect: the landscape illustration printed as dots.
-->
<script lang="ts">
	import Landscape from '../duotone/Landscape.svelte';
	import Halftone from './Halftone.svelte';
</script>

<div class="halftone-preview" aria-hidden="true">
	<Halftone dotSize={7} class="print">
		<Landscape />
	</Halftone>
</div>

<style>
	.halftone-preview {
		block-size: 100%;
	}

	.halftone-preview :global(.print) {
		block-size: 100%;
	}
</style>
