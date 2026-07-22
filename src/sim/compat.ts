// ---------------------------------------------------------------------------
// THE SKILL × SUPPORT INTERACTION MATRIX — "what works with what, measured."
//
// Two layers answer the three questions a compatibility pass asks:
//
//   1. THE CENSUS (static, whole catalog, milliseconds): every droppable
//      skill × every support through the REAL socket gate
//      (supportFitsInst / crewSkillsServed — the same functions the game's
//      socket UI calls). Verdicts: fits the host lane, fits only by boarding
//      a summon's crew, or refused. Refused pairs are additionally screened
//      for MECHANICAL AFFINITY — the skill's delivery provably HAS a
//      mechanic the support demands, but the tag list doesn't say so
//      (a projectile-shaped delivery without the 'projectile' tag). Those
//      are the "should work but doesn't SOCKET" candidates.
//
//   2. THE PROBES (runtime, budgeted): for fitting pairs, one bare episode
//      and one socketed episode at the SAME seed. The engine is
//      deterministic, so the pair's full-precision behavioral fingerprint
//      (metrics.ts Collector.fingerprint) is byte-identical iff the gem
//      changed NOTHING observable — hash equality is a definitive INERT
//      verdict, no statistics needed. Divergent pairs are classified by
//      which channel lanes moved: OUTPUT/DEFENSE beyond noise = effective,
//      COST alone = cost_only (a tax with no observed function — the
//      partial-no-op bucket), nothing beyond noise = negligible
//      (indeterminate; escalate seeds/duration before claiming anything).
//      Those are the "sockets but doesn't WORK" candidates.
//
// Static read-site expectations (data/graftReadSites.ts — shared with the
// boot validator) annotate both layers, so an INERT finding arrives with the
// engine read-site that explains it.
//
// Everything here is browser-safe and registry-driven: probe selection,
// channel lanes, noise thresholds, and mechanical evidence are all open data
// in this file — extend them, don't special-case callers.
// ---------------------------------------------------------------------------

import { MONSTERS } from '../data/monsters';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { PROCS } from '../data/procs';
import { unreadPayloadRows } from '../data/graftReadSites';
import {
  SUPPORT_PAYLOAD_FIELDS, crewSkillsServed, effectiveSkillLevel, mechanismHolds,
  makeSkillInstance, minionSeatBoundFields, summonCrewOf, supportFitsInst,
  supportRidesMinions,
  type SkillDef, type SupportDef,
} from '../engine/skills';
import type { Modifier, SkillTag } from '../engine/stats';
import { CLASSES } from '../data/classes';
import { gemLevelAt } from './data/builds';
import { runScenario } from './runner';
import { PILOT_CFG } from './pilots';
import type { BuildSpec, EpisodeResult, ScenarioDef } from './types';

// ------------------------------------------------------------------ config --

/** Open knobs for the matrix. Every threshold a triage decision leans on
 *  lives here, never inline. */
export const COMPAT_CFG = {
  /** Character level the probe rig plays at (mana headroom for cost
   *  multipliers; matches the fortune-probe band). */
  level: 12,
  /** Support gem level socketed in probes (entry magnitude — the question is
   *  "does it function", not "how hard does it scale"). */
  supportLevel: 1,
  /** Dummy probe: sim-seconds vs the immortal target. */
  dummyDuration: 10,
  /** Live probe: sim-seconds against the respawning pack. */
  liveDuration: 20,
  /** Live probe pack: id × count, re-spawned every `everySec`. `levelBonus`
   *  lifts the pack ABOVE the rig's parity level so its hits still WOUND
   *  through the pinned-40s mitigation (measured 2026-07-15: parity zombies
   *  landed 9 hits for dmg_in 0 — a woundless "under damage" probe blinds
   *  every wound-conditioned host: thirst-gated drinks, guard value, heals). */
  livePack: { id: 'zombie', count: 2, everySec: 8, levelBonus: 6 },
  /** FODDER pack (the kill lane, 2026-07-21): kill-scoped payloads need
   *  bodies that actually DIE — the wounding pack's levelBonus makes it
   *  too tanky for modest-dps hosts to kill inside the episode (measured:
   *  frost_nova, 0 kills in 20s), which read every kill-proc falsely
   *  inert. Below-parity, faster-cycling bodies keep kills flowing. */
  fodderPack: { id: 'zombie', count: 3, everySec: 5, levelBonus: -4 },
  /** Probe target stand-off (px) for the dummy. */
  dummyDistance: 70,
  /** Live-pack spawn distance (px): CLOSE, so the fight is joined within
   *  the first beat — wound-conditioned hosts (thirst-gated drinks, guard
   *  value, heal value) need incoming hits EARLY, not after a stroll. */
  liveDistance: 120,
  /** CORPSE FEEDER for corpse-consuming hosts: they cannot bootstrap their
   *  own fuel (nothing dies until something casts — measured 2026-07-15:
   *  every corpse pair incl. long-shipped sacrificial_rites read INERT with
   *  zero casts). Bodies laid along the battle line every beat, dense
   *  enough that a multi-corpse appetite (corpseBatch) has a pile to
   *  distinguish itself on. */
  corpseFeed: { everySec: 1.5, count: 2 },
  /** A channel "moved" when |Δ| > noiseAbs AND |Δ|/max(|bare|,1) > noiseRel.
   *  Fraction-valued channels carry their own abs floor (CHANNEL_NOISE_ABS)
   *  — the global one is sized for raw damage/count lanes and would squash
   *  a [0,1] channel entirely. */
  noiseRel: 0.02,
  noiseAbs: 0.5,
  /** Default per-run episode budget (bare baselines + pair probes). The
   *  census always covers everything; probes cover what the budget allows,
   *  round-robin across supports, and the report states coverage honestly. */
  budgetEpisodes: 4000,
  /** THE FLIGHT RANGE (2026-07-22, menu 2a): geometry for flight-branch
   *  probes. A collinear trio down the +x fire line (chain hops, pierce
   *  bores, forks find flanks), one lateral offset body (homing bends,
   *  breathing radii clip), and a two-rock masonry stub OFF the fire line
   *  (ricochet banks, unspent flights die and bloom) that wall-scoped
   *  payloads aim at directly. */
  range: {
    standoff: 200, spacing: 130, offsetDeg: 24,
    wall: { bearingDeg: -35, distance: 260, radius: 26 },
    /** THE GRAZE LANE (projPulse): a body parked ONE SWELL outside the
     *  flight's base touch, beside the fire line at `along` px — the base
     *  radius misses it, the swollen phase clips it. `gapFrac` sets the
     *  gap as a fraction of the flight's radius (must sit inside the
     *  pulse amplitude, ±40%). `along` is chosen INSIDE the caster band
     *  so the pilot stands still (a nearer body would trigger the kite). */
    graze: { along: 170, gapFrac: 0.2 },
  },
};

// ------------------------------------------------------------- the census --

/** Evidence that a skill HAS a mechanic, independent of its tag list. Each
 *  row is conservative and cites its proof — census suspects quote it.
 *  Extend when a new tag-gated mechanic ships. */
export const MECHANIC_EVIDENCE: { tag: SkillTag; has: (def: SkillDef) => boolean; evidence: string }[] = [
  // detonateProjectile deliberately absent from 'projectile' evidence: it
  // CONSUMES a flight already in the air (Cold Snap pops your fireball), it
  // fires none of its own — the tag refusal there is honest vocabulary.
  { tag: 'projectile', has: d => d.delivery.type === 'projectile', evidence: 'delivery fires flights' },
  // Cones deliberately absent from 'aoe' evidence: the tag is a SCALING
  // identity (aoe investment applies), not hit geometry — narrow thrusts
  // and drain threads are cones that honestly refuse area gems, while the
  // beam family (3° arcs!) opts IN. Novas/storms/grounds have no such
  // split: area IS their identity. (2026-07-12 census triage: all four
  // untagged cones checked out as design, zero as hygiene.)
  { tag: 'aoe', has: d => ['nova', 'storm', 'ground', 'detonateProjectile'].includes(d.delivery.type), evidence: 'delivery is area-shaped' },
  { tag: 'melee', has: d => d.delivery.type === 'melee', evidence: 'delivery is a swing' },
  { tag: 'movement', has: d => ['dash', 'blink', 'leap'].includes(d.delivery.type), evidence: 'delivery moves the caster' },
  { tag: 'summon', has: d => d.delivery.type === 'summon', evidence: 'delivery mints minions' },
  { tag: 'minion', has: d => d.delivery.type === 'summon', evidence: 'delivery mints minions' },
  { tag: 'totem', has: d => d.delivery.type === 'construct', evidence: 'delivery deploys a construct' },
  { tag: 'channel', has: d => !!d.channel, evidence: 'carries a channel spec' },
  { tag: 'guard', has: d => d.castMode === 'guard', evidence: 'castMode is a guard stance' },
  {
    tag: 'duration',
    has: d => (d.delivery.type === 'ground' && (d.delivery.lingerDuration ?? 0) > 0),
    evidence: 'ground delivery lingers',
  },
];

export interface CensusRow {
  skillId: string;
  supportId: string;
  fit: 'host' | 'crew' | 'refused';
  /** Refused, but the skill provably has a demanded mechanic (tag hygiene
   *  suspect — the "should socket but doesn't" lane). */
  suspect?: { tag: string; evidence: string }[];
  /** Fits, but these payloads have no read-site on this delivery (static
   *  inert expectation — quoted beside runtime INERT findings). */
  unread?: { key: string; site: string }[];
}

export interface CensusResult {
  skills: string[];
  supports: string[];
  rows: CensusRow[];               // every pair, in (support, skill) order
  counts: { host: number; crew: number; refused: number; suspects: number; unreadPairs: number };
}

const skillLookup = (id: string): SkillDef | undefined => SKILLS[id];

/** The canonical pair key every matrix surface shares (ledger, resume files,
 *  shard bookkeeping): `skill|support`. */
export const pairKey = (skill: string, support: string): string => `${skill}|${support}`;

/** Refused-pair mechanical-affinity screen. Exclusion-tag refusals are
 *  deliberate design; only tag-ABSENCE refusals with mechanical proof are
 *  suspects. Shared by the census and the pair dossier — one truth. */
export function suspectEvidence(def: SkillDef, sup: SupportDef): { tag: string; evidence: string }[] | undefined {
  const suspect: { tag: string; evidence: string }[] = [];
  for (const t of sup.requiresTags ?? []) {
    // Only ABSENT tags can be hygiene suspects — a pair whose tags all
    // stand was refused by a MECHANISM (a deliberate structural gate,
    // the strikes floor et al.), and there is no tag to teach. (Latent
    // until the mechanism gates grew: tag-only refusals always had an
    // absent tag by construction.)
    if (def.tags.includes(t)) continue;
    const ev = MECHANIC_EVIDENCE.find(e => e.tag === t && e.has(def));
    if (ev) suspect.push({ tag: t, evidence: ev.evidence });
  }
  const excluded = (sup.excludeTags ?? []).some(t => def.tags.includes(t));
  return suspect.length && !excluded ? suspect : undefined;
}

/** The whole catalog through the real gate. `skillFilter`/`supportFilter`
 *  narrow by substring (the CLI's --filter/--support). */
export function compatCensus(skillFilter = '', supportFilter = ''): CensusResult {
  const skills = Object.values(SKILLS)
    .filter(s => !s.noDrop && (!skillFilter || s.id.includes(skillFilter)))
    .map(s => s.id).sort();
  const supports = Object.keys(SUPPORTS)
    .filter(id => !supportFilter || id.includes(supportFilter)).sort();
  const rows: CensusRow[] = [];
  const counts = { host: 0, crew: 0, refused: 0, suspects: 0, unreadPairs: 0 };
  for (const supportId of supports) {
    const sup = SUPPORTS[supportId];
    for (const skillId of skills) {
      const def = SKILLS[skillId];
      // A bare instance — pairs that only fit through ANOTHER gem's grants
      // are loadout-time compositions, deliberately out of census scope
      // (same stance as the boot validator).
      const inst = makeSkillInstance(def, 1, 3);
      const crew = summonCrewOf(def.delivery.type === 'summon' ? def.delivery : undefined,
        id => MONSTERS[id], id => SKILLS[id]);
      const host = supportFitsInst(sup, inst);
      const viaCrew = !host && crewSkillsServed(sup, inst, crew) !== null;
      const row: CensusRow = { skillId, supportId, fit: host ? 'host' : viaCrew ? 'crew' : 'refused' };
      if (row.fit === 'refused') {
        counts.refused++;
        const suspect = suspectEvidence(def, sup);
        if (suspect) { row.suspect = suspect; counts.suspects++; }
      } else {
        counts[row.fit]++;
        const unread = unreadPayloadRows(sup, def, skillLookup)
          .map(r => ({ key: String(r.key), site: r.site }));
        if (unread.length) { row.unread = unread; counts.unreadPairs++; }
      }
      rows.push(row);
    }
  }
  return { skills, supports, rows, counts };
}

// ------------------------------------------------------------- the probes --

/** When a pair needs LIVE bodies instead of the immortal dummy: the host's
 *  shape demands kills/corpses/incoming-hits, or the support's payload does.
 *  Open registries — one entry per reason, each naming itself for reports. */
export const LIVE_PROBE_HOST_RULES: { why: string; when: (def: SkillDef) => boolean }[] = [
  { why: 'summon host (minion AI ignores passive dummies)', when: d => d.delivery.type === 'summon' },
  { why: 'minion-tagged host', when: d => d.tags.includes('minion') },
  { why: 'corpse-consuming host', when: d => d.tags.includes('corpse') },
  { why: 'guard host (value shows against incoming hits)', when: d => d.castMode === 'guard' || d.tags.includes('guard') },
  { why: 'heal host (value shows under damage)', when: d => d.tags.includes('heal') },
  { why: 'buff host (defensive value shows under damage)', when: d => d.tags.includes('buff') },
];

/** THE RIG AXIS (orthogonal to dummy/live targets): SOLO spams the host as
 *  the only skill on the bar — natural cadence, cleanest signal, right for
 *  anything that deals its own damage. ESCORT rides the 'pair' pilot: a
 *  reference attack fills (steady hits = trigger events, curse
 *  exploitation, buff beneficiary) while the host is tapped on a metronome
 *  — right for utility hosts whose value only shows through someone else's
 *  output, and forced by event-hungry support payloads. */
