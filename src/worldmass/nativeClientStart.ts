/** Account policy for a genuine local retained start. Browser menu/render shell and
 * cold Continue are separate entrypoints. Native prior writes survive failure. */
import {World} from '../engine/world';
import {sceneDue} from '../engine/scenes';
import {CLASSES,type ClassDef} from '../data/classes';
import {MU_CFG,MU_SCENE_ID} from '../data/mu';
import {START_ZONE} from '../data/zones';
import type {Account} from '../meta/account';
import {modeById,mintCharId,freeRosterSlot,DEFAULT_MODE_ID} from '../meta/modes';
import {savedCharacterPatronId,persistRun} from '../meta/character';
import {releaseMercsOf} from '../meta/mercs';
import {saveAccount} from '../meta/persistence';
import {rememberKitPicks,resolveClassKit} from '../meta/classkit';
import {buildManifest,type ExpeditionManifest} from '../packages/manifest';
import {rollSeed} from '../core/rng';
import {captureNativeGeographySource} from '../world/captureGeography';
import {createNativeGeographyReader} from '../world/geographySource';
import {makeMassNativeGeographySpec,validateMapping,type MassNativeMapping} from './nativeGeography';
import {makeNativeGeographyCatalogSpec,NativeGeographyCatalog} from './nativeGeographyCatalog';
import {NativeClientRuntime,type NativeClientInstallation} from './nativeClientRuntime';
export type NativeClientStartRequest={readonly kind:'mu';readonly manifest?:ExpeditionManifest}|{
 readonly kind:'run';readonly classDef:ClassDef;readonly manifest?:ExpeditionManifest;readonly modeId?:string;
 readonly name?:string;readonly graftSkillId?:string|null;readonly kitPicks?:Record<string,string>;
 /** Native profile may deliberately suppress the tutorial. This is a client policy, not geography. */
 readonly prologue?:'native-gate'|'force'|'skip';
 /** Synchronous shell adoption and initial guest joining, before the baseline save. */
 readonly onReady?:(started:NativeClientStarted)=>void;
};
export interface NativeClientStarted {readonly writer:World;readonly runtime:NativeClientRuntime;readonly provisional:boolean;readonly prologue:boolean}
const starts=new WeakMap<Account,NativeClientStart>();
const install=NativeClientRuntime.prototype.install,retire=NativeClientRuntime.prototype.retire;
const installedReady=Object.getOwnPropertyDescriptor(NativeClientRuntime.prototype,'ready')!.get!;
/** One loading generation for this actual account. A cancel during native work
 * takes effect at the next boundary; it does not roll back roster/gift writes. */
export class NativeClientStart {
 readonly #account:Account;readonly #mapping:MassNativeMapping|undefined;
 #busy=false;#generation=0;#controller:AbortController|undefined;#current:NativeClientStarted|undefined;
 constructor(account:Account,mapping?:MassNativeMapping){if(starts.has(account))throw Error('Native client start already owns this account');if(mapping!==undefined)validateMapping(mapping);this.#account=account;this.#mapping=mapping!==undefined?structuredClone(mapping):undefined;if(starts.has(account))throw Error('Native client start already owns this account');starts.set(account,this);}
 get current():NativeClientStarted|undefined{return this.#current;}
 get pending():boolean{return this.#busy;}
 cancel():void {this.#generation++;this.#controller?.abort();if(!this.#busy&&this.#current){Reflect.apply(retire,this.#current.runtime,[]);this.#current=undefined;}}
 begin(request:NativeClientStartRequest):NativeClientStarted|null {
  if(this.#busy)throw Error('Native client start cannot reenter');this.#busy=true;const generation=++this.#generation,controller=this.#controller=new AbortController();
  let runtime:NativeClientRuntime|undefined;
  const check=()=>{if(generation!==this.#generation||controller.signal.aborted)throw Error('Native client start cancelled');};
  try {
   const account=this.#account,provisional=request.kind==='mu';
   const classDef=provisional?(CLASSES.find(c=>c.id===MU_CFG.provisionalClass)??CLASSES[0]):request.classDef;
   if(!CLASSES.includes(classDef))throw Error('Native client start requires an installed class');
   // Read the virgin-account gate before a roster entry can change it.
   const prologue=!provisional&&(request.prologue==='force'||(request.prologue!=='skip'&&sceneDue(account,'prologue')));
   check();let character:NonNullable<NativeClientInstallation['fresh']>;
   if(provisional)character={classDef,options:{modeId:DEFAULT_MODE_ID},scene:MU_SCENE_ID,provisionalMu:true};
   else {
    const mode=modeById(request.modeId),charName=request.name?.trim()||classDef.name,charId=mintCharId();
    if(mode.save==='roster'){
     const slot=freeRosterSlot(account,mode);if(slot==null)return null;
     account.roster.push({charId,modeId:mode.id,slot,classId:classDef.id,name:charName,level:1,stage:0,savedAt:Date.now()});saveAccount(account);
    }else{const previousPatron=savedCharacterPatronId();if(previousPatron&&releaseMercsOf(account,previousPatron)>0)saveAccount(account);}
    character={classDef,options:{modeId:mode.id,charId,name:charName},graft:request.graftSkillId??undefined,scene:prologue?'prologue':undefined};
   }
   check();const manifest=request.manifest??buildManifest(account,rollSeed()),writer=new World(account,Object.freeze(manifest));
   // Original adoptWorld occurs after the new World constructor, before kit resolution.
   if(this.#current){Reflect.apply(retire,this.#current.runtime,[]);this.#current=undefined;}
   if(!provisional){if(request.kitPicks){rememberKitPicks(account,classDef,request.kitPicks);saveAccount(account);}character={...character,options:{...character.options,kit:resolveClassKit(account,classDef,request.kitPicks)}};}
   check();writer.sim.bindGeographyPolicies();const source=createNativeGeographyReader(captureNativeGeographySource(writer.manifest.seed));
   const catalog=this.#mapping?undefined:new NativeGeographyCatalog(makeNativeGeographyCatalogSpec(source.identity));
   const geography=this.#mapping?makeMassNativeGeographySpec(source.identity,this.#mapping):catalog!.initial.spec;
   runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography,...catalog?{catalog:catalog.spec}:{},fresh:character});
   check();Reflect.apply(install,runtime,[controller.signal]);check();
   const checkInstalled=()=>{check();if(!Reflect.apply(installedReady,runtime!,[]))throw Error('Native client start runtime is no longer ready');check();};
   const result=Object.freeze({writer,runtime,provisional,prologue});
   if(!provisional){const ready=request.onReady;checkInstalled();if(ready)ready(result);checkInstalled();}
   if(!provisional&&!prologue)persistRun(account,writer);checkInstalled();
   this.#current=result;return result;
  }catch(error){if(runtime)Reflect.apply(retire,runtime,[]);throw error;}
  finally{this.#busy=false;if(this.#controller===controller)this.#controller=undefined;}
 }
}