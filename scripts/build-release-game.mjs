import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [source,directory,storageScope,worldmass]=process.argv.slice(2);
if(!source||!directory||!['true','false'].includes(worldmass))throw Error('Expected source, destination, storage scope and world mode.');
process.env.HOLLOW_WAKE_COORDINATED_BUILD='1';
process.env.HOLLOW_WAKE_STORAGE_SCOPE=storageScope;
process.env.HOLLOW_WAKE_WORLDMASS=worldmass==='true'?'1':'0';
const vite=await import(pathToFileURL(path.join(source,'node_modules/vite/dist/node/index.js')).href);
// Host-provided before game modules run: identical JS, existing save namespaces.
await vite.build({root:source,configFile:path.join(source,'vite.config.ts'),base:'./',
  define:{__HOLLOW_WAKE_STORAGE_SCOPE__:'globalThis.__HOLLOW_WAKE_STORAGE_SCOPE__',__HOLLOW_WAKE_WORLDMASS__:worldmass},
  build:{outDir:directory,emptyOutDir:true}});
