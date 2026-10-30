<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import LongShadow from '#lib/fx/long-shadow/LongShadow.svelte';
	import {
		longShadowLayers,
		longShadowSchema,
		stepPixels
	} from '#lib/fx/long-shadow/long-shadow.js';
	import { contrastRatio } from '#lib/fx/spotlight/spotlight.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const pageSchema = defineSchema({
		background: {
			kind: 'color',
			label: 'Page background',
			default: '#2a1236',
			group: 'Stage',
			description: 'Behind the text; the contrast check uses it.'
		}
	});

	const fx = new ParamState(longShadowSchema);
	const surface = new ParamState(pageSchema);

	function reset() {
		fx.reset();
		surface.reset();
	}

	// Mirrors the stage's font-size: clamp(4rem, 14vw, 10rem).
	let innerWidth = $state(1280);
	let fontSize = $derived(Math.min(160, Math.max(64, innerWidth * 0.14)));
	let stepPx = $derived(stepPixels(fx.values, fontSize));

	let pageContrast = $derived(contrastRatio(fx.values.face, surface.values.background));
	let edgeContrast = $derived(contrastRatio(fx.values.face, fx.values.from));
	let low = $derived(pageContrast < 3 && edgeContrast < 3);
	let lowMessage = $derived(
		low ? 'The text contrasts below 3 to 1 with both the page and the shadow.' : ''
	);

	let layers = $derived(longShadowLayers(fx.values));

	let cssCode = $derived(
		[
			`.headline {`,
			`  color: ${fx.values.face};`,
			`  text-shadow:`,
			...layers.map((l, i) => `    ${l}${i < layers.length - 1 ? ',' : ';'}`),
			`}`
		].join('\n')
	);

	const helperCode = [
		`function longShadow({ angle, length, steps, from, to }) {`,
		`  const rad = (angle * Math.PI) / 180;`,
		`  return Array.from({ length: steps }, (_, k) => {`,
		`    const d = (length * (k + 1)) / steps;          // em along the angle`,
		`    const t = steps > 1 ? k / (steps - 1) : 0;     // 0 at the letters, 1 at the end`,
		`    const x = (Math.cos(rad) * d).toFixed(4);`,
		`    const y = (Math.sin(rad) * d).toFixed(4);`,
		`    const color = \`color-mix(in oklab, \${from}, \${to} \${t * 100}%)\`;`,
		`    return \`\${x}em \${y}em 0 \${color}\`;`,
		`  }).join(', ');`,
		`}`
	].join('\n');
</script>

<svelte:window bind:innerWidth />

