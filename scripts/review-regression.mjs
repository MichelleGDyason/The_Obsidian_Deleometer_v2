import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
const bundle = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tsconfig = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
const versions = JSON.parse(readFileSync(new URL('../versions.json', import.meta.url), 'utf8'));

for (const [label, content] of [['source', source], ['bundle', bundle]]) {
  assert.doesNotMatch(content, /\.getMarkdownFiles\s*\(/, `${label} must not enumerate every Markdown file in the vault`);
  assert.doesNotMatch(content, /\.getFiles\s*\(/, `${label} must not enumerate every file in the vault`);
}

assert.doesNotMatch(source, /this\.display\s*\(/, 'settings refreshes must not call the deprecated display() API');
assert.equal(tsconfig.compilerOptions.target, 'ES2021', 'TypeScript target must match the current Obsidian plugin baseline');
assert.deepEqual(tsconfig.compilerOptions.lib, ['DOM', 'ES2021'], 'TypeScript libraries must type modern built-in APIs used by the plugin');
assert.equal(manifest.version, packageJson.version, 'manifest and package versions must match');
assert.equal(versions[manifest.version], manifest.minAppVersion, 'versions.json must include the current release');

console.log('review regression checks passed');
