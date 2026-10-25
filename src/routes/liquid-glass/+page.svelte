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
	import { supportsBackdropSvgFilter } from '#lib/fx/glass/support.js';
	import LiquidGlass from '#lib/fx/liquid-glass/LiquidGlass.svelte';
	import {
		displacementScale,
		fringeScales,
		GLASS_IOR,
		LIGHT_ELEVATION,
		liquidGlassSchema,
		specularSurfaceScale
	} from '#lib/fx/liquid-glass/liquid-glass.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sceneSchema = defineSchema({
		kind: { kind: 'select', label: 'Backdrop', default: 'grid', options: scenes, group: 'Stage' },
		animate: { kind: 'toggle', label: 'Animate backdrop', default: true, group: 'Stage' },
		shape: {
			kind: 'select',
			label: 'Lens shape',
			default: 'card',
			options: ['card', 'wide', 'square'],
			group: 'Stage'
		}
	});

	const glass = new ParamState(liquidGlassSchema);
	const scene = new ParamState(sceneSchema);

	// Unknown during prerendering; resolved in the browser.
	let canRefract = $state<boolean>();
	let forceRefract = $state(false);
	onMount(() => (canRefract = supportsBackdropSvgFilter()));

	function reset() {
		glass.reset();
		scene.reset();
	}

	// Lens position (offset from the center of the stage) and what to announce about it.
	const position = $state<Position>({ x: 0, y: 0 });
	let dragEl = $state<HTMLElement>();
	let announcement = $state('');
	const hintId = $props.id();

	function describe({ x, y }: Position) {
		if (x === 0 && y === 0) return 'Lens centered.';
		const parts = [];
		if (x) parts.push(`${Math.abs(Math.round(x))} pixels ${x > 0 ? 'right' : 'left'}`);
		if (y) parts.push(`${Math.abs(Math.round(y))} pixels ${y > 0 ? 'down' : 'up'}`);
		return `Lens moved to ${parts.join(' and ')} of center.`;
	}

	function announce() {
		announcement = describe(position);
	}

	function center() {
		position.x = 0;
		position.y = 0;
		announce();
	}

	// Single-pointer alternative to dragging (WCAG 2.5.7): click the backdrop to move the lens there.
	function moveTo(e: MouseEvent) {
		if (!dragEl || dragEl.contains(e.target as Node)) return;
		const r = dragEl.getBoundingClientRect();
		position.x += e.clientX - (r.left + r.width / 2);
		position.y += e.clientY - (r.top + r.height / 2);
		announce();
	}

	let filterCode = $derived.by(() => {
		const v = glass.values;
		const lines = [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <!-- width/height: the element's size in px; the map is generated at that size -->`,
			`  <filter id="lens" x="0" y="0" width="W" height="H"`,
			`          filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"`,
			`          color-interpolation-filters="sRGB">`,
			`    <feImage href="data:image/png;base64,…" x="0" y="0" width="W" height="H"`,
			`             preserveAspectRatio="none" result="map" />`
		];
		if (v.fringe > 0) {
			const s = fringeScales(v.refraction, v.fringe);
			const keep = {
				r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1',
				g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1',
				b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1'
			};
			for (const c of ['r', 'g', 'b'] as const) {
				lines.push(
					`    <feDisplacementMap in="SourceGraphic" in2="map" scale="${+s[c].toFixed(2)}"`,
					`                       xChannelSelector="R" yChannelSelector="G" result="shift-${c}" />`,
					`    <feColorMatrix type="matrix" values="${keep[c]}" result="${c}" />`
				);
			}
			lines.push(
				`    <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" />`,
				`    <feComposite in2="b" operator="arithmetic" k2="1" k3="1" />`,
				`    <!-- the copies are opaque; take the alpha back from the backdrop -->`,
				`    <feComposite in2="shift-g" operator="in" result="refracted" />`
			);
		} else {
			lines.push(
				`    <feDisplacementMap in="SourceGraphic" in2="map" scale="${displacementScale(v.refraction)}"`,
				`                       xChannelSelector="R" yChannelSelector="G" result="refracted" />`
			);
		}
		if (v.specular > 0) {
			lines.push(
				`    <feColorMatrix in="map" type="matrix"`,
				`                   values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" />`,
				`    <feGaussianBlur stdDeviation="1.5" />`,
				`    <feSpecularLighting surfaceScale="${specularSurfaceScale(v.bezel)}" specularExponent="24"`,
				`                        lighting-color="#fff" result="light">`,
				`      <feDistantLight azimuth="${v.lightAngle}" elevation="${LIGHT_ELEVATION}" />`,
				`    </feSpecularLighting>`,
				`    <feComposite in="light" in2="refracted" operator="arithmetic"`,
				`                 k2="${v.specular}" k3="1" />`
			);
		}
		lines.push(`  </filter>`, `</svg>`);
		return lines.join('\n');
	});

	let cssCode = $derived(
		[
			`.lens {`,
			`  border-radius: ${glass.values.radius}px;`,
			`  backdrop-filter: blur(${glass.values.blur}px) saturate(${glass.values.saturate}) url(#lens);`,
			`}`
		].join('\n')
	);

	const mapCode = [
		`// For every pixel (x, y) of a W × H element:`,
		`const { distance, nx, ny } = roundedRectSdf(x + 0.5, y + 0.5, W, H, radius);`,
		`const inset = -distance;                  // px from the edge, inwards`,
		`if (inset > 0 && inset < bezel) {`,
		`  const { height, slope } = profileAt(profile, inset / bezel);`,
		`  const bend = refractionOffset(slope) / refractionOffset(profileAt(profile, 0).slope);`,
		`  R = 128 - nx * bend * 127;              // x offset, pointing inwards`,
		`  G = 128 - ny * bend * 127;              // y offset`,
		`  B = height * 255;                       // for the highlight`,
		`} else {`,
		`  R = G = 128;                            // flat: no offset`,
		`  B = inset >= bezel ? 255 : 0;`,
		`}`
	].join('\n');
