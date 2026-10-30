import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { gooMatrix } from '../gooey/gooey.js';

export const outlineSchema = defineSchema({
	width: {
		kind: 'range',
		label: 'Width',
		default: 7,
		min: 1,
		max: 24,
		step: 0.5,
		unit: 'px',
		group: 'Stroke',
		description: 'feMorphology dilate radius: how far the outline grows past the shape.'
	},
	color: { kind: 'color', label: 'Color', default: '#ffffff', group: 'Stroke' },
	roundness: {
		kind: 'range',
		label: 'Roundness',
		default: 0.6,
		min: 0,
		max: 1,
		step: 0.05,
		group: 'Stroke',
		description:
			'Dilate grows by a square, so corners come out square. A blur and an alpha threshold round them off again. 0 leaves both out.'
	},
	ring: {
		kind: 'toggle',
		label: 'Second ring',
		default: true,
		group: 'Second ring',
		description: 'A thin keyline around the outline, as on a printed die-cut sticker.'
	},
	ringWidth: {
		kind: 'range',
		label: 'Ring width',
		default: 2.5,
		min: 0.5,
		max: 12,
		step: 0.5,
		unit: 'px',
		group: 'Second ring',
		when: 'ring'
	},
	ringColor: {
		kind: 'color',
		label: 'Ring color',
		default: '#120e26',
		group: 'Second ring',
		when: 'ring'
	},
	shadow: {
		kind: 'toggle',
		label: 'Drop shadow',
		default: true,
		group: 'Shadow',
		description: 'Cast by the whole sticker (outline included), not just the content.'
	},
	shadowX: {
		kind: 'range',
		label: 'Offset X',
		default: 0,
		min: -24,
		max: 24,
		step: 1,
		unit: 'px',
		group: 'Shadow',
		when: 'shadow'
	},
	shadowY: {
		kind: 'range',
		label: 'Offset Y',
		default: 6,
		min: -24,
		max: 24,
		step: 1,
		unit: 'px',
		group: 'Shadow',
		when: 'shadow'
	},
	shadowBlur: {
		kind: 'range',
		label: 'Blur',
		default: 6,
		min: 0,
		max: 24,
		step: 0.5,
		unit: 'px',
		group: 'Shadow',
		when: 'shadow',
		description: 'feGaussianBlur standard deviation.'
	},
	shadowColor: {
		kind: 'color',
		label: 'Color',
		default: '#0b0820',
		group: 'Shadow',
		when: 'shadow'
	},
	shadowOpacity: {
		kind: 'range',
		label: 'Opacity',
		default: 0.4,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Shadow',
		when: 'shadow'
	}
});

export type OutlineOptions = Values<typeof outlineSchema>;

export const outlineDefaults: OutlineOptions = defaultsOf(outlineSchema);

const round = (v: number) => +v.toFixed(3);

/**
 * Blur radius that rounds the corners of a dilated shape: up to half the dilate radius. Blurring
 * and thresholding at 50 % keeps straight edges where they are but pulls square corners in to a
 * curve of roughly that radius (and fills small notches).
 */
export function roundingBlur(width: number, roundness: number): number {
	return round(Math.max(0, roundness) * Math.max(0, width) * 0.5);
}

/** Sharpness of the 50 % alpha threshold after the rounding blur; the edge is 1/k wide in alpha. */
export const ROUNDING_SHARPNESS = 10;

/**
 * `feColorMatrix` values for the rounding threshold: `alpha · k − (k/2 − ½)`, which keeps 0.5 at
 * 0.5 and clips everything a little above or below it (the same matrix as the gooey effect's).
 */
export function roundingMatrix(sharpness = ROUNDING_SHARPNESS): string {
	return gooMatrix(sharpness, round(sharpness / 2 - 0.5));
}

/** Outer edge of the sticker in px from the content: the outline plus the optional ring. */
export function outerRadius({
	width,
	ring,
	ringWidth
}: Pick<OutlineOptions, 'width' | 'ring' | 'ringWidth'>): number {
	return round(width + (ring ? ringWidth : 0));
}

/**
 * Room in px the filter needs around the content: the outer edge, plus the shadow's reach
 * (offset and about 3σ of blur), plus a couple of px for antialiasing. The wrapper pads itself by
 * this much (and takes it back with a negative margin), so nothing is clipped by the filter
 * region, even on elements too small for a percentage margin.
 */
export function outlinePadding(
	o: Pick<
		OutlineOptions,
		'width' | 'ring' | 'ringWidth' | 'shadow' | 'shadowX' | 'shadowY' | 'shadowBlur'
	>
): number {
	const shadow = o.shadow
		? Math.max(Math.abs(o.shadowX), Math.abs(o.shadowY)) + 3 * Math.max(0, o.shadowBlur)
		: 0;
	return Math.ceil(outerRadius(o) + shadow) + 2;
}
