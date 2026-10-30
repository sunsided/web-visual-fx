<!--
@component
Decorative thumbnail of gradient and outlined type: one gradient word and one outlined word.
The gradient turns slowly; it pauses inside `data-motion="paused"` and stands still under
reduced motion.
-->
<script lang="ts">
	import GradientText from './GradientText.svelte';
</script>

<div class="gradient-text-preview" aria-hidden="true">
	<span class="line"><GradientText duration={6}>Gradient</GradientText></span>
	<span class="line"
		><GradientText fill="none" stroke={0.025} strokeColor="#c8b8ff">Outline</GradientText></span
	>
</div>

<style>
	.gradient-text-preview {
		display: grid;
		place-content: center;
		block-size: 100%;
		background: #0e0b18;
		font:
			900 2.5rem/1 system-ui,
			sans-serif;
		letter-spacing: -0.02em;
		text-align: center;
	}
</style>
