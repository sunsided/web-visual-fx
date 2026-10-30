<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import Field from '#lib/components/molecules/Field.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Button from '#lib/components/atoms/Button.svelte';
	import Neon from '#lib/fx/neon/Neon.svelte';
	import {
		FLICKER_CYCLE,
		FLICKER_STEPS,
		FONT_STACKS,
		POWER_ON_DURATION,
		POWER_ON_STEPS,
		glowRadii,
		litColor,
		maxFlashesPerSecond,
		neonDropShadow,
		neonSchema,
		neonTextShadow,
		repeatSteps,
		signContrast,
		stepKeyframes,
		unlitColor
	} from '#lib/fx/neon/neon.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const DEFAULT_TEXT = 'Open late';

	const neon = new ParamState(neonSchema);
	let text = $state(DEFAULT_TEXT);
	let paused = $state(false);
	// Bumped to remount the sign, which replays the power-on animation.
	let replay = $state(0);

	function reset() {
		neon.reset();
		text = DEFAULT_TEXT;
	}

	let contrast = $derived(signContrast(neon.values));
	let low = $derived(contrast < 3);
	let lowMessage = $derived(low ? 'Sign contrast is below 3 to 1 at its dimmest.' : '');
	let flashes = $derived(maxFlashesPerSecond(repeatSteps(FLICKER_STEPS, FLICKER_CYCLE, 3)));

	let markup = $derived.by(() => {
		const props = neon.markup('Neon');
		if (text === DEFAULT_TEXT) return props;
		return props.replace('<Neon', `<Neon text="${text}"`);
	});

	// Mirrors Neon.svelte (one flickering letter), filled in with the current settings.
	let cssCode = $derived.by(() => {
		const v = neon.values;
		const radii = glowRadii(v.glow, v.layers);
		const paint =
			v.technique === 'text-shadow'
				? [`  text-shadow: ${neonTextShadow(radii, 'var(--glow)', 'var(--halo)')};`]
				: [`  filter: ${neonDropShadow(radii, 'var(--glow)', 'var(--halo)')};`];
		return [
			`@property --on { syntax: '<number>'; inherits: false; initial-value: 1; }`,
			``,
			`.sign {`,
			`  background: ${v.background};`,
			`  font-family: ${FONT_STACKS[v.font]};`,
			`}`,
			``,
			`.sign span {`,
			`  /* --on: 1 = lit, 0 = unlit */`,
			`  --glow: color-mix(in oklab, ${v.tube} calc(var(--on) * ${Math.round(v.intensity * 100)}%), transparent);`,
			`  --halo: color-mix(in oklab, ${litColor(v.tube, v.core)} calc(var(--on) * 100%), transparent);`,
			`  color: color-mix(in oklab, ${litColor(v.tube, v.core)} calc(var(--on) * 100%), ${unlitColor(v.tube, v.background)});`,
			...paint,
			`}`,
			``,
			`.sign .flicker {`,
			`  --depth: ${v.flickerDepth};`,
			`  animation: flicker ${FLICKER_CYCLE}s step-end infinite;`,
			`}`,
			``,
			`.sign .off {`,
			`  color: ${unlitColor(v.tube, v.background)};`,
			`  ${v.technique}: none;`,
			`}`,
			``,
			`@keyframes flicker {`,
			...stepKeyframes(FLICKER_STEPS, FLICKER_CYCLE, '--on', 'var(--depth)').map((f) => `  ${f}`),
			`}`,
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  .sign .flicker { animation: none; }`,
			`}`
		].join('\n');
	});

	const htmlCode = [
		`<p class="sign">`,
		`  <span>Open l</span><span class="flicker">a</span><span>te</span>`,
		`</p>`
	].join('\n');

	const powerCode = [
		`@property --power { syntax: '<number>'; inherits: true; initial-value: 1; }`,
		``,
		`.sign { animation: power ${POWER_ON_DURATION}s step-end both; }`,
		`/* each span then uses calc(var(--power) * var(--on)) instead of var(--on) */`,
		``,
		`@keyframes power {`,
		...stepKeyframes(POWER_ON_STEPS, POWER_ON_DURATION, '--power', null).map((f) => `  ${f}`),
		`}`
	].join('\n');
</script>

<svelte:head>
	<title>Neon · Visual FX</title>
	<meta
		name="description"
		content="A neon sign from real, selectable text: stacked text-shadow or drop-shadow glow, a photosensitivity-safe flicker, power-on and dead letters, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Neon demo">
	{#snippet header()}
		<StageHeader title="Neon" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div
			class="wall"
			style:background-color={neon.values.background}
			data-motion={paused ? 'paused' : 'running'}
		>
			{#key replay}
				<h2 class="sign-heading">
					<Neon {...neon.values} {text} style="--neon-bg: transparent" />
				</h2>
			{/key}
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Neon" code={markup} onreset={reset}>
			<div class="actions">
				<MotionToggle bind:paused size="sm" />
				<Button size="sm" onclick={() => (replay += 1)} disabled={!neon.values.powerOn}>
					Replay power-on
				</Button>
			</div>
			<Field label="Text" for="neon-text">
				<input id="neon-text" class="text-input" type="text" bind:value={text} maxlength="40" />
			</Field>
			<p class={['contrast', { low }]}>
				Contrast at the dimmest moment: <strong>{contrast.toFixed(1)}:1</strong>
				{#if low}
					(below 3:1; pick a darker wall or a brighter tube)
				{/if}
			</p>
			<p class="visually-hidden" role="status">{lowMessage}</p>
			<ParamControls schema={neonSchema} bind:values={neon.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A neon sign from text and shadows"
			lede="Real neon is a glass tube with a hot, almost white core and a colored haze around it. On a web page that is a few blurred copies of the letters in the tube color, painted behind text that stays real text: selectable, searchable and read by screen readers."
		>
			<h3>1. The glow: stacked shadows</h3>
			<p>
				One blurred shadow looks like a smudge, not like light. Light around a tube falls off
				quickly near the glass and then fades out slowly, so the sign stacks several shadows with
				growing radii. Here each layer has twice the radius of the one inside it, ending at
				<em>Glow radius</em>: a few layers cover everything from the tight halo to the wide haze on
				the wall. The radii are in <code>em</code>, so the glow scales with the font size.
			</p>
			<p>
				The letters themselves are the tube color mixed towards white (<em>Hot core</em>), and the
				innermost shadow uses that same pale color: right at the glass the light is almost white,
				further out only the gas color is left.
			</p>
			<dl>
				<dt>text-shadow</dt>
				<dd>
					Every shadow is painted independently from the glyph shapes, behind the text. Cheap,
					predictable, and it follows the text across line breaks.
				</dd>
				<dt>drop-shadow</dt>
				<dd>
					A chain of <code>filter: drop-shadow()</code> functions, the CSS shorthand for the SVG
					<code>&lt;feDropShadow&gt;</code> primitive. Each filter in the chain shadows the result of
					the previous one, glow included, so the bloom builds up and gets brighter and softer with the
					same numbers. It costs more: the element is rendered into an offscreen buffer and blurred once
					per function.
				</dd>
			</dl>
			<CodeSnippet code={cssCode} />
			<CodeSnippet code={htmlCode} />

			<h3>2. One number drives the light</h3>
			<p>
				Each span has a level <code>--on</code> from 0 (unlit) to 1 (lit). The glow color is the
				tube color at <code>--on</code> × <em>Intensity</em> opacity via
				<code>color-mix()</code>, and the text color is mixed between the lit fill and an unlit
				color. Flicker, power-on and dead letters only change that number.
			</p>
			<p>
				<code>--on</code> is registered with <code>@property</code> as a
				<code>&lt;number&gt;</code>, so it can be used inside <code>calc()</code> while it animates.
				Without the registration (older browsers, or a stylesheet inside a shadow root, where
				<code>@property</code> is ignored) the property animates discretely, flipping from one value to
				the next. For this animation that makes no difference: it is stepped anyway.
			</p>

			<h3>3. Flicker that is safe to look at</h3>
			<p>
				A flickering tube is the classic neon detail, and also a classic way to hurt people.
				Flashing content can trigger seizures in people with photosensitive epilepsy; WCAG 2.3.1
				allows no more than three flashes in any one second, where a flash is a pair of opposing
				changes in brightness. The flicker here is designed around that:
			</p>
			<ul>
				<li>
					It is a fixed, sparse pattern: three dips in a {FLICKER_CYCLE}-second cycle, two of them
					close together like a failing starter. A unit test slides a one-second window over three
					cycles back to back and counts every level change as half a flash, even tiny ones (the
					guideline only counts big changes). The worst second has <strong>{flashes}</strong>.
				</li>
				<li>
					The keyframes use <code>animation-timing-function: step-end</code>, so the level jumps
					like a tube that strikes or doesn't. That also means the shadows only repaint at the
					jumps, not on every frame.
				</li>
				<li>
					Power-on ({POWER_ON_DURATION}s, once) is checked together with the flicker, so the two
					can't add up to more than the limit either.
				</li>
				<li>
					Under <code>prefers-reduced-motion: reduce</code> both animations are off and the sign is
					simply lit. The pause button stops them with <code>animation-play-state</code>.
				</li>
				<li>
					By default one letter flickers. A whole sign that dips is a much bigger area changing
					brightness; keep the depth low if you flicker everything.
				</li>
			</ul>
			<CodeSnippet code={powerCode} />

			<h3>4. Dead letters and contrast</h3>
			<p>
				A broken tube is not invisible: it is grey-tinted glass. The unlit color is the tube color
				mixed into the wall, just strong enough to reach 3:1 against it, the WCAG minimum for large
				text, which a sign always is. A dip in the flicker goes at most to that color, so the
				panel's contrast figure is the floor at the dimmest moment. The glow is not counted; it only
				adds light around the letters.
			</p>
			<p>
				The text is split into as few spans as the flicker and the dead letter need. A sign without
				either stays a single text node. Splitting a word into spans is invisible to most screen
				readers, but some (VoiceOver on iOS in particular) may read separately styled parts as
				separate words, which is one more reason to flicker only a single letter.
			</p>

			<h3>Browser support and performance</h3>
			<p>
				<code>text-shadow</code> is Baseline widely available since 2015. <code>color-mix()</code>
				is Baseline widely available too, and <code>@property</code> is Baseline since July 2024; without
				it the flicker still works, as explained above. Checked in Chromium and Firefox; Safari is untested.
			</p>
			<ul>
				<li>
					Big blur radii on big text are the cost. Static, they are painted once. The stepped
					flicker repaints a single letter a few times per cycle.
				</li>
				<li>
					The drop-shadow chain blurs offscreen copies of the text, one per layer; prefer
					text-shadow for long text or many signs.
				</li>
				<li>Keep layers low (3 or 4 is plenty): the outer layers add the least light.</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.wall {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: var(--space-8);
		/* a faint brick-ish texture so the glow has a surface to fall on */
		background-image: radial-gradient(ellipse at 50% 45%, oklch(100% 0 0 / 0.06), transparent 60%);
	}

	.sign-heading {
		margin: 0;
		font-size: clamp(3rem, 12vw, 8rem);
		font-weight: 500;
		text-align: center;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.text-input {
		inline-size: 100%;
		block-size: var(--control-height-sm);
		padding-inline: var(--space-2);
		border: 1px solid var(--color-control-border);
		border-radius: var(--control-radius);
		background: var(--color-surface-sunken);
		color: var(--color-text);
		font-size: var(--control-font-size);
	}

	.contrast {
		margin: 0;
		font-size: var(--text-xs);
	}

	.contrast.low {
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
	}

	/* Leave room for the control panel on wide screens. */
	@media (width >= 64rem) {
		.wall {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
