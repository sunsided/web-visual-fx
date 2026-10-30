<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Landscape from '../duotone/Landscape.svelte';
	import Kaleidoscope from './Kaleidoscope.svelte';
	import { kaleidoscopeDefaults, kaleidoscopeSchema } from './kaleidoscope.js';

	const { Story } = defineMeta({
		title: 'FX/Kaleidoscope',
		component: Kaleidoscope,
		tags: ['autodocs'],
		args: kaleidoscopeDefaults,
		argTypes: toArgTypes(kaleidoscopeSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Kaleidoscope {...args} style="block-size: 100dvh;" />
{/snippet}

{#snippet landscape(args: Record<string, unknown>)}
	<Kaleidoscope {...args} style="block-size: 100dvh;">
		{#snippet art()}
			<Landscape />
		{/snippet}
	</Kaleidoscope>
{/snippet}

<Story name="Pattern" {template} />

<Story name="Twelve mirrors" args={{ segments: 12, zoom: 2 }} {template} />

<Story name="Landscape" args={{ segments: 6, zoom: 1, interactive: false }} template={landscape} />

<Story name="Rotational, no mirrors" args={{ mirror: false, spin: false }} {template} />
