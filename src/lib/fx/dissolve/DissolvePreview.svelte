<!--
@component
Decorative thumbnail of the dissolve effect: a paper card half burnt away from one corner.
-->
<script lang="ts">
	import Dissolve from './Dissolve.svelte';
</script>

<div class="dissolve-preview" aria-hidden="true">
	<Dissolve
		class="sheet-wrap"
		progress={0.55}
		mode="burn"
		origin="right"
		bias={0.55}
		noiseScale={28}
		glow={3}
	>
		<div class="sheet">
			<span class="line wide"></span>
			<span class="line"></span>
			<span class="line wide"></span>
			<span class="line short"></span>
		</div>
	</Dissolve>
</div>

<style>
	.dissolve-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background: radial-gradient(circle at 70% 40%, oklch(32% 0.08 40), oklch(14% 0.02 280) 70%);
	}

	.dissolve-preview :global(.sheet-wrap) {
		inline-size: 70%;
	}

	.sheet {
		display: grid;
		gap: 0.6rem;
		padding: 1.25rem;
		border-radius: 0.5rem;
		background: oklch(96% 0.02 85);
	}

	.line {
		block-size: 0.5rem;
		inline-size: 70%;
		border-radius: 1rem;
		background: oklch(70% 0.03 60);
	}

	.wide {
		inline-size: 100%;
	}

	.short {
		inline-size: 40%;
	}
</style>
