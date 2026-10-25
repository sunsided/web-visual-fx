<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import GlassPanel from './GlassPanel.svelte';
	import { glassDefaults, glassSchema } from './glass.js';

	const { Story } = defineMeta({
		title: 'FX/Frosted glass',
		component: GlassPanel,
		tags: ['autodocs'],
		args: glassDefaults,
		argTypes: toArgTypes(glassSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Scene kind="type" class="glass-story">
		<GlassPanel {...args} style="inline-size: min(24rem, 85vw);" data-theme="dark">
			<h2 style="margin-block-end: 0.5rem;">Frosted glass</h2>
			<p>Blur + displacement + grain + rim.</p>
		</GlassPanel>
	</Scene>
{/snippet}

<Story name="Default" {template} />

<Story name="Plain frost (no displacement)" args={{ displace: false }} {template} />

<Story name="Rippled" args={{ distortion: 25, frequency: 0.06, octaves: 1, blur: 4 }} {template} />

<Story
	name="Heavy liquid"
	args={{ distortion: 140, frequency: 0.004, blur: 2, rimWidth: 2, innerGlow: 0.6 }}
	{template}
/>

<Story
	name="Tinted"
	args={{ tint: '#2a0f4f', tintOpacity: 0.35, saturate: 2, rimAngle: 200 }}
	{template}
/>

<style>
	:global(.glass-story) {
		display: grid;
		place-items: center;
		block-size: 100dvh;
		color: white;
	}
</style>
