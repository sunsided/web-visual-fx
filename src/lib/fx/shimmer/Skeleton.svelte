<!--
@component
Placeholder blocks for content that is still loading: an optional avatar, a heading bar and a few
text lines. Purely visual and `aria-hidden`; wrap it in `<Shimmer mode="mask">` for the moving
highlight, and announce the loading state yourself (e.g. a `role="status"` region with text).

Tokens: `--skeleton-bone` (block color, defaults to the text color at low opacity).
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Number of text lines; the last one is shorter. */
		lines?: number;
		/** Show a round avatar next to the heading. */
		avatar?: boolean;
	};

	let { lines = 3, avatar = true, class: className, ...rest }: Props = $props();
</script>

<div class={['skeleton', className]} aria-hidden="true" {...rest}>
	<div class="head">
		{#if avatar}
			<span class="bone avatar"></span>
		{/if}
		<span class="bone title"></span>
	</div>
	{#each { length: Math.max(0, lines) }, i (i)}
		<span class={['bone line', { last: i === lines - 1 && lines > 1 }]}></span>
	{/each}
</div>

<style>
	.skeleton {
		--_bone: var(--skeleton-bone, color-mix(in oklab, currentColor 28%, transparent));

		display: grid;
		gap: 0.75em;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.75em;
		margin-block-end: 0.25em;
	}

	.bone {
		display: block;
		block-size: 0.75em;
		border-radius: 0.375em;
		background: var(--_bone);
	}

	.avatar {
		flex: none;
		inline-size: 2.75em;
		block-size: 2.75em;
		border-radius: 50%;
	}

	.title {
		inline-size: 45%;
		block-size: 1em;
	}

	.last {
		inline-size: 65%;
	}
</style>