export const ESCORT_HOST_RULES: { why: string; when: (def: SkillDef) => boolean }[] = [
  { why: 'utility delivery (self/aura) — value shows through the escort', when: d => d.delivery.type === 'self' || d.delivery.type === 'aura' },
  { why: 'buff host', when: d => d.tags.includes('buff') },
  { why: 'curse host — the escort exploits the mark', when: d => d.tags.includes('curse') },
  { why: 'heal host', when: d => d.tags.includes('heal') },
  { why: 'guard host — the stance guards while the escort works', when: d => d.castMode === 'guard' || d.tags.includes('guard') },
  { why: 'warcry host', when: d => d.tags.includes('warcry') },
];
export const FORCE_ESCORT_SUPPORT_FIELDS: (keyof SupportDef)[] = [
  // Event-raising latches: the host stops being castable; the escort's
  // hits/crits/kills ARE the event stream that fires it.
  'trigger', 'triggerPermit',
  // Drawn-curse conversions: the escort's hits carry the curse.
  'curseOnHit',
];

export function rigModeFor(def: SkillDef, sup?: SupportDef): { mode: 'solo' | 'escort'; why?: string } {
  const hostRule = ESCORT_HOST_RULES.find(r => r.when(def));
  if (hostRule) return { mode: 'escort', why: hostRule.why };
  if (sup) {
    const f = FORCE_ESCORT_SUPPORT_FIELDS.find(k => sup[k] !== undefined);
    if (f) return { mode: 'escort', why: `support payload '${String(f)}' needs the escort's event stream` };
  }
  return { mode: 'solo' };
}

/** Deliveries measured AT RANGE (flight-distance payloads — trails, homing,
 *  pierce chains — need air under the shot; the caster pilot holds its band).
 *  Everything else closes to melee (novas, swings, stances). */
export const RANGED_DELIVERIES: ReadonlySet<string> = new Set([
  'projectile', 'detonateProjectile', 'storm', 'ground', 'target', 'mark',
  'construct', 'summon', 'detonate',
]);

export function soloPilotFor(def: SkillDef): { kind: 'caster' } | { kind: 'brawler' } {
  return RANGED_DELIVERIES.has(def.delivery.type) ? { kind: 'caster' } : { kind: 'brawler' };
}
export const LIVE_PROBE_SUPPORT_FIELDS: (keyof SupportDef)[] = [
  'dominate', 'corpseSpawn', 'brood', 'devour', 'sacrifice', 'minionAura',
  'minionAuraPool', 'spawnBuff', 'summon', 'turret', 'spreadOnHit',
  'contagion', 'madden', 'healField', 'resonance',
];

/** THE DEFENSIVE/SUSTAIN STAT LANE — the dummy never swings back, so a gem
 *  whose mods touch these stats can only show its worth under INCOMING
 *  wounds: the probe routes LIVE (the wounding pack's levelBonus exists
 *  exactly to land real damage through the pinned-40s mitigation). Open
 *  set, grouped by how each family reaches the fingerprint. The pack leans
 *  physical, so pure elemental-resist readings are guarded by a blindness
 *  rule below instead of minting false inerts. */
export const LIVE_PROBE_SUPPORT_STATS: ReadonlySet<string> = new Set([
  // mitigation + avoidance → dmg_in / evades_in / blocks_in
  'armor', 'evasion', 'blockChance', 'blockValue', 'blockPower',
  // pools + recovery → life_floor / life_end (the fractions move under wounds)
  'life', 'lifeRegen', 'lifeRegenPct',
  'energyShield', 'esRechargeRate', 'esRechargeDelay', 'esRechargeSteadfast',
  'wardGain', 'wardDecay', 'wardLeech',
  // the poise read: damage reduction + stagger continuity
  'poise', 'poiseDR', 'poiseRegenPct', 'poiseCcAvoid',
  // sustain: refills need something missing; thorns answers the attacker
  'lifeLeech', 'manaLeech', 'lifeOnHit', 'thorns',
  // resists (see the physical-leaning-pack blindness rule)
  'fireRes', 'coldRes', 'lightningRes', 'chaosRes',
]);

/** KILL-SCOPED & MULTI-BODY payload rules (2026-07-21 backlog triage): the
 *  immortal dummy never dies and sits centered in every shape, so payloads
 *  that fire on KILLS (kill-trigger procs, on-kill charge taps, orb/remnant
 *  sheds), that need HIGHER-LEVEL victims (the pack's levelBonus stands
 *  above the rig), or that read only at AREA EDGES / on displaced bodies
 *  (aoe geometry, knockback) route LIVE. Open registry — one entry per
 *  reason, each naming itself for reports. */
export const LIVE_PROBE_SUPPORT_RULES: {
  why: string; when: (sup: SupportDef) => boolean;
  /** 'fodder' routes to the below-parity KILLABLE pack (COMPAT_CFG.fodderPack)
   *  — kill-scoped payloads need kill THROUGHPUT, not wounding tankiness. */
  pack?: 'fodder';
}[] = [
  {
    why: 'kill-trigger proc payload needs kills — the fodder pack keeps them flowing',
    pack: 'fodder',
    when: sup => [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
      m.stat.startsWith('proc_') && PROCS[m.stat.slice('proc_'.length)]?.trigger === 'kill'),
  },
  {
    why: 'on-kill/on-death charge tap needs deaths in the arena — the fodder pack supplies them',
    pack: 'fodder',
    when: sup => (sup.chargeGain ?? []).some(cg => cg.on === 'kill' || cg.on === 'enemyDeath'),
  },
  {
    why: 'kill-shed payload (orb/remnant families) needs kills — the fodder pack supplies them',
    pack: 'fodder',
    when: sup => [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
      m.stat === 'orbShedRate' || m.stat.startsWith('orbOnKill_') || m.stat.startsWith('remnantDrop_')
      || m.stat === 'remnantChance' || m.stat === 'remnantOnCast'),
  },
  {
    why: "'overmatch' needs higher-level victims — the live pack's levelBonus stands above the rig",
    when: sup => [...sup.mods, ...(sup.perLevel ?? [])].some(m => m.stat === 'overmatch'),
  },
  {
    why: 'area-geometry payload (radius/shape/spin/scatter) reads at area EDGES and across bodies — the centered dummy sits inside every shape',
    when: sup => [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
      ['aoeRadius', 'aoeShape', 'aoeSpin', 'aoeScatter'].includes(m.stat)),
  },
  {
    why: 'knockback payload moves bodies — displacement only matters against bodies that can be displaced and re-hit',
    when: sup => [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
      m.stat === 'knockback' || m.stat === 'knockBuffet'),
  },
  {
    // The power lane (2026-07-21): non-damaging ailment potency reads
    // through victim BEHAVIOR — a deeper chill closes slower, a stun stops
    // the blows — which the anchored, passive dummy can never express.
    why: 'ailment-potency payload (statusMagnitude) reads through victim behavior — moving, striking live bodies express slows and locks the anchored dummy cannot',
    when: sup => [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
      m.stat === 'statusMagnitude' || m.stat === 'ailmentStacks'),
  },
];

export function probeKindFor(def: SkillDef, sup?: SupportDef): { kind: 'dummy' | 'live'; why?: string; pack?: 'fodder' } {
  const hostRule = LIVE_PROBE_HOST_RULES.find(r => r.when(def));
  if (hostRule) return { kind: 'live', why: hostRule.why };
  if (sup) {
    const f = LIVE_PROBE_SUPPORT_FIELDS.find(k => sup[k] !== undefined);
    if (f) return { kind: 'live', why: `support payload '${String(f)}' needs live bodies` };
    const m = [...sup.mods, ...(sup.perLevel ?? [])].find(x => LIVE_PROBE_SUPPORT_STATS.has(x.stat));
    if (m) return { kind: 'live', why: `defensive/sustain stat '${m.stat}' shows only under incoming wounds` };
    const rule = LIVE_PROBE_SUPPORT_RULES.find(r => r.when(sup));
    if (rule) return { kind: 'live', why: rule.why, ...(rule.pack ? { pack: rule.pack } : {}) };
  }
  return { kind: 'dummy' };
}

/** THE TRAINING RACK ROUTES (2026-07-22, the uniform-dummy measurement
 *  pass): payloads whose function is a CONTRAST the plain dummy cannot
 *  show probe against a rack sibling instead — conversions aim at the
 *  ward matching their DESTINATION type (the converted share visibly
 *  resisted, so the totals move), the vs-heavier lane aims at the
 *  colossus (the heft read arms). The rack stands in Lastlight's training
 *  yard off the same defs, so the town fixture and the harness measure
 *  ONE truth. A new damage type needs one row here + one rack def. */
export const RESIST_DUMMY_BY_TYPE: Record<string, string> = {
  fire: 'target_dummy_pyre', cold: 'target_dummy_rime',
  lightning: 'target_dummy_storm', chaos: 'target_dummy_void',
};

export function rackDummyFor(sup: SupportDef | undefined): { id: string; why: string } | undefined {
  if (!sup) return undefined;
  for (const m of [...sup.mods, ...(sup.perLevel ?? [])]) {
    const conv = /^convert_[a-z]+_([a-z]+)$/.exec(m.stat);
    if (conv && RESIST_DUMMY_BY_TYPE[conv[1]]) {
      return {
        id: RESIST_DUMMY_BY_TYPE[conv[1]],
        why: `conversion payload '${m.stat}' — the ${conv[1]}-warded rack dummy resists the converted share`,
      };
    }
    if (m.stat === 'giantsbane') {
      return { id: 'target_dummy_colossus', why: "'giantsbane' needs a HEAVIER victim — the colossus outweighs the rig" };
    }
  }
  return undefined;
}

/** THE FLIGHT RANGE ROUTES (menu 2a): flight-branch payloads need ROAD —
 *  neighbors to hop to, air to steer through, masonry to bank off — and
 *  the single centered stand-off dummy supplies none of it. Payloads on
 *  these stats swap the dummy wave for the range formation; WALL-scoped
 *  payloads additionally aim at the rocks (fire into the canyon): the
 *  bank and the unspent-end bloom both need the flight to MEET stone. */
export const RANGE_RIG_STATS = [
  'chainCount', 'projBounce', 'pierceCount', 'forkCount', 'homingPower',
  'guidePower', 'projPulse', 'projReShatter', 'returnShrapnel', 'projInherit',
];
/** Wall-scoped range payloads fire INTO the masonry: the bank and the
 *  unspent-end bloom need the flight to meet stone, and a homing flight
 *  needs an aim ERROR to correct (it self-acquires the nearest body —
 *  fired at the rocks, it bends into the trio; fired at a dummy, it flies
 *  as straight as the bare shot). */
export const RANGE_AIM_WALL_STATS = ['projBounce', 'returnShrapnel', 'homingPower'];
/** Breathing-radius payloads take THE GRAZE LANE: the whole function is a
 *  clip the base radius cannot make, so the formation grows the parked
 *  graze body and the aim pins dead-ahead (a re-targeting pilot would
 *  fire AT the graze body and hit it in both runs). */
export const RANGE_GRAZE_STATS = ['projPulse'];

export function rangeRigFor(sup: SupportDef | undefined): { aimWall: boolean; graze: boolean } | undefined {
  if (!sup || !supModsStat(sup, RANGE_RIG_STATS)) return undefined;
  return {
    aimWall: supModsStat(sup, RANGE_AIM_WALL_STATS),
    graze: supModsStat(sup, RANGE_GRAZE_STATS),
  };
}

/** THE FIELD ESCORT (menu 2b): suffusion/conduction are CROSS-SKILL by
 *  design — the flight must cross another skill's standing field (no
 *  self-loops), which no single-gem probe can raise. Their pairs ride an
 *  escort whose reference is a FIELD-LAYING ground skill on the metronome
 *  (the corpse-feeder stance: supply the fuel, measure the verb) while
 *  the flight host fills from the caster band. */
export const FIELD_ESCORT_STATS = ['suffusion', 'conduction'];

export function fieldEscortFor(sup: SupportDef | undefined): boolean {
  return !!sup && supModsStat(sup, FIELD_ESCORT_STATS);
}

/** The field reference skill, derived (never a hardcoded id): the first
 *  droppable plain-cast elemental GROUND skill with a real linger, in id
 *  order — deterministic under content growth, loudly absent if the
 *  catalog ever loses the class entirely. */
export function fieldReferenceId(): string | null {
  const ids = Object.keys(SKILLS).sort();
  for (const id of ids) {
    const d = SKILLS[id];
    if (d.noDrop || d.castMode || d.channel) continue;
    if (d.delivery.type !== 'ground') continue;
    if ((d.delivery.lingerDuration ?? 0) < 2) continue;
    if (!(['fire', 'cold', 'lightning'] as const).some(t => d.tags.includes(t))) continue;
    if (d.manaCost > 30) continue;
    return id;
  }
  return null;
}

/** PROBE POLICIES — per-payload measurement escalation, as data. A small-
 *  chance payload (crit, lucky) is real but its window is coin-flip narrow
 *  at standard length: two seeds of a 10s episode may roll nothing into a
 *  6% band. Policy pairs run wider and longer so the window gets ROLLS;
 *  the bare baseline runs the SAME escalation (cache-keyed by policy). */
export const PROBE_POLICIES: {
  name: string; when: (sup: SupportDef) => boolean;
  seeds?: number; durationMult?: number;
}[] = [
  {
    name: 'small_chance',
    when: sup => supModsStat(sup, ['critChance', 'critMulti', 'luckyChance', 'dotCrit']),
    seeds: 5, durationMult: 3,
  },
];
export function probePolicyFor(sup: SupportDef | undefined): (typeof PROBE_POLICIES)[number] | undefined {
  return sup ? PROBE_POLICIES.find(p => p.when(sup)) : undefined;
}

/** Probe rig attributes: all ten pinned high so requirement gates never
 *  confound the pairing measurement (the sweep rig's documented stance). */
export const PROBE_ATTRIBUTES: Record<string, number> = {
  strength: 40, prowess: 40, fortitude: 40,
  dexterity: 40, finesse: 40, charisma: 40,
  intelligence: 40, wisdom: 40, willpower: 40,
  vitality: 40,
};

/** The constant REFERENCE ATTACK riding beside every probe host: it supplies
 *  hit/crit events (trigger gems fire), a beneficiary for buffs/auras/curses,
 *  and identical background in both runs so deltas isolate the support.
 *  Derived from the live warrior bar — never a hardcoded id. */
