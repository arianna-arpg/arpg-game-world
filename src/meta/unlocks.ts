// ---------------------------------------------------------------------------
// UNLOCK CATALOG — the spendable meta-progression, as data.
//
// Each entry is one thing the player can buy with account credits: a class
// slot, a CLASS BUNDLE (class + its thematic gems, one purchase), a bundle of
// gems that may then drop, or a town FEATURE flag. Adding a new unlock is one
// entry here. Modelled as a discriminated union on `kind` so the apply/own
// switches narrow `payload` with no casts under strict mode.
//
// Two laws this file also owns:
//   THE MOOT LAW (UnlockBase.reqClasses) — a purchase whose worth depends on
//   the class pool's depth (slot tiers) hides until the pool can fill it: no
//   dead purchases, ever.
//   THE OBJECTIVE WEB (ClassBundleDef.unlock) — a class is never BOUGHT. It
//   is EARNED: a shrouded card carrying prose and OBJECTIVES — counted gatework avenues,
//   any-of — and the world CLAIMS it for the account the moment one holds
//   (settleClassUnlocks: mid-run sweep, the Vault, the deal, the run's end).
//   Each objective stays runes until CLASS_WEB_CFG.revealFrac along. Prose
//   reveals with the best avenue; earned cards wait for a free acknowledgement.
//   THE MASTERY LADDER (data/classTiers.ts) — what Mortal Essence buys
//   instead: per class, Novice/Adept/Expert/Master rungs at class level
//   10/30/60/100, in sequence, each an ALTERNATE OPENING (ClassDef.kit).
//   Probe: balance/probe_unlocks.ts proves the web reachable + the laws
//   honest; balance/probe_classmastery.ts the ladder, the kit, the runes.
// ---------------------------------------------------------------------------

import { BRANDT_CFG } from '../data/brandt';
import { RELIQUARY_CFG } from '../data/reliquary';
import { RELIC_STASH } from '../data/stashes';
import { stashPageCost } from '../engine/stash';
import { reliquaryCost, reliquaryPower, investReliquary, investRelicStash } from './reliquary';
import { CLASS_DEEDS, discoveryCount } from '../data/classdeeds';
import { MEMORY_UNLOCK_CFG, MEMORY_UNLOCKS } from '../data/memoryUnlocks';
import { grantMemoryUnlock, memoryCatalog, memoryCommissionReady, memoryProgressionOpen, memoryUnlockCandidates, memoryUnlockDef } from './memoryUnlocks';
import { powerProgressionRefusal } from '../data/powerProgression';
import { encipher, revealScript } from '../data/runescript';
import {
  FEATURE, LEDGER_ACCOUNT_DEATHS, LEDGER_CORPSES_RECLAIMED,
  LEDGER_FLASK_LESSON, LEDGER_LEGENDARY_SKILL_DROP,
  LEDGER_VENDOR_BOUGHT, LEDGER_ZONES_EXPLORED, STARTER_CLASSES, STARTER_SKILLS, isClassUnlocked, bossSlainKey,
  classLevelLedgerKey, reachedLevelKey, unlockedClassCount, type Account,
} from './account';
import {
  gateClassLevelNeeds, gateLevelNeeds, gateMet, gateRowLabel, gateRowMet, gateRowProgress,
  type GateRow,
} from './gates';
import { CLASS_TIERS, CLASS_WEB_CFG, classTierId } from '../data/classTiers';
import { BOUNTY_BOARD_CFG } from '../data/bountyboard';
import { VENDOR_CFG } from '../data/vendors';
import { ORACLE_RESCUED } from '../data/oracle';
import { SCALD_KIT_UNLOCK_LEDGERS } from '../data/scaldkit';
// THE CONTAINER FABRIC (engine/containers.ts): the side boards' ladders —
// every rung's Vault row is DERIVED below (containerUnlocks), never listed.
import { CONTAINER_DEFS } from '../data/containers';
// Pure fabric leaves (no engine cycle): the HARD-LESSON ledger keys the
// discovery web reads — seized by a grip, sprung a trap with your own feet.
import { LEDGER_SEIZED } from '../engine/grab';
import { LEDGER_TRAP_SPRUNG } from '../engine/trapworks';
import { LEDGER_MERC_MARKET_MET } from './mercs';
import { IMMORTAL_CFG } from './modes';
import { CLASSES, kitRungs } from '../data/classes';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { bestiaryKey } from '../data/bestiary';
import { PACKAGES, PACKAGE_BY_ID, unlockMet } from '../packages/registry';

/** Fields every unlock shares. `requiresUnlock` is the GENERIC sequencing
 *  gate: the entry stays hidden until the named catalog unlock(s) are OWNED —
 *  ladders (class slots, feature chains) are authored as data, never as
 *  account-level walls. Catalog ids only (package tiers have their own
 *  stagger inside isUnlockVisible). */
interface UnlockBase {
  id: string;
  label: string;
  description: string;
  cost: number;
  /** Minimum ACCOUNT level. Prefer `requiresUnlock` sequencing for ladders —
   *  reserve this for genuine lifetime-milestone rewards. */
  reqLevel?: number;
  /** Other unlock id(s) that must be OWNED before this one surfaces (ANDed). */
  requiresUnlock?: string | string[];
  /** Lifetime-ledger milestone key(s) that must be PRESENT (≥1, ANDed) —
   *  e.g. reached_level_40 + unmade_slain. Generic to every unlock kind. */
  reqLedger?: string | string[];
  /** Lifetime-ledger COUNT thresholds (ANDed): each key must have accrued at
   *  least its value. The presence form above is sugar for `{key: 1}`; this is
   *  for genuine tallies — the Immortal covenant's "die 20 times". */
  reqLedgerCounts?: Record<string, number>;
  /** Minimum size of the account's unlocked-class POOL (starters included).
   *  THE MOOT LAW: a purchase whose value depends on pool depth (a class
   *  SLOT is a hand size — a hand wider than the pool deals nothing) stays
   *  HIDDEN until the pool can actually fill it. Slot tiers author this at
   *  their own slot count; any future pool-fed purchase reuses the gate. */
  reqClasses?: number;
  /** THE GATEWORK (meta/gates.ts): an ANY-OF avenue group — ONE held row
   *  satisfies the whole group (ANDed with every other gate on this entry).
   *  The family law: a ladder rung may open along several independent roads
   *  (reach a level / finish a vocation / turn in a quest), crossed in the
   *  player's own order. `level` avenues automatically join the XP sweep's
   *  milestone stamps via CATALOG_LEVEL_MILESTONES — authoring one here IS
   *  registering its signal. */
  reqAnyOf?: readonly GateRow[];
  /** Surface as a SEALED card once the entry's STRUCTURAL prereqs hold
   *  (requiresUnlock chain + requiresFeature owned) while its dynamic gates
   *  (reqAnyOf / reqLedger / reqLedgerCounts / reqLevel / reqClasses) do
   *  not: visible, named, priced, unbuyable, its unmet avenues printed —
   *  the player SEES the next rung and what roads open it. Default off:
   *  everything else keeps the discovery web's hidden-until-met law. */
  tease?: boolean;
  /** Earned through gameplay, never investment. After the automatic grant,
   *  a free Vault button acknowledges the persistent pending reward. */
  earned?: boolean;
  /** Surface the service only when at least one Memory is eligible. */
  requiresMemoryCommission?: boolean;
}

export type Unlockable =
  | (UnlockBase & { kind: 'power' | 'storage'; payload: { rank: number } })
  | (UnlockBase & { kind: 'slot'; payload: { slotCount: number } })
  | (UnlockBase & { kind: 'class'; payload: { classId: string; skillIds: string[]; supportIds: string[];
      /** Detailed deed instructions; visible only after the objectives reveal. */
      hint?: string;
      /** Identity flavor only: no class name, skill names, or deed instructions. */
      rumor?: string } })
  // THE MASTERY LADDER (data/classTiers.ts): one rung of one class — owned
  // by id (Account.unlockedClassTiers); its skills join the drop pool.
  | (UnlockBase & { kind: 'classtier'; payload: { classId: string; tierId: string; skillIds: string[] } })
  | (UnlockBase & { kind: 'skill'; payload: { skillIds: string[] } })
  | (UnlockBase & { kind: 'support'; payload: { supportIds: string[] } })
  | (UnlockBase & { kind: 'memory'; payload: { memoryUnlockId: string } })
  | (UnlockBase & { kind: 'feature'; requiresFeature?: string; payload: { flag: string } })
  | (UnlockBase & { kind: 'package'; payload: { packageId: string; tierId?: string } })
  // THE SKILL GRAFT — the REPEATABLE charge (never owned): buying arms
  // Account.skillGraft for the NEXT run's start, where the player picks one
  // unlocked skill to ride the class kit at its plainest cut; the run's
  // beginning consumes the charge and the entry returns to the shelf.
  | (UnlockBase & { kind: 'graft'; payload: Record<string, never> })
  // THE RESURRECTION COVENANT (meta/modes.ts onDeath 'fall'): one DYNAMIC
  // entry per FALLEN roster vessel — never owned (the graft's lifecycle:
  // completion is a state change elsewhere), priced at the fee FROZEN on
  // the card at the fall, poured full across any number of reckonings
  // through the standing investment lane; the grant clears the card's
  // fallen stamp and the entry leaves the shelf with it.
  | (UnlockBase & { kind: 'resurrect'; payload: { charId: string } });

/** Class SLOTS, data-driven and ordered ascending — the HAND SIZE at character
 *  select (the hand itself is dealt at random from the account's UNLOCKED
 *  classes; class bundles below deepen that pool). Bought STRICTLY IN
 *  SEQUENCE: each tier requires the previous tier owned and nothing else — no
 *  account-level gate of any kind. Trivially extended — works the same for 12
 *  or 40 classes. Costs are pure data; tune freely. */
export const SLOT_TIERS: readonly { id: string; slots: number; cost: number }[] = [
  { id: 'slot_tier_4',  slots: 4,  cost: 40 },
  { id: 'slot_tier_5',  slots: 5,  cost: 80 },
  { id: 'slot_tier_6',  slots: 6,  cost: 130 },
  { id: 'slot_tier_7',  slots: 7,  cost: 200 },
  { id: 'slot_tier_8',  slots: 8,  cost: 300 },
  { id: 'slot_tier_9',  slots: 9,  cost: 420 },
  { id: 'slot_tier_10', slots: 10, cost: 560 },
  { id: 'slot_tier_11', slots: 11, cost: 720 },
  { id: 'slot_tier_12', slots: 12, cost: 900 },
];

/** The ladder's TOP — the widest hand the Vault can sell, derived from the
 *  tier data (never restated as a literal). Class select reads it to stop
 *  teasing "buy more slots" once no such purchase exists: at the cap, the
 *  beyond-hand pool simply waits for the next deal. */
export function maxSlotCount(): number {
  return SLOT_TIERS.reduce((m, t) => Math.max(m, t.slots), 0);
}

/** CLASS BUNDLES — one purchase, several unlocks that grow together:
 *    1. the class joins the RANDOM ROLL at character select (the pool the
 *       slot-sized hand is dealt from),
 *    2. its base bar and authored supports join the DROP pool (which also makes
 *       the class's own kit re-droppable — bar gems are granted on pick, but
 *       only unlocked gems can be found again),
 *    3. and, downstream for free, realizing the class in a run opens its home
 *       VOCATION chain after the account milestone (vocations key off the character's
 *       class — no extra wiring here).
 *  Adding a class to the game = one ClassDef + one entry here (plus,
 *  its `unlock` row — see THE OBJECTIVE WEB above; every non-starter
 *  authors one). Gem-name lists in the
 *  Vault card are generated from the live registries, so renames never
 *  go stale. Starter classes (account.ts STARTER_CLASSES) need no bundle. */
/** THE OBJECTIVE WEB — how a class is EARNED.
 *
 *  "If someone doesn't know what they're looking for, they have to find
 *  what they're looking for first." Every non-starter class hangs in the
 *  Vault once its structural prerequisites stand as a SHROUDED card: its name and body written
 *  in the vestiges' runes (data/runescript.ts — a shared lore alphabet), and beneath them its
 *  OBJECTIVES — an ANY-OF group of gatework avenues (meta/gates.ts), the
 *  counted forms welcome. Each objective is runes until it
 *  stands CLASS_WEB_CFG.revealFrac along; then it reads plain, with
 *  progress. Complete any one and the WORLD claims the class for the
 *  account (settleClassUnlocks) — no coin ever changes hands for a class.
 *
 *    objectives — GateRow[] of gameplay deeds. Any one earns the class.
 *    chain      — parent ownership opens this branch of the rumor wall.
 *                 No implicit level requirement: each branch authors deeds.
 *    town       — town introductions can precede an early discovery wave;
 *                 progress earned before the introduction is retained.
 *    hint       — detailed instructions, gated behind objective readability.
 *
 *  The spec COMPILES onto the same generic gates every unlock rides
 *  (reqAnyOf / requiresUnlock) + the earned law; the gate engine grew no
 *  class-shaped switch. Objectives read live off the account ledger (and,
 *  mid-run, the merged view), so they survive every death by construction
 *  — and balance/probe_unlocks.ts walks the whole web each run to prove
 *  every class stays REACHABLE from the starters. */
export interface ClassUnlockSpec {
  /** THE OBJECTIVES — any ONE held claims the class. */
  objectives?: readonly GateRow[];
  /** THE CHAIN — parent class id(s): ownership opens the branch; explicit deeds earn it. */
  chain?: string | string[];
  /** Town introductions preceding this discovery wave; catalog ids, ANDed.
   * Deeds still accumulate beforehand. Existing field discoveries keep their
   * rare early surprises; these natural habits wait until town is established. */
  town?: readonly string[];
  /** Detailed instructions, withheld until all objective rows are readable. */
  hint: string;
}

export interface ClassBundleDef {
  classId: string;
  /** Gradually revealed discovery prose, separate from the full kit and deed details. */
  rumor: string;
  /** Flavor lead-in; the mechanical tail of the description is generated. */
  blurb: string;
  skillIds: string[];
  supportIds?: string[];
  /** THE OBJECTIVE WEB row (see above) — every non-starter authors one. */
  unlock: ClassUnlockSpec;
}

