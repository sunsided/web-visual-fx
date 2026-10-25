import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';
import { srgbToLinear } from '../duotone/duotone.js';
import { relativeLuminance } from '../glass/glass.js';

export const crtSchema = defineSchema({
	phosphor: {
		kind: 'color',
		label: 'Phosphor',
		default: '#4dff88',
		group: 'Screen',
		description: 'Text color. P1 green, P3 amber (#ffb000) and P4 white are the classics.'
	},
	background: { kind: 'color', label: 'Background', default: '#06140c', group: 'Screen' },
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 28,
		min: 0,
		max: 80,
		step: 1,
		unit: 'px',
		group: 'Screen'
	},
	curvature: {
		kind: 'range',
		label: 'Curvature',
		default: 0.05,
		min: 0,
		max: 0.2,
		step: 0.005,
		group: 'Screen',
		description:
			'Barrel distortion via feDisplacementMap: the image bulges and the corners pull in.'
	},
	scanlines: {
		kind: 'range',
		label: 'Scanlines',
		// With mask 0.15, the darkest text pixel keeps ≥ 4.5:1 (see worstTextContrast)
		default: 0.3,
		min: 0,
		max: 0.8,
		step: 0.01,
		group: 'Scanlines',
		description: 'How dark the gaps between lines are.'
	},
	lineHeight: {
		kind: 'range',
		label: 'Line pitch',
		default: 3,
		min: 2,
		max: 8,
		step: 1,
		unit: 'px',
		group: 'Scanlines'
	},
	mask: {
		kind: 'range',
		label: 'Phosphor mask',
		default: 0.15,
		min: 0,
		max: 0.8,
		step: 0.01,
		group: 'Scanlines',
		description: 'Strength of the vertical red/green/blue subpixel stripes (aperture grille).'
	},
	maskSize: {
		kind: 'range',
		label: 'Stripe width',
		default: 1,
		min: 1,
		max: 4,
		step: 1,
		unit: 'px',
		group: 'Scanlines'
	},
	glow: {
		kind: 'range',
		label: 'Glow',
		default: 0.6,
		min: 0,
		max: 1.5,
		step: 0.05,
		group: 'Glow',
		description: 'Bloom: a blurred copy blended with screen.'
	},
	glowRadius: {
		kind: 'range',
		label: 'Glow radius',
		default: 4,
		min: 1,
		max: 16,
		step: 0.5,
		unit: 'px',
		group: 'Glow'
	},
	vignette: {
		kind: 'range',
		label: 'Vignette',
		default: 0.5,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Glow'
	},
	rollingBar: {
		kind: 'toggle',
		label: 'Rolling bar',
		default: true,
		group: 'Motion',
		description: 'A faint bright band drifting down the screen. Off with reduced motion; pausable.'
	},
	flicker: {
		kind: 'toggle',
		label: 'Flicker',
		default: false,
		group: 'Motion',
		description:
			'Slight, irregular brightness wobble. Capped well below the flash threshold, at most 3 dips per second; off with reduced motion.'
	},
	flickerAmount: {
		kind: 'range',
		label: 'Flicker amount',
		default: 0.02,
		min: 0,
		max: 0.03,
		step: 0.005,
		group: 'Motion',
		when: 'flicker'
	}
});

export type CrtOptions = Values<typeof crtSchema>;

export const crtDefaults: CrtOptions = defaultsOf(crtSchema);

/**
 * Photosensitivity guard for the flicker (WCAG 2.3.1, three flashes).
 *
 * The flicker is a black veil whose opacity wobbles between 0 and `amount` (a). Compositing
 * happens on gamma-encoded sRGB values, so a pixel's encoded value v becomes v·(1 − a), and its
 * relative luminance drops from L(v) to L(v·(1 − a)), with L the sRGB transfer function. The drop
 * is largest for white: 1 − L(1 − a). WCAG counts a pair of opposing changes of 0.1 or more as a
 * flash (and only if the darker state is below 0.8, a condition this guard doesn't rely on).
 * With a ≤ `MAX_FLICKER` = 0.03 the largest possible change is 0.067 (a = 0.05 would already be
 * 0.110), so no change can count as a flash, whatever the rate.
 *
 * Two more margins: there are at most `FLICKER_DIPS_PER_SECOND` = 3 dips per second, and the
 * keyframes are smooth. Every keyframe segment lasts `FLICKER_SEGMENT` = 1/6 s and swings by at
 * most the full amplitude; ease-in-out peaks at 1.72× the average slope, so one 60 fps frame
 * changes the veil by at most 17 % of a, about 0.012 luminance on white (`maxFlickerStep`).
 */
export const MAX_FLICKER = 0.03;
export const FLICKER_DIPS_PER_SECOND = 3;
export const FLICKER_SEGMENT = 1 / 6;
/** Steepest slope of `ease-in-out` (cubic-bezier(0.42, 0, 0.58, 1)) relative to linear. */
export const EASE_IN_OUT_MAX_SLOPE = 1.7242;

export function safeFlicker(amount: number): number {
	return Math.min(MAX_FLICKER, Math.max(0, amount));
}

/** Largest luminance change the flicker can cause anywhere (white under the full veil). */
export function maxFlickerChange(amount: number): number {
	return 1 - srgbToLinear(1 - safeFlicker(amount));
}