export function referenceAttackId(): string {
  const warrior = CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0];
  const first = warrior?.bar.find((s): s is string => s !== null && !!SKILLS[s]);
  if (!first) throw new Error('compat: no reference attack derivable from class bars');
  return first;
}

/** THE MIXED-DIET FILLERS (comboVaried probes): two derived plain attacks
 *  ≠ the host — the reference attack plus catalog-scanned no-cooldown,
 *  no-castMode strikers — so the bar carries THREE distinct ids and the
 *  cast ring's rolling 3-window can go fully varied (COMBO_CFG
 *  conditionRun). Derived, never hardcoded. */
export function dietFillerIds(hostId: string): [string, string] {
  const picks: string[] = [];
  const consider = (id: string): void => {
    if (picks.length >= 2 || id === hostId || picks.includes(id)) return;
    picks.push(id);
  };
  const ref = referenceAttackId();
  if (SKILLS[ref]) consider(ref);
  for (const s of Object.values(SKILLS)) {
    if (picks.length >= 2) break;
    if (s.noDrop || s.cooldown > 0 || s.castMode || !s.baseDamage) continue;
    if (!(s.tags as readonly string[]).includes('attack')) continue;
    if (s.delivery.type !== 'melee') continue;
    consider(s.id);
  }
  if (picks.length < 2) throw new Error('compat: mixed-diet fillers underivable');
  return [picks[0], picks[1]];
}

export interface ProbeOpts {
  level?: number;
  gemLevel?: number;
  supportLevel?: number;
  duration?: number;       // override BOTH probe kinds' durations
  seeds?: number;
  baseSeed?: number;
  /** The committed host-expression census (balance/baselines/
   *  host_expression.json), when the caller loaded one — probePair's
   *  mute-host blindness screen reads it. Node-side loading only; compat
   *  itself stays browser-safe. */
  hostExpression?: HostExpressionBaseline;
}

/** The registry's resonance key (CREW_CFG 'gated' boarding): crew-fit
 *  probes socket it in BOTH runs so the delta isolates the boarded gem,
 *  never the key. Data-derived — whichever support carries the field. */
export function resonanceKeyId(): string | null {
  return Object.values(SUPPORTS).find(s => s.resonance)?.id ?? null;
}

/** The probe rig. SOLO: the host is the whole bar (the sweep rig's proven
 *  shape — natural cadence, zero pollution). ESCORT: host in slot 0, the
 *  reference attack in slot 1, driven by the 'pair' pilot. Class picked by
 *  the sweep's rule (spell→magician else warrior). */
export function probeBuild(
  skillId: string, supports: { id: string; level: number }[], label: string,
  mode: 'solo' | 'escort', opts: ProbeOpts,
  /** Escort reference override — the FIELD escort's derived ground-layer
   *  rides here in place of the reference attack. */
  refIdOverride?: string,
): BuildSpec {
  const def = SKILLS[skillId];
  const level = opts.level ?? COMPAT_CFG.level;
  const gemLevel = opts.gemLevel ?? gemLevelAt(level);
  const tags = def.tags as readonly string[];
  const classId = tags.includes('spell') ? 'magician' : 'warrior';
  const skills: BuildSpec['skills'] = [
    { id: skillId, level: gemLevel, rarity: 'rare', supports: supports.length ? supports : undefined },
  ];
  const ref = refIdOverride ?? referenceAttackId();
  if (mode === 'escort' && skillId !== ref) skills.push({ id: ref, level: gemLevel });
  // FOUNT SEEDING (BuildSpec.charges): orbPickup-banked economies never fill
  // in a probe — no orb ever falls in the arena — so a drink-shaped host
  // read byte-identical with EVERY gem it carried (the 2026-07-14 flask-lane
  // false-INERT triage). Seed each such bank to its own spec'd cap, in the
  // BARE and the SOCKETED run alike: the probe asks "does the drink DO
  // anything", never "does the economy fill". Kill/hit/channel-fed banks
  // stay unseeded — the live probe's bodies feed those honestly.
  const charges: Record<string, number> = {};
  for (const cg of def.chargeGain ?? []) {
    if (cg.on === 'orbPickup') {
      charges[cg.charge] = Math.max(charges[cg.charge] ?? 0, cg.max ?? 1);
    }
  }
  return {
    id: `compat_${skillId}__${label}`,
    label: `compat probe — ${skillId} (${label})`,
    classId,
    level,
    attributes: PROBE_ATTRIBUTES,
    skills,
    bar: skills.map(s => s.id),
    ...(Object.keys(charges).length ? { charges } : {}),
  };
}

export function probeScenario(
  skillId: string, support: { id: string; level: number } | null, opts: ProbeOpts,
  /** Force probe shape / socket a resonance key beside the gem — the matrix
   *  pins a pair's BARE baseline to the same shape the socketed run uses
   *  (a trigger-forced escort pair diffs against an escort bare; a crew-fit
   *  pair diffs key-vs-key so the boarding door is open in both runs; a
   *  rack-routed pair diffs against a bare aimed at the SAME rack dummy). */
  forced?: {
    probe?: 'dummy' | 'live'; rig?: 'solo' | 'escort'; withKey?: boolean; pack?: 'fodder';
    dummyId?: string; bled?: boolean; range?: boolean; aimWall?: boolean; fieldRef?: boolean;
    graze?: boolean; comboDiet?: boolean;
  },
): ScenarioDef {
  const def = SKILLS[skillId];
  if (!def) throw new Error(`compat: unknown skill '${skillId}'`);
  if (support && !SUPPORTS[support.id]) throw new Error(`compat: unknown support '${support.id}'`);
  const sup = support ? SUPPORTS[support.id] : undefined;
  const probe = forced?.probe
    ? { kind: forced.probe, ...(forced.pack ? { pack: forced.pack } : {}) } as ReturnType<typeof probeKindFor>
    : probeKindFor(def, sup);
  const fieldRef = forced?.fieldRef ?? fieldEscortFor(sup);
  const rig = forced?.rig ? { mode: forced.rig } as ReturnType<typeof rigModeFor>
    : fieldRef ? { mode: 'escort' } as ReturnType<typeof rigModeFor>
      : rigModeFor(def, sup);
  const dummyId = forced?.dummyId ?? rackDummyFor(sup)?.id ?? 'target_dummy';
  const bled = forced?.bled
    ?? ((sup ? supModsStat(sup, BLED_RIG_STATS) : false) || def.tags.includes('heal'));
  const comboDiet = forced?.comboDiet
    ?? (sup ? [...sup.mods, ...(sup.perLevel ?? [])].some(m => m.when === 'comboVaried') : false);
  const rr = forced?.range !== undefined
    ? { range: !!forced.range, aimWall: !!forced.aimWall, graze: !!forced.graze }
    : (() => {
      const r = probe.kind === 'dummy' ? rangeRigFor(sup) : undefined;
      const caroms = (def.delivery as { caroms?: unknown }).caroms !== undefined;
      return { range: !!r, aimWall: !!r?.aimWall && !caroms, graze: !!r?.graze };
    })();
  const supports: { id: string; level: number }[] = [];
  const keyId = forced?.withKey ? resonanceKeyId() : null;
  if (keyId && keyId !== support?.id) supports.push({ id: keyId, level: 1 });
  if (support) supports.push(support);
  const label = supports.map(s => s.id).join('+') || 'bare';
  const build = probeBuild(skillId, supports, label, rig.mode, opts,
    fieldRef ? fieldReferenceId() ?? undefined : undefined);
  const live = probe.kind === 'live';
  const escorted = rig.mode === 'escort' && build.skills.length > 1;
  // The live wave: the standard WOUNDING pack, or the KILLABLE fodder pack
  // for kill-scoped payloads (probe.pack 'fodder' — kills must flow).
  const pack = probe.pack === 'fodder' ? COMPAT_CFG.fodderPack : COMPAT_CFG.livePack;
  if (bled) build.bled = { lifeFrac: 0.5, manaFrac: 0.5 };
  // THE MIXED-DIET RIG: two derived fillers join the bar (both runs — the
  // shape-keyed bare shares the world) and the combo pilot round-robins
  // host + fillers so comboVaried can arm on the host's own press.
  if (comboDiet) {
    const [f1, f2] = dietFillerIds(skillId);
    const gl = opts.gemLevel ?? gemLevelAt(opts.level ?? COMPAT_CFG.level);
    for (const fid of [f1, f2]) {
      if (!build.skills.some(s => s.id === fid)) {
        build.skills.push({ id: fid, level: gl });
        build.bar?.push(fid);
      }
    }
  }
  const R = COMPAT_CFG.range;
  // THE GRAZE BODY (projPulse): parked one swell outside the flight's
  // BASE touch, beside the fire line — the resting radius misses it, the
  // swollen phase clips it. Sized off the host's own def and the dummy's
  // body, so every flight gets a true near-miss lane.
  const grazeLat = (MONSTERS[dummyId]?.radius ?? 18)
    + ((def.delivery as { radius?: number }).radius ?? 8) * (1 + R.graze.gapFrac);
  // The dummy-lane wave set: the range formation (collinear trio down the
  // fire line + one lateral offset body) or the classic single stand-off.
  const dummyWaves: ScenarioDef['waves'] = rr.range
    ? [
      ...[0, 1, 2].map(i => ({
        monsters: [{ id: dummyId, level: 1 }],
        distance: R.standoff + i * R.spacing, bearingDeg: 0,
      })),
      {
        monsters: [{ id: dummyId, level: 1 }],
        distance: R.standoff + R.spacing, bearingDeg: R.offsetDeg,
      },
      ...(rr.graze ? [{
        monsters: [{ id: dummyId, level: 1 }],
        distance: Math.hypot(R.graze.along, grazeLat),
        bearingDeg: Math.atan2(grazeLat, R.graze.along) * 180 / Math.PI,
      }] : []),
    ]
    : [{ monsters: [{ id: dummyId, level: 1 }], distance: COMPAT_CFG.dummyDistance }];
  // The solo pilot, with the canyon shot when the payload is wall-scoped
  // and the pinned-ahead shot on the graze lane (a re-targeting pilot
  // would aim AT the graze body and hit it dead-on in both runs).
  const soloPilot = ((): ScenarioDef['pilot'] => {
    // A tethered ORBITER grinds its wheel at the body — the caster band
    // would hold its blades a hundred pixels short of everything (a
    // host-shape truth: bare and socketed close in alike).
    const traj = (def.delivery as { trajectory?: { orbit?: number } }).trajectory;
    if ((traj?.orbit ?? 0) > 0) return { kind: 'brawler' };
    const p = soloPilotFor(def);
    if (p.kind !== 'caster') return p;
    if (rr.aimWall) return { ...p, aimOffset: { deg: R.wall.bearingDeg, dist: R.wall.distance } };
    if (rr.graze) return { ...p, aimOffset: { deg: 0, dist: R.standoff + 2 * R.spacing + 140 } };
    return p;
  })();
  return {
    id: `${build.id}__${probe.kind}${probe.pack ? '_' + probe.pack : ''}_${rig.mode}`
      + (dummyId !== 'target_dummy' ? `_${dummyId.replace('target_dummy_', '')}` : '')
      + (bled ? '_bled' : '')
      + (rr.range ? (rr.aimWall ? '_rangewall' : rr.graze ? '_rangegraze' : '_range') : '')
      + (fieldRef ? '_fieldref' : '')
      + (comboDiet ? '_combodiet' : ''),
    label: build.label,
    build,
    // THE FIELD ESCORT inverts the metronome: the FIELD skill (slot 1) is
    // the upkeep tap, the measured flight (slot 0) is the held filler, and
    // the mover holds the caster band so the flight has road to fly.
    pilot: comboDiet
      ? { kind: 'combo', slots: build.skills.map((_, i) => i) }
      : escorted
        ? (fieldRef
          ? { kind: 'pair', hostSlot: 1, refSlot: 0, band: PILOT_CFG.casterRange }
          : { kind: 'pair', hostSlot: 0, refSlot: 1 })
        : soloPilot,
    parityLevel: opts.level ?? COMPAT_CFG.level,
    waves: live
      ? [{
        monsters: [{
          id: pack.id, count: pack.count,
          level: Math.max(1, (opts.level ?? COMPAT_CFG.level) + pack.levelBonus),
        }],
        repeatEvery: pack.everySec, distance: COMPAT_CFG.liveDistance,
      }]
      : dummyWaves,
    // THE MASONRY (range formation): two overlapping rocks off the fire
    // line — the bank face and the unspent flight's gravestone.
    ...(rr.range && !live ? {
      terrain: {
        rocks: [
          { bearingDeg: R.wall.bearingDeg - 4, distance: R.wall.distance, radius: R.wall.radius },
          { bearingDeg: R.wall.bearingDeg + 4, distance: R.wall.distance, radius: R.wall.radius },
        ],
      },
    } : {}),
    // Corpse-consuming hosts get the feeder — without it the host never
    // casts, every pairing reads byte-identical, and the column is blind.
    ...(def.tags.includes('corpse') ? { corpseFeed: COMPAT_CFG.corpseFeed } : {}),
    duration: opts.duration ?? (live ? COMPAT_CFG.liveDuration : COMPAT_CFG.dummyDuration),
    stop: 'duration',
    notes: [probe.why, rig.why].filter(Boolean).join('; ') || undefined,
  };
}

// -------------------------------------------------------- classification --

/** Per-channel absolute noise floors. Fraction-valued channels live on
 *  [0,1] — the global noiseAbs (0.5) would demand HALF THE BAR move before
 *  registering, which silently blinded every regen/leech/pool payload the
 *  defensive-stat lane routes live. 0.02 = 2% of the bar, and the relative
 *  gate coincides there (bare ≤ 1 ⇒ rel == |Δ|), so one number is the
 *  whole threshold. Open registry beside CHANNEL_LANES. */
export const CHANNEL_NOISE_ABS: Record<string, number> = {
  life_floor: 0.02, life_end: 0.02, mana_floor: 0.02,
};

/** Which lane a fingerprint channel argues in. Open registry: a new collector
 *  channel needs one entry here (or it is ignored by classification and only
 *  participates in hash equality). */
