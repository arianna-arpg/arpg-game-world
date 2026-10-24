import {assertNativeAddedSeat,type NativeAddedSeatReceipt} from './nativeAreaParty';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';
import {assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';
import {nativeAreaStoreClaims} from './nativeAreaStorageClaims';
import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
/** Retained native progression. Every mutation enters through explicit admitted
 * actor authority; native cleanup keeps the area's actual persistent queues. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneEcology} from './nativeAreaSceneEcology';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneRuntimeBirth} from './nativeAreaSceneRuntimeBirth';
import type {NativeAreaSceneLoot} from './nativeAreaSceneLoot';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {CompanionGrants} from '../engine/companionGrants';
import {GuardArts,type NativeGuardArtsHost} from '../engine/guardArts';
import {CompanionBonds,type NativeCompanionBondsHost} from '../engine/companionBonds';
import {AttackSequences,type NativeAttackSequencesHost} from '../engine/attackSequences';
import {Challenges,type NativeChallengesHost} from '../engine/challenges';
import * as native from '../engine/nativeSceneProgression';

type Host=native.NativeSceneProgressionHost;
type ControllerHost=NativeGuardArtsHost & NativeCompanionBondsHost & NativeAttackSequencesHost & NativeChallengesHost;
export type NativeSceneProgressionCampaign=Pick<World,'account'|'clientActionHook'|'localSeat'|'seats'|'time'|'timeflow'|'seatHero'|'seatOf'|'markMetaDirty'> & {hiredMercs:World['hiredMercs'];mercSyncedLevel:World['mercSyncedLevel']};
/** This is the actual registered area combat runtime, never an active-World fallback. */
export interface NativeSceneProgressionCombat {
 readonly scene:NativeSceneCensus;
 readonly state:NativeSceneProgressionState;
 kill:World['kill'];guardBash:World['guardBash'];executeSkill:World['executeSkill'];burstDamage:World['burstDamage'];
 guardArtHit:World['guardArtHit'];litePromoteNearest:World['litePromoteNearest'];companionPulseHit:World['companionPulseHit'];useSkill:World['useSkill'];
 spawnConstruct:World['spawnConstruct'];spawnProjectile:World['spawnProjectile'];attackSequenceBurst:World['attackSequenceBurst'];challengeBurst:World['challengeBurst'];challengeHit:World['challengeHit'];
}
export interface NativeSceneProgressionRuntime {progression:NativeAreaSceneProgression;combat:NativeSceneProgressionCombat}
export type NativeSceneProgressionAuthority=Pick<NativeAreaActorAuthority<NativeSceneProgressionRuntime>,'campaign'|'require'|'assertAdmitted'|'physicalActorById'|'bindingFor'>;
export interface NativeSceneProgressionState {
 pendingRespawns:World['pendingRespawns'];pendingSummons:World['pendingSummons'];projectiles:World['projectiles'];zones:World['zones'];
 pendingRepeats:World['pendingRepeats'];pendingFuses:World['pendingFuses'];pendingSalvos:World['pendingSalvos'];pendingSteps:World['pendingSteps'];
 pendingFollowUps:World['pendingFollowUps'];pendingBlinks:World['pendingBlinks'];treeBuffSources:World['treeBuffSources'];recallTreeSpears:World['recallTreeSpears'];emergences:World['emergences'];
}
export function freshSceneProgressionState():NativeSceneProgressionState{return {pendingRespawns:[],pendingSummons:[],projectiles:[],zones:[],pendingRepeats:[],pendingFuses:[],pendingSalvos:[],pendingSteps:[],pendingFollowUps:[],pendingBlinks:[],treeBuffSources:new WeakMap(),recallTreeSpears:new WeakMap(),emergences:[]};}
export interface NativeSceneProgressionInput {
 scene:NativeSceneCensus;population:NativeAreaScenePopulation;ecology:NativeAreaSceneEcology;
 geometry:NativeAreaSceneGeometry;runtime:Pick<NativeAreaSceneRuntimeBirth,'input'|'actorById'>;
 loot:Pick<NativeAreaSceneLoot,'input'|'shedOrb'>;campaign:NativeSceneProgressionCampaign;state:NativeSceneProgressionState;authority:NativeSceneProgressionAuthority;
}
const restoredUnclaimed=NativeAreaActorAuthority.prototype.assertUnclaimed;
const localMethods=['normalizeMercMeta','trimAllocated','summonCrewSkills','companionCapOf','inheritedFlight','emergeGroundAt'] as const;
const actorMethods=['relevelActor','bakeMinionOwnerStats','deactivateAura','dismissSummonToggle','clearSummonReleaseFields','minionsOfSkill','releaseContract','settleLedger','clearTreeFields','clearTreeConstructs','guardArtCooldown','stampSkillCooldown','showCompanionCue','reviveCompanion','recoverCompanion','showRecoveryCue','emergeBody'] as const;
/** Cleanup may reference a retired payload caster no longer present in the census.
 * Such recursive work is authorized by its exact stored local payload and the
 * already admitted outer operation, never by guessing another live actor's ID. */
const localCleanup=new Set(['clearTreeFields','clearTreeConstructs','deactivateAura','expireZone','retireOwnedZone']);
const effectMethods=['kill','guardBash','executeSkill','guardArtHit','companionPulseHit','useSkill','spawnConstruct','spawnProjectile','attackSequenceBurst','challengeBurst','challengeHit'] as const;
// The replacement state and each raw store have one lifetime owner. A retired
// array/map may be reassigned only to its original slot; different slots must
// never alias, even within one area. Native methods keep raw storage identity.
const progressionArraySlots=['pendingRespawns','pendingSummons','projectiles','zones','pendingRepeats','pendingFuses','pendingSalvos','pendingSteps','pendingFollowUps','pendingBlinks','emergences'] as const;
const progressionMapSlots=['treeBuffSources','recallTreeSpears'] as const;
const ownedProgressionStates=new WeakSet<NativeSceneProgressionState>();
const ownedProgressionStores=nativeAreaStoreClaims;
const weakMapHas=WeakMap.prototype.has,weakMapBrandKey={};
function progressionStore(value:unknown,map:boolean):object {
 if(map){
  // Brand-check without reading or replacing the supplied map's methods.
  try{Reflect.apply(weakMapHas,value,[weakMapBrandKey]);}
  catch{throw Error('Native progression needs an actual WeakMap store');}
 }else if(!Array.isArray(value))throw Error('Native progression needs an actual queue array');
 return value as object;
}
function ownProgressionStorage(state:NativeSceneProgressionState):void {
 if(ownedProgressionStates.has(state))throw Error('Native progression needs a fresh local storage state');
 const rows:{key:keyof NativeSceneProgressionState;map:boolean;value:object;enumerable:boolean;token:object}[]=[],seen=new Set<object>();
 for(const key of [...progressionArraySlots,...progressionMapSlots]){
  const descriptor=Object.getOwnPropertyDescriptor(state,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.writable||!descriptor.configurable)throw Error('Native progression needs an own configurable mutable storage slot: '+key);
  const map=(progressionMapSlots as readonly string[]).includes(key),value=progressionStore(descriptor.value,map);
  if(seen.has(value)||ownedProgressionStores.has(value))throw Error('Native progression store already belongs to another slot');
  seen.add(value);rows.push({key,map,value,enumerable:!!descriptor.enumerable,token:{}});
 }
 // All ordinary own-data validation and controller assembly have finished.
 // Redefinition of these existing configurable slots does not require an
 // extensible state. Adversarial Proxy traps/global intrinsic replacement are
 // outside this ordinary supplied-state contract; no rollback is claimed there.
 const descriptors:PropertyDescriptorMap={};
 for(const row of rows){const {key,map,token}=row;let current=row.value;descriptors[key]={enumerable:row.enumerable,configurable:false,
  get:()=>current,
  set:(value:unknown)=>{
   const next=progressionStore(value,map),prior=ownedProgressionStores.get(next);
   if(prior&&prior!==token)throw Error('Native progression store belongs to another slot');
   ownedProgressionStores.set(next,token);current=next;
  },
 };}
 Object.defineProperties(state,descriptors);
 for(const row of rows)ownedProgressionStores.set(row.value,row.token);
 ownedProgressionStates.add(state);
}
export class NativeAreaSceneProgression {
 readonly input:NativeSceneProgressionInput;readonly host:Host & ControllerHost;
 readonly companionGrants=new CompanionGrants();
 get lite(){return this.input.ecology.input.state.lite;}
 readonly guardArts:GuardArts;readonly companionBonds:CompanionBonds;readonly attackSequences:AttackSequences;readonly challenges:Challenges;
 #subject:Actor|null=null;#nativeDepth=0;
 readonly #expiryHost:Host;
 constructor(raw:NativeSceneProgressionInput){
  const bindings=Object.create(null);for(const key of ['scene','population','ecology','geometry','runtime','loot','campaign','state','authority']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native progression needs an own object binding: '+key);bindings[key]=d.value;
  }
  const input:NativeSceneProgressionInput=this.input=Object.freeze(bindings),self=this,host={} as Host & ControllerHost;
  if(input.ecology.input.scene!==input.scene||input.ecology.input.geometry!==input.geometry||input.ecology.input.population!==input.population||input.geometry.state!==input.scene||input.population.input.scene!==input.scene||input.population.input.geometry!==input.geometry||input.runtime.input.scene!==input.scene||input.runtime.input.geometry!==input.geometry)throw Error('Native progression needs identical ecology, geometry, population and scene');
  if(input.authority.campaign as object!==input.campaign||input.population.input.campaign as object!==input.campaign||input.runtime.input.campaign as object!==input.campaign||input.loot.input.campaign as object!==input.campaign)throw Error('Native progression needs identical campaign authority and owners');
  if(input.loot.input.scene!==input.scene||input.loot.input.geometry!==input.geometry)throw Error('Native progression needs identical loot area');
  const fields=(provider:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return (provider() as Record<string,unknown>)[key];},...(write?{set(value:unknown){(provider() as Record<string,unknown>)[key]=value;}}:{})});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const owner=provider() as Record<string,Function>,fn=owner[key];return (...args:unknown[])=>fn.apply(owner,args);}});};
  fields(()=>input.scene,['zone','player','actors']);fields(()=>input.geometry,['walk','flashes']);
  fields(()=>input.campaign,['account','clientActionHook','localSeat','seats','time','timeflow','hiredMercs']);fields(()=>input.campaign,['mercSyncedLevel'],true);
  fields(()=>input.state,['pendingRespawns','pendingSummons','projectiles','zones','pendingRepeats','pendingFuses','pendingSalvos','pendingSteps','pendingFollowUps','pendingBlinks','treeBuffSources','recallTreeSpears','emergences'],true);
  fields(()=>self,['companionGrants','guardArts','companionBonds','attackSequences','challenges','lite']);fields(()=>input.population.factory,['relayStatus']);
  methods(()=>input.runtime,['actorById']);methods(()=>input.population.factory,['stampMonsterLevel']);methods(()=>input.population,['enemiesOf']);methods(()=>input.geometry,['groundAt','lineOfSight','lineOfFire','clampPos','text']);methods(()=>input.loot,['shedOrb']);
  methods(()=>input.campaign,['seatHero','seatOf','markMetaDirty']);
  for(const name of [...localMethods,...actorMethods,'recalcSeat','resyncMercenary','mercTargetLevel','applyMercNormalization','retireOwnedZone','expireZone'] as const)Object.defineProperty(host,name,{enumerable:true,get(){
   if(localCleanup.has(name)&&self.#nativeDepth>0)return (...args:unknown[])=>self.#native(name,args);
   const fn=(self as unknown as Record<string,Function>)[name];return (...args:unknown[])=>fn.apply(self,args);
  }});
  for(const name of effectMethods)Object.defineProperty(host,name,{enumerable:true,get(){return (...args:unknown[])=>self.#effect(args[0] as Actor,name,args);}});
  for(const name of ['burstDamage','litePromoteNearest'] as const)Object.defineProperty(host,name,{enumerable:true,get(){return (...args:unknown[])=>self.#effect(self.#subject??input.scene.player,name,args);}});
  this.host=Object.freeze(host);
  // Only madness cleanup inside native expireZone uses the session census.
  // Every other progression lookup retains the original local runtime receiver.
  const expiryHost=Object.create(host) as Host;
  Object.defineProperty(expiryHost,'actorById',{enumerable:true,get(){const owner=input.authority,fn=owner.physicalActorById;return(...args:Parameters<typeof fn>)=>Reflect.apply(fn,owner,args);}});
  this.#expiryHost=Object.freeze(expiryHost);
  this.guardArts=new GuardArts(host);this.companionBonds=new CompanionBonds(host);this.attackSequences=new AttackSequences(host);this.challenges=new Challenges(host);
  Object.defineProperty(this,'lite',{enumerable:true,configurable:false,get:()=>input.ecology.input.state.lite});
  for(const key of ['input','host','companionGrants','guardArts','companionBonds','attackSequences','challenges'])Object.defineProperty(this,key,{writable:false,configurable:false});
  ownProgressionStorage(input.state);
 }
 #owner(actor:Actor){const owner=this.input.authority.require(actor);if(owner.progression.input.authority!==this.input.authority||owner.progression.input.scene!==owner.scene||owner.combat.scene!==owner.scene||owner.combat.state!==owner.progression.input.state)throw Error('Mismatched native progression runtime authority');return owner;}
 #native(name:string,args:unknown[]){this.#nativeDepth++;try{return (native as unknown as Record<string,Function>)['scene'+name[0].toUpperCase()+name.slice(1)](name==='expireZone'?this.#expiryHost:this.host,...args);}finally{this.#nativeDepth--;}}
 #run(actor:Actor,name:string,args:unknown[]){if(nativeCombatActorEntry(this,actor,name==='bakeMinionOwnerStats'||name==='relevelActor'?'prepare':'stats'))return this.#native(name,args);const owner=this.#owner(actor),target=owner.progression;this.input.authority.assertAdmitted(owner.scene);const previous=target.#subject;target.#subject=actor;try{return target.#native(name,args);}finally{target.#subject=previous;}}
 #effect(actor:Actor,name:keyof Omit<NativeSceneProgressionCombat,'scene'|'state'>,args:unknown[]){if(nativeCombatActorEntry(this,actor,'proc')){const combat=this.input.authority.bindingFor(this.input.scene).services.combat;return Reflect.apply(combat[name],combat,args);}const owner=this.#owner(actor);this.input.authority.assertAdmitted(owner.scene);const fn=owner.combat[name];return Reflect.apply(fn,owner.combat,args);}
 #seat(seat:Seat){if(!this.input.campaign.seats.includes(seat))throw Error('Foreign native progression seat');return this.input.campaign.seatHero(seat);}
 recalcInitialCharacter(token:NativeCharacterCreationReceipt):void {const r=assertNativeCharacterReceipt(token,'stats');if(r.area?.progression!==this||r.area.assembly.input.scene!==this.input.scene||r.preparation.input.authority!==this.input.authority)throw Error('Native initial stats need this exact created area');this.input.authority.bindingFor(this.input.scene);r.preparation.input.authority.assertUnclaimed(r.seat.actor);this.#native('recalcSeat',[r.seat]);}
 recalcRestoredSeat(token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'seat');if(r.area?.progression!==this||!r.seat||r.preparation.input.authority!==this.input.authority)throw Error('Native saved-seat stats need the exact actual factory');Reflect.apply(restoredUnclaimed,r.preparation.input.authority,[r.seat.actor]);assertNativeCharacterResume(token,'seat');this.#native('recalcSeat',[r.seat]);}
 recalcAddedSeat(token:NativeAddedSeatReceipt):void {const r=assertNativeAddedSeat(token);if(r.combat.input.progression!==this||r.combat.input.authority!==this.input.authority||r.combat.scene!==this.input.scene)throw Error('Native added-seat stats need their actual area');Reflect.apply(restoredUnclaimed,r.combat.input.authority,[r.body]);assertNativeAddedSeat(token);this.#native('recalcSeat',[r.seat]);}
 recalcSeat(seat:Seat):void{this.#run(this.#seat(seat),'recalcSeat',[seat]);}
 resyncMercenary():void{this.#run(this.#seat(this.input.campaign.localSeat),'resyncMercenary',[]);}
 mercTargetLevel():number{return this.#run(this.#seat(this.input.campaign.localSeat),'mercTargetLevel',[]);}
 applyMercNormalization(...args:Parameters<World['applyMercNormalization']>):boolean{return this.#run(this.#seat(this.input.campaign.localSeat),'applyMercNormalization',args);}
 retireOwnedZone(z:World['zones'][number]):void{this.input.authority.assertAdmitted(this.input.scene);if(!this.input.state.zones.includes(z))throw Error('Foreign native progression zone');this.#native('retireOwnedZone',[z]);}
 expireZone(z:World['zones'][number]):void{this.input.authority.assertAdmitted(this.input.scene);if(!this.input.state.zones.includes(z))throw Error('Foreign native progression zone');this.#native('expireZone',[z]);}
 normalizeMercMeta(...args:Parameters<World['normalizeMercMeta']>):ReturnType<World['normalizeMercMeta']>{return this.#native('normalizeMercMeta',args);}
 trimAllocated(...args:Parameters<World['trimAllocated']>):ReturnType<World['trimAllocated']>{return this.#native('trimAllocated',args);}
 summonCrewSkills(...args:Parameters<World['summonCrewSkills']>):ReturnType<World['summonCrewSkills']>{return this.#native('summonCrewSkills',args);}
 companionCapOf(...args:Parameters<World['companionCapOf']>):ReturnType<World['companionCapOf']>{return this.#native('companionCapOf',args);}
 inheritedFlight(...args:Parameters<World['inheritedFlight']>):ReturnType<World['inheritedFlight']>{return this.#native('inheritedFlight',args);}
 emergeGroundAt(...args:Parameters<World['emergeGroundAt']>):ReturnType<World['emergeGroundAt']>{return this.#native('emergeGroundAt',args);}
 relevelActor(...args:Parameters<World['relevelActor']>):ReturnType<World['relevelActor']>{return this.#run(args[0],'relevelActor',args);}
 bakeMinionOwnerStats(...args:Parameters<World['bakeMinionOwnerStats']>):ReturnType<World['bakeMinionOwnerStats']>{return this.#run(args[0],'bakeMinionOwnerStats',args);}
 deactivateAura(...args:Parameters<World['deactivateAura']>):ReturnType<World['deactivateAura']>{return this.#run(args[0],'deactivateAura',args);}
 dismissSummonToggle(...args:Parameters<World['dismissSummonToggle']>):ReturnType<World['dismissSummonToggle']>{return this.#run(args[0],'dismissSummonToggle',args);}
 clearSummonReleaseFields(...args:Parameters<World['clearSummonReleaseFields']>):ReturnType<World['clearSummonReleaseFields']>{return this.#run(args[0],'clearSummonReleaseFields',args);}
 minionsOfSkill(...args:Parameters<World['minionsOfSkill']>):ReturnType<World['minionsOfSkill']>{return this.#run(args[0],'minionsOfSkill',args);}
 releaseContract(...args:Parameters<World['releaseContract']>):ReturnType<World['releaseContract']>{return this.#run(args[0],'releaseContract',args);}
 settleLedger(...args:Parameters<World['settleLedger']>):ReturnType<World['settleLedger']>{return this.#run(args[0],'settleLedger',args);}
 clearTreeFields(...args:Parameters<World['clearTreeFields']>):ReturnType<World['clearTreeFields']>{return this.#run(args[0],'clearTreeFields',args);}
 clearTreeConstructs(...args:Parameters<World['clearTreeConstructs']>):ReturnType<World['clearTreeConstructs']>{return this.#run(args[0],'clearTreeConstructs',args);}
 guardArtCooldown(...args:Parameters<World['guardArtCooldown']>):ReturnType<World['guardArtCooldown']>{return this.#run(args[0],'guardArtCooldown',args);}
 stampSkillCooldown(...args:Parameters<World['stampSkillCooldown']>):ReturnType<World['stampSkillCooldown']>{return this.#run(args[0],'stampSkillCooldown',args);}
 showCompanionCue(...args:Parameters<World['showCompanionCue']>):ReturnType<World['showCompanionCue']>{return this.#run(args[0],'showCompanionCue',args);}
 reviveCompanion(...args:Parameters<World['reviveCompanion']>):ReturnType<World['reviveCompanion']>{return this.#run(args[0],'reviveCompanion',args);}
 recoverCompanion(...args:Parameters<World['recoverCompanion']>):ReturnType<World['recoverCompanion']>{return this.#run(args[0],'recoverCompanion',args);}
 showRecoveryCue(...args:Parameters<World['showRecoveryCue']>):ReturnType<World['showRecoveryCue']>{return this.#run(args[0],'showRecoveryCue',args);}
 emergeBody(...args:Parameters<World['emergeBody']>):ReturnType<World['emergeBody']>{return this.#run(args[0],'emergeBody',args);}
}
