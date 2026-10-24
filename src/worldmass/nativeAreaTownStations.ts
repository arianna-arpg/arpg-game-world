import type {World} from '../engine/world';
import {nativeOwnedTownStationsKey,nativeRefoldTownStations,type NativeTownStationHost} from '../engine/nativeTownStations';
const hosts=new WeakMap<World,NativeTownStationHost>();
/** Uses the real writer's monotone tier and account fold, never an area copy. */
export function nativeTownStationWriterHost(writer:World):NativeTownStationHost{
 let host=hosts.get(writer);if(host)return host;
 host={get account(){return writer.account;},get zoneMap(){return writer.zoneMap;},
  get townTierIdx(){return writer['townTierIdx'];},set townTierIdx(v){writer['townTierIdx']=v;},
  get townStationKey(){return writer['townStationKey'];},set townStationKey(v){writer['townStationKey']=v;},
  get townLayoutChangedOnLoad(){return writer['townLayoutChangedOnLoad'];},set townLayoutChangedOnLoad(v){writer['townLayoutChangedOnLoad']=v;},
  ownedTownStationsKey(){return nativeOwnedTownStationsKey(this);}};
 hosts.set(writer,host);return host;
}
export function foldNativeTownStations(writer:World):void{nativeRefoldTownStations(nativeTownStationWriterHost(writer));}
