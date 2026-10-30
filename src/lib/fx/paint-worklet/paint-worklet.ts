/**
 * Experimental tier: generative patterns painted by a CSS Paint Worklet (`paint()`), with a
 * gradient twin for browsers without the CSS Painting API (everything but Chromium).
 *
 * The same module holds the painter itself (`paintPattern`), which is serialized into the worklet
 * source (`workletSource`), so the worklet and the unit tests run the exact same code.
 */
import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const paintPatterns = ['dots', 'squiggles', 'blobs'] as const;
export type PaintPatternKind = (typeof paintPatterns)[number];

export const paintRenderers = ['auto', 'gradient'] as const;
export type PaintRenderer = (typeof paintRenderers)[number];

/** Name passed to `registerPaint`, used as `paint(vfx-pattern)`. */
export const PAINT_NAME = 'vfx-pattern';

/** Seconds for one animation cycle of `--vfx-paint-phase` at speed 1. */
export const PHASE_DURATION = 6;

export const paintPatternSchema = defineSchema({
	pattern: {
		kind: 'select',
		label: 'Pattern',
		default: 'squiggles',
		options: paintPatterns,
		group: 'Pattern',
		description: 'dots: confetti dots. squiggles: short wavy strokes. blobs: organic filled shapes.'
	},
	size: {
		kind: 'range',
		label: 'Size',
		default: 16,
		min: 4,
		max: 60,
		step: 1,
		unit: 'px',
		group: 'Pattern',
		description: 'Diameter of a dot or blob, length scale of a squiggle.'
	},
	density: {
		kind: 'range',
		label: 'Density',
		default: 1,
		min: 0.2,
		max: 3,
		step: 0.05,
		group: 'Pattern',
		description: 'Shapes per area. The grid cell is 2.4 × size / √density.'
	},
	stroke: {
		kind: 'range',
		label: 'Stroke width',
		default: 3,
		min: 1,
		max: 10,
		step: 0.5,
		unit: 'px',
		group: 'Pattern',
		description: 'Line width of the squiggles.'
	},
	jitter: {
		kind: 'range',
		label: 'Jitter',
		default: 0.8,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Pattern',
		description:
			'How far each shape strays from its grid cell center, and how much sizes vary. 0 = a regular grid.'
	},
	seed: {
		kind: 'range',
		label: 'Seed',
		default: 7,
		min: 0,
		max: 100,
		step: 1,
		group: 'Pattern',
		description: 'Picks different, but repeatable, positions, sizes and colors.'
	},
	color1: { kind: 'color', label: 'Color 1', default: '#ff5c8a', group: 'Colors' },
	color2: { kind: 'color', label: 'Color 2', default: '#ffc94d', group: 'Colors' },
	color3: { kind: 'color', label: 'Color 3', default: '#4dd6c4', group: 'Colors' },
	background: { kind: 'color', label: 'Background', default: '#1b1640', group: 'Colors' },
	border: {
		kind: 'toggle',
		label: 'Border only',
		default: false,
		group: 'Shape',
		description: 'Paint the pattern only in a ring around the content (masked with mask-composite).'
	},
	borderWidth: {
		kind: 'range',
		label: 'Border width',
		default: 28,
		min: 4,
		max: 80,
		step: 1,
		unit: 'px',
		group: 'Shape',
		when: 'border'
	},
	radius: {
		kind: 'range',
		label: 'Corner radius',
		default: 24,
		min: 0,
		max: 80,
		step: 1,
		unit: 'px',
		group: 'Shape'
	},
	animate: {
		kind: 'toggle',
		label: 'Animate',
		default: false,
		group: 'Motion',
		description:
			'Animates the registered --vfx-paint-phase, so the worklet repaints every frame. Off under reduced motion; the gradient fallback stays still.'
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
	renderer: {
		kind: 'select',
		label: 'Renderer',
		default: 'auto',
		options: paintRenderers,
		group: 'Advanced',
		description:
			'auto: the paint worklet where the CSS Painting API exists (Chromium), the gradient twin elsewhere. gradient: always the twin, to compare.'
	}
});

export type PaintPatternOptions = Values<typeof paintPatternSchema>;

export const paintPatternDefaults: PaintPatternOptions = defaultsOf(paintPatternSchema);

/**
 * The registered custom properties the worklet reads (`inputProperties`). Registering them gives
 * them a type: the worklet receives computed, typed values (a `<length>` arrives in px), and the
 * phase can be animated with plain CSS keyframes, because a typed `<number>` interpolates.
 */
export const paintProperties = [
	{ name: '--vfx-paint-pattern', syntax: '<custom-ident>', initialValue: 'dots' },
	{ name: '--vfx-paint-seed', syntax: '<number>', initialValue: '0' },
	{ name: '--vfx-paint-density', syntax: '<number>', initialValue: '1' },
	{ name: '--vfx-paint-size', syntax: '<length>', initialValue: '16px' },
	{ name: '--vfx-paint-stroke', syntax: '<length>', initialValue: '3px' },
	{ name: '--vfx-paint-jitter', syntax: '<number>', initialValue: '0.8' },
	{ name: '--vfx-paint-phase', syntax: '<number>', initialValue: '0' },
	{ name: '--vfx-paint-color-1', syntax: '<color>', initialValue: 'black' },
	{ name: '--vfx-paint-color-2', syntax: '<color>', initialValue: 'black' },
	{ name: '--vfx-paint-color-3', syntax: '<color>', initialValue: 'black' }
] as const;

/** Inline custom properties for the options (the worklet's inputs). */
export function paintVars(o: PaintPatternOptions): Record<string, string> {
	return {
		'--vfx-paint-pattern': o.pattern,
		'--vfx-paint-seed': String(o.seed),
		'--vfx-paint-density': String(o.density),
		'--vfx-paint-size': `${o.size}px`,
		'--vfx-paint-stroke': `${o.stroke}px`,
		'--vfx-paint-jitter': String(o.jitter),
		'--vfx-paint-color-1': o.color1,
		'--vfx-paint-color-2': o.color2,
		'--vfx-paint-color-3': o.color3
	};
}

/** Grid cell edge in px: one shape per cell, so density scales the shape count per area. */
export function cellSize(size: number, density: number): number {
	return (size * 2.4) / Math.sqrt(Math.max(density, 0.01));
}

export interface PaintInput {
	pattern: string;
	seed: number;
	density: number;
	size: number;
	stroke: number;
	jitter: number;
	phase: number;
	colors: string[];
}

/** The subset of `CanvasRenderingContext2D` the painter uses (all of it exists in a worklet). */
export interface PaintContext {
	fillStyle: unknown;
	strokeStyle: unknown;
	lineWidth: number;
	lineCap: string;
	lineJoin: string;
	beginPath(): void;
	closePath(): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	arc(x: number, y: number, r: number, a0: number, a1: number): void;
	fill(): void;
	stroke(): void;
}

/**
 * Paints the pattern onto a 2D context of `width` × `height` CSS px. It is self-contained (no
 * imports, no outer variables) on purpose: `workletSource` embeds it with `toString()`, and the
 * worklet global scope has nothing else.
 *
 * Shapes sit on a jittered grid. Every cell seeds its own random generator from (seed, column,
 * row), so a cell keeps its shape when the element resizes: the pattern grows instead of
 * reshuffling. One cell of margin around the box lets shapes that start outside reach in.
 * Returns the number of shapes painted (for tests).
 */
export function paintPattern(
	ctx: PaintContext,
	width: number,
	height: number,
	input: PaintInput
): number {
	const TAU = Math.PI * 2;
	const size = Math.max(1, input.size);
	const cell = (size * 2.4) / Math.sqrt(Math.max(input.density, 0.01));
	const jitter = Math.min(1, Math.max(0, input.jitter));
	const colors = input.colors.length > 0 ? input.colors : ['black'];
	const cols = Math.ceil(width / cell) + 1;
	const rows = Math.ceil(height / cell) + 1;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.lineWidth = Math.max(0.5, input.stroke);
	let count = 0;
	for (let row = -1; row < rows; row++) {
		for (let col = -1; col < cols; col++) {
			// mulberry32, seeded from a hash of seed and cell.
			let a = (Math.imul(input.seed + 1, 0x9e3779b1) ^ Math.imul(col, 0x85ebca6b)) >>> 0;
			a = (a ^ Math.imul(row, 0xc2b2ae35)) >>> 0;
			const rand = () => {
				a = (a + 0x6d2b79f5) >>> 0;
				let t = a;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
			const x = (col + 0.5 + (rand() - 0.5) * jitter) * cell;
			const y = (row + 0.5 + (rand() - 0.5) * jitter) * cell;
			const scale = 1 + (rand() - 0.5) * jitter * 0.8;
			const color = colors[Math.floor(rand() * colors.length) % colors.length];
			const offset = rand();
			const angle = rand() * TAU;
			const wave = Math.sin(TAU * (input.phase + offset));
			const r = (size / 2) * scale;
			if (x + cell < 0 || y + cell < 0 || x - cell > width || y - cell > height) continue;
			ctx.beginPath();
			if (input.pattern === 'squiggles') {
				// A short sine stroke, two periods long, rotated; the phase slides the wave along it.
				const length = size * 2.2 * scale;
				const amplitude = size * 0.28;
				const cos = Math.cos(angle);
				const sin = Math.sin(angle);
				const steps = 16;
				for (let i = 0; i <= steps; i++) {
					const u = (i / steps - 0.5) * length;
					const v = amplitude * Math.sin((i / steps) * TAU * 2 + TAU * (input.phase + offset));
					const px = x + u * cos - v * sin;
					const py = y + u * sin + v * cos;
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
				ctx.strokeStyle = color;
				ctx.stroke();
			} else if (input.pattern === 'blobs') {
				// A closed radial curve: base radius plus three low harmonics with random phases.
				const k1 = rand() * TAU;
				const k2 = rand() * TAU;
				const k3 = rand() * TAU;
				const p = TAU * input.phase;
				const steps = 28;
				for (let i = 0; i < steps; i++) {
					const t = (i / steps) * TAU;
					const rr =
						r *
						(1 +
							0.18 * Math.sin(2 * t + k1 + p) +
							0.12 * Math.sin(3 * t + k2 - p) +
							0.07 * Math.sin(5 * t + k3 + p));
					const px = x + rr * Math.cos(t + angle);
					const py = y + rr * Math.sin(t + angle);
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
				ctx.closePath();
				ctx.fillStyle = color;
				ctx.fill();
			} else {
				// Dots breathe a little with the phase.
				ctx.arc(x, y, Math.max(0.5, r * (1 + 0.2 * wave)), 0, TAU);
				ctx.fillStyle = color;
				ctx.fill();
			}
			count++;
		}
	}
	return count;
}

/**
 * Turns a typed CSS value from the worklet's `StylePropertyMapReadOnly` into a number: computed
 * `<number>` and `<length>` values stringify as `12` or `12px`.
 */
function toNumber(value: unknown, fallback: number): number {
	const n = Number.parseFloat(String(value ?? ''));
	return Number.isFinite(n) ? n : fallback;
}

/**
 * JavaScript source of the worklet module: the painter plus a `registerPaint` class that reads
 * the registered properties. It is turned into a Blob URL at runtime (see `support.ts`), so the
 * package needs no static asset and works under any base path.
 */
export function workletSource(name = PAINT_NAME): string {
	const inputs = paintProperties.map((p) => p.name);
	return `// Generated by @sunsided/web-visual-fx (paint-worklet). Runs in a PaintWorkletGlobalScope.
const __name = (f) => f;
const paintPattern = ${paintPattern.toString()};
const toNumber = ${toNumber.toString()};
registerPaint(${JSON.stringify(name)}, class {
	static get inputProperties() { return ${JSON.stringify(inputs)}; }
	paint(ctx, geom, props) {
		const get = (n) => props.get(n);
		paintPattern(ctx, geom.width, geom.height, {
			pattern: String(get('--vfx-paint-pattern')).trim(),
			seed: toNumber(get('--vfx-paint-seed'), 0),
			density: toNumber(get('--vfx-paint-density'), 1),
			size: toNumber(get('--vfx-paint-size'), 16),
			stroke: toNumber(get('--vfx-paint-stroke'), 3),
			jitter: toNumber(get('--vfx-paint-jitter'), 0.8),
			phase: toNumber(get('--vfx-paint-phase'), 0),
			colors: [1, 2, 3].map((i) => String(get('--vfx-paint-color-' + i)).trim())
		});
	}
});
`;
}

export interface FallbackBackground {
	image: string;
	size: string;
	position: string;
}

/** Deterministic 0–1 values for the fallback layer offsets (same mulberry32 as the painter). */
function layerRandom(seed: number): () => number {
	let a = Math.imul(seed + 1, 0x9e3779b1) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const px = (v: number) => `${Math.round(v * 100) / 100}px`;

/**
 * The gradient twin: the same pattern, colors and scale with plain CSS gradients, for browsers
 * without the Painting API. It can't place every shape at random, so it overlays one repeating
 * tile per color with different, co-prime-ish tile sizes and seeded offsets; the overlap reads as
 * irregular. Static: the phase is not animated here.
 */
export function fallbackBackground(o: PaintPatternOptions): FallbackBackground {
	const colors = [o.color1, o.color2, o.color3];
	const rand = layerRandom(o.seed);
	const cell = cellSize(o.size, o.density);
	const layers: { image: string; size: string; position: string }[] = [];
	// Three tiles per color stacked would give 3 shapes per 3 cells²; scale the tiles so the total
	// count per area roughly matches one shape per cell. Ratios keep the repeats from lining up.
	const ratios = [1.53, 1.79, 2.11];
	if (o.pattern === 'squiggles') {
		// A continuous wave per color: a lower half ring (smile) at the top edge of a tile and an
		// upper half ring (frown) at its bottom edge. The tile edges crop the other halves, and the
		// rows meet exactly on the tile boundaries, so the arcs join into one line.
		// (Each wave crosses a tile boundary: its frown ends one row, its smile starts the next.)
		const r = Math.max(2, o.size * 0.45);
		const s = Math.max(0.5, o.stroke);
		const gap = Math.max(2 * r + s, cell);
		const h = gap * 3;
		const ring = (c: string, x: number, y: number) =>
			`radial-gradient(circle at ${px(x)} ${px(y)}, #0000 ${px(r - s / 2)}, ${c} ${px(r - s / 2 + 0.5)} ${px(r + s / 2 - 0.5)}, #0000 ${px(r + s / 2)})`;
		colors.forEach((c, i) => {
			// One period per tile followed by empty space: short squiggles instead of endless
			// waves. The gap differs per color, so the colors drift apart along the rows.
			const w = 4 * r + cell * ratios[i] * 0.6;
			const dx = rand() * w;
			const dy = i * gap;
			for (const [x, y] of [
				[r, 0],
				[3 * r, h]
			]) {
				layers.push({
					image: ring(c, x, y),
					size: `${px(w)} ${px(h)}`,
					position: `${px(dx)} ${px(dy)}`
				});
			}
		});
	} else {
		colors.forEach((c, i) => {
			const tile = cell * ratios[i];
			const r = (o.size / 2) * (o.pattern === 'blobs' ? 1.1 : 1);
			const cx = 0.5 + (rand() - 0.5) * o.jitter * 0.5;
			const cy = 0.5 + (rand() - 0.5) * o.jitter * 0.5;
			const at = `at ${Math.round(cx * 100)}% ${Math.round(cy * 100)}%`;
			const image =
				o.pattern === 'blobs'
					? `radial-gradient(ellipse ${px(r * (1 + rand() * 0.3))} ${px(r * (0.75 + rand() * 0.2))} ${at}, ${c} 92%, #0000 96%)`
					: `radial-gradient(circle ${px(r)} ${at}, ${c} calc(100% - 0.75px), #0000)`;
			layers.push({
				image,
				size: `${px(tile)} ${px(tile)}`,
				position: `${px(rand() * tile)} ${px(rand() * tile)}`
			});
		});
	}
	return {
		image: layers.map((l) => l.image).join(', '),
		size: layers.map((l) => l.size).join(', '),
		position: layers.map((l) => l.position).join(', ')
	};
}
