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
import { choiceLockReason, graftSourcesOf } from '../data/passiveChoices';
import { MAIN_REALM, realmOf } from '../data/passiveRealms';
import {
  SKILL_RARITIES, makeSkillInstance, summonCrewOf, supportFitsInstOrCrew, skillMaxLevel,
  type SkillInstance, type SkillRarity, type SupportInstance,
} from '../engine/skills';
import { SLOT_BY_ID } from '../engine/items';
import { rollItem } from '../engine/itemgen';
import { emptyEssences, type PlayerMeta, type World } from '../engine/world';
import { applySavedCharacter } from '../meta/character';
import { DEFAULT_MODE_ID } from '../meta/modes';
import { classById } from './arena';
import { mulberry32 } from './rng';
import type { BuildEntry, BuildSkillSpec, BuildSpec, SavedBuild } from './types';

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
  // Connectivity: BFS from the start through the allocated set only. REALM
  // nodes seed themselves where their def says they stand alone: every
  // allocated realm ROOT (crests are free) and every node of a
  // FREE-adjacency realm (Pantheon shrines never path).
  const seeds = [start, ...[...allocated].filter(id => {
    const n = PASSIVE_NODES[id];
    const r = n ? realmOf(n) : undefined;
    return !!r && r.id !== MAIN_REALM
      && (r.adjacency === 'free' || (r.roots ?? []).includes(id));
  })];
  const reachable = new Set<string>(seeds);
  const queue = [...seeds];
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
  // Only nodes billing the MAIN pool count against the passive budget —
  // realm-currency nodes spend their own wallet, and realm roots are free.
  const spent = [...allocated].filter(id => {
    const n = PASSIVE_NODES[id];
    const r = n ? realmOf(n) : undefined;
    if (!r || r.id === MAIN_REALM) return true;
    if ((r.roots ?? []).includes(id)) return false;
    return (r.currency ?? 'passive') === 'passive';
  }).length;
  if (spent > budget) {
    warnings.push(`passive budget exceeded: ${spent} allocated vs ${budget} available at level ${level}`);
  }
  return allocated;
}

/** Choice-node picks: replay the LIVE legality rule (choiceLockReason) pick by
 *  pick so the sim can never hold a build a real character couldn't — bad
 *  picks warn and drop, matching auditPassives' hypothesis-friendly stance.
 *  Returns the picks plus the EXTRA points they cost (every pick past a
 *  node's first, which rode the allocation itself). */
function auditChoices(
  spec: Record<string, string[]> | undefined,
  allocated: ReadonlySet<string>,
  warnings: string[],
): { choices: Record<string, string[]>; extraPicks: number } {
  const choices: Record<string, string[]> = {};
  let extraPicks = 0;
  for (const [nodeId, picks] of Object.entries(spec ?? {})) {
    const node = PASSIVE_NODES[nodeId];
    if (!node?.choice) { warnings.push(`choices name '${nodeId}', which is not a choice node — dropped`); continue; }
    if (!allocated.has(nodeId)) { warnings.push(`choices name unallocated node '${nodeId}' — dropped`); continue; }
    for (const oid of picks) {
      const why = choiceLockReason(node, oid, choices, PASSIVE_NODES);
      if (why !== null) { warnings.push(`choice '${nodeId}:${oid}' illegal (${why}) — dropped`); continue; }
      (choices[nodeId] ??= []).push(oid);
      extraPicks++;
    }
    if (choices[nodeId]?.length) extraPicks--; // the first pick rode the allocation
  }
  return { choices, extraPicks };
}

/** Graft bindings: the source must be earned by the spec'd tree, the carrier
 *  must be a minted skill — same drop-and-warn stance as the other audits. */
