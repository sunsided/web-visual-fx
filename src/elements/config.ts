import type { Schema } from '../lib/params/schema.js';
import { auroraSchema } from '../lib/fx/aurora/aurora.js';
import { chromaticSchema } from '../lib/fx/chromatic/chromatic.js';
import { crtSchema } from '../lib/fx/crt/crt.js';
import { duotoneSchema } from '../lib/fx/duotone/duotone.js';
import { glassSchema } from '../lib/fx/glass/glass.js';
import { gooeyMenuSchema, gooeySchema, gooSchema } from '../lib/fx/gooey/gooey.js';
import { halftoneSchema } from '../lib/fx/halftone/halftone.js';
import { holoSchema } from '../lib/fx/holo/holo.js';
import { lightingSchema } from '../lib/fx/lighting/lighting.js';
import { liquidGlassSchema } from '../lib/fx/liquid-glass/liquid-glass.js';
import { noiseSchema } from '../lib/fx/noise/noise.js';
import { buttonGroupSchema, squircleSchema } from '../lib/fx/squircle/squircle.js';

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
 * see slotted children.
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
	}
];
