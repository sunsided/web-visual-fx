<!--
@component
Decorative thumbnail of the frosted glass effect: a glass chip over moving stripes.
-->
<script lang="ts">
	import Scene from '#lib/components/organisms/Scene.svelte';
	import GlassPanel from './GlassPanel.svelte';
</script>

<div class="glass-preview" aria-hidden="true">
	<Scene kind="stripes" class="glass-preview-scene">
		<GlassPanel
			radius={16}
			blur={6}
			distortion={18}
			frequency={0.03}
			tintOpacity={0.2}
			grain={0.1}
			class="chip"
		/>
	</Scene>
</div>

<style>
	.glass-preview {
		block-size: 100%;
	}

	.glass-preview :global(.glass-preview-scene) {
		display: grid;
		place-items: center;
		block-size: 100%;
	}

	.glass-preview :global(.chip) {
		inline-size: 55%;
		block-size: 60%;
	}
</style>
