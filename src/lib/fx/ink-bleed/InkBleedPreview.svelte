<!--
@component
Decorative thumbnail of the ink-bleed effect: a few watercolor dabs on paper.
-->
<script lang="ts">
	import InkBleed from './InkBleed.svelte';
	import { presetValues } from './ink-bleed.js';

	const watercolor = presetValues('watercolor');
</script>

<div class="ink-bleed-preview" aria-hidden="true">
	<InkBleed {...watercolor} spread={14} blur={3} poolWidth={4} class="sheet">
		<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
			<circle cx="58" cy="52" r="26" fill="#2f6f8f" />
			<circle cx="96" cy="44" r="22" fill="#e0a526" />
			<circle cx="108" cy="70" r="14" fill="#c4384a" />
		</svg>
	</InkBleed>
</div>

<style>
	.ink-bleed-preview,
	.ink-bleed-preview :global(.sheet) {
		block-size: 100%;
	}

	svg {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}
</style>
