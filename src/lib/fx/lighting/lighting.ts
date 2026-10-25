import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

export const lightTypes = ['point', 'spot', 'distant'] as const;
export type LightType = (typeof lightTypes)[number];

export const reliefs = ['texture', 'shape', 'both'] as const;
export type Relief = (typeof reliefs)[number];

export const lightingSchema = defineSchema({
	lightType: {
		kind: 'select',
		label: 'Light type',
		default: 'point',
		options: lightTypes,
		group: 'Light',
		description:
			'point: a bulb at x/y/z. spot: the same bulb with a cone, aimed at the center. distant: parallel rays like sunlight, from the direction of the light position.'
	},
	followPointer: {
		kind: 'toggle',
		label: 'Follow pointer',
		default: true,
		group: 'Light',
		description:
			'Move the light with the pointer while it is over the surface. Without a pointer it rests at the position below.'
	},
	lightX: {
		kind: 'range',
		label: 'Resting x',
		default: 28,
		min: 0,
		max: 100,
		step: 1,
		unit: '%',
		group: 'Light'
	},
	lightY: {
		kind: 'range',
		label: 'Resting y',
		default: 22,
		min: 0,
		max: 100,
		step: 1,
		unit: '%',
		group: 'Light'
	},
	elevation: {
		kind: 'range',
		label: 'Elevation (z)',
		default: 320,
		min: 10,
		max: 600,
		step: 5,
		unit: 'px',
		group: 'Light',
		description:
			'Height of the light above the surface. Low lights rake across the relief and cast long highlights; high lights flatten it.'
	},
	coneAngle: {
		kind: 'range',
		label: 'Spot cone angle',
		default: 40,
		min: 5,
		max: 90,
		step: 1,
		unit: '°',
		group: 'Light',
		description: 'limitingConeAngle of the spot light. Only used by the spot light.'
	},
	lightingColor: { kind: 'color', label: 'Light color', default: '#fff4e0', group: 'Light' },
	showMarker: {
		kind: 'toggle',
		label: 'Show light position',
		default: true,
		group: 'Light'
	},
	relief: {
		kind: 'select',
		label: 'Relief',
		default: 'both',
		options: reliefs,
		group: 'Surface',
		description:
			'texture: a turbulence bump map. shape: the content (here, letters), blurred into a rounded height map. both: letters raised out of the textured surface.'
	},
	surfaceColor: { kind: 'color', label: 'Surface color', default: '#e8dfd0', group: 'Surface' },
	surfaceScale: {
		kind: 'range',
		label: 'Surface scale',
		default: 5,
		min: 0,
		max: 30,
		step: 0.5,
		group: 'Surface',
		description: 'Height of the relief: alpha 1 is this many px above alpha 0.'
	},
	bumpFrequency: {
		kind: 'range',
		label: 'Bump frequency',
		default: 0.04,
		min: 0.002,
		max: 0.4,
		step: 0.002,
		group: 'Surface',
		description: 'baseFrequency of the turbulence. Low: rolling plaster; high: fine paper grain.'
	},
	bumpOctaves: {
		kind: 'range',
		label: 'Bump octaves',
		default: 4,
		min: 1,
		max: 6,
		step: 1,
		group: 'Surface'
	},
	bumpSeed: {
		kind: 'range',
		label: 'Bump seed',
		default: 4,
		min: 0,
		max: 200,
		step: 1,
		group: 'Surface'
	},
	bumpAmount: {
		kind: 'range',
		label: 'Texture under shape',
		default: 0.25,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Surface',
		description:
			'For "both": how much of the height comes from the texture; the rest is the raised shape.'
	},
	shapeBlur: {
		kind: 'range',
		label: 'Shape bevel',
		default: 3,
		min: 0.5,
		max: 12,
		step: 0.5,
		unit: 'px',
		group: 'Surface',
		description:
			'Blur of the shape alpha. The blurred edge becomes a slope: small values give sharp, chiseled edges, large ones soft pillows.'
	},
	diffuseConstant: {
		kind: 'range',
		label: 'Diffuse constant',
		default: 1,
		min: 0,
		max: 3,
		step: 0.05,
		group: 'Diffuse',
		description: 'kd: brightness of the matte (Lambertian) part of the light.'
	},
	specular: {
		kind: 'toggle',
		label: 'Specular highlights',
		default: true,
		group: 'Specular'
	},
	specularConstant: {
		kind: 'range',
		label: 'Specular constant',
		default: 0.6,
		min: 0,
		max: 3,
		step: 0.05,
		group: 'Specular',
		when: 'specular',
		description: 'ks: strength of the glossy highlight.'
	},
	specularExponent: {
		kind: 'range',
		label: 'Specular exponent',
		default: 24,
		min: 1,
		max: 128,
		step: 1,
		group: 'Specular',
		when: 'specular',
		description: 'Shininess. Low values give broad, satin sheen; high values small, sharp glints.'
	}
});

