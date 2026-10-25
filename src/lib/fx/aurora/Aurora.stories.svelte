<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Aurora from './Aurora.svelte';
	import { auroraDefaults, auroraSchema } from './aurora.js';

	const { Story } = defineMeta({
		title: 'FX/Aurora',
		component: Aurora,
		tags: ['autodocs'],
		args: auroraDefaults,
		argTypes: toArgTypes(auroraSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Aurora {...args} class="aurora-story" />
{/snippet}

<Story name="Mesh gradient" {template} />

<Story name="Blurred blobs" args={{ technique: 'blobs', blur: 80, blobs: 6 }} {template} />

<Story
	name="Northern lights"
	args={{
		colorCount: 3,
		color1: '#22c55e',
		color2: '#14b8a6',
		color3: '#6366f1',
		background: '#020617',
		blendMode: 'screen',
		blobSize: 70,
		speed: 0.6
	}}
	{template}
/>

<Story
	name="Pastel"
	args={{
		color1: '#f9a8d4',
		color2: '#a5b4fc',
		color3: '#99f6e4',
		color4: '#fde68a',
		background: '#faf5ff',
		blur: 0,
		saturation: 0.8,
		grain: 0.2
	}}
	{template}
/>

<Story
	name="Sunset (no motion)"
	args={{
		colorCount: 3,
		color1: '#f97316',
		color2: '#e11d48',
		color3: '#facc15',
		background: '#3b0764',
		blendMode: 'soft-light',
		blobs: 7,
		animate: false
	}}
	{template}
/>

<style>
	:global(.aurora-story) {
		block-size: 100dvh;
	}
</style>
