/** Rejected asynchronous misuse must expire the real preparation scope without
 * leaving an unhandled rejection. No full spawn or runtime admission is implied. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {makeSimWorld} from '../src/sim/arena';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionAuthority} from '../src/worldmass/nativeAreaSceneProgression';
import {NativeAreaSceneSummonPreparation,type NativeSummonPreparationRuntime,type NativeSummonPreparationScope} from '../src/worldmass/nativeAreaSceneSummonPreparation';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import type {Actor} from '../src/engine/actor';
const w=makeSimWorld('warrior',19381),raw=freshAssemblyInput(w,w.zone),campaign=Object.assign(raw.campaign,{seatOf:w.seatOf.bind(w),timeflow:w.timeflow,mercSyncedLevel:(w as unknown as {mercSyncedLevel:number}).mercSyncedLevel});
const area=new NativeAreaSceneAssembly(raw),scene=area.input.scene,population=area.input.population;
const authority=new NativeAreaActorAuthority<NativeSummonPreparationRuntime>(campaign);
// This is the same explicit preparation-only constructor annotation as the
// native four-lane proof; it does not install substitute combat providers.
const progression=new NativeAreaSceneProgression({scene,population,ecology:area.input.ecology,geometry:area.input.geometry,runtime:area.input.registry.input.birth,loot:area.lootController,campaign,state:freshSceneProgressionState(),authority:authority as unknown as NativeSceneProgressionAuthority});
const owner=new NativeAreaSceneSummonPreparation({scene,population,campaign,progression,authority}),binding=authority.register(scene,{progression});authority.claim(binding,scene.actors);
const caster=scene.player,census=[...scene.actors],failures:unknown[]=[],checks:string[]=[];
const unhandled=(reason:unknown)=>{failures.push(reason);};process.on('unhandledRejection',unhandled);
const unchanged=()=>{assert.deepEqual(scene.actors,census);authority.assertAdmitted(scene);for(const actor of census)assert.equal(authority.require(actor).scene,scene);};
const flush=async()=>{await nextTurn();await nextTurn();};
async function checked(name:string,fn:()=>Promise<void>){await fn();await flush();unchanged();assert.deepEqual(failures,[],'refused async work must not emit unhandledRejection');checks.push(name);console.log('PASS '+name);}
try{
 await checked('async continuation is expired after caught synchronous refusal without losing prior body effects',async()=>{
  let scope!:NativeSummonPreparationScope,body!:Actor,expired=false,caught=false;
  try{owner.run(caster,async s=>{scope=s;body=s.createMonster('skeleton_warrior',9,caster.team,caster);body.life=1;await Promise.resolve();try{s.createMonster('skeleton_warrior',9,caster.team,caster);}catch(error){expired=/Expired or nested/.test(String(error));throw error;}});}catch(error){assert.match(String(error),/requires a synchronous operation/);caught=true;}
  assert(caught);assert(body);assert.equal(body.life,1);authority.assertUnclaimed(body);assert(!scene.actors.includes(body));assert.throws(()=>scope.relevelActor(body,10),/Expired or nested/);await flush();assert(expired);assert.equal(body.life,1);authority.assertUnclaimed(body);
 });
 await checked('async rejection before first await is observed after the outer catch',async()=>{
  let caught=false;try{owner.run(caster,async()=>{throw Error('async-before-await');});}catch(error){assert.match(String(error),/requires a synchronous operation/);caught=true;}assert(caught);
 });
 await checked('async rejection in a later event-loop turn is observed after the outer catch',async()=>{
  let caught=false,rejected=false;try{owner.run(caster,async()=>{await nextTurn();rejected=true;throw Error('async-after-outer-catch');});}catch(error){assert.match(String(error),/requires a synchronous operation/);caught=true;}assert(caught);await flush();assert(rejected);
 });
 await checked('captured then receiver is observed once only after scope expiry',async()=>{
  let reads=0,called=false,expired=false,scope!:NativeSummonPreparationScope;const result={get then(){reads++;return function(this:unknown,_fulfilled:()=>void,rejected:(error:unknown)=>void){assert.equal(this,result);called=true;try{scope.createMonster('skeleton_warrior',9,caster.team,caster);}catch(error){expired=/Expired or nested/.test(String(error));rejected(error);}return Promise.reject(Error('then-return-rejection'));};}};
  assert.throws(()=>owner.run(caster,s=>{scope=s;return result;}),/requires a synchronous operation/);assert.equal(reads,1);assert(!called);await flush();assert(called);assert(expired);assert.equal(reads,1);
 });
}finally{process.off('unhandledRejection',unhandled);}
const result={count:checks.length,receipt:createHash('sha256').update(JSON.stringify(checks)).digest('hex'),checks,unhandledRejections:failures.length};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativesummonpreparationasync.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
