<!--
@component
Round color swatch wrapping a native color picker.

Tokens: `--color-input-size`, `--color-input-border`.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'value'> {
		/** Hex color, `#rrggbb`. */
		value?: string;
	}

	let { value = $bindable('#000000'), class: className, ...rest }: Props = $props();
</script>

<input type="color" class={['color-input', className]} bind:value {...rest} />

<style>
	.color-input {
		appearance: none;
		flex: none;
		inline-size: var(--color-input-size, 1.5rem);
		block-size: var(--color-input-size, 1.5rem);
		padding: 0;
		border: var(--color-input-border, 2px solid var(--color-control-border));
		border-radius: var(--radius-full);
		background: none;
		cursor: pointer;
		overflow: hidden;
	}

	.color-input::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.color-input::-webkit-color-swatch {
		border: none;
		border-radius: var(--radius-full);
	}

	.color-input::-moz-color-swatch {
		border: none;
		border-radius: var(--radius-full);
	}

	/* The swatch *is* the information; keep its real color in forced-colors mode. */
	@media (forced-colors: active) {
		.color-input {
			forced-color-adjust: none;
			border-color: CanvasText;
		}
	}
</style>
