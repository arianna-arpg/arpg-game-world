/** Actual physical-area AI dispatch. Native algorithms share the aggregate's one host. */
import type {Actor} from '../engine/actor';
import type {World} from '../engine/world';
import {updateAI} from '../engine/ai';
import {nativeSeekPrey} from '../engine/nativeHostility';
import type {NativeSceneAIHost} from '../engine/nativeSceneAIHost';
import * as native from '../engine/nativeSceneAIPreparation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
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
 onBeastEscape(...args:Parameters<World["onBeastEscape"]>):ReturnType<World["onBeastEscape"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneOnBeastEscape(this.#host,...args));}
 comboQueuedStep(...args:Parameters<World["comboQueuedStep"]>):ReturnType<World["comboQueuedStep"]>{return this.#entry(this,{permission:'physical',physical:[args[0]]},()=>native.sceneComboQueuedStep(this.#host,...args));}
 tierLinkSeats(...args:Parameters<World["tierLinkSeats"]>):ReturnType<World["tierLinkSeats"]>{return this.#entry(this,{permission:'physical',physical:[]},()=>native.sceneTierLinkSeats(this.#host,...args));}
}
