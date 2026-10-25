import { defaultsOf, toMarkup, type Schema, type Values } from './schema';

/** Reactive values for a schema, with reset and markup generation. */
export class ParamState<S extends Schema> {
	readonly schema: S;
	values: Values<S> = $state()!;

	constructor(schema: S, initial: Partial<Values<S>> = {}) {
		this.schema = schema;
		this.values = { ...defaultsOf(schema), ...initial };
	}

	reset = () => {
		this.values = defaultsOf(this.schema);
	};

	markup(component: string, keys?: (keyof S & string)[]) {
		return toMarkup(component, this.schema, this.values, keys);
	}
}
