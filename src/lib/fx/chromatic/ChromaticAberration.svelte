<!--
@component
Chromatic aberration (RGB split) on its children: a regular `filter: url(#id)`, so it works on
any content (text, images, whole layouts) and doesn't depend on `backdrop-filter`.

Every parameter is a prop (see `chromaticSchema`). With `jitter`, the split wobbles slowly on a
`requestAnimationFrame` loop; that is skipped when the user prefers reduced motion. Turning
`jitter` off is the pause control.

The filtered content stays in the accessibility tree and selectable; only its pixels change.

Tokens: none; size and lay out the wrapper through `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import ChromaticFilter from './ChromaticFilter.svelte';
	import {
		channelOffsets,
		chromaticDefaults as d,
		jitterAt,
		regionPadding,
		type ChromaticOptions,
		type Offset
	} from './chromatic.js';

	type Props = Partial<ChromaticOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof ChromaticOptions> & {
			children?: Snippet;
		};

	let {
		mode = d.mode,
		distance = d.distance,
		angle = d.angle,
		jitter = d.jitter,
		jitterAmount = d.jitterAmount,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `chromatic-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	// Border-box size (bound below, measured with a ResizeObserver): the filter region is in px.
	let width = $state(0);
	let height = $state(0);

	// Only animate while someone can see it: on screen and in a visible tab.
	let onScreen = $state(true);
	let pageVisible = $state(true);

	function watchVisibility(node: HTMLElement) {
		const observer = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting));
		observer.observe(node);
		const update = () => (pageVisible = !document.hidden);
		update();
		document.addEventListener('visibilitychange', update);
		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', update);
		};
	}

	let wobble = $state<Offset>({ dx: 0, dy: 0 });
	let jittering = $derived(jitter && jitterAmount > 0 && !reducedMotion.current);
	let moving = $derived(jittering && onScreen && pageVisible);

	$effect(() => {
		if (!jittering) wobble = { dx: 0, dy: 0 };
		if (!moving) return;
		let raf = requestAnimationFrame(function tick(now) {
			wobble = jitterAt(now / 1000);
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});

	// The wobble is added to red and subtracted from the channels moving the other way.
	let offsets = $derived.by(() => {
		const o = channelOffsets(mode, distance, angle);
		const jx = wobble.dx * jitterAmount;
		const jy = wobble.dy * jitterAmount;
		const shift = ({ dx, dy }: Offset, sign: number) =>
			dx === 0 && dy === 0 ? { dx, dy } : { dx: dx + sign * jx, dy: dy + sign * jy };
		return { r: shift(o.r, 1), g: shift(o.g, -1), b: shift(o.b, -1) };
	});

	let radial = $derived(
		mode === 'radial' ? Math.max(0, distance + wobble.dx * jitterAmount) : undefined
	);

	let pad = $derived(regionPadding(distance, jitter ? jitterAmount : 0));
	let active = $derived((distance > 0 || jittering) && width > 0 && height > 0);
</script>

<div
	class={['chromatic', className]}
	style:filter={active ? `url(#${filterId})` : null}
	bind:offsetWidth={width}
	bind:offsetHeight={height}
	{@attach watchVisibility}
	{...rest}
>
	{#if active}
		<svg class="defs" aria-hidden="true">
			<ChromaticFilter id={filterId} {width} {height} {pad} {offsets} {radial} />
		</svg>
	{/if}
	{@render children?.()}
</div>

<style>
	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
