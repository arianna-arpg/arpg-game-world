/** Actual campaign consequences with late area selection through genuine handoffs. */
import {isNativeWorld,type World,type Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import * as transition from '../engine/nativeSceneCampaignTransitions';
import * as lifecycle from '../engine/nativeSceneCampaignLifecycle';
import * as death from '../engine/nativeSceneCampaignDeath';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {isNativeAreaSceneTransitionCoordinator,issueNativeTransitionOwnerBridge,type NativeTransitionOwnerBridge,type NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry,type NativeCombatSubjects} from './nativeAreaCombatOperation';
export interface NativeAreaSceneCampaignTransitionsInput {combat:NativeAreaSceneCombat;coordinator:NativeAreaSceneTransitionCoordinator;entry:NativeAreaCombatOwnerEntry}
type Binding<T>={get:()=>T;set?:(value:T)=>void};
function field<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>owner()[key],set:value=>{owner()[key]=value;}};}
function method<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>{const receiver=owner(),fn=receiver[key];return((...args:unknown[])=>Reflect.apply(fn as Function,receiver,args)) as O[K];}};}
function hostOf<H extends object>(bindings:{[K in keyof H]:Binding<H[K]>}):H{const host={} as H;for(const key of Object.keys(bindings) as (keyof H)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});return Object.freeze(host);}
function seatBody(seat:Seat):Actor{const d=Object.getOwnPropertyDescriptor(seat,'actor');if(!d||!Object.hasOwn(d,'value'))throw Error('Native transition needs ordinary controlled body');return d.value;}
export class NativeAreaSceneCampaignTransitions {
 readonly input:Readonly<Omit<NativeAreaSceneCampaignTransitionsInput,'entry'>>;readonly #entry:NativeAreaCombatOwnerEntry;readonly #bridge:NativeTransitionOwnerBridge;#removal:{seat:Seat;body:Actor}|null=null;
 constructor(raw:NativeAreaSceneCampaignTransitionsInput){
  const own=(key:keyof NativeAreaSceneCampaignTransitionsInput)=>{const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native transition needs own concrete root: '+key);return d.value;};
  const combat=own('combat'),coordinator=own('coordinator'),entry=own('entry');
  if(!isNativeAreaSceneCombat(combat)||!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeWorld(coordinator.input.characterWriter))throw Error('Native transition needs actual runtime owners');
  assertNativeCombatOwnerEntry(combat,entry);
  for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native transition campaign roots differ: '+key);
  this.input=Object.freeze({combat,coordinator});this.#entry=entry;this.#bridge=issueNativeTransitionOwnerBridge(coordinator,this,combat,entry);Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 #run<T>(subjects:NativeCombatSubjects,action:()=>T):T{const {combat,coordinator}=this.input;return coordinator.runFrom(coordinator.areaFor(combat),()=>this.#entry(this,subjects,action));}
 #selectedSeats():readonly Seat[]{const {coordinator}=this.input,area=coordinator.current,seats=coordinator.frame.seats;coordinator.input.authority.assertFinalPhysical(area.binding,seats.map(seatBody));return seats;}
 #retire(combat:NativeAreaSceneCombat,bodies:readonly Actor[]):void{const {authority,assembly}=combat.input,binding=authority.bindingFor(assembly.input.scene);for(const body of bodies)if(assembly.input.scene.actors.includes(body))throw Error('Native retirement needs the actual completed removal');authority.release(binding,bodies);if(bodies.length)combat.noteActorInsertion(bodies[0]);}
 #removeSeatActors(combat:NativeAreaSceneCombat,seat:Seat):void{
  const {authority,assembly}=combat.input,scene=assembly.input.scene,binding=authority.bindingFor(scene);authority.assertFinalPhysical(binding);
  const receipt=this.#removal;if(!receipt||receipt.seat!==seat||seatBody(seat)!==receipt.body)throw Error('Native seat removal lost its exact selected body');
  const original=scene.actors,body=receipt.body,selected=authority.selectActors([body]);if(selected[0].binding!==binding)throw Error('Native removed seat changed area');
  const next=original.filter(a=>a!==seat.actor&&a.owner!==seat.actor);
  authority.assertFinalSelections(selected);authority.assertFinalPhysical(binding);if(scene.actors!==original||seatBody(seat)!==body)throw Error('Native seat selection changed during removal');
  const removed=original.filter(a=>!next.includes(a));scene.actors=next;this.#retire(combat,removed);this.input.coordinator.retireSeat(seat);
 }
 #transitionHost(fixed?:NativeAreaSceneCombat):transition.NativeSceneCampaignTransitionHost{
  const {coordinator}=this.input,{campaign,characterWriter:writer}=coordinator.input;
  const area=()=>fixed?coordinator.areaFor(fixed):coordinator.current,combat=()=>area().combat,scene=()=>area().assembly.input.scene,geometry=()=>area().assembly.input.geometry,roads=()=>coordinator.roadsFor(combat());
  const bindings:{[K in keyof transition.NativeSceneCampaignTransitionHost]:Binding<transition.NativeSceneCampaignTransitionHost[K]>}={
   account:field(()=>campaign,'account'),
   accountDirty:field(()=>campaign,'accountDirty'),
   actors:field(scene,'actors'),
   applyEnvDamage:method(combat,'applyEnvDamage'),
   applyRecovery:method(combat,'applyRecovery'),
   arena:field(geometry,'arena'),
   bankCouchWipe:method(()=>combat().campaignTransitions,'bankCouchWipe'),
   beginModeFall:method(()=>combat().campaignTransitions,'beginModeFall'),
   beginModeRespawn:method(()=>combat().campaignTransitions,'beginModeRespawn'),
   beginPitDescent:method(()=>combat().campaignTransitions,'beginPitDescent'),
   beginSkyfall:method(()=>combat().campaignTransitions,'beginSkyfall'),
   beginTraversal:method(()=>combat().campaignTransitions,'beginTraversal'),
   caveExitGrace:field(roads,'caveExitGrace'),
   caveMap:field(()=>campaign,'caveMap'),
   caveReturn:field(roads,'caveReturn'),
   caveStack:field(roads,'caveStack'),
   charDirty:field(()=>campaign,'charDirty'),
   clampPos:method(geometry,'clampPos'),
   concludeWipe:method(()=>combat().campaignTransitions,'concludeWipe'),
   couchDirty:field(()=>writer,'couchDirty'),
   descentRun:field(()=>campaign,'descentRun'),
   descentSite:field(geometry,'descentSite'),
   dismissMercenary:method(()=>combat().campaignTransitions,'dismissMercenary'),
   distinctNameOf:method(()=>combat().campaignTransitions,'distinctNameOf'),
   entryFrom:field(roads,'entryFrom'),
   events:field(()=>combat().campaignOwner.shared,'events'),
   fallReckoning:field(()=>writer,'fallReckoning'),
   fellVessel:method(()=>combat().campaignTransitions,'fellVessel'),
   flashes:field(geometry,'flashes'),
   gameOver:field(()=>writer,'gameOver'),
   grantEssence:method(()=>combat().campaignTransitions,'grantEssence'),
   hiredMercs:field(()=>campaign,'hiredMercs'),
   kill:method(combat,'kill'),
   landPartyAt:method(()=>coordinator,'landPartyAt'),
   lastRespawnPayout:{get:()=>writer['lastRespawnPayout'],set:value=>{writer['lastRespawnPayout']=value;}},
   ledger:field(()=>campaign,'ledger'),
   loadZone:method(()=>coordinator,'loadZone'),
   localSeat:field(()=>campaign,'localSeat'),
   loseBagRelicsOnDeath:method(()=>combat().campaignTransitions,'loseBagRelicsOnDeath'),
   markMetaDirty:method(combat,'markMetaDirty'),
   meta:field(()=>campaign,'meta'),
   modeDef:method(()=>combat().campaignTransitions,'modeDef'),
   modeStageDef:method(()=>area().assembly.input.history,'modeStageDef'),
   nearestZoneOf:method(()=>area().assembly.input.arrival,'nearestZoneOf'),
   nemesisActive:method(()=>area().assembly.input.history,'nemesisActive'),
   nemesisEligible:method(()=>combat().campaignTransitions,'nemesisEligible'),
   notice:method(()=>campaign,'notice'),
   onRunEnded:method(()=>combat().campaignTransitions,'onRunEnded'),
   pendingRespawn:field(()=>writer,'pendingRespawn'),
   pitPolicyFor:method(combat,'pitPolicyFor'),
   player:{get:()=>{const selected=area(),body=selected.assembly.input.scene.player;coordinator.input.authority.assertFinalPhysical(selected.binding,[body]);return body;}},
   recalcSeat:method(()=>area().progression,'recalcSeat'),
   reckonRunEssence:method(()=>combat().campaignTransitions,'reckonRunEssence'),
   recordDeath:method(()=>combat().campaignTransitions,'recordDeath'),
   recordNemesisFall:method(()=>combat().campaignTransitions,'recordNemesisFall'),
   recordSeatDeath:method(()=>combat().campaignTransitions,'recordSeatDeath'),
   restoreAccountRelics:method(()=>combat().campaignTransitions,'restoreAccountRelics'),
   resurfaceFromDescent:method(()=>combat().campaignTransitions,'resurfaceFromDescent'),
   retireFallenActor:{get:()=>body=>this.#retire(combat(),[body])},
   runEndReason:field(()=>writer,'runEndReason'),
   sagaDirty:method(()=>area().assembly.input.history,'sagaDirty'),
   scatterPitArrival:method(()=>combat().campaignTransitions,'scatterPitArrival'),
   scene:field(()=>area().quests.input.state,'scene'),
   seatOf:method(()=>campaign,'seatOf'),
   seats:{get:()=>this.#selectedSeats()},
   showCompanionCue:method(()=>area().progression,'showCompanionCue'),
   sim:field(()=>campaign,'sim'),
   skyBelow:field(()=>area().assembly.input.state,'skyBelow'),
   stripCarryOf:method(()=>combat().campaignTransitions,'stripCarryOf'),
   stripCarryOnDeath:method(()=>combat().campaignTransitions,'stripCarryOnDeath'),
   teleportActor:method(()=>combat().displacement,'teleportActor'),
   text:method(()=>area().assembly.objectiveController,'text'),
   traversal:field(()=>writer,'traversal'),
   walk:field(geometry,'walk'),
   zone:field(scene,'zone'),
   zoneEntry:field(geometry,'zoneEntry'),
   zoneMap:field(()=>campaign,'zoneMap'),
  };return hostOf(bindings);
 }
 #lifecycleHost(fixed?:NativeAreaSceneCombat):lifecycle.NativeSceneCampaignLifecycleHost{
  const {coordinator}=this.input,{campaign,characterWriter:writer}=coordinator.input;
  const area=()=>fixed?coordinator.areaFor(fixed):coordinator.current,combat=()=>area().combat,scene=()=>area().assembly.input.scene,geometry=()=>area().assembly.input.geometry;
  const bindings:{[K in keyof lifecycle.NativeSceneCampaignLifecycleHost]:Binding<lifecycle.NativeSceneCampaignLifecycleHost[K]>}={
   account:field(()=>campaign,'account'),
   accountSeat:method(()=>campaign,'accountSeat'),
   arena:field(geometry,'arena'),
   bindTraversal:method(()=>this.#bridge,'bindTraversal'),
   bridges:field(geometry,'bridges'),
   clientActionHook:field(()=>campaign,'clientActionHook'),
   deathPresentation:field(()=>writer,'deathPresentation'),
   distinctNameOf:method(()=>combat().campaignTransitions,'distinctNameOf'),
   events:field(()=>combat().campaignOwner.shared,'events'),
   farthestStand:method(geometry,'farthestStand'),
   finishTraversal:method(()=>this.#bridge,'finishTraversal'),
   gameOver:field(()=>writer,'gameOver'),
   landPartyAt:method(()=>coordinator,'landPartyAt'),
   lastPlayerKiller:field(()=>combat().campaignOwner.shared,'lastPlayerKiller'),
   ledger:field(()=>campaign,'ledger'),
   localSeat:field(()=>campaign,'localSeat'),
   manifest:field(()=>campaign,'manifest'),
   markMetaDirty:method(combat,'markMetaDirty'),
   meta:field(()=>campaign,'meta'),
   modeStageDef:method(()=>area().assembly.input.history,'modeStageDef'),
   nemesisActive:method(()=>area().assembly.input.history,'nemesisActive'),
   nemesisEligible:method(()=>combat().campaignTransitions,'nemesisEligible'),
   notice:method(()=>campaign,'notice'),
   pickupFeed:field(()=>writer,'pickupFeed'),
   player:{get:()=>{const selected=area(),body=selected.assembly.input.scene.player;coordinator.input.authority.assertFinalPhysical(selected.binding,[body]);return body;}},
   pointInSolid:method(geometry,'pointInSolid'),
   runEndReason:field(()=>writer,'runEndReason'),
   sagaDirty:method(()=>area().assembly.input.history,'sagaDirty'),
   seats:{get:()=>this.#selectedSeats()},
   shake:field(()=>writer,'shake'),
   text:method(()=>area().assembly.objectiveController,'text'),
   time:field(()=>campaign,'time'),
   traversal:field(()=>writer,'traversal'),
   traversalAnchor:{get:()=>writer['traversalAnchor'],set:value=>{writer['traversalAnchor']=value;}},
   walk:field(geometry,'walk'),
   zone:field(scene,'zone'),
   zoneEntry:field(geometry,'zoneEntry'),
   zonePits:method(geometry,'zonePits'),
  };return hostOf(bindings);
 }
 #deathHost(fixed?:NativeAreaSceneCombat):death.NativeSceneCampaignDeathHost{
  const {coordinator}=this.input,{campaign,characterWriter:writer}=coordinator.input;
  const area=()=>fixed?coordinator.areaFor(fixed):coordinator.current,combat=()=>area().combat,scene=()=>area().assembly.input.scene;
  const bindings:{[K in keyof death.NativeSceneCampaignDeathHost]:Binding<death.NativeSceneCampaignDeathHost[K]>}={
   account:field(()=>campaign,'account'),
   accountDirty:field(()=>campaign,'accountDirty'),
   charDeaths:field(()=>campaign,'charDeaths'),
   charDirty:field(()=>campaign,'charDirty'),
   clientActionHook:field(()=>campaign,'clientActionHook'),
   events:field(()=>combat().campaignOwner.shared,'events'),
   hiredMercs:field(()=>campaign,'hiredMercs'),
   inCave:field(()=>area().assembly.transition,'inCave'),
   indexSeats:method(()=>combat().control,'indexSeats'),
   localSeat:field(()=>campaign,'localSeat'),
   loseBagRelicsOnDeath:method(()=>combat().campaignTransitions,'loseBagRelicsOnDeath'),
   manifest:field(()=>campaign,'manifest'),
   markMetaDirty:method(combat,'markMetaDirty'),
   meta:field(()=>campaign,'meta'),
   modeStageDef:method(()=>area().assembly.input.history,'modeStageDef'),
   moveBudget:field(()=>writer,'moveBudget'),
   player:{get:()=>{const selected=area(),body=selected.assembly.input.scene.player;coordinator.input.authority.assertFinalPhysical(selected.binding,[body]);return body;}},
   removeSeat:method(()=>combat().campaignTransitions,'removeSeat'),
   selectedRemovedSeat:{get:()=>seat=>{if(this.#removal?.seat!==seat||seatBody(seat)!==this.#removal.body)throw Error('Native removed seat selection changed');}},
   removeSeatActors:{get:()=>seat=>this.#removeSeatActors(combat(),seat)},
   seatHero:method(()=>campaign,'seatHero'),
   seatQuests:field(()=>writer,'seatQuests'),
   seatShelves:field(()=>writer,'seatShelves'),
   seats:field(()=>campaign,'seats'),
   spentPresses:{get:()=>writer['spentPresses'],set:value=>{writer['spentPresses']=value;}},
   text:method(()=>area().assembly.objectiveController,'text'),
   zone:field(scene,'zone'),
   actors:field(scene,'actors'),
  };return hostOf(bindings);
 }
 onPlayerDown(...args:Parameters<World['onPlayerDown']>):ReturnType<World['onPlayerDown']>{return this.#run({physical:[args[0]],sources:args[1]?[args[1]]:[],permission:'attribution'},()=>transition.sceneOnPlayerDown(this.#transitionHost(),...args));}
 concludeWipe(...args:Parameters<World['concludeWipe']>):ReturnType<World['concludeWipe']>{return this.#run({permission:'physical'},()=>transition.sceneConcludeWipe(this.#transitionHost(),...args));}
 beginModeFall(...args:Parameters<World['beginModeFall']>):ReturnType<World['beginModeFall']>{return this.#run({permission:'physical'},()=>transition.sceneBeginModeFall(this.#transitionHost(),...args));}
 beginModeRespawn(...args:Parameters<World['beginModeRespawn']>):ReturnType<World['beginModeRespawn']>{return this.#run({permission:'physical'},()=>transition.sceneBeginModeRespawn(this.#transitionHost(),...args));}
 stripCarryOnDeath(...args:Parameters<World['stripCarryOnDeath']>):ReturnType<World['stripCarryOnDeath']>{return this.#run({permission:'physical'},()=>transition.sceneStripCarryOnDeath(this.#transitionHost(),...args));}
 stripCarryOf(...args:Parameters<World['stripCarryOf']>):ReturnType<World['stripCarryOf']>{return this.#run({physical:[seatBody(args[0])],permission:'physical'},()=>transition.sceneStripCarryOf(this.#transitionHost(),...args));}
 bankCouchWipe(...args:Parameters<World['bankCouchWipe']>):ReturnType<World['bankCouchWipe']>{return this.#run({permission:'physical'},()=>transition.sceneBankCouchWipe(this.#transitionHost(),...args));}
 resurfaceFromDescent(...args:Parameters<World['resurfaceFromDescent']>):ReturnType<World['resurfaceFromDescent']>{return this.#run({permission:'physical'},()=>transition.sceneResurfaceFromDescent(this.#transitionHost(),...args));}
 beginSkyfall(...args:Parameters<World['beginSkyfall']>):ReturnType<World['beginSkyfall']>{return this.#run({permission:'physical'},()=>transition.sceneBeginSkyfall(this.#transitionHost(),...args));}
 routeSkyFalls(...args:Parameters<World['routeSkyFalls']>):ReturnType<World['routeSkyFalls']>{return this.#run({physical:args[0] as readonly Actor[],permission:'physical'},()=>transition.sceneRouteSkyFalls(this.#transitionHost(),...args));}
 beginPitDescent(...args:Parameters<World['beginPitDescent']>):ReturnType<World['beginPitDescent']>{return this.#run({permission:'physical'},()=>transition.sceneBeginPitDescent(this.#transitionHost(),...args));}
 routePitFall(...args:Parameters<World['routePitFall']>):ReturnType<World['routePitFall']>{return this.#run({physical:[args[0]],permission:'physical'},()=>transition.sceneRoutePitFall(this.#transitionHost(),...args));}
 beginTraversal(...args:Parameters<World['beginTraversal']>):ReturnType<World['beginTraversal']>{return this.#run({permission:'physical'},()=>lifecycle.sceneBeginTraversal(this.#lifecycleHost(),...args));}
 distinctNameOf(...args:Parameters<World['distinctNameOf']>):ReturnType<World['distinctNameOf']>{return this.#run({sources:[args[0]],permission:'stats'},()=>lifecycle.sceneDistinctNameOf(this.#lifecycleHost(),...args));}
 grantEssence(...args:Parameters<World['grantEssence']>):ReturnType<World['grantEssence']>{return this.#run({physical:[seatBody(args[0])],permission:'physical'},()=>lifecycle.sceneGrantEssence(this.#lifecycleHost(),...args));}
 modeDef(...args:Parameters<World['modeDef']>):ReturnType<World['modeDef']>{return this.#run({permission:'physical'},()=>lifecycle.sceneModeDef(this.#lifecycleHost(),...args));}
 nemesisEligible(...args:Parameters<World['nemesisEligible']>):ReturnType<World['nemesisEligible']>{return this.#run({sources:[args[0]],permission:'stats'},()=>lifecycle.sceneNemesisEligible(this.#lifecycleHost(),...args));}
 onRunEnded(...args:Parameters<World['onRunEnded']>):ReturnType<World['onRunEnded']>{return this.#run({permission:'physical'},()=>lifecycle.sceneOnRunEnded(this.#lifecycleHost(),...args));}
 reckonRunEssence(...args:Parameters<World['reckonRunEssence']>):ReturnType<World['reckonRunEssence']>{return this.#run({permission:'physical'},()=>lifecycle.sceneReckonRunEssence(this.#lifecycleHost(),...args));}
 recordNemesisFall(...args:Parameters<World['recordNemesisFall']>):ReturnType<World['recordNemesisFall']>{return this.#run({permission:'physical'},()=>lifecycle.sceneRecordNemesisFall(this.#lifecycleHost(),...args));}
 restoreAccountRelics(...args:Parameters<World['restoreAccountRelics']>):ReturnType<World['restoreAccountRelics']>{return this.#run({physical:[seatBody(args[0])],permission:'physical'},()=>lifecycle.sceneRestoreAccountRelics(this.#lifecycleHost(),...args));}
 scatterPitArrival(...args:Parameters<World['scatterPitArrival']>):ReturnType<World['scatterPitArrival']>{return this.#run({permission:'physical'},()=>lifecycle.sceneScatterPitArrival(this.#lifecycleHost(),...args));}
 recordDeath(...args:Parameters<World['recordDeath']>):ReturnType<World['recordDeath']>{return this.#run({permission:'physical'},()=>death.sceneRecordDeath(this.#deathHost(),...args));}
 recordSeatDeath(...args:Parameters<World['recordSeatDeath']>):ReturnType<World['recordSeatDeath']>{return this.#run({physical:[seatBody(args[0])],permission:'physical'},()=>death.sceneRecordSeatDeath(this.#deathHost(),...args));}
 fellVessel(...args:Parameters<World['fellVessel']>):ReturnType<World['fellVessel']>{return this.#run({permission:'physical'},()=>death.sceneFellVessel(this.#deathHost(),...args));}
 dismissMercenary(...args:Parameters<World['dismissMercenary']>):ReturnType<World['dismissMercenary']>{return this.#run({permission:'physical'},()=>death.sceneDismissMercenary(this.#deathHost(),...args));}
 loseBagRelicsOnDeath(...args:Parameters<World['loseBagRelicsOnDeath']>):ReturnType<World['loseBagRelicsOnDeath']>{return this.#run({permission:'physical'},()=>death.sceneLoseBagRelicsOnDeath(this.#deathHost(),...args));}
 removeSeat(...args:Parameters<World['removeSeat']>):ReturnType<World['removeSeat']>{
  const {combat,coordinator}=this.input,{campaign}=coordinator.input,{authority}=combat.input,seat=campaign.seats.find(s=>s.id===args[0]);if(!seat||seat===campaign.localSeat)return;
  const body=seatBody(seat),owner=authority.require(body).combat;if(owner!==combat)return owner.campaignTransitions.removeSeat(...args);
  return this.#entry(this,{physical:[body],permission:'physical'},()=>{if(seatBody(seat)!==body)throw Error('Native removed seat changed during admission');if(this.#removal)throw Error('Native seat removal is already active');this.#removal={seat,body};try{return death.sceneRemoveSeat(this.#deathHost(combat),...args);}finally{this.#removal=null;}});
 }
 updateTraversal(...args:Parameters<World['updateTraversal']>):ReturnType<World['updateTraversal']>{const {coordinator}=this.input;return this.#bridge.runTraversalStep(()=>{const owner=coordinator.current.combat.campaignTransitions;return owner.#entry(owner,{physical:[coordinator.current.assembly.input.scene.player],permission:'physical'},()=>lifecycle.sceneUpdateTraversal(owner.#lifecycleHost(),...args));});}
}
