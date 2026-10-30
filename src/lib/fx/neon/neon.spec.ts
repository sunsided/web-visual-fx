import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../spotlight/spotlight';
import {
	FLICKER_CYCLE,
	FLICKER_STEPS,
	MAX_LAYERS,
	POWER_ON_DURATION,
	POWER_ON_STEPS,
	glowRadii,
	graphemes,
	letterRuns,
	litColor,
	maxFlashesPerSecond,
	neonDefaults,
	neonDropShadow,
	neonTextShadow,
	repeatSteps,
	signContrast,
	stepKeyframes,
	unlitColor
} from './neon';

describe('glowRadii', () => {
	it('doubles from the inside out and ends at the glow radius', () => {
		expect(glowRadii(0.8, 4)).toEqual([0.1, 0.2, 0.4, 0.8]);
	});

	it('clamps the layer count', () => {
		expect(glowRadii(1, 20)).toHaveLength(MAX_LAYERS);
		expect(glowRadii(1, 0)).toEqual([1]);
	});
});

describe('shadow lists', () => {
	it('writes one centered text-shadow per radius', () => {
		expect(neonTextShadow([0.1, 0.2], 'red')).toBe('0 0 0.1em red, 0 0 0.2em red');
		expect(neonTextShadow([0.1, 0.2], 'red', 'white')).toBe('0 0 0.1em white, 0 0 0.2em red');
	});

	it('chains drop-shadow() filters', () => {
		expect(neonDropShadow([0.1, 0.2], 'red')).toBe(
			'drop-shadow(0 0 0.1em red) drop-shadow(0 0 0.2em red)'
		);
	});
});

describe('colors', () => {
	it('mixes the lit fill towards white', () => {
		expect(litColor('#ff0000', 0)).toBe('#ff0000');
		expect(litColor('#ff0000', 1)).toBe('#ffffff');
		expect(litColor('#000000', 0.5)).toBe('#808080');
	});

	it('picks an unlit color that still reads at 3:1', () => {
		const bg = neonDefaults.background;
		const c = unlitColor(neonDefaults.tube, bg);
		expect(contrastRatio(c, bg)).toBeGreaterThanOrEqual(3);
		// but stays well below the lit tube, so it reads as off
		expect(contrastRatio(c, bg)).toBeLessThan(contrastRatio(neonDefaults.tube, bg));
	});

	it('falls back to mixing with white or black for weak tube colors', () => {
		const dark = unlitColor('#200000', '#000000');
		expect(contrastRatio(dark, '#000000')).toBeGreaterThanOrEqual(3);
		const light = unlitColor('#fff8f8', '#ffffff');
		expect(contrastRatio(light, '#ffffff')).toBeGreaterThanOrEqual(3);
	});

	it('keeps the default sign above 3:1 at its dimmest', () => {
		expect(signContrast(neonDefaults)).toBeGreaterThanOrEqual(3);
	});
});

describe('letterRuns', () => {
	it('keeps a plain sign in one run', () => {
		expect(letterRuns('Open late')).toEqual([{ text: 'Open late', state: 'lit' }]);
	});

	it('counts letters, not spaces', () => {
		expect(letterRuns('Open late', { flickerLetter: 6 })).toEqual([
			{ text: 'Open l', state: 'lit' },
			{ text: 'a', state: 'flicker' },
			{ text: 'te', state: 'lit' }
		]);
	});

	it('marks a dead letter and lets it win over the flicker', () => {
		expect(letterRuns('HOTEL', { offLetter: 2 }).map((r) => r.state)).toEqual([
			'lit',
			'off',
			'lit'
		]);
		expect(letterRuns('AB', { offLetter: 1, flickerLetter: 1 })[0].state).toBe('off');
	});

	it('flickers the whole sign when asked to', () => {
		expect(letterRuns('Bar 7', { wholeSign: true, offLetter: 2 })).toEqual([
			{ text: 'B', state: 'flicker' },
			{ text: 'a', state: 'off' },
			{ text: 'r 7', state: 'flicker' }
		]);
	});

	it('treats a grapheme cluster as one letter', () => {
		expect(graphemes('é👍🏽!')).toHaveLength(3);
		expect(letterRuns('a👍🏽b', { offLetter: 2 })[1]).toEqual({ text: '👍🏽', state: 'off' });
	});

	it('loses no characters', () => {
		const text = ' Ab  c ';
		expect(
			letterRuns(text, { flickerLetter: 2, offLetter: 3 })
				.map((r) => r.text)
				.join('')
		).toBe(text);
	});
});

