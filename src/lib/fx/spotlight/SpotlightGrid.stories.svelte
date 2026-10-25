<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import SpotlightCard from './SpotlightCard.svelte';
	import SpotlightGrid from './SpotlightGrid.svelte';
	import { spotlightDefaults, spotlightSchema } from './spotlight.js';

	const { Story } = defineMeta({
		title: 'FX/Spotlight cards',
		component: SpotlightGrid,
		tags: ['autodocs'],
		args: spotlightDefaults,
		argTypes: toArgTypes(spotlightSchema),
		parameters: { layout: 'fullscreen' }
	});

	const cards = ['Sync', 'Search', 'Share', 'Backups', 'Themes', 'Offline'];
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="spotlight-story">
		<SpotlightGrid {...args}>
			{#each cards as card (card)}
				<SpotlightCard>
					<h2 style="font-size: 1rem; margin-block-end: 0.5rem;">{card}</h2>
					<p style="color: #c4bfd6; font-size: 0.875rem;">
						A short description that stays readable over the glow.
					</p>
				</SpotlightCard>
			{/each}
		</SpotlightGrid>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Wide, soft light" args={{ glowRadius: 600, borderIntensity: 0.6 }} {template} />

<Story
	name="Single color, thick border"
	args={{ twoTone: false, color: '#f472b6', borderWidth: 3, radius: 24 }}
	{template}
/>

<Story
	name="Tight grid, strong surface"
	args={{ gap: 2, radius: 4, surfaceIntensity: 0.3, glowRadius: 200 }}
	{template}
/>

<Story name="Pinned light (no pointer)" args={{ pinned: { x: 320, y: 140 } }} {template} />

<style>
	.spotlight-story {
		padding: 3rem;
		min-block-size: 100dvh;
		background: oklch(11% 0.015 285);
	}
</style>
