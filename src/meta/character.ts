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
import { PASSIVE_NODES } from '../data/passives';
import { sanitizeChoices, sanitizeGrafts } from '../data/passiveChoices';
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
import { emptyEssences, type PlayerMeta, type Seat, type World } from '../engine/world';
import type { ExpeditionManifest } from '../packages/manifest';
import { diskBeacon, diskGet, diskPut, saveAccount, saveAccountDurable } from './persistence';
import { DEATH_SCHEMA, MAX_DEATH_RECORDS, type DeathRecord } from './death';
import { DEFAULT_MODE_ID, mintCharId, modeById, ROSTER_SLOT_BASE, type RosterEntry } from './modes';
import type { WorldStateSave } from './worldstate';
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
  /** Choice-node picks (data/passiveChoices.ts), keyed by node id. Optional →
   *  pre-choice saves load unchanged; rebuilt registry-tolerantly (a renamed
   *  group/option drops its pick, exactly like a removed node id). */
  choices?: Record<string, string[]>;
  /** Realm-currency wallet (data/passiveRealms.ts), per currency id. Optional. */
  realmPoints?: Record<string, number>;
  /** Graft bindings: earned graft key → carrier skill id (null = unbound).
   *  Optional; re-validated against the live registries on load. */
  grafts?: Record<string, string | null>;
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
  /** THE THRONG (engine/throng.ts): the gathered rosters, one row per
   *  anchor skill — re-fielded beside the keeper on resume. Optional →
   *  older saves load unchanged; an unslotted anchor's row just drops
   *  (the disband rule would have released it anyway). */
  throng?: { skillId: string; defId: string; level: number; count: number }[];
  /** The throng's run-long pocket-claim ledger (World.throngClaimed —
   *  the completedObjectives idiom): claimed seats stay empty on revisit. */
  throngClaimed?: string[];
  bar: (string | null)[];   // bar bindings as skill ids (any length; padded to BAR_SLOTS on load)
  level: number;            // Actor level (display + xp continuity)
  // Content-package run state (optional → old saves still load). The expedition
  // manifest is the run-LOCKED config (frozen at run start); the ledger is the
  // per-run trigger counters. Wired into World in serialize/applySavedCharacter.
  expedition?: ExpeditionManifest;
  ledger?: Record<string, number>;
  /** Zone ids whose objective reward was claimed this run. Persists for every
   *  zone the WORLDSTATE section carries (plus the stable cave_ namespace —
   *  cave ids are deterministic per mouth), and is scrubbed against the live
   *  graph on resume (World.scrubStaleObjectives), so a re-rolled event zone
   *  can never wake pre-cleared. Optional. */
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
  /** THE HIRED BLADE (meta/mercs.ts) — LEGACY single-contract field: old
   *  saves carry one; the loader folds it into the company. Never written
   *  by current builds (see `mercenaries`). */
  mercenary?: { name: string; snapshot: MercSnapshot; mercId?: string; templateId?: string };
  /** THE COMPANY (meta/mercs.ts): every contract rides the patron's save —
   *  snapshots INLINE (resilient to roster churn), refs for pool release.
   *  The Harborwarden's retinue makes this a list; one blade = one entry. */
  mercenaries?: { name: string; snapshot: MercSnapshot; mercId?: string; templateId?: string }[];
  /** THE WAKEFUL WORLD (meta/worldstate.ts): the world half of the run — the
   *  minted zone graph, discovery, the clock, zone memory, quests, the spot
   *  the character stood on, and per-overlay snapshots. Optional → a save
   *  without one (or one that fails to stand up) resumes as a fresh world,
   *  exactly the pre-worldstate behavior. Applied by the RESUME path
   *  (World.adoptWorldState + resumeSpawn), never by applySavedCharacter. */
  world?: WorldStateSave;
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
  // THE POSSESSION SEAM (engine/possess.ts): the save is the HERO's truth.
  // Mid-possession, world.player is a borrowed monster body — the bar, the
  // level, and every owner-linked scan below must read the seat's HOME
  // body instead. Embodiment itself is combat-transient (the castRing law)
  // and never saved: a resumed save wakes home, in its own flesh.
  const hero = world.seatHero(world.localSeat);
  // The world half rides every character save (one atomic write — the build
  // and the ground it stood on can never tear apart). Its kept-zone set also
  // decides which objective clears persist: exactly the ground that does.
  const ws = world.serializeWorldState();
  const keptZones = new Set(ws.zones.map(z => z.id));
  return {
    schemaVersion: CHAR_SCHEMA_VERSION,
    classId: m.classDef.id,
    name: m.name,
    baseAttrs: { ...m.baseAttrs },
    xp: m.xp, xpNeeded: m.xpNeeded,
    skillPoints: m.skillPoints, passivePoints: m.passivePoints,
    allocated: [...m.allocated],
    choices: Object.fromEntries(Object.entries(m.choices).map(([k, v]) => [k, [...v]])),
    realmPoints: { ...m.realmPoints },
    grafts: { ...m.grafts },
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
        .filter(a => a.companion && !a.dead && a.owner === hero && a.defId)
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
    bar: hero.skills.map(s => s ? s.def.id : null),
    level: hero.level,
    expedition: world.manifest,
    ledger: { ...world.ledger },
    // Clears persist for exactly the ground the worldstate carries, plus the
    // stable cave_ namespace (deterministic per mouth). Event zones the
    // worldstate scrubbed (unclaimed eventOwned — they re-roll with their
    // events) drop their keys here too, so a re-seeded same-id event can
    // never wake pre-cleared — the rule the old prefix filter hardcoded,
    // now derived from ownership itself.
    completedObjectives: [...world.completedObjectives].filter(id => keptZones.has(id) || id.startsWith('cave_')),
    // THE THRONG: rosters aggregate to one row per anchor skill (count +
    // the highest body level — claims re-level on restore anyway); the
    // claim ledger rides whole (keys are tiny, stale ones harmless).
    throng: (() => {
      const rows = new Map<string, { skillId: string; defId: string; level: number; count: number }>();
      for (const a of world.actors) {
        if (a.dead || a.owner !== hero || !a.defId) continue;
        if (!a.sourceSkillId?.startsWith('__throng:')) continue;
        const skillId = a.sourceSkillId.slice('__throng:'.length);
        const row = rows.get(skillId);
        if (row) { row.count++; row.level = Math.max(row.level, a.level); }
        else rows.set(skillId, { skillId, defId: a.defId, level: a.level, count: 1 });
      }
      // THE LITE TIER (engine/lite.ts): a lite-tier anchor's pool rows join
      // its count — the roster resumes at full strength either way.
      for (const s of hero.skills) {
        const spec = s?.def.throng;
        if (!spec || spec.tier !== 'lite') continue;
        const kindIdx = world.liteKindOf(spec.monsterId);
        if (kindIdx < 0) continue;
        const n = world.lite.countOwned(hero.id, kindIdx);
        if (!n) continue;
        const row = rows.get(s!.def.id);
        if (row) row.count += n;
        else rows.set(s!.def.id, { skillId: s!.def.id, defId: spec.monsterId, level: hero.level, count: n });
      }
      return [...rows.values()];
    })(),
    throngClaimed: [...world.throngClaimed],
    modeId: m.modeId,
    modeStage: m.modeStage,
    charId: m.charId,
    deaths: world.charDeaths.map(d => ({ ...d })),
    world: ws,
    ...(world.hiredMercs.length ? {
      mercenaries: world.hiredMercs.map(hm => ({
        name: hm.name,
        snapshot: hm.snapshot,
        ...(hm.mercId ? { mercId: hm.mercId } : {}),
        ...(hm.templateId ? { templateId: hm.templateId } : {}),
      })),
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

/** Rebuild the CHARACTER half of a save — the PlayerMeta + its own corpse
 *  ring — touching NO world state. applySavedCharacter (the local resume)
 *  layers the world writes on top; the COUCH JOIN (a guest vessel grafting
 *  onto its own seat) uses exactly this and nothing more. Null only if the
 *  class id is gone (the save is unresumable). */
export function rebuildSavedMeta(save: CharacterSave): { meta: PlayerMeta; deaths: DeathRecord[] } | null {
  const classDef = CLASSES.find(c => c.id === save.classId);
  if (!classDef) return null;

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

  // Tree state rebuilds registry-tolerantly, in dependency order: the
  // allocation seeds choice sanitizing, both seed graft-binding sanitizing
  // (a binding whose source or carrier vanished simply drops).
  const allocated = new Set(save.allocated);
  const choices = sanitizeChoices(save.choices, PASSIVE_NODES);
  const meta: PlayerMeta = {
    classDef,
    name: save.name?.trim() || classDef.name,
    baseAttrs: { ...save.baseAttrs },
    attrs: { ...save.baseAttrs }, // recomputed by recalcSeat inside the adopt
    xp: save.xp, xpNeeded: save.xpNeeded,
    skillPoints: save.skillPoints, passivePoints: save.passivePoints,
    allocated,
    choices,
    realmPoints: { ...(save.realmPoints ?? {}) },
    grafts: sanitizeGrafts(save.grafts, allocated, choices, PASSIVE_NODES, id => knownSkills.has(id)),
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
  // The character's own corpse ring (same per-record tolerance as the account's).
  const deaths = (save.deaths ?? []).filter(d => d?.schema === DEATH_SCHEMA).slice(-MAX_DEATH_RECORDS);
  return { meta, deaths };
}

/** Rebuild meta from a save and graft it onto an already-created World/player.
 *  Returns false only if the class id is gone (run is unresumable). */
export function applySavedCharacter(world: World, save: CharacterSave): boolean {
  const built = rebuildSavedMeta(save);
  if (!built) return false;
  world.ledger = { ...(save.ledger ?? {}) }; // restore per-run trigger counters
  world.completedObjectives = new Set(save.completedObjectives ?? []);
  world.charDeaths = built.deaths;
  world.adoptSavedMeta(built.meta, save.bar, save.level);
  // Re-field the saved COMPANY (already paid + pool-marked). The legacy
  // single-contract field folds in as a one-blade company (old saves).
  for (const m of save.mercenaries ?? (save.mercenary?.snapshot ? [save.mercenary] : [])) {
    if (m?.snapshot) world.restoreHiredMerc(m);
  }
  // Re-field tamed companions beside the keeper (downed state included).
  if (save.companions?.length) world.restoreCompanions(save.companions);
  // THE THRONG: the claim ledger first (pocket finiteness), then the
  // gathered rosters beside the keeper (engine/throng.ts).
  world.throngClaimed = new Set(save.throngClaimed ?? []);
  if (save.throng?.length) world.restoreThrong(save.throng);
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

/** Stringify the save, splicing the world's memoized zones JSON in verbatim
 *  where the runtime offers JSON.rawJSON — the final walk then covers the
 *  ~5% of the tree that actually changes per beat instead of re-serializing
 *  663 zone defs (the 20s autosave hitch). The identity guard (`v === zs`)
 *  keeps the splice honest: it fires only for the exact array the memo's
 *  JSON describes; runtimes without rawJSON stringify plainly. */
function characterBody(world: World, save: CharacterSave): string {
  const zonesJson = world.zonesSaveJson();
  const raw = (JSON as unknown as { rawJSON?: (s: string) => unknown }).rawJSON;
  if (zonesJson && typeof raw === 'function' && save.world) {
    const zs = save.world.zones;
    return JSON.stringify(save, (k, v) => (k === 'zones' && v === zs ? raw(zonesJson) : v));
  }
  return JSON.stringify(save);
}

export function saveCharacter(world: World): void {
  const slot = saveSlotFor(world);
  if (slot < 0) return;
  let body: string;
  try { body = characterBody(world, serializeCharacter(world)); }
  catch { return; } // quota / serialize errors never crash gameplay
  try { window.localStorage.setItem(charKeyFor(slot), body); } catch { /* ignore */ }
  diskPut(slot, body);
}

/** DURABLE character write (sendBeacon) for the QUIT FLUSH: a fire-and-forget
 *  fetch can be dropped when the window closes mid-flight (Alt-F4, the ✕),
 *  and the worldstate's exact-resume promise is only as honest as the last
 *  write that actually landed. Same routing as saveCharacter. */
export function saveCharacterDurable(world: World): void {
  const slot = saveSlotFor(world);
  if (slot < 0) return;
  // The session's LAST write is always built fresh — the memo's fold never
  // gets a say over the exact-resume promise.
  world.invalidateZonesSaveMemo();
  let body: string;
  try { body = characterBody(world, serializeCharacter(world)); }
  catch { return; }
  try { window.localStorage.setItem(charKeyFor(slot), body); } catch { /* ignore */ }
  diskBeacon(slot, body);
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
  entry.level = world.seatHero(world.localSeat).level;
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

/** persistRun's DURABLE twin — the QUIT FLUSH (window closing under us). Both
 *  writes ride sendBeacon so the closing tab still delivers them; everything
 *  else is byte-identical to persistRun. */
export function persistRunDurable(account: Account, world: World): void {
  saveCharacterDurable(world);
  if (modeById(world.meta.modeId).save === 'roster' && syncRosterEntry(account, world)) {
    saveAccountDurable(account);
  }
}

// --- THE COUCH GUESTS (data/couch.ts — a second local vessel's persistence) --

/** Serialize a couch GUEST's vessel: the seat's build/carry/mode truth + its
 *  own corpse ring — WITHOUT the world half (the ground belongs to the host
 *  character's save; the vessel's next solo run deals its own fresh ground).
 *  `dormant` carries the vessel's sleeping menagerie THROUGH the couch
 *  session verbatim (companions/throng are not fielded beside a guest yet —
 *  they must not be lost to a session they slept through). */
export function serializeCouchGuest(
  world: World, seat: Seat,
  dormant: Pick<CharacterSave, 'companions' | 'throng' | 'throngClaimed'>,
): CharacterSave {
  const m = seat.meta;
  const hero = world.seatHero(seat);
  return {
    schemaVersion: CHAR_SCHEMA_VERSION,
    classId: m.classDef.id,
    name: m.name,
    baseAttrs: { ...m.baseAttrs },
    xp: m.xp, xpNeeded: m.xpNeeded,
    skillPoints: m.skillPoints, passivePoints: m.passivePoints,
    allocated: [...m.allocated],
    choices: Object.fromEntries(Object.entries(m.choices).map(([k, v]) => [k, [...v]])),
    realmPoints: { ...m.realmPoints },
    grafts: { ...m.grafts },
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
    companions: [...(dormant.companions ?? [])],
    bar: hero.skills.map(s => s ? s.def.id : null),
    level: hero.level,
    expedition: world.manifest,
    // The shared run's trigger counters are this vessel's lived experience
    // too (it was there); its next solo resume starts from them like any.
    ledger: { ...world.ledger },
    completedObjectives: [],
    throng: [...(dormant.throng ?? [])],
    throngClaimed: [...(dormant.throngClaimed ?? [])],
    modeId: m.modeId,
    modeStage: m.modeStage,
    charId: m.charId,
    deaths: (seat.couchDeaths ?? []).map(d => ({ ...d })),
    // world: deliberately absent — a guest save carries no ground.
  };
}

/** Persist one couch guest vessel to its roster slot + refresh its index
 *  card. The durable twin rides the same body over sendBeacon (quit flush).
 *  Slot routing is the caller's (main.ts holds the join-time context —
 *  never guessed here, so a lost card can never clobber a wrong slot). */
export function saveCouchGuest(
  account: Account, world: World, seat: Seat, slot: number,
  dormant: Pick<CharacterSave, 'companions' | 'throng' | 'throngClaimed'>,
  durable = false,
): void {
  if (slot < ROSTER_SLOT_BASE) return; // guests only ever write roster slots
  let body: string;
  try { body = JSON.stringify(serializeCouchGuest(world, seat, dormant)); }
  catch { return; }
  try { window.localStorage.setItem(charKeyFor(slot), body); } catch { /* ignore */ }
  if (durable) diskBeacon(slot, body); else diskPut(slot, body);
  const entry = account.roster.find(r => r.charId === seat.meta.charId);
  if (entry) {
    entry.classId = seat.meta.classDef.id;
    entry.name = seat.meta.name;
    entry.level = world.seatHero(seat).level;
    entry.stage = seat.meta.modeStage;
    entry.savedAt = Date.now();
    if (durable) saveAccountDurable(account); else saveAccount(account);
  }
}
