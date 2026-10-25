import primitives from '../lib/tokens/primitives.css?inline';
import semantic from '../lib/tokens/semantic.css?inline';
import utilities from '../lib/tokens/utilities.css?inline';
import { shadowBase, toShadowCss } from './shadow-css.js';

let sheet: CSSStyleSheet | undefined;

/** One stylesheet for every element on the page, created on first use. */
function sharedSheet(): CSSStyleSheet {
	if (!sheet) {
		sheet = new CSSStyleSheet();
		sheet.replaceSync(toShadowCss(primitives + semantic) + utilities + shadowBase);
	}
	return sheet;
}

/**
 * `extend` for `<svelte:options customElement>`: adopts the tokens, utilities and element defaults
 * into the shadow root, so elements need no global CSS.
 */
export function withSharedStyles<T extends CustomElementConstructor>(Base: T): T {
	return class extends Base {
		connectedCallback() {
			const root = this.shadowRoot;
			if (root && !root.adoptedStyleSheets.includes(sharedSheet())) {
				root.adoptedStyleSheets = [sharedSheet(), ...root.adoptedStyleSheets];
			}
			// @ts-expect-error Svelte's element class defines it; CustomElementConstructor doesn't.
			super.connectedCallback?.();
		}
	} as T;
}
