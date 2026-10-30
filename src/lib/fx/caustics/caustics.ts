import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { CROSS_ANGLE, CROSS_SPEED, flowOffset, type Offset } from '../ripple/ripple.js';

export const causticsSchema = defineSchema({
	lightColor: { kind: 'color', label: 'Light color', default: '#e8fdff', group: 'Light' },
	intensity: {
		kind: 'range',
		label: 'Intensity',
		default: 0.7,
		min: 0,
		max: 1.5,
		step: 0.05,
		group: 'Light',
		description: 'How bright the light net is, screened over the floor.'
	},
	lineWidth: {
		kind: 'range',
		label: 'Line width',
		default: 0.07,
		min: 0.03,
		max: 0.35,
		step: 0.01,
		group: 'Light',
		description:
			'Share of the noise range, counted from its ridges, that lights up. Small values give thin, sharp lines; large ones soft bands.'
	},
	sheen: {
		kind: 'range',
		label: 'Sheen',
		default: 0.6,
		min: 0,
		max: 1.5,
		step: 0.05,
		group: 'Light',
		description:
			'feSpecularLighting on the lines as if they were raised: a glint along one side that makes them look wet.'
	},
	frequency: {
		kind: 'range',
		label: 'Cell frequency',
		default: 0.012,
		min: 0.004,
		max: 0.04,
		step: 0.001,
		group: 'Pattern',
		description:
			'baseFrequency of the ridge noise. Low values give big cells (shallow water seen up close), high values a fine mesh.'
	},
	octaves: {
		kind: 'range',
		label: 'Octaves',
		default: 1,
		min: 1,
		max: 3,
		step: 1,
		group: 'Pattern',
		description:
			'One octave gives the clean net of a pool floor; more break the lines into a busier, choppier pattern.'
	},
	warp: {
		kind: 'range',
		label: 'Warp',
		default: 50,
		min: 0,
		max: 120,
		step: 1,
		unit: 'px',
		group: 'Pattern',
		description:
			'How far a second, moving noise bends the net. This is what makes the lines dance instead of sliding past.'
	},
	seed: { kind: 'range', label: 'Seed', default: 2, min: 0, max: 200, step: 1, group: 'Pattern' },
	tint: { kind: 'color', label: 'Water color', default: '#0a6f86', group: 'Water' },
	tintOpacity: {
		kind: 'range',
		label: 'Water depth',
		default: 0.35,
		min: 0,
		max: 0.9,
		step: 0.01,
		group: 'Water',
		description: 'Opacity of the water color washed over the content before the light is added.'
	},
	wobble: {
		kind: 'range',
		label: 'Wobble',
		default: 5,
		min: 0,
		max: 24,
		step: 1,
		unit: 'px',
		group: 'Water',
		description:
			'Displaces the content with the same moving noise that warps the light, as if seen through the surface. 0 keeps it still.'
	},
	animate: {
		kind: 'toggle',
		label: 'Animate',
		default: true,
		group: 'Motion',
		description:
			'Stops under prefers-reduced-motion, inside a [data-motion="paused"] region, offscreen and in background tabs.'
	},
	speed: {
		kind: 'range',
		label: 'Speed',
		default: 20,
		min: 0,
		max: 80,
		step: 1,
		unit: 'px/s',
		group: 'Motion',
		when: 'animate'
	},
	direction: {
		kind: 'range',
		label: 'Current',
		default: 300,
		min: 0,
		max: 360,
		step: 5,
		unit: '°',
		group: 'Motion',
		when: 'animate',
		description: 'Direction the surface waves travel: 0° is right, 90° down.'
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
			'Each frame reruns two noise tiles, two displacements and a lighting pass. 24–30 fps is plenty for water.'
	},
	tileSize: {
		kind: 'range',
		label: 'Noise tile',
		// 256 still shows the repeat on a wide screen; 384 (with a 528 px warp tile) doesn't.
		default: 384,
		min: 128,
		max: 512,
		step: 32,
		unit: 'px',
		group: 'Performance',
		description:
			'Size of the repeated ridge tile; the warp tile is about 1.4 times larger so the two never line up into a visible grid.'
	}
});

export type CausticsOptions = Values<typeof causticsSchema>;

export const causticsDefaults: CausticsOptions = defaultsOf(causticsSchema);

/**
 * Edge of the warp noise tile for a given ridge tile. Different, non-multiple sizes mean the
 * combined pattern only repeats after their least common multiple, far beyond the element, so the
 * tiling never shows as a grid. 11/8 keeps it on whole px.
 */
export function warpTileSize(tile: number): number {
	return Math.round((tile * 11) / 8);
}

/** The warp noise is smoother than the cells: big, slow bends rather than kinks. */
export const WARP_FREQUENCY_RATIO = 0.75;

/** The cell pattern drifts much slower than the surface waves bending it. */
export const DRIFT_SPEED = 0.3;

/**
 * `tableValues` for `<feFuncA type="table">` that keeps only the ridges of turbulence noise.
 * `type="turbulence"` is a sum of |noise|, so it is near 0 along thin curves where the noise
 * changes sign and larger everywhere else. The table maps input `x` to `(1 − x / width)²` below
 * `width` and 0 above: bright, sharp lines where the noise is near 0, dark cells in between. With
 * `steps` entries the table is linear between them, which is smooth enough for 32.
 */
export function ridgeTable(width: number, steps = 32): string {
	const w = Math.max(1e-3, width);
	return Array.from({ length: steps }, (_, i) => {
		const x = i / (steps - 1);
		const v = Math.max(0, 1 - x / w) ** 2;
		return Math.round(v * 1000) / 1000;
	}).join(' ');
}

export interface CausticsOffsets {
	/** Slow drift of the ridge tile. */
	cells: Offset;
	/** The two crossing wave trains of the warp noise. */
	warp: Offset[];
}

/** Per-frame offsets for the ridge and warp noise at time `t` (seconds). */
export function causticsOffsets(
	t: number,
	{ speed, direction, tileSize }: Pick<CausticsOptions, 'speed' | 'direction' | 'tileSize'>
): CausticsOffsets {
	const warpTile = warpTileSize(tileSize);
	return {
		cells: flowOffset(t, speed * DRIFT_SPEED, direction, tileSize),
		warp: [
			flowOffset(t, speed, direction, warpTile),
			flowOffset(t, speed * CROSS_SPEED, direction + CROSS_ANGLE, warpTile)
		]
	};
}
