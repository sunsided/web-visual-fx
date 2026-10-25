<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Scene from '#lib/components/organisms/Scene.svelte';
	import { toArgTypes } from '#lib/params/schema.js';
	import LiquidGlass from './LiquidGlass.svelte';
	import { liquidGlassDefaults, liquidGlassSchema } from './liquid-glass.js';

	const { Story } = defineMeta({
		title: 'FX/Liquid glass',
		component: LiquidGlass,
		tags: ['autodocs'],
		args: liquidGlassDefaults,
		argTypes: toArgTypes(liquidGlassSchema),
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<Scene kind="type" class="liquid-glass-story">
		<LiquidGlass {...args} style="inline-size: min(22rem, 85vw); block-size: 14rem;" />
	</Scene>
{/snippet}

<Story name="Default" {template} />

<Story name="Pill" args={{ radius: 999, bezel: 48, refraction: 60 }} {template} />

<Story
	name="Thin rim"
	args={{ bezel: 12, profile: 'circle', refraction: 20, fringe: 0, specular: 1 }}
	{template}
/>

<Story
	name="Chamfer"
	args={{ profile: 'linear', bezel: 28, radius: 12, refraction: 24, fringe: 0.3 }}
	{template}
/>

<Story
	name="Frosted lens"
	args={{ blur: 8, tintOpacity: 0.2, refraction: 80, bezel: 64, specular: 0.4 }}
	{template}
/>

<style>
	:global(.liquid-glass-story) {
		display: grid;
		place-items: center;
		block-size: 100dvh;
	}
</style>
