<!--
@component
Neon sign: real, selectable text lit by stacked, blurred shadows in the tube color, with an
optional flicker on one letter (or the whole sign), a one-off power-on stutter and a dead
letter that stays readable in its unlit color.

Every visual parameter is a prop (see `neonSchema`). `text` is the sign's text; it is split into
as few spans as the flicker and dead letter need, so a plain sign stays one text node.

Motion: flicker and power-on are stepped CSS animations of registered custom properties; they
stop under `prefers-reduced-motion: reduce` (the sign is then simply lit) and pause inside a
`[data-motion='paused']` region (see `MotionToggle`). The flicker is limited to two dips in any
second (WCAG 2.3.1, see `FLICKER_STEPS` in `neon.ts`).

Tokens: `--neon-bg` (overrides the wall color), `--neon-font` (overrides the font stack).
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		FLICKER_CYCLE,
		FONT_STACKS,
		POWER_ON_DURATION,
		glowRadii,
		letterRuns,
		litColor,
		neonDefaults as d,
		neonDropShadow,
		neonTextShadow,
		unlitColor,
		type NeonOptions
	} from './neon.js';

	type Props = Partial<NeonOptions> &
		Omit<HTMLAttributes<HTMLSpanElement>, keyof NeonOptions> & {
			/** The sign's text. */
			text?: string;
		};

	let {
		text = 'Open late',
		tube = d.tube,
		core = d.core,
		background = d.background,
		glow = d.glow,
		layers = d.layers,
		intensity = d.intensity,
		technique = d.technique,
		font = d.font,
		flicker = d.flicker,
		flickerLetter = d.flickerLetter,
		flickerDepth = d.flickerDepth,
		powerOn = d.powerOn,
		offLetter = d.offLetter,
		class: className,
		...rest
	}: Props = $props();

	let runs = $derived(
		letterRuns(text, {
			flickerLetter: flicker ? flickerLetter : 0,
			offLetter,
			wholeSign: flicker && flickerLetter === 0
		})
	);

	// The glow color is resolved on each run (it depends on that run's --neon-on), so the shadow
	// list is set there too: a var() in a custom property on the root would resolve too early.
	let radii = $derived(glowRadii(glow, layers));
	let shadow = $derived(
		technique === 'text-shadow' ? neonTextShadow(radii, 'var(--_glow)', 'var(--_halo)') : undefined
	);
	let filter = $derived(
		technique === 'drop-shadow' ? neonDropShadow(radii, 'var(--_glow)', 'var(--_halo)') : undefined
	);
</script>

<span
	class={['neon', { 'power-on': powerOn }, className]}
	style:--_bg={background}
	style:--_tube={tube}
	style:--_lit={litColor(tube, core)}
	style:--_unlit={unlitColor(tube, background)}
	style:--_intensity={intensity}
	style:--_depth={flickerDepth}
	style:--_font={FONT_STACKS[font]}
	style:--_cycle="{FLICKER_CYCLE}s"
	style:--_power="{POWER_ON_DURATION}s"
	{...rest}
	>{#each runs as run, i (i)}<span
			class={['run', run.state]}
			style:text-shadow={run.state === 'off' ? undefined : shadow}
			style:filter={run.state === 'off' ? undefined : filter}>{run.text}</span
		>{/each}</span
>

<style>
	/*
	 * Registered, so the browser can resolve calc() with them. Unregistered they would still
	 * animate, discretely: for a stepped animation that is the same thing.
	 */
	@property --neon-on {
		syntax: '<number>';
		inherits: false;
		initial-value: 1;
	}

	@property --neon-power {
		syntax: '<number>';
		inherits: true;
		initial-value: 1;
	}

	.neon {
		display: inline-block;
		padding: 0.2em 0.45em;
		/* the glow of each run must not escape behind the wall color */
		isolation: isolate;
		background: var(--neon-bg, var(--_bg));
		font-family: var(--neon-font, var(--_font));
		line-height: 1.15;
	}

	.run {
		/* 1 = fully lit, 0 = unlit; power-on (inherited) times this run's flicker */
		--_level: calc(var(--neon-power, 1) * var(--neon-on, 1));
		--_glow: color-mix(
			in oklab,
			var(--_tube) calc(var(--_level) * var(--_intensity) * 100%),
			transparent
		);
		--_halo: color-mix(in oklab, var(--_lit) calc(var(--_level) * 100%), transparent);

		color: color-mix(in oklab, var(--_lit) calc(var(--_level) * 100%), var(--_unlit));
	}

	.run.off {
		color: var(--_unlit);
	}

	.power-on {
		animation: neon-power var(--_power) step-end both;
	}

	.run.flicker {
		animation: neon-flicker var(--_cycle) step-end infinite;
	}

	/* Generated from POWER_ON_STEPS and POWER_ON_DURATION (neon.ts); a spec keeps them in sync. */
	@keyframes neon-power {
		0% {
			--neon-power: 0;
		}
		29.1667% {
			--neon-power: 1;
		}
		37.5% {
			--neon-power: 0.15;
		}
		75% {
			--neon-power: 1;
		}
		100% {
			--neon-power: 1;
		}
	}

	/* Generated from FLICKER_STEPS and FLICKER_CYCLE (neon.ts); a spec keeps them in sync. */
	@keyframes neon-flicker {
		0% {
			--neon-on: 1;
		}
		40% {
			--neon-on: calc(1 - var(--_depth) * 1);
		}
		41.3333% {
			--neon-on: 1;
		}
		45% {
			--neon-on: calc(1 - var(--_depth) * 0.6);
		}
		46.3333% {
			--neon-on: 1;
		}
		80% {
			--neon-on: calc(1 - var(--_depth) * 0.9);
		}
		82% {
			--neon-on: 1;
		}
		100% {
			--neon-on: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.power-on,
		.run.flicker {
			animation: none;
		}
	}
</style>
