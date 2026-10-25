<!--
@component
Decorative thumbnail of the squircle effect: three tiles slowly morphing between corner shapes.
Static rounded tiles where `corner-shape` isn't supported or the user prefers reduced motion.
-->
<div class="squircle-preview" aria-hidden="true">
	<span class="tile a"></span>
	<span class="tile b"></span>
	<span class="tile c"></span>
</div>

<style>
	.squircle-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10%;
		block-size: 100%;
		background: linear-gradient(135deg, oklch(93% 0.05 300), oklch(94% 0.05 220));
	}

	.tile {
		inline-size: 22%;
		aspect-ratio: 1;
		border-radius: 30%;
		corner-shape: squircle;
		animation: morph 9s var(--ease-in-out) infinite;
	}

	.a {
		background: oklch(62% 0.2 300);
	}

	.b {
		background: oklch(68% 0.15 220);
		animation-delay: -3s;
	}

	.c {
		background: oklch(70% 0.17 350);
		animation-delay: -6s;
	}

	@keyframes morph {
		0%,
		20% {
			corner-shape: squircle;
		}
		33%,
		53% {
			corner-shape: scoop;
		}
		66%,
		86% {
			corner-shape: bevel;
		}
		100% {
			corner-shape: squircle;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tile {
			animation: none;
		}
	}
</style>
