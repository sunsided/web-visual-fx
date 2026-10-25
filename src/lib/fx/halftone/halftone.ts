import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

export const halftoneModes = ['halftone', 'dither'] as const;
export type HalftoneMode = (typeof halftoneModes)[number];

export const bayerSizes = ['2', '4', '8'] as const;

export const halftoneSchema = defineSchema({
	mode: {
		kind: 'select',
		label: 'Mode',
		default: 'halftone',
		options: halftoneModes,
		group: 'Mode',
		description:
			'halftone: round dots from CSS gradients and a contrast() threshold. dither: SVG posterize with an optional ordered (Bayer) dither.'
	},
	monochrome: {
		kind: 'toggle',
		label: 'Monochrome',
		default: true,
		group: 'Mode',
		description: 'Off: every color channel is screened on its own, which gives RGB/CMY dots.'
	},
	ink: { kind: 'color', label: 'Ink', default: '#1b1a3a', group: 'Mode', when: 'monochrome' },
	paper: { kind: 'color', label: 'Paper', default: '#f6efe0', group: 'Mode', when: 'monochrome' },
	dotSize: {
		kind: 'range',
		label: 'Dot size',
		default: 10,
		min: 4,
		max: 40,
		step: 1,
		unit: 'px',
		group: 'Halftone',
		description: 'Distance between dot centers (the screen ruling).'
	},
	angle: {
		kind: 'range',
		label: 'Screen angle',
		default: 45,
		min: 0,
		max: 90,
		step: 1,
		unit: '°',
		group: 'Halftone',
		description: '45° is the traditional angle for black: the eye notices diagonal rows least.'
	},
	softness: {
		kind: 'range',
		label: 'Softness',
		default: 0.15,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Halftone',
		description: 'How soft the dot edges are: a weaker contrast() threshold.'
	},
	levels: {
		kind: 'range',
		label: 'Levels',
		default: 2,
		min: 2,
		max: 8,
		step: 1,
		group: 'Dither',
		description: 'Output levels per channel (2 = pure ink and paper).'
	},
	dither: {
		kind: 'toggle',
		label: 'Ordered dither',
		default: true,
		group: 'Dither',
		description: 'Adds a tiled Bayer threshold pattern before quantizing; off is plain posterize.'
	},
	matrixSize: {
		kind: 'select',
		label: 'Bayer matrix',
		default: '4',
		options: bayerSizes,
		group: 'Dither',
		when: 'dither',
		description: '2×2, 4×4 or 8×8 cells; bigger matrices fake more in-between tones.'
	},
	pixelSize: {
		kind: 'range',
		label: 'Pattern pixel',
		default: 2,
		min: 1,
		max: 6,
		step: 1,
		unit: 'px',
		group: 'Dither',
		when: 'dither',
		description: 'Size of one dither cell in CSS pixels; larger looks chunkier and more retro.'
	}
});

export type HalftoneOptions = Values<typeof halftoneSchema>;

export const halftoneDefaults: HalftoneOptions = defaultsOf(halftoneSchema);

/**
 * Bayer index matrix of size n (a power of two), built recursively:
 * `M(2n) = [[4M, 4M + 2], [4M + 3, 4M + 1]]`. Every value 0 … n² − 1 appears once, and
 * consecutive values are as far apart as possible, which is what makes ordered dither look even.
 */
export function bayerMatrix(n: number): number[][] {
	if (n < 1 || (n & (n - 1)) !== 0) throw new RangeError(`size must be a power of two, got ${n}`);
	if (n === 1) return [[0]];
	const half = bayerMatrix(n / 2);
	const h = n / 2;
	return Array.from({ length: n }, (_, y) =>
		Array.from({ length: n }, (_, x) => {
			const base = 4 * half[y % h][x % h];
			const quadrant = [
				[0, 2],
				[3, 1]
			][Math.floor(y / h)][Math.floor(x / h)];
			return base + quadrant;
		})
	);
}

/** Thresholds in 0–1, centered in their bins: `(M + 0.5) / n²`. */
export function bayerThresholds(n: number): number[][] {
	return bayerMatrix(n).map((row) => row.map((v) => (v + 0.5) / (n * n)));
}

/**
 * The threshold matrix as an SVG data URL, one grey square per cell, to be used as the
 * `href` of an `<feImage>` and repeated with `<feTile>`. Grey levels are 8-bit, which is
 * exact enough for up to 8×8 (64 thresholds).
 */
