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
    bar: ['firebolt', 'frost_nova', 'shockfront', null, null, null, null, null],
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
    bar: ['frenzy', 'stealth', 'shadow_step', 'cloak', null, null, null, null],
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
    bar: ['surgical_strike', 'dash_strike', 'buckler_strike', 'wild_strike', 'fan_of_blades', null, null, null],
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
    bar: ['frenzy', 'reckoning', 'stone_skin', null, null, null, null, null],
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
    bar: ['rend', 'eviscerate', 'stealth', 'invisibility', null, null, null, null],
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
    bar: ['sanctified_strike', 'mend', 'consecration', 'benediction', null, null, null, null],
    startNode: 'wil_start', // the devout ward → the Willpower point
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
