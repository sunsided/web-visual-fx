<!--
@component
Long-form "how it works" article with prose typography for headings, paragraphs, lists,
inline `code`, definition lists and `CodeSnippet`s. Content is passed as children.

Tokens: `--explainer-width`, `--explainer-bg`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Anchor id, so the article can be linked to (e.g. from `StageHeader`'s `infoHref`). */
		id?: string;
		/** Short summary shown under the title. */
		lede?: string;
		class?: string;
		children: Snippet;
	}

	let { title, id = 'how-it-works', lede, class: className, children }: Props = $props();

	const headingId = $props.id();
</script>

<article {id} class={['explainer', className]} aria-labelledby={headingId}>
	<div class="inner">
		<p class="eyebrow">How it works</p>
		<h2 id={headingId}>{title}</h2>
		{#if lede}
			<p class="lede">{lede}</p>
		{/if}
		{@render children()}
		<p class="top"><a href="#top">Back to the demo ↑</a></p>
	</div>
</article>

<style>
	.explainer {
		background: var(--explainer-bg, var(--color-surface));
		border-block-start: 1px solid var(--color-border);
		scroll-margin-block-start: var(--space-4);
	}

	.inner {
		max-inline-size: var(--explainer-width, 44rem);
		margin-inline: auto;
		padding: var(--space-16) var(--space-6);
	}

	.eyebrow {
		color: var(--color-accent);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	h2 {
		margin-block: var(--space-2) var(--space-4);
		font-size: var(--text-2xl);
	}

	.lede {
		color: var(--color-text-muted);
		font-size: var(--text-lg);
	}

	.inner :global {
		h3 {
			margin-block: var(--space-12) var(--space-3);
			font-size: var(--text-lg);
		}

		p,
		ul,
		ol,
		dl {
			margin-block: 0 var(--space-4);
		}

		ul,
		ol {
			padding-inline-start: var(--space-6);
		}

		li + li {
			margin-block-start: var(--space-2);
		}

		code {
			padding: 0.1em 0.35em;
			border-radius: var(--radius-sm);
			background: var(--color-surface-sunken);
			font-family: var(--font-mono);
			font-size: 0.875em;
		}

		pre code {
			padding: 0;
			background: none;
			font-size: inherit;
		}

		.snippet {
			margin-block: var(--space-4) var(--space-6);
			--code-max-height: none;
		}

		dl {
			display: grid;
			grid-template-columns: max-content 1fr;
			gap: var(--space-2) var(--space-4);
		}

		dt {
			font-family: var(--font-mono);
			font-size: var(--text-sm);
			font-weight: var(--weight-semibold);
		}

		dd {
			margin: 0;
			color: var(--color-text-muted);
		}

		.note {
			padding: var(--space-3) var(--space-4);
			border-inline-start: 3px solid var(--color-accent);
			border-radius: var(--radius-sm);
			background: var(--color-accent-subtle);
		}
	}

	.top {
		margin-block-start: var(--space-12);
		font-size: var(--text-sm);
	}

	@media (width < 40rem) {
		.inner :global(dl) {
			grid-template-columns: 1fr;
		}

		.inner :global(dd) {
			margin-block-end: var(--space-2);
		}
	}
</style>
