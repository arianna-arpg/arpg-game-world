/** Actual physical-area AI dispatch. Native algorithms share the aggregate's one host. */
import type {Actor} from '../engine/actor';
import type {World} from '../engine/world';
import {updateAI} from '../engine/ai';
import {nativeHuntLifetimeCalls} from '../packages/overlays/hunt';
import {nativeUnclaimedActor} from './nativeAreaActorAuthority';
import {nativeSeekPrey} from '../engine/nativeHostility';
import type {NativeSceneAIHost} from '../engine/nativeSceneAIHost';
import * as native from '../engine/nativeSceneAIPreparation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
function huntData<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Hunt migration needs ordinary retained data');return d.value as T;}
function huntContains(rows:Actor[],body:Actor):boolean {for(let i=0,n=huntData<number>(rows,'length');i<n;i++)if(huntData(rows,i)===body)return true;return false;}
export class NativeAreaSceneAI {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #host:NativeSceneAIHost&native.NativeSceneAIPreparationHost;
 readonly losMemo:World['losMemo']=new Map();readonly pathProfiles:World['pathProfiles']=new Map();
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,host:NativeSceneAIHost&native.NativeSceneAIPreparationHost){if(!isNativeAreaSceneCombat(combat))throw Error('Native AI needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#host=host;for(const key of ['losMemo','pathProfiles'])Object.defineProperty(this,key,{writable:false,configurable:false});}
 updateActor(actor:Actor,dt:number):void{this.#entry(this,{permission:'physical',physical:[actor]},()=>updateAI(actor,this.#host,dt));}
 /** Matches the live native for-of census; successful births/removals retain its native iteration law. */
 update(dt:number):void{this.#entry(this,{permission:'physical'},()=>{if(!this.#host.gameOver)for(const actor of this.#host.actors)this.updateActor(actor,dt);});}
 seekPrey(...args:Parameters<World['seekPrey']>):ReturnType<World['seekPrey']>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>{const population=this.#combat.input.assembly.input.population;return nativeSeekPrey(population.hostility,population.input.sources.hostility,...args);});}
 claimRingSlot(...args:Parameters<World["claimRingSlot"]>):ReturnType<World["claimRingSlot"]>{return this.#entry(this,{permission:'physical',physical:[args[0],args[1]]},()=>native.sceneClaimRingSlot(this.#host,...args));}
 fallHazardAt(...args:Parameters<World["fallHazardAt"]>):ReturnType<World["fallHazardAt"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneFallHazardAt(this.#host,...args));}
 fleeIntoRefuge(...args:Parameters<World["fleeIntoRefuge"]>):ReturnType<World["fleeIntoRefuge"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneFleeIntoRefuge(this.#host,...args));}
 losCached(...args:Parameters<World["losCached"]>):ReturnType<World["losCached"]>{return this.#entry(this,{permission:'physical',physical:[args[0],args[1]]},()=>native.sceneLosCached(this.#host,...args));}
 lureFor(...args:Parameters<World["lureFor"]>):ReturnType<World["lureFor"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneLureFor(this.#host,...args));}
 onFleeArrive(...args:Parameters<World["onFleeArrive"]>):ReturnType<World["onFleeArrive"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneOnFleeArrive(this.#host,...args));}
 pathProfileFor(...args:Parameters<World["pathProfileFor"]>):ReturnType<World["pathProfileFor"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.scenePathProfileFor(this.#host,...args));}
 pressUsable(...args:Parameters<World["pressUsable"]>):ReturnType<World["pressUsable"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.scenePressUsable(this.#host,...args));}
 recentTierCrossing(...args:Parameters<World["recentTierCrossing"]>):ReturnType<World["recentTierCrossing"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneRecentTierCrossing(this.#host,...args));}
 requestEngage(...args:Parameters<World["requestEngage"]>):ReturnType<World["requestEngage"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneRequestEngage(this.#host,...args));}
 sanctuaryRetreat(...args:Parameters<World["sanctuaryRetreat"]>):ReturnType<World["sanctuaryRetreat"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneSanctuaryRetreat(this.#host,...args));}
 seekLoot(...args:Parameters<World["seekLoot"]>):ReturnType<World["seekLoot"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneSeekLoot(this.#host,...args));}
 tierLinkToward(...args:Parameters<World["tierLinkToward"]>):ReturnType<World["tierLinkToward"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneTierLinkToward(this.#host,...args));}
 onBeastEscape(...args:Parameters<World["onBeastEscape"]>):ReturnType<World["onBeastEscape"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>{
  const combat=this.#combat,scene=combat.scene,zone=scene.zone,sim=combat.input.campaign.sim,field=sim.huntField;
  const state=combat.input.assembly.input.registry.input.birth.input.state,body=args[0],marker=huntData<Set<string>>(state,'materializedHunts'),actors=huntData<Actor[]>(scene,'actors');
  const before=field&&Reflect.apply(nativeHuntLifetimeCalls.peek,field,[]),epoch=before&&Reflect.apply(nativeHuntLifetimeCalls.epoch,field,[before.id]);
  const selected=before&&epoch&&before.revealed&&before.lifeFrac>0&&before.currentZoneId===zone.id&&huntData(state,'huntBeast')===body&&Reflect.apply(Set.prototype.has,marker,[before.id]);
  try{return native.sceneOnBeastEscape(this.#host,...args);}
  finally{
   // A cornered stand, failed migration or unfinished native retirement still
   // owns its consumed marker. Completed removal survives a later flash/text error.
   if(selected&&field&&combat.scene===scene&&scene.zone===zone&&combat.input.campaign.sim===sim&&sim.huntField===field&&combat.input.assembly.input.registry.input.birth.input.state===state&&huntData(state,'materializedHunts')===marker&&huntData(state,'huntBeast')===null&&huntData(scene,'actors')===actors&&!huntContains(actors,body)){
    const after=Reflect.apply(nativeHuntLifetimeCalls.peek,field,[]);
    if(after&&after.id===before.id&&Reflect.apply(nativeHuntLifetimeCalls.epoch,field,[before.id])===epoch&&after.currentZoneId!==zone.id&&after.lifeFrac>0){
     let released=false;try{Reflect.apply(nativeUnclaimedActor,combat.input.authority,[body]);released=true;}catch{/* Raw removal alone does not complete physical retirement. */}
     if(released)Reflect.apply(Set.prototype.delete,marker,[before.id]);
    }
   }
  }
 });}
 comboQueuedStep(...args:Parameters<World["comboQueuedStep"]>):ReturnType<World["comboQueuedStep"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneComboQueuedStep(this.#host,...args));}
 tierLinkSeats(...args:Parameters<World["tierLinkSeats"]>):ReturnType<World["tierLinkSeats"]>{return this.#entry(this,{permission:'physical',physical:[]},()=>native.sceneTierLinkSeats(this.#host,...args));}
}
