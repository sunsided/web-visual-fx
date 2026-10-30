<!--
@component
Sample content for the ink-bleed demos: hand-lettering style text and a few painted shapes
(washes, dabs and a brush stroke) in ink and watercolor colors. Purely presentational; the text
is real text.
-->
<script lang="ts" module>
	export const samples = ['both', 'lettering', 'shapes'] as const;
	export type InkSampleKind = (typeof samples)[number];
</script>

<script lang="ts">
	interface Props {
		kind?: InkSampleKind;
		class?: string;
	}

	let { kind = 'both', class: className }: Props = $props();
</script>

<div class={['ink-sample', kind, className]}>
	{#if kind !== 'lettering'}
		<svg
			class="shapes"
			viewBox="0 0 400 300"
			preserveAspectRatio="xMidYMid meet"
			aria-hidden="true"
		>
			<rect
				x="40"
				y="150"
				width="190"
				height="110"
				rx="6"
				fill="#2f6f8f"
				transform="rotate(-4 135 205)"
			/>
			<circle cx="290" cy="110" r="70" fill="#e0a526" />
			<circle cx="235" cy="185" r="48" fill="#c4384a" />
			<path
				d="M 50 70 C 110 20, 170 120, 230 60 S 330 40, 360 230"
				fill="none"
				stroke="#1d2340"
				stroke-width="10"
				stroke-linecap="round"
			/>
			<circle cx="330" cy="250" r="14" fill="#1d2340" />
		</svg>
	{/if}
	{#if kind !== 'shapes'}
		<div class="lettering">
			<h2>Ink &amp; water</h2>
		</div>
	{/if}
</div>

<style>
	.ink-sample {
		display: grid;
		place-items: center;
		gap: 1.5rem;
		block-size: 100%;
		padding: 2rem;
		color: #1d2340;
	}

	.both {
		grid-template-rows: minmax(0, 1fr) auto;
	}

	.shapes {
		inline-size: 100%;
		block-size: 100%;
		max-block-size: 22rem;
	}

	.lettering {
		max-inline-size: 34rem;
		text-align: center;
	}

	h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2.5rem, 8vw, 5.5rem);
		font-style: italic;
		line-height: 1;
	}
</style>
