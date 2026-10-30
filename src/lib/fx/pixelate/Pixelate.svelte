<!--
@component
Pixelates its children into a mosaic of square (or rounded, spaced) tiles with a pure SVG
sample-and-hold filter (`PixelateFilter`). Each block takes the color of the pixel at its center.

Animate `size` for a resolve transition; a size of 1 removes the filter. With `reveal="hover"`
the blocks shrink to the sharp content while the pointer is over the element or focus is inside
it, and grow back afterwards; under `prefers-reduced-motion` that happens without a transition.

Not a redaction tool: the original content is still in the DOM and in the accessibility tree,
and pixelated text can often be reconstructed. Hide real secrets on the server.

Every visual parameter is a prop (see `pixelateSchema` for ranges and defaults). The wrapper is a
plain block; size and layout it with `class`/`style`.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tween } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import PixelateFilter from './PixelateFilter.svelte';
	import { effectiveSize, pixelateDefaults as d, type PixelateOptions } from './pixelate.js';

	type Props = Partial<PixelateOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof PixelateOptions> & {
			children?: Snippet;
		};

	let {
		size = d.size,
		gap = d.gap,
		roundness = d.roundness,
		fillGrout = d.fillGrout,
		grout = d.grout,
		reveal = d.reveal,
		revealDuration = d.revealDuration,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = `pixelate-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let hovered = $state(false);
	let focused = $state(false);
	let revealed = $derived(reveal === 'hover' && (hovered || focused));

	const block = new Tween(
		untrack(() => size),
		{ easing: cubicOut }
	);

	// Slider changes jump straight to the new size; only the reveal itself is animated.
	$effect(() => {
		const animate = reveal === 'hover' && !reducedMotion.current;
		block.set(revealed ? 1 : size, { duration: animate ? revealDuration : 0 });
	});

	let current = $derived(effectiveSize(block.current));
</script>

<div
	class={['pixelate', className]}
	style:--_filter={current > 1 ? `url(#${id})` : 'none'}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	onfocusin={() => (focused = true)}
	onfocusout={() => (focused = false)}
	{...rest}
>
	<svg class="defs" aria-hidden="true">
		{#if current > 1}
			<PixelateFilter {id} size={current} {gap} {roundness} {fillGrout} {grout} />
		{/if}
	</svg>
	{@render children?.()}
</div>

<style>
	.pixelate {
		filter: var(--_filter);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