const CLASS_DISCOVERIES: readonly Omit<ClassBundleDef, 'skillIds'>[] = [
  // First natural discoveries: the board and quartermaster arrive before
  // these habits become new starting choices. No death-count or run wall.
  { classId: 'spellblade',
    rumor: 'A familiar blade begins to carry a stranger kind of light.',
    blurb: 'Steel carries the storm: strike, lash with fire, then slip through a mirage.',
    supportIds: ['static_charge', 'slow_burn'],
    unlock: { town: ['feat_bounty_board', 'feat_quest_giver'], ...CLASS_DEEDS.spellblade } },
  { classId: 'cryomancer',
    rumor: 'The cold lingers where you pass, patient enough to hold the world still.',
    blurb: 'Winter as control: piercing frost prepares a freeze, and ice covers the retreat.',
    supportIds: ['biting_cold', 'chill_chance'],
    unlock: { town: ['feat_bounty_board', 'feat_quest_giver'], ...CLASS_DEEDS.cryomancer } },
  { classId: 'apothecary',
    rumor: 'Hands that have learned to mend begin to understand the other use of a dose.',
    blurb: 'Poison and remedy: stack venom, seed spores, and cleanse wounds while the dose works.',
    supportIds: ['envenomed_tips', 'poison_chance'],
    unlock: { town: ['feat_bounty_board', 'feat_quest_giver'], ...CLASS_DEEDS.apothecary } },
  // --- THE BLOOD LINE: the Warrior is the Strength branch — its road opens
  // the STR kin first, then the Prowess and Fortitude anchors; each anchor,
  // owned and lived in, opens its own deeper kin.
  { classId: 'berserker',
    rumor: 'Blood runs hot, and every swing carries the fury of the last.',
    blurb: 'Fury as a fighting style: heavy blows, whirling steel, and a sudden dash.',
    unlock: { ...CLASS_DEEDS.berserker } },
  // --- THE MIND LINE: the Magician is the Intelligence branch — played deep,
  // it opens its own INT kin first, then the doors into its constituent
  // Wisdom and Willpower schools; those chain onward by OWNERSHIP.
  { classId: 'sorcerer',
    rumor: 'A restless mind bends the forces of the world into ruin.',
    blurb: 'The scholar of annihilation steps forward, frost ward in hand.',
    supportIds: ['spark_discipline'],
    unlock: { ...CLASS_DEEDS.sorcerer } },
  // --- THE SHADOW LINE: the Rogue is the Dexterity branch — its road forks
  // into the ranged and dueling crafts first, the darker and louder arts
  // after; the field disciplines chain by ownership.
  { classId: 'ranger',
    rumor: 'A distant figure watches the wind and waits for a clear shot.',
    blurb: 'Death from afar, and the field disciplines that perfect the shot.',
    supportIds: ['perfect_draw', 'wandering_mark'],
    unlock: { ...CLASS_DEEDS.ranger } },
  { classId: 'guardian',
    rumor: 'Behind an unyielding shield, the weary find room to breathe.',
    blurb: 'The unmoved wall: a judgment hammer, a sheltering ward, and a rallying howl.',
    supportIds: ['stoneblood_conduit', 'bulwarks_tithe', 'warding_flesh'],
    unlock: { ...CLASS_DEEDS.guardian } },
  { classId: 'summoner',
    rumor: 'An unseen bond joins two wills, and neither fights alone.',
    blurb: 'The arcanist: consuming bolts, one bonded familiar, and essence drawn from the foe.',
    supportIds: ['soul_tether', 'vital_bond', 'resonance'],
    unlock: { chain: 'necromancer', ...CLASS_DEEDS.summoner } },
  { classId: 'swashbuckler',
    rumor: 'Steel flashes with a flourish; danger is another partner in the dance.',
    blurb: 'The duelist moves between surgical cuts, rushing strikes, and the buckler.',
    supportIds: ['momentum'],
    unlock: { ...CLASS_DEEDS.swashbuckler } },
  { classId: 'juggernaut',
    rumor: 'A heavy tread carries on through the blows that would halt another.',
    blurb: 'It hits, it takes hits, and it does not stop.',
    supportIds: ['kindled_wake', 'victors_tempo', 'abundant_harvest'],
    unlock: { chain: 'guardian', ...CLASS_DEEDS.juggernaut } },
  { classId: 'pyromancer',
    rumor: 'An ember rests in an open palm, hungry for the world beyond it.',
    blurb: 'Everything burns eventually; these are the words for "now".',
    unlock: { ...CLASS_DEEDS.pyromancer } },
  { classId: 'assassin',
    rumor: 'A quiet shadow closes the distance, leaving no time for an answer.',
    blurb: 'The quiet trade: open the wound, finish it, and disappear.',
    supportIds: ['exposure', 'bristling_riposte'],
    unlock: { ...CLASS_DEEDS.assassin } },
  { classId: 'necromancer',
    rumor: 'Among the still and buried, a patient voice gathers company.',
    blurb: 'Death as a resource: poison, risen bodies, and despair.',
    supportIds: ['mana_feeder', 'enduring_bond', 'septic_bargain'],
    // HER OBJECTIVES (2026-09-05): the corpse run's own class — reclaim
    // enough of what death took from you, OR put enough of the risen back
    // down. Both counted, both ACCOUNT-DIRECT stamps (account.ts).
    unlock: { objectives: [
      { ledger: LEDGER_CORPSES_RECLAIMED, n: discoveryCount(20), label: `reclaim ${discoveryCount(20)} of your own corpses` },
      { ledger: bossSlainKey('undead'), n: discoveryCount(5), label: `slay ${discoveryCount(5)} bosses of the undead` },
    ],
      hint: 'Every corpse you leave on the field is a lesson someone can read. Read enough of your own, or put enough of the risen back down, and the lesson turns.' } },
  { classId: 'tamer',
    rumor: 'Wild eyes meet a steady gaze, and something like trust takes root.',
    blurb: 'The wild answers a steady gaze: stalk in unannounced, hold the claim, and fight beside the bond that downs but never dies.',
    supportIds: ['alphas_bond', 'pack_instinct', 'reciprocal_bond'],
    // A HARD LESSON, not a syllabus: Crowned beasts roam the base wilds
    // (killHandlers stamps the same key the Warbands package reads).
    unlock: { objectives: [{ ledger: 'crowned_killed', label: 'put down a Crowned beast' }],
      hint: 'Every pack answers to a crown. Put one down, and you will know the bond can be claimed.' } },
  { classId: 'cleric',
    rumor: 'Gentle hands carry a light that can shelter or sear.',
    blurb: 'A sanctified strike, a mending hand, and consecrated ground.',
    supportIds: ['intensive_care', 'mending_chain', 'overmend'],
    unlock: { ...CLASS_DEEDS.cleric } },

  // --- The parity twelve (every star point now anchors three classes) -------
  { classId: 'breaker',
    rumor: 'A great weight falls, and the surest footing gives way.',
    blurb: 'Break the stance, quake the ground, and pass the verdict.',
    supportIds: ['concussive_blows'],
    unlock: { ...CLASS_DEEDS.breaker } },
  { classId: 'vanguard',
    rumor: 'At the front of the line, a moving shield makes room for those behind.',
    blurb: 'First through the gap, shield still moving: the charges, thrusts, and leaps of the advancing line.',
    supportIds: ['phalanx'],
    unlock: { ...CLASS_DEEDS.vanguard } },
  { classId: 'blademaster',
    rumor: 'A waiting blade holds a thousand motions in a moment of stillness.',
    blurb: 'The sword as a sentence: a drawn cut, its echo, and the answering riposte.',
    supportIds: ['building_rhythm'],
    unlock: { chain: 'berserker', ...CLASS_DEEDS.blademaster } },
  { classId: 'brawler',
    rumor: 'Scarred knuckles and a close embrace settle what words cannot.',
    blurb: 'No blade, no apology: the pit\'s arithmetic, plus the carving rhythms that keep the fists warm.',
    supportIds: ['echoing_might'],
    // THE user-named exemplar of learn-by-getting-wrecked: the grip kin
    // (wranglers, yoke-maulers, gulpers, planted maws) teach with their
    // hands — world.ts grabSeize stamps LEDGER_SEIZED when one catches YOU.
    unlock: { objectives: [{ ledger: LEDGER_SEIZED, label: 'be seized by a grip, and live' }],
      hint: 'Something out there will put its hands on you. Survive it, and you will know what hands are for.' } },
  { classId: 'sentinel',
    rumor: 'An iron watch endures; every reckless blow finds an answer.',
    blurb: 'Hitting it is the mistake: spikes, quills, bells, and every other way a wall bills its visitors.',
    supportIds: ['answering_steel'],
    unlock: { chain: 'guardian', ...CLASS_DEEDS.sentinel } },
  { classId: 'lancer',
    rumor: 'Long shafts cross the field, each wound a thread waiting to be drawn.',
    blurb: 'Steel left in every wound, pinning the quarry, then called home through the crowd.',
    supportIds: ['skewering_blows', 'tripwire_web'],
    unlock: { chain: 'ranger', ...CLASS_DEEDS.lancer } },
  { classId: 'trapper',
    rumor: 'Careful hands prepare the ground, then leave it waiting in silence.',
    blurb: 'The battlefield as a workshop: snares, mines, sentries, and the patience to let the ground do the arguing.',
    supportIds: ['tripwire', 'enduring_snares', 'overwound_mechanism'],
    // Learn-by-getting-wrecked, the field-craft edition: spring any
    // trapwork with your own feet (world.ts springTrapwork stamps it) —
    // the sunken ruins' toothed halls and the highland's boulder plates
    // are the world's own tutors.
    unlock: { objectives: [{ ledger: LEDGER_TRAP_SPRUNG, label: 'spring a trap with your own feet, and live' }],
      hint: 'The floor clicks before it kills. Step wrong once, and live, and the workshop is yours.' } },
  { classId: 'warlord',
    rumor: 'A banner rises, and scattered hearts begin to beat as one.',
    blurb: 'Presence as mechanics: the first Charisma class, with the horns, standards, and blessings of command.',
    supportIds: ['provocation', 'clamor'],
    // The war-camps' own lesson (killHandlers stamps warlords_killed —
    // the same key that unlocks Demon Invasions): kill command, learn it.
    unlock: { objectives: [{ ledger: 'warlords_killed', label: 'kill a warband\'s warlord' }],
      hint: 'Kill a thing that commands, and its voice goes looking for a new throat.' } },
  { classId: 'skald',
    rumor: 'A voice carries over the clash of steel, giving the battle its rhythm.',
    blurb: 'The battle keeps time: a war chant, dissonance, and a closing coda.',
    supportIds: ['held_note', 'countermelody'],
    unlock: { chain: 'warlord', ...CLASS_DEEDS.skald } },
  { classId: 'beguiler',
    rumor: 'A familiar face turns away; its shadow takes a different path.',
    blurb: 'Never be where the blow lands: doubles, decoys, quiet steps, and one whispered madness.',
    supportIds: ['synchronicity', 'vessel_of_shadow'],
    unlock: { ...CLASS_DEEDS.beguiler } },
  { classId: 'chronomancer',
    rumor: 'Between one heartbeat and the next, a patient hand finds room to move.',
    blurb: 'Time as a resource everyone else spends carelessly, up to and including stopping it outright.',
    supportIds: ['lingering_moment', 'borrowed_haste'],
    // The Chronophage's spoils (quests/defs.ts stamps unmade_slain — the
    // same key the far Caravan tiers read): time-craft is TAKEN, not taught.
    unlock: { objectives: [{ ledger: 'unmade_slain', label: 'slay the Chronophage' }],
      hint: 'The thing that eats time can die. What spills out can be studied.' } },
  { classId: 'ascetic',
    rumor: 'A measured breath settles the body, and stillness gathers strength.',
    blurb: 'Stillness pays cash: the practiced palm, the rooted stances, and the long breath between.',
    supportIds: ['colossus_stance', 'stillwater_discipline'],
    unlock: { chain: 'cleric', ...CLASS_DEEDS.ascetic } },

  // --- Beyond the parity twelve: wisdom's fourth door -------------------------
  // THE HIVECALLER — the swarm-shepherd (the throng fabric's own class).
  // Discovered the way a hive changes hands: kill a brood-queen
  // (killHandlers.ts broodmothers_slain — broodmothers roam the wilds and
  // crown the chitin country) and the humming does not stop; it waits.
  { classId: 'hivecaller',
    rumor: 'Countless small wings stir together, listening for a single will.',
    blurb: 'The swarm is the weapon: a living brood, a veil of biting motes, and one pointed command.',
    supportIds: ['broodclutch', 'vicious_brood', 'hiveborn'],
    unlock: { objectives: [{ ledger: 'broodmothers_slain', label: 'kill a mother of broods' }],
      hint: 'Kill a mother of broods and listen: the humming does not stop. It waits to be told where to go.' } },

  // --- THE PARITY EIGHT (class pass round two): every star point's fourth
  // door. Gate textures deliberately span the whole discovery vocabulary —
  // ownership branches, combat deeds, world facts, and
  // the debut of the COUNTED lever (the Flagellant is discovered by DYING).
  { classId: 'wallwright',
    rumor: 'Stone rises at a gesture; shelter and ruin share the same hands.',
    blurb: 'Architecture, weaponized: raise the rampart, breach through it, and swing the demolition arc that unbuilds whatever argues back.',
    unlock: { chain: 'breaker', ...CLASS_DEEDS.wallwright } },
  { classId: 'matador',
    rumor: 'A bright flourish invites the rush, then slips beyond its reach.',
    blurb: 'The duel as theatre: bait the charge, pass through the horns, schedule the third act.',
    unlock: { chain: 'brawler', ...CLASS_DEEDS.matador } },
  { classId: 'flagellant',
    rumor: 'Beneath old scars, a solemn promise draws strength from suffering.',
    blurb: 'Pain, notarized: a covenant that feeds on its keeper and repays exactly when the flesh runs short.',
    // THE COUNTED DISCOVERY (ledgerCounts debut): the account's own deaths
    // are the syllabus — the same lifetime counter the Immortal reads.
    unlock: { objectives: [{ ledger: LEDGER_ACCOUNT_DEATHS, n: discoveryCount(8), label: `die ${discoveryCount(8)} times` }],
      hint: 'You have died enough times to notice: something in you keeps the receipts. An order exists that balances them.' } },
  { classId: 'falconer',
    rumor: 'A circling shape folds its wings, guided by the hand below.',
    blurb: 'The mark has wings and an opinion: one huntress, loosed to latch and hold the quarry open.',
    unlock: { chain: 'tamer', ...CLASS_DEEDS.falconer } },
  { classId: 'sharper',
    rumor: 'A hidden card changes hands; fortune seems to favor the prepared.',
    blurb: 'Probability owes money: every suit rides every throw, the odds arrive pre-palmed, and nobody can prove anything.',
    unlock: { chain: 'swashbuckler', ...CLASS_DEEDS.sharper } },
  { classId: 'firebrand',
    rumor: 'A whisper passes through the crowd, and unease becomes an uproar.',
    blurb: 'The riot, delivered as a speech: the crowd does the fighting, and you were provably elsewhere.',
    unlock: { chain: 'beguiler', ...CLASS_DEEDS.firebrand } },
  { classId: 'runeweaver',
    rumor: 'Patient fingers arrange old signs until their separate voices join.',
    blurb: 'Spells are sentences, runes are the words, patience is the grammar: the invocation bank made a calling.',
    unlock: { ...CLASS_DEEDS.runeweaver } },
  { classId: 'resonator',
    rumor: 'A clear note lingers in the air, waiting for the chord that follows.',
    blurb: 'Everything rings if struck sincerely: leave the body humming a bright tone, then play the chord fortissimo.',
    // The starfall lattices already sing when broken (killHandlers stamps
    // fallen_stars_broken) — whoever shattered one has heard the tone.
    unlock: { objectives: [{ ledger: 'fallen_stars_broken', label: 'break a fallen star' }],
      hint: 'Break a fallen star and listen to the lattice go: everything, struck sincerely, will tell you its note.' } },
];

/** Class discovery follows the actual base bar. Mastery alternates and the wider
 * school remain independent discoveries; support gifts stay explicitly authored. */
export const CLASS_BUNDLES: readonly ClassBundleDef[] = CLASS_DISCOVERIES.map(b => ({
  ...b, skillIds: [...new Set(CLASSES.find(c => c.id === b.classId)?.bar.filter((id): id is string => id !== null) ?? [])],
}));

const gemNames = (ids: readonly string[], reg: Record<string, { name: string }>): string =>
  ids.map(i => reg[i]?.name ?? i).join(', ');

/** The catalog id a class bundle wears — ONE spelling for the discovery
 *  web's ownership chains, classUnlockFor, and the entry itself. */
export const classBundleId = (classId: string): string => `class_${classId}`;

function classBundleEntry(b: ClassBundleDef): Unlockable {
  const cls = CLASSES.find(c => c.id === b.classId);
  const name = cls?.name ?? b.classId;
  const sups = b.supportIds ?? [];
  // Deeds compile to ordinary gates. Chains control visibility/ownership;
  // class-level requirements are reserved for the mastery ladder below.
  const spec = b.unlock;
  const chain = spec.chain === undefined ? [] : Array.isArray(spec.chain) ? spec.chain : [spec.chain];
  const doors = [...chain.map(classBundleId), ...(spec.town ?? [])];
  const objectives: GateRow[] = [
    ...(spec.objectives ?? []),
  ];
  return {
    id: classBundleId(b.classId), kind: 'class', cost: 0, earned: true,
    reqAnyOf: objectives,
    ...(doors.length ? { requiresUnlock: doors } : {}),
    label: `Class: ${name}`,
    description: `${b.blurb} Unlock in the Vault to enter the class selection pool.`
      + ` Added to the drop pool: ${gemNames(b.skillIds, SKILLS)}`
      + (sups.length ? ` · supports: ${gemNames(sups, SUPPORTS)}` : '') + '.',
    payload: { classId: b.classId, skillIds: [...b.skillIds], supportIds: [...sups], hint: spec.hint, rumor: b.rumor },
  };
}

