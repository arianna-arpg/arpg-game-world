import { empowermentRank } from '../engine/skillEmpowerment';
import { BUILD_PROFILE, storageKey } from '../buildProfile';
import { BrowserNativePages } from './browserNativePages';
import { characterNativePage, encodeCharacterPages, decodeCharacterPages, hasCharacterPages, readCharacterNativePage, preparePagedCharacterResume, validateCharacterPageEnvelope, type CharacterPageEntry } from './characterPages';
import type { NativeCohortLease } from '../worldmass/nativePaging';
import { BrowserRunStore, isBrowserRunReference } from './browserRunStore';
import { characterResumeFields, type CharacterFields, type CharacterResume, type CharacterResumeRead, type CharacterContinueSummary, type ResumeAuthority } from './characterResume';
import { freezeData, massDigest } from '../worldmass/random';
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

import { replenishingDelivery } from '../engine/replenishment';
import { flaskChargeBanks, restoreFlaskChargeBanks } from '../engine/flaskState';
import { SAVE_COMPATIBILITY, isCurrentCharacterSave, noteSaveReset } from './saveCompatibility';
import { CLASSES } from '../data/classes';
import { PASSIVE_NODES } from '../data/passives';
import { sanitizeChoices, sanitizeGrafts } from '../data/passiveChoices';
import { sanitizeCompanionStances } from '../engine/companionStances';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { MONSTERS } from '../data/monsters';
import {
  makeSkillInstance, validTreeNodes,
  type SkillInstance, type SupportInstance, type SkillRarity,
} from '../engine/skills';
import { rebuildItem } from '../engine/itemgen';
import { makeSkillGemItem, makeSupportGemItem, rebuildAnyItem } from '../engine/gemitems';
import { autoPlace } from '../engine/inventory';
import type { ItemInstance } from '../engine/items';
import type { Attributes } from '../engine/stats';
import { emptyAbilityEssences, emptyEssences, MAX_LEARNED_SKILLS, type PlayerMeta, type Seat, type World } from '../engine/world';
import type { ExpeditionManifest } from '../packages/manifest';
import { diskBeacon, diskGet, diskPut, saveAccount, saveAccountDurable, saveRefused, saveSuppressed } from './persistence';
import { DEATH_SCHEMA, MAX_DEATH_RECORDS, type DeathRecord } from './death';
import { DEFAULT_MODE_ID, mintCharId, modeById, ROSTER_SLOT_BASE, type RosterEntry } from './modes';
import type { WorldStateSave } from './worldstate';
import type { MercSnapshot } from './mercs';
import type { Account } from './account';
import { personalStashEntries, restoreStash, type PersonalStash } from '../engine/stash';
import { STASH_DEFS } from '../data/stashes';

export const CHAR_SCHEMA_VERSION = SAVE_COMPATIBILITY.run;
const CHAR_KEY = storageKey('arpg_character_v1');
export const CHAR_SLOT = 1; // disk save slot (saves/save_1.json; exported for meta/portage.ts)

interface SavedSocket {
  supportId: string; level: number;
  /** THE KEEPER'S MARK (salvageLock): the gem refuses salvage and every
   *  salvageBulk sweep skips it. Optional → older saves load unchanged. */
  locked?: boolean;
  /** THE CUT (the support base — engine/supportbase.ts): a chassis gem's
   *  vein roll, fixed forever. Optional → older saves load unchanged. */
  rolled?: Record<string, string>;
}
interface SavedSkill {
  empowermentRank?: number;
  skillId: string; level: number; rarity: SkillRarity;
  sockets: (SavedSocket | null)[];
  /** GRANTED (reacquired starter — worthless everywhere value is minted).
   *  Optional → older saves load unchanged. */
  granted?: boolean;
  /** THE KEEPER'S MARK (salvageLock) — see SavedSocket. */
  locked?: boolean;
  /** THE GRIMOIRE: the bestiary form this instance is attuned to (a monster
   *  def id; rebuilt tolerantly — a removed def drops the attunement). */
  attunedForm?: string;
  /** THE SKILL-MODE TREES: spent tree-node ids (M0: the one rung-1 pick).
   *  Optional → older saves load unchanged; validated on load — an id no
   *  longer on the def's tree drops with a console note. */
  treeNodes?: string[];
  replenishmentPaused?: true;
}
export interface CharacterSave {
  guardIntervention?: Record<string, number>;
  stash?: PersonalStash;
  accountRelics?: 1;
  relicScope?: string;
  schemaVersion: number;
  accountVersion: number;
  classId: string;
  /** THE NAME (Naming/Nemesis): player-given, or the class name when unnamed.
   *  Optional → pre-naming saves load named for their class. */
  name?: string;
  baseAttrs: Attributes;
  xp: number; xpNeeded: number;
  passivePoints: number;
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
  /** LEGACY (pre-M1 saves): loose gems as side arrays. Current builds write
   *  NEITHER — THE RESIDENCE (skill-items M1) folds loose gems into `items`
   *  as 1×1 wrapper ItemInstances; on load these rows wrap and auto-place
   *  into the bag best-effort (overflow drops with a console note — her
   *  standing saves-disposable ruling covers the edge). */
  skillInv?: SavedSkill[];
  inventory?: SavedSocket[];
  /** GEAR: bag + doll. ItemInstances are already pure JSON (base/affix ids +
   *  0..1 rolls), so they serialize verbatim and rebuildItem re-validates
   *  against live registries on load (unknown base → item dropped; unknown
   *  affix → line dropped). Optional → pre-item saves still load. */
  items?: ItemInstance[];
  equipped?: Record<string, ItemInstance>;
  /** THE CONTAINER FABRIC (engine/containers.ts): every side board's seated
   *  pieces by container id, each carrying its seat cell. Pure JSON like the
   *  bag; rebuilt registry-tolerantly (an unknown container's pieces fall
   *  to the bag at adoption — World.reconcileContainers). Optional → every
   *  earlier save loads with empty boards. */
  containers?: Record<string, ItemInstance[]>;
  /** Salvage-currency wallet (per essence id). Optional → pre-essence saves. */
  essences?: Record<string, number>;
  /** Ability Essence wallet (skill food, per tier id). Optional → pre-M-ECON
   *  saves load with an empty wallet (the costless grandfather: levels ride
   *  the gems themselves; the retired point/offering fields are ignored). */
  abilityEssences?: Record<string, number>;
  /** Vestige wallet (socket material, per vestige id). Optional. */
  vestiges?: Record<string, number>;
  /** TAMED COMPANIONS (the Hunter's bond): re-fielded beside the keeper on
   *  resume, downed state included. Optional → older saves load unchanged;
   *  a removed def simply releases that bond. */
  companions?: import('../engine/companionSpec').CompanionSaved[];
  /** THE THRONG (engine/throng.ts): the gathered rosters, one row per
   *  anchor skill — re-fielded beside the keeper on resume. Optional →
   *  older saves load unchanged; an unslotted anchor's row just drops
   *  (the disband rule would have released it anyway). */
  throng?: { skillId: string; defId: string; level: number; count: number }[];
  /** The throng's run-long pocket-claim ledger (World.throngClaimed —
   *  the completedObjectives idiom): claimed seats stay empty on revisit. */
  throngClaimed?: string[];
  /** FOUND IS FOUND (the growing zone — World.annexFound): every annex this
   *  run ever revealed, keyed `zoneId:pieceId`. Outlives zone memory by
   *  design — the boot replay re-opens what the TTL forgot. Optional →
   *  older saves load unchanged (nothing found yet). */
  annexFound?: string[];
  /** THE PRIMED POUR (pourPrime): banked full-pool sips awaiting their
   *  releasing wound — paid for at press, so they ride the save (the
   *  throng rows' idiom). Optional → older saves load unchanged; an
   *  entry whose skill left the bar dissolves at release anyway. */
  primedPours?: { skillId: string; chargesSpent: number; aim?: { x: number; y: number } }[];
  /** Spent and unspent flask ammunition survives resume; clocks restart. */
  flaskCharges?: Record<string, number>;
  bar: (string | null)[];   // bar bindings as skill ids (any length; padded to BAR_SLOTS on load)
  /** THE STAMPED OPENING (PlayerMeta.opening): the resolved kit bar the hero
   *  woke with — the re-kindle hatch's roster. Optional → a pre-stamp save
   *  reads the class's base bar. */
  opening?: (string | null)[];
  /** THE COMPANION STANCES (PlayerMeta.stances): the keeper's standing
   *  conduct per bond skill. Optional → older saves read the default; an
   *  unknown stance id drops on load. */
  stances?: Record<string, string>;
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
  ...(empowermentRank(i) ? { empowermentRank: empowermentRank(i) } : {}),
  skillId: i.def.id, level: i.level, rarity: i.rarity ?? 'common',
  sockets: i.sockets.map(s => s ? saveSocket(s) : null),
  ...(i.granted ? { granted: true } : {}),
  ...(i.attunedForm ? { attunedForm: i.attunedForm } : {}),
  ...(i.treeNodes?.length ? { treeNodes: [...i.treeNodes] } : {}),
  ...(i.replenishmentPaused ? { replenishmentPaused: true as const } : {}),
  ...(i.locked ? { locked: true } : {}),
});

