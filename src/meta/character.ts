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
import { MONSTERS } from '../data/monsters';
import {
  makeSkillInstance,
  type SkillInstance, type SupportInstance, type SkillRarity,
} from '../engine/skills';
import { rebuildItem } from '../engine/itemgen';
import type { ItemInstance } from '../engine/items';
import type { Attributes } from '../engine/stats';
import { emptyEssences, type PlayerMeta, type World } from '../engine/world';
import type { ExpeditionManifest } from '../packages/manifest';
import { diskBeacon, diskGet, diskPut, saveAccount } from './persistence';
import { DEATH_SCHEMA, MAX_DEATH_RECORDS, type DeathRecord } from './death';
import { DEFAULT_MODE_ID, mintCharId, modeById, type RosterEntry } from './modes';
import type { MercSnapshot } from './mercs';
import type { Account } from './account';

export const CHAR_SCHEMA_VERSION = 1;
const CHAR_KEY = 'arpg_character_v1';
const CHAR_SLOT = 1; // disk save slot (saves/save_1.json)

interface SavedSocket { supportId: string; level: number; }
interface SavedSkill {
  skillId: string; level: number; rarity: SkillRarity;
  sockets: (SavedSocket | null)[];
  /** GRANTED (reacquired starter — worthless to salvage/sacrifice) and the
   *  essence-bought level count (excluded from font refunds). Optional →
   *  older saves load unchanged. */
  granted?: boolean;
  essenceLevels?: number;
  /** THE GRIMOIRE: the bestiary form this instance is attuned to (a monster
   *  def id; rebuilt tolerantly — a removed def drops the attunement). */
  attunedForm?: string;
}
export interface CharacterSave {
  schemaVersion: number;
  classId: string;
  /** THE NAME (Naming/Nemesis): player-given, or the class name when unnamed.
   *  Optional → pre-naming saves load named for their class. */
  name?: string;
  baseAttrs: Attributes;
  xp: number; xpNeeded: number;
  skillPoints: number; passivePoints: number;
  allocated: string[];
  /** Vocations GRANTED to this character + unspent vocation points. Optional →
   *  pre-vocation saves still load (`?? []` / `?? 0`). Allocated vocation-tree
   *  nodes ride the ordinary `allocated` list; a removed VocationDef's ids are
   *  skipped by recalc like any unknown node. */
  vocations?: string[];
  vocationPoints?: number;
  knownSkills: SavedSkill[];
  skillInv: SavedSkill[];
  inventory: SavedSocket[]; // unsocketed support gems
  /** GEAR: bag + doll. ItemInstances are already pure JSON (base/affix ids +
   *  0..1 rolls), so they serialize verbatim and rebuildItem re-validates
   *  against live registries on load (unknown base → item dropped; unknown
   *  affix → line dropped). Optional → pre-item saves still load. */
  items?: ItemInstance[];
  equipped?: Record<string, ItemInstance>;
  /** Salvage-currency wallet (per essence id). Optional → pre-essence saves. */
  essences?: Record<string, number>;
  /** Vestige wallet (socket material, per vestige id). Optional. */
  vestiges?: Record<string, number>;
  offerings: number;
  /** TAMED COMPANIONS (the Hunter's bond): re-fielded beside the keeper on
   *  resume, downed state included. Optional → older saves load unchanged;
   *  a removed def simply releases that bond. */
  companions?: { defId: string; level: number; skillId: string; downed?: boolean }[];
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
  /** CHARACTER MODE (meta/modes.ts): the life-contract + ladder stage + roster
   *  identity. Optional → every pre-mode save loads as a plain mortal. */
  modeId?: string;
  modeStage?: number;
  charId?: string;
  /** The character's OWN corpse ring (roster-saved modes): an Undying vessel's
   *  falls live HERE — inside its own save — so no other character can ever
   *  see or loot them. Same per-record schema tolerance as the account ring. */
  deaths?: DeathRecord[];
  /** THE HIRED BLADE (meta/mercs.ts): the contract rides the patron's save —
   *  snapshot INLINE (resilient to roster churn), refs for pool release. */
  mercenary?: { name: string; snapshot: MercSnapshot; mercId?: string; templateId?: string };
}

const saveSkill = (i: SkillInstance): SavedSkill => ({
  skillId: i.def.id, level: i.level, rarity: i.rarity ?? 'common',
  sockets: i.sockets.map(s => s ? { supportId: s.def.id, level: s.level } : null),
  ...(i.granted ? { granted: true } : {}),
  ...(i.essenceLevels ? { essenceLevels: i.essenceLevels } : {}),
  ...(i.attunedForm ? { attunedForm: i.attunedForm } : {}),
});

