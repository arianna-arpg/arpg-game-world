/** Creation-scoped native preparation. A minted receipt never grants physical
 * attendance, combat capability or permission to insert the body into a scene. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {SkillInstance} from '../engine/skills';
import {NativeAreaScenePopulation,nativeBirthAsyncResult,nativePopulationCreateMonster as createMonster,type NativeSceneCensus} from './nativeAreaScenePopulation';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {sceneRollSummonType,sceneForwardSummonSockets} from '../engine/nativeSceneSummonPreparation';
import {sceneBakeMinionOwnerStats,sceneRelevelActor,type NativeSceneMinionOwnerStatsHost,type NativeSceneRelevelHost} from '../engine/nativeSceneProgression';
export type NativeSummonPreparationCampaign=Pick<World,'account'|'localSeat'|'seatOf'>;
export interface NativeSummonPreparationRuntime {readonly progression:NativeAreaSceneProgression}
export type NativeSummonPreparationAuthority=Pick<NativeAreaActorAuthority<NativeSummonPreparationRuntime>,'campaign'|'require'|'assertAdmitted'|'assertUnclaimed'>;
export interface NativeAreaSceneSummonPreparationInput {
 scene:NativeSceneCensus;population:NativeAreaScenePopulation;campaign:NativeSummonPreparationCampaign;
 progression:NativeAreaSceneProgression;authority:NativeSummonPreparationAuthority;
}
export interface NativeSummonPreparationScope {
 createMonster:NativeAreaScenePopulation['createMonster'];
 forwardSummonSockets(summon:SkillInstance|undefined,body:Actor,opts?:Parameters<typeof sceneForwardSummonSockets>[2]):void;
 bakeMinionOwnerStats:World['bakeMinionOwnerStats'];
 relevelActor:World['relevelActor'];
}
interface PreparationFrame {owner:NativeAreaSceneSummonPreparation;caster:Actor;bodies:Set<Actor>;active:boolean}
const frames=new WeakMap<NativeAreaScenePopulation,PreparationFrame>();
// Capture the concrete class operation, not an overridable caller-provided mint.
// It invokes createNativeMonster with this population's frozen real factory.
// The defining module captures this intrinsic after its class initialization.
export class NativeAreaSceneSummonPreparation {
 readonly input:NativeAreaSceneSummonPreparationInput;
 constructor(raw:NativeAreaSceneSummonPreparationInput){
  const roots=Object.create(null);for(const key of ['scene','population','campaign','progression','authority']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native summon preparation needs own object binding: '+key);roots[key]=d.value;
  }
  const input:NativeAreaSceneSummonPreparationInput=this.input=Object.freeze(roots);
  if(!(input.population instanceof NativeAreaScenePopulation)||!(input.progression instanceof NativeAreaSceneProgression)||input.population.input.scene!==input.scene||input.population.input.campaign as object!==input.campaign||input.authority.campaign as object!==input.campaign||input.progression.input.scene!==input.scene||input.progression.input.population!==input.population||input.progression.input.campaign!==input.campaign||input.progression.input.authority as object!==input.authority)throw Error('Native summon preparation needs identical population, progression and campaign authority');
  Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 #admitted(caster:Actor):void{
  const {authority,scene,progression}=this.input;
  if(!scene.actors.includes(caster))throw Error('Native summon preparation needs its actual physical caster');
  const registered=authority.require(caster);
  if(registered.scene!==scene)throw Error('Native summon preparation needs its actual physical caster');
  if(registered.progression!==progression)throw Error('Native summon preparation needs its registered progression');
  authority.assertAdmitted(scene);
 }
 #active(frame:PreparationFrame):void{
  if(!frame.active||frames.get(this.input.population)!==frame||frame.owner!==this)throw Error('Expired or nested native summon preparation scope');
  this.#admitted(frame.caster);
 }
 #body(frame:PreparationFrame,body:Actor):void{
  this.#active(frame);
  if(!frame.bodies.has(body)||body.owner!==frame.caster)throw Error('Foreign or reused native summon preparation body');
  if(this.input.scene.actors.includes(body))throw Error('Native summon preparation requires an uninserted body');
  this.input.authority.assertUnclaimed(body);
 }
 rollSummonType(...args:Parameters<typeof sceneRollSummonType>):ReturnType<typeof sceneRollSummonType>{return sceneRollSummonType(...args);}
 run<T>(caster:Actor,operation:(scope:NativeSummonPreparationScope)=>T):T{
  this.#admitted(caster);
  const {population,campaign}=this.input,previous=frames.get(population),frame:PreparationFrame={owner:this,caster,bodies:new Set(),active:true},self=this;
  const host:NativeSceneMinionOwnerStatsHost & NativeSceneRelevelHost={
   get account(){return campaign.account;},get localSeat(){return campaign.localSeat;},
   get seatOf(){const fn=campaign.seatOf;return(...args:Parameters<typeof fn>)=>fn.apply(campaign,args);},
   get stampMonsterLevel(){const factory=population.factory,fn=factory.stampMonsterLevel;return(...args:Parameters<typeof fn>)=>fn.apply(factory,args);},
   relevelActor(body,level){self.#body(frame,body);sceneRelevelActor(host,body,level);},
  };
  const scope:NativeSummonPreparationScope=Object.freeze({
   get createMonster(){
    self.#active(frame);
    const fn=population.createMonster;
    if(fn!==createMonster)throw Error('Native summon preparation requires the actual population factory operation');
    return (...args:Parameters<typeof createMonster>)=>{
     self.#active(frame);if(args[3]!==caster)throw Error('Native summon preparation factory needs its scoped caster');
     const body=fn.apply(population,args);
     if(body.owner!==caster||frame.bodies.has(body)||population.actors.includes(body))throw Error('Native summon preparation factory returned a foreign or reused body');
     self.input.authority.assertUnclaimed(body);frame.bodies.add(body);return body;
    };
   },
   forwardSummonSockets(summon:SkillInstance|undefined,body:Actor,opts?:Parameters<typeof sceneForwardSummonSockets>[2]){self.#body(frame,body);sceneForwardSummonSockets(summon,body.skills,opts);},
   bakeMinionOwnerStats(...args:Parameters<World['bakeMinionOwnerStats']>){self.#body(frame,args[0]);if(args[1]!==caster)throw Error('Native summon preparation needs its scoped owner-stat caster');sceneBakeMinionOwnerStats(host,...args);},
   relevelActor(...args:Parameters<World['relevelActor']>){host.relevelActor(...args);},
  });
  frames.set(population,frame);
  try{
   const result=operation(scope);
   if(nativeBirthAsyncResult(result))throw Error('Native summon preparation requires a synchronous operation');
   return result;
  }finally{frame.active=false;frame.bodies.clear();if(previous)frames.set(population,previous);else frames.delete(population);}
 }
}
