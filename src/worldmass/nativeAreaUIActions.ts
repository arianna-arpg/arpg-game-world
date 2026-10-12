import type {World} from '../engine/world';
import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import type {NativeAreaPublicationBinding} from './nativeAreaScenePublication';
export const NATIVE_AREA_UI_ACTIONS=Object.freeze(["applyAction","chartCourse","declineVocationOffer","dismissMercenary","ensureOpenRealmRoots","harvestPauseRefused","markMetaDirty","recalcPlayer","requestMeta","sailTo","text","travelToWaypoint"] as const);
export type NativeAreaUIAction=typeof NATIVE_AREA_UI_ACTIONS[number];
export type NativeAreaUIActionMethods=Pick<World,NativeAreaUIAction>;
const keys:ReadonlySet<string>=new Set(NATIVE_AREA_UI_ACTIONS);
const seatArguments:Readonly<Partial<Record<NativeAreaUIAction,number>>>=Object.freeze({"applyAction":0,"ensureOpenRealmRoots":0,"markMetaDirty":0,"travelToWaypoint":1});
export function isNativeAreaUIAction(key:unknown):key is NativeAreaUIAction{return typeof key==='string'&&keys.has(key);}
export function nativeAreaUISeatArgument(key:NativeAreaUIAction):number|undefined{return seatArguments[key];}
export function extendNativeAreaUIActions(bindings:Map<string,NativeAreaPublicationBinding>,area:()=>NativeAreaSceneOngoing):void{for(const key of NATIVE_AREA_UI_ACTIONS){if(bindings.has(key))throw Error('Duplicate native UI action: '+key);bindings.set(key,{get:()=>{const owner=area().combat,fn=owner.applyUIAction;if(typeof fn!=='function')throw new TypeError('Native UI action is not callable');return(...args:unknown[])=>Reflect.apply(fn,owner,[key,...args]);}});}}