export const CHANNEL_LANES: Record<string, 'output' | 'defense' | 'cost'> = {
  dmg_hero_out: 'output', dmg_minion_out: 'output', dot_out: 'output',
  dmg_dummy: 'output', hits_out: 'output', hit_attempts_out: 'output',
  crits_out: 'output', kills: 'output',
  enemy_status_samples: 'output', hero_status_samples: 'output',
  minion_samples: 'output', minion_peak: 'output',
  projectile_samples: 'output', zone_samples: 'output', corpse_samples: 'output',
  // The type ledger (2026-07-22): outgoing damage split by rolled type —
  // a conversion's whole function is moving amounts BETWEEN these keys.
  dmg_out_physical: 'output', dmg_out_fire: 'output', dmg_out_cold: 'output',
  dmg_out_lightning: 'output', dmg_out_chaos: 'output',
  // Resource-orb economy (orbOnHit/orbShed families): sheds ARE the payload.
  orbs_shed: 'output', orbs_scooped: 'output',
  dmg_in: 'defense', dot_in: 'defense', hit_attempts_in: 'defense',
  evades_in: 'defense', blocks_in: 'defense',
  // Sustain (healBy-landed healing on the hero): leech/on-hit/mend function.
  life_gain: 'defense',
  life_floor: 'defense', life_end: 'defense',
  mana_floor: 'cost', presses: 'cost', repeats: 'cost',
};

export type PairVerdictKind = 'effective' | 'cost_only' | 'negligible' | 'inert' | 'blind';

/** PROBE BLINDNESS — pairings the standard probes CANNOT measure honestly,
 *  as data. A matching pair's inert-looking result reports as 'blind'
 *  (unmeasured), never as a bug. Extend when a new geometry/lifecycle blind
 *  spot is understood; every rule names itself in the report. */
/** Does the support carry any mod touching one of these stats (mods or
 *  perLevel)? The conditional-payload blindness rows key on this. */
const supModsStat = (sup: SupportDef, stats: string[]): boolean =>
  [...sup.mods, ...(sup.perLevel ?? [])].some(m => stats.includes(m.stat));

/** COST-FUNCTION stats: lanes where moving the tax IS the gem's function
 *  (Efficiency's cheaper cast, Austerity's long clock, Alacrity's faster
 *  recovery). A support whose ENTIRE payload lives on these stats is a
 *  cost-shaped gem — a cost_only verdict on it means WORKING, not billing
 *  without function; the defect distiller consults this. Open set. */
export const COST_FUNCTION_STATS: ReadonlySet<string> = new Set([
  'manaCost', 'addedManaCost', 'addedCooldown', 'cooldownRecovery',
]);

/** Is this gem cost-shaped — every mod on a cost-function stat and no graft
 *  field beside them? (Mana Feeder fails: costDamage_mana is output payload;
 *  Buried Charge fails: the pulse field is the function.) */
export function costFunctionSupport(sup: SupportDef): boolean {
  const all = [...sup.mods, ...(sup.perLevel ?? [])];
  if (!all.length || !all.every(m => COST_FUNCTION_STATS.has(m.stat))) return false;
  for (const k of Object.keys(sup)) {
    if (k === 'mods' || k === 'perLevel' || !SUPPORT_PAYLOAD_FIELDS.has(k)) continue;
    if ((sup as unknown as Record<string, unknown>)[k] !== undefined) return false;
  }
  return true;
}

export const BLINDNESS_RULES: { note: string; when: (def: SkillDef, sup: SupportDef) => boolean }[] = [
  {
    // A cursor-origin flight aimed AT the foe travels ~0px, so flight-
    // distance payloads (trails) never step. Real play aims the origin
    // short and bores through — the pairing works, the pilot can't show it.
    note: 'cursor-origin flight travels ~0px at the aim — travel-scoped payloads unmeasurable under this pilot',
    when: (def, sup) =>
      def.delivery.type === 'projectile' && def.delivery.origin === 'cursor'
      && (sup.trail !== undefined || sup.fissureTrail !== undefined),
  },
  // ---- CONDITIONAL-PAYLOAD classes (2026-07-12 full-run triage): gems whose
  // function demands a mechanism, verb, or event the standard probes never
  // supply. Each row names the missing condition; a pair matching one
  // reports 'blind', never a false INERT. When a probe shape LEARNS the
  // condition (a stealth pilot, a shift-pressing pilot), delete its row and
  // the class re-enters measurement automatically.
  {
    note: 'companion gem: fuse-rider stats (fuseDelay/fusePower) need a FUSE on the host — none present in a single-gem probe',
    when: (def, sup) => supModsStat(sup, ['fuseDelay', 'fusePower']) && !def.fuse,
  },
  {
    note: 'companion gem: tether-rider stats need a TETHER on the host — none present in a single-gem probe',
    when: (def, sup) => supModsStat(sup, ['tetherDamage', 'tetherWidth', 'tetherRadius']) && !def.tether && sup.tether === undefined,
  },
  {
    note: 'death-dependent payload (dotPropagates) — the immortal dummy never dies, so propagation never fires',
    when: (def, sup) => supModsStat(sup, ['dotPropagates']) && probeKindFor(def, sup).kind === 'dummy',
  },
  {
    note: 'leech is unobservable at full vitals against a passive target (nothing to refill)',
    when: (def, sup) => supModsStat(sup, ['lifeLeech', 'manaLeech']) && probeKindFor(def, sup).kind === 'dummy',
  },
  {
    // The wounding pack leans PHYSICAL: a pure resistance payload may meet
    // none of its element in the whole episode. Guards only inert-looking
    // readings (the pair-level blind application) — a resist gem that
    // measures effective is never touched by this row.
    note: 'elemental/chaos resistance vs the physical-leaning probe pack — the element may never arrive',
    when: (_def, sup) => supModsStat(sup, ['fireRes', 'coldRes', 'lightningRes', 'chaosRes']),
  },
  {
    note: 'ambush/stealth bonus — no pilot performs the stealth verb',
    when: (_def, sup) => supModsStat(sup, ['ambushBonus', 'stealthRegen']),
  },
  {
    // Homing self-acquires (the wall-aim lane measures it); GUIDED flight
    // steers toward the LIVE cursor, and every probe aim is static — there
    // is nothing to steer. Delete when a cursor-steering pilot ships.
    note: 'guided flight (guidePower) follows the moving cursor — probe aims are static, so the steering never happens',
    when: (_def, sup) => supModsStat(sup, ['guidePower']),
  },
  {
    note: 'granted META action — pilots never shift-press, so the grant goes unexercised',
    when: (_def, sup) => sup.meta !== undefined,
  },
  {
    note: 'sacrifice needs a STANDING MINION beside the caster — solo rigs field none',
    when: (def, sup) => sup.sacrifice !== undefined
      && def.delivery.type !== 'summon' && !def.tags.includes('minion'),
  },
  {
    // The corpse-FALLBACK levers (Sacrificial Rites / Soulwalk) fire only
    // when the find runs SHORT of corpses AND a living minion stands to
    // serve — the corpse feeder keeps probe fields plentiful, and the solo
    // rig fields no minions either way. The fill/precedence behavior is
    // deterministically verified in balance/probe_corpse.ts; when a
    // minion-crewed scarcity probe ships, delete this row.
    note: 'corpse-fallback lever (sacrificeMinions/targetMinionFallback) needs corpse SCARCITY plus a standing minion — the fed, minionless rig supplies neither',
    when: (def, sup) => supModsStat(sup, ['sacrificeMinions', 'targetMinionFallback'])
      && def.tags.includes('corpse'),
  },
  {
    // THE CONDUIT FAMILY (SupportDef.conduit): resource pumps that run
    // only while the host stance is genuinely HELD or its toggle burns,
    // and that move DEFENSE pools (poise/guard/es/ward/insight) — the
    // standard probes neither hold stances nor fingerprint those pools,
    // so every pairing reads byte-identical. The fabric itself is
    // deterministically verified elsewhere (balance/_probe_conduit.ts,
    // 16/16); when a stance-holding pilot with a defense-pool fingerprint
    // ships, delete this row and the family re-enters measurement
    // automatically.
    note: 'resource pump (conduit): needs a HELD stance / burning toggle and a defense-pool fingerprint the standard probes lack',
    when: (_def, sup) => sup.conduit !== undefined,
  },
  {
    // THE SYMPATHY FAMILY (sympathy_<link> potency stats): echoes replay
    // gains onto KIN — bonded companions, other seats, nearby allies — and
    // the solo probe rigs field none, so every pairing reads byte-identical.
    // The fabric is deterministically verified in balance/probe_sympathy.ts;
    // when a companion-fielding probe rig ships, delete this row and the
    // family re-enters measurement automatically.
    note: 'sympathy link (kin echo): needs bonded kin the solo probes never field',
    when: (_def, sup) =>
      [...sup.mods, ...(sup.perLevel ?? [])].some(m => m.stat.startsWith('sympathy_')),
  },
  {
    // THE CLAIM GRAFTS (SupportDef.tameMod): they reshape tryTame's terms,
    // and no pilot performs the claim verb (a concentration hold on a live
    // tameable beast). Same probe file covers them; same self-deleting rule.
    note: 'tame-claim graft (tameMod): no pilot performs the CLAIM verb',
    when: (_def, sup) => sup.tameMod !== undefined,
  },
  // ---- DRINK-RIDER classes (2026-07-15 flask-lane triage): the fount
  // seeding + wounding pack made DRINKS fire (followUp/tempo/splash gems
  // measure clean) — but potency/duration riders read only through the
  // drink's own channels, and two shapes still fall outside what this
  // probe exercises. When an ailment-applying, stance-pressing pack (or a
  // roaming pilot) ships, delete these rows and the pairs re-enter
  // measurement automatically.
  {
    // The catalyst shape: chargeCost 'all' spends the whole seeded bank on
    // the first engaged tap — at pools the fight hasn't dented yet — and
    // nothing in-arena ever refills it, so a pour-potency gem never meets
    // a wounded drink.
    note: 'pour-potency rider on a gulp-the-bank host: the one seeded gulp lands before wounds and the bank never refills in-arena',
    when: (def, sup) => supModsStat(sup, ['restorePower', 'restorePctMax'])
      && def.chargeCost?.amount === 'all',
  },
  {
    // The stance-flask wing (pour-less drinks): potency/duration/thirst
    // riders read through movement the parked escort never makes and
    // ailments the probe pack never applies.
    note: 'stance-flask rider (potency/duration/thirst mods): the parked pilot and ailment-less pack never press the lengthened stance\'s channels',
    when: (def, sup) => def.tags.includes('flask')
      && !(def.effects ?? []).some(e => e.type === 'restoreOverTime')
      && supModsStat(sup, ['thirstless', 'restorePower', 'restorePctMax', 'effectDuration'])
      && sup.followUp === undefined && sup.chargeGain === undefined,
  },
  // ---- BACKLOG-SWEEP classes (2026-07-21 triage of the 24k-row ledger):
  // condition/environment gaps the standard probes cannot arm, each verified
  // by hand against the engine read-site before earning its row. Same
  // self-deleting rule as above: when a probe learns the condition, delete
  // the row and the class re-enters measurement automatically.
  {
    // The cloudborne precedent, already noted beside the gem defs (Clamor /
    // Quiet Hand): resolveHit's threat booking is live, but a chart with one
    // name on it has nothing to re-order.
    note: 'threat re-weighting (threatGen) needs RIVALS on the chart — probe arenas field one candidate target',
    when: (_def, sup) => supModsStat(sup, ['threatGen']),
  },
  {
    note: 'companion gem: trigger-permit lifts the cast-time gate of a TRIGGER GEM riding beside it — no trigger gem present in a single-gem probe',
    when: (_def, sup) => sup.triggerPermit !== undefined,
  },
  {
    note: 'reserved-mana payload (reservedDamage) reads a RESERVATION the probe rigs never hold — no aura/hex toggle burns in a solo probe',
    when: (_def, sup) => supModsStat(sup, ['reservedDamage']),
  },
  {
    // Verified vs engine: fullEs is strict (Actor.conditionMask requires
    // maxEs > 0) and the rig ships ES-less per the defense-texture doctrine.
    note: "condition 'fullEs' is unarmable — the probe rig carries no energy shield (pools ship EMPTY by doctrine), and fullEs is strict at maxEs 0",
    when: (_def, sup) => supHasOnlyCondPayload(sup, ['fullEs']),
  },
  {
    note: "condition 'lowLife' is unarmable — the dummy never wounds, and the pack seldom presses the rig past its low-life line",
    when: (_def, sup) => supHasOnlyCondPayload(sup, ['lowLife']),
  },
  // (2026-07-22, the user's (A) call: the combo-cadence blindness row is
  // RETIRED — comboVaried pairs ride the mixed-diet rig now, and
  // comboRepeated always armed under the mono-diet solo pilot.)
  {
    note: 'movement-speed payload is POSITIONAL — the parked duel fingerprint reads combat channels only',
    when: (_def, sup) => supModsStat(sup, ['castMobility'])
      || (sup.selfStack !== undefined && sup.selfStack.mods.every(m => m.stat === 'moveSpeed')),
  },
  {
    // Ravening's shape: the graft drinks a charge the rig never banks.
    // Slow Brew self-banks (chargeGain beside its chargeCost) and stays
    // measurable on bar-cast hosts.
    note: 'spender graft (chargeCost) with no in-rig SOURCE of its charge — neither the gem nor the host banks it, so the pot is forever empty',
    when: (def, sup) => sup.chargeCost !== undefined
      && !(sup.chargeGain ?? []).some(cg => cg.charge === sup.chargeCost!.charge)
      && !(def.chargeGain ?? []).some(cg => cg.charge === sup.chargeCost!.charge),
  },
  {
    // Verified live (diag 2026-07-21): the bank ticks and the entry drink
    // fires, but the probe holds ONE unbroken channel from an empty pot.
    // Real play re-enters the channel and drinks the accrued bank.
    note: 'spender graft on a CHANNEL host — a held channel drinks only at entry, and the probe holds one unbroken channel from an empty pot',
    when: (def, sup) => sup.chargeCost !== undefined && def.castMode === 'channel',
  },
  {
    note: 'ply-rend needs COUNT-DURABLE (plied) bodies — the probe fields none',
    when: (_def, sup) => supModsStat(sup, ['plyRend']),
  },
  {
    note: "'regicide' needs EMPOWERED victims (magic/rare/champion/crowned) — the probe pack spawns unpromoted",
    when: (_def, sup) => supModsStat(sup, ['regicide']),
  },
  // (giantsbane carries NO row: the training dummy's body math — radius 18,
  // wood density, ~1.63 effective weight — stands above the 1.5× ratio, so
  // the dummy probe arms it; its inert rows are non-hitting hosts, honest.)
  {
    note: "'limbreaver' reads a composite monster's PARTS — no composite spawns in probes",
    when: (_def, sup) => supModsStat(sup, ['limbreaver']),
  },
  {
    note: 'remnant shards drop at kills but the SCOOP is a walk — no pilot detours over shards',
    // The WHOLE remnant-mint family (2026-07-22): the kill-shed lanes
    // (remnantDrop_*) AND the elemental hit/cast mints (remnantChance,
    // remnantOnCast) — every one ends at the same unscooped shard.
    when: (_def, sup) => [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
      m.stat.startsWith('remnantDrop_') || m.stat === 'remnantChance' || m.stat === 'remnantOnCast'),
  },
  // (orbShedRate carries NO row anymore: the orbShedGraft floor stands the
  //  shed lane up on a bare rig — fodder-routed kills shed orbs, and the
  //  scooped pours reach the mana/life fingerprint channels.)
  {
    note: 'damage-vs-poisoned (damageVs_poison) needs a POISONED victim — this host applies no poison and the solo rig fields no second source',
    when: (def, sup) => supModsStat(sup, ['damageVs_poison'])
      && !(def.effects ?? []).some(e => e.type === 'status' && e.status === 'poison'),
  },
  {
    note: 'strike-timing window (grafted golden tail) needs a DISCIPLINED press — the spam pilot presses early on every bar',
    when: (_def, sup) => sup.strikeTiming !== undefined,
  },
  // (cooldownRecovery on COOLDOWN-LESS hosts carries no row: the 'cooldown'
  //  mechanism gate — requiresMechanisms, the golden rule — refuses those
  //  STRUCTURALLY at the census. The row below covers the opposite end.)
  {
    // Verified by hand (absolute_zero cd 7, ±30% recovery, 10s window: two
    // casts either way): cast COUNT is what fingerprints, and long clocks
    // cannot fit an extra cast inside the episode.
    note: 'cooldown-granular payload on a LONG clock — the episode window quantizes cast counts, and a cooldown past ~2/3 of the window gains no extra cast to show',
    when: (def, sup) => supModsStat(sup, ['cooldownRecovery'])
      && def.cooldown >= COMPAT_CFG.dummyDuration * 0.65,
  },
  // ---- THE TRADEOFF-HONESTY classes (2026-07-21 R3): the commitment fixes
  // made these gems demand a PRICE the probe pilots never pay. Each payload
  // is deterministically verified working in balance/probe_supportfabric.ts;
  // when a resting/walking pilot ships, delete these rows and the classes
  // re-enter measurement automatically.
  {
    note: 'orb sheds land at the KILL SITE — the ranged pilot never walks the scoop (melee hosts measure the harvest); the shed itself is pinned working in probe_supportfabric',
    when: (def, sup) => (sup.orbShedGraft !== undefined
      || [...sup.mods, ...(sup.perLevel ?? [])].some(m =>
        m.stat === 'orbShedRate' || m.stat.startsWith('orbOnKill_')))
      && soloPilotFor(def).kind === 'caster',
  },
  {
    note: 'the plant COMMITMENT needs feet set before the press — the spam pilot chains cast bars with one-frame gaps and never commits (instant-swing hosts measure); the clock is pinned in probe_supportfabric',
    when: (def, sup) => supHasOnlyCondPayload(sup, ['stationary', 'moving'])
      && def.useTime >= 0.3,
  },
  {
    note: 'the seal bank needs TRUE REST — the spam pilot re-presses the frame the bar clears, so no seal ever banks; the rest law is pinned in probe_supportfabric',
    when: (_def, sup) => supModsStat(sup, ['unleashMax']),
  },
  {
    // Accelerando / Ritardando: pure beat-benders — companions to a beat
    // SOURCE (an innate ground pulse/cascade, or a pulse/cascade gem
    // beside them). Hosts carrying their own beats measure; the rest
    // cannot in a single-gem probe.
    note: 'companion gem: a cadence bends beats something else must MINT — no innate pulse/cascade on this host and no beat gem beside it in a single-gem probe',
    when: (def, sup) => sup.cadence !== undefined
      && !(def.delivery.type === 'ground' && (def.delivery.pulse !== undefined || def.delivery.cascade !== undefined)),
  },
];

