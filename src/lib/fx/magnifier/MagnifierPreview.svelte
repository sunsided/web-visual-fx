<!--
@component
Decorative thumbnail of the magnifier: a lens over a fine grid and small type. Static; the lens
isn't focusable here (`inert`).
-->
<script lang="ts">
	import Magnifier from './Magnifier.svelte';
</script>

<div class="magnifier-preview" aria-hidden="true" inert>
	<Magnifier radius={38} zoom={2.2} x={0.58} y={0.5} smoothing={0} class="lens-area">
		<div class="print">
			<span>Fine print</span>
			<span>under the loupe</span>
		</div>
	</Magnifier>
</div>

<style>
	.magnifier-preview {
		block-size: 100%;
	}

	.magnifier-preview :global(.lens-area) {
		block-size: 100%;
	}

	.print {
		display: grid;
		place-content: center;
		block-size: 100%;
		background:
			linear-gradient(oklch(100% 0 0 / 0.08) 1px, transparent 1px) 0 0 / 8px 8px,
			linear-gradient(90deg, oklch(100% 0 0 / 0.08) 1px, transparent 1px) 0 0 / 8px 8px,
			linear-gradient(135deg, oklch(24% 0.05 230), oklch(32% 0.08 180));
		color: oklch(96% 0.01 200);
		font-size: var(--text-xs);
		font-weight: 600;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
</style>
