import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { REC709 } from '../duotone/duotone.js';

export const edgeModes = ['sketch', 'edges', 'emboss'] as const;
export type EdgeMode = (typeof edgeModes)[number];

export const edgeOperators = ['sobel', 'laplacian'] as const;
export type EdgeOperator = (typeof edgeOperators)[number];

export const kernelSizes = ['3', '5'] as const;
export type KernelSize = (typeof kernelSizes)[number];

export const edgeChannels = ['luminance', 'color'] as const;
export type EdgeChannels = (typeof edgeChannels)[number];
export const edgesSchema = defineSchema({
	mode: {
		kind: 'select',
		label: 'Mode',
		default: 'sketch',
		options: edgeModes,
		group: 'Mode',
		description:
			'sketch: dark lines on paper. edges: the same lines inverted, light on a dark ground. emboss: a directional relief.'
	},
	operator: {
		kind: 'select',
		label: 'Operator',
		default: 'sobel',
		options: edgeOperators,
		group: 'Kernel',
		description:
			'sobel: two directional gradients, added up; clean, even lines. laplacian: one second-derivative kernel; thinner, doubled lines and more sensitive to fine detail. Not used by emboss.'
	},
	size: {
		kind: 'select',
		label: 'Kernel size',
		default: '3',
		options: kernelSizes,
		group: 'Kernel',
		description: '3×3 or 5×5. The larger kernel sees coarser detail and costs about 2.8× more.'
	},
	channels: {
		kind: 'select',
		label: 'Detect on',
		default: 'luminance',
		options: edgeChannels,
		group: 'Kernel',
		description:
			'luminance: one grey channel, cheapest. color: R, G and B separately, so edges between different hues of the same brightness show up too.'
	},
	strength: {
		kind: 'range',
		label: 'Strength',
		default: 2.5,
		min: 0.25,
		max: 4,
		step: 0.05,
		group: 'Kernel',
		description: 'Gain on the kernel response. 1 maps a full black-to-white step to a full line.'
	},
	smoothing: {
		kind: 'range',
		label: 'Pre-blur',
		default: 0.5,
		min: 0,
		max: 4,
		step: 0.25,
		unit: 'px',
		group: 'Kernel',
		description: 'Gaussian blur before the kernel, so noise and texture do not turn into lines.'
	},
	threshold: {
		kind: 'range',
		label: 'Threshold',
		default: 0.1,
		min: 0,
		max: 0.9,
		step: 0.01,
		group: 'Lines',
		description: 'Edge strengths below this are dropped; the rest is stretched back to 0–1.'
	},
	lineWidth: {
		kind: 'range',
		label: 'Line weight',
		default: 0,
		min: 0,
		max: 3,
		step: 1,
		unit: 'px',
		group: 'Lines',
		description: 'Thickens the lines with feMorphology dilate. 0 leaves the primitive out.'
	},
	texture: {
		kind: 'range',
		label: 'Pencil grain',
		default: 0.6,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Lines',
		description: 'Breaks the lines up with streaky feTurbulence noise, like graphite on paper.'
	},
	angle: {
		kind: 'range',
		label: 'Light from',
		default: 225,
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		group: 'Emboss',
		description: 'Direction the light comes from, clockwise from the right (225° = top left).'
	},
	ink: { kind: 'color', label: 'Ink', default: '#2b2622', group: 'Colors' },
	paper: { kind: 'color', label: 'Paper', default: '#f3ede1', group: 'Colors' },
	color: {
		kind: 'range',
		label: 'Original color',
		default: 0,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Colors',
		description:
			'Blends the result back onto the source: multiply for sketch, screen for edges, hard-light for emboss.'
	}
});

export type EdgesOptions = Values<typeof edgesSchema>;

export const edgesDefaults: EdgesOptions = defaultsOf(edgesSchema);

/** A square convolution kernel, row by row (`kernel[y][x]`). */
export type Kernel = number[][];

