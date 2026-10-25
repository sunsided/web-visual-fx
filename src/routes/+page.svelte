<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import GlassPanel from '#lib/fx/glass/GlassPanel.svelte';
	import NoiseLayer from '#lib/fx/noise/NoiseLayer.svelte';
	import { effects } from '#lib/fx/registry.js';

	const storybook = import.meta.env.DEV ? 'http://localhost:6006' : `${resolve('/')}storybook/`;
</script>

<svelte:head>
	<title>Visual FX playground</title>
	<meta name="description" content="Interactive playground for modern visual effects on the web." />
</svelte:head>

<!-- Muted blob colors + a scrim on the text side keep copy above 4.5:1 without losing the glow. -->
<Scene
	kind="aurora"
	class="index"
	--scene-a="oklch(52% 0.2 340)"
	--scene-b="oklch(55% 0.15 225)"
	--scene-c="oklch(62% 0.14 75)"
	--scene-blob-opacity="0.75"
	--scene-scrim="linear-gradient(100deg, oklch(14% 0.04 285 / 0.75) 0%, oklch(14% 0.04 285 / 0.45) 55%, oklch(14% 0.04 285 / 0.1) 100%)"
>
	<NoiseLayer opacity={0.2} blendMode="overlay" />
	<div class="content" data-theme="dark">
		<header>
			<p class="eyebrow">Playground</p>
			<h1>Visual effects<br />for the web</h1>
			<p class="lede">
				Modern CSS and SVG techniques, built as tokenized, fully configurable Svelte components.
				Every knob is exposed.
			</p>
			<div class="links">
				<Button href={storybook} variant="solid">Component library</Button>
			</div>
		</header>

		<ul class="effects">
			{#each effects as effect (effect.route)}
				<li>
					<a href={resolve(effect.route)}>
						<GlassPanel
							radius={24}
							blur={18}
							distortion={24}
							tint="#0d0a1f"
							tintOpacity={0.5}
							class="card"
						>
							<h2>{effect.title}</h2>
							<p>{effect.summary}</p>
							<ul class="tags">
								{#each effect.techniques as technique (technique)}
									<li>{technique}</li>
								{/each}
							</ul>
						</GlassPanel>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</Scene>

<style>
	:global(.index) {
		min-block-size: 100dvh;
	}

	.content {
		position: relative;
		display: grid;
		gap: var(--space-12);
		max-inline-size: 72rem;
		margin-inline: auto;
		padding: clamp(var(--space-6), 8vw, var(--space-16)) var(--space-6);
		color: var(--color-text);
	}

	.eyebrow {
		color: oklch(100% 0 0 / 0.8);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	h1 {
		margin-block: var(--space-2) var(--space-4);
		font-size: clamp(var(--text-2xl), 7vw, 5.5rem);
		font-weight: var(--weight-bold);
		line-height: 0.95;
	}

	.lede {
		max-inline-size: 36rem;
		color: oklch(100% 0 0 / 0.9);
		font-size: var(--text-lg);
	}

	.links {
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

	.effects > li > a {
		display: block;
		block-size: 100%;
		border-radius: 24px;
		text-decoration: none;
		transition: translate var(--duration-base) var(--ease-out);
	}

	.effects > li > a:hover {
		translate: 0 -4px;
	}

	.effects :global(.card) {
		block-size: 100%;
		--glass-padding: var(--space-6);
	}

	h2 {
		margin-block-end: var(--space-2);
		font-size: var(--text-xl);
	}

	.effects p {
		color: oklch(100% 0 0 / 0.88);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: var(--space-4) 0 0;
		padding: 0;
		list-style: none;
	}

	.tags li {
		padding: var(--space-px) var(--space-2);
		border-radius: var(--radius-full);
		background: oklch(100% 0 0 / 0.1);
		color: oklch(100% 0 0 / 0.9);
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
	}
</style>
