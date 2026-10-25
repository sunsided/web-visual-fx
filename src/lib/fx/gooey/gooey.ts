import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

/** Parameters of the goo filter itself; shared by the blob field and the menu. */
export const gooSchema = defineSchema({
	blur: {
		kind: 'range',
		label: 'Blur',
		default: 12,
		min: 0,
		max: 30,
		step: 0.5,
		unit: 'px',
		group: 'Goo',
		description:
			'stdDeviation of the feGaussianBlur. Decides how far apart shapes can be and still merge.'
	},
	sharpness: {
		kind: 'range',
		label: 'Threshold sharpness (k)',
		default: 20,
		min: 1,
		max: 60,
		step: 1,
		group: 'Goo',
		description:
			'Alpha multiplier in the color matrix. Higher values give crisper edges; low values leave them blurry.'
	},
	offset: {
		kind: 'range',
		label: 'Threshold offset (b)',
		default: 9,
		min: 0,
		max: 40,
		step: 0.5,
		group: 'Goo',
		description:
			'Subtracted from the multiplied alpha. The edge sits where k·α − b crosses 0…1, around α = b / k: lower values make shapes fatter, higher values thinner.'
	},
	keepColors: {
		kind: 'toggle',
		label: 'Keep source colors',
		default: true,
		group: 'Goo',
		description:
			'Draws the original, unblurred shapes back on top (feComposite operator="atop"), so colors stay crisp and only the bridges between shapes come from the blur.'
	},
	region: {
		kind: 'range',
		label: 'Filter region padding',
		default: 20,
		min: 0,
		max: 50,
		step: 1,
		unit: '%',
		group: 'Goo',
		description:
			'How far the filter region extends beyond the shapes, in % of their bounding box. At 0, goo that spreads past the outermost shapes is cut off and they get flat sides.'
	}
});

export const gooeySchema = defineSchema({
	...gooSchema,
	count: {
		kind: 'range',
		label: 'Blob count',
		default: 9,
		min: 1,
		max: 14,
		step: 1,
		group: 'Blobs'
	},
	size: {
		kind: 'range',
		label: 'Blob size',
		default: 120,
		min: 24,
		max: 200,
		step: 1,
		unit: 'px',
		group: 'Blobs'
	},
	speed: {
		kind: 'range',
		label: 'Speed',
		default: 1,
		min: 0.1,
		max: 3,
		step: 0.05,
		unit: '×',
		group: 'Blobs',
		description: 'Drift speed. Drifting stops when the user prefers reduced motion or pauses it.'
	},
	colorA: { kind: 'color', label: 'Color A', default: '#ff4f9a', group: 'Blobs' },
	colorB: { kind: 'color', label: 'Color B', default: '#6f5cff', group: 'Blobs' },
	seed: {
		kind: 'range',
		label: 'Seed',
		default: 3,
		min: 0,
		max: 100,
		step: 1,
		group: 'Blobs',
		description: 'Picks a different, but repeatable, set of starting points and paths.'
	}
});

export type GooOptions = Values<typeof gooSchema>;
export type GooeyOptions = Values<typeof gooeySchema>;

export const gooDefaults: GooOptions = defaultsOf(gooSchema);
export const gooeyDefaults: GooeyOptions = defaultsOf(gooeySchema);

/**
 * The alpha row of the feColorMatrix: `A' = k·A − b` (the matrix works on 0…1 values, so b is
 * a fraction of full alpha, not of 255). RGB pass through unchanged.
 */
export function gooMatrix(sharpness: number, offset: number): string {
	return ['1 0 0 0 0', '0 1 0 0 0', '0 0 1 0 0', `0 0 0 ${sharpness} -${offset}`].join('  ');
}

/** What the color matrix does to one alpha value; the browser clamps the result to 0…1. */
export function thresholdAlpha(alpha: number, sharpness: number, offset: number): number {
	return Math.min(1, Math.max(0, sharpness * alpha - offset));
}

/**
 * Blurred alpha values that come out fully transparent (≤ `from`) and fully opaque (≥ `to`).
 * Everything in between is the anti-aliased edge; its width is 1 / k.
 */
export function thresholdBand(sharpness: number, offset: number): { from: number; to: number } {
	return { from: offset / sharpness, to: (offset + 1) / sharpness };
}

/**
 * A Gaussian blur reaches about 3σ before its contribution becomes invisible. Shapes closer
 * than this to each other (edge to edge, twice the reach) can start to merge, and the filter
 * region needs at least this much room around the shapes.
 */
export function blurReach(stdDeviation: number): number {
	return 3 * stdDeviation;
}