<svelte:head>
	<title>Long shadow · Visual FX</title>
	<meta
		name="description"
		content="Long shadows and extruded 3D type from a generated list of text-shadow copies, with a color-mix() ramp and fade, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Long shadow demo">
	{#snippet header()}
		<StageHeader title="Long shadow" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="page" style:background-color={surface.values.background}>
			<h2 class="headline"><LongShadow {...fx.values}>Depth</LongShadow></h2>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Long shadow" code={fx.markup('LongShadow')} onreset={reset}>
			<p class={['readout', { low }]}>
				Text against the page: <strong>{pageContrast.toFixed(1)}:1</strong>, against the shadow
				edge: <strong>{edgeContrast.toFixed(1)}:1</strong>
				{#if low}
					(both below 3:1, the letters lose their outline)
				{/if}
			</p>
			<p class="visually-hidden" role="status">{lowMessage}</p>
			<p class={['readout', { low: stepPx > 1.5 }]}>
				{layers.length} shadows, {stepPx.toFixed(1)}px apart at the stage's font size
				{#if stepPx > 1.5}
					(copies separate; add steps or shorten the shadow)
				{/if}
			</p>
			<ParamControls schema={longShadowSchema} bind:values={fx.values} />
			<ParamControls schema={pageSchema} bind:values={surface.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A shadow made of many shadows"
			lede="CSS has no extrude property. But text-shadow takes a list, and a few dozen hard-edged copies of the text, each nudged a little further along the same direction, merge into one solid shape: a long shadow, or the side walls of 3D letters."
		>
			<h3>1. Copies along an angle</h3>
			<p>
				Every entry in a <code>text-shadow</code> list is a full copy of the glyphs at an offset,
				with a blur radius and a color. With a blur of 0 the copy has hard edges. Place copy number
				<em>i</em> of <em>n</em> at
				<code>(cos θ, sin θ) × length × i / n</code> and the copies overlap into a continuous band from
				the letters to the end of the shadow. The angle is in screen coordinates: 0° points right, 90°
				down.
			</p>
			<p>
				The list is generated by a small pure function, so the CSS stays a plain value and the
				component has no runtime cost beyond painting:
			</p>
			<CodeSnippet code={helperCode} />
			<p>
				Shadows are painted back to front from the end of the list, so the first entry, the one
				closest to the letters, ends up on top. That's the right order for an extrusion: near walls
				cover far ones.
			</p>

			<h3>2. Steps and gaps</h3>
			<p>
				The copies only merge if each step is short. Above roughly one and a half pixels the letter
				edges of neighboring copies stop overlapping in thin strokes and diagonals, and the shadow
				turns into a stack of visible outlines. The panel shows the step size at the stage's font
				size. Since length is in <code>em</code>, the same settings get coarser on bigger text.
			</p>
			<p>
				The step count is capped at 60. Each step is one more full copy of the text to rasterize,
				and past a few dozen they mostly paint over each other. For a really long shadow on very
				large type, a blurred end (<em>Fade out</em>) hides the gaps better than more steps.
			</p>

			<h3>3. Color ramp: color-mix()</h3>
			<p>
				Each step's color is <code>color-mix(in oklab, start, end p%)</code> with p growing from 0
				to 100 along the shadow; the browser does the mixing. <code>oklab</code> gives even
				lightness steps, which reads as light falling off along the extrusion. <code>srgb</code>
				matches a classic CSS gradient and goes muddy between complementary colors;
				<code>oklch</code> keeps the saturation up but walks around the hue wheel. With
				<em>Fade out</em> each step is also mixed with <code>transparent</code>, so the shadow
				dissolves into whatever is behind it.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>4. Long shadow or extrusion</h3>
			<p>The same list makes both looks; only the numbers change:</p>
			<dl>
				<dt>Long shadow</dt>
				<dd>
					Long (0.5em and more), one flat color or a fade, usually at 45°. The flat-design look: as
					if the letters stood on the page in low sunlight.
				</dd>
				<dt>Extrusion</dt>
				<dd>
					Short (0.1 to 0.2em) with a ramp from a darker shade of the text color to a much darker
					one: the side walls of solid letters. <em>Ambient shadow</em> adds one blurred shadow beyond
					the last step, so the block sits on the page instead of floating.
				</dd>
			</dl>

			<h3>Accessibility</h3>
			<p>
				The text is a single real text node; the shadows are paint only, so selection, search and
				screen readers see plain text. Legibility depends on the edge: where the letters touch the
				shadow, the text color has to stand out from the shadow start color, and elsewhere from the
				page. The panel shows both ratios; at least one of them should reach 3:1 for large text. In
				forced-colors mode the shadow is removed.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				<code>text-shadow</code> is Baseline widely available since 2015, and
				<code>color-mix()</code> is Baseline widely available too. Checked in Chromium and Firefox; Safari
				is untested.
			</p>
			<ul>
				<li>
					Static, the shadows are painted once and cached. Changing them (dragging a slider)
					repaints all copies; that's the only time they cost anything.
				</li>
				<li>
					Animating the angle or length on large text repaints dozens of glyph copies per frame.
					Keep that to small text or a few steps.
				</li>
				<li>
					Hard-edged shadows (blur 0) are much cheaper than blurred ones; only the optional ambient
					shadow is blurred.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.page {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-8);
		overflow: hidden;
	}

	.headline {
		margin: 0;
		font-size: clamp(4rem, 14vw, 10rem);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.02em;
		text-align: center;
	}

	.readout {
		margin: 0;
		font-size: var(--text-xs);
	}

	.readout.low {
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
	}

	/* Leave room for the control panel on wide screens. */
	@media (width >= 64rem) {
		.page {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
