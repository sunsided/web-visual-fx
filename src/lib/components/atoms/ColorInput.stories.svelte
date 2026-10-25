<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ColorInput from './ColorInput.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/ColorInput',
		component: ColorInput,
		tags: ['autodocs'],
		args: { value: '#8a5cff', disabled: false, 'aria-label': 'Color' },
		argTypes: { value: { control: 'color' } }
	});
</script>

<Story name="Default" />

<Story name="Large">
	{#snippet template(args)}
		<div style="--color-input-size: 3rem;"><ColorInput {...args} /></div>
	{/snippet}
</Story>
