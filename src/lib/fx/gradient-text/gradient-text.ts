import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { contrastRatio, hexToRgb, rgbToHex } from '../spotlight/spotlight.js';

export const textFills = ['gradient', 'solid', 'none'] as const;
export type TextFill = (typeof textFills)[number];

export const gradientKinds = ['linear', 'conic'] as const;
export type GradientKind = (typeof gradientKinds)[number];

export const gradientPalettes = ['custom', 'sunset', 'ocean', 'rainbow'] as const;
export type GradientPalette = (typeof gradientPalettes)[number];

/** Preset stops. Hex, so contrast can be checked; the custom palette uses the three colors. */
export const PALETTES: Record<Exclude<GradientPalette, 'custom'>, readonly string[]> = {
	sunset: ['#ff5f6d', '#ffc371', '#ff8fd8'],
	ocean: ['#3cf0ff', '#4f8bff', '#a77bff'],
	rainbow: ['#ff6b6b', '#ffc24b', '#9be564', '#4fd1ff', '#b38cff']
};

export const gradientTextSchema = defineSchema({
	fill: {
		kind: 'select',
		label: 'Fill',
		default: 'gradient',
		options: textFills,
		group: 'Fill',
		description:
			'gradient: background-clip: text. solid: the solid color. none: outline only (needs a stroke).'
	},
	gradient: {
		kind: 'select',
		label: 'Gradient',
		default: 'linear',
		options: gradientKinds,
		group: 'Fill',
		description: 'linear-gradient() at the angle, or conic-gradient() starting from it.'
	},
	palette: {
		kind: 'select',
		label: 'Palette',
		default: 'custom',
		options: gradientPalettes,
		group: 'Fill'
	},
	color1: { kind: 'color', label: 'Color 1', default: '#ff4ecd', group: 'Fill' },
	color2: { kind: 'color', label: 'Color 2', default: '#ffb84d', group: 'Fill' },
	color3: { kind: 'color', label: 'Color 3', default: '#5ee7ff', group: 'Fill' },
	solid: {
		kind: 'color',
		label: 'Solid / fallback',
		default: '#ffb84d',
		group: 'Fill',
		description:
			'The fill for "solid", and the text color wherever background-clip: text is not supported or forced colors are on.'
	},
	angle: {
		kind: 'range',
		label: 'Angle',
		default: 100,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Fill'
	},
	animate: {
		kind: 'toggle',
		label: 'Rotate gradient',
		default: true,
		group: 'Motion',
		description:
			'Turns the gradient angle through a registered <angle> custom property. Off under reduced motion.'
	},
	duration: {
		kind: 'range',
		label: 'Turn duration',
		default: 8,
		min: 2,
		max: 30,
		step: 0.5,
		unit: 's',
		group: 'Motion',
		when: 'animate'
	},
	stroke: {
		kind: 'range',
		label: 'Stroke width',
		default: 0,
		min: 0,
		max: 0.08,
		step: 0.005,
		unit: 'em',
		group: 'Outline',
		description: 'Visible outline width, relative to the font size (-webkit-text-stroke).'
	},
	strokeColor: { kind: 'color', label: 'Stroke color', default: '#ffffff', group: 'Outline' },
	strokeOutside: {
		kind: 'toggle',
		label: 'Stroke outside',
		default: true,
		group: 'Outline',
		description:
			'paint-order: stroke fill. The stroke is painted first and the fill covers its inner half, so letters keep their shape.'
	}
});

export type GradientTextOptions = Values<typeof gradientTextSchema>;

export const gradientTextDefaults: GradientTextOptions = defaultsOf(gradientTextSchema);

/** Thinnest stroke used for an outline-only fill, so the text never disappears. */
export const MIN_OUTLINE = 0.02;

const round = (v: number) => +v.toFixed(4);

/** The color stops for the options. */
export function stopsOf({
	palette,
	color1,
	color2,
	color3
}: Pick<GradientTextOptions, 'palette' | 'color1' | 'color2' | 'color3'>): string[] {
	return palette === 'custom' ? [color1, color2, color3] : [...PALETTES[palette]];
}

/**
 * The gradient image. `angle` is any CSS angle expression (e.g. `var(--gt-angle)`). A conic
 * gradient repeats its first color at the end, so there is no seam where it closes.
 */
export function gradientImage(kind: GradientKind, stops: readonly string[], angle: string): string {
	if (kind === 'conic') return `conic-gradient(from ${angle}, ${[...stops, stops[0]].join(', ')})`;
	return `linear-gradient(${angle}, ${stops.join(', ')})`;
}

/**
 * Stroke width to set. `-webkit-text-stroke` is centered on the glyph outline; with
 * `paint-order: stroke fill` the fill covers the inner half, so it is doubled to keep the
 * visible width. An outline-only fill gets at least `MIN_OUTLINE`.
 */
export function strokeWidth({
	stroke,
	strokeOutside,
	fill
}: Pick<GradientTextOptions, 'stroke' | 'strokeOutside' | 'fill'>): number {
	if (fill === 'none') return round(Math.max(stroke, MIN_OUTLINE));
	return round(strokeOutside ? stroke * 2 : stroke);
}

/** Colors along a gradient through `stops`, interpolated in gamma-encoded sRGB like CSS does for hex stops. */
export function sampleGradient(stops: readonly string[], samples = 32): string[] {
	if (stops.length === 1) return [stops[0]];
	const rgb = stops.map(hexToRgb);
	return Array.from({ length: samples + 1 }, (_, i) => {
		const t = (i / samples) * (rgb.length - 1);
		const k = Math.min(rgb.length - 2, Math.floor(t));
		const f = t - k;
		return rgbToHex(
			[0, 1, 2].map((c) => rgb[k][c] + (rgb[k + 1][c] - rgb[k][c]) * f) as [number, number, number]
		);
	});
}

/**
 * Lowest contrast of the visible text color against `background`, wherever it is: every sampled
 * gradient color for a gradient fill (mixing two colors can be darker than both), the solid
 * color for a solid fill, the stroke color for an outline.
 */
export function minTextContrast(options: GradientTextOptions, background: string): number {
	const colors =
		options.fill === 'gradient'
			? sampleGradient(stopsOf(options))
			: options.fill === 'solid'
				? [options.solid]
				: [options.strokeColor];
	return Math.min(...colors.map((c) => contrastRatio(c, background)));
}
