// ---------------------------------------------------------------------------
// ACCOUNT — the META-PROGRESSION layer that outlives any single character.
//
// Death is permanent: a character is wiped on death. But the ACCOUNT survives.
// THE RECKONING (the run-end law): the essence a run still CARRIES when it
// concludes is appraised into Mortal Essence at the strict mortal exchange
// (data/essences.ts mortalWorth — coarse 1:1 up to pristine 1:5), the unlock
// screen is the run's immediate epilogue, and whatever is not assigned there
// is SEALED away to zero — Mortal Essence never crosses between runs. Each
// run spends its own harvest; partial investments (Account.invested) are the
// bridge across runs, the account LEVEL (a lifetime-mint milestone) and the
// RUN CHRONICLE (runRecords — the personal leaderboard) the long memory.
// Unlocks gate which classes you may pick, which gems may drop, and which
// town features are active — turning the run loop into an ARPG-roguelite.
//
// Pure data + pure functions: the Account is created/loaded in main.ts and
// injected (by reference) into the World and UI. It is never re-loaded mid-run.
// ---------------------------------------------------------------------------

import type { CraftLore } from '../engine/crafting';
import { CLASSES } from '../data/classes';
import { DEATH_SCHEMA, MAX_DEATH_RECORDS, type DeathRecord } from './death';
import { clampFrequency, DEFAULT_FREQUENCY, type FrequencyProfile } from '../packages/frequency';
// Type-only — modes.ts value-imports from this file; a runtime import back
// would be a cycle. RosterEntry is pure data, so the type is all we need.
import type { RosterEntry } from './modes';
// Safe VALUE import: mercs.ts only type-imports from this file, so the edge
// is one-directional at runtime (account → mercs → data/classes).
import { MERC_SCHEMA, type MercRosterEntry } from './mercs';
// Same one-directional stance (nemesis.ts only type-imports Account).
import { NEMESIS_SCHEMA, type SagaRecord } from './nemesis';

export const SCHEMA_VERSION = 1;

/** The classes every account starts with — always in the character-select roll.
 *  Every OTHER class enters the roll pool through its Vault class bundle
 *  (unlocks.ts CLASS_BUNDLES: class + thematic gems in one purchase). */
export const STARTER_CLASSES: readonly string[] = ['warrior', 'magician', 'rogue'];

/** Starter skills = the UNION of the starter classes' LIVE bars, derived so a
 *  default character can always re-drop its own kit. Re-bar a starter class
 *  and this follows with zero edits here (the old hand-copied list had already
 *  drifted — the Rogue's Stealth was missing, so it could never drop again). */
export const STARTER_SKILLS: readonly string[] = [...new Set(
  CLASSES.filter(c => STARTER_CLASSES.includes(c.id))
    .flatMap(c => c.bar.filter((s): s is string => s !== null)),
)];

/** Starter support gems (verified ids from data/supports.ts). */
export const STARTER_SUPPORTS: readonly string[] = [
  'arcing', 'splitting', 'piercing', 'concentrated', 'precision', 'slow_burn',
];

/** Selectable class SLOTS a brand-new account has at character select. More are
 *  bought via SLOT_TIERS (see unlocks.ts); the roster is then rolled randomly. */
export const STARTER_SLOT_COUNT = 3;

