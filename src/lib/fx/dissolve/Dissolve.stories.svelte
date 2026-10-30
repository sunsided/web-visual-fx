<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Dissolve from './Dissolve.svelte';
	import DemoCard from './DemoCard.svelte';
	import { dissolveDefaults, dissolveSchema } from './dissolve.js';

	const { Story } = defineMeta({
		title: 'FX/Dissolve',
		component: Dissolve,
		tags: ['autodocs'],
		args: dissolveDefaults,
		argTypes: toArgTypes(dissolveSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="stage">
		<Dissolve {...args} style="inline-size: min(26rem, 100% - 2rem);">
			<DemoCard />
		</Dissolve>
	</div>
{/snippet}

<Story name="Burning from the bottom" {template} />

<Story name="Pure noise" args={{ origin: 'none', progress: 0.5, noiseScale: 32 }} {template} />

<Story
	name="Hole from the center"
	args={{ origin: 'center', bias: 0.7, progress: 0.4, emberWidth: 0.06, glow: 8 }}
	{template}
/>

<Story
	name="Cold dissolve"
	args={{
		ember: '#7fe3ff',
		char: '#0b2a4a',
		charWidth: 0,
		origin: 'right',
		progress: 0.5,
		noiseScale: 20,
		octaves: 5
	}}
	{template}
/>

<Story name="Reduced-motion fade" args={{ mode: 'fade', progress: 0.5 }} {template} />

<style>
	.stage {
		display: grid;
		place-items: center;
		min-block-size: 100dvh;
		background: radial-gradient(circle at 30% 20%, oklch(35% 0.12 320), oklch(14% 0.03 280) 70%);
	}
</style>
