import { describe, expect, it } from 'vitest';
import {
	countChanges,
	glitchDefaults,
	glitchFrameAt,
	glitchPadding,
	hash,
	MAX_CHANGES_PER_SECOND,
	MAX_FLASHES_PER_SECOND,
	periodTicks,
	sliceMap,
	sliceMapUrl,
	sliceOffsets,
	sliceScales,
	stillFrameKey,
	TICK_HZ
} from './glitch';

const frames = (seed: number, ticks: number, opts = glitchDefaults) =>
	Array.from({ length: ticks }, (_, t) => glitchFrameAt(seed, t, opts));

describe('hash', () => {
	it('is deterministic and spreads neighbors apart', () => {
		expect(hash(1, 2)).toBe(hash(1, 2));
		expect(hash(1, 2)).not.toBe(hash(2, 1));
		expect(hash(0, 0)).toBeGreaterThanOrEqual(0);
		expect(hash(0, 1)).not.toBe(hash(0, 2));
	});
});

describe('periodTicks', () => {
	it('converts the interval to ticks and leaves room for a calm tick', () => {
		expect(periodTicks(2.5, 2)).toBe(10);
		expect(periodTicks(0.25, 4)).toBe(5);
	});
});

describe('glitchFrameAt', () => {
	it('is pure: the same seed gives the same sequence', () => {
		expect(frames(3, 200)).toEqual(frames(3, 200));
		expect(frames(3, 200)).not.toEqual(frames(4, 200));
	});

	it('fires exactly one burst of burstFrames ticks per period', () => {
		for (const burstFrames of [1, 2, 3, 4]) {
			const opts = { ...glitchDefaults, interval: 2, burstFrames };
			const period = periodTicks(2, burstFrames);
			const seq = frames(11, period * 30, opts);
			for (let p = 0; p < 30; p++) {
				const slice = seq.slice(p * period, (p + 1) * period);
				expect(slice.filter((f) => f !== 0)).toHaveLength(burstFrames);
				// first tick of a period is always calm
				expect(slice[0]).toBe(0);
			}
		}
	});

	it('gives every burst frame its own layout key', () => {
		const opts = { ...glitchDefaults, burstFrames: 4 };
		const keys = frames(5, 400, opts).filter((f) => f !== 0);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('never changes the picture more than MAX_CHANGES_PER_SECOND times in any second', () => {
		expect(MAX_FLASHES_PER_SECOND).toBeLessThan(3);
		for (const interval of [1, 1.5, 4]) {
			for (const burstFrames of [1, 2, 4]) {
				const seq = frames(42, 2000, { ...glitchDefaults, interval, burstFrames });
				for (let t = 0; t + TICK_HZ < seq.length; t++) {
					// changes landing in [t, t + 1 s): between ticks t-1→t … t+3→t+4
					expect(countChanges(seq.slice(Math.max(0, t - 1), t + TICK_HZ))).toBeLessThanOrEqual(
						MAX_CHANGES_PER_SECOND
					);
				}
			}
		}
	});

	it('keeps at least one calm tick between bursts even at the shortest interval', () => {
		const seq = frames(9, 1000, { ...glitchDefaults, interval: 1, burstFrames: 4 });
		const period = periodTicks(1, 4);
		for (let t = 0; t < seq.length; t += period) expect(seq[t]).toBe(0);
	});
});

describe('sliceOffsets', () => {
	it('is deterministic per key and differs between keys', () => {
		expect(sliceOffsets(1, 300, 6, 30)).toEqual(sliceOffsets(1, 300, 6, 30));
		expect(sliceOffsets(1, 300, 6, 30)).not.toEqual(sliceOffsets(2, 300, 6, 30));
	});

	it('keeps offsets in range and leaves most rows alone', () => {
		const o = sliceOffsets(7, 600, 5, 20);
		expect(o).toHaveLength(600);
		const moved = [...o].filter((v) => v !== 0);
		expect(moved.length).toBeGreaterThan(0);
		expect(moved.length).toBeLessThanOrEqual(5 * 20);
		for (const v of moved) {
			expect(Math.abs(v)).toBeGreaterThanOrEqual(0.2 - 1e-6);
			expect(Math.abs(v)).toBeLessThanOrEqual(1);
		}
	});

	it('copes with slices taller than the element', () => {
		const o = sliceOffsets(3, 10, 2, 500);
		expect(o).toHaveLength(10);
	});
});

describe('sliceMap', () => {
	it('stores the offset around 128 in red, neutral green and blue', () => {
		const m = sliceMap(Float32Array.from([0, 1, -1, 0.5]));
		expect([...m]).toEqual([128, 128, 128, 255, 128, 128, 1, 128, 128, 192, 128, 128]);
	});
});

describe('sliceMapUrl', () => {
	it('is a PNG data URL', () => {
		const url = sliceMapUrl(1, 120, glitchDefaults);
		expect(url.startsWith('data:image/png;base64,iVBORw0KGgo')).toBe(true);
		expect(sliceMapUrl(1, 120, glitchDefaults)).toBe(url);
	});
});

describe('sliceScales', () => {
	it('turns the largest shift into a feDisplacementMap scale', () => {
		const s = sliceScales(40, 0);
		// a full-strength row (255) moves by scale × 127/255 = shift
		expect((s.g * 127) / 255).toBeCloseTo(40, 1);
		expect(s.r).toBe(s.b);
	});

	it('spreads the channels with the fringe', () => {
		const s = sliceScales(40, 0.5);
		expect(s.r).toBeGreaterThan(s.g);
		expect(s.b).toBeLessThan(s.g);
	});
});

describe('glitchPadding', () => {
	it('covers the furthest red can move', () => {
		expect(glitchPadding(40, 0.5, 2, 5)).toBe(69);
		expect(glitchPadding(0, 0, 0, 0)).toBe(2);
	});
});

describe('stillFrameKey', () => {
	it('is a stable, non-zero key per seed', () => {
		expect(stillFrameKey(3)).toBe(stillFrameKey(3));
		expect(stillFrameKey(3)).toBeGreaterThan(0);
		expect(stillFrameKey(3)).not.toBe(stillFrameKey(4));
	});
});
