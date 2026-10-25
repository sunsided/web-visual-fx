<!--
@component
Demo content for the CRT screen: a boot log, a menu and a prompt, all real text on a
transparent background (the selected menu entry is inverse video). The blinking cursor is
decorative and stops under reduced motion or inside a `data-motion="paused"` region.

Tokens: `--terminal-fg`, `--terminal-bg` (screen color, used for inverse video),
`--terminal-font-size`, `--terminal-padding`.
-->
<script lang="ts">
	interface Props {
		/** Fewer lines, for small screens and thumbnails. */
		compact?: boolean;
		class?: string;
	}

	let { compact = false, class: className }: Props = $props();

	const boot = [
		'VFX-80 BIOS v2.6  (C) 1986',
		'Memory test ... 640K OK',
		'Loading PHOSPHOR.SYS ... done'
	];
	const menu = ['Run demo', 'Scanlines', 'Shadow mask', 'Exit'];
</script>

<div class={['terminal', className]}>
	{#if !compact}
		{#each boot as line (line)}
			<p>{line}</p>
		{/each}
		<p class="gap" aria-hidden="true"></p>
	{/if}
	<p class="title">MAIN MENU</p>
	<ol class="menu">
		{#each menu as item, i (item)}
			<li class={{ selected: i === 0 }}>
				<span aria-hidden="true">{i === 0 ? '>' : '\u00a0'}</span>
				{i + 1}&nbsp;&nbsp;{item}
			</li>
		{/each}
	</ol>
	{#if !compact}
		<p class="gap" aria-hidden="true"></p>
		<p>A:\&gt; run crt.exe<span class="cursor" aria-hidden="true"></span></p>
	{/if}
</div>

<style>
	.terminal {
		padding: var(--terminal-padding, 8% 10%);
		color: var(--terminal-fg, CanvasText);
		font-family: var(--font-mono);
		/* cqi: relative to the screen when it is a size container (CrtScreen is) */
		font-size: var(--terminal-font-size, clamp(0.75rem, 3.4cqi, 1.75rem));
		line-height: var(--leading-normal);
		letter-spacing: 0.02em;
	}

	p {
		margin: 0;
	}

	.gap {
		block-size: 1lh;
	}

	.title {
		margin-block-end: 0.5lh;
		font-weight: var(--weight-bold);
		letter-spacing: 0.2em;
	}

	.menu {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Inverse video: background in the text color, text in the screen color. */
	.selected {
		inline-size: fit-content;
		padding-inline-end: 1ch;
		background: var(--terminal-fg, CanvasText);
		color: var(--terminal-bg, Canvas);
	}

	.cursor {
		display: inline-block;
		inline-size: 0.6em;
		block-size: 1.1em;
		margin-inline-start: 0.2ch;
		vertical-align: text-bottom;
		background: currentColor;
	}

	@media (prefers-reduced-motion: no-preference) {
		.cursor {
			animation: blink 1.2s steps(1) infinite;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
