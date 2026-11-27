// Build the standalone file preview with the same HUD painters as the client.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const entry = fileURLToPath(new URL('./mixer.ts', import.meta.url));
const template = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const result = await build({
  configFile: false, publicDir: false, logLevel: 'error',
  build: { write: false, minify: false, lib: { entry, formats: ['iife'], name: 'orbMixer' } },
});
const script = result[0].output.find(part => part.type === 'chunk' && part.isEntry).code;
const reports = new URL('../../balance/reports/', import.meta.url);
await mkdir(reports, { recursive: true });
await writeFile(new URL('orb-motion.html', reports), template.replace('<!-- mixer-script -->',
  () => '<script>' + script.replaceAll('</script', '<\\/script') + '</script>'));
console.log('Built balance/reports/orb-motion.html');
