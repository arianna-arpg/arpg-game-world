// ---------------------------------------------------------------------------
// CLASS TEMPLATES.
//
// Classes are intentionally thin — Elder Scrolls style. A class is only:
//   1. a starting attribute spread,
//   2. a pre-bound skill bar,
//   3. a starting position on the passive tree.
// Nothing is locked: every character can allocate any attribute on level-up
// and bind ANY skill whose attribute requirements they meet. A Warrior who
// pumps Wisdom becomes a summoner; that's the point.
//
// Attribute spreads cover all TEN attributes (see stats.ts ATTRIBUTES — the
// three triads plus Vitality) and each sums to 60. Start nodes point at the
// NINE-POINT attribute star (passives.ts): one start per attribute, Vitality
// deliberately excluded (it is ubiquitous, not an identity).
//
// Innate modifiers were deliberately REMOVED (the optional fields below are
// the seam): they return, properly differentiated, in the class balance pass.
// ---------------------------------------------------------------------------

import { STAT_DEFS, type Attributes, type Modifier } from '../engine/stats';

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Part-grammar portrait (data/looks.ts) worn by heroes of this class. */
  look?: string;
  attributes: Attributes;
  /** Innate modifiers — small, flavorful nudges, not hard locks. Currently
   *  unpopulated everywhere; the balance pass will repopulate per class. */
  innate?: Modifier[];
  innateText?: string;
  /** Skill ids bound to [LMB, RMB, 1, 2, 3, 4, 5, 6] at start (null = empty slot). */
  bar: (string | null)[];
  /** The passive-tree node this class starts at (id in PASSIVE_NODES). */
  startNode: string;
  /** Fresh-character companions; ordinary persistent bonds after creation. */
  startingCompanions?: { monsterId: string; skillId: string }[];
  /** THE MASTERY LADDER's gifts (data/classTiers.ts CLASS_TIERS): per rung,
   *  the ALTERNATE OPENING it opens for this class — a `replaces` row lets
   *  `skill` stand in for that base starter when the class wakes (the
   *  player picks either on the class card), a row without `replaces`
   *  GRANTS `skill` as an extra starter outright (the Master's gift).
   *  Absent = the class sells no rungs (nothing moot ever surfaces). A rung
   *  skill also joins the drop pool the moment its rung is owned. Laws
   *  (validate.ts + probe_classmastery): rung skills are real, droppable,
   *  never another class's opener, unique across every rung, and a
   *  `replaces` skill is bindable by the class's own starting spread (a
   *  GRANT may outreach it — THE CAPSTONE LAW: an ultimate on the bar is a
   *  promise the build grows into, cast-gated until it does). */
  kit?: readonly KitRungRow[];
}

