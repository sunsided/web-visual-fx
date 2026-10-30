<!--
@component
Reveals its children as they scroll into view of the nearest scroll container, with a CSS
animation driven by an anonymous view timeline (`animation-timeline: view()`). No JavaScript runs
on scroll.

The resting state is the visible one; only the animation's first keyframe hides anything. So where
scroll-driven animations aren't supported (`@supports`), under `prefers-reduced-motion: reduce` and
inside a `[data-motion='paused']` region the content is simply shown, never stuck hidden. (Pausing
a scroll-driven animation would freeze it wherever it is, possibly invisible, so a paused region
switches it off instead.)

Ranges that end after the element has fully entered (the `center` span, `cover`, `contain`) never
finish for the last element of a scroller unless there is enough space after it; leave padding at
the end. Slides from the side extend the scroller's overflow while they run: give it
`overflow-x: hidden` (or `clip` on the page itself).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		revealFrames,
		spanExitRange,
		spanRange,
		scrollRevealDefaults as d,
		type ScrollRevealOptions
	} from './scroll-reveal.js';

	type Props = Partial<ScrollRevealOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof ScrollRevealOptions> & {
			children?: Snippet;
		};

	let {
		preset = d.preset,
		edge = d.edge,
		distance = d.distance,
		angle = d.angle,
		startScale = d.startScale,
		blurRadius = d.blurRadius,
		span = d.span,
		range = d.range,
		rangeStart = d.rangeStart,
		rangeEnd = d.rangeEnd,
		easing = d.easing,
		exit = d.exit,
		class: className,
		children,
		...rest
	}: Props = $props();

	let frames = $derived(revealFrames({ preset, edge, distance, angle, startScale, blurRadius }));
	let exitRange = $derived(spanExitRange({ span, exit, rangeStart, rangeEnd }));
</script>

<div
	class={['scroll-reveal', { exit: exitRange !== undefined }, className]}
	style:--_o0={frames.from.opacity}
	style:--_t0={frames.from.translate}
	style:--_s0={frames.from.scale}
	style:--_f0={frames.from.filter}
	style:--_c0={frames.from.clipPath}
	style:--_c1={frames.to.clipPath}
	style:--_x0={frames.from.transform}
	style:--_x1={frames.to.transform}
	style:--_ease={easing}
	style:--_range={spanRange({ span, range, rangeStart, rangeEnd })}
	style:--_exit-range={exitRange}
	{...rest}
>
	{@render children?.()}
</div>

<style>
	/*
	 * Only the start is variable; the end is the resting state (plus clip-path, which can't
	 * interpolate from inset() to none, and a flip's transform, which keeps its perspective()).
	 * Unused properties animate from none to none: no-ops.
	 */
	@keyframes reveal {
		from {
			opacity: var(--_o0);
			translate: var(--_t0);
			scale: var(--_s0);
			filter: var(--_f0);
			clip-path: var(--_c0);
			transform: var(--_x0);
		}
		to {
			opacity: 1;
			translate: none;
			scale: none;
			filter: none;
			clip-path: var(--_c1);
			transform: var(--_x1);
		}
	}

	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			.scroll-reveal {
				/* fill both: hidden before the range, revealed after it */
				animation: reveal var(--_ease) both;
				/* After the shorthand, which resets both. */
				animation-timeline: view();
				animation-range: var(--_range);
			}

			/*
			 * The same keyframes reversed over the exit range. It only fills forwards: in its before
			 * phase it must not apply, or its first frame (visible) would mask the entry animation.
			 */
			.scroll-reveal.exit {
				animation:
					reveal var(--_ease) both,
					reveal var(--_ease) reverse forwards;
				animation-timeline: view(), view();
				animation-range: var(--_range), var(--_exit-range);
			}
		}
	}

	:global([data-motion='paused']) .scroll-reveal {
		animation: none;
	}
</style>
