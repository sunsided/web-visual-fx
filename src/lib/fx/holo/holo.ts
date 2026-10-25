import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

export const foilPatterns = ['stripes', 'crosshatch', 'sunburst', 'rainbow'] as const;
export type FoilPattern = (typeof foilPatterns)[number];

export const foilBlendModes = [
	'color-dodge',
	'overlay',
	'soft-light',
	'screen',
	'hard-light'
] as const;

export const holoSchema = defineSchema({
	maxTilt: {
		kind: 'range',
		label: 'Max tilt',
		default: 14,
		min: 0,
		max: 30,
		step: 1,
		unit: '°',
		group: 'Tilt',
		description: 'Rotation when the pointer is at an edge of the card. Zero keeps it flat.'
	},
	perspective: {
		kind: 'range',
		label: 'Perspective',
		default: 900,
		min: 300,
		max: 2000,
		step: 10,
		unit: 'px',
		group: 'Tilt',
		description: 'Distance of the viewer from the card. Small values exaggerate the 3D effect.'
	},
	smoothing: {
		kind: 'range',
		label: 'Smoothing',
		default: 0.85,
		min: 0,
		max: 0.97,
		step: 0.01,
		group: 'Tilt',
		description:
			'How much of the previous position the card keeps each frame (at 60 fps). 0 follows the pointer instantly; high values feel heavy.'
	},
	foilIntensity: {
		kind: 'range',
		label: 'Intensity',
		default: 0.75,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Foil'
	},
	pattern: {
		kind: 'select',
		label: 'Pattern',
		default: 'stripes',
		options: foilPatterns,
		group: 'Foil',
		description:
			'The embossed relief the rainbow is blended with. Rainbow has no relief, sunburst radiates from the pointer.'
	},
	stripeWidth: {
		kind: 'range',
		label: 'Stripe width',
		default: 10,
		min: 2,
		max: 40,
		step: 1,
		unit: 'px',
		group: 'Foil',
		description: 'Width of one band of the relief. For sunburst, each px is half a degree.'
	},
	hueSpread: {
		kind: 'range',
		label: 'Hue spread',
		default: 360,
		min: 30,
		max: 720,
		step: 10,
		unit: '°',
		group: 'Foil',
		description: 'How much of the color wheel the rainbow covers. 720 runs through it twice.'
	},
	blendMode: {
		kind: 'select',
		label: 'Blend mode',
		default: 'color-dodge',
		options: foilBlendModes,
		group: 'Foil',
		description: 'How the foil mixes with the card below it.'
	},
	sparkle: {
		kind: 'range',
		label: 'Sparkle',
		default: 0.3,
		min: 0,
		max: 0.8,
		step: 0.01,
		group: 'Foil',
		description: 'Opacity of a fine, static noise texture inside the foil.'
	},
	artOnly: {
		kind: 'toggle',
		label: 'Foil on art only',
		default: false,
		group: 'Foil',
		description: 'Restrict the foil to the illustration instead of the whole card.'
	},
	glare: {
		kind: 'range',
		label: 'Glare',
		default: 0.55,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Glare',
		description: 'Strength of the soft highlight that sits under the pointer.'
	},
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 18,
		min: 0,
		max: 40,
		step: 1,
		unit: 'px',
		group: 'Card'
	},
	idle: {
		kind: 'toggle',
		label: 'Idle sweep',
		default: true,
		group: 'Motion',
		description:
			'Slowly sways the card while nobody points at it. Pausable, and off when the user prefers reduced motion.'
	}
});

export type HoloOptions = Values<typeof holoSchema>;

export const holoDefaults: HoloOptions = defaultsOf(holoSchema);

/** A point on the card, 0–1 on both axes (0, 0 = top left). */
export interface Point {
	x: number;
	y: number;
}

/** Card state that the animation loop smooths and writes to CSS custom properties. */
export interface Pose extends Point {
	/** 0 = at rest, 1 = fully engaged (pointer or keyboard on the card). */
	active: number;
}

export const REST: Pose = { x: 0.5, y: 0.5, active: 0 };

/**
 * Shown under `prefers-reduced-motion`: no tilt (the CSS sets the angle to zero) and no motion,
 * but the foil sits at an angle where its colors and the glare are clearly visible.
 */
export const STATIC_POSE: Pose = { x: 0.3, y: 0.22, active: 0.7 };

/** How engaged the card looks while the idle sweep runs. */
export const IDLE_ACTIVE = 0.45;

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Pointer position relative to an element's box, clamped to 0–1. */
export function pointerToUnit(
	clientX: number,
	clientY: number,
	rect: { left: number; top: number; width: number; height: number }
): Point {
	return {
		x: clamp(rect.width ? (clientX - rect.left) / rect.width : 0.5),
		y: clamp(rect.height ? (clientY - rect.top) / rect.height : 0.5)
	};
}

/**
 * Frame-rate independent exponential smoothing. `smoothing` is the share of the old value kept
 * per 60 fps frame; on a 120 Hz screen the same setting keeps √smoothing per (half as long) frame,
 * so the card moves at the same speed everywhere.
 */
