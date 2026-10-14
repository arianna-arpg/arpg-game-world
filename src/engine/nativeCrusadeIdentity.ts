/** Retained event identity is observational; original unbound World behavior stays native. */
import type {Actor} from './actor';
import type {KillCtx} from './killHandlers';
import type {CrusadeInfo} from '../packages/overlays/crusade';
export interface NativeCrusadeObserver {place(info:CrusadeInfo,run:()=>void):void;create(run:()=>Actor):Actor}
export type NativeCrusadeRegistration={host:object;observer:NativeCrusadeObserver}|{body:Actor;current:(ctx:KillCtx)=>boolean;resolve:(ctx:KillCtx)=>number};
let consume:((token:object)=>NativeCrusadeRegistration)|undefined;
const hosts=new WeakMap<object,NativeCrusadeObserver>(),bodies=new WeakMap<Actor,Extract<NativeCrusadeRegistration,{body:Actor}>>();
export function installNativeCrusadeRegistration(reader:NonNullable<typeof consume>):void {if(consume)throw Error('Native Crusade registrar already installed');consume=reader;}
export function bindNativeCrusadeIdentity(token:object):void {if(!consume)throw Error('Native Crusade registrar missing');const r=consume(token);if('host'in r){if(hosts.has(r.host))throw Error('Native Crusade host already bound');hosts.set(r.host,r.observer);}else{if(bodies.has(r.body))throw Error('Native Crusade body already bound');bodies.set(r.body,r);}}
export function observeNativeCrusadePlacement(host:object,info:CrusadeInfo,run:()=>void):void {const r=hosts.get(host);if(r)r.place(info,run);else run();}
export function observeNativeCrusadeCreation(host:object,run:()=>Actor):Actor {const r=hosts.get(host);return r?r.create(run):run();}
export function nativeCrusadeCommanderCurrent(ctx:KillCtx):boolean {const r=bodies.get(ctx.actor);return r?r.current(ctx):true;}
export function resolveNativeCrusadeCommander(ctx:KillCtx):number {const r=bodies.get(ctx.actor);return r?r.resolve(ctx):ctx.sim.crusadeField?.resolveCrusadeZone(ctx.zone.id)??1;}
