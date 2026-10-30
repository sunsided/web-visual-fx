<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Glitch from '#lib/fx/glitch/Glitch.svelte';
	import {
		glitchPadding,
		glitchSchema,
		MAX_CHANGES_PER_SECOND,
		MAX_FLASHES_PER_SECOND,
		periodTicks,
		sliceScales,
		TICK_HZ
	} from '#lib/fx/glitch/glitch.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		kind: { kind: 'select', label: 'Image', default: 'stripes', options: scenes, group: 'Stage' },
		animate: { kind: 'toggle', label: 'Animate image', default: false, group: 'Stage' }
	});

	const fx = new ParamState(glitchSchema);
	const demo = new ParamState(stageSchema);
	let paused = $state(false);

	function reset() {
		fx.reset();
		demo.reset();
	}

	// Mirrors GlitchFilter.svelte for a glitch frame with the current settings.
	let filterCode = $derived.by(() => {
		const v = fx.values;
		const pad = glitchPadding(v.shift, v.fringe, v.split, v.burstSplit);
		const s = sliceScales(v.shift, v.fringe);
		const dx = v.split + v.burstSplit;
		const offsets = { r: dx, g: 0, b: -dx };
		const keep = {
			r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
			g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
			b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
		};
		const lines = [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <!-- W × H: the element's size in px -->`,
			`  <filter id="glitch" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"`,
			`          x="-${pad}" y="0" width="W + ${2 * pad}" height="H"`,
			`          color-interpolation-filters="sRGB">`,
			`    <!-- 1 × H px PNG: red = row offset around 128, green = 128 -->`,
			`    <feImage href="data:image/png;base64,…" x="-${pad}" y="0"`,
			`             width="W + ${2 * pad}" height="H" preserveAspectRatio="none" result="map" />`
		];
		for (const c of ['r', 'g', 'b'] as const) {
			lines.push(
				`    <feColorMatrix in="SourceGraphic" type="matrix" values="${keep[c]}" />`,
				`    <feOffset dx="${offsets[c]}" dy="0" />`,
				`    <feDisplacementMap in2="map" scale="${s[c]}"`,
				`                       xChannelSelector="R" yChannelSelector="G" result="${c}" />`
			);
		}
		lines.push(
			`    <feBlend in="r" in2="g" mode="screen" result="rg" />`,
			`    <feBlend in="rg" in2="b" mode="screen" />`,
			`  </filter>`,
			`</svg>`
		);
		return lines.join('\n');
	});

	const rowCode = [
		`for each of the slices:`,
		`  height = sliceHeight × (1/6 … 1)     // seeded`,
		`  top    = 0 … H − height             // seeded`,
		`  offset = ±(0.2 … 1)                 // seeded`,
		`  rows[top … top + height] = offset`,
		``,
		`red = 128 + offset × 127               // one pixel per row`
	].join('\n');

	let period = $derived(periodTicks(fx.values.interval, fx.values.burstFrames) / TICK_HZ);
</script>

