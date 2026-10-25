import { describe, expect, it } from 'vitest';
import {
	REC709,
	contrastPivot,
	hexToRgb,
	luminanceMatrix,
	srgbToLinear,
	stopsOf,
	tableValues
} from './duotone';

describe('hexToRgb', () => {
	it('converts #rrggbb to 0–1 channels', () => {
		expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
	});
});

describe('srgbToLinear', () => {
	it('keeps the end points and darkens the middle', () => {
		expect(srgbToLinear(0)).toBe(0);
		expect(srgbToLinear(1)).toBeCloseTo(1);
		expect(srgbToLinear(0.5)).toBeCloseTo(0.214, 3);
	});
});

describe('luminanceMatrix', () => {
	it('uses Rec. 709 weights and keeps alpha at contrast 1', () => {
		const m = luminanceMatrix(1);
		expect(m).toHaveLength(20);
		for (const row of [0, 1, 2]) {
			expect(m.slice(row * 5, row * 5 + 5)).toEqual([...REC709, 0, 0]);
		}
		expect(m.slice(15)).toEqual([0, 0, 0, 1, 0]);
		expect(REC709.reduce((a: number, b) => a + b, 0)).toBeCloseTo(1);
	});

	it('pivots contrast around mid-grey', () => {
		const m = luminanceMatrix(2);
		const grey = m[0] * 0.5 + m[1] * 0.5 + m[2] * 0.5 + m[4];
		expect(grey).toBeCloseTo(0.5);
		expect(m[4]).toBe(-0.5);
	});

	it('keeps perceptual mid-grey in place in linearRGB too', () => {
		const pivot = contrastPivot('linearRGB');
		expect(pivot).toBeCloseTo(srgbToLinear(0.5));
		expect(contrastPivot('sRGB')).toBe(0.5);
		const m = luminanceMatrix(2, pivot);
		// linear luminance of #808080-ish grey in, same value out
		expect(m[0] * pivot + m[1] * pivot + m[2] * pivot + m[4]).toBeCloseTo(pivot, 3);
	});
});

describe('tableValues', () => {
	it('lists the stops per channel in order', () => {
		expect(tableValues(['#000000', '#ff0000', '#ffffff'])).toEqual(['0 1 1', '0 0 1', '0 0 1']);
	});

	it('works with two stops (duotone)', () => {
		expect(tableValues(['#000000', '#ffffff'])).toEqual(['0 1', '0 1', '0 1']);
	});

	it('linearizes the stops for linearRGB filters', () => {
		const [r] = tableValues(['#000000', '#808080'], 'linearRGB');
		expect(r).toBe(`0 ${+srgbToLinear(128 / 255).toFixed(4)}`);
	});
});

describe('stopsOf', () => {
	const colors = { shadow: '#000000', midtone: '#ff0000', highlight: '#ffffff' };

	it('skips the midtone unless enabled', () => {
		expect(stopsOf({ ...colors, useMidtone: false })).toEqual(['#000000', '#ffffff']);
		expect(stopsOf({ ...colors, useMidtone: true })).toEqual(['#000000', '#ff0000', '#ffffff']);
	});
});
