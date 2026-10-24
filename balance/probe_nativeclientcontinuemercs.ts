import '../src/engine/world';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {freshClientSetup,characterFacts} from './nativeClientStartFixture';
import {CLASSES} from '../src/data/classes';
import {MERC_TEMPLATES} from '../src/data/mercenaries';
import {serializeCharacter,readCharacterResume,writeCharacterMirrorRaw,CHAR_SLOT} from '../src/meta/character';
import {prepareCharacterWorld} from '../src/meta/resumeWorld';
import {NativeAreaMemoryRegistry} from '../src/worldmass/nativeAreaMemoryRegistry';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {makeAccount} from '../src/meta/account';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const restoreRandom=seedGlobalRandom(48030),setup=freshClientSetup(1211,false);
setup.writer.createPlayer(CLASSES.find(c=>c.id==='tamer')!);
const memory=new Map<string,string>();Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}}});Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:404})});
try{
 for(const [i,template] of MERC_TEMPLATES.slice(0,2).entries()){const snapshot=setup.writer['templateSnapshot'](template,3);setup.writer.restoreHiredMerc({name:'Saved company '+i,snapshot,templateId:template.id});}
 assert.equal(setup.writer.hiredMercs.length,2);setup.writer.player.life=setup.writer.player.maxLife()*.37;
 // Reference fixture: actual ordinary native character/mercenary factories and save,
 // sealed by the genuine registry with its recorded geography. The retained-save
 // origin is covered separately by the disk proof; this lane isolates restoration.
 const registry=new NativeAreaMemoryRegistry(setup.writer);registry.bindRecordedGeography(setup.geography);const raw=JSON.stringify(serializeCharacter(setup.writer));writeFileSync('../mercenary-save-character.json',raw);
 async function lease(){await writeCharacterMirrorRaw(CHAR_SLOT,raw);const result=await readCharacterResume();if(result.status!=='ready')throw Error('Missing genuine resume lease');return result.resume;}
 const oracleRandom=seedGlobalRandom(48031),oracle=await prepareCharacterWorld(makeAccount(),await lease(),{spawn:'exact',fallbackSeed:1211,isCurrent:()=>true});const ordinary=oracle.publish();oracleRandom();
 function facts(w:typeof ordinary){return {class:characterFacts(w),mercenaries:w.hiredMercs.map(m=>({id:m.seat.id,name:m.name,ref:m.templateId,level:m.seat.actor.level,life:m.seat.actor.life,maxLife:m.seat.actor.maxLife(),attrs:m.seat.meta.attrs,bar:m.seat.actor.skills.map(s=>s?.def.id??null)})),save:serializeCharacter(w).mercenaries};}
 const expected=facts(ordinary),retainedRandom=seedGlobalRandom(48031);
 const result=await refuseWorldContinue(async worldDrivers=>{const restored=await prepareNativeCharacterContinue(makeAccount(),await lease(),{spawn:'exact',isCurrent:()=>true}),made=restored.publish(),actual=facts(made.writer);assert.deepEqual(actual,expected,'actual pre-roster factory + normalization + insertion equals native restore');assert.equal(made.writer.seats.length,3);const area=made.runtime.current;for(const row of made.writer.seats)assert.equal(area.authority.require(row.actor).combat,area.combat);made.runtime.dispatch({dt:.01,wallSeconds:.01,inputs:new Map()});made.runtime.retire();return {mercenaries:actual.mercenaries,companions:actual.class.companions.length,originalParity:true,admittedSeats:3,worldDrivers};});retainedRandom();
 const report={scope:'Two genuine ordinary native mercenary contracts saved and compared through original full Continue versus actual retained restoration; native normalization/admission and real MercInput frame.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-client-continue-mercenaries.json',report);console.log(JSON.stringify(report));
}finally{restoreRandom();}
