<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Duotone from './Duotone.svelte';
	import Landscape from './Landscape.svelte';
	import { duotoneDefaults, duotoneSchema } from './duotone.js';

	const { Story } = defineMeta({
		title: 'FX/Duotone',
		component: Duotone,
		tags: ['autodocs'],
		args: duotoneDefaults,
		argTypes: toArgTypes(duotoneSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Duotone {...args} style="block-size: 100dvh;">
		<Landscape />
	</Duotone>
{/snippet}

<Story name="Sunset gradient map" {template} />

<Story
	name="Classic duotone"
	args={{ useMidtone: false, shadow: '#0b2a4a', highlight: '#7fe3d4' }}
	{template}
/>

<Story
	name="Neon poster"
	args={{ shadow: '#120024', midtone: '#ff2e88', highlight: '#3df2ff', contrast: 1.4 }}
	{template}
/>

<Story
	name="Sepia"
	args={{ useMidtone: false, shadow: '#2b1a0e', highlight: '#f5e6c8', contrast: 0.9 }}
	{template}
/>

<Story
	name="Subtle tint (linear light)"
	args={{
		shadow: '#1a2b3c',
		midtone: '#7a8fa3',
		highlight: '#fff6e0',
		amount: 0.5,
		colorSpace: 'linearRGB'
	}}
	{template}
/>
