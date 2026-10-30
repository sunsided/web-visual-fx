import { describe, expect, it, vi } from 'vitest';
import {
	cellSize,
	fallbackBackground,
	PAINT_NAME,
	paintPattern,
	paintPatternDefaults,
	paintPatternSchema,
	paintProperties,
	paintVars,
	workletSource,
	type PaintContext,
	type PaintInput
} from './paint-worklet';

function recorder() {
	const calls: string[] = [];
	const ctx: PaintContext & { calls: string[] } = {
		calls,
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
		lineCap: 'butt',
		lineJoin: 'miter',
		beginPath: () => calls.push('beginPath'),
		closePath: () => calls.push('closePath'),
		moveTo: () => calls.push('moveTo'),
		lineTo: () => calls.push('lineTo'),
		arc: () => calls.push('arc'),
		fill: () => calls.push('fill'),
		stroke: () => calls.push('stroke')
	};
	return ctx;
}

const input: PaintInput = {
	pattern: 'dots',
	seed: 7,
	density: 1,
	size: 16,
	stroke: 3,
	jitter: 0.8,
	phase: 0,
	colors: ['#f00', '#0f0', '#00f']
};

describe('cellSize', () => {
	it('is 2.4 × size at density 1 and shrinks with √density', () => {
		expect(cellSize(10, 1)).toBeCloseTo(24);
		expect(cellSize(10, 4)).toBeCloseTo(12);
	});
});

describe('paintPattern', () => {
	it('paints about one shape per cell, plus the margin cells that reach in', () => {
		const ctx = recorder();
		const n = paintPattern(ctx, 384, 192, input);
		const cell = cellSize(16, 1);
		const inner = Math.ceil(384 / cell) * Math.ceil(192 / cell);
		expect(n).toBeGreaterThanOrEqual(inner);
		expect(n).toBeLessThanOrEqual((Math.ceil(384 / cell) + 2) * (Math.ceil(192 / cell) + 2));
		expect(ctx.calls.filter((c) => c === 'arc')).toHaveLength(n);
	});

	it('strokes squiggles and fills closed blobs', () => {
		const s = recorder();
		const ns = paintPattern(s, 100, 100, { ...input, pattern: 'squiggles' });
		expect(s.calls.filter((c) => c === 'stroke')).toHaveLength(ns);
		expect(s.lineWidth).toBe(3);
		const b = recorder();
		const nb = paintPattern(b, 100, 100, { ...input, pattern: 'blobs' });
		expect(b.calls.filter((c) => c === 'closePath')).toHaveLength(nb);
		expect(b.calls.filter((c) => c === 'fill')).toHaveLength(nb);
	});

	it('is deterministic, and keeps cells stable when the box grows', () => {
		const positions = (w: number) => {
			const xs: number[] = [];
			const ctx = {
				...recorder(),
				arc: (x: number, y: number) => xs.push(+x.toFixed(3), +y.toFixed(3))
			};
			paintPattern(ctx, w, 100, input);
			return xs;
		};
		expect(positions(200)).toEqual(positions(200));
		const small = new Set(positions(200).join(',').split(','));
		const large = positions(400).join(',');
		// Every coordinate of the small box shows up again in the larger one.
		for (const v of small) expect(large).toContain(v);
	});

	it('changes with the seed', () => {
		const first = (seed: number) => {
			let x = 0;
			paintPattern({ ...recorder(), arc: (px: number) => (x ||= px) }, 100, 100, {
				...input,
				seed
			});
			return x;
		};
		expect(first(1)).not.toBe(first(2));
	});
});

describe('workletSource', () => {
	it('registers a painter that reads every registered property', () => {
		const registerPaint = vi.fn();
		new Function('registerPaint', workletSource())(registerPaint);
		expect(registerPaint).toHaveBeenCalledOnce();
		const [name, Painter] = registerPaint.mock.calls[0];
		expect(name).toBe(PAINT_NAME);
		expect(Painter.inputProperties).toEqual(paintProperties.map((p) => p.name));

		// Feed it typed-OM-like values (they stringify like computed values) and paint.
		const values: Record<string, string> = {
			'--vfx-paint-pattern': 'squiggles',
			'--vfx-paint-seed': '3',
			'--vfx-paint-density': '1',
			'--vfx-paint-size': '12px',
			'--vfx-paint-stroke': '2px',
			'--vfx-paint-jitter': '0.5',
			'--vfx-paint-phase': '0.25',
			'--vfx-paint-color-1': 'rgb(255, 0, 0)',
			'--vfx-paint-color-2': 'rgb(0, 255, 0)',
			'--vfx-paint-color-3': 'rgb(0, 0, 255)'
		};
		const ctx = recorder();
		new Painter().paint(
			ctx,
			{ width: 120, height: 80 },
			{ get: (n: string) => ({ toString: () => values[n] }) }
		);
		expect(ctx.calls).toContain('stroke');
		expect(ctx.lineWidth).toBe(2);
		expect(['rgb(255, 0, 0)', 'rgb(0, 255, 0)', 'rgb(0, 0, 255)']).toContain(ctx.strokeStyle);
	});
});

describe('paintVars', () => {
	it('maps options to the registered properties, with px lengths', () => {
		const vars = paintVars(paintPatternDefaults);
		expect(vars['--vfx-paint-size']).toBe(`${paintPatternDefaults.size}px`);
		expect(vars['--vfx-paint-pattern']).toBe(paintPatternDefaults.pattern);
		for (const name of Object.keys(vars)) {
			expect(paintProperties.some((p) => p.name === name)).toBe(true);
		}
	});
});

describe('fallbackBackground', () => {
	it('gives one image, size and position per layer', () => {
		for (const pattern of paintPatternSchema.pattern.options) {
			const bg = fallbackBackground({ ...paintPatternDefaults, pattern });
			const layers = bg.image.split('radial-gradient(').length - 1;
			expect(layers).toBe(pattern === 'squiggles' ? 6 : 3);
			expect(bg.size.split(',')).toHaveLength(layers);
			expect(bg.position.split(',')).toHaveLength(layers);
			for (const c of ['color1', 'color2', 'color3'] as const) {
				expect(bg.image).toContain(paintPatternDefaults[c]);
			}
		}
	});

	it('is deterministic per seed', () => {
		const a = fallbackBackground(paintPatternDefaults);
		expect(fallbackBackground(paintPatternDefaults)).toEqual(a);
		expect(fallbackBackground({ ...paintPatternDefaults, seed: 99 }).position).not.toBe(a.position);
	});

	it('spaces squiggle rows far enough apart that the arcs never overlap', () => {
		const o = { ...paintPatternDefaults, pattern: 'squiggles' as const, size: 40, density: 3 };
		const [w, h] = fallbackBackground(o).size.split(',')[0].trim().split(' ').map(parseFloat);
		const r = 40 * 0.45;
		expect(w).toBeGreaterThan(4 * r);
		expect(h / 3).toBeGreaterThanOrEqual(2 * r + o.stroke);
	});
});
