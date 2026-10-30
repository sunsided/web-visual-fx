<!--
@component
One layer of a `ParallaxScene`. `depth` 0 scrolls with the page; positive depths are further away
and lag behind (a far background), negative ones are in front and overtake the scroll. The layer
travels `depth × strength` px each way while the scene crosses the scrollport.

With `fill` (the default) the layer covers the scene and is oversized by its travel, so its edges
never show; turn it off for layers in normal flow, such as a heading.

Decorative layers should get `aria-hidden="true"`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** 0 = no parallax, 1 = travels the scene's full strength (further away), −1 = in front. */
		depth?: number;
		/** Cover the scene (absolutely positioned and oversized). */
		fill?: boolean;
		children?: Snippet;
	};

	let { depth = 0.5, fill = true, class: className, children, ...rest }: Props = $props();
</script>

<div class={['parallax-layer', { fill }, className]} style:--_d={depth} {...rest}>
	{@render children?.()}
</div>

<style>
	@keyframes parallax {
		from {
			translate: 0 calc(var(--_d) * var(--parallax-strength, 480) * -1px);
		}
		to {
			translate: 0 calc(var(--_d) * var(--parallax-strength, 480) * 1px);
		}
	}

	.parallax-layer {
		position: relative;
	}

	.parallax-layer.fill {
		/* Oversized by the travel in both directions: max(d, -d) is |d|. */
		--_bleed: calc(max(var(--_d), -1 * var(--_d)) * var(--parallax-strength, 480) * 1px);

		position: absolute;
		inset: calc(-1 * var(--_bleed)) 0;
		z-index: -1;
	}

	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			.parallax-layer {
				animation: parallax linear both;
				animation-timeline: --vfx-parallax;
				animation-range: var(--parallax-range, cover);
			}
		}
	}

	:global([data-motion='paused']) .parallax-layer {
		animation: none;
	}
</style>
