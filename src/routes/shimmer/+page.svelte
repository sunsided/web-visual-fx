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
	import Shimmer from '#lib/fx/shimmer/Shimmer.svelte';
	import Skeleton from '#lib/fx/shimmer/Skeleton.svelte';
	import {
		bandGradient,
		gradientSweep,
		presetOptions,
		sheenGradient,
		sheenSweep,
		shimmerSchema,
		type ShimmerPreset
	} from '#lib/fx/shimmer/shimmer.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const subjects = ['button', 'skeleton', 'text', 'unlock'] as const;
	const subjectLabels: Record<ShimmerPreset, string> = {
		button: 'Shiny button',
		skeleton: 'Skeleton',
		text: 'Shiny text',
		unlock: 'Slide to unlock'
	};

	const stageSchema = defineSchema({
		subject: {
			kind: 'select',
			label: 'Subject',
			default: 'button',
			options: subjects,
			group: 'Stage',
			description: 'What the shimmer runs on. The preset buttons above also load matching settings.'
		}
	});

	const shimmer = new ParamState(shimmerSchema, presetOptions('button'));
	const scene = new ParamState(stageSchema);

	let paused = $state(false);

	function load(name: ShimmerPreset) {
		shimmer.values = presetOptions(name);
		scene.values.subject = name;
	}

	function reset() {
		load('button');
	}

	// Mirrors Shimmer.svelte, filled in with the current settings.
	let cssCode = $derived.by(() => {
		const v = shimmer.values;
		const s = v.mode === 'sheen' ? sheenSweep(v) : gradientSweep(v);
		const running = v.trigger === 'hover' ? `.shimmer:is(:hover, :focus-within)` : `.shimmer`;
		const animation = (name: string) => `  animation: ${name} ${s.total}s linear infinite;`;
		const lines: string[] = [];
		if (v.mode === 'sheen') {
			lines.push(
				`.shimmer { position: relative; isolation: isolate; }`,
				``,
				`/* box-sized layer over the content, clipped to it */`,
				`.sheen {`,
				`  position: absolute;`,
				`  inset: 0;`,
				`  overflow: hidden;`,
				`  border-radius: inherit;`,
				`  pointer-events: none;`,
				...(v.blend === 'normal' ? [] : [`  mix-blend-mode: ${v.blend};`]),
				`}`,
				``,
				`.sheen > .band {`,
				`  position: absolute;`,
				`  inset: 0;`,
				`  background: ${sheenGradient(v)};`,
				`  opacity: ${v.intensity};`,
				`  translate: -100% 0;`,
				`}`,
				``,
				`@media (prefers-reduced-motion: no-preference) {`,
				`  ${running} .band {`,
				`  ${animation('slide')}`,
				`  }`,
				`}`,
				``,
				`@keyframes slide {`,
				`  from { translate: ${s.from}% 0; }`,
				`  to { translate: ${s.to}% 0; }`,
				`}`
			);
		} else {
			const image =
				v.mode === 'text'
					? bandGradient(
							v.angle,
							'currentColor',
							`color-mix(in oklab, ${v.color} ${Math.round(v.intensity * 100)}%, currentColor)`,
							v.band,
							'var(--pos)'
						)
					: bandGradient(
							v.angle,
							`rgb(0 0 0 / ${+(1 - v.intensity).toFixed(3)})`,
							'#000',
							v.band,
							'var(--pos)'
						);
			lines.push(
				`@property --pos {`,
				`  syntax: '<percentage>';`,
				`  inherits: false;`,
				`  initial-value: -100%;`,
				`}`,
				``,
				`@media (prefers-reduced-motion: no-preference) {`,
				`  ${running} {`,
				...(v.mode === 'text'
					? [
							`    background: ${image};`,
							`    background-clip: text;`,
							`    -webkit-text-fill-color: transparent;`
						]
					: [`    mask-image: ${image};`]),
				`  ${animation('sweep')}`,
				`  }`,
				`}`,
				``,
				`@keyframes sweep {`,
				`  from { --pos: ${s.from}%; }`,
				`  to { --pos: ${s.to}%; }`,
				`}`
			);
		}
		return lines.join('\n');
	});

	let sweepNote = $derived.by(() => {
		const v = shimmer.values;
		const s = v.mode === 'sheen' ? sheenSweep(v) : gradientSweep(v);
		return `${s.from}% → ${s.to}% in ${s.total}s`;
	});
