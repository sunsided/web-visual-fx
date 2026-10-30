<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Shimmer from './Shimmer.svelte';
	import Skeleton from './Skeleton.svelte';
	import { presetOptions, shimmerDefaults, shimmerSchema } from './shimmer.js';

	const { Story } = defineMeta({
		title: 'FX/Shimmer',
		component: Shimmer,
		tags: ['autodocs'],
		args: shimmerDefaults,
		argTypes: toArgTypes(shimmerSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet button(args: Record<string, unknown>)}
	<div class="shimmer-story">
		<Shimmer {...args} class="story-button">
			<button type="button">Upgrade to Pro</button>
		</Shimmer>
	</div>
{/snippet}

{#snippet skeleton(args: Record<string, unknown>)}
	<div class="shimmer-story">
		<div class="story-card" role="status">
			<span class="visually-hidden">Loading profile…</span>
			<Shimmer {...args}>
				<Skeleton />
			</Shimmer>
		</div>
	</div>
{/snippet}

{#snippet headline(args: Record<string, unknown>)}
	<div class="shimmer-story">
		<Shimmer {...args} as="h1" class="story-headline">Shiny new things</Shimmer>
	</div>
{/snippet}

<Story name="Shiny button" args={presetOptions('button')} template={button} />

<Story name="Skeleton loader" args={presetOptions('skeleton')} template={skeleton} />

<Story name="Shiny text" args={presetOptions('text')} template={headline} />

<Story name="Slide to unlock" args={presetOptions('unlock')} template={headline} />

<Story
	name="Sheen on hover"
	args={{ ...presetOptions('button'), trigger: 'hover', pause: 0 }}
	template={button}
/>

<style>
	.shimmer-story {
		display: grid;
		place-items: center;
		padding: 3rem;
		min-block-size: 100dvh;
		background: oklch(16% 0.02 265);
		color: oklch(94% 0.01 265);
	}

	.shimmer-story :global(.story-button) {
		border-radius: 999px;
	}

	.shimmer-story button {
		padding: 0.875rem 1.75rem;
		border: 0;
		border-radius: 999px;
		background: linear-gradient(135deg, #7c3aed, #db2777);
		color: white;
		font: inherit;
		font-weight: 600;
	}

	.story-card {
		inline-size: min(100%, 22rem);
		padding: 1.5rem;
		border-radius: 16px;
		background: oklch(22% 0.02 265);
	}

	.shimmer-story :global(.story-headline) {
		font-size: clamp(2rem, 6vw, 4rem);
	}
</style>
