import { describe, expect, it } from 'vitest';
import {
	INK_DARK,
	INK_LIGHT,
	MAX_ARC_RADIUS,
	blurReach,
	clampOffset,
	contrast,
	inkFor,
	filterRegion,
	gooMatrix,
	makeBlobs,
	menuOffsets,
	random,
	thresholdAlpha,
	thresholdBand
} from './gooey';

describe('gooMatrix', () => {
	it('passes RGB through and puts k and -b into the alpha row', () => {
		expect(gooMatrix(20, 9).split(/\s+/).map(Number)).toEqual([
			1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 20, -9
		]);
	});
});

describe('thresholdAlpha', () => {
	it('clamps k·α − b to 0…1', () => {
		expect(thresholdAlpha(0, 20, 9)).toBe(0);
		expect(thresholdAlpha(0.4, 20, 9)).toBe(0);
		expect(thresholdAlpha(0.475, 20, 9)).toBeCloseTo(0.5);
		expect(thresholdAlpha(0.6, 20, 9)).toBe(1);
		expect(thresholdAlpha(1, 20, 9)).toBe(1);
	});

	it('agrees with thresholdBand at both ends of the edge', () => {
		const { from, to } = thresholdBand(20, 9);
		expect(from).toBeCloseTo(0.45);
		expect(to).toBeCloseTo(0.5);
		expect(thresholdAlpha(from, 20, 9)).toBeCloseTo(0);
		expect(thresholdAlpha(to, 20, 9)).toBeCloseTo(1);
	});

	it('narrows the edge as k grows', () => {
		const soft = thresholdBand(4, 1.5);
		const hard = thresholdBand(40, 18);
		expect(soft.to - soft.from).toBeCloseTo(0.25);
		expect(hard.to - hard.from).toBeCloseTo(0.025);
	});
});

describe('blurReach and filterRegion', () => {
	it('uses three standard deviations', () => {
		expect(blurReach(12)).toBe(36);
	});

	it('pads the region evenly on every side', () => {
		expect(filterRegion(20)).toEqual({ x: '-20%', y: '-20%', width: '140%', height: '140%' });
		expect(filterRegion(0)).toEqual({ x: '0%', y: '0%', width: '100%', height: '100%' });
	});
});

describe('random and makeBlobs', () => {
	it('is repeatable for a seed', () => {
		expect(random(5)()).toBe(random(5)());
		expect(makeBlobs(4, 3)).toEqual(makeBlobs(4, 3));
		expect(makeBlobs(4, 3)).not.toEqual(makeBlobs(4, 4));
	});

	it('keeps start points away from the edges and spreads colors from A to B', () => {
		const blobs = makeBlobs(10, 1);
		expect(blobs).toHaveLength(10);
		for (const b of blobs) {
			expect(b.x).toBeGreaterThanOrEqual(20);
			expect(b.x).toBeLessThanOrEqual(80);
			expect(b.delay).toBeLessThanOrEqual(0);
			expect(-b.delay).toBeLessThan(b.duration);
		}
		expect(blobs[0].mix).toBe(0);
		expect(blobs[9].mix).toBe(1);
		expect(makeBlobs(1, 1)[0].mix).toBe(0);
	});
});

describe('menuOffsets', () => {
	it('lines items up to the right or upwards', () => {
		expect(menuOffsets(3, 'right', 50)).toEqual([
			{ x: 50, y: 0 },
			{ x: 100, y: 0 },
			{ x: 150, y: 0 }
		]);
		expect(menuOffsets(2, 'up', 60)).toEqual([
			{ x: 0, y: -60 },
			{ x: 0, y: -120 }
		]);
	});

	it('spreads items over a quarter circle, `distance` apart', () => {
		const [first, second, , last] = menuOffsets(4, 'arc', 64);
		expect(first.x).toBe(0);
		expect(first.y).toBeLessThan(0);
		expect(last.y).toBe(0);
		expect(last.x).toBeGreaterThan(0);
		expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeCloseTo(64, 1);
	});

	it('caps the arc radius for long menus', () => {
		const offsets = menuOffsets(14, 'arc', 56);
		for (const o of offsets) {
			expect(Math.hypot(o.x, o.y)).toBeLessThanOrEqual(MAX_ARC_RADIUS * 56 + 0.01);
		}
	});

	it('puts a single arc item on the diagonal', () => {
		const [only] = menuOffsets(1, 'arc', 64);
		expect(only.x).toBeCloseTo(-only.y);
		expect(Math.hypot(only.x, only.y)).toBeCloseTo(64, 1);
	});
});

describe('clampOffset', () => {
	it('keeps values within ±limit', () => {
		expect(clampOffset(500, 200)).toBe(200);
		expect(clampOffset(-500, 200)).toBe(-200);
		expect(clampOffset(20, 200)).toBe(20);
		expect(clampOffset(20, -5)).toBe(0);
	});
});

describe('contrast and inkFor', () => {
	it('matches the WCAG reference points', () => {
		expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
		expect(contrast('#ffffff', '#ffffff')).toBe(1);
	});

	it('picks the ink with the higher contrast', () => {
		// Close call: the default violet is slightly better with white (≈4.5 vs ≈4.2).
		expect(contrast('#6f5cff', INK_LIGHT)).toBeGreaterThan(contrast('#6f5cff', INK_DARK));
		expect(inkFor('#6f5cff')).toBe(INK_LIGHT);
		expect(inkFor('#ffd23f')).toBe(INK_DARK);
		expect(inkFor('#140f24')).toBe(INK_LIGHT);
	});
});
