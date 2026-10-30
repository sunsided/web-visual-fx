<!--
@component
Decorative thumbnail of the water ripple effect: the landscape illustration under moving water.
-->
<script lang="ts">
	import Landscape from '../duotone/Landscape.svelte';
	import Ripple from './Ripple.svelte';
</script>

<div class="ripple-preview" aria-hidden="true">
	<Ripple strength={10} frequency={0.02} tileSize={128} fps={24} class="water">
		<Landscape />
	</Ripple>
</div>

<style>
	.ripple-preview {
		block-size: 100%;
		overflow: hidden;
	}

	/* Bleed past the card so the wobbly edges stay hidden. */
	.ripple-preview :global(.water) {
		block-size: calc(100% + 16px);
		margin: -8px;
	}
</style>
