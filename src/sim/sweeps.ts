// ---------------------------------------------------------------------------
// SWEEP DEFINITIONS AND SCENARIO REFS — what a lane measures, as plain data.
//
// The CLI verbs (`sweep skills`, `sweep progression`, `sweep matchups`), the
// farm's planner and the what-if lane all ask for scenarios through this one
// module, so "the L10 fireball row" means the same episode everywhere.
//
// A SCENARIO REF is a short string naming a scenario: `spar:warrior:20:geared`,
// `skill:fireball:10`, `duel:geared_warrior_l20:zombie:20`, `id:smoke_row`. The
// grammar is an open registry (SCENARIO_REFS), so a new kind of question is one
// row, and a finding can carry its measurement in a single copyable token.
//
// Browser-safe: no Node imports. File IO stays in balance/.
// ---------------------------------------------------------------------------

import { CLASSES } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { SKILLS } from '../data/skills';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { rollItem } from '../engine/itemgen';
import { SLOT_BY_ID } from '../engine/items';
import { hostIdOf, hostTreeNodes } from './compat';
import { BUILDS, GEARED_CFG, ensureTierBuild, gearedBuild, gemLevelAt } from './data/builds';
import {
  MATCHUP_CFG, PARITY_PACK, SCENARIOS, dummyDps, matchupDuel, parityPack, pilotFor, pressure, sparDps,
  type TierOpt,
} from './data/scenarios';
import { SPAR_CFG } from './data/sparring';
import { mulberry32 } from './rng';
import type { ResolvedTarget } from './data/panels';
import type { BuildSpec, MetricSummary, ScenarioDef, ScenarioReport } from './types';

// --------------------------------------------------------------- the skills --

/** Ten attributes at a flat 40 — clears requirement gates so a sweep measures
 *  the SKILL, not the class's ability to equip it. Documented rig, not a bug. */
export const SWEEP_ATTRIBUTES: Record<string, number> = {
  strength: 40, prowess: 40, fortitude: 40,
  dexterity: 40, finesse: 40, charisma: 40,
  intelligence: 40, wisdom: 40, willpower: 40,
  vitality: 40,
};

export interface SkillRig { skillId: string; build: BuildSpec }

export interface SkillRigOpts {
  level: number;
  gemLevel?: number;
  filter?: string;
  classOverride?: string;
  droppableOnly?: boolean;
  withModes?: boolean;
}

/** One solo rig per attack/spell row, plus a row per limb under `withModes`. */
export function skillRigs(o: SkillRigOpts): { rigs: SkillRig[]; skippedNoDrop: number } {
  const gemLevel = o.gemLevel ?? Math.max(1, Math.floor(o.level / 3) + 1);
  const rigs: SkillRig[] = [];
  let skippedNoDrop = 0;
  for (const [id, def] of Object.entries(SKILLS)) {
    const tags = def.tags as readonly string[];
    if (!tags.includes('attack') && !tags.includes('spell')) continue;
    if (o.filter && !id.includes(o.filter)) continue;
    if (o.droppableOnly && def.noDrop) { skippedNoDrop++; continue; }
    const classId = o.classOverride || (tags.includes('spell') ? 'magician' : 'warrior');
    const hosts: { hostId: string; treeNodes?: string[] }[] = [{ hostId: id }];
    if (o.withModes) {
      for (const b of def.tree?.branches ?? []) {
        const hostId = hostIdOf(id, b.id);
        hosts.push({ hostId, treeNodes: hostTreeNodes(hostId) });
      }
    }
    for (const h of hosts) {
      rigs.push({
        skillId: h.hostId,
        build: {
          id: `sweep_${h.hostId}_l${o.level}`,
          label: `solo ${h.hostId} @ L${o.level} (gem ${gemLevel})`,
          classId,
          level: o.level,
          attributes: SWEEP_ATTRIBUTES,
          skills: [{ id, level: gemLevel, ...(h.treeNodes ? { treeNodes: h.treeNodes } : {}) }],
        },
      });
    }
  }
  return { rigs, skippedNoDrop };
}

