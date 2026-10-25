<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import LitSurface from './LitSurface.svelte';
	import { lightingDefaults, lightingSchema } from './lighting.js';

	const { Story } = defineMeta({
		title: 'FX/Lighting',
		component: LitSurface,
		tags: ['autodocs'],
		args: lightingDefaults,
		argTypes: toArgTypes(lightingSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="stage">
		<LitSurface {...args} role="img" aria-label="Embossed word RELIEF on plaster">
			<span class="word">RELIEF</span>
		</LitSurface>
	</div>
{/snippet}

<Story name="Embossed plaster" {template} />

<Story
	name="Rough paper"
	args={{
		relief: 'texture',
		bumpFrequency: 0.3,
		bumpOctaves: 2,
		surfaceScale: 2,
		specular: false,
		surfaceColor: '#f4efe6'
	}}
	{template}
/>

<Story
	name="Spotlit stone"
	args={{
		lightType: 'spot',
		coneAngle: 30,
		elevation: 300,
		bumpFrequency: 0.012,
		bumpOctaves: 5,
		surfaceScale: 12,
		surfaceColor: '#b9b2a8'
	}}
	{template}
/>

<Story
	name="Glossy letterpress"
	args={{
		relief: 'shape',
		shapeBlur: 1.5,
		surfaceScale: 8,
		specularConstant: 1.2,
		specularExponent: 60,
		surfaceColor: '#2c3e66',
		lightingColor: '#ffffff'
	}}
	{template}
/>

<Story
	name="Low sun"
	args={{ lightType: 'distant', lightX: 0, lightY: 40, elevation: 60, lightingColor: '#ffd7a8' }}
	{template}
/>

<style>
	.stage {
		block-size: 100dvh;
	}

	.word {
		font-size: clamp(4rem, 16vw, 12rem);
		font-weight: 900;
		letter-spacing: -0.03em;
	}
</style>
