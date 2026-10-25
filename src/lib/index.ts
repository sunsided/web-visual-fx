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

export { supportsBackdropSvgFilter } from './fx/glass/support.js';
export { supportsCornerShape } from './fx/squircle/support.js';
