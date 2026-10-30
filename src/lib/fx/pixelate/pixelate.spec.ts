import { describe, expect, it } from 'vitest';
import { effectiveSize, isShaped, mosaicCell, tileMaskUrl, tileShape } from './pixelate';

describe('mosaicCell', () => {
	it('grows the dot to exactly one block for every size', () => {
		for (let n = 1; n <= 64; n++) {
			const c = mosaicCell(n);
			expect(c.dot + 2 * c.radius).toBe(n);
			// the dilated square starts at the cell corner and ends at the next one
			expect(c.offset - c.radius).toBe(0);
			expect(c.offset + c.dot + c.radius).toBe(n);
			expect(Number.isInteger(c.radius)).toBe(true);
		}
	});

	it('uses a 1px dot for odd and a 2px dot for even blocks', () => {
		expect(mosaicCell(9)).toEqual({ size: 9, offset: 4, dot: 1, radius: 4 });
		expect(mosaicCell(10)).toEqual({ size: 10, offset: 4, dot: 2, radius: 4 });
	});

	it('rounds and clamps the size', () => {
		expect(mosaicCell(7.6).size).toBe(8);
		expect(mosaicCell(0)).toEqual({ size: 1, offset: 0, dot: 1, radius: 0 });
	});
});

describe('tileShape', () => {
	it('centers a square that is gap pixels smaller', () => {
		expect(tileShape(20, 4, 0)).toEqual({ inset: 2, side: 16, rx: 0 });
	});

	it('makes a circle at roundness 1', () => {
		expect(tileShape(10, 2, 1)).toEqual({ inset: 1, side: 8, rx: 4 });
	});

	it('never goes negative', () => {
		expect(tileShape(4, 10, 2).side).toBe(0);
		expect(tileShape(4, 10, 2).rx).toBe(0);
	});
});

describe('isShaped', () => {
	it('only needs the mask with a gap or rounding', () => {
		expect(isShaped(0, 0)).toBe(false);
		expect(isShaped(1, 0)).toBe(true);
		expect(isShaped(0, 0.1)).toBe(true);
	});
});

describe('tileMaskUrl', () => {
	it('encodes one cell with the tile rect', () => {
		const svg = decodeURIComponent(tileMaskUrl(12, 2, 0.5).replace('data:image/svg+xml,', ''));
		expect(svg).toContain("width='12' height='12'");
		expect(svg).toContain("<rect x='1' y='1' width='10' height='10' rx='2.5'");
	});
});

describe('effectiveSize', () => {
	it('rounds tweened values and treats anything up to 1 as off', () => {
		expect(effectiveSize(1.4)).toBe(1);
		expect(effectiveSize(0.2)).toBe(1);
		expect(effectiveSize(5.5)).toBe(6);
	});
});
