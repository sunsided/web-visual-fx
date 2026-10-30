import type { Schema } from '../lib/params/schema.js';
import { auroraSchema } from '../lib/fx/aurora/aurora.js';
import { borderBeamSchema } from '../lib/fx/border-beam/border-beam.js';
import { causticsSchema } from '../lib/fx/caustics/caustics.js';
import { chromaticSchema } from '../lib/fx/chromatic/chromatic.js';
import { crtSchema } from '../lib/fx/crt/crt.js';
import { dissolveSchema } from '../lib/fx/dissolve/dissolve.js';
import { duotoneSchema } from '../lib/fx/duotone/duotone.js';
import { edgesSchema } from '../lib/fx/edges/edges.js';
import { glassSchema } from '../lib/fx/glass/glass.js';
import { glitchSchema } from '../lib/fx/glitch/glitch.js';
import { gooeyMenuSchema, gooeySchema, gooSchema } from '../lib/fx/gooey/gooey.js';
import { gradientTextSchema } from '../lib/fx/gradient-text/gradient-text.js';
import { halftoneSchema } from '../lib/fx/halftone/halftone.js';
import { holoSchema } from '../lib/fx/holo/holo.js';
import { inkBleedSchema } from '../lib/fx/ink-bleed/ink-bleed.js';
import { kaleidoscopeSchema } from '../lib/fx/kaleidoscope/kaleidoscope.js';
import { lightingSchema } from '../lib/fx/lighting/lighting.js';
import { liquidGlassSchema } from '../lib/fx/liquid-glass/liquid-glass.js';
import { longShadowSchema } from '../lib/fx/long-shadow/long-shadow.js';
import { magnifierSchema } from '../lib/fx/magnifier/magnifier.js';
import { neonSchema } from '../lib/fx/neon/neon.js';
import { noiseSchema } from '../lib/fx/noise/noise.js';
import { outlineSchema } from '../lib/fx/outline/outline.js';
import { paintPatternSchema } from '../lib/fx/paint-worklet/paint-worklet.js';
import { pixelateSchema } from '../lib/fx/pixelate/pixelate.js';
import { posterizeSchema } from '../lib/fx/posterize/posterize.js';
import { rippleSchema } from '../lib/fx/ripple/ripple.js';
import { scrollProgressSchema, scrollRevealSchema } from '../lib/fx/scroll-reveal/scroll-reveal.js';
import { shimmerSchema } from '../lib/fx/shimmer/shimmer.js';
import { splitTextSchema } from '../lib/fx/split-text/split-text.js';
import { buttonGroupSchema, squircleSchema } from '../lib/fx/squircle/squircle.js';
import { waterSimSchema } from '../lib/fx/water-sim/water-sim.js';

/** A prop that isn't in the effect's schema. */
export interface ExtraProp {
	/** How Svelte converts the attribute value. */
	type: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
	/** TypeScript type for the generated declarations. */
	ts: string;
	description: string;
	/** Two-way: the element updates the property and fires `event` with the new value. */
	event?: string;
	/**
	 * Default as a TypeScript expression: for props the component requires, and for every two-way
	 * prop (Svelte rejects binding `undefined` to a bindable prop that has a fallback).
	 */
	default?: string;
}

export interface ElementEvent {
	name: string;
	/** Callback prop of the wrapped component that triggers it. */
	from: string;
	/** TypeScript type of `event.detail`. */
	detail: string;
	description: string;
}

export interface ElementDefinition {
	tag: string;
	/** Entry and file name, e.g. `glass` → `@sunsided/web-visual-fx/elements/glass`. */
	name: string;
	/** Path below `src/lib/fx/`, without `.svelte`. */
	component: string;
	description: string;
	schema: Schema;
	extras?: Record<string, ExtraProp>;
	/** Snippet props filled from slots: `children` → default slot, anything else → named slot. */
	slots?: string[];
	events?: ElementEvent[];
	/** Animated with CSS: adds a `paused` property (the page's `data-motion` can't reach a shadow root). */
	motion?: boolean;
	/** Host `display`. */
	display?: 'block' | 'contents';
	/** Type-only imports for `ts` strings, as `name: module below src/lib`. */
	types?: Record<string, string>;
}

