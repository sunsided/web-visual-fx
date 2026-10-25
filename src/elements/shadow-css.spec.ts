import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { toShadowCss } from './shadow-css.js';

describe('toShadowCss', () => {
	it('moves the tokens from :root to :host', () => {
		expect(toShadowCss(':root {\n\t--a: 1;\n}')).toBe(':host {\n\t--a: 1;\n}');
	});

	it('drops the default color-scheme so it inherits from the page', () => {
		expect(toShadowCss(':root {\n\tcolor-scheme: light dark;\n}')).not.toContain('color-scheme');
		expect(toShadowCss("[data-theme='dark'] {\n\tcolor-scheme: dark;\n}")).toContain(
			'color-scheme: dark'
		);
	});

	it('lets data-theme on the host force a theme', () => {
		expect(toShadowCss("[data-theme='dark'] {\n\tcolor-scheme: dark;\n}")).toBe(
			":host([data-theme='dark']),\n[data-theme='dark'] {\n\tcolor-scheme: dark;\n}"
		);
	});

	it('handles data-theme selectors anywhere in a selector list', () => {
		expect(toShadowCss(':root, [data-theme="high-contrast"] {\n\t--a: 1;\n}')).toBe(
			':host, :host([data-theme="high-contrast"]),\n[data-theme="high-contrast"] {\n\t--a: 1;\n}'
		);
	});

	it('leaves other :root-prefixed names alone', () => {
		expect(toShadowCss('.x { --root-size: 1px; } :root-ish {}')).toContain(':root-ish');
	});

	it('leaves no :root in the real token sheets', async () => {
		for (const file of ['primitives', 'semantic']) {
			const css = toShadowCss(await readFile(`src/lib/tokens/${file}.css`, 'utf8'));
			expect(css, file).not.toContain(':root');
			expect(css, file).toContain(':host');
		}
	});
});
