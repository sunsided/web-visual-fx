<!--
@component
Decorative thumbnail of the split-text reveal: a word whose letters rise in one after another,
replayed every few seconds. Stands still under reduced motion and inside
`data-motion="paused"` (the replay timer checks both).
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import SplitText from './SplitText.svelte';

	let run = $state(0);

	const replayLoop: Attachment<HTMLElement> = (node) => {
		const reduced = matchMedia('(prefers-reduced-motion: reduce)');
		const timer = setInterval(() => {
			if (reduced.matches || node.closest('[data-motion="paused"]')) return;
			run++;
		}, 3500);
		return () => clearInterval(timer);
	};
</script>

<div class="split-text-preview" aria-hidden="true" {@attach replayLoop}>
	<SplitText text="Hello there" as="span" replay={run} stagger={45} distance={18} />
</div>

<style>
	.split-text-preview {
		display: grid;
		place-items: center;
		block-size: 100%;
		background: linear-gradient(160deg, oklch(26% 0.06 300), oklch(16% 0.03 270));
		color: oklch(96% 0.02 300);
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
</style>
