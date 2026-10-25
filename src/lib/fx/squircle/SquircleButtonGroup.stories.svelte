<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import SquircleButtonGroup from './SquircleButtonGroup.svelte';
	import { buttonGroupDefaults, buttonGroupSchema } from './squircle.js';

	const items = [
		{ value: 'day', label: 'Day' },
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'year', label: 'Year' }
	];

	const formatting = [
		{ value: 'bold', label: 'Bold' },
		{ value: 'italic', label: 'Italic' },
		{ value: 'underline', label: 'Underline' }
	];

	const { Story } = defineMeta({
		title: 'FX/Squircle button group',
		component: SquircleButtonGroup,
		tags: ['autodocs'],
		args: { ...buttonGroupDefaults, items, label: 'Calendar range', selected: ['week'] },
		argTypes: toArgTypes(buttonGroupSchema),
		parameters: { layout: 'centered' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div style="inline-size: min(28rem, 90vw);">
		<SquircleButtonGroup items={[]} label="" {...args} />
	</div>
{/snippet}

<Story name="Single select" {template} />

<Story
	name="Multi-select formatting"
	args={{ items: formatting, label: 'Text formatting', multiple: true, selected: ['bold'] }}
	{template}
/>

<Story name="Bevelled" args={{ activeShape: 'bevel', activeRadius: 12 }} {template} />

<Story
	name="Big expand, bouncy"
	args={{ expand: 1.5, bounce: 0.6, duration: 900, gap: 8 }}
	{template}
/>

<Story name="Emphasized, no spring" args={{ easing: 'emphasized', duration: 400 }} {template} />
