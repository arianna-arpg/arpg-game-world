/** Bound retained bodies keep their identity even after their reign or owner ends. */
import type {Actor} from './actor';
import type {KillCtx} from './killHandlers';
import type {WarlordState} from '../world/warlord';
export interface NativeWarlordObserver {place(lord:WarlordState,run:()=>void):void;create(run:()=>Actor):Actor;beforePush(actors:Actor[],body:Actor):void;push(body:Actor):void}
export type NativeWarlordRegistration={host:object;observer:NativeWarlordObserver}|{body:Actor;current:(ctx:KillCtx)=>boolean;break:(ctx:KillCtx)=>boolean};
let consume:((token:object)=>NativeWarlordRegistration)|undefined;
const retainedKills=new WeakSet<KillCtx>();
/** Read-only recognition of the genuine combat-operation receipt; grants no context. */
export function isNativeRetainedKillContext(ctx:KillCtx):boolean {return retainedKills.has(ctx);}
let consumeKill:((token:object)=>KillCtx)|undefined;
export function installNativeWarlordKillRegistration(reader:NonNullable<typeof consumeKill>):void {if(consumeKill)throw Error('Native crown kill registrar already installed');consumeKill=reader;}
export function bindNativeWarlordKillContext(token:object):void {if(!consumeKill)throw Error('Native crown kill registrar missing');const ctx=consumeKill(token);if(retainedKills.has(ctx))throw Error('Native crown kill context already bound');retainedKills.add(ctx);}
const hosts=new WeakMap<object,NativeWarlordObserver>(),bodies=new WeakMap<Actor,Extract<NativeWarlordRegistration,{body:Actor}>>();
export function installNativeWarlordRegistration(reader:NonNullable<typeof consume>):void {if(consume)throw Error('Native crown registrar already installed');consume=reader;}
export function bindNativeWarlordIdentity(token:object):void {if(!consume)throw Error('Native crown registrar missing');const r=consume(token);if('host' in r){if(hosts.has(r.host))throw Error('Native crown host already bound');hosts.set(r.host,r.observer);}else{if(bodies.has(r.body))throw Error('Native crown body already bound');bodies.set(r.body,r);}}
export function observeNativeWarlordPlacement(host:object,lord:WarlordState,run:()=>void):void {const r=hosts.get(host);if(r)r.place(lord,run);else run();}
export function observeNativeWarlordCreation(host:object,run:()=>Actor):Actor {const r=hosts.get(host);return r?r.create(run):run();}
/** Preserve the selected native array method, checking identity after its getter
 * and before invoking it. Effects inside the returned callable remain native. */
export function pushNativeWarlordBody(host:object,actors:Actor[],body:Actor):void {const push=actors.push;hosts.get(host)?.beforePush(actors,body);Reflect.apply(push,actors,[body]);}
export function observeNativeWarlordPush(host:object,body:Actor):void {hosts.get(host)?.push(body);}
export function nativeWarlordCurrent(ctx:KillCtx):boolean {const r=bodies.get(ctx.actor);return r?r.current(ctx):!retainedKills.has(ctx);}
export function breakNativeWarlord(ctx:KillCtx):boolean {const r=bodies.get(ctx.actor);if(r)return r.break(ctx);if(retainedKills.has(ctx))return false;ctx.sim.warlord.onWarlordKilled(ctx.actor.faction!,ctx.time,ctx.simView());return true;}
