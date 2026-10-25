<!--
@component
Floating action button whose items ooze out of it when toggled.

The goo is only painted on a decorative layer of plain circles behind the controls. The real
buttons sit on top, unfiltered, so their labels and focus rings stay sharp: running text or an
outline through the alpha threshold would eat thin strokes. The toggle is a real button with
`aria-expanded`, first in the DOM so Tab goes toggle → items; closed items are `inert`. Escape closes the menu and returns focus to the toggle.

Tokens: `--gooey-menu-size` (toggle diameter), `--gooey-menu-item-size`.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import GooFilter from './GooFilter.svelte';
	import {
		gooDefaults,
		gooeyMenuDefaults as d,
		inkFor,
		menuOffsets,
		type GooOptions,
		type MenuItem,
		type GooeyMenuOptions
	} from './gooey.js';

	type Props = Partial<Pick<GooOptions, 'blur' | 'sharpness' | 'offset' | 'region'>> &
		Partial<GooeyMenuOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof GooeyMenuOptions | 'onselect'> & {
			items: MenuItem[];
			open?: boolean;
			/** Accessible name of the toggle. */
			label?: string;
			onselect?: (item: MenuItem) => void;
		};

	let {
		blur = gooDefaults.blur,
		sharpness = gooDefaults.sharpness,
		offset = gooDefaults.offset,
		region = gooDefaults.region,
		color = d.color,
		layout = d.layout,
		distance = d.distance,
		items,
		open = $bindable(false),
		label = 'Actions',
		onselect,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const filterId = `goo-menu-${uid}`;
	const listId = `goo-menu-items-${uid}`;

	let toggleEl = $state<HTMLButtonElement>();
	let offsets = $derived(menuOffsets(items.length, layout, distance));

	function close() {
		open = false;
		toggleEl?.focus();
	}

	function select(item: MenuItem) {
		onselect?.(item);
		close();
	}

	function keydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			close();
		}
	}
</script>

<!-- Escape bubbles up from whichever button has focus. -->
<div
	class={['gooey-menu', className, { open }]}
	style:--_color={color}
	style:--_ink={inkFor(color)}
	onkeydown={keydown}
	{...rest}
>
	<svg class="defs" aria-hidden="true">
		<GooFilter id={filterId} {blur} {sharpness} {offset} {region} keepColors={false} />
	</svg>

	<div class="shapes" aria-hidden="true" style:filter="url(#{filterId})">
		{#each offsets as o, i (i)}
			<span class="shape item-shape" style:--_x="{o.x}px" style:--_y="{o.y}px" style:--_i={i}
			></span>
		{/each}
		<span class="shape toggle-shape"></span>
	</div>

	<button
		bind:this={toggleEl}
		type="button"
		class="toggle"
		aria-label={label}
		aria-expanded={open}
		aria-controls={listId}
		onclick={() => (open = !open)}
	>
		<span class="plus" aria-hidden="true">+</span>
	</button>
	<ul id={listId} class="items" inert={!open}>
		{#each items as item, i (item.label)}
			<li>
				<button
					type="button"
					class="item"
					style:--_x="{offsets[i].x}px"
					style:--_y="{offsets[i].y}px"
					style:--_i={i}
					aria-label={item.label}
					onclick={() => select(item)}
				>
					<span aria-hidden="true">{item.icon}</span>
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	.gooey-menu {
		--_size: var(--gooey-menu-size, 3.5rem);
		--_item: var(--gooey-menu-item-size, 2.75rem);
		--_ease: cubic-bezier(0.34, 1.56, 0.64, 1);

		position: relative;
		inline-size: var(--_size);
		block-size: var(--_size);
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	.shapes,
	.items {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Everything is centered on the toggle and moved out by translate. */
	.shape,
	.item {
		position: absolute;
		inset: 50% auto auto 50%;
		inline-size: var(--_item);
		block-size: var(--_item);
		margin: calc(var(--_item) / -2);
		border-radius: 50%;
		transition: translate var(--duration-slow) var(--_ease) calc(var(--_i) * 40ms);
	}

	.shape {
		background: var(--_color);
	}

	.toggle-shape {
		inline-size: var(--_size);
		block-size: var(--_size);
		margin: calc(var(--_size) / -2);
	}

	.open .item-shape,
	.open .item {
		translate: var(--_x) var(--_y);
	}

	.item,
	.toggle {
		display: grid;
		place-items: center;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--_ink);
		font-size: var(--text-md);
		line-height: 1;
		cursor: pointer;
	}

	.item:hover,
	.toggle:hover {
		background: color-mix(in oklch, var(--_ink) 15%, transparent);
	}

	/* Hidden once the closing transition is over, so closed items can't be clicked. */
	.gooey-menu:not(.open) .item {
		visibility: hidden;
		transition:
			translate var(--duration-slow) var(--_ease),
			visibility 0s linear var(--duration-slow);
	}

	/* Above the (closed) items, which come later in the DOM. */
	.toggle {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 50%;
		font-size: var(--text-xl);
	}

	.plus {
		transition: rotate var(--duration-base) var(--ease-out);
	}

	.open .plus {
		rotate: 45deg;
	}

	@media (prefers-reduced-motion: reduce) {
		.shape,
		.item,
		.gooey-menu:not(.open) .item,
		.plus {
			transition: none;
		}
	}

	@media (forced-colors: active) {
		.item,
		.toggle {
			border: 1px solid ButtonText;
		}
	}
</style>
