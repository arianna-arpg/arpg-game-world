/** Identity-based authority for retained scenes. Coordinate overlap is never ownership. */
import type {Actor} from '../engine/actor';
import type {Seat} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
export interface NativeAreaAuthorityBinding<S extends object> {readonly scene:NativeSceneCensus;readonly services:S}
export type NativeAreaAuthorityOwner<S extends object>=Readonly<S & {scene:NativeSceneCensus}>;
/** A nominal result of one actual campaign seat read, never source-effect authority. */
export interface NativeAreaActorSelection<S extends object> {readonly actor:Actor;readonly physical:Actor;readonly owner:NativeAreaAuthorityOwner<S>;readonly binding:NativeAreaAuthorityBinding<S>}
function finalOwn(value:object,key:PropertyKey):unknown {const d=Object.getOwnPropertyDescriptor(value,key);if(!d)return undefined;if(!Object.hasOwn(d,'value'))throw Error('Native final authority requires ordinary own data: '+String(key));return d.value;}
function finalArray(value:unknown):readonly unknown[]{if(!Array.isArray(value))throw Error('Native final authority requires a raw array');const length=finalOwn(value,'length');if(typeof length!=='number')throw Error('Native final authority needs an array length');for(let i=0;i<length;i++)if(!Object.getOwnPropertyDescriptor(value,i)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,i)!,'value'))throw Error('Native final authority refuses accessor or sparse census');return value;}
export class NativeAreaActorAuthority<S extends object> {
 readonly campaign:{readonly seats:readonly Seat[]};
 #bindings=new Map<NativeAreaAuthorityBinding<S>,{owner:NativeAreaAuthorityOwner<S>;actors:Set<Actor>}>();
 #scenes=new Map<NativeSceneCensus,NativeAreaAuthorityBinding<S>>();
 #actors=new WeakMap<Actor,NativeAreaAuthorityBinding<S>>();
 #attendance=new WeakMap<Actor,number>();
 #attendanceSerial=0;
 #retired=false;
 #assertLive():void {if(this.#retired)throw Error('Native actor authority is retired');}
 /** Revoke every binding and selection, including a partially prepared area. */
 retire():void {this.#assertLive();this.#retired=true;this.#bindings.clear();this.#scenes.clear();this.#actors=new WeakMap();this.#attendance=new WeakMap();this.#selections=new WeakMap();}
 #selections=new WeakMap<NativeAreaActorSelection<S>,{seat:Seat|null;seats:readonly unknown[]}>();
 constructor(campaign:{readonly seats:readonly Seat[]}){this.campaign=campaign;Object.defineProperty(this,'campaign',{writable:false,configurable:false});}
 register(scene:NativeSceneCensus,services:S):NativeAreaAuthorityBinding<S>{
  this.#assertLive();
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
 assertUnclaimed(actor:Actor):void{this.#assertLive();if(this.#actors.has(actor))throw Error('Native actor already has physical authority');}
 claim(binding:NativeAreaAuthorityBinding<S>,actors:readonly Actor[]):void{
  const entry=this.#entry(binding);if(new Set(actors).size!==actors.length)throw Error('Repeated actor in native authority claim');
  for(const actor of actors){if(!binding.scene.actors.includes(actor))throw Error('Native authority claim needs actual scene membership');const prior=this.#actors.get(actor);if(prior&&prior!==binding)throw Error('Native actor already belongs to another area');}
  for(const actor of actors){if(this.#actors.get(actor)!==binding)this.#attendance.set(actor,++this.#attendanceSerial);this.#actors.set(actor,binding);entry.actors.add(actor);}
 }
 /** Final admission primitive for an already validated ordinary cohort. All
  * membership/ownership checks finish before any claim; no selected raw-array
  * methods, iterators, campaign reads or instance callbacks execute here. */
 claimFinal(binding:NativeAreaAuthorityBinding<S>,actors:readonly Actor[]):void {
  const entry=this.#entry(binding);if(this.#scenes.get(binding.scene)!==binding)throw Error('Stale native final claim binding');
  const census=finalArray(finalOwn(binding.scene,'actors')),requested=finalArray(actors),members=new Set<unknown>(),seen=new Set<unknown>();
  for(let i=0;i<census.length;i++){const actor=finalOwn(census,i);if(members.has(actor))throw Error('Repeated native body in final claim census');members.add(actor);}
  for(let i=0;i<requested.length;i++){const actor=finalOwn(requested,i) as Actor;if(!actor||typeof actor!=='object'||seen.has(actor))throw Error('Repeated or invalid native final claim body');seen.add(actor);if(!members.has(actor))throw Error('Native final claim needs actual scene membership');const prior=this.#actors.get(actor);if(prior&&prior!==binding)throw Error('Native actor already belongs to another area');}
  for(let i=0;i<requested.length;i++){const actor=finalOwn(requested,i) as Actor;if(this.#actors.get(actor)!==binding)this.#attendance.set(actor,++this.#attendanceSerial);this.#actors.set(actor,binding);entry.actors.add(actor);}
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
  this.#assertLive();
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
 /** Numeric ledger keys span every registered physical census in this campaign.
  * No alive/seat/lineage filter: the native expiry caller decides dead pruning.
  * Ambiguous IDs refuse instead of silently choosing an arbitrary area. */
 physicalActorById(id:number):Actor|undefined {
  this.#assertLive();
  const cohort=[...this.#bindings.keys()];let found:Actor|undefined;
  for(const binding of cohort){this.#entry(binding);this.assertAdmitted(binding.scene);}
  for(const binding of cohort)for(const actor of binding.scene.actors)if(actor.id===id){if(found&&found!==actor)throw Error('Ambiguous native physical actor ID');found=actor;}
  if(cohort.length!==this.#bindings.size||cohort.some(binding=>!this.#bindings.has(binding)))throw Error('Native physical census changed during lookup');
  for(const binding of cohort)this.assertAdmitted(binding.scene);
  if(found){const binding=this.#actors.get(found);if(!binding||!cohort.includes(binding)||!binding.scene.actors.includes(found))throw Error('Stale native physical actor lookup');}
  return found;
 }
 /** Select actual physical or explicitly allowed carried bodies after campaign
  * callbacks. Call assertFinalSelections immediately before native effects. */
 selectActors(actors:readonly Actor[],allowCarried=false):readonly NativeAreaActorSelection<S>[] {
  this.#assertLive();
  const seats=finalArray(this.campaign.seats),selected:NativeAreaActorSelection<S>[]=[];
  for(const actor of actors){let body=actor,seat:Seat|null=null;
   if(allowCarried){for(const candidate of seats){if(!candidate||typeof candidate!=='object')throw Error('Native authority needs actual seat objects');const home=finalOwn(candidate,'home'),controlled=finalOwn(candidate,'actor');if(home!==actor||controlled===actor)continue;if(!controlled||typeof controlled!=='object')throw Error('Native carried authority needs an actual body');const possession=finalOwn(controlled,'possession');if(!possession||typeof possession!=='object'||finalOwn(possession,'huskMode')!=='carried')continue;if(seat)throw Error('Ambiguous carried hero authority');if(finalOwn(possession,'seatId')!==finalOwn(candidate,'id'))throw Error('Stale carried hero authority');seat=candidate as Seat;body=controlled as Actor;}}
   const binding=this.#actors.get(body);if(!binding)throw Error('Missing native actor authority');const owner=this.#entry(binding).owner;
   const row=Object.freeze({actor,physical:body,owner,binding});this.#selections.set(row,{seat,seats});selected.push(row);
  }
  this.assertFinalSelections(selected);return Object.freeze(selected);
 }
 /** Callback-free last validation for ordinary own-data scenes, seats and raw
  * census arrays. It deliberately does not consult caller-selected includes,
  * iterators, campaign getters or actor methods. No Proxy/intrinsic sandbox. */
 assertFinalPhysical(binding:NativeAreaAuthorityBinding<S>,actors:readonly Actor[]=[]):void {
  const entry=this.#entry(binding);if(this.#scenes.get(binding.scene)!==binding)throw Error('Stale native final scene binding');
  const census=finalArray(finalOwn(binding.scene,'actors')),seen=new Set<unknown>();
  for(let i=0;i<census.length;i++){const actor=finalOwn(census,i) as Actor;if(seen.has(actor))throw Error('Repeated native body in admitted census');seen.add(actor);if(this.#actors.get(actor)!==binding||!entry.actors.has(actor))throw Error('Native area admission contains an unowned or borrowed body');}
  const requested=finalArray(actors);for(let i=0;i<requested.length;i++){const actor=finalOwn(requested,i) as Actor;if(!seen.has(actor)||this.#actors.get(actor)!==binding)throw Error('Stale native final physical actor');}
 }
 /** Validate only named bodies already claimed by this area during native birth.
  * Pending population in the census receives no authority through this check. */
 assertFinalClaimed(binding:NativeAreaAuthorityBinding<S>,actors:readonly Actor[]):void {
  const entry=this.#entry(binding);if(this.#scenes.get(binding.scene)!==binding)throw Error('Stale native claimed scene binding');
  const census=finalArray(finalOwn(binding.scene,'actors')),members=new Set<unknown>();
  for(let i=0;i<census.length;i++){const actor=finalOwn(census,i);if(members.has(actor))throw Error('Repeated native body in claimed census');members.add(actor);}
  const requested=finalArray(actors),seen=new Set<unknown>();for(let i=0;i<requested.length;i++){const actor=finalOwn(requested,i) as Actor;if(seen.has(actor)||!members.has(actor)||this.#actors.get(actor)!==binding||!entry.actors.has(actor))throw Error('Stale native final claimed actor');seen.add(actor);}
 }
 /** Immediate native insertion: only the named fresh body may be unclaimed.
  * The invoking private birth/carried receipt supplies provenance. */
 claimInserted(binding:NativeAreaAuthorityBinding<S>,body:Actor,physical:readonly Actor[]=[]):void {
  const entry=this.#entry(binding);if(this.#scenes.get(binding.scene)!==binding||this.#actors.has(body))throw Error('Native insertion needs its exact fresh binding');
  const census=finalArray(finalOwn(binding.scene,'actors')),seen=new Set<unknown>();let inserted=false;
  for(let i=0;i<census.length;i++){const actor=finalOwn(census,i) as Actor;if(seen.has(actor))throw Error('Repeated native body in admitted census');seen.add(actor);if(actor===body){inserted=true;continue;}if(this.#actors.get(actor)!==binding||!entry.actors.has(actor))throw Error('Native insertion contains another unowned or borrowed body');}
  if(!inserted)throw Error('Native insertion needs its actual inserted body');const requested=finalArray(physical);for(let i=0;i<requested.length;i++){const actor=finalOwn(requested,i) as Actor;if(actor===body||!seen.has(actor)||this.#actors.get(actor)!==binding)throw Error('Native insertion needs the actual local physical relation');}
  this.#actors.set(body,binding);entry.actors.add(body);this.#attendance.set(body,++this.#attendanceSerial);
 }
 assertFinalSelections(rows:readonly NativeAreaActorSelection<S>[]):void {
  const all=finalArray(rows);for(let i=0;i<all.length;i++){const row=finalOwn(all,i) as NativeAreaActorSelection<S>,capture=this.#selections.get(row);if(!capture)throw Error('Foreign native actor selection');if(this.#entry(row.binding).owner!==row.owner)throw Error('Stale native selected owner');
   this.assertFinalPhysical(row.binding,[row.physical]);
   if(capture.seat){const seat=capture.seat;let member=false;for(let j=0;j<capture.seats.length;j++)if(finalOwn(capture.seats,j)===seat)member=true;if(!member||finalOwn(seat,'home')!==row.actor||finalOwn(seat,'actor')!==row.physical)throw Error('Stale native carried hero selection');const possession=finalOwn(row.physical,'possession');if(!possession||typeof possession!=='object'||finalOwn(possession,'huskMode')!=='carried'||finalOwn(possession,'seatId')!==finalOwn(seat,'id'))throw Error('Stale native carried hero selection');}
   else if(row.actor!==row.physical)throw Error('Foreign native physical selection');
  }
 }
 /** The area representative is a credential only while this exact body is
  * physically admitted here. No campaign getter, actor method or peer substitute. */
 isPresentActor(scene:NativeSceneCensus,actor:Actor):boolean {
  const binding=this.#scenes.get(scene);if(!binding)throw Error('Unregistered native physical attendance');
  Reflect.apply(finalPhysicalAttendance,this,[binding]);if(this.#actors.get(actor)!==binding)return false;
  const census=finalArray(finalOwn(scene,'actors'));for(let i=0;i<census.length;i++)if(finalOwn(census,i)===actor)return true;return false;
 }
 physicalSeats(scene:NativeSceneCensus):Seat[] {
  this.#assertLive();
  const seats=finalArray(this.campaign.seats),binding=this.#scenes.get(scene);if(!binding)throw Error('Unregistered native physical seat cohort');
  const selected:Seat[]=[];for(let i=0;i<seats.length;i++){const seat=finalOwn(seats,i);if(!seat||typeof seat!=='object')throw Error('Native physical seats need actual own-data seats');const actor=finalOwn(seat,'actor') as Actor;if(this.#actors.get(actor)===binding)selected.push(seat as Seat);}
  Reflect.apply(finalPhysicalAttendance,this,[binding]);const census=finalArray(finalOwn(scene,'actors'));
  return selected.filter(seat=>{const actor=finalOwn(seat,'actor');for(let i=0;i<census.length;i++)if(finalOwn(census,i)===actor)return true;return false;});
 }
 isPresentPlayer(scene:NativeSceneCensus):boolean {
  const binding=this.#scenes.get(scene);if(!binding)throw Error('Unregistered native player attendance');
  Reflect.apply(finalPhysicalAttendance,this,[binding]);const player=finalOwn(scene,'player') as Actor;
  if(this.#actors.get(player)!==binding)return false;
  const census=finalArray(finalOwn(scene,'actors'));for(let i=0;i<census.length;i++)if(finalOwn(census,i)===player)return true;return false;
 }
 seatsFor(binding:NativeAreaAuthorityBinding<S>):Seat[]{
  this.#entry(binding);
  // Presence follows the controlled body; keeper/merc/dead and party policies
  // remain the native callers' responsibility, not new rules in this directory.
  return this.campaign.seats.filter(s=>this.#actors.get(s.actor)===binding&&binding.scene.actors.includes(s.actor));
 }
}

const finalPhysicalAttendance=NativeAreaActorAuthority.prototype.assertFinalPhysical;
