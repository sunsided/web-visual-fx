<!--
@component
Grid of `SpotlightCard`s lit by one radial glow that follows the pointer across the whole grid:
it shows strongly in the card borders and faintly on the card faces.

One pointer listener on the grid writes two custom properties, `--spotlight-x/y` (pointer
position relative to the grid, px), at most once per frame. Each card's offset inside the grid is
measured only when the layout changes and stored on the card as `--spotlight-card-x/y`; CSS
subtracts the two, so a pointer move costs the same for 6 cards or 600.

Without a pointer the glow is off and the cards show a plain border. A card that has keyboard
focus (or contains the focused element) gets the glow centered on itself. Use `pinned` for a
fixed light position (previews, screenshots).

Tokens: `--spotlight-columns` (min column width), `--spotlight-rest-border`.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		cardOffsets,
		safeSurfaceAlpha,
		spotlightDefaults as d,
		type SpotlightOptions
	} from './spotlight';

	type Props = Partial<SpotlightOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof SpotlightOptions> & {
			/** Fixed light position relative to the grid, in px. Disables pointer tracking. */
			pinned?: { x: number; y: number };
			children?: Snippet;
		};

	let {
		glowRadius = d.glowRadius,
		color = d.color,
		twoTone = d.twoTone,
		colorB = d.colorB,
		borderIntensity = d.borderIntensity,
		surfaceIntensity = d.surfaceIntensity,
		borderWidth = d.borderWidth,
		radius = d.radius,
		gap = d.gap,
		pinned,
		class: className,
		children,
		...rest
	}: Props = $props();

	let grid = $state<HTMLDivElement>();
	let active = $state(false);

	let surface = $derived(safeSurfaceAlpha(surfaceIntensity, { color, colorB, twoTone }));

	// Pointer position waiting for the next frame; plain variables, they never reach the markup.
	let pending: { x: number; y: number } | undefined;
	let raf = 0;

	function measure() {
		if (!grid) return;
		const cards = [...grid.querySelectorAll<HTMLElement>('[data-spotlight-card]')];
		const offsets = cardOffsets(
			grid.getBoundingClientRect(),
			cards.map((c) => c.getBoundingClientRect())
		);
		cards.forEach((card, i) => {
			card.style.setProperty('--spotlight-card-x', `${offsets[i].x}px`);
			card.style.setProperty('--spotlight-card-y', `${offsets[i].y}px`);
		});
	}

	function frame() {
		raf = 0;
		if (!grid || !pending) return;
		const r = grid.getBoundingClientRect();
		grid.style.setProperty('--spotlight-x', `${Math.round(pending.x - r.left)}px`);
		grid.style.setProperty('--spotlight-y', `${Math.round(pending.y - r.top)}px`);
	}

	function move(e: PointerEvent) {
		if (pinned) return;
		pending = { x: e.clientX, y: e.clientY };
		active = true;
		raf ||= requestAnimationFrame(frame);
	}

	function enter(e: PointerEvent) {
		measure();
		move(e);
	}

	function leave() {
		active = false;
	}

	// Offsets change whenever the grid or a card is resized or reflows (gap, columns, fonts), and
	// when cards are added or removed. A MutationObserver keeps the set of observed cards current.
	onMount(() => {
		const root = grid;
		if (!root) return;
		const resize = new ResizeObserver(measure);
		const observeAll = () => {
			resize.disconnect();
			resize.observe(root);
			for (const card of root.querySelectorAll('[data-spotlight-card]')) resize.observe(card);
		};
		observeAll();
		const mutation = new MutationObserver(() => {
			observeAll();
			measure();
		});
		mutation.observe(root, { childList: true, subtree: true });
		return () => {
			resize.disconnect();
			mutation.disconnect();
			cancelAnimationFrame(raf);
		};
	});

	// Gap changes move cards without resizing them.
	$effect(() => {
		void gap;
		measure();
	});
</script>

<div
	class={['spotlight', className]}
	bind:this={grid}
	style:--spotlight-x={pinned ? `${pinned.x}px` : undefined}
	style:--spotlight-y={pinned ? `${pinned.y}px` : undefined}
	style:--spotlight-on={pinned || active ? 1 : 0}
	style:--_glow-radius="{glowRadius}px"
	style:--_c1={color}
	style:--_c2={twoTone ? colorB : `color-mix(in srgb, ${color} 45%, transparent)`}
	style:--_border={borderIntensity}
	style:--_surface={surface}
	style:--_bw="{borderWidth}px"
	style:--_radius="{radius}px"
	style:gap="{gap}px"
	onpointerenter={enter}
	onpointermove={move}
	onpointerleave={leave}
	onpointercancel={leave}
	{...rest}
>
	{@render children?.()}
</div>

<style>
	/* Registered so it can be animated (see SpotlightPreview); a plain length otherwise. */
	@property --spotlight-x {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}

	@property --spotlight-y {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}

	.spotlight {
		display: grid;
		grid-template-columns: repeat(
			auto-fill,
			minmax(min(var(--spotlight-columns, 15rem), 100%), 1fr)
		);
	}
</style>
