/**
 * Experimental tier: an interactive water surface simulated on the GPU with WebGL2. A height
 * field is stepped with the wave equation in a pair of ping-pong framebuffers; the image behind
 * the water is refracted through the surface normals. Pure helpers, schema and shader sources
 * live here; the WebGL plumbing is in `gl.ts`.
 */
import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

export const waterSimSchema = defineSchema({
	damping: {
		kind: 'range',
		label: 'Damping',
		default: 0.985,
		min: 0.95,
		max: 0.998,
		step: 0.001,
		group: 'Simulation',
		description:
			'Fraction of the wave velocity kept per simulation step. Higher rings longer; at 0.998 ripples cross the whole pool.'
	},
	speed: {
		kind: 'range',
		label: 'Steps per frame',
		default: 2,
		min: 1,
		max: 4,
		step: 1,
		group: 'Simulation',
		description:
			'Simulation steps per 1/60 s. Waves travel about half a grid cell per step, so this is their speed.'
	},
	resolution: {
		kind: 'range',
		label: 'Grid resolution',
		default: 0.5,
		min: 0.25,
		max: 1,
		step: 0.05,
		group: 'Simulation',
		description:
			'Simulation cells per CSS pixel (at most 512 on the long side). Lower is cheaper and makes waves faster and wider.'
	},
	dropRadius: {
		kind: 'range',
		label: 'Drop radius',
		default: 20,
		min: 4,
		max: 60,
		step: 1,
		unit: 'px',
		group: 'Drops'
	},
	dropStrength: {
		kind: 'range',
		label: 'Drop strength',
		default: 0.5,
		min: 0.05,
		max: 1.5,
		step: 0.05,
		group: 'Drops',
		description: 'Height of the bump a click adds (negative for a dent is not needed: it rebounds).'
	},
	trail: {
		kind: 'toggle',
		label: 'Pointer wake',
		default: true,
		group: 'Drops',
		description: 'Moving the pointer over the water drags a small wake behind it.'
	},
	rain: {
		kind: 'range',
		label: 'Rain',
		default: 0.6,
		min: 0,
		max: 10,
		step: 0.1,
		unit: '/s',
		group: 'Drops',
		description: 'Random drops per second, so the water moves without a pointer. 0 = still water.'
	},
	refraction: {
		kind: 'range',
		label: 'Refraction',
		default: 28,
		min: 0,
		max: 100,
		step: 1,
		unit: 'px',
		group: 'Look',
		description: 'How far the image behind shifts under a steep slope.'
	},
	specular: {
		kind: 'range',
		label: 'Highlights',
		default: 0.6,
		min: 0,
		max: 1.5,
		step: 0.05,
		group: 'Look',
		description: 'Strength of the sun glint on wave slopes (Phong reflection).'
	},
	tint: { kind: 'color', label: 'Water color', default: '#0a6c8f', group: 'Look' },
	tintAmount: {
		kind: 'range',
		label: 'Water tint',
		default: 0.25,
		min: 0,
		max: 1,
		step: 0.01,
		group: 'Look'
	},
	tileColor: {
		kind: 'color',
		label: 'Tile color',
		default: '#7fd3e6',
		group: 'Pool floor',
		description: 'Used when no image `src` is given: a procedural tiled pool floor.'
	},
	groutColor: { kind: 'color', label: 'Grout color', default: '#e9f7fb', group: 'Pool floor' },
	tileSize: {
		kind: 'range',
		label: 'Tile size',
		default: 40,
		min: 12,
		max: 120,
		step: 1,
		unit: 'px',
		group: 'Pool floor'
	},
	maxDpr: {
		kind: 'range',
		label: 'Max pixel ratio',
		default: 2,
		min: 1,
		max: 3,
		step: 0.25,
		group: 'Advanced',
		description:
			'Caps devicePixelRatio for the canvas. The render pass costs one shader run per device pixel.'
	}
});

export type WaterSimOptions = Values<typeof waterSimSchema>;

export const waterSimDefaults: WaterSimOptions = defaultsOf(waterSimSchema);

/** What `WaterSim` currently renders with: still image before hydration, without WebGL2 and while the context is lost. */
export type WaterRendererState = 'pending' | 'webgl2' | 'static' | 'lost';

/** Longest side of the simulation grid in cells. */
export const MAX_SIM_CELLS = 512;
/** Fixed simulation clock: one tick is 1/60 s, each tick runs `speed` steps. */
export const TICK = 1 / 60;
/** Never catch up more than this many ticks in one frame (after a stall). */
export const MAX_TICKS_PER_FRAME = 4;
/** Below this the water counts as still and the loop stops. */
export const SETTLE_THRESHOLD = 1e-3;

export interface Size {
	width: number;
	height: number;
}

