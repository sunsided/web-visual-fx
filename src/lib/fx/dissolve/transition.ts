import type { TransitionConfig } from 'svelte/transition';
import { cubicInOut } from 'svelte/easing';
import {
	burnDefaults,
	dissolvePrimitives,
	filterAttrs,
	type BurnOptions,
	type Primitive
} from './dissolve.js';

export interface DissolveParams extends Partial<BurnOptions> {
	delay?: number;
	/** In ms. */
	duration?: number;
	easing?: (t: number) => number;
	/** Fade instead of burning. Defaults to the user's `prefers-reduced-motion` setting. */
	fade?: boolean;
}

const SVG = 'http://www.w3.org/2000/svg';
let counter = 0;

function create(primitive: Primitive): SVGElement {
	const el = document.createElementNS(SVG, primitive.tag);
	for (const child of primitive.children ?? []) el.append(create(child));
	return el;
}

function apply(el: Element, primitive: Primitive) {
	for (const [k, v] of Object.entries(primitive.attrs)) el.setAttribute(k, String(v));
	primitive.children?.forEach((child, i) => apply(el.children[i], child));
}

/**
 * Svelte transition that burns an element in or out: `<div transition:dissolve>`, or `in:`/`out:`.
 * Takes every `burnSchema` option plus `delay`, `duration` and `easing`.
 *
 * The filter attributes can't be animated by CSS, so this is a `tick` transition: it puts a
 * hidden `<svg>` with the filter into `document.body`, points the element's `filter` at it and
 * rewrites the threshold values every frame. The filter is removed again shortly after the last
 * frame. Under `prefers-reduced-motion: reduce` it is a plain opacity fade (a `css` transition).
 */
export function dissolve(
	node: Element,
	{ delay = 0, duration = 900, easing = cubicInOut, fade, ...options }: DissolveParams = {},
	{ direction }: { direction?: 'in' | 'out' | 'both' } = {}
): TransitionConfig {
	const reduced = fade ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) return { delay, duration, easing, css: (t) => `opacity: ${t}` };

	const o: BurnOptions = { ...burnDefaults, ...options };
	const style = (node as HTMLElement | SVGElement).style;
	const id = `dissolve-transition-${++counter}`;
	let svg: SVGSVGElement | undefined;
	let elements: SVGElement[] = [];
	let previous = '';
	let cleanup: ReturnType<typeof setTimeout> | undefined;

	function remove() {
		svg?.remove();
		svg = undefined;
		style.filter = previous;
	}

	function update(progress: number, linger = 100) {
		const primitives = dissolvePrimitives(progress, o);
		if (!svg) {
			svg = document.createElementNS(SVG, 'svg');
			svg.setAttribute('aria-hidden', 'true');
			svg.setAttribute('width', '0');
			svg.setAttribute('height', '0');
			svg.style.position = 'absolute';
			const filter = document.createElementNS(SVG, 'filter');
			filter.id = id;
			for (const [k, v] of Object.entries(filterAttrs())) filter.setAttribute(k, v);
			elements = primitives.map(create);
			filter.append(...elements);
			svg.append(filter);
			document.body.append(svg);
			previous = style.filter;
			style.filter = `url(#${id})`;
		}
		primitives.forEach((p, i) => apply(elements[i], p));
		// Ticks stop when the transition ends (or the tab is hidden); remove the filter then. A
		// later tick (a reversed transition, a visible tab again) simply creates it anew.
		clearTimeout(cleanup);
		cleanup = setTimeout(remove, linger);
	}

	// Before the first frame: an intro starts burnt away, an outro intact.
	update(direction === 'in' ? 1 : 0, delay + 100);

	return { delay, duration, easing, tick: (t) => update(1 - t) };
}
