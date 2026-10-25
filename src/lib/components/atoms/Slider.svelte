<!--
@component
Native range input with a filled track.

Tokens: `--slider-track-height`, `--slider-track`, `--slider-fill`,
`--slider-thumb-size`, `--slider-thumb`, `--slider-thumb-border`.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'value'> {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
	}

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		class: className,
		...rest
	}: Props = $props();

	let progress = $derived(max === min ? 0 : ((value - min) / (max - min)) * 100);
</script>

<input
	type="range"
	class={['slider', className]}
	bind:value
	{min}
	{max}
	{step}
	style:--progress="{progress}%"
	{...rest}
/>

<style>
	.slider {
		--_track-h: var(--slider-track-height, 4px);
		--_thumb: var(--slider-thumb-size, 14px);
		--_fill: var(--slider-fill, var(--color-accent));
		--_track: var(--slider-track, var(--color-control));

		appearance: none;
		inline-size: 100%;
		block-size: var(--_thumb);
		margin: 0;
		background: transparent;
		cursor: pointer;
		border-radius: var(--radius-full);
	}

	.slider:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.slider::-webkit-slider-runnable-track {
		block-size: var(--_track-h);
		border-radius: var(--radius-full);
		background: linear-gradient(
			to right,
			var(--_fill) var(--progress),
			var(--_track) var(--progress)
		);
	}

	.slider::-moz-range-track {
		block-size: var(--_track-h);
		border-radius: var(--radius-full);
		background: var(--_track);
	}

	.slider::-moz-range-progress {
		block-size: var(--_track-h);
		border-radius: var(--radius-full);
		background: var(--_fill);
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		inline-size: var(--_thumb);
		block-size: var(--_thumb);
		margin-block-start: calc((var(--_track-h) - var(--_thumb)) / 2);
		border-radius: var(--radius-full);
		background: var(--slider-thumb, var(--color-surface-raised));
		border: var(--slider-thumb-border, 2px solid var(--_fill));
		box-shadow: var(--shadow-1);
		transition: scale var(--duration-fast) var(--ease-out);
	}

	.slider::-moz-range-thumb {
		inline-size: var(--_thumb);
		block-size: var(--_thumb);
		border-radius: var(--radius-full);
		background: var(--slider-thumb, var(--color-surface-raised));
		border: var(--slider-thumb-border, 2px solid var(--_fill));
		box-shadow: var(--shadow-1);
		box-sizing: border-box;
		transition: scale var(--duration-fast) var(--ease-out);
	}

	.slider:active::-webkit-slider-thumb {
		scale: 1.2;
	}

	.slider:active::-moz-range-thumb {
		scale: 1.2;
	}
</style>
