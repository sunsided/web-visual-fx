<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import NoiseLayer from '#lib/fx/noise/NoiseLayer.svelte';
	import { maxSafeFps, noiseSchema, SAFE_SLOW_FPS } from '#lib/fx/noise/noise.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		from: { kind: 'color', label: 'Gradient from', default: '#1b1035', group: 'Stage' },
		to: { kind: 'color', label: 'Gradient to', default: '#d9467a', group: 'Stage' },
		angle: {
			kind: 'range',
			label: 'Gradient angle',
			default: 160,
			min: 0,
			max: 360,
			step: 1,
			unit: '°',
			group: 'Stage'
		}
	});

	const noise = new ParamState(noiseSchema);
	const backdrop = new ParamState(stageSchema);

	function reset() {
		noise.reset();
		backdrop.reset();
	}

	let fpsCapped = $derived(
		noise.values.animate && maxSafeFps(noise.values, noise.values.fps) < noise.values.fps
	);

	// Mirrors NoiseFilter.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = noise.values;
		const intercept = +(0.5 - 0.5 * v.contrast + v.brightness).toFixed(3);
		const y = +(v.baseFrequency * v.stretch).toFixed(4);
		return [
			`<svg aria-hidden="true">`,
			`  <filter id="noise" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			`    <feTurbulence type="${v.type}" baseFrequency="${v.baseFrequency} ${y}"`,
			`                  numOctaves="${v.numOctaves}" seed="${v.seed}"`,
			`                  stitchTiles="${v.stitchTiles ? 'stitch' : 'noStitch'}" />`,
			...(v.monochrome ? [`    <feColorMatrix type="saturate" values="0" />`] : []),
			`    <feComponentTransfer>`,
			...['R', 'G', 'B'].map(
				(c) => `      <feFunc${c} type="linear" slope="${v.contrast}" intercept="${intercept}" />`
			),
			...(v.alphaNoise ? [] : [`      <feFuncA type="linear" slope="0" intercept="1" />`]),
			`    </feComponentTransfer>`,
			`  </filter>`,
			`  <rect width="100%" height="100%" filter="url(#noise)" />`,
			`</svg>`
		].join('\n');
	});

	let cssCode = $derived(
		[
			`.stage { position: relative; isolation: isolate; }`,
			``,
			`.stage > svg {`,
			`  position: absolute;`,
			`  inset: 0;`,
			`  width: 100%;`,
			`  height: 100%;`,
			`  pointer-events: none;`,
			`  opacity: ${noise.values.opacity};`,
			`  mix-blend-mode: ${noise.values.blendMode};`,
			`}`
		].join('\n')
	);
</script>

<svelte:head>
	<title>Noise · Visual FX</title>
	<meta
		name="description"
		content="Grain and texture from the SVG feTurbulence filter primitive, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Noise demo">
	{#snippet header()}
		<StageHeader title="Noise" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div
			class="surface"
			style:background="linear-gradient({backdrop.values.angle}deg, {backdrop.values.from}, {backdrop
				.values.to})"
		>
			<NoiseLayer {...noise.values} />
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Noise" code={noise.markup('NoiseLayer')} onreset={reset}>
			{#if fpsCapped}
				<p class="safety-note" role="status">
					Animation slowed to {SAFE_SLOW_FPS} fps: this noise is coarse enough that faster changes would
					flash across large areas, which can trigger seizures. Raise the base frequency for full speed.
				</p>
			{/if}
			<ParamControls schema={noiseSchema} bind:values={noise.values} />
			<ParamControls schema={stageSchema} bind:values={backdrop.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Noise from a single filter primitive"
			lede="No image files, no canvas, no JavaScript: the grain is computed by the browser from an SVG filter, at whatever resolution the screen needs."
		>
			<h3>1. Generate: feTurbulence</h3>
			<p>
				<code>&lt;feTurbulence&gt;</code> is a built-in SVG filter primitive that implements Ken Perlin's
				noise function. For every pixel in the filter region it computes a pseudo-random but smoothly
				varying value per color channel (red, green, blue, alpha). There is no input image: the noise
				is generated from scratch, so it stays crisp at any size and zoom level.
			</p>
			<dl>
				<dt>type</dt>
				<dd>
					<code>fractalNoise</code> sums the noise layers directly and looks soft and cloudy.
					<code>turbulence</code> sums their absolute values, which creates sharp creases, like veins
					in marble or licks of flame.
				</dd>
				<dt>baseFrequency</dt>
				<dd>
					How many noise cycles fit into one pixel. Around <code>0.6–1</code> you get pixel-sized
					grain; around <code>0.01</code> you get large, slow clouds. The attribute accepts two
					numbers (x and y), and the <em>Stretch</em> slider sets y as a multiple of x. A small
					ratio such as
					<code>0.05</code> smears the noise horizontally into a brushed-metal look.
				</dd>
				<dt>numOctaves</dt>
				<dd>
					How many layers are added together. Each extra octave doubles the frequency and halves the
					amplitude, adding finer detail on top. Beyond about 5 the difference is invisible, but
					every octave costs another full pass of the noise function.
				</dd>
				<dt>seed</dt>
				<dd>Picks a different, but repeatable, random pattern.</dd>
				<dt>stitchTiles</dt>
				<dd>
					Adjusts the frequency slightly so the noise wraps seamlessly at the edges of the filter
					region. That only matters if you tile the result, e.g. as a repeating background image.
				</dd>
			</dl>

			<h3>2. Shape: color matrix and transfer functions</h3>
			<p>
				Raw turbulence is a pastel, semi-transparent mess. Two more primitives turn it into grain:
			</p>
			<ol>
				<li>
					<code>&lt;feColorMatrix type="saturate" values="0"&gt;</code> removes the color, so only
					the brightness noise remains (<em>Monochrome</em>).
				</li>
				<li>
					<code>&lt;feComponentTransfer&gt;</code> maps every channel through a linear function,
					<code>out = slope × in + intercept</code>. Setting the slope to the contrast and the
					intercept to <code>0.5 − 0.5 × contrast</code> stretches the values around mid-grey, so
					the grain gets punchier without getting brighter or darker overall; <em>Brightness</em>
					shifts the intercept. A last <code>&lt;feFuncA slope="0" intercept="1"&gt;</code> discards
					the noisy alpha channel and makes the layer opaque (unless you enable
					<em>Noisy alpha</em>).
				</li>
			</ol>
			<p class="note">
				<code>color-interpolation-filters="sRGB"</code> matters. SVG filters compute in linear RGB by
				default, which makes the noise look washed out and lighter than the same numbers in sRGB.
			</p>

			<h3>3. Composite: blend it onto the page</h3>
			<p>
				The filter is applied to a full-size <code>&lt;rect&gt;</code> inside an absolutely
				positioned
				<code>&lt;svg&gt;</code> that covers the stage. On its own that would be a grey static
				screen. The grain becomes texture through compositing: <code>opacity</code> sets how strong
				it is, and
				<code>mix-blend-mode</code> decides how it mixes with the colors below. <code>overlay</code>
				and
				<code>soft-light</code> lighten the light parts and darken the dark parts, so the gradient
				keeps its colors and just gains texture. <code>isolation: isolate</code> on the container keeps
				the blend from reaching anything outside it.
			</p>
			<p>This is the markup and CSS for your current settings:</p>
			<CodeSnippet code={filterCode} />
			<CodeSnippet code={cssCode} />

			<h3>4. Animate: film grain</h3>
			<p>
				Real film grain changes from frame to frame. The component imitates that by changing the
				<code>seed</code> on a <code>requestAnimationFrame</code> loop, throttled to the chosen frames
				per second. It is skipped entirely when the user has asked for reduced motion.
			</p>
			<p class="note">
				Two caveats. Every new seed makes the browser recompute the filter for the whole area, so
				keep the frame rate low (8–12 fps already reads as film). And coarse noise is a
				photosensitivity hazard: with a low base frequency, whole regions jump between light and
				dark on every frame. WCAG 2.3.1 allows at most three flashes per second, where a flash is a
				change of 10% or more in the average luminance of an area about 341×256 px. Measured at the
				most extreme settings, a base frequency of 0.02 already reaches that change in a single
				frame, while 0.08 stays around 0.013. So the component only animates at full speed when the
				coarser axis is at 0.1 or above, and caps everything else at {SAFE_SLOW_FPS} fps.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					A static noise layer is rendered once and then cached by the browser, so it is cheap. It
					is recomputed when the element is resized or the filter attributes change.
				</li>
				<li>
					For large, static surfaces, the same filter can be put into a data-URI SVG and used as a
					tiled <code>background-image</code>. With <code>stitchTiles="stitch"</code> the seams disappear.
				</li>
				<li>
					Noise breaks up color banding in smooth gradients and blurs, which is why the frosted
					glass effect reuses this component as its grain layer.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.safety-note {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	.surface {
		position: relative;
		isolation: isolate;
	}
</style>