</script>

<svelte:head>
	<title>Liquid glass · Visual FX</title>
	<meta
		name="description"
		content="A refractive glass lens from a signed distance field, feDisplacementMap and feSpecularLighting in backdrop-filter, with an explanation of the math."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Liquid glass demo">
	{#snippet header()}
		<StageHeader title="Liquid glass" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<!-- Pointer convenience only; keyboard users move the lens with its Move handle. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="backdrop" onclick={moveTo}>
			<Scene kind={scene.values.kind} animate={scene.values.animate} class="lens-stage">
				<div
					class={['drag', scene.values.shape]}
					bind:this={dragEl}
					style:translate="{position.x}px {position.y}px"
					style:border-radius="{glass.values.radius}px"
					{@attach draggable({ position, onmoveend: announce })}
				>
					<LiquidGlass {...glass.values} {forceRefract} class="lens">
						<div class="toolbar" data-theme="dark">
							<Button
								size="sm"
								variant="ghost"
								data-drag-handle
								aria-label="Move lens"
								aria-describedby={hintId}>⠿</Button
							>
							<span class="hint">Drag, or click the backdrop</span>
							<Button size="sm" variant="ghost" onclick={center}>Center</Button>
						</div>
						<span id={hintId} class="visually-hidden">
							Use the arrow keys to move the lens, hold Shift for bigger steps.
						</span>
					</LiquidGlass>
				</div>
			</Scene>
		</div>
		<p class="visually-hidden" role="status">{announcement}</p>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Liquid glass" code={glass.markup('LiquidGlass')} onreset={reset}>
			{#if canRefract === false}
				<div class="support-note" role="note">
					<p>
						Refraction is off: <code>backdrop-filter: url()</code> only renders in Chromium-based browsers.
						You see the fallback (blur, tint and a CSS rim). Forcing it on shows the failure mode: in
						Firefox the lens loses its blur too.
					</p>
					<Switch id="force-refract" bind:checked={forceRefract} />
					<label for="force-refract">Try it anyway</label>
				</div>
			{/if}
			<ParamControls schema={liquidGlassSchema} bind:values={glass.values} />
			<ParamControls schema={sceneSchema} bind:values={scene.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A lens from a distance field"
			lede="Real glass bends light where its surface is curved. This lens computes that bend for every pixel once, stores it in an image, and lets an SVG filter apply it to whatever is behind the element."
		>
			<h3>The idea</h3>
			<p>
				Picture a slab of glass with a flat top and rounded edges, like a thick phone screen
				protector. Looking straight down through the flat part, nothing moves. Near the edge the
				surface tilts, so the light rays from the backdrop are bent on their way to your eye and the
				backdrop seems to be pulled in from further inside. The <em>bezel</em> is that curved band along
				the edge.
			</p>
			<p>The effect is built in four steps:</p>
			<ol>
				<li>
					<strong>Distance field:</strong> for each pixel, how far it is from the edge and which way the
					edge faces.
				</li>
				<li>
					<strong>Profile and normal:</strong> turn the distance into a height on the bezel and its slope.
				</li>
				<li>
					<strong>Refraction:</strong> turn the slope into a displacement with Snell's law and store it
					in the red and green channels of an image.
				</li>
				<li>
					<strong>Filter:</strong> <code>feDisplacementMap</code> moves the backdrop's pixels by
					that image, inside <code>backdrop-filter</code>.
				</li>
			</ol>

			<h3>1. Signed distance field of a rounded rectangle</h3>
			<p>
				A <em>signed distance field</em> (SDF) gives, for any point, the distance to the nearest
				edge of a shape: negative inside, zero on the edge, positive outside. For a rounded
				rectangle it is short. Move the point into the first quadrant around the center (<code
					>|p|</code
				>), subtract the half-size shrunk by the corner radius, and you get <code>q</code>, the
				distance from a smaller, sharp-cornered rectangle whose corners are the centers of the
				corner arcs:
			</p>
			<p>
				<code>q = |p| − (halfSize − r)</code><br />
				<code>d = length(max(q, 0)) + min(max(qx, qy), 0) − r</code>
			</p>
			<p>
				If both components of <code>q</code> are positive, the point is diagonal to a corner and the
				distance is to the arc. Otherwise the nearer straight side wins. The
				<em>gradient</em> of <code>d</code>, the direction in which it grows fastest, is the outward
				normal of the nearest edge: <code>(±1, 0)</code> or <code>(0, ±1)</code> along the sides,
				<code>q / |q|</code> around the corners (with the signs of <code>p</code> restored). It tells
				each pixel which way "out" is, so the displacement can point the other way.
			</p>

			<h3>2. Height profile and slope</h3>
			<p>
				Inside the bezel, <code>u = −d / bezel</code> runs from 0 at the outer edge to 1 where the
				flat top starts. The <em>Curvature</em> setting picks the shape of the cross-section,
				<code>height(u)</code>, with <code>v = 1 − u</code>:
			</p>
			<dl>
				<dt>circle</dt>
				<dd>
					<code>√(1 − v²)</code>, a quarter circle. Vertical at the very edge, so the strongest bend
					is crammed into the outermost pixels.
				</dd>
				<dt>squircle</dt>
				<dd>
					<code>(1 − v⁴)^¼</code>. Also vertical at the edge, but it stays steep for longer before
					it flattens out, so the bend spreads further inwards. This is closest to the soft-edged
					look of Apple's Liquid Glass.
				</dd>
				<dt>linear</dt>
				<dd>
					<code>u</code>, a 45° chamfer. The slope is the same everywhere, so the whole bezel is
					shifted by the same amount, with a visible seam where it meets the flat top.
				</dd>
			</dl>
			<p>
				The derivative <code>height′(u)</code> is the slope of the surface. Together with the SDF
				gradient it gives the surface normal: tilted towards the outside by
				<code>θ = atan(slope)</code>.
			</p>

			<h3>3. From normal to displacement</h3>
			<p>
				A ray from the backdrop travels straight up and enters the tilted surface at the angle
				<code>θ</code> to its normal. Snell's law says it continues at
				<code>θt = asin(sin θ / n)</code>, with <code>n = {GLASS_IOR}</code> for glass. It is bent
				by
				<code>θ − θt</code>, so after passing through the glass it has drifted sideways by about
				<code>tan(θ − θt)</code> times the thickness. That drift is the displacement. It is zero on the
				flat top, grows with the slope, and stays finite even for a vertical wall (θ = 90° gives a bend
				of about 48°).
			</p>
			<p>
				The map stores it per pixel, normalized so the steepest point of the profile reaches the
				extremes:
			</p>
			<CodeSnippet code={mapCode} />
			<p>
				A value of 128 means "no offset". The direction is <em>minus</em> the normal, so each pixel
				near the edge shows the backdrop from a little further inside: the edge magnifies, like the
				rim of a convex lens. A nice side effect: samples are never fetched from outside the
				element, so there is no transparent seam at the border. The blue channel keeps the height
				for the highlight. The bytes go through a <code>&lt;canvas&gt;</code> (<code
					>putImageData</code
				>, then
				<code>toDataURL</code>) to become a PNG data URL.
			</p>

			<h3>4. The filter</h3>
			<dl>
				<dt>feImage</dt>
				<dd>
					Loads the map. It is placed in user-space px (<code>x</code>, <code>y</code>,
					<code>width</code>, <code>height</code>) with <code>preserveAspectRatio="none"</code>,
					which is why the map has to be regenerated when the element changes size. The component
					watches its own border box with a <code>ResizeObserver</code> and rebuilds the map (a few milliseconds
					for a typical lens). Changing refraction, fringe or light does not need a new map; those are
					attributes.
				</dd>
				<dt>feDisplacementMap</dt>
				<dd>
					Moves each pixel of the backdrop by
					<code>scale × (R − ½, G − ½)</code>. Since the map's channels reach about ±½, the scale is
					twice the wanted maximum offset in px:
					<code>scale="{displacementScale(glass.values.refraction)}"</code>
					for {glass.values.refraction} px.
				</dd>
				<dt>chromatic fringe</dt>
				<dd>
					Real glass bends short wavelengths more than long ones (dispersion). The filter runs three
					displacements with slightly different scales, keeps one color channel of each with
					<code>feColorMatrix</code>, and adds them back together with
					<code>feComposite operator="arithmetic" k2="1" k3="1"</code> (<code
						>result = in + in2</code
					>). Each copy is made opaque first (its alpha row is <code>0 0 0 0 1</code>), and
					<code>operator="in"</code> against the displaced backdrop (before the channel split) puts the
					backdrop's alpha back afterwards. Otherwise the three alphas would add up and turn translucent
					pixels opaque and dark. Because the flat center has zero displacement whatever the scale, the
					fringe only appears on the bezel. Physically blue should bend most; here red does, which looks
					the same at this size and keeps the warm fringe on the outside.
				</dd>
				<dt>feSpecularLighting</dt>
				<dd>
					Lighting primitives treat the alpha channel of their input as a height map. A
					<code>feColorMatrix</code> copies the map's blue channel into alpha, a small
					<code>feGaussianBlur</code> smooths its 8-bit steps (the lighting estimates slopes from
					neighboring pixels and would exaggerate them), and <code>surfaceScale</code> (set to the
					bezel width) turns heights from 0–1 back into px, so the lit slopes match the bezel. A
					<code>feDistantLight</code>
					shines from the
					<em>Light angle</em> at {LIGHT_ELEVATION}° above the surface. The flat top faces away from
					it enough to stay dark with
					<code>specularExponent="24"</code>; only the part of the bezel tilted towards the light
					catches it. The result is added on top with another arithmetic composite, weighted by
					<em>Highlight</em>.
				</dd>
			</dl>
			<CodeSnippet code={filterCode} />
			<p>
				The filter goes last in the <code>backdrop-filter</code> chain, after a light
				<code>blur()</code> and <code>saturate()</code>. Blurring the backdrop before it is
				displaced helps hide the map's 8-bit precision: neighboring pixels on the bezel are shifted
				in small jumps, and on a soft image those jumps don't show as seams the way they do on sharp
				lines. With zero blur you can sometimes see faint banding on the bezel.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>Browser support</h3>
			<p class="note">
				The refraction needs <code>backdrop-filter: url(#…)</code>, which only Chromium-based
				browsers render. It was checked in Chromium for this page. Firefox drops the whole backdrop
				filter when it contains <code>url()</code> (see the
				<a href={resolve('/glass')}>frosted glass</a>
				page); Safari is untested. Feature detection can't tell, because <code>CSS.supports()</code> only
				checks the syntax, so the component checks for Chromium after mount and otherwise falls back to
				blur, tint and a rim drawn with inset shadows.
			</p>
			<p>
				Cost: the filter runs on every frame in which anything behind the lens changes, such as the
				animated backdrop here. The fringe triples the displacement work. The map itself is cheap to
				build, but it is rebuilt on every resize, so avoid animating the lens's size.
			</p>
			<p>
				Limitations: the map has 8 bits per channel, so offsets come in steps of
				<code>refraction / 127</code> px. The bezel is modeled as a single surface (light enters the curved
				top and leaves through a flat bottom), and the bend is a small-angle approximation of where the
				ray ends up, not a ray tracer. It is a convincing look, not an optics simulation.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.lens-stage) {
		display: grid;
		place-items: center;
	}

	.backdrop {
		display: grid;
		block-size: 100%;
		cursor: crosshair;
	}

	.drag {
		cursor: grab;
		user-select: none;
	}

	.drag.card {
		inline-size: min(22rem, 80vw);
		block-size: 14rem;
	}

	.drag.wide {
		inline-size: min(24rem, 85vw);
		block-size: 7rem;
	}

	.drag.square {
		inline-size: 15rem;
		block-size: 15rem;
	}

	.drag :global(.lens) {
		display: grid;
		align-items: end;
		justify-items: center;
		block-size: 100%;
		--liquid-glass-padding: var(--space-3);
	}

	/* Its own opaque chip: the lens is nearly clear, so text on it needs a background. */
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1);
		border-radius: var(--radius-full);
		background: var(--color-overlay);
		color: var(--color-text);
		font-size: var(--text-xs);
	}

	.toolbar :global(.button) {
		--button-radius: var(--radius-full);
	}

	.toolbar :global([data-drag-handle]) {
		cursor: grab;
		font-size: var(--text-md);
	}

	.hint {
		padding-inline: var(--space-1);
		white-space: nowrap;
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
