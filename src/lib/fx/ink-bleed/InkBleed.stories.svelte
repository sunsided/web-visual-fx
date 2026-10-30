<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import InkBleed from './InkBleed.svelte';
	import InkSample from './InkSample.svelte';
	import { inkBleedDefaults, inkBleedPresets, inkBleedSchema } from './ink-bleed.js';

	const { Story } = defineMeta({
		title: 'FX/Ink Bleed',
		component: InkBleed,
		tags: ['autodocs'],
		args: inkBleedDefaults,
		argTypes: toArgTypes(inkBleedSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<InkBleed {...args} style="block-size: 100dvh;">
		<InkSample />
	</InkBleed>
{/snippet}

<Story name="Ink" {template} />

<Story name="Watercolor" args={{ ...inkBleedDefaults, ...inkBleedPresets.watercolor }} {template} />

<Story name="Feathered" args={{ ...inkBleedDefaults, ...inkBleedPresets.feathered }} {template} />

<Story
	name="Without paper"
	args={{ ...inkBleedDefaults, ...inkBleedPresets.watercolor, paper: false }}
	{template}
/>
