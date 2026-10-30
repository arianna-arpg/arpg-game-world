import '../src/engine/world';
import assert from 'node:assert/strict';
import {nativeArrivalProductionFS as fs} from './nativeArrivalCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeMainCastSourceArchive as archive} from './nativeMainCastSourceArchive';
import {beforeNativeMainCastSource as project} from './nativeMainCastSourceFixture';
import {assertMainCastActorSlot,beforeMainCastActorSlot} from './nativeMainCastActorReceipt';
import {Actor} from '../src/engine/actor';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {beforeHistoricalActorSlots} from './nativeHistoricalActorReceipt';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,eol=0;
for(const row of archive.rows){const raw=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),source=raw.replace(/\r\n?/g,'\n');assert.equal(hash(source),row.afterHash);const before=project(row.file,raw);assert.equal(hash(before),row.rawBeforeHash);assert.equal(project(row.file,before),before);let line=0;for(const variant of [source,source.replace(/\n/g,'\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(project(row.file,variant),before);eol++;}for(const h of row.hunks){const changed=h.after.replace(/\S/,x=>x==='!'?'?':'!');assert.throws(()=>project(row.file,source.replace(h.after,changed)),/native main cast/);mutations++;assert.throws(()=>project(row.file,source.replace(h.after,h.after+h.after)),/native main cast/);duplicates++;}assert.throws(()=>project(row.file,source+'\n// unknown outside change\n'),/native main cast/);mutations++;}
for(const row of archive.fresh)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8')),row.sha256);
const actorSource=fs.readFileSync(new URL('../src/engine/actor.ts',import.meta.url),'utf8');assertMainCastActorSlot(actorSource);assert.throws(()=>assertMainCastActorSlot(actorSource.replace('companionReturnTo?: number;','companionReturnTo = 1;')));
const actor=new Actor('cast receipt witness','enemy',{x:0,y:0}),captured=captureNativeActorState(actor)!;assert(captured);const original=structuredClone(captured),prior=beforeMainCastActorSlot(captured);assert.deepEqual(captured,original);assert.equal(prior.nodes.length,captured.nodes.length);assert.equal(prior.nodes[0].entries.length,captured.nodes[0].entries.length-1);assert(!prior.nodes[0].entries.some(([key])=>key==='companionReturnTo'));beforeHistoricalActorSlots(prior);
for(const value of [7,null,{special:'NaN'},{ref:1}]){const bad=structuredClone(captured);bad.nodes[0].entries.find(([key])=>key==='companionReturnTo')![1]=value as never;assert.throws(()=>beforeMainCastActorSlot(bad));mutations++;}
{const bad=structuredClone(captured);bad.nodes[0].entries.push(bad.nodes[0].entries.find(([key])=>key==='companionReturnTo')!);assert.throws(()=>beforeMainCastActorSlot(bad));duplicates++;}
{const bad=structuredClone(captured);const row=bad.nodes[0].entries.find(([key])=>key==='life')!;row[1]=(row[1] as number)+1;assert.notDeepEqual(beforeMainCastActorSlot(bad),prior);}
const result={sourceRows:archive.rows.length,fresh:archive.fresh.length,hunks:archive.rows.reduce((n,r)=>n+r.hunks.length,0),mutations,duplicates,eol,originalActorUnchanged:true,unusedSlotOnly:true,parent:archive.parent,main:archive.main};writeCombatProof('native-main-cast-source.json',{result,receipt:hash(JSON.stringify(result))});console.log(JSON.stringify(result));
