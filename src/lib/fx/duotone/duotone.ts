import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

export const colorSpaces = ['sRGB', 'linearRGB'] as const;
export type ColorSpace = (typeof colorSpaces)[number];

export const duotoneSchema = defineSchema({
	shadow: { kind: 'color', label: 'Shadows', default: '#1d1145', group: 'Colors' },
	useMidtone: {
		kind: 'toggle',
		label: 'Midtone stop',
		default: true,
		group: 'Colors',
		description: 'A third color in the middle of the ramp (a gradient map instead of a duotone).'
	},
	midtone: {
		kind: 'color',
		label: 'Midtones',
		default: '#d6336c',
		group: 'Colors',
		when: 'useMidtone'
	},
	highlight: { kind: 'color', label: 'Highlights', default: '#ffe8a3', group: 'Colors' },
	contrast: {
		kind: 'range',
		label: 'Contrast',
		default: 1,
		min: 0.5,
		max: 2.5,
		step: 0.05,
		group: 'Tone',
		description: 'Stretches the luminance around mid-grey before it is mapped to colors.'
	},
	amount: {
		kind: 'range',
		label: 'Amount',
		default: 1,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Tone',
		description: 'Mix between the original (0) and the fully mapped colors (1).'
	},
	colorSpace: {
		kind: 'select',
		label: 'Color space',
		default: 'sRGB',
		options: colorSpaces,
		group: 'Advanced',
		description:
			'color-interpolation-filters: sRGB maps gamma-encoded luma, linearRGB maps true luminance and blends the ramp in linear light (lighter midtones).'
	}
});

export type DuotoneOptions = Values<typeof duotoneSchema>;

export const duotoneDefaults: DuotoneOptions = defaultsOf(duotoneSchema);

/** Rec. 709 / sRGB luminance weights for red, green and blue (they sum to 1). */
export const REC709 = [0.2126, 0.7152, 0.0722] as const;

/** `#rrggbb` → `[r, g, b]` in 0–1 (gamma-encoded sRGB). */
export function hexToRgb(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** sRGB transfer function, encoded 0–1 → linear-light 0–1. */
export function srgbToLinear(v: number): number {
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

const round = (v: number) => +v.toFixed(4);

/**
 * Luminance of perceptual mid-grey (sRGB `#808080`, i.e. 0.5 encoded) in the filter's color
 * space: 0.5 in sRGB, but only ≈ 0.214 once decoded to linear light. Contrast pivots around it,
 * so the same grey stays put in both modes.
 */
export function contrastPivot(colorSpace: ColorSpace = 'sRGB'): number {
	return colorSpace === 'linearRGB' ? srgbToLinear(0.5) : 0.5;
}

/**
 * `feColorMatrix type="matrix"` values that write `contrast`-stretched luminance into R, G and B
 * and keep alpha: every color row is `c·0.2126 c·0.7152 c·0.0722 0 (p − p·c)` for the pivot p
 * (see `contrastPivot`). The browser clamps the result to 0–1.
 */
export function luminanceMatrix(contrast = 1, pivot = 0.5): number[] {
	const row = [...REC709.map((w) => round(w * contrast)), 0, round(pivot - pivot * contrast)];
	return [...row, ...row, ...row, 0, 0, 0, 1, 0];
}

/**
 * `tableValues` for `feFuncR/G/B type="table"`, one list per channel. A table with n values
 * splits the input range into n − 1 equal segments and interpolates linearly inside each, so the
 * color stops are simply listed in order: shadows at 0, (midtones at 0.5,) highlights at 1.
 *
 * The filter works in `colorSpace`, so in linearRGB the stops are linearized first; otherwise the
 * browser would read the sRGB numbers as linear values and the end colors would come out wrong.
 */
export function tableValues(
	stops: readonly string[],
	colorSpace: ColorSpace = 'sRGB'
): [string, string, string] {
	const rgb = stops.map(hexToRgb);
	const encode = colorSpace === 'linearRGB' ? srgbToLinear : (v: number) => v;
	return [0, 1, 2].map((c) => rgb.map((color) => round(encode(color[c]))).join(' ')) as [
		string,
		string,
		string
	];
}

/** Color stops from shadows to highlights for the given options. */
export function stopsOf({
	shadow,
	midtone,
	highlight,
	useMidtone
}: Pick<DuotoneOptions, 'shadow' | 'midtone' | 'highlight' | 'useMidtone'>): string[] {
	return useMidtone ? [shadow, midtone, highlight] : [shadow, highlight];
}
