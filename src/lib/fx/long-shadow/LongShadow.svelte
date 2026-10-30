<!--
@component
Long shadow or extruded 3D text: a generated list of hard-edged `text-shadow` copies along an
angle, with a color ramp (and optional fade) mixed by `color-mix()`. The children stay real,
selectable text; nothing is duplicated in the DOM.

Every visual parameter is a prop (see `longShadowSchema`). Renders an inline `<span>`, so it can
sit inside a heading. Static: no motion.

Tokens: `--long-shadow-face` (overrides the text color).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		longShadowDefaults as d,
		longShadowLayers,
		type LongShadowOptions
	} from './long-shadow.js';

	type Props = Partial<LongShadowOptions> &
		Omit<HTMLAttributes<HTMLSpanElement>, keyof LongShadowOptions> & {
			children?: Snippet;
		};

	let {
		face = d.face,
		from = d.from,
		to = d.to,
		space = d.space,
		fade = d.fade,
		angle = d.angle,
		length = d.length,
		steps = d.steps,
		ambient = d.ambient,
		class: className,
		children,
		...rest
	}: Props = $props();

	let shadow = $derived(
		longShadowLayers({ face, from, to, space, fade, angle, length, steps, ambient }).join(', ')
	);
</script>

<span class={['long-shadow', className]} style:--_face={face} style:text-shadow={shadow} {...rest}
	>{@render children?.()}</span
>

<style>
	.long-shadow {
		color: var(--long-shadow-face, var(--_face));
	}

	/* The shadow is decoration; the system colors are what has to stay readable. */
	@media (forced-colors: active) {
		.long-shadow {
			text-shadow: none;
		}
	}
</style>
