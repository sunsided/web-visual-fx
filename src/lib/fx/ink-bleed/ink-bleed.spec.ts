import { describe, expect, it } from 'vitest';
import {
	grainAt,
	grainMatrix,
	inkBleedDefaults,
	inkBleedPresetNames,
	inkBleedPresets,
	inkBleedSchema,
	NOISE_HIGH,
	NOISE_LOW,
	presetValues,
	regionPadding,
	rimAt,
	rimMatrix,
	step,
	stepAt,
	stepMatrix,
	washAlpha
} from './ink-bleed';

describe('step', () => {
	it('is 0.5 at the threshold and ramps over the softness', () => {
		expect(stepAt(0.5, 0.5, 0.2)).toBeCloseTo(0.5);
		expect(stepAt(0.4, 0.5, 0.2)).toBeCloseTo(0);
		expect(stepAt(0.6, 0.5, 0.2)).toBeCloseTo(1);
		expect(stepAt(0.45, 0.5, 0.2)).toBeCloseTo(0.25);
	});

	it('keeps fully transparent pixels transparent', () => {
		for (const threshold of [0.05, 0.3, 0.5, 0.95]) {
			for (const softness of [0.02, 0.5, 1]) {
				expect(step(threshold, softness).intercept).toBeLessThanOrEqual(0);
				expect(stepAt(0, threshold, softness)).toBe(0);
			}
		}
	});

	it('caps the softness at twice the threshold', () => {
		expect(step(0.3, 1)).toEqual(step(0.3, 0.6));
	});

	it('writes the step into the alpha row only', () => {
		expect(stepMatrix(0.5, 0.25)).toBe('1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -1.5');
	});
});

describe('rim', () => {
	it('is 0 deep inside and 1 at (and beyond) the edge', () => {
		expect(rimAt(1)).toBe(0);
		expect(rimAt(0.75)).toBeCloseTo(0.5);
		expect(rimAt(0.5)).toBe(1);
		expect(rimAt(0)).toBe(1);
		expect(rimMatrix().split(/\s+/).slice(15)).toEqual(['0', '0', '0', '-2', '2']);
	});

	it('leaves at least half the wash in the middle', () => {
		expect(washAlpha(0)).toBe(1);
		expect(washAlpha(1)).toBe(0.5);
		expect(washAlpha(5)).toBe(0.5);
	});
});

describe('grain', () => {
	it('is opaque everywhere without granulation', () => {
		for (const n of [0, NOISE_LOW, 0.5, NOISE_HIGH, 1]) expect(grainAt(n, 0)).toBe(1);
	});

	it('spans transparent to opaque over the noise range at full granulation', () => {
		expect(grainAt(NOISE_LOW, 1)).toBeCloseTo(0);
		expect(grainAt(NOISE_HIGH, 1)).toBeCloseTo(1);
		expect(grainAt(0.5, 0.5)).toBeCloseTo(0.75);
	});

	it('matches its matrix', () => {
		const row = grainMatrix(0.6).split(/\s+/).slice(15).map(Number);
		for (const n of [0.3, 0.5, 0.7]) {
			expect(Math.min(1, Math.max(0, row[3] * n + row[4]))).toBeCloseTo(grainAt(n, 0.6), 3);
		}
	});
});

describe('regionPadding', () => {
	it('covers half the displacement plus three blur radii', () => {
		expect(regionPadding(0, 0)).toBe(2);
		expect(regionPadding(20, 2)).toBe(18);
	});
});

describe('presets', () => {
	it('only set known keys within their ranges', () => {
		for (const name of inkBleedPresetNames) {
			for (const [key, value] of Object.entries(inkBleedPresets[name])) {
				const param = inkBleedSchema[key as keyof typeof inkBleedSchema];
				expect(param, key).toBeDefined();
				if (param.kind === 'range') {
					expect(value).toBeGreaterThanOrEqual(param.min);
					expect(value).toBeLessThanOrEqual(param.max);
				}
			}
		}
	});

	it('fills in the defaults', () => {
		expect(presetValues('ink')).toEqual(inkBleedDefaults);
		expect(presetValues('watercolor').pool).toBeGreaterThan(0);
		expect(presetValues('watercolor').paper).toBe(inkBleedDefaults.paper);
	});
});
