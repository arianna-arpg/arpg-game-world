/** One actual capital body per actual crown, with physical attendance governing relocation. */
import type {Actor} from '../engine/actor';
import type {KillCtx} from '../engine/killHandlers';
import type {ZoneDef} from '../data/zones';
import {WarlordField,type WarlordState} from '../world/warlord';
import {birthNativeWarlord,type NativeWarlordHost} from '../engine/nativeSceneWarlordBirth';
import {captureNativeActorConstruction} from '../engine/nativeActorConstruction';
import {bindNativeWarlordIdentity,installNativeWarlordRegistration,type NativeWarlordRegistration,type NativeWarlordObserver} from '../engine/nativeWarlordIdentity';
import {sceneSlipAway,type NativeSceneCombatMotionHost} from '../engine/nativeSceneCombatMotion';
import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
const registrations=new WeakMap<object,NativeWarlordRegistration>();
installNativeWarlordRegistration(token=>{const r=registrations.get(token);if(!r)throw Error('Native crown needs its private one-use registration');registrations.delete(token);return r;});
function bind(r:NativeWarlordRegistration):void {const token=Object.freeze({});registrations.set(token,r);bindNativeWarlordIdentity(token);}
interface Body {owner:NativeAreaSceneWarlordArrival;body:Actor;crown:object;lord:WarlordState;field:WarlordField;faction:string;definition:ZoneDef;state:'pending'|'live'|'retiring'|'terminal'|'spent'}
interface Campaign {bodies:Set<Body>;crowns:Map<object,Body>;consumed:WeakSet<object>}
const campaigns=new WeakMap<NativeAreaSceneTransitionCoordinator,Campaign>();
const arrayIncludes=Array.prototype.includes;
interface Placement {initial:boolean;definition:ZoneDef;lord:WarlordState;crown:object;field:WarlordField;body?:Body}
export class NativeAreaSceneWarlordArrival {
 readonly host:NativeWarlordHost;
 readonly #crownOf=WarlordField.prototype.crownOf;readonly #withCrownKill=WarlordField.prototype.withCrownKill;readonly #factoryOwner=NativeAreaScenePopulation.prototype.factoryOwnerOf;
 readonly #seatsFor:NativeAreaSceneTransitionCoordinator['seatsFor'];readonly #selected:NativeAreaSceneTransitionCoordinator['assertWarlordArrival'];readonly #occupiedQuery:NativeAreaSceneTransitionCoordinator['warlordOccupied'];
 readonly #bindingFor=NativeAreaActorAuthority.prototype.bindingFor;readonly #finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;readonly #unclaimed=NativeAreaActorAuthority.prototype.assertUnclaimed;
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #physical:NativeWarlordHost&NativeSceneCombatMotionHost;readonly #campaign:Campaign;
 #placement:Placement|undefined;#arriving:ZoneDef|undefined;#busy=false;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks,physical:NativeWarlordHost&NativeSceneCombatMotionHost){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native crown needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#physical=physical;
  this.#seatsFor=NativeAreaSceneTransitionCoordinator.prototype.seatsFor;this.#selected=NativeAreaSceneTransitionCoordinator.prototype.assertWarlordArrival;this.#occupiedQuery=NativeAreaSceneTransitionCoordinator.prototype.warlordOccupied;
  let campaign=campaigns.get(combat.input.coordinator);if(!campaign){campaign={bodies:new Set(),crowns:new Map(),consumed:new WeakSet()};campaigns.set(combat.input.coordinator,campaign);}this.#campaign=campaign;
  const host=Object.create(combat.input.assembly.host) as NativeWarlordHost;
  for(const key of ['sim','actors'] as const)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#arrival();const value=Reflect.get(physical,key);this.#arrival();return value;}});
  for(const key of ['createMonster','clampPos','farPoint','text'] as const)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#arrival();const fn=Reflect.get(physical,key);this.#arrival();return(...args:unknown[])=>{this.#arrival();const value=Reflect.apply(fn,physical,args);this.#arrival();return value;};}});
  this.host=Object.freeze(host);Object.defineProperty(this,'host',{writable:false,configurable:false});
  const observer=(initial:boolean):NativeWarlordObserver=>({place:(lord,run)=>this.#place(initial,lord,run),create:run=>this.#create(run),beforePush:(actors,body)=>this.#beforePush(actors,body),push:body=>this.#push(body)});
  bind({host:combat.input.assembly.host,observer:observer(true)});bind({host:this.host,observer:observer(false)});
 }
 #arrival():ZoneDef {const def=this.#arriving;if(!def||Reflect.apply(this.#selected,this.#combat.input.coordinator,[this.#combat])!==def||this.#combat.scene.zone!==def)throw Error('Native crown needs its unchanged arrival definition');return def;}
 #check(p:Placement):void {
  const combat=this.#combat;if(this.#placement!==p||combat.scene.zone!==p.definition)throw Error('Native crown placement changed');
  if(p.initial){if(combat.input.assembly.phase!=='birthing')throw Error('Native crown initial placement escaped actual birth');}else this.#arrival();
  if(combat.input.campaign.sim.warlord!==p.field||Reflect.apply(this.#crownOf,p.field,[p.lord])!==p.crown||p.lord.capitalId!==p.definition.id||p.field.lordAt(p.definition.id)!==p.lord)throw Error('Native crown changed during placement');
 }
 #occupied(owner:NativeAreaSceneWarlordArrival,p:Placement):boolean {this.#check(p);const combat=owner.#combat;const result=p.initial?Reflect.apply(this.#seatsFor,combat.input.coordinator,[combat]).length>0:Reflect.apply(this.#occupiedQuery,this.#combat.input.coordinator,[this.#combat,combat]);this.#check(p);return result;}
 #present(row:Body):boolean {const combat=row.owner.#combat;return Reflect.apply(arrayIncludes,combat.scene.actors,[row.body]);}
 #forget(row:Body):void {this.#campaign.bodies.delete(row);if(this.#campaign.crowns.get(row.crown)===row)this.#campaign.crowns.delete(row.crown);}
 #retire(row:Body,p:Placement):void {
  const owner=row.owner,combat=owner.#combat;
  const check=()=>{this.#check(p);if(this.#occupied(owner,p))throw Error('Native crown cannot retire an occupied fight');const binding=Reflect.apply(this.#bindingFor,combat.input.authority,[combat.scene]);Reflect.apply(this.#finalPhysical,combat.input.authority,[binding,[row.body]]);};
  check();row.state='retiring';
  try { owner.#entry(owner,{permission:'proc',physical:[row.body],sources:[]},()=>{
   const live=owner.#physical,host=Object.create(live) as NativeSceneCombatMotionHost;
   Object.defineProperty(host,'actors',{get:()=>{check();const actors=live.actors;check();return new Proxy(actors,{get(target,key){const value=Reflect.get(target,key,target);check();return key==='indexOf'||key==='splice'?(...args:unknown[])=>{check();return Reflect.apply(value,target,args);}:value;}});}});
   for(const key of ['despawnPartsOf','retireCombatBody','text'] as const)Object.defineProperty(host,key,{get:()=>{const fn=Reflect.get(live,key);if(key!=='retireCombatBody')check();return(...args:unknown[])=>{if(key!=='retireCombatBody')check();const value=Reflect.apply(fn,live,args);if(key==='despawnPartsOf')check();return value;};}});
   // The native retirement removes first, then retires its exact authority. Its
   // final flash follows removal, so that read only needs attendance/arrival.
   Object.defineProperty(host,'flashes',{configurable:true,get:()=>{this.#check(p);if(this.#occupied(owner,p))throw Error('Native crown retirement acquired an occupant');return live.flashes;}});
   sceneSlipAway(host,row.body,'');
  }); } finally {
   // A failure in the final native flash must not retain an already removed,
   // genuinely released actor. An incomplete physical retirement stays tracked.
   if(!this.#present(row)){let released=false;try{Reflect.apply(this.#unclaimed,combat.input.authority,[row.body]);released=true;}catch{}if(released){row.state='terminal';this.#forget(row);}}
   else {
    // A selection refusal may happen before native removal. If the exact body
    // is still admitted in its original physical owner, it remains a live
    // fight; earlier native part/text effects are deliberately not undone.
    try{const binding=Reflect.apply(this.#bindingFor,combat.input.authority,[combat.scene]);Reflect.apply(this.#finalPhysical,combat.input.authority,[binding,[row.body]]);if(combat.scene.zone===row.definition)row.state='live';}catch{}
   }
  }
  if(this.#present(row))throw Error('Native crown retirement left its physical body');
  Reflect.apply(this.#unclaimed,combat.input.authority,[row.body]);row.state='terminal';this.#forget(row);
 }
 #place(initial:boolean,lord:WarlordState,run:()=>void):void {
  if(this.#busy)throw Error('Native crown placement cannot reenter');const combat=this.#combat,definition=combat.scene.zone,field=combat.input.campaign.sim.warlord,crown=Reflect.apply(this.#crownOf,field,[lord]);
  if(!crown)return;const p:Placement={initial,definition,lord,crown,field};this.#busy=true;this.#placement=p;
  try{
   this.#check(p);
   for(const old of this.#campaign.bodies){if(old.faction!==lord.faction||old.crown===crown||old.state==='terminal'||old.state==='spent')continue;
    if(!this.#present(old)){old.state='terminal';this.#forget(old);continue;}if(!this.#occupied(old.owner,p))this.#retire(old,p);
   }
   if(this.#campaign.consumed.has(crown))return;
   const prior=this.#campaign.crowns.get(crown);
   if(prior){
    if(prior.state==='spent'||prior.state==='terminal'||!this.#present(prior)){prior.state='terminal';this.#campaign.consumed.add(crown);this.#forget(prior);return;}
    if(prior.owner===this||this.#occupied(prior.owner,p))return;
    this.#retire(prior,p);
   }
   this.#check(p);run();
  }finally{
   if(p.body?.state==='pending'){p.body.state='terminal';if(this.#present(p.body))this.#campaign.consumed.add(crown);this.#forget(p.body);}
   this.#placement=undefined;this.#busy=false;
  }
 }
 #create(run:()=>Actor):Actor {
  const p=this.#placement;if(!p||p.body)throw Error('Native crown needs one actual factory body');this.#check(p);
  const born=captureNativeActorConstruction(run),body=born.value;
  if(!born.created.has(body)||!Reflect.apply(this.#factoryOwner,this.#combat.input.assembly.input.population,[body]))throw Error('Native crown needs its actual population construction');
  const row:Body={owner:this,body,crown:p.crown,lord:p.lord,field:p.field,faction:p.lord.faction,definition:p.definition,state:'pending'};p.body=row;this.#campaign.bodies.add(row);this.#campaign.crowns.set(row.crown,row);
  bind({body,current:ctx=>this.#current(row,ctx),break:ctx=>this.#break(row,ctx)});this.#check(p);return body;
 }
 #beforePush(actors:Actor[],body:Actor):void {const p=this.#placement,row=p?.body;if(!p||!row||row.body!==body||row.state!=='pending')throw Error('Native crown push needs its exact pending construction');this.#check(p);if(this.#combat.scene.actors!==actors)throw Error('Native crown selected census changed');}
 #push(body:Actor):void {const p=this.#placement,row=p?.body;if(!p||!row||row.body!==body||row.state!=='pending')throw Error('Native crown push needs its exact construction');this.#check(p);if(!this.#combat.scene.actors.includes(body))throw Error('Native crown needs its actual inserted body');row.state='live';}
 #current(row:Body,ctx:KillCtx):boolean {
  if(row.state!=='live'||ctx.actor!==row.body||ctx.sim.warlord!==row.field||row.body.faction!==row.faction||Reflect.apply(this.#crownOf,row.field,[row.lord])!==row.crown){if(ctx.actor===row.body&&row.body.dead){this.#campaign.consumed.add(row.crown);this.#forget(row);}return false;}
  try{return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&ctx.sim===this.#combat.input.campaign.sim&&Reflect.apply(this.#crownOf,row.field,[row.lord])===row.crown;});}catch{return false;}
 }
 #break(row:Body,ctx:KillCtx):boolean {
  if(!this.#current(row,ctx))return false;const field=ctx.sim.warlord,fn=field.onWarlordKilled,faction=row.faction,time=ctx.time,view=ctx.simView();if(!this.#current(row,ctx))return false;
  // The weak binding stays terminal. Active tracking no longer owns a killed
  // actor, while a weak crown marker prevents replay if the native callback fails.
  row.state='spent';this.#campaign.consumed.add(row.crown);this.#forget(row);return Reflect.apply(this.#withCrownKill,field,[row.lord,row.crown,()=>Reflect.apply(fn,field,[faction,time,view])]);
 }
 arrive():void {
  if(this.#arriving||this.#busy)throw Error('Native crown arrival cannot reenter');const def=Reflect.apply(this.#selected,this.#combat.input.coordinator,[this.#combat]);this.#arriving=def;
  try{this.#entry(this,{permission:'physical'},()=>{this.#arrival();birthNativeWarlord(this.host,def,def.objective,this.#combat.scene.player);});}finally{this.#arriving=undefined;}
 }
}

