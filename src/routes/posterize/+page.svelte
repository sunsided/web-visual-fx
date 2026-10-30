<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import { convolveAttrs, edgeKernels, thresholdLinear } from '#lib/fx/edges/edges.js';
	import StickerArt from '#lib/fx/outline/StickerArt.svelte';
	import Posterize from '#lib/fx/posterize/Posterize.svelte';
	import ShadedScene from '#lib/fx/posterize/ShadedScene.svelte';
	import {
		EDGE_TO_ALPHA,
		bands,
		posterizeSchema,
		posterizeTable
	} from '#lib/fx/posterize/posterize.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'spheres',
			options: ['spheres', 'landscape', 'rocket', ...scenes],
			group: 'Stage',
			description: 'Smooth shading shows the bands best; flat artwork mostly keeps its colors.'
		},
		animate: {
			kind: 'toggle',
			label: 'Animate source',
			default: false,
			group: 'Stage',
			description: 'The filter is then recomputed on every frame.'
		}
	});

	const posterize = new ParamState(posterizeSchema);
	const source = new ParamState(sourceSchema);

	function reset() {
		posterize.reset();
		source.reset();
	}

	const percent = (v: number) => `${+(v * 100).toFixed(2)}%`;

	// A grey ramp before and after: the bands as CSS hard stops, measured on a perceptual ramp.
	let ramp = $derived(
		`linear-gradient(to right, ${bands(posterize.values.levels, posterize.values.colorSpace)
			.map(({ from, to, value }) => {
				const g = Math.round(value * 255);
				return `rgb(${g} ${g} ${g}) ${percent(from)} ${percent(to)}`;
			})
			.join(', ')})`
	);

	// Mirrors PosterizeFilter.svelte / EdgeMagnitude.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = posterize.values;
		const table = posterizeTable(v.levels);
		const src = v.smoothing > 0 ? 'soft' : 'SourceGraphic';
		const cut = thresholdLinear(v.inkThreshold);
		const kernels = edgeKernels('sobel', '3').map((k) => convolveAttrs(k, v.inkStrength));
		const fn = (attrs: string) => ['R', 'G', 'B'].map((c) => `      <feFunc${c} ${attrs} />`);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="posterize" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="${v.colorSpace}">`,
			...(v.smoothing > 0
				? [`    <feGaussianBlur stdDeviation="${v.smoothing}" result="soft" />`]
				: []),
			`    <feColorMatrix in="${src}" type="saturate" values="${v.saturation}" />`,
			`    <feComponentTransfer result="flat">`,
			...fn(`type="discrete" tableValues="${table}"`),
			`      <feFuncA type="linear" slope="0" intercept="1" />`,
			`    </feComponentTransfer>`,
			...(v.inkEdges
				? [
						`    <!-- ink: Sobel on R, G and B (alpha forced to 1) -->`,
						`    <feColorMatrix in="${src}" type="matrix" result="opaque"`,
						`                   values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" />`,
						...kernels.flatMap((k, i) => [
							`    <feConvolveMatrix in="opaque" order="3" kernelMatrix="${k.kernelMatrix}"`,
							`                      divisor="${k.divisor}" bias="0.5" edgeMode="duplicate" preserveAlpha="true" />`,
							`    <feComponentTransfer result="g${i}">`,
							...fn(`type="table" tableValues="1 0 1"`),
							`    </feComponentTransfer>`
						]),
						`    <feComposite in="g0" in2="g1" operator="arithmetic" k2="1" k3="1" />`,
						`    <feColorMatrix type="matrix"`,
						`                   values="0.5 0.5 0.5 0 0  0.5 0.5 0.5 0 0  0.5 0.5 0.5 0 0  0 0 0 1 0" />`,
						`    <feComponentTransfer>`,
						...fn(`type="linear" slope="${cut.slope}" intercept="${cut.intercept}"`),
						`    </feComponentTransfer>`,
						...(v.inkWidth > 0
							? [`    <feMorphology operator="dilate" radius="${v.inkWidth}" />`]
							: []),
						`    <!-- edge strength → coverage of a flat ink layer -->`,
						`    <feColorMatrix type="matrix" result="coverage"`,
						`                   values="${EDGE_TO_ALPHA}" />`,
						`    <feFlood flood-color="${v.ink}" />`,
						`    <feComposite in2="coverage" operator="in" result="ink" />`,
						`    <feMerge>`,
						`      <feMergeNode in="flat" />`,
						`      <feMergeNode in="ink" />`,
						`    </feMerge>`
					]
				: []),
			`    <!-- back to the source's shape -->`,
			`    <feComposite in2="SourceGraphic" operator="in" />`,
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	const cssCode = [`.poster {`, `  filter: url(#posterize);`, `}`].join('\n');
</script>

