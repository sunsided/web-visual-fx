<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { glassSchema } from '#lib/fx/glass/glass.js';
	import { ParamState } from '#lib/params/state.svelte.js';
	import ControlPanel from './ControlPanel.svelte';
	import ParamControls from './ParamControls.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/ControlPanel',
		component: ControlPanel,
		tags: ['autodocs'],
		args: { title: 'Frosted glass', open: true, onreset: fn() }
	});
</script>

<script lang="ts">
	const glass = new ParamState(glassSchema);
</script>

<Story name="Schema-driven" parameters={{ layout: 'centered' }}>
	{#snippet template(args)}
		<div style="block-size: 36rem; display: flex;">
			<ControlPanel
				title={args.title}
				open={args.open}
				code={glass.markup('GlassPanel')}
				onreset={glass.reset}
			>
				<ParamControls schema={glassSchema} bind:values={glass.values} />
			</ControlPanel>
		</div>
	{/snippet}
</Story>

<Story name="Only some groups" parameters={{ layout: 'centered' }}>
	{#snippet template(args)}
		<ControlPanel title={args.title} open={args.open} onreset={args.onreset}>
			<ParamControls schema={glassSchema} bind:values={glass.values} groups={['Rim', 'Grain']} />
		</ControlPanel>
	{/snippet}
</Story>