/** Every payload-bearing lane of the gem is condition-gated on the given
 *  conds (cost-lane mods exempt — the tax billing is not the function):
 *  the conditional-blindness rows key on this. */
function supHasOnlyCondPayload(sup: SupportDef, conds: string[]): boolean {
  const all = [...sup.mods, ...(sup.perLevel ?? [])];
  const payload = all.filter(m => !COST_FUNCTION_STATS.has(m.stat));
  if (!payload.length) return false;
  if (!payload.some(m => m.when && conds.includes(m.when))) return false;
  if (!payload.every(m => m.when && conds.includes(m.when))) return false;
  // A graft FIELD beside the mods is unconditioned payload — not this class.
  for (const k of Object.keys(sup)) {
    if (k === 'mods' || k === 'perLevel' || !SUPPORT_PAYLOAD_FIELDS.has(k)) continue;
    if ((sup as unknown as Record<string, unknown>)[k] !== undefined) return false;
  }
  return true;
}

export interface ChannelDelta { key: string; bare: number | string; pair: number | string; rel: number }

export interface PairProbeResult {
  skillId: string;
  supportId: string;
  fit: 'host' | 'crew';
  probe: 'dummy' | 'live';
  /** Crew-fit probe ran with the resonance key in both runs (gated boarding). */
  keyed?: true;
  verdict: PairVerdictKind;
  /** Seeds whose fingerprints hashed identical / total seeds run. */
  identicalSeeds: number;
  seeds: number;
  /** Channels beyond noise (aggregated means across seeds), largest first. */
  moved: ChannelDelta[];
  /** Player-side output delta, relative: (pair−bare)/max(bare,1) over the
   *  summed damage channels — THE support-power headline for effective pairs. */
  dOutputRel: number;
  /** Static read-site annotations (why an inert verdict was predictable). */
  unread?: { key: string; site: string }[];
  /** Why a 'blind' verdict is blind (the matched rule's note, or the
   *  host-expression census claim). */
  blindWhy?: string;
  warnings: string[];
}

const fpNum = (fp: Record<string, number | string>, k: string): number => {
  const v = fp[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

const outputDamage = (fp: Record<string, number | string>): number =>
  fpNum(fp, 'dmg_hero_out') + fpNum(fp, 'dmg_minion_out') + fpNum(fp, 'dot_out');

/** Stable stringify for hash-equality (fixed insertion order from the
 *  collector, so JSON.stringify is already canonical). */
const fpKey = (fp: Record<string, number | string>): string => JSON.stringify(fp);

/** Seed-wise fingerprint equality — the deep lane's masked-vs-full and
 *  masked-vs-bare oracles ride the same hash the pair verdict does. */
const identicalEps = (a: EpisodeResult[], b: EpisodeResult[]): boolean => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (fpKey(a[i].fingerprint) !== fpKey(b[i].fingerprint)) return false;
  }
  return true;
};

export function classifyPair(
  bare: EpisodeResult[], pair: EpisodeResult[],
): Pick<PairProbeResult, 'verdict' | 'identicalSeeds' | 'moved' | 'dOutputRel'> {
  const n = Math.min(bare.length, pair.length);
  let identical = 0;
  for (let i = 0; i < n; i++) {
    if (fpKey(bare[i].fingerprint) === fpKey(pair[i].fingerprint)) identical++;
  }
  if (identical === n) {
    return { verdict: 'inert', identicalSeeds: identical, moved: [], dOutputRel: 0 };
  }
  // Aggregate means per channel across seeds, then judge lanes.
  const keys = Object.keys(bare[0]?.fingerprint ?? {});
  const moved: ChannelDelta[] = [];
  let effective = false, costMoved = false;
  for (const k of keys) {
    const b0 = bare[0].fingerprint[k];
    if (typeof b0 === 'string') {
      // Qualitative channels (status/cast id sets): any per-seed difference
      // is evidence of function (a new status id, a converted cast).
      for (let i = 0; i < n; i++) {
        if (bare[i].fingerprint[k] !== pair[i].fingerprint[k]) {
          moved.push({ key: k, bare: bare[i].fingerprint[k], pair: pair[i].fingerprint[k], rel: 1 });
          effective = true;
          break;
        }
      }
      continue;
    }
    const bm = bare.slice(0, n).reduce((s, e) => s + fpNum(e.fingerprint, k), 0) / n;
    const pm = pair.slice(0, n).reduce((s, e) => s + fpNum(e.fingerprint, k), 0) / n;
    const d = pm - bm;
    const rel = Math.abs(d) / Math.max(Math.abs(bm), 1);
    if (Math.abs(d) > (CHANNEL_NOISE_ABS[k] ?? COMPAT_CFG.noiseAbs) && rel > COMPAT_CFG.noiseRel) {
      moved.push({ key: k, bare: bm, pair: pm, rel });
      const lane = CHANNEL_LANES[k];
      if (lane === 'output' || lane === 'defense') effective = true;
      else if (lane === 'cost') costMoved = true;
    }
  }
  moved.sort((a, b) => b.rel - a.rel);
  const bOut = bare.slice(0, n).reduce((s, e) => s + outputDamage(e.fingerprint), 0) / n;
  const pOut = pair.slice(0, n).reduce((s, e) => s + outputDamage(e.fingerprint), 0) / n;
  const dOutputRel = (pOut - bOut) / Math.max(bOut, 1);
  const verdict: PairVerdictKind = effective ? 'effective' : costMoved ? 'cost_only' : 'negligible';
  return { verdict, identicalSeeds: identical, moved: moved.slice(0, 8), dOutputRel };
}

// ------------------------------------------------------------ matrix run --

export interface MatrixOpts extends ProbeOpts {
  skillFilter?: string;
  supportFilter?: string;
  budget?: number;
  /** Skip runtime probes entirely (census only). */
  staticOnly?: boolean;
  /** 1-based deterministic stride over the probe order: this run takes pairs
   *  where (orderIndex % of) === (index − 1). Shards are disjoint and union
   *  to the whole order — the lane for cheap concurrent runners. */
  shard?: { index: number; of: number };
  /** Pair keys (pairKey) whose verdicts a resume already carries — skipped
   *  here; the CLI folds the carried verdicts back into the artifacts. */
  skipPairs?: ReadonlySet<string>;
  /** Explicit allow-list (ledger rechecks): only these pairs probe. */
  pairs?: { skill: string; support: string }[];
  /** THE DEEP LANE: ablation-probe every EFFECTIVE/COST_ONLY pair's payload
   *  units (mask-one-out) to catch dead lines hiding inside working gems. */
  deep?: boolean;
  /** Per-pair hook — the CLI streams verdicts to verdicts.jsonl so a killed
   *  run resumes instead of restarting. */
  onPair?: (p: PairProbeResult) => void;
  onDeep?: (d: PairDeepResult) => void;
}

export interface MatrixResult {
  census: CensusResult;
  probed: PairProbeResult[];
  /** Deep (ablation) results — present only when the deep lane ran. */
  deep?: PairDeepResult[];
  /** Census-wide eligible pairs (fit host|crew) — the catalog truth. */
  eligible: number;
  /** Pairs THIS run was responsible for after pairs/shard slicing. */
  scope: number;
  /** Scope pairs skipped because a resume already carried their verdicts. */
  resumed: number;
  episodesRun: number;
  /** Scope pairs left unprobed by the budget. */
  skipped: number;
  /** Divergent pairs the deep lane could not afford under the budget. */
  deepSkipped: number;
  cfg: typeof COMPAT_CFG;
}

/** The budget-fair probe order: round-robin across supports so a budget or
 *  shard slice still covers every support with SOME skills, rather than
 *  exhausting the alphabet's head. Pure function of the census — every
 *  shard derives the SAME order, which is what makes stride-sharding sound. */
export function probeOrder(census: CensusResult): CensusRow[] {
  const bySupport = new Map<string, CensusRow[]>();
  for (const r of census.rows) {
    if (r.fit === 'refused') continue;
    const list = bySupport.get(r.supportId) ?? [];
    list.push(r);
    bySupport.set(r.supportId, list);
  }
  const queues = [...bySupport.values()];
  const ordered: CensusRow[] = [];
  for (let i = 0; queues.some(q => i < q.length); i++) {
    for (const q of queues) if (i < q.length) ordered.push(q[i]);
  }
  return ordered;
}

/** Mutable probe-run state shared by the matrix loop, the deep lane, and the
 *  pair dossier: option resolution, the episode meter, and the bare-baseline
 *  cache (keyed by skill × probe shape so a forced-shape pair diffs against
 *  a bare of the SAME shape). */
export interface ProbeSession {
  opts: ProbeOpts;
  seeds: number;
  baseSeed: number;
  supportLevel: number;
  episodesRun: number;
  bareCache: Map<string, EpisodeResult[]>;
}

export function makeProbeSession(opts: ProbeOpts): ProbeSession {
  return {
    opts,
    seeds: Math.max(1, opts.seeds ?? 1),
    baseSeed: opts.baseSeed ?? 0xc0ffee,
    supportLevel: opts.supportLevel ?? COMPAT_CFG.supportLevel,
    episodesRun: 0,
    bareCache: new Map(),
  };
}

/** The shape-matched bare baseline, cached per (skill × full shape ×
 *  policy): every lever that changes episode content — probe kind, pack,
 *  rig, key, rack dummy, bled vitals, range formation, wall aim, field
 *  escort, policy escalation — joins the key, so a forced-shape pair
 *  always diffs against a bare of the SAME world. */
export function bareEpisodesFor(
  sess: ProbeSession, skillId: string, shape: PairShape,
  policy?: { name: string; seeds: number; duration?: number },
): EpisodeResult[] {
  const key = `${skillId}:${shapeCacheKey(shape)}` + (policy ? `:${policy.name}` : '');
  let eps = sess.bareCache.get(key);
  if (!eps) {
    const opts = policy?.duration !== undefined ? { ...sess.opts, duration: policy.duration } : sess.opts;
    const scen = probeScenario(skillId, null, opts, {
      probe: shape.probe, rig: shape.rig, withKey: shape.withKey, pack: shape.pack,
      dummyId: shape.dummyId, bled: !!shape.bled,
      range: !!shape.range, aimWall: !!shape.aimWall, fieldRef: !!shape.fieldRef, graze: !!shape.graze,
    });
    eps = runScenario(scen, { seeds: policy?.seeds ?? sess.seeds, baseSeed: sess.baseSeed }).episodes;
    sess.episodesRun += eps.length;
    sess.bareCache.set(key, eps);
  }
  return eps;
}

