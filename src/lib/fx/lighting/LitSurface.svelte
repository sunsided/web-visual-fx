<!--
@component
A plaster/paper surface lit by a movable light (SVG lighting filters). Fills its container.
Children become the relief: their alpha (not their color) is blurred into a height map, so
text or shapes inside come out as raised, embossed forms. The relief is `aria-hidden`; give the
component a `role="img"` and `aria-label` if it carries meaning.

The light rests at `lightX`/`lightY` (% of the surface). With `followPointer`, it follows a
hovering pointer (at most once per frame) and eases back to rest when the pointer leaves.
A click or tap moves the resting position there; `lightX`/`lightY` are bindable for that.
Keyboard control is up to the page (e.g. sliders or arrow keys that change `lightX`/`lightY`);
a change takes over from a hovering pointer until the pointer moves again.

Tokens: `--lit-marker-color` (the dot marking the light position).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import LightingFilter from './LightingFilter.svelte';
	import {
		lerpPoint,
		lightingDefaults as d,
		percentToPx,
		pxToPercent,
		type LightingOptions,
		type Point
	} from './lighting';

	type Props = Partial<LightingOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof LightingOptions> & {
			/** Measured size of the surface in px (read-only, bindable). */
			width?: number;
			height?: number;
			children?: Snippet;
		};

	let {
		lightType = d.lightType,
		followPointer = d.followPointer,
		lightX = $bindable(d.lightX),
		lightY = $bindable(d.lightY),
		elevation = d.elevation,
		coneAngle = d.coneAngle,
		lightingColor = d.lightingColor,
		showMarker = d.showMarker,
		relief = d.relief,
		surfaceColor = d.surfaceColor,
		surfaceScale = d.surfaceScale,
		bumpFrequency = d.bumpFrequency,
		bumpOctaves = d.bumpOctaves,
		bumpSeed = d.bumpSeed,
		bumpAmount = d.bumpAmount,
		shapeBlur = d.shapeBlur,
		diffuseConstant = d.diffuseConstant,
		specular = d.specular,
		specularConstant = d.specularConstant,
		specularExponent = d.specularExponent,
		width = $bindable(0),
		height = $bindable(0),
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `lit-${uid}`;
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	let el = $state<HTMLDivElement>();
	let resting = $derived(percentToPx({ x: lightX, y: lightY }, { width, height }));
	// Where a hovering pointer puts the light (px); undefined = at rest. It remembers the resting
	// position it was set against: once lightX/lightY change (keys, sliders, a click), the pointer
	// position is stale and the new resting position wins until the pointer moves again.
	let pointer = $state<Point & { rest: string }>();
	let restKey = $derived(`${lightX},${lightY}`);
	let light = $derived(pointer && pointer.rest === restKey ? pointer : resting);

	let frame = 0;
	let easing = false;
	let latest: PointerEvent | undefined;

	function local(e: MouseEvent): Point {
		const r = el!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	// Every change of the light re-renders the whole filter, so coalesce pointermoves per frame.
	function move(e: PointerEvent) {
		if (!followPointer) return;
		if (easing) {
			// The pointer came back while the light was easing home: pick it up from here.
			cancelAnimationFrame(frame);
			frame = 0;
			easing = false;
		}
		latest = e;
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (latest) pointer = { ...local(latest), rest: restKey };
		});
	}

	function leave() {
		cancelAnimationFrame(frame);
		frame = 0;
		latest = undefined;
		if (!pointer || pointer.rest !== restKey || reducedMotion.current) {
			pointer = undefined;
			return;
		}
		// Ease back to rest instead of jumping, which would change the whole surface at once.
		const from = pointer;
		const start = performance.now();
		easing = true;
		frame = requestAnimationFrame(function tick(now) {
			const t = Math.min(1, (now - start) / 300);
			if (t >= 1) {
				frame = 0;
				easing = false;
				pointer = undefined;
				return;
			}
			pointer = { ...lerpPoint(from, resting, 1 - (1 - t) ** 3), rest: from.rest };
			frame = requestAnimationFrame(tick);
		});
	}

	function park(e: MouseEvent) {
		const p = pxToPercent(local(e), { width, height });
		lightX = Math.round(p.x);
		lightY = Math.round(p.y);
	}

	$effect(() => () => cancelAnimationFrame(frame));
</script>

<!-- Pointer convenience; the page provides the keyboard path by changing lightX/lightY. -->
<div
	bind:this={el}
	class={['lit', className]}
	bind:clientWidth={width}
	bind:clientHeight={height}
	onpointerenter={move}
	onpointermove={move}
	onpointerleave={leave}
	onpointercancel={leave}
	onclick={park}
	{...rest}
>
	<svg class="defs" aria-hidden="true">
		<LightingFilter
			id={filterId}
			{light}
			{width}
			{height}
			{lightType}
			{elevation}
			{coneAngle}
			{lightingColor}
			{relief}
			{surfaceColor}
			{surfaceScale}
			{bumpFrequency}
			{bumpOctaves}
			{bumpSeed}
			{bumpAmount}
			{shapeBlur}
			{diffuseConstant}
			{specular}
			{specularConstant}
			{specularExponent}
		/>
	</svg>
	<div class="relief" aria-hidden="true" style:filter="url(#{filterId})">
		{@render children?.()}
	</div>
	{#if showMarker && width > 0}
		<span class="marker" aria-hidden="true" style:translate="{light.x}px {light.y}px"></span>
	{/if}
</div>

<style>
	.lit {
		position: relative;
		overflow: hidden;
		block-size: 100%;
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	/* Only the alpha of the content matters; the filter paints the whole box. */
	.relief {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: black;
	}

	.marker {
		position: absolute;
		inset: 0 auto auto 0;
		inline-size: 14px;
		block-size: 14px;
		margin: -7px;
		border: 2px solid var(--lit-marker-color, oklch(25% 0.02 60));
		border-radius: 50%;
		background: oklch(100% 0 0 / 0.8);
		pointer-events: none;
	}
</style>
