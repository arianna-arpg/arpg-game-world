import {nativeVerminfallLiveRegistryActive} from './nativeAreaSceneVerminfallLifetime';
/** A retained area's garrison guard belongs to the actual campaign event.
 * Existing bodies/terrain survive. Repeated frames and native partial births cannot replay. */
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
interface Placement {definition:ZoneDef;field:CrusadeField;epoch:object;id:string;rewardMul:number;initial:boolean;marker:Set<string>;before:boolean}
interface Body extends Placement {body:Actor;spent:boolean}
export class NativeAreaSceneCrusadeLifetime {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;readonly #definition:ZoneDef;
 readonly #epoch=nativeCrusadeLifetimeCalls.epoch;readonly #resolve=nativeCrusadeLifetimeCalls.resolve;readonly #factory=NativeAreaScenePopulation.prototype.factoryOwnerOf;
 readonly #spent=new WeakSet<object>();#placement:Placement|undefined;#liveCheck:(()=>void)|undefined;#busy=false;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,hooks:NativeAreaCombatOwnerHooks){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native Crusade needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);assertNativeCombatOwnerHooks(combat,hooks);
  this.#combat=combat;this.#entry=entry;this.#hooks=hooks;this.#definition=combat.scene.zone;
  bind({host:combat.input.assembly.input.registry.input.birth.host,observer:{place:(info,run)=>this.#place(info,run),create:run=>this.#create(run)}});
 }
 #check(p:Placement):void {const c=this.#combat;if(c.scene.zone!==p.definition||c.input.campaign.sim.crusadeField!==p.field||Reflect.apply(this.#epoch,p.field,[p.id])!==p.epoch||c.input.assembly.input.registry.input.birth.input.state.materializedCrusades!==p.marker)throw Error('Native Crusade selected event changed');if(p.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Crusade initial placement escaped actual birth');}else{if(!this.#liveCheck)throw Error('Native Crusade placement needs actual live registry');this.#liveCheck();}}
 #place(info:CrusadeInfo,run:()=>void):void {
  if(this.#placement)throw Error('Native Crusade placement cannot reenter');const c=this.#combat,field=c.input.campaign.sim.crusadeField,id=own<string>(info,'crusadeId'),epoch=field&&Reflect.apply(this.#epoch,field,[id]);if(!field||!epoch)throw Error('Native Crusade placement needs its actual event');
  const marker=c.input.assembly.input.registry.input.birth.input.state.materializedCrusades,p:Placement={definition:this.#definition,field,epoch,id,rewardMul:own<number>(info,'rewardMul'),initial:c.input.assembly.phase==='birthing',marker,before:Reflect.apply(Set.prototype.has,marker,[this.#definition.id])};this.#placement=p;
  try{this.#check(p);if(this.#spent.has(epoch))return;run();this.#check(p);}
  finally{if(!p.before&&Reflect.apply(Set.prototype.has,marker,[p.definition.id]))this.#spent.add(epoch);this.#placement=undefined;}
 }
 #create(run:()=>Actor):Actor {const p=this.#placement;if(!p)return run();this.#check(p);const body=run();this.#check(p);if(!Reflect.apply(this.#factory,this.#combat.input.assembly.input.population,[body]))throw Error('Native Crusade needs actual population construction');const row:Body={...p,body,spent:false};bind({body,current:ctx=>this.#current(row,ctx),resolve:ctx=>this.#settle(row,ctx)});return body;}
 #current(row:Body,ctx:KillCtx):boolean {if(row.spent||ctx.actor!==row.body||ctx.zone!==row.definition||ctx.sim.crusadeField!==row.field||Reflect.apply(this.#epoch,row.field,[row.id])!==row.epoch)return false;return this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);return this.#combat.scene.zone===row.definition&&Reflect.apply(this.#epoch,row.field,[row.id])===row.epoch;});}
 #settle(row:Body,ctx:KillCtx):number {if(!this.#current(row,ctx))return 1;const field=row.field,fn=field.resolveCrusadeZone;if(!this.#current(row,ctx))return 1;row.spent=true;const check=()=>this.#entry(this,{permission:'physical',physical:[row.body]},()=>{this.#hooks.assertCombatKillContext(this,ctx);if(this.#combat.scene.zone!==row.definition||ctx.sim.crusadeField!==field)throw Error('Native Crusade kill owner changed');});return Reflect.apply(this.#resolve,field,[row.epoch,row.id,row.definition.id,row.rewardMul,check,()=>Reflect.apply(fn,field,[row.definition.id])]);}
 materializeLiveZoneEvents():void {
  // Existing direct callers enter the same outer event scope; the delegated call runs this registry body once.
  if(!nativeVerminfallLiveRegistryActive(this.#combat)){this.#combat.verminfallLifetime.materializeLiveZoneEvents();return;}
  if(this.#busy)throw Error('Native Crusade live registry cannot reenter');const c=this.#combat,registry=c.input.assembly.input.registry,census=own<Actor[]>(c.scene,'actors'),physical=rows(census),definition=this.#definition,sim=c.input.campaign.sim,marker=registry.input.birth.input.state.materializedCrusades;
  const check=()=>this.#entry(this,{permission:'physical',physical,sources:[]},()=>{if(own(c.scene,'zone')!==definition||own(c.scene,'actors')!==census||c.input.campaign.sim!==sim||registry.input.birth.input.state.materializedCrusades!==marker)throw Error('Native Crusade registry owner changed');});
  this.#busy=true;this.#liveCheck=check;
  try{this.#entry(this,{permission:'physical',physical,sources:[]},()=>{
   check();if(!registry.host.inCave&&!definition.special){const field=sim.crusadeField;check();if(field){const fn=field.crusadeOn;check();const info=Reflect.apply(fn,field,[definition.id]);check();if(info){const id=own<string>(info,'crusadeId'),epoch=Reflect.apply(this.#epoch,field,[id]);check();if(!epoch||sim.crusadeField!==field)throw Error('Native Crusade query lost its actual event');const consumed=this.#spent.has(epoch),present=Reflect.apply(Set.prototype.has,marker,[definition.id]);if(consumed!==present){const fn=consumed?marker.add:marker.delete;check();Reflect.apply(fn,marker,[definition.id]);check();}}}}
   const fn=registry.materializeLiveZoneEvents;check();Reflect.apply(fn,registry,[]);check();
  });}finally{this.#liveCheck=undefined;this.#busy=false;}
 }
}