export type LightingOptions = Values<typeof lightingSchema>;
export const lightingDefaults: LightingOptions = defaultsOf(lightingSchema);

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

type Vec3 = [number, number, number];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits + 0;

/** Percent of the element (0…100) → px in the filter's user space (origin top left). */
export function percentToPx({ x, y }: Point, { width, height }: Size): Point {
	return { x: round((x / 100) * width), y: round((y / 100) * height) };
}

/** px → percent of the element, clamped to 0…100. Inverse of `percentToPx`. */
export function pxToPercent({ x, y }: Point, { width, height }: Size): Point {
	return {
		x: width > 0 ? round(clamp((x / width) * 100, 0, 100)) : 0,
		y: height > 0 ? round(clamp((y / height) * 100, 0, 100)) : 0
	};
}

/** Moves a percent position by `delta` percentage points, staying within 0…100. */
export function stepPercent(p: Point, delta: Point): Point {
	return { x: clamp(p.x + delta.x, 0, 100), y: clamp(p.y + delta.y, 0, 100) };
}

/**
 * Direction for `<feDistantLight>` that matches a point light at `light` (px) and height `z`,
 * as seen from the center of the surface. azimuth: degrees clockwise from the +x axis in the
 * plane (SVG's y points down). elevation: degrees above the plane; 90 is straight overhead.
 */
export function toDistant(
	light: Point,
	z: number,
	size: Size
): {
	azimuth: number;
	elevation: number;
} {
	const dx = light.x - size.width / 2;
	const dy = light.y - size.height / 2;
	const azimuth = (Math.atan2(dy, dx) * 180) / Math.PI;
	const elevation = (Math.atan2(z, Math.hypot(dx, dy)) * 180) / Math.PI;
	return { azimuth: round((azimuth + 360) % 360, 1), elevation: round(elevation, 1) };
}

function normalize([x, y, z]: Vec3): Vec3 {
	const l = Math.hypot(x, y, z) || 1;
	return [x / l + 0, y / l + 0, z / l + 0]; // + 0 turns -0 into 0
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Surface normal from the slope of the height map (alpha per px in x and y), the way
 * feDiffuseLighting and feSpecularLighting derive it (they estimate the slope with a Sobel
 * kernel): N = normalize(−scale·∂A/∂x, −scale·∂A/∂y, 1).
 */
export function surfaceNormal(slopeX: number, slopeY: number, surfaceScale: number): Vec3 {
	return normalize([-surfaceScale * slopeX, -surfaceScale * slopeY, 1]);
}

/** Unit vector from a surface point (x, y, height z) to a point light. */
export function lightVector(surface: Vec3, light: Vec3): Vec3 {
	return normalize([light[0] - surface[0], light[1] - surface[1], light[2] - surface[2]]);
}

/** feDiffuseLighting's brightness factor: kd · N·L (Lambert), never negative. */
export function diffuse(normal: Vec3, toLight: Vec3, kd: number): number {
	return kd * Math.max(0, dot(normal, toLight));
}

/**
 * feSpecularLighting's brightness factor: ks · (N·H)^exponent, where H is the half vector
 * between the light and the eye. The spec puts the eye at infinity straight above: (0, 0, 1).
 */
export function specular(normal: Vec3, toLight: Vec3, ks: number, exponent: number): number {
	const half = normalize([toLight[0], toLight[1], toLight[2] + 1]);
	return ks * Math.max(0, dot(normal, half)) ** exponent;
}

/** Linear interpolation between two points, `t` in 0…1. */
export function lerpPoint(a: Point, b: Point, t: number): Point {
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
