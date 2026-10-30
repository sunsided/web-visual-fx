<script lang="ts">
	import { resolve } from '$app/paths';
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import Pixelate from '#lib/fx/pixelate/Pixelate.svelte';
	import {
		effectiveSize,
		isShaped,
		mosaicCell,
		pixelateSchema,
		tileShape
	} from '#lib/fx/pixelate/pixelate.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'landscape',
			options: ['landscape', ...scenes],
			group: 'Stage',
			description: 'Anything can go through the filter: an SVG illustration, gradients, text.'
		},
		animate: {
			kind: 'toggle',
			label: 'Animate source',
			default: false,
			group: 'Stage',
			description: 'The filter is then recomputed on every frame.'
		}
	});

	const pixelate = new ParamState(pixelateSchema);
	const source = new ParamState(sourceSchema);

	function reset() {
		pixelate.reset();
		source.reset();
	}

	// The resolve demo: the page tweens `size` itself, from very coarse down to sharp and back.
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');
	const resolveSize = new Tween(1, { easing: cubicOut });
	let resolving = $state(false);
	let stageSize = $derived(resolving ? resolveSize.current : pixelate.values.size);

	async function playResolve() {
		resolving = true;
		const duration = reducedMotion.current ? 0 : 1600;
		await resolveSize.set(48, { duration: 0 });
		await resolveSize.set(1, { duration });
		await new Promise((r) => setTimeout(r, reducedMotion.current ? 0 : 900));
		await resolveSize.set(pixelate.values.size, { duration: reducedMotion.current ? 0 : 500 });
		resolving = false;
	}

	// Mirrors PixelateFilter.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = pixelate.values;
		const c = mosaicCell(v.size);
		const shaped = isShaped(v.gap, v.roundness);
		const t = tileShape(c.size, v.gap, v.roundness);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="pixelate" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			`    <!-- one ${c.dot}×${c.dot} dot, ${c.offset}px in from the corner of a ${c.size}px cell -->`,
			`    <feFlood x="${c.offset}" y="${c.offset}" width="${c.dot}" height="${c.dot}" flood-color="#fff" result="dot" />`,
			`    <!-- crop to exactly one cell, so feTile repeats it every ${c.size}px -->`,
			`    <feComposite in="dot" in2="dot" x="0" y="0" width="${c.size}" height="${c.size}" result="cell" />`,
			`    <feTile in="cell" result="dots" />`,
			`    <!-- keep the source only under the dots: one sample per block -->`,
			`    <feComposite in="SourceGraphic" in2="dots" operator="in" result="samples" />`,
			`    <!-- grow every sample into its block: ${c.dot} + 2 × ${c.radius} = ${c.size} -->`,
			`    <feMorphology in="samples" operator="dilate" radius="${c.radius}" result="blocks" />`,
			...(shaped
				? [
						`    <!-- tile mask: a ${t.side}px square with rx ${t.rx}, centered in the cell -->`,
						`    <feImage href="data:image/svg+xml,…" x="0" y="0" width="${c.size}" height="${c.size}" result="shape" />`,
						`    <feTile in="shape" result="mask" />`,
						`    <feComposite in="blocks" in2="mask" operator="in" result="tiles" />`,
						...(v.fillGrout
							? [
									`    <feFlood flood-color="${v.grout}" result="grout" />`,
									`    <feMerge>`,
									`      <feMergeNode in="grout" />`,
									`      <feMergeNode in="tiles" />`,
									`    </feMerge>`
								]
							: [])
					]
				: []),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	let maskCode = $derived.by(() => {
		const v = pixelate.values;
		const c = mosaicCell(v.size);
		const t = tileShape(c.size, v.gap, v.roundness);
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.size}" height="${c.size}">\n  <rect x="${t.inset}" y="${t.inset}" width="${t.side}" height="${t.side}" rx="${t.rx}" fill="white" />\n</svg>`;
	});

	const cssCode = [`.censored {`, `  filter: url(#pixelate);`, `}`].join('\n');

	const tweenCode = [
		`<script>`,
		`  import { Tween } from 'svelte/motion';`,
		`  import { Pixelate } from '@sunsided/web-visual-fx/svelte';`,
		``,
		`  const size = new Tween(48, { duration: 1600 });`,
		'<' + '/script>',
		``,
		`<button onclick={() => size.set(1)}>Reveal</button>`,
		`<Pixelate size={size.current}>…</Pixelate>`
	].join('\n');
</script>

