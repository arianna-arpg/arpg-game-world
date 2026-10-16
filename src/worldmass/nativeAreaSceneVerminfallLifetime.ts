/** Retained infestation placement and package kills follow the actual event object.
 * Native marker, discovery, field, and insertion effects survive later exceptions. */
import type {Actor} from '../engine/actor';
import {captureNativeActorConstruction} from '../engine/nativeActorConstruction';
import type {KillCtx} from '../engine/killHandlers';
import type {ZoneDef} from '../data/zones';
import {nativeVerminfallLifetimeCalls,type VerminfallField,type InfestationInfo} from '../packages/overlays/verminfall';
import {bindNativeVerminfallIdentity,installNativeVerminfallRegistration,type NativeVerminfallRegistration,type NativeVerminfallRole} from '../engine/nativeVerminfallIdentity';
import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';
import {claimNativeVerminfallArrival,nativeVerminfallArrivalPending} from './nativeAreaSceneTransitionCoordinator';
const liveRegistryCombats=new WeakSet<NativeAreaSceneCombat>();
/** Read-only recognition of the actual owner-entered synchronous registry scope. */
export function nativeVerminfallLiveRegistryActive(combat:NativeAreaSceneCombat):boolean {return liveRegistryCombats.has(combat);}
const registrations=new WeakMap<object,NativeVerminfallRegistration>();
installNativeVerminfallRegistration(token=>{const row=registrations.get(token);if(!row)throw Error('Native Verminfall needs its private registration');registrations.delete(token);return row;});
function bind(row:NativeVerminfallRegistration):void {const token=Object.freeze({});registrations.set(token,row);bindNativeVerminfallIdentity(token);}
function own<T>(object:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Verminfall needs ordinary selected data');return d.value as T;}
function rows(actors:Actor[]):Actor[]{const out:Actor[]=[];for(let i=0,n=own<number>(actors,'length');i<n;i++)out.push(own<Actor>(actors,i));return out;}
interface Event {definition:ZoneDef;field:VerminfallField;epoch:object}
interface Placement extends Event {initial:boolean;marker:Set<string>;before:boolean;actors:Actor[];logicalId:string}
interface Body extends Event {body:Actor;role:NativeVerminfallRole;spent:boolean}
interface Kill {row:Body;ctx:KillCtx;committed:boolean;kingCreated:boolean}
export class NativeAreaSceneVerminfallLifetime {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;
 readonly #epoch=nativeVerminfallLifetimeCalls.epoch;readonly #identity=nativeVerminfallLifetimeCalls.identity;readonly #current=nativeVerminfallLifetimeCalls.current;readonly #scope=nativeVerminfallLifetimeCalls.scope;
 readonly #factory=nativePopulationFactoryOwner;
 readonly #arrivals=new WeakSet<object>();readonly #bodies=new WeakMap<Actor,Body>();
 #visitConsumed=false;#placed:{field:VerminfallField;id:string}|undefined;
 #placement:Placement|undefined;#kill:Kill|undefined;#liveCheck:(()=>void)|undefined;#arrivalCheck:(()=>void)|undefined;#busy=false;#arriving=false;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native Verminfall needs its actual aggregate');
  assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);
  this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#definition=combat.scene.zone;
  bind({host:combat.input.assembly.input.registry.input.birth.host,observer:{
   query:(field,definition,select)=>this.#query(field,definition,select),
   place:(field,definition,info,run)=>this.#place(field,definition,info,run),
   step:select=>this.#step(select),mark:select=>this.#mark(select),create:(role,select)=>this.#create(role,select),insert:(body,select)=>this.#insert(body,select),
  }});
 }
 #query(field:VerminfallField,definition:ZoneDef,select:()=>()=>InfestationInfo|null):InfestationInfo|null {
  const c=this.#combat,census=c.scene.actors,initial=c.input.assembly.phase==='birthing',epoch=Reflect.apply(this.#epoch,field,[definition.id]),logicalId=epoch?own<string>(epoch,'id'):undefined;
  const check=()=>{
   if(c.scene.zone!==definition||definition!==this.#definition||c.scene.actors!==census||c.input.campaign.sim.verminfallField!==field||Reflect.apply(this.#epoch,field,[definition.id])!==epoch||(epoch&&own<string>(epoch,'id')!==logicalId))
    throw Error('Native Verminfall selected query changed');
   if(initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Verminfall query escaped actual birth');}
   else{const check=this.#arrivalCheck??this.#liveCheck;if(!check)throw Error('Native Verminfall query needs actual live registry or arrival');check();}
  };
  check();const run=select();check();const info=run();check();return info;
 }
 #eventCurrent(row:Event):boolean {
  return this.#combat.scene.zone===row.definition&&this.#combat.input.campaign.sim.verminfallField===row.field
   &&Reflect.apply(this.#current,row.field,[row.epoch,row.definition.id]);
 }
 #checkPlacement(row:Placement):void {
  const c=this.#combat;
  if(!this.#eventCurrent(row)||own<string>(row.epoch,'id')!==row.logicalId||c.scene.actors!==row.actors||c.input.assembly.input.registry.input.birth.input.state.materializedInfestation!==row.marker)
   throw Error('Native Verminfall selected placement changed');
  if(row.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Verminfall escaped actual birth');}
  else{const check=this.#arrivalCheck??this.#liveCheck;if(!check)throw Error('Native Verminfall needs actual live registry or arrival');check();}
 }
 #place(field:VerminfallField,definition:ZoneDef,info:InfestationInfo,run:()=>void):void {
  if(this.#placement)throw Error('Native Verminfall placement cannot reenter');
  const c=this.#combat,epoch=Reflect.apply(this.#identity,field,[info,definition.id]);
  if(definition!==this.#definition||!epoch)throw Error('Native Verminfall needs its actual selected infestation');
  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedInfestation;
  const row:Placement={field,definition,epoch,logicalId:own<string>(epoch,'id'),initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[definition.id]),actors:c.scene.actors};
  this.#placement=row;
  try{
   this.#checkPlacement(row);
   const consumed=this.#visitConsumed,present=Reflect.apply(Set.prototype.has,marker,[definition.id]);
   // A new field epoch cannot reopen a consumed visit. Repair a removed marker
   // without authorizing another pour; only actual warm arrival can release it.
   if(consumed&&!present){const selected=marker.add;this.#checkPlacement(row);Reflect.apply(selected,marker,[definition.id]);this.#checkPlacement(row);}
   row.before=Reflect.apply(Set.prototype.has,marker,[definition.id]);
   if(consumed)return;
   Reflect.apply(this.#scope,field,[epoch,definition.id,'discovery',()=>this.#checkPlacement(row),()=>{},run]);
   this.#checkPlacement(row);
  }finally{
   // A completed native add consumes the placement even when a later native call throws.
   if(!row.before&&Reflect.apply(Set.prototype.has,marker,[definition.id]))this.#consumePlacement(row);
   this.#placement=undefined;
  }
 }
 #step<T>(select:()=>()=>T):T {
  const row=this.#placement;if(!row)throw Error('Native Verminfall step needs its placement');
  this.#checkPlacement(row);const run=select();this.#checkPlacement(row);const result=run();this.#checkPlacement(row);return result;
 }
 #mark<T>(select:()=>()=>T):T {
  const row=this.#placement;if(!row)throw Error('Native Verminfall marker needs its placement');
  try{return this.#step(select);}finally{
   // Observe the native add before later callbacks can delete its marker and throw.
   // Keep the exact selected error and every completed write; never replay this visit.
   if(!row.before&&Reflect.apply(Set.prototype.has,row.marker,[row.definition.id]))this.#consumePlacement(row);
  }
 }
 #consumePlacement(row:Placement):void {this.#visitConsumed=true;this.#placed={field:row.field,id:row.logicalId};}
 /** A genuine unoccupied return can renew placement, independently of field
  * object replacement. The private invocation is claimed once; its validator
  * remains live through every selected callback and is revoked by the owner. */
 arrive():void {
  if(this.#arriving||this.#busy||this.#placement||this.#kill)throw Error('Native Verminfall arrival cannot reenter');
  this.#arriving=true;
  try{
  const c=this.#combat,validate=claimNativeVerminfallArrival(c.input.coordinator,c,this),selection=validate();
  if(selection.occupied||this.#arrivals.has(selection.token))return;
  const scene=c.scene,definition=this.#definition,actors=scene.actors,registry=c.input.assembly.input.registry,birth=registry.input.birth,marker=birth.input.state.materializedInfestation,field=c.input.campaign.sim.verminfallField;
  const epoch=field?Reflect.apply(this.#epoch,field,[definition.id]):undefined,logicalId=epoch?own<string>(epoch,'id'):undefined,inCave=registry.input.descentState.inCave,special=definition.special;
  const check=()=>{
   const current=validate();
   if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||c.input.assembly.input.registry!==registry||registry.input.birth!==birth||birth.input.state.materializedInfestation!==marker||c.input.campaign.sim.verminfallField!==field||registry.input.descentState.inCave!==inCave||definition.special!==special||(field?Reflect.apply(this.#epoch,field,[definition.id]):undefined)!==epoch||(epoch&&own<string>(epoch,'id')!==logicalId))throw Error('Native Verminfall selected arrival changed');
  };
  this.#arrivalCheck=()=>this.#entry(this,{permission:'physical',physical:[],sources:[]},check);
  this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{
   check();
   // Verminfall is neither pocket-native nor an owned-ground runtime row.
   if(inCave||special){this.#arrivals.add(selection.token);return;}
   const placed=this.#placed,same=this.#visitConsumed&&placed!==undefined&&field===placed.field&&logicalId!==undefined&&logicalId===placed.id;
   if(same)this.#arrivals.add(selection.token);
   else{
    const selected=marker.delete;check();let failed=false;
    try{Reflect.apply(selected,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{
     if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){this.#visitConsumed=false;this.#placed=undefined;this.#arrivals.add(selection.token);}
     if(failed){try{check();}catch{ /* Preserve the selected error and completed deletion. */ }}else check();
    }
    if(Reflect.apply(Set.prototype.has,marker,[definition.id]))throw Error('Native Verminfall arrival guard was not released');
   }
   const selected=birth.materializeInfestation;check();Reflect.apply(selected,birth,[definition]);check();
  });}finally{this.#arrivalCheck=undefined;this.#arriving=false;}
 }
 #bindBody(event:Event,body:Actor,role:NativeVerminfallRole):Body {
  if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Verminfall needs actual population construction');
  if(this.#bodies.has(body))throw Error('Native Verminfall cannot adopt an earlier body');
  const row:Body={...event,body,role,spent:false};this.#bodies.set(body,row);
  bind({body,current:(ctx,selectedRole)=>this.#bodyCurrent(row,ctx,selectedRole),
   run:(ctx,selectedRole,run)=>this.#runKill(row,ctx,selectedRole,run),
   step:(ctx,select)=>this.#killStep(row,ctx,select),king:(ctx,select)=>this.#king(row,ctx,select)});
  return row;
 }
 #create(role:NativeVerminfallRole,select:()=>()=>Actor):Actor {
  const row=this.#placement;if(!row)throw Error('Native Verminfall creation needs its placement');
  this.#checkPlacement(row);const before=rows(row.actors),run=select();this.#checkPlacement(row);
  const born=captureNativeActorConstruction(run),body=born.value;this.#checkPlacement(row);
  if(!born.created.has(body))throw Error('Native Verminfall needs construction by its selected invocation');
  if(before.includes(body)||rows(row.actors).includes(body))throw Error('Native Verminfall factory did not return a fresh uninserted body');
  // Bind before native tag/position/insertion writes: later partial insertion never becomes unbound.
  this.#bindBody(row,body,role);return body;
 }
 #insert(body:Actor,select:()=>()=>void):void {
  const row=this.#placement,bodyRow=this.#bodies.get(body);
  if(!row||!bodyRow||bodyRow.epoch!==row.epoch||bodyRow.field!==row.field)throw Error('Native Verminfall insertion needs its own creation');
  this.#checkPlacement(row);if(rows(row.actors).includes(body))throw Error('Native Verminfall body was inserted early');
  const run=select();this.#checkPlacement(row);run();
  // If native push inserts and throws, its exact exception and insertion survive.
  this.#checkPlacement(row);if(!rows(row.actors).includes(body))throw Error('Native Verminfall insertion did not insert its body');
 }
 #bodyCurrent(row:Body,ctx:KillCtx,role:'nest'|'king'):boolean {
  if(row.spent||row.role!==role||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.verminfallField!==row.field||!this.#eventCurrent(row))return false;
  return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#eventCurrent(row);});
 }
 #checkKill(kill:Kill):void {
  const {row,ctx}=kill;
  this.#entry(this,{permission:'physical',physical:[row.body]},()=>{
   this.#hooks.assertCombatKillContext(this,ctx);
   if(this.#kill!==kill||ctx.actor!==row.body||ctx.zone!==row.definition||this.#combat.scene.zone!==row.definition||ctx.sim.verminfallField!==row.field||this.#combat.input.campaign.sim.verminfallField!==row.field)
    throw Error('Native Verminfall kill owner changed');
   // The real king clear ends its own epoch before the original bonus/notice.
   if(!(row.role==='king'&&kill.committed)&&!Reflect.apply(this.#current,row.field,[row.epoch,row.definition.id]))
    throw Error('Native Verminfall kill event changed');
  });
 }
 #runKill(row:Body,ctx:KillCtx,role:'nest'|'king',run:()=>void):void {
  if(!this.#bodyCurrent(row,ctx,role))return;
  if(this.#kill)throw Error('Native Verminfall package kill cannot reenter');
  const kill:Kill={row,ctx,committed:false,kingCreated:false};this.#kill=kill;row.spent=true;
  try{
   this.#checkKill(kill);
   Reflect.apply(this.#scope,row.field,[row.epoch,row.definition.id,role,()=>this.#checkKill(kill),()=>{kill.committed=true;},run]);
   this.#checkKill(kill);
  }finally{this.#kill=undefined;}
 }
 #killStep<T>(row:Body,ctx:KillCtx,select:()=>()=>T):T {
  const kill=this.#kill;if(!kill||kill.row!==row||kill.ctx!==ctx)throw Error('Native Verminfall step needs its active kill');
  this.#checkKill(kill);const run=select();this.#checkKill(kill);const result=run();this.#checkKill(kill);return result;
 }
 #king(row:Body,ctx:KillCtx,select:()=>()=>Actor):Actor {
  const kill=this.#kill;
  if(!kill||kill.row!==row||kill.ctx!==ctx||row.role!=='nest'||!kill.committed||kill.kingCreated)throw Error('Native Verminfall king needs its committed last nest');
  this.#checkKill(kill);const actors=this.#combat.scene.actors,before=rows(actors),run=select();this.#checkKill(kill);
  kill.kingCreated=true;const born=captureNativeActorConstruction(run),body=born.value;this.#checkKill(kill);
  if(!born.created.has(body))throw Error('Native Verminfall king needs construction by its selected invocation');
  if(this.#combat.scene.actors!==actors||before.includes(body)||!rows(actors).includes(body))throw Error('Native Verminfall king needs actual fresh insertion');
  this.#bindBody(row,body,'king');return body;
 }
 materializeLiveZoneEvents():void {
  if(this.#busy||this.#arriving||nativeVerminfallArrivalPending(this.#combat.input.coordinator,this.#combat,this))throw Error('Native Verminfall live registry cannot reenter');
  const c=this.#combat,scene=c.scene,census=own<Actor[]>(scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=c.input.assembly.input.registry.input.birth.input.state.materializedInfestation;
  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{
   if(own(scene,'zone')!==definition||own(scene,'actors')!==census||c.input.campaign.sim!==sim||c.input.assembly.input.registry.input.birth.input.state.materializedInfestation!==marker)
    throw Error('Native Verminfall registry owner changed');
  });
  this.#busy=true;this.#liveCheck=check;
  try{this.#entry(this,{permission:'physical',physical,sources:[]},()=>{
   check();const owner=c.crusadeLifetime,selected=owner.materializeLiveZoneEvents;check();
   // Do not authenticate a reentrant call made by the selected method getter.
   liveRegistryCombats.add(c);try{Reflect.apply(selected,owner,[]);}finally{liveRegistryCombats.delete(c);}check();
  });}finally{this.#liveCheck=undefined;this.#busy=false;}
 }
}
