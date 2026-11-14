// Keep the large Rollup/esbuild graph out of Electron's browser process.
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const [repo, scratch, entry] = process.argv.slice(2);
if (!repo || !scratch || !entry) throw new Error('Expected repo, scratch directory and QA entry');
const built = await build({ root: repo, base: './', logLevel: 'warn', build: {
  outDir: path.join(scratch, 'dist'), emptyOutDir: true, minify: false,
  rollupOptions: { input: { main: path.join(repo, 'index.html'), abilityqa: entry } },
} });
const qaEntry = built.output.find(item => item.type === 'chunk' && item.name === 'abilityqa').fileName;
fs.writeFileSync(path.join(scratch, 'qa-entry.json'), JSON.stringify(qaEntry));
