<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import ParallaxLayer from '#lib/fx/scroll-reveal/ParallaxLayer.svelte';
	import ParallaxScene from '#lib/fx/scroll-reveal/ParallaxScene.svelte';
	import ScrollProgress from '#lib/fx/scroll-reveal/ScrollProgress.svelte';
	import ScrollReveal from '#lib/fx/scroll-reveal/ScrollReveal.svelte';
	import {
		parallaxSchema,
		revealCss,
		REVEAL_PRESETS,
		scrollProgressSchema,
		scrollRevealSchema
	} from '#lib/fx/scroll-reveal/scroll-reveal.js';
	import { supportsScrollTimeline } from '#lib/fx/scroll-reveal/support.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const reveal = new ParamState(scrollRevealSchema);
	const parallax = new ParamState(parallaxSchema);
	const progress = new ParamState(scrollProgressSchema);

	function reset() {
		reveal.reset();
		parallax.reset();
		progress.reset();
	}

	// Unknown until mounted; the content is visible either way, this only picks the note.
	let supported = $state<boolean>();
	onMount(() => {
		supported = supportsScrollTimeline();
	});

	const cards = [
		{
			tag: 'view()',
			title: 'Progress from position',
			text: 'Each card has its own timeline: 0% as its top edge enters the scrollport, 100% once it is fully inside.'
		},
		{
			tag: 'animation-range',
			title: 'Pick a stretch',
			text: 'entry, cover, contain: named parts of the trip through the scrollport, trimmed with percentages.'
		},
		{
			tag: 'fill-mode: both',
			title: 'Hidden before, shown after',
			text: 'The first keyframe holds until the range starts, the resting state takes over after it.'
		},
		{
			tag: '@supports',
			title: 'Never stuck hidden',
			text: 'Without support the animation never applies, and the resting state is the visible one.'
		},
		{
			tag: 'reduced motion',
			title: 'Off when asked',
			text: 'Under prefers-reduced-motion the cards are simply there; nothing moves.'
		},
		{
			tag: 'no JavaScript',
			title: 'Nothing runs on scroll',
			text: 'No listeners, no IntersectionObserver: the browser maps scroll offset to animation progress itself.'
		}
	];

	let codeCss = $derived(revealCss(reveal.values));

	let parallaxCss = $derived(
		[
			`.scene {`,
			`  position: relative;`,
			`  overflow: clip;`,
			`  /* a named view timeline the layers can refer to */`,
			`  view-timeline: --scene block;`,
			`}`,
			``,
			`@keyframes parallax {`,
			`  from { translate: 0 calc(var(--depth) * -${parallax.values.strength}px); }`,
			`  to   { translate: 0 calc(var(--depth) * ${parallax.values.strength}px); }`,
			`}`,
			``,
			`@supports (animation-timeline: view()) {`,
			`  @media (prefers-reduced-motion: no-preference) {`,
			`    .layer {`,
			`      animation: parallax linear both;`,
			`      animation-timeline: --scene;`,
			`      animation-range: ${parallax.values.range};`,
			`    }`,
			`  }`,
			`}`
		].join('\n')
	);

	let progressCss = $derived(
		[
			`.stage {`,
			`  /* lets a sibling of the scroller see its timeline */`,
			`  timeline-scope: --stage;`,
			`}`,
			``,
			`.scroller {`,
			`  overflow: hidden auto;`,
			`  scroll-timeline: --stage block;`,
			`}`,
			``,
			`@keyframes progress {`,
			`  from { scale: 0 1; }`,
			`  to { scale: 1 1; }`,
			`}`,
			``,
			`.progress {`,
			`  display: none;`,
			`  block-size: ${progress.values.thickness}px;`,
			`  background: ${progress.values.color};`,
			`  transform-origin: 0 50%;`,
			`}`,
			``,
			`@supports (animation-timeline: scroll()) {`,
			`  .progress {`,
			`    display: block;`,
			`    animation: progress linear both;`,
			`    animation-timeline: --stage;`,
			`  }`,
			`}`
		].join('\n')
	);
