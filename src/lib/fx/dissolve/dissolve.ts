import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { pngDataUrl } from '../crt/crt.js';
import { filterRegion } from '../gooey/gooey.js';

export const origins = ['none', 'bottom', 'top', 'left', 'right', 'center', 'edges'] as const;
export type Origin = (typeof origins)[number];

export const dissolveModes = ['auto', 'burn', 'fade'] as const;
export type DissolveMode = (typeof dissolveModes)[number];

/** Look of the burn; shared by the `Dissolve` wrapper and the `dissolve` transition. */
export const burnSchema = defineSchema({
	noiseScale: {
		kind: 'range',
		label: 'Noise scale',
		default: 48,
		min: 4,
		max: 240,
		step: 1,
		unit: 'px',
		group: 'Noise',
		description:
			'Rough size of the burning patches. The feTurbulence baseFrequency is its inverse (1 / scale).'
	},
	octaves: {
		kind: 'range',
		label: 'Octaves',
		default: 3,
		min: 1,
		max: 6,
		step: 1,
		group: 'Noise',
		description: 'Layers of detail in the noise. More octaves give a more ragged, frayed edge.'
	},
	seed: {
		kind: 'range',
		label: 'Seed',
		default: 7,
		min: 0,
		max: 500,
		step: 1,
		group: 'Noise'
	},
	origin: {
		kind: 'select',
		label: 'Burn starts at',
		default: 'bottom',
		options: origins,
		group: 'Noise',
		description:
			'Mixes a gradient into the noise so the burn travels across the element instead of popping up everywhere at once. none = pure noise.'
	},
	bias: {
		kind: 'range',
		label: 'Direction strength',
		default: 0.5,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Noise',
		description:
			'Share of the gradient in the threshold field: 0 is pure noise, 1 is a clean straight (or round) wipe.'
	},
	ember: { kind: 'color', label: 'Ember color', default: '#ffae3d', group: 'Edge' },
	emberWidth: {
		kind: 'range',
		label: 'Ember width',
		default: 0.03,
		min: 0,
		max: 0.2,
		step: 0.005,
		group: 'Edge',
		description:
			'Width of the glowing band, as a share of the threshold field (0–1), not in px: how far ahead of the hole the edge starts to glow.'
	},
	char: { kind: 'color', label: 'Char color', default: '#2a1208', group: 'Edge' },
	charWidth: {
		kind: 'range',
		label: 'Char width',
		default: 0.03,
		min: 0,
		max: 0.2,
		step: 0.005,
		group: 'Edge',
		description: 'A darker, scorched band between the ember and the intact content. 0 = none.'
	},
	sharpness: {
		kind: 'range',
		label: 'Edge sharpness',
		default: 50,
		min: 4,
		max: 200,
		step: 1,
		group: 'Edge',
		description:
			'Slope of each threshold step. The step is 1 / sharpness wide in field units: low values blur the bands into each other.'
	},
	glow: {
		kind: 'range',
		label: 'Glow radius',
		default: 4,
		min: 0,
		max: 20,
		step: 0.5,
		unit: 'px',
		group: 'Edge',
		description: 'stdDeviation of a blurred copy of the ember band, drawn underneath it. 0 = off.'
	}
});

export const dissolveSchema = defineSchema({
	progress: {
		kind: 'range',
		label: 'Progress',
		default: 0.45,
		min: 0,
		max: 1,
		step: 0.005,
		group: 'Progress',
		description:
			'0 shows the element untouched, 1 has burnt it away completely (and hides it). Animate it for a transition.'
	},
	mode: {
		kind: 'select',
		label: 'Mode',
		default: 'auto',
		options: dissolveModes,
		group: 'Progress',
		description:
			'auto burns, but falls back to a plain opacity fade when the user prefers reduced motion. fade always fades.'
	},
	...burnSchema
});

export type BurnOptions = Values<typeof burnSchema>;
export type DissolveOptions = Values<typeof dissolveSchema>;

export const burnDefaults: BurnOptions = defaultsOf(burnSchema);
export const dissolveDefaults: DissolveOptions = defaultsOf(dissolveSchema);

/** Filter region padding in % of the element, so the ember glow isn't cut off at its border. */
export const REGION_PADDING = 6;

// ---------------------------------------------------------------------------------------------
// Making the noise uniform

/**
 * Spread of the alpha channel of `feTurbulence type="fractalNoise"`, by octave count. The values
 * are roughly normally distributed around 0.5; these standard deviations were measured from
 * 512×512 px renders in Chromium (seed 3, baseFrequency 0.01 and 0.03; the 1st/99th percentiles
 * sit near 0.23/0.77). They barely change above three octaves. The noise algorithm is fixed by
 * the Filter Effects spec, so every engine produces the same values.
 */
export const NOISE_SD = [0.106, 0.117, 0.121, 0.122, 0.122, 0.122] as const;
export const NOISE_MEAN = 0.5;

