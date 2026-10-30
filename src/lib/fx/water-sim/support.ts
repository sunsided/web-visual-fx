import { floatTargets } from './gl.js';

let cached: boolean | undefined;

/**
 * Whether the water simulation can run: a WebGL2 context with renderable float textures.
 * WebGL2 itself is Baseline, but it can still be missing at runtime (blocklisted GPU drivers,
 * disabled hardware acceleration, some headless setups), so this really creates a context. The
 * probe context is released right away, and the answer is cached per page.
 */
export function supportsWaterSim(): boolean {
	if (cached !== undefined) return cached;
	if (typeof document === 'undefined') return false;
	const canvas = document.createElement('canvas');
	const gl = canvas.getContext('webgl2');
	cached = !!gl && floatTargets(gl);
	gl?.getExtension('WEBGL_lose_context')?.loseContext();
	return cached;
}

/**
 * Whether animation is switched off by a `[data-motion='paused']` ancestor (see `MotionToggle`).
 * CSS animations pause through a stylesheet rule; a JavaScript loop has to look itself. Walks out
 * of shadow roots, so it also works inside the custom element.
 */
export function motionPaused(node: Element | null): boolean {
	let el: Element | null = node;
	while (el) {
		// Any paused ancestor pauses, like the CSS rule does, even if a nearer one is running.
		if (el.closest("[data-motion='paused']")) return true;
		const root = el.getRootNode();
		el = root instanceof ShadowRoot ? root.host : null;
	}
	return false;
}
