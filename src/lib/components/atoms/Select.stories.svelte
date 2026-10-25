<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Select from './Select.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Select',
		component: Select,
		tags: ['autodocs'],
		args: {
			value: 'overlay',
			options: ['normal', 'multiply', 'screen', 'overlay'],
			disabled: false,
			'aria-label': 'Blend mode'
		}
	});
</script>

<Story name="Default" />
