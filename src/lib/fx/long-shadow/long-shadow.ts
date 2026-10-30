import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const mixSpaces = ['oklab', 'srgb', 'oklch'] as const;
export type MixSpace = (typeof mixSpaces)[number];

/**
 * Upper bound of the step count. Every step is one more full copy of the text to paint;
 * past a few dozen the shadow stops getting smoother and only gets slower.
 */
export const MAX_STEPS = 60;

export const longShadowSchema = defineSchema({
	face: {
		kind: 'color',
		label: 'Text color',
		default: '#fff4e0',
		group: 'Colors',
		description: 'The letters on top of the shadow.'
	},
	from: {
		kind: 'color',
		label: 'Shadow start',
		default: '#e0475b',
		group: 'Colors',
		description: 'Shadow color right behind the letters.'
	},
	to: {
		kind: 'color',
		label: 'Shadow end',
		default: '#4a1d5e',
		group: 'Colors',
		description: 'Shadow color at the far end. The steps in between are mixed with color-mix().'
	},
	space: {
		kind: 'select',
		label: 'Mix in',
		default: 'oklab',
		options: mixSpaces,
		group: 'Colors',
		description:
			'Color space of the ramp. oklab: even lightness steps; srgb: like a classic gradient; oklch: keeps saturation, can swing through other hues.'
	},
	fade: {
		kind: 'toggle',
		label: 'Fade out',
		default: false,
		group: 'Colors',
		description: 'Each step a little more transparent, so the shadow dissolves into the page.'
	},
	angle: {
		kind: 'range',
		label: 'Angle',
		default: 45,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Shape',
		description: 'Direction the shadow falls in: 0° right, 90° down (screen coordinates).'
	},
	length: {
		kind: 'range',
		label: 'Length',
		default: 0.4,
		min: 0.02,
		max: 1.5,
		step: 0.01,
		unit: 'em',
		group: 'Shape',
		description: 'Distance from the letters to the end of the shadow, relative to the font size.'
	},
	steps: {
		kind: 'range',
		label: 'Steps',
		default: 60,
		min: 1,
		max: MAX_STEPS,
		step: 1,
		group: 'Shape',
		description:
			'Copies along the way. Gaps appear when one step is longer than about a pixel and a half.'
	},
	ambient: {
		kind: 'toggle',
		label: 'Ambient shadow',
		default: false,
		group: 'Shape',
		description:
			'A soft, blurred shadow beyond the last step: the extrusion casts a shadow onto the page.'
	}
});

export type LongShadowOptions = Values<typeof longShadowSchema>;

export const longShadowDefaults: LongShadowOptions = defaultsOf(longShadowSchema);

const round = (v: number) => {
	const r = +v.toFixed(4);
	return r === 0 ? 0 : r; // no "-0em"
};

/** Offset (in the unit of `distance`) along `angle` degrees: 0 right, 90 down. */
export function offsetAt(angle: number, distance: number): [number, number] {
	const rad = (angle * Math.PI) / 180;
	return [round(Math.cos(rad) * distance), round(Math.sin(rad) * distance)];
}

/**
 * Color of step `i` of `n` (1-based): `from` at the first step, `to` at the last, mixed in
 * `space` in between. With `fade`, also mixed with transparent, from opaque at the first step
 * to 1/(n + 1) opacity at the last (a fully transparent step would be painted for nothing).
 */
export function stepColor(
	i: number,
	n: number,
	{ from, to, space, fade }: Pick<LongShadowOptions, 'from' | 'to' | 'space' | 'fade'>
): string {
	const t = n <= 1 ? 0 : (i - 1) / (n - 1);
	const pct = round(t * 100);
	const ramp =
		pct === 0 ? from : pct === 100 ? to : `color-mix(in ${space}, ${from}, ${to} ${pct}%)`;
	if (!fade || i === 1) return ramp;
	const clear = round(((i - 1) / n) * 100);
	return `color-mix(in ${space}, ${ramp}, transparent ${clear}%)`;
}

/**
 * The `text-shadow` layers: `steps` hard-edged (unblurred) copies of the text, evenly spaced along
 * `angle` up to `length` em, plus an optional soft ambient shadow. Listed front to back, which is
 * also the paint order: the first shadow is on top.
 */
export function longShadowLayers(o: LongShadowOptions): string[] {
	const n = Math.max(1, Math.min(MAX_STEPS, Math.round(o.steps)));
	const layers = Array.from({ length: n }, (_, k) => {
		const i = k + 1;
		const [x, y] = offsetAt(o.angle, (o.length * i) / n);
		return `${x}em ${y}em 0 ${stepColor(i, n, o)}`;
	});
	if (o.ambient) {
		const [x, y] = offsetAt(o.angle, o.length * 1.15);
		layers.push(
			`${x}em ${y}em ${round(o.length * 0.8)}em color-mix(in srgb, #000 45%, transparent)`
		);
	}
	return layers;
}

/** Length of one step in CSS pixels at `fontSize` px: above ~1.5 the copies start to separate. */
export function stepPixels(
	{ length, steps }: Pick<LongShadowOptions, 'length' | 'steps'>,
	fontSize: number
): number {
	return round((length * fontSize) / Math.max(1, steps));
}