/** Horizontal Sobel gradient (responds to vertical edges), 3×3 or 5×5. */
export function sobelX(size: KernelSize = '3'): Kernel {
	return size === '3'
		? [
				[-1, 0, 1],
				[-2, 0, 2],
				[-1, 0, 1]
			]
		: [
				[-1, -2, 0, 2, 1],
				[-4, -8, 0, 8, 4],
				[-6, -12, 0, 12, 6],
				[-4, -8, 0, 8, 4],
				[-1, -2, 0, 2, 1]
			];
}

/** Vertical Sobel gradient: the transpose of `sobelX`. */
export function sobelY(size: KernelSize = '3'): Kernel {
	return transpose(sobelX(size));
}

/**
 * Laplacian: the 8-neighbour 3×3 kernel, or the common 5×5 Laplacian-of-Gaussian approximation,
 * which smooths a little before differentiating. Both sum to 0, so flat areas give 0.
 */
export function laplacian(size: KernelSize = '3'): Kernel {
	return size === '3'
		? [
				[1, 1, 1],
				[1, -8, 1],
				[1, 1, 1]
			]
		: [
				[0, 0, -1, 0, 0],
				[0, -1, -2, -1, 0],
				[-1, -2, 16, -2, -1],
				[0, -1, -2, -1, 0],
				[0, 0, -1, 0, 0]
			];
}

/**
 * Directional derivative for emboss, reading brightness as height: each tap is weighted by its
 * offset projected onto the light direction, negated, `w = −(dx·cos θ + dy·sin θ)` (y points
 * down, θ clockwise from +x). That is the slope towards the light with the sign of Lambert
 * shading (`−∇h · L`): slopes that face the light come out bright, the others dark. The kernel
 * sums to 0, so flat areas stay mid-grey.
 */
export function embossKernel(lightAngle: number, size: KernelSize = '3'): Kernel {
	const n = Number(size);
	const c = (n - 1) / 2;
	const a = (lightAngle * Math.PI) / 180;
	const [ux, uy] = [Math.cos(a), Math.sin(a)];
	return Array.from({ length: n }, (_, y) =>
		Array.from({ length: n }, (_, x) => round(-((x - c) * ux + (y - c) * uy)) || 0)
	);
}

function transpose(k: Kernel): Kernel {
	return k[0].map((_, x) => k.map((row) => row[x]));
}

const round = (v: number) => +v.toFixed(4);

/**
 * Largest absolute response of `kernel` to an ideal black-to-white step edge (vertical or
 * horizontal, at any position). Dividing by twice this value maps a full step to ±0.5, which the
 * `bias` of 0.5 and the absolute-value table then turn into a full-strength line.
 */
export function edgeGain(kernel: Kernel): number {
	const n = kernel.length;
	let best = 0;
	for (let edge = 1; edge < n; edge++) {
		let vertical = 0;
		let horizontal = 0;
		for (let y = 0; y < n; y++) {
			for (let x = 0; x < n; x++) {
				if (x >= edge) vertical += kernel[y][x];
				if (y >= edge) horizontal += kernel[y][x];
			}
		}
		best = Math.max(best, Math.abs(vertical), Math.abs(horizontal));
	}
	return best;
}

/** Attributes for one `<feConvolveMatrix>`, signed output centered at 0.5. */
export interface ConvolveAttrs {
	order: number;
	kernelMatrix: string;
	divisor: number;
	bias: number;
}

/**
 * The kernel rotated by 180°. `feConvolveMatrix` is a true convolution: the kernel is applied
 * flipped in both directions. Kernels here are written the way they read (as a correlation:
 * the top-left weight multiplies the top-left neighbour), so they are flipped once more before
 * they go into `kernelMatrix`. Symmetric kernels don't change; directional ones would point the
 * wrong way otherwise.
 */
export function flipKernel(kernel: Kernel): Kernel {
	return kernel.map((row) => [...row].reverse()).reverse();
}

/**
 * `feConvolveMatrix` attributes for `kernel` at `strength`. The browser computes
 * `sum / divisor + bias` per color channel and clamps it to 0–1, so negative responses would be
 * lost; a bias of 0.5 keeps them, with flat areas at exactly 0.5. The divisor `2·gain / strength`
 * makes a full-contrast step reach 0.5 ± 0.5·strength.
 */
