import { MediaQuery } from 'svelte/reactivity';
import { clockStep, frameDue } from './ripple.js';

export interface FlowClockOptions {
	/** Whether the effect wants to move at all (its `animate` prop). */
	enabled: boolean;
	/** Frame-rate cap. */
	fps: number;
	/** Explicit pause from the host, on top of the automatic ones. */
	paused?: boolean;
}

/**
 * Animation clock for filter effects that move noise: `time` counts seconds of motion and only
 * advances while someone can see it move. It stands still
 * - when the user prefers reduced motion,
 * - inside a `[data-motion="paused"]` region (see `MotionToggle`; checked on every frame, so it
 *   also works inside a custom element's shadow root),
 * - while the element is offscreen or the tab is hidden (the loop stops entirely then),
 * - when `options().paused` is set.
 *
 * Frames are capped at `fps`: each one reruns the whole SVG filter, which is the expensive part.
 *
 * Create it during component initialisation (it owns an `$effect`) and attach it to the
 * animated element with `{@attach clock.attach}`.
 */
export class FlowClock {
	/** Seconds of animation so far. Read it to derive per-frame filter attributes. */
	time = $state(0);

	#node = $state<HTMLElement>();
	#onScreen = $state(true);
	#pageVisible = $state(true);
	#reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');
	#options: () => FlowClockOptions;

	constructor(options: () => FlowClockOptions) {
		this.#options = options;

		$effect(() => {
			const { enabled, fps, paused } = this.#options();
			const node = this.#node;
			if (!node || !enabled || paused || !this.moving) return;
			let last = performance.now();
			const tick = (now: number) => {
				raf = requestAnimationFrame(tick);
				if (!frameDue(last, now, fps)) return;
				if (!node.closest('[data-motion="paused"]')) this.time += clockStep(now - last);
				last = now;
			};
			let raf = requestAnimationFrame(tick);
			return () => cancelAnimationFrame(raf);
		});
	}

	/** False while reduced motion is preferred, the element is offscreen or the tab is hidden. */
	get moving(): boolean {
		return !this.#reducedMotion.current && this.#onScreen && this.#pageVisible;
	}

	/** Attachment: tracks the element's visibility and enables the loop. */
	attach = (node: HTMLElement) => {
		this.#node = node;
		const observer = new IntersectionObserver(([entry]) => (this.#onScreen = entry.isIntersecting));
		observer.observe(node);
		const update = () => (this.#pageVisible = !document.hidden);
		update();
		document.addEventListener('visibilitychange', update);
		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', update);
			this.#node = undefined;
		};
	};
}
