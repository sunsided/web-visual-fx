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

	let status = $state<'idle' | 'copied' | 'failed'>('idle');
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			// navigator.clipboard is missing on insecure origins (e.g. a dev server via LAN IP)
			await navigator.clipboard.writeText(code);
			status = 'copied';
		} catch {
			status = 'failed';
		}
		clearTimeout(timer);
		timer = setTimeout(() => (status = 'idle'), 2000);
	}

	const labels = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' };
	const announcements = {
		idle: '',
		copied: 'Code copied to clipboard.',
		failed: 'Copying failed.'
	};
</script>

<div class={['snippet', className]}>
	<pre><code>{code}</code></pre>
	<Button size="sm" variant="ghost" class="copy" onclick={copy}>{labels[status]}</Button>
	<span class="visually-hidden" role="status">{announcements[status]}</span>
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
