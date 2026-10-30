/**
 * Framework-agnostic part of the package: parameter schemas, defaults and the pure helpers the
 * effects are built from (map generators, color math, easing). No Svelte, no DOM at import time.
 *
 * Svelte components: `@sunsided/web-visual-fx/svelte`. Custom elements (any framework):
 * `@sunsided/web-visual-fx/elements`.
 */
export * from './params/schema.js';

// One namespace per effect: helpers with the same name (e.g. `contrastRatio`) don't collide.
// `import { crt } from '@sunsided/web-visual-fx'`, then `crt.crtDefaults`.
export * as noise from './fx/noise/noise.js';
export * as glass from './fx/glass/glass.js';
export * as liquidGlass from './fx/liquid-glass/liquid-glass.js';
export * as chromatic from './fx/chromatic/chromatic.js';
export * as gooey from './fx/gooey/gooey.js';
export * as lighting from './fx/lighting/lighting.js';
export * as duotone from './fx/duotone/duotone.js';
export * as halftone from './fx/halftone/halftone.js';
export * as crt from './fx/crt/crt.js';
export * as holo from './fx/holo/holo.js';
export * as spotlight from './fx/spotlight/spotlight.js';
export * as aurora from './fx/aurora/aurora.js';
export * as squircle from './fx/squircle/squircle.js';
export * as outline from './fx/outline/outline.js';
export * as edges from './fx/edges/edges.js';
export * as posterize from './fx/posterize/posterize.js';
export * as pixelate from './fx/pixelate/pixelate.js';
export * as glitch from './fx/glitch/glitch.js';
export * as magnifier from './fx/magnifier/magnifier.js';
export * as ripple from './fx/ripple/ripple.js';
export * as caustics from './fx/caustics/caustics.js';
export * as inkBleed from './fx/ink-bleed/ink-bleed.js';
export * as dissolve from './fx/dissolve/dissolve.js';
export * as kaleidoscope from './fx/kaleidoscope/kaleidoscope.js';
export * as neon from './fx/neon/neon.js';
export * as gradientText from './fx/gradient-text/gradient-text.js';
export * as longShadow from './fx/long-shadow/long-shadow.js';
export * as borderBeam from './fx/border-beam/border-beam.js';
export * as shimmer from './fx/shimmer/shimmer.js';
export * as splitText from './fx/split-text/split-text.js';
export * as scrollReveal from './fx/scroll-reveal/scroll-reveal.js';
export * as viewTransition from './fx/view-transition/view-transition.js';
export * as paintWorklet from './fx/paint-worklet/paint-worklet.js';
export * as waterSim from './fx/water-sim/water-sim.js';

export { supportsBackdropSvgFilter } from './fx/glass/support.js';
export { supportsCornerShape } from './fx/squircle/support.js';
export { supportsRegisteredProperties } from './fx/border-beam/support.js';
export { supportsSiblingIndex } from './fx/split-text/support.js';
export { supportsScrollTimeline } from './fx/scroll-reveal/support.js';
export {
	supportsScopedViewTransitions,
	supportsViewTransitions
} from './fx/view-transition/support.js';
export { loadPaintWorklet, supportsPaintWorklet } from './fx/paint-worklet/support.js';
export { motionPaused, supportsWaterSim } from './fx/water-sim/support.js';
