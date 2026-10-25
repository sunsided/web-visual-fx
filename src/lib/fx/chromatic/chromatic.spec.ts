import { describe, expect, it } from 'vitest';
import {
	channelOffsets,
	JITTER_MAX_HZ,
	jitterAt,
	radialMap,
	radialScales,
	regionPadding
} from './chromatic';

describe('channelOffsets', () => {
	it('moves red and blue apart and keeps green in rgb mode', () => {
		expect(channelOffsets('rgb', 4, 0)).toEqual({
			r: { dx: 4, dy: 0 },
			g: { dx: 0, dy: 0 },
			b: { dx: -4, dy: 0 }
		});
	});

	it('follows the angle (90° is down)', () => {
		const { r, b } = channelOffsets('rgb', 3, 90);
		expect(r).toEqual({ dx: 0, dy: 3 });
		expect(b).toEqual({ dx: 0, dy: -3 });
	});

	it('moves green with blue in red-cyan mode', () => {
		const { r, g, b } = channelOffsets('red-cyan', 2, 180);
		expect(r).toEqual({ dx: -2, dy: 0 });
		expect(g).toEqual({ dx: 2, dy: 0 });
		expect(b).toEqual(g);
	});

	it('has no linear offsets in radial mode', () => {
		const { r, g, b } = channelOffsets('radial', 5, 45);
		expect([r, g, b]).toEqual([
			{ dx: 0, dy: 0 },
			{ dx: 0, dy: 0 },
			{ dx: 0, dy: 0 }
		]);
	});
});

describe('regionPadding', () => {
	it('leaves room for the distance plus jitter, whatever the element size', () => {
		expect(regionPadding(24)).toBeGreaterThanOrEqual(24);
		expect(regionPadding(3, 1.5)).toBeGreaterThanOrEqual(4.5);
		expect(regionPadding(-1)).toBeGreaterThan(0);
	});
});

describe('radialMap', () => {
	const decode = (url: string) => decodeURIComponent(url.slice('data:image/svg+xml,'.length));

	it('is an SVG data URL with a red and a green gradient', () => {
		const { url } = radialMap(200, 100, 10);
		expect(url.startsWith('data:image/svg+xml,')).toBe(true);
		const svg = decode(url);
		expect(svg).toContain('<linearGradient id="x">');
		expect(svg).toContain('<linearGradient id="y" x2="0" y2="1">');
	});

	it('uses the steepest slope that keeps both axes inside [0, 1]', () => {
		// The short axis is padded relatively more, so it decides: 100 + 2·25 = 1.5 × 100.
		expect(radialMap(400, 100, 25).edge).toBeCloseTo(0.5 / 1.5);
		const svg = decode(radialMap(400, 100, 25).url);
		expect(svg).toContain('stop-color="rgb(0,0,0)"');
		expect(svg).toContain('stop-color="rgb(0,255,0)"');
	});
});

describe('radialScales', () => {
	it('reaches `distance` px at the element edge', () => {
		const { edge } = radialMap(300, 200, 12);
		const { r, g, b } = radialScales(4, edge);
		expect(b * edge).toBeCloseTo(4, 1);
		expect(r).toBe(-b);
		expect(g).toBe(0);
	});
});

describe('jitterAt', () => {
	it('stays within [-1, 1]', () => {
		for (let t = 0; t < 60; t += 0.013) {
			const { dx, dy } = jitterAt(t);
			expect(Math.abs(dx)).toBeLessThanOrEqual(1);
			expect(Math.abs(dy)).toBeLessThanOrEqual(1);
		}
	});

	it('changes smoothly between frames (no jumps)', () => {
		// Max slope of the sum of sines bounds the change per 60 fps frame.
		const frame = 1 / 60;
		for (let t = 0; t < 10; t += frame) {
			const a = jitterAt(t);
			const b = jitterAt(t + frame);
			expect(Math.abs(b.dx - a.dx)).toBeLessThan(0.15);
			expect(Math.abs(b.dy - a.dy)).toBeLessThan(0.15);
		}
	});

	it('oscillates below the flash limit', () => {
		expect(JITTER_MAX_HZ).toBeLessThan(3);
	});
});
