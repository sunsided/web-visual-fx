import { describe, expect, it } from 'vitest';
import {
	diffuse,
	lerpPoint,
	lightVector,
	percentToPx,
	pxToPercent,
	specular,
	stepPercent,
	surfaceNormal,
	toDistant
} from './lighting';

const size = { width: 800, height: 400 };

describe('percentToPx and pxToPercent', () => {
	it('convert between % of the element and user-space px', () => {
		expect(percentToPx({ x: 25, y: 50 }, size)).toEqual({ x: 200, y: 200 });
		expect(pxToPercent({ x: 200, y: 200 }, size)).toEqual({ x: 25, y: 50 });
	});

	it('clamps to the element and survives a zero size', () => {
		expect(pxToPercent({ x: -40, y: 900 }, size)).toEqual({ x: 0, y: 100 });
		expect(pxToPercent({ x: 10, y: 10 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
	});
});

describe('stepPercent', () => {
	it('moves within 0…100', () => {
		expect(stepPercent({ x: 50, y: 50 }, { x: 5, y: -5 })).toEqual({ x: 55, y: 45 });
		expect(stepPercent({ x: 98, y: 2 }, { x: 5, y: -5 })).toEqual({ x: 100, y: 0 });
	});
});

describe('toDistant', () => {
	it('points the azimuth at the light, clockwise from +x (y down)', () => {
		expect(toDistant({ x: 800, y: 200 }, 100, size).azimuth).toBe(0);
		expect(toDistant({ x: 400, y: 400 }, 100, size).azimuth).toBe(90);
		expect(toDistant({ x: 0, y: 200 }, 100, size).azimuth).toBe(180);
		expect(toDistant({ x: 400, y: 0 }, 100, size).azimuth).toBe(270);
	});

	it('derives the elevation from height and distance', () => {
		expect(toDistant({ x: 400, y: 200 }, 100, size).elevation).toBe(90);
		expect(toDistant({ x: 500, y: 200 }, 100, size).elevation).toBe(45);
	});
});

describe('surfaceNormal', () => {
	it('points straight up on flat ground', () => {
		expect(surfaceNormal(0, 0, 5)).toEqual([0, 0, 1]);
	});

	it('tilts away from the uphill direction, more with a larger surface scale', () => {
		const gentle = surfaceNormal(0.1, 0, 1);
		const steep = surfaceNormal(0.1, 0, 10);
		expect(gentle[0]).toBeLessThan(0);
		expect(steep[0]).toBeLessThan(gentle[0]);
		expect(Math.hypot(...steep)).toBeCloseTo(1);
	});
});

describe('diffuse and specular', () => {
	const up = surfaceNormal(0, 0, 1);

	it('is brightest with the light straight overhead and scales with kd', () => {
		const overhead = lightVector([0, 0, 0], [0, 0, 100]);
		const raking = lightVector([0, 0, 0], [100, 0, 20]);
		expect(diffuse(up, overhead, 1)).toBeCloseTo(1);
		expect(diffuse(up, overhead, 2)).toBeCloseTo(2);
		expect(diffuse(up, raking, 1)).toBeLessThan(0.3);
	});

	it('is zero for faces turned away from the light', () => {
		const facingLeft = surfaceNormal(10, 0, 1);
		expect(diffuse(facingLeft, lightVector([0, 0, 0], [100, 0, 1]), 1)).toBe(0);
	});

	it('gives a tighter highlight with a higher exponent', () => {
		const slightlyOff = lightVector([0, 0, 0], [40, 0, 100]);
		expect(specular(up, lightVector([0, 0, 0], [0, 0, 100]), 1, 20)).toBeCloseTo(1);
		expect(specular(up, slightlyOff, 1, 64)).toBeLessThan(specular(up, slightlyOff, 1, 8));
	});
});

describe('lerpPoint', () => {
	it('interpolates linearly', () => {
		expect(lerpPoint({ x: 0, y: 10 }, { x: 100, y: 20 }, 0.5)).toEqual({ x: 50, y: 15 });
	});
});
