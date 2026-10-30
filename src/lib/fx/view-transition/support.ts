/**
 * Same-document view transitions (`document.startViewTransition`). Baseline (newly available)
 * since 2025-10-14. Returns false during SSR.
 */
export function supportsViewTransitions(): boolean {
	return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Element-scoped view transitions (`element.startViewTransition`): the pseudo-element tree hangs
 * off the element instead of the document, so the rest of the page stays live. Chrome 147+ only.
 */
export function supportsScopedViewTransitions(): boolean {
	return typeof HTMLElement !== 'undefined' && 'startViewTransition' in HTMLElement.prototype;
}
