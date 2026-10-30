import { describe, expect, it } from 'vitest';
import {
	ABS_TABLE,
	blendModeOf,
	channelSumMatrix,
	convolveAttrs,
	edgeGain,
	edgeKernels,
	embossKernel,
	flipKernel,
	grainCoefficients,
	laplacian,
	opaqueColorMatrix,
	opaqueLuminanceMatrix,
	rampTables,
	sobelX,
	sobelY,
	thresholdLinear,
	type Kernel
} from './edges';

const sum = (k: Kernel) => k.flat().reduce((a, b) => a + b, 0);

/** Correlation of `kernel` with a grid of pixels around (cx, cy), the way the kernels read. */
function apply(kernel: Kernel, image: number[][], cx: number, cy: number): number {
	const c = (kernel.length - 1) / 2;
	let acc = 0;
	kernel.forEach((row, y) => row.forEach((w, x) => (acc += w * image[cy + y - c][cx + x - c])));
	return acc;
}

/** feConvolveMatrix's formula: the kernelMatrix is applied rotated by 180°. */
function convolve(kernelMatrix: Kernel, image: number[][], cx: number, cy: number): number {
	return apply(flipKernel(kernelMatrix), image, cx, cy);
}

const step = (n: number, at: number) =>
	Array.from({ length: n }, () => Array.from({ length: n }, (_, x) => (x >= at ? 1 : 0)));

describe('kernels', () => {
	it('all sum to 0, so flat areas give no response', () => {
		for (const size of ['3', '5'] as const) {
			for (const k of [sobelX(size), sobelY(size), laplacian(size), embossKernel(30, size)]) {
				expect(sum(k)).toBeCloseTo(0, 6);
				expect(k).toHaveLength(Number(size));
				for (const row of k) expect(row).toHaveLength(Number(size));
			}
		}
	});

	it('Sobel Y is Sobel X transposed', () => {
		expect(sobelY()).toEqual([
			[-1, -2, -1],
			[0, 0, 0],
			[1, 2, 1]
		]);
	});

	it('Laplacians are symmetric, so flipping them changes nothing', () => {
		expect(flipKernel(laplacian('3'))).toEqual(laplacian('3'));
		expect(flipKernel(laplacian('5'))).toEqual(laplacian('5'));
	});

	it('Sobel operators use two kernels, Laplacian one', () => {
		expect(edgeKernels('sobel')).toHaveLength(2);
		expect(edgeKernels('laplacian', '5')).toEqual([laplacian('5')]);
	});
});

describe('embossKernel', () => {
	it('weights the tap away from the light positively (light from the left: 180°)', () => {
		const k = embossKernel(180);
		expect(k[1]).toEqual([-1, 0, 1]);
		expect(k[0]).toEqual([-1, 0, 1]);
	});

	it('makes a slope facing the light bright: brightness rising away from the light', () => {
		// Light from the left; the image gets brighter to the right, i.e. a slope facing left.
		const k = embossKernel(180);
		const image = step(3, 2);
		expect(apply(k, image, 1, 1)).toBeGreaterThan(0);
	});

	it('survives the browser flipping it (convolveAttrs pre-flips)', () => {
		const k = embossKernel(180);
		const matrix = convolveAttrs(k)
			.kernelMatrix.split('  ')
			.map((row) => row.split(' ').map(Number));
		expect(convolve(matrix, step(3, 2), 1, 1)).toBe(apply(k, step(3, 2), 1, 1));
	});
});

describe('edgeGain', () => {
	it('is the response to a full black-to-white step', () => {
		expect(edgeGain(sobelX('3'))).toBe(4);
		expect(edgeGain(sobelY('3'))).toBe(4);
		expect(edgeGain(laplacian('3'))).toBe(3);
		expect(edgeGain(sobelX('5'))).toBe(48);
	});
});

describe('convolveAttrs', () => {
	it('maps a full step to 0.5 ± 0.5 · strength with a bias of 0.5', () => {
		const k = sobelX();
		const a = convolveAttrs(k, 1);
		expect(a).toMatchObject({ order: 3, divisor: 8, bias: 0.5 });
		expect(a.kernelMatrix).toBe('1 0 -1  2 0 -2  1 0 -1');
		const response = apply(k, step(3, 1), 1, 1) / a.divisor + a.bias;
		expect(response).toBe(1);
		expect(convolveAttrs(k, 2).divisor).toBe(4);
	});
});

describe('ABS_TABLE', () => {
	it('is |2v − 1| as a three-entry table', () => {
		const t = ABS_TABLE.split(' ').map(Number);
		const lookup = (v: number) =>
			v <= 0.5 ? t[0] + (t[1] - t[0]) * 2 * v : t[1] + (t[2] - t[1]) * (2 * v - 1);
		for (const v of [0, 0.2, 0.5, 0.8, 1]) expect(lookup(v)).toBeCloseTo(Math.abs(2 * v - 1));
	});
});

describe('color matrices', () => {
	it('luminance and color matrices force alpha to 1', () => {
		expect(opaqueLuminanceMatrix().slice(15)).toEqual([0, 0, 0, 0, 1]);
		expect(opaqueColorMatrix().slice(15)).toEqual([0, 0, 0, 0, 1]);
		expect(
			opaqueLuminanceMatrix()
				.slice(0, 3)
				.reduce((a, b) => a + b)
		).toBeCloseTo(1);
	});

	it('adds the channel magnitudes and keeps alpha', () => {
		const m = channelSumMatrix(0.5);
		expect(m.slice(0, 5)).toEqual([0.5, 0.5, 0.5, 0, 0]);
		expect(m.slice(15)).toEqual([0, 0, 0, 1, 0]);
	});
});

describe('thresholdLinear', () => {
	it('drops values below the threshold and stretches the rest', () => {
		const { slope, intercept } = thresholdLinear(0.2);
		expect(0.2 * slope + intercept).toBeCloseTo(0);
		expect(1 * slope + intercept).toBeCloseTo(1);
		expect(thresholdLinear(0)).toEqual({ slope: 1, intercept: 0 });
	});
});

describe('grainCoefficients', () => {
	it('keeps the lines at amount 0 and multiplies them fully at 1', () => {
		expect(grainCoefficients(0)).toEqual({ k1: 0, k2: 1 });
		expect(grainCoefficients(1)).toEqual({ k1: 1, k2: 0 });
		expect(grainCoefficients(0.25)).toEqual({ k1: 0.25, k2: 0.75 });
	});
});

describe('rampTables', () => {
	it('lists from → to per channel', () => {
		expect(rampTables('#000000', '#ff8000')).toEqual(['0 1', '0 0.502', '0 0']);
	});
});

describe('blendModeOf', () => {
	it('picks a blend mode per drawing style', () => {
		expect(blendModeOf('sketch')).toBe('multiply');
		expect(blendModeOf('edges')).toBe('screen');
		expect(blendModeOf('emboss')).toBe('hard-light');
	});
});
