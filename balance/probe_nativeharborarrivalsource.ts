import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeHarborArrivalArchive as archive} from './nativeHarborArrivalArchive';
import {beforeNativeHarborArrival as project} from './nativeHarborArrivalFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,portable=0,outside=0;
for(const row of archive.rows){const source=rawCampaign("quayReceipt62",row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\r\n','\n'),run=(s:string)=>project(row.file,s);assert.equal(hash(source),row.afterHash,'whole current source');assert.equal(hash(run(source)),row.beforeHash,'whole frozen predecessor');let n=0;for(const text of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,()=>++n%2?'\r\n':'\n')]){assert.equal(hash(run(text)),row.beforeHash);portable++;}for(const h of row.hunks){const bad=source.replace(h.after,h.after.replace(/\S/,'!'));assert.notEqual(bad,source);assert.throws(()=>run(bad),/exact hunk refused/);mutations++;assert.throws(()=>run(source.replace(h.after,h.after+h.after)),/exact hunk refused/);duplicates++;}const extra='\n// unexplained source remains visible\n';assert.equal(run(source+extra),run(source)+extra);assert.notEqual(hash(run(source+extra)),row.beforeHash);outside++;}
const result={parent:archive.parent,files:archive.rows.length,mutations,duplicates,portable,outside};writeCombatProof('native-harbor-arrival-source.json',{...result,receipt:hash(JSON.stringify(result))});console.log(JSON.stringify(result));
