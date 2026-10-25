<!--
@component
Decorative thumbnail of the chromatic aberration effect: split heavy type over a gradient.
-->
<script lang="ts">
	import ChromaticAberration from './ChromaticAberration.svelte';
</script>

<div class="chromatic-preview" aria-hidden="true">
	<ChromaticAberration distance={3} angle={20} class="split">
		<span>RGB</span>
	</ChromaticAberration>
</div>

<style>
	.chromatic-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background: linear-gradient(135deg, oklch(22% 0.06 285), oklch(35% 0.12 320));
	}

	.chromatic-preview :global(.split) {
		color: oklch(100% 0 0);
		font-size: var(--text-2xl);
		font-weight: 900;
		letter-spacing: -0.03em;
	}
</style>
