import { describe, expect, it } from 'vitest';
import {
	applySegment,
	panOffset,
	SEAM_OVERLAP_DEG,
	segmentCount,
	segmentTransform,
	sourceScale,
	wedgeAngle,
	wedgePoints,
	wedgePolygon,
	type Vec
} from './kaleidoscope';

const deg = (a: number) => (a * Math.PI) / 180;
/** Point at angle `a` (degrees clockwise from straight up) and radius r, x right, y up. */
const polar = (a: number, r = 1): Vec => [r * Math.sin(deg(a)), r * Math.cos(deg(a))];
/** Angle of a point in degrees clockwise from up, 0–360. */
const angleOf = ([x, y]: Vec) => ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;

describe('segmentCount', () => {
	it('keeps counts even and in range', () => {
		expect(segmentCount(8)).toBe(8);
		expect(segmentCount(7)).toBe(8);
		expect(segmentCount(2)).toBe(4);
		expect(segmentCount(40)).toBe(24);
	});
});

describe('wedgePoints', () => {
	it('has its apex in the center and its base on the top edge', () => {
		const [apex, left, right] = wedgePoints(8, 0);
		expect(apex).toEqual([50, 50]);
		expect(left[1]).toBe(0);
		expect(right[1]).toBe(0);
	});

	it('spans exactly one wedge angle without overlap', () => {
		for (const n of [4, 6, 8, 12, 24]) {
			const [, left, right] = wedgePoints(n, 0);
			const half = (Math.atan2(right[0] - 50, 50) * 180) / Math.PI;
			expect(2 * half).toBeCloseTo(wedgeAngle(n), 3);
			expect(left[0] - 50).toBeCloseTo(-(right[0] - 50), 4);
		}
	});

	it('widens each side by the seam overlap', () => {
		const [, , right] = wedgePoints(8);
		const half = (Math.atan2(right[0] - 50, 50) * 180) / Math.PI;
		expect(half).toBeCloseTo(22.5 + SEAM_OVERLAP_DEG, 3);
	});

	it('reaches the corners of the layer at four segments', () => {
		const [, left, right] = wedgePoints(4, 0);
		expect(left[0]).toBeCloseTo(0);
		expect(right[0]).toBeCloseTo(100);
	});

	it('covers the inscribed circle of the layer within its angle', () => {
		// the base is on the top edge, at distance 50 from the center: the circle's radius
		for (const n of [4, 8, 24]) {
			const [, , right] = wedgePoints(n, 0);
			const half = deg(wedgeAngle(n) / 2);
			const reach = Math.hypot(right[0] - 50, 50);
			expect(reach * Math.cos(half)).toBeCloseTo(50);
		}
	});
});

describe('wedgePolygon', () => {
	it('formats the points as a CSS polygon with the apex nudged past the center', () => {
		expect(wedgePolygon(4, 0)).toBe('polygon(50% calc(50% + 2px), 0% 0%, 100% 0%)');
		expect(wedgePolygon(4, 0, 0)).toBe('polygon(50% 50%, 0% 0%, 100% 0%)');
	});
});

describe('segmentTransform', () => {
	it('rotates copy i by i wedges and flips odd copies when mirrored', () => {
		expect(segmentTransform(0, 8, true)).toEqual({ rotate: 0, flip: 1 });
		expect(segmentTransform(3, 8, true)).toEqual({ rotate: 135, flip: -1 });
		expect(segmentTransform(3, 8, false)).toEqual({ rotate: 135, flip: 1 });
	});

	it('places every wedge so that together they tile the full circle', () => {
		const n = 8;
		const theta = wedgeAngle(n);
		const centers = Array.from({ length: n }, (_, i) =>
			angleOf(applySegment(polar(0), segmentTransform(i, n, true)))
		);
		expect(centers.map((c) => Math.round(c))).toEqual(
			Array.from({ length: n }, (_, i) => i * theta)
		);
	});

	it('mirrors across the shared edge: neighbors agree on every edge point', () => {
		for (const n of [4, 6, 8, 12, 24]) {
			const theta = wedgeAngle(n);
			for (let i = 0; i < n; i++) {
				const a = segmentTransform(i, n, true);
				const b = segmentTransform((i + 1) % n, n, true);
				// a source point on the wedge edge, as seen from either side
				for (const r of [0.2, 0.7, 1]) {
					const pa = applySegment(polar(a.flip === 1 ? theta / 2 : -theta / 2, r), a);
					const pb = applySegment(polar(b.flip === 1 ? -theta / 2 : theta / 2, r), b);
					expect(pa[0]).toBeCloseTo(pb[0], 6);
					expect(pa[1]).toBeCloseTo(pb[1], 6);
				}
			}
		}
	});

	it('shows a reflection, not a copy, in the mirrored neighbor', () => {
		const n = 8;
		const theta = wedgeAngle(n);
		// a feature just inside wedge 0, near its right edge
		const p = polar(theta / 2 - 5);
		const inOne = applySegment(p, segmentTransform(1, n, true));
		// reflected across the edge at θ/2: θ/2 + 5°
		expect(angleOf(inOne)).toBeCloseTo(theta / 2 + 5, 6);
	});
});

describe('sourceScale and panOffset', () => {
	it('needs no extra size without panning', () => {
		expect(sourceScale(0)).toBe(1);
		expect(sourceScale(1)).toBe(2);
		expect(sourceScale(5)).toBe(2);
	});

	it('is zero in the center and a quarter of the source at full reach', () => {
		expect(panOffset(0.5, 0.5, 1)).toEqual({ x: 0, y: 0 });
		expect(panOffset(1, 0.5, 1)).toEqual({ x: 25, y: 0 });
		expect(panOffset(0.5, -3, 4)).toEqual({ x: 0, y: -25 });
		expect(panOffset(1, 1, 0)).toEqual({ x: 0, y: 0 });
	});

	it('keeps the visible disc inside the spinning source at any pointer position', () => {
		// layer side 1: the visible disc has radius 0.5 around the center
		for (const reach of [0, 0.25, 0.5, 1]) {
			const side = sourceScale(reach);
			for (const [x, y] of [
				[0, 0],
				[1, 1],
				[1, 0.5],
				[0.2, 0.9]
			]) {
				const o = panOffset(x, y, reach);
				const offset = (Math.hypot(o.x, o.y) / 100) * side;
				// the source's inscribed circle (radius side / 2) must contain the disc
				expect(0.5 + offset).toBeLessThanOrEqual(side / 2 + 1e-4);
			}
		}
	});
});
