/** Optional native enemy memo identity, granted only by actual fixture insertion. */
import {consumeNativeCrusadeFixtureToken} from '../worldmass/nativeCrusadeTerrain';
import {consumeNativeSceneRestoration} from './nativeScenePopulation';
import type {NativeAreaBirthMemory} from './nativeAreaBirth';
import type {Actor} from './actor';
export interface NativeCrusadeFixtureMemo {zone:string;event:string;tier:number;structure:string;plan:string;ordinal:number}
const receipts=new WeakMap<Actor,Readonly<NativeCrusadeFixtureMemo>>(),observers=new WeakMap<object,Pick<Extract<NativeCrusadeFixtureRegistration,{kind:'furniture'}>,'restore'|'complete'>>();
export type NativeCrusadeFixtureRegistration={kind:'furniture';owner:object;restore:(body:Actor,memo:NativeCrusadeFixtureMemo)=>void;complete:(memory:NativeAreaBirthMemory,actors:Actor[])=>void}|{kind:'door';owner:object;read:(id:string)=>string};
export function bindNativeCrusadeFixtureMemory(token:object){const r=consumeNativeCrusadeFixtureToken(token);if(r.kind!=='furniture')throw Error('Wrong Crusade fixture receipt');const {owner,restore,complete}=r;if(observers.has(owner))throw Error('Crusade fixture memory already bound');observers.set(owner,{restore,complete});return Object.freeze({record(body:Actor,memo:NativeCrusadeFixtureMemo){receipts.set(body,Object.freeze({...memo}));}});}
export function readNativeCrusadeFixtureMemory(body:Actor):Readonly<NativeCrusadeFixtureMemo>|undefined{return receipts.get(body);}
export function restoreNativeCrusadeFixtureMemory(owner:object,body:Actor,memo:NativeCrusadeFixtureMemo|undefined):void {if(memo)observers.get(owner)?.restore(body,memo);}
/** No structural caller can declare a complete saved enemy census. */
export function completeNativeCrusadeFixtureMemory(token:object):void {const r=consumeNativeSceneRestoration(token);observers.get(r.host)?.complete(r.memory,r.actors);}

const doorObservers=new WeakMap<object,(id:string)=>string>();
export function bindNativeCrusadeDoorMemory(token:object):void {const r=consumeNativeCrusadeFixtureToken(token);if(r.kind!=='door')throw Error('Wrong Crusade door receipt');const {owner,read}=r;if(doorObservers.has(owner))throw Error('Crusade door memory already bound');doorObservers.set(owner,read);}
export function nativeCrusadeMemoryDoor(owner:object,id:string):string{return doorObservers.get(owner)?.(id)??id;}

/** Optional input is inert until a bound native fixture validates exact correspondence. */
export function parseNativeCrusadeFixtureMemory(raw:unknown):NativeCrusadeFixtureMemo|undefined {if(!raw||typeof raw!=='object')return;const value=raw as NativeCrusadeFixtureMemo,out={} as NativeCrusadeFixtureMemo;for(const key of ['zone','event','structure','plan'] as const){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!('value'in d)||typeof d.value!=='string'||!d.value.length||d.value.length>(key==='plan'?65536:256))return;out[key]=d.value;}for(const key of ['tier','ordinal'] as const){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!('value'in d)||!Number.isSafeInteger(d.value)||d.value<0||d.value>4096)return;out[key]=d.value;}return out;}