/** THE MASTERY LADDER's catalog rows: one per (class × rung) where the class
 *  authors a kit row for that rung — nothing moot ever surfaces. Sequenced
 *  strictly (each rung requires the previous rung THAT EXISTS for the
 *  class) behind the class itself (non-starters: the earned bundle), and
 *  unveiled by the rung's class level (a classLevel avenue — the milestone
 *  derivation registers its stamp). Hidden until investable: no tease. */
function classTierEntries(): Unlockable[] {
  const out: Unlockable[] = [];
  for (const c of CLASSES) {
    const rows = kitRungs(c);
    if (!rows.length) continue;
    let prevId: string | undefined;
    for (const t of CLASS_TIERS) {
      const gifts = rows.filter(r => r.tier === t.id);
      if (!gifts.length) continue;
      const requires = [
        ...(STARTER_CLASSES.includes(c.id) ? [] : [classBundleId(c.id)]),
        ...(prevId ? [prevId] : []),
      ];
      const id = classTierId(c.id, t.id);
      const gift = (g: { skill: string; replaces?: string }): string => g.replaces
        ? `${SKILLS[g.skill]?.name ?? g.skill} may stand in for ${SKILLS[g.replaces]?.name ?? g.replaces}`
        : `${SKILLS[g.skill]?.name ?? g.skill} stands on the bar from the first breath`;
      out.push({
        id, kind: 'classtier', cost: t.cost,
        ...(requires.length ? { requiresUnlock: requires } : {}),
        reqAnyOf: [{ classLevel: { classId: c.id, level: t.level } }],
        label: `${t.label} ${c.name}`,
        description: `Mastery of the ${c.name}, rung ${t.label} (a ${c.name} of level ${t.level} has walked this far).`
          + ` An ALTERNATE OPENING for every ${c.name} you wake after, chosen on the class card: ${gifts.map(gift).join('; ')}.`
          + ` ${gifts.length === 1 ? 'The gem joins' : 'The gems join'} the drop pool.`,
        payload: { classId: c.id, tierId: t.id, skillIds: gifts.map(g => g.skill) },
      });
      prevId = id;
    }
  }
  return out;
}

/** The Skill Graft's per-charge price (data beside its entry; retune freely). */
export const SKILL_GRAFT_COST = 120;

