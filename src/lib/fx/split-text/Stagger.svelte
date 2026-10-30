<!--
@component
Staggered reveal for any list: every direct child fades and rises in after the one before it.
The same technique as `SplitText` (a transition from `@starting-style`, delayed by the child's
index), but the children are yours, so the index comes from `sibling-index()` and
`sibling-count()` alone, with no per-item markup.

Where `sibling-index()` is unsupported (or with `index="inline"`), the component writes `--i`
and `--n` onto the children itself, right after they are rendered and before the first paint.
On a prerendered page the very first reveal in such a browser plays without stagger.

Change `replay` to play it again. Under `prefers-reduced-motion: reduce` the children only fade in.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLAttributes } from 'svelte/elements';
	import { revealEasing, splitTextDefaults as d, type SplitTextOptions } from './split-text.js';
	import { supportsSiblingIndex } from './support.js';

	type Options = Omit<SplitTextOptions, 'split'>;

	type Props = Partial<Options> &
		Omit<HTMLAttributes<HTMLElement>, keyof Options> & {
			/** Element to render, e.g. `ul`, `ol` or `div`. */
			as?: string;
			/** Change this (e.g. increment it) to replay the reveal. */
			replay?: unknown;
			children?: Snippet;
		};

	let {
		as = 'ul',
		replay,
		order = d.order,
		stagger = 60,
		duration = d.duration,
		easing = d.easing,
		bounce = d.bounce,
		distance = d.distance,
		blur = d.blur,
		rotate = d.rotate,
		scale = d.scale,
		index = d.index,
		class: className,
		children,
		...rest
	}: Props = $props();

	let supported = $state(false);
	onMount(() => (supported = supportsSiblingIndex()));

	let inline = $derived(index === 'inline' || (index === 'auto' && !supported));

	// Runs after the children are inserted and before the browser styles them, so the inline
	// index is there when the starting style applies.
	function indexChildren(write: boolean): Attachment<HTMLElement> {
		return (node) => {
			const items = [...node.children] as HTMLElement[];
			items.forEach((el, i) => {
				if (write) {
					el.style.setProperty('--i', String(i));
					el.style.setProperty('--n', String(items.length));
				} else {
					el.style.removeProperty('--i');
					el.style.removeProperty('--n');
				}
			});
		};
	}
</script>

{#key replay}
	<svelte:element
		this={as}
		class={['stagger', `order-${order}`, className]}
		style:--_stagger="{stagger}ms"
		style:--_duration="{duration}ms"
		style:--_ease={revealEasing(easing, bounce)}
		style:--_dy="{distance}px"
		style:--_blur="{blur}px"
		style:--_rotate="{rotate}deg"
		style:--_scale={scale}
		{@attach indexChildren(inline)}
		{...rest}
	>
		{@render children?.()}
	</svelte:element>
{/key}

<style>
	.stagger > :global(*) {
		--_i: var(--i, calc(sibling-index() - 1));
		--_n: var(--n, sibling-count());
		--_step: var(--_i);

		transition-property: opacity, translate, rotate, scale, filter;
		transition-duration: var(--_duration);
		transition-timing-function: var(--_ease);
		transition-delay: calc(var(--_step) * var(--_stagger));
	}

	.order-end > :global(*) {
		--_step: calc(var(--_n) - 1 - var(--_i));
	}

	.order-center > :global(*) {
		--_step: max(var(--_i) - (var(--_n) - 1) / 2, (var(--_n) - 1) / 2 - var(--_i));
	}

	@media (prefers-reduced-motion: no-preference) {
		@starting-style {
			.stagger > :global(*) {
				opacity: 0;
				translate: 0 var(--_dy);
				rotate: var(--_rotate);
				scale: var(--_scale);
				filter: blur(var(--_blur));
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stagger > :global(*) {
			transition: opacity 300ms ease-out;
		}

		@starting-style {
			.stagger > :global(*) {
				opacity: 0;
			}
		}
	}
</style>
