// ---------------------------------------------------------------------------
// BUILD INJECTION — a BuildSpec becomes a live hero through the SAME seam a
// saved character uses (world.adoptSavedMeta → recalcPlayer → fillResources).
// No parallel stat math, no bespoke leveling: if the game would compute it,
// the sim computes it identically.
//
// Philosophy: the injector NEVER blocks a hypothesis. Over-budget trees,
// disconnected nodes, misfit supports — all are simulated as requested, but
// every irregularity lands in the returned warnings so a report can't quietly
// present an illegal build as a balance datum.
// ---------------------------------------------------------------------------

import { PROGRESSION } from '../data/classes';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { MONSTERS } from '../data/monsters';
import { PASSIVE_ADJACENCY, PASSIVE_NODES, classStartNode } from '../data/passives';
import {
  SKILL_RARITIES, makeSkillInstance, summonCrewOf, supportFitsInstOrCrew, skillMaxLevel,
  type SkillInstance, type SkillRarity, type SupportInstance,
} from '../engine/skills';
import { SLOT_BY_ID } from '../engine/items';
import { rollItem } from '../engine/itemgen';
import { emptyEssences, type PlayerMeta, type World } from '../engine/world';
import { DEFAULT_MODE_ID } from '../meta/modes';
import { classById } from './arena';
import { mulberry32 } from './rng';
import type { BuildSkillSpec, BuildSpec } from './types';

/** Smallest gem rarity whose socket count fits the requested supports. */
function pickRarity(requested: SkillRarity | undefined, supportCount: number): SkillRarity {
  if (requested) return requested;
  const order: SkillRarity[] = ['rare', 'legendary']; // default rare, grow if needed
  for (const r of order) if (SKILL_RARITIES[r].sockets >= supportCount) return r;
  return 'legendary';
}

function mintSkill(spec: BuildSkillSpec, warnings: string[]): SkillInstance | null {
  const def = SKILLS[spec.id];
  if (!def) {
    warnings.push(`unknown skill '${spec.id}' — dropped from the build`);
    return null;
  }
  const supports = spec.supports ?? [];
  const rarity = pickRarity(spec.rarity, supports.length);
  const sockets = SKILL_RARITIES[rarity].sockets;
  if (supports.length > sockets) {
    warnings.push(`skill '${spec.id}' (${rarity}, ${sockets} sockets) asked for ${supports.length} supports — extras dropped`);
  }
  const level = spec.level ?? 1;
  if (level > skillMaxLevel(def)) {
    warnings.push(`skill '${spec.id}' level ${level} exceeds its cap ${skillMaxLevel(def)} (simulated anyway — overlevel probe)`);
  }
  const inst = makeSkillInstance(def, level, sockets);
  inst.rarity = rarity;
  supports.slice(0, sockets).forEach((s, i) => {
    const sdef = SUPPORTS[s.id];
    if (!sdef) {
      warnings.push(`unknown support '${s.id}' on '${spec.id}' — socket left empty`);
      return;
    }
    // Legality mirrors the game's crew-aware gate exactly (one function):
    // lane-pure instance fit OR a composed crew fit — Faultfinder boards
    // the warriors' Cleave, and Tectonic Echoes rides its granted
    // 'fissure' aboard that same Cleave. Neither is a probe irregularity.
    // NOTE the lane router also means a force-socketed misfit is genuinely
    // INERT now (host reads skip it), matching game-reachable states.
    const crew = summonCrewOf(def.delivery.type === 'summon' ? def.delivery : undefined,
      id => MONSTERS[id], id => SKILLS[id]);
    if (!supportFitsInstOrCrew(sdef, inst, crew)) {
      warnings.push(`support '${s.id}' does not fit '${spec.id}' (tag rules) — socketed anyway, but the lane router leaves it inert`);
    }
    const gem: SupportInstance = { def: sdef, level: s.level ?? 1 };
    inst.sockets[i] = gem;
  });
  return inst;
}

