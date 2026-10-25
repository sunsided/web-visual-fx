<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Switch from './Switch.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Switch',
		component: Switch,
		tags: ['autodocs'],
		args: { checked: false, disabled: false, 'aria-label': 'Toggle' }
	});
</script>

<Story name="Off" />

<Story name="On" args={{ checked: true }} />

<Story name="Custom tokens" args={{ checked: true }}>
	{#snippet template(args)}
		<div style="--switch-width: 3.5rem; --switch-height: 2rem; --switch-track-on: seagreen;">
			<Switch {...args} />
		</div>
	{/snippet}
</Story>
