<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import WaterSim from './WaterSim.svelte';
	import { waterSimDefaults, waterSimSchema } from './water-sim.js';

	const { Story } = defineMeta({
		title: 'FX/Water Sim (WebGL2)',
		component: WaterSim,
		tags: ['autodocs'],
		args: waterSimDefaults,
		argTypes: toArgTypes(waterSimSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<WaterSim {...args} style="block-size: 100dvh; display: grid; place-items: center;">
		<p class="label">Experimental: WebGL2 water. Click to drop a stone.</p>
	</WaterSim>
{/snippet}

<Story name="Pool" {template} />

<Story name="Downpour" args={{ rain: 8, dropStrength: 0.3, dropRadius: 10 }} {template} />

<Story
	name="Long ringing ripples"
	args={{ damping: 0.996, rain: 0.3, speed: 3, specular: 1 }}
	{template}
/>

<Story
	name="Night pool"
	args={{
		tileColor: '#1f3f66',
		groutColor: '#0d1b2e',
		tint: '#020b1a',
		tintAmount: 0.4,
		specular: 1.2
	}}
	{template}
/>

<style>
	.label {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: #04121ce6;
		color: #fff;
		font-weight: 600;
	}
</style>
