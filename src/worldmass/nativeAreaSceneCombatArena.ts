/** Native arena/AI changes use the area's actual geometry and actor census. */
import type {World} from '../engine/world';
import * as native from '../engine/nativeSceneCombatArena';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';
import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';
export interface NativeAreaSceneCombatArenaInput {combat:NativeAreaSceneCombat;campaignOwner:NativeAreaSceneCombatCampaign;entry:NativeAreaCombatOwnerEntry;hooks:NativeAreaCombatOwnerHooks}
type Host=native.NativeSceneCombatArenaHost;
type Binding<T>={get:()=>T;set?:(value:T)=>void};
function field<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>owner()[key],set:value=>{owner()[key]=value;}};}
function method<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>{const receiver=owner(),fn=receiver[key];return((...args:unknown[])=>Reflect.apply(fn as Function,receiver,args)) as O[K];}};}
export class NativeAreaSceneCombatArena {
 readonly input:Readonly<Omit<NativeAreaSceneCombatArenaInput,'entry'|'hooks'>>;
 readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #host:Host;
 constructor(raw:NativeAreaSceneCombatArenaInput){
  const own=(key:keyof NativeAreaSceneCombatArenaInput)=>{const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native arena needs own concrete root: '+key);return d.value;};
  const combat=own('combat'),campaignOwner=own('campaignOwner'),entry=own('entry'),hooks=own('hooks');
  if(!isNativeAreaSceneCombat(combat)||!(campaignOwner instanceof NativeAreaSceneCombatCampaign)||campaignOwner.input.combat!==combat)throw Error('Native arena needs actual identical combat owners');
  assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);this.#entry=entry;this.#hooks=hooks;
  this.input=Object.freeze({combat,campaignOwner});
  const {assembly}=combat.input,{scene,geometry,registry}=assembly.input;
  const bindings:{[K in keyof Host]:Binding<Host[K]>}={
   selectCombatBirthOwner:{get:()=> (parent,selectedOwner)=>this.#hooks.selectCombatBirthOwner(this,parent,selectedOwner)},
   actorById:method(()=>registry.input.birth,'actorById'),actors:field(()=>scene,'actors'),
   airPockets:field(()=>geometry,'airPockets'),arena:field(()=>geometry,'arena'),arenaSinks:field(()=>geometry,'arenaSinks'),bossRun:field(()=>geometry,'bossRun'),
   doodads:field(()=>geometry,'doodads'),exits:field(()=>geometry,'exits'),flashes:field(()=>geometry,'flashes'),structures:field(()=>geometry,'structures'),walk:field(()=>geometry,'walk'),
   dropGemAt:method(()=>assembly.lootController,'dropGemAt'),notice:method(()=>geometry,'notice'),text:method(()=>assembly.objectiveController,'text'),
   provenanceOf:method(()=>campaignOwner,'provenanceOf'),spawnMinion:method(()=>combat,'spawnMinion'),teleportActor:method(()=>combat.displacement,'teleportActor'),
   arenaRadiusOf:method(()=>this,'arenaRadiusOf'),finalizeGarrison:method(()=>this,'finalizeGarrison'),garrisonSlotById:method(()=>this,'garrisonSlotById'),nearestExit:method(()=>this,'nearestExit'),
   onBeastFleeBegin:method(()=>this,'onBeastFleeBegin'),paintSink:method(()=>this,'paintSink'),sinkRecordOf:method(()=>this,'sinkRecordOf'),
  };
  const host={} as Host;for(const key of Object.keys(bindings) as (keyof Host)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});this.#host=Object.freeze(host);
  Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 claimGarrisonSlot(...args:Parameters<World["claimGarrisonSlot"]>):ReturnType<World["claimGarrisonSlot"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneClaimGarrisonSlot(this.#host,...args));}
 crackArena(...args:Parameters<World["crackArena"]>):ReturnType<World["crackArena"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneCrackArena(this.#host,...args));}
 onBrainPhaseEnter(...args:Parameters<World["onBrainPhaseEnter"]>):ReturnType<World["onBrainPhaseEnter"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneOnBrainPhaseEnter(this.#host,...args));}
 restoreArena(...args:Parameters<World["restoreArena"]>):ReturnType<World["restoreArena"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneRestoreArena(this.#host,...args));}
 shrinkArenaPockets(...args:Parameters<World["shrinkArenaPockets"]>):ReturnType<World["shrinkArenaPockets"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneShrinkArenaPockets(this.#host,...args));}
 sinkArena(...args:Parameters<World["sinkArena"]>):ReturnType<World["sinkArena"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneSinkArena(this.#host,...args));}
 spawnSummonOffspring(...args:Parameters<World["spawnSummonOffspring"]>):ReturnType<World["spawnSummonOffspring"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneSpawnSummonOffspring(this.#host,...args));}
 startBurrow(...args:Parameters<World["startBurrow"]>):ReturnType<World["startBurrow"]>{return this.#entry(this,{physical:[args[0],args[2]],permission:'physical'},()=>native.sceneStartBurrow(this.#host,...args));}
 arenaRadiusOf(...args:Parameters<World["arenaRadiusOf"]>):ReturnType<World["arenaRadiusOf"]>{return this.#entry(this,{permission:'physical'},()=>native.sceneArenaRadiusOf(this.#host,...args));}
 sinkRecordOf(...args:Parameters<World["sinkRecordOf"]>):ReturnType<World["sinkRecordOf"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneSinkRecordOf(this.#host,...args));}
 paintSink(...args:Parameters<World["paintSink"]>):ReturnType<World["paintSink"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.scenePaintSink(this.#host,...args));}
 nearestExit(...args:Parameters<World["nearestExit"]>):ReturnType<World["nearestExit"]>{return this.#entry(this,{permission:'physical'},()=>native.sceneNearestExit(this.#host,...args));}
 onBeastFleeBegin(...args:Parameters<World["onBeastFleeBegin"]>):ReturnType<World["onBeastFleeBegin"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneOnBeastFleeBegin(this.#host,...args));}
 finalizeGarrison(...args:Parameters<World["finalizeGarrison"]>):ReturnType<World["finalizeGarrison"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneFinalizeGarrison(this.#host,...args));}
 garrisonSlotById(...args:Parameters<World["garrisonSlotById"]>):ReturnType<World["garrisonSlotById"]>{return this.#entry(this,{permission:'physical'},()=>native.sceneGarrisonSlotById(this.#host,...args));}
}
