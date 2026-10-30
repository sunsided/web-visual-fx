import { describe, expect, it } from 'vitest';
import {
	bandsAt,
	burnDefaults,
	dissolvePrimitives,
	equalizeTable,
	erf,
	normalCdf,
	noiseSd,
	originMap,
	originMapUrl,
	originRamp,
	primitivesMarkup,
	stepAlpha,
	stepMatrix,
	thresholds,
	type Origin
} from './dissolve';

const edge = { emberWidth: 0.05, charWidth: 0.03, sharpness: 40 };

describe('erf / normalCdf', () => {
	it('matches known values', () => {
		expect(erf(0)).toBeCloseTo(0, 6);
		expect(erf(1)).toBeCloseTo(0.8427, 4);
		expect(erf(-1)).toBeCloseTo(-0.8427, 4);
		expect(normalCdf(0.5, 0.5, 0.1)).toBeCloseTo(0.5, 6);
		expect(normalCdf(0.5 + 0.1 * 1.96, 0.5, 0.1)).toBeCloseTo(0.975, 3);
	});
});

describe('equalizeTable', () => {
	const table = equalizeTable(3);

	it('maps 0 to 0 and 1 to 1', () => {
		expect(table).toHaveLength(33);
		expect(table[0]).toBe(0);
		expect(table.at(-1)).toBe(1);
	});

	it('is monotonic, steepest in the middle and symmetric', () => {
		for (let i = 1; i < table.length; i++) expect(table[i]).toBeGreaterThanOrEqual(table[i - 1]);
		expect(table[16]).toBeCloseTo(0.5, 4);
		const mid = table[17] - table[16];
		const end = table[1] - table[0];
		expect(mid).toBeGreaterThan(10 * end);
		for (let i = 0; i < table.length; i++) expect(table[i] + table[32 - i]).toBeCloseTo(1, 3);
	});

	it('spreads the measured 5th–95th percentile range over most of 0–1', () => {
		// fractalNoise p5 ≈ 0.30, p95 ≈ 0.70 at 3 octaves (see NOISE_SD)
		const sd = noiseSd(3);
		const at = (x: number) => normalCdf(x, 0.5, sd);
		expect(at(0.3)).toBeCloseTo(0.05, 1);
		expect(at(0.7)).toBeCloseTo(0.95, 1);
	});

	it('clamps the octave count', () => {
		expect(noiseSd(0)).toBe(noiseSd(1));
		expect(noiseSd(12)).toBe(noiseSd(6));
	});
});

describe('thresholds', () => {
	it('orders the bands', () => {
		const t = thresholds(0.5, edge);
		expect(t.ember - t.burnt).toBeCloseTo(edge.emberWidth);
		expect(t.intact - t.ember).toBeCloseTo(edge.charWidth);
	});

	it('leaves every field value fully intact at progress 0', () => {
		for (let v = 0; v <= 1; v += 0.05) {
			expect(bandsAt(v, 0, edge)).toEqual({ content: 1, char: 0, ember: 0 });
		}
	});

	it('burns everything, edge included, at progress 1', () => {
		for (let v = 0; v <= 1; v += 0.05) {
			const b = bandsAt(v, 1, edge);
			expect(b.content + b.char + b.ember).toBe(0);
		}
	});

	it('clamps progress', () => {
		expect(thresholds(-1, edge)).toEqual(thresholds(0, edge));
		expect(thresholds(2, edge)).toEqual(thresholds(1, edge));
	});

	it('puts ember, then char, then content across the front', () => {
		const t = thresholds(0.5, edge);
		expect(bandsAt(t.burnt - 0.01, 0.5, edge).ember).toBe(0);
		expect(bandsAt((t.burnt + t.ember) / 2 + 0.01, 0.5, edge).ember).toBeGreaterThan(0.9);
		expect(bandsAt((t.ember + t.intact) / 2 + 0.01, 0.5, edge).char).toBeGreaterThan(0.9);
		expect(bandsAt(t.intact + 0.05, 0.5, edge).content).toBe(1);
	});

	it('never paints more than full opacity across the bands', () => {
		for (let v = 0; v <= 1; v += 0.01) {
			const b = bandsAt(v, 0.4, edge);
			expect(b.content + b.char + b.ember).toBeLessThanOrEqual(1 + 1e-9);
		}
	});
});

