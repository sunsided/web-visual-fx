<!--
@component
Decorative thumbnail of the holographic foil: a small card whose foil drifts in a slow CSS loop.
No JavaScript loop; pauses inside `data-motion="paused"` and stands still under reduced motion.
-->
<script lang="ts">
	import { foilBackground } from './holo.js';

	const foil = foilBackground('stripes', 6, 360);
</script>

<div class="holo-preview" aria-hidden="true">
	<div class="card">
		<div class="art"></div>
		<div
			class="foil"
			style:background-image={foil.image}
			style:background-blend-mode={foil.blend}
		></div>
		<div class="plate"></div>
	</div>
</div>

<style>
	.holo-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		perspective: 500px;
		background: radial-gradient(circle at 50% 40%, oklch(34% 0.07 285), oklch(16% 0.03 285));
	}

	.card {
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-rows: 1.3fr 1fr;
		gap: 6%;
		block-size: 78%;
		aspect-ratio: 5 / 7;
		padding: 6%;
		border-radius: 8px;
		background: linear-gradient(
			160deg,
			oklch(42% 0.09 260),
			oklch(30% 0.08 300) 55%,
			oklch(24% 0.06 330)
		);
		transform: rotateY(-12deg) rotateX(6deg);
		box-shadow: 0 10px 24px oklch(0% 0 0 / 0.4);
	}

	.art {
		border-radius: 4px;
		background: linear-gradient(oklch(30% 0.1 280), oklch(60% 0.14 330));
	}

	.plate {
		position: relative;
		z-index: 2;
		border-radius: 4px;
		background: oklch(17% 0.03 285 / 0.94);
	}

	.foil {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
		background-size:
			auto,
			300% 300%;
		background-position:
			0 0,
			20% 30%;
		mix-blend-mode: color-dodge;
		opacity: 0.8;
		filter: brightness(0.75) contrast(1.4) saturate(1.3);
	}

	@media (prefers-reduced-motion: no-preference) {
		.card {
			animation: sway 7s var(--ease-in-out) infinite alternate;
		}

		.foil {
			animation: drift 7s var(--ease-in-out) infinite alternate;
		}
	}

	@keyframes sway {
		to {
			transform: rotateY(12deg) rotateX(-6deg);
		}
	}

	@keyframes drift {
		to {
			background-position:
				0 0,
				80% 70%;
		}
	}
</style>
