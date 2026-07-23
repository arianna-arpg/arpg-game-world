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
//   THE DISCOVERY WEB (ClassBundleDef.discover) — non-starter classes are
//   shrouded rumors until FOUND: played into (per-class level milestones),
//   chained onto (own the parent class), or learned the hard way (the world's
//   own ledger facts — seized by a grip, a trap sprung underfoot). Probe:
//   balance/probe_unlocks.ts proves the web reachable + the laws honest.
// ---------------------------------------------------------------------------

import {
  FEATURE, LEDGER_ACCOUNT_DEATHS, LEDGER_FLASK_LESSON, LEDGER_GEMDROP_PREFIX,
  LEDGER_VENDOR_BOUGHT, classLevelLedgerKey, reachedLevelKey, type Account,
} from './account';
import { gateLevelNeeds, gateMet, gateRowLabel, gateRowMet, type GateRow } from './gates';
import { VENDOR_CFG } from '../data/vendors';
import { LEDGER_ESSENCE_TOUCHED } from '../data/essences';
// Pure fabric leaves (no engine cycle): the HARD-LESSON ledger keys the
// discovery web reads — seized by a grip, sprung a trap with your own feet.
import { LEDGER_SEIZED } from '../engine/grab';
import { LEDGER_TRAP_SPRUNG } from '../engine/trapworks';
import { LEDGER_MERC_MARKET_MET } from './mercs';
import { IMMORTAL_CFG } from './modes';
import { CLASSES } from '../data/classes';
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
}

export type Unlockable =
  | (UnlockBase & { kind: 'slot'; payload: { slotCount: number } })
  | (UnlockBase & { kind: 'class'; payload: { classId: string; skillIds: string[]; supportIds: string[];
      /** The shrouded RUMOR line shown while the class is undiscovered
       *  (never the name/cost — see ClassDiscoverSpec.hint). */
      hint?: string } })
  | (UnlockBase & { kind: 'skill'; payload: { skillIds: string[] } })
  | (UnlockBase & { kind: 'support'; payload: { supportIds: string[] } })
  | (UnlockBase & { kind: 'feature'; requiresFeature?: string; payload: { flag: string } })
  | (UnlockBase & { kind: 'package'; payload: { packageId: string; tierId?: string } });

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
 *    2. its thematic skill/support gems join the DROP pool (which also makes
 *       the class's own kit re-droppable — bar gems are granted on pick, but
 *       only unlocked gems can be found again),
 *    3. and, downstream for free, realizing the class in a run opens its home
 *       VOCATION chain at the quartermaster (vocations key off the character's
 *       class — no extra wiring here).
 *  Adding a class to the game = one ClassDef + one entry here (plus,
 *  usually, a `discover` row — see THE DISCOVERY WEB above; a bundle
 *  without one is simply visible from the start). Gem-name lists in the
 *  Vault card are generated from the live registries, so renames never
 *  go stale. Starter classes (account.ts STARTER_CLASSES) need no bundle. */
/** THE DISCOVERY WEB — how a class SURFACES in the Vault at all.
 *
 *  "If someone doesn't know what they're looking for, they have to find
 *  what they're looking for first." A class bundle with a `discover` spec
 *  is INVISIBLE (a shrouded rumor card, hint only — never name or price)
 *  until its gate is met; only then does it become purchasable. The spec is
 *  pure authoring sugar: it COMPILES onto the same generic gates every
 *  unlock already rides (reqLedger / requiresUnlock), so the gate engine
 *  grew zero new switches. Three composable levers:
 *
 *    ledger   — world FACTS, ANDed. Two families:
 *               · play thresholds: classLevelLedgerKey('magician', 15) —
 *                 stamped by the level-up sweep for whatever class is being
 *                 PLAYED (account.ts CLASS_LEVEL_MILESTONES), so the
 *                 starting three branch into their kin by being lived in,
 *                 and any purchased class can gate deeper kin the same way;
 *               · hard lessons: any ledger key the world stamps —
 *                 LEDGER_SEIZED (a grip caught you → the Brawler),
 *                 LEDGER_TRAP_SPRUNG (the floor clicked under you → the
 *                 Trapper), 'crowned_killed', 'unmade_slain', … Learning by
 *                 doing — mostly by having it done to you.
 *    classes  — class bundle(s) that must be OWNED first (ids), for nested
 *               ladders: Magician L15 reveals the Necromancer; OWNING the
 *               Necromancer reveals the Summoner.
 *    hint     — the rumor line the shrouded card whispers. Point at the
 *               DEED, never the reward: the hint is a compass, not a
 *               catalog entry.
 *
 *  Absent `discover` = visible from the start (nothing forces mystery).
 *  Discovery is read live off the account ledger, so it survives every
 *  death by construction — and balance/probe_unlocks.ts walks the whole
 *  web each run to prove every class stays REACHABLE from the starters. */
export interface ClassDiscoverSpec {
  /** Account-ledger key(s) that must all be present (≥1). */
  ledger?: string | string[];
  /** Ledger COUNT thresholds (ANDed) — the counted-milestone form: "die
   *  eight times" is a discovery too (compiles to reqLedgerCounts). */
  ledgerCounts?: Record<string, number>;
  /** Class id(s) whose bundles must be OWNED first. */
  classes?: string | string[];
  /** The shrouded rumor line shown while undiscovered. */
  hint: string;
}

export interface ClassBundleDef {
  classId: string;
  cost: number;
  /** Flavor lead-in; the mechanical tail of the description is generated. */
  blurb: string;
  skillIds: string[];
  supportIds?: string[];
  /** THE DISCOVERY WEB row (see above). Absent = visible from the start. */
  discover?: ClassDiscoverSpec;
}

