/**
 * Whether scroll-driven animations (`animation-timeline: view()` / `scroll()`) are supported.
 * Unlike `backdrop-filter: url()`, feature detection is reliable here: browsers without them
 * (Firefox at the time of writing, unless flagged) reject the property, so `CSS.supports` is false.
 * Returns false during SSR.
 */
export function supportsScrollTimeline(): boolean {
	return typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'view()');
}
