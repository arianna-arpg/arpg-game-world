import {beforeNativeJourneyRaw as rawJourney} from './nativeJourneyCompositionFixture';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeSurfaceArrivalOrderArchive as row} from './nativeSurfaceArrivalOrderArchive';
import {beforeNativeSurfaceArrivalOrder as before} from './nativeSurfaceArrivalOrderFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),raw=rawJourney('surface58',row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')),text=raw.replace(/\r\n?/g,'\n');
assert.equal(hash(raw),row.afterHash);assert.equal(hash(row.before),row.beforeHash);assert.equal(hash(row.after),row.afterHash);
let line=0;for(const value of [text,text.replace(/\n/g,'\r\n'),text.replace(/\n/g,()=>++line%2?'\r\n':'\n')])assert.equal(hash(before(row.file,value)),row.beforeNormalizedHash);
for(const h of row.hunks){assert.equal(text.split(h.after).length,2);const at=Math.floor(h.after.length/2),changed=h.after.slice(0,at)+(h.after[at]==='X'?'Y':'X')+h.after.slice(at+1);assert.notEqual(changed,h.after);assert.throws(()=>before(row.file,text.replace(h.after,changed)));assert.throws(()=>before(row.file,text+'\n'+h.after));}
const outside='\n// unknown outside edit remains\n';assert.equal(before(row.file,text+outside),before(row.file,text)+outside);assert.equal(before('other.ts',text),text);
const report={files:1,hunks:row.hunks.length,reversals:3,mutations:row.hunks.length,duplicates:row.hunks.length,outside:1,unknownFile:true};writeCombatProof('native-surface-arrival-order-source.json',report);console.log(JSON.stringify(report));
