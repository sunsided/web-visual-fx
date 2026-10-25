<!--
@component
Labelled form row. `layout="stacked"` puts the control below the label (sliders),
`layout="inline"` puts it at the end of the row (switches, swatches).

Tokens: `--field-gap`, `--field-label-color`, `--field-value-color`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		/** Id of the control this label belongs to. */
		for: string;
		layout?: 'stacked' | 'inline';
		/** Optional readout shown at the end of the label row. */
		value?: string;
		description?: string;
		class?: string;
		children: Snippet;
	}

	let {
		label,
		for: htmlFor,
		layout = 'stacked',
		value,
		description,
		class: className,
		children
	}: Props = $props();
</script>

<div class={['field', layout, className]} title={description}>
	<div class="row">
		<label for={htmlFor}>{label}</label>
		{#if value !== undefined}
			<output for={htmlFor}>{value}</output>
		{/if}
		{#if layout === 'inline'}
			{@render children()}
		{/if}
	</div>
	{#if layout === 'stacked'}
		{@render children()}
	{/if}
</div>

<style>
	.field {
		display: grid;
		gap: var(--field-gap, var(--space-1));
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-block-size: var(--control-height-sm);
	}

	.stacked .row {
		min-block-size: auto;
	}

	label {
		color: var(--field-label-color, var(--color-text-muted));
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		cursor: pointer;
	}

	output {
		margin-inline-start: auto;
		color: var(--field-value-color, var(--color-text));
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		font-variant-numeric: tabular-nums;
	}
</style>
