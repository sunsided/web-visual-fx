<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import SplitText from '#lib/fx/split-text/SplitText.svelte';
	import Stagger from '#lib/fx/split-text/Stagger.svelte';
	import {
		pieceCount,
		revealEasing,
		revealStepCss,
		splitTextSchema,
		splitWords,
		totalTime
	} from '#lib/fx/split-text/split-text.js';
	import { supportsSiblingIndex } from '#lib/fx/split-text/support.js';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const stageSchema = defineSchema({
		subject: {
			kind: 'select',
			label: 'Subject',
			default: 'headline',
			options: ['headline', 'list'],
			group: 'Stage',
			description: 'headline: SplitText on a string. list: Stagger on ordinary list items.'
		}
	});

	const split = new ParamState(splitTextSchema);
	const scene = new ParamState(stageSchema);

	const textId = $props.id();
	let text = $state('Every letter takes its turn');
	let run = $state(0);

	const items = ['Design tokens', 'Components', 'Effects', 'Documentation', 'Release notes'];

	let native = $state<boolean>();
	onMount(() => (native = supportsSiblingIndex()));

	let inline = $derived(
		split.values.index === 'inline' || (split.values.index === 'auto' && native === false)
	);
	let source = $derived(
		split.values.index === 'sibling-index' || (split.values.index === 'auto' && native)
			? 'sibling-index()'
			: 'inline --i'
	);
	let count = $derived(
		scene.values.subject === 'list'
			? items.length
			: pieceCount(splitWords(text), split.values.split)
	);
	let total = $derived(totalTime(count, split.values));

	function reset() {
		split.reset();
		scene.reset();
		run++;
	}

	// Mirrors SplitText.svelte, filled in with the current settings.
	let cssCode = $derived.by(() => {
		const v = split.values;
		const chars = scene.values.subject === 'headline' && v.split === 'chars';
		const sel = scene.values.subject === 'list' ? '.list > *' : '.piece';
		return [
			`${sel} {`,
			...(scene.values.subject === 'headline' ? [`  display: inline-block;`] : []),
			chars
				? `  --_i: var(--i, calc(var(--w) + sibling-index() - 1));`
				: `  --_i: var(--i, calc(sibling-index() - 1));`,
			chars
				? `  --_n: var(--n); /* set on the wrapper: characters are only siblings within a word */`
				: `  --_n: var(--n, sibling-count());`,
			`  --_step: ${revealStepCss(v.order)};`,
			``,
			`  transition-property: opacity, translate, rotate, scale, filter;`,
			`  transition-duration: ${v.duration}ms;`,
			`  transition-timing-function: ${revealEasing(v.easing, v.bounce)};`,
			`  transition-delay: calc(var(--_step) * ${v.stagger}ms);`,
			`}`,
			``,
			`@media (prefers-reduced-motion: no-preference) {`,
			`  @starting-style {`,
			`    ${sel} {`,
			`      opacity: 0;`,
			...(v.distance ? [`      translate: 0 ${v.distance}px;`] : []),
			...(v.rotate ? [`      rotate: ${v.rotate}deg;`] : []),
			...(v.scale !== 1 ? [`      scale: ${v.scale};`] : []),
			...(v.blur ? [`      filter: blur(${v.blur}px);`] : []),
			`    }`,
			`  }`,
			`}`,
			``,
			`@media (prefers-reduced-motion: reduce) {`,
			`  ${sel} { transition: opacity 300ms ease-out; }`,
			`  @starting-style { ${sel} { opacity: 0; } }`,
			`}`
		].join('\n');
	});

	let markupCode = $derived.by(() => {
		const words = splitWords(text).slice(0, 2);
		if (split.values.split === 'words') {
			return [
				`<p class="split">`,
				`  <span class="visually-hidden">${text}</span>`,
				`  <span aria-hidden="true">`,
				...words.map(
					(w, i) => `    <span class="piece"${inline ? ` style="--i: ${i}"` : ''}>${w.text}</span>`
				),
				`    …`,
				`  </span>`,
				`</p>`
			].join('\n');
		}
		return [
			`<p class="split" style="--n: ${pieceCount(splitWords(text), 'chars')}">`,
			`  <span class="visually-hidden">${text}</span>`,
			`  <span aria-hidden="true">`,
			...words.flatMap((w) => [
				`    <span class="word" style="--w: ${w.offset}">`,
				...w.chars.map(
					(c, i) =>
						`      <span class="piece"${inline ? ` style="--i: ${w.offset + i}"` : ''}>${c}</span>`
				),
				`    </span>`
			]),
			`    …`,
			`  </span>`,
			`</p>`
		].join('\n');
	});
