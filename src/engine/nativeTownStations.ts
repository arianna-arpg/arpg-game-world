/** Shared native account fold. Retained arrival owns its invocation boundary. */
import type {World} from './world';
import {START_ZONE,ZONES} from '../data/zones';
import {townStationFeatures,townTier,expandedTown} from '../data/townBuild';
export interface NativeTownStationHost {account:World['account'];zoneMap:World['zoneMap'];townTierIdx:World['townTierIdx'];townStationKey:World['townStationKey'];townLayoutChangedOnLoad:World['townLayoutChangedOnLoad'];ownedTownStationsKey:World['ownedTownStationsKey']}
export function nativeOwnedTownStationsKey(host:NativeTownStationHost):string {
    return townStationFeatures().filter(f => host.account.features.has(f)).join('|');
  }
export function nativeRefoldTownStations(host:NativeTownStationHost):void {
    const key = host.ownedTownStationsKey();
    const nextTier = Math.max(host.townTierIdx, townTier(host.account));
    if (key === host.townStationKey && nextTier === host.townTierIdx) return;
    host.townStationKey = key;
    host.townTierIdx = nextTier;
    const grown = expandedTown(host.account, ZONES[START_ZONE], nextTier);
    host.townLayoutChangedOnLoad = host.zoneMap[START_ZONE].size.w !== grown.size.w
      || host.zoneMap[START_ZONE].size.h !== grown.size.h;
    Object.assign(host.zoneMap[START_ZONE], { size: grown.size, fixtures: grown.fixtures,
      layout: grown.layout, layoutParams: grown.layoutParams, exitSiting: grown.exitSiting });
  }
