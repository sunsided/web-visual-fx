import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const shimmerModes = ['sheen', 'text', 'mask'] as const;
export type ShimmerMode = (typeof shimmerModes)[number];

export const shimmerBlends = ['normal', 'soft-light', 'overlay', 'screen', 'plus-lighter'] as const;
export type ShimmerBlend = (typeof shimmerBlends)[number];

export const shimmerTriggers = ['loop', 'hover'] as const;
export type ShimmerTrigger = (typeof shimmerTriggers)[number];

export const shimmerSchema = defineSchema({
	mode: {
		kind: 'select',
		label: 'Technique',
		default: 'sheen',
		options: shimmerModes,
		group: 'Technique',
		description:
			'sheen: a highlight layer slides over the content (transform, compositor-friendly). text: the highlight is part of a background clipped to the text. mask: an alpha mask dims the content except where the band is.'
	},
	color: {
		kind: 'color',
		label: 'Highlight',
		default: '#ffffff',
		group: 'Band',
		description: 'Color of the band (sheen and text). The mask technique only uses alpha.'
	},
	intensity: {
		kind: 'range',
		label: 'Intensity',
		default: 0.5,
		min: 0,
		max: 1,
		step: 0.05,
		group: 'Band',
		description:
			'sheen: opacity of the band. text: how far the band mixes from the text color towards the highlight. mask: how much the content outside the band is dimmed.'
	},
	band: {
		kind: 'range',
		label: 'Band width',
		default: 24,
		min: 4,
		max: 60,
		step: 1,
		unit: '%',
		group: 'Band',
		description: 'Width of the band as a share of the gradient line, which spans the whole box.'
	},
	angle: {
		kind: 'range',
		label: 'Angle',
		default: 105,
		min: 0,
		max: 180,
		step: 5,
		unit: '°',
		group: 'Band',
		description: 'Gradient angle. 90° sweeps a vertical band left to right; larger values lean it.'
	},
	blend: {
		kind: 'select',
		label: 'Blend (sheen)',
		default: 'soft-light',
		options: shimmerBlends,
		group: 'Band',
		description: 'How the sheen layer mixes with the content under it.'
	},
	duration: {
		kind: 'range',
		label: 'Sweep time',
		default: 1.4,
		min: 0.4,
		max: 6,
		step: 0.1,
		unit: 's',
		group: 'Motion',
		description: 'Seconds the band takes to cross the box.'
	},
	pause: {
		kind: 'range',
		label: 'Pause',
		default: 1.6,
		min: 0,
		max: 6,
		step: 0.1,
		unit: 's',
		group: 'Motion',
		description: 'Rest between two sweeps, while the band waits outside the box.'
	},
	trigger: {
		kind: 'select',
		label: 'Trigger',
		default: 'loop',
		options: shimmerTriggers,
		group: 'Motion',
		description:
			'loop: always sweeping. hover: only while hovered or while something inside has focus.'
	},
	animate: {
		kind: 'toggle',
		label: 'Animate',
		default: true,
		group: 'Motion',
		description: 'Off, or under reduced motion, the content is shown plain, without a band.'
	}
});

export type ShimmerOptions = Values<typeof shimmerSchema>;

export const shimmerDefaults: ShimmerOptions = defaultsOf(shimmerSchema);

/**
 * Presets for the common uses. Each one is a partial set of options on top of the defaults.
 */
export const shimmerPresets = {
	/** Skeleton loader: the placeholder blocks brighten as a soft band passes, nothing in between. */
	skeleton: { mode: 'mask', intensity: 0.45, band: 40, angle: 100, duration: 1.6, pause: 0.4 },
	/** A light sweep over a button every few seconds. */
	button: {
		mode: 'sheen',
		intensity: 0.8,
		band: 18,
		angle: 115,
		blend: 'soft-light',
		duration: 1,
		pause: 2.5
	},
	/** Shiny headline: the text color itself catches the light. */
	text: { mode: 'text', intensity: 0.9, band: 16, angle: 100, duration: 1.8, pause: 1.2 },
	/** Old phone lock screen: dim text with a bright band running through it. */
	unlock: { mode: 'mask', intensity: 0.6, band: 22, angle: 90, duration: 2.2, pause: 0.3 }
} satisfies Record<string, Partial<ShimmerOptions>>;

export type ShimmerPreset = keyof typeof shimmerPresets;

/** Full options for a preset. */
export function presetOptions(name: ShimmerPreset): ShimmerOptions {
	return { ...shimmerDefaults, ...shimmerPresets[name] } as ShimmerOptions;
}

/**
 * Start and end of a linear sweep that includes a pause. The band travels from `start` to `end`
 * in `duration` seconds; to rest for `pause` seconds without a second keyframe, the start is moved
 * back by the distance the band would cover in that time. One linear animation of
 * `duration + pause` seconds then spends the pause outside the box.
 */
export function sweepRange(
	start: number,
	end: number,
	duration: number,
	pause: number
): { from: number; to: number; total: number } {
	const d = Math.max(0.01, duration);
	const p = Math.max(0, pause);
	const from = start - ((end - start) * p) / d;
	return { from: round(from), to: round(end), total: round(d + p) };
}

/**
 * Sweep of the band center along the gradient line, in percent, for the gradient techniques
 * (text, mask). The gradient line of a `linear-gradient` runs from corner to corner of the box
 * whatever the angle, so a band centered at `-band / 2` or `100 + band / 2` is fully outside.
 */
export function gradientSweep({
	band,
	duration,
	pause
}: Pick<ShimmerOptions, 'band' | 'duration' | 'pause'>) {
	return sweepRange(-band / 2, 100 + band / 2, duration, pause);
}

/**
 * Sweep of the sheen layer, as a `translate` in percent of its own width. The layer is as large
 * as the box, so at -100% and 100% it is entirely outside, whatever the angle of its band.
 */
export function sheenSweep({ duration, pause }: Pick<ShimmerOptions, 'duration' | 'pause'>) {
	return sweepRange(-100, 100, duration, pause);
}

/**
 * A linear-gradient with a band of `highlight` centered at `pos` (a CSS percentage, usually a
 * registered custom property) on a `base` color.
 */
export function bandGradient(
	angle: number,
	base: string,
	highlight: string,
	band: number,
	pos = 'var(--shimmer-pos)'
): string {
	const half = round(band / 2);
	return `linear-gradient(${angle}deg, ${base} calc(${pos} - ${half}%), ${highlight} ${pos}, ${base} calc(${pos} + ${half}%))`;
}

/** The sheen layer's own gradient: a band in the middle of a transparent box. */
export function sheenGradient({
	angle,
	color,
	band
}: Pick<ShimmerOptions, 'angle' | 'color' | 'band'>) {
	const half = round(band / 2);
	return `linear-gradient(${angle}deg, transparent ${round(50 - half)}%, ${color}, transparent ${round(50 + half)}%)`;
}

function round(v: number) {
	return Math.round(v * 1000) / 1000;
}
