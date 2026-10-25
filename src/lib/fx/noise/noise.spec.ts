import { describe, expect, it } from 'vitest';
import { SAFE_ANIMATION_FREQUENCY, SAFE_SLOW_FPS, maxSafeFps } from './noise';

describe('maxSafeFps', () => {
	it('keeps the requested frame rate for fine grain', () => {
		expect(maxSafeFps({ baseFrequency: 0.8, stretch: 1 }, 60)).toBe(60);
		expect(maxSafeFps({ baseFrequency: SAFE_ANIMATION_FREQUENCY, stretch: 1 }, 24)).toBe(24);
	});

	it('caps coarse noise at the slow, flash-safe rate', () => {
		expect(maxSafeFps({ baseFrequency: 0.005, stretch: 1 }, 60)).toBe(SAFE_SLOW_FPS);
	});

	it('never raises a frame rate that is already slow', () => {
		expect(maxSafeFps({ baseFrequency: 0.005, stretch: 1 }, 1)).toBe(1);
	});

	it('uses the coarser axis when the noise is stretched', () => {
		// 0.6 horizontally, but 0.03 vertically: long horizontal streaks
		expect(maxSafeFps({ baseFrequency: 0.6, stretch: 0.05 }, 30)).toBe(SAFE_SLOW_FPS);
		// stretching the other way makes features smaller, not larger
		expect(maxSafeFps({ baseFrequency: 0.2, stretch: 4 }, 30)).toBe(30);
	});
});
