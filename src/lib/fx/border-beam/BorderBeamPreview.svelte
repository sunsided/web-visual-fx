<!--
@component
Decorative thumbnail of the border beam: a small card with a beam running around it. Pure CSS;
pauses inside `data-motion="paused"` and shows the still ring under reduced motion.
-->
<script lang="ts">
	import BorderBeam from './BorderBeam.svelte';
</script>

<div class="border-beam-preview" aria-hidden="true">
	<BorderBeam
		class="card"
		radius={10}
		length={120}
		glow={8}
		duration={4}
		--border-beam-padding="14px"
	>
		<span class="line"></span>
		<span class="line short"></span>
	</BorderBeam>
</div>

<style>
	.border-beam-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background: radial-gradient(circle at 50% 40%, oklch(22% 0.04 285), oklch(12% 0.02 285));
	}

	.border-beam-preview :global(.card) {
		display: grid;
		align-content: center;
		gap: 8px;
		inline-size: min(70%, 11rem);
		aspect-ratio: 16 / 9;
	}

	.line {
		display: block;
		inline-size: 70%;
		block-size: 5px;
		border-radius: 3px;
		background: oklch(100% 0 0 / 0.3);
	}

	.short {
		inline-size: 45%;
	}
</style>