export const UNLOCK_CATALOG: Unlockable[] = [
  // --- THE BOUNTY BOARD — THE FIRST WRIT (docs/design/bounty-first-writ.md
  //     W0, her ruling): the account's FIRST door, seated at the catalog's
  //     head and priced at ZERO — the board is the faucet that funds the
  //     whole town ladder (its essence pay buys the Salvage Station, the
  //     station opens Brandt through the Trade Gate), so the first Vault
  //     visit teaches the store by claiming it. Ungated by design: THE
  //     DEATH LESSON (ui/panels.ts vault render) glows this row while it
  //     stands unowned — ownership IS the lesson's graduation. Generated,
  //     player-SELECTED postings on a beat: take one in hand, meet its ask
  //     out in the world, and turn it in back at the board for the printed
  //     pay (docs/design/bounty-board.md). ---------------------------------
  { id: 'feat_bounty_board', kind: 'feature', cost: 0, reqLevel: 0,
    label: 'Bounty Board: Town',
    description: 'A posting board raised in Lastlight, free for the claiming. Its slate refreshes on its own clock with work drawn from the living world. Dwell to read the postings, take ONE in hand, and return to the board when the deed is done: the pay is printed on the card, and the next slate waits where you collect.',
    payload: { flag: FEATURE.BOUNTY_BOARD } },

  // --- Class slots: a bigger HAND at character select, bought in sequence ----
  // THE MOOT LAW (reqClasses): each tier also waits for the class POOL to be
  // deep enough to fill the hand it sells — a 4th slot over 3 classes deals
  // nothing, so it never surfaces to be bought. Because the class-select
  // teasers offer "more slots" exactly when pool > hand, the next tier is
  // always purchasable the moment the teaser exists (the two stay in step).
  ...SLOT_TIERS.map((t, i): Unlockable => ({
    id: t.id, kind: 'slot', cost: t.cost, reqClasses: t.slots,
    ...(i > 0 ? { requiresUnlock: SLOT_TIERS[i - 1].id } : {}),
    label: `Class Slot ${t.slots}`,
    description: `Surface a ${t.slots}th selectable class at character select, dealt at random from your unlocked classes (Class unlocks below deepen that pool; a slot only surfaces once your pool can fill it).`,
    payload: { slotCount: t.slots },
  })),

  // --- Class bundles: class + thematic gems + (once realized) its vocation ---
  //     EARNED by objectives, never bought (THE OBJECTIVE WEB above).
  ...CLASS_BUNDLES.map(classBundleEntry),
  // --- THE MASTERY LADDER: per-class rungs, the essence's new home ----------
  ...classTierEntries(),
  ...MEMORY_UNLOCKS.map((r): Unlockable => ({ id: r.id, kind: 'memory', cost: r.cost,
    label: r.label, description: r.description, payload: { memoryUnlockId: r.id } })),

  // --- Skill drop bundles (tier-1 are starters; these add more to the pool) -
  { id: 'gem_skills_t2', kind: 'skill', cost: 75, reqLevel: 0, label: 'Skill Pool II',
    description: 'Flame Wave, Ground Slam, Whirlwind, Storm Call, Spark may drop.',
    payload: { skillIds: ['flame_wave', 'ground_slam', 'whirlwind', 'storm_call', 'spark'] } },
  { id: 'gem_skills_t3', kind: 'skill', cost: 150, reqLevel: 1, label: 'Skill Pool III',
    description: 'Infernal Ray, Summon Skeleton (+archer), Piercing Arrow, Fan of Blades may drop.',
    payload: { skillIds: ['infernal_ray', 'summon_skeleton', 'summon_skeleton_archer', 'piercing_arrow', 'fan_of_blades'] } },

  { id: 'gem_skills_echoes', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool: Echoes',
    description: 'Mirage Archer and Shadow Clone may drop.',
    payload: { skillIds: ['mirage_archer', 'shadow_clone'] } },
  // THE CLUTCH (engine/clutch.ts): the flame that leaves something living
  // in the wound — the birth fabric's player half.
  { id: 'gem_skills_clutch', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool: the Clutch',
    description: 'Cinderwisp may drop. A landed ember leaves a cinder sprite burning in the wound.',
    payload: { skillIds: ['cinderwisp'] } },
  { id: 'gem_skills_covenants', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool: Covenants',
    description: 'Convocation, Overclock, Blood Mortgage may drop.',
    payload: { skillIds: ['convocation', 'overclock', 'blood_mortgage'] } },
  { id: 'gem_skills_groundwork', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool: Groundwork',
    description: 'Volcanic Fissure, Eruption, Thunderstorm, Entangle, Rune of Power, Toxic Domain may drop.',
    payload: { skillIds: ['volcanic_fissure', 'eruption', 'thunderstorm', 'entangle', 'rune_of_power', 'toxic_domain'] } },
  { id: 'gem_skills_purity', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool: Purity',
    description: 'Purity of Elements / Fire / Cold / Lightning and Determination may drop.',
    payload: { skillIds: ['purity_of_elements', 'purity_of_fire', 'purity_of_cold', 'purity_of_lightning', 'determination'] } },
  { id: 'gem_skills_arsenal', kind: 'skill', cost: 220, reqLevel: 1, label: 'Skill Pool: Arsenal',
    description: 'Powderkeg Arrow, Orbital Blades, Pinning Spear, Groundswell, Mower\'s Arc, Summon Blade Wraith, Rolling Cannonade, Time Dilation may drop.',
    payload: { skillIds: ['powderkeg_arrow', 'orbital_blades', 'pinning_spear', 'groundswell', 'scythe_sweep', 'summon_blade_wraith', 'rolling_cannonade', 'time_dilation'] } },
  // THE WILDCRAFT — the jungle's arts, surfaced by walking INTO a sunken
  // ruin (the ruin_entered ledger the ruin_gate sidezone bumps: discovery
  // unlocks the discipline — the cellar→Pit pattern for skills).
  { id: 'gem_skills_wildcraft', kind: 'skill', cost: 190, reqLedger: 'ruin_entered', label: 'Skill Pool: the Wildcraft',
    description: 'Machete Arc, Blowdart, Vine Lash, Spore Bloom, Panther Pounce may drop. Learned the way it was first learned: by going in.',
    payload: { skillIds: ['machete_arc', 'blowdart', 'vine_lash', 'spore_bloom', 'panther_pounce'] } },
  // The desert's discipline waits under the erg (the vault_entered ledger the
  // vault_gate sidezone bumps — found, not taught).
  { id: 'gem_skills_sunsand', kind: 'skill', cost: 190, reqLedger: 'vault_entered', label: 'Skill Pool: Sun & Sand',
    description: 'Glass Lance, Dune Surge, Mirage Step, Sirocco Ring, Solar Brand may drop. The desert teaches whoever walks back out.',
    payload: { skillIds: ['glass_lance', 'dune_surge', 'mirage_step', 'sirocco_ring', 'solar_brand'] } },
  // The fear-craft waits at the TOP of the haunted house (the manor_entered
  // ledger the manor's grand stair bumps — climbed, not taught).
  { id: 'gem_skills_harrowing', kind: 'skill', cost: 190, reqLedger: 'manor_entered', label: 'Skill Pool: the Harrowing',
    description: 'Gourd Bomb, Harrowing Wail, Summon Scarecrow may drop. Whatever you met on the stairs taught you this.',
    payload: { skillIds: ['gourd_bomb', 'harrowing_wail', 'summon_scarecrow'] } },
  // Light-craft is learned in the dark (the gloaming_seen ledger the deep
  // gloom stamps — stood in, not taught).
  { id: 'gem_skills_gloaming', kind: 'skill', cost: 170, reqLedger: 'gloaming_seen', label: 'Skill Pool: the Gloaming',
    description: 'Kindle may drop. You stood in the risen dark and learned what a light is worth.',
    payload: { skillIds: ['kindle_wick'] } },
  // THE AUREOLE KATA — the Seraph City's circular judgement. The gateway
  // ledger EXISTS now: the Cathedral of the Highest's GREAT WEST DOORS are a
  // lesson door (grand_cathedral, data/structures.ts) — the first dwell-open
  // stamps 'cathedral_door_opened', and the kata is learned by walking into
  // the See, like every country discipline.
  { id: 'gem_skills_aureole', kind: 'skill', cost: 180, reqLedger: 'cathedral_door_opened', label: 'Skill Pool: the Aureole',
    description: 'Gloriole, Colonnade, Gloria may drop. The circular judgement of the Seraph City: courts that convene on the accused.',
    payload: { skillIds: ['gloriole', 'colonnade', 'gloria'] } },
  // THE LITURGY — the Cathedral's own art, taught by the same doors: call
  // and response (Versicle/Antiphon close the Responsory measure) and the
  // second player-allied angel (Invoke Lampad).
  { id: 'gem_skills_liturgy', kind: 'skill', cost: 170, reqLedger: 'cathedral_door_opened', label: 'Skill Pool: the Liturgy',
    description: 'Versicle, Antiphon, Invoke Lampad may drop. Call and response: the See\'s own measure, and the candle-borne warden who holds your line.',
    payload: { skillIds: ['versicle', 'antiphon', 'invoke_lampad'] } },
  // THE SCENTCRAFT — the Garden's pheromone-craft waits at the BOTTOM of
  // the formicary (the nest_entered ledger the mound-gate bumps — dwelled
  // into, not taught). The colony has been running the world's oldest
  // instinct-lever seminar; entry is the tuition.
  { id: 'gem_skills_scentcraft', kind: 'skill', cost: 190, reqLedger: 'nest_entered', label: 'Skill Pool: Scentcraft',
    description: 'Prey Musk, Alarm Reek, Honeydew Lure, Moult may drop. The nest taught you what a smell can make a body do.',
    payload: { skillIds: ['prey_musk', 'alarm_reek', 'honeydew_lure', 'moult'] } },
  // THE GLIMMERCRAFT — the Grove's light-lure art waits under the hollow
  // bole (the 'gleam_entered' ledger the den's door bumps — dwelled into,
  // not taught). The False Sovereign has been running the wood's oldest
  // bait-and-lantern con; walking into her parlor is the tuition.
  { id: 'gem_skills_glimmer', kind: 'skill', cost: 160, reqLedger: 'gleam_entered', label: 'Skill Pool: Glimmercraft',
    description: 'Lure Lantern may drop. Something in the grove taught you what a light can make a body do.',
    payload: { skillIds: ['lure_lantern'] } },
  // THE SIEGECRAFT — the Warfront's ordnance art waits under the powder
  // magazine (the 'ordnance_yard_entered' ledger the den's door bumps —
  // dwelled into, not taught). You watched the Grind build its guns;
  // walking the proofing floor is the tuition.
  { id: 'gem_skills_siegecraft', kind: 'skill', cost: 180, reqLedger: 'ordnance_yard_entered', label: 'Skill Pool: Siegecraft',
    description: 'Hellbore Mortar may drop. The Ordnance Yard taught you what a gun needs: somewhere to stand, something to feed it, and someone it hates.',
    payload: { skillIds: ['hellbore_mortar'] } },
  // THE SCALD (THE SCALD KIT K2 — charter docs/design/scald-kit.md §4,
  // ratified): the basin's own arts, ALREADY FOUND. Its ground floors these
  // gems into its drops (data/scaldkit.ts THE GEM FLOOR — you meet them in
  // the terraces long before you own them); this row is the OTHER half of
  // the no-lock law — it carries them into the account-wide pool, so a
  // scald gem drops in the desert, in the grove, at Brandt's counter and on
  // the standing order's shelf. THE GATEWORK's ANY-OF (SCALD_KIT_UNLOCK
  // _LEDGERS): the Great Geyser's mouth, the Geysermaw itself, or the
  // Cistern's descent — whichever road you crossed first is your tuition.
  { id: 'gem_skills_scald', kind: 'skill', cost: 190,
    reqAnyOf: SCALD_KIT_UNLOCK_LEDGERS.map(ledger => ({ ledger })) as readonly GateRow[],
    tease: true, label: 'Skill Pool: the Scald',
    description: 'Scalding Lash, Kettle Burst, Boil Over, Head of Steam, Blowhole, Geyser-Step, Vent Hop, Vent Veil may drop anywhere. The basin taught you what water does to fire: nothing at all, and everything to whoever is standing in it.',
    payload: { skillIds: ['scalding_lash', 'kettle_burst', 'boil_over', 'head_of_steam', 'blowhole', 'geyser_step', 'vent_hop', 'vent_veil'] } },
  // THE MIMIC'S LESSON (engine/mimic.ts — the blue-mage lane): surfaced the
  // way the idea itself arrives — by killing ONE chest that pretended to be
  // treasure. The bestiary ledger IS the gate (bestiaryKey contract), so
  // the knowledge discipline is unlocked by a first act of knowing.
  { id: 'gem_skills_mimicry', kind: 'skill', cost: 200, reqLedgerCounts: { [bestiaryKey('mimic')]: 1 }, label: 'Skill Pool: Mimicry',
    description: 'Mimicry may drop. The chest that bit you taught you something: a shape is only a habit, and habits can be stolen.',
    payload: { skillIds: ['mimicry'] } },
  // THE POSSESSION SEAM (engine/possess.ts): surfaced by putting down ONE
  // Vacant Shell — a body that walks with nobody home poses the question,
  // and the discipline is its answer (the mimicry counted-ledger idiom).
  { id: 'gem_skills_possession', kind: 'skill', cost: 220, reqLedgerCounts: { [bestiaryKey('vacant_shell')]: 1 }, label: 'Skill Pool: Possession',
    description: 'Possession may drop. The shell you broke was empty the whole time, and an empty seat is an invitation.',
    payload: { skillIds: ['possession'] } },
  // THE FORM GEMS chain off the discipline AND the study of the beast
  // itself (the knowledge-gets-teeth law: the count sits near the ARTS
  // tier of a common kind's bestiary ladder — you can only wear what you
  // understand). Future forms are one row each: a new bestiaryKey, a new
  // payload — the seam itself never changes.
  { id: 'gem_skills_wolfform', kind: 'skill', cost: 260, requiresUnlock: 'gem_skills_possession',
    reqLedgerCounts: { [bestiaryKey('dire_wolf')]: 20 }, label: 'Skill Pool: the Wolf Form',
    description: 'Form of the Dire Wolf may drop. Twenty wolves taught you how the shoulders roll; the twenty-first lesson is from inside.',
    payload: { skillIds: ['form_of_the_dire_wolf'] } },
  // THE VERMINCRAFT — the piper's own trick, learned the hard way (the
  // mimicry counted-ledger idiom: put down one Vermin Piper who threw its
  // squirming bundles at you, and the bottling is yours).
  { id: 'gem_skills_vermincraft', kind: 'skill', cost: 180, reqLedgerCounts: { [bestiaryKey('vermin_piper')]: 1 }, label: 'Skill Pool: Vermincraft',
    description: 'Bottled Swarm may drop. The piper threw its bundle at you first; now you know what a jar can hold, and who it answers to.',
    payload: { skillIds: ['bottled_swarm'] } },
  // THE MARROWCRAFT — spent where the ghoul hoards (the same idiom): the
  // corpse-eater that denies your fuel is the lesson that it IS fuel.
  { id: 'gem_skills_marrowcraft', kind: 'skill', cost: 190, reqLedgerCounts: { [bestiaryKey('charnel_ghoul')]: 1 }, label: 'Skill Pool: Marrowcraft',
    description: 'Marrowhooks may drop. The ghoul guarded its pile like a purse. It was right about the worth, wrong about the spending.',
    payload: { skillIds: ['marrowhooks'] } },
  // THE FOURTH WALL's movement art (engine/fourthwall.ts — the frame seals,
  // the body becomes the ball).
  { id: 'gem_skills_fourthwall', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool: the Caged Comet',
    description: 'Caged Comet may drop. Seal the edge of your vision into a cage and be the thing that ricochets inside it.',
    payload: { skillIds: ['caged_comet'] } },
  // THE ULTIMATE ARTS (engine/ultimates.ts — super arts on super cooldowns;
  // the eyecatch pane is the fabric's face).
  { id: 'gem_skills_ultimates', kind: 'skill', cost: 320, reqLevel: 12, label: 'Skill Pool: Ultimate Arts',
    description: 'The Hundred Partings, Hollow Star, the Woken Hollow, Grave Tide, Doom Bell,'
      + ' Last Rites, Stormcrown and the Hush of the Wake may drop. Arts too large for the'
      + ' hand that holds them: the world stops to watch.',
    payload: { skillIds: [
      'hundred_partings', 'hollow_star', 'woken_hollow',
      'grave_tide', 'doom_bell', 'last_rites', 'stormcrown', 'hush_of_the_wake',
      'red_hour', 'long_cold', 'rain_of_knives', 'litany_of_dawn',
    ] } },
  // THE GAUGE FABRIC's ordinary debut (engine/gauge.ts — an art priced in
  // kills, no super mark): the kill-speed build-around.
  { id: 'gem_skills_gauge', kind: 'skill', cost: 120, reqLevel: 4, label: 'Skill Pool: the Reaper\'s Toll',
    description: 'Reaper\'s Toll may drop. Every kill is a coin; the toll rings when the purse'
      + ' is full, and the faster you kill, the more often it rings.',
    payload: { skillIds: ['reapers_toll'] } },

  // --- Support drop bundles -------------------------------------------------
  { id: 'sup_t2', kind: 'support', cost: 100, reqLevel: 0, label: 'Support Pool II',
    description: 'Eruption Cycle, Channeled Tempest, Dive Bomb, Static Buildup, Forked Focus may drop.',
    payload: { supportIds: ['eruption_cycle', 'channeled_tempest', 'dive_bomb', 'static_buildup', 'forked_focus'] } },
  { id: 'sup_t3', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool III',
    description: 'Powderkeg, Nova Release, Elemental Conduction, Capacitor may drop.',
    payload: { supportIds: ['powderkeg', 'nova_release', 'elemental_conduction', 'capacitor'] } },
  { id: 'sup_wildcraft', kind: 'support', cost: 140, reqLedger: 'ruin_entered', label: 'Support Pool: the Wildcraft',
    description: 'Serrated Edge, Envenomed Tips, Smothering Spores may drop.',
    payload: { supportIds: ['serrated_edge', 'envenomed_tips', 'smothering_spores'] } },
  { id: 'sup_sunsand', kind: 'support', cost: 140, reqLedger: 'vault_entered', label: 'Support Pool: Sun & Sand',
    description: 'Sunbaked Edge, Noonglass, Scouring Grit may drop.',
    payload: { supportIds: ['sunbaked_edge', 'noonglass', 'scouring_grit'] } },
  { id: 'sup_harrowing', kind: 'support', cost: 140, reqLedger: 'manor_entered', label: 'Support Pool: the Harrowing',
    description: 'Unnerving and Haunted Service may drop.',
    payload: { supportIds: ['unnerving', 'haunted_service'] } },
  { id: 'sup_scentcraft', kind: 'support', cost: 140, reqLedger: 'nest_entered', label: 'Support Pool: Scentcraft',
    description: 'Heavy Musk, Candied Scent, Startling Reek may drop. What clings, what tempts, what routs.',
    payload: { supportIds: ['heavy_musk', 'candied_scent', 'startling_reek'] } },
  // THE SCALD's gem side (THE SCALD KIT K2) — the same ANY-OF tuition as the
  // skill pool above, sequenced behind it: the arts first, then the gems
  // that temper them.
  { id: 'sup_scald', kind: 'support', cost: 150, requiresUnlock: 'gem_skills_scald', tease: true,
    label: 'Support Pool: the Scald',
    description: 'Boiling Point, Pressure Seal, Afterspray, Vaporize, Mineral Tuning may drop anywhere. The basin\'s tempers: what boils, what waits, what it leaves behind.',
    payload: { supportIds: ['boiling_point', 'pressure_seal', 'afterspray', 'vaporize', 'mineral_tuning'] } },
  { id: 'sup_echoes', kind: 'support', cost: 200, reqLevel: 1, label: 'Support Pool: Echoes',
    description: 'Phantasmal Echo, Ancestral Call, Vessel of Shadow, Synchronicity may drop.',
    payload: { supportIds: ['phantasmal_echo', 'ancestral_call', 'vessel_of_shadow', 'synchronicity'] } },
  { id: 'sup_clutch', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool: the Clutch',
    description: 'Broodbearer and Teeming Vein may drop. Landings that bear, and a gem cut once at the vein, no two alike.',
    payload: { supportIds: ['broodbearer', 'teeming_vein'] } },
  // THE FOURTH WALL's gem side — the Scald's tuition idiom: the art first,
  // then the temper that turns every flight into the same game.
  { id: 'sup_fourthwall', kind: 'support', cost: 140, requiresUnlock: 'gem_skills_fourthwall', tease: true,
    label: 'Support Pool: Mirrored Bounds',
    description: 'Mirrored Bounds may drop. The edge of your vision turns to glass, and your shots learn to play the room.',
    payload: { supportIds: ['mirrored_bounds'] } },
  { id: 'sup_fragments', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool: Fragments',
    description: 'Fragmentation, Bulwark Shards, Rage Remnant may drop.',
    payload: { supportIds: ['fragmentation', 'bulwark_shards', 'rage_remnants'] } },
  { id: 'sup_overcharge', kind: 'support', cost: 140, reqLevel: 1, label: 'Support Pool: Overcharge',
    description: 'Overcharge and Mounting Frenzy may drop.',
    payload: { supportIds: ['overcharge', 'mounting_frenzy'] } },
  { id: 'sup_covenants', kind: 'support', cost: 200, reqLevel: 1, label: 'Support Pool: Covenants',
    description: 'Vital Bond, Bloodletter\'s Rhythm, Remnant Conduit, Metronome, Colossus Stance, Transfusion Bond, Controlled Burn may drop.',
    payload: { supportIds: ['vital_bond', 'bloodletters_rhythm', 'remnant_conduit',
      'metronome', 'colossus_stance', 'transfusion_bond', 'controlled_burn'] } },
  // The Aureole kata's socketable verdicts (the same doors teach them —
  // see gem_skills_aureole).
  { id: 'sup_aureole', kind: 'support', cost: 140, reqLedger: 'cathedral_door_opened', label: 'Support Pool: the Aureole',
    description: 'Aureate Writ and Sanctal Cautery may drop. The tribune\'s docket and the gilt fire that closes wounds shut.',
    payload: { supportIds: ['aureate_writ', 'sanctal_cautery'] } },
  { id: 'sup_mimicry', kind: 'support', cost: 150, requiresUnlock: 'gem_skills_mimicry', label: 'Support Pool: Mimicry',
    description: 'Keen Study and Understudy may drop. The eye that steals without the bruise, and the wings that hold more faces.',
    payload: { supportIds: ['keen_study', 'understudy'] } },
  { id: 'sup_possession', kind: 'support', cost: 160, requiresUnlock: 'gem_skills_possession', label: 'Support Pool: Possession',
    description: 'Iron Trance and Long Communion may drop. Armor for the body you leave, and patience for the one you take.',
    payload: { supportIds: ['iron_trance', 'long_communion'] } },
  // THE COUNTERPOINT (an orphan fix): Polyphony and Ostinato shipped with
  // the combo grammar fully defined but joined NO pool row — obtainable
  // only under the unlock-all dev feature. The validator's pool-orphan net
  // (data/validate.ts) now guards this class of gap; this row is theirs.
  { id: 'sup_counterpoint', kind: 'support', cost: 160, reqLevel: 1, label: 'Support Pool: Counterpoint',
    description: 'Polyphony and Ostinato may drop. The grammar\'s payoffs: the varied hand, and the phrase insisted upon.',
    payload: { supportIds: ['polyphony', 'ostinato'] } },

  // --- Town features (the roguelite town framework) ------------------------
  // Width and refresh rows derive their prices, sequencing and deed gates
  // from vendor data. Early tiers need investment; later tiers also need deeds.
  ...VENDOR_CFG.wares.ladder.map((rung, i): Unlockable => ({
    id: `feat_vendor_wares_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    requiresUnlock: i === 0 ? undefined : `feat_vendor_wares_${i}`,
    ...(rung.gate ? { reqAnyOf: rung.gate, tease: true } : {}),
    label: `Broader Wares ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}`,
    description: `Every counter stocks wider: +${rung.gems} Memory slot${rung.gems === 1 ? '' : 's'} on the one shelf (they fill once the Memory Counter opens) and +${rung.gear} rolled piece${rung.gear === 1 ? '' : 's'} in the glass beside them. One purchase, every market your line will ever trade in.`,
    payload: { flag: rung.flag },
  })),
  { id: BRANDT_CFG.magicWares.unlock, kind: 'feature', cost: BRANDT_CFG.magicWares.cost,
    reqLevel: 0, requiresUnlock: 'feat_bounty_board', tease: true,
    reqLedgerCounts: { [BRANDT_CFG.magicWares.ledger]: BRANDT_CFG.magicWares.required },
    label: BRANDT_CFG.magicWares.label,
    description: `After collecting ${BRANDT_CFG.magicWares.required} crafting-writ bounties, invest Mortal Essence to bring magic equipment to Brandt’s shelves. Opens Rush Orders IV–V and Broader Wares IV–V for further investment.`,
    payload: { flag: BRANDT_CFG.magicWares.flag } },
  // Magic Wares precedes the Memory Counter. Brandt's policy gates pouches
  // as well as direct skill memories; other counters keep their own policies.
  { id: 'feat_vendor_gems', kind: 'feature', cost: 120, reqLevel: 0,
    requiresUnlock: BRANDT_CFG.magicWares.unlock,
    label: 'The Memory Counter',
    description: 'Every counter\'s shelf grows its true finds: direct Skill Memories stock in the glass beside the pouches, account-wide. Support Memories and the deeper counter services grow from here.',
    payload: { flag: FEATURE.VENDOR_GEMS } },
  // (Chain-gated only, like every market rung — the stray account-level gate
  // it wore before the gatework re-parented it was pre-chain residue.)
  { id: 'feat_brandt_supports', kind: 'feature', cost: 80,  reqLevel: 0, requiresUnlock: 'feat_vendor_gems', label: 'Memory Counter: Supports', description: 'The counters\' Memory slots also deal Support Memories.', payload: { flag: FEATURE.BRANDT_SELL_SUPPORTS } },
  // Rush Orders retain the shared market clock and the original owned flags.
  ...VENDOR_CFG.restock.ladder.map((rung, i): Unlockable => {
    const before: number = VENDOR_CFG.restock.ladder.slice(0, i)
      .reduce((s: number, r) => Math.max(VENDOR_CFG.restock.minSec, s - r.cutSec), VENDOR_CFG.restock.baseSec as number);
    const after = Math.max(VENDOR_CFG.restock.minSec, before - rung.cutSec);
    return {
      id: `feat_vendor_restock_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
      requiresUnlock: i === 0 ? undefined : `feat_vendor_restock_${i}`,
      ...(rung.gate ? { reqAnyOf: rung.gate, tease: true } : {}),
      label: `Rush Orders ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}`,
      description: `Every counter restocks in ${Math.round(after / 60 * 10) / 10} minutes instead of ${Math.round(before / 60 * 10) / 10}. One purchase, every market.`,
      payload: { flag: rung.flag },
    };
  }),
  // Mireille's care, in sequence: life heal, then mana heal, then an XP buff —
  // each surfaces once the previous is owned (a town pitstop that grows).
  // THE INTRODUCTION LAW: the whole chain waits behind her OWN lesson — the
  // flask tutorial's completing drink (LEDGER_FLASK_LESSON, the same account
  // stamp that graduates veterans). A menu-spelunker who has never met the
  // innkeeper finds no mention of her; the head row surfaces the moment the
  // lesson lands, and the chain (mana → XP → the Tracker's camp) drips from
  // there by ownership alone — the world introduces, the Vault deepens.
  { id: 'feat_mireille_life',  kind: 'feature', cost: 40,  reqLevel: 0, reqLedger: LEDGER_FLASK_LESSON, label: 'Mireille: Field Care',     description: 'Mireille restores your LIFE when you linger near her.',  payload: { flag: FEATURE.MIREILLE_HEAL_LIFE } },
  { id: 'feat_mireille_mana',  kind: 'feature', cost: 60,  reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_LIFE, label: 'Mireille: Restorative Brew', description: 'She also replenishes your MANA.',                       payload: { flag: FEATURE.MIREILLE_HEAL_MANA } },
  { id: 'feat_mireille_xp',    kind: 'feature', cost: 120, reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_MANA, label: 'Mireille: Traveller\'s Rest', description: 'Linger for a 5-minute +5% experience blessing: a worthwhile pitstop.', payload: { flag: FEATURE.MIREILLE_XP_BUFF } },
  // The TRACKER — the inn's word-of-mouth made flesh: once Mireille keeps you
  // fed and watered, her huntsman friend pitches camp. Unlocks the BESTIARY
  // (data/bestiary.ts): account-wide kill knowledge, studied into power.
  { id: 'feat_tracker', kind: 'feature', cost: 90, reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_MANA, label: 'Weslan the Tracker', description: 'A huntsman camps at the town\'s west edge. Dwell by his fire to open the BESTIARY: every kind your line has slain, studied into knowledge that outlives every death.', payload: { flag: FEATURE.TRACKER } },

  // --- THE PATRON'S HOLD (data/vendors.ts VENDOR_CFG): the reserve ladder,
  //     DERIVED from the config's own list — appending a rung there grows
  //     this catalog and every counter's capacity together; nothing here
  //     counts to three. Surfaces once the account has BOUGHT at any
  //     counter (LEDGER_VENDOR_BOUGHT: you can only reserve at a market
  //     you've traded in); each rung requires the last. ---------------------
  // Rung 1 now stands at the chain's far end (the user's meta-progression:
  // width first, then the Memory Counter, then the right to HOLD) — it
  // requires the Memory Counter AND a Broader Wares rung owned, plus the standing
  // discovery law (LEDGER_VENDOR_BOUGHT: you can only reserve at a market
  // you've traded in), and TEASES once the chain is walked: the card hangs
  // sealed until the first purchase stamps the ledger.
  ...VENDOR_CFG.lock.ladder.map((rung, i): Unlockable => ({
    id: `feat_vendor_lock_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    ...(i === 0
      ? { requiresUnlock: 'feat_vendor_gems',
          reqLedger: LEDGER_VENDOR_BOUGHT, tease: true }
      : { requiresUnlock: `feat_vendor_lock_${i}` }),
    label: `Reserved Wares ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}`,
    description: i === 0
      ? 'Every counter learns THE PATRON\'S HOLD: tick a ware to RESERVE its shelf slot, and it rides every restock, every reload, untouched, until bought or released. One slot, shared law at every counter.'
      : `The counters hold ${i + 1} reserved slots for you.`,
    payload: { flag: rung.flag },
  })),
  // THE STANDING ORDER: commission one KNOWN gem (the drop index —
  // gemdrop:<id> ledger counts, genuine loot mints only) and the counter
  // resolves every restock you missed at its true shelf odds; a hit waits
  // reserved on the shelf. Gated on the index having seen real loot.
  // Purchasable exactly when at least ONE gem is orderable — the drop index
  // holds some gem at the commission's own `need` (a gemdrop:* prefix
  // avenue; the same threshold the order form enforces) — so the row can
  // never sell with nothing to name. Teases sealed once the hold is owned.
  { id: 'feat_vendor_commission', kind: 'feature', cost: VENDOR_CFG.commission.cost, reqLevel: 0,
    requiresUnlock: 'feat_vendor_lock_1', tease: true,
    requiresMemoryCommission: true,
    label: 'The Standing Order: Commission',
    description: `Commission an awakened skill or a support found ${VENDOR_CFG.commission.need}+ times. The counter watches at its normal restock odds and reserves a find for you. One standing order per counter; fulfilled on purchase.`,
    payload: { flag: FEATURE.VENDOR_COMMISSION } },

  // --- Town-building: the Quest Package (surfaces once any character reaches L5)
  { id: 'feat_quest_giver', kind: 'feature', cost: 100, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Quest Package: Town Expansion',
    description: 'A quartermaster settles in Lastlight, posting hunts into the wilds (quest chains).',
    payload: { flag: FEATURE.QUEST_GIVER } },

  // --- THE BOARD'S GROWTH (bounty board M4 — derived from
  //     BOUNTY_BOARD_CFG.growth, the broader-wares doctrine: append a rung
  //     THERE and the catalog + the arm's fold grow together): BROADER
  //     POSTINGS widen the slate, FARTHER POSTINGS stretch the writs'
  //     reach. Rung 1 of each gates on the first bounty ever turned in
  //     (the board must be a habit before width means anything); later
  //     rungs chain rung-to-rung. The starter band's small slate outranks
  //     BROADER while it lives — young boards stay small by law. ----------
  ...BOUNTY_BOARD_CFG.growth.broader.map((rung, i): Unlockable => ({
    id: `feat_bounty_broader_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    requiresUnlock: i === 0 ? 'feat_bounty_board' : `feat_bounty_broader_${i}`,
    ...(i === 0 ? { reqLedger: 'bounty_done' } : {}),
    label: `Broader Postings ${['I', 'II', 'III'][i] ?? i + 1}`,
    description: `The board deals ${rung.add} more posting${rung.add === 1 ? '' : 's'} every beat: more work to choose among, one hand at a time all the same.`,
    payload: { flag: rung.flag },
  })),
  ...BOUNTY_BOARD_CFG.growth.farther.map((rung, i): Unlockable => ({
    id: `feat_bounty_farther_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    requiresUnlock: i === 0 ? 'feat_bounty_board' : `feat_bounty_farther_${i}`,
    ...(i === 0 ? { reqLedger: 'bounty_done' } : {}),
    label: `Farther Postings ${['I', 'II', 'III'][i] ?? i + 1}`,
    description: `The board's writs reach ${Math.round((rung.mul - 1) * 100)}% farther afield: deeper country, richer asks, longer walks home.`,
    payload: { flag: rung.flag },
  })),
  // THE POSTING PIN (her adjustment — the Reserved Wares kinship on the
  // board): each rung is one reserve pin; a pinned offer rides every
  // re-deal — the beat's turn and the turn-in refresh alike — until
  // accepted, released, or struck by the world's own reconcile.
  ...BOUNTY_BOARD_CFG.lock.ladder.map((rung, i): Unlockable => ({
    id: `feat_bounty_lock_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    requiresUnlock: i === 0 ? 'feat_bounty_board' : `feat_bounty_lock_${i}`,
    ...(i === 0 ? { reqLedger: 'bounty_done' } : {}),
    label: `Reserved Postings ${['I', 'II', 'III'][i] ?? i + 1}`,
    description: 'One reserve pin at the bounty board: a pinned posting holds its seat through every fresh deal until you take it or let it go. A dead ask still leaves: the pin holds the seat, never the truth.',
    payload: { flag: rung.flag },
  })),

  // --- Training Dummy — THE DEED GATE: surfaces on the account's first
  //     LEGENDARY skill gem (LEDGER_LEGENDARY_SKILL_DROP, stamped at the
  //     mint chokepoint): the moment you finally hold a skill worth
  //     practicing, the town offers somewhere to practice it. ---------------
  { id: 'feat_target_dummy', kind: 'feature', cost: 50, reqLevel: 0, reqLedger: LEDGER_LEGENDARY_SKILL_DROP,
    label: 'Training Dummy: Town',
    description: 'That legendary Memory deserves better than guesswork. A practice dummy stands in Lastlight: an immortal target to pummel and test your skills, effects, ailments, and modifiers against.',
    payload: { flag: FEATURE.TARGET_DUMMY } },

  // --- Campfire — THE DEED GATE: earned by WANDERING (LEDGER_ZONES_EXPLORED,
  //     each zone newly charted per run counts once): fifty zones in, the
  //     wilds' rhythm is yours and the fire that refreshes them makes sense
  //     to offer. ----------------------------------------------------------
  { id: 'feat_campfire', kind: 'feature', cost: 70, reqLevel: 0,
    reqLedgerCounts: { [LEDGER_ZONES_EXPLORED]: 50 },
    label: 'Campfire: Town',
    description: 'Fifty zones charted, and the wilds know your steps. A campfire is laid in Lastlight. Zones already remember their layout and surviving foes as you cross between them; dwell by the fire to REFRESH the wilds on command, and every zone repopulates fresh (your cleared objectives stay claimed).',
    payload: { flag: FEATURE.CAMPFIRE } },

  // Returning the hammer qualifies rare stock; purchasing it opens the bench.
  // Selling at Brandt remains available from the first visit.
  { id: BRANDT_CFG.rareWares.unlock, kind: 'feature', cost: BRANDT_CFG.rareWares.cost,
    reqLevel: 0, requiresUnlock: BRANDT_CFG.magicWares.unlock,
    reqLedger: BRANDT_CFG.rareWares.ledger, tease: true,
    label: BRANDT_CFG.rareWares.label,
    description: 'Return Brandt’s hammer, then invest to bring rare equipment and rare Memories to his shelves. Opens the Salvage Station for further investment.',
    payload: { flag: BRANDT_CFG.rareWares.flag } },
  { id: 'feat_salvage_station', kind: 'feature', cost: 1, reqLevel: 0, requiresUnlock: BRANDT_CFG.rareWares.unlock,
    label: 'Salvage Station: Town',
    description: 'That strange residue has a name: ESSENCE. A breaker\'s bench is raised in Lastlight; dwell there to BREAK gear and carried Memories into their rarity\'s essence (coarse, glimmering, brilliant, pristine), studying every affix broken. Brandt already BUYS SCRAP at his counter, paying Coarse Essence by an item\'s overall quality: sell for volume, break for the deep tints and the lore. Spend essence levelling skills, at counters, and crafting studied affixes onto your gear.',
    payload: { flag: FEATURE.SALVAGE_STATION } },
  { id: 'feat_craft_second', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_15', requiresFeature: FEATURE.SALVAGE_STATION,
    label: 'Salvage Station: Twin Anvils',
    description: 'The bench learns to hold TWO crafted affixes on one item (the one-craft rule, bought apart).',
    payload: { flag: FEATURE.CRAFT_SECOND_AFFIX } },
  // The rescue grants this service directly; the catalog records its source.
  { id: 'feat_oracle_stone', kind: 'feature', cost: 0, reqLevel: 0,
    reqLedger: ORACLE_RESCUED,
    label: 'Oracle Stone: Town',
    description: 'Granted by rescuing the Oracle from your revenge commander. He settles among Lastlight’s standing stones and opens the Reliquary. Commune over an item to reroll an affix; each line answers once, sealing it forever.',
    payload: { flag: FEATURE.ORACLE_STONE } },

  // --- The Mercenary Recruiter (meta/mercs.ts): surfaces once the account
  //     has MET the market anywhere — a port muster, a wilds parley, any
  //     officer's menu (LEDGER_MERC_MARKET_MET): you can only buy what you
  //     know exists. The officer runs the PORT policy at the town's table
  //     (hire-only, never retirement), and his single-serve sheet is dealt
  //     once per world and locked (THE MUSTER-ROLL LAW). ---------------------
  { id: 'feat_merc_recruiter', kind: 'feature', cost: 120, reqLevel: 0, reqLedger: LEDGER_MERC_MARKET_MET,
    label: 'Mercenary Recruiter: Town',
    description: 'A recruiting officer takes a table in Lastlight\'s east quarter. Hire a blade the moment a run begins, under port rules: baseline sellswords fitted to your level, and NO retiring at his table. His sheet is dealt ONCE for each world and never refreshed: what he offers is all he will ever offer, until the world itself is made anew.',
    payload: { flag: FEATURE.MERC_RECRUITER } },

  // --- THE IMMORTAL COVENANT (meta/modes.ts): a character MODE, not a town
  //     feature — earned by dying. Surfaces once the account has fallen
  //     IMMORTAL_CFG.unlockDeaths times; the two vessel slots ladder off it. ---
  { id: 'feat_immortal', kind: 'feature', cost: 100, reqLevel: 0,
    reqLedgerCounts: { [LEDGER_ACCOUNT_DEATHS]: IMMORTAL_CFG.unlockDeaths },
    label: 'The Immortal Covenant',
    description: `Death has seen you ${IMMORTAL_CFG.unlockDeaths} times, and blinked. `
      // THE OFFERED CONTRACT (meta/modes.ts muOffer): the covenant is MET in
      // Mu, never picked off a list — the Vault card says so in the player's terms.
      + 'Opens the IMMORTAL covenant: while a vessel slot stands free, the nothing between lives '
      + 'may offer one waking vessel under it — you will know it by the ember it wears. Take it, '
      + 'or wake mortal. A sworn character plays the wake as any '
      + 'other, until its first death, which pays a reduced essence tithe and seals it OUTSIDE '
      + 'the mortal ledger. It wakes in town, build intact, carry lost; it persists across '
      + 'sessions in an account vessel; its corpses are visible only to itself, and its deeds '
      + 'feed the account nothing. The character itself is never lost, but each later death '
      + 'FELLS the vessel, and only Mortal Essence from your mortal runs, poured at the Vault, '
      + 'calls it back.',
    payload: { flag: FEATURE.IMMORTAL } },
  { id: 'feat_immortal_slot_2', kind: 'feature', cost: 200, reqLevel: 0,
    requiresUnlock: 'feat_immortal',
    label: 'Immortal: Second Vessel',
    description: 'The covenant holds a second sworn character (two Immortal save slots).',
    payload: { flag: FEATURE.IMMORTAL_SLOT_2 } },
  { id: 'feat_immortal_slot_3', kind: 'feature', cost: 350, reqLevel: 0,
    requiresUnlock: 'feat_immortal_slot_2',
    label: 'Immortal: Third Vessel',
    description: 'The covenant holds a third sworn character (three Immortal save slots).',
    payload: { flag: FEATURE.IMMORTAL_SLOT_3 } },

  // --- The Caravan: four broad tiers, each opening a wider band of escorted travel.
  //     Base tier (the Caravanner settles in town) at L10; far tiers ALSO need the
  //     Unmade slain. Each tier requires the previous (a growing route network). ----
  { id: 'feat_caravan', kind: 'feature', cost: 120, reqLevel: 0, reqLedger: 'reached_level_10',
    label: 'Caravan: Outpost',
    description: 'A travelling Caravanner makes camp in Lastlight and escorts you to the near wilds (lvl ≤20), minting a fixed route into each level band and ferrying you home.',
    payload: { flag: FEATURE.CARAVAN } },
  { id: 'feat_caravan_deep', kind: 'feature', cost: 200, reqLevel: 0, reqLedger: 'reached_level_30', requiresFeature: FEATURE.CARAVAN,
    label: 'Caravan: Deep Frontier',
    description: 'The Caravanner braves routes into the lvl 21–30 band.',
    payload: { flag: FEATURE.CARAVAN_DEEP } },
  { id: 'feat_caravan_far', kind: 'feature', cost: 320, reqLevel: 0, reqLedger: ['reached_level_40', 'unmade_slain'], requiresFeature: FEATURE.CARAVAN_DEEP,
    label: 'Caravan: Beyond the Veil',
    description: 'With the Unmade slain, the Caravanner runs the lvl 31–50 bands. (Requires: reach level 40 AND defeat the Unmade.)',
    payload: { flag: FEATURE.CARAVAN_FAR } },
  { id: 'feat_caravan_world', kind: 'feature', cost: 480, reqLevel: 0, reqLedger: ['reached_level_60', 'unmade_slain'], requiresFeature: FEATURE.CARAVAN_FAR,
    label: 'Caravan: The Far Reaches',
    description: 'The widest routes: the lvl 51–100 bands. (Requires: reach level 60 AND defeat the Unmade.)',
    payload: { flag: FEATURE.CARAVAN_WORLD } },

  // --- THE VOYAGE's shipwright: three hulls, each requiring the last — the
  //     naval meta-progression ladder (data/ships.ts maps flags → levers).
  //     Base tier surfaces once the account has ever CAST OFF (voyages_sailed). --
  { id: 'ship_sloop', kind: 'feature', cost: 90, reqLevel: 0, reqLedger: 'voyages_sailed',
    label: 'Shipwright: Coastal Sloop',
    description: 'A proper hull replaces the dinghy: +15% sail speed, a longer spyglass (the sea streams and reveals further), and a practiced landing crew.',
    payload: { flag: FEATURE.SHIP_SLOOP } },
  { id: 'ship_brigantine', kind: 'feature', cost: 220, reqLevel: 1, reqLedger: 'islands_landed', requiresFeature: FEATURE.SHIP_SLOOP,
    label: 'Shipwright: Brigantine',
    description: 'Twin masts for the open crossings: +32% sail speed, a far spyglass, and swift beachings. (Requires: land on a Voyage island.)',
    payload: { flag: FEATURE.SHIP_BRIGANTINE } },
  { id: 'ship_galleon', kind: 'feature', cost: 450, reqLevel: 2, reqLedger: 'reached_level_40', requiresFeature: FEATURE.SHIP_BRIGANTINE,
    label: 'Shipwright: Storm Galleon',
    description: 'The flagship: +50% sail speed, a horizon-spanning spyglass, and landings measured in heartbeats.',
    payload: { flag: FEATURE.SHIP_GALLEON } },

  // --- META-META: the global event-frequency crank (surfaces once ANY character
  //     has reached the level cap of 100 — a true end-game mastery reward) -------
  { id: 'feat_global_frequency', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_100',
    label: 'World Tempo: Global Event Frequency',
    description: 'End-game mastery: Expedition-screen sliders for the world event dials, across the whole run. Tempo scales how OFTEN events occur and how many run at once; Severity scales how HARD each one runs (invasion strength, meteor rate, spread speed, breach duration). Crank the world into a roaring festival, or dial it to a slow burn.',
    payload: { flag: FEATURE.GLOBAL_FREQUENCY } },

  // --- Master gem unlock: everything obtainable (a deliberate, expensive flip) -
  { id: 'feat_unlock_all_gems', kind: 'feature', cost: 500, reqLevel: 2,
    label: 'Grand Codex: Debug Unlock All Memories',
    description: 'DEBUG shortcut retained for testing: every skill and support becomes obtainable, including future additions. Secondary access is bypassed while the debug bypass is enabled. Planned for removal from the player economy after unlock experiments.',
    payload: { flag: FEATURE.UNLOCK_ALL_GEMS } },

  // --- THE SKILL GRAFT: the veteran's essence valve — a REPEATABLE charge
  //     behind the Grand Codex (the account's skill pool is what the pick
  //     reads, and the codex is what makes that pool the whole book). One
  //     purchase arms ONE run-start pick; beginning that run consumes it and
  //     the shelf offers it again. Deterministic horizontal agency: the
  //     skill you want, at its plainest cut, from the first breath. --------
  { id: 'skill_graft', kind: 'graft', cost: SKILL_GRAFT_COST,
    requiresUnlock: 'feat_unlock_all_gems',
    label: 'Skill Grafting',
    description: 'Buy a SKILL GRAFT charge: at your next run\'s start, choose any skill your account has unlocked, and its Memory, at its plainest cut (level 1, common), rides in beside your class\'s own kit, learned where your young hands can hold it, packed where they cannot. The charge arms and spends only when a run begins with a chosen skill; decline the pick and it simply carries on to a later run. Return here for another once it\'s spent. The shelf never empties: this is where a full Vault keeps growing.',
    payload: {} },

  // --- THE CONTAINER FABRIC (engine/containers.ts + data/containers.ts):
  //     one Vault row per RUNG of every registered side board, DERIVED from
  //     the container's own ladder — never listed here. Rung 0 is the
  //     board's existence (the Reliquary itself), gated on the board's
  //     DISCOVERY LEDGER when it names one (you can only buy a case for
  //     what the world has shown you); every later rung requires the rung
  //     before it owned (requiresFeature — the Mireille chain's shape) and
  //     hangs its own gatework avenues (a level road, a deed) with the
  //     tease law, so the player SEES the next shelf and the road to it.
  //     A second container is one ContainerDef; its rows arrive here by
  //     construction. -------------------------------------------------------
  ...CONTAINER_DEFS.flatMap(c => c.ladder.flatMap((rung, i): Unlockable[] => rung.rewardOnly ? [] : [{
    id: `feat_${rung.feature}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    ...(i === 0
      ? (c.foundLedger ? { reqLedger: c.foundLedger } : {})
      : { requiresFeature: c.ladder[i - 1].feature }),
    ...(rung.reqAnyOf ? { reqAnyOf: rung.reqAnyOf } : {}),
    ...(rung.reqLedger ? { reqLedger: rung.reqLedger } : {}),
    ...(rung.tease ? { tease: true } : {}),
    label: rung.label,
    description: rung.description,
    payload: { flag: rung.feature },
  }])),
];

