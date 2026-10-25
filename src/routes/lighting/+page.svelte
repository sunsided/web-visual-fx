<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import LitSurface from '#lib/fx/lighting/LitSurface.svelte';
	import {
		lightingSchema,
		percentToPx,
		stepPercent,
		toDistant
	} from '#lib/fx/lighting/lighting.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const lighting = new ParamState(lightingSchema);
	let width = $state(0);
	let height = $state(0);

	// --- Keyboard path: arrow keys move the resting light, Page Up/Down change its height ------
	let announcement = $state('');
	let announceTimer: ReturnType<typeof setTimeout> | undefined;
	const hintId = $props.id();

	function horizontal(x: number) {
		if (x < 34) return 'left';
		if (x > 66) return 'right';
		return 'center';
	}

	function vertical(y: number) {
		if (y < 34) return 'top';
		if (y > 66) return 'bottom';
		return 'middle';
	}

	function announce() {
		const { lightX: x, lightY: y, elevation } = lighting.values;
		clearTimeout(announceTimer);
		announceTimer = setTimeout(() => {
			announcement = `Light at ${vertical(y)} ${horizontal(x)}, ${x}% across, ${y}% down, ${elevation} pixels high.`;
		}, 400);
	}

	$effect(() => () => clearTimeout(announceTimer));

	function moveWithKeys(e: KeyboardEvent) {
		const s = e.shiftKey ? 10 : 2;
		const delta: Record<string, [number, number]> = {
			ArrowLeft: [-s, 0],
			ArrowRight: [s, 0],
			ArrowUp: [0, -s],
			ArrowDown: [0, s]
		};
		const v = lighting.values;
		const { min, max } = lightingSchema.elevation;
		if (e.key === 'PageUp' || e.key === 'PageDown') {
			e.preventDefault();
			const dz = (e.key === 'PageUp' ? 1 : -1) * (e.shiftKey ? 50 : 10);
			v.elevation = Math.min(max, Math.max(min, v.elevation + dz));
			announce();
			return;
		}
		const d = delta[e.key];
		if (!d) return;
		e.preventDefault();
		const p = stepPercent({ x: v.lightX, y: v.lightY }, { x: d[0], y: d[1] });
		v.lightX = p.x;
		v.lightY = p.y;
		announce();
	}

	function resetLight() {
		const { lightX, lightY, elevation } = lightingSchema;
		lighting.values.lightX = lightX.default;
		lighting.values.lightY = lightY.default;
		lighting.values.elevation = elevation.default;
		announce();
	}

	// --- Explainer ----------------------------------------------------------------------------
	let restPx = $derived(
		percentToPx({ x: lighting.values.lightX, y: lighting.values.lightY }, { width, height })
	);

	let lightCode = $derived.by(() => {
		const v = lighting.values;
		const { x, y } = restPx;
		switch (v.lightType) {
			case 'point':
				return `<fePointLight x="${x}" y="${y}" z="${v.elevation}" />`;
			case 'spot':
				return [
					`<feSpotLight x="${x}" y="${y}" z="${v.elevation}"`,
					`             pointsAtX="${width / 2}" pointsAtY="${height / 2}" pointsAtZ="0"`,
					`             limitingConeAngle="${v.coneAngle}" />`
				].join('\n');
			case 'distant': {
				const { azimuth, elevation } = toDistant(restPx, v.elevation, { width, height });
				return `<feDistantLight azimuth="${azimuth}" elevation="${elevation}" />`;
			}
		}
	});

	let filterCode = $derived.by(() => {
		const v = lighting.values;
		const indent = (code: string, n: number) =>
			code
				.split('\n')
				.map((l) => ' '.repeat(n) + l)
				.join('\n');
		const heightMap = v.relief === 'texture' ? 'noise' : v.relief === 'shape' ? 'shape' : 'height';
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="lit" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			...(v.relief !== 'shape'
				? [
						`    <!-- height map 1: noise (its alpha channel) -->`,
						`    <feTurbulence type="fractalNoise" baseFrequency="${v.bumpFrequency}"`,
						`                  numOctaves="${v.bumpOctaves}" seed="${v.bumpSeed}" result="noise" />`
					]
				: []),
			...(v.relief !== 'texture'
				? [
						`    <!-- height map 2: the element's own shape, with soft slopes -->`,
						`    <feGaussianBlur in="SourceAlpha" stdDeviation="${v.shapeBlur}" result="shape" />`
					]
				: []),
			...(v.relief === 'both'
				? [
						`    <feComposite in="shape" in2="noise" operator="arithmetic"`,
						`                 k2="${+(1 - v.bumpAmount).toFixed(2)}" k3="${v.bumpAmount}" result="height" />`
					]
				: []),
			`    <feFlood flood-color="${v.surfaceColor}" result="surface" />`,
			`    <feDiffuseLighting in="${heightMap}" surfaceScale="${v.surfaceScale}"`,
			`                       diffuseConstant="${v.diffuseConstant}"`,
			`                       lighting-color="${v.lightingColor}" result="diffuse">`,
			indent(lightCode, 6),
			`    </feDiffuseLighting>`,
			`    <feComposite in="surface" in2="diffuse" operator="arithmetic" k1="1"`,
			`                 result="lit" />`,
			...(v.specular
				? [
						`    <feSpecularLighting in="${heightMap}" surfaceScale="${v.surfaceScale}"`,
						`                        specularConstant="${v.specularConstant}"`,
						`                        specularExponent="${v.specularExponent}"`,
						`                        lighting-color="${v.lightingColor}" result="gloss">`,
						indent(lightCode, 6),
						`    </feSpecularLighting>`,
						`    <feComposite in="lit" in2="gloss" operator="arithmetic" k2="1" k3="1" />`
					]
				: []),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	let moveCode = $derived(
		[
			`const light = document.querySelector('#lit fePointLight');`,
			`let frame = 0;`,
			``,
			`surface.addEventListener('pointermove', (e) => {`,
			`  if (frame) return; // at most one update per frame`,
			`  frame = requestAnimationFrame(() => {`,
			`    frame = 0;`,
			`    const r = surface.getBoundingClientRect();`,
			`    // user space = CSS px from the filtered element's top-left corner`,
			`    light.setAttribute('x', e.clientX - r.left);`,
			`    light.setAttribute('y', e.clientY - r.top);`,
			`  });`,
			`});`
		].join('\n')
	);
</script>

<svelte:head>
	<title>Lighting · Visual FX</title>
	<meta
		name="description"
		content="Embossed plaster and raised letters lit by a movable light, with SVG feDiffuseLighting and feSpecularLighting, and an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Lighting demo">
	{#snippet header()}
		<StageHeader title="Lighting" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<LitSurface
			{...lighting.values}
			bind:lightX={lighting.values.lightX}
			bind:lightY={lighting.values.lightY}
			bind:width
			bind:height
			class="lit-stage"
			role="img"
			aria-label="The word RELIEF raised out of a plaster wall, lit from one side."
		>
			<span class="word">RELIEF</span>
		</LitSurface>

		<div class="toolbar">
			<p class="hint">The light follows the pointer; click or tap to park it</p>
			<div class="buttons">
				<Button
					size="sm"
					variant="ghost"
					aria-label="Move light"
					aria-describedby={hintId}
					onkeydown={moveWithKeys}>✺ Move</Button
				>
				<Button size="sm" variant="ghost" onclick={resetLight}>Reset light</Button>
			</div>
			<span id={hintId} class="visually-hidden">
				Arrow keys move the light, Page Up and Page Down raise and lower it. Hold Shift for bigger
				steps.
			</span>
		</div>
		<p class="visually-hidden" role="status">{announcement}</p>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Lighting" code={lighting.markup('LitSurface')} onreset={lighting.reset}>
			<ParamControls schema={lightingSchema} bind:values={lighting.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Light from a height map"
			lede="SVG filters can light an image as if it were a 3D surface. The trick is to treat one channel as height: the filter works out which way every pixel faces, and shades it accordingly."
		>
			<h3>The idea: normals from a height map</h3>
			<p>
				The lighting primitives read the <strong>alpha channel</strong> of their input as a height
				map: alpha 0 is the ground, alpha 1 is <code>surfaceScale</code> px above it. For every
				pixel the browser looks at its neighbors (a 3×3 Sobel kernel) to estimate the slope in x and
				y, and turns the slope into a <em>surface normal</em>, the direction the surface faces at
				that point:
			</p>
			<p class="formula"><code>N = normalize(−s · ∂A/∂x, −s · ∂A/∂y, 1)</code></p>
			<p>
				On flat ground the normal points straight up, <code>(0, 0, 1)</code>. On a slope it tilts
				away from uphill, and a larger <code>surfaceScale</code> (s) tilts it further. Then classic
				shading models are evaluated per pixel with the unit vector <code>L</code> from the pixel to the
				light:
			</p>
			<dl>
				<dt>diffuse</dt>
				<dd>
					<code>kd · (N · L) · lighting-color</code>. Lambert's law: a face pointing at the light is
					brightest, one at a right angle to it is black. Matte plaster.
				</dd>
				<dt>specular</dt>
				<dd>
					<code>ks · (N · H)<sup>exponent</sup> · lighting-color</code>, where <code>H</code> is
					halfway between <code>L</code> and the viewer (straight above, at infinity). Only faces that
					mirror the light into the eye light up: the glossy glint on the edges of the letters.
				</dd>
			</dl>
			<p>
				The height map is what you feed in. Here there are two, used alone or mixed (<em>Relief</em
				>):
			</p>
			<ol>
				<li>
					<code>&lt;feTurbulence type="fractalNoise"&gt;</code>, the same noise as on the
					<a href={resolve('/noise')}>noise page</a>. Its alpha channel is a cloudy field around
					0.5; lit, it reads as plaster at low frequencies and as paper grain at high ones.
				</li>
				<li>
					<code>&lt;feGaussianBlur in="SourceAlpha"&gt;</code>: the element's own shape. Opaque
					letters on a transparent background are a height map already, but a sheer cliff: the slope
					is only one pixel wide. Blurring it turns the edges into ramps, and the ramps catch the
					light. <em>Shape bevel</em> is the blur, so it controls how wide the bevel is.
				</li>
			</ol>
			<p>
				With <em>both</em>, an arithmetic composite mixes them:
				<code>height = (1 − amount) · shape + amount · noise</code>. The textured ground stays
				textured, and the letters stand on it.
			</p>

			<h3>Lights: point, spot, distant</h3>
			<p>
				Each lighting primitive takes exactly one light source as its child. This is the one for
				your current settings, at the resting position:
			</p>
			<CodeSnippet code={lightCode} />
			<dl>
				<dt>fePointLight</dt>
				<dd>
					A bulb at <code>x, y, z</code>. <code>L</code> changes across the surface, so the light
					falls off at the far side and highlights move with it. <em>Elevation</em> is
					<code>z</code>: a low light rakes across the surface and shows every bump; a high one
					flattens it.
				</dd>
				<dt>feSpotLight</dt>
				<dd>
					A point light with a cone, aimed at <code>pointsAtX/Y/Z</code> (here the center of the
					surface). Outside <code>limitingConeAngle</code> it's dark; <code>specularExponent</code>
					on the light (not the primitive) would make the cone's falloff softer.
				</dd>
				<dt>feDistantLight</dt>
				<dd>
					Parallel rays, like the sun: just an <code>azimuth</code> (direction in the plane, degrees
					clockwise from +x, since y points down) and an <code>elevation</code> above the horizon.
					Every pixel gets the same <code>L</code>, so flat areas are evenly lit and only slopes
					differ. The demo derives both angles from where the pointer is relative to the center.
				</dd>
			</dl>
			<p class="note">
				Light coordinates are in the filter's <em>user space</em>. With the filter applied to an
				HTML element via CSS, that is CSS px measured from the element's top-left corner. The
				filter's
				<code>primitiveUnits</code> default (<code>userSpaceOnUse</code>) keeps it that way; with
				<code>primitiveUnits="objectBoundingBox"</code> they'd be fractions of the box instead, and
				so would <code>z</code> and <code>stdDeviation</code>, which is rarely what you want. Px
				coordinates also mean the light doesn't follow when the element is resized, so the component
				stores the resting position as a percentage and converts it with the size measured by a
				<code>ResizeObserver</code> (Svelte's <code>bind:clientWidth</code>).
			</p>

			<h3>Compositing onto a surface color</h3>
			<p>
				The lighting primitives output light, not a lit material: a full-size image in
				<code>lighting-color</code>, darker where the surface faces away. To get colored plaster,
				<code>&lt;feFlood&gt;</code> fills the region with the surface color and an arithmetic
				<code>&lt;feComposite&gt;</code> with <code>k1="1"</code> multiplies the two (result =
				k1·a·b). The specular highlights are <em>added</em> on top (<code>k2="1" k3="1"</code>), so
				they can brighten the surface color past what diffuse light could. The element's own colors
				are thrown away; only its alpha was used.
			</p>
			<CodeSnippet code={filterCode} />

			<h3>Moving the light</h3>
			<p>
				The light is an element in the DOM, so moving it means changing its attributes. The demo
				listens to <code>pointermove</code>, but applies at most one update per animation frame:
				mice can report several hundred moves per second, and each update re-renders the filter.
				When the pointer leaves, the light eases back to its resting position. A click or tap parks
				it where you clicked.
			</p>
			<CodeSnippet code={moveCode} />

			<h3>Accessibility</h3>
			<ul>
				<li>
					Pointer-free path: focus <em>Move</em> and use the arrow keys (Page Up/Down for height, Shift
					for bigger steps), or use the sliders. The position is announced. Without a pointer, the light
					rests at the position set by the sliders.
				</li>
				<li>
					Embossed text is low contrast by nature: it is the surface color on the surface color,
					made visible only by shading, which disappears under some light angles. It's fine for
					decoration; never put real content in it. Here it's <code>aria-hidden</code>, and the
					surface has a text alternative instead.
				</li>
				<li>
					Nothing moves on its own. The light only moves with the pointer or keys, and it eases back
					instead of jumping, so the surface doesn't change all at once.
				</li>
			</ul>

			<h3>Performance</h3>
			<p class="note">
				Lighting filters are among the most expensive SVG primitives: per pixel, a Sobel kernel, a
				normalization and, for specular, a power function, and browsers don't cache intermediate
				results between renders. Changing a light attribute re-runs the whole chain, turbulence
				included. Measured on this page in Chromium (1265×800 CSS px at device pixel ratio 2, on a
				busy machine, so treat the numbers as rough): about 80–90 frames per second while the light
				sits still, 15–30 while it follows the pointer, and about 75 when the same pointer updates
				run without the filter. So the filter is the bottleneck, not the event handling. Keep lit
				areas small, throttle updates to one per frame (done here), don't animate the light on its
				own, and consider pre-rendering the turbulence to an image if the texture never changes.
			</p>

			<h3>Browser support</h3>
			<p>
				<code>feDiffuseLighting</code>, <code>feSpecularLighting</code> and the three light sources
				are part of SVG 1.1 and implemented in every engine, and so is applying an SVG filter to an
				HTML element with <code>filter: url(#id)</code>. The rendering differs in details: with the
				same numbers, Firefox 156 draws noticeably darker shadows and a harsher texture than
				Chromium. The interaction was tested in Chromium; in Firefox only the static rendering was
				checked. Safari is untested.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.lit-stage) {
		cursor: crosshair;
	}

	.word {
		font-size: clamp(3.5rem, 13vw, 11rem);
		font-weight: 900;
		letter-spacing: -0.03em;
		user-select: none;
	}

	.toolbar {
		position: absolute;
		inset-block-start: calc(var(--space-4) + 3rem);
		inset-inline-start: var(--space-4);
		display: grid;
		gap: var(--space-1);
		max-inline-size: calc(100% - 2 * var(--space-4));
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-overlay);
		backdrop-filter: blur(16px);
		color: var(--color-text);
		box-shadow: var(--shadow-2);
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.formula {
		font-size: var(--text-lg);
		text-align: center;
	}
</style>
