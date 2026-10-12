/** Retained-area memory registration on the genuine campaign character writer.
 * This grants no combat scheduling, scene publication, departure or retirement. */
import {isNativeWorld,type World} from '../engine/world';
import type {NativeZoneMemory} from '../engine/nativeSceneMemory';
import {NativeAreaSceneMemory} from './nativeAreaSceneMemory';
const registries=new WeakMap<World,NativeAreaMemoryRegistry>();
export function hasNativeAreaMemoryRegistry(writer:World):boolean{return registries.has(writer);}
export class NativeAreaMemoryRegistry {
 readonly writer:World;
 #owners=new Map<string,NativeAreaSceneMemory>();
 #capturing=false;
 #retired=false;
 assertRetirable():void {if(this.#capturing)throw Error('Native memory registry is capturing');}
 /** Cancellation discards registration, without capturing or writing a save. */
 retire():void {if(this.#capturing)throw Error('Native memory registry is capturing');if(this.#retired)return;this.#retired=true;this.#owners.clear();if(registries.get(this.writer)===this)registries.delete(this.writer);}
 constructor(writer:World){
  if(!isNativeWorld(writer))throw Error('Native memory registration needs the real character writer');
  if(registries.has(writer))throw Error('Native campaign already has a memory registry');
  this.writer=writer;Object.defineProperty(this,'writer',{writable:false,configurable:false});registries.set(writer,this);
 }
 #guard<T>(run:()=>T):T {
  if(this.#retired)throw Error('Native memory registry is retired');
  if(this.#capturing)throw Error('Native memory registry is capturing');
  this.#capturing=true;try{return run();}finally{this.#capturing=false;}
 }
 #assertCampaign(owner:NativeAreaSceneMemory):void{
  const input=owner.assembly.input,campaign=input.coast.input.campaign,w=this.writer;
  if(input.campaign.account!==w.account||campaign.sim!==w.sim||campaign.manifest!==w.manifest||campaign.zoneMap!==w.zoneMap||campaign.caveMap!==w.caveMap||campaign.zoneMemory!==w['zoneMemory']||campaign.visited!==w.visited||input.campaign.completedObjectives!==w.completedObjectives||campaign.time!==w.time)throw Error('Native memory owner belongs to a different or stale campaign writer');
  owner.assertReady();
  if(w.zone?.id===owner.id&&(w.zone!==owner.definition||w.inCave!==owner.inCave))throw Error('Native current memory definition or namespace differs');
 }
 register(owner:NativeAreaSceneMemory):void{
  this.#guard(()=>{
   if(!(owner instanceof NativeAreaSceneMemory))throw Error('Native memory registration needs its actual owner');
   this.#assertCampaign(owner);const prior=this.#owners.get(owner.id);
   if(prior&&prior!==owner)throw Error('Native area already has a different memory owner');this.#owners.set(owner.id,owner);
  });
 }
 /** Final pure capture only. Runtime departure and actor/controller retirement
  * must be separately established by their actual lifecycle owners. The current
  * writer area stays observed until the real writer has handed off its scene. */
 unregister(owner:NativeAreaSceneMemory):void{
  this.#guard(()=>{
   if(this.#owners.get(owner.id)!==owner)throw Error('Foreign native memory owner');
   this.#assertCampaign(owner);
   if(owner.id===this.writer.zone?.id)throw Error('Native current memory owner requires writer handoff before unregister');
   owner.captureLiveMemory();this.#owners.delete(owner.id);
  });
 }
 snapshot(zoneId:string):{memory:NativeZoneMemory|null}|undefined{
  return this.#guard(()=>{const owner=this.#owners.get(zoneId);if(!owner)return;this.#assertCampaign(owner);return {memory:owner.snapshot()};});
 }
 /** Replace each successful row immediately, just like native captureLiveMemory.
  * A later failure retains earlier captures and refuses the character write. */
 captureAll():ReadonlyMap<string,NativeZoneMemory|null>{
  return this.#guard(()=>{
   const cohort=[...this.#owners],captured=new Map<string,NativeZoneMemory|null>();
   for(const [id,owner] of cohort){if(id!==owner.id)throw Error('Native memory registry key differs');this.#assertCampaign(owner);const memory=owner.snapshot();if(memory)this.writer['zoneMemory'].set(id,memory);captured.set(id,memory);}return captured;
  });
 }
}
export function nativeAreaMemorySnapshot(writer:World):{memory:NativeZoneMemory|null}|undefined{const registry=registries.get(writer);if(!registry)return;const zone=writer.zone;return zone?registry.snapshot(zone.id):undefined;}
export function captureNativeAreaMemories(writer:World):ReadonlyMap<string,NativeZoneMemory|null>|undefined{return registries.get(writer)?.captureAll();}
