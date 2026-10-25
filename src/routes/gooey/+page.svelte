<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import GooeyField from '#lib/fx/gooey/GooeyField.svelte';
	import GooeyMenu from '#lib/fx/gooey/GooeyMenu.svelte';
	import {
		blurReach,
		clampOffset,
		filterRegion,
		gooeyMenuSchema,
		gooeySchema,
		gooMatrix,
		thresholdBand,
		type MenuItem
	} from '#lib/fx/gooey/gooey.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		background: { kind: 'color', label: 'Background', default: '#140f24', group: 'Stage' }
	});

	const gooey = new ParamState(gooeySchema);
	const menu = new ParamState(gooeyMenuSchema);
	const backdrop = new ParamState(stageSchema);

	function reset() {
		gooey.reset();
		menu.reset();
		backdrop.reset();
	}

	let paused = $state(false);

	// --- The steerable blob -------------------------------------------------------------------
	// Offsets in px from the center of the field. `rest` is where the blob sits without a pointer
	// (moved with the arrow keys); `pointer` overrides it while a pointer is over the field.
	const rest = $state({ x: 0, y: 0 });
	let pointer = $state<{ x: number; y: number }>();
	let blob = $derived(pointer ?? rest);

	let fieldEl = $state<HTMLElement>();
	let frame = 0;
	let latest: PointerEvent | undefined;

	function offsetOf(clientX: number, clientY: number) {
		const r = fieldEl!.getBoundingClientRect();
		return {
			x: clampOffset(clientX - (r.left + r.width / 2), r.width / 2),
			y: clampOffset(clientY - (r.top + r.height / 2), r.height / 2)
		};
	}

	// pointermove can fire far more often than the screen refreshes; apply at most once per frame.
	function follow(e: PointerEvent) {
		latest = e;
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (latest) pointer = offsetOf(latest.clientX, latest.clientY);
		});
	}

	function unfollow() {
		cancelAnimationFrame(frame);
		frame = 0;
		latest = undefined;
		pointer = undefined;
	}

	// Dropped blobs stay where they were put and melt with everything that passes by.
	const MAX_DROPS = 20;
	let drops = $state<{ id: number; x: number; y: number }[]>([]);
	let nextDrop = 0;

	let announcement = $state('');
	let announceTimer: ReturnType<typeof setTimeout> | undefined;

	function announce(text: string, delay = 0) {
		clearTimeout(announceTimer);
		announceTimer = setTimeout(() => (announcement = text), delay);
	}

	function drop(at: { x: number; y: number }) {
		const capped = drops.length === MAX_DROPS;
		drops = [...drops, { id: nextDrop++, ...at }].slice(-MAX_DROPS);
		announce(
			capped
				? `Blob dropped, the oldest one removed. ${MAX_DROPS} on the field, the most there can be.`
				: `Blob dropped. ${drops.length} on the field.`
		);
	}

	// Stays enabled even with nothing to clear: disabling the focused button would drop focus.
	function clearDrops() {
		announce(drops.length ? 'Dropped blobs removed.' : 'Nothing to clear.');
		drops = [];
	}

	// Single-pointer alternative to steering: click (or tap) the field to drop a blob there.
	function dropAtPointer(e: MouseEvent) {
		if ((e.target as Element).closest('button')) return;
		drop(offsetOf(e.clientX, e.clientY));
	}

	function describe({ x, y }: { x: number; y: number }) {
		if (x === 0 && y === 0) return 'Blob centered.';
		const parts = [];
		if (x) parts.push(`${Math.abs(Math.round(x))} pixels ${x > 0 ? 'right' : 'left'}`);
		if (y) parts.push(`${Math.abs(Math.round(y))} pixels ${y > 0 ? 'down' : 'up'}`);
		return `Blob ${parts.join(' and ')} of center.`;
	}

	function moveWithKeys(e: KeyboardEvent) {
		const step = e.shiftKey ? 50 : 10;
		const delta: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step]
		};
		const d = delta[e.key];
		if (!d || !fieldEl) return;
		e.preventDefault();
		unfollow(); // keyboard takes over from a pointer resting on the field
		const r = fieldEl.getBoundingClientRect();
		rest.x = clampOffset(rest.x + d[0], r.width / 2);
		rest.y = clampOffset(rest.y + d[1], r.height / 2);
		announce(describe(rest), 500);
	}

	function center() {
		unfollow();
		rest.x = 0;
		rest.y = 0;
		announce(describe(rest));
	}

	const hintId = $props.id();

	$effect(() => () => {
		cancelAnimationFrame(frame);
		clearTimeout(announceTimer);
	});

	// --- Menu demo -----------------------------------------------------------------------------
	const items: MenuItem[] = [
		{ label: 'Share', icon: '↗' },
		{ label: 'Edit', icon: '✎' },
		{ label: 'Favorite', icon: '★' }
	];
	let menuOpen = $state(false);
	let menuStatus = $state('');

	// --- Explainer ----------------------------------------------------------------------------
	let band = $derived(thresholdBand(gooey.values.sharpness, gooey.values.offset));
	// k·1 − b < 1: even a fully opaque pixel doesn't come out opaque.
	let translucent = $derived(gooey.values.sharpness - gooey.values.offset < 1);
	let vanished = $derived(band.from >= 1);

	const fmt = (n: number) => String(+n.toFixed(3));

	let filterCode = $derived.by(() => {
		const v = gooey.values;
		const r = filterRegion(v.region);
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="goo" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"`,
			`          color-interpolation-filters="sRGB">`,
			`    <feGaussianBlur in="SourceGraphic" stdDeviation="${v.blur}" result="blur" />`,
			`    <feColorMatrix in="blur" type="matrix" result="goo" values="`,
			...gooMatrix(v.sharpness, v.offset)
				.split('  ')
				.map((row) => `      ${row}`),
			`    " />`,
			...(v.keepColors ? [`    <feComposite in="SourceGraphic" in2="goo" operator="atop" />`] : []),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	let cssCode = $derived(
		[
			`.goo {`,
			`  filter: url(#goo);`,
			`}`,
			``,
			`.goo > .blob {`,
			`  position: absolute;`,
			`  inline-size: ${gooey.values.size}px;`,
			`  aspect-ratio: 1;`,
			`  border-radius: 50%;`,
			`  background: ${gooey.values.colorA};`,
			`}`
		].join('\n')
	);

	let menuCode = $derived.by(() => {
		const { blur, sharpness, offset, region } = gooey.values;
		const markup = menu.markup('GooeyMenu');
		const goo = [
			blur !== gooeySchema.blur.default ? `blur={${blur}}` : '',
			sharpness !== gooeySchema.sharpness.default ? `sharpness={${sharpness}}` : '',
			offset !== gooeySchema.offset.default ? `offset={${offset}}` : '',
			region !== gooeySchema.region.default ? `region={${region}}` : ''
		].filter(Boolean);
		return markup.replace(
			'<GooeyMenu',
			['<GooeyMenu {items} label="Quick actions"', ...goo].join(' ')
		);
	});
</script>

<svelte:head>
	<title>Gooey · Visual FX</title>
	<meta
		name="description"
		content="Metaball-style gooey shapes from an SVG blur and an alpha threshold, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Gooey demo">
	{#snippet header()}
		<StageHeader title="Gooey" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="motion" data-motion={paused ? 'paused' : 'running'}>
			<!-- Pointer convenience only; keyboard users steer with the Move button and drop with Drop. -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="field"
				bind:this={fieldEl}
				style:--gooey-bg={backdrop.values.background}
				onpointermove={follow}
				onpointerleave={unfollow}
				onpointercancel={unfollow}
				onclick={dropAtPointer}
			>
				<GooeyField {...gooey.values}>
					{#each drops as d (d.id)}
						<span
							class="blob dropped"
							style:--_size="{gooey.values.size}px"
							style:translate="{d.x}px {d.y}px"
							style:background={gooey.values.colorB}
						></span>
					{/each}
					<span
						class={['blob', 'steered', { following: pointer }]}
						style:--_size="{gooey.values.size}px"
						style:translate="{blob.x}px {blob.y}px"
						style:background={gooey.values.colorA}
					></span>
				</GooeyField>
			</div>

			<div class="toolbar">
				<p class="hint">Steer a blob with the pointer; click or tap to drop one</p>
				<div class="buttons">
					<Button
						size="sm"
						variant="ghost"
						aria-label="Move blob"
						aria-describedby={hintId}
						onkeydown={moveWithKeys}>⠿ Move</Button
					>
					<Button size="sm" variant="ghost" onclick={center}>Center</Button>
					<Button size="sm" variant="ghost" onclick={() => drop(rest)}>Drop</Button>
					<Button size="sm" variant="ghost" onclick={clearDrops}>Clear</Button>
					<MotionToggle bind:paused size="sm" />
				</div>
				<span id={hintId} class="visually-hidden">
					Use the arrow keys to move the blob, hold Shift for bigger steps. Drop leaves a copy where
					it is.
				</span>
			</div>

			<div class="menu-demo">
				<GooeyMenu
					{...menu.values}
					blur={gooey.values.blur}
					sharpness={gooey.values.sharpness}
					offset={gooey.values.offset}
					region={gooey.values.region}
					{items}
					bind:open={menuOpen}
					label="Quick actions"
					onselect={(item) => (menuStatus = `${item.label} chosen.`)}
				/>
			</div>
			<p class="visually-hidden" role="status">{announcement}</p>
			<p class="visually-hidden" role="status">{menuStatus}</p>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Gooey" code={gooey.markup('GooeyField')} onreset={reset}>
			{#if vanished}
				<p class="note" role="status">
					Offset ÷ sharpness is 1 or more: every pixel ends up transparent, so nothing is left.
				</p>
			{:else if translucent}
				<p class="note" role="status">
					Sharpness − offset is below 1: even the centers of the blobs stay translucent.
				</p>
			{/if}
			<ParamControls schema={gooeySchema} bind:values={gooey.values} />
			<ParamControls schema={gooeyMenuSchema} bind:values={menu.values} />
			<ParamControls schema={stageSchema} bind:values={backdrop.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Goo from a blur and a threshold"
			lede="Blur shapes until their soft edges overlap, then cut the blurry alpha back into a hard edge. Where two halos overlapped, the cut runs around both: they melt together."
		>
			<h3>The idea: metaballs, cheaply</h3>
			<p>
				Metaballs are a classic computer graphics trick: every ball radiates a field that fades with
				distance, the fields of all balls are added up, and the surface is drawn wherever the sum
				crosses a threshold. Two balls far apart are two circles; two close ones share a bridge
				where their fields add up past the threshold.
			</p>
			<p>
				An SVG filter can fake that with two primitives. A Gaussian blur turns every shape's alpha
				into a soft field (and where halos overlap, their alpha adds up). A color matrix then turns
				that soft alpha into a hard edge again. No canvas and no JavaScript; the shapes are ordinary
				elements with <code>border-radius: 50%</code>, moved by CSS animations.
			</p>

			<h3>1. Blur: feGaussianBlur</h3>
			<p>
				<code>&lt;feGaussianBlur stdDeviation="{gooey.values.blur}"&gt;</code> spreads every pixel
				into its neighbors. <code>stdDeviation</code> (σ) is in px; the blur is visible up to
				roughly 3σ, here {blurReach(gooey.values.blur)} px, beyond the edge of each shape. So two shapes
				start to merge once their edges come closer than about twice that. The blur also softens the colors,
				which is why the last step can bring the sharp ones back.
			</p>

			<h3>2. Threshold: the alpha row of feColorMatrix</h3>
			<p>
				<code>&lt;feColorMatrix type="matrix"&gt;</code> multiplies every pixel's
				<code>[R G B A 1]</code> with a 4×5 matrix. The first three rows here are the identity, so
				color passes through. The fourth row, <code>0 0 0 k −b</code>, computes the new alpha:
			</p>
			<p class="formula"><code>α′ = clamp(k · α − b, 0, 1)</code></p>
			<p>
				Values are in the 0…1 range, not 0…255. With <em>k</em> = {gooey.values.sharpness} and
				<em>b</em> = {gooey.values.offset}, every pixel whose blurred alpha is below
				<strong>{fmt(band.from)}</strong> becomes fully transparent, everything above
				<strong>{fmt(band.to)}</strong> fully opaque, and only the narrow band between them (1/k wide)
				is the anti-aliased edge. That's the whole trick:
			</p>
			<dl>
				<dt>k (sharpness)</dt>
				<dd>
					How steep the cut is. A large <em>k</em> gives crisp edges; around 4 the shapes keep a soft,
					glowing rim. Too large and the edges start to look aliased (stair-stepped).
				</dd>
				<dt>b (offset)</dt>
				<dd>
					Where the cut sits: around <code>α = b / k</code>. A blurred edge of a large shape passes
					α = 0.5 roughly where the original edge was, so <code>b ≈ k / 2</code> keeps shapes at their
					original size. Lower values make them fatter and stickier, higher values thinner. Small shapes
					lose more alpha to the blur, so they shrink or vanish first.
				</dd>
			</dl>
			<CodeSnippet code={filterCode} />
			<p>
				<code>color-interpolation-filters="sRGB"</code> keeps the blurred colors from being mixed in linear
				light, which would make the bridges between two colors look lighter than either.
			</p>

			<h3>3. Keep the colors: feComposite operator="atop"</h3>
			<p>
				The thresholded result has the right shape, but its colors are blurred: two differently
				colored blobs leave a smeared mix behind. <code
					>&lt;feComposite in="SourceGraphic" in2="goo" operator="atop"&gt;</code
				>
				draws the original, unblurred shapes back on top, but only where the goo is opaque. Inside the
				shapes you see crisp source colors; the bridges, where the source is transparent, keep the blurred
				goo color. Toggle <em>Keep source colors</em> to compare.
			</p>

			<h3>4. Apply it: filter: url(#id)</h3>
			<p>
				The filter goes on the <em>container</em> of the shapes, not on each shape: the blur has to
				see all of them together for their halos to add up. The <code>&lt;svg&gt;</code> holding the
				<code>&lt;filter&gt;</code> can be zero-sized, but it must not be
				<code>display: none</code>, which makes some browsers (Firefox) ignore the filter.
			</p>
			<CodeSnippet code={cssCode} />

			<h3>Why the filter region matters</h3>
			<p>
				A filter only renders inside its <em>filter region</em>, which by default is the bounding
				box plus 10% on each side (<code>x="-10%" y="-10%" width="120%" height="120%"</code>).
				Everything outside is cut off with a straight line. For a filter on an HTML element, that
				bounding box covers the element <em>and its overflowing descendants</em> (checked in
				Chromium and Firefox 156), so shapes that stick out of a small container, like the menu
				items here, are still inside it. What gets cut is the part of the goo that grows
				<em>beyond</em> the outermost shapes: the blur spreads up to 3σ further out, and with a low offset
				the threshold turns that spill into a fatter outline. Without room, the outermost shapes get flat
				sides.
			</p>
			<p>
				So pad the region by at least the blur reach: percentages in <code>x</code>,
				<code>y</code>, <code>width</code> and <code>height</code> are relative to the box, so a
				small container needs a larger percentage than a big one. To see the cut, open the menu, set
				<em>Filter region padding</em> to 0 and lower the offset to about 4: the goo is sliced off flat
				along every edge of the region.
			</p>

			<h3>The menu: goo behind, buttons on top</h3>
			<p>
				The gooey menu is the same filter on a different set of shapes: a big circle for the toggle
				and small ones for the items, which slide out with a springy <code>transition</code> on
				<code>translate</code> and stay stuck to each other until they're far enough apart.
			</p>
			<p>
				Don't put the filter on the buttons themselves. The threshold eats anything thin or
				semi-transparent: text anti-aliasing, icons, and the focus outline. So the colored circles
				live on an <code>aria-hidden</code> layer with the filter, and the real
				<code>&lt;button&gt;</code>s are transparent, unfiltered, and move in sync on top of them.
				The toggle has <code>aria-expanded</code> and <code>aria-controls</code>; closed items are
				<code>inert</code>, so they can't be reached by Tab, and Escape closes the menu and puts
				focus back on the toggle. The toggle comes first in the DOM, so Tab moves from it to the
				items. The icons are drawn in near-black or white, whichever has the higher contrast ratio
				against the circle's color: for the default violet that's white, by a hair (4.5:1 against
				4.2:1).
			</p>
			<CodeSnippet code={menuCode} />

			<h3>Accessibility</h3>
			<ul>
				<li>
					The blob field is decorative and <code>aria-hidden</code>. The drift is a CSS animation:
					it stops entirely for <code>prefers-reduced-motion: reduce</code> and can be paused on the page
					(WCAG 2.2.2). Nothing flashes; the shapes only move.
				</li>
				<li>
					Steering with the pointer has two alternatives: the <em>Move</em> button takes arrow keys (Shift
					for bigger steps), and clicking or tapping the field drops a blob, so no drag or hover is needed.
					Without a pointer, the steered blob rests in the center (or wherever the keyboard put it).
				</li>
			</ul>

			<h3>Browser support</h3>
			<p class="note">
				SVG filters as CSS <code>filter: url(#id)</code> on HTML elements work in all current
				engines, and the three primitives used here are among the oldest and most consistently
				implemented. The rendering was checked in Chromium and Firefox 156, the interaction only in
				Chromium; Safari is untested. Container query units (<code>cqi</code>/<code>cqb</code>) used
				for the drift paths need a browser from 2023 or later.
			</p>
			<p>
				Cost: the browser has to re-run the filter for the whole container on every frame something
				inside it moves, and a Gaussian blur's cost grows with the area and with σ. A full-screen
				field like this one is the expensive end and can cost frames on low-end phones. Keep gooey
				areas small (buttons, loaders, small illustrations), keep σ moderate, and stop the animation
				when the element is off-screen.
			</p>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.motion {
		position: relative;
		display: grid;
	}

	.field {
		display: grid;
		background: var(--gooey-bg);
		cursor: crosshair;
	}

	.blob {
		position: absolute;
		inset: 50% auto auto 50%;
		inline-size: var(--_size);
		aspect-ratio: 1;
		margin: calc(var(--_size) / -2);
		border-radius: 50%;
	}

	/* A little lag makes the steered blob pull goo threads behind it. */
	.steered {
		transition: translate var(--duration-slow) var(--ease-out);
	}

	.steered.following {
		transition-duration: var(--duration-base);
	}

	@media (prefers-reduced-motion: reduce) {
		.steered {
			transition: none;
		}
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

	.menu-demo {
		position: absolute;
		inset-block-end: var(--space-8);
		inset-inline-start: var(--space-8);
	}

	/* The control panel docks to the bottom on narrow screens; keep the menu above it. */
	@media (width < 40rem) {
		.menu-demo {
			inset-block: calc(45dvh - 5rem) auto;
		}
	}

	.note {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	.formula {
		font-size: var(--text-lg);
		text-align: center;
	}
</style>
