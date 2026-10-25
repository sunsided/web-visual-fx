<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import NoiseLayer from './NoiseLayer.svelte';
	import { noiseDefaults, noiseSchema } from './noise.js';

	const { Story } = defineMeta({
		title: 'FX/Noise',
		component: NoiseLayer,
		tags: ['autodocs'],
		args: noiseDefaults,
		argTypes: toArgTypes(noiseSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="stage">
		<NoiseLayer {...args} />
	</div>
{/snippet}

<Story name="Grain overlay" {template} />

<Story name="Film grain (animated)" args={{ animate: true, opacity: 0.5 }} {template} />

<Story
	name="Clouds"
	args={{ baseFrequency: 0.01, numOctaves: 5, contrast: 1, opacity: 0.6, blendMode: 'soft-light' }}
	{template}
/>

<Story
	name="Brushed metal"
	args={{
		baseFrequency: 0.6,
		stretch: 0.05,
		numOctaves: 2,
		opacity: 0.45,
		blendMode: 'overlay'
	}}
	{template}
/>

<Story
	name="Colored turbulence"
	args={{
		type: 'turbulence',
		baseFrequency: 0.02,
		monochrome: false,
		contrast: 1.2,
		opacity: 0.8,
		blendMode: 'color-dodge'
	}}
	{template}
/>

<style>
	.stage {
		position: relative;
		isolation: isolate;
		block-size: 100dvh;
		background: linear-gradient(160deg, #1b1035, #d9467a);
	}
</style>
