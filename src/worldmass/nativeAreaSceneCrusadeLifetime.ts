import {nativeVerminfallLiveRegistryActive} from './nativeAreaSceneVerminfallLifetime';
import {claimNativeCrusadeArrival,nativeCrusadeArrivalPending} from './nativeAreaSceneTransitionCoordinator';
/** A retained garrison keeps both its spent events and its consumed visit.
 * Only an actual empty return may admit a never-spent event; bodies and terrain survive. */
import type {Actor} from '../engine/actor';
import type {KillCtx} from '../engine/killHandlers';
import type {ZoneDef} from '../data/zones';
import {nativeCrusadeLifetimeCalls,type CrusadeField,type CrusadeInfo} from '../packages/overlays/crusade';
import {bindNativeCrusadeIdentity,installNativeCrusadeRegistration,type NativeCrusadeRegistration} from '../engine/nativeCrusadeIdentity';
import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
const registrations=new WeakMap<object,NativeCrusadeRegistration>();
installNativeCrusadeRegistration(token=>{const r=registrations.get(token);if(!r)throw Error('Native Crusade needs its private registration');registrations.delete(token);return r;});
function bind(r:NativeCrusadeRegistration):void {const token=Object.freeze({});registrations.set(token,r);bindNativeCrusadeIdentity(token);}
function own<T>(o:object,k:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Crusade needs ordinary selected data');return d.value as T;}
function rows(a:Actor[]):Actor[]{const out:Actor[]=[];for(let i=0,n=own<number>(a,'length');i<n;i++)out.push(own<Actor>(a,i));return out;}
interface Placement {definition:ZoneDef;field:CrusadeField;epoch:object;id:string;rewardMul:number;initial:boolean;marker:Set<string>;before:boolean;actors:Actor[]}
interface Body extends Placement {body:Actor;spent:boolean}
export class NativeAreaSceneCrusadeLifetime {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;
 readonly #query=nativeCrusadeLifetimeCalls.query;readonly #epoch=nativeCrusadeLifetimeCalls.epoch;readonly #resolve=nativeCrusadeLifetimeCalls.resolve;readonly #factory=NativeAreaScenePopulation.prototype.factoryOwnerOf;
 readonly #spent=new WeakSet<object>();readonly #logicalSpent=new WeakMap<CrusadeField,Set<string>>();readonly #arrivals=new WeakSet<object>();
 #visitConsumed=false;#placement:Placement|undefined;#liveCheck:(()=>void)|undefined;#arrivalCheck:(()=>void)|undefined;#busy=false;#arriving=false;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native Crusade needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);
  this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#definition=combat.scene.zone;
  bind({host:combat.input.assembly.input.registry.input.birth.host,observer:{place:(info,run)=>this.#place(info,run),mark:select=>this.#mark(select),create:run=>this.#create(run)}});
 }
 #check(p:Placement):void {const c=this.#combat;if(c.scene.zone!==p.definition||c.scene.actors!==p.actors||c.input.campaign.sim.crusadeField!==p.field||Reflect.apply(this.#epoch,p.field,[p.id])!==p.epoch||c.input.assembly.input.registry.input.birth.input.state.materializedCrusades!==p.marker)throw Error('Native Crusade selected event changed');if(p.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Crusade initial placement escaped actual birth');}else{const check=this.#arrivalCheck??this.#liveCheck;if(!check)throw Error('Native Crusade placement needs actual live registry or arrival');check();}}
 #hasSpent(field:CrusadeField,id:string,epoch:object):boolean {return this.#spent.has(epoch)||!!this.#logicalSpent.get(field)?.has(id);}
 #consume(p:Placement):void {this.#visitConsumed=true;this.#spent.add(p.epoch);let ids=this.#logicalSpent.get(p.field);if(!ids){ids=new Set<string>();this.#logicalSpent.set(p.field,ids);}ids.add(p.id);}
 #place(info:CrusadeInfo,run:()=>void):void {
  if(this.#placement)throw Error('Native Crusade placement cannot reenter');const c=this.#combat,field=c.input.campaign.sim.crusadeField,id=own<string>(info,'crusadeId'),epoch=field&&Reflect.apply(this.#epoch,field,[id]);if(!field||!epoch)throw Error('Native Crusade placement needs its actual event');
  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedCrusades,p:Placement={definition:this.#definition,field,epoch,id,rewardMul:own<number>(info,'rewardMul'),initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[this.#definition.id]),actors:c.scene.actors};let attempted=false;this.#placement=p;
  try{
   this.#check(p);const consumed=this.#visitConsumed||this.#hasSpent(field,id,epoch);
   if(consumed){this.#visitConsumed=true;if(!Reflect.apply(Set.prototype.has,marker,[p.definition.id])){const selected=marker.add;this.#check(p);Reflect.apply(selected,marker,[p.definition.id]);this.#check(p);}return;}
   attempted=true;run();this.#check(p);
  }finally{if(attempted&&!p.before&&Reflect.apply(Set.prototype.has,marker,[p.definition.id]))this.#consume(p);this.#placement=undefined;}
 }
 #mark(select:()=>()=>void):void {
  const p=this.#placement;if(!p)throw Error('Native Crusade marker needs its actual placement');
  try{this.#check(p);const run=select();this.#check(p);run();this.#check(p);}
  finally{
   // Observe the completed native add before discovery/notice can delete the
   // marker and throw. The exact selected error and completed writes survive.
   if(!p.before&&Reflect.apply(Set.prototype.has,p.marker,[p.definition.id]))this.#consume(p);
  }
 }
 /** The private coordinator invocation admits only this genuine empty return.
  * Logical history prevents A -> B -> A duplication without authorizing an old
  * commander's reward against a reconstructed object. */
 arrive():void {
  if(this.#arriving||this.#busy||this.#placement)throw Error('Native Crusade arrival cannot reenter');this.#arriving=true;
  try{
   const c=this.#combat,validate=claimNativeCrusadeArrival(c.input.coordinator,c,this),selection=validate();
   if(selection.occupied||this.#arrivals.has(selection.token))return;
   const scene=c.scene,definition=this.#definition,actors=scene.actors,registry=c.input.assembly.input.registry,birth=registry.input.birth,marker=birth.input.state.materializedCrusades,field=c.input.campaign.sim.crusadeField,inCave=registry.input.descentState.inCave,special=definition.special;
   const checkOwner=()=>{const current=validate();if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||c.input.assembly.input.registry!==registry||registry.input.birth!==birth||birth.input.state.materializedCrusades!==marker||c.input.campaign.sim.crusadeField!==field||registry.input.descentState.inCave!==inCave||definition.special!==special)throw Error('Native Crusade selected arrival changed');};
   this.#arrivalCheck=()=>this.#entry(this,{permission:'physical',physical:[],sources:[]},checkOwner);
   this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{
    checkOwner();if(inCave||special){this.#arrivals.add(selection.token);return;}
    // The captured native query names the event before a selected query getter
    // can run. Query callbacks may not exchange that selected field or epoch.
    const expected=field?Reflect.apply(this.#query,field,[definition.id]) as CrusadeInfo|null:null;checkOwner();
    const id=expected?own<string>(expected,'crusadeId'):undefined,epoch=field&&id!==undefined?Reflect.apply(this.#epoch,field,[id]):undefined;
    if(expected&&!epoch)throw Error('Native Crusade arrival query lost its actual event');
    const check=()=>{checkOwner();const current=field?Reflect.apply(this.#query,field,[definition.id]) as CrusadeInfo|null:null;checkOwner();if((current?own<string>(current,'crusadeId'):undefined)!==id||(field&&id!==undefined?Reflect.apply(this.#epoch,field,[id]):undefined)!==epoch)throw Error('Native Crusade selected arrival event changed');};
    this.#arrivalCheck=()=>this.#entry(this,{permission:'physical',physical:[],sources:[]},check);
    let info:CrusadeInfo|null=null;
    if(field){const selected=field.crusadeOn;check();info=Reflect.apply(selected,field,[definition.id]);check();if((info?own<string>(info,'crusadeId'):undefined)!==id)throw Error('Native Crusade selected query differs from its actual event');}
    const spent=!!(field&&id!==undefined&&epoch&&this.#hasSpent(field,id,epoch));
    if(spent){
     this.#visitConsumed=true;this.#arrivals.add(selection.token);
     if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){const selected=marker.add;check();Reflect.apply(selected,marker,[definition.id]);check();}
    }else{
     const selected=marker.delete;check();let failed=false;
     try{Reflect.apply(selected,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{
      if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){this.#visitConsumed=false;this.#arrivals.add(selection.token);}
      if(failed){try{check();}catch{ /* Preserve the selected error and completed deletion. */ }}else check();
     }
     if(Reflect.apply(Set.prototype.has,marker,[definition.id]))throw Error('Native Crusade arrival guard was not released');
    }
    if(info){const selected=birth.materializeCrusade;check();Reflect.apply(selected,birth,[info]);check();}
   });
  }finally{this.#arrivalCheck=undefined;this.#arriving=false;}
 }
 #create(run:()=>Actor):Actor {const p=this.#placement;if(!p)return run();this.#check(p);const body=run();this.#check(p);if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Crusade needs actual population construction');const row:Body={...p,body,spent:false};bind({body,current:ctx=>this.#current(row,ctx),resolve:ctx=>this.#settle(row,ctx)});return body;}
 #current(row:Body,ctx:KillCtx):boolean {if(row.spent||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.crusadeField!==row.field||Reflect.apply(this.#epoch,row.field,[row.id])!==row.epoch)return false;return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&Reflect.apply(this.#epoch,row.field,[row.id])===row.epoch;});}
 #settle(row:Body,ctx:KillCtx):number {if(!this.#current(row,ctx))return 1;const field=row.field,fn=field.resolveCrusadeZone;if(!this.#current(row,ctx))return 1;row.spent=true;const check=()=>this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);if(this.#combat.scene.zone!==row.definition||ctx.sim.crusadeField!==field)throw Error('Native Crusade kill owner changed');});return Reflect.apply(this.#resolve,field,[row.epoch,row.id,row.definition.id,row.rewardMul,check,()=>Reflect.apply(fn,field,[row.definition.id])]);}
 materializeLiveZoneEvents():void {
  if(this.#arriving||nativeCrusadeArrivalPending(this.#combat.input.coordinator,this.#combat,this))throw Error('Native Crusade live registry cannot reenter');
  // Existing direct callers enter the same outer event scope; the delegated call runs this registry body once.
  if(!nativeVerminfallLiveRegistryActive(this.#combat)){this.#combat.verminfallLifetime.materializeLiveZoneEvents();return;}
  if(this.#busy)throw Error('Native Crusade live registry cannot reenter');const c=this.#combat,registry=c.input.assembly.input.registry,census=own<Actor[]>(c.scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=registry.input.birth.input.state.materializedCrusades;
  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{if(own(c.scene,'zone')!==definition||own(c.scene,'actors')!==census||c.input.campaign.sim!==sim||registry.input.birth.input.state.materializedCrusades!==marker)throw Error('Native Crusade registry owner changed');});
  this.#busy=true;this.#liveCheck=check;
  try{this.#entry(this,{permission:'physical',physical,sources:[]},()=>{
   check();
   // Preserve the selected query's order and first error before any marker
   // write. A consumed visit can only repair its guard, never release it.
   if(!registry.host.inCave&&!definition.special){
    const field=sim.crusadeField;check();let spent=false;
    if(field){const fn=field.crusadeOn;check();if(sim.crusadeField!==field)throw Error('Native Crusade selected field changed');const info=Reflect.apply(fn,field,[definition.id]);check();if(sim.crusadeField!==field)throw Error('Native Crusade selected field changed');if(info){const id=own<string>(info,'crusadeId'),epoch=Reflect.apply(this.#epoch,field,[id]);check();if(!epoch||sim.crusadeField!==field)throw Error('Native Crusade query lost its actual event');spent=this.#hasSpent(field,id,epoch);}}
    if(this.#visitConsumed||spent){this.#visitConsumed=true;if(!Reflect.apply(Set.prototype.has,marker,[definition.id])){const selected=marker.add;check();Reflect.apply(selected,marker,[definition.id]);check();}}
   }
   const fn=registry.materializeLiveZoneEvents;check();Reflect.apply(fn,registry,[]);check();
  });}finally{this.#liveCheck=undefined;this.#busy=false;}
 }
}
