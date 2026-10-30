<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import CircleReveal from '#lib/fx/view-transition/CircleReveal.svelte';
	import MorphScope from '#lib/fx/view-transition/MorphScope.svelte';
	import {
		supportsScopedViewTransitions,
		supportsViewTransitions
	} from '#lib/fx/view-transition/support.js';
	import {
		circleRevealSchema,
		easingValue,
		morphSchema,
		shuffled
	} from '#lib/fx/view-transition/view-transition.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const reveal = new ParamState(circleRevealSchema);
	const morph = new ParamState(morphSchema);

	function reset() {
		reveal.reset();
		morph.reset();
	}

	// Theme demo: the theme and accent of the demo box only, never the site's.
	const palettes = [
		{ name: 'Iris', hue: 290 },
		{ name: 'Lagoon', hue: 200 },
		{ name: 'Coral', hue: 25 },
		{ name: 'Moss', hue: 145 }
	];
	let theme = $state<'light' | 'dark'>('light');
	let hue = $state(290);

	// Morph demo
	interface Item {
		id: number;
		name: string;
		hue: number;
		text: string;
	}
	const items: Item[] = [
		{ id: 1, name: 'Iris', hue: 290, text: 'A violet that leans blue in daylight.' },
		{ id: 2, name: 'Lagoon', hue: 200, text: 'Shallow water over white sand.' },
		{ id: 3, name: 'Coral', hue: 25, text: 'Warm, a little loud, never dull.' },
		{ id: 4, name: 'Moss', hue: 145, text: 'The green of a north-facing stone.' },
		{ id: 5, name: 'Amber', hue: 75, text: 'Late sun through resin.' },
		{ id: 6, name: 'Plum', hue: 340, text: 'Dark, sweet, almost brown in the shade.' }
	];
	let order = $state(items);
	let layout = $state<'grid' | 'list'>('grid');
	let selected = $state<Item>();
	// Tile to return focus to after closing the detail view.
	let returnTo = $state<number>();

	function reshuffle() {
		let next = shuffled(order);
		while (next.every((item, i) => item === order[i])) next = shuffled(order);
		order = next;
	}

	let support = $state<'scoped' | 'document' | 'none'>();
	onMount(() => {
		support = supportsScopedViewTransitions()
			? 'scoped'
			: supportsViewTransitions()
				? 'document'
				: 'none';
	});

	const focus = (node: HTMLElement) => node.focus();

	let revealJs = $derived(
		[
			`async function toggleTheme(event) {`,
			`  const box = document.querySelector('.app');`,
			`  const update = () => {`,
			`    box.dataset.theme = box.dataset.theme === 'dark' ? 'light' : 'dark';`,
			`  };`,
			``,
			`  // no API, reduced motion: just switch`,
			`  if (!document.startViewTransition ||`,
			`      matchMedia('(prefers-reduced-motion: reduce)').matches) {`,
			`    return update();`,
			`  }`,
			``,
			`  // origin: the click, relative to the box (keyboard: center of the button)`,
			`  const r = box.getBoundingClientRect();`,
			...(reveal.values.origin === 'pointer'
				? [
						`  const t = event.currentTarget.getBoundingClientRect();`,
						`  const keyboard = event.detail === 0;`,
						`  const x = (keyboard ? t.left + t.width / 2 : event.clientX) - r.left;`,
						`  const y = (keyboard ? t.top + t.height / 2 : event.clientY) - r.top;`
					]
				: reveal.values.origin === 'center'
					? [`  const x = r.width / 2, y = r.height / 2;`]
					: [`  const x = 0, y = 0;`]),
			`  // radius: distance to the farthest corner`,
			`  const radius = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));`,
			``,
			...(reveal.values.scoped
				? [
						`  // element-scoped (Chrome 147+): the box is the group "root"`,
						`  const scoped = 'startViewTransition' in box;`,
						`  const root = scoped ? box : document.documentElement;`,
						`  const name = scoped ? 'root' : 'app';`,
						`  if (!scoped) box.style.viewTransitionName = name;`,
						`  const transition = scoped`,
						`    ? box.startViewTransition(update)`,
						`    : document.startViewTransition(update);`
					]
				: [
						`  const root = document.documentElement;`,
						`  const name = 'app';`,
						`  box.style.viewTransitionName = name;`,
						`  const transition = document.startViewTransition(update);`
					]),
			`  transition.finished.then(() => (box.style.viewTransitionName = ''));`,
			``,
			`  await transition.ready;`,
			`  root.animate(`,
			`    { clipPath: [`,
			`      \`circle(0px at \${x}px \${y}px)\`,`,
			`      \`circle(\${radius}px at \${x}px \${y}px)\``,
			`    ] },`,
			`    {`,
			`      duration: ${reveal.values.duration},`,
			`      easing: '${easingValue(reveal.values.easing)}',`,
			`      fill: 'both',`,
			`      pseudoElement: \`::view-transition-new(\${name})\``,
			`    }`,
			`  );`,
			`}`
		].join('\n')
	);

	const revealCss = [
		`.app {`,
		`  view-transition-class: reveal;`,
		`}`,
		``,
		`/* no cross-fade: the old state stays, the new one is uncovered */`,
		`::view-transition-old(*.reveal),`,
		`::view-transition-new(*.reveal) {`,
		`  animation: none;`,
		`  mix-blend-mode: normal;`,
		`}`
	].join('\n');

	let morphCss = $derived(
		[
			`.card {`,
			`  /* one unique name per item, set inline: view-transition-name: card-3 */`,
			`  view-transition-class: morph;`,
			`}`,
			``,
			`::view-transition-group(*.morph),`,
			`::view-transition-old(*.morph),`,
			`::view-transition-new(*.morph) {`,
			`  animation-duration: ${morph.values.duration}ms;`,
			`  animation-timing-function: ${easingValue(morph.values.easing)};`,
			`}`
		].join('\n')
	);

	const svelteCode = [
		`<script>`,
		`  import { flushSync } from 'svelte';`,
		``,
		`  let order = $state(items);`,
		``,
		`  function shuffle() {`,
		`    // the update has to change the DOM before the callback returns`,
		`    const update = () => flushSync(() => (order = shuffled(order)));`,
		`    if (!document.startViewTransition) update();`,
		`    else document.startViewTransition(update);`,
		`  }`,
		`</` + `script>`,
		``,
		`{#each order as item (item.id)}`,
		`  <div class="card" style:view-transition-name="card-{item.id}">…</div>`,
		`{/each}`
	].join('\n');