/** One rung's gift for one class — see ClassDef.kit. */
export interface KitRungRow {
  /** A CLASS_TIERS id. */
  tier: string;
  /** The alternate skill the rung opens. */
  skill: string;
  /** The base starter it may stand in for; absent = granted outright. */
  replaces?: string;
}

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior', name: 'Warrior',
    look: 'class_warrior',
    description: 'A disciplined front-line fighter. Heavy blows, heavier armor, and a war cry that turns the tide.',
    color: '#d8b06a',
    attributes: {
      strength: 16, prowess: 8, fortitude: 10,
      dexterity: 6, finesse: 0, charisma: 2,
      intelligence: 0, wisdom: 0, willpower: 2,
      vitality: 16,
    },
    bar: ['cleave', 'shield_up', 'war_cry', null, null, null, null, null],
    startNode: 'str_start',
    // THE MASTERY LADDER: the arc becomes a rhythm (Carve), the guard a
    // fury (Berserk), the shout a satchel of iron (Grenado); the Master
    // wakes with the Red Hour on the bar.
    kit: [
      { tier: 'novice', replaces: 'cleave', skill: 'carve' },
      { tier: 'adept', replaces: 'shield_up', skill: 'berserk' },
      { tier: 'expert', replaces: 'war_cry', skill: 'grenado' },
      { tier: 'master', skill: 'red_hour' },
    ],
  },
  {
    id: 'magician', name: 'Magician',
    look: 'class_magician',
    description: 'An elemental spellcaster who commands the destructive powers of fire, frost, and lightning.',
    color: '#7a9aff',
    attributes: {
      strength: 0, prowess: 0, fortitude: 0,
      dexterity: 2, finesse: 4, charisma: 2,
      intelligence: 22, wisdom: 10, willpower: 12,
      vitality: 8,
    },
    // Fire, frost, STORM: the elemental trio completed (Shockfront — a
    // strength-flavored force wall — marched off to the Vanguard's kit;
    // the storm slot wants RANGE, so the ricochet, not the sputter).
    bar: ['firebolt', 'frost_nova', 'chain_lightning', null, null, null, null, null],
    startNode: 'int_start',
    // THE MASTERY LADDER: the elements rotate one seat each — a cold bolt
    // for the fire bolt, a lightning ring for the frost ring, a fire bloom
    // for the chain; the Master wakes holding the Long Cold.
    kit: [
      { tier: 'novice', replaces: 'firebolt', skill: 'frostbolt' },
      { tier: 'adept', replaces: 'frost_nova', skill: 'shock_nova' },
      { tier: 'expert', replaces: 'chain_lightning', skill: 'fireball' },
      { tier: 'master', skill: 'long_cold' },
    ], // elemental caster → the Intelligence point
  },
  {
    id: 'rogue', name: 'Rogue',
    look: 'class_rogue',
    description: 'An elusive striker who slips into the shadows, steps behind the mark, and finishes fights before an alarm can be raised.',
    color: '#5a5c57',
    attributes: {
      strength: 8, prowess: 4, fortitude: 0,
      dexterity: 18, finesse: 10, charisma: 8,
      intelligence: 0, wisdom: 0, willpower: 0,
      vitality: 12,
    },
    // Cloak in, step BEHIND, and the knife explains itself — the kit is the
    // sentence "no one saw it happen" (Frenzy was never the Rogue's word;
    // it lives on in the drop pool and the Juggernaut bundle).
    bar: ['backstab', 'cloak', 'shadow_step', null, null, null, null, null],
    startNode: 'fin_start',
    // THE MASTERY LADDER: the knife becomes a dart (Blowdart), the cloak a
    // banked ambush (Stealth), the blink a lunge (Closing Fang); the Master
    // wakes under a Rain of Knives.
    kit: [
      { tier: 'novice', replaces: 'backstab', skill: 'blowdart' },
      { tier: 'adept', replaces: 'cloak', skill: 'stealth' },
      { tier: 'expert', replaces: 'shadow_step', skill: 'closing_fang' },
      { tier: 'master', skill: 'rain_of_knives' },
    ], // the unseen blade → the Finesse point
  },
  {
    id: 'berserker', name: 'Berserker',
    look: 'class_berserker',
    description: 'Trades safety for speed and fury. Heavy strikes stack into a whirlwind of carnage that leeches life back.',
    color: '#e05545',
    attributes: {
      strength: 14, prowess: 12, fortitude: 4,
      dexterity: 10, finesse: 2, charisma: 2,
      intelligence: 0, wisdom: 0, willpower: 2,
      vitality: 14,
    },
    bar: ['heavy_strike', 'whirlwind', 'dash', null, null, null, null, null],
    startNode: 'prw_start', // fury as execution → the Prowess point
  },
  {
    id: 'sorcerer', name: 'Sorcerer',
    look: 'class_sorcerer',
    description: 'A master of destructive spellcraft who channels searing beams and calls down storms to clear entire packs at once.',
    color: '#ce7eac',
    attributes: {
      strength: 2, prowess: 0, fortitude: 0,
      dexterity: 2, finesse: 4, charisma: 0,
      intelligence: 22, wisdom: 12, willpower: 8,
      vitality: 10,
    },
    bar: ['infernal_ray', 'storm_call', 'ice_shield', null, null, null, null, null],
    startNode: 'int_start',
  },
  {
    id: 'ranger', name: 'Ranger',
    look: 'class_ranger',
    description: 'Death from afar. Arrows that pierce ranks, knives that fan across the field.',
    color: '#8ac860',
    attributes: {
      strength: 4, prowess: 6, fortitude: 0,
      dexterity: 20, finesse: 8, charisma: 6,
      intelligence: 4, wisdom: 2, willpower: 0,
      vitality: 10,
    },
    bar: ['piercing_arrow', 'fan_of_blades', 'quickstep', null, null, null, null, null],
    startNode: 'dex_start',
  },
  {
    id: 'guardian', name: 'Guardian',
    look: 'class_guardian',
    description: 'A bulky defender of the front-lines, hard to ignore and even harder to put down.',
    color: '#EAF6F9',
    attributes: {
      strength: 10, prowess: 2, fortitude: 16,
      dexterity: 4, finesse: 0, charisma: 0,
      intelligence: 2, wisdom: 2, willpower: 6,
      vitality: 18,
    },
    bar: ['hammer_of_judgment', 'aegis_ward', 'rallying_howl', null, null, null, null, null],
    startNode: 'for_start', // the unmoved wall → the Fortitude point
  },
  {
    // THE ARCANIST (her retheme 2026-09-05): the dead belong to the
    // Necromancer now. The Summoner is an arcane caster with ONE bonded
    // familiar — quality over the Necromancer's quantity, the companion kept
    // in the Tamer's vein (unmade, it re-forms; never a horde).
    id: 'summoner', name: 'Summoner',
    look: 'class_summoner',
    description: 'An arcanist who fights alongside a single bonded familiar, weaving bolts of twilight and draining life from whatever stands in reach.',
    color: '#b08ae8',
    attributes: {
      strength: 2, prowess: 2, fortitude: 0,
      dexterity: 2, finesse: 2, charisma: 2,
      intelligence: 14, wisdom: 14, willpower: 14,
      vitality: 8,
    },
    // Ruin (the bolt), Bind Familiar (the companion), Essence Drain (the rot).
    bar: ['ruin', 'bind_familiar', 'essence_drain', null, null, null, null, null],
    startNode: 'wis_start', // binding is Wisdom's craft
    // THE MASTERY LADDER: the bolt becomes a mote of undoing, the one
    // familiar a pair of untouchable wisps, the drain the host-mending
    // Convocation; the Master wakes holding the Hollow Star.
    kit: [
      { tier: 'novice', replaces: 'ruin', skill: 'unmaking_bolt' },
      { tier: 'adept', replaces: 'bind_familiar', skill: 'conjure_wisp' },
      { tier: 'expert', replaces: 'essence_drain', skill: 'convocation' },
      { tier: 'master', skill: 'hollow_star' },
    ],
  },
  {
    id: 'swashbuckler', name: 'Swashbuckler',
    look: 'class_swashbuckler',
    description: 'A duelist who is never where the blow lands. Dashes through enemy lines, blades first.',
    color: '#6ab8d8',
    attributes: {
      strength: 6, prowess: 4, fortitude: 0,
      dexterity: 16, finesse: 12, charisma: 10,
      intelligence: 2, wisdom: 0, willpower: 2,
      vitality: 8,
    },
    bar: ['buckler_strike', 'wild_strike', 'dash_strike', null, null, null, null, null],
    startNode: 'fin_start',
  },
  {
    id: 'juggernaut', name: 'Juggernaut',
    look: 'class_juggernaut',
    description: 'An unstoppable powerhouse built to trade heavy blows, shrug off incoming hits, and crush anything in front of it.',
    color: '#80ccff',
    attributes: {
      strength: 18, prowess: 6, fortitude: 14,
      dexterity: 4, finesse: 0, charisma: 2,
      intelligence: 0, wisdom: 0, willpower: 2,
      vitality: 14,
    },
    // Piledriver banks Fury slow and heavy; Reckoning spends it. The same
    // court Frenzy once fed, at the tempo the slab actually swings.
    bar: ['piledriver', 'reckoning', 'stone_skin', null, null, null, null, null],
    startNode: 'for_start', // does not stop → the Fortitude point
  },
  {
    id: 'pyromancer', name: 'Pyromancer',
    look: 'class_pyromancer',
    description: 'A fire specialist who sets the battlefield ablaze with burning arrows, spreading ignites, and pillars of flame.',
    color: '#ffa64d',
    attributes: {
      strength: 2, prowess: 0, fortitude: 0,
      dexterity: 2, finesse: 10, charisma: 2,
      intelligence: 20, wisdom: 8, willpower: 8,
      vitality: 8,
    },
    bar: ['flame_arrow', 'ignite', 'pillar_of_flame', null, null, null, null, null],
    startNode: 'int_start', // fire caster → the Intelligence point
  },
  {
    id: 'assassin', name: 'Assassin',
    look: 'class_assassin',
    description: 'A ruthless stalker who opens deep, bleeding wounds from stealth before closing in for the kill.',
    color: '#2d4f83',
    attributes: {
      strength: 6, prowess: 6, fortitude: 0,
      dexterity: 14, finesse: 14, charisma: 8,
      intelligence: 2, wisdom: 0, willpower: 0,
      vitality: 10,
    },
    bar: ['rend', 'eviscerate', 'invisibility', null, null, null, null, null],
    startNode: 'fin_start', // ailments from the dark → the Finesse point
  },
  {
    id: 'necromancer', name: 'Necromancer',
    look: 'class_necromancer',
    description: 'Commands the fallen and spreads lingering venom—raising dead bodies to fight, cursing the living, and choking the field in poison.',
    color: '#a6c87a',
    attributes: {
      strength: 2, prowess: 0, fortitude: 2,
      dexterity: 2, finesse: 2, charisma: 2,
      intelligence: 12, wisdom: 14, willpower: 14,
      vitality: 10,
    },
    bar: ['poison_nova', 'raise_dead', 'despair', null, null, null, null, null],
    startNode: 'wis_start', // death-shepherding is Wisdom's craft, like the Summoner
    // THE MASTERY LADDER: the venom ring becomes a Shambling Horde (walking
    // bombs), the raising a Corpse Explosion, the curse a Bone Golem; the
    // Master wakes with the Grave Tide already banking souls.
    kit: [
      { tier: 'novice', replaces: 'poison_nova', skill: 'shambler_horde' },
      { tier: 'adept', replaces: 'raise_dead', skill: 'corpse_explosion' },
      { tier: 'expert', replaces: 'despair', skill: 'summon_bone_golem' },
      { tier: 'master', skill: 'grave_tide' },
    ],
  },
  {
    id: 'cleric', name: 'Cleric',
    look: 'class_cleric',
    description: 'A devoted front-line healer who mends allies, sanctifies the ground beneath them, and strikes back with blessed force.',
    color: '#8ae0a8',
    attributes: {
      strength: 6, prowess: 0, fortitude: 4,
      dexterity: 0, finesse: 0, charisma: 2,
      intelligence: 8, wisdom: 14, willpower: 16,
      vitality: 10,
    },
    bar: ['sanctified_strike', 'mend', 'consecration', null, null, null, null, null],
    startNode: 'wil_start', // the devout ward → the Willpower point
  },
  {
    id: 'tamer', name: 'Tamer',
    startingCompanions: [{ monsterId: 'shepherds_hound', skillId: 'tame_beast' }],
    look: 'class_tamer',
    description: 'A patient hunter who stalks through the wilds, claims beasts as loyal companions, and directs them in battle.',
    color: '#a8c87a',
    attributes: {
      strength: 2, prowess: 2, fortitude: 4,
      dexterity: 14, finesse: 4, charisma: 8,
      intelligence: 0, wisdom: 14, willpower: 2,
      vitality: 10,
    },
    // The sneak-and-claim opener BY DESIGN, now in the Tamer's own words:
    // STALK in (the hunter's hush, not the Rogue's cloak), hold the gaze,
    // and the wild answers — GOAD peels one beast off the pack when the
    // claim needs privacy, or pulls the fight when it slips.
    bar: ['goad', 'tame_beast', 'stalk', null, null, null, null, null],
    startNode: 'wis_start', // the beast-bond is Wisdom's craft
  },

  // --- The PARITY twelve ------------------------------------------------------
  // Every point of the nine-pointed star anchors exactly THREE classes now
  // (validate.ts holds the kit contract; the star holds the identity). Most
  // of these kits PROMOTE existing unbound catalog skills onto a ramp —
  // the library was already deep enough to open nine of twelve doors.

  {
    id: 'breaker', name: 'Breaker',
    look: 'class_breaker',
    description: 'A heavy bruiser who shatters enemy poise, shakes the ground with earthquakes, and delivers crushing blows to staggered foes.',
    color: '#c8824a',
    attributes: {
      strength: 20, prowess: 6, fortitude: 12,
      dexterity: 2, finesse: 0, charisma: 2,
      intelligence: 0, wisdom: 0, willpower: 4,
      vitality: 14,
    },
    // The executioner's grammar, unabridged: break (Sunder Maul), scatter
    // (Earthquake), sentence (The Verdict — poiseReap on the broken).
    bar: ['sunder_maul', 'earthquake', 'verdict', null, null, null, null, null],
    startNode: 'str_start',
  },
  {
    id: 'vanguard', name: 'Vanguard',
    look: 'class_vanguard',
    description: 'Leads the charge shield-first, bowling through enemy lines, driving foes back with shockwaves, and advancing behind a raised bulwark.',
    color: '#d8c07a',
    attributes: {
      strength: 16, prowess: 6, fortitude: 10,
      dexterity: 12, finesse: 2, charisma: 4,
      intelligence: 0, wisdom: 0, willpower: 0,
      vitality: 10,
    },
    // Momentum as doctrine: Charge opens the line, Shockfront shoves it
    // wider (reclaimed from the Magician — it was always a soldier's word),
    // Marching Bulwark walks the ground you took.
    bar: ['charge', 'shockfront', 'marching_bulwark', null, null, null, null, null],
    startNode: 'str_start',
  },
  {
    id: 'blademaster', name: 'Blademaster',
    look: 'class_blademaster',
    description: 'A poised swordsman built on timing and precision—dashing through foes on the draw, striking in measured cadences, and turning parried blows back at double strength.',
    color: '#c8d8e8',
    attributes: {
      strength: 12, prowess: 12, fortitude: 2,
      dexterity: 18, finesse: 4, charisma: 2,
      intelligence: 0, wisdom: 0, willpower: 0,
      vitality: 10,
    },
    // Tempo, not fury: Iai Strike (the timed draw-dash), Zanshin Cut (the
    // three-beat discipline), Riposte (the perfect window). All three were
    // waiting unbound in the catalog for a class to carry them.
    bar: ['iai_strike', 'zanshin_cut', 'riposte', null, null, null, null, null],
    startNode: 'prw_start',
  },
  {
    id: 'brawler', name: 'Brawler',
    look: 'class_brawler',
    description: 'A close-quarters scrapper who builds fury with rapid jabs, drags fleeing enemies back into reach, and spends that fury on devastating haymakers.',
    color: '#d8885a',
    attributes: {
      strength: 12, prowess: 14, fortitude: 8,
      dexterity: 10, finesse: 2, charisma: 4,
      intelligence: 0, wisdom: 0, willpower: 0,
      vitality: 10,
    },
    // The pit grammar: One-Two banks Fury a knuckle at a time, Chain Pull
    // brings the argument to you, Haymaker closes it — same Fury court as
    // the Juggernaut, entirely different verdict.
    bar: ['one_two', 'chain_pull', 'haymaker', null, null, null, null, null],
    startNode: 'prw_start',
  },
  {
    id: 'sentinel', name: 'Sentinel',
    look: 'class_sentinel',
    description: 'An armored bastion who punishes every attacker with spiked blocks, a quilled aura, and fierce counterstrikes.',
    color: '#9ab0a8',
    attributes: {
      strength: 12, prowess: 2, fortitude: 16,
      dexterity: 2, finesse: 0, charisma: 2,
      intelligence: 0, wisdom: 2, willpower: 6,
      vitality: 18,
    },
    // Retaliation as a kit: Spiked Bulwark (blocks bleed the striker),
    // Bristleback (the quilled aura), Reprisal (the answer, gated on being
    // hit within three heartbeats). The Guardian holds; the Sentinel bills.
    bar: ['spiked_bulwark', 'bristleback', 'reprisal', null, null, null, null, null],
    startNode: 'for_start',
  },
  {
    id: 'lancer', name: 'Lancer',
    look: 'class_lancer',
    description: 'Drives spears deep into enemies and the ground alike, then wrenches every lodged spear back at once to tear through the crowd.',
    color: '#b8c8a0',
    attributes: {
      strength: 14, prowess: 6, fortitude: 2,
      dexterity: 18, finesse: 2, charisma: 2,
      intelligence: 0, wisdom: 2, willpower: 0,
      vitality: 14,
    },
    // The impale loop entire: Skewer lodges the bank, Pinning Spear plants
    // the field, Extraction pops every ledger and calls the steel home.
    bar: ['skewer', 'pinning_spear', 'spear_recall', null, null, null, null, null],
    startNode: 'dex_start',
  },
  {
    id: 'trapper', name: 'Trapper',
    look: 'class_trapper',
    description: 'Controls the field with scattered caltrops, buried aftershock snares, and deployed ballista sentries.',
    color: '#a8905a',
    attributes: {
      strength: 4, prowess: 2, fortitude: 2,
      dexterity: 18, finesse: 12, charisma: 4,
      intelligence: 4, wisdom: 0, willpower: 0,
      vitality: 14,
    },
    // Field-craft, not spellcraft: Caltrops deny the ground, Aftershock
    // Snare punishes the crossing, Ballista Sentry holds the lane.
    bar: ['caltrops', 'aftershock_snare', 'ballista_sentry', null, null, null, null, null],
    startNode: 'dex_start',
  },
  {
    id: 'warlord', name: 'Warlord',
    look: 'class_warlord',
    description: 'Commands the field by planting battle standards, marking priority targets for death, and taunting enemies into open combat.',
    color: '#e0b060',
    attributes: {
      strength: 12, prowess: 8, fortitude: 6,
      dexterity: 4, finesse: 0, charisma: 16,
      intelligence: 0, wisdom: 0, willpower: 2,
      vitality: 12,
    },
    // The first Charisma class: presence as mechanics. Battle Standard
    // holds the line, Single Out opens the duel, Challenging Shout turns
    // the whole room's argument onto you — insight pays for the attention.
    bar: ['battle_standard', 'single_out', 'challenging_shout', null, null, null, null, null],
    startNode: 'cha_start',
  },
  {
    id: 'skald', name: 'Skald',
    look: 'class_skald',
    description: 'Weaves battle-chants and grinding dissonance that build verses over time, then spends them all in a single resounding coda.',
    color: '#c890d8',
    attributes: {
      strength: 4, prowess: 4, fortitude: 2,
      dexterity: 4, finesse: 4, charisma: 16,
      intelligence: 2, wisdom: 6, willpower: 8,
      vitality: 10,
    },
    // The song family debut: War Chant rallies (and banks a Verse per
    // singing), Dissonance grinds (and banks), Coda spends the whole meter.
    bar: ['war_chant', 'dissonance', 'coda', null, null, null, null, null],
    startNode: 'cha_start',
  },
  {
    id: 'beguiler', name: 'Beguiler',
    look: 'class_beguiler',
    description: 'Uses decoys, shadow clones, and mind-turning hexes to misdirect attacks and turn enemy packs against themselves.',
    color: '#b878c8',
    attributes: {
      strength: 2, prowess: 0, fortitude: 0,
      dexterity: 14, finesse: 10, charisma: 16,
      intelligence: 8, wisdom: 2, willpower: 0,
      vitality: 8,
    },
    // Misdirection as a kit: Decoy takes the blame, Shadow Clone returns
    // fire from where you were, Beguile turns one mind on its own pack.
    bar: ['decoy', 'shadow_clone', 'beguile', null, null, null, null, null],
    startNode: 'cha_start',
  },
  {
    id: 'chronomancer', name: 'Chronomancer',
    look: 'class_chronomancer',
    description: 'Bends time on the battlefield—freezing foes in stasis, slowing regions of space, and rewinding skill cooldowns.',
    color: '#88d8d8',
    attributes: {
      strength: 2, prowess: 0, fortitude: 0,
      dexterity: 2, finesse: 4, charisma: 4,
      intelligence: 14, wisdom: 8, willpower: 16,
      vitality: 10,
    },
    // The chrono fabric's first player-facing kit: Stasis Lock (the needle),
    // Torpor Field (the thickened bubble), Time Dilation (the rewound bar).
    bar: ['stasis_lock', 'torpor_field', 'time_dilation', null, null, null, null, null],
    startNode: 'wil_start',
  },
  {
    id: 'ascetic', name: 'Ascetic',
    look: 'class_ascetic',
    description: 'A disciplined monk who sharpens open-palm strikes with each repetition, channels mana into poise, and releases pent-up focus in sweeping blasts.',
    color: '#e8e0c8',
    attributes: {
      strength: 12, prowess: 4, fortitude: 10,
      dexterity: 2, finesse: 2, charisma: 2,
      intelligence: 0, wisdom: 4, willpower: 14,
      vitality: 10,
    },
    // Willpower melee — the roster's first: Mantra Strike ramps itself,
    // Wellspring Stance converts mana to poise, Long Exhale is patience
    // released as a wall of air.
    bar: ['mantra_strike', 'wellspring_stance', 'long_exhale', null, null, null, null, null],
    startNode: 'wil_start',
  },

  // --- Beyond the parity twelve -----------------------------------------------
  // The star's points anchor three classes each; from here the roster GROWS
  // past three-per-point — the parity contract (budget, kit size, unique
  // kits) still binds every newcomer, but a point may now anchor four. The
  // discovery web (meta/unlocks.ts) is what keeps a deeper roster legible:
  // new classes arrive as rumors, not as a longer shop shelf.

  {
    id: 'hivecaller', name: 'Hivecaller',
    look: 'class_hivecaller',
    description: 'Maintains a self-replenishing swarm of insects, gathers clouds of biting gnats from the air, and directs the whole brood against chosen targets.',
    color: '#b8c84a',
    attributes: {
      strength: 2, prowess: 0, fortitude: 2,
      dexterity: 4, finesse: 2, charisma: 4,
      intelligence: 6, wisdom: 14, willpower: 16,
      vitality: 10,
    },
    // The zoomancer's grammar, all three verbs THRONG-flavored: Hivecall
    // reserves the standing swarm (persistent, self-reknitting), Raise the
    // Gnatveil sweeps wild motes into a harrying cloud, and Command:
    // Assault is the pointed finger the whole chorus obeys. Deliberately
    // distinct from the Summoner (corpse legions from a bolt-caster's
    // distance) and the Tamer (ONE bond, held): the Hivecaller is MANY,
    // cheap, and everywhere.
    bar: ['summon_swarmlings', 'raise_gnatveil', 'command_assault', null, null, null, null, null],
    startNode: 'wis_start', // the shepherd's craft — wisdom's fourth door
  },

  // --- THE PARITY EIGHT (class pass round two) --------------------------------
  // Every star point now anchors FOUR classes. Each of these eight claims an
  // under-leveraged fabric as its identity: constructs+mass, the redirect
  // duel, the pale bargain, the latch-as-mark, the fortune levers, the
  // confusion crowd, the invocation bank, the attunement tones. Kits mix
  // minted signatures with promoted catalog gems; the parity contract
  // (budget 60 / kit 3 / globally-unique bars) binds them all.

  {
    id: 'wallwright', name: 'Wallwright',
    look: 'class_wallwright',
    description: 'Raises stone ramparts across the battlefield, charges through fortifications, and topples barriers onto enemies.',
    color: '#b0a890',
    attributes: {
      strength: 18, prowess: 4, fortitude: 10,
      dexterity: 0, finesse: 0, charisma: 0,
      intelligence: 12, wisdom: 2, willpower: 2,
      vitality: 12,
    },
    // Raise (Stone Rampart), break (Toppling Stroke), breach (Shield
    // Charge): the mason's full argument, in order.
    bar: ['stone_rampart', 'toppling_stroke', 'shield_charge', null, null, null, null, null],
    startNode: 'str_start',
  },
  {
    id: 'matador', name: 'Matador',
    look: 'class_matador',
    description: 'A daring duelist who goads enemies into charging, sidesteps their rush with a flourish of the cape, and punishes them as they overcommit.',
    color: '#d84a5a',
    attributes: {
      strength: 16, prowess: 16, fortitude: 0,
      dexterity: 12, finesse: 2, charisma: 6,
      intelligence: 0, wisdom: 0, willpower: 0,
      vitality: 8,
    },
    // Insult (Planted Banderilla), pass (Cape Feint), sentence (Perfect
    // Strike) — the corrida's grammar over the mass fabric's own physics.
    bar: ['planted_banderilla', 'cape_feint', 'perfect_strike', null, null, null, null, null],
    startNode: 'prw_start',
  },
  {
    id: 'flagellant', name: 'Flagellant',
    look: 'class_flagellant',
    description: 'Draws strength from suffering and low life, spending its own blood to fuel devastating strikes and reclaiming vitality when near death.',
    color: '#c05838',
    attributes: {
      strength: 18, prowess: 0, fortitude: 16,
      dexterity: 0, finesse: 0, charisma: 0,
      intelligence: 12, wisdom: 0, willpower: 4,
      vitality: 10,
    },
    // The vow (low-life power), the sin priced (Transgression), the debt
    // structured (Blood Mortgage): three covenants, one ledger.
    bar: ['ashen_vow', 'transgression', 'blood_mortgage', null, null, null, null, null],
    startNode: 'for_start',
  },
  {
    id: 'falconer', name: 'Falconer',
    look: 'class_falconer',
    description: 'Hunts alongside a trained falcon that latches onto prey and exposes their weak spots while the Falconer repositions and strikes from afar.',
    color: '#c8a86a',
    attributes: {
      strength: 0, prowess: 0, fortitude: 0,
      dexterity: 18, finesse: 8, charisma: 2,
      intelligence: 16, wisdom: 0, willpower: 8,
      vitality: 8,
    },
    // Loose her (Cast the Falcon), read it (Expose Weakness), be elsewhere
    // (Cloudstep): the hunt conducted, never chased.
    bar: ['cast_falcon', 'expose_weakness', 'cloudstep', null, null, null, null, null],
    startNode: 'dex_start',
  },
  {
    id: 'sharper', name: 'Sharper',
    look: 'class_sharper',
    description: 'A cunning gambler who hurls razor-edged cards, stacks the odds in favor of high rolls and critical strikes, and slips away unseen.',
    color: '#c8b078',
    attributes: {
      strength: 0, prowess: 4, fortitude: 0,
      dexterity: 16, finesse: 16, charisma: 12,
      intelligence: 4, wisdom: 0, willpower: 0,
      vitality: 8,
    },
    // Deal (Thrown Ace), cheat (Stack the Deck), leave (Quiet Step) — the
    // fortune fabric's first player-facing kit.
    bar: ['thrown_ace', 'stack_the_deck', 'quiet_step', null, null, null, null, null],
    startNode: 'fin_start',
  },
  {
    id: 'firebrand', name: 'Firebrand',
    look: 'class_firebrand',
    description: 'An agitator who incites enemies into turning on one another, rallies allies with trumpet peals, and scatters foes with harrowing cries.',
    color: '#e07040',
    attributes: {
      strength: 0, prowess: 0, fortitude: 0,
      dexterity: 4, finesse: 4, charisma: 18,
      intelligence: 8, wisdom: 0, willpower: 16,
      vitality: 10,
    },
    // Turn them (Incite), rally yours (Trumpet Peal), rout the rest
    // (Harrowing Wail): the confusion family as a public-speaking career.
    bar: ['incite', 'trumpet_peal', 'harrowing_wail', null, null, null, null, null],
    startNode: 'cha_start',
  },
  {
    id: 'runeweaver', name: 'Runeweaver',
    look: 'class_runeweaver',
    description: 'Queues elemental runes with each spell cast and releases the completed sequence as a combined invocation.',
    color: '#8a9ae8',
    attributes: {
      strength: 0, prowess: 0, fortitude: 0,
      dexterity: 4, finesse: 6, charisma: 0,
      intelligence: 22, wisdom: 10, willpower: 10,
      vitality: 8,
    },
    // Weave (Invocation banks the runes), ground (Rune of Power), step
    // (Warp): the scribe's craft at combat tempo.
    bar: ['invocation', 'rune_of_power', 'warp', null, null, null, null, null],
    startNode: 'int_start',
  },
  {
    id: 'resonator', name: 'Resonator',
    look: 'class_resonator',
    description: 'Attunes enemies to elemental tones with striking blows, then shatters those resonances in a single chord while warding allies.',
    color: '#88c8b8',
    attributes: {
      strength: 6, prowess: 0, fortitude: 0,
      dexterity: 0, finesse: 0, charisma: 4,
      intelligence: 10, wisdom: 12, willpower: 18,
      vitality: 10,
    },
    // Strike the tone (Tuning Strike), play the chord (Shatterchord), wear
    // the wards (Purity of Elements): the bell-founder's liturgy.
    bar: ['tuning_strike', 'shatterchord', 'purity_of_elements', null, null, null, null, null],
    startNode: 'wil_start',
  },
  {
    id: 'spellblade', name: 'Spellblade', look: 'class_spellblade',
    description: 'An elemental close fighter. Bank lightning in your blade, lash through a crowd with fire, and slip away through a mirage.',
    color: '#e8bd78',
    attributes: {
      strength: 14, prowess: 0, fortitude: 4,
      dexterity: 16, finesse: 0, charisma: 0,
      intelligence: 12, wisdom: 0, willpower: 4, vitality: 10,
    },
    bar: ['static_strike', 'hellfire_lash', 'mirage_step', null, null, null, null, null],
    startNode: 'dex_start',
    kit: [
      { tier: 'novice', replaces: 'static_strike', skill: 'tide_lash' },
      { tier: 'adept', replaces: 'hellfire_lash', skill: 'ice_blade' },
      { tier: 'expert', replaces: 'mirage_step', skill: 'moult' },
      { tier: 'master', skill: 'stormcrown' },
    ],
  },
  {
    id: 'cryomancer', name: 'Cryomancer', look: 'class_cryomancer',
    description: 'A keeper of winter. Chill a crowd with piercing frost, freeze the catch, and leave a sheet of ice behind your retreat.',
    color: '#a6def0',
    attributes: {
      strength: 0, prowess: 0, fortitude: 0,
      dexterity: 12, finesse: 0, charisma: 0,
      intelligence: 22, wisdom: 6, willpower: 10, vitality: 10,
    },
    bar: ['frost_pulse', 'flash_freeze', 'shatterstep', null, null, null, null, null],
    startNode: 'int_start',
    kit: [
      { tier: 'novice', replaces: 'frost_pulse', skill: 'ice_spear' },
      { tier: 'adept', replaces: 'flash_freeze', skill: 'cold_snap' },
      { tier: 'expert', replaces: 'shatterstep', skill: 'frostguard' },
      { tier: 'master', skill: 'hailcrown' },
    ],
  },
  {
    id: 'apothecary', name: 'Apothecary', look: 'class_apothecary',
    description: 'The dose makes the poison. Stack venom, seed a lingering spore cloud, and cleanse your own wounds while the toxins work.',
    color: '#a6cd79',
    attributes: {
      strength: 0, prowess: 0, fortitude: 6,
      dexterity: 6, finesse: 0, charisma: 0,
      intelligence: 8, wisdom: 4, willpower: 20, vitality: 16,
    },
    bar: ['venom_bolt', 'spore_bloom', 'cleansing_light', null, null, null, null, null],
    startNode: 'wil_start',
    kit: [
      { tier: 'novice', replaces: 'venom_bolt', skill: 'contagion' },
      { tier: 'adept', replaces: 'spore_bloom', skill: 'expunge' },
      { tier: 'expert', replaces: 'cleansing_light', skill: 'benediction' },
      { tier: 'master', skill: 'reapers_toll' },
    ],
  },
];

