/**
 * Whether CSS `corner-shape` is supported (Chromium 139+). Unlike `backdrop-filter: url()` (see
 * `glass/support.ts`), feature detection is reliable here: browsers that don't implement the
 * property don't parse it either. Call it after mount; it is false during prerendering.
 */
export function supportsCornerShape(): boolean {
	return typeof CSS !== 'undefined' && CSS.supports('corner-shape', 'squircle');
}
