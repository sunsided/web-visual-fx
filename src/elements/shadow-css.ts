/**
 * Rewrites the document-level token sheets for use inside a shadow root.
 *
 * - `:root` → `:host`, so the tokens are defined on each element and work without
 *   `tokens.css` on the page.
 * - The default `color-scheme: light dark` is dropped: `color-scheme` inherits through the shadow
 *   boundary, so `light-dark()` follows the page (or a `data-theme` on any ancestor).
 * - `[data-theme='…']` also matches the host itself, e.g. `<vfx-glass data-theme="dark">`.
 */
export function toShadowCss(css: string): string {
	return css
		.replace(/:root(?![\w-])/g, ':host')
		.replace(/color-scheme:\s*light\s+dark\s*;/g, '')
		.replace(
			/(^|,\s*)(\[data-theme=(['"])[^'"]+\3\])/gm,
			(_, before: string, selector: string) => `${before}:host(${selector}),\n${selector}`
		);
}

/** Element-scoped defaults, the shadow-root counterpart of the site's `base.css`. */
export const shadowBase = `
*, *::before, *::after { box-sizing: border-box; }
h1, h2, h3, h4, p, figure { margin: 0; }
button, input, select, textarea { font: inherit; color: inherit; }
:focus-visible {
	outline: var(--focus-ring-width) solid var(--focus-ring-color);
	outline-offset: var(--focus-ring-offset);
}
.vfx-motion { display: contents; }
`;
