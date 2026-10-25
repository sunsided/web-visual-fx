<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Squircle from './Squircle.svelte';
	import { squircleDefaults, squircleSchema } from './squircle.js';

	const { Story } = defineMeta({
		title: 'FX/Squircle',
		component: Squircle,
		tags: ['autodocs'],
		args: squircleDefaults,
		argTypes: toArgTypes(squircleSchema),
		parameters: { layout: 'centered' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Squircle
		{...args}
		style="display: grid; place-content: center; gap: 0.5rem; inline-size: 20rem; aspect-ratio: 4 / 3; text-align: center;"
	>
		<strong style="font-size: 1.75rem;">Squircle</strong>
		<span>Pick another shape to watch it morph.</span>
	</Squircle>
{/snippet}

<Story name="Squircle" {template} />

<Story name="Superellipse(4)" args={{ shape: 'superellipse', k: 4, radius: 80 }} {template} />

<Story name="Scoop" args={{ shape: 'scoop', radius: 40 }} {template} />

<Story name="Bevel" args={{ shape: 'bevel', radius: 32, easing: 'emphasized' }} {template} />

<Story name="Clip-path fallback" args={{ renderer: 'clip-path' }} {template} />
