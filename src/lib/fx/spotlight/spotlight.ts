import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { relativeLuminance } from '../glass/glass.js';

export const spotlightSchema = defineSchema({
	glowRadius: {
		kind: 'range',
		label: 'Glow radius',
		default: 280,
		min: 60,
		max: 700,
		step: 10,
		unit: 'px',
		group: 'Glow',
		description: 'Radius of the light around the pointer. It spans the whole grid, not one card.'
	},
	color: { kind: 'color', label: 'Color', default: '#a78bfa', group: 'Glow' },
	twoTone: {
		kind: 'toggle',
		label: 'Two-tone',
		default: true,
		group: 'Glow',
		description: 'Fade from the first color in the center to a second one towards the edge.'
	},
	colorB: {
		kind: 'color',
		label: 'Second color',
		default: '#22d3ee',
		group: 'Glow',
		when: 'twoTone'
	},
	borderIntensity: {
		kind: 'range',
		label: 'Border intensity',
		default: 1,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Glow',
		description: 'Opacity of the glow in the card borders.'
	},
	surfaceIntensity: {
		kind: 'range',
		label: 'Surface intensity',
		default: 0.12,
		min: 0,
		max: 0.5,
		step: 0.01,
		group: 'Glow',
		description:
			'Opacity of the glow on the card faces. Capped automatically where it would push text contrast below 4.5:1.'
	},
	borderWidth: {
		kind: 'range',
		label: 'Border width',
		default: 1.5,
		min: 0.5,
		max: 6,
		step: 0.5,
		unit: 'px',
		group: 'Cards'
	},
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 16,
		min: 0,
		max: 40,
		step: 1,
		unit: 'px',
		group: 'Cards'
	},
	gap: {
		kind: 'range',
		label: 'Gap',
		default: 16,
		min: 0,
		max: 48,
		step: 1,
		unit: 'px',
		group: 'Cards'
	}
});

export type SpotlightOptions = Values<typeof spotlightSchema>;

export const spotlightDefaults: SpotlightOptions = defaultsOf(spotlightSchema);

/** Card face and text colors (also used by the components, see `SpotlightCard`). */
export const CARD_BG = '#15131f';
/** The dimmest text on a card (descriptions); the headings are lighter still. */
export const CARD_TEXT_MUTED = '#c4bfd6';

/** `#rrggbb` → [r, g, b], 0–255. */
export function hexToRgb(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `[r, g, b]` → `#rrggbb`. */
export function rgbToHex([r, g, b]: [number, number, number]): string {
	return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Source-over compositing of `top` at `alpha` onto an opaque `bottom`, in sRGB like browsers do. */
export function composite(bottom: string, top: string, alpha: number): string {
	const b = hexToRgb(bottom);
	const t = hexToRgb(top);
	return rgbToHex(
		[0, 1, 2].map((i) => t[i] * alpha + b[i] * (1 - alpha)) as [number, number, number]
	);
}

/** WCAG contrast ratio of two `#rrggbb` colors. */
export function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * Highest surface-glow opacity at which `text` keeps `minRatio` against the card face wherever
 * the glow is. The gradient is fully opaque at each of its color stops (the first color at the
 * center, the second at 45% of the radius), so the worst spot is whichever color is brighter, at
 * the given opacity. Every color is checked, so it doesn't matter which one that is.
 * Searches in steps of 0.01; returns 0 if even a faint glow is too much.
 */
export function maxSurfaceAlpha(
	glowColors: string[],
	{ bg = CARD_BG, text = CARD_TEXT_MUTED, minRatio = 4.5 } = {}
): number {
	let best = 0;
	for (let a = 0.01; a <= 1.0001; a += 0.01) {
		const ok = glowColors.every((c) => contrastRatio(text, composite(bg, c, a)) >= minRatio);
		if (!ok) break;
		best = +a.toFixed(2);
	}
	return best;
}

/** Surface glow opacity that is actually rendered: the requested one, capped for contrast. */
export function safeSurfaceAlpha(
	requested: number,
	{ color, colorB, twoTone }: Pick<SpotlightOptions, 'color' | 'colorB' | 'twoTone'>
): number {
	return Math.min(requested, maxSurfaceAlpha(twoTone ? [color, colorB] : [color]));
}

/**
 * Offsets of each card's top-left corner from the grid's top-left corner, in px. The grid
 * writes these once per layout change as `--spotlight-card-x/y`, so a pointer move only has to
 * write the grid's own two properties.
 */
export function cardOffsets(
	grid: { left: number; top: number },
	cards: { left: number; top: number }[]
): { x: number; y: number }[] {
	return cards.map((c) => ({ x: Math.round(c.left - grid.left), y: Math.round(c.top - grid.top) }));
}

/** The glow gradient for the current settings; `x`/`y` are CSS lengths. */
export function glowGradient(
	{
		glowRadius,
		color,
		colorB,
		twoTone
	}: Pick<SpotlightOptions, 'glowRadius' | 'color' | 'colorB' | 'twoTone'>,
	x = 'var(--_x)',
	y = 'var(--_y)'
): string {
	const second = twoTone ? colorB : `color-mix(in srgb, ${color} 45%, transparent)`;
	const stops = `${color}, ${second} 45%, transparent 100%`;
	return `radial-gradient(${glowRadius}px circle at ${x} ${y}, ${stops})`;
}
