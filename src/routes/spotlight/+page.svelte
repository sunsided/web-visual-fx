<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import SpotlightCard from '#lib/fx/spotlight/SpotlightCard.svelte';
	import SpotlightGrid from '#lib/fx/spotlight/SpotlightGrid.svelte';
	import {
		glowGradient,
		maxSurfaceAlpha,
		safeSurfaceAlpha,
		spotlightSchema
	} from '#lib/fx/spotlight/spotlight.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const spotlight = new ParamState(spotlightSchema);
	const uid = $props.id();

	// Every card explains one technique of this page and links to that part of the article.
	const features = [
		{
			id: 'listener',
			tag: 'Pointer events',
			title: 'One listener for the grid',
			text: 'A single pointermove handler on the grid, throttled to one write per frame.'
		},
		{
			id: 'properties',
			tag: 'Custom properties',
			title: 'Two numbers drive everything',
			text: 'The pointer position becomes two custom properties on the grid, inherited by every card.'
		},
		{
			id: 'offsets',
			tag: 'ResizeObserver',
			title: 'Measured once, not per move',
			text: 'Each card knows its own offset in the grid and subtracts it in calc().'
		},
		{
			id: 'gradient',
			tag: 'radial-gradient',
			title: 'The light itself',
			text: 'One gradient, positioned in each card’s own coordinates, so it spans the gaps seamlessly.'
		},
		{
			id: 'ring',
			tag: 'mask-composite',
			title: 'Glow only in the border',
			text: 'Two masks, combined with exclude, cut the gradient down to a ring.'
		},
		{
			id: 'keyboard',
			tag: ':focus-visible',
			title: 'Works without a pointer',
			text: 'Tab through the cards: the focused one lights up from its center.'
		}
	];

	let v = $derived(spotlight.values);
	let surface = $derived(safeSurfaceAlpha(v.surfaceIntensity, v));
	let surfaceLimit = $derived(maxSurfaceAlpha(v.twoTone ? [v.color, v.colorB] : [v.color]));

	// Mirrors SpotlightGrid + SpotlightCard (same property names), filled in with the current settings.
	let cssCode = $derived(
		[
			`.grid {`,
			`  display: grid;`,
			`  grid-template-columns: repeat(auto-fill, minmax(min(15rem, 100%), 1fr));`,
			`  gap: ${v.gap}px;`,
			`}`,
			``,
			`.card {`,
			`  /* the light in this card's coordinates */`,
			`  --x: calc(var(--spotlight-x) - var(--spotlight-card-x));`,
			`  --y: calc(var(--spotlight-y) - var(--spotlight-card-y));`,
			`  --on: var(--spotlight-on, 0);`,
			`  position: relative;`,
			`  isolation: isolate;`,
			`  border: ${v.borderWidth}px solid rgb(255 255 255 / 0.14);`,
			`  border-radius: ${v.radius}px;`,
			`  background: #15131f;`,
			`}`,
			``,
			`.card:focus-visible,`,
			`.card:has(:focus-visible) {`,
			`  --x: 50%;`,
			`  --y: 50%;`,
			`  --on: 1;`,
			`}`,
			``,
			`.card::before,`,
			`.card::after {`,
			`  content: '';`,
			`  position: absolute;`,
			`  inset: -${v.borderWidth}px; /* the border box */`,
			`  border-radius: inherit;`,
			`  background: ${glowGradient(v, 'var(--x)', 'var(--y)')};`,
			`  pointer-events: none;`,
			`  transition: opacity 0.4s;`,
			`}`,
			``,
			`/* border ring */`,
			`.card::before {`,
			`  padding: ${v.borderWidth}px;`,
			`  mask: linear-gradient(#000 0 0) content-box exclude,`,
			`        linear-gradient(#000 0 0);`,
			`  opacity: calc(var(--on) * ${v.borderIntensity});`,
			`}`,
			``,
			`/* face, behind the content */`,
			`.card::after {`,
			`  z-index: -1;`,
			`  opacity: calc(var(--on) * ${surface});`,
			`}`
		].join('\n')
	);

	const jsCode = [
		`const grid = document.querySelector('.grid');`,
		`let pending, raf = 0;`,
		``,
		`// once per layout change, not per pointer move`,
		`function measure() {`,
		`  const g = grid.getBoundingClientRect();`,
		`  for (const card of grid.querySelectorAll('.card')) {`,
		`    const r = card.getBoundingClientRect();`,
		`    card.style.setProperty('--spotlight-card-x', \`\${r.left - g.left}px\`);`,
		`    card.style.setProperty('--spotlight-card-y', \`\${r.top - g.top}px\`);`,
		`  }`,
		`}`,
		`const resize = new ResizeObserver(measure);`,
		`resize.observe(grid);`,
		`for (const card of grid.querySelectorAll('.card')) resize.observe(card);`,
		``,
		`function move(e) {`,
		`  pending = e;`,
		`  grid.style.setProperty('--spotlight-on', 1);`,
		`  raf ||= requestAnimationFrame(() => {`,
		`    raf = 0;`,
		`    const g = grid.getBoundingClientRect();`,
		`    grid.style.setProperty('--spotlight-x', \`\${pending.clientX - g.left}px\`);`,
		`    grid.style.setProperty('--spotlight-y', \`\${pending.clientY - g.top}px\`);`,
		`  });`,
		`}`,
		`const off = () => grid.style.setProperty('--spotlight-on', 0);`,
		``,
		`// re-measure on entry: cheap insurance against reflows nobody announced`,
		`grid.addEventListener('pointerenter', (e) => { measure(); move(e); });`,
		`grid.addEventListener('pointermove', move);`,
		`grid.addEventListener('pointerleave', off);`,
		`grid.addEventListener('pointercancel', off);`
	].join('\n');
