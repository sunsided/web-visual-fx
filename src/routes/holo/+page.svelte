<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import HoloCard from '#lib/fx/holo/HoloCard.svelte';
	import { foilBackground, holoSchema, STATIC_POSE } from '#lib/fx/holo/holo.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const holo = new ParamState(holoSchema);
	let paused = $state(false);

	let cssCode = $derived.by(() => {
		const v = holo.values;
		const foil = foilBackground(v.pattern, v.stripeWidth, v.hueSpread);
		const list = (value: string) => value.split(/,\s(?![^()]*\))/).join(',\n    ');
		return [
			`/* untransformed wrapper: receives the pointer events, sets the depth */`,
			`.holo { perspective: ${v.perspective}px; touch-action: none; }`,
			``,
			`.card {`,
			`  /* written by JS, 0–1 */`,
			`  --pointer-x: 0.5;`,
			`  --pointer-y: 0.5;`,
			`  --pointer-active: 0;`,
			`  /* derived in CSS */`,
			`  --tilt-x: calc((0.5 - var(--pointer-y)) * ${2 * v.maxTilt}deg);`,
			`  --tilt-y: calc((var(--pointer-x) - 0.5) * ${2 * v.maxTilt}deg);`,
			`  --foil-x: calc(var(--pointer-x) * 100%);`,
			`  --foil-y: calc(var(--pointer-y) * 100%);`,
			``,
			`  position: relative;`,
			`  isolation: isolate;`,
			`  border-radius: ${v.radius}px;`,
			`  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));`,
			`}`,
			``,
			`.foil {`,
			`  position: absolute;`,
			`  inset: 0;`,
			`  border-radius: inherit;`,
			`  background-image:`,
			`    ${list(foil.image)};`,
			`  background-size: ${foil.size};`,
			`  background-position: ${foil.position};`,
			`  background-blend-mode: ${foil.blend};`,
			`  mix-blend-mode: ${v.blendMode};`,
			`  opacity: calc(${v.foilIntensity} * (0.4 + 0.6 * var(--pointer-active)));`,
			`  filter: brightness(0.75) contrast(1.4) saturate(1.3);`,
			`  pointer-events: none;`,
			`}`,
			``,
			`.glare {`,
			`  position: absolute;`,
			`  inset: 0;`,
			`  border-radius: inherit;`,
			`  background: radial-gradient(farthest-corner circle at var(--foil-x) var(--foil-y),`,
			`    rgb(255 255 255 / 0.85), rgb(255 255 255 / 0.2) 30%, rgb(0 0 0 / 0.25) 85%);`,
			`  mix-blend-mode: overlay;`,
			`  opacity: calc(${v.glare} * var(--pointer-active));`,
			`  pointer-events: none;`,
			`}`,
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .card { transform: none; }`,
			`}`
		].join('\n');
	});

	let jsCode = $derived(
		[
			`const box = document.querySelector('.holo');`,
			`const card = box.querySelector('.card');`,
			`const rest = { x: 0.5, y: 0.5, active: 0 };`,
			`let pose = { ...rest }, target = rest, last = 0, raf = 0;`,
			``,
			`box.addEventListener('pointermove', (e) => {`,
			`  // the wrapper, not the card: a rotated card has a different box`,
			`  const r = box.getBoundingClientRect();`,
			`  const x = (e.clientX - r.left) / r.width;`,
			`  const y = (e.clientY - r.top) / r.height;`,
			`  target = { x, y, active: 1 };`,
			`  raf ||= requestAnimationFrame(frame);`,
			`});`,
			`box.addEventListener('pointerleave', () => {`,
			`  target = rest;`,
			`  raf ||= requestAnimationFrame(frame);`,
			`});`,
			``,
			`function frame(now) {`,
			`  const dt = last ? now - last : 1000 / 60;`,
			`  last = now;`,
			`  // keep ${holo.values.smoothing} of the old value per 60 fps frame, at any frame rate`,
			`  const t = 1 - ${holo.values.smoothing} ** (dt / (1000 / 60));`,
			`  let done = true;`,
			`  for (const k of ['x', 'y', 'active']) {`,
			`    pose[k] += (target[k] - pose[k]) * t;`,
			`    if (Math.abs(target[k] - pose[k]) > 0.0005) done = false;`,
			`  }`,
			`  card.style.setProperty('--pointer-x', pose.x);`,
			`  card.style.setProperty('--pointer-y', pose.y);`,
			`  card.style.setProperty('--pointer-active', pose.active);`,
			`  raf = done ? 0 : requestAnimationFrame(frame);`,
			`  if (done) last = 0;`,
			`}`
		].join('\n')
	);
</script>

<svelte:head>
	<title>Holographic foil · Visual FX</title>
	<meta
		name="description"
		content="A trading-card style holographic foil with 3D tilt, blend modes and a pointer-driven glare, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Holographic foil demo">
	{#snippet header()}
		<StageHeader title="Holographic foil" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage" data-motion={paused ? 'paused' : 'running'}>
			<HoloCard {...holo.values} {paused} label="Lumen Moth card" class="demo">
				{#snippet art()}
					<svg viewBox="0 0 240 180" aria-hidden="true">
						<defs>
							<linearGradient id="holo-sky" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stop-color="#1d1a4d" />
								<stop offset="0.6" stop-color="#5b3a8c" />
								<stop offset="1" stop-color="#e58bb4" />
							</linearGradient>
							<radialGradient id="holo-moon">
								<stop offset="0" stop-color="#fff6d8" />
								<stop offset="1" stop-color="#f3c977" />
							</radialGradient>
						</defs>
						<rect width="240" height="180" fill="url(#holo-sky)" />
						<g fill="#fff" opacity="0.8">
							<circle cx="30" cy="24" r="1.2" />
							<circle cx="70" cy="48" r="0.9" />
							<circle cx="196" cy="30" r="1.4" />
							<circle cx="214" cy="70" r="0.8" />
							<circle cx="150" cy="16" r="1" />
							<circle cx="18" cy="84" r="0.8" />
						</g>
						<circle cx="120" cy="78" r="44" fill="url(#holo-moon)" opacity="0.95" />
						<path
							d="M0 150 L50 112 L86 136 L132 98 L176 132 L210 116 L240 136 V180 H0 Z"
							fill="#2a1d4f"
						/>
						<path d="M0 168 L40 146 L90 162 L150 140 L200 160 L240 150 V180 H0 Z" fill="#160f30" />
						<!-- the moth: two pairs of wings around a slim body -->
						<g transform="translate(120 82)">
							<path d="M0 -4 C-26 -40 -64 -26 -54 -2 C-48 10 -20 8 0 0 Z" fill="#3b2a6e" />
							<path d="M0 -4 C26 -40 64 -26 54 -2 C48 10 20 8 0 0 Z" fill="#3b2a6e" />
							<path d="M0 2 C-18 6 -40 22 -30 34 C-22 42 -6 24 0 6 Z" fill="#4c3787" />
							<path d="M0 2 C18 6 40 22 30 34 C22 42 6 24 0 6 Z" fill="#4c3787" />
							<circle cx="-32" cy="-14" r="7" fill="#f3c977" />
							<circle cx="32" cy="-14" r="7" fill="#f3c977" />
							<ellipse cx="0" cy="4" rx="3.5" ry="18" fill="#1d1640" />
							<path
								d="M-1 -12 Q-8 -26 -14 -28 M1 -12 Q8 -26 14 -28"
								stroke="#1d1640"
								stroke-width="1.5"
								fill="none"
							/>
						</g>
					</svg>
				{/snippet}
				<div class="card-head">
					<h2>Lumen Moth</h2>
					<p class="number">No. 042</p>
				</div>
				<p class="kind">Rare · Night flyer</p>
				<p class="ability">
					<strong>Afterglow.</strong> Leaves a trail of soft light that lasts until dawn.
				</p>
				<dl class="stats">
					<div>
						<dt>Glow</dt>
						<dd>7</dd>
					</div>
					<div>
						<dt>Drift</dt>
						<dd>4</dd>
					</div>
					<div>
						<dt>Hush</dt>
						<dd>9</dd>
					</div>
				</dl>
			</HoloCard>

			<div class="tools">
				<p class="hint">Point at the card, drag on touch, or focus it and use the arrow keys.</p>
				<MotionToggle bind:paused size="sm" />
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Holographic foil" code={holo.markup('HoloCard')} onreset={holo.reset}>
			<ParamControls schema={holoSchema} bind:values={holo.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A holographic card from gradients and blend modes"
			lede="No images and no WebGL: the foil is three gradients blended onto the card, the tilt is two CSS rotations, and a few lines of JavaScript feed both with the pointer position."
		>
			<h3>The stack, back to front</h3>
			<ol>
				<li>
					<strong>Card.</strong> A dark gradient background with the art inside it. Everything below is
					blended onto these colors, so a mid-dark, saturated card gives the most vivid foil.
				</li>
				<li>
					<strong>Foil.</strong> A rainbow gradient, blended with a greyscale relief pattern, then
					blended onto the card with <code>mix-blend-mode</code>. Covers the whole card or, with
					<em>Foil on art only</em>, just the illustration.
				</li>
				<li>
					<strong>Sparkle.</strong> A fine, static noise texture inside the foil (the same component
					as on the <a href={resolve('/noise')}>noise page</a>).
				</li>
				<li><strong>Glare.</strong> A soft white highlight that sits under the pointer.</li>
				<li>
					<strong>Text.</strong> The name and description, on a nearly opaque plate <em>above</em> foil
					and glare.
				</li>
			</ol>

			<h3>1. Pointer state in CSS custom properties</h3>
			<p>
				The whole effect is driven by three numbers on the card element: <code>--pointer-x</code>
				and <code>--pointer-y</code> (where the pointer is, 0 to 1 from the top left corner) and
				<code>--pointer-active</code> (0 at rest, 1 while someone points at the card). JavaScript
				only ever writes these three, with <code>element.style.setProperty()</code>. Everything else
				is CSS computed from them:
			</p>
			<dl>
				<dt>--tilt-x, --tilt-y</dt>
				<dd>
					The rotation angles: <code>calc((0.5 - var(--pointer-y)) * 2 * maxTilt)</code>, so the
					center is flat and the edges reach the maximum.
				</dd>
				<dt>--foil-x, --foil-y</dt>
				<dd>
					The same position as percentages, for <code>background-position</code> and the center of the
					glare.
				</dd>
				<dt>--pointer-active</dt>
				<dd>
					Used directly for the glare opacity, the foil opacity, the shadow and a slight lift.
				</dd>
			</dl>
			<p>Why this split works well:</p>
			<ul>
				<li>
					Custom properties inherit, so the foil and glare children read <code>--foil-x</code>
					without any extra wiring. They inherit <code>calc(0.37 * 100%)</code>, not a pixel value:
					the percentage is only resolved where it is used, against each child's own box.
				</li>
				<li>
					No framework state changes per frame: the component doesn't re-render while you move the
					pointer, the browser just recomputes styles for one small subtree.
				</li>
				<li>
					The look stays in CSS. Max tilt, glare strength or blend mode are just more custom
					properties; the JavaScript doesn't know about any of them.
				</li>
				<li>
					It degrades well. Without JavaScript the properties keep their resting values from the
					stylesheet, and the card renders flat and still.
				</li>
			</ul>
			<p class="note">
				Unregistered custom properties can't be transitioned: the browser has no idea that
				<code>0.3</code> is a number, so a change jumps. Registering them with
				<code>@property</code> fixes that, but a CSS transition restarts on every pointer move and feels
				laggy. The smoothing therefore happens in JavaScript, see section 3.
			</p>

			<h3>2. The tilt: perspective + rotateX/rotateY</h3>
			<p>
				<code>transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y))</code> turns the card around
				its horizontal and vertical axes. Without perspective, a rotated element is just squashed.
				The
				<code>perspective</code> property on the <em>parent</em> places a virtual viewer that many pixels
				in front of the screen, so the near edge gets larger and the far edge smaller. Small values (300px)
				are dramatic, large ones (2000px) subtle. The signs are chosen so the part under the pointer tips
				away, as if you pressed on it.
			</p>
			<p>
				The pointer position is measured on that untransformed parent. A rotated element's
				<code>getBoundingClientRect()</code> is the box around its projection, which changes as the card
				tilts. Measuring the card itself would feed the tilt back into the input and make it jitter. The
				shadow moves opposite to the pointer, so the light seems to come from the front.
			</p>

			<h3>3. Smoothing: a frame-rate independent lerp</h3>
			<p>
				Copying the raw pointer straight into the card feels cheap and twitchy. Instead, a
				<code>requestAnimationFrame</code> loop moves the current pose a fraction of the way towards
				the target on every frame (linear interpolation, <em>lerp</em>). That gives an exponential
				ease out: fast at first, then gently settling.
			</p>
			<p>
				A fixed fraction per frame would make the card twice as fast on a 120 Hz screen. So the
				fraction is derived from the time since the last frame:
				<code>t = 1 − smoothing<sup>Δt / 16.7 ms</sup></code>. <em>Smoothing</em> is the share of the
				old value kept per 60 fps frame. Without the idle sweep, the loop stops as soon as the card has
				arrived, so a card nobody touches costs nothing. The sweep itself never arrives, so while it runs
				the loop keeps going, throttled to 30 fps (it moves slowly enough that nobody can tell) and paused
				while the card is off-screen.
			</p>
			<CodeSnippet code={jsCode} />

			<h3>4. The foil: rainbow × relief × blend mode</h3>
			<p>
				Real holographic foil has a fine embossed pattern that splits light into colors depending on
				the viewing angle. Imitated with three gradients:
			</p>
			<ol>
				<li>
					<strong>Rainbow.</strong> A <code>linear-gradient</code> through OKLCH hues covering
					<em>Hue spread</em> degrees of the color wheel. It is three times the size of the card (<code
						>background-size: 300% 300%</code
					>) and <code>background-position</code> follows the pointer, so a different stretch of colors
					slides into view as the card tilts.
				</li>
				<li>
					<strong>Relief.</strong> A greyscale <code>repeating-linear-gradient</code> on top of it:
					stripes, two crossed sets for <em>crosshatch</em>, or a
					<code>repeating-conic-gradient</code> centered on the pointer for <em>sunburst</em>. It
					doesn't move, like the embossing on a real card.
					<code>background-blend-mode: hard-light</code> mixes it into the rainbow: dark stripes darken,
					light ones brighten.
				</li>
				<li>
					<strong>Blend onto the card.</strong> <code>mix-blend-mode</code> on the foil layer mixes
					the result with the card below. <code>color-dodge</code> brightens the card by the foil's
					colors and gives the punchy, metallic look; <code>overlay</code> and
					<code>soft-light</code>
					keep the art recognizable and only tint it; <code>screen</code> is a gentle lighten. A
					<code>filter: brightness() contrast()</code> on the foil first pushes its dark parts towards
					black, which color-dodge leaves alone, so only the stripes light up.
				</li>
			</ol>
			<p>
				<code>isolation: isolate</code> on the card limits the blending to the card's own layers;
				the page behind it is never part of the mix. The foil's opacity is
				<code>intensity × (0.4 + 0.6 × --pointer-active)</code>: present at rest, full while you
				look at it.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>5. Glare and sparkle</h3>
			<p>
				The glare is a <code>radial-gradient</code> centered on <code>--foil-x/--foil-y</code>,
				white in the middle and slightly dark at the far corner, blended with <code>overlay</code>.
				Its opacity is <code>glare × --pointer-active</code>, so it fades in and out with the
				smoothing. The sparkle is an <code>feTurbulence</code> noise with very high contrast,
				blended with
				<code>color-dodge</code> inside the foil: only the brightest specks survive. It is static; the
				sense of glitter comes from the foil sliding underneath, so nothing flickers.
			</p>

			<h3>6. Readable text</h3>
			<p>
				<code>color-dodge</code> can push any color to white, so no text color is safe on top of it.
				The card's text therefore sits on a nearly opaque plate (94%) that is stacked above foil and
				glare (<code>z-index</code> inside the card). Even if the card behind it turned pure white, the
				plate stays dark enough for about 15:1 on the name and 10:1 on the dimmer details, whatever the
				settings.
			</p>

			<h3>7. Keyboard, touch, idle and reduced motion</h3>
			<ul>
				<li>
					<strong>Keyboard.</strong> The card is focusable. Arrow keys move the virtual pointer in
					steps of a tenth of the card, Shift jumps to the edge, Escape or Home straighten it, and
					leaving the card returns it to rest. A focusable group doesn't tell anyone that arrow keys
					do something, so the instructions are the card's <code>aria-describedby</code>
					description, the keys are listed in
					<code>aria-keyshortcuts</code>, and the same text appears below the card while it has
					keyboard focus. Keys that would change nothing (Up at the top edge) aren't intercepted, so
					they still scroll the page.
				</li>
				<li>
					<strong>Touch.</strong> Pointer events cover mouse, pen and touch alike.
					<code>touch-action: none</code> on the card's wrapper lets a finger drag tilt the card instead
					of scrolling the page; scroll by touching outside the card.
				</li>
				<li>
					<strong>Idle sweep.</strong> While nobody interacts, the target slowly follows a Lissajous
					curve (two sine waves of 9 and 13 seconds), so the foil keeps catching the light. It
					pauses with the page's animation toggle and while the card is scrolled out of view (an
					<code>IntersectionObserver</code>).
				</li>
				<li>
					<strong>Reduced motion.</strong> With <code>prefers-reduced-motion: reduce</code> there is
					no tilt, no sweep and no response to the pointer: motion triggered by pointing is still
					motion. The foil is parked at x = {STATIC_POSE.x}, y = {STATIC_POSE.y}, an angle where
					colors and glare are clearly visible.
				</li>
			</ul>

			<h3>Browser support and cost</h3>
			<p class="note">
				Everything used here (3D transforms, <code>mix-blend-mode</code>,
				<code>background-blend-mode</code>, <code>repeating-conic-gradient</code>, custom properties
				in <code>calc()</code>) is supported by all current engines. The page was checked in
				Chromium; Firefox and Safari weren't tested. Blend modes are computed in sRGB, so colors may
				differ slightly between engines.
			</p>
			<p>
				Cost: the rotation itself is cheap, but the moving gradients and blend modes repaint the
				card on every frame while it moves. That is fine for one card of this size. A grid of dozens
				of foil cards should turn the idle sweep off: then only the card under the pointer runs its
				loop, and every untouched card's loop is stopped.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		position: relative;
		display: grid;
		place-items: center;
		padding: var(--space-16) var(--space-4);
		background:
			radial-gradient(circle at 50% 40%, oklch(32% 0.07 285), transparent 70%), oklch(14% 0.02 285);
	}

	.stage :global(.demo) {
		--holo-width: min(18rem, 72vw);
	}

	.card-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
	}

	h2 {
		font-size: var(--text-lg);
	}

	.number,
	.kind {
		color: oklch(85% 0.02 285);
		font-size: var(--text-xs);
	}

	.kind {
		margin-block: var(--space-1) var(--space-2);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.ability {
		font-size: var(--text-sm);
		line-height: var(--leading-tight);
	}

	.stats {
		display: flex;
		justify-content: space-between;
		margin: var(--space-3) 0 0;
		font-size: var(--text-xs);
	}

	.stats div {
		display: flex;
		gap: var(--space-1);
	}

	.stats dt {
		color: oklch(85% 0.02 285);
	}

	.stats dd {
		margin: 0;
		font-weight: var(--weight-bold);
	}

	.tools {
		position: absolute;
		inset-block-end: var(--space-4);
		inset-inline-start: var(--space-4);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		max-inline-size: calc(100% - 22rem);
		padding: var(--space-1) var(--space-1) var(--space-1) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-overlay);
		color: var(--color-text);
		box-shadow: var(--shadow-2);
	}

	.hint {
		font-size: var(--text-xs);
	}

	@media (width < 40rem) {
		.stage {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: flex-start;
			gap: var(--space-4);
			padding-block-start: calc(var(--space-16) + var(--space-2));
		}

		.tools {
			position: static;
			order: -1;
			max-inline-size: none;
			border-radius: var(--radius-lg);
		}
	}
</style>
