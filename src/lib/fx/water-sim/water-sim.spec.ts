import { describe, expect, it } from 'vitest';
import {
	canvasSize,
	coverCrop,
	DROP_SHADER,
	groutWidth,
	hexToRgb,
	MAX_SIM_CELLS,
	MAX_TICKS_PER_FRAME,
	nextRainDelay,
	pointerToUv,
	poolFloorCss,
	RENDER_SHADER,
	settleSteps,
	simSize,
	ticksFor,
	TICK,
	UPDATE_SHADER,
	VERTEX_SHADER,
	waterSimDefaults
} from './water-sim';

describe('canvasSize', () => {
	it('multiplies by the pixel ratio, capped at maxDpr', () => {
		expect(canvasSize({ width: 400, height: 300 }, 1, 2)).toEqual({ width: 400, height: 300 });
		expect(canvasSize({ width: 400, height: 300 }, 3, 2)).toEqual({ width: 800, height: 600 });
		expect(canvasSize({ width: 401, height: 301 }, 1.5, 2)).toEqual({ width: 602, height: 452 });
	});

	it('never returns an empty canvas', () => {
		expect(canvasSize({ width: 0, height: 0 }, 2, 2)).toEqual({ width: 1, height: 1 });
	});
});

describe('simSize', () => {
	it('scales by the resolution', () => {
		expect(simSize({ width: 400, height: 200 }, 0.5)).toEqual({ width: 200, height: 100 });
	});

	it('caps the long side and keeps the aspect ratio', () => {
		const s = simSize({ width: 2000, height: 1000 }, 1);
		expect(s).toEqual({ width: MAX_SIM_CELLS, height: MAX_SIM_CELLS / 2 });
	});
});

describe('settleSteps', () => {
	it('is the step count until damping^n falls below the threshold', () => {
		const n = settleSteps(0.985);
		expect(0.985 ** n).toBeLessThanOrEqual(1e-3);
		expect(0.985 ** (n - 1)).toBeGreaterThan(1e-3);
	});

	it('never settles without damping', () => {
		expect(settleSteps(1)).toBe(Infinity);
	});
});

describe('ticksFor', () => {
	it('runs whole ticks and carries the remainder', () => {
		const a = ticksFor(0, TICK * 2.5);
		expect(a.ticks).toBe(2);
		expect(a.carry).toBeCloseTo(TICK * 0.5);
		const b = ticksFor(a.carry, TICK * 0.5);
		expect(b.ticks).toBe(1);
		expect(b.carry).toBeCloseTo(0);
	});

	it('runs the same number of ticks per second at 60 and 120 Hz', () => {
		const run = (hz: number) => {
			let carry = 0;
			let total = 0;
			for (let i = 0; i < hz; i++) {
				const t = ticksFor(carry, 1 / hz);
				carry = t.carry;
				total += t.ticks;
			}
			return total;
		};
		expect(run(60)).toBe(60);
		expect(run(120)).toBe(60);
		expect(run(144)).toBeGreaterThanOrEqual(59);
	});

	it('drops the backlog after a stall', () => {
		expect(ticksFor(0, 5)).toEqual({ ticks: MAX_TICKS_PER_FRAME, carry: 0 });
	});
});

describe('pointerToUv', () => {
	const rect = { left: 10, top: 20, width: 100, height: 50 };

	it('maps to 0–1 with y pointing up', () => {
		expect(pointerToUv(10, 20, rect)).toEqual({ x: 0, y: 1 });
		expect(pointerToUv(60, 45, rect)).toEqual({ x: 0.5, y: 0.5 });
	});

	it('ignores points outside or an empty rect', () => {
		expect(pointerToUv(5, 30, rect)).toBeUndefined();
		expect(pointerToUv(5, 30, { ...rect, width: 0 })).toBeUndefined();
	});
});

describe('nextRainDelay', () => {
	it('averages 1/rate', () => {
		const n = 10000;
		let sum = 0;
		for (let i = 0; i < n; i++) sum += nextRainDelay(2, (i + 0.5) / n);
		expect(sum / n).toBeCloseTo(0.5, 1);
	});

	it('never rains at 0', () => {
		expect(nextRainDelay(0, 0.5)).toBe(Infinity);
	});
});

describe('coverCrop', () => {
	it('crops the sides of a wide image for a square target', () => {
		expect(coverCrop({ width: 200, height: 100 }, { width: 50, height: 50 })).toEqual({
			sx: 50,
			sy: 0,
			sw: 100,
			sh: 100
		});
	});

	it('crops top and bottom of a tall image for a wide target', () => {
		const c = coverCrop({ width: 100, height: 400 }, { width: 200, height: 100 });
		expect(c.sw).toBeCloseTo(100);
		expect(c.sh).toBeCloseTo(50);
		expect(c.sy).toBeCloseTo(175);
	});
});

describe('hexToRgb / groutWidth / poolFloorCss', () => {
	it('parses hex colors', () => {
		expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
	});

	it('scales the grout with the tile, at least 1px', () => {
		expect(groutWidth(12)).toBe(1);
		expect(groutWidth(42)).toBe(3);
	});

	it('lists one size per layer', () => {
		const css = poolFloorCss(waterSimDefaults);
		expect(css.size.split(',')).toHaveLength(css.image.split(/,\s*(?=[a-z-]+-gradient\()/).length);
		expect(css.image).toContain(waterSimDefaults.tileColor);
		expect(css.image).toContain(waterSimDefaults.groutColor);
	});
});

describe('shaders', () => {
	it('are GLSL ES 3.00 with the uniforms gl.ts sets', () => {
		for (const s of [VERTEX_SHADER, UPDATE_SHADER, DROP_SHADER, RENDER_SHADER]) {
			expect(s.startsWith('#version 300 es\n')).toBe(true);
		}
		expect(UPDATE_SHADER).toMatch(/uniform float uDamping/);
		for (const u of ['uCenter', 'uRadius', 'uStrength']) expect(DROP_SHADER).toContain(u);
		for (const u of ['uImage', 'uRefraction', 'uSpecular', 'uTint', 'uTintAmount']) {
			expect(RENDER_SHADER).toContain(u);
		}
	});
});
