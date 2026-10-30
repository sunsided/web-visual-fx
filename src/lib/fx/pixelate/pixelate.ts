import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const revealModes = ['none', 'hover'] as const;
export type RevealMode = (typeof revealModes)[number];

export const pixelateSchema = defineSchema({
	size: {
		kind: 'range',
		label: 'Block size',
		default: 12,
		min: 1,
		max: 64,
		step: 1,
		unit: 'px',
		group: 'Mosaic',
		description:
			'Edge length of one block in CSS pixels. At 1 the filter is removed and the content is sharp.'
	},
	gap: {
		kind: 'range',
		label: 'Gap',
		default: 0,
		min: 0,
		max: 12,
		step: 1,
		unit: 'px',
		group: 'Tiles',
		description: 'Grout between the blocks, taken off each block (the grid pitch stays the same).'
	},
	roundness: {
		kind: 'range',
		label: 'Roundness',
		default: 0,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Tiles',
		description: 'Corner radius of each tile: 0 is square, 1 is a circle (LED wall, bead mosaic).'
	},
	fillGrout: {
		kind: 'toggle',
		label: 'Fill grout',
		default: true,
		group: 'Tiles',
		description:
			'Paints the gaps and rounded corners with a color. Off: they stay transparent and show what is behind.'
	},
	grout: {
		kind: 'color',
		label: 'Grout',
		default: '#0e0c16',
		group: 'Tiles',
		when: 'fillGrout'
	},
	reveal: {
		kind: 'select',
		label: 'Reveal',
		default: 'none',
		options: revealModes,
		group: 'Reveal',
		description:
			'hover: the blocks shrink to the sharp content while the pointer is over it or focus is inside it.'
	},
	revealDuration: {
		kind: 'range',
		label: 'Reveal duration',
		default: 600,
		min: 0,
		max: 2000,
		step: 50,
		unit: 'ms',
		group: 'Reveal',
		description: 'Length of the reveal. Instant when the user prefers reduced motion.'
	}
});

export type PixelateOptions = Values<typeof pixelateSchema>;

export const pixelateDefaults: PixelateOptions = defaultsOf(pixelateSchema);

/** Geometry of one sample-and-hold cell, all in CSS pixels (filter user units). */
export interface MosaicCell {
	/** Block size (grid pitch), a whole number ≥ 1. */
	size: number;
	/** x and y of the sample dot inside the cell. */
	offset: number;
	/** Edge length of the sample dot: 1 for odd blocks, 2 for even ones. */
	dot: number;
	/** `feMorphology dilate` radius that grows the dot to exactly fill the cell. */
	radius: number;
}

/**
 * The sample dot and dilate radius for a block of `size` pixels. `feMorphology dilate` with radius
 * r turns a d×d dot into a (d + 2r)×(d + 2r) square. That must equal the block, or neighboring
 * blocks overlap (dilate keeps the larger value per channel, so the overlap bleeds) or leave
 * holes. A 1-pixel dot only reaches odd sizes, so even blocks sample a 2×2 dot. The dot sits
 * `radius` pixels from the cell's corner, which centers it: the sample is the middle of the block.
 */
export function mosaicCell(size: number): MosaicCell {
	const n = Math.max(1, Math.round(size));
	const dot = n % 2 === 0 ? 2 : 1;
	const radius = (n - dot) / 2;
	return { size: n, offset: radius, dot, radius };
}

/** Whether tiles need the shape mask: only with a gap or rounded corners. */
export function isShaped(gap: number, roundness: number): boolean {
	return gap > 0 || roundness > 0;
}

/** The tile shape inside one cell: a centered (rounded) square, `size − gap` wide. */
export function tileShape(
	size: number,
	gap: number,
	roundness: number
): { inset: number; side: number; rx: number } {
	const side = Math.max(0, size - Math.max(0, gap));
	const r = Math.min(1, Math.max(0, roundness));
	return { inset: +((size - side) / 2).toFixed(3), side, rx: +((r * side) / 2).toFixed(3) };
}

/**
 * One cell of the tile mask as an SVG data URL: a white (rounded) square on transparent, used as
 * the `href` of an `<feImage>` and repeated with `<feTile>`. `feComposite operator="in"` then keeps
 * the blocks only where the mask is opaque.
 */
export function tileMaskUrl(size: number, gap: number, roundness: number): string {
	const { inset, side, rx } = tileShape(size, gap, roundness);
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><rect x='${inset}' y='${inset}' width='${side}' height='${side}' rx='${rx}' fill='white'/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The block size actually drawn: tweened values are rounded, anything ≤ 1 means no filter. */
export function effectiveSize(size: number): number {
	return Math.max(1, Math.round(size));
}
