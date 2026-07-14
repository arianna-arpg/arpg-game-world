// ---------------------------------------------------------------------------
// ACTIVE ENCOUNTER — the engine-side runtime for a live in-zone encounter.
//
// One per placed object in the current zone. ZONE-LOCAL and never serialized:
// it is cleared on every loadZone and freshly rolled. WHETHER one appears and
// its SCALE are rolled from a per-zone seed (manifest seed ^ zone id); the
// POSITION uses the general far-point picker (incidental, like other scatter).
// Nothing here persists — a resumed run restarts at the start zone and re-rolls.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { EncounterDef, EncounterScale } from '../packages/encounters';

export type EncPhase = 'dormant' | 'open' | 'closing';

/** EXTRACT-ONLY runtime riding an ActiveEncounter (def.extract set). One
 *  optional bag keeps plain encounters byte-identical. Zone-local like its
 *  host — a defense abandoned mid-draw resets with the zone. */
export interface ExtractRuntime {
  /** The node body's actor id (a driven, team-player objective). */
  nodeId: number;
  /** The well doodad under it (index-free identity; kind-swapped at end). */
  well?: import('./levelgen').Doodad;
  /** Dwell-to-arm bookkeeping (the realm-gate pattern). */
  dwellStart: number;
  /** Seconds the defense has stood (the payout basis; clock counts down in
   *  the host's `timer`, this counts UP for the fraction math). */
  stood: number;
  /** Next threat re-seed (the standing-disturbance beacon). */
  reseedAt: number;
  /** Zone-entry bearings per swarmer id — "whence they came", for dispersal. */
  entries: Map<number, Vec2>;
  /** Set once the end state resolved (deplete/shatter), before 'closing'. */
  settled?: 'depleted' | 'shattered';
  /** The discovery line spoke once (first attentive approach). */
  spoke?: boolean;
}

export interface ActiveEncounter {
  def: EncounterDef;
  /** The scale rolled at placement (fixes baseTime / radii / spawn cadence). */
  scale: EncounterScale;
  pos: Vec2;
  phase: EncPhase;
  /** Current field radius (grows passively + per kill while open). */
  radius: number;
  /** Seconds left before it closes. */
  timer: number;
  /** Hard ceiling on timer (baseTime + maxBonusTime). */
  maxTimer: number;
  /** Counts down to the next spawn pulse. */
  spawnTimer: number;
  kills: number;
  /** Kill-fed time spent so far (capped at scale.maxBonusTime). */
  bonusUsed: number;
  /** Actor ids spawned by this encounter (so their kills feed it even if they
   *  wander out of the radius). */
  spawned: Set<number>;
  /** Extract-mode runtime (def.extract) — absent on plain encounters. */
  ex?: ExtractRuntime;
}
