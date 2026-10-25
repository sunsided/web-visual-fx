<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Duotone from '#lib/fx/duotone/Duotone.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import {
		contrastPivot,
		duotoneSchema,
		luminanceMatrix,
		stopsOf,
		tableValues
	} from '#lib/fx/duotone/duotone.js';
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

	const duotone = new ParamState(duotoneSchema);
	const source = new ParamState(sourceSchema);

	function reset() {
		duotone.reset();
		source.reset();
	}

	let stops = $derived(stopsOf(duotone.values));
	// CSS gradients can interpolate in linear light too, so the ramp matches the filter.
	let ramp = $derived(
		`linear-gradient(to right in ${duotone.values.colorSpace === 'linearRGB' ? 'srgb-linear' : 'srgb'}, ${stops.join(', ')})`
	);

	// Mirrors DuotoneFilter.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = duotone.values;
		const m = luminanceMatrix(v.contrast, contrastPivot(v.colorSpace));
		const rows = [0, 1, 2, 3].map((r) => m.slice(r * 5, r * 5 + 5).join(' '));
		const tables = tableValues(stops, v.colorSpace);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="duotone" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="${v.colorSpace}">`,
			`    <!-- luminance (Rec. 709) into R, G and B; alpha unchanged -->`,
			`    <feColorMatrix type="matrix" values="`,
			...rows.map((r) => `      ${r}`),
			`    " />`,
			`    <feComponentTransfer${v.amount < 1 ? ' result="mapped"' : ''}>`,
			...['R', 'G', 'B'].map(
				(c, i) => `      <feFunc${c} type="table" tableValues="${tables[i]}" />`
			),
			`    </feComponentTransfer>`,
			...(v.amount < 1
				? [
						`    <feComposite in="mapped" in2="SourceGraphic" operator="arithmetic"`,
						`                 k2="${v.amount}" k3="${+(1 - v.amount).toFixed(2)}" />`
					]
				: []),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	const cssCode = [`.photo {`, `  filter: url(#duotone);`, `}`].join('\n');
</script>

