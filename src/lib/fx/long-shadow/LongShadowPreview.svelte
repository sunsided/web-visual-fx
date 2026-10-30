<!--
@component
Decorative thumbnail of the long-shadow effect: a short word with a flat long shadow.
-->
<script lang="ts">
	import LongShadow from './LongShadow.svelte';
</script>

<div class="long-shadow-preview" aria-hidden="true">
	<LongShadow length={1.2} steps={40} fade>Long</LongShadow>
</div>

<style>
	.long-shadow-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		overflow: hidden;
		background: #f2a541;
		font:
			900 3.25rem/1 system-ui,
			sans-serif;
	}

	.long-shadow-preview :global(.long-shadow) {
		--long-shadow-face: #fffaf0;
	}
</style>
