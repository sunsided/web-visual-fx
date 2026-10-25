<!--
@component
Accessible on/off switch built on a native checkbox (`role="switch"`).

Tokens: `--switch-width`, `--switch-height`, `--switch-track`, `--switch-track-on`, `--switch-thumb`.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'checked'> {
		checked?: boolean;
	}

	let { checked = $bindable(false), class: className, ...rest }: Props = $props();
</script>

<input type="checkbox" role="switch" class={['switch', className]} bind:checked {...rest} />

<style>
	.switch {
		--_w: var(--switch-width, 2.25rem);
		--_h: var(--switch-height, 1.25rem);
		--_pad: 2px;

		appearance: none;
		position: relative;
		flex: none;
		inline-size: var(--_w);
		block-size: var(--_h);
		margin: 0;
		border-radius: var(--radius-full);
		background: var(--switch-track, var(--color-control));
		cursor: pointer;
		transition: background-color var(--duration-base) var(--ease-out);
	}

	.switch::before {
		content: '';
		position: absolute;
		inset-block-start: var(--_pad);
		inset-inline-start: var(--_pad);
		inline-size: calc(var(--_h) - 2 * var(--_pad));
		aspect-ratio: 1;
		border-radius: var(--radius-full);
		background: var(--switch-thumb, var(--color-surface-raised));
		box-shadow: var(--shadow-1);
		transition: translate var(--duration-base) var(--ease-spring);
	}

	.switch:checked {
		background: var(--switch-track-on, var(--color-accent));
	}

	.switch:checked::before {
		translate: calc(var(--_w) - var(--_h)) 0;
	}

	.switch:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
