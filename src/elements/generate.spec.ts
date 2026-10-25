import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import { elements } from './config.js';
import { propsOf, renderDeclarations, renderSources } from './generate.js';

describe('generated element wrappers', () => {
	it('match the schemas (run `yarn elements:generate` after changing a schema or config.ts)', async () => {
		for (const [name, source] of renderSources()) {
			const filepath = path.join('src/elements/generated', name);
			const expected = await format(source, { ...(await resolveConfig(filepath)), filepath });
			expect(await readFile(filepath, 'utf8'), name).toBe(expected);
		}
	});
});

describe('propsOf', () => {
	it('declares every schema key, plus extras and paused for animated elements', () => {
		for (const el of elements) {
			const names = propsOf(el).map((p) => p.name);
			const sources = propsOf(el).map((p) => p.source ?? p.name);
			expect(sources).toEqual(
				expect.arrayContaining([...Object.keys(el.schema), ...Object.keys(el.extras ?? {})])
			);
			expect(names.includes('paused')).toBe(Boolean(el.motion || el.extras?.paused));
			expect(new Set(names).size).toBe(names.length);
		}
	});

	it('only forwards props the wrapped component declares', () => {
		for (const el of elements) {
			const component = readFileSync(`src/lib/fx/${el.component}.svelte`, 'utf8');
			// Schema props come in through the component's Partial<…Options>; extras must be in Props.
			for (const name of Object.keys(el.extras ?? {})) {
				expect(component, `${el.tag}: ${name}`).toMatch(new RegExp(`\\b${name}\\??:`));
			}
			for (const p of propsOf(el).filter((p) => p.source)) {
				expect(Object.keys(el.schema), `${el.tag}: ${p.source}`).toContain(p.source);
			}
		}
	});

	it('gives every two-way prop a default (Svelte rejects binding undefined to a fallback)', () => {
		for (const el of elements) {
			for (const [name, extra] of Object.entries(el.extras ?? {})) {
				if (extra.event) expect(extra.default, `${el.tag}: ${name}`).toBeDefined();
			}
		}
	});

	it('maps select params to a union of their options', () => {
		const noise = elements.find((el) => el.tag === 'vfx-noise')!;
		expect(propsOf(noise).find((p) => p.name === 'type')!.ts).toBe("'fractalNoise' | 'turbulence'");
	});
});

describe('renderDeclarations', () => {
	it('registers every tag in HTMLElementTagNameMap and in React JSX', () => {
		const files = renderDeclarations();
		for (const el of elements) {
			expect(files.get('index.d.ts')).toContain(`'${el.tag}':`);
			expect(files.get('react.d.ts')).toContain(`'${el.tag}':`);
			expect(files.has(`${el.name}.d.ts`)).toBe(true);
		}
	});

	it('types events, including two-way properties', () => {
		const react = renderDeclarations().get('react.d.ts')!;
		expect(react).toContain("onitemselect?: (event: VfxGooeyMenuEventMap['itemselect']) => void;");
		expect(react).toContain(
			"onselectedchange?: (event: VfxSquircleGroupEventMap['selectedchange']) => void;"
		);
	});
});

/** Member names of the interfaces every custom element inherits, read from TypeScript's DOM lib. */
function domMembers(): Set<string> {
	const dom = readFileSync('node_modules/typescript/lib/lib.dom.d.ts', 'utf8');
	const interfaces = [
		'EventTarget',
		'Node',
		'ChildNode',
		'ParentNode',
		'NonDocumentTypeChildNode',
		'Slottable',
		'Animatable',
		'ARIAMixin',
		'Element',
		'ElementCSSInlineStyle',
		'ElementContentEditable',
		'GlobalEventHandlers',
		'HTMLOrSVGElement',
		'HTMLElement'
	];
	const names = new Set<string>();
	for (const name of interfaces) {
		const body = dom.match(new RegExp(`interface ${name} (?:extends [^{]*)?\\{([\\s\\S]*?)\\n\\}`));
		if (!body) throw new Error(`interface ${name} not found in lib.dom.d.ts`);
		for (const [, member] of body[1].matchAll(/^ {4}(?:readonly )?([a-zA-Z]+)\??[(:<]/gm)) {
			names.add(member);
		}
	}
	return names;
}

describe('element properties', () => {
	it("don't shadow HTMLElement members (e.g. blur(), animate())", () => {
		const dom = domMembers();
		expect(dom.has('blur') && dom.has('animate') && dom.has('hidden')).toBe(true);
		const clashes = elements.flatMap((el) =>
			propsOf(el)
				.filter((p) => dom.has(p.name))
				.map((p) => `${el.tag}.${p.name}`)
		);
		expect(clashes).toEqual([]);
	});
});
