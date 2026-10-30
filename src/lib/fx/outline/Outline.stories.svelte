<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Outline from './Outline.svelte';
	import StickerArt from './StickerArt.svelte';
	import { outlineDefaults, outlineSchema } from './outline.js';

	const { Story } = defineMeta({
		title: 'FX/Outline',
		component: Outline,
		tags: ['autodocs'],
		args: outlineDefaults,
		argTypes: toArgTypes(outlineSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet rocket(args: Record<string, unknown>)}
	<div class="stage">
		<Outline {...args} style="inline-size: min(70vmin, 28rem); aspect-ratio: 1;">
			<StickerArt />
		</Outline>
	</div>
{/snippet}

{#snippet icons(args: Record<string, unknown>)}
	<div class="stage">
		<Outline {...args} style="inline-size: min(90vw, 40rem); aspect-ratio: 16 / 5;">
			<StickerArt kind="icons" />
		</Outline>
	</div>
{/snippet}

{#snippet text(args: Record<string, unknown>)}
	<div class="stage">
		<Outline {...args}>
			<p class="text">Stick it!</p>
		</Outline>
	</div>
{/snippet}

<Story name="Die-cut sticker" template={rocket} />

<Story name="Merged sticker" args={{ width: 18, roundness: 1, ringWidth: 3 }} template={rocket} />

<Story
	name="Ink stroke"
	args={{ width: 3, color: '#120e26', roundness: 0, ring: false, shadow: false }}
	template={icons}
/>

<Story
	name="Text sticker"
	args={{ width: 6, color: '#fffbe8', ringColor: '#ff5a7a', ringWidth: 4, shadowY: 8 }}
	template={text}
/>

<style>
	.stage {
		display: grid;
		place-items: center;
		min-block-size: 100dvh;
		padding: 2rem;
		background: #3b3270;
	}

	.text {
		margin: 0;
		font: 900 clamp(3rem, 12vw, 7rem) / 1 var(--font-sans);
		color: #6c4cff;
		rotate: -6deg;
	}
</style>
