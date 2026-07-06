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

import { DEATH_SCHEMA, MAX_DEATH_RECORDS, type DeathRecord } from './death';
import { clampFrequency, DEFAULT_FREQUENCY, type FrequencyProfile } from '../packages/frequency';

export const SCHEMA_VERSION = 1;

/** Starter skills = the UNION of the three default classes' bars, so a default
 *  character can always re-drop its own kit. Verified ids from data/classes.ts. */
export const STARTER_SKILLS: readonly string[] = [
  'cleave', 'shield_up', 'war_cry',       // warrior
  'firebolt', 'frost_nova', 'shockfront', // magician
  'frenzy', 'cloak', 'shadow_step',       // rogue
];

/** Starter support gems (verified ids from data/supports.ts). */
export const STARTER_SUPPORTS: readonly string[] = [
  'arcing', 'splitting', 'piercing', 'concentrated', 'precision', 'slow_burn',
];

export const STARTER_CLASSES: readonly string[] = ['warrior', 'magician', 'rogue'];

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
} as const;

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
   *  character wipe so the next run can reclaim the lost gems. See meta/death.ts. */
  deaths: DeathRecord[];
  /** CRAFT LORE: affix-family → items salvaged carrying it. Crossing
   *  CRAFT_CFG.loreThresholds earns expertise ranks (craftability, then a
   *  rising roll ceiling). Knowledge survives every death — the material
   *  (essence) does not. */
  craftLore: Record<string, number>;
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
  craftLore?: Record<string, number>;
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
    craftLore: a.craftLore,
  };
}

/** null ⇒ schema mismatch; caller wipes + makeAccount(). Starters are always
 *  re-seeded so a partial/tampered save still boots playable. */
export function deserializeAccount(s: AccountSave): Account | null {
  if (!s || s.schemaVersion !== SCHEMA_VERSION) return null;
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
    ledger: s.ledger ?? {},
    frequencyProfile: clampFrequency(s.frequencyProfile),
    // Per-RECORD schema filter (drop malformed/stale corpses, cap the ring)
    // WITHOUT touching SCHEMA_VERSION — a death-format change never wipes credits.
    deaths: (s.deaths ?? []).filter(d => d?.schema === DEATH_SCHEMA).slice(-MAX_DEATH_RECORDS),
    craftLore: s.craftLore ?? {},
  };
}

/** How many classes are selectable at character select: the starter count, or
 *  the highest owned slot tier (whichever is greater). */
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
