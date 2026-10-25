// Writes the custom element wrappers (src/elements/generated/) or, with `--declarations <dir>`,
// their TypeScript declarations. Logic lives in src/elements/generate.ts; Vite loads it so the
// TypeScript schemas can be imported as they are.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { format, resolveConfig } from 'prettier';
import { runnerImport } from 'vite';

const { module } = await runnerImport('./src/elements/generate.ts', { configFile: false });

const flag = process.argv.indexOf('--declarations');
const outDir = flag === -1 ? 'src/elements/generated' : process.argv[flag + 1];
const files = flag === -1 ? module.renderSources() : module.renderDeclarations();

if (flag === -1) await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const [name, source] of files) {
	const filepath = path.join(outDir, name);
	const options = (await resolveConfig(filepath)) ?? {};
	await writeFile(filepath, await format(source, { ...options, filepath }));
}
console.log(`Wrote ${files.size} files to ${outDir}`);
