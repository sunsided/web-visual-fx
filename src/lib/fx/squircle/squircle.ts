import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const cornerShapes = [
	'round',
	'squircle',
	'superellipse',
	'bevel',
	'scoop',
	'notch',
	'square'
] as const;

export type CornerShape = (typeof cornerShapes)[number];

export const renderers = ['auto', 'corner-shape', 'clip-path'] as const;
export type Renderer = (typeof renderers)[number];

export const easings = ['spring', 'emphasized', 'ease-in-out', 'linear'] as const;
export type Easing = (typeof easings)[number];

/** Morph timing, shared by every squircle component. */
export const morphSchema = defineSchema({
	duration: {
		kind: 'range',
		label: 'Morph duration',
		default: 600,
		min: 0,
		max: 1500,
		step: 10,
		unit: 'ms',
		group: 'Motion',
		description: 'Always instant when the user prefers reduced motion.'
	},
	easing: {
		kind: 'select',
		label: 'Easing',
		default: 'spring',
		options: easings,
		group: 'Motion',
		description:
			'spring: a damped spring sampled into a linear() easing. emphasized: Material 3’s cubic-bezier(0.2, 0, 0, 1).'
	},
	bounce: {
		kind: 'range',
		label: 'Spring bounce',
		default: 0.4,
		min: 0,
		max: 0.6,
		step: 0.05,
		group: 'Motion',
		description: 'Only for the spring easing. 0 settles without overshoot.'
	}
});

const k = {
	kind: 'range',
	label: 'Superellipse k',
	default: 3,
	min: -4,
	max: 6,
	step: 0.1,
	description:
		'Used when the shape is "superellipse". superellipse(k) is the curve |x|ⁿ + |y|ⁿ = 1 with n = 2^k: 1 = round, 2 = squircle, 0 = straight bevel, negative values are concave.'
} as const;

export const squircleSchema = defineSchema({
	shape: {
		kind: 'select',
		label: 'Corner shape',
		default: 'squircle',
		options: cornerShapes,
		group: 'Shape'
	},
	k: { ...k, group: 'Shape' },
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 64,
		min: 0,
		max: 120,
		step: 1,
		unit: 'px',
		group: 'Shape'
	},
	renderer: {
		kind: 'select',
		label: 'Renderer',
		default: 'auto',
		options: renderers,
		group: 'Shape',
		description:
			'auto uses corner-shape where supported and a generated clip-path elsewhere. Pick clip-path to compare the fallback.'
	},
	...morphSchema
});

export const buttonGroupSchema = defineSchema({
	activeShape: {
		kind: 'select',
		label: 'Active corner shape',
		default: 'squircle',
		options: cornerShapes,
		group: 'Button group',
		description: 'Shape of a hovered, focused, pressed or selected button. Others stay pills.'
	},
	activeK: { ...k, label: 'Active superellipse k', group: 'Button group' },
	activeRadius: {
		kind: 'range',
		label: 'Active corner radius',
		default: 14,
		min: 0,
		max: 28,
		step: 1,
		unit: 'px',
		group: 'Button group',
		description: 'The resting radius is half the button height: a pill.'
	},
	expand: {
		kind: 'range',
		label: 'Expand',
		default: 0.5,
		min: 0,
		max: 2,
		step: 0.05,
		group: 'Button group',
		description: 'Extra flex-grow of the active button; pressing adds half as much again.'
	},
	gap: {
		kind: 'range',
		label: 'Gap',
		default: 4,
		min: 0,
		max: 16,
		step: 1,
		unit: 'px',
		group: 'Button group'
	},
	multiple: {
		kind: 'toggle',
		label: 'Multi-select',
		default: false,
		group: 'Button group'
	},
	...morphSchema
});

export type MorphOptions = Values<typeof morphSchema>;
export type SquircleOptions = Values<typeof squircleSchema>;
export type ButtonGroupOptions = Values<typeof buttonGroupSchema>;

export const squircleDefaults: SquircleOptions = defaultsOf(squircleSchema);
export const buttonGroupDefaults: ButtonGroupOptions = defaultsOf(buttonGroupSchema);

/** The `superellipse()` parameter each keyword stands for (CSS Borders 4). */
export const keywordK: Record<Exclude<CornerShape, 'superellipse'>, number> = {
	square: Infinity,
	squircle: 2,
	round: 1,
	bevel: 0,
	scoop: -1,
	notch: -Infinity
};

export function cornerShapeK(shape: CornerShape, k: number): number {
	return shape === 'superellipse' ? k : keywordK[shape];
}

/** Value for the CSS `corner-shape` property. */
export function cornerShapeCss(shape: CornerShape, k: number): string {
	return shape === 'superellipse' ? `superellipse(${round(k, 2)})` : shape;
}

/**
 * Where the curve crosses the corner's diagonal, as a fraction from 0 (notch) through 0.5
 * (bevel) to 1 (square). Chromium interpolates `corner-shape` linearly in this space, which
 * is why the midpoint between round (1) and squircle (2) is 1.436, not 1.5.
 */
export function diagonalPosition(k: number): number {
	if (k === Infinity) return 1;
	if (k === -Infinity) return 0;
	const convex = 0.5 ** (1 / 2 ** Math.abs(k));
	return k >= 0 ? convex : 1 - convex;
}

