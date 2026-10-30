<!--
@component
Decorative thumbnail of the view-transition reveal: a light card and its dark twin, with a circle
growing from a toggle button to uncover the dark one, in a CSS loop (the real effect needs a click).
Pauses inside `data-motion="paused"` and shows the half-revealed state under reduced motion.
-->
<script lang="ts">
	type Theme = 'light' | 'dark';
</script>

{#snippet card(theme: Theme)}
	<div class="card {theme}">
		<span class="avatar"></span>
		<span class="line long"></span>
		<span class="line"></span>
		<span class="bars"><span></span><span></span><span></span><span></span></span>
		<span class="toggle"></span>
	</div>
{/snippet}

<div class="view-transition-preview" aria-hidden="true">
	<div class="stack">
		{@render card('light')}
		<div class="reveal">{@render card('dark')}</div>
	</div>
</div>

<style>
	.view-transition-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		padding: 8%;
		background: oklch(13% 0.02 285);
	}

	.stack {
		display: grid;
		inline-size: min(100%, 13rem);
	}

	.stack > :global(*) {
		grid-area: 1 / 1;
	}

	.card {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px 10px;
		align-items: center;
		padding: 14px;
		border-radius: 12px;
		background: #f6f5fa;
		--_ink: oklch(30% 0.03 285 / 0.35);
		--_accent: #7c3aed;
	}

	.card.dark {
		background: #1d1a2b;
		--_ink: oklch(100% 0 0 / 0.3);
		--_accent: #a78bfa;
	}

	.avatar {
		grid-row: span 2;
		inline-size: 26px;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--_accent);
	}

	.line {
		inline-size: 50%;
		block-size: 5px;
		border-radius: 3px;
		background: var(--_ink);
	}

	.line.long {
		inline-size: 80%;
	}

	.bars {
		grid-column: 1 / -1;
		display: flex;
		gap: 6px;
		align-items: end;
		block-size: 36px;
	}

	.bars span {
		flex: 1;
		border-radius: 3px 3px 0 0;
		background: var(--_accent);
		opacity: 0.7;
	}

	.bars span:nth-child(1) {
		block-size: 40%;
	}

	.bars span:nth-child(2) {
		block-size: 75%;
	}

	.bars span:nth-child(3) {
		block-size: 55%;
	}

	.bars span:nth-child(4) {
		block-size: 95%;
	}

	.toggle {
		position: absolute;
		inset-block-start: 12px;
		inset-inline-end: 12px;
		inline-size: 14px;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--_accent);
	}

	/* The circle grows from the toggle (top right). */
	.reveal {
		clip-path: circle(60% at calc(100% - 19px) 19px);
	}

	@media (prefers-reduced-motion: no-preference) {
		.reveal {
			animation: reveal 4s var(--ease-in-out) infinite;
		}
	}

	@keyframes reveal {
		0%,
		15% {
			clip-path: circle(0% at calc(100% - 19px) 19px);
		}
		50%,
		100% {
			clip-path: circle(150% at calc(100% - 19px) 19px);
		}
	}
</style>
