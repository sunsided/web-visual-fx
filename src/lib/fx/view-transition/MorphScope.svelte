<!--
@component
A box in which layout changes (reordering, switching layout, opening a detail view) morph instead
of jumping. Call the `morph(update)` function the children snippet receives with an update that
changes state; give every element that should move on its own a name from `name(...)` and the
class `vfx-morph`:

```svelte
<MorphScope>
  {#snippet children({ morph, name })}
    <button onclick={() => morph(() => items.reverse())}>Reverse</button>
    {#each items as item (item.id)}
      <div style:view-transition-name={name('card', item.id)} style:view-transition-class="vfx-morph">…</div>
    {/each}
  {/snippet}
</MorphScope>
```

Elements with the same name before and after the update are matched: the browser animates the
snapshot from the old box to the new one (position and size), cross-fading the two images. Names
are prefixed with this scope's id, so they stay unique even in a document-wide transition.

Element-scoped where supported (Chrome 147+) and `scoped` is on; document-wide otherwise; instant
without support, under reduced motion and inside `[data-motion="paused"]`.
-->
<script module lang="ts">
	/** Runs `update` inside a view transition. */
	export type Morph = (update: () => void) => void;
	/** A `view-transition-name` unique to this scope. */
	export type MorphName = (...parts: (string | number)[]) => string;
</script>

<script lang="ts">
	import { flushSync, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		easingValue,
		morphDefaults as d,
		runViewTransition,
		transitionName,
		type MorphOptions
	} from './view-transition.js';

	type Props = Partial<MorphOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof MorphOptions | 'children'> & {
			children?: Snippet<[{ morph: Morph; name: MorphName }]>;
		};

	let {
		duration = d.duration,
		easing = d.easing,
		scoped = d.scoped,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	let box = $state<HTMLDivElement>();

	const name: MorphName = (...parts) => transitionName(uid, ...parts);

	const morph: Morph = (update) => {
		runViewTransition(() => flushSync(update), {
			scope: box,
			scoped,
			vars: {
				'--vfx-morph-duration': `${duration}ms`,
				'--vfx-morph-easing': easingValue(easing)
			}
		});
	};
</script>

<div bind:this={box} class={['morph-scope', className]} {...rest}>
	{@render children?.({ morph, name })}
</div>

<style>
	/* Element-scoped, this box is the group root: give it the same timing as the items. */
	.morph-scope {
		view-transition-class: vfx-morph;
	}

	/* The pseudo-elements inherit from the transition root, where runViewTransition sets these. */
	:global(::view-transition-group(*.vfx-morph)),
	:global(::view-transition-old(*.vfx-morph)),
	:global(::view-transition-new(*.vfx-morph)) {
		animation-duration: var(--vfx-morph-duration, 450ms);
		animation-timing-function: var(--vfx-morph-easing, ease-in-out);
	}
</style>
