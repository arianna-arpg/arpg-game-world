/** Exact native surface-arrival consequence after defeating the Necropolis.
 * Area reward contexts remain with their actual realm owner; this overlay is global. */
import type {World} from './world';
export function sceneNecropolisSurfaceArrival(nativeHost:Pick<World,'sim'|'notice'>):void {
      if (nativeHost.sim.deadwakeField?.necropolisInfo()?.defeated) {
        nativeHost.sim.deadwakeField.cullNecropolis();
        nativeHost.notice('The Necropolis crumbles behind you — the tides disperse, the cycle begins anew.', '#e8dcb0', 17, 'events');
      }
}
