import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from 'vite';

// Resolve the selected ordinary dev configuration without an inline watch
// override. This check starts no server, watcher, browser or game build.
// Real inventory, HTTP and HMR evidence belongs to the separate browser course.
const root = fileURLToPath(new URL('../', import.meta.url));
const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));
const config = await resolveConfig({ root, configFile }, 'serve', 'development');
assert.equal(path.resolve(config.root), path.resolve(root));
assert.equal(path.resolve(config.configFile!), path.resolve(configFile));
assert.equal(config.command, 'serve');
assert.equal(config.mode, 'development');
assert(config.server.watch, 'The ordinary dev server must retain file watching');
assert.deepEqual(config.server.watch.ignored, [
  '**/saves/**', '**/*.bak', '**/.claude/**', '**/balance/reports/**',
], 'Only the selected narrow generated-output/scratch additions are allowed');
assert.equal(config.server.headers?.['Document-Policy'], 'js-profiling');
for (const name of ['disk-save', 'hmr-full-reload-trees', 'mu-loading-frame']) {
  assert(config.plugins.some(plugin => plugin.name === name), 'Retain actual dev plugin ' + name);
}
console.log('PASS actual development config retains watching and source plugins with narrow generated-output ignores');
