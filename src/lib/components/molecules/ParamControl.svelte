<!--
@component
Renders the right atom inside a `Field` for one schema `Param`.
-->
<script lang="ts">
	import type { Param } from '#lib/params/schema.js';
	import ColorInput from '../atoms/ColorInput.svelte';
	import Select from '../atoms/Select.svelte';
	import Slider from '../atoms/Slider.svelte';
	import Switch from '../atoms/Switch.svelte';
	import Field from './Field.svelte';

	interface Props {
		param: Param;
		value: number | boolean | string;
		disabled?: boolean;
	}

	let { param, value = $bindable(), disabled = false }: Props = $props();

	const id = $props.id();

	function decimals(step: number) {
		const [, fraction = ''] = String(step).split('.');
		return fraction.length;
	}

	let readout = $derived.by(() => {
		switch (param.kind) {
			case 'range':
				return `${(value as number).toFixed(decimals(param.step))}${param.unit ?? ''}`;
			case 'color':
				return String(value);
			default:
				return undefined;
		}
	});
</script>

<Field
	label={param.label}
	for={id}
	layout={param.kind === 'range' || param.kind === 'select' ? 'stacked' : 'inline'}
	value={readout}
	description={param.description}
>
	{#if param.kind === 'range'}
		<Slider
			{id}
			bind:value={() => value as number, (v) => (value = v)}
			min={param.min}
			max={param.max}
			step={param.step}
			{disabled}
		/>
	{:else if param.kind === 'toggle'}
		<Switch {id} bind:checked={() => value as boolean, (v) => (value = v)} {disabled} />
	{:else if param.kind === 'select'}
		<Select
			{id}
			bind:value={() => value as string, (v) => (value = v)}
			options={param.options}
			{disabled}
		/>
	{:else}
		<ColorInput {id} bind:value={() => value as string, (v) => (value = v)} {disabled} />
	{/if}
</Field>
