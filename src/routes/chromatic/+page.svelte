<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import ChromaticAberration from '#lib/fx/chromatic/ChromaticAberration.svelte';
	import {
		channelOffsets,
		chromaticSchema,
		JITTER_MAX_HZ,
		regionPadding
	} from '#lib/fx/chromatic/chromatic.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		target: {
			kind: 'select',
			label: 'Apply to',
			default: 'everything',
			options: ['everything', 'text', 'image'],
			group: 'Stage'
		},
		kind: { kind: 'select', label: 'Image', default: 'aurora', options: scenes, group: 'Stage' },
		animate: { kind: 'toggle', label: 'Animate image', default: false, group: 'Stage' }
	});

	const fx = new ParamState(chromaticSchema);
	const demo = new ParamState(stageSchema);

	function reset() {
		fx.reset();
		demo.reset();
	}

	let onText = $derived(demo.values.target !== 'image');
	let onImage = $derived(demo.values.target !== 'text');

	const keep = {
		r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
		g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
		b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
	};

	const isolateCode = [
		`1 0 0 0 0   ← R = R`,
		`0 0 0 0 0   ← G = 0`,
		`0 0 0 0 0   ← B = 0`,
		`0 0 0 1 0   ← A = A`
	].join('\n');

	// Mirrors ChromaticFilter.svelte, filled in with the current settings (without jitter).
	let filterCode = $derived.by(() => {
		const v = fx.values;
		const pad = regionPadding(v.distance);
		const lines = [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <!-- W × H: the element's size in px -->`,
			`  <filter id="rgb-split" filterUnits="userSpaceOnUse"`,
			`          x="-${pad}" y="-${pad}" width="W + ${2 * pad}" height="H + ${2 * pad}"`,
			`          color-interpolation-filters="sRGB">`
		];
		if (v.mode === 'radial') {
			// The scale depends on the element's size, so the snippet shows it symbolically.
			const s = { r: '-S', g: '0', b: 'S' };
			lines.push(
				`    <!-- red rises left → right, green top → bottom; ½ at the center -->`,
				`    <!-- S = ${v.distance} / (how far from ½ the map is at the element's edges) -->`,
				`    <feImage href="data:image/svg+xml,…" preserveAspectRatio="none" result="map" />`
			);
			for (const c of ['r', 'g', 'b'] as const) {
				lines.push(
					`    <feColorMatrix in="SourceGraphic" type="matrix"`,
					`                   values="${keep[c]}" result="${c}" />`,
					`    <feDisplacementMap in="${c}" in2="map" scale="${s[c]}"`,
					`                       xChannelSelector="R" yChannelSelector="G" result="${c}2" />`
				);
			}
		} else {
			const o = channelOffsets(v.mode, v.distance, v.angle);
			for (const c of ['r', 'g', 'b'] as const) {
				lines.push(
					`    <feColorMatrix in="SourceGraphic" type="matrix"`,
					`                   values="${keep[c]}" />`,
					`    <feOffset dx="${o[c].dx}" dy="${o[c].dy}" result="${c}2" />`
				);
			}
		}
		lines.push(
			`    <feBlend in="r2" in2="g2" mode="screen" result="rg" />`,
			`    <feBlend in="rg" in2="b2" mode="screen" />`,
			`  </filter>`,
			`</svg>`,
			``,
			`<style>`,
			`  .split { filter: url(#rgb-split); }`,
			`</style>`
		);
		return lines.join('\n');
	});
</script>