export function serializeCharacter(world: World): CharacterSave {
  const m = world.meta;
  return {
    schemaVersion: CHAR_SCHEMA_VERSION,
    classId: m.classDef.id,
    name: m.name,
    baseAttrs: { ...m.baseAttrs },
    xp: m.xp, xpNeeded: m.xpNeeded,
    skillPoints: m.skillPoints, passivePoints: m.passivePoints,
    allocated: [...m.allocated],
    vocations: [...m.vocations],
    vocationPoints: m.vocationPoints,
    knownSkills: [...m.knownSkills.values()].map(saveSkill),
    skillInv: m.skillInv.map(saveSkill),
    inventory: m.inventory.map(s => ({ supportId: s.def.id, level: s.level })),
    items: m.items.map(i => ({ ...i })),
    equipped: Object.fromEntries(
      Object.entries(m.equipped).flatMap(([k, v]) => (v ? [[k, { ...v }] as const] : [])),
    ),
    essences: { ...m.essences },
    vestiges: { ...m.vestiges },
    offerings: m.offerings,
    companions: [
      ...world.actors
        .filter(a => a.companion && !a.dead && a.owner === world.player && a.defId)
        .map(a => ({
          defId: a.defId!, level: a.level,
          skillId: (a.sourceSkillId ?? '').replace('__companion:', ''),
          ...(a.downed ? { downed: true } : {}),
        })),
      // STASHED bonds (skill unlearned, pet slain-and-remembered) ride the
      // same list marked downed; restoreCompanions routes them back to the
      // stash on load since their skill isn't known.
      ...world.stashedCompanions.map(s => ({ ...s, downed: true as const })),
    ],
    bar: world.player.skills.map(s => s ? s.def.id : null),
    level: world.player.level,
    expedition: world.manifest,
    ledger: { ...world.ledger },
    // Only STATIC zones persist (generated/quest/cave/crusade/demon zones re-mint
    // fresh each run from the overlay's re-seeded RNG, so a persisted clear-key
    // would wrongly suppress a re-rolled same-id zone's reward on resume).
    completedObjectives: [...world.completedObjectives].filter(id => !/^(gen_|quest_|cave_|crusade_|demon_)/.test(id)),
    modeId: m.modeId,
    modeStage: m.modeStage,
    charId: m.charId,
    deaths: world.charDeaths.map(d => ({ ...d })),
    ...(world.hiredMerc ? {
      mercenary: {
        name: world.hiredMerc.name,
        snapshot: world.hiredMerc.snapshot,
        ...(world.hiredMerc.mercId ? { mercId: world.hiredMerc.mercId } : {}),
        ...(world.hiredMerc.templateId ? { templateId: world.hiredMerc.templateId } : {}),
      },
    } : {}),
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
  if (s.granted) inst.granted = true;
  if (s.essenceLevels) inst.essenceLevels = s.essenceLevels;
  if (s.attunedForm && MONSTERS[s.attunedForm]) inst.attunedForm = s.attunedForm;
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

  // GEAR: rebuild every saved item against the live registries (tolerant —
  // a removed base drops the item, a removed affix drops the line).
  const items = (save.items ?? [])
    .map(rebuildItem)
    .filter((x): x is ItemInstance => x !== null);
  const equipped: Partial<Record<string, ItemInstance>> = {};
  for (const [slot, it] of Object.entries(save.equipped ?? {})) {
    const item = rebuildItem(it);
    if (item) equipped[slot] = item;
  }

  const meta: PlayerMeta = {
    classDef,
    name: save.name?.trim() || classDef.name,
    baseAttrs: { ...save.baseAttrs },
    attrs: { ...save.baseAttrs }, // recomputed by recalcPlayer() inside adoptSavedMeta
    xp: save.xp, xpNeeded: save.xpNeeded,
    skillPoints: save.skillPoints, passivePoints: save.passivePoints,
    allocated: new Set(save.allocated),
    vocations: [...(save.vocations ?? [])],
    vocationPoints: save.vocationPoints ?? 0,
    knownSkills, inventory, skillInv, offerings: save.offerings,
    items, equipped,
    essences: { ...emptyEssences(), ...(save.essences ?? {}) },
    vestiges: { ...(save.vestiges ?? {}) },
    // The SAVE is the authority on the life-contract — createPlayer's stamp is
    // only for fresh characters. Pre-mode saves load as plain mortals; a save
    // predating character ids mints one (merc engagements key off it).
    modeId: save.modeId ?? DEFAULT_MODE_ID,
    modeStage: save.modeStage ?? 0,
    charId: save.charId || mintCharId(),
  };
  world.ledger = { ...(save.ledger ?? {}) }; // restore per-run trigger counters
  world.completedObjectives = new Set(save.completedObjectives ?? []);
  // The character's own corpse ring (same per-record tolerance as the account's).
  world.charDeaths = (save.deaths ?? []).filter(d => d?.schema === DEATH_SCHEMA).slice(-MAX_DEATH_RECORDS);
  world.adoptSavedMeta(meta, save.bar, save.level);
  // Re-field a saved mercenary contract (already paid + pool-marked).
  if (save.mercenary?.snapshot) world.restoreHiredMerc(save.mercenary);
  // Re-field tamed companions beside the keeper (downed state included).
  if (save.companions?.length) world.restoreCompanions(save.companions);
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

/** The localStorage mirror key for a character slot (the shared run slot keeps
 *  its historical key; roster slots suffix theirs). */
const charKeyFor = (slot: number): string => slot === CHAR_SLOT ? CHAR_KEY : `${CHAR_KEY}_s${slot}`;

/** The disk slot this world's character persists to. Roster-saved modes
 *  (Immortal vessels) write their OWN account slot, looked up by charId;
 *  everything else writes the shared run slot. Returns -1 (save skipped) when
 *  a roster character has lost its roster card — better no write than
 *  clobbering the mortal Continue slot with the wrong character. */
function saveSlotFor(world: World): number {
  if (modeById(world.meta.modeId).save !== 'roster') return CHAR_SLOT;
  const entry = world.account.roster.find(r => r.charId === world.meta.charId);
  return entry ? entry.slot : -1;
}

export function saveCharacter(world: World): void {
  const slot = saveSlotFor(world);
  if (slot < 0) return;
  let body: string;
  try { body = JSON.stringify(serializeCharacter(world)); }
  catch { return; } // quota / serialize errors never crash gameplay
  try { window.localStorage.setItem(charKeyFor(slot), body); } catch { /* ignore */ }
  diskPut(slot, body);
}

export function clearCharacter(): void {
  try { window.localStorage.removeItem(CHAR_KEY); } catch { /* ignore */ }
  // DURABLE wipe: must survive the player closing the game on the death screen,
  // else the disk-first loader resurrects the dead character (permadeath break).
  diskBeacon(CHAR_SLOT, '{}');
}

// --- the ROSTER (owned character slots — meta/modes.ts) ----------------------

/** Load a roster character's save from its slot: disk-first (the authority),
 *  localStorage mirror as the static-host fallback. Null = empty/corrupt. */
export async function loadRosterSave(slot: number): Promise<CharacterSave | null> {
  const data = await diskGet<CharacterSave>(slot);
  if (data && data.schemaVersion === CHAR_SCHEMA_VERSION) {
    try { window.localStorage.setItem(charKeyFor(slot), JSON.stringify(data)); } catch { /* ignore */ }
    return data;
  }
  try {
    const raw = window.localStorage.getItem(charKeyFor(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CharacterSave;
    return parsed && parsed.schemaVersion === CHAR_SCHEMA_VERSION ? parsed : null;
  } catch { return null; }
}

/** Durably empty a roster slot (vessel deletion — a deliberate roster action). */
export function wipeRosterSlot(slot: number): void {
  try { window.localStorage.removeItem(charKeyFor(slot)); } catch { /* ignore */ }
  diskBeacon(slot, '{}');
}

/** Refresh the account's index card for this world's character (level/stage/
 *  savedAt drive the start-menu roster list). Null if it has no card. */
export function syncRosterEntry(account: Account, world: World): RosterEntry | null {
  const entry = account.roster.find(r => r.charId === world.meta.charId);
  if (!entry) return null;
  entry.classId = world.meta.classDef.id;
  entry.name = world.meta.name;
  entry.level = world.player.level;
  entry.stage = world.meta.modeStage;
  entry.savedAt = Date.now();
  return entry;
}

/** THE run-persistence choke point: save the character to its routed slot and,
 *  for roster characters, refresh the account index card beside it — every
 *  autosave/baseline/dirty-flag path calls this one helper. */
export function persistRun(account: Account, world: World): void {
  saveCharacter(world);
  if (modeById(world.meta.modeId).save === 'roster' && syncRosterEntry(account, world)) {
    saveAccount(account);
  }
}