export function bayerTileUrl(n: number, cell = 1): string {
	const size = n * cell;
	const rects = bayerThresholds(n)
		.flatMap((row, y) =>
			row.map((t, x) => {
				const g = Math.round(t * 255);
				return `<rect x='${x * cell}' y='${y * cell}' width='${cell}' height='${cell}' fill='rgb(${g},${g},${g})'/>`;
			})
		)
		.join('');
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' shape-rendering='crispEdges'>${rects}</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * `feComposite operator="arithmetic"` coefficients that prepare a channel value `C` for
 * `feFuncX type="discrete"` with `levels` table entries.
 *
 * A discrete table with L entries outputs entry ⌊C′·L⌋. Ordered dither wants level
 * ⌊C·(L − 1) + t⌋ for a threshold t in 0–1, so the input becomes `C′ = C·(L − 1)/L + t/L`:
 * k2 scales the source (i1), k3 adds the threshold image (i2). Without dither, i2 is flat 50 %
 * grey, i.e. plain rounding to the nearest level. k2 + k3 = 1 keeps opaque alpha at exactly 1.
 */
export function quantizeCoefficients(levels: number): { k2: number; k3: number } {
	const l = Math.max(2, Math.round(levels));
	return { k2: (l - 1) / l, k3: 1 / l };
}

/** `tableValues` for `levels` evenly spaced outputs from 0 to 1, e.g. `0 0.5 1` for 3. */
export function discreteTable(levels: number): string {
	const l = Math.max(2, Math.round(levels));
	return Array.from({ length: l }, (_, i) => +(i / (l - 1)).toFixed(4)).join(' ');
}

/**
 * Color stops for one halftone dot: black in the center to 50 % grey at the cell corner
 * (`circle farthest-corner`). A pixel becomes ink when `g + L/2 < 0.5`, i.e. `g < (1 − L)/2`, so
 * the grey level g at distance r decides how dark it must get before the dot reaches r.
 *
 * For the inked *area* to match the darkness (1 − L), as on a printed screen, g grows with the
 * square of the distance: with r as a fraction of the half-diagonal, a dot of radius r covers
 * π/2 · r² of the cell, so `g = π/4 · r²`. That holds until neighboring dots touch (r² = ½, at
 * π/4 ≈ 79 % darkness); beyond that, g rises linearly to 0.5 at the corner, closing the
 * remaining holes.
 */
export function dotGradient(steps = 12): string {
	const touch = Math.PI / 8; // g where dots touch: π/4 · ½
	return Array.from({ length: steps + 1 }, (_, i) => {
		const r = i / steps;
		const r2 = r * r;
		const g = r2 <= 0.5 ? (Math.PI / 4) * r2 : touch + (0.5 - touch) * ((r2 - 0.5) / 0.5);
		const pct = +(g * 100).toFixed(2);
		return `rgb(${pct}% ${pct}% ${pct}%) ${+(r * 100).toFixed(2)}%`;
	}).join(', ');
}

/** CSS `contrast()` factor for a softness of 0 (hard edge) … 1 (soft edge). */
export function thresholdContrast(softness: number): number {
	const s = Math.min(1, Math.max(0, softness));
	return +(1 / (0.01 + 0.24 * s)).toFixed(2);
}

/** Blur of the source before screening: enough to average detail over about one dot. */
export function sourceBlur(dotSize: number): number {
	return +(dotSize * 0.3).toFixed(2);
}

/** `#rrggbb` → `[r, g, b]` 0–255 */
function channels(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: number[]) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * Colors for three blend layers that turn a black-and-white image into ink on paper with CSS
 * only. Per channel, black must become `ink` and white `paper`:
 * - `difference` with 255 inverts the channels where ink is lighter than paper (0 elsewhere),
 * - `lighten` with the smaller of the two lifts black to it,
 * - `darken` with the larger one pulls white down to it.
 * Exact for pure black and white; anti-aliased edges in between stay monotonic.
 */
export function inkLayers(
	ink: string,
	paper: string
): {
	invert: string;
	lighten: string;
	darken: string;
} {
	const i = channels(ink);
	const p = channels(paper);
	return {
		invert: toHex(i.map((v, c) => (v > p[c] ? 255 : 0))),
		lighten: toHex(i.map((v, c) => Math.min(v, p[c]))),
		darken: toHex(i.map((v, c) => Math.max(v, p[c])))
	};
}

/** `tableValues` per channel that map 0 → ink and 1 → paper (linear in between). */
export function inkTables(ink: string, paper: string): [string, string, string] {
	const i = channels(ink);
	const p = channels(paper);
	return [0, 1, 2].map((c) => `${+(i[c] / 255).toFixed(4)} ${+(p[c] / 255).toFixed(4)}`) as [
		string,
		string,
		string
	];
}
