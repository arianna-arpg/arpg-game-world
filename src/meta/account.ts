// ---------------------------------------------------------------------------
// ACCOUNT — the META-PROGRESSION layer that outlives any single character.
//
// Death is permanent: a character is wiped on death. But the ACCOUNT survives,
// accruing CREDITS (spent on unlocks) and an account LEVEL (a lifetime-credits
// milestone). Unlocks gate which classes you may pick, which gems may drop, and
// which town features are active — turning the run loop into an ARPG-roguelite.
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
} as const;

/** Account-ledger key: lifetime deaths across every character (bumped by the
 *  death flow per the dying stage's countsAccountDeath policy). Gates the
 *  Immortal unlock; any future "die N times" content reads the same counter. */
export const LEDGER_ACCOUNT_DEATHS = 'account_deaths';

/** First disk save slot the character ROSTER may use (0/1/2 are account /
 *  run-character / settings). Lives here (not modes.ts) so deserialization can
 *  sanity-check entries without a value import back into the modes registry. */
export const ROSTER_SLOT_BASE = 10;

/** The display name of the account meta-currency (earned on death, spent in
 *  the Vault). ONE constant — every panel prints through it. The internal
 *  field stays `credits` (save compatibility); the WORLD calls it this. */
export const META_CURRENCY_LABEL = 'Mortal Essence';

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
  /** Current shape {rank, progress}; LEGACY saves held a flat count. */
  craftLore?: Record<string, number | { rank: number; progress: number }>;
}

export function makeAccount(): Account {
  return {
    credits: 0, lifetimeCredits: 0, level: 0,
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
    craftLore: {},
  };
}

export function serializeAccount(a: Account): AccountSave {
  return {
    schemaVersion: SCHEMA_VERSION,
    credits: a.credits, lifetimeCredits: a.lifetimeCredits, level: a.level,
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
/** Credits earned when a character dies, from how far the run got. */
export function creditsForDeath(charLevel: number, zonesExplored: number, kills: number): number {
  return Math.floor(kills * 1 + zonesExplored * 10 + charLevel * 2);
}
/** Account level from lifetime credits — an N²·50 milestone curve. */
export function accountLevelFor(lifetimeCredits: number): number {
  return Math.floor(Math.sqrt(Math.max(0, lifetimeCredits) / 50));
}
/** Award credits (spendable + lifetime) and recompute account level. */
export function applyCredits(a: Account, earned: number): void {
  a.credits += earned;
  a.lifetimeCredits += earned;
  a.level = accountLevelFor(a.lifetimeCredits);
}
