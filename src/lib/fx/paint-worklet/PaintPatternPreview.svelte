<!--
@component
Decorative thumbnail of the paint worklet patterns: squiggles in a ring around a dark card
(the gradient twin where the Painting API is missing).
-->
<script lang="ts">
	import PaintPattern from './PaintPattern.svelte';
</script>

<div class="paint-preview" aria-hidden="true">
	<PaintPattern
		pattern="squiggles"
		size={12}
		stroke={2.5}
		border
		borderWidth={18}
		radius={12}
		class="fill"
		--paint-pattern-surface="#120e2e"
	/>
</div>

<style>
	.paint-preview {
		block-size: 100%;
		display: grid;
	}

	.paint-preview :global(.fill) {
		block-size: 100%;
	}
</style>
