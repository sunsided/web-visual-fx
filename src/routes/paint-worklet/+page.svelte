<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import PaintPattern from '#lib/fx/paint-worklet/PaintPattern.svelte';
	import {
		fallbackBackground,
		PAINT_NAME,
		paintPatternSchema,
		paintVars
	} from '#lib/fx/paint-worklet/paint-worklet.js';
	import { loadPaintWorklet, supportsPaintWorklet } from '#lib/fx/paint-worklet/support.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const paint = new ParamState(paintPatternSchema);
	let paused = $state(false);

	// undefined until known on the client (the page is prerendered without it).
	let supported = $state<boolean>();
	let loaded = $state(false);
	onMount(() => {
		supported = supportsPaintWorklet();
		loadPaintWorklet().then((ok) => (loaded = ok));
	});

	let worklet = $derived(loaded && paint.values.renderer === 'auto');
	let status = $derived(
		supported === undefined
			? 'Checking for the CSS Painting API…'
			: worklet
				? 'Painted by the worklet: paint(vfx-pattern).'
				: supported
					? 'Gradient twin (chosen in Renderer).'
					: 'Gradient twin: this browser has no CSS Painting API (Chromium only).'
	);

	let cssCode = $derived.by(() => {
		const vars = paintVars(paint.values);
		return [
			`.pattern {`,
			...Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`),
			`  background-color: ${paint.values.background};`,
			`  /* the gradient twin first (background-image/-size/-position as above) */`,
			`}`,
			``,
			`@supports (background: paint(x)) {`,
			`  .pattern {`,
			`    background-image: paint(${PAINT_NAME});`,
			`    background-size: auto;`,
			`  }`,
			`}`
		].join('\n');
	});

	let fallbackCode = $derived.by(() => {
		const bg = fallbackBackground(paint.values);
		const split = (s: string) => s.split(/,\s*(?=radial-gradient)/);
		return [
			`.pattern {`,
			`  background-image:`,
			split(bg.image)
				.map((l) => `    ${l}`)
				.join(',\n') + ';',
			`  background-size: ${bg.size};`,
			`  background-position: ${bg.position};`,
			`}`
		].join('\n');
	});

	const registerCode = [
		`// Once per document. The worklet module can be any URL; here it is a Blob,`,
		`// so it needs no static file and works under any base path.`,
		`for (const p of [`,
		`  { name: '--vfx-paint-size', syntax: '<length>', initialValue: '16px' },`,
		`  { name: '--vfx-paint-phase', syntax: '<number>', initialValue: '0' },`,
		`  { name: '--vfx-paint-color-1', syntax: '<color>', initialValue: 'black' },`,
		`  // … one entry per input property`,
		`]) CSS.registerProperty({ ...p, inherits: true });`,
		``,
		`const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));`,
		`await CSS.paintWorklet.addModule(url);`
	].join('\n');

	const workletCode = [
		`// worklet.js, runs in a PaintWorkletGlobalScope (no DOM, no network, no text)`,
		`registerPaint('${PAINT_NAME}', class {`,
		`  static get inputProperties() {`,
		`    return ['--vfx-paint-size', '--vfx-paint-phase', '--vfx-paint-color-1' /* … */];`,
		`  }`,
		`  paint(ctx, geom, props) {`,
		`    const size = parseFloat(props.get('--vfx-paint-size')); // a typed CSSUnitValue, in px`,
		`    const phase = parseFloat(props.get('--vfx-paint-phase'));`,
		`    // ctx is a PaintRenderingContext2D: paths, arcs, fills, strokes, transforms`,
		`    for (const cell of jitteredGrid(geom.width, geom.height, size)) {`,
		`      ctx.beginPath();`,
		`      ctx.arc(cell.x, cell.y, size / 2, 0, 2 * Math.PI);`,
		`      ctx.fillStyle = String(props.get(cell.color));`,
		`      ctx.fill();`,
		`    }`,
		`  }`,
		`});`
	].join('\n');

	const animateCode = [
		`.pattern { animation: phase 6s linear infinite; }`,
		``,
		`@keyframes phase {`,
		`  to { --vfx-paint-phase: 1; }`,
		`}`,
		``,
		`@media (prefers-reduced-motion: reduce) {`,
		`  .pattern { animation: none; }`,
		`}`
	].join('\n');
</script>

<svelte:head>
	<title>Paint Worklet · Visual FX</title>
	<meta
		name="description"
		content="Experimental: generative dots, squiggles and blobs painted by a CSS Paint Worklet from registered custom properties, with a CSS gradient fallback outside Chromium."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Paint worklet demo">
	{#snippet header()}
		<StageHeader title="Paint Worklet" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="room" data-motion={paused ? 'paused' : 'running'}>
			<PaintPattern {...paint.values} class="pattern" --paint-pattern-surface="#120e2ef2">
				<div class="card">
					<p class="badge">Experimental tier</p>
					<h2>Painted by a worklet</h2>
					<p>
						Every dot, squiggle and blob is drawn by a few lines of JavaScript that the browser
						calls whenever this box needs paint. Resize the window: the pattern grows, it doesn't
						stretch.
					</p>
					<p class="status" role="status">{status}</p>
				</div>
			</PaintPattern>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Paint Worklet" code={paint.markup('PaintPattern')} onreset={paint.reset}>
			<p class="flag">
				<strong>Experimental.</strong> The CSS Painting API is Chromium-only; other browsers get the gradient
				twin.
			</p>
			<MotionToggle bind:paused size="sm" class="motion-toggle" />
			<ParamControls schema={paintPatternSchema} bind:values={paint.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A background that is a function"
			lede="This is a flagged, experimental effect. The CSS Painting API lets a small script paint an element's background, border or mask on demand, at whatever size and resolution the element has. It is not Baseline: only Chromium ships it, so everything here has a plain CSS gradient twin."
		>
			<h3>1. paint() is an image</h3>
			<p>
				Anywhere CSS takes an image (<code>background-image</code>, <code>border-image</code>,
				<code>mask-image</code>) it also takes <code>paint(name)</code>. The browser then calls the
				<code>paint()</code> method of the class registered under that name with a 2D context of the element's
				size, the size itself and the element's computed styles. It calls it again whenever the size or
				one of the listed input properties changes, and paints at the device pixel ratio, so the result
				is sharp on every screen without any image files.
			</p>
			<CodeSnippet code={workletCode} />
			<p>
				The worklet runs in its own global scope: no DOM, no <code>fetch</code>, no text drawing, no
				images. That is why the painter here is a single self-contained function. The same function
				is unit-tested in Node and copied into the worklet with
				<code>Function.prototype.toString()</code>, so the tests and the browser run identical code.
			</p>

			<h3>2. Registered custom properties are the parameters</h3>
			<p>
				A worklet reads its inputs through <code>inputProperties</code>. Registering those
				properties (with <code>CSS.registerProperty</code> or <code>@property</code>) gives them a
				type: the worklet then gets computed, typed values, so a <code>&lt;length&gt;</code> written
				as <code>1rem</code> arrives as px and a <code>&lt;color&gt;</code> as a resolved color. The
				component registers them from JavaScript rather than with <code>@property</code> because an
				<code>@property</code> rule inside a shadow root is ignored, and the custom element renders in
				one.
			</p>
			<CodeSnippet code={registerCode} />
			<p>
				The module is a Blob URL built from a string at runtime. A file in <code>static/</code>
				would not ship with the npm package and would have to know the site's base path; a Blob URL needs
				neither. The one catch is a Content-Security-Policy: worklets count as scripts, so
				<code>script-src</code> must allow <code>blob:</code>, or the module fails to load and the
				component stays on the gradient twin.
			</p>

			<h3>3. A jittered grid that grows instead of reshuffling</h3>
			<p>
				Shapes sit one per grid cell, offset from the cell center by up to
				<em>Jitter</em> × half a cell. Each cell seeds its own small random generator (mulberry32) from
				a hash of the seed, its column and its row. So a given cell always gets the same shape, color
				and angle: when the element gets wider, new cells appear on the right and the existing ones stay
				put. One cell of margin on every side lets shapes that start outside the box reach into it.
			</p>
			<dl>
				<dt>dots</dt>
				<dd>circles, radius scaled by up to ±40% of <em>Jitter</em></dd>
				<dt>squiggles</dt>
				<dd>a two-period sine polyline, rotated at random, stroked with round caps</dd>
				<dt>blobs</dt>
				<dd>
					a closed radial curve, the base radius plus three low harmonics (2, 3 and 5 lobes) with
					random phases
				</dd>
			</dl>

			<h3>4. Animation: keyframes on a registered number</h3>
			<p>
				Because <code>--vfx-paint-phase</code> is a registered <code>&lt;number&gt;</code>, plain
				CSS keyframes interpolate it, and every new value invalidates the paint image. The
				squiggles' waves slide along, dots breathe and blobs wobble. The animation is CSS, so it
				stops for
				<code>prefers-reduced-motion: reduce</code> and pauses inside a
				<code>data-motion="paused"</code> region like every other animation in the library.
			</p>
			<CodeSnippet code={animateCode} />

			<h3>5. The gradient twin</h3>
			<p>
				Outside Chromium, and for the moment until the module has loaded, the same layer gets
				ordinary gradients built from the same parameters. A gradient can't place shapes at random,
				so the twin overlays one repeating tile per color, with tile sizes in non-integer ratios
				(1.53 : 1.79 : 2.11 cells) and seeded offsets, so the repeats rarely line up. The squiggle
				twin is a wave per color made from half rings: a lower half ring at the top edge of each
				tile, an upper one at the bottom edge, cropped by the tile so the halves join on the tile
				boundary. The twin stays still when <em>Animate</em> is on.
			</p>
			<CodeSnippet code={fallbackCode} />
			<p>
				For hand-written CSS, the same order works without JavaScript feature detection: declare the
				gradient twin, then <code>paint()</code> inside <code>@supports</code>. In Chromium,
				<code>paint()</code> of a name that isn't registered yet is a transparent image, which is why
				the component waits for the module before switching.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>Browser support and performance</h3>
			<ul>
				<li>
					<strong>Not Baseline.</strong> The CSS Painting API (<code>paint()</code>,
					<code>CSS.paintWorklet</code>) is Chromium-only, since Chrome 65; Firefox and Safari have
					no implementation (web-features, webstatus.dev/features/paint). Detection is easy for
					once:
					<code>'paintWorklet' in CSS</code> is true exactly where it works. Registered custom properties
					are Baseline newly available since July 2024.
				</li>
				<li>
					Checked in Chromium (worklet) and with the <em>gradient</em> renderer, which is what other browsers
					get. Real Firefox and Safari are untested.
				</li>
				<li>
					A static pattern is painted once per size change and then cached like any image. An
					animated one runs the painter every frame on the main thread's paint step: about a
					thousand shapes on a full-screen box is fine on a laptop, but keep animated worklets
					small, or animate something cheaper.
				</li>
				<li>
					The pattern layer is decorative and <code>aria-hidden</code>; the text on top is real text
					on a nearly opaque card. Busy patterns behind text hurt readability, which is why the
					border mode exists.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.room {
		display: grid;
		padding: var(--space-16) var(--space-4) var(--space-4);
		background: oklch(16% 0.03 280);
	}

	.room :global(.pattern) {
		display: grid;
		place-items: center;
		padding: var(--space-6);
	}

	.card {
		max-inline-size: 30rem;
		padding: var(--space-6);
		border-radius: var(--radius-xl);
		background: #120e2ef2;
		color: #f4f1ff;
		box-shadow: var(--shadow-3);
	}

	.card h2 {
		margin-block: var(--space-2) var(--space-3);
		font-size: var(--text-2xl);
	}

	.card p {
		margin: 0;
	}

	.badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border: 1px solid #ffc94d;
		border-radius: var(--radius-sm);
		color: #ffc94d;
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.status {
		margin-block-start: var(--space-4) !important;
		font-size: var(--text-sm);
		opacity: 0.8;
	}

	.flag {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	:global(.motion-toggle) {
		justify-self: start;
	}

	@media (width >= 64rem) {
		.room {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