/** One support gem, saved — the keeper's mark (salvageLock) rides along so
 *  a locked gem stays locked through save/load, loose or socketed. */
const saveSocket = (s: SupportInstance): SavedSocket => ({
  supportId: s.def.id, level: s.level,
  ...(s.locked ? { locked: true } : {}),
  // THE CUT (the support base): fixed at the vein — the save carries it
  // verbatim or the chase item dies at the first reload.
  ...(s.rolled ? { rolled: { ...s.rolled } } : {}),
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
    relicScope: m.relicScope ?? (m.charId || 'run:' + world.manifest.seed),
    guardIntervention: { ...hero.guardIntervention },
    accountRelics: 1,
    stash: m.stash ? structuredClone(m.stash) : undefined,
    schemaVersion: CHAR_SCHEMA_VERSION,
    accountVersion: SAVE_COMPATIBILITY.account,
    classId: m.classDef.id,
    name: m.name,
    baseAttrs: { ...m.baseAttrs },
    xp: m.xp, xpNeeded: m.xpNeeded,
    passivePoints: m.passivePoints,
    allocated: [...m.allocated],
    choices: Object.fromEntries(Object.entries(m.choices).map(([k, v]) => [k, [...v]])),
    realmPoints: { ...m.realmPoints },
    grafts: { ...m.grafts },
    vocations: [...m.vocations],
    vocationPoints: m.vocationPoints,
    knownSkills: [...m.knownSkills.values()].map(saveSkill),
    // THE RESIDENCE (skill-items M1): loose gems ride `items` as wrapper
    // ItemInstances (pure JSON, payload included) — no side arrays written.
    items: m.items.filter(i => !i.relicKey).map(i => ({ ...i })),
    equipped: Object.fromEntries(
      Object.entries(m.equipped).flatMap(([k, v]) => (v ? [[k, { ...v }] as const] : [])),
    ),
    // THE CONTAINER FABRIC: seated pieces by board, seat cells included.
    containers: Object.fromEntries(
      Object.entries(m.containers).map(([id, held]) => [id, held.filter(i => !i.relicKey).map(i => ({ ...i }))]),
    ),
    essences: { ...m.essences },
    abilityEssences: { ...m.abilityEssences },
    vestiges: { ...m.vestiges },
    companions: [
      ...world.actors
        .filter(a => a.companion && !a.dead && a.owner === hero && a.defId)
        .map(a => world.companionBonds.saved(a)),
      // STASHED bonds (skill unlearned, pet slain-and-remembered) ride the
      // same list marked downed; restoreCompanions routes them back to the
      // stash on load since their skill isn't known.
      ...world.stashedCompanions.map(s => ({ ...s, downed: true as const })),
    ],
    bar: hero.skills.map(s => s ? s.def.id : null),
    opening: [...m.opening],
    stances: { ...m.stances },
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
        const morphKey = `${skillId}:${a.defId}`;
        const row = rows.get(morphKey);
        if (row) { row.count += a.throngUnits ?? 1; row.level = Math.max(row.level, a.level); }
        else rows.set(morphKey, { skillId, defId: a.defId, level: a.level, count: a.throngUnits ?? 1 });
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
        const morphKey = `${s!.def.id}:${spec.monsterId}`;
        const row = rows.get(morphKey);
        if (row) row.count += n;
        else rows.set(morphKey, { skillId: s!.def.id, defId: spec.monsterId, level: hero.level, count: n });
      }
      return [...rows.values()];
    })(),
    throngClaimed: [...world.throngClaimed],
    ...(world.annexFound.size ? { annexFound: [...world.annexFound] } : {}),
    // THE PRIMED POUR: paid, unreleased sips ride the save whole.
    ...(hero.primedPours.length
      ? { primedPours: hero.primedPours.map(e => ({ ...e })) } : {}),
    flaskCharges: flaskChargeBanks(hero),
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
  if (empowermentRank(s)) inst.empowermentRank = empowermentRank(s);
  if (s.granted) inst.granted = true;
  if (s.attunedForm && MONSTERS[s.attunedForm]) inst.attunedForm = s.attunedForm;
  // THE SKILL-MODE TREES: picks survive the round trip; orphans (a renamed
  // node id, a retired tree), structure breaks (a rival-branch id, a broken
  // rung chain) and over-budget tails (the level carries the bandPointsAt
  // trim) drop with a console note — the attunedForm law. An M0-era save's
  // single rung-1 pick loads as a 1-point spend, costless by construction.
  if (s.treeNodes?.length) inst.treeNodes = validTreeNodes(def, s.treeNodes, s.level, inst);
  if (s.replenishmentPaused === true && replenishingDelivery(inst)?.replenish?.toggle) inst.replenishmentPaused = true;
  if (s.locked) inst.locked = true; // the keeper's mark (salvageLock) survives
  inst.sockets = s.sockets.map(sock => {
    if (!sock) return null;
    const sd = SUPPORTS[sock.supportId];
    return sd ? ({
      def: sd, level: sock.level,
      ...(sock.locked ? { locked: true } : {}),
      ...(sock.rolled ? { rolled: { ...sock.rolled } } : {}),
    } as SupportInstance) : null;
  });
  return inst;
}

