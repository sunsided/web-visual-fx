import { describe, expect, it } from 'vitest';
import { hexToRgba, relativeLuminance, textColorFor } from './glass';

describe('relativeLuminance', () => {
	it('matches the WCAG reference points', () => {
		expect(relativeLuminance('#000000')).toBe(0);
		expect(relativeLuminance('#ffffff')).toBeCloseTo(1);
		expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 3);
	});
});

describe('textColorFor', () => {
	it('puts dark text on light tints and light text on dark tints', () => {
		expect(textColorFor('#ffffff')).toBe('dark');
		expect(textColorFor('#ffe066')).toBe('dark');
		expect(textColorFor('#0d0a1f')).toBe('light');
		expect(textColorFor('#2a0f4f')).toBe('light');
	});
});

describe('hexToRgba', () => {
	it('converts #rrggbb plus alpha', () => {
		expect(hexToRgba('#ff8000', 0.5)).toBe('rgb(255 128 0 / 0.5)');
	});
});
