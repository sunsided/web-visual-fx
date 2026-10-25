<!--
@component
Decorative thumbnail of the gooey effect: a few small blobs melting into each other.
-->
<script lang="ts">
	import GooeyField from './GooeyField.svelte';
</script>

<div class="gooey-preview" aria-hidden="true">
	<GooeyField count={5} size={56} blur={8} sharpness={18} offset={7} seed={11} />
</div>

<style>
	.gooey-preview {
		block-size: 100%;
		background: linear-gradient(160deg, oklch(97% 0.02 300), oklch(92% 0.05 260));
	}
</style>
