<!--
@component
Decorative thumbnail of the shimmer: a skeleton card with the mask technique. Pure CSS; pauses
inside `data-motion="paused"` and stands still under reduced motion.
-->
<script lang="ts">
	import Shimmer from './Shimmer.svelte';
	import Skeleton from './Skeleton.svelte';
	import { presetOptions } from './shimmer.js';
</script>

<div class="shimmer-preview" aria-hidden="true">
	<div class="card">
		<Shimmer {...presetOptions('skeleton')}>
			<Skeleton lines={2} />
		</Shimmer>
	</div>
</div>

<style>
	.shimmer-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background: oklch(20% 0.03 260);
		color: oklch(92% 0.02 260);
		font-size: 12px;
	}

	.card {
		inline-size: min(72%, 13rem);
		padding: 1.25em;
		border-radius: 10px;
		background: oklch(26% 0.03 260);
	}
</style>
