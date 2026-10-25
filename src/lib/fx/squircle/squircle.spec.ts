import { describe, expect, it } from 'vitest';
import {
	cornerPoints,
	cornerShapeCss,
	cornerShapeK,
	diagonalPosition,
	easingCss,
	fromDiagonalPosition,
	interpolateK,
	SPRING_TOLERANCE,
	springEasing,
	springOmega,
	superellipsePath
} from './squircle';

describe('cornerShapeK / cornerShapeCss', () => {
	it('maps keywords to their superellipse parameter', () => {
		expect(cornerShapeK('round', 5)).toBe(1);
		expect(cornerShapeK('squircle', 5)).toBe(2);
		expect(cornerShapeK('bevel', 5)).toBe(0);
		expect(cornerShapeK('scoop', 5)).toBe(-1);
		expect(cornerShapeK('square', 5)).toBe(Infinity);
		expect(cornerShapeK('notch', 5)).toBe(-Infinity);
		expect(cornerShapeK('superellipse', 2.5)).toBe(2.5);
	});

	it('writes keywords as is and superellipse() with a rounded parameter', () => {
		expect(cornerShapeCss('scoop', 3)).toBe('scoop');
		expect(cornerShapeCss('superellipse', 1 / 3)).toBe('superellipse(0.33)');
	});
});

describe('interpolateK', () => {
	// Midpoints as reported by getComputedStyle() in Chromium 155 during a corner-shape animation.
	it('matches Chromium', () => {
		expect(interpolateK(1, 2, 0.5)).toBeCloseTo(1.436, 3);
		expect(interpolateK(0, Infinity, 0.5)).toBeCloseTo(1.26869, 4);
		expect(interpolateK(-1, 1, 0.5)).toBeCloseTo(0, 6);
		expect(interpolateK(-Infinity, 1, 0.5)).toBeCloseTo(-0.667958, 4);
		expect(interpolateK(0.5, 3, 0.5)).toBeCloseTo(1.37, 2);
	});

	it('returns the end points at 0 and 1', () => {
		expect(interpolateK(-1, 2, 0)).toBeCloseTo(-1);
		expect(interpolateK(-1, 2, 1)).toBeCloseTo(2);
	});

	it('round-trips through the diagonal position', () => {
		for (const k of [-3, -0.5, 0, 0.7, 4]) {
			expect(fromDiagonalPosition(diagonalPosition(k))).toBeCloseTo(k);
		}
		expect(diagonalPosition(0)).toBe(0.5);
		expect(diagonalPosition(Infinity)).toBe(1);
		expect(diagonalPosition(-Infinity)).toBe(0);
	});
});

describe('cornerPoints', () => {
	const at45 = (r: number, k: number) => cornerPoints(r, k, 2)[1];

	it('runs from the left edge to the top edge', () => {
		const points = cornerPoints(10, 2, 8);
		expect(points).toHaveLength(9);
		expect(points[0]).toEqual([0, 10]);
		expect(points[8]).toEqual([10, 0]);
	});

	it('is a quarter circle for k = 1', () => {
		for (const [x, y] of cornerPoints(10, 1, 12)) {
			expect(Math.hypot(x - 10, y - 10)).toBeCloseTo(10);
		}
	});

	it('is a straight bevel for k = 0', () => {
		for (const [x, y] of cornerPoints(10, 0, 12)) expect(x + y).toBeCloseTo(10);
	});

	it('is a concave quarter circle around the corner for k = −1 (scoop)', () => {
		for (const [x, y] of cornerPoints(10, -1, 12)) expect(Math.hypot(x, y)).toBeCloseTo(10);
	});

	it('crosses the diagonal where diagonalPosition says', () => {
		for (const k of [-2, -1, 0, 1, 2, 4]) {
			const [x] = at45(10, k);
			// distance from the corner point along the diagonal, as a fraction of the way to (r, r)
			expect(1 - x / 10).toBeCloseTo(diagonalPosition(k));
		}
	});

	it('approaches the square corner and the notch at the extremes', () => {
		expect(at45(10, Infinity)[0]).toBeLessThan(0.01);
		expect(at45(10, -Infinity)[0]).toBeGreaterThan(9.99);
	});
});

describe('superellipsePath', () => {
	it('has the same commands for every shape, so paths interpolate', () => {
		const commands = (d: string) => d.replace(/[^MLZ]/g, '');
		const shapes = [-Infinity, -1, 0, 1, 2, 5, Infinity].map((k) =>
			superellipsePath(200, 100, 30, k)
		);
		for (const d of shapes) expect(commands(d)).toBe(commands(shapes[0]));
	});

	it('clamps the radius to half the shorter side', () => {
		expect(superellipsePath(200, 100, 500, 1)).toBe(superellipsePath(200, 100, 50, 1));
	});

	it('stays inside the box', () => {
		const numbers = superellipsePath(120, 80, 40, -1)
			.match(/-?[\d.]+/g)!
			.map(Number);
		for (let i = 0; i < numbers.length; i += 2) {
			expect(numbers[i]).toBeGreaterThanOrEqual(0);
			expect(numbers[i]).toBeLessThanOrEqual(120);
			expect(numbers[i + 1]).toBeGreaterThanOrEqual(0);
			expect(numbers[i + 1]).toBeLessThanOrEqual(80);
		}
	});

	it('is a plain rectangle with radius 0', () => {
		const d = superellipsePath(10, 10, 0, 2, 1);
		expect(d).toBe('M0 0L0 0L10 0L10 0L10 10L10 10L0 10L0 10Z');
	});
});

describe('springEasing', () => {
	const values = (easing: string) => easing.slice(7, -1).split(', ').map(Number);

	it('starts at 0 and ends at exactly 1', () => {
		const v = values(springEasing(0.4));
		expect(v[0]).toBe(0);
		expect(v.at(-1)).toBe(1);
	});

	it('overshoots with bounce and not without', () => {
		expect(Math.max(...values(springEasing(0.4)))).toBeGreaterThan(1.05);
		const critical = values(springEasing(0));
		expect(Math.max(...critical)).toBeLessThanOrEqual(1);
		for (let i = 1; i < critical.length; i++)
			expect(critical[i]).toBeGreaterThanOrEqual(critical[i - 1]);
	});

	it('has settled before the final snap to 1, with and without bounce', () => {
		for (const bounce of [0, 0.05, 0.3, 0.6]) {
			const v = values(springEasing(bounce));
			expect(Math.abs(v.at(-2)! - 1)).toBeLessThan(0.01);
		}
	});

	it('solves the stiffness per damping ratio', () => {
		// critically damped: (1 + ω)·e^(−ω) = 0.002
		expect(springOmega(1)).toBeCloseTo(8.46, 2);
		expect((1 + springOmega(1)) * Math.exp(-springOmega(1))).toBeCloseTo(SPRING_TOLERANCE, 6);
		// underdamped: e^(−ζω) / √(1 − ζ²) = 0.002
		const w = springOmega(0.6);
		expect(Math.exp(-0.6 * w) / 0.8).toBeCloseTo(SPRING_TOLERANCE, 6);
	});
});

describe('easingCss', () => {
	it('passes CSS keywords through and expands the named curves', () => {
		expect(easingCss('linear', 0)).toBe('linear');
		expect(easingCss('emphasized', 0)).toBe('cubic-bezier(0.2, 0, 0, 1)');
		expect(easingCss('spring', 0.2)).toMatch(/^linear\(0, /);
	});
});