/** Passive picks: existence + connectivity + budget — warnings, never gates. */
function auditPassives(classId: string, picks: string[], level: number, warnings: string[]): Set<string> {
  const start = classStartNode(classId);
  const allocated = new Set<string>([start]);
  for (const id of picks) {
    if (!PASSIVE_NODES[id]) { warnings.push(`unknown passive node '${id}' — dropped`); continue; }
    allocated.add(id);
  }
  // Connectivity: BFS from the start through the allocated set only.
  const reachable = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const at = queue.pop()!;
    for (const next of PASSIVE_ADJACENCY[at] ?? []) {
      if (allocated.has(next) && !reachable.has(next)) { reachable.add(next); queue.push(next); }
    }
  }
  const stranded = [...allocated].filter(id => !reachable.has(id));
  if (stranded.length) {
    warnings.push(`passives not connected to '${start}': ${stranded.join(', ')} (simulated anyway)`);
  }
  const budget = level * PROGRESSION.passivePointsPerLevel + 1; // +1: the creation freebie
  const spent = allocated.size; // start node included, mirroring live allocation
  if (spent > budget) {
    warnings.push(`passive budget exceeded: ${spent} allocated vs ${budget} available at level ${level}`);
  }
  return allocated;
}

/** Inject a BuildSpec into the world's local seat. Returns audit warnings. */
export function applyBuild(world: World, spec: BuildSpec, fallbackGearSeed: number): string[] {
  const warnings: string[] = [];
  const classDef = classById(spec.classId);

  // --- skills -> knownSkills + bar -----------------------------------------
  const knownSkills = new Map<string, SkillInstance>();
  for (const s of spec.skills) {
    if (knownSkills.has(s.id)) { warnings.push(`duplicate skill '${s.id}' in build — first wins`); continue; }
    const inst = mintSkill(s, warnings);
    if (inst) knownSkills.set(s.id, inst);
  }
  const bar: (string | null)[] = (spec.bar ?? spec.skills.map(s => s.id)).map(id => {
    if (id === null) return null;
    if (knownSkills.has(id)) return id;
    warnings.push(`bar names unknown/unminted skill '${id}' — slot emptied`);
    return null;
  });

  // --- gear (recipes → real rolls, deterministic) ---------------------------
  const gearRng = mulberry32(spec.gearSeed ?? fallbackGearSeed);
  const equipped: PlayerMeta['equipped'] = {};
  for (const g of spec.gear ?? []) {
    if (!SLOT_BY_ID[g.slot]) {
      warnings.push(`unknown equip slot '${g.slot}' — item skipped`);
      continue;
    }
    if (equipped[g.slot]) { warnings.push(`slot '${g.slot}' specified twice — first wins`); continue; }
    const item = rollItem({
      ilvl: g.ilvl ?? spec.level,
      rng: gearRng,
      rarity: g.rarity,
      baseId: g.baseId,
      uniqueId: g.uniqueId,
    });
    if (!item) {
      warnings.push(`gear roll for slot '${g.slot}' produced nothing (base '${g.baseId ?? 'themed'}' @ ilvl ${g.ilvl ?? spec.level})`);
      continue;
    }
    equipped[g.slot] = item;
  }

  // --- the tree --------------------------------------------------------------
  const allocated = auditPassives(spec.classId, spec.passives ?? [], spec.level, warnings);

  // --- assemble PlayerMeta exactly the way a save rebuild does ----------------
  const meta: PlayerMeta = {
    classDef,
    name: spec.label ?? spec.id,
    baseAttrs: { ...classDef.attributes, ...(spec.attributes ?? {}) } as PlayerMeta['baseAttrs'],
    attrs: { ...classDef.attributes, ...(spec.attributes ?? {}) } as PlayerMeta['attrs'], // recomputed by recalcPlayer
    xp: 0,
    xpNeeded: PROGRESSION.xpForLevel(spec.level),
    skillPoints: 0,
    passivePoints: Math.max(0, spec.level * PROGRESSION.passivePointsPerLevel + 1 - allocated.size),
    allocated,
    vocations: [],
    vocationPoints: 0,
    knownSkills,
    inventory: [],
    skillInv: [],
    offerings: 0,
    items: [],
    equipped,
    essences: emptyEssences(),
    vestiges: {},
    modeId: DEFAULT_MODE_ID,
    modeStage: 0,
    charId: `sim_${spec.id}`,
  };
  world.adoptSavedMeta(meta, bar, spec.level);
  return warnings;
}
