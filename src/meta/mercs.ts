// ---------------------------------------------------------------------------
// MERCENARIES — hired blades and retired heroes, as data.
//
// Two supplies feed one market. BASELINE blades (data/mercenaries.ts) are
// authored archetype templates, synthesized fresh at hire. VETERANS are
// PLAYER-RETIRED characters: retiring at an outpost snapshots the character's
// BUILD onto the account roster (cap MERC_CFG.rosterCap; the 51st retirement
// replaces a random pooled veteran), ends the run like a death that pays the
// essence tithe — but counts as no death and leaves no corpse: the character
// has walked into the world's supply, to be met again at some future outpost.
//
// THE POWER CONTRACT (the anti-steamroll rule): a snapshot stores only the
// SHAPE of a build — class, gem choices and their sockets, bar layout, tree
// allocations, worn gear. Its POWER is normalized to the hiring character at
// engagement time (and re-normalized as they level): gem levels clamp to a
// level-budget curve, tree allocations trim to the passive points that level
// would have earned (breadth-first from the class start, so the trimmed build
// is always a legal connected sub-tree), gear above its level requirement
// stays in the bag. A retired level-90 titan hired by a level-5 wanderer
// fights like a level-5 version of that build — no more, no less — and the
// same curves scale a humble retiree UP for a high-level patron. Every curve
// is a knob here; smarter per-axis policies bolt on without touching the flow.
//
// An ENGAGED veteran is out of the pool (engagedBy = the patron's charId) and
// rides the patron's character save; any conclusion of that patron — death,
// forfeit, retirement, an Undying fall — releases them back to the pool. A
// veteran is never destroyed by play; only roster replacement retires the
// retiree for good.
// ---------------------------------------------------------------------------

import type { SkillInstance, SkillRarity } from '../engine/skills';
import type { ItemInstance } from '../engine/items';
import type { Attributes } from '../engine/stats';
import { PROGRESSION } from '../data/classes';
import type { VocationSiteFilter } from '../data/vocations';
import type { Account } from './account';

export const MERC_SCHEMA = 1;

/** A socketed support, captured by id+level (character.ts shape). */
export interface MercSavedSocket { supportId: string; level: number; }
export interface MercSavedSkill {
  skillId: string; level: number; rarity: SkillRarity;
  sockets: (MercSavedSocket | null)[];
}

/** The SHAPE of a character — build identity without run state. Deliberately
 *  CharacterSave-adjacent so the same registry-tolerant rebuild machinery
 *  serves both; power is never read from here raw (see the normalizer). */
export interface MercSnapshot {
  classId: string;
  /** Level at capture — flavor + the "veteran of level N" card line. */
  level: number;
  baseAttrs: Attributes;
  allocated: string[];
  /** Choice-node picks (data/passiveChoices.ts), keyed by node id. Optional →
   *  pre-choice rosters load unchanged; sanitized + budget-trimmed on field. */
  choices?: Record<string, string[]>;
  vocations?: string[];
  knownSkills: MercSavedSkill[];
  bar: (string | null)[];
  equipped?: Record<string, ItemInstance>;
}

/** One retired hero on the account roster. */
export interface MercRosterEntry {
  schema: number;
  mercId: string;
  /** Display name — the class name today; the Naming system will write here. */
  name: string;
  classId: string;
  retiredLevel: number;
  retiredAt: number;
  snapshot: MercSnapshot;
  /** charId currently fielding this veteran (absent/'' = in the pool). */
  engagedBy?: string;
}

/** Every knob of the mercenary market in one place — tune freely. */
export const MERC_CFG = {
  /** Veteran roster cap; retiring past it replaces a random POOLED veteran
   *  (engaged ones are out in the field and safe from replacement). */
  rosterCap: 50,

  /** OUTPOST seeding — generated wilds only, deterministic per zone + run
   *  seed (the vocation-site pattern; the filter is the same reusable shape).
   *  Chance sits LOWER since the harborhold pass: opened port towns are the
   *  surefire hiring surface now (template blades, no retirement), so wild
   *  outposts lean scarce — the places veterans muster and blades retire. */
  outpost: {
    chance: 0.08,
    filter: { minLevel: 2 } as VocationSiteFilter,
    /** Parley dwell: within radius, idle, zone objective done, no live enemy
     *  within enemyRadius, and no combat for calmSec. */
    radius: 130,
    dwellSec: 1.0,
    enemyRadius: 520,
    calmSec: 4,
  },

  /** The OFFER TABLE an outpost fields: offerMin..offerMax blades, with the
   *  veteran share growing with roster fill — an empty roster deals almost
   *  all baseline blades; a full one deals veterans in force. */
  offers: { min: 3, max: 5, retiredShareMin: 0.2, retiredShareMax: 0.6 },

  /** Hire pricing (Mortal Essence): base + perLevel × the patron's level;
   *  veterans of the wake carry a premium. Spending is open to every mode —
   *  a sealed Undying character can HIRE but never EARN, so its retainers
   *  are always fed by someone's mortal runs. */
  hireCostBase: 40,
  hireCostPerLevel: 6,
  retiredCostMult: 1.5,

  /** Retainers fielded at once (a future party of blades is this number). */
  maxHired: 1,

  /** POWER NORMALIZATION — every axis is a policy function of the target
   *  level; add axes or swap curves without touching the engagement flow. */
  scale: {
    /** What the merc's power anchors to. */
    anchor: 'charLevel' as 'charLevel' | 'zoneLevel',
    /** Re-normalize on every patron level-up (live parity, no merc XP). */
    trackLevel: true,
    /** Highest gem level the build fields at target level L. */
    gemLevelCap: (level: number): number => Math.max(1, Math.ceil(level / 5) + 1),
    /** Passive-tree allocation budget a level-L character would hold (the
     *  creation point + per-level earn; quest points deliberately excluded —
     *  "expected", not "maximal"). */
    passiveBudget: (level: number): number =>
      1 + Math.max(0, level - 1) * PROGRESSION.passivePointsPerLevel,
    /** Worn gear above its own level requirement sits out of the engagement. */
    respectGearLevelReq: true,
  },

  /** THE CO-OP LEVERS: does a hired blade count toward enemy party scaling,
   *  and may a living retainer dwell-revive its downed patron (the same
   *  revive rails a human ally uses)? */
  partyScale: false,
  mercsCanRevive: true,
} as const;

