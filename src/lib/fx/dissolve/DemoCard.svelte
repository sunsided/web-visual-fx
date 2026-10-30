<!--
@component
Sample content for the dissolve demos: a small article card on warm paper. Purely presentational;
`onclose` wires up its dismiss button.
-->
<script lang="ts">
	interface Props {
		onclose?: () => void;
	}

	let { onclose }: Props = $props();
</script>

<article class="card">
	<header>
		<span class="badge">Draft</span>
		{#if onclose}
			<button class="close" type="button" aria-label="Dismiss card" onclick={onclose}>×</button>
		{/if}
	</header>
	<h2>Letters from the archive</h2>
	<p>
		A box of old letters, typed on onionskin paper, turned up in the basement. Most are about the
		weather. One of them is not.
	</p>
	<footer>
		<span>Updated 2 min ago</span>
		<span class="action">Open</span>
	</footer>
</article>

<style>
	.card {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: oklch(97% 0.015 85);
		color: oklch(25% 0.03 60);
	}

	header,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-block-size: 2rem;
	}

	h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: var(--text-2xl);
	}

	p {
		line-height: 1.6;
	}

	footer {
		padding-block-start: var(--space-3);
		border-block-start: 1px solid oklch(85% 0.02 70);
		font-size: var(--text-sm);
		color: oklch(45% 0.03 60);
	}

	.badge {
		padding: 0.15em 0.6em;
		border-radius: var(--radius-full);
		background: oklch(88% 0.08 70);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.close {
		inline-size: 2rem;
		block-size: 2rem;
		border: 0;
		border-radius: var(--radius-full);
		background: transparent;
		font-size: 1.25rem;
		cursor: pointer;
	}

	.close:hover {
		background: oklch(90% 0.02 70);
	}

	.action {
		font-weight: 600;
		color: oklch(45% 0.15 40);
	}
</style>
