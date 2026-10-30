import { describe, expect, it } from 'vitest';
import {
	graphemes,
	pieceCount,
	revealEasing,
	revealStep,
	revealStepCss,
	splitWords,
	totalTime
} from './split-text';

describe('graphemes', () => {
	it('keeps emoji and combining marks whole', () => {
		expect(graphemes('é👍🏽a')).toEqual(['é', '👍🏽', 'a']);
	});
});

describe('splitWords', () => {
	it('collapses whitespace and tracks character offsets', () => {
		expect(splitWords('  Hi   there\nyou ')).toEqual([
			{ text: 'Hi', chars: ['H', 'i'], offset: 0 },
			{ text: 'there', chars: ['t', 'h', 'e', 'r', 'e'], offset: 2 },
			{ text: 'you', chars: ['y', 'o', 'u'], offset: 7 }
		]);
	});

	it('returns nothing for blank text', () => {
		expect(splitWords('   ')).toEqual([]);
	});
});

describe('pieceCount', () => {
	it('counts words or characters, without spaces', () => {
		const words = splitWords('ab cde');
		expect(pieceCount(words, 'words')).toBe(2);
		expect(pieceCount(words, 'chars')).toBe(5);
	});
});

describe('revealStep', () => {
	it('orders from the start, the end or the middle', () => {
		expect([0, 1, 2, 3, 4].map((i) => revealStep(i, 5, 'start'))).toEqual([0, 1, 2, 3, 4]);
		expect([0, 1, 2, 3, 4].map((i) => revealStep(i, 5, 'end'))).toEqual([4, 3, 2, 1, 0]);
		expect([0, 1, 2, 3, 4].map((i) => revealStep(i, 5, 'center'))).toEqual([2, 1, 0, 1, 2]);
		expect([0, 1, 2, 3].map((i) => revealStep(i, 4, 'center'))).toEqual([1.5, 0.5, 0.5, 1.5]);
	});

	it('has CSS twins over --_i and --_n', () => {
		expect(revealStepCss('start')).toBe('var(--_i)');
		expect(revealStepCss('end')).toContain('var(--_n) - 1 - var(--_i)');
		expect(revealStepCss('center')).toMatch(/^max\(/);
	});
});

describe('totalTime', () => {
	it('is the last delay plus one duration', () => {
		expect(totalTime(10, { order: 'start', stagger: 30, duration: 600 })).toBe(870);
		expect(totalTime(10, { order: 'center', stagger: 30, duration: 600 })).toBe(735);
		expect(totalTime(0, { order: 'start', stagger: 30, duration: 600 })).toBe(0);
	});
});

describe('revealEasing', () => {
	it('samples a spring into linear()', () => {
		expect(revealEasing('spring', 0.3)).toMatch(/^linear\(0, /);
		expect(revealEasing('emphasized', 0)).toBe('cubic-bezier(0.2, 0, 0, 1)');
	});
});
