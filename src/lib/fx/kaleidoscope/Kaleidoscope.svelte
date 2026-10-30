<!--
@component
Kaleidoscope: `segments` copies of a source, each clipped to a wedge with `clip-path: polygon()`
and turned into place with `rotate`; with `mirror`, every other copy is flipped so neighbors
meet like reflections. The wedge points and rotation angles are computed in CSS with `tan()`
and `calc()` from a single `--_n`.

The source is an image (`src`), any markup (`art` snippet), or, with neither, a built-in
pattern of CSS gradients. It is rendered once per wedge, so keep it light: an image or an SVG,
not interactive DOM. All copies are `aria-hidden`; `children` render once on top as real content.

Motion: `spin` slowly turns the source inside the wedges; the pointer pans it (`interactive`),
with a CSS transition as lag. Under `prefers-reduced-motion` neither happens; the spin pauses
inside a `[data-motion='paused']` region (see `MotionToggle`). Browsers without CSS trig
functions show the plain, unmirrored source instead.

Every visual parameter is a prop (see `kaleidoscopeSchema`). The element clips its content;
size it with `class`/`style`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import { pointerToUnit } from '../holo/holo.js';
	import {
		DEFAULT_ART,
		kaleidoscopeDefaults as d,
		panOffset,
		SEAM_APEX_PX,
		SEAM_OVERLAP_DEG,
		segmentCount,
		segmentTransform,
		sourceScale,
		type KaleidoscopeOptions
	} from './kaleidoscope.js';

	type Props = Partial<KaleidoscopeOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof KaleidoscopeOptions> & {
			/** Image URL used as the source. */
			src?: string;
			/** Markup used as the source, rendered once per wedge. Takes precedence over `src`. */
			art?: Snippet;
			/** Real content, rendered once on top of the pattern. */
			children?: Snippet;
		};

	let {
		segments = d.segments,
		mirror = d.mirror,
		rotation = d.rotation,
		zoom = d.zoom,
		spin = d.spin,
		duration = d.duration,
		interactive = d.interactive,
		pan = d.pan,
		lag = d.lag,
		src,
		art,
		children,
		class: className,
		...rest
	}: Props = $props();

	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let n = $derived(segmentCount(segments));
	let copies = $derived(Array.from({ length: n }, (_, i) => segmentTransform(i, n, mirror)));
	let image = $derived(src ? `url(${JSON.stringify(src)})` : DEFAULT_ART.image);
	let imageSize = $derived(src ? 'cover' : DEFAULT_ART.size);

	// Panning needs a bigger source (see `sourceScale`); without it the wedges show more of it.
	let reach = $derived(interactive && !reducedMotion.current ? pan : 0);

	let root = $state<HTMLDivElement>();

	function write(x: number, y: number) {
		const o = panOffset(x, y, reach);
		root?.style.setProperty('--_px', `${o.x}%`);
		root?.style.setProperty('--_py', `${o.y}%`);
	}

	// Back to the center whenever the pan range changes, is turned off or reduced motion turns on:
	// an offset from the old range might no longer be covered.
	$effect(() => {
		void reach;
		write(0.5, 0.5);
	});

	function point(e: PointerEvent) {
		if (!interactive || reducedMotion.current || !root) return;
		const p = pointerToUnit(e.clientX, e.clientY, root.getBoundingClientRect());
		write(p.x, p.y);
	}
</script>

<div
	class={['kaleidoscope', { spin }, className]}
	bind:this={root}
	style:--_n={n}
	style:--_overlap="{SEAM_OVERLAP_DEG}deg"
	style:--_apex="{SEAM_APEX_PX}px"
	style:--_rotation="{rotation}deg"
	style:--_zoom={zoom}
	style:--_inset="{((1 - sourceScale(reach)) / 2) * 100}%"
	style:--_duration="{duration}s"
	style:--_lag="{lag}ms"
	onpointermove={point}
	{...rest}
>
	<div class="ring" aria-hidden="true">
		{#each copies as t, i (i)}
			<div class="segment" style:--_i={i} style:--_flip={t.flip}>
				<div class="source">
					{#if art}
						{@render art()}
					{:else}
						<div
							class="image"
							style:background-image={image}
							style:background-size={imageSize}
						></div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	{@render children?.()}
</div>

<style>
	.kaleidoscope {
		--_px: 0%;
		--_py: 0%;

		position: relative;
		isolation: isolate;
		overflow: hidden;
		container-type: size;
		background: oklch(18% 0.04 280);
	}

	/*
	 * A square big enough to cover the box at any angle: its inscribed circle (radius 71cqmax) is
	 * larger than the box's half diagonal (at most 70.8cqmax).
	 */
	.ring {
		position: absolute;
		inset-block-start: 50%;
		inset-inline-start: 50%;
		inline-size: 142cqmax;
		aspect-ratio: 1;
		translate: -50% -50%;
		rotate: var(--_rotation);
		z-index: -1;
	}

	/*
	 * Every copy is the same wedge pointing up, apex at the center (nudged a little past it so
	 * neighbors overlap there too), base on the top edge:
	 * x = 50% ± 50% · tan(half angle). Then it is flipped (odd copies, with mirror) and turned
	 * into place.
	 */
	.segment {
		--_half: calc(180deg / var(--_n) + var(--_overlap));

		position: absolute;
		inset: 0;
		overflow: hidden;
		clip-path: polygon(
			50% calc(50% + var(--_apex)),
			calc(50% - 50% * tan(var(--_half))) 0%,
			calc(50% + 50% * tan(var(--_half))) 0%
		);
		rotate: calc(var(--_i) * 360deg / var(--_n));
		scale: var(--_flip) 1;
	}

	/*
	 * The source is centered on the wedge layer and just big enough to pan and spin freely without
	 * its edges showing (see `sourceScale` and `panOffset`).
	 */
	.source {
		position: absolute;
		inset: var(--_inset);
		translate: var(--_px) var(--_py);
		scale: var(--_zoom);
		transition: translate var(--_lag) var(--ease-out);
	}

	.image {
		position: absolute;
		inset: 0;
		background-position: center;
	}

	.source > :global(*) {
		block-size: 100%;
		inline-size: 100%;
	}

	.spin .source {
		animation: kaleidoscope-spin var(--_duration) linear infinite;
	}

	@keyframes kaleidoscope-spin {
		to {
			rotate: 360deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spin .source {
			animation: none;
		}

		.source {
			transition: none;
		}
	}

	/* Without trig functions the clip-path is invalid: show one plain copy instead of a pile. */
	@supports not (clip-path: polygon(50% 50%, calc(50% * tan(10deg)) 0%, 0% 0%)) {
		.segment:not(:first-child) {
			display: none;
		}

		.segment {
			rotate: none;
			scale: none;
		}
	}
</style>
