import { describe, expect, it } from 'vitest';
import { flowOffset } from '../ripple/ripple';
import {
	DRIFT_SPEED,
	causticsDefaults,
	causticsOffsets,
	ridgeTable,
	warpTileSize
} from './caustics';

describe('ridgeTable', () => {
	const values = (width: number, steps?: number) => ridgeTable(width, steps).split(' ').map(Number);

	it('is bright at the ridge (input 0) and dark past the width', () => {
		const t = values(0.1);
		expect(t).toHaveLength(32);
		expect(t[0]).toBe(1);
		expect(t.at(-1)).toBe(0);
		// entries at x ≥ 0.1 are all 0
		const firstDark = t.findIndex((v) => v === 0);
		expect(firstDark / 31).toBeGreaterThanOrEqual(0.09);
		expect(t.slice(firstDark).every((v) => v === 0)).toBe(true);
	});

	it('falls off monotonically, quadratically', () => {
		const t = values(0.5, 11);
		for (let i = 1; i < t.length; i++) expect(t[i]).toBeLessThanOrEqual(t[i - 1]);
		// x = 0.1 → (1 − 0.2)² = 0.64
		expect(t[1]).toBeCloseTo(0.64, 3);
	});

	it('gets wider with the width', () => {
		const lit = (w: number) => values(w).filter((v) => v > 0).length;
		expect(lit(0.3)).toBeGreaterThan(lit(0.05));
	});

	it('survives a zero width', () => {
		expect(values(0)[0]).toBe(1);
		expect(
			values(0)
				.slice(1)
				.every((v) => v === 0)
		).toBe(true);
	});
});

describe('warpTileSize', () => {
	it('is about 1.4 times the tile and not a multiple of it', () => {
		for (const tile of [128, 256, 384, 512]) {
			const w = warpTileSize(tile);
			expect(w / tile).toBeCloseTo(1.375, 2);
			expect(w % tile).not.toBe(0);
			expect(Number.isInteger(w)).toBe(true);
		}
	});
});

describe('causticsOffsets', () => {
	const opts = { speed: 20, direction: 0, tileSize: 256 };

	it('drifts the cells slower than the surface', () => {
		const o = causticsOffsets(1, opts);
		expect(o.cells).toEqual(flowOffset(1, 20 * DRIFT_SPEED, 0, 256));
		expect(o.warp[0]).toEqual({ dx: 20, dy: 0 });
	});

	it('has two crossing wave trains wrapped into the warp tile', () => {
		const o = causticsOffsets(500, opts);
		expect(o.warp).toHaveLength(2);
		for (const { dx, dy } of o.warp) {
			expect(dx).toBeLessThan(warpTileSize(256));
			expect(dy).toBeLessThan(warpTileSize(256));
		}
	});

	it('works with the defaults', () => {
		const o = causticsOffsets(0, causticsDefaults);
		expect(o.cells).toEqual({ dx: 0, dy: 0 });
	});
});
