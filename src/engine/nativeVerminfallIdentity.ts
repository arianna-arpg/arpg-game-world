/** Non-granting observations. Unbound original World retains its native calls. */
import type {Actor} from './actor';
import {isNativeRetainedKillContext} from './nativeWarlordIdentity';
import type {KillCtx} from './killHandlers';
import type {ZoneDef} from '../data/zones';
import type {InfestationInfo,VerminfallField} from '../packages/overlays/verminfall';
export type NativeVerminfallRole='nest'|'king'|'vermin';
export interface NativeVerminfallObserver {
 query(field:VerminfallField,definition:ZoneDef,select:()=>()=>InfestationInfo|null):InfestationInfo|null;
 place(field:VerminfallField,definition:ZoneDef,info:InfestationInfo,run:()=>void):void;
 step<T>(select:()=>()=>T):T;
 mark<T>(select:()=>()=>T):T;
 create(role:NativeVerminfallRole,select:()=>()=>Actor):Actor;
 insert(body:Actor,select:()=>()=>void):void;
}
export interface NativeVerminfallBodyObserver {
 body:Actor;
 current(ctx:KillCtx,role:'nest'|'king'):boolean;
 run(ctx:KillCtx,role:'nest'|'king',run:()=>void):void;
 step<T>(ctx:KillCtx,select:()=>()=>T):T;
 king(ctx:KillCtx,select:()=>()=>Actor):Actor;
}
export type NativeVerminfallRegistration={host:object;observer:NativeVerminfallObserver}|NativeVerminfallBodyObserver;
let consume:((token:object)=>NativeVerminfallRegistration)|undefined;
const hosts=new WeakMap<object,NativeVerminfallObserver>(),bodies=new WeakMap<Actor,NativeVerminfallBodyObserver>();
export function installNativeVerminfallRegistration(reader:NonNullable<typeof consume>):void {
 if(consume)throw Error('Native Verminfall registrar already installed');consume=reader;
}
export function bindNativeVerminfallIdentity(token:object):void {
 if(!consume)throw Error('Native Verminfall registrar missing');const row=consume(token);
 if('host'in row){if(hosts.has(row.host))throw Error('Native Verminfall host already bound');hosts.set(row.host,row.observer);}
 else{if(bodies.has(row.body))throw Error('Native Verminfall body already bound');bodies.set(row.body,row);}
}
export function queryNativeVerminfall(host:object,field:VerminfallField,definition:ZoneDef,select:()=>()=>InfestationInfo|null):InfestationInfo|null {const observer=hosts.get(host);return observer?observer.query(field,definition,select):select()();}
export function placeNativeVerminfall(host:object,field:VerminfallField,definition:ZoneDef,info:InfestationInfo,run:()=>void):void {
 const observer=hosts.get(host);if(observer)observer.place(field,definition,info,run);else run();
}
export function nativeVerminfallStep<T>(host:object,select:()=>()=>T):T {const observer=hosts.get(host);return observer?observer.step(select):select()();}
export function markNativeVerminfallPlacement<T>(host:object,select:()=>()=>T):T {const observer=hosts.get(host);return observer?observer.mark(select):select()();}
export function createNativeVerminfallBody(host:object,role:NativeVerminfallRole,select:()=>()=>Actor):Actor {
 const observer=hosts.get(host);return observer?observer.create(role,select):select()();
}
export function insertNativeVerminfallBody(host:object,body:Actor,select:()=>()=>void):void {
 const observer=hosts.get(host);if(observer)observer.insert(body,select);else select()();
}
export function nativeVerminfallBodyCurrent(ctx:KillCtx,role:'nest'|'king'):boolean {const row=bodies.get(ctx.actor);return row?row.current(ctx,role):!isNativeRetainedKillContext(ctx);}
export function withNativeVerminfallKill(ctx:KillCtx,role:'nest'|'king',run:()=>void):void {
 const row=bodies.get(ctx.actor);if(row)row.run(ctx,role,run);else if(!isNativeRetainedKillContext(ctx))run();
}
export function nativeVerminfallKillStep<T>(ctx:KillCtx,select:()=>()=>T):T {const row=bodies.get(ctx.actor);if(row)return row.step(ctx,select);if(isNativeRetainedKillContext(ctx))throw Error('Native Verminfall kill step needs its issuing body');return select()();}
export function createNativeVerminfallKing(ctx:KillCtx,select:()=>()=>Actor):Actor {
 const row=bodies.get(ctx.actor);if(row)return row.king(ctx,select);if(isNativeRetainedKillContext(ctx))throw Error('Native Verminfall king needs its issuing body');return select()();
}
