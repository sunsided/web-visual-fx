import { describe, expect, it } from 'vitest';
import {
	bandGradient,
	gradientSweep,
	presetOptions,
	sheenGradient,
	sheenSweep,
	shimmerDefaults,
	shimmerPresets,
	shimmerSchema,
	sweepRange
} from './shimmer';

describe('sweepRange', () => {
	it('is the plain travel without a pause', () => {
		expect(sweepRange(-10, 110, 2, 0)).toEqual({ from: -10, to: 110, total: 2 });
	});

	it('moves the start back by the distance covered during the pause', () => {
		// 120% in 2 s is 60%/s, so 1 s of pause adds 60% before the box.
		expect(sweepRange(-10, 110, 2, 1)).toEqual({ from: -70, to: 110, total: 3 });
	});

	it('keeps the speed inside the box independent of the pause', () => {
		const a = sweepRange(-100, 100, 1.5, 0);
		const b = sweepRange(-100, 100, 1.5, 4);
		const speed = (r: { from: number; to: number; total: number }) => (r.to - r.from) / r.total;
		expect(speed(b)).toBeCloseTo(speed(a));
	});
});

describe('gradientSweep / sheenSweep', () => {
	it('starts and ends with the band fully outside the gradient line', () => {
		const r = gradientSweep({ band: 20, duration: 1, pause: 0 });
		expect(r.from).toBe(-10);
		expect(r.to).toBe(110);
	});

	it('slides the sheen layer by its own width on both sides', () => {
		expect(sheenSweep({ duration: 1, pause: 0 })).toEqual({ from: -100, to: 100, total: 1 });
	});
});

describe('gradients', () => {
	it('centers the band on the position', () => {
		expect(bandGradient(90, 'red', 'white', 20, '50%')).toBe(
			'linear-gradient(90deg, red calc(50% - 10%), white 50%, red calc(50% + 10%))'
		);
	});

	it('puts the sheen band in the middle of the layer', () => {
		expect(sheenGradient({ angle: 120, color: '#fff', band: 30 })).toBe(
			'linear-gradient(120deg, transparent 35%, #fff, transparent 65%)'
		);
	});
});

describe('presets', () => {
	it('only use values the schema allows', () => {
		for (const name of Object.keys(shimmerPresets) as (keyof typeof shimmerPresets)[]) {
			const o = presetOptions(name);
			for (const [k, v] of Object.entries(o)) {
				const p = shimmerSchema[k as keyof typeof shimmerSchema];
				if (p.kind === 'range') {
					expect(v).toBeGreaterThanOrEqual(p.min);
					expect(v).toBeLessThanOrEqual(p.max);
				}
				if (p.kind === 'select') expect(p.options).toContain(v);
			}
		}
	});

	it('fill the rest from the defaults', () => {
		expect(presetOptions('text').color).toBe(shimmerDefaults.color);
	});
});
