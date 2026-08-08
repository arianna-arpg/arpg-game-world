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
//   - 'trickle' — the RECURRING BROOD: one body per everySec below cap —
//                 a husk at your feet ('near') or straight into the
//                 roster ('roster'); disarmed at cap, full wait to re-arm.
// New source kinds = one union row + one branch in the world executor.
//
// SOURCES ARE GRAFTABLE (SupportDef.throngSource): a socketed gem ADDS a
// source row to its anchor — the world-found Palewisps GAIN a battle gauge
// by socket choice, any anchor gains a trickle. Effective rows resolve as
// authored-first + grafts-after (World.throngSources), so authored pocket
// indices — and their run-long claim keys — can never shift under a gem.
// THE FIND LEVERS (stats, read on the keeper with the anchor's context):
// `throngPockets` appends flat extra pockets per zone AFTER the authored
// rolls; `throngYield` multiplies the BODY COUNT of every mint event
// (cluster, gauge yield, mote, trickle, crit/kill raisings) — quanta-
// rounded, never below 1.
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
import type { SkillDef, SkillInstance } from './skills';
import { STAT_DEFS } from './stats';

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

/** THE RECURRING BROOD: one body per `everySec` seconds while the anchor
 *  is slotted and the roster stands below cap — the reknitting-hive
 *  texture as a SOURCE row, so any anchor (or any graft gem) can wear it.
 *  `at` picks the grain: 'near' (default) condenses a HUSK at the
 *  keeper's feet — a stoop, the collection thesis kept — 'ring' drops it
 *  in the mote near-band AROUND the keeper (a short walk: the find
 *  scattered on your road, the worn brood's grain), while 'roster'
 *  replenishes the roster DIRECTLY, no walk (the truest "X per second").
 *  `count` husks condense per beat (default 1, quanta — throngYield still
 *  folds on top); husk drops linger `ttl` seconds (default
 *  THRONG_CFG.motes.ttl). At cap the clock stands DISARMED and re-arms
 *  with a full wait when a body is lost — the brood takes time, never
 *  banks it. ONE trickle row per anchor (the first wins — the motes
 *  one-clock law). */
export interface ThrongTrickleRow {
  kind: 'trickle';
  everySec: number;
  at?: 'near' | 'roster' | 'ring';
  count?: number;
  ttl?: number;
}

export type ThrongSourceRow =
  | ThrongPocketRow | ThrongMoteRow | ThrongCritRow | ThrongKillRow
  | ThrongGaugeRow | ThrongTrickleRow;

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
  /** THE LITE TIER (engine/lite.ts): 'lite' seats the gathered roster in
   *  the packed pool — rows, not minions. Claims spawn rows, the direct
   *  sweep marches the cloud by one stamped mark, and bodies PROMOTE to
   *  real actors only at the interaction boundaries (the latch, the grab,
   *  the conducted order), demoting back when quiet. The monsterId should
   *  carry MonsterDef.lite (the validator warns otherwise). Omitted =
   *  classic full-actor roster, byte-identical. */
  tier?: 'lite';
  /** THE UNTAMED STANCE: this throng picks its OWN fights — a world-side
   *  drive re-aims each body at the nearest foe near the keeper on a
   *  beat, through the standing assault-order machinery (obedience, the
   *  quarry pin and the heel exemption all arrive from the command
   *  fabric). With nothing in reach the order lapses and the body heels
   *  like any minion. Worn anchors (WORN_THRONGS) sit off the bar, so no
   *  held sweep ever conducts them — the drive is their only voice. */
  untamed?: { huntRadius?: number };
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
  /** THE UNTAMED STANCE defaults (ThrongSpec.untamed): the engagement
   *  reach around the KEEPER inside which the drive hunts (each body
   *  takes its own nearest foe within it), and how long each self-issued
   *  assault order stands before the next beat re-aims or lapses it. */
  untamed: { huntRadius: 420, orderSec: 1.6 },
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

// --- THE WORN THRONG (item-granted anchors) ---------------------------------
//
// A throng that needs NO bar skill: a registered WornThrongDef binds a
// whole gathered-swarm identity to one ordinary stat (`wornThrong_<id>`)
// that any modifier source can grant — an MI implicit, an affix family, a
// unique line, a passive. While the stat stands above zero on a keeper,
// the world derives a SYNTHETIC off-bar anchor (a real SkillInstance of a
// def built here — never in the SKILLS catalog, never castable, never
// learnable) whose ThrongSpec is the def's dials FOLDED BY THE RANK: the
// stat's value scales the brood clock (frequency), the bodies per beat
// (number), and the roster cap + husk linger (density) through the pure
// folds below, quanta-rounded where bodies are counted. Everything else —
// the walk-through claim, the batch-scaled owner fold, the disband
// release, husks-never-gate-clears — is the standing fabric verbatim,
// because the anchor IS an ordinary anchor to every consumer that meets
// it. The SupportDef.throngSource gem graft is this seam's precedent, one
// grain up: the gem grafts a source onto a bar anchor, the worn row
// grafts the whole anchor onto a body of gear.
//
// Debut: the abyssal Monster Infrequents' UNTAMED BROOD
// (data/infrequents.ts) — dormant broodlings condense in a ring around
// the wearer, join innately underfoot, and hunt on their own drive.

