/** Retained native puzzle lifecycle. Publication and whole-area scheduling remain external. */
import type {Actor} from '../engine/actor';
import type {World} from '../engine/world';
import type {PuzzleRun} from '../engine/puzzles';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaSceneEnvironment} from './nativeAreaSceneEnvironment';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import * as native from '../engine/nativeScenePuzzles';
export type NativeScenePuzzleEffects=Pick<native.NativeScenePuzzleHost,'dropGemAt'|'mintLootResult'|'executeSkill'>;
export interface NativeScenePuzzleInput {
 scene:NativeSceneCensus; geometry:NativeAreaSceneGeometry; environment:NativeAreaSceneEnvironment;
 campaign:Pick<native.NativeScenePuzzleHost,'time'>;
 /** Actual area loot/combat effects. World-bound active-scene methods are not valid neighboring-area providers. */
 effects:NativeScenePuzzleEffects;
}
export class NativeAreaScenePuzzles {
 readonly input:NativeScenePuzzleInput;
 readonly host:native.NativeScenePuzzleHost;
 #hazardCaster:Actor|null=null;
 constructor(raw:NativeScenePuzzleInput) {
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','environment','campaign','effects']) {
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native puzzles require an own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeScenePuzzleInput=this.input=Object.freeze(bindings),host={} as native.NativeScenePuzzleHost,self=this;
  if(input.geometry.state!==input.scene||input.environment.input.scene!==input.scene||input.environment.input.geometry!==input.geometry)
   throw Error('Native puzzles require identical scene, geometry and environment owners');
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];
   if(typeof fn!=='function')throw Error('Missing native puzzle capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.environment.input.state,['puzzles','puzzleKnocks']);
  fields(()=>input.scene,['actors','zone']);fields(()=>input.geometry,['flashes']);fields(()=>input.campaign,['time']);
  Object.defineProperty(host,'hazardCaster',{enumerable:true,get(){return self.#hazardCaster;},set(v:Actor|null){self.#hazardCaster=v;}});
  methods(()=>input.geometry,['clampPos']);methods(()=>input.environment,['puzzleHost']);
  methods(()=>input.effects,['dropGemAt','mintLootResult','executeSkill']);methods(()=>self,['drainPuzzleKnocks']);
  host.spoilsSealed=()=>native.scenePuzzleSpoilsSealed(host);
  this.host=Object.freeze(host);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 /** Native IDs repeat between areas. The actual enrolled body supplies authority. */
 private requireNode(node:Actor):void {
  const pn=node.puzzleNode;if(!pn)return; // native non-puzzle/heart no-op
  const run=this.input.environment.input.state.puzzles.find(r=>r.id===pn.id);
  if(!run||!run.nodes.includes(node))throw Error('Foreign native puzzle node');
 }
 updatePuzzles(...args:Parameters<World['updatePuzzles']>){return native.sceneUpdatePuzzles(this.host,...args);}
 puzzleStruck(...args:Parameters<World['puzzleStruck']>){this.requireNode(args[0]);return native.scenePuzzleStruck(this.host,...args);}
 drainPuzzleKnocks(){
  for(const k of this.input.environment.input.state.puzzleKnocks)this.requireNode(k.node);
  return native.sceneDrainPuzzleKnocks(this.host);
 }
 puzzleTuned(...args:Parameters<World['puzzleTuned']>){this.requireNode(args[0]);return native.scenePuzzleTuned(this.host,...args);}
 completePuzzle(run:PuzzleRun){
  if(!this.input.environment.input.state.puzzles.includes(run))throw Error('Foreign native puzzle run');
  return native.sceneCompletePuzzle(this.host,run);
 }
}