export const CLASS_BUNDLES: readonly ClassBundleDef[] = [
  // --- THE BLOOD LINE: the Warrior is the Strength branch — its road opens
  // the STR kin first, then the Prowess and Fortitude anchors; each anchor,
  // owned and lived in, opens its own deeper kin.
  { classId: 'berserker', cost: 240,
    blurb: 'Fury as a fighting style: heavy arcs, boiling blood, and the whole rage-fed Warpath.',
    skillIds: ['heavy_strike', 'whirlwind', 'dash',
      'berserk', 'bloodlust', 'soul_harvest', 'flame_imbuement', 'venom_ammunition', 'flame_blast'],
    discover: { ledger: classLevelLedgerKey('warrior', 15),
      hint: 'Some come back from the Warrior\'s road changed — louder, redder, faster than the line can hold.' } },
  // --- THE MIND LINE: the Magician is the Intelligence branch — played deep,
  // it opens its own INT kin first, then the doors into its constituent
  // Wisdom and Willpower schools; those chain onward by OWNERSHIP.
  { classId: 'sorcerer', cost: 150,
    blurb: 'The scholar of annihilation steps forward, frost ward in hand.',
    skillIds: ['infernal_ray', 'storm_call', 'ice_shield'],
    supportIds: ['spark_discipline'],
    discover: { ledger: classLevelLedgerKey('magician', 10),
      hint: 'Past the tenth circle of the Magician\'s study, the elements stop answering one at a time.' } },
  // --- THE SHADOW LINE: the Rogue is the Dexterity branch — its road forks
  // into the ranged and dueling crafts first, the darker and louder arts
  // after; the field disciplines chain by ownership.
  { classId: 'ranger', cost: 200,
    blurb: 'Death from afar — and the field disciplines that perfect the shot.',
    skillIds: ['piercing_arrow', 'fan_of_blades', 'quickstep'],
    supportIds: ['perfect_draw', 'wandering_mark'],
    discover: { ledger: classLevelLedgerKey('rogue', 10),
      hint: 'The alley teaches the knife. The treeline teaches something longer.' } },
  { classId: 'guardian', cost: 300,
    blurb: 'The unmoved wall, raised together with the Bulwark\'s wards, pacts, and reprisals.',
    skillIds: ['hammer_of_judgment', 'aegis_ward', 'rallying_howl',
      'iron_ward', 'magma_ward', 'transgression', 'pain_hounds', 'bristleback', 'soul_link',
      'stone_communion'],
    supportIds: ['stoneblood_conduit', 'bulwarks_tithe', 'warding_flesh'],
    discover: { ledger: classLevelLedgerKey('warrior', 15),
      hint: 'Veterans of the Warrior\'s road tell of a way of standing that armies name like a wall.' } },
  { classId: 'summoner', cost: 260,
    blurb: 'The shepherd of monsters, with the Hive\'s swarm and the voice that commands it.',
    skillIds: ['venom_bolt', 'summon_skeleton', 'summon_skeleton_archer',
      'summon_swarmlings', 'command_assault', 'gather_cinderkin'],
    supportIds: ['chitinous_brood', 'calcified_vigor', 'marrowbound_vigor', 'septic_bargain'],
    discover: { classes: 'necromancer',
      hint: 'The Necromancer raises what fell. A gentler shepherd asks the living to follow too.' } },
  { classId: 'swashbuckler', cost: 240,
    blurb: 'The duelist\'s stage: four blades\' worth of flourish, and the momentum to keep it rolling.',
    skillIds: ['surgical_strike', 'dash_strike', 'buckler_strike', 'wild_strike'],
    supportIds: ['momentum'],
    discover: { ledger: classLevelLedgerKey('rogue', 10),
      hint: 'Past the tenth quiet job, some knives start wanting an audience.' } },
  { classId: 'juggernaut', cost: 320,
    blurb: 'It hits, it takes hits, and it does not stop — and now it keeps the wake: votive flames, a lit vigil, and the last word.',
    // Frenzy rides along: it left the Rogue's (starter) bar in the parity
    // pass, so this bundle is what keeps the fast fury-feeder droppable.
    skillIds: ['piledriver', 'reckoning', 'stone_skin', 'frenzy',
      'cindershell', 'deathwatch', 'requiem'],
    supportIds: ['kindled_wake', 'victors_tempo', 'abundant_harvest'],
    discover: { classes: 'guardian',
      hint: 'The wall, taught to walk forward.' } },
  { classId: 'pyromancer', cost: 220,
    blurb: 'Everything burns eventually — these are the words for "now".',
    skillIds: ['flame_arrow', 'ignite', 'pillar_of_flame'],
    discover: { ledger: classLevelLedgerKey('magician', 10),
      hint: 'Deep in the Magician\'s studies there is a chapter singed at every corner.' } },
  { classId: 'assassin', cost: 320,
    blurb: 'The quiet trade, with the Verdict\'s marks, dooms, and executions in its kit.',
    skillIds: ['rend', 'eviscerate', 'invisibility',
      'expose_weakness', 'word_of_doom', 'execution'],
    supportIds: ['exposure', 'bristling_riposte'],
    discover: { ledger: classLevelLedgerKey('rogue', 15),
      hint: 'The Rogue\'s road forks in the dark. One branch keeps a ledger of names.' } },
  { classId: 'necromancer', cost: 420,
    blurb: 'Death as a resource: the corpse-and-poison artisan, with the whole Harvest & Hordes gamut.',
    skillIds: ['poison_nova', 'raise_dead', 'despair',
      'reap', 'whirling_reap', 'summon_raging_spirit', 'spirit_pyre',
      'summon_wraith', 'infernal_bombardment', 'archon_lance', 'sanguine_burst'],
    supportIds: ['sweeping_blow', 'mana_feeder', 'enduring_bond'],
    discover: { ledger: classLevelLedgerKey('magician', 15),
      hint: 'The Magician\'s syllabus ends at a door marked WISDOM. What studies past it does not study alone.' } },
  { classId: 'tamer', cost: 280,
    blurb: 'The wild answers a steady gaze: stalk in unannounced, hold the claim, and fight beside the bond that downs but never dies.',
    skillIds: ['goad', 'tame_beast', 'stalk', 'command_assault'],
    supportIds: ['alphas_bond', 'pack_instinct', 'reciprocal_bond',
      'gentling_hand', 'beast_master'],
    // A HARD LESSON, not a syllabus: Crowned beasts roam the base wilds
    // (killHandlers stamps the same key the Warbands package reads).
    discover: { ledger: 'crowned_killed',
      hint: 'Every pack answers to a crown. Put one down, and you will know the bond can be claimed.' } },
  { classId: 'cleric', cost: 450,
    blurb: 'The support archetype, played straight: Communion\'s mending arts and the Devout\'s sanctified arsenal, bundled with the one class built to carry them.',
    skillIds: ['sanctified_strike', 'mend', 'consecration', 'benediction',
      'greater_mending', 'communion', 'healing_rain', 'healing_stream', 'cleansing_light',
      'lifedrain', 'soul_volley', 'tree_of_life', 'font_of_renewal', 'summon_cleric', 'spirit_mender'],
    supportIds: ['intensive_care', 'mending_chain', 'overmend'],
    discover: { ledger: classLevelLedgerKey('magician', 15),
      hint: 'The Magician\'s syllabus ends at a second door, marked WILL. Behind it, someone is mending.' } },

  // --- The parity twelve (every star point now anchors three classes) -------
  { classId: 'breaker', cost: 260,
    blurb: 'The executioner\'s grammar: break the stance, quake the rout, pass The Verdict — the whole slam-and-sentence school rides along.',
    skillIds: ['sunder_maul', 'earthquake', 'verdict',
      'tolling_ruin', 'groundswell', 'faultbreak'],
    supportIds: ['concussive_blows'],
    discover: { ledger: classLevelLedgerKey('warrior', 10),
      hint: 'Warriors who keep to the road learn where a stance carries its weight — and how to take it out.' } },
  { classId: 'vanguard', cost: 240,
    blurb: 'First through the gap, shield still moving — with the charges, thrusts, and leaps of the advancing line.',
    skillIds: ['charge', 'shockfront', 'marching_bulwark',
      'shield_charge', 'bastion_thrust', 'crushing_leap'],
    supportIds: ['phalanx'],
    discover: { ledger: classLevelLedgerKey('warrior', 10),
      hint: 'March the Warrior\'s road far enough and the shield stops meaning "stay put".' } },
  { classId: 'blademaster', cost: 300,
    blurb: 'The sword as a sentence, with the whole dueling school: the thousand cuts and the one perfect stroke.',
    skillIds: ['iai_strike', 'zanshin_cut', 'riposte',
      'thousand_cuts', 'sheathed_moon', 'perfect_strike', 'infinite_slashes'],
    supportIds: ['building_rhythm'],
    discover: { classes: 'berserker',
      hint: 'Fury, worn long enough, starts dreaming of one perfect stroke.' } },
  { classId: 'brawler', cost: 240,
    blurb: 'No blade, no apology — the pit\'s arithmetic, plus the carving rhythms that keep the fists warm.',
    skillIds: ['one_two', 'chain_pull', 'haymaker',
      'carve', 'deep_carve', 'bloodlust'],
    supportIds: ['echoing_might'],
    // THE user-named exemplar of learn-by-getting-wrecked: the grip kin
    // (wranglers, yoke-maulers, gulpers, planted maws) teach with their
    // hands — world.ts grabSeize stamps LEDGER_SEIZED when one catches YOU.
    discover: { ledger: LEDGER_SEIZED,
      hint: 'Something out there will put its hands on you. Survive it, and you will know what hands are for.' } },
  { classId: 'sentinel', cost: 280,
    blurb: 'Hitting it is the mistake: spikes, quills, bells, and every other way a wall bills its visitors.',
    skillIds: ['spiked_bulwark', 'bristleback', 'reprisal',
      'defiant_bulwark', 'tolling_bell', 'rearguard_aegis'],
    supportIds: ['answering_steel'],
    // A nested PLAY threshold on a non-starter: the Guardian must be owned,
    // dealt, and lived in — the web runs deeper than the starting three.
    discover: { ledger: classLevelLedgerKey('guardian', 10),
      hint: 'Stand the Guardian\'s watch long enough to learn it: hitting you was always the mistake.' } },
  { classId: 'lancer', cost: 280,
    blurb: 'Steel left in every wound and called home through the crowd: the full impale ledger, javelin rain included.',
    skillIds: ['skewer', 'pinning_spear', 'spear_recall',
      'voltspear', 'blightspear', 'skyfall_volley', 'radiant_lance'],
    supportIds: ['skewering_blows', 'tripwire_web'],
    discover: { classes: 'ranger',
      hint: 'The Ranger\'s steel comes back as rumor. Somewhere, it comes back by hand.' } },
  { classId: 'trapper', cost: 300,
    blurb: 'The battlefield as a workshop: snares, mines, sentries, and the patience to let the ground do the arguing.',
    skillIds: ['caltrops', 'aftershock_snare', 'ballista_sentry',
      'cinderwhirl_trap', 'frost_trap', 'fire_mine', 'detonate_mines', 'lodestone'],
    supportIds: ['tripwire', 'enduring_snares'],
    // Learn-by-getting-wrecked, the field-craft edition: spring any
    // trapwork with your own feet (world.ts springTrapwork stamps it) —
    // the sunken ruins' toothed halls and the highland's boulder plates
    // are the world's own tutors.
    discover: { ledger: LEDGER_TRAP_SPRUNG,
      hint: 'The floor clicks before it kills. Step wrong once — and live — and the workshop is yours.' } },
  { classId: 'warlord', cost: 320,
    blurb: 'Presence as mechanics — the first Charisma class, with the horns, standards, and blessings of command.',
    skillIds: ['battle_standard', 'single_out', 'challenging_shout',
      'war_horn', 'trumpet_peal', 'blessing_of_might'],
    supportIds: ['provocation', 'clamor'],
    // The war-camps' own lesson (killHandlers stamps warlords_killed —
    // the same key that unlocks Demon Invasions): kill command, learn it.
    discover: { ledger: 'warlords_killed',
      hint: 'Kill a thing that commands, and its voice goes looking for a new throat.' } },
  { classId: 'skald', cost: 340,
    blurb: 'The battle keeps time whether it wants to or not: the whole hymnal, shrieks and squalls included.',
    skillIds: ['war_chant', 'dissonance', 'coda',
      'keening_shriek', 'gust_burst', 'aureole'],
    supportIds: ['held_note', 'countermelody'],
    discover: { classes: 'warlord',
      hint: 'Command, held long enough, starts keeping time.' } },
  { classId: 'beguiler', cost: 320,
    blurb: 'Never be where the blow lands: doubles, decoys, quiet steps, and one whispered madness.',
    skillIds: ['decoy', 'shadow_clone', 'beguile',
      'cloudstep', 'quiet_step', 'mirage_archer'],
    supportIds: ['synchronicity', 'vessel_of_shadow'],
    discover: { ledger: classLevelLedgerKey('rogue', 15),
      hint: 'Far down the Rogue\'s road: the best hiding place is someone else\'s certainty.' } },
  { classId: 'chronomancer', cost: 380,
    blurb: 'Time as a resource everyone else spends carelessly — up to and including stopping it outright.',
    skillIds: ['stasis_lock', 'torpor_field', 'time_dilation',
      'time_stop', 'warp', 'temporal_pad'],
    supportIds: ['lingering_moment', 'borrowed_haste'],
    // The Chronophage's spoils (quests/defs.ts stamps unmade_slain — the
    // same key the far Caravan tiers read): time-craft is TAKEN, not taught.
    discover: { ledger: 'unmade_slain',
      hint: 'The thing that eats time can die. What spills out can be studied.' } },
  { classId: 'ascetic', cost: 300,
    blurb: 'Stillness pays cash: the practiced palm, the rooted stances, and the long breath between.',
    skillIds: ['mantra_strike', 'wellspring_stance', 'long_exhale',
      'grit_stance', 'surgewind', 'siphon_strike'],
    supportIds: ['colossus_stance', 'stillwater_discipline'],
    discover: { classes: 'cleric',
      hint: 'Past the Cleric\'s long watch waits a stiller discipline. Fury is a debt; stillness pays cash.' } },

  // --- Beyond the parity twelve: wisdom's fourth door -------------------------
  // THE HIVECALLER — the swarm-shepherd (the throng fabric's own class).
  // Discovered the way a hive changes hands: kill a brood-queen
  // (killHandlers.ts broodmothers_slain — broodmothers roam the wilds and
  // crown the chitin country) and the humming does not stop; it waits.
  { classId: 'hivecaller', cost: 300,
    blurb: 'The swarm is the weapon; you are only its will. A hive that reknits itself, a veil of biting motes, the quiet dead gathered glimmering — and one pointed word the whole chorus obeys.',
    skillIds: ['summon_swarmlings', 'raise_gnatveil', 'command_assault',
      'beckon_palewisps', 'loose_marrowgrubs'],
    supportIds: ['broodclutch', 'vicious_brood', 'hiveborn',
      'patient_brood', 'hidden_reserves', 'teeming_warrens'],
    discover: { ledger: 'broodmothers_slain',
      hint: 'Kill a mother of broods and listen: the humming does not stop. It waits to be told where to go.' } },

  // --- THE PARITY EIGHT (class pass round two): every star point's fourth
  // door. Gate textures deliberately span the whole discovery vocabulary —
  // four ownership chains, two deep play-thresholds, one world fact, and
  // the debut of the COUNTED lever (the Flagellant is discovered by DYING).
  { classId: 'wallwright', cost: 280,
    blurb: 'Architecture, weaponized: raise the rampart, breach through it, and swing the demolition arc that unbuilds whatever argues back.',
    skillIds: ['stone_rampart', 'toppling_stroke', 'shield_charge'],
    discover: { classes: 'breaker',
      hint: 'Whoever learns every way a wall can fall eventually owes the other trade an apprenticeship.' } },
  { classId: 'matador', cost: 280,
    blurb: 'The duel as theatre: bait the charge, pass through the horns, schedule the third act.',
    skillIds: ['planted_banderilla', 'cape_feint', 'perfect_strike'],
    discover: { classes: 'brawler',
      hint: 'Past the pit there is a finer arena, where the crowd pays to watch a fighter never get hit at all.' } },
  { classId: 'flagellant', cost: 300,
    blurb: 'Pain, notarized: a covenant that feeds on its keeper and repays exactly when the flesh runs short.',
    skillIds: ['ashen_vow', 'transgression', 'blood_mortgage'],
    // THE COUNTED DISCOVERY (ledgerCounts debut): the account's own deaths
    // are the syllabus — the same lifetime counter the Immortal reads.
    discover: { ledgerCounts: { [LEDGER_ACCOUNT_DEATHS]: 8 },
      hint: 'You have died enough times to notice: something in you keeps the receipts. An order exists that balances them.' } },
  { classId: 'falconer', cost: 300,
    blurb: 'The mark has wings and an opinion: one huntress, loosed to latch and hold the quarry open.',
    skillIds: ['cast_falcon', 'expose_weakness', 'cloudstep'],
    discover: { ledger: classLevelLedgerKey('tamer', 10),
      hint: 'Walk far enough with a bond at your heel and something above starts keeping pace with you both.' } },
  { classId: 'sharper', cost: 280,
    blurb: 'Probability owes money: every suit rides every throw, the odds arrive pre-palmed, and nobody can prove anything.',
    skillIds: ['thrown_ace', 'stack_the_deck', 'quiet_step'],
    discover: { classes: 'swashbuckler',
      hint: 'The duelist\'s stage has a back room. The games there are quicker, quieter, and the blades are shaped like cards.' } },
  { classId: 'firebrand', cost: 300,
    blurb: 'The riot, delivered as a speech: the crowd does the fighting, and you were provably elsewhere.',
    skillIds: ['incite', 'trumpet_peal', 'harrowing_wail'],
    discover: { classes: 'beguiler',
      hint: 'One whispered madness turns a mind. Somewhere there is a school for saying it to a square full of them.' } },
  { classId: 'runeweaver', cost: 320,
    blurb: 'Spells are sentences, runes are the words, patience is the grammar — the invocation bank made a calling.',
    skillIds: ['invocation', 'rune_of_power', 'warp'],
    discover: { ledger: classLevelLedgerKey('magician', 20),
      hint: 'At the twentieth circle the Magician\'s letters stop meaning and start DOING. Few study past the alphabet.' } },
  { classId: 'resonator', cost: 300,
    blurb: 'Everything rings if struck sincerely: leave the body humming a bright tone, then play the chord fortissimo.',
    skillIds: ['tuning_strike', 'shatterchord', 'purity_of_elements'],
    // The starfall lattices already sing when broken (killHandlers stamps
    // fallen_stars_broken) — whoever shattered one has heard the tone.
    discover: { ledger: 'fallen_stars_broken',
      hint: 'Break a fallen star and listen to the lattice go: everything, struck sincerely, will tell you its note.' } },
];

