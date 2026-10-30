<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Landscape from '../duotone/Landscape.svelte';
	import Edges from './Edges.svelte';
	import { edgesDefaults, edgesSchema } from './edges.js';

	const { Story } = defineMeta({
		title: 'FX/Edges',
		component: Edges,
		tags: ['autodocs'],
		args: edgesDefaults,
		argTypes: toArgTypes(edgesSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Edges {...args} style="block-size: 100dvh;">
		<Landscape />
	</Edges>
{/snippet}

<Story name="Pencil sketch" {template} />

<Story name="Colored pencil" args={{ lineWidth: 1, color: 1 }} {template} />

<Story
	name="Blueprint"
	args={{ mode: 'edges', ink: '#0d2a5c', paper: '#cfe6ff', texture: 0 }}
	{template}
/>

<Story
	name="Neon edges"
	args={{
		mode: 'edges',
		operator: 'laplacian',
		ink: '#07040f',
		paper: '#5cf2ff',
		texture: 0,
		strength: 3,
		lineWidth: 1
	}}
	{template}
/>

<Story
	name="Embossed metal"
	args={{ mode: 'emboss', ink: '#2f333a', paper: '#eef2f7', strength: 2.5, smoothing: 1.5 }}
	{template}
/>

<Story
	name="Emboss over color"
	args={{ mode: 'emboss', size: '5', strength: 1.5, color: 1 }}
	{template}
/>
