<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import BorderBeam from '#lib/fx/border-beam/BorderBeam.svelte';
	import {
		beamGradient,
		borderBeamSchema,
		passesPerSecond,
		staticRing
	} from '#lib/fx/border-beam/border-beam.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const beam = new ParamState(borderBeamSchema);

	let paused = $state(false);

	let passes = $derived(+passesPerSecond(beam.values).toFixed(2));

	// Mirrors BorderBeam.svelte, filled in with the current settings.
	let cssCode = $derived.by(() => {
		const v = beam.values;
		const glowOn = v.glow > 0 && v.glowOpacity > 0;
		return [
			`@property --angle {`,
			`  syntax: '<angle>';`,
			`  inherits: false;`,
			`  initial-value: 0deg;`,
			`}`,
			``,
			`.card {`,
			`  position: relative;`,
			`  isolation: isolate;`,
			`  border: ${v.width}px solid color-mix(in oklab, currentColor ${Math.round(v.track * 100)}%, transparent);`,
			`  border-radius: ${v.radius}px;`,
			`}`,
			``,
			`/* covers the border box; only its padding (= the border) survives the mask */`,
			`.card > .ring${glowOn ? ', .card > .glow' : ''} {`,
			`  position: absolute;`,
			`  inset: -${v.width}px;`,
			`  z-index: -1;`,
			`  border-radius: inherit;`,
			`  pointer-events: none;`,
			`}`,
			``,
			`.ring {`,
			`  padding: ${v.width}px;`,
			`  mask:`,
			`    linear-gradient(#000 0 0) content-box exclude,`,
			`    linear-gradient(#000 0 0);`,
			`  background: ${staticRing(v)};`,
			`}`,
			...(glowOn
				? [
						``,
						`/* a blurred copy: the filter is on the wrapper, so it blurs the masked ring */`,
						`.glow { filter: blur(${v.glow}px); opacity: ${v.glowOpacity}; }`,
						`.glow > .ring { position: absolute; inset: 0; border-radius: inherit; }`
					]
				: []),
			...(v.animate
				? [
						``,
						`@media (prefers-reduced-motion: no-preference) {`,
						`  .ring {`,
						`    background: ${beamGradient(v, 'var(--angle)')};`,
						`    animation: spin ${v.duration}s linear infinite${v.direction === 'counterclockwise' ? ' reverse' : ''};`,
						`  }`,
						`}`,
						``,
						`@keyframes spin { to { --angle: 360deg; } }`
					]
				: [])
		].join('\n');
	});

	let markupCode = $derived(
		[
			`<div class="card">`,
			...(beam.values.glow > 0 && beam.values.glowOpacity > 0
				? [`  <span class="glow" aria-hidden="true"><span class="ring"></span></span>`]
				: []),
			`  <span class="ring" aria-hidden="true"></span>`,
			`  …content…`,
			`</div>`
		].join('\n')
	);
</script>

