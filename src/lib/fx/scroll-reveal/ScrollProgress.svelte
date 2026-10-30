<!--
@component
A bar that fills as a scroll container is scrolled, driven by a scroll timeline: by default the
nearest scrolling ancestor (`scroll(nearest block)`). To show it outside the scroller (for example
pinned above it), give the scroller a named timeline (`scroll-timeline: --name block`), declare
the name on a common ancestor (`timeline-scope: --name`) and pass `timeline="--name"`.

The bar is decorative (`aria-hidden`). It only shows where scroll-driven animations are supported;
it is not hidden under reduced motion, because it moves only as the reader scrolls. Position it
yourself (e.g. `position: sticky` or `absolute`, via `class`).
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { scrollProgressDefaults as d, type ScrollProgressOptions } from './scroll-reveal.js';

	type Props = Partial<ScrollProgressOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof ScrollProgressOptions> & {
			/** `animation-timeline` value: a timeline name (`--name`) or `scroll(…)`. */
			timeline?: string;
		};

	let {
		color = d.color,
		thickness = d.thickness,
		timeline = 'scroll(nearest block)',
		class: className,
		...rest
	}: Props = $props();
</script>

<div
	class={['scroll-progress', className]}
	style:--_color={color}
	style:--_timeline={timeline}
	style:block-size="{thickness}px"
	aria-hidden="true"
	{...rest}
></div>

<style>
	@keyframes progress {
		from {
			scale: 0 1;
		}
		to {
			scale: 1 1;
		}
	}

	.scroll-progress {
		display: none;
		inline-size: 100%;
		background: var(--_color);
		transform-origin: 0 50%;
	}

	@supports (animation-timeline: scroll()) {
		.scroll-progress {
			display: block;
			animation: progress linear both;
			animation-timeline: var(--_timeline);
		}
	}

	:global([data-motion='paused']) .scroll-progress {
		animation-play-state: running !important;
	}
</style>
