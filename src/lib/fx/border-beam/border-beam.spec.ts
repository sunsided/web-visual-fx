import { describe, expect, it } from 'vitest';
import {
	beamArc,
	beamGradient,
	beamPeriod,
	beamStops,
	borderBeamDefaults,
	passesPerSecond,
	staticRing
} from './border-beam';

const base = { ...borderBeamDefaults, color: '#ffffff', colorB: '#000000' };

describe('beamPeriod / beamArc', () => {
	it('splits the circle evenly', () => {
		expect(beamPeriod(1)).toBe(360);
		expect(beamPeriod(4)).toBe(90);
		expect(beamPeriod(0)).toBe(360);
	});

	it('caps the arc so neighbouring beams never touch', () => {
		expect(beamArc(90, 1)).toBe(90);
		expect(beamArc(180, 4)).toBe(89);
		expect(beamArc(0, 1)).toBe(1);
	});
});

describe('beamStops', () => {
	it('ends a clockwise beam with its head at the end of the period', () => {
		expect(beamStops({ ...base, length: 100, beams: 1 })).toBe(
			'transparent 0deg 260deg, #000000 305deg, #ffffff 357deg, transparent 360deg'
		);
	});

	it('mirrors a counterclockwise beam so the head leads the other way', () => {
		const stops = beamStops({ ...base, length: 100, beams: 2, direction: 'counterclockwise' });
		expect(stops).toBe(
			'transparent 0deg, #ffffff 3deg, #000000 55deg, transparent 100deg, transparent 180deg'
		);
	});

	it('uses a short head fade on short beams', () => {
		expect(beamStops({ ...base, length: 10, beams: 1 })).toContain('#ffffff 359deg');
	});
});

describe('beamGradient', () => {
	it('repeats only with several beams', () => {
		expect(beamGradient({ ...base, beams: 1 })).toMatch(
			/^conic-gradient\(from var\(--border-beam-angle\), /
		);
		expect(beamGradient({ ...base, beams: 3 }, '45deg')).toMatch(
			/^repeating-conic-gradient\(from 45deg, /
		);
	});
});

describe('staticRing / passesPerSecond', () => {
	it('goes once around with both colors', () => {
		expect(staticRing(base)).toBe('conic-gradient(#ffffff, #000000, #ffffff)');
	});

	it('keeps the defaults far from flashing', () => {
		expect(passesPerSecond(borderBeamDefaults)).toBeLessThan(1);
		expect(passesPerSecond({ beams: 4, duration: 1 })).toBe(4);
	});
});
