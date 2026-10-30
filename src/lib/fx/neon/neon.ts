import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { composite, contrastRatio } from '../spotlight/spotlight.js';

export const neonTechniques = ['text-shadow', 'drop-shadow'] as const;
export type NeonTechnique = (typeof neonTechniques)[number];

export const neonFonts = ['rounded', 'sans', 'script', 'mono'] as const;
export type NeonFont = (typeof neonFonts)[number];

/** System font stacks only: no web font has to load before the sign lights up. */
export const FONT_STACKS: Record<NeonFont, string> = {
	rounded:
		'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Varela Round", "Nunito", system-ui, sans-serif',
	sans: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
	script: '"Segoe Script", "Brush Script MT", "Lucida Handwriting", "URW Chancery L", cursive',
	mono: 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace'
};

/** Upper bound of the layer count; more layers mostly cost paint and add little light. */
export const MAX_LAYERS = 6;

/** Highest letter index the schema offers for the flickering and the dead letter. */
export const MAX_LETTER = 24;

export const neonSchema = defineSchema({
	tube: {
		kind: 'color',
		label: 'Tube color',
		default: '#ff3fd2',
		group: 'Tube',
		description: 'Color of the gas glow. The letters themselves are this color mixed with white.'
	},
	core: {
		kind: 'range',
		label: 'Hot core',
		default: 0.7,
		min: 0,
		max: 1,
		step: 0.05,
		group: 'Tube',
		description:
			'How far the letter fill is mixed towards white, like the overexposed center of a real tube.'
	},
	background: {
		kind: 'color',
		label: 'Wall',
		default: '#120a1c',
		group: 'Tube',
		description:
			'Painted behind the sign. Also used to pick an unlit color that still reads at 3:1.'
	},
	glow: {
		kind: 'range',
		label: 'Glow radius',
		default: 0.9,
		min: 0.1,
		max: 1.5,
		step: 0.05,
		unit: 'em',
		group: 'Glow',
		description: 'Blur radius of the widest layer, relative to the font size.'
	},
	layers: {
		kind: 'range',
		label: 'Layers',
		default: 5,
		min: 2,
		max: MAX_LAYERS,
		step: 1,
		group: 'Glow',
		description: 'Stacked shadows, each with twice the radius of the one inside it.'
	},
	intensity: {
		kind: 'range',
		label: 'Intensity',
		default: 1,
		min: 0.2,
		max: 1,
		step: 0.05,
		group: 'Glow',
		description: 'Opacity of the glow color.'
	},
	technique: {
		kind: 'select',
		label: 'Technique',
		default: 'text-shadow',
		options: neonTechniques,
		group: 'Glow',
		description:
			'text-shadow: independent layers, each painted from the glyphs. drop-shadow: a filter chain, every shadow also blurs the ones before it, so the bloom builds up brighter.'
	},
	font: {
		kind: 'select',
		label: 'Font',
		default: 'rounded',
		options: neonFonts,
		group: 'Glow',
		description: 'System font stack. Even-stroke (monoline) fonts look most like bent glass.'
	},
	flicker: {
		kind: 'toggle',
		label: 'Flicker',
		default: true,
		group: 'Motion',
		description:
			'A worn-out tube that dips now and then: at most two dips in any second, off under reduced motion.'
	},
	flickerLetter: {
		kind: 'range',
		label: 'Flickering letter',
		default: 6,
		min: 0,
		max: MAX_LETTER,
		step: 1,
		group: 'Motion',
		when: 'flicker',
		description:
			'Which letter flickers, counting letters only (spaces skipped). 0 = the whole sign.'
	},
	flickerDepth: {
		kind: 'range',
		label: 'Flicker depth',
		default: 0.85,
		min: 0.1,
		max: 1,
		step: 0.05,
		group: 'Motion',
		when: 'flicker',
		description: 'How far a dip goes towards the unlit tube.'
	},
	powerOn: {
		kind: 'toggle',
		label: 'Power-on',
		default: true,
		group: 'Motion',
		description: 'The sign stutters on once when it appears.'
	},
	offLetter: {
		kind: 'range',
		label: 'Dead letter',
		default: 0,
		min: 0,
		max: MAX_LETTER,
		step: 1,
		group: 'Motion',
		description: 'A letter whose tube is broken: unlit, but still readable. 0 = none.'
	}
});

