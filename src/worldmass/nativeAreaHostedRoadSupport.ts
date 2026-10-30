/** The native harbor landing body with exact selected-area providers. */
import type {Seat,World} from '../engine/world';
import type {Vec2} from '../core/math';
import {angleTo,vec} from '../core/math';
import {harborLandPartyAt,type NativeSceneHarborHost} from '../engine/nativeSceneHarbor';
import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
function own<T>(o:object,k:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native hosted landing needs ordinary data: '+String(k));return d.value as T;}
/** Exact entryLanding algorithm over the actual area's finite geometry. */
export function nativeHostedEntryLanding(host:Pick<World,'exits'|'arena'> & {readonly zoneEntry:Vec2},from?:string|null):Vec2 {
  const back = from ? host.exits.find(e => e.to === from) : undefined;
  if (!back) { const e = host.zoneEntry; return vec(e.x, e.y); }
  const ang = angleTo(back.pos, vec(host.arena.w / 2, host.arena.h / 2));
  return vec(back.pos.x + Math.cos(ang) * 120, back.pos.y + Math.sin(ang) * 120);
}
export function landNativeHostedSeat(area:NativeAreaSceneOngoing,seat:Seat,at:Vec2,opts:Parameters<World['landPartyAt']>[1],check:()=>void):void {
 check();const point={x:own<number>(at,'x'),y:own<number>(at,'y')};if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw Error('Native hosted landing needs finite coordinates');
 const options:NonNullable<typeof opts>={};if(opts)for(const key of ['spread','band','clamp','tier'] as const){const d=Object.getOwnPropertyDescriptor(opts,key);if(!d)continue;if(!Object.hasOwn(d,'value'))throw Error('Native hosted landing options must be ordinary');Object.defineProperty(options,key,{value:d.value,enumerable:true,configurable:true});}if(options.band){const pair=[own<number>(options.band,0),own<number>(options.band,1)] as const;Object.defineProperty(options,'band',{value:pair,enumerable:true});}
 check();const geometry=area.assembly.input.geometry,base=area.assembly.input.harbor.host,host=Object.create(base) as NativeSceneHarborHost,body=seat.actor,cohort=Object.freeze([seat]);
 for(const [key,value]of [['player',body],['seats',cohort]] as const)Object.defineProperty(host,key,{get:()=>{check();return value;}});
 for(const key of ['actors','partyLand'] as const)Object.defineProperty(host,key,{get:()=>{check();const value=base[key];check();return value;}});
 Object.defineProperty(host,'clampPos',{get:()=>{check();const fn=geometry.clampPos;check();return(...args:Parameters<World['clampPos']>)=>{check();const value=Reflect.apply(fn,geometry,args);check();return value;};}});
 Object.defineProperty(host,'tierViews',{get:()=>{check();const views=geometry.tierViews;check();if(!views)return views;const story=options.tier??0,selected={};Object.defineProperty(selected,story,{get:()=>{check();const view=views[story];check();if(!view)return view;const methods={};for(const key of ['isWalkable','snapToWalkable'] as const)Object.defineProperty(methods,key,{get:()=>{check();const fn=view[key];check();return(...args:unknown[])=>{check();const value=Reflect.apply(fn,view,args);check();return value;};}});return Object.freeze(methods);}});return selected;}});
 check();harborLandPartyAt(host,point,options);check();
}
