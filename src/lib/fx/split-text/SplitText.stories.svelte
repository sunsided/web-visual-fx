<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import SplitText from './SplitText.svelte';
	import Stagger from './Stagger.svelte';
	import { splitTextDefaults, splitTextSchema } from './split-text.js';

	const { Story } = defineMeta({
		title: 'FX/Split text',
		component: SplitText,
		tags: ['autodocs'],
		args: { ...splitTextDefaults, text: 'Letters arrive one by one' },
		argTypes: toArgTypes(splitTextSchema),
		parameters: { layout: 'fullscreen' }
	});

	const items = ['Design tokens', 'Components', 'Effects', 'Documentation', 'Release'];
</script>

<script lang="ts">
	let run = $state(0);
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="split-story">
		<SplitText {...args} text={String(args.text)} as="h1" replay={run} />
		<button type="button" onclick={() => run++}>Replay</button>
	</div>
{/snippet}

{#snippet list(args: Record<string, unknown>)}
	<div class="split-story">
		<Stagger {...args} replay={run} class="story-list">
			{#each items as item (item)}
				<li>{item}</li>
			{/each}
		</Stagger>
		<button type="button" onclick={() => run++}>Replay</button>
	</div>
{/snippet}

<Story name="Characters" {template} />

<Story
	name="Words, from the center"
	args={{ split: 'words', order: 'center', stagger: 90 }}
	{template}
/>

<Story
	name="Drop and spin"
	args={{ distance: -40, rotate: -20, blur: 0, bounce: 0.6, stagger: 50 }}
	{template}
/>

<Story name="Inline index fallback" args={{ index: 'inline' }} {template} />

<Story name="List" args={{ distance: 16, blur: 0 }} template={list} />

<style>
	.split-story {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 2rem;
		padding: 3rem;
		min-block-size: 100dvh;
		background: oklch(15% 0.03 290);
		color: oklch(96% 0.01 290);
		font-size: clamp(1rem, 2vw, 1.25rem);
	}

	.split-story button {
		padding: 0.5rem 1rem;
		border: 1px solid oklch(100% 0 0 / 0.2);
		border-radius: 999px;
		background: oklch(26% 0.04 290);
		color: inherit;
		font: inherit;
	}

	.split-story :global(h1) {
		font-size: clamp(2rem, 6vw, 4rem);
		text-align: center;
	}

	.split-story :global(.story-list) {
		display: grid;
		gap: 0.5rem;
		padding: 0;
		list-style: none;
	}

	.split-story :global(.story-list li) {
		padding: 0.75rem 1.25rem;
		border-radius: 12px;
		background: oklch(24% 0.04 290);
	}
</style>
