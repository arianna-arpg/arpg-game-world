/** Status provenance is observed only at native creation and attribution writes.
 * The opaque observer belongs to the active retained operation; IDs never mint it. */
import type {Actor} from './actor';
import type {ActiveStatus} from './status';
export interface NativeStatusProvenanceObserver {
 created(target:Actor,status:ActiveStatus):void;
 attributed(target:Actor,status:ActiveStatus):void;
 relay<T>(target:Actor,source:Actor,action:()=>T):T;
}
interface Frame {readonly target:Actor;readonly observer:NativeStatusProvenanceObserver;readonly parent:Frame|null;readonly incoming:Set<ActiveStatus>;active:boolean}
let top:Frame|null=null;
export function withNativeStatusProvenance<T>(target:Actor,observer:NativeStatusProvenanceObserver,action:()=>T):T {const frame:Frame={target,observer,parent:top,incoming:new Set(),active:true};top=frame;try{return action();}finally{frame.active=false;top=frame.parent;}}
export function nativeStatusCreated(target:Actor,status:ActiveStatus):void {creationReceipts.set(status,{target,phase:'live'});const frame=top;if(frame?.active&&frame.target===target)frame.observer.created(target,status);}
/** Wraps only the original RHS branch selecting an incoming caster. The native
 * value is returned unchanged; publication waits until assignment succeeds. */
export function nativeStatusSelectCaster<T>(target:Actor,status:ActiveStatus,value:T):T {const frame=top;if(frame?.active&&frame.target===target&&value!==undefined)frame.incoming.add(status);return value;}
export function nativeStatusCasterAssigned(target:Actor,status:ActiveStatus):void {const frame=top;if(frame?.active&&frame.target===target&&frame.incoming.delete(status))frame.observer.attributed(target,status);}
export function withNativeRelayedStatus<T>(target:Actor,source:Actor,action:()=>T):T {const frame=top;return frame?.active?frame.observer.relay(target,source,action):action();}

/** Native creation identity is recorded before birth without granting actor or source authority. */
const creationReceipts=new WeakMap<ActiveStatus,{readonly target:Actor;phase:'live'|'expired'}>();
function data(object:object,key:PropertyKey):unknown{const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native status selection needs ordinary own storage');return d.value;}
function contains(array:unknown,row:ActiveStatus):boolean{if(!Array.isArray(array))throw Error('Native status selection needs its raw status store');const length=data(array,'length') as number;for(let i=0;i<length;i++)if(data(array,i)===row)return true;return false;}
export function assertNativeStatusSelection(target:Actor,status:ActiveStatus):'live'|'expired' {const receipt=creationReceipts.get(status);if(!receipt||receipt.target!==target)throw Error('Native status selection needs its exact target creation receipt');if(!contains(data(target,receipt.phase==='live'?'statuses':'expiredStatuses'),status))throw Error('Native status selection needs its currently installed native row');return receipt.phase;}
/** This observation follows the successful original expiry push, including ordinary prebirth/native use. */
export function nativeStatusExpired(target:Actor,status:ActiveStatus):void{const receipt=creationReceipts.get(status);if(receipt?.target===target)receipt.phase='expired';}
export function retireNativeExpiredStatus(target:Actor,status:ActiveStatus):void{const receipt=creationReceipts.get(status);if(receipt?.target===target&&receipt.phase==='expired')creationReceipts.delete(status);}
export interface NativeStatusIterationObserver {begin(target:Actor,status:ActiveStatus):object;end(scope:object):void;}
interface Iteration {readonly target:Actor;readonly observer:NativeStatusIterationObserver;readonly parent:Iteration|null;active:boolean}
export interface NativeStatusIteration {readonly target:Actor}
let iteration:Iteration|null=null;const iterations=new WeakMap<NativeStatusIteration,Iteration>();
export function beginNativeStatusIteration(target:Actor,observer:NativeStatusIterationObserver):NativeStatusIteration {const frame:Iteration={target,observer,parent:iteration,active:true},token=Object.freeze({target});iterations.set(token,frame);iteration=frame;return token;}
export function endNativeStatusIteration(token:NativeStatusIteration):void {const frame=iterations.get(token);if(!frame||!frame.active||frame!==iteration)throw Error('Expired or nested native status iteration');frame.active=false;iteration=frame.parent;iterations.delete(token);}
interface Selection {readonly iteration:Iteration;readonly scope:object}
export function beginNativeStatusSelection(target:Actor,status:ActiveStatus):Selection|undefined {const frame=iteration;if(!frame)return undefined;if(!frame.active||frame.target!==target)throw Error('Native status iterator has a foreign physical target');return {iteration:frame,scope:frame.observer.begin(target,status)};}
export function endNativeStatusSelection(selection:Selection|undefined):void {if(!selection)return;if(!selection.iteration.active||iteration!==selection.iteration)throw Error('Native status selection escaped its iterator');selection.iteration.observer.end(selection.scope);}

export function nativeStatusOrigin(status:ActiveStatus):Actor|undefined{return creationReceipts.get(status)?.target;}
