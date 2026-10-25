import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const profiles = ['circle', 'squircle', 'linear'] as const;

export type Profile = (typeof profiles)[number];

export const liquidGlassSchema = defineSchema({
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 48,
		min: 0,
		max: 160,
		step: 1,
		unit: 'px',
		group: 'Shape',
		description: 'Clamped to half the shorter side, so the maximum gives a pill or a circle.'
	},
	bezel: {
		kind: 'range',
		label: 'Bezel width',
		default: 36,
		min: 1,
		max: 120,
		step: 1,
		unit: 'px',
		group: 'Shape',
		description:
			'How far the curved edge reaches inwards. Inside the bezel the glass is flat and does not refract.'
	},
	profile: {
		kind: 'select',
		label: 'Curvature',
		default: 'squircle',
		options: profiles,
		group: 'Shape',
		description:
			'Cross-section of the bezel. circle: a quarter circle, steep at the very edge. squircle: flatter for longer, then steep. linear: a chamfer that shifts the whole bezel by the same amount.'
	},
	refraction: {
		kind: 'range',
		label: 'Refraction',
		default: 40,
		min: 0,
		max: 150,
		step: 1,
		unit: 'px',
		group: 'Optics',
		description: 'Largest displacement, reached where the bezel is steepest.'
	},
	fringe: {
		kind: 'range',
		label: 'Chromatic fringe',
		default: 0.15,
		min: 0,
		max: 0.6,
		step: 0.01,
		group: 'Optics',
		description:
			'Refracts red a bit more and blue a bit less, which splits colors along the bezel. Real glass (dispersion) bends blue most; reversed here so the warm fringe sits on the outside.'
	},
	blur: {
		kind: 'range',
		label: 'Blur',
		default: 0.5,
		min: 0,
		max: 16,
		step: 0.5,
		unit: 'px',
		group: 'Optics'
	},
	saturate: {
		kind: 'range',
		label: 'Saturate',
		default: 1.4,
		min: 0,
		max: 3,
		step: 0.05,
		group: 'Optics'
	},
	specular: {
		kind: 'range',
		label: 'Highlight',
		default: 0.6,
		min: 0,
		max: 1.5,
		step: 0.01,
		group: 'Highlight',
		description: 'Strength of the light reflected off the bezel (feSpecularLighting).'
	},
	lightAngle: {
		kind: 'range',
		label: 'Light angle',
		default: 225,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Highlight',
		description:
			'Where the light comes from, as an SVG azimuth: 0° is the right, 90° below, 180° left, 270° above.'
	},
	tint: { kind: 'color', label: 'Tint', default: '#ffffff', group: 'Surface' },
	tintOpacity: {
		kind: 'range',
		label: 'Tint opacity',
		default: 0.06,
		min: 0,
		max: 0.8,
		step: 0.01,
		group: 'Surface'
	},
	shadow: {
		kind: 'range',
		label: 'Drop shadow',
		default: 0.35,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Surface'
	}
});

export type LiquidGlassOptions = Values<typeof liquidGlassSchema>;

export const liquidGlassDefaults: LiquidGlassOptions = defaultsOf(liquidGlassSchema);

/** Refractive index of window glass. */
export const GLASS_IOR = 1.5;

/** Elevation of the light above the surface, in degrees (fixed; see the explainer). */
export const LIGHT_ELEVATION = 30;

export interface SdfSample {
	/** Signed distance to the outline in px: negative inside, positive outside. */
	distance: number;
	/** Unit gradient of the distance, i.e. the outward-pointing normal of the nearest edge. */
	nx: number;
	ny: number;
}

/**
 * Signed distance from point (x, y) to a `width` × `height` rounded rectangle with its top-left
 * corner at the origin (Inigo Quilez's box SDF, plus its analytic gradient).
 */
export function roundedRectSdf(
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
): SdfSample {
	const hw = width / 2;
	const hh = height / 2;
	const r = Math.max(0, Math.min(radius, hw, hh));
	const px = x - hw;
	const py = y - hh;
	const sx = px < 0 ? -1 : 1;
	const sy = py < 0 ? -1 : 1;
	// Distance from the inner rectangle, whose corners are the centers of the corner arcs.
	const qx = Math.abs(px) - (hw - r);
	const qy = Math.abs(py) - (hh - r);

	if (qx > 0 && qy > 0) {
		// Corner region: distance to the arc.
		const len = Math.hypot(qx, qy);
		return { distance: len - r, nx: (sx * qx) / len, ny: (sy * qy) / len };
	}
	// Along a straight side: whichever side is closer.
	if (qx > qy) return { distance: qx - r, nx: sx, ny: 0 };
	return { distance: qy - r, nx: 0, ny: sy };
}