export function convolveAttrs(kernel: Kernel, strength = 1): ConvolveAttrs {
	return {
		order: kernel.length,
		kernelMatrix: flipKernel(kernel)
			.map((row) => row.join(' '))
			.join('  '),
		divisor: round((2 * edgeGain(kernel)) / Math.max(0.01, strength)),
		bias: 0.5
	};
}

/**
 * `tableValues` for `feFuncX type="table"` that fold the signed response back to a magnitude:
 * `|2v − 1|`, i.e. 0.5 (flat) → 0, 0 and 1 (strongest edges either way) → 1.
 */
export const ABS_TABLE = '1 0 1';

/** The kernels whose magnitudes are added up for an edge operator (Sobel: |Gx| + |Gy|). */
export function edgeKernels(operator: EdgeOperator, size: KernelSize = '3'): Kernel[] {
	return operator === 'sobel' ? [sobelX(size), sobelY(size)] : [laplacian(size)];
}

/**
 * `feColorMatrix` values: Rec. 709 luminance into R, G and B, and alpha forced to 1. Kernels then
 * see one grey value per pixel, and transparent areas count as black, so the outline of a
 * transparent icon becomes an edge too.
 */
export function opaqueLuminanceMatrix(): number[] {
	const row = [...REC709, 0, 0];
	return [...row, ...row, ...row, 0, 0, 0, 0, 1];
}

/**
 * `feColorMatrix` values that keep R, G and B and force alpha to 1, for edge detection on color:
 * every channel gets its own edge map, combined afterwards with `CHANNEL_SUM_MATRIX`.
 */
export function opaqueColorMatrix(): number[] {
	return [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];
}

/**
 * Weight of each channel's edge magnitude when the three are added up into one grey edge map.
 * ½ instead of ⅓: an edge rarely changes all three channels by the full amount, and a hue edge
 * (red against blue) should come out about as strong as a black-to-white one.
 */
export const CHANNEL_WEIGHT = 0.5;

/** `feColorMatrix` values that add up the R, G and B edge magnitudes into all three channels. */
export function channelSumMatrix(weight = CHANNEL_WEIGHT): number[] {
	const row = [weight, weight, weight, 0, 0];
	return [...row, ...row, ...row, 0, 0, 0, 1, 0];
}

/**
 * `feFuncX type="linear"` slope and intercept that drop values below `threshold` and stretch the
 * rest back to 0–1: `(v − t) / (1 − t)`, clamped by the browser.
 */
export function thresholdLinear(threshold: number): { slope: number; intercept: number } {
	const t = Math.min(0.99, Math.max(0, threshold));
	return { slope: round(1 / (1 - t)), intercept: round(-t / (1 - t)) || 0 };
}

/**
 * `feComposite operator="arithmetic"` coefficients that darken lines by a noise texture n:
 * `e · (1 − amount + amount · n)`, i.e. k1 = amount (e·n) and k2 = 1 − amount (e). Alpha stays 1.
 */
export function grainCoefficients(amount: number): { k1: number; k2: number } {
	const a = Math.min(1, Math.max(0, amount));
	return { k1: round(a), k2: round(1 - a) };
}

/** `#rrggbb` → `tableValues` per channel for a two-stop ramp `from` (0) → `to` (1). */
export function rampTables(from: string, to: string): [string, string, string] {
	const [a, b] = [from, to].map((hex) => {
		const n = Number.parseInt(hex.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => round(v / 255));
	});
	return [0, 1, 2].map((c) => `${a[c]} ${b[c]}`) as [string, string, string];
}

/** feBlend mode used to put the result back onto the original colors. */
export function blendModeOf(mode: EdgeMode): 'multiply' | 'screen' | 'hard-light' {
	return mode === 'sketch' ? 'multiply' : mode === 'edges' ? 'screen' : 'hard-light';
}
