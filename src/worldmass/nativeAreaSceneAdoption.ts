/** Local adoption over the complete installed native registry. This is a read
 * service: the caller retains the native working definition and applies the
 * returned stamp at the original birth position. Campaign and fracture state
 * are required live authorities, not snapshots or a standing World facade. */
import {maybeAdoptObjective,type ObjectiveReadContext} from '../data/objectives';
import type {GeneratedLayout} from '../engine/levelgen';
import type {World,FractureRun} from '../engine/world';
import type {NativeSceneActorContext,NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
export interface NativeSceneAdoptionState { fractureRun:FractureRun|null }
export interface NativeSceneAdoptionInput {
 scene:NativeSceneActorContext;
 geometry:Pick<NativeAreaSceneGeometry,'state'|'exits'>;
 campaign:{readonly sim:Pick<World['sim'],'fractureField'|'holdfastField'>};
 state:NativeSceneAdoptionState;
}
export class NativeAreaSceneAdoption {
 readonly input:NativeSceneAdoptionInput;
 readonly context:ObjectiveReadContext;
 constructor(raw:NativeSceneAdoptionInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','campaign','state']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native adoption needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneAdoptionInput=this.input=Object.freeze(roots);
  const state=Object.getOwnPropertyDescriptor(input.geometry,'state');
  if(!state||!Object.hasOwn(state,'value')||state.value!==input.scene)throw Error('Native adoption needs identical scene and geometry owners');
  if(!Object.hasOwn(input.state,'fractureRun'))throw Error('Native adoption needs explicit live fracture state');
  this.context=Object.freeze({
   get sim(){return input.campaign.sim;},
   get exits(){return input.geometry.exits;},
   fractureView(){return input.state.fractureRun;},
  });
  Object.defineProperty(this,'input',{value:input,enumerable:false,writable:false,configurable:false});
  Object.defineProperty(this,'context',{value:this.context,enumerable:false,writable:false,configurable:false});
 }
 maybeAdoptObjective(def:NativeSceneActorContext['zone'],layout:Pick<GeneratedLayout,'doodads'|'landmarkSpawns'>){
  if(def!==this.input.scene.zone)throw Error('Native adoption needs the owning scene definition');
  return maybeAdoptObjective(def,layout,this.context);
 }
}
