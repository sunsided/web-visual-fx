<!--
@component
Pause/play button for decorative animation (WCAG 2.2.2). Bind `paused` and put
`data-motion={paused ? 'paused' : 'running'}` on the animated region; base.css pauses every CSS
animation inside a paused region. The choice is remembered per browser.

Hidden when the user already prefers reduced motion, since nothing moves then.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Button from '../atoms/Button.svelte';

	interface Props {
		paused?: boolean;
		/** localStorage key; set to `null` to not remember the choice. */
		storageKey?: string | null;
		size?: 'sm' | 'md';
		class?: string;
	}

	let {
		paused = $bindable(false),
		storageKey = 'visual-fx:motion-paused',
		size = 'md',
		class: className
	}: Props = $props();

	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	onMount(() => {
		if (!storageKey) return;
		try {
			paused = localStorage.getItem(storageKey) === 'true';
		} catch {
			// storage unavailable (private mode, blocked): just don't remember
		}
	});

	function toggle() {
		paused = !paused;
		if (!storageKey) return;
		try {
			localStorage.setItem(storageKey, String(paused));
		} catch {
			// see above
		}
	}
</script>

{#if !reducedMotion.current}
	<Button variant="ghost" {size} class={className} onclick={toggle}>
		<span aria-hidden="true">{paused ? '▶' : '⏸'}</span>
		{paused ? 'Play animations' : 'Pause animations'}
	</Button>
{/if}