/** `x/y/width/height` attributes for a filter region padded by `percent` on every side. */
export function filterRegion(percent: number): {
	x: string;
	y: string;
	width: string;
	height: string;
} {
	return {
		x: `${-percent}%`,
		y: `${-percent}%`,
		width: `${100 + 2 * percent}%`,
		height: `${100 + 2 * percent}%`
	};
}

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
export function random(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface Blob {
	/** Start position, in % of the container. */
	x: number;
	y: number;
	/** Drift offset at the far end of the path, in % of the container. */
	dx: number;
	dy: number;
	/** Diameter, as a multiple of the base size. */
	scale: number;
	/** Seconds per one-way trip at speed 1. */
	duration: number;
	/** Negative delay in s, so blobs don't all start at the same spot of their path. */
	delay: number;
	/** 0…1, mix between color A and B. */
	mix: number;
}

/** Positions and drift paths of `count` blobs, kept away from the container edges. */
export function makeBlobs(count: number, seed: number): Blob[] {
	const rnd = random(seed);
	return Array.from({ length: count }, (_, i) => {
		const duration = 6 + rnd() * 8;
		return {
			x: 20 + rnd() * 60,
			y: 20 + rnd() * 60,
			dx: (rnd() - 0.5) * 40,
			dy: (rnd() - 0.5) * 40,
			scale: 0.6 + rnd() * 0.8,
			duration,
			delay: -rnd() * duration,
			mix: count === 1 ? 0 : i / (count - 1)
		};
	});
}

/** Clamps `value` to `[-limit, limit]` (limit is clamped to ≥ 0 first). */
export function clampOffset(value: number, limit: number): number {
	const l = Math.max(0, limit);
	return Math.min(l, Math.max(-l, value));
}

export const menuLayouts = ['right', 'up', 'arc'] as const;
export type MenuLayout = (typeof menuLayouts)[number];

/** Menu-only parameters; the menu also takes the goo filter's `blur`, `sharpness` and `offset`. */
export const gooeyMenuSchema = defineSchema({
	color: { kind: 'color', label: 'Color', default: '#6f5cff', group: 'Menu' },
	layout: {
		kind: 'select',
		label: 'Layout',
		default: 'right',
		options: menuLayouts,
		group: 'Menu',
		description: 'Where the items go when the menu opens: in a row, a column or a quarter circle.'
	},
	distance: {
		kind: 'range',
		label: 'Item spacing',
		default: 56,
		min: 40,
		max: 120,
		step: 1,
		unit: 'px',
		group: 'Menu',
		description: 'Distance between neighboring items (the radius, for the arc).'
	}
});

export type GooeyMenuOptions = Values<typeof gooeyMenuSchema>;
export const gooeyMenuDefaults: GooeyMenuOptions = defaultsOf(gooeyMenuSchema);

/** Largest arc radius, as a multiple of the item spacing. */
export const MAX_ARC_RADIUS = 3;

/** Offsets in px of each menu item from the toggle button's center, when the menu is open. */
export function menuOffsets(
	count: number,
	layout: MenuLayout,
	distance: number
): { x: number; y: number }[] {
	const round = (n: number) => Math.round(n * 100) / 100 + 0; // + 0 turns -0 into 0
	return Array.from({ length: count }, (_, i) => {
		switch (layout) {
			case 'right':
				return { x: (i + 1) * distance, y: 0 };
			case 'up':
				return { x: 0, y: -(i + 1) * distance };
			case 'arc': {
				// A quarter circle from straight up to straight right.
				const t = count === 1 ? 0.5 : i / (count - 1);
				const angle = (Math.PI / 2) * (1 - t);
				// The arc's radius grows with the item count, so neighbors stay `distance` apart, up to
				// MAX_ARC_RADIUS × distance (about six items); more items move closer together instead.
				const needed =
					count === 1 ? distance : distance / (2 * Math.sin(Math.PI / 4 / (count - 1)));
				const radius = Math.min(needed, MAX_ARC_RADIUS * distance);
				return { x: round(Math.cos(angle) * radius), y: round(-Math.sin(angle) * radius) };
			}
		}
	});
}

export interface MenuItem {
	label: string;
	/** Short glyph shown in the circle; hidden from assistive technology. */
	icon: string;
}

/** Icon colors of the menu, as hex so their contrast can be computed. */
export const INK_DARK = '#110e1c';
export const INK_LIGHT = '#ffffff';

/** WCAG relative luminance of a `#rrggbb` color. */
export function luminance(hex: string): number {
	const n = Number.parseInt(hex.slice(1), 16);
	const channel = (c: number) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	return (
		0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
	);
}

/** WCAG contrast ratio between two `#rrggbb` colors (1…21). */
export function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Whichever ink, dark or light, contrasts more with `background`. */
export function inkFor(background: string): string {
	return contrast(background, INK_DARK) >= contrast(background, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}