/** Standard deviation of the noise for `octaves` (clamped to the measured 1–6). */
export function noiseSd(octaves: number): number {
	const i = Math.min(NOISE_SD.length, Math.max(1, Math.round(octaves))) - 1;
	return NOISE_SD[i];
}

/** Error function (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7). */
export function erf(x: number): number {
	const sign = Math.sign(x);
	const a = Math.abs(x);
	const t = 1 / (1 + 0.3275911 * a);
	const y =
		1 -
		((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
			t *
			Math.exp(-a * a);
	return sign * y;
}

/** Cumulative distribution of a normal distribution. */
export function normalCdf(x: number, mean: number, sd: number): number {
	return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

const round = (v: number, digits = 4) => +v.toFixed(digits);

/**
 * `tableValues` for an `feFuncR type="table"` that turns the bell-shaped noise into uniformly
 * distributed values: each entry is the noise CDF at an evenly spaced input, rescaled so 0 maps
 * to exactly 0 and 1 to exactly 1. Without it most pixels sit near 0.5 and the burn would
 * crawl at the start and end and rush through the middle; with it, `progress` is close to the
 * share of the element that has burnt away (for origin `none`).
 */
export function equalizeTable(octaves: number, samples = 33): number[] {
	const sd = noiseSd(octaves);
	const lo = normalCdf(0, NOISE_MEAN, sd);
	const hi = normalCdf(1, NOISE_MEAN, sd);
	return Array.from({ length: samples }, (_, i) => {
		const x = i / (samples - 1);
		return round((normalCdf(x, NOISE_MEAN, sd) - lo) / (hi - lo));
	});
}

// ---------------------------------------------------------------------------------------------
// Thresholds

export interface Thresholds {
	/** Field value below which the element has burnt away (the ember's outer edge). */
	burnt: number;
	/** Between `burnt` and this the ember glows; above it the char band starts. */
	ember: number;
	/** Above this the content is intact. */
	intact: number;
}

/**
 * Where the three bands sit in the 0–1 threshold field for a given `progress`. The burn front t
 * runs from `−(ember + char) − 1/sharpness` at progress 0 to 1 at progress 1. Those end points
 * are exact: at 0 every field value (≥ 0) is fully intact even after the soft step, and at 1
 * none (≤ 1) is left, ember band included.
 */
export function thresholds(
	progress: number,
	{ emberWidth, charWidth, sharpness }: Pick<BurnOptions, 'emberWidth' | 'charWidth' | 'sharpness'>
): Thresholds {
	const p = Math.min(1, Math.max(0, progress));
	const start = -(emberWidth + charWidth) - 1 / sharpness;
	const burnt = start + (1 - start) * p;
	return { burnt, ember: burnt + emberWidth, intact: burnt + emberWidth + charWidth };
}

/**
 * `feColorMatrix` values that read the field from R and write a soft step into alpha:
 * `A = sharpness · (R − at)`, clamped to 0–1 by the browser. RGB become 0; only alpha is used.
 */
export function stepMatrix(at: number, sharpness: number): string {
	return `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${round(sharpness)} 0 0 0 ${round(-sharpness * at)}`;
}

/** What `stepMatrix` does to one field value. */
export function stepAlpha(value: number, at: number, sharpness: number): number {
	return Math.min(1, Math.max(0, sharpness * (value - at)));
}

/** The opacity of each band at one field value, the way the filter composites them. */
export function bandsAt(
	value: number,
	progress: number,
	options: Pick<BurnOptions, 'emberWidth' | 'charWidth' | 'sharpness'>
): { content: number; char: number; ember: number } {
	const t = thresholds(progress, options);
	const k = options.sharpness;
	const notBurnt = stepAlpha(value, t.burnt, k);
	const unlit = stepAlpha(value, t.ember, k);
	const intact = stepAlpha(value, t.intact, k);
	// feComposite operator="out": A·(1 − B)
	return { content: intact, char: unlit * (1 - intact), ember: notBurnt * (1 - unlit) };
}

// ---------------------------------------------------------------------------------------------
// Direction ramp

/** Gradient value (0 burns first, 1 last) at a point in the unit square. */
export function originRamp(origin: Origin, x: number, y: number): number {
	const r = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
	switch (origin) {
		case 'bottom':
			return 1 - y;
		case 'top':
			return y;
		case 'left':
			return x;
		case 'right':
			return 1 - x;
		case 'center':
			return Math.min(1, r);
		case 'edges':
			return Math.max(0, 1 - r);
		case 'none':
			return 0.5;
	}
}

/** `size`×`size` grey RGB pixels of the ramp, sampled at pixel centers. */
export function originMap(origin: Origin, size = 64): Uint8Array {
	const rgb = new Uint8Array(size * size * 3);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const v = Math.round(255 * originRamp(origin, (x + 0.5) / size, (y + 0.5) / size));
			rgb.fill(v, (y * size + x) * 3, (y * size + x) * 3 + 3);
		}
	}
	return rgb;
}

const mapCache = new Map<Origin, string>();

/** The ramp as a PNG data URL (computed once per origin). */
export function originMapUrl(origin: Origin): string {
	let url = mapCache.get(origin);
	if (!url) {
		url = pngDataUrl(64, 64, originMap(origin));
		mapCache.set(origin, url);
	}
	return url;
}

// ---------------------------------------------------------------------------------------------
// The filter

/** One filter primitive: element name, attributes and (for feComponentTransfer) children. */
export interface Primitive {
	tag: string;
	attrs: Record<string, string | number>;
	children?: Primitive[];
}

/**
 * The dissolve filter as a list of primitives, so the Svelte component, the imperative
 * `dissolve` transition and the code shown on the playground page all build the same thing.
 * The structure only depends on `origin`, `bias`, `charWidth` and `glow` being zero or not;
 * `progress` only changes attribute values, so a transition can update them in place.
 */
export function dissolvePrimitives(progress: number, o: BurnOptions): Primitive[] {
	const t = thresholds(progress, o);
	const directed = o.origin !== 'none' && o.bias > 0;
	const charred = o.charWidth > 0;
	const field = directed ? 'field' : 'noise';
	const step = (at: number, result: string): Primitive => ({
		tag: 'feColorMatrix',
		attrs: { in: field, type: 'matrix', values: stepMatrix(at, o.sharpness), result }
	});
	// Paints `color` where `inside` is opaque but `outside` isn't, clipped to the element's shape.
	const band = (color: string, inside: string, outside: string, result: string): Primitive[] => [
		{ tag: 'feFlood', attrs: { 'flood-color': color } },
		{ tag: 'feComposite', attrs: { in2: inside, operator: 'in' } },
		{ tag: 'feComposite', attrs: { in2: outside, operator: 'out' } },
		{ tag: 'feComposite', attrs: { in2: 'SourceAlpha', operator: 'in', result } }
	];

	return [
		{
			tag: 'feTurbulence',
			attrs: {
				type: 'fractalNoise',
				baseFrequency: round(1 / o.noiseScale, 5),
				numOctaves: o.octaves,
				seed: o.seed,
				result: 'turbulence'
			}
		},
		// The noise's alpha channel into R (alpha is never premultiplied, so it is the cleanest
		// channel to read), made opaque so the arithmetic mix below isn't skewed by alpha.
		{
			tag: 'feColorMatrix',
			attrs: {
				in: 'turbulence',
				type: 'matrix',
				values: '0 0 0 1 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1'
			}
		},
		{
			tag: 'feComponentTransfer',
			attrs: { result: 'noise' },
			children: [
				{
					tag: 'feFuncR',
					attrs: { type: 'table', tableValues: equalizeTable(o.octaves).join(' ') }
				}
			]
		},
		...(directed
			? [
					{
						tag: 'feImage',
						attrs: { href: originMapUrl(o.origin), preserveAspectRatio: 'none', result: 'ramp' }
					},
					{
						tag: 'feComposite',
						attrs: {
							in: 'noise',
							in2: 'ramp',
							operator: 'arithmetic',
							k2: round(1 - o.bias),
							k3: round(o.bias),
							result: 'field'
						}
					}
				]
			: []),
		step(t.burnt, 'notBurnt'),
		...(charred ? [step(t.ember, 'unlit')] : []),
		step(t.intact, 'intact'),
		{
			tag: 'feComposite',
			attrs: { in: 'SourceGraphic', in2: 'intact', operator: 'in', result: 'content' }
		},
		...(charred ? band(o.char, 'unlit', 'intact', 'charBand') : []),
		...band(o.ember, 'notBurnt', charred ? 'unlit' : 'intact', 'emberBand'),
		...(o.glow > 0
			? [
					{
						tag: 'feGaussianBlur',
						attrs: { in: 'emberBand', stdDeviation: o.glow, result: 'glow' }
					}
				]
			: []),
		{
			tag: 'feMerge',
			attrs: {},
			children: [
				...(o.glow > 0 ? ['glow', 'glow'] : []),
				'content',
				...(charred ? ['charBand'] : []),
				'emberBand'
			].map((input) => ({ tag: 'feMergeNode', attrs: { in: input } }))
		}
	];
}

/** Attributes of the `<filter>` element itself. */
export function filterAttrs(): Record<string, string> {
	return { ...filterRegion(REGION_PADDING), 'color-interpolation-filters': 'sRGB' };
}

/** Serializes primitives as indented SVG markup (for code samples). */
export function primitivesMarkup(primitives: Primitive[], indent = '    '): string {
	return primitives
		.map((p) => {
			const attrs = Object.entries(p.attrs)
				.map(
					([k, v]) =>
						` ${k}="${k === 'href' && String(v).startsWith('data:') ? 'data:image/png;base64,…' : v}"`
				)
				.join('');
			if (!p.children?.length) return `${indent}<${p.tag}${attrs} />`;
			return [
				`${indent}<${p.tag}${attrs}>`,
				primitivesMarkup(p.children, indent + '  '),
				`${indent}</${p.tag}>`
			].join('\n');
		})
		.join('\n');
}