/** Static catalog by id — the resolution table for `requiresUnlock` ladders. */
const CATALOG_BY_ID = new Map(UNLOCK_CATALOG.map(u => [u.id, u] as const));

/** The class-bundle entry that unlocks a given class (undefined for starters).
 *  The class-select teasers use it to point a locked class at its exact
 *  Vault purchase. */
export function classUnlockFor(classId: string): Unlockable | undefined {
  return CATALOG_BY_ID.get(classBundleId(classId));
}

/** THE SHROUDED WALL: every EARNED class entry the account does not own
 *  whose structural door stands (chain parents owned) — the Vault's rumor
 *  cards and the class screen's rumor teasers, INDEX-addressed by every UI
 *  (the DOM never carries a class's name; the card is written in runes). */
export function shroudedClassUnlocks(a: Account): Unlockable[] {
  return UNLOCK_CATALOG.filter(u =>
    u.kind === 'class' && !!u.earned && !isUnlockOwned(a, u) && structuralPrereqsMet(a, u));
}

/** One objective as a face reads it. */
export interface ClassObjectiveRead { label: string; frac: number; met: boolean; revealed: boolean }
export interface ClassUnlockRead {
  rows: ClassObjectiveRead[];
  /** At least one objective is readable; individual rows carry their own verdict. */
  revealed: boolean;
  /** Best avenue: completing any one objective earns the class. */
  frac: number;
  /** Every gate holds — the settle will claim it. */
  met: boolean;
}

