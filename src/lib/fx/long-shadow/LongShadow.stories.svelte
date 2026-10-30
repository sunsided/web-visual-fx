<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import LongShadow from './LongShadow.svelte';
	import { longShadowDefaults, longShadowSchema } from './long-shadow.js';

	const { Story } = defineMeta({
		title: 'FX/Long Shadow',
		component: LongShadow,
		tags: ['autodocs'],
		args: longShadowDefaults,
		argTypes: toArgTypes(longShadowSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet page(args: Record<string, unknown>, background: string)}
	<div class="page" style:background>
		<h1><LongShadow {...args}>Deep</LongShadow></h1>
	</div>
{/snippet}

{#snippet plum(args: Record<string, unknown>)}
	{@render page(args, '#2a1236')}
{/snippet}

{#snippet orange(args: Record<string, unknown>)}
	{@render page(args, '#d9661f')}
{/snippet}

{#snippet navy(args: Record<string, unknown>)}
	{@render page(args, '#1d2a44')}
{/snippet}

<Story name="Color ramp" template={plum} />

<Story
	name="Flat long shadow"
	args={{
		face: '#ffffff',
		from: '#9e4310',
		to: '#9e4310',
		fade: true,
		length: 0.6,
		steps: 60
	}}
	template={orange}
/>

<Story
	name="Extruded 3D"
	args={{
		face: '#ffe27a',
		from: '#d99a1e',
		to: '#7a4a08',
		length: 0.14,
		steps: 14,
		angle: 60,
		ambient: true
	}}
	template={navy}
/>

<style>
	.page {
		display: grid;
		place-items: center;
		min-block-size: 100dvh;
		overflow: hidden;
	}

	h1 {
		margin: 0;
		font:
			900 clamp(4rem, 16vw, 11rem) / 1 system-ui,
			sans-serif;
	}
</style>
