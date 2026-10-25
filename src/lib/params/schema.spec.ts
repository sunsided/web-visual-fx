import { describe, expect, it } from 'vitest';
import { defaultsOf, defineSchema, groupsOf, toArgTypes, toMarkup } from './schema';

const schema = defineSchema({
	size: { kind: 'range', label: 'Size', default: 4, min: 0, max: 10, step: 1, group: 'Shape' },
	round: { kind: 'toggle', label: 'Round', default: false, group: 'Shape' },
	mode: { kind: 'select', label: 'Mode', default: 'a', options: ['a', 'b'] },
	tint: { kind: 'color', label: 'Tint', default: '#ffffff', group: 'Shape' }
});

describe('defaultsOf', () => {
	it('collects default values', () => {
		expect(defaultsOf(schema)).toEqual({ size: 4, round: false, mode: 'a', tint: '#ffffff' });
	});
});

describe('groupsOf', () => {
	it('groups keys in declaration order with a fallback group', () => {
		expect(groupsOf(schema)).toEqual([
			{ name: 'Shape', keys: ['size', 'round', 'tint'] },
			{ name: 'General', keys: ['mode'] }
		]);
	});
});

describe('toArgTypes', () => {
	it('maps params to storybook controls', () => {
		const argTypes = toArgTypes(schema);
		expect(argTypes.size.control).toEqual({ type: 'range', min: 0, max: 10, step: 1 });
		expect(argTypes.round.control).toEqual({ type: 'boolean' });
		expect(argTypes.mode.options).toEqual(['a', 'b']);
		expect(argTypes.tint.control).toEqual({ type: 'color' });
	});
});

describe('toMarkup', () => {
	it('emits a bare tag when everything is default', () => {
		expect(toMarkup('Thing', schema, defaultsOf(schema))).toBe('<Thing />');
	});

	it('only emits changed props', () => {
		const values = { ...defaultsOf(schema), size: 7, round: true };
		expect(toMarkup('Thing', schema, values)).toBe('<Thing size={7} round />');
	});

	it('breaks long prop lists onto separate lines', () => {
		const values = { size: 7, round: true, mode: 'b' as const, tint: '#000000' };
		expect(toMarkup('Thing', schema, values)).toBe(
			'<Thing\n\tsize={7}\n\tround\n\tmode="b"\n\ttint="#000000"\n/>'
		);
	});
});
