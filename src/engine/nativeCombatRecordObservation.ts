/** Non-granting observation at exact native record writes on a bound leaf host. */
import type {Actor} from './actor';
import type {SkillInstance} from './skills';
import type {NativeCombatRetirement} from './nativeSceneFrameHost';
import {captureNativeActorConstruction} from './nativeActorConstruction';
import {isNativeAreaSceneTitans,type NativeAreaSceneTitans} from '../worldmass/nativeAreaSceneTitans';
import type {NativeCombatRecordKind,NativeCombatRecordTypes} from './nativeSceneCombatHost';
export interface NativeCombatRecordObserver {
 delverArrival():import('../data/zones').ZoneDef;
 selected<T>(kind:NativeCombatRecordKind,record:object,action:()=>T):T;
 factory():import('../worldmass/nativeAreaScenePopulation').NativeAreaScenePopulation['createMonster'];
 admit(body:Actor):void;
 isPresentPlayer():boolean;
 isPresentActor(actor:Actor):boolean;
 prepareRetirement(selected:Actor[]):NativeCombatRetirement;
 finishRetirement(token:NativeCombatRetirement):void;
 cancelRetirement(token:NativeCombatRetirement):void;
 reassign(kind:NativeCombatRecordKind,record:object,source:Actor,via?:Actor):void;
 reassignInstance(kind:NativeCombatRecordKind,record:object,instance:SkillInstance):void;
 status<T>(target:Actor,action:()=>T):T;
 statusSource(source:Actor):Actor;
 hidden(create:()=>Actor):Actor;
 source(actor:Actor|null|undefined):Actor|null|undefined;
 storage<K extends Exclude<NativeCombatRecordKind,'casting'|'push'>>(kind:K,storage:NativeCombatRecordTypes[K]['storage']):NativeCombatRecordTypes[K]['storage'];
 issued<K extends NativeCombatRecordKind>(kind:K,storage:NativeCombatRecordTypes[K]['storage'],record:NativeCombatRecordTypes[K]['record'],source:Actor|null|undefined,instance:SkillInstance|null|undefined):void;
}
const observers=new WeakMap<object,NativeCombatRecordObserver>();
type NativeCombatRecordRegistration=(token:object)=>{host:object;observer:NativeCombatRecordObserver};
let registration:NativeCombatRecordRegistration|undefined;
/** The real operation installs its private one-use token consumer before its
 * class can initialize. Preempting this slot prevents that module from loading;
 * replacement and uninstalled binding fail closed. No host registrar is exposed. */
export function installNativeCombatRecordRegistration(consume:NativeCombatRecordRegistration):void {
 if(registration)throw Error('Native combat record registration is already installed');
 if(typeof consume!=='function')throw Error('Native combat record registration needs its token consumer');
 registration=consume;
}
// Creation evidence alone grants no scope, physical membership or attribution.
const hiddenCreations=new WeakMap<Actor,object>();
const creationOwners=new WeakSet<NativeAreaSceneTitans>(),privateCreationHosts=new WeakSet<object>();
/** Issued once by a genuine owner constructor and stored only in the actual
 * TitanRuntime private source-construction slot. Public helper calls, including
 * reentrant selected-factory calls, cannot borrow this constructor capability. */
export function issueNativeHiddenSourceConstructor(owner:NativeAreaSceneTitans):(create:()=>Actor)=>Actor {
 if(!isNativeAreaSceneTitans(owner)||creationOwners.has(owner))throw Error('Native hidden creation requires its unique actual Titan owner');
 const descriptor=Object.getOwnPropertyDescriptor(owner,'host');if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.value||typeof descriptor.value!=='object')throw Error('Native hidden creation needs its actual ordinary host');
 const host:object=descriptor.value;creationOwners.add(owner);privateCreationHosts.add(host);
 return (create:()=>Actor):Actor=>{const observer=observers.get(host);if(observer)return observer.hidden(create);const born=captureNativeActorConstruction(create);if(born.created.has(born.value))hiddenCreations.set(born.value,host);return born.value;};
}
export function nativeHiddenSourceCreationHost(actor:Actor):object|undefined {return hiddenCreations.get(actor);}
/** The token is privately minted by the aggregate for this exact leaf host. */
export function bindNativeCombatRecordObservation(token:object):void {if(!registration)throw Error('Native combat record registration is not installed');const {host,observer}=registration(token);if(observers.has(host))throw Error('Native combat record host is already bound');observers.set(host,observer);}
export function observeNativeCombatStorage<K extends Exclude<NativeCombatRecordKind,'casting'|'push'>>(host:object,kind:K,storage:NativeCombatRecordTypes[K]['storage']):NativeCombatRecordTypes[K]['storage'] {const observer=observers.get(host);return observer?observer.storage(kind,storage):storage;}
export function observeNativeCombatRecord<K extends NativeCombatRecordKind>(host:object,kind:K,storage:NativeCombatRecordTypes[K]['storage'],record:NativeCombatRecordTypes[K]['record'],source:Actor|null|undefined,instance:SkillInstance|null|undefined):void {observers.get(host)?.issued(kind,storage,record,source,instance);}

