import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { pngDataUrl } from '../crt/crt.js';

export const lensProfiles = ['loupe', 'fisheye'] as const;

export type LensProfile = (typeof lensProfiles)[number];

export const magnifierSchema = defineSchema({
	radius: {
		kind: 'range',
		label: 'Lens radius',
		default: 96,
		min: 24,
		max: 240,
		step: 1,
		unit: 'px',
		group: 'Lens'
	},
	zoom: {
		kind: 'range',
		label: 'Zoom',
		default: 2,
		min: 1,
		max: 4,
		step: 0.05,
		unit: '×',
		group: 'Lens',
		description: 'Magnification at the center of the lens.'
	},
	profile: {
		kind: 'select',
		label: 'Profile',
		default: 'loupe',
		options: lensProfiles,
		group: 'Lens',
		description:
			'loupe: evenly magnified inside, squeezed into a narrow rim. fisheye: strongest in the center, easing off smoothly towards the edge.'
	},
	rim: {
		kind: 'range',
		label: 'Rim width',
		default: 0.3,
		min: 0.05,
		max: 0.6,
		step: 0.01,
		group: 'Lens',
		description:
			'Loupe only: share of the radius where the magnified center blends back into the surroundings.'
	},
	smoothing: {
		kind: 'range',
		label: 'Smoothing',
		default: 0.35,
		min: 0,
		max: 0.95,
		step: 0.01,
		group: 'Motion',
		description:
			'How much the lens lags behind the pointer. 0 follows exactly; ignored with prefers-reduced-motion.'
	},
	ring: {
		kind: 'range',
		label: 'Ring',
		default: 0.6,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Look',
		description: 'Opacity of the lens frame and its highlight.'
	},
	shadow: {
		kind: 'range',
		label: 'Shadow',
		default: 0.4,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Look'
	},
	backdrop: {
		kind: 'toggle',
		label: 'Backdrop mode',
		default: false,
		group: 'Advanced',
		description:
			'Magnify through backdrop-filter on the lens instead of filtering the content. Only processes the lens area, but renders in Chromium only; elsewhere it falls back to the content filter.'
	}
});

export type MagnifierOptions = Values<typeof magnifierSchema>;

export const magnifierDefaults: MagnifierOptions = defaultsOf(magnifierSchema);

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const smoothstep = (v: number) => {
	const t = clamp(v);
	return t * t * (3 - 2 * t);
};

/**
 * Sampling factor f(t) at normalized distance t (0 center, 1 edge): a pixel at distance t from the
 * center shows the content from t·f(t). f = 1/zoom magnifies, f = 1 leaves the content alone. Both
 * profiles reach f(1) = 1, so the lens meets its surroundings without a seam, and t·f(t) rises
 * monotonically, so the picture never folds over.
 *
 * - loupe: f = 1/zoom up to 1 − rim, then a smoothstep back to 1 across the rim.
 * - fisheye: f = 1 − (1 − 1/zoom)(1 − t²)²; its derivative is 1/zoom at the center and rises.
 */
export function sampleFactor(profile: LensProfile, t: number, zoom: number, rim: number): number {
	const k = 1 - 1 / Math.max(1, zoom);
	if (t >= 1) return 1;
	if (profile === 'fisheye') return 1 - k * (1 - t * t) ** 2;
	const inner = 1 - clamp(rim, 0.01, 1);
	return 1 - k * (1 - smoothstep((t - inner) / (1 - inner)));
}

/** Largest offset inside the lens, in units of the radius: max over t of t·(1 − f(t)). */
export function maxOffset(profile: LensProfile, zoom: number, rim: number): number {
	let max = 0;
	for (let i = 0; i <= 512; i++) {
		const t = i / 512;
		max = Math.max(max, t * (1 - sampleFactor(profile, t, zoom, rim)));
	}
	return max;
}

export interface LensMapOptions {
	radius: number;
	zoom: number;
	profile: LensProfile;
	rim: number;
}

/**
 * RGB pixels (row-major, 3 bytes each) of the lens's displacement map, a square of 2·radius px.
 * The offset at a pixel is (p − c)·(f − 1): towards the center, so the content is sampled from
 * closer in and appears magnified. Red and green hold its x and y around 128, scaled so the
 * largest offset reaches 1 or 255; blue is unused (128). Outside the circle the map is neutral.
 */
export function lensMap({ radius, zoom, profile, rim }: LensMapOptions): {
	size: number;
	data: Uint8Array;
} {
	const size = Math.max(2, Math.round(radius * 2));
	const r = size / 2;
	const max = maxOffset(profile, zoom, rim);
	const data = new Uint8Array(size * size * 3).fill(128);
	if (max === 0) return { size, data };
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const u = (x + 0.5 - r) / r;
			const v = (y + 0.5 - r) / r;
			const t = Math.hypot(u, v);
			if (t >= 1) continue;
			const f = sampleFactor(profile, t, zoom, rim);
			const i = (y * size + x) * 3;
			data[i] = Math.round(128 + ((u * (f - 1)) / max) * 127);
			data[i + 1] = Math.round(128 + ((v * (f - 1)) / max) * 127);
		}
	}
	return { size, data };
}

/** The lens map as a PNG data URL (no canvas, so it is identical everywhere). */
export function lensMapUrl(options: LensMapOptions): string {
	const { size, data } = lensMap(options);
	return pngDataUrl(size, size, data);
}

/**
 * `feDisplacementMap` scale for the lens: the filter moves by `scale × (R − ½)`, the map reaches
 * ½ ± 127/255 at the largest offset, and that offset is `maxOffset × radius` px.
 */
export function lensScale({ radius, zoom, profile, rim }: LensMapOptions): number {
	return +((maxOffset(profile, zoom, rim) * radius * 255) / 127).toFixed(2);
}

export interface Point {
	x: number;
	y: number;
}

/** Keyboard step in unit coordinates (0–1 of the element): small by default, larger with Shift. */
export const KEY_STEP = 0.02;
export const KEY_STEP_LARGE = 0.1;

/**
 * Where a key press moves the lens (unit coordinates, clamped to the element), or `null` for keys
 * the lens doesn't handle. Arrows move, Shift + arrow moves further, Home centers.
 */
export function keyMove(point: Point, key: string, large = false): Point | null {
	const s = large ? KEY_STEP_LARGE : KEY_STEP;
	switch (key) {
		case 'ArrowLeft':
			return { x: clamp(point.x - s), y: point.y };
		case 'ArrowRight':
			return { x: clamp(point.x + s), y: point.y };
		case 'ArrowUp':
			return { x: point.x, y: clamp(point.y - s) };
		case 'ArrowDown':
			return { x: point.x, y: clamp(point.y + s) };
		case 'Home':
			return { x: 0.5, y: 0.5 };
		default:
			return null;
	}
}

/** Human-readable lens position for assistive technology. */
export function positionText({ x, y }: Point): string {
	return `${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`;
}
