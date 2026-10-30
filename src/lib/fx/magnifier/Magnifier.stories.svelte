<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Landscape from '../duotone/Landscape.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import Magnifier from './Magnifier.svelte';
	import { magnifierDefaults, magnifierSchema } from './magnifier.js';

	const { Story } = defineMeta({
		title: 'FX/Magnifier',
		component: Magnifier,
		tags: ['autodocs'],
		args: { ...magnifierDefaults, x: 0.45, y: 0.4 },
		argTypes: {
			...toArgTypes(magnifierSchema),
			x: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
			y: { control: { type: 'range', min: 0, max: 1, step: 0.01 } }
		},
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Magnifier {...args} label="Magnifier over the landscape" style="block-size: 100dvh;">
		<Landscape />
	</Magnifier>
{/snippet}

<Story name="Loupe" {template} />

<Story name="Fisheye" args={{ profile: 'fisheye', zoom: 2.6, radius: 140 }} {template} />

<Story name="Strong, narrow rim" args={{ zoom: 3.5, rim: 0.08, radius: 80 }} {template} />

<Story name="Backdrop (Chromium)" args={{ backdrop: true }} {template} />
