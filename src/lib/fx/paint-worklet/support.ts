import { PAINT_NAME, paintProperties, workletSource } from './paint-worklet.js';

interface PaintWorklet {
	addModule(url: string): Promise<void>;
}

function paintWorklet(): PaintWorklet | undefined {
	if (typeof CSS === 'undefined') return undefined;
	return (CSS as unknown as { paintWorklet?: PaintWorklet }).paintWorklet;
}

/**
 * Whether the CSS Painting API exists (`CSS.paintWorklet`). Plain feature detection works here,
 * unlike for `backdrop-filter: url()`: only Chromium-based browsers define it. Firefox and Safari
 * have no implementation, so they get the gradient twin.
 */
export function supportsPaintWorklet(): boolean {
	return paintWorklet() !== undefined;
}

let loading: Promise<boolean> | undefined;

/**
 * Registers the custom properties and loads the worklet module, once per document. Resolves to
 * `true` when `paint(vfx-pattern)` is ready, `false` when it is unsupported or failed to load
 * (for example under a Content-Security-Policy without `blob:` for scripts).
 *
 * The properties are registered with `CSS.registerProperty` rather than `@property`: an
 * `@property` rule inside a shadow root is ignored, and the custom element renders in one.
 * The module is a Blob URL built from `workletSource()`, so nothing has to be served from a
 * static path and the base path of the site doesn't matter.
 */
export function loadPaintWorklet(): Promise<boolean> {
	if (loading) return loading;
	const worklet = paintWorklet();
	if (!worklet) return (loading = Promise.resolve(false));
	for (const p of paintProperties) {
		try {
			CSS.registerProperty({ ...p, inherits: true });
		} catch {
			// Already registered (another copy of the package, or a hot reload): keep it.
		}
	}
	const url = URL.createObjectURL(
		new Blob([workletSource(PAINT_NAME)], { type: 'text/javascript' })
	);
	loading = worklet
		.addModule(url)
		.then(() => true)
		.catch(() => false)
		.finally(() => URL.revokeObjectURL(url));
	return loading;
}

/** The bits of a DOM `Element` that `insideLink` walks (structural, so tests need no DOM). */
export interface LinkProbe {
	localName: string;
	hasAttribute(name: string): boolean;
	parentElement: LinkProbe | null;
	assignedSlot?: LinkProbe | null;
	getRootNode(): unknown;
}

/**
 * Whether `el` is a hyperlink (`<a href>`, `<area href>`, SVG `<a href>`) or sits inside one,
 * following the flat tree: slots and out of shadow roots, the way style inheritance goes.
 *
 * Chromium paints nothing for `paint()` on such elements. To keep `:visited` from leaking
 * through a worklet (which could read the link's computed style), Blink's `CSSPaintValue`
 * returns no image for any element whose style is "inside a link". The background color and
 * every other layer still render, so the pattern silently vanishes, e.g. in a card that is one
 * big `<a>`. Moving the element, repainting or changing its inputs doesn't help.
 */
export function insideLink(el: LinkProbe | null): boolean {
	for (let node = el; node;) {
		const link = node.localName === 'a' || node.localName === 'area';
		if (link && (node.hasAttribute('href') || node.hasAttribute('xlink:href'))) return true;
		const root = node.getRootNode() as { host?: LinkProbe } | null;
		node = node.assignedSlot ?? node.parentElement ?? root?.host ?? null;
	}
	return false;
}
