// ---------------------------------------------------------------------------
// CLASS TEMPLATES.
//
// Classes are intentionally thin — Elder Scrolls style. A class is only:
//   1. a starting attribute spread,
//   2. a pre-bound skill bar,
//   3. a starting position on the passive tree.
// Nothing is locked: every character can allocate any attribute on level-up
// and bind ANY skill whose attribute requirements they meet. A Warrior who
// pumps Willpower becomes a summoner; that's the point.
//
// Innate modifiers were deliberately REMOVED (the optional fields below are
// the seam): they return, properly differentiated, in the class balance pass.
// ---------------------------------------------------------------------------

import type { Attributes, Modifier } from '../engine/stats';

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  color: string;
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
    description: 'A disciplined front-line fighter. Heavy blows, heavier armor, and a war cry that turns the tide.',
    color: '#d8b06a',
    attributes: { strength: 20, dexterity: 10, intelligence: 4, vitality: 20, willpower: 6 },
    bar: ['cleave', 'shield_up', 'war_cry', null, null, null, null, null],
    startNode: 'war_start',
  },
  {
    id: 'magician', name: 'Magician',
    description: 'A mystic mage that flings forth the destructive elemental powers of fire, frost and storm.',
    color: '#7a9aff',
    attributes: { strength: 2, dexterity: 6, intelligence: 28, vitality: 8, willpower: 16 },
    bar: ['firebolt', 'frost_nova', 'shockfront', null, null, null, null, null],
    startNode: 'sor_start', // elemental caster → the sorcerer wedge
  },
  {
    id: 'rogue', name: 'Rogue',
    description: 'A renegade rogue that dispatches its enemies with no one around being any the wiser.',
    color: '#5a5c57',
    attributes: { strength: 14, dexterity: 24, intelligence: 2, vitality: 16, willpower: 4 },
    bar: ['frenzy', 'stealth', 'shadow_step', 'cloak', null, null, null, null],
    startNode: 'swb_start', // stealth duelist → the swashbuckler wedge
  },
  {
    id: 'berserker', name: 'Berserker',
    description: 'Trades safety for speed and fury. Heavy strikes stack into a whirlwind of carnage — and leech life back.',
    color: '#e05545',
    attributes: { strength: 18, dexterity: 18, intelligence: 2, vitality: 14, willpower: 8 },
    bar: ['heavy_strike', 'whirlwind', 'dash', null, null, null, null, null],
    startNode: 'brz_start',
  },
  {
    id: 'sorcerer', name: 'Sorcerer',
    description: 'A scholar of the destructive elements that has mastered the way of decimating clusters of enemies at once.',
    color: '#ce7eac',
    attributes: { strength: 6, dexterity: 6, intelligence: 28, vitality: 12, willpower: 8 },
    bar: ['infernal_ray', 'storm_call', 'ice_shield', null, null, null, null, null],
    startNode: 'sor_start',
  },
  {
    id: 'ranger', name: 'Ranger',
    description: 'Death from afar. Arrows that pierce ranks, knives that fan across the field.',
    color: '#8ac860',
    attributes: { strength: 8, dexterity: 26, intelligence: 8, vitality: 12, willpower: 6 },
    bar: ['piercing_arrow', 'fan_of_blades', 'quickstep', null, null, null, null, null],
    startNode: 'rng_start',
  },
  {
    id: 'guardian', name: 'Guardian',
    description: 'A bulky defender of the front-lines, hard to ignore and even harder to put down.',
    color: '#EAF6F9',
    attributes: { strength: 14, dexterity: 12, intelligence: 4, vitality: 24, willpower: 6 },
    bar: ['hammer_of_judgment', 'aegis_ward', 'rallying_howl', null, null, null, null, null],
    startNode: 'war_start', // tanky front-liner → the warrior wedge
  },
  {
    id: 'summoner', name: 'Summoner',
    description: 'Commands the dead and the elemental. Your minions run on the same skills monsters do — because they are monsters.',
    color: '#b06bd4',
    attributes: { strength: 6, dexterity: 4, intelligence: 16, vitality: 10, willpower: 24 },
    bar: ['venom_bolt', 'summon_skeleton', 'summon_skeleton_archer', null, null, null, null, null],
    startNode: 'sum_start',
  },
  {
    id: 'swashbuckler', name: 'Swashbuckler',
    description: 'A duelist who is never where the blow lands. Dashes through enemy lines, blades first.',
    color: '#6ab8d8',
    attributes: { strength: 10, dexterity: 24, intelligence: 8, vitality: 12, willpower: 6 },
    bar: ['surgical_strike', 'dash_strike', 'buckler_strike', 'wild_strike', 'fan_of_blades', null, null, null],
    startNode: 'swb_start',
  },
  {
    id: 'juggernaut', name: 'Juggernaut',
    description: 'It hits and it takes hits. And it does not stop.',
    color: '#80ccff',
    attributes: { strength: 24, dexterity: 12, intelligence: 2, vitality: 16, willpower: 6 },
    bar: ['frenzy', 'reckoning', 'stone_skin', null, null, null, null, null],
    startNode: 'brz_start', // frenzy-charge bruiser → the berserker wedge
  },
  {
    id: 'pyromancer', name: 'Pyromancer',
    description: 'The pyric pyromancer is fueled by explosions and fire and burns it. Burns it all with fire.',
    color: '#ffa64d',
    attributes: { strength: 4, dexterity: 4, intelligence: 28, vitality: 10, willpower: 14 },
    bar: ['flame_arrow', 'ignite', 'pillar_of_flame', null, null, null, null, null],
    startNode: 'sor_start', // fire caster → the sorcerer wedge
  },
  {
    id: 'assassin', name: 'Assassin',
    description: 'The assassin bleeds their enemies dry before moving in for the kill, all the while being unseen.',
    color: '#2d4f83',
    attributes: { strength: 14, dexterity: 18, intelligence: 6, vitality: 14, willpower: 8 },
    bar: ['rend', 'eviscerate', 'stealth', 'invisibility', null, null, null, null],
    startNode: 'swb_start', // unseen blade → the swashbuckler wedge
  },
  {
    id: 'cleric', name: 'Cleric',
    description: 'The line holds because someone holds it together. Mends the wounded, sanctifies the ground, and swings a blessed arc when the fight closes in — the support archetype, played straight.',
    color: '#8ae0a8',
    attributes: { strength: 10, dexterity: 4, intelligence: 12, vitality: 12, willpower: 22 },
    bar: ['sanctified_strike', 'mend', 'consecration', 'benediction', null, null, null, null],
    startNode: 'sum_start', // willpower wedge — the devout share the summoner's roots
  }
];

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