/**
 * Bezel cross-section: height (0 at the outer edge, 1 where the flat top starts) and its slope,
 * for `u` from 0 (outer edge) to 1 (inner end of the bezel). Both in bezel-width units, so a
 * slope of 1 is 45°.
 */
export function profileAt(profile: Profile, u: number): { height: number; slope: number } {
	const v = 1 - Math.min(1, Math.max(0, u));
	switch (profile) {
		case 'circle': {
			const h = Math.sqrt(1 - v * v);
			return { height: h, slope: h === 0 ? Infinity : v / h };
		}
		case 'squircle': {
			const inner = 1 - v ** 4;
			return { height: inner ** 0.25, slope: inner === 0 ? Infinity : v ** 3 * inner ** -0.75 };
		}
		case 'linear':
			return { height: 1 - v, slope: 1 };
	}
}

/**
 * How far a vertical ray is bent sideways by a surface with this slope (Snell's law): the
 * tangent of the angle between incoming and refracted ray. Grows with the slope and stays finite
 * even for a vertical wall (slope ∞).
 */
export function refractionOffset(slope: number, ior = GLASS_IOR): number {
	const incidence = Math.atan(slope);
	const refracted = Math.asin(Math.sin(incidence) / ior);
	return Math.tan(incidence - refracted);
}

export interface MapOptions {
	width: number;
	height: number;
	radius: number;
	bezel: number;
	profile: Profile;
}

/**
 * Displacement map for `feDisplacementMap`, as RGBA bytes (row-major, `width` × `height`).
 *
 * - R, G: x and y of the displacement, 128 = none. Inside the bezel they point inwards (against
 *   the SDF gradient), scaled so the steepest point of the profile reaches 0/255.
 * - B: surface height (0 at the edge, 255 on the flat top), used for the specular highlight.
 * - A: always 255. feDisplacementMap reads un-premultiplied colors, but an opaque map sidesteps
 *   any differences between engines.
 */
export function displacementMap({
	width,
	height,
	radius,
	bezel,
	profile
}: MapOptions): Uint8ClampedArray<ArrayBuffer> {
	const w = Math.max(1, Math.round(width));
	const h = Math.max(1, Math.round(height));
	const data = new Uint8ClampedArray(w * h * 4);
	const b = Math.max(1, Math.min(bezel, w / 2, h / 2));
	// Normalize so the strongest bend maps to ±1; the filter's `scale` turns that into px.
	const max = refractionOffset(profileAt(profile, 0).slope);

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const { distance, nx, ny } = roundedRectSdf(x + 0.5, y + 0.5, w, h, radius);
			const inset = -distance;
			let dx = 0;
			let dy = 0;
			let z = 0;
			if (inset >= b) {
				z = 1;
			} else if (inset > 0) {
				const p = profileAt(profile, inset / b);
				const amount = refractionOffset(p.slope) / max;
				dx = -nx * amount;
				dy = -ny * amount;
				z = p.height;
			}
			data[i] = 128 + dx * 127;
			data[i + 1] = 128 + dy * 127;
			data[i + 2] = z * 255;
			data[i + 3] = 255;
		}
	}
	return data;
}

/**
 * `feDisplacementMap` moves by `scale × (channel − 0.5)`. The map's extremes are 1/255 and
 * 255/255, so ±0.498; doubling the wanted px gives the right scale.
 */
export function displacementScale(refraction: number): number {
	return refraction * 2;
}

/** Per-channel scales for the chromatic fringe: red bends most, blue least. */
export function fringeScales(
	refraction: number,
	fringe: number
): { r: number; g: number; b: number } {
	const s = displacementScale(refraction);
	return { r: s * (1 + fringe), g: s, b: s * (1 - fringe) };
}

/**
 * `surfaceScale` for feSpecularLighting: turns the 0–1 height in the map back into px, so the
 * lit slopes match the bezel's real steepness (height = bezel width).
 */
export function specularSurfaceScale(bezel: number): number {
	return Math.max(1, bezel);
}
