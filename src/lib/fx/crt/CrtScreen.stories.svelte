<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toArgTypes } from '#lib/params/schema.js';
	import CrtScreen from './CrtScreen.svelte';
	import RetroTerminal from './RetroTerminal.svelte';
	import { crtDefaults, crtSchema } from './crt.js';

	const { Story } = defineMeta({
		title: 'FX/CRT',
		component: CrtScreen,
		tags: ['autodocs'],
		args: crtDefaults,
		argTypes: toArgTypes(crtSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="stage">
		<CrtScreen {...args} class="monitor">
			<RetroTerminal />
		</CrtScreen>
	</div>
{/snippet}

<Story name="Green phosphor" {template} />

<Story
	name="Amber monochrome"
	args={{ phosphor: '#ffb000', background: '#140c00', scanlines: 0.2, mask: 0.1 }}
	{template}
/>

<Story
	name="Paper white"
	args={{ phosphor: '#e8f0ff', background: '#0d1018', glow: 0.35, mask: 0.2 }}
	{template}
/>

<Story
	name="Arcade (heavy)"
	args={{
		curvature: 0.12,
		scanlines: 0.35,
		lineHeight: 4,
		mask: 0.1,
		maskSize: 2,
		glow: 1,
		glowRadius: 6,
		vignette: 0.8
	}}
	{template}
/>

<Story
	name="Flat LCD-ish (effects off)"
	args={{ curvature: 0, scanlines: 0, mask: 0, glow: 0, vignette: 0, rollingBar: false }}
	{template}
/>

<style>
	.stage {
		display: grid;
		place-items: center;
		block-size: 100dvh;
		padding: 2rem;
		background: #1c1a17;
	}

	.stage :global(.monitor) {
		inline-size: min(48rem, 100%);
		aspect-ratio: 4 / 3;
	}
</style>