/** HOW FAR a shrouded class stands: each objective's spoken line, its
 *  0..1 progress (gates.ts gateRowProgress) and whether it holds; plus the
 *  reveal verdict. `view` substitutes a merged ledger (account + the live
 *  run) for mid-run reads; the Vault reads the account alone. */
export function classUnlockProgress(a: Account, u: Unlockable, view?: Readonly<Record<string, number>>): ClassUnlockRead {
  const probe: Account = view ? { ...a, ledger: view } : a;
  const owned = ownedUnlockById(probe);
  const rows = (u.reqAnyOf ?? []).map(r => {
    const frac = gateRowProgress(probe, r, owned);
    return { label: gateRowLabel(r), frac, met: gateRowMet(probe, r, owned),
      revealed: frac >= CLASS_WEB_CFG.revealFrac };
  });
  const best = rows.reduce((m, r) => Math.max(m, r.frac), 0);
  return { rows, frac: best, revealed: rows.some(r => r.revealed), met: isUnlockVisible(probe, u) };
}

/** Spoiler-safe presentation shared by the Vault card, its hover, and deal
 *  teasers. Never return the identity or deed instructions before discovery.
 *  Each objective reveals on its own progress; the prose follows the best
 *  avenue because the objective group is ANY-of. */
export function classRumorRead(a: Account, u: Unlockable) {
  const read = classUnlockProgress(a, u);
  const proseFrac = CLASS_WEB_CFG.proseRevealFrac > 0 ? read.frac / CLASS_WEB_CFG.proseRevealFrac : 1;
  return {
    title: encipher('unknown calling'),
    body: revealScript(u.kind === 'class' ? u.payload.rumor ?? CLASS_WEB_CFG.unknownRumor : CLASS_WEB_CFG.unknownRumor, proseFrac),
    rows: read.rows.map(r => ({ ...r, label: r.revealed ? r.label : encipher(r.label) })),
    detail: u.kind === 'class' && read.rows.length > 0 && read.rows.every(r => r.revealed)
      ? u.payload.hint ?? '' : '',
    revealed: read.revealed,
  };
}

/** Discovery grants gems immediately; these classes stay off the selectable
 *  pool until activated. Merely opening the Vault never activates them. */
export function pendingClassUnlocks(a: Account): Unlockable[] {
  return UNLOCK_CATALOG.filter(u => u.kind === 'class' && isUnlockOwned(a, u)
    && a.pendingClassUnlocks.has(u.payload.classId));
}

/** Activate selection for a discovered class, without spending or re-granting gems. */
export function acknowledgeClassUnlock(a: Account, u: Unlockable): boolean {
  return u.kind === 'class' && isUnlockOwned(a, u) && a.pendingClassUnlocks.delete(u.payload.classId);
}

/** THE CLAIM — grant an EARNED entry outright: the world's own door, never
 *  the pour's. Gates read through `view` (a merged ledger) when given;
 *  the grant always lands on the real account. False = not earned, owned
 *  already, or its gates still hold it shut. */
export function claimClassUnlock(a: Account, u: Unlockable, view?: Readonly<Record<string, number>>): boolean {
  if (!u.earned || isUnlockOwned(a, u)) return false;
  const probe: Account = view ? { ...a, ledger: view } : a;
  if (!isUnlockVisible(probe, u)) return false;
  delete a.invested[u.id];
  grantUnlock(a, u);
  if (u.kind === 'class') a.pendingClassUnlocks.add(u.payload.classId);
  return true;
}

/** THE SETTLE — claim every earned entry whose gates hold, to a fixed point
 *  (a claim may open a chained card whose objective already stands).
 *  Idempotent and cheap (a few dozen rows): the live run's sweep, the Vault
 *  render, the class deal and the run's end all call it. Returns what was
 *  claimed, for the notices. Caller saves. */
export function settleClassUnlocks(a: Account, view?: Readonly<Record<string, number>>): Unlockable[] {
  const out: Unlockable[] = [];
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of UNLOCK_CATALOG) {
      if (u.kind === 'class' && claimClassUnlock(a, u, view)) { out.push(u); grew = true; }
    }
  }
  return out;
}

/** Reconcile authored additions once after account loading, before any gem
 * rolls. Never change the pool in the middle of a seeded recall or reward. */
export function reconcileClassBundleGems(a: Account): void {
  // Retired bundles keep already-granted gems. Unspent investments transfer
  // once to discovery; overflow funds later deliberate draws, never vanishes.
  if (!MEMORY_UNLOCK_CFG.legacyGemBundles) {
    const target = MEMORY_UNLOCKS.find(r => r.tier === 'discovery');
    if (target) for (const u of UNLOCK_CATALOG) {
      if (u.kind !== 'skill' && u.kind !== 'support') continue;
      const held = investedToward(a, u);
      if (held > 0) a.invested[target.id] = (a.invested[target.id] ?? 0) + held;
      delete a.invested[u.id];
    }
  }
  for (const b of CLASS_BUNDLES) if (a.unlockedClasses.has(b.classId)) {
    for (const id of b.skillIds) a.unlockedSkills.add(id);
    for (const id of b.supportIds ?? []) a.unlockedSupports.add(id);
  }
}

/** Deliberate rewards differ from drops: discovery alone cannot select a class's
 * skills. Shared skills remain selectable through any activated class or an
 * independent grant. Ambiguous legacy pending-only grants stay drop-only. */
export function isSkillUnlockedForSelection(a: Account, id: string): boolean {
  if (!a.unlockedSkills.has(id)) return false;
  if (STARTER_SKILLS.includes(id) || a.explicitSkillUnlocks.has(id)) return true;
  const owners = CLASS_BUNDLES.filter(b => b.skillIds.includes(id));
  if (owners.some(b => isClassUnlocked(a, b.classId))) return true;
  return !owners.some(b => a.pendingClassUnlocks.has(b.classId));
}

/** Every ledger key any class objective names, as key → the LARGEST count
 *  asked (presence keys 1; play thresholds their milestone key at 1). The
 *  dev tab's "stamp every objective" lever and the probe's reachability
 *  walk both derive from this, so QA and invariants can never drift from
 *  the authored web. */
export function classObjectiveNeeds(): Record<string, number> {
  const needs: Record<string, number> = {};
  for (const u of UNLOCK_CATALOG) {
    if (u.kind !== 'class' || !u.earned) continue;
    for (const r of u.reqAnyOf ?? []) {
      if (r.ledger !== undefined) needs[r.ledger] = Math.max(needs[r.ledger] ?? 0, r.n ?? 1);
      if (r.classLevel !== undefined) {
        const k = classLevelLedgerKey(r.classLevel.classId, r.classLevel.level);
        needs[k] = Math.max(needs[k] ?? 0, 1);
      }
    }
  }
  return needs;
}

/** The keys alone (see classObjectiveNeeds). */
export function classObjectiveKeys(): string[] {
  return Object.keys(classObjectiveNeeds());
}

/** THE CLASS-MILESTONE DERIVATION (the reached_level_15 lesson, per class):
 *  every level the STATIC catalog asks of THIS class — objective
 *  `classLevel` avenues (currently the mastery rungs) — so the XP sweep stamps exactly
 *  these beside CLASS_LEVEL_MILESTONES. Authoring a class-level gate
 *  anywhere in the catalog registers its stamp BY CONSTRUCTION. */
const classMilestoneCache = new Map<string, number[]>();
export function catalogClassLevelMilestones(classId: string): number[] {
  const hit = classMilestoneCache.get(classId);
  if (hit) return hit;
  const out = new Set<number>();
  const RE = new RegExp(`^${classLevelLedgerKey(classId, 0).slice(0, -1)}(\\d+)$`);
  for (const u of UNLOCK_CATALOG) {
    for (const need of gateClassLevelNeeds(u.reqAnyOf)) if (need.classId === classId) out.add(need.level);
    const keys = [
      ...(u.reqLedger ? (Array.isArray(u.reqLedger) ? u.reqLedger : [u.reqLedger]) : []),
      ...Object.keys(u.reqLedgerCounts ?? {}),
    ];
    for (const k of keys) { const m = RE.exec(k); if (m) out.add(Number(m[1])); }
  }
  const list = [...out].sort((x, y) => x - y);
  classMilestoneCache.set(classId, list);
  return list;
}

export function isUnlockOwned(a: Account, u: Unlockable): boolean {
  switch (u.kind) {
    case 'power': return a.reliquary.rank >= u.payload.rank;
    case 'storage': return a.reliquary.stash.pages >= u.payload.rank;
    case 'slot':    return a.unlockedSlots.has(u.payload.slotCount);
    // The earned bundle gates discovery chains and rewards. Class selection
    // separately requires isClassUnlocked (the deliberate Vault activation).
    case 'class':   return a.unlockedClasses.has(u.payload.classId);
    case 'classtier': return a.unlockedClassTiers.has(u.id);
    case 'skill':   return u.payload.skillIds.every(id => a.unlockedSkills.has(id));
    case 'support': return u.payload.supportIds.every(id => a.unlockedSupports.has(id));
    case 'memory': return false;
    case 'feature': return a.features.has(u.payload.flag);
    case 'package': return a.packageUnlocks.has(u.payload.tierId ?? u.payload.packageId);
    // A graft is NEVER owned — the repeatable charge's whole identity. Its
    // armed state hides the entry instead (isUnlockVisible), so the shelf
    // reads honestly in both phases: buyable, or standing down until spent.
    case 'graft':   return false;
    // A resurrection is a SERVICE, never a possession — completion clears
    // the card's fallen stamp, which retires the entry through visibility.
    case 'resurrect': return false;
  }
}

/** THE FALLEN SHELF's stock (the resurrection covenant, meta/modes.ts):
 *  one entry per roster vessel standing FALLEN, priced at the fee frozen on
 *  its card. Dynamic like the package rows — but ACCOUNT-derived, so only
 *  the account-passing folds (availableUnlocks, the census, the tooltip)
 *  ever see them; the static-catalog consumers (validation, the milestone
 *  derivation, account-less probes) are untouched by construction. */
export const resurrectUnlockId = (charId: string): string => `resurrect_${charId}`;

