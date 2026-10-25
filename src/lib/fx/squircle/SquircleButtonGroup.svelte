<!--
@component
Connected toggle-button group in the style of Material 3 Expressive. Buttons rest as pills; the
hovered, focused or pressed one grows (`flex-grow`) and morphs its corners to `activeShape` at
`activeRadius`, while its neighbors stay pills. Selected buttons (`aria-pressed`) keep the
active shape and show a check mark, so the state doesn't rely on color alone.

Hover only expands on devices that can hover; touch gets the press and selection morphs.
Without `corner-shape` support only the radius morphs. Transitions are instant under
`prefers-reduced-motion: reduce`.

Tokens: `--button-group-height`, `--button-group-bg`, `--button-group-fg`,
`--button-group-selected-bg`, `--button-group-selected-fg`.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		buttonGroupDefaults as d,
		cornerShapeCss,
		easingCss,
		type ButtonGroupOptions
	} from './squircle.js';

	interface Item {
		value: string;
		label: string;
	}

	type Props = Partial<ButtonGroupOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof ButtonGroupOptions> & {
			items: Item[];
			/** Values of the pressed buttons. */
			selected?: string[];
			/** Accessible name of the group. */
			label: string;
		};

	let {
		items,
		selected = $bindable([]),
		label,
		activeShape = d.activeShape,
		activeK = d.activeK,
		activeRadius = d.activeRadius,
		expand = d.expand,
		gap = d.gap,
		multiple = d.multiple,
		duration = d.duration,
		easing = d.easing,
		bounce = d.bounce,
		class: className,
		...rest
	}: Props = $props();

	// No transitions until the first settled frame, so nothing morphs while the page loads.
	let ready = $state(false);
	onMount(() => {
		let frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(() => (ready = true));
		});
		return () => cancelAnimationFrame(frame);
	});

	function toggle(value: string) {
		const on = selected.includes(value);
		if (multiple) selected = on ? selected.filter((v) => v !== value) : [...selected, value];
		else selected = on ? [] : [value];
	}
</script>

<div
	role="group"
	aria-label={label}
	class={['button-group', { ready }, className]}
	style:--_gap="{gap}px"
	style:--_grow={1 + expand}
	style:--_grow-pressed={1 + expand * 1.5}
	style:--_radius="{activeRadius}px"
	style:--_shape={cornerShapeCss(activeShape, activeK)}
	style:--_duration="{duration}ms"
	style:--_easing={easingCss(easing, bounce)}
	{...rest}
>
	{#each items as item (item.value)}
		<button
			type="button"
			aria-pressed={selected.includes(item.value)}
			onclick={() => toggle(item.value)}
		>
			<span class="check" aria-hidden="true">✓</span>
			{item.label}
		</button>
	{/each}
</div>

<style>
	.button-group {
		--_h: var(--button-group-height, 3rem);

		display: flex;
		gap: var(--_gap);
	}

	button {
		flex: 1 1 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		min-inline-size: max-content;
		block-size: var(--_h);
		padding-inline: var(--space-4);
		border: none;
		/* Resting: a pill. An exact half height (not 9999px) so the radius animates without delay. */
		border-radius: calc(var(--_h) / 2);
		corner-shape: round;
		background: var(--button-group-bg, var(--color-control));
		color: var(--button-group-fg, var(--color-text));
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		touch-action: manipulation;
	}

	.ready button {
		transition-property: flex-grow, border-radius, corner-shape, background-color, color;
		transition-duration: var(--_duration);
		transition-timing-function: var(--_easing);
	}

	.check {
		display: none;
	}

	[aria-pressed='true'] {
		border-radius: var(--_radius);
		corner-shape: var(--_shape);
		background: var(--button-group-selected-bg, var(--color-accent-solid));
		color: var(--button-group-selected-fg, var(--color-on-accent));
	}

	[aria-pressed='true'] .check {
		display: inline;
	}

	button:focus-visible {
		flex-grow: var(--_grow);
		border-radius: var(--_radius);
		corner-shape: var(--_shape);
	}

	@media (hover: hover) {
		button:hover {
			flex-grow: var(--_grow);
			border-radius: var(--_radius);
			corner-shape: var(--_shape);
		}

		button:not([aria-pressed='true']):hover {
			background: var(--button-group-bg-hover, var(--color-control-hover));
		}
	}

	/* Pressed: squish further, with half the radius. */
	button:active {
		flex-grow: var(--_grow-pressed);
		border-radius: calc(var(--_radius) / 2);
		corner-shape: var(--_shape);
	}

	@media (prefers-reduced-motion: reduce) {
		.ready button {
			transition-duration: 0s;
		}
	}

	/* Forced colors drop backgrounds: draw the outline and mark selection with system colors. */
	@media (forced-colors: active) {
		button {
			border: 1px solid ButtonText;
		}

		[aria-pressed='true'] {
			forced-color-adjust: none;
			background: Highlight;
			color: HighlightText;
		}
	}
</style>
