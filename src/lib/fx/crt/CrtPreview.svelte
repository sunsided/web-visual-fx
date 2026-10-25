<!--
@component
Decorative thumbnail of the CRT effect: a small green-screen menu, without motion.
-->
<script lang="ts">
	import CrtScreen from './CrtScreen.svelte';
	import RetroTerminal from './RetroTerminal.svelte';
</script>

<div class="crt-preview" aria-hidden="true">
	<CrtScreen radius={14} rollingBar={false} glowRadius={3} class="tube">
		<RetroTerminal compact --terminal-font-size="0.75rem" --terminal-padding="1rem 1.5rem" />
	</CrtScreen>
</div>

<style>
	.crt-preview {
		display: grid;
		block-size: 100%;
		padding: var(--space-3);
		background: oklch(22% 0.01 90);
	}

	.crt-preview :global(.tube) {
		block-size: 100%;
	}
</style>
