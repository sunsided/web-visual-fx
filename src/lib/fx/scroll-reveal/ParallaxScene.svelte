<!--
@component
A box whose `ParallaxLayer` children shift at different speeds while it scrolls through the nearest
scroll container. The scene declares a named view timeline (`view-timeline: --vfx-parallax`) that
every layer inside it uses, so all layers are driven by the scene's position, not their own (their
own boxes move with the animation and are oversized). Nested scenes each drive their own layers:
a name resolves to the nearest ancestor that declares it.

The scene clips its overflow. Without scroll-driven animations or with reduced motion, the layers
just sit still.

Tokens: `--parallax-strength` (set from `strength`), `--parallax-range`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { parallaxDefaults as d, type ParallaxOptions } from './scroll-reveal.js';

	type Props = Partial<ParallaxOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof ParallaxOptions> & {
			children?: Snippet;
		};

	let {
		strength = d.strength,
		range = d.range,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<div
	class={['parallax-scene', className]}
	style:--parallax-strength={strength}
	style:--parallax-range={range}
	{...rest}
>
	{@render children?.()}
</div>

<style>
	.parallax-scene {
		position: relative;
		isolation: isolate;
		overflow: clip;
		view-timeline: --vfx-parallax block;
	}
</style>
