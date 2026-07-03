// ---------------------------------------------------------------------------
// CHARACTER PERSISTENCE — the active-run half of localStorage.
//
// A single in-progress character is saved so closing and relaunching resumes
// it. Death WIPES it (permadeath) while the account survives. Everything is
// stored by id+level+socket-structure and rebuilt through the registries on
// load, TOLERATING ids that no longer exist (a removed skill becomes an empty
// rebindable slot; a removed support becomes an empty socket) — never a crash.
// No migration: a schema bump just makes old saves unresumable (→ class select).
// ---------------------------------------------------------------------------

import { CLASSES } from '../data/classes';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import {
  makeSkillInstance,
  type SkillInstance, type SupportInstance, type SkillRarity,
} from '../engine/skills';
import type { Attributes } from '../engine/stats';
import type { PlayerMeta, World } from '../engine/world';
import type { ExpeditionManifest } from '../packages/manifest';
import { diskBeacon, diskGet, diskPut } from './persistence';

export const CHAR_SCHEMA_VERSION = 1;
const CHAR_KEY = 'arpg_character_v1';
const CHAR_SLOT = 1; // disk save slot (saves/save_1.json)

interface SavedSocket { supportId: string; level: number; }
interface SavedSkill {
  skillId: string; level: number; rarity: SkillRarity;
  sockets: (SavedSocket | null)[];
}
export interface CharacterSave {
  schemaVersion: number;
  classId: string;
  baseAttrs: Attributes;
  xp: number; xpNeeded: number;
  skillPoints: number; passivePoints: number;
  allocated: string[];
  knownSkills: SavedSkill[];
  skillInv: SavedSkill[];
  inventory: SavedSocket[]; // unsocketed support gems
  offerings: number;
  bar: (string | null)[];   // bar bindings as skill ids (any length; padded to BAR_SLOTS on load)
  level: number;            // Actor level (display + xp continuity)
  // Content-package run state (optional → old saves still load). The expedition
  // manifest is the run-LOCKED config (frozen at run start); the ledger is the
  // per-run trigger counters. Wired into World in serialize/applySavedCharacter.
  expedition?: ExpeditionManifest;
  ledger?: Record<string, number>;
  /** STATIC zone ids whose objective reward was claimed this run. Generated /
   *  quest / cave zones are re-minted fresh each run and must NOT persist their
   *  reward-gate (a serialized quest_<id> key would block its own quest reward on
   *  resume), so serializeCharacter filters those prefixes out. Optional. */
  completedObjectives?: string[];
}

const saveSkill = (i: SkillInstance): SavedSkill => ({
  skillId: i.def.id, level: i.level, rarity: i.rarity ?? 'common',
  sockets: i.sockets.map(s => s ? { supportId: s.def.id, level: s.level } : null),
});

export function serializeCharacter(world: World): CharacterSave {
  const m = world.meta;
  return {
    schemaVersion: CHAR_SCHEMA_VERSION,
    classId: m.classDef.id,
    baseAttrs: { ...m.baseAttrs },
    xp: m.xp, xpNeeded: m.xpNeeded,
    skillPoints: m.skillPoints, passivePoints: m.passivePoints,
    allocated: [...m.allocated],
    knownSkills: [...m.knownSkills.values()].map(saveSkill),
    skillInv: m.skillInv.map(saveSkill),
    inventory: m.inventory.map(s => ({ supportId: s.def.id, level: s.level })),
    offerings: m.offerings,
    bar: world.player.skills.map(s => s ? s.def.id : null),
    level: world.player.level,
    expedition: world.manifest,
    ledger: { ...world.ledger },
    // Only STATIC zones persist (generated/quest/cave/crusade/demon zones re-mint
    // fresh each run from the overlay's re-seeded RNG, so a persisted clear-key
    // would wrongly suppress a re-rolled same-id zone's reward on resume).
    completedObjectives: [...world.completedObjectives].filter(id => !/^(gen_|quest_|cave_|crusade_|demon_)/.test(id)),
  };
}

/** Rebuild a SkillInstance; returns null for an unknown skill id (caller skips).
 *  Unknown socketed support ids become empty sockets. (Exported so the corpse-run
 *  reclaim rebuilds the EXACT lost gem — not a random roll.) */
export function rebuildSkill(s: SavedSkill): SkillInstance | null {
  const def = SKILLS[s.skillId];
  if (!def) return null;
  const inst = makeSkillInstance(def, s.level, Math.max(1, s.sockets.length));
  inst.rarity = s.rarity;
  inst.sockets = s.sockets.map(sock => {
    if (!sock) return null;
    const sd = SUPPORTS[sock.supportId];
    return sd ? ({ def: sd, level: sock.level } as SupportInstance) : null;
  });
  return inst;
}

/** Rebuild meta from a save and graft it onto an already-created World/player.
 *  Returns false only if the class id is gone (run is unresumable). */
export function applySavedCharacter(world: World, save: CharacterSave): boolean {
  const classDef = CLASSES.find(c => c.id === save.classId);
  if (!classDef) return false;

  const knownSkills = new Map<string, SkillInstance>();
  for (const ss of save.knownSkills) {
    const inst = rebuildSkill(ss);
    if (inst) knownSkills.set(inst.def.id, inst);
  }
  const skillInv = save.skillInv
    .map(rebuildSkill)
    .filter((x): x is SkillInstance => x !== null);
  const inventory = save.inventory
    .map(s => { const d = SUPPORTS[s.supportId]; return d ? ({ def: d, level: s.level } as SupportInstance) : null; })
    .filter((x): x is SupportInstance => x !== null);

  const meta: PlayerMeta = {
    classDef,
    baseAttrs: { ...save.baseAttrs },
    attrs: { ...save.baseAttrs }, // recomputed by recalcPlayer() inside adoptSavedMeta
    xp: save.xp, xpNeeded: save.xpNeeded,
    skillPoints: save.skillPoints, passivePoints: save.passivePoints,
    allocated: new Set(save.allocated),
    knownSkills, inventory, skillInv, offerings: save.offerings,
  };
  world.ledger = { ...(save.ledger ?? {}) }; // restore per-run trigger counters
  world.completedObjectives = new Set(save.completedObjectives ?? []);
  world.adoptSavedMeta(meta, save.bar, save.level);
  return true;
}

export function loadCharacter(): CharacterSave | null {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(CHAR_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as CharacterSave;
    return data && data.schemaVersion === CHAR_SCHEMA_VERSION ? data : null;
  } catch {
    return null;
  }
}

/** Disk-first character load (used once at boot); warms the localStorage cache.
 *  A wiped slot is stored as '{}' (no schemaVersion) → rejected → no Continue. */
export async function loadCharacterAsync(): Promise<CharacterSave | null> {
  const data = await diskGet<CharacterSave>(CHAR_SLOT);
  if (data && data.schemaVersion === CHAR_SCHEMA_VERSION) {
    try { window.localStorage.setItem(CHAR_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    return data;
  }
  return loadCharacter();
}

export function saveCharacter(world: World): void {
  let body: string;
  try { body = JSON.stringify(serializeCharacter(world)); }
  catch { return; } // quota / serialize errors never crash gameplay
  try { window.localStorage.setItem(CHAR_KEY, body); } catch { /* ignore */ }
  diskPut(CHAR_SLOT, body);
}

export function clearCharacter(): void {
  try { window.localStorage.removeItem(CHAR_KEY); } catch { /* ignore */ }
  // DURABLE wipe: must survive the player closing the game on the death screen,
  // else the disk-first loader resurrects the dead character (permadeath break).
  diskBeacon(CHAR_SLOT, '{}');
}