<svelte:head>
	<title>Chromatic aberration · Visual FX</title>
	<meta
		name="description"
		content="RGB split with an SVG filter: feColorMatrix, feOffset and feBlend, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Chromatic aberration demo">
	{#snippet header()}
		<StageHeader title="Chromatic aberration" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="surface" data-theme="dark">
			<figure class="poster">
				{#snippet image()}
					<Scene
						kind={demo.values.kind}
						animate={demo.values.animate}
						class="image"
						--scene-scrim="oklch(0% 0 0 / 0.45)"
					/>
				{/snippet}
				{#snippet words()}
					<h2 class="headline">Aberration</h2>
				{/snippet}

				{#if onImage}
					<ChromaticAberration {...fx.values} class="layer">{@render image()}</ChromaticAberration>
				{:else}
					<div class="layer">{@render image()}</div>
				{/if}
				{#if onText}
					<ChromaticAberration {...fx.values} class="layer text">
						{@render words()}
					</ChromaticAberration>
				{:else}
					<div class="layer text">{@render words()}</div>
				{/if}
				<figcaption>
					Red, green and blue drawn separately and slightly out of line, like a cheap lens or a
					misaligned print.
				</figcaption>
			</figure>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel
			title="Chromatic aberration"
			code={fx.markup('ChromaticAberration')}
			onreset={reset}
		>
			<ParamControls schema={chromaticSchema} bind:values={fx.values} />
			<ParamControls schema={stageSchema} bind:values={demo.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Three channels, slightly out of line"
			lede="A lens that doesn't focus all wavelengths at the same spot draws red, green and blue at slightly different positions. An SVG filter can fake that on any element by literally separating the channels and moving them apart."
		>
			<h3>The pipeline</h3>
			<p>
				The filter is applied with plain <code>filter: url(#id)</code> on the content, not as a backdrop
				filter. It runs the same three steps for red, green and blue, then puts them back together:
			</p>
			<ol>
				<li><strong>Isolate</strong> one color channel with <code>feColorMatrix</code>.</li>
				<li>
					<strong>Move</strong> it with <code>feOffset</code> (or <code>feDisplacementMap</code>).
				</li>
				<li><strong>Recombine</strong> the three with <code>feBlend mode="screen"</code>.</li>
			</ol>
			<p>
				Where the three copies overlap exactly, the result is the original image. Only at edges,
				where the copies disagree, do colored fringes appear: red on one side, blue (or cyan) on the
				other.
			</p>

			<h3>1. Isolate: feColorMatrix</h3>
			<p>
				<code>&lt;feColorMatrix type="matrix"&gt;</code> computes every output channel as a weighted
				sum of the input channels. The <code>values</code> attribute has four rows (R, G, B, A) of five
				numbers: the weights of R, G, B, A and a constant. To keep only red:
			</p>
			<CodeSnippet code={isolateCode} />
			<p>
				Each of the three matrices starts again from <code>SourceGraphic</code>, the untouched
				content, via
				<code>in="SourceGraphic"</code>. Alpha is kept as it is, so a red copy of white text is red
				text with the same edges.
			</p>

			<h3>2. Move: feOffset</h3>
			<p>
				<code>&lt;feOffset dx dy&gt;</code> shifts its input by a fixed number of px. The
				<em>Distance</em> and <em>Angle</em> become <code>dx = cos(angle) × distance</code> and
				<code>dy = sin(angle) × distance</code> for red, and the negated values for the channels
				moving the other way. In <em>rgb</em> mode green stays put; in <em>red-cyan</em> green travels
				with blue, which gives the two-tone look of anaglyph 3D.
			</p>
			<p>
				By default a filter region is the element's bounding box plus 10% on each side, so a shift
				larger than 10% of the element (easily reached by a line of small text) gets clipped. The
				component sets <code>filterUnits="userSpaceOnUse"</code> instead and pads the region by the
				distance plus the jitter, in px: currently {regionPadding(fx.values.distance)} px on every side.
				For HTML elements, user-space coordinates start at the top-left corner of the border box, so the
				component measures its size (with a <code>ResizeObserver</code>, through Svelte's
				<code>bind:offsetWidth</code>) to fill in the width and height.
			</p>

			<h3>Radial mode: feDisplacementMap</h3>
			<p>
				Real lenses get worse towards the edge of the image: the channels line up in the center and
				drift apart further out, along the line from the center. A fixed <code>feOffset</code> can't
				do that, but <code>feDisplacementMap</code> can, given the right map. The map is a tiny SVG
				image whose red channel rises from 0 on the left to 1 on the right and whose green channel
				rises from top to bottom, two <code>linearGradient</code>s combined with
				<code>mix-blend-mode: screen</code>. Loaded with <code>&lt;feImage&gt;</code> and stretched
				over the filter region (<code>preserveAspectRatio="none"</code>), it holds at every pixel
				the vector from the center: <code>(R − ½, G − ½)</code>. The map is generated for the
				element's size and padding: both gradients get the same slope per px of the element's
				half-size, so one scale reaches the same offset on all four edges even on a wide element.
			</p>
			<p>
				<code>feDisplacementMap</code> samples each pixel from
				<code>scale × (R − ½, G − ½)</code> away. With a negative scale, red samples from closer to
				the center and appears slightly enlarged; with a positive one, blue shrinks. Green gets
				scale 0. The scale is chosen so the offset at the element's edge is the <em>Distance</em> setting.
			</p>

			<h3>3. Recombine: feBlend screen</h3>
			<p>
				<code>screen</code> computes <code>1 − (1 − a)(1 − b)</code> per channel. When one input is
				black in a channel (as each isolated copy is in two of three), that is just the other input,
				so screening the three copies adds them back up to the full color. Alpha is combined the
				same way. <code>feComposite operator="arithmetic" k2="1" k3="1"</code> (plain addition) gives
				the same colors; it only differs in how it sums alpha.
			</p>
			<p>The filter for your current settings:</p>
			<CodeSnippet code={filterCode} />

			<h3>Jitter</h3>
			<p>
				Optional wobble: on every animation frame the component adds a small offset to the split,
				from a sum of slow sine waves with unrelated periods. The fastest of them runs at
				{JITTER_MAX_HZ} Hz and the motion is continuous, so nothing jumps or flashes; only thin colored
				edges move. It doesn't start on its own, and it stays off when the user prefers reduced motion.
			</p>

			<h3>Readability</h3>
			<p>
				Split text is harder to read: the edges of each letter blur into colored fringes. Large,
				heavy type survives a lot, body text very little. The default of 3 px keeps the headline
				here crisp, and the caption below the image is deliberately left unfiltered. If you use this
				on real content, keep it to display type and imagery, and never on running text.
			</p>
			<p>
				The white headline sits on a dark scrim and has a soft dark halo (<code>text-shadow</code>).
				Measured on this page with the split off, what is directly behind the letters stays at 7.8:1
				or better against white for every image option. The scrim alone only reached about 3.1:1
				over the brightest parts, which is why the halo is there. The colored fringes the effect
				adds come on top of that, along the edges of the letters.
			</p>

			<h3>Browser support</h3>
			<p class="note">
				Every primitive used here is part of SVG 1.1, and <code>filter: url()</code> on HTML elements
				works in all current engines. This page was checked in Chromium and Firefox. Safari is untested.
			</p>
			<p>
				Cost: the filter runs over the whole element, three times over, and is re-run whenever the
				content changes, for example while the image is animated or the jitter is on. On static
				content it is computed once and cached.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.surface {
		display: grid;
		place-items: center;
		padding: var(--space-16) var(--space-4);
		background: oklch(14% 0.02 285);
		color: oklch(100% 0 0);
	}

	.poster {
		display: grid;
		grid-template-areas: 'art' 'caption';
		inline-size: min(40rem, 100%);
		margin: 0;
	}

	/* Positioned, so the text layer stays on top even when no filter makes it a stacking context. */
	.poster :global(.layer) {
		position: relative;
		grid-area: art;
		border-radius: var(--radius-xl);
	}

	.poster :global(.image) {
		block-size: min(26rem, 55dvh);
		border-radius: var(--radius-xl);
	}

	.poster :global(.text) {
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	.headline {
		font-size: clamp(2.75rem, 10vw, 6rem);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.03em;
		/* A soft dark halo: keeps ≥ 4.5:1 against the brightest parts of every image (measured). */
		text-shadow:
			0 0 0.06em oklch(0% 0 0 / 0.6),
			0 0 0.25em oklch(0% 0 0 / 0.5);
	}

	figcaption {
		grid-area: caption;
		margin-block-start: var(--space-3);
		color: oklch(85% 0.01 285);
		font-size: var(--text-sm);
	}
</style>
