<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import Ripple from './Ripple.svelte';
	import { rippleDefaults, ripplePresets, rippleSchema } from './ripple.js';

	const { Story } = defineMeta({
		title: 'FX/Water ripple',
		component: Ripple,
		tags: ['autodocs'],
		args: rippleDefaults,
		argTypes: toArgTypes(rippleSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="ripple-story">
		<Ripple {...args} class="ripple-story-layer">
			<Landscape />
		</Ripple>
	</div>
{/snippet}

{#snippet typeTemplate(args: Record<string, unknown>)}
	<div class="ripple-story">
		<Ripple {...args} class="ripple-story-layer">
			<Scene kind="type" animate={false} class="ripple-story-fill" />
		</Ripple>
	</div>
{/snippet}

{#snippet backdropTemplate(args: Record<string, unknown>)}
	<div class="ripple-story">
		<Scene kind="stripes" animate={false} class="ripple-story-fill ripple-story-center">
			<Ripple {...args} class="ripple-story-pane">
				<h2>Backdrop mode</h2>
				<p>What is behind this pane wobbles; the text on it doesn't.</p>
			</Ripple>
		</Scene>
	</div>
{/snippet}

<Story name="Water" {template} />

<Story name="Heat haze" args={{ ...ripplePresets['heat haze'] }} {template} />

<Story name="Underwater" args={{ ...ripplePresets.underwater }} {template} />

<Story name="On type" args={{ strength: 20 }} template={typeTemplate} />

<Story
	name="Backdrop (Chromium)"
	args={{ backdrop: true, strength: 30, tintOpacity: 0.2 }}
	template={backdropTemplate}
/>

<Story name="Still (no animation)" args={{ animate: false }} {template} />

<style>
	.ripple-story {
		block-size: 100dvh;
		overflow: hidden;
		background: oklch(14% 0.02 285);
	}

	/* Bleed past the frame so the wobbly edges stay out of view. */
	.ripple-story :global(.ripple-story-layer) {
		block-size: calc(100% + 40px);
		margin: -20px;
	}

	.ripple-story :global(.ripple-story-fill) {
		block-size: 100%;
	}

	.ripple-story :global(.ripple-story-center) {
		display: grid;
		place-items: center;
	}

	.ripple-story :global(.ripple-story-pane) {
		inline-size: min(26rem, 85vw);
		padding: var(--space-8);
		border: 1px solid oklch(100% 0 0 / 0.4);
		border-radius: var(--radius-lg);
		color: oklch(98% 0 0);
		text-shadow: 0 1px 3px oklch(0% 0 0 / 0.7);
	}
</style>
