<!--
@component
Gradient-filled and/or outlined text. The children stay real text: the gradient is a background
clipped to the glyphs (`background-clip: text`), the outline is `-webkit-text-stroke`, and
`paint-order: stroke fill` moves the stroke outside the letters.

Every visual parameter is a prop (see `gradientTextSchema`). Renders an inline `<span>`, so it
can sit inside a heading or a sentence.

Fallbacks: where `background-clip: text` isn't supported the text is painted in `solid`; in
forced-colors mode the system text color wins. The rotation runs on a registered `<angle>`
property, stops under `prefers-reduced-motion: reduce` and pauses inside a
`[data-motion='paused']` region.

Tokens: `--gradient-text-image` (replaces the generated gradient).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		gradientImage,
		gradientTextDefaults as d,
		stopsOf,
		strokeWidth,
		type GradientTextOptions
	} from './gradient-text.js';

	type Props = Partial<GradientTextOptions> &
		Omit<HTMLAttributes<HTMLSpanElement>, keyof GradientTextOptions> & {
			children?: Snippet;
		};

	let {
		fill = d.fill,
		gradient = d.gradient,
		palette = d.palette,
		color1 = d.color1,
		color2 = d.color2,
		color3 = d.color3,
		solid = d.solid,
		angle = d.angle,
		animate = d.animate,
		duration = d.duration,
		stroke = d.stroke,
		strokeColor = d.strokeColor,
		strokeOutside = d.strokeOutside,
		class: className,
		children,
		...rest
	}: Props = $props();

	let image = $derived(
		gradientImage(gradient, stopsOf({ palette, color1, color2, color3 }), 'var(--gt-angle)')
	);
	let width = $derived(strokeWidth({ stroke, strokeOutside, fill }));
</script>

<span
	class={[
		'gradient-text',
		`fill-${fill}`,
		{ stroked: width > 0, outside: strokeOutside && fill !== 'none', animate },
		className
	]}
	style:--_image={image}
	style:--_solid={solid}
	style:--_angle="{angle}deg"
	style:--_duration="{duration}s"
	style:--_stroke="{width}em"
	style:--_stroke-color={strokeColor}
	{...rest}>{@render children?.()}</span
>

<style>
	@property --gt-angle {
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}

	.gradient-text {
		--gt-angle: var(--_angle);

		/* Also the fallback: what you get where background-clip: text isn't supported. */
		color: var(--_solid);
	}

	.stroked {
		-webkit-text-stroke: var(--_stroke) var(--_stroke-color);
	}

	/* The stroke is painted first, the fill covers its inner half. */
	.outside {
		paint-order: stroke fill;
	}

	.fill-none {
		-webkit-text-fill-color: transparent;
	}

	/*
	 * Both spellings: Safari and Chromium before 120 only know the prefixed one, Firefox knows
	 * both. Inside @supports, so the transparent fill never applies without the clip (that would
	 * leave invisible text on a gradient box).
	 */
	@supports (background-clip: text) or (-webkit-background-clip: text) {
		.fill-gradient {
			background-image: var(--gradient-text-image, var(--_image));
			-webkit-background-clip: text;
			background-clip: text;
			-webkit-text-fill-color: transparent;
		}

		/* Selected text would be transparent too; paint it like normal selected text. */
		.fill-gradient::selection,
		.fill-gradient :global(*::selection) {
			-webkit-text-fill-color: HighlightText;
			color: HighlightText;
			background-color: Highlight;
		}
	}

	.animate.fill-gradient {
		animation: gt-turn var(--_duration) linear infinite;
	}

	@keyframes gt-turn {
		to {
			--gt-angle: calc(var(--_angle) + 360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate.fill-gradient {
			animation: none;
		}
	}

	/* Forced colors: no gradient, no transparent fill, the system text color. */
	@media (forced-colors: active) {
		.gradient-text {
			background: none;
			-webkit-text-fill-color: currentColor;
			-webkit-text-stroke: 0;
		}
	}
</style>
