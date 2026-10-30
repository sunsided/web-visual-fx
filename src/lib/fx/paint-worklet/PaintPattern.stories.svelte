<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import PaintPattern from './PaintPattern.svelte';
	import { paintPatternDefaults, paintPatternSchema } from './paint-worklet.js';

	const { Story } = defineMeta({
		title: 'FX/Paint Worklet',
		component: PaintPattern,
		tags: ['autodocs'],
		args: paintPatternDefaults,
		argTypes: toArgTypes(paintPatternSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<PaintPattern {...args} style="block-size: 100dvh; display: grid; place-items: center;">
		<p class="label">Experimental: CSS Paint Worklet</p>
	</PaintPattern>
{/snippet}

<Story name="Squiggles" {template} />

<Story name="Confetti dots" args={{ pattern: 'dots', size: 10, density: 1.4 }} {template} />

<Story
	name="Blob border"
	args={{ pattern: 'blobs', border: true, borderWidth: 48, size: 28, radius: 40 }}
	{template}
/>

<Story name="Gradient twin" args={{ renderer: 'gradient' }} {template} />

<style>
	.label {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: #120e2ee6;
		color: #fff;
		font-weight: 600;
	}
</style>
