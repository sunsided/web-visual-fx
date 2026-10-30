<!--
@component
Decorative thumbnail of the sticker outline: the rocket artwork as a die-cut sticker.
-->
<script lang="ts">
	import Outline from './Outline.svelte';
	import StickerArt from './StickerArt.svelte';
</script>

<div class="outline-preview" aria-hidden="true">
	<Outline width={5} ringWidth={2} shadowY={4} shadowBlur={4} class="sticker">
		<StickerArt />
	</Outline>
</div>

<style>
	.outline-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-4);
		background: radial-gradient(circle at 30% 20%, oklch(42% 0.12 290), oklch(22% 0.06 280));
	}

	.outline-preview :global(.sticker) {
		block-size: 100%;
		aspect-ratio: 1;
	}
</style>