/** The shape a pair probes under — derived once, quoted in reports, and
 *  PINNED across the deep lane's masked variants so every run compares. */
export interface PairShape {
  probe: 'dummy' | 'live';
  probeWhy?: string;
  /** Live-pack flavor: 'fodder' = the killable below-parity pack. */
  pack?: 'fodder';
  rig: 'solo' | 'escort';
  rigWhy?: string;
  withKey: boolean;
  /** Rack-routed dummy target (RESIST_DUMMY_BY_TYPE / the colossus) — the
   *  bare baseline aims at the SAME sibling so the delta is the gem. */
  dummyId?: string;
  /** THE BLED RIG: sustain payloads (leech / on-hit refills) probe at HALF
   *  vitals in BOTH runs — a full pool clips every pour to zero landed, and
   *  a kiting pilot may never be wounded by the pack. The deficit is
   *  identical bare and socketed, so the delta is the gem's pour. */
  bled?: true;
  /** THE FLIGHT RANGE: the dummy wave becomes the range formation —
   *  collinear trio + lateral offset body + the masonry stub. */
  range?: true;
  /** Wall-scoped range payloads (bank, unspent-end bloom) aim AT the rocks. */
  aimWall?: true;
  /** THE GRAZE LANE (projPulse): the formation grows a body parked one
   *  swell outside the flight's base touch; the aim pins dead-ahead. */
  graze?: true;
  /** THE FIELD ESCORT: the escort reference is the derived field-layer on
   *  the metronome; the flight host fills from the caster band. */
  fieldRef?: true;
  /** THE MIXED-DIET RIG (comboVaried payloads): two derived fillers join
   *  the bar and the combo pilot round-robins all three — the cast ring's
   *  3-window goes distinct, the condition arms on the host's own press. */
  comboDiet?: true;
}

/** The census-comparable shape signature: probe kind + pack + rig + key.
 *  Deliberately EXCLUDES the rack dummy — a host mute at one dummy is mute
 *  at its siblings (same passive fixture), so census claims carry across
 *  rack routing. */
export const shapeKey = (s: Pick<PairShape, 'probe' | 'pack' | 'rig' | 'withKey'>): string =>
  `${s.probe}${s.pack ? '+' + s.pack : ''}:${s.rig}${s.withKey ? ':keyed' : ''}`;

export function pairShapeFor(def: SkillDef, sup: SupportDef, fit: 'host' | 'crew'): PairShape {
  const probe = probeKindFor(def, sup);
  const rig = rigModeFor(def, sup);
  // Crew-fit pairs test the BOARDED behavior: the resonance key rides both
  // runs (gated boarding is the shipping mode), so the delta is the gem's
  // crew contribution — a keyless dormant gem is design, not a finding.
  const withKey = fit === 'crew' && !!resonanceKeyId() && !sup.resonance;
  const shape: PairShape = { probe: probe.kind, rig: rig.mode, withKey };
  if (probe.why) shape.probeWhy = probe.why;
  if (probe.pack) shape.pack = probe.pack;
  if (rig.why) shape.rigWhy = rig.why;
  if (probe.kind === 'dummy') {
    const rack = rackDummyFor(sup);
    if (rack) {
      shape.dummyId = rack.id;
      shape.probeWhy = shape.probeWhy ? `${shape.probeWhy}; ${rack.why}` : rack.why;
    }
    const rr = rangeRigFor(sup);
    if (rr) {
      shape.range = true;
      // The canyon shot — EXCEPT on carom hosts: their native lane claims
      // projBounce whole (anchors, not wall banks), so the aim stays on
      // flesh and the deepened line shuttles through bodies.
      const caroms = (def.delivery as { caroms?: unknown }).caroms !== undefined;
      if (rr.aimWall && !caroms) shape.aimWall = true;
      if (rr.graze) shape.graze = true;
      const why = shape.aimWall
        ? 'flight-branch payload — the range formation, fired into the masonry (bank/bloom)'
        : shape.graze
          ? 'breathing-radius payload — the graze lane (a body one swell outside base touch, aim pinned dead-ahead)'
          : 'flight-branch payload — the range formation (collinear trio + offset + masonry)';
      shape.probeWhy = shape.probeWhy ? `${shape.probeWhy}; ${why}` : why;
    }
  }
  // THE BLED RIG: sustain gems as ever — and HEAL-TAGGED HOSTS (2026-07-22,
  // the user's (B) call): a full pool clips every pour to zero landed, so a
  // salvo of mends read as a false no-op; half vitals give the pour
  // headroom and the host's own heals price through life_gain.
  if (supModsStat(sup, BLED_RIG_STATS) || def.tags.includes('heal')) shape.bled = true;
  // THE MIXED-DIET RIG (2026-07-22, the user's (A) call): a comboVaried
  // payload can never arm on a mono-skill bar (conditionRun demands three
  // DISTINCT casts) — the diet rig fields two derived fillers and the
  // round-robin pilot.
  if ([...sup.mods, ...(sup.perLevel ?? [])].some(m => m.when === 'comboVaried')) {
    shape.comboDiet = true;
    shape.rigWhy = shape.rigWhy
      ? `${shape.rigWhy}; mixed-diet rig (comboVaried needs three distinct casts)`
      : 'mixed-diet rig (comboVaried needs three distinct casts)';
  }
  if (fieldEscortFor(sup)) {
    shape.rig = 'escort';
    shape.fieldRef = true;
    shape.rigWhy = 'cross-skill field payload — the field escort lays the ground the flight must cross';
  }
  return shape;
}

/** The bare-baseline cache key half of a shape — every lever that changes
 *  episode content joins it, so a forced-shape pair always diffs against a
 *  bare of the SAME world. */
export const shapeCacheKey = (s: PairShape): string => [
  s.probe, s.pack ?? '', s.rig, s.withKey ? 'k' : '', s.dummyId ?? '',
  s.bled ? 'b' : '', s.range ? 'r' : '', s.aimWall ? 'w' : '', s.fieldRef ? 'f' : '',
  s.graze ? 'g' : '', s.comboDiet ? 'c' : '',
].join(':');

/** Sustain stats that need HEADROOM to express — their pairs run the bled
 *  rig (BuildSpec.bled, half vitals both runs). ES/ward leeches stay out:
 *  those pools ship EMPTY by doctrine and gate on their own bases. */
export const BLED_RIG_STATS = ['lifeLeech', 'lifeOnHit', 'manaLeech'];

export interface PairProbeRun {
  result: PairProbeResult;
  bareEps: EpisodeResult[];
  pairEps: EpisodeResult[];
  shape: PairShape;
}

/** One pair, end to end: shape, shape-matched bare baseline, socketed run,
 *  classification, blindness screen. The matrix loop, the deep lane and the
 *  dossier all call THIS — one probe path, three consumers. */
export function probePair(sess: ProbeSession, row: CensusRow): PairProbeRun {
  if (row.fit === 'refused') {
    throw new Error(`compat: probePair on refused pair ${row.skillId} + ${row.supportId}`);
  }
  const def = SKILLS[row.skillId];
  const sup = SUPPORTS[row.supportId];
  const shape = pairShapeFor(def, sup, row.fit);
  // PROBE-POLICY escalation (small-chance payloads): both runs stretch the
  // same way — the bare baseline caches under the policy's name.
  const rawPolicy = probePolicyFor(sup);
  const baseDuration = sess.opts.duration
    ?? (shape.probe === 'live' ? COMPAT_CFG.liveDuration : COMPAT_CFG.dummyDuration);
  const policy = rawPolicy ? {
    name: rawPolicy.name,
    seeds: Math.max(sess.seeds, rawPolicy.seeds ?? sess.seeds),
    duration: rawPolicy.durationMult ? baseDuration * rawPolicy.durationMult : undefined,
  } : undefined;
  const bareEps = bareEpisodesFor(sess, row.skillId, shape, policy);
  const pairOpts = policy?.duration !== undefined ? { ...sess.opts, duration: policy.duration } : sess.opts;
  const pairScen = probeScenario(row.skillId,
    { id: row.supportId, level: sess.supportLevel }, pairOpts, {
      probe: shape.probe, rig: shape.rig, withKey: shape.withKey, pack: shape.pack,
      dummyId: shape.dummyId ?? 'target_dummy', bled: !!shape.bled,
      range: !!shape.range, aimWall: !!shape.aimWall, fieldRef: !!shape.fieldRef, graze: !!shape.graze,
    });
  const { episodes: pairEps } = runScenario(pairScen,
    { seeds: policy?.seeds ?? sess.seeds, baseSeed: sess.baseSeed });
  sess.episodesRun += pairEps.length;
  const cls = classifyPair(bareEps, pairEps);
  // A known-blind pairing may LOOK inert/negligible under this probe —
  // report it as unmeasured instead of minting a false bug.
  const blind = BLINDNESS_RULES.find(r => r.when(def, sup));
  let blindWhy: string | undefined;
  if (blind && (cls.verdict === 'inert' || cls.verdict === 'negligible')) {
    cls.verdict = 'blind';
    blindWhy = blind.note;
  } else if (cls.verdict === 'inert' || cls.verdict === 'negligible') {
    // THE HOST-EXPRESSION SCREEN (2026-07-22): the committed census knows
    // which hosts express NOTHING under their own probe shape — a mute
    // host's inert-looking pairs are one host fact wearing many gem names,
    // unmeasured rather than defective. Cost-shaped gems keep measuring on
    // cast-only hosts (the moved tax still fingerprints); anything the
    // census contradicts stays open for the hand-rule anomaly lane.
    const hx = sess.opts.hostExpression?.hosts[row.skillId];
    if (hx && hx.shape === shapeKey(shape)
      && (hx.mute === 'full' || (hx.mute === 'cast-only' && !costFunctionSupport(sup)))) {
      cls.verdict = 'blind';
      blindWhy = `host-expression census: ${hx.mute === 'full'
        ? 'the host never casts' : 'the host casts but expresses nothing'} under this probe shape — ${hx.why ?? 'unexplained'}`;
    }
  }
  const warnings = [...new Set([...bareEps, ...pairEps].flatMap(e => e.warnings))];
  const result: PairProbeResult = {
    skillId: row.skillId,
    supportId: row.supportId,
    fit: row.fit,
    probe: shape.probe,
    keyed: shape.withKey || undefined,
    verdict: cls.verdict,
    identicalSeeds: cls.identicalSeeds,
    seeds: policy?.seeds ?? sess.seeds,
    moved: cls.moved,
    dOutputRel: Math.round(cls.dOutputRel * 1000) / 1000,
    unread: row.unread,
    blindWhy,
    warnings,
  };
  return { result, bareEps, pairEps, shape };
}

/** Run the matrix: census always; probes in the shared probe order until the
 *  budget spends. `onProgress` narrates (the CLI passes console.log). */
export function runCompatMatrix(opts: MatrixOpts, onProgress?: (msg: string) => void): MatrixResult {
  const census = compatCensus(opts.skillFilter ?? '', opts.supportFilter ?? '');
  const sess = makeProbeSession(opts);
  const budget = opts.budget ?? COMPAT_CFG.budgetEpisodes;
  const eligible = census.rows.filter(r => r.fit !== 'refused').length;

  let ordered = probeOrder(census);
  if (opts.pairs) {
    const allow = new Set(opts.pairs.map(p => pairKey(p.skill, p.support)));
    ordered = ordered.filter(r => allow.has(pairKey(r.skillId, r.supportId)));
  }
  if (opts.shard) {
    const { index, of } = opts.shard;
    if (!(Number.isInteger(index) && Number.isInteger(of) && of >= 1 && index >= 1 && index <= of)) {
      throw new Error(`compat: bad shard ${index}/${of} — want a 1-based index ≤ of`);
    }
    ordered = ordered.filter((_, i) => i % of === index - 1);
  }

  const deepResults: PairDeepResult[] = [];
  const result: MatrixResult = {
    census, probed: [], eligible, scope: ordered.length, resumed: 0,
    episodesRun: 0, skipped: 0, deepSkipped: 0, cfg: COMPAT_CFG,
  };
  if (opts.staticOnly) { result.skipped = ordered.length; return result; }

  let lastNote = 0;
  for (const row of ordered) {
    if (opts.skipPairs?.has(pairKey(row.skillId, row.supportId))) { result.resumed++; continue; }
    // Budget check BEFORE starting a pair (a bare baseline may also bill).
    const worstCase = sess.seeds * 2;
    if (sess.episodesRun + worstCase > budget) { result.skipped++; continue; }
    const run = probePair(sess, row);
    result.probed.push(run.result);
    opts.onPair?.(run.result);
    // THE DEEP LANE rides the same loop: divergent pairs get their payload
    // units attributed while the full-gem episodes are still in hand.
    if (opts.deep && (run.result.verdict === 'effective' || run.result.verdict === 'cost_only')) {
      const runnable = ablationUnits(SUPPORTS[row.supportId])
        .filter(u => !(unitLevelScaled(u) && sess.supportLevel <= 1)).length;
      if (sess.episodesRun + runnable * sess.seeds > budget) {
        result.deepSkipped++;
      } else {
        const d = deepProbePair(sess, row, run);
        deepResults.push(d);
        opts.onDeep?.(d);
      }
    }
    if (onProgress && sess.episodesRun - lastNote >= 250) {
      lastNote = sess.episodesRun;
      onProgress(`  … ${result.probed.length}/${result.scope} pairs probed (${sess.episodesRun} episodes)`);
    }
  }
  result.episodesRun = sess.episodesRun;
  if (opts.deep) result.deep = deepResults;
  return result;
}

// ---------------------------------------------- host-expression census --
// THE HOST LENS (2026-07-22): before any gem is blamed, measure what the
// HOST does bare. A plain melee host byte-identical with 65 different gems
// is not 65 defects — it is one host that never expresses under the probe
// pilot, wearing 65 names. One bare episode per host at its own probe
// shape records the expression facts; `matrix expression --write` commits
// them; probePair's mute-host screen (above) turns the mute hosts' inert-
// looking pairs into structural 'blind' verdicts, and the printed report
// is the PILOT BACKLOG: which capability would unlock which host class.

/** Per-host expression facts — seed-meaned fingerprint reads off a BARE
 *  run. What the host DID with nothing socketed. */
export interface HostExpressionFacts {
  presses: number; repeats: number;
  hits: number; hitAttempts: number;
  dmgOut: number;
  statusSamples: number;
  minionSamples: number; zoneSamples: number; projectileSamples: number;
  orbsShed: number; lifeGain: number;
}