/** Town-feature flags, set when their unlock is bought. */
export const FEATURE = {
  BRANDT_EXTRA_GEMS: 'brandt_extra_gems',
  BRANDT_SELL_SUPPORTS: 'brandt_sell_supports',
  BRANDT_FAST_RESTOCK: 'brandt_fast_restock',
  /** Mireille's care, unlocked in sequence: life heal → mana heal → an XP buff. */
  MIREILLE_HEAL_LIFE: 'mireille_heal_life',
  MIREILLE_HEAL_MANA: 'mireille_heal_mana',
  MIREILLE_XP_BUFF: 'mireille_xp_buff',
  /** THE TRACKER: a huntsman camps at Lastlight's west edge — dwell by his
   *  fire to open the BESTIARY (data/bestiary.ts): every kind your line has
   *  slain, studied into knowledge across the whole account. */
  TRACKER: 'tracker',
  /** The Quest Package: expands Lastlight with a quest-giver who posts hunts. */
  QUEST_GIVER: 'quest_giver',
  /** A Training Dummy in town — an immortal target to test skills / effects /
   *  modifiers against (unlocks in the Vault once any character has reached L5). */
  TARGET_DUMMY: 'target_dummy',
  /** A Campfire in town — dwell by it to REFRESH the world (forget every zone's
   *  remembered layout + enemies so they repopulate fresh; cleared objectives
   *  persist). Player agency over the default zone-remembrance. */
  CAMPFIRE: 'campfire',
  /** Master gem unlock: EVERY droppable skill + support becomes obtainable
   *  (drops, chests, Brandt). Future-proof — new gems are auto-included. */
  UNLOCK_ALL_GEMS: 'unlock_all_gems',
  /** META-META: surfaces the global event-frequency crank on the Expedition
   *  screen (a level-100 reward — turn the whole world's event volume up/down).
   *  See packages/frequency.ts. */
  GLOBAL_FREQUENCY: 'global_frequency',
  /** THE MERCENARY RECRUITER: the Vault's officer takes a table in
   *  Lastlight — hire-only (no retirement: the port policy at the town's
   *  own counter) with a SINGLE-SERVE sheet dealt once per world and locked
   *  by THE MUSTER-ROLL LAW (meta/mercs.ts). Early blades without walking
   *  to a port; surfaces once the account has met the market anywhere. */
  MERC_RECRUITER: 'merc_recruiter',
  /** THE CARAVAN: a travelling Caravanner camps in Lastlight (base tier) and escorts
   *  the player to level-band zones minted in their proper difficulty band. Four broad
   *  tiers open progressively wider bands; the far tiers also require the Unmade slain.
   *  See data/caravan.ts for the band→tier map. */
  CARAVAN: 'caravan',             // base: town fixture + bands 1-2 (lvl ≤20)
  CARAVAN_DEEP: 'caravan_deep',   // band 3 (lvl 30)
  CARAVAN_FAR: 'caravan_far',     // bands 4-5 (lvl 40-50) — needs unmade_slain
  CARAVAN_WORLD: 'caravan_world', // bands 6-10 (lvl 60-100) — needs unmade_slain
  /** THE VOYAGE's ship ladder: each hull is a Vault purchase (data/ships.ts
   *  maps flags → sailing levers). The tier-0 dinghy is free — no flag. */
  SHIP_SLOOP: 'ship_sloop',
  SHIP_BRIGANTINE: 'ship_brigantine',
  SHIP_GALLEON: 'ship_galleon',
  /** THE SALVAGE STATION: a breaker's bench raised in Lastlight — dwell to
   *  break items/gems into Essence and craft studied affixes onto gear. */
  SALVAGE_STATION: 'salvage_station',
  /** A second CRAFTED affix slot per item (see engine/crafting.ts
   *  CRAFT_CFG.extraSlotFeature — the golden one-craft rule, sold apart). */
  CRAFT_SECOND_AFFIX: 'craft_second_affix',
  /** THE ORACLE STONE: standing stones in Lastlight — commune (a rune
   *  minigame) to REROLL one affix on an item, which seals it forever. */
  ORACLE_STONE: 'oracle_stone',
  /** THE IMMORTAL COVENANT (meta/modes.ts): unlocks the Immortal character
   *  mode at character select — earned by dying, not by spending (its Vault
   *  entry gates on the lifetime death counter). Slots 2/3 add roster vessels. */
  IMMORTAL: 'immortal_mode',
  IMMORTAL_SLOT_2: 'immortal_slot_2',
  IMMORTAL_SLOT_3: 'immortal_slot_3',
  /** THE PATRON'S HOLD (data/vendors.ts VENDOR_CFG.lock.ladder): each owned
   *  rung reserves one more shelf slot at every counter — a reserved row
   *  rides the world save and never re-rolls until bought or released. The
   *  CAP is the count of owned rungs, so raising the ceiling is appending a
   *  flag here and a row to the ladder — never editing a literal. */
  VENDOR_LOCK_1: 'vendor_lock_1',
  VENDOR_LOCK_2: 'vendor_lock_2',
  VENDOR_LOCK_3: 'vendor_lock_3',
  /** THE BROADER-WARES FAMILY (data/vendors.ts VENDOR_CFG.wares.ladder):
   *  each owned rung widens EVERY counter's stock — true-gem slots AND
   *  rolled pieces on the one shelf, per the rung's own numbers.
   *  Rung 1 wears the LEGACY flag below (accounts that bought "Brandt: +2
   *  Wares" own rung 1 outright — ownership rides flags, never catalog
   *  ids); later rungs may carry GATEWORK avenues (meta/gates.ts): the
   *  unlocks OF the unlocks are data on the ladder row. */
  VENDOR_WARES_2: 'vendor_wares_2',
  VENDOR_WARES_3: 'vendor_wares_3',
  /** THE MEMORY COUNTER (skill-items M3 — re-aimed from the retired gem-case
   *  FACE to the shelf's true-gem STOCK share): while unowned, counters
   *  stock Memory pouches + gear only; owning it joins the direct
   *  skill/support Memory finds to the one shelf (buildVendorStock +
   *  mintDelverStock read World.vendorGemsOpen — the stock builder IS the
   *  gate now). */
  VENDOR_GEMS: 'vendor_gems',
  /** THE RUSH LADDER rung 2 (VENDOR_CFG.restock.ladder — rung 1 wears the
   *  legacy BRANDT_FAST_RESTOCK above): each owned rung CUTS the counters'
   *  restock beat by its own seconds, floored at the config's minSec. */
  VENDOR_RESTOCK_2: 'vendor_restock_2',
  /** THE STANDING ORDER (World.resolveCommission): pre-select one gem the
   *  account KNOWS (drop index ≥ VENDOR_CFG.commission.need) and the counter
   *  watches its own restock beats for it — every beat that passed while you
   *  were away resolves at the true shelf odds, seeded so a reload can never
   *  re-flip a find. */
  VENDOR_COMMISSION: 'vendor_commission',
} as const;

