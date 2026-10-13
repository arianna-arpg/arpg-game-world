import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';
import assert from 'node:assert/strict';
import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeJourneyCompositionArchive as archive} from './nativeJourneyCompositionArchive';
import {beforeNativeJourneyOnly as project,beforeNativeJourneyRawOnly as rawProject,type NativeJourneyLane} from './nativeJourneyCompositionFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,portable=0,outside=0,rawChecks=0;const rows=[];
const lanes=[...Object.keys(archive.lanes),'proof'] as NativeJourneyLane[];
for(const lane of lanes)for(const row of lane==='proof'?archive.proofRows:archive.lanes[lane]){
 const run=(s:string)=>project(lane,row.file,s),source=rawCampaign("journey58",row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
 assert.equal(hash(source),row.afterHash,'complete current source');assert.equal(hash(run(source)),row.beforeHash,'complete frozen parent source');
 let line=0;for(const variant of [source,source.replace(/\n/g,'\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(hash(run(variant)),row.beforeHash);portable++;}
 for(const h of row.hunks){assert.equal(source.split(h.after).length,2,'unique current hunk');const changed=h.after.replace(/\S/,x=>x==='!'?'?':'!');assert.notEqual(changed,h.after);const mutated=source.replace(h.after,changed);assert.notEqual(mutated,source);assert.throws(()=>run(mutated),/exact composition hunk refused/);mutations++;const duplicate=source.replace(h.after,h.after+h.after);assert.notEqual(duplicate,source);assert.throws(()=>run(duplicate),/exact composition hunk refused/);duplicates++;}
 const marker='\n// unknown journey composition edit\n';assert.equal(run(source+marker),run(source)+marker);assert.notEqual(hash(run(source+marker)),row.beforeHash);outside++;
 rows.push({lane,file:row.file,before:row.beforeHash,after:row.afterHash,hunks:row.hunks.length});
}
for(const lane of Object.keys(archive.lanes) as Exclude<NativeJourneyLane,'proof'>[])for(const row of archive.rawEols[lane]){
 const source=rawCampaign("journey58",row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8'));assert.equal(hash(rawProject(lane,row.file,source)),row.rawHash,'whole raw frozen runtime parent');rawChecks++;
}
const result={parents:archive.parents,rows:rows.length,mutations,duplicates,portable,outside,rawChecks,files:rows};
const report={scope:'Strict source reconstruction to frozen phase56 and bounty/voyage/realm/surface/Pit parents. All parent archives/assertions remain intact; unknown outside edits survive. Source evidence alone does not establish runtime parity.',result,receipt:hash(JSON.stringify(result))};writeCombatProof('native-journey-composition-source.json',report);console.log(JSON.stringify(report));
