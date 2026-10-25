<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import CrtScreen from '#lib/fx/crt/CrtScreen.svelte';
	import RetroTerminal from '#lib/fx/crt/RetroTerminal.svelte';
	import {
		crtDefaults,
		crtSchema,
		FLICKER_DIPS_PER_SECOND,
		MAX_FLICKER,
		maxFlickerChange,
		maxFlickerStep,
		ROLLING_BAR_OPACITY,
		safeFlicker,
		worstTextContrast
	} from '#lib/fx/crt/crt.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const crt = new ParamState(crtSchema);
	let paused = $state(false);

	let contrast = $derived(worstTextContrast(crt.values));
	let low = $derived(contrast < 4.5);
	let lowMessage = $derived(low ? 'Text contrast is below 4.5 to 1, hard to read.' : '');

	let filterCode = $derived.by(() => {
		const v = crt.values;
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="crt" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			...(v.curvature > 0
				? [
						`    <!-- 64×64 PNG: R = 0.5 + u·r²/4, G = 0.5 + v·r²/4, stretched over the screen -->`,
						`    <feImage href="data:image/png;base64,…" preserveAspectRatio="none" result="map" />`,
						`    <!-- scale = 2 × ${v.curvature} × shorter side in px -->`,
						`    <feDisplacementMap in="SourceGraphic" in2="map" scale="…"`,
						`                       xChannelSelector="R" yChannelSelector="G" result="warped" />`
					]
				: [`    <feOffset in="SourceGraphic" result="warped" />`]),
			...(v.glow > 0
				? [
						`    <feGaussianBlur in="warped" stdDeviation="${v.glowRadius}" />`,
						`    <feComponentTransfer result="bloom">`,
						...['R', 'G', 'B'].map((c) => `      <feFunc${c} type="linear" slope="${v.glow}" />`),
						`    </feComponentTransfer>`,
						`    <feBlend in="warped" in2="bloom" mode="screen" />`
					]
				: []),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	let cssCode = $derived.by(() => {
		const v = crt.values;
		const dim = Math.round(255 * (1 - v.mask));
		return [
			`.tube { filter: url(#crt); background: ${v.background}; color: ${v.phosphor}; }`,
			``,
			`/* full-size layers inside .tube, above the content */`,
			`.scanlines {`,
			`  background: linear-gradient(transparent 50%, rgb(0 0 0 / ${v.scanlines}) 0)`,
			`    0 0 / 100% ${v.lineHeight}px;`,
			`}`,
			``,
			`.mask {`,
			`  background: linear-gradient(90deg,`,
			`      rgb(255 ${dim} ${dim}) 0 33.333%,`,
			`      rgb(${dim} 255 ${dim}) 0 66.667%,`,
			`      rgb(${dim} ${dim} 255) 0)`,
			`    0 0 / ${v.maskSize * 3}px 100%;`,
			`  mix-blend-mode: multiply;`,
			`}`,
			``,
			`/* above .tube, not filtered */`,
			`.vignette {`,
			`  background: radial-gradient(ellipse farthest-corner,`,
			`    transparent 55%, rgb(0 0 0 / ${+(v.vignette * 0.85).toFixed(2)}) 100%);`,
			`}`,
			``,
			`@media (prefers-reduced-motion: no-preference) {`,
			`  .bar { animation: roll 9s linear infinite; } /* white at ${ROLLING_BAR_OPACITY} */`,
			`  .flicker {`,
			`    background: rgb(0 0 0 / ${safeFlicker(v.flickerAmount)}); /* never above ${MAX_FLICKER} */`,
			`    animation: flicker ${3 / FLICKER_DIPS_PER_SECOND}s ease-in-out infinite; /* 3 dips */`,
			`  }`,
			`}`
		].join('\n');
	});
</script>

<svelte:head>
	<title>CRT · Visual FX</title>
	<meta
		name="description"
		content="A CRT monitor look for real, readable text: scanlines, phosphor mask, barrel distortion with feDisplacementMap, bloom and a photosensitivity-safe flicker, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="CRT demo">
	{#snippet header()}
		<StageHeader title="CRT" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="room" data-motion={paused ? 'paused' : 'running'}>
			<div class="monitor">
				<CrtScreen {...crt.values} class="screen">
					<RetroTerminal />
				</CrtScreen>
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="CRT" code={crt.markup('CrtScreen')} onreset={crt.reset}>
			<MotionToggle bind:paused size="sm" class="motion-toggle" />
			<p class={['contrast', { low }]}>
				Text contrast at the darkest pixel: <strong>{contrast.toFixed(1)}:1</strong>
				{#if low}
					(below 4.5:1, hard to read; lower the scanlines or mask)
				{/if}
			</p>
			<!-- Announces only when the 4.5:1 threshold is crossed, not on every slider step. -->
			<p class="visually-hidden" role="status">{lowMessage}</p>
			<ParamControls schema={crtSchema} bind:values={crt.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A cathode-ray tube from gradients and one filter"
			lede="An old monitor isn't one effect but a handful of physical side effects stacked on top of each other. Each one maps to a cheap CSS or SVG layer, and the text underneath stays real, selectable and readable."
		>
			<h3>The stack</h3>
			<ol>
				<li>
					<strong>Content.</strong> Plain HTML text in the phosphor color on a dark background. The selected
					menu entry is inverse video, the same two colors swapped.
				</li>
				<li>
					<strong>Scanlines and phosphor mask</strong>, two gradient layers on top of the content.
				</li>
				<li>
					<strong>Tube filter</strong> on the wrapper around both: barrel distortion and bloom, so the
					lines bend and glow together with the text.
				</li>
				<li>
					<strong>Vignette, rolling bar and flicker</strong> above the filtered part. They are kept out
					of the filter on purpose: anything animated inside a filter makes the browser rerun the whole
					filter on every frame.
				</li>
			</ol>

			<h3>1. Scanlines</h3>
			<p>
				A CRT draws the picture line by line with an electron beam, and between the lines the
				phosphor stays dark. A <code>linear-gradient(transparent 50%, rgb(0 0 0 / a) 0)</code>
				with a <code>background-size</code> height of a few pixels repeats a dark lower half on
				every line. Using <code>0</code> as the second stop position means "same as the previous stop",
				which makes the edge hard. The line pitch should be a whole number of CSS pixels, otherwise the
				lines blur into a moiré pattern.
			</p>

			<h3>2. The phosphor mask</h3>
			<p>
				Color CRTs light red, green and blue phosphor stripes (Trinitron's aperture grille) or dots
				(shadow mask). The layer is a horizontal gradient with three hard-edged thirds, tiled every
				three stripe widths, and <code>mix-blend-mode: multiply</code> onto the picture. Each stripe lets
				its own channel through untouched and dims the other two by the mask strength. At full strength
				that would cut two thirds of the light, which is why real monitors looked dim and the default
				here is gentle.
			</p>

			<h3>3. Barrel distortion: feDisplacementMap with a generated map</h3>
			<p>
				The glass of a CRT is curved, so the picture bulges and its corners pull in. The tube filter
				starts with <code>&lt;feDisplacementMap&gt;</code>, the same primitive the
				<a href={resolve('/glass')}>frosted glass</a> uses with noise. Here the map isn't noise but a
				small generated image:
			</p>
			<ul>
				<li>
					For coordinates <code>u, v</code> from −1 to 1 and <code>r² = u² + v²</code>, barrel
					distortion samples the source at <code>p · (1 + k·r²)</code>, so the offset is
					<code>k · p · r²</code>: zero in the middle, growing quickly towards the edges.
				</li>
				<li>
					The k-independent part, <code>u·r²/4</code> and <code>v·r²/4</code>, goes into the red and
					green channels around 0.5 of a 64×64 image. The PNG is encoded in TypeScript
					(uncompressed, about 12 KB), so it is the same on the server and in every browser and
					needs no canvas.
				</li>
				<li>
					<code>&lt;feImage&gt;</code> without a position or size fills the whole filter region, and
					<code>preserveAspectRatio="none"</code> stretches the map to the screen's shape (the
					browser smooths it). Giving it an explicit size in pixels looks equivalent, but WebKit
					drew it about 20px short, which left a strip where the text appeared twice. The
					displacement
					<code>scale</code> is 2 × curvature × the shorter side in pixels, which is why the component
					measures its size: filter units are pixels, not percentages.
				</li>
			</ul>
			<p>
				Pixels near the corners are fetched from outside the element and come out transparent, which
				shows the dark bezel color: that is the curved outline of the picture. The displacement
				picks pixels without smoothing, so very high curvature makes thin strokes jagged; the bloom
				softens that a little.
			</p>

			<h3>4. Bloom</h3>
			<p>
				Bright phosphor bleeds light into its surroundings. The warped image is blurred with
				<code>&lt;feGaussianBlur&gt;</code>, scaled by the glow amount with a linear
				<code>&lt;feComponentTransfer&gt;</code>, and combined with the sharp image by
				<code>&lt;feBlend mode="screen"&gt;</code>. Screen only ever brightens (<code
					>1 − (1 − a)(1 − b)</code
				>), so dark areas stay dark and bright text gets a halo.
			</p>
			<CodeSnippet code={filterCode} />

			<h3>5. Vignette, rolling bar and flicker</h3>
			<p>
				The vignette is a radial gradient plus an inset shadow that darken the edges, like the
				weaker beam at the tube's rim. The rolling bar is a broad white band at {ROLLING_BAR_OPACITY *
					100}% opacity that drifts down every nine seconds, the beat you see when filming a CRT.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>Flicker and photosensitivity</h3>
			<p>
				Flicker is the dangerous part. WCAG 2.3.1 allows at most three flashes per second, where a
				flash is a pair of opposite changes in relative luminance of 10% or more (and the darker
				state is below 0.8). The flicker here is a black veil whose opacity wobbles between 0 and
				the <em>Flicker amount</em>, capped at {MAX_FLICKER}. The veil scales the gamma-encoded sRGB
				values, not the light itself: darkening white by {MAX_FLICKER * 100}% in sRGB removes
				{(maxFlickerChange(MAX_FLICKER) * 100).toFixed(1)}% of its luminance, because the transfer
				function is steep at the top. That worst case stays clear of the 10% threshold without
				leaning on the 0.8 condition; a cap of 0.05 would not (11%). Two more margins on top: there
				are at most {FLICKER_DIPS_PER_SECOND} dips per second, and the keyframes are smooth. Each of the
				six keyframe segments lasts 1/6 s with <code>ease-in-out</code>, whose steepest point is
				1.72× the average slope, so one frame at 60 fps changes the luminance by at most {maxFlickerStep(
					MAX_FLICKER
				).toFixed(3)}. Both the flicker and the rolling bar are off with
				<code>prefers-reduced-motion</code>, flicker is opt-in, and the pause button stops all
				motion on the screen, including the cursor.
			</p>

			<h3>Readability</h3>
			<p>
				The panel shows the text contrast at the darkest text pixel: phosphor color inside a
				scanline gap and under the mask stripe that dims it most, against the background. The
				defaults keep that worst case at {worstTextContrast(crtDefaults).toFixed(1)}:1, above the
				4.5:1 that WCAG asks for body text; real strokes span several lines and stripes, so the
				perceived contrast is higher. Glow (which brightens the background around letters) and the
				vignette at the very edges are not part of the number.
			</p>

			<h3>Browser support and performance</h3>
			<p class="note">
				Checked in Chromium, and in Playwright's Firefox and WebKit builds, which rendered the same.
				Real Safari is untested. All primitives are long-standing SVG 1.1 filters; the risky part,
				<code>&lt;feImage&gt;</code> with a data URL inside a CSS filter on HTML, rendered everywhere
				it was tried.
			</p>
			<ul>
				<li>
					The filter runs over the whole screen. It is cached while the content is static; typing,
					scrolling or animating inside it reruns displacement and blur every frame. The blinking
					cursor does that about once a second, which is fine.
				</li>
				<li>
					The blur is the expensive part, growing with the glow radius and the screen size. The
					gradient layers are practically free.
				</li>
				<li>
					The displacement scale depends on the screen size, so the filter is rebuilt when the
					screen is resized.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.room {
		display: grid;
		place-items: center;
		padding: var(--space-16) var(--space-4);
		background: radial-gradient(circle at 40% 40%, oklch(30% 0.01 90), oklch(14% 0.01 90));
	}

	/* Plastic case around the tube. */
	.monitor {
		inline-size: min(52rem, 100%, (100dvh - var(--space-16) * 2) * 4 / 3);
		padding: clamp(0.75rem, 3vmin, 2rem);
		border-radius: calc(var(--radius-2xl) * 1.5);
		background: linear-gradient(160deg, oklch(80% 0.02 90), oklch(62% 0.02 90));
		box-shadow:
			var(--shadow-3),
			inset 0 2px 0 oklch(100% 0 0 / 0.5);
	}

	.monitor :global(.screen) {
		aspect-ratio: 4 / 3;
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
		.room {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
