/** Per-visit admission for native writs, preserving genuine surviving cohorts. */
import type {Actor} from '../engine/actor';
import type {ZoneDef} from '../data/zones';
import {bindNativeVendettaIdentity,type NativeVendettaRegistration} from '../engine/nativeVendettaIdentity';
import {nativeVendettaLifetimeCalls,type VendettaField,type AmbushSpec} from '../packages/overlays/vendetta';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';
import {nativeReadyAuthority,nativeUnclaimedActor} from './nativeAreaActorAuthority';
import {selectedNativeVendettaArrival} from './nativeAreaSceneTransitionCoordinator';
const registrations=new WeakMap<object,NativeVendettaRegistration>();
/** Consumes only a private one-use token issued by the actual owner below. */
export function consumeNativeVendettaRegistration(token:object):NativeVendettaRegistration {const r=registrations.get(token);if(!r)throw Error('Native Vendetta needs its private actual-owner registration');registrations.delete(token);return r;}
const includes=Array.prototype.includes,has=Set.prototype.has;
function own<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native Vendetta needs ordinary owned '+String(key));return d.value as T;}
function rows(actors:Actor[]):Actor[]{const result:Actor[]=[];for(let i=0,n=own<number>(actors,'length');i<n;i++)result.push(own<Actor>(actors,i));return result;}
interface Cohort {field:VendettaField;definition:ZoneDef;id:string;bodies:Actor[]}
interface Placement {field:VendettaField;definition:ZoneDef;id:string;actors:Actor[];marker:Set<string>;initial:boolean;cohort:Cohort}
export class NativeAreaSceneVendettaLifetime {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #definition:ZoneDef;
 readonly #visits=new WeakSet<object>();readonly #cohorts:Cohort[]=[];#active:Placement|undefined;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native Vendetta needs its actual combat owner');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#definition=combat.scene.zone;
  const token=Object.freeze({});registrations.set(token,{host:combat.input.assembly.input.registry.input.birth.host,place:(field,definition,spec,run)=>this.#place(field,definition,spec,run),create:select=>this.#create(select)});bindNativeVendettaIdentity(token);
 }
 #current(field:VendettaField,id:string):boolean {return Reflect.apply(nativeVendettaLifetimeCalls.view,field,[]).some(row=>row.id===id);}
 #check(p:Placement):void {
  const c=this.#combat;if(this.#active!==p||c.scene.zone!==p.definition||p.definition!==this.#definition||c.scene.actors!==p.actors||c.input.campaign.sim.vendettaField!==p.field||c.input.assembly.input.registry.input.birth.input.state.materializedWrits!==p.marker||!this.#current(p.field,p.id))throw Error('Native Vendetta selected event or owner changed');
  if(p.initial){if(c.input.assembly.phase!=='birthing')throw Error('Native Vendetta initial placement escaped actual birth');}
  else this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{const binding=Reflect.apply(nativeReadyAuthority.binding,c.input.authority,[c.scene]);Reflect.apply(nativeReadyAuthority.physical,c.input.authority,[binding]);});
 }
 /** Forget only completed physical retirements. Claimed absent bodies stay
  * conservative: another area may own them, or a raw splice may be incomplete. */
 #prune(actors:Actor[]):void {
  if(!this.#cohorts.length)return;
  const c=this.#combat,scene=c.scene,authority=c.input.authority;
  const validate=()=>{if(c.scene!==scene||scene.zone!==this.#definition||scene.actors!==actors||c.input.authority!==authority)throw Error('Native Vendetta cleanup owner changed');const binding=Reflect.apply(nativeReadyAuthority.binding,authority,[scene]);Reflect.apply(nativeReadyAuthority.physical,authority,[binding]);};
  validate();const members=rows(actors),plan:{cohort:Cohort;bodies:Actor[]}[]=[];
  for(const cohort of this.#cohorts){const bodies:Actor[]=[];for(const body of cohort.bodies){
   if(Reflect.apply(includes,members,[body])){bodies.push(body);continue;}
   try{Reflect.apply(nativeUnclaimedActor,authority,[body]);}catch(error){try{validate();}catch{throw error;}bodies.push(body);}
  }if(bodies.length)plan.push({cohort,bodies});}
  validate();let kept=0;for(const row of plan){row.cohort.bodies.length=0;for(const body of row.bodies)row.cohort.bodies.push(body);this.#cohorts[kept++]=row.cohort;}this.#cohorts.length=kept;
 }
 #sameLive(p:Placement):boolean {
  const population=this.#combat.input.assembly.input.population;
  for(const cohort of this.#cohorts){if(cohort.field!==p.field||cohort.definition!==p.definition||cohort.id!==p.id)continue;
   for(const body of cohort.bodies)if(Reflect.apply(includes,p.actors,[body])&&!own<boolean>(body,'dead')){if(!Reflect.apply(nativePopulationFactoryOwner,population,[body]))throw Error('Native Vendetta cohort lost its actual factory');return true;}
  }return false;
 }
 #place(field:VendettaField,definition:ZoneDef,spec:AmbushSpec,run:()=>void):void {
  if(this.#active)throw Error('Native Vendetta placement cannot reenter');const c=this.#combat,id=own<string>(spec,'writId'),cohort:Cohort={field,definition,id,bodies:[]},p:Placement={field,definition,id,cohort,actors:c.scene.actors,marker:c.input.assembly.input.registry.input.birth.input.state.materializedWrits,initial:c.input.assembly.phase==='birthing'};this.#active=p;
  try{this.#check(p);if(!p.initial)this.#prune(p.actors);if(this.#sameLive(p)){this.#check(p);return;}this.#cohorts.push(cohort);run();this.#check(p);}finally{this.#active=undefined;}
 }
 #create(select:()=>()=>Actor):Actor {
  const p=this.#active;if(!p)throw Error('Native Vendetta creation needs its selected native placement');this.#check(p);const before=rows(p.actors),run=select();this.#check(p);const body=run();this.#check(p);
  if(before.includes(body)||!Reflect.apply(includes,p.actors,[body])||!Reflect.apply(nativePopulationFactoryOwner,this.#combat.input.assembly.input.population,[body]))throw Error('Native Vendetta needs a new actual factory insertion');
  p.cohort.bodies.push(body);return body;
 }
 /** Only an actual unoccupied warm return starts a new visit. Field rolls,
  * cooldown writes and native partial births still occur in their original order. */
 arrive():void {
  const c=this.#combat,selection=selectedNativeVendettaArrival(c.input.coordinator,c);if(selection.occupied||this.#visits.has(selection.token))return;
  const scene=c.scene,definition=this.#definition,actors=scene.actors,birth=c.input.assembly.input.registry.input.birth,marker=birth.input.state.materializedWrits,field=c.input.campaign.sim.vendettaField;
  const check=()=>{const current=selectedNativeVendettaArrival(c.input.coordinator,c);if(current.token!==selection.token||current.occupied||c.scene!==scene||scene.zone!==definition||scene.actors!==actors||birth.input.state.materializedWrits!==marker||c.input.campaign.sim.vendettaField!==field)throw Error('Native Vendetta selected arrival changed');};
  this.#entry(this,{permission:'physical',physical:[],sources:[]},()=>{
   check();this.#prune(actors);const selectedDelete=marker.delete;check();let failed=false;
   try{Reflect.apply(selectedDelete,marker,[definition.id]);}catch(error){failed=true;throw error;}finally{if(!Reflect.apply(has,marker,[definition.id]))this.#visits.add(selection.token);if(failed){try{check();}catch{ /* Preserve the native callback error and completed marker effect. */ }}else check();}
   if(Reflect.apply(has,marker,[definition.id]))throw Error('Native Vendetta selected guard was not released');
   const selected=birth.springVendettaAmbush;check();Reflect.apply(selected,birth,[definition]);check();
  });
 }
}