/** Backing-store size of the canvas: CSS size × devicePixelRatio, capped at `maxDpr`. */
export function canvasSize(css: Size, dpr: number, maxDpr: number): Size {
	const ratio = Math.max(0.5, Math.min(dpr || 1, maxDpr));
	return {
		width: Math.max(1, Math.round(css.width * ratio)),
		height: Math.max(1, Math.round(css.height * ratio))
	};
}

/** Simulation grid: `resolution` cells per CSS px, scaled down to `max` cells on the long side. */
export function simSize(css: Size, resolution: number, max = MAX_SIM_CELLS): Size {
	let width = css.width * resolution;
	let height = css.height * resolution;
	const long = Math.max(width, height);
	if (long > max) {
		width = (width * max) / long;
		height = (height * max) / long;
	}
	return { width: Math.max(2, Math.round(width)), height: Math.max(2, Math.round(height)) };
}

/**
 * Steps until a ripple has decayed to `threshold` of its height: velocity shrinks by `damping`
 * every step, so after n steps it is damping^n. The component lets the loop run that long after
 * the last drop and then stops it.
 */
export function settleSteps(damping: number, threshold = SETTLE_THRESHOLD): number {
	if (damping <= 0) return 1;
	if (damping >= 1) return Infinity;
	return Math.ceil(Math.log(threshold) / Math.log(damping));
}

/**
 * Fixed-timestep accumulator: how many ticks to run for a frame of `dt` seconds, and the time
 * left over. Capped, so a stalled tab doesn't fire a burst of steps when it comes back.
 */
export function ticksFor(
	carry: number,
	dt: number,
	tick = TICK,
	max = MAX_TICKS_PER_FRAME
): { ticks: number; carry: number } {
	const total = carry + Math.max(0, dt);
	const ticks = Math.floor(total / tick + 1e-9);
	if (ticks > max) return { ticks: max, carry: 0 };
	return { ticks, carry: total - ticks * tick };
}

/**
 * Pointer position → simulation UV (0–1, origin bottom-left like GL textures), or undefined
 * outside the rectangle.
 */
export function pointerToUv(
	clientX: number,
	clientY: number,
	rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } | undefined {
	if (rect.width <= 0 || rect.height <= 0) return undefined;
	const x = (clientX - rect.left) / rect.width;
	const y = (clientY - rect.top) / rect.height;
	if (x < 0 || x > 1 || y < 0 || y > 1) return undefined;
	return { x, y: 1 - y };
}

/** Seconds until the next random drop for `rate` drops per second (Poisson process). */
export function nextRainDelay(rate: number, random: number): number {
	if (rate <= 0) return Infinity;
	return -Math.log(1 - Math.min(random, 0.999999)) / rate;
}

