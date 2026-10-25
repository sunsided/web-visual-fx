import { defaultsOf, defineSchema, type Values } from '#lib/params/schema.js';

export const glassSchema = defineSchema({
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 28,
		min: 0,
		max: 96,
		step: 1,
		unit: 'px',
		group: 'Surface'
	},
	tint: { kind: 'color', label: 'Tint', default: '#ffffff', group: 'Surface' },
	tintOpacity: {
		kind: 'range',
		label: 'Tint opacity',
		default: 0.08,
		min: 0,
		max: 0.8,
		step: 0.01,
		group: 'Surface'
	},
	shadow: {
		kind: 'range',
		label: 'Drop shadow',
		default: 0.3,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Surface'
	},
	blur: {
		kind: 'range',
		label: 'Blur',
		default: 14,
		min: 0,
		max: 48,
		step: 0.5,
		unit: 'px',
		group: 'Backdrop'
	},
	saturate: {
		kind: 'range',
		label: 'Saturate',
		default: 1.6,
		min: 0,
		max: 3,
		step: 0.05,
		group: 'Backdrop'
	},
	brightness: {
		kind: 'range',
		label: 'Brightness',
		default: 1.05,
		min: 0.5,
		max: 1.5,
		step: 0.01,
		group: 'Backdrop'
	},
	displace: {
		kind: 'toggle',
		label: 'Displacement',
		default: true,
		group: 'Distortion',
		description:
			'Warps the backdrop with an feTurbulence → feDisplacementMap filter. Chromium-based browsers only; skipped elsewhere because Firefox would drop the blur as well.'
	},
	distortion: {
		kind: 'range',
		label: 'Strength',
		default: 40,
		min: 0,
		max: 200,
		step: 1,
		group: 'Distortion',
		when: 'displace'
	},
	frequency: {
		kind: 'range',
		label: 'Frequency',
		default: 0.008,
		min: 0.001,
		max: 0.08,
		step: 0.001,
		group: 'Distortion',
		when: 'displace',
		description: 'Low values give large, slow waves; high values give a rippled, pebbled look.'
	},
	octaves: {
		kind: 'range',
		label: 'Octaves',
		default: 2,
		min: 1,
		max: 6,
		step: 1,
		group: 'Distortion',
		when: 'displace'
	},
	distortionSeed: {
		kind: 'range',
		label: 'Seed',
		default: 7,
		min: 0,
		max: 200,
		step: 1,
		group: 'Distortion',
		when: 'displace'
	},
	rimWidth: {
		kind: 'range',
		label: 'Rim width',
		default: 1,
		min: 0,
		max: 4,
		step: 0.25,
		unit: 'px',
		group: 'Rim'
	},
	rimOpacity: {
		kind: 'range',
		label: 'Rim opacity',
		default: 0.7,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Rim'
	},
	rimAngle: {
		kind: 'range',
		label: 'Light angle',
		default: 135,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Rim'
	},
	innerGlow: {
		kind: 'range',
		label: 'Inner glow',
		default: 0.25,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Rim'
	},
	grain: {
		kind: 'range',
		label: 'Grain',
		default: 0.12,
		min: 0,
		max: 0.6,
		step: 0.01,
		group: 'Grain',
		description: 'Opacity of a fine noise overlay (soft-light). Breaks up banding in the blur.'
	},
	grainFrequency: {
		kind: 'range',
		label: 'Grain frequency',
		default: 0.9,
		min: 0.1,
		max: 2,
		step: 0.05,
		group: 'Grain'
	}
});

export type GlassOptions = Values<typeof glassSchema>;

export const glassDefaults: GlassOptions = defaultsOf(glassSchema);

/** `#rrggbb` + alpha → `rgb(r g b / a)` */
export function hexToRgba(hex: string, alpha: number): string {
	const n = Number.parseInt(hex.slice(1), 16);
	return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
}
