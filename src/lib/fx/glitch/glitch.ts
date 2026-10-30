import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { random } from '../aurora/aurora.js';
import { pngDataUrl } from '../crt/crt.js';

export const stillModes = ['split', 'frame', 'none'] as const;

export type StillMode = (typeof stillModes)[number];

export const glitchSchema = defineSchema({
	shift: {
		kind: 'range',
		label: 'Slice shift',
		default: 36,
		min: 0,
		max: 160,
		step: 1,
		unit: 'px',
		group: 'Slices',
		description: 'Largest sideways jump of a slice. Each slice gets a random share of it.'
	},
	slices: {
		kind: 'range',
		label: 'Slices',
		default: 7,
		min: 1,
		max: 24,
		step: 1,
		group: 'Slices',
		description: 'How many horizontal bands are displaced per glitch frame.'
	},
	sliceHeight: {
		kind: 'range',
		label: 'Slice height',
		default: 28,
		min: 2,
		max: 160,
		step: 1,
		unit: 'px',
		group: 'Slices',
		description: 'Tallest band. Bands are between a sixth of this and the full height.'
	},
	seed: {
		kind: 'range',
		label: 'Seed',
		default: 7,
		min: 0,
		max: 999,
		step: 1,
		group: 'Slices',
		description: 'Picks the slice layouts. The same seed always gives the same sequence.'
	},
	split: {
		kind: 'range',
		label: 'Channel split',
		default: 1.5,
		min: 0,
		max: 12,
		step: 0.5,
		unit: 'px',
		group: 'Color',
		description:
			'Static RGB split, always on: red moves right, blue left. This is also the reduced-motion look.'
	},
	burstSplit: {
		kind: 'range',
		label: 'Burst split',
		default: 5,
		min: 0,
		max: 24,
		step: 0.5,
		unit: 'px',
		group: 'Color',
		description: 'Extra split during a glitch frame.'
	},
	fringe: {
		kind: 'range',
		label: 'Slice fringe',
		default: 0.35,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Color',
		description:
			'Displaced slices move red further and blue less far than green, so the cut edges tear into colors.'
	},
	bursts: {
		kind: 'toggle',
		label: 'Bursts',
		default: true,
		group: 'Motion',
		description: `Occasional glitch bursts. At most 4 picture changes per second (photosensitivity); off with prefers-reduced-motion and inside a paused region.`
	},
	interval: {
		kind: 'range',
		label: 'Burst interval',
		default: 2.5,
		min: 1,
		max: 10,
		step: 0.25,
		unit: 's',
		group: 'Motion',
		when: 'bursts',
		description: 'One burst per interval, at a random moment inside it.'
	},
	burstFrames: {
		kind: 'range',
		label: 'Burst frames',
		default: 2,
		min: 1,
		max: 4,
		step: 1,
		group: 'Motion',
		when: 'bursts',
		description: 'Glitch frames per burst, each held for a quarter of a second.'
	},
	still: {
		kind: 'select',
		label: 'Still image',
		default: 'split',
		options: stillModes,
		group: 'Motion',
		description:
			'What shows without bursts (switched off or prefers-reduced-motion). split: only the static channel split. frame: one frozen glitch frame. none: no filter.'
	}
});

export type GlitchOptions = Values<typeof glitchSchema>;

export const glitchDefaults: GlitchOptions = defaultsOf(glitchSchema);

// ---------------------------------------------------------------------------------------------
// Photosensitivity

/**
 * Photosensitivity guard (WCAG 2.3.1, three flashes, the same rule CRT's `safeFlicker` follows).
 *
 * A glitch frame can move bright content onto dark content anywhere in the element, and the area
 * involved can be large, so the guard doesn't rely on the size or contrast of a change. It caps
 * how often the picture may change at all: the bursts run on a fixed clock of `TICK_HZ` = 4 ticks
 * per second, and the picture can only change on a tick. A WCAG flash is a *pair* of opposing
 * changes, so 4 changes per second are at most 2 flashes per second, below the limit of 3 even
 * if every change were a full-contrast flash. Between two bursts there is always at least one calm
 * tick (see `glitchFrameAt`).
 */
export const TICK_HZ = 4;
export const MAX_CHANGES_PER_SECOND = TICK_HZ;

/** Worst case flashes per second: every change is half of a flash. */
export const MAX_FLASHES_PER_SECOND = MAX_CHANGES_PER_SECOND / 2;

/** Picture changes in a list of frame keys, one per tick (any differing neighbors). */
export function countChanges(frames: readonly number[]): number {
	let n = 0;
	for (let i = 1; i < frames.length; i++) if (frames[i] !== frames[i - 1]) n++;
	return n;
}

// ---------------------------------------------------------------------------------------------
// Burst schedule