</script>

<svelte:head>
	<title>Spotlight cards · Visual FX</title>
	<meta
		name="description"
		content="A grid of cards lit by one pointer-following glow in their borders, with mask-composite and custom properties, and an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Spotlight cards demo">
	{#snippet header()}
		<StageHeader title="Spotlight cards" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage">
			<SpotlightGrid {...spotlight.values} class="demo">
				{#each features as feature (feature.id)}
					<SpotlightCard
						href="#{feature.id}"
						aria-labelledby="{uid}-{feature.id}-title"
						aria-describedby="{uid}-{feature.id}-text"
					>
						<p class="tag">{feature.tag}</p>
						<h2 id="{uid}-{feature.id}-title">{feature.title}</h2>
						<p id="{uid}-{feature.id}-text">{feature.text}</p>
						<span class="more" aria-hidden="true">How it works ↓</span>
					</SpotlightCard>
				{/each}
			</SpotlightGrid>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel
			title="Spotlight cards"
			code={spotlight.markup('SpotlightGrid')}
			onreset={spotlight.reset}
		>
			{#if surface < v.surfaceIntensity}
				<p class="safety-note" role="status">
					Surface glow capped at {surfaceLimit}: with these colors, a stronger glow would lower the
					contrast of the card text below 4.5:1.
				</p>
			{/if}
			<ParamControls schema={spotlightSchema} bind:values={spotlight.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="One light, many cards"
			lede="It looks like a single spotlight shining through a cut-out grid. In fact every card paints its own gradient, and they all agree on where the light is because they share two custom properties."
		>
			<h3>The idea</h3>
			<p>
				Each card has two pseudo-elements with the same <code>radial-gradient</code> as background: one
				masked down to a thin ring that sits exactly on the border, one behind the content at low opacity.
				If every card centers that gradient on the same point of the page, the light flows across gaps
				and from card to card as if it were one. The work is in getting that shared point into every card
				cheaply.
			</p>

			<h3 id="listener">1. One pointer listener for the whole grid</h3>
			<p>
				Instead of a listener per card, the grid has a single <code>pointermove</code> handler. It
				remembers the latest event and, at most once per frame (<code>requestAnimationFrame</code>),
				writes the pointer position relative to the grid's top left corner. Pointer events cover
				mouse, pen and touch. On touch, a tap or press lights up the spot under your finger; once a
				drag turns into a page scroll, the browser takes the pointer over (<code>pointercancel</code
				>) and the light fades out. That keeps the page scrollable over the grid; the price is that
				the light doesn't follow a swiping finger. <code>pointerleave</code> turns it off as well.
			</p>

			<h3 id="properties">2. Two custom properties, inherited by every card</h3>
			<p>
				The handler writes <code>--spotlight-x</code> and <code>--spotlight-y</code> (in px) on the
				grid element. Custom properties inherit, so every card can read them without any JavaScript
				touching the cards. A third property, <code>--spotlight-on</code>, is 1 while the pointer is
				over the grid and drives the opacity of the glow (with a short fade).
			</p>

			<h3 id="offsets">3. Per-card coordinates, measured once</h3>
			<p>
				A gradient's position is relative to the box it paints, so each card needs the pointer in
				<em>its own</em> coordinates. Two ways to get there:
			</p>
			<dl>
				<dt>Write per card</dt>
				<dd>
					On every move, loop over the cards, measure each one and set local coordinates. Simple,
					but the work grows with the number of cards.
				</dd>
				<dt>Fixed attachment</dt>
				<dd>
					Give every card <code>background-attachment: fixed</code> with a gradient in viewport coordinates;
					then a single viewport-relative position works for all. Elegant, but fixed backgrounds are ignored
					on iOS Safari, break inside transformed ancestors, and don't apply to masked pseudo-elements
					reliably.
				</dd>
			</dl>
			<p>
				This page uses a third, mixed approach. Each card's offset inside the grid is written to the
				card as <code>--spotlight-card-x/y</code> only when the layout changes: on load, when a
				<code>ResizeObserver</code> reports a size change of the grid or a card, when a
				<code>MutationObserver</code> sees cards added or removed (which are then observed too),
				when the gap changes, and when the pointer enters the grid (cheap insurance against reflows
				nobody announced). The card then computes its local position in CSS:
				<code>calc(var(--spotlight-x) - var(--spotlight-card-x))</code>. A pointer move writes two
				properties, whatever the number of cards.
			</p>
			<p>
				The vanilla version below uses the same property names as the component; it leaves out the
				<code>MutationObserver</code> for cards added later.
			</p>
			<CodeSnippet code={jsCode} />

			<h3 id="gradient">4. The light: radial-gradient</h3>
			<p>
				<code
					>radial-gradient(<var>radius</var> circle at var(--x) var(--y), color, second color 45%, transparent)</code
				>
				draws a circle of light around the pointer. Because <code>--x</code> can be far outside the
				card (or negative), only the matching slice of the circle shows up in each card. With
				<em>Two-tone</em> the color changes from the center outwards, which reads as a hot core and a
				colored halo; without it, the color fades out on its own.
			</p>

			<h3 id="ring">5. The border ring: mask-composite: exclude</h3>
			<p>
				The <code>::before</code> pseudo-element covers the card's border box and gets
				<code>padding</code> equal to the border width. Its <code>mask</code> has two layers: one
				covering the whole box and one restricted to the <code>content-box</code>, combined with
				<code>exclude</code> (keep what only one of them covers). What survives is the padding, a
				ring that follows the <code>border-radius</code> exactly. The same technique draws the rim
				on the
				<a href={resolve('/glass')}>frosted glass</a>. Underneath, the card's real border stays
				visible as a dim outline, which is also the resting state without a pointer.
			</p>
			<p>
				The <code>::after</code> pseudo-element paints the same gradient over the whole face at low
				opacity, with <code>z-index: -1</code> inside the card (which has
				<code>isolation: isolate</code>), so it sits above the card background and below the text.
			</p>
			<CodeSnippet code={cssCode} />

			<h3 id="keyboard">6. Keyboard focus and contrast</h3>
			<p>
				The cards are links. <code>:focus-visible</code> (and <code>:has(:focus-visible)</code> for
				cards that only contain a link) overrides the card's local position with
				<code>50% 50%</code> and switches its glow on, so keyboard users see the effect on the card they
				are on, plus the regular focus outline.
			</p>
			<p>
				Colored light behind text eats contrast. The face glow is strongest at its color stops: the
				first color at the center and, with <em>Two-tone</em>, the second at 45% of the radius. With
				the default colors, the cyan ring is actually brighter than the violet center. At each stop
				it is simply that color at the chosen opacity on top of the dark card, so the grid computes
				that mixture for every color and caps the opacity at the highest value where the dimmest
				text (the descriptions) still has 4.5:1. For the default colors that cap is far above the
				default; bright colors like white or yellow lower it, and the panel tells you when it kicks
				in.
			</p>

			<h3>Browser support and cost</h3>
			<p class="note">
				Custom properties, <code>radial-gradient</code>, <code>mask-composite</code> via the
				<code>mask</code> shorthand and <code>:focus-visible</code> work in all current browsers;
				<code>:has()</code> is newer (Firefox 121, Safari 15.4) and only matters for cards that
				contain a link instead of being one. <code>@property</code> registers
				<code>--spotlight-x/y</code> as lengths so they can be animated; without it the glow still works.
				Tested in Chromium only; Firefox and Safari weren't checked.
			</p>
			<p>
				Cost: each move repaints every card's two pseudo-elements, since their gradient position
				changed. That's a cheap gradient fill per card, fine for dozens of cards. For very large
				grids, limit the effect to cards near the pointer, for example by only giving visible cards
				the pseudo-elements.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		display: grid;
		align-content: center;
		grid-template-columns: minmax(0, 1fr);
		padding: var(--space-16) var(--space-6);
		padding-inline-end: calc(18rem + var(--space-8));
		overflow-y: auto;
		background:
			radial-gradient(circle at 30% 20%, oklch(26% 0.05 285), transparent 60%), oklch(11% 0.015 285);
	}

	.stage :global(.demo) {
		inline-size: 100%;
		max-inline-size: 64rem;
		margin-inline: auto;
	}

	.stage .tag {
		color: #d4c8ff;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}

	.stage h2 {
		margin-block: var(--space-2);
		font-size: var(--text-md);
	}

	.stage p:not(.tag) {
		color: #c4bfd6;
		font-size: var(--text-sm);
	}

	.more {
		display: inline-block;
		margin-block-start: var(--space-3);
		color: #d4c8ff;
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
	}

	.safety-note {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	@media (width < 40rem) {
		.stage {
			align-content: start;
			padding: var(--space-16) var(--space-4) 60dvh;
		}
	}
</style>
