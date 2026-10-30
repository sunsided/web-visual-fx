<!--
@component
Decorative thumbnail of the scroll reveal: a thumbnail can't be scrolled, so a time-based loop plays
what scrolling would do. A column of cards drifts up while each card fades up into place, and a
progress bar fills along the top. Pauses inside `data-motion="paused"` and shows the end state
under reduced motion.
-->
<div class="scroll-reveal-preview" aria-hidden="true">
	<span class="bar"></span>
	<div class="column">
		{#each [0, 1, 2, 3] as i (i)}
			<span class="card" style:--_i={i}>
				<span class="dot"></span>
				<span class="line"></span>
			</span>
		{/each}
	</div>
</div>

<style>
	.scroll-reveal-preview {
		--_loop: 5s;

		position: relative;
		display: grid;
		justify-items: center;
		block-size: 100%;
		overflow: hidden;
		background:
			radial-gradient(circle at 70% 10%, oklch(30% 0.08 285), transparent 60%), oklch(13% 0.02 285);
	}

	.bar {
		position: absolute;
		inset: 0 0 auto;
		block-size: 4px;
		background: #a78bfa;
		transform-origin: 0 50%;
	}

	.column {
		display: grid;
		gap: 10px;
		inline-size: min(70%, 12rem);
		padding-block: 18% 0;
	}

	.card {
		display: flex;
		gap: 8px;
		align-items: center;
		block-size: 2.4rem;
		padding-inline: 10px;
		border: 1px solid oklch(100% 0 0 / 0.14);
		border-radius: 8px;
		background: #1d1a2b;
	}

	.dot {
		flex: none;
		inline-size: 14px;
		aspect-ratio: 1;
		border-radius: 50%;
		background: linear-gradient(135deg, #a78bfa, #22d3ee);
	}

	.line {
		inline-size: 60%;
		block-size: 4px;
		border-radius: 2px;
		background: oklch(100% 0 0 / 0.3);
	}

	@media (prefers-reduced-motion: no-preference) {
		.bar {
			animation: fill var(--_loop) linear infinite;
		}

		.column {
			animation: drift var(--_loop) linear infinite;
		}

		.card {
			animation: card var(--_loop) var(--ease-out) backwards infinite;
			animation-delay: calc(var(--_i) * var(--_loop) * 0.12);
		}
	}

	@keyframes fill {
		from {
			scale: 0 1;
		}
		to {
			scale: 1 1;
		}
	}

	@keyframes drift {
		from {
			translate: 0 20%;
		}
		to {
			translate: 0 -10%;
		}
	}

	@keyframes card {
		0% {
			opacity: 0;
			translate: 0 24px;
		}
		30%,
		90% {
			opacity: 1;
			translate: none;
		}
		100% {
			opacity: 0;
			translate: none;
		}
	}
</style>