/** Account-ledger key: lifetime deaths across every character (bumped by the
 *  death flow per the dying stage's countsAccountDeath policy). Gates the
 *  Immortal unlock; any future "die N times" content reads the same counter. */
export const LEDGER_ACCOUNT_DEATHS = 'account_deaths';

/** Account-ledger key: an account that has LIVED Mireille's flask lesson —
 *  the gift loop closed once (gems learned and set to the bar, or traded
 *  away, or deliberately unlearned — world.ts MIREILLE_LESSON_LEDGER), or
 *  her brim reward paid. ONE string serves both ledgers by design: it is
 *  the per-RUN fill marker (world.ts MIREILLE_FILL_LEDGER aliases this),
 *  so a metaProgression death merges it into the account naturally — and
 *  updateMireille ALSO stamps the account directly the moment the lesson is
 *  lived (accountDirty persistence) so graduation is immediate, not
 *  death-deferred. Read it as a FLAG: any truthy count means this account
 *  has been taught — every later character spawns with the flasks dealt
 *  outright (World.dealVeteranFlasks) instead of re-walking the tutorial,
 *  and the lesson LATCH (World.mireilleGiftLesson) keeps every teaching
 *  surface quiet on this account forever: completed never re-opens. */
export const LEDGER_FLASK_LESSON = 'mireille_flasks_filled';

// --- THE DEED GATES (the Vault's miniature side-quests): town features
// that unlock purely through gradual play, each key stamped at its ONE
// genuine engine site and read by the catalog's reqLedger/reqLedgerCounts.
/** First LEGENDARY skill gem genuinely minted into the world (noteGemDrop —
 *  the drop index's own chokepoint, so discards/reclaims can never fake it).
 *  Flag semantics: any truthy value. Gates the Training Dummy. */
export const LEDGER_LEGENDARY_SKILL_DROP = 'legendary_skill_dropped';
/** Lifetime count of craft FAMILIES studied to rank 1 — "this craft is
 *  unlocked at all" (studySalvage's first rank-up per family, stamped at
 *  World.salvageItem's bench lane). Gates the Oracle Stone. */
export const LEDGER_CRAFTS_UNLOCKED = 'crafts_unlocked';
/** Lifetime count of zones first-visited (per run's charting — caves never
 *  chart, so they never count; stamped at World.loadZone). Gates the
 *  Campfire. */
export const LEDGER_ZONES_EXPLORED = 'zones_explored';

/** THE DROP INDEX (the bestiary's sibling, same ledger, same doctrine): one
 *  lifetime counter per gem id, bumped ONLY where a gem is genuinely MINTED
 *  into the world as loot (World.dropGemAt + the Bonewright's fixed spoils).
 *  Discards, corpse reclaims, looter spills and counter purchases never
 *  route through a mint, so the index is abuse-proof at the source — it
 *  accrues through play, never through juggling. A CROSS-FILE CONTRACT like
 *  every ledger key: unlock predicates may gate on it verbatim
 *  (reqLedgerCounts), and THE STANDING ORDER's eligibility reads it. */