function auditGrafts(
  spec: Record<string, string | null> | undefined,
  allocated: ReadonlySet<string>,
  choices: Record<string, string[]>,
  knownSkills: ReadonlyMap<string, unknown>,
  warnings: string[],
): Record<string, string | null> {
  const grafts: Record<string, string | null> = {};
  if (!spec) return grafts;
  const live = new Set(graftSourcesOf(allocated, choices, PASSIVE_NODES).map(s => s.key));
  for (const [key, skillId] of Object.entries(spec)) {
    if (!live.has(key)) { warnings.push(`graft '${key}' is not granted by this build's tree — dropped`); continue; }
    if (skillId !== null && !knownSkills.has(skillId)) { warnings.push(`graft '${key}' binds unknown skill '${skillId}' — dropped`); continue; }
    grafts[key] = skillId;
  }
  return grafts;
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
  const { choices, extraPicks } = auditChoices(spec.choices, allocated, warnings);
  const grafts = auditGrafts(spec.grafts, allocated, choices, knownSkills, warnings);

  // --- assemble PlayerMeta exactly the way a save rebuild does ----------------
  const meta: PlayerMeta = {
    classDef,
    name: spec.label ?? spec.id,
    baseAttrs: { ...classDef.attributes, ...(spec.attributes ?? {}) } as PlayerMeta['baseAttrs'],
    attrs: { ...classDef.attributes, ...(spec.attributes ?? {}) } as PlayerMeta['attrs'], // recomputed by recalcPlayer
    xp: 0,
    xpNeeded: PROGRESSION.xpForLevel(spec.level),
    skillPoints: 0,
    passivePoints: Math.max(0, spec.level * PROGRESSION.passivePointsPerLevel + 1 - allocated.size - extraPicks),
    allocated,
    choices,
    realmPoints: {},
    grafts,
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
  // PRE-BANKED charges (BuildSpec.charges): granted AFTER adoption so the
  // recalc'd sheet is live (chargeCap mods fold inside gainCharge — THE one
  // gain gate), letting orbPickup-fed banks (fount sips) be drinkable in
  // arenas where no orb ever falls. Deterministic and identical across a
  // probe pair's bare/socketed runs, so the seed itself always cancels.
  for (const [id, n] of Object.entries(spec.charges ?? {})) {
    if (n > 0) world.player.gainCharge(id, n, n);
  }
  // THE BLED RIG (BuildSpec.bled): a deterministic standing wound — sustain
  // payloads need headroom to pour into (healBy/mana clips at full pools).
  if (spec.bled) {
    const p = world.player;
    if (spec.bled.lifeFrac !== undefined) {
      p.life = Math.max(1, p.maxLife() * spec.bled.lifeFrac);
    }
    if (spec.bled.manaFrac !== undefined) {
      p.mana = Math.max(0, p.availableMaxMana() * spec.bled.manaFrac);
    }
  }
  return warnings;
}

// ------------------------------------------------------------ saved builds --

export function isSavedBuild(entry: BuildEntry): entry is SavedBuild {
  return 'fromSave' in entry;
}

/** The class the arena boots before injection. */
export function entryClassId(entry: BuildEntry): string {
  return isSavedBuild(entry) ? entry.fromSave.classId : entry.classId;
}

/** The character level a report attributes its numbers to. */
export function entryLevel(entry: BuildEntry): number {
  return isSavedBuild(entry) ? entry.fromSave.level : entry.level;
}

export function entryLabel(entry: BuildEntry): string {
  return entry.label ?? entry.id;
}

/** Inject an ACTUAL saved character through the game's own resume path
 *  (applySavedCharacter → adoptSavedMeta): exact rolled gear, exact gem
 *  levels/sockets, allocated tree, companions, hired merc — the whole
 *  entourage, because that IS the player's real power. The rebuild is
 *  tolerant of removed content (that's the live loader's contract), so the
 *  sim re-counts what survived and WARNS about anything dropped — a report
 *  must never quietly grade a save that lost half its kit in a data change. */
function applySavedBuild(world: World, sb: SavedBuild): string[] {
  const warnings: string[] = [];
  const save = sb.fromSave;
  if (!applySavedCharacter(world, save)) {
    return [`saved build '${sb.id}': class '${save.classId}' no longer exists — hero left at boot defaults`];
  }
  const meta = world.meta;
  const lostSkills = (save.knownSkills?.length ?? 0) - meta.knownSkills.size;
  if (lostSkills > 0) warnings.push(`saved build '${sb.id}': ${lostSkills} known skill(s) no longer rebuild (removed ids)`);
  const savedEquip = Object.keys(save.equipped ?? {}).length;
  const liveEquip = Object.values(meta.equipped).filter(Boolean).length;
  if (liveEquip < savedEquip) warnings.push(`saved build '${sb.id}': ${savedEquip - liveEquip} equipped item(s) dropped in rebuild`);
  const unknownNodes = [...meta.allocated].filter(id => !PASSIVE_NODES[id]);
  if (unknownNodes.length) warnings.push(`saved build '${sb.id}': ${unknownNodes.length} allocated passive(s) unknown to the live tree: ${unknownNodes.join(', ')}`);
  return warnings;
}

/** THE injection dispatch: every runner path goes through here, so an
 *  authored BuildSpec and a real CharacterSave are interchangeable anywhere
 *  a scenario names a build. */
export function applyAnyBuild(world: World, entry: BuildEntry, fallbackGearSeed: number): string[] {
  return isSavedBuild(entry)
    ? applySavedBuild(world, entry)
    : applyBuild(world, entry, fallbackGearSeed);
}
