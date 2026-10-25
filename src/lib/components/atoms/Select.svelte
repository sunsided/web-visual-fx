<!--
@component
Native select with token-driven styling.

Tokens: `--select-height`, `--select-bg`, `--select-border`, `--select-radius`.
-->
<script lang="ts" generics="T extends string">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLSelectAttributes, 'value'> {
		value?: T;
		options: readonly T[];
		/** Optional display labels per option value. */
		labels?: Partial<Record<T, string>>;
	}

	let { value = $bindable(), options, labels, class: className, ...rest }: Props = $props();
</script>

<select class={['select', className]} bind:value {...rest}>
	{#each options as option (option)}
		<option value={option}>{labels?.[option] ?? option}</option>
	{/each}
</select>

<style>
	.select {
		appearance: none;
		inline-size: 100%;
		block-size: var(--select-height, var(--control-height-sm));
		padding-inline: var(--space-2) var(--space-6);
		border: 1px solid var(--select-border, var(--color-border));
		border-radius: var(--select-radius, var(--control-radius));
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")
				no-repeat right var(--space-2) center / 0.625rem,
			var(--select-bg, var(--color-surface-sunken));
		font-size: var(--control-font-size);
		cursor: pointer;
	}

	.select:hover {
		border-color: var(--color-border-strong);
	}
</style>