export const LEDGER_GEMDROP_PREFIX = 'gemdrop:';
export const gemDropKey = (gemId: string): string => `${LEDGER_GEMDROP_PREFIX}${gemId}`;

/** Account-ledger key: lifetime genuine gem mints, all ids folded — the
 *  "how much loot has this line seen" gate (the commission row reads it). */
export const LEDGER_GEMDROP_TOTAL = 'gemdrops_total';

/** Account-ledger key: lifetime purchases at any registered counter — the
 *  discovery stamp for the Vault's counter-service rows (you can only buy
 *  what you know exists: the merc market's own doctrine). */
export const LEDGER_VENDOR_BOUGHT = 'vendor_bought';

/** PER-CLASS play milestones, stamped into the RUN ledger as
 *  `class_<classId>_level_<m>` (world.ts grantSeatXp — local seat only,
 *  once per run, merged into the account on death like every other key).
 *  These are THE DISCOVERY WEB's raw material (unlocks.ts
 *  ClassBundleDef.discover): playing a class deep is how the account
 *  learns that class's kin exist. Any future content may gate on the same
 *  keys — "reach level 20 as any three classes" is a reqLedgerCounts row
 *  away. Extend the list freely; keys stamp lazily (only levels actually
 *  reached), so the ledger stays lean. */
export const CLASS_LEVEL_MILESTONES: readonly number[] = [5, 10, 15, 20, 25, 30, 40, 50];

/** The ledger key for "reached level `m` playing `classId`" — ONE spelling
 *  shared by the stamp sweep (world.ts) and every gate that reads it. */
export const classLevelLedgerKey = (classId: string, m: number): string =>
  `class_${classId}_level_${m}`;

/** The GLOBAL level-milestone key — "any character has reached level n"
 *  (`reached_level_<n>`). ONE spelling shared by the XP sweep's stamps
 *  (world.ts grantSeatXp: the standing decade keys PLUS every level the
 *  unlock catalog's own gates ask about — meta/unlocks.ts
 *  CATALOG_LEVEL_MILESTONES, derived, never hand-kept) and every gate that
 *  reads one (unlocks reqLedger rows, gates.ts `level` avenues). */
export const reachedLevelKey = (n: number): string => `reached_level_${n}`;

/** THE VOCATION LEDGER CONTRACT: `vocation_unlocked_<vocId>`, written by
 *  World.grantVocation — to the run ledger AND immediately to the account
 *  (quit-without-death keeps the deed). The prefix is exported apart so
 *  "ANY vocation completed" gates (gates.ts `vocation: true` avenues) can
 *  prefix-scan without naming ids. data/vocations.ts derives its key helper
 *  from THIS spelling — one contract, two homes never. */
export const LEDGER_VOCATION_PREFIX = 'vocation_unlocked_';
export const vocationUnlockKey = (vocId: string): string => `${LEDGER_VOCATION_PREFIX}${vocId}`;

/** THE QUEST LEDGER CONTRACT: `quest_done:<questId>` — a presence key
 *  stamped at TURN-IN (world.ts applyQuestReward: run ledger + immediately
 *  to the account under metaProgression, the grantVocation durability
 *  precedent), so "completed a quest" gates read true the moment the deed
 *  lands, not at the next death-merge. The prefix serves "ANY quest" scans
 *  (gates.ts `quest: true`); the lifetime counter below is the
 *  pre-gatework spelling every QuestReward already bumps — readers honor
 *  BOTH so accounts whose deeds predate the per-quest keys still speak. */
export const LEDGER_QUEST_DONE_PREFIX = 'quest_done:';
export const questDoneKey = (questId: string): string => `${LEDGER_QUEST_DONE_PREFIX}${questId}`;
export const LEDGER_QUESTS_COMPLETED = 'quests_completed';

/** First disk save slot the character ROSTER may use (0/1/2 are account /
 *  run-character / settings). Lives here (not modes.ts) so deserialization can
 *  sanity-check entries without a value import back into the modes registry. */
export const ROSTER_SLOT_BASE = 10;

/** The display name of the account meta-currency (minted at the run-end
 *  RECKONING from the run's carried essence, spent in the Vault, and gone —
 *  sealed to zero — when the reckoning closes). ONE constant — every panel
 *  prints through it. The internal field stays `credits` (save
 *  compatibility); the WORLD calls it this. */
