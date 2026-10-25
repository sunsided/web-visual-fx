<!--
@component
Button (or link, when `href` is set).

Tokens: `--button-height`, `--button-bg`, `--button-fg`, `--button-bg-hover`, `--button-radius`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'solid' | 'soft' | 'ghost';
	type Size = 'sm' | 'md';

	type Props = { variant?: Variant; size?: Size; children: Snippet } & (
		({ href: string } & HTMLAnchorAttributes) | ({ href?: undefined } & HTMLButtonAttributes)
	);

	let { variant = 'soft', size = 'md', class: className, children, ...rest }: Props = $props();
</script>

{#if rest.href !== undefined}
	<a class={['button', variant, size, className]} {...rest as HTMLAnchorAttributes}>
		{@render children()}
	</a>
{:else}
	<button
		type="button"
		class={['button', variant, size, className]}
		{...rest as HTMLButtonAttributes}
	>
		{@render children()}
	</button>
{/if}

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		block-size: var(--button-height, var(--_h, var(--control-height-md)));
		padding-inline: var(--space-4);
		border: 1px solid transparent;
		border-radius: var(--button-radius, var(--control-radius));
		background: var(--button-bg, var(--_bg));
		color: var(--button-fg, var(--_fg));
		font-size: var(--control-font-size);
		font-weight: var(--weight-medium);
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color var(--duration-fast) var(--ease-out),
			scale var(--duration-fast) var(--ease-out);
	}

	.button:hover {
		background: var(--button-bg-hover, var(--_bg-hover));
	}

	.button:active {
		scale: 0.97;
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sm {
		--_h: var(--control-height-sm);
		padding-inline: var(--space-3);
		font-size: var(--text-xs);
	}

	.solid {
		--_bg: var(--color-accent-solid);
		--_bg-hover: var(--color-accent-solid-hover);
		--_fg: var(--color-on-accent);
	}

	.soft {
		--_bg: var(--color-control);
		--_bg-hover: var(--color-control-hover);
		--_fg: var(--color-text);
	}

	.ghost {
		--_bg: transparent;
		--_bg-hover: var(--color-control);
		--_fg: var(--color-text);
	}
</style>
