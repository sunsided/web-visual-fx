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
	import Edges from '#lib/fx/edges/Edges.svelte';
	import {
		ABS_TABLE,
		blendModeOf,
		convolveAttrs,
		edgeKernels,
		edgesSchema,
		embossKernel,
		grainCoefficients,
		rampTables,
		thresholdLinear,
		type Kernel
	} from '#lib/fx/edges/edges.js';
	import StickerArt from '#lib/fx/outline/StickerArt.svelte';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'landscape',
			options: ['landscape', 'rocket', ...scenes],
			group: 'Stage',
			description: 'Anything can go through the filter: an SVG illustration, gradients, text.'
		},
		animate: {
			kind: 'toggle',
			label: 'Animate source',
			default: false,
			group: 'Stage',
			description: 'The kernels then run again on every frame.'
		}
	});

	const edges = new ParamState(edgesSchema);
	const source = new ParamState(sourceSchema);

	function reset() {
		edges.reset();
		source.reset();
	}

	// Only show the controls that apply to the current mode.
	let groups = $derived(
		edges.values.mode === 'emboss'
			? ['Mode', 'Kernel', 'Emboss', 'Colors']
			: ['Mode', 'Kernel', 'Lines', 'Colors']
	);

	/** The kernels of the current mode, for the matrix display. */
	let kernels = $derived<[string, Kernel][]>(
		edges.values.mode === 'emboss'
			? [['emboss', embossKernel(edges.values.angle, edges.values.size)]]
			: edgeKernels(edges.values.operator, edges.values.size).map((k, i, all) => [
					all.length > 1 ? (i ? 'Gy' : 'Gx') : 'Laplacian',
					k
				])
	);

	// Mirrors EdgesFilter.svelte / EdgeMagnitude.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = edges.values;
		const emboss = v.mode === 'emboss';
		const tables =
			v.mode === 'edges' || emboss ? rampTables(v.ink, v.paper) : rampTables(v.paper, v.ink);
		const cut = thresholdLinear(v.threshold);
		const grain = grainCoefficients(v.texture);
		const grainy = !emboss && v.texture > 0;
		const edgeOut = grainy ? 'clean' : 'lines';
		const convolve = (k: Kernel, extra = '') => {
			const a = convolveAttrs(k, v.strength);
			return [
				`    <feConvolveMatrix in="luma" order="${a.order}" divisor="${a.divisor}" bias="0.5"`,
				`                      edgeMode="duplicate" preserveAlpha="true"${extra}`,
				`                      kernelMatrix="${a.kernelMatrix}" />`
			];
		};
		const fn = (type: string, attrs: (c: number) => string) =>
			['R', 'G', 'B'].map((c, i) => `      <feFunc${c} type="${type}" ${attrs(i)} />`);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="edges" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			...(v.smoothing > 0 ? [`    <feGaussianBlur stdDeviation="${v.smoothing}" />`] : []),
			...(v.channels === 'color' && !emboss
				? [
						`    <!-- keep R, G and B, alpha forced to 1 -->`,
						`    <feColorMatrix type="matrix" result="luma"`,
						`                   values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" />`
					]
				: [
						`    <!-- luminance into R, G and B, alpha forced to 1 -->`,
						`    <feColorMatrix type="matrix" result="luma" values="`,
						`      0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0`,
						`      0.2126 0.7152 0.0722 0 0  0 0 0 0 1" />`
					]),
			...(emboss
				? convolve(kernels[0][1], ' result="lines"')
				: [
						...kernels.flatMap(([name, k], i) => [
							`    <!-- ${name}: signed response around 0.5, folded to |2v − 1| -->`,
							...convolve(k),
							`    <feComponentTransfer result="g${i}">`,
							...fn('table', () => `tableValues="${ABS_TABLE}"`),
							`    </feComponentTransfer>`
						]),
						...(kernels.length > 1
							? [`    <feComposite in="g0" in2="g1" operator="arithmetic" k2="1" k3="1" />`]
							: []),
						...(v.channels === 'color'
							? [
									`    <!-- add up the three channels' edges -->`,
									`    <feColorMatrix type="matrix"`,
									`                   values="0.5 0.5 0.5 0 0  0.5 0.5 0.5 0 0  0.5 0.5 0.5 0 0  0 0 0 1 0" />`
								]
							: []),
						`    <!-- threshold -->`,
						`    <feComponentTransfer${v.lineWidth > 0 ? '' : ` result="${edgeOut}"`}>`,
						...fn('linear', () => `slope="${cut.slope}" intercept="${cut.intercept}"`),
						`    </feComponentTransfer>`,
						...(v.lineWidth > 0
							? [
									`    <feMorphology operator="dilate" radius="${v.lineWidth}" result="${edgeOut}" />`
								]
							: []),
						...(grainy
							? [
									`    <!-- pencil grain: lines · (1 − a + a · noise) -->`,
									`    <feTurbulence type="fractalNoise" baseFrequency="0.04 0.7" numOctaves="2" seed="7" />`,
									`    <feColorMatrix type="matrix" result="grain" values="`,
									`      3 0 0 0 -1  3 0 0 0 -1  3 0 0 0 -1  0 0 0 0 1" />`,
									`    <feComposite in="clean" in2="grain" operator="arithmetic"`,
									`                 k1="${grain.k1}" k2="${grain.k2}" result="lines" />`
								]
							: [])
					]),
			`    <!-- ${emboss ? 'relief' : 'edge strength'} onto two colors -->`,
			`    <feComponentTransfer in="lines" result="mapped">`,
			...fn('table', (i) => `tableValues="${tables[i]}"`),
			`    </feComponentTransfer>`,
			...(v.color > 0
				? [
						`    <feBlend in="${emboss ? 'lines' : 'mapped'}" in2="SourceGraphic" mode="${blendModeOf(v.mode)}" />`,
						...(v.color < 1
							? [
									`    <feComposite in2="mapped" operator="arithmetic"`,
									`                 k2="${v.color}" k3="${+(1 - v.color).toFixed(2)}" />`
								]
							: [])
					]
				: []),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	const cssCode = [`.drawing {`, `  filter: url(#edges);`, `}`].join('\n');
