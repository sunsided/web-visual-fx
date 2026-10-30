<script lang="ts">
	import { resolve } from '$app/paths';
	import { cubicIn, cubicInOut, cubicOut, linear } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import DemoCard from '#lib/fx/dissolve/DemoCard.svelte';
	import Dissolve from '#lib/fx/dissolve/Dissolve.svelte';
	import {
		burnSchema,
		dissolvePrimitives,
		dissolveSchema,
		filterAttrs,
		primitivesMarkup,
		thresholds,
		type BurnOptions,
		type DissolveOptions
	} from '#lib/fx/dissolve/dissolve.js';
	import { dissolve as dissolveTransition } from '#lib/fx/dissolve/transition.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	/** The burn options out of the full set of values (everything but progress and mode). */
	function burnOf(values: DissolveOptions): BurnOptions {
		const keys = Object.keys(burnSchema) as (keyof BurnOptions)[];
		return Object.fromEntries(keys.map((k) => [k, values[k]])) as BurnOptions;
	}

	const easings = { cubicInOut, cubicIn, cubicOut, linear };

	const stageSchema = defineSchema({
		driver: {
			kind: 'select',
			label: 'Play with',
			default: 'progress',
			options: ['progress', 'transition'],
			group: 'Playback',
			description:
				'progress animates the Progress prop of <Dissolve> (the slider moves along). transition removes the card with {#if} and the dissolve transition.'
		},
		duration: {
			kind: 'range',
			label: 'Duration',
			default: 1200,
			min: 200,
			max: 4000,
			step: 50,
			unit: 'ms',
			group: 'Playback'
		},
		easing: {
			kind: 'select',
			label: 'Easing',
			default: 'cubicInOut',
			options: ['cubicInOut', 'cubicIn', 'cubicOut', 'linear'],
			group: 'Playback'
		}
	});

	const fx = new ParamState(dissolveSchema);
	const playback = new ParamState(stageSchema);
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	function reset() {
		cancelAnimationFrame(frame);
		fx.reset();
		playback.reset();
		shown = true;
	}

	// --- Driving `progress` ---------------------------------------------------------------------
	let frame = 0;

	function play(to: number) {
		cancelAnimationFrame(frame);
		const from = fx.values.progress;
		const ease = easings[playback.values.easing];
		// Scale the duration by the distance, so a half-burnt card doesn't take the full time.
		const duration = playback.values.duration * Math.abs(to - from);
		const start = performance.now();
		frame = requestAnimationFrame(function step(now) {
			const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
			fx.values.progress = from + (to - from) * ease(t);
			if (t < 1) frame = requestAnimationFrame(step);
		});
	}

	// --- Driving the transition ----------------------------------------------------------------
	let shown = $state(true);

	let transitionParams = $derived.by(() => {
		const mode = fx.values.mode;
		return {
			...burnOf(fx.values),
			duration: playback.values.duration,
			easing: easings[playback.values.easing],
			fade: mode === 'fade' ? true : mode === 'burn' ? false : undefined
		};
	});

	let byTransition = $derived(playback.values.driver === 'transition');
	let gone = $derived(byTransition ? !shown : fx.values.progress >= 1);

	function dismiss() {
		if (byTransition) shown = false;
		else play(1);
	}

	function restore() {
		if (byTransition) shown = true;
		else play(0);
	}

	// Stop a running playback when leaving the page.
	$effect(() => () => cancelAnimationFrame(frame));

	// --- Code ----------------------------------------------------------------------------------
	let filterCode = $derived.by(() => {
		const progress = fx.values.progress;
		const burn = burnOf(fx.values);
		const r = filterAttrs();
		return [
			`<svg width="0" height="0" aria-hidden="true">`,
			`  <filter id="dissolve" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"`,
			`          color-interpolation-filters="sRGB">`,
			primitivesMarkup(dissolvePrimitives(Math.min(0.999, Math.max(0.001, progress)), burn)),
			`  </filter>`,
			`</svg>`
		].join('\n');
	});

	let front = $derived(thresholds(fx.values.progress, fx.values));

	const transitionCode = [
		`<script>`,
		`  import { dissolve } from '@sunsided/web-visual-fx/svelte';`,
		`  let open = $state(true);`,
		'<' + '/script>',
		``,
		`{#if open}`,
		`  <div class="toast" transition:dissolve={{ duration: 1200, origin: 'right' }}>`,
		`    Saved. <button onclick={() => (open = false)}>Dismiss</button>`,
		`  </div>`,
		`{/if}`
	].join('\n');

	const tweenCode = [
		`<script>`,
		`  import { Tween } from 'svelte/motion';`,
		`  import { cubicIn } from 'svelte/easing';`,
		`  import { Dissolve } from '@sunsided/web-visual-fx/svelte';`,
		`  const burn = new Tween(0, { duration: 1200, easing: cubicIn });`,
		'<' + '/script>',
		``,
		`<Dissolve progress={burn.current}>`,
		`  <article>…</article>`,
		`</Dissolve>`,
		`<button onclick={() => burn.set(1)}>Dismiss</button>`
	].join('\n');
