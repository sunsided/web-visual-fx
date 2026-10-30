import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { supportsScopedViewTransitions, supportsViewTransitions } from './support.js';

/*
 * View transitions: the browser snapshots the old state, runs an update, snapshots the new state
 * and cross-fades between them in a tree of pseudo-elements that CSS and the Web Animations API can
 * restyle. The math here is pure; `runViewTransition` is the one function that touches the DOM.
 */

export const TRANSITION_EASINGS = ['ease-in-out', 'ease-out', 'linear', 'emphasized'] as const;
export type TransitionEasing = (typeof TRANSITION_EASINGS)[number];

export const REVEAL_ORIGINS = ['pointer', 'center', 'top-left'] as const;
export type RevealOrigin = (typeof REVEAL_ORIGINS)[number];

const scoped = (group: string) =>
	({
		kind: 'toggle',
		label: 'Element-scoped',
		default: true,
		group,
		description:
			'Use element.startViewTransition() where supported (Chrome 147+): only this box takes part and the rest of the page stays interactive. Otherwise, or when off, the whole document transitions.'
	}) as const;

export const circleRevealSchema = defineSchema({
	duration: {
		kind: 'range',
		label: 'Duration',
		default: 650,
		min: 150,
		max: 2000,
		step: 50,
		unit: 'ms',
		group: 'Reveal'
	},
	easing: {
		kind: 'select',
		label: 'Easing',
		default: 'ease-in-out',
		options: TRANSITION_EASINGS,
		group: 'Reveal'
	},
	origin: {
		kind: 'select',
		label: 'Origin',
		default: 'pointer',
		options: REVEAL_ORIGINS,
		group: 'Reveal',
		description:
			'Where the circle grows from. pointer uses the click position; keyboard activation uses the center of the activated control.'
	},
	scoped: scoped('Reveal')
});

export type CircleRevealOptions = Values<typeof circleRevealSchema>;
export const circleRevealDefaults: CircleRevealOptions = defaultsOf(circleRevealSchema);

export const morphSchema = defineSchema({
	duration: {
		kind: 'range',
		label: 'Duration',
		default: 450,
		min: 100,
		max: 1500,
		step: 50,
		unit: 'ms',
		group: 'Morph'
	},
	easing: {
		kind: 'select',
		label: 'Easing',
		default: 'emphasized',
		options: TRANSITION_EASINGS,
		group: 'Morph',
		description: 'emphasized starts fast and settles slowly: cubic-bezier(0.2, 0, 0, 1).'
	},
	scoped: scoped('Morph')
});

export type MorphOptions = Values<typeof morphSchema>;
export const morphDefaults: MorphOptions = defaultsOf(morphSchema);

/** CSS `<easing-function>` for an easing option. */
export function easingValue(easing: TransitionEasing): string {
	return easing === 'emphasized' ? 'cubic-bezier(0.2, 0, 0, 1)' : easing;
}

export interface Point {
	x: number;
	y: number;
}

/**
 * Origin of the reveal in the box's own coordinates (px from its top left corner). `point` is the
 * pointer position relative to the box, or null without one (keyboard); it is clamped into the box.
 */
export function revealOrigin(
	origin: RevealOrigin,
	point: Point | null,
	size: { width: number; height: number }
): Point {
	if (origin === 'top-left') return { x: 0, y: 0 };
	if (origin === 'pointer' && point) {
		return {
			x: Math.min(size.width, Math.max(0, point.x)),
			y: Math.min(size.height, Math.max(0, point.y))
		};
	}
	return { x: size.width / 2, y: size.height / 2 };
}

/** Radius that covers the whole box from `origin`: the distance to the farthest corner. */
export function revealRadius(origin: Point, size: { width: number; height: number }): number {
	return Math.hypot(
		Math.max(origin.x, size.width - origin.x),
		Math.max(origin.y, size.height - origin.y)
	);
}

/** `clip-path` keyframes for a circle growing from `origin` until it covers the box. */
export function circleClipFrames(origin: Point, radius: number): [string, string] {
	const at = `at ${Math.round(origin.x)}px ${Math.round(origin.y)}px`;
	return [`circle(0px ${at})`, `circle(${Math.ceil(radius)}px ${at})`];
}

