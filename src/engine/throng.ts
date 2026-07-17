// ---------------------------------------------------------------------------
// THE THRONG FABRIC — the swarm you GATHER, not the swarm you cast.
//
// The Pikmin/Overlord playstyle as open data. One skill anchors one throng
// (SkillDef.throng): while the skill sits on the bar it REVEALS that kind's
// unclaimed bodies in the world — dormant, untouchable husks only an attuned
// eye can see — and walking through one CLAIMS it: the body wakes, joins the
// roster, and follows. COLLECTION IS THE MECHANIC: the army is found, spent
// by attrition, and steered by the skill's own held channel (each channel
// pulse re-aims the whole roster at the cursor through the command fabric's
// assault orders — the Overlord sweep).
//
// HOW BODIES APPEAR is the playstyle axis, authored per skill as open
// ThrongSourceRow data:
//   - 'pocket'  — finite finds rolled per zone on a salted stream (the
//                 puzzle/scenery boot idiom); claimed pockets are remembered
//                 RUN-LONG (World.throngClaimed, the completedObjectives
//                 idiom) so the world genuinely runs dry where you've reaped.
//   - 'motes'   — bodies condense on a clock while the skill is slotted:
//                 near you, at a far reach of the zone (go fetch), or at
//                 your last kill site. Unclaimed motes evaporate (ttl).
//   - 'onCrit'  — your critical strikes shake one loose (chance, icd).
//   - 'onKill'  — your credited kills raise one at the corpse (chance).
//   - 'gauge'   — hits (yours / your minions' / both) fill a per-instance
//                 gauge that mints a batch at full — THE ADD-LESS BOSS
//                 FALLBACK: rares and lone bosses still feed the throng.
// New source kinds = one union row + one branch in the world executor.
//
// BALANCE DOCTRINE (the quadratic killer): throng bodies are ordinary
// minions in every pipeline — supports, statuses, commands — but the
// owner's minion-stat investment folds onto each body at 1/batch
// (batchScaleOf: ThrongSpec.batch ?? THRONG_CFG.batch), so five gathered
// bodies wear ONE classic minion's worth of scaling and a 30-body cloud
// cannot compound flat adds into a deleting wall. Meta command payloads
// (minionCast) delegate to the NEAREST throng body only (THRONG_CFG.
// metaDelegate) — one voice, one actor, never fifty executes.
//
// The roster is anchored to its skill by sourceSkillId '__throng:<id>'
// (the '__companion:' convention): sweep-exempt, minionServes-visible,
// portal-crossing like any owned body. Unslotting the skill RELEASES the
// roster where it stands — bodies fall back to wild husks you (or a
// build that re-slots) can gather again. Nothing is silently deleted.
//
// PURE-LEAF DISCIPLINE (the fog.ts pattern): this module holds the specs,
// the config and the pure math; the runtime lives in world.ts's marked
// THRONG block (boot/claim/tick/direct executors) because claiming mints
// real actors through createMonster/bakeMinionOwnerStats. The renderer
// asks ONE question (throngSightSet) to gate husk drawing per viewer.
// Docs: docs/engine/throng.md. Probe: balance/probe_throng.ts.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { SkillInstance } from './skills';

// --- Source rows (the playstyle axis) ---------------------------------------

/** Finite per-zone finds: `perZone` pockets roll on the throng's salted
 *  stream at zone boot, each a cluster of husks; `chance` gates whether a
 *  given zone has any at all (default 1). Claimed pockets never return
 *  this run — the world runs dry where you've reaped. */
export interface ThrongPocketRow {
  kind: 'pocket';
  perZone: [number, number];
  cluster: [number, number];
  chance?: number;
}

/** Intermittent condensation while the skill is slotted. `at` picks the
 *  spot: 'near' (a stroll), 'far' (an expedition across the zone),
 *  'lastKill' (the battle line you just left), 'mixed' (a coin-flip of
 *  near/far — the wandering-herd texture). Unclaimed motes evaporate
 *  after `ttl` seconds (default THRONG_CFG.motes.ttl). */
export interface ThrongMoteRow {
  kind: 'motes';
  every: [number, number];
  at: 'near' | 'far' | 'lastKill' | 'mixed';
  ttl?: number;
}

/** Your critical strikes shake a husk loose beside the struck foe. */
export interface ThrongCritRow { kind: 'onCrit'; chance: number; icd?: number }

/** Your credited kills raise a husk at the corpse. */
export interface ThrongKillRow { kind: 'onKill'; chance: number }

/** Hits fill a per-instance gauge; at full it mints `yield` husks beside
 *  the owner. `per` says whose hits feed it — the add-less boss fallback. */
export interface ThrongGaugeRow {
  kind: 'gauge';
  per: 'hit' | 'minionHit' | 'both';
  /** Gauge points per qualifying hit (gauge is full at 100). */
  fill: number;
  yield: [number, number];
}

export type ThrongSourceRow =
  | ThrongPocketRow | ThrongMoteRow | ThrongCritRow | ThrongKillRow | ThrongGaugeRow;

// --- The spec ---------------------------------------------------------------

