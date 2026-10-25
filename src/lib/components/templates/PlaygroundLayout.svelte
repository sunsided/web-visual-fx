<!--
@component
Full-viewport stage with a floating control panel (docked to the bottom on narrow screens),
optionally followed by a long-form article that scrolls in below the stage.

DOM (and focus) order: header → stage → panel → article.

Tokens: `--playground-inset` (distance of the panel from the viewport edge).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** The effect being showcased; fills the viewport. */
		stage: Snippet;
		/** Usually a `ControlPanel`. */
		panel?: Snippet;
		/** Top-left overlay (title, navigation). */
		header?: Snippet;
		/** Content below the stage, e.g. an `Explainer`. */
		article?: Snippet;
		/** Accessible name of the stage region. */
		stageLabel?: string;
	}

	let { stage, panel, header, article, stageLabel = 'Demo' }: Props = $props();
</script>

<div class="playground">
	{#if header}
		<header class="header">{@render header()}</header>
	{/if}
	<main>
		<div class="screen">
			<section class="stage" aria-label={stageLabel}>
				{@render stage()}
			</section>
			{#if panel}
				<aside class="panel">{@render panel()}</aside>
			{/if}
		</div>
		{@render article?.()}
	</main>
</div>

<style>
	.playground {
		--_inset: var(--playground-inset, var(--space-4));

		position: relative;
	}

	.screen {
		position: relative;
		block-size: 100dvh;
		overflow: hidden;
	}

	.stage {
		position: absolute;
		inset: 0;
		display: grid;
	}

	.header {
		position: absolute;
		inset-block-start: var(--_inset);
		inset-inline-start: var(--_inset);
		z-index: var(--z-overlay);
	}

	.panel {
		position: absolute;
		inset-block: var(--_inset);
		inset-inline-end: var(--_inset);
		z-index: var(--z-panel);
		display: flex;
		align-items: flex-start;
		pointer-events: none;
	}

	.panel > :global(*) {
		pointer-events: auto;
	}

	@media (width < 40rem) {
		.panel {
			inset: auto var(--space-2) var(--space-2);
			align-items: flex-end;
		}

		.panel > :global(*) {
			--panel-width: 100%;
			max-block-size: 55dvh;
		}
	}
</style>