/** The skill rig against the immortal dummy. */
export function skillDummyScenario(rig: SkillRig, level: number): ScenarioDef {
  return {
    id: `sweep_dummy_${rig.skillId}_l${level}`,
    label: `Sweep — solo ${rig.skillId} vs dummy @ L${level}`,
    build: rig.build,
    pilot: { kind: 'brawler' },
    waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
    duration: 20,
    stop: 'duration',
  };
}

/** The matrix column a target occupies. */
export const targetColumn = (t: Pick<ResolvedTarget, 'monsterId' | 'rarity'>): string =>
  `${t.monsterId}${t.rarity && t.rarity !== 'normal' ? `_${t.rarity}` : ''}`;

/** The skill rig against a killable respawn-duel. */
export function skillVsScenario(rig: SkillRig, level: number, tgt: ResolvedTarget, duration = 25): ScenarioDef {
  const col = targetColumn(tgt);
  return {
    id: `sweep_vs_${col}_${rig.skillId}_l${level}`,
    label: `Sweep — solo ${rig.skillId} vs ${tgt.monsterId} @ L${level}`,
    build: rig.build,
    pilot: { kind: 'brawler' },
    waves: [{
      monsters: [{ id: tgt.monsterId, level: tgt.level, count: tgt.count, ...(tgt.rarity ? { rarity: tgt.rarity } : {}) }],
      respawnOnClear: MATCHUP_CFG.respawnDelay,
    }],
    duration,
    stop: 'duration',
  };
}

// ---------------------------------------------------------- the power curve --

/** The open lane registry a class is measured on. Dummy and parity are the
 *  historical pair; spar and pressure read the kits they cannot. */
export const CLASS_LANES: Record<string, (classId: string, level: number, o?: TierOpt) => ScenarioDef> = {
  dummy: dummyDps,
  spar: sparDps,
  parity: parityPack,
  pressure: (c, l, o) => pressure(c, l, 8, o),
};

export interface ProgressionOpts {
  classIds: string[];
  levels: number[];
  /** Tiers beyond the always-measured 'starter'. */
  tiers?: string[];
  lanes?: string[];
}

/** Every class × level × tier × lane. Tiers above starter skip level 1, where a
 *  wardrobe has nothing to roll. */
export function progressionDefs(o: ProgressionOpts): ScenarioDef[] {
  const lanes = o.lanes?.length ? o.lanes : ['dummy', 'parity'];
  for (const l of lanes) if (!CLASS_LANES[l]) throw new Error(`unknown class lane '${l}' (have: ${Object.keys(CLASS_LANES).join(', ')})`);
  const defs: ScenarioDef[] = [];
  for (const classId of o.classIds) {
    for (const level of o.levels) {
      for (const lane of lanes) defs.push(CLASS_LANES[lane](classId, level));
      for (const tier of o.tiers ?? []) {
        if (tier === 'starter' || level <= 1) continue;
        for (const lane of lanes) defs.push(CLASS_LANES[lane](classId, level, { tier }));
      }
    }
  }
  return defs;
}

// --------------------------------------------------------------- the grids --

export interface MatchgridOpts {
  classIds: string[];
  levels: number[];
  tiers: string[];
  targetsAt: (level: number) => ResolvedTarget[];
  duration?: number;
}

/** Reference builds × enemy targets: `sweep matchups` for many builds at once. */
export function matchgridDefs(o: MatchgridOpts): ScenarioDef[] {
  const defs: ScenarioDef[] = [];
  for (const classId of o.classIds) {
    for (const level of o.levels) {
      for (const tier of o.tiers) {
        if (tier !== 'starter' && level <= 1) continue;
        const buildId = ensureTierBuild(tier, classId, level);
        for (const tgt of o.targetsAt(level)) {
          defs.push(matchupDuel(buildId, tgt.monsterId, {
            level: tgt.level, count: tgt.count, rarity: tgt.rarity,
            duration: o.duration, pilot: pilotFor(classId), idTag: buildId,
          }));
        }
      }
    }
  }
  return defs;
}

