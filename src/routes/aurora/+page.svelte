<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Aurora from '#lib/fx/aurora/Aurora.svelte';
	import {
		auroraSchema,
		BASE_DURATION,
		blobLayout,
		blobTiming,
		meshLayers,
		paletteOf,
		saturated
	} from '#lib/fx/aurora/aurora.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const aurora = new ParamState(auroraSchema);

	// Shared by the stage and the small demo in the article (WCAG 2.2.2).
	let paused = $state(false);

	let palette = $derived(
		paletteOf(aurora.values).map((c) => saturated(c, aurora.values.saturation))
	);
	let layout = $derived(blobLayout(aurora.values.blobs, palette.length, aurora.values.seed));
	let clock = $derived(+(BASE_DURATION / aurora.values.speed).toFixed(2));

	function registered(name: string, syntax: string, initial: string, inherits = false) {
		return `@property ${name} { syntax: '${syntax}'; inherits: ${inherits}; initial-value: ${initial}; }`;
	}

	let colorProps = $derived(
		palette.map((_, i) => registered(`--aurora-c${i}`, '<color>', 'transparent', true))
	);

	let driftCode = $derived(
		aurora.values.animate && aurora.values.colorDrift
			? [
					``,
					`/* every color fades towards the next one in the palette */`,
					`@keyframes drift {`,
					`  to {`,
					...palette.map((_, i) => `    --aurora-c${i}: ${palette[(i + 1) % palette.length]};`),
					`  }`,
					`}`
				]
			: []
	);

	// Mirrors Aurora.svelte (mesh technique), filled in with the current settings.
	let meshCode = $derived.by(() => {
		const v = aurora.values;
		const pad = v.blur > 0 ? 'var(--pad)' : '';
		const layers = meshLayers(layout, v.blobSize, (i) => `var(--aurora-c${i})`, { pad });
		const animations = [
			`clock ${clock}s linear infinite`,
			`breathe ${+(clock / 4).toFixed(2)}s ease-in-out infinite alternate`,
			...(v.colorDrift
				? [`drift ${+(clock * 0.75).toFixed(2)}s ease-in-out infinite alternate`]
				: [])
		];
		return [
			registered('--aurora-t', '<angle>', '0deg'),
			registered('--aurora-falloff', '<percentage>', '100%'),
			...colorProps,
			``,
			`.aurora {`,
			`  container-type: size; /* cqw, cqh, cqmax below are relative to this box */`,
			`  position: relative;`,
			`  overflow: hidden;`,
			`}`,
			``,
			`.aurora > .mesh {`,
			`  position: absolute;`,
			...(v.blur > 0
				? [
						`  --pad: ${v.blur * 2}px;`,
						`  inset: calc(var(--pad) * -1);`,
						`  filter: blur(${v.blur}px);`
					]
				: [`  inset: 0;`]),
			...palette.map((c, i) => `  --aurora-c${i}: ${c};`),
			`  background-color: ${v.background};`,
			`  background-image:`,
			...layers.map((l, i) => `    ${l}${i < layers.length - 1 ? ',' : ';'}`),
			...(v.blendMode === 'normal' ? [] : [`  background-blend-mode: ${v.blendMode};`]),
			...(v.animate
				? [
						`  animation:`,
						...animations.map((a, i) => `    ${a}${i < animations.length - 1 ? ',' : ';'}`)
					]
				: []),
			`}`,
			...(v.animate
				? [
						``,
						`@keyframes clock { to { --aurora-t: 360deg; } }`,
						`@keyframes breathe { from { --aurora-falloff: 70%; } to { --aurora-falloff: 100%; } }`,
						...driftCode
					]
				: []),
			...(v.grain > 0
				? [``, `/* grain (opacity ${v.grain}): a separate noise layer on top, see section 5 */`]
				: []),
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .aurora > .mesh { animation: none; }`,
			`}`
		].join('\n');
	});

	let blobMarkup = $derived(
		[
			`<div class="aurora" aria-hidden="true">`,
			...layout.flatMap((b, i) => {
				const t = blobTiming(b, aurora.values.speed);
				const style = [
					`left: ${b.x}%`,
					`top: ${b.y}%`,
					`--orbit: ${b.orbit}cqmax`,
					`animation-duration: ${t.duration}s`,
					`animation-delay: ${t.delay}s`,
					...(t.reverse ? ['animation-direction: reverse'] : [])
				].join('; ');
				const inner = [
					`--color: var(--aurora-c${b.color})`,
					`animation-delay: ${+((-i * clock) / 7).toFixed(2)}s`
				].join('; ');
				return [
					`  <span class="orbit" style="${style}">`,
					`    <span class="blob" style="${inner}"></span>`,
					`  </span>`
				];
			}),
			`</div>`
		].join('\n')
	);

	let blobCode = $derived.by(() => {
		const v = aurora.values;
		return [
			...colorProps,
			``,
			`.aurora {`,
			`  container-type: size;`,
			`  position: relative;`,
			`  isolation: isolate;`,
			`  overflow: hidden;`,
			`  background: ${v.background};`,
			...palette.map((c, i) => `  --aurora-c${i}: ${c};`),
			...(v.animate && v.colorDrift
				? [`  animation: drift ${+(clock * 0.75).toFixed(2)}s ease-in-out infinite alternate;`]
				: []),
			`}`,
			``,
			`/* the outer span orbits... */`,
			`.orbit {`,
			`  position: absolute;`,
			`  width: ${v.blobSize}cqmax;`,
			`  aspect-ratio: 1;`,
			`  translate: -50% -50%;`,
			`  /* rotating around a point to the right moves the blob on a circle */`,
			`  transform-origin: calc(50% + var(--orbit)) 50%;`,
			...(v.blendMode === 'normal' ? [] : [`  mix-blend-mode: ${v.blendMode};`]),
			...(v.animate ? [`  animation: orbit linear infinite;`] : []),
			`}`,
			``,
			`/* ...the inner one is the soft circle, and breathes */`,
			`.blob {`,
			`  display: block;`,
			`  height: 100%;`,
			`  border-radius: 50%;`,
			`  background: radial-gradient(closest-side, var(--color), transparent);`,
			...(v.blur > 0 ? [`  filter: blur(${v.blur}px);`] : []),
			...(v.animate
				? [`  animation: pulse ${+(clock / 4).toFixed(2)}s ease-in-out infinite alternate;`]
				: []),
			`}`,
			...(v.animate
				? [
						``,
						`@keyframes orbit { to { rotate: 360deg; } }`,
						`@keyframes pulse { from { scale: 0.8; } to { scale: 1.05; } }`,
						...driftCode
					]
				: []),
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .aurora, .orbit, .blob { animation: none; }`,
			`}`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Aurora · Visual FX</title>
	<meta
		name="description"
		content="Animated aurora and mesh gradients with registered CSS custom properties, layered radial-gradients, blur and grain, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Aurora demo">
	{#snippet header()}
		<StageHeader title="Aurora" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="motion" data-motion={paused ? 'paused' : 'running'}>
			<Aurora {...aurora.values} class="aurora-stage">
				<div class="card">
					<p class="eyebrow">Mesh gradient</p>
					<h2>Aurora</h2>
					<p>
						Soft blobs of color drifting on slow orbits, painted by the browser from a handful of
						gradients and registered custom properties.
					</p>
					<MotionToggle bind:paused size="sm" />
				</div>
			</Aurora>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Aurora" code={aurora.markup('Aurora')} onreset={aurora.reset}>
			<ParamControls schema={auroraSchema} bind:values={aurora.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="An aurora from gradients that move"
			lede="A mesh gradient is a few soft color spots that blend into each other. Making them drift is the interesting part: CSS can't animate a gradient, but it can animate the numbers inside one, once the browser knows what type those numbers are."
		>
			<h3>Two ways to the same picture</h3>
			<p>
				Both techniques on this page draw the same blobs on the same orbits. They differ in who does
				the work every frame:
			</p>
			<dl>
				<dt>mesh</dt>
				<dd>
					One element, one <code>radial-gradient</code> per blob, all stacked in a single
					<code>background-image</code>. The blob positions are calculated from an animated custom
					property, so the browser repaints the whole gradient on every frame. Soft edges come from
					the gradient itself; a blur is optional.
				</dd>
				<dt>blobs</dt>
				<dd>
					One element per blob: a circle filled with the same fading gradient, usually blurred with
					<code>filter: blur()</code>. Each one orbits with a <code>rotate</code> animation, which the
					compositor can run on the GPU without repainting anything, as long as the colors stay put.
				</dd>
			</dl>

			<h3>1. Why the custom properties have to be registered</h3>
			<p>
				A gradient is an image, and images don't interpolate:
				<code>transition: background-image</code> from one gradient to another just swaps them. A
				normal custom property doesn't help either. To the browser,
				<code>--angle: 90deg</code> is not an angle but a list of tokens that happens to be spelled
				like one. It has no idea what lies between two token lists, so it animates them
				<em>discretely</em>: the value flips from start to end halfway through.
			</p>
			<p>
				<code>@property</code> registers a custom property with a type (its
				<code>syntax</code>), an <code>initial-value</code> and whether it <code>inherits</code>.
				Now the browser parses <code>90deg</code> as an <code>&lt;angle&gt;</code>, knows how to
				interpolate it, and recomputes everything that uses the property on every frame, gradients
				included. The two squares below run the identical animation; only the left one uses a
				registered property.
			</p>
			<div class="compare" data-motion={paused ? 'paused' : 'running'} aria-hidden="true">
				<figure>
					<div class="swatch registered"></div>
					<figcaption>registered <code>&lt;angle&gt;</code>: turns smoothly</figcaption>
				</figure>
				<figure>
					<div class="swatch unregistered"></div>
					<figcaption>unregistered: jumps in quarter turns</figcaption>
				</figure>
			</div>
			<p>The aurora registers three kinds of property:</p>
			<dl>
				<dt>&lt;angle&gt;</dt>
				<dd>
					<code>--aurora-t</code>, a clock running from 0 to 360deg. Each blob's position is derived
					from it with <code>cos()</code> and <code>sin()</code>.
				</dd>
				<dt>&lt;percentage&gt;</dt>
				<dd>
					<code>--aurora-falloff</code>, where each gradient fades to transparent. Swinging it
					between 70% and 100% makes the blobs breathe.
				</dd>
				<dt>&lt;color&gt;</dt>
				<dd>
					<code>--aurora-c0</code> … <code>--aurora-c4</code>, one per palette color. With
					<em>Color drift</em> on, each fades towards the next palette color. These
					<code>inherit</code>, so the colors set on the container reach every blob.
				</dd>
			</dl>

			<h3>2. The mesh: layered radial-gradients</h3>
			<p>
				Each blob is <code
					>radial-gradient(circle R at X Y, color, transparent var(--aurora-falloff))</code
				>. Multiple backgrounds are painted with the first one on top (the list is reversed so the
				last blob ends up on top, matching the DOM order of the blobs technique), and transparent
				parts let the layers below show through, so overlapping blobs mix like wet paint.
				<code>background-blend-mode</code> decides how they mix: <code>normal</code> stacks them,
				<code>screen</code> and <code>lighten</code> glow, <code>multiply</code> darkens.
			</p>
			<p>
				The orbit is plain trigonometry. A blob that starts at <code>(x, y)</code> and circles a
				point <code>r</code> to its right sits at
				<code>x + r − r·cos(a), y − r·sin(a)</code>, with <code>a = turns × t + phase</code>.
				<code>turns</code> is a whole number (±1 or ±2), so after one cycle of
				<code>t</code> every blob is exactly back at its start and the loop has no seam. Sizes and
				positions are in container query units (<code>cqw</code>, <code>cqh</code>,
				<code>cqmax</code>), so the composition scales with the box, not the viewport.
			</p>
			<p>This is the CSS for your current settings:</p>
			<CodeSnippet code={meshCode} />

			<h3>3. The blobs: blur and transforms</h3>
			<p>
				The classic aurora: big soft circles, heavily blurred. Each blob gets a
				<code>transform-origin</code> to the right of its center and rotates around it, which moves
				it along the same circle as in the mesh. A negative <code>animation-delay</code> starts it
				part-way round, at its phase angle. Blending uses <code>mix-blend-mode</code>, and
				<code>isolation: isolate</code> on the container keeps the blend inside it.
			</p>
			<CodeSnippet code={blobMarkup} />
			<CodeSnippet code={blobCode} />

			<h3>4. Blur or pure gradient?</h3>
			<p>
				A radial gradient that fades to transparent is already soft, so the mesh needs no blur at
				all. That is the cheapest variant: no filter, just a gradient repaint. Blur adds a different
				softness: it smears the blobs into each other where they overlap and rounds off the hard
				ring a gradient can show at its edge. The price is a filter pass over the whole layer, and
				its cost grows with the blur radius. To keep the blurred edges from fading to the
				background, the mesh layer overscans the box by twice the blur radius.
			</p>
			<p>
				The blobs technique blurs each blob separately. That is more filter passes, but each one is
				small, and a blurred layer only has to be redrawn when its content changes, not when it
				moves. The circles fade out with <code
					>radial-gradient(closest-side, color, transparent)</code
				>
				rather than being solid, so overlapping blobs mix instead of covering each other.
			</p>

			<h3>5. Banding, and why grain fixes it</h3>
			<p>
				Screens usually show 8 bits per color channel: 256 steps from dark to light. A gradient
				between two similar colors across a large area might only span 20 of those steps, so each
				step becomes a visible band, dozens of pixels wide. Our eyes exaggerate the edges between
				bands (Mach bands), which makes it look worse than the numbers suggest. Dark, low-contrast
				gradients like an aurora on a near-black background are the worst case.
			</p>
			<p>
				A faint noise layer dithers the bands away: it nudges neighboring pixels up and down by a
				step or two, so the boundary between two bands dissolves into a fine, even texture. The
				grain here is the <a href={resolve('/noise')}>noise component</a> at low opacity, blended
				with <code>overlay</code>.
			</p>

			<h3>Motion and accessibility</h3>
			<ul>
				<li>
					The animation stops completely when the user prefers reduced motion, and the
					<em>Pause animations</em> button freezes it (WCAG 2.2.2). The button sets
					<code>data-motion="paused"</code> on the stage, and a global rule sets
					<code>animation-play-state: paused</code> inside it.
				</li>
				<li>
					Nothing flashes. Even at speed 3 the fastest blob takes about 7 seconds per orbit and
					colors fade over tens of seconds: changes are gradual, far from three flashes per second.
				</li>
				<li>
					The art is <code>aria-hidden</code>. Text on top gets its own opaque surface: the contrast
					of text drawn straight onto moving colors can't be guaranteed.
				</li>
			</ul>

			<h3>Browser support</h3>
			<p class="note">
				Every feature used here is in all current engines: <code>@property</code>, the trig
				functions <code>cos()</code> and <code>sin()</code>, container query units and relative
				color syntax (<code>oklch(from … l calc(c * 1.2) h)</code>, used for
				<em>Saturation</em>). It was tested in Chromium 155 only; Firefox and Safari are untested. A
				browser without <code>@property</code> would treat the properties as unregistered: in the
				mesh technique the blobs would jump instead of drift, and color drift would step from one
				color to the next in both techniques. The orbits of the blobs technique animate
				<code>rotate</code>, a regular property, so they would still move smoothly.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					<strong>Large blurs are expensive.</strong> Blur cost grows with the radius and the blurred
					area. Twelve blobs at 120px blur over a full-screen area can keep a laptop GPU busy; four or
					five blobs are plenty.
				</li>
				<li>
					<strong>Transforms are cheap, repaints are not.</strong> The blobs technique animates
					<code>rotate</code> and <code>scale</code>, which the compositor applies to already
					rendered layers. The mesh technique changes the gradient itself, so it is repainted every
					frame. On a big screen that is more work, even though it is a single element.
				</li>
				<li>
					<strong>Animated colors repaint in both techniques.</strong> <em>Color drift</em> changes an
					inherited registered property on every frame, which means a style update and a repaint of every
					blob. Turn it off for the cheapest motion.
				</li>
				<li>Pausing (or reduced motion) costs nothing: a paused animation doesn't repaint.</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	@property --demo-angle {
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}

	.motion {
		display: grid;
	}

	:global(.aurora-stage) {
		display: grid;
		place-items: center;
		padding: var(--space-6);
	}

	/* Above the control panel, which docks to the bottom on narrow screens. */
	@media (width < 40rem) {
		:global(.aurora-stage) {
			align-items: start;
			padding-block-start: var(--space-16);
		}
	}

	/* Opaque enough that text keeps its contrast whatever drifts behind it. */
	.card {
		display: grid;
		justify-items: start;
		gap: var(--space-3);
		max-inline-size: 26rem;
		padding: var(--space-8);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-2xl);
		background: var(--color-overlay);
		box-shadow: var(--shadow-3);
		backdrop-filter: blur(16px);
	}

	.eyebrow {
		color: var(--color-accent-text);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.card h2 {
		font-size: var(--text-xl);
	}

	.card p:not(.eyebrow) {
		color: var(--color-text-muted);
	}

	.compare {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-6);
		margin-block: var(--space-4) var(--space-6);
	}

	.compare figure {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}

	.swatch {
		inline-size: 8rem;
		aspect-ratio: 1;
		border-radius: var(--radius-lg);
		animation: spin 6s linear infinite;
	}

	.registered {
		background: conic-gradient(
			from var(--demo-angle),
			oklch(70% 0.2 300),
			oklch(80% 0.15 200),
			oklch(70% 0.2 300)
		);
	}

	.unregistered {
		--demo-raw: 0deg;

		background: conic-gradient(
			from var(--demo-raw),
			oklch(70% 0.2 300),
			oklch(80% 0.15 200),
			oklch(70% 0.2 300)
		);
	}

	/* Quarter steps, so the discrete flips of the unregistered property are visible. */
	@keyframes spin {
		25% {
			--demo-angle: 90deg;
			--demo-raw: 90deg;
		}
		50% {
			--demo-angle: 180deg;
			--demo-raw: 180deg;
		}
		75% {
			--demo-angle: 270deg;
			--demo-raw: 270deg;
		}
		to {
			--demo-angle: 360deg;
			--demo-raw: 360deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.swatch {
			animation: none;
		}
	}
</style>
