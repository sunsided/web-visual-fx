<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RouteId } from '$app/types';
	import Button from '#lib/components/atoms/Button.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import EffectCard from '#lib/components/organisms/EffectCard.svelte';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import NoiseLayer from '#lib/fx/noise/NoiseLayer.svelte';
	import { effects } from '#lib/fx/registry.js';

	const repository = 'https://github.com/sunsided/web-visual-fx';
	const storybook = import.meta.env.DEV ? 'http://localhost:6006' : `${resolve('/')}storybook/`;

	let paused = $state(false);

	// Effect routes take no params, but past 25 routes TypeScript gives up matching the route union
	// against resolve()'s per-route argument tuples, so each one is passed as a param-less route.
	const href = (route: RouteId) => resolve(route as '/');
</script>

<svelte:head>
	<title>Visual FX playground</title>
	<meta name="description" content="Interactive playground for modern visual effects on the web." />
</svelte:head>

<!--
	Light, pastel aurora with dark ink on top. Pastels stay bright (L ≥ 85%), so dark text keeps
	a high contrast wherever the blobs drift; the cards are light frosted glass with dark text.
-->
<div class="motion" data-motion={paused ? 'paused' : 'running'}>
	<Scene
		kind="aurora"
		class="index"
		--scene-bg="oklch(97% 0.02 300)"
		--scene-a="oklch(86% 0.11 350)"
		--scene-b="oklch(87% 0.09 220)"
		--scene-c="oklch(93% 0.11 95)"
		--scene-blob-opacity="0.9"
	>
		<NoiseLayer opacity={0.25} blendMode="soft-light" />
		<main class="content" data-theme="light">
			<a class="github" href={repository} aria-label="Source on GitHub">
				<!-- Octicons mark-github -->
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path
						d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
					/>
				</svg>
			</a>
			<header>
				<p class="eyebrow">Playground</p>
				<h1>Visual effects <span class="accent">for the web</span></h1>
				<p class="lede">
					Modern CSS and SVG techniques, built as tokenized, fully configurable Svelte components.
					Pick an effect and play with every knob.
				</p>
				<div class="links">
					<Button href={storybook} variant="solid">Component library</Button>
					<MotionToggle bind:paused />
				</div>
			</header>

			<ul class="effects">
				{#each effects as effect (effect.route)}
					<li>
						<EffectCard
							href={href(effect.route)}
							title={effect.title}
							summary={effect.summary}
							techniques={effect.techniques}
							preview={effect.preview}
						/>
					</li>
				{/each}
			</ul>
		</main>
	</Scene>
</div>

<style>
	:global(.index) {
		min-block-size: 100dvh;
	}

	.content {
		--ink: oklch(22% 0.04 285);

		position: relative;
		display: grid;
		gap: var(--space-12);
		max-inline-size: 72rem;
		margin-inline: auto;
		padding: clamp(var(--space-6), 8vw, var(--space-16)) var(--space-6);
		color: var(--ink);
	}

	.github {
		position: absolute;
		inset: var(--space-4) var(--space-4) auto auto;
		display: grid;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border-radius: 50%;
		color: var(--ink);
		transition: background-color 150ms ease;
	}

	.github:hover {
		background-color: color-mix(in oklch, var(--ink) 8%, transparent);
	}

	.github svg {
		inline-size: 1.75rem;
		block-size: 1.75rem;
		fill: currentColor;
	}

	.eyebrow {
		color: var(--color-accent-text);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	h1 {
		max-inline-size: 12ch;
		margin-block: var(--space-2) var(--space-4);
		font-size: clamp(var(--text-2xl), 7vw, 5.5rem);
		font-weight: var(--weight-bold);
		line-height: 0.95;
	}

	/* Both gradient ends stay dark enough for large text (≥ 3:1) on the pastels. */
	.accent {
		background: linear-gradient(90deg, oklch(48% 0.22 290), oklch(52% 0.22 345));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.lede {
		max-inline-size: 36rem;
		color: color-mix(in oklch, var(--ink) 85%, transparent);
		font-size: var(--text-lg);
	}

	.motion {
		display: contents;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-block-start: var(--space-6);
	}

	.effects {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
		gap: var(--space-6);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@media (forced-colors: active) {
		.accent {
			color: CanvasText;
		}
	}
</style>