</script>

<svelte:head>
	<title>View transitions · Visual FX</title>
	<meta
		name="description"
		content="A circular theme reveal from the pointer and shared-element morphs with the View Transitions API, scoped to one element where the browser allows, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="View transitions demo">
	{#snippet header()}
		<StageHeader title="View transitions" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage">
			<CircleReveal {...reveal.values} data-theme={theme} style="--_hue: {hue}" class="app">
				{#snippet children({ reveal: run })}
					<div class="app-head">
						<span class="logo" aria-hidden="true"></span>
						<div>
							<p class="eyebrow">Circular reveal</p>
							<h2>Appearance</h2>
						</div>
						<button
							type="button"
							class="theme-toggle"
							aria-pressed={theme === 'dark'}
							onclick={(e) => run(() => (theme = theme === 'dark' ? 'light' : 'dark'), e)}
						>
							<span class="icon" aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
							Dark mode
						</button>
					</div>
					<p class="muted">
						Switch the theme or pick an accent: the new look grows out of the spot you clicked. Only
						this box changes; the rest of the site keeps its own theme.
					</p>
					<div class="palette" role="group" aria-label="Accent color">
						{#each palettes as p (p.hue)}
							<button
								type="button"
								class="swatch-button"
								style:--_h={p.hue}
								aria-pressed={hue === p.hue}
								onclick={(e) => run(() => (hue = p.hue), e)}
							>
								<span class="dot" aria-hidden="true"></span>
								{p.name}
							</button>
						{/each}
					</div>
					<div class="chart" aria-hidden="true">
						{#each [42, 70, 55, 88, 64, 95, 50] as h, i (i)}
							<span style:block-size="{h}%"></span>
						{/each}
					</div>
				{/snippet}
			</CircleReveal>

			<MorphScope {...morph.values} class="morph">
				{#snippet children({ morph: run, name })}
					<div class="toolbar">
						<p class="eyebrow">Shared-element morph</p>
						{#if !selected}
							<div class="actions">
								<button type="button" onclick={() => run(reshuffle)}>Shuffle</button>
								<button
									type="button"
									onclick={() =>
										run(() => (order = [...order].sort((a, b) => a.name.localeCompare(b.name))))}
								>
									Sort
								</button>
								<button
									type="button"
									aria-pressed={layout === 'list'}
									onclick={() => run(() => (layout = layout === 'grid' ? 'list' : 'grid'))}
								>
									List
								</button>
							</div>
						{/if}
					</div>

					{#if selected}
						{@const item = selected}
						<article
							class="detail"
							style:--_h={item.hue}
							style:view-transition-name={name('card', item.id)}
							style:view-transition-class="vfx-morph"
						>
							<div
								class="swatch"
								style:view-transition-name={name('swatch', item.id)}
								style:view-transition-class="vfx-morph"
							></div>
							<h3
								style:view-transition-name={name('title', item.id)}
								style:view-transition-class="vfx-morph"
							>
								{item.name}
							</h3>
							<p>{item.text}</p>
							<button
								type="button"
								{@attach focus}
								onclick={() =>
									run(() => {
										returnTo = item.id;
										selected = undefined;
									})}
							>
								← Back
							</button>
						</article>
					{:else}
						<ul class={['tiles', layout]}>
							{#each order as item (item.id)}
								<li
									style:--_h={item.hue}
									style:view-transition-name={name('card', item.id)}
									style:view-transition-class="vfx-morph"
								>
									<button
										type="button"
										class="tile"
										{@attach (node) => {
											if (item.id === returnTo) node.focus();
										}}
										onclick={() => run(() => (selected = item))}
									>
										<span
											class="swatch"
											style:view-transition-name={name('swatch', item.id)}
											style:view-transition-class="vfx-morph"
										></span>
										<span
											class="name"
											style:view-transition-name={name('title', item.id)}
											style:view-transition-class="vfx-morph">{item.name}</span
										>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/snippet}
			</MorphScope>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="View transitions" code={reveal.markup('CircleReveal')} onreset={reset}>
			{#if support}
				<p class="support" role="status">
					{#if support === 'scoped'}
						This browser supports element-scoped view transitions.
					{:else if support === 'document'}
						No element-scoped view transitions here: the demos use document-wide ones.
					{:else}
						No View Transitions API here: changes apply instantly.
					{/if}
				</p>
			{/if}
			<ParamControls schema={circleRevealSchema} bind:values={reveal.values} />
			<ParamControls schema={morphSchema} bind:values={morph.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Snapshots, swapped and animated"
			lede="The View Transitions API takes a picture of the page, lets you change the DOM in one go, takes another picture and animates between the two. What makes it useful is that both pictures are pseudo-elements you can style and animate like anything else."
		>
			<h3>The idea</h3>
			<p>
				<code>document.startViewTransition(update)</code> captures the current rendering, calls
				<code>update</code>, waits for the DOM change (a returned promise is awaited), captures the
				new rendering and builds a tree of pseudo-elements on top of the page:
				<code>::view-transition-group(name)</code> per captured element, holding an
				<code>::view-transition-old(name)</code> image and a live
				<code>::view-transition-new(name)</code> one. By default the group moves and resizes from the
				old box to the new one while the old image fades out and the new one fades in. The real DOM already
				has its new state underneath; the pseudo-elements just cover it until the animation ends.
			</p>
			<p>
				Which elements get their own group is up to <code>view-transition-name</code>. Everything
				without one is part of the group <code>root</code>, which is the whole document.
			</p>

			<h3>1. The circular reveal</h3>
			<p>
				The demo box gets a name, so it is captured separately from the page. Its old and new images
				lose their default fade (<code>animation: none</code>), so the old state stays fully
				visible. Once <code>transition.ready</code> resolves, the pseudo-elements exist and the Web
				Animations API can target one of them through <code>pseudoElement</code>: the new image gets
				a <code>clip-path: circle()</code> that grows from the click point. The end radius is the
				distance from that point to the farthest corner of the box, so the circle covers it exactly
				when the animation ends. A keyboard activation has no pointer position (the click event's
				<code>detail</code> is 0), so the circle starts at the center of the button.
			</p>
			<p>
				The theme itself is scoped too: the box carries <code>data-theme</code> and the library's
				tokens use <code>light-dark()</code>, which resolves against the nearest
				<code>color-scheme</code>. The accent buttons change a hue custom property on the box, and
				the same reveal applies to them.
			</p>
			<CodeSnippet code={revealCss} />
			<CodeSnippet code={revealJs} />

			<h3>2. Keeping it in the box: element-scoped transitions</h3>
			<p>
				A document transition covers the whole page with its pseudo-element tree: while it runs,
				nothing can be clicked, and a named element is painted above everything else, including the
				control panel floating over the stage. Chrome 147 added
				<code>element.startViewTransition()</code>: the tree hangs off that element, only its
				subtree is captured, and the rest of the page stays live. The element becomes the group
				<code>root</code> of its own transition. Both demos use it where available and fall back to
				a document transition otherwise (switch <em>Element-scoped</em> off to compare); for the
				fallback the reveal box gets a temporary <code>view-transition-name</code> that is removed when
				the transition finishes, so it doesn't permanently create a stacking context.
			</p>

			<h3>3. Shared-element morphs</h3>
			<p>
				In the color list every tile, its swatch and its title have a name of their own, unique per
				item (a <code>view-transition-name</code> has to be unique among rendered elements, or the transition
				is skipped). After a shuffle or a layout switch, the browser finds the same names in new places
				and animates each group from its old box to its new one. Opening a color does the same across
				views: the detail panel, its swatch and its title use the tile's names, so the tile grows into
				the panel. Only one of the two views is rendered at a time; if both carried the names at once,
				they would collide.
			</p>
			<p>
				All of them share a <code>view-transition-class</code>, so one rule styles every group
				without knowing the names. Duration and easing come from custom properties set on the
				transition's root element while it runs; the pseudo-elements inherit from there.
			</p>
			<CodeSnippet code={morphCss} />

			<h3>4. Svelte: change the DOM before the callback returns</h3>
			<p>
				Svelte batches DOM updates and applies them in a microtask, after the update callback has
				returned. The browser would then capture the "new" state before anything changed. Wrapping
				the state change in <code>flushSync</code> applies it synchronously, inside the callback.
			</p>
			<CodeSnippet code={svelteCode} />

			<h3>5. Fallback and motion</h3>
			<p>
				Without <code>startViewTransition</code> the update runs directly: same result, no
				animation. The same happens under <code>prefers-reduced-motion: reduce</code> and inside a
				<code>[data-motion="paused"]</code> region; a sliding or growing snapshot is exactly the kind
				of motion those settings ask to avoid, and the state change itself needs no animation to be understood.
				Focus is handled in the update: opening a color focuses the back button, closing it returns focus
				to the tile.
			</p>

			<h3>Browser support</h3>
			<p class="note">
				Same-document view transitions are Baseline (newly available) since October 2025, as is
				<code>view-transition-class</code> (per web-features; see
				<a href="https://webstatus.dev/features/view-transitions">view transitions</a> and
				<a href="https://webstatus.dev/features/view-transition-class">view-transition-class</a> on
				webstatus.dev). Element-scoped transitions are Chrome 147+ only (<a
					href="https://webstatus.dev/features/view-transitions-element-scoped">webstatus.dev</a
				>). Cross-document transitions between pages are a separate feature and not used here.
				Tested in Chromium 156 only; Firefox and Safari, which take the document-wide path, are
				untested. A browser that has the API but not <code>view-transition-class</code> would ignore the
				class rules and fall back to the default cross-fade.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					<strong>Snapshots cost memory, not much time.</strong> Every named element is rendered into
					an image of its size; a few dozen tiles are fine, thousands of named list items are not.
				</li>
				<li>
					<strong>The animations are cheap.</strong> Groups animate <code>transform</code> and size,
					the images <code>opacity</code>, the reveal <code>clip-path</code> on one layer. All of it runs
					on already rendered images.
				</li>
				<li>
					<strong>Rendering is paused during the capture.</strong> Between the start and the first frame
					of the animation the page doesn't paint; a slow update callback shows up as a freeze, so keep
					the update itself short.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr));
		/* Top-aligned: the morph box changes height, and centering would move the other demo too. */
		align-content: start;
		align-items: start;
		gap: var(--space-8);
		padding: max(var(--space-16), 18dvh) var(--space-6) var(--space-16);
		padding-inline-end: calc(18rem + var(--space-8));
		overflow-y: auto;
		background:
			radial-gradient(circle at 30% 20%, oklch(26% 0.05 285), transparent 60%), oklch(11% 0.015 285);
		color: #f3f1fa;
	}

	.eyebrow {
		color: var(--_eyebrow, #d4c8ff);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}

	/* Theme demo: everything inside follows the box's own data-theme and hue. */
	.stage :global(.app) {
		--_accent: light-dark(oklch(50% 0.19 var(--_hue)), oklch(78% 0.13 var(--_hue)));
		--_accent-soft: light-dark(oklch(93% 0.04 var(--_hue)), oklch(32% 0.07 var(--_hue)));
		--_eyebrow: var(--_accent);

		display: grid;
		gap: var(--space-4);
		padding: var(--space-6);
		border: 1px solid var(--color-border);
		border-radius: 20px;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 20px 50px oklch(0% 0 0 / 0.35);
	}

	.app-head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}

	.app-head > div {
		flex: 1;
		min-inline-size: 8rem;
	}

	.app-head h2 {
		font-size: var(--text-xl);
	}

	.logo {
		inline-size: 2.5rem;
		aspect-ratio: 1;
		border-radius: 12px;
		background: linear-gradient(135deg, var(--_accent), var(--_accent-soft));
	}

	.muted {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.stage button {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		min-block-size: 2.25rem;
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: 999px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.stage button:focus-visible {
		outline: 2px solid var(--_accent, #a78bfa);
		outline-offset: 2px;
	}

	.theme-toggle[aria-pressed='true'],
	.swatch-button[aria-pressed='true'] {
		border-color: var(--_accent);
		background: var(--_accent-soft);
	}

	.icon {
		font-size: var(--text-md);
	}

	.palette {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.dot {
		inline-size: 0.9rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: light-dark(oklch(50% 0.19 var(--_h)), oklch(78% 0.13 var(--_h)));
	}

	.chart {
		display: flex;
		gap: var(--space-2);
		align-items: end;
		block-size: 7rem;
		padding: var(--space-3);
		border-radius: 12px;
		background: var(--color-surface-sunken);
	}

	.chart span {
		flex: 1;
		border-radius: 4px 4px 0 0;
		background: var(--_accent);
	}

	/* Morph demo */
	.stage :global(.morph) {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-6);
		border: 1px solid oklch(100% 0 0 / 0.14);
		border-radius: 20px;
		background: #15131f;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		min-block-size: 2.25rem;
	}

	.actions {
		display: flex;
		gap: var(--space-2);
	}

	.actions button[aria-pressed='true'] {
		border-color: #a78bfa;
		background: oklch(30% 0.08 285);
	}

	.tiles {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tiles.grid {
		grid-template-columns: repeat(3, 1fr);
	}

	.stage .tile {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		inline-size: 100%;
		padding: var(--space-2);
		border: 0;
		border-radius: 14px;
		background: #1d1a2b;
	}

	.tiles.list .tile {
		grid-template-columns: auto 1fr;
		align-items: center;
	}

	.swatch {
		display: block;
		inline-size: 100%;
		aspect-ratio: 4 / 3;
		border-radius: 10px;
		background:
			radial-gradient(circle at 30% 25%, oklch(85% 0.12 var(--_h)), transparent 60%),
			oklch(60% 0.17 var(--_h));
	}

	.tiles.list .swatch {
		inline-size: 3rem;
		aspect-ratio: 1;
	}

	.name {
		padding-inline: var(--space-1);
		font-weight: var(--weight-semibold);
	}

	.detail {
		display: grid;
		gap: var(--space-3);
		justify-items: start;
		padding: var(--space-3);
		border-radius: 14px;
		background: #1d1a2b;
	}

	.detail .swatch {
		aspect-ratio: 16 / 9;
	}

	.detail h3 {
		font-size: var(--text-xl);
	}

	.detail p {
		color: #c4bfd6;
	}

	.support {
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
