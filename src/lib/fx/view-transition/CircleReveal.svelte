<!--
@component
A box whose state changes are revealed by a circle growing from the pointer: the classic theme
toggle. Call the `reveal(update, event)` function the children snippet receives, with an update
that changes what the box shows (for example its `data-theme`, passed through `rest`).

`reveal` starts a view transition and, once its snapshots exist, animates `clip-path: circle()` on
the new snapshot from the click position (from the center of the activated control for keyboard
clicks) to the farthest corner. The default cross-fade of this box is switched off, so the old
state stays fully visible under the growing circle.

Where supported (Chrome 147+) and `scoped` is on, the transition is element-scoped: only this box
takes part and the rest of the page stays interactive. Otherwise the whole document transitions
and the box gets a temporary `view-transition-name`. Without view transitions, under reduced
motion and inside `[data-motion="paused"]` the update applies instantly.
-->
<script module lang="ts">
	/** Runs `update` behind a circular reveal; pass the triggering event for the origin. */
	export type Reveal = (update: () => void, event?: Event) => void;
</script>

<script lang="ts">
	import { flushSync, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		circleClipFrames,
		circleRevealDefaults as d,
		easingValue,
		revealOrigin,
		revealRadius,
		runViewTransition,
		transitionName,
		type CircleRevealOptions,
		type Point
	} from './view-transition.js';

	type Props = Partial<CircleRevealOptions> &
		Omit<HTMLAttributes<HTMLDivElement>, keyof CircleRevealOptions | 'children'> & {
			children?: Snippet<[{ reveal: Reveal }]>;
		};

	let {
		duration = d.duration,
		easing = d.easing,
		origin = d.origin,
		scoped = d.scoped,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	let box = $state<HTMLDivElement>();

	/** Client position of a real pointer, or the center of the control a keyboard activated. */
	function pointOf(event?: Event): Point | null {
		if (event instanceof MouseEvent) {
			const fromPointer =
				event.detail > 0 || (event instanceof PointerEvent && event.pointerType !== '');
			if (fromPointer && (event.clientX || event.clientY)) {
				return { x: event.clientX, y: event.clientY };
			}
		}
		if (event?.currentTarget instanceof Element) {
			const r = event.currentTarget.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}
		return null;
	}

	const reveal: Reveal = (update, event) => {
		const el = box;
		if (!el) return update();
		const rect = el.getBoundingClientRect();
		const client = pointOf(event);
		const point = client && { x: client.x - rect.left, y: client.y - rect.top };
		const from = revealOrigin(origin, point, rect);
		const frames = circleClipFrames(from, revealRadius(from, rect));

		const run = runViewTransition(() => flushSync(update), {
			scope: el,
			scoped,
			scopeName: transitionName(uid, 'reveal')
		});
		if (!run.transition || !run.root) return;
		const { root, scopeGroup } = run;
		run.transition.ready
			.then(() => {
				root.animate(
					{ clipPath: frames },
					{
						duration,
						easing: easingValue(easing),
						fill: 'both',
						pseudoElement: `::view-transition-new(${scopeGroup})`
					}
				);
			})
			.catch(() => {});
	};
</script>

<div bind:this={box} class={['circle-reveal', className]} {...rest}>
	{@render children?.({ reveal })}
</div>

<style>
	.circle-reveal {
		/* Lets the global rules below find this box's snapshots, whatever its group is named. */
		view-transition-class: vfx-circle-reveal;
	}

	/* No cross-fade: the old state stays put, the new one is uncovered by the clip-path animation. */
	:global(::view-transition-old(*.vfx-circle-reveal)),
	:global(::view-transition-new(*.vfx-circle-reveal)) {
		animation: none;
		mix-blend-mode: normal;
	}
</style>
