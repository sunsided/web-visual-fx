/**
 * Parameter schemas describe an effect's tunable inputs once. From a schema we derive:
 * - typed default values (`defaultsOf`)
 * - the playground controls (`<ParamControls>`)
 * - Storybook `argTypes` (`toArgTypes`)
 * - copy-pasteable markup containing only non-default props (`toMarkup`)
 */

export interface RangeParam {
	kind: 'range';
	label: string;
	default: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
	description?: string;
	group?: string;
}

export interface ToggleParam {
	kind: 'toggle';
	label: string;
	default: boolean;
	description?: string;
	group?: string;
}

export interface SelectParam<T extends string = string> {
	kind: 'select';
	label: string;
	default: T;
	options: readonly T[];
	description?: string;
	group?: string;
}

export interface ColorParam {
	kind: 'color';
	label: string;
	/** Hex color, `#rrggbb`. */
	default: string;
	description?: string;
	group?: string;
}

interface ParamCommon {
	/** Key of a toggle param; this param is disabled while that toggle is off. */
	when?: string;
}

export type Param = (RangeParam | ToggleParam | SelectParam | ColorParam) & ParamCommon;

export type Schema = Record<string, Param>;

type ValueOf<P extends Param> = P extends RangeParam
	? number
	: P extends ToggleParam
		? boolean
		: P extends SelectParam<infer T>
			? T
			: string;

export type Values<S extends Schema> = { -readonly [K in keyof S]: ValueOf<S[K]> };

/** Identity helper that preserves literal types (e.g. select options). */
export function defineSchema<const S extends Schema>(schema: S): S {
	return schema;
}

export function defaultsOf<S extends Schema>(schema: S): Values<S> {
	return Object.fromEntries(Object.entries(schema).map(([k, p]) => [k, p.default])) as Values<S>;
}

export interface ParamGroup<S extends Schema> {
	name: string;
	keys: (keyof S & string)[];
}

/** Groups keys by `param.group`, preserving declaration order. */
export function groupsOf<S extends Schema>(schema: S, fallback = 'General'): ParamGroup<S>[] {
	const groups = new Map<string, (keyof S & string)[]>();
	for (const [key, param] of Object.entries(schema)) {
		const name = param.group ?? fallback;
		if (!groups.has(name)) groups.set(name, []);
		groups.get(name)!.push(key);
	}
	return [...groups].map(([name, keys]) => ({ name, keys }));
}

export function isEnabled(schema: Schema, values: Record<string, unknown>, key: string): boolean {
	const when = schema[key]?.when;
	return when === undefined || values[when] === true;
}

/** Subset of Storybook's `InputType`, kept local so this module has no Storybook dependency. */
export interface ArgType {
	name: string;
	description: string;
	table: { category?: string; defaultValue: { summary: string } };
	if?: { arg: string };
	control:
		| { type: 'range'; min: number; max: number; step: number }
		| { type: 'boolean' | 'select' | 'color' };
	options?: readonly string[];
}

/** Storybook argTypes so every story gets proper sliders/toggles/selects. */
export function toArgTypes(schema: Schema): Record<string, ArgType> {
	return Object.fromEntries(
		Object.entries(schema).map(([key, p]) => {
			const table = {
				category: p.group,
				defaultValue: { summary: JSON.stringify(p.default) }
			};
			const base = {
				name: key,
				description: p.description ?? p.label,
				table,
				if: p.when ? { arg: p.when } : undefined
			};
			switch (p.kind) {
				case 'range':
					return [
						key,
						{ ...base, control: { type: 'range', min: p.min, max: p.max, step: p.step } }
					];
				case 'toggle':
					return [key, { ...base, control: { type: 'boolean' } }];
				case 'select':
					return [key, { ...base, options: p.options, control: { type: 'select' } }];
				case 'color':
					return [key, { ...base, control: { type: 'color' } }];
			}
		})
	);
}

function formatProp(key: string, value: unknown): string {
	if (typeof value === 'string') return `${key}="${value}"`;
	if (value === true) return key;
	return `${key}={${JSON.stringify(value)}}`;
}

/** Svelte markup for `component` that only lists props differing from their defaults. */
export function toMarkup<S extends Schema>(
	component: string,
	schema: S,
	values: Values<S>,
	keys: (keyof S & string)[] = Object.keys(schema)
): string {
	const props = keys
		.filter((k) => values[k] !== schema[k].default)
		.map((k) => formatProp(k, values[k]));
	if (props.length === 0) return `<${component} />`;
	if (props.length <= 2) return `<${component} ${props.join(' ')} />`;
	return `<${component}\n\t${props.join('\n\t')}\n/>`;
}
