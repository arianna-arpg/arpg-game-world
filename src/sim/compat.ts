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
import { unreadPayloadRows } from '../data/graftReadSites';
import {
  crewSkillsServed, makeSkillInstance, summonCrewOf, supportFitsInst,
  type SkillDef, type SupportDef,
} from '../engine/skills';
import type { SkillTag } from '../engine/stats';
import { CLASSES } from '../data/classes';
import { gemLevelAt } from './data/builds';
import { runScenario } from './runner';
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
  /** Probe target stand-off (px) for the dummy. */
  dummyDistance: 70,
  /** Live-pack spawn distance (px): CLOSE, so the fight is joined within
   *  the first beat — wound-conditioned hosts (thirst-gated drinks, guard
   *  value, heal value) need incoming hits EARLY, not after a stroll. */
  liveDistance: 120,
  /** A channel "moved" when |Δ| > noiseAbs AND |Δ|/max(|bare|,1) > noiseRel. */
  noiseRel: 0.02,
  noiseAbs: 0.5,
  /** Default per-run episode budget (bare baselines + pair probes). The
   *  census always covers everything; probes cover what the budget allows,
   *  round-robin across supports, and the report states coverage honestly. */
  budgetEpisodes: 4000,
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
        const suspect: { tag: string; evidence: string }[] = [];
        for (const t of sup.requiresTags ?? []) {
          const ev = MECHANIC_EVIDENCE.find(e => e.tag === t && e.has(def));
          if (ev) suspect.push({ tag: t, evidence: ev.evidence });
        }
        // Exclusion-tag refusals are deliberate design; only tag-ABSENCE
        // refusals with mechanical proof are suspects.
        const excluded = (sup.excludeTags ?? []).some(t => def.tags.includes(t));
        if (suspect.length && !excluded) { row.suspect = suspect; counts.suspects++; }
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

export function probeKindFor(def: SkillDef, sup?: SupportDef): { kind: 'dummy' | 'live'; why?: string } {
  const hostRule = LIVE_PROBE_HOST_RULES.find(r => r.when(def));
  if (hostRule) return { kind: 'live', why: hostRule.why };
  if (sup) {
    const f = LIVE_PROBE_SUPPORT_FIELDS.find(k => sup[k] !== undefined);
    if (f) return { kind: 'live', why: `support payload '${String(f)}' needs live bodies` };
  }
  return { kind: 'dummy' };
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

export interface ProbeOpts {
  level?: number;
  gemLevel?: number;
  supportLevel?: number;
  duration?: number;       // override BOTH probe kinds' durations
  seeds?: number;
  baseSeed?: number;
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
): BuildSpec {
  const def = SKILLS[skillId];
  const level = opts.level ?? COMPAT_CFG.level;
  const gemLevel = opts.gemLevel ?? gemLevelAt(level);
  const tags = def.tags as readonly string[];
  const classId = tags.includes('spell') ? 'magician' : 'warrior';
  const skills: BuildSpec['skills'] = [
    { id: skillId, level: gemLevel, rarity: 'rare', supports: supports.length ? supports : undefined },
  ];
  const ref = referenceAttackId();
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
   *  pair diffs key-vs-key so the boarding door is open in both runs). */
  forced?: { probe?: 'dummy' | 'live'; rig?: 'solo' | 'escort'; withKey?: boolean },
): ScenarioDef {
  const def = SKILLS[skillId];
  if (!def) throw new Error(`compat: unknown skill '${skillId}'`);
  if (support && !SUPPORTS[support.id]) throw new Error(`compat: unknown support '${support.id}'`);
  const sup = support ? SUPPORTS[support.id] : undefined;
  const probe = forced?.probe ? { kind: forced.probe } as ReturnType<typeof probeKindFor> : probeKindFor(def, sup);
  const rig = forced?.rig ? { mode: forced.rig } as ReturnType<typeof rigModeFor> : rigModeFor(def, sup);
  const supports: { id: string; level: number }[] = [];
  const keyId = forced?.withKey ? resonanceKeyId() : null;
  if (keyId && keyId !== support?.id) supports.push({ id: keyId, level: 1 });
  if (support) supports.push(support);
  const label = supports.map(s => s.id).join('+') || 'bare';
  const build = probeBuild(skillId, supports, label, rig.mode, opts);
  const live = probe.kind === 'live';
  const escorted = rig.mode === 'escort' && build.skills.length > 1;
  return {
    id: `${build.id}__${probe.kind}_${rig.mode}`,
    label: build.label,
    build,
    pilot: escorted ? { kind: 'pair', hostSlot: 0, refSlot: 1 } : soloPilotFor(def),
    parityLevel: opts.level ?? COMPAT_CFG.level,
    waves: live
      ? [{
        monsters: [{
          id: COMPAT_CFG.livePack.id, count: COMPAT_CFG.livePack.count,
          level: (opts.level ?? COMPAT_CFG.level) + COMPAT_CFG.livePack.levelBonus,
        }],
        repeatEvery: COMPAT_CFG.livePack.everySec, distance: COMPAT_CFG.liveDistance,
      }]
      : [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: COMPAT_CFG.dummyDistance }],
    duration: opts.duration ?? (live ? COMPAT_CFG.liveDuration : COMPAT_CFG.dummyDuration),
    stop: 'duration',
    notes: [probe.why, rig.why].filter(Boolean).join('; ') || undefined,
  };
}

