<!--
@component
Collapsible group of controls (`<details>`), used to section a control panel.

Tokens: `--control-group-gap`, `--control-group-title-color`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		open?: boolean;
		class?: string;
		children: Snippet;
	}

	let { title, open = $bindable(true), class: className, children }: Props = $props();
</script>

<details class={['group', className]} bind:open>
	<summary>{title}</summary>
	<div class="body">
		{@render children()}
	</div>
</details>

<style>
	.group {
		border-block-start: 1px solid var(--color-border);
		padding-block: var(--space-3);
	}

	.group:first-of-type {
		border-block-start: none;
		padding-block-start: 0;
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: var(--control-group-title-color, var(--color-text-subtle));
		font-size: var(--text-2xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		list-style: none;
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::after {
		content: '';
		inline-size: 0.4rem;
		aspect-ratio: 1;
		border-inline-end: 1.5px solid currentColor;
		border-block-end: 1.5px solid currentColor;
		rotate: -45deg;
		transition: rotate var(--duration-base) var(--ease-out);
	}

	.group[open] summary::after {
		rotate: 45deg;
	}

	.body {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--control-group-gap, var(--space-3));
		padding-block-start: var(--space-3);
	}
</style>
