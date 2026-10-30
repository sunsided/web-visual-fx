import { describe, expect, it } from 'vitest';
import { insideLink, type LinkProbe } from './support';

interface FakeNode extends LinkProbe {
	parentElement: FakeNode | null;
	root?: { host: FakeNode };
}

function node(localName: string, parent: FakeNode | null = null, attrs: string[] = []): FakeNode {
	const n: FakeNode = {
		localName,
		parentElement: parent,
		hasAttribute: (name) => attrs.includes(name),
		getRootNode: () => n.root ?? (parent ? parent.getRootNode() : n)
	};
	return n;
}

describe('insideLink', () => {
	it('is false outside of links and for null', () => {
		const body = node('body');
		expect(insideLink(node('div', node('div', body)))).toBe(false);
		expect(insideLink(null)).toBe(false);
	});

	it('finds the element itself or an ancestor with an href', () => {
		expect(insideLink(node('a', null, ['href']))).toBe(true);
		const a = node('a', node('li'), ['href']);
		expect(insideLink(node('div', node('div', a)))).toBe(true);
		expect(insideLink(node('div', node('area', null, ['href'])))).toBe(true);
		expect(insideLink(node('div', node('a', null, ['xlink:href'])))).toBe(true);
	});

	it('ignores anchors without an href', () => {
		expect(insideLink(node('div', node('a')))).toBe(false);
	});

	it('leaves shadow roots through their host', () => {
		const host = node('vfx-paint-pattern', node('a', null, ['href']));
		const top = node('div');
		top.root = { host };
		expect(insideLink(node('div', top))).toBe(true);
	});

	it('follows the assigned slot of slotted content', () => {
		const slot = node('slot', node('a', null, ['href']));
		const child = node('div', node('vfx-paint-pattern'));
		child.assignedSlot = slot;
		expect(insideLink(child)).toBe(true);
	});
});
