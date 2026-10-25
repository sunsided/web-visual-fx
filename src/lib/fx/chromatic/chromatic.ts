import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const splitModes = ['rgb', 'red-cyan', 'radial'] as const;

export type SplitMode = (typeof splitModes)[number];

export const chromaticSchema = defineSchema({
	mode: {
		kind: 'select',
		label: 'Split',
		default: 'rgb',
		options: splitModes,
		group: 'Split',
		description:
			'rgb: red and blue move in opposite directions, green stays. red-cyan: red one way, green and blue the other (anaglyph look). radial: like a cheap lens, channels drift apart towards the edges and line up in the center.'
	},
	distance: {
		kind: 'range',
		label: 'Distance',
		// Large type stays crisp enough to read; body text starts to suffer above ~2px.
		default: 3,
		min: 0,
		max: 24,
		step: 0.5,
		unit: 'px',
		group: 'Split',
		description:
			'How far red (and, in the other direction, blue) is moved. In radial mode: the offset at the edges.'
	},
	angle: {
		kind: 'range',
		label: 'Angle',
		default: 0,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Split',
		description: 'Direction red moves in: 0° is right, 90° down. Ignored in radial mode.'
	},
	jitter: {
		kind: 'toggle',
		label: 'Jitter',
		default: false,
		group: 'Motion',
		description:
			'Lets the offset wobble smoothly, like a misaligned old screen. Off when the user prefers reduced motion. The movement is slow and continuous, so it never flashes.'
	},
	jitterAmount: {
		kind: 'range',
		label: 'Jitter amount',
		default: 1.5,
		min: 0,
		max: 6,
		step: 0.25,
		unit: 'px',
		group: 'Motion',
		when: 'jitter'
	}
});

export type ChromaticOptions = Values<typeof chromaticSchema>;

export const chromaticDefaults: ChromaticOptions = defaultsOf(chromaticSchema);

export interface Offset {
	dx: number;
	dy: number;
}

export type ChannelOffsets = Record<'r' | 'g' | 'b', Offset>;

const round = (n: number) => Math.round(n * 100) / 100 + 0; // + 0 turns -0 into 0

/**
 * `feOffset` values per channel for the linear modes. Red moves `distance` px towards `angle`;
 * blue (and in red-cyan mode green) moves the same distance the opposite way.
 */
export function channelOffsets(mode: SplitMode, distance: number, angle: number): ChannelOffsets {
	const rad = (angle * Math.PI) / 180;
	const dx = round(Math.cos(rad) * distance);
	const dy = round(Math.sin(rad) * distance);
	const away = { dx: round(-dx), dy: round(-dy) };
	const none = { dx: 0, dy: 0 };
	if (mode === 'radial') return { r: none, g: none, b: none };
	return { r: { dx, dy }, g: mode === 'red-cyan' ? away : none, b: away };
}

/**
 * Filter region padding in px around the element: room for the furthest a channel can move
 * (distance plus jitter), plus a little for antialiasing. A percentage margin would clip small
 * elements, where a few px are already more than 10% of the box.
 */
export function regionPadding(distance: number, jitterAmount = 0): number {
	return Math.ceil(Math.max(0, distance) + Math.max(0, jitterAmount)) + 2;
}

export interface RadialMap {
	/** SVG data URL, stretched over the whole filter region. */
	url: string;
	/** How far from ½ the map's channels are at the element's edges (same on both axes). */
	edge: number;
}

const channel = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 25500) / 100;

/**
 * Displacement map for radial mode, for a `width` × `height` element inside a filter region
 * padded by `pad` px: red rises linearly from left to right, green from top to bottom, so
 * (R − ½, G − ½) points away from the center. Both axes use the same slope per px of the
 * element's half-size, chosen as steep as the [0, 1] range allows, so one `scale` reaches the
 * same offset at all four edges.
 */
export function radialMap(width: number, height: number, pad: number): RadialMap {
	const w = Math.max(1, width);
	const h = Math.max(1, height);
	// Half-size of the region relative to the element's half-size, per axis.
	const rx = (w + 2 * pad) / w;
	const ry = (h + 2 * pad) / h;
	const edge = 0.5 / Math.max(rx, ry);
	const stops = (r: number, color: (v: number) => string) =>
		`<stop offset="0" stop-color="${color(0.5 - edge * r)}"/>` +
		`<stop offset="1" stop-color="${color(0.5 + edge * r)}"/>`;
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 1 1" preserveAspectRatio="none">` +
		`<linearGradient id="x">${stops(rx, (v) => `rgb(${channel(v)},0,0)`)}</linearGradient>` +
		`<linearGradient id="y" x2="0" y2="1">${stops(ry, (v) => `rgb(0,${channel(v)},0)`)}</linearGradient>` +
		`<rect width="1" height="1" fill="url(#x)"/>` +
		`<rect width="1" height="1" fill="url(#y)" style="mix-blend-mode:screen"/>` +
		`</svg>`;
	return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, edge };
}

/**
 * `feDisplacementMap` scales per channel for radial mode, so the offset at the element's edges
 * is `distance`: the map is ½ ± `edge` there and the filter moves by `scale × (value − ½)`.
 * Negative scales sample from closer to the center, which makes that channel appear larger:
 * red grows, blue shrinks.
 */
export function radialScales(distance: number, edge: number): Record<'r' | 'g' | 'b', number> {
	const s = round(distance / edge);
	return { r: -s, g: 0, b: s };
}

/**
 * Smooth wobble in [-1, 1] on both axes at time `t` (seconds): a sum of slow sines with
 * unrelated periods, so it never visibly repeats. The fastest component is 1.7 Hz, well below
 * the three-per-second flash limit, and the motion is continuous (no jumps between frames).
 */
export function jitterAt(t: number): Offset {
	const x = 0.5 * Math.sin(2 * Math.PI * 0.43 * t) + 0.3 * Math.sin(2 * Math.PI * 1.07 * t + 1.3);
	const y = 0.5 * Math.sin(2 * Math.PI * 0.61 * t + 0.7) + 0.3 * Math.sin(2 * Math.PI * 1.7 * t);
	// Amplitudes sum to 0.8; scale to the full range.
	return { dx: x / 0.8, dy: y / 0.8 };
}

/** Fastest frequency in `jitterAt`, in Hz. */
export const JITTER_MAX_HZ = 1.7;
