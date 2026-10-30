import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const kaleidoscopeSchema = defineSchema({
	segments: {
		kind: 'range',
		label: 'Segments',
		default: 8,
		min: 4,
		max: 24,
		step: 2,
		group: 'Mirrors',
		description:
			'Number of wedges around the center. Always even, so mirrored neighbors meet seamlessly all the way round.'
	},
	mirror: {
		kind: 'toggle',
		label: 'Mirror',
		default: true,
		group: 'Mirrors',
		description:
			'Flip every other wedge, like the mirrors of a real kaleidoscope. Off: plain rotated copies, with a visible seam at every edge.'
	},
	rotation: {
		kind: 'range',
		label: 'Rotation',
		default: 0,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Mirrors',
		description: 'Turns the whole pattern.'
	},
	zoom: {
		kind: 'range',
		label: 'Zoom',
		default: 1.5,
		min: 1,
		max: 4,
		step: 0.05,
		group: 'Source',
		description: 'Scale of the source inside each wedge; higher shows less of it, bigger.'
	},
	spin: {
		kind: 'toggle',
		label: 'Spin',
		default: true,
		group: 'Motion',
		description:
			'Slowly turns the source inside the wedges, like turning the tube. Off under reduced motion.'
	},
	duration: {
		kind: 'range',
		label: 'Turn duration',
		default: 60,
		min: 10,
		max: 180,
		step: 5,
		unit: 's',
		group: 'Motion',
		when: 'spin',
		description: 'Seconds per full turn of the source.'
	},
	interactive: {
		kind: 'toggle',
		label: 'Follow pointer',
		default: true,
		group: 'Motion',
		description: 'Moving the pointer pans the source under the mirrors. Off under reduced motion.'
	},
	pan: {
		kind: 'range',
		label: 'Pan range',
		default: 0.5,
		min: 0,
		max: 1,
		step: 0.05,
		group: 'Motion',
		when: 'interactive',
		description: 'How far the pointer moves the source, as a share of the largest safe offset.'
	},
	lag: {
		kind: 'range',
		label: 'Pointer lag',
		default: 600,
		min: 0,
		max: 2000,
		step: 50,
		unit: 'ms',
		group: 'Motion',
		when: 'interactive',
		description: 'Transition on the pan, so the pattern glides after the pointer.'
	}
});

export type KaleidoscopeOptions = Values<typeof kaleidoscopeSchema>;

export const kaleidoscopeDefaults: KaleidoscopeOptions = defaultsOf(kaleidoscopeSchema);

/** Overlap added to each side of a wedge so antialiased edges don't leave hairline seams. */
export const SEAM_OVERLAP_DEG = 0.25;

/**
 * Near the center an angular overlap is thinner than a pixel and the seams still show, so the
 * apex also moves this many CSS pixels past the center (downwards, away from the wedge).
 */
export const SEAM_APEX_PX = 2;

/** A whole, even segment count in the supported range. */
export function segmentCount(segments: number): number {
	const n = Math.round(Math.min(24, Math.max(4, segments)) / 2) * 2;
	return n;
}

/** Angle of one wedge in degrees. */
export function wedgeAngle(segments: number): number {
	return 360 / segmentCount(segments);
}

/**
 * The wedge as `clip-path: polygon()` points, in percent of a square layer centered on the
 * kaleidoscope. The apex is the center (50% 50%); the wedge opens upwards, symmetric about the
 * vertical axis, and its base lies on the layer's top edge. The top edge is tangent to the
 * layer's inscribed circle, so the wedge covers the whole sector of that circle; points on the
 * edge sit at `50% ± 50% · tan(half)`. This is exactly what the CSS computes with `tan()`.
 */
export function wedgePoints(segments: number, overlapDeg = SEAM_OVERLAP_DEG): [number, number][] {
	const half = ((wedgeAngle(segments) / 2 + overlapDeg) * Math.PI) / 180;
	const dx = 50 * Math.tan(half);
	return [
		[50, 50],
		[+(50 - dx).toFixed(4), 0],
		[+(50 + dx).toFixed(4), 0]
	];
}

/**
 * `polygon(…)` for `wedgePoints`, with the apex pushed `apexPx` past the center as in the
 * component; for code samples and environments without CSS trig.
 */
export function wedgePolygon(
	segments: number,
	overlapDeg = SEAM_OVERLAP_DEG,
	apexPx = SEAM_APEX_PX
): string {
	const [, left, right] = wedgePoints(segments, overlapDeg);
	const apex = apexPx ? `50% calc(50% + ${apexPx}px)` : '50% 50%';
	return `polygon(${apex}, ${left[0]}% 0%, ${right[0]}% 0%)`;
}