/** Mixes two integers into a 32-bit seed (one round of a murmur-style finalizer). */
export function hash(a: number, b: number): number {
	let h = (Math.imul(a >>> 0, 0x9e3779b1) ^ Math.imul(b >>> 0, 0x85ebca77)) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
	h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
	return (h ^ (h >>> 16)) >>> 0;
}

/** Ticks per burst period: the interval in ticks, but always room for the burst plus a calm tick. */
export function periodTicks(interval: number, burstFrames: number): number {
	return Math.max(Math.round(interval * TICK_HZ), Math.round(burstFrames) + 1);
}

/**
 * The frame shown at clock tick `tick`: 0 for calm, otherwise a key (≥ 1) that seeds that frame's
 * slice layout. Stateless, so any tick can be computed on its own: time is cut into periods of
 * `periodTicks`, and each period holds one burst of `burstFrames` consecutive ticks starting at a
 * seeded offset. The first tick of every period is calm, so bursts never run into each other.
 */
export function glitchFrameAt(
	seed: number,
	tick: number,
	{ interval, burstFrames }: Pick<GlitchOptions, 'interval' | 'burstFrames'>
): number {
	const frames = Math.max(1, Math.round(burstFrames));
	const period = periodTicks(interval, frames);
	const p = Math.floor(tick / period);
	const offset = tick - p * period;
	// Start somewhere in 1 … period − frames, so the burst fits and tick 0 stays calm.
	const start = 1 + Math.floor(random(hash(seed, p))() * (period - frames));
	if (offset < start || offset >= start + frames) return 0;
	return 1 + (hash(seed + 1, tick) % 0xfffffe);
}

// ---------------------------------------------------------------------------------------------
// Slice map

/**
 * Horizontal offset per row, in −1…1 (0 = row stays put), for a `rows` px tall element.
 * Places `slices` bands at seeded positions, each between a sixth of `sliceHeight` and the full
 * height, with a seeded direction and a magnitude of at least 0.2, so every band visibly moves.
 * Bands may overlap; a later band wins.
 */
export function sliceOffsets(
	key: number,
	rows: number,
	slices: number,
	sliceHeight: number
): Float32Array {
	const h = Math.max(1, Math.round(rows));
	const out = new Float32Array(h);
	const rand = random(hash(key, 0x51ce));
	const tallest = Math.max(1, sliceHeight);
	for (let s = 0; s < Math.round(slices); s++) {
		const height = Math.max(1, Math.round(tallest * (1 / 6 + (5 / 6) * rand())));
		const top = Math.floor(rand() * Math.max(1, h - height + 1));
		const sign = rand() < 0.5 ? -1 : 1;
		const amount = sign * (0.2 + 0.8 * rand());
		out.fill(amount, top, Math.min(h, top + height));
	}
	return out;
}

/**
 * A 1 px wide RGB map (row-major, 3 bytes per row) for `feDisplacementMap`: red holds the row's
 * offset around 128 (128 = none, 1 and 255 the extremes), green and blue are 128. It is stretched
 * sideways over the filter region; since every row is one color, stretching changes nothing.
 */
export function sliceMap(offsets: Float32Array): Uint8Array {
	const data = new Uint8Array(offsets.length * 3);
	for (let y = 0; y < offsets.length; y++) {
		data[y * 3] = Math.round(128 + Math.max(-1, Math.min(1, offsets[y])) * 127);
		data[y * 3 + 1] = 128;
		data[y * 3 + 2] = 128;
	}
	return data;
}

/** The slice map for one frame as a PNG data URL (no canvas, so it is the same everywhere). */
export function sliceMapUrl(
	key: number,
	rows: number,
	{ slices, sliceHeight }: Pick<GlitchOptions, 'slices' | 'sliceHeight'>
): string {
	const offsets = sliceOffsets(key, rows, slices, sliceHeight);
	return pngDataUrl(1, offsets.length, sliceMap(offsets));
}

/**
 * `feDisplacementMap` scales per channel for a largest shift of `shift` px. The filter moves by
 * `scale × (R − ½)` and the map reaches ½ ± 127/255, so the scale is about twice the shift. Red
 * gets `1 + fringe` of it, blue `1 − fringe`.
 */
export function sliceScales(shift: number, fringe: number): Record<'r' | 'g' | 'b', number> {
	const s = (shift * 255) / 127;
	const r = (v: number) => Math.round(v * 100) / 100;
	return { r: r(s * (1 + fringe)), g: r(s), b: r(s * (1 - fringe)) };
}

/** Horizontal filter-region padding: room for the largest slice shift plus the split. */
export function glitchPadding(
	shift: number,
	fringe: number,
	split: number,
	burstSplit: number
): number {
	return Math.ceil(Math.max(0, shift) * (1 + Math.max(0, fringe)) + split + burstSplit) + 2;
}

/** Layout key of the frozen frame shown by `still: 'frame'`. */
export function stillFrameKey(seed: number): number {
	return 1 + (hash(seed, 0x5711) % 0xfffffe);
}
