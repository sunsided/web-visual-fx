import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const rippleSchema = defineSchema({
	strength: {
		kind: 'range',
		label: 'Strength',
		default: 14,
		min: 0,
		max: 60,
		step: 1,
		unit: 'px',
		group: 'Waves',
		description:
			'feDisplacementMap scale: the largest shift is half of this, in either direction. Small values shimmer, large ones bend.'
	},
	frequency: {
		kind: 'range',
		label: 'Frequency',
		default: 0.012,
		min: 0.002,
		max: 0.06,
		step: 0.001,
		group: 'Waves',
		description:
			'Horizontal baseFrequency of the noise. Low values give long, slow swells; high values a fine shimmer. Snapped so the noise tile repeats seamlessly.'
	},
	stretch: {
		kind: 'range',
		label: 'Stretch (y / x)',
		default: 1,
		min: 0.25,
		max: 6,
		step: 0.25,
		group: 'Waves',
		description:
			'Vertical frequency relative to the horizontal one. Above 1 the waves become thin horizontal bands, the look of hot air.'
	},
	octaves: {
		kind: 'range',
		label: 'Octaves',
		default: 2,
		min: 1,
		max: 4,
		step: 1,
		group: 'Waves',
		description: 'Layers of finer detail on top of the main waves.'
	},
	seed: { kind: 'range', label: 'Seed', default: 3, min: 0, max: 200, step: 1, group: 'Waves' },
	animate: {
		kind: 'toggle',
		label: 'Animate',
		default: true,
		group: 'Motion',
		description:
			'Slides the noise across the element. Stops under prefers-reduced-motion, inside a [data-motion="paused"] region, offscreen and in background tabs.'
	},
	speed: {
		kind: 'range',
		label: 'Speed',
		default: 24,
		min: 0,
		max: 120,
		step: 1,
		unit: 'px/s',
		group: 'Motion',
		when: 'animate'
	},
	direction: {
		kind: 'range',
		label: 'Direction',
		default: 60,
		min: 0,
		max: 360,
		step: 5,
		unit: '°',
		group: 'Motion',
		when: 'animate',
		description: 'Where the waves travel: 0° is right, 90° down, 270° up (rising heat).'
	},
	crossWaves: {
		kind: 'toggle',
		label: 'Cross waves',
		default: true,
		group: 'Motion',
		description:
			'Averages in a second copy of the noise travelling at an angle to the first. The two interfere, so the surface churns instead of sliding past.'
	},
	fps: {
		kind: 'range',
		label: 'Frame rate cap',
		default: 30,
		min: 6,
		max: 60,
		step: 1,
		unit: 'fps',
		group: 'Performance',
		when: 'animate',
		description:
			'Every frame reruns the whole filter. Water moves slowly enough that 24–30 fps looks smooth and halves the cost of 60.'
	},
	tileSize: {
		kind: 'range',
		label: 'Noise tile',
		default: 256,
		min: 64,
		max: 512,
		step: 32,
		unit: 'px',
		group: 'Performance',
		description:
			'The noise is computed on one square tile and repeated (feTile). Bigger tiles hide the repeat and allow lower frequencies but cost more per frame.'
	},
	tint: { kind: 'color', label: 'Tint', default: '#0b5f78', group: 'Tint' },
	tintOpacity: {
		kind: 'range',
		label: 'Tint opacity',
		default: 0,
		min: 0,
		max: 0.8,
		step: 0.01,
		group: 'Tint',
		description: 'A color wash over the result, e.g. blue-green for underwater.'
	},
	backdrop: {
		kind: 'toggle',
		label: 'Backdrop mode',
		default: false,
		group: 'Backdrop',
		description:
			'Warp what is behind the element (backdrop-filter: url()) instead of its own content. Renders only in Chromium-based browsers; elsewhere the backdrop gets a plain blur.'
	},
	fallbackBlur: {
		kind: 'range',
		label: 'Fallback blur',
		default: 3,
		min: 0,
		max: 16,
		step: 0.5,
		unit: 'px',
		group: 'Backdrop',
		when: 'backdrop',
		description:
			'Backdrop blur used where the SVG filter can not run, so the surface still reads as water or haze.'
	}
});

export type RippleOptions = Values<typeof rippleSchema>;

export const rippleDefaults: RippleOptions = defaultsOf(rippleSchema);

export const ripplePresetNames = ['water', 'heat haze', 'underwater'] as const;
export type RipplePresetName = (typeof ripplePresetNames)[number];

/**
 * Starting points for the three looks. Each sets the parameters that define the look and leaves
 * the rest (backdrop mode, frame rate) alone, so they can be applied on top of other settings.
 */