/**
 * Transform of copy `i`: rotate by `i` wedges, and with `mirror` flip every odd copy first.
 * Flipping across the vertical axis and then rotating by one wedge angle θ is the same as
 * reflecting across the wedge's edge at θ/2, which is what a mirror there would show.
 */
export function segmentTransform(
	i: number,
	segments: number,
	mirror: boolean
): { rotate: number; flip: 1 | -1 } {
	return { rotate: i * wedgeAngle(segments), flip: mirror && i % 2 === 1 ? -1 : 1 };
}

export type Vec = [number, number];

/**
 * Applies a segment transform to a point given as (x right, y up) around the center, the same
 * order as CSS `rotate` + `scale` on one element: flip first, then rotate. Positive angles turn
 * clockwise on screen, as in CSS.
 */
export function applySegment([x, y]: Vec, t: { rotate: number; flip: 1 | -1 }): Vec {
	const a = (-t.rotate * Math.PI) / 180;
	const fx = x * t.flip;
	return [fx * Math.cos(a) - y * Math.sin(a), fx * Math.sin(a) + y * Math.cos(a)];
}

/**
 * How much bigger than the wedge layer (side L) the source must be: `1 + reach`, where `reach`
 * is the pan range (0 without pointer panning). The visible disc has radius L/2 and the pointer
 * moves the source by up to `reach · L/2`, so the source's inscribed circle needs a radius of
 * `(1 + reach) · L/2`. Then no edge comes into view at any offset and spin angle, and without
 * panning the disc shows the source's full width.
 */
export function sourceScale(reach: number): number {
	return 1 + Math.min(1, Math.max(0, reach));
}

/**
 * Translate of the source for a pointer at (x, y) in 0–1, in percent of the source's own size
 * (what CSS `translate` percentages refer to): at the edges `reach · L/2`, which is
 * `reach / (2 · (1 + reach))` of a source that is `(1 + reach) · L` wide; at reach 1 that is
 * 25 %. The limit is a distance, not a per-axis bound: towards a corner both axes share it, or the
 * diagonal offset would be √2 too long and the spinning source's corner could show.
 */
export function panOffset(x: number, y: number, reach: number): { x: number; y: number } {
	const p = Math.min(1, Math.max(0, reach));
	const c = (v: number) => Math.min(1, Math.max(0, v));
	const max = (100 * p) / (2 * (1 + p));
	const dx = (c(x) - 0.5) * 2;
	const dy = (c(y) - 0.5) * 2;
	const k = max / Math.max(1, Math.hypot(dx, dy));
	return { x: +(dx * k).toFixed(3) || 0, y: +(dy * k).toFixed(3) || 0 };
}

/**
 * Built-in source when neither `src` nor `art` is given: colored dots and stripes from CSS
 * gradients. Every layer repeats with its own tile size (percent of the source; the sizes share
 * no small common multiple), so whichever part of the source a wedge shows, it is busy and
 * different: only part of the source is visible at a time.
 */
export const DEFAULT_ART: { image: string; size: string } = (() => {
	const layers: [string, string][] = [
		['repeating-linear-gradient(35deg, oklch(100% 0 0 / 0.1) 0 3px, transparent 3px 14px)', 'auto'],
		['radial-gradient(circle at 30% 35%, oklch(88% 0.17 95) 0 18%, transparent 19%)', '7% 8%'],
		['radial-gradient(circle at 60% 55%, oklch(70% 0.24 350) 0 22%, transparent 23%)', '11% 9%'],
		['radial-gradient(circle at 45% 70%, oklch(74% 0.16 205) 0 26%, transparent 27%)', '13% 15%'],
		['radial-gradient(circle at 70% 25%, oklch(80% 0.18 145) 0 12%, transparent 13%)', '5% 6%'],
		[
			'linear-gradient(120deg, transparent 40%, oklch(78% 0.15 60 / 0.8) 40% 46%, transparent 46%)',
			'17% 13%'
		],
		[
			'conic-gradient(from 20deg, oklch(30% 0.12 290), oklch(42% 0.17 255), oklch(38% 0.16 320), oklch(30% 0.12 290))',
			'auto'
		]
	];
	return {
		image: layers.map(([image]) => image).join(', '),
		size: layers.map(([, size]) => size).join(', ')
	};
})();