/** Rebuild the CHARACTER half of a save — the PlayerMeta + its own corpse
 *  ring — touching NO world state. applySavedCharacter (the local resume)
 *  layers the world writes on top; the COUCH JOIN (a guest vessel grafting
 *  onto its own seat) uses exactly this and nothing more. Null only if the
 *  class id is gone (the save is unresumable). */
export function rebuildSavedMeta(save: CharacterFields): { meta: PlayerMeta; deaths: DeathRecord[] } | null {
  const classDef = CLASSES.find(c => c.id === save.classId);
  if (!classDef) return null;

  const knownSkills = new Map<string, SkillInstance>();
  for (const ss of save.knownSkills) {
    const inst = rebuildSkill(ss);
    if (inst) knownSkills.set(inst.def.id, inst);
  }
  // THE ONE BAG: rebuild every saved item — gear tiles AND gem wrappers —
  // against the live registries (tolerant: a removed base or an unresolvable
  // gem payload drops the item, a removed affix drops the line).
  const items = (save.items ?? [])
    .map(rebuildAnyItem)
    .filter((x): x is ItemInstance => x !== null);

  // LEGACY FOLD (pre-M1 saves): the old loose-gem side arrays wrap into bag
  // items best-effort. Overflow drops with a console note — saves are
  // disposable by her standing ruling; nothing better than best-effort is
  // owed, but silence would be worse.
  let legacyDropped = 0;
  for (const ss of save.skillInv ?? []) {
    const inst = rebuildSkill(ss);
    if (!inst) continue;
    if (!autoPlace(items, makeSkillGemItem(inst))) legacyDropped++;
  }
  for (const s of save.inventory ?? []) {
    const d = SUPPORTS[s.supportId];
    if (!d) continue;
    const gem: SupportInstance = { def: d, level: s.level, ...(s.locked ? { locked: true } : {}) };
    if (!autoPlace(items, makeSupportGemItem(gem))) legacyDropped++;
  }
  if (legacyDropped > 0) {
    console.warn(`[character] legacy loose gems: ${legacyDropped} dropped — no bag room while folding a pre-M1 save`);
  }
  const equipped: Partial<Record<string, ItemInstance>> = {};
  for (const [slot, it] of Object.entries(save.equipped ?? {})) {
    const item = rebuildItem(it);
    if (item) equipped[slot] = item;
  }
  // THE CONTAINER FABRIC: every board's pieces rebuild like the doll's
  // (an unknown base drops the piece); a board the live registry no longer
  // knows, or a seat a retuned frame closed, is settled at adoption
  // (World.reconcileContainers) — nothing decided here, nothing lost.
  const containers: Record<string, ItemInstance[]> = {};
  for (const [cid, held] of Object.entries(save.containers ?? {})) {
    containers[cid] = (held ?? []).map(rebuildItem).filter((x): x is ItemInstance => x !== null);
  }
  const stashDef = STASH_DEFS[modeById(save.modeId ?? DEFAULT_MODE_ID).stash ?? ''];
  let stash: PersonalStash | undefined;
  if (stashDef && save.stash) {
    const occupied = new Set([...items, ...Object.values(equipped).filter((i): i is ItemInstance => !!i), ...Object.values(containers).flat()].map(i => i.uid));
    const stored = (Array.isArray(save.stash.items) ? save.stash.items : []).map(rebuildAnyItem).filter((i): i is ItemInstance => {
      if (!i || !stashDef.accepts(i) || occupied.has(i.uid)) return false;
      occupied.add(i.uid); return true;
    });
    stash = { items: stored, layout: save.stash.layout };
    stash.layout = restoreStash(stashDef, personalStashEntries(stash), stash.layout);
  }

  // Tree state rebuilds registry-tolerantly, in dependency order: the
  // allocation seeds choice sanitizing, both seed graft-binding sanitizing
  // (a binding whose source or carrier vanished simply drops).
  const allocated = new Set(save.allocated);
  const choices = sanitizeChoices(save.choices, PASSIVE_NODES, allocated);
  const meta: PlayerMeta = {
    classDef,
    // THE STAMPED OPENING: the save's own; a pre-stamp save reads the base bar.
    opening: [...(save.opening ?? classDef.bar)],
    stances: sanitizeCompanionStances(save.stances),
    name: save.name?.trim() || classDef.name,
    baseAttrs: { ...save.baseAttrs },
    attrs: { ...save.baseAttrs }, // recomputed by recalcSeat inside the adopt
    xp: save.xp, xpNeeded: save.xpNeeded,
    passivePoints: save.passivePoints,
    allocated,
    choices,
    realmPoints: { ...(save.realmPoints ?? {}) },
    grafts: sanitizeGrafts(save.grafts, allocated, choices, PASSIVE_NODES, id => knownSkills.has(id)),
    vocations: [...(save.vocations ?? [])],
    vocationPoints: save.vocationPoints ?? 0,
    knownSkills,
    items, equipped, containers,
    stash,
    legacyRelics: save.accountRelics !== 1,
    relicScope: save.relicScope ?? (save.charId || 'run:' + (save.expedition?.seed ?? save.classId)),
    essences: { ...emptyEssences(), ...(save.essences ?? {}) },
    abilityEssences: { ...emptyAbilityEssences(), ...(save.abilityEssences ?? {}) },
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
 *  Returns false for an incompatible save or a removed class (unresumable). */
export function applySavedCharacter(world: World, save: CharacterSave): boolean {
  return applyCharacterFields(world, save);
}
/** Applies only character build/carry state. World/page adoption is separate. */
export function applyCharacterResumeFields(world: World, resume: CharacterResume): boolean {
  if (!characterResumeAuthority(resume)) return false;
  // The receipt remains frozen authority. Registry rebuilding and later play
  // need their own mutable carry graph (affixes, gems, corpses and companions).
  // Inline fields are only a type view: explicitly omit its potentially huge
  // world before cloning, so this stage never expands native world history.
  const fields = resume.kind === 'inline'
    ? (({ world: _world, ...character }) => character)(resume.save)
    : resume.character;
  return applyCharacterFields(world, structuredClone(fields));
}
function applyCharacterFields(world: World, save: CharacterFields): boolean {
  if (!isCurrentCharacterSave(save)) return false;
  const built = rebuildSavedMeta(save);
  if (!built) return false;
  // Loading replaces the companion roster, including any fresh-character hound.
  world.actors = world.actors.filter(a => !a.companion || a.owner !== world.player);
  world.stashedCompanions = [];
  world.companionBonds.refresh();
  world.ledger = { ...(save.ledger ?? {}) }; // restore per-run trigger counters
  world.completedObjectives = new Set(save.completedObjectives ?? []);
  world.charDeaths = built.deaths;
  // THE SEATED HEAL (learned = seated, skill-items M1): an M0-era save may
  // carry known skills off the bar — invisible under the rack law. Seat
  // them into free seats here, on the REAL resume lane only (the sim's
  // adoptSavedMeta injection stays byte-untouched — builds choose their
  // own bar and the census must never notice).
  const bar = [...save.bar];
  while (bar.length < MAX_LEARNED_SKILLS) bar.push(null);
  for (const id of built.meta.knownSkills.keys()) {
    if (bar.includes(id)) continue;
    const free = bar.findIndex(s => s === null);
    if (free >= 0) bar[free] = id;
  }
  world.adoptSavedMeta(built.meta, bar, save.level);
  world.seatHero(world.localSeat).guardIntervention = Object.fromEntries(Object.entries(save.guardIntervention ?? {})
    .filter(([, remaining]) => Number.isFinite(remaining) && remaining > 0));
  // Seed pre-memory saves without replacing preferences from a newer life.
  world.rememberSkillSlots(world.localSeat, undefined, false);
  restoreFlaskChargeBanks(world.seatHero(world.localSeat), save.flaskCharges);
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
  // FOUND IS FOUND (the growing zone): the run's reveal ledger — loadZone's
  // boot replay re-opens these beyond the memory TTL.
  world.annexFound = new Set((save.annexFound ?? []).filter(k => typeof k === 'string'));
  if (save.throng?.length) world.restoreThrong(save.throng);
  // THE PRIMED POUR: re-bank the paid, unreleased sips on the hero —
  // verbatim (record tolerance only); entries whose skill left the bar
  // dissolve at release, so the law lives where it always lives.
  world.seatHero(world.localSeat).primedPours = (save.primedPours ?? [])
    .filter(e => e && typeof e.skillId === 'string')
    .map(e => ({ skillId: e.skillId, chargesSpent: Math.max(0, Math.floor(e.chargesSpent ?? 0)),
      ...(e.aim && Number.isFinite(e.aim.x) && Number.isFinite(e.aim.y) ? { aim: { ...e.aim } } : {}) }));
  return true;
}

/** Large browser runs commit atomically. Small local references publish only
 * after the transaction; the in-session cache still serves synchronous callers. */
let browserRuns: BrowserRunStore | undefined;
let nativePages: BrowserNativePages | undefined;
function nativePageStore(): BrowserNativePages {
  if (typeof indexedDB === 'undefined') throw Error('Native page storage unavailable');
  return nativePages ??= new BrowserNativePages(storageKey('arpg_native_pages_v1'));
}
interface CharacterPageSession { pages: CharacterPageEntry[]; order: string[]; busy: boolean; revision: number;
  slot: number; epoch: number }
const slotEpochs = new Map<number, number>();
const slotWriters = new Map<number, WeakRef<World>>();
const slotEpoch = (slot: number): number => slotEpochs.get(slot) ?? 0;
function invalidateCharacterSlot(slot: number): void { slotEpochs.set(slot, slotEpoch(slot) + 1); }
function acceptCharacterWriter(world: World, slot: number): void {
  const prior=slotWriters.get(slot)?.deref();
  if(prior && prior!==world)invalidateCharacterSlot(slot);
  slotWriters.set(slot,new WeakRef(world));
  const session=pageSessions.get(world);
  if(session && session.slot===slot)session.epoch=slotEpoch(slot);
}
const pageSessions = new WeakMap<World, CharacterPageSession>();
const pageCommits = new Set<Promise<boolean>>();
const pageFailures = new Map<number, unknown>();
/** Native files remain inline until portable page transfer is implemented. */
export const characterPagingAvailable = (): boolean => !!BUILD_PROFILE.storageScope && typeof indexedDB !== 'undefined';
export const resetCharacterNativePages = (world: World): void => { pageSessions.delete(world); };
export const characterNativePages = (world: World): readonly CharacterPageEntry[] => pageSessions.get(world)?.pages ?? [];
export const characterNativePageOrder = (world: World): readonly string[] => pageSessions.get(world)?.order ?? [];
export const characterNativeSessionToken = (world: World): object | undefined => pageSessions.get(world);
export const characterNativeSessionCurrent = (world: World): boolean => {
  const session=pageSessions.get(world);
  return !saveSuppressed() && (!session || session.epoch===slotEpoch(session.slot)
    && !deletionBarrier(session.slot) && saveSlotFor(world)===session.slot);
};
export const loadCharacterNativePage = (entry: CharacterPageEntry) => readCharacterNativePage(nativePageStore(),entry);
/** Call only AFTER atomic native hydration publishes every page owner. */
export function forgetCharacterNativePage(world: World, entry: CharacterPageEntry): void {
  const session=pageSessions.get(world);if(!session)return;
  session.pages=session.pages.filter(p=>p.ref.key!==entry.ref.key);session.revision++;
}
function mirrorBody(world: World, save: CharacterSave): string {
  const session=pageSessions.get(world);
  if(!characterNativeSessionCurrent(world))throw Error('Stale native character page session');
  return session?.pages.length ? encodeCharacterPages(save,session.pages,session.order) : characterBody(world,save);
}
/** The ordinary CharacterSave slot is the sole commit authority. Pages land
 * first; a later save/death/import invalidates this lease before any release.
 * The runtime callback must remove every live/codec reference synchronously. */
export async function commitCharacterNativeCohort(world: World, lease: NativeCohortLease,
  release: (entry: CharacterPageEntry) => void): Promise<boolean> {
  if (!characterPagingAvailable() || saveRefused('native page') || world.player!==world.seatHero(world.localSeat)) return Promise.resolve(false);
  const slot=saveSlotFor(world);if(slot<0||pageCommits.size>=4||!characterNativeSessionCurrent(world))return Promise.resolve(false);
  acceptCharacterWriter(world,slot);
  let session=pageSessions.get(world);
  if(!session){session={pages:[],order:[],busy:false,revision:0,slot,epoch:slotEpoch(slot)};pageSessions.set(world,session);}
  if(session.busy||!lease.revalidate())return Promise.resolve(false);
  const held=session,manifest=[...session.pages],priorOrder=[...session.order],revision=session.revision,
    save=serializeCharacter(world),page=characterNativePage(save,lease);
  if(held.pages.some(p=>p.ref.page===page.cohort.page||p.ids.some(id=>lease.ids.includes(id))))throw Error('Native page already committed');
  const intent=(mirrorIntents.get(slot)??0)+1,barrier=deletionBarrier(slot);
  mirrorIntents.set(slot,intent);held.busy=true;
  const current=()=>characterNativeSessionCurrent(world)&&pageSessions.get(world)===held&&held.revision===revision
    &&mirrorIntents.get(slot)===intent&&deletionBarrier(slot)===barrier&&!saveRefused('native page commit');
  const task=(async()=>{
    const ref=await nativePageStore().writePage(page.cohort.run,page.cohort.page,JSON.stringify(page));
    if(!current()||!lease.revalidate())return false;
    const entry={ref,ids:[...lease.ids],positions:lease.ids.map(id=>{const e=page.enemies.find(e=>e.id===id)!;return {x:e.x,y:e.y,...(e.nativeQuietRadius===undefined?{}:{nativeQuietRadius:e.nativeQuietRadius})};})},pages=[...manifest,entry];
    Object.freeze(entry.ref);Object.freeze(entry.ids);entry.positions.forEach(p=>Object.freeze(p));Object.freeze(entry.positions);Object.freeze(entry);
    const order=[...priorOrder,...save.world!.worldmass!.enemies.map(e=>e.id).filter(id=>!priorOrder.includes(id))];
    const body=encodeCharacterPages(save,pages,order);
    await writeCharacterMirrorTransaction(slot,body,{intent,barrier});
    if(!current()||browserRunStore()?.peek(charKeyFor(slot))!==body||!lease.revalidate())return false;
    // Register before release so a synchronous save from the runtime sees all
    // owners. A callback must either succeed atomically or throw before edits.
    held.pages=pages;held.order=order;held.revision++;
    try{release(entry);}catch(error){held.pages=manifest;held.order=priorOrder;held.revision++;throw error;}
    pageFailures.delete(slot);return true;
  })();
  pageCommits.add(task);
  void task.catch(error=>pageFailures.set(slot,error)).finally(()=>{held.busy=false;pageCommits.delete(task);});
  return task;
}
function browserRunStore(): BrowserRunStore | undefined {
  if (typeof indexedDB === 'undefined') return undefined;
  return browserRuns ??= new BrowserRunStore({ dbName: storageKey('arpg_run_snapshots_v1'),
    references: { getItem: key => window.localStorage.getItem(key), setItem: (key, body) => window.localStorage.setItem(key, body) },
    onError: (error, key) => console.error('[save] browser run commit failed:', key, error) });
}
const deletionKey = (slot: number): string => charKeyFor(slot) + ':deleted';
const mirrorIntents = new Map<number, number>();
function deletionBarrier(slot: number): string | null {
  try { return window.localStorage.getItem(deletionKey(slot)); } catch { return null; }
}
/** Import owns its explicit stand-down exception and awaits this primitive.
 * A synchronous deletion barrier prevents an unload from reviving a dead run
 * before its asynchronous tombstone reaches the browser database. */
export async function writeCharacterMirrorRaw(slot: number, body: string | null): Promise<void> {
  // Import and disk mirrors must be portable inline saves, never references to
  // another browser's storage. Internal paged commits use the private lane.
  if(body!==null && hasCharacterPages(JSON.parse(body)))throw Error('External native page references require portable expansion');
  invalidateCharacterSlot(slot);
  await writeCharacterMirrorTransaction(slot,body);
}
async function writeCharacterMirrorTransaction(slot: number, body: string | null,
  accepted?: {intent:number;barrier:string|null}): Promise<void> {
  const key = charKeyFor(slot), store = browserRunStore();
  const intent = accepted?.intent ?? (mirrorIntents.get(slot) ?? 0) + 1, barrier = accepted ? accepted.barrier : deletionBarrier(slot);
  if(accepted && (mirrorIntents.get(slot)!==intent||deletionBarrier(slot)!==barrier))throw Error('Stale native character commit');
  mirrorIntents.set(slot, intent);
  if (body === null) {
    try { window.localStorage.setItem(deletionKey(slot), Date.now() + ':' + Math.random()); window.localStorage.removeItem(key); }
    catch (error) { console.error('[save] run deletion barrier failed:', error); }
  }
  if (store) {
    await store.write(key, body);
    // A later queued tombstone must retain its barrier.
    if (body !== null && mirrorIntents.get(slot) === intent && deletionBarrier(slot) === barrier) {
      try { window.localStorage.removeItem(deletionKey(slot)); } catch { /* a stale barrier fails closed */ }
    }
  } else {
    if (body !== null) { window.localStorage.setItem(key, body); window.localStorage.removeItem(deletionKey(slot)); }
  }
  pageFailures.delete(slot);
}
function writeCharacterMirror(slot: number, body: string | null): void {
  void writeCharacterMirrorTransaction(slot, body).catch(error => console.error('[save] run mirror remains at its last committed snapshot:', error));
}
/** Awaited by explicit checkpoints/import; unload keeps the last completed
 * browser transaction and the ordinary native disk beacon. */
export async function flushCharacterSaves(): Promise<void> {
  while(pageCommits.size)await Promise.allSettled([...pageCommits]);
  await browserRuns?.flush();
  if(pageFailures.size)throw new AggregateError([...pageFailures.values()],'Native character page commits failed');
}
function cachedCharacter(slot: number): CharacterSave | null {
  if (deletionBarrier(slot)) return null;
  try {
    const cached = browserRunStore()?.peek(charKeyFor(slot));
    const data: unknown = JSON.parse((cached === undefined ? window.localStorage.getItem(charKeyFor(slot)) : cached) ?? 'null');
    return isBrowserRunReference(data) || hasCharacterPages(data) ? null : data as CharacterSave | null;
  } catch { return null; }
}
/** The New Run patron cleanup needs only identity. A paged transport must
 * never masquerade as a complete synchronous CharacterSave for resumption. */
export function savedCharacterPatronId(): string | undefined {
  if(deletionBarrier(CHAR_SLOT))return undefined;
  if(summaryPatron && leaseCurrent(summaryPatron.lease))return summaryPatron.id;
  try {
    const cached=browserRunStore()?.peek(charKeyFor(CHAR_SLOT));
    const raw:unknown=JSON.parse((cached===undefined?window.localStorage.getItem(charKeyFor(CHAR_SLOT)):cached)??'null');
    if(hasCharacterPages(raw)&&(raw.characterPages!==1||!Array.isArray(raw.pages)||!raw.pages.length||!Array.isArray(raw.order)))return undefined;
    const data=(hasCharacterPages(raw)?raw.character:raw) as Partial<CharacterSave>|null;
    return isCurrentCharacterSave(data)&&typeof data?.charId==='string'&&data.charId.length>0?data.charId:undefined;
  } catch { return undefined; }
}
export function loadCharacter(): CharacterSave | null {
  const data = cachedCharacter(CHAR_SLOT);
  return isCurrentCharacterSave(data) ? data : null;
}

/** Disk remains authoritative where present. Browser tombstones/corruption
 * cannot fall through to an older full-body localStorage mirror. */
async function loadCharacterSlot(slot: number): Promise<CharacterSave | null> {
  if (deletionBarrier(slot)) return null;
  const disk = await diskGet<CharacterSave>(slot);
  if (deletionBarrier(slot)) return null;
  let data: CharacterSave | null = disk;
  if(disk!==null && hasCharacterPages(disk)){writeCharacterMirror(slot,null);return null;}
  if (disk === null) {
    if (deletionBarrier(slot)) return null;
    const store = browserRunStore();
    if (store) {
      try { await store.flush(); } catch { /* read the last durable transaction */ }
      const read = await store.read(charKeyFor(slot));
      if (read.status === 'value') {
        try { data = await decodeCharacterPages(JSON.parse(read.body),nativePageStore()); }
        catch(error) { console.error('[save] character native pages refused:',error); return null; }
      } else if (read.status === 'deleted' || read.status === 'corrupt') return null;
      else data = cachedCharacter(slot);
    } else data = cachedCharacter(slot);
  }
  if (deletionBarrier(slot)) return null;
  if (isCurrentCharacterSave(data)) {
    if (disk !== null || browserRunStore()?.peek(charKeyFor(slot)) === undefined) writeCharacterMirror(slot, JSON.stringify(data));
    return data;
  }
  if (data && typeof data.schemaVersion === 'number') {
    noteSaveReset(data.accountVersion !== undefined && data.accountVersion !== SAVE_COMPATIBILITY.account ? 'account' : 'run');
    if (disk !== null) diskPut(slot, '{}');
  }
  if (disk !== null || data !== null) writeCharacterMirror(slot, null);
  return null;
}
export const loadCharacterAsync = (): Promise<CharacterSave | null> => loadCharacterSlot(CHAR_SLOT);

interface ResumeLease {
  slot:number; intent:number; barrier:string|null; epoch:number;
  source:'disk'|'browser'|'legacy'; body:string; revision?:number; reference:string|null;
  signal?:AbortSignal; bound?:World; session?:CharacterPageSession; cancelled:boolean;
}
const resumeLeases = new WeakMap<ResumeAuthority, ResumeLease>();
type ResumeStamp=Pick<ResumeLease,'slot'|'intent'|'barrier'|'epoch'|'reference'|'signal'|'cancelled'>;
let summaryPatron: {id:string|undefined;lease:ResumeStamp}|undefined;
function slotReference(slot:number):string|null {try{const body=window.localStorage.getItem(charKeyFor(slot));return body===null?null:massDigest(body);}catch{return null;}}
type ResumeSource = {status:'value'; data:unknown; lease:ResumeLease}
  | {status:'empty'|'deleted'|'stale'} | {status:'refused';reason:string};
function leaseCurrent(lease:ResumeStamp):boolean {
  return !lease.cancelled && !lease.signal?.aborted && !saveSuppressed()
    && (mirrorIntents.get(lease.slot)??0)===lease.intent && deletionBarrier(lease.slot)===lease.barrier
    && slotEpoch(lease.slot)===lease.epoch && slotReference(lease.slot)===lease.reference;
}
/** A fresh authority read never writes, deletes, heals, or downgrades a slot. */
async function readResumeSource(slot:number,signal?:AbortSignal):Promise<ResumeSource> {
  if(slot!==CHAR_SLOT && (!Number.isSafeInteger(slot)||slot<ROSTER_SLOT_BASE))return {status:'refused',reason:'Invalid character slot'};
  const lease:ResumeLease={slot,intent:mirrorIntents.get(slot)??0,barrier:deletionBarrier(slot),epoch:slotEpoch(slot),
    source:'legacy',body:'',reference:slotReference(slot),...(signal?{signal}:{}),cancelled:false};
  if(lease.barrier)return {status:'deleted'};
  if(!leaseCurrent(lease))return {status:'stale'};
  try {
    const disk=await diskGet<unknown>(slot);
    if(!leaseCurrent(lease))return {status:'stale'};
    if(disk!==null){
      if(hasCharacterPages(disk))return {status:'refused',reason:'Native files require a portable character'};
      lease.source='disk';lease.body=JSON.stringify(disk);return {status:'value',data:disk,lease};
    }
    const store=browserRunStore();
    if(store){
      try{await store.flush();}catch{/* The durable root is still the authority. */}
      if(!leaseCurrent(lease))return {status:'stale'};
      const read=await store.read(charKeyFor(slot));
      if(!leaseCurrent(lease))return {status:'stale'};
      if(read.status==='deleted')return {status:'deleted'};
      if(read.status==='corrupt'||read.status==='unavailable')return {status:'refused',reason:'Character storage '+read.status};
      if(read.status==='value'){
        lease.source='browser';lease.body=read.body;lease.revision=read.revision;
        return {status:'value',data:JSON.parse(read.body),lease};
      }
    }
    const raw=window.localStorage.getItem(charKeyFor(slot));
    if(!raw)return {status:'empty'};
    const data:unknown=JSON.parse(raw);
    if(isBrowserRunReference(data)||hasCharacterPages(data))return {status:'refused',reason:'Referenced character storage unavailable'};
    lease.body=raw;return {status:'value',data,lease};
  }catch(error){return {status:'refused',reason:String(error instanceof Error?error.message:error)};}
}
/** The menu needs identity only. This does not validate/expand distant pages or
 * grant resume authority, and never changes the complete synchronous loader. */
export async function readCharacterContinueSummary(slot=CHAR_SLOT):Promise<CharacterContinueSummary|null> {
  const read=await readResumeSource(slot);
  if(read.status!=='value')return null;
  try {
    const save=hasCharacterPages(read.data)?validateCharacterPageEnvelope(read.data).character:read.data;
    if(!isCurrentCharacterSave(save)||!leaseCurrent(read.lease))return null;
    const fields=save as CharacterFields;
    if(slot===CHAR_SLOT){const {slot:intendedSlot,intent,barrier,epoch,reference,cancelled}=read.lease;
      summaryPatron={id:fields.charId,lease:{slot:intendedSlot,intent,barrier,epoch,reference,cancelled}};}
    return {classId:fields.classId,level:fields.level,...(fields.name===undefined?{}:{name:fields.name}),
      ...(fields.charId===undefined?{}:{charId:fields.charId}),...(fields.modeId===undefined?{}:{modeId:fields.modeId})};
  }catch{return null;}
}
export async function readCharacterResume(slot=CHAR_SLOT,options:{signal?:AbortSignal}={}):Promise<CharacterResumeRead> {
  const read=await readResumeSource(slot,options.signal);
  if(read.status!=='value')return read;
  try {
    const authority=Object.freeze({}) as ResumeAuthority;
    let resume:CharacterResume;
    if(hasCharacterPages(read.data)){
      const payload=await preparePagedCharacterResume(read.data,nativePageStore(),()=>leaseCurrent(read.lease));
      resume={...payload,authority};
    }else{
      if(!isCurrentCharacterSave(read.data))return {status:'incompatible'};
      resume={kind:'inline',save:read.data as CharacterSave,authority};
    }
    if(!leaseCurrent(read.lease))return {status:'stale'};
    resumeLeases.set(authority,read.lease);
    return {status:'ready',resume:freezeData(resume)};
  }catch(error){return leaseCurrent(read.lease)?{status:'refused',reason:String(error instanceof Error?error.message:error)}:{status:'stale'};}
}
/** Portable callers require every historical body. A corrupt/missing page is
 * a failed export, never an empty slot silently omitted from the bundle. */
export async function loadCharacterPortable(slot=CHAR_SLOT):Promise<CharacterSave|null> {
  const read=await readResumeSource(slot);
  if(read.status==='empty'||read.status==='deleted')return null;
  if(read.status!=='value')throw Error(read.status==='refused'?read.reason:'Stale portable character read');
  const saved=await decodeCharacterPages(read.data,nativePageStoreForPortable(read.data));
  if(!isCurrentCharacterSave(saved))throw Error('Incompatible portable character');
  if(!leaseCurrent(read.lease))throw Error('Stale portable character read');
  const after=await readResumeSource(slot);
  if(after.status!=='value'||!leaseCurrent(read.lease)||after.lease.source!==read.lease.source
    ||after.lease.body!==read.lease.body||after.lease.revision!==read.lease.revision)throw Error('Stale portable character read');
  return saved;
}
function nativePageStoreForPortable(value:unknown):Pick<BrowserNativePages,'readPage'> {
  // Inline/native-file exports do not need an IndexedDB service at all.
  return hasCharacterPages(value)?nativePageStore():{readPage:async()=>{throw Error('Unexpected native page read');}};
}

/** Synchronous final check, usable in the same turn as candidate publication. */
export function characterResumeAuthority(resume:CharacterResume):boolean {
  const lease=resumeLeases.get(resume.authority);
  return !!lease && leaseCurrent(lease) && (!lease.bound || pageSessions.get(lease.bound)===lease.session);
}
export async function characterResumeCurrent(resume:CharacterResume):Promise<boolean> {
  if(!characterResumeAuthority(resume))return false;
  const lease=resumeLeases.get(resume.authority)!;
  const current=await readResumeSource(lease.slot,lease.signal);
  return characterResumeAuthority(resume) && current.status==='value' && current.lease.source===lease.source
    && current.lease.body===lease.body && current.lease.revision===lease.revision;
}
/** Consume authority once, after build/world validation and before runtime
 * attachment. Rollback only removes this exact session, never its successor. */
export function bindCharacterResumePages(world:World,resume:CharacterResume):()=>void {
  if(!characterResumeAuthority(resume))throw Error('Stale character resume');
  const lease=resumeLeases.get(resume.authority)!;
  if(lease.bound || saveSlotFor(world)!==lease.slot)throw Error('Character resume authority already used or foreign slot');
  const fields=characterResumeFields(resume);
  if(fields.charId && fields.charId!==world.meta.charId)throw Error('Foreign resumed character');
  const prior=pageSessions.get(world), pages=resume.kind==='browser-native-pages'?resume.pages:undefined;
  const session:CharacterPageSession={pages:pages?[...pages.pages]:[],order:pages?[...pages.order]:[],busy:false,revision:0,
    slot:lease.slot,epoch:lease.epoch};
  pageSessions.set(world,session);lease.bound=world;lease.session=session;
  let rolled=false;
  return ()=>{if(rolled)return;rolled=true;lease.cancelled=true;
    if(pageSessions.get(world)===session){if(prior)pageSessions.set(world,prior);else pageSessions.delete(world);}};
}

/** The localStorage mirror key for a character slot (the shared run slot keeps
 *  its historical key; roster slots suffix theirs). Exported for meta/portage.ts. */
export const charKeyFor = (slot: number): string => slot === CHAR_SLOT ? CHAR_KEY : `${CHAR_KEY}_s${slot}`;

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

/** Stringify the save, splicing the world's memoized section JSON in
 *  verbatim — the zones section (~95% of a lived-in save's bytes) and the
 *  zone-memory section (its ~2.4ms stringify was the next-largest slice) —
 *  so the final walk covers only the sliver of the tree that actually
 *  changes per beat (the 20s autosave hitch).
 *
 *  THE SPLICE RIDES SENTINELS, NEVER JSON.rawJSON: rawJSON accepts only JSON
 *  PRIMITIVES — handed the zones ARRAY it throws, and (07-23..07-31) that
 *  throw, swallowed by the writers' quota catch, silently discarded every
 *  character save on every rawJSON-capable runtime (the Immortal-vessel
 *  loss). Instead each spliced array serializes as a one-off entropy
 *  sentinel and an indexOf/slice swap seats the memoized JSON in its place.
 *  The memory seam is identity-locked (memorySaveJson hands back bytes only
 *  for the EXACT array the last serialize built); the sentinels are minted
 *  per call, so no save content can spoof them; and any anomaly — a
 *  sentinel absent, or present more than once — falls back WHOLE to the
 *  plain stringify. Correctness never rides the optimization
 *  (probe_persistence pins byte parity between the lanes, and pins
 *  rawJSON's array refusal so the old idiom can't return). */
export function characterBody(world: World, save: CharacterSave): string {
  const w = save.world;
  const zonesJson = w ? world.zonesSaveJson() : null;
  // THE SECOND SEAM (the memory section): the accessor is identity-checked
  // against the array in THIS save, so a stale save object (built before
  // the memo's last serialize) can never wear fresher bytes than its own.
  const memJson = w?.memory ? world.memorySaveJson(w.memory) : null;
  if (w && (zonesJson || memJson)) {
    const zs = w.zones;
    const mem = w.memory;
    const salt = `${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
    const zSentinel = `__zsplice_${salt}__`;
    const mSentinel = `__msplice_${salt}__`;
    // The sentinels are SWAPPED into the save directly rather than minted by
    // a replacer callback: a replacer de-optimizes the whole stringify (V8
    // leaves the fast path — measured ~11ms extra on a 2MB body), and the
    // swap stringifies byte-identically. The finally restores the arrays
    // even when serialization throws, so the loud-failure lane
    // (saveCharacter's catch) never sees a save left mutated.
    let body: string;
    try {
      if (zonesJson) (w as { zones: unknown }).zones = zSentinel;
      if (memJson) (w as { memory: unknown }).memory = mSentinel;
      body = JSON.stringify(save);
    } finally {
      if (zonesJson) w.zones = zs;
      if (memJson) w.memory = mem;
    }
    // Verify then apply: every requested splice's token must appear EXACTLY
    // once, or the whole body falls back to the plain stringify — a partial
    // splice could seat one section beside a corrupted other. Applied
    // back-to-front so earlier offsets hold.
    const splices: { at: number; len: number; json: string }[] = [];
    let ok = true;
    for (const s of [
      ...(zonesJson ? [{ sentinel: zSentinel, json: zonesJson }] : []),
      ...(memJson ? [{ sentinel: mSentinel, json: memJson }] : []),
    ]) {
      const token = JSON.stringify(s.sentinel); // quoted, exactly as it appears in the body
      const at = body.indexOf(token);
      if (at < 0 || body.indexOf(token, at + token.length) >= 0) { ok = false; break; }
      splices.push({ at, len: token.length, json: s.json });
    }
    if (ok && splices.length) {
      splices.sort((a, b) => b.at - a.at);
      for (const s of splices) body = body.slice(0, s.at) + s.json + body.slice(s.at + s.len);
      return body;
    }
  }
  return JSON.stringify(save);
}

export function saveCharacter(world: World): void {
  if (saveRefused('character')) return; // the crash trap's stand-down (persistence.ts)
  if (!world.clientActionHook) saveAccount(world.account);
  const slot = saveSlotFor(world);
  if (slot < 0) return;
  if(!characterNativeSessionCurrent(world))return;
  acceptCharacterWriter(world,slot);
  let body: string;
  // Serialize failures never crash gameplay — but they must never be SILENT
  // either: a quiet return here is how a broken save path loses runs for
  // days (the rawJSON regression). Loud on the console, visible to probes.
  try { body = mirrorBody(world, serializeCharacter(world)); }
  catch (e) { console.error('[save] serializeCharacter threw — nothing written:', e); return; }
  writeCharacterMirror(slot, body);
  diskPut(slot, body);
}

/** DURABLE character write (sendBeacon) for the QUIT FLUSH: a fire-and-forget
 *  fetch can be dropped when the window closes mid-flight (Alt-F4, the ✕),
 *  and the worldstate's exact-resume promise is only as honest as the last
 *  write that actually landed. Same routing as saveCharacter. */
export function saveCharacterDurable(world: World): void {
  if (saveRefused('character')) return; // stand-down: the quit flush refuses too
  if (!world.clientActionHook) saveAccountDurable(world.account);
  const slot = saveSlotFor(world);
  if (slot < 0) return;
  if(!characterNativeSessionCurrent(world))return;
  acceptCharacterWriter(world,slot);
  // The session's LAST write is always built fresh — the memo's fold never
  // gets a say over the exact-resume promise.
  world.invalidateZonesSaveMemo();
  let body: string;
  try { body = mirrorBody(world, serializeCharacter(world)); }
  catch (e) { console.error('[save] serializeCharacter threw — durable write refused:', e); return; }
  writeCharacterMirror(slot, body);
  diskBeacon(slot, body);
}

export function clearCharacter(): void {
  // Stand-down covers the WIPE too: a post-crash death flow must not erase a
  // run off the back of untrusted state (frozen means frozen — both halves,
  // so the disk-first loader isn't left disagreeing with localStorage).
  if (saveRefused('character wipe')) return;
  invalidateCharacterSlot(CHAR_SLOT);
  writeCharacterMirror(CHAR_SLOT, null);
  // DURABLE wipe: must survive the player closing the game on the death screen,
  // else the disk-first loader resurrects the dead character (permadeath break).
  diskBeacon(CHAR_SLOT, '{}');
}

// --- the ROSTER (owned character slots — meta/modes.ts) ----------------------

/** Load a roster character's save from its slot: disk-first (the authority),
 *  localStorage mirror as the static-host fallback. Null = empty/corrupt. */
export const loadRosterSave = (slot: number): Promise<CharacterSave | null> => loadCharacterSlot(slot);

/** Durably empty a roster slot (vessel deletion — a deliberate roster action). */
export function wipeRosterSlot(slot: number): void {
  invalidateCharacterSlot(slot);
  writeCharacterMirror(slot, null);
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
    accountRelics: 1,
    stash: m.stash ? structuredClone(m.stash) : undefined,
    relicScope: m.relicScope ?? (m.charId || 'run:' + world.manifest.seed),
    schemaVersion: CHAR_SCHEMA_VERSION,
    accountVersion: SAVE_COMPATIBILITY.account,
    classId: m.classDef.id,
    name: m.name,
    baseAttrs: { ...m.baseAttrs },
    xp: m.xp, xpNeeded: m.xpNeeded,
    passivePoints: m.passivePoints,
    allocated: [...m.allocated],
    choices: Object.fromEntries(Object.entries(m.choices).map(([k, v]) => [k, [...v]])),
    realmPoints: { ...m.realmPoints },
    grafts: { ...m.grafts },
    vocations: [...m.vocations],
    vocationPoints: m.vocationPoints,
    knownSkills: [...m.knownSkills.values()].map(saveSkill),
    // THE RESIDENCE: loose gems ride `items` (the run-save's own law).
    items: m.items.filter(i => !i.relicKey).map(i => ({ ...i })),
    equipped: Object.fromEntries(
      Object.entries(m.equipped).flatMap(([k, v]) => (v ? [[k, { ...v }] as const] : [])),
    ),
    // THE CONTAINER FABRIC: seated pieces by board, seat cells included.
    containers: Object.fromEntries(
      Object.entries(m.containers).map(([id, held]) => [id, held.filter(i => !i.relicKey).map(i => ({ ...i }))]),
    ),
    essences: { ...m.essences },
    abilityEssences: { ...m.abilityEssences },
    vestiges: { ...m.vestiges },
    companions: [...(dormant.companions ?? [])],
    bar: hero.skills.map(s => s ? s.def.id : null),
    opening: [...m.opening],
    stances: { ...m.stances },
    level: hero.level,
    expedition: world.manifest,
    // The shared run's trigger counters are this vessel's lived experience
    // too (it was there); its next solo resume starts from them like any.
    ledger: { ...world.ledger },
    completedObjectives: [],
    throng: [...(dormant.throng ?? [])],
    throngClaimed: [...(dormant.throngClaimed ?? [])],
    // The shared world's reveal ledger rides the guest card like the run
    // ledger above — the find happened with them standing there.
    ...(world.annexFound.size ? { annexFound: [...world.annexFound] } : {}),
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
  if (saveRefused('couch guest')) return;
  if (slot < ROSTER_SLOT_BASE) return; // guests only ever write roster slots
  let body: string;
  try { body = JSON.stringify(serializeCouchGuest(world, seat, dormant)); }
  catch (e) { console.error('[save] serializeCouchGuest threw — nothing written:', e); return; }
  writeCharacterMirror(slot, body);
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