export interface WornThrongDef {
  /** Registry key; the granting stat is `wornThrong_<id>`. */
  id: string;
  /** Display name — the stat label and the synthetic anchor's name. */
  name: string;
  /** The gathered body (MonsterDef id). */
  monsterId: string;
  /** UI color for the synthetic anchor. */
  color: string;
  /** Base roster cap at rank 1 (minionMaxCount folds on top, the
   *  standing cap law) + growth per rank beyond 1 — half the DENSITY
   *  axis. Quanta-rounded at the fold. */
  cap: number;
  capPerRank: number;
  /** The brood clock at rank 1 and its FREQUENCY axis: period =
   *  everySec / (1 + freqPerRank × (rank − 1)), floored at
   *  everyFloorSec so no stack of ranks reaches machine-gun. */
  everySec: number;
  everyFloorSec: number;
  freqPerRank: number;
  /** The NUMBER axis: husks per beat = round(1 + countPerRank ×
   *  (rank − 1)), never below 1 (quanta — throngYield folds on top). */
  countPerRank: number;
  /** Unclaimed-husk linger at rank 1 + growth per rank — the other half
   *  of the DENSITY axis (finds persist longer on the road behind you). */
  ttlSec: number;
  ttlPerRank: number;
  /** The untamed drive's engagement reach around the keeper. */
  huntRadius: number;
  /** Owner-investment divisor override (default THRONG_CFG.batch). */
  batch?: number;
}

/** The open registry (the ThrongSourceRow pattern at item grain). */
export const WORN_THRONGS: Record<string, WornThrongDef> = {};

/** Register a worn throng + its granting stat's display identity. */
export function registerWornThrong(def: WornThrongDef): void {
  WORN_THRONGS[def.id] = def;
  STAT_DEFS[wornThrongStat(def.id)] = { label: def.name, base: 0, min: 0 };
}

/** The granting stat — ordinary, so ANY modifier source can wear it. */
export function wornThrongStat(id: string): string {
  return 'wornThrong_' + id;
}

/** The synthetic anchor's skill id (namespaced: no catalog skill may ever
 *  collide with it, and save rows round-trip through the same string). */
export function wornThrongSkillId(id: string): string {
  return 'worn:' + id;
}

/** Parse a worn anchor skill id back to its registry def (undefined for
 *  ordinary skill ids). */
export function wornThrongDefOfSkillId(skillId: string): WornThrongDef | undefined {
  return skillId.startsWith('worn:') ? WORN_THRONGS[skillId.slice(5)] : undefined;
}

// The rank folds — pure, monotone, quanta-honest where bodies are counted.
export function wornThrongPeriod(def: WornThrongDef, rank: number): number {
  return Math.max(def.everyFloorSec,
    def.everySec / (1 + def.freqPerRank * Math.max(0, rank - 1)));
}
export function wornThrongCount(def: WornThrongDef, rank: number): number {
  return Math.max(1, Math.round(1 + def.countPerRank * Math.max(0, rank - 1)));
}
export function wornThrongTtl(def: WornThrongDef, rank: number): number {
  return def.ttlSec * (1 + def.ttlPerRank * Math.max(0, rank - 1));
}
export function wornThrongCap(def: WornThrongDef, rank: number): number {
  return Math.max(1, Math.round(def.cap + def.capPerRank * Math.max(0, rank - 1)));
}

/** Build the synthetic anchor def at a rank: a legal SkillDef that never
 *  enters SKILLS — worn, not pressed (the delivery is claw-shaped inert
 *  filler; nothing ever casts it). The world re-points an existing
 *  instance's def at this when the rank moves, so state clocks and the
 *  roster marker survive gear churn. */
export function buildWornThrongDef(def: WornThrongDef, rank: number): SkillDef {
  return {
    id: wornThrongSkillId(def.id), name: def.name,
    description: `${def.name}: dormant kin condense nearby and join you underfoot — untamed, they hunt on their own.`,
    tags: ['minion', 'throng'], color: def.color,
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'melee', range: 42, arcDeg: 80 },
    effects: [],
    noDrop: true,
    throng: {
      monsterId: def.monsterId,
      cap: wornThrongCap(def, rank),
      sources: [{
        kind: 'trickle', at: 'ring',
        everySec: wornThrongPeriod(def, rank),
        count: wornThrongCount(def, rank),
        ttl: wornThrongTtl(def, rank),
      }],
      batch: def.batch,
      untamed: { huntRadius: def.huntRadius },
    },
  };
}

/** The husk kinds a wearer's GEAR reveals (the sight gate's worn half —
 *  unioned with the bar's throngSightSet by the renderer). */
export function wornThrongKindsOf(
  a: { sheet: { get(stat: string): number } },
): Set<string> {
  const out = new Set<string>();
  for (const def of Object.values(WORN_THRONGS)) {
    if (a.sheet.get(wornThrongStat(def.id)) > 0) out.add(def.monsterId);
  }
  return out;
}