</script>

<svelte:head>
	<title>Edges and sketch · Visual FX</title>
	<meta
		name="description"
		content="Edge detection, pencil sketch and emboss on any HTML with SVG feConvolveMatrix kernels (Sobel, Laplacian), with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Edge detection demo">
	{#snippet header()}
		<StageHeader title="Edges and sketch" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<Edges {...edges.values} class="edges-stage">
			{#if source.values.source === 'landscape'}
				<Landscape />
			{:else if source.values.source === 'rocket'}
				<div class="rocket"><StickerArt /></div>
			{:else}
				<Scene kind={source.values.source} animate={source.values.animate} class="edges-scene" />
			{/if}
		</Edges>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Edges" code={edges.markup('Edges')} onreset={reset}>
			<div class="kernels" aria-label="Current convolution kernels">
				{#each kernels as [name, k] (name)}
					<figure>
						<table style:--n={k.length}>
							<tbody>
								{#each k as row, y (y)}
									<tr>
										{#each row as w, x (x)}
											<td class={{ pos: w > 0, neg: w < 0 }}>{+w.toFixed(2)}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
						<figcaption>{name}</figcaption>
					</figure>
				{/each}
			</div>
			<ParamControls schema={edgesSchema} bind:values={edges.values} {groups} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Edges are where neighbours disagree"
			lede="An edge is a place where brightness changes quickly. A convolution kernel measures exactly that, one pixel neighbourhood at a time, and SVG has a primitive for it: feConvolveMatrix. A few more primitives turn the measurement into pencil lines, glowing outlines or a raised relief."
		>
			<h3>1. Convolution: feConvolveMatrix</h3>
			<p>
				<code>&lt;feConvolveMatrix&gt;</code> slides a small grid of weights, the kernel, over the
				image. Each output pixel is the weighted sum of the pixels under the grid, divided by
				<code>divisor</code> and shifted by <code>bias</code>. The kernels shown in the control
				panel all sum to 0, so a flat area gives 0 and only changes in brightness produce a
				response.
			</p>
			<dl>
				<dt>Sobel</dt>
				<dd>
					two kernels: <code>Gx</code> compares the column right of a pixel with the one left of it,
					<code>Gy</code> the row below with the row above. The centre row/column counts double, which
					smooths a little across the edge. Each responds to edges in one direction; their magnitudes
					added together find edges in every direction.
				</dd>
				<dt>Laplacian</dt>
				<dd>
					one kernel: the pixel against all its neighbours (a second derivative). It finds every
					direction at once and catches finer detail, but draws a line on both sides of an edge and
					reacts more to noise. The 5×5 version is a Laplacian of Gaussian, which smooths first.
				</dd>
				<dt>Emboss</dt>
				<dd>
					one kernel weighted by each tap's offset along the light direction. It reads brightness as
					height and computes the slope towards the light, like Lambert shading: slopes that face
					the light come out bright, the others dark.
				</dd>
			</dl>
			<p>
				Everything runs on luminance: an <code>&lt;feColorMatrix&gt;</code> first writes the Rec.
				709 brightness (the weights the <a href={resolve('/duotone')}>duotone page</a> explains)
				into all three channels and forces alpha to 1. Transparent areas then count as black, so a
				transparent icon's silhouette is an edge too. <em>Pre-blur</em> adds an
				<code>&lt;feGaussianBlur&gt;</code> before it, so texture and noise don't become lines.
			</p>
			<p>
				Luminance misses edges between colors of the same brightness: a saturated red and a mid blue
				can be almost the same grey. <em>Detect on: color</em> skips the luminance step and lets the
				kernels run on R, G and B separately (they always do; on a grey image the three are just
				equal), then adds up the three magnitudes with half weight each in one more
				<code>&lt;feColorMatrix&gt;</code>. Emboss always works on luminance, since it reads
				brightness as height.
			</p>

			<h3>2. Keeping the negative half: bias and an absolute value</h3>
			<p>
				A gradient kernel is negative on one side of an edge and positive on the other, but filter
				results are clamped to 0–1, so the negative half would simply vanish. The fix is
				<code>bias="0.5"</code>: flat areas come out mid-grey, dark-to-light edges above it,
				light-to-dark edges below. The divisor is chosen so that a full black-to-white step moves
				the result by ±0.5 × <em>strength</em> (for Sobel 3×3 the step response is 4, so the divisor is
				8 / strength).
			</p>
			<p>
				An <code>&lt;feComponentTransfer&gt;</code> table with the values <code>1 0 1</code> then
				folds that back into a magnitude: the table interpolates linearly from 1 at 0 to 0 at 0.5
				and back to 1 at 1, which is exactly <code>|2v − 1|</code>. For Sobel, an
				<code>&lt;feComposite operator="arithmetic" k2="1" k3="1"&gt;</code> adds the two
				magnitudes, <code>|Gx| + |Gy|</code>, a cheap stand-in for the Euclidean length that filters
				can't compute.
			</p>

			<h3>3. From edge map to drawing</h3>
			<ul>
				<li>
					<em>Threshold</em> is a linear transfer function, <code>(v − t) / (1 − t)</code>: weak
					edges drop to 0, the rest is stretched back to full range.
				</li>
				<li>
					<em>Line weight</em> dilates the lines with <code>&lt;feMorphology&gt;</code> (the same
					primitive as the <a href={resolve('/outline')}>sticker outline</a>).
				</li>
				<li>
					<em>Pencil grain</em> multiplies the lines with stretched
					<code>&lt;feTurbulence&gt;</code>
					noise: <code>lines · (1 − a + a · noise)</code> as one arithmetic composite. Noise at low x
					and high y frequency gives long horizontal streaks, like graphite dragged across paper.
				</li>
				<li>
					A two-value table maps the result onto two colors. Sketch maps no edge to paper and strong
					edges to ink; edges mode is the same drawing inverted, paper-colored lines on an ink
					ground. Emboss maps the relief from ink (facing away) to paper (facing the light).
				</li>
				<li>
					<em>Original color</em> blends the drawing back onto the source with
					<code>&lt;feBlend&gt;</code>: <code>multiply</code> for the sketch (colored pencil),
					<code>screen</code> for the glowing edges, and <code>hard-light</code> with the raw grey relief
					for emboss, which brightens and darkens the original around mid-grey and leaves flat areas alone.
				</li>
			</ul>
			<CodeSnippet code={filterCode} />
			<CodeSnippet code={cssCode} />
			<p class="note">
				<code>color-interpolation-filters="sRGB"</code> is set on purpose. Filters compute in
				<code>linearRGB</code> by default, and in linear light the same difference in brightness is
				a much smaller number in the shadows than in the highlights, so dark edges would come out
				faint. <code>edgeMode="duplicate"</code> repeats the border pixels, so the element's own frame
				isn't detected as an edge.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				SVG filters on HTML, including <code>feConvolveMatrix</code>, have been Baseline widely
				available since July 2015 (web-features, <code>svg-filters</code>). Checked in Chromium and
				Firefox; Safari is untested.
			</p>
			<ul>
				<li>
					A kernel costs order² multiply-adds per pixel and channel: 9 for 3×3, 25 for 5×5. Sobel
					runs two kernels. That is cheap for a static image, which is filtered once and cached, but
					a 5×5 Sobel over an animated full-screen element adds up quickly.
				</li>
				<li>
					Without <code>kernelUnitLength</code> the kernel steps one pixel of the browser's offscreen
					image, which on a high-DPI screen is a device pixel: lines are as thin as the screen allows,
					and the same settings look finer at 2× than at 1×.
				</li>
				<li>
					The output is opaque and replaces the content, so put the filter on images and
					illustrations, not on text that has to be read. <code
						>filter: grayscale(1) contrast(2)</code
					>
					is a rough fallback where SVG filters are unavailable.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.edges-stage),
	:global(.edges-scene) {
		block-size: 100%;
	}

	.rocket {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-8);
		background: #2a2350;
	}

	.rocket :global(svg) {
		inline-size: min(80%, 30rem);
		block-size: auto;
	}

	.kernels {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		justify-content: center;
	}

	figure {
		margin: 0;
		text-align: center;
	}

	table {
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	td {
		min-inline-size: 2.6em;
		padding: 0.2em 0.3em;
		border: 1px solid var(--color-border);
		text-align: end;
		font-variant-numeric: tabular-nums;
	}

	td.pos {
		background: color-mix(in srgb, var(--color-accent) 22%, transparent);
	}

	td.neg {
		background: color-mix(in srgb, #e2364f 18%, transparent);
	}

	figcaption {
		margin-block-start: var(--space-1);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
</style>
