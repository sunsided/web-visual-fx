<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Outline from '#lib/fx/outline/Outline.svelte';
	import StickerArt, { stickerArts } from '#lib/fx/outline/StickerArt.svelte';
	import {
		outerRadius,
		outlinePadding,
		outlineSchema,
		roundingBlur,
		roundingMatrix
	} from '#lib/fx/outline/outline.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Source',
			default: 'rocket',
			options: [...stickerArts, 'text'],
			group: 'Stage',
			description:
				'Anything with transparency works: inline SVG, transparent PNGs, and real, selectable text.'
		},
		background: { kind: 'color', label: 'Background', default: '#3b3270', group: 'Stage' }
	});

	const outline = new ParamState(outlineSchema);
	const scene = new ParamState(sourceSchema);

	function reset() {
		outline.reset();
		scene.reset();
	}

	// Mirrors OutlineFilter.svelte, filled in with the current settings.
	let filterCode = $derived.by(() => {
		const v = outline.values;
		const layers: [string, number, string][] = [
			['stroke', v.width, v.color],
			...(v.ring ? [['ring', outerRadius(v), v.ringColor] as [string, number, string]] : [])
		];
		const outer = layers[layers.length - 1][0];
		const matrix = roundingMatrix();
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="outline" x="0" y="0" width="100%" height="100%"`,
			`          color-interpolation-filters="sRGB">`,
			...layers.flatMap(([name, radius, fill]) => {
				const blur = roundingBlur(radius, v.roundness);
				return [
					`    <!-- ${name === 'stroke' ? 'the outline' : 'the keyline ring'}: grow the alpha by ${radius}px -->`,
					`    <feMorphology in="SourceAlpha" operator="dilate" radius="${radius}"`,
					`                  result="${name}-${blur > 0 ? 'square' : 'alpha'}" />`,
					...(blur > 0
						? [
								`    <!-- round the square corners: blur, then threshold alpha at 50 % -->`,
								`    <feGaussianBlur in="${name}-square" stdDeviation="${blur}" />`,
								`    <feColorMatrix type="matrix" result="${name}-alpha"`,
								`                   values="${matrix}" />`
							]
						: []),
					`    <feFlood flood-color="${fill}" />`,
					`    <feComposite in2="${name}-alpha" operator="in" result="${name}" />`
				];
			}),
			...(v.shadow
				? [
						`    <feGaussianBlur in="${outer}-alpha" stdDeviation="${v.shadowBlur}" />`,
						`    <feOffset dx="${v.shadowX}" dy="${v.shadowY}" result="shadow-alpha" />`,
						`    <feFlood flood-color="${v.shadowColor}" flood-opacity="${v.shadowOpacity}" />`,
						`    <feComposite in2="shadow-alpha" operator="in" result="shadow" />`
					]
				: []),
			`    <feMerge>`,
			...(v.shadow ? [`      <feMergeNode in="shadow" />`] : []),
			...[...layers].reverse().map(([name]) => `      <feMergeNode in="${name}" />`),
			`      <feMergeNode in="SourceGraphic" />`,
			`    </feMerge>`,
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	let cssCode = $derived.by(() => {
		const pad = outlinePadding(outline.values);
		return [
			`.sticker {`,
			`  /* room for the outline and shadow inside the filter region, layout unchanged */`,
			`  padding: ${pad}px;`,
			`  margin: -${pad}px;`,
			`  filter: url(#outline);`,
			`}`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Sticker outline · Visual FX</title>
	<meta
		name="description"
		content="Die-cut sticker outlines around transparent images, icons and text with an SVG feMorphology filter, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Sticker outline demo">
	{#snippet header()}
		<StageHeader title="Sticker outline" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="outline-stage" style:background={scene.values.background}>
			<Outline {...outline.values} class={['sticker', scene.values.source]}>
				{#if scene.values.source === 'text'}
					<p class="sticker-text">Stick&nbsp;it!</p>
				{:else}
					<StickerArt kind={scene.values.source} />
				{/if}
			</Outline>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Sticker outline" code={outline.markup('Outline')} onreset={reset}>
			<ParamControls schema={outlineSchema} bind:values={outline.values} />
			<ParamControls schema={sourceSchema} bind:values={scene.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="An outline that follows the alpha channel"
			lede="CSS borders follow the box, not the picture. An SVG filter can read an element's alpha channel instead, grow it, paint it, and put the original back on top: a die-cut sticker edge around any transparent image, icon or line of text."
		>
			<h3>1. Grow the shape: feMorphology dilate</h3>
			<p>
				<code>SourceAlpha</code> is the element's rendering with every pixel turned black and only
				its alpha kept: the silhouette. <code>&lt;feMorphology operator="dilate"&gt;</code> replaces
				every pixel with the maximum of its neighbourhood, a rectangle <code>radius</code> pixels to each
				side. On alpha that grows the silhouette by the radius in every direction; transparent gaps narrower
				than twice the radius close up, which is why the loose stars around the rocket merge into one
				sticker once the outline gets wide enough.
			</p>
			<p>
				<code>operator="erode"</code> does the opposite (minimum instead of maximum) and shrinks the shape;
				subtracting an eroded silhouette from the original would give an inner line instead.
			</p>

			<h3>2. Round the corners: blur and threshold</h3>
			<p>
				Because the neighbourhood is a rectangle, a dilated dot becomes a square and every corner of
				the outline is square, which looks wrong on round artwork. <em>Roundness</em> blurs the
				dilated alpha with <code>&lt;feGaussianBlur&gt;</code> and then thresholds it again at 50 %
				with an <code>&lt;feColorMatrix&gt;</code>
				(<code>alpha × 10 − 4.5</code>, the same trick the gooey effect uses). Along a straight edge
				the blurred alpha crosses 50 % exactly where the edge was, so straight parts stay put. At a
				convex corner less than half the blur kernel is covered, so the corner is pulled in to a
				curve about as wide as the blur; notches fill in the same way.
			</p>

			<h3>3. Color, ring and shadow: feFlood, feComposite, feMerge</h3>
			<p>
				<code>&lt;feFlood&gt;</code> fills the filter region with one color, and
				<code>&lt;feComposite operator="in"&gt;</code> keeps it only where the grown alpha is: the
				outline. The keyline ring is the same three steps with a radius of outline plus ring width,
				drawn underneath. The shadow blurs and offsets the outermost silhouette, so the sticker
				casts it as a whole. <code>&lt;feMerge&gt;</code> stacks shadow, ring, outline and finally
				<code>SourceGraphic</code>, the untouched original, on top.
			</p>
			<CodeSnippet code={filterCode} />

			<h3>Room to grow</h3>
			<p>
				An outline extends past the element's box, but a filter only paints inside its filter
				region. The default region is 10 % larger than the box on each side, which is a lot on a
				hero image and almost nothing on a 24px icon. Percentages can't express "box plus 12px", so
				the component pads the element by exactly the outline's reach and takes the space back with
				a negative margin. The region stays at <code>0 0 100% 100%</code> of the padded box and the layout
				does not move:
			</p>
			<CodeSnippet code={cssCode} />
			<p class="note">
				The filter sees everything the element paints, so its background has to stay transparent; a
				background color would be outlined as one big rectangle. Text inside keeps working as text:
				it is still selectable and read by screen readers, only its rendering is filtered.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				SVG filters on HTML, including <code>feMorphology</code>, have been Baseline widely
				available since July 2015 (web-features, <code>svg-filters</code>). Checked in Chromium and
				Firefox; Safari is untested.
			</p>
			<ul>
				<li>
					Dilate cost grows with the radius, since every output pixel looks at a (2r + 1)²
					neighbourhood (browsers can split it into a horizontal and a vertical pass, but it still
					grows). Keep outlines to a few pixels on large elements. With the ring there are two
					dilations, and roundness adds a blur per ring.
				</li>
				<li>
					The radius is in CSS pixels, so the outline keeps its width on high-DPI screens; the
					browser computes it at device resolution.
				</li>
				<li>
					Static content is filtered once and cached. Animating the content, or the outline width,
					reruns the whole chain every frame.
				</li>
				<li>
					Without SVG filter support, a stack of <code>filter: drop-shadow(0 0 1px color)</code>
					calls gives a rough, soft-edged outline.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.outline-stage {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-8);
		overflow: hidden;
	}

	.outline-stage :global(.sticker.rocket) {
		inline-size: min(80%, 34rem);
		aspect-ratio: 1;
	}

	.outline-stage :global(.sticker.icons) {
		inline-size: min(90%, 44rem);
		aspect-ratio: 16 / 5;
	}

	.sticker-text {
		margin: 0;
		font-size: clamp(3rem, 12vw, 8rem);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.02em;
		color: #ff5a7a;
		rotate: -6deg;
	}
</style>
