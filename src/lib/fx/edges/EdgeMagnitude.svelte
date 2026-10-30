<!--
@component
Filter-primitive fragment (no `<filter>` of its own) that turns its input into an edge map: grey
lines whose brightness is the edge strength, on black, fully opaque.

[feGaussianBlur] → feColorMatrix (luminance or color, alpha 1) → per kernel: feConvolveMatrix
(bias 0.5) + feComponentTransfer (|2v − 1|) → [feComposite arithmetic: sum] → [feColorMatrix:
sum of the channels] → feComponentTransfer (threshold) → [feMorphology dilate].

Render it inside a `<filter>` (which should set `color-interpolation-filters`); later primitives
read the map by its `result` name. `prefix` keeps the intermediate result names unique.
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import {
		ABS_TABLE,
		channelSumMatrix,
		convolveAttrs,
		edgeKernels,
		edgesDefaults as d,
		opaqueColorMatrix,
		opaqueLuminanceMatrix,
		thresholdLinear,
		type EdgesOptions
	} from './edges.js';

	type Props = Partial<
		Pick<
			EdgesOptions,
			'operator' | 'size' | 'channels' | 'strength' | 'smoothing' | 'threshold' | 'lineWidth'
		>
	> & {
		/** Input of the first primitive, e.g. `SourceGraphic`. */
		in?: string;
		/** Result name of the finished edge map. */
		result: string;
		/** Prefix for intermediate result names. */
		prefix?: string;
	};

	let {
		in: input = 'SourceGraphic',
		result,
		prefix = 'edge',
		operator = d.operator,
		size = d.size,
		channels = d.channels,
		strength = d.strength,
		smoothing = d.smoothing,
		threshold = d.threshold,
		lineWidth = d.lineWidth
	}: Props = $props();

	const luminance = opaqueLuminanceMatrix().join(' ');
	const color = opaqueColorMatrix().join(' ');
	const sum = channelSumMatrix().join(' ');

	let kernels = $derived(edgeKernels(operator, size).map((k) => convolveAttrs(k, strength)));
	let cut = $derived(thresholdLinear(threshold));
</script>

{#if smoothing > 0}
	<feGaussianBlur in={input} stdDeviation={smoothing} result="{prefix}-soft" />
{/if}
<feColorMatrix
	in={smoothing > 0 ? `${prefix}-soft` : input}
	type="matrix"
	values={channels === 'color' ? color : luminance}
	result="{prefix}-gray"
/>
{#each kernels as k, i (i)}
	<!-- Duplicate the border pixels, so the frame of the element isn't an edge. -->
	<feConvolveMatrix
		in="{prefix}-gray"
		order={k.order}
		kernelMatrix={k.kernelMatrix}
		divisor={k.divisor}
		bias={k.bias}
		edgeMode="duplicate"
		preserveAlpha="true"
	/>
	<feComponentTransfer result="{prefix}-g{i}">
		<feFuncR type="table" tableValues={ABS_TABLE} />
		<feFuncG type="table" tableValues={ABS_TABLE} />
		<feFuncB type="table" tableValues={ABS_TABLE} />
	</feComponentTransfer>
{/each}
{#if kernels.length > 1}
	<feComposite in="{prefix}-g0" in2="{prefix}-g1" operator="arithmetic" k2="1" k3="1" />
{/if}
{#if channels === 'color'}
	<feColorMatrix type="matrix" values={sum} />
{/if}
<feComponentTransfer result={lineWidth > 0 ? `${prefix}-thin` : result}>
	<feFuncR type="linear" slope={cut.slope} intercept={cut.intercept} />
	<feFuncG type="linear" slope={cut.slope} intercept={cut.intercept} />
	<feFuncB type="linear" slope={cut.slope} intercept={cut.intercept} />
</feComponentTransfer>
{#if lineWidth > 0}
	<feMorphology in="{prefix}-thin" operator="dilate" radius={lineWidth} {result} />
{/if}
