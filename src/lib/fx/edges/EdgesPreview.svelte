<!--
@component
Decorative thumbnail of the edge effect: the landscape illustration as a pencil sketch.
-->
<script lang="ts">
	import Landscape from '../duotone/Landscape.svelte';
	import Edges from './Edges.svelte';
</script>

<div class="edges-preview" aria-hidden="true">
	<Edges strength={2} class="sketch">
		<Landscape />
	</Edges>
</div>

<style>
	.edges-preview {
		block-size: 100%;
	}

	.edges-preview :global(.sketch) {
		block-size: 100%;
	}
</style>