/**
 * A valid, unique-looking `view-transition-name` from arbitrary parts (ids, labels). Characters
 * outside `[A-Za-z0-9_-]` become `_`; the `vt-` prefix keeps it from starting with a digit or being
 * a reserved word like `none`, `auto` or `root`.
 */
export function transitionName(...parts: (string | number)[]): string {
	return `vt-${parts.map((p) => String(p).replace(/[^A-Za-z0-9_-]/g, '_')).join('-')}`;
}

/** Fisher–Yates shuffle into a new array; `random` returns [0, 1) like `Math.random`. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Latest run per element, so a skipped transition doesn't undo the styles of the one replacing it. */
const latest = new WeakMap<Element, object>();

type ScopedElement = HTMLElement & {
	startViewTransition(update: () => void | Promise<void>): ViewTransition;
};

export interface RunOptions {
	/** The element that changes. Needed for element-scoped transitions and `scopeName`. */
	scope?: HTMLElement | null;
	/** Prefer `scope.startViewTransition()` when the browser has it. */
	scoped?: boolean;
	/**
	 * `view-transition-name` given to `scope` during a document-wide transition, so it gets its own
	 * snapshot group (in an element-scoped one the scope is always the group `root`).
	 */
	scopeName?: string;
	/** Custom properties set on the transition root while it runs; the pseudo-elements inherit them. */
	vars?: Record<string, string>;
	/** Skip the animation and just apply the update. */
	instant?: boolean;
}

export interface RunResult {
	/** null when the update was applied instantly. */
	transition: ViewTransition | null;
	/** Element the pseudo-element tree hangs off: the scope or `<html>`. */
	root: Element | null;
	/** Group name of the scope's own snapshot: `root` when element-scoped, else `scopeName`. */
	scopeGroup: string | null;
}

/** True when the update should be applied without a transition. */
export function shouldSkip(scope?: Element | null): boolean {
	if (!supportsViewTransitions()) return true;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
	return !!scope?.closest('[data-motion="paused"]');
}

/**
 * Runs `update` inside a view transition, element-scoped if asked and supported, document-wide
 * otherwise, and instantly (no transition at all) without support, under reduced motion or inside a
 * `[data-motion="paused"]` region. The update must change the DOM synchronously or return a promise
 * that resolves once it has (Svelte: wrap state changes in `flushSync`).
 */
export function runViewTransition(
	update: () => void | Promise<void>,
	{ scope, scoped = true, scopeName, vars = {}, instant = false }: RunOptions = {}
): RunResult {
	if (instant || shouldSkip(scope)) {
		void update();
		return { transition: null, root: null, scopeGroup: null };
	}

	let root: Element;
	let transition: ViewTransition;
	let scopeGroup: string | null = null;
	const restore: (() => void)[] = [];

	const style = (el: HTMLElement, prop: string, value: string) => {
		el.style.setProperty(prop, value);
		restore.push(() => el.style.removeProperty(prop));
	};

	if (scope && scoped && supportsScopedViewTransitions()) {
		root = scope;
		scopeGroup = 'root';
		for (const [k, v] of Object.entries(vars)) style(scope, k, v);
		transition = (scope as ScopedElement).startViewTransition(update);
	} else {
		root = document.documentElement;
		if (scope && scopeName) {
			style(scope, 'view-transition-name', scopeName);
			scopeGroup = scopeName;
		}
		for (const [k, v] of Object.entries(vars)) style(document.documentElement, k, v);
		transition = document.startViewTransition(update);
	}

	const token = {};
	const key = scope ?? root;
	latest.set(key, token);
	const cleanup = () => {
		if (latest.get(key) === token) restore.forEach((fn) => fn());
	};
	transition.finished.then(cleanup, cleanup);
	// `ready` rejects when the transition is skipped (e.g. a newer one started); that's fine.
	transition.ready.catch(() => {});
	return { transition, root, scopeGroup };
}
