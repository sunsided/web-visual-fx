<!--
@component
Animated aurora / mesh-gradient background that fills this element; children render on top.

Two techniques with the same motion (see `auroraSchema`): `mesh` paints one radial-gradient per
blob on a single element and moves them by animating registered custom properties; `blobs`
moves one blurred element per blob with compositor-friendly `rotate` animations.

Animation stops under `prefers-reduced-motion: reduce` and pauses inside a
`[data-motion='paused']` region (see `MotionToggle`). Decorative layers are `aria-hidden`;
keeping text on top readable is up to you (e.g. a scrim or an opaque card).

Tokens: `--aurora-bg` (overrides `background`), `--aurora-scrim` (any background, painted above
the art and below the content).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import NoiseLayer from '../noise/NoiseLayer.svelte';
	import {
		auroraDefaults as d,
		BASE_DURATION,
		blobLayout,
		blobTiming,
		meshLayers,
		paletteOf,
		saturated,
		type AuroraOptions
	} from './aurora.js';

	type Props = Partial<AuroraOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof AuroraOptions> & {
			children?: Snippet;
		};

	let {
		technique = d.technique,
		colorCount = d.colorCount,
		color1 = d.color1,
		color2 = d.color2,
		color3 = d.color3,
		color4 = d.color4,
		color5 = d.color5,
		background = d.background,
		saturation = d.saturation,
		blobs = d.blobs,
		blobSize = d.blobSize,
		blur = d.blur,
		blendMode = d.blendMode,
		seed = d.seed,
		animate = d.animate,
		speed = d.speed,
		colorDrift = d.colorDrift,
		grain = d.grain,
		class: className,
		style,
		children,
		...rest
	}: Props = $props();

	let palette = $derived(paletteOf({ colorCount, color1, color2, color3, color4, color5 }));
	let layout = $derived(blobLayout(blobs, palette.length, seed));
	let clock = $derived(BASE_DURATION / speed);

	// --_pN: palette color N, --_qN: the color it drifts towards (the next one in the palette).
	let colorVars = $derived(
		palette
			.flatMap((c, i) => [
				`--_p${i}: ${saturated(c, saturation)}`,
				`--_q${i}: ${saturated(palette[(i + 1) % palette.length], saturation)}`
			])
			.join('; ')
	);

	let mesh = $derived(
		meshLayers(layout, blobSize, (i) => `var(--aurora-c${i})`, { pad: 'var(--_pad)' }).join(', ')
	);
</script>

<div
	class={['aurora', { animate, drift: colorDrift, blurred: blur > 0 }, className]}
	style={[colorVars, style].filter(Boolean).join('; ')}
	style:--_bg={background}
	style:--_blur="{blur}px"
	style:--_size="{blobSize}cqmax"
	style:--_clock="{clock}s"
	style:--_blend={blendMode}
	{...rest}
>
	<div class="art" aria-hidden="true">
		{#if technique === 'mesh'}
			<div class="mesh" style:background-image={mesh}></div>
		{:else}
			{#each layout as blob, i (i)}
				{@const timing = blobTiming(blob, speed)}
				<span
					class="orbit"
					style:inset-inline-start="{blob.x}%"
					style:inset-block-start="{blob.y}%"
					style:--_orbit="{blob.orbit}cqmax"
					style:--_duration="{timing.duration}s"
					style:--_delay="{timing.delay}s"
					style:--_direction={timing.reverse ? 'reverse' : 'normal'}
				>
					<span
						class="blob"
						style:--_color="var(--aurora-c{blob.color})"
						style:--_breathe-delay="{(-i * clock) / 7}s"
					></span>
				</span>
			{/each}
		{/if}
		{#if grain > 0}
			<NoiseLayer opacity={grain} blendMode="overlay" baseFrequency={0.85} numOctaves={3} />
		{/if}
	</div>
	{@render children?.()}
</div>

<style>
	/*
	 * Registered custom properties. A registered property has a type, so the browser can
	 * interpolate it (and every gradient that uses it) frame by frame. Unregistered custom
	 * properties are just token lists and would flip from one value to the next halfway through.
	 */
	@property --aurora-t {
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}

	@property --aurora-falloff {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 100%;
	}

	@property --aurora-c0 {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	@property --aurora-c1 {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	@property --aurora-c2 {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	@property --aurora-c3 {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	@property --aurora-c4 {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	.aurora {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		background: var(--aurora-bg, var(--_bg));
	}

	.art {
		/* Blob size, orbits and mesh positions are in container units of this layer. */
		container-type: size;
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		/* The blobs blend with this, so it has to be inside the same isolated group. */
		background: var(--aurora-bg, var(--_bg));

		--aurora-c0: var(--_p0);
		--aurora-c1: var(--_p1);
		--aurora-c2: var(--_p2, transparent);
		--aurora-c3: var(--_p3, transparent);
		--aurora-c4: var(--_p4, transparent);
	}

	.art::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--aurora-scrim, none);
	}

	.animate.drift .art {
		animation: aurora-drift calc(var(--_clock) * 0.75) var(--ease-in-out) infinite alternate;
	}

	@keyframes aurora-drift {
		to {
			--aurora-c0: var(--_q0);
			--aurora-c1: var(--_q1);
			--aurora-c2: var(--_q2, transparent);
			--aurora-c3: var(--_q3, transparent);
			--aurora-c4: var(--_q4, transparent);
		}
	}

	/* mesh: every blob is one radial-gradient layer of this element */
	.mesh {
		/* Overscan, so a blur over the layer doesn't fade to transparent at the edges. */
		--_pad: calc(var(--_blur) * 2);

		position: absolute;
		inset: calc(var(--_pad) * -1);
		background-color: var(--aurora-bg, var(--_bg));
		background-blend-mode: var(--_blend);
	}

	/* No filter at all at 0: even blur(0) makes the browser set up a filter. */
	.blurred .mesh {
		filter: blur(var(--_blur));
	}

	.animate .mesh {
		animation:
			aurora-clock var(--_clock) linear infinite,
			aurora-breathe calc(var(--_clock) / 4) var(--ease-in-out) infinite alternate;
	}

	@keyframes aurora-clock {
		to {
			--aurora-t: 360deg;
		}
	}

	@keyframes aurora-breathe {
		from {
			--aurora-falloff: 70%;
		}
		to {
			--aurora-falloff: 100%;
		}
	}

	/* blobs: one element per blob, orbiting around a point to its right */
	.orbit {
		position: absolute;
		inline-size: var(--_size);
		aspect-ratio: 1;
		translate: -50% -50%;
		transform-origin: calc(50% + var(--_orbit)) 50%;
		mix-blend-mode: var(--_blend);
	}

	.blob {
		display: block;
		block-size: 100%;
		border-radius: 50%;
		/* Same falloff as a mesh layer, so overlapping blobs mix instead of covering each other. */
		background: radial-gradient(closest-side, var(--_color), transparent);
	}

	.blurred .blob {
		filter: blur(var(--_blur));
	}

	.animate .orbit {
		animation: aurora-orbit var(--_duration) linear var(--_delay) infinite var(--_direction);
	}

	.animate .blob {
		animation: aurora-pulse calc(var(--_clock) / 4) var(--ease-in-out) var(--_breathe-delay)
			infinite alternate;
	}

	@keyframes aurora-orbit {
		to {
			rotate: 360deg;
		}
	}

	@keyframes aurora-pulse {
		from {
			scale: 0.8;
		}
		to {
			scale: 1.05;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate.drift .art,
		.animate .mesh,
		.animate .orbit,
		.animate .blob {
			animation: none;
		}
	}
</style>
