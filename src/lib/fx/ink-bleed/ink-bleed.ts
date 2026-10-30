import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const inkBleedSchema = defineSchema({
	spread: {
		kind: 'range',
		label: 'Bleed',
		default: 10,
		min: 0,
		max: 60,
		step: 0.5,
		unit: 'px',
		group: 'Bleed',
		description:
			'feDisplacementMap scale. Edges wander by up to about a quarter of this in each direction (the noise rarely strays more than ±0.25 from its middle).'
	},
	roughness: {
		kind: 'range',
		label: 'Fiber size',
		default: 18,
		min: 2,
		max: 120,
		step: 1,
		unit: 'px',
		group: 'Bleed',
		description:
			'Size of the wiggles along the edge, like the paper fibers the ink runs along. baseFrequency = 1 / size.'
	},
	octaves: {
		kind: 'range',
		label: 'Octaves',
		default: 4,
		min: 1,
		max: 6,
		step: 1,
		group: 'Bleed',
		description: 'More octaves add finer, hairier detail to the edge.'
	},
	seed: {
		kind: 'range',
		label: 'Seed',
		default: 2,
		min: 0,
		max: 500,
		step: 1,
		group: 'Bleed'
	},
	blur: {
		kind: 'range',
		label: 'Wetness (blur)',
		default: 1.5,
		min: 0,
		max: 12,
		step: 0.25,
		unit: 'px',
		group: 'Edge',
		description:
			'feGaussianBlur stdDeviation before the threshold. Rounds off the displaced edge and lets close strokes run together.'
	},
	threshold: {
		kind: 'range',
		label: 'Threshold',
		default: 0.5,
		min: 0.05,
		max: 0.95,
		step: 0.01,
		group: 'Edge',
		description:
			'Blurred alpha at which the edge sits. Lower values make strokes fatter (more ink soaks out), higher thinner.'
	},
	softness: {
		kind: 'range',
		label: 'Softness',
		default: 0.2,
		min: 0.02,
		max: 1,
		step: 0.01,
		group: 'Edge',
		description:
			'Width of the alpha ramp around the threshold. Small values give a crisp ink line, large ones a feathered wash.'
	},
	pool: {
		kind: 'range',
		label: 'Pigment pooling',
		default: 0,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Pigment',
		description:
			'Darker, more saturated rim along the edges, where pigment collects as a watercolor wash dries. 0 = off.'
	},
	poolWidth: {
		kind: 'range',
		label: 'Rim width',
		default: 4,
		min: 1,
		max: 20,
		step: 0.5,
		unit: 'px',
		group: 'Pigment',
		description: 'How far the pooled rim reaches into the shape (blur radius of the inner mask).'
	},
	grain: {
		kind: 'range',
		label: 'Granulation',
		default: 0.2,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Pigment',
		description: 'Speckled density from pigment settling into the paper texture. 0 = even color.'
	},
	grainSize: {
		kind: 'range',
		label: 'Grain size',
		default: 3,
		min: 1,
		max: 16,
		step: 0.5,
		unit: 'px',
		group: 'Pigment'
	},
	density: {
		kind: 'range',
		label: 'Density',
		default: 1,
		min: 0.1,
		max: 1,
		step: 0.01,
		group: 'Pigment',
		description: 'Overall opacity of the ink. Washes look right around 0.8.'
	},
	paper: {
		kind: 'toggle',
		label: 'Paper',
		default: true,
		group: 'Paper',
		description:
			'Paints a lit paper texture behind the content and multiplies the ink onto it, so the grain shows through.'
	},
	paperColor: {
		kind: 'color',
		label: 'Paper color',
		default: '#f3ede0',
		group: 'Paper',
		when: 'paper'
	},
	paperTexture: {
		kind: 'range',
		label: 'Paper texture',
		default: 0.35,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Paper',
		when: 'paper',
		description: 'Strength of the embossed fiber texture (feDiffuseLighting on noise).'
	}
});

export type InkBleedOptions = Values<typeof inkBleedSchema>;
export const inkBleedDefaults: InkBleedOptions = defaultsOf(inkBleedSchema);

export const inkBleedPresets = {
	/** Fountain-pen ink on uncoated paper: crisp, slightly hairy edges. */
	ink: {},
	/** A wet wash: wide, soft, wandering edges with a dark pooled rim and granulation. */
	watercolor: {
		spread: 18,
		roughness: 40,
		octaves: 4,
		blur: 4,
		threshold: 0.42,
		softness: 0.45,
		pool: 0.8,
		poolWidth: 7,
		grain: 0.4,
		grainSize: 2.5,
		density: 0.9
	},
	/** Ink on damp, absorbent paper: every edge frays out along the fibers. */
	feathered: {
		spread: 34,
		roughness: 7,
		octaves: 5,
		blur: 2.5,
		threshold: 0.3,
		softness: 0.6,
		pool: 0.5,
		poolWidth: 3,
		grain: 0.25,
		density: 0.95
	}
} satisfies Record<string, Partial<InkBleedOptions>>;

