/** Physical-area entry to exact combat-state rules. Payload execution remains separate. */
import type {Actor} from '../engine/actor';
import {STATUS_DEFS} from '../engine/status';
import {NativeAreaScenePopulation,type NativeSceneCensus} from './nativeAreaScenePopulation';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import * as native from '../engine/nativeSceneCombatState';
export interface NativeCombatStateRuntime {readonly progression:NativeAreaSceneProgression}
export type NativeCombatStateAuthority=Pick<NativeAreaActorAuthority<NativeCombatStateRuntime>,'campaign'|'require'|'assertAdmitted'>;
export interface NativeCombatStateInput {
 scene:NativeSceneCensus;population:NativeAreaScenePopulation;
 campaign:NativeAreaSceneProgression['input']['campaign'];progression:NativeAreaSceneProgression;
 authority:NativeCombatStateAuthority;
}
type Args<F extends (...a:any[])=>unknown>=Parameters<F> extends [unknown,...infer A]?A:never;
const unknown=Symbol('non-static metadata');
const nativeIncludes=Array.prototype.includes,nativeIterator=Array.prototype[Symbol.iterator];
/** The installed metadata is ordinary data. Inspecting descriptors avoids running
 * optional getters before native code. Ambiguous/accessor-driven early returns
 * require admission; admitted calls still evaluate their getters only in core. */
