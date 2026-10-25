<!--
@component
Decorative thumbnail of the spotlight cards: four small cards with the light drifting across them
in a slow CSS loop (it animates the registered `--spotlight-x/y`). Pauses inside
`data-motion="paused"` and stands still under reduced motion.
-->
<script lang="ts">
	import SpotlightCard from './SpotlightCard.svelte';
	import SpotlightGrid from './SpotlightGrid.svelte';
</script>

<div class="spotlight-preview" aria-hidden="true">
	<SpotlightGrid
		pinned={{ x: 60, y: 30 }}
		glowRadius={90}
		gap={8}
		radius={8}
		surfaceIntensity={0.2}
		class="grid"
		--spotlight-columns="4rem"
	>
		{#each [1, 2, 3, 4] as n (n)}
			<SpotlightCard --spotlight-card-padding="0">
				<span class="line"></span>
			</SpotlightCard>
		{/each}
	</SpotlightGrid>
</div>

<style>
	.spotlight-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: 8%;
		background: oklch(13% 0.02 285);
	}

	.spotlight-preview :global(.grid) {
		grid-template-columns: repeat(2, 1fr);
		inline-size: min(100%, 14rem);
	}

	.spotlight-preview :global(.spotlight-card) {
		block-size: 3rem;
	}

	.line {
		display: block;
		inline-size: 50%;
		block-size: 4px;
		margin: 14px;
		border-radius: 2px;
		background: oklch(100% 0 0 / 0.3);
	}

	@media (prefers-reduced-motion: no-preference) {
		.spotlight-preview :global(.grid) {
			animation: sweep 6s var(--ease-in-out) infinite alternate;
		}
	}

	@keyframes sweep {
		to {
			--spotlight-x: 180px;
			--spotlight-y: 110px;
		}
	}
</style>