/** Why a monster cannot stand as a duel opponent, or null if it can. A skip is
 *  counted and reported: an unmeasured body is an instrument gap to state. */
export function bestiarySkipReason(monsterId: string): string | null {
  const d = MONSTERS[monsterId];
  if (!d) return 'unknown';
  if (d.passive) return 'passive';
  if (d.immortal) return 'immortal';
  return null;
}

export interface BestiaryOpts {
  levels: number[];
  /** Measuring-stick class ids (one melee, one caster, typically). */
  classIds: string[];
  tier: string;
  filter?: string;
  duration?: number;
}

/** Every combat-capable monster, duelled at each level by the measuring sticks:
 *  how long it lives and how much it hurts. The enemy side of the ledger. */
export function bestiaryDefs(o: BestiaryOpts): { defs: ScenarioDef[]; skipped: { id: string; why: string }[] } {
  const defs: ScenarioDef[] = [];
  const skipped: { id: string; why: string }[] = [];
  for (const id of Object.keys(MONSTERS).sort()) {
    if (o.filter && !id.includes(o.filter)) continue;
    const why = bestiarySkipReason(id);
    if (why) { skipped.push({ id, why }); continue; }
    for (const level of o.levels) {
      for (const classId of o.classIds) {
        const buildId = ensureTierBuild(o.tier, classId, level);
        defs.push(matchupDuel(buildId, id, {
          level, duration: o.duration ?? 25, pilot: pilotFor(classId), idTag: `bestiary_${buildId}`,
        }));
      }
    }
  }
  return { defs, skipped };
}

// ------------------------------------------------------------- affix value --

export const AFFIX_VALUE_CFG = {
  /** Wardrobe seeds per row: the magic piece's other roll is noise to average. */
  gearSeeds: [0x9ea7ed, 0x51ab1e],
  /** The row id's marker for the slot-empty baseline. */
  baseline: '__none__',
  /** Families measured elsewhere, or never worn on the doll: slot grafts are their
   *  support gems wearing a ring (the matrix reads those), relics seat in the
   *  Reliquary. The dry roll would refuse the relics anyway; this keeps it cheap. */
  excludePrefixes: ['slotgraft_', 'relic_'],
};

/** The first doll slot that can actually carry this family, found by a dry roll
 *  through the real roller. Null for families the doll never wears (relics). */
export function slotForFamily(family: string, level: number): string | null {
  for (const slot of GEARED_CFG.slots) {
    const item = rollItem({
      ilvl: level, rng: mulberry32(1), rarity: 'magic', withFamily: family,
      category: SLOT_BY_ID[slot].accepts[0],
    });
    if (item?.affixes?.some(a => ITEM_AFFIXES[a.id]?.family === family)) return slot;
  }
  return null;
}

export const affixFamilies = (): string[] =>
  [...new Set(Object.values(ITEM_AFFIXES).map(a => a.family))]
    .filter(f => !AFFIX_VALUE_CFG.excludePrefixes.some(p => f.startsWith(p)))
    .sort();

/** The stick's wardrobe with one slot held out, and optionally that slot refilled
 *  with a magic piece carrying the family. The held-out slot rolls LAST so the other
 *  pieces stay identical between a row and its baseline (one roll stream). */
export function affixBuild(classId: string, level: number, slot: string, family: string | null, gearSeed: number): BuildSpec {
  const base = gearedBuild(classId, level);
  const gear = (base.gear ?? []).filter(g => g.slot !== slot);
  if (family) gear.push({ slot, rarity: 'magic', withFamily: family });
  return {
    ...base, gear, gearSeed,
    id: `affixval_${classId}_l${level}_${slot}_${family ?? AFFIX_VALUE_CFG.baseline}_${gearSeed}`,
  };
}