export type InkBleedPreset = keyof typeof inkBleedPresets;
export const inkBleedPresetNames = Object.keys(inkBleedPresets) as InkBleedPreset[];

/** Full option set for a preset (defaults plus its overrides). */
export function presetValues(name: InkBleedPreset): InkBleedOptions {
	return { ...inkBleedDefaults, ...inkBleedPresets[name] };
}

/**
 * Range of `fractalNoise`'s alpha channel that covers almost every pixel (1st to 99th
 * percentile, measured in Chromium; see the dissolve effect's `NOISE_SD`).
 */
export const NOISE_LOW = 0.23;
export const NOISE_HIGH = 0.77;

const round = (v: number) => +v.toFixed(4);

/**
 * Slope and intercept of a soft step `A' = slope·A + intercept` that is 0.5 at `threshold` and
 * ramps from 0 to 1 over `softness` (centered on the threshold); the browser clamps to 0–1.
 *
 * The ramp may not start below alpha 0: a positive intercept would give every transparent pixel
 * some opacity, and since their color is black that paints a grey veil over the whole element.
 * So the softness is capped at `2 · threshold`.
 */
export function step(threshold: number, softness: number): { slope: number; intercept: number } {
	const soft = Math.max(0.001, Math.min(softness, 2 * threshold));
	const slope = 1 / soft;
	return { slope: round(slope), intercept: round(Math.min(0, 0.5 - slope * threshold)) };
}

/** What `step` does to one alpha value. */
export function stepAt(alpha: number, threshold: number, softness: number): number {
	const { slope, intercept } = step(threshold, softness);
	return Math.min(1, Math.max(0, slope * alpha + intercept));
}

/** `feColorMatrix` values: RGB unchanged, alpha through the soft step. */
export function stepMatrix(threshold: number, softness: number): string {
	const { slope, intercept } = step(threshold, softness);
	return ['1 0 0 0 0', '0 1 0 0 0', '0 0 1 0 0', `0 0 0 ${slope} ${intercept}`].join('  ');
}

/**
 * `feColorMatrix` values for the pooling mask: white, with alpha `2·(1 − A)` of the blurred ink.
 * The blurred alpha is ~1 deep inside a shape, ~0.5 on its edge and falls off outside, so the
 * mask is 0 in the middle and reaches 1 at the edge (outside it too, but the rim is multiplied
 * with the ink, which is empty there).
 */
export function rimMatrix(): string {
	return ['0 0 0 0 1', '0 0 0 0 1', '0 0 0 0 1', '0 0 0 -2 2'].join('  ');
}

/** What `rimMatrix` gives for one blurred alpha value. */
export function rimAt(blurredAlpha: number): number {
	return Math.min(1, Math.max(0, 2 * (1 - blurredAlpha)));
}

/**
 * Opacity left in the middle of a wash when `pool` of its pigment has moved to the rim. Never
 * below half, so even a fully pooled wash keeps a visible body.
 */
export function washAlpha(pool: number): number {
	return round(1 - 0.5 * Math.min(1, Math.max(0, pool)));
}

/**
 * `feColorMatrix` values for the granulation mask: white, with alpha `(1 − grain) + grain·n`
 * where n is the noise's alpha rescaled from NOISE_LOW…NOISE_HIGH to 0–1. At grain 0 the mask
 * is opaque everywhere; at 1 it runs from transparent (no pigment) to opaque.
 */
export function grainMatrix(grain: number): string {
	const span = NOISE_HIGH - NOISE_LOW;
	const slope = grain / span;
	const intercept = 1 - grain - (grain * NOISE_LOW) / span;
	return ['0 0 0 0 1', '0 0 0 0 1', '0 0 0 0 1', `0 0 0 ${round(slope)} ${round(intercept)}`].join(
		'  '
	);
}

/** What `grainMatrix` gives for one noise value (alpha channel of fractalNoise). */
export function grainAt(noise: number, grain: number): number {
	const n = (noise - NOISE_LOW) / (NOISE_HIGH - NOISE_LOW);
	return Math.min(1, Math.max(0, 1 - grain + grain * n));
}

/**
 * Filter region padding in px: the displacement moves pixels by up to `spread / 2` (the map's
 * full range), and the blur reaches about 3σ further.
 */
export function regionPadding(spread: number, blur: number): number {
	return Math.ceil(spread / 2 + 3 * blur + 2);
}
