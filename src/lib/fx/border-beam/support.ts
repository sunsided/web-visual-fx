/**
 * Whether registered custom properties (`@property`, `CSS.registerProperty`) are supported, so a
 * custom property used inside a gradient can be animated smoothly. All current engines have it
 * (Chromium 85, Safari 16.4, Firefox 128). The rule and the JS API shipped together in each
 * engine, so the API's presence is a fair proxy; `CSS.supports()` can't test at-rules. Call it
 * after mount; it is false during prerendering.
 */
export function supportsRegisteredProperties(): boolean {
	return typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function';
}
