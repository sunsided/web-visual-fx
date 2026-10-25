<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import GooeyMenu from './GooeyMenu.svelte';
	import { gooDefaults, gooSchema, gooeyMenuDefaults, gooeyMenuSchema } from './gooey.js';

	const { blur, sharpness, offset, region } = gooSchema;
	const schema = { blur, sharpness, offset, region, ...gooeyMenuSchema };

	const { Story } = defineMeta({
		title: 'FX/Gooey menu',
		component: GooeyMenu,
		tags: ['autodocs'],
		args: {
			blur: gooDefaults.blur,
			sharpness: gooDefaults.sharpness,
			offset: gooDefaults.offset,
			region: gooDefaults.region,
			...gooeyMenuDefaults
		},
		argTypes: toArgTypes(schema),
		parameters: { layout: 'fullscreen' }
	});

	const items = [
		{ label: 'Share', icon: '↗' },
		{ label: 'Edit', icon: '✎' },
		{ label: 'Favorite', icon: '★' }
	];
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="stage">
		<GooeyMenu {...args} {items} />
	</div>
{/snippet}

<Story name="Row" {template} />

<Story name="Open column" args={{ layout: 'up', open: true }} {template} />

<Story name="Arc" args={{ layout: 'arc', distance: 52, open: true, color: '#ff4f9a' }} {template} />

<Story
	name="Tight and sticky"
	args={{ distance: 46, blur: 14, offset: 7, open: true, color: '#ffd23f' }}
	{template}
/>

<style>
	.stage {
		display: grid;
		place-items: center;
		block-size: 100dvh;
		background: oklch(97% 0.02 300);
	}
</style>