/** Mint a collision-proof mercenary id. */
export function mintMercId(): string {
  return 'm' + Date.now().toString(36) + Math.floor(Math.random() * 0xffffff).toString(36);
}

/** The veteran share of an offer sheet for this roster's fill fraction. */
export function retiredShare(a: Account): number {
  const fill = Math.min(1, a.mercRoster.length / Math.max(1, MERC_CFG.rosterCap));
  const { retiredShareMin, retiredShareMax } = MERC_CFG.offers;
  return retiredShareMin + (retiredShareMax - retiredShareMin) * fill;
}

/** Veterans currently in the pool (not fielded by any character). */
export function availableRetired(a: Account): MercRosterEntry[] {
  return a.mercRoster.filter(r => !r.engagedBy);
}

/** Retire a character onto the roster. Under the cap it's a push; at the cap
 *  a random POOLED veteran is replaced (an engaged one is out in the field —
 *  never silently vanished from under its patron). Returns the replaced
 *  veteran (for the farewell line) or null. */
export function addRetiredMerc(a: Account, entry: MercRosterEntry): MercRosterEntry | null {
  if (a.mercRoster.length < MERC_CFG.rosterCap) { a.mercRoster.push(entry); return null; }
  const pooled = a.mercRoster.map((r, i) => ({ r, i })).filter(x => !x.r.engagedBy);
  const pickFrom = pooled.length ? pooled : a.mercRoster.map((r, i) => ({ r, i }));
  const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  const replaced = a.mercRoster[pick.i];
  a.mercRoster[pick.i] = entry;
  return replaced;
}

/** Mark a veteran as fielded by a character. */
export function engageMerc(a: Account, mercId: string, charId: string): void {
  const r = a.mercRoster.find(x => x.mercId === mercId);
  if (r) r.engagedBy = charId;
}

/** Release every veteran fielded by this character back into the pool —
 *  called at every conclusion of a patron (death, forfeit, retirement, an
 *  Undying fall, vessel deletion). Returns how many were released. */
export function releaseMercsOf(a: Account, charId: string): number {
  if (!charId) return 0;
  let n = 0;
  for (const r of a.mercRoster) {
    if (r.engagedBy === charId) { delete r.engagedBy; n++; }
  }
  return n;
}

/** SELF-HEAL: release engagements whose patron no longer exists anywhere
 *  (a run save wiped without its death flow — e.g. an unresumable save was
 *  cleared at boot). liveCharIds = the run slot's charId + every roster
 *  vessel's. Called once at boot after the async loads settle. */
export function healMercEngagements(a: Account, liveCharIds: (string | undefined | null)[]): number {
  const live = new Set(liveCharIds.filter((c): c is string => !!c));
  let n = 0;
  for (const r of a.mercRoster) {
    if (r.engagedBy && !live.has(r.engagedBy)) { delete r.engagedBy; n++; }
  }
  return n;
}

/** Pack a live build into a snapshot (the retirement capture). Kept here —
 *  beside the shape it produces — and shape-compatible with character.ts. */
export function snapshotBuild(
  classId: string,
  baseAttrs: Attributes,
  allocated: Iterable<string>,
  choices: Record<string, string[]>,
  vocations: string[],
  knownSkills: Iterable<SkillInstance>,
  bar: (string | null)[],
  equipped: Partial<Record<string, ItemInstance>>,
  level: number,
): MercSnapshot {
  const skills: MercSavedSkill[] = [];
  for (const inst of knownSkills) {
    skills.push({
      skillId: inst.def.id, level: inst.level, rarity: inst.rarity ?? 'common',
      sockets: inst.sockets.map(s => s ? { supportId: s.def.id, level: s.level } : null),
    });
  }
  return {
    classId,
    level,
    baseAttrs: { ...baseAttrs },
    allocated: [...allocated],
    choices: Object.fromEntries(Object.entries(choices).map(([k, v]) => [k, [...v]])),
    vocations: [...vocations],
    knownSkills: skills,
    bar: [...bar],
    equipped: Object.fromEntries(
      Object.entries(equipped).flatMap(([k, v]) => (v ? [[k, { ...v }] as const] : [])),
    ),
  };
}