/** `#rrggbb` → linear 0–1 floats, as the shaders take them (the canvas is sRGB, so no decoding). */
export function hexToRgb(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Source rectangle for drawing an image with `object-fit: cover` into a target of the given
 * size: the centered crop of the image that has the target's aspect ratio.
 */
export function coverCrop(
	image: Size,
	target: Size
): { sx: number; sy: number; sw: number; sh: number } {
	const scale = Math.max(target.width / image.width, target.height / image.height);
	const sw = target.width / scale;
	const sh = target.height / scale;
	return { sx: (image.width - sw) / 2, sy: (image.height - sh) / 2, sw, sh };
}

/** Grout line width for a tile size, in the same unit. */
export function groutWidth(tileSize: number): number {
	return Math.max(1, Math.round(tileSize / 14));
}

/**
 * The procedural pool floor as CSS, for the static fallback: square tiles with grout lines and a
 * soft light from the top left. The WebGL path draws the same thing into a 2D canvas.
 */
export function poolFloorCss(
	o: Pick<WaterSimOptions, 'tileColor' | 'groutColor' | 'tileSize' | 'tint' | 'tintAmount'>
): { image: string; size: string } {
	const g = groutWidth(o.tileSize);
	const t = o.tileSize;
	const tint = `color-mix(in srgb, ${o.tint} ${Math.round(o.tintAmount * 100)}%, transparent)`;
	return {
		image: [
			`linear-gradient(${tint}, ${tint})`,
			`radial-gradient(ellipse at 30% 20%, #fff6 0%, #0000 60%)`,
			`linear-gradient(90deg, ${o.groutColor} ${g}px, #0000 0)`,
			`linear-gradient(${o.groutColor} ${g}px, #0000 0)`,
			`linear-gradient(${o.tileColor}, ${o.tileColor})`
		].join(', '),
		size: `auto, auto, ${t}px ${t}px, ${t}px ${t}px, auto`
	};
}

/** Draws the pool floor into a 2D context of `width` × `height` px at `scale` px per CSS px. */
export function drawPoolFloor(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	scale: number,
	o: Pick<WaterSimOptions, 'tileColor' | 'groutColor' | 'tileSize'>
): void {
	const t = o.tileSize * scale;
	const g = groutWidth(o.tileSize) * scale;
	ctx.fillStyle = o.tileColor;
	ctx.fillRect(0, 0, width, height);
	// A little per-tile variation, deterministic, so the floor doesn't look printed.
	for (let y = 0, row = 0; y < height; y += t, row++) {
		for (let x = 0, col = 0; x < width; x += t, col++) {
			const v = (Math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1;
			ctx.fillStyle = v > 0 ? `rgb(255 255 255 / ${v * 0.12})` : `rgb(0 0 0 / ${-v * 0.1})`;
			ctx.fillRect(x, y, t, t);
		}
	}
	ctx.fillStyle = o.groutColor;
	for (let x = 0; x < width; x += t) ctx.fillRect(x, 0, g, height);
	for (let y = 0; y < height; y += t) ctx.fillRect(0, y, width, g);
	const light = ctx.createRadialGradient(
		width * 0.3,
		height * 0.2,
		0,
		width * 0.3,
		height * 0.2,
		Math.max(width, height) * 0.8
	);
	light.addColorStop(0, 'rgb(255 255 255 / 0.3)');
	light.addColorStop(1, 'rgb(0 0 0 / 0.15)');
	ctx.fillStyle = light;
	ctx.fillRect(0, 0, width, height);
}

// --- Shaders (GLSL ES 3.00) ---------------------------------------------------------------------

/** One oversized triangle that covers the viewport; no vertex buffer needed (gl_VertexID). */
export const VERTEX_SHADER = `#version 300 es
out vec2 vUv;
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	vUv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * One step of the wave equation on a height field. State: r = height, g = vertical velocity.
 * The velocity is pulled towards the weighted average of the eight neighbors (a discrete Laplacian), damped,
 * then integrated into the height. texelFetch with clamped coordinates gives the edges a mirror
 * boundary, so waves bounce off the pool walls.
 */
export const UPDATE_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform float uDamping;
out vec4 outState;
void main() {
	ivec2 size = textureSize(uState, 0);
	ivec2 c = ivec2(gl_FragCoord.xy);
	ivec2 hi = size - 1;
	vec4 s = texelFetch(uState, c, 0);
	#define H(dx, dy) texelFetch(uState, clamp(c + ivec2(dx, dy), ivec2(0), hi), 0).r
	// 9-point average: edges weigh 0.2, corners 0.05. Rings stay round; a plain 4-neighbor
	// average spreads faster along the axes and turns them into rounded squares.
	float avg = 0.2 * (H(1, 0) + H(-1, 0) + H(0, 1) + H(0, -1)) +
		0.05 * (H(1, 1) + H(-1, 1) + H(1, -1) + H(-1, -1));
	// Gain 1 keeps the wave speed at √0.3 ≈ 0.55 cells per step, slow enough for the grid to resolve
	// the wavefront in every direction (at 2 the rings come out squarish).
	s.g += avg - s.r;
	s.g *= uDamping;
	s.r += s.g;
	outState = s;
}`;

/** Adds a smooth cosine bump of `uRadius` cells around `uCenter` (UV) to the height. */
export const DROP_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
out vec4 outState;
const float PI = 3.141592653589793;
void main() {
	vec2 size = vec2(textureSize(uState, 0));
	vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
	float d = length(gl_FragCoord.xy - uCenter * size) / max(uRadius, 1.0);
	float bump = max(0.0, 1.0 - d);
	s.r += (0.5 - 0.5 * cos(bump * PI)) * uStrength;
	outState = s;
}`;

/**
 * Draws the surface: the normal comes from the height gradient, the image behind is sampled at
 * an offset along it (refraction, cheap and not physical: no depth, no Snell), mixed with the
 * water color, and a Phong highlight is added where a slope reflects the light into the eye.
 */
export const RENDER_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uState;
uniform sampler2D uImage;
uniform vec2 uRefraction;
uniform float uSpecular;
uniform vec3 uTint;
uniform float uTintAmount;
out vec4 outColor;
void main() {
	vec2 t = 1.0 / vec2(textureSize(uState, 0));
	float hl = texture(uState, vUv - vec2(t.x, 0.0)).r;
	float hr = texture(uState, vUv + vec2(t.x, 0.0)).r;
	float hd = texture(uState, vUv - vec2(0.0, t.y)).r;
	float hu = texture(uState, vUv + vec2(0.0, t.y)).r;
	vec3 n = normalize(vec3(hl - hr, hd - hu, 0.08));
	vec3 color = texture(uImage, clamp(vUv + n.xy * uRefraction, 0.0, 1.0)).rgb;
	color = mix(color, uTint, uTintAmount);
	vec3 light = normalize(vec3(-0.45, 0.6, 1.0));
	float spec = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 80.0);
	color += spec * uSpecular;
	outColor = vec4(color, 1.0);
}`;
