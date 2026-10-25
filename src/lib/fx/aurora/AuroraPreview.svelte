<!--
@component
Decorative thumbnail of the aurora effect: a small, unblurred mesh gradient (the cheapest variant).
-->
<script lang="ts">
	import Aurora from './Aurora.svelte';
</script>

<div class="aurora-preview" aria-hidden="true">
	<Aurora
		blobs={4}
		blobSize={90}
		blur={0}
		grain={0}
		speed={2}
		colorDrift={false}
		color1="#8b5cf6"
		color2="#22d3ee"
		color3="#f472b6"
		color4="#facc15"
		background="#1e1b4b"
		class="fill"
	/>
</div>

<style>
	.aurora-preview {
		block-size: 100%;
	}

	.aurora-preview :global(.fill) {
		block-size: 100%;
	}
</style>
