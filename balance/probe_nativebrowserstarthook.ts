import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {loadCharacter} from '../src/meta/character';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart,type NativeClientStarted} from '../src/worldmass/nativeClientStart';
import {NullInput} from '../src/net/intent';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();
const cls=CLASSES.find(c=>c.id==='tamer')!,results=[];
results.push(withSeededRandom(55501,()=>{const account=makeAccount(),start=new NativeClientStart(account);return refuseWorldStartup([],worldDrivers=>{
 let calls=0;const made=start.begin({kind:'run',classDef:cls,manifest:buildManifest(account,1211),prologue:'skip',onReady:installed=>{
  calls++;assert(Object.isFrozen(installed));assert(installed.runtime.ready);assert.equal(start.current,undefined);assert.equal(start.pending,true);assert.throws(()=>start.begin({kind:'mu'}),/reenter/);
  const guest=installed.writer.addSeat('startup-guest',cls,new NullInput());assert.equal(installed.runtime.current.authority.require(guest.actor).combat,installed.runtime.current.combat);assert(installed.writer.actors.some(a=>a.companion&&a.owner===guest.actor));installed.writer.meta.name='Joined before baseline';
 }});assert(made);assert.equal(calls,1);assert.equal(start.current,made);assert.equal(made.writer.seats.length,2);const saved=loadCharacter();assert(saved);assert.equal(saved.charId,made.writer.meta.charId);assert.equal(saved.name,'Joined before baseline');assert(saved.world?.nativeRetained);start.cancel();assert.equal(made.runtime.ready,false);assert.deepEqual(worldDrivers,[]);return{case:'adoption and genuine guest before baseline',calls,readyDuringCallback:true,liveGuestAndGifts:true,savedAfterCallback:true,reentryRefused:true,worldDrivers};});}));
for(const kind of ['cancel','throw','getter-cancel'] as const)results.push(withSeededRandom(55502,()=>{const account=makeAccount(),start=new NativeClientStart(account),prior=loadCharacter()?.charId,sentinel=new Error('selected shell failure');let captured:NativeClientStarted|undefined,calls=0;const request={kind:'run' as const,classDef:cls,manifest:buildManifest(account,1212),prologue:'skip' as const,onReady:(installed:NativeClientStarted)=>{calls++;captured=installed;installed.writer.meta.name='Partial shell write';if(kind==='throw')throw sentinel;start.cancel();}};
 if(kind==='getter-cancel')Object.defineProperty(request,'onReady',{get(){start.cancel();return()=>{calls++;};}});
 return refuseWorldStartup([],worldDrivers=>{assert.throws(()=>start.begin(request),error=>kind==='throw'?error===sentinel:/cancelled/.test(String(error)));assert.equal(calls,kind==='getter-cancel'?0:1);assert.equal(start.current,undefined);assert.equal(start.pending,false);assert.equal(loadCharacter()?.charId,prior,'failed shell cannot replace prior baseline');if(captured){assert.equal(captured.runtime.ready,false);assert.equal(captured.writer.localSeat.meta.name,'Partial shell write','native prior write survives');}
 const retry=start.begin({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1213),prologue:'skip'});assert(retry?.runtime.ready);start.cancel();assert.deepEqual(worldDrivers,[]);return{case:kind,calls,priorSavePreserved:true,terminalRetirement:true,retry:true,worldDrivers};});}));
for(const disguise of [false,true])results.push(withSeededRandom(55509,()=>{const account=makeAccount(),start=new NativeClientStart(account),prior=loadCharacter()?.charId;let captured:NativeClientStarted|undefined;return refuseWorldStartup([],worldDrivers=>{
 assert.throws(()=>start.begin({kind:'run',classDef:cls,manifest:buildManifest(account,1214),prologue:'force',onReady:installed=>{captured=installed;installed.runtime.retire();if(disguise)Object.defineProperty(installed.runtime,'ready',{get(){throw Error('shadow ready getter must not run');}});}}),/no longer ready/);
 assert(captured);assert.equal(start.current,undefined);assert.equal(start.pending,false);assert.equal(loadCharacter()?.charId,prior);const retry=start.begin({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1215),prologue:'skip'});assert(retry?.runtime.ready);start.cancel();assert.deepEqual(worldDrivers,[]);return{case:disguise?'retired hook with shadow ready':'retired hook',priorSavePreserved:true,terminalRetirement:true,retry:true,worldDrivers};});}));
const report={scope:'Real retained installation, synchronous browser shell adoption and initial guest/gifts before the genuine baseline writer, with cancellation, selected callback failure and reentry.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-browser-start-hook.json',report);console.log(JSON.stringify(report));