export const META_CURRENCY_LABEL = 'Mortal Essence';

// --- THE RUN CHRONICLE — the account's own leaderboard -----------------------

export const RUN_RECORD_SCHEMA = 1;
/** Chronicle capacity. Must stay comfortably above the protected set
 *  (top-10 harvest + top-10 renown + newest 10) so recordRun always finds a
 *  droppable row. */
export const MAX_RUN_RECORDS = 60;

/** One concluded run, as the chronicle remembers it — the personal
 *  leaderboard's row. Two rankable metrics by design: `essence` is the
 *  reckoning's mint (the carried wallet appraised at the mortal exchange),
 *  `renown` the journey score (renownForRun) — how far the run got,
 *  independent of what its essence was spent on. */
export interface RunRecord {
  schema: number;
  /** Wall-clock ms at the run's end. */
  at: number;
  name: string;
  classId: string;
  level: number;
  zones: number;
  kills: number;
  /** How the run concluded ('death' | 'forfeit' | 'retire'; open set). */
  reason: string;
  /** Mortal Essence minted by THE RECKONING (wallet conversion × stage rate). */
  essence: number;
  /** The journey score — kills + zones·10 + level·2 (renownForRun). */
  renown: number;
}

/** Append a concluded run to the chronicle, then trim to MAX_RUN_RECORDS.
 *  THE PROTECTED SET: personal bests are never rotated out — the top ten by
 *  essence, the top ten by renown, and the newest ten all survive; the
 *  OLDEST unprotected row is dropped instead. */
export function recordRun(a: Account, rec: RunRecord): void {
  a.runRecords.push(rec);
  while (a.runRecords.length > MAX_RUN_RECORDS) {
    const prot = new Set<RunRecord>();
    const top = (key: (r: RunRecord) => number): void => {
      [...a.runRecords].sort((x, y) => key(y) - key(x)).slice(0, 10).forEach(r => prot.add(r));
    };
    top(r => r.essence);
    top(r => r.renown);
    a.runRecords.slice(-10).forEach(r => prot.add(r));
    const idx = a.runRecords.findIndex(r => !prot.has(r));
    a.runRecords.splice(idx >= 0 ? idx : 0, 1);
  }
}

/** Where a run stands in the chronicle: 1-based ranks (strictly-better rows
 *  count ahead — ties share a rank) among every remembered run. */
export function runStanding(a: Account, rec: RunRecord): { byEssence: number; byRenown: number; of: number } {
  let byEssence = 1, byRenown = 1;
  for (const r of a.runRecords) {
    if (r === rec) continue;
    if (r.essence > rec.essence) byEssence++;
    if (r.renown > rec.renown) byRenown++;
  }
  return { byEssence, byRenown, of: Math.max(1, a.runRecords.length) };
}

/** THE SEAL — close the reckoning: whatever Mortal Essence stands unassigned
 *  is let go (it never crosses between runs; each run spends its own
 *  harvest). Lifetime totals and partial unlock investments are untouched.
 *  Returns what passed, for the closing words. Caller saves. */
export function sealReckoning(a: Account): number {
  const passed = a.credits;
  a.credits = 0;
  return passed;
}

/** Per-package run configuration the player last chose (Expedition Setup). */
export interface PackagePref {
  enabled: boolean;
  weight: number;
  startLevel: number;
}