</script>

<svelte:head>
	<title>Shimmer · Visual FX</title>
	<meta
		name="description"
		content="Shimmer and sheen sweeps for skeleton loaders, shiny buttons and shiny text: a translated highlight layer, background-clip: text, or an animated mask, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Shimmer demo">
	{#snippet header()}
		<StageHeader title="Shimmer" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage" data-theme="dark" data-motion={paused ? 'paused' : 'running'}>
			<div class="subject">
				{#if scene.values.subject === 'button'}
					<Shimmer {...shimmer.values} class="shiny-button">
						<button type="button" class="cta">Upgrade to Pro</button>
					</Shimmer>
				{:else if scene.values.subject === 'skeleton'}
					<div class="loading-card" role="status">
						<span class="visually-hidden">Loading profile…</span>
						<Shimmer {...shimmer.values}>
							<Skeleton lines={3} />
						</Shimmer>
					</div>
				{:else if scene.values.subject === 'text'}
					<Shimmer {...shimmer.values} as="h2" class="headline">Shiny new things</Shimmer>
				{:else}
					<Shimmer {...shimmer.values} as="p" class="unlock">slide to unlock</Shimmer>
				{/if}
			</div>
			<MotionToggle bind:paused size="sm" />
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Shimmer" code={shimmer.markup('Shimmer')} onreset={reset}>
			<div class="presets" role="group" aria-label="Presets">
				{#each subjects as name (name)}
					<Button
						size="sm"
						variant={scene.values.subject === name ? 'solid' : 'soft'}
						onclick={() => load(name)}>{subjectLabels[name]}</Button
					>
				{/each}
			</div>
			<ParamControls schema={stageSchema} bind:values={scene.values} />
			<ParamControls schema={shimmerSchema} bind:values={shimmer.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="One band of light, three ways to paint it"
			lede="A shimmer is a soft band of light that crosses something every now and then. The band is always a linear-gradient. What differs is where it lives: on a layer over the content, inside the text itself, or in a mask that decides how much of the content shows."
		>
			<h3>1. sheen: a layer that slides</h3>
			<p>
				An <code>aria-hidden</code> layer the size of the box sits over the content with
				<code>overflow: hidden</code> and the box's <code>border-radius</code>. Inside it, a second
				layer carries the band: a gradient that is transparent except for a stripe in the middle.
				That inner layer moves with <code>translate</code> from −100% to 100% of its own width. At either
				end it is completely outside the clip, whatever the angle of the stripe, so the sweep starts and
				ends invisibly.
			</p>
			<p>
				<code>translate</code> is the cheapest thing CSS can animate: the browser paints the band
				once and the compositor moves it. <code>mix-blend-mode</code> decides how the band meets the
				content.
				<code>soft-light</code> and <code>overlay</code> brighten what is already there and keep
				saturated buttons saturated; <code>normal</code> lays white on top and can wash out the label.
				The blend sits on the clipping layer, not the band: the band's own blend would only mix inside
				its parent's group.
			</p>

			<h3>2. text: background-clip</h3>
			<p>
				<code>background-clip: text</code> paints an element's background only where its text is,
				and
				<code>-webkit-text-fill-color: transparent</code> lets it show through. The background is
				the band on <code>currentColor</code>, so outside the band the text keeps exactly its own
				color. The band itself is the highlight mixed into the text color with
				<code>color-mix()</code>.
			</p>

			<h3>3. mask: alpha only</h3>
			<p>
				<code>mask-image</code> uses the same kind of gradient, but only its alpha matters: black at reduced
				alpha outside the band, opaque black in it. Everything outside the band shows at reduced opacity,
				the band at full. That works for any content, and it is the right tool for skeleton loaders: the
				gaps between the placeholder blocks are transparent, so masking them changes nothing and only
				the blocks light up, all from one gradient across the whole card.
			</p>

			<h3>4. Moving the band inside a gradient</h3>
			<p>
				For <code>text</code> and <code>mask</code> the band has to move inside the gradient, since
				there is no layer to slide. Its position is a custom property registered as a
				<code>&lt;percentage&gt;</code>, used in the color stops, and animated. Registration is what
				lets the browser interpolate it (see the <a href={resolve('/aurora')}>aurora</a> page). The
				gradient line of a <code>linear-gradient</code> is sized so its 0% and 100% lines touch the box's
				far corners, for every angle, so a band centered at −half or 100% + half its width is fully outside.
			</p>
			<p>
				<em>Pause</em> needs no extra keyframe. The sweep is one linear animation that starts
				further back, by exactly the distance the band would cover during the pause. It crosses the
				box at the same speed and spends the rest of the cycle out of sight. Currently: {sweepNote}.
			</p>
			<p>This is the CSS for your current settings:</p>
			<CodeSnippet code={cssCode} />

			<h3>Motion and accessibility</h3>
			<ul>
				<li>
					Under <code>prefers-reduced-motion: reduce</code>, and with <em>Animate</em> off, the
					content is shown plain: no band, no mask, normal text color. The <em>Pause animations</em> button
					freezes the band where it is (WCAG 2.2.2).
				</li>
				<li>
					The text stays real text in every mode. The sheen layer is <code>aria-hidden</code> and ignores
					the pointer, so the button under it is still a normal button.
				</li>
				<li>
					A skeleton is decoration. The demo puts it in a <code>role="status"</code> region with
					visually hidden text ("Loading profile…") and hides the blocks with
					<code>aria-hidden</code>, so a screen reader hears what is going on instead of nothing.
				</li>
				<li>
					In <code>text</code> mode the band changes the text color. Keep <em>Intensity</em> moderate
					on light backgrounds, or the passing band can drop below readable contrast for a moment.
				</li>
			</ul>

			<h3>Browser support</h3>
			<p class="note">
				CSS masks are Baseline widely available since 2026-06-07 and <code>@property</code> newly
				available since 2024-07-09, per web-features 3.44.0. <code>background-clip: text</code> is
				not Baseline yet; the component sets both the prefixed and the unprefixed property. The
				<code>text</code> and <code>mask</code> techniques check for
				<code>CSS.registerProperty</code>
				after mount and show the content plain where it is missing; <code>sheen</code> only animates
				<code>translate</code> and works everywhere. Tested in Chromium 156 only; Firefox and Safari are
				untested.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					<strong>sheen is compositor-only.</strong> The band is painted once and moved by the GPU. Use
					it for anything that shimmers for a long time.
				</li>
				<li>
					<strong>text and mask repaint every frame</strong>, because the gradient itself changes.
					For a headline or a few skeleton cards that is cheap; for long lists of skeleton rows,
					wrap the whole list in one shimmer instead of one per row (judgment).
				</li>
				<li>Paused, reduced motion or between hover sweeps, nothing repaints.</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.stage {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--space-10);
		padding: var(--space-6);
		background: radial-gradient(circle at 50% 35%, oklch(24% 0.03 265), oklch(12% 0.02 265));
		color: oklch(94% 0.01 265);
	}

	/* Above the control panel, which docks to the bottom on narrow screens. */
	@media (width < 40rem) {
		.stage {
			align-content: start;
			padding-block-start: var(--space-16);
		}
	}

	.subject {
		display: grid;
		place-items: center;
		min-block-size: 12rem;
		min-inline-size: min(24rem, 80vw);
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-block-end: var(--space-4);
	}

	.stage :global(.shiny-button) {
		border-radius: 999px;
	}

	.cta {
		padding: var(--space-4) var(--space-8);
		border: 0;
		border-radius: 999px;
		background: linear-gradient(135deg, #7c3aed, #db2777);
		color: white;
		font: inherit;
		font-size: var(--text-lg);
		font-weight: var(--weight-semibold);
		cursor: pointer;
	}

	.loading-card {
		inline-size: min(24rem, 80vw);
		padding: var(--space-6);
		border-radius: var(--radius-2xl);
		background: oklch(22% 0.025 265);
		box-shadow: var(--shadow-3);
	}

	.stage :global(.headline) {
		color: oklch(80% 0.12 85);
		font-size: clamp(2.5rem, 7vw, 4.5rem);
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.stage :global(.unlock) {
		color: white;
		font-size: clamp(1.75rem, 5vw, 2.75rem);
		font-weight: 300;
		letter-spacing: 0.02em;
	}
</style>