<svelte:head>
	<title>Duotone · Visual FX</title>
	<meta
		name="description"
		content="Duotone and gradient maps for any HTML with an SVG feColorMatrix and feComponentTransfer filter, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Duotone demo">
	{#snippet header()}
		<StageHeader title="Duotone" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<Duotone {...duotone.values} class="duotone-stage">
			{#if source.values.source === 'landscape'}
				<Landscape />
			{:else}
				<Scene kind={source.values.source} animate={source.values.animate} class="duotone-scene" />
			{/if}
		</Duotone>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Duotone" code={duotone.markup('Duotone')} onreset={reset}>
			<div class="ramp" style:background={ramp} aria-hidden="true"></div>
			<ParamControls schema={duotoneSchema} bind:values={duotone.values} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A gradient map in three filter primitives"
			lede="Photo editors call it a gradient map: throw away the colors, keep the brightness, and paint every brightness level with a color from a ramp. An SVG filter does the same to any HTML, live."
		>
			<h3>1. Luminance: feColorMatrix</h3>
			<p>
				<code>&lt;feColorMatrix type="matrix"&gt;</code> multiplies every pixel's
				<code>[R G B A 1]</code> with a 4×5 matrix. Each row computes one output channel as a
				weighted sum of the inputs plus an offset. To get brightness, all three color rows use the
				same weights: the Rec. 709 coefficients <code>0.2126 R + 0.7152 G + 0.0722 B</code>, which
				are also the ones sRGB and WCAG use. Green counts ten times as much as blue because our eyes
				are far more sensitive to it; a plain average would make blue skies look as bright as grass.
				The alpha row is <code>0 0 0 1 0</code>, so transparency passes through untouched.
			</p>
			<p>
				<em>Contrast</em> is folded into the same matrix: the weights are multiplied by the contrast
				and the offset column becomes <code>p − p × contrast</code>, which stretches the values
				around mid-grey p. In sRGB mode p is 0.5; in linearRGB mode it is 0.214, the linear-light
				value of the same grey (<code>#808080</code>), so the pivot doesn't jump when you switch.
				Results outside 0–1 are clamped, so high contrast pushes more of the image into the end
				colors.
			</p>

			<h3>2. The ramp: feComponentTransfer type="table"</h3>
			<p>
				<code>&lt;feComponentTransfer&gt;</code> sends each channel through its own function. With
				<code>type="table"</code> the function is a lookup table: n values in
				<code>tableValues</code> split the input range into n − 1 equal segments and interpolate linearly
				inside each. Since R, G and B now all hold the same luminance, the three tables together form
				a color ramp: the first value of each table is the shadow color's channel, the last one the highlight's,
				and an optional middle one the midtone's at 50% luminance. So the table values are simply the
				color stops, written channel by channel:
			</p>
			<dl>
				<dt>feFuncR</dt>
				<dd>the red channels of the stops, shadows to highlights</dd>
				<dt>feFuncG</dt>
				<dd>the green channels</dd>
				<dt>feFuncB</dt>
				<dd>the blue channels</dd>
			</dl>
			<p>
				Two stops make a classic duotone, three make a gradient map. More stops would work the same
				way; <code>type="discrete"</code> instead of <code>table</code> would turn the smooth ramp
				into hard bands (see the <a href={resolve('/halftone')}>halftone page</a> for that).
			</p>

			<h3>3. Mix with the original: feComposite arithmetic</h3>
			<p>
				Below an <em>Amount</em> of 1, <code>&lt;feComposite operator="arithmetic"&gt;</code>
				blends the mapped result with the untouched <code>SourceGraphic</code>:
				<code>result = k1·i1·i2 + k2·i1 + k3·i2 + k4</code>, here with <code>k2 = amount</code> and
				<code>k3 = 1 − amount</code>, a plain linear mix. At exactly 1 the primitive is left out.
			</p>
			<CodeSnippet code={filterCode} />
			<p>
				The filter applies to HTML with a single CSS declaration, on an image, a video, a gradient
				or a whole section of a page:
			</p>
			<CodeSnippet code={cssCode} />

			<h3>sRGB or linearRGB?</h3>
			<p>
				Filters compute in <code>linearRGB</code> by default, which is set with
				<code>color-interpolation-filters</code>. The choice changes two things here:
			</p>
			<ul>
				<li>
					<strong>What gets measured.</strong> In <code>sRGB</code> the weights apply to the
					gamma-encoded numbers, which strictly speaking gives <em>luma</em>, the value video
					systems use. In
					<code>linearRGB</code> the browser first decodes to linear light, so the same weights give
					true relative luminance. Linear luminance is small for most colors (mid-grey
					<code>#808080</code> is only 0.22), so the image slides towards the shadow end of the ramp.
				</li>
				<li>
					<strong>How the ramp blends.</strong> The table interpolates in the filter's color space.
					Blending in linear light gives brighter, more saturated in-betweens, like mixing real
					light; sRGB blending looks like a CSS gradient. The ramp in the control panel uses
					<code>linear-gradient(in srgb-linear, …)</code> or <code>in srgb</code> to match.
				</li>
			</ul>
			<p class="note">
				The stop colors you pick are sRGB. In linearRGB mode the component converts them to linear
				values before writing <code>tableValues</code>; otherwise the browser would read the sRGB
				numbers as linear ones, and even pure shadow and highlight pixels would come out in the
				wrong color. sRGB is the default here because it matches what designers expect from
				Photoshop's gradient map.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				<code>filter: url(#id)</code> pointing at an inline SVG filter works on HTML elements in all current
				engines, and these three primitives are among the oldest and best supported. Checked in Chromium
				and in Playwright's Firefox and WebKit builds, which rendered the same; real Safari is untested.
			</p>
			<ul>
				<li>
					The filter runs per pixel over the whole element. On static content the result is cached,
					so it costs nothing after the first paint. Animated content (try <em>Animate source</em>)
					makes the browser rerun it on every frame; these primitives are cheap, but it still adds
					up on big, high-DPI areas.
				</li>
				<li>
					Text inside the filtered element is recolored too, which can wreck its contrast. Put the
					filter on the image or background layer, not on the content that has to stay readable.
				</li>
				<li>
					For a single static image, baking the effect into the file is cheaper still. The filter
					wins when the colors change with a theme or when the source is live HTML.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.duotone-stage),
	:global(.duotone-scene) {
		block-size: 100%;
	}

	.ramp {
		block-size: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}
</style>
