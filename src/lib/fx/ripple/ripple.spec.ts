import { describe, expect, it } from 'vitest';
import {
	MIX_K,
	clockStep,
	flowOffset,
	frameDue,
	regionExtent,
	regionPadding,
	rippleDefaults,
	rippleOffsets,
	ripplePresets,
	rippleSchema,
	stitchFrequency,
	tileFrequency,
	wrap
} from './ripple';

describe('wrap', () => {
	it('returns a positive remainder', () => {
		expect(wrap(5, 4)).toBe(1);
		expect(wrap(-1, 4)).toBe(3);
		expect(wrap(-4, 4)).toBe(0);
		expect(Object.is(wrap(-0, 4), 0)).toBe(true);
	});

	it('is 0 for an empty period', () => {
		expect(wrap(3, 0)).toBe(0);
	});
});

describe('stitchFrequency', () => {
	it('snaps to a whole number of periods per tile', () => {
		const f = stitchFrequency(0.012, 256);
		expect(f * 256).toBeCloseTo(Math.round(f * 256));
		expect(f).toBeCloseTo(3 / 256, 6);
	});

	it('picks the side with the smaller ratio, as the spec says', () => {
		// 2.4 periods: 2 is 1.2× off, 3 is 1.25× off → down
		expect(stitchFrequency(2.4 / 100, 100)).toBeCloseTo(0.02);
		// 2.5 periods: 2 is 1.25× off, 3 is 1.2× off → up
		expect(stitchFrequency(2.5 / 100, 100)).toBeCloseTo(0.03);
	});

	it('never drops to zero periods', () => {
		expect(stitchFrequency(0.001, 256)).toBeCloseTo(1 / 256);
	});

	it('keeps already-snapped values', () => {
		expect(stitchFrequency(4 / 256, 256)).toBeCloseTo(4 / 256, 6);
	});
});

describe('tileFrequency', () => {
	it('snaps both axes and applies the stretch to y', () => {
		const [fx, fy] = tileFrequency(0.008, 5, 256).split(' ').map(Number);
		expect(fx).toBeCloseTo(2 / 256, 6);
		expect(fy).toBeCloseTo(10 / 256, 6);
	});
});

describe('flowOffset', () => {
	it('moves towards the angle at the given speed', () => {
		expect(flowOffset(1, 10, 0, 256)).toEqual({ dx: 10, dy: 0 });
		expect(flowOffset(2, 10, 90, 256)).toEqual({ dx: 0, dy: 20 });
	});

	it('wraps into [0, tile)', () => {
		const up = flowOffset(1, 10, 270, 256);
		expect(up.dy).toBeCloseTo(246);
		const far = flowOffset(100, 30, 45, 128);
		for (const v of [far.dx, far.dy]) {
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(128);
		}
	});

	it('is still at t = 0', () => {
		expect(flowOffset(0, 40, 123, 256)).toEqual({ dx: 0, dy: 0 });
	});
});

describe('rippleOffsets', () => {
	it('has one layer without cross waves and two with', () => {
		const opts = { speed: 20, direction: 0, tileSize: 256 };
		expect(rippleOffsets(1, { ...opts, crossWaves: false })).toHaveLength(1);
		const [a, b] = rippleOffsets(1, { ...opts, crossWaves: true });
		expect(a).toEqual({ dx: 20, dy: 0 });
		expect(b).not.toEqual(a);
	});
});

describe('MIX_K', () => {
	it('keeps grey at grey and restores the spread of one noise', () => {
		const mix = (a: number, b: number) => MIX_K.k2 * a + MIX_K.k3 * b + MIX_K.k4;
		expect(mix(0.5, 0.5)).toBeCloseTo(0.5, 3);
		// variance of (a + b) / √2 equals the variance of a
		expect(MIX_K.k2 ** 2 + MIX_K.k3 ** 2).toBeCloseTo(1, 3);
	});
});

describe('region', () => {
	it('reaches two tiles even on small elements', () => {
		expect(regionExtent(100, 256, 4)).toBe(512 + 8);
		expect(regionExtent(1000, 256, 4)).toBe(1008);
	});

	it('pads by half the displacement', () => {
		expect(regionPadding(14)).toBe(9);
		expect(regionPadding(0)).toBe(2);
	});
});

describe('frame cap', () => {
	it('renders at most fps frames per second, with a little tolerance', () => {
		expect(frameDue(0, 16.7, 30)).toBe(false);
		expect(frameDue(0, 33.2, 30)).toBe(true);
		expect(frameDue(0, 16.7, 60)).toBe(true);
	});

	it('caps the clock step after long gaps', () => {
		expect(clockStep(33)).toBeCloseTo(0.033);
		expect(clockStep(5000)).toBe(0.1);
		expect(clockStep(-5)).toBe(0);
	});
});

describe('presets', () => {
	it('only use schema keys with values inside the ranges', () => {
		for (const preset of Object.values(ripplePresets)) {
			for (const [key, value] of Object.entries(preset)) {
				const param = rippleSchema[key as keyof typeof rippleSchema];
				expect(param, key).toBeDefined();
				if (param.kind === 'range') {
					expect(value as number).toBeGreaterThanOrEqual(param.min);
					expect(value as number).toBeLessThanOrEqual(param.max);
				}
			}
		}
	});

	it('water matches the defaults', () => {
		for (const [key, value] of Object.entries(ripplePresets.water)) {
			expect(rippleDefaults[key as keyof typeof rippleDefaults], key).toBe(value);
		}
	});
});