/** One rig of the affix lane. Offense reads the partner, defense the pack. */
export function affixScenario(build: BuildSpec, rig: 'spar' | 'pack'): ScenarioDef {
  const pilot = pilotFor(build.classId);
  return rig === 'spar'
    ? {
      id: `${build.id}__spar`, build, pilot, parityLevel: build.level,
      waves: [{ monsters: [{ id: SPAR_CFG.id, level: build.level }], distance: 70 }],
      duration: 30, stop: 'duration',
    }
    : {
      id: `${build.id}__pack`, build, pilot, parityLevel: build.level,
      waves: [{ monsters: PARITY_PACK, repeatEvery: 8 }],
      duration: 40, stop: 'duration',
    };
}

/** What is each affix family worth? Every family the doll can wear, on the sticks,
 *  against the same wardrobe with that slot empty. */
export function affixValueDefs(o: { level: number; classIds: string[] }): { defs: ScenarioDef[]; notWearable: string[] } {
  const defs: ScenarioDef[] = [];
  const notWearable: string[] = [];
  const seen = new Set<string>();
  for (const family of affixFamilies()) {
    const slot = slotForFamily(family, o.level);
    if (!slot) { notWearable.push(family); continue; }
    for (const classId of o.classIds) {
      for (const gearSeed of AFFIX_VALUE_CFG.gearSeeds) {
        for (const fam of [family, null]) {
          const build = affixBuild(classId, o.level, slot, fam, gearSeed);
          if (seen.has(build.id)) continue;
          seen.add(build.id);
          defs.push(affixScenario(build, 'spar'), affixScenario(build, 'pack'));
        }
      }
    }
  }
  return { defs, notWearable };
}

// ------------------------------------------------------------ scenario refs --

/** The open ref grammar: `<kind>:<arg>:<arg>…`. */
export const SCENARIO_REFS: Record<string, (args: string[]) => ScenarioDef> = {
  /** `id:<scenario id>` — any registered scenario. */
  id: ([id]) => {
    const s = SCENARIOS[id];
    if (!s) throw new Error(`no scenario '${id}'`);
    return s;
  },
  /** `dummy|spar|parity|pressure:<class>:<level>[:<tier>]`. */
  dummy: ([c, l, t]) => dummyDps(c, Number(l), t ? { tier: t } : undefined),
  spar: ([c, l, t]) => sparDps(c, Number(l), t ? { tier: t } : undefined),
  parity: ([c, l, t]) => parityPack(c, Number(l), t ? { tier: t } : undefined),
  pressure: ([c, l, t]) => pressure(c, Number(l), 8, t ? { tier: t } : undefined),
  /** `skill:<id>:<level>[:<monster>]` — the sweep rig, vs dummy or a duel. */
  skill: ([id, l, monster]) => {
    const level = Number(l);
    const { rigs } = skillRigs({ level, filter: id });
    const rig = rigs.find(r => r.skillId === id);
    if (!rig) throw new Error(`no attack/spell skill '${id}'`);
    if (!monster) return skillDummyScenario(rig, level);
    if (!MONSTERS[monster]) throw new Error(`unknown monster '${monster}'`);
    return skillVsScenario(rig, level, { monsterId: monster, level, count: 1, via: 'literal' });
  },
  /** `affix:<class>:<level>:<slot>:<family|__none__>:<gear seed>:<spar|pack>`. */
  affix: ([c, l, slot, family, seed, rig]) => affixScenario(
    affixBuild(c, Number(l), slot, family === AFFIX_VALUE_CFG.baseline ? null : family, Number(seed)),
    rig === 'pack' ? 'pack' : 'spar',
  ),
  /** `duel:<build id>:<monster>[:<level>[:<rarity>]]`. */
  duel: ([build, monster, l, rarity]) => {
    if (!BUILDS[build]) throw new Error(`unknown build '${build}'`);
    if (!MONSTERS[monster]) throw new Error(`unknown monster '${monster}'`);
    const b = BUILDS[build];
    const classId = 'fromSave' in b ? b.fromSave.classId : b.classId;
    return matchupDuel(build, monster, {
      level: l ? Number(l) : undefined,
      ...(rarity ? { rarity: rarity as NonNullable<Parameters<typeof matchupDuel>[2]>['rarity'] } : {}),
      pilot: pilotFor(classId),
    });
  },
};