<svelte:head>
	<title>Pixelate · Visual FX</title>
	<meta
		name="description"
		content="Pixelate and mosaic any HTML with a pure SVG sample-and-hold filter (feFlood, feTile, feComposite, feMorphology), with tiles, grout and a reveal transition, and an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Pixelate demo">
	{#snippet header()}
		<StageHeader title="Pixelate" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage">
			<Pixelate {...pixelate.values} size={stageSize} class="pixelate-stage">
				{#if source.values.source === 'landscape'}
					<Landscape />
				{:else}
					<Scene
						kind={source.values.source}
						animate={source.values.animate}
						class="pixelate-scene"
					/>
				{/if}
			</Pixelate>
			<div class="actions">
				<Button size="sm" onclick={playResolve} disabled={resolving}>Play resolve</Button>
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Pixelate" code={pixelate.markup('Pixelate')} onreset={reset}>
			<ParamControls schema={pixelateSchema} bind:values={pixelate.values} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A mosaic from five filter primitives"
			lede="SVG filters have no 'pixelate' primitive, and no way to read one pixel and paint it over a whole square. But they can keep a grid of single pixels and grow each one until it fills its cell, which is exactly what a mosaic is."
		>
			<h3>1. A grid of dots: feFlood, feComposite, feTile</h3>
			<p>
				<code>&lt;feFlood&gt;</code> paints a solid color over its <em>primitive subregion</em>,
				which is set with <code>x</code>, <code>y</code>, <code>width</code> and
				<code>height</code>. Shrunk to a single pixel, it is a dot. The next
				<code>&lt;feComposite&gt;</code> doesn't change any pixels; its only job is its subregion,
				exactly one block (<code>width = height = size</code>), with the dot inside.
				<code>&lt;feTile&gt;</code> repeats its input's subregion across the whole filter region, so the
				result is one white dot per block.
			</p>

			<h3>2. Sample: feComposite operator="in"</h3>
			<p>
				<code>operator="in"</code> keeps the first input only where the second one is opaque. With
				the source as the first input and the dots as the second, every block now holds one pixel of
				the content, the one at its center, and nothing else. This is the <em>sample</em> half of sample-and-hold:
				the colors are not averaged, they are picked, which is why thin lines can vanish or flicker in
				and out as the content moves.
			</p>

			<h3>3. Hold: feMorphology dilate</h3>
			<p>
				<code>&lt;feMorphology operator="dilate"&gt;</code> replaces each pixel with the maximum of
				its neighborhood, a square of <code>2 × radius + 1</code> pixels. Around a lone sample that
				maximum is the sample itself, so it grows into a square of its own color. The radius has to
				be chosen so the squares fill the blocks exactly: a d×d dot dilated by r becomes
				<code>d + 2r</code> wide. A one-pixel dot only reaches odd sizes, so even blocks sample a 2×2
				dot instead. If the squares overlapped, dilate would keep the larger value of each channel where
				they meet and a bright neighbor would bleed in.
			</p>
			<CodeSnippet code={filterCode} />
			<p>Like every SVG filter, it applies to HTML with one declaration:</p>
			<CodeSnippet code={cssCode} />

			<h3>4. Tiles and grout: a tiled mask</h3>
			<p>
				With a <em>Gap</em> or <em>Roundness</em> the blocks get a shape. One cell of a mask is
				drawn as a tiny SVG, a white (rounded) square on transparent, loaded with
				<code>&lt;feImage&gt;</code> and repeated with another <code>&lt;feTile&gt;</code>. A second
				<code>feComposite in</code> cuts the blocks to that shape, and a flood of the grout color merged
				underneath fills the gaps. Without grout the gaps stay transparent. Roundness 1 gives circles,
				which reads as an LED wall or a bead mosaic.
			</p>
			<CodeSnippet code={maskCode} />

			<h3>5. Censor and reveal</h3>
			<p>
				Filter attributes can't be transitioned with CSS, so the block size is animated from script:
				each frame sets a new <code>radius</code> and cell size, and the browser reruns the filter.
				The sizes are rounded to whole pixels, which gives the stepped "resolve" look of old TV
				censoring rather than a smooth blur. At size 1 the filter is removed altogether.
				<code>reveal="hover"</code> does this on pointer hover and keyboard focus inside the
				element; <em>Play resolve</em> above drives <code>size</code> with a
				<code>Tween</code> instead. Under reduced motion both jump straight to the end.
			</p>
			<CodeSnippet code={tweenCode} />
			<p class="note">
				Pixelation is not redaction. The original stays in the DOM, in the accessibility tree and in
				the page's source, and pixelated text can often be read back by trying candidate texts until
				one pixelates the same way. Use it for spoilers and playful reveals; remove real secrets
				before they reach the browser.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				All primitives used here are part of SVG filters, which are Baseline widely available since
				July 2015, <code>feMorphology</code> and <code>feTile</code> included. Checked in Chromium
				only (current block size: {effectiveSize(stageSize)}px); Firefox and Safari are untested.
			</p>
			<ul>
				<li>
					The chain is cheap: a flood, a tile, a composite and a dilate. Dilation cost grows with
					the radius, but block sizes of a few dozen pixels are fine. On static content the result
					is cached; animated content (try <em>Animate source</em>) or a running reveal reruns it on
					every frame.
				</li>
				<li>
					Filters work in CSS pixels and render at device resolution, so a 12px block is 24 device
					pixels on a 2× screen. At fractional zoom levels the grid may not land on whole device
					pixels and block edges can look slightly soft (unverified).
				</li>
				<li>
					For the "8-bit" look, combine it with a palette: put the
					<a href={resolve('/halftone')}>dither filter</a> inside the mosaic so each block gets one posterized
					color.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		position: relative;
		block-size: 100%;
	}

	:global(.pixelate-stage),
	:global(.pixelate-scene) {
		block-size: 100%;
	}

	.actions {
		position: absolute;
		inset-block-end: var(--space-4);
		inset-inline-start: var(--space-4);
	}
</style>
