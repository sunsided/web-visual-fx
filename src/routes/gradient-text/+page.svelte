<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import GradientText from '#lib/fx/gradient-text/GradientText.svelte';
	import {
		gradientImage,
		gradientTextSchema,
		minTextContrast,
		stopsOf,
		strokeWidth
	} from '#lib/fx/gradient-text/gradient-text.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		background: {
			kind: 'color',
			label: 'Page background',
			default: '#0e0b18',
			group: 'Stage',
			description: 'Behind the text; the contrast check uses it.'
		},
		weight: {
			kind: 'range',
			label: 'Font weight',
			default: 900,
			min: 100,
			max: 900,
			step: 100,
			group: 'Stage',
			description: 'Gradients and outlines need thick strokes to show.'
		}
	});

	const fx = new ParamState(gradientTextSchema);
	const surface = new ParamState(stageSchema);
	let paused = $state(false);

	function reset() {
		fx.reset();
		surface.reset();
	}

	let contrast = $derived(minTextContrast(fx.values, surface.values.background));
	// Display-size text: 3:1 is the WCAG minimum for large text.
	let low = $derived(contrast < 3);
	let lowMessage = $derived(low ? 'Text contrast is below 3 to 1 somewhere in the fill.' : '');
	let lightBg = $derived(
		Number.parseInt(surface.values.background.slice(1, 3), 16) +
			Number.parseInt(surface.values.background.slice(3, 5), 16) +
			Number.parseInt(surface.values.background.slice(5, 7), 16) >
			384
	);

	// Mirrors GradientText.svelte, filled in with the current settings.
	let cssCode = $derived.by(() => {
		const v = fx.values;
		const width = strokeWidth(v);
		const image = gradientImage(v.gradient, stopsOf(v), 'var(--angle)');
		return [
			...(v.fill === 'gradient' && v.animate
				? [`@property --angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }`, ``]
				: []),
			`.headline {`,
			`  color: ${v.solid}; /* fallback */`,
			...(width > 0 ? [`  -webkit-text-stroke: ${width}em ${v.strokeColor};`] : []),
			...(width > 0 && v.strokeOutside && v.fill !== 'none'
				? [`  paint-order: stroke fill; /* stroke ${width}em wide, the outer half shows */`]
				: []),
			...(v.fill === 'none' ? [`  -webkit-text-fill-color: transparent;`] : []),
			`}`,
			...(v.fill === 'gradient'
				? [
						``,
						`@supports (background-clip: text) or (-webkit-background-clip: text) {`,
						`  .headline {`,
						`    --angle: ${v.angle}deg;`,
						`    background-image: ${image};`,
						`    -webkit-background-clip: text;`,
						`    background-clip: text;`,
						`    -webkit-text-fill-color: transparent;`,
						...(v.animate ? [`    animation: turn ${v.duration}s linear infinite;`] : []),
						`  }`,
						`  .headline::selection {`,
						`    -webkit-text-fill-color: HighlightText;`,
						`    background-color: Highlight;`,
						`  }`,
						`}`,
						...(v.animate
							? [
									``,
									`@keyframes turn { to { --angle: ${v.angle + 360}deg; } }`,
									``,
									`@media (prefers-reduced-motion: reduce) {`,
									`  .headline { animation: none; }`,
									`}`
								]
							: [])
					]
				: []),
			``,
			`@media (forced-colors: active) {`,
			`  .headline { background: none; -webkit-text-fill-color: currentColor; -webkit-text-stroke: 0; }`,
			`}`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Gradient text · Visual FX</title>
	<meta
		name="description"
		content="Gradient-filled and outlined type that stays real text: background-clip: text with a fallback, -webkit-text-stroke, paint-order and an @property gradient rotation, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Gradient text demo">
	{#snippet header()}
		<StageHeader title="Gradient text" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div
			class={['page', { light: lightBg }]}
			style:background-color={surface.values.background}
			style:--weight={surface.values.weight}
			data-motion={paused ? 'paused' : 'running'}
		>
			<div class="copy">
				<h2 class="headline"><GradientText {...fx.values}>Paint the letters</GradientText></h2>
				<p class="body">
					Select this: the <GradientText {...fx.values}>gradient</GradientText> is a background clipped
					to the letters, so the words stay words.
				</p>
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Gradient text" code={fx.markup('GradientText')} onreset={reset}>
			<MotionToggle bind:paused size="sm" class="motion-toggle" />
			<p class={['contrast', { low }]}>
				Lowest text contrast: <strong>{contrast.toFixed(1)}:1</strong>
				{#if low}
					(below 3:1 somewhere in the fill; the body text needs 4.5:1)
				{/if}
			</p>
			<p class="visually-hidden" role="status">{lowMessage}</p>
			<ParamControls schema={gradientTextSchema} bind:values={fx.values} />
			<ParamControls schema={stageSchema} bind:values={surface.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Painting letters with a background"
			lede="CSS can't fill text with a gradient directly: color takes a color, not an image. But a background can be clipped to the shape of the text, and the text's own fill made transparent so the background shows through. The words stay real text."
		>
			<h3>1. Gradient fill: background-clip: text</h3>
			<p>
				<code>background-clip</code> decides how far a background reaches: the border box, the
				padding box, the content box, or, with <code>text</code>, only the glyphs. Clipping alone
				changes nothing visible, because the text is painted on top of its background in its own
				color. Making that fill transparent with <code>-webkit-text-fill-color: transparent</code>
				lets the clipped gradient show through.
			</p>
			<p>
				<code>-webkit-text-fill-color</code> rather than <code>color: transparent</code>, because
				<code>color</code> keeps working: it is the fallback below, the color
				<code>currentColor</code> refers to, and what forced-colors mode overrides.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>2. Prefixes and the fallback</h3>
			<p>
				The unprefixed <code>background-clip: text</code> is recent in Chromium (version 120) and
				Safari (14); before that only <code>-webkit-background-clip: text</code> worked. Firefox has
				supported both spellings since version 49, with known gaps: it doesn't work with
				<code>background-attachment: fixed</code> or in multi-layer backgrounds that mix clip values.
				That partial flag is why web-features doesn't list the feature as Baseline. Both spellings are
				set here, on a single background layer.
			</p>
			<p>
				The order of the fallback matters. The transparent fill sits inside
				<code>@supports (background-clip: text) or (-webkit-background-clip: text)</code>, together
				with the clip. A browser that can't clip to text therefore never makes the text transparent;
				it paints it in the solid color. Without the guard, that browser would show a gradient
				rectangle with invisible text inside.
			</p>

			<h3>3. Outlines: -webkit-text-stroke and paint-order</h3>
			<p>
				<code>-webkit-text-stroke</code> draws a line along the glyph outlines. Despite the prefix it
				is standardized in the Compatibility spec and Baseline widely available since 2017. The line is
				centered on the outline, so half of it eats into the letter: thin letters get thinner and counters
				close up.
			</p>
			<p>
				<code>paint-order: stroke fill</code> paints the stroke first and the fill on top, so only
				the outer half stays visible and the letter keeps its shape. That's why the component sets
				twice the <em>Stroke width</em> when <em>Stroke outside</em> is on. For HTML text this has
				worked everywhere since March 2024 (Chromium 123); before, it only affected SVG text. With
				<em>Fill: none</em> the fill is transparent and only the outline is left, so the component never
				lets that stroke go to zero.
			</p>

			<h3>4. Turning the gradient: @property</h3>
			<p>
				The gradient's angle is a custom property, <code>--gt-angle</code>, registered as an
				<code>&lt;angle&gt;</code>. The animation turns it by 360 degrees, and because the browser
				knows the type it interpolates smoothly and recomputes the gradient on every frame. Without
				the registration (older browsers, or the stylesheet of a shadow root, where
				<code>@property</code> is ignored) the value can't be interpolated and the gradient jumps at
				the half-way point instead. The <a href={resolve('/aurora')}>aurora page</a> shows that difference
				side by side.
			</p>

			<h3>Accessibility</h3>
			<ul>
				<li>
					The panel shows the lowest contrast anywhere in the fill against the page. A gradient
					between two colors can be darker than both in the middle (red to green passes through a
					dull olive), so the check samples the whole ramp, not just the stops. 3:1 is the minimum
					for large text; body text needs 4.5:1, which is why gradients belong on headings.
				</li>
				<li>
					Selected text would be transparent too. A <code>::selection</code> rule paints it in the system
					highlight colors instead.
				</li>
				<li>
					In forced-colors mode (Windows high contrast) the gradient and transparent fill are
					removed, so the text takes the user's colors.
				</li>
				<li>
					The rotation stops under <code>prefers-reduced-motion: reduce</code> and pauses with the button.
					It is a slow color change, not a flash.
				</li>
			</ul>

			<h3>Browser support and performance</h3>
			<p>
				Support facts are from web-features 3.44 and MDN's browser-compat-data 8.1.7. Checked in
				Chromium 156 and Firefox 157 (both spellings report as supported via
				<code>CSS.supports()</code> and render); Safari is untested.
			</p>
			<ul>
				<li>
					Static, the gradient is painted once like any background. Turning it repaints the text's
					box on every frame, which is cheap for a heading and adds up for long text.
				</li>
				<li>
					A gradient on an inline element that wraps is laid out as if the lines were one long line,
					so each line shows a slice of it. Add
					<code>box-decoration-break: clone</code> to give each line the full gradient.
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
		color: oklch(92% 0.01 285);
	}

	.page.light {
		color: oklch(25% 0.02 285);
	}

	.copy {
		max-inline-size: 48rem;
		text-align: center;
	}

	.headline {
		margin: 0 0 var(--space-4);
		font-size: clamp(3rem, 10vw, 7.5rem);
		font-weight: var(--weight);
		line-height: 1;
		letter-spacing: -0.03em;
	}

	.body {
		margin: 0;
		font-size: var(--text-lg);
	}

	.body :global(.gradient-text) {
		font-weight: 800;
	}

	.contrast {
		margin: 0;
		font-size: var(--text-xs);
	}

	.contrast.low {
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
	}

	:global(.motion-toggle) {
		justify-self: start;
	}

	/* Leave room for the control panel on wide screens. */
	@media (width >= 64rem) {
		.page {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