export type NeonOptions = Values<typeof neonSchema>;

export const neonDefaults: NeonOptions = defaultsOf(neonSchema);

const round = (v: number) => +v.toFixed(4);

// ---------------------------------------------------------------------------------------------
// Glow

/**
 * Blur radii (in em) of the glow layers, innermost first. Each layer doubles the radius of the
 * previous one and the last one is `glow`: light falls off roughly exponentially around a tube,
 * and a doubling series covers a wide range with few layers.
 */
export function glowRadii(glow: number, layers: number): number[] {
	const n = Math.max(1, Math.min(MAX_LAYERS, Math.round(layers)));
	return Array.from({ length: n }, (_, i) => round(glow / 2 ** (n - 1 - i)));
}

/**
 * `text-shadow` value: one centered, blurred shadow per radius. The innermost layer is the
 * `halo` color (the near-white light right at the glass), the others are `color`.
 */
export function neonTextShadow(radii: readonly number[], color: string, halo = color): string {
	return radii.map((r, i) => `0 0 ${r}em ${i === 0 ? halo : color}`).join(', ');
}

/** `filter` value: a chain of `drop-shadow()`; each one also shadows the glow before it. */
export function neonDropShadow(radii: readonly number[], color: string, halo = color): string {
	return radii.map((r, i) => `drop-shadow(0 0 ${r}em ${i === 0 ? halo : color})`).join(' ');
}

// ---------------------------------------------------------------------------------------------
// Colors and contrast

/** Lit letter fill: the tube color mixed towards white by `core` (sRGB, like CSS blending). */
export function litColor(tube: string, core: number): string {
	return composite(tube, '#ffffff', Math.min(1, Math.max(0, core)));
}

/**
 * Unlit tube color: the tube mixed into the background, just strong enough for `minRatio`
 * against it (3:1, the WCAG minimum for large text, which a sign always is). Starts at a dim 30 %
 * and adds tube color in 5 % steps; if even the pure tube color is too weak, mixes towards white
 * or black instead, whichever contrasts with the background.
 */
export function unlitColor(tube: string, background: string, minRatio = 3): string {
	for (let a = 0.3; a <= 1.0001; a += 0.05) {
		const c = composite(background, tube, a);
		if (contrastRatio(c, background) >= minRatio) return c;
	}
	const toward = contrastRatio('#ffffff', background) > contrastRatio('#000000', background);
	for (let a = 0.05; a <= 1.0001; a += 0.05) {
		const c = composite(tube, toward ? '#ffffff' : '#000000', a);
		if (contrastRatio(c, background) >= minRatio) return c;
	}
	return toward ? '#ffffff' : '#000000';
}

/**
 * Text contrast of the sign at its worst moment. A dip mixes the lit fill towards the unlit one,
 * so the lower of the two end points is the floor.
 */
export function signContrast({
	tube,
	core,
	background
}: Pick<NeonOptions, 'tube' | 'core' | 'background'>): number {
	return Math.min(
		contrastRatio(litColor(tube, core), background),
		contrastRatio(unlitColor(tube, background), background)
	);
}

// ---------------------------------------------------------------------------------------------
// Letters

export type RunState = 'lit' | 'flicker' | 'off';

export interface Run {
	text: string;
	state: RunState;
}

/** User-perceived characters; `Intl.Segmenter` keeps emoji and combining marks together. */
export function graphemes(text: string): string[] {
	if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
		const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		return Array.from(seg.segment(text), (s) => s.segment);
	}
	return Array.from(text);
}

/**
 * Splits `text` into runs of letters that share a state. `flickerLetter` and `offLetter` count
 * from 1 and skip whitespace (0 = none). `flickerLetter` 0 with `wholeSign` makes every letter
 * flicker. The dead letter wins if both point at the same one.
 *
 * As few runs as possible: a sign without special letters stays a single text node, so screen
 * readers that announce every inline element separately still read it as one word.
 */
