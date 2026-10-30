<!--
@component
Text that reveals itself piece by piece: characters or words fade, rise and sharpen one after
another when they are first rendered.

Each piece is an inline-block with a CSS transition; `@starting-style` gives the values it
transitions from when it first appears, and `transition-delay` is its index times `stagger`. The
index comes from CSS `sibling-index()` / `sibling-count()` where supported, or from a `--i`
custom property the component writes inline (see `index`). Change `replay` to play it again: the
pieces are rendered anew, so their starting style applies again.

Screen readers get the text once, as a visually hidden copy; the pieces are `aria-hidden`.
Under `prefers-reduced-motion: reduce` the pieces only fade in, together, without movement.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		pieceCount,
		revealEasing,
		splitTextDefaults as d,
		splitWords,
		type SplitTextOptions
	} from './split-text.js';
	import { supportsSiblingIndex } from './support.js';

	type Props = Partial<SplitTextOptions> &
		Omit<HTMLAttributes<HTMLElement>, keyof SplitTextOptions> & {
			/** The text to reveal. */
			text: string;
			/** Element to render, e.g. `h1` or `p`. */
			as?: string;
			/** Change this (e.g. increment it) to replay the reveal. */
			replay?: unknown;
		};

	let {
		text,
		as = 'p',
		replay,
		split = d.split,
		order = d.order,
		stagger = d.stagger,
		duration = d.duration,
		easing = d.easing,
		bounce = d.bounce,
		distance = d.distance,
		blur = d.blur,
		rotate = d.rotate,
		scale = d.scale,
		index = d.index,
		class: className,
		...rest
	}: Props = $props();

	// Unknown while prerendering: write the inline index then, it is right in every browser.
	let supported = $state(false);
	onMount(() => (supported = supportsSiblingIndex()));

	let inline = $derived(index === 'inline' || (index === 'auto' && !supported));
	let words = $derived(splitWords(text));
	let count = $derived(pieceCount(words, split));

	// Between words: a text node, so it is a line break opportunity and not counted by sibling-index().
	const space = ' ';
</script>

<svelte:element
	this={as}
	class={['split-text', split, `order-${order}`, className]}
	style:--n={inline || split === 'chars' ? count : undefined}
	style:--_stagger="{stagger}ms"
	style:--_duration="{duration}ms"
	style:--_ease={revealEasing(easing, bounce)}
	style:--_dy="{distance}px"
	style:--_blur="{blur}px"
	style:--_rotate="{rotate}deg"
	style:--_scale={scale}
	{...rest}
>
	<span class="label">{text}</span>
	{#key replay}
		<span class="pieces" aria-hidden="true">
			{#each words as word, w (w)}
				{#if w > 0}{space}{/if}
				{#if split === 'words'}
					<span class="piece" style:--i={inline ? w : undefined}>{word.text}</span>
				{:else}
					<span class="word" style:--w={word.offset}>
						{#each word.chars as char, c (c)}
							<span class="piece" style:--i={inline ? word.offset + c : undefined}>{char}</span>
						{/each}
					</span>
				{/if}
			{/each}
		</span>
	{/key}
</svelte:element>

<style>
	/* Visually hidden, but read by screen readers; not selectable, so a copy gets the text once. */
	.label {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		user-select: none;
	}

	.word {
		display: inline-block;
		white-space: nowrap;
	}

	.piece {
		display: inline-block;
		/*
		 * The index: the inline --i if the component wrote one, otherwise sibling-index(). In
		 * character mode the characters are siblings only within their word, so the word's
		 * offset (--w) is added. Where sibling-index() is unknown and no --i is set, the whole
		 * value is invalid and the delay falls back to 0s: no stagger, but nothing breaks.
		 */
		--_i: var(--i, calc(sibling-index() - 1));
		--_n: var(--n, sibling-count());

		transition-property: opacity, translate, rotate, scale, filter;
		transition-duration: var(--_duration);
		transition-timing-function: var(--_ease);
		transition-delay: calc(var(--_step) * var(--_stagger));
	}

	.chars .piece {
		--_i: var(--i, calc(var(--w) + sibling-index() - 1));
	}

	/* Declared on the piece, where --_i and --_n exist (see revealStepCss). */
	.piece {
		--_step: var(--_i);
	}

	.order-end .piece {
		--_step: calc(var(--_n) - 1 - var(--_i));
	}

	.order-center .piece {
		--_step: max(var(--_i) - (var(--_n) - 1) / 2, (var(--_n) - 1) / 2 - var(--_i));
	}

	@media (prefers-reduced-motion: no-preference) {
		@starting-style {
			.piece {
				opacity: 0;
				translate: 0 var(--_dy);
				rotate: var(--_rotate);
				scale: var(--_scale);
				filter: blur(var(--_blur));
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.piece {
			transition: opacity 300ms ease-out;
		}

		@starting-style {
			.piece {
				opacity: 0;
			}
		}
	}
</style>
