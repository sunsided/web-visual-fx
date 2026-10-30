import { describe, expect, it } from 'vitest';
import {
	foilBackground,
	idlePoint,
	lerpFactor,
	nudge,
	pointerToUnit,
	rainbowStops,
	reliefLayers,
	settled,
	stepPose,
	tiltFor
} from './holo';

describe('pointerToUnit', () => {
	const rect = { left: 100, top: 50, width: 200, height: 400 };

	it('maps the box to 0–1', () => {
		expect(pointerToUnit(100, 50, rect)).toEqual({ x: 0, y: 0 });
		expect(pointerToUnit(200, 250, rect)).toEqual({ x: 0.5, y: 0.5 });
	});

	it('clamps positions outside the box and survives an empty box', () => {
		expect(pointerToUnit(0, 1000, rect)).toEqual({ x: 0, y: 1 });
		expect(pointerToUnit(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
			x: 0.5,
			y: 0.5
		});
	});
});

describe('lerpFactor', () => {
	it('follows instantly without smoothing', () => {
		expect(lerpFactor(0, 16)).toBe(1);
	});

	it('keeps `smoothing` of the old value per 60 fps frame', () => {
		expect(lerpFactor(0.8, 1000 / 60)).toBeCloseTo(0.2);
	});

	it('never moves away from the target on a negative time step', () => {
		expect(lerpFactor(0.8, -5)).toBe(0);
	});

	it('is frame-rate independent: two 120 Hz frames equal one 60 Hz frame', () => {
		const t120 = lerpFactor(0.8, 1000 / 120);
		expect(1 - (1 - t120) ** 2).toBeCloseTo(lerpFactor(0.8, 1000 / 60));
	});
});

describe('stepPose / settled', () => {
	it('moves part of the way and eventually settles', () => {
		const target = { x: 1, y: 0, active: 1 };
		let pose = { x: 0, y: 1, active: 0 };
		pose = stepPose(pose, target, 0.5);
		expect(pose).toEqual({ x: 0.5, y: 0.5, active: 0.5 });
		for (let i = 0; i < 20; i++) pose = stepPose(pose, target, 0.5);
		expect(settled(pose, target)).toBe(true);
	});
});

describe('tiltFor', () => {
	it('is flat in the center and reaches the maximum at the edges', () => {
		expect(tiltFor({ x: 0.5, y: 0.5 }, 15)).toEqual({ rotateX: 0, rotateY: 0 });
		expect(tiltFor({ x: 1, y: 0 }, 15)).toEqual({ rotateX: 15, rotateY: 15 });
		expect(tiltFor({ x: 0, y: 1 }, 15)).toEqual({ rotateX: -15, rotateY: -15 });
	});
});

describe('nudge', () => {
	it('moves by a tenth, or to the edge with Shift, and clamps', () => {
		expect(nudge({ x: 0.5, y: 0.5 }, 'ArrowRight')!.x).toBeCloseTo(0.6);
		expect(nudge({ x: 0.5, y: 0.5 }, 'ArrowUp', true)).toEqual({ x: 0.5, y: 0 });
		expect(nudge({ x: 0, y: 0.5 }, 'ArrowLeft')).toEqual({ x: 0, y: 0.5 });
	});

	it('recenters on Escape/Home and ignores other keys', () => {
		expect(nudge({ x: 0.1, y: 0.9 }, 'Escape')).toEqual({ x: 0.5, y: 0.5 });
		expect(nudge({ x: 0.1, y: 0.9 }, 'a')).toBeUndefined();
	});
});

describe('idlePoint', () => {
	it('stays well inside the card', () => {
		for (let t = 0; t < 120_000; t += 250) {
			const p = idlePoint(t);
			expect(p.x).toBeGreaterThanOrEqual(0.15);
			expect(p.x).toBeLessThanOrEqual(0.85);
			expect(p.y).toBeGreaterThanOrEqual(0.25);
			expect(p.y).toBeLessThanOrEqual(0.75);
		}
	});
});

describe('rainbowStops', () => {
	it('places one stop per 45° and wraps hues', () => {
		expect(rainbowStops(360)).toHaveLength(9);
		expect(rainbowStops(360)[8]).toBe('oklch(78% 0.16 0)');
		expect(rainbowStops(30)).toHaveLength(2);
	});
});

describe('foil layers', () => {
	it('has no relief for the plain rainbow', () => {
		expect(reliefLayers('rainbow', 10)).toEqual([]);
		expect(foilBackground('rainbow', 10, 360).size).toBe('300% 300%');
	});

	it('lists one size, position and blend mode per layer', () => {
		const f = foilBackground('crosshatch', 8, 360);
		expect(f.size.split(', ')).toHaveLength(3);
		expect(f.position).toBe('0 0, 0 0, var(--foil-x) var(--foil-y)');
		expect(f.blend).toBe('hard-light, hard-light, normal');
	});

	it('centers the sunburst on the pointer', () => {
		expect(reliefLayers('sunburst', 10)[0]).toContain('at var(--foil-x) var(--foil-y)');
	});
});