// --- The class-skill stat lane ----------------------------------------------
// One generated stat per class — classSkill_<id> — meaning "+N levels to this
// class's STARTING skills", resolved against the LIVE bar above: re-order or
// swap a class's starters and every "+1 to <Class> Skills" affix, unique, or
// passive keeps working with zero data edits. recalcSeat sweeps each known
// skill against every class bar and writes the summed bonus onto the instance
// (SkillInstance.bonusLevels); gear grants the stat like any other modifier.

export const classSkillStat = (classId: string): string => `classSkill_${classId}`;

/** A class's rung rows (empty when it sells none). */
export const kitRungs = (c: ClassDef): readonly KitRungRow[] => c.kit ?? [];

/** Every skill a class can OPEN with — its bar starters plus every rung
 *  alternate. The class-skill lane (`classSkill_<id>` — "+N to <Class>
 *  Skills") reads THIS, so an alternate opening is the class's skill
 *  exactly as the base it stands in for. */
export function classOpeningSkills(c: ClassDef): string[] {
  const out: string[] = c.bar.filter((s): s is string => s !== null);
  for (const r of kitRungs(c)) if (!out.includes(r.skill)) out.push(r.skill);
  return out;
}

for (const c of CLASSES) {
  STAT_DEFS[classSkillStat(c.id)] = { label: `${c.name} Skill Levels`, base: 0 };
}

