import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	circleClipFrames,
	easingValue,
	revealOrigin,
	revealRadius,
	runViewTransition,
	shuffled,
	transitionName
} from './view-transition';

const box = { width: 400, height: 300 };

describe('revealOrigin', () => {
	it('uses the pointer, clamped into the box', () => {
		expect(revealOrigin('pointer', { x: 100, y: 50 }, box)).toEqual({ x: 100, y: 50 });
		expect(revealOrigin('pointer', { x: -20, y: 900 }, box)).toEqual({ x: 0, y: 300 });
	});

	it('falls back to the center without a pointer', () => {
		expect(revealOrigin('pointer', null, box)).toEqual({ x: 200, y: 150 });
		expect(revealOrigin('center', { x: 1, y: 1 }, box)).toEqual({ x: 200, y: 150 });
	});

	it('can start in the corner', () => {
		expect(revealOrigin('top-left', { x: 1, y: 1 }, box)).toEqual({ x: 0, y: 0 });
	});
});

describe('revealRadius', () => {
	it('reaches the farthest corner', () => {
		expect(revealRadius({ x: 0, y: 0 }, box)).toBe(500);
		expect(revealRadius({ x: 200, y: 150 }, box)).toBe(250);
		expect(revealRadius({ x: 400, y: 300 }, box)).toBe(500);
	});
});

describe('circleClipFrames', () => {
	it('grows from nothing to the full radius, rounded outwards', () => {
		expect(circleClipFrames({ x: 10.4, y: 20.6 }, 99.2)).toEqual([
			'circle(0px at 10px 21px)',
			'circle(100px at 10px 21px)'
		]);
	});
});

describe('transitionName', () => {
	it('produces a valid custom ident', () => {
		expect(transitionName('s1', 'card', 3)).toBe('vt-s1-card-3');
		expect(transitionName('Hello world!', 'é')).toBe('vt-Hello_world_-_');
		expect(transitionName('none')).not.toBe('none');
	});
});

describe('easingValue', () => {
	it('maps the named curve and passes keywords through', () => {
		expect(easingValue('emphasized')).toBe('cubic-bezier(0.2, 0, 0, 1)');
		expect(easingValue('linear')).toBe('linear');
	});
});

describe('shuffled', () => {
	it('keeps every item and leaves the input alone', () => {
		const input = [1, 2, 3, 4, 5];
		const out = shuffled(input, () => 0);
		expect(out).toEqual([2, 3, 4, 5, 1]);
		expect(input).toEqual([1, 2, 3, 4, 5]);
		expect([...shuffled(input)].sort()).toEqual(input);
	});
});

describe('runViewTransition', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function stubDom({ supported = true, reduced = false } = {}) {
		const started: unknown[] = [];
		const style = new Map<string, string>();
		const documentElement = {
			style: {
				setProperty: (k: string, v: string) => style.set(k, v),
				removeProperty: (k: string) => style.delete(k)
			}
		};
		const doc: Record<string, unknown> = { documentElement };
		if (supported) {
			doc.startViewTransition = (update: () => void) => {
				update();
				started.push(update);
				return { finished: new Promise(() => {}), ready: Promise.resolve() };
			};
		}
		vi.stubGlobal('document', doc);
		vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
		return { started, style };
	}

	it('applies the update instantly without support', () => {
		stubDom({ supported: false });
		const update = vi.fn();
		expect(runViewTransition(update).transition).toBeNull();
		expect(update).toHaveBeenCalledOnce();
	});

	it('applies the update instantly under reduced motion', () => {
		const { started } = stubDom({ reduced: true });
		const update = vi.fn();
		expect(runViewTransition(update).transition).toBeNull();
		expect(update).toHaveBeenCalledOnce();
		expect(started).toHaveLength(0);
	});

	it('falls back to a document transition and sets the variables on <html>', () => {
		const { started, style } = stubDom();
		const update = vi.fn();
		const run = runViewTransition(update, { vars: { '--d': '300ms' } });
		expect(run.transition).not.toBeNull();
		expect(run.root).toBe(document.documentElement);
		expect(started).toHaveLength(1);
		expect(style.get('--d')).toBe('300ms');
	});
});
