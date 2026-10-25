<!--
@component
Monospace code block with a copy-to-clipboard button.

Tokens: `--code-bg`, `--code-fg`, `--code-max-height`.
-->
<script lang="ts">
	import Button from '../atoms/Button.svelte';

	interface Props {
		code: string;
		class?: string;
	}

	let { code, class: className }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1500);
	}
</script>

<div class={['snippet', className]}>
	<pre><code>{code}</code></pre>
	<Button size="sm" variant="ghost" class="copy" onclick={copy}>
		{copied ? 'Copied' : 'Copy'}
	</Button>
</div>

<style>
	.snippet {
		position: relative;
	}

	pre {
		margin: 0;
		max-block-size: var(--code-max-height, 12rem);
		overflow: auto;
		padding: var(--space-3);
		padding-inline-end: var(--space-16);
		border-radius: var(--radius-md);
		background: var(--code-bg, var(--color-surface-sunken));
		color: var(--code-fg, var(--color-text));
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		line-height: var(--leading-normal);
		tab-size: 2;
	}

	.snippet :global(.copy) {
		position: absolute;
		inset-block-start: var(--space-1);
		inset-inline-end: var(--space-1);
	}
</style>
