<!--
@component
Compact title chip with a back link (and optional "how it works" link), floating over a
playground stage.
-->
<script lang="ts">
	import Button from '../atoms/Button.svelte';

	interface Props {
		title: string;
		backHref?: string;
		backLabel?: string;
		/** Link to an explanation, typically an in-page anchor like `#how-it-works`. */
		infoHref?: string;
		infoLabel?: string;
	}

	let {
		title,
		backHref,
		backLabel = 'All effects',
		infoHref,
		infoLabel = 'How it works'
	}: Props = $props();
</script>

<nav class="stage-header" aria-label="Page">
	{#if backHref}
		<Button href={backHref} size="sm" variant="ghost" aria-label={backLabel}>←</Button>
	{/if}
	<h1>{title}</h1>
	{#if infoHref}
		<Button href={infoHref} size="sm" variant="ghost" class="info">{infoLabel} ↓</Button>
	{/if}
</nav>

<style>
	.stage-header {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-4) var(--space-1) var(--space-1);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-overlay);
		backdrop-filter: blur(16px);
		box-shadow: var(--shadow-2);
	}

	.stage-header:has(:global(.info)) {
		padding-inline-end: var(--space-1);
	}

	.stage-header :global(.button) {
		--button-radius: var(--radius-full);
	}

	.stage-header :global(.info) {
		margin-inline-start: var(--space-2);
	}

	h1 {
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
	}
</style>