/** How mute the host is, worst first:
 *  'full'       — never even casts (gate refused, castMode unexercised);
 *  'cast-only'  — casts, but nothing observable comes out;
 *  'partial'    — expresses SOMETHING (statuses, bodies, zones, flights)
 *                 but never lands a hit nor deals damage — hit-riding gems
 *                 on it are a DESIGN question, never census-blinded;
 *  'expressive' — hits and/or damages; gems measure honestly. */
export type HostMuteClass = 'full' | 'cast-only' | 'partial' | 'expressive';

export interface HostExpressionRow {
  skillId: string;
  /** shapeKey() of the host's own bare shape — the screen only claims
   *  pairs probing at this same shape. */
  shape: string;
  facts: HostExpressionFacts;
  mute: HostMuteClass;
  /** Static WHY heuristic for mute hosts — the pilot-backlog grouping. */
  why?: string;
}

export interface HostExpressionBaseline {
  version: 1;
  cfg: { seeds: number; dummyDuration: number; liveDuration: number };
  hosts: Record<string, HostExpressionRow>;
}

export function classifyExpression(f: HostExpressionFacts): HostMuteClass {
  if (f.presses <= 0 && f.repeats <= 0) return 'full';
  const expresses = f.dmgOut > 0 || f.statusSamples > 0 || f.minionSamples > 0
    || f.zoneSamples > 0 || f.projectileSamples > 0 || f.orbsShed > 0 || f.lifeGain > 0;
  if (!expresses && f.hits <= 0) return 'cast-only';
  if (f.hits <= 0 && f.dmgOut <= 0) return 'partial';
  return 'expressive';
}

/** The static WHY ladder for mute hosts — heuristics off the def's own
 *  shape, each naming the pilot/rig capability that would unlock it. The
 *  fall-through is the ANOMALY lane: a host this ladder cannot explain is
 *  exactly what hand adjudication (route c) is reserved for.
 *
 *  THE THEME FLOOR (2026-07-22, the user's ruling under the ladder): when a
 *  named shape CAN be extended but every extension would cost the skill its
 *  theme, theme wins — the residue adjudicates INTENDED-BY-THEME in the
 *  established intended-row grammar (mechanism + live-verification citation
 *  + why the fingerprint is blind). Exemplar: soul_glut's gated touch is the
 *  skill ("curse wide, then feast") — it keeps its gate untouched while
 *  soul_harvest/requiem, whose famines were incidental, grew generators.
 *  Order of resort stays: extend > structurally refuse > document > and only
 *  where theme forbids all three, intended-by-theme. */
export function muteWhy(def: SkillDef): string {
  if (def.gate) {
    return `gated cast (${Object.keys(def.gate).join('+')}) — the probe arena never meets the gate; needs a gate-raising rig (e.g. self-bruise for recentDamage)`;
  }
  if (def.castMode === 'channel' || def.channel) {
    return 'channel host — needs a channel-holding pilot that sustains the beam to expression';
  }
  if (def.castMode === 'charge') return 'charge-hold cast — needs a hold-and-release pilot';
  if (def.castMode === 'guard') return 'guard stance — needs a stance-holding pilot under incoming hits';
  if (def.castMode) return `castMode '${def.castMode}' — unexercised by the probe pilots`;
  if (def.requiresGuard) return 'requires a raised guard — no probe pilot holds one';
  // THE CHARGE FAMINE (R8 forensics, live-fired clean): a hard chargeCost
  // refuses the press until the bank can pay, and the bare rig never banks
  // it — the def's own generators (enemyDeath/move/takeHit/…) cannot run
  // against a parked pilot and a passive dummy, or the charge is fed from
  // outside the bar entirely (orb scoops, equip taps). Engine verified
  // honest: primed banks fire, scale, and empty. Needs a primed-bank lever
  // or a fodder-fed rig.
  {
    const cc = def.chargeCost;
    if (cc && !cc.optional && !(def.chargeGain ?? []).some(cg =>
      cg.charge === cc.charge && (cg.on === 'second' || cg.on === 'use'))) {
      const gens = (def.chargeGain ?? []).filter(cg => cg.charge === cc.charge)
        .map(cg => cg.on);
      return `charge famine — the press demands banked '${cc.charge}' and the bare rig never banks it `
        + `(${gens.length ? `generators: ${gens.join('/')}` : 'no on-def generator — fed by orbs/kit in real play'}); `
        + 'needs a primed-bank lever or a fodder-fed rig';
    }
  }
  // THE GATED TOUCH (R8 forensics): the delivery (or targeting) touches
  // only victims already wearing a listed status — the probe dummy wears
  // none, so every press finds nothing. Filter verified exact live.
  {
    const reqs = (def.delivery as { requiresStatus?: string[] }).requiresStatus
      ?? (typeof def.targeting?.requiresStatus === 'string'
        ? [def.targeting.requiresStatus] : def.targeting?.requiresStatus);
    if (reqs?.length) {
      return `gated touch — only victims wearing ${reqs.slice(0, 3).join('/')}${reqs.length > 3 ? '/…' : ''} `
        + 'are touched, and the probe dummy wears none; needs a pre-statused target';
    }
  }
  // THE UNMEASURED PRODUCE (R8 forensics): the cast plants a lightwell —
  // real produce (a live light pool) that no census channel measures.
  if ((def.effects ?? []).some(e => e.type === 'kindle')) {
    return 'plants a lightwell — live produce no census channel measures; needs a wells channel or adjudication';
  }
  if (def.tags.includes('curse')) return 'curse host — its mark expresses through victims/exploiters the rig may not field';
  if (def.delivery.type === 'melee') {
    return 'melee delivery — the pilot band may stand outside swing reach (whiff band); needs a closing brawler check';
  }
  if (def.delivery.type === 'target') return "'target' delivery — the aim/validity condition may never be met at the probe target";
  return 'unexplained — the anomaly lane: hand-adjudicate or extend a pilot';
}

export interface ExpressionCensusResult {
  rows: HostExpressionRow[];
  baseline: HostExpressionBaseline;
  episodesRun: number;
}

/** One bare run per host at its OWN default probe shape (the shape its
 *  pairs overwhelmingly probe under). Escort-rigged hosts carry the
 *  reference attack's expression in their facts — they read 'expressive'
 *  and are simply never census-blinded (conservative by construction). */
export function hostExpressionCensus(
  opts: ProbeOpts & { skillFilter?: string },
  onProgress?: (msg: string) => void,
): ExpressionCensusResult {
  const r2 = (x: number): number => Math.round(x * 100) / 100;
  const skills = Object.values(SKILLS)
    .filter(s => !s.noDrop && (!opts.skillFilter || s.id.includes(opts.skillFilter)))
    .map(s => s.id).sort();
  const sess = makeProbeSession({ ...opts, seeds: opts.seeds ?? 2 });
  const rows: HostExpressionRow[] = [];
  for (let i = 0; i < skills.length; i++) {
    const id = skills[i];
    const def = SKILLS[id];
    const probe = probeKindFor(def);
    const rig = rigModeFor(def);
    const shape: PairShape = {
      probe: probe.kind, rig: rig.mode, withKey: false,
      ...(probe.pack ? { pack: probe.pack } : {}),
    };
    const eps = bareEpisodesFor(sess, id, shape);
    const n = Math.max(1, eps.length);
    const mean = (k: string): number => r2(eps.reduce((s, e) => s + fpNum(e.fingerprint, k), 0) / n);
    const facts: HostExpressionFacts = {
      presses: mean('presses'), repeats: mean('repeats'),
      hits: mean('hits_out'), hitAttempts: mean('hit_attempts_out'),
      dmgOut: r2(eps.reduce((s, e) => s + outputDamage(e.fingerprint), 0) / n),
      statusSamples: mean('enemy_status_samples'),
      minionSamples: mean('minion_samples'), zoneSamples: mean('zone_samples'),
      projectileSamples: mean('projectile_samples'),
      orbsShed: mean('orbs_shed'), lifeGain: mean('life_gain'),
    };
    const mute = classifyExpression(facts);
    const row: HostExpressionRow = { skillId: id, shape: shapeKey(shape), facts, mute };
    if (mute === 'full' || mute === 'cast-only') row.why = muteWhy(def);
    rows.push(row);
    if (onProgress && (i + 1) % 50 === 0) onProgress(`  ${i + 1}/${skills.length} hosts censused…`);
  }
  const hosts: Record<string, HostExpressionRow> = {};
  for (const r of rows) hosts[r.skillId] = r;
  const baseline: HostExpressionBaseline = {
    version: 1,
    cfg: {
      seeds: sess.seeds,
      dummyDuration: opts.duration ?? COMPAT_CFG.dummyDuration,
      liveDuration: opts.duration ?? COMPAT_CFG.liveDuration,
    },
    hosts,
  };
  return { rows, baseline, episodesRun: sess.episodesRun };
}

// -------------------------------------------------------- the fit explainer --

export interface FitTagCheck { tag: string; present: boolean }

/** WHY a pair fits or refuses, clause by clause. The verdicts themselves come
 *  from the REAL gate functions; the decomposition reads the same def fields
 *  the gate reads, and `agrees` re-derives the boolean from the decomposition
 *  as a drift tripwire — if the engine gate ever grows a clause this module
 *  doesn't narrate, `agrees` goes false and the probe fails loudly. */
export interface FitExplain {
  fit: 'host' | 'crew' | 'refused';
  /** requiresTags vs the BARE instance's tags (census scope: no composed gems). */
  requires: FitTagCheck[];
  /** excludeTags that HIT (any hit refuses). */
  excluded: string[];
  /** No requiresTags at all — the gem fits anything not excluded. */
  openGate: boolean;
  /** requiresMechanisms vs the BARE instance (the golden rule's structural
   *  gate — census scope: no composed gems, so a mechanism another socket
   *  would supply reads absent here, exactly like composed tags). */
  mechanisms: { mechanism: string; present: boolean }[];
  crew:
    | { kind: 'none' }
    | { kind: 'not-rider'; seatBound: string[] }
    | { kind: 'unknowable' }
    | { kind: 'skills'; served: string[]; refused: string[] };
  agrees: boolean;
}

export function explainFit(def: SkillDef, sup: SupportDef): FitExplain {
  const inst = makeSkillInstance(def, 1, 3);
  const host = supportFitsInst(sup, inst);
  const tags = def.tags as readonly string[];
  const requires = (sup.requiresTags ?? []).map(t => ({ tag: t as string, present: tags.includes(t) }));
  const excluded = (sup.excludeTags ?? []).filter(t => tags.includes(t)).map(t => t as string);
  const openGate = !(sup.requiresTags?.length);
  const mechanisms = (sup.requiresMechanisms ?? []).map(m => ({
    mechanism: m,
    // The parameterized resolver ('affliction:bleed', 'status:power') —
    // the same truth the socket gate runs.
    present: mechanismHolds(m, inst),
  }));

  const crewOf = summonCrewOf(def.delivery.type === 'summon' ? def.delivery : undefined,
    id => MONSTERS[id], id => SKILLS[id]);
  let crew: FitExplain['crew'] = { kind: 'none' };
  let crewFits = false;
  if (crewOf) {
    if (!supportRidesMinions(sup)) {
      crew = { kind: 'not-rider', seatBound: minionSeatBoundFields(sup) };
    } else {
      const served = crewSkillsServed(sup, inst, crewOf);
      crewFits = served !== null;
      if (served === 'unknowable') crew = { kind: 'unknowable' };
      else if (crewOf === 'unknowable') crew = { kind: 'unknowable' };
      else {
        const servedIds = (served ?? []).map(d => d.id);
        crew = {
          kind: 'skills',
          served: servedIds,
          refused: crewOf.map(d => d.id).filter(id => !servedIds.includes(id)),
        };
      }
    }
  }
  const fit: FitExplain['fit'] = host ? 'host' : crewFits ? 'crew' : 'refused';
  // Drift tripwire: re-derive the host verdict from the decomposition —
  // tags AND the mechanism gate.
  const expectHost = excluded.length ? false
    : !(openGate || requires.some(r => r.present)) ? false
    : mechanisms.every(m => m.present);
  return { fit, requires, excluded, openGate, mechanisms, crew, agrees: expectHost === host };
}

// --------------------------------------------------------- the ablation lane --

/** One maskable PAYLOAD UNIT of a support: a mods row, a perLevel row, or a
 *  structured graft field. Derived from the engine's own compile-checked
 *  field partition (SUPPORT_PAYLOAD_FIELDS) — a new SupportDef field becomes
 *  a unit the moment the partition classifies it, no registry here to tend. */
export interface AblationUnit {
  key: string;                        // 'mods[0]' | 'perLevel[1]' | field name
  kind: 'mod' | 'perLevel' | 'field';
  idx?: number;                       // mods/perLevel row index
  /** Loadout-time composition levers (grantsTags, resonance): they act
   *  through OTHER gems, so single-gem deadness is design, not defect —
   *  excluded from partial-defect derivation, still listed for the dossier. */
  compositional?: boolean;
  describe: string;
}

export const ABLATION_COMPOSITIONAL_FIELDS: ReadonlySet<string> = new Set(['grantsTags', 'resonance']);

/** Units whose whole magnitude scales with (support level − 1) — invisible
 *  at the probe's default gem level 1; the dossier says how to see them. */
export const unitLevelScaled = (u: AblationUnit): boolean =>
  u.kind === 'perLevel' || u.key === 'levelBonusPer';

const describeMod = (m: Modifier): string =>
  `${m.kind} ${m.value} ${m.stat}`
  + (m.fromStat ? ` from ${m.fromStat}` : '')
  + (m.gauge ? ` per '${m.gauge}'` : '')
  + (m.when ? ` when '${m.when}'` : '')
  + (m.tags?.length ? ` [${m.tags.join(',')}]` : '');

export function ablationUnits(sup: SupportDef): AblationUnit[] {
  const units: AblationUnit[] = [];
  sup.mods.forEach((m, i) =>
    units.push({ key: `mods[${i}]`, kind: 'mod', idx: i, describe: describeMod(m) }));
  (sup.perLevel ?? []).forEach((m, i) =>
    units.push({ key: `perLevel[${i}]`, kind: 'perLevel', idx: i, describe: describeMod(m) }));
  for (const k of Object.keys(sup)) {
    if (k === 'mods' || k === 'perLevel' || !SUPPORT_PAYLOAD_FIELDS.has(k)) continue;
    if ((sup as unknown as Record<string, unknown>)[k] === undefined) continue;
    units.push({
      key: k, kind: 'field',
      ...(ABLATION_COMPOSITIONAL_FIELDS.has(k) ? { compositional: true } : {}),
      describe: `graft field '${k}'`,
    });
  }
  return units;
}

