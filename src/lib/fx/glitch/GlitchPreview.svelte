<!--
@component
Decorative thumbnail of the glitch effect: heavy type over a gradient, with an occasional burst.
Stands still under reduced motion and inside a `data-motion="paused"` region.
-->
<script lang="ts">
	import Glitch from './Glitch.svelte';
</script>

<div class="glitch-preview" aria-hidden="true">
	<Glitch shift={18} slices={4} sliceHeight={14} split={1} burstSplit={3} still="frame" class="art">
		<span>GLITCH</span>
	</Glitch>
</div>

<style>
	.glitch-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background:
			repeating-linear-gradient(0deg, oklch(100% 0 0 / 0.04) 0 2px, transparent 2px 4px),
			linear-gradient(135deg, oklch(18% 0.04 260), oklch(30% 0.1 300));
	}

	.glitch-preview :global(.art) {
		padding: var(--space-2) var(--space-4);
		color: oklch(100% 0 0);
		font-size: var(--text-2xl);
		font-weight: 900;
		letter-spacing: 0.04em;
	}
</style>
