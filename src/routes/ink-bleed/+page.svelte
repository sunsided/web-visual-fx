<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import InkBleed from '#lib/fx/ink-bleed/InkBleed.svelte';
	import InkSample, { samples } from '#lib/fx/ink-bleed/InkSample.svelte';
	import {
		grainMatrix,
		inkBleedPresetNames,
		inkBleedSchema,
		NOISE_HIGH,
		NOISE_LOW,
		presetValues,
		regionPadding,
		rimMatrix,
		stepMatrix,
		washAlpha,
		type InkBleedOptions,
		type InkBleedPreset
	} from '#lib/fx/ink-bleed/ink-bleed.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sampleSchema = defineSchema({
		sample: {
			kind: 'select',
			label: 'Content',
			default: 'both',
			options: samples,
			group: 'Stage',
			description: 'Painted shapes (an inline SVG) and real HTML text go through the same filter.'
		}
	});

	const ink = new ParamState(inkBleedSchema);
	const content = new ParamState(sampleSchema);

	function reset() {
		ink.reset();
		content.reset();
	}

	function applyPreset(name: InkBleedPreset) {
		ink.values = presetValues(name);
	}

	const isPreset = (v: InkBleedOptions, name: InkBleedPreset) => {
		const p = presetValues(name);
		return (Object.keys(p) as (keyof InkBleedOptions)[]).every((k) => p[k] === v[k]);
	};
	let activePreset = $derived(inkBleedPresetNames.find((n) => isPreset(ink.values, n)));

	// Mirrors InkBleedFilter.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = ink.values;
		const pad = regionPadding(v.spread, v.blur);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <!-- region: ${pad}px around the element, as a fraction of its size -->`,
			`  <filter id="ink-bleed" x="…" y="…" width="…" height="…"`,
			`          color-interpolation-filters="sRGB">`,
			`    <feTurbulence type="fractalNoise" baseFrequency="${+(1 / v.roughness).toFixed(4)}"`,
			`                  numOctaves="${v.octaves}" seed="${v.seed}" result="fibers" />`,
			`    <feDisplacementMap in="SourceGraphic" in2="fibers" scale="${v.spread}"`,
			`                       xChannelSelector="R" yChannelSelector="G" result="bled" />`,
			`    <feGaussianBlur in="bled" stdDeviation="${v.blur}" result="wet" />`,
			`    <feColorMatrix in="wet" values="${stepMatrix(v.threshold, v.softness)}"`,
			`                   result="ink" />`,
			...(v.pool > 0
				? [
						`    <feBlend in="ink" in2="ink" mode="multiply" result="dense" />`,
						`    <feGaussianBlur in="ink" stdDeviation="${v.poolWidth}" />`,
						`    <feColorMatrix values="${rimMatrix()}" result="rim" />`,
						`    <feComposite in="dense" in2="rim" operator="arithmetic" k1="${v.pool}"`,
						`                 result="pooled" />`,
						`    <feComponentTransfer in="ink" result="wash">`,
						`      <feFuncA type="linear" slope="${washAlpha(v.pool)}" />`,
						`    </feComponentTransfer>`,
						`    <feComposite in="pooled" in2="wash" operator="over" result="pigment" />`
					]
				: [`    <feOffset in="ink" result="pigment" />`]),
			...(v.grain > 0
				? [
						`    <feTurbulence type="fractalNoise" baseFrequency="${+(1 / v.grainSize).toFixed(4)}"`,
						`                  numOctaves="2" seed="${v.seed + 1}" />`,
						`    <feColorMatrix values="${grainMatrix(v.grain)}"`,
						`                   result="granules" />`,
						`    <feComposite in="pigment" in2="granules" operator="arithmetic" k1="1"`,
						`                 result="settled" />`
					]
				: [`    <feOffset in="pigment" result="settled" />`]),
			`    <feComponentTransfer in="settled">`,
			`      <feFuncA type="linear" slope="${v.density}" />`,
			`    </feComponentTransfer>`,
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	const paperCode = [
		'<!-- full-size, behind the ink, on a paper-colored background -->',
		`<filter id="paper" x="0" y="0" width="100%" height="100%">`,
		`  <feTurbulence type="fractalNoise" baseFrequency="0.9 0.6" numOctaves="3" />`,
		`  <feDiffuseLighting surfaceScale="1.6" diffuseConstant="1.05" lighting-color="#fff">`,
		`    <feDistantLight azimuth="235" elevation="58" />`,
		`  </feDiffuseLighting>`,
		`</filter>`,
		``,
		`.paper-texture { mix-blend-mode: multiply; opacity: 0.35; }`,
		`.ink { filter: url(#ink-bleed); mix-blend-mode: multiply; }`
	].join('\n');
</script>

<svelte:head>
	<title>Ink bleed · Visual FX</title>
	<meta
		name="description"
		content="Ink and watercolor edges for shapes and live text with an SVG filter: turbulence displacement, blur and an alpha threshold, pigment pooling and granulation on a lit paper texture, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Ink bleed demo">
	{#snippet header()}
		<StageHeader title="Ink bleed" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<InkBleed {...ink.values} class="ink-stage">
			<InkSample kind={content.values.sample} />
		</InkBleed>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Ink bleed" code={ink.markup('InkBleed')} onreset={reset}>
			<div class="presets" role="group" aria-label="Presets">
				{#each inkBleedPresetNames as name (name)}
					<Button
						size="sm"
						variant={activePreset === name ? 'solid' : 'soft'}
						aria-pressed={activePreset === name}
						onclick={() => applyPreset(name)}
					>
						{name}
					</Button>
				{/each}
			</div>
			<ParamControls schema={sampleSchema} bind:values={content.values} />
			<ParamControls schema={inkBleedSchema} bind:values={ink.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Ink that soaks into the paper"
			lede="Real ink doesn't stop at the edge of the pen stroke: it runs along the paper fibers, spreads while it is wet and leaves more pigment where the water dried last. Each of those becomes one or two SVG filter primitives, applied to ordinary shapes and text."
		>
			<h3>1. Wandering edges: feTurbulence + feDisplacementMap</h3>
			<p>
				<code>&lt;feTurbulence type="fractalNoise"&gt;</code> is the paper's fiber structure, with
				<em>Fiber size</em> as the inverse of its <code>baseFrequency</code>.
				<code>&lt;feDisplacementMap&gt;</code> then moves every pixel of the content by
				<code>scale × (C − 0.5)</code>, with C the noise's red channel for x and green for y. The
				noise almost never leaves {NOISE_LOW}–{NOISE_HIGH} (measured in Chromium), so a
				<em>Bleed</em>
				of
				{ink.values.spread} px shifts pixels by up to about {(ink.values.spread * 0.27).toFixed(1)} px.
				Inside a flat shape that changes nothing (every neighbor has the same color); along the edges
				it pulls the outline into irregular bays and spikes.
			</p>

			<h3>2. A wet edge: blur, then a soft threshold</h3>
			<p>
				The displaced edge is still pixel-sharp and a bit noisy. <code>feGaussianBlur</code> spreads
				it out like wet ink, and an <code>feColorMatrix</code> alpha row turns the blur back into an
				edge:
				<code>A′ = A / softness + (0.5 − threshold / softness)</code>, clamped to 0–1. That is the
				same trick as the <a href={resolve('/gooey')}>gooey</a> effect, only with a soft ramp
				instead of a hard one: the edge sits where the blurred alpha equals the <em>Threshold</em>,
				and
				<em>Softness</em> is how much of the blur survives as feathering. Lower thresholds let the ink
				spread further; neighboring strokes run together the way wet ink does.
			</p>
			<p class="note">
				The ramp is never allowed to start below alpha 0 (the softness is capped at twice the
				threshold). Otherwise the matrix would give every transparent pixel a little opacity, and
				since transparent pixels are black, the whole element would get a grey veil.
			</p>

			<h3>3. Watercolor: pigment pooling</h3>
			<p>
				When a wash dries, the water at its edge evaporates first and pulls pigment outwards, so a
				dried wash is pale in the middle with a darker rim. The filter rebuilds that in three steps:
			</p>
			<ol>
				<li>
					<strong>Denser color.</strong> <code>feBlend mode="multiply"</code> of the ink with itself gives
					c × c per channel: the same hue, darker and more saturated, like a thicker layer of the same
					pigment.
				</li>
				<li>
					<strong>Where the rim is.</strong> Blurring the ink by the <em>Rim width</em> leaves alpha
					near 1 deep inside a shape and about 0.5 on its edge. A color matrix turns that into a
					white mask with alpha <code>2·(1 − A)</code>: 0 in the middle, 1 at the edge.
				</li>
				<li>
					<strong>Mix.</strong> <code>feComposite operator="arithmetic" k1="pool"</code> multiplies
					the dense color with the mask, and that rim goes <code>over</code> the wash, whose alpha
					is lowered to
					{washAlpha(ink.values.pool)} at the current pooling (the pigment that went to the rim is missing
					from the middle).
				</li>
			</ol>

			<h3>4. Granulation and paper</h3>
			<p>
				Some pigments settle into the valleys of the paper and look speckled. A second, fine
				<code>feTurbulence</code> becomes a white mask whose alpha runs from
				<code>1 − granulation</code> to 1, and the ink is multiplied with it. <em>Density</em>
				finally scales the ink's alpha with <code>feFuncA type="linear"</code>.
			</p>
			<CodeSnippet code={filterCode} />
			<p>
				The paper is a separate layer behind the content: its color, plus a high-frequency noise lit
				by <code>&lt;feDiffuseLighting&gt;</code> (the noise becomes a height map, and a distant light
				rakes across it) and multiplied on top. The ink layer is multiplied onto the paper too, so the
				fiber texture shows through the color instead of the ink sitting on top like a sticker.
			</p>
			<CodeSnippet code={paperCode} />

			<h3>Text</h3>
			<ul>
				<li>
					The heading on the stage is real HTML text: you can select and copy it, and screen readers
					read it as usual. Only its rendering is filtered.
				</li>
				<li>
					The bleed is in px, not relative to the font size. What frays a 5rem heading nicely makes
					body text unreadable; for running text, keep <em>Bleed</em> at 2–3 px and the blur below 1 px,
					or apply the effect only to headings and illustrations.
				</li>
				<li>
					Displacement, granulation and the paper texture all lower contrast. Check the result
					against WCAG if the text carries information, not only decoration.
				</li>
			</ul>

			<h3>Browser support and performance</h3>
			<p>
				Every primitive here is part of SVG filters, Baseline widely available (<a
					href="https://webstatus.dev/features/svg-filters">webstatus.dev</a
				>), and
				<code>filter: url(#id)</code> on HTML works in all current engines. Checked in Chromium only;
				Firefox and Safari are untested.
			</p>
			<ul>
				<li>
					For static content the browser renders the filter once and caches it. Anything that
					changes inside (a hover color, an animation, a caret) makes it rerun over the whole
					element, and with two turbulences, three blurs and several composites it is one of the
					heavier filters in this collection. Keep it to illustrations and headings rather than
					whole pages.
				</li>
				<li>
					The filter region grows with the bleed and blur ({regionPadding(
						ink.values.spread,
						ink.values.blur
					)} px on each side right now), so ink can run past the element's box without being cut off.
					The component measures the element to express that padding as a fraction of its size.
				</li>
				<li>
					The paper texture is a full-size lit turbulence. It only renders once, but on a very large
					stage, a pre-rendered paper image is cheaper.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.ink-stage) {
		block-size: 100%;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
