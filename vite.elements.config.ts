import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { elements } from './src/elements/config.js';

// Custom elements build (`@sunsided/web-visual-fx/elements`): one entry per element plus an index
// that registers all of them, sharing chunks (the Svelte runtime, common effect code).
export default defineConfig({
	plugins: [
		svelte({
			configFile: false,
			// customElement for every component, so child component CSS is injected into the shadow
			// root of the element that renders it.
			compilerOptions: { customElement: true, runes: true },
			// Only the generated wrappers become elements, and they declare their props explicitly;
			// the effect components they render use rest props on purpose.
			onwarn: (warning, handler) => {
				if (warning.code !== 'custom_element_props_identifier') handler?.(warning);
			}
		})
	],
	build: {
		outDir: 'dist/elements',
		emptyOutDir: false,
		target: 'es2022',
		lib: {
			formats: ['es'],
			entry: {
				index: 'src/elements/generated/index.ts',
				...Object.fromEntries(
					elements.map((el) => [el.name, `src/elements/generated/${el.name}.svelte`])
				)
			}
		},
		rolldownOptions: {
			// Registering an element is a side effect of importing its module. package.json's
			// `sideEffects` (written for consumers) would otherwise let the index drop the imports.
			treeshake: { moduleSideEffects: true },
			output: { chunkFileNames: 'chunks/[name]-[hash].js' }
		}
	}
});
