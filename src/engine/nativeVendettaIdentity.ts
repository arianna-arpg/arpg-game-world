/** Only the genuine retained owner can bind; ordinary World remains unbound. */
import type {Actor} from './actor';
import type {ZoneDef} from '../data/zones';
import type {AmbushSpec,VendettaField} from '../packages/overlays/vendetta';
import {consumeNativeVendettaRegistration} from '../worldmass/nativeAreaSceneVendettaLifetime';
export interface NativeVendettaRegistration {host:object;place(field:VendettaField,definition:ZoneDef,spec:AmbushSpec,run:()=>void):void;create(select:()=>()=>Actor):Actor}
const hosts=new WeakMap<object,NativeVendettaRegistration>();
export function bindNativeVendettaIdentity(token:object):void {const r=consumeNativeVendettaRegistration(token);if(hosts.has(r.host))throw Error('Native Vendetta host already bound');hosts.set(r.host,r);}
export function placeNativeVendetta(host:object,field:VendettaField,definition:ZoneDef,spec:AmbushSpec,run:()=>void):void {const r=hosts.get(host);if(r)r.place(field,definition,spec,run);else run();}
export function createNativeVendettaBody(host:object,select:()=>()=>Actor):Actor {const r=hosts.get(host);return r?r.create(select):select()();}
