<!--
@component
Decorative thumbnail of the kaleidoscope effect: the built-in pattern in eight mirrored wedges,
turning slowly.
-->
<script lang="ts">
	import Kaleidoscope from './Kaleidoscope.svelte';
</script>

<div class="kaleidoscope-preview" aria-hidden="true">
	<Kaleidoscope zoom={1.2} duration={40} interactive={false} class="mirrors" />
</div>

<style>
	.kaleidoscope-preview {
		block-size: 100%;
	}

	.kaleidoscope-preview :global(.mirrors) {
		block-size: 100%;
	}
</style>
