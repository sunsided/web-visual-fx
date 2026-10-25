import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const auroraBlendModes = [
	'normal',
	'screen',
	'lighten',
	'overlay',
	'soft-light',
	'hard-light',
	'color-dodge',
	'multiply',
	'difference'
] as const;

export type AuroraBlendMode = (typeof auroraBlendModes)[number];

export const auroraTechniques = ['mesh', 'blobs'] as const;
export type AuroraTechnique = (typeof auroraTechniques)[number];

/** Upper bounds of the schema, also the number of `@property` rules the component declares. */
export const MAX_COLORS = 5;
export const MAX_BLOBS = 8;

/**
 * Seconds for one full turn of the clock at speed 1. The fastest blob turns twice per clock
 * cycle, so at the maximum speed of 3 a blob still needs ~7 s per orbit: slow, smooth drift,
 * nowhere near the three-flashes-per-second limit.
 */
export const BASE_DURATION = 40;

export const auroraSchema = defineSchema({
	technique: {
		kind: 'select',
		label: 'Technique',
		default: 'mesh',
		options: auroraTechniques,
		group: 'Technique',
		description:
			'mesh: one element, layered radial-gradients moved by animated @property values (repaints every frame). blobs: one blurred element per blob, moved with transforms (compositor-friendly).'
	},
	colorCount: {
		kind: 'range',
		label: 'Colors used',
		default: 4,
		min: 2,
		max: MAX_COLORS,
		step: 1,
		group: 'Palette',
		description: 'How many of the palette colors below take part. Blobs cycle through them.'
	},
	color1: { kind: 'color', label: 'Color 1', default: '#7c3aed', group: 'Palette' },
	color2: { kind: 'color', label: 'Color 2', default: '#06b6d4', group: 'Palette' },
	color3: { kind: 'color', label: 'Color 3', default: '#ec4899', group: 'Palette' },
	color4: { kind: 'color', label: 'Color 4', default: '#22c55e', group: 'Palette' },
	color5: { kind: 'color', label: 'Color 5', default: '#facc15', group: 'Palette' },
	background: { kind: 'color', label: 'Background', default: '#0b0820', group: 'Palette' },
	saturation: {
		kind: 'range',
		label: 'Saturation',
		default: 1,
		min: 0,
		max: 2,
		step: 0.05,
		group: 'Palette',
		description: 'Scales the OKLCH chroma of every palette color (relative color syntax).'
	},
	blobs: {
		kind: 'range',
		label: 'Blob count',
		default: 5,
		min: 2,
		max: MAX_BLOBS,
		step: 1,
		group: 'Blobs'
	},
	blobSize: {
		kind: 'range',
		label: 'Blob size',
		default: 60,
		min: 15,
		max: 120,
		step: 1,
		unit: '%',
		group: 'Blobs',
		description: 'Diameter, relative to the longer side of the area.'
	},
	blur: {
		kind: 'range',
		label: 'Blur',
		default: 40,
		min: 0,
		max: 160,
		step: 1,
		unit: 'px',
		group: 'Blobs',
		description:
			'blobs: blur of each blob. mesh: blur of the whole gradient layer, 0 = pure gradient (cheapest).'
	},
	blendMode: {
		kind: 'select',
		label: 'Blend mode',
		default: 'normal',
		options: auroraBlendModes,
		group: 'Blobs',
		description:
			'How blobs mix with each other and the background (mix-blend-mode, or background-blend-mode in mesh mode).'
	},
	seed: {
		kind: 'range',
		label: 'Layout seed',
		default: 3,
		min: 0,
		max: 100,
		step: 1,
		group: 'Blobs',
		description: 'Picks different, but repeatable, start positions and orbits.'
	},
	animate: {
		kind: 'toggle',
		label: 'Animate',
		default: true,
		group: 'Motion',
		description: 'Always off when the user prefers reduced motion.'
	},
	speed: {
		kind: 'range',
		label: 'Speed',
		default: 1,
		min: 0.1,
		max: 3,
		step: 0.05,
		group: 'Motion',
		when: 'animate'
	},
	colorDrift: {
		kind: 'toggle',
		label: 'Color drift',
		default: true,
		group: 'Motion',
		when: 'animate',
		description:
			'Slowly fades every color towards the next palette color via registered <color> properties. Forces a repaint of the blobs each frame.'
	},
	grain: {
		kind: 'range',
		label: 'Grain',
		default: 0.12,
		min: 0,
		max: 0.5,
		step: 0.01,
		group: 'Grain',
		description: 'Opacity of a fine noise overlay that dithers away color banding.'
	}
});

export type AuroraOptions = Values<typeof auroraSchema>;

export const auroraDefaults: AuroraOptions = defaultsOf(auroraSchema);

