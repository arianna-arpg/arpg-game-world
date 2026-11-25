// Build one offline comparison page, using the same selected paintings as the game.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { tsImport } from 'tsx/esm/api';

const here = new URL('./', import.meta.url);
const site = new URL('../../site/', here);
const manifest = JSON.parse(await readFile(new URL('assets/art/icons/manifest.json', site), 'utf8'));
const {catalogue} = await tsImport('./catalogue.ts',import.meta.url);
const {auditSupports} = await tsImport('./supportCoverage.ts',import.meta.url);
const audit=auditSupports(), samples=catalogue(audit);
// Selected portraits travel with the offline workshop. The browser decodes only displayed images.
const supportArt={};
for (const {kind,key,src} of manifest.entries) {
  if (kind==='support') supportArt[key]='data:image/webp;base64,'+(await readFile(new URL(src,site))).toString('base64');
}
const known=new Set(samples.filter(s=>s.group==='Supports').map(s=>'support:'+s.key.split('/')[1]));
for (const key of known) if (!supportArt[key]) throw Error('Missing selected support artwork for '+key);
const {socketExample,counterExamples,slotFitExamples}=await tsImport('./socketExample.ts',import.meta.url);
const sockets=socketExample(), counters=counterExamples(audit), fit=slotFitExamples();
const result = await build({
  configFile: false, publicDir: false, logLevel: 'error',
  plugins: [{
    name: 'hotbar-study-skill-art',
    resolveId(id) {
      if (id === 'study:sockets') return '\0hotbar-study-sockets';
      if (id === 'study:effects') return '\0hotbar-study-effects';
      if (id.startsWith('study-skill:')) {
        const key = 'skill:' + id.slice('study-skill:'.length);
        const entry = manifest.entries.find(row => row.key === key);
        if (!entry) throw new Error('No selected skill artwork for ' + key);
        return fileURLToPath(new URL(entry.src, site)).replaceAll('\\', '/') + '?inline';
      }
    },
    load(id) {
      if (id.replaceAll('\\','/').endsWith('/src/render/abilityArtworkCatalog.ts')) return 'export const ABILITY_ARTWORK_URLS='+JSON.stringify(supportArt);
      if (id === '\0hotbar-study-sockets') return 'export default '+JSON.stringify(sockets)+';export const counterExamples='+JSON.stringify(counters)+';export const slotFit='+JSON.stringify(fit);
      if (id === '\0hotbar-study-effects') return 'export default '+JSON.stringify(samples);
    },
  }],
  build: { write: false, lib: { entry: fileURLToPath(new URL('study.ts', here)), formats: ['iife'], name: 'hotbarStudy' } },
});
const script = result[0].output.find(item => item.type === 'chunk' && item.isEntry).code;
const template = await readFile(new URL('index.html', here), 'utf8');
const reports = new URL('../../balance/reports/', here);
await mkdir(reports, { recursive: true });
await writeFile(new URL('hotbar-workshop.html', reports), template.replace('<!-- study-script -->',
  () => '<script>' + script.replaceAll('</script', '<\\/script') + '</script>'));
console.log('Built balance/reports/hotbar-workshop.html with',Object.keys(supportArt).length,'selected support paintings and',samples.filter(s=>s.row).length,'effect examples.');
