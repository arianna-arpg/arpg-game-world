import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,serializeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {serializeCharacter,readCharacterResume,writeCharacterMirrorRaw,charKeyFor,CHAR_SLOT,type CharacterSave} from '../src/meta/character';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';
import {makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {recordedContinueSave,refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();const restore=seedGlobalRandom(521606),memory=new Map<string,string>();Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}},configurable:true});Object.defineProperty(globalThis,'fetch',{value:async()=>new Response('',{status:404}),configurable:true});
try{
 const save=await refuseWorldContinue(async()=>{const account=makeAccount(),start=new NativeClientStart(account),made=start.begin({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1606),prologue:'skip'});assert(made);made.runtime.current.combat.campaignFrame.enterDimension('underworld');const value=JSON.parse(JSON.stringify(serializeCharacter(made.writer))) as CharacterSave;start.cancel();return value;});
 assert.equal(save.world!.nativeRetained!.version,2);const v1=JSON.parse(recordedContinueSave()) as CharacterSave;assert.equal(v1.world!.nativeRetained!.version,1);assert.equal(readNativeRetainedSave(v1).catalog,undefined);
 const names:string[]=[];async function refusal(name:string,change:(v:CharacterSave)=>void){const value=structuredClone(save);change(value);const raw=JSON.stringify(value);await writeCharacterMirrorRaw(CHAR_SLOT,raw);const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('No genuine stored resume');const account=makeAccount(),before=JSON.stringify(serializeAccount(account));await refuseWorldContinue(async()=>assert.rejects(prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true})));assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);assert.equal(JSON.stringify(serializeAccount(account)),before);names.push(name);}
 const envelope=(v:CharacterSave)=>{const e=v.world!.nativeRetained!;assert.equal(e.version,2);if(e.version!==2)throw Error('Wrong fixture version');return e;};
 await refusal('omitted dimension',v=>{(envelope(v).catalog.entries as unknown[]).pop();});
 await refusal('duplicate dimension',v=>{const e=envelope(v);(e.catalog.entries as unknown[])[1]=e.catalog.entries[0];});
 await refusal('foreign exact source',v=>{const e=envelope(v),row=e.catalog.entries[1],source=JSON.parse(row.geography.sourceJson);source.seed++;Object.assign(row,{geography:makeMassNativeGeographySpec(JSON.stringify(source),row.geography.mapping)});});
 await refusal('changed scale',v=>{envelope(v).catalog.entries[1].geography.mapping.physicalUnitsPerNativeUnit.numerator='20';});
 await refusal('changed physical space',v=>{envelope(v).catalog.entries[1].geography.mapping.physicalOrigin.dimension='surface';});
 await refusal('unknown catalog version',v=>{Object.assign(envelope(v).catalog,{version:2});});
 await refusal('unknown envelope version',v=>{Object.assign(envelope(v),{version:3});});
 await refusal('changed saved graph',v=>{v.world!.player!.zoneId='lastlight';});
 await refusal('character mismatch',v=>{v.classId='tamer';});
 await refusal('mixed legacy authority',v=>{Object.assign(v.world!,{worldmass:{}});});
 await writeCharacterMirrorRaw(CHAR_SLOT,JSON.stringify(save));const read=await readCharacterResume();if(read.status!=='ready')throw Error('Missing valid retry lease');const account=makeAccount(),prepared=await refuseWorldContinue(async()=>prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true})),made=prepared.publish();assert.equal(made.writer.zone.dimension,'underworld');assert.equal(readNativeRetainedSave(JSON.parse(JSON.stringify(serializeCharacter(made.writer)))).catalog!.identity,readNativeRetainedSave(save).catalog!.identity);made.runtime.retire();
 const result={refusals:names,unchangedSaveAndAccount:true,actualLease:true,validRetry:true,v1StillSingle:true},report={scope:'Malformed saved catalogs refuse before staged account publication; actual old v1 and valid v2 retry remain usable.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-dimension-boundaries.json',report);console.log(JSON.stringify(report));
}finally{restore();}
