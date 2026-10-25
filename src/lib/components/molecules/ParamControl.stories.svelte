<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ParamControl from './ParamControl.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ParamControl',
		component: ParamControl,
		tags: ['autodocs'],
		parameters: { layout: 'padded' }
	});
</script>

<Story
	name="Range"
	args={{
		param: {
			kind: 'range',
			label: 'Blur',
			default: 12,
			min: 0,
			max: 48,
			step: 0.5,
			unit: 'px'
		},
		value: 12
	}}
/>

<Story
	name="Toggle"
	args={{ param: { kind: 'toggle', label: 'Displacement', default: true }, value: true }}
/>

<Story
	name="Select"
	args={{
		param: {
			kind: 'select',
			label: 'Type',
			default: 'fractalNoise',
			options: ['fractalNoise', 'turbulence']
		},
		value: 'fractalNoise'
	}}
/>

<Story
	name="Color"
	args={{ param: { kind: 'color', label: 'Tint', default: '#ffffff' }, value: '#ffffff' }}
/>

<Story
	name="Disabled"
	args={{
		param: { kind: 'range', label: 'Strength', default: 40, min: 0, max: 200, step: 1 },
		value: 40,
		disabled: true
	}}
/>
