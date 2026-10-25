<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Landscape from '../duotone/Landscape.svelte';
	import Halftone from './Halftone.svelte';
	import { halftoneDefaults, halftoneSchema } from './halftone.js';

	const { Story } = defineMeta({
		title: 'FX/Halftone',
		component: Halftone,
		tags: ['autodocs'],
		args: halftoneDefaults,
		argTypes: toArgTypes(halftoneSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Halftone {...args} style="block-size: 100dvh;">
		<Landscape />
	</Halftone>
{/snippet}

<Story name="Newsprint" {template} />

<Story
	name="Color dots"
	args={{ monochrome: false, dotSize: 8, angle: 15, softness: 0.25 }}
	{template}
/>

<Story
	name="Pop art"
	args={{ ink: '#d1104a', paper: '#ffe14d', dotSize: 22, angle: 30, softness: 0.05 }}
	{template}
/>

<Story
	name="1-bit dither"
	exportName="OneBitDither"
	args={{ mode: 'dither', ink: '#20283b', paper: '#c4f0c2', matrixSize: '8', pixelSize: 3 }}
	{template}
/>

<Story
	name="Posterized color"
	args={{ mode: 'dither', monochrome: false, levels: 3, dither: false }}
	{template}
/>
