<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import Caustics from './Caustics.svelte';
	import PoolFloor from './PoolFloor.svelte';
	import { causticsDefaults, causticsSchema } from './caustics.js';

	const { Story } = defineMeta({
		title: 'FX/Caustics',
		component: Caustics,
		tags: ['autodocs'],
		args: causticsDefaults,
		argTypes: toArgTypes(causticsSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="caustics-story">
		<Caustics {...args} class="caustics-story-layer">
			<PoolFloor />
		</Caustics>
	</div>
{/snippet}

{#snippet landscapeTemplate(args: Record<string, unknown>)}
	<div class="caustics-story">
		<Caustics {...args} class="caustics-story-layer">
			<Landscape />
		</Caustics>
	</div>
{/snippet}

<Story name="Pool floor" {template} />

<Story
	name="Fine mesh"
	args={{ frequency: 0.022, lineWidth: 0.05, warp: 30, intensity: 0.9 }}
	{template}
/>

<Story name="Choppy" args={{ octaves: 2, lineWidth: 0.14, warp: 70, speed: 35 }} {template} />

<Story
	name="Deep and soft"
	args={{ tintOpacity: 0.6, intensity: 0.6, lineWidth: 0.2, sheen: 0, frequency: 0.008 }}
	{template}
/>

<Story name="Over an image" args={{ tintOpacity: 0.25 }} template={landscapeTemplate} />

<style>
	.caustics-story {
		block-size: 100dvh;
		overflow: hidden;
	}

	/* Bleed past the frame so the wobbly edges stay out of view. */
	.caustics-story :global(.caustics-story-layer) {
		block-size: calc(100% + 32px);
		margin: -16px;
	}
</style>
