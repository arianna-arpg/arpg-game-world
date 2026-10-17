import '../src/engine/world';
import assert from 'node:assert/strict';
import {World} from '../src/engine/world';
import {COMBAT_WORLD_METHODS} from './probe_nativecombatcycle';
export async function refuseWorldContinue<T>(action:(calls:string[])=>Promise<T>):Promise<T>{const names=[...new Set([...COMBAT_WORLD_METHODS,'makePlayerSeat','createPlayer','grantStartingCompanions','dealVeteranFlasks','dealLabArts','applySkillGraft','rescaleEnemies','addSeat','adoptSavedMeta','adoptSeatMeta','reconcileContainers','spawnMercSeat','restoreHiredMerc','restoreThrong','adoptWorldState','scrubStaleObjectives','rebuildVendorHolds','vendorLootToEntry','reconcileSoulrivers','reconcileSeaPorts','reconcileWebLaws','liteKindOf','actorById','hostileTo','skyFront','restoreCompanions','resumeSpawn'])],saved:{name:string;descriptor:PropertyDescriptor}[]=[],calls:string[]=[];try{for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(World.prototype,name);if(!descriptor)continue;if(typeof descriptor.value!=='function'&&typeof descriptor.get!=='function')continue;assert(descriptor.configurable);saved.push({name,descriptor});const refusal=()=>{calls.push(name);throw Error('Retained Continue called World local driver: '+name);};Object.defineProperty(World.prototype,name,Object.hasOwn(descriptor,'value')?{...descriptor,value:refusal}:{...descriptor,get:refusal});}const result=await action(calls);assert.deepEqual(calls,[]);return result;}finally{for(const row of saved.reverse())Object.defineProperty(World.prototype,row.name,row.descriptor);}}

import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {serializeCharacter} from '../src/meta/character';
import {address} from '../src/worldmass/address';
import type {MassNativeMapping} from '../src/worldmass/nativeGeography';
/** Every consumer creates its own actual retained saved game; no ignored artifact input. */
export function recordedContinueSave():string {
 bootSimEngine();const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
 const account=makeAccount(),start=new NativeClientStart(account,mapping);try{const made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='tamer')!,manifest:buildManifest(account,1211),prologue:'skip'});assert(made);made.writer.player.life=made.writer.player.maxLife()*.37;made.writer.player.mana=made.writer.player.maxMana()*.43;return JSON.stringify(serializeCharacter(made.writer));}finally{start.cancel();}
}
