import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
	MAX_FLICKER,
	barrelMap,
	maxFlickerChange,
	maxFlickerStep,
	barrelMapUrl,
	contrastRatio,
	crc32,
	crtDefaults,
	displacementScale,
	encodePng,
	safeFlicker,
	worstTextContrast
} from './crt';

describe('barrelMap', () => {
	const size = 64;
	const map = barrelMap(size);
	const at = (x: number, y: number) => [
		...map.subarray((y * size + x) * 3, (y * size + x) * 3 + 3)
	];

	it('has no displacement near the center', () => {
		for (const v of at(size / 2, size / 2).slice(0, 2))
			expect(Math.abs(v - 128)).toBeLessThanOrEqual(1);
	});

	it('pushes outwards, most in the corners', () => {
		const [r, g] = at(size - 1, size - 1);
		expect(r).toBeGreaterThan(240);
		expect(g).toBeGreaterThan(240);
		const [r0, g0] = at(0, 0);
		expect(r0).toBeLessThan(15);
		expect(g0).toBeLessThan(15);
		// middle of the right edge: half the corner's horizontal offset, no vertical one
		const [rm, gm] = at(size - 1, size / 2);
		expect(rm - 128).toBeGreaterThan(55);
		expect(rm - 128).toBeLessThan(70);
		expect(Math.abs(gm - 128)).toBeLessThanOrEqual(1);
	});

	it('is symmetric', () => {
		const [r1] = at(10, 20);
		const [r2] = at(size - 1 - 10, 20);
		expect(r1 + r2).toBeCloseTo(255, -1);
	});
});

describe('displacementScale', () => {
	it('is 2·k·size', () => {
		expect(displacementScale(0.05, 600)).toBe(60);
		expect(displacementScale(0, 600)).toBe(0);
	});
});

describe('encodePng', () => {
	it('writes a valid PNG that decodes to the same pixels', () => {
		const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 10, 20, 30]);
		const png = encodePng(2, 2, rgb);
		expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

		const view = new DataView(png.buffer);
		const type = (o: number) => String.fromCharCode(...png.subarray(o + 4, o + 8));
		expect(type(8)).toBe('IHDR');
		expect(view.getUint32(16)).toBe(2);
		expect(view.getUint32(20)).toBe(2);

		const idatOffset = 8 + 12 + 13;
		expect(type(idatOffset)).toBe('IDAT');
		const length = view.getUint32(idatOffset);
		const data = png.subarray(idatOffset + 8, idatOffset + 8 + length);
		expect(view.getUint32(idatOffset + 8 + length)).toBe(
			crc32(png.subarray(idatOffset + 4, idatOffset + 8 + length))
		);
		const raw = inflateSync(data);
		expect([...raw]).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 10, 20, 30]);
	});

	it('splits large images into several stored blocks', () => {
		const size = 200; // 200 × 601 bytes > 65535
		const rgb = new Uint8Array(size * size * 3).map((_, i) => i % 251);
		const png = encodePng(size, size, rgb);
		const view = new DataView(png.buffer);
		const idat = 8 + 12 + 13;
		const raw = inflateSync(png.subarray(idat + 8, idat + 8 + view.getUint32(idat)));
		expect(raw.length).toBe(size * (size * 3 + 1));
		expect(raw[size * 3 + 2]).toBe(rgb[size * 3]);
	});
});

describe('crc32', () => {
	it('matches the reference value', () => {
		expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
	});
});

describe('barrelMapUrl', () => {
	it('is a PNG data URL', () => {
		expect(barrelMapUrl()).toMatch(/^data:image\/png;base64,iVBORw0KGgo/);
	});
});

describe('flicker guard', () => {
	/** Exact sRGB decoding, independent of the module under test. */
	const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

	it('keeps every luminance change well below the 0.1 flash threshold', () => {
		// The veil scales encoded values; check every 8-bit level, not just white.
		for (let i = 0; i <= 255; i++) {
			const v = i / 255;
			expect(decode(v) - decode(v * (1 - MAX_FLICKER))).toBeLessThan(0.075);
		}
		expect(maxFlickerChange(1)).toBeCloseTo(1 - decode(1 - MAX_FLICKER), 6);
		expect(maxFlickerChange(1)).toBeLessThan(0.075);
	});

	it('would not be safe at 0.05 (gamma makes the change larger than a)', () => {
		expect(1 - decode(0.95)).toBeGreaterThan(0.1);
	});

	it('changes luminance by less than 0.015 per frame at 60 fps', () => {
		expect(maxFlickerStep(1)).toBeLessThan(0.015);
	});

	it('clamps the amount', () => {
		expect(safeFlicker(1)).toBe(MAX_FLICKER);
		expect(safeFlicker(-1)).toBe(0);
		expect(safeFlicker(0.02)).toBe(0.02);
	});
});

describe('contrastRatio', () => {
	it('matches the WCAG extremes', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
		expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
	});
});

describe('worstTextContrast', () => {
	it('keeps the defaults readable (≥ 4.5:1 even at the darkest pixel)', () => {
		expect(worstTextContrast(crtDefaults)).toBeGreaterThanOrEqual(4.5);
	});

	it('drops with heavier scanlines and mask', () => {
		const heavy = worstTextContrast({ ...crtDefaults, scanlines: 0.8, mask: 0.8 });
		expect(heavy).toBeLessThan(worstTextContrast(crtDefaults));
		expect(heavy).toBeLessThan(4.5);
	});

	it('equals the plain contrast without scanlines or mask', () => {
		const plain = worstTextContrast({ ...crtDefaults, scanlines: 0, mask: 0 });
		expect(plain).toBeCloseTo(contrastRatio(crtDefaults.phosphor, crtDefaults.background), 2);
	});
});
