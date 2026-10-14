/** Finite area contract consumed by the existing vessel and corpse desks. */
import type {World,Seat} from '../src/engine/world';
import {seatLadderOf,shardSpotOf} from '../src/engine/shardRoads';
import type {SeatWorlds} from './simUnits';
export type VesselArea=Pick<World,'actors'|'addSeat'|'adoptQuestLedger'|'adoptSeatMeta'|'dealTravellerFlasks'|'inCave'|'manifest'|'markMetaDirty'|'massRuntime'|'packQuestLedger'|'removeSeat'|'restoreCompanions'|'restoreThrong'|'seatEject'|'seatHero'|'seatKills'|'seats'|'stripCarryOf'|'zone'|'zoneMap'|'time'|'ledger'|'annexFound'|'liteKindOf'|'clampPos'|'dropGearAt'|'drops'|'dwellReachable'|'ownSpoils'|'pickupFeed'|'seatIdle'|'storyPair'>&{
 readonly companionBonds:Pick<World['companionBonds'],'saved'>;
 readonly lite:Pick<World['lite'],'countOwned'>;
 addCorpseFlash:World['flashes']['push'];
 readonly shardWorld:{readonly key:string}|undefined;
 shardSpotOf(seat:Seat):ReturnType<typeof shardSpotOf>;
 seatLadderOf(seat:Seat):ReturnType<typeof seatLadderOf>;
};
export interface VesselSeatAreas {
 readonly vesselAreas:true;
 keeperWorld():VesselArea;
 worldOf(id:string):VesselArea|undefined;
 seatOf(id:string):Seat|undefined;
 allSeats():Seat[];
 together(a:string,b:string):boolean;
 within<T>(id:string,fn:(area:VesselArea)=>T):T|undefined;
}
/** The legacy registry keeps its actual World receiver and pin lifetime. */
export function legacyVesselAreas(units:SeatWorlds):VesselSeatAreas {
 const cache=new WeakMap<World,VesselArea>();
 const area=(world:World):VesselArea=>{const old=cache.get(world);if(old)return old;const view={} as VesselArea;
 for(const key of ["actors","addSeat","adoptQuestLedger","adoptSeatMeta","dealTravellerFlasks","inCave","manifest","markMetaDirty","massRuntime","packQuestLedger","removeSeat","restoreCompanions","restoreThrong","seatEject","seatHero","seatKills","seats","stripCarryOf","zone","zoneMap","time","ledger","annexFound","liteKindOf","clampPos","dropGearAt","drops","dwellReachable","ownSpoils","pickupFeed","seatIdle","storyPair"] as const)Object.defineProperty(view,key,{enumerable:true,get:()=>{const selected=world[key];return typeof selected==='function'?((...args:unknown[])=>Reflect.apply(selected,world,args)):selected;}});
 const controller=(key:'companionBonds'|'lite',method:'saved'|'countOwned')=>{const receiver=world[key];return Object.freeze(Object.defineProperty({},method,{get:()=>{const selected=Reflect.get(receiver,method);return(...args:unknown[])=>Reflect.apply(selected,receiver,args);}}));};
 Object.defineProperties(view,{companionBonds:{get:()=>controller('companionBonds','saved')},lite:{get:()=>controller('lite','countOwned')},addCorpseFlash:{get:()=>{const raw=world.flashes,fn=raw.push;return(...items:Parameters<World['flashes']['push']>)=>Reflect.apply(fn,raw,items);}},shardWorld:{get:()=>world.shardWorld},shardSpotOf:{value:(seat:Seat)=>shardSpotOf(world,seat)},seatLadderOf:{value:(seat:Seat)=>seatLadderOf(world,seat)}});Object.freeze(view);cache.set(world,view);return view;};
 return Object.freeze({vesselAreas:true as const,keeperWorld:()=>area(units.keeperWorld()),worldOf:(id:string)=>{const w=units.worldOf(id);return w&&area(w);},seatOf:(id:string)=>units.seatOf(id),allSeats:()=>units.allSeats(),together:(a:string,b:string)=>units.together(a,b),within:<T>(id:string,fn:(w:VesselArea)=>T)=>units.within(id,w=>fn(area(w)))});
}
export function vesselSeatAreas(units:VesselSeatAreas|SeatWorlds):VesselSeatAreas{return 'vesselAreas' in units?units:legacyVesselAreas(units);}
