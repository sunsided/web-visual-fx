<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Squircle from '#lib/fx/squircle/Squircle.svelte';
	import SquircleButtonGroup from '#lib/fx/squircle/SquircleButtonGroup.svelte';
	import {
		buttonGroupSchema,
		cornerShapeCss,
		cornerShapeK,
		cornerShapes,
		easingCss,
		squircleSchema,
		superellipsePath,
		type CornerShape
	} from '#lib/fx/squircle/squircle.js';
	import { supportsCornerShape } from '#lib/fx/squircle/support.js';
	import { toMarkup } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const squircle = new ParamState(squircleSchema);
	const group = new ParamState(buttonGroupSchema);

	// Unknown during prerendering; resolved in the browser.
	let supported = $state<boolean>();
	onMount(() => (supported = supportsCornerShape()));

	function reset() {
		squircle.reset();
		group.reset();
	}

	// One set of motion controls drives both demos.
	let groupValues = $derived({
		...group.values,
		duration: squircle.values.duration,
		easing: squircle.values.easing,
		bounce: squircle.values.bounce
	});

	const items = [
		{ value: 'day', label: 'Day' },
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'year', label: 'Year' }
	];
	let selected = $state(['week']);

	let css = $derived(cornerShapeCss(squircle.values.shape, squircle.values.k));
	let k = $derived(cornerShapeK(squircle.values.shape, squircle.values.k));
	let rendering = $derived(
		squircle.values.renderer === 'clip-path' ||
			(squircle.values.renderer === 'auto' && supported === false)
			? 'clip-path'
			: 'corner-shape'
	);

	function formatK(value: number) {
		if (value === Infinity) return '∞';
		if (value === -Infinity) return '−∞';
		return String(+value.toFixed(2));
	}

	function formatN(value: number) {
		if (value === Infinity) return '∞';
		if (value === -Infinity) return '∞ (mirrored)';
		const n = 2 ** Math.abs(value);
		return `${+n.toFixed(2)}${value < 0 ? ' (mirrored)' : ''}`;
	}

	// Live readout of the computed corner-shape while a transition runs.
	let hero = $state<HTMLDivElement>();
	let computed = $state('');
	let raf = 0;

	function sample() {
		if (!hero) return;
		computed = getComputedStyle(hero).getPropertyValue('corner-shape');
	}

	function track() {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(function tick() {
			sample();
			raf = requestAnimationFrame(tick);
		});
	}

	function stop() {
		cancelAnimationFrame(raf);
		sample();
	}

	$effect(() => {
		void [css, hero];
		// After the new value is applied, so instant changes (reduced motion) are shown too.
		const id = requestAnimationFrame(sample);
		return () => {
			cancelAnimationFrame(id);
			cancelAnimationFrame(raf);
		};
	});

	let code = $derived(
		[
			squircle.markup('Squircle'),
			toMarkup('SquircleButtonGroup', buttonGroupSchema, groupValues).replace(
				'<SquircleButtonGroup',
				'<SquircleButtonGroup label="Calendar range" {items}'
			)
		].join('\n\n')
	);

	let easing = $derived(easingCss(squircle.values.easing, squircle.values.bounce));

	let shapeCode = $derived(
		[
			`.tile {`,
			`  border-radius: ${squircle.values.radius}px; /* the size of each corner */`,
			`  corner-shape: ${css}; /* the curve inside it */`,
			`  transition-property: corner-shape, border-radius;`,
			`  transition-duration: ${squircle.values.duration}ms;`,
			`  transition-timing-function: ${easing};`,
			`}`,
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .tile { transition-duration: 0s; }`,
			`}`
		].join('\n')
	);

	// A sample size; the component measures the real one.
	let fallbackCode = $derived(
		[
			`/* 240 × 160 px, radius ${squircle.values.radius}px, k = ${formatK(k)}, 24 segments per corner, as in the component */`,
			`@supports not (corner-shape: squircle) {`,
			`  .tile {`,
			`    border-radius: 0;`,
			`    clip-path: path("${superellipsePath(240, 160, squircle.values.radius, k)}");`,
			`  }`,
			`}`
		].join('\n')
	);

	let groupCode = $derived.by(() => {
		const v = groupValues;
		const active = [
			`  border-radius: ${v.activeRadius}px;`,
			`  corner-shape: ${cornerShapeCss(v.activeShape, v.activeK)};`
		];
		const grow = `  flex-grow: ${+(1 + v.expand).toFixed(2)};`;
		return [
			`.group { display: flex; gap: ${v.gap}px; }`,
			``,
			`.group button {`,
			`  flex: 1 1 0;`,
			`  min-width: max-content;`,
			`  height: 48px;`,
			`  border-radius: 24px; /* exactly half the height: a pill */`,
			`  corner-shape: round;`,
			`  transition-property: flex-grow, border-radius, corner-shape, background-color;`,
			`  transition-duration: ${v.duration}ms;`,
			`  transition-timing-function: ${easing};`,
			`}`,
			``,
			`.group button[aria-pressed='true'] {`,
			...active,
			`}`,
			``,
			`.group button:focus-visible {`,
			grow,
			...active,
			`}`,
			``,
			`/* only where hovering exists: a tap leaves a sticky hover behind */`,
			`@media (hover: hover) {`,
			`  .group button:hover {`,
			`  ${grow}`,
			...active.map((l) => `  ${l}`),
			`  }`,
			`}`,
			``,
			`.group button:active {`,
			`  flex-grow: ${+(1 + v.expand * 1.5).toFixed(2)};`,
			`  border-radius: ${v.activeRadius / 2}px;`,
			`  corner-shape: ${cornerShapeCss(v.activeShape, v.activeK)};`,
			`}`,
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .group button { transition-duration: 0s; }`,
			`}`
		].join('\n');
	});

	// Plain-language names and one-liners for the stage; the technical values live in the panel.
	const shapeCopy: Record<CornerShape, { name: string; line: string }> = {
		round: { name: 'Round', line: 'The classic rounded corner: a quarter circle.' },
		squircle: {
			name: 'Squircle',
			line: 'Smoother than round: the curve starts earlier and eases in.'
		},
		superellipse: {
			name: 'Custom',
			line: 'Your own curve, anywhere from scooped to almost square.'
		},
		bevel: { name: 'Bevel', line: 'A clean diagonal cut across each corner.' },
		scoop: { name: 'Scoop', line: 'A concave curve, as if each corner were bitten out.' },
		notch: { name: 'Notch', line: 'A small square cut out of each corner.' },
		square: { name: 'Square', line: 'Sharp corners, no rounding at all.' }
	};