<svelte:head>
	<title>Glitch · Visual FX</title>
	<meta
		name="description"
		content="Digital glitch on any HTML: slices displaced by a generated feImage map through feDisplacementMap, plus an RGB split, in photosensitivity-safe bursts."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Glitch demo">
	{#snippet header()}
		<StageHeader title="Glitch" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="surface" data-theme="dark" data-motion={paused ? 'paused' : 'running'}>
			<figure class="poster">
				<Glitch {...fx.values} class="art">
					<Scene
						kind={demo.values.kind}
						animate={demo.values.animate}
						class="image"
						--scene-scrim="oklch(0% 0 0 / 0.5)"
					>
						<div class="copy">
							<p class="kicker">Channel 04</p>
							<h2 class="headline">Signal lost</h2>
							<p class="sub">Please stand by</p>
						</div>
					</Scene>
				</Glitch>
				<figcaption>
					Slices of the picture jump sideways and the color channels tear apart, a few frames at a
					time.
				</figcaption>
			</figure>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Glitch" code={fx.markup('Glitch')} onreset={reset}>
			<MotionToggle bind:paused size="sm" class="motion-toggle" />
			<ParamControls schema={glitchSchema} bind:values={fx.values} />
			<ParamControls schema={stageSchema} bind:values={demo.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Slices from a one-pixel-wide image"
			lede="A broken video signal loses sync line by line: some lines start too early, some too late, and the color channels drift apart. An SVG filter can do the same to any HTML with a generated displacement map that is a single pixel wide."
		>
			<h3>The pipeline</h3>
			<p>
				The component applies a regular <code>filter: url(#id)</code> to its content. On every glitch
				frame the filter does three things:
			</p>
			<ol>
				<li>
					<strong>Load the row offsets</strong> with <code>feImage</code>, from a tiny PNG generated
					for the frame.
				</li>
				<li>
					<strong>Split the channels</strong> with <code>feColorMatrix</code> and
					<code>feOffset</code>, like the <a href={resolve('/chromatic')}>chromatic aberration</a> page.
				</li>
				<li>
					<strong>Shift the slices</strong> of each channel with <code>feDisplacementMap</code>,
					then screen the three channels back together with <code>feBlend</code>.
				</li>
			</ol>
			<p>Between bursts the map is left out, and only the static channel split remains.</p>

			<h3>1. The slice map</h3>
			<p>
				<code>feDisplacementMap</code> moves every pixel by
				<code>scale × (channel − ½)</code>, reading the channel from a second image. A slice is a
				run of rows that all move by the same amount, so the map only needs one value per row: a PNG
				that is one pixel wide and exactly as tall as the element, in px. Red holds the offset
				around 128; green is 128 everywhere, so nothing moves vertically. The bands are drawn from a
				seeded random generator (mulberry32, shared with the
				<a href={resolve('/aurora')}>aurora</a>), so a seed always gives the same layouts:
			</p>
			<CodeSnippet code={rowCode} />
			<p>
				<code>feImage</code> stretches the map over the filter region with
				<code>preserveAspectRatio="none"</code>. Stretching sideways changes nothing, since every
				row is one color. Vertically the map has one pixel per CSS px, so the cuts between slices
				stay hard. A map stretched from fewer rows would be smoothed by the browser, and the slices
				would bend into each other instead of breaking. The PNG is encoded in plain TypeScript with
				the same small encoder as the <a href={resolve('/crt')}>CRT</a>'s barrel map, without a
				canvas: a 600 px tall element gives a map of about 2 KB.
			</p>

			<h3>2. Channel split and fringe</h3>
			<p>
				Each channel is isolated and moved on its own. The <em>Channel split</em> moves red right
				and blue left all the time; a glitch frame adds the <em>Burst split</em>. The slices then
				move with a different <code>scale</code> per channel: red by 1 + <em>fringe</em>, blue by 1
				−
				<em>fringe</em> of the shift. Inside a displaced slice the channels land at different places,
				so the cut edges tear into red and blue while the untouched rows keep only the small static split.
			</p>
			<p>
				The filter region uses <code>filterUnits="userSpaceOnUse"</code> and is padded sideways by
				the furthest red can travel, currently {glitchPadding(
					fx.values.shift,
					fx.values.fringe,
					fx.values.split,
					fx.values.burstSplit
				)} px. Slices only move horizontally, so there is no vertical padding. The filter for a glitch
				frame with your settings:
			</p>
			<CodeSnippet code={filterCode} />

			<h3>3. Bursts on a CSS clock</h3>
			<p>
				The bursts are timed by a hidden element running a CSS animation that repeats every {1000 /
					TICK_HZ} ms. Every <code>animationiteration</code> event advances a tick counter, and a
				pure function turns the tick into a frame: time is cut into periods of the
				<em>Burst interval</em>
				(currently {period} s), and each period holds one burst of <em>Burst frames</em> consecutive ticks
				at a seeded moment. The first tick of a period is always calm, so bursts never merge.
			</p>
			<p>
				Using a CSS animation as the clock means the browser stops it in the same places it stops
				every other animation: under <code>prefers-reduced-motion</code>, inside a
				<code>data-motion="paused"</code> region (the pause button in the panel), off screen and in background
				tabs. Pausing freezes the frame that is showing.
			</p>

			<h3>Photosensitivity</h3>
			<p>
				Glitches are a classic seizure trigger: big, sudden changes, often in bright colors. WCAG
				2.3.1 allows at most three flashes in any second, where a flash is a pair of opposing
				changes in luminance. A glitch frame can move bright content over dark content anywhere in
				the element, so the effect does not try to estimate how strong a change is. It limits how
				often the picture may change at all: only on a tick, {TICK_HZ} times per second. That is at most
				{MAX_CHANGES_PER_SECOND}
				changes, so at most {MAX_FLASHES_PER_SECOND} flashes per second even if every change were a full-contrast
				flash. A unit test checks this for every second of a long sequence. The bursts are also short
				and rare by default, and the page has a pause button (WCAG 2.2.2).
			</p>
			<p>
				With reduced motion, no burst ever plays. <em>Still image</em> picks what shows instead: by default
				only the static channel split, or one frozen glitch frame, or nothing at all.
			</p>

			<h3>Readability</h3>
			<p>
				During a burst the text is hard to read; that is the point, but keep it to short, decorative
				type. The static split is small by default (1.5 px). The caption under the poster is outside
				the filter. The text inside stays real text: screen readers and selection are unaffected.
			</p>

			<h3>Browser support and performance</h3>
			<p class="note">
				SVG filters on HTML, including <code>feImage</code> with a data URL and
				<code>feDisplacementMap</code>, are Baseline widely available (web-features 3.44.0). Checked
				in Chromium; other engines are untested.
			</p>
			<ul>
				<li>
					On static content the filtered result is cached. A burst changes the map, which reruns the
					filter over the whole element, at most four times a second. Animated content (try
					<em>Animate image</em>) reruns it every frame.
				</li>
				<li>
					The filter isolates three channels and displaces each, so it costs about three times a
					single displacement. On a large, high-DPI area keep the element as small as the design
					allows.
				</li>
				<li>
					Generating a map is a loop over the rows and a few kilobytes of PNG, so it is negligible
					next to the filter itself.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.surface {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-16) var(--space-4);
		background: oklch(12% 0.02 270);
		color: oklch(100% 0 0);
	}

	.poster {
		display: grid;
		inline-size: min(40rem, 100%);
		margin: 0;
	}

	.poster :global(.image) {
		display: grid;
		place-items: center;
		block-size: min(26rem, 55dvh);
	}

	.copy {
		text-align: center;
		text-shadow:
			0 0 0.06em oklch(0% 0 0 / 0.6),
			0 0 0.25em oklch(0% 0 0 / 0.5);
	}

	.kicker,
	.sub {
		margin: 0;
		font-family: var(--font-mono, monospace);
		font-size: var(--text-sm);
		letter-spacing: 0.3em;
		text-transform: uppercase;
	}

	.headline {
		margin: var(--space-2) 0;
		font-size: clamp(2.5rem, 9vw, 4.5rem);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.02em;
		text-transform: uppercase;
	}

	figcaption {
		margin-block-start: var(--space-3);
		color: oklch(85% 0.01 285);
		font-size: var(--text-sm);
	}

	:global(.motion-toggle) {
		justify-self: start;
	}

	@media (width >= 64rem) {
		.surface {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
