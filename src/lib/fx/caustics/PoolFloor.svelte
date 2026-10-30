<!--
@component
Decorative pool floor drawn with CSS gradients: pale tiles with grout lines, a dark lane stripe
and a soft vignette. A stand-in content layer for the caustics effect. Fills its container.

Tokens: `--pool-tile` (tile size), `--pool-tile-color`, `--pool-grout-color`, `--pool-lane-color`.
-->
<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<div class={['pool-floor', className]} aria-hidden="true"></div>

<style>
	.pool-floor {
		--_tile: var(--pool-tile, 48px);
		--_grout: var(--pool-grout-color, oklch(78% 0.04 210));

		block-size: 100%;
		background:
			radial-gradient(ellipse at 50% 40%, transparent 40%, oklch(30% 0.06 230 / 0.45) 100%),
			linear-gradient(
					90deg,
					transparent calc(50% - 1.5 * var(--_tile)),
					var(--pool-lane-color, oklch(32% 0.08 255)) 0 calc(50% + 1.5 * var(--_tile)),
					transparent 0
				)
				0 0 / 100% 100% no-repeat,
			linear-gradient(90deg, var(--_grout) 2px, transparent 0) 0 0 / var(--_tile) var(--_tile),
			linear-gradient(var(--_grout) 2px, transparent 0) 0 0 / var(--_tile) var(--_tile),
			var(--pool-tile-color, oklch(90% 0.03 200));
	}
</style>