export function fromDiagonalPosition(x: number): number {
	if (x >= 1) return Infinity;
	if (x <= 0) return -Infinity;
	return x >= 0.5 ? -Math.log2(-Math.log2(x)) : Math.log2(-Math.log2(1 - x));
}

/** The `superellipse()` parameter a transition shows at `progress` (0..1), as in Chromium. */
export function interpolateK(from: number, to: number, progress: number): number {
	const a = diagonalPosition(from);
	const b = diagonalPosition(to);
	return fromDiagonalPosition(a + (b - a) * progress);
}

/** Beyond this, a superellipse is indistinguishable from a square (or notch) corner. */
const K_LIMIT = 10;

/**
 * One corner of radius `r` as points, for the top-left corner: from (0, r) on the left edge to
 * (r, 0) on the top edge.
 *
 * For k ≥ 0 this is a quarter of the superellipse |x/r|ⁿ + |y/r|ⁿ = 1, n = 2^k, centered at
 * (r, r): x = r − r·cos(t)^(2/n), y = r − r·sin(t)^(2/n). For k < 0 the curve with |k| is
 * mirrored across the chord between the two end points, which makes it concave (scoop, notch).
 * The point count never depends on k, so paths for different shapes interpolate.
 */
export function cornerPoints(r: number, k: number, segments = 24): [number, number][] {
	const kk = Math.max(-K_LIMIT, Math.min(K_LIMIT, k));
	const e = 2 / 2 ** Math.abs(kk);
	return Array.from({ length: segments + 1 }, (_, i) => {
		const t = (i / segments) * (Math.PI / 2);
		const c = Math.cos(t) ** e;
		const s = Math.sin(t) ** e;
		// Exact end points, whatever rounding did to cos(π/2).
		if (i === 0) return [0, r];
		if (i === segments) return [r, 0];
		return kk >= 0 ? [r - r * c, r - r * s] : [r * s, r * c];
	});
}

/**
 * SVG path data (also valid for CSS `clip-path: path()`) for a `w`×`h` box whose four corners
 * have radius `r` and superellipse parameter `k`. Like `border-radius`, the radius is clamped to
 * half the shorter side.
 */
export function superellipsePath(
	w: number,
	h: number,
	r: number,
	k: number,
	segments = 24
): string {
	const rr = Math.max(0, Math.min(r, w / 2, h / 2));
	const tl = cornerPoints(rr, k, segments);
	const points: [number, number][] = [
		...tl,
		...[...tl].reverse().map(([x, y]): [number, number] => [w - x, y]),
		...tl.map(([x, y]): [number, number] => [w - x, h - y]),
		...[...tl].reverse().map(([x, y]): [number, number] => [x, h - y])
	];
	const fmt = ([x, y]: [number, number]) => `${round(x, 2)} ${round(y, 2)}`;
	return `M${fmt(points[0])}${points
		.slice(1)
		.map((p) => `L${fmt(p)}`)
		.join('')}Z`;
}

/** Largest possible distance from 1 at time t of a unit spring (the decay envelope). */
function springEnvelope(zeta: number, omega: number, t: number): number {
	if (zeta >= 1) return (1 + omega * t) * Math.exp(-omega * t);
	return Math.exp(-zeta * omega * t) / Math.sqrt(1 - zeta * zeta);
}

/** Residual oscillation the spring is allowed at the end of the transition. */
export const SPRING_TOLERANCE = 0.002;

/** Natural frequency ω for which the envelope reaches `SPRING_TOLERANCE` at t = 1 (bisection). */
export function springOmega(zeta: number): number {
	let lo = 0;
	let hi = 1000;
	for (let i = 0; i < 60; i++) {
		const mid = (lo + hi) / 2;
		if (springEnvelope(zeta, mid, 1) > SPRING_TOLERANCE) lo = mid;
		else hi = mid;
	}
	return hi;
}

/**
 * A damped spring, sampled into a CSS `linear()` easing. `bounce` 0 is critically damped (no
 * overshoot); higher values reduce the damping ratio ζ = 1 − bounce. The stiffness ω is solved
 * per ζ so the spring is within 0.2% of its target at the end of the transition, so there is no
 * visible jump when the easing snaps to exactly 1.
 */
export function springEasing(bounce: number, samples = 40): string {
	const zeta = Math.min(1, Math.max(0.05, 1 - bounce));
	const omega = springOmega(zeta);
	const position = (t: number) => {
		if (zeta >= 1) return 1 - (1 + omega * t) * Math.exp(-omega * t);
		const wd = omega * Math.sqrt(1 - zeta * zeta);
		return (
			1 -
			Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
		);
	};
	const values = Array.from({ length: samples + 1 }, (_, i) =>
		i === samples ? 1 : round(position(i / samples), 3)
	);
	return `linear(${values.join(', ')})`;
}

export function easingCss(easing: Easing, bounce: number): string {
	switch (easing) {
		case 'spring':
			return springEasing(bounce);
		case 'emphasized':
			return 'cubic-bezier(0.2, 0, 0, 1)';
		default:
			return easing;
	}
}

function round(v: number, digits: number) {
	const f = 10 ** digits;
	return Math.round(v * f) / f;
}
