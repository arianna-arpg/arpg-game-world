/** Exact native leave-time memory capture. Autosave uses its separate pure snapshot. */
import type {World} from './world';
import {bumpLedger} from '../packages/ledger';
import type {NativeSceneMemoryCaptureHost} from './nativeSceneMemory';
export interface NativeSceneDepartureMemoryHost extends NativeSceneMemoryCaptureHost {
 adoptedZonePending:boolean;forgetMemoryOnLeave:boolean;ritualSite:World['ritualSite'];sim:World['sim'];ledger:World['ledger'];actorById:World['actorById'];
}
export function sceneCaptureZoneMemory(host:NativeSceneDepartureMemoryHost):void {
    // A just-adopted save owns the memories. The bootstrap scene must not
    // overwrite its row on the first resume load.
    if (host.adoptedZonePending) { host.adoptedZonePending = false; return; }
    const z = host.zone;
    if (host.forgetMemoryOnLeave) {
      host.forgetMemoryOnLeave = false;
      if (z) host.zoneMemory.delete(z.id);
      return;
    }
    const memo = host.zoneMemorySnapshot();
    if (!z || !memo) return; // same skip rules as ever (snapshot owns them)
    // CONCLAVE: leaving a zone with a live ritual. If ALL its cultists still stand,
    // the rite INCUBATES (the hidden Eldritch counter ticks toward an awakening); if
    // the player thinned but didn't clear them, the disrupted site simply disperses.
    // Either way the cultists migrate on — they are never zone-memory captured below
    // (not fromZoneGen), so the site is gone and a fresh one re-rolls elsewhere.
    // (A LEAVE-time verb — deliberately outside zoneMemorySnapshot, which the
    // autosave serializer calls while still STANDING in the zone.)
    if (host.ritualSite && !host.ritualSite.subdued && host.ritualSite.zoneId === z.id) {
      const cf = host.sim.conclaveField;
      let alive = 0;
      for (const id of host.ritualSite.cultistIds) { const a = host.actorById(id); if (a && !a.dead) alive++; }
      if (alive >= host.ritualSite.cultistIds.length) {
        cf?.incubate(z.id);
        bumpLedger(host.ledger, 'rituals_incubated');
      } else {
        cf?.clearRitual(z.id);
      }
    }
    host.zoneMemory.set(z.id, memo);
  }
