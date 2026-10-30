<!--
@component
Decorative thumbnail of the posterize effect: shaded spheres, cel-shaded with ink lines.
-->
<script lang="ts">
	import Posterize from './Posterize.svelte';
	import ShadedScene from './ShadedScene.svelte';
</script>

<div class="posterize-preview" aria-hidden="true">
	<Posterize class="toon">
		<ShadedScene />
	</Posterize>
</div>

<style>
	.posterize-preview {
		block-size: 100%;
	}

	.posterize-preview :global(.toon) {
		block-size: 100%;
	}
</style>
