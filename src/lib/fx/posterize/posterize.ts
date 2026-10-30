import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { colorSpaces, type ColorSpace } from '../duotone/duotone.js';
import { discreteTable } from '../halftone/halftone.js';

export const posterizeSchema = defineSchema({
	levels: {
		kind: 'range',
		label: 'Levels',
		default: 4,
		min: 2,
		max: 8,
		step: 1,
		group: 'Bands',
		description: 'Output levels per color channel; n levels give up to n³ colors.'
	},
	smoothing: {
		kind: 'range',
		label: 'Smoothing',
		default: 1,
		min: 0,
		max: 6,
		step: 0.25,
		unit: 'px',
		group: 'Bands',
		description:
			'Gaussian blur before quantizing, so band borders follow the large shapes instead of noise and gradients dithering.'
	},
	saturation: {
		kind: 'range',
		label: 'Saturation',
		default: 1.15,
		min: 0,
		max: 2.5,
		step: 0.05,
		group: 'Bands',
		description: 'feColorMatrix saturate before quantizing; cel shading usually reads punchier.'
	},
	colorSpace: {
		kind: 'select',
		label: 'Color space',
		default: 'sRGB',
		options: colorSpaces,
		group: 'Bands',
		description:
			'Where the bands are evenly spaced: sRGB spaces them perceptually, linearRGB in light, which crowds the shadows into one band.'
	},
	inkEdges: {
		kind: 'toggle',
		label: 'Ink lines',
		default: true,
		group: 'Ink',
		description:
			'Sobel edges of the smoothed source, found on R, G and B separately, drawn on top for the toon look.'
	},
	ink: { kind: 'color', label: 'Ink', default: '#15111f', group: 'Ink', when: 'inkEdges' },
	inkStrength: {
		kind: 'range',
		label: 'Sensitivity',
		default: 3,
		min: 0.5,
		max: 8,
		step: 0.1,
		group: 'Ink',
		when: 'inkEdges',
		description: 'Gain on the edge kernel: higher draws lines at softer edges too.'
	},
	inkThreshold: {
		kind: 'range',
		label: 'Threshold',
		default: 0.35,
		min: 0,
		max: 0.9,
		step: 0.01,
		group: 'Ink',
		when: 'inkEdges',
		description: 'Edges weaker than this get no line.'
	},
	inkWidth: {
		kind: 'range',
		label: 'Line weight',
		default: 1,
		min: 0,
		max: 3,
		step: 1,
		unit: 'px',
		group: 'Ink',
		when: 'inkEdges',
		description: 'feMorphology dilate radius on the lines; 0 keeps them 1–2px thin.'
	}
});

export type PosterizeOptions = Values<typeof posterizeSchema>;

export const posterizeDefaults: PosterizeOptions = defaultsOf(posterizeSchema);

/** `tableValues` for `feFuncR/G/B type="discrete"`: `levels` even steps from 0 to 1. */
export const posterizeTable = discreteTable;

/**
 * What one channel value becomes. A discrete table with n entries splits the input into n equal
 * bins and outputs entry ⌊v·n⌋ (the last bin includes 1), so the bins are as wide as the steps
 * between outputs, and both black and white survive.
 */
export function quantize(value: number, levels: number): number {
	const n = Math.max(2, Math.round(levels));
	const v = Math.min(1, Math.max(0, value));
	return Math.min(n - 1, Math.floor(v * n)) / (n - 1);
}

/** Linear-light 0–1 → gamma-encoded sRGB 0–1 (inverse of `srgbToLinear`). */
export function linearToSrgb(v: number): number {
	return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

export interface Band {
	/** Where the band starts and ends on a gamma-encoded (perceptual) 0–1 ramp. */
	from: number;
	to: number;
	/** The gamma-encoded output value of the band. */
	value: number;
}

/**
 * The bands a black-to-white sRGB ramp is cut into, measured on that (perceptual) ramp. In sRGB
 * all bands are equally wide. In linearRGB the bins and outputs are even in linear light; seen
 * on a perceptual ramp the dark bands are much wider than the light ones.
 */
export function bands(levels: number, colorSpace: ColorSpace = 'sRGB'): Band[] {
	const n = Math.max(2, Math.round(levels));
	const encode = colorSpace === 'linearRGB' ? linearToSrgb : (v: number) => v;
	const r = (v: number) => +v.toFixed(4);
	return Array.from({ length: n }, (_, i) => ({
		from: r(encode(i / n)),
		to: r(encode((i + 1) / n)),
		value: r(encode(quantize((i + 0.5) / n, n)))
	}));
}

/**
 * `feColorMatrix` values that copy the edge map's red channel into alpha and zero the colors, so
 * the edge strength becomes the coverage of a flat ink layer (feFlood + feComposite in).
 */
export const EDGE_TO_ALPHA = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0';
