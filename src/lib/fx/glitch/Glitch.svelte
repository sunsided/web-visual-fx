<!--
@component
Digital glitch on its children: horizontal slices jump sideways and the RGB channels tear apart
in short, occasional bursts, over a constant subtle channel split. A regular `filter: url(#id)`,
so it works on any content and in every engine.

Every visual parameter is a prop (see `glitchSchema`). The slice layouts are generated from
`seed`, so the same seed always plays the same sequence.

Motion: bursts are timed by a CSS animation (a hidden clock that ticks four times per second), so
they stop under `prefers-reduced-motion` and inside a `data-motion="paused"` region (see
`MotionToggle`); pausing freezes the current frame. The picture can change at most four times per
second, which keeps it below the WCAG three-flashes limit (see `TICK_HZ` in `glitch.ts`). Without
bursts, `still` decides what shows: the static split, one frozen frame, or nothing.

The content stays in the accessibility tree and selectable; only its pixels change.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import { channelOffsets } from '../chromatic/chromatic.js';
	import GlitchFilter from './GlitchFilter.svelte';
	import {
		glitchDefaults as d,
		glitchFrameAt,
		glitchPadding,
		sliceMapUrl,
		sliceScales,
		stillFrameKey,
		TICK_HZ,
		type GlitchOptions
	} from './glitch.js';

	type Props = Partial<GlitchOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof GlitchOptions> & {
			children?: Snippet;
		};

	let {
		shift = d.shift,
		slices = d.slices,
		sliceHeight = d.sliceHeight,
		seed = d.seed,
		split = d.split,
		burstSplit = d.burstSplit,
		fringe = d.fringe,
		bursts = d.bursts,
		interval = d.interval,
		burstFrames = d.burstFrames,
		still = d.still,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `glitch-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	// Border-box size: the filter region and the map are in px.
	let width = $state(0);
	let height = $state(0);

	// Only tick while someone can see it: on screen and in a visible tab.
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

	let animated = $derived(bursts && !reducedMotion.current);
	let ticking = $derived(animated && onScreen && pageVisible);
	let tick = $state(0);

	let frame = $derived.by(() => {
		if (animated) return glitchFrameAt(seed, tick, { interval, burstFrames });
		return still === 'frame' ? stillFrameKey(seed) : 0;
	});

	let rows = $derived(Math.round(height));
	let map = $derived(
		frame !== 0 && rows > 0 && shift > 0 ? sliceMapUrl(frame, rows, { slices, sliceHeight }) : ''
	);
	let scales = $derived(sliceScales(shift, fringe));
	let offsets = $derived(channelOffsets('rgb', split + (frame !== 0 ? burstSplit : 0), 0));
	let pad = $derived(glitchPadding(shift, fringe, split, burstSplit));

	let active = $derived(
		width > 0 &&
			height > 0 &&
			(animated
				? split > 0 || shift > 0 || burstSplit > 0
				: still !== 'none' && (split > 0 || map !== ''))
	);
</script>

<div
	class={['glitch', className]}
	style:filter={active ? `url(#${filterId})` : null}
	style:--_tick="{1000 / TICK_HZ}ms"
	bind:offsetWidth={width}
	bind:offsetHeight={height}
	{@attach watchVisibility}
	{...rest}
>
	{#if active}
		<svg class="defs" aria-hidden="true">
			<GlitchFilter id={filterId} {width} {height} {pad} {offsets} {map} {scales} />
		</svg>
	{/if}
	{#if ticking}
		<!-- The clock: a CSS animation, so reduced motion and paused regions stop it for free. -->
		<span class="clock" aria-hidden="true" onanimationiteration={() => tick++}></span>
	{/if}
	{@render children?.()}
</div>

<style>
	.glitch {
		position: relative;
	}

	.defs,
	.clock {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	.clock {
		animation: glitch-tick var(--_tick) step-end infinite;
	}

	@keyframes glitch-tick {
		to {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.clock {
			animation: none;
		}
	}
</style>