export function letterRuns(
	text: string,
	{
		flickerLetter = 0,
		offLetter = 0,
		wholeSign = false
	}: { flickerLetter?: number; offLetter?: number; wholeSign?: boolean } = {}
): Run[] {
	const runs: Run[] = [];
	let letter = 0;
	for (const g of graphemes(text)) {
		const isLetter = g.trim() !== '';
		if (isLetter) letter += 1;
		let state: RunState = wholeSign ? 'flicker' : 'lit';
		if (isLetter && letter === flickerLetter) state = 'flicker';
		if (isLetter && letter === offLetter) state = 'off';
		// whitespace joins whatever run it is in, it has no tube of its own
		const last = runs.at(-1);
		if (last && (last.state === state || !isLetter)) last.text += g;
		else runs.push({ text: g, state });
	}
	return runs;
}

// ---------------------------------------------------------------------------------------------
// Flicker (photosensitivity)

/** One step of a stepped animation: from `at` seconds on, the tube is at `level` (0–1). */
export interface Step {
	at: number;
	level: number;
}

/**
 * Seconds per flicker cycle. Long, so the dips stay rare: three dips per six seconds, two of
 * them in quick succession like a failing starter.
 */
export const FLICKER_CYCLE = 6;

/** The flicker, as levels held from each time on (CSS `step-end` between keyframes). */
export const FLICKER_STEPS: readonly Step[] = [
	{ at: 0, level: 1 },
	{ at: 2.4, level: 0 },
	{ at: 2.48, level: 1 },
	{ at: 2.7, level: 0.4 },
	{ at: 2.78, level: 1 },
	{ at: 4.8, level: 0.1 },
	{ at: 4.92, level: 1 }
];

/** Seconds of the one-off power-on sequence. */
export const POWER_ON_DURATION = 1.2;

/** Power-on: dark, a first strike, a sag, then steady. */
export const POWER_ON_STEPS: readonly Step[] = [
	{ at: 0, level: 0 },
	{ at: 0.35, level: 1 },
	{ at: 0.45, level: 0.15 },
	{ at: 0.9, level: 1 }
];

/**
 * WCAG 2.3.1 allows at most three flashes in any one-second period; a flash is a pair of
 * opposing luminance changes. This counts every level change as half a flash, however small,
 * which is conservative: the guideline only counts changes of 10 % relative luminance or more.
 * Returns the most flashes found in any one-second window (rounded up). Pass the steps of all
 * animations that can affect the same letter at once, merged on one time line.
 */
export function maxFlashesPerSecond(steps: readonly Step[], window = 1): number {
	const changes: number[] = [];
	for (let i = 1; i < steps.length; i++) {
		if (steps[i].level !== steps[i - 1].level) changes.push(steps[i].at);
	}
	let most = 0;
	for (const start of changes) {
		const inWindow = changes.filter((t) => t >= start && t < start + window).length;
		most = Math.max(most, Math.ceil(inWindow / 2));
	}
	return most;
}

/** `steps` repeated `cycles` times back to back (to check the seam between two cycles). */
export function repeatSteps(steps: readonly Step[], duration: number, cycles = 2): Step[] {
	return Array.from({ length: cycles }, (_, c) =>
		steps.map((s) => ({ at: round(s.at + c * duration), level: s.level }))
	).flat();
}

/**
 * CSS keyframes for stepped levels: `property` held at each level from its time on. With a
 * `depth` expression the levels are scaled at runtime to 1 − depth · (1 − level); with `null`
 * they are written as they are. Used with `animation-timing-function: step-end`, so the value
 * jumps, like a tube that either strikes or doesn't, and the glow only repaints at the jumps.
 */
export function stepKeyframes(
	steps: readonly Step[],
	duration: number,
	property = '--neon-on',
	depth: string | null = 'var(--_depth)'
): string[] {
	const value = (level: number) =>
		depth === null || level === 1 ? `${level}` : `calc(1 - ${depth} * ${round(1 - level)})`;
	const frames = steps.map(
		(s) => `${round((s.at / duration) * 100)}% { ${property}: ${value(s.level)}; }`
	);
	const last = steps.at(-1)!;
	if (last.at < duration) frames.push(`100% { ${property}: ${value(last.level)}; }`);
	return frames;
}