</script>

<svelte:head>
	<title>Dissolve · Visual FX</title>
	<meta
		name="description"
		content="A burn-away dissolve transition for any HTML with an SVG feTurbulence threshold, a glowing ember edge and a reduced-motion fade, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Dissolve demo">
	{#snippet header()}
		<StageHeader title="Dissolve" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<Scene kind="aurora" animate={false} class="dissolve-scene">
			<div class="slot">
				{#if byTransition}
					{#if shown}
						<div class="holder" transition:dissolveTransition={transitionParams}>
							<DemoCard onclose={dismiss} />
						</div>
					{/if}
				{:else}
					<Dissolve {...fx.values} class="holder">
						<DemoCard onclose={dismiss} />
					</Dissolve>
				{/if}
			</div>
			<div class="playback">
				<Button size="sm" variant="solid" onclick={gone ? restore : dismiss}>
					{gone ? 'Bring back' : 'Dismiss'}
				</Button>
			</div>
		</Scene>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Dissolve" code={fx.markup('Dissolve')} onreset={reset}>
			{#if reducedMotion.current && fx.values.mode === 'auto'}
				<p class="note">
					You prefer reduced motion, so this plays as a fade. Set Mode to burn to see the effect.
				</p>
			{/if}
			<ParamControls schema={stageSchema} bind:values={playback.values} />
			<ParamControls schema={dissolveSchema} bind:values={fx.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="Burning through a noise field"
			lede="A dissolve is a threshold moving through a noise texture: every pixel has a random number, and once the progress passes it, the pixel is gone. The glowing edge is just the pixels whose number is about to be passed. One SVG filter does all of it, on live HTML."
		>
			<h3>1. A threshold field from feTurbulence</h3>
			<p>
				<code>&lt;feTurbulence type="fractalNoise"&gt;</code> fills the element with Perlin noise;
				its
				<code>baseFrequency</code> is the inverse of the <em>Noise scale</em>, so a scale of 48 px
				gives patches roughly that big. The filter reads the noise's alpha channel, the only one
				that is never premultiplied, copies it into red and makes the result opaque.
			</p>
			<p>
				That noise is bell-shaped: values cluster around 0.5 (measured in Chromium: the 1st and 99th
				percentiles sit near 0.23 and 0.77, the standard deviation about 0.12). Moving a threshold
				linearly through it would burn almost nothing for the first third of the progress, rush
				through the middle and crawl at the end. An
				<code>&lt;feFuncR type="table"&gt;</code> fixes that: its
				<code>tableValues</code> are the normal distribution's CDF sampled at 33 points, which maps
				the noise to evenly spread values from 0 to 1. Now <em>Progress</em> 0.3 burns about 30% of the
				element (with the burn starting nowhere in particular; a direction ramp skews it).
			</p>
			<p>
				With <em>Burn starts at</em>, a grey ramp is mixed in (an <code>&lt;feImage&gt;</code> of a
				64×64 PNG stretched over the element, blended by
				<code>feComposite operator="arithmetic"</code> as
				<code>(1 − strength)·noise + strength·ramp</code>). Low values burn first, so a ramp that is
				dark at the bottom makes the fire climb upwards, and the noise keeps the front ragged.
			</p>

			<h3>2. Three steps through the same field</h3>
			<p>
				A soft step is one <code>&lt;feColorMatrix&gt;</code> row:
				<code>A = k·(R − t)</code>, clamped to 0–1 by the browser, with k the
				<em>Edge sharpness</em>. The filter takes three of them at nested thresholds:
			</p>
			<dl>
				<dt>burnt</dt>
				<dd>
					t = {front.burnt.toFixed(3)}: below it nothing is left. This is the outer edge of the
					ember.
				</dd>
				<dt>ember</dt>
				<dd>t + ember width = {front.ember.toFixed(3)}: between the two, the edge glows.</dd>
				<dt>intact</dt>
				<dd>
					+ char width = {front.intact.toFixed(3)}: between ember and intact, a darker scorched
					band; above it, the original content.
				</dd>
			</dl>
			<p>
				The front t moves from <code>−(ember + char) − 1/k</code> at progress 0 to 1 at progress 1. Those
				end points are exact rather than approximate: at 0 even a field value of 0 is a full 1/k above
				the last step, so nothing changes, and at 1 no value is above the first. That is why the component
				can switch the filter on and off at the ends without a visible jump, and skips it entirely at
				rest.
			</p>

			<h3>3. Painting the bands</h3>
			<p>
				<code>SourceGraphic</code> <code>operator="in"</code> the intact mask is what remains of the
				content. Each band is an <code>&lt;feFlood&gt;</code> of its color, kept
				<code>in</code> the outer mask, cut <code>out</code> of the inner one and kept
				<code>in</code>
				<code>SourceAlpha</code>, so the edge only glows where the element actually had pixels: the
				transparent corners of a rounded card never catch fire. A blurred copy of the ember band is
				merged twice underneath for the glow.
			</p>
			<p class="note">
				The flip side: a soft <code>box-shadow</code> is pixels too, so it would catch fire as a smoky
				orange haze. Put the shadow on an element outside the dissolving one, or leave it off, as the
				demo card does.
			</p>
			<CodeSnippet code={filterCode} />

			<h3>4. Driving it</h3>
			<p>
				CSS custom properties can't reach SVG filter attributes, so the progress has to come from
				script, which rewrites the three <code>feColorMatrix</code> values every frame. The
				<code>&lt;Dissolve&gt;</code> component takes a <code>progress</code> prop; drive it with a
				<code>Tween</code>, a scroll position or a slider like the one in the panel:
			</p>
			<CodeSnippet code={tweenCode} />
			<p>
				For elements that come and go with <code>{'{#if}'}</code>, the <code>dissolve</code>
				transition does the same without a wrapper. It is a <code>tick</code> transition: it adds a
				hidden filter to <code>document.body</code>, points the element's <code>filter</code> at it,
				updates it per frame and removes it when the frames stop. Choose
				<em>Play with: transition</em> to see it.
			</p>
			<CodeSnippet code={transitionCode} />

			<h3>Reduced motion and fallback</h3>
			<ul>
				<li>
					With <code>prefers-reduced-motion: reduce</code>, both the component (in
					<code>mode="auto"</code>) and the transition turn into a plain opacity fade with the same
					timing. Fire spreading across the screen is exactly the kind of large motion that setting
					asks to avoid, and a fade still tells the user the element went away.
				</li>
				<li>
					At progress 1 the wrapper is <code>visibility: hidden</code>, so a burnt card can't be
					clicked or reached by a screen reader. The text inside stays real text throughout.
				</li>
				<li>
					This isn't a looping animation, so the page's pause toggle (<code>data-motion</code>)
					doesn't apply; it only plays when someone asks for it.
				</li>
			</ul>

			<h3>Browser support and performance</h3>
			<p>
				All primitives used here are part of SVG filters, Baseline widely available (<a
					href="https://webstatus.dev/features/svg-filters">webstatus.dev</a
				>), and
				<code>filter: url(#id)</code> on HTML works in every current engine. Driving progress from
				CSS with <code>@property</code> would only be Baseline since July 2024 (<a
					href="https://webstatus.dev/features/registered-custom-properties">webstatus.dev</a
				>), but it couldn't reach the filter anyway, so nothing here depends on it. Checked in
				Chromium only; Firefox and Safari are untested.
			</p>
			<ul>
				<li>
					During the transition the filter reruns on every frame over the whole element, and
					<code>feTurbulence</code> with several octaves is the expensive part. That is fine for a card
					or a toast; for a full-screen section, lower the octaves.
				</li>
				<li>
					At rest (progress 0 or 1) no filter is applied, so a dismissable element costs nothing
					until it is dismissed.
				</li>
				<li>
					The glow can reach up to the filter region, {filterAttrs().x.replace('-', '')} beyond the element
					on each side. A wider glow on a large element is clipped there.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	:global(.dissolve-scene) {
		display: grid;
		place-items: center;
		block-size: 100%;
		--scene-blob-opacity: 0.6;
	}

	.slot {
		display: grid;
		inline-size: min(26rem, 100% - 2rem);
	}

	.playback {
		position: absolute;
		inset: auto 0 var(--space-6);
		display: flex;
		justify-content: center;
	}

	.note {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
</style>
