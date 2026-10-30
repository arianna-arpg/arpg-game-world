import {beforeNativeTownConclusion as projectTownConclusion} from './nativeTownConclusionCompositionFixture';
import assert from 'node:assert/strict';
import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {nativeTownFreshFoldArchive as archive} from './nativeTownFreshFoldArchive';
import {beforeNativeTownFreshFoldOnly as project} from './nativeTownFreshFoldFixture';
let mutations=0,duplicates=0,portable=0,outside=0;const rows=[];
for(const lane of ['runtime','proof'] as const)for(const row of lane==='proof'?archive.proofRows:archive.files){
 const source=projectTownConclusion('town',row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const run=(input:string)=>project(lane,row.file,input);assert.equal(combatHash(source),row.afterHash);assert.equal(combatHash(run(source)),row.beforeHash);
 let line=0;for(const variant of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(combatHash(run(variant)),row.beforeHash);portable++;}
 for(const h of row.hunks){const changed=source.replace(h.after,h.after.replace(/\S/,'!'));assert.notEqual(changed,source);assert.throws(()=>run(changed),/exact .*hunk refused/);mutations++;assert.throws(()=>run(source.replace(h.after,h.after+h.after)),/exact .*hunk refused/);duplicates++;}
 const marker='\n// unknown town/client edit\n';assert.ok(run(source+marker).endsWith(marker));assert.notEqual(combatHash(run(source+marker)),row.beforeHash);outside++;
 rows.push({lane,file:row.file,before:row.beforeHash,after:row.afterHash,hunks:row.hunks.length});
}
const result={rows:rows.length,mutations,duplicates,portable,outside,files:rows};
writeCombatProof('native-town-fresh-fold-source.json',result);console.log(JSON.stringify(result));