function pick<S extends Schema>(schema: S, keys: (keyof S & string)[]): Schema {
	return Object.fromEntries(keys.map((k) => [k, schema[k]]));
}

/**
 * Every custom element in `@sunsided/web-visual-fx/elements`. The wrappers in `generated/` are
 * derived from this list and the schemas (`yarn elements:generate`); a spec fails when they drift.
 *
 * SpotlightGrid is missing on purpose: it measures its cards with `querySelectorAll`, which can't
 * see slotted children. Stagger too: it indexes and styles its direct children, which in a shadow
 * root are a `<slot>`, not the slotted items. Parallax layers need the scene's named view timeline,
 * which doesn't cross tree scopes, and CircleReveal / MorphScope wrap the caller's own state change
 * in a function (use `viewTransition.runViewTransition` instead).
 */
export const elements: ElementDefinition[] = [
	{
		tag: 'vfx-noise',
		name: 'noise',
		component: 'noise/NoiseLayer',
		description: 'Grain overlay that fills the nearest positioned ancestor.',
		schema: noiseSchema,
		display: 'contents'
	},
	{
		tag: 'vfx-glass',
		name: 'glass',
		component: 'glass/GlassPanel',
		description: 'Frosted glass panel: backdrop blur, displacement, grain and a lit rim.',
		schema: glassSchema,
		extras: {
			forceDisplace: {
				type: 'Boolean',
				ts: 'boolean',
				description: 'Use the SVG displacement even where it is not known to render.'
			}
		},
		slots: ['children']
	},
	{
		tag: 'vfx-liquid-glass',
		name: 'liquid-glass',
		component: 'liquid-glass/LiquidGlass',
		description: 'Refractive lens: the backdrop bends along a curved bezel.',
		schema: liquidGlassSchema,
		extras: {
			forceRefract: {
				type: 'Boolean',
				ts: 'boolean',
				description: 'Use the SVG refraction even where it is not known to render.'
			}
		},
		slots: ['children']
	},
	{
		tag: 'vfx-chromatic',
		name: 'chromatic',
		component: 'chromatic/ChromaticAberration',
		description: 'RGB split on its content.',
		schema: chromaticSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-gooey',
		name: 'gooey',
		component: 'gooey/GooeyField',
		description: 'Drifting blobs that melt into each other.',
		schema: gooeySchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-gooey-menu',
		name: 'gooey-menu',
		component: 'gooey/GooeyMenu',
		description: 'Floating action button whose items ooze out of it.',
		schema: { ...pick(gooSchema, ['blur', 'sharpness', 'offset', 'region']), ...gooeyMenuSchema },
		extras: {
			items: { type: 'Array', ts: 'MenuItem[]', description: 'Menu entries.', default: '[]' },
			open: {
				type: 'Boolean',
				ts: 'boolean',
				description: 'Whether the menu is expanded.',
				event: 'openchange',
				default: 'false'
			},
			label: { type: 'String', ts: 'string', description: 'Accessible name of the toggle.' }
		},
		events: [
			{
				name: 'itemselect',
				from: 'onselect',
				detail: 'MenuItem',
				description: 'An item was activated.'
			}
		],
		types: { MenuItem: 'fx/gooey/gooey.js' }
	},
	{
		tag: 'vfx-lit-surface',
		name: 'lit-surface',
		component: 'lighting/LitSurface',
		description: 'Embossed surface lit by a light that follows the pointer.',
		schema: lightingSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-duotone',
		name: 'duotone',
		component: 'duotone/Duotone',
		description: 'Maps the luminance of its content through two or three colors.',
		schema: duotoneSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-halftone',
		name: 'halftone',
		component: 'halftone/Halftone',
		description: 'Halftone dots or ordered dither over its content.',
		schema: halftoneSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-crt',
		name: 'crt',
		component: 'crt/CrtScreen',
		description: 'CRT screen: scanlines, phosphor mask, curvature and bloom over its content.',
		schema: crtSchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-holo',
		name: 'holo',
		component: 'holo/HoloCard',
		description: 'Holographic foil card that tilts towards the pointer.',
		schema: holoSchema,
		extras: {
			paused: { type: 'Boolean', ts: 'boolean', description: 'Stops the idle sweep.' },
			label: { type: 'String', ts: 'string', description: 'Accessible name of the card.' }
		},
		slots: ['art', 'children']
	},
	{
		tag: 'vfx-aurora',
		name: 'aurora',
		component: 'aurora/Aurora',
		description: 'Animated mesh gradient background.',
		schema: auroraSchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-squircle',
		name: 'squircle',
		component: 'squircle/Squircle',
		description: 'Box with superellipse corners that morph between shapes.',
		schema: squircleSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-squircle-group',
		name: 'squircle-group',
		component: 'squircle/SquircleButtonGroup',
		description: 'Connected toggle buttons that grow and morph when hovered, focused or pressed.',
		schema: buttonGroupSchema,
		extras: {
			items: {
				type: 'Array',
				ts: '{ value: string; label: string }[]',
				description: 'Buttons.',
				default: '[]'
			},
			selected: {
				type: 'Array',
				ts: 'string[]',
				description: 'Values of the pressed buttons.',
				event: 'selectedchange',
				default: '[]'
			},
			label: {
				type: 'String',
				ts: 'string',
				description: 'Accessible name of the group.',
				default: "'Options'"
			}
		}
	},
	{
		tag: 'vfx-outline',
		name: 'outline',
		component: 'outline/Outline',
		description:
			'Die-cut sticker outline around the alpha shape of its content, with optional ring and drop shadow.',
		schema: outlineSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-edges',
		name: 'edges',
		component: 'edges/Edges',
		description: 'Redraws its content as a pencil sketch, a line drawing or an embossed relief.',
		schema: edgesSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-posterize',
		name: 'posterize',
		component: 'posterize/Posterize',
		description: 'Posterizes its content into flat color bands, optionally with toon ink lines.',
		schema: posterizeSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-pixelate',
		name: 'pixelate',
		component: 'pixelate/Pixelate',
		description: 'Pixelates its content into a mosaic of (optionally rounded, spaced) tiles.',
		schema: pixelateSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-glitch',
		name: 'glitch',
		component: 'glitch/Glitch',
		description: 'Slice displacement and RGB split on its content, in occasional safe bursts.',
		schema: glitchSchema,
		slots: ['children'],
		// The burst clock is a CSS animation, so the shadow-root `paused` switch stops it.
		motion: true
	},
	{
		tag: 'vfx-magnifier',
		name: 'magnifier',
		component: 'magnifier/Magnifier',
		description:
			'Magnifying loupe or fisheye over its content; follows the pointer, arrow keys move it.',
		schema: magnifierSchema,
		extras: {
			x: {
				type: 'Number',
				ts: 'number',
				description: 'Lens center across, 0–1.',
				event: 'xchange',
				default: '0.5'
			},
			y: {
				type: 'Number',
				ts: 'number',
				description: 'Lens center down, 0–1.',
				event: 'ychange',
				default: '0.5'
			},
			label: { type: 'String', ts: 'string', description: 'Accessible name of the lens.' },
			forceBackdrop: {
				type: 'Boolean',
				ts: 'boolean',
				description: 'Use the backdrop variant even where it is not known to render.'
			}
		},
		slots: ['children']
	},
	{
		tag: 'vfx-ripple',
		name: 'ripple',
		component: 'ripple/Ripple',
		description:
			'Water ripple / heat haze: its content (or, in backdrop mode, what is behind it) wobbles through moving noise.',
		schema: rippleSchema,
		extras: {
			forceBackdrop: {
				type: 'Boolean',
				ts: 'boolean',
				description: 'Backdrop mode: use the SVG filter even where it is not known to render.'
			}
		},
		slots: ['children'],
		// A rAF loop, but it checks for a paused `[data-motion]` ancestor on every frame.
		motion: true
	},
	{
		tag: 'vfx-caustics',
		name: 'caustics',
		component: 'caustics/Caustics',
		description: 'Pool-floor caustics: a dancing net of light over its content.',
		schema: causticsSchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-ink-bleed',
		name: 'ink-bleed',
		component: 'ink-bleed/InkBleed',
		description:
			'Ink / watercolor look for its content: wandering, feathered edges, pooled pigment and an optional paper texture.',
		schema: inkBleedSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-dissolve',
		name: 'dissolve',
		component: 'dissolve/Dissolve',
		description:
			'Burns its content away through a noise pattern with an ember edge; set `progress` from 0 (intact) to 1 (gone).',
		schema: dissolveSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-kaleidoscope',
		name: 'kaleidoscope',
		component: 'kaleidoscope/Kaleidoscope',
		description: 'Mirrored kaleidoscope of an image, spinning slowly and following the pointer.',
		schema: kaleidoscopeSchema,
		extras: {
			src: {
				type: 'String',
				ts: 'string',
				description: 'Image URL used as the source (a built-in gradient pattern without it).'
			}
		},
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-neon',
		name: 'neon',
		component: 'neon/Neon',
		description: 'Neon sign: glowing text with an optional safe flicker and dead letters.',
		schema: neonSchema,
		extras: {
			text: {
				type: 'String',
				ts: 'string',
				description: "The sign's text.",
				default: "'Open late'"
			}
		},
		motion: true
	},
	{
		tag: 'vfx-gradient-text',
		name: 'gradient-text',
		component: 'gradient-text/GradientText',
		description: 'Gradient-filled and/or outlined text.',
		schema: gradientTextSchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-long-shadow',
		name: 'long-shadow',
		component: 'long-shadow/LongShadow',
		description: 'Long shadow or extruded 3D text.',
		schema: longShadowSchema,
		slots: ['children']
	},
	{
		tag: 'vfx-border-beam',
		name: 'border-beam',
		component: 'border-beam/BorderBeam',
		description: 'Box with an arc of light running around its border.',
		schema: borderBeamSchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-shimmer',
		name: 'shimmer',
		component: 'shimmer/Shimmer',
		description: 'A band of light sweeping across its content: sheen layer, shiny text or mask.',
		schema: shimmerSchema,
		extras: {
			as: {
				type: 'String',
				ts: 'string',
				description: 'Element to render inside the host, e.g. span.'
			}
		},
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-split-text',
		name: 'split-text',
		component: 'split-text/SplitText',
		description: 'Text whose characters or words reveal one after another.',
		schema: splitTextSchema,
		extras: {
			text: { type: 'String', ts: 'string', description: 'The text to reveal.', default: "''" },
			as: { type: 'String', ts: 'string', description: 'Element to render, e.g. h1 or p.' },
			replay: {
				type: 'Number',
				ts: 'number',
				description: 'Change it (e.g. increment) to replay the reveal.'
			}
		}
	},
	{
		tag: 'vfx-scroll-reveal',
		name: 'scroll-reveal',
		component: 'scroll-reveal/ScrollReveal',
		description: 'Reveals its content as it scrolls into view (scroll-driven animation).',
		schema: scrollRevealSchema,
		slots: ['children'],
		// Paused motion switches the reveal off (content shown) rather than freezing it.
		motion: true
	},
	{
		tag: 'vfx-scroll-progress',
		name: 'scroll-progress',
		component: 'scroll-reveal/ScrollProgress',
		description: 'Bar that fills as the nearest scroll container is scrolled.',
		schema: scrollProgressSchema,
		extras: {
			timeline: {
				type: 'String',
				ts: 'string',
				// Timeline names are tree-scoped and don't reach into the shadow root.
				description: 'animation-timeline value, a scroll() function; default scroll(nearest block).'
			}
		}
	},
	{
		tag: 'vfx-paint-pattern',
		name: 'paint-pattern',
		component: 'paint-worklet/PaintPattern',
		description:
			'Experimental: generative pattern painted by a CSS Paint Worklet (Chromium), gradient twin elsewhere.',
		schema: paintPatternSchema,
		slots: ['children'],
		motion: true
	},
	{
		tag: 'vfx-water-sim',
		name: 'water-sim',
		component: 'water-sim/WaterSim',
		description: 'Experimental: interactive WebGL2 water simulation refracting an image.',
		schema: waterSimSchema,
		extras: {
			src: {
				type: 'String',
				ts: 'string',
				description: 'Image behind the water (CORS if cross-origin).'
			},
			// A JS loop that can't see the shadow-root motion wrapper, so `paused` is forwarded.
			paused: { type: 'Boolean', ts: 'boolean', description: 'Stops the simulation.' }
		},
		slots: ['children']
	}
];
