<!--
@component
Busy, colorful backdrop for showcasing effects that act on what is behind them.

Tokens: `--scene-a`, `--scene-b`, `--scene-c`, `--scene-bg`, `--scene-blob-opacity`,
`--scene-scrim` (any background, painted above the art and below the content — use it to keep
text readable).
-->
<script lang="ts" module>
	export const scenes = ['aurora', 'stripes', 'type', 'grid'] as const;
	export type SceneKind = (typeof scenes)[number];
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		kind?: SceneKind;
		animate?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { kind = 'aurora', animate = true, class: className, children }: Props = $props();
</script>

<div class={['scene', kind, { animate }, className]}>
	<div class="art" aria-hidden="true">
		{#if kind === 'aurora'}
			<span class="blob a"></span>
			<span class="blob b"></span>
			<span class="blob c"></span>
		{:else if kind === 'type'}
			<p>VISUAL<br />EFFECTS<br />ON THE<br />WEB</p>
		{/if}
	</div>
	{@render children?.()}
</div>

<style>
	.scene {
		--_a: var(--scene-a, oklch(70% 0.25 340));
		--_b: var(--scene-b, oklch(72% 0.2 220));
		--_c: var(--scene-c, oklch(85% 0.2 95));

		position: relative;
		isolation: isolate;
		overflow: hidden;
		background: var(--scene-bg, oklch(18% 0.04 280));
	}

	.art {
		position: absolute;
		inset: 0;
		z-index: -1;
	}

	.art::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--scene-scrim, none);
	}

	/* aurora */
	.blob {
		position: absolute;
		inline-size: 55vmax;
		aspect-ratio: 1;
		border-radius: 50%;
		filter: blur(40px);
		opacity: var(--scene-blob-opacity, 0.85);
	}

	.blob.a {
		background: var(--_a);
		inset: -15% auto auto -10%;
	}

	.blob.b {
		background: var(--_b);
		inset: auto -15% -20% auto;
		animation-delay: -6s;
	}

	.blob.c {
		background: var(--_c);
		inline-size: 30vmax;
		inset: 35% auto auto 40%;
		animation-delay: -12s;
	}

	.animate .blob {
		animation: drift 18s var(--ease-in-out) infinite alternate;
	}

	@keyframes drift {
		to {
			translate: 12vmax 8vmax;
			scale: 1.15;
		}
	}

	/* stripes */
	.stripes .art {
		background: repeating-linear-gradient(
			-45deg,
			var(--_a) 0 24px,
			var(--_b) 24px 48px,
			var(--_c) 48px 72px
		);
		background-size: 102px 102px;
	}

	.animate.stripes .art {
		animation: slide 4s linear infinite;
	}

	@keyframes slide {
		to {
			background-position: 102px 0;
		}
	}

	/* type */
	.type .art {
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, var(--_a), var(--_b));
	}

	.type p {
		color: var(--_c);
		font-size: var(--text-display);
		font-weight: 900;
		line-height: 0.85;
		letter-spacing: -0.04em;
		text-align: center;
	}

	/* grid */
	.grid .art {
		background:
			linear-gradient(90deg, oklch(100% 0 0 / 0.5) 2px, transparent 2px) 0 0 / 48px 48px,
			linear-gradient(oklch(100% 0 0 / 0.5) 2px, transparent 2px) 0 0 / 48px 48px,
			radial-gradient(circle at 30% 30%, var(--_a), transparent 50%),
			radial-gradient(circle at 70% 70%, var(--_b), transparent 50%),
			var(--scene-bg, oklch(18% 0.04 280));
	}

	@media (prefers-reduced-motion: reduce) {
		.animate .blob,
		.animate.stripes .art {
			animation: none;
		}
	}
</style>