/** Runtime account (Sets for O(1) membership). Survives death + World recreation. */
export interface Account {
  credits: number;
  lifetimeCredits: number;
  level: number;
  /** PARTIAL UNLOCK INVESTMENTS (unlocks.ts investUnlock): catalog id →
   *  Mortal Essence poured in so far. Genuine incremental progress — a rung
   *  too dear for one run's harvest is bought across several; the entry is
   *  deleted the moment the unlock completes. */
  invested: Record<string, number>;
  /** THE SKILL GRAFT (unlocks.ts kind 'graft'): a REPEATABLE charge — armed
   *  by purchase, spent when a new run BEGINS with a grafted skill chosen
   *  (main.ts startGame → World.applySkillGraft). While armed, the run-start
   *  flow offers the pick and the Vault entry stands down; consumed, the
   *  entry returns to the shelf. One charge at a time by construction. */
  skillGraft: boolean;
  /** THE RUN CHRONICLE: every concluded run the account remembers (capped,
   *  personal bests protected — see recordRun). */
  runRecords: RunRecord[];
  /** THE CLASS POOL: the character-select hand is dealt ONLY from this set
   *  (starters + every purchased class bundle). Also gates the co-op lobby. */
  unlockedClasses: Set<string>;
  unlockedSkills: Set<string>;
  unlockedSupports: Set<string>;
  features: Set<string>;
  /** Owned slot-tier counts (e.g. {4,5}); selectable count derives from the max. */
  unlockedSlots: Set<number>;
  // --- content-package meta (see src/packages/) ---
  /** Package ids whose configuration (sliders) has been purchased in the Vault. */
  packageUnlocks: Set<string>;
  /** Last-used per-run slider positions, pre-filled on the Expedition screen. */
  packageDefaults: Record<string, PackagePref>;
  /** Lifetime trigger counters (crowned_killed, …) that gate package unlocks. */
  ledger: Record<string, number>;
  /** The player's chosen GLOBAL event-frequency crank (rate/concurrency/severity),
   *  baked into the manifest at run start. Defaults to 1/1/1 until the level-100
   *  GLOBAL_FREQUENCY unlock surfaces the slider. See packages/frequency.ts. */
  frequencyProfile: FrequencyProfile;
  /** Recent death spots (corpse runs) — a newest-first ring; survives the
   *  character wipe so the next run can reclaim the lost gems. See meta/death.ts.
   *  MORTAL-loop corpses only: an Undying character's corpses live in its OWN
   *  save (CharacterSave.deaths), structurally invisible to everyone else. */
  deaths: DeathRecord[];
  /** OWNED characters (Immortal vessels and any future roster-saved mode):
   *  index cards pointing at roster disk slots. Display metadata only — each
   *  slot's CharacterSave is the authority. See meta/modes.ts. */
  roster: RosterEntry[];
  /** RETIRED HEROES — the mercenary supply (meta/mercs.ts): build snapshots
   *  captured at outpost retirement, offered back as hireable veterans.
   *  Capped at MERC_CFG.rosterCap (overflow replaces a random pooled one). */
  mercRoster: MercRosterEntry[];
  /** THE WORLD'S MEMORY (meta/nemesis.ts): sagas keyed by normalized character
   *  NAME — faction grudges, risen nemeses, fallen bearers. LRU-capped. */
  sagas: Record<string, SagaRecord>;
  /** The last character name the player TYPED at class select (sticky default;
   *  null = name characters for their class). The Nameless button clears it. */
  namePref: string | null;
  /** CRAFT LORE: affix-family → {rank, progress} study ledger. Progress is
   *  TIER-TRUE (crafting.ts studySalvage): only salvaged lines at or above
   *  the NEXT unlock tier teach. Knowledge survives every death — the
   *  material (essence) does not. */
  craftLore: CraftLore;
}

/** Serializable form (Sets → arrays) written to localStorage. */
export interface AccountSave {
  schemaVersion: number;
  credits: number;
  lifetimeCredits: number;
  level: number;
  /** Optional so pre-reckoning saves load with ?? defaults. */
  invested?: Record<string, number>;
  runRecords?: RunRecord[];
  skillGraft?: boolean;
  unlockedClasses: string[];
  unlockedSkills: string[];
  unlockedSupports: string[];
  features: string[];
  unlockedSlots: number[];
  // Content-package meta (all optional so older saves load with ?? defaults).
  packageUnlocks?: string[];
  packageDefaults?: Record<string, PackagePref>;
  ledger?: Record<string, number>;
  frequencyProfile?: FrequencyProfile;
  deaths?: DeathRecord[];
  roster?: RosterEntry[];
  mercRoster?: MercRosterEntry[];
  sagas?: Record<string, SagaRecord>;
  namePref?: string | null;
  /** Current shape {rank, progress}; LEGACY saves held a flat count. */
  craftLore?: Record<string, number | { rank: number; progress: number }>;
}

export function makeAccount(): Account {
  return {
    credits: 0, lifetimeCredits: 0, level: 0,
    invested: {},
    runRecords: [],
    skillGraft: false,
    unlockedClasses: new Set(STARTER_CLASSES),
    unlockedSkills: new Set(STARTER_SKILLS),
    unlockedSupports: new Set(STARTER_SUPPORTS),
    features: new Set<string>(),
    unlockedSlots: new Set<number>(), // empty ⇒ STARTER_SLOT_COUNT selectable
    packageUnlocks: new Set<string>(),
    packageDefaults: {},
    ledger: {},
    frequencyProfile: { ...DEFAULT_FREQUENCY },
    deaths: [],
    roster: [],
    mercRoster: [],
    sagas: {},
    namePref: null,
    craftLore: {},
  };
}

