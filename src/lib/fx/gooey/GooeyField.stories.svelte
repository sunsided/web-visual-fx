<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import GooeyField from './GooeyField.svelte';
	import { gooeyDefaults, gooeySchema } from './gooey.js';

	const { Story } = defineMeta({
		title: 'FX/Gooey',
		component: GooeyField,
		tags: ['autodocs'],
		args: gooeyDefaults,
		argTypes: toArgTypes(gooeySchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="stage">
		<GooeyField {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Lava lamp"
	args={{
		count: 5,
		size: 160,
		speed: 0.4,
		blur: 20,
		offset: 10,
		colorA: '#ff6a00',
		colorB: '#ffd23f'
	}}
	{template}
/>

<Story
	name="Mercury drops"
	args={{
		count: 14,
		size: 40,
		speed: 1.6,
		blur: 6,
		sharpness: 30,
		offset: 13,
		colorA: '#c9ced6',
		colorB: '#6b7280'
	}}
	{template}
/>

<Story name="Soft edges" args={{ sharpness: 4, offset: 1.5 }} {template} />

<Story
	name="Blurred colors"
	args={{ keepColors: false, colorA: '#00c2a8', colorB: '#ff3d71' }}
	{template}
/>

<style>
	.stage {
		block-size: 100dvh;
		background: oklch(18% 0.04 280);
	}
</style>
