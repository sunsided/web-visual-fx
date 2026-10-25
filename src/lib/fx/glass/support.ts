/**
 * Whether `backdrop-filter: url(#svg-filter)` is known to render.
 *
 * Feature detection can't answer this: `CSS.supports('backdrop-filter', 'url(#a)')` is true in
 * Chromium, Firefox and WebKit alike, because it only checks the syntax. Only Chromium renders it.
 * Firefox (verified in 156) drops the *entire* backdrop filter when the chain contains url(), so
 * the blur disappears too. Safari is untested and treated the same way. Hence an engine check:
 * `navigator.userAgentData` only exists in Chromium-based browsers. `GlassPanel` accepts
 * `forceDisplace` to override it.
 */
export function supportsBackdropSvgFilter(): boolean {
	if (typeof navigator === 'undefined') return false;
	const data = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
		.userAgentData;
	return data?.brands.some((b) => b.brand === 'Chromium') ?? false;
}
