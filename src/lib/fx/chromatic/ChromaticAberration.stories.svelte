<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import ChromaticAberration from './ChromaticAberration.svelte';
	import { chromaticDefaults, chromaticSchema } from './chromatic.js';

	const { Story } = defineMeta({
		title: 'FX/Chromatic aberration',
		component: ChromaticAberration,
		tags: ['autodocs'],
		args: chromaticDefaults,
		argTypes: toArgTypes(chromaticSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="chromatic-story">
		<ChromaticAberration {...args}>
			<Scene
				kind="aurora"
				animate={false}
				class="chromatic-story-image"
				--scene-scrim="oklch(0% 0 0 / 0.35)"
			>
				<h2>Aberration</h2>
			</Scene>
		</ChromaticAberration>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Diagonal" args={{ distance: 5, angle: 45 }} {template} />

<Story name="Anaglyph" args={{ mode: 'red-cyan', distance: 4 }} {template} />

<Story name="Lens (radial)" args={{ mode: 'radial', distance: 6 }} {template} />

<Story name="Jitter" args={{ jitter: true, jitterAmount: 2 }} {template} />

<style>
	.chromatic-story {
		display: grid;
		place-items: center;
		block-size: 100dvh;
		padding: var(--space-8);
		background: oklch(14% 0.02 285);
	}

	.chromatic-story :global(.chromatic-story-image) {
		display: grid;
		place-items: center;
		inline-size: min(36rem, 90vw);
		block-size: 22rem;
		border-radius: var(--radius-xl);
		color: oklch(100% 0 0);
		font-size: var(--text-2xl);
		font-weight: 900;
	}
</style>