/** The support MINUS one unit — never mutates the original. Identity and
 *  socket-gate fields always survive, so every variant fits exactly where
 *  the real gem fits. */
export function maskSupportUnit(sup: SupportDef, unit: AblationUnit, id: string): SupportDef {
  const clone: SupportDef = { ...sup, id, mods: [...sup.mods] };
  if (sup.perLevel) clone.perLevel = [...sup.perLevel];
  if (unit.kind === 'mod') clone.mods = sup.mods.filter((_, i) => i !== unit.idx);
  else if (unit.kind === 'perLevel') clone.perLevel = (sup.perLevel ?? []).filter((_, i) => i !== unit.idx);
  else delete (clone as unknown as Record<string, unknown>)[unit.key];
  return clone;
}

/** Identity + exactly ONE unit — the blindness screen re-evaluates each unit
 *  in isolation through the same BLINDNESS_RULES the pair verdict uses. */
export function soloSupportUnit(sup: SupportDef, unit: AblationUnit, id: string): SupportDef {
  const solo: SupportDef = {
    id, name: sup.name, description: sup.description, color: sup.color,
    weight: sup.weight, mods: [],
  };
  if (sup.requiresTags) solo.requiresTags = sup.requiresTags;
  if (sup.excludeTags) solo.excludeTags = sup.excludeTags;
  if (unit.kind === 'mod') solo.mods = [sup.mods[unit.idx!]];
  else if (unit.kind === 'perLevel') solo.perLevel = [(sup.perLevel ?? [])[unit.idx!]];
  else (solo as unknown as Record<string, unknown>)[unit.key] = (sup as unknown as Record<string, unknown>)[unit.key];
  return solo;
}

export interface UnitProbeResult {
  unit: AblationUnit;
  /** dead: masked ≡ full — removing it changed nothing on this host.
   *  sole_carrier: masked ≡ bare — this unit IS the gem's whole function.
   *  contributing: masked differs from both.
   *  unmeasured: level-scaled at level 1, blind in isolation, or the pair
   *  itself never diverged — attribution has nothing to attribute. */
  verdict: 'dead' | 'contributing' | 'sole_carrier' | 'unmeasured';
  note?: string;
  /** Channels separating the masked run from the FULL run — the unit's
   *  measured contribution (empty for dead/unmeasured). */
  movedVsFull: ChannelDelta[];
}

export interface PairDeepResult {
  skillId: string;
  supportId: string;
  fit: 'host' | 'crew';
  probe: 'dummy' | 'live';
  keyed?: true;
  seeds: number;
  pairVerdict: PairVerdictKind;
  dOutputRel: number;
  units: UnitProbeResult[];
  /** Masked-variant episodes billed by THIS deep dive (pair/bare billed by
   *  the probe that produced `base`). */
  episodesRun: number;
  warnings: string[];
}

/** THE DEEP DIVE — mask-one-out ablation over a pair's payload units, every
 *  variant PINNED to the full gem's probe shape so all runs compare. This is
 *  the "flagged as working but partly doesn't" detector: an effective pair
 *  whose masked run is byte-identical to the full run carries a unit that
 *  did nothing on this host. Synthetic defs register under __mask__ ids for
 *  the duration of their episodes and are always cleaned up. */
export function deepProbePair(sess: ProbeSession, row: CensusRow, base?: PairProbeRun): PairDeepResult {
  const run = base ?? probePair(sess, row);
  const def = SKILLS[row.skillId];
  const sup = SUPPORTS[row.supportId];
  const out: PairDeepResult = {
    skillId: row.skillId, supportId: row.supportId, fit: run.result.fit,
    probe: run.result.probe, keyed: run.result.keyed, seeds: sess.seeds,
    pairVerdict: run.result.verdict, dOutputRel: run.result.dOutputRel,
    units: [], episodesRun: 0, warnings: [...run.result.warnings],
  };
  const divergent = run.result.verdict === 'effective' || run.result.verdict === 'cost_only';
  const before = sess.episodesRun;
  for (const [i, unit] of ablationUnits(sup).entries()) {
    if (!divergent) {
      out.units.push({
        unit, verdict: 'unmeasured', movedVsFull: [],
        note: `pair verdict '${run.result.verdict}' — unit attribution needs a diverging pair`,
      });
      continue;
    }
    if (unitLevelScaled(unit) && sess.supportLevel <= 1) {
      out.units.push({
        unit, verdict: 'unmeasured', movedVsFull: [],
        note: 'scales with (support level − 1): zero at level 1 — re-run with --support-level 2+',
      });
      continue;
    }
    const maskedId = `__mask__${sup.id}__${i}`;
    SUPPORTS[maskedId] = maskSupportUnit(sup, unit, maskedId);
    try {
      const scen = probeScenario(row.skillId, { id: maskedId, level: sess.supportLevel }, sess.opts,
        { probe: run.shape.probe, rig: run.shape.rig, withKey: run.shape.withKey, pack: run.shape.pack });
      const { episodes: maskedEps } = runScenario(scen, { seeds: sess.seeds, baseSeed: sess.baseSeed });
      sess.episodesRun += maskedEps.length;
      for (const w of new Set(maskedEps.flatMap(e => e.warnings))) {
        if (!out.warnings.includes(w)) out.warnings.push(w);
      }
      if (identicalEps(maskedEps, run.pairEps)) {
        // Nothing changed without it. Blind-in-isolation units report as
        // unmeasured — the probe can't raise their condition, so deadness
        // would be a false claim (the pair-verdict blindness stance, per unit).
        const blind = BLINDNESS_RULES.find(r => r.when(def, soloSupportUnit(sup, unit, `${maskedId}_solo`)));
        out.units.push(blind
          ? { unit, verdict: 'unmeasured', note: `blind in isolation: ${blind.note}`, movedVsFull: [] }
          : { unit, verdict: 'dead', movedVsFull: [] });
      } else if (identicalEps(maskedEps, run.bareEps)) {
        out.units.push({ unit, verdict: 'sole_carrier', movedVsFull: classifyPair(maskedEps, run.pairEps).moved });
      } else {
        out.units.push({ unit, verdict: 'contributing', movedVsFull: classifyPair(maskedEps, run.pairEps).moved });
      }
    } finally {
      delete SUPPORTS[maskedId];
    }
  }
  out.episodesRun = sess.episodesRun - before;
  return out;
}

// --------------------------------------------------------- the pair dossier --

/** Everything the harness knows about ONE pair, assembled for `matrix
 *  explain`: the gate trace, static expectations, the probe shape, the
 *  A/B verdict, per-unit attribution, and data-driven prescriptions. */
export interface PairExplain {
  skillId: string;
  supportId: string;
  fit: FitExplain;
  /** Refused pairs: the census's mechanical-affinity screen. */
  suspect?: { tag: string; evidence: string }[];
  unread: { key: string; site: string }[];
  /** Pair-level blindness rules that match (notes). */
  blindRules: string[];
  shape?: PairShape;
  /** What the gem does to the instance ON PAPER (the lane router honored:
   *  a refused gem contributes nothing here — that IS the finding). */
  staticDelta?: {
    effLevelBare: number;
    effLevelSocketed: number;
    gemMods: string[];
    unlockedThresholds: string[];
  };
  probe?: PairProbeResult;
  deep?: PairDeepResult;
  prescriptions: string[];
}

/** Open prescription rules: finding shapes → the legitimate exits. Extend
 *  here, never in the CLI printer. */
export const PRESCRIPTION_RULES: { when: (x: PairExplain) => boolean; say: (x: PairExplain) => string }[] = [
  {
    when: x => x.fit.fit === 'refused' && !!x.suspect?.length,
    say: x => `TAG HYGIENE: the skill provably has ${x.suspect!.map(s => `'${s.tag}' (${s.evidence})`).join(', ')} `
      + `but the tag list refuses the gem — either add the honest tag in src/data/skills.ts (the gem then boards `
      + `everywhere the tag promises) or make the refusal deliberate with excludeTags in src/data/supports.ts, `
      + `then adjudicate the suspect row in the ledger.`,
  },
  {
    when: x => x.fit.fit === 'refused' && !x.suspect?.length,
    say: () => `HONEST REFUSAL: the tag gate refuses and no mechanical evidence contradicts it — no action.`,
  },
  {
    when: x => x.probe?.verdict === 'inert' && !!x.unread.length,
    say: x => `INERT with a static explanation: ${x.unread.map(u => `'${u.key}' is read only at ${u.site}`).join('; ')}. `
      + `Two legitimate exits — make it WORK (extend the engine read-site; human sign-off) or make it REFUSE `
      + `honestly (requiresTags/excludeTags in src/data/supports.ts). A socket that takes the gem and does `
      + `nothing is the only wrong answer.`,
  },
  {
    when: x => x.probe?.verdict === 'inert' && !x.unread.length && !x.blindRules.length,
    say: () => `INERT with NO static explanation on file: the payload's read-site is undocumented — investigate, `
      + `then either add a data/graftReadSites.ts row (making the expectation static and boot-audited) or a `
      + `BLINDNESS_RULES row in src/sim/compat.ts if the probe simply cannot raise the condition.`,
  },
  {
    when: x => x.probe?.verdict === 'cost_only',
    say: () => `COST-ONLY: the tax bills (gate/chargeCost/cost mods) but no function was observed — usually a `
      + `partially-dead payload. Same two exits as INERT; or escalate --seeds 5 --duration 30 if the function `
      + `is condition-rare.`,
  },
  {
    when: x => x.probe?.verdict === 'blind' || (!!x.blindRules.length && !x.probe),
    say: x => `BLIND under the standard probes: ${x.blindRules.join('; ') || x.probe?.blindWhy || 'see BLINDNESS_RULES'} — unmeasured, `
      + `NOT evidence of breakage. Teaching the probe the missing verb (src/sim/compat.ts — a pilot capability, `
      + `or re-running 'matrix expression --write' after the host changes) re-enters the class into measurement.`,
  },
  {
    when: x => !!x.deep?.units.some(u => u.verdict === 'dead' && !u.unit.compositional),
    say: x => `PARTIAL: dead payload unit(s) on this host — ${x.deep!.units
      .filter(u => u.verdict === 'dead' && !u.unit.compositional)
      .map(u => `${u.unit.key} (${u.unit.describe})`).join('; ')}. Split the gem, extend the read-site, or `
      + `adjudicate as host-conditional in the ledger.`,
  },
  {
    when: x => !!x.deep?.units.some(u => u.verdict === 'unmeasured' && unitLevelScaled(u.unit)),
    say: () => `Level-scaled rows are unmeasured at support level 1 — re-run with --support-level 2+ to exercise `
      + `perLevel/levelBonusPer growth.`,
  },
  {
    when: x => x.probe?.verdict === 'effective'
      && !x.deep?.units.some(u => u.verdict === 'dead' && !u.unit.compositional),
    say: x => `HEALTHY: effective (Δoutput ${(100 * x.probe!.dOutputRel).toFixed(1)}%)`
      + (x.deep ? ` with every measurable unit contributing.` : ` — run with deep attribution to verify per-unit.`),
  },
  {
    when: x => x.probe?.verdict === 'negligible',
    say: () => `NEGLIGIBLE: diverged under noise — a coin flip, not a finding. Escalate this pair alone with `
      + `--seeds 5 --duration 30 before claiming anything.`,
  },
];

/** Assemble the dossier. `run.probes` prices in 2×seeds episodes (+ deep's
 *  units×seeds when asked); pure census callers pass { probes: false }. */
export function explainPair(
  sess: ProbeSession, skillId: string, supportId: string,
  run: { probes: boolean; deep: boolean },
): PairExplain {
  const def = SKILLS[skillId];
  if (!def) throw new Error(`compat: unknown skill '${skillId}'`);
  const sup = SUPPORTS[supportId];
  if (!sup) throw new Error(`compat: unknown support '${supportId}'`);

  const fit = explainFit(def, sup);
  const unread = unreadPayloadRows(sup, def, skillLookup).map(r => ({ key: String(r.key), site: r.site }));
  const blindRules = BLINDNESS_RULES.filter(r => r.when(def, sup)).map(r => r.note);
  const x: PairExplain = { skillId, supportId, fit, unread, blindRules, prescriptions: [] };
  const suspect = fit.fit === 'refused' ? suspectEvidence(def, sup) : undefined;
  if (suspect) x.suspect = suspect;

  if (fit.fit !== 'refused') {
    x.shape = pairShapeFor(def, sup, fit.fit);
    // The paper contract: what socketing the gem does to the instance's
    // effective level, its mod fold, and its threshold unlocks — through
    // the REAL instance machinery (lane router included).
    const gemLevel = sess.opts.gemLevel ?? gemLevelAt(sess.opts.level ?? COMPAT_CFG.level);
    const bare = makeSkillInstance(def, gemLevel, 3);
    const sock = makeSkillInstance(def, gemLevel, 3);
    sock.sockets[0] = { def: sup, level: sess.supportLevel };
    const effBare = effectiveSkillLevel(bare);
    const effSock = effectiveSkillLevel(sock);
    const lvl = sess.supportLevel;
    x.staticDelta = {
      effLevelBare: effBare,
      effLevelSocketed: effSock,
      gemMods: [
        ...sup.mods.map(describeMod),
        ...(lvl > 1
          ? (sup.perLevel ?? []).map(m => `${describeMod(m)} ×${lvl - 1} (perLevel)`)
          : (sup.perLevel?.length ? [`(${sup.perLevel.length} perLevel row(s) dormant at support level 1)`] : [])),
      ],
      unlockedThresholds: (def.thresholds ?? [])
        .filter(t => t.level > effBare && t.level <= effSock)
        .map(t => `Lv ${t.level} — ${t.label}`),
    };
    if (run.probes) {
      const row: CensusRow = { skillId, supportId, fit: fit.fit };
      if (unread.length) row.unread = unread;
      const probeRun = probePair(sess, row);
      x.probe = probeRun.result;
      if (run.deep) x.deep = deepProbePair(sess, row, probeRun);
    }
  }
  x.prescriptions = PRESCRIPTION_RULES.filter(r => r.when(x)).map(r => r.say(x));
  return x;
}
