import { describe, expect, it } from 'vitest';
import { thresholdAlpha } from '../gooey/gooey';
import {
	ROUNDING_SHARPNESS,
	outerRadius,
	outlineDefaults,
	outlinePadding,
	roundingBlur,
	roundingMatrix
} from './outline';

describe('roundingBlur', () => {
	it('is up to half the dilate radius, 0 when roundness is off', () => {
		expect(roundingBlur(8, 1)).toBe(4);
		expect(roundingBlur(8, 0.5)).toBe(2);
		expect(roundingBlur(8, 0)).toBe(0);
		expect(roundingBlur(-1, 1)).toBe(0);
	});
});

describe('roundingMatrix', () => {
	it('thresholds alpha at 50 %', () => {
		const m = roundingMatrix().split(/\s+/).map(Number);
		expect(m).toHaveLength(20);
		const [k, , , , offset] = [m[18], 0, 0, 0, -m[19]];
		expect(k).toBe(ROUNDING_SHARPNESS);
		expect(thresholdAlpha(0.5, k, offset)).toBeCloseTo(0.5);
		expect(thresholdAlpha(0.4, k, offset)).toBe(0);
		expect(thresholdAlpha(0.6, k, offset)).toBe(1);
	});
});

describe('outerRadius', () => {
	it('adds the ring only when it is on', () => {
		expect(outerRadius({ width: 6, ring: true, ringWidth: 2.5 })).toBe(8.5);
		expect(outerRadius({ width: 6, ring: false, ringWidth: 2.5 })).toBe(6);
	});
});

describe('outlinePadding', () => {
	const base = {
		width: 6,
		ring: false,
		ringWidth: 2,
		shadow: false,
		shadowX: 0,
		shadowY: 0,
		shadowBlur: 0
	};

	it('covers the outline plus a little antialiasing room', () => {
		expect(outlinePadding(base)).toBe(8);
		expect(outlinePadding({ ...base, ring: true })).toBe(10);
	});

	it('adds the shadow offset and about 3σ of blur', () => {
		expect(outlinePadding({ ...base, shadow: true, shadowX: -4, shadowY: 6, shadowBlur: 2 })).toBe(
			6 + 6 + 6 + 2
		);
	});

	it('grows with every default', () => {
		expect(outlinePadding(outlineDefaults)).toBeGreaterThan(outerRadius(outlineDefaults));
	});
});
