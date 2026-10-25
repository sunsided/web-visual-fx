import { describe, expect, it } from 'vitest';
import {
	CARD_BG,
	CARD_TEXT_MUTED,
	cardOffsets,
	composite,
	contrastRatio,
	glowGradient,
	maxSurfaceAlpha,
	safeSurfaceAlpha,
	spotlightDefaults
} from './spotlight';

describe('composite', () => {
	it('mixes in sRGB', () => {
		expect(composite('#000000', '#ffffff', 0.5)).toBe('#808080');
		expect(composite('#123456', '#ffffff', 0)).toBe('#123456');
	});
});

describe('contrastRatio', () => {
	it('matches the WCAG extremes', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
		expect(contrastRatio('#777777', '#777777')).toBe(1);
	});

	it('keeps the card text readable without glow', () => {
		expect(contrastRatio(CARD_TEXT_MUTED, CARD_BG)).toBeGreaterThan(9);
	});
});

describe('maxSurfaceAlpha', () => {
	it('allows more of a dark glow than of a light one', () => {
		expect(maxSurfaceAlpha(['#4c1d95'])).toBeGreaterThan(maxSurfaceAlpha(['#ffffff']));
	});

	it('keeps 4.5:1 at the cap for every color', () => {
		for (const c of ['#ffffff', '#fde047', '#22d3ee', '#a78bfa']) {
			const a = maxSurfaceAlpha([c]);
			expect(contrastRatio(CARD_TEXT_MUTED, composite(CARD_BG, c, a))).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('leaves the defaults untouched', () => {
		expect(safeSurfaceAlpha(spotlightDefaults.surfaceIntensity, spotlightDefaults)).toBe(
			spotlightDefaults.surfaceIntensity
		);
	});

	it('caps an unsafe request', () => {
		const cap = maxSurfaceAlpha(['#ffffff']);
		expect(safeSurfaceAlpha(0.5, { color: '#ffffff', colorB: '#000000', twoTone: false })).toBe(
			cap
		);
	});
});

describe('cardOffsets', () => {
	it('is relative to the grid and rounded', () => {
		expect(
			cardOffsets({ left: 10, top: 20 }, [
				{ left: 10, top: 20 },
				{ left: 266.4, top: 20 }
			])
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 256, y: 0 }
		]);
	});
});

describe('glowGradient', () => {
	it('includes the second color only in two-tone mode', () => {
		const opts = { glowRadius: 200, color: '#aaaaaa', colorB: '#bbbbbb' };
		expect(glowGradient({ ...opts, twoTone: true })).toBe(
			'radial-gradient(200px circle at var(--_x) var(--_y), #aaaaaa, #bbbbbb 45%, transparent 100%)'
		);
		expect(glowGradient({ ...opts, twoTone: false }, '10px', '20px')).not.toContain('#bbbbbb');
	});
});
