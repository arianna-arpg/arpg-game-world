/** Native tether construction over one area's actual queue. Ticking, crossing,
 * damage and detached/staged endpoint lifetimes remain separate runtime work. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {sceneAddTether,sceneAttachObjectTethers,type NativeSceneTetherHost} from '../engine/nativeSceneTethers';
export interface NativeSceneTetherState {tethers:World['tethers']}
export function freshSceneTetherState():NativeSceneTetherState{return {tethers:[]};}
export interface NativeSceneTetherRuntime {readonly tethers:NativeAreaSceneTethers}
export type NativeSceneTetherAuthority=Pick<NativeAreaActorAuthority<NativeSceneTetherRuntime>,'campaign'|'require'|'assertAdmitted'>;
export interface NativeAreaSceneTetherInput {
 scene:NativeSceneCensus;
 campaign:Pick<World,'seats'>;
 state:NativeSceneTetherState;
 authority:NativeSceneTetherAuthority;
}
// One mutable replacement slot belongs to one scene owner for its lifetime.
// Distinct slots may initially reference the same array: native addTether always
// replaces via filter before push; its early returns do not mutate that array.
const ownedStates=new WeakSet<NativeSceneTetherState>();
export class NativeAreaSceneTethers {
 readonly input:NativeAreaSceneTetherInput;
 readonly host:NativeSceneTetherHost;
 constructor(raw:NativeAreaSceneTetherInput){
  const bindings=Object.create(null);
  for(const key of ['scene','campaign','state','authority']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native tethers need own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeAreaSceneTetherInput=this.input=Object.freeze(bindings);
  if(input.authority.campaign!==input.campaign)throw Error('Native tethers need identical campaign authority');
  const queue=Object.getOwnPropertyDescriptor(input.state,'tethers');
  if(!queue||!Object.hasOwn(queue,'value')||!queue.writable||!Array.isArray(queue.value))throw Error('Native tethers need the actual mutable queue');
  if(ownedStates.has(input.state))throw Error('Native tethers need a fresh local queue state');
  if(!Array.isArray(input.scene.actors))throw Error('Native tethers need the actual scene census');
  this.host=Object.freeze({
   get tethers(){return input.state.tethers;},set tethers(value:World['tethers']){input.state.tethers=value;},
   get actors(){return input.scene.actors;},
   addTether:(...args:Parameters<World['addTether']>)=>this.addTether(...args),
  });
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
  ownedStates.add(input.state);
 }
 #admit(actors:readonly Actor[]):void{
  const {scene,authority}=this.input;
  for(const actor of actors){
   if(!scene.actors.includes(actor))throw Error('Native tether construction needs actual physical endpoints and owner');
   const registered=authority.require(actor);
   if(registered.scene!==scene)throw Error('Native tether construction needs actual physical endpoints and owner');
   if(registered.tethers!==this)throw Error('Native tether construction needs its registered queue owner');
  }
  authority.assertAdmitted(scene);
 }
 addTether(...args:Parameters<World['addTether']>):void{
  this.#admit([args[0],args[1],args[4]]);sceneAddTether(this.host,...args);
 }
 attachObjectTethers(...args:Parameters<World['attachObjectTethers']>):void{
  const [spawned,,caster]=args;this.#admit([spawned,caster]);
  // Native spawnMinion/spawnConstruct establish this exact owner relationship.
  // A different local caster cannot adopt a foreign owner's created object.
  if(spawned.owner!==caster)throw Error('Native object tether attachment needs its actual caster');
  sceneAttachObjectTethers(this.host,...args);
 }
}
