<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import Neon from './Neon.svelte';
	import { neonDefaults, neonSchema } from './neon.js';

	const { Story } = defineMeta({
		title: 'FX/Neon',
		component: Neon,
		tags: ['autodocs'],
		args: { ...neonDefaults, text: 'Open late' },
		argTypes: {
			...toArgTypes(neonSchema),
			text: { control: { type: 'text' }, description: "The sign's text." }
		},
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="wall" style:background-color={args.background as string}>
		<Neon {...args} style="--neon-bg: transparent" />
	</div>
{/snippet}

<Story name="Open late" {template} />

<Story
	name="Hotel with a dead letter"
	args={{ text: 'HOTEL', tube: '#ff5a36', offLetter: 2, flicker: false, font: 'sans' }}
	{template}
/>

<Story
	name="Cyan script, drop-shadow bloom"
	args={{ text: 'cocktails', tube: '#2fe6ff', font: 'script', technique: 'drop-shadow', glow: 0.6 }}
	{template}
/>

<Story
	name="Whole sign flickers gently"
	args={{ text: 'BAR', tube: '#7cff4f', flickerLetter: 0, flickerDepth: 0.3, font: 'mono' }}
	{template}
/>

<style>
	.wall {
		display: grid;
		place-items: center;
		min-block-size: 100dvh;
		font-size: clamp(3rem, 12vw, 8rem);
	}
</style>