export function resolveScenarioRef(ref: string): ScenarioDef {
  const [kind, ...args] = ref.split(':');
  const make = SCENARIO_REFS[kind];
  if (!make) throw new Error(`unknown scenario ref kind '${kind}' in '${ref}' (have: ${Object.keys(SCENARIO_REFS).join(', ')})`);
  return make(args);
}

// ----------------------------------------------------- class expression --

export type ClassExpression =
  /** Lands damage on the passive dummy: every lane reads it. */
  | 'dummy'
  /** Silent on the dummy, deals damage to a body that fights back. */
  | 'spar'
  /** Silent one-on-one, but kills or deals damage in the pack lanes. */
  | 'pack'
  /** Expresses nothing anywhere the instrument can ask. The instrument gap. */
  | 'mute';

export interface ClassExpressionRow {
  classId: string;
  level: number;
  tier: string;
  expression: ClassExpression;
  /** The headline read of the best lane that expresses this kit. */
  bestLane: string | null;
  bestDps: number;
  dummyDps: number;
  sparDps: number;
  parityDps: number;
  parityKills: number;
  casts: number;
}

/** Output below this counts as silent (the floor tickles more than this). */
export const EXPRESSION_CFG = { silentDps: 0.5 };

const mean = (r: ScenarioReport | undefined, k: string): number => {
  const m: MetricSummary | undefined = r?.metrics[k];
  return m && Number.isFinite(m.mean) ? m.mean : 0;
};

/** Classify one class at one band off the lane rows that already ran. */
export function classExpressionRow(
  classId: string, level: number, tier: string, byId: ReadonlyMap<string, ScenarioReport>,
): ClassExpressionRow {
  const tag = tier === 'starter' ? '' : `${tier}_`;
  const dummy = byId.get(`dummy_dps_${tag}${classId}_l${level}`);
  const spar = byId.get(`spar_dps_${tag}${classId}_l${level}`);
  const parity = byId.get(`ttk_parity_${tag}${classId}_l${level}`);
  const pressureRow = byId.get(`pressure_${tag}${classId}_l${level}`);
  const dummyDpsV = mean(dummy, 'dps_dummy');
  const sparDpsV = mean(spar, 'dps_out');
  const parityDps = Math.max(mean(parity, 'dps_out'), mean(pressureRow, 'dps_out'));
  const parityKills = Math.max(mean(parity, 'kills'), mean(pressureRow, 'kills'));
  const S = EXPRESSION_CFG.silentDps;
  const lanes: [string, number][] = [['dummy', dummyDpsV], ['spar', sparDpsV], ['pack', parityDps]];
  const best = lanes.reduce((a, b) => (b[1] > a[1] ? b : a));
  const expression: ClassExpression = dummyDpsV > S ? 'dummy'
    : sparDpsV > S ? 'spar'
      : parityDps > S || parityKills > 0 ? 'pack'
        : 'mute';
  return {
    classId, level, tier, expression,
    bestLane: best[1] > S ? best[0] : null,
    bestDps: best[1],
    dummyDps: dummyDpsV, sparDps: sparDpsV, parityDps, parityKills,
    casts: mean(dummy, 'casts_per_sec'),
  };
}

/** The class ids the roster holds, for every lane that sweeps classes. */
export const rosterClassIds = (): string[] => CLASSES.map(c => c.id);

export { gemLevelAt };
