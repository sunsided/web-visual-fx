<!--
@component
Box with an arc of light travelling around its border, the "border beam" look.

The beam is a `conic-gradient` whose start angle is a registered `<angle>` custom property
(`--border-beam-angle`), animated from 0 to 360deg. A layer covering the border box is masked
down to the border ring with `mask-composite: exclude` (the same ring as `SpotlightCard`). An
optional second copy of the ring is blurred into a glow.

Under `prefers-reduced-motion: reduce`, with `animate` off, and in browsers without `@property`,
the border shows a still two-color ring instead. Pauses inside `[data-motion='paused']`. The ring
layers are `aria-hidden`; the children are ordinary content.

Tokens: `--border-beam-bg`, `--border-beam-color`, `--border-beam-padding`.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		beamStops,
		borderBeamDefaults as d,
		staticRing,
		type BorderBeamOptions
	} from './border-beam.js';
	import { supportsRegisteredProperties } from './support.js';

	type Props = Partial<BorderBeamOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof BorderBeamOptions> & {
			children?: Snippet;
		};

	let {
		length = d.length,
		beams = d.beams,
		color = d.color,
		colorB = d.colorB,
		width = d.width,
		radius = d.radius,
		track = d.track,
		glow = d.glow,
		glowOpacity = d.glowOpacity,
		duration = d.duration,
		direction = d.direction,
		animate = d.animate,
		class: className,
		children,
		...rest
	}: Props = $props();

	// Decided after mount, so the prerendered HTML is the same for every browser.
	let supported = $state(true);
	onMount(() => (supported = supportsRegisteredProperties()));

	let stops = $derived(beamStops({ length, beams, color, colorB, direction }));
	let repeat = $derived(Math.round(beams) > 1);
</script>

<div
	class={['border-beam', { animate: animate && supported, repeat }, className]}
	style:--_stops={stops}
	style:--_static={staticRing({ color, colorB })}
	style:--_bw="{width}px"
	style:--_radius="{radius}px"
	style:--_track={track}
	style:--_glow="{glow}px"
	style:--_glow-opacity={glowOpacity}
	style:--_lap="{duration}s"
	style:--_dir={direction === 'counterclockwise' ? 'reverse' : 'normal'}
	{...rest}
>
	{#if glow > 0 && glowOpacity > 0}
		<span class="glow" aria-hidden="true"><span class="ring"></span></span>
	{/if}
	<span class="ring edge" aria-hidden="true"></span>
	{@render children?.()}
</div>

<style>
	/*
	 * Registered, so the browser knows it is an angle and can interpolate it (and the gradient
	 * that uses it) on every frame. Not inherited: only the ring layers animate it, so the
	 * content below the host never needs a style update.
	 */
	@property --border-beam-angle {
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}

	.border-beam {
		position: relative;
		isolation: isolate;
		padding: var(--border-beam-padding, var(--space-6));
		border: var(--_bw) solid
			color-mix(in oklab, currentColor calc(var(--_track) * 100%), transparent);
		border-radius: var(--_radius);
		background: var(--border-beam-bg, #14121c);
		color: var(--border-beam-color, #f3f1fa);
	}

	/* Both layers cover the border box, which is the box the conic gradient is centered in. */
	.glow,
	.edge {
		position: absolute;
		inset: calc(-1 * var(--_bw));
		z-index: -1;
		border-radius: inherit;
		pointer-events: none;
	}

	/*
	 * The blur sits on a wrapper: an element's own filter runs before its mask, so blurring the
	 * masked ring itself would cut the glow back to the ring.
	 */
	.glow {
		filter: blur(var(--_glow));
		opacity: var(--_glow-opacity);
	}

	.ring {
		/* The whole box minus the content box leaves only the padding, which is the border width. */
		padding: var(--_bw);
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
		background: var(--_static);
	}

	/* A thin line blurred over a wide radius almost vanishes, so the glow's ring is wider. */
	.glow > .ring {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		padding: max(var(--_bw), calc(var(--_glow) / 3));
	}

	@media (prefers-reduced-motion: no-preference) {
		/* The gradient is declared here, not on the host: var() is resolved where it is declared. */
		.animate .ring {
			background: conic-gradient(from var(--border-beam-angle), var(--_stops));
			animation: border-beam-spin var(--_lap) linear infinite var(--_dir);
		}

		.animate.repeat .ring {
			background: repeating-conic-gradient(from var(--border-beam-angle), var(--_stops));
		}
	}

	@keyframes border-beam-spin {
		to {
			--border-beam-angle: 360deg;
		}
	}
</style>