<svelte:head>
	<title>Border beam · Visual FX</title>
	<meta
		name="description"
		content="An arc of light travelling around a border: a conic-gradient turned by a registered @property angle and masked to the border ring with mask-composite, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Border beam demo">
	{#snippet header()}
		<StageHeader title="Border beam" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage" data-theme="dark" data-motion={paused ? 'paused' : 'running'}>
			<BorderBeam {...beam.values} class="beam-card">
				<p class="eyebrow">Conic gradient</p>
				<h2>Border beam</h2>
				<p class="muted">
					A gradient spins behind a mask that only lets the border through. Nothing moves but one
					registered angle.
				</p>
				<MotionToggle bind:paused size="sm" />
			</BorderBeam>
			<BorderBeam
				{...beam.values}
				radius={999}
				class="beam-pill"
				--border-beam-padding="0"
				--border-beam-bg="#1b1828"
			>
				<button type="button" class="pill">Ask anything</button>
			</BorderBeam>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Border beam" code={beam.markup('BorderBeam')} onreset={beam.reset}>
			<ParamControls schema={borderBeamSchema} bind:values={beam.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A beam from a spinning gradient and a ring mask"
			lede="Nothing travels along the border. A conic gradient, a wedge of color around the center of the box, turns in place, and a mask hides everything but the border. Where the wedge crosses the border, it looks like light running around it."
		>
			<h3>1. The ring: mask-composite exclude</h3>
			<p>
				A layer covers the card's border box and gets the border width as its padding. Its mask has
				two layers of the same solid image: one clipped to the <code>content-box</code>, one
				covering everything. <code>mask-composite: exclude</code> keeps only the parts where exactly
				one of the two is opaque, which is the padding: a ring as wide as the border, with corners
				that follow
				<code>border-radius</code> on both edges. Whatever is painted into the layer only shows in
				the ring. The <a href={resolve('/spotlight')}>spotlight cards</a> use the same mask for their
				glowing borders.
			</p>
			<p>
				The ring sits at <code>z-index: -1</code> inside an <code>isolation: isolate</code> card, so it
				paints above the card's background and plain border but below the text.
			</p>
			<CodeSnippet code={markupCode} />

			<h3>2. The beam: a conic gradient with a moving start</h3>
			<p>
				<code>conic-gradient()</code> sweeps its colors around a center point instead of along a
				line. Most of the circle here is transparent; the last stretch of the turn fades from
				transparent through the tail color to the head color. <code>from &lt;angle&gt;</code> rotates
				the whole gradient. Animate that angle from 0 to 360deg and the bright wedge circles the center,
				which on the ring reads as a beam.
			</p>
			<p>
				A gradient can't be animated directly, and neither can a normal custom property: the browser
				only sees tokens and flips from one value to the other halfway through. Registering the
				property with <code>@property</code> and <code>syntax: '&lt;angle&gt;'</code> tells it what
				lies between 0deg and 360deg, so the angle, and the gradient using it, is interpolated on
				every frame. The <a href={resolve('/aurora')}>aurora</a> page shows the difference side by side.
			</p>
			<p>
				Two details. The gradient has to be written on the ring itself, not on the card: a custom
				property that contains <code>var()</code> is resolved where it is declared, so a gradient
				defined on the card would freeze the card's (unanimated) angle into it. And the property
				does not <code>inherit</code>, so only the ring is restyled each frame, not the card's
				content. Several beams use <code>repeating-conic-gradient</code> with a period of 360° divided
				by the count.
			</p>
			<p>This is the CSS for your current settings:</p>
			<CodeSnippet code={cssCode} />

			<h3>3. Glow</h3>
			<p>
				The glow is a second ring, blurred. The blur has to be on a wrapper around it: CSS applies
				an element's <code>filter</code> before its <code>mask</code>, so a blur on the masked ring
				itself would be cut back to the ring's sharp edges. On the wrapper, the already masked ring
				is blurred and spills softly inside and outside the border. At a glow of 0 the copy isn't
				rendered at all, which saves a filter pass.
			</p>

			<h3>4. Why the beam changes length</h3>
			<p>
				The beam length is an angle around the center, not a distance along the border. One degree
				covers little border where the border is close to the center and a lot where it is far away,
				or where it runs at a slant to the center, near the corners. On a wide card the beam is
				shortest and slowest in the middle of the long sides and stretches and speeds up towards the
				corners. Only on a square or a circle does it stay even. Constant speed would need a
				path-based technique (for example <code>offset-path</code> with a blurred dot), which can't use
				the ring mask and doesn't follow arbitrary radii as easily.
			</p>

			<h3>Motion and accessibility</h3>
			<ul>
				<li>
					Under <code>prefers-reduced-motion: reduce</code>, and with <em>Animate</em> off, the
					border shows a still ring with both colors once around, instead of a beam parked in one
					spot. The <em>Pause animations</em> button freezes the beam where it is (WCAG 2.2.2).
				</li>
				<li>
					The current settings pass any point of the border {passes} times per second. Keep it well below
					three for bright, short beams, so the beam never reads as flashing.
				</li>
				<li>
					The ring layers are <code>aria-hidden</code> and ignore the pointer. The content is
					ordinary markup; the button in the demo is a real button inside the beam, and its focus
					ring is not clipped (nothing here uses <code>overflow: hidden</code>).
				</li>
			</ul>

			<h3>Browser support</h3>
			<p class="note">
				Conic gradients have been Baseline widely available since 2023-05-17, CSS masks (including
				<code>mask-composite</code>) since 2026-06-07, and <code>@property</code> is Baseline newly
				available since 2024-07-09 (Chrome 85, Safari 16.4, Firefox 128), per web-features 3.44.0.
				Without <code>@property</code> the angle would not interpolate and the beam would sit still
				at the top; the component checks for <code>CSS.registerProperty</code> after mount and shows the
				still two-color ring instead. Tested in Chromium 156 only; Firefox and Safari are untested.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					<strong>The ring repaints every frame.</strong> Changing a gradient's angle is a paint, not
					a compositor-only change. The painted area is only the ring layers, though, and the content
					is untouched because the property doesn't inherit. A handful of beams on a page is cheap; a
					grid of hundreds is not (judgment).
				</li>
				<li>
					<strong>The glow costs a blur over the card's area.</strong> Its cost grows with the blur radius.
					Turn it off for long lists of beam cards.
				</li>
				<li>Paused or reduced motion, nothing repaints.</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--space-10);
		padding: var(--space-6);
		background: radial-gradient(circle at 50% 35%, oklch(20% 0.04 285), oklch(10% 0.015 285));
	}

	/* Above the control panel, which docks to the bottom on narrow screens. */
	@media (width < 40rem) {
		.stage {
			align-content: start;
			padding-block-start: var(--space-16);
		}
	}

	.stage :global(.beam-card) {
		display: grid;
		justify-items: start;
		gap: var(--space-3);
		max-inline-size: 26rem;
		padding: var(--space-8);
	}

	.eyebrow {
		color: #a5f3fc;
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.stage h2 {
		font-size: var(--text-xl);
	}

	.muted {
		color: #c4bfd6;
	}

	.pill {
		padding: var(--space-3) var(--space-6);
		border: 0;
		border-radius: 999px;
		background: none;
		color: inherit;
		font: inherit;
		font-weight: var(--weight-semibold);
		cursor: pointer;
	}
</style>
