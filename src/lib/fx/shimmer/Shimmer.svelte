<!--
@component
A band of light sweeping across its content, as on skeleton loaders, shiny buttons and shiny text.

Three techniques (see `shimmerSchema`):
- `sheen`: an `aria-hidden` layer with a gradient band slides over the content with `translate`.
- `text`: the band is part of a `background` clipped to the text (`background-clip: text`); the
  text keeps its color outside the band.
- `mask`: a gradient `mask-image` dims the content except where the band is. Only alpha counts,
  so it works on anything: text, icons, skeleton blocks.

`text` and `mask` move the band by animating a registered `<percentage>` (`--shimmer-pos`) inside
the gradient. They switch themselves off in browsers without `@property`, where it would not
interpolate. Under `prefers-reduced-motion: reduce` or with `animate` off the content is shown
plain. Pauses inside `[data-motion='paused']`.

Content stays real content; give a skeleton its own status text (see the demo page).
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { supportsRegisteredProperties } from '../border-beam/support.js';
	import {
		bandGradient,
		gradientSweep,
		sheenGradient,
		sheenSweep,
		shimmerDefaults as d,
		type ShimmerOptions
	} from './shimmer.js';

	type Props = Partial<ShimmerOptions> &
		Omit<HTMLAttributes<HTMLElement>, keyof ShimmerOptions> & {
			/** Element to render, e.g. `span` around inline text or `h1` for a shiny headline. */
			as?: string;
			children?: Snippet;
		};

	let {
		mode = d.mode,
		color = d.color,
		intensity = d.intensity,
		band = d.band,
		angle = d.angle,
		blend = d.blend,
		duration = d.duration,
		pause = d.pause,
		trigger = d.trigger,
		animate = d.animate,
		as = 'div',
		class: className,
		children,
		...rest
	}: Props = $props();

	// Decided after mount, so the prerendered HTML is the same for every browser.
	let supported = $state(true);
	onMount(() => (supported = supportsRegisteredProperties()));

	let on = $derived(animate && (mode === 'sheen' || supported));
	let sweep = $derived(
		mode === 'sheen' ? sheenSweep({ duration, pause }) : gradientSweep({ band, duration, pause })
	);

	let image = $derived.by(() => {
		if (mode === 'text') {
			const hl = `color-mix(in oklab, ${color} ${Math.round(intensity * 100)}%, currentColor)`;
			return bandGradient(angle, 'currentColor', hl, band);
		}
		if (mode === 'mask') {
			return bandGradient(angle, `rgb(0 0 0 / ${+(1 - intensity).toFixed(3)})`, '#000', band);
		}
		return sheenGradient({ angle, color, band });
	});
</script>

<svelte:element
	this={as}
	class={['shimmer', `mode-${mode}`, trigger, { on }, className]}
	style:--_image={image}
	style:--_from="{sweep.from}%"
	style:--_to="{sweep.to}%"
	style:--_total="{sweep.total}s"
	style:--_intensity={intensity}
	style:--_blend={blend}
	{...rest}
>
	{@render children?.()}
	{#if mode === 'sheen' && on}
		<span class="clip" aria-hidden="true"><span class="band"></span></span>
	{/if}
</svelte:element>

<style>
	/*
	 * The band's position along the gradient line. Registered so it interpolates; a plain custom
	 * property would jump from the start to the end halfway through. Not inherited: only the host
	 * animates it.
	 */
	@property --shimmer-pos {
		syntax: '<percentage>';
		inherits: false;
		initial-value: -100%;
	}

	.shimmer {
		position: relative;
		isolation: isolate;
	}

	/* sheen: a box-sized layer with a band in the middle, slid across with translate */
	.clip {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: hidden;
		border-radius: inherit;
		/* On the clipping layer: the band's own blend would stay inside this layer's group. */
		mix-blend-mode: var(--_blend);
		pointer-events: none;
	}

	.band {
		position: absolute;
		inset: 0;
		background: var(--_image);
		opacity: var(--_intensity);
		translate: -100% 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.on.loop .band,
		.on.hover:is(:hover, :focus-within) .band {
			animation: shimmer-slide var(--_total) linear infinite;
		}

		.on.mode-text.loop,
		.on.mode-text.hover:is(:hover, :focus-within) {
			background: var(--_image);
			-webkit-background-clip: text;
			background-clip: text;
			-webkit-text-fill-color: transparent;
			animation: shimmer-sweep var(--_total) linear infinite;
		}

		.on.mode-mask.loop,
		.on.mode-mask.hover:is(:hover, :focus-within) {
			mask-image: var(--_image);
			animation: shimmer-sweep var(--_total) linear infinite;
		}
	}

	@keyframes shimmer-slide {
		from {
			translate: var(--_from) 0;
		}
		to {
			translate: var(--_to) 0;
		}
	}

	@keyframes shimmer-sweep {
		from {
			--shimmer-pos: var(--_from);
		}
		to {
			--shimmer-pos: var(--_to);
		}
	}
</style>