</script>

<svelte:head>
	<title>Scroll reveal · Visual FX</title>
	<meta
		name="description"
		content="Scroll-driven reveals, parallax layers and a progress bar with animation-timeline: view() and scroll(), no JavaScript on scroll, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Scroll reveal demo">
	{#snippet header()}
		<StageHeader title="Scroll reveal" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="frame">
			<ScrollProgress {...progress.values} timeline="--vfx-stage" class="progress" />
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="scroller" tabindex="0" aria-label="Scrollable demo">
				<section class="intro">
					<p class="eyebrow">Scroll inside this stage</p>
					<h2>Content that arrives as you scroll</h2>
					<p>
						Every card below is animated by its own position in this scroller. The bar at the top is
						the scroller's progress.
					</p>
					{#if supported === false}
						<p class="fallback" role="status">
							This browser doesn't support scroll-driven animations, so everything is shown as is:
							the fallback.
						</p>
					{/if}
					<span class="arrow" aria-hidden="true">↓</span>
				</section>

				<section class="block" aria-labelledby="sr-settings">
					<h3 id="sr-settings">With the panel's settings</h3>
					<div class="grid">
						{#each cards as card (card.title)}
							<ScrollReveal {...reveal.values} class="card">
								<p class="tag">{card.tag}</p>
								<h4>{card.title}</h4>
								<p>{card.text}</p>
							</ScrollReveal>
						{/each}
					</div>
				</section>

				<section class="block" aria-labelledby="sr-presets">
					<h3 id="sr-presets">Every preset, same timing</h3>
					<div class="presets">
						{#each REVEAL_PRESETS as preset (preset)}
							<ScrollReveal {...reveal.values} {preset} class="tile">
								<span class="swatch" aria-hidden="true"></span>
								<p class="tag">{preset}</p>
							</ScrollReveal>
						{/each}
					</div>
				</section>

				<ParallaxScene {...parallax.values} class="scene">
					<ParallaxLayer depth={0.9} aria-hidden="true">
						<div class="sky"><span class="sun"></span></div>
					</ParallaxLayer>
					<ParallaxLayer depth={0.6} aria-hidden="true">
						<svg class="ridge far" viewBox="0 0 1200 400" preserveAspectRatio="none">
							<path
								d="M0 260 L140 170 L260 230 L420 120 L560 210 L700 140 L860 230 L1000 150 L1200 220 V400 H0 Z"
							/>
						</svg>
					</ParallaxLayer>
					<ParallaxLayer depth={0.3} aria-hidden="true">
						<svg class="ridge mid" viewBox="0 0 1200 400" preserveAspectRatio="none">
							<path
								d="M0 300 C160 220 280 300 420 250 S700 190 860 270 S1080 230 1200 280 V400 H0 Z"
							/>
						</svg>
					</ParallaxLayer>
					<ParallaxLayer depth={0} aria-hidden="true">
						<svg class="ridge near" viewBox="0 0 1200 400" preserveAspectRatio="none">
							<path d="M0 340 C200 300 340 360 560 330 S940 300 1200 350 V400 H0 Z" />
						</svg>
					</ParallaxLayer>
					<ParallaxLayer depth={-0.25} fill={false} class="caption">
						<p class="eyebrow">Parallax</p>
						<h3>Five layers, one timeline</h3>
						<p>
							The scene's view timeline drives every layer; depth sets how far each one travels.
						</p>
					</ParallaxLayer>
				</ParallaxScene>

				<section class="outro">
					<ScrollReveal {...reveal.values} class="card end">
						<h3>That's the end</h3>
						<p>
							Scroll back up: unless the span is <em>visible</em> or <em>Hide on exit</em> is on, revealed
							cards stay revealed.
						</p>
						<a href="#how-it-works">How it works ↓</a>
					</ScrollReveal>
				</section>
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Scroll reveal" code={reveal.markup('ScrollReveal')} onreset={reset}>
			<ParamControls schema={scrollRevealSchema} bind:values={reveal.values} />
			<ParamControls schema={parallaxSchema} bind:values={parallax.values} />
			<ParamControls schema={scrollProgressSchema} bind:values={progress.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Animations that run on scroll instead of time"
			lede="A CSS animation normally advances with the clock. Give it a scroll or view timeline instead and its progress becomes a position: how far a container is scrolled, or where an element is on its way through the scrollport. The browser does the bookkeeping; no script listens to scroll."
		>
			<h3>1. A view timeline per element: view()</h3>
			<p>
				<code>animation-timeline: view()</code> replaces the document clock with an anonymous
				<em>view progress timeline</em>: the element's position relative to the scrollport of its
				nearest scroll container. Here that is the stage, not the page; the page layout keeps the
				stage fixed, so the stage itself is the scroller. The animation's duration becomes
				irrelevant, its keyframes are spread over the element's trip through the scrollport.
			</p>

			<h3>2. Which part of the trip: animation-range</h3>
			<p>
				A view timeline has named ranges. <code>entry</code> runs from the moment the element's
				leading edge enters the scrollport until it is fully inside (or fills it, if it is taller).
				<code>exit</code> is the same at the other end. <code>cover</code> spans the whole trip,
				from the first visible pixel to the last; <code>contain</code> only the part where the
				element is completely visible; <code>entry-crossing</code> the time its leading edge needs
				to cross the scrollport's end edge. Percentages trim a range:
				<code>entry 20% entry 80%</code> starts the reveal a little late and finishes it before the element
				is fully in.
			</p>
			<p>
				The <em>Span</em> setting picks a range for you. <code>center</code> (the default) runs from
				<code>entry 0%</code> to <code>cover 50%</code>: the reveal starts with the first visible
				pixel and finishes when the element's middle reaches the middle of the scrollport, so it
				plays over half a screen of scrolling and is easy to follow. <code>entry</code> is quicker:
				done the moment the element is fully in, often while it is still at the bottom edge.
				<code>visible</code> reveals on entry and hides again on exit; <code>custom</code> uses the range
				and percentages below it.
			</p>
			<p>
				A catch: <code>center</code>, <code>cover</code> and <code>contain</code> end after the element
				has fully entered. The last element in a scroller may never get there, because the scroller can't
				scroll it far enough. With those ranges, leave room after the last element; the stage here ends
				with padding for that reason.
			</p>

			<h3>3. Keyframes that start hidden</h3>
			<p>
				The keyframes start from the hidden state (shifted in from an edge and transparent, turned
				away in 3D, shrunk, clipped or blurred) and end on the element's normal styles. <code
					>animation-fill-mode: both</code
				>
				holds the first keyframe until the range starts and the last after it ends, so cards below the
				fold wait hidden and stay revealed when you scroll back. The presets animate
				<code>opacity</code>, <code>translate</code>, <code>scale</code>, <code>filter</code>,
				<code>clip-path</code> and <code>transform</code> from one set of custom properties, so a
				single <code>@keyframes</code> rule serves all of them. A clip reveal ends on
				<code>inset(0)</code> rather than <code>none</code>: the two can't be interpolated, so the
				animation would jump. A flip ends on the same <code>perspective()</code> it starts with, at 0°,
				for the same reason.
			</p>
			<p>
				A slide from the side moves the element past the scroller's edge while it runs, which widens
				the scrollable area and brings up a horizontal scrollbar. The scroller here has
				<code>overflow: hidden auto</code>; <code>clip</code> would be nicer, but next to
				<code>auto</code> it turns into <code>hidden</code> anyway.
			</p>
			<p>
				<em>Hide on exit</em> (always on for the <code>visible</code> span) adds the same keyframes
				a second time, reversed, on the
				<code>exit</code> range. That second animation fills only <code>forwards</code>: filling
				backwards as well would hold its first frame (fully visible) over the whole entry and
				override the reveal, since later animations in the list win.
			</p>
			<CodeSnippet code={codeCss} />

			<h3>4. Named timelines: parallax and the progress bar</h3>
			<p>
				A parallax layer can't use its own <code>view()</code>: it is oversized and it is the thing
				that moves. Instead the scene declares a named timeline,
				<code>view-timeline: --vfx-parallax block</code>, and every layer inside refers to it by
				name. Each layer then moves from <code>−depth × strength</code> to
				<code>+depth × strength</code> while the scene crosses the scrollport: positive depths move with
				the scroll and so lag behind it (far away), negative ones against it (in front), depth 0 not at
				all. Layers are oversized by their travel, so their edges never show.
			</p>
			<CodeSnippet code={parallaxCss} />
			<p>
				The progress bar uses a scroll progress timeline: how far the stage is scrolled, 0% at the
				top and 100% at the bottom. It sits above the scroller, not inside it, so
				<code>scroll(nearest)</code> wouldn't find the stage. The scroller names its timeline (<code
					>scroll-timeline: --vfx-stage block</code
				>) and a common ancestor declares
				<code>timeline-scope: --vfx-stage</code>, which makes the name visible to the scroller's
				siblings. The bar scales from <code>0 1</code> to <code>1 1</code>, a compositor-only
				property.
			</p>
			<CodeSnippet code={progressCss} />

			<h3>5. Fallback and motion</h3>
			<p>
				All animation rules sit inside <code>@supports (animation-timeline: view())</code> and
				<code>@media (prefers-reduced-motion: no-preference)</code>. Since the hidden state exists
				only as a keyframe, a browser that doesn't apply the animation shows the content as is: no
				IntersectionObserver fallback, nothing to hide first and reveal later. Reduced motion
				switches reveals and parallax off the same way. The progress bar stays, because it only
				moves as the reader scrolls, and is hidden only where it can't work. A
				<code>[data-motion="paused"]</code> region also switches the reveals off: pausing a scroll-driven
				animation would freeze it wherever it is, possibly invisible.
			</p>

			<h3>Browser support</h3>
			<p class="note">
				Scroll-driven animations are not Baseline: Chrome and Edge support them since 115 and Safari
				since 26, Firefox doesn't (per the web-features data, see the
				<a href="https://webstatus.dev/features/scroll-driven-animations">webstatus.dev entry</a>).
				In Firefox this page shows all content statically. Chrome 146 adds scroll-<em>triggered</em>
				animations (<code>animation-trigger</code>), which play a time-based animation once a scroll
				position is crossed; they are Chromium-only and not used here. Tested in Chromium 156 only;
				Safari, including its support for <code>timeline-scope</code> used by the progress bar, is untested.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					<strong>Transforms and opacity stay off the main thread.</strong> When a scroll-driven
					animation only touches <code>transform</code>, <code>translate</code>, <code>scale</code>
					or <code>opacity</code>, the compositor can run it in sync with scrolling, even while the
					main thread is busy. Fade-up, scale and parallax are of that kind.
				</li>
				<li>
					<strong>Blur and clip-path repaint.</strong> A <code>filter: blur()</code> has to be redrawn
					for every scroll step while it animates, and costs more the larger the blur and the element
					(an estimate, not measured here). Use the blur preset on a few elements, not a whole list.
				</li>
				<li>
					<strong>Nothing runs when nothing scrolls.</strong> There is no listener or observer; an idle
					page does no work.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.frame {
		position: relative;
		display: grid;
		min-block-size: 0;
		/* The progress bar is a sibling of the scroller; this makes the scroller's timeline visible to it. */
		timeline-scope: --vfx-stage;
		background:
			radial-gradient(circle at 30% 10%, oklch(26% 0.05 285), transparent 60%), oklch(11% 0.015 285);
		color: #f3f1fa;
	}

	.frame :global(.progress) {
		position: absolute;
		inset: 0 0 auto;
		z-index: 1;
	}

	.scroller {
		/* hidden, not clip: clip turns into hidden next to auto anyway. Stops sideways slides
		   from widening the scroller. */
		overflow: hidden auto;
		/* The progress bar shows the position; a second scrollbar next to the page's is noise.
		   Wheel, touch and keyboard (it is focusable) still scroll it. */
		scrollbar-width: none;
		scroll-timeline: --vfx-stage block;
		padding: 0 var(--space-6) 30dvh;
		padding-inline-end: calc(18rem + var(--space-8));
	}

	.scroller:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	.intro {
		display: grid;
		align-content: center;
		justify-items: start;
		gap: var(--space-3);
		min-block-size: 92dvh;
		max-inline-size: 40rem;
		margin-inline: auto;
	}

	.intro h2 {
		font-size: var(--text-2xl);
		line-height: 1.1;
	}

	.intro p:not(.eyebrow) {
		color: #c4bfd6;
	}

	.eyebrow,
	.tag {
		color: #d4c8ff;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}

	.fallback {
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid #a78bfa;
		border-radius: var(--radius-sm);
		background: oklch(30% 0.08 285);
		font-size: var(--text-sm);
	}

	.arrow {
		font-size: var(--text-xl);
		color: #d4c8ff;
	}

	.block {
		max-inline-size: 64rem;
		margin: 0 auto 30dvh;
	}

	.block h3 {
		margin-block-end: var(--space-4);
		font-size: var(--text-md);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(15rem, 100%), 1fr));
		gap: var(--space-4);
	}

	.scroller :global(.card) {
		padding: var(--space-6);
		border: 1px solid oklch(100% 0 0 / 0.14);
		border-radius: 16px;
		background: #15131f;
	}

	.scroller h4 {
		margin-block: var(--space-2);
		font-size: var(--text-md);
	}

	.scroller :global(.card p:not(.tag)) {
		color: #c4bfd6;
		font-size: var(--text-sm);
	}

	.presets {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(10rem, 100%), 1fr));
		gap: var(--space-4);
	}

	.scroller :global(.tile) {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-4);
		border-radius: 16px;
		background: #1d1a2b;
	}

	.swatch {
		block-size: 7rem;
		border-radius: 10px;
		background:
			radial-gradient(circle at 30% 30%, #f472b6, transparent 55%),
			linear-gradient(135deg, #a78bfa, #22d3ee);
	}

	/* Parallax scene */
	.scroller :global(.scene) {
		display: grid;
		place-items: center;
		block-size: min(80dvh, 40rem);
		max-inline-size: 64rem;
		margin: 0 auto 30dvh;
		border-radius: 20px;
	}

	.sky {
		position: relative;
		block-size: 100%;
		background: linear-gradient(oklch(28% 0.09 285), oklch(55% 0.15 340) 70%, oklch(72% 0.13 50));
	}

	.sun {
		position: absolute;
		inset-block-start: 38%;
		inset-inline-start: 62%;
		inline-size: 7rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, oklch(92% 0.1 80), oklch(80% 0.14 60) 60%, transparent 70%);
	}

	.ridge {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}

	.far {
		fill: oklch(42% 0.1 320);
	}

	.mid {
		fill: oklch(30% 0.08 300);
	}

	.near {
		fill: oklch(17% 0.04 290);
	}

	.scroller :global(.caption) {
		max-inline-size: 26rem;
		padding: var(--space-6);
		border-radius: 16px;
		background: oklch(12% 0.02 285 / 0.72);
		text-align: center;
	}

	.scroller :global(.caption h3) {
		margin-block: var(--space-2);
		font-size: var(--text-xl);
	}

	.scroller :global(.caption p:not(.eyebrow)) {
		color: #c4bfd6;
		font-size: var(--text-sm);
	}

	.outro {
		max-inline-size: 30rem;
		margin-inline: auto;
	}

	.outro h3 {
		margin-block-end: var(--space-2);
		font-size: var(--text-lg);
	}

	.outro a {
		color: #d4c8ff;
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
	}

	@media (width < 40rem) {
		.scroller {
			padding: 0 var(--space-4) 60dvh;
		}
	}
</style>