/** SkillDef.throng — one skill, one throng. */
export interface ThrongSpec {
  /** The gathered body (MonsterDef id). Husk sight-gating keys on it. */
  monsterId: string;
  /** Base roster cap. Folded through the OWNER's minionMaxCount exactly
   *  like a summon's maxActive — +1-minion investment and Endless Swarm
   *  grow the throng with no throng-specific stat. */
  cap: number;
  /** How bodies appear — the playstyle axis (see rows above). */
  sources: ThrongSourceRow[];
  /** The held channel's sweep behavior (defaults in THRONG_CFG.direct). */
  direct?: { radius?: number; linger?: number };
  /** Batch-normalization denominator override (default THRONG_CFG.batch):
   *  owner minion-stat investment folds onto each body at 1/batch. */
  batch?: number;
}

// --- Config -----------------------------------------------------------------

/** THE THRONG FABRIC's modular thresholds — tune HERE, never inline. */
export const THRONG_CFG = {
  /** Husk-placement stream salt (distinct from puzzles 0x9c7a11 and
   *  scenery 0x0f17c5 — the three lanes never move each other's rolls). */
  salt: 0x7a51c3,
  /** Walking within reach of a sighted husk claims it (world units,
   *  added to the two radii). The Pikmin pluck — movement, not a button. */
  collect: { reach: 26 },
  /** Default batch denominator: five throng bodies ≈ one classic minion's
   *  worth of owner investment. */
  batch: 5,
  /** The held sweep: each channel pulse orders the roster to the cursor.
   *  `pin` = foe-snap radius at the aim (the command fabric's quarry pin);
   *  `linger` = seconds orders persist after the channel drops. */
  direct: { radius: 170, linger: 4, pin: 60 },
  /** Mote condensation: near-band distances, far minimum, default ttl. */
  motes: { near: [110, 240] as [number, number], farMin: 640, ttl: 45 },
  /** Pocket boot: placement reach off the leftover-POI stream, the door
   *  clearance a pocket keeps (interactSpot's clear), and the scatter
   *  radius of a cluster's husks around its heart. */
  pocket: { reach: 680, portalClear: 220, scatter: 34 },
  /** onCrit default in-combat icd (seconds) when the row omits one. */
  critIcd: 0.5,
  /** Meta command payloads (minionCast) execute on this many NEAREST
   *  throng bodies instead of the whole roster. One voice, one actor. */
  metaDelegate: 1,
  /** The loose ring a heeling throng keeps around its keeper: base
   *  distance, per-body spread, and the slow orbit (rad/sec) that keeps
   *  the cloud breathing instead of stacking into one dot. */
  heelRing: { dist: 46, spread: 30, spin: 0.22 },
  /** Claim flourish text color. */
  joinColor: '#9fe08a',
} as const;

// --- Pure helpers (world.ts and the renderer consume these) -----------------

/** Every slotted throng anchor on a bar (order preserved). */
export function throngSpecsOn(
  skills: readonly (SkillInstance | null)[],
): { inst: SkillInstance; spec: ThrongSpec }[] {
  const out: { inst: SkillInstance; spec: ThrongSpec }[] = [];
  for (const s of skills) {
    if (s?.def.throng) out.push({ inst: s, spec: s.def.throng });
  }
  return out;
}

/** The monster kinds a viewer's bar can SEE as husks (the sight gate —
 *  the renderer's one question). */
export function throngSightSet(
  skills: readonly (SkillInstance | null)[],
): Set<string> {
  const set = new Set<string>();
  for (const s of skills) {
    if (s?.def.throng) set.add(s.def.throng.monsterId);
  }
  return set;
}

/** The roster anchor marker (the '__companion:' convention's sibling). */
export function throngMarkerOf(skillId: string): string {
  return '__throng:' + skillId;
}

/** 1/batch — the owner-investment fold scale for one throng body. */
export function batchScaleOf(spec: ThrongSpec): number {
  return 1 / Math.max(1, spec.batch ?? THRONG_CFG.batch);
}

/** Deterministic loose-ring heel offset for one throng body: a stable
 *  per-actor seat angle (id-hashed) walking a slow orbit, at a distance
 *  ring that widens with the seat hash. Pure — ai.ts folds it into the
 *  heel goal so a 30-body cloud trails as a CLOUD, not a conga dot. */
export function throngHeelOffset(
  a: Actor, time: number, out: { x: number; y: number },
): void {
  const h = (a.id * 2654435761) >>> 0;
  const ang = ((h & 0xffff) / 0xffff) * Math.PI * 2 + time * THRONG_CFG.heelRing.spin;
  const ring = THRONG_CFG.heelRing.dist
    + ((h >>> 16) / 0xffff) * THRONG_CFG.heelRing.spread;
  out.x = Math.cos(ang) * ring;
  out.y = Math.sin(ang) * ring;
}

/** Is this body part of ANY throng (claimed, not husk)? */
export function isThrongBody(a: Actor): boolean {
  return a.sourceSkillId !== undefined && a.sourceSkillId.startsWith('__throng:');
}

/** The stable claim key for a pocket husk (zone + anchor skill + pocket
 *  index + seat in the cluster) — the run-long finiteness fact in
 *  World.throngClaimed. Skill-scoped so two throng builds never collide. */
export function throngPocketKey(
  zoneId: string, skillId: string, pocket: number, seat: number,
): string {
  return `${zoneId}#${skillId}#${pocket}.${seat}`;
}

/** A stable per-skill stream salt (FNV-1a): each anchor skill's pocket
 *  rolls ride their OWN salted stream, so slotting a second throng skill
 *  can never shift the first one's spots between visits — the claim keys
 *  stay honest under any bar churn. */
export function throngSkillSalt(skillId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < skillId.length; i++) {
    h ^= skillId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
