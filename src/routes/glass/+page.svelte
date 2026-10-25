<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import Switch from '#lib/components/atoms/Switch.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene, { scenes } from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import { draggable, type Position } from '#lib/attachments/draggable.js';
	import GlassPanel from '#lib/fx/glass/GlassPanel.svelte';
	import { glassSchema, hexToRgba } from '#lib/fx/glass/glass.js';
	import { supportsBackdropSvgFilter } from '#lib/fx/glass/support.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sceneSchema = defineSchema({
		kind: { kind: 'select', label: 'Backdrop', default: 'type', options: scenes, group: 'Stage' },
		animate: { kind: 'toggle', label: 'Animate backdrop', default: true, group: 'Stage' }
	});

	const glass = new ParamState(glassSchema);
	const scene = new ParamState(sceneSchema);

	// Unknown during prerendering; resolved in the browser.
	let canDisplace = $state<boolean>();
	let forceDisplace = $state(false);
	onMount(() => (canDisplace = supportsBackdropSvgFilter()));

	function reset() {
		glass.reset();
		scene.reset();
	}

	// Demo panel position (offset from the center of the stage) and what to announce about it.
	const position = $state<Position>({ x: 0, y: 0 });
	let dragEl = $state<HTMLElement>();
	let announcement = $state('');
	const hintId = $props.id();

	function describe({ x, y }: Position) {
		if (x === 0 && y === 0) return 'Panel centered.';
		const parts = [];
		if (x) parts.push(`${Math.abs(Math.round(x))} pixels ${x > 0 ? 'right' : 'left'}`);
		if (y) parts.push(`${Math.abs(Math.round(y))} pixels ${y > 0 ? 'down' : 'up'}`);
		return `Panel moved to ${parts.join(' and ')} of center.`;
	}

	function announce() {
		announcement = describe(position);
	}

	function center() {
		position.x = 0;
		position.y = 0;
		announce();
	}

	// Single-pointer alternative to dragging (WCAG 2.5.7): click the backdrop to move the glass there.
	function moveTo(e: MouseEvent) {
		if (!dragEl || dragEl.contains(e.target as Node)) return;
		const r = dragEl.getBoundingClientRect();
		position.x += e.clientX - (r.left + r.width / 2);
		position.y += e.clientY - (r.top + r.height / 2);
		announce();
	}

	let filterCode = $derived(
		[
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="displace" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			`    <feTurbulence type="fractalNoise" baseFrequency="${glass.values.frequency}"`,
			`                  numOctaves="${glass.values.octaves}" seed="${glass.values.distortionSeed}" result="map" />`,
			`    <feDisplacementMap in="SourceGraphic" in2="map" scale="${glass.values.distortion}"`,
			`                       xChannelSelector="R" yChannelSelector="G" />`,
			`  </filter>`,
			`</svg>`
		].join('\n')
	);

	let cssCode = $derived.by(() => {
		const v = glass.values;
		const chain = [
			v.displace ? 'url(#displace)' : '',
			`blur(${v.blur}px)`,
			`saturate(${v.saturate})`,
			`brightness(${v.brightness})`
		]
			.filter(Boolean)
			.join(' ');
		return [
			`.glass {`,
			`  position: relative;`,
			`  border-radius: ${v.radius}px;`,
			`  background: ${hexToRgba(v.tint, v.tintOpacity)};`,
			`  backdrop-filter: ${chain};`,
			`}`,
			``,
			`/* the rim: a gradient that only shows in the padding box */`,
			`.glass::after {`,
			`  content: '';`,
			`  position: absolute;`,
			`  inset: 0;`,
			`  padding: ${v.rimWidth}px;`,
			`  border-radius: inherit;`,
			`  background: linear-gradient(${v.rimAngle}deg,`,
			`    rgb(255 255 255 / ${v.rimOpacity}), transparent 35% 65%,`,
			`    rgb(255 255 255 / ${+(v.rimOpacity * 0.6).toFixed(2)}));`,
			`  mask: linear-gradient(#000 0 0) content-box exclude,`,
			`        linear-gradient(#000 0 0);`,
			`  pointer-events: none;`,
			`}`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Frosted glass · Visual FX</title>
	<meta
		name="description"
		content="Frosted glass with backdrop-filter, SVG turbulence displacement, grain and a lit rim, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Frosted glass demo">
	{#snippet header()}
		<StageHeader title="Frosted glass" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<!-- Pointer convenience only; keyboard users move the panel with its Move handle. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="backdrop" onclick={moveTo}>
			<Scene kind={scene.values.kind} animate={scene.values.animate} class="glass-stage">
				<div
					class="drag"
					bind:this={dragEl}
					style:translate="{position.x}px {position.y}px"
					{@attach draggable({ position, onmoveend: announce })}
				>
					<GlassPanel {...glass.values} {forceDisplace} class="demo">
						<div class="toolbar">
							<p class="eyebrow">Drag me, or click the backdrop</p>
							<Button
								size="sm"
								variant="ghost"
								data-drag-handle
								aria-label="Move panel"
								aria-describedby={hintId}>⠿</Button
							>
							<Button size="sm" variant="ghost" onclick={center}>Center</Button>
						</div>
						<span id={hintId} class="visually-hidden">
							Use the arrow keys to move the panel, hold Shift for bigger steps.
						</span>
						<h2>Frosted glass</h2>
						<p>
							Backdrop blur, turbulence-driven displacement, a whisper of grain and a thin rim lit
							from one side.
						</p>
					</GlassPanel>
				</div>
			</Scene>
		</div>
		<p class="visually-hidden" role="status">{announcement}</p>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Frosted glass" code={glass.markup('GlassPanel')} onreset={reset}>
			{#if canDisplace === false}
				<div class="support-note" role="note">
					<p>
						Displacement is off: it only renders in Chromium-based browsers. Blur, tint, grain and
						rim still apply. Forcing it on shows the failure mode: in Firefox the glass loses its
						blur too.
					</p>
					<Switch id="force-displace" bind:checked={forceDisplace} />
					<label for="force-displace">Try it anyway</label>
				</div>
			{/if}
			<ParamControls schema={glassSchema} bind:values={glass.values} />
			<ParamControls schema={sceneSchema} bind:values={scene.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Frosted glass, layer by layer"
			lede="The glass is a stack of five cheap layers. None of them looks like much on its own; together they read as a physical material."
		>
			<h3>The stack, back to front</h3>
			<ol>
				<li>
					<strong>Backdrop.</strong> Whatever is rendered behind the panel. The panel never copies it;
					the browser reads it while compositing.
				</li>
				<li>
					<strong>Backdrop filter.</strong> Warps, blurs and color-corrects that backdrop, but only
					inside the panel's border box (clipped to its <code>border-radius</code>).
				</li>
				<li>
					<strong>Tint.</strong> A translucent <code>background</code> color on the panel itself. It also
					decides the text color (dark on light tints, light on dark ones), and its opacity is what keeps
					that text readable: the default of 0.35 is the lowest value that keeps body text at 4.5:1 or
					better over every backdrop on this page.
				</li>
				<li>
					<strong>Grain.</strong> A faint noise layer, the same component as on the
					<a href={resolve('/noise')}>noise page</a>.
				</li>
				<li>
					<strong>Rim and glow.</strong> A one-pixel gradient border plus an inset shadow, which sell
					the edge of a slab of glass.
				</li>
			</ol>

			<h3>1. backdrop-filter: blur, saturate, brighten</h3>
			<p>
				<code>backdrop-filter</code> takes the same functions as <code>filter</code>, but applies
				them to what is <em>behind</em> the element. The functions run left to right, each on the result
				of the previous one:
			</p>
			<dl>
				<dt>blur()</dt>
				<dd>
					The frost itself. Higher values erase more detail. The blur is clipped to the panel, so
					the edges stay sharp.
				</dd>
				<dt>saturate()</dt>
				<dd>
					Blurring averages neighboring colors, which drifts them towards grey. Pushing saturation
					back up (around 1.4–1.8) keeps the panel looking lit from behind instead of muddy.
				</dd>
				<dt>brightness()</dt>
				<dd>A slight lift reads as light passing through the glass.</dd>
			</dl>

			<h3>2. Displacement: feTurbulence → feDisplacementMap</h3>
			<p>
				Real frosted or textured glass doesn't just blur, it refracts: the backdrop looks shifted
				and wavy. <code>backdrop-filter</code> also accepts <code>url(#id)</code>, a reference to an
				SVG filter, and the browser runs the backdrop through it like any image. The filter has two
				steps:
			</p>
			<ol>
				<li>
					<code>&lt;feTurbulence type="fractalNoise"&gt;</code> generates a smooth noise image (the
					<em>map</em>). A low base frequency gives large, gentle waves; a high one gives a pebbled,
					rippled texture.
				</li>
				<li>
					<code>&lt;feDisplacementMap&gt;</code> moves every pixel of the backdrop by an amount read
					from the map: the red channel moves it horizontally, the green channel vertically. A
					channel value of 0.5 means no movement; 0 and 1 mean half of <code>scale</code> pixels in
					either direction. In formula form:
					<code>P′(x, y) = P(x + scale·(R − ½), y + scale·(G − ½))</code>.
				</li>
			</ol>
			<p>
				The displacement comes <em>first</em> in the chain, so the following blur smooths out the jagged
				edges that pixel-shifting creates. Pixels near the border that would be fetched from outside the
				panel come out transparent; the rim hides that seam.
			</p>
			<CodeSnippet code={filterCode} />

			<h3>3. The rim: a masked gradient border</h3>
			<p>
				A plain <code>border</code> can't fade along its length. Instead, a <code>::after</code>
				pseudo-element covers the panel, gets <code>padding</code> equal to the rim width and a
				<code>linear-gradient</code> background. Then two masks are combined with
				<code>exclude</code>: one covering the whole box and one covering only the content box. What
				remains visible is just the padding, a gradient-colored ring that follows the
				<code>border-radius</code>.
			</p>
			<p>
				The gradient is bright at one end, nearly transparent in the middle and brighter again at
				the other end: a highlight where the light hits, plus a weaker reflection on the opposite
				edge. The
				<em>Light angle</em> slider is the gradient's angle. An inset <code>box-shadow</code> adds the
				inner glow, a regular one the drop shadow.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>4. Grain</h3>
			<p>
				Large blurs over smooth gradients show visible color banding. A very faint noise layer
				blended with <code>soft-light</code> dithers those bands away and gives the surface a tactile,
				matte quality. It sits above the tint and below the content, and inherits the panel's rounded
				corners.
			</p>

			<h3>Browser support</h3>
			<p class="note">
				Blur, tint, grain and rim work in all current browsers. The displacement renders in
				Chromium-based browsers only. Firefox (tested in 156) accepts
				<code>backdrop-filter: url(#…) blur(…)</code> but then renders no backdrop filter at all: no
				displacement and no blur, just a transparent panel. Safari is untested. Feature detection
				doesn't help: <code>CSS.supports()</code> only checks the syntax and says yes everywhere. So
				the component leaves <code>url()</code> out unless it runs in Chromium, and other browsers
				keep the frost. On this page you can see the failure for yourself with
				<em>Try it anyway</em>.
			</p>
			<p>
				Cost: the backdrop filter is re-evaluated whenever anything behind the panel changes, such
				as the animated backdrop on this page. Large blur radii and strong displacement over big
				areas are the expensive parts; small panels are cheap.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.glass-stage) {
		display: grid;
		place-items: center;
	}

	.backdrop {
		display: grid;
		block-size: 100%;
		cursor: crosshair;
	}

	.drag {
		inline-size: min(26rem, 85vw);
		border-radius: 28px;
		cursor: grab;
		user-select: none;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		/* Buttons follow the glass's automatic text color, not the page theme. */
		--button-fg: currentColor;
		--button-bg-hover: color-mix(in oklch, currentColor 12%, transparent);
	}

	.toolbar .eyebrow {
		margin-inline-end: auto;
	}

	.toolbar :global([data-drag-handle]) {
		cursor: grab;
		font-size: var(--text-md);
	}

	.drag :global(.demo) {
		--glass-padding: var(--space-8);
	}

	/* Derived from the glass's automatic text color, so it works on light and dark tints. */
	.drag .eyebrow {
		color: color-mix(in oklch, currentColor 80%, transparent);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.drag h2 {
		margin-block: var(--space-2) var(--space-3);
		font-size: var(--text-xl);
	}

	.drag p {
		color: color-mix(in oklch, currentColor 90%, transparent);
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
