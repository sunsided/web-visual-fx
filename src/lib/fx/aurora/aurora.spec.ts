import { describe, expect, it } from 'vitest';
import {
	auroraDefaults,
	BASE_DURATION,
	blobLayout,
	blobTiming,
	meshCenter,
	meshLayers,
	paletteOf,
	random,
	saturated,
	type Blob
} from './aurora';

describe('paletteOf', () => {
	it('returns the first colorCount colors, clamped to 2..5', () => {
		expect(paletteOf({ ...auroraDefaults, colorCount: 2 })).toEqual([
			auroraDefaults.color1,
			auroraDefaults.color2
		]);
		expect(paletteOf({ ...auroraDefaults, colorCount: 9 })).toHaveLength(5);
		expect(paletteOf({ ...auroraDefaults, colorCount: 0 })).toHaveLength(2);
	});
});

describe('saturated', () => {
	it('leaves the color alone at 1 and scales the OKLCH chroma otherwise', () => {
		expect(saturated('#ff0000', 1)).toBe('#ff0000');
		expect(saturated('#ff0000', 1.5)).toBe('oklch(from #ff0000 l calc(c * 1.5) h)');
	});
});

describe('random', () => {
	it('is deterministic per seed and stays in [0, 1)', () => {
		const a = random(42);
		const b = random(42);
		for (let i = 0; i < 100; i++) {
			const v = a();
			expect(v).toBe(b());
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});

describe('blobLayout', () => {
	it('is repeatable and differs between seeds', () => {
		expect(blobLayout(5, 3, 7)).toEqual(blobLayout(5, 3, 7));
		expect(blobLayout(5, 3, 7)).not.toEqual(blobLayout(5, 3, 8));
	});

	it('creates count blobs that cycle through the palette', () => {
		const layout = blobLayout(5, 3, 1);
		expect(layout.map((b) => b.color)).toEqual([0, 1, 2, 0, 1]);
	});

	it('only uses whole, non-zero turns, so the loop is seamless', () => {
		for (let seed = 0; seed < 50; seed++) {
			for (const b of blobLayout(8, 5, seed)) {
				expect(Number.isInteger(b.turns)).toBe(true);
				expect(b.turns).not.toBe(0);
			}
		}
	});

	it('keeps start positions inside the area', () => {
		for (let seed = 0; seed < 50; seed++) {
			for (const b of blobLayout(8, 5, seed)) {
				expect(b.x).toBeGreaterThan(0);
				expect(b.x).toBeLessThan(100);
				expect(b.y).toBeGreaterThan(0);
				expect(b.y).toBeLessThan(100);
			}
		}
	});
});

const blob: Blob = { x: 30, y: 40, orbit: 10, turns: -2, phase: 90, color: 1 };

describe('meshCenter / meshLayers', () => {
	it('orbits around a point orbit units to the right of the start', () => {
		const { x, y } = meshCenter(blob, 'var(--t)');
		expect(x).toBe('calc(30cqw + 10cqmax - 10cqmax * cos(calc(var(--t) * -2 + 90deg)))');
		expect(y).toBe('calc(40cqh - 10cqmax * sin(calc(var(--t) * -2 + 90deg)))');
	});

	it('adds the overscan padding', () => {
		expect(meshCenter(blob, 'var(--t)', 'var(--pad)').x).toMatch(/^calc\(var\(--pad\) \+ 30cqw/);
	});

	it('emits one radial-gradient per blob, the last blob first (on top)', () => {
		const layers = meshLayers([blob, { ...blob, color: 0 }], 50, (i) => `c${i}`, {
			falloff: '80%'
		});
		expect(layers).toHaveLength(2);
		expect(layers[0]).toMatch(/^radial-gradient\(circle 25cqmax at .*, c0, transparent 80%\)$/);
		expect(layers[1]).toContain(', c1, ');
	});
});

describe('blobTiming', () => {
	it('turns faster for more turns and with more speed', () => {
		expect(blobTiming({ ...blob, turns: 1, phase: 0 }, 1).duration).toBe(BASE_DURATION);
		expect(blobTiming({ ...blob, turns: 2, phase: 0 }, 2).duration).toBe(BASE_DURATION / 4);
	});

	it('starts at the phase angle, in either direction', () => {
		// forwards: angle(0) = 360° · −delay / duration = phase
		const f = blobTiming({ ...blob, turns: 1, phase: 90 }, 1);
		expect(f.reverse).toBe(false);
		expect((360 * -f.delay) / f.duration).toBeCloseTo(90);
		// reversed: angle(0) = 360° − 360° · −delay / duration = phase
		const r = blobTiming({ ...blob, turns: -1, phase: 90 }, 1);
		expect(r.reverse).toBe(true);
		expect(360 - (360 * -r.delay) / r.duration).toBeCloseTo(90);
	});
});
