import * as uiTravel from '../engine/nativeSceneUIActions';
import type {NativeSceneUITravelHost} from '../engine/nativeSceneUIActionHost';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
/** The actual campaign frame's travel/service owner. Local combat keeps its
 * stable area host; travel-capable native bodies select actual retained owners
 * after each handoff. No World local driver or public host escapes this owner. */
import type {Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneRetainedCampaignFrameHost as ClosureHost,NativeFrameMethod} from '../engine/nativeSceneCampaignFrameClosureHost';
import type {NativeSceneRoadScanHost} from '../engine/nativeSceneRoadScan';
import type {NativeAreaRoadDestination} from './nativeAreaRoadDestination';
import type {ShardRoadHost,RealmGateRow} from '../engine/shardRoads';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import type {NativeAreaTransitionFrame} from './nativeAreaSceneTransitionCoordinator';
const finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
function members<T>(rows:readonly T[]):T[]{const n=own<number>(rows,'length'),out:T[]=[];for(let i=0;i<n;i++)out.push(own<T>(rows,i));return out;}
import * as services from '../engine/nativeSceneFrameServices';
import * as frameCore from '../engine/nativeSceneCampaignFrame';
import * as frameSteps from '../engine/nativeSceneCampaignFrameSteps';
import * as director from '../engine/scenes';
import type {NativeSceneDirectorHost,NativeSceneDirectorBodies} from '../engine/nativeSceneDirectorHost';
export type NativeAreaCampaignFrameHost=NativeSceneUITravelHost & ClosureHost & NativeSceneRoadScanHost & frameCore.NativeFrameBeginHost & frameCore.NativeFrameRawAreaHost & frameCore.NativeFrameClockHost & frameCore.NativeFramePrepareHost & frameCore.NativeFramePendingTransitionsHost & frameCore.NativeFrameFadesHost & frameCore.NativeFrameInteractionsBeforeHarborHost & frameCore.NativeFrameHarborholdsHost & frameCore.NativeFrameInteractionsAfterHarborHost & frameCore.NativeFrameWipeHost & frameCore.NativeFrameWorldRoleHost & frameCore.NativeFrameWorldSimHost & frameCore.NativeFrameQuestRescuesHost & frameCore.NativeFrameWorldLedgerHost & frameCore.NativeFrameContagionHost & frameCore.NativeFrameDeepwinterHost & frameCore.NativeFrameLocalStreamsHost & frameCore.NativeFrameBulletinsHost & frameCore.NativeFrameWorldBridgesHost & frameCore.NativeFrameWarbandMarchesHost & frameCore.NativeFrameWorldMintsHost & frameCore.NativeFrameRoadTailHost;
type Host=NativeAreaCampaignFrameHost;
const ticking=new WeakSet<NativeAreaSceneTransitionCoordinator>();
const campaignPhaseOwner=new WeakMap<NativeAreaSceneTransitionCoordinator,NativeAreaSceneCombat>();
const roadFrameKeys=["frameSeats","isPresentLocalPlayer","updateTownPortals","waypointPos","discoveredWaypoints","zone","touchers","waypointBesieged","time","wpRefusedAt","flashes","player","traversal","mouthUnder","caveExitGrace","caveDwellIdx","shardWorld","doorRefusalAt","mouthRefusalUnder","text","playerIdle","caveDwellStart","caveEntrances","mintSidezone","beginTraversal","enterSidezone","seats","seatIdle","doodads","dwellReachable","doorDwellId","doorDwellStart","doorDwellPos","setDoorState","account","accountDirty","trapworks","storyPair","springTrapwork","realmGates","gateUnder","realmDwellKey","realmDwellKind","realmDwellPos","realmDwellStart","arenaWard","wardSealUnder","wardDwellSeal","wardDwellStart","breakArenaSeal","holdfastNear","holdfastDwellKey","holdfastDwellPos","holdfastDwellStart","onHoldfastDwell","encounters","openEncounter","fractureRun","triggerFracture","exitUnder","lockHint","exitLockHint","exitDwellIdx","exitDwellStart","travelThrough","scanShardRoads"] as const satisfies readonly (keyof Host)[];
const directorKeys=["manifest","account","accountDirty","actors","ambientCamShift","applyWaveFrenzy","arena","caveMap","caveReturn","charDirty","clampPos","createMonster","doodads","loadZone","markDoodadsChanged","player","playerIdle","recalcPlayer","scene","screenFade","shake","swarmEntryPoint","text","time","timeflow","useSkill","zone","seats"] as const satisfies readonly (keyof Host)[];
import * as travel from '../engine/nativeSceneFrameTravel';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {issueNativeRealmEntryBridge,type NativeRealmEntryBridge,type NativeRealmContextKey,isNativeAreaSceneTransitionCoordinator,NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {issueNativeRoadOwnerBridge,type NativeRoadOwnerBridge} from './nativeAreaRoadOwnerBridge';
export interface NativeAreaSceneCampaignFrameInput {combat:NativeAreaSceneCombat;coordinator:NativeAreaSceneTransitionCoordinator;entry:NativeAreaCombatOwnerEntry;fixedHost:Host & NativeSceneRoadScanHost}
const actualFrames=new WeakSet<object>();
const travelNames=new Set<keyof Host>(["chartCourse","sailTo","updateModeRespawn","updateBountyBoard","updateSail","updateDelver","updateSailing","performModeRespawn","requestMeta","enterSailing","descend","landAshore","enterSidezone","onHoldfastDwell","realmGates","travelThrough","updateTownPortals","applyAction","enterDimension","enterDemonRealm","enterCrusadeSanctum","enterNecropolis","enterFractureRift","enterCourtDomain","beginWraithsailBoarding","resumeSpawn","applyActionAs","enterRealmArena","resumeCaveLadder","startCaravan","travelToWaypoint","realmArenaWake"]);
const hostKeys=["realmContext","crusadeRealmContext","necropolisRealmContext","fractureRealmContext","chartCourse","sailTo","abandonBounty","acceptBounty","acceptQuestOffer","acceptVocationQuest","account","actingSeat","activeQuests","actors","allocateNode","applyAction","applyActionAs","applySidezoneFurnish","arenaCrowd","armBountyBoard","armFolkWithEssence","armFolkWithItem","attuneSpectre","bagItem","beginHoldMuster","beginTraversal","beginWraithsailBoarding","bindGraft","bindSkill","boardStateOf","bountyBeat","bountyBoardsHere","bountyDwellBoardId","bountyDwellRequested","bountyDwellSeatId","bountyGate","breachPos","bridges","buyAbilityEssence","buyChandlerGem","buyDelverGem","buyHarborChart","buyHoldRestore","buyVendorGem","canSail","caravanBandUnlocked","castTownPortal","caveEntrances","caveExitGrace","caveMap","caveReturn","caveStack","chartFrontier","claimQuestImbue","claimQuestReward","clampPos","clientActionHook","clientOptimistic","completedObjectives","containerMove","containerPlace","containerTake","continentFor","courtRealmPlan","craftAffix","craftSocket","crusadePortals","crusadeRealmPlan","cycleCompanionStance","demonPortals","demonRealmPlan","descend","descentRun","descentShaftDwell","descentSite","descentSpent","dimGates","dimensionCrossing","dimensionRoad","discoveredWaypoints","dropGearFromBag","dropRuleOf","drops","dwellReachable","encounters","enemiesOf","ensureSeaPorts","enterCourtDomain","enterCrusadeSanctum","enterDemonRealm","enterDimension","enterFractureRift","enterNecropolis","enterRealmArena","enterSailing","entryFrom","equipItem","eventLevel","farPoint","findFreeSpot","flashes","fontConvertEssence","fontMergeSkill","fontResetTree","forgeBegin","forgeCancel","fractureRealmPlan","fractureRifts","gameOver","grantXp","grounds","handSeats","harvestConsent","harvestSessions","inCave","isAmbientTag","isCampaignFrameOwner","isPresentActor","isPresentLocalPlayer","islandDefIdOf","journalDirty","landAshore","landPartyAt","landingSiteFor","lastRespawnPayout","learnSkill","ledger","levelUpSkill","levelUpSupport","loadZone","localHumanSeats","localSeat","manifest","markMetaDirty","massAway","massCaveIds","massRuntime","massSideareaRoots","mimicSelectFor","mintCaravanRoute","mintIslandZone","mintSidezone","modeDef","modeStageDef","moveBagItem","nativeWorldReady","nearBountyBoard","nearCaravan","nearMusterHorn","nearestShore","necropolisPortals","necropolisRealmPlan","nodeFromSea","notice","objectiveDone","oceanBearing","onQuestZoneFieldCleared","oracleAttune","oracleRelic","ownSpoils","partyDowns","partyRows","payHoldfastToll","pendingRespawn","performModeRespawn","personalStash","pickTreeNode","pickupNearestGear","placePing","player","playerIdle","portDock","postHoldWrits","raiseArenaWards","reacquireSkill","realmArenaMint","realmArenaWake","realmRoad","recallMemory","refundPassiveNode","releaseCompanion","relicStashMove","reliquaryToggle","requestMeta","rerollAffix","resolvedHandsAt","resumeCaveLadder","resumeSpawn","resurfaceFromDescent","resyncMinionSupports","sailGate","sailing","salvageBulk","salvageItem","salvageLockSet","screenFade","seaFromNode","seatIdle","seatNote","seats","setBountyLock","setVendorCommission","setVendorLock","shardRealmRoad","shardWorld","sidezoneIdFor","sim","socketSupport","socketVestige","sortBag","spawnArenaBoss","startCaravan","stationArmed","stationDwellArmed","storyPair","streamCoast","swapSkillSlots","text","time","townLayoutChangedOnLoad","townPortalArrival","townPortalDwell","townPortalViews","townPortals","travelToWaypoint","traversal","turnInBounty","uiActionSeatId","unequipItem","unlearnSkill","unsocketBagSkill","unsocketSupport","updateWraithsailAtSea","voyage","voyageZoneDef","watchBountyHands","waypointPos","withQuestHand","withdrawRelic","wraithsailSeaStash","wraithsailSighted","zone","zoneMap","zoneMemory"] as const satisfies readonly (keyof Host)[];
function own<T>(o:object,k:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native campaign frame needs ordinary concrete input: '+String(k));return d.value as T;}
export class NativeAreaSceneCampaignFrame {
 readonly #retiredVoyage=NativeAreaSceneTransitionCoordinator.prototype.isRetiredVoyage;
 readonly #retiredGround=NativeAreaSceneTransitionCoordinator.prototype.isRetiredGround;
 readonly input:Readonly<Pick<NativeAreaSceneCampaignFrameInput,'combat'|'coordinator'>>;
 readonly #realm:NativeRealmEntryBridge;#realmKind:NativeRealmContextKey|null=null;
 readonly #entry:NativeAreaCombatOwnerEntry;readonly #fixed:Host & NativeSceneRoadScanHost;readonly #road:NativeRoadOwnerBridge;readonly #scanHost:NativeSceneRoadScanHost;
 constructor(raw:NativeAreaSceneCampaignFrameInput){
  const combat=own<NativeAreaSceneCombat>(raw,'combat'),coordinator=own<NativeAreaSceneTransitionCoordinator>(raw,'coordinator'),entry=own<NativeAreaCombatOwnerEntry>(raw,'entry'),fixedHost=own<Host & NativeSceneRoadScanHost>(raw,'fixedHost');
  if(!isNativeAreaSceneCombat(combat)||!isNativeAreaSceneTransitionCoordinator(coordinator)||!fixedHost||typeof fixedHost!=='object')throw Error('Native campaign frame needs actual runtime owners');assertNativeCombatOwnerEntry(combat,entry);
  for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native campaign frame roots differ: '+key);
  assertNativeRetainedMassState(combat.input.characterWriter);
  this.input=Object.freeze({combat,coordinator});Object.defineProperty(this,'input',{writable:false,configurable:false});this.#entry=entry;this.#fixed=fixedHost;actualFrames.add(this);this.#road=issueNativeRoadOwnerBridge(coordinator,this,combat,entry);this.#realm=issueNativeRealmEntryBridge(coordinator,this,combat,entry);
  const self=this;this.#scanHost=Object.freeze({
   get seatDoorOf(){return self.#fixed.seatDoorOf;},
   get applyAction(){return self.#fixed.applyAction;},
   get exitLockHint(){return self.#fixed.exitLockHint;},
   get exitUnder(){return self.#fixed.exitUnder;},
   get gateUnder(){return self.#fixed.gateUnder;},
   get holdfastNear(){return self.#fixed.holdfastNear;},
   get mouthRefusalUnder(){return self.#fixed.mouthRefusalUnder;},
   get mouthUnder(){return self.#fixed.mouthUnder;},
   get realmGates(){return self.#fixed.realmGates;},
   get seatIdle(){return self.#fixed.seatIdle;},
   get seats(){return self.#selectedFrameSeats();},
   get shardRoadHost(){return self.#fixed.shardRoadHost;},
   get shardWorld(){return self.#fixed.shardWorld;},
   get time(){return self.#fixed.time;},
   get wardSealUnder(){return self.#fixed.wardSealUnder;}
  });
  
 }
 #assertInstalled():void{const {combat,coordinator}=this.input;assertNativeRetainedMassState(combat.input.characterWriter);if(own(combat,'campaignFrame')!==this||coordinator.areaFor(combat).combat!==combat)throw Error('Native campaign frame owner was replaced or unregistered');}
 #assertFrame(issued:NativeAreaTransitionFrame):void{const coordinator=this.input.coordinator;if(!issued.active||coordinator.frame!==issued){if(!coordinator.allowsTraversalContinuation(issued)&&!coordinator.allowsRoadContinuation(issued))throw Error('Expired native campaign service frame');}}
 #host(physicalSeats=false):Host{const issued=this.input.coordinator.frame,host={} as Host;for(const key of hostKeys)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#assertFrame(issued);return physicalSeats&&key==='seats'?this.#selectedFrameSeats():this.#read(key,issued);},set:value=>{this.#assertFrame(issued);this.#write(key,value);}});return Object.freeze(host);}
 #selected():NativeAreaSceneCampaignFrame{this.#assertInstalled();const {coordinator}=this.input,frame=coordinator.frame;if(!frame.active)throw Error('Native campaign service frame expired');const owner=own<NativeAreaSceneCampaignFrame>(frame.current.combat,'campaignFrame');if(!actualFrames.has(owner)||owner.input.coordinator!==coordinator)throw Error('Native campaign selected a foreign owner');owner.#assertInstalled();return owner;}
 #inSelected<T>(action:()=>T):T{this.#assertInstalled();const {coordinator,combat}=this.input;if(coordinator.frame.current!==coordinator.areaFor(combat))throw Error('Native campaign service needs its exact current area');return this.#entry(this,{permission:'proc',physical:[],sources:[]},action);}
 #run<T>(action:()=>T):T{this.#assertInstalled();const {coordinator,combat}=this.input;return coordinator.runFrom(coordinator.areaFor(combat),()=>this.#inSelected(action));}
 #withRealmEntry<T>(key:NativeRealmContextKey,action:()=>T):T{if(this.#realmKind)throw Error("Native realm entry cannot reenter");this.#realmKind=key;try{return action();}finally{this.#realmKind=null;}}
 #read<K extends keyof Host>(key:K,issued:NativeAreaTransitionFrame):Host[K]{const owner=this.#selected();if(travelNames.has(key)){const fn=Reflect.get(owner,key,owner);if(typeof fn!=='function')throw Error('Native campaign travel method is missing');return ((...args:unknown[])=>{this.#assertFrame(issued);if(this.#selected()!==owner)throw Error('Native selected travel receiver changed');return Reflect.apply(fn,owner,args);}) as Host[K];}
  const value=owner.#inSelected(()=>Reflect.get(owner.#fixed,key,owner.#fixed)) as Host[K];if(typeof value!=='function')return value;return ((...args:unknown[])=>{this.#assertFrame(issued);if(this.#selected()!==owner)throw Error('Native selected service receiver changed');return owner.#inSelected(()=>Reflect.apply(value,owner.#fixed,args));}) as Host[K];
 }
 #write<K extends keyof Host>(key:K,value:Host[K]):void{const owner=this.#selected();owner.#inSelected(()=>{if(!Reflect.set(owner.#fixed,key,value,owner.#fixed))throw new TypeError('Native campaign field is not writable: '+key);});}
 #selectedFrameSeats():Seat[]{const {coordinator}=this.input,issued=coordinator.frame,area=issued.current,rows=members(issued.seats);for(const seat of rows)this.#selectedSeat(seat);Reflect.apply(finalPhysical,coordinator.input.authority,[area.binding,rows.map(seat=>own<Actor>(seat,'actor'))]);if(coordinator.frame!==issued||issued.current!==area)throw Error('Native captured travel cohort changed');return rows;}
 #selectedSeat(seat:Seat):Actor{const {coordinator}=this.input,body=own<Actor>(seat,'actor'),id=own<string>(seat,'id'),frame=coordinator.frame,area=frame.current,campaign=coordinator.input.campaign,rows=campaign.seats;if(!members(rows).includes(seat)||!members(frame.seats).includes(seat))throw Error('Native campaign action needs its actual local seat');const finalRows=campaign.seats;if(finalRows!==rows||!members(finalRows).includes(seat)||!members(frame.seats).includes(seat)||own(seat,'id')!==id||own(seat,'actor')!==body||coordinator.frame!==frame||frame.current!==area)throw Error('Native campaign action seat changed during admission');Reflect.apply(finalPhysical,coordinator.input.authority,[area.binding,[body]]);if(own(seat,'actor')!==body||own(seat,'id')!==id)throw Error('Native campaign action seat changed during final validation');return body;}
 #gateRows(rows:RealmGateRow<NativeAreaRoadDestination>[]):RealmGateRow<NativeAreaRoadDestination>[] {const issued=this.input.coordinator.frame,origin=issued.current;for(const row of rows){for(const key of ['enter','road'] as const){const selected=Object.getOwnPropertyDescriptor(row,key);if(!selected)continue;if(!Object.hasOwn(selected,'value')||typeof selected.value!=='function')throw Error('Native realm gate requires its actual selected callable');const fn=selected.value,owner=this;let used=false;const roadUsers=new WeakSet<Seat>();const call=function(this:unknown,...args:unknown[]){if(!issued.active||owner.input.coordinator.frame!==issued)throw Error('Expired native realm gate frame');if(owner.input.coordinator.current!==origin||Object.getOwnPropertyDescriptor(row,key)?.value!==call)throw Error('Expired or changed native realm gate');const seat=key==='road'?args[0] as Seat:owner.input.coordinator.input.campaign.localSeat;owner.#selectedSeat(seat);if(key==='road'){if(roadUsers.has(seat))throw Error('Native realm road already issued for this seat');roadUsers.add(seat);}else{if(used)throw Error('Native realm gate already entered');used=true;}return Reflect.apply(fn,this,args);};Object.defineProperty(row,key,{...selected,value:call});}}return rows;}


 #owner(combat:NativeAreaSceneCombat):NativeAreaSceneCampaignFrame {const owner=own<NativeAreaSceneCampaignFrame>(combat,'campaignFrame');if(!actualFrames.has(owner)||owner.input.coordinator!==this.input.coordinator)throw Error('Native frame selected a foreign retained owner');owner.#assertInstalled();return owner;}
 #published():NativeAreaSceneCampaignFrame{return this.#owner(this.input.coordinator.published.combat);}
 #currentStep<T>(step:(host:Host)=>T):T {const owner=this.#published();return owner.#run(()=>step(owner.#fixed));}
 #areaStep(step:(host:Host)=>void):void {const {coordinator}=this.input,rows=coordinator.residentAreas().map(area=>this.#owner(area.combat));const anchor=coordinator.published.combat;campaignPhaseOwner.set(coordinator,anchor);try{for(const owner of rows){if((Reflect.apply(this.#retiredVoyage,coordinator,[owner.input.combat])||Reflect.apply(this.#retiredGround,coordinator,[owner.input.combat])))continue;owner.#run(()=>step(owner.#fixed));}}finally{campaignPhaseOwner.delete(coordinator);}}
 #combatStep(step:(combat:NativeAreaSceneCombat)=>void):void {const rows=this.input.coordinator.residentAreas().map(area=>this.#owner(area.combat));for(const owner of rows){if((Reflect.apply(this.#retiredVoyage,this.input.coordinator,[owner.input.combat])||Reflect.apply(this.#retiredGround,this.input.coordinator,[owner.input.combat])))continue;owner.#run(()=>step(owner.input.combat));}}
 #dynamicHost(keys:readonly (keyof Host)[]):Host {const issued=this.input.coordinator.frame,host={} as Host;for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#assertFrame(issued);return this.#read(key,issued);},set:value=>{this.#assertFrame(issued);this.#write(key,value);}});return host;}
 #directorHost():NativeSceneDirectorHost {const issued=this.input.coordinator.frame,host=this.#dynamicHost(directorKeys);const bodies={} as NativeSceneDirectorBodies;
  const bind=<K extends keyof NativeSceneDirectorBodies>(key:K,fn:(fixed:Host,...args:never[])=>unknown):void=>{Object.defineProperty(bodies,key,{enumerable:true,get:()=>{this.#assertFrame(issued);const owner=this.#selected();return(...args:never[])=>{this.#assertFrame(issued);if(this.#selected()!==owner)throw Error('Native Director birth receiver changed');return owner.#inSelected(()=>fn(owner.#fixed,...args));};}});};
  bind('spawnBody',director.nativeSceneSpawnBody);bind('spawnColossus',director.nativeSceneSpawnColossus);bind('spawnApparitions',director.nativeSceneSpawnApparitions);bind('emptyField',director.nativeSceneEmptyField);
  Object.defineProperty(host,'nativeSceneBodies',{value:Object.freeze(bodies),enumerable:true});return Object.freeze(host);
 }
 beginScene(id:string):boolean {return this.#run(()=>director.sceneBegin(this.#directorHost(),id));}
 updateDirector(rawDt:number):void {this.#run(()=>{if(this.isCampaignFrameOwner()&&this.#fixed.isPresentLocalPlayer())director.updateScene(this.#directorHost(),rawDt);});}
 #pendingTransitions(dt:number):boolean {const current=()=>this.#published(),coordinator=this.input.coordinator;const host:frameCore.NativeFramePendingTransitionsHost={
  get massRuntime(){return current().#fixed.massRuntime;},get pendingRespawn(){return current().#fixed.pendingRespawn;},get traversal(){return current().#fixed.traversal;},
  updateModeRespawn(step){current().updateModeRespawn(step);},updateTraversal(step){current().input.combat.campaignTransitions.updateTraversal(step);},nativeWorldReady(){return coordinator.nativeWorldReady();}
 };return frameCore.sceneNativeFramePendingTransitions(host,dt);}
 #wipe():void {this.#currentStep(fixed=>{
  const host=Object.create(null) as frameCore.NativeFrameWipeHost;for(const key of ['gameOver','pendingRespawn','scene','concludeWipe'] as const)Object.defineProperty(host,key,{get:()=>Reflect.get(fixed,key,fixed)});Object.defineProperty(host,'seats',{get:()=>this.input.coordinator.current.combat.campaignTransitions.partySeats()});frameCore.sceneNativeFrameWipe(host);
 });}
 /** One native campaign frame, with a fresh finite resident cohort at every
  * original statement boundary. Shared clocks and sweeps run once. */
 tick(rawSeconds:number):void {
  this.#assertInstalled();const {coordinator}=this.input;coordinator.assertIdleFrame();if(ticking.has(coordinator))throw Error('Native campaign frame cannot reenter');ticking.add(coordinator);
  try {
   const timing=this.#currentStep(host=>frameCore.sceneNativeFrameBegin(host,rawSeconds));if(!timing)return;const {dt,rawDt,doorPressIntents}=timing;
   this.#published().updateDirector(rawDt);
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep008(host,rawDt,dt));
   if(!this.#currentStep(host=>frameCore.sceneNativeFrameClock(host,dt)))return;
   this.#areaStep(frameCore.sceneNativeFramePrepare);
   if(!this.#pendingTransitions(dt))return;
   this.#currentStep(host=>frameCore.sceneNativeFrameFades(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep022(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep023(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep024(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep025(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep026(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep027(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep028(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep029(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep030(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep031(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep032(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep033(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep034(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep035(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep036(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep037(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep038(host,dt));
   this.#currentStep(frameCore.sceneNativeFrameHarborholds);
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep040(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep041(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep042(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep043(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep044(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep045(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep046(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep047(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep048(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep049(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep050(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep051(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep052(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep053(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep054(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep055(host,dt));
   this.#wipe();
   // This coordinator ticks the entire campaign, including all retained road units.
   // The published destination's road role never suppresses shared campaign work.
   const unitWorld=false;
   this.#currentStep(host=>frameCore.sceneNativeFrameWorldSim(host,dt,unitWorld));
   this.#areaStep(frameCore.sceneNativeFrameQuestRescues);
   this.#currentStep(host=>frameCore.sceneNativeFrameWorldLedger(host,unitWorld));
   this.#areaStep(frameCore.sceneNativeFrameContagion);
   this.#currentStep(host=>frameCore.sceneNativeFrameDeepwinter(host,unitWorld));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep070(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep071(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep072(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep073(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep074(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep075(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep076(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep077(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep078(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep079(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep080(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep081(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep082(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep083(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep084(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep085(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep086(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep087(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep088(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep089(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep090(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep091(host,dt));
   this.#areaStep(host=>frameSteps.sceneNativeFrameStep092(host,dt));
   this.#currentStep(host=>frameCore.sceneNativeFrameBulletins(host,unitWorld));
   this.#currentStep(host=>frameCore.sceneNativeFrameWorldBridges(host,unitWorld));
   this.#areaStep(frameCore.sceneNativeFrameWarbandMarches);
   this.#currentStep(host=>frameCore.sceneNativeFrameWorldMints(host,dt,unitWorld));
   this.#combatStep(combat=>combat.framePreActors(dt));
   this.#combatStep(combat=>combat.frameActors(dt,rawDt));
   this.#combatStep(combat=>combat.frameEffects(dt));
   this.#combatStep(combat=>combat.frameLateBodies(dt));
   const rows=coordinator.residentAreas().map(area=>this.#owner(area.combat));for(const owner of rows){if((Reflect.apply(this.#retiredVoyage,coordinator,[owner.input.combat])||Reflect.apply(this.#retiredGround,coordinator,[owner.input.combat])))continue;owner.#run(()=>frameCore.sceneNativeFrameRoadTail(Object.freeze(owner.#dynamicHost(roadFrameKeys)),dt,doorPressIntents));}
   const roadOwner=(Reflect.apply(this.#retiredVoyage,coordinator,[this.input.combat])||Reflect.apply(this.#retiredGround,coordinator,[this.input.combat]))?this.#published():this;if(roadOwner.#road.link)roadOwner.drainShardRoads();
  } finally {campaignPhaseOwner.delete(coordinator);ticking.delete(coordinator);}
 }

 isCampaignFrameOwner():boolean{this.#assertInstalled();const {coordinator,combat}=this.input;return (campaignPhaseOwner.get(coordinator)??coordinator.published.combat)===combat;}
 get shardRoadView():ShardRoadHost<NativeAreaRoadDestination>|undefined{this.#assertInstalled();return this.#road.view;}
 cacheShardRoadHost(host:ShardRoadHost<NativeAreaRoadDestination>):void{this.#assertInstalled();this.#road.cache(host);}
 enableHostedRoads():void{this.#assertInstalled();this.#road.enableHosted();}
 drainShardRoads():ReturnType<NativeRoadOwnerBridge['drain']>{this.#assertInstalled();return this.#road.drain();}
 scanShardRoads():void{this.#run(()=>this.#road.scan(this.#scanHost));}
 updateModeRespawn(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateModeRespawn>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateModeRespawn>>{return this.#run(()=>{return services.sceneUpdateModeRespawn(this.#host(),...args);});}
 updateBountyBoard(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateBountyBoard>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateBountyBoard>>{return this.#run(()=>{return services.sceneUpdateBountyBoard(this.#host(),...args);});}
 updateSail(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateSail>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateSail>>{return this.#run(()=>{return services.sceneUpdateSail(this.#host(),...args);});}
 updateDelver(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateDelver>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateDelver>>{return this.#run(()=>{return services.sceneUpdateDelver(this.#host(),...args);});}
 updateSailing(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateSailing>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateSailing>>{return this.#run(()=>{return services.sceneUpdateSailing(this.#host(),...args);});}
 performModeRespawn(...args:Parameters<NativeFrameMethod<typeof services.scenePerformModeRespawn>>):ReturnType<NativeFrameMethod<typeof services.scenePerformModeRespawn>>{return this.#run(()=>{return this.input.coordinator.current.combat.campaignTransitions.performModeRespawn(...args);});}
 requestMeta(...args:Parameters<NativeFrameMethod<typeof services.sceneRequestMeta>>):ReturnType<NativeFrameMethod<typeof services.sceneRequestMeta>>{return this.#run(()=>{return services.sceneRequestMeta(this.#host(),...args);});}
 enterSailing(...args:Parameters<NativeFrameMethod<typeof services.sceneEnterSailing>>):ReturnType<NativeFrameMethod<typeof services.sceneEnterSailing>>{return this.#run(()=>{return services.sceneEnterSailing(this.#host(),...args);});}
 descend(...args:Parameters<NativeFrameMethod<typeof services.sceneDescend>>):ReturnType<NativeFrameMethod<typeof services.sceneDescend>>{return this.#run(()=>{return services.sceneDescend(this.#host(),...args);});}
 landAshore(...args:Parameters<NativeFrameMethod<typeof services.sceneLandAshore>>):ReturnType<NativeFrameMethod<typeof services.sceneLandAshore>>{return this.#run(()=>{return services.sceneLandAshore(this.#host(),...args);});}
 enterSidezone(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterSidezone>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterSidezone>>{return this.#run(()=>{return travel.sceneEnterSidezone(this.#host(),...args);});}
 onHoldfastDwell(...args:Parameters<NativeFrameMethod<typeof travel.sceneOnHoldfastDwell>>):ReturnType<NativeFrameMethod<typeof travel.sceneOnHoldfastDwell>>{return this.#run(()=>{return travel.sceneOnHoldfastDwell(this.#host(),...args);});}
 realmGates(...args:Parameters<NativeFrameMethod<typeof travel.sceneRealmGates>>):ReturnType<NativeFrameMethod<typeof travel.sceneRealmGates>>{return this.#run(()=>{return this.#gateRows(travel.sceneRealmGates(this.#host(),...args));});}
 travelThrough(...args:Parameters<NativeFrameMethod<typeof travel.sceneTravelThrough>>):ReturnType<NativeFrameMethod<typeof travel.sceneTravelThrough>>{return this.#run(()=>{return travel.sceneTravelThrough(this.#host(),...args);});}
 updateTownPortals(...args:Parameters<NativeFrameMethod<typeof travel.sceneUpdateTownPortals>>):ReturnType<NativeFrameMethod<typeof travel.sceneUpdateTownPortals>>{return this.#run(()=>{return travel.sceneUpdateTownPortals(this.#host(),...args);});}
 applyAction(...args:Parameters<NativeFrameMethod<typeof travel.sceneApplyAction>>):ReturnType<NativeFrameMethod<typeof travel.sceneApplyAction>>{return this.#run(()=>{this.#selectedSeat(args[0]);return travel.sceneApplyAction(this.#host(),...args);});}
 enterDimension(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterDimension>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterDimension>>{return this.#run(()=>{return travel.sceneEnterDimension(this.#host(),...args);});}
 enterDemonRealm(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterDemonRealm>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterDemonRealm>>{return this.#run(()=>{return this.#withRealmEntry("realmContext",()=>travel.sceneEnterDemonRealm(this.#host(),...args));});}
 enterCrusadeSanctum(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterCrusadeSanctum>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterCrusadeSanctum>>{return this.#run(()=>{return this.#withRealmEntry("crusadeRealmContext",()=>travel.sceneEnterCrusadeSanctum(this.#host(),...args));});}
 enterNecropolis(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterNecropolis>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterNecropolis>>{return this.#run(()=>{return this.#withRealmEntry("necropolisRealmContext",()=>travel.sceneEnterNecropolis(this.#host(),...args));});}
 enterFractureRift(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterFractureRift>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterFractureRift>>{return this.#run(()=>{return this.#withRealmEntry("fractureRealmContext",()=>travel.sceneEnterFractureRift(this.#host(),...args));});}
 enterCourtDomain(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterCourtDomain>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterCourtDomain>>{return this.#run(()=>{return travel.sceneEnterCourtDomain(this.#host(),...args);});}
 beginWraithsailBoarding(...args:Parameters<NativeFrameMethod<typeof travel.sceneBeginWraithsailBoarding>>):ReturnType<NativeFrameMethod<typeof travel.sceneBeginWraithsailBoarding>>{return this.#run(()=>{return travel.sceneBeginWraithsailBoarding(this.#host(),...args);});}
 resumeSpawn(...args:Parameters<NativeFrameMethod<typeof travel.sceneResumeSpawn>>):ReturnType<NativeFrameMethod<typeof travel.sceneResumeSpawn>>{return this.#run(()=>{return travel.sceneResumeSpawn(this.#host(),...args);});}
 applyActionAs(...args:Parameters<NativeFrameMethod<typeof travel.sceneApplyActionAs>>):ReturnType<NativeFrameMethod<typeof travel.sceneApplyActionAs>>{return this.#run(()=>{this.#selectedSeat(args[0]);return travel.sceneApplyActionAs(this.#host(),...args);});}
 enterRealmArena(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterRealmArena>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterRealmArena>>{return this.#run(()=>{return this.#realmKind?this.#realm.enter(this.#realmKind,own<string>(args[0],"caveId"),()=>travel.sceneEnterRealmArena(this.#host(),...args)):travel.sceneEnterRealmArena(this.#host(),...args);});}
 resumeCaveLadder(...args:Parameters<NativeFrameMethod<typeof travel.sceneResumeCaveLadder>>):ReturnType<NativeFrameMethod<typeof travel.sceneResumeCaveLadder>>{return this.#run(()=>{return travel.sceneResumeCaveLadder(this.#host(),...args);});}
 startCaravan(...args:Parameters<NativeFrameMethod<typeof travel.sceneStartCaravan>>):ReturnType<NativeFrameMethod<typeof travel.sceneStartCaravan>>{return this.#run(()=>{return travel.sceneStartCaravan(this.#host(),...args);});}
 travelToWaypoint(...args:Parameters<NativeFrameMethod<typeof travel.sceneTravelToWaypoint>>):ReturnType<NativeFrameMethod<typeof travel.sceneTravelToWaypoint>>{return this.#run(()=>{return travel.sceneTravelToWaypoint(this.#host(),...args);});}
 realmArenaWake(...args:Parameters<NativeFrameMethod<typeof travel.sceneRealmArenaWake>>):ReturnType<NativeFrameMethod<typeof travel.sceneRealmArenaWake>>{return this.#run(()=>{return this.#realm.wake(()=>travel.sceneRealmArenaWake(this.#host(),...args));});}
 chartCourse(...args:Parameters<NativeFrameMethod<typeof uiTravel.sceneChartCourse>>):ReturnType<NativeFrameMethod<typeof uiTravel.sceneChartCourse>>{return this.#run(()=>uiTravel.sceneChartCourse(this.#host(),...args));}
 sailTo(...args:Parameters<NativeFrameMethod<typeof uiTravel.sceneSailTo>>):ReturnType<NativeFrameMethod<typeof uiTravel.sceneSailTo>>{return this.#run(()=>uiTravel.sceneSailTo(this.#host(),...args));}
}
