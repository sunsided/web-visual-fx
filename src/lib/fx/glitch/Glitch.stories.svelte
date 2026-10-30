<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import Glitch from './Glitch.svelte';
	import { glitchDefaults, glitchSchema } from './glitch.js';

	const { Story } = defineMeta({
		title: 'FX/Glitch',
		component: Glitch,
		tags: ['autodocs'],
		args: glitchDefaults,
		argTypes: toArgTypes(glitchSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="glitch-story">
		<Glitch {...args}>
			<Scene
				kind="stripes"
				animate={false}
				class="glitch-story-image"
				--scene-scrim="oklch(0% 0 0 / 0.4)"
			>
				<h2>Signal lost</h2>
			</Scene>
		</Glitch>
	</div>
{/snippet}

<Story name="Bursts" {template} />

<Story name="Frozen frame" args={{ bursts: false, still: 'frame' }} {template} />

<Story
	name="Heavy tear"
	args={{ bursts: false, still: 'frame', shift: 90, slices: 12, sliceHeight: 60, fringe: 0.8 }}
	{template}
/>

<Story name="Thin scan slices" args={{ slices: 20, sliceHeight: 6, shift: 24 }} {template} />

<Story name="Split only" args={{ bursts: false, still: 'split', split: 3 }} {template} />

<style>
	.glitch-story {
		display: grid;
		place-items: center;
		block-size: 100dvh;
		padding: var(--space-8);
		background: oklch(12% 0.02 270);
	}

	.glitch-story :global(.glitch-story-image) {
		display: grid;
		place-items: center;
		inline-size: min(36rem, 90vw);
		block-size: 22rem;
		color: oklch(100% 0 0);
		font-size: var(--text-2xl);
		font-weight: 900;
		text-transform: uppercase;
	}
</style>
