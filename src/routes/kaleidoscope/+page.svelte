<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import Kaleidoscope from '#lib/fx/kaleidoscope/Kaleidoscope.svelte';
	import {
		kaleidoscopeSchema,
		SEAM_APEX_PX,
		SEAM_OVERLAP_DEG,
		segmentCount,
		wedgeAngle,
		wedgePolygon
	} from '#lib/fx/kaleidoscope/kaleidoscope.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'pattern',
			options: ['pattern', 'landscape'],
			group: 'Stage',
			description:
				'pattern: the built-in CSS gradients (one background image per wedge). landscape: an inline SVG illustration, rendered once per wedge.'
		}
	});

	const kaleidoscope = new ParamState(kaleidoscopeSchema);
	const source = new ParamState(sourceSchema);

	// Shared by the stage and the article (WCAG 2.2.2).
	let paused = $state(false);

	function reset() {
		kaleidoscope.reset();
		source.reset();
	}

	let n = $derived(segmentCount(kaleidoscope.values.segments));
	let angle = $derived(+wedgeAngle(n).toFixed(3));

	// Mirrors Kaleidoscope.svelte, filled in with the current settings.
	let cssCode = $derived.by(() => {
		const v = kaleidoscope.values;
		return [
			`.kaleidoscope {`,
			`  --n: ${n};`,
			`  container-type: size;`,
			`  position: relative;`,
			`  overflow: hidden;`,
			`}`,
			``,
			`/* a square that covers the box at any angle */`,
			`.ring {`,
			`  position: absolute;`,
			`  top: 50%;`,
			`  left: 50%;`,
			`  width: 142cqmax;`,
			`  aspect-ratio: 1;`,
			`  translate: -50% -50%;`,
			...(v.rotation ? [`  rotate: ${v.rotation}deg;`] : []),
			`}`,
			``,
			`/* every copy: the same wedge, pointing up, turned into place */`,
			`.segment {`,
			`  --half: calc(180deg / var(--n) + ${SEAM_OVERLAP_DEG}deg);`,
			`  position: absolute;`,
			`  inset: 0;`,
			`  overflow: hidden;`,
			`  clip-path: polygon(`,
			`    50% calc(50% + ${SEAM_APEX_PX}px),`,
			`    calc(50% - 50% * tan(var(--half))) 0%,`,
			`    calc(50% + 50% * tan(var(--half))) 0%`,
			`  );`,
			`  rotate: calc(var(--i) * 360deg / var(--n));`,
			`}`,
			...(v.mirror
				? [
						``,
						`/* the odd copies are mirror images */`,
						`.segment:nth-child(even) {`,
						`  scale: -1 1;`,
						`}`
					]
				: []),
			``,
			`/* the source: big enough to pan and spin without showing its edges */`,
			`.source {`,
			`  position: absolute;`,
			`  inset: ${v.interactive ? `${-v.pan * 50}%` : '0'};`,
			`  background: url(tile.jpg) center / cover;`,
			`  translate: var(--px, 0%) var(--py, 0%);`,
			`  scale: ${v.zoom};`,
			...(v.interactive ? [`  transition: translate ${v.lag}ms ease-out;`] : []),
			...(v.spin ? [`  animation: spin ${v.duration}s linear infinite;`] : []),
			`}`,
			...(v.spin ? [``, `@keyframes spin { to { rotate: 360deg; } }`] : []),
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .source { animation: none; transition: none; }`,
			`}`
		].join('\n');
	});

	let markup = $derived(
		[
			`<div class="kaleidoscope">`,
			`  <div class="ring" aria-hidden="true">`,
			`    <div class="segment" style="--i: 0"><div class="source"></div></div>`,
			`    <div class="segment" style="--i: 1"><div class="source"></div></div>`,
			`    <!-- … up to --i: ${n - 1} -->`,
			`  </div>`,
			`</div>`
		].join('\n')
	);
</script>

<svelte:head>
	<title>Kaleidoscope · Visual FX</title>
	<meta
		name="description"
		content="A CSS kaleidoscope: wedge copies of any image clipped with clip-path and turned with CSS trig functions, mirrored, spinning and following the pointer, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Kaleidoscope demo">
	{#snippet header()}
		<StageHeader title="Kaleidoscope" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="motion" data-motion={paused ? 'paused' : 'running'}>
			{#if source.values.source === 'landscape'}
				<Kaleidoscope {...kaleidoscope.values} class="kaleidoscope-stage">
					{#snippet art()}
						<Landscape />
					{/snippet}
					<div class="actions"><MotionToggle bind:paused size="sm" /></div>
				</Kaleidoscope>
			{:else}
				<Kaleidoscope {...kaleidoscope.values} class="kaleidoscope-stage">
					<div class="actions"><MotionToggle bind:paused size="sm" /></div>
				</Kaleidoscope>
			{/if}
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Kaleidoscope" code={kaleidoscope.markup('Kaleidoscope')} onreset={reset}>
			<ParamControls schema={kaleidoscopeSchema} bind:values={kaleidoscope.values} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Mirrors from clip-path and trigonometry"
			lede="A kaleidoscope is two or three mirrors in a tube: whatever lies at the far end is seen once directly and then reflected round and round into a symmetric star. CSS can't reflect light, but it can draw the same picture several times, cut each copy to a slice and turn it into place."
		>
			<h3>1. One wedge: clip-path: polygon()</h3>
			<p>
				With {n} segments every wedge spans 360° / {n} = {angle}°. Each copy of the source sits in a
				square layer centered on the kaleidoscope and is cut to the same upward-pointing triangle:
				the apex at the center, the other two corners on the top edge, half an angle to either side
				of the vertical. The top edge is half a side away from the center, so the corners are at
				<code>50% ± 50% × tan(half angle)</code>. CSS has had <code>tan()</code> since the trig functions
				landed, so the polygon can be written once and works for any segment count:
			</p>
			<CodeSnippet
				code={`clip-path: polygon(\n  50% calc(50% + ${SEAM_APEX_PX}px),\n  calc(50% - 50% * tan(var(--half))) 0%,\n  calc(50% + 50% * tan(var(--half))) 0%\n);\n\n/* for ${n} segments that resolves to\n   ${wedgePolygon(n)} */`}
			/>
			<p>
				A triangle, not a pie slice, because its base lies on the layer's edge, which is tangent to
				the largest circle that fits in the square. That circle is bigger than the box's half
				diagonal, so the triangles together cover every corner. Each wedge is also widened by
				{SEAM_OVERLAP_DEG}° on both sides: antialiased edges of two clips that meet exactly let a
				hairline of the background shine through, and the small overlap hides it. Close to the
				center an angle of a quarter degree is far thinner than a pixel, so the apex also moves
				{SEAM_APEX_PX}px past the center.
			</p>

			<h3>2. Turned into place: rotate with calc()</h3>
			<p>
				Copy <code>i</code> gets <code>rotate: calc(var(--i) * 360deg / var(--n))</code>. The
				rotation turns both the clip and the content, since <code>clip-path</code> is applied in the element's
				own coordinates before its transform. Without mirroring this is plain rotational symmetry, and
				every edge is a hard seam where the source doesn't continue.
			</p>

			<h3>3. Mirrors: flip every other copy</h3>
			<p>
				A real mirror at the wedge's edge shows the wedge reflected across that edge. With the edge
				at half a wedge angle θ/2 from the vertical, that reflection is the same as flipping the
				wedge horizontally (<code>scale: -1 1</code>, which maps it onto itself, mirrored) and then
				rotating it by θ. So the odd copies get <code>scale: -1 1</code> on top of their rotation. A
				point on the shared edge lands on the same spot in both neighbors, and the pattern runs
				continuously across every edge. That only closes up all the way round with an even number of
				wedges, which is why <em>Segments</em> moves in steps of two.
			</p>
			<CodeSnippet code={markup} />
			<CodeSnippet code={cssCode} />

			<h3>4. Turning the tube</h3>
			<p>
				In a real kaleidoscope the mirrors stay put and the beads tumble. Here the source inside
				every wedge rotates with one CSS animation, the same in all copies, and the flipped copies
				turn the other way automatically. The visible part of each wedge is a disc of half the
				layer's side, and a square that spins about its center always covers the circle inscribed in
				it, so without panning a source of the layer's size is enough. The pointer pans the source
				by up to
				<em>Pan range</em> × half a side; the source grows by that range so its inscribed circle
				still covers the disc at the largest offset, and its edges never come into view. A
				<code>transition</code> on <code>translate</code> makes the pattern glide after the pointer.
			</p>

			<h3>Motion and accessibility</h3>
			<ul>
				<li>
					Under <code>prefers-reduced-motion</code> the source neither spins nor follows the
					pointer. Large, symmetric patterns in motion are a typical trigger for vestibular
					discomfort. The <em>Pause animations</em> button stops the spin (WCAG 2.2.2).
				</li>
				<li>
					All copies are <code>aria-hidden</code>. Text goes in <code>children</code>, which render
					once on top; put it on its own surface, since contrast over a moving pattern can't be
					guaranteed.
				</li>
			</ul>

			<h3>Browser support and performance</h3>
			<p>
				<code>clip-path</code> with basic shapes is Baseline widely available, and the trig
				functions (<code>sin()</code>, <code>cos()</code>, <code>tan()</code>) are Baseline since
				2023 and widely available by now. A browser without trig functions treats the polygon as
				invalid; an
				<code>@supports</code> rule then shows one unclipped copy of the source instead of a pile of overlapping
				ones. Checked in Chromium only; Firefox and Safari are untested.
			</p>
			<ul>
				<li>
					There are <em>n</em> live copies of the source, so <em>n</em> times the paint. An image (<code
						>src</code
					>) is decoded once and only drawn n times; inline SVG (try the landscape) is laid out n
					times. Keep interactive DOM out of it.
				</li>
				<li>
					The spin animates <code>rotate</code>, which the compositor can run without repainting the
					content, but every frame still redraws n clipped layers. At 24 segments on a large, high
					DPI screen that adds up (judgment, not measured).
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.motion,
	:global(.kaleidoscope-stage) {
		block-size: 100%;
	}

	.actions {
		position: absolute;
		inset-block-end: var(--space-4);
		inset-inline-start: var(--space-4);
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-2xl);
		background: var(--color-overlay);
		box-shadow: var(--shadow-3);
	}
</style>
