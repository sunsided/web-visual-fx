<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import ParallaxLayer from './ParallaxLayer.svelte';
	import ParallaxScene from './ParallaxScene.svelte';
	import ScrollProgress from './ScrollProgress.svelte';
	import ScrollReveal from './ScrollReveal.svelte';
	import { scrollRevealDefaults, scrollRevealSchema } from './scroll-reveal.js';

	const { Story } = defineMeta({
		title: 'FX/Scroll reveal',
		component: ScrollReveal,
		tags: ['autodocs'],
		args: scrollRevealDefaults,
		argTypes: toArgTypes(scrollRevealSchema),
		parameters: { layout: 'fullscreen' }
	});

	const cards = ['Slide', 'Flip', 'Scale', 'Clip', 'Blur', 'Span', 'Exit', 'Fallback'];
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="scroller">
		<ScrollProgress class="progress" />
		<p class="hint">Scroll down ↓</p>
		<div class="grid">
			{#each cards as card (card)}
				<ScrollReveal {...args} class="card">
					<h2>{card}</h2>
					<p>Driven by this element's position in the scroller, not by time.</p>
				</ScrollReveal>
			{/each}
		</div>
	</div>
{/snippet}

<Story name="Slide in from the right" {template} />

<Story name="Fade up" args={{ edge: 'bottom', distance: 48, span: 'entry' }} {template} />

<Story name="Flip in" args={{ preset: 'flip', edge: 'bottom' }} {template} />

<Story name="Scale" args={{ preset: 'scale', startScale: 0.7 }} {template} />

<Story name="Clip from the left" args={{ preset: 'clip', edge: 'left' }} {template} />

<Story name="Blur" args={{ preset: 'blur', blurRadius: 16 }} {template} />

<Story name="In and out while visible" args={{ span: 'visible', edge: 'left' }} {template} />

<Story
	name="Custom range, hide on exit"
	args={{ span: 'custom', exit: true, rangeStart: 10, rangeEnd: 70 }}
	{template}
/>

<Story name="Parallax layers">
	{#snippet template()}
		<div class="scroller">
			<p class="hint">Scroll down ↓</p>
			<ParallaxScene strength={480} class="scene">
				<ParallaxLayer depth={0.8} aria-hidden="true">
					<div class="layer sky"></div>
				</ParallaxLayer>
				<ParallaxLayer depth={0.4} aria-hidden="true">
					<div class="layer hills"></div>
				</ParallaxLayer>
				<ParallaxLayer depth={-0.3} fill={false}>
					<h2 class="title">Depth</h2>
				</ParallaxLayer>
			</ParallaxScene>
			<p class="hint">Keep going ↓</p>
		</div>
	{/snippet}
</Story>

<style>
	.scroller {
		block-size: 100dvh;
		overflow: hidden auto;
		padding: 0 2rem 30dvh;
		background: oklch(11% 0.015 285);
		color: #f3f1fa;
	}

	.scroller :global(.progress) {
		position: sticky;
		inset-block-start: 0;
		z-index: 1;
	}

	.hint {
		display: grid;
		place-items: center;
		min-block-size: 80dvh;
		color: #c4bfd6;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 1rem;
	}

	.grid :global(.card) {
		padding: 1.5rem;
		border: 1px solid oklch(100% 0 0 / 0.14);
		border-radius: 16px;
		background: #15131f;
	}

	.grid h2 {
		font-size: 1rem;
	}

	.grid p {
		color: #c4bfd6;
		font-size: 0.875rem;
	}

	.scroller :global(.scene) {
		display: grid;
		place-items: center;
		block-size: 70dvh;
		border-radius: 16px;
	}

	.layer {
		block-size: 100%;
	}

	.sky {
		background: linear-gradient(oklch(35% 0.12 285), oklch(55% 0.14 330));
	}

	.hills {
		background: radial-gradient(120% 60% at 30% 100%, oklch(25% 0.06 285) 60%, transparent 61%);
	}

	.title {
		font-size: 4rem;
	}
</style>