const gemNames = (ids: readonly string[], reg: Record<string, { name: string }>): string =>
  ids.map(i => reg[i]?.name ?? i).join(', ');

/** The catalog id a class bundle wears — ONE spelling for the discovery
 *  web's ownership chains, classUnlockFor, and the entry itself. */
export const classBundleId = (classId: string): string => `class_${classId}`;

function classBundleEntry(b: ClassBundleDef): Unlockable {
  const cls = CLASSES.find(c => c.id === b.classId);
  const name = cls?.name ?? b.classId;
  const sups = b.supportIds ?? [];
  // THE DISCOVERY COMPILE: the authored spec becomes the same generic gates
  // every unlock rides — ledger facts → reqLedger, ownership chains →
  // requiresUnlock (bundle ids) — so isUnlockVisible/applyUnlock needed no
  // new machinery to learn mystery.
  const d = b.discover;
  const chain = d?.classes === undefined ? []
    : (Array.isArray(d.classes) ? d.classes : [d.classes]).map(classBundleId);
  return {
    id: classBundleId(b.classId), kind: 'class', cost: b.cost,
    ...(d?.ledger !== undefined ? { reqLedger: d.ledger } : {}),
    ...(d?.ledgerCounts !== undefined ? { reqLedgerCounts: d.ledgerCounts } : {}),
    ...(chain.length ? { requiresUnlock: chain } : {}),
    label: `Class — ${name}`,
    description: `${b.blurb} The ${name} joins the class roll at character select`
      + ` — and once realized in a run, its Vocation chain opens.`
      + ` Gems added to the drop pool: ${gemNames(b.skillIds, SKILLS)}`
      + (sups.length ? ` · supports: ${gemNames(sups, SUPPORTS)}` : '') + '.',
    payload: { classId: b.classId, skillIds: [...b.skillIds], supportIds: [...sups],
      ...(d ? { hint: d.hint } : {}) },
  };
}