/** The palette colors in use, in order. */
export function paletteOf(
	v: Pick<AuroraOptions, 'colorCount' | 'color1' | 'color2' | 'color3' | 'color4' | 'color5'>
): string[] {
	const all = [v.color1, v.color2, v.color3, v.color4, v.color5];
	return all.slice(0, clampInt(v.colorCount, 2, MAX_COLORS));
}

/**
 * Scales a color's chroma with CSS relative color syntax: the browser converts the color to
 * OKLCH, multiplies `c` and maps the result back into the display gamut.
 */
export function saturated(color: string, saturation: number): string {
	return saturation === 1 ? color : `oklch(from ${color} l calc(c * ${saturation}) h)`;
}

export interface Blob {
	/** Start position of the center, in % of the area. */
	x: number;
	y: number;
	/** Orbit radius, in % of the longer side (same unit as the blob size). */
	orbit: number;
	/** Whole turns per clock cycle; negative turns counter-clockwise. Never 0. */
	turns: number;
	/** Start angle on the orbit, in degrees. */
	phase: number;
	/** Index into the palette. */
	color: number;
}

/** Small, fast, seedable PRNG (mulberry32). */
export function random(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const TURNS = [1, -1, 2, -2] as const;

/**
 * Deterministic blob layout. Blobs start spread around the area (a jittered circle around the
 * center, so they don't all clump in one spot) and orbit with a whole number of turns per clock
 * cycle, which makes the loop seamless: after one cycle every blob is back where it started.
 */
export function blobLayout(count: number, colors: number, seed: number): Blob[] {
	const rand = random(seed * 9973 + 1);
	const n = clampInt(count, 1, MAX_BLOBS);
	const offset = rand() * 360;
	return Array.from({ length: n }, (_, i) => {
		const angle = ((offset + (360 * i) / n + (rand() - 0.5) * 40) * Math.PI) / 180;
		const distance = 18 + rand() * 18;
		return {
			x: round(50 + Math.cos(angle) * distance),
			y: round(50 + Math.sin(angle) * distance),
			orbit: round(6 + rand() * 12),
			turns: TURNS[Math.floor(rand() * TURNS.length)],
			phase: Math.round(rand() * 360),
			color: i % Math.max(1, colors)
		};
	});
}

/**
 * Center of a blob as CSS lengths, for the mesh technique. Rotating the blob around a point
 * `orbit` to the right of its start position (that is what the blobs technique does with
 * `transform-origin` + `rotate`) puts the center at
 *   x + r − r·cos(a),  y − r·sin(a)  with  a = turns · t + phase.
 * `t` is the registered `<angle>` that the animation drives.
 */
export function meshCenter(b: Blob, t = 'var(--aurora-t)', pad = ''): { x: string; y: string } {
	const a = `calc(${t} * ${b.turns} + ${b.phase}deg)`;
	const p = pad ? `${pad} + ` : '';
	return {
		x: `calc(${p}${b.x}cqw + ${b.orbit}cqmax - ${b.orbit}cqmax * cos(${a}))`,
		y: `calc(${p}${b.y}cqh - ${b.orbit}cqmax * sin(${a}))`
	};
}

/**
 * The mesh: one radial-gradient per blob, all on one element. CSS paints the first background
 * layer on top, so the list is reversed: later blobs end up on top, as in the blobs technique.
 * `color(i)` maps a palette index to a CSS color (the component passes the animated
 * `var(--aurora-cN)`; the code snippet passes plain colors). `pad` shifts every center, for a
 * layer that is larger than the area (so a blur over it doesn't fade out at the edges).
 */
export function meshLayers(
	layout: Blob[],
	size: number,
	color: (index: number) => string,
	{ falloff = 'var(--aurora-falloff)', pad = '' } = {}
): string[] {
	const radius = round(size / 2);
	return layout
		.map((b) => {
			const { x, y } = meshCenter(b, 'var(--aurora-t)', pad);
			return `radial-gradient(circle ${radius}cqmax at ${x} ${y}, ${color(b.color)}, transparent ${falloff})`;
		})
		.reverse();
}

/**
 * Timing of one blob in the blobs technique, equivalent to its path in the mesh technique.
 * The keyframes run `rotate: 0 → 360deg` (`animation-direction: reverse` for negative turns);
 * a negative delay starts the animation part-way, at the blob's phase angle.
 */
export function blobTiming(
	b: Blob,
	speed: number
): { duration: number; delay: number; reverse: boolean } {
	const duration = BASE_DURATION / Math.max(speed, 0.01) / Math.abs(b.turns);
	const reverse = b.turns < 0;
	// Reversed, the angle at elapsed time e is 360° − 360°·e/duration, so start at 360° − phase.
	const start = reverse ? (360 - b.phase) % 360 : b.phase;
	return { duration: round(duration), delay: round(-(start / 360) * duration), reverse };
}

function clampInt(v: number, min: number, max: number) {
	return Math.min(max, Math.max(min, Math.round(v)));
}

function round(v: number) {
	return Math.round(v * 100) / 100;
}
