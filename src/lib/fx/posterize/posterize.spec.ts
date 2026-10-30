import { describe, expect, it } from 'vitest';
import { srgbToLinear } from '../duotone/duotone';
import {
	EDGE_TO_ALPHA,
	bands,
	linearToSrgb,
	posterizeDefaults,
	posterizeSchema,
	posterizeTable,
	quantize
} from './posterize';

describe('posterizeTable', () => {
	it('reuses the halftone discrete table: n even steps from 0 to 1', () => {
		expect(posterizeTable(2)).toBe('0 1');
		expect(posterizeTable(4)).toBe('0 0.3333 0.6667 1');
	});
});

describe('quantize', () => {
	it('splits 0–1 into n equal bins and keeps black and white', () => {
		expect(quantize(0, 4)).toBe(0);
		expect(quantize(0.24, 4)).toBe(0);
		expect(quantize(0.26, 4)).toBeCloseTo(1 / 3);
		expect(quantize(0.74, 4)).toBeCloseTo(2 / 3);
		expect(quantize(1, 4)).toBe(1);
	});

	it('clamps and rounds its inputs', () => {
		expect(quantize(-1, 3)).toBe(0);
		expect(quantize(2, 3)).toBe(1);
		expect(quantize(0.5, 1)).toBe(1); // at least two levels
	});
});

describe('linearToSrgb', () => {
	it('inverts srgbToLinear', () => {
		for (const v of [0, 0.02, 0.2, 0.5, 0.9, 1]) {
			expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 6);
		}
	});
});

describe('bands', () => {
	it('are equally wide in sRGB and cover the whole ramp', () => {
		const b = bands(4);
		expect(b).toHaveLength(4);
		expect(b[0]).toEqual({ from: 0, to: 0.25, value: 0 });
		expect(b[3]).toEqual({ from: 0.75, to: 1, value: 1 });
		for (let i = 1; i < b.length; i++) expect(b[i].from).toBe(b[i - 1].to);
	});

	it('give the shadows most of the ramp in linearRGB', () => {
		const b = bands(4, 'linearRGB');
		expect(b[0].from).toBe(0);
		expect(b[3].to).toBe(1);
		// Everything up to linear 0.25, i.e. sRGB ≈ 0.54, lands in the darkest band.
		expect(b[0].to).toBeCloseTo(0.537, 2);
		expect(b[0].to - b[0].from).toBeGreaterThan(b[3].to - b[3].from);
	});
});

describe('EDGE_TO_ALPHA', () => {
	it('is a 4×5 matrix that moves red into alpha and clears the colors', () => {
		const m = EDGE_TO_ALPHA.trim().split(/\s+/).map(Number);
		expect(m).toHaveLength(20);
		expect(m.slice(0, 15).every((v) => v === 0)).toBe(true);
		expect(m.slice(15)).toEqual([1, 0, 0, 0, 0]);
	});
});

describe('posterizeSchema', () => {
	it('has defaults inside their ranges', () => {
		for (const [key, p] of Object.entries(posterizeSchema)) {
			if (p.kind !== 'range') continue;
			const v = posterizeDefaults[key as keyof typeof posterizeDefaults] as number;
			expect(v).toBeGreaterThanOrEqual(p.min);
			expect(v).toBeLessThanOrEqual(p.max);
		}
	});
});