export const ripplePresets: Record<RipplePresetName, Partial<RippleOptions>> = {
	// Round, medium waves from two directions: a pond surface.
	water: {
		strength: 14,
		frequency: 0.012,
		stretch: 1,
		octaves: 2,
		speed: 24,
		direction: 60,
		crossWaves: true,
		tileSize: 256,
		tintOpacity: 0
	},
	// Thin horizontal bands rising straight up, small amplitude, a bit faster.
	'heat haze': {
		strength: 7,
		frequency: 0.008,
		stretch: 5,
		octaves: 2,
		speed: 40,
		direction: 270,
		crossWaves: false,
		tileSize: 256,
		tintOpacity: 0
	},
	// Big slow swells, more detail, blue-green wash.
	underwater: {
		strength: 26,
		frequency: 0.005,
		stretch: 1.25,
		octaves: 3,
		speed: 14,
		direction: 20,
		crossWaves: true,
		tileSize: 384,
		tint: '#0b5f78',
		tintOpacity: 0.3
	}
};

export interface Offset {
	dx: number;
	dy: number;
}

/** Positive remainder: `wrap(-1, 4) === 3`. */
export function wrap(value: number, period: number): number {
	if (period <= 0) return 0;
	const r = value % period;
	return r < 0 ? r + period : r + 0; // + 0 turns -0 into 0
}

/**
 * The frequency `<feTurbulence stitchTiles="stitch">` actually uses on a `tile` px wide subregion
 * (Filter Effects 1, feTurbulence): it is moved to the nearest whole number of periods per tile,
 * nearest by ratio, not by difference. Applying it up front makes every engine agree and lets the
 * page show the real value. Never returns 0: at least one period fits.
 */
export function stitchFrequency(frequency: number, tile: number): number {
	if (frequency <= 0 || tile <= 0) return frequency;
	const periods = frequency * tile;
	const lo = Math.floor(periods) / tile;
	const hi = Math.ceil(periods) / tile;
	if (lo === 0) return hi;
	return frequency / lo < hi / frequency ? lo : hi;
}

/** `baseFrequency` attribute value `"fx fy"` for a square tile, both axes snapped. */
export function tileFrequency(frequency: number, stretch: number, tile: number): string {
	return `${stitchFrequency(frequency, tile)} ${stitchFrequency(frequency * stretch, tile)}`;
}

/**
 * Where a noise layer moving at `speed` px/s towards `angle` degrees has got to after `t` seconds,
 * wrapped into one tile: both offsets are in [0, tile). The filter only ever shifts by less than a
 * tile, which is all it needs because the tile repeats seamlessly.
 */
export function flowOffset(t: number, speed: number, angle: number, tile: number): Offset {
	const rad = (angle * Math.PI) / 180;
	return {
		dx: round(wrap(Math.cos(rad) * speed * t, tile), 2),
		dy: round(wrap(Math.sin(rad) * speed * t, tile), 2)
	};
}

/** Direction and relative speed of the second wave train (`crossWaves`). */
export const CROSS_ANGLE = 125;
export const CROSS_SPEED = 0.8;

/** One or two layer offsets at time `t` (see `flowOffset`, `CROSS_ANGLE`). */
export function rippleOffsets(
	t: number,
	{
		speed,
		direction,
		crossWaves,
		tileSize
	}: Pick<RippleOptions, 'speed' | 'direction' | 'crossWaves' | 'tileSize'>
): Offset[] {
	const a = flowOffset(t, speed, direction, tileSize);
	if (!crossWaves) return [a];
	return [a, flowOffset(t, speed * CROSS_SPEED, direction + CROSS_ANGLE, tileSize)];
}

/**
 * `feComposite operator="arithmetic"` constants that average two noise layers without losing
 * contrast: averaging two independent noises shrinks their spread around ½ by √2, so both are
 * weighted 1/√2 and the result is shifted back to be centred on ½ (`k4 = ½ − 1/√2`).
 */
export const MIX_K = {
	k2: round(Math.SQRT1_2, 4),
	k3: round(Math.SQRT1_2, 4),
	k4: round(0.5 - Math.SQRT1_2, 4)
};

/**
 * Filter region size along one axis. The moving noise is cut out of the repeated tile at
 * [tile, 2·tile), so the region must reach at least 2·tile from the element's origin even when
 * the element is smaller; Chromium clips a primitive subregion to the filter region.
 */
export function regionExtent(size: number, tile: number, pad: number): number {
	return Math.ceil(Math.max(size, 2 * tile)) + 2 * pad;
}

/** Room around the element for content displaced outwards: half the scale, plus antialiasing. */
export function regionPadding(strength: number): number {
	return Math.ceil(Math.max(0, strength) / 2) + 2;
}

/**
 * Frame-rate cap for a `requestAnimationFrame` loop: whether a frame at `now` (ms) should render
 * given the last rendered one. A 1 ms tolerance keeps 30 fps on a 60 Hz display from dropping to
 * 20 when frames arrive a little early.
 */
export function frameDue(last: number, now: number, fps: number): boolean {
	return now - last >= 1000 / Math.max(1, fps) - 1;
}

/**
 * Seconds to add to the animation clock for a frame `elapsedMs` after the previous one. Capped so
 * the waves don't jump after the tab or element was hidden, or after a long pause.
 */
export function clockStep(elapsedMs: number, maxMs = 100): number {
	return Math.min(Math.max(0, elapsedMs), maxMs) / 1000;
}

function round(n: number, digits: number): number {
	const f = 10 ** digits;
	return Math.round(n * f) / f + 0;
}
