import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { springEasing } from '../squircle/squircle.js';

export const splitModes = ['chars', 'words'] as const;
export type SplitMode = (typeof splitModes)[number];

export const revealOrders = ['start', 'end', 'center'] as const;
export type RevealOrder = (typeof revealOrders)[number];

export const revealEasings = ['spring', 'emphasized', 'ease-out'] as const;
export type RevealEasing = (typeof revealEasings)[number];

export const indexSources = ['auto', 'sibling-index', 'inline'] as const;
export type IndexSource = (typeof indexSources)[number];

export const splitTextSchema = defineSchema({
	split: {
		kind: 'select',
		label: 'Split into',
		default: 'chars',
		options: splitModes,
		group: 'Split',
		description: 'Pieces that animate one after another: characters (graphemes) or words.'
	},
	order: {
		kind: 'select',
		label: 'Order',
		default: 'start',
		options: revealOrders,
		group: 'Split',
		description:
			'start: first piece first. end: last piece first. center: from the middle outwards. end and center need the piece count.'
	},
	stagger: {
		kind: 'range',
		label: 'Stagger',
		default: 35,
		min: 0,
		max: 200,
		step: 5,
		unit: 'ms',
		group: 'Timing',
		description: 'Delay added per piece: transition-delay is index × stagger.'
	},
	duration: {
		kind: 'range',
		label: 'Duration',
		default: 700,
		min: 100,
		max: 2000,
		step: 50,
		unit: 'ms',
		group: 'Timing',
		description: 'Transition time of each piece.'
	},
	easing: {
		kind: 'select',
		label: 'Easing',
		default: 'spring',
		options: revealEasings,
		group: 'Timing',
		description: 'spring is a damped spring sampled into a linear() easing.'
	},
	bounce: {
		kind: 'range',
		label: 'Bounce',
		default: 0.3,
		min: 0,
		max: 0.8,
		step: 0.05,
		group: 'Timing',
		description: 'Overshoot of the spring easing; ignored by the others.'
	},
	distance: {
		kind: 'range',
		label: 'Rise',
		default: 24,
		min: -60,
		max: 60,
		step: 2,
		unit: 'px',
		group: 'Start state',
		description: 'Vertical offset each piece starts from. Positive values rise from below.'
	},
	blur: {
		kind: 'range',
		label: 'Blur',
		default: 6,
		min: 0,
		max: 16,
		step: 1,
		unit: 'px',
		group: 'Start state'
	},
	rotate: {
		kind: 'range',
		label: 'Rotate',
		default: 0,
		min: -45,
		max: 45,
		step: 1,
		unit: '°',
		group: 'Start state'
	},
	scale: {
		kind: 'range',
		label: 'Scale',
		default: 1,
		min: 0.3,
		max: 2,
		step: 0.05,
		group: 'Start state'
	},
	index: {
		kind: 'select',
		label: 'Index source',
		default: 'auto',
		options: indexSources,
		group: 'Technique',
		description:
			'Where each piece gets its position from. sibling-index: CSS sibling-index()/sibling-count() only. inline: a --i custom property written by the component. auto: sibling-index() where supported, inline otherwise.'
	}
});

export type SplitTextOptions = Values<typeof splitTextSchema>;

export const splitTextDefaults: SplitTextOptions = defaultsOf(splitTextSchema);

export interface Word {
	text: string;
	/** Graphemes, so emoji and combining marks stay whole. */
	chars: string[];
	/** Index of the word's first character among all characters. */
	offset: number;
}

/** User-perceived characters. `Intl.Segmenter` where available, code points otherwise. */
export function graphemes(text: string): string[] {
	if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
		const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		return [...segmenter.segment(text)].map((s) => s.segment);
	}
	return Array.from(text);
}

/**
 * Words of `text` (split on any whitespace, which collapses like it does in HTML), each with its
 * characters and the running character offset.
 */
export function splitWords(text: string): Word[] {
	let offset = 0;
	return text
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => {
			const chars = graphemes(word);
			const w = { text: word, chars, offset };
			offset += chars.length;
			return w;
		});
}

/** Number of animated pieces. */
export function pieceCount(words: Word[], split: SplitMode): number {
	if (split === 'words') return words.length;
	return words.reduce((n, w) => n + w.chars.length, 0);
}

/** Position of piece `i` of `n` in the reveal order, 0 = first to appear. */
export function revealStep(i: number, n: number, order: RevealOrder): number {
	switch (order) {
		case 'end':
			return n - 1 - i;
		case 'center':
			return Math.abs(i - (n - 1) / 2);
		default:
			return i;
	}
}

/**
 * The same as `revealStep`, as a CSS expression over `--_i` and `--_n`. `max(x, -x)` is an
 * absolute value that works in every engine with `calc()`.
 */
export function revealStepCss(order: RevealOrder): string {
	switch (order) {
		case 'end':
			return 'calc(var(--_n) - 1 - var(--_i))';
		case 'center':
			return 'max(var(--_i) - (var(--_n) - 1) / 2, (var(--_n) - 1) / 2 - var(--_i))';
		default:
			return 'var(--_i)';
	}
}

/** Milliseconds until the last piece has arrived. */
export function totalTime(
	n: number,
	{ order, stagger, duration }: Pick<SplitTextOptions, 'order' | 'stagger' | 'duration'>
): number {
	if (n <= 0) return 0;
	const last = Math.max(...Array.from({ length: n }, (_, i) => revealStep(i, n, order)));
	return Math.round(last * stagger + duration);
}

/** CSS timing function for an easing choice. */
export function revealEasing(easing: RevealEasing, bounce: number): string {
	switch (easing) {
		case 'spring':
			return springEasing(bounce);
		case 'emphasized':
			return 'cubic-bezier(0.2, 0, 0, 1)';
		default:
			return 'cubic-bezier(0.2, 0.8, 0.2, 1)';
	}
}
