<!--
@component
A field of drifting blobs that melt into each other where they meet (SVG goo filter).
Fills its container; give that container a size. Anything passed as children is rendered
inside the filtered layer and melts with the blobs (position it absolutely; it's decorative).

The drift is a CSS animation: it stops under `prefers-reduced-motion` and inside a
`data-motion="paused"` region (see `MotionToggle`). The whole field is `aria-hidden`.

Tokens: `--gooey-bg` (background behind the goo, outside the filter).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import GooFilter from './GooFilter.svelte';
	import { gooeyDefaults as d, makeBlobs, type GooeyOptions } from './gooey';

	type Props = Partial<GooeyOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof GooeyOptions> & {
			children?: Snippet;
		};

	let {
		blur = d.blur,
		sharpness = d.sharpness,
		offset = d.offset,
		keepColors = d.keepColors,
		region = d.region,
		count = d.count,
		size = d.size,
		speed = d.speed,
		colorA = d.colorA,
		colorB = d.colorB,
		seed = d.seed,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `goo-${uid}`;

	let blobs = $derived(makeBlobs(count, seed));

	const colorAt = (mix: number) =>
		`color-mix(in oklch, ${colorB} ${Math.round(mix * 100)}%, ${colorA})`;
</script>

<div class={['gooey', className]} aria-hidden="true" {...rest}>
	<svg class="defs">
		<GooFilter id={filterId} {blur} {sharpness} {offset} {keepColors} {region} />
	</svg>
	<div class="goo" style:filter="url(#{filterId})">
		{#each blobs as blob, i (i)}
			<span
				class="blob"
				style:--_x="{blob.x}%"
				style:--_y="{blob.y}%"
				style:--_dx={blob.dx}
				style:--_dy={blob.dy}
				style:--_size="{size * blob.scale}px"
				style:--_duration="{blob.duration / speed}s"
				style:--_delay="{blob.delay / speed}s"
				style:--_color={colorAt(blob.mix)}
			></span>
		{/each}
		{@render children?.()}
	</div>
</div>

<style>
	.gooey {
		position: relative;
		container-type: size;
		block-size: 100%;
		overflow: hidden;
		background: var(--gooey-bg, transparent);
	}

	/* Not display: none: Firefox ignores filters defined inside an undisplayed <svg>. */
	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	.goo {
		position: absolute;
		inset: 0;
	}

	.blob {
		position: absolute;
		inset-inline-start: var(--_x);
		inset-block-start: var(--_y);
		inline-size: var(--_size);
		aspect-ratio: 1;
		margin: calc(var(--_size) / -2);
		border-radius: 50%;
		background: var(--_color);
		animation: drift var(--_duration) var(--ease-in-out) var(--_delay) infinite alternate;
	}

	/* Drift offsets are in % of the field (container query units), not of the blob. */
	@keyframes drift {
		to {
			translate: calc(var(--_dx) * 1cqi) calc(var(--_dy) * 1cqb);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.blob {
			animation: none;
		}
	}
</style>
