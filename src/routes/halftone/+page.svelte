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
	import Halftone from '#lib/fx/halftone/Halftone.svelte';
	import {
		discreteTable,
		dotGradient,
		halftoneSchema,
		inkLayers,
		inkTables,
		quantizeCoefficients,
		sourceBlur,
		thresholdContrast
	} from '#lib/fx/halftone/halftone.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'landscape',
			options: ['landscape', ...scenes],
			group: 'Stage'
		},
		animate: {
			kind: 'toggle',
			label: 'Animate source',
			default: false,
			group: 'Stage',
			description: 'Re-screens every frame; expensive with large dots (big blur).'
		}
	});

	const halftone = new ParamState(halftoneSchema);
	const source = new ParamState(sourceSchema);

	function reset() {
		halftone.reset();
		source.reset();
	}

	// Only show the controls that apply to the current mode.
	let groups = $derived(['Mode', halftone.values.mode === 'halftone' ? 'Halftone' : 'Dither']);

	let cssCode = $derived.by(() => {
		const v = halftone.values;
		const layers = inkLayers(v.ink, v.paper);
		const stops = dotGradient().split(', ');
		return [
			`<div class="halftone">`,
			`  <div class="threshold">`,
			`    <div class="source"><!-- the image --></div>`,
			`    <div class="dots"></div>`,
			`  </div>`,
			...(v.monochrome
				? [
						`  <div class="ink invert"></div>`,
						`  <div class="ink lighten"></div>`,
						`  <div class="ink darken"></div>`
					]
				: []),
			`</div>`,
			``,
			`.halftone {`,
			`  position: relative;`,
			`  isolation: isolate; /* the ink layers blend only with the halftone */`,
			`  overflow: hidden;`,
			`}`,
			``,
			`.threshold, .source { height: 100%; }`,
			``,
			`.threshold {`,
			`  position: relative;`,
			`  overflow: hidden;`,
			`  background: rgb(50% 50% 50%); /* transparent parts count as paper */`,
			`  filter: contrast(${thresholdContrast(v.softness)}); /* threshold at 50 % */`,
			`}`,
			``,
			`.source {`,
			`  filter: ${v.monochrome ? 'grayscale(1) ' : ''}blur(${sourceBlur(v.dotSize)}px) brightness(0.5);`,
			`}`,
			``,
			`.dots {`,
			`  position: absolute;`,
			`  inset: -50%; /* oversized, so the rotated grid covers the corners */`,
			`  rotate: ${v.angle}deg;`,
			`  background: radial-gradient(circle farthest-corner,`,
			...stops.map((s, i) => `      ${s}${i < stops.length - 1 ? ',' : ''}`),
			`    ) center / ${v.dotSize}px ${v.dotSize}px;`,
			`  mix-blend-mode: plus-lighter;`,
			`}`,
			...(v.monochrome
				? [
						``,
						`/* black → ink, white → paper */`,
						`.ink { position: absolute; inset: 0; }`,
						`.invert  { background: ${layers.invert}; mix-blend-mode: difference; }`,
						`.lighten { background: ${layers.lighten}; mix-blend-mode: lighten; }`,
						`.darken  { background: ${layers.darken}; mix-blend-mode: darken; }`
					]
				: [])
		].join('\n');
	});

	let filterCode = $derived.by(() => {
		const v = halftone.values;
		const n = Number(v.matrixSize);
		const { k2, k3 } = quantizeCoefficients(v.levels);
		const table = discreteTable(v.levels);
		const inks = inkTables(v.ink, v.paper);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="dither" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			...(v.monochrome
				? [
						`    <feColorMatrix type="matrix" result="source" values="`,
						`      0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0`,
						`      0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />`
					]
				: []),
			...(v.dither
				? [
						`    <!-- ${n}×${n} Bayer thresholds, ${v.pixelSize}px per cell, as an SVG data URL -->`,
						`    <feImage href="data:image/svg+xml,…" x="0" y="0"`,
						`             width="${n * v.pixelSize}" height="${n * v.pixelSize}" result="cell" />`,
						`    <feTile in="cell" result="threshold" />`
					]
				: [`    <feFlood flood-color="#808080" result="threshold" />`]),
			`    <feComposite in="${v.monochrome ? 'source' : 'SourceGraphic'}" in2="threshold"`,
			`                 operator="arithmetic" k2="${+k2.toFixed(4)}" k3="${+k3.toFixed(4)}" />`,
			`    <feComponentTransfer>`,
			...['R', 'G', 'B'].map((c) => `      <feFunc${c} type="discrete" tableValues="${table}" />`),
			`    </feComponentTransfer>`,
			...(v.monochrome
				? [
						`    <feComponentTransfer> <!-- 0 → ink, 1 → paper -->`,
						...['R', 'G', 'B'].map(
							(c, i) => `      <feFunc${c} type="table" tableValues="${inks[i]}" />`
						),
						`    </feComponentTransfer>`
					]
				: []),
			`    <!-- keep the source's shape: the threshold layer is opaque -->`,
			`    <feComposite in2="SourceGraphic" operator="in" />`,
			`  </filter>`,
			`</svg>`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Halftone · Visual FX</title>
	<meta
		name="description"
		content="Halftone dots with CSS gradients and a contrast() threshold, and posterize with ordered Bayer dithering as an SVG filter, with an explanation of how both work."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Halftone demo">
	{#snippet header()}
		<StageHeader title="Halftone" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<Halftone {...halftone.values} class="halftone-stage">
			{#if source.values.source === 'landscape'}
				<Landscape />
			{:else}
				<Scene kind={source.values.source} animate={source.values.animate} class="halftone-scene" />
			{/if}
		</Halftone>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Halftone" code={halftone.markup('Halftone')} onreset={reset}>
			<ParamControls schema={halftoneSchema} bind:values={halftone.values} {groups} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Two ways to print with dots"
			lede="Printers fake grey with patterns of ink and bare paper. On the web there are two very different ways to get that look: a CSS trick that grows real round dots, and an SVG filter that quantizes pixels with a threshold pattern."
		>
			<h3>Mode 1: CSS halftone with a contrast() threshold</h3>
			<p>
				A halftone screen is a grid of dots whose size follows the image: big dots in the shadows,
				tiny ones in the highlights. The CSS version builds that from three layers and one filter:
			</p>
			<ol>
				<li>
					<strong>The source, blurred.</strong> <code>blur()</code> averages away detail smaller
					than a dot (here 0.3 × the dot size), <code>grayscale(1)</code> drops the color in
					monochrome mode, and <code>brightness(0.5)</code> squeezes the brightness L into 0–0.5.
				</li>
				<li>
					<strong>The dot grid.</strong> A <code>radial-gradient</code> tiled with
					<code>background-size</code>: black in the center of each cell, 50% grey at the corners.
					The layer is twice the size of the element and turned with <code>rotate</code>, which
					gives the screen angle.
				</li>
				<li>
					<strong>Add, then threshold.</strong> <code>mix-blend-mode: plus-lighter</code> adds the
					dot grid to the source. Every pixel now holds <code>g + L/2</code>, where g is its place
					in the dot gradient. Then <code>filter: contrast()</code> with a big factor (up to 100) on
					the parent pushes everything below 0.5 to black and everything above to white. A pixel
					ends up as ink when <code>g &lt; (1 − L)/2</code>: near the dot center in light areas,
					almost everywhere in dark ones. Each dot grows with the darkness around it.
				</li>
			</ol>
			<p>
				The gradient isn't linear. Its grey level grows with the <em>square</em> of the distance
				from the center (written out as thirteen color stops), so the dot <em>area</em>, not its
				radius, grows in step with darkness, the way a print screen works. Dots touch at about 79%
				darkness; after that the gradient closes the remaining holes in the corners.
				<em>Softness</em> lowers the contrast factor, which leaves a blurry rim around every dot.
			</p>
			<p>
				The output is black and white (or eight RGB/CMY colors when every channel is screened on its
				own). Ink and paper colors take three more full-size layers above it, all plain CSS blend
				modes working per channel: <code>difference</code> with white flips the channels where the
				ink is lighter than the paper, <code>lighten</code> with the smaller value lifts black to
				the ink,
				<code>darken</code> with the larger value pulls white down to the paper. For pure black and white
				that is exact, for any pair of colors.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>Mode 2: SVG posterize and ordered dither</h3>
			<p>
				Dithering works per pixel instead: every pixel becomes one of a few levels, and a fixed
				pattern of thresholds decides which way it rounds, so the share of lit pixels in a small
				area matches the original brightness.
			</p>
			<dl>
				<dt>feComponentTransfer</dt>
				<dd>
					With <code>type="discrete"</code>, n values in <code>tableValues</code> split the input into
					n equal bins and output the bin's value: a step function, which is posterize. Two levels give
					pure ink or paper, three add one middle tone, and so on.
				</dd>
				<dt>Bayer matrix</dt>
				<dd>
					The threshold pattern. It is generated recursively (<code
						>M₂ₙ = [[4M, 4M+2], [4M+3, 4M+1]]</code
					>), so every value appears once and neighboring cells are as different as possible. That
					spreads the lit pixels evenly and gives ordered dither its crosshatch look.
				</dd>
				<dt>feImage + feTile</dt>
				<dd>
					The matrix is written as a tiny SVG with one grey square per cell, passed to
					<code>&lt;feImage&gt;</code> as a data URL and repeated over the whole element by
					<code>&lt;feTile&gt;</code>. <em>Pattern pixel</em> sets the size of a cell in CSS pixels.
				</dd>
				<dt>feComposite</dt>
				<dd>
					<code>operator="arithmetic"</code> adds the threshold to the image before quantizing:
					<code>C′ = C·(L−1)/L + t/L</code> for L levels. A discrete table then picks level
					<code>⌊C·(L−1) + t⌋</code>, which is exactly ordered dither. Without dither the threshold
					is a flat 50% grey from <code>&lt;feFlood&gt;</code>, which turns the same math into plain
					rounding.
				</dd>
			</dl>
			<p>
				In monochrome mode a luminance <code>&lt;feColorMatrix&gt;</code> (Rec. 709 weights, as on
				the <a href={resolve('/duotone')}>duotone page</a>) runs first, and a last
				<code>type="table"</code> transfer maps 0 to the ink and 1 to the paper. A final
				<code>&lt;feComposite operator="in"&gt;</code>
				against
				<code>SourceGraphic</code> cuts the result back to the source's shape: the threshold pattern is
				opaque, so without it transparent parts of the source would come out with a faint pattern.
			</p>
			<CodeSnippet code={filterCode} />

			<h3>Which one looks how</h3>
			<ul>
				<li>
					<strong>Halftone</strong> looks like print: soft, round, resolution-independent dots at any
					angle. It loses fine detail on purpose (the blur), and because of the threshold it only knows
					two states per channel.
				</li>
				<li>
					<strong>Dither</strong> looks like early computer graphics: crisp, square, axis-aligned pixels.
					It keeps more detail and can do any number of levels, but the pattern is always on the pixel
					grid and doesn't rotate.
				</li>
				<li>
					Neither keeps text readable. Apply them to images and backgrounds, and keep real content
					outside the effect.
				</li>
			</ul>

			<h3>Browser support and costs</h3>
			<p class="note">
				Both modes were checked in Chromium and in Playwright's Firefox and WebKit builds, which
				rendered them the same; real Safari is untested. The CSS mode needs
				<code>mix-blend-mode: plus-lighter</code>, which all current engines support. The SVG mode
				relies on <code>&lt;feImage&gt;</code> loading a data URL inside a filter applied to HTML; it
				worked in all three.
			</p>
			<ul>
				<li>
					The CSS mode costs a blur, an extra blended layer and a filter over the whole element
					(plus three blended layers for ink and paper). Large dots mean a large blur radius, which
					is the expensive part, especially when the source is animated.
				</li>
				<li>
					The SVG mode is a handful of per-pixel operations with no blur, so it is cheap and its
					cost doesn't depend on the settings. Pattern cells are sized in CSS pixels, so on a
					high-DPI screen a 1px pattern cell covers several device pixels.
				</li>
				<li>
					Static sources are rendered once and cached; animated ones are re-screened every frame.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.halftone-stage),
	:global(.halftone-scene) {
		block-size: 100%;
	}
</style>