export function observeNativeHiddenSource(host:object,create:()=>Actor):Actor {const observer=observers.get(host);return observer&&!privateCreationHosts.has(host)?observer.hidden(create):create();}
export function observeNativeSource(host:object,actor:Actor):Actor;
export function observeNativeSource(host:object,actor:Actor|null):Actor|null;
export function observeNativeSource(host:object,actor:Actor|undefined):Actor|undefined;
export function observeNativeSource(host:object,actor:Actor|null|undefined):Actor|null|undefined;
export function observeNativeSource(host:object,actor:Actor|null|undefined):Actor|null|undefined {const observer=observers.get(host);return observer?observer.source(actor):actor;}

export function observeNativeCombatFactory(host:object,fallback:()=>import('../worldmass/nativeAreaScenePopulation').NativeAreaScenePopulation['createMonster']):import('../worldmass/nativeAreaScenePopulation').NativeAreaScenePopulation['createMonster'] {const observer=observers.get(host);return observer?observer.factory():fallback();}
export function observeNativeCombatBirth(host:object,body:Actor):void {observers.get(host)?.admit(body);}

export function observeNativeCombatSourceReassignment(host:object,kind:NativeCombatRecordKind,record:object,source:Actor,via?:Actor):void {observers.get(host)?.reassign(kind,record,source,via);}

export function observeNativeCombatStatus<T>(host:object,target:Actor,action:()=>T):T {const observer=observers.get(host);return observer?observer.status(target,action):action();}
export function observeNativeCombatStatusSource(host:object,source:Actor):Actor {const observer=observers.get(host);return observer?observer.statusSource(source):source;}

/** Records the exact successfully written new instance separately from source assignment. */
export function observeNativeCombatInstanceReassignment(host:object,kind:NativeCombatRecordKind,record:object,instance:SkillInstance):void {observers.get(host)?.reassignInstance(kind,record,instance);}

/** Optional lifecycle observation preserves genuine prebirth native operations. */
export function observeNativeCombatRetirement(host:object,selected:Actor[]):NativeCombatRetirement|undefined {return observers.get(host)?.prepareRetirement(selected);}
export function finishNativeCombatRetirement(host:object,token:NativeCombatRetirement|undefined):void {if(token!==undefined){const observer=observers.get(host);if(!observer)throw Error('Native retirement observer is no longer bound');observer.finishRetirement(token);}}
export function cancelNativeCombatRetirement(host:object,token:NativeCombatRetirement|undefined):void {if(token!==undefined){const observer=observers.get(host);if(!observer)throw Error('Native retirement observer is no longer bound');observer.cancelRetirement(token);}}

/** Attendance is a read, never a source or body admission capability. */
export function observeNativePresentPlayer(host:object,fallback:()=>boolean):boolean {const observer=observers.get(host);return observer?observer.isPresentPlayer():fallback();}

/** A held target must still belong to the registered physical scene. Unbound
 * ordinary native callers retain their original held-reference semantics. */
export function observeNativeCombatActorPresence(host:object,actor:Actor):boolean {const observer=observers.get(host);return observer?observer.isPresentActor(actor):true;}

/** Selects only a previously issued exact row; never supplies new source credentials. */
export function observeNativeCombatSelection<T>(host:object,kind:NativeCombatRecordKind,record:object,action:()=>T):T {const observer=observers.get(host);return observer?observer.selected(kind,record,action):action();}

/** A retained Delver continuation requires the actual privately selected arrival. */
export function requireNativeDelverArrival(host:object):import('../data/zones').ZoneDef {const observer=observers.get(host);if(!observer)throw Error('Native Delver continuation needs its bound actual arrival');return observer.delverArrival();}