export function lerpFactor(smoothing: number, dtMs: number): number {
	if (smoothing <= 0) return 1;
	return 1 - Math.pow(clamp(smoothing, 0, 0.999), dtMs / (1000 / 60));
}

/** Moves `current` towards `target` by `t` (0–1); returns a new pose. */
export function stepPose(current: Pose, target: Pose, t: number): Pose {
	return {
		x: current.x + (target.x - current.x) * t,
		y: current.y + (target.y - current.y) * t,
		active: current.active + (target.active - current.active) * t
	};
}

/** True once `a` and `b` are visually indistinguishable, so the loop can stop. */
export function settled(a: Pose, b: Pose, epsilon = 0.0005): boolean {
	return (
		Math.abs(a.x - b.x) < epsilon &&
		Math.abs(a.y - b.y) < epsilon &&
		Math.abs(a.active - b.active) < epsilon
	);
}

/**
 * The idle sweep: a slow Lissajous figure around the center (periods of 9 s and 13 s, so it
 * takes almost two minutes to repeat). Glare and foil drift gently; nothing flashes.
 */
export function idlePoint(timeMs: number): Point {
	const t = timeMs / 1000;
	return {
		x: 0.5 + 0.32 * Math.sin((2 * Math.PI * t) / 9),
		y: 0.5 + 0.22 * Math.sin((2 * Math.PI * t) / 13 + 1)
	};
}

/** Keyboard step for arrow keys; Shift moves to the edge right away. */
export const KEY_STEP = 0.1;

/** Applies an arrow key to a point. Returns `undefined` for keys that aren't handled. */
export function nudge(point: Point, key: string, big = false): Point | undefined {
	const s = big ? 1 : KEY_STEP;
	switch (key) {
		case 'ArrowLeft':
			return { ...point, x: clamp(point.x - s) };
		case 'ArrowRight':
			return { ...point, x: clamp(point.x + s) };
		case 'ArrowUp':
			return { ...point, y: clamp(point.y - s) };
		case 'ArrowDown':
			return { ...point, y: clamp(point.y + s) };
		case 'Home':
		case 'Escape':
			return { x: 0.5, y: 0.5 };
		default:
			return undefined;
	}
}

/** Card rotation in degrees for a point: the side under the pointer tips away from the viewer. */
export function tiltFor({ x, y }: Point, maxTilt: number): { rotateX: number; rotateY: number } {
	return {
		rotateX: +((0.5 - y) * 2 * maxTilt).toFixed(3),
		rotateY: +((x - 0.5) * 2 * maxTilt).toFixed(3)
	};
}

/**
 * Rainbow stops covering `hueSpread` degrees of the OKLCH hue wheel, starting at `hueStart`.
 * One stop every 45°, so wide spreads stay smooth.
 */
export function rainbowStops(hueSpread: number, hueStart = 0): string[] {
	const count = Math.max(2, Math.ceil(hueSpread / 45) + 1);
	return Array.from({ length: count }, (_, i) => {
		const hue = Math.round(hueStart + (hueSpread * i) / (count - 1)) % 360;
		return `oklch(78% 0.16 ${hue})`;
	});
}

/** Angle of the rainbow bands and the linear relief. */
export const FOIL_ANGLE = 115;

/**
 * The relief layers for a pattern: greyscale bands that the rainbow is blended with, like the
 * embossed lines of real holographic foil. `sunburst` is centered on the (smoothed) pointer.
 */
export function reliefLayers(pattern: FoilPattern, stripeWidth: number): string[] {
	const w = stripeWidth;
	const band = (angle: number) =>
		`repeating-linear-gradient(${angle}deg, #0d0d0d 0px, #8a8a8a ${w / 2}px, #0d0d0d ${w}px)`;
	switch (pattern) {
		case 'stripes':
			return [band(FOIL_ANGLE - 90)];
		case 'crosshatch':
			return [band(45), band(-45)];
		case 'sunburst': {
			const deg = w / 2;
			return [
				`repeating-conic-gradient(from 0deg at var(--foil-x) var(--foil-y), #0d0d0d 0deg, #8a8a8a ${deg / 2}deg, #0d0d0d ${deg}deg)`
			];
		}
		case 'rainbow':
			return [];
	}
}

/**
 * Full foil `background` declarations. The rainbow is three times the card's size and slides
 * with the pointer (`--foil-x`/`--foil-y`); the relief stays put, like the embossing on a card.
 */
export function foilBackground(
	pattern: FoilPattern,
	stripeWidth: number,
	hueSpread: number
): { image: string; size: string; position: string; blend: string } {
	const relief = reliefLayers(pattern, stripeWidth);
	const rainbow = `linear-gradient(${FOIL_ANGLE}deg, ${rainbowStops(hueSpread).join(', ')})`;
	return {
		image: [...relief, rainbow].join(', '),
		size: [...relief.map(() => 'auto'), '300% 300%'].join(', '),
		position: [...relief.map(() => '0 0'), 'var(--foil-x) var(--foil-y)'].join(', '),
		// Relief layers mix into the rainbow below: dark bands darken it, light bands brighten it.
		blend: [...relief.map(() => 'hard-light'), 'normal'].join(', ')
	};
}
