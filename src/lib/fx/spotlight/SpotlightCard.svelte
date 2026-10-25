<!--
@component
One card of a `SpotlightGrid`. Renders a link when `href` is set, an `<article>` otherwise.

Reads the glow settings and `--spotlight-x/y` from the grid and its own offset
(`--spotlight-card-x/y`, written by the grid) to place the glow in its own coordinates. The glow
is painted twice: in the border ring (a masked pseudo-element) and faintly on the face.

The face is a fixed dark color and the text light; the grid caps the face glow so descriptions
keep ≥ 4.5:1 (see `maxSurfaceAlpha`). If you change `--spotlight-card-bg`, check contrast yourself.

Tokens: `--spotlight-card-bg`, `--spotlight-card-color`, `--spotlight-card-padding`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Makes the whole card a link. Pass an already resolved URL. */
		href?: string;
		children?: Snippet;
	};

	let { href, class: className, children, ...rest }: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : 'article'}
	{href}
	class={['spotlight-card', className]}
	data-spotlight-card
	{...rest}
>
	{@render children?.()}
</svelte:element>

<style>
	.spotlight-card {
		/* The light, in this card's coordinates. */
		--_x: calc(var(--spotlight-x, 0px) - var(--spotlight-card-x, 0px));
		--_y: calc(var(--spotlight-y, 0px) - var(--spotlight-card-y, 0px));
		--_on: var(--spotlight-on, 0);
		--_light: radial-gradient(
			var(--_glow-radius, 280px) circle at var(--_x) var(--_y),
			var(--_c1, #a78bfa),
			var(--_c2, #22d3ee) 45%,
			transparent 100%
		);

		position: relative;
		isolation: isolate;
		display: block;
		padding: var(--spotlight-card-padding, var(--space-6));
		border: var(--_bw, 1.5px) solid var(--spotlight-rest-border, oklch(100% 0 0 / 0.14));
		border-radius: var(--_radius, 16px);
		background: var(--spotlight-card-bg, #15131f);
		color: var(--spotlight-card-color, #f3f1fa);
		text-decoration: none;
	}

	/* Keyboard focus lights the focused card from its center, regardless of the pointer. */
	.spotlight-card:focus-visible,
	.spotlight-card:has(:global(:focus-visible)) {
		--_x: 50%;
		--_y: 50%;
		--_on: 1;
	}

	.spotlight-card::before,
	.spotlight-card::after {
		content: '';
		position: absolute;
		/* Cover the border box, so the glow's origin matches the measured card box. */
		inset: calc(-1 * var(--_bw, 1.5px));
		border-radius: inherit;
		background: var(--_light);
		opacity: 0;
		transition: opacity var(--duration-slow) var(--ease-out);
		pointer-events: none;
	}

	/* Border ring: the whole box minus the content box leaves only the padding (= border width). */
	.spotlight-card::before {
		padding: var(--_bw, 1.5px);
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
		opacity: calc(var(--_on) * var(--_border, 1));
	}

	/* Face: the same light, faint, behind the content. */
	.spotlight-card::after {
		z-index: -1;
		opacity: calc(var(--_on) * var(--_surface, 0.12));
	}
</style>
