<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/atoms/Button.svelte';
	import CodeSnippet from '#lib/components/molecules/CodeSnippet.svelte';
	import MotionToggle from '#lib/components/molecules/MotionToggle.svelte';
	import StageHeader from '#lib/components/molecules/StageHeader.svelte';
	import ControlPanel from '#lib/components/organisms/ControlPanel.svelte';
	import Explainer from '#lib/components/organisms/Explainer.svelte';
	import ParamControls from '#lib/components/organisms/ParamControls.svelte';
	import PlaygroundLayout from '#lib/components/templates/PlaygroundLayout.svelte';
	import Landscape from '#lib/fx/duotone/Landscape.svelte';
	import {
		DROP_SHADER,
		RENDER_SHADER,
		settleSteps,
		UPDATE_SHADER,
		waterSimSchema,
		type WaterRendererState
	} from '#lib/fx/water-sim/water-sim.js';
	import WaterSim from '#lib/fx/water-sim/WaterSim.svelte';
	import { defineSchema } from '#lib/params/schema.js';
	import { ParamState } from '#lib/params/state.svelte.js';

	const sourceSchema = defineSchema({
		source: {
			kind: 'select',
			label: 'Image',
			default: 'pool tiles',
			options: ['pool tiles', 'landscape'],
			group: 'Stage',
			description:
				'pool tiles: drawn procedurally. landscape: an SVG illustration rasterized into the texture (any image URL works as src).'
		}
	});

	const water = new ParamState(waterSimSchema);
	const source = new ParamState(sourceSchema);
	let paused = $state(false);
	let renderer = $state<WaterRendererState>('pending');
	let sim = $state<WaterSim>();

	function reset() {
		water.reset();
		source.reset();
	}

	// The landscape is a Svelte component; serialize its SVG once into a Blob URL for the texture.
	let landscapeHost = $state<HTMLDivElement>();
	let landscapeUrl = $state<string>();
	onMount(() => {
		const svg = landscapeHost?.querySelector('svg');
		if (!svg) return;
		const clone = svg.cloneNode(true) as SVGSVGElement;
		clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		clone.setAttribute('width', '1600');
		clone.setAttribute('height', '1000');
		const url = URL.createObjectURL(
			new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
		);
		landscapeUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	let src = $derived(source.values.source === 'landscape' ? landscapeUrl : undefined);

	let status = $derived(
		{
			pending: 'Starting…',
			webgl2: 'Simulating with WebGL2.',
			static: 'Still image: WebGL2 with float render targets is not available here.',
			lost: 'WebGL context lost; showing the still image until it is restored.'
		}[renderer]
	);

	// Keyboard alternative to clicking: a drop at a random spot.
	function randomDrop() {
		sim?.drop(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6);
	}

	// Demonstrates the context-loss path: lose the context, restore it a second later.
	function simulateLoss() {
		const canvas = document.querySelector<HTMLCanvasElement>('.water-stage canvas');
		const ext = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context');
		if (!ext) return;
		ext.loseContext();
		setTimeout(() => ext.restoreContext(), 1000);
	}

	let ringSteps = $derived(settleSteps(water.values.damping));

	const loopCode = [
		`// ping-pong: read state A, write state B, swap`,
		`function pass(program, uniforms) {`,
		`  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1 - current]);`,
		`  gl.viewport(0, 0, sim.width, sim.height);`,
		`  gl.useProgram(program);`,
		`  gl.bindTexture(gl.TEXTURE_2D, textures[current]);`,
		`  uniforms();`,
		`  gl.drawArrays(gl.TRIANGLES, 0, 3); // one triangle covers the target`,
		`  current = 1 - current;`,
		`}`,
		``,
		`function frame(now) {`,
		`  for (const d of drops.splice(0)) pass(dropProgram, () => setDrop(d));`,
		`  for (let i = 0; i < steps; i++) pass(updateProgram, () => setDamping(damping));`,
		`  render(); // to the canvas: refract the image through the surface`,
		`  if (!settled) requestAnimationFrame(frame);`,
		`}`
	].join('\n');

	const setupCode = [
		`const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });`,
		`// float render targets are an extension even in WebGL2`,
		`gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float');`,
		``,
		`gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);`,
		``,
		`canvas.addEventListener('webglcontextlost', (e) => {`,
		`  e.preventDefault(); // "I can restore": without it, no restored event`,
		`  stopLoop(); showStillImage();`,
		`});`,
		`canvas.addEventListener('webglcontextrestored', () => createEverythingAgain());`
	].join('\n');
</script>

<svelte:head>
	<title>Water simulation · Visual FX</title>
	<meta
		name="description"
		content="Experimental WebGL2 tier: an interactive water ripple simulation on the GPU with ping-pong framebuffers, refracting an image, with a static fallback."
	/>
</svelte:head>

<!-- Source for the landscape texture; never shown. -->
<div class="landscape-source" bind:this={landscapeHost} aria-hidden="true"><Landscape /></div>

<PlaygroundLayout stageLabel="Water simulation demo">
	{#snippet header()}
		<StageHeader title="Water (WebGL2)" backHref={resolve('/')} infoHref="#how-it-works" />
	{/snippet}

	{#snippet stage()}
		<div class="room" data-motion={paused ? 'paused' : 'running'}>
			<WaterSim {...water.values} {src} bind:this={sim} bind:renderer class="water-stage">
				<div class="card">
					<p class="badge">Experimental tier · WebGL2</p>
					<h2>Click the water</h2>
					<p>
						A wave equation runs on the GPU, a few hundred cells wide, and the image below is bent
						through the surface it computes. The card is ordinary HTML on top.
					</p>
					<p class="status" role="status">{status}</p>
				</div>
			</WaterSim>
		</div>
	{/snippet}

	{#snippet panel()}
		<ControlPanel title="Water" code={water.markup('WaterSim')} onreset={reset}>
			<p class="flag">
				<strong>Experimental.</strong> Needs WebGL2 with float render targets; otherwise a still image.
			</p>
			<div class="actions">
				<Button size="sm" variant="ghost" onclick={randomDrop}>Drop a stone</Button>
				<MotionToggle bind:paused size="sm" />
			</div>
			<ParamControls schema={waterSimSchema} bind:values={water.values} />
			<ParamControls schema={sourceSchema} bind:values={source.values} />
			<Button size="sm" variant="ghost" onclick={simulateLoss}>Simulate context loss</Button>
		</ControlPanel>
	{/snippet}

	{#snippet article()}
		<Explainer
			title="A wave equation in two textures"
			lede="This is a flagged, experimental effect, and the only one in the library that needs WebGL. Everything else here is CSS and SVG filters, which can't keep state from one frame to the next. Water ripples need exactly that: the surface now depends on the surface a moment ago."
		>
			<h3>1. The height field</h3>
			<p>
				The water is a grid of cells, each with a height and a vertical velocity, stored in the red
				and green channels of a float texture. One simulation step pulls every cell towards the
				weighted average of its eight neighbors, damps the velocity and moves the height:
			</p>
			<CodeSnippet code={UPDATE_SHADER} />
			<p>
				<code>avg − height</code> is a discrete Laplacian, the curvature of the surface, so this is
				the wave equation, integrated one step at a time. A bump spreads out as a ring; the edges of
				the grid read clamped coordinates, which acts like a wall and reflects the waves back. With
				<em>Damping</em> at {water.values.damping}, a ripple takes about {ringSteps} steps to fade to
				a thousandth of its height; after that many steps without a new drop (and with no rain) the animation
				loop stops by itself.
			</p>

			<h3>2. Ping-pong framebuffers</h3>
			<p>
				A shader can't read and write the same texture in one pass. So there are two: each step
				reads state A and renders the new state into B through a framebuffer, then the two swap
				roles. A drop is the same kind of pass with a different shader, which adds a smooth cosine
				bump around a point:
			</p>
			<CodeSnippet code={DROP_SHADER} />
			<CodeSnippet code={loopCode} />
			<p>
				The clock is fixed: every 1/60 s runs <em>Steps per frame</em> steps, whatever the display's
				refresh rate, so waves travel at the same speed on 60 and 120 Hz screens. Waves move about
				half a cell per step, which is why a coarser grid (lower <em>Grid resolution</em>) also
				makes them faster and wider. The grid is capped at 512 cells on the long side.
			</p>

			<h3>3. Refraction and glint</h3>
			<p>
				The last pass draws to the canvas. The surface normal comes from the height differences
				between neighboring cells. The image is sampled with an offset along the normal, which is
				refraction in the loosest sense (no depth, no Snell's law, but the eye doesn't mind), then
				mixed with the water color. A Phong term adds a sun glint where a slope mirrors the light
				towards the viewer.
			</p>
			<CodeSnippet code={RENDER_SHADER} />
			<p>
				WebGL can't read the page, so the water can only bend an image it has been given:
				<code>src</code>, or a procedurally drawn pool floor. The <em>landscape</em> option is the SVG
				illustration from the duotone page, serialized into a Blob URL and rasterized. HTML on top (the
				card) is not refracted; it stays real, selectable text.
			</p>

			<h3>4. Being a good citizen</h3>
			<CodeSnippet code={setupCode} />
			<ul>
				<li>
					<strong>Context loss.</strong> The GPU process can drop a context at any time (driver
					reset, too many contexts, a laptop switching GPUs). The component calls
					<code>preventDefault()</code> on <code>webglcontextlost</code>, shows the still image and
					rebuilds every program and texture on <code>webglcontextrestored</code>. Try
					<em>Simulate context loss</em>, which uses <code>WEBGL_lose_context</code>.
				</li>
				<li>
					<strong>Pixel ratio cap.</strong> The render pass runs once per device pixel; on a 3×
					phone that is nine times the pixels of 1×. <em>Max pixel ratio</em> (2 by default) caps the
					canvas backing store; the simulation grid has its own, lower resolution.
				</li>
				<li>
					<strong>When it runs.</strong> Only on screen (IntersectionObserver), in a visible tab,
					and not under <code>prefers-reduced-motion: reduce</code>, with <code>paused</code>, or
					inside a
					<code>data-motion="paused"</code> region. A JavaScript loop isn't paused by the CSS rule that
					stops the other effects, so the component looks for a paused ancestor itself and watches the
					attribute. Under reduced motion it renders one still frame of flat water.
				</li>
				<li>
					<strong>Cleanup.</strong> On destroy it deletes its textures, framebuffers and programs
					and releases the context with <code>WEBGL_lose_context</code> instead of waiting for garbage
					collection: browsers keep only a limited number of live contexts per page (often 16) and drop
					the oldest.
				</li>
				<li>
					<strong>Interaction.</strong> The canvas is decorative and <code>aria-hidden</code>.
					Pointer drops are a toy; <em>Drop a stone</em> does the same from the keyboard, and
					<em>Rain</em> moves the water without any input.
				</li>
			</ul>

			<h3>Browser support and performance</h3>
			<ul>
				<li>
					<strong>WebGL2</strong> is Baseline widely available (web-features,
					webstatus.dev/features/webgl2), but rendering into float textures still needs
					<code>EXT_color_buffer_float</code> or <code>EXT_color_buffer_half_float</code>. Both are
					common; where neither exists, where WebGL2 is blocklisted, or with hardware acceleration
					off, the component shows the still image. Half-float (RGBA16F) textures are filterable in
					core WebGL2, which the render pass uses to smooth the coarse grid.
				</li>
				<li>
					Checked in Chromium, including headless with SwiftShader (a software GPU). Firefox and
					Safari are untested.
				</li>
				<li>
					Per frame: two to eight simulation passes over at most 512 × 512 cells and one render pass
					over the canvas. Cheap for a GPU, but it keeps the GPU awake, which is why the loop stops
					as soon as the water is still and rain is off.
				</li>
				<li>
					This is a deliberately small, dependency-free WebGL2 example. For anything bigger (3D
					water, real caustics, fluid dynamics), use a WebGL library or WebGPU, which is not
					Baseline yet.
				</li>
			</ul>
		</Explainer>
	{/snippet}
</PlaygroundLayout>

<style>
	.landscape-source {
		position: absolute;
		inline-size: 0;
		block-size: 0;
		overflow: hidden;
	}

	.room {
		display: grid;
	}

	.room :global(.water-stage) {
		display: grid;
		place-items: center;
		padding: var(--space-16) var(--space-4) var(--space-4);
		cursor: crosshair;
	}

	.card {
		max-inline-size: 28rem;
		padding: var(--space-6);
		border-radius: var(--radius-xl);
		background: #04121ce6;
		color: #eef8fb;
		box-shadow: var(--shadow-3);
		cursor: auto;
	}

	.card h2 {
		margin-block: var(--space-2) var(--space-3);
		font-size: var(--text-2xl);
	}

	.card p {
		margin: 0;
	}

	.badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border: 1px solid #7fd3e6;
		border-radius: var(--radius-sm);
		color: #7fd3e6;
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.status {
		margin-block-start: var(--space-4) !important;
		font-size: var(--text-sm);
		opacity: 0.8;
	}

	.flag {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-inline-start: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-accent-subtle);
		font-size: var(--text-xs);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	@media (width >= 64rem) {
		.room :global(.water-stage) {
			padding-inline-end: calc(var(--space-4) + 22rem);
		}
	}
</style>
