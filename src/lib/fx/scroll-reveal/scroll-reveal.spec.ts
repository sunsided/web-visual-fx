import { describe, expect, it } from 'vitest';
import {
	animationRange,
	clipInset,
	exitRange,
	flipTransform,
	parallaxShift,
	revealCss,
	revealFrames,
	scrollRevealDefaults,
	slideTranslate,
	spanExitRange,
	spanRange
} from './scroll-reveal';

const base = scrollRevealDefaults;

describe('revealFrames', () => {
	it('ends every preset at the resting state, except clip-path', () => {
		for (const preset of ['slide', 'scale', 'blur'] as const) {
			const { to } = revealFrames({ ...base, preset });
			expect(to).toEqual({
				opacity: '1',
				translate: 'none',
				scale: 'none',
				filter: 'none',
				clipPath: 'none',
				transform: 'none'
			});
		}
		expect(revealFrames({ ...base, preset: 'clip' }).to.clipPath).toBe('inset(0)');
	});

	it('only changes the preset’s own properties', () => {
		expect(revealFrames({ ...base, preset: 'slide', edge: 'bottom', distance: 40 }).from).toEqual({
			opacity: '0',
			translate: '0 40px',
			scale: 'none',
			filter: 'none',
			clipPath: 'none',
			transform: 'none'
		});
		expect(revealFrames({ ...base, preset: 'scale', startScale: 0.5 }).from.scale).toBe('0.5');
		expect(revealFrames({ ...base, preset: 'blur', blurRadius: 8 }).from.filter).toBe('blur(8px)');
	});

	it('keeps clip reveals opaque', () => {
		const { from } = revealFrames({ ...base, preset: 'clip', edge: 'left' });
		expect(from.opacity).toBe('1');
		expect(from.clipPath).toBe('inset(0 100% 0 0)');
	});

	it('uses none instead of zero-length functions', () => {
		expect(revealFrames({ ...base, preset: 'slide', distance: 0 }).from.translate).toBe('none');
		expect(revealFrames({ ...base, preset: 'flip', angle: 0 }).from.transform).toBe('none');
		expect(revealFrames({ ...base, preset: 'blur', blurRadius: 0 }).from.filter).toBe('none');
	});
});

describe('slideTranslate', () => {
	it('starts on the side it comes in from', () => {
		expect(slideTranslate('right', 160)).toBe('160px 0');
		expect(slideTranslate('left', 160)).toBe('-160px 0');
		expect(slideTranslate('bottom', 48)).toBe('0 48px');
		expect(slideTranslate('top', 48)).toBe('0 -48px');
		expect(slideTranslate('center', 48)).toBe('none');
	});
});

describe('flip', () => {
	it('turns around the axis along the edge and ends at 0° with the same functions', () => {
		expect(flipTransform('right', 70)).toBe('perspective(800px) rotateY(-70deg)');
		expect(flipTransform('bottom', 70)).toBe('perspective(800px) rotateX(70deg)');
		const { from, to } = revealFrames({ ...base, preset: 'flip', edge: 'right', angle: 70 });
		expect(from.transform).toBe('perspective(800px) rotateY(-70deg)');
		expect(to.transform).toBe('perspective(800px) rotateY(0deg)');
	});
});

describe('spans', () => {
	const range = { range: 'cover' as const, rangeStart: 10, rangeEnd: 70, exit: false };

	it('maps each span to an animation-range', () => {
		expect(spanRange({ ...range, span: 'center' })).toBe('entry 0% cover 50%');
		expect(spanRange({ ...range, span: 'entry' })).toBe('entry 0% entry 100%');
		expect(spanRange({ ...range, span: 'visible' })).toBe('entry 0% entry 100%');
		expect(spanRange({ ...range, span: 'custom' })).toBe('cover 10% cover 70%');
	});

	it('hides again only for visible or with exit on', () => {
		expect(spanExitRange({ ...range, span: 'visible' })).toBe('exit 0% exit 100%');
		expect(spanExitRange({ ...range, span: 'center' })).toBeUndefined();
		expect(spanExitRange({ ...range, span: 'center', exit: true })).toBe('cover 50% exit 100%');
		expect(spanExitRange({ ...range, span: 'custom', exit: true })).toBe('exit 30% exit 90%');
	});
});

describe('clipInset', () => {
	it('hides everything but the starting edge', () => {
		expect(clipInset('bottom')).toBe('inset(100% 0 0 0)');
		expect(clipInset('top')).toBe('inset(0 0 100% 0)');
		expect(clipInset('right')).toBe('inset(0 0 0 100%)');
		expect(clipInset('center')).toBe('inset(50% 50% 50% 50%)');
	});
});

describe('animationRange', () => {
	it('formats a named range', () => {
		expect(animationRange('entry', 0, 100)).toBe('entry 0% entry 100%');
	});

	it('swaps a start past the end', () => {
		expect(animationRange('cover', 60, 20)).toBe('cover 20% cover 60%');
	});
});

describe('exitRange', () => {
	it('mirrors the entry range', () => {
		expect(exitRange(10, 90)).toBe('exit 10% exit 90%');
		expect(exitRange(0, 40)).toBe('exit 60% exit 100%');
	});
});

describe('parallaxShift', () => {
	it('scales with depth and needs as much bleed as it travels', () => {
		expect(parallaxShift(0.5, 120)).toEqual({ shift: 60, bleed: 60 });
		expect(parallaxShift(-0.25, 120)).toEqual({ shift: -30, bleed: 30 });
		expect(parallaxShift(0, 120).bleed).toBe(0);
	});
});

describe('revealCss', () => {
	it('guards the animation with @supports and reduced motion', () => {
		const css = revealCss(base);
		expect(css).toContain('@supports (animation-timeline: view())');
		expect(css).toContain('prefers-reduced-motion: no-preference');
		expect(css).toContain('animation-range: entry 0% cover 50%;');
		expect(css).toContain('translate: 160px 0;');
		// a slide ends at the resting state: no `to` block needed
		expect(css).not.toContain('to {');
	});

	it('adds the reversed exit animation', () => {
		const css = revealCss({ ...base, span: 'custom', exit: true, rangeStart: 20, rangeEnd: 80 });
		expect(css).toContain('reverse forwards');
		expect(css).toContain('animation-range: entry 20% entry 80%, exit 20% exit 80%;');
	});

	it('ends a clip reveal on inset(0)', () => {
		expect(revealCss({ ...base, preset: 'clip' })).toContain('clip-path: inset(0);');
	});
});
