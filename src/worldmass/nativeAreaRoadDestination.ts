/** Narrow callback surface for a real retained destination during ticket execution.
 * This type does not issue authority; only the actual coordinator's private
 * synchronous ticket frame may expose its implementation to selected callbacks. */
import type {World} from '../engine/world';
import type {ShardWorldLink} from '../engine/shardUnits';
import type {NativeAreaDirectoryView} from './nativeAreaDirectoryView';
export interface NativeAreaRoadDestination extends NativeAreaDirectoryView {
 readonly entryLanding:(from?:string|null)=>import('../core/math').Vec2;
 readonly waypointPos:World['waypointPos'];
 readonly caveEntrances:World['caveEntrances'];
 readonly massRuntime:null;
 readonly shardWorld:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined;
 readonly findFreeSpot:World['findFreeSpot'];
 readonly seatHero:World['seatHero'];
 realmContext:World['realmContext'];
 crusadeRealmContext:World['crusadeRealmContext'];
 necropolisRealmContext:World['necropolisRealmContext'];
 fractureRealmContext:World['fractureRealmContext'];
}
export type NativeAreaRealmContextTarget=Pick<NativeAreaRoadDestination,'realmContext'|'crusadeRealmContext'|'necropolisRealmContext'|'fractureRealmContext'>;
