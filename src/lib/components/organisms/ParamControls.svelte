<!--
@component
Generates grouped controls for every param of a schema, bound to `values`.
-->
<script lang="ts" generics="S extends Schema">
	import { groupsOf, isEnabled, type Schema, type Values } from '#lib/params/schema.js';
	import ControlGroup from '../molecules/ControlGroup.svelte';
	import ParamControl from '../molecules/ParamControl.svelte';

	interface Props {
		schema: S;
		values: Values<S>;
		/** Restrict (and order) the groups that are shown. */
		groups?: string[];
	}

	let { schema, values = $bindable(), groups }: Props = $props();

	let visible = $derived.by(() => {
		const all = groupsOf(schema);
		return groups ? groups.flatMap((name) => all.filter((g) => g.name === name)) : all;
	});
</script>

{#each visible as group (group.name)}
	<ControlGroup title={group.name}>
		{#each group.keys as key (key)}
			<ParamControl
				param={schema[key]}
				bind:value={values[key]}
				disabled={!isEnabled(schema, values, key)}
			/>
		{/each}
	</ControlGroup>
{/each}
