<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import GradientText from './GradientText.svelte';
	import { gradientTextDefaults, gradientTextSchema } from './gradient-text.js';

	const { Story } = defineMeta({
		title: 'FX/Gradient Text',
		component: GradientText,
		tags: ['autodocs'],
		args: gradientTextDefaults,
		argTypes: toArgTypes(gradientTextSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="page">
		<h1><GradientText {...args}>Make it shine</GradientText></h1>
	</div>
{/snippet}

<Story name="Turning gradient" {template} />

<Story name="Conic rainbow" args={{ gradient: 'conic', palette: 'rainbow' }} {template} />

<Story
	name="Outline only"
	args={{ fill: 'none', stroke: 0.02, strokeColor: '#9be7ff', animate: false }}
	{template}
/>

<Story
	name="Gradient with outside stroke"
	args={{ palette: 'sunset', stroke: 0.025, strokeColor: '#fff4e6', animate: false }}
	{template}
/>

<style>
	.page {
		display: grid;
		place-items: center;
		min-block-size: 100dvh;
		padding: 2rem;
		background: #0e0b18;
		color: #eee;
	}

	h1 {
		margin: 0;
		font:
			900 clamp(3rem, 11vw, 8rem) / 1 system-ui,
			sans-serif;
		letter-spacing: -0.03em;
		text-align: center;
	}
</style>
