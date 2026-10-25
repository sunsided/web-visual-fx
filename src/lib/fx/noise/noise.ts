import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

export const blendModes = [
	'normal',
	'multiply',
	'screen',
	'overlay',
	'soft-light',
	'hard-light',
	'color-dodge',
	'color-burn',
	'difference',
	'luminosity'
] as const;

export type BlendMode = (typeof blendModes)[number];

/** Parameters of `<feTurbulence>` plus color shaping; shared by every noise-based effect. */
export const turbulenceSchema = defineSchema({
	type: {
		kind: 'select',
		label: 'Type',
		default: 'fractalNoise',
		options: ['fractalNoise', 'turbulence'],
		group: 'Turbulence',
		description: 'fractalNoise is smooth and cloudy, turbulence has sharp ridges.'
	},
	baseFrequency: {
		kind: 'range',
		label: 'Base frequency',
		default: 0.8,
		min: 0.005,
		max: 2,
		step: 0.005,
		group: 'Turbulence',
		description: 'Higher values give finer grain.'
	},
	stretch: {
		kind: 'range',
		label: 'Stretch (y / x)',
		default: 1,
		min: 0.05,
		max: 4,
		step: 0.05,
		group: 'Turbulence',
		description: 'Ratio between vertical and horizontal frequency. Try 0.05 for brushed metal.'
	},
	numOctaves: {
		kind: 'range',
		label: 'Octaves',
		default: 4,
		min: 1,
		max: 8,
		step: 1,
		group: 'Turbulence',
		description: 'Layers of detail. Above ~5 the difference is barely visible but costs more.'
	},
	seed: {
		kind: 'range',
		label: 'Seed',
		default: 0,
		min: 0,
		max: 500,
		step: 1,
		group: 'Turbulence'
	},
	stitchTiles: {
		kind: 'toggle',
		label: 'Stitch tiles',
		default: true,
		group: 'Turbulence',
		description: 'Smooths transitions at tile borders (matters when the noise is tiled).'
	},
	monochrome: {
		kind: 'toggle',
		label: 'Monochrome',
		default: true,
		group: 'Color'
	},
	contrast: {
		kind: 'range',
		label: 'Contrast',
		default: 1.5,
		min: 0,
		max: 5,
		step: 0.05,
		group: 'Color'
	},
	brightness: {
		kind: 'range',
		label: 'Brightness',
		default: 0,
		min: -1,
		max: 1,
		step: 0.01,
		group: 'Color'
	},
	alphaNoise: {
		kind: 'toggle',
		label: 'Noisy alpha',
		default: false,
		group: 'Color',
		description: 'Keep the noise in the alpha channel (softer, patchy) instead of an opaque layer.'
	}
});

export const noiseSchema = defineSchema({
	...turbulenceSchema,
	opacity: {
		kind: 'range',
		label: 'Opacity',
		default: 0.35,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Compositing'
	},
	blendMode: {
		kind: 'select',
		label: 'Blend mode',
		default: 'overlay',
		options: blendModes,
		group: 'Compositing'
	},
	animate: {
		kind: 'toggle',
		label: 'Animate (film grain)',
		default: false,
		group: 'Motion',
		description: 'Cycles the seed. Disabled when the user prefers reduced motion.'
	},
	fps: {
		kind: 'range',
		label: 'Frames per second',
		default: 12,
		min: 1,
		max: 60,
		step: 1,
		group: 'Motion',
		when: 'animate'
	}
});

export type TurbulenceOptions = Values<typeof turbulenceSchema>;
export type NoiseOptions = Values<typeof noiseSchema>;

export const turbulenceDefaults: TurbulenceOptions = defaultsOf(turbulenceSchema);
export const noiseDefaults: NoiseOptions = defaultsOf(noiseSchema);
