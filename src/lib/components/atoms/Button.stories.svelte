<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Button',
		component: Button,
		tags: ['autodocs'],
		args: { variant: 'soft', size: 'md', disabled: false },
		argTypes: {
			variant: { control: 'inline-radio', options: ['solid', 'soft', 'ghost'] },
			size: { control: 'inline-radio', options: ['sm', 'md'] }
		}
	});
</script>

<Story name="Soft">Button</Story>
<Story name="Solid" args={{ variant: 'solid' }}>Button</Story>
<Story name="Ghost" args={{ variant: 'ghost' }}>Button</Story>
<Story name="Small" args={{ size: 'sm' }}>Button</Story>
