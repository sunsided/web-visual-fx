<!--
@component
Decorative thumbnail of the lighting effect: a raised glyph on lit plaster, light fixed in the
top left. Static on purpose: a moving light would re-render the filter every frame.
-->
<script lang="ts">
	import LitSurface from './LitSurface.svelte';
</script>

<div class="lighting-preview" aria-hidden="true">
	<LitSurface
		followPointer={false}
		showMarker={false}
		lightX={20}
		lightY={15}
		elevation={90}
		surfaceScale={6}
		bumpFrequency={0.06}
		bumpOctaves={3}
		shapeBlur={2.5}
		specularConstant={0.5}
	>
		<span class="glyph">fx</span>
	</LitSurface>
</div>

<style>
	.lighting-preview {
		block-size: 100%;
	}

	.glyph {
		font-size: 5rem;
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.04em;
	}
</style>
