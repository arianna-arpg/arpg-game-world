/** Identity-based authority for retained scenes. Coordinate overlap is never ownership. */
import type {Actor} from '../engine/actor';
import type {Seat} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
export interface NativeAreaAuthorityBinding<S extends object> {readonly scene:NativeSceneCensus;readonly services:S}
export type NativeAreaAuthorityOwner<S extends object>=Readonly<S & {scene:NativeSceneCensus}>;
export class NativeAreaActorAuthority<S extends object> {
 readonly campaign:{readonly seats:readonly Seat[]};
 #bindings=new Map<NativeAreaAuthorityBinding<S>,{owner:NativeAreaAuthorityOwner<S>;actors:Set<Actor>}>();
 #scenes=new Map<NativeSceneCensus,NativeAreaAuthorityBinding<S>>();
 #actors=new WeakMap<Actor,NativeAreaAuthorityBinding<S>>();
 #attendance=new WeakMap<Actor,number>();
 #attendanceSerial=0;
 constructor(campaign:{readonly seats:readonly Seat[]}){this.campaign=campaign;Object.defineProperty(this,'campaign',{writable:false,configurable:false});}
 register(scene:NativeSceneCensus,services:S):NativeAreaAuthorityBinding<S>{
  if(!scene||!Array.isArray(scene.actors)||!services||typeof services!=='object')throw Error('Native area authority needs real scene and services');
  if(this.#scenes.has(scene))throw Error('Native scene already has an authority binding');
  if(Object.hasOwn(services,'scene'))throw Error('Native authority services cannot replace the scene');
  const stable=Object.create(null),owner=Object.create(null);
  for(const key of Reflect.ownKeys(services)){
   const d=Object.getOwnPropertyDescriptor(services,key)!;
   if(!Object.hasOwn(d,'value'))throw Error('Native authority needs stable own service bindings');
   Object.defineProperty(stable,key,{value:d.value,enumerable:true});
   Object.defineProperty(owner,key,{value:d.value,enumerable:true});
  }
  Object.defineProperty(owner,'scene',{value:scene,enumerable:true});
  const binding=Object.freeze({scene,services:Object.freeze(stable) as S});
  this.#bindings.set(binding,{owner:Object.freeze(owner),actors:new Set()});this.#scenes.set(scene,binding);return binding;
 }
 #entry(binding:NativeAreaAuthorityBinding<S>){const entry=this.#bindings.get(binding);if(!entry)throw Error('Foreign or retired native area authority');return entry;}
 bindingFor(scene:NativeSceneCensus):NativeAreaAuthorityBinding<S>{
  const binding=this.#scenes.get(scene);if(!binding)throw Error('Unregistered native scene authority');this.#entry(binding);return binding;
 }
 /** Absence from this authority's exact physical bindings only; not a census scan. */
 assertUnclaimed(actor:Actor):void{if(this.#actors.has(actor))throw Error('Native actor already has physical authority');}
 claim(binding:NativeAreaAuthorityBinding<S>,actors:readonly Actor[]):void{
  const entry=this.#entry(binding);if(new Set(actors).size!==actors.length)throw Error('Repeated actor in native authority claim');
  for(const actor of actors){if(!binding.scene.actors.includes(actor))throw Error('Native authority claim needs actual scene membership');const prior=this.#actors.get(actor);if(prior&&prior!==binding)throw Error('Native actor already belongs to another area');}
  for(const actor of actors){if(this.#actors.get(actor)!==binding)this.#attendance.set(actor,++this.#attendanceSerial);this.#actors.set(actor,binding);entry.actors.add(actor);}
 }
 /** Called after a physical handoff. The destination must already contain the
  * exact body. Shared borrowed census entries never transfer authority implicitly. */
 transfer(actor:Actor,from:NativeAreaAuthorityBinding<S>,to:NativeAreaAuthorityBinding<S>):void{
  const old=this.#entry(from),next=this.#entry(to);
  if(this.#actors.get(actor)!==from)throw Error('Native authority transfer has a stale source');
  if(!to.scene.actors.includes(actor))throw Error('Native authority transfer needs destination membership');
  if(from===to)return;
  this.#actors.set(actor,to);old.actors.delete(actor);next.actors.add(actor);this.#attendance.set(actor,++this.#attendanceSerial);
 }
 release(binding:NativeAreaAuthorityBinding<S>,actors:readonly Actor[]):void{
  const entry=this.#entry(binding);
  for(const actor of actors)if(this.#actors.get(actor)!==binding)throw Error('Cannot release another native area actor');
  for(const actor of actors){if(this.#actors.get(actor)===binding){this.#actors.delete(actor);entry.actors.delete(actor);this.#attendance.set(actor,++this.#attendanceSerial);}}
 }
 unregister(binding:NativeAreaAuthorityBinding<S>):void{
  const entry=this.#entry(binding);if(entry.actors.size)throw Error('Release native area actors before retiring authority');
  this.#bindings.delete(binding);this.#scenes.delete(binding.scene);
 }
 require(actor:Actor):NativeAreaAuthorityOwner<S>{
  // Carried shapeshift husks deliberately leave the census. Their exact live
  // seat/body relationship supplies authority, never a matching id or position.
  const carried=this.campaign.seats.filter(s=>s.home===actor&&s.actor!==actor&&s.actor.possession?.huskMode==='carried');
  if(carried.length>1)throw Error('Ambiguous carried hero authority');
  if(carried.length===1){
   if(carried[0].actor.possession?.seatId!==carried[0].id)throw Error('Stale carried hero authority');
   return this.#physical(carried[0].actor);
  }
  return this.#physical(actor);
 }
 /** Physical ownership changes invalidate dwells even across an unobserved round trip. */
 attendanceRevision(actor:Actor):number {
  this.require(actor); // Validate exact membership and carried-body identity first.
  const carried=this.campaign.seats.find(s=>s.home===actor&&s.actor!==actor&&s.actor.possession?.huskMode==='carried');
  return this.#attendance.get(carried?.actor??actor)!;
 }
 #physical(actor:Actor):NativeAreaAuthorityOwner<S>{
  const binding=this.#actors.get(actor);if(!binding)throw Error('Missing native actor authority');
  const entry=this.#entry(binding);if(!binding.scene.actors.includes(actor))throw Error('Stale native actor authority');return entry.owner;
 }
 /** Admission retains one mutable physical census. Preparation-time borrowed
  * observers must be removed explicitly before gameplay can mutate this scene. */
 assertAdmitted(scene:NativeSceneCensus):void{
  const binding=this.#scenes.get(scene);if(!binding)throw Error('Unregistered native area admission');
  this.#entry(binding);
  if(new Set(scene.actors).size!==scene.actors.length)throw Error('Repeated native body in admitted census');
  for(const actor of scene.actors)if(this.#actors.get(actor)!==binding)throw Error('Native area admission contains an unowned or borrowed body');
 }
 seatsFor(binding:NativeAreaAuthorityBinding<S>):Seat[]{
  this.#entry(binding);
  // Presence follows the controlled body; keeper/merc/dead and party policies
  // remain the native callers' responsibility, not new rules in this directory.
  return this.campaign.seats.filter(s=>this.#actors.get(s.actor)===binding&&binding.scene.actors.includes(s.actor));
 }
}