</script>

<svelte:head>
	<title>Split text · Visual FX</title>
	<meta
		name="description"
		content="Staggered split-text and list reveals with CSS sibling-index(), sibling-count() and @starting-style, an inline index fallback and an accessible name that stays intact, with an explanation of how it works."
	/>
</svelte:head>

<PlaygroundLayout stageLabel="Split text demo">
	{#snippet header()}
		<StageHeader title="Split text" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="stage" data-theme="dark">
			{#if scene.values.subject === 'headline'}
				<SplitText {...split.values} {text} as="h2" replay={run} class="headline" />
			{:else}
				<Stagger {...split.values} replay={run} class="list">
					{#each items as item (item)}
						<li>{item}</li>
					{/each}
				</Stagger>
			{/if}
			<div class="actions">
				<Button size="sm" onclick={() => run++}>Replay</Button>
				<p class="meta">
					{count} pieces · {total} ms · index from <code>{source}</code>
				</p>
			</div>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Split text" code={split.markup('SplitText')} onreset={reset}>
			<div class="text-field">
				<label for={textId}>Text</label>
				<input id={textId} type="text" bind:value={text} onchange={() => run++} />
			</div>
			<ParamControls schema={stageSchema} bind:values={scene.values} />
			<ParamControls schema={splitTextSchema} bind:values={split.values} />
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A reveal that counts its own pieces"
			lede="Letters that arrive one after another need two things per letter: a starting state to animate from, and a delay that grows with the letter's position. CSS can now supply both. @starting-style describes where an element comes from when it first appears, and sibling-index() tells an element where it stands among its siblings."
		>
			<h3>1. Splitting without losing the text</h3>
			<p>
				To move letters separately, each one needs its own element. Done naively, a screen reader
				then meets a heading made of 27 one-letter fragments, which some read letter by letter. So
				the component renders the text twice: once whole, visually hidden, for assistive technology;
				and once split into pieces inside an <code>aria-hidden</code> wrapper, for the eyes. The
				hidden copy is <code>user-select: none</code>, so copying the heading yields the text once.
				<code>aria-label</code> on the heading would also work for headings, but it is not allowed
				on generic elements like <code>&lt;p&gt;</code> or <code>&lt;span&gt;</code>, so the hidden
				copy is the one approach that works for every tag.
			</p>
			<p>
				Characters are split into graphemes with <code>Intl.Segmenter</code>, so "é" written as e
				plus a combining accent, or an emoji with a skin tone, stays one piece. Each word is wrapped
				in a
				<code>white-space: nowrap</code> box so lines only break between words; the spaces between words
				are ordinary text.
			</p>
			<CodeSnippet code={markupCode} />

			<h3>2. The entry: @starting-style</h3>
			<p>
				A CSS transition needs a "before" value, and a freshly inserted element has none: it is
				simply rendered in its final style. <code>@starting-style</code> supplies one. Its rules apply
				only to an element's very first style computation, so each piece starts transparent, shifted and
				blurred, and immediately transitions to its normal style. No JavaScript runs for the animation,
				and nothing has to be removed afterwards.
			</p>
			<p>
				Replay works by rendering the pieces anew (a Svelte <code>{'{#key}'}</code> block): new elements
				get their starting style again.
			</p>

			<h3>3. The delay: sibling-index()</h3>
			<p>
				<code>sibling-index()</code> is the element's position among its siblings, starting at 1,
				and
				<code>sibling-count()</code> the number of siblings. Both are numbers you can use in
				<code>calc()</code>:
				<code>transition-delay: calc((sibling-index() - 1) * {split.values.stagger}ms)</code>. With
				the count, the order can run backwards (<code>n - 1 - i</code>) or out from the middle (<code
					>|i - (n - 1) / 2|</code
				>, written as <code>max(x, -x)</code>).
			</p>
			<p>
				They count element siblings in the DOM, nothing else. For words that is exactly right: every
				word is a child of the same wrapper. For characters it is not, because each character is a
				child of its word box and the count restarts in every word. The word box therefore carries
				its character offset as <code>--w</code>, the character adds its
				<code>sibling-index()</code>, and the total count comes from the wrapper. Still one custom
				property per word instead of one per character.
			</p>
			<p>This is the CSS for your current settings:</p>
			<CodeSnippet code={cssCode} />

			<h3>4. The fallback: an inline index</h3>
			<p>
				Where <code>sibling-index()</code> is unknown, the component writes the index itself, as a
				<code>--i</code> custom property on every piece. The CSS reads
				<code>var(--i, calc(sibling-index() - 1))</code>: the inline value when there is one, the
				function otherwise. <code>CSS.supports('z-index', 'sibling-index()')</code> answers
				reliably, because browsers that don't know the function reject the value. Before that check
				has run (on the prerendered page) the inline index is always written, so the first reveal is
				staggered everywhere. Set <em>Index source</em> to compare both; the result is identical.
				Forcing
				<code>sibling-index</code> in a browser without it leaves the declaration invalid, and the delay
				falls back to 0: everything arrives at once.
			</p>
			<p>
				The list subject uses <code>Stagger</code>, which applies the same rules to whatever
				children you give it. Its fallback writes <code>--i</code> and <code>--n</code> onto the children
				from script, right after they are inserted and before the browser styles them.
			</p>

			<h3>Motion and accessibility</h3>
			<ul>
				<li>
					Under <code>prefers-reduced-motion: reduce</code> the pieces only fade in, all together, in
					300 ms. No movement, blur or stagger.
				</li>
				<li>
					The reveal is a single transition that ends on its own, here after {total} ms. It is not paused
					by the <em>Pause animations</em> regions on other pages, which pause CSS animations, not transitions.
					Keep long texts short on stagger: content that moves for more than five seconds needs a way
					to stop it (WCAG 2.2.2).
				</li>
				<li>
					Screen readers get the whole text once, from the hidden copy; the pieces are
					<code>aria-hidden</code>. The text is real text before, during and after the reveal.
				</li>
				<li>
					Splitting into inline-blocks disables kerning and ligatures across pieces, and can break
					scripts whose letters join (Arabic, Devanagari). Use word mode for those.
				</li>
			</ul>

			<h3>Browser support</h3>
			<p class="note">
				<code>sibling-index()</code> and <code>sibling-count()</code> are Baseline newly available
				since 2026-08-18 (Chrome 138, Firefox 154, Safari 26.2) and <code>@starting-style</code>
				since 2024-08-06, per web-features 3.44.0. The <code>linear()</code> easing behind the
				spring is Baseline widely available. Without <code>sibling-index()</code> the inline index
				takes over; without <code>@starting-style</code> the text simply appears, with no reveal. Tested
				in Chromium 156 only; Firefox and Safari are untested.
			</p>

			<h3>Performance notes</h3>
			<ul>
				<li>
					<strong>Opacity and transforms are cheap; blur is not.</strong> Each blurred piece is a
					separate filter while it sharpens. For long paragraphs in character mode, set
					<em>Blur</em> to 0 (judgment).
				</li>
				<li>
					<strong>Every character is an element.</strong> A few hundred are fine; split whole articles
					by word, or not at all.
				</li>
				<li>Once the reveal has finished, nothing runs: the pieces are static inline boxes.</li>
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
		background: radial-gradient(circle at 50% 35%, oklch(24% 0.06 300), oklch(11% 0.02 280));
		color: oklch(96% 0.01 290);
	}

	/* Above the control panel, which docks to the bottom on narrow screens. */
	@media (width < 40rem) {
		.stage {
			align-content: start;
			padding-block-start: var(--space-16);
		}
	}

	.stage :global(.headline) {
		max-inline-size: 16ch;
		font-size: clamp(2.5rem, 7vw, 5rem);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: -0.02em;
		text-align: center;
	}

	.stage :global(.list) {
		display: grid;
		gap: var(--space-2);
		inline-size: min(22rem, 80vw);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.stage :global(.list li) {
		padding: var(--space-3) var(--space-5);
		border: 1px solid oklch(100% 0 0 / 0.1);
		border-radius: var(--radius-lg);
		background: oklch(22% 0.04 290);
	}

	.actions {
		display: grid;
		justify-items: center;
		gap: var(--space-2);
	}

	.meta {
		color: oklch(80% 0.02 290);
		font-size: var(--text-sm);
	}

	.text-field {
		display: grid;
		gap: var(--space-1);
		margin-block-end: var(--space-4);
		font-size: var(--text-sm);
	}

	.text-field input {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-control-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}
</style>
