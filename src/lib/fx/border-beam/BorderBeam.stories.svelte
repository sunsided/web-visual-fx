<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import BorderBeam from './BorderBeam.svelte';
	import { borderBeamDefaults, borderBeamSchema } from './border-beam.js';

	const { Story } = defineMeta({
		title: 'FX/Border beam',
		component: BorderBeam,
		tags: ['autodocs'],
		args: borderBeamDefaults,
		argTypes: toArgTypes(borderBeamSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="border-beam-story">
		<BorderBeam {...args} style="max-inline-size: 24rem;">
			<h2 style="font-size: 1.125rem; margin-block-end: 0.5rem;">Border beam</h2>
			<p style="color: #c4bfd6;">
				A conic gradient turns behind a ring-shaped mask, so only the border lights up.
			</p>
		</BorderBeam>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Twin beams"
	args={{ beams: 2, length: 60, color: '#fde047', colorB: '#f97316', duration: 8 }}
	{template}
/>

<Story
	name="Pill, thick and bright"
	args={{ radius: 48, width: 3, glow: 20, length: 140 }}
	{template}
/>

<Story
	name="Counterclockwise, no glow"
	args={{ direction: 'counterclockwise', glow: 0, color: '#f472b6', colorB: '#6366f1' }}
	{template}
/>

<Story name="Still ring" args={{ animate: false }} {template} />

<style>
	.border-beam-story {
		display: grid;
		place-items: center;
		padding: 3rem;
		min-block-size: 100dvh;
		background: oklch(11% 0.015 285);
	}
</style>