</script>

<svelte:head>
	<title>Squircles · Visual FX</title>
	<meta
		name="description"
		content="Squircles and shape morphing with CSS corner-shape and superellipse(), a clip-path fallback and a Material 3 Expressive style button group, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Squircle demo">
	{#snippet header()}
		<StageHeader title="Squircles" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage">
			<section class="gallery" aria-labelledby="gallery-title">
				<h2 id="gallery-title" class="eyebrow">Shape gallery</h2>
				<Squircle
					{...squircle.values}
					class="hero"
					style="--hero-radius: {squircle.values.radius}px"
					bind:element={hero}
					ontransitionrun={track}
					ontransitionend={stop}
					ontransitioncancel={stop}
				>
					<p class="shape-name">{shapeCopy[squircle.values.shape].name}</p>
					<p class="shape-line">{shapeCopy[squircle.values.shape].line}</p>
				</Squircle>

				<div class="swatches" role="group" aria-label="Corner shape">
					{#each cornerShapes as shape (shape)}
						<button
							type="button"
							class="swatch"
							aria-pressed={squircle.values.shape === shape}
							onclick={() => (squircle.values.shape = shape)}
						>
							<Squircle
								{shape}
								k={squircle.values.k}
								radius={18}
								renderer={squircle.values.renderer}
								duration={squircle.values.duration}
								easing={squircle.values.easing}
								bounce={squircle.values.bounce}
								class="swatch-tile"
								aria-hidden="true"
							/>
							<span>{shapeCopy[shape].name}</span>
						</button>
					{/each}
				</div>
			</section>

			<section class="connected" aria-labelledby="group-title">
				<h2 id="group-title" class="eyebrow">Connected button group</h2>
				<SquircleButtonGroup {...groupValues} {items} bind:selected label="Calendar range" />
				<p class="hint">
					Hover, Tab to or press a button. Selected: {selected.join(', ') || 'none'}.
				</p>
			</section>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Squircles" {code} onreset={reset}>
			{#if supported === false}
				<p class="support-note" role="note">
					This browser doesn't support <code>corner-shape</code>. The gallery uses the generated
					<code>clip-path</code> fallback; the button group only morphs its corner radius.
				</p>
			{/if}
			<dl class="readout">
				<dt>CSS</dt>
				<dd>corner-shape: {css}</dd>
				<dt>k · n</dt>
				<dd>{formatK(k)} · {formatN(k)}</dd>
				<dt>Computed</dt>
				<dd>{rendering === 'corner-shape' ? computed || '…' : 'n/a (clip-path fallback)'}</dd>
			</dl>
			<ParamControls schema={squircleSchema} bind:values={squircle.values} />
			<ParamControls
				schema={buttonGroupSchema}
				bind:values={group.values}
				groups={['Button group']}
			/>
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Squircles, and corners that change shape"
			lede="For thirty years a CSS corner could only be a quarter ellipse. corner-shape adds a second knob: border-radius still says how big the corner is, corner-shape says what curve fills it, from a straight bevel through round and squircle to a sharp square, and it animates."
		>
			<h3>1. corner-shape</h3>
			<p>
				<code>corner-shape</code> only does something where <code>border-radius</code> is set: the
				radius reserves a box in each corner, the shape decides the curve that runs through that
				box. Like <code>border-radius</code> it has per-corner longhands such as
				<code>corner-top-left-shape</code>, and up to four values in the shorthand. Every keyword is
				shorthand for one <code>superellipse()</code>:
			</p>
			<dl>
				<dt>square</dt>
				<dd><code>superellipse(infinity)</code>: no rounding at all, as if the radius were 0.</dd>
				<dt>squircle</dt>
				<dd>
					<code>superellipse(2)</code>: the shape of app icons. Flatter sides, a smoother start of
					the curve, no visible point where the straight edge turns into the arc.
				</dd>
				<dt>round</dt>
				<dd><code>superellipse(1)</code>: the classic quarter ellipse, the default.</dd>
				<dt>bevel</dt>
				<dd><code>superellipse(0)</code>: a straight cut between the two ends of the corner.</dd>
				<dt>scoop</dt>
				<dd><code>superellipse(-1)</code>: a concave quarter circle, as if bitten out.</dd>
				<dt>notch</dt>
				<dd><code>superellipse(-infinity)</code>: a square cut-out.</dd>
			</dl>
			<p>
				Borders, outlines, <code>box-shadow</code> and the background all follow the shape, so the focus
				ring of a squircle button is a squircle too (checked in Chromium 155). That is the big advantage
				over every older technique.
			</p>
			<CodeSnippet code={shapeCode} />

			<h3>2. The superellipse</h3>
			<p>
				A superellipse is the set of points where <code>|x/a|ⁿ + |y/b|ⁿ = 1</code>. With
				<code>n = 2</code> that is an ellipse. Larger <code>n</code> pushes the curve out towards
				the corners of its bounding box (at <code>n = 4</code> you get the squircle, at ∞ a
				rectangle), and <code>n = 1</code> is a diamond of straight lines. CSS writes the exponent
				as
				<code>superellipse(k)</code> with <code>n = 2<sup>k</sup></code>, so that the useful shapes
				get small, evenly spaced numbers: 0 is bevel, 1 round, 2 squircle.
			</p>
			<p>
				For a corner, each quarter of the curve is drawn into the box that
				<code>border-radius</code> reserves, centered on the box's inner corner. Negative
				<code>k</code> doesn't use <code>n &lt; 1</code>; instead the curve for <code>|k|</code> is
				mirrored across the line between the corner's two end points, which turns round into scoop
				and square into notch. The fallback below generates this curve, with
				<code>x = r − r·cos(t)<sup>2/n</sup></code> and <code>y = r − r·sin(t)<sup>2/n</sup></code>
				for <code>t</code> from 0 to 90°.
			</p>

			<h3>3. Animating between shapes</h3>
			<p>
				<code>corner-shape</code> is animatable, so a plain <code>transition</code> morphs any shape
				into any other, including convex into concave. Chromium doesn't interpolate <code>k</code>
				linearly, though. It interpolates the point where the curve crosses the corner's diagonal (<code
					>0.5<sup>1/2<sup>k</sup></sup></code
				>
				of the way from the curve's center, mirrored for negative values), which looks even: halfway from
				round (1) to squircle (2) is
				<code>superellipse(1.436)</code>, and halfway from bevel to square is 1.269. The
				<em>Computed</em> line at the top of the control panel shows the browser's value on every
				frame; the project's
				<code>interpolateK()</code> reproduces it and is tested against values read from Chromium 155.
			</p>
			<p>
				<code>border-radius</code> and <code>corner-shape</code> transition independently, so you can
				change both at once (the button group does) and they stay in sync as long as they share duration
				and easing.
			</p>

			<h3>4. Spring easing with linear()</h3>
			<p>
				Material 3 Expressive moves shapes with springs: fast out of the gate, a small overshoot,
				then a settle. <code>cubic-bezier()</code> can overshoot once at most and can't wobble.
				<code>linear()</code> can: it takes a list of output values and draws straight lines between them,
				evenly spaced in time unless you give positions. With enough points, any curve fits.
			</p>
			<p>
				The <em>spring</em> easing samples a damped harmonic oscillator,
				<code
					>x(t) = 1 − e<sup>−ζωt</sup>(cos(ω<sub>d</sub>t) + ζω/ω<sub>d</sub>·sin(ω<sub>d</sub
					>t))</code
				>, at 41 points. <em>Bounce</em> lowers the damping ratio
				<code>ζ = 1 − bounce</code>; at 0 it is critically damped and never overshoots. The
				stiffness <code>ω</code> is solved for each <code>ζ</code> so that the spring is within 0.2%
				of its target at the end of the duration (for the critically damped spring that takes
				<code>ω ≈ 8.46</code>), so the final value 1 doesn't jump. Your current easing:
			</p>
			<CodeSnippet code={`transition-timing-function: ${easing};`} />
			<p class="note">
				An overshoot is applied to the property value: <code>k</code> briefly goes past its target,
				a radius dips below its end value, <code>flex-grow</code> overshoots. Values that can't go negative
				are clamped by the browser, so a spring towards a radius of 0 bounces off the floor rather than
				below it.
			</p>

			<h3>5. The connected button group</h3>
			<p>
				A flex row of toggle buttons, each <code>flex: 1 1 0</code> so they share the width equally.
				Hovering, focusing or pressing one raises its <code>flex-grow</code>, and because
				<code>flex-grow</code> is a number it transitions: the active button pushes its neighbors
				aside while it morphs from pill to
				<code>{cornerShapeCss(group.values.activeShape, group.values.activeK)}</code>
				corners. Selection is <code>aria-pressed</code>, so screen readers announce "toggle button,
				pressed", and a check mark shows it without relying on color.
			</p>
			<ul>
				<li>
					The pill radius is exactly half the height, not the usual <code>9999px</code>. A
					transition from 9999px to 14px would spend almost all its time above the visible maximum,
					so the morph would seem to start late and then snap.
				</li>
				<li>
					Hover expansion sits inside <code>@media (hover: hover)</code>. Touch screens fire a
					sticky hover after a tap, which would leave a button expanded. Touch users still get the
					press squish (<code>:active</code>) and the selection morph.
				</li>
				<li>
					<code>:focus-visible</code> gets the same treatment as hover, so keyboard users see which button
					they are on, in addition to the focus ring (which follows the corner shape).
				</li>
			</ul>
			<CodeSnippet code={groupCode} />

			<h3>6. The fallback: clip-path from the same formula</h3>
			<p>
				Where <code>corner-shape</code> isn't supported, <code>Squircle</code> measures itself with
				a <code>ResizeObserver</code> and clips to a <code>path()</code> built from the formula
				above: four corners of 24 line segments each, joined by the straight edges. Paths can only
				interpolate when they have the same commands in the same order, so the generator always
				emits the same number of points whatever the shape. That keeps the morph working in the
				fallback too. Set <em>Renderer</em> to <code>clip-path</code> to compare it.
			</p>
			<CodeSnippet code={fallbackCode} />
			<p class="note">
				<code>clip-path</code> clips <em>everything</em> outside the path: the element's own
				outline, focus ring and <code>box-shadow</code> included. A focusable element clipped this
				way needs its focus ring on an unclipped wrapper, or a <code>filter: drop-shadow()</code> on
				a parent, which follows the clipped shape. That is why the button group doesn't use the
				fallback: its buttons keep plain <code>border-radius</code> and a normal focus ring, and
				only the radius morphs. CSS <code>shape()</code> could express the path in percentages
				without measuring, but it is newer than <code>path()</code>, so <code>path()</code> is the safer
				fallback.
			</p>

			<h3>Accessibility</h3>
			<ul>
				<li>
					All morphs are transitions triggered by the user. Under
					<code>prefers-reduced-motion: reduce</code> they are instant: the shape still changes, it just
					doesn't animate. Nothing loops.
				</li>
				<li>
					The buttons are native <code>&lt;button&gt;</code>s in a labelled
					<code>role="group"</code>: Tab moves between them, Space and Enter toggle them.
				</li>
				<li>
					In forced-colors mode (Windows High Contrast) backgrounds disappear, so the buttons get a
					system-colored border and the selected one is drawn in <code>Highlight</code>.
				</li>
			</ul>

			<h3>Browser support</h3>
			<p class="note">
				<code>corner-shape</code> and <code>superellipse()</code> ship in Chromium 139 and later.
				Tested in Chromium 155: every keyword and <code>superellipse()</code> value parses, renders
				and interpolates, and borders, outlines and shadows follow the shape. Firefox and Safari
				were not tested. That doesn't matter for the component: it feature-detects with
				<code>CSS.supports('corner-shape', 'squircle')</code>, which (unlike some other checks in
				this playground) is only true where the property is actually implemented, because an engine
				that doesn't know a property doesn't parse it. The check runs after the page has loaded, and
				any engine where it is false gets the clip-path fallback.
				<code>clip-path: path()</code>, <code>linear()</code> easing and transitions of
				<code>flex-grow</code> work in all current browsers.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					A <code>corner-shape</code> or <code>border-radius</code> transition repaints the element on
					every frame; it isn't a compositor animation. For buttons and cards that is cheap.
				</li>
				<li>
					Animating <code>flex-grow</code> re-runs layout for the row on every frame. Fine for a handful
					of buttons; don't use it on long lists or large layouts.
				</li>
				<li>
					The clip-path fallback recomputes the path whenever the element is resized. Size changes
					(and the initial measurement after load) skip the transition for a frame, so the clip
					follows the box immediately instead of trailing it; only shape and radius changes morph.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: var(--space-12);
		padding: var(--space-16) var(--space-6);
		overflow-y: auto;
		background: var(--color-bg);
	}

	/* Keep the demos clear of the floating control panel. */
	@media (width >= 40rem) {
		.stage {
			padding-inline-end: calc(18rem + var(--space-8));
		}
	}

	section {
		display: grid;
		justify-items: center;
		gap: var(--space-4);
		inline-size: min(100%, 34rem);
	}

	.eyebrow {
		color: var(--color-accent-text);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	/*
	 * Centered text, kept at least one corner radius away from the left and right edges. Inside
	 * that band every corner shape is solid from top to bottom (even notch and scoop, which cut
	 * deepest), so the text never touches a curve, at any radius.
	 */
	.gallery :global(.hero) {
		container-type: inline-size;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: var(--space-3);
		inline-size: min(100%, 26rem);
		aspect-ratio: 4 / 3;
		text-align: center;
		--squircle-padding: var(--space-6) max(var(--space-6), var(--hero-radius));
	}

	.shape-name {
		/* Shrinks with the space left between the corners, so the longest name still fits. */
		font-size: min(var(--text-2xl), 19cqi);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-tight);
		line-height: var(--leading-tight);
	}

	.shape-line {
		max-inline-size: 24ch;
		font-size: var(--text-md);
		text-wrap: balance;
	}

	/* Technical values for the curious, kept out of the stage. */
	.readout {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-1) var(--space-3);
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.readout dd {
		margin: 0;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2);
	}

	.swatch {
		display: grid;
		justify-items: center;
		gap: var(--space-1);
		padding: var(--space-2);
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		background: none;
		color: var(--color-text-muted);
		font-size: var(--text-2xs);
		cursor: pointer;
	}

	.swatch:hover {
		background: var(--color-control);
	}

	.swatch[aria-pressed='true'] {
		border-color: var(--color-control-border);
		color: var(--color-text);
		font-weight: var(--weight-semibold);
	}

	.swatch :global(.swatch-tile) {
		inline-size: 3rem;
		aspect-ratio: 1;
		--squircle-padding: 0;
		--squircle-bg: var(--color-text-muted);
	}

	.swatch[aria-pressed='true'] :global(.swatch-tile) {
		--squircle-bg: var(--color-accent-solid);
	}

	.connected :global(.button-group) {
		inline-size: 100%;
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.support-note {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	@media (forced-colors: active) {
		.swatch[aria-pressed='true'] {
			border-color: Highlight;
		}
	}
</style>
