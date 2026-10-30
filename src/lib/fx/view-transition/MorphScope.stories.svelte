<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import MorphScope from './MorphScope.svelte';
	import { morphDefaults, morphSchema, shuffled } from './view-transition.js';

	const { Story } = defineMeta({
		title: 'FX/View transition morph',
		component: MorphScope,
		tags: ['autodocs'],
		args: morphDefaults,
		argTypes: toArgTypes(morphSchema),
		parameters: { layout: 'fullscreen' }
	});

	const colors = ['#a78bfa', '#22d3ee', '#f472b6', '#4ade80', '#facc15', '#fb923c'];
</script>

<script lang="ts">
	let order = $state(colors.map((color, id) => ({ id, color })));
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="story">
		<MorphScope {...args} class="scope">
			{#snippet children({ morph, name })}
				<button type="button" onclick={() => morph(() => (order = shuffled(order)))}>
					Shuffle
				</button>
				<ul>
					{#each order as item (item.id)}
						<li
							style:background={item.color}
							style:view-transition-name={name('tile', item.id)}
							style:view-transition-class="vfx-morph"
						>
							{item.id + 1}
						</li>
					{/each}
				</ul>
			{/snippet}
		</MorphScope>
	</div>
{/snippet}

<Story name="Shuffle" {template} />

<Story name="Slow, linear" args={{ duration: 1200, easing: 'linear' }} {template} />

<style>
	.story {
		min-block-size: 100dvh;
		padding: 2rem;
		background: oklch(13% 0.02 285);
	}

	.story :global(.scope) {
		display: grid;
		gap: 1rem;
		justify-items: start;
	}

	ul {
		display: grid;
		grid-template-columns: repeat(3, 6rem);
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border-radius: 14px;
		color: #15131f;
		font-weight: 700;
	}

	button {
		padding: 0.5rem 1rem;
		border: 0;
		border-radius: 999px;
		background: #a78bfa;
		color: #15131f;
		font: inherit;
	}
</style>