function resurrectUnlockables(a: Account): Unlockable[] {
  return a.roster.filter(r => r.fallen).map(r => ({
    id: resurrectUnlockId(r.charId), kind: 'resurrect' as const,
    label: `${r.name} (Level ${r.fallen!.level})`,
    description: `An Immortal vessel, fallen. The covenant holds what death cannot keep: `
      + `pour Mortal Essence from your mortal line to resurrect this character. Partial `
      + `investment stays across runs, and when the full fee stands the vessel wakes in `
      + `Lastlight, exactly as it fell (its build whole; its carry went to its own corpse).`,
    cost: r.fallen!.fee,
    payload: { charId: r.charId },
  }));
}

/** Content-package configuration purchases, generated from the registry: one
 *  BASE entry per non-substrate package, plus one per INVESTMENT TIER. The base
 *  is gated by the package's unlock predicate (e.g. Breach appears once you've
 *  opened one); each tier surfaces once the prior tier is owned and its own
 *  milestone is earned (Seal 5 Breaches → Investigation). */
function packageUnlockables(): Unlockable[] {
  const out: Unlockable[] = [];
  for (const p of PACKAGES) {
    if (p.alwaysOn) continue;
    out.push({
      id: `pkg_${p.id}`, kind: 'package',
      // A pressureless package is a PLACE the purchase itself opens — nothing
      // ran before buying it, so "Configurable" (tuning an already-live
      // feature) would mislabel it.
      label: p.pressureless ? p.label : `${p.label}: Configurable`,
      description: p.blurb, cost: p.cost,
      payload: { packageId: p.id },
    });
    for (const t of p.tiers ?? []) {
      out.push({
        id: `pkg_${p.id}_${t.id}`, kind: 'package',
        label: `${p.label}: ${t.label}`, description: t.requirement, cost: t.cost,
        payload: { packageId: p.id, tierId: t.id },
      });
    }
  }
  return out;
}

/** Static catalog + the dynamic package purchases — plus, when an account
 *  is handed over, its own FALLEN-vessel resurrections (account-derived
 *  stock; account-less callers keep the pure static view). */
export function allUnlockables(a?: Account): Unlockable[] {
  return [...UNLOCK_CATALOG.filter(u => MEMORY_UNLOCK_CFG.legacyGemBundles || (u.kind !== 'skill' && u.kind !== 'support')),
    ...packageUnlockables(), ...(a ? [...resurrectUnlockables(a), ...reliquaryUnlockables(a)] : [])];
}

/** Account-owned ladders use the ordinary card, pour, receipt and gate path. */
export function reliquaryUnlockables(a: Account): Unlockable[] {
  const r = a.reliquary, s = r.stash;
  const out: Unlockable[] = [];
  // Keep one compact receipt for each ladder on the ordinary Owned shelf.
  if (r.rank > 0) out.push({ id: `reliquary_power_${r.rank}`, kind: 'power',
    label: `Reliquary Empowerment ${r.rank}`, cost: 0,
    description: `Active Relics are empowered by ${Math.round(reliquaryPower(r) * 100)}% across every life.`, payload: { rank: r.rank } });
  if (s.pages > RELIC_STASH.initialPages) out.push({ id: `relic_stash_${s.pages}`, kind: 'storage',
    label: `Relic Stash: ${s.pages} Pages`, cost: 0,
    description: `${s.pages} pages of account storage at the Oracle.`, payload: { rank: s.pages } });
  if (r.rank < RELIQUARY_CFG.maxRank) out.push({ id: `reliquary_power_${r.rank + 1}`, kind: 'power',
    label: `Reliquary Empowerment ${r.rank + 1}`, cost: reliquaryCost(r), reqLedger: RELIQUARY_CFG.attunement,
    description: `Empower active Relics by another ${RELIQUARY_CFG.powerPerRank * 100}%. Current empowerment: +${Math.round(reliquaryPower(r) * 100)}%. Applies across every life.`, payload: { rank: r.rank + 1 } });
  if (s.pages < RELIC_STASH.maxPages) out.push({ id: `relic_stash_${s.pages + 1}`, kind: 'storage',
    label: `Relic Stash: Page ${s.pages + 1}`, cost: stashPageCost(RELIC_STASH, s),
    description: `Add a ${RELIC_STASH.board.w} × ${RELIC_STASH.board.h} page to your account's Oracle storage.`, payload: { rank: s.pages + 1 } });
  return out;
}

/** Is this unlock visible/purchasable yet (its gate met)? Static entries gate on
 *  sequencing/level/ledger; package BASE entries on the unlock predicate; package
 *  TIER entries on (base owned + every prior tier owned + this tier's milestone). */
export function isUnlockVisible(a: Account, u: Unlockable): boolean {
  if (u.kind === 'power' || u.kind === 'storage') return a.features.has(FEATURE.RELIQUARY)
    && u.payload.rank === (u.kind === 'power' ? a.reliquary.rank : a.reliquary.stash.pages) + 1 && staticGateMet(a, u);
  if (!MEMORY_UNLOCK_CFG.legacyGemBundles && (u.kind === 'skill' || u.kind === 'support')) return false;
  if (u.id === 'feat_unlock_all_gems' && !MEMORY_UNLOCK_CFG.showDebugCodex) return false;
  if (u.kind === 'memory') {
    const def = memoryUnlockDef(u.payload.memoryUnlockId);
    return !!def && memoryUnlockCandidates(a, def).length > 0 && staticGateMet(a, u);
  }
  // A graft stands down while its charge is ARMED (bought, unspent): the
  // shelf offers it again only once a run's beginning consumes the charge.
  if (u.kind === 'graft' && a.skillGraft) return false;
  // A resurrection stands only while its vessel still lies FALLEN — the
  // grant clears the stamp, and a released (deleted) vessel takes its
  // entry with it. Read LIVE off the roster so a stale captured entry
  // (the pour's own held card) can never double-charge a risen vessel.
  if (u.kind === 'resurrect') {
    return !!a.roster.find(r => r.charId === u.payload.charId)?.fallen;
  }
  if (u.kind !== 'package') return staticGateMet(a, u);
  const pkg = PACKAGE_BY_ID[u.payload.packageId];
  if (!pkg) return false;
  if (!u.payload.tierId) return unlockMet(pkg.unlock, a); // base config
  if (!a.packageUnlocks.has(pkg.id)) return false;        // need the base unlock first
  const tiers = pkg.tiers ?? [];
  const idx = tiers.findIndex(t => t.id === u.payload.tierId);
  if (idx < 0) return false;
  for (let i = 0; i < idx; i++) if (!a.packageUnlocks.has(tiers[i].id)) return false; // staggered
  return tiers[idx].test({ account: a, ledger: a.ledger });
}

/** Sequencing + account-level + (for features) a lifetime-ledger milestone
 *  gate. Non-package. */
function staticGateMet(a: Account, u: Unlockable): boolean {
  if (u.requiresMemoryCommission && !memoryCatalog().some(c => memoryCommissionReady(a, c.kind, c.id, VENDOR_CFG.commission.need))) return false;
  if ((u.reqLevel ?? 0) > a.level) return false;
  // GENERIC LADDERS: hidden until the named catalog unlock(s) are OWNED — the
  // class-slot sequence is pure prior-purchase gating, no account level at all.
  if (u.requiresUnlock) {
    const needs = Array.isArray(u.requiresUnlock) ? u.requiresUnlock : [u.requiresUnlock];
    for (const id of needs) {
      const dep = CATALOG_BY_ID.get(id);
      if (!dep || !isUnlockOwned(a, dep)) return false;
    }
  }
  // reqLedger may be a SINGLE key or MANY (all required, ANDed) — e.g. a far caravan
  // tier needs BOTH a level milestone AND unmade_slain. Generic to every kind.
  if (u.reqLedger) {
    const keys = Array.isArray(u.reqLedger) ? u.reqLedger : [u.reqLedger];
    if (keys.some(k => (a.ledger[k] ?? 0) < 1)) return false;
  }
  // reqLedgerCounts gates on accumulated TALLIES (die 20 times, sail 5 voyages)
  // rather than mere presence — the counted-milestone form of the same seam.
  if (u.reqLedgerCounts) {
    for (const [k, n] of Object.entries(u.reqLedgerCounts)) {
      if ((a.ledger[k] ?? 0) < n) return false;
    }
  }
  // THE MOOT LAW: pool-fed purchases (class slots) hide until the unlocked-
  // class pool is deep enough for the purchase to actually do something.
  if (u.reqClasses !== undefined && unlockedClassCount(a) < u.reqClasses) return false;
  // Sequential feature ladders (e.g. Mireille life → mana → XP buff).
  if (u.kind === 'feature' && u.requiresFeature && !a.features.has(u.requiresFeature)) return false;
  // THE GATEWORK: one held avenue opens the any-of group (gates.ts).
  if (!gateMet(a, u.reqAnyOf, 'any', ownedUnlockById(a))) return false;
  return true;
}

/** The catalog's own ownership predicate as a closure — what gates.ts
 *  `unlock` avenues resolve through (the fabric leaf never imports us). */
export function ownedUnlockById(a: Account): (id: string) => boolean {
  return id => {
    const dep = CATALOG_BY_ID.get(id);
    return !!dep && isUnlockOwned(a, dep);
  };
}

/** Do the entry's STRUCTURAL prereqs hold — the chain part of the gate
 *  (requiresUnlock all owned + requiresFeature owned), dynamics ignored?
 *  The sealed-card test: structure met + dynamics unmet = show it locked. */
function structuralPrereqsMet(a: Account, u: Unlockable): boolean {
  if (u.requiresUnlock) {
    const needs = Array.isArray(u.requiresUnlock) ? u.requiresUnlock : [u.requiresUnlock];
    for (const id of needs) {
      const dep = CATALOG_BY_ID.get(id);
      if (!dep || !isUnlockOwned(a, dep)) return false;
    }
  }
  if (u.kind === 'feature' && u.requiresFeature && !a.features.has(u.requiresFeature)) return false;
  return true;
}

/** One spoken line per DYNAMIC gate on the entry, each marked met/unmet —
 *  what a sealed card prints. reqAnyOf rows come first (the avenue group:
 *  any ONE ✓ opens it); the ANDed ledger/level gates follow. */
export function sealedGateLines(a: Account, u: Unlockable): { label: string; met: boolean; anyOf: boolean }[] {
  const owned = ownedUnlockById(a);
  const out: { label: string; met: boolean; anyOf: boolean }[] = [];
  if (u.requiresMemoryCommission && !memoryProgressionOpen(a)) out.push({ label: powerProgressionRefusal('awakening'), met: false, anyOf: false });
  if (u.requiresMemoryCommission) out.push({ label: 'an awakened skill or an indexed support',
    met: memoryCatalog().some(c => memoryCommissionReady(a, c.kind, c.id, VENDOR_CFG.commission.need)), anyOf: false });
  for (const r of u.reqAnyOf ?? []) {
    out.push({ label: gateRowLabel(r), met: gateRowMet(a, r, owned), anyOf: true });
  }
  const ledgerRows: GateRow[] = [];
  if (u.reqLedger) {
    for (const k of Array.isArray(u.reqLedger) ? u.reqLedger : [u.reqLedger]) ledgerRows.push({ ledger: k });
  }
  for (const [k, n] of Object.entries(u.reqLedgerCounts ?? {})) ledgerRows.push({ ledger: k, n });
  for (const r of ledgerRows) out.push({ label: gateRowLabel(r), met: gateRowMet(a, r, owned), anyOf: false });
  if (u.reqLevel) out.push({ label: `account level ${u.reqLevel}`, met: a.level >= u.reqLevel, anyOf: false });
  if (u.reqClasses !== undefined) {
    out.push({ label: `${u.reqClasses} classes unlocked`, met: unlockedClassCount(a) >= u.reqClasses, anyOf: false });
  }
  return out;
}

/** SEALED entries — tease-marked rows whose chain is walked but whose
 *  dynamic gates still hold them shut: the Vault hangs these as locked
 *  cards (named, priced, avenues printed) instead of hiding them. Never
 *  purchasable: availableUnlocks omits them and applyUnlock re-checks
 *  visibility — the seal is display truth, not a second buy path. */
export function sealedUnlocks(a: Account): { u: Unlockable; lines: { label: string; met: boolean; anyOf: boolean }[] }[] {
  return allUnlockables()
    .filter(u => u.tease && !isUnlockOwned(a, u) && !isUnlockVisible(a, u) && structuralPrereqsMet(a, u))
    .map(u => ({ u, lines: sealedGateLines(a, u) }));
}

/** THE MILESTONE DERIVATION (the reached_level_15 lesson — a gate whose
 *  signal never stamps is a dead gate): every level the STATIC catalog asks
 *  about, via `level` avenues in reqAnyOf groups AND reached_level_<n> keys
 *  named in reqLedger rows. The XP sweep (world.ts grantSeatXp) stamps
 *  exactly these beside its standing decade keys — authoring a level gate
 *  anywhere in the catalog registers its stamp BY CONSTRUCTION. */
let levelMilestoneCache: number[] | null = null;
export function catalogLevelMilestones(): number[] {
  if (levelMilestoneCache) return levelMilestoneCache;
  const out = new Set<number>();
  // The regex derives from the ONE key spelling (reachedLevelKey) — the
  // extractor and the stamps can never drift apart.
  const RE = new RegExp(`^${reachedLevelKey(0).slice(0, -1)}(\\d+)$`);
  for (const u of UNLOCK_CATALOG) {
    for (const n of gateLevelNeeds(u.reqAnyOf)) out.add(n);
    const keys = u.reqLedger ? (Array.isArray(u.reqLedger) ? u.reqLedger : [u.reqLedger]) : [];
    for (const k of [...keys, ...Object.keys(u.reqLedgerCounts ?? {})]) {
      const m = RE.exec(k);
      if (m) out.add(Number(m[1]));
    }
  }
  return levelMilestoneCache = [...out].sort((x, y) => x - y);
}

/** Entries the player can SEE in the Vault (gate met, not owned) — the
 *  account pass folds its own dynamic stock (fallen-vessel resurrections)
 *  onto the shelf beside the static catalog. */
export function availableUnlocks(a: Account): Unlockable[] {
  // Earned entries are never STOCK (the shrouded wall shows them instead).
  return allUnlockables(a).filter(u => !u.earned && isUnlockVisible(a, u) && !isUnlockOwned(a, u));
}

/** "This pour finished" — ownership for the permanent kinds, the state
 *  change for the service kinds (the graft's armed charge, a resurrection's
 *  cleared stamp, which is never "owned"). ONE predicate for the Vault's
 *  completion toasts and the seal log — the panels never re-derive it. */
export function unlockCompleted(a: Account, u: Unlockable, memorySequence = 0): boolean {
  if (u.kind === 'memory') return (a.memoryReceipts[u.id]?.sequence ?? 0) > memorySequence;
  if (u.kind === 'graft') return a.skillGraft;
  if (u.kind === 'resurrect') return !a.roster.find(r => r.charId === u.payload.charId)?.fallen;
  return isUnlockOwned(a, u);
}

/** Packages the player can't tune YET (unlock unmet, not purchased), shown with
 *  their requirement. `active` distinguishes a base-game feature that is already
 *  RUNNING (just not yet tunable) from an opt-in package that is fully OFF — so
 *  the Vault never tells the player a live feature is "locked". */
export function lockedPackages(a: Account): { label: string; requirement: string; cost: number; active: boolean }[] {
  return PACKAGES
    .filter(p => !p.alwaysOn && !a.packageUnlocks.has(p.id) && !unlockMet(p.unlock, a))
    .map(p => ({ label: p.label, requirement: p.unlock.label, cost: p.cost, active: p.defaultEnabled }));
}

// ---------------------------------------------------------------------------
//  THE VAULT SHELVES — the store's organization as DATA (the character
//  sheet's data/sheet.ts pattern: the UI walks this list and knows nothing
//  else). Browse shelves seat catalog KINDS; the rumor wall hangs where its
//  shelf says; the Owned shelf is the trophy case, off the buying floor
//  entirely so it never clutters a shopping read. Adding a catalog kind =
//  seat it here (balance/probe_unlocks.ts pins the contract). An unseated
//  kind still SURFACES — it folds to the `fallback` shelf, the sheet's
//  nothing-is-ever-invisible law — but the probe fails on it, so the fold
//  stays a safety net, never a shipped state.
// ---------------------------------------------------------------------------