// --- Class-roster invariants (validate.ts enforces; UI reads) ---------------
// The PARITY CONTRACT: every class is dealt the same hand — the same summed
// attribute budget and the same starting-kit size — so class identity is
// WHERE the points sit and WHICH three verbs open the run, never how many.
// Kits are also globally UNIQUE (no skill opens two classes): a starter skill
// is a class's signature, and the overlap detector treats sharing as drift.

export const CLASS_CFG = {
  /** Every ClassDef.attributes spread must sum to exactly this. */
  attrBudget: 60,
  /** Non-null skills every class bar starts with — the locked kit size. */
  kitSize: 3,
} as const;

// --- Shared progression rules ----------------------------------------------

export const PROGRESSION = {
  /** Unspent points at creation; the class starting node is granted separately. */
  startingPassivePoints: 0,
  /** Passive points: spent on the passive tree (attributes live there).
   *  The level-up beat grants ONLY this — skill/support levels are fed by
   *  Ability Essences (data/essences.ts; the skill-point lane retired). */
  passivePointsPerLevel: 1,
  /** Spendable level-earned budget, excluding quest rewards and the free root. */
  passivePointsAtLevel(level: number): number {
    return this.startingPassivePoints + Math.max(0, level - 1) * this.passivePointsPerLevel;
  },
  lifePerLevel: 4,
  manaPerLevel: 4,
  xpForLevel(level: number): number {
    return Math.floor(45 * Math.pow(level, 1.55));
  },
};
