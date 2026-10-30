/** Actual leave-time memory effects, separate from pure save observation. */
import {sceneCaptureZoneMemory,type NativeSceneDepartureMemoryHost} from '../engine/nativeSceneDepartureMemory';
import {NativeAreaSceneMemory} from './nativeAreaSceneMemory';
import {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import {isNativeAreaSceneCombat} from './nativeAreaSceneCombat';
const owners=new WeakSet<NativeAreaSceneOngoing>();
export class NativeAreaSceneDepartureMemory {
 readonly ongoing:NativeAreaSceneOngoing;readonly memory:NativeAreaSceneMemory;readonly host:NativeSceneDepartureMemoryHost;
 adoptedZonePending=false;forgetMemoryOnLeave=false;
 constructor(ongoing:NativeAreaSceneOngoing,memory:NativeAreaSceneMemory){
  if(!(ongoing instanceof NativeAreaSceneOngoing)||!isNativeAreaSceneCombat(ongoing.combat)||!(memory instanceof NativeAreaSceneMemory)||memory.assembly!==ongoing.assembly||memory.authority!==ongoing.authority||owners.has(ongoing))throw Error('Native departure memory needs its one actual area and memory owner');
  this.ongoing=ongoing;this.memory=memory;const self=this,assembly=ongoing.assembly,campaign=ongoing.combat.input.campaign;
  if(ongoing.combat.input.assembly!==assembly||ongoing.authority.campaign!==campaign||assembly.input.registry.input.birth.input.campaign!==campaign)throw Error('Native departure memory roots differ');
  const host:NativeSceneDepartureMemoryHost={
   get adoptedZonePending(){return self.adoptedZonePending;},set adoptedZonePending(value){self.adoptedZonePending=value;},
   get forgetMemoryOnLeave(){return self.forgetMemoryOnLeave;},set forgetMemoryOnLeave(value){self.forgetMemoryOnLeave=value;},
   get zone(){return assembly.input.scene.zone;},get zoneMemory(){return campaign.zoneMemory;},
   get ritualSite(){return assembly.input.registry.input.birth.input.state.ritualSite;},get sim(){return campaign.sim;},get ledger(){return campaign.ledger;},
   get zoneMemorySnapshot(){const owner=memory,fn=owner.snapshot;return()=>Reflect.apply(fn,owner,[]);},
   get actorById(){const owner=assembly.input.registry.input.birth,fn=owner.actorById;return(...args:Parameters<typeof fn>)=>Reflect.apply(fn,owner,args);},
  };
  this.host=Object.freeze(host);for(const key of ['ongoing','memory','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});owners.add(ongoing);
 }
 /** Coordinator-only selection preserves the direct native owner contract above. */
 captureConclaveDeparture():void {this.memory.assertReady();this.ongoing.authority.assertFinalPhysical(this.ongoing.binding);this.ongoing.combat.conclaveLifetime.capture(this);}
 captureZoneMemory():void {this.memory.assertReady();this.ongoing.authority.assertFinalPhysical(this.ongoing.binding);sceneCaptureZoneMemory(this.host);}
}
