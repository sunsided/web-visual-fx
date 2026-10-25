<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Slider from './Slider.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Slider',
		component: Slider,
		tags: ['autodocs'],
		args: { value: 40, min: 0, max: 100, step: 1, disabled: false, 'aria-label': 'Value' },
		argTypes: {
			value: { control: { type: 'range', min: 0, max: 100 } }
		}
	});
</script>

<Story name="Default" />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="Custom tokens">
	{#snippet template(args)}
		<div
			style="--slider-fill: hotpink; --slider-track-height: 10px; --slider-thumb-size: 22px; --slider-thumb: hotpink; --slider-thumb-border: 3px solid white;"
		>
			<Slider {...args} />
		</div>
	{/snippet}
</Story>
