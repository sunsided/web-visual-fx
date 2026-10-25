import { describe, expect, it } from 'vitest';
import {
	displacementMap,
	displacementScale,
	fringeScales,
	profileAt,
	profiles,
	refractionOffset,
	roundedRectSdf
} from './liquid-glass';

describe('roundedRectSdf', () => {
	it('is negative inside, zero on the edge and positive outside', () => {
		expect(roundedRectSdf(50, 25, 100, 50, 10).distance).toBe(-25);
		expect(roundedRectSdf(0, 25, 100, 50, 10).distance).toBe(0);
		expect(roundedRectSdf(-5, 25, 100, 50, 10).distance).toBe(5);
	});

	it('points the normal at the nearest side', () => {
		expect(roundedRectSdf(2, 25, 100, 50, 10)).toMatchObject({ nx: -1, ny: 0 });
		expect(roundedRectSdf(98, 25, 100, 50, 10)).toMatchObject({ nx: 1, ny: 0 });
		expect(roundedRectSdf(50, 1, 100, 50, 10)).toMatchObject({ nx: 0, ny: -1 });
		expect(roundedRectSdf(50, 49, 100, 50, 10)).toMatchObject({ nx: 0, ny: 1 });
	});

	it('follows the corner arc diagonally', () => {
		// Corner arc center at (10, 10), radius 10: the bounding box corner lies outside.
		const s = roundedRectSdf(0, 0, 100, 50, 10);
		expect(s.distance).toBeCloseTo(Math.SQRT2 * 10 - 10);
		expect(s.nx).toBeCloseTo(-Math.SQRT1_2);
		expect(s.ny).toBeCloseTo(-Math.SQRT1_2);
	});

	it('clamps the radius to half the shorter side', () => {
		// A 100 × 50 box with radius 999 is a pill with radius 25.
		expect(roundedRectSdf(25, 25, 100, 50, 999).distance).toBe(-25);
		expect(roundedRectSdf(0, 0, 100, 50, 999).distance).toBeCloseTo(Math.SQRT2 * 25 - 25);
	});
});

describe('profileAt', () => {
	it.each(profiles)('%s rises from 0 at the edge to 1 at the flat top', (p) => {
		expect(profileAt(p, 0).height).toBeCloseTo(0);
		expect(profileAt(p, 1).height).toBeCloseTo(1);
		expect(profileAt(p, 0.5).height).toBeGreaterThan(0);
		expect(profileAt(p, 0.5).height).toBeLessThan(1);
	});

	it('is vertical at the edge for curved profiles and flat where they meet the top', () => {
		expect(profileAt('circle', 0).slope).toBe(Infinity);
		expect(profileAt('squircle', 0).slope).toBe(Infinity);
		expect(profileAt('circle', 1).slope).toBe(0);
		expect(profileAt('squircle', 1).slope).toBe(0);
		expect(profileAt('linear', 0.3).slope).toBe(1);
	});
});

describe('refractionOffset', () => {
	it('is zero for a flat surface and grows with the slope', () => {
		expect(refractionOffset(0)).toBe(0);
		expect(refractionOffset(0.5)).toBeGreaterThan(0);
		expect(refractionOffset(2)).toBeGreaterThan(refractionOffset(0.5));
	});

	it('stays finite for a vertical wall', () => {
		// 90° incidence, refracted at asin(1/1.5) ≈ 41.8°, bent by ≈ 48.2°.
		expect(refractionOffset(Infinity)).toBeCloseTo(Math.tan(Math.PI / 2 - Math.asin(1 / 1.5)));
	});
});

describe('displacementMap', () => {
	const w = 40;
	const h = 20;
	const map = displacementMap({ width: w, height: h, radius: 6, bezel: 8, profile: 'circle' });
	const at = (x: number, y: number) => Array.from(map.slice((y * w + x) * 4, (y * w + x) * 4 + 4));

	it('has one RGBA pixel per px', () => {
		expect(map.length).toBe(w * h * 4);
	});

	it('leaves the flat center undistorted and at full height', () => {
		expect(at(20, 10)).toEqual([128, 128, 255, 255]);
	});

	it('pushes samples inwards near the edges', () => {
		const [rl] = at(0, 10); // left edge: sample from further right
		const [rr] = at(w - 1, 10); // right edge: from further left
		const [, gt] = at(20, 0); // top edge: from further down
		expect(rl).toBeGreaterThan(180);
		expect(rr).toBeLessThan(76);
		expect(gt).toBeGreaterThan(180);
	});

	it('is neutral outside the rounded corners', () => {
		expect(at(0, 0)).toEqual([128, 128, 0, 255]);
	});

	it('copes with degenerate sizes', () => {
		expect(
			displacementMap({ width: 0, height: 0, radius: 0, bezel: 10, profile: 'linear' })
		).toHaveLength(4);
	});
});

describe('scales', () => {
	it('doubles the px refraction for feDisplacementMap', () => {
		expect(displacementScale(40)).toBe(80);
	});

	it('spreads the channels around green', () => {
		expect(fringeScales(50, 0.2)).toEqual({ r: 120, g: 100, b: 80 });
	});
});
