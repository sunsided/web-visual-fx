<!--
@component
Linked card for one effect: live preview, title, summary and technique tags on light frosted glass.
The link is named by the title and described by the summary (not by the whole card text).

Tokens: `--effect-card-radius`, `--effect-card-preview-height`.
-->
<script lang="ts">
	import type { Component } from 'svelte';
	import GlassPanel from '#lib/fx/glass/GlassPanel.svelte';

	interface Props {
		/** Already resolved, e.g. `resolve('/noise')`. */
		href: string;
		title: string;
		summary: string;
		techniques?: string[];
		preview?: Component;
		class?: string;
	}

	let {
		href,
		title,
		summary,
		techniques = [],
		preview: Preview,
		class: className
	}: Props = $props();

	const id = $props.id();
</script>

<!-- Callers pass an already resolve()d href, which the lint rule can't see. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	class={['effect-card', className]}
	aria-labelledby="{id}-title"
	aria-describedby="{id}-summary"
>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
	<GlassPanel
		radius={24}
		blur={20}
		saturate={1.4}
		distortion={20}
		tint="#ffffff"
		tintOpacity={0.6}
		shadow={0.15}
		rimOpacity={0.9}
		class="glass"
	>
		{#if Preview}
			<div class="preview"><Preview /></div>
		{/if}
		<h2 id="{id}-title">{title}</h2>
		<p id="{id}-summary">{summary}</p>
		{#if techniques.length}
			<ul class="tags" aria-label="Techniques">
				{#each techniques as technique (technique)}
					<li>{technique}</li>
				{/each}
			</ul>
		{/if}
	</GlassPanel>
</a>

<style>
	.effect-card {
		--_radius: var(--effect-card-radius, 24px);

		display: block;
		block-size: 100%;
		border-radius: var(--_radius);
		text-decoration: none;
		transition: translate var(--duration-base) var(--ease-out);
	}

	.effect-card:hover {
		translate: 0 -4px;
	}

	.effect-card :global(.glass) {
		block-size: 100%;
		--glass-padding: var(--space-3) var(--space-3) var(--space-6);
	}

	.preview {
		block-size: var(--effect-card-preview-height, 9rem);
		margin-block-end: var(--space-5);
		border-radius: calc(var(--_radius) - var(--space-3));
		overflow: hidden;
	}

	h2,
	p,
	.tags {
		margin-inline: var(--space-3);
	}

	h2 {
		margin-block-end: var(--space-2);
		font-size: var(--text-xl);
	}

	p {
		color: color-mix(in oklch, currentColor 85%, transparent);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-block: var(--space-4) 0;
		padding: 0;
		list-style: none;
	}

	.tags li {
		padding: var(--space-px) var(--space-2);
		border-radius: var(--radius-full);
		background: color-mix(in oklch, currentColor 8%, transparent);
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
	}
</style>
