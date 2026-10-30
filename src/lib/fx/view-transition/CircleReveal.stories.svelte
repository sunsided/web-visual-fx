<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import CircleReveal from './CircleReveal.svelte';
	import { circleRevealDefaults, circleRevealSchema } from './view-transition.js';

	const { Story } = defineMeta({
		title: 'FX/View transition reveal',
		component: CircleReveal,
		tags: ['autodocs'],
		args: circleRevealDefaults,
		argTypes: toArgTypes(circleRevealSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

<script lang="ts">
	let theme = $state<'light' | 'dark'>('light');
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="story">
		<CircleReveal {...args} data-theme={theme} class="box">
			{#snippet children({ reveal })}
				<h2>Appearance</h2>
				<p>The new theme is uncovered by a circle growing from the button.</p>
				<button
					type="button"
					aria-pressed={theme === 'dark'}
					onclick={(e) => reveal(() => (theme = theme === 'dark' ? 'light' : 'dark'), e)}
				>
					Dark mode
				</button>
			{/snippet}
		</CircleReveal>
	</div>
{/snippet}

<Story name="From the pointer" {template} />

<Story name="From the center, slow" args={{ origin: 'center', duration: 1400 }} {template} />

<Story name="Document-wide" args={{ scoped: false }} {template} />

<style>
	.story {
		display: grid;
		place-items: center;
		min-block-size: 100dvh;
		padding: 2rem;
		background: oklch(13% 0.02 285);
	}

	.story :global(.box) {
		display: grid;
		gap: 1rem;
		justify-items: start;
		inline-size: min(100%, 28rem);
		padding: 2rem;
		border-radius: 20px;
		background: var(--color-surface);
		color: var(--color-text);
	}

	button {
		padding: 0.5rem 1rem;
		border: 0;
		border-radius: 999px;
		background: var(--color-accent-solid);
		color: var(--color-on-accent);
		font: inherit;
	}
</style>
