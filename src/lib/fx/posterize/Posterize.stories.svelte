<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Landscape from '../duotone/Landscape.svelte';
	import Posterize from './Posterize.svelte';
	import ShadedScene from './ShadedScene.svelte';
	import { posterizeDefaults, posterizeSchema } from './posterize.js';

	const { Story } = defineMeta({
		title: 'FX/Posterize',
		component: Posterize,
		tags: ['autodocs'],
		args: posterizeDefaults,
		argTypes: toArgTypes(posterizeSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Posterize {...args} style="block-size: 100dvh;">
		<ShadedScene />
	</Posterize>
{/snippet}

{#snippet landscape(args: Record<string, unknown>)}
	<Posterize {...args} style="block-size: 100dvh;">
		<Landscape />
	</Posterize>
{/snippet}

<Story name="Toon" {template} />

<Story name="Plain posterize" args={{ inkEdges: false, smoothing: 0, saturation: 1 }} {template} />

<Story
	name="Two-tone comic"
	args={{ levels: 2, saturation: 1.6, smoothing: 2, inkWidth: 1 }}
	{template}
/>

<Story name="Linear-light bands" args={{ colorSpace: 'linearRGB', levels: 5 }} {template} />

<Story name="Poster landscape" args={{ levels: 3, inkWidth: 0 }} template={landscape} />
