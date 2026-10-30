import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../spotlight/spotlight';
import {
	MIN_OUTLINE,
	PALETTES,
	gradientImage,
	gradientTextDefaults as d,
	minTextContrast,
	sampleGradient,
	stopsOf,
	strokeWidth
} from './gradient-text';

describe('stopsOf', () => {
	it('uses the three custom colors or a preset', () => {
		expect(stopsOf(d)).toEqual([d.color1, d.color2, d.color3]);
		expect(stopsOf({ ...d, palette: 'ocean' })).toEqual(PALETTES.ocean);
	});
});

describe('gradientImage', () => {
	it('writes a linear gradient at the angle', () => {
		expect(gradientImage('linear', ['red', 'blue'], '90deg')).toBe(
			'linear-gradient(90deg, red, blue)'
		);
	});

	it('closes a conic gradient with its first color', () => {
		expect(gradientImage('conic', ['red', 'blue'], 'var(--a)')).toBe(
			'conic-gradient(from var(--a), red, blue, red)'
		);
	});
});

describe('strokeWidth', () => {
	it('doubles the width when the fill covers the inner half', () => {
		expect(strokeWidth({ stroke: 0.02, strokeOutside: true, fill: 'gradient' })).toBe(0.04);
		expect(strokeWidth({ stroke: 0.02, strokeOutside: false, fill: 'gradient' })).toBe(0.02);
	});

	it('never lets an outline-only text vanish', () => {
		expect(strokeWidth({ stroke: 0, strokeOutside: true, fill: 'none' })).toBe(MIN_OUTLINE);
	});
});

describe('sampleGradient', () => {
	it('starts and ends at the outer stops', () => {
		const s = sampleGradient(['#000000', '#808080', '#ffffff'], 4);
		expect(s).toEqual(['#000000', '#404040', '#808080', '#c0c0c0', '#ffffff']);
	});
});

describe('minTextContrast', () => {
	const bg = '#0b0b12';

	it('finds the dip between two colors that is darker than both', () => {
		const opts = { ...d, color1: '#ff0000', color2: '#00ff00', color3: '#00ff00' };
		const atStops = Math.min(contrastRatio('#ff0000', bg), contrastRatio('#00ff00', bg));
		expect(minTextContrast(opts, bg)).toBeLessThan(atStops);
	});

	it('checks the solid color and the outline color', () => {
		expect(minTextContrast({ ...d, fill: 'solid' }, bg)).toBeCloseTo(contrastRatio(d.solid, bg));
		expect(minTextContrast({ ...d, fill: 'none' }, bg)).toBeCloseTo(
			contrastRatio(d.strokeColor, bg)
		);
	});

	it('keeps the default and preset gradients readable on a dark page', () => {
		for (const palette of ['custom', 'sunset', 'ocean', 'rainbow'] as const) {
			expect(minTextContrast({ ...d, palette }, bg)).toBeGreaterThanOrEqual(4.5);
		}
	});
});
