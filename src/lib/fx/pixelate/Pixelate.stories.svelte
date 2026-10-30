<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Landscape from '../duotone/Landscape.svelte';
	import Pixelate from './Pixelate.svelte';
	import { pixelateDefaults, pixelateSchema } from './pixelate.js';

	const { Story } = defineMeta({
		title: 'FX/Pixelate',
		component: Pixelate,
		tags: ['autodocs'],
		args: pixelateDefaults,
		argTypes: toArgTypes(pixelateSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Pixelate {...args} style="block-size: 100dvh;">
		<Landscape />
	</Pixelate>
{/snippet}

<Story name="Mosaic" {template} />

<Story name="Censor (hover to reveal)" args={{ size: 24, reveal: 'hover' }} {template} />

<Story name="Tiles with grout" args={{ size: 20, gap: 3, roundness: 0.25 }} {template} />

<Story name="LED wall" args={{ size: 10, gap: 2, roundness: 1, grout: '#050408' }} {template} />