export const UNLOCK_CATALOG: Unlockable[] = [
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
    description: `Surface a ${t.slots}th selectable class at character select, dealt at random from your unlocked classes (Class unlocks below deepen that pool — a slot only surfaces once your pool can fill it).`,
    payload: { slotCount: t.slots },
  })),

  // --- Class bundles: class + thematic gems + (once realized) its vocation ---
  ...CLASS_BUNDLES.map(classBundleEntry),

  // --- Skill drop bundles (tier-1 are starters; these add more to the pool) -
  { id: 'gem_skills_t2', kind: 'skill', cost: 75, reqLevel: 0, label: 'Skill Pool II',
    description: 'Flame Wave, Ground Slam, Whirlwind, Storm Call, Spark may drop.',
    payload: { skillIds: ['flame_wave', 'ground_slam', 'whirlwind', 'storm_call', 'spark'] } },
  { id: 'gem_skills_t3', kind: 'skill', cost: 150, reqLevel: 1, label: 'Skill Pool III',
    description: 'Infernal Ray, Summon Skeleton (+archer), Piercing Arrow, Fan of Blades may drop.',
    payload: { skillIds: ['infernal_ray', 'summon_skeleton', 'summon_skeleton_archer', 'piercing_arrow', 'fan_of_blades'] } },

  { id: 'gem_skills_echoes', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Echoes',
    description: 'Mirage Archer and Shadow Clone may drop.',
    payload: { skillIds: ['mirage_archer', 'shadow_clone'] } },
  { id: 'gem_skills_covenants', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool — Covenants',
    description: 'Convocation, Overclock, Blood Mortgage may drop.',
    payload: { skillIds: ['convocation', 'overclock', 'blood_mortgage'] } },
  { id: 'gem_skills_groundwork', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool — Groundwork',
    description: 'Volcanic Fissure, Eruption, Thunderstorm, Entangle, Rune of Power, Toxic Domain may drop.',
    payload: { skillIds: ['volcanic_fissure', 'eruption', 'thunderstorm', 'entangle', 'rune_of_power', 'toxic_domain'] } },
  { id: 'gem_skills_purity', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Purity',
    description: 'Purity of Elements / Fire / Cold / Lightning and Determination may drop.',
    payload: { skillIds: ['purity_of_elements', 'purity_of_fire', 'purity_of_cold', 'purity_of_lightning', 'determination'] } },
  { id: 'gem_skills_arsenal', kind: 'skill', cost: 220, reqLevel: 1, label: 'Skill Pool — Arsenal',
    description: 'Powderkeg Arrow, Orbital Blades, Pinning Spear, Groundswell, Mower\'s Arc, Summon Blade Wraith, Rolling Cannonade, Time Dilation may drop.',
    payload: { skillIds: ['powderkeg_arrow', 'orbital_blades', 'pinning_spear', 'groundswell', 'scythe_sweep', 'summon_blade_wraith', 'rolling_cannonade', 'time_dilation'] } },
  // THE WILDCRAFT — the jungle's arts, surfaced by walking INTO a sunken
  // ruin (the ruin_entered ledger the ruin_gate sidezone bumps: discovery
  // unlocks the discipline — the cellar→Pit pattern for skills).
  { id: 'gem_skills_wildcraft', kind: 'skill', cost: 190, reqLedger: 'ruin_entered', label: 'Skill Pool — the Wildcraft',
    description: 'Machete Arc, Blowdart, Vine Lash, Spore Bloom, Panther Pounce may drop. Learned the way it was first learned: by going in.',
    payload: { skillIds: ['machete_arc', 'blowdart', 'vine_lash', 'spore_bloom', 'panther_pounce'] } },
  // The desert's discipline waits under the erg (the vault_entered ledger the
  // vault_gate sidezone bumps — found, not taught).
  { id: 'gem_skills_sunsand', kind: 'skill', cost: 190, reqLedger: 'vault_entered', label: 'Skill Pool — Sun & Sand',
    description: 'Glass Lance, Dune Surge, Mirage Step, Sirocco Ring, Solar Brand may drop. The desert teaches whoever walks back out.',
    payload: { skillIds: ['glass_lance', 'dune_surge', 'mirage_step', 'sirocco_ring', 'solar_brand'] } },
  // The fear-craft waits at the TOP of the haunted house (the manor_entered
  // ledger the manor's grand stair bumps — climbed, not taught).
  { id: 'gem_skills_harrowing', kind: 'skill', cost: 190, reqLedger: 'manor_entered', label: 'Skill Pool — the Harrowing',
    description: 'Gourd Bomb, Harrowing Wail, Summon Scarecrow may drop. Whatever you met on the stairs taught you this.',
    payload: { skillIds: ['gourd_bomb', 'harrowing_wail', 'summon_scarecrow'] } },
  // Light-craft is learned in the dark (the gloaming_seen ledger the deep
  // gloom stamps — stood in, not taught).
  { id: 'gem_skills_gloaming', kind: 'skill', cost: 170, reqLedger: 'gloaming_seen', label: 'Skill Pool — the Gloaming',
    description: 'Kindle may drop. You stood in the risen dark and learned what a light is worth.',
    payload: { skillIds: ['kindle_wick'] } },
  // THE AUREOLE KATA — the Seraph City's circular judgement. The gateway
  // ledger EXISTS now: the Cathedral of the Highest's GREAT WEST DOORS are a
  // lesson door (grand_cathedral, data/structures.ts) — the first dwell-open
  // stamps 'cathedral_door_opened', and the kata is learned by walking into
  // the See, like every country discipline.
  { id: 'gem_skills_aureole', kind: 'skill', cost: 180, reqLedger: 'cathedral_door_opened', label: 'Skill Pool — the Aureole',
    description: 'Gloriole, Colonnade, Gloria may drop. The circular judgement of the Seraph City: courts that convene on the accused.',
    payload: { skillIds: ['gloriole', 'colonnade', 'gloria'] } },
  // THE LITURGY — the Cathedral's own art, taught by the same doors: call
  // and response (Versicle/Antiphon close the Responsory measure) and the
  // second player-allied angel (Invoke Lampad).
  { id: 'gem_skills_liturgy', kind: 'skill', cost: 170, reqLedger: 'cathedral_door_opened', label: 'Skill Pool — the Liturgy',
    description: 'Versicle, Antiphon, Invoke Lampad may drop. Call and response: the See\'s own measure, and the candle-borne warden who holds your line.',
    payload: { skillIds: ['versicle', 'antiphon', 'invoke_lampad'] } },
  // THE SCENTCRAFT — the Garden's pheromone-craft waits at the BOTTOM of
  // the formicary (the nest_entered ledger the mound-gate bumps — dwelled
  // into, not taught). The colony has been running the world's oldest
  // instinct-lever seminar; entry is the tuition.
  { id: 'gem_skills_scentcraft', kind: 'skill', cost: 190, reqLedger: 'nest_entered', label: 'Skill Pool — Scentcraft',
    description: 'Prey Musk, Alarm Reek, Honeydew Lure, Moult may drop. The nest taught you what a smell can make a body do.',
    payload: { skillIds: ['prey_musk', 'alarm_reek', 'honeydew_lure', 'moult'] } },
  // THE GLIMMERCRAFT — the Grove's light-lure art waits under the hollow
  // bole (the 'gleam_entered' ledger the den's door bumps — dwelled into,
  // not taught). The False Sovereign has been running the wood's oldest
  // bait-and-lantern con; walking into her parlor is the tuition.
  { id: 'gem_skills_glimmer', kind: 'skill', cost: 160, reqLedger: 'gleam_entered', label: 'Skill Pool — Glimmercraft',
    description: 'Lure Lantern may drop. Something in the grove taught you what a light can make a body do.',
    payload: { skillIds: ['lure_lantern'] } },
  // THE MIMIC'S LESSON (engine/mimic.ts — the blue-mage lane): surfaced the
  // way the idea itself arrives — by killing ONE chest that pretended to be
  // treasure. The bestiary ledger IS the gate (bestiaryKey contract), so
  // the knowledge discipline is unlocked by a first act of knowing.
  { id: 'gem_skills_mimicry', kind: 'skill', cost: 200, reqLedgerCounts: { [bestiaryKey('mimic')]: 1 }, label: 'Skill Pool — Mimicry',
    description: 'Mimicry may drop. The chest that bit you taught you something: a shape is only a habit, and habits can be stolen.',
    payload: { skillIds: ['mimicry'] } },
  // THE POSSESSION SEAM (engine/possess.ts): surfaced by putting down ONE
  // Vacant Shell — a body that walks with nobody home poses the question,
  // and the discipline is its answer (the mimicry counted-ledger idiom).
  { id: 'gem_skills_possession', kind: 'skill', cost: 220, reqLedgerCounts: { [bestiaryKey('vacant_shell')]: 1 }, label: 'Skill Pool — Possession',
    description: 'Possession may drop. The shell you broke was empty the whole time — and an empty seat is an invitation.',
    payload: { skillIds: ['possession'] } },
  // THE FORM GEMS chain off the discipline AND the study of the beast
  // itself (the knowledge-gets-teeth law: the count sits near the ARTS
  // tier of a common kind's bestiary ladder — you can only wear what you
  // understand). Future forms are one row each: a new bestiaryKey, a new
  // payload — the seam itself never changes.
  { id: 'gem_skills_wolfform', kind: 'skill', cost: 260, requiresUnlock: 'gem_skills_possession',
    reqLedgerCounts: { [bestiaryKey('dire_wolf')]: 20 }, label: 'Skill Pool — the Wolf Form',
    description: 'Form of the Dire Wolf may drop. Twenty wolves taught you how the shoulders roll; the twenty-first lesson is from inside.',
    payload: { skillIds: ['form_of_the_dire_wolf'] } },

  // --- Support drop bundles -------------------------------------------------
  { id: 'sup_t2', kind: 'support', cost: 100, reqLevel: 0, label: 'Support Pool II',
    description: 'Eruption Cycle, Channeled Tempest, Dive Bomb, Static Buildup, Forked Focus may drop.',
    payload: { supportIds: ['eruption_cycle', 'channeled_tempest', 'dive_bomb', 'static_buildup', 'forked_focus'] } },
  { id: 'sup_t3', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool III',
    description: 'Powderkeg, Nova Release, Elemental Conduction, Capacitor may drop.',
    payload: { supportIds: ['powderkeg', 'nova_release', 'elemental_conduction', 'capacitor'] } },
  { id: 'sup_wildcraft', kind: 'support', cost: 140, reqLedger: 'ruin_entered', label: 'Support Pool — the Wildcraft',
    description: 'Serrated Edge, Envenomed Tips, Smothering Spores may drop.',
    payload: { supportIds: ['serrated_edge', 'envenomed_tips', 'smothering_spores'] } },
  { id: 'sup_sunsand', kind: 'support', cost: 140, reqLedger: 'vault_entered', label: 'Support Pool — Sun & Sand',
    description: 'Sunbaked Edge, Noonglass, Scouring Grit may drop.',
    payload: { supportIds: ['sunbaked_edge', 'noonglass', 'scouring_grit'] } },
  { id: 'sup_harrowing', kind: 'support', cost: 140, reqLedger: 'manor_entered', label: 'Support Pool — the Harrowing',
    description: 'Unnerving and Haunted Service may drop.',
    payload: { supportIds: ['unnerving', 'haunted_service'] } },
  { id: 'sup_scentcraft', kind: 'support', cost: 140, reqLedger: 'nest_entered', label: 'Support Pool — Scentcraft',
    description: 'Heavy Musk, Candied Scent, Startling Reek may drop. What clings, what tempts, what routs.',
    payload: { supportIds: ['heavy_musk', 'candied_scent', 'startling_reek'] } },
  { id: 'sup_echoes', kind: 'support', cost: 200, reqLevel: 1, label: 'Support Pool — Echoes',
    description: 'Phantasmal Echo, Ancestral Call, Vessel of Shadow, Synchronicity may drop.',
    payload: { supportIds: ['phantasmal_echo', 'ancestral_call', 'vessel_of_shadow', 'synchronicity'] } },
  { id: 'sup_fragments', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool — Fragments',
    description: 'Fragmentation, Bulwark Shards, Rage Remnant may drop.',
    payload: { supportIds: ['fragmentation', 'bulwark_shards', 'rage_remnants'] } },
  { id: 'sup_overcharge', kind: 'support', cost: 140, reqLevel: 1, label: 'Support Pool — Overcharge',
    description: 'Overcharge and Mounting Frenzy may drop.',
    payload: { supportIds: ['overcharge', 'mounting_frenzy'] } },
  { id: 'sup_covenants', kind: 'support', cost: 200, reqLevel: 1, label: 'Support Pool — Covenants',
    description: 'Vital Bond, Bloodletter\'s Rhythm, Remnant Conduit, Metronome, Colossus Stance, Transfusion Bond, Controlled Burn may drop.',
    payload: { supportIds: ['vital_bond', 'bloodletters_rhythm', 'remnant_conduit',
      'metronome', 'colossus_stance', 'transfusion_bond', 'controlled_burn'] } },
  // The Aureole kata's socketable verdicts (the same doors teach them —
  // see gem_skills_aureole).
  { id: 'sup_aureole', kind: 'support', cost: 140, reqLedger: 'cathedral_door_opened', label: 'Support Pool — the Aureole',
    description: 'Aureate Writ and Sanctal Cautery may drop. The tribune\'s docket and the gilt fire that closes wounds shut.',
    payload: { supportIds: ['aureate_writ', 'sanctal_cautery'] } },
  { id: 'sup_mimicry', kind: 'support', cost: 150, requiresUnlock: 'gem_skills_mimicry', label: 'Support Pool — Mimicry',
    description: 'Keen Study and Understudy may drop. The eye that steals without the bruise, and the wings that hold more faces.',
    payload: { supportIds: ['keen_study', 'understudy'] } },
  { id: 'sup_possession', kind: 'support', cost: 160, requiresUnlock: 'gem_skills_possession', label: 'Support Pool — Possession',
    description: 'Iron Trance and Long Communion may drop. Armor for the body you leave, and patience for the one you take.',
    payload: { supportIds: ['iron_trance', 'long_communion'] } },
  // THE COUNTERPOINT (an orphan fix): Polyphony and Ostinato shipped with
  // the combo grammar fully defined but joined NO pool row — obtainable
  // only under the unlock-all dev feature. The validator's pool-orphan net
  // (data/validate.ts) now guards this class of gap; this row is theirs.
  { id: 'sup_counterpoint', kind: 'support', cost: 160, reqLevel: 1, label: 'Support Pool — Counterpoint',
    description: 'Polyphony and Ostinato may drop. The grammar\'s payoffs: the varied hand, and the phrase insisted upon.',
    payload: { supportIds: ['polyphony', 'ostinato'] } },

  // --- Town features (the roguelite town framework) ------------------------
  // THE BROADER-WARES FAMILY — derived from VENDOR_CFG.wares.ladder (the
  // lock ladder's own doctrine: append a rung THERE and the catalog, the
  // stock fold, and the milestone stamps all grow together; nothing here
  // counts to three). Rung 1 chains off the Salvage Station (trade must be
  // POSSIBLE before width means anything) and keeps the legacy
  // brandt_extra_gems flag, so accounts that bought "Brandt: +2 Wares" own
  // it outright. Later rungs chain rung-to-rung; a rung wearing GATEWORK
  // avenues (rung 3's level-15 / vocation / quest any-of) surfaces SEALED
  // (tease) the moment its predecessor is owned — the player sees the next
  // rung and every road that opens it, and walks whichever their play
  // crosses first.
  ...VENDOR_CFG.wares.ladder.map((rung, i): Unlockable => ({
    id: `feat_vendor_wares_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    requiresUnlock: i === 0 ? 'feat_salvage_station' : `feat_vendor_wares_${i}`,
    ...(rung.gate ? { reqAnyOf: rung.gate, tease: true } : {}),
    label: `Broader Wares ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}`,
    description: `Every counter stocks wider: +${rung.gems} gem slot${rung.gems === 1 ? '' : 's'} behind the gem case and +${rung.gear} rolled piece${rung.gear === 1 ? '' : 's'} in the wares grid — one purchase, every market your line will ever trade in.`,
    payload: { flag: rung.flag },
  })),
  // THE GEM COUNTER — the skill/support tab, sealed at every default-tabbed
  // counter until owned (VENDOR_CFG.tabs.default): the panel shows the tab
  // shuttered and names this row; buying it opens the case account-wide.
  { id: 'feat_vendor_gems', kind: 'feature', cost: 120, reqLevel: 0,
    requiresUnlock: 'feat_vendor_wares_1',
    label: 'The Gem Counter',
    description: 'The counters\' shuttered gem case opens — every market stocks skill gems behind glass, account-wide. Support gems and the deeper counter services grow from here.',
    payload: { flag: FEATURE.VENDOR_GEMS } },
  // (Chain-gated only, like every market rung — the stray account-level gate
  // it wore before the gatework re-parented it was pre-chain residue.)
  { id: 'feat_brandt_supports', kind: 'feature', cost: 80,  reqLevel: 0, requiresUnlock: 'feat_vendor_gems', label: 'Gem Counter: Supports', description: 'The gem case also stocks support gems.', payload: { flag: FEATURE.BRANDT_SELL_SUPPORTS } },
  // THE RUSH LADDER — derived from VENDOR_CFG.restock.ladder (the beat law's
  // own home): each rung CUTS the counters' restock beat by its row's
  // seconds. Rung 1 keeps the legacy brandt_fast_restock flag (the old 15s
  // rush's owners keep their edge in the five-minute economy) and chains
  // off the Salvage Station — no point rushing a counter you cannot buy
  // from; later rungs chain rung-to-rung. Descriptions COMPUTE the honest
  // before/after from the config itself.
  ...VENDOR_CFG.restock.ladder.map((rung, i): Unlockable => {
    const before: number = VENDOR_CFG.restock.ladder.slice(0, i)
      .reduce((s: number, r) => Math.max(VENDOR_CFG.restock.minSec, s - r.cutSec), VENDOR_CFG.restock.baseSec as number);
    const after = Math.max(VENDOR_CFG.restock.minSec, before - rung.cutSec);
    return {
      id: `feat_vendor_restock_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
      requiresUnlock: i === 0 ? 'feat_salvage_station' : `feat_vendor_restock_${i}`,
      label: `Rush Order ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}`,
      description: `Every counter restocks in ${Math.round(after / 60 * 10) / 10} minutes instead of ${Math.round(before / 60 * 10) / 10} — one purchase, every market.`,
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
  { id: 'feat_mireille_xp',    kind: 'feature', cost: 120, reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_MANA, label: 'Mireille: Traveller\'s Rest', description: 'Linger for a 5-minute +5% experience blessing — a worthwhile pitstop.', payload: { flag: FEATURE.MIREILLE_XP_BUFF } },
  // The TRACKER — the inn's word-of-mouth made flesh: once Mireille keeps you
  // fed and watered, her huntsman friend pitches camp. Unlocks the BESTIARY
  // (data/bestiary.ts): account-wide kill knowledge, studied into power.
  { id: 'feat_tracker', kind: 'feature', cost: 90, reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_MANA, label: 'Weslan the Tracker', description: 'A huntsman camps at the town\'s west edge. Dwell by his fire to open the BESTIARY — every kind your line has slain, studied into knowledge that outlives every death.', payload: { flag: FEATURE.TRACKER } },

  // --- THE PATRON'S HOLD (data/vendors.ts VENDOR_CFG): the reserve ladder,
  //     DERIVED from the config's own list — appending a rung there grows
  //     this catalog and every counter's capacity together; nothing here
  //     counts to three. Surfaces once the account has BOUGHT at any
  //     counter (LEDGER_VENDOR_BOUGHT: you can only reserve at a market
  //     you've traded in); each rung requires the last. ---------------------
  // Rung 1 now stands at the chain's far end (the user's meta-progression:
  // width first, then the gem case, then the right to HOLD) — it requires
  // the Gem Counter AND a Broader Wares rung owned, plus the standing
  // discovery law (LEDGER_VENDOR_BOUGHT: you can only reserve at a market
  // you've traded in), and TEASES once the chain is walked: the card hangs
  // sealed until the first purchase stamps the ledger.
  ...VENDOR_CFG.lock.ladder.map((rung, i): Unlockable => ({
    id: `feat_vendor_lock_${i + 1}`, kind: 'feature', cost: rung.cost, reqLevel: 0,
    ...(i === 0
      ? { requiresUnlock: ['feat_vendor_gems', 'feat_vendor_wares_1'],
          reqLedger: LEDGER_VENDOR_BOUGHT, tease: true }
      : { requiresUnlock: `feat_vendor_lock_${i}` }),
    label: `Reserved Wares ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}`,
    description: i === 0
      ? 'Every counter learns THE PATRON\'S HOLD: tick a ware to RESERVE its shelf slot — it rides every restock, every reload, untouched, until bought or released. One slot, shared law at every counter.'
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
    reqAnyOf: [{ ledgerPrefix: LEDGER_GEMDROP_PREFIX, n: VENDOR_CFG.commission.need,
                 label: `a gem your line has seen drop ${VENDOR_CFG.commission.need}+ times` }],
    label: 'The Standing Order — Commission',
    description: `Name a gem your line has seen drop ${VENDOR_CFG.commission.need}+ times (the drop index — only true finds count) and the counter WATCHES for it: every restock that passes while you're away is resolved at the shelf's honest odds, and a hit waits for you, reserved. One standing order per counter; fulfilled on purchase.`,
    payload: { flag: FEATURE.VENDOR_COMMISSION } },

  // --- Town-building: the Quest Package (surfaces once any character reaches L5)
  { id: 'feat_quest_giver', kind: 'feature', cost: 100, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Quest Package — Town Expansion',
    description: 'A quartermaster settles in Lastlight, posting hunts into the wilds (quest chains).',
    payload: { flag: FEATURE.QUEST_GIVER } },

  // --- Training Dummy (also surfaces once any character reaches L5) ----------
  { id: 'feat_target_dummy', kind: 'feature', cost: 50, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Training Dummy — Town',
    description: 'A practice dummy stands in Lastlight: an immortal target to pummel and test your skills, effects, ailments, and modifiers against.',
    payload: { flag: FEATURE.TARGET_DUMMY } },

  // --- Campfire (also surfaces once any character reaches L5) ----------------
  { id: 'feat_campfire', kind: 'feature', cost: 70, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Campfire — Town',
    description: 'A campfire is laid in Lastlight. Zones already remember their layout and surviving foes as you cross between them; dwell by the fire to REFRESH the wilds on command — every zone repopulates fresh (your cleared objectives stay claimed).',
    payload: { flag: FEATURE.CAMPFIRE } },

  // --- The Salvage Station (the essence economy's front door). Surfaces the
  //     moment a line first TOUCHES essence (a Gilded Scamp's spill, most
  //     likely) — the discovery IS the pitch. One purchase, two doors: the
  //     bench (break: rarity essence + craft lore) and Brandt's scrap counter
  //     (sell: coarse volume by quality). -------------------------------------
  { id: 'feat_salvage_station', kind: 'feature', cost: 60, reqLevel: 0, reqLedger: LEDGER_ESSENCE_TOUCHED,
    label: 'Salvage Station — Town',
    description: 'That strange residue has a name: ESSENCE. A breaker\'s bench is raised in Lastlight — dwell there to BREAK gear and carried gems into their rarity\'s essence (coarse, glimmering, brilliant, pristine), studying every affix broken. The same wisdom teaches Brandt to BUY SCRAP at his counter, paying Coarse Essence by an item\'s overall quality — sell for volume, break for the deep tints and the lore. Spend essence levelling skills, at counters, and crafting studied affixes onto your gear.',
    payload: { flag: FEATURE.SALVAGE_STATION } },
  { id: 'feat_craft_second', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_15', requiresFeature: FEATURE.SALVAGE_STATION,
    label: 'Salvage Station — Twin Anvils',
    description: 'The bench learns to hold TWO crafted affixes on one item (the one-craft rule, bought apart).',
    payload: { flag: FEATURE.CRAFT_SECOND_AFFIX } },
  { id: 'feat_oracle_stone', kind: 'feature', cost: 90, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Oracle Stone — Town',
    description: 'Standing stones rise in Lastlight. Commune over an item (trace the runes — precision and haste decide the outcome) to REROLL one of its affixes; the stone answers each line only once, sealing it forever.',
    payload: { flag: FEATURE.ORACLE_STONE } },

  // --- The Mercenary Recruiter (meta/mercs.ts): surfaces once the account
  //     has MET the market anywhere — a port muster, a wilds parley, any
  //     officer's menu (LEDGER_MERC_MARKET_MET): you can only buy what you
  //     know exists. The officer runs the PORT policy at the town's table
  //     (hire-only, never retirement), and his single-serve sheet is dealt
  //     once per world and locked (THE MUSTER-ROLL LAW). ---------------------
  { id: 'feat_merc_recruiter', kind: 'feature', cost: 120, reqLevel: 0, reqLedger: LEDGER_MERC_MARKET_MET,
    label: 'Mercenary Recruiter — Town',
    description: 'A recruiting officer takes a table in Lastlight\'s east quarter. Hire a blade the moment a run begins — port rules: baseline sellswords fitted to your level, and NO retiring at his table. His sheet is dealt ONCE for each world and never refreshed: what he offers is all he will ever offer, until the world itself is made anew.',
    payload: { flag: FEATURE.MERC_RECRUITER } },

  // --- THE IMMORTAL COVENANT (meta/modes.ts): a character MODE, not a town
  //     feature — earned by dying. Surfaces once the account has fallen
  //     IMMORTAL_CFG.unlockDeaths times; the two vessel slots ladder off it. ---
  { id: 'feat_immortal', kind: 'feature', cost: 100, reqLevel: 0,
    reqLedgerCounts: { [LEDGER_ACCOUNT_DEATHS]: IMMORTAL_CFG.unlockDeaths },
    label: 'The Immortal Covenant',
    description: `Death has seen you ${IMMORTAL_CFG.unlockDeaths} times, and blinked. `
      + 'Unlocks the IMMORTAL mode at character select: a sworn character plays the wake as any '
      + 'other — until its first death, which pays a reduced essence tithe and seals it OUTSIDE '
      + 'the mortal ledger. It wakes in town, build intact, carry lost; it persists across '
      + 'sessions in an account vessel; its later deaths feed the account nothing, and its '
      + 'corpses are visible only to itself. A life kept purely for the playing of it.',
    payload: { flag: FEATURE.IMMORTAL } },
  { id: 'feat_immortal_slot_2', kind: 'feature', cost: 200, reqLevel: 0,
    requiresUnlock: 'feat_immortal',
    label: 'Immortal — Second Vessel',
    description: 'The covenant holds a second sworn character (two Immortal save slots).',
    payload: { flag: FEATURE.IMMORTAL_SLOT_2 } },
  { id: 'feat_immortal_slot_3', kind: 'feature', cost: 350, reqLevel: 0,
    requiresUnlock: 'feat_immortal_slot_2',
    label: 'Immortal — Third Vessel',
    description: 'The covenant holds a third sworn character (three Immortal save slots).',
    payload: { flag: FEATURE.IMMORTAL_SLOT_3 } },

  // --- The Caravan: four broad tiers, each opening a wider band of escorted travel.
  //     Base tier (the Caravanner settles in town) at L10; far tiers ALSO need the
  //     Unmade slain. Each tier requires the previous (a growing route network). ----
  { id: 'feat_caravan', kind: 'feature', cost: 120, reqLevel: 0, reqLedger: 'reached_level_10',
    label: 'Caravan — Outpost',
    description: 'A travelling Caravanner makes camp in Lastlight and escorts you to the near wilds (lvl ≤20), minting a fixed route into each level band and ferrying you home.',
    payload: { flag: FEATURE.CARAVAN } },
  { id: 'feat_caravan_deep', kind: 'feature', cost: 200, reqLevel: 0, reqLedger: 'reached_level_30', requiresFeature: FEATURE.CARAVAN,
    label: 'Caravan — Deep Frontier',
    description: 'The Caravanner braves routes into the lvl 21–30 band.',
    payload: { flag: FEATURE.CARAVAN_DEEP } },
  { id: 'feat_caravan_far', kind: 'feature', cost: 320, reqLevel: 0, reqLedger: ['reached_level_40', 'unmade_slain'], requiresFeature: FEATURE.CARAVAN_DEEP,
    label: 'Caravan — Beyond the Veil',
    description: 'With the Unmade slain, the Caravanner runs the lvl 31–50 bands. (Requires: reach level 40 AND defeat the Unmade.)',
    payload: { flag: FEATURE.CARAVAN_FAR } },
  { id: 'feat_caravan_world', kind: 'feature', cost: 480, reqLevel: 0, reqLedger: ['reached_level_60', 'unmade_slain'], requiresFeature: FEATURE.CARAVAN_FAR,
    label: 'Caravan — The Far Reaches',
    description: 'The widest routes: the lvl 51–100 bands. (Requires: reach level 60 AND defeat the Unmade.)',
    payload: { flag: FEATURE.CARAVAN_WORLD } },

  // --- THE VOYAGE's shipwright: three hulls, each requiring the last — the
  //     naval meta-progression ladder (data/ships.ts maps flags → levers).
  //     Base tier surfaces once the account has ever CAST OFF (voyages_sailed). --
  { id: 'ship_sloop', kind: 'feature', cost: 90, reqLevel: 0, reqLedger: 'voyages_sailed',
    label: 'Shipwright — Coastal Sloop',
    description: 'A proper hull replaces the dinghy: +15% sail speed, a longer spyglass (the sea streams and reveals further), and a practiced landing crew.',
    payload: { flag: FEATURE.SHIP_SLOOP } },
  { id: 'ship_brigantine', kind: 'feature', cost: 220, reqLevel: 1, reqLedger: 'islands_landed', requiresFeature: FEATURE.SHIP_SLOOP,
    label: 'Shipwright — Brigantine',
    description: 'Twin masts for the open crossings: +32% sail speed, a far spyglass, and swift beachings. (Requires: land on a Voyage island.)',
    payload: { flag: FEATURE.SHIP_BRIGANTINE } },
  { id: 'ship_galleon', kind: 'feature', cost: 450, reqLevel: 2, reqLedger: 'reached_level_40', requiresFeature: FEATURE.SHIP_BRIGANTINE,
    label: 'Shipwright — Storm Galleon',
    description: 'The flagship: +50% sail speed, a horizon-spanning spyglass, and landings measured in heartbeats.',
    payload: { flag: FEATURE.SHIP_GALLEON } },

  // --- META-META: the global event-frequency crank (surfaces once ANY character
  //     has reached the level cap of 100 — a true end-game mastery reward) -------
  { id: 'feat_global_frequency', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_100',
    label: 'World Tempo — Global Event Frequency',
    description: 'End-game mastery: an Expedition-screen slider that scales how OFTEN world events occur AND how many run at once, across the whole run. Crank the world into a roaring festival of events, or dial it to a slow burn.',
    payload: { flag: FEATURE.GLOBAL_FREQUENCY } },

  // --- Master gem unlock: everything obtainable (a deliberate, expensive flip) -
  { id: 'feat_unlock_all_gems', kind: 'feature', cost: 500, reqLevel: 2,
    label: 'Grand Codex — Unlock All Gems',
    description: 'EVERY skill and support gem becomes obtainable (drops, chests, Brandt) — including anything added in the future. One deliberate unlock so new content is always reachable. (Classes are unlocked apart — each Class bundle also widens the roll at character select.)',
    payload: { flag: FEATURE.UNLOCK_ALL_GEMS } },
];

/** Static catalog by id — the resolution table for `requiresUnlock` ladders. */
const CATALOG_BY_ID = new Map(UNLOCK_CATALOG.map(u => [u.id, u] as const));

/** The class-bundle entry that unlocks a given class (undefined for starters).
 *  The class-select teasers use it to point a locked class at its exact
 *  Vault purchase. */
export function classUnlockFor(classId: string): Unlockable | undefined {
  return CATALOG_BY_ID.get(classBundleId(classId));
}

/** Has the account DISCOVERED this class (its Vault entry surfaced, or it is
 *  already owned / a starter)? The read every teasing surface shares: an
 *  undiscovered class shows as a shrouded rumor — hint only, never name —
 *  and cannot be bought (applyUnlock rides the same visibility gate).
 *  Owned counts as discovered by definition, so accounts that bought a
 *  class before its discover row existed are never re-shrouded. */
export function isClassDiscovered(a: Account, classId: string): boolean {
  const u = classUnlockFor(classId);
  if (!u) return true; // starters (and any classless id) have no mystery
  return isUnlockOwned(a, u) || isUnlockVisible(a, u);
}

/** Class bundles the account has NOT yet discovered (unowned + gate unmet) —
 *  the Vault's rumor wall reads these for their payload.hint. */
export function undiscoveredClassUnlocks(a: Account): Unlockable[] {
  return UNLOCK_CATALOG.filter(u =>
    u.kind === 'class' && !isUnlockOwned(a, u) && !isUnlockVisible(a, u));
}

/** Every ledger requirement named by any class-discovery spec, as
 *  key → MINIMUM COUNT (presence keys need 1; counted keys their
 *  threshold). The dev tab's "stamp the world's lessons" lever and the
 *  probe's reachability walk both derive from this, so QA and invariants
 *  can never drift from the authored web. */
export function discoveryLedgerNeeds(): Record<string, number> {
  const needs: Record<string, number> = {};
  for (const b of CLASS_BUNDLES) {
    const d = b.discover;
    if (!d) continue;
    const l = d.ledger;
    if (l !== undefined) for (const k of Array.isArray(l) ? l : [l]) needs[k] = Math.max(needs[k] ?? 0, 1);
    for (const [k, n] of Object.entries(d.ledgerCounts ?? {})) needs[k] = Math.max(needs[k] ?? 0, n);
  }
  return needs;
}

/** The keys alone (see discoveryLedgerNeeds). */
export function discoveryLedgerKeys(): string[] {
  return Object.keys(discoveryLedgerNeeds());
}

export function isUnlockOwned(a: Account, u: Unlockable): boolean {
  switch (u.kind) {
    case 'slot':    return a.unlockedSlots.has(u.payload.slotCount);
    // Owning the CLASS is the bundle's identity — gem overlap with old saves'
    // pool purchases never blocks the class itself from being purchasable.
    case 'class':   return a.unlockedClasses.has(u.payload.classId);
    case 'skill':   return u.payload.skillIds.every(id => a.unlockedSkills.has(id));
    case 'support': return u.payload.supportIds.every(id => a.unlockedSupports.has(id));
    case 'feature': return a.features.has(u.payload.flag);
    case 'package': return a.packageUnlocks.has(u.payload.tierId ?? u.payload.packageId);
  }
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
      label: p.pressureless ? p.label : `${p.label} — Configurable`,
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

/** Static catalog + the dynamic package purchases. */
export function allUnlockables(): Unlockable[] {
  return [...UNLOCK_CATALOG, ...packageUnlockables()];
}

/** Is this unlock visible/purchasable yet (its gate met)? Static entries gate on
 *  sequencing/level/ledger; package BASE entries on the unlock predicate; package
 *  TIER entries on (base owned + every prior tier owned + this tier's milestone). */
export function isUnlockVisible(a: Account, u: Unlockable): boolean {
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
  if (u.reqClasses !== undefined && a.unlockedClasses.size < u.reqClasses) return false;
  // Sequential feature ladders (e.g. Mireille life → mana → XP buff).
  if (u.kind === 'feature' && u.requiresFeature && !a.features.has(u.requiresFeature)) return false;
  // THE GATEWORK: one held avenue opens the any-of group (gates.ts).
  if (!gateMet(a, u.reqAnyOf, 'any', ownedUnlockById(a))) return false;
  return true;
}

/** The catalog's own ownership predicate as a closure — what gates.ts
 *  `unlock` avenues resolve through (the fabric leaf never imports us). */
function ownedUnlockById(a: Account): (id: string) => boolean {
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
    out.push({ label: `${u.reqClasses} classes unlocked`, met: a.unlockedClasses.size >= u.reqClasses, anyOf: false });
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

/** Entries the player can SEE in the Vault (gate met, not owned). */
export function availableUnlocks(a: Account): Unlockable[] {
  return allUnlockables().filter(u => isUnlockVisible(a, u) && !isUnlockOwned(a, u));
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
    id: 'classes', label: 'Classes', kinds: ['slot', 'class'], rumors: true,
    blurb: 'The hand and the pool: Class Slots widen how many classes each deal offers, Class bundles deepen the pool the hand is dealt from. Rumors whisper at classes the world has not introduced yet.',
    emptyNote: 'No class purchases are open right now — classes surface through deeds, levels, and hard lessons. The rumors below point at the deeds.',
  },
  {
    id: 'gems', label: 'Gems', kinds: ['skill', 'support'],
    blurb: 'Skill and support pools — buy one and its gems join the drop tables (and the town counters) for every character after, forever.',
    emptyNote: 'No gem pools on the shelf right now — some surface with account levels, others only once the world has taught them.',
  },
  {
    id: 'town', label: 'Town', kinds: ['feature'], fallback: true,
    blurb: 'Lastlight grows by purchase: stations and services, counter privileges, hulls and routes, and account-wide features.',
    emptyNote: 'Nothing to raise in town right now — milestones out in the world surface more.',
  },
  {
    id: 'events', label: 'Events', kinds: ['package'],
    blurb: 'World-event packages and their deeper tiers — owning one opens its dials on the Expedition screen.',
    emptyNote: 'No event configurations are open — meet an event out in the world and its package surfaces here.',
  },
  {
    id: 'owned', label: 'Owned', owned: true,
    blurb: 'Everything this account has already claimed, shelved by kind — the part of the store that is yours now.',
  },
];

/** Kind → display name for shelf sub-headers and the Owned tab's grouping
 *  (the cards' lowercase `ukind` tag, at shelf grain). Total by type: a new
 *  catalog kind fails the build here until it gets a name. */
export const VAULT_KIND_LABELS: Record<UnlockKind, string> = {
  slot: 'Class Slots', class: 'Classes', skill: 'Skill Pools',
  support: 'Support Pools', feature: 'Town & Features', package: 'World Events',
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
 *  never literals in the UI). The tab strip is FURNITURE THE ACCOUNT EARNS:
 *  until the account has CLAIMED at least `stripMinOwned` unlocks AND the
 *  store visibly spans at least `stripMinShelves` shelves, the Vault renders
 *  as one flat wall — the young store. The shelving raises itself exactly
 *  when the single room outgrows itself, so the store's furniture grows
 *  with the player's own knowledge of the game. Ownership never regresses
 *  and the Owned shelf stands forever after the first claim, so the raise
 *  is monotone in practice; if late-game stock ever dries below the span,
 *  the flat wall still shows EVERYTHING visible — nothing is ever lost to
 *  the furniture either way. */
export const VAULT_SHELF_CFG = {
  stripMinShelves: 2,
  stripMinOwned: 3,
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
  /** The mystery law's verdict for this shelf. */
  visible: boolean;
}

export function vaultShelfCensus(a: Account): VaultShelfCensus[] {
  const avail = availableUnlocks(a);
  const ownedAll = allUnlockables().filter(u => isUnlockOwned(a, u));
  const rumorsAll = undiscoveredClassUnlocks(a);
  return VAULT_TABS.map(t => {
    const stock = t.owned ? [] : avail.filter(u => vaultSeatOf(u.kind).id === t.id);
    const owned = t.owned ? ownedAll : ownedAll.filter(u => vaultSeatOf(u.kind).id === t.id);
    const rumors = t.rumors ? rumorsAll : [];
    return {
      tab: t, stock, owned, rumors,
      visible: t.owned ? owned.length > 0 : stock.length > 0 || rumors.length > 0,
    };
  });
}

/** Is the shelving raised (VAULT_SHELF_CFG — see THE GROWING STORE)? Takes
 *  a prebuilt census so callers never pay the walk twice. */
export function vaultStripVisible(a: Account, census: VaultShelfCensus[] = vaultShelfCensus(a)): boolean {
  const ownedTotal = census.find(c => c.tab.owned)?.owned.length ?? 0;
  const span = census.filter(c => c.visible).length;
  return span >= VAULT_SHELF_CFG.stripMinShelves && ownedTotal >= VAULT_SHELF_CFG.stripMinOwned;
}

/** Spend credits to apply an unlock. Mutates the account; returns false if
 *  unaffordable / already owned / gate unmet. Caller saves. */
export function applyUnlock(a: Account, u: Unlockable): boolean {
  // The buy gate is exactly the visibility gate (sequencing, account level,
  // package tier staggering, or a feature's ledger milestone).
  if (a.credits < u.cost || isUnlockOwned(a, u) || !isUnlockVisible(a, u)) return false;
  a.credits -= u.cost;
  switch (u.kind) {
    case 'slot':    a.unlockedSlots.add(u.payload.slotCount); break;
    // A class bundle is SEVERAL unlocks in one: the class enters the roll pool,
    // its gems enter the drop pool (Sets dedupe any overlap with owned pools) —
    // and realizing the class later opens its vocation chain for free.
    case 'class':
      a.unlockedClasses.add(u.payload.classId);
      for (const id of u.payload.skillIds) a.unlockedSkills.add(id);
      for (const id of u.payload.supportIds) a.unlockedSupports.add(id);
      break;
    case 'skill':   for (const id of u.payload.skillIds) a.unlockedSkills.add(id); break;
    case 'support': for (const id of u.payload.supportIds) a.unlockedSupports.add(id); break;
    case 'feature': a.features.add(u.payload.flag); break;
    case 'package': a.packageUnlocks.add(u.payload.tierId ?? u.payload.packageId); break;
  }
  return true;
}