describe('flicker safety (WCAG 2.3.1)', () => {
	it('counts a dip as one flash', () => {
		const dip = [
			{ at: 0, level: 1 },
			{ at: 0.1, level: 0 },
			{ at: 0.2, level: 1 }
		];
		expect(maxFlashesPerSecond(dip)).toBe(1);
		expect(maxFlashesPerSecond(repeatSteps(dip, 0.3, 4))).toBe(4);
	});

	it('flickers at most twice in any second, also across the loop seam', () => {
		expect(maxFlashesPerSecond(repeatSteps(FLICKER_STEPS, FLICKER_CYCLE, 3))).toBeLessThanOrEqual(
			2
		);
	});

	it('stays within the limit while power-on and flicker overlap', () => {
		const merged = [...POWER_ON_STEPS, ...repeatSteps(FLICKER_STEPS, FLICKER_CYCLE, 2)].sort(
			(a, b) => a.at - b.at
		);
		expect(maxFlashesPerSecond(merged)).toBeLessThanOrEqual(2);
		expect(POWER_ON_STEPS.at(-1)!.at).toBeLessThanOrEqual(POWER_ON_DURATION);
	});
});

describe('keyframes in Neon.svelte', () => {
	const source = readFileSync(new URL('./Neon.svelte', import.meta.url), 'utf8');
	// Compared without whitespace, so the formatter may lay the blocks out as it likes.
	const block = (name: string) => {
		const start = source.indexOf(`@keyframes ${name} {`);
		const open = source.indexOf('{', start);
		let depth = 0;
		let end = open;
		for (; end < source.length; end++) {
			if (source[end] === '{') depth++;
			if (source[end] === '}' && --depth === 0) break;
		}
		return source.slice(open + 1, end).replace(/\s+/g, '');
	};
	const flat = (frames: string[]) => frames.join('').replace(/\s+/g, '');

	it('match FLICKER_STEPS', () => {
		expect(block('neon-flicker')).toBe(flat(stepKeyframes(FLICKER_STEPS, FLICKER_CYCLE)));
	});

	it('match POWER_ON_STEPS', () => {
		expect(block('neon-power')).toBe(
			flat(stepKeyframes(POWER_ON_STEPS, POWER_ON_DURATION, '--neon-power', null))
		);
	});

	it('use the cycle lengths from neon.ts', () => {
		expect(source).toContain('FLICKER_CYCLE');
		expect(source).toContain('POWER_ON_DURATION');
	});
});

describe('stepKeyframes', () => {
	it('scales levels by the depth and closes the cycle', () => {
		expect(
			stepKeyframes(
				[
					{ at: 0, level: 1 },
					{ at: 1, level: 0.5 }
				],
				4
			)
		).toEqual([
			'0% { --neon-on: 1; }',
			'25% { --neon-on: calc(1 - var(--_depth) * 0.5); }',
			'100% { --neon-on: calc(1 - var(--_depth) * 0.5); }'
		]);
	});

	it('writes raw levels without a depth', () => {
		expect(stepKeyframes([{ at: 0, level: 0 }], 1, '--p', null)).toEqual([
			'0% { --p: 0; }',
			'100% { --p: 0; }'
		]);
	});
});
