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

/** dormant → open → (veil only) collapsing → (fed court door only) door → closing.
 *  Plain encounters keep the classic open → closing hop. */
export type EncPhase = 'dormant' | 'open' | 'collapsing' | 'door' | 'closing';

/** One VEILED KNOT (def.veil): a pre-rolled spawn point on the far shore,
 *  waiting for the rim to uncover it. Never serialized (zone-local, re-rolled
 *  deterministically from the encounter stream on every load). */
export interface VeilKnot {
  pos: Vec2;
  /** Distance from the field center (knots sort by this — the uncover cursor
   *  walks the array as the radius grows). */
  d: number;
  /** Bodies this knot tears through when activated (scale.spawnBatch roll). */
  n: number;
}

/** VEIL runtime riding an ActiveEncounter (def.veil set). One optional bag
 *  keeps plain encounters byte-identical (the ExtractRuntime pattern). */
export interface VeilRuntime {
  /** Every knot, sorted by d ascending. */
  knots: VeilKnot[];
  /** First not-yet-uncovered index (cursor into `knots`). */
  cursor: number;
  /** Uncovered knots waiting on fieldCap room (indices, FIFO). */
  pending: number[];
  /** Widest the rim ever reached (the uncovered-fraction basis: reward bonus
   *  + the court door threshold read peak / scale.maxRadius). */
  peakRadius: number;
  /** Radius at collapse start (the shrink is collapseFrom → 0 over
   *  veil.collapseSec). */
  collapseFrom: number;
  /** Shards of the far shore this field left standing (evaporate at collapse). */
  shards: import('./levelgen').Doodad[];
  /** The door-threshold announcement spoke once (mid-fight). */
  deepened?: boolean;
}

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

/** BOROUGH-ONLY runtime riding an ActiveEncounter (def.borough set). Zone-
 *  local like its host — a settlement abandoned mid-muster resets with the
 *  zone (the movers doctrine; only the SPENT ground and the refugees who
 *  made it out persist, on the BoroughField overlay). */
export interface BoroughRuntime {
  /** Where the open phase stands: the countdown, the pour, the mop-up. */
  stage: 'muster' | 'assault' | 'grace';
  /** Actor ids of every villager stood up at materialize (dead ones stay
   *  listed — survivors = the living subset). */
  folkIds: number[];
  /** Seconds the assault has run (the swarm director's ramp basis). */
  stood: number;
  /** Next threat re-seed (the standing-peril beacon, extraction idiom). */
  reseedAt: number;
  /** Mop-up deadline once the spawner lapses (time-based). */
  graceUntil: number;
  /** Zone-entry bearings per horde body — "whence they came", for dispersal. */
  entries: Map<number, Vec2>;
  /** Per-horde-body fixated villager (re-picked when the quarry falls). */
  quarry: Map<number, number>;
  /** ARMING ledger per folk id: gear gifts given + essence stacks per tint.
   *  (What the panel shows; the mods themselves live on the folk's sheet.) */
  arms: Map<number, { gifts: number; stacks: Record<string, number> }>;
  /** Arming dwell bookkeeping: folk id → dwell start time (0 = not building),
   *  and the one-ask-per-approach latch (cleared when reach is left). */
  armDwellStart: Map<number, number>;
  armAsked: Set<number>;
  /** Set once the end state resolved, before 'closing'. */
  settled?: 'held' | 'lost';
}

export interface ActiveEncounter {
  def: EncounterDef;
  /** The scale rolled at placement (fixes baseTime / radii / spawn cadence). */
  scale: EncounterScale;
  pos: Vec2;
  phase: EncPhase;
  /** Optional HUD-bar label override (a staged encounter re-titles its bar:
   *  "the horde comes" vs "hold the line"). Absent = scale.label. */
  hudLabel?: string;
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
  /** Borough-mode runtime (def.borough) — absent on plain encounters. */
  bo?: BoroughRuntime;
  /** Veil-mode runtime (def.veil) — absent on plain encounters. */
  veil?: VeilRuntime;
  /** The rolled court lord id (def.court; courtLordForZone — the same pure
   *  roll the map marker makes). Absent = no court fields this zone. */
  lordId?: string;
  /** The standing door to the lord's domain ('door' phase only). */
  doorAt?: Vec2;
}