export type UnlockKind = Unlockable['kind'];

export interface VaultTabDef {
  id: string;
  /** The tab face — keep it one short word; the blurb carries the detail. */
  label: string;
  /** The tab's hover story (rides the face's native title). */
  blurb: string;
  /** Catalog kinds seated on this shelf, in DISPLAY order (browse shelves
   *  only; a multi-kind shelf groups its floor under these, in this order). */
  kinds?: readonly UnlockKind[];
  /** This shelf also hangs the shrouded class-rumor wall. */
  rumors?: boolean;
  /** The trophy case: lists everything OWNED (grouped by kind) instead of a
   *  buying floor. Exactly one shelf wears this. */
  owned?: boolean;
  /** Unseated kinds fold here. Exactly one browse shelf wears this. */
  fallback?: boolean;
  /** Spoken when the shelf has nothing to sell right now (a generic line
   *  covers shelves that don't author one). */
  emptyNote?: string;
}

export const VAULT_TABS: readonly VaultTabDef[] = [
  {
    // THE FALLEN SHELF — deliberately FIRST (her ruling 2026-08-26: dead
    // Immortal vessels lead the end-of-run Vault): the mystery law keeps it
    // invisible until a vessel actually lies fallen, so the store's first
    // face is also its rarest.
    id: 'fallen', label: 'Fallen', kinds: ['resurrect'],
    blurb: 'Immortal vessels death has taken hold of. Pour Mortal Essence from your mortal runs to resurrect one. Partial investment keeps across runs, and the vessel wakes in Lastlight the moment its full fee stands.',
    emptyNote: 'No vessel lies fallen. May it stay that way.',
  },
  {
    id: 'classes', label: 'Classes', kinds: ['slot', 'class', 'classtier'], rumors: true,
    blurb: 'Discover classes through play. Newly earned classes wait here to be unlocked, free of charge. Class Slots offer more choices at each new beginning; Mastery opens alternate starting skills.',
    emptyNote: 'More class choices and Mastery become available as your account grows.',
  },
  {
    id: 'gems', label: 'Memories & Power', kinds: ['memory', 'power', 'skill', 'support', 'graft'],
    blurb: 'Discover Memories, awaken deeper arts, and unlock lasting account power.',
    emptyNote: 'No eligible Memories remain for these purchases. New catalog entries join automatically.',
  },
  {
    id: 'town', label: 'Town', kinds: ['feature', 'storage'], fallback: true,
    blurb: 'Lastlight grows by purchase: stations and services, counter privileges, hulls and routes, and account-wide features.',
    emptyNote: 'Nothing to raise in town right now; milestones out in the world surface more.',
  },
  {
    id: 'events', label: 'Events', kinds: ['package'],
    blurb: 'World-event packages and their deeper tiers: owning one opens its dials on the Expedition screen.',
    emptyNote: 'No event configurations are open; meet an event out in the world and its package surfaces here.',
  },
  {
    id: 'owned', label: 'Owned', owned: true,
    blurb: 'Everything this account has already claimed, shelved by kind: the part of the store that is yours now.',
  },
];

/** Kind → display name for the section headers over the cards (a card never
 *  prints its own kind — the header says it) and the hover story's meta
 *  line. Total by type: a new catalog kind fails the build here until it
 *  gets a name. */
export const VAULT_KIND_LABELS: Record<UnlockKind, string> = {
  power: 'Account Power', storage: 'Storage',
  slot: 'Class Slots', class: 'Classes', classtier: 'Mastery', skill: 'Skill Pools',
  support: 'Support Pools', feature: 'Town & Features', package: 'World Events',
  graft: 'Skill Grafts', resurrect: 'Fallen Vessel', memory: 'Memory Unlocks',
};

/** The shelf a kind sits on — its explicit seat first, else the fallback
 *  shelf (the fold law: never invisible; the probe keeps the fold unused). */
export function vaultSeatOf(kind: UnlockKind): VaultTabDef {
  return VAULT_TABS.find(t => t.kinds?.includes(kind))
    ?? VAULT_TABS.find(t => t.fallback)
    ?? VAULT_TABS[0];
}

/** Every live kind in shelf order (seated kinds as authored, unseated
 *  stragglers appended) — the ONE display ordering for kind groupings. */
export function vaultKindOrder(): UnlockKind[] {
  const seen = new Set<UnlockKind>();
  const out: UnlockKind[] = [];
  for (const t of VAULT_TABS) for (const k of t.kinds ?? []) {
    if (!seen.has(k)) { seen.add(k); out.push(k); }
  }
  for (const u of allUnlockables()) if (!seen.has(u.kind)) { seen.add(u.kind); out.push(u.kind); }
  return out;
}

/** THE GROWING STORE — the shelving dials (mutable data, probe-dialable;
 *  never literals in the UI). The tab strip is FURNITURE THE ACCOUNT EARNS,
 *  and there are TWO roads to earning it — either suffices, both under the
 *  same span floor (`stripMinShelves` would-be shelves visible):
 *    THE CLAIMED ROAD — `stripMinOwned` unlocks bought (the collection
 *    needs organizing);
 *    THE SEEN ROAD — `stripMinStock` purchasables on display at once (an
 *    account that PLAYS before buying floods the wall with earned stock —
 *    quest package, dummy, campfire, oracle at level 5 — and a wall that
 *    big without furniture is the exact clutter the shelves exist to
 *    solve; "come across or seen or unlocked", the ask verbatim).
 *  Below both, the Vault renders as one flat wall — the young store; the
 *  raise is monotone in practice (ownership never regresses, and stock
 *  only grows until buying starts — at which point the claimed road is
 *  nearly walked anyway). If late-game stock ever dries below every dial,
 *  the flat wall still shows EVERYTHING visible — nothing is ever lost to
 *  the furniture either way. */
export const VAULT_SHELF_CFG = {
  stripMinShelves: 2,
  stripMinOwned: 3,
  stripMinStock: 6,
};

/** One shelf's live census — the ONE visibility truth the UI and the probe
 *  both read. THE MYSTERY LAW: a shelf with nothing to show does not exist —
 *  no dimmed faces naming categories the account hasn't met; the player
 *  learns the store's SHAPE by playing. A browse shelf surfaces only with
 *  stock to sell or rumors to whisper; the Owned shelf stands once anything
 *  is claimed. (When the gatework's SEALED cards land, a walked chain's
 *  next link is earned knowledge — the sealed lane joins this census and
 *  its visibility predicate then.) */
export interface VaultShelfCensus {
  tab: VaultTabDef;
  /** Purchasable now, seated here (browse shelves; empty on the Owned shelf). */
  stock: Unlockable[];
  /** Owned entries — ALL of them on the Owned shelf, the seated share elsewhere. */
  owned: Unlockable[];
  /** Rumors hanging here (rumor shelves only — the whole undiscovered list,
   *  in catalog order: rumor cards are INDEX-addressed off exactly this). */
  rumors: Unlockable[];
  /** Earned classes waiting for an explicit Unlock click; never priced stock. */
  pending: Unlockable[];
  /** The mystery law's verdict for this shelf. */
  visible: boolean;
}

export function vaultShelfCensus(a: Account): VaultShelfCensus[] {
  const avail = availableUnlocks(a);
  const ownedAll = allUnlockables(a).filter(u => isUnlockOwned(a, u)
    && !(u.kind === 'class' && a.pendingClassUnlocks.has(u.payload.classId)));
  const rumorsAll = shroudedClassUnlocks(a);
  const pendingAll = pendingClassUnlocks(a);
  return VAULT_TABS.map(t => {
    const stock = t.owned ? [] : avail.filter(u => vaultSeatOf(u.kind).id === t.id);
    const owned = t.owned ? ownedAll : ownedAll.filter(u => vaultSeatOf(u.kind).id === t.id);
    const rumors = t.rumors ? rumorsAll : [];
    const pending = t.owned ? [] : pendingAll.filter(u => vaultSeatOf(u.kind).id === t.id);
    return {
      tab: t, stock, owned, rumors, pending,
      visible: t.owned ? owned.length > 0 : stock.length > 0 || rumors.length > 0 || pending.length > 0,
    };
  });
}

/** Is the shelving raised (VAULT_SHELF_CFG — see THE GROWING STORE)? Takes
 *  a prebuilt census so callers never pay the walk twice. */
export function vaultStripVisible(a: Account, census: VaultShelfCensus[] = vaultShelfCensus(a)): boolean {
  const ownedTotal = census.find(c => c.tab.owned)?.owned.length ?? 0;
  const stockTotal = census.reduce((n, c) => n + c.stock.length, 0);
  const span = census.filter(c => c.visible).length;
  return span >= VAULT_SHELF_CFG.stripMinShelves
    && (ownedTotal >= VAULT_SHELF_CFG.stripMinOwned || stockTotal >= VAULT_SHELF_CFG.stripMinStock);
}

// ---------------------------------------------------------------------------
//  THE INVESTMENT LANE — partial unlocks (the reckoning's own economy).
//
//  Mortal Essence never crosses between runs (account.ts sealReckoning), so a
//  rung dearer than one run's harvest must be buyable ACROSS runs: the player
//  POURS whatever they hold into any visible unlock (holding the card's
//  button — INVEST_CFG paces the pour), the poured amount persists on
//  Account.invested, and the unlock GRANTS the moment its full cost has
//  accumulated. Nothing is ever wasted; progress is always real. applyUnlock
//  remains the one-shot face of the same machinery (pour the full remainder),
//  so every pre-reckoning caller and probe keeps its exact semantics.
// ---------------------------------------------------------------------------

/** The pour's pacing — how holding an unlock's button drains the pool into
 *  it. Compounding: cheap rungs land in a beat, the deepest in a few held
 *  seconds. Pure UI data (the invest math itself is instant); tune freely. */
export const INVEST_CFG = {
  /** Units/second the moment the pour starts. */
  baseRate: 16,
  /** The rate multiplies by this for each second held (compound ramp). */
  accel: 2.6,
  /** Rate ceiling, units/second. */
  maxRate: 600,
  /** Pour tick, ms (UI granularity only). */
  tickMs: 50,
  /** A bare tap invests this much — the smallest deliberate step. */
  tapAmount: 1,
  /** THE CLICK/HOLD SEAM (ms): a press released inside this window is a
   *  CLICK — the outright unlock when the pool covers the remainder (the
   *  typical intent, so "Unlock" stays the button's one word); a press held
   *  past it becomes the POUR, the quiet investing fallback that also works
   *  when the pool falls short. */
  holdDelayMs: 280,
};

/** Mortal Essence already poured into an unlock (0 for untouched entries). */
export function investedToward(a: Account, u: Unlockable): number {
  if (u.kind === 'power') return u.payload.rank === a.reliquary.rank + 1 ? a.reliquary.invested : 0;
  if (u.kind === 'storage') return u.payload.rank === a.reliquary.stash.pages + 1 ? a.reliquary.stash.invested : 0;
  return Math.max(0, Math.floor(a.invested[u.id] ?? 0));
}

/** What completing this unlock still costs (cost − invested, floored at 0 —
 *  a catalog retune below an existing investment owes nothing more). */
export function remainingCost(a: Account, u: Unlockable): number {
  return Math.max(0, u.cost - investedToward(a, u));
}

/** GRANT — reached through completed investment or an earned discovery.
 *  A class bundle records discovery; its pending stamp holds selection for
 *  the Vault click, while its gems enter the drop pool (Sets dedupe overlap
 *  with owned pools) — and realizing the class later opens its vocation
 *  chain for free. */
function grantUnlock(a: Account, u: Unlockable): void {
  switch (u.kind) {
    case 'power': case 'storage': break; // Their bounded account ladder pour grants atomically.
    case 'slot':    a.unlockedSlots.add(u.payload.slotCount); break;
    case 'class':
      a.unlockedClasses.add(u.payload.classId);
      for (const id of u.payload.skillIds) a.unlockedSkills.add(id);
      for (const id of u.payload.supportIds) a.unlockedSupports.add(id);
      break;
    case 'classtier':
      a.unlockedClassTiers.add(u.id);
      for (const id of u.payload.skillIds) { a.unlockedSkills.add(id); a.explicitSkillUnlocks.add(id); }
      break;
    case 'skill':   for (const id of u.payload.skillIds) { a.unlockedSkills.add(id); a.explicitSkillUnlocks.add(id); } break;
    case 'support': for (const id of u.payload.supportIds) a.unlockedSupports.add(id); break;
    case 'memory': break; // Completed atomically by investUnlock before any currency is consumed.
    case 'feature': a.features.add(u.payload.flag); break;
    case 'package': a.packageUnlocks.add(u.payload.tierId ?? u.payload.packageId); break;
    case 'graft':   a.skillGraft = true; break;
    case 'resurrect': {
      // THE RESURRECTION: clear the card's fallen stamp — the vessel is
      // playable again the moment the pour completes (its slot save was
      // never touched: it stands in the sanctuary exactly as it fell).
      const entry = a.roster.find(r => r.charId === u.payload.charId);
      if (entry) delete entry.fallen;
      break;
    }
  }
}

/** POUR up to `amount` Mortal Essence into an unlock. Clamped by the pool
 *  and by what completing still costs; grants (and clears the investment
 *  entry) the moment the full cost stands. The gate is exactly the
 *  visibility gate — an invisible or owned entry takes nothing. Returns the
 *  units actually poured (0 = refused or nothing to pour). Caller saves. */
export function investUnlock(a: Account, u: Unlockable, amount: number): number {
  // THE EARNED LAW: no pour reaches an earned entry — the world claims it.
  if (u.earned || isUnlockOwned(a, u) || !isUnlockVisible(a, u)) return 0;
  if (u.kind === 'power') return investReliquary(a, amount);
  if (u.kind === 'storage') return investRelicStash(a, amount);
  const rem = remainingCost(a, u);
  if (u.kind === 'memory') {
    const def = memoryUnlockDef(u.payload.memoryUnlockId);
    if (!def || !Number.isFinite(amount)) return 0;
    const put = Math.min(Math.max(0, Math.floor(amount)), Math.max(0, Math.floor(a.credits)), rem);
    const total = investedToward(a, u) + put;
    if (total >= u.cost && !grantMemoryUnlock(a, def)) return 0;
    a.credits -= put;
    const left = total >= u.cost ? total - u.cost : total;
    if (left > 0) a.invested[u.id] = left; else delete a.invested[u.id];
    return put;
  }
  if (rem === 0) {
    // A retuned catalog left an investment at/over the new cost: settle it.
    delete a.invested[u.id];
    grantUnlock(a, u);
    return 0;
  }
  const put = Math.min(Math.max(0, Math.floor(amount)), Math.max(0, Math.floor(a.credits)), rem);
  if (put <= 0) return 0;
  a.credits -= put;
  const now = investedToward(a, u) + put;
  if (now >= u.cost) {
    delete a.invested[u.id];
    grantUnlock(a, u);
  } else {
    a.invested[u.id] = now;
  }
  return put;
}

/** Buy an unlock outright — pour the full remainder in one motion. Mutates
 *  the account; returns false if unaffordable / already owned / gate unmet.
 *  Caller saves. (The historical one-click face; the buy gate is exactly
 *  the visibility gate, and prior partial investments count toward it.)
 *  Success = the full remainder poured and the grant fired — NOT ownership,
 *  which a repeatable kind (the graft) never reports. */
export function applyUnlock(a: Account, u: Unlockable): boolean {
  if (u.earned || isUnlockOwned(a, u) || !isUnlockVisible(a, u)) return false;
  const rem = remainingCost(a, u);
  if (a.credits < rem) return false;
  if (rem === 0) { investUnlock(a, u, 0); return true; } // the settle path granted
  return investUnlock(a, u, rem) === rem;
}
