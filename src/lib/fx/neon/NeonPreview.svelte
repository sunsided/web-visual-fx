<!--
@component
Decorative thumbnail of the neon effect: a small sign with one flickering letter. Pauses inside
`data-motion="paused"` and stays lit under reduced motion.
-->
<script lang="ts">
	import Neon from './Neon.svelte';
</script>

<div class="neon-preview" aria-hidden="true">
	<Neon text="Neon" flickerLetter={3} powerOn={false} glow={0.8} />
</div>

<style>
	.neon-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background: #120a1c;
		font-size: 3rem;
	}
</style>