/** Upper bound for the luminance change between two frames at `fps`. */
export function maxFlickerStep(amount: number, fps = 60): number {
	return (maxFlickerChange(amount) * EASE_IN_OUT_MAX_SLOPE) / (FLICKER_SEGMENT * fps);
}

/** Opacity of the rolling bar: a broad, slow gradient, so it never reads as a flash. */
export const ROLLING_BAR_OPACITY = 0.06;

// ---------------------------------------------------------------------------------------------
// Barrel distortion map

/**
 * RGB pixels (row-major, 3 bytes each) of a `size`×`size` displacement map for barrel distortion.
 *
 * With u, v in −1…1 across the screen and r² = u² + v², barrel distortion samples the source at
 * `p · (1 + k·r²)`: the image bulges and the corners pull in. The offset is `k · p · r²`. The
 * map stores the k-independent part, `u·r²/2` and `v·r²/2` (both in −1…1), in red and green
 * around 0.5, so `feDisplacementMap` turns it into pixels with `scale = 2·k·size in px`.
 */
export function barrelMap(size = 64): Uint8Array {
	const data = new Uint8Array(size * size * 3);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			// pixel centers, so the map is symmetric
			const u = ((x + 0.5) / size) * 2 - 1;
			const v = ((y + 0.5) / size) * 2 - 1;
			const r2 = u * u + v * v;
			const i = (y * size + x) * 3;
			data[i] = Math.round((0.5 + (u * r2) / 4) * 255);
			data[i + 1] = Math.round((0.5 + (v * r2) / 4) * 255);
			data[i + 2] = 128;
		}
	}
	return data;
}

/**
 * `feDisplacementMap` scale for a curvature k on an element of the given size in px: the map's
 * red channel holds u·r²/4 around 0.5, the filter moves by scale · (R − 0.5), and the wanted
 * offset is k · u · r² · size/2.
 */
export function displacementScale(curvature: number, size: number): number {
	return +(2 * curvature * size).toFixed(2);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

export function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
	let a = 1;
	let b = 0;
	for (const v of bytes) {
		a = (a + v) % 65521;
		b = (b + a) % 65521;
	}
	return ((b << 16) | a) >>> 0;
}

/**
 * Minimal PNG encoder for 8-bit RGB pixels: no filtering, and "stored" (uncompressed) deflate
 * blocks, which every decoder must accept. Small maps only (a 64×64 map is ~12 KB); in exchange
 * it needs no canvas, so the map is identical on the server and in every browser.
 */
export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
	// Raw scanlines, each prefixed with filter type 0
	const raw = new Uint8Array(height * (width * 3 + 1));
	for (let y = 0; y < height; y++) {
		raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
	}

	// zlib stream: header, stored deflate blocks of ≤ 65535 bytes, adler32
	const blocks: number[] = [0x78, 0x01];
	for (let i = 0; i < raw.length || i === 0; i += 65535) {
		const chunk = raw.subarray(i, i + 65535);
		const last = i + 65535 >= raw.length ? 1 : 0;
		blocks.push(last, chunk.length & 255, chunk.length >> 8);
		blocks.push(~chunk.length & 255, (~chunk.length >> 8) & 255);
		blocks.push(...chunk);
	}
	const adler = adler32(raw);
	blocks.push(adler >>> 24, (adler >>> 16) & 255, (adler >>> 8) & 255, adler & 255);

	const chunk = (type: string, data: Uint8Array) => {
		const out = new Uint8Array(12 + data.length);
		const view = new DataView(out.buffer);
		view.setUint32(0, data.length);
		out.set(
			[...type].map((c) => c.charCodeAt(0)),
			4
		);
		out.set(data, 8);
		view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
		return out;
	};

	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	ihdr.set([8, 2, 0, 0, 0], 8); // 8 bit, truecolor, deflate, no filter, no interlace

	const parts = [
		new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', new Uint8Array(blocks)),
		chunk('IEND', new Uint8Array())
	];
	const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const p of parts) {
		png.set(p, offset);
		offset += p.length;
	}
	return png;
}

function base64(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

let cachedMap: string | undefined;

/** The barrel map as a PNG data URL (computed once). */
export function barrelMapUrl(): string {
	cachedMap ??= `data:image/png;base64,${base64(encodePng(64, 64, barrelMap(64)))}`;
	return cachedMap;
}

// ---------------------------------------------------------------------------------------------
// Readability

/** `#rrggbb` scaled per channel (in gamma-encoded sRGB, like CSS blending), back to hex. */
function scaled(hex: string, factors: [number, number, number]): string {
	const n = Number.parseInt(hex.slice(1), 16);
	const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * factors[i]));
	return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text contrast at the darkest text pixel: phosphor-colored text inside a scanline gap
 * (multiplied by 1 − scanlines) and under the mask stripe that dims it most (two channels
 * multiplied by 1 − mask), against the undimmed background. Conservative: strokes span several
 * lines and stripes, so the perceived contrast is higher. Glow and vignette are not included.
 */
export function worstTextContrast({
	phosphor,
	background,
	scanlines,
	mask
}: Pick<CrtOptions, 'phosphor' | 'background' | 'scanlines' | 'mask'>): number {
	const line = 1 - scanlines;
	const dim = (1 - mask) * line;
	const stripes: [number, number, number][] = [
		[line, dim, dim],
		[dim, line, dim],
		[dim, dim, line]
	];
	const darkest = Math.min(...stripes.map((f) => contrastRatio(scaled(phosphor, f), background)));
	return +darkest.toFixed(2);
}
