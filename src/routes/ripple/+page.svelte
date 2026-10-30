<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import Switch from '#lib/components/atoms/Switch.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import { supportsBackdropSvgFilter } from '#lib/fx/glass/support.js';
	import Ripple from '#lib/fx/ripple/Ripple.svelte';
	import {
		CROSS_ANGLE,
		CROSS_SPEED,
		MIX_K,
		regionPadding,
		ripplePresetNames,
		ripplePresets,
		rippleSchema,
		stitchFrequency,
		type RipplePresetName
	} from '#lib/fx/ripple/ripple.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'landscape',
			options: ['landscape', ...scenes],
			group: 'Stage',
			description: 'What is under the water. In backdrop mode this is the page behind the panel.'
		}
	});

	const fx = new ParamState(rippleSchema);
	const demo = new ParamState(stageSchema);
	let paused = $state(false);

	function reset() {
		fx.reset();
		demo.reset();
	}

	let preset = $state<RipplePresetName | undefined>('water');

	function applyPreset(name: RipplePresetName) {
		fx.values = { ...fx.values, ...ripplePresets[name] };
		preset = name;
	}

	// The highlighted preset button follows the values: any edit that leaves the preset clears it.
	let activePreset = $derived(
		preset &&
			Object.entries(ripplePresets[preset]).every(
				([k, v]) => fx.values[k as keyof typeof fx.values] === v
			)
			? preset
			: undefined
	);

	let canBackdrop = $state<boolean>();
	let forceBackdrop = $state(false);
	onMount(() => (canBackdrop = supportsBackdropSvgFilter()));

	let fx0 = $derived(stitchFrequency(fx.values.frequency, fx.values.tileSize));
	let fy0 = $derived(stitchFrequency(fx.values.frequency * fx.values.stretch, fx.values.tileSize));

	// Mirrors RippleFilter.svelte + FlowNoise.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = fx.values;
		const T = v.tileSize;
		const pad = regionPadding(v.strength);
		const tile = `x="${T}" y="${T}" width="${T}" height="${T}"`;
		const lines = [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <!-- W × H: the element's size in px; the region reaches at least 2 × ${T} -->`,
			`  <filter id="ripple" filterUnits="userSpaceOnUse"`,
			`          x="-${pad}" y="-${pad}" width="max(W, ${2 * T}) + ${2 * pad}"`,
			`          height="max(H, ${2 * T}) + ${2 * pad}"`,
			`          color-interpolation-filters="sRGB">`,
			`    <!-- noise on one ${T} × ${T} tile, made opaque, repeated -->`,
			`    <feTurbulence type="fractalNoise" baseFrequency="${fx0} ${fy0}"`,
			`                  numOctaves="${v.octaves}" seed="${v.seed}" stitchTiles="stitch"`,
			`                  x="0" y="0" width="${T}" height="${T}" result="raw" />`,
			`    <feColorMatrix in="raw" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1"`,
			`                   x="0" y="0" width="${T}" height="${T}" result="tile" />`,
			`    <feTile in="tile" result="plane" />`,
			`    <!-- dx, dy: set from JavaScript every frame, wrapped into [0, ${T}) -->`,
			`    <feOffset in="plane" dx="…" dy="…" ${tile} result="a" />`
		];
		if (v.crossWaves) {
			lines.push(
				`    <feOffset in="plane" dx="…" dy="…" ${tile} result="b" />`,
				`    <feComposite in="a" in2="b" operator="arithmetic"`,
				`                 k2="${MIX_K.k2}" k3="${MIX_K.k3}" k4="${MIX_K.k4}" ${tile} result="a" />`
			);
		}
		lines.push(
			`    <feTile in="a" result="waves" />`,
			`    <feDisplacementMap in="SourceGraphic" in2="waves" scale="${v.strength}"`,
			`                       xChannelSelector="R" yChannelSelector="G" />`
		);
		if (v.tintOpacity > 0 && !v.backdrop) {
			lines.push(
				`    <feFlood flood-color="${v.tint}" flood-opacity="${v.tintOpacity}" />`,
				`    <feComposite in2="…previous result…" operator="atop" />`
			);
		}
		lines.push(`  </filter>`, `</svg>`);
		return lines.join('\n');
	});

	const loopCode = [
		`const mod = (v, n) => ((v % n) + n) % n;`,
		`let time = 0, last = performance.now();`,
		`function tick(now) {`,
		`  raf = requestAnimationFrame(tick);`,
		`  if (now - last < 1000 / fps - 1) return;      // frame-rate cap`,
		`  if (!el.closest('[data-motion="paused"]')) {`,
		`    time += Math.min(now - last, 100) / 1000;   // no jump after a pause`,
		`  }`,
		`  last = now;`,
		`  const dir = (angle * Math.PI) / 180;`,
		`  offsetA.setAttribute('dx', mod(Math.cos(dir) * speed * time, TILE));`,
		`  offsetA.setAttribute('dy', mod(Math.sin(dir) * speed * time, TILE));`,
		`}`,
		`// runs only while on screen (IntersectionObserver), the tab is visible`,
		`// and prefers-reduced-motion is not set`
	].join('\n');

	let cssCode = $derived(
		fx.values.backdrop
			? [
					`.haze {`,
					`  backdrop-filter: blur(${fx.values.fallbackBlur}px);   /* everyone else */`,
					`}`,
					`/* Chromium only (engine check after mount, see below) */`,
					`.haze.svg-ok {`,
					`  backdrop-filter: url(#ripple);`,
					`}`
				].join('\n')
			: [`.under-water {`, `  filter: url(#ripple);`, `}`].join('\n')
	);
