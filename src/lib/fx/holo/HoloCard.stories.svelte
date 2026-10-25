<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import HoloCard from './HoloCard.svelte';
	import { holoDefaults, holoSchema } from './holo.js';

	const { Story } = defineMeta({
		title: 'FX/Holographic foil',
		component: HoloCard,
		tags: ['autodocs'],
		args: holoDefaults,
		argTypes: toArgTypes(holoSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="holo-story">
		<HoloCard {...args} label="Example card">
			{#snippet art()}
				<div class="art"></div>
			{/snippet}
			<h2 style="font-size: 1.1rem;">Prism Fox</h2>
			<p style="font-size: 0.85rem;">Uncommon · Dawn walker</p>
		</HoloCard>
	</div>
{/snippet}

<Story name="Linear foil" {template} />

<Story
	name="Crosshatch"
	args={{ pattern: 'crosshatch', stripeWidth: 6, hueSpread: 540 }}
	{template}
/>

<Story
	name="Sunburst on the art"
	args={{ pattern: 'sunburst', stripeWidth: 8, artOnly: true, glare: 0.8 }}
	{template}
/>

<Story
	name="Soft pastel (overlay)"
	args={{ pattern: 'rainbow', blendMode: 'overlay', foilIntensity: 1, sparkle: 0.15 }}
	{template}
/>

<Story name="Flat, still card" args={{ maxTilt: 0, idle: false, smoothing: 0.6 }} {template} />

<style>
	.holo-story {
		display: grid;
		place-items: center;
		block-size: 100dvh;
		background: oklch(16% 0.03 285);
	}

	.art {
		background: linear-gradient(oklch(35% 0.1 250), oklch(70% 0.13 60));
	}
</style>
