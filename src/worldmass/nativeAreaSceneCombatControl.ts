/** Local cast and seat-control operations over genuine area bodies and roads. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import * as native from '../engine/nativeSceneCombatControl';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';
import {isNativeAreaSceneTransitionCoordinator,type NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';
export interface NativeAreaSceneCombatControlInput {combat:NativeAreaSceneCombat;campaignOwner:NativeAreaSceneCombatCampaign;coordinator:NativeAreaSceneTransitionCoordinator;entry:NativeAreaCombatOwnerEntry;hooks:NativeAreaCombatOwnerHooks}
type Host=native.NativeSceneCombatControlHost;type Binding<T>={get:()=>T;set?:(value:T)=>void};
function field<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>owner()[key],set:value=>{owner()[key]=value;}};}
function method<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>{const receiver=owner(),fn=receiver[key];return((...args:unknown[])=>Reflect.apply(fn as Function,receiver,args)) as O[K];}};}
function seatHome(seat:Seat):Actor|undefined {const d=Object.getOwnPropertyDescriptor(seat,'home');if(d&&!Object.hasOwn(d,'value'))throw Error('Native control needs ordinary carried home');return d?.value;}
function selectedSeat(seat:Seat,body:Actor|undefined,home:Actor|undefined):void {if(seatHome(seat)!==home||(body!==undefined&&seatBody(seat)!==body))throw Error('Native controlled selection changed during admission');}
function seatBody(seat:Seat):Actor {const d=Object.getOwnPropertyDescriptor(seat,'actor');if(!d||!Object.hasOwn(d,'value'))throw Error('Native control needs an ordinary controlled body');return d.value;}
export class NativeAreaSceneCombatControl {
 readonly input:Readonly<Omit<NativeAreaSceneCombatControlInput,'entry'|'hooks'>>;
 readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #host:Host;
 constructor(raw:NativeAreaSceneCombatControlInput){
  const own=(key:keyof NativeAreaSceneCombatControlInput)=>{const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native control needs own concrete root: '+key);return d.value;};
  const combat=own('combat'),campaignOwner=own('campaignOwner'),coordinator=own('coordinator'),entry=own('entry'),hooks=own('hooks');
  if(!isNativeAreaSceneCombat(combat)||!(campaignOwner instanceof NativeAreaSceneCombatCampaign)||campaignOwner.input.combat!==combat||!isNativeAreaSceneTransitionCoordinator(coordinator))throw Error('Native control needs actual identical runtime owners');
  assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);
  const {assembly,campaign,characterWriter,authority,quests}=combat.input,{scene,geometry}=assembly.input;
  if(coordinator.input.campaign!==campaign||coordinator.input.characterWriter!==characterWriter||coordinator.input.authority!==authority)throw Error('Native control needs identical campaign transition roots');
  this.input=Object.freeze({combat,campaignOwner,coordinator});this.#entry=entry;this.#hooks=hooks;
  const roads=()=>coordinator.roadsFor(combat);
  const bindings:{[K in keyof Host]:Binding<Host[K]>}={
   requireShapeshiftBody:{get:()=>caster=>this.#entry(this,{physical:[caster],permission:'physical'},()=>{})},
   actors:field(()=>scene,'actors'),player:field(()=>scene,'player'),zone:field(()=>scene,'zone'),
   caveReturn:field(roads,'caveReturn'),caveStack:field(roads,'caveStack'),entryFrom:field(roads,'entryFrom'),
   clampPos:method(()=>geometry,'clampPos'),findFreeSpot:method(()=>geometry,'findFreeSpot'),lineOfSight:method(()=>geometry,'lineOfSight'),currentZoneSeed:field(()=>geometry,'currentZoneSeed'),flashes:field(()=>geometry,'flashes'),
   clientActionHook:field(()=>campaign,'clientActionHook'),localSeat:field(()=>campaign,'localSeat'),ledger:field(()=>campaign,'ledger'),time:field(()=>campaign,'time'),seats:field(()=>campaign,'seats'),zoneMap:field(()=>campaign,'zoneMap'),
   events:field(()=>campaignOwner.shared,'events'),seatByActor:field(()=>campaignOwner.shared,'seatByActor'),traversal:field(()=>campaignOwner.shared,'traversal'),
   devIgnoreSkillAttributes:field(()=>characterWriter,'devIgnoreSkillAttributes'),shardWorld:field(()=>characterWriter,'shardWorld'),townPortalArrival:{get:()=>characterWriter['townPortalArrival'],set:value=>{characterWriter['townPortalArrival']=value;}},townPortalDwell:{get:()=>characterWriter['townPortalDwell'],set:value=>{characterWriter['townPortalDwell']=value;}},townPortals:field(()=>characterWriter,'townPortals'),townPortalDestination:field(()=>characterWriter,'townPortalDestination'),
   portalActor:{get:()=>seat=>{const body=seatBody(seat),home=seatHome(seat);return this.#entry(this,{physical:[body],permission:'physical'},()=>{selectedSeat(seat,body,home);return body;});}},portalOrigin:method(roads,'shardSpotOf'),scene:field(()=>quests.input.state,'scene'),
   clingRelease:method(()=>combat.displacement,'clingRelease'),hivecallReturn:method(()=>combat,'hivecallReturn'),hostileTo:method(()=>assembly.input.population,'hostileTo'),
   failNote:method(()=>quests,'failNote'),text:method(()=>assembly.objectiveController,'text'),markMetaDirty:method(()=>combat,'markMetaDirty'),seatOf:method(()=>campaign,'seatOf'),
   reqShortfall:method(()=>this,'reqShortfall'),seatEmbody:method(()=>this,'seatEmbody'),indexSeats:method(()=>this,'indexSeats'),townPortalRefusal:method(()=>this,'townPortalRefusal'),
   shardSpotOf:method(roads,'shardSpotOf'),seatDoorOf:method(roads,'seatDoorOf'),
   createMonster:{get:()=>this.#hooks.createMonster(this)},admitCombatBirth:{get:()=>body=>this.#hooks.admitCombatBirth(this,body)},
   withdrawCarried:{get:()=> (seat,hero,body)=>this.#hooks.withdrawCarried(this,seat,hero,body)},restoreCarried:{get:()=> (seat,hero,body)=>this.#hooks.restoreCarried(this,seat,hero,body)},
   seatBodyChanged:{get:()=> (seat,oldBody,newBody)=>this.#seatBodyChanged(seat,oldBody,newBody)},
  };
  const host={} as Host;for(const key of Object.keys(bindings) as (keyof Host)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});this.#host=Object.freeze(host);
  Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 #seatBodyChanged(seat:Seat,oldBody:Actor,newBody:Actor):void {
  if(seatBody(seat)!==newBody)throw Error('Native representative needs the exact native controlled-body assignment');
  const scene=this.input.combat.input.assembly.input.scene,d=Object.getOwnPropertyDescriptor(scene,'player');
  if(!d||!Object.hasOwn(d,'value')||!d.writable)throw Error('Native representative needs an ordinary writable slot');
  if(d.value===oldBody)Object.defineProperty(scene,'player',{value:newBody});
 }
 castReqRefusal(...args:Parameters<World['castReqRefusal']>):ReturnType<World['castReqRefusal']>{return this.#entry(this,{sources:[args[0]],permission:'stats'},()=>native.sceneCastReqRefusal(this.#host,...args));}
 reqShortfall(...args:Parameters<World['reqShortfall']>):ReturnType<World['reqShortfall']>{return this.#entry(this,{permission:'stats'},()=>native.sceneReqShortfall(this.#host,...args));}
 grabHandoff(...args:Parameters<World['grabHandoff']>):ReturnType<World['grabHandoff']>{return this.#entry(this,{physical:[args[0],args[1]],permission:'physical'},()=>native.sceneGrabHandoff(this.#host,...args));}
 grabSeize(...args:Parameters<World['grabSeize']>):ReturnType<World['grabSeize']>{return this.#entry(this,{physical:[args[0],args[2]],permission:'physical'},()=>native.sceneGrabSeize(this.#host,...args));}
 possessSeize(...args:Parameters<World['possessSeize']>):ReturnType<World['possessSeize']>{return this.#entry(this,{physical:[args[0],args[2]],permission:'physical'},()=>native.scenePossessSeize(this.#host,...args));}
 shapeshiftPress(...args:Parameters<World['shapeshiftPress']>):ReturnType<World['shapeshiftPress']>{return this.#entry(this,{sources:[args[0]],permission:'proc'},()=>native.sceneShapeshiftPress(this.#host,...args));}
 openTownPortal(...args:Parameters<World['openTownPortal']>):ReturnType<World['openTownPortal']>{const seat=args[0],body=seatBody(seat),home=seatHome(seat);return this.#entry(this,{physical:[body],permission:'physical'},()=>{selectedSeat(seat,body,home);return native.sceneOpenTownPortal(this.#host,...args);});}
 seatEmbody(...args:Parameters<World['seatEmbody']>):ReturnType<World['seatEmbody']>{const seat=args[0],body=seatBody(seat),home=seatHome(seat);return this.#entry(this,{physical:[body,args[1]],permission:'physical'},()=>{selectedSeat(seat,body,home);return native.sceneSeatEmbody(this.#host,...args);});}
 indexSeats(...args:Parameters<World['indexSeats']>):ReturnType<World['indexSeats']>{return this.#entry(this,{permission:'attribution'},()=>native.sceneIndexSeats(this.#host,...args));}
 townPortalRefusal(...args:Parameters<World['townPortalRefusal']>):ReturnType<World['townPortalRefusal']>{return this.#entry(this,{permission:'stats'},()=>native.sceneTownPortalRefusal(this.#host,...args));}
 seatEject(...args:Parameters<World['seatEject']>):ReturnType<World['seatEject']>{
  const seat=args[0],home=seatHome(seat),body=home?seatBody(seat):undefined;
  return this.#entry(this,{physical:body?[body]:[],carried:home?[home]:[],permission:'physical'},()=>{selectedSeat(seat,body,home);return native.sceneSeatEject(this.#host,...args);});
 }
}
