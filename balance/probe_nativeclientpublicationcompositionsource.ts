import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {nativeClientPublicationCompositionArchive as archive} from './nativeClientPublicationCompositionArchive';
import {beforeNativeClientPublicationComposition as project} from './nativeClientPublicationCompositionFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const rows=[];let mutations=0,duplicates=0,portable=0,outside=0;
for(const lane of ['runtime','view'] as const)for(const row of archive.lanes[lane]){
 const source=readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\r\n','\n');
 assert.equal(hash(source),row.afterHash,'raw combined '+lane+':'+row.file);
 assert.equal(hash(project(lane,row.file,source)),row.beforeHash,'full frozen lane '+lane+':'+row.file);
 for(const variant of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,(_match,index)=>index%2?'\r\n':'\n')]){
  assert.equal(hash(project(lane,row.file,variant)),row.beforeHash,'portable exact projection');portable++;
 }
 for(const h of row.hunks){
  assert.throws(()=>project(lane,row.file,source.replace(h.after,h.after.replace(/\S/,'!'))),/exact hunk refused/);mutations++;
  assert.throws(()=>project(lane,row.file,source.replace(h.after,h.after+h.after)),/exact hunk refused/);duplicates++;
 }
 const marker='\n// unreviewed outside composition change\n';const extended=project(lane,row.file,source+marker);
 assert.equal(extended.endsWith(marker),true);assert.notEqual(hash(extended),row.beforeHash);outside++;
 rows.push({lane,file:row.file,before:row.beforeHash,after:row.afterHash,hunks:row.hunks.length});
}
const result={files:rows.length,mutations,duplicates,portable,outside,rows};
const report={scope:'Exact dual projection to independently frozen installer/cleanup and query/seat sources. Original archive assertions stay separate; unknown outside edits remain visible.',result,receipt:hash(JSON.stringify(result))};
writeCombatProof('native-client-publication-composition-source.json',report);console.log(JSON.stringify(report));