</script>

<svelte:head>
	<title>Water ripple · Visual FX</title>
	<meta
		name="description"
		content="Water ripple, heat haze and underwater wobble with animated SVG feTurbulence and feDisplacementMap, on content or the backdrop, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Water ripple demo">
	{#snippet header()}
		<StageHeader title="Water ripple" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div
			class="motion"
			data-motion={paused ? 'paused' : 'running'}
			data-theme="dark"
			style:--_bleed="{Math.ceil(fx.values.strength / 2) + 2}px"
		>
			{#snippet source()}
				{#if demo.values.source === 'landscape'}
					<Landscape />
				{:else}
					<Scene kind={demo.values.source} animate={false} class="ripple-scene" />
				{/if}
			{/snippet}

			{#if fx.values.backdrop}
				<div class="layer">{@render source()}</div>
				<div class="center">
					<Ripple {...fx.values} {forceBackdrop} class="pane">
						<p class="eyebrow">Backdrop mode</p>
						<h2>Through the haze</h2>
						<p>The page behind this pane wobbles; the text on it stays sharp.</p>
						<MotionToggle bind:paused size="sm" />
					</Ripple>
				</div>
			{:else}
				<Ripple {...fx.values} class="layer">{@render source()}</Ripple>
				<div class="center">
					<div class="card">
						<p class="eyebrow">Content mode</p>
						<h2>Under the surface</h2>
						<p>Everything in the layer behind this card moves through the filter.</p>
						<MotionToggle bind:paused size="sm" />
					</div>
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Water ripple" code={fx.markup('Ripple')} onreset={reset}>
			<div class="presets" role="group" aria-label="Presets">
				{#each ripplePresetNames as name (name)}
					<Button
						size="sm"
						variant={activePreset === name ? 'solid' : 'soft'}
						aria-pressed={activePreset === name}
						onclick={() => applyPreset(name)}>{name}</Button
					>
				{/each}
			</div>
			{#if fx.values.backdrop && canBackdrop === false}
				<div class="support-note" role="note">
					<p>
						Backdrop warping is off: <code>backdrop-filter: url()</code> only renders in Chromium-based
						browsers, so the pane falls back to a plain blur. Content mode works everywhere.
					</p>
					<Switch id="force-backdrop" bind:checked={forceBackdrop} />
					<label for="force-backdrop">Try it anyway</label>
				</div>
			{/if}
			<ParamControls schema={rippleSchema} bind:values={fx.values} />
			<ParamControls schema={stageSchema} bind:values={demo.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Moving noise, moving pixels"
			lede="Water and hot air bend light a little differently at every point, and the pattern drifts. An SVG filter fakes both: a noise texture says how far each pixel moves, and sliding the noise makes it flow."
		>
			<h3>1. Where to move each pixel: feTurbulence</h3>
			<p>
				<code>&lt;feTurbulence type="fractalNoise"&gt;</code> fills its area with smooth Perlin
				noise, an independent random field in each of R, G, B and A. Low
				<code>baseFrequency</code> values give large, soft blobs; <code>numOctaves</code> adds finer
				copies on top. Two numbers make it anisotropic: <code>"0.008 0.04"</code> squeezes the blobs
				into thin horizontal bands, which is what rising hot air looks like (the
				<em>Stretch</em> control). Right now the filter uses <code>{fx0} {fy0}</code>.
			</p>

			<h3>2. Move them: feDisplacementMap</h3>
			<p>
				<code>&lt;feDisplacementMap scale="s"&gt;</code> draws each output pixel from somewhere else
				in its input: <code>s × (R − ½)</code> px to the side and <code>s × (G − ½)</code> px up or
				down, with R and G read from the noise. Mid-grey noise means no shift, so the content is
				pushed around by at most half of <em>Strength</em> in each direction. Because neighbouring noise
				values are close, neighbouring pixels move together, and straight lines bend into waves instead
				of breaking up.
			</p>

			<h3>3. Make it flow, cheaply</h3>
			<p>
				A filter has no time input, so something has to change an attribute per frame. Changing
				<code>seed</code> would jump to unrelated noise, and changing <code>baseFrequency</code>
				makes the waves breathe in place. What reads as water is noise that slides. The obvious way is
				also the expensive one: the browser recomputes <code>feTurbulence</code> over the whole element
				on every frame, and that is probably the costliest primitive in the chain (an estimate, not measured).
			</p>
			<p>
				So the noise is computed on one small tile only. <code>stitchTiles="stitch"</code> nudges
				the frequency until a whole number of noise periods fits into the tile, which makes it
				repeat without seams; <code>feTile</code> repeats it over the region. To slide it,
				<code>feOffset</code> cuts a shifted tile back out of that repeated plane, and a second
				<code>feTile</code> repeats the shifted tile. Since the plane repeats every tile, the shift
				never needs to be more than one tile, so JavaScript wraps it into [0, tile) and the motion
				can run forever. The tile size also snaps the frequency: with a {fx.values.tileSize} px tile the
				waves can only have {fx.values.tileSize} / n px periods, so very low frequencies need a bigger
				tile.
			</p>
			<p>
				<em>Cross waves</em> adds a second shifted copy, travelling {CROSS_ANGLE}° off the first at
				{CROSS_SPEED * 100}% speed, and averages the two with
				<code>feComposite operator="arithmetic"</code>. A plain average of two independent noises
				huddles closer to grey, so both get the weight 1/√2 instead of ½ and the result is shifted
				back to centre on ½. The interference is what makes a pond surface churn rather than slide
				past like a conveyor belt.
			</p>
			<CodeSnippet code={filterCode} />
			<p>
				Two details in there. The noise's own alpha channel is noise too and would premultiply the
				colors, so a <code>feColorMatrix</code> sets alpha to 1 on the tile. And the region has to reach
				at least two tiles from the element's top-left corner, because the shifted tile is cut out at
				[tile, 2 × tile); Chromium clips subregions that stick out of the filter region, which leaves
				stripes without noise on small elements.
			</p>
			<p>The loop that moves it:</p>
			<CodeSnippet code={loopCode} />
			<p>The filter goes on the content, or on what is behind an element:</p>
			<CodeSnippet code={cssCode} />

			<h3>Presets</h3>
			<dl>
				<dt>water</dt>
				<dd>round, medium waves from two directions at a calm speed</dd>
				<dt>heat haze</dt>
				<dd>
					stretched noise (vertical frequency five times the horizontal), small strength, one layer
					rising straight up
				</dd>
				<dt>underwater</dt>
				<dd>
					big slow swells with three octaves of detail, a bigger tile for the low frequency, and a
					blue-green wash (<code>feFlood</code> composited <code>atop</code> the result, so transparent
					areas stay transparent)
				</dd>
			</dl>

			<h3>Backdrop mode</h3>
			<p>
				The same filter can warp what is behind an element through
				<code>backdrop-filter: url(#ripple)</code>, like the frosted and liquid glass effects here.
				<code>backdrop-filter</code> itself has been Baseline since September 2024, but only
				Chromium renders an SVG filter reference in it. Firefox (checked for the
				<a href={resolve('/glass')}>frosted glass</a> page) drops the whole backdrop filter when the
				list contains <code>url()</code>, and <code>CSS.supports()</code> only checks the syntax, so
				it can't tell. The component therefore checks for Chromium after mount and uses a plain
				<code>blur()</code> elsewhere, which still reads as a hazy surface. The tint becomes the pane's
				background in this mode, so it shows in both cases.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				<code>feTurbulence</code>, <code>feDisplacementMap</code>, <code>feTile</code> and
				<code>feOffset</code> on HTML through <code>filter: url()</code> are Baseline widely available
				(SVG filters, 2015). Checked in headless Chromium; Firefox and Safari are untested for this page.
			</p>
			<ul>
				<li>
					<strong>Every frame reruns the filter</strong> over the whole element: tile noise, displacement
					and, with a tint, two more steps. Keep the element as small as the effect needs, and the frame
					rate low. The default cap is 30 fps; water moves slowly, so 20–30 looks the same as 60 for half
					the work or less.
				</li>
				<li>
					<strong>It stops when nobody sees it.</strong> The loop only runs while the element
					intersects the viewport (<code>IntersectionObserver</code>) and the tab is visible. Inside
					a <code>[data-motion="paused"]</code> region (the pause button on the stage) the clock
					stops. Under <code>prefers-reduced-motion: reduce</code> nothing moves at all; the waves stay
					as a still distortion, which is harmless.
				</li>
				<li>
					<strong>Readability.</strong> Displacement smears text. Put the filter on a picture or a background
					layer and keep reading text outside it, as on this stage; the filtered text is still real text
					for screen readers and selection, but it is hard to read while it moves.
				</li>
				<li>
					<strong>Edges.</strong> Pixels near the border are drawn from outside the element, where
					there is nothing, so the edges wobble too. Clip with <code>overflow: hidden</code> on a parent,
					or make the content a little larger than its frame.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.motion {
		position: relative;
		display: grid;
		block-size: 100%;
		overflow: hidden;
	}

	.motion > :global(*) {
		grid-area: 1 / 1;
	}

	/* Bleed past the stage: displaced pixels near the border come from outside the element, where
	   there is nothing, so the wobbly edges are pushed out of view. */
	.layer,
	.motion > :global(.layer) {
		margin: calc(var(--_bleed) * -1);
		min-block-size: 0;
	}

	.layer :global(.ripple-scene),
	.motion :global(.layer > .ripple-scene) {
		block-size: 100%;
	}

	.center {
		/* Positioned, so it paints above the filtered layer (a filter makes a stacking context). */
		position: relative;
		display: grid;
		place-items: center;
		padding: var(--space-6);
		pointer-events: none;
	}

	.card,
	.center :global(.pane) {
		inline-size: min(24rem, 85vw);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		color: oklch(97% 0.01 220);
		pointer-events: auto;
	}

	.card {
		background: oklch(18% 0.03 230 / 0.78);
	}

	.center :global(.pane) {
		border: 1px solid oklch(100% 0 0 / 0.35);
		box-shadow: 0 20px 50px oklch(0% 0 0 / 0.35);
		text-shadow: 0 1px 3px oklch(0% 0 0 / 0.6);
	}

	.eyebrow {
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		opacity: 0.85;
	}

	h2 {
		margin-block: var(--space-2) var(--space-3);
		font-size: var(--text-xl);
	}

	.card p:not(.eyebrow),
	.center :global(.pane p:not(.eyebrow)) {
		margin-block-end: var(--space-3);
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.presets :global(button) {
		text-transform: capitalize;
	}

	.support-note {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	.support-note p {
		grid-column: 1 / -1;
		margin: 0;
	}

	.support-note label {
		font-weight: var(--weight-medium);
		cursor: pointer;
	}
</style>
