<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Caustics from '#lib/fx/caustics/Caustics.svelte';
	import PoolFloor from '#lib/fx/caustics/PoolFloor.svelte';
	import {
		DRIFT_SPEED,
		WARP_FREQUENCY_RATIO,
		causticsSchema,
		ridgeTable,
		warpTileSize
	} from '#lib/fx/caustics/caustics.js';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import { regionExtent, tileFrequency } from '#lib/fx/ripple/ripple.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Floor',
			default: 'pool',
			options: ['pool', 'landscape', ...scenes],
			group: 'Stage',
			description: 'What lies under the water. Any content works.'
		}
	});

	const fx = new ParamState(causticsSchema);
	const demo = new ParamState(stageSchema);
	let paused = $state(false);

	function reset() {
		fx.reset();
		demo.reset();
	}

	let table = $derived(ridgeTable(fx.values.lineWidth, 12));

	// Mirrors CausticsFilter.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = fx.values;
		const T = v.tileSize;
		const W = warpTileSize(T);
		const pad = Math.ceil(v.wobble / 2) + 2;
		const ext = regionExtent(0, W, pad);
		return [
			`<filter id="caustics" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"`,
			`        x="-${pad}" y="-${pad}" width="max(W, ${ext - 2 * pad}) + ${2 * pad}" height="…">`,
			`  <!-- moving tiled noise, as on the water ripple page: -->`,
			`  <!-- "cells": type="turbulence" baseFrequency="${tileFrequency(v.frequency, 1, T)}"`,
			`       numOctaves="${v.octaves}" on a ${T} px tile, drifting -->`,
			`  <!-- "surface": fractalNoise baseFrequency="${tileFrequency(v.frequency * WARP_FREQUENCY_RATIO, 1, W)}"`,
			`       on a ${W} px tile, two crossing layers -->`,
			``,
			`  <feDisplacementMap in="cells" in2="surface" scale="${v.warp}"`,
			`                     xChannelSelector="R" yChannelSelector="G" result="bent" />`,
			`  <feColorMatrix in="bent" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" />`,
			`  <feComponentTransfer>`,
			`    <feFuncA type="table" tableValues="${ridgeTable(v.lineWidth)}" />`,
			`  </feComponentTransfer>`,
			`  <feGaussianBlur stdDeviation="0.6" result="lines" />`,
			``,
			`  <feFlood flood-color="${v.lightColor}" />`,
			`  <feComposite in2="lines" operator="in" result="glow" />`,
			...(v.sheen > 0
				? [
						`  <feSpecularLighting in="lines" surfaceScale="3" specularExponent="20"`,
						`                      lighting-color="${v.lightColor}">`,
						`    <feDistantLight azimuth="225" elevation="55" />`,
						`  </feSpecularLighting>`,
						`  <feComposite in2="lines" operator="in" result="glint" />`,
						`  <feComposite in="glow" in2="glint" operator="arithmetic"`,
						`               k2="${v.intensity}" k3="${+(v.sheen * v.intensity).toFixed(3)}" result="light" />`
					]
				: [`  <feComposite in="glow" operator="arithmetic" k2="${v.intensity}" result="light" />`]),
			``,
			v.wobble > 0
				? `  <feDisplacementMap in="SourceGraphic" in2="surface" scale="${v.wobble}" … result="floor" />`
				: `  <feOffset in="SourceGraphic" result="floor" />`,
			...(v.tintOpacity > 0
				? [
						`  <feFlood flood-color="${v.tint}" flood-opacity="${v.tintOpacity}" />`,
						`  <feComposite in2="floor" operator="atop" result="floor" />`
					]
				: []),
			`  <feComposite in="light" in2="floor" operator="in" result="light" />`,
			`  <feBlend in="light" in2="floor" mode="screen" />`,
			`</filter>`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Caustics · Visual FX</title>
	<meta
		name="description"
		content="Animated pool-floor caustics over any content with SVG feTurbulence ridges, feComponentTransfer and feSpecularLighting, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Caustics demo">
	{#snippet header()}
		<StageHeader title="Caustics" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div
			class="motion"
			data-motion={paused ? 'paused' : 'running'}
			style:--_bleed="{Math.ceil(fx.values.wobble / 2) + 2}px"
		>
			<Caustics {...fx.values} class="layer">
				{#if demo.values.source === 'pool'}
					<PoolFloor />
				{:else if demo.values.source === 'landscape'}
					<Landscape />
				{:else}
					<Scene kind={demo.values.source} animate={false} class="caustics-scene" />
				{/if}
			</Caustics>
			<div class="center">
				<div class="card" data-theme="dark">
					<p class="eyebrow">Pool floor</p>
					<h2>Light through waves</h2>
					<p>
						Every curved wave on the surface is a small lens. Where they focus sunlight, the floor
						lights up in a moving net.
					</p>
					<MotionToggle bind:paused size="sm" />
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Caustics" code={fx.markup('Caustics')} onreset={reset}>
			<ParamControls schema={causticsSchema} bind:values={fx.values} />
			<ParamControls schema={stageSchema} bind:values={demo.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A light net from noise ridges"
			lede="Real caustics come from refraction: each wave bends sunlight a little, and where many rays land on the same spot the floor gets bright. Simulating that needs a shader. An SVG filter can fake the look instead: the bright lines are the places where a noise function crosses zero."
		>
			<h3>1. Ridges: feTurbulence type="turbulence"</h3>
			<p>
				<code>type="fractalNoise"</code> sums smooth noise around grey.
				<code>type="turbulence"</code> sums the <em>absolute</em> noise instead, so every place where
				the noise changes sign becomes a thin valley near 0, surrounded by higher values. With one octave
				those valleys form closed, curved cells, which is already the shape of a caustic net. More octaves
				add smaller valleys and make it choppier.
			</p>

			<h3>2. Keep only the ridges: feComponentTransfer</h3>
			<p>
				A <code>feColorMatrix</code> writes the noise's red channel into alpha and paints the colors
				white. Then <code>&lt;feFuncA type="table"&gt;</code> remaps alpha: input 0 (the valley)
				becomes 1, and everything above <em>Line width</em> becomes 0. In between it falls off as
				<code>(1 − x / width)²</code>, so the lines have a bright core and soft sides. The table is
				linear between its entries; 32 are plenty. With 12 entries, the current one would be:
			</p>
			<CodeSnippet code={table} />
			<p>
				The result is an alpha mask of thin, bright lines. A 0.6 px blur takes the hard pixel steps
				off, since the turbulence is computed at 8 bits and the steep table magnifies its banding.
			</p>

			<h3>3. Make it dance: feDisplacementMap</h3>
			<p>
				Sliding the net would look like a moving picture of a net. Real caustics change shape as the
				waves pass, so a second, smoother noise (the <em>surface</em>) bends the ridge pattern
				through <code>feDisplacementMap</code>, by up to half of <em>Warp</em> px. The surface is
				two crossing layers of fractal noise that travel in different directions, so its bends keep
				changing, and the net with them. The cells themselves only drift at
				{DRIFT_SPEED * 100}% of the speed.
			</p>
			<p>
				Both noises are computed on small tiles and slid with <code>feOffset</code>, the same trick
				the <a href={resolve('/ripple')}>water ripple</a> page explains in detail. The two tiles
				have different sizes ({fx.values.tileSize} and {warpTileSize(fx.values.tileSize)} px here), so
				their combination only repeats after a few thousand px and the tiling never lines up into a visible
				grid. With a smaller ridge tile the repeat does show on a wide screen, which is why the default
				is 384.
			</p>

			<h3>4. Light: feFlood and feSpecularLighting</h3>
			<p>
				<code>feFlood</code> in the light color, cut to the mask with
				<code>feComposite operator="in"</code>, is the flat light. For <em>Sheen</em>,
				<code>feSpecularLighting</code> treats the mask as a height map (the lines are ridges 3 px
				high) lit by a distant light from the upper left: one side of each line gets a sharper
				glint, which is what makes them look wet rather than painted on. The two are added with
				<code>feComposite operator="arithmetic"</code>, weighted by <em>Intensity</em>.
			</p>

			<h3>5. The floor</h3>
			<p>
				The content is displaced by the same surface noise (<em>Wobble</em>), so the floor moves in
				step with the light, then washed with the water color: an <code>feFlood</code> composited
				<code>atop</code>, which colors only where there is content. Last, the light is clipped to
				the floor and screened over it with <code>feBlend mode="screen"</code>, which can only
				brighten, like real light.
			</p>
			<CodeSnippet code={filterCode} />
			<p>
				On the page it is one CSS declaration, <code>filter: url(#caustics)</code>, plus the small
				loop from the ripple page that moves the <code>feOffset</code>s.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				Every primitive here is part of SVG filters on HTML, Baseline widely available since 2015.
				Checked in headless Chromium; Firefox and Safari are untested for this page.
			</p>
			<ul>
				<li>
					<strong>This is the heaviest filter in the collection.</strong> Each frame computes two noise
					tiles, two displacements, a lighting pass and several composites over the whole element. The
					frame rate is capped (30 fps by default), and the loop stops offscreen, in background tabs and
					inside a paused region (the button on the stage). Keep the element no bigger than it needs to
					be.
				</li>
				<li>
					<strong>Reduced motion.</strong> Under <code>prefers-reduced-motion: reduce</code> the net stands
					still; it still looks like a pool floor, it just doesn't move.
				</li>
				<li>
					<strong>Readability.</strong> Bright moving lines over text make it hard to read, and the tint
					lowers its contrast. Put the effect on a background layer, as here, with the text in a solid
					card on top. The flickering lines move slowly and smoothly, so they don't flash.
				</li>
				<li>
					<strong>Static alternative.</strong> If the motion isn't needed, a single rendered frame saved
					as an image costs nothing to show.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.motion {
		position: relative;
		display: grid;
		block-size: 100%;
		overflow: hidden;
	}

	.motion > :global(*) {
		grid-area: 1 / 1;
	}

	/* Bleed past the stage so the wobbly edges stay out of view. */
	.motion > :global(.layer) {
		margin: calc(var(--_bleed) * -1);
		min-block-size: 0;
	}

	.motion :global(.caustics-scene) {
		block-size: 100%;
	}

	.center {
		/* Positioned, so it paints above the filtered layer (a filter makes a stacking context). */
		position: relative;
		display: grid;
		place-items: center;
		padding: var(--space-6);
		pointer-events: none;
	}

	.card {
		inline-size: min(24rem, 85vw);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: oklch(22% 0.05 235 / 0.88);
		color: oklch(97% 0.01 220);
		pointer-events: auto;
	}

	.eyebrow {
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		opacity: 0.85;
	}

	h2 {
		margin-block: var(--space-2) var(--space-3);
		font-size: var(--text-xl);
	}

	.card p:not(.eyebrow) {
		margin-block-end: var(--space-3);
	}
</style>
