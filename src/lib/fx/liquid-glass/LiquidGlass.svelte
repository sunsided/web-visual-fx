<!--
@component
Refractive "liquid glass" lens: the backdrop is bent along a curved bezel while the flat center
stays undistorted, with a specular highlight and an optional chromatic fringe.

The displacement map is generated for the element's exact size and regenerated whenever it is
resized (ResizeObserver), because SVG filters work in px. Size the element yourself through
`class`/`style`. The refraction only renders in Chromium (see `../glass/support.ts`); elsewhere
the lens falls back to blur, tint and a CSS rim.

Content is laid out by you; it sits on top of a nearly clear tint, so give text its own
background to keep it readable.

Tokens: `--liquid-glass-padding`.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { hexToRgba } from '../glass/glass';
	import { supportsBackdropSvgFilter } from '../glass/support';
	import LensFilter from './LensFilter.svelte';
	import {
		displacementMap,
		liquidGlassDefaults as d,
		type LiquidGlassOptions
	} from './liquid-glass';

	type Props = Partial<LiquidGlassOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof LiquidGlassOptions> & {
			/** Use the SVG refraction even where it isn't known to render (see `support.ts`). */
			forceRefract?: boolean;
			children?: Snippet;
		};

	let {
		radius = d.radius,
		bezel = d.bezel,
		profile = d.profile,
		refraction = d.refraction,
		fringe = d.fringe,
		blur = d.blur,
		saturate = d.saturate,
		specular = d.specular,
		lightAngle = d.lightAngle,
		tint = d.tint,
		tintOpacity = d.tintOpacity,
		shadow = d.shadow,
		forceRefract = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `liquid-glass-${uid}`;

	// Decided after mount to keep the prerendered HTML deterministic.
	let detected = $state(false);
	onMount(() => (detected = supportsBackdropSvgFilter()));
	let canRefract = $derived(detected || forceRefract);

	// Border-box size in px, kept up to date by the ResizeObserver below.
	let size = $state({ width: 0, height: 0 });

	// Coalesces resize bursts (e.g. dragging a window edge) to one update per frame, and skips
	// updates that don't change the rounded size, since each one rebuilds and encodes the map.
	function observeSize(node: HTMLElement) {
		let raf = 0;
		let next = size;
		const observer = new ResizeObserver(([entry]) => {
			const box = entry.borderBoxSize[0];
			next = { width: Math.round(box.inlineSize), height: Math.round(box.blockSize) };
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				if (next.width !== size.width || next.height !== size.height) size = next;
			});
		});
		observer.observe(node);
		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	}

	// The map is built at device resolution, capped at 2×: at 1× the steep part of the bezel shows
	// steps. Browser zoom or moving to another screen changes devicePixelRatio without a resize,
	// so a media query for the current value tells us when it stops matching.
	let dpr = $state(1);

	onMount(() => {
		let query: MediaQueryList | undefined;
		const update = () => {
			query?.removeEventListener('change', update);
			dpr = devicePixelRatio;
			query = matchMedia(`(resolution: ${dpr}dppx)`);
			query.addEventListener('change', update);
		};
		update();
		return () => query?.removeEventListener('change', update);
	});

	// The map only depends on geometry; strength, fringe and light are filter attributes.
	let map = $derived.by(() => {
		const { width, height } = size;
		if (!canRefract || width === 0 || height === 0) return '';
		// Reading `dpr` subscribes to changes; the live value covers a missed media query event.
		const current = dpr > 0 ? devicePixelRatio : 1;
		const k = Math.min(2, Math.max(1, current));
		const w = Math.round(width * k);
		const h = Math.round(height * k);
		const data = displacementMap({
			width: w,
			height: h,
			radius: radius * k,
			bezel: bezel * k,
			profile
		});
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		canvas.getContext('2d')?.putImageData(new ImageData(data, w, h), 0, 0);
		return canvas.toDataURL('image/png');
	});

	let refracting = $derived(canRefract && map !== '');

	// Without refraction a little more blur stands in for it, so the lens still reads as glass.
	let backdrop = $derived(
		refracting
			? `blur(${blur}px) saturate(${saturate}) url(#${filterId})`
			: `blur(${Math.max(blur, 6)}px) saturate(${saturate})`
	);
</script>

<div
	class={['liquid-glass', className]}
	data-fallback={!refracting || undefined}
	style:--_radius="{radius}px"
	style:--_tint={hexToRgba(tint, tintOpacity)}
	style:--_shadow={shadow}
	style:--_backdrop={backdrop}
	{@attach observeSize}
	{...rest}
>
	{#if refracting}
		<svg class="defs" aria-hidden="true">
			<LensFilter
				id={filterId}
				width={size.width}
				height={size.height}
				{map}
				{refraction}
				{fringe}
				{bezel}
				{specular}
				{lightAngle}
			/>
		</svg>
	{/if}
	<div class="content">
		{@render children?.()}
	</div>
</div>

<style>
	.liquid-glass {
		position: relative;
		isolation: isolate;
		border-radius: var(--_radius);
		background: var(--_tint);
		-webkit-backdrop-filter: var(--_backdrop);
		backdrop-filter: var(--_backdrop);
		box-shadow: 0 calc(24px * var(--_shadow)) calc(48px * var(--_shadow))
			oklch(0% 0 0 / calc(var(--_shadow) * 0.6));
	}

	/* Without refraction: a CSS stand-in for the bezel, so the edge still reads as glass. */
	.liquid-glass[data-fallback] {
		box-shadow:
			0 calc(24px * var(--_shadow)) calc(48px * var(--_shadow))
				oklch(0% 0 0 / calc(var(--_shadow) * 0.6)),
			inset 2px 2px 1px oklch(100% 0 0 / 0.5),
			inset -2px -2px 1px oklch(100% 0 0 / 0.2),
			inset 0 0 24px oklch(100% 0 0 / 0.25);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	.content {
		position: relative;
		padding: var(--liquid-glass-padding, var(--space-4));
	}
</style>
