import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {nativeShardsLegacySourceArchive as archive} from './nativeShardsLegacySourceArchive';
import {beforeNativeShardsLegacy,readNativeShardsCarried,readNativeShardsLifetime,type NativeShardsLegacyLane} from './nativeShardsLegacySourceFixture';
import {readNativeShardsCaravan} from './nativeShardsCompositionFixture';
import {beforeNativeClientStart} from './nativeClientStartFixtureSource';
import {beforeNativeCampaignRaw} from './nativeCampaignCompositionFixture';
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\r\n?/g,'\n');
let mutations=0,eol=0,reads=0,duplicates=0;
for(const row of archive.rows){
 const file=new URL('../'+row.file,import.meta.url),current=normal(readNativeShardsCaravan(file,'utf8')),prior=beforeNativeShardsLegacy(row.lane,row.file,current);
 assert.equal(hash(current),row.currentHash);assert.equal(hash(prior),row.priorHash);
 const original=row.lane==='carried'?beforeNativeClientStart(row.file,current):beforeNativeCampaignRaw('journey58',row.file,current);
 assert.equal(prior,original,'Exact existing reviewed helper result');
 assert.equal(hash(fs.readFileSync(new URL('../'+row.archive,import.meta.url))),row.archiveHash,'Complete original archive is unchanged');
 for(const version of [current,prior]){
  for(const variant of [version,version.replace(/\n/g,'\r\n'),version.replace(/\n/g,'\r')]){assert.equal(beforeNativeShardsLegacy(row.lane,row.file,variant),prior);eol++;}
  for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875,1]){const at=Math.floor(version.length*fraction);assert.throws(()=>beforeNativeShardsLegacy(row.lane,row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/Exact original caravan/);mutations++;}
  assert.throws(()=>beforeNativeShardsLegacy(row.lane,row.file,version+version),/Exact original caravan/);duplicates++;
 }
 const reader=row.lane==='carried'?readNativeShardsCarried:readNativeShardsLifetime;
 assert.equal(reader(file,'utf8'),prior);assert.equal(reader(fileURLToPath(file),'utf8'),prior);reads+=2;
 assert.equal(beforeNativeShardsLegacy(row.lane,'outside/'+row.file,current),current,'Unrelated source is transparent');
 const other=archive.rows.find(other=>other.lane!==row.lane)!;
 assert.equal(beforeNativeShardsLegacy(row.lane,other.file,current),current,'Finite helper cannot rewrite the other file');
}
assert.throws(()=>beforeNativeShardsLegacy('unknown' as NativeShardsLegacyLane,'outside','text'),/Unknown finite/);
const result={rows:archive.rows.length,mutations,eol,reads,duplicates,unchangedOriginalArchives:archive.rows.length,exactExistingHelpers:true,unknownLaneRefused:true,unrelatedSourcePreserved:true};
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-shards-legacy-source.json',import.meta.url),JSON.stringify({result,receipt:hash(JSON.stringify(result))},null,2)+'\n');console.log(JSON.stringify(result));
