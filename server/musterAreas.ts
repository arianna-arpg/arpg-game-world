/** Finite native muster view; the legacy adapter retains genuine SimUnit objects. */
import type {World} from '../src/engine/world';
import type {Vec2} from '../src/core/math';
import {entryLanding,type RoadTicket} from '../src/engine/shardUnits';
import type {SimUnit,UnitRegistry} from './simUnits';
export interface MusterArea {readonly key:string;readonly broken:boolean;readonly world:Pick<World,'zone'|'time'|'seats'|'musterRings'>}
export interface MusterAreas<TDestination> {
 readonly musterAreas:true;
 unitOf(id:string):MusterArea|undefined;
 unit(key:string):MusterArea|undefined;
 each():readonly MusterArea[];
 run<T>(area:MusterArea,action:()=>T):T;
 enqueue(ticket:RoadTicket<TDestination>):void;
 publish(area:MusterArea,rows:World['musterRings']):void;
 entryLanding(destination:TDestination,from:string|null):Vec2;
}
export function legacyMusterAreas(units:UnitRegistry):MusterAreas<World>{return Object.freeze({musterAreas:true as const,unitOf:(id:string)=>units.unitOf(id),unit:(key:string)=>units.unit(key),each:()=>units.each(),run:<T>(area:MusterArea,fn:()=>T):T=>{if(units.unit(area.key)!==area)throw Error('Legacy muster needs its actual current unit');return units.run(area as SimUnit,fn);},enqueue:(t:RoadTicket)=>units.enqueue(t),publish:(area:MusterArea,rows:World['musterRings'])=>{if(units.unit(area.key)!==area)throw Error('Legacy muster publication needs its actual unit');area.world.musterRings=rows;},entryLanding});}
export function musterAreas<TDestination>(units:UnitRegistry|MusterAreas<TDestination>):MusterAreas<TDestination>{return 'musterAreas' in units?units:legacyMusterAreas(units) as unknown as MusterAreas<TDestination>;}
