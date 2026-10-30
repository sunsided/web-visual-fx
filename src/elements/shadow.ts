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

/** `@property` names this module has registered for the document. */
const registered = new Set<string>();

/**
 * Browsers ignore `@property` inside a shadow root, so the component's typed custom properties
 * would stay untyped and animate in jumps (an angle flipping instead of turning). Registers every
 * `@property` rule found in the root's styles for the whole document instead, once per name.
 */
function hoistPropertyRules(root: ShadowRoot) {
	if (typeof CSSPropertyRule === 'undefined') return;
	const styles = [...root.querySelectorAll('style')].map((style) => style.sheet);
	for (const sheet of [...root.adoptedStyleSheets, ...styles]) {
		for (const rule of sheet?.cssRules ?? []) {
			if (!(rule instanceof CSSPropertyRule) || registered.has(rule.name)) continue;
			registered.add(rule.name);
			try {
				CSS.registerProperty({
					name: rule.name,
					syntax: rule.syntax,
					inherits: rule.inherits,
					initialValue: rule.initialValue ?? undefined
				});
			} catch {
				// Already registered by the page itself
			}
		}
	}
}

/**
 * `extend` for `<svelte:options customElement>`: adopts the tokens, utilities and element defaults
 * into the shadow root, so elements need no global CSS.
 */
export function withSharedStyles<T extends CustomElementConstructor>(Base: T): T {
	return class extends Base {
		async connectedCallback() {
			const root = this.shadowRoot;
			if (root && !root.adoptedStyleSheets.includes(sharedSheet())) {
				root.adoptedStyleSheets = [sharedSheet(), ...root.adoptedStyleSheets];
			}
			// @ts-expect-error Svelte's element class defines it; CustomElementConstructor doesn't.
			// It mounts the component (and injects its styles) asynchronously.
			await super.connectedCallback?.();
			if (root) hoistPropertyRules(root);
		}
	} as T;
}
