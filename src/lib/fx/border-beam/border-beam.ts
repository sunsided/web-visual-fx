import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const beamDirections = ['clockwise', 'counterclockwise'] as const;
export type BeamDirection = (typeof beamDirections)[number];

export const borderBeamSchema = defineSchema({
	length: {
		kind: 'range',
		label: 'Beam length',
		default: 90,
		min: 10,
		max: 180,
		step: 5,
		unit: '°',
		group: 'Beam',
		description:
			'Arc of the conic gradient the beam covers. It is an angle around the center, so on a non-square box the beam stretches near the corners and shrinks in the middle of the long sides.'
	},
	beams: {
		kind: 'range',
		label: 'Beams',
		default: 1,
		min: 1,
		max: 4,
		step: 1,
		group: 'Beam',
		description:
			'Number of beams, spread evenly around the border (a repeating-conic-gradient). Longer beams are cut to fit.'
	},
	color: {
		kind: 'color',
		label: 'Head color',
		default: '#67e8f9',
		group: 'Beam',
		description: 'Color at the bright leading end of the beam.'
	},
	colorB: {
		kind: 'color',
		label: 'Tail color',
		default: '#a855f7',
		group: 'Beam',
		description: 'Color the tail fades through before it disappears.'
	},
	width: {
		kind: 'range',
		label: 'Border width',
		default: 2,
		min: 1,
		max: 8,
		step: 0.5,
		unit: 'px',
		group: 'Border'
	},
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 18,
		min: 0,
		max: 48,
		step: 1,
		unit: 'px',
		group: 'Border'
	},
	track: {
		kind: 'range',
		label: 'Track',
		default: 0.12,
		min: 0,
		max: 0.5,
		step: 0.01,
		group: 'Border',
		description:
			'Opacity of the plain border the beam travels on, mixed from the text color so it works on light and dark faces.'
	},
	glow: {
		kind: 'range',
		label: 'Glow',
		default: 12,
		min: 0,
		max: 32,
		step: 1,
		unit: 'px',
		group: 'Glow',
		description:
			'Blur radius of a second, blurred copy of the beam. 0 removes the copy (and its filter) entirely.'
	},
	glowOpacity: {
		kind: 'range',
		label: 'Glow opacity',
		default: 0.7,
		min: 0,
		max: 1,
		step: 0.05,
		group: 'Glow'
	},
	duration: {
		kind: 'range',
		label: 'Lap time',
		default: 5,
		min: 1,
		max: 20,
		step: 0.5,
		unit: 's',
		group: 'Motion',
		description: 'Seconds per full turn. With several beams, each one passes a point more often.'
	},
	direction: {
		kind: 'select',
		label: 'Direction',
		default: 'clockwise',
		options: beamDirections,
		group: 'Motion'
	},
	animate: {
		kind: 'toggle',
		label: 'Animate',
		default: true,
		group: 'Motion',
		description:
			'Off, or under reduced motion, the border shows a still gradient ring instead of a parked beam.'
	}
});

export type BorderBeamOptions = Values<typeof borderBeamSchema>;

export const borderBeamDefaults: BorderBeamOptions = defaultsOf(borderBeamSchema);

/** Degrees between two beams. */
export function beamPeriod(beams: number): number {
	return 360 / Math.max(1, Math.round(beams));
}

/** Beam length in degrees, capped so neighbouring beams don't overlap (one degree apart). */
export function beamArc(length: number, beams: number): number {
	const period = beamPeriod(beams);
	return Math.max(1, Math.min(length, period - 1));
}

function deg(v: number): string {
	return `${+v.toFixed(2)}deg`;
}

/**
 * Color stops of one beam period, without the `from` angle. The tail starts transparent, fades
 * through the tail color into the head color, and the head ends with a short fade (a hard edge
 * aliases on a thin ring). Clockwise beams have their head at the end of the period, so it leads
 * as the angle grows; counterclockwise beams are mirrored.
 */
export function beamStops({
	length,
	beams,
	color,
	colorB,
	direction
}: Pick<BorderBeamOptions, 'length' | 'beams' | 'color' | 'colorB' | 'direction'>): string {
	const p = beamPeriod(beams);
	const arc = beamArc(length, beams);
	const head = Math.min(3, arc * 0.1);
	if (direction === 'counterclockwise') {
		return [
			`transparent 0deg`,
			`${color} ${deg(head)}`,
			`${colorB} ${deg(arc * 0.55)}`,
			`transparent ${deg(arc)}`,
			`transparent ${deg(p)}`
		].join(', ');
	}
	return [
		`transparent 0deg ${deg(p - arc)}`,
		`${colorB} ${deg(p - arc * 0.55)}`,
		`${color} ${deg(p - head)}`,
		`transparent ${deg(p)}`
	].join(', ');
}

/**
 * The beam as a CSS image. `angle` is the rotating start angle, normally a registered custom
 * property. One beam is a plain `conic-gradient`; several repeat every `360 / beams` degrees.
 */
export function beamGradient(
	options: Pick<BorderBeamOptions, 'length' | 'beams' | 'color' | 'colorB' | 'direction'>,
	angle = 'var(--border-beam-angle)'
): string {
	const fn = Math.round(options.beams) > 1 ? 'repeating-conic-gradient' : 'conic-gradient';
	return `${fn}(from ${angle}, ${beamStops(options)})`;
}

/**
 * Still ring for reduced motion and for browsers without `@property`: both colors once around,
 * so the border reads as deliberate rather than as a beam that got stuck.
 */
export function staticRing({ color, colorB }: Pick<BorderBeamOptions, 'color' | 'colorB'>): string {
	return `conic-gradient(${color}, ${colorB}, ${color})`;
}

/**
 * How often (per second) the head of some beam passes a fixed point on the border. Useful for
 * judging flicker: a bright, short beam passing faster than ~3 times a second reads as flashing.
 */
export function passesPerSecond({
	beams,
	duration
}: Pick<BorderBeamOptions, 'beams' | 'duration'>): number {
	return Math.max(1, Math.round(beams)) / Math.max(0.001, duration);
}