<svelte:head>
	<title>Posterize · Visual FX</title>
	<meta
		name="description"
		content="Posterize and cel shading for any HTML with an SVG feComponentTransfer discrete filter and optional feConvolveMatrix ink lines, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Posterize demo">
	{#snippet header()}
		<StageHeader title="Posterize" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<Posterize {...posterize.values} class="posterize-stage">
			{#if source.values.source === 'spheres'}
				<ShadedScene />
			{:else if source.values.source === 'landscape'}
				<Landscape />
			{:else if source.values.source === 'rocket'}
				<div class="rocket"><StickerArt /></div>
			{:else}
				<Scene
					kind={source.values.source}
					animate={source.values.animate}
					class="posterize-scene"
				/>
			{/if}
		</Posterize>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Posterize" code={posterize.markup('Posterize')} onreset={reset}>
			<div class="ramps" aria-hidden="true">
				<div class="ramp smooth"></div>
				<div class="ramp" style:background={ramp}></div>
			</div>
			<ParamControls schema={posterizeSchema} bind:values={posterize.values} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Fewer colors, on purpose"
			lede="Posterizing throws away tonal detail: every color channel snaps to a handful of levels, so smooth shading turns into flat bands, like a screen print or a cel-shaded cartoon. One SVG primitive does it; ink lines along the edges complete the toon look."
		>
			<h3>1. Quantize: feComponentTransfer type="discrete"</h3>
			<p>
				<code>&lt;feComponentTransfer&gt;</code> runs each channel through its own transfer
				function. With <code>type="discrete"</code> the function is a step function: n values in
				<code>tableValues</code> split the input range into n equal bins, and every input in bin k
				comes out as the k-th value. Listing n evenly spaced values from 0 to 1 gives n levels per
				channel with black and white both kept:
				<code>{posterizeTable(posterize.values.levels)}</code> for
				{posterize.values.levels} levels, up to {posterize.values.levels ** 3} colors in total.
			</p>
			<p>
				This is the same table the dither mode of the <a href={resolve('/halftone')}
					>halftone page</a
				>
				uses, but here it runs on R, G and B separately and keeps the hue, where halftone and
				<a href={resolve('/duotone')}>duotone</a> first reduce the image to luminance. That also means
				a channel can jump on its own: a gradient from orange to red crosses band borders in green only,
				which is where posterized images get their unexpected color steps.
			</p>

			<h3>2. Cleaner bands: blur and saturation first</h3>
			<ul>
				<li>
					<em>Smoothing</em> blurs before quantizing. Without it, every bit of texture or noise near
					a band border flips between two levels and the border frays. Blurred, the borders follow
					the large shapes, which is what makes it read as cel shading rather than as a low color
					depth. The blur also pulls transparent pixels into the border, so the transfer function
					forces alpha to 1 and a final
					<code>&lt;feComposite operator="in" in2="SourceGraphic"&gt;</code> cuts the result back to the
					source's shape.
				</li>
				<li>
					<em>Saturation</em> is an <code>&lt;feColorMatrix type="saturate"&gt;</code> before the steps.
					Quantizing tends to grey out mid-tones; a little extra saturation keeps the bands punchy.
				</li>
				<li>
					<em>Color space</em> decides where the bins sit. In <code>sRGB</code> they are even on the
					gamma-encoded values, which is close to even for the eye. In
					<code>linearRGB</code> they are even in light, so on a perceptual ramp the darkest band is the
					widest, as the second ramp in the control panel shows.
				</li>
			</ul>

			<h3>3. Ink lines: edges from the edge filter</h3>
			<p>
				The ink comes from the same primitives as the <a href={resolve('/edges')}
					>edges and sketch</a
				>
				page: two Sobel kernels in <code>&lt;feConvolveMatrix&gt;</code> with a bias of 0.5, folded
				to a magnitude by a <code>1 0 1</code> table and added up. Here they run on R, G and B separately
				and the three magnitudes are summed, because cartoon outlines sit between colors, and a red ball
				in front of a blue wall can have almost the same luminance as the wall. They read the smoothed
				source, not the bands, so lines follow shapes and not the shading steps.
			</p>
			<p>
				An <code>&lt;feColorMatrix&gt;</code> then moves the edge strength into alpha (<code
					>{EDGE_TO_ALPHA}</code
				>), which turns it into the coverage of a flat
				<code>&lt;feFlood&gt;</code> in the ink color, merged over the bands with
				<code>&lt;feMerge&gt;</code>.
			</p>
			<CodeSnippet code={filterCode} />
			<CodeSnippet code={cssCode} />

			<h3>Browser support and performance</h3>
			<p>
				SVG filters on HTML, including <code>feComponentTransfer</code> and
				<code>feConvolveMatrix</code>, have been Baseline widely available since July 2015
				(web-features, <code>svg-filters</code>). Checked in Chromium and Firefox; Safari is
				untested.
			</p>
			<ul>
				<li>
					Posterizing alone is one of the cheapest filters there is: a table lookup per channel.
					Smoothing adds a blur, and its cost grows with the radius.
				</li>
				<li>
					The ink lines add two 3×3 convolutions on three channels, a few cheap per-pixel steps and
					an optional dilate. Fine for static images, which are filtered once and cached; on
					animated, full-screen content it adds up.
				</li>
				<li>
					Kernels and dilation work on the browser's offscreen pixels, so on a high-DPI screen the
					lines are thinner in CSS pixels than at 1×.
				</li>
				<li>
					Text inside the filtered element is posterized and outlined too. Put the filter on images
					and illustrations, not on content that has to stay readable.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.posterize-stage),
	:global(.posterize-scene) {
		block-size: 100%;
	}

	.rocket {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-8);
		background: radial-gradient(circle at 30% 20%, #6c63a8, #1b1640);
	}

	.rocket :global(svg) {
		inline-size: min(80%, 30rem);
		block-size: auto;
	}

	.ramps {
		display: grid;
		gap: var(--space-1);
	}

	.ramp {
		block-size: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.smooth {
		background: linear-gradient(to right, black, white);
	}
</style>