// -------------------------------------------------------- classification --

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
  dmg_in: 'defense', dot_in: 'defense', hit_attempts_in: 'defense',
  evades_in: 'defense', blocks_in: 'defense',
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
    note: 'ambush/stealth bonus — no pilot performs the stealth verb',
    when: (_def, sup) => supModsStat(sup, ['ambushBonus', 'stealthRegen']),
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
];

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
    if (Math.abs(d) > COMPAT_CFG.noiseAbs && rel > COMPAT_CFG.noiseRel) {
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
}

export interface MatrixResult {
  census: CensusResult;
  probed: PairProbeResult[];
  /** Pairs eligible for probing (fit host|crew) vs actually probed. */
  eligible: number;
  episodesRun: number;
  skipped: number;
  cfg: typeof COMPAT_CFG;
}

/** Run the matrix: census always; probes round-robin across supports until
 *  the budget spends. `onProgress` narrates (the CLI passes console.log). */
export function runCompatMatrix(opts: MatrixOpts, onProgress?: (msg: string) => void): MatrixResult {
  const census = compatCensus(opts.skillFilter ?? '', opts.supportFilter ?? '');
  const seeds = Math.max(1, opts.seeds ?? 1);
  const baseSeed = opts.baseSeed ?? 0xc0ffee;
  const budget = opts.budget ?? COMPAT_CFG.budgetEpisodes;

  const eligibleRows = census.rows.filter(r => r.fit !== 'refused');
  const result: MatrixResult = {
    census, probed: [], eligible: eligibleRows.length, episodesRun: 0, skipped: 0, cfg: COMPAT_CFG,
  };
  if (opts.staticOnly) { result.skipped = eligibleRows.length; return result; }

  // Round-robin across supports so a budget slice still covers every support
  // with SOME skills, rather than exhausting the alphabet's head.
  const bySupport = new Map<string, CensusRow[]>();
  for (const r of eligibleRows) {
    const list = bySupport.get(r.supportId) ?? [];
    list.push(r);
    bySupport.set(r.supportId, list);
  }
  const queues = [...bySupport.values()];
  const ordered: CensusRow[] = [];
  for (let i = 0; queues.some(q => i < q.length); i++) {
    for (const q of queues) if (i < q.length) ordered.push(q[i]);
  }

  // Bare baselines are shared per (skill × probe shape) — cached on first
  // need, keyed so a support-forced live/escort pair diffs against a bare
  // of the SAME shape (resonance-keyed crew probes included).
  const bareCache = new Map<string, EpisodeResult[]>();
  const bareFor = (skillId: string, probe: 'dummy' | 'live', rig: 'solo' | 'escort', withKey: boolean): EpisodeResult[] => {
    const key = `${skillId}:${probe}:${rig}:${withKey ? 'keyed' : 'bare'}`;
    let eps = bareCache.get(key);
    if (!eps) {
      const scen = probeScenario(skillId, null, opts, { probe, rig, withKey });
      eps = runScenario(scen, { seeds, baseSeed }).episodes;
      result.episodesRun += eps.length;
      bareCache.set(key, eps);
    }
    return eps;
  };

  let lastNote = 0;
  for (const row of ordered) {
    // Budget check BEFORE starting a pair (a bare baseline may also bill).
    const worstCase = seeds * 2;
    if (result.episodesRun + worstCase > budget) { result.skipped++; continue; }
    const def = SKILLS[row.skillId];
    const sup = SUPPORTS[row.supportId];
    const probe = probeKindFor(def, sup);
    const rig = rigModeFor(def, sup);
    // Crew-fit pairs test the BOARDED behavior: the resonance key rides both
    // runs (gated boarding is the shipping mode), so the delta is the gem's
    // crew contribution — a keyless dormant gem is design, not a finding.
    const withKey = row.fit === 'crew' && !!resonanceKeyId() && !sup.resonance;
    const bare = bareFor(row.skillId, probe.kind, rig.mode, withKey);
    const pairScen = probeScenario(row.skillId,
      { id: row.supportId, level: opts.supportLevel ?? COMPAT_CFG.supportLevel }, opts, { withKey });
    const { episodes: pairEps } = runScenario(pairScen, { seeds, baseSeed });
    result.episodesRun += pairEps.length;
    const cls = classifyPair(bare, pairEps);
    // A known-blind pairing may LOOK inert/negligible under this probe —
    // report it as unmeasured instead of minting a false bug.
    const blind = BLINDNESS_RULES.find(r => r.when(def, sup));
    if (blind && (cls.verdict === 'inert' || cls.verdict === 'negligible')) {
      cls.verdict = 'blind';
    }
    const warnings = [...new Set([...bare, ...pairEps].flatMap(e => e.warnings))];
    result.probed.push({
      skillId: row.skillId,
      supportId: row.supportId,
      fit: row.fit as 'host' | 'crew',
      probe: probe.kind,
      keyed: withKey || undefined,
      verdict: cls.verdict,
      identicalSeeds: cls.identicalSeeds,
      seeds,
      moved: cls.moved,
      dOutputRel: Math.round(cls.dOutputRel * 1000) / 1000,
      unread: row.unread,
      warnings,
    });
    if (onProgress && result.episodesRun - lastNote >= 250) {
      lastNote = result.episodesRun;
      onProgress(`  … ${result.probed.length}/${eligibleRows.length} pairs probed (${result.episodesRun} episodes)`);
    }
  }
  result.skipped = eligibleRows.length - result.probed.length;
  return result;
}
