// Reproducible copies for Vite, static hosting and packaged/offline Electron.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {renderInsignia, renderLockup} from '../branding/identity.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const title=readFileSync(resolve(root,'src/config.ts'),'utf8').match(/export const GAME_TITLE = '([^']+)'/)?.[1];
if(!title) throw Error('GAME_TITLE must be an explicit string in src/config.ts.');
const outputs={'hollow-wake.svg':renderLockup(title), 'insignia.svg':renderInsignia(), 'insignia-ambient.svg':renderInsignia({fine:true,halo:true})};
const check=process.argv.includes('--check');
for(const folder of ['branding','site/assets/brand','launcher/assets/brand']) {
  for(const [name,source] of Object.entries(outputs)) {
    const file=resolve(root,folder,name);
    if(check) {
      let actual;try{actual=readFileSync(file,'utf8');}catch{}
      if(actual!==source) throw Error(file+' is stale. Run node scripts/build-brand.mjs.');
    } else {mkdirSync(dirname(file),{recursive:true});writeFileSync(file,source);}
  }
}
console.log(check?'Brand assets agree with their source.':'Generated shared Hollow Wake brand assets.');
