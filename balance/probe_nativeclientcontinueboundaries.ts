import '../src/engine/world';
import assert from 'node:assert/strict';
import {recordedContinueSave,refuseWorldContinue} from './nativeClientContinueFixture';
import {makeAccount,serializeAccount} from '../src/meta/account';
import {readCharacterResume,writeCharacterMirrorRaw,charKeyFor,CHAR_SLOT} from '../src/meta/character';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {NativeAreaSceneCombat} from '../src/worldmass/nativeAreaSceneCombat';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from '../src/worldmass/nativeAreaCharacterResume';
import type {NativeAreaSceneOngoing} from '../src/worldmass/nativeAreaSceneOngoing';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const random=seedGlobalRandom(48040),raw=recordedContinueSave(),storage=new Map<string,string>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);},removeItem:(k:string)=>{storage.delete(k);}}}});Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:404})});
async function lease(){await writeCharacterMirrorRaw(CHAR_SLOT,raw);const read=await readCharacterResume();if(read.status!=='ready')throw Error('Actual saved character lease missing');return read.resume;}
const original=NativeAreaSceneCombat.prototype.restoreCharacterFields;
let prior:NativeAreaSceneOngoing|undefined,token:NativeCharacterResumeReceipt|undefined;
NativeAreaSceneCombat.prototype.restoreCharacterFields=function(proof,save){const receipt=assertNativeCharacterResume(proof,'fields');prior=receipt.area;token=proof;return Reflect.apply(original,this,[proof,save]);};
try{
 const account=makeAccount(),baseline=JSON.stringify(serializeAccount(account));
 const result=await refuseWorldContinue(async worldDrivers=>{
  const restored=await prepareNativeCharacterContinue(account,await lease(),{spawn:'exact',isCurrent:()=>true}),made=restored.publish(),source=prior,expired=token;assert(source&&expired);assert.notEqual(source,made.runtime.current);const before={x:made.writer.player.pos.x,y:made.writer.player.pos.y,life:made.writer.player.life};
  assert.throws(()=>assertNativeCharacterResume(expired,'fields'),/expired/);assert.throws(()=>source.combat.restoreCharacterFields(expired,JSON.parse(raw)),/expired/);assert.throws(()=>source.authority.bindingFor(source.assembly.input.scene),/Unregistered/);assert.throws(()=>source.assembly.input.population.createMonster('gnatling',1,'enemy'),/retired/);assert.throws(()=>source.combat.useSkill(made.writer.player,made.writer.player.skills[0]!,{...made.writer.player.pos}),/retired|registered|Foreign/i);assert.deepEqual({x:made.writer.player.pos.x,y:made.writer.player.pos.y,life:made.writer.player.life},before);assert.equal(made.runtime.current.authority.require(made.writer.player).combat,made.runtime.current.combat);made.runtime.retire();
  const stale=await lease();await writeCharacterMirrorRaw(CHAR_SLOT,raw+' ');await assert.rejects(prepareNativeCharacterContinue(account,stale,{spawn:'exact',isCurrent:()=>true}),/superseded/i);assert.equal(storage.get(charKeyFor(CHAR_SLOT)),raw+' ');
  const second=makeAccount();await assert.rejects(prepareNativeCharacterContinue(second,await lease(),{spawn:'exact',isCurrent:()=>true,loadingStage:async label=>{if(label.includes('recorded'))second.credits++;}}),/superseded/);assert.equal(second.credits,makeAccount().credits+1,'external account mutation survives refusal');
  const cancelAccount=makeAccount(),cancelBefore=JSON.stringify(serializeAccount(cancelAccount));await assert.rejects(prepareNativeCharacterContinue(cancelAccount,await lease(),{spawn:'exact',isCurrent:()=>true,loadingStage:async label=>{if(label.includes('ownership'))throw new Error('selected loading callback failure');}}),/selected loading callback failure/);assert.equal(JSON.stringify(serializeAccount(cancelAccount)),cancelBefore);assert(prior);assert.throws(()=>prior!.authority.bindingFor(prior!.assembly.input.scene),/Unregistered|retired/);assert.equal(storage.get(charKeyFor(CHAR_SLOT)),raw);
  return{expiredStage:true,oldPopulationRetired:true,oldBindingRemoved:true,heldOldCombatRefused:true,newBodyStillOwned:true,staleLeaseRefused:true,accountMutationPreserved:true,lateCallbackCleanup:true,sourceBytesPreserved:true,worldDrivers};
 });assert.notEqual(JSON.stringify(serializeAccount(account)),baseline,'publication installs actual character account changes');const report={scope:'Actual provisional restoration lifetime, stale real lease/account, late callback cleanup; no rollback of native partial effects or ordinary save transport ordering claim.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-client-continue-boundaries.json',report);console.log(JSON.stringify(report));
}finally{NativeAreaSceneCombat.prototype.restoreCharacterFields=original;random();}
