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
  },
  {
    id: 'magician', name: 'Magician',
    look: 'class_magician',
    description: 'A mystic mage that flings forth the destructive elemental powers of fire, frost and storm.',
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
    startNode: 'int_start', // elemental caster → the Intelligence point
  },
  {
    id: 'rogue', name: 'Rogue',
    look: 'class_rogue',
    description: 'A renegade rogue that dispatches its enemies with no one around being any the wiser.',
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
    startNode: 'fin_start', // the unseen blade → the Finesse point
  },
  {
    id: 'berserker', name: 'Berserker',
    look: 'class_berserker',
    description: 'Trades safety for speed and fury. Heavy strikes stack into a whirlwind of carnage — and leech life back.',
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
    description: 'A scholar of the destructive elements that has mastered the way of decimating clusters of enemies at once.',
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
    id: 'summoner', name: 'Summoner',
    look: 'class_summoner',
    description: 'Commands the dead and the elemental. Your minions run on the same skills monsters do — because they are monsters.',
    color: '#b06bd4',
    attributes: {
      strength: 2, prowess: 2, fortitude: 0,
      dexterity: 2, finesse: 2, charisma: 2,
      intelligence: 12, wisdom: 18, willpower: 12,
      vitality: 8,
    },
    bar: ['venom_bolt', 'summon_skeleton', 'summon_skeleton_archer', null, null, null, null, null],
    startNode: 'wis_start', // the shepherd's craft lives in Wisdom now
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
    description: 'It hits and it takes hits. And it does not stop.',
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
    description: 'The pyric pyromancer is fueled by explosions and fire and burns it. Burns it all with fire.',
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
    description: 'The assassin bleeds their enemies dry before moving in for the kill, all the while being unseen.',
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
    description: 'Death is a resource. Raise what falls, curse what stands, and exhale a ring of venom that outlasts every argument — the classic corpse-and-poison artisan.',
    color: '#a6c87a',
    attributes: {
      strength: 2, prowess: 0, fortitude: 2,
      dexterity: 2, finesse: 2, charisma: 2,
      intelligence: 12, wisdom: 14, willpower: 14,
      vitality: 10,
    },
    bar: ['poison_nova', 'raise_dead', 'despair', null, null, null, null, null],
    startNode: 'wis_start', // death-shepherding is Wisdom's craft, like the Summoner
  },
  {
    id: 'cleric', name: 'Cleric',
    look: 'class_cleric',
    description: 'The line holds because someone holds it together. Mends the wounded, sanctifies the ground, and swings a blessed arc when the fight closes in — the support archetype, played straight.',
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
    look: 'class_tamer',
    description: 'A quiet hand and a steady gaze. Slips past the wild unseen, claims a beast with held focus, and fights beside the bond — the pet at the front, the whistle in reserve.',
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
    description: 'Stances are load-bearing. Crumple the poise, quake the ground under the rout, and pass The Verdict on whatever kneels.',
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
    description: 'First through, shield still moving. A trampling charge, a wall of force, and a phalanx-step that never stops advancing.',
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
    description: 'The sword as a sentence: the draw is the cut, every third stroke settles the mind, and a raised parry answers at double.',
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
    description: 'No blade, no apology. Jab in rhythm, drag the coward back by the chain, and spend the whole bank on one swung hip.',
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
    description: 'Hitting it is the mistake. A wall of spikes, a quilled aura, and a counter-blow licensed by whatever they just did to you.',
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
    description: 'Leave steel in every wound, plant spears like fenceposts, then WRENCH the whole harvest home through the crowd at once.',
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
    description: 'The battlefield is a workshop: strewn spikes, a buried snare, and a lane-locked ballista that never asks for orders twice.',
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
    description: 'Wars are won by whoever the field believes in. Plant the colors, name the first to die, and dare the rest to object.',
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
    description: 'The battle keeps time whether it wants to or not. Two songs worn like weather, and a Coda that spends every banked verse at once.',
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
    description: 'Never be where the blow lands; ideally, be the reason it landed on their own line. Mirages, doubles, and one whispered madness.',
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
    description: 'Time is a resource everyone else spends carelessly. A needle of stasis, a bubble of thickened seconds, and cooldowns wound backward.',
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
    description: 'Fury is a debt; stillness pays cash. An open palm that practices itself sharper, a stance that pumps mind into poise, and one long-held breath.',
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
    description: 'The swarm is the weapon and the shepherd is its will. A reserved hive that reknits itself, a veil of biting motes gathered off the air, and one pointed word that sends the whole chorus somewhere specific.',
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
    description: 'Architecture, weaponized. Raises stone where stone is needed, charges through what it raised, and swings demolition arcs that leave survivors load-bearing no more — the wall is a weapon that hasn\'t fallen yet.',
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
    description: 'The fight as theatre with exactly one critic. Bait the charge, step through the horns, and schedule the third act — whatever survives its own momentum answers to the blade.',
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
    description: 'Pain, notarized. A covenant that feeds on its keeper and repays exactly when the flesh runs short — whole men owe; the broken are owed. The order\'s arithmetic has never once been audited.',
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
    description: 'The mark has wings and an opinion. One huntress on the glove, loosed to LATCH and ride the quarry vulnerable; the Falconer reads the field, steps out of their own silhouette, and arrives where she\'s holding.',
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
    description: 'Probability owes money. Cards thrown flat with every suit riding, odds palmed until the house pays wrong, and an exit practiced quiet — nobody can prove anything, which is the trick.',
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
    description: 'The riot, delivered as a speech. Say the true terrible thing at the wrong volume, and the crowd does the fighting; keep the horn and the wail for when the constables insist.',
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
    description: 'Spells are sentences; runes are the words; patience is the grammar. Bank the weave sigil by sigil and release it as whatever the pattern spells — the invocation fabric\'s own class.',
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
    description: 'Everything rings if struck sincerely. Strikes leave bodies humming one bright tone; the chord, played fortissimo, shatters loudest at whatever note the flesh confessed — the attunement law made a discipline.',
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
  }
];

// --- The class-skill stat lane ----------------------------------------------
// One generated stat per class — classSkill_<id> — meaning "+N levels to this
// class's STARTING skills", resolved against the LIVE bar above: re-order or
// swap a class's starters and every "+1 to <Class> Skills" affix, unique, or
// passive keeps working with zero data edits. recalcSeat sweeps each known
// skill against every class bar and writes the summed bonus onto the instance
// (SkillInstance.bonusLevels); gear grants the stat like any other modifier.

export const classSkillStat = (classId: string): string => `classSkill_${classId}`;

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
  /** Skill points level skills and support gems. They do NOT come from
   *  leveling up — they're earned by sacrificing skill gems at a font. */
  skillPointsPerLevel: 0,
  /** Passive points: spent on the passive tree (attributes live there). */
  passivePointsPerLevel: 1,
  lifePerLevel: 4,
  manaPerLevel: 4,
  xpForLevel(level: number): number {
    return Math.floor(45 * Math.pow(level, 1.55));
  },
};