export function serializeAccount(a: Account): AccountSave {
  return {
    schemaVersion: SCHEMA_VERSION,
    credits: a.credits, lifetimeCredits: a.lifetimeCredits, level: a.level,
    invested: a.invested,
    runRecords: a.runRecords,
    skillGraft: a.skillGraft,
    unlockedClasses: [...a.unlockedClasses],
    unlockedSkills: [...a.unlockedSkills],
    unlockedSupports: [...a.unlockedSupports],
    features: [...a.features],
    unlockedSlots: [...a.unlockedSlots].sort((x, y) => x - y),
    packageUnlocks: [...a.packageUnlocks],
    packageDefaults: a.packageDefaults,
    ledger: a.ledger,
    frequencyProfile: a.frequencyProfile,
    deaths: a.deaths,
    roster: a.roster,
    mercRoster: a.mercRoster,
    sagas: a.sagas,
    namePref: a.namePref,
    craftLore: a.craftLore,
  };
}

/** null ⇒ schema mismatch; caller wipes + makeAccount(). Starters are always
 *  re-seeded so a partial/tampered save still boots playable. */
export function deserializeAccount(s: AccountSave): Account | null {
  if (!s || s.schemaVersion !== SCHEMA_VERSION) return null;
  const ledger = s.ledger ?? {};
  // MIGRATION SEED: accounts predating the death counter get credited what the
  // corpse ring still remembers (a floor, not the truth — the ring holds only
  // MAX_DEATH_RECORDS). New accounts count every death from zero.
  if (ledger[LEDGER_ACCOUNT_DEATHS] === undefined && (s.deaths?.length ?? 0) > 0) {
    ledger[LEDGER_ACCOUNT_DEATHS] = s.deaths!.length;
  }
  return {
    credits: s.credits ?? 0,
    lifetimeCredits: s.lifetimeCredits ?? 0,
    level: s.level ?? 0,
    // Positive whole numbers only — a malformed entry is dropped, never a wipe.
    invested: Object.fromEntries(Object.entries(s.invested ?? {})
      .map(([k, v]) => [k, Math.floor(Number(v))] as const)
      .filter(([, v]) => Number.isFinite(v) && v > 0)),
    // Per-RECORD schema stance (the deaths idiom): a chronicle-format change
    // forgets old runs, never the account.
    runRecords: (s.runRecords ?? [])
      .filter(r => r?.schema === RUN_RECORD_SCHEMA && typeof r.at === 'number')
      .slice(-MAX_RUN_RECORDS),
    skillGraft: s.skillGraft === true,
    unlockedClasses: new Set([...STARTER_CLASSES, ...(s.unlockedClasses ?? [])]),
    unlockedSkills: new Set([...STARTER_SKILLS, ...(s.unlockedSkills ?? [])]),
    unlockedSupports: new Set([...STARTER_SUPPORTS, ...(s.unlockedSupports ?? [])]),
    features: new Set(s.features ?? []),
    unlockedSlots: new Set<number>(s.unlockedSlots ?? []),
    packageUnlocks: new Set<string>(s.packageUnlocks ?? []),
    packageDefaults: s.packageDefaults ?? {},
    ledger,
    frequencyProfile: clampFrequency(s.frequencyProfile),
    // Per-RECORD schema filter (drop malformed/stale corpses, cap the ring)
    // WITHOUT touching SCHEMA_VERSION — a death-format change never wipes credits.
    deaths: (s.deaths ?? []).filter(d => d?.schema === DEATH_SCHEMA).slice(-MAX_DEATH_RECORDS),
    // Per-ENTRY sanity filter, same stance as deaths: a malformed roster card
    // is dropped (its slot file simply goes unlisted), never a wipe or a crash.
    roster: (s.roster ?? []).filter(r =>
      typeof r?.charId === 'string' && r.charId.length > 0
      && typeof r.modeId === 'string'
      && typeof r.slot === 'number' && r.slot >= ROSTER_SLOT_BASE),
    // Same per-entry schema stance for retired heroes — a merc-format change
    // sheds stale veterans without ever wiping credits or the account.
    mercRoster: (s.mercRoster ?? []).filter(m =>
      m?.schema === MERC_SCHEMA && typeof m.mercId === 'string' && !!m.snapshot),
    // Per-SAGA schema stance: a nemesis-format change forgets old grudges
    // (the world's memory fades), never the account.
    sagas: Object.fromEntries(Object.entries(s.sagas ?? {})
      .filter(([, v]) => v?.schema === NEMESIS_SCHEMA && typeof v.name === 'string')),
    namePref: typeof s.namePref === 'string' && s.namePref.trim() ? s.namePref : null,
    craftLore: migrateLore(s.craftLore),
  };
}