function data(o:unknown,key:PropertyKey):any {
 if(!o||typeof o!=='object')return unknown;
 const d=Object.getOwnPropertyDescriptor(o,key);if(d)return Object.hasOwn(d,'value')?d.value:unknown;
 const proto=Object.getPrototypeOf(o);return proto===null||(proto===Object.prototype&&!Object.getOwnPropertyDescriptor(Object.prototype,key))?undefined:unknown;
}
function plainStrings(value:unknown):value is string[]{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return false;for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,i);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string')return false;}return true;}
function nativeArrayMethod(value:unknown,key:PropertyKey,method:Function):boolean{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return false;const d=Object.getOwnPropertyDescriptor(value,key)??Object.getOwnPropertyDescriptor(Array.prototype,key);return !!d&&Object.hasOwn(d,'value')&&d.value===method;}
export class NativeAreaSceneCombatState {
 readonly input:NativeCombatStateInput;readonly host:native.NativeSceneCombatStateHost;
 constructor(raw:NativeCombatStateInput){
  const b=Object.create(null);for(const key of ['scene','population','campaign','progression','authority']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native combat state needs own object binding: '+key);b[key]=d.value;}
  const input:NativeCombatStateInput=this.input=Object.freeze(b),p=input.progression;
  if(!(p instanceof NativeAreaSceneProgression)||!(input.population instanceof NativeAreaScenePopulation)||p.input.scene!==input.scene||p.input.population!==input.population||p.input.campaign!==input.campaign||p.input.authority as object!==input.authority||input.population.input.scene!==input.scene||input.population.input.campaign as object!==input.campaign||input.authority.campaign!==input.campaign)throw Error('Native combat state needs identical concrete owners and campaign authority');
  const host={} as native.NativeSceneCombatStateHost,self=this;
  Object.defineProperties(host,{actors:{enumerable:true,get:()=>input.scene.actors},treeBuffSources:{enumerable:true,get:()=>input.progression.input.state.treeBuffSources},time:{enumerable:true,get:()=>input.campaign.time}});
  for(const key of ['grantTreeBuff','tapFires','isEliteVictim'] as const)Object.defineProperty(host,key,{enumerable:true,get(){const fn=self[key];return (...args:any[])=>Reflect.apply(fn,self,args);}});
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 #actors(...actors:Actor[]):void {const {scene,authority,progression}=this.input;for(const actor of actors){if(!scene.actors.includes(actor))throw Error('Native combat state needs actual physical actor');const registered=authority.require(actor);if(registered.scene!==scene||registered.progression!==progression)throw Error('Native combat state needs registered progression owner');}authority.assertAdmitted(scene);}
 applyBuffEffect(...a:Args<typeof native.sceneApplyBuffEffect>):void{this.#actors(a[0]);native.sceneApplyBuffEffect(this.host,...a);}
 grantTreeBuff(...a:Args<typeof native.sceneGrantTreeBuff>):void{this.#actors(a[0],a[1]);native.sceneGrantTreeBuff(this.host,...a);}
 transplantStatus(...a:Args<typeof native.sceneTransplantStatus>):void{const field=data(a[1],'challengeField'),id=data(a[1],'id');if(!(field!==unknown&&field!==undefined)&&!(field===undefined&&typeof id==='string'&&data(STATUS_DEFS,id)!==unknown&&!data(STATUS_DEFS,id)))this.#actors(a[0]);native.sceneTransplantStatus(this.host,...a);}
 tapCharges(...a:Args<typeof native.sceneTapCharges>):void{this.#actors(a[0]);native.sceneTapCharges(this.host,...a);}
 tapFires(...a:Args<typeof native.sceneTapFires>):boolean {
  const [actor,,spec,on,at,,victim]=a,sOn=data(spec,'on');
  if(sOn!==unknown&&sOn!==on)return native.sceneTapFires(this.host,...a);
  const toggled=data(spec,'whileToggled');if(sOn===unknown||toggled===unknown||toggled||(on==='enemyDeath'&&at))this.#actors(actor);
  const elite=data(spec,'eliteVictim');if(victim&&(elite===unknown||elite))this.#actors(victim);
  return native.sceneTapFires(this.host,...a);
 }
 isEliteVictim(...a:Args<typeof native.sceneIsEliteVictim>):boolean{this.#actors(a[0]);return native.sceneIsEliteVictim(this.host,...a);}
 bankPools(...a:Args<typeof native.sceneBankPools>):void{if(!(typeof a[2]==='number'&&a[2]<=0))this.#actors(a[0]);native.sceneBankPools(this.host,...a);}
 victimGate(...a:Args<typeof native.sceneVictimGate>):boolean{if(!(Array.isArray(a[0])&&a[0].length===0&&nativeArrayMethod(a[0],Symbol.iterator,nativeIterator)))this.#actors(a[1],a[2]);return native.sceneVictimGate(this.host,...a);}
 procReady(...a:Args<typeof native.sceneProcReady>):boolean{const icd=data(a[1],'icd');if(icd===unknown||icd)this.#actors(a[0]);return native.sceneProcReady(this.host,...a);}
 procGates(...a:Args<typeof native.sceneProcGates>):boolean{
  const [actor,proc,inst]=a,skills=data(proc,'skills');let actorFree=false,staticSkills=skills!==unknown&&!skills;
  if(skills!==unknown&&skills){if(!inst)actorFree=true;else {const def=data(inst,'def'),id=data(def,'id');if(plainStrings(skills)&&nativeArrayMethod(skills,'includes',nativeIncludes)&&id!==unknown){staticSkills=true;if(!nativeIncludes.call(skills,id))actorFree=true;}}}
  if(!actorFree&&staticSkills){const fields=['when','unless','requireBuff','requireStatus','tags','oncePerCast'].map(k=>data(proc,k));actorFree=fields.every(x=>x!==unknown)&&!fields[0]&&!fields[1]&&fields[2]===undefined&&fields[3]===undefined&&!fields[4]&&!fields[5];}
  if(!actorFree)this.#actors(actor);return native.sceneProcGates(this.host,...a);
 }
 procDepthAllowed(...a:Args<typeof native.sceneProcDepthAllowed>):number{this.#actors(a[0]);return native.sceneProcDepthAllowed(this.host,...a);}
 rollTopMet(...a:Args<typeof native.sceneRollTopMet>):boolean{if(a[2]!==undefined)this.#actors(a[0]);return native.sceneRollTopMet(this.host,...a);}
 procChance(...a:Args<typeof native.sceneProcChance>):number{this.#actors(a[0]);return native.sceneProcChance(this.host,...a);}
}
