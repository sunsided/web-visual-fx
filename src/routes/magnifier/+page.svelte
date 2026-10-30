<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import Magnifier from '#lib/fx/magnifier/Magnifier.svelte';
	import { lensScale, magnifierSchema, maxOffset } from '#lib/fx/magnifier/magnifier.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const fx = new ParamState(magnifierSchema);
	let x = $state(0.42);
	let y = $state(0.38);

	let scale = $derived(lensScale(fx.values));
	let offset = $derived(maxOffset(fx.values.profile, fx.values.zoom, fx.values.rim));

	// Mirrors MagnifierFilter.svelte with the current settings.
	let filterCode = $derived.by(() => {
		const size = Math.round(fx.values.radius * 2);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <!-- W × H: the element's size; X, Y: top-left of the lens square, in px -->`,
			`  <filter id="loupe" x="0" y="0" width="W" height="H"`,
			`          filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"`,
			`          color-interpolation-filters="sRGB">`,
			`    <!-- ${size} × ${size} px PNG: red/green = offset towards the center, around 128 -->`,
			`    <feImage href="data:image/png;base64,…" x="X" y="Y"`,
			`             width="${size}" height="${size}" preserveAspectRatio="none" result="map" />`,
			`    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}"`,
			`                       xChannelSelector="R" yChannelSelector="G"`,
			`                       x="X" y="Y" width="${size}" height="${size}" result="lens" />`,
			`    <feMerge>`,
			`      <feMergeNode in="SourceGraphic" />`,
			`      <feMergeNode in="lens" />`,
			`    </feMerge>`,
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	const profileCode = [
		`t = distance from the center / radius        // 0 … 1`,
		`k = 1 − 1 / zoom`,
		``,
		`loupe:   f(t) = 1 − k · (1 − smoothstep((t − (1 − rim)) / rim))`,
		`fisheye: f(t) = 1 − k · (1 − t²)²`,
		``,
		`a pixel at p shows the content at  c + (p − c) · f(t)`,
		`so the offset stored in the map is (p − c) · (f(t) − 1)`
	].join('\n');
</script>

<svelte:head>
	<title>Magnifier · Visual FX</title>
	<meta
		name="description"
		content="A magnifying loupe or fisheye over live HTML with a generated radial feDisplacementMap, keyboard operable, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Magnifier demo">
	{#snippet header()}
		<StageHeader title="Magnifier" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="surface">
			<Magnifier {...fx.values} bind:x bind:y label="Magnifier over the map" class="sheet-area">
				<article class="sheet">
					<div class="plate"><Landscape /></div>
					<div class="text">
						<p class="kicker">Plate IV · Lake at dusk</p>
						<h2>Field notes</h2>
						<p class="fine">
							Move the mouse over the sheet, or focus the lens with Tab and use the arrow keys. The
							type under the lens is still real text: select it, copy it, or read it with a screen
							reader. Only its pixels are bent by an SVG displacement map.
						</p>
						<p class="fine">
							Ridges, far to near: 1,240 m, 980 m, 610 m. Shoreline pines, eight. Birds in flight,
							three. Water temperature at the jetty, 14 °C. Wind from the west, light.
						</p>
					</div>
				</article>
			</Magnifier>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Magnifier" code={fx.markup('Magnifier')} onreset={fx.reset}>
			<ParamControls schema={magnifierSchema} bind:values={fx.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A loupe made of one displacement map"
			lede="A magnifying glass shows the content from closer to its center than where you see it. That is a displacement: every pixel under the lens is fetched from a point nearer the middle. An SVG filter can do this to any HTML with a single generated map."
		>
			<h3>The pipeline</h3>
			<ol>
				<li>
					<strong>Generate the map</strong> once per lens shape: a PNG of the lens's square, whose red
					and green channels hold, per pixel, how far to look towards the center.
				</li>
				<li>
					<strong>Place it</strong> under the pointer with <code>feImage</code>'s
					<code>x</code> and <code>y</code>.
				</li>
				<li>
					<strong>Displace</strong> the content with <code>feDisplacementMap</code>, limited to the
					lens square, and lay the result over the untouched content with <code>feMerge</code>.
				</li>
			</ol>
			<p>
				Moving the lens only changes four attributes; the map is rebuilt only when the radius, zoom,
				profile or rim change.
			</p>

			<h3>1. The zoom profile</h3>
			<p>
				For a pixel at distance t from the center (in units of the radius), a sampling factor f(t)
				says where to look: f = 1/zoom magnifies, f = 1 shows the content where it is. The two
				profiles differ in how they get from one to the other:
			</p>
			<CodeSnippet code={profileCode} />
			<p>
				A <em>loupe</em> magnifies evenly and squeezes everything that the magnified center covers
				into a narrow rim, like a real magnifying glass. A <em>fisheye</em> is strongest in the center
				and eases off all the way to the edge. Both reach f(1) = 1, so the lens meets its surroundings
				without a seam, and t·f(t) only ever grows, so the picture never folds over; a unit test checks
				that for every profile and setting.
			</p>
			<p>
				This is what sets it apart from the <a href={resolve('/liquid-glass')}>liquid glass</a>
				lens, which uses the same delivery path (a generated map in <code>feImage</code>) but
				refracts only at its bezel and leaves the flat center alone. A loupe does the opposite: the
				interior is the point.
			</p>

			<h3>2. Encoding the map</h3>
			<p>
				<code>feDisplacementMap</code> fetches each pixel from
				<code>scale × (R − ½, G − ½)</code> away. The offset (p − c)·(f − 1) is divided by the
				largest offset in the lens, currently {offset.toFixed(3)} × the radius, and stored around 128
				in red and green, so the strongest pull reaches 1 or 255 and uses all 8 bits. The scale turns
				that back into px: {scale} for your settings. Outside the circle the map is 128, which moves nothing.
				The PNG is encoded in plain TypeScript, with the same encoder as the
				<a href={resolve('/crt')}>CRT</a>'s barrel map, so it has no canvas color management in the
				way.
			</p>
			<CodeSnippet code={filterCode} />
			<p>
				All coordinates are user-space px (<code>filterUnits</code> and
				<code>primitiveUnits="userSpaceOnUse"</code>): for an HTML element they start at the
				top-left corner of its border box. Without them, the default filter region is the bounding
				box plus 10%, and percentages would have to be recomputed on every resize.
			</p>

			<h3>3. Following the pointer, and the keyboard</h3>
			<p>
				A mouse anywhere over the element moves the lens; the lens follows with frame-rate
				independent smoothing (the same helper as the <a href={resolve('/holo')}>holo card</a>'s
				tilt), which is skipped when the user prefers reduced motion. The lens itself ignores mouse
				clicks, because the pointer always sits in its middle and would otherwise block every link
				underneath.
			</p>
			<p>
				The lens is focusable and exposed as a two-dimensional slider, the pattern common color
				pickers use: the arrow keys move it by 2% of the element (Shift: 10%), Home centers it, and
				the value text reads both coordinates, for example "42% across, 38% down". On touch screens,
				drag the lens itself; it sets <code>touch-action: none</code> only on itself, so the page still
				scrolls everywhere else.
			</p>

			<h3>Readability</h3>
			<p>
				A filter magnifies the rendered pixels, it doesn't re-render the content larger. At 2× the
				type under the lens is as sharp as a 2× bitmap zoom: fine on a high-DPI screen, visibly soft
				on a 1× screen. It is a visual effect, not an accessibility zoom; for that the browser's own
				zoom re-renders text properly. The loupe's rim does the opposite and squeezes content into a
				narrow ring; displacement picks single pixels without averaging, so a very narrow rim looks
				grainy. A wider rim or the fisheye profile keeps it smooth. The text never leaves the DOM,
				so selection, find in page and screen readers work as usual.
			</p>

			<h3>Backdrop mode</h3>
			<p>
				By default the filter runs on the content, and every move of the lens reruns it over the
				whole element. In <em>Backdrop mode</em> the same filter is applied as
				<code>backdrop-filter: url(#id)</code> on the lens instead, with the map at the lens's own
				origin, so only the lens area is processed and anything behind the lens is magnified, not
				just the component's children. Only Chromium renders SVG filters in
				<code>backdrop-filter</code>: Firefox drops the whole backdrop filter when it contains
				<code>url()</code>, and feature detection can't tell, since <code>CSS.supports</code> accepts
				the syntax everywhere. The component therefore checks for a Chromium engine and otherwise falls
				back to the content filter, which looks the same.
			</p>

			<h3>Browser support and performance</h3>
			<p class="note">
				Content mode uses SVG filters on HTML, <code>feImage</code> with a data URL and
				<code>feDisplacementMap</code>, all Baseline widely available (web-features 3.44.0).
				Backdrop mode is Chromium only, as above. Checked in Chromium; other engines are untested.
			</p>
			<ul>
				<li>
					In content mode every lens move reruns the filter over the element. Only the lens square
					is displaced, but the merge still covers the whole element, so keep the magnified area no
					larger than needed. Backdrop mode only processes the lens.
				</li>
				<li>
					Building a map is a loop over (2 × radius)² pixels plus an uncompressed PNG of the same
					size, about 110 KB for the default radius. It happens when the lens shape changes, not
					when it moves.
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
		background: oklch(93% 0.01 80);
	}

	.surface :global(.sheet-area) {
		inline-size: min(46rem, 100%);
		border-radius: var(--radius-xl);
		box-shadow: 0 12px 40px oklch(0% 0 0 / 0.2);
	}

	.sheet {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		background: oklch(98% 0.01 85);
		color: oklch(22% 0.02 260);
	}

	.plate {
		min-block-size: 18rem;
	}

	.text {
		padding: var(--space-6);
	}

	.kicker {
		margin: 0;
		color: oklch(45% 0.05 260);
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h2 {
		margin: var(--space-2) 0 var(--space-3);
		font-size: var(--text-2xl);
		line-height: 1.1;
	}

	.fine {
		margin: 0 0 var(--space-3);
		font-size: var(--text-xs);
		line-height: 1.5;
	}

	@media (width < 40rem) {
		.sheet {
			grid-template-columns: 1fr;
		}
	}

	@media (width >= 64rem) {
		.surface {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
