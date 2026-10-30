import { describe, expect, it } from 'vitest';
import {
	KEY_STEP,
	KEY_STEP_LARGE,
	keyMove,
	lensMap,
	lensMapUrl,
	lensScale,
	maxOffset,
	positionText,
	sampleFactor
} from './magnifier';

const profiles = ['loupe', 'fisheye'] as const;

describe('sampleFactor', () => {
	it('magnifies by zoom at the center and is neutral at the edge', () => {
		for (const p of profiles) {
			expect(sampleFactor(p, 0, 2, 0.2)).toBeCloseTo(0.5);
			expect(sampleFactor(p, 1, 2, 0.2)).toBeCloseTo(1);
			expect(sampleFactor(p, 1.5, 2, 0.2)).toBe(1);
		}
	});

	it('keeps the loupe flat inside the rim', () => {
		expect(sampleFactor('loupe', 0.7, 3, 0.25)).toBeCloseTo(1 / 3);
		expect(sampleFactor('loupe', 0.9, 3, 0.25)).toBeGreaterThan(1 / 3);
	});

	it('never folds the picture: t·f(t) rises monotonically', () => {
		for (const p of profiles) {
			for (const zoom of [1, 1.5, 2, 4]) {
				for (const rim of [0.05, 0.2, 0.6]) {
					let prev = -1;
					for (let i = 0; i <= 200; i++) {
						const t = i / 200;
						const s = t * sampleFactor(p, t, zoom, rim);
						expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
						prev = s;
					}
				}
			}
		}
	});

	it('is the identity at zoom 1', () => {
		expect(sampleFactor('fisheye', 0.3, 1, 0.2)).toBe(1);
		expect(maxOffset('loupe', 1, 0.2)).toBe(0);
	});
});

describe('lensMap', () => {
	it('is a 2·radius square, neutral at the center and outside the circle', () => {
		const { size, data } = lensMap({ radius: 20, zoom: 2, profile: 'loupe', rim: 0.2 });
		expect(size).toBe(40);
		expect(data).toHaveLength(40 * 40 * 3);
		expect([...data.subarray(0, 3)]).toEqual([128, 128, 128]); // corner
		const c = (20 * 40 + 20) * 3;
		expect(Math.abs(data[c] - 128)).toBeLessThanOrEqual(4);
	});

	it('points towards the center and reaches the full range', () => {
		const { size, data } = lensMap({ radius: 32, zoom: 3, profile: 'fisheye', rim: 0.2 });
		const at = (x: number, y: number) => data.subarray((y * size + x) * 3, (y * size + x) * 3 + 2);
		// right of center: sample from the left (red below 128); below center: green below 128
		expect(at(48, 32)[0]).toBeLessThan(128);
		expect(at(32, 48)[1]).toBeLessThan(128);
		expect(at(16, 32)[0]).toBeGreaterThan(128);
		const reds = [...data].filter((_, i) => i % 3 === 0);
		expect(Math.min(...reds)).toBeLessThanOrEqual(2);
		expect(Math.max(...reds)).toBeGreaterThanOrEqual(253);
	});

	it('is fully neutral at zoom 1', () => {
		const { data } = lensMap({ radius: 10, zoom: 1, profile: 'loupe', rim: 0.2 });
		expect(data.every((v) => v === 128)).toBe(true);
	});
});

describe('lensMapUrl', () => {
	it('is a PNG data URL', () => {
		expect(lensMapUrl({ radius: 16, zoom: 2, profile: 'loupe', rim: 0.2 })).toMatch(
			/^data:image\/png;base64,iVBORw0KGgo/
		);
	});
});

describe('lensScale', () => {
	it('turns the largest offset back into px', () => {
		const o = { radius: 100, zoom: 2, profile: 'loupe' as const, rim: 0.2 };
		const s = lensScale(o);
		expect((s * 127) / 255).toBeCloseTo(maxOffset('loupe', 2, 0.2) * 100, 1);
		expect(lensScale({ ...o, zoom: 1 })).toBe(0);
	});
});

describe('keyMove', () => {
	const p = { x: 0.5, y: 0.5 };
	it('moves by a small or large step and clamps', () => {
		expect(keyMove(p, 'ArrowRight')).toEqual({ x: 0.5 + KEY_STEP, y: 0.5 });
		expect(keyMove(p, 'ArrowUp', true)).toEqual({ x: 0.5, y: 0.5 - KEY_STEP_LARGE });
		expect(keyMove({ x: 0.99, y: 0 }, 'ArrowRight', true)).toEqual({ x: 1, y: 0 });
		expect(keyMove({ x: 0.1, y: 0.9 }, 'Home')).toEqual(p);
	});

	it('ignores other keys', () => {
		expect(keyMove(p, 'a')).toBeNull();
		expect(keyMove(p, 'Tab')).toBeNull();
	});
});

describe('positionText', () => {
	it('reads as percentages', () => {
		expect(positionText({ x: 0.256, y: 1 })).toBe('26% across, 100% down');
	});
});