describe('stepMatrix', () => {
	it('writes k·R − k·at into alpha', () => {
		expect(stepMatrix(0.25, 40)).toBe('0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  40 0 0 0 -10');
		expect(stepAlpha(0.25, 0.25, 40)).toBe(0);
		expect(stepAlpha(0.275, 0.25, 40)).toBeCloseTo(1);
		expect(stepAlpha(0.2625, 0.25, 40)).toBeCloseTo(0.5);
	});
});

describe('originRamp / originMap', () => {
	it('starts the burn (0) at the chosen side', () => {
		expect(originRamp('bottom', 0.5, 1)).toBe(0);
		expect(originRamp('top', 0.5, 0)).toBe(0);
		expect(originRamp('left', 0, 0.5)).toBe(0);
		expect(originRamp('right', 1, 0.5)).toBe(0);
		expect(originRamp('center', 0.5, 0.5)).toBe(0);
		expect(originRamp('edges', 0, 0)).toBe(0);
		expect(originRamp('center', 0, 0)).toBeCloseTo(1);
	});

	it('stays within 0–1', () => {
		for (const o of ['bottom', 'center', 'edges', 'none'] satisfies Origin[]) {
			for (const [x, y] of [
				[0, 0],
				[1, 1],
				[0.5, 0.2]
			]) {
				const v = originRamp(o, x, y);
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
	});

	it('is grey: R = G = B', () => {
		const map = originMap('left', 8);
		expect(map).toHaveLength(8 * 8 * 3);
		expect(map[0]).toBe(map[1]);
		expect(map[0]).toBe(Math.round(255 * (0.5 / 8)));
		expect(map[7 * 3]).toBe(Math.round(255 * (7.5 / 8)));
	});

	it('caches the data URL', () => {
		expect(originMapUrl('top')).toMatch(/^data:image\/png;base64,/);
		expect(originMapUrl('top')).toBe(originMapUrl('top'));
	});
});

describe('dissolvePrimitives', () => {
	const tags = (o = burnDefaults, p = 0.5) => dissolvePrimitives(p, o).map((x) => x.tag);

	it('keeps the same structure while progress changes', () => {
		expect(tags(burnDefaults, 0)).toEqual(tags(burnDefaults, 1));
	});

	it('skips the ramp, char band and glow when they are off', () => {
		const full = tags();
		expect(full).toContain('feImage');
		const bare = tags({ ...burnDefaults, origin: 'none', charWidth: 0, glow: 0 });
		expect(bare).not.toContain('feImage');
		expect(bare).not.toContain('feGaussianBlur');
		expect(bare.filter((t) => t === 'feFlood')).toHaveLength(1);
		expect(tags({ ...burnDefaults, bias: 0 })).not.toContain('feImage');
	});

	it('only references results that exist', () => {
		for (const o of [burnDefaults, { ...burnDefaults, origin: 'none' as const, charWidth: 0 }]) {
			const prims = dissolvePrimitives(0.3, o);
			const known = new Set(['SourceGraphic', 'SourceAlpha']);
			for (const p of prims) {
				for (const key of ['in', 'in2'] as const) {
					const ref = p.attrs[key];
					if (ref !== undefined)
						expect(known.has(String(ref)), `${p.tag} ${key}=${ref}`).toBe(true);
				}
				for (const c of p.children ?? []) {
					if (c.attrs.in !== undefined) expect(known.has(String(c.attrs.in))).toBe(true);
				}
				if (p.attrs.result) known.add(String(p.attrs.result));
			}
		}
	});

	it('serializes to markup without the inline PNG', () => {
		const markup = primitivesMarkup(dissolvePrimitives(0.5, burnDefaults));
		expect(markup).toContain('<feTurbulence type="fractalNoise"');
		expect(markup).toContain('data:image/png;base64,…');
		expect(markup).toContain('<feFuncR type="table"');
	});
});
