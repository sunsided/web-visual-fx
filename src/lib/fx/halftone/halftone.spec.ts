import { describe, expect, it } from 'vitest';
import {
	bayerMatrix,
	bayerThresholds,
	bayerTileUrl,
	discreteTable,
	dotGradient,
	inkLayers,
	inkTables,
	quantizeCoefficients,
	thresholdContrast
} from './halftone';

describe('bayerMatrix', () => {
	it('matches the textbook 2×2 and 4×4 matrices', () => {
		expect(bayerMatrix(2)).toEqual([
			[0, 2],
			[3, 1]
		]);
		expect(bayerMatrix(4)).toEqual([
			[0, 8, 2, 10],
			[12, 4, 14, 6],
			[3, 11, 1, 9],
			[15, 7, 13, 5]
		]);
	});

	it('uses every index exactly once', () => {
		const values = bayerMatrix(8).flat();
		expect(values).toHaveLength(64);
		expect([...values].sort((a, b) => a - b)).toEqual([...Array(64).keys()]);
	});

	it('rejects sizes that are not powers of two', () => {
		expect(() => bayerMatrix(3)).toThrow(RangeError);
	});
});

describe('bayerThresholds', () => {
	it('centers the thresholds in their bins', () => {
		expect(bayerThresholds(2)).toEqual([
			[0.125, 0.625],
			[0.875, 0.375]
		]);
	});

	it('averages to one half, so dithering keeps the mean brightness', () => {
		const t = bayerThresholds(8).flat();
		expect(t.reduce((a, b) => a + b) / t.length).toBeCloseTo(0.5);
	});
});

describe('bayerTileUrl', () => {
	it('encodes one grey square per cell', () => {
		const svg = decodeURIComponent(bayerTileUrl(2, 3).replace('data:image/svg+xml,', ''));
		expect(svg).toContain(`width='6' height='6'`);
		expect(svg.match(/<rect/g)).toHaveLength(4);
		// threshold 0.625 → 159
		expect(svg).toContain(`x='3' y='0' width='3' height='3' fill='rgb(159,159,159)'`);
	});
});

describe('quantizeCoefficients', () => {
	/** What feComposite + feFuncX type="discrete" compute together. */
	function quantize(c: number, t: number, levels: number) {
		const { k2, k3 } = quantizeCoefficients(levels);
		const prepared = Math.min(1, k2 * c + k3 * t);
		const index = Math.min(levels - 1, Math.floor(prepared * levels));
		return index / (levels - 1);
	}

	it('rounds to the nearest level with a flat 50 % threshold', () => {
		expect(quantize(0.2, 0.5, 2)).toBe(0);
		expect(quantize(0.6, 0.5, 2)).toBe(1);
		expect(quantize(0.3, 0.5, 3)).toBe(0.5);
		expect(quantize(1, 0.5, 4)).toBe(1);
		expect(quantize(0, 0.5, 4)).toBe(0);
	});

	it('dithers: the share of lit cells approximates the input', () => {
		const thresholds = bayerThresholds(4).flat();
		for (const c of [0.25, 0.5, 0.75]) {
			const lit = thresholds.map((t) => quantize(c, t, 2)).reduce((a, b) => a + b);
			expect(lit / thresholds.length).toBeCloseTo(c);
		}
	});

	it('keeps opaque alpha at 1', () => {
		const { k2, k3 } = quantizeCoefficients(5);
		expect(k2 + k3).toBeCloseTo(1);
	});
});

describe('discreteTable', () => {
	it('spreads the levels evenly from 0 to 1', () => {
		expect(discreteTable(2)).toBe('0 1');
		expect(discreteTable(3)).toBe('0 0.5 1');
		expect(discreteTable(4)).toBe('0 0.3333 0.6667 1');
	});
});

describe('dotGradient', () => {
	it('goes from black to 50 % grey, quadratically until dots touch', () => {
		const stops = dotGradient(4).split(', ');
		expect(stops[0]).toBe('rgb(0% 0% 0%) 0%');
		// r² = 0.25 → π/4 · 0.25
		expect(stops[2]).toBe('rgb(19.63% 19.63% 19.63%) 50%');
		expect(stops.at(-1)).toBe('rgb(50% 50% 50%) 100%');
	});

	it('makes the inked area match the darkness until dots touch', () => {
		for (const stop of dotGradient().split(', ')) {
			const [, grey, pos] = stop.match(/rgb\(([\d.]+)% .*\) ([\d.]+)%/)!.map(Number);
			const r2 = (pos / 100) ** 2;
			if (r2 > 0.5) continue;
			// A pixel at r is inked below darkness 2·g; a dot of radius r covers π/2 · r² of the cell.
			expect((2 * grey) / 100).toBeCloseTo((Math.PI / 2) * r2, 3);
		}
	});
});

describe('thresholdContrast', () => {
	it('is steep for hard edges and gentle for soft ones', () => {
		expect(thresholdContrast(0)).toBe(100);
		expect(thresholdContrast(1)).toBe(4);
		expect(thresholdContrast(0.2)).toBeGreaterThan(thresholdContrast(0.5));
	});
});

describe('inkLayers', () => {
	/** Applies difference, lighten and darken (per channel) to black (0) or white (255). */
	function render(v: 0 | 255, ink: string, paper: string) {
		const layers = inkLayers(ink, paper);
		const ch = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
		const [inv, lo, hi] = [ch(layers.invert), ch(layers.lighten), ch(layers.darken)];
		return [0, 1, 2].map((c) => Math.min(Math.max(Math.abs(v - inv[c]), lo[c]), hi[c]));
	}

	it('maps black to ink and white to paper', () => {
		expect(render(0, '#1b1a3a', '#f6efe0')).toEqual([0x1b, 0x1a, 0x3a]);
		expect(render(255, '#1b1a3a', '#f6efe0')).toEqual([0xf6, 0xef, 0xe0]);
	});

	it('also works for light ink on dark paper', () => {
		expect(render(0, '#ffd166', '#102a43')).toEqual([0xff, 0xd1, 0x66]);
		expect(render(255, '#ffd166', '#102a43')).toEqual([0x10, 0x2a, 0x43]);
	});
});

describe('inkTables', () => {
	it('maps 0 to ink and 1 to paper per channel', () => {
		expect(inkTables('#000000', '#ff8000')).toEqual(['0 1', '0 0.502', '0 0']);
	});
});
