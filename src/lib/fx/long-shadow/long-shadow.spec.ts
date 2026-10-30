import { describe, expect, it } from 'vitest';
import {
	MAX_STEPS,
	longShadowDefaults as d,
	longShadowLayers,
	offsetAt,
	stepColor,
	stepPixels
} from './long-shadow';

describe('offsetAt', () => {
	it('uses screen coordinates: 0° right, 90° down', () => {
		expect(offsetAt(0, 1)).toEqual([1, 0]);
		expect(offsetAt(90, 1)).toEqual([0, 1]);
		expect(offsetAt(180, 2)).toEqual([-2, 0]);
		expect(offsetAt(45, Math.SQRT2)).toEqual([1, 1]);
	});

	it('never writes negative zero', () => {
		const [x] = offsetAt(270, 1);
		expect(Object.is(x, -0)).toBe(false);
	});
});

describe('stepColor', () => {
	const colors = { from: '#ff0000', to: '#0000ff', space: 'oklab' as const, fade: false };

	it('starts and ends at the plain colors', () => {
		expect(stepColor(1, 5, colors)).toBe('#ff0000');
		expect(stepColor(5, 5, colors)).toBe('#0000ff');
	});

	it('mixes the steps in between in the chosen space', () => {
		expect(stepColor(3, 5, colors)).toBe('color-mix(in oklab, #ff0000, #0000ff 50%)');
		expect(stepColor(2, 3, { ...colors, space: 'srgb' })).toBe(
			'color-mix(in srgb, #ff0000, #0000ff 50%)'
		);
	});

	it('fades towards transparent without a fully invisible last step', () => {
		expect(stepColor(1, 4, { ...colors, fade: true })).toBe('#ff0000');
		expect(stepColor(4, 4, { ...colors, fade: true })).toBe(
			'color-mix(in oklab, #0000ff, transparent 75%)'
		);
	});

	it('uses the start color for a single step', () => {
		expect(stepColor(1, 1, colors)).toBe('#ff0000');
	});
});

describe('longShadowLayers', () => {
	it('spaces the steps evenly up to the length', () => {
		const layers = longShadowLayers({ ...d, angle: 0, length: 0.4, steps: 4, fade: false });
		expect(layers).toHaveLength(4);
		expect(layers.map((l) => l.split(' ')[0])).toEqual(['0.1em', '0.2em', '0.3em', '0.4em']);
		expect(layers[0]).toBe(`0.1em 0em 0 ${d.from}`);
		expect(layers[3]).toBe(`0.4em 0em 0 ${d.to}`);
	});

	it('caps the step count', () => {
		expect(longShadowLayers({ ...d, steps: 500 })).toHaveLength(MAX_STEPS);
	});

	it('adds a blurred ambient shadow last, beyond the extrusion', () => {
		const layers = longShadowLayers({ ...d, angle: 90, length: 1, steps: 2, ambient: true });
		expect(layers).toHaveLength(3);
		expect(layers[2]).toMatch(/^0em 1\.15em 0\.8em /);
	});
});

describe('stepPixels', () => {
	it('is the distance between two copies in pixels', () => {
		expect(stepPixels({ length: 0.5, steps: 40 }, 96)).toBe(1.2);
	});
});
