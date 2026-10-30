/**
 * Raw WebGL2 plumbing for the water simulation: three small programs, two float textures in
 * ping-pong framebuffers, one image texture. No library, no vertex buffers.
 */
import {
	DROP_SHADER,
	hexToRgb,
	RENDER_SHADER,
	UPDATE_SHADER,
	VERTEX_SHADER,
	type Size
} from './water-sim.js';

export interface Drop {
	/** UV, origin bottom-left. */
	x: number;
	y: number;
	/** Radius in simulation cells. */
	radius: number;
	strength: number;
}

export interface RenderParams {
	/** Refraction offset as a fraction of the canvas, per axis. */
	refraction: [number, number];
	specular: number;
	tint: string;
	tintAmount: number;
}

export interface WaterRenderer {
	/** Recreates the state textures (clears the water) if the grid size changed. */
	resize(sim: Size): void;
	/** Uploads the image behind the water. */
	setImage(source: TexImageSource): void;
	drop(d: Drop): void;
	step(damping: number, steps: number): void;
	render(canvas: Size, params: RenderParams): void;
	destroy(): void;
}

interface Program {
	program: WebGLProgram;
	uniforms: Record<string, WebGLUniformLocation | null>;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('createShader failed');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile failed: ${log}`);
	}
	return shader;
}

function link(
	gl: WebGL2RenderingContext,
	vertex: WebGLShader,
	fragment: string,
	uniforms: string[]
): Program {
	const program = gl.createProgram();
	const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
	gl.attachShader(program, vertex);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
		throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
	}
	return {
		program,
		uniforms: Object.fromEntries(uniforms.map((u) => [u, gl.getUniformLocation(program, u)]))
	};
}

/**
 * Float render targets need an extension even in WebGL2: `EXT_color_buffer_float` (desktop,
 * most phones) or `EXT_color_buffer_half_float`. RGBA16F is filterable in core WebGL2, which
 * the render pass relies on to smooth the coarser grid.
 */
export function floatTargets(gl: WebGL2RenderingContext): boolean {
	return !!(
		gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float')
	);
}

/** Sets up the simulation on a WebGL2 context. Throws if something is missing. */
export function createWaterRenderer(gl: WebGL2RenderingContext): WaterRenderer {
	if (!floatTargets(gl)) throw new Error('No renderable float textures');

	const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const update = link(gl, vertex, UPDATE_SHADER, ['uState', 'uDamping']);
	const dropper = link(gl, vertex, DROP_SHADER, ['uState', 'uCenter', 'uRadius', 'uStrength']);
	const render = link(gl, vertex, RENDER_SHADER, [
		'uState',
		'uImage',
		'uRefraction',
		'uSpecular',
		'uTint',
		'uTintAmount'
	]);
	gl.deleteShader(vertex);

	// Attribute-less drawing still needs a vertex array bound.
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	const image = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		new Uint8Array([0, 0, 0, 255])
	);

	let size: Size = { width: 0, height: 0 };
	let textures: WebGLTexture[] = [];
	let framebuffers: WebGLFramebuffer[] = [];
	// Index of the texture holding the current state.
	let current = 0;

	function freeTargets() {
		textures.forEach((t) => gl.deleteTexture(t));
		framebuffers.forEach((f) => gl.deleteFramebuffer(f));
		textures = [];
		framebuffers = [];
	}

	function resize(sim: Size) {
		if (sim.width === size.width && sim.height === size.height && textures.length) return;
		freeTargets();
		size = sim;
		for (let i = 0; i < 2; i++) {
			const t = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, t);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA16F,
				sim.width,
				sim.height,
				0,
				gl.RGBA,
				gl.HALF_FLOAT,
				null
			);
			const f = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, f);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
			if (
				gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE &&
				!gl.isContextLost()
			) {
				throw new Error('Float framebuffer incomplete');
			}
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			textures.push(t);
			framebuffers.push(f);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		current = 0;
	}

	/** Runs `p` reading the current state into the other target, then swaps. */
	function pass(p: Program, setUniforms: () => void) {
		const target = 1 - current;
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[target]);
		gl.viewport(0, 0, size.width, size.height);
		gl.useProgram(p.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[current]);
		gl.uniform1i(p.uniforms.uState, 0);
		setUniforms();
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		current = target;
	}

	return {
		resize,
		setImage(source) {
			gl.bindTexture(gl.TEXTURE_2D, image);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		},
		drop(d) {
			if (!textures.length) return;
			pass(dropper, () => {
				gl.uniform2f(dropper.uniforms.uCenter, d.x, d.y);
				gl.uniform1f(dropper.uniforms.uRadius, d.radius);
				gl.uniform1f(dropper.uniforms.uStrength, d.strength);
			});
		},
		step(damping, steps) {
			if (!textures.length) return;
			for (let i = 0; i < steps; i++) {
				pass(update, () => gl.uniform1f(update.uniforms.uDamping, damping));
			}
		},
		render(canvas, params) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.useProgram(render.program);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, textures[current] ?? null);
			gl.uniform1i(render.uniforms.uState, 0);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, image);
			gl.uniform1i(render.uniforms.uImage, 1);
			gl.uniform2f(render.uniforms.uRefraction, params.refraction[0], params.refraction[1]);
			gl.uniform1f(render.uniforms.uSpecular, params.specular);
			gl.uniform3f(render.uniforms.uTint, ...hexToRgb(params.tint));
			gl.uniform1f(render.uniforms.uTintAmount, params.tintAmount);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		destroy() {
			freeTargets();
			gl.deleteTexture(image);
			gl.deleteVertexArray(vao);
			for (const p of [update, dropper, render]) gl.deleteProgram(p.program);
		}
	};
}
