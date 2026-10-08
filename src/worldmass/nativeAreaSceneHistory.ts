/** Birth-time remains and remembered enemies, attached to a genuine local scene.
 * The caller owns the real campaign/account, run-wide manifest ledger and services. */
import type {World} from '../engine/world';
import type {NativeSceneActorContext,NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import * as native from '../engine/nativeSceneHistory';
export interface NativeSceneHistoryState {playerCorpses:World['playerCorpses']}
export interface NativeSceneHistoryCampaign {
 meta:World['meta'];charDeaths:World['charDeaths'];account:World['account'];hiredMercs:World['hiredMercs'];
 time:World['time'];lastSagaFlushAt:World['lastSagaFlushAt'];accountDirty:World['accountDirty'];
 localSeat:World['localSeat'];sim:Pick<World['sim'],'faction'>;manifestedThisRun:World['manifestedThisRun'];zoneMap:World['zoneMap'];
}
export interface NativeSceneHistoryServices {notice:World['notice'];text:World['text'];events:World['events']}
export interface NativeSceneHistoryInput {
 scene:NativeSceneActorContext;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;
 campaign:NativeSceneHistoryCampaign;services:NativeSceneHistoryServices;state:NativeSceneHistoryState;
}
export class NativeAreaSceneHistory {
 readonly input:NativeSceneHistoryInput;
 readonly host:native.NativeSceneHistoryHost;
 constructor(raw:NativeSceneHistoryInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','population','campaign','services','state']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native history needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneHistoryInput=this.input=Object.freeze(roots);
  const same=(o:object,k:string,v:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==v)throw Error('Native history needs identical '+k+' owner');};
  same(input.geometry,'state',input.scene);
  const pi=Object.getOwnPropertyDescriptor(input.population,'input');
  if(!pi||!Object.hasOwn(pi,'value')||!pi.value)throw Error('Native history needs actual population input');
  same(pi.value,'scene',input.scene);same(pi.value,'geometry',input.geometry);
  const corpses=Object.getOwnPropertyDescriptor(input.state,'playerCorpses');
  if(!corpses||!Object.hasOwn(corpses,'value')||!Array.isArray(corpses.value))throw Error('Native history needs explicit area corpse state');
  const host={} as native.NativeSceneHistoryHost;
  const fields=(o:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return (o() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(o() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(o:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const provider=o() as Record<string,Function>,fn=provider[key];if(typeof fn!=='function')throw Error('Missing native history capability: '+key);return (...args:unknown[])=>fn.apply(provider,args);}});};
  fields(()=>input.scene,['actors']);fields(()=>input.geometry,['arena']);
  fields(()=>input.campaign,['meta','charDeaths','account','hiredMercs','time','localSeat','sim','manifestedThisRun','zoneMap']);
  fields(()=>input.campaign,['lastSagaFlushAt','accountDirty'],true);fields(()=>input.state,['playerCorpses'],true);
  fields(()=>input.services,['events']);methods(()=>input.services,['notice','text']);
  methods(()=>input.geometry,['clampPos','findFreeSpot']);methods(()=>input.population,['createMonster','promoteRarity']);
  methods(()=>this,['modeStageDef','corpseRecords','nemesisActive','watchedSagas','spawnNemesisActor','sagaDirty']);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 modeStageDef(){return native.historyModeStageDef(this.host);}
 corpseRecords(){return native.historyCorpseRecords(this.host);}
 nemesisActive(){return native.historyNemesisActive(this.host);}
 watchedSagas(){return native.historyWatchedSagas(this.host);}
 sagaDirty(...a:Parameters<World['sagaDirty']>){return native.historySagaDirty(this.host,...a);}
 spawnNemesisActor(...a:Parameters<World['spawnNemesisActor']>){return native.historySpawnNemesisActor(this.host,...a);}
 manifestNemeses(...a:Parameters<World['manifestNemeses']>){return native.historyManifestNemeses(this.host,...a);}
 applyGrudgeEffects(...a:Parameters<World['applyGrudgeEffects']>){return native.historyApplyGrudgeEffects(this.host,...a);}
 spawnPlayerCorpses(...a:Parameters<World['spawnPlayerCorpses']>){return native.historySpawnPlayerCorpses(this.host,...a);}
}
