/**
 * Whether CSS `sibling-index()` / `sibling-count()` are supported (Chrome 138, Firefox 154,
 * Safari 26.2). Browsers that don't know the functions reject the value, so `CSS.supports()`
 * is reliable. False during prerendering.
 */
export function supportsSiblingIndex(): boolean {
	return typeof CSS !== 'undefined' && CSS.supports('z-index', 'sibling-index()');
}