/** LEGACY craft lore was a flat lifetime salvage count against cumulative
 *  thresholds; today it's a tier-true {rank, progress} ledger. Convert old
 *  counts by replaying the old ladder — earned ranks are honored, leftover
 *  count becomes progress toward the next. */
const LEGACY_LORE_THRESHOLDS = [3, 8, 16, 28, 44];
function migrateLore(raw?: Record<string, number | { rank: number; progress: number }>): CraftLore {
  const out: CraftLore = {};
  for (const [family, v] of Object.entries(raw ?? {})) {
    if (typeof v === 'number') {
      let rank = 0;
      for (const t of LEGACY_LORE_THRESHOLDS) if (v >= t) rank++;
      out[family] = { rank, progress: Math.max(0, v - (rank > 0 ? LEGACY_LORE_THRESHOLDS[rank - 1] : 0)) };
    } else if (v && typeof v.rank === 'number') {
      out[family] = { rank: v.rank, progress: v.progress ?? 0 };
    }
  }
  return out;
}

/** The HAND SIZE at character select: the starter count, or the highest owned
 *  slot tier (whichever is greater). The hand is dealt from the account's
 *  unlockedClasses pool, so the classes actually shown = min(this, pool). */
export function selectableSlotCount(a: Account): number {
  return a.unlockedSlots.size === 0
    ? STARTER_SLOT_COUNT
    : Math.max(STARTER_SLOT_COUNT, ...a.unlockedSlots);
}

// --- predicates (pure) ------------------------------------------------------
export const isClassUnlocked = (a: Account, id: string): boolean => a.unlockedClasses.has(id);
/** A gem may drop/vend if it's individually unlocked OR the master UNLOCK_ALL_GEMS
 *  flag is owned (which makes EVERYTHING obtainable, new content included). */
export const isSkillUnlockedForDrop = (a: Account, id: string): boolean =>
  a.features.has(FEATURE.UNLOCK_ALL_GEMS) || a.unlockedSkills.has(id);
export const isSupportUnlockedForDrop = (a: Account, id: string): boolean =>
  a.features.has(FEATURE.UNLOCK_ALL_GEMS) || a.unlockedSupports.has(id);
export const featureEnabled = (a: Account, flag: string): boolean => a.features.has(flag);

// --- progression formulas (pure) --------------------------------------------
/** RENOWN — the journey score: how far the run got, as one number. Once the
 *  Mortal Essence formula (this WAS creditsForDeath), now purely the
 *  chronicle's second axis: the mint is the wallet conversion
 *  (data/essences.ts walletMortalValue); renown ranks the run beside it. */
export function renownForRun(charLevel: number, zonesExplored: number, kills: number): number {
  return Math.floor(kills * 1 + zonesExplored * 10 + charLevel * 2);
}
/** The account-level curve's one constant — level N begins at N²·this. */
const ACCOUNT_LEVEL_DIVISOR = 50;
/** Account level from lifetime credits — an N²·50 milestone curve. */
export function accountLevelFor(lifetimeCredits: number): number {
  return Math.floor(Math.sqrt(Math.max(0, lifetimeCredits) / ACCOUNT_LEVEL_DIVISOR));
}
/** Lifetime essence at which `level` begins — the curve's exact inverse
 *  (one constant, both directions; the chronicle's progress bar reads it). */
export function accountLevelThreshold(level: number): number {
  return ACCOUNT_LEVEL_DIVISOR * Math.max(0, level) * Math.max(0, level);
}
/** Award credits (spendable + lifetime) and recompute account level. */
export function applyCredits(a: Account, earned: number): void {
  a.credits += earned;
  a.lifetimeCredits += earned;
  a.level = accountLevelFor(a.lifetimeCredits);
}
