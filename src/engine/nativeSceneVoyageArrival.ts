/** Native voyage arrival fragments. The retained coordinator supplies their actual crossing scope. */
import type {NativeAreaBirthHost} from './nativeAreaBirth';
import {vec} from '../core/math';
import {VOYAGE_CFG,VOYAGE_ZONE_ID} from '../world/voyage';
export type NativeVoyageArrivalHost=Pick<NativeAreaBirthHost,'wraithsailSeaStash'|'voyage'|'player'|'sim'|'streamCoast'>;
export function sceneResumeVoyageArrival(host:NativeVoyageArrivalHost,zoneId:string):void {
    if (zoneId === VOYAGE_ZONE_ID && host.wraithsailSeaStash) {
      const stash = host.wraithsailSeaStash;
      host.wraithsailSeaStash = null;
      host.voyage = stash.run;
      host.voyage.grace = VOYAGE_CFG.castOffGrace;
      host.voyage.landDwell = 0;
      host.voyage.lastStreamAt = vec(Infinity, Infinity);
      host.player.pos = vec(stash.pos.x, stash.pos.y);
      host.sim.wraithsailField?.onBoardingLeft();
      host.streamCoast(true);
    }
}
/** Original World.loadZone surface-only abandonment branch, after native visit marking. */
export function sceneAbandonVoyageAtSurface(host:Pick<NativeVoyageArrivalHost,'wraithsailSeaStash'|'sim'>):void {
      if (host.wraithsailSeaStash) {
        host.wraithsailSeaStash = null;
        host.sim.wraithsailField?.onBoardingLeft();
      }
}
