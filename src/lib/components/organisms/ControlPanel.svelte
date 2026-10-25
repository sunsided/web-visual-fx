<!--
@component
Floating, scrollable panel that hosts effect controls.
Collapses to its header; on narrow screens it docks to the bottom.

Tokens: `--panel-width`, `--panel-bg`, `--panel-blur`, `--panel-border`,
`--panel-padding`, `--panel-radius`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../atoms/Button.svelte';
	import CodeSnippet from '../molecules/CodeSnippet.svelte';

	interface Props {
		title: string;
		/** Generated markup shown in the footer, if any. */
		code?: string;
		open?: boolean;
		onreset?: () => void;
		class?: string;
		children: Snippet;
	}

	let {
		title,
		code,
		open = $bindable(true),
		onreset,
		class: className,
		children
	}: Props = $props();

	const bodyId = $props.id();
</script>

<section class={['panel', className, { collapsed: !open }]} aria-label="{title} controls">
	<header>
		<h2>{title}</h2>
		<div class="actions">
			{#if onreset}
				<Button size="sm" variant="ghost" onclick={onreset}>Reset</Button>
			{/if}
			<Button
				size="sm"
				variant="ghost"
				aria-expanded={open}
				aria-controls={bodyId}
				onclick={() => (open = !open)}
			>
				{open ? 'Hide' : 'Show'}
			</Button>
		</div>
	</header>

	<div class="body" id={bodyId} hidden={!open}>
		{@render children()}
		{#if code}
			<div class="code">
				<CodeSnippet {code} />
			</div>
		{/if}
	</div>
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		inline-size: var(--panel-width, 18rem);
		max-block-size: 100%;
		border: var(--panel-border, 1px solid var(--color-border));
		border-radius: var(--panel-radius);
		background: var(--panel-bg, var(--color-overlay));
		backdrop-filter: blur(var(--panel-blur, 24px)) saturate(1.4);
		box-shadow: var(--shadow-3);
		overflow: hidden;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-2) var(--space-2) var(--panel-padding);
		border-block-end: 1px solid var(--color-border);
	}

	.collapsed header {
		border-block-end: none;
	}

	h2 {
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
	}

	.actions {
		display: flex;
		gap: var(--space-1);
	}

	.body {
		display: grid;
		/* minmax(0, …): long content (e.g. the code snippet) scrolls itself instead of widening the panel */
		grid-template-columns: minmax(0, 1fr);
		gap: var(--panel-gap);
		padding: var(--panel-padding);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
	}

	.body[hidden] {
		display: none;
	}

	.code {
		border-block-start: 1px solid var(--color-border);
		padding-block-start: var(--space-3);
	}
</style>
