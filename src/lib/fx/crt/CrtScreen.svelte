<!--
@component
Old CRT monitor look for any content: barrel distortion and bloom (SVG filter), scanlines and an
RGB phosphor mask (CSS gradients, multiplied), a vignette, and optionally a rolling bar and a
subtle flicker.

Every visual parameter is a prop (see `crtSchema` for ranges and defaults). Children are
rendered in the phosphor color on the screen background; the size comes from `class`/`style`.

Motion: the rolling bar and flicker are CSS animations, so they stop under
`prefers-reduced-motion` and pause inside a `data-motion="paused"` region (see `MotionToggle`).
The flicker amplitude is clamped by `safeFlicker` (photosensitivity, see `crt.ts`).

Tokens: `--crt-bezel` (color around the curved picture), `--crt-font-size`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import CrtFilter from './CrtFilter.svelte';
	import {
		crtDefaults as d,
		FLICKER_DIPS_PER_SECOND,
		ROLLING_BAR_OPACITY,
		safeFlicker,
		type CrtOptions
	} from './crt';

	type Props = Partial<CrtOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof CrtOptions> & {
			children?: Snippet;
		};

	let {
		phosphor = d.phosphor,
		background = d.background,
		radius = d.radius,
		curvature = d.curvature,
		scanlines = d.scanlines,
		lineHeight = d.lineHeight,
		mask = d.mask,
		maskSize = d.maskSize,
		glow = d.glow,
		glowRadius = d.glowRadius,
		vignette = d.vignette,
		rollingBar = d.rollingBar,
		flicker = d.flicker,
		flickerAmount = d.flickerAmount,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `crt-${uid}`;

	let width = $state(0);
	let height = $state(0);
	let filtered = $derived(curvature > 0 || glow > 0);

	// Each stripe passes its own channel fully and dims the other two.
	let dim = $derived(Math.round(255 * (1 - mask)));
	let maskImage = $derived(
		`linear-gradient(90deg, rgb(255 ${dim} ${dim}) 0 33.333%, rgb(${dim} 255 ${dim}) 0 66.667%, rgb(${dim} ${dim} 255) 0)`
	);
</script>

<div
	class={['crt', className]}
	style:--_radius="{radius}px"
	style:--_fg={phosphor}
	style:--_bg={background}
	style:--_scanlines={scanlines}
	style:--_pitch="{lineHeight}px"
	style:--_mask={maskImage}
	style:--_mask-size="{maskSize * 3}px"
	style:--_vignette={vignette}
	style:--_flicker={safeFlicker(flickerAmount)}
	style:--_flicker-duration="{3 / FLICKER_DIPS_PER_SECOND}s"
	style:--_bar={ROLLING_BAR_OPACITY}
	bind:clientWidth={width}
	bind:clientHeight={height}
	{...rest}
>
	{#if filtered}
		<svg class="defs" aria-hidden="true">
			<CrtFilter id={filterId} {width} {height} {curvature} {glow} {glowRadius} />
		</svg>
	{/if}
	<div class="tube" style:filter={filtered ? `url(#${filterId})` : undefined}>
		<div class="content">
			{@render children?.()}
		</div>
		{#if scanlines > 0}
			<div class="scanlines" aria-hidden="true"></div>
		{/if}
		{#if mask > 0}
			<div class="mask" aria-hidden="true"></div>
		{/if}
	</div>
	{#if vignette > 0}
		<div class="vignette" aria-hidden="true"></div>
	{/if}
	{#if rollingBar}
		<div class="bar" aria-hidden="true"></div>
	{/if}
	{#if flicker}
		<div class="flicker" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.crt {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border-radius: var(--_radius);
		background: var(--crt-bezel, oklch(8% 0 0));
	}

	.tube,
	.content {
		block-size: 100%;
	}

	.tube {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border-radius: inherit;
	}

	.content {
		--terminal-fg: var(--_fg);
		--terminal-bg: var(--_bg);

		container-type: inline-size;
		overflow: hidden;
		background: var(--_bg);
		color: var(--_fg);
		font-size: var(--crt-font-size, inherit);
	}

	.scanlines,
	.mask,
	.vignette,
	.bar,
	.flicker {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Dark gap in the lower half of every line. */
	.scanlines {
		background: linear-gradient(transparent 50%, rgb(0 0 0 / var(--_scanlines)) 0) 0 0 / 100%
			var(--_pitch);
	}

	/* Aperture grille: vertical red, green and blue stripes, multiplied onto the picture. */
	.mask {
		background: var(--_mask) 0 0 / var(--_mask-size) 100%;
		mix-blend-mode: multiply;
	}

	.vignette {
		border-radius: inherit;
		background: radial-gradient(
			ellipse farthest-corner,
			transparent 55%,
			rgb(0 0 0 / calc(var(--_vignette) * 0.85)) 100%
		);
		box-shadow: inset 0 0 calc(var(--_vignette) * 60px) rgb(0 0 0 / var(--_vignette));
	}

	/* A broad, faint band drifting down, like the beat between camera and refresh rate. */
	.bar {
		inset: -30% 0 auto;
		block-size: 30%;
		background: linear-gradient(transparent, rgb(255 255 255 / var(--_bar)) 50%, transparent);
		mix-blend-mode: screen;
		animation: roll 9s linear infinite;
	}

	@keyframes roll {
		to {
			translate: 0 433%;
		}
	}

	/*
	 * Black veil wobbling between 0 and --_flicker (≤ 0.03) opacity with three smooth dips per
	 * cycle (one cycle = 3 / FLICKER_DIPS_PER_SECOND s); see MAX_FLICKER and FLICKER_DIPS_PER_SECOND in crt.ts.
	 */
	.flicker {
		background: rgb(0 0 0 / var(--_flicker));
		opacity: 0;
		animation: flicker var(--_flicker-duration) ease-in-out infinite;
	}

	/* Six segments of 1/6 s each (FLICKER_SEGMENT), three dips of uneven depth. */
	@keyframes flicker {
		0%,
		100% {
			opacity: 0;
		}
		16.667% {
			opacity: 1;
		}
		33.333% {
			opacity: 0.15;
		}
		50% {
			opacity: 0.75;
		}
		66.667% {
			opacity: 0;
		}
		83.333% {
			opacity: 0.9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bar,
		.flicker {
			display: none;
		}
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}
</style>
