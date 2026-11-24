import './minionFamilies';
import { DOCTRINE_SKILLS } from './battleDoctrines';
import { SUMMON_PACT_SKILLS } from './summonPacts';
import { RADIANT_SENTINEL } from './carriedFields';
import { registerCompanionGrants } from '../engine/companionGrants';
import { HIVECALL_SKILLS } from './hivecall';
import { GOAD_SKILLS } from './goadSkills';
import { COMPANION_SKILLS } from './companionSkills';
import { FLASK_TREES } from './flaskTrees';
import { FLASK_SKILLS } from './flaskSkills';
import { ORB_HIT_CADENCE_TEXT } from './orbs';
import { DISCIPLINE_STARTER_TREES } from './disciplineStarterTrees';
import { BOND_STARTER_TREES } from './bondStarterTrees';
import { RUNEWEAVER_STARTER_TREES } from './runeweaverStarterTrees';
import { RESONATOR_STARTER_TREES } from './resonatorStarterTrees';
import { BASTION_STARTER_TREES } from './bastionStarterTrees';
import { DUELIST_STARTER_TREES } from './duelistStarterTrees';
import { WORKSHOP_SKILLS } from './workshopSkills';
import { IMPACT_STARTER_TREES } from './impactStarterTrees';
import { CONTROL_STARTER_TREES } from './controlStarterTrees';
import { PRECISION_STARTER_TREES } from './precisionStarterTrees';
import { RUBBLEKIN_SKILLS } from './rubblekin';
import { PACT_STEEL_STARTER_TREES } from './pactSteelStarterTrees';
import { PACT_SKILLS } from './pactSkills';
import { DEVOTED_STARTER_TREES } from './devotedStarterTrees';
import { FRONTIER_STARTER_TREES } from './frontierStarterTrees';
import { STARTER_SKILL_TREES } from './starterSkillTrees';
import { NECROMANCER_SACRAMENTS } from './necromancerSacraments';
import { NECROMANCER_RITES } from './necromancerRites';
// ---------------------------------------------------------------------------
// THE SKILL CATALOG.
//
// Every ability in the game — player, monster, or minion — lives here as a
// plain data entry. To create a new skill: pick a delivery, attach effects,
// set tags (tags decide which stat modifiers scale it), optionally gate it
// behind attributes, and give it an `ai` hint so monsters can use it too.
// No engine changes required.
// ---------------------------------------------------------------------------

import { mod, linkMod, STAT_DEFS } from '../engine/stats';
import { skillGrantStat, type SkillDef } from '../engine/skills';
import { SMALL_ARMY_COMBAT, MINION_COMBAT } from '../engine/minionCombat';
import { TOWN_PORTAL_SKILL } from './townportals';
import { ULTIMATE_SKILLS } from './ultimates';
import { LIVING_SKILLS } from './livingSkills';
import { REACTIVE_SKILLS } from './reactiveSkills';
import { NECROMANCER_TREES } from './necromancerTrees';
import { NECROMANCER_SKILLS } from './necromancerSkills';
import { ROOTWILD_SKILLS } from './rootwildSkills';
import { ARENA_BOSS_SKILLS } from './arenaBosses';
import { MAGIC_PACK_SKILLS } from './magicPackSkills';
import { SATELLITE_SKILLS } from './satellites';
import { AURORA_SKILLS } from './auroras';
import { CREEPER_SKILLS } from './creepers';
import { WORLDBOSS_ENCOUNTER_SKILLS } from './worldBossEncounters';
import { TITAN_SKILLS } from './titans';

export const SKILLS: Record<string, SkillDef> = {
  ...HIVECALL_SKILLS,
  ...COMPANION_SKILLS,
  ...GOAD_SKILLS,
  town_portal: TOWN_PORTAL_SKILL,
  ...NECROMANCER_SKILLS,
  ...SUMMON_PACT_SKILLS,
  [RADIANT_SENTINEL.id]: RADIANT_SENTINEL,
  ...DOCTRINE_SKILLS,
  ...RUBBLEKIN_SKILLS,
  ...PACT_SKILLS,
  ...ROOTWILD_SKILLS,
  ...ARENA_BOSS_SKILLS,
  ...MAGIC_PACK_SKILLS,
  ...SATELLITE_SKILLS,
  ...AURORA_SKILLS,
  ...CREEPER_SKILLS,
  ...WORLDBOSS_ENCOUNTER_SKILLS,
  ...TITAN_SKILLS,
  ...WORKSHOP_SKILLS,
  ...FLASK_SKILLS,

  // ======================= Mimicry (the blue-mage lane) ====================
  // THE SLOT and its cycle payload (engine/mimic.ts — capture is the
  // fabric's business), plus the Mummers' TEACHING ARTS below the pair:
  // the troupe's own kit, noDrop like every monster art. The only way to
  // cast a teaching art is to capture it — which is the point.

  mimicry: {
    id: 'mimicry', name: 'Mimicry',
    description: 'Capture enemy skills that strike you once their monster type is studied to the'
      + ' Arts tier of the bestiary, then cast the chosen skill at reduced power. Shift-press'
      + ' to cycle captured forms.',
    tags: ['mimic'], color: '#c8a0e8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [],
    mimic: {},
    meta: { skillId: 'mimic_attune', label: 'Next form' },
    minDropLevel: 3,
    dropWeight: 60,
  },

  mimic_attune: {
    id: 'mimic_attune', name: 'Change Form',
    description: 'Cycle to the next captured skill in your Mimicry repertoire.',
    tags: ['mimic', 'instant'], color: '#c8a0e8',
    manaCost: 0, cooldown: 0.25, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'mimicSelect', step: 1 }],
    noDrop: true,
  },

  mocking_refrain: {
    id: 'mocking_refrain', name: 'Mocking Refrain',
    description: 'Unleash a nova of physical damage around you with a 50% chance to befuddle'
      + ' enemies hit.',
    tags: ['spell', 'aoe', 'physical'], color: '#d8b8e8',
    manaCost: 6, cooldown: 5, useTime: 0.7,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'nova', radius: 95 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'befuddlement', chance: 0.5 },
    ],
    noDrop: true,
    ai: { range: 85, weight: 3 },
  },

  shard_waltz: {
    id: 'shard_waltz', name: 'Shard Waltz',
    description: 'Slash in a wide melee arc, dealing physical and cold damage with a 35% chance'
      + ' to leave enemies vulnerable.',
    tags: ['attack', 'melee', 'physical', 'cold'], color: '#b8d8e8',
    manaCost: 5, cooldown: 3, useTime: 0.8,
    baseDamage: { physical: [8, 12], cold: [3, 6] },
    delivery: { type: 'melee', range: 58, arcDeg: 150 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'vulnerable', chance: 0.35 },
    ],
    noDrop: true,
    ai: { range: 60, weight: 3 },
  },

  borrowed_visage: {
    id: 'borrowed_visage', name: 'Borrowed Visage',
    description: 'Fire a projectile of chaos damage with a 35% chance to leave the target'
      + ' addled.',
    tags: ['spell', 'projectile', 'chaos'], color: '#c090e0',
    manaCost: 7, cooldown: 2, useTime: 0.8,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'projectile', speed: 360, radius: 8, range: 460 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'addled', chance: 0.35 },
    ],
    noDrop: true,
    ai: { range: 380, weight: 3, keepDistance: 220 },
  },

  showstopper: {
    id: 'showstopper', name: 'Showstopper',
    description: 'Sweep a cone of physical damage in front of you that knocks enemies back, with'
      + ' a 25% chance to stun.',
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#e8c8a0',
    manaCost: 10, cooldown: 7, useTime: 1.0,
    baseDamage: { physical: [19, 28] },
    delivery: { type: 'cone', range: 120, arcDeg: 80 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 130 },
      { type: 'status', status: 'stun', chance: 0.25 },
    ],
    noDrop: true,
    ai: { range: 100, weight: 4 },
  },

  // ======================= Warrior / melee =================================

  cleave: {
    tree: STARTER_SKILL_TREES.cleave,
    id: 'cleave', name: 'Cleave', icon: 'sweep',
    description: 'A wide melee swing that deals physical damage to every enemy in the arc in'
      + ' front of you.',
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#d8b06a',
    manaCost: 2, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [7, 11] },
    delivery: { type: 'melee', range: 55, arcDeg: 130 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 12 },
    ai: { range: 60, weight: 2 },
  },

  heavy_strike: {
    tree: DEVOTED_STARTER_TREES.heavy_strike,
    id: 'heavy_strike', name: 'Heavy Strike',
    description: "Deliver a crushing melee blow that knocks the target back and has a 35% chance to stun.",
    tags: ['attack', 'melee', 'physical'], color: '#e09040',
    manaCost: 4, cooldown: 2.5, useTime: 0.9,
    baseDamage: { physical: [16, 24] },
    delivery: { type: 'melee', range: 50, arcDeg: 60 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.35 },
      { type: 'knockback', strength: 90 },
    ],
    requirements: { strength: 14 },
    ai: { range: 55, weight: 3 },
  },

  ground_slam: {
    id: 'ground_slam', name: 'Ground Slam',
    description: "Slam the ground to deal physical damage in a nova around you, with a 30% chance to stun enemies hit.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#b8865a',
    manaCost: 7, cooldown: 4, useTime: 0.9,
    baseDamage: { physical: [12, 18] },
    delivery: { type: 'nova', radius: 95 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.3 },
    ],
    requirements: { strength: 24 },
    ai: { range: 80, weight: 3 },
  },

  // --- THE IRON BELL's verbs (worldboss 'iron_bell') -------------------------
  // The walking mausoleum's whole fight is these two beats: the STRIDE is a
  // ground cast aimed at the colossus's OWN next foot placement (the brain's
  // at:'ahead' verb — the FORESIGHT decal telegraphs the footfall for the
  // entire windup), and the TOLL is its punctuation — the carried bell rings
  // banked afflictions off the bearer (SkillDef.selfCleanse) and stuns the
  // near field. Both are ordinary data: any body may learn to walk this way.
  ironbell_step: {
    id: 'ironbell_step', name: 'Sepulchral Stride',
    description: 'Mark the ground ahead and slam down after a wind-up, dealing physical damage'
      + ' and knocking nearby enemies back.',
    noDrop: true,
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#8d8672',
    manaCost: 0, cooldown: 2.5, useTime: 2.6,
    baseDamage: { physical: [46, 64] },
    delivery: { type: 'ground', radius: 96, castRange: 300, delay: 0.35 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 430 },
    ],
  },
  ironbell_toll: {
    id: 'ironbell_toll', name: 'The Toll',
    description: 'Ring a wide nova of physical damage that stuns enemies hit for 1.15 seconds'
      + ' while cleansing a third of the caster\'s affliction stacks.',
    noDrop: true,
    tags: ['spell', 'aoe', 'physical'], color: '#d8c8a0',
    manaCost: 0, cooldown: 2.5, useTime: 0.4,
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'nova', radius: 215 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 1, durationOverride: 1.15 },
    ],
    selfCleanse: { stacksPortion: 0.34 },
  },

  // --- THE HORDEFATHER's verb (goblin_colossus — the scene fabric's
  // prologue reckoning; the Odyssey road's ending argument) ------------------
  // A muster measured in HELD BREATHS: the longest honest wind-up in the
  // catalog, then the whole field is unmade at once. `affects: 'all'` is the
  // point — the Hordefather spends its own horde as gladly as its enemies
  // (the detonation is an ARGUMENT, not an attack), and `occlusion: 'free'`
  // lets no tree save what the horn has already claimed.
  hordefathers_reckoning: {
    id: 'hordefathers_reckoning', name: "Hordefather's Reckoning",
    description: 'Wind up for 10 seconds, then release a massive nova of physical and fire'
      + ' damage that knocks back all creatures in range. Hits both allies and enemies and'
      + ' ignores cover.',
    noDrop: true,
    tags: ['spell', 'aoe', 'fire', 'physical'], color: '#9fdc6a',
    // TEN HELD BREATHS (the agency tutorial, engine/scenes.ts reckoning): the
    // muster is a real cast the player is free to spend trying to stop — the
    // bar is the clock, the clock is the drama. Interrupts delay, the mercy
    // floor denies the kill, and the blast keeps its one promise.
    manaCost: 0, cooldown: 45, useTime: 10,
    baseDamage: { physical: [340, 480], fire: [280, 420] },
    // spareCaster: the horn's author is not its audience — an enraged Father
    // at his floor must survive his own verb (else the reckoning fades
    // through the dead-commander lane and the field is never felled).
    delivery: { type: 'nova', radius: 2600, affects: 'all', occlusion: 'free', spareCaster: true },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 720 },
    ],
    ai: { range: 900, weight: 0.4 },
  },

  war_cry: {
    tree: STARTER_SKILL_TREES.war_cry,
    id: 'war_cry', name: 'War Cry', icon: 'rally',
    description: 'Bellow a war cry that grants 40% increased damage and 15% increased attack'
      + ' speed for 6 seconds.',
    tags: ['warcry', 'buff', 'duration'], color: '#e8d44a',
    manaCost: 8, cooldown: 9, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'war_cry', duration: 6,
      mods: [mod('damage', 'increased', 0.4), mod('attackSpeed', 'increased', 0.15)],
    }],
    requirements: { strength: 16 },
    ai: { range: 250, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('cooldownRecovery', 'increased', 0.06)] },
  },

  // ======================= Berserker =======================================

  frenzy: {
    id: 'frenzy', name: 'Frenzy',
    description: 'A rapid melee strike of physical damage. Each hit grants a Fury charge and'
      + ' stacks a 6-second buff of 8% increased attack speed and 6% increased damage, up to 5'
      + ' stacks of each.',
    tags: ['attack', 'melee', 'physical'], color: '#e05545',
    manaCost: 3, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [6, 9] },
    delivery: { type: 'melee', range: 50, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      {
        type: 'buff', id: 'frenzy', duration: 6, maxStacks: 5,
        mods: [mod('attackSpeed', 'increased', 0.08), mod('damage', 'increased', 0.06)],
      },
      // Combo generator: banks Fury for Reckoning to consume.
      { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
    ],
    requirements: { strength: 10, dexterity: 14 },
    ai: { range: 55, weight: 2 },
  },

  whirlwind: {
    tree: DEVOTED_STARTER_TREES.whirlwind,
    id: 'whirlwind', name: 'Whirlwind',
    description: 'Channel a spinning blade attack that deals physical damage to nearby enemies'
      + ' while moving at 30% reduced speed.',
    tags: ['attack', 'melee', 'physical', 'aoe', 'channel'], color: '#d87060',
    manaCost: 3, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.45, move: 'slowed', moveFactor: 0.7, trackAim: false },
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'nova', radius: 75 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 14, dexterity: 10 },
    ai: { range: 65, weight: 2 },
  },

  undertow: {
    id: 'undertow', name: 'Undertow',
    description: 'Channel a whirlpool around yourself that pulls nearby enemies inward while'
      + ' dealing cold and physical damage over time, with a 20% chance to chill. Damage'
      + ' increases the longer you channel while your movement gradually slows to a stop.',
    tags: ['spell', 'cold', 'aoe', 'channel', 'duration'], color: '#4a90b8',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.45, move: 'slowed', moveFactor: 0.85, trackAim: false,
      // The current DEEPENS: damage grows per held second while the
      // bearer's own footing drains away (rampMove, negative per, max 0 —
      // the outer floor does the clamping; fully anchored near ~3.5s).
      ramp: { per: 0.16, max: 1.1 },
      rampMove: { per: -0.24, max: 0 },
    },
    baseDamage: { cold: [4, 7], physical: [3, 5] },
    delivery: {
      // Each beat re-lays ONE worn suction field (exclusive + follow): the
      // current is continuous while held and eddies out ~0.6s after.
      type: 'ground', radius: 95, castRange: 0,
      lingerDuration: 0.6, tickInterval: 0.3,
      noImpact: true, exclusive: true, follow: true,
      pull: 210, pullRadius: 300,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.2 },
    ],
    requirements: { intelligence: 16, willpower: 12 },
    ai: { range: 90, weight: 2 },
  },

  // ============= The Drowned Court's verbs (sunken nobility) ===============
  // The void_hook doctrine again: the court's arts DROP as gems — board the
  // Wraithsail, break the court, learn what the sea taught them. The family
  // signature rides two existing fabrics: `sodden` (the terrain soak status —
  // the tide leaves you heavy) and WARD (the decaying shield — a swell that
  // must ebb).

  tide_lash: {
    id: 'tide_lash', name: 'Tide Lash',
    description: 'A melee strike of physical and cold damage in front of you, with a 45% chance'
      + ' to leave the victim sodden and slowed.',
    tags: ['attack', 'melee', 'physical', 'cold'], color: '#6ac8d8',
    manaCost: 0, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [5, 8], cold: [3, 6] },
    delivery: { type: 'melee', range: 58, arcDeg: 80 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sodden', chance: 0.45 },
    ],
    requirements: { dexterity: 12, strength: 10 },
    minDropLevel: 8, dropWeight: 0.7,
    ai: { range: 55, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('attackSpeed', 'increased', 0.02)] },
  },

  drowning_grasp: {
    id: 'drowning_grasp', name: 'Drowning Grasp',
    description: 'Conjure grasping hands at a target point that pull nearby enemies inward and'
      + ' deal cold and physical damage, with a 30% chance to root targets for 0.9 seconds.',
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#3a8a7c',
    manaCost: 11, cooldown: 7, useTime: 0.6,
    baseDamage: { cold: [6, 10], physical: [4, 7] },
    delivery: {
      type: 'ground', radius: 85, castRange: 320,
      lingerDuration: 0.7, tickInterval: 0.35,
      pull: 180, pullRadius: 170,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.3, durationOverride: 0.9 },
    ],
    requirements: { intelligence: 15, willpower: 10 },
    minDropLevel: 10, dropWeight: 0.6,
    ai: { range: 300, weight: 2, keepDistance: 120 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  // The Regent's rhythm: the tide comes IN (a ward swell you should not hit
  // into) and the tide goes OUT (the decay window where he is honest meat).
  // Self-delivery ward — the one pool that drains itself (engine WardEffect).
  tideward_swell: {
    id: 'tideward_swell', name: 'Tideward Swell', noDrop: true,
    description: 'Gain 85 ward to absorb incoming damage before it decays.',
    tags: ['spell', 'cold', 'duration'], color: '#7ad8d8',
    manaCost: 22, cooldown: 9, useTime: 0.45,
    delivery: { type: 'self' },
    effects: [{ type: 'ward', amount: 85 }],
    ai: { range: 999, weight: 3 },
  },

  // ============== The Sirocco Court's verbs (desert monsters) ==============
  // The void_hook doctrine: monster verbs DROP as gems on purpose — kill the
  // court, learn its arts. All lootable, all presence-humble.

  mirage_knife: {
    id: 'mirage_knife', name: 'Mirage Knife',
    description: 'Deliver a quick melee slash in front of you that deals physical and fire'
      + ' damage.',
    tags: ['attack', 'melee', 'fire'], color: '#e8d8a8',
    manaCost: 4, cooldown: 0, useTime: 0.42,
    baseDamage: { physical: [6, 10], fire: [3, 6] },
    delivery: { type: 'melee', range: 60, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 14 },
    minDropLevel: 7, dropWeight: 0.7,
    ai: { range: 55, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('attackSpeed', 'increased', 0.02)] },
  },

  heat_split: {
    id: 'heat_split', name: 'Heat Split',
    description: 'Summon a double of hot air that fights with a blade at your side for 12'
      + ' seconds. Up to 2 doubles can stand at once.',
    tags: ['spell', 'summon', 'fire', 'minion'], color: '#f0d8b0',
    manaCost: 14, cooldown: 9, useTime: 0.4,
    delivery: { type: 'summon', monsterId: 'heat_double', count: 1, maxActive: 2, duration: 12 },
    effects: [],
    requirements: { intelligence: 14 },
    minDropLevel: 9, dropWeight: 0.6,
    ai: { range: 300, weight: 2, keepDistance: 140 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.08), mod('minionLife', 'increased', 0.08)] },
  },

  salt_burst: {
    id: 'salt_burst', name: 'Salt Burst',
    description: 'Release a nova of brine shards around you, dealing physical damage to nearby'
      + ' enemies.',
    tags: ['spell', 'aoe', 'physical'], color: '#e8e0c8',
    manaCost: 10, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [9, 15] },
    delivery: { type: 'nova', radius: 95 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 14 },
    minDropLevel: 7, dropWeight: 0.7,
    ai: { range: 70, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  whirl_of_grit: {
    id: 'whirl_of_grit', name: 'Whirl of Grit',
    description: 'Whip sand into a scouring cone in front of you, dealing physical damage and'
      + ' knocking enemies back.',
    tags: ['spell', 'aoe', 'physical'], color: '#d8b878',
    manaCost: 9, cooldown: 4, useTime: 0.55,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'cone', range: 150, arcDeg: 55 },
    effects: [{ type: 'damage' }, { type: 'knockback', strength: 90 }],
    requirements: { intelligence: 12, dexterity: 10 },
    minDropLevel: 8, dropWeight: 0.7,
    ai: { range: 130, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.03)] },
  },

  solar_litany: {
    id: 'solar_litany', name: 'Solar Litany',
    description: 'Gain 20% increased fire damage and 10% increased cast speed for 6 seconds.',
    tags: ['spell', 'buff', 'fire', 'duration'], color: '#ffd870',
    manaCost: 12, cooldown: 11, useTime: 0.7,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'sun_sworn', duration: 6,
      mods: [mod('damage', 'increased', 0.2, ['fire']), mod('castSpeed', 'increased', 0.1)],
    }],
    requirements: { willpower: 16 },
    minDropLevel: 10, dropWeight: 0.6,
    ai: { range: 240, weight: 2, keepDistance: 160 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  // ================= SUN & SAND (the desert's own discipline) ==============
  // Found, not taught: the pool unlocks by descending a buried vault
  // ('vault_entered' — meta/unlocks.ts). The family's identity is
  // WEAPONIZED SUNSCORCH: the same stacks the desert bakes onto you, turned
  // on whatever stands in the light.

  glass_lance: {
    id: 'glass_lance', name: 'Glass Lance',
    description: 'Throw a fast spear of fused glass that deals physical and fire damage, with a'
      + ' 35% chance to inflict sunscorched.',
    tags: ['spell', 'projectile', 'fire'], color: '#e8f0d8',
    manaCost: 8, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [6, 9], fire: [8, 13] },
    delivery: { type: 'projectile', speed: 680, radius: 7, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sunscorched', chance: 0.35 },
    ],
    requirements: { intelligence: 14, dexterity: 10 },
    minDropLevel: 8,
    ai: { range: 420, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('projectileSpeed', 'increased', 0.03)] },
  },

  dune_surge: {
    id: 'dune_surge', name: 'Dune Surge',
    description: 'Dash forward on a wave of sand, dealing physical damage to enemies in your'
      + ' path, knocking them back, and having a 50% chance to inflict sunscorched.',
    tags: ['attack', 'melee', 'movement', 'physical'], color: '#d8b878',
    manaCost: 10, cooldown: 5, useTime: 0.3,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'dash', distance: 240, speed: 860, width: 54 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 130 },
      { type: 'status', status: 'sunscorched', chance: 0.5 },
    ],
    requirements: { strength: 12, dexterity: 12 },
    minDropLevel: 9,
    // Shove-dash: point-blank picks collapse to the near discount.
    ai: { range: 220, weight: 2, minRange: 120 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  mirage_step: {
    id: 'mirage_step', name: 'Mirage Step',
    description: 'Blink to a target point and gain 35% increased evasion and 30% less'
      + ' detectability for 2.5 seconds.',
    tags: ['spell', 'movement', 'fire'], color: '#f0e4c0',
    manaCost: 9, cooldown: 6, useTime: 0,
    delivery: { type: 'blink', range: 300 },
    effects: [{
      type: 'buff', id: 'mirage_step_veil', duration: 2.5,
      mods: [mod('evasion', 'increased', 0.35), mod('detectability', 'more', -0.3)],
    }],
    requirements: { dexterity: 14, intelligence: 10 },
    minDropLevel: 10,
    ai: { range: 260, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  sirocco_ring: {
    id: 'sirocco_ring', name: 'Sirocco Ring',
    description: 'Release a wide nova of fire damage that inflicts sunscorched on all enemies'
      + ' hit.',
    tags: ['spell', 'aoe', 'fire', 'duration'], color: '#ffb64a',
    manaCost: 14, cooldown: 7, useTime: 0.65,
    baseDamage: { fire: [7, 12] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sunscorched', chance: 1 },
    ],
    requirements: { intelligence: 16 },
    minDropLevel: 11,
    ai: { range: 100, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.03)] },
  },

  solar_brand: {
    id: 'solar_brand', name: 'Solar Brand',
    description: 'Strike a single target with fire damage and apply 2 stacks of sunscorched,'
      + ' with a 60% chance to apply a third stack.',
    tags: ['spell', 'fire', 'targeted', 'duration'], color: '#ffd870',
    manaCost: 11, cooldown: 8, useTime: 0.5,
    baseDamage: { fire: [5, 8] },
    // The brand strikes only what this spec resolves (probe_targetstrike).
    targeting: { target: 'enemy', castRange: 420 },
    delivery: { type: 'target', splash: 40 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sunscorched', chance: 1 },
      { type: 'status', status: 'sunscorched', chance: 1 },
      { type: 'status', status: 'sunscorched', chance: 0.6 },
    ],
    requirements: { willpower: 14, intelligence: 12 },
    minDropLevel: 12,
    ai: { range: 380, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09)] },
  },

  // ======================= Fire ============================================

  firebolt: {
    tree: STARTER_SKILL_TREES.firebolt,
    id: 'firebolt', name: 'Firebolt', icon: 'ember',
    description: 'Fire a bolt of flame that deals fire damage with a 35% chance to burn.',
    tags: ['spell', 'projectile', 'fire'], color: '#ff7a2a',
    manaCost: 6, cooldown: 0, useTime: 0.75,
    baseDamage: { fire: [10, 16] },
    delivery: { type: 'projectile', speed: 380, radius: 9, range: 520 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.3 },
    ],
    requirements: { intelligence: 12 },
    ai: { range: 480, weight: 2, keepDistance: 260 },
    // Example of custom growth: flat fire per level on top of % damage.
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('addedFire', 'flat', 1.5)] },
  },

  // THE CLUTCH FABRIC's player half (engine/clutch.ts): a projectile whose
  // LANDED blow births a minion out of the wound — the hit-gated `birth`
  // lane (a flight that dies in the dirt breeds nothing). The sprite is an
  // ordinary summon citizen: minion investment, roster caps and lifespans
  // are all the standing law, and minion gems socket by the tag.
  cinderwisp: {
    id: 'cinderwisp', name: 'Cinderwisp',
    description: 'Fire a slow ember that deals fire damage with a 15% chance to burn. Hitting an'
      + ' enemy spawns a cinder sprite at the target that casts firebolts for 10 seconds, up to'
      + ' 2 active at once.',
    tags: ['spell', 'fire', 'projectile', 'minion'], color: '#ffa050',
    manaCost: 14, cooldown: 0, useTime: 0.8,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'projectile', speed: 300, radius: 7, range: 460 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.15, magnitude: 0.25 },
      // The sprite CONDENSES out of the struck body (the light motion) —
      // never out of a spent ember in the dirt (onHit: resolveHit's gate).
      { type: 'birth', onHit: true, monsterId: 'cinder_sprite', duration: 10, cap: 2, emerge: { motion: 'condense' } },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 420, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('damage', 'increased', 0.06)] },
  },

  flame_wave: {
    id: 'flame_wave', name: 'Flame Wave',
    description: 'Sweep a wave of flame across a cone in front of you, dealing fire damage with'
      + ' a 45% chance to burn.',
    tags: ['spell', 'fire', 'aoe'], color: '#ff9a3a',
    manaCost: 9, cooldown: 1.5, useTime: 0.8,
    baseDamage: { fire: [9, 14] },
    delivery: { type: 'cone', range: 190, arcDeg: 60 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.45, magnitude: 0.3 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 160, weight: 3, keepDistance: 120 },
  },

  infernal_rift: {
    id: 'infernal_rift', name: 'Infernal Rift',
    description: 'Tear open the ground at a target point, erupting after a short delay to deal'
      + ' fire damage with a 60% chance to burn.',
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff5a1a',
    manaCost: 14, cooldown: 5, useTime: 0.85,
    baseDamage: { fire: [24, 36] },
    delivery: { type: 'ground', radius: 85, castRange: 450, delay: 0.8 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.6, magnitude: 0.35 },
    ],
    requirements: { intelligence: 26 },
    ai: { range: 420, weight: 3, keepDistance: 280 },
  },

  // The war-wound's own verb (the hate_rent cadence payload + the hellsear
  // front's strike): infernal_rift's cold-green chaos twin. The volcanic
  // country lobs fire OUT of its vents; the rift tears the ground open
  // UNDER you — and what comes through lingers.
  hate_eruption: {
    id: 'hate_eruption', name: 'Hate Eruption',
    description: 'Tear open the ground at a target point, erupting after a short delay to deal'
      + ' chaos damage with a 50% chance to inflict torment.',
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#7de84a',
    manaCost: 14, cooldown: 5, useTime: 0.85,
    baseDamage: { chaos: [20, 32] },
    delivery: { type: 'ground', radius: 80, castRange: 450, delay: 0.85 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'torment', chance: 0.5, magnitude: 0.35 },
    ],
    requirements: { intelligence: 26 },
    ai: { range: 420, weight: 3, keepDistance: 280 },
  },

  // ======================= The Unmaking (void) =============================
  // The war-wound's arts, bottled (dropped as gems like any): chaos that
  // neither burns nor poisons but LOOSENS. The UNRAVELLING ladder is the
  // family spine — a compounding chaos rot (status.ts) that erodes chaos
  // resistance stack by stack, collapses into UNMADE at cap, and spreads
  // from the dead: the volcanic country pops when it dies; the unmaking
  // TRAVELS. Every piece here feeds the ladder a different way.

  unmaking_bolt: {
    id: 'unmaking_bolt', name: 'Unmaking Bolt',
    description: 'Fire a projectile of chaos damage with a 45% chance to inflict unravelling.',
    tags: ['spell', 'projectile', 'chaos'], color: '#7de84a',
    manaCost: 7, cooldown: 0, useTime: 0.75,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'projectile', speed: 360, radius: 9, range: 500 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'unravelling', chance: 0.45, magnitude: 0.6 },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 460, weight: 2, keepDistance: 260 },
  },

  null_verge: {
    id: 'null_verge', name: 'Null Verge',
    description: 'Open a lingering rift at a target point for 4.5 seconds that deals chaos'
      + ' damage over time to enemies standing inside it, with a 35% chance to inflict'
      + ' unravelling.',
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#5ee88a',
    manaCost: 14, cooldown: 6, useTime: 0.85,
    baseDamage: { chaos: [4, 7] },
    delivery: { type: 'ground', radius: 85, castRange: 430, lingerDuration: 4.5, tickInterval: 0.5, noImpact: true, exposure: 0.3 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'unravelling', chance: 0.35, magnitude: 0.45 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 400, weight: 3, keepDistance: 240 },
  },

  word_of_unmaking: {
    id: 'word_of_unmaking', name: 'Word of Unmaking',
    description: 'Fire a ring of 20 chaos bolts outward in all directions, dealing chaos damage'
      + ' and inflicting unravelling on every enemy hit.',
    tags: ['spell', 'projectile', 'chaos', 'aoe'], color: '#b8ffd0',
    manaCost: 24, cooldown: 4, useTime: 0.8,
    baseDamage: { chaos: [3, 5] },
    delivery: { type: 'projectile', speed: 250, radius: 9, range: 360, count: 20, ring: {} },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'unravelling', chance: 1, magnitude: 0.8 },
    ],
    requirements: { intelligence: 24, willpower: 10 },
    ai: { range: 300, weight: 3 },
  },

  // --- The Legion's arsenal: demon-kit skills (dropped as gems like any) ----

  hellfire_lash: {
    id: 'hellfire_lash', name: 'Hellfire Lash',
    description: 'Crack a burning whip in a long frontal arc, dealing fire damage with a 50%'
      + ' chance to sear, halving healing received, and a 25% chance to burn.',
    tags: ['attack', 'melee', 'fire', 'aoe'], color: '#ff5a3a',
    manaCost: 5, cooldown: 1.2, useTime: 0.75,
    baseDamage: { fire: [9, 15] },
    // Twice a sword's reach, half its arc — the whip hits a RIBBON, not a fan.
    delivery: { type: 'melee', range: 105, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sear', chance: 0.5 },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { strength: 14, intelligence: 10 },
    ai: { range: 100, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('addedFire', 'flat', 1.2)] },
  },

  brimstone_volley: {
    id: 'brimstone_volley', name: 'Brimstone Volley',
    description: 'Lob 3–4 brimstone mortars across the target area that burst on impact for'
      + ' fire and physical damage, with a 35% chance to burn.',
    tags: ['spell', 'fire', 'aoe', 'storm', 'duration'], color: '#ff7a3a',
    manaCost: 13, cooldown: 5, useTime: 0.85,
    baseDamage: { fire: [11, 17], physical: [4, 7] },
    delivery: { type: 'storm', count: [3, 4], interval: 0.22, areaRadius: 120, hitRadius: 60, castRange: 460 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.3 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 430, weight: 3, keepDistance: 280 },
  },

  rain_of_ash: {
    id: 'rain_of_ash', name: 'Rain of Ash',
    description: 'Blanket an area in falling ash for 4.5 seconds. Enemies who remain inside'
      + ' take fire damage over time with a 40% chance to sear, halving healing received, and a'
      + ' 20% chance to burn.',
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#c88a5a',
    manaCost: 12, cooldown: 6, useTime: 0.85,
    baseDamage: { fire: [3, 5] },
    // The exposure fume pattern (toxic_cloud): no impact blast, occupants
    // only, and the ash needs 0.35s in the lungs before it bites.
    delivery: { type: 'ground', radius: 95, castRange: 430, lingerDuration: 4.5, tickInterval: 0.5, noImpact: true, exposure: 0.35 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sear', chance: 0.4 },
      { type: 'status', status: 'burn', chance: 0.2, magnitude: 0.25 },
    ],
    requirements: { intelligence: 18, willpower: 12 },
    ai: { range: 400, weight: 3, keepDistance: 260 },
  },

  // --- THE SIEGECRAFT (the bombardment fabric's arsenal) --------------------
  //
  // engine/bombard.ts: standing guns lob these on their own jittered clocks.
  // hellshot_volley is the Warfront's trebuchet shot (sky-borne: it spares NO
  // side — lure the Grind's own ranks under their shells); hellbore_lob is
  // the player-planted engine's smaller cousin (keeper-scoped, never friendly
  // fire); hellbore_mortar plants that engine; levinshot_volley is the same
  // trebuchet shape in the LIGHTNING voice (the storm crown's gun — fx unset,
  // so the sky derives the true bolt). The lob comet + the drying
  // shell pocks ride the deliveries as pure data (lob / impactDress).

  hellshot_volley: {
    id: 'hellshot_volley', name: 'Hellshot Volley',
    description: 'Lob 2–3 burning shells high across the field that telegraph their landing'
      + ' before bursting for fire and physical damage with a 25% chance to burn. Hits both'
      + ' allies and enemies.',
    tags: ['attack', 'fire', 'aoe', 'storm'], color: '#ff6a2a',
    noDrop: true, // a trebuchet's arm, not a hand — never a gem
    manaCost: 0, cooldown: 2.5, useTime: 1.1,
    baseDamage: { fire: [10, 16], physical: [8, 14] },
    delivery: {
      type: 'storm', count: [2, 3], interval: 0.28, areaRadius: 85, hitRadius: 30,
      castRange: 4200, occlusion: 'free', // the sky does not ask the walls
      telegraph: 1.1, sky: true, lob: { arc: 0.38 },
      // fx 'blast' (THE EFFECT VOICE): a mortar bursts, it never strikes as
      // lightning — the sky posture keeps its laws (hitAll/spareDormant/
      // spareRoofed untouched), only the landing's costume changes. The
      // shell_crater pock below is the loved half and stays as it was.
      fx: 'blast',
      impactDress: { kind: 'shell_crater', evapAfter: [50, 100] },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    ai: { range: 560, weight: 3, keepDistance: 0 },
  },

  hellbore_lob: {
    id: 'hellbore_lob', name: 'Hellbore Lob',
    description: 'Lob a pair of blazing shells at enemies engaging the mortar\'s owner,'
      + ' bursting for fire and physical damage with a 20% chance to burn.',
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#e8823a',
    noDrop: true, // the engine's own throw (hellbore_mortar plants it)
    manaCost: 0, cooldown: 2, useTime: 0.7,
    baseDamage: { fire: [8, 13], physical: [5, 9] },
    delivery: {
      type: 'storm', count: [2, 2], interval: 0.22, areaRadius: 55, hitRadius: 26,
      castRange: 900, occlusion: 'free',
      telegraph: 0.5, lob: { arc: 0.42 },
      fx: 'blast', // THE EFFECT VOICE: hellshot_volley's family — a mortar bursts
      impactDress: { kind: 'shell_crater', evapAfter: [30, 60], chance: 0.6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.2, magnitude: 0.25 },
    ],
    ai: { range: 820, weight: 3, keepDistance: 0 },
  },

  hellbore_mortar: {
    id: 'hellbore_mortar', name: 'Hellbore Mortar',
    description: 'Deploy a mortar construct, up to 2 active at once, that lobs blazing shells'
      + ' at enemies engaging you, ignoring line of sight and scaling with your minion stats.',
    tags: ['spell', 'summon', 'minion', 'fire'], color: '#d8703a',
    manaCost: 30, cooldown: 4, useTime: 1,
    delivery: { type: 'summon', monsterId: 'hellbore_engine', count: 1, maxActive: 2 },
    effects: [],
    requirements: { intelligence: 16, strength: 12 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.12)] },
  },

  // --- THE CLUTCH MORTARS (THE CLUTCH FABRIC — engine/clutch.ts) ------------
  //
  // The mothers' kit: storm-lobbed shells whose landings BIRTH (the `birth`
  // effect at every strike's ring — World.birthAt). Each rings its landing
  // first (telegraph + the drawn lob comet), wounds where it bursts, and
  // stands its brood up through the emergence grammar (the ground under the
  // ring picks the motion — grave-earth RISES, a crate splinters). Kit
  // skills by the trebuchet law: noDrop, free, ai-hinted.

  vile_clutch: {
    id: 'vile_clutch', name: 'Vile Clutch',
    description: 'Lob a sac that bursts on impact for physical and chaos damage and spawns 1–2'
      + ' vile spawn, up to 8 active at once.',
    tags: ['spell', 'aoe', 'storm'], color: '#c05a6a',
    noDrop: true, // a womb's spasm, not a hand — never a gem
    manaCost: 0, cooldown: 3, useTime: 0.9,
    baseDamage: { physical: [7, 11], chaos: [5, 9] },
    delivery: {
      type: 'storm', count: [1, 2], interval: 0.35, areaRadius: 55, hitRadius: 26,
      castRange: 520, telegraph: 0.9, lob: { arc: 0.45 },
    },
    effects: [
      { type: 'damage' },
      // THE ORPHAN FATE (her ruling — it depends on the mother): the spawn
      // are her ichor given legs; her death sends them into a mourn-rage.
      { type: 'birth', monsterId: 'vile_spawn', count: [1, 2], cap: 8, orphan: 'frenzy' },
    ],
    ai: { range: 470, weight: 3, keepDistance: 180 },
  },

  gravecast: {
    id: 'gravecast', name: 'Gravecast',
    description: 'Lob a clod of grave-earth that bursts for physical damage and raises 1 undead'
      + ' minion at the impact point, up to 6 active at once.',
    tags: ['spell', 'aoe', 'storm'], color: '#c8c0a8',
    noDrop: true, // the sexton's shovel-arm, never a gem
    manaCost: 0, cooldown: 6, useTime: 1.0,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'storm', count: [1, 1], interval: 0, areaRadius: 40, hitRadius: 30,
      castRange: 500, telegraph: 1.0, lob: { arc: 0.5 },
    },
    effects: [
      { type: 'damage' },
      // The pool breathes at HER level (presence envelopes): shamble while
      // the graves are young, worthier dead as the country deepens.
      {
        type: 'birth', cap: 6, count: [1, 1],
        pool: [
          { id: 'zombie', weight: 3, presence: { to: 14, fadeOut: 8 } },
          { id: 'skeleton_warrior', weight: 2 },
          { id: 'skeleton_archer', weight: 1, presence: { from: 8, fadeIn: 4 } },
        ],
      },
    ],
    ai: { range: 460, weight: 3, keepDistance: 200 },
  },

  whelp_toss: {
    id: 'whelp_toss', name: 'Whelp Toss',
    description: 'Lob a nailed crate that splinters on impact for physical damage and releases'
      + ' 2–3 gnasher whelps, up to 6 active at once.',
    tags: ['attack', 'aoe', 'storm'], color: '#a8a862',
    noDrop: true, // the kennel-boy's throw, never a gem
    manaCost: 0, cooldown: 7, useTime: 0.8,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'storm', count: [1, 1], interval: 0, areaRadius: 30, hitRadius: 24,
      castRange: 460, telegraph: 0.7, lob: { arc: 0.55 },
    },
    effects: [
      { type: 'damage' },
      // The litter routs when the kennel-boy falls (orphan 'rout' — the
      // panic machinery's flight): pups scatter, they do not avenge.
      { type: 'birth', monsterId: 'gnasher_whelp', count: [2, 3], cap: 6, orphan: 'rout' },
    ],
    ai: { range: 430, weight: 3, keepDistance: 190 },
  },

  levinshot_volley: {
    id: 'levinshot_volley', name: 'Levinshot Volley',
    description: 'Lob 2–3 lightning shells across the field that telegraph their landing before'
      + ' bursting for lightning damage with a 35% chance to shock. Hits both allies and'
      + ' enemies.',
    tags: ['spell', 'lightning', 'aoe', 'storm'], color: '#9ae8ff',
    noDrop: true, // a storm-caller's rite, not a hand — never a gem (hellshot's law)
    manaCost: 0, cooldown: 2.5, useTime: 1.1,
    baseDamage: { lightning: [14, 24] },
    delivery: {
      type: 'storm', count: [2, 3], interval: 0.28, areaRadius: 85, hitRadius: 30,
      castRange: 4200, occlusion: 'free', // the sky does not ask the walls
      telegraph: 1.1, sky: true, lob: { arc: 0.42 },
      // NO fx key, deliberately: sky strikes derive the true lightning bolt
      // ('bolt' stays reserved to real levin — the effect-voice law), so the
      // landing IS the storm's own strike; only the pock below is new.
      impactDress: { kind: 'levin_scar', evapAfter: [50, 100] },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.35 },
    ],
    ai: { range: 560, weight: 3, keepDistance: 0 },
  },

  doom_chant: {
    id: 'doom_chant', name: 'Doom Chant',
    description: 'Curse the target area, afflicting enemies inside with doom, a 6-second mark'
      + ' that detonates early once its stored damage exceeds their remaining life, plus a 60%'
      + ' chance to inflict torment.',
    tags: ['spell', 'curse', 'aoe', 'chaos', 'duration'], color: '#7a48c8',
    manaCost: 12, cooldown: 6, useTime: 0.7,
    baseDamage: { chaos: [10, 16] },
    delivery: { type: 'ground', radius: 100, castRange: 440 },
    effects: [
      { type: 'status', status: 'doom', chance: 1 },
      { type: 'status', status: 'torment', chance: 0.6 },
    ],
    requirements: { willpower: 18, intelligence: 14 },
    ai: { range: 400, weight: 3, keepDistance: 300 },
  },

  gore_rend: {
    id: 'gore_rend', name: 'Gore Rend',
    description: 'Slash in melee for physical damage with a 60% chance to inflict hemorrhage, a'
      + ' long bleed that bursts for a share of its remaining damage when reapplied.',
    tags: ['attack', 'melee', 'physical'], color: '#c03a4a',
    manaCost: 3, cooldown: 2, useTime: 0.8,
    baseDamage: { physical: [12, 19] },
    delivery: { type: 'melee', range: 60, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'hemorrhage', chance: 0.6, magnitude: 0.5 },
    ],
    requirements: { strength: 18 },
    ai: { range: 60, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  call_the_rift: {
    id: 'call_the_rift', name: 'Call the Rift',
    description: 'Open a rift that summons a lesser demon—an ash-whelp (65%) or an imp'
      + ' (35%)—up to 5 active at once.',
    tags: ['spell', 'summon', 'minion', 'fire'], color: '#ff4a5a',
    manaCost: 18, cooldown: 1.4, useTime: 0.85,
    delivery: {
      type: 'summon',
      pool: [{ id: 'ash_whelp', weight: 65 }, { id: 'imp', weight: 35 }],
      count: 1, maxActive: 5,
    },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 420, weight: 2, keepDistance: 320 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // ======================= Cold ============================================

  frostbolt: {
    id: 'frostbolt', name: 'Frostbolt',
    description: 'Fire a shard of ice that deals cold damage with a 70% chance to chill.',
    tags: ['spell', 'projectile', 'cold'], color: '#7ad4ff',
    manaCost: 5, cooldown: 0, useTime: 0.7,
    baseDamage: { cold: [8, 12] },
    delivery: { type: 'projectile', speed: 340, radius: 8, range: 500 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.7 },
    ],
    requirements: { intelligence: 10 },
    ai: { range: 460, weight: 2, keepDistance: 260 },
  },

  frost_nova: {
    tree: STARTER_SKILL_TREES.frost_nova,
    id: 'frost_nova', name: 'Frost Nova', icon: 'frost',
    description: 'Release a burst of frost around you, dealing cold damage and chilling all'
      + ' enemies hit.',
    tags: ['spell', 'cold', 'aoe'], color: '#a8e4ff',
    manaCost: 10, cooldown: 3, useTime: 0.7,
    baseDamage: { cold: [7, 12] },
    delivery: { type: 'nova', radius: 115 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 1 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 90, weight: 3 },
  },

  // ======================= Lightning =======================================

  spark: {
    id: 'spark', name: 'Spark',
    description: 'Release a fan of 2–4 erratic sparks, each dealing lightning damage with a'
      + ' 25% chance to shock. At level 12, each spark chains once.',
    tags: ['spell', 'projectile', 'lightning'], color: '#ffe14a',
    manaCost: 6, cooldown: 0, useTime: 0.65,
    baseDamage: { lightning: [3, 11] },
    // Ranged count + innate ERRATIC axis: small, fast, unpredictable — and
    // dampable (Trueflight straightens sparks into true bolts).
    delivery: {
      type: 'projectile', speed: 320, radius: 7, range: 400, count: [2, 4], spreadDeg: 32,
      trajectory: { erratic: 6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.25 },
    ],
    // Over-cap THRESHOLD: sparks learn to arc (reachable via +level gems).
    thresholds: [
      { level: 12, label: 'Arcing storm', mods: [mod('chainCount', 'flat', 1)] },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 360, weight: 2, keepDistance: 220 },
  },

  // SPARK BOLT — the COMPONENT dart (Static Shrapnel's shrapnel, and
  // anything else that wants one honest spark as a payload): a single
  // erratic dart with wide dice, so even shrapnel can jackpot. Never
  // drops — it exists to be composed.
  spark_bolt: {
    id: 'spark_bolt', name: 'Spark Bolt',
    description: 'Fire a single erratic spark that deals lightning damage with a 15% chance to'
      + ' shock.',
    tags: ['spell', 'projectile', 'lightning'], color: '#ffe97a',
    manaCost: 3, cooldown: 0, useTime: 0.4,
    baseDamage: { lightning: [1, 14] },
    delivery: { type: 'projectile', speed: 380, radius: 6, range: 260, trajectory: { erratic: 5 } },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.15 },
    ],
    noDrop: true,
    ai: { range: 240, weight: 2, keepDistance: 160 },
  },

  // STORMCALL'S ANSWER (THE LEGEND FABRIC — data/uniques.ts Stormcall): the
  // one bolt the amulet calls down where lightning has just bitten. A
  // component payload (noDrop) played through the proc lane AT the struck
  // body; it wears the caster's whole lightning investment like any cast,
  // and its own shock rides the sheet's apply_ family on top.
  stormcall_strike: {
    id: 'stormcall_strike', name: 'Stormcall',
    description: 'Call down a single bolt of lightning at the target, dealing lightning damage'
      + ' with a 30% chance to shock.',
    tags: ['spell', 'lightning', 'aoe', 'storm'], color: '#c8e8ff',
    manaCost: 0, cooldown: 0, useTime: 0.3,
    baseDamage: { lightning: [14, 30] },
    delivery: {
      type: 'storm', count: [1, 1], interval: 0, areaRadius: 8, hitRadius: 58,
      castRange: 900, occlusion: 'free',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    noDrop: true,
    ai: { range: 400, weight: 1 },
  },

  // FULMINATE — the high-roller's signature bolt: dice a chasm wide, and
  // BOTH jackpot procs innate at chance 1 — the top 15% of rolls DETONATE
  // (Short Circuit), the top 12% ARC (Overload Arc), the very peak does
  // both at once. damageSpread, luckyChance and highRollWindow investment
  // turn the slot machine into a rigged one.
  fulminate: {
    id: 'fulminate', name: 'Fulminate',
    description: "Fire an unstable lightning bolt with a wide damage range and a 25% chance to shock. High damage rolls trigger an echoing burst or arc to nearby enemies.",
    tags: ['spell', 'lightning', 'projectile'], color: '#9ae8ff',
    manaCost: 9, cooldown: 0, useTime: 0.6,
    baseDamage: { lightning: [1, 58] },
    innateMods: [
      mod('proc_short_circuit', 'flat', 1, ['lightning']),
      mod('proc_overload_arc', 'flat', 1, ['lightning']),
    ],
    delivery: { type: 'projectile', speed: 500, radius: 8, range: 450 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.25 },
    ],
    // Over-cap THRESHOLD: the windows themselves widen — jackpots arrive.
    thresholds: [
      { level: 11, label: 'Loaded dice', mods: [mod('highRollWindow', 'flat', 0.05)] },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.11, ['lightning'])] },
    requirements: { intelligence: 20 },
    ai: { range: 420, weight: 3, keepDistance: 260 },
  },

  storm_call: {
    tree: DEVOTED_STARTER_TREES.storm_call,
    id: 'storm_call', name: 'Storm Call',
    description: 'Call down a bolt of lightning on the target point after a short delay, dealing'
      + ' lightning damage with a 60% chance to shock.',
    tags: ['spell', 'lightning', 'aoe'], color: '#c8e84a',
    manaCost: 12, cooldown: 4, useTime: 0.8,
    baseDamage: { lightning: [18, 30] },
    delivery: { type: 'ground', radius: 75, castRange: 460, delay: 0.6 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.6 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 430, weight: 3, keepDistance: 280 },
  },

  starfall_shard: {
    id: 'starfall_shard', name: 'Starfall Shard',
    description: 'Drop a crystal shard onto the target point after a brief delay, dealing'
      + ' physical and cold damage with a 45% chance to chill.',
    tags: ['spell', 'cold', 'physical', 'aoe'], color: '#9ad4e8',
    manaCost: 14, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [10, 16], cold: [8, 14] },
    delivery: { type: 'ground', radius: 70, castRange: 460, delay: 0.7 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.45 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 430, weight: 3, keepDistance: 280 },
  },

  // ======================= Fire (environmental) ============================

  // PYRE NOVA — the CONTAGION showcase: a fire burst whose victims may
  // ERUPT IN KIND after a beat, each hop at half the odds of the last,
  // three generations at most (ContagionSpec — the lineage's seen-set
  // keeps the wave traveling outward). Castable alone; Pyroclast Bolt
  // carries it as a sequel — the two-skills-in-sequence composition.
  pyre_nova: {
    id: 'pyre_nova', name: 'Pyre Nova',
    description: 'Release a nova of fire damage around you with a 30% chance to burn. Each enemy'
      + ' hit has a 35% chance to erupt with a secondary nova after a brief delay, chaining up'
      + ' to 3 times at half probability per hop.',
    tags: ['spell', 'fire', 'aoe'], color: '#ff7a3a',
    manaCost: 11, cooldown: 3, useTime: 0.7,
    baseDamage: { fire: [9, 15] },
    contagion: { chance: 0.35, decay: 0.5, maxGenerations: 3, damageScale: 0.75 },
    delivery: { type: 'nova', radius: 110 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.11, ['fire'])] },
    requirements: { intelligence: 18 },
    ai: { range: 130, weight: 3 },
  },

  // PYROCLAST BOLT — the SEQUEL showcase: a heavy ember whose flight's
  // END is itself a cast — Pyre Nova blooms at the death point, impact or
  // spent range alike (SequelSpec.on picks which; supports socketed into
  // EITHER def keep reading their own skill). Two skills in one, in
  // sequence, each still fully itself.
  pyroclast_bolt: {
    id: 'pyroclast_bolt', name: 'Pyroclast Bolt',
    description: 'Launch a heavy ember that deals fire damage with a 25% chance to burn, then'
      + ' triggers a Pyre Nova at 90% damage wherever its flight ends.',
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff8a4a',
    manaCost: 13, cooldown: 0, useTime: 0.75,
    baseDamage: { fire: [11, 19] },
    delivery: {
      type: 'projectile', speed: 300, radius: 9, range: 420,
      sequel: { skillId: 'pyre_nova', on: 'any', damageScale: 0.9 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.11, ['fire'])] },
    requirements: { intelligence: 22 },
    ai: { range: 400, weight: 3, keepDistance: 240 },
  },

  // The Demon Storm's falling rock — an environmental hazard the Demon-Invasion
  // overlay rains on in-radius zones (cast by a synthetic caster, like the storm
  // bolt). Not a player gem; it lives here so the world can field it by id.
  meteor: {
    id: 'meteor', name: 'Meteor', noDrop: true,
    description: 'Call down a blazing meteor at the target area after a 0.9-second delay,'
      + ' ignoring cover and dealing fire damage with a 50% chance to burn.',
    tags: ['spell', 'fire', 'aoe'], color: '#ff6024',
    manaCost: 0, cooldown: 0, useTime: 0.6,
    baseDamage: { fire: [20, 38] },
    // CELESTIAL (occlusion 'free'): it falls from the SKY — walls neither
    // stop the placement nor shield the crater. The artillery niche: its
    // casters bombard from behind cover while ray casters must reposition.
    delivery: { type: 'ground', radius: 96, castRange: 600, delay: 0.9, occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 520, weight: 1, keepDistance: 300 },
  },

  // ======================= Chaos / poison ==================================

  venom_bolt: {
    id: 'venom_bolt', name: 'Venom Bolt',
    description: 'Fire a bolt of toxin that deals chaos damage with an 80% chance to poison.',
    tags: ['spell', 'projectile', 'chaos'], color: '#7ec850',
    manaCost: 5, cooldown: 0, useTime: 0.7,
    baseDamage: { chaos: [6, 10] },
    delivery: { type: 'projectile', speed: 330, radius: 8, range: 460 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.8, magnitude: 0.4 },
    ],
    requirements: { willpower: 12 },
    ai: { range: 420, weight: 2, keepDistance: 240 },
  },

  // ======================= THE WILDCRAFT ====================================
  // The jungle's own arts — cutting, darting, snaring, spore-craft, the
  // pounce. Shared player/monster (one catalog, one pipeline): the same
  // machete that clears your lane clears the JUNGLEKIN's, and every one of
  // these is a kit-part any future body can wear. Found as gems via the
  // 'wildcraft' Vault bundles (unlocked by walking INTO a sunken ruin —
  // the ruin_entered ledger).

  machete_arc: {
    id: 'machete_arc', name: 'Machete Arc',
    description: 'Sweep a wide frontal cone for physical damage with a 35% chance to inflict'
      + ' bleed.',
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#9ac86a',
    manaCost: 4, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [9, 15] },
    delivery: { type: 'cone', range: 92, arcDeg: 110 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 0.35 },
    ],
    requirements: { strength: 12, dexterity: 10 },
    minDropLevel: 3,
    ai: { range: 85, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('aoeRadius', 'increased', 0.04)] },
  },

  blowdart: {
    id: 'blowdart', name: 'Blowdart',
    description: 'Fire a fast dart that deals light physical damage with an 85% chance to'
      + ' apply a strong poison.',
    tags: ['attack', 'projectile', 'physical'], color: '#7ec850',
    manaCost: 3, cooldown: 0, useTime: 0.42,
    baseDamage: { physical: [3, 6] },
    delivery: { type: 'projectile', speed: 560, radius: 5, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.85, magnitude: 0.5 },
    ],
    requirements: { dexterity: 14 },
    minDropLevel: 4,
    ai: { range: 440, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('apply_poison', 'flat', 0.02), mod('projectileSpeed', 'increased', 0.05)] },
  },

  vine_lash: {
    id: 'vine_lash', name: 'Vine Lash',
    description: 'Lash out with a living vine in a line, dealing chaos damage, pulling the'
      + ' target to your feet with a brief stun, and rooting them on arrival.',
    tags: ['spell', 'projectile', 'chaos'], color: '#4f9a3c',
    manaCost: 9, cooldown: 4, useTime: 0.5,
    baseDamage: { chaos: [8, 13] },
    delivery: { type: 'projectile', speed: 620, radius: 7, range: 400, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.25 },
      { type: 'status', status: 'rooted', chance: 1 },
    ],
    requirements: { willpower: 12, dexterity: 10 },
    minDropLevel: 6,
    ai: { range: 380, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.06)] },
  },

  spore_bloom: {
    id: 'spore_bloom', name: 'Spore Bloom',
    description: 'Seed a spore cloud over the target area for 4 seconds. Enemies remaining'
      + ' inside take chaos damage over time with a 50% chance to poison.',
    tags: ['spell', 'aoe', 'chaos', 'duration'], color: '#a8d05a',
    manaCost: 11, cooldown: 2.5, useTime: 0.6,
    baseDamage: { chaos: [4, 7] },
    delivery: {
      type: 'ground', radius: 88, castRange: 420,
      lingerDuration: 4, tickInterval: 0.5, noImpact: true, exposure: 0.4,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.5, magnitude: 0.35 },
    ],
    requirements: { willpower: 16 },
    minDropLevel: 7,
    ai: { range: 400, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06), mod('effectDuration', 'increased', 0.07)] },
  },

  panther_pounce: {
    id: 'panther_pounce', name: 'Panther Pounce',
    description: 'Leap to the target location, becoming untouchable in flight, and deal'
      + ' physical damage around the impact with a 50% chance to inflict bleed.',
    tags: ['attack', 'melee', 'physical', 'movement'], color: '#5aa848',
    manaCost: 8, cooldown: 4.5, useTime: 0,
    baseDamage: { physical: [11, 18] },
    delivery: { type: 'leap', range: 300, airTime: 0.42, radius: 80 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.5, magnitude: 0.4 },
    ],
    requirements: { dexterity: 16 },
    minDropLevel: 7,
    ai: { range: 280, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('aoeRadius', 'increased', 0.04)] },
  },

  // Monster kit-parts of the family (noDrop — the JUNGLEKIN's own verbs,
  // ready for any future body or entity-creator roster).
  constrictor_coil: {
    id: 'constrictor_coil', name: 'Constrictor Coil',
    description: 'Strike in a line for physical damage, pulling the target in with a brief'
      + ' stun, rooting them, and having a 50% chance to poison.',
    tags: ['attack', 'melee', 'physical', 'duration'], color: '#3f7a34',
    manaCost: 0, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'projectile', speed: 700, radius: 7, range: 240, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.4 },
      { type: 'status', status: 'rooted', chance: 1 },
      { type: 'status', status: 'poison', chance: 0.5, magnitude: 0.3 },
    ],
    noDrop: true,
    ai: { range: 230, weight: 3 },
  },

  dart_volley: {
    id: 'dart_volley', name: 'Dart Volley',
    description: 'Fire a fan of 5 darts that deal physical damage, each with a 60% chance to'
      + ' poison.',
    tags: ['attack', 'projectile', 'physical'], color: '#8ec860',
    manaCost: 0, cooldown: 5, useTime: 0.7,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 460, count: 5, spreadDeg: 26 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.6, magnitude: 0.35 },
    ],
    noDrop: true,
    ai: { range: 430, weight: 2, keepDistance: 250 },
  },

  // POISON NOVA — the D2 Necromancer heirloom: ONE cast, a wall of venom in
  // every direction. Feeble direct hits; the POISON is the payload — long,
  // stacking, and cruel. The rays are evenly spaced but the whole ring
  // rotates randomly each cast (ProjectileDelivery.ring): a distant loiterer
  // slips between rays one breath and eats one the next, while at melee
  // reach nothing escapes. The Necromancer's signature.
  poison_nova: {
    tree: NECROMANCER_RITES.poison_nova,
    id: 'poison_nova', name: 'Poison Nova',
    description: 'Release a ring of 24 slow venom bolts outward in all directions, dealing chaos'
      + ' damage and inflicting a strong poison lasting 11 seconds.',
    tags: ['spell', 'projectile', 'chaos', 'aoe'], color: '#66c83c',
    manaCost: 26, cooldown: 3.5, useTime: 0.8,
    baseDamage: { chaos: [2, 4] },
    delivery: {
      type: 'projectile', speed: 240, radius: 9, range: 380,
      count: 24, ring: {},
    },
    effects: [
      { type: 'damage' },
      // The nova's poison runs nearly twice the ailment's book length — the
      // "very long, nasty" D2 tail (durationOverride is the fixed-clock lever).
      { type: 'status', status: 'poison', chance: 1, magnitude: 0.9, durationOverride: 11 },
    ],
    requirements: { willpower: 14, intelligence: 10 }, // the Necromancer's level-1 signature
    ai: { range: 200, weight: 3 },
  },

  // SPARKFIELD (the channel-and-release): held, it PLANTS sparks under the
  // enemies in reach — semi-randomly (the scatter variance) — and every
  // spark waits, ARMED. Let go and the whole field discharges in the order
  // you laid it, one crack after another (Chaotic Discharge shuffles it).
  sparklattice: {
    id: 'sparklattice', name: 'Sparklattice',
    description: 'Channel to plant armed sparks beneath nearby enemies while moving at 50%'
      + ' reduced speed. Releasing the channel detonates all planted sparks in the order they'
      + ' were laid, dealing lightning damage with a 20% chance to shock.',
    tags: ['spell', 'lightning', 'aoe', 'channel', 'duration'], color: '#ffe94a',
    manaCost: 5, cooldown: 0, useTime: 0,
    baseDamage: { lightning: [9, 16] },
    channel: { interval: 0.55, move: 'slowed', moveFactor: 0.5 },
    delivery: {
      type: 'storm', count: [1, 2], interval: 0.2,
      areaRadius: 240, hitRadius: 62, castRange: 360,
      atEnemies: true, scatter: 55,
      awaitRelease: { order: 'placed', interval: 0.09 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 320, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11, ['lightning'])] },
  },

  // RENEW (the priest's whisper): a single-target mend-over-time — the
  // buff IS lifeRegen for a while (heal-as-stat, nothing bespoke).
  renew: {
    id: 'renew', name: 'Renew',
    description: 'Grant a target ally (or yourself) +6 life regeneration per second for 8'
      + ' seconds.',
    tags: ['spell', 'heal', 'buff', 'targeted', 'duration', 'instant'], color: '#8ae0a8',
    manaCost: 10, cooldown: 2, useTime: 0,
    targeting: { target: 'ally', castRange: 460, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{
      type: 'buff', id: 'renew', duration: 8,
      mods: [mod('lifeRegen', 'flat', 6)],
    }],
    requirements: { willpower: 12 },
    ai: { range: 420, weight: 3 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  // ======================= The Guard hall ===================================
  // SHIELD CHARGE: the wall moves — a shield-first dash that bowls through.
  shield_charge: {
    tree: BASTION_STARTER_TREES.shield_charge,
    id: 'shield_charge', name: 'Shield Charge',
    description: 'Charge forward with your shield raised, dealing physical damage, knocking'
      + ' enemies back, and having a 35% chance to stun.',
    tags: ['attack', 'melee', 'movement', 'physical', 'guard'], color: '#c8d8e8',
    manaCost: 8, cooldown: 5, useTime: 0,
    baseDamage: { physical: [12, 20] },
    delivery: { type: 'dash', distance: 260, speed: 900, width: 46 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 160 },
      { type: 'status', status: 'stun', chance: 0.35 },
    ],
    requirements: { strength: 12, fortitude: 8 },
    // Shove-dash: point-blank picks collapse to the near discount.
    ai: { range: 240, weight: 2, minRange: 120 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1, ['melee'])] },
  },

  // AEGIS OF DAWN: the guard that SHELTERS — while held, allies in its
  // shadow mend (the guardMend stat, worn innately here and grantable
  // anywhere).
  aegis_of_dawn: {
    id: 'aegis_of_dawn', name: 'Aegis of Dawn',
    description: 'Hold a frontal guard stance that blocks incoming attacks across a wide arc'
      + ' while moving at 35% speed and steadily healing nearby allies.',
    tags: ['guard', 'heal', 'duration'], color: '#f8e8c8',
    manaCost: 6, cooldown: 3, useTime: 0,
    // 2026-07-22: the guard spec demands the stance ("while you HOLD it")
    // — the missing castMode meant the shield never actually raised (the
    // strikes-floor sweep's find). Held now, it joins the release-bash
    // family natively.
    castMode: 'guard',
    delivery: { type: 'self' },
    guard: { shieldLife: 70, arcDeg: 150, moveFactor: 0.35 },
    innateMods: [mod('guardMend', 'flat', 9)],
    effects: [],
    requirements: { willpower: 14, fortitude: 8 },
    ai: { range: 160, weight: 1 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.12), mod('healPower', 'increased', 0.06)] },
  },

  // HALO (the expansion-only ring): a circle of dawnlight races outward,
  // striking each enemy ONCE as it crosses them and washing allies as it
  // goes — then FIZZLES at the apex (retract.fizzle: no contraction, the
  // endBurst is the ring's last word at full spread).
  halo_of_light: {
    id: 'halo_of_light', name: 'Halo',
    description: "Release an expanding ring of light that strikes each enemy in its path once and heals allies it passes through, excluding yourself.",
    tags: ['spell', 'fire', 'aoe', 'heal', 'duration'], color: '#ffeecc',
    manaCost: 13, cooldown: 7, useTime: 0.4,
    baseDamage: { fire: [12, 19] },
    delivery: {
      type: 'ground', radius: 34, castRange: 0, delay: 0, noImpact: true,
      lingerDuration: 1.2, tickInterval: 0.1,
      follow: true, grow: 300,
      retract: { at: 1.15, fizzle: true },
      endBurst: { damageScale: 0.6, radiusScale: 1 },
      hitOnce: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'heal', amount: 2, excludeCaster: true },
    ],
    requirements: { willpower: 16, intelligence: 8 },
    ai: { range: 200, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1, ['fire'])] },
  },

  // The cherub: a fluttering mender on a hire clock (the healer-minion AI
  // already tends the wounded — mender_sprite's craft, given wings).
  summon_cherub: {
    id: 'summon_cherub', name: 'Summon Cherub',
    description: "Summon a winged cherub for 30 seconds that flies to wounded allies and heals them. Only 1 cherub can be active at a time.",
    tags: ['spell', 'summon', 'minion', 'heal', 'duration'], color: '#f8e8c8',
    manaCost: 24, cooldown: 8, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'cherub', count: 1, maxActive: 1, duration: 30 },
    effects: [],
    requirements: { willpower: 16, charisma: 6 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.15), mod('effectDuration', 'increased', 0.08)] },
  },

  // ======================= THE LITURGY =====================================
  // The Cathedral of the Highest's own art (the See teaches it: the pool row
  // reads the 'cathedral_door_opened' gateway ledger) — CALL AND RESPONSE as
  // a cast grammar. Versicle is the call, Antiphon the response; two
  // DIFFERENT song-casts back-to-back close the measure and the RESPONSORY
  // answers (data/combos.ts — a radiant burst that harms the court and
  // mends the congregation in one circle). Antiphon's equipMods GRANT the
  // grammar (a skill teaching its own liturgy — the combo fabric's
  // any-ordinary-source law), so the family self-contains: no tree node
  // required, and every future song-tagged cast (trumpets, chants, the
  // lyrist's arts if they ever go player-side) extends the liturgy free.

  // THE CALL: quick, cheap, bright — the verse that opens the measure.
  versicle: {
    id: 'versicle', name: 'Versicle',
    description: "Fires a bolt of lightning and fire at range. Following Versicle with Antiphon triggers Responsory.",
    // 2026-07-22 tag hygiene: the verse IS a flight (projectile delivery) —
    // the tag the mechanics prove, so the projectile support family (arcing,
    // chaining, forking, …) boards the dart as it always mechanically fit.
    tags: ['spell', 'song', 'lightning', 'projectile', 'instant'], color: '#ffefc2',
    manaCost: 7, cooldown: 0, useTime: 0.3,
    baseDamage: { lightning: [5, 9], fire: [3, 6] },
    delivery: { type: 'projectile', speed: 520, radius: 10, range: 480 },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 12 },
    minDropLevel: 11,
    ai: { range: 440, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  // THE RESPONSE: the answering wave — and the measure's TEACHER (its
  // equipMods grant the liturgy grammar while it is socketed anywhere).
  antiphon: {
    id: 'antiphon', name: 'Antiphon',
    description: "Releases a burst of fire and lightning around you. While equipped, alternating between two different song skills triggers Responsory, releasing a radiant burst that damages nearby enemies and heals nearby allies.",
    tags: ['spell', 'song', 'fire', 'aoe'], color: '#ffd97a',
    manaCost: 13, cooldown: 0, useTime: 0.55,
    baseDamage: { fire: [7, 12], lightning: [4, 8] },
    delivery: { type: 'nova', radius: 150 },
    effects: [{ type: 'damage' }],
    equipMods: [mod('combo_liturgy', 'flat', 1)],
    requirements: { willpower: 14 },
    minDropLevel: 11,
    ai: { range: 140, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('aoeScale', 'increased', 0.03)] },
  },

  // THE CHORISTER: a player-allied angel beyond the cherub — the lampad's
  // office lent to the congregation. She wards and rakes; her keeper sings.
  invoke_lampad: {
    id: 'invoke_lampad', name: 'Invoke Lampad',
    description: "Summons a Lampad chorister for 40 seconds whose votive flame shields and heals allies fighting within its aura.",
    tags: ['spell', 'summon', 'minion', 'song', 'duration'], color: '#ffd9a0',
    manaCost: 32, cooldown: 12, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'lampad_chorister', count: 1, maxActive: 1, duration: 40 },
    effects: [],
    requirements: { willpower: 20, charisma: 8 },
    minDropLevel: 12,
    ai: { range: 400, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.14), mod('effectDuration', 'increased', 0.06)] },
  },

  // THE SHAMAN'S ANSWER (and the grave_shaman's whole kit): raise the
  // fallen FROM THEIR CORPSE — the risen is whatever died there. Obliterate
  // the bodies or kill the caller, or the war never ends.
  shamans_call: {
    id: 'shamans_call', name: "Shaman's Call",
    description: "Target a corpse to raise it as a zombie that fights for you, up to 5 active at once.",
    tags: ['spell', 'summon', 'minion', 'corpse'], color: '#9a86e8',
    manaCost: 20, cooldown: 3, useTime: 0.9,
    targeting: { target: 'corpse', castRange: 400, plural: true },
    delivery: { type: 'summon', monsterId: 'zombie', fromCorpse: true, count: 1, maxActive: 5 },
    effects: [],
    requirements: { wisdom: 16 },
    ai: { range: 380, weight: 4, keepDistance: 260 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12)] },
  },

  // PULSE-HEX payload (the pulsing-ground gems cast this on their beat).
  hex_pulse: {
    id: 'hex_pulse', name: 'Hex Pulse',
    description: "Release an instant nova of chaos damage around you.",
    tags: ['spell', 'chaos', 'aoe', 'instant'], color: '#b06bd4',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [4, 7] },
    delivery: { type: 'nova', radius: 90 },
    effects: [{ type: 'damage' }],
  },

  // ======================= Paladin =========================================
  // The oath-sworn kit: judgement and mercy, crowd-fed zeal, and blessings
  // that arm OTHER hands — every piece an exhibit of the trigger fabric.

  // The SILENCE hard-cast: one target, one word, no spells. (apply_silence
  // exists for the proc route; this is the deliberate, long-clock version.)
  judgement: {
    id: 'judgement', name: 'Judgement',
    description: "Strikes a single enemy for fire damage and silences them for 3 seconds, preventing them from casting spells.",
    tags: ['spell', 'fire', 'targeted'], color: '#ffe8b0',
    manaCost: 14, cooldown: 16, useTime: 0.6,
    baseDamage: { fire: [18, 30] },
    targeting: { target: 'enemy', castRange: 440 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'silence', chance: 1 },
    ],
    requirements: { willpower: 14, strength: 8 },
    ai: { range: 420, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12, ['fire'])] },
  },

  // The mercy hard-cast: one ally made whole, once a fight.
  lay_on_hands: {
    id: 'lay_on_hands', name: 'Lay on Hands',
    description: "Instantly heal a targeted ally (or yourself if no ally is in range) for a flat amount plus 40% of their maximum life.",
    tags: ['spell', 'heal', 'targeted', 'instant'], color: '#ffe8b0',
    manaCost: 30, cooldown: 45, useTime: 0,
    targeting: { target: 'ally', castRange: 380, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 60, pctMax: 0.4 }],
    requirements: { willpower: 20 },
    ai: { range: 360, weight: 4 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.12)] },
  },

  // The ALLY-ARMED next-hit rider: bless a minion (the Amalgam!) or a
  // friend — their next three blows land extra consecrated weight.
  blessing_of_might: {
    id: 'blessing_of_might', name: 'Blessing of Might',
    description: "Bless a targeted ally, minion, or yourself for 12 seconds, causing their next 3 hits to deal added physical damage.",
    tags: ['spell', 'buff', 'targeted', 'duration'], color: '#e8d44a',
    manaCost: 12, cooldown: 8, useTime: 0.4,
    targeting: { target: 'ally', castRange: 420, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{
      type: 'buff', id: 'blessing_of_might', duration: 12,
      maxStacks: 3, stacksOnApply: 3,
      mods: [],
      nextHit: { addedDamage: { physical: 26 } },
    }],
    requirements: { willpower: 12, strength: 10 },
    ai: { range: 400, weight: 2 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  // CROWD EMPOWERMENT made visible: the swing grows with the weighted mob
  // (a boss counts for six men — DEFENSE_CFG.empower).
  zeal: {
    id: 'zeal', name: 'Zeal',
    description: "Strike in a consecrated melee arc of physical and fire damage that deals 5% more damage and grants a 6-second stack of 2% increased attack speed (up to 10 stacks) per point of nearby enemy crowd power.",
    tags: ['attack', 'melee', 'physical', 'fire'], color: '#ffd24a',
    manaCost: 7, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [8, 14], fire: [6, 10] },
    delivery: { type: 'melee', range: 92, arcDeg: 130 },
    empower: {
      radius: 240, dmgPerPower: 0.05,
      buffPerPower: {
        type: 'buff', id: 'zealous', duration: 6, maxStacks: 10,
        mods: [mod('attackSpeed', 'increased', 0.02)],
      },
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 14, willpower: 8 },
    ai: { range: 90, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1, ['melee'])] },
  },

  // The WoW-VE shape: while the embrace holds, your violence mends the
  // faithful around you (the vampiricShare stat, worn as a buff).
  vampiric_embrace: {
    id: 'vampiric_embrace', name: 'Vampiric Embrace',
    description: "For 10 seconds, 12% of the damage you deal heals nearby allies.",
    tags: ['spell', 'buff', 'duration'], color: '#c85878',
    manaCost: 16, cooldown: 14, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'vampiric_embrace', duration: 10,
      mods: [mod('vampiricShare', 'flat', 0.12)],
    }],
    requirements: { willpower: 16 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  // ======================= Angelic =========================================

  // A holy javelin that tithes its violence to the nearby faithful
  // (innate vampiricShare — the stat rides the skill's own queries).
  seraph_lance: {
    id: 'seraph_lance', name: 'Seraph Lance',
    description: "Hurl a lance of fire that pierces 1 enemy and heals nearby allies for 8% of the damage dealt.",
    tags: ['spell', 'projectile', 'fire', 'javelin'], color: '#ffeecc',
    manaCost: 9, cooldown: 0, useTime: 0.6,
    baseDamage: { fire: [10, 17] },
    delivery: { type: 'projectile', speed: 420, radius: 9, range: 520, pierce: 1 },
    innateMods: [mod('vampiricShare', 'flat', 0.08)],
    effects: [{ type: 'damage' }],
    requirements: { willpower: 12, finesse: 6 },
    ai: { range: 480, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12, ['fire'])] },
  },

  // THE CHLOROMANCER BOND: tie yourself to one ally — your damage heals
  // them (bondShare, granted while this sits on your bar). Pair with Ruin.
  guardian_bond: {
    id: 'guardian_bond', name: 'Guardian Bond',
    description: "Link yourself to an ally for 18 seconds, healing them for 20% of the damage you deal and granting them 10% increased healing received. Only 1 bond can be active at a time.",
    tags: ['spell', 'buff', 'targeted', 'duration'], color: '#7ee0b8',
    manaCost: 14, cooldown: 6, useTime: 0.4,
    targeting: { target: 'ally', castRange: 460 },
    delivery: { type: 'target' },
    equipMods: [mod('bondShare', 'flat', 0.2)],
    effects: [{
      type: 'buff', id: 'life_bond', duration: 18, bond: true,
      mods: [mod('healTaken', 'increased', 0.1)],
    }],
    requirements: { willpower: 14, charisma: 6 },
    ai: { range: 420, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.12)] },
  },

  // The bond-feeder: modest chaos bolt, TRIPLE bond feed — "Ruin heals the
  // bonded far more when it hits" (SkillDef.bondFeed).
  ruin: {
    tree: PACT_STEEL_STARTER_TREES.ruin,
    id: 'ruin', name: 'Ruin',
    description: "Fire a chaos projectile that transfers triple the normal healing share through your active Guardian Bond.",
    tags: ['spell', 'projectile', 'chaos'], color: '#9a78c8',
    manaCost: 8, cooldown: 0, useTime: 0.65,
    baseDamage: { chaos: [9, 15] },
    delivery: { type: 'projectile', speed: 360, radius: 8, range: 480 },
    bondFeed: 3,
    effects: [{ type: 'damage' }],
    requirements: { willpower: 12, intelligence: 8 },
    ai: { range: 440, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12, ['chaos'])] },
  },

  // A held hymn: pulses of mending over everyone in the circle — the
  // channel that Grace of Dawn (frenzy every 3s held) loves to ride.
  choir_of_light: {
    id: 'choir_of_light', name: 'Choir of Light',
    description: "Channel a hymn that heals nearby allies every 0.7 seconds for 1.5% of their maximum life plus flat life while you move at 40% of normal speed.",
    tags: ['spell', 'heal', 'channel', 'aoe', 'duration'], color: '#f8f0d0',
    manaCost: 4, cooldown: 0, useTime: 0,
    channel: { interval: 0.7, move: 'slowed', moveFactor: 0.4 },
    delivery: { type: 'nova', radius: 170, affects: 'allies' },
    effects: [{ type: 'heal', amount: 7, pctMax: 0.015 }],
    requirements: { willpower: 18 },
    ai: { range: 240, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.1)] },
  },

  // ======================= Samurai =========================================

  // THE CAST CYCLE exhibit: every third cut ARMS the next with a
  // guaranteed deep bleed (castCycle + a next-hit rider).
  zanshin_cut: {
    tree: PRECISION_STARTER_TREES.zanshin_cut,
    id: 'zanshin_cut', name: 'Zanshin Cut',
    description: "Slash with a disciplined melee strike. Every third strike causes your next melee hit within 8 seconds to inflict a guaranteed Bleed at 250% magnitude.",
    tags: ['attack', 'melee', 'physical'], color: '#d8d0c0',
    manaCost: 4, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'melee', range: 96, arcDeg: 100 },
    castCycle: {
      count: 3,
      buff: {
        type: 'buff', id: 'zanshin', duration: 8, maxStacks: 1,
        mods: [],
        nextHit: { tags: ['melee'], status: 'bleed', statusScale: 2.5 },
      },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 12, prowess: 8 },
    ai: { range: 92, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11, ['melee'])] },
  },

  // The DISARM hard-cast: one drawing cut, and the sword arm forgets.
  // REWORKED (the samurai pass): the draw is now a TIMED bar and the cut
  // is a PHASING dash — the anime iai in engine grammar. castMode 'timed'
  // + SkillDef.timing tunes the innate window; DashDelivery.phase grants
  // the phasing status for the flight (through the crowd, mass and poise
  // be damned); the corridor cuts and DISARMS everything it passes.
  iai_strike: {
    tree: PRECISION_STARTER_TREES.iai_strike,
    id: 'iai_strike', name: 'Iai Strike',
    description: "Hold and release at the peak of the timing indicator to deal 150% more damage. Dashes through enemies along a line, dealing physical damage and disarming targets hit.",
    tags: ['attack', 'melee', 'physical', 'movement'], color: '#e8e4d8',
    manaCost: 11, cooldown: 9, useTime: 0.85,
    castMode: 'timed',
    timing: { kind: 'timed', bonus: 1.5 },
    baseDamage: { physical: [26, 40] },
    delivery: { type: 'dash', distance: 250, speed: 1500, width: 64, phase: true },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'disarm', chance: 1 },
    ],
    requirements: { dexterity: 18, prowess: 10 },
    ai: { range: 220, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12, ['melee'])] },
  },

  // ======================= Plague line ======================================

  // NESTED COMPLEXITY: a brief plague-priest whose META-ACTION (shift-press)
  // endows your WHOLE flock with poisoned blades — a summon carrying a
  // command carrying a rider. Rising, nested, all data.
  summon_plaguefather: {
    id: 'summon_plaguefather', name: 'Summon Plaguefather',
    description: "Summon a plague-priest minion for 20 seconds. Activate its command ability to bless all of your minions, causing their next 3 hits to inflict a strong Poison.",
    tags: ['spell', 'summon', 'minion', 'chaos', 'duration'], color: '#7ec850',
    manaCost: 28, cooldown: 10, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'plaguefather', count: 1, maxActive: 1, duration: 20 },
    meta: { skillId: 'plague_benediction', label: 'Endow' },
    effects: [],
    requirements: { wisdom: 18 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('effectDuration', 'increased', 0.08)] },
  },

  // The endowment itself (the Plaguefather's meta payload — also castable
  // as its own skill, because every meta payload is an ordinary skill).
  plague_benediction: {
    id: 'plague_benediction', name: 'Plague Benediction',
    description: "Bless all of your minions for 12 seconds, causing their next 3 hits to inflict Poison at 250% magnitude.",
    tags: ['spell', 'buff', 'minion', 'chaos', 'duration'], color: '#5ea838',
    manaCost: 15, cooldown: 8, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'plague_blades', duration: 12,
      maxStacks: 3, stacksOnApply: 3, affects: 'minions',
      mods: [],
      nextHit: { status: 'poison', statusScale: 2.5 },
    }],
    requirements: { wisdom: 14 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('statusMagnitude', 'increased', 0.08)] },
  },

  // STORED VERDICT's release (the support's meta payload): free, but only
  // the banked uses of the HOST skill pay for it — three casts, one nova.
  verdict_release: {
    id: 'verdict_release', name: 'Verdict',
    description: "Spend 3 Verdict charges to release a free consecrated nova of fire damage around you.",
    tags: ['spell', 'fire', 'aoe', 'instant'], color: '#e8d44a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [22, 34] },
    gate: { charge: { id: 'verdict', amount: 3 } },
    chargeCost: { charge: 'verdict', amount: 'all' },
    delivery: { type: 'nova', radius: 150 },
    effects: [{ type: 'damage' }],
    ai: { range: 140, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12, ['fire'])] },
  },

  // The PHANTASM's own volley (see monsters.ts `phantasm` + the
  // summon_phantasm proc/support): a spectral dart the brief spirit lashes
  // out while it persists. Costed at zero and AI-hinted for its wielder.
  phantasm_bolt: {
    id: 'phantasm_bolt', name: 'Phantasmal Bolt',
    description: "Fire a spirit projectile that deals cold damage with a 15% chance to chill.",
    tags: ['spell', 'projectile', 'cold'], color: '#9ad8e8',
    manaCost: 0, cooldown: 0.4, useTime: 0.45,
    baseDamage: { cold: [5, 9] },
    delivery: { type: 'projectile', speed: 380, radius: 7, range: 440 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.15 },
    ],
    ai: { range: 400, weight: 2, keepDistance: 200 },
  },

  toxic_cloud: {
    id: 'toxic_cloud', name: 'Toxic Cloud',
    description: "Conjure a toxic cloud at the target location for 4 seconds that deals chaos damage over time with a 35% chance per tick to poison enemies that remain inside it.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#5ea838',
    manaCost: 13, cooldown: 6, useTime: 0.85,
    baseDamage: { chaos: [4, 6] },
    // The reference FUME (the exposure framework): no impact blast at all
    // (noImpact), and the ticks bite only occupants 0.3s deep into the
    // smoke — the data line between a lingering effect and an
    // instant-damage area. Blasts don't need breathing; fumes do.
    delivery: { type: 'ground', radius: 80, castRange: 420, lingerDuration: 4, tickInterval: 0.5, noImpact: true, exposure: 0.3 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.35, magnitude: 0.4 },
    ],
    requirements: { willpower: 18 },
    ai: { range: 390, weight: 3, keepDistance: 240 },
  },

  // THE SHARD SQUALL (noDrop): the payload a shattering petrified tree
  // exhales (DoodadRule.brittle.fume names it — the Karst Country's brittle
  // kit). Unlike the breathed fumes this one CUTS the moment it exists: no
  // exposure grace — flying stone doesn't wait for your lungs. Physical, so
  // armor answers it; standing in a falling tree is its own mistake.
  stone_shards: {
    id: 'stone_shards', name: 'Stone Shards', noDrop: true,
    description: "Create a lingering cloud of stone splinters for 2.2 seconds that deals periodic physical damage to enemies inside.",
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#9a948a',
    manaCost: 0, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'ground', radius: 54, castRange: 200, lingerDuration: 2.2, tickInterval: 0.4, noImpact: true },
    effects: [{ type: 'damage' }],
  },

  // ======================= Summoning =======================================

  summon_skeleton: {
    tree: NECROMANCER_TREES.summon_skeleton,
    id: 'summon_skeleton', name: 'Summon Skeleton Warrior',
    description: "Summon a skeletal warrior to fight at your side, up to 3 active at once. Activate the skill's command ability to order your skeletons to focus a target.",
    tags: ['spell', 'summon', 'minion'], color: '#cfc8b8',
    manaCost: 22, cooldown: 1.5, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'skeleton_warrior', count: 1, maxActive: 3 },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { wisdom: 14, willpower: 10 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },
  
  summon_skeleton_archer: {
    tree: NECROMANCER_TREES.summon_skeleton_archer,
    id: 'summon_skeleton_archer', name: 'Summon Skeleton Archer',
    description: "Summon a skeletal archer that fires arrows at enemies from range, up to 2 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#cfc8b8',
    manaCost: 25, cooldown: 2.5, useTime: 1,
    delivery: { type: 'summon', monsterId: 'skeleton_archer', count: 1, maxActive: 2 },
    effects: [],
    requirements: { wisdom: 14, willpower: 10 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  summon_flame_sprite: {
    id: 'summon_flame_sprite', name: 'Summon Flame Sprite',
    description: "Summon a living flame sprite that casts fireballs at nearby enemies, up to 2 active at once.",
    tags: ['spell', 'summon', 'minion', 'fire'], color: '#ffb05a',
    manaCost: 30, cooldown: 2, useTime: 1,
    delivery: { type: 'summon', monsterId: 'flame_sprite', count: 1, maxActive: 2 },
    effects: [],
    requirements: { willpower: 24, intelligence: 16 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // Storm delivery: explosions scattered around the cast point, landing in
  // sequence (artillery). The Cloudburst support collapses it to one volley.
  meteor_storm: {
    id: 'meteor_storm', name: 'Meteor Storm',
    description: "Call down 4 to 6 meteors in sequence across the target area, each dealing fire damage in a blast with a 14% chance to ignite and ignoring line of sight.",
    tags: ['spell', 'fire', 'aoe', 'storm', 'duration'], color: '#ff6a2a',
    manaCost: 17, cooldown: 7, useTime: 0.9,
    baseDamage: { fire: [13, 20] },
    // CELESTIAL (occlusion 'free'): meteors answer to the sky, not the wall.
    delivery: { type: 'storm', count: [4, 6], interval: 0.25, areaRadius: 150, hitRadius: 55, castRange: 480, occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 440, weight: 3, keepDistance: 300 },
  },

  // Weighted-pool summoning: each spawn rolls the pool independently.
  raise_dead: {
    tree: NECROMANCER_TREES.raise_dead,
    id: 'raise_dead', name: 'Raise Dead',
    description: "Raise a corpse as either a skeletal warrior or a zombie at equal odds, up to 5 active at once. Activate the skill's command ability to order them to focus a target.",
    tags: ['spell', 'summon', 'minion'], color: '#9aa888',
    manaCost: 20, cooldown: 1.2, useTime: 0.85,
    delivery: {
      type: 'summon',
      pool: [{ id: 'skeleton_warrior', weight: 50 }, { id: 'zombie', weight: 50 }],
      count: 1, maxActive: 5,
    },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // MYCELIA: the bloom-tender + Heartbloom re-seed the swarm — sprout fungal sporelings
  // from the spore-mat (the density made flesh). Mirrors raise_dead, a fungal pool.
  summon_sporeling: {
    id: 'summon_sporeling', name: 'Sprout Sporeling',
    description: "Summon a fungal sporeling to fight for you, up to 6 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#8fd06f',
    manaCost: 18, cooldown: 1.3, useTime: 0.8,
    delivery: {
      type: 'summon',
      pool: [{ id: 'fungal_sporeling', weight: 1 }],
      count: 1, maxActive: 6,
    },
    effects: [],
    requirements: { willpower: 12 },
    ai: { range: 380, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // Persistent minion: reserves mana while its contract lives, and respawns
  // 8 seconds after dying (Soul Tether shortens the timer).
  summon_stone_golem: {
    id: 'summon_stone_golem', name: 'Summon Stone Golem',
    description: "Toggle to reserve mana per golem slot and summon a Stone Golem. If destroyed, the golem automatically reassembles after 8 seconds while the skill remains active. Only one major golem contract can be active at a time.",
    tags: ['spell', 'summon', 'minion', 'persistent'], color: '#a8a090',
    manaCost: 15, cooldown: 4, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'stone_golem',
      count: 1, maxActive: 1, poolGroup: 'golem', exclusiveGroup: 'golem',
      persistent: { reserve: 35, respawnTime: 8, toggle: true },
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // THE BONE GOLEM — THE MASTERY LADDER's Expert Necromancer opening
  // (data/classes.ts kit): the golem family's fourth body, raised from bone
  // — the same binding contract as its kin, one shared golem slot.
  summon_bone_golem: {
    tree: NECROMANCER_TREES.summon_bone_golem,
    id: 'summon_bone_golem', name: 'Summon Bone Golem',
    description: "Toggle to reserve mana and summon a Bone Golem that resists poison and shatters the ground with its slams. If destroyed, the golem automatically reassembles after 8 seconds while the skill remains active. Only one major golem contract can be active at a time.",
    tags: ['spell', 'summon', 'minion', 'persistent'], color: '#d8d0c0',
    manaCost: 14, cooldown: 4, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'bone_golem',
      count: 1, maxActive: 1, poolGroup: 'golem', exclusiveGroup: 'golem',
      persistent: { reserve: 32, respawnTime: 8, toggle: true },
    },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // BIND FAMILIAR — the Summoner's opening companion (data/classes.ts; her
  // retheme: one bonded familiar over any horde). The golems' persistent
  // contract on an arcane body: mana reserved while the bond holds, a fallen
  // familiar re-forms, ONE at a time on its own pool (a found golem may
  // still stand beside it — the choice is the starter's, not a law).
  bind_familiar: {
    tree: PACT_STEEL_STARTER_TREES.bind_familiar,
    id: 'bind_familiar', name: 'Bind Familiar',
    description: "Toggle to reserve mana and bind an arcane familiar that follows you and fires ranged projectiles at enemies. If destroyed, the familiar reforms after 5 seconds while the bond remains active.",
    tags: ['spell', 'summon', 'minion', 'chaos', 'persistent'], color: '#b08ae8',
    manaCost: 12, cooldown: 3, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'arcane_familiar',
      count: 1, maxActive: 1, poolGroup: 'familiar', exclusiveGroup: 'familiar',
      persistent: { reserve: 24, respawnTime: 5, toggle: true },
    },
    effects: [],
    requirements: { willpower: 12, intelligence: 10 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // Duration minion that can be neither hit nor harmed: pure lifespan trade.
  conjure_wisp: {
    id: 'conjure_wisp', name: 'Conjure Wisp',
    description: "Conjure an untargetable spirit wisp for 12 seconds that fires frost bolts at nearby enemies, up to 2 active at once.",
    tags: ['spell', 'summon', 'minion', 'cold', 'duration'], color: '#b8e8ff',
    manaCost: 16, cooldown: 1.5, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'spirit_wisp',
      count: 1, maxActive: 2, duration: 12,
    },
    effects: [],
    requirements: { willpower: 14, intelligence: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('minionDamage', 'increased', 0.12)] },
  },

  // ======================= Edge-band AoE ===================================

  shock_nova: {
    id: 'shock_nova', name: 'Shock Nova',
    description: "Releases a ring of lightning that damages enemies along its outer edge with a 50% chance to shock, leaving an undamaged eye at the center.",
    tags: ['spell', 'lightning', 'aoe'], color: '#e8e86a',
    manaCost: 11, cooldown: 2.5, useTime: 0.7,
    baseDamage: { lightning: [18, 30] },
    delivery: { type: 'nova', radius: 135, edgeOnly: 0.6 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.5 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 120, weight: 3 },
  },

  surgical_strike: {
    id: 'surgical_strike', name: 'Surgical Strike',
    description: "Sweeps a precise blade arc that hits only enemies along the outer tip of the swing, with a 35% chance to inflict bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#d8e0e8',
    manaCost: 6, cooldown: 0, useTime: 0.85,
    baseDamage: { physical: [22, 34] },
    delivery: { type: 'cone', range: 150, arcDeg: 55, edgeOnly: 0.72 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 1 },
    ],
    requirements: { dexterity: 18, strength: 10 },
    ai: { range: 140, weight: 2 },
  },

  wild_strike: {
    tree: DUELIST_STARTER_TREES.wild_strike,
    id: 'wild_strike', name: 'Wild Strike',
    description: "Channel a rapid flurry of rapier thrusts at random angles across a wide arc while moving at 70% of normal speed. Each hit has a 20% chance to inflict bleed.",
    tags: ['attack', 'melee', 'physical', 'channel'], color: '#6ab8d8',
    // ⚠ Batch 54 wild_strike solo-sustain re-seat (2026-08-15), unblessed:
    // cost 3→1 — at 3/beat the 5/s channel demanded 15 mana/s and ran
    // REGEN-clocked (~2 strikes/s bare L20; interval is not the frequency
    // lever while starved). Sliver 12°→30°, damage [6,10]→[8,13] — the
    // cone angle test is center-only, so a 12° sliver in the 90° sector
    // touched an adjacent single target ~13% of beats; 30° lands ~1 in 3
    // with the wander untouched. Held solo bare L20: 5.7→51.8 dps —
    // seated beside ascetic/juggernaut, under the rooted primaries (the
    // 70%-mobility premium); pack lane touches 5/5 bodies.
    manaCost: 1, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.2, move: 'slowed', moveFactor: 0.7, trackAim: true },
    // The random SECTOR is a lever set: forward-biased 90° here (reined in
    // from 240 — the flurry stays a fighter, not a sprinkler). Data or
    // supports move it: Wild Abandon rounds it toward a full circle,
    // Measured Blade focuses it, offsetDeg can lock it aside or behind.
    aim: { random: { offsetDeg: 0, spreadDeg: 90 } },
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'cone', range: 150, arcDeg: 30 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.2, magnitude: 0.25 },
    ],
    requirements: { dexterity: 16 },
    ai: { range: 130, weight: 2 },
  },

  buckler_strike: {
    tree: DUELIST_STARTER_TREES.buckler_strike,
    id: 'buckler_strike', name: 'Buckler Strike',
    description: "Perform a two-part melee slash, striking in a sweeping arc to one flank followed a beat later by an answering cut to the opposite flank.",
    tags: ['attack', 'melee', 'physical'], color: '#7ac8d8',
    manaCost: 6, cooldown: 0, useTime: 0.45,
    // A MOBILE attack: the cast bar slows you to 35% instead of rooting.
    castMove: 0.35,
    aim: { sequence: { steps: [-75, 75], pause: 0.22 } },
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'melee', range: 120, arcDeg: 100 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 100, weight: 2 },
  },

  // ======================= DoT, curses & blessings =========================

  essence_drain: {
    tree: PACT_STEEL_STARTER_TREES.essence_drain,
    id: 'essence_drain', name: 'Essence Drain',
    description: "Fire a chaos bolt that deals light hit damage and inflicts Decay at 160% magnitude.",
    tags: ['spell', 'projectile', 'chaos', 'duration'], color: '#9a78c8',
    manaCost: 7, cooldown: 0, useTime: 0.7,
    baseDamage: { chaos: [4, 7] },
    delivery: { type: 'projectile', speed: 160, radius: 10, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 1, magnitude: 1.6 },
    ],
    requirements: { willpower: 12, intelligence: 10 },
    ai: { range: 440, weight: 2, keepDistance: 260 },
  },

  contagion: {
    id: 'contagion', name: 'Contagion',
    description: "Afflicts enemies in the target area with Contagion, dealing chaos damage over time. When an afflicted enemy dies, Contagion spreads to nearby enemies.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#78c878',
    manaCost: 12, cooldown: 2, useTime: 0.75,
    baseDamage: { chaos: [3, 5] },
    delivery: { type: 'ground', radius: 105, castRange: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'contagion', chance: 1, magnitude: 1.4 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 390, weight: 3, keepDistance: 260 },
  },

  snipe: {
    id: 'snipe', name: 'Snipe',
    description: "Channel a long bow draw with a timing window near the end of the cast bar; pressing the skill key again inside the window fires an empowered arrow that pierces all enemies.",
    tags: ['attack', 'projectile', 'physical'], color: '#c8d8b0',
    manaCost: 8, cooldown: 0, useTime: 1.2,
    castMode: 'perfect',
    baseDamage: { physical: [24, 38] },
    delivery: { type: 'projectile', speed: 760, radius: 7, range: 700, pierce: 999 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 20 },
    ai: { range: 600, weight: 2, keepDistance: 350 },
  },

  // A slow pale mote on a WEAK cursor guide with a drunken wobble — it
  // wanders after its mark rather than flying at it (the finger-mage bolt:
  // what it lacks in aim it makes up in numbers). Monster-only.
  spectral_finger: {
    id: 'spectral_finger', name: 'Spectral Finger', noDrop: true,
    description: "Fire a slow, long-range chaos projectile that loosely homes toward enemies.",
    tags: ['spell', 'projectile', 'chaos'], color: '#b8d0a0',
    manaCost: 5, cooldown: 0, useTime: 0.5,
    baseDamage: { chaos: [7, 12] },
    delivery: {
      type: 'projectile', speed: 215, radius: 8, range: 900, pierce: 0,
      trajectory: { guide: 1.5, erratic: 0.5 },
    },
    effects: [{ type: 'damage' }],
    ai: { range: 620, weight: 3, keepDistance: 420 },
  },

  // --- Curses: area-cast debuff fields -------------------------------------
  // All carry a small chaos roll that normally never lands as damage — it
  // exists for Hex Blast detonations and Malfeasance ruptures to scale from.

  despair: {
    tree: NECROMANCER_RITES.despair,
    id: 'despair', name: 'Despair',
    description: "Curses enemies in the target area for 7 seconds, reducing all of their resistances by 25%.",
    tags: ['spell', 'curse', 'aoe', 'chaos', 'duration'], color: '#8a68b8',
    manaCost: 10, cooldown: 4, useTime: 0.6,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'ground', radius: 115, castRange: 440 },
    effects: [{ type: 'status', status: 'despair', chance: 1 }],
    requirements: { willpower: 14, intelligence: 12 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  agony: {
    id: 'agony', name: 'Agony',
    description: "Curses enemies in the target area for 7 seconds, heavily reducing their armor and reducing their evasion by a third.",
    tags: ['spell', 'curse', 'aoe', 'chaos', 'duration'], color: '#b85858',
    manaCost: 10, cooldown: 4, useTime: 0.6,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'ground', radius: 115, castRange: 440 },
    effects: [{ type: 'status', status: 'agony', chance: 1 }],
    requirements: { willpower: 14, strength: 10 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  indecision: {
    id: 'indecision', name: 'Indecision',
    description: "Curses enemies in the target area, slowing their attack and cast speed by 25–30%.",
    tags: ['spell', 'curse', 'aoe', 'chaos', 'duration'], color: '#6888b8',
    manaCost: 10, cooldown: 4, useTime: 0.6,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'ground', radius: 115, castRange: 440 },
    effects: [{ type: 'status', status: 'indecision', chance: 1 }],
    requirements: { willpower: 14, intelligence: 12 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  befuddlement: {
    id: 'befuddlement', name: 'Befuddlement',
    description: "Curses enemies in the target area, giving them a 35% chance to fumble any attack or spell they start and briefly stun themselves.",
    tags: ['spell', 'curse', 'aoe', 'chaos', 'duration'], color: '#c878b8',
    manaCost: 12, cooldown: 5, useTime: 0.6,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'ground', radius: 115, castRange: 440 },
    effects: [{ type: 'status', status: 'befuddlement', chance: 1 }],
    requirements: { willpower: 18 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  bewilder: {
    id: 'bewilder', name: 'Bewilder',
    description: "Curses enemies in the target area for 7 seconds, reducing their accuracy and causing their ranged attacks and spells to scatter wide of their target.",
    tags: ['spell', 'curse', 'aoe', 'chaos', 'duration'], color: '#c8a8e8',
    manaCost: 10, cooldown: 4, useTime: 0.6,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'ground', radius: 115, castRange: 440 },
    effects: [{ type: 'status', status: 'bewilder', chance: 1 }],
    requirements: { willpower: 16, intelligence: 12 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  // --- Blessings: the inverse — buff fields for your side ------------------

  belligerence: {
    id: 'belligerence', name: 'Belligerence',
    description: "Grants you and nearby allies 45% increased detection range for 8 seconds, allowing minions to engage enemies from farther away.",
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#d8a848',
    manaCost: 14, cooldown: 8, useTime: 0.5,
    delivery: { type: 'nova', radius: 170, affects: 'allies' },
    effects: [{ type: 'status', status: 'belligerence', chance: 1 }],
    requirements: { willpower: 12 },
    ai: { range: 200, weight: 1 },
  },

  furor: {
    id: 'furor', name: 'Furor',
    description: "Grants you and nearby allies 20% increased movement, attack, and cast speed for 8 seconds.",
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#e8c848',
    manaCost: 16, cooldown: 10, useTime: 0.5,
    delivery: { type: 'nova', radius: 170, affects: 'allies' },
    effects: [{ type: 'status', status: 'furor', chance: 1 }],
    requirements: { willpower: 14 },
    ai: { range: 200, weight: 1 },
  },

  // ======================= Casting showcases ===============================
  // Channel variations, charge-and-release, and press-skill cast bars.

  frost_storm: {
    id: 'frost_storm', name: 'Frost Storm',
    description: "Channel while stationary to call down a blizzard at the target location that ramps up to 150% increased damage the longer you channel. Each pulse deals cold damage with a 50% chance to chill.",
    tags: ['spell', 'cold', 'aoe', 'channel', 'duration'], color: '#8ad0f0',
    manaCost: 6, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.5, move: 'immobile', trackAim: false,
      ramp: { per: 0.35, max: 1.5 },
    },
    baseDamage: { cold: [7, 10] },
    delivery: { type: 'ground', radius: 110, castRange: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 380, weight: 3, keepDistance: 280 },
  },

  lightning_blast: {
    id: 'lightning_blast', name: 'Lightning Blast',
    description: "Hold to charge and release to blast the target area with lightning, with a 45% chance to shock. Releasing immediately deals 50% of base damage, while charging to full deals 140% more damage in a 50% larger area.",
    tags: ['spell', 'lightning', 'aoe'], color: '#f0e84a',
    manaCost: 14, cooldown: 2, useTime: 0,
    castMode: 'charge',
    chargeUp: { maxTime: 2.2, minScale: 0.5, maxScale: 2.4, aoeScaleMax: 1.5 },
    baseDamage: { lightning: [16, 26] },
    delivery: { type: 'ground', radius: 95, castRange: 440 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.45 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  inferno: {
    id: 'inferno', name: 'Inferno',
    description: "Channel while moving at reduced speed to send rolling waves of flame toward your cursor, each dealing fire damage with an 11% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'channel', 'duration'], color: '#ff7a30',
    manaCost: 3, cooldown: 0, useTime: 0,
    castMode: 'channel',
    // Each pulse IS a gout: the channel's interval is the spawn cadence,
    // and ending the channel only stops SPAWNING — live gouts fly on.
    // Mobile-ish and quick-turning (D2's hose, not the siege beam).
    channel: {
      interval: 0.16, move: 'slowed', moveFactor: 0.45, turnRate: 3.4, trackAim: true,
    },
    baseDamage: { fire: [4, 7] },
    delivery: {
      type: 'projectile', speed: 250, radius: 14, range: 300, pierce: 3,
      shape: 'wave',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 260, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09)] },
  },

  infernal_ray: {
    tree: DEVOTED_STARTER_TREES.infernal_ray,
    id: 'infernal_ray', name: 'Infernal Ray',
    description: "Channel while stationary with reduced turning speed to project a beam of fire that ramps up to 200% increased damage and double width the longer it is held. Each pulse has a 9% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'channel'], color: '#ff8a3a',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    // QUADRATIC ramps: t² growth means a 1s dabble is ~6% of the payoff a 5s
    // commitment reaches — the machine-gun tap is dead, the siege beam lives.
    // Turn rate near-locked (0.45 rad/s) — Weathervane is the investment out.
    channel: {
      interval: 0.3, move: 'immobile', turnRate: 0.45, trackAim: true,
      ramp: { per: 0.08, max: 2, curve: 'quadratic' },
      rampAoe: { per: 0.04, max: 1, curve: 'quadratic' },
    },
    baseDamage: { fire: [5, 8] },
    delivery: { type: 'cone', range: 240, arcDeg: 16 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 220, weight: 3, keepDistance: 180 },
  },

  sunpiercer: {
    id: 'sunpiercer', name: 'Sunpiercer',
    description: "Hold to focus light and release to fire a long piercing beam of fire. Scales from 25% of base damage on an instant release up to 320% at full charge, with a 14% chance to ignite targets hit.",
    tags: ['spell', 'fire', 'aoe'], color: '#ffd23a',
    manaCost: 18, cooldown: 4, useTime: 0,
    castMode: 'charge',
    // The charge grows the beam's LENGTH, not its width — cone range rides
    // aoeMult while the arc stays a sliver: the gathered lance reaches ~670.
    // arcTaper: a TAP washes the light WIDE (7° × 6 ≈ 42°) and weak; the
    // full gather converges it back to the killing line (#49's duality).
    chargeUp: { maxTime: 1.8, minScale: 0.25, maxScale: 3.2, aoeScaleMax: 1.6, arcTaper: 6 },
    baseDamage: { fire: [20, 32] },
    delivery: { type: 'cone', range: 420, arcDeg: 7, beamFx: true },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.5 },
    ],
    requirements: { intelligence: 26 },
    ai: { range: 380, weight: 3, keepDistance: 300 },
  },

  focusing_ray: {
    id: 'focusing_ray', name: 'Focusing Ray',
    description: "Channel while stationary with reduced turning speed to project a wide fan of lightning that narrows into a long-range beam as you hold it, ramping up to 160% increased damage at full focus with a 20% chance to shock on each pulse.",
    tags: ['spell', 'lightning', 'aoe', 'channel'], color: '#9ae8ff',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    // The CONVERGING channel: rampArc squeezes the 56° fan toward ~9° over
    // six held seconds (the engine floors arcs at ×0.1) while rampAoe
    // stretches the reach 280 → 532 and the damage nearly triples.
    channel: {
      interval: 0.28, move: 'immobile', turnRate: 0.7, trackAim: true,
      ramp: { per: 0.22, max: 1.6 },
      rampAoe: { per: 0.16, max: 0.9 },
      rampArc: { per: -0.14, max: 0 },
    },
    baseDamage: { lightning: [6, 9] },
    delivery: { type: 'cone', range: 280, arcDeg: 56 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 260, weight: 3, keepDistance: 200 },
  },

  static_strike: {
    id: 'static_strike', name: 'Static Strike',
    description: "Strikes in a wide melee arc for physical and lightning damage with a 20% chance to shock, granting 1 Static charge per hit (up to 6). Every 0.7 seconds, consumes 1 Static charge to fire a lightning bolt at the nearest enemy for 55% of the hit's damage.",
    tags: ['attack', 'melee', 'lightning', 'physical'], color: '#ffe94a',
    manaCost: 4, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 11], lightning: [5, 9] },
    delivery: { type: 'melee', range: 55, arcDeg: 100 },
    // The banked storm: one 'static' charge per swing, one bolt per 0.7s
    // beat to the nearest enemy within 300 at 55% of the skill's roll.
    discharge: { charge: 'static', interval: 0.7, range: 300, damageScale: 0.55 },
    effects: [
      { type: 'damage' },
      { type: 'gainCharge', charge: 'static', amount: 1, max: 6 },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { strength: 12, dexterity: 12 },
    ai: { range: 60, weight: 2 },
  },

  serpent_ray: {
    id: 'serpent_ray', name: 'Serpent Ray',
    description: "Channel while moving at reduced speed to project a continuous piercing beam of lightning that curves toward your cursor in flight, with a 10% chance to shock on each hit.",
    tags: ['spell', 'lightning', 'projectile', 'channel'], color: '#7af0c8',
    manaCost: 3, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.09, move: 'slowed', moveFactor: 0.5, trackAim: true },
    baseDamage: { lightning: [3, 5] },
    // Rapid pierce-everything bolts on a strong cursor guide: the stream of
    // segments IS the bending beam.
    delivery: {
      type: 'projectile', speed: 760, radius: 6, range: 640,
      pierce: 99, trajectory: { guide: 4.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.1 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 500, weight: 2, keepDistance: 350 },
  },

  umbral_lance: {
    id: 'umbral_lance', name: 'Umbral Lance',
    description: "Project an instant beam of chaos energy that damages all enemies along its line while allowing you to move at 50% speed during the cast.",
    tags: ['spell', 'chaos', 'aoe'], color: '#c86aff',
    manaCost: 6, cooldown: 0.4, useTime: 0.25,
    castMove: 0.5,
    baseDamage: { chaos: [8, 13] },
    delivery: { type: 'cone', range: 560, arcDeg: 3, beamFx: true },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 16 },
    ai: { range: 520, weight: 2, keepDistance: 380 },
  },

  imperious_barrage: {
    id: 'imperious_barrage', name: 'Imperious Barrage',
    description: "Channel while stationary to fire a rapid stream of chaos bolts with slight scatter that each pierce 1 target. Damage ramps up to 60% increased damage the longer you channel.",
    tags: ['spell', 'chaos', 'projectile', 'channel'], color: '#ff6ad5',
    manaCost: 5, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.13, move: 'immobile', turnRate: 2.4, trackAim: true,
      ramp: { per: 0.06, max: 0.6 },
    },
    // Every pulse re-rolls the random aim transform: the barrage wanders
    // a ±5° band around the cursor line.
    aim: { random: { spreadDeg: 10 } },
    baseDamage: { chaos: [6, 10] },
    delivery: { type: 'projectile', speed: 900, radius: 5, range: 620, pierce: 1 },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 24 },
    ai: { range: 500, weight: 2, keepDistance: 360 },
  },

  // UNSTABLE BARRAGE — the erratic-drumbeat channel: explosions of
  // wandering size on a wandering clock. intervalJitter rolls every beat's
  // gap, variance.aoe rolls every detonation's footprint, and the storm's
  // scatter wanders its placement — nothing about it is steady except the
  // average. The showcase for the per-cast variance axis.
  unstable_barrage: {
    id: 'unstable_barrage', name: 'Unstable Barrage',
    description: "Channel to bombard the area around your cursor with erratic fire explosions of varying radius, each with an 11% chance to ignite. Enters cooldown when channeling ends.",
    tags: ['spell', 'fire', 'aoe', 'storm', 'channel', 'duration'], color: '#ff9a3a',
    manaCost: 8, cooldown: 4, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.7, intervalJitter: [0.45, 1.7],
      move: 'slowed', moveFactor: 0.5, trackAim: true, cooldownOnEnd: true,
    },
    variance: { aoe: [0.6, 1.55] },
    baseDamage: { fire: [9, 21] },
    // CELESTIAL (occlusion 'free'): the barrage falls from above.
    delivery: {
      type: 'storm', count: [1, 2], interval: 0.1, areaRadius: 120,
      hitRadius: 46, scatter: 42, castRange: 460, occlusion: 'free',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 420, weight: 3, keepDistance: 280 },
  },

  meteoric_bombardment: {
    id: 'meteoric_bombardment', name: 'Meteoric Bombardment',
    description: "Channel while stationary to rain volleys of 2–3 meteors around your cursor, each dealing fire damage with a 12% chance to ignite. Enters cooldown when channeling ends.",
    tags: ['spell', 'fire', 'aoe', 'storm', 'channel', 'duration'], color: '#ff5a2a',
    manaCost: 9, cooldown: 5, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.8, move: 'immobile', trackAim: true, cooldownOnEnd: true },
    baseDamage: { fire: [12, 18] },
    // CELESTIAL (occlusion 'free'): the bombardment falls from above.
    delivery: { type: 'storm', count: [2, 3], interval: 0.12, areaRadius: 130, hitRadius: 50, castRange: 480, occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.3 },
    ],
    requirements: { intelligence: 26 },
    ai: { range: 440, weight: 3, keepDistance: 300 },
  },

  perfect_strike: {
    tree: DUELIST_STARTER_TREES.perfect_strike,
    id: 'perfect_strike', name: 'Perfect Strike',
    description: "Wind up a heavy melee strike with a timing window near the end of the cast bar; pressing the skill key again inside the window deals 70% more damage. Has a 30% chance to stun.",
    tags: ['attack', 'melee', 'physical'], color: '#f0c868',
    manaCost: 6, cooldown: 0, useTime: 1.1,
    castMode: 'perfect',
    baseDamage: { physical: [22, 34] },
    delivery: { type: 'melee', range: 60, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.3 },
    ],
    requirements: { strength: 16 },
    ai: { range: 65, weight: 2 },
  },

  timed_strike: {
    id: 'timed_strike', name: 'Timed Strike',
    description: "Wind up a melee strike with a random marker on the cast bar; pressing the skill key again as the bar crosses the marker deals 120% more damage.",
    tags: ['attack', 'melee', 'physical'], color: '#c8e0f0',
    manaCost: 6, cooldown: 0, useTime: 1.2,
    castMode: 'timed',
    baseDamage: { physical: [16, 26] },
    delivery: { type: 'melee', range: 58, arcDeg: 90 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 65, weight: 2 },
  },

  infinite_slashes: {
    id: 'infinite_slashes', name: 'Infinite Slashes',
    description: "Repeatedly press the skill key during the cast to add extra melee slashes to the flurry, up to 15 slashes in a single use.",
    tags: ['attack', 'melee', 'physical'], color: '#e0e8f0',
    manaCost: 8, cooldown: 1, useTime: 1.4,
    castMode: 'multitude',
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'melee', range: 55, arcDeg: 100 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 18 },
    ai: { range: 60, weight: 2 },
  },

  // ======================= Movement ========================================
  // Blinks (instant / delayed / behind-target), forced dashes, stealth,
  // decoys, pads, gates, and the stateful Mark/Recall pair.

  dash: {
    tree: DEVOTED_STARTER_TREES.dash,
    id: 'dash', name: 'Dash',
    description: 'A quick burst of motion toward the cursor.',
    tags: ['movement', 'instant'], color: '#8ac8d8',
    manaCost: 4, cooldown: 2.5, useTime: 0,
    delivery: { type: 'dash', distance: 260, speed: 850, width: 0 },
    effects: [],
    requirements: { dexterity: 10 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  charge: {
    tree: IMPACT_STARTER_TREES.charge,
    id: 'charge', name: 'Charge',
    description: "Charge Unstoppably toward the target location, dealing physical damage, knocking back, and having a 25% chance to stun all enemies in your path.",
    tags: ['attack', 'melee', 'movement', 'physical'], color: '#d89858',
    manaCost: 7, cooldown: 4, useTime: 0,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'dash', distance: 430, speed: 420, width: 85 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
      { type: 'status', status: 'stun', chance: 0.25 },
    ],
    requirements: { strength: 12 },
    // The 430-px committed run wants its melee band kept clear: inside
    // 140 the AI pick collapses to the near discount (charge discipline).
    ai: { range: 380, weight: 2, minRange: 140 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  // THE GORER'S OWN CHARGE (noDrop — the beastkin gorer's horns, never a
  // gem): the player's charge grammar with THE CHARGE CARRY armed
  // (DashDelivery.onContact — the grab fabric's 'drag' verb): the first
  // body the run CONNECTS with is hooked for a short, bounded carry,
  // shed forward at the stop. holdSec outlasts any possible remainder
  // (the run is ≤ ~1.02s), so the run's own clock — never the roll —
  // decides the release; mass law, policy tiers and the re-seize grace
  // all gate inside the fabric.
  gore_charge: {
    id: 'gore_charge', name: 'Goring Charge', noDrop: true,
    description: "Charge forward with lowered horns, hooking and dragging the first enemy hit before flinging them clear.",
    tags: ['attack', 'melee', 'movement', 'physical'], color: '#d89858',
    manaCost: 7, cooldown: 5.5, useTime: 0,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'dash', distance: 430, speed: 420, width: 56,
      onContact: {
        grab: { verb: 'drag', holdSec: [1.2, 1.5], breakMult: 1.5, releaseGrace: 3 },
        maxCarryDistance: 90,
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
    ],
    ai: { range: 380, weight: 2, minRange: 140 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  // THE FOURTH WALL's movement debut (CaromDelivery — engine/fourthwall.ts):
  // the frame seals, the body becomes the ball. The long cooldown is the
  // deliberate first-pass throttle while the ride's numbers are tuned; the
  // ride itself ends early through the one status door (dispel, stun, a
  // grab, a willed dash — the saddle law).
  caged_comet: {
    id: 'caged_comet', name: 'Caged Comet',
    description: "Lock the camera frame into a bounded arena for 3 seconds and launch yourself across it, ricocheting off walls and screen edges while flying over pits and damaging enemies hit.",
    tags: ['attack', 'melee', 'movement', 'physical'], color: '#8ad0e8',
    manaCost: 20, cooldown: 18, useTime: 0,
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'carom', speed: 620, duration: 3 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 45 },
    ],
    requirements: { dexterity: 20 },
    ai: { range: 340, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  warp: {
    tree: RUNEWEAVER_STARTER_TREES.warp,
    id: 'warp', name: 'Warp',
    description: "Teleport to the target location after a 0.9-second delay.",
    tags: ['spell', 'movement', 'duration'], color: '#a888e8',
    manaCost: 10, cooldown: 3, useTime: 0,
    delivery: { type: 'blink', range: 420, delay: 0.9 },
    effects: [],
    requirements: { intelligence: 14 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  teleport: {
    id: 'teleport', name: 'Teleport',
    description: "Instantly teleport to the target location.",
    tags: ['spell', 'movement', 'instant'], color: '#7a9aff',
    manaCost: 18, cooldown: 8, useTime: 0,
    delivery: { type: 'blink', range: 650 },
    effects: [],
    requirements: { intelligence: 20 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  shadow_step: {
    tree: STARTER_SKILL_TREES.shadow_step,
    id: 'shadow_step', name: 'Shadow Step', icon: 'step',
    description: "Teleports you directly behind a targeted enemy.",
    tags: ['movement'], color: '#6a6a8a',
    manaCost: 9, cooldown: 5, useTime: 0,
    targeting: { target: 'enemy', castRange: 500 },
    delivery: { type: 'blink', range: 500, behindTarget: true },
    effects: [],
    requirements: { dexterity: 18 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  stealth: {
    id: 'stealth', name: 'Stealth',
    description: "Grants 3 Stealth charges (up to 5) and 15% increased movement speed for 3 seconds. While Stealthed, enemies have reduced detection range, your hits count as backstabs, and your first attack or spell gains ambush bonuses. Using an offensive skill consumes 1 Stealth charge and briefly reveals you before remaining charges re-conceal you.",
    tags: ['movement', 'buff', 'instant'], color: '#4a5a78',
    manaCost: 10, cooldown: 10, useTime: 0,
    delivery: { type: 'self' },
    effects: [
      { type: 'gainCharge', charge: 'stealth', amount: 3, max: 5 },
      {
        type: 'buff', id: 'stealth_step', duration: 3,
        mods: [mod('moveSpeed', 'increased', 0.15)],
      },
    ],
    requirements: { dexterity: 16 },
    leveling: { perLevel: [mod('ambushBonus', 'flat', 0.04)] },
  },

  cloak: {
    tree: STARTER_SKILL_TREES.cloak,
    id: 'cloak', name: 'Cloak', icon: 'veil',
    description: "Shroud yourself in shadow for 8 seconds, reducing enemy detection range by 65% and granting 10% increased movement speed. Attacking briefly reveals you.",
    tags: ['movement', 'buff', 'duration'], color: '#587898',
    manaCost: 12, cooldown: 12, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'cloak', duration: 8,
      mods: [mod('concealment', 'flat', 1), mod('moveSpeed', 'increased', 0.1)],
    }],
    requirements: { dexterity: 14 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  invisibility: {
    tree: PRECISION_STARTER_TREES.invisibility,
    id: 'invisibility', name: 'Invisibility',
    description: "Turns you invisible for 2.5 seconds, preventing enemies from seeing or targeting you. Using any offensive skill ends Invisibility immediately.",
    tags: ['spell', 'movement', 'buff', 'duration'], color: '#b8c8e8',
    manaCost: 22, cooldown: 14, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      // Short by design: an exhaustive tactical window, not a safety blanket
      // (any offensive use consumes the buff — see consumeStealth).
      type: 'buff', id: 'invisibility', duration: 2.5,
      mods: [mod('invisible', 'override', 1)],
    }],
    requirements: { dexterity: 14, finesse: 10 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  decoy: {
    tree: BOND_STARTER_TREES.decoy,
    id: 'decoy', name: 'Decoy',
    description: "Dash away while leaving a taunting mirage behind for 6 seconds that draws enemy attacks.",
    tags: ['movement', 'duration'], color: '#88b8c8',
    manaCost: 10, cooldown: 6, useTime: 0,
    delivery: { type: 'dash', distance: 240, speed: 800, width: 0, decoyDuration: 6 },
    effects: [],
    requirements: { dexterity: 12, charisma: 6 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  corpse_shift: {
    id: 'corpse_shift', name: 'Corpse Shift',
    description: "Consume a targeted corpse to teleport directly to its location.",
    tags: ['spell', 'movement', 'corpse'], color: '#98a8b8',
    manaCost: 8, cooldown: 3, useTime: 0,
    targeting: { target: 'corpse', castRange: 520 },
    delivery: { type: 'blink', range: 520 },
    effects: [],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  temporal_pad: {
    id: 'temporal_pad', name: 'Temporal Pad',
    description: "Place an indestructible pad for 12 seconds (up to 2 active at once) that launches you forward along its facing when stepped on.",
    tags: ['spell', 'movement', 'totem', 'duration'], color: '#68d8b8',
    manaCost: 9, cooldown: 1.5, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'pad', look: 'device_temporal_pad',
      range: 0, duration: 12, maxActive: 2, placeRange: 220,
      invulnerable: true,
      propel: { distance: 340, speed: 950 },
    },
    effects: [],
    requirements: { intelligence: 14, dexterity: 10 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  gate_shift: {
    id: 'gate_shift', name: 'Gate Shift',
    description: "Place a portal at the target location, then cast again to place a linked second portal. Stepping into either portal teleports you to the other for up to 16 seconds.",
    tags: ['spell', 'movement', 'totem', 'duration'], color: '#b878e8',
    manaCost: 12, cooldown: 1, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'gate', look: 'device_gate_shift',
      range: 0, duration: 16, maxActive: 2, placeRange: 520,
      invulnerable: true,
    },
    effects: [],
    requirements: { intelligence: 18 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  mark: {
    id: 'mark', name: 'Mark / Recall',
    description: "Inscribe a rune at the target location and change this skill slot to Recall, which teleports you back to the rune once when activated.",
    tags: ['spell', 'movement'], color: '#e8c868',
    manaCost: 8, cooldown: 2, useTime: 0,
    delivery: { type: 'mark', castRange: 400 },
    effects: [],
    requirements: { intelligence: 12, willpower: 10 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  // ======================= Corpse & combo skills ===========================
  // Built on the targeting engine: skills restricted to corpses, statused
  // enemies, or minions — the foundation for combo-based play.

  corpse_explosion: {
    tree: NECROMANCER_SACRAMENTS.corpse_explosion,
    id: 'corpse_explosion', name: 'Corpse Explosion',
    description: "Detonate a targeted corpse, dealing fire damage plus 15% of the corpse's maximum life in an area with an 11% chance to ignite.",
    tags: ['spell', 'corpse', 'fire', 'aoe'], color: '#d86a4a',
    manaCost: 9, cooldown: 0.5, useTime: 0.6,
    baseDamage: { fire: [8, 12] },
    targeting: { target: 'corpse', castRange: 420, corpseLifeDamage: 0.15, plural: true },
    delivery: { type: 'nova', radius: 90 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { willpower: 14, intelligence: 10 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  dark_pact: {
    id: 'dark_pact', name: 'Dark Pact',
    description: "Sacrifice 8% of a targeted minion's life to deal chaos damage in a ring around it, or sacrifice your own life to detonate around yourself if no minion is targeted.",
    tags: ['spell', 'chaos', 'aoe', 'minion'], color: '#9858b8',
    manaCost: 8, cooldown: 0, useTime: 0.65,
    baseDamage: { chaos: [11, 17] },
    targeting: { target: 'minion', castRange: 420, fallback: 'self', drainsTargetLife: 0.08 },
    delivery: { type: 'nova', radius: 95 },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  expunge: {
    id: 'expunge', name: 'Expunge',
    description: "Targets a poisoned enemy to purge their poison, dealing chaos damage and leaving a toxic cloud for 3 seconds with a 60% chance to poison enemies standing in it.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#88c838',
    manaCost: 11, cooldown: 1.5, useTime: 0.6,
    baseDamage: { chaos: [14, 20] },
    targeting: { target: 'enemy', requiresStatus: 'poison', castRange: 400 },
    delivery: { type: 'target', splash: 60 },
    effects: [
      { type: 'damage' },
      { type: 'spawnZone', radius: 75, duration: 3, tickInterval: 0.5, damageScale: 0.4 },
      { type: 'status', status: 'poison', chance: 0.6, magnitude: 0.4 },
    ],
    requirements: { willpower: 16 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },
  
  rend: {
    tree: PRECISION_STARTER_TREES.rend,
    id: 'rend', name: 'Rend',
    description: "Slash in a frontal melee arc for physical damage with a 70% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical'], color: '#e05545',
    manaCost: 3, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [6, 9] },
    delivery: { type: 'melee', range: 50, arcDeg: 90 },
	effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.7, magnitude: 0.4 },
    ],
    requirements: { strength: 6, dexterity: 6 },
    ai: { range: 55, weight: 2 },
  },

  bloodlet: {
    id: 'bloodlet', name: 'Bloodlet',
    description: "Release a ring of blades that deals light hit damage and inflicts a heavy Bleed on all targets caught, including yourself.",
    tags: ['attack', 'physical', 'aoe'], color: '#a83040',
    manaCost: 6, cooldown: 3, useTime: 0.6,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'nova', radius: 105, affects: 'all' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 1, magnitude: 1.4 },
    ],
    requirements: { strength: 10 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  eviscerate: {
    tree: PRECISION_STARTER_TREES.eviscerate,
    id: 'eviscerate', name: 'Eviscerate',
    description: "Targets a bleeding enemy to rip the wound open, dealing physical damage and consuming all bleed stacks on the target to deal their remaining damage immediately.",
    tags: ['attack', 'melee', 'physical'], color: '#d04050',
    manaCost: 7, cooldown: 2, useTime: 0.7,
    baseDamage: { physical: [16, 26] },
    targeting: { target: 'enemy', requiresStatus: 'bleed', consumesStatus: true, castRange: 150 },
    delivery: { type: 'target' },
    effects: [{ type: 'damage' }],
    ai: { range: 60, weight: 3 },
    requirements: { dexterity: 12, finesse: 10 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  reckoning: {
    tree: PACT_STEEL_STARTER_TREES.reckoning,
    id: 'reckoning', name: 'Reckoning',
    description: "Delivers a heavy melee strike with a 30% chance to stun, consuming all Fury charges to deal 25% more damage per charge consumed.",
    tags: ['attack', 'melee', 'physical'], color: '#e87838',
    manaCost: 8, cooldown: 1.5, useTime: 0.85,
    baseDamage: { physical: [18, 28] },
    // OPTIONAL charges: swings bare-handed at zero Fury — a plain blow —
    // and scales 25% MORE per charge it DID consume. Five make a verdict.
    chargeCost: { charge: 'fury', amount: 'all', optional: true, damagePerCharge: 0.25 },
    delivery: { type: 'melee', range: 60, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.3 },
    ],
    requirements: { strength: 14, fortitude: 10 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  raise_spectre: {
    id: 'raise_spectre', name: 'Raise Spectre',
    description: "Binds the spirit of a corpse into a permanent allied Spectre, up to 2 active Spectres at once. Once you master a creature type in the Tracker's bestiary, you can attune its page to this skill in your skill book to summon that Spectre directly without requiring a corpse.",
    tags: ['spell', 'summon', 'minion', 'corpse'], color: '#a8b8d8',
    manaCost: 30, cooldown: 2, useTime: 1,
    targeting: { target: 'corpse', castRange: 420, plural: true },
    delivery: { type: 'summon', fromCorpse: true, grimoire: true, count: 1, maxActive: 2 },
    effects: [],
    requirements: { willpower: 22 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // THE HUNTER'S BOND: claim a living beast instead of raising a dead one.
  // Taxonomy-gated (MonsterDef.tags 'beast' — targeting simply finds nothing
  // else), one bond per GEM, and the companion DOWNS instead of dying:
  // linger beside it like a downed ally, or shift-press the WHISTLE (the
  // meta layer) to recall it revived and whole on a long clock.
  // The first CONCENTRATION bearer (engine/skills.ts ConcentrationSpec): the
  // bar fills only while your cursor RIDES the beast — look away and the
  // claim bleeds back out ('drain'); hold the gaze to the end and it's yours.
  tame_beast: {
    tree: BOND_STARTER_TREES.tame_beast,
    id: 'tame_beast', name: 'Tame Beast',
    description: "Hold your cursor on a living beast for 2.4 seconds to tame it as a permanent companion (guaranteed against beasts below 50% life, or a 35% chance against healthier beasts). Tamed companions become downed rather than dying when defeated, scale with your level and minion modifiers, and can be recalled, revived, and healed by pressing this skill when all companion slots are full. Hold Shift and press to cycle companion stances (Aggressive, Defensive, Passive).",
    tags: ['spell', 'minion', 'duration', 'companion'], color: '#a8c87a',
    manaCost: 12, cooldown: 6, useTime: 0,
    targeting: { target: 'enemy', castRange: 320, requiresMonsterTags: ['beast'] },
    concentration: { time: 2.4, onBreak: 'drain', drainRate: 1.25 },
    delivery: { type: 'target' },
    // The claim contests above half life: 35% against a hale beast, sliding
    // to certainty at the threshold — the sneak-tame opener (Cloak in, gaze,
    // claim) is real but never free.
    effects: [{ type: 'tame', tags: ['beast'], sureBelow: 0.5, wildChance: 0.35 }],
    // THE TAMED BOND (sympathy links, worn while Tame sits on the bar):
    // what the keeper drinks, the beasts drink — flask pours and flask
    // buffs replay on every bonded companion, and scooped resource orbs
    // pour into them too. docs/engine/sympathy.md; potency stacks with
    // keeper supports (Alpha's Bond).
    equipMods: [mod('sympathy_bond_flask', 'flat', 1), mod('sympathy_bond_orb', 'flat', 1)],
    requirements: { wisdom: 14, charisma: 8 },
    // The exhausted-skill two-for-one: bond held → the base press IS the
    // Whistle (SkillDef.convert); the meta slot commands the companion.
    convert: { when: 'companionsFull', skillId: 'companion_whistle' },
    // THE STANCE SHIFT (engine/companionStances.ts) is the bond's own meta:
    // the shift-press walks the pack's conduct — aggressive → defensive →
    // passive — and the mini-button wears the current stance. ORDERS ride
    // in as socketed grants (the Command gem's Assault chains one beat
    // after the shift): the beast charges the mark, then keeps its stance.
    meta: { skillId: 'companion_stance', label: 'Stance' },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12), mod('minionDamage', 'increased', 0.08)] },
  },

  // The whistle — Tame Beast's meta payload (its own long clock; refunds
  // itself when no bond answers).
  companion_whistle: {
    id: 'companion_whistle', name: 'Whistle', noDrop: true,
    description: "Recall, revive, and fully heal your beast companions, cleansing harmful ailments and granting 3 seconds of damage and debuff protection split evenly across your active pack.",
    tags: ['spell', 'instant', 'companion'], color: '#a8c87a',
    manaCost: 0, cooldown: 45, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'whistleCompanion' }],
  },

  revive: {
    id: 'revive', name: 'Revive',
    description: "Raise a targeted corpse as a temporary ally for 15 seconds, up to 6 active at once.",
    tags: ['spell', 'summon', 'minion', 'corpse', 'duration'], color: '#88a878',
    manaCost: 12, cooldown: 0.8, useTime: 0.7,
    targeting: { target: 'corpse', castRange: 420, plural: true },
    delivery: { type: 'summon', fromCorpse: true, count: 1, maxActive: 6, duration: 15 },
    effects: [],
    requirements: { willpower: 16 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('minionDamage', 'increased', 0.12)] },
  },

  corpse_feast: {
    id: 'corpse_feast', name: 'Corpse Feast',
    description: "Consumes a corpse to restore 25% of its maximum life as life and 12% as mana, and grants life regeneration for 4 seconds.",
    tags: ['spell', 'corpse', 'duration'], color: '#9ab868',
    manaCost: 0, cooldown: 5, useTime: 0.5,
    targeting: {
      target: 'corpse', castRange: 420, plural: true,
      corpseLifeRestore: { life: 0.25, mana: 0.12 },
    },
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'well_fed', duration: 4,
      mods: [mod('lifeRegen', 'flat', 3)],
    }],
    requirements: { willpower: 12 },
    thresholds: [
      { level: 12, label: 'Bottomless', mods: [mod('cooldownRecovery', 'increased', 0.3)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  gather_the_dead: {
    id: 'gather_the_dead', name: 'Gather the Dead',
    description: "Pull all corpses near the target location into a tight cluster without consuming them.",
    tags: ['spell', 'corpse'], color: '#8a90a8',
    manaCost: 6, cooldown: 3, useTime: 0.35,
    delivery: { type: 'self' },
    effects: [{ type: 'dragCorpses', radius: 240 }],
    requirements: { willpower: 10 },
    thresholds: [
      { level: 12, label: 'The long walk', mods: [mod('aoeRadius', 'increased', 0.35)] },
    ],
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  // The charnel ghoul's table manners (monster verb — rides the SAME corpse
  // fabric as the player's Feast: one targeting resolve, one restore path,
  // and it EATS the fuel your detonations wanted. Denial with teeth.)
  gorge_carrion: {
    id: 'gorge_carrion', name: 'Gorge on Carrion', noDrop: true,
    description: "Consume a corpse to restore 60% of its maximum life to the consumer and grant 25% increased attack speed and 20% increased movement speed for 4 seconds.",
    tags: ['spell', 'corpse', 'duration'], color: '#8a9060',
    manaCost: 5, cooldown: 8, useTime: 0.6,
    targeting: { target: 'corpse', castRange: 240, plural: true, corpseLifeRestore: { life: 0.6 } },
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'gorged', duration: 4,
      mods: [mod('attackSpeed', 'increased', 0.25), mod('moveSpeed', 'increased', 0.2)],
    }],
    ai: { range: 240, weight: 3 },
  },

  volatile_cinders: {
    id: 'volatile_cinders', name: 'Volatile Cinders',
    description: "Consumes a corpse to launch a homing cinder that seeks out nearby enemies and explodes for fire damage in a small area with a 9% chance to ignite.",
    tags: ['spell', 'corpse', 'fire', 'projectile'], color: '#e07848',
    manaCost: 10, cooldown: 1.2, useTime: 0.55,
    baseDamage: { fire: [13, 19] },
    targeting: { target: 'corpse', castRange: 420, plural: true },
    delivery: {
      // Rises AT the pile it was eaten from (origin 'cursor' — never
      // streaming out of the far-away caster), drifts, then latches on.
      type: 'projectile', speed: 210, radius: 10, range: 520,
      duration: 3.5,
      origin: 'cursor', originRange: 9999,
      explode: { radius: 60, damageScale: 0.8 },
      trajectory: { homing: 3.0, erratic: 1.4 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { willpower: 15, intelligence: 12 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  // THE CONVERGING PILE (trajectory.arcTo on corpse fuel — rimeclaw's hook
  // married to the cinders' grammar): the volley leaves the caster's hand,
  // fans wide, and every sliver bends home on the mark to detonate where
  // the pile lies — the fan's spread is the telegraph, the stacked bursts
  // are the payoff. One sliver more per extra body eaten (THE WAGON's
  // projectilesPerExtra lane, exactly the cinders' flight law). Delivery
  // numbers are rimeclaw's verbatim; launch stays at the HAND because an
  // origin-'cursor' arcTo flight would spawn inside its own 16-unit
  // arrival ring (instant, dt-shaped detonation — the honest geometry is
  // the reference's own). Surfaced by the Marrowcraft pool row
  // (meta/unlocks.ts — the charnel ghoul's lesson).
  marrowhooks: {
    id: 'marrowhooks', name: 'Marrowhooks',
    description: "Consume a corpse at the target location to launch 3 bone shards (+1 per additional corpse consumed) that fan outward before curving back to detonate at the target point, with a 35% chance to inflict Bleed.",
    tags: ['spell', 'corpse', 'physical', 'projectile', 'aoe'], color: '#c2b28e',
    manaCost: 10, cooldown: 1.2, useTime: 0.6,
    baseDamage: { physical: [10, 15] },
    targeting: { target: 'corpse', castRange: 420, plural: true },
    delivery: {
      type: 'projectile', speed: 480, radius: 9, range: 900,
      count: 3, spreadDeg: 110,
      explode: { radius: 72, damageScale: 0.8 },
      trajectory: { arcTo: 2.2 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 0.35 },
    ],
    requirements: { willpower: 15, intelligence: 12 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  // --- Golems: three skills, ONE shared cap ('golem' pool group) -----------

  summon_fire_golem: {
    id: 'summon_fire_golem', name: 'Summon Fire Golem',
    description: "Summon a persistent fire golem that reserves mana and automatically reforms 6 seconds after dying. Cast again to dismiss. Shares your golem limit.",
    tags: ['spell', 'summon', 'minion', 'fire', 'persistent'], color: '#e86a3a',
    manaCost: 28, cooldown: 3, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'fire_golem', count: 1, maxActive: 1, poolGroup: 'golem', exclusiveGroup: 'golem',
      persistent: { reserve: 30, respawnTime: 6, toggle: true },
    },
    effects: [],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  summon_ice_golem: {
    id: 'summon_ice_golem', name: 'Summon Ice Golem',
    description: "Summon a persistent ice golem that reserves mana and automatically reforms 6 seconds after dying. Cast again to dismiss. Shares your golem limit.",
    tags: ['spell', 'summon', 'minion', 'cold', 'persistent'], color: '#7ac8e8',
    manaCost: 28, cooldown: 3, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'ice_golem', count: 1, maxActive: 1, poolGroup: 'golem', exclusiveGroup: 'golem',
      persistent: { reserve: 30, respawnTime: 6, toggle: true },
    },
    effects: [],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  summon_blood_golem: {
    id: 'summon_blood_golem', name: 'Summon Blood Golem',
    description: "Summon a persistent blood golem that reserves mana and automatically reforms 6 seconds after dying. Cast again to dismiss. Shares your golem limit.",
    tags: ['spell', 'summon', 'minion', 'physical', 'persistent'], color: '#b03848',
    manaCost: 28, cooldown: 3, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'blood_golem', count: 1, maxActive: 1, poolGroup: 'golem', exclusiveGroup: 'golem',
      persistent: { reserve: 30, respawnTime: 6, toggle: true },
    },
    effects: [],
    requirements: { willpower: 18, strength: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // ======================= Trajectory showcases ============================

  hammer_of_judgment: {
    tree: FRONTIER_STARTER_TREES.hammer_of_judgment,
    id: 'hammer_of_judgment', name: 'Hammer of Judgment',
    description: "Hurl a spectral hammer that spirals outward around you, repeatedly striking enemies in its path with a 20% chance to stun.",
    tags: ['spell', 'projectile', 'physical', 'duration'], color: '#e8c878',
    manaCost: 8, cooldown: 2, useTime: 0.8,
    baseDamage: { physical: [14, 22] },
    delivery: {
      type: 'projectile', speed: 260, radius: 16, range: 2200,
      shape: 'square', rehit: 1,
      // Orbit drives the revolution; the touch of spiral is the old 30 u/s
      // reel-out (1.15 × 260 × 0.1) — the ever-widening ring, now two axes.
      trajectory: { orbit: 1, spiral: 1.15, orbitRadius: 55 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.2 },
    ],
    requirements: { strength: 10, fortitude: 12 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('effectDuration', 'increased', 0.05)] },
  },

  frozen_orb: {
    id: 'frozen_orb', name: 'Frozen Orb',
    description: "Launch a slow-moving orb of ice that chills enemies it touches and continuously fires Frostbolts in a spiral as it travels.",
    tags: ['spell', 'projectile', 'cold', 'duration'], color: '#9ad8f8',
    manaCost: 22, cooldown: 4, useTime: 0.9,
    baseDamage: { cold: [10, 15] },
    delivery: {
      type: 'projectile', speed: 110, radius: 15, range: 420,
      shape: 'octagon', rehit: 0.8,
      emit: { skillId: 'frostbolt', interval: 0.18, pattern: 'rotating' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 1 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 400, weight: 3, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('projectileSize', 'increased', 0.04)] },
  },

  spectral_helix: {
    id: 'spectral_helix', name: 'Spectral Helix',
    description: "Throw a spinning blade that weaves in a figure-eight along its path, dealing physical and cold damage and capable of hitting the same target multiple times.",
    tags: ['attack', 'projectile', 'physical', 'cold'], color: '#b8d0e8',
    manaCost: 7, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [7, 11], cold: [3, 6] },
    delivery: {
      type: 'projectile', speed: 300, radius: 9, range: 560,
      shape: 'line', rehit: 0.7,
      trajectory: { weave: 5, amplitude: 48 },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 500, weight: 2, keepDistance: 300 },
  },

  orb_of_storms: {
    id: 'orb_of_storms', name: 'Orb of Storms',
    description: "Place a destructible storm orb for 10 seconds (up to 1 active at a time) that casts Spark at a nearby enemy every 0.7 seconds.",
    tags: ['spell', 'totem', 'lightning', 'duration'], color: '#e8e84a',
    manaCost: 14, cooldown: 3, useTime: 0.7,
    delivery: {
      type: 'construct', kind: 'pylon', look: 'device_orb_of_storms', castSkillId: 'spark',
      range: 300, duration: 10, maxActive: 1, life: 40, placeRange: 380, interval: 0.7,
    },
    effects: [],
    requirements: { intelligence: 16 },
    ai: { range: 350, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.06)] },
  },

  // ======================= Constructs ======================================
  // Deployed objects that cast real catalog skills with your modifiers.

  flame_totem: {
    id: 'flame_totem', name: 'Flame Totem',
    description: "Place a destructible totem for 10 seconds (up to 2 active at once) that fires Firebolts at nearby enemies.",
    tags: ['spell', 'totem', 'fire', 'duration'], color: '#e8824a',
    manaCost: 14, cooldown: 1, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'totem', look: 'device_flame_totem', castSkillId: 'firebolt',
      range: 420, duration: 10, maxActive: 2, life: 55, placeRange: 120,
    },
    effects: [],
    requirements: { intelligence: 14, willpower: 10 },
    ai: { range: 380, weight: 1, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('effectDuration', 'increased', 0.06)] },
  },

  ballista_sentry: {
    tree: CONTROL_STARTER_TREES.ballista_sentry,
    id: 'ballista_sentry', name: 'Ballista Sentry',
    description: "Place an indestructible ballista for 12 seconds (up to 2 active at once) that fires piercing arrows down its fixed facing lane.",
    tags: ['attack', 'totem', 'physical', 'projectile', 'duration'], color: '#c8b890',
    manaCost: 12, cooldown: 2, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'sentry', look: 'device_ballista_sentry', castSkillId: 'piercing_arrow',
      range: 540, duration: 12, maxActive: 2, invulnerable: true, placeRange: 110,
    },
    effects: [],
    requirements: { dexterity: 14 },
    ai: { range: 480, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('effectDuration', 'increased', 0.06)] },
  },

  frost_trap: {
    id: 'frost_trap', name: 'Frost Trap',
    description: "Place a trap lasting up to 25 seconds (up to 3 active at once) that triggers a Frost Nova when an enemy steps near it.",
    tags: ['spell', 'trap', 'cold', 'aoe', 'duration', 'totem'], color: '#9ad4e8',
    manaCost: 10, cooldown: 2.5, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'trap', look: 'device_frost_trap', castSkillId: 'frost_nova',
      range: 75, duration: 25, maxActive: 3, placeRange: 380,
    },
    effects: [],
    requirements: { intelligence: 12 },
    ai: { range: 340, weight: 1, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  fire_mine: {
    id: 'fire_mine', name: 'Fire Mine',
    description: "Place a dormant mine lasting up to 30 seconds (up to 5 active at once). Detonate your placed mines to trigger an Immolation Blast at each mine.",
    tags: ['spell', 'mine', 'fire', 'aoe', 'duration', 'totem'], color: '#e8624a',
    manaCost: 8, cooldown: 0.8, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'mine', look: 'device_fire_mine', castSkillId: 'immolation_blast',
      range: 0, duration: 30, maxActive: 5, placeRange: 340,
    },
    // The founding meta-button (#21): the trigger rides the mine's slot.
    meta: { skillId: 'detonate_mines', label: 'Detonate' },
    effects: [],
    requirements: { intelligence: 16 },
    ai: { range: 300, weight: 1, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  detonate_mines: {
    id: 'detonate_mines', name: 'Detonate Mines',
    description: "Detonate all of your placed mines in rapid sequence.",
    tags: ['spell', 'mine'], color: '#ffaa4a',
    manaCost: 4, cooldown: 0.5, useTime: 0,
    delivery: { type: 'detonate' },
    effects: [],
    requirements: { intelligence: 16 },
    ai: { range: 400, weight: 2, autonomousMeta: true, deployed: { kind: 'mine' } },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  storm_pylon: {
    id: 'storm_pylon', name: 'Storm Pylon',
    description: "Place a destructible pylon for 12 seconds that grants nearby allies 15% increased damage and fires Spark at a nearby enemy every 1.2 seconds.",
    tags: ['spell', 'totem', 'lightning', 'aura', 'duration'], color: '#d8e84a',
    manaCost: 18, cooldown: 4, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pylon', look: 'device_storm_pylon', castSkillId: 'spark',
      range: 360, duration: 12, maxActive: 1, life: 50, placeRange: 260, interval: 1.2,
      aura: { radius: 150, allyMods: [mod('damage', 'increased', 0.15)] },
    },
    effects: [],
    requirements: { intelligence: 18, willpower: 12 },
    ai: { range: 340, weight: 1, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.06)] },
  },

  immolation_blast: {
    id: 'immolation_blast', name: 'Immolation Blast',
    description: "Release a wide ring of fire damage around the origin with a 14% chance to ignite enemies hit.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff7a3a',
    manaCost: 13, cooldown: 2, useTime: 0.8,
    baseDamage: { fire: [18, 28] },
    delivery: { type: 'nova', radius: 100 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 85, weight: 3 },
  },

  // ======================= Auras / presences ===============================
  // Areas centered on you, moving with you, affecting those inside.

  righteous_fire: {
    id: 'righteous_fire', name: 'Righteous Fire',
    description: "Toggle to engulf yourself in holy flame, sacrificing 3.5% of your maximum life per second to burn nearby enemies for fire damage per second equal to 3.5% of their maximum life.",
    tags: ['spell', 'aura', 'fire', 'aoe'], color: '#ff9a2a',
    manaCost: 0, cooldown: 0.5, useTime: 0.3,
    delivery: {
      type: 'aura', mode: 'toggle',
      upkeep: { lifeFractionPerSec: 0.035 },
      aura: {
        radius: 115,
        enemyDps: { type: 'fire', drainLifeFraction: 0.035 },
      },
    },
    effects: [],
    requirements: { strength: 12, intelligence: 12 },
    ai: { range: 120, weight: 1 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  vampiric_presence: {
    id: 'vampiric_presence', name: 'Vampiric Presence',
    description: "Surround yourself with an aura for 6 seconds that deals chaos damage per second to nearby enemies and leeches 100% of that damage as life.",
    tags: ['spell', 'aura', 'chaos', 'aoe', 'duration'], color: '#c04060',
    manaCost: 25, cooldown: 10, useTime: 0.5,
    delivery: {
      type: 'aura', mode: 'duration', duration: 6,
      aura: {
        radius: 125,
        enemyDps: { type: 'chaos', amount: 9 },
        siphonFraction: 1,
      },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 130, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.08)] },
  },

  unholy_aura: {
    id: 'unholy_aura', name: 'Unholy Aura',
    description: "Toggle to surround yourself with a miasma that slows nearby enemies by 25% and reduces the damage they deal by 12%. Enemies that die within the aura have a 50% chance to rise as temporary zombies under your command for 15 seconds (up to 6 active zombies).",
    tags: ['spell', 'aura', 'chaos', 'aoe', 'minion'], color: '#7a5898',
    manaCost: 0, cooldown: 0.5, useTime: 0.4,
    delivery: {
      type: 'aura', mode: 'toggle',
      upkeep: { manaPerSec: 6 },
      aura: {
        radius: 135,
        enemyMods: [mod('moveSpeed', 'more', -0.25), mod('damage', 'more', -0.12)],
        deathSpawn: { monsterId: 'zombie', chance: 0.5, maxActive: 6, duration: 15 },
      },
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 140, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06), mod('aoeRadius', 'increased', 0.05)] },
  },

  devotion: {
    id: 'devotion', name: 'Devotion',
    description: "Toggle to reserve 40 mana, granting you and nearby allies +60 armor and 8% less damage taken.",
    tags: ['spell', 'aura', 'buff', 'aoe'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0.5, useTime: 0.4,
    delivery: {
      type: 'aura', mode: 'toggle',
      upkeep: { reserveMana: 40 },
      aura: {
        radius: 145,
        allyMods: [mod('armor', 'flat', 60), mod('damageTaken', 'more', -0.08)],
      },
    },
    effects: [],
    requirements: { strength: 14 },
    ai: { range: 150, weight: 1 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  wellspring_stance: {
    tree: DISCIPLINE_STARTER_TREES.wellspring_stance,
    id: 'wellspring_stance', name: 'Wellspring Stance',
    description: "Toggle to gain +30 maximum poise and 25% increased poise recovery rate while active, and continuously drain mana above 35% to restore missing poise.",
    tags: ['spell', 'aura', 'buff', 'duration'], color: '#c8b878',
    manaCost: 0, cooldown: 0.5, useTime: 0.3,
    delivery: {
      type: 'aura', mode: 'toggle',
      // The stance IS the base: poise ships empty (a pool you BUILD), so
      // the kit carries its own footing — attributes and % passives then
      // scale this 30 like any other flat source.
      aura: { radius: 60, selfMods: [mod('poise', 'flat', 30), mod('poiseRegenPct', 'increased', 0.25)] },
    },
    conduits: [{ from: 'mana', to: 'poise', drainPct: 0.035, ratio: 1.2, floor: 0.35 }],
    effects: [],
    requirements: { strength: 12, willpower: 12 },
    ai: { range: 130, weight: 1.2 },
    leveling: { perLevel: [mod('conduitEfficiency', 'increased', 0.08)] },
  },

  preservation: {
    id: 'preservation', name: 'Preservation',
    description: "For 10 seconds, you and nearby allies regenerate +4 life per second and recover 4% of maximum life every 3 seconds.",
    tags: ['spell', 'aura', 'buff', 'aoe', 'duration'], color: '#8ae0a8',
    manaCost: 30, cooldown: 12, useTime: 0.6,
    delivery: {
      type: 'aura', mode: 'duration', duration: 10,
      aura: {
        radius: 145,
        allyMods: [mod('lifeRegen', 'flat', 4)],
        pulse: { interval: 3, healAllies: { base: 'maxLife', amount: 0.04 } },
      },
    },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 150, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.05)] },
  },

  // ======================= Ranger / projectile attacks =====================

  piercing_arrow: {
    tree: FRONTIER_STARTER_TREES.piercing_arrow,
    id: 'piercing_arrow', name: 'Piercing Arrow',
    description: "Fire an arrow that pierces up to 3 enemies.",
    tags: ['attack', 'projectile', 'physical'], color: '#b8d8a0',
    manaCost: 4, cooldown: 0, useTime: 0.65,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'projectile', speed: 520, radius: 6, range: 620, pierce: 3 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 560, weight: 2, keepDistance: 320 },
  },

  fan_of_blades: {
    tree: FRONTIER_STARTER_TREES.fan_of_blades,
    id: 'fan_of_blades', name: 'Fan of Blades',
    description: "Throw a fan of 5 knives in a wide frontal arc.",
    tags: ['attack', 'projectile', 'physical', 'aoe'], color: '#c0c8d8',
    manaCost: 7, cooldown: 1.2, useTime: 0.7,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'projectile', speed: 440, radius: 6, range: 300, count: 5, spreadDeg: 70 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 18 },
    ai: { range: 260, weight: 3, keepDistance: 180 },
  },

  // ======================= Swashbuckler / mobility =========================

  dash_strike: {
    tree: DUELIST_STARTER_TREES.dash_strike,
    id: 'dash_strike', name: 'Dash Strike',
    description: "Dash toward your cursor, slashing all enemies along your path for physical damage.",
    tags: ['attack', 'melee', 'physical', 'movement'], color: '#6ab8d8',
    manaCost: 6, cooldown: 3, useTime: 0,
    baseDamage: { physical: [10, 15] },
    delivery: { type: 'dash', distance: 230, speed: 950, width: 70 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 14 },
    ai: { range: 240, weight: 2 },
  },

  quickstep: {
    tree: FRONTIER_STARTER_TREES.quickstep,
    id: 'quickstep', name: 'Quickstep',
    description: "Gain 30% increased movement speed and evasion, and 15% increased attack and cast speed for 4 seconds.",
    tags: ['buff', 'movement', 'duration'], color: '#8ad8c0',
    manaCost: 7, cooldown: 8, useTime: 0.3,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'quickstep', duration: 4,
      mods: [
        mod('moveSpeed', 'increased', 0.3),
        mod('attackSpeed', 'increased', 0.15),
        mod('castSpeed', 'increased', 0.15),
        mod('evasion', 'increased', 0.3),
      ],
    }],
    requirements: { dexterity: 12 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('cooldownRecovery', 'increased', 0.06)] },
  },

  stone_skin: {
    tree: PACT_STEEL_STARTER_TREES.stone_skin,
    id: 'stone_skin', name: 'Stone Skin',
    description: "Harden your skin for 6 seconds, gaining +80 armor and taking 15% less damage.",
    tags: ['buff', 'duration'], color: '#a8a090',
    manaCost: 10, cooldown: 12, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'stone_skin', duration: 6,
      mods: [mod('armor', 'flat', 80), mod('damageTaken', 'more', -0.15)],
    }],
    requirements: { vitality: 14 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('cooldownRecovery', 'increased', 0.06)] },
  },

  // ======================= Basic monster skills ============================
  // No requirements — these are the baseline moves of the bestiary, but a
  // player character could bind them too if you remove nothing.

  // ======================= The shield wall ==================================
  // Directional defense: a held guard stance with its own shield health,
  // deployable barrier walls, and a projectile-eating dome. The guard arc
  // scales with area modifiers (yes, Widening fits), and channel supports
  // (Nettles, Eruption Cycle, Channeled Tempest) treat guarding as
  // channeling — a shield that fights back is one socket away.

  shield_up: {
    tree: STARTER_SKILL_TREES.shield_up,
    id: 'shield_up', name: 'Shield Up', icon: 'guard',
    description: "Raise a directional guard with its own health pool that blocks frontal hits and projectiles while reducing your movement speed to 40%. Holding the guard for at least 1 second readies a shield bash on release that knocks enemies back with a 40% chance to stun.",
    tags: ['guard', 'channel', 'duration'], color: '#8ab8d8',
    manaCost: 10, cooldown: 5, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 120, shieldLife: 60, moveFactor: 0.4, turnRate: 2.4,
      // (Parry comes from the Perfect Timing support now — socket it in.)
      // Release at/past the arming line (BASH_CFG.releaseFloor × the
      // bashFloor stat — the guard bar's tic) AND past the arm clock
      // (BASH_CFG.armTime × the bashArmTime stat — the meter above the
      // bar; no per-skill armTime here, the shared clock rules) and the
      // stance converts into the bash. THE teaching guard: wall first,
      // answer second — and the answer is earned by the hold.
      bash: { mult: 0.7, range: 60, arcDeg: 110, stunChance: 0.4, knockback: 70 },
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 14 },
    ai: { range: 240, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.18)] },
  },

  spiked_bulwark: {
    tree: BASTION_STARTER_TREES.spiked_bulwark,
    id: 'spiked_bulwark', name: 'Spiked Bulwark',
    description: "Raise a wide spiked guard that grants +12 thorns while held, reflecting physical damage to attackers.",
    tags: ['guard', 'channel', 'duration', 'physical'], color: '#a8988a',
    manaCost: 9, cooldown: 5, useTime: 0,
    castMode: 'guard',
    // No innate bash ON PURPOSE (the guard-hall differentiation): this
    // stance's damage is the thorns fabric — attrition, not a burst. The
    // spikes run deeper in trade.
    guard: {
      arcDeg: 150, shieldLife: 85, moveFactor: 0.35, turnRate: 2.2,
    },
    innateMods: [mod('thorns', 'flat', 12, undefined, 'guarding')],
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 12, fortitude: 12 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.14), mod('thorns', 'flat', 3, undefined, 'guarding')] },
  },

  reprisal: {
    tree: BASTION_STARTER_TREES.reprisal,
    id: 'reprisal', name: 'Reprisal',
    description: "Usable within 3 seconds of taking damage to sweep a heavy melee arc in front of you that knocks enemies back with a 35% chance to stun.",
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#d8b070',
    manaCost: 10, cooldown: 6, useTime: 0.55,
    baseDamage: { physical: [26, 40] },
    gate: { recentDamage: { within: 3 } },
    delivery: { type: 'melee', range: 105, arcDeg: 120 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.35 },
      { type: 'knockback', strength: 30 },
    ],
    requirements: { strength: 12, fortitude: 14 },
    ai: { range: 100, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // The Answering Steel meta-payload: spends a block-banked Riposte charge.
  riposte_thrust: {
    id: 'riposte_thrust', name: 'Riposte Thrust', noDrop: true,
    description: "Spend a Riposte charge to perform a fast, narrow melee thrust with a 30% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical', 'instant'], color: '#d8e8f8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [16, 26] },
    chargeCost: { charge: 'riposte', amount: 1 },
    delivery: { type: 'melee', range: 110, arcDeg: 34 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
  },

  riposte: {
    tree: PRECISION_STARTER_TREES.riposte,
    id: 'riposte', name: 'Riposte',
    description: "Enter a parrying stance for 0.6 seconds that negates the next frontal hit and counters for 220% of its damage.",
    tags: ['attack', 'melee', 'guard', 'channel', 'duration'], color: '#e8d8a0',
    manaCost: 7, cooldown: 4, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 150, shieldLife: 1, moveFactor: 0.25, turnRate: 3.2,
      maxDuration: 0.6,
      parry: { window: 99, counterMult: 2.2 }, // the whole stance is the window
      endOnParry: true,
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { dexterity: 18, strength: 12 },
    ai: { range: 130, weight: 2 },
    leveling: { perLevel: [mod('guardParryPower', 'increased', 0.12)] },
  },

  // --- The guard hall grows: the challenge fabric + stance textures --------
  // (Taunt is a STATUS — see engine/status.ts 'taunted' — so everything
  // below is plain data riding the ordinary apply fabric.)

  challenging_shout: {
    tree: BASTION_STARTER_TREES.challenging_shout,
    id: 'challenging_shout', name: 'Challenging Shout',
    description: "Unleashes an instant warcry that taunts nearby enemies, forcing them to target you and reducing the damage they deal to other allies. Can be used while guarding.",
    tags: ['warcry', 'aoe', 'duration', 'instant'], color: '#e0763a',
    manaCost: 8, cooldown: 10, useTime: 0,
    usableWhileGuarding: true,
    delivery: { type: 'nova', radius: 240, affects: 'enemies' },
    effects: [{ type: 'status', status: 'taunted', chance: 1 }],
    requirements: { strength: 12, charisma: 8 },
    ai: { range: 200, weight: 1.4 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.08), mod('cooldownRecovery', 'increased', 0.06)] },
  },

  // The Defiant Bulwark's rolling dare (GuardSpec.pulse tolls these).
  taunt_pulse: {
    id: 'taunt_pulse', name: 'Defiant Challenge', noDrop: true,
    description: "Taunts enemies in a ring around you for 2.5 seconds.",
    tags: ['warcry', 'aoe', 'instant'], color: '#e0763a',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 170, affects: 'enemies' },
    effects: [{ type: 'status', status: 'taunted', chance: 1, durationOverride: 2.5 }],
  },

  defiant_bulwark: {
    id: 'defiant_bulwark', name: 'Defiant Bulwark',
    description: "Raise a guard stance that pulses every 1.75 seconds to taunt nearby enemies.",
    tags: ['guard', 'channel', 'duration', 'warcry'], color: '#d88a4a',
    manaCost: 11, cooldown: 6, useTime: 0,
    castMode: 'guard',
    // No innate bash ON PURPOSE: the pulse is this stance's payoff — the
    // room hits the wall, not the other way around. The dare rolls a
    // touch faster in trade.
    guard: {
      arcDeg: 130, shieldLife: 70, moveFactor: 0.35, turnRate: 2.2,
      pulse: { skillId: 'taunt_pulse', interval: 1.75 },
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 20 },
    ai: { range: 200, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.15), mod('aoeRadius', 'increased', 0.05)] },
  },

  // --- The ATTENTION-CRAFT lane (the threat chart, played as a hand) --------
  // The taunt STATUS is the loud half (challenging_shout, provocation); these
  // work the LEDGER itself: threatGen (how loudly your damage books on every
  // chart), the taunting construct decoy, and the ranged single-pull. All of
  // it reads the extraction swarm's fixation graft honestly — the same chart
  // decides whether a disturbed native keeps chewing the seam or turns on you.

  lodestone: {
    id: 'lodestone', name: 'Lodestone',
    description: "Place a destructible stone for 8 seconds (up to 1 active at a time) that taunts nearby enemies into attacking it.",
    tags: ['spell', 'construct', 'duration', 'totem'], color: '#a5e3b4',
    manaCost: 26, cooldown: 11, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'totem', look: 'device_lodestone', taunt: true, aims: false,
      range: 0, duration: 8, maxActive: 1, life: 90, placeRange: 320,
    },
    effects: [],
    requirements: { willpower: 14 },
    minDropLevel: 6,
    leveling: { perLevel: [mod('minionLife', 'increased', 0.09), mod('effectDuration', 'increased', 0.04)] },
    thresholds: [
      { level: 12, label: 'A louder stone', mods: [mod('constructMaxCount', 'flat', 1)] },
    ],
  },

  goad: {
    tree: BOND_STARTER_TREES.goad,
    id: 'goad', name: 'Goad',
    description: "Throws a stone at a single enemy that deals double threat and taunts the target without alerting nearby enemies.",
    tags: ['attack', 'projectile'], color: '#e8c87a',
    manaCost: 8, cooldown: 5, useTime: 0.45,
    baseDamage: { physical: [7, 12] },
    delivery: { type: 'projectile', speed: 420, radius: 8, range: 540 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'taunted', chance: 1 },
    ],
    innateMods: [mod('threatGen', 'more', 1.0)],
    requirements: { dexterity: 12 },
    minDropLevel: 5,
    ai: { range: 480, weight: 1.4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09), mod('projectileSpeed', 'increased', 0.03)] },
  },

  quiet_step: {
    tree: DUELIST_STARTER_TREES.quiet_step,
    id: 'quiet_step', name: 'Quiet Step',
    description: "For 5 seconds, your hits generate 75% less threat and you are 30% harder for enemies to detect.",
    tags: ['spell', 'duration'], color: '#b8c8c0',
    manaCost: 18, cooldown: 14, useTime: 0.3,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'quiet_step', duration: 5,
      mods: [mod('threatGen', 'more', -0.75), mod('detectability', 'increased', -0.3)],
    }],
    requirements: { dexterity: 16 },
    minDropLevel: 7,
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.05)] },
    thresholds: [
      { level: 14, label: 'Beneath the argument', mods: [mod('cooldownRecovery', 'increased', 0.25)] },
    ],
  },

  marching_bulwark: {
    tree: IMPACT_STARTER_TREES.marching_bulwark,
    id: 'marching_bulwark', name: 'Marching Bulwark',
    description: "Raise a narrow guard that allows you to move at 75% of normal speed while held. Holding the guard for at least 1 second readies a shield bash on release with a 30% chance to stun.",
    tags: ['guard', 'channel', 'duration'], color: '#b0a878',
    manaCost: 10, cooldown: 5, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 90, shieldLife: 55, moveFactor: 0.75, turnRate: 2.8,
      bash: { mult: 0.8, range: 70, arcDeg: 100, stunChance: 0.3, knockback: 60 },
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 16, dexterity: 12 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.16), mod('moveSpeed', 'increased', 0.02, undefined, 'guarding')] },
  },

  runeward: {
    id: 'runeward', name: 'Runeward',
    description: "Raise a warded guard stance that grants 25% increased spell damage to spells cast while guarding.",
    tags: ['guard', 'channel', 'duration'], color: '#8a9ae8',
    manaCost: 9, cooldown: 5, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 140, shieldLife: 50, moveFactor: 0.35, turnRate: 2.4,
    },
    innateMods: [mod('damage', 'increased', 0.25, ['spell'], 'guarding')],
    delivery: { type: 'self' },
    effects: [],
    requirements: { willpower: 16, strength: 10 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.12), mod('damage', 'increased', 0.05, ['spell'], 'guarding')] },
  },

  stone_communion: {
    id: 'stone_communion', name: 'Stone Communion',
    description: "Raise a broad guard stance that continuously drains your poise above 25% to restore damaged shield health between hits.",
    tags: ['guard', 'channel', 'duration'], color: '#a89878',
    manaCost: 10, cooldown: 6, useTime: 0,
    castMode: 'guard',
    // No innate bash ON PURPOSE: this wall's identity is the PUMP — poise
    // becomes stone, the stance outlasts. Lowering a communing wall is a
    // rite ending, not a blow (the pump drinks deeper in trade; Answering
    // Wall can still teach it violence).
    guard: {
      arcDeg: 140, shieldLife: 55, moveFactor: 0.35, turnRate: 2.2,
    },
    conduits: [{ from: 'poise', to: 'guard', drainPct: 0.09, ratio: 2.2, floor: 0.25 }],
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 18, willpower: 10 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.12), mod('conduitEfficiency', 'increased', 0.08)] },
  },

  // --- The breaker suite: skills aimed at a DEFENSE LAYER -------------------
  // (Attacker-side texture hunting: poise bars, insight flow, energy
  // shields. Every one carries an ai block — monsters hunt YOUR layers
  // with the same verbs.)

  sunder_maul: {
    tree: IMPACT_STARTER_TREES.sunder_maul,
    id: 'sunder_maul', name: 'Sunder Maul',
    description: "Delivers a heavy overhead slam that deals 150% more poise damage and increases the duration of Sundered it inflicts by 50%.",
    tags: ['attack', 'melee', 'physical'], color: '#c8a058',
    manaCost: 6, cooldown: 3, useTime: 0.7,
    baseDamage: { physical: [14, 24] },
    innateMods: [mod('poiseDamage', 'more', 1.5), mod('sunderDuration', 'increased', 0.5)],
    delivery: { type: 'melee', range: 100, arcDeg: 90 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 18 },
    ai: { range: 95, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09), mod('poiseDamage', 'increased', 0.1)] },
  },

  verdict: {
    tree: IMPACT_STARTER_TREES.verdict,
    id: 'verdict', name: 'The Verdict',
    description: "Strikes a Sundered enemy, dealing bonus flat physical damage equal to 150% of the target's maximum poise and knocking them back.",
    tags: ['attack', 'melee', 'physical'], color: '#e84a3a',
    manaCost: 10, cooldown: 8, useTime: 0.55,
    baseDamage: { physical: [20, 34] },
    targeting: { target: 'enemy', requiresStatus: 'sundered', castRange: 110 },
    poiseReap: { mult: 1.5 },
    delivery: { type: 'melee', range: 110, arcDeg: 60 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 40 },
    ],
    requirements: { strength: 20 },
    ai: { range: 105, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  severing_lash: {
    id: 'severing_lash', name: 'Severing Lash',
    description: "Cracks a long whip that has 30% increased accuracy, ignores 60% of the target's insight avoidance, and has a 50% chance to inflict Reeling, preventing insight recovery.",
    tags: ['attack', 'melee', 'physical'], color: '#c8a8e8',
    manaCost: 8, cooldown: 2.5, useTime: 0.45,
    baseDamage: { physical: [12, 20] },
    innateMods: [mod('insightPen', 'flat', 0.6), mod('accuracy', 'increased', 0.3)],
    delivery: { type: 'melee', range: 145, arcDeg: 40 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'reeling', chance: 0.5 },
    ],
    requirements: { dexterity: 16, strength: 10 },
    ai: { range: 140, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09), mod('insightPen', 'flat', 0.04)] },
  },

  null_lance: {
    id: 'null_lance', name: 'Null Lance',
    description: "Fires a void dart that deals chaos damage, deals double damage to energy shield, and has a 60% chance to inflict Voided, preventing energy shield recharge.",
    tags: ['spell', 'projectile', 'chaos'], color: '#9a8ae8',
    manaCost: 9, cooldown: 1.5, useTime: 0.5,
    baseDamage: { chaos: [10, 18] },
    innateMods: [mod('esShred', 'more', 1)],
    delivery: { type: 'projectile', speed: 420, radius: 7, range: 380 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'voided', chance: 0.6 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 340, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('apply_voided', 'flat', 0.04)] },
  },

  // --- The samurai kata: rhythm, timing, the one perfect draw ---------------
  // (Three rhythms, deliberately distinct: Thousand Cuts RAMPS ITSELF
  // (SelfStackSpec — the per-skill frenzy), Sheathed Moon charges ONE
  // stroke, Iai Strike reads a WINDOW. zanshin_cut's every-third-bleed
  // already covers the cycle rhythm — four fabrics, no overlaps.)

  thousand_cuts: {
    id: 'thousand_cuts', name: 'Thousand Cuts',
    description: "Strike in a rapid melee slash that grants 5% increased damage and 5% increased attack speed with this skill per hit, stacking up to 8 times and decaying after 2.2 seconds without attacking.",
    tags: ['attack', 'melee', 'physical'], color: '#e8d8c0',
    manaCost: 5, cooldown: 0, useTime: 0.42,
    baseDamage: { physical: [7, 12] },
    selfStack: {
      mods: [mod('damage', 'increased', 0.05), mod('attackSpeed', 'increased', 0.05)],
      maxStacks: 8, duration: 2.2, decay: 'peel',
    },
    delivery: { type: 'melee', range: 88, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16, prowess: 8 },
    ai: { range: 85, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09)] },
  },

  sheathed_moon: {
    id: 'sheathed_moon', name: 'Sheathed Moon',
    description: "Hold to charge a sheathed draw and release to unleash a wide crescent slash with a 40% chance to inflict bleed. Charging up to 2 seconds scales damage from 60% to 260% and widens the slash arc.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#d8e8f8',
    manaCost: 12, cooldown: 3, useTime: 0,
    castMode: 'charge',
    chargeUp: { maxTime: 2, minScale: 0.6, maxScale: 2.6, aoeScaleMax: 1.6 },
    baseDamage: { physical: [18, 30] },
    delivery: { type: 'melee', range: 120, arcDeg: 160 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.4, magnitude: 0.35 },
    ],
    requirements: { dexterity: 18, prowess: 12 },
    ai: { range: 110, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.05)] },
  },

  discipline: {
    id: 'discipline', name: 'Discipline',
    description: "Toggle aura that reserves 35 mana to grant you and nearby allies +40 maximum energy shield.",
    tags: ['spell', 'aura', 'buff'], color: '#5ad8d8',
    manaCost: 10, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: { radius: 180, allyMods: [mod('energyShield', 'flat', 40)] },
      upkeep: { reserveMana: 35 },
    },
    effects: [],
    requirements: { intelligence: 14, willpower: 14 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  frost_pulse: {
    id: 'frost_pulse', name: 'Frost Pulse',
    description: "Project a wide crescent wave of cold that pierces up to 6 enemies with a 60% chance to chill.",
    tags: ['spell', 'cold', 'projectile', 'aoe'], color: '#9adcf0',
    manaCost: 11, cooldown: 0, useTime: 0.7,
    baseDamage: { cold: [9, 14] },
    delivery: {
      type: 'projectile', speed: 300, radius: 26, range: 360,
      pierce: 6, shape: 'arc',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.6 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 330, weight: 3, keepDistance: 240 },
  },

  fire_siege: {
    id: 'fire_siege', name: 'Fire Siege',
    description: "Send a wide, slow-moving wave of flame forward that passes through all enemies and has a 16% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff8438',
    manaCost: 15, cooldown: 3, useTime: 0.85,
    baseDamage: { fire: [14, 22] },
    delivery: {
      type: 'projectile', speed: 200, radius: 30, range: 430,
      pierce: 99, shape: 'wave',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.45, magnitude: 0.3 },
    ],
    requirements: { intelligence: 20, strength: 12 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  shockfront: {
    tree: IMPACT_STARTER_TREES.shockfront,
    id: 'shockfront', name: 'Shockfront',
    description: "Launch a wide wall of force that pierces up to 3 enemies and knocks struck targets back.",
    tags: ['attack', 'physical', 'projectile', 'aoe'], color: '#c8b8e8',
    manaCost: 12, cooldown: 2, useTime: 0.75,
    baseDamage: { physical: [12, 19] },
    delivery: {
      type: 'projectile', speed: 380, radius: 32, range: 380,
      pierce: 3, shape: 'bar',
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 46 },
    ],
    requirements: { strength: 16, dexterity: 12 },
    ai: { range: 350, weight: 2, keepDistance: 220 },
  },

  bone_prison: {
    id: 'bone_prison', name: 'Bone Prison',
    description: "Raise a ring of 10 destructible bone wall segments around the target location for 6 seconds, trapping enemies inside.",
    tags: ['spell', 'summon', 'minion', 'physical', 'duration', 'totem'], color: '#d8d0b8',
    manaCost: 22, cooldown: 8, useTime: 0.8,
    // The wall never strikes ON CAST (nothing resolves hits at plant time) —
    // this roll + damage effect exist for CONSTRUCT-FX readers: Pulsing
    // Ramparts' beat and Violent Genesis' arrival scale off the host's roll
    // and resolve through the ordinary hit pipeline, and a roll of NOTHING
    // (or a damage-less effect list — resolveHit's hasDamage gate) made the
    // documented "cage that cooks" cook for zero. Per-segment, kept lean.
    baseDamage: { physical: [6, 10] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_bone_prison',
      ring: { segments: 10, radius: 78 },
      range: 0, duration: 6, maxActive: 10, life: 30, placeRange: 340,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 320, weight: 1, keepDistance: 260 },
  },

  bone_cage: {
    id: 'bone_cage', name: 'Bone Cage',
    description: "Raise a tight ring of 8 destructible bone wall segments around a single target for 4 seconds.",
    tags: ['spell', 'summon', 'minion', 'physical', 'duration', 'totem'], color: '#c8bca0',
    manaCost: 16, cooldown: 6, useTime: 0.6,
    targeting: { target: 'enemy', castRange: 320 },
    // Construct-fx fodder like bone_prison (roll + damage effect for the
    // grafted pulse/burst hit pipeline): tighter ring, meaner bars.
    baseDamage: { physical: [7, 12] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_bone_cage',
      ring: { segments: 8, radius: 50 },
      range: 0, duration: 4, maxActive: 8, life: 20, placeRange: 320,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 16 },
    ai: { range: 300, weight: 2, keepDistance: 240 },
  },

  mana_shield: {
    id: 'mana_shield', name: 'Mana Shield',
    description: "Toggle to redirect 40% of incoming damage to mana before life, draining 2 mana per second while active.",
    tags: ['spell', 'aura', 'buff'], color: '#4a78d8',
    manaCost: 8, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: { radius: 14, allyMods: [mod('manaShield', 'flat', 0.4)] },
      upkeep: { manaPerSec: 2 },
    },
    effects: [],
    requirements: { intelligence: 16 },
  },

  power_surge: {
    id: 'power_surge', name: 'Power Surge',
    description: "Gain +60 maximum and current energy shield for 8 seconds and immediately begin recharging energy shield.",
    tags: ['spell', 'buff', 'duration'], color: '#5ad8d8',
    manaCost: 20, cooldown: 10, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [
      { type: 'buff', id: 'power_surge', duration: 8, mods: [mod('energyShield', 'flat', 60)] },
      { type: 'restore', resource: 'es', amount: 60, resetEsDelay: true },
    ],
    requirements: { intelligence: 18 },
    leveling: { perLevel: [mod('energyShield', 'increased', 0.1)] },
  },

  aegis_ward: {
    tree: FRONTIER_STARTER_TREES.aegis_ward,
    id: 'aegis_ward', name: 'Aegis Ward',
    description: "Grants you and nearby allies a 45-point absorption shield and bonus armor for 8 seconds.",
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#d8e8f8',
    manaCost: 16, cooldown: 12, useTime: 0.6,
    delivery: { type: 'nova', radius: 200, affects: 'allies' },
    effects: [
      { type: 'absorb', amount: 45, duration: 8 },
      { type: 'status', status: 'warded', chance: 1 },
    ],
    requirements: { fortitude: 14, willpower: 6 },
    ai: { range: 220, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.06)] },
  },

  stone_rampart: {
    tree: BASTION_STARTER_TREES.stone_rampart,
    id: 'stone_rampart', name: 'Stone Rampart',
    description: "Raise a 3-segment destructible stone wall across your facing for 12 seconds (up to 6 segments active at once) that blocks movement and projectiles.",
    tags: ['spell', 'guard', 'duration', 'totem'], color: '#a8a090',
    manaCost: 18, cooldown: 8, useTime: 0.6,
    // Construct-fx fodder (see bone_prison — roll + damage effect for the
    // grafted hit pipeline): stone hits harder per segment, but only three.
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_stone_rampart',
      range: 0, duration: 12, maxActive: 6, life: 70,
      placeRange: 160, wallSegments: 3,
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 16, intelligence: 12 },
    ai: { range: 220, weight: 1 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.18)] },
  },

  sanctuary: {
    id: 'sanctuary', name: 'Sanctuary',
    description: "Conjure an indestructible protection dome for 6 seconds (up to 1 active at a time) that destroys incoming enemy projectiles.",
    tags: ['spell', 'guard', 'aoe', 'duration', 'totem'], color: '#9ad8c8',
    manaCost: 26, cooldown: 14, useTime: 0.7,
    delivery: {
      type: 'construct', kind: 'dome', look: 'device_sanctuary',
      range: 0, duration: 6, maxActive: 1,
      invulnerable: true, placeRange: 140,
      domeRadius: 120, domeMode: 'dissolve',
    },
    effects: [],
    requirements: { intelligence: 20, willpower: 14 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.07), mod('effectDuration', 'increased', 0.08)] },
  },

  // ======================= War-band tech ====================================
  // New primitives introduced by the enemy archetypes — and like everything
  // in the catalog, fully unlockable by the player.

  crushing_leap: {
    id: 'crushing_leap', name: 'Crushing Leap',
    description: "Leap through the air over obstacles and chasms, landing in a physical shockwave that knocks nearby enemies back with a 25% chance to stun.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'movement'], color: '#d8a050',
    manaCost: 12, cooldown: 5, useTime: 0,
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'leap', range: 320, airTime: 0.55, radius: 110 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 42 },
      { type: 'status', status: 'stun', chance: 0.25 },
    ],
    requirements: { strength: 24 },
    ai: { range: 300, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('aoeRadius', 'increased', 0.05)] },
  },

  // Carrion tech: burst into the air — airborne = UNTARGETABLE, the leap
  // delivery's standing rule — drift, and land in a raking sweep. Data-only
  // flight; the vulture's brain RULES aim it (harass in, flee away).
  take_wing: {
    id: 'take_wing', name: 'Take Wing',
    description: "Leap into the air untargetably and land with a sweeping physical slash.",
    tags: ['attack', 'physical', 'movement'], color: '#c8b090',
    manaCost: 0, cooldown: 4, useTime: 0,
    baseDamage: { physical: [4, 8] },
    delivery: { type: 'leap', range: 460, airTime: 1.35, radius: 70 },
    effects: [{ type: 'damage' }],
    noDrop: true,
    ai: { range: 420, weight: 1 },
  },

  backstab: {
    tree: STARTER_SKILL_TREES.backstab,
    id: 'backstab', name: 'Backstab', icon: 'knife',
    description: "Thrust at close range, dealing 150% more damage when striking from behind the target with a 35% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical'], color: '#b8a8e8',
    manaCost: 8, cooldown: 1.2, useTime: 0.5,
    baseDamage: { physical: [11, 17] },
    backstabMult: 2.5,
    delivery: { type: 'melee', range: 42, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 0.4 },
    ],
    requirements: { dexterity: 16 },
    ai: { range: 52, weight: 3 },
  },

  rallying_howl: {
    tree: FRONTIER_STARTER_TREES.rallying_howl,
    id: 'rallying_howl', name: 'Rallying Howl',
    description: "Grants you and nearby allies (including minions) 25% increased damage and 15% increased movement speed for 6 seconds.",
    tags: ['warcry', 'buff', 'aoe', 'duration'], color: '#e8a040',
    manaCost: 10, cooldown: 9, useTime: 0.5,
    delivery: { type: 'nova', radius: 220, affects: 'allies' },
    effects: [{ type: 'status', status: 'rally', chance: 1 }],
    requirements: { strength: 10, fortitude: 12 },
    ai: { range: 240, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('aoeRadius', 'increased', 0.06)] },
  },

  acid_spray: {
    id: 'acid_spray', name: 'Acid Spray',
    description: "Spray a cone of caustic acid that deals chaos damage with a 60% chance to poison and a 25% chance to corrode armor.",
    tags: ['attack', 'chaos', 'aoe'], color: '#9ec83a',
    manaCost: 9, cooldown: 2, useTime: 0.6,
    baseDamage: { chaos: [7, 12] },
    delivery: { type: 'cone', range: 150, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.6, magnitude: 0.35 },
      { type: 'status', status: 'agony', chance: 0.25 },
    ],
    requirements: { dexterity: 14, intelligence: 12 },
    ai: { range: 140, weight: 2 },
  },

  // ======================= The Lightning archetype ==========================
  // Speed, chains, current-life shocks, and storms that grow.

  ball_lightning: {
    id: 'ball_lightning', name: 'Ball Lightning',
    description: "Launch a slow-moving lightning orb that zaps nearby enemies every 0.35 seconds for 55% of its base damage, with a 30% chance to shock.",
    tags: ['spell', 'lightning', 'projectile', 'aoe', 'duration'], color: '#ffe14a',
    manaCost: 18, cooldown: 4, useTime: 0.8,
    baseDamage: { lightning: [6, 16] },
    delivery: {
      type: 'projectile', speed: 110, radius: 12, range: 380,
      rehit: 999, shape: 'octagon',
      zap: { interval: 0.35, radius: 95, damageScale: 0.55 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 360, weight: 2, keepDistance: 260 },
  },

  lightning_bolt: {
    id: 'lightning_bolt', name: 'Lightning',
    description: "Fires a piercing lance of lightning through up to 2 enemies with a 40% chance to shock. Press again within the timing window to fire an empowered, instant bolt with extended range.",
    tags: ['spell', 'lightning', 'projectile'], color: '#fff06a',
    manaCost: 12, cooldown: 1.5, useTime: 0.9,
    castMode: 'perfect',
    baseDamage: { lightning: [8, 30] },
    delivery: { type: 'projectile', speed: 900, radius: 7, range: 620, pierce: 2, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.4 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 560, weight: 3, keepDistance: 340 },
  },

  chain_lightning: {
    tree: STARTER_SKILL_TREES.chain_lightning,
    id: 'chain_lightning', name: 'Chain Lightning', icon: 'chain',
    description: "Fire a lightning bolt that chains up to 3 times to nearby enemies, with a 30% chance to shock each target hit.",
    tags: ['spell', 'lightning', 'projectile'], color: '#f4e84a',
    manaCost: 14, cooldown: 0, useTime: 0.7,
    baseDamage: { lightning: [7, 20] },
    innateMods: [mod('chainCount', 'flat', 3)],
    delivery: { type: 'projectile', speed: 640, radius: 7, range: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 400, weight: 3, keepDistance: 280 },
  },

  static_shock: {
    id: 'static_shock', name: 'Static Shock',
    description: "Deals lightning damage equal to 12% of the target's current life (mitigated by resistances, and cannot reduce the target below 1 life) with a 50% chance to shock.",
    tags: ['spell', 'lightning', 'targeted', 'instant'], color: '#ffe96a',
    manaCost: 10, cooldown: 2.5, useTime: 0,
    currentLifeDamage: 0.12,
    targeting: { target: 'enemy', castRange: 380 },
    delivery: { type: 'target' },
    effects: [
      { type: 'status', status: 'shock', chance: 0.5 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 360, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  surge: {
    id: 'surge', name: 'Surge',
    description: "Dash forward as a bolt of lightning, damaging and having a 50% chance to shock all enemies along your path.",
    tags: ['spell', 'lightning', 'movement', 'instant'], color: '#f8ec5a',
    manaCost: 12, cooldown: 4, useTime: 0,
    baseDamage: { lightning: [10, 24] },
    delivery: { type: 'dash', distance: 300, speed: 1400, width: 56 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.5 },
    ],
    requirements: { intelligence: 16, dexterity: 12 },
  },

  tempest: {
    id: 'tempest', name: 'Tempest',
    description: "Call down a lightning storm around yourself for 2.5 seconds that pulses every 0.3 seconds, slightly pushing enemies back with a 25% chance to shock.",
    tags: ['spell', 'lightning', 'aoe', 'duration'], color: '#e8e05a',
    manaCost: 20, cooldown: 8, useTime: 0.5,
    baseDamage: { lightning: [5, 12] },
    delivery: {
      type: 'ground', radius: 120, castRange: 0,
      lingerDuration: 2.5, tickInterval: 0.3,
    },
    effects: [
      { type: 'damage' },
      // Small repeated impulses under the physics push: enemies get knocked
      // BACK within the storm, staggering, instead of one-shot ejected.
      { type: 'knockback', strength: 22 },
      { type: 'status', status: 'shock', chance: 0.25 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 110, weight: 2 },
  },

  gale: {
    id: 'gale', name: 'Gale',
    description: "Conjure a windstorm over the target area for 5 seconds that pulses every 0.5 seconds, dealing light physical damage and pushing enemies in random directions.",
    tags: ['spell', 'aoe', 'duration'], color: '#b8d8c8',
    manaCost: 20, cooldown: 8, useTime: 0.7,
    baseDamage: { physical: [2, 4] },
    delivery: {
      type: 'ground', radius: 240, castRange: 420,
      lingerDuration: 5, tickInterval: 0.5,
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70, mode: 'buffet' },
    ],
    requirements: { intelligence: 18, dexterity: 10 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  // ======================= Gravity & pull ====================================
  // Suction, repulsion, and the yank: zones with a grip wider than their
  // bite (pullRadius), channels whose PRICE compounds (costRamp), and the
  // pull effect riding the impulse physics.

  event_horizon: {
    id: 'event_horizon', name: 'Event Horizon',
    description: "Channel while stationary to sustain a singularity at the target location that pulls nearby enemies inward and deals chaos damage at its core. Damage, radius, and mana cost ramp up the longer you channel; enters cooldown when channeling ends.",
    tags: ['spell', 'chaos', 'aoe', 'channel', 'duration'], color: '#7a5ad0',
    manaCost: 6, cooldown: 6, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.25, move: 'immobile', trackAim: false,
      // The hole GROWS and BITES harder as it feeds (trackAim:false pins
      // the pulses to the cast point — a black hole does not move).
      ramp: { per: 0.1, max: 1, curve: 'quadratic' },
      rampAoe: { per: 0.12, max: 1.2, curve: 'quadratic' },
      costRamp: { per: 0.35, max: 6, curve: 'exponential' },
      cooldownOnEnd: true,
    },
    baseDamage: { chaos: [9, 14] },
    delivery: {
      type: 'ground', radius: 55, castRange: 340,
      lingerDuration: 0.45, tickInterval: 0.22,
      pull: 240, pullRadius: 230,
    },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 26, willpower: 10 },
    ai: { range: 320, weight: 2, keepDistance: 260 },
  },

  repulsor_beacon: {
    id: 'repulsor_beacon', name: 'Repulsor Beacon',
    description: "Place an indestructible beacon for 6 seconds (up to 2 active at once) that emits a lightning ring every 0.6 seconds, knocking nearby enemies back.",
    // 'totem' = the deployed-object umbrella tag (totem supports apply).
    tags: ['spell', 'lightning', 'aoe', 'duration', 'totem'], color: '#8ad0e0',
    manaCost: 18, cooldown: 7, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'pylon', look: 'device_repulsor_beacon', castSkillId: 'repulse_wave',
      range: 180, duration: 6, maxActive: 2, invulnerable: true,
      placeRange: 380, interval: 0.6,
    },
    effects: [],
    requirements: { intelligence: 20 },
    ai: { range: 340, weight: 1, keepDistance: 240 },
  },

  // The beacon's shove (and a fine trigger payload for anything else).
  repulse_wave: {
    id: 'repulse_wave', name: 'Repulse Wave', noDrop: true,
    description: "Emit a concussive ring of lightning from the beacon that knocks nearby enemies back.",
    tags: ['spell', 'lightning', 'aoe'], color: '#9ad8e8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { lightning: [3, 6] },
    delivery: { type: 'nova', radius: 180 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 55 },
    ],
  },

  chain_pull: {
    tree: PRECISION_STARTER_TREES.chain_pull,
    id: 'chain_pull', name: 'Chain Pull',
    description: "Throw a barbed chain that deals physical damage, stuns the target, and pulls them to your feet while leaving them dazed for 1.4 seconds.",
    tags: ['attack', 'projectile', 'melee', 'physical'], color: '#d8b048',
    manaCost: 10, cooldown: 5, useTime: 0.4,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'projectile', speed: 900, radius: 6, range: 420, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 1 },
      { type: 'pull', stun: 1.4 },
    ],
    requirements: { strength: 12, prowess: 10 },
    ai: { range: 380, weight: 2 },
  },

  pestilent_nova: {
    id: 'pestilent_nova', name: 'Pestilent Nova',
    description: "Channel while moving at 50% speed to fire pairs of chaos bolts in random directions around you, each with a 40% chance to inflict poison.",
    tags: ['spell', 'chaos', 'projectile', 'channel'], color: '#8ec850',
    manaCost: 5, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.14, move: 'slowed', moveFactor: 0.5, trackAim: false },
    aim: { random: { spreadDeg: 360 } },
    baseDamage: { chaos: [5, 8] },
    delivery: { type: 'projectile', speed: 300, radius: 7, range: 320, count: 2, spreadDeg: 24 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { intelligence: 20, willpower: 10 },
    ai: { range: 280, weight: 2 },
  },

  // ======================= Damage pools & consumes ===========================
  // Banks fed by the damage you deal, spent as vents and bursts
  // (DamagePoolSpec) — plus the debuff-gated consume (targeting +
  // requiresStatus list + durationOverride).

  venomous_aura: {
    id: 'venomous_aura', name: 'Venomous Aura',
    description: "Passively stores 100% of poison damage and 35% of hit chaos damage you deal in a venom reservoir. Toggle on to drain the reservoir as chaos damage per second around you until empty or toggled off.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#8ec850',
    manaCost: 12, cooldown: 0.5, useTime: 0,
    pool: {
      id: 'venom', cap: 420, damageType: 'chaos', min: 20,
      // Poison payloads feed 1:1; raw chaos hits at a trickle — the ratios
      // ARE the knobs.
      fromDot: { poison: 1 }, fromDamage: { chaos: 0.35 },
      release: { mode: 'vent', dps: 55, radius: 170 },
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { intelligence: 18, willpower: 12 },
  },

  detonation: {
    id: 'detonation', name: 'Detonation',
    description: "Passively stores 100% of burn damage and 25% of hit fire damage you deal. Activate to expend the stored charge in a single fire nova around you.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff6a2a',
    manaCost: 14, cooldown: 4, useTime: 0.5,
    pool: {
      id: 'pyre', cap: 500, damageType: 'fire', min: 40,
      fromDot: { burn: 1 }, fromDamage: { fire: 0.25 },
      release: { mode: 'burst', radius: 190 },
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { intelligence: 22 },
  },

  flash_freeze: {
    id: 'flash_freeze', name: 'Flash Freeze',
    description: "Requires a chilled or frozen target in range. Consumes their chill or freeze to trigger a cold burst around them and freeze the target for 2 seconds.",
    tags: ['spell', 'cold', 'aoe', 'targeted'], color: '#bce8f8',
    manaCost: 14, cooldown: 5, useTime: 0.4,
    baseDamage: { cold: [16, 26] },
    targeting: {
      target: 'enemy', requiresStatus: ['chill', 'frozen'], consumesStatus: true,
      castRange: 420,
    },
    delivery: { type: 'target', splash: 140 },
    effects: [
      { type: 'damage' },
      // The re-freeze is a FIXED clock: 2.0s, unscaled by effectDuration.
      { type: 'status', status: 'frozen', chance: 1, durationOverride: 2 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  // ======================= The slam family ==================================
  // Ground cascades: placements that RIPPLE — skipped-stone shockwaves,
  // marching fissures, traveling upchurns. See GroundCascadeSpec.

  sunder: {
    id: 'sunder', name: 'Sunder',
    description: "Slam the ground to project 3 sequential shockwaves forward, each 15% smaller and dealing 15% less physical damage than the previous one, knocking enemies back with a 15% chance to stun.",
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#c89a5e',
    manaCost: 12, cooldown: 3, useTime: 0.7,
    baseDamage: { physical: [18, 28] },
    delivery: {
      type: 'ground', radius: 90, castRange: 60, delay: 0.1,
      cascade: { count: 3, dir: 'forward', step: 110, scaleStep: 0.85, dmgStep: 0.85, interval: 0.12 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 30 },
      { type: 'status', status: 'stun', chance: 0.15 },
    ],
    requirements: { strength: 18 },
    ai: { range: 120, weight: 2 },
  },

  tolling_ruin: {
    id: 'tolling_ruin', name: 'Tolling Ruin',
    description: "Slam the ground to project 4 sequential shockwaves forward at 0.5-second intervals, each dealing 12% more damage than the last and knocking enemies back with an 18% chance to stun.",
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#d0a468',
    manaCost: 14, cooldown: 4, useTime: 0.7,
    baseDamage: { physical: [16, 25] },
    delivery: {
      type: 'ground', radius: 90, castRange: 60, delay: 0.1,
      // Sunder's grammar at a funeral tempo: the SAME cascade spec with the
      // interval knob turned from ripple (0.12s) to TOLL (0.5s) — every
      // shock a readable, dodgeable telegraph that grows for the wait.
      cascade: { count: 4, dir: 'forward', step: 115, scaleStep: 1.0, dmgStep: 1.12, interval: 0.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 32 },
      { type: 'status', status: 'stun', chance: 0.18 },
    ],
    requirements: { strength: 20 },
    ai: { range: 120, weight: 2 },
  },

  earthquake: {
    tree: IMPACT_STARTER_TREES.earthquake,
    id: 'earthquake', name: 'Earthquake',
    description: "Slam the ground at your feet for physical damage with a 12% chance to stun, followed 1 second later by an aftershock in a 25% larger radius for 240% damage.",
    tags: ['attack', 'melee', 'aoe', 'physical', 'pulse'], color: '#b89058',
    manaCost: 12, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [12, 19] },
    delivery: {
      type: 'ground', radius: 110, castRange: 40,
      // The slam family's dormant year: minor opening hit, then the TRUE
      // quake one second later at 2.4× across a wider ring (GroundPulseSpec
      // — Aftershocks scatters the pulse, Unsettled Earth adds beats).
      pulse: { delay: 1.0, dmgMult: 2.4, radiusMult: 1.25 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 22 },
      { type: 'status', status: 'stun', chance: 0.12 },
    ],
    requirements: { strength: 20 },
    ai: { range: 110, weight: 2 },
  },

  epicenter: {
    id: 'epicenter', name: 'Epicenter',
    description: "Crack the ground at range for a warning tremor, followed by 2 detonations at 0.9-second intervals that each deal 180% of the tremor's damage in a wider radius with a 10% chance to stun.",
    tags: ['spell', 'physical', 'aoe', 'pulse'], color: '#c8a070',
    manaCost: 18, cooldown: 6, useTime: 0.7,
    baseDamage: { physical: [10, 16] },
    delivery: {
      type: 'ground', radius: 100, castRange: 420, delay: 0.15,
      // Earthquake's ranged cousin: two pulses on a 0.9s beat, each 1.8×
      // the warning tremor — remote artillery you must LEAD, not land.
      pulse: { delay: 0.9, count: 2, interval: 0.9, dmgMult: 1.8, radiusMult: 1.15 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.1 },
    ],
    requirements: { strength: 14, intelligence: 14 },
    ai: { range: 380, weight: 2, keepDistance: 220 },
  },

  skipping_stone: {
    id: 'skipping_stone', name: 'Skipping Stone',
    description: "Project 6 sequential physical shockwaves forward at progressively shorter intervals, each slightly smaller and weaker than the last, knocking enemies back with a 12% chance to stun.",
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#c2a26a',
    manaCost: 13, cooldown: 3.5, useTime: 0.7,
    baseDamage: { physical: [17, 27] },
    delivery: {
      type: 'ground', radius: 88, castRange: 60, delay: 0.1,
      // The bouncing ball as data: each gap × 0.6 (0.55s, 0.33, 0.20,
      // 0.12, 0.07) while the skips shed size and force — kinetic honesty.
      cascade: { count: 6, dir: 'forward', step: 95, scaleStep: 0.88, dmgStep: 0.82, interval: 0.55, intervalStep: 0.6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 26 },
      { type: 'status', status: 'stun', chance: 0.12 },
    ],
    requirements: { strength: 19 },
    ai: { range: 120, weight: 2 },
  },

  crumble: {
    id: 'crumble', name: 'Crumble',
    description: "Cause the target ground to collapse 5 times at progressively shorter intervals, with each impact dealing physical damage in a shrinking area and having a 10% chance to stun.",
    tags: ['spell', 'physical', 'aoe', 'duration', 'pulse'], color: '#a89478',
    manaCost: 17, cooldown: 7, useTime: 0.7,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'ground', radius: 115, castRange: 400, delay: 0.15,
      // The inverse ball, dropped from height: the first fall waits 1.5s,
      // then every gap × 0.55 while each collapse softens (dmgStep) and
      // tightens (radiusStep) — big slow dread into fast small gravel.
      pulse: { delay: 1.5, count: 5, interval: 1.1, intervalStep: 0.55, dmgMult: 1.7, dmgStep: 0.8, radiusMult: 1.1, radiusStep: 0.88 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.1 },
    ],
    requirements: { strength: 12, intelligence: 16 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  // ======================= The carillon ====================================
  // Resonance as violence: bells whose CADENCE is the identity — the
  // intervalStep knob worn openly. Accelerando gathers into a crescendo,
  // ritardando spaces into verdicts; the Cadence gems (Accelerando /
  // Ritardando) retune anything else with a beat.

  carillon: {
    id: 'carillon', name: 'Carillon',
    description: "Strike a spectral bell over the target area that tolls 6 times at accelerating intervals, each toll dealing 8% more damage with a 10% chance to stun, finishing with a wide burst for 220% damage.",
    tags: ['spell', 'physical', 'aoe', 'duration', 'pulse'], color: '#e0c878',
    manaCost: 18, cooldown: 8, useTime: 0.7,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'ground', radius: 105, castRange: 380, delay: 0.2,
      // Accelerando: gaps × 0.72 per toll, each ringing ×1.08 harder — and
      // the linger's dying breath IS the crescendo (endBurst fires as the
      // pulse-imposed surface expires, right after the last toll).
      pulse: { delay: 1.2, count: 6, interval: 1.0, intervalStep: 0.72, dmgMult: 0.9, dmgStep: 1.08 },
      endBurst: { damageScale: 2.2, radiusScale: 1.3 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.1 },
    ],
    requirements: { intelligence: 18, willpower: 12 },
    ai: { range: 350, weight: 2, keepDistance: 240 },
  },

  rising_knell: {
    id: 'rising_knell', name: 'Rising Knell',
    description: "Strike a spectral bell 6 times at decelerating intervals, with each toll dealing 28% more damage in a slightly wider area and having a 12% chance to stun.",
    tags: ['spell', 'physical', 'aoe', 'duration', 'pulse'], color: '#d8b868',
    manaCost: 16, cooldown: 7, useTime: 0.65,
    baseDamage: { physical: [8, 12] },
    delivery: {
      type: 'ground', radius: 95, castRange: 380, delay: 0.15,
      pulse: { delay: 0.35, count: 6, interval: 0.35, intervalStep: 1.5, dmgMult: 0.8, dmgStep: 1.28, radiusStep: 1.05 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.12 },
    ],
    requirements: { intelligence: 16, willpower: 12 },
    ai: { range: 350, weight: 2, keepDistance: 220 },
  },

  // ======================= The vents =======================================
  // Ground that PROJECTS: lingering placements firing true projectiles —
  // the Netherfissure spirit-recipe (cursor-origin payloads + bearing)
  // promoted to a family seat. The emitter cadence rides intervalStep.
  // (Volcano proper — the charge-raised magma totem — lives with the fire
  // kit; the Fumarole is its patient little sibling.)

  fumarole: {
    id: 'fumarole', name: 'Fumarole',
    description: "Open a volcanic vent for 7 seconds that burns enemies standing on it (12% chance to ignite) and lobs molten globs outward that burst for fire damage on impact.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff6a3a',
    manaCost: 19, cooldown: 9, useTime: 0.8,
    baseDamage: { fire: [6, 10] },
    delivery: {
      type: 'ground', radius: 70, castRange: 360, delay: 0.3,
      lingerDuration: 7, tickInterval: 0.7,
      // The eruption: globs rise at random points in the cone and fire
      // OUTWARD (bearing 'out' + the payload's cursor origin), on a
      // SETTLING cadence — 0.3s beats stretching ×1.16 per glob as the
      // chamber empties (emit.intervalStep; Accelerando re-agitates it).
      emit: { skillId: 'lava_glob', interval: 0.3, intervalStep: 1.16, at: 'point', bearing: 'out' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.35 },
    ],
    requirements: { intelligence: 20, willpower: 12 },
    ai: { range: 330, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  lava_glob: {
    id: 'lava_glob', name: 'Lava Glob', noDrop: true,
    description: "Lob a glob of molten stone that bursts for fire damage on impact with a 14% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff8a4a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [9, 15] },
    delivery: {
      // Rises AT the vent (cursor origin), lobs outward bleeding speed
      // (accel < 0), and BURSTS where it dies — impact or apogee alike.
      type: 'projectile', speed: 340, radius: 9, range: 230,
      origin: 'cursor', originRange: 9999,
      trajectory: { accel: -0.55 },
      explode: { radius: 68, damageScale: 1 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.35 },
    ],
  },

  upheaval: {
    id: 'upheaval', name: 'Upheaval',
    description: "Send a slow wave of broken earth rolling forward for 2.8 seconds that grows larger as it travels, damaging and knocking back enemies in its path.",
    tags: ['attack', 'melee', 'aoe', 'physical', 'duration'], color: '#b0885a',
    manaCost: 16, cooldown: 6, useTime: 0.8,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'ground', radius: 55, castRange: 60,
      lingerDuration: 2.8, tickInterval: 0.4,
      drift: 130, grow: 40,
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 26 },
    ],
    requirements: { strength: 20 },
    ai: { range: 140, weight: 2 },
  },

  // ======================= Projectile & melee variants =====================

  powderkeg_arrow: {
    id: 'powderkeg_arrow', name: 'Powderkeg Arrow',
    description: "Fires an arrow that lodges a timed Powder Charge in the target. Subsequent hits from Powderkeg Arrow add to the charge before it detonates for area fire damage.",
    tags: ['attack', 'projectile', 'physical', 'fire'], color: '#e8a24a',
    manaCost: 7, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [5, 8], fire: [3, 5] },
    // The armed-status artery: curseRupture bakes each hit's roll into the
    // riding keg; applications ADD on the FIXED fuse (pump economy).
    innateMods: [mod('curseRupture', 'flat', 1.8)],
    delivery: { type: 'projectile', speed: 560, radius: 6, range: 520, pierce: 0 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'powder_charge', chance: 1 },
    ],
    requirements: { dexterity: 18, intelligence: 10 },
    ai: { range: 480, weight: 2, keepDistance: 300 },
  },

  orbital_blades: {
    id: 'orbital_blades', name: 'Orbital Blades',
    description: "Conjure a spinning blade that orbits you, hitting enemies in its path up to once every 0.9 seconds. Recast to add up to 3 orbiting blades.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#c8d0e0',
    manaCost: 12, cooldown: 2, useTime: 0.5,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'projectile', speed: 250, radius: 10, range: 2600,
      shape: 'line', rehit: 0.9,
      trajectory: { orbit: 1, orbitRadius: 85 },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16, intelligence: 10 },
    ai: { range: 120, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.05)] },
  },

  // --- The impale economy (the PoE homage, single-pop form) -----------------
  // impalePower banks a fraction of each hit's PHYSICAL roll as a lodged
  // spear (the 'impaled' status); the NEXT top-level hit discharges the
  // whole bank as its own separate mitigated blow. Skewer carries it
  // innately, Skewering Blows grafts it onto any attack, and Extraction
  // wrenches every lodged spear home — pops and all.

  skewer: {
    tree: IMPACT_STARTER_TREES.skewer,
    id: 'skewer', name: 'Skewer',
    description: "Thrust forward in melee, impaling the target for 35% of the physical damage dealt so that the next hit against them triggers that stored damage.",
    tags: ['attack', 'melee', 'physical'], color: '#c8ccd8',
    manaCost: 6, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [12, 18] },
    innateMods: [mod('impalePower', 'flat', 0.35)],
    delivery: { type: 'melee', range: 100, arcDeg: 40 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 14, dexterity: 12 },
    ai: { range: 95, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09)] },
  },

  spear_recall: {
    tree: IMPACT_STARTER_TREES.spear_recall,
    id: 'spear_recall', name: 'Extraction',
    description: "Rip all impaled spears from nearby enemies, dealing 120% of their stored impale damage to each host and recalling the spears to your hand, piercing enemies along the return path for 50% of the stored damage.",
    tags: ['attack', 'physical', 'aoe', 'instant'], color: '#aab4c8',
    manaCost: 10, cooldown: 5, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'recallImpales', radius: 460, damageScale: 1.2, spearShare: 0.5 }],
    requirements: { strength: 14, dexterity: 14 },
    ai: { range: 300, weight: 2 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  // Extraction's homeward shaft (flat-loaded with the wrenched bank).
  impale_spear: {
    id: 'impale_spear', name: 'Wrenched Spear', noDrop: true,
    description: "Recall a lodged spear to its thrower, piercing all enemies along its return path with a 25% chance to inflict Bleed.",
    tags: ['attack', 'projectile', 'physical'], color: '#c8ccd8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'projectile', speed: 640, radius: 8, range: 760, pierce: 99 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.3 },
    ],
  },

  pinning_spear: {
    tree: IMPACT_STARTER_TREES.pinning_spear,
    id: 'pinning_spear', name: 'Pinning Spear',
    description: "Hurl a spear that pierces 1 enemy and plants in the ground for 10 seconds, with a 30% chance on hit to inflict Bleed.",
    tags: ['attack', 'projectile', 'physical', 'trap', 'duration'], color: '#c8b890',
    manaCost: 8, cooldown: 1.2, useTime: 0.6,
    baseDamage: { physical: [10, 15] },
    delivery: {
      type: 'projectile', speed: 620, radius: 7, range: 460, pierce: 1,
      plantOnLand: { duration: 10, life: 30, look: 'object_pinning_spear' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { dexterity: 18, strength: 10 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
  },

  groundswell: {
    id: 'groundswell', name: 'Groundswell',
    description: "Crack the ground ahead to project 3 sequential shockwaves forward, each 25% wider and dealing 20% more damage than the last while knocking enemies back.",
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#b0a06a',
    manaCost: 12, cooldown: 3, useTime: 0.7,
    baseDamage: { physical: [10, 15] },
    delivery: {
      type: 'ground', radius: 55, castRange: 60, delay: 0.1,
      cascade: { count: 3, dir: 'forward', step: 105, scaleStep: 1.25, dmgStep: 1.2, interval: 0.12 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 26 },
    ],
    requirements: { strength: 18 },
    ai: { range: 120, weight: 2 },
  },

  scythe_sweep: {
    id: 'scythe_sweep', name: 'Mower\'s Arc',
    description: "Swing 3 rapid scythe arcs across your left, center, and right flanks, each hit having a 25% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#9ab86a',
    manaCost: 8, cooldown: 1.5, useTime: 0.55,
    aim: { sequence: { steps: [-70, 0, 70], pause: 0.09 } },
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'melee', range: 95, arcDeg: 85 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { strength: 14, dexterity: 12 },
    ai: { range: 90, weight: 2 },
  },

  summon_blade_wraith: {
    id: 'summon_blade_wraith', name: 'Summon Blade Wraith',
    description: "Summon a blade wraith (up to 4 active at once) that sweeps enemies at close range and begins decaying at an accelerating rate after 4 seconds.",
    tags: ['spell', 'summon', 'minion', 'chaos', 'physical'], color: '#9a7ac8',
    manaCost: 22, cooldown: 0, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'blade_wraith',
      count: 1, maxActive: 4,
      decay: { delay: 4, frac: 0.04, growth: 1.35 },
    },
    effects: [],
    requirements: { intelligence: 18, strength: 10 },
    ai: { range: 420, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('minionLife', 'increased', 0.1)] },
  },

  rolling_cannonade: {
    id: 'rolling_cannonade', name: 'Rolling Cannonade',
    description: "Fire a salvo of 2 explosive fire shells with an 11% chance to ignite. Pressing the skill key repeatedly while the barrel cycles queues additional salvos.",
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff7a38',
    manaCost: 14, cooldown: 5, useTime: 1.3,
    castMode: 'multitude',
    baseDamage: { fire: [7, 11] },
    delivery: {
      type: 'projectile', speed: 440, radius: 8, range: 420,
      count: 2, fire: 'salvo', salvoInterval: 0.12,
      explode: { radius: 50, damageScale: 0.6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  // The twinmaw ettin's heads (anatomy gamut): BREATH, not rifts — the kit
  // pass had wired 'spew_flame'/'spew_rime' here by name, but those are the
  // fire-rift's SPAWNER verbs ("the rift spits burning things"): an ogre
  // head summoning cultists out of its mouth, where the def's own record
  // reads "the ember head breathes fire, the rime head frost". Face verbs:
  // short cones, no keepDistance (a mounted head fights at the range its
  // body picks — the plant-and-fire law), clocks offset so the two heads
  // alternate and a flanked hero never eats both in one swallow.
  ember_breath: {
    id: 'ember_breath', name: 'Ember Breath', noDrop: true,
    description: "Exhale a rolling cone of flame that deals fire damage with an 18% chance to ignite.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff8a3a',
    manaCost: 9, cooldown: 3.2, useTime: 0.9,
    baseDamage: { fire: [9, 14] },
    delivery: { type: 'cone', range: 160, arcDeg: 60 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.35 },
    ],
    ai: { range: 150, weight: 2 },
  },
  rime_breath: {
    id: 'rime_breath', name: 'Rime Breath', noDrop: true,
    description: "Exhale a cone of freezing breath that deals cold damage with a 70% chance to chill.",
    tags: ['spell', 'cold', 'aoe'], color: '#8ac8e8',
    manaCost: 9, cooldown: 3.8, useTime: 1.0,
    baseDamage: { cold: [8, 12] },
    delivery: { type: 'cone', range: 160, arcDeg: 60 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.7 },
    ],
    ai: { range: 150, weight: 2 },
  },

  // --- THE RESERVE FABRIC's debut kit (engine/reserves.ts) -----------------
  // The bellows' economy in three skills: a gout that costs real breath, the
  // vent it must pay when the bladders run flat, and nothing else. Note what
  // is NOT here — no cooldown doing the pacing work. The gout's clock IS the
  // reserve (cooldown 0.9 is only a double-tap guard), which is the whole
  // point: the limit is a thing the player can see, bait and starve, not a
  // number ticking behind the body.

  /** THE GOUT — priced at one lung. A bellows carries three. */
  fume_gout: {
    id: 'fume_gout', name: 'Fume Gout', noDrop: true,
    description: "Expel a cone of toxic gas from up to 3 stored charges, dealing chaos damage with a 50% chance to poison.",
    tags: ['spell', 'chaos', 'aoe'], color: '#a8c85a',
    manaCost: 0, cooldown: 0.9, useTime: 0.85,
    baseDamage: { chaos: [10, 16] },
    delivery: { type: 'cone', range: 175, arcDeg: 54 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.5, magnitude: 0.4 },
    ],
    ai: { range: 165, weight: 3 },
  },
  /** THE VENT — what an emptied body pays, and the reason closing on one is
   *  a DECISION rather than a formality: the window is real, but it opens
   *  inside the last of its own lungs. Rush the fume or wait it out. */
  fume_vent: {
    id: 'fume_vent', name: 'Vent', noDrop: true,
    description: "Inhale to replenish gas charges while venting a cloud of chaos damage around your feet for 2.6 seconds with a 30% chance to poison.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#8aa84a',
    manaCost: 0, cooldown: 0, useTime: 0.1,
    baseDamage: { chaos: [5, 8] },
    delivery: {
      type: 'ground', radius: 74, castRange: 0,
      lingerDuration: 2.6, tickInterval: 0.55,
      noImpact: true,
      sizeOver: { from: 0.5, to: 1, curve: 'quadOut' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.3, magnitude: 0.3 },
    ],
  },
  /** THE LEAK — the sapbleeder's wake payload (MonsterDef.wake sheds it by
   *  distance travelled, and the same travel is what drains the reserve, so
   *  the trail on the floor is a HONEST readout of what the flight cost).
   *  Follow it to the body; the body is at the end of it, dry. */
  sap_trail: {
    id: 'sap_trail', name: 'Sap Trail', noDrop: true,
    description: "Leaves a trail of sticky sap that shrinks over 6.5 seconds, dealing physical damage over time with a 55% chance to inflict Mired.",
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#d8a850',
    manaCost: 0, cooldown: 0, useTime: 0.1,
    baseDamage: { physical: [2, 4] },
    delivery: {
      type: 'ground', radius: 26, castRange: 90,
      lingerDuration: 6.5, tickInterval: 0.7,
      noImpact: true,
      sizeOver: { from: 1, to: 0.4, curve: 'quadIn' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'mired', chance: 0.55 },
    ],
  },

  time_dilation: {
    tree: CONTROL_STARTER_TREES.time_dilation,
    id: 'time_dilation', name: 'Time Dilation',
    description: "Reduce the remaining cooldowns of all your other skills by 2 seconds plus 25% of their remaining duration.",
    tags: ['spell', 'buff', 'instant'], color: '#8ae0e8',
    manaCost: 18, cooldown: 16, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'reduceCooldowns', seconds: 2, fraction: 0.25 }],
    requirements: { willpower: 14, intelligence: 12 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.06)] },
  },

  // ======================= The debuff economy ==============================
  // Vulnerability applied and CONSUMED (#20), Doom's culling counter (#25),
  // and Expose Weakness's health-bar windows (#12).

  expose_weakness: {
    tree: BOND_STARTER_TREES.expose_weakness,
    id: 'expose_weakness', name: 'Expose Weakness',
    description: "Marks a target with Exposed, creating a vulnerability window on their life bar just below their current life. While their life remains within that window, they take 40% more damage; dropping their life past the window shatters the mark.",
    tags: ['spell', 'curse', 'targeted', 'chaos', 'duration', 'instant'], color: '#f0c8d8',
    manaCost: 10, cooldown: 6, useTime: 0,
    baseDamage: { chaos: [2, 4] },
    targeting: { target: 'enemy', castRange: 440 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'exposed', chance: 1 },
    ],
    requirements: { intelligence: 16, dexterity: 12 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  word_of_doom: {
    id: 'word_of_doom', name: 'Word of Doom',
    description: "Afflicts the target with Doom, storing chaos damage on a fixed timer. Subsequent casts of Word of Doom add to the stored damage, and Doom detonates immediately if the stored damage exceeds the target's remaining life.",
    tags: ['spell', 'curse', 'chaos', 'targeted', 'duration'], color: '#7a48c8',
    manaCost: 14, cooldown: 1.5, useTime: 0.5,
    baseDamage: { chaos: [10, 16] },
    // The living_bomb artery: curseRupture bakes the hit's roll into the
    // armed payload; applications ADD (the keg pumps on its fixed fuse).
    innateMods: [mod('curseRupture', 'flat', 2.0)],
    targeting: { target: 'enemy', castRange: 420 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'doom', chance: 1 },
    ],
    requirements: { willpower: 20, intelligence: 14 },
    ai: { range: 380, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  execution: {
    id: 'execution', name: 'Execution',
    description: "Delivers a heavy melee strike that consumes all Vulnerable stacks on the target to deal 45% more damage per stack consumed.",
    tags: ['attack', 'melee', 'physical'], color: '#d878b0',
    manaCost: 9, cooldown: 3, useTime: 0.85,
    baseDamage: { physical: [20, 30] },
    shatterStatus: { statuses: ['vulnerable'], mult: 1.45, perStack: true },
    delivery: { type: 'melee', range: 60, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 18 },
    ai: { range: 65, weight: 2 },
  },

  // ======================= Reactive defense ================================
  // Wards that BANK pain and pay it back, thorns as a real suite, guard
  // combos, retaliation shards, and damage shared onto the wall of bones.

  iron_ward: {
    id: 'iron_ward', name: 'Iron Ward',
    description: "Take 25% less damage for 6 seconds while storing all damage still taken. When the ward expires, detonate the stored amount around you for 120% damage.",
    tags: ['spell', 'buff', 'physical', 'aoe', 'duration'], color: '#c8c0a8',
    manaCost: 20, cooldown: 14, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{ type: 'ironWard', duration: 6, reduce: 0.25, ratio: 1.2, cap: 300, radius: 160 }],
    requirements: { strength: 18 },
    ai: { range: 120, weight: 2 },
    leveling: { perLevel: [mod('poolCap', 'increased', 0.08), mod('effectDuration', 'increased', 0.05)] },
  },

  magma_ward: {
    id: 'magma_ward', name: 'Magma Ward',
    description: "Passively gain 1 magma bead each time you block, up to 5 beads. Activate with at least 2 beads to expend them all in a fire nova that deals 40% more damage per bead spent with a 14% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'guard'], color: '#e06a30',
    manaCost: 10, cooldown: 3, useTime: 0.4,
    chargeGain: [{ charge: 'magma', amount: 1, max: 5, on: 'block' }],
    chargeCost: { charge: 'magma', amount: 'all', minimum: 2, damagePerCharge: 0.4 },
    baseDamage: { fire: [10, 16] },
    delivery: { type: 'nova', radius: 120 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { strength: 16, intelligence: 10 },
    ai: { range: 100, weight: 2 },
  },

  transgression: {
    tree: DISCIPLINE_STARTER_TREES.transgression,
    id: 'transgression', name: 'Transgression',
    description: "Spend 50% of your current mana to gain 1.4 protection per mana spent, either adding to your active guard health (exceeding its cap) or granting a 3-second ward up to 30% of your maximum life.",
    tags: ['spell', 'buff', 'instant'], color: '#8ab8d8',
    manaCost: 0, cooldown: 10, useTime: 0,
    usableWhileGuarding: true,
    delivery: { type: 'self' },
    effects: [{ type: 'guardSurge', manaFraction: 0.5, ratio: 1.4, unguarded: { duration: 3, capLife: 0.3 } }],
    requirements: { strength: 12, intelligence: 12 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.06)] },
  },

  pain_hounds: {
    id: 'pain_hounds', name: 'Pain Hounds',
    description: "Conjure 3 orbiting thorn shards. Taking a hit shatters 1 shard to summon a burning hound that attacks the enemy for 8 seconds.",
    tags: ['spell', 'buff', 'fire', 'summon', 'minion', 'duration'], color: '#d05a3a',
    manaCost: 22, cooldown: 12, useTime: 0.5,
    retaliate: { charge: 'shard', monsterId: 'pain_hound', duration: 8, max: 3 },
    delivery: { type: 'self' },
    effects: [{ type: 'gainCharge', charge: 'shard', amount: 3, max: 3 }],
    requirements: { strength: 14, willpower: 14 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12)] },
  },

  bristleback: {
    tree: BASTION_STARTER_TREES.bristleback,
    id: 'bristleback', name: 'Bristleback',
    description: "Toggle aura that reserves 30 mana to grant you and nearby allies flat physical thorns and reflect 10% of hit damage taken back to attackers.",
    tags: ['spell', 'aura', 'buff', 'physical'], color: '#b09060',
    manaCost: 9, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 170,
        allyMods: [mod('thorns', 'flat', 10), mod('thornsReflect', 'flat', 0.1)],
      },
      upkeep: { reserveMana: 30 },
    },
    effects: [],
    requirements: { fortitude: 10, vitality: 12 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  soul_link: {
    id: 'soul_link', name: 'Soul Link',
    description: "Toggle aura that reserves 30 mana to redirect 33% of hit damage you take to your active minions, split evenly among them.",
    tags: ['spell', 'aura', 'buff', 'minion'], color: '#9a88c8',
    manaCost: 9, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: { radius: 20, allyMods: [mod('minionShare', 'flat', 0.34)] },
      upkeep: { reserveMana: 30 },
    },
    effects: [],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.08)] },
  },

  // ======================= Meta-abilities ==================================
  // SkillDef.meta = a SECOND ability riding the slot (shift+key mini-button,
  // never a bar slot of its own). Payloads are ordinary catalog skills —
  // the transformation primitive meta-combos are built from.

  // === THE THRONG (engine/throng.ts) — the swarm you GATHER ================
  // Collection IS the mechanic: slotted, each anchor REVEALS its kind's
  // unclaimed husks (only to you) and walking through one claims it; held,
  // the channel SWEEPS the whole roster at the cursor (assault orders, a
  // pinned quarry when you point at flesh). Three flavors, three source
  // grammars — the playstyle axis is pure ThrongSourceRow data.

  // SOURCE DOCTRINE (the 07-17 swap, user-directed): the LATCHING flavor is
  // battle-fed — melee riders live in the blast radius, so their grammar
  // must replenish MID-FIGHT (kills kindle, traded blows fill the gauge);
  // the RANGED flavor is the world-found finite treasure — it stands off,
  // so its scarcity can afford to be geographic.
  gather_cinderkin: {
    id: 'gather_cinderkin', name: 'Stoke the Cinderkin',
    description: "Kills have a 28% chance to spawn a claimable Cinderkin husk, and hits dealt and taken by you and your minions fill a gauge that spawns 2–3 husks when full. Walk over husks to claim up to 10 Cinderkin that latch onto enemies and deal fire damage over time. Hold the skill key to direct your Cinderkin toward the cursor.",
    tags: ['spell', 'minion', 'summon', 'fire', 'channel'], color: '#e08848',
    manaCost: 2, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, move: 'slowed', moveFactor: 0.8 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: {
      monsterId: 'cinderkin', cap: 10,
      sources: [
        { kind: 'onKill', chance: 0.28 },
        { kind: 'gauge', per: 'both', fill: 4, yield: [2, 3] },
      ],
    },
    requirements: { willpower: 12 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1), mod('minionLife', 'increased', 0.1)] },
    minDropLevel: 4,
  },

  beckon_palewisps: {
    id: 'beckon_palewisps', name: 'Gather the Palewisps',
    description: "Reveals 1–2 wisp haunts per zone containing 3–5 Palewisps each; walk through them to claim up to 8 Palewisps that fire terrain-piercing bolts from range. Hold the skill key to direct your Palewisps toward the cursor.",
    tags: ['spell', 'minion', 'summon', 'cold', 'channel'], color: '#b8d8e8',
    manaCost: 2, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, move: 'slowed', moveFactor: 0.8 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: {
      monsterId: 'palewisp', cap: 8,
      sources: [{ kind: 'pocket', perZone: [1, 2], cluster: [3, 5], chance: 0.85 }],
    },
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.11), mod('minionLife', 'increased', 0.09)] },
    minDropLevel: 6,
  },

  raise_gnatveil: {
    tree: FRONTIER_STARTER_TREES.raise_gnatveil,
    id: 'raise_gnatveil', name: 'Raise the Gnatveil',
    description: "Spawns claimable gnat clouds nearby every 4–7 seconds, up to 24 active gnats. Gnats swarm enemies and inflict stacking Harried, reducing enemy accuracy and attention. Hold the skill key to direct the swarm toward the cursor.",
    tags: ['spell', 'minion', 'summon', 'physical', 'channel'], color: '#a8b860',
    manaCost: 1, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, move: 'slowed', moveFactor: 0.85 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: {
      monsterId: 'gnatling', cap: 24, batch: 8,
      sources: [{ kind: 'motes', every: [4, 7], at: 'mixed', ttl: 40 }],
      // THE LITE TIER (engine/lite.ts): the veil rides the packed pool —
      // twenty-four bodies at effectively zero cost, promoting to real
      // latchers only where the sweep pins a quarry.
      tier: 'lite',
    },
    requirements: { willpower: 10 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.08), mod('minionLife', 'increased', 0.12)] },
    minDropLevel: 5,
  },

  // The BURROWING flavor (ClingSpec.gnaw + burrow): the Pikmin purple.
  // Grubs sink INSIDE what they catch — the host cannot strike its own
  // parasites; it must SHAKE them into the open (the vulnerability
  // window) and answer them on the ground. The chew is the kit: a steady
  // credited gnaw that never whiffs with the carry (casts refused while
  // riding — the useSkill gate). Battle-fed per the latch doctrine.
  loose_marrowgrubs: {
    id: 'loose_marrowgrubs', name: 'Loose the Marrowgrubs',
    description: "Kills have a 40% chance to spawn a claimable Marrowgrub, and hits dealt and taken by you and your minions fill a gauge that spawns 1–2 more (up to 8 active Marrowgrubs). Marrowgrubs burrow into enemies, becoming untargetable by the host's attacks while dealing continuous physical damage until shaken loose. Hold the skill key to direct the brood toward the cursor.",
    tags: ['spell', 'minion', 'summon', 'physical', 'channel'], color: '#d8c8a8',
    manaCost: 2, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, move: 'slowed', moveFactor: 0.8 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: {
      monsterId: 'marrowgrub', cap: 8,
      sources: [
        { kind: 'onKill', chance: 0.4 },
        { kind: 'gauge', per: 'both', fill: 3, yield: [1, 2] },
      ],
    },
    requirements: { willpower: 13 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1), mod('minionLife', 'increased', 0.1)] },
    minDropLevel: 7,
  },

  summon_swarmlings: {
    tree: FRONTIER_STARTER_TREES.summon_swarmlings,
    id: 'summon_swarmlings', hivecall: true, name: 'Hivecall',
    description: "Toggle to reserve mana and maintain up to 3 Swarmlings, automatically replacing lost Swarmlings every 4 seconds. Swarmlings draw less threat and take 75% less area damage. Hold Shift and press to enrage your Swarmlings, increasing their speed and damage.",
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#b8d060',
    minionCombat: SMALL_ARMY_COMBAT,
    manaCost: 12, cooldown: 3, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'swarmling',
      count: 1, maxActive: 3,
      persistent: { reserve: 7, respawnTime: 4, toggle: true },
    },
    meta: { skillId: 'enrage_swarm', label: 'Enrage' },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('minionLife', 'increased', 0.1)] },
  },

  // Hivecall's meta payload (and a fine meta for any summon skill).
  enrage_swarm: {
    id: 'enrage_swarm', name: 'Enrage', noDrop: true,
    description: "Enrage your minions for 5 seconds, granting them 30% more damage, 40% increased attack speed, and 25% increased movement speed.",
    tags: ['spell', 'minion', 'buff', 'duration', 'instant'], color: '#e07040',
    manaCost: 8, cooldown: 8, useTime: 0,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', affects: 'minions', id: 'enraged', duration: 5,
      mods: [
        mod('damage', 'more', 0.3),
        mod('attackSpeed', 'increased', 0.4),
        mod('moveSpeed', 'increased', 0.25),
      ],
    }],
    ai: { range: 300, weight: 1 },
  },

  // ==========================================================================
  // THE PARITY-EIGHT SIGNATURES (class pass round two) — one small themed
  // family seed per new class, every def a re-tuned copy of a PROVEN shape
  // (construct barrier, dash-decoy, taunt nova, toggle aura, persistent
  // summon, projectile, self buff, charm nova, tone statuses). No new
  // effect machinery: the fabrics these classes anchor (mass, fortune,
  // cling, invocation, attunement) already speak through ordinary levers.
  // ==========================================================================

  // --- THE WALLWRIGHT: the wall is a weapon that hasn't fallen yet ---------
  toppling_stroke: {
    tree: BASTION_STARTER_TREES.toppling_stroke,
    id: 'toppling_stroke', name: 'Toppling Stroke',
    description: "Swings a wide demolition strike that deals physical damage with a 30% chance to inflict Sundered.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#a8a090',
    manaCost: 9, cooldown: 3, useTime: 0.55,
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'melee', range: 95, arcDeg: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sundered', chance: 0.3 },
    ],
    requirements: { strength: 16 },
    ai: { range: 90, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('poiseDamage', 'increased', 0.08)] },
  },

  // --- THE MATADOR: the fight is a performance with exactly one critic ----
  cape_feint: {
    tree: DUELIST_STARTER_TREES.cape_feint,
    id: 'cape_feint', name: 'Cape Feint',
    description: "Dash through enemies while leaving a decoy afterimage behind for 1.2 seconds.",
    tags: ['attack', 'physical', 'movement'], color: '#d84a5a',
    manaCost: 8, cooldown: 3.5, useTime: 0,
    baseDamage: { physical: [3, 6] },
    delivery: { type: 'dash', distance: 190, speed: 1700, width: 0, phase: true, decoyDuration: 1.2 },
    effects: [{ type: 'damage' }],
    requirements: { prowess: 12, dexterity: 12 },
    minDropLevel: 8,
    ai: { range: 180, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('cooldownRecovery', 'increased', 0.06)] },
  },
  planted_banderilla: {
    tree: DUELIST_STARTER_TREES.planted_banderilla,
    id: 'planted_banderilla', name: 'Planted Banderilla',
    description: "Throws a barbed dart that taunts the target and has a 60% chance to inflict Vulnerable.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#e0763a',
    manaCost: 10, cooldown: 6, useTime: 0.35,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 640, radius: 7, range: 520 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'taunted', chance: 1 },
      { type: 'status', status: 'vulnerable', chance: 0.6 },
    ],
    requirements: { prowess: 14 },
    minDropLevel: 8,
    ai: { range: 480, weight: 1.6, keepDistance: 240 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('damage', 'increased', 0.08)] },
  },

  // --- THE FLAGELLANT: pain, notarized ------------------------------------
  ashen_vow: {
    tree: DISCIPLINE_STARTER_TREES.ashen_vow,
    id: 'ashen_vow', name: 'Ashen Vow',
    description: "Toggle to sacrifice 1.2% of your life per second for 10% increased damage. While on low life, grants 25% more damage, 35% increased armor, and 2% of damage leeched as life.",
    tags: ['spell', 'aura', 'buff', 'physical'], color: '#c05838',
    manaCost: 0, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 10,
        // The pale bargain, worn as a class identity: the strong mods only
        // wake at LOW LIFE — the vow's whole game is living near the edge.
        selfMods: [
          mod('damage', 'increased', 0.1),
          mod('damage', 'more', 0.25, undefined, 'lowLife'),
          mod('armor', 'increased', 0.35, undefined, 'lowLife'),
          mod('lifeLeech', 'flat', 0.02, undefined, 'lowLife'),
        ],
      },
      upkeep: { lifeFractionPerSec: 0.012 },
    },
    effects: [],
    requirements: { fortitude: 14 },
  },

  // --- THE FALCONER: the mark has wings and an opinion --------------------
  cast_falcon: {
    tree: BOND_STARTER_TREES.cast_falcon,
    id: 'cast_falcon', name: 'Cast the Falcon',
    description: "Toggle to reserve 9 mana and summon a hunting falcon that latches onto enemies, keeping them Vulnerable until they die or shake her off. If defeated, the falcon returns after 5 seconds.",
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#c8a86a',
    manaCost: 10, cooldown: 4, useTime: 0.5,
    delivery: {
      type: 'summon', monsterId: 'hunting_falcon',
      count: 1, maxActive: 1,
      persistent: { reserve: 9, respawnTime: 5, toggle: true },
    },
    effects: [],
    requirements: { dexterity: 16 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('minionLife', 'increased', 0.1)] },
  },

  // --- THE SHARPER: probability owes money and pays in cards --------------
  thrown_ace: {
    tree: DUELIST_STARTER_TREES.thrown_ace,
    id: 'thrown_ace', name: 'Thrown Ace',
    description: "Throw a spinning card projectile that deals combined physical, fire, cold, and lightning damage on hit.",
    tags: ['attack', 'projectile', 'physical', 'fire', 'cold', 'lightning'], color: '#e8d8b0',
    manaCost: 6, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [3, 5], fire: [2, 6], cold: [2, 6], lightning: [1, 8] },
    delivery: { type: 'projectile', speed: 720, radius: 6, range: 560 },
    effects: [{ type: 'damage' }],
    requirements: { finesse: 14 },
    ai: { range: 520, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  stack_the_deck: {
    tree: DUELIST_STARTER_TREES.stack_the_deck,
    id: 'stack_the_deck', name: 'Stack the Deck',
    description: "Gain +25% Luck and 15% increased cooldown recovery speed for 8 seconds.",
    tags: ['spell', 'buff', 'duration'], color: '#c8b078',
    manaCost: 14, cooldown: 14, useTime: 0.3,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'stacked_deck', duration: 8,
      mods: [mod('luck', 'flat', 0.25), mod('cooldownRecovery', 'increased', 0.15)],
    }],
    requirements: { finesse: 12, charisma: 8 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  // --- THE FIREBRAND: the riot, delivered as a speech ----------------------
  incite: {
    tree: DISCIPLINE_STARTER_TREES.incite,
    id: 'incite', name: 'Incite',
    description: "Unleashes a disruptive shout that gives nearby enemies a 45% chance to become Maddened (attacking the nearest creature, including allies) and a 35% chance to become Befuddled.",
    tags: ['spell', 'aoe', 'chaos', 'duration'], color: '#e07040',
    manaCost: 16, cooldown: 10, useTime: 0.5,
    delivery: { type: 'nova', radius: 220, affects: 'enemies' },
    effects: [
      { type: 'status', status: 'maddened', chance: 0.45 },
      { type: 'status', status: 'befuddlement', chance: 0.35 },
    ],
    requirements: { charisma: 16 },
    ai: { range: 200, weight: 1.6 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.08), mod('effectDuration', 'increased', 0.08)] },
  },

  // --- THE RESONATOR: everything rings if struck sincerely ----------------
  tuning_strike: {
    tree: RESONATOR_STARTER_TREES.tuning_strike,
    id: 'tuning_strike', name: 'Tuning Strike',
    description: "Strikes an enemy to attune them to Fire, Cold, or Lightning at random, causing them to interact with elemental resonance effects.",
    tags: ['attack', 'melee', 'physical', 'duration'], color: '#b0d8c8',
    manaCost: 7, cooldown: 0, useTime: 0.45,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'melee', range: 85, arcDeg: 85 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'attuned_fire', chance: 0.34 },
      { type: 'status', status: 'attuned_cold', chance: 0.33 },
      { type: 'status', status: 'attuned_lightning', chance: 0.33 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 80, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('statusMagnitude', 'increased', 0.05)] },
  },
  shatterchord: {
    tree: RESONATOR_STARTER_TREES.shatterchord,
    id: 'shatterchord', name: 'Shatterchord',
    description: "Releases a nova of fire, cold, and lightning damage around you that deals bonus damage to Attuned enemies.",
    tags: ['spell', 'aoe', 'fire', 'cold', 'lightning'], color: '#88c8d8',
    manaCost: 18, cooldown: 7, useTime: 0.6,
    baseDamage: { fire: [7, 11], cold: [7, 11], lightning: [5, 14] },
    delivery: { type: 'nova', radius: 190, affects: 'enemies' },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 16 },
    ai: { range: 170, weight: 1.8 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.05)] },
  },

  // The COMMAND (also the summons' meta payload): the horde goes where you
  // point — the inverse Bombardment (#39). Equippable on its own, too.
  command_assault: {
    tree: FRONTIER_STARTER_TREES.command_assault,
    id: 'command_assault', name: 'Command: Assault',
    description: "Orders all active minions to disengage their current targets and converge on the target location or enemy for 6 seconds. Hold Shift and press to recall all minions to your side.",
    tags: ['spell', 'minion', 'instant'], color: '#d0a858',
    // Assault leaves room for hit-driven cooldown refunds and defensive formation.
    manaCost: 6, cooldown: 8, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', duration: 6 }],
    meta: { skillId: 'command_recall', label: 'Recall' },
    requirements: { willpower: 12 },
    ai: { range: 500, weight: 1 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  command_recall: {
    id: 'command_recall', name: 'Command: Recall', noDrop: true,
    description: "Order all of your minions to break off their attacks and return to your side for 6 seconds.",
    tags: ['spell', 'minion', 'instant'], color: '#9fe08a',
    manaCost: 0, cooldown: 1, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', command: 'recall', duration: MINION_COMBAT.recallSec }],
  },

  // The ENEMY side of the same lever (the obedience fabric's proof): the
  // pack-leader's bark. `affects: 'squad'` routes the order to squadmates
  // and same-faction kin in earshot instead of summons, and every packmate
  // rolls its brain's `obedience` dial — gnolls are an unruly lot, so only
  // SOME heed the howl while the rest keep their own counsel.
  snarled_orders: {
    id: 'snarled_orders', name: 'Snarled Orders', noDrop: true,
    description: "Orders nearby packmates to converge on the marked target for 4.5 seconds.",
    tags: ['spell'], color: '#d8b068',
    manaCost: 10, cooldown: 9, useTime: 0.45,
    delivery: { type: 'self' },
    effects: [{
      type: 'commandMinions', command: 'assault', affects: 'squad',
      duration: 4.5, radius: 760, markRadius: 220,
    }],
    ai: { range: 620, weight: 2.5 },
  },

  // ======================= Chronomancy ======================================
  // TIME AS A SKILL FAMILY (engine/timeflow.ts). Two open lanes:
  //   • SkillDef.chrono — the cast bends the WORLD's flow: a timeflow hold
  //     exempting the caster's circle; held bodies AND their projectiles
  //     hang mid-air and resume where they left off.
  //   • the stasis / temporal_drag STATUSES (StatusDef.timeScale) — per-BODY
  //     clocks, applied like any ailment: skill effects here, the generated
  //     apply_stasis stat family, fog banks, ground, monster kits.
  // Monsters cast these exactly as players do — an enemy chronomancer is one
  // `ai:` field (the Abyssal Seer already schemes with Stasis Lock). The
  // 'chrono' tag gates future family supports and tag-filtered investment.

  time_stop: {
    id: 'time_stop', name: 'Time Stop',
    description: "Freeze time for all enemies and enemy projectiles for 2.6 seconds. Your own projectiles fired during the stop remain suspended until time resumes.",
    tags: ['spell', 'chrono', 'duration'], color: '#a8ecf0',
    manaCost: 42, cooldown: 22, useTime: 0.55,
    delivery: { type: 'self' },
    chrono: {
      scale: 0, duration: 2.6, exempt: 'pack',
      hud: { tint: 'rgba(140,200,225,0.15)', label: 'Time Stop' },
    },
    effects: [], // the cast IS the effect — chrono carries the whole payload
    requirements: { intelligence: 30, willpower: 22 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.05), mod('cooldownRecovery', 'increased', 0.04)] },
  },

  stasis_lock: {
    tree: CONTROL_STARTER_TREES.stasis_lock,
    id: 'stasis_lock', name: 'Stasis Lock',
    description: "Fires a temporal needle that slows the target by 50% and has an 80% chance to lock them in Stasis, pausing their actions, cooldowns, and status timers.",
    tags: ['spell', 'projectile', 'chrono', 'chaos'], color: '#a8ecf0',
    manaCost: 14, cooldown: 5, useTime: 0.6,
    baseDamage: { chaos: [6, 10] },
    delivery: { type: 'projectile', speed: 400, radius: 8, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stasis', chance: 0.8 },
      { type: 'status', status: 'temporal_drag', chance: 1 },
    ],
    requirements: { intelligence: 12, willpower: 12 },
    ai: { range: 440, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('effectDuration', 'increased', 0.04)] },
  },

  // ======================= The healer archetype ============================
  // Healing is a first-class FAMILY: the 'heal' tag gates its supports, the
  // healPower stat is its damage stat, HealEffect rides every delivery
  // (self / ally-target / nova / cone / melee / zone ticks), chainCount
  // makes any heal a chain-heal, overheal hardens into wards, and healer
  // MINIONS mend through the same skills via the AI's mender pre-pass.

  mend: {
    tree: DEVOTED_STARTER_TREES.mend,
    id: 'mend', name: 'Mend',
    description: "Instantly heal the ally under your cursor (or the most wounded ally in range, or yourself) for a flat amount plus 5% of their maximum life.",
    tags: ['spell', 'heal', 'targeted', 'instant'], color: '#7ec88a',
    manaCost: 9, cooldown: 4, useTime: 0,
    targeting: { target: 'ally', castRange: 420, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 16, pctMax: 0.05 }],
    requirements: { willpower: 12 },
    ai: { range: 400, weight: 3 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.1)] },
  },

  greater_mending: {
    id: 'greater_mending', name: 'Greater Mending',
    description: "Cast a measured invocation that heals an ally for a large flat amount plus 12% of their maximum life.",
    tags: ['spell', 'heal', 'targeted'], color: '#6fd096',
    manaCost: 18, cooldown: 2, useTime: 1.1,
    targeting: { target: 'ally', castRange: 460, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 40, pctMax: 0.12 }],
    requirements: { willpower: 18 },
    ai: { range: 420, weight: 3 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.1)] },
  },

  benediction: {
    id: 'benediction', name: 'Benediction',
    description: "Release an instant healing nova that restores a flat amount plus 4% of maximum life to all nearby allies.",
    tags: ['spell', 'heal', 'aoe', 'instant'], color: '#9ae0b0',
    manaCost: 22, cooldown: 9, useTime: 0,
    delivery: { type: 'nova', radius: 190, affects: 'allies' },
    effects: [{ type: 'heal', amount: 14, pctMax: 0.04 }],
    requirements: { willpower: 16 },
    ai: { range: 200, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.08), mod('aoeRadius', 'increased', 0.05)] },
  },

  communion: {
    id: 'communion', name: 'Communion',
    description: "Channel an invocation that releases a healing wave over all nearby allies, restoring a large flat amount plus 10% of their maximum life.",
    tags: ['spell', 'heal', 'aoe'], color: '#b8f0c8',
    manaCost: 34, cooldown: 12, useTime: 1.4,
    delivery: { type: 'nova', radius: 220, affects: 'allies' },
    effects: [{ type: 'heal', amount: 32, pctMax: 0.1 }],
    requirements: { willpower: 24 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.1)] },
  },

  healing_rain: {
    id: 'healing_rain', name: 'Healing Rain',
    description: "Calls down a gentle rain over the target area for 5 seconds that heals allies standing within it every 0.5 seconds.",
    tags: ['spell', 'heal', 'aoe', 'duration'], color: '#8ad8c8',
    manaCost: 26, cooldown: 10, useTime: 0.8,
    delivery: {
      type: 'ground', radius: 130, castRange: 420,
      lingerDuration: 5, tickInterval: 0.5,
    },
    effects: [{ type: 'heal', amount: 4, pctMax: 0.01 }],
    requirements: { willpower: 20 },
    ai: { range: 380, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.08), mod('effectDuration', 'increased', 0.06)] },
  },

  consecration: {
    tree: DEVOTED_STARTER_TREES.consecration,
    id: 'consecration', name: 'Consecration',
    description: "Consecrate the ground for 5 seconds, dealing fire damage every 0.5 seconds to enemies inside while healing allies standing on it.",
    tags: ['spell', 'heal', 'fire', 'aoe', 'duration'], color: '#f0d890',
    manaCost: 24, cooldown: 9, useTime: 0.7,
    baseDamage: { fire: [4, 7] },
    delivery: {
      type: 'ground', radius: 110, castRange: 300,
      lingerDuration: 5, tickInterval: 0.5,
    },
    effects: [
      { type: 'damage' },
      { type: 'heal', amount: 1.5, pctMax: 0.004 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 280, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.07), mod('damage', 'increased', 0.07)] },
  },

  healing_stream: {
    id: 'healing_stream', name: 'Healing Stream',
    description: "Channel while moving at 40% reduced speed to project a stream of water onto an ally, repeatedly healing the most wounded ally in range.",
    tags: ['spell', 'heal', 'targeted', 'channel'], color: '#7ad8e8',
    manaCost: 3, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.3, windup: 0.15, move: 'slowed', moveFactor: 0.6, trackAim: true },
    targeting: { target: 'ally', castRange: 420, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 6, pctMax: 0.012 }],
    requirements: { willpower: 18 },
    ai: { range: 400, weight: 3 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.1)] },
  },

  cleansing_light: {
    id: 'cleansing_light', name: 'Cleansing Light',
    description: "Instantly removes up to 3 of the newest curses and harmful ailments from an ally and heals them for a small amount.",
    tags: ['spell', 'heal', 'targeted', 'instant'], color: '#e8f0d8',
    manaCost: 12, cooldown: 6, useTime: 0,
    targeting: { target: 'ally', castRange: 420, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [
      { type: 'cleanse', count: 3 },
      { type: 'heal', amount: 8 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.08), mod('cooldownRecovery', 'increased', 0.06)] },
  },

  sanctified_strike: {
    tree: DEVOTED_STARTER_TREES.sanctified_strike,
    id: 'sanctified_strike', name: 'Sanctified Strike',
    description: "Sweep a wide melee arc that deals physical and fire damage to enemies and heals other allies in the arc for a flat amount plus 2% of their maximum life.",
    tags: ['attack', 'melee', 'heal', 'physical', 'fire', 'aoe'], color: '#f0e0a0',
    manaCost: 7, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [8, 12], fire: [4, 7] },
    delivery: { type: 'melee', range: 62, arcDeg: 130 },
    effects: [
      { type: 'damage' },
      { type: 'heal', amount: 7, pctMax: 0.02, excludeCaster: true },
    ],
    requirements: { strength: 6, willpower: 12 },
    ai: { range: 65, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('healPower', 'increased', 0.08)] },
  },

  lifedrain: {
    id: 'lifedrain', name: 'Lifedrain',
    description: "Channel while moving at 50% speed to tether a dark beam to an enemy in front of you, dealing chaos damage over time and leeching 80% of the damage dealt as life.",
    tags: ['spell', 'chaos', 'channel'], color: '#b05a90',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, windup: 0.15, move: 'slowed', moveFactor: 0.5, trackAim: true },
    baseDamage: { chaos: [4, 6] },
    siphon: 0.8,
    delivery: { type: 'cone', range: 260, arcDeg: 8 },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 16, intelligence: 12 },
    ai: { range: 240, weight: 2, keepDistance: 200 },
  },

  soul_volley: {
    id: 'soul_volley', name: 'Soul Volley',
    description: "Fire a fan of 3 chaos projectiles that heal you for 35% of the damage they deal.",
    tags: ['spell', 'chaos', 'projectile', 'heal'], color: '#c8a0e8',
    manaCost: 9, cooldown: 0, useTime: 0.7,
    baseDamage: { chaos: [5, 8] },
    siphon: 0.35,
    delivery: { type: 'projectile', speed: 380, radius: 7, range: 440, count: 3, spreadDeg: 24 },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 16 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  tree_of_life: {
    id: 'tree_of_life', name: 'Tree of Life',
    description: "Plants a sapling for 8 seconds that absorbs a portion of the damage dealt by you and nearby allies. When the sapling expires, is destroyed, or is replaced, it bursts to heal nearby allies for 35% of the stored damage.",
    tags: ['spell', 'heal', 'summon', 'totem', 'aoe', 'duration'], color: '#6fbe5a',
    manaCost: 28, cooldown: 12, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'tree', look: 'device_tree_of_life',
      range: 260, duration: 8, maxActive: 1, life: 60, placeRange: 240,
      healBurst: { ratio: 0.35, cap: 400, radius: 240 },
    },
    effects: [],
    requirements: { willpower: 22 },
    ai: { range: 240, weight: 1 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.1), mod('effectDuration', 'increased', 0.05)] },
  },

  font_of_renewal: {
    id: 'font_of_renewal', name: 'Font of Renewal',
    description: "Place a healing font for 10 seconds that periodically fires a Mending Pulse at the most wounded ally in range, chaining to up to 2 additional wounded allies.",
    tags: ['spell', 'heal', 'totem', 'duration'], color: '#8ae0c0',
    manaCost: 24, cooldown: 8, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'totem', look: 'device_font_of_renewal', castSkillId: 'mending_pulse',
      range: 300, duration: 10, maxActive: 1, life: 50, placeRange: 260, interval: 1.1,
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 280, weight: 1 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.08), mod('effectDuration', 'increased', 0.06)] },
  },

  // The font's payload (and the cleric school's kit piece).
  mending_pulse: {
    id: 'mending_pulse', name: 'Mending Pulse', noDrop: true,
    description: "Heal a wounded ally for a flat amount plus 2% of their maximum life, then chain to up to 2 additional wounded allies.",
    tags: ['spell', 'heal', 'targeted'], color: '#8ae0c0',
    manaCost: 0, cooldown: 0, useTime: 0.3,
    targeting: { target: 'ally', castRange: 320, fallback: 'self' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 9, pctMax: 0.02, chain: 2 }],
    ai: { range: 300, weight: 3 },
  },

  // The healer minions' hands (ally-targeted: the mender pre-pass casts it).
  soothing_touch: {
    id: 'soothing_touch', name: 'Soothing Touch', noDrop: true,
    description: "Heal the most wounded ally in range for a flat amount plus 4% of their maximum life.",
    tags: ['spell', 'heal', 'targeted'], color: '#a8f0c8',
    manaCost: 8, cooldown: 2.5, useTime: 0.5,
    targeting: { target: 'ally', castRange: 260, fallback: 'fail' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 8, pctMax: 0.04 }],
    ai: { range: 260, weight: 4 },
  },

  summon_cleric: {
    id: 'summon_cleric', name: 'Summon Skeletal Cleric',
    description: "Summon a skeletal cleric (up to 2 active at once) that follows you and casts Soothing Touch on wounded allies.",
    tags: ['spell', 'summon', 'minion', 'heal'], color: '#d8e8c8',
    manaCost: 26, cooldown: 2, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'skeletal_cleric', count: 1, maxActive: 2 },
    effects: [],
    requirements: { willpower: 18 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1), mod('minionLife', 'increased', 0.15)] },
  },

  spirit_mender: {
    id: 'spirit_mender', name: 'Bind Spirit Mender',
    description: "Bind a spirit wisp to your shoulder for 20 seconds that repeatedly heals the most wounded ally in range.",
    tags: ['spell', 'summon', 'minion', 'heal', 'duration'], color: '#a8f0c8',
    manaCost: 22, cooldown: 8, useTime: 0.7,
    delivery: { type: 'summon', monsterId: 'mender_sprite', count: 1, maxActive: 1, duration: 20 },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('minionLife', 'increased', 0.1)] },
  },

  // --- The Purity auras (#9): resistance + ailment-shrug as toggles --------
  purity_of_elements: {
    tree: RESONATOR_STARTER_TREES.purity_of_elements,
    id: 'purity_of_elements', name: 'Purity of Elements',
    description: "Toggle aura that reserves 35 mana to grant you and nearby allies +20% to fire, cold, lightning, and chaos resistances and a 25% chance to avoid elemental and chaos ailments.",
    tags: ['spell', 'aura', 'buff'], color: '#d8e8f0',
    manaCost: 10, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 180,
        allyMods: [
          mod('fireRes', 'flat', 0.2), mod('coldRes', 'flat', 0.2),
          mod('lightningRes', 'flat', 0.2), mod('chaosRes', 'flat', 0.2),
          mod('ailmentResist', 'flat', 0.25),
        ],
      },
      upkeep: { reserveMana: 35 },
    },
    effects: [],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  purity_of_fire: {
    id: 'purity_of_fire', name: 'Purity of Fire',
    description: "Toggle aura that reserves 25 mana to grant you and nearby allies +35% fire resistance and a 50% chance to avoid ignite and sear.",
    tags: ['spell', 'aura', 'buff', 'fire'], color: '#f0b080',
    manaCost: 8, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 180,
        allyMods: [mod('fireRes', 'flat', 0.35), mod('ailmentResist', 'flat', 0.5, ['fire'])],
      },
      upkeep: { reserveMana: 25 },
    },
    effects: [],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  purity_of_cold: {
    id: 'purity_of_cold', name: 'Purity of Cold',
    description: "Toggle aura that reserves 25 mana to grant you and nearby allies +35% cold resistance and a 50% chance to avoid chill and freeze.",
    tags: ['spell', 'aura', 'buff', 'cold'], color: '#a8d8f0',
    manaCost: 8, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 180,
        allyMods: [mod('coldRes', 'flat', 0.35), mod('ailmentResist', 'flat', 0.5, ['cold'])],
      },
      upkeep: { reserveMana: 25 },
    },
    effects: [],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  purity_of_lightning: {
    id: 'purity_of_lightning', name: 'Purity of Lightning',
    description: "Toggle aura that reserves 25 mana to grant you and nearby allies +35% lightning resistance and a 50% chance to avoid shock.",
    tags: ['spell', 'aura', 'buff', 'lightning'], color: '#f0e8a0',
    manaCost: 8, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 180,
        allyMods: [mod('lightningRes', 'flat', 0.35), mod('ailmentResist', 'flat', 0.5, ['lightning'])],
      },
      upkeep: { reserveMana: 25 },
    },
    effects: [],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  determination: {
    id: 'determination', name: 'Determination',
    description: "Toggle aura that reserves 40 mana to grant you and nearby allies +30 armor and 60% increased armor.",
    tags: ['spell', 'aura', 'buff'], color: '#c8c0a8',
    manaCost: 12, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 180,
        allyMods: [mod('armor', 'increased', 0.6), mod('armor', 'flat', 30)],
      },
      upkeep: { reserveMana: 40 },
    },
    effects: [],
    requirements: { strength: 16, willpower: 12 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06)] },
  },

  // ======================= Ground effects & domains ========================
  // EMITTER zones (GroundDelivery.emit: the lingering field casts a payload
  // skill on a beat — at random ground or at random occupants) and DOMAIN
  // zones (GroundDelivery.domain: occupants wear modifiers while inside).
  // Payload kit pieces carry castRange 9999 — a far-travelled fissure must
  // never clamp its bursts back toward the caster.

  volcanic_fissure: {
    id: 'volcanic_fissure', name: 'Volcanic Fissure',
    description: "Tear a traveling fissure of physical and fire damage that erupts with magma gouts along its length, each hit having an 11% chance to ignite.",
    tags: ['attack', 'melee', 'fire', 'physical', 'aoe', 'duration'], color: '#e0562a',
    manaCost: 15, cooldown: 5, useTime: 0.75,
    baseDamage: { physical: [6, 9], fire: [6, 9] },
    delivery: {
      type: 'ground', radius: 42, castRange: 60,
      lingerDuration: 3.2, tickInterval: 0.5, drift: 130,
      emit: { skillId: 'fissure_burst', interval: 0.45, at: 'point' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { strength: 18, intelligence: 12 },
    ai: { range: 140, weight: 2 },
  },

  // The fissure's gout (and a fine emit payload for anything else).
  fissure_burst: {
    id: 'fissure_burst', name: 'Fissure Burst', noDrop: true,
    description: "Erupt a gout of magma from the ground after a brief delay, dealing fire damage in a small area with a 12% chance to ignite.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff7a30',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [7, 11] },
    delivery: { type: 'ground', radius: 52, castRange: 9999, delay: 0.3 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.3 },
    ],
  },

  eruption: {
    id: 'eruption', name: 'Eruption',
    description: "Detonates the target ground after a brief delay for heavy fire damage, leaving churning fire for 3 seconds. Hits have a 14% chance to ignite and inflict Sear, reducing healing received by 50%.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff6428',
    manaCost: 16, cooldown: 6, useTime: 0.8,
    baseDamage: { fire: [20, 30] },
    delivery: {
      type: 'ground', radius: 85, castRange: 420, delay: 0.25,
      lingerDuration: 3, tickInterval: 0.5,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sear', chance: 1 },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 390, weight: 3, keepDistance: 260 },
  },

  thunderstorm: {
    id: 'thunderstorm', name: 'Thunderstorm',
    description: "Conjure a storm cloud over the target area for 6 seconds that strikes a random enemy beneath it with lightning every 0.5 seconds.",
    tags: ['spell', 'lightning', 'aoe', 'duration', 'storm'], color: '#e8e44a',
    manaCost: 22, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'ground', radius: 175, castRange: 440,
      lingerDuration: 6, tickInterval: 9,
      emit: { skillId: 'thunder_bolt', interval: 0.5, at: 'enemy' },
    },
    effects: [],
    requirements: { intelligence: 24 },
    ai: { range: 400, weight: 3, keepDistance: 280 },
  },

  // The storm cell's bolt (and a fine emit payload for anything else).
  thunder_bolt: {
    id: 'thunder_bolt', name: 'Thunder Bolt', noDrop: true,
    description: "Call down a bolt of lightning after a brief delay that deals lightning damage in a small area with a 50% chance to shock.",
    tags: ['spell', 'lightning', 'aoe'], color: '#fff06a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { lightning: [14, 24] },
    delivery: { type: 'ground', radius: 48, castRange: 9999, delay: 0.25 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.5 },
    ],
  },

  entangle: {
    id: 'entangle', name: 'Entangle',
    description: "Crack the target ground for physical damage and cause tendrils to lash out for 4 seconds at enemies standing on it, snaring targets and having a chance to inflict Bleed.",
    tags: ['spell', 'chaos', 'physical', 'aoe', 'duration'], color: '#7fce6a',
    manaCost: 14, cooldown: 6, useTime: 0.7,
    baseDamage: { physical: [4, 7] },
    delivery: {
      type: 'ground', radius: 95, castRange: 380, delay: 0.2,
      lingerDuration: 4, tickInterval: 0.8,
      emit: { skillId: 'lash_tendril', interval: 0.7, count: 2, at: 'enemy' },
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18 },
    ai: { range: 350, weight: 2, keepDistance: 240 },
  },

  // The thing underneath (and a fine emit payload for anything else).
  lash_tendril: {
    id: 'lash_tendril', name: 'Lashing Tendril', noDrop: true,
    description: "Lash an enemy from broken ground for physical and chaos damage, snaring them for 1 second with a 30% chance to inflict Bleed.",
    tags: ['spell', 'chaos', 'physical', 'aoe'], color: '#6fbe5a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [4, 6], chaos: [2, 4] },
    delivery: { type: 'ground', radius: 34, castRange: 9999, delay: 0.15 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 1, durationOverride: 1.1 },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
  },

  // ======================= The wildwood & carrion kit ======================
  // The bestiary-expansion arsenal: roots, spores, talons, shrieks and bile.
  // Monster-first (every entry has an ai hint), player-usable like any gem.

  // --- THE ACCUMULATOR RELEASES (engine/tells.ts payoff verbs) -------------
  // Monster-only (noDrop): each is the SPEND of a meter the body visibly
  // fills — reserved OUT of the owner's kit rotation (skillUse priority)
  // and force-cast by its brim rule, so the worn gauge is the only warning
  // and the only one needed. Slow bars on purpose: the wind-up is the
  // second half of the tell.
  gorge_burst: {
    id: 'gorge_burst', name: 'Gorge Burst', noDrop: true,
    description: "Unleashes a nova of bone shards and bile around the caster for physical and chaos damage, with a 50% chance to inflict Decay.",
    tags: ['spell', 'physical', 'aoe'], color: '#8a9a4a',
    manaCost: 0, cooldown: 3, useTime: 0.95,
    baseDamage: { physical: [14, 20], chaos: [8, 13] },
    delivery: { type: 'nova', radius: 120 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.5, magnitude: 0.35 },
    ],
    ai: { range: 110, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  kindled_eruption: {
    id: 'kindled_eruption', name: 'Kindled Eruption', noDrop: true,
    description: "Release a slow ring of fire around yourself with an 18% chance to ignite enemies hit.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff8a3a',
    manaCost: 0, cooldown: 2.5, useTime: 1.1,
    baseDamage: { fire: [22, 32] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.35 },
    ],
    ai: { range: 120, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  talon_rake: {
    id: 'talon_rake', name: 'Talon Rake',
    description: "Slash in a wide frontal arc with a 50% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical'], color: '#c88a4a',
    manaCost: 2, cooldown: 0.8, useTime: 0.55,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'melee', range: 65, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.5, magnitude: 0.4 },
    ],
    requirements: { dexterity: 14 },
    ai: { range: 65, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('attackSpeed', 'increased', 0.01)] },
  },

  keening_shriek: {
    id: 'keening_shriek', name: 'Keening Shriek',
    description: "Unleash a cone wail that deals physical damage with a 60% chance to befuddle (35% interrupt chance) and a 35% chance to weaken enemies hit.",
    tags: ['spell', 'aoe', 'duration', 'warcry'], color: '#c8b8e8',
    manaCost: 10, cooldown: 6, useTime: 0.7,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'cone', range: 170, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'befuddlement', chance: 0.6 },
      { type: 'status', status: 'weaken', chance: 0.35 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 150, weight: 3, keepDistance: 110 },
  },

  root_grasp: {
    id: 'root_grasp', name: 'Root Grasp',
    description: "Erupts roots under enemies in the target area after a brief delay, dealing physical damage with a 60% chance to root targets hit.",
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#8a9a4a',
    manaCost: 11, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'ground', radius: 75, castRange: 400, delay: 0.7 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.6 },
    ],
    requirements: { strength: 12, willpower: 12 },
    ai: { range: 380, weight: 3, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  lash_roots: {
    id: 'lash_roots', name: 'Lashing Roots',
    description: "Lashes green-wood roots in a frontal arc for physical damage, with an 80% chance to ensnare targets for 1.4 seconds and a 25% chance to inflict bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#7fae4a',
    manaCost: 4, cooldown: 1.6, useTime: 0.75,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'melee', range: 75, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 0.8, durationOverride: 1.4 },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { strength: 14 },
    ai: { range: 75, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  splinter_volley: {
    id: 'splinter_volley', name: 'Splinter Volley',
    description: "Fire a spread of 4 jagged splinters, each having a 30% chance to inflict Bleed.",
    tags: ['attack', 'projectile', 'physical', 'aoe'], color: '#b09a6a',
    manaCost: 8, cooldown: 2, useTime: 0.7,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'projectile', speed: 400, radius: 6, range: 340, count: 4, spreadDeg: 55 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { dexterity: 16 },
    ai: { range: 300, weight: 3, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  sporefall: {
    id: 'sporefall', name: 'Sporefall',
    description: "Rains 3–5 spore clusters over the target area, each bursting for chaos damage in a small radius with a 50% chance to inflict poison.",
    tags: ['spell', 'chaos', 'aoe', 'storm', 'duration'], color: '#9ac86a',
    manaCost: 13, cooldown: 6, useTime: 0.9,
    baseDamage: { chaos: [8, 13] },
    delivery: { type: 'storm', count: [3, 5], interval: 0.3, areaRadius: 130, hitRadius: 55, castRange: 440 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.5, magnitude: 0.4 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 400, weight: 3, keepDistance: 280 },
  },

  // The spelunker's answer to open sky: there isn't any. A ceiling volley in
  // the arrowfall/sporefall storm grammar — stone-and-ice teeth shaken loose
  // over the marked ground, each impact a stagger looking for a skull.
  stalactite_fall: {
    id: 'stalactite_fall', name: 'Stalactite Fall',
    description: "Drop 5 to 7 stone stalactites in rapid sequence over the target area, each dealing physical and cold damage with a 15% chance to stun.",
    tags: ['spell', 'physical', 'cold', 'aoe', 'storm'], color: '#9aa8c0',
    manaCost: 12, cooldown: 5, useTime: 0.85,
    baseDamage: { physical: [9, 14], cold: [4, 7] },
    delivery: { type: 'storm', count: [5, 7], interval: 0.12, areaRadius: 120, hitRadius: 48, castRange: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.15 },
    ],
    requirements: { strength: 18 },
    minDropLevel: 4,
    ai: { range: 380, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  spore_burst: {
    id: 'spore_burst', name: 'Spore Burst',
    description: "Release a ring of spores around yourself that deals chaos damage with a 50% chance to poison and a 30% chance to befuddle.",
    tags: ['spell', 'chaos', 'aoe'], color: '#aed86a',
    manaCost: 10, cooldown: 4, useTime: 0.7,
    baseDamage: { chaos: [7, 11] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.5, magnitude: 0.4 },
      { type: 'status', status: 'befuddlement', chance: 0.3 },
    ],
    requirements: { willpower: 16 },
    ai: { range: 120, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  bile_spray: {
    id: 'bile_spray', name: 'Bile Spray',
    description: "Sprays caustic bile in a frontal cone for chaos damage, with a 50% chance to inflict Decay.",
    tags: ['spell', 'chaos', 'aoe'], color: '#9ab83a',
    manaCost: 9, cooldown: 2.5, useTime: 0.75,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'cone', range: 180, arcDeg: 55 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.5, magnitude: 0.35 },
    ],
    requirements: { willpower: 16 },
    ai: { range: 160, weight: 3, keepDistance: 120 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // --- The flesh country's own verbs (the Ocular / Gutworks kin) -----------
  gaze_beam: {
    id: 'gaze_beam', name: 'Transfixing Gaze', noDrop: true,
    description: "Projects a beam of chaos damage that inflicts stacking Beheld on each hit.",
    tags: ['spell', 'chaos', 'duration'], color: '#d8b04a',
    manaCost: 8, cooldown: 3.2, useTime: 1.0,
    baseDamage: { chaos: [4, 7] },
    delivery: { type: 'cone', range: 300, arcDeg: 6, beamFx: true },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'beheld', chance: 1 },
    ],
    requirements: { willpower: 22 },
    ai: { range: 280, weight: 3, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  // THE PLAYER'S STARE: the Karst ladder as a build — a held thin cone that
  // BUILDS petrifying (the climb is the slow), with the statue payoff wired
  // as self-synergy (damageVs_petrified per level — syncope's grammar). The
  // generated lanes (apply_petrifying / damageVs_petrified) exist for every
  // passive and affix the moment the statuses do; this gem is just the
  // first bearer.
  stone_gaze: {
    id: 'stone_gaze', name: 'Stone Gaze',
    description: "Projects a beam of physical damage that inflicts stacking Petrifying on each hit, turning targets to stone at full stacks.",
    tags: ['spell', 'physical', 'duration'], color: '#9a948a',
    manaCost: 11, cooldown: 4, useTime: 0.9,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'cone', range: 300, arcDeg: 8, beamFx: true },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'petrifying', chance: 1 },
    ],
    requirements: { willpower: 20 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('damageVs_petrified', 'flat', 0.04)] },
  },
  // THE PRISMATIC RAY — refraction as a verb: white light is every color at
  // once. The beam carries all three elements in ONE packet, so its TONE
  // (the attunement fabric reads the dominant ROLLED type, conversions and
  // all) is whatever the BUILD amplifies — a fire-stacked caster's ray
  // attunes crystals to fire; an untouched ray leans lightning (the wide
  // top of its roll). THE deliberate tuning tool, and an honest rainbow
  // lance without a crystal in sight.
  prismatic_ray: {
    id: 'prismatic_ray', name: 'Prismatic Ray',
    description: "Fire a narrow beam dealing combined fire, cold, and lightning damage, attuning struck resonant crystals to your highest elemental damage type.",
    tags: ['spell', 'fire', 'cold', 'lightning'], color: '#cfe8ff',
    manaCost: 12, cooldown: 0.5, useTime: 0.75,
    baseDamage: { fire: [6, 9], cold: [6, 9], lightning: [3, 12] },
    delivery: { type: 'cone', range: 330, arcDeg: 7, beamFx: true },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 22 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },
  // THE BASILISK'S STARE (noDrop): gaze_beam's grammar pointed at the Karst
  // ladder — the thin held ray BUILDS petrifying stack by stack (the climb
  // is the slow; the cap is the statue). Break line of sight, close the
  // distance, or kill the serpent: the same counterplay ladder the weald's
  // watcher stones teach.
  petrifying_gaze: {
    id: 'petrifying_gaze', name: 'Petrifying Gaze', noDrop: true,
    description: "Projects a beam of physical damage that inflicts stacking Petrifying on each hit, turning targets to stone at full stacks.",
    tags: ['spell', 'physical', 'duration'], color: '#9a948a',
    manaCost: 9, cooldown: 3.4, useTime: 1.0,
    baseDamage: { physical: [3, 6] },
    delivery: { type: 'cone', range: 320, arcDeg: 6, beamFx: true },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'petrifying', chance: 1 },
    ],
    ai: { range: 300, weight: 3, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  tear_burst: {
    id: 'tear_burst', name: 'Weeping Burst', noDrop: true,
    description: "Releases a nova of stinging mist around the caster for chaos damage, with a 65% chance to inflict Faintness.",
    tags: ['spell', 'chaos', 'aoe'], color: '#cfe6ea',
    manaCost: 9, cooldown: 3.8, useTime: 0.8,
    baseDamage: { chaos: [6, 10] },
    delivery: { type: 'nova', radius: 125 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'faintness', chance: 0.65 },
    ],
    requirements: { willpower: 20 },
    ai: { range: 110, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },
  emetic_lob: {
    id: 'emetic_lob', name: 'Emetic Lob', noDrop: true,
    description: "Lobs a vile glob that bursts for chaos damage with an 80% chance to inflict Queasy.",
    tags: ['spell', 'chaos', 'projectile'], color: '#a8b86a',
    manaCost: 8, cooldown: 2.8, useTime: 0.7,
    baseDamage: { chaos: [8, 13] },
    delivery: { type: 'projectile', speed: 240, radius: 11, range: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'queasy', chance: 0.8 },
    ],
    requirements: { willpower: 18 },
    ai: { range: 240, weight: 3, keepDistance: 150 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // --- THE FLESH COUNTRY's arts, learned back off the walls (droppable
  // gems). The identity: WEAPONIZED body-ladders — faintness, queasy, the
  // gaze-mark, blind — every one a status the country itself taught you. ---
  transfixing_gaze: {
    id: 'transfixing_gaze', name: 'Transfixing Gaze',
    description: "Hold your cursor on an enemy for 1.6 seconds to deal chaos damage and mark them as Seen, increasing the damage they take. Moving the cursor off the target causes progress to decay rather than reset immediately.",
    tags: ['spell', 'chaos', 'duration', 'targeted'], color: '#d8b04a',
    manaCost: 18, cooldown: 8, useTime: 0,
    targeting: { target: 'enemy', castRange: 340 },
    concentration: { time: 1.6, onBreak: 'drain', drainRate: 1.4 },
    delivery: { type: 'target' },
    baseDamage: { chaos: [14, 22] },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'seen', chance: 1 },
    ],
    requirements: { willpower: 18, wisdom: 10 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },
  syncope: {
    id: 'syncope', name: 'Syncope',
    description: "Releases a pressure nova around you that deals chaos damage and inflicts a stack of Faintness on nearby enemies, dealing bonus damage to targets that already have Faintness stacks.",
    tags: ['spell', 'chaos', 'aoe'], color: '#d8ccd8',
    manaCost: 16, cooldown: 4, useTime: 0.7,
    baseDamage: { chaos: [12, 19] },
    delivery: { type: 'nova', radius: 150 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'faintness', chance: 1 },
    ],
    requirements: { willpower: 20 },
    // The self-synergy IS the build: the gem's own kit grows the payoff lane.
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('damageVs_faintness', 'flat', 0.03)] },
  },
  digest: {
    id: 'digest', name: 'Digest',
    description: "Creates a pool of bile on the target ground for 6 seconds that expands up to three times its initial size, dealing chaos damage over time with a 50% chance per tick to inflict Queasy.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#a8b86a',
    manaCost: 22, cooldown: 6, useTime: 0.8,
    baseDamage: { chaos: [7, 11] },
    delivery: {
      type: 'ground', radius: 72, castRange: 380,
      lingerDuration: 6, tickInterval: 0.8,
      // The spread: born tight, worked wide — the pool grows INTO its meal.
      sizeOver: { from: 0.55, to: 1.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'queasy', chance: 0.5 },
    ],
    requirements: { willpower: 24 },
    ai: { range: 340, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },
  blinding_ichor: {
    id: 'blinding_ichor', name: 'Blinding Ichor',
    description: "Flings a glob of ichor that deals chaos damage and blinds targets hit, reducing their accuracy and detection range.",
    tags: ['spell', 'chaos', 'projectile'], color: '#3a3444',
    manaCost: 10, cooldown: 5, useTime: 0.6,
    baseDamage: { chaos: [10, 16] },
    delivery: { type: 'projectile', speed: 300, radius: 10, range: 440 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'blind', chance: 1 },
    ],
    requirements: { willpower: 14, dexterity: 8 },
    ai: { range: 400, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // --- THE CONFUSION FAMILY's arts (droppable gems): CONTROL itself as the
  // hit surface — the turned hand, the addled hand. Symmetric by
  // construction (status.ts invertMove/scrambleChance read the STATUS, not
  // the seat), so everything the widdershin kin do to you, these do BACK:
  // a hexed monster's feet walk contrary to its brain and its casts fire
  // the wrong button, exactly like yours. ---
  witching_bell: {
    id: 'witching_bell', name: 'Witching Bell',
    description: "Rings a discordant bell that deals chaos damage in a nova around you and inflicts a stack of Disoriented on nearby enemies. At 5 stacks, targets have their movement directions reversed.",
    tags: ['spell', 'chaos', 'aoe'], color: '#9ad8d0',
    manaCost: 14, cooldown: 3.6, useTime: 0.7,
    baseDamage: { chaos: [9, 14] },
    delivery: { type: 'nova', radius: 140 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'disoriented', chance: 1 },
    ],
    requirements: { willpower: 18 },
    ai: { range: 120, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },
  scatterhex: {
    id: 'scatterhex', name: 'Scatterhex',
    description: "Hurls a hex that deals chaos damage and inflicts Addled, causing the target's skills to misfire and trigger a different ability.",
    tags: ['spell', 'chaos', 'projectile'], color: '#e0b464',
    manaCost: 11, cooldown: 5.5, useTime: 0.6,
    baseDamage: { chaos: [8, 13] },
    delivery: { type: 'projectile', speed: 300, radius: 10, range: 440 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'addled', chance: 1 },
    ],
    requirements: { willpower: 16, wisdom: 8 },
    ai: { range: 400, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  turnwise_hex: {
    id: 'turnwise_hex', name: 'Turnwise Hex',
    description: "Hexes a single enemy for chaos damage and immediately reverses their movement directions for the duration of the effect.",
    tags: ['spell', 'chaos', 'duration', 'targeted'], color: '#5ecec0',
    manaCost: 15, cooldown: 9, useTime: 0.5,
    targeting: { target: 'enemy', castRange: 360 },
    delivery: { type: 'target' },
    baseDamage: { chaos: [6, 10] },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'widdershins', chance: 1 },
    ],
    requirements: { willpower: 20, wisdom: 10 },
    ai: { range: 340, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  gut_hurl: {
    id: 'gut_hurl', name: 'Gut Hurl',
    description: "Hurls a heavy projectile that deals physical and chaos damage with a 40% chance to inflict Vulnerable.",
    tags: ['spell', 'chaos', 'projectile'], color: '#b8604a',
    manaCost: 9, cooldown: 3, useTime: 0.8,
    baseDamage: { chaos: [12, 18], physical: [4, 7] },
    delivery: { type: 'projectile', speed: 300, radius: 10, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'vulnerable', chance: 0.4 },
    ],
    requirements: { strength: 12, willpower: 12 },
    ai: { range: 440, weight: 3, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  rearguard_aegis: {
    id: 'rearguard_aegis', name: 'Rearguard Aegis',
    description: "Toggle to reserve mana and form a protective carapace across your rear arc that absorbs incoming hits, ailments, and knockback until broken, reforming after 3 seconds without taking rear hits. Scales with guard strength.",
    tags: ['spell', 'guard', 'buff', 'duration'], color: '#c8b87a',
    manaCost: 0, cooldown: 1, useTime: 0.4,
    delivery: {
      type: 'aura', mode: 'toggle',
      upkeep: { reserveMana: 18 },
      aura: { radius: 0 },
      // The directional energy shield: 180° behind the bearer, pool ×
      // guardStrength, self-knitting after 3 quiet seconds.
      shellGuard: { side: 'rear', max: 90, arcDeg: 180, regenDelay: 3, regenRate: 24 },
    },
    effects: [],
    requirements: { fortitude: 14, willpower: 10 },
    ai: { range: 9999, weight: 1 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.06)] },
  },

  snap_shut: {
    id: 'snap_shut', name: 'Snap Shut', noDrop: true,
    description: "Snaps iron jaws shut in a tight ring for physical damage, with an 80% chance to root targets for 1.6 seconds.",
    tags: ['attack', 'physical', 'aoe'], color: '#b0a890',
    manaCost: 0, cooldown: 2.5, useTime: 0.1,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'nova', radius: 48 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.8, durationOverride: 1.6 },
    ],
    ai: { range: 46, weight: 5 },
  },

  web_shot: {
    id: 'web_shot', name: 'Web Shot',
    description: "Fire a silk line that deals light physical damage with a 60% chance to pin the target for up to 1.8 seconds.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#d8d8c8',
    manaCost: 6, cooldown: 3, useTime: 0.65,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'projectile', speed: 340, radius: 8, range: 380 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.6, durationOverride: 1.8 },
    ],
    requirements: { dexterity: 14 },
    ai: { range: 340, weight: 3, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('apply_rooted', 'flat', 0.02)] },
  },

  hurl_debris: {
    id: 'hurl_debris', name: 'Hurl Debris',
    description: "Hurl loose debris as a physical projectile with a 15% chance to stun on impact.",
    tags: ['spell', 'physical', 'projectile'], color: '#b8b8d8',
    manaCost: 7, cooldown: 1.8, useTime: 0.6,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'projectile', speed: 360, radius: 9, range: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.15 },
    ],
    requirements: { willpower: 16 },
    ai: { range: 380, weight: 3, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  summon_bats: {
    id: 'summon_bats', name: 'Summon Bats',
    description: "Summon a crimson bat, up to 3 active at once. Activate the skill's command ability to order your bats to converge on a target.",
    tags: ['spell', 'summon', 'minion'], color: '#a84a5a',
    manaCost: 16, cooldown: 2, useTime: 0.7,
    delivery: { type: 'summon', monsterId: 'crimson_bat', count: 1, maxActive: 3 },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.12)] },
  },

  // THE COACH DOOR OPENS (the Gloom Coach's teeth, noDrop like every
  // spawner-pour): the Court never travels without provisions — the kept
  // come out hungry, and now and then a true servant steps down with them.
  disgorge_thralls: {
    id: 'disgorge_thralls', name: 'The Coach Door Opens', noDrop: true,
    description: "Summon a feeding thrall (75% chance) or vampire thrall (25% chance), up to 5 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#b83a5a',
    manaCost: 0, cooldown: 5.5, useTime: 0.9,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'feeding_thrall', weight: 3 },
        { id: 'vampire_thrall', weight: 1 },
      ],
      count: 1, maxActive: 5,
    },
    effects: [],
    requirements: { willpower: 26 },
    ai: { range: 620, weight: 1 },
  },

  // --- THE EGG CLUTCH (the pod-construct incubation, worn by broodmothers):
  //     the egg is DESTRUCTIBLE and hatches ONLY if it survives its timer —
  //     break the clutch and the brood never comes (no onBreak: a broken
  //     pod dies quietly). The user-facing spider fantasy, as pure data.
  lay_brood_egg: {
    id: 'lay_brood_egg', name: 'Lay Brood Egg',
    description: "Place a destructible egg sac (up to 3 active at once) that hatches into spiderlings after 7 seconds.",
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#c8c0a0',
    manaCost: 14, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_lay_brood_egg',
      range: 0, duration: 7, maxActive: 3, life: 40, placeRange: 80,
      hatch: { skillId: 'egg_hatch_spiders' },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 240, weight: 2, keepDistance: 200 },
  },
  egg_hatch_spiders: {
    id: 'egg_hatch_spiders', name: 'The Clutch Splits', noDrop: true,
    description: "Hatch 2 spiderlings from the egg sac, up to 8 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#c8c0a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'spiderling', count: 2, maxActive: 8 },
    effects: [],
  },
  lay_chitin_clutch: {
    id: 'lay_chitin_clutch', name: 'Lay Chitin Clutch',
    description: "Place a destructible resin egg clutch (up to 3 active at once) that hatches into chitin drones after 7 seconds.",
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#d8b06a',
    manaCost: 14, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_lay_chitin_clutch',
      range: 0, duration: 7, maxActive: 3, life: 45, placeRange: 80,
      hatch: { skillId: 'egg_hatch_chitin' },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 240, weight: 2, keepDistance: 200 },
  },
  egg_hatch_chitin: {
    id: 'egg_hatch_chitin', name: 'The Clutch Splits', noDrop: true,
    description: "Hatch 2 chitin drones from the clutch, up to 8 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#d8b06a',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'chitin_drone', count: 2, maxActive: 8 },
    effects: [],
  },

  // ==================== THE MURMURATION (chitin winged caste) ==============
  // The dive-cycle grammar: wing_up grants the `aloft` flight state (script
  // onEnter, force-cast — a takeoff is not a decision), the stoop skills are
  // LEAP deliveries with the landing-telegraph lever and shed aloft at cast
  // (wings fold when the dive commits), and the grounded window between is
  // the melee player's turn. Script-only (never on kit lists), so the cycle
  // machine keeps sole authority over when the sky comes down.
  wing_up: {
    id: 'wing_up', name: 'Take to the Wing', noDrop: true,
    description: "Takes flight, gaining Aloft and becoming untargetable by ground attacks until landing.",
    tags: ['spell', 'buff', 'movement'], color: '#e8d8a0',
    manaCost: 0, cooldown: 1.2, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'status', status: 'aloft', chance: 1 }],
  },
  locust_dive: {
    id: 'locust_dive', name: 'Stooping Bite', noDrop: true,
    description: "Dives onto the marked location for physical damage, ending Aloft on impact.",
    tags: ['attack', 'physical', 'movement'], color: '#e0b054',
    manaCost: 0, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [6, 11] },
    delivery: { type: 'leap', range: 420, airTime: 0.85, radius: 60, telegraph: true },
    effects: [{ type: 'shed', status: 'aloft' }, { type: 'damage' }],
    ai: { range: 400, weight: 1 },
  },
  saltant_slam: {
    id: 'saltant_slam', name: 'Stooping Crush', noDrop: true,
    description: "Slams down onto the marked location for physical area damage that knocks enemies back, ending Aloft on impact.",
    tags: ['attack', 'physical', 'movement', 'aoe'], color: '#c89040',
    manaCost: 0, cooldown: 8, useTime: 0.65,
    baseDamage: { physical: [14, 24] },
    delivery: { type: 'leap', range: 460, airTime: 1.05, radius: 92, telegraph: true },
    effects: [
      { type: 'shed', status: 'aloft' },
      { type: 'damage' },
      { type: 'knockback', strength: 55 },
    ],
    ai: { range: 440, weight: 1 },
  },
  alight: {
    id: 'alight', name: 'Alight', noDrop: true,
    description: "Lands on the ground, ending Aloft.",
    tags: ['spell', 'movement'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'shed', status: 'aloft' }],
  },
  // --- THE MOUNTAIN'S OWN (the highland country kin) ------------------------
  condor_stoop: {
    id: 'condor_stoop', name: 'Stooping Talons', noDrop: true,
    description: "Dives onto the marked location for physical damage with a 30% chance to inflict bleed, ending Aloft on impact.",
    tags: ['attack', 'physical', 'movement'], color: '#c8b090',
    manaCost: 0, cooldown: 7, useTime: 0.55,
    baseDamage: { physical: [9, 16] },
    delivery: { type: 'leap', range: 470, airTime: 0.95, radius: 66, telegraph: true },
    effects: [
      { type: 'shed', status: 'aloft' },
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3 },
    ],
    ai: { range: 440, weight: 1 },
  },
  wake_the_scree: {
    id: 'wake_the_scree', name: 'Wake the Scree', noDrop: true,
    description: "Summon 2 scree skitters from the ground, up to 4 active at once.",
    tags: ['spell', 'summon'], color: '#b8ab90',
    manaCost: 40, cooldown: 12, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'scree_skitter', count: 2, maxActive: 4 },
    effects: [],
    ai: { range: 600, weight: 1.4, keepDistance: 320 },
  },
  stridulate: {
    id: 'stridulate', name: 'Stridulation', noDrop: true,
    description: "Raises a droning call that grants Furor to allies in a wide radius around the caster.",
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#e8c878',
    manaCost: 12, cooldown: 12, useTime: 0.8,
    delivery: { type: 'nova', radius: 260, affects: 'allies' },
    effects: [{ type: 'status', status: 'furor', chance: 1 }],
    ai: { range: 300, weight: 2, keepDistance: 220 },
  },
  lay_grub_clutch: {
    id: 'lay_grub_clutch', name: 'Lay Grub Clutch',
    description: "Place a destructible grub clutch (up to 3 active at once) that hatches into giant maggots after 8 seconds.",
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#d0c8a8',
    manaCost: 14, cooldown: 10, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_lay_grub_clutch',
      range: 0, duration: 8, maxActive: 3, life: 45, placeRange: 90,
      hatch: { skillId: 'egg_hatch_maggots' },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 240, weight: 2, keepDistance: 180 },
  },
  egg_hatch_maggots: {
    id: 'egg_hatch_maggots', name: 'The Eggs Hatch', noDrop: true,
    description: "Hatch 2 giant maggots from the clutch, up to 8 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#d0c8a8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'giant_maggot', count: 2, maxActive: 8 },
    effects: [],
  },

  // ======================= The verdant kit =================================
  // Plant-craft: gardens as violence. Seeds with schedules, fences that
  // scratch, tides of bramble — Entangle's lashes above are the family's
  // eldest; Grasping Chasm (the fissure section) its patient cousin.

  strangler_seed: {
    id: 'strangler_seed', name: 'Strangler Seed',
    description: "Plants a seed at the target location (up to 3 active seeds) that blooms after 1.4 seconds—or immediately if struck—into grasping vines that deal physical and chaos damage, ensnare nearby enemies, and have a chance to inflict bleed.",
    tags: ['spell', 'chaos', 'physical', 'totem', 'aoe', 'duration'], color: '#7fae4a',
    manaCost: 14, cooldown: 5, useTime: 0.6,
    baseDamage: { physical: [6, 10], chaos: [4, 7] },
    delivery: {
      // A pod on a 1.4s incubation — killed pods HATCH (onBreak: the
      // powder rule): the garden does not accept editorial feedback.
      type: 'construct', kind: 'pod', look: 'device_strangler_seed',
      range: 0, duration: 1.4, maxActive: 3, life: 30,
      placeRange: 340,
      hatch: { skillId: 'vine_bloom', onBreak: 'hatch' },
    },
    // The pod itself never swings — the bloom carries the ring's dice — but
    // the seed's OWN roll must resolve for grafted construct-fx hits (pulse/
    // spray gems), or those supports read as live and deal ZERO (the
    // bramble_hedge family pattern; the content validator's catch).
    effects: [{ type: 'damage' }],
    requirements: { willpower: 16 },
    ai: { range: 300, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  vine_bloom: {
    id: 'vine_bloom', name: 'Vine Bloom', noDrop: true,
    description: "Erupts grasping vines in a ring that deal physical and chaos damage, ensnare enemies for 1.4 seconds, and have a 35% chance to inflict bleed.",
    tags: ['spell', 'chaos', 'physical', 'aoe'], color: '#6f9e3a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [10, 16], chaos: [6, 9] },
    delivery: { type: 'ground', radius: 120, castRange: 9999, delay: 0.1 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 1, durationOverride: 1.4 },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 0.3 },
    ],
  },

  bramble_hedge: {
    id: 'bramble_hedge', name: 'Bramble Hedge',
    description: "Raises a wall of 6 thorned bramble segments for 12 seconds that blocks movement and deals physical damage with a 50% chance to bleed against enemies that touch it. Takes increased damage from fire and from your own attacks, bursting into thorns when a segment breaks.",
    tags: ['spell', 'physical', 'totem', 'duration', 'aoe'], color: '#5a8a3a',
    manaCost: 15, cooldown: 7, useTime: 0.6,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_bramble_hedge',
      range: 0, duration: 12, maxActive: 12, life: 38,
      placeRange: 320,
      wallSegments: 6,
      breakable: { ownerMult: 2, affinityTags: ['fire'], affinityMult: 2.5 },
      deathBurst: { impactFx: 'mechanic:deathBrambles', radius: 70, damageScale: 0.7 },
      clearway: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.5, magnitude: 0.35 },
    ],
    requirements: { willpower: 14, dexterity: 12 },
    ai: { range: 260, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  creeping_thicket: {
    id: 'creeping_thicket', name: 'Creeping Thicket',
    description: "Sends a wave of brambles forward that widens as it travels, dealing physical and chaos damage with a 25% chance to ensnare and a 30% chance to inflict bleed.",
    tags: ['spell', 'physical', 'chaos', 'aoe', 'duration'], color: '#6a9a4a',
    manaCost: 15, cooldown: 6, useTime: 0.7,
    baseDamage: { physical: [6, 9], chaos: [2, 4] },
    delivery: {
      type: 'ground', radius: 60, castRange: 80, delay: 0.1,
      lingerDuration: 3.2, tickInterval: 0.45,
      drift: 110, grow: 30,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 0.25, durationOverride: 0.8 },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { willpower: 16, dexterity: 10 },
    ai: { range: 140, weight: 2 },
  },

  rune_of_power: {
    tree: RUNEWEAVER_STARTER_TREES.rune_of_power,
    id: 'rune_of_power', name: 'Rune of Power',
    description: "Inscribe a stationary rune at your feet for 8 seconds that grants allies standing inside 25% increased spell damage and 15% increased cast speed.",
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#7a9aff',
    manaCost: 20, cooldown: 10, useTime: 0.6,
    delivery: {
      type: 'ground', radius: 110, castRange: 200,
      lingerDuration: 8, tickInterval: 9,
      domain: {
        allyMods: [
          mod('damage', 'increased', 0.25, ['spell']),
          mod('castSpeed', 'increased', 0.15),
        ],
      },
    },
    effects: [],
    requirements: { intelligence: 18 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.05)] },
  },

  toxic_domain: {
    id: 'toxic_domain', name: 'Toxic Domain',
    description: "Creates a toxic field for 6 seconds that slows enemies inside by 15%, causes them to take 12% more damage, and pulses chaos damage with a 40% chance to poison.",
    tags: ['spell', 'chaos', 'aoe', 'duration', 'curse'], color: '#8a5ad0',
    manaCost: 22, cooldown: 9, useTime: 0.8,
    baseDamage: { chaos: [3, 5] },
    delivery: {
      type: 'ground', radius: 120, castRange: 400,
      lingerDuration: 6, tickInterval: 0.6,
      domain: {
        enemyMods: [
          mod('damageTaken', 'more', 0.12),
          mod('moveSpeed', 'more', -0.15),
        ],
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.4, magnitude: 0.4 },
    ],
    requirements: { willpower: 20, intelligence: 14 },
    ai: { range: 370, weight: 2, keepDistance: 260 },
  },

  // ======================= The fume doctrine ===============================
  // Exposure-gated dominions: influence that SOAKS IN with the breath
  // (exposure + exposureDomain) instead of switching on at the rim —
  // Toxic Cloud is the family's teeth; these two are its politics.

  soporific_veil: {
    id: 'soporific_veil', name: 'Soporific Veil',
    description: "Conjure a non-damaging fog cloud for 5 seconds. Enemies that remain inside for 1.2 seconds have 35% less movement speed, 20% less attack and cast speed, and take 10% more damage while inside.",
    tags: ['spell', 'chaos', 'aoe', 'duration', 'curse'], color: '#b8a8d8',
    manaCost: 16, cooldown: 8, useTime: 0.7,
    delivery: {
      // A pure fume DOMAIN: no impact, no ticks (the interval outlives the
      // linger — the rune_of_power trick); the stupor is the whole skill,
      // and it takes 1.2s of breathing to set in (exposureDomain).
      type: 'ground', radius: 130, castRange: 380,
      lingerDuration: 5, tickInterval: 9,
      noImpact: true, exposure: 1.2, exposureDomain: true,
      domain: {
        enemyMods: [
          mod('moveSpeed', 'more', -0.35),
          mod('attackSpeed', 'more', -0.2),
          mod('castSpeed', 'more', -0.2),
          mod('damageTaken', 'more', 0.1),
        ],
      },
    },
    effects: [],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 350, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05), mod('effectDuration', 'increased', 0.06)] },
  },

  thurible: {
    id: 'thurible', name: 'Thurible',
    description: "Surround yourself with a consecrated smoke aura for 9 seconds. Allies who remain inside for 1 second gain 15% increased damage, 8% increased attack and cast speed, and +4 life regeneration per second.",
    tags: ['spell', 'aoe', 'duration', 'buff'], color: '#e8d8a8',
    manaCost: 20, cooldown: 12, useTime: 0.6,
    delivery: {
      // The worn incense: a follow field whose DOMAIN soaks in on the
      // exposure clock — allies bathe a full second before the blessing
      // takes, and it strips the instant they step off the smoke.
      type: 'ground', radius: 120, castRange: 0,
      lingerDuration: 9, tickInterval: 10,
      noImpact: true, follow: true,
      exposure: 1.0, exposureDomain: true,
      domain: {
        allyMods: [
          mod('damage', 'increased', 0.15),
          mod('attackSpeed', 'increased', 0.08),
          mod('castSpeed', 'increased', 0.08),
          mod('lifeRegen', 'flat', 4),
        ],
      },
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 120, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.04)] },
  },

  barrage: {
    id: 'barrage', name: 'Barrage',
    description: "After a brief windup, fire a rapid salvo of 4 projectiles that tracks your cursor as it fires.",
    tags: ['attack', 'projectile', 'physical'], color: '#c8b878',
    manaCost: 8, cooldown: 0, useTime: 0.55,
    // Mobile windup: crank while walking at 30%.
    castMove: 0.3,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'projectile', speed: 640, radius: 5, range: 520,
      count: 4, fire: 'salvo', salvoInterval: 0.08,
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 18 },
    ai: { range: 480, weight: 2, keepDistance: 300 },
  },

  // ======================= Cursor-space casting =============================
  // The cursor is a combat surface: skills that materialize AT the mark
  // (origin 'cursor'), missiles that CHASE the live cursor (the guide axis),
  // and a rift that spews cursor-chasers of its own.

  cold_spot: {
    id: 'cold_spot', name: 'Cold Spot',
    description: "Materializes a shard of ice at your cursor that flies forward and explodes at the end of its path, dealing cold damage with a 50% chance to chill.",
    tags: ['spell', 'cold', 'projectile'], color: '#9adce8',
    manaCost: 11, cooldown: 0, useTime: 0.6,
    baseDamage: { cold: [10, 16] },
    delivery: {
      type: 'projectile', speed: 300, radius: 9, range: 260,
      origin: 'cursor', originRange: 420,
      explode: { radius: 70, damageScale: 0.6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  arcane_missiles: {
    id: 'arcane_missiles', name: 'Arcane Missiles',
    description: "Channel while moving at 40% reduced speed to fire a continuous stream of lightning missiles that weave toward your cursor, each with a 15% chance to shock.",
    tags: ['spell', 'lightning', 'projectile', 'channel'], color: '#b08ae8',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.18, move: 'slowed', moveFactor: 0.6, trackAim: true },
    baseDamage: { lightning: [4, 7] },
    delivery: {
      type: 'projectile', speed: 340, radius: 6, range: 900,
      trajectory: { guide: 3.2, erratic: 0.8 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.15 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  hell_rift: {
    id: 'hell_rift', name: 'Hell Rift',
    description: "Open a rift at the target location for 6 seconds (up to 2 active at once) that fires homing fire missiles toward your cursor.",
    // 'totem' = the deployed-object umbrella tag (totem supports apply,
    // and Spirit Totem correctly refuses a construct-delivery host).
    tags: ['spell', 'fire', 'projectile', 'duration', 'totem'], color: '#ff6a3a',
    manaCost: 26, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'eruptor', look: 'device_hell_rift', castSkillId: 'hellfire_missile',
      range: 500, duration: 6, maxActive: 2, invulnerable: true,
      placeRange: 380, interval: 0.35,
    },
    effects: [],
    requirements: { intelligence: 26 },
    ai: { range: 360, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1), mod('effectDuration', 'increased', 0.05)] },
  },

  // Hell Rift's ordnance (and a fine emit payload for anything else).
  hellfire_missile: {
    id: 'hellfire_missile', name: 'Hellfire Missile', noDrop: true,
    description: "Fires a weaving bolt of riftfire that explodes on impact for fire damage with an 11% chance to ignite.",
    tags: ['spell', 'fire', 'projectile'], color: '#ff7a3a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [6, 10] },
    delivery: {
      type: 'projectile', speed: 320, radius: 7, range: 800,
      trajectory: { guide: 2.2, erratic: 2 },
      explode: { radius: 55, damageScale: 0.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
  },

  mirage_archer: {
    id: 'mirage_archer', name: 'Mirage Archer',
    description: "Conjure an untargetable mirage at your shoulder for 12 seconds that periodically fires spectral arrows at nearby enemies for 75% of your damage.",
    tags: ['attack', 'projectile', 'mirage', 'duration', 'totem'], color: '#8fd4c8',
    manaCost: 22, cooldown: 5, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'echo', castSkillId: 'mirage_shot',
      range: 480, duration: 12, maxActive: 1, invulnerable: true,
      echo: {
        mode: 'hover', count: 1, duration: 12, interval: 0.9,
        range: 480, glideSpeed: 340, hoverRadius: 46, damageFactor: 0.75,
      },
    },
    effects: [],
    requirements: { dexterity: 18 },
    ai: { range: 420, weight: 2, keepDistance: 240 },
    leveling: {
      perLevel: [mod('mirageDamage', 'increased', 0.08), mod('effectDuration', 'increased', 0.05)],
    },
    thresholds: [
      { level: 8, label: 'Keener mirage', mods: [mod('constructCastRate', 'increased', 0.25)] },
      { level: 11, label: 'A second archer', mods: [mod('mirageCount', 'flat', 1)] },
    ],
  },

  // The archer's arrow — a noDrop kit piece (the hellfire_missile precedent).
  mirage_shot: {
    id: 'mirage_shot', name: 'Mirage Shot', noDrop: true,
    description: "Fire a straight-flying physical arrow from your mirage.",
    tags: ['attack', 'projectile', 'physical'], color: '#8fd4c8',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 12] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 560 },
    effects: [{ type: 'damage' }],
  },

  shadow_clone: {
    tree: BOND_STARTER_TREES.shadow_clone,
    id: 'shadow_clone', name: 'Shadow Clone',
    description: "Dash backward in smoke, leaving a destructible shadow clone for 8 seconds that mirrors your attacks from its position for 35% of your damage.",
    tags: ['spell', 'clone', 'duration', 'totem'], color: '#6f5f9e',
    manaCost: 32, cooldown: 10, useTime: 0.4,
    delivery: {
      type: 'construct', kind: 'echo', range: 0, duration: 8, maxActive: 1,
      life: 30,
      echo: {
        mode: 'mimic', count: 1, duration: 8, interval: 0.9,
        damageFactor: 0.35, substitute: 64,
      },
    },
    effects: [],
    requirements: { dexterity: 14, intelligence: 8 },
    leveling: {
      perLevel: [mod('mirageDamage', 'increased', 0.06), mod('minionLife', 'increased', 0.08)],
    },
    thresholds: [
      { level: 6, label: 'Lingering shadow', mods: [mod('effectDuration', 'increased', 0.25)] },
      // Skill-local minionMaxCount rides along so Twin Shadows also grants
      // a second VESSEL when the clone is fleshed (the summon-graft cap).
      { level: 8, label: 'Twin shadows', mods: [mod('mirageCount', 'flat', 1), mod('minionMaxCount', 'flat', 1)] },
      { level: 12, label: 'Perfect mimicry', mods: [mod('mirageDamage', 'increased', 0.3)] },
    ],
  },

  // The Shadow Self's kit (Vessel of Shadow's fleshed clone) — noDrop.
  shadow_shuriken: {
    id: 'shadow_shuriken', name: 'Shadow Shuriken', noDrop: true,
    description: "Throw a straight-flying physical shuriken from your shadow clone.",
    tags: ['attack', 'projectile', 'physical'], color: '#4a4066',
    manaCost: 0, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 540, radius: 5, range: 420 },
    effects: [{ type: 'damage' }],
    ai: { range: 380, weight: 2, keepDistance: 200 },
  },

  shadow_slash: {
    id: 'shadow_slash', name: 'Shadow Slash', noDrop: true,
    description: "Sweep a wide frontal melee arc of physical damage from your shadow clone.",
    tags: ['attack', 'melee', 'physical'], color: '#4a4066',
    manaCost: 0, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'melee', range: 55, arcDeg: 110 },
    effects: [{ type: 'damage' }],
    ai: { range: 60, weight: 3 },
  },

  reap: {
    tree: NECROMANCER_RITES.reap,
    id: 'reap', name: 'Reap',
    description: "Project a sweeping scythe crescent forward that deals physical and chaos damage once to each enemy it passes through, traveling farther with increased skill effect duration.",
    tags: ['attack', 'melee', 'physical', 'chaos', 'aoe', 'duration', 'sweep'], color: '#9a5ad8',
    manaCost: 11, lifeCost: 3, cooldown: 1.2, useTime: 0.8,
    baseDamage: { physical: [11, 16], chaos: [5, 8] },
    delivery: {
      type: 'ground', radius: 92, castRange: 0, delay: 0,
      lingerDuration: 0.5, tickInterval: 0, drift: 460,
      hitOnce: true, shape: 'crescent', arcDeg: 120,
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 16, intelligence: 10 },
    ai: { range: 220, weight: 2 },
  },

  // Pure composition: a full turn played as an aim-sequence figure — with
  // Sweeping Blow socketed, it becomes a six-way radial wave burst.
  whirling_reap: {
    tree: NECROMANCER_RITES.whirling_reap,
    id: 'whirling_reap', name: 'Whirling Reap',
    description: "Spin a full circle of 6 melee scythe arcs around yourself, dealing physical damage to all nearby enemies.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#c8a05e',
    manaCost: 10, cooldown: 2.5, useTime: 0.65,
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'melee', range: 62, arcDeg: 110 },
    aim: { sequence: { steps: [0, 60, 120, 180, 240, 300], pause: 0.05 } },
    effects: [{ type: 'damage' }],
    requirements: { strength: 18 },
    ai: { range: 70, weight: 2 },
  },

  summon_raging_spirit: {
    tree: NECROMANCER_TREES.summon_raging_spirit,
    id: 'summon_raging_spirit', name: 'Summon Raging Spirit',
    description: "Summon a flaming skull for 5 seconds (up to 20 active at once) that rushes and attacks nearby enemies.",
    tags: ['spell', 'summon', 'minion', 'fire', 'duration'], color: '#ff8a4a',
    manaCost: 7, cooldown: 0, useTime: 0.5,
    delivery: {
      type: 'summon', monsterId: 'raging_spirit',
      count: 1, maxActive: 20, poolGroup: 'raging_spirit', duration: 5,
    },
    effects: [],
    requirements: { intelligence: 16 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.14)] },
  },

  // The channel twin: pulses mint spirits whose damage RAMPS quadratically
  // with the hold (the spawn-time dmgMult rides spawnMinion's ramp source).
  spirit_pyre: {
    tree: NECROMANCER_SACRAMENTS.spirit_pyre,
    id: 'spirit_pyre', name: 'Spirit Pyre',
    description: "Channel while moving at 45% reduced speed to continuously summon Raging Spirits (up to the shared limit of 20). Spirits summoned later in the channel gain up to triple damage and size.",
    tags: ['spell', 'summon', 'minion', 'fire', 'channel', 'duration'], color: '#ff6a2a',
    manaCost: 5, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.4, windup: 0.4, move: 'slowed', moveFactor: 0.55, trackAim: false,
      ramp: { per: 0.12, max: 2.0, curve: 'quadratic' },
    },
    delivery: {
      type: 'summon', monsterId: 'raging_spirit',
      count: 1, maxActive: 20, poolGroup: 'raging_spirit', duration: 5,
    },
    effects: [],
    requirements: { intelligence: 22 },
    ai: { range: 400, weight: 1, keepDistance: 260 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.14)] },
  },

  summon_wraith: {
    tree: NECROMANCER_TREES.summon_wraith,
    id: 'summon_wraith', name: 'Summon Wraith',
    description: "Summon a decay wraith, up to 6 active at once. After 4 seconds, the wraith begins losing 4% of its life per second at a compounding rate until it expires.",
    tags: ['spell', 'summon', 'minion', 'chaos'], color: '#8a6ad8',
    manaCost: 22, cooldown: 0, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'decay_wraith',
      count: 1, maxActive: 6,
      decay: { delay: 4, frac: 0.04, growth: 1.35 },
    },
    effects: [],
    requirements: { intelligence: 20 },
    ai: { range: 420, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('minionLife', 'increased', 0.10)] },
  },

  infernal_bombardment: {
    id: 'infernal_bombardment', name: 'Infernal Bombardment',
    description: "Call down 4 waves of 2 demons at your cursor's position that rush nearby enemies and detonate, or expire after 6 seconds.",
    tags: ['spell', 'summon', 'minion', 'fire', 'aoe'], color: '#e84a2a',
    manaCost: 30, cooldown: 6, useTime: 0.7,
    delivery: {
      type: 'summon', monsterId: 'bombard_demon',
      count: 2, maxActive: 16, duration: 6,
      placeAt: { at: 'cursor', range: 550, scatter: 70 },
      // #43: each later wave re-bills half the cost — dry pockets fizzle it.
      waves: { count: 4, interval: 0.8, trackAim: true, costFactor: 0.5 },
    },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { intelligence: 24 },
    ai: { range: 480, weight: 2, keepDistance: 320 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.12), mod('minionLife', 'increased', 0.08)] },
  },

  archon_lance: {
    id: 'archon_lance', name: 'Archon Lance',
    description: "Fire a lightning lance that spends an additional 6% of your maximum mana and gains 1 added lightning damage per point of mana spent, with a 30% chance to shock.",
    tags: ['spell', 'lightning', 'projectile'], color: '#6a9aff',
    manaCost: 8, cooldown: 0, useTime: 0.8,
    costScaling: { manaPctMax: 0.06 },
    innateMods: [mod('costDamage_mana', 'flat', 1.0)],
    baseDamage: { lightning: [8, 13] },
    delivery: { type: 'projectile', speed: 430, radius: 10, range: 540 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 26 },
    ai: { range: 480, weight: 2, keepDistance: 340 },
    leveling: { perLevel: [mod('damage', 'increased', 0.10), mod('costDamage_mana', 'flat', 0.08)] },
  },

  sanguine_burst: {
    tree: NECROMANCER_SACRAMENTS.sanguine_burst,
    id: 'sanguine_burst', name: 'Sanguine Burst',
    description: "Spend 4% of your maximum life in addition to the base life cost to release a physical blood nova around you that gains added physical damage equal to 90% of the life spent, with a 40% chance to inflict Bleed.",
    tags: ['spell', 'physical', 'aoe'], color: '#c02848',
    manaCost: 0, lifeCost: 14, cooldown: 1.5, useTime: 0.7,
    costScaling: { lifePctMax: 0.04 },
    innateMods: [mod('costDamage_life', 'flat', 0.9)],
    baseDamage: { physical: [12, 18] },
    delivery: { type: 'nova', radius: 110 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.4, magnitude: 0.35 },
    ],
    requirements: { strength: 16, willpower: 16 },
    ai: { range: 100, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.10), mod('costDamage_life', 'flat', 0.07)] },
  },

  convocation: {
    id: 'convocation', name: 'Convocation',
    description: "Teleport all of your mobile minions to your side and heal them for 1.5% of their maximum life per second for 2 seconds.",
    tags: ['spell', 'minion', 'buff', 'duration'], color: '#8ae0a0',
    manaCost: 12, cooldown: 8, useTime: 0.35,
    delivery: { type: 'self' },
    effects: [
      { type: 'recallMinions' },
      {
        type: 'buff', affects: 'minions', id: 'convocation_mend', duration: 2,
        mods: [mod('lifeRegenPct', 'flat', 0.015)],
      },
    ],
    requirements: { intelligence: 14 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('cooldownRecovery', 'increased', 0.05)] },
  },

  overclock: {
    id: 'overclock', name: 'Overclock',
    description: "Toggle to allow casting skills even when you lack sufficient mana by reserving the unpaid mana cost up to 50% of your maximum mana. Reserved debt begins recovering after 2.5 seconds without overdrafting, and Overclock cannot be toggled off until the debt clears.",
    tags: ['spell', 'aura', 'overdrive', 'buff'], color: '#6a9aff',
    manaCost: 0, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle', aura: { radius: 10 },
      overdrive: { lane: 'mana', cap: 0.5, idleDelay: 2.5, recoveryPct: 0.18, recoveryFlat: 3 },
    },
    effects: [],
    requirements: { intelligence: 18 },
    thresholds: [
      { level: 12, label: 'Deeper credit', mods: [mod('overdriveCap', 'increased', 0.1)] },
      { level: 16, label: 'Prompt payments', mods: [mod('overdriveIdleDelay', 'increased', -0.3)] },
    ],
  },

  blood_mortgage: {
    tree: DISCIPLINE_STARTER_TREES.blood_mortgage,
    id: 'blood_mortgage', name: 'Blood Mortgage',
    description: "Toggle to allow paying life costs you cannot afford by temporarily reducing your maximum life by up to 40%. After 3 seconds without borrowing, the mortgaged life recovers through your life regeneration and melee hits.",
    tags: ['spell', 'aura', 'overdrive', 'buff'], color: '#c02848',
    manaCost: 0, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle', aura: { radius: 10 },
      overdrive: { lane: 'life', cap: 0.4, idleDelay: 3, regenFactor: 0.75 },
    },
    effects: [],
    requirements: { strength: 18 },
    thresholds: [
      { level: 12, label: 'Deeper veins', mods: [mod('overdriveCap', 'increased', 0.1)] },
      { level: 16, label: 'Swift metabolism', mods: [mod('overdriveLifeFactor', 'increased', 0.25)] },
    ],
  },

  // ======================= The charge economy ===============================
  // Passive charge TAPS baked into equipped skills (ChargeGainSpec), charge
  // PERSONALITIES from the registry (per-charge mods, decay, one-way drains
  // — see engine/charges.ts), and AMMUNITION buffs that spend a stack per
  // imbued use. All caps ride the chargeCap stat.

  berserk: {
    id: 'berserk', name: 'Berserk',
    description: "Toggle while below 50% life to sacrifice 3.5% of your life per second and gain 15% more attack damage, 10% increased attack speed, and 3% life leech. Hits while Berserk grant up to 10 Rage charges, further increasing attack speed and flat attack damage.",
    tags: ['spell', 'aura', 'buff', 'physical'], color: '#e04030',
    manaCost: 0, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 12,
        // Bearer-only: the degen is heavy and the LEECH is the offset —
        // the zerker sustains by swinging, never by standing.
        selfMods: [
          mod('damage', 'more', 0.15, ['attack']),
          mod('attackSpeed', 'increased', 0.1),
          mod('lifeLeech', 'flat', 0.03),
        ],
      },
      upkeep: { lifeFractionPerSec: 0.035 },
      // The red refuses a healthy host: off-presses fail above 50% life.
      lockAboveLife: 0.5,
    },
    // Rage only flows while the toggle burns (see CHARGE_DEFS.rage for the
    // per-charge payoff and the 1/s cool-down after 3s without a blow).
    chargeGain: [{ charge: 'rage', amount: 1, max: 10, on: 'hit', whileToggled: true }],
    effects: [],
    requirements: { strength: 16 },
    thresholds: [
      { level: 12, label: 'Deeper red', mods: [mod('chargeCap', 'flat', 2)] },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.06, ['attack'])] },
  },

  bloodlust: {
    id: 'bloodlust', name: 'Bloodlust',
    description: "Passively gain 1 Bloodlust charge per second and 1 per kill, up to 20 charges. Activate with at least 5 charges to drain 2 charges per second, granting increased speed and damage per remaining charge until empty.",
    tags: ['spell', 'buff', 'physical', 'instant'], color: '#c02848',
    manaCost: 0, cooldown: 3, useTime: 0,
    // Builds while equipped; needs 5 banked to unleash but consumes none —
    // the DRAIN effect burns them down instead (gains blocked while it runs).
    chargeGain: [
      { charge: 'bloodlust', amount: 1, max: 20, on: 'second' },
      { charge: 'bloodlust', amount: 1, max: 20, on: 'kill' },
    ],
    chargeCost: { charge: 'bloodlust', amount: 0, minimum: 5 },
    delivery: { type: 'self' },
    effects: [{ type: 'drainCharge', charge: 'bloodlust', perSec: 2 }],
    requirements: { strength: 12, dexterity: 12 },
    thresholds: [
      { level: 12, label: 'Deeper thirst', mods: [mod('chargeCap', 'flat', 5)] },
    ],
    leveling: { perLevel: [mod('chargeCap', 'flat', 0.5)] },
  },

  soul_harvest: {
    id: 'soul_harvest', name: 'Soul Harvest',
    description: "Nearby enemy deaths and hits against rare or unique enemies grant up to 12 Souls that decay slowly over time. Activate to consume all Souls and unleash a chaos and cold nova that deals 35% more damage per Soul consumed with a 30% chance to chill.",
    tags: ['spell', 'chaos', 'cold', 'aoe'], color: '#9a86e8',
    manaCost: 10, cooldown: 2, useTime: 0.6,
    // The passive IS the skill: deaths near you bank fuel while it's equipped
    // — and elite bodies pay per landed blow (the boss lane: a fight with
    // nothing dying still feeds the reliquary).
    chargeGain: [
      { charge: 'soul', amount: 1, max: 12, on: 'enemyDeath', radius: 420 },
      { charge: 'soul', amount: 1, max: 12, on: 'hit', eliteVictim: true },
    ],
    chargeCost: { charge: 'soul', amount: 'all', minimum: 1, damagePerCharge: 0.35 },
    baseDamage: { chaos: [8, 13], cold: [4, 7] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.3 },
    ],
    requirements: { willpower: 18, intelligence: 12 },
    thresholds: [
      { level: 12, label: 'Wider hunger', mods: [mod('chargeCap', 'flat', 4)] },
    ],
    ai: { range: 110, weight: 2 },
  },

  flame_imbuement: {
    id: 'flame_imbuement', name: 'Flame Imbuement',
    description: "Imbue your weapons for up to 20 seconds, causing your next 6 attacks to deal 8 added fire damage with a 35% chance to ignite.",
    tags: ['spell', 'fire', 'buff', 'duration'], color: '#ff8a3a',
    manaCost: 12, cooldown: 8, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'flame_imbue', duration: 20,
      maxStacks: 6, stacksOnApply: 6,
      // Tag-filtered mods + the same tags on consumeOnUse = "the next X
      // attack uses are imbued". (The granting skill is a 'spell' — it can
      // never eat its own first round.)
      mods: [mod('addedFire', 'flat', 8, ['attack']), mod('apply_burn', 'flat', 0.35, ['attack'])],
      consumeOnUse: { tags: ['attack'] },
    }],
    requirements: { intelligence: 14, strength: 10 },
    leveling: { perLevel: [mod('addedFire', 'flat', 2, ['attack'])] },
  },

  venom_ammunition: {
    id: 'venom_ammunition', name: 'Venom Ammunition',
    description: "Load envenomed ammunition for up to 25 seconds, causing your next 8 projectile attacks to deal 6 added chaos damage with a 50% chance to poison.",
    tags: ['spell', 'chaos', 'buff', 'duration'], color: '#7ec850',
    manaCost: 12, cooldown: 8, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'venom_ammo', duration: 25,
      maxStacks: 8, stacksOnApply: 8,
      mods: [mod('addedChaos', 'flat', 6, ['projectile']), mod('apply_poison', 'flat', 0.5, ['projectile'])],
      consumeOnUse: { tags: ['projectile'] },
    }],
    requirements: { dexterity: 14, willpower: 10 },
    leveling: { perLevel: [mod('addedChaos', 'flat', 1.5, ['projectile'])] },
  },

  hurricane: {
    id: 'hurricane', name: 'Hurricane',
    description: "Channel while moving at 45% of normal speed to surround yourself with a ring of wind and lightning that damages enemies along its outer edge with a 30% chance to shock, expanding up to 60% larger as you channel.",
    tags: ['spell', 'lightning', 'aoe', 'channel'], color: '#d8e87a',
    manaCost: 5, cooldown: 0, useTime: 0.3,
    castMode: 'channel',
    channel: {
      interval: 0.3, move: 'slowed', moveFactor: 0.45,
      rampAoe: { per: 0.4, max: 1.6 },
    },
    baseDamage: { lightning: [6, 13] },
    delivery: { type: 'nova', radius: 90, edgeOnly: 0.55 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 150, weight: 2 },
  },

  eye_of_the_storm: {
    id: 'eye_of_the_storm', name: 'Eye of the Storm',
    description: "Surround yourself with a storm aura for 8 seconds that deals continuous lightning damage to nearby enemies and grants +5 mana regeneration per second to you and nearby allies.",
    tags: ['spell', 'lightning', 'aura', 'buff', 'duration'], color: '#f0e87a',
    manaCost: 22, cooldown: 12, useTime: 0.4,
    delivery: {
      type: 'aura', mode: 'duration', duration: 8,
      aura: {
        radius: 150,
        allyMods: [mod('manaRegen', 'flat', 5)],
        enemyDps: { amount: 8, type: 'lightning' },
      },
    },
    effects: [],
    requirements: { intelligence: 22, willpower: 12 },
    ai: { range: 160, weight: 1 },
  },

  // --- Five of the house's own design ----------------------------------------

  thunderclap: {
    id: 'thunderclap', name: 'Thunderclap',
    description: "Release an instant lightning burst around yourself that knocks enemies back with a 30% chance to stun.",
    tags: ['spell', 'lightning', 'aoe', 'instant'], color: '#fff0a0',
    manaCost: 11, cooldown: 3, useTime: 0,
    baseDamage: { lightning: [9, 18] },
    delivery: { type: 'nova', radius: 105 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 55 },
      { type: 'status', status: 'stun', chance: 0.3 },
    ],
    requirements: { intelligence: 18, strength: 10 },
    ai: { range: 95, weight: 2 },
  },

  overload: {
    id: 'overload', name: 'Overload',
    description: "Release a wide lightning nova that consumes Shock on enemies hit to deal 80% more damage against them.",
    tags: ['spell', 'lightning', 'aoe'], color: '#ffe96a',
    manaCost: 20, cooldown: 6, useTime: 0.7,
    baseDamage: { lightning: [14, 30] },
    shatterStatus: { statuses: ['shock'], mult: 1.8 },
    delivery: { type: 'nova', radius: 140 },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 26 },
    ai: { range: 120, weight: 2 },
  },

  static_field: {
    id: 'static_field', name: 'Static Field',
    description: "Toggle aura that reserves 30 mana to deal lightning damage per second to nearby enemies and cause them to take 15% more damage.",
    tags: ['spell', 'lightning', 'aura', 'buff'], color: '#e8dc6a',
    manaCost: 9, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 160,
        enemyMods: [mod('damageTaken', 'more', 0.15)],
        enemyDps: { amount: 3, type: 'lightning' },
      },
      upkeep: { reserveMana: 30 },
    },
    effects: [],
    requirements: { intelligence: 20, willpower: 12 },
  },

  galvanize: {
    id: 'galvanize', name: 'Galvanize',
    description: "For 10 seconds, convert 40% of your physical attack damage to lightning damage and gain 15% increased attack speed.",
    tags: ['spell', 'lightning', 'buff', 'duration'], color: '#f4e88a',
    manaCost: 14, cooldown: 10, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'galvanize', duration: 10,
      mods: [
        mod('convert_physical_lightning', 'flat', 0.4, ['attack']),
        mod('attackSpeed', 'increased', 0.15),
      ],
    }],
    requirements: { intelligence: 14, dexterity: 12 },
    ai: { range: 220, weight: 1 },
  },

  maelstrom_orb: {
    id: 'maelstrom_orb', name: 'Maelstrom Orb',
    description: "Launch a lightning orb that spirals outward around you, damaging enemies it passes through and zapping nearby targets every 0.4 seconds for 50% damage, with a 25% chance to shock.",
    tags: ['spell', 'lightning', 'projectile', 'aoe', 'duration'], color: '#f8e44a',
    manaCost: 22, cooldown: 7, useTime: 0.6,
    baseDamage: { lightning: [5, 13] },
    delivery: {
      type: 'projectile', speed: 240, radius: 11, range: 1400,
      rehit: 999, shape: 'octagon',
      // Widening tether = orbit + spiral (30 u/s = 1.25 × 240 × 0.1).
      trajectory: { orbit: 1, spiral: 1.25, orbitRadius: 60 },
      zap: { interval: 0.4, radius: 80, damageScale: 0.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.25 },
    ],
    requirements: { intelligence: 26 },
    ai: { range: 200, weight: 2 },
  },

  // ======================= The Fire archetype ===============================
  // Explosions, ignites, and things that get worse the longer they stand
  // there. Firebolt is the humble bolt; FIREBALL is the one that blooms.

  fireball: {
    id: 'fireball', name: 'Fireball',
    description: "Launch an orb of flame that explodes on impact, dealing 70% splash fire damage to nearby enemies with a 12% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff7a2a',
    manaCost: 12, cooldown: 0, useTime: 0.8,
    baseDamage: { fire: [14, 22] },
    delivery: {
      type: 'projectile', speed: 380, radius: 11, range: 440,
      explode: { radius: 85, damageScale: 0.7 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.35 },
    ],
    // Over-cap THRESHOLD (points stop at 10 — only +level gems reach it).
    thresholds: [
      { level: 11, label: 'Twinned blooms', mods: [mod('projectileCount', 'flat', 1)] },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 410, weight: 3, keepDistance: 270 },
  },

  combustion_strike: {
    id: 'combustion_strike', name: 'Combustion',
    description: "Requires a burning target. Consumes their Ignite to deal all of its remaining burn damage immediately and splash fire damage and Ignite to nearby enemies.",
    tags: ['spell', 'fire', 'aoe', 'targeted'], color: '#ff5a24',
    manaCost: 15, cooldown: 4, useTime: 0.5,
    baseDamage: { fire: [10, 15] },
    targeting: { target: 'enemy', requiresStatus: 'burn', consumesStatus: true, castRange: 380 },
    delivery: { type: 'target', splash: 120 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 1, magnitude: 0.4 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 360, weight: 2 },
  },

  flame_spear: {
    id: 'flame_spear', name: 'Flame Spear',
    description: "Charges and hurls a piercing spear of fire with an 18% chance to ignite targets hit. Press again during the timing window for an empowered throw.",
    tags: ['spell', 'fire', 'projectile'], color: '#ffb04a',
    manaCost: 14, cooldown: 2, useTime: 1.1,
    castMode: 'perfect',
    baseDamage: { fire: [22, 32] },
    delivery: { type: 'projectile', speed: 560, radius: 9, range: 520, pierce: 99, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.4 },
    ],
    requirements: { intelligence: 20, dexterity: 12 },
    ai: { range: 480, weight: 2, keepDistance: 320 },
  },

  flame_arrow: {
    tree: PACT_STEEL_STARTER_TREES.flame_arrow,
    id: 'flame_arrow', name: 'Flame Arrow',
    description: "Fire a flaming arrow that pierces up to 2 enemies with a 7% chance to ignite.",
    tags: ['spell', 'fire', 'projectile'], color: '#ff9646',
    manaCost: 4, cooldown: 0, useTime: 0.4,
    baseDamage: { fire: [6, 10] },
    delivery: { type: 'projectile', speed: 600, radius: 5, range: 400, pierce: 2 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.2, magnitude: 0.3 },
    ],
    requirements: { intelligence: 12 },
    ai: { range: 380, weight: 3, keepDistance: 260 },
  },

  flame_blast: {
    id: 'flame_blast', name: 'Flame Blast',
    description: "Channel while moving at 50% speed to charge a fiery core at your cursor, then release to detonate it with an 18% chance to ignite. Charging increases damage up to 400% of base and radius by up to 60%.",
    tags: ['spell', 'fire', 'aoe', 'channel', 'duration'], color: '#ff7030',
    manaCost: 5, cooldown: 3, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.4, windup: 0, move: 'slowed', moveFactor: 0.5, trackAim: true,
      // The pure GATHER: pulses only pay; the release ramp is the payload.
      release: {
        dmgRamp: { per: 0.5, max: 4, curve: 'quadratic' },
        aoeRamp: { per: 0.25, max: 1.6, curve: 'quadratic' },
        pulses: false, minHold: 0.25,
      },
    },
    baseDamage: { fire: [11, 17] },
    delivery: { type: 'ground', radius: 90, castRange: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.35 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  infernal_cannonade: {
    id: 'infernal_cannonade', name: 'Infernal Cannonade',
    description: "Repeatedly press the skill key during the cast to fire additional burning shells that explode on impact, dealing 60% splash damage with an 11% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff6a30',
    manaCost: 16, cooldown: 5, useTime: 1.3,
    castMode: 'multitude',
    baseDamage: { fire: [9, 14] },
    delivery: {
      type: 'projectile', speed: 420, radius: 9, range: 420,
      explode: { radius: 55, damageScale: 0.6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  volcano: {
    id: 'volcano', name: 'Volcano',
    description: "Hold up to 2.5 seconds to charge and release to raise a volcano (maximum 1 active) that lobs explosive magma boulders at nearby ground. Charging longer increases the volcano's duration and damage.",
    tags: ['spell', 'fire', 'aoe', 'duration', 'totem'], color: '#e0501e',
    manaCost: 30, cooldown: 12, useTime: 0.4,
    castMode: 'charge',
    chargeUp: { maxTime: 2.5, minScale: 0.7, maxScale: 2.2 },
    delivery: {
      type: 'construct', kind: 'eruptor', look: 'device_volcano', castSkillId: 'magma_glob',
      range: 240, duration: 5, maxActive: 1, life: 80, placeRange: 340,
      interval: 0.7,
    },
    effects: [],
    requirements: { intelligence: 28 },
    ai: { range: 320, weight: 1, keepDistance: 260 },
  },

  magma_glob: {
    id: 'magma_glob', name: 'Magma Glob', noDrop: true,
    description: "Lob a molten rock that explodes on impact, dealing area fire damage with a 12% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ff7a2a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [8, 13] },
    delivery: {
      type: 'projectile', speed: 300, radius: 8, range: 240,
      explode: { radius: 60, damageScale: 0.8 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.3 },
    ],
  },

  flame_core: {
    id: 'flame_core', name: 'Flame Core',
    description: "Conjure an untargetable mote of fire at your shoulder for 10 seconds (up to 2 active at once) that fires flame bolts at nearby enemies.",
    tags: ['spell', 'fire', 'summon', 'minion', 'duration'], color: '#ffc05a',
    manaCost: 24, cooldown: 9, useTime: 0.6,
    delivery: { type: 'summon', monsterId: 'flame_core', count: 1, maxActive: 2, duration: 10 },
    effects: [],
    requirements: { intelligence: 18, willpower: 14 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
  },

  solar_orb: {
    id: 'solar_orb', name: 'Solar Orb',
    description: "Conjure an untargetable solar orb overhead for 7 seconds (up to 1 active at a time) that deals continuous fire damage to enemies beneath it.",
    // 'totem' = the deployed-object umbrella tag (totem supports apply).
    tags: ['spell', 'fire', 'aoe', 'duration', 'aura', 'totem'], color: '#ffd24a',
    manaCost: 26, cooldown: 10, useTime: 0.7,
    delivery: {
      // aims:false — it hangs and radiates; a sun points at nothing.
      type: 'construct', kind: 'pylon', look: 'device_solar_orb', aims: false,
      range: 150, duration: 7, maxActive: 1, placeRange: 320, invulnerable: true,
      aura: { radius: 150, enemyDps: { amount: 9, type: 'fire' } },
    },
    effects: [],
    requirements: { intelligence: 24 },
    ai: { range: 300, weight: 1, keepDistance: 240 },
  },

  ignite: {
    tree: PACT_STEEL_STARTER_TREES.ignite,
    id: 'ignite', name: 'Ignite',
    description: "Immediately sets the target ablaze with a high-damage ignite.",
    tags: ['spell', 'fire', 'targeted', 'instant'], color: '#ff8838',
    manaCost: 7, cooldown: 1.5, useTime: 0,
    baseDamage: { fire: [4, 6] },
    targeting: { target: 'enemy', castRange: 360 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 1, magnitude: 1.6 },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 340, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.16)] },
  },

  flame_wreath: {
    id: 'flame_wreath', name: 'Flame Wreath',
    description: "Wreathe yourself in flame for 10 seconds, granting your attacks 9 added fire damage.",
    tags: ['spell', 'fire', 'buff', 'duration'], color: '#ff9e42',
    manaCost: 14, cooldown: 9, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'flame_wreath', duration: 10,
      mods: [mod('addedFire', 'flat', 9, ['attack'])],
    }],
    requirements: { intelligence: 14, strength: 10 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('addedFire', 'flat', 2, ['attack'])] },
  },

  living_bomb: {
    id: 'living_bomb', name: 'Living Bomb',
    description: "Strikes a target for fire damage and plants a volatile mark that detonates for area fire damage when it expires or when the target dies.",
    tags: ['spell', 'fire', 'aoe', 'targeted', 'duration'], color: '#ff5a3a',
    manaCost: 18, cooldown: 6, useTime: 0.6,
    baseDamage: { fire: [16, 24] },
    innateMods: [mod('curseRupture', 'flat', 2.2)],
    targeting: { target: 'enemy', castRange: 380 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'living_bomb', chance: 1 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 360, weight: 2, keepDistance: 280 },
  },

  pillar_of_flame: {
    tree: PACT_STEEL_STARTER_TREES.pillar_of_flame,
    id: 'pillar_of_flame', name: 'Pillar of Flame',
    description: "Raise a burning ring at the target location that sears enemies on its rim and contracts inward over 2.6 seconds, repeatedly dealing fire damage with a 14% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff6428',
    manaCost: 24, cooldown: 9, useTime: 0.8,
    baseDamage: { fire: [9, 14] },
    delivery: {
      type: 'ground', radius: 135, castRange: 420, delay: 0.35,
      lingerDuration: 3, tickInterval: 0.35,
      fillFrom: 0.85, fillTime: 2.6,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.35 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
  },

  flame_wall: {
    id: 'flame_wall', name: 'Flame Wall',
    description: "Create a wall of fire for 5 seconds that deals fire damage with a 60% chance to ignite enemies that cross it.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff7a36',
    manaCost: 17, cooldown: 7, useTime: 0.6,
    baseDamage: { fire: [5, 8] },
    delivery: {
      type: 'ground', radius: 26, castRange: 260,
      lingerDuration: 5, tickInterval: 0.4,
      line: { segments: 7, spacing: 36 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.6, magnitude: 0.4 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 240, weight: 1, keepDistance: 200 },
  },

  // --- Four of the house's own design ----------------------------------------

  phoenix_dive: {
    id: 'phoenix_dive', name: 'Phoenix Dive',
    description: "Leap untargetably to the target location and crash down in a fiery explosion that knocks nearby enemies back with a 60% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'movement'], color: '#ff8c3a',
    manaCost: 15, cooldown: 6, useTime: 0,
    baseDamage: { fire: [16, 24] },
    delivery: { type: 'leap', range: 300, airTime: 0.5, radius: 105 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.6, magnitude: 0.4 },
      { type: 'knockback', strength: 30 },
    ],
    requirements: { intelligence: 18, strength: 14 },
    ai: { range: 280, weight: 2 },
  },

  cinder_swarm: {
    id: 'cinder_swarm', name: 'Cinder Swarm',
    description: "Launch 4 to 6 fire projectiles that weave erratically in flight, each having an 11% chance to ignite.",
    tags: ['spell', 'fire', 'projectile'], color: '#ffae52',
    manaCost: 11, cooldown: 0, useTime: 0.6,
    baseDamage: { fire: [4, 7] },
    delivery: {
      type: 'projectile', speed: 340, radius: 6, range: 380,
      count: [4, 6], spreadDeg: 30,
      trajectory: { erratic: 6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.35 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 350, weight: 2, keepDistance: 240 },
  },

  backdraft: {
    id: 'backdraft', name: 'Backdraft',
    description: "Release a searing cone of fire that pulls enemies hit toward you with a 12% chance to ignite.",
    tags: ['spell', 'fire', 'aoe'], color: '#e8622c',
    manaCost: 13, cooldown: 4, useTime: 0.6,
    baseDamage: { fire: [11, 17] },
    delivery: { type: 'cone', range: 190, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: -80 }, // negative: dragged IN
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.35 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 170, weight: 2 },
  },

  trailblaze: {
    id: 'trailblaze', name: 'Trailblaze',
    description: "Dash forward in a streak of flame, leaving burning ground along your path for 2.5 seconds that deals fire damage over time with an 18% chance to ignite.",
    tags: ['spell', 'fire', 'movement', 'aoe', 'duration', 'instant'], color: '#ff9040',
    manaCost: 13, cooldown: 5, useTime: 0,
    baseDamage: { fire: [6, 10] },
    delivery: {
      type: 'dash', distance: 280, speed: 900, width: 0,
      trailZone: { radius: 34, duration: 2.5, tickInterval: 0.4, damageScale: 0.6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.35 },
    ],
    requirements: { intelligence: 16, dexterity: 12 },
  },

  // ======================= The Cold archetype ===============================
  // A full elemental theme: shatter projectiles, terrain-making impacts,
  // vortices, creeping fields, payload detonation, freeze-buildup combos,
  // and the frost counterparts of the guard tech.

  ice_spear: {
    id: 'ice_spear', name: 'Ice Spear',
    description: "Hurls a spear of ice with a 35% chance to chill that shatters on impact, firing 5 ice shards in a cone behind the target.",
    tags: ['spell', 'cold', 'projectile'], color: '#a8dcf0',
    manaCost: 9, cooldown: 0, useTime: 0.65,
    baseDamage: { cold: [11, 17] },
    delivery: {
      type: 'projectile', speed: 480, radius: 9, range: 420,
      shape: 'triangle',
      shatter: { skillId: 'glacial_shard', count: 5, spreadDeg: 70 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.35 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 400, weight: 3, keepDistance: 260 },
  },

  // Ice Spear's shrapnel (and a fine emit payload for anything else).
  glacial_shard: {
    id: 'glacial_shard', name: 'Glacial Shard', noDrop: true,
    description: "Fire a shard of ice from a shattered projectile that travels a short distance and deals cold damage with a 25% chance to chill.",
    tags: ['spell', 'cold', 'projectile'], color: '#c8ecf8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { cold: [4, 7] },
    delivery: { type: 'projectile', speed: 420, radius: 5, range: 170 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.25 },
    ],
  },

  // The Shrapnel support's generic shard — skills with an innate shatter
  // (Ice Spear) keep their own; the support only widens the fan.
  shrapnel_shard: {
    id: 'shrapnel_shard', name: 'Shrapnel', noDrop: true,
    description: "Fire a jagged splinter from a shattered projectile that travels a short distance and deals physical damage.",
    tags: ['projectile', 'physical'], color: '#c8c0b0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [5, 9] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 180 },
    effects: [{ type: 'damage' }],
  },

  icy_comet: {
    id: 'icy_comet', name: 'Icy Comet',
    description: "Call down an ice comet that lands after 0.9 seconds, dealing cold damage in a wide area with a 60% chance to chill and leaving slick ice ground for 6 seconds.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#8ec8ec',
    manaCost: 16, cooldown: 5, useTime: 0.8,
    baseDamage: { cold: [20, 30] },
    delivery: {
      // CELESTIAL (occlusion 'free'): called down from the sky.
      type: 'ground', radius: 95, castRange: 460, delay: 0.9, occlusion: 'free',
      leaveTerrain: { kind: 'ice', radius: 95, duration: 6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.6 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 430, weight: 2, keepDistance: 300 },
  },

  // --- THE WINTER KING's arena kit (the glacial heart) ----------------------
  // Three casts that INTERPLAY with the frozen-lake arena instead of merely
  // damaging: a shove the ice keeps carrying (traction momentum), a pull that
  // parks you where the blades come around (the track fabric), and a slick
  // that makes both worse. All three are ordinary rows through the one
  // pipeline — any future body may borrow them.

  winters_sweep: {
    id: 'winters_sweep', name: "Winter's Sweep",
    description: "Release a ring of frost and physical force around yourself that chills and knocks back all enemies hit.",
    tags: ['attack', 'cold', 'aoe'], color: '#bfe8ff',
    manaCost: 20, cooldown: 9, useTime: 1.15,
    baseDamage: { cold: [9, 14], physical: [8, 12] },
    delivery: { type: 'nova', radius: 175 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 1 },
      { type: 'knockback', strength: 190 },
    ],
    ai: { range: 155, weight: 3 },
  },

  call_of_the_deep: {
    id: 'call_of_the_deep', name: 'Call of the Deep',
    description: "Mark the ground to open a freezing vortex after 0.9 seconds that lasts 2.4 seconds, pulling nearby enemies inward while dealing periodic cold damage with a 50% chance to chill.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#7aa8c8',
    manaCost: 24, cooldown: 12, useTime: 0.9,
    baseDamage: { cold: [5, 8] },
    delivery: {
      type: 'ground', radius: 150, castRange: 430, delay: 0.9,
      lingerDuration: 2.4, tickInterval: 0.5, pull: 200, pullRadius: 280,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    ai: { range: 420, weight: 2, keepDistance: 150 },
  },

  glare_ice: {
    id: 'glare_ice', name: 'Glare Ice',
    description: "Coat the target area in slick ice for 9 seconds, dealing cold damage on impact with a 40% chance to chill and causing all units on it to slide.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#d8f2fc',
    manaCost: 18, cooldown: 10, useTime: 0.8,
    baseDamage: { cold: [4, 7] },
    delivery: {
      type: 'ground', radius: 130, castRange: 460, delay: 0.7, occlusion: 'free',
      leaveTerrain: { kind: 'ice', radius: 130, duration: 9 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.4 },
    ],
    ai: { range: 440, weight: 2 },
  },

  ice_shards: {
    id: 'ice_shards', name: 'Ice Shards',
    description: "Channel while moving at 40% reduced speed to fire bursts of 2–3 ice shards in a fan, each with a 15% chance to chill.",
    tags: ['spell', 'cold', 'projectile', 'channel'], color: '#b8e4f4',
    manaCost: 3, cooldown: 0, useTime: 0.16,
    castMode: 'channel',
    channel: { interval: 0.16, move: 'slowed', moveFactor: 0.6 },
    baseDamage: { cold: [3, 6] },
    delivery: {
      type: 'projectile', speed: 460, radius: 5, range: 330,
      count: [2, 3], spreadDeg: 22,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.15 },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 300, weight: 2, keepDistance: 220 },
  },

  cold_vortex: {
    id: 'cold_vortex', name: 'Cold Vortex',
    description: "Open a swirling vortex at the target location for 3.5 seconds that pulls enemies toward its center and deals periodic cold damage with a 30% chance to chill.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#6ab0d8',
    manaCost: 19, cooldown: 8, useTime: 0.7,
    baseDamage: { cold: [5, 8] },
    delivery: {
      type: 'ground', radius: 110, castRange: 420,
      lingerDuration: 3.5, tickInterval: 0.5, pull: 85,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.3 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
  },

  creeping_ice: {
    id: 'creeping_ice', name: 'Creeping Ice',
    description: "Conjure a patch of frost that crawls forward for 4 seconds, dealing periodic cold damage with a 50% chance to chill enemies it passes over.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#7ec0e0',
    manaCost: 14, cooldown: 6, useTime: 0.7,
    baseDamage: { cold: [6, 9] },
    delivery: {
      type: 'ground', radius: 80, castRange: 120,
      lingerDuration: 4, tickInterval: 0.45, drift: 95,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 320, weight: 2, keepDistance: 240 },
  },

  cold_snap: {
    id: 'cold_snap', name: 'Cold Snap',
    description: "Detonate one of your active cold projectiles in flight for 150% cold area damage, or trigger the burst around yourself if no cold projectile is active, with a 50% chance to chill.",
    tags: ['spell', 'cold', 'aoe'], color: '#9ad4f0',
    manaCost: 13, cooldown: 3, useTime: 0.5,
    baseDamage: { cold: [16, 24] },
    delivery: { type: 'detonateProjectile', radius: 120, requireTag: 'cold', consumeBonus: 1.5 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 360, weight: 2, keepDistance: 260 },
  },

  absolute_zero: {
    id: 'absolute_zero', name: 'Absolute Zero',
    description: "Unleashes a freezing pulse around you that consumes chill and freeze on nearby enemies to deal 100% more cold damage.",
    tags: ['spell', 'cold', 'aoe'], color: '#d8f4ff',
    manaCost: 22, cooldown: 7, useTime: 0.75,
    baseDamage: { cold: [18, 26] },
    shatterStatus: { statuses: ['chill', 'frozen'], mult: 2 },
    delivery: { type: 'nova', radius: 130 },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 26 },
    ai: { range: 110, weight: 2 },
  },

  ice_shield: {
    tree: DEVOTED_STARTER_TREES.ice_shield,
    id: 'ice_shield', name: 'Ice Shield',
    description: "Hold to encase yourself in an immobile shell of ice that blocks attacks from all directions. When the shell breaks or is released after at least 1 second, it shatters in a cold nova that knocks enemies back with a 30% chance to stun.",
    tags: ['spell', 'cold', 'guard', 'channel', 'aoe', 'duration'], color: '#bce8f8',
    manaCost: 14, cooldown: 7, useTime: 0,
    castMode: 'guard',
    // The bash payload takes the skill's element from its tags (COLD) and
    // rides the ordinary damage roll — cold/spell modifiers scale it, so
    // the raw mult sits LOWER than the warrior walls on purpose: this one
    // is bought back with investment, not shield mass.
    guard: {
      arcDeg: 360, shieldLife: 90, moveFactor: 0, turnRate: 10,
      bash: { mult: 0.5, range: 95, arcDeg: 360, stunChance: 0.3, knockback: 55 },
      bashOnBreak: true,
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { intelligence: 18 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.16)] },
  },

  ice_blade: {
    id: 'ice_blade', name: 'Ice Blade',
    description: "Perform a fast cold melee thrust with +18% base critical strike chance, +30% critical strike multiplier, and a 30% chance to chill.",
    tags: ['attack', 'melee', 'cold'], color: '#c4e8f4',
    manaCost: 4, cooldown: 0, useTime: 0.45,
    castMode: 'timed',
    baseDamage: { cold: [9, 14] },
    innateMods: [mod('critChance', 'flat', 0.18), mod('critMulti', 'flat', 0.3)],
    delivery: { type: 'melee', range: 30, arcDeg: 45 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.3 },
    ],
    requirements: { dexterity: 16, intelligence: 12 },
    ai: { range: 40, weight: 3 },
  },

  // --- Three of the house's own design --------------------------------------

  avalanche: {
    id: 'avalanche', name: 'Avalanche',
    description: "Channel while stationary to pour a cone of crushing snow forward that pushes enemies back with a 45% chance to chill, ramping up to 150% increased damage and 60% increased area the longer you channel.",
    tags: ['spell', 'cold', 'aoe', 'channel'], color: '#e8f4fa',
    manaCost: 4, cooldown: 0, useTime: 0.3,
    castMode: 'channel',
    channel: {
      interval: 0.3, move: 'immobile', turnRate: 1.6,
      ramp: { per: 0.25, max: 1.5 }, rampAoe: { per: 0.12, max: 0.6 },
    },
    baseDamage: { cold: [7, 11] },
    delivery: { type: 'cone', range: 200, arcDeg: 55 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.45 },
      { type: 'knockback', strength: 26 },
    ],
    requirements: { intelligence: 22, strength: 10 },
    ai: { range: 180, weight: 2 },
  },

  shatterstep: {
    id: 'shatterstep', name: 'Shatterstep',
    description: "Teleport to the target location while erupting your departure point in frost that deals cold damage over 1.2 seconds and leaves slick ice for 5 seconds.",
    tags: ['spell', 'cold', 'movement', 'aoe', 'instant'], color: '#aee0f0',
    manaCost: 12, cooldown: 5, useTime: 0,
    baseDamage: { cold: [10, 16] },
    delivery: { type: 'blink', range: 260 },
    effects: [
      { type: 'spawnZone', radius: 85, duration: 1.2, tickInterval: 0.4, damageScale: 1 },
      { type: 'terrain', kind: 'ice', radius: 70, duration: 5 },
    ],
    requirements: { intelligence: 18, dexterity: 12 },
  },

  winters_mantle: {
    id: 'winters_mantle', name: "Winter's Mantle",
    description: "Toggle aura that reserves 30 mana to grant nearby allies +30 maximum energy shield while slowing nearby enemies' movement speed by 18% and attack and cast speed by 12% and dealing cold damage over time.",
    tags: ['spell', 'cold', 'aura', 'buff'], color: '#9cd8e8',
    manaCost: 9, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 170,
        allyMods: [mod('energyShield', 'flat', 30)],
        enemyMods: [
          mod('moveSpeed', 'more', -0.18),
          mod('attackSpeed', 'more', -0.12),
          mod('castSpeed', 'more', -0.12),
        ],
        enemyDps: { amount: 4, type: 'cold' },
      },
      upkeep: { reserveMana: 30 },
    },
    effects: [],
    requirements: { intelligence: 18, willpower: 12 },
  },

  // Spawner-object skills: free, slow-churning summons. The spawner is a
  // stationary monster; these are how it "spawns" — through the exact same
  // summon delivery players use, caps and all.
  spew_dead: {
    id: 'spew_dead', name: 'Churning Earth', noDrop: true,
    description: "Summon a risen undead servant from the ground, most often a zombie or skeleton warrior and occasionally a skeleton archer, up to 6 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#9a86d8',
    manaCost: 0, cooldown: 3.5, useTime: 1.3,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'zombie', weight: 2 },
        { id: 'skeleton_warrior', weight: 2 },
        { id: 'skeleton_archer', weight: 1 },
      ],
      count: 1, maxActive: 6,
    },
    effects: [],
    requirements: { willpower: 34 },
    ai: { range: 720, weight: 1 },
  },

  spew_brood: {
    id: 'spew_brood', name: 'The Seethe Boils', noDrop: true,
    description: "Spawn a chitin hatchling per cast, fielding drones three times as often as lancers, up to 6 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#d89a3a',
    manaCost: 0, cooldown: 3.4, useTime: 1.2,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'chitin_drone', weight: 3 },
        { id: 'chitin_lancer', weight: 1 },
      ],
      count: 1, maxActive: 6,
    },
    effects: [],
    requirements: { willpower: 34 },
    ai: { range: 720, weight: 1 },
  },

  spew_flame: {
    id: 'spew_flame', name: 'Belching Flame', noDrop: true,
    description: "Summon a flame sprite or fire cultist at equal odds, up to 5 active at once.",
    tags: ['spell', 'summon', 'minion', 'fire'], color: '#ff8a4a',
    manaCost: 0, cooldown: 3.2, useTime: 1.2,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'flame_sprite', weight: 2 },
        { id: 'fire_cultist', weight: 2 },
      ],
      count: 1, maxActive: 5,
    },
    effects: [],
    requirements: { willpower: 30, intelligence: 20 },
    ai: { range: 720, weight: 1 },
  },

  spew_rime: {
    id: 'spew_rime', name: 'Creeping Rime', noDrop: true,
    description: "Summon a frost-bound servant, most often a zombie and occasionally a frost witch or brute, up to 5 active at once.",
    tags: ['spell', 'summon', 'minion', 'cold'], color: '#9accdf',
    manaCost: 0, cooldown: 3.8, useTime: 1.4,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'zombie', weight: 2 },
        { id: 'frost_witch', weight: 1 },
        { id: 'brute', weight: 1 },
      ],
      count: 1, maxActive: 5,
    },
    effects: [],
    requirements: { willpower: 30, intelligence: 24 },
    ai: { range: 720, weight: 1 },
  },

  // The crystal country's own mouth (the attunement pass): the lode calves
  // its living lattice — shardlings that shatter, creepers, glimmer-chaff.
  spew_shards: {
    id: 'spew_shards', name: 'Calving Lattice', noDrop: true,
    description: "Spawn a crystalline minion per cast, most often a resonant shardling and occasionally a prism creeper or lumen wisp, up to 6 active at once.",
    tags: ['spell', 'summon', 'minion', 'lightning'], color: '#9fd8ff',
    manaCost: 0, cooldown: 3.6, useTime: 1.3,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'resonant_shardling', weight: 3 },
        { id: 'prism_creeper', weight: 1 },
        { id: 'lumen_wisp', weight: 1 },
      ],
      count: 1, maxActive: 6,
    },
    effects: [],
    requirements: { willpower: 30 },
    ai: { range: 720, weight: 1 },
  },

  // Crystalkin verbs (the attunement pass) — both peals ring EVERYONE
  // (nova affects:'all'): kin, foes, and any standing crystal all take the
  // note, and the attunement fabric decides what that means. The haunt's
  // chime is a GIFT that doesn't care whose side you're on; the siren's
  // wail re-tunes the whole court to chaos — its own kin included, which
  // is what discord is.
  resonant_peal: {
    id: 'resonant_peal', name: 'Resonant Peal', noDrop: true,
    description: "Rings a lightning chime that deals lightning damage to nearby enemies and attunes all targets hit to Lightning.",
    tags: ['spell', 'lightning'], color: '#ffe27a',
    manaCost: 0, cooldown: 7, useTime: 1.1,
    baseDamage: { lightning: [4, 8] },
    delivery: { type: 'nova', radius: 150, affects: 'all' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'attuned_lightning', chance: 1 },
    ],
    ai: { range: 140, weight: 1.4 },
  },
  discord_wail: {
    id: 'discord_wail', name: 'Discord', noDrop: true,
    description: "Release a burst of chaos damage around the caster that damages both allies and enemies.",
    tags: ['spell', 'chaos'], color: '#c88aff',
    manaCost: 0, cooldown: 6, useTime: 1.2,
    baseDamage: { chaos: [7, 12] },
    delivery: { type: 'nova', radius: 160, affects: 'all' },
    effects: [{ type: 'damage' }],
    ai: { range: 150, weight: 1.3 },
  },

  // Themed spawner mouths (the bestiary expansion): each biome family's
  // 'spawners' objective gets its OWN destructible with its own churn.
  spew_spores: {
    id: 'spew_spores', name: 'Fruiting Body', noDrop: true,
    description: "Spawn a fungal minion per cast, most often a sporeling or mushroomling and rarely a puffball, up to 5 active at once.",
    tags: ['spell', 'summon', 'minion', 'chaos'], color: '#9ac86a',
    manaCost: 0, cooldown: 3.2, useTime: 1.2,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'fungal_sporeling', weight: 3 },
        { id: 'mushroomling', weight: 2 },
        { id: 'fungal_puffball', weight: 1 },
      ],
      count: 1, maxActive: 5,
    },
    effects: [],
    requirements: { willpower: 30 },
    ai: { range: 720, weight: 1 },
  },

  spew_grubs: {
    id: 'spew_grubs', name: 'Hatching Clutch', noDrop: true,
    description: "Hatch an egg to spawn a rockgrub (75% chance) or cave bat (25% chance), up to 5 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#b0a880',
    manaCost: 0, cooldown: 3.5, useTime: 1.3,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'rockgrub', weight: 3 },
        { id: 'cave_bat', weight: 1 },
      ],
      count: 1, maxActive: 5,
    },
    effects: [],
    requirements: { willpower: 30 },
    ai: { range: 720, weight: 1 },
  },

  spew_flesh: {
    id: 'spew_flesh', name: 'Sloughing Meat', noDrop: true,
    description: "Spawn a lesser ooze (75% chance) or blood mite (25% chance), up to 6 active at once.",
    tags: ['spell', 'summon', 'minion', 'chaos'], color: '#c86a5a',
    manaCost: 0, cooldown: 3, useTime: 1.2,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'lesser_ooze', weight: 3 },
        { id: 'blood_mite', weight: 1 },
      ],
      count: 1, maxActive: 6,
    },
    effects: [],
    requirements: { willpower: 30 },
    ai: { range: 720, weight: 1 },
  },

  // --- THE GARDEN'S MOUTHS (colony kit — monster-only) -----------------------
  spew_formics: {
    id: 'spew_formics', name: 'The Burrow Stirs', noDrop: true,
    description: "Spawn a formic worker (75% chance) or formic soldier (25% chance) from the ground, up to 5 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#a87848',
    manaCost: 0, cooldown: 3.5, useTime: 1.2,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'formic_worker', weight: 3 },
        { id: 'formic_soldier', weight: 1 },
      ],
      count: 1, maxActive: 5,
    },
    effects: [],
    requirements: { willpower: 30 },
    ai: { range: 720, weight: 1 },
  },
  // The Matriarch's clutch: the chitin egg-pod pattern in colony colors —
  // stomp the eggs or meet the shift they were going to be.
  lay_formic_clutch: {
    id: 'lay_formic_clutch', name: 'Lay Formic Clutch',
    description: "Places an egg clutch at your feet (up to 3 active clutches). Clutches that survive for 8 seconds hatch into 2 Formic Workers.",
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#b09060',
    manaCost: 16, cooldown: 11, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_lay_formic_clutch',
      range: 0, duration: 8, maxActive: 3, life: 50, placeRange: 110,
      hatch: { skillId: 'egg_hatch_formics' },
    },
    effects: [],
    requirements: { willpower: 18 },
    ai: { range: 260, weight: 2, keepDistance: 160 },
  },
  egg_hatch_formics: {
    id: 'egg_hatch_formics', name: 'The Clutch Hatches', noDrop: true,
    description: "Hatch a laid egg into 2 formic workers, up to a shared maximum of 8.",
    tags: ['spell', 'summon', 'minion'], color: '#b09060',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'formic_worker', count: 2, maxActive: 8 },
    effects: [],
  },
  // The sylph's puff: pollen in the eye, pollen in the plan.
  pollen_puff: {
    id: 'pollen_puff', name: 'Pollen Puff', noDrop: true,
    description: "Release a cloud of pollen around the caster that deals chaos damage with an 80% chance to blind and a 50% chance to befuddle.",
    tags: ['spell', 'aoe', 'duration'], color: '#e8d88a',
    manaCost: 14, cooldown: 6, useTime: 0.7,
    baseDamage: { chaos: [3, 5] },
    delivery: { type: 'nova', radius: 150 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'blind', chance: 0.8 },
      { type: 'status', status: 'addled', chance: 0.5 },
    ],
    ai: { range: 130, weight: 2, keepDistance: 110 },
  },

  // ================== GLIMMERCRAFT (the Grove's firefly arts) ===============
  // The glimmerkin's whole argument is LIGHT AS LANGUAGE: a pulse is a word,
  // a held glow is a sentence, and a false light is a lie something dies
  // believing. Monster-side verbs first (the kin teach by fighting); the
  // lure lantern below is the player's half, learned at the hollow's door.

  glimmer_pulse: {
    id: 'glimmer_pulse', name: 'Glimmer Pulse', noDrop: true,
    description: "Fire a mote of light downrange that deals lightning damage with a 20% chance to blind.",
    tags: ['spell', 'projectile', 'lightning'], color: '#d8f078',
    manaCost: 5, cooldown: 0, useTime: 0.6,
    baseDamage: { lightning: [5, 9] },
    delivery: { type: 'projectile', speed: 300, radius: 7, range: 420 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'blind', chance: 0.2 },
    ],
    ai: { range: 380, weight: 2, keepDistance: 200 },
  },

  beguiling_glow: {
    id: 'beguiling_glow', name: 'Beguiling Glow', noDrop: true,
    description: "Releases a hypnotic nova around the caster with an 85% chance to inflict Transfixed, slowing targets and causing their abilities to misfire.",
    tags: ['spell', 'aoe', 'duration'], color: '#e8d8f8',
    manaCost: 12, cooldown: 7, useTime: 0.7,
    delivery: { type: 'nova', radius: 150 },
    effects: [
      { type: 'status', status: 'transfixed', chance: 0.85 },
    ],
    ai: { range: 130, weight: 2, keepDistance: 120 },
  },

  silk_snare: {
    id: 'silk_snare', name: 'Silk Snare', noDrop: true,
    description: "Launch a web lattice at the target location that tightens after a brief delay, dealing physical damage with a 60% chance to pin enemies inside.",
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#e8f0d8',
    manaCost: 9, cooldown: 6, useTime: 0.8,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'ground', radius: 70, castRange: 340, delay: 0.6 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.6 },
    ],
    ai: { range: 320, weight: 3, keepDistance: 200 },
  },

  mimic_flash: {
    id: 'mimic_flash', name: 'Mimic Flash', noDrop: true,
    description: "Flashes a luresignal that has a 70% chance to inflict Transfixed on nearby enemies and draws unaware enemies from farther away toward the flash for 6 seconds.",
    tags: ['spell', 'aoe', 'duration'], color: '#e8f8b0',
    manaCost: 16, cooldown: 10, useTime: 0.9,
    delivery: { type: 'nova', radius: 170 },
    effects: [
      { type: 'status', status: 'transfixed', chance: 0.7 },
      { type: 'lure', radius: 620, sec: 6, standoff: 60 },
    ],
    ai: { range: 150, weight: 2 },
  },

  lure_lantern: {
    id: 'lure_lantern', name: 'Lure Lantern',
    description: "Throws a decoy lantern that lasts for 8 seconds, drawing unaware enemies from a wide radius toward it.",
    tags: ['spell', 'projectile', 'duration'], color: '#d8f078',
    manaCost: 12, cooldown: 12, useTime: 0.6,
    delivery: { type: 'projectile', speed: 260, radius: 8, range: 480 },
    effects: [
      { type: 'lure', radius: 560, sec: 8, standoff: 80 },
    ],
    requirements: { willpower: 12 },
    dropWeight: 6, minDropLevel: 6,
  },

  // ================== SCENTCRAFT (the Garden's pheromone-craft) =============
  // The player-facing pool the formicary unlocks ('nest_entered' gates the
  // Vault bundle — the ruin_entered pattern). The family identity is the
  // INSTINCT LEVER: these verbs cast no fire and summon no servant — they
  // bend what the world's own creatures already want. Mark a body as PREY
  // and everything that hunts, hunts IT (the scent law in World.isPrey);
  // panic a pack and the rout fabric does the rest; pour a sweet slick and
  // watch feet argue with appetite. Emergent by construction: every payoff
  // is another system keeping its own promise.

  prey_musk: {
    id: 'prey_musk', name: 'Prey Musk',
    description: "Marks an enemy as Prey, causing hunting creatures and packs from a wide radius to target them and increasing the damage the target takes.",
    tags: ['spell', 'curse', 'duration', 'aoe'], color: '#c8a86a',
    manaCost: 10, cooldown: 3, useTime: 0.45,
    targeting: { target: 'enemy', castRange: 480 },
    delivery: { type: 'target' },
    effects: [{ type: 'status', status: 'prey_marked', chance: 1 }],
    requirements: { willpower: 12 },
    dropWeight: 8, minDropLevel: 4,
    ai: { range: 440, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  alarm_reek: {
    id: 'alarm_reek', name: 'Alarm Reek',
    description: "Releases a panic scent in a ring around you that inflicts Bolted on nearby enemies, causing them to flee.",
    tags: ['spell', 'aoe', 'duration'], color: '#d8b84a',
    manaCost: 16, cooldown: 12, useTime: 0.55,
    delivery: { type: 'nova', radius: 190 },
    effects: [{ type: 'status', status: 'bolted', chance: 1 }],
    requirements: { willpower: 16 },
    dropWeight: 6, minDropLevel: 6,
    ai: { range: 160, weight: 2 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  honeydew_lure: {
    id: 'honeydew_lure', name: 'Honeydew Lure',
    description: "Pours a pool of sweet lure at the target location for 4.5 seconds that draws nearby enemies in, inflicts Mired, and deals chaos damage over time.",
    tags: ['spell', 'aoe', 'duration', 'chaos'], color: '#e8cf7a',
    manaCost: 14, cooldown: 8, useTime: 0.6,
    baseDamage: { chaos: [2, 4] },
    delivery: {
      type: 'ground', radius: 110, castRange: 380,
      lingerDuration: 4.5, tickInterval: 0.4,
      pull: 130, pullRadius: 250,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'mired', chance: 1 },
    ],
    requirements: { willpower: 14 },
    dropWeight: 6, minDropLevel: 8,
    ai: { range: 340, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  moult: {
    id: 'moult', name: 'Moult',
    description: "Cleanse your 4 most recent afflictions and gain 20% more movement speed for 2.5 seconds.",
    tags: ['spell', 'buff', 'instant', 'duration'], color: '#b8d8a0',
    manaCost: 12, cooldown: 14, useTime: 0,
    delivery: { type: 'self' },
    effects: [
      { type: 'cleanse', count: 4 },
      { type: 'buff', id: 'fresh_moult', duration: 2.5, mods: [mod('moveSpeed', 'more', 0.2)] },
    ],
    requirements: { dexterity: 14 },
    dropWeight: 6, minDropLevel: 10,
    ai: { range: 0, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  // --- THE HARROWING (the Gloamwood country's fear-craft) --------------------
  // The player-facing pool the haunted manor unlocks ('manor_entered' gates
  // the Vault bundle) plus the Carven Court's own verbs. The family identity
  // is the FEAR LADDER (status.ts harrowing → horrified): build dread, break
  // nerve, and fight things while they flee — the CC class that repositions.

  gourd_bomb: {
    id: 'gourd_bomb', name: 'Gourd Bomb',
    description: "Lobs a carved gourd that detonates after a short fuse for area fire damage with a 50% chance to inflict Harrowing and a 9% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#e8832a',
    manaCost: 12, cooldown: 4, useTime: 0.8,
    baseDamage: { fire: [11, 17] },
    delivery: { type: 'ground', radius: 75, castRange: 430, delay: 0.6 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'harrowing', chance: 0.5 },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.25 },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 400, weight: 3, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  // ==========================================================================
  // THE GLOAMING's counterplay (docs/engine/gloaming.md): light you can PLANT.
  // A kindled wick is a real LIGHTWELL — the same fabric as the front's own
  // gloomwells and the world's campfires: it feeds the LIGHT meter of every
  // resident in its glow, burns per resident, dims as it spends, gutters out.
  // Useful anywhere the dark drinks (a gloaming, the Descent's abyss floor is
  // its own lane) and honest everywhere else. Duration gems deepen the pool,
  // area gems widen the glow — zero bespoke supports, the fabric folds both.
  // ==========================================================================
  kindle_wick: {
    id: 'kindle_wick', name: 'Kindle',
    description: "Place a standing wick at the target location that restores Light to units within its radius, draining faster when shared by multiple targets until depleted.",
    tags: ['spell', 'duration', 'aoe'], color: '#ffd890',
    manaCost: 16, cooldown: 5, useTime: 0.6,
    delivery: { type: 'ground', radius: 30, castRange: 380, occlusion: 'free' },
    effects: [
      { type: 'kindle', kind: 'kindled_wick' },
    ],
    requirements: { willpower: 12 },
    minDropLevel: 4,
    ai: { range: 300, weight: 1, keepDistance: 200 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.03)] },
    thresholds: [
      { level: 10, label: 'The wick remembers the sun', mods: [mod('effectDuration', 'increased', 0.35)] },
    ],
  },

  harrowing_wail: {
    tree: DISCIPLINE_STARTER_TREES.harrowing_wail,
    id: 'harrowing_wail', name: 'Harrowing Wail',
    description: "Unleashes a scream in a frontal cone that deals physical damage with an 85% chance to inflict Harrowing, causing targets to rout at full stacks.",
    tags: ['spell', 'aoe', 'duration', 'warcry'], color: '#b8a4d8',
    manaCost: 10, cooldown: 5, useTime: 0.7,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'cone', range: 170, arcDeg: 75 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'harrowing', chance: 0.85 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 150, weight: 3, keepDistance: 110 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('statusChance', 'increased', 0.03)] },
  },

  summon_scarecrow: {
    id: 'summon_scarecrow', name: 'Summon Scarecrow',
    description: "Summons an immobile Scarecrow (up to 2 active) whose attacks inflict Harrowing. Scales with minion modifiers.",
    tags: ['spell', 'summon', 'minion'], color: '#9a8658',
    manaCost: 20, cooldown: 2, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'bound_scarecrow', count: 1, maxActive: 2 },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { wisdom: 12, willpower: 10 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // The Court's own verbs (noDrop, the shared catalog as ever): the sower's
  // lit fruit and the watcher's murder-call.
  gourd_toss: {
    id: 'gourd_toss', name: 'Lit Gourd', noDrop: true,
    description: "Hurls a lit gourd projectile that deals fire damage with a 40% chance to inflict Harrowing and an 11% chance to ignite.",
    tags: ['spell', 'fire', 'projectile'], color: '#d8722a',
    manaCost: 9, cooldown: 2.2, useTime: 0.9,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'projectile', speed: 320, radius: 10, range: 460 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'harrowing', chance: 0.4 },
      { type: 'status', status: 'burn', chance: 0.3, magnitude: 0.25 },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 420, weight: 2, keepDistance: 240 },
  },

  summon_crows: {
    id: 'summon_crows', name: 'Murder Call', noDrop: true,
    description: "Summon 2 carrion crows to fight for you, up to 4 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#2a2d34',
    manaCost: 12, cooldown: 6, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'carrion_crow', count: 2, maxActive: 4 },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 500, weight: 2, keepDistance: 200 },
  },

  // --- THE VERMINFALL's verbs -----------------------------------------------
  // The warren's spew (nests + broodpriests + the King all share it) and the
  // fester rat's rotting bite — noDrop monster verbs on the shared catalog.

  spew_rats: {
    id: 'spew_rats', name: 'Seething Warren', noDrop: true,
    description: "Summon a warren rat from the ground (with a 25% chance to spawn a festering rat), up to 6 active at once.",
    tags: ['spell', 'summon', 'minion'], color: '#8a7a5a',
    manaCost: 0, cooldown: 3.2, useTime: 1.1,
    delivery: {
      type: 'summon',
      pool: [
        { id: 'warren_rat', weight: 3 },
        { id: 'fester_rat', weight: 1 },
      ],
      count: 1, maxActive: 6,
    },
    effects: [],
    requirements: { willpower: 30 },
    ai: { range: 720, weight: 1 },
  },

  // --- THE COLONY VENTS (engine/lite.ts litePour — the collective pass) -----
  // The wave verb of the colony fabric: pool bodies POURED mid-fight, not
  // summoned actors — a nest defends itself with its own crawl, and the
  // vent counts toward the anchor's colony cap (the regrowth law sees what
  // the horn called). Near-zero cost at any count.
  vent_vermin: {
    id: 'vent_vermin', name: 'Seething Call', noDrop: true,
    description: "Summon 5 to 8 vermin around the caster.",
    tags: ['spell'], color: '#8a7a5a',
    manaCost: 0, cooldown: 7, useTime: 0.9,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'vermin_tide', count: [5, 8], scatter: 60 }],
    ai: { range: 300, weight: 2 },
  },
  hurl_swarmpod: {
    id: 'hurl_swarmpod', name: 'Squirming Bundle', noDrop: true,
    description: "Throw a pod that bursts on impact for physical damage and spawns 3 to 5 vermin.",
    tags: ['spell', 'projectile'], color: '#9a8a62',
    manaCost: 4, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'projectile', speed: 420, radius: 8, range: 400 },
    effects: [{ type: 'damage' }, { type: 'litePour', monsterId: 'vermin_tide', count: [3, 5], scatter: 34 }],
    ai: { range: 400, weight: 3 },
  },
  vent_mites: {
    id: 'vent_mites', name: 'Marrow Boil', noDrop: true,
    description: "Summon 4 to 6 grave mites around the caster.",
    tags: ['spell'], color: '#b0a488',
    manaCost: 0, cooldown: 8, useTime: 1.0,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'grave_mite', count: [4, 6], scatter: 52 }],
    ai: { range: 250, weight: 2 },
  },
  vent_ticks: {
    id: 'vent_ticks', name: 'Reliquary Muster', noDrop: true,
    description: "Summon 3 to 4 vault ticks to attack nearby enemies.",
    tags: ['spell'], color: '#7a9a8a',
    manaCost: 0, cooldown: 9, useTime: 1.1,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'vault_tick', count: [3, 4], scatter: 48 }],
    ai: { range: 250, weight: 2 },
  },
  vent_souls: {
    id: 'vent_souls', name: 'The Unferried Rise', noDrop: true,
    description: "Raise 5 to 8 soul motes around the caster that drift toward nearby living targets.",
    tags: ['spell', 'cold'], color: '#9fd8ec',
    manaCost: 12, cooldown: 8, useTime: 0.9,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'soul_mote', count: [5, 8], scatter: 64 }],
    ai: { range: 300, weight: 2 },
  },

  scything_rake: {
    id: 'scything_rake', name: 'Scything Rake', noDrop: true,
    description: "Slash a narrow frontal arc with serrated forelegs, inflicting a light Bleed.",
    tags: ['attack', 'melee', 'physical'], color: '#7ac858',
    manaCost: 0, cooldown: 1.5, useTime: 0.45,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'melee', range: 42, arcDeg: 75 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 1, magnitude: 0.18, durationOverride: 2 },
    ],
    ai: { range: 48, weight: 2 },
  },
  pit_maul: {
    id: 'pit_maul', name: 'Pit Maul', noDrop: true,
    description: "Delivers a heavy overhead blow that deals 150% more poise damage, increases Sundered duration by 50%, and has a 30% chance to inflict Sundered against targets without poise.",
    tags: ['attack', 'melee', 'physical'], color: '#c8a058',
    manaCost: 6, cooldown: 3, useTime: 0.7,
    baseDamage: { physical: [14, 24] },
    innateMods: [mod('poiseDamage', 'more', 1.5), mod('sunderDuration', 'increased', 0.5)],
    delivery: { type: 'melee', range: 100, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'sundered', chance: 0.3 },
    ],
    ai: { range: 95, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09), mod('poiseDamage', 'increased', 0.1)] },
  },
  scorching_bite: {
    id: 'scorching_bite', name: 'Scorching Bite', noDrop: true,
    description: "Bites a target in melee for physical and fire damage with a 60% chance to ignite.",
    tags: ['attack', 'melee', 'physical', 'fire'], color: '#ff6a30',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { physical: [3, 5], fire: [2, 3] },
    delivery: { type: 'melee', range: 42, arcDeg: 80 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.6, magnitude: 0.3 },
    ],
    ai: { range: 48, weight: 2 },
  },

  festering_bite: {
    id: 'festering_bite', name: 'Festering Bite', noDrop: true,
    description: "Bites a target in melee for physical and chaos damage with a 50% chance to inflict Decay.",
    tags: ['attack', 'melee', 'physical', 'chaos'], color: '#8aa050',
    manaCost: 2, cooldown: 0.5, useTime: 0.8,
    baseDamage: { physical: [4, 7], chaos: [2, 4] },
    delivery: { type: 'melee', range: 46, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.5, magnitude: 0.35 },
    ],
    ai: { range: 50, weight: 2 },
  },

  // --- THE BOTTLED SWARM (litePour's player side — the thrown hive) --------
  // The colony fabric's wave verb as a droppable gem, seated as a LITE-TIER
  // THRONG ANCHOR whose main acquisition is its own throw: the pour is OWNED
  // (LitePourEffect.owned — the bodyguard veil's idiom the engine doc
  // anticipates), and the anchor is what makes the keeper LEGITIMATE — the
  // disband ledger (liteDemoteSweep) re-wilds any owned row whose keeper
  // wears no matching lite throng, so a throng-less owned pour dies on the
  // half-second beat by standing law. The throw doubles as the marching
  // order (throngDirect at the cast's aim; bodies poured at the flight's
  // end inherit the standing order and fight AT the mark, then heel to the
  // keeper ring where the pooled bite chews pressers). Real cost and clock
  // where the kin's vents above cast free. NOTE: litePourAt consults no
  // throng cap — the pour can overshoot cap until attrition; and a throw
  // with no swarm standing floats the sweep's 'no throng gathered' while
  // the jar is still mid-air (cosmetic — the pour lands regardless).
  // Surfaced by the Vermincraft pool row (meta/unlocks.ts — the piper's
  // own lesson).
  bottled_swarm: {
    id: 'bottled_swarm', name: 'Bottled Swarm',
    description: "Throws a jarred nest that shatters for physical damage on impact and releases 4–6 vermin that converge on the target. Kills have a ~20% chance to spawn additional claimable vermin (up to 12 active).",
    tags: ['spell', 'projectile'], color: '#9a8a62',
    manaCost: 14, cooldown: 7, useTime: 0.8,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 420, radius: 8, range: 400 },
    effects: [
      { type: 'damage' },
      { type: 'litePour', monsterId: 'vermin_tide', count: [4, 6], scatter: 34, owned: true },
      { type: 'throngDirect' },
    ],
    throng: {
      monsterId: 'vermin_tide', cap: 12,
      sources: [{ kind: 'onKill', chance: 0.2 }],
      tier: 'lite',
    },
    requirements: { willpower: 16 },
    ai: { range: 400, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
    minDropLevel: 5,
  },

  // --- THE LONG CANDLE's verbs (the Wax Court & the Umbral Parliament) ------
  // The drip and the re-light are RESPONSE payloads (MonsterDef.onHitByType
  // free-casts them — no ai hint needed, no def.skills listing); the pulse is
  // the candle-shrine's working verb.

  wax_drip: {
    id: 'wax_drip', name: 'Dripping Wax', noDrop: true,
    description: "Leave a pool of burning wax for 2.5 seconds that deals fire damage over time to enemies standing in it.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#f0c26a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [3, 5] },
    delivery: { type: 'ground', radius: 38, castRange: 60, lingerDuration: 2.5, tickInterval: 0.5, noImpact: true },
    effects: [{ type: 'damage' }],
  },

  wax_flare: {
    id: 'wax_flare', name: 'Wax Flare', noDrop: true,
    description: "Erupt in a ring of fire damage around the caster.",
    tags: ['spell', 'fire', 'aoe'], color: '#ffb45e',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'nova', radius: 70 },
    effects: [{ type: 'damage' }],
  },

  waxlight_pulse: {
    id: 'waxlight_pulse', name: 'Waxlight', noDrop: true,
    description: "Pulses a wide ring that marks enemies with Waxlight, revealing stealth and increasing their visibility.",
    tags: ['spell', 'aoe', 'duration'], color: '#ffe9a8',
    manaCost: 6, cooldown: 6, useTime: 0.8,
    delivery: { type: 'nova', radius: 190 },
    effects: [{ type: 'status', status: 'waxlight', chance: 1 }],
    ai: { range: 520, weight: 2 },
  },

  // ======================= Resource economies ==============================
  // Charges, founts & ward: the §1 batch. Use-charges pace the cadence
  // family; orb/move taps feed founts and reserves; ward is the decaying
  // shield the soul-eaters stack.

  zealots_cadence: {
    id: 'zealots_cadence', name: "Zealot's Cadence",
    description: "Sweep a wide melee arc using 1 charge from a bank of 3. Once all charges are spent, charges recover at a rate of 1 every 5 seconds.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#e8c05a',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    useCharges: { max: 3, recharge: 5 },
    baseDamage: { physical: [14, 20] },
    delivery: { type: 'melee', range: 62, arcDeg: 140 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 14, dexterity: 10 },
    ai: { range: 65, weight: 2 },
    thresholds: [
      { level: 12, label: 'Deeper devotion', mods: [mod('skillCharges', 'flat', 1)] },
    ],
  },

  // --- THE MUNITIONS FAMILY (powder & shot) --------------------------------
  // Use-charge banks fired DRY and then RELOADED — the three reference
  // ammunition economies, one per lane of the fabric:
  //  - bolt_repeater: the MAGAZINE — its cooldown IS the auto-reload clock,
  //    stamped only by the press that spends the last round;
  //  - scattergun: the CHANNEL reload — an empty gun converts into a
  //    shell-by-shell rack ('chargesEmpty'), releasable early, and shift
  //    racks tactically at any fill;
  //  - arquebus: the CAST reload — one round, one thunder, one long ram.
  // All tagged 'munition' so family supports (Bandolier, Swift Hands,
  // Dead Man's Round) and tag-filtered passives reach every gun at once;
  // reload payloads are ordinary noDrop catalog skills tagged 'reload'
  // (their bars divide by the reloadSpeed stat).

  bolt_repeater: {
    id: 'bolt_repeater', name: 'Bolt Repeater',
    description: "Fires physical bolts from an 8-round drum as fast as you press. Firing the final bolt starts the reload timer, refilling the entire drum when complete.",
    tags: ['attack', 'projectile', 'physical', 'munition'], color: '#c8a878',
    manaCost: 0, cooldown: 3.5, useTime: 0.3,
    useCharges: { max: 8, magazine: true },
    baseDamage: { physical: [7, 11] },
    delivery: { type: 'projectile', speed: 640, radius: 6, range: 470 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
    thresholds: [
      { level: 12, label: 'Extended drum', mods: [mod('skillCharges', 'flat', 2)] },
    ],
  },

  scattergun: {
    id: 'scattergun', name: 'Scattergun',
    description: "Fire a short-range spread of 7 physical pellets using 1 shell from a 3-shell magazine. When empty, channeling reloads shells one by one and can be interrupted early to resume firing.",
    tags: ['attack', 'projectile', 'physical', 'aoe', 'munition'], color: '#d89050',
    manaCost: 0, cooldown: 0, useTime: 0.5,
    useCharges: { max: 3 },
    convert: { when: 'chargesEmpty', skillId: 'reload_shells' },
    meta: { skillId: 'reload_shells', label: 'Reload' },
    baseDamage: { physical: [4, 7] },
    delivery: {
      type: 'projectile', speed: 520, radius: 5, range: 240,
      count: 7, spreadDeg: 42,
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 12, dexterity: 12 },
    ai: { range: 200, weight: 2 },
  },

  // The scattergun's rack — a channel loading ONE shell per beat (the
  // restoreSkillCharges handler ends the channel itself at a topped drum).
  reload_shells: {
    id: 'reload_shells', name: 'Ram Shells', noDrop: true,
    description: "Channel while moving at 45% reduced speed to reload shells into your drum one by one.",
    tags: ['reload', 'munition', 'channel'], color: '#d89050',
    manaCost: 0, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.55, windup: 0.4, move: 'slowed', moveFactor: 0.55 },
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges', amount: 1 }],
  },

  arquebus: {
    id: 'arquebus', name: 'Long Arquebus',
    description: "Fire a high-damage physical round that pierces up to 2 enemies. When empty, requires a stationary reload channel to refill the magazine.",
    tags: ['attack', 'projectile', 'physical', 'munition'], color: '#b8a890',
    manaCost: 0, cooldown: 0, useTime: 0.45,
    useCharges: { max: 1 },
    convert: { when: 'chargesEmpty', skillId: 'reload_powder' },
    baseDamage: { physical: [30, 44] },
    innateMods: [mod('critChance', 'flat', 0.05)],
    delivery: { type: 'projectile', speed: 900, radius: 5, range: 560, pierce: 2 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 20, strength: 10 },
    ai: { range: 500, weight: 2, keepDistance: 320 },
    minDropLevel: 4,
  },

  // The arquebus's rite — a plain bar cast that fills the bank TO ITS CAP
  // (however deep +skillCharges investment has made it).
  reload_powder: {
    id: 'reload_powder', name: 'Powder & Ball', noDrop: true,
    description: "Channel while stationary to refill your firearm magazine to maximum capacity.",
    tags: ['reload', 'munition'], color: '#b8a890',
    manaCost: 0, cooldown: 0, useTime: 1.5,
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges' }],
  },

  // THE DEFAULT RACK for munition GRAFTS (engine DEFAULT_RELOAD_SKILL): a
  // chambered spell's empty press becomes this rite unless its gem names
  // another — an ordinary catalog skill, so retuning the whole conversion's
  // feel is editing ONE row (and reloadSpeed shortens it like any rack).
  re_energize: {
    id: 're_energize', name: 'Re-energize', noDrop: true,
    description: "Channel while stationary to recharge your arcane magazine to maximum capacity.",
    tags: ['reload', 'munition'], color: '#9ae0c8',
    manaCost: 0, cooldown: 0, useTime: 1.2,
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges' }],
  },

  grenado: {
    id: 'grenado', name: 'Grenado',
    description: "Lob an iron grenade that explodes on impact for fire damage in a wide area. Holds up to 3 grenades before automatically reloading over time.",
    tags: ['attack', 'projectile', 'fire', 'aoe', 'munition'], color: '#e07840',
    manaCost: 0, cooldown: 6, useTime: 0.6,
    useCharges: { max: 3, magazine: true },
    baseDamage: { fire: [16, 24] },
    delivery: {
      type: 'projectile', speed: 340, radius: 8, range: 330,
      explode: { radius: 72, damageScale: 1 },
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 16 },
    ai: { range: 300, weight: 2, keepDistance: 200 },
    minDropLevel: 3,
  },

  galvanic_reserve: {
    id: 'galvanic_reserve', name: 'Galvanic Reserve',
    description: "Generates up to 10 Static charges as you move and when you take hits. Activate to consume all Static charges and strike up to 5 nearby enemies with lightning, dealing 12% more damage per charge spent with a 30% chance to shock.",
    tags: ['spell', 'lightning', 'aoe'], color: '#ffe94a',
    manaCost: 4, cooldown: 1, useTime: 0.4,
    chargeGain: [
      { charge: 'static', amount: 1, max: 10, on: 'move', perDistance: 90 },
      { charge: 'static', amount: 1, max: 10, on: 'takeHit' },
    ],
    chargeCost: { charge: 'static', amount: 'all', minimum: 1, damagePerCharge: 0.12 },
    baseDamage: { lightning: [9, 16] },
    delivery: { type: 'nova', radius: 260, maxTargets: 5 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 14, dexterity: 10 },
    ai: { range: 220, weight: 2 },
    thresholds: [
      { level: 12, label: 'Wider battery', mods: [mod('chargeCap', 'flat', 4)] },
    ],
  },

  siphon_strike: {
    id: 'siphon_strike', name: 'Siphon Strike',
    description: "Sweep a wide frontal melee arc; each enemy hit drops a homing orb that restores 7 mana on pickup.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#5a8ae8',
    manaCost: 0, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'melee', range: 58, arcDeg: 120 },
    effects: [
      { type: 'damage' },
      { type: 'siphonOrb', resource: 'mana', amount: 7 },
    ],
    requirements: { strength: 10, intelligence: 10 },
    ai: { range: 60, weight: 2 },
  },

  siphon_blood: {
    id: 'siphon_blood', name: 'Siphon Blood',
    description: "Rips blood from a target for physical and chaos damage, spawning a life orb that flies to you and restores 9 life.",
    tags: ['spell', 'physical', 'chaos', 'targeted'], color: '#c03848',
    manaCost: 5, cooldown: 0, useTime: 0.5,
    targeting: { target: 'enemy', castRange: 320 },
    baseDamage: { physical: [7, 11], chaos: [3, 5] },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'siphonOrb', resource: 'life', amount: 9 },
    ],
    requirements: { willpower: 12, intelligence: 10 },
    ai: { range: 300, weight: 2, keepDistance: 220 },
  },

  bonespray: {
    id: 'bonespray', name: 'Bonespray',
    description: "Fires a fan of 5 bone shards that each pierce up to 2 enemies with a 20% chance to inflict bleed. Costs 4% of your current life instead of mana.",
    tags: ['spell', 'projectile', 'physical'], color: '#d8d0c0',
    manaCost: 0, cooldown: 0, useTime: 0.45,
    costScaling: { lifePctCur: 0.04 },
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'projectile', speed: 520, radius: 7, range: 420,
      count: 5, spreadDeg: 32, pierce: 2,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.2, magnitude: 0.25 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  // --- The flask family (founts) --------------------------------------------
  // Orbs you scoop both pour instantly AND bank a sip in the flask's fount;
  // the founts are AMMUNITION: every drink spends exactly ONE sip and pours
  // the same fixed draught (chargeCost amount 1 — the PoE flask economy),
  // deepening as the gem levels (amountPerLevel) and open to percent-of-max
  // investment (amountPctMax / restorePctMax / restorePower). The catalyst
  // keeps the OTHER philosophy on purpose — chargeCost 'all' + perCharge,
  // the scale-with-bank lane any skill can still choose. Learned flasks
  // also carry a passive drop chance (equipMods) — the alchemist's loop.
  //
  // THE DRINKING CONTRACT (three data levers, no bespoke code):
  //  - reflex: true — the drink pierces your own commitment (a running
  //    cast bar, a dash, swing recovery) and lands WITHOUT disturbing it.
  //    REFLEX_CFG.during is the policy; the `reflex` stat extends the
  //    wrist to anything else.
  //  - gate.missing (THIRST) — a brimming pool refuses the press outright,
  //    so a sip is NEVER eaten by a moot drink ("a use is a use"). The
  //    `thirstless` stat waives it for drink-for-the-rider builds.
  //  - the 'quaffing' marker buff — worn for the pour, so "while a flask
  //    effect is running" is one gate/proc away for ANY content: gate on
  //    { buff: 'quaffing' }, proc on trigger 'buffGain' + buff 'quaffing',
  //    or hang passive mods off it.

  life_flask: {
    tree: FLASK_TREES.life_flask,
    id: 'life_flask', name: 'Life Flask', icon: 'lifeFlask',
    // Copy FLAGGED for Arianna's word (the two-stream rewrite, 2026-08-08).
    description: "Stores up to 3 charges, gaining 1 charge per life orb picked up. Consumes 1 charge to restore 15% of maximum life over 0.4 seconds plus flat life over 4.5 seconds. Can be used mid-cast, and cannot be used at full life. While equipped on your bar, your hits have a 5% chance to spawn a life orb (0.75s cooldown).",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#d04848',
    manaCost: 0, cooldown: 2, useTime: 0, reflex: true,
    gate: { missing: { kind: 'life' }, note: 'brimming' },
    chargeGain: [{ charge: 'flask_life', amount: 1, max: 3, on: 'orbPickup', orbKind: 'life' }],
    chargeCost: { charge: 'flask_life', amount: 1 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.05)],
    delivery: { type: 'self' },
    effects: [
      // THE TWO-STREAM SIP (2026-08-08, design-locked; numbers ONE
      // BLESSING UNIT, blessed in-conversation): the SURGE is a FIXED
      // FLOOR — % of max over a blink, never growing with gem level (the
      // percent already scales once with the pool; gem growth would scale
      // it twice) — deepened only by explicit investment (pourPct_surge).
      // The SETTLE alone carries the gem's growth. Full sip ≈ 35% of the
      // average level-1 pool.
      { type: 'restoreOverTime', resource: 'life', lane: 'surge', amount: 0, amountPctMax: 0.15, duration: 0.4 },
      { type: 'restoreOverTime', resource: 'life', lane: 'settle', amount: 18, amountPerLevel: 4, duration: 4.5 },
      // The pour's public face: gates, procs and passives key on it —
      // worn for the whole sip (the settle's span).
      { type: 'buff', id: 'quaffing', duration: 4.5, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Deeper draught', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    // The kept -4%/lvl line now also SNAPPIFIES the surge — feel growth
    // without magnitude growth (her ruling: same total, quicker sip).
    leveling: { perLevel: [mod('effectDuration', 'increased', -0.04)] },
  },

  mana_flask: {
    tree: FLASK_TREES.mana_flask,
    id: 'mana_flask', name: 'Mana Flask', icon: 'manaFlask',
    description: "Stores up to 3 charges, gaining 1 charge per mana orb picked up. Consumes 1 charge to restore mana over 3 seconds. Can be used mid-cast, and cannot be used at full mana. While equipped on your bar, your hits have a 5% chance to spawn a mana orb (0.75s cooldown).",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#4a78d8',
    manaCost: 0, cooldown: 2, useTime: 0, reflex: true,
    gate: { missing: { kind: 'mana' }, note: 'brimming' },
    chargeGain: [{ charge: 'flask_mana', amount: 1, max: 3, on: 'orbPickup', orbKind: 'mana' }],
    chargeCost: { charge: 'flask_mana', amount: 1 },
    equipMods: [mod('orbOnHit_mana', 'flat', 0.05)],
    delivery: { type: 'self' },
    effects: [
      // Lane LABEL only (2026-08-08): a one-stream pour is all settle —
      // restorePctMax folds exactly as before, zero behavior change; the
      // label opens the pour:settle mechanism and the settle dials.
      { type: 'restoreOverTime', resource: 'mana', lane: 'settle', amount: 13, amountPerLevel: 3, duration: 3 },
      { type: 'buff', id: 'quaffing', duration: 3, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Deeper draught', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', -0.04)] },
  },

  catalyst_flask: {
    tree: FLASK_TREES.catalyst_flask,
    id: 'catalyst_flask', name: 'Catalyst Flask', icon: 'catalystFlask',
    description: "Stores up to 6 charges from any orb picked up. Consumes all charges (minimum 2) to restore life and mana over 3.5 seconds per charge consumed and grant 15% increased damage and 10% increased movement speed for 6 seconds. Can be used mid-cast at any life or mana level. While equipped on your bar, your hits have a 2.5% chance each to spawn life and mana orbs (0.75s cooldown).",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#c8a848',
    manaCost: 0, cooldown: 5, useTime: 0, reflex: true,
    chargeGain: [{ charge: 'flask_catalyst', amount: 1, max: 6, on: 'orbPickup' }],
    chargeCost: { charge: 'flask_catalyst', amount: 'all', minimum: 2 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.025), mod('orbOnHit_mana', 'flat', 0.025)],
    delivery: { type: 'self' },
    effects: [
      // Lane LABELS only (2026-08-08): the gulp's pours are all settle —
      // restorePctMax folds exactly as before, zero behavior change.
      { type: 'restoreOverTime', resource: 'life', lane: 'settle', amount: 7, duration: 3.5, perCharge: true },
      { type: 'restoreOverTime', resource: 'mana', lane: 'settle', amount: 6, duration: 3.5, perCharge: true },
      { type: 'buff', id: 'quaffing', duration: 3.5, mods: [] },
      {
        type: 'buff', id: 'catalyst_high', duration: 6,
        mods: [mod('damage', 'increased', 0.15), mod('moveSpeed', 'increased', 0.1)],
      },
    ],
    thresholds: [
      { level: 12, label: 'Volatile mixture', mods: [mod('chargeCap', 'flat', 3)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  // --- Utility founts (the buff-flask wing) ---------------------------------
  // Same fount economy, different cargo: ANY orb kind banks the sip (the
  // catalyst's open mouth), and the drink pours a STANCE instead of a pool.
  // No thirst gates on purpose — a stance is never moot, so the judgment
  // call stays with the drinker (the same reasoning as the catalyst). All
  // REFLEXES: the whole family answers mid-anything, by contract.

  quicksilver_flask: {
    tree: FLASK_TREES.quicksilver_flask,
    id: 'quicksilver_flask', name: 'Quicksilver Flask',
    description: "Stores up to 3 charges from any orb picked up. Consumes 1 charge to grant 30% increased movement speed for 4 seconds. Can be used mid-cast or mid-dash. While equipped on your bar, your hits have a 2% chance each to spawn life and mana orbs (0.75s cooldown).",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#b8d8e8',
    manaCost: 0, cooldown: 6, useTime: 0, reflex: true,
    chargeGain: [{ charge: 'flask_quicksilver', amount: 1, max: 3, on: 'orbPickup' }],
    chargeCost: { charge: 'flask_quicksilver', amount: 1 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.02), mod('orbOnHit_mana', 'flat', 0.02)],
    delivery: { type: 'self' },
    effects: [
      {
        type: 'buff', id: 'quicksilver', duration: 4,
        mods: [mod('moveSpeed', 'increased', 0.3)],
      },
      { type: 'buff', id: 'quaffing', duration: 4, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Fleet', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  stoneskin_flask: {
    tree: FLASK_TREES.stoneskin_flask,
    id: 'stoneskin_flask', name: 'Stoneskin Flask',
    description: "Stores up to 3 charges from any orb picked up. Consumes 1 charge to grant 45% increased armor for 4.5 seconds. Can be used mid-cast. While equipped on your bar, your hits have a 2% chance each to spawn life and mana orbs (0.75s cooldown).",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#a89878',
    manaCost: 0, cooldown: 8, useTime: 0, reflex: true,
    chargeGain: [{ charge: 'flask_stoneskin', amount: 1, max: 3, on: 'orbPickup' }],
    chargeCost: { charge: 'flask_stoneskin', amount: 1 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.02), mod('orbOnHit_mana', 'flat', 0.02)],
    delivery: { type: 'self' },
    effects: [
      {
        type: 'buff', id: 'stoneskin', duration: 4.5,
        mods: [mod('armor', 'increased', 0.45)],
      },
      { type: 'buff', id: 'quaffing', duration: 4.5, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Bedrock', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  antidote_flask: {
    tree: FLASK_TREES.antidote_flask,
    id: 'antidote_flask', name: 'Antidote Flask',
    description: "Stores up to 2 charges from any orb picked up. Consumes 1 charge to cleanse up to 3 harmful ailments and grant +50% ailment resistance for 5 seconds. Can be used mid-cast. While equipped on your bar, your hits have a 2% chance each to spawn life and mana orbs (0.75s cooldown).",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#88c878',
    manaCost: 0, cooldown: 10, useTime: 0, reflex: true,
    chargeGain: [{ charge: 'flask_antidote', amount: 1, max: 2, on: 'orbPickup' }],
    chargeCost: { charge: 'flask_antidote', amount: 1 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.02), mod('orbOnHit_mana', 'flat', 0.02)],
    delivery: { type: 'self' },
    effects: [
      { type: 'cleanse', count: 3 },
      {
        type: 'buff', id: 'antidote', duration: 5,
        mods: [mod('ailmentResist', 'flat', 0.5)],
      },
      { type: 'buff', id: 'quaffing', duration: 5, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Panacea', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  // --- The drinking lane's payloads & the pocket brew ------------------------
  // Payload skills (followUp cargo for the drinking gems — never bar
  // entries themselves) and the monsters' own drink. All instant: a
  // payload must land clean even when the drink that fired it pierced a
  // running cast.

  acrid_splash: {
    id: 'acrid_splash', name: 'Acrid Splash', noDrop: true,
    description: "Release a ring of chaos damage around yourself with a 60% chance to poison enemies hit.",
    tags: ['spell', 'chaos', 'aoe'], color: '#9ac838',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [8, 14] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.6, magnitude: 1.2 },
    ],
  },

  chaser_edge: {
    id: 'chaser_edge', name: 'Chaser', noDrop: true,
    description: "Gain 18% increased attack and cast speed for 3 seconds.",
    tags: ['buff', 'duration'], color: '#e8c878',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'chaser_edge', duration: 3,
      mods: [mod('attackSpeed', 'increased', 0.18), mod('castSpeed', 'increased', 0.18)],
    }],
  },

  swig: {
    id: 'swig', name: 'Swig', noDrop: true,
    description: "Restores 22% of maximum life over 2.5 seconds when at least 20% of maximum life is missing. Can be used during other actions.",
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#c87848',
    manaCost: 0, cooldown: 9, useTime: 0, reflex: true,
    // The pct floor scales the thirst across every body that carries this:
    // a rat and a warlord both wait for a REAL dent before drinking.
    gate: { missing: { kind: 'life', pct: 0.2 }, note: 'brimming' },
    delivery: { type: 'self' },
    effects: [
      { type: 'restoreOverTime', resource: 'life', amount: 4, amountPctMax: 0.22, duration: 2.5 },
      { type: 'buff', id: 'quaffing', duration: 2.5, mods: [] },
    ],
    ai: { range: 360, weight: 3 },
  },

  // ======================= The Wakeflame votive economy ====================
  // The divine-core loop, Hollow Wake style: these skills SHED Wakeflame
  // orbs while carried (equipMods → the orbOnHit/orbOnKill families),
  // scooping banks the flame (ORB_DEFS.wakeflame → CHARGE_DEFS.wakeflame)
  // and REFUNDS the cooldowns that subscribe (innateMods →
  // orbRefund_wakeflame). Passives turn the held bank into a
  // build-your-own-buff (gaugeMod on 'charge:wakeflame'); Deathwatch burns
  // it as aura upkeep; Requiem spends it whole. Every hook is an ordinary
  // stat or registry seam — no bespoke code anywhere in the loop.

  cindershell: {
    id: 'cindershell', name: 'Cindershell',
    description: "Detonate your armor in a ring of fire and physical damage with a 9% chance to ignite, gaining +3 fire and +3 physical damage per 50 armor. While slotted, 8% of your hits and 30% of your kills drop a Wakeflame orb that reduces this skill's cooldown by 1 second on pickup.",
    tags: ['spell', 'fire', 'physical', 'aoe'], color: '#ffb35a',
    manaCost: 14, cooldown: 9, useTime: 0.45,
    baseDamage: { fire: [10, 16], physical: [8, 14] },
    delivery: { type: 'nova', radius: 130 },
    innateMods: [
      linkMod('addedFire', 'armor', 0.06),
      linkMod('addedPhysical', 'armor', 0.06),
      mod('orbRefund_wakeflame', 'flat', 1),
    ],
    equipMods: [
      mod('orbOnHit_wakeflame', 'flat', 0.08),
      mod('orbOnKill_wakeflame', 'flat', 0.3),
    ],
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25 },
    ],
    requirements: { strength: 16 },
    ai: { range: 100, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  deathwatch: {
    id: 'deathwatch', name: 'Deathwatch',
    description: "Toggle to consume 1 Wakeflame and gain 15% increased damage, attack speed, and cast speed for 4 seconds. While active, consumes 1 Wakeflame every 2 seconds to grant nearby allies 12% increased damage and 6% increased movement speed until Wakeflames run out. While equipped on your bar, kills have a 35% chance to drop a Wakeflame orb.",
    tags: ['spell', 'aura', 'fire', 'buff', 'aoe'], color: '#ffd98a',
    manaCost: 0, cooldown: 1, useTime: 0.4,
    chargeCost: { charge: 'wakeflame', amount: 1, minimum: 1 },
    delivery: {
      type: 'aura', mode: 'toggle',
      upkeep: { charges: { charge: 'wakeflame', perSec: 0.5 } },
      aura: {
        radius: 140,
        allyMods: [mod('damage', 'increased', 0.12), mod('moveSpeed', 'increased', 0.06)],
      },
    },
    equipMods: [mod('orbOnKill_wakeflame', 'flat', 0.35)],
    effects: [{
      type: 'buff', id: 'vigil_flare', duration: 4,
      mods: [
        mod('attackSpeed', 'increased', 0.15),
        mod('castSpeed', 'increased', 0.15),
        mod('damage', 'increased', 0.15),
      ],
    }],
    requirements: { strength: 12, willpower: 12 },
    ai: { range: 150, weight: 1 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  requiem: {
    id: 'requiem', name: 'Requiem',
    description: "Consume all banked Wakeflames (minimum 1) to release a fire nova that deals 40% more damage per Wakeflame consumed with a 12% chance to ignite. Picking up a Wakeflame orb reduces cooldown by 1.5 seconds; while slotted, 7% of your hits and periodic passive drops spawn Wakeflame orbs.",
    tags: ['spell', 'fire', 'aoe'], color: '#f0c060',
    manaCost: 20, cooldown: 14, useTime: 0.7,
    baseDamage: { fire: [16, 26] },
    delivery: { type: 'nova', radius: 150 },
    chargeCost: { charge: 'wakeflame', amount: 'all', minimum: 1, damagePerCharge: 0.4 },
    innateMods: [mod('orbRefund_wakeflame', 'flat', 1.5)],
    equipMods: [
      mod('orbOnHit_wakeflame', 'flat', 0.07),
      // THE STANDALONE LANE: a low ambient trickle (chance per 4s tick,
      // shed at a walk-to spot) keeps the rite functional with no other
      // wakeflame ability on the bar — the scoop stays the play.
      mod('orbTrickle_wakeflame', 'flat', 0.25),
    ],
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35 },
    ],
    requirements: { strength: 10, willpower: 16 },
    ai: { range: 110, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  // ======================= Movement, dashes & transform channels ===========
  // §10: the flicker, the held fireball, the auto-lunge, the storm you
  // wear, and the three-throated drain.

  riftstep: {
    id: 'riftstep', name: 'Riftstep',
    description: "Blinks to your cursor and deals physical damage on arrival. Consumes 1 of up to 3 charges (4s recharge per charge), repeating the blink-strike once for each remaining charge you hold and re-aiming at the nearest enemy.",
    tags: ['spell', 'movement', 'physical', 'aoe'], color: '#9ab0f0',
    manaCost: 6, cooldown: 0, useTime: 0,
    useCharges: { max: 3, recharge: 4, stepsFromBank: true },
    baseDamage: { physical: [10, 15] },
    innateMods: [
      mod('moveExplode', 'flat', 1.0),
      mod('repeatRetarget', 'override', 1),
    ],
    delivery: { type: 'blink', range: 340 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 22, intelligence: 12 },
    thresholds: [
      { level: 12, label: 'Deeper rift', mods: [mod('skillCharges', 'flat', 1)] },
    ],
  },

  flickerstep: {
    id: 'flickerstep', name: 'Flickerstep',
    description: "Repeatedly press the skill key during the cast bar to queue extra blink-strikes. When the cast completes, executes all queued blinks in rapid succession against nearby enemies for physical damage.",
    tags: ['spell', 'movement', 'physical', 'aoe'], color: '#b0a0f0',
    manaCost: 14, cooldown: 6, useTime: 0.85,
    castMode: 'multitude',
    baseDamage: { physical: [9, 14] },
    innateMods: [
      mod('moveExplode', 'flat', 1.0),
      mod('repeatRetarget', 'override', 1),
    ],
    delivery: { type: 'blink', range: 300 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 24, intelligence: 14 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  riftstorm: {
    id: 'riftstorm', name: 'Riftstorm',
    description: "Teleports to your target for physical damage, then repeats the strike once for each Frenzy charge you hold, consuming your Frenzy charges to deal 12% more damage per charge spent. Kills with Riftstorm grant 1 Frenzy charge (up to 3).",
    tags: ['spell', 'movement', 'physical', 'aoe'], color: '#8ae0a0',
    manaCost: 8, cooldown: 3, useTime: 0,
    baseDamage: { physical: [11, 17] },
    // The SOFT spender shape (Ravening's knob, innate): always castable;
    // whatever Frenzy is banked converts to extra steps and cruelty.
    chargeCost: {
      charge: 'frenzy', amount: 'all', optional: true,
      damagePerCharge: 0.12, repeatsPerCharge: 1,
    },
    chargeGain: [{ charge: 'frenzy', amount: 1, max: 3, on: 'kill' }],
    innateMods: [
      mod('moveExplode', 'flat', 1.0),
      mod('repeatRetarget', 'override', 1),
    ],
    delivery: { type: 'blink', range: 320 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 26 },
    thresholds: [
      { level: 12, label: 'Deeper hunger', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  immolation_rush: {
    id: 'immolation_rush', name: 'Immolation Rush',
    description: "Hold up to 1.8 seconds to charge, then release to rush forward as a burning comet that explodes at launch and on arrival with a 14% chance to ignite. Charging scales blast damage from 80% to 240% and width up to 180%, while reducing travel speed.",
    tags: ['spell', 'fire', 'movement', 'aoe'], color: '#ff7838',
    manaCost: 12, cooldown: 5, useTime: 0.3,
    castMode: 'charge',
    chargeUp: { maxTime: 1.8, minScale: 0.8, maxScale: 2.4, aoeScaleMax: 1.8, speedAtFull: 0.45 },
    baseDamage: { fire: [12, 18] },
    innateMods: [mod('moveExplode', 'flat', 0.9)],
    delivery: { type: 'dash', distance: 380, speed: 620, width: 56 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.35 },
    ],
    requirements: { strength: 14, intelligence: 16 },
    ai: { range: 300, weight: 2 },
  },

  closing_fang: {
    id: 'closing_fang', name: 'Closing Fang',
    description: "Lunge automatically toward the nearest enemy near your cursor, slashing enemies along the dash path for reduced damage and striking the primary target on arrival with a 30% chance to inflict Bleed.",
    tags: ['attack', 'movement', 'physical', 'melee'], color: '#c8a068',
    manaCost: 5, cooldown: 2.5, useTime: 0,
    targeting: { target: 'enemy', castRange: 420, searchRadius: 200 },
    baseDamage: { physical: [11, 16] },
    innateMods: [mod('moveExplode', 'flat', 0.8)],
    // The trip GRAZES; the arrival bites (no free double-hit on the way in).
    delivery: { type: 'dash', distance: 280, speed: 900, width: 44, corridorScale: 0.35 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { dexterity: 18 },
    ai: { range: 260, weight: 2 },
  },

  tornado: {
    id: 'tornado', name: 'Tornado',
    description: "Channel for up to 6 seconds while moving at 50% speed to surround yourself with a vortex that deals physical damage and buffets enemies in random directions, ramping up to 140% increased damage and 110% increased area.",
    tags: ['spell', 'physical', 'aoe', 'channel', 'duration'], color: '#a8c8b8',
    manaCost: 4, cooldown: 4, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.32, windup: 0.2, move: 'slowed', moveFactor: 0.5,
      trackAim: false, cooldownOnEnd: true, maxHold: 6,
      ramp: { per: 0.18, max: 1.4 },
      rampAoe: { per: 0.22, max: 1.1 },
    },
    baseDamage: { physical: [7, 11] },
    innateMods: [mod('knockBuffet', 'flat', 1)],
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 85, mode: 'buffet' },
    ],
    requirements: { intelligence: 20, dexterity: 12 },
    ai: { range: 120, weight: 2 },
  },

  sanguine_leech: {
    id: 'sanguine_leech', name: 'Sanguine Leech',
    description: "Channel while moving at 45% speed to tether up to 3 enemies near your cursor, dealing chaos damage with a 30% chance to inflict Decay and leeching 35% of the damage dealt as life.",
    tags: ['spell', 'chaos', 'targeted', 'channel', 'duration'], color: '#b84868',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.45, windup: 0.2, move: 'slowed', moveFactor: 0.45, trackAim: true },
    targeting: { target: 'enemy', castRange: 380, searchRadius: 170 },
    baseDamage: { chaos: [8, 13] },
    siphon: 0.35,
    innateMods: [mod('multiTarget', 'flat', 2)],
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.3, magnitude: 0.4 },
    ],
    requirements: { willpower: 22 },
    ai: { range: 340, weight: 2, keepDistance: 240 },
  },

  // ======================= Minion meta, amalgams & corpse tools ============
  // §9: command layers, the fused horror, hit-conscripted weapons, relics
  // that answer your swings, and on-demand corpses.

  marshals_rift: {
    id: 'marshals_rift', name: "Marshal's Rift",
    description: "Teleport all of your mobile minions to your side and order them to surge toward your target location for 5 seconds.",
    tags: ['spell', 'minion', 'instant'], color: '#b090e0',
    manaCost: 10, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [
      { type: 'recallMinions' },
      { type: 'commandMinions', duration: 5 },
    ],
    requirements: { willpower: 16 },
  },

  the_amalgam: {
    recoveryCues: { arrive: { motion: 'condense', ground: 'flesh' } },
    id: 'the_amalgam', name: 'The Amalgam',
    description: "Channel while stationary to consume nearby friendly minions one by one, then release to fuse them into a towering Amalgam for 22 seconds that gains 16% more damage, 22% more life, and 9% increased size per minion consumed (up to 8).",
    tags: ['spell', 'chaos', 'summon', 'minion', 'channel', 'duration'], color: '#a06888',
    manaCost: 4, cooldown: 8, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.4, windup: 0.2, move: 'immobile', trackAim: false, cooldownOnEnd: true },
    amalgam: {
      radius: 260, monsterId: 'amalgam_horror', cap: 8,
      perMinion: { size: 0.09, damage: 0.16, life: 0.22 },
      duration: 22,
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { willpower: 26, intelligence: 16 },
  },

  forgebound: {
    id: 'forgebound', name: 'Forgebound',
    description: "Smash in a wide frontal melee arc; each enemy hit has a 30% chance to summon an animated weapon that fights for you, up to 3 active at once.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'minion'], color: '#d8b06a',
    manaCost: 6, cooldown: 0, useTime: 0.65,
    baseDamage: { physical: [11, 17] },
    innateMods: [mod('proc_forge_weapon', 'flat', 0.3)],
    delivery: { type: 'melee', range: 62, arcDeg: 120 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 20 },
    ai: { range: 65, weight: 2 },
  },

  warden_relic: {
    id: 'warden_relic', name: 'Warden Relic',
    description: "Place a destructible relic for 12 seconds (up to 1 active at a time) that releases a physical damage burst around itself whenever you complete an attack, scaling with your minion stats.",
    tags: ['spell', 'summon', 'minion', 'totem', 'duration', 'aoe'], color: '#e8d8a0',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    baseDamage: { physical: [4, 6] },
    delivery: {
      type: 'construct', kind: 'relic', look: 'device_warden_relic', castSkillId: 'relic_burst',
      range: 0, duration: 12, maxActive: 1, life: 50, placeRange: 260,
      interval: 0.7,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18 },
    ai: { range: 200, weight: 1 },
  },

  relic_burst: {
    id: 'relic_burst', name: 'Relic Burst', noDrop: true,
    description: "Release a ring of physical damage around the Warden Relic when its owner completes an attack.",
    tags: ['spell', 'physical', 'aoe', 'minion'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'nova', radius: 120 },
    effects: [{ type: 'damage' }],
  },

  mender_relic: {
    id: 'mender_relic', name: 'Mender Relic',
    description: "Place a destructible relic for 12 seconds (up to 1 active at a time) that releases a healing wave to nearby allies whenever you complete an attack.",
    tags: ['spell', 'summon', 'minion', 'totem', 'duration', 'heal'], color: '#a8e0b8',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    delivery: {
      type: 'construct', kind: 'relic', look: 'device_mender_relic', castSkillId: 'relic_mend',
      range: 0, duration: 12, maxActive: 1, life: 50, placeRange: 260,
      interval: 0.9,
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 200, weight: 1 },
  },

  relic_mend: {
    id: 'relic_mend', name: 'Relic Mend', noDrop: true,
    description: "Release a healing wave to allies around the Mender Relic when its owner completes an attack.",
    tags: ['spell', 'heal', 'aoe', 'minion'], color: '#a8e0b8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 150, affects: 'allies' },
    effects: [{ type: 'heal', amount: 6 }],
  },

  // THE SHAMBLING HORDE — THE MASTERY LADDER's Novice Necromancer opening
  // (data/classes.ts kit; her spec 2026-09-05: the corpse-blast worn as a
  // walking body, no corpse required). Each cast raises ONE grave shambler
  // that lurches at the nearest enemy and DETONATES on arrival — the bomber
  // grammar (brain 'bomber' + explodeOnDeath, data/monsters.ts grave_shambler)
  // on a zombie's mindless feet, spent in seconds. Slow, aggressive, brief,
  // loud. (Retuned from the old two-zombies-for-25s wall — an orphan no pool
  // ever dropped — under the same id.)
  shambler_horde: {
    id: 'shambler_horde', name: 'Shambling Horde',
    tree: NECROMANCER_TREES.shambler_horde,
    description: "Summons a Grave Shambler that lurches toward the nearest enemy and explodes on arrival, dealing area fire damage scaled by its maximum life and your minion damage.",
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#8aa868',
    manaCost: 9, cooldown: 0.9, useTime: 0.55,
    delivery: {
      type: 'summon', monsterId: 'grave_shambler',
      count: 1, maxActive: 6, duration: 7,
    },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12), mod('minionDamage', 'increased', 0.1)] },
  },

  exhume: {
    id: 'exhume', name: 'Exhume',
    description: "Unearth 2 fresh corpses at the target location that can be consumed or raised by corpse skills.",
    tags: ['spell', 'corpse', 'physical'], color: '#b8a888',
    manaCost: 8, cooldown: 2, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{ type: 'spawnCorpse', monsterId: 'skeleton_warrior', count: 2 }],
    requirements: { willpower: 14, intelligence: 10 },
    thresholds: [
      { level: 12, label: 'Deeper digging', mods: [mod('cooldownRecovery', 'increased', 0.25)] },
    ],
  },

  // --- Meta-payloads (noDrop; granted by supports/hosts) --------------------

  command_detonate: {
    id: 'command_detonate', name: 'Self-Destruct', noDrop: true,
    description: "Order all of your resummonable minions to detonate, dealing 80% of each minion's maximum life as area damage.",
    tags: ['spell', 'minion', 'instant'], color: '#e86848',
    manaCost: 0, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'detonateMinions', fraction: 0.8 }],
  },

  shatter_totem: {
    id: 'shatter_totem', name: 'Shatterrite', noDrop: true,
    description: "Detonate all of your active constructs, each dealing 120% of its maximum life as physical damage in an area around itself.",
    tags: ['spell', 'physical', 'aoe', 'instant'], color: '#c8a878',
    manaCost: 0, cooldown: 3, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'shatterConstructs', fraction: 1.2, radius: 110 }],
  },

  // ======================= Status puppeteering ==============================
  // The condition-necromancer archetype (the GW1 homage): afflictions are
  // MATERIEL, not just damage — spread what rides the enemy (Epidemic),
  // draw what rides your allies onto yourself (Draw Corruption), then pour
  // everything you carry into a chosen vessel (Transfusion). All three ride
  // world.transplantStatus, so strength/duration knobs stay uniform.

  epidemic: {
    id: 'epidemic', name: 'Epidemic',
    description: "Strike the target area for chaos damage and spread all active ailments on enemies hit to nearby enemies at full magnitude and refreshed duration.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#8ac860',
    manaCost: 14, cooldown: 5, useTime: 0.55,
    baseDamage: { chaos: [3, 5] },
    delivery: { type: 'ground', radius: 130, castRange: 440, delay: 0.15 },
    effects: [
      { type: 'damage' },
      { type: 'spreadStatus', radius: 180, duration: 'refresh' },
    ],
    requirements: { intelligence: 16, willpower: 12 },
    ai: { range: 400, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.04)] },
  },

  draw_corruption: {
    id: 'draw_corruption', name: 'Draw Corruption',
    description: "Transfer all active ailments from nearby allies onto yourself with their remaining durations intact, healing yourself for each ailment transferred.",
    tags: ['spell', 'chaos', 'instant'], color: '#9a78b8',
    manaCost: 10, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'siphonStatus', radius: 280, from: 'allies', healPer: 8 }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  transfusion: {
    id: 'transfusion', name: 'Transfusion',
    description: "Transfer all ailments currently on you to the target at full magnitude and refreshed duration alongside a chaos hit, splashing those ailments to nearby enemies.",
    tags: ['spell', 'chaos', 'targeted', 'duration'], color: '#b06bd4',
    manaCost: 12, cooldown: 3, useTime: 0.4,
    baseDamage: { chaos: [6, 10] },
    targeting: { target: 'enemy', castRange: 340 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'transfuseStatus', duration: 'refresh', splash: 130 },
    ],
    requirements: { willpower: 16, intelligence: 12 },
    ai: { range: 320, weight: 2 },
  },

  // ======================= Curses & hexes ==================================
  // §8: linked hexes, hex-eaters, brands that punish proximity, and dooms
  // that answer at death or expiry — whichever comes first.

  malediction: {
    id: 'malediction', name: 'Malediction',
    description: "Creates a lingering pool of chaos damage that inflicts Decay. Gains 30% more damage and 25% increased duration for each other curse skill equipped on your skill bar.",
    tags: ['spell', 'chaos', 'curse', 'aoe', 'duration'], color: '#9a58c8',
    manaCost: 12, cooldown: 2.5, useTime: 0.7,
    baseDamage: { chaos: [6, 9] },
    linkedHexes: { dmgPerHex: 0.3, durPerHex: 0.25 },
    delivery: {
      type: 'ground', radius: 130, castRange: 440, delay: 0.2,
      lingerDuration: 3, tickInterval: 0.5,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 1, magnitude: 0.8 },
    ],
    requirements: { willpower: 20, intelligence: 14 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  anathema: {
    id: 'anathema', name: 'Anathema',
    description: "Unleashes a chaos burst on an enemy and nearby targets that consumes all curses and hexes on them to deal 80% more damage.",
    tags: ['spell', 'chaos', 'targeted', 'aoe'], color: '#b048b8',
    manaCost: 11, cooldown: 3, useTime: 0.55,
    targeting: { target: 'enemy', castRange: 420 },
    baseDamage: { chaos: [16, 24] },
    shatterStatus: {
      statuses: ['despair', 'agony', 'indecision', 'befuddlement', 'bewilder', 'torment', 'doombrand', 'doom'],
      mult: 1.8,
    },
    delivery: { type: 'target', splash: 130 },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 22 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  soul_glut: {
    id: 'soul_glut', name: 'Soul Glut',
    description: "Releases a chaos nova around you that hits only cursed enemies, granting you decaying ward for each cursed enemy struck.",
    tags: ['spell', 'chaos', 'aoe'], color: '#8a68d8',
    manaCost: 10, cooldown: 2.5, useTime: 0.55,
    baseDamage: { chaos: [12, 18] },
    delivery: {
      type: 'nova', radius: 250,
      requiresStatus: ['despair', 'agony', 'indecision', 'befuddlement', 'torment', 'decay', 'doombrand'],
    },
    effects: [
      { type: 'damage' },
      { type: 'ward', amount: 9, onHit: true },
    ],
    requirements: { willpower: 24 },
    ai: { range: 220, weight: 2 },
  },

  fulgurweb: {
    id: 'fulgurweb', name: 'Fulgurweb',
    description: "Brands an enemy with a web of lightning that periodically arcs lightning bolts to other enemies near the branded target.",
    tags: ['spell', 'lightning', 'targeted', 'duration', 'curse'], color: '#e8e05a',
    manaCost: 9, cooldown: 1.5, useTime: 0.5,
    targeting: { target: 'enemy', castRange: 440 },
    baseDamage: { lightning: [7, 11] },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'fulgur_brand', chance: 1, magnitude: 0.4 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  doombrand: {
    id: 'doombrand', name: 'Doombrand',
    description: "Brands an enemy with a volatile mark that detonates for area damage when its duration expires or immediately when the target dies.",
    tags: ['spell', 'chaos', 'targeted', 'duration', 'curse'], color: '#a848a8',
    manaCost: 10, cooldown: 2, useTime: 0.55,
    targeting: { target: 'enemy', castRange: 440 },
    baseDamage: { chaos: [11, 17] },
    innateMods: [mod('curseRupture', 'flat', 2.6)],
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'doombrand', chance: 1 },
    ],
    requirements: { willpower: 20 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  sacrament_of_ruin: {
    id: 'sacrament_of_ruin', name: 'Sacrament of Ruin',
    description: "Launch 3 homing chaos orbs that burst on impact with a 40% chance to inflict Decay, followed by a brief chaos pulse around yourself.",
    tags: ['spell', 'chaos', 'projectile', 'aoe'], color: '#c058c8',
    manaCost: 13, cooldown: 2, useTime: 0.8,
    baseDamage: { chaos: [10, 15] },
    delivery: {
      type: 'projectile', speed: 380, radius: 12, range: 460,
      count: 3, spreadDeg: 70,
      explode: { radius: 80, damageScale: 0.75 },
      trajectory: { homing: 2.4 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.4, magnitude: 0.5 },
      { type: 'spawnZone', radius: 110, duration: 1.2, tickInterval: 0.3, damageScale: 0.4 },
    ],
    requirements: { willpower: 22, intelligence: 14 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  // ======================= Ground fields & fill-in geometry ================
  // §7: cone fill-ins, the true side-to-side sweep, under-enemy sparks,
  // breathing rings, and worn (caster-following) fields.

  wildfire_sweep: {
    id: 'wildfire_sweep', name: 'Wildfire Sweep',
    description: "Sweeps a cone of wildfire that ignites along its outer rim first and burns inward toward you, dealing fire damage over time with a 14% chance to ignite on each tick.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff7838',
    manaCost: 11, cooldown: 2.5, useTime: 0.65,
    baseDamage: { fire: [10, 15] },
    delivery: {
      type: 'ground', radius: 190, castRange: 0, delay: 0.15,
      lingerDuration: 2.2, tickInterval: 0.4,
      shape: 'crescent', arcDeg: 95,
      fillFrom: 0.95, fillTime: 1.6,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 160, weight: 2 },
  },

  reavers_sweep: {
    id: 'reavers_sweep', name: "Reaver's Sweep",
    description: "Sweep a crescent blade at arm's length across your front, hitting each enemy along the outer arc once with a 25% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'duration', 'sweep'], color: '#b06ad8',
    manaCost: 10, cooldown: 2, useTime: 0.6,
    baseDamage: { physical: [10, 15] },
    delivery: {
      type: 'ground', radius: 150, castRange: 0, delay: 0,
      lingerDuration: 1.1, tickInterval: 0.2,
      shape: 'crescent', arcDeg: 85,
      sweep: { arcDeg: 200 },
      hitOnce: true,
      // The pass does the cutting — no opening smack on the whole crescent
      // (the Scythe Arc discipline; Harvest Stroke below keeps the
      // smack-then-sweep as its own two-part lesson).
      noImpact: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.25 },
    ],
    requirements: { strength: 18 },
    ai: { range: 130, weight: 2 },
  },

  scythe_arc: {
    id: 'scythe_arc', name: 'Scythe Arc',
    description: "Swings a solid frontal wedge that hits all enemies from close range out to the tip of the blade once, with a 25% chance to inflict bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'duration', 'sweep'], color: '#c87ae0',
    manaCost: 9, cooldown: 1.8, useTime: 0.5,
    baseDamage: { physical: [11, 16] },
    delivery: {
      type: 'ground', radius: 115, castRange: 0, delay: 0,
      lingerDuration: 0.9, tickInterval: 0.18,
      shape: 'sector', arcDeg: 80,
      sweep: { arcDeg: 190 },
      hitOnce: true,
      // The blade hurts where it PASSES — no opening hit on the whole
      // sector (the impact stays a lever for skills that want one).
      noImpact: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.25 },
    ],
    requirements: { strength: 16 },
    ai: { range: 100, weight: 2 },
  },

  harvest_stroke: {
    id: 'harvest_stroke', name: 'Harvest Stroke',
    description: "Strike forward with a heavy melee cut that has a 30% chance to inflict Bleed, followed a beat later by an automatic full frontal sweep.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#c88ae0',
    manaCost: 11, cooldown: 2.2, useTime: 0.55,
    baseDamage: { physical: [14, 21] },
    delivery: { type: 'melee', range: 95, arcDeg: 70 },
    // The follow-through (FollowUpSpec): the sweep fires itself 0.4s after
    // every completed swing — unpaid, uncooled, at the same bearing.
    followUp: { skillId: 'follow_sweep', delay: 0.4 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { strength: 18, dexterity: 10 },
    ai: { range: 90, weight: 2 },
  },

  follow_sweep: {
    id: 'follow_sweep', name: 'Follow-Through', noDrop: true,
    description: "Perform an automatic follow-up sweep across your front that hits each enemy in its arc once with a 20% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'duration', 'sweep'], color: '#b880d8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [8, 12] },
    delivery: {
      type: 'ground', radius: 125, castRange: 0, delay: 0,
      lingerDuration: 0.8, tickInterval: 0.18,
      shape: 'sector', arcDeg: 75,
      sweep: { arcDeg: 200 },
      hitOnce: true, noImpact: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.2, magnitude: 0.25 },
    ],
  },

  closing_shears: {
    id: 'closing_shears', name: 'Closing Shears',
    description: "Sweeps two blades inward from both flanks to meet along your aim line, each dealing physical damage with a 25% chance to bleed and a 12% chance to stun. Enemies in the center where the blades meet are hit by both sweeps.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'duration', 'sweep'], color: '#d090e8',
    manaCost: 14, cooldown: 3.5, useTime: 0.65,
    baseDamage: { physical: [9, 14] },
    delivery: {
      // converge: the 240° span is split into two mirrored 120° hands
      // closing onto the cast bearing over the linger (sweep.converge).
      type: 'ground', radius: 135, castRange: 0, delay: 0,
      lingerDuration: 1.0, tickInterval: 0.2,
      shape: 'sector', arcDeg: 75,
      sweep: { arcDeg: 240, converge: true },
      hitOnce: true, noImpact: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.25 },
      { type: 'status', status: 'stun', chance: 0.12 },
    ],
    requirements: { strength: 20 },
    ai: { range: 120, weight: 2 },
  },

  sparkfield: {
    id: 'sparkfield', name: 'Sparkfield',
    description: "Place 6 short-fuse lightning mines directly beneath enemies in a wide area at the target location, each detonating with a 30% chance to shock.",
    tags: ['spell', 'lightning', 'aoe', 'storm'], color: '#f0e84a',
    manaCost: 9, cooldown: 1.5, useTime: 0.5,
    baseDamage: { lightning: [10, 16] },
    delivery: {
      type: 'storm', count: 6, interval: 0.05,
      areaRadius: 200, hitRadius: 58, castRange: 460,
      atEnemies: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  squall_rune: {
    id: 'squall_rune', name: 'Squall Rune',
    description: "Releases an expanding ring of wind that grants you and allies inside 20% increased movement speed and 12% increased attack speed while dealing lightning damage with a 35% chance to shock enemies hit. After expanding, the ring retracts and detonates at your feet for 220% damage.",
    tags: ['spell', 'lightning', 'aoe', 'buff', 'duration'], color: '#c8e87a',
    manaCost: 12, cooldown: 6, useTime: 0.4,
    baseDamage: { lightning: [7, 11] },
    delivery: {
      type: 'ground', radius: 60, castRange: 0, delay: 0,
      lingerDuration: 3, tickInterval: 0.4,
      follow: true,
      grow: 95,
      retract: { at: 1.5, speed: 130 },
      endBurst: { damageScale: 2.2, radiusScale: 1.6 },
      domain: { allyMods: [mod('moveSpeed', 'increased', 0.2), mod('attackSpeed', 'increased', 0.12)] },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.35 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 120, weight: 2 },
  },

  devouring_swarm: {
    id: 'devouring_swarm', name: 'Devouring Swarm',
    description: "Surround yourself with a swarm for 4 seconds (up to 1 active at a time) that repeatedly deals damage over time to adjacent enemies with a 25% chance to poison.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#8ac858',
    manaCost: 9, cooldown: 1, useTime: 0.4,
    baseDamage: { chaos: [6, 9] },
    delivery: {
      type: 'ground', radius: 105, castRange: 0, delay: 0,
      lingerDuration: 4, tickInterval: 0.4,
      follow: true, exclusive: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { willpower: 16 },
    ai: { range: 100, weight: 2 },
  },

  blizzard_coil: {
    id: 'blizzard_coil', name: 'Blizzard Coil',
    description: "Surrounds you with a freezing field for 3.5 seconds that ticks cold damage with a 40% chance to chill. Multiple casts stack independently.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#a8d8f0',
    manaCost: 10, cooldown: 0, useTime: 0.5,
    baseDamage: { cold: [5, 8] },
    delivery: {
      type: 'ground', radius: 115, castRange: 0, delay: 0,
      lingerDuration: 3.5, tickInterval: 0.45,
      follow: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.4 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 110, weight: 2 },
  },

  // ======================= Fissures, rifts & markers =======================
  // §6: the crack family — tearing chains, branch forks, closing passes,
  // linked marker sets, the mine-channel.

  fissure: {
    id: 'fissure', name: 'Fissure',
    description: "Tears a fissure along your aim line that damages enemies as it opens, then snaps shut to deal 70% damage a second time. Each hit has a 15% chance to stun.",
    tags: ['spell', 'physical', 'fire', 'aoe', 'duration', 'fissure'], color: '#c87848',
    manaCost: 10, cooldown: 2.5, useTime: 0.6,
    baseDamage: { physical: [9, 14], fire: [4, 7] },
    delivery: {
      type: 'ground', radius: 46, castRange: 120, delay: 0.12,
      tickInterval: 0.5,
      fissure: {
        length: 420, speed: 520,
        close: { delay: 0.8, damageScale: 0.7 },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.15 },
    ],
    requirements: { strength: 16, intelligence: 12 },
    ai: { range: 340, weight: 2 },
  },

  earthrender: {
    id: 'earthrender', name: 'Earthrender',
    description: "Fires a projectile that pierces up to 2 enemies and tears open a ground fissure along its entire flight path that ticks damage and snaps shut behind it.",
    tags: ['spell', 'physical', 'projectile', 'aoe', 'duration', 'fissure'], color: '#c8a058',
    manaCost: 12, cooldown: 2.5, useTime: 0.65,
    baseDamage: { physical: [12, 18] },
    delivery: {
      type: 'projectile', speed: 340, radius: 12, range: 380,
      pierce: 2,
      fissureTrail: {
        radius: 30, linger: 1.6, tickInterval: 0.4, damageScale: 0.7,
        close: { delay: 0.6, damageScale: 0.9 },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.1 },
    ],
    requirements: { strength: 18, intelligence: 12 },
    ai: { range: 320, weight: 2 },
  },

  netherfissure: {
    id: 'netherfissure', name: 'Netherfissure',
    description: "Opens a fiery fissure for 6 seconds that deals fire damage with a 9% chance to ignite and spawns Tormenting Spirits every 1.4 seconds to seek out nearby enemies.",
    tags: ['spell', 'chaos', 'fire', 'aoe', 'duration', 'fissure'], color: '#9a5ac8',
    manaCost: 14, cooldown: 4, useTime: 0.7,
    baseDamage: { fire: [5, 8], chaos: [5, 8] },
    delivery: {
      type: 'ground', radius: 44, castRange: 160, delay: 0.12,
      lingerDuration: 6, tickInterval: 0.5,
      exclusive: true,
      // Spirits RISE FROM THE CRACK (origin 'cursor' on the payload plants
      // each one at the emit point) and scatter on random bearings — the
      // homing does the hunting from there. A river of souls, not a
      // fountain out of the caster.
      emit: { skillId: 'nether_spirit', interval: 1.4, at: 'point', bearing: 'random' },
      fissure: { length: 340, speed: 480 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { willpower: 20, intelligence: 14 },
    ai: { range: 300, weight: 2 },
  },

  nether_spirit: {
    id: 'nether_spirit', name: 'Nether Spirit', noDrop: true,
    description: "Release a wandering spirit that seeks nearby enemies and inflicts Torment on contact.",
    tags: ['spell', 'chaos', 'projectile', 'duration'], color: '#b07ae0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [5, 8] },
    delivery: {
      // Rises AT the crack point it was emitted from (never streams out of
      // the far-away caster), drifts a beat, then LATCHES onto the living.
      type: 'projectile', speed: 200, radius: 10, range: 600,
      duration: 4,
      origin: 'cursor', originRange: 9999,
      trajectory: { homing: 3.4, erratic: 2 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'torment', chance: 1, magnitude: 0.5 },
    ],
  },

  grasping_chasm: {
    id: 'grasping_chasm', name: 'Grasping Chasm',
    description: "Splits the ground at your feet for 7 seconds, lashing nearby enemies with tendrils that ensnare, slow, and poison targets hit.",
    tags: ['spell', 'chaos', 'physical', 'aoe', 'duration', 'fissure'], color: '#7a9a5a',
    manaCost: 16, cooldown: 5, useTime: 0.75,
    baseDamage: { physical: [4, 6], chaos: [4, 6] },
    delivery: {
      // Entangle × Netherfissure: the crack is laid FROM the caster
      // (castRange 0 projects it along the facing), stays open as the one
      // wound in the world (exclusive), and its whole length lashes
      // tendrils at enemies within 90 units of the crack (emit.reach).
      type: 'ground', radius: 40, castRange: 0, delay: 0.1,
      lingerDuration: 7, tickInterval: 0.6,
      exclusive: true,
      emit: { skillId: 'chasm_tendril', interval: 0.8, count: 2, at: 'enemy', reach: 90 },
      fissure: { length: 300, speed: 520 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 120, weight: 2 },
  },

  chasm_tendril: {
    id: 'chasm_tendril', name: 'Grasping Tendril', noDrop: true,
    description: "Lashes out from the chasm to ensnare a target for 1.5 seconds with a 60% chance to inflict poison.",
    tags: ['spell', 'chaos', 'physical', 'aoe'], color: '#6a8a4a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [3, 5], chaos: [3, 5] },
    delivery: { type: 'ground', radius: 36, castRange: 9999, delay: 0.12 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 1, durationOverride: 1.5 },
      { type: 'status', status: 'poison', chance: 0.6, magnitude: 0.35 },
    ],
  },

  faultbreak: {
    id: 'faultbreak', name: 'Faultbreak',
    description: "Slams the ground in front of you to project a fissure along your aim line, dealing physical damage with a 12% chance to stun.",
    tags: ['attack', 'melee', 'physical', 'aoe', 'duration', 'fissure'], color: '#b8905e',
    manaCost: 11, cooldown: 3, useTime: 0.65,
    baseDamage: { physical: [14, 22] },
    delivery: {
      type: 'ground', radius: 30, castRange: 55, delay: 0.08,
      lingerDuration: 2.4, tickInterval: 0.5,
      fissure: { length: 300, speed: 540 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.12 },
    ],
    requirements: { strength: 20 },
    ai: { range: 110, weight: 2 },
  },

  restless_earth: {
    id: 'restless_earth', name: 'Restless Earth',
    description: "Toggle stance that automatically tears open a fissure in a random direction from you every 2.6 seconds, dealing physical damage with an 8% chance to stun.",
    tags: ['spell', 'physical', 'aoe', 'duration', 'fissure'], color: '#a88a5a',
    manaCost: 12, cooldown: 1.5, useTime: 0.4,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'ground', radius: 26, castRange: 55, delay: 0.1,
      lingerDuration: 2.2, tickInterval: 0.5,
      fissure: { length: 260, speed: 470 },
      strobe: { interval: 2.6, bearing: 'random', reservePct: 0.2 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.08 },
    ],
    requirements: { strength: 16, willpower: 14 },
    ai: { range: 200, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  wandering_spirits: {
    id: 'wandering_spirits', name: 'Wandering Spirits',
    description: "Summon 4 spirits in a ring around you that wander erratically for 5 seconds, passing through enemies to inflict Torment and deal repeated hits.",
    tags: ['spell', 'chaos', 'projectile', 'duration'], color: '#9ab8d8',
    manaCost: 16, cooldown: 6, useTime: 0.55,
    baseDamage: { chaos: [4, 7] },
    delivery: {
      // A ring of slow ghosts loosed around the caster; huge erratic and a
      // whisper of homing = the drunken drift that still finds the living.
      // pierce ∞ + rehit: they pass THROUGH crowds, withering on the way.
      type: 'projectile', speed: 80, radius: 12, range: 4000,
      duration: 5,
      count: 4, ring: {},
      pierce: 999, rehit: 0.6,
      trajectory: { erratic: 4, homing: 0.3 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'torment', chance: 1, magnitude: 0.5 },
    ],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 160, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('effectDuration', 'increased', 0.04)] },
  },

  creeping_frost: {
    id: 'creeping_frost', name: 'Creeping Frost',
    description: "Fires an ice bolt that bursts on impact and leaves a creeping frost patch for 4.5 seconds that moves toward nearby enemies, dealing cold damage over time with a 60% chance to chill.",
    tags: ['spell', 'cold', 'projectile', 'aoe', 'duration'], color: '#7ad4e8',
    manaCost: 13, cooldown: 3, useTime: 0.6,
    baseDamage: { cold: [8, 13] },
    delivery: {
      type: 'projectile', speed: 460, radius: 9, range: 420, pierce: 0,
      explode: { radius: 70, damageScale: 0.8 },
      endZone: {
        radius: 80, duration: 4.5, tickInterval: 0.5, damageScale: 0.35,
        seek: { speed: 55, range: 380 },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.6 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('effectDuration', 'increased', 0.04)] },
  },

  // ======================= Conjured objects =================================
  // BREAKABLE furniture (ConstructDelivery.breakable + deathBurst): the
  // object joins its OWNER's hostile pool — your own skills demolish it at
  // a privileged rate (affinity tags harder still) and the death detonates
  // the host skill's roll. Tagged 'totem' so the Rite of Shattering meta
  // detonates them on demand — activation variety by composition. The
  // Juggernaut's secret vocation is expected to build on stone_spires
  // (grants/warps via vocation nodes — no engine work needed, it's data).

  stone_spires: {
    id: 'stone_spires', name: 'Stone Spires',
    description: "Raises a ring of 5 stone spires for up to 12 seconds that block movement and projectiles. Your own attacks damage spires at 4x speed, and each spire explodes for physical area damage with a 20% chance to stun when destroyed.",
    tags: ['spell', 'physical', 'aoe', 'totem', 'duration'], color: '#b0a08a',
    manaCost: 15, cooldown: 6, useTime: 0.6,
    baseDamage: { physical: [10, 16] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_stone_spires',
      range: 0, duration: 12, maxActive: 10, life: 44,
      placeRange: 240,
      ring: { segments: 5, radius: 85 },
      breakable: { ownerMult: 4 },
      deathBurst: { impactFx: 'mechanic:deathStone', radius: 95, damageScale: 1 },
      clearway: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.2 },
    ],
    requirements: { strength: 18, willpower: 12 },
    ai: { range: 200, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  frost_wall: {
    id: 'frost_wall', name: 'Frost Wall',
    description: "Raises a wall of 6 ice segments that pushes enemies back and pulses cold damage with a 90% chance to chill. Your attacks and cold skills shatter segments faster, causing them to burst into freezing shrapnel.",
    tags: ['spell', 'cold', 'aoe', 'totem', 'duration'], color: '#9ad4f0',
    manaCost: 16, cooldown: 7, useTime: 0.6,
    baseDamage: { cold: [8, 13] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_frost_wall',
      range: 0, duration: 9, maxActive: 12, life: 32,
      placeRange: 340,
      wallSegments: 6,
      breakable: { ownerMult: 2.5, affinityTags: ['cold'], affinityMult: 2 },
      deathBurst: { impactFx: 'mechanic:deathFrostWall', radius: 85, damageScale: 0.8 },
      clearway: true,
      fx: { pulse: { interval: 0.8, radius: 70, damageScale: 0.25 } },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.9 },
    ],
    requirements: { intelligence: 18, willpower: 10 },
    ai: { range: 300, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  // ======================= The meatwright kit ==============================
  // Flesh-craft: anatomy as materiel. Walls of anonymous muscle, ground
  // that remembers being alive — pair with the SHIPPED Blood Price gem
  // (costs paid in life) for the full butcher's ledger.

  wall_of_meat: {
    id: 'wall_of_meat', name: 'Wall of Meat',
    description: "Raises a barrier of 5 flesh slabs for up to 11 seconds that block enemies and soak damage. Your attacks destroy slabs at 3x speed, causing each slab to detonate into bleeding shrapnel with a 45% chance to inflict bleed.",
    tags: ['spell', 'physical', 'chaos', 'totem', 'duration', 'aoe'], color: '#c05a4a',
    manaCost: 17, cooldown: 8, useTime: 0.7,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_wall_of_meat',
      range: 0, duration: 11, maxActive: 10, life: 55,
      placeRange: 300,
      wallSegments: 5,
      breakable: { ownerMult: 3 },
      deathBurst: { impactFx: 'mechanic:deathFleshWall', radius: 85, damageScale: 0.9 },
      clearway: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.45, magnitude: 0.4 },
    ],
    requirements: { strength: 14, willpower: 16 },
    ai: { range: 240, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  fleshspur: {
    id: 'fleshspur', name: 'Fleshspur',
    description: "Erupts hooked spurs of flesh at the target location for physical damage with a 40% chance to bleed, followed a moment later by a second eruption over a wider area for 150% damage.",
    tags: ['spell', 'physical', 'chaos', 'aoe', 'pulse'], color: '#d06858',
    manaCost: 13, cooldown: 4, useTime: 0.6,
    baseDamage: { physical: [11, 17], chaos: [3, 5] },
    delivery: {
      type: 'ground', radius: 90, castRange: 340, delay: 0.2,
      // The twitch: the meat convulses again 0.8s after the eruption
      // (GroundPulseSpec — Unsettled Earth keeps it seizing).
      pulse: { delay: 0.8, dmgMult: 1.5, radiusMult: 1.1 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.4, magnitude: 0.4 },
    ],
    requirements: { willpower: 16, strength: 12 },
    ai: { range: 320, weight: 2, keepDistance: 200 },
  },

  shardrift: {
    id: 'shardrift', name: 'Shardrift',
    description: "Open an untargetable rift for 4 seconds (up to 2 active at once) that fires a barrage of ice shards down its facing lane every 0.5 seconds.",
    tags: ['spell', 'cold', 'projectile', 'totem', 'duration'], color: '#9ac8f0',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    baseDamage: { cold: [3, 5] },
    delivery: {
      type: 'construct', kind: 'sentry', look: 'device_shardrift', castSkillId: 'rift_shard',
      range: 440, duration: 4, maxActive: 2, invulnerable: true,
      placeRange: 300, interval: 0.5,
    },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 18 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  rift_shard: {
    id: 'rift_shard', name: 'Rift Shard', noDrop: true,
    description: "Fire a tight fan of 3 ice shards from the rift, each piercing 1 enemy with a 35% chance to chill.",
    tags: ['spell', 'cold', 'projectile'], color: '#b8d8f8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { cold: [6, 10] },
    delivery: {
      type: 'projectile', speed: 620, radius: 7, range: 460,
      count: 3, spreadDeg: 24, pierce: 1,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.35 },
    ],
  },

  thundermark: {
    id: 'thundermark', name: 'Thundermark',
    description: "Places a lightning mark on the ground (up to 5 active marks). After a brief delay, lightning strikes the mark and triggers all other active marks in a chain of bolts, each with a 30% chance to shock.",
    tags: ['spell', 'lightning', 'aoe', 'storm', 'duration'], color: '#ffe14a',
    manaCost: 6, cooldown: 0, useTime: 0.4,
    baseDamage: { lightning: [12, 19] },
    delivery: {
      type: 'ground', radius: 78, castRange: 460, delay: 1.3,
      marker: { cap: 5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  arcswarm: {
    id: 'arcswarm', name: 'Arcswarm',
    description: "Channel while moving at 40% reduced speed to launch slow-moving energy orbs toward your cursor that burst on impact. Releasing the channel detonates all orbs currently in flight at once for 210% damage.",
    tags: ['spell', 'lightning', 'projectile', 'aoe', 'channel'], color: '#d8e86a',
    manaCost: 3, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.28, windup: 0, move: 'slowed', moveFactor: 0.6,
      trackAim: true,
      releaseDetonate: { damageScale: 2.1 },
    },
    baseDamage: { lightning: [5, 8] },
    delivery: {
      type: 'projectile', speed: 200, radius: 11, range: 480,
      duration: 3,
      explode: { radius: 52, damageScale: 0.7 },
      trajectory: { erratic: 2.2, accel: 0.25 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 360, weight: 2, keepDistance: 240 },
  },

  // ======================= Embedments, walls & rotation ====================
  // §5: lodged objects with run-over triggers / emissions / sibling beams,
  // construct FX presences, and the revolution levers.

  impale_lance: {
    id: 'impale_lance', name: 'Impale Lance',
    description: "Hurls a spear that pierces up to 2 enemies and lodges in the ground for 10 seconds. Walking over a lodged spear detonates it for physical area damage.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#c8b090',
    manaCost: 5, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [11, 17] },
    delivery: {
      type: 'projectile', speed: 620, radius: 9, range: 380, pierce: 2,
      plantOnLand: {
        look: 'object_impale_lance', duration: 10, life: 30,
        embed: { runOver: 'detonate', detonateSkillId: 'lance_burst' },
      },
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 16, dexterity: 12 },
    ai: { range: 340, weight: 2, keepDistance: 200 },
  },

  lance_burst: {
    id: 'lance_burst', name: 'Lance Burst', noDrop: true,
    description: "Shatter a lodged spear into a ring of splinters around itself with a 30% chance to inflict Bleed.",
    tags: ['attack', 'physical', 'aoe'], color: '#d8c0a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [12, 18] },
    delivery: { type: 'nova', radius: 95 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
  },

  stormbrand_beacon: {
    id: 'stormbrand_beacon', name: 'Stormbrand Beacon',
    description: "Place a storm beacon at the target location (up to 2 active at once) that erupts with fire, cold, and lightning damage on arrival and calls down storm bolts around itself for 5 seconds.",
    tags: ['spell', 'fire', 'lightning', 'cold', 'aoe', 'totem', 'duration'], color: '#d8a84a',
    manaCost: 14, cooldown: 6, useTime: 0.6,
    baseDamage: { fire: [4, 7], lightning: [4, 7], cold: [4, 7] },
    delivery: {
      type: 'construct', kind: 'eruptor', look: 'device_stormbrand_beacon', castSkillId: 'beacon_bolt',
      range: 200, duration: 5, maxActive: 2, life: 40, placeRange: 380,
      interval: 0.55,
      fx: { burst: { radius: 110, damageScale: 0.8 } },
    },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 20 },
    ai: { range: 340, weight: 2, keepDistance: 240 },
  },

  beacon_bolt: {
    id: 'beacon_bolt', name: 'Beacon Bolt', noDrop: true,
    description: "Strike the target ground after a brief delay for fire, cold, and lightning damage, with a 12% chance to shock, 12% chance to chill, and 4% chance to ignite.",
    tags: ['spell', 'fire', 'lightning', 'cold', 'aoe'], color: '#e8c86a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [3, 6], lightning: [3, 6], cold: [3, 6] },
    delivery: { type: 'ground', radius: 52, castRange: 9999, delay: 0.25 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.12 },
      { type: 'status', status: 'chill', chance: 0.12 },
      { type: 'status', status: 'burn', chance: 0.12, magnitude: 0.3 },
    ],
  },

  arclight_rain: {
    id: 'arclight_rain', name: 'Arclight Rain',
    description: "Fire a fan of 4 charged arrows that lodge in the ground for 6 seconds, arcing lightning beams between each other every second with a 20% chance to shock enemies along the line.",
    tags: ['attack', 'projectile', 'lightning', 'duration', 'aoe'], color: '#d8e86a',
    manaCost: 9, cooldown: 1.5, useTime: 0.7,
    baseDamage: { physical: [5, 8], lightning: [5, 9] },
    delivery: {
      type: 'projectile', speed: 540, radius: 7, range: 420,
      count: 4, spreadDeg: 46,
      plantOnLand: {
        look: 'object_arclight_arrow', duration: 6, life: 20,
        embed: { beam: { interval: 1.0, range: 300, damageScale: 0.6, width: 11 } },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { dexterity: 20, intelligence: 12 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  glacial_bulwark: {
    id: 'glacial_bulwark', name: 'Glacial Bulwark',
    description: "Raise a 5-segment destructible ice wall across your facing for 7 seconds that blocks movement and pulses cold damage to nearby enemies with a 65% chance to chill.",
    tags: ['spell', 'cold', 'totem', 'aoe', 'duration'], color: '#a8d8f0',
    manaCost: 13, cooldown: 7, useTime: 0.6,
    baseDamage: { cold: [6, 10] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_glacial_bulwark',
      range: 0, duration: 7, maxActive: 5, life: 55, placeRange: 240,
      wallSegments: 5,
      fx: { pulse: { interval: 0.9, radius: 46, damageScale: 0.45 } },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.65 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 200, weight: 1 },
  },

  glacial_rampart: {
    id: 'glacial_rampart', name: 'Glacial Rampart',
    description: "Create a line of jagged frost for 6 seconds that deals cold damage, knocks enemies back, and has an 80% chance to chill whenever an enemy crosses it.",
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#8ac8e8',
    manaCost: 11, cooldown: 6, useTime: 0.5,
    baseDamage: { cold: [10, 15] },
    delivery: {
      type: 'ground', radius: 26, castRange: 260,
      line: { segments: 5, spacing: 42 },
      // Per-frame surface tests (the Reap pattern): struck+rearm do the
      // gating, so a sprinting crosser can never slip between tick beats.
      lingerDuration: 6, tickInterval: 0,
      hitOnce: true, rearmOnExit: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 150 },
      { type: 'status', status: 'chill', chance: 0.8 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 220, weight: 1 },
  },

  cinderwhirl_trap: {
    id: 'cinderwhirl_trap', name: 'Cinderwhirl Trap',
    description: "Place a trap lasting up to 20 seconds (up to 3 active at once) that projects a rotating flame crescent when triggered, repeatedly sweeping nearby enemies with a 14% chance to ignite.",
    tags: ['spell', 'fire', 'trap', 'aoe', 'duration', 'totem'], color: '#ff8a3a',
    manaCost: 10, cooldown: 3, useTime: 0.45,
    baseDamage: { fire: [8, 13] },
    delivery: {
      type: 'construct', kind: 'trap', look: 'device_cinderwhirl_trap', castSkillId: 'cinder_whirl',
      range: 55, duration: 20, maxActive: 3, placeRange: 320,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.3 },
    ],
    requirements: { dexterity: 14, intelligence: 14 },
    ai: { range: 280, weight: 1 },
  },

  cinder_whirl: {
    id: 'cinder_whirl', name: 'Cinderwhirl', noDrop: true,
    description: "Sweep a rotating crescent of flame around the triggered trap for 3.5 seconds, dealing fire damage with a 12% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff7030',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [7, 11] },
    delivery: {
      type: 'ground', radius: 110, castRange: 9999, delay: 0,
      lingerDuration: 3.5, tickInterval: 0.3,
      shape: 'crescent', arcDeg: 95, rotate: 3.2,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.3 },
    ],
  },

  voltaic_orb: {
    id: 'voltaic_orb', name: 'Voltaic Orb',
    description: "Conjure a sphere that orbits you for 6 seconds, dealing fire and lightning damage on contact and arcing lightning to nearby enemies with a 9% chance to ignite.",
    tags: ['spell', 'fire', 'lightning', 'projectile', 'duration'], color: '#f0a848',
    manaCost: 11, cooldown: 4, useTime: 0.5,
    baseDamage: { fire: [7, 11], lightning: [4, 8] },
    delivery: {
      type: 'projectile', speed: 340, radius: 14, range: 9999,
      duration: 6, rehit: 0.6,
      trajectory: { orbit: 1.1, orbitRadius: 95 },
      zap: { interval: 0.55, radius: 130, damageScale: 0.45 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 120, weight: 2 },
  },

  aftershock_snare: {
    tree: CONTROL_STARTER_TREES.aftershock_snare,
    id: 'aftershock_snare', name: 'Aftershock Snare',
    description: "Place a trap lasting up to 20 seconds (up to 3 active at once) that detonates for physical damage and triggers 2 secondary aftershocks around the target, with a 30% chance to stun.",
    tags: ['spell', 'physical', 'trap', 'aoe', 'totem'], color: '#c8a878',
    manaCost: 9, cooldown: 2.5, useTime: 0.45,
    baseDamage: { physical: [10, 16] },
    delivery: {
      type: 'construct', kind: 'trap', look: 'device_aftershock_snare', castSkillId: 'snare_shock',
      range: 55, duration: 20, maxActive: 3, placeRange: 320,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.3 },
    ],
    requirements: { dexterity: 16 },
    ai: { range: 280, weight: 1 },
  },

  snare_shock: {
    id: 'snare_shock', name: 'Aftershock', noDrop: true,
    description: "Detonate a physical blast around the target that scatters into 2 secondary aftershocks with a 25% chance to stun.",
    tags: ['spell', 'physical', 'aoe'], color: '#d8b888',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [9, 14] },
    innateMods: [mod('aoeScatter', 'flat', 2)],
    delivery: { type: 'ground', radius: 92, castRange: 9999, delay: 0 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.25 },
    ],
  },

  // ======================= The class signatures =============================
  // Starters minted for the CLASS PARITY pass: every class opens with three
  // skills no other class opens with, and these fill the gaps the existing
  // catalog left. All ordinary gems — droppable, supportable, monster-usable
  // through the same pipeline (ai hints included on every one).

  // The Juggernaut's fury engine (Frenzy went home to the drop pool): half
  // the speed, twice the banking — the slow style feeding the same Fury
  // court Reckoning empties. Mix-and-match with any fury verb you find.
  piledriver: {
    tree: PACT_STEEL_STARTER_TREES.piledriver,
    id: 'piledriver', name: 'Piledriver',
    description: "Deliver a slow, heavy melee slam that grants 2 Fury charges (up to 5), deals 50% more poise damage, and has a 15% chance to stun.",
    tags: ['attack', 'melee', 'physical'], color: '#88b8e0',
    manaCost: 5, cooldown: 0, useTime: 0.85,
    baseDamage: { physical: [14, 22] },
    innateMods: [mod('poiseDamage', 'more', 0.5)],
    delivery: { type: 'melee', range: 55, arcDeg: 60 },
    effects: [
      { type: 'damage' },
      { type: 'gainCharge', charge: 'fury', amount: 2, max: 5 },
      { type: 'status', status: 'stun', chance: 0.15 },
    ],
    requirements: { strength: 14, fortitude: 8 },
    ai: { range: 60, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // The Tamer's approach: not the Rogue's vanishing act — a hunter's HUSH.
  // Long, walking-pace quiet that keeps the threat chart soft, so the claim
  // (or the first blow) happens on YOUR terms.
  stalk: {
    tree: BOND_STARTER_TREES.stalk,
    id: 'stalk', name: 'Stalk',
    description: "Enter stealth for 10 seconds, reducing enemy detectability by 45%, threat generated by 35%, and your movement speed by 8%.",
    tags: ['buff', 'duration'], color: '#8aa87a',
    manaCost: 10, cooldown: 10, useTime: 0.3,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'stalk', duration: 10,
      mods: [
        mod('detectability', 'more', -0.45),
        mod('threatGen', 'more', -0.35),
        mod('moveSpeed', 'increased', -0.08),
      ],
    }],
    requirements: { dexterity: 10, wisdom: 8 },
    ai: { range: 300, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  // The Trapper's strewn argument: not a device, a CONDITION OF THE GROUND.
  // Cheap area denial that hobbles the rhythm (reeling) rather than the feet.
  caltrops: {
    tree: CONTROL_STARTER_TREES.caltrops,
    id: 'caltrops', name: 'Caltrops',
    description: "Scatter spiked caltrops across the target area for 8 seconds, dealing repeated physical hits to enemies that move through them with a 50% chance to inflict Bleed and a 40% chance to reel.",
    tags: ['physical', 'aoe', 'duration'], color: '#b0a890',
    manaCost: 8, cooldown: 3, useTime: 0.4,
    baseDamage: { physical: [3, 5] },
    delivery: {
      type: 'ground', radius: 80, castRange: 280,
      lingerDuration: 8, tickInterval: 0.6,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.5, magnitude: 0.3 },
      { type: 'status', status: 'reeling', chance: 0.4 },
    ],
    requirements: { dexterity: 14 },
    ai: { range: 260, weight: 2, keepDistance: 160 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('effectDuration', 'increased', 0.06)] },
  },

  // The Brawler's meter: jab, jab, CROSS. The fast half of the pit grammar —
  // fury banked a knuckle at a time, the third beat swinging heavier. ONE
  // KEY WALKS IT (comboChain — the Trisect figure's own lane, 2026-09-11):
  // the first two presses are the jab itself (THE REPEATED STEP names the
  // host), the third within the window is the CROSS JAB — the bar's face
  // turns to it while the window holds (THE HONEST CHAIN FACE) and the
  // sliver counts the window down. Retired with it: the castCycle-armed
  // next-hit stun buff (one_two_cross) — the cross is a real step now, with
  // its own figure, damage and stun. The window is a dial for her word.
  one_two: {
    tree: PRECISION_STARTER_TREES.one_two,
    id: 'one_two', name: 'One-Two',
    description: "Strikes with a fast melee jab that grants 1 Fury charge on hit (up to 5). Using One-Two twice in rhythm makes the third press within 2 seconds unleash Cross Jab, a wide sweep across your front that stuns enemies hit.",
    tags: ['attack', 'melee', 'physical'], color: '#d8a878',
    manaCost: 2, cooldown: 0, useTime: 0.35,
    baseDamage: { physical: [6, 10] },
    comboChain: { skills: ['one_two', 'cross_jab'], window: 2 },
    delivery: { type: 'melee', range: 46, arcDeg: 50 },
    effects: [
      { type: 'damage' },
      { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
    ],
    requirements: { prowess: 10 },
    ai: { range: 50, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('attackSpeed', 'increased', 0.02)] },
  },

  // THE CROSS JAB — One-Two's third beat (noDrop: the chain's own step, the
  // Bisect idiom). THE CROSSING STRIP: a 'band' swing (MeleeDelivery.shape —
  // engine/skills.ts bandSwingGeo) sweeps ACROSS the front as a strip — the
  // far edge at reach, the width the arc's chord — so a body beside your
  // lead shoulder is struck where a jab's wedge would have missed it, and
  // it lands STUNNING. Banks Fury like the jabs; the 'crossjab' voice draws
  // the knuckle streak over the tested strip. Reach / arc / damage / stun
  // duration are dials for her word.
  cross_jab: {
    id: 'cross_jab', name: 'Cross Jab', noDrop: true,
    description: "Deliver the third strike of the One-Two sequence, sweeping a heavy punch across your front that stuns enemies hit and grants 1 Fury charge per target struck.",
    tags: ['attack', 'melee', 'physical'], color: '#f0c088',
    manaCost: 3, cooldown: 0, useTime: 0.4,
    baseDamage: { physical: [11, 17] },
    delivery: { type: 'melee', range: 52, arcDeg: 110, shape: 'band', fx: 'crossjab' },
    effects: [
      { type: 'damage' },
      { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
      { type: 'status', status: 'stun', chance: 1 },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // The Brawler's answer to Reckoning — same Fury court, different verdict:
  // Reckoning buys damage, the haymaker buys DISPLACEMENT. Spend where the
  // wall is.
  haymaker: {
    tree: PRECISION_STARTER_TREES.haymaker,
    id: 'haymaker', name: 'Haymaker',
    description: "Wind up a heavy melee hook that consumes all Fury charges to deal 15% more damage per charge spent, deal 35% more poise damage, and knock the target far back with a 25% chance to stun.",
    tags: ['attack', 'melee', 'physical'], color: '#e08858',
    manaCost: 7, cooldown: 2, useTime: 0.8,
    baseDamage: { physical: [16, 26] },
    chargeCost: { charge: 'fury', amount: 'all', optional: true, damagePerCharge: 0.15 },
    innateMods: [mod('poiseDamage', 'more', 0.35)],
    delivery: { type: 'melee', range: 50, arcDeg: 40 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 190 },
      { type: 'status', status: 'stun', chance: 0.25 },
    ],
    requirements: { strength: 12, prowess: 10 },
    ai: { range: 55, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  // The Warlord's planted word: a BANNER, not a shout — the rally that
  // stays where you put it and holds the line around itself.
  battle_standard: {
    tree: BASTION_STARTER_TREES.battle_standard,
    id: 'battle_standard', name: 'Battle Standard',
    description: "Plant a destructible banner for up to 16 seconds that grants allies within its radius 12% increased damage, 5% increased movement speed, and 8 reflected damage against attackers.",
    tags: ['spell', 'totem', 'aura', 'duration', 'warcry'], color: '#e0b060',
    manaCost: 12, cooldown: 10, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'pylon', look: 'device_battle_standard', aims: false,
      range: 0, duration: 16, maxActive: 1, life: 70, placeRange: 240,
      aura: {
        radius: 180,
        allyMods: [mod('damage', 'increased', 0.12), mod('moveSpeed', 'increased', 0.05), mod('thorns', 'flat', 8)],
      },
    },
    effects: [],
    requirements: { charisma: 12 },
    ai: { range: 220, weight: 1 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.06), mod('effectDuration', 'increased', 0.06)] },
    thresholds: [
      { level: 12, label: 'A second front', mods: [mod('constructMaxCount', 'flat', 1)] },
    ],
  },

  // The Warlord's pointed finger: the CHALLENGE fabric aimed at ONE body —
  // peel it, open it, and let everyone see where to hit it.
  single_out: {
    tree: BASTION_STARTER_TREES.single_out,
    id: 'single_out', name: 'Single Out',
    description: "Taunt and expose a targeted enemy, forcing it to attack you, revealing its health bar, and generating 50% more threat.",
    tags: ['warcry', 'targeted', 'duration'], color: '#e8c04a',
    manaCost: 6, cooldown: 8, useTime: 0.3,
    targeting: { target: 'enemy', castRange: 480 },
    innateMods: [mod('threatGen', 'more', 0.5)],
    delivery: { type: 'target' },
    effects: [
      { type: 'status', status: 'taunted', chance: 1 },
      { type: 'status', status: 'exposed', chance: 1 },
    ],
    requirements: { charisma: 10, strength: 8 },
    ai: { range: 440, weight: 1.4 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('cooldownRecovery', 'increased', 0.05)] },
  },

  // --- The SKALD's hymnal (the 'song' family) -------------------------------
  // Songs are WORN FIELDS on the thurible grammar — the music rides the
  // singer — and every sung verse BANKS one Verse charge ('use' tap). The
  // Coda empties the bank. Two songs, one spender: the meter is the build.
  war_chant: {
    tree: CONTROL_STARTER_TREES.war_chant,
    id: 'war_chant', name: 'War Chant',
    description: "Surround yourself with a battle chant for 6 seconds that grants nearby allies 10% increased damage and 6% increased attack and cast speed, while banking 1 Verse (up to 5).",
    tags: ['spell', 'song', 'aoe', 'duration', 'buff'], color: '#d8a8e0',
    manaCost: 14, cooldown: 6, useTime: 0.4,
    chargeGain: [{ charge: 'verse', on: 'use', amount: 1, max: 5 }],
    delivery: {
      type: 'ground', radius: 130, castRange: 0,
      lingerDuration: 6, tickInterval: 10,
      noImpact: true, follow: true,
      exposure: 0.5, exposureDomain: true,
      domain: {
        allyMods: [
          mod('damage', 'increased', 0.1),
          mod('attackSpeed', 'increased', 0.06),
          mod('castSpeed', 'increased', 0.06),
        ],
      },
    },
    effects: [],
    requirements: { charisma: 12 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.05)] },
  },

  dissonance: {
    tree: CONTROL_STARTER_TREES.dissonance,
    id: 'dissonance', name: 'Dissonance',
    description: "Surround yourself with a discordant aura for 6 seconds that deals chaos damage to nearby enemies with a 15% chance per hit to befuddle, while banking 1 Verse (up to 5).",
    tags: ['spell', 'song', 'aoe', 'duration', 'chaos'], color: '#b088c8',
    manaCost: 12, cooldown: 6, useTime: 0.4,
    baseDamage: { chaos: [3, 6] },
    chargeGain: [{ charge: 'verse', on: 'use', amount: 1, max: 5 }],
    delivery: {
      type: 'ground', radius: 130, castRange: 0,
      lingerDuration: 6, tickInterval: 0.8,
      noImpact: true, follow: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'befuddlement', chance: 0.15 },
    ],
    requirements: { charisma: 10, willpower: 6 },
    ai: { range: 150, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.05)] },
  },

  coda: {
    tree: CONTROL_STARTER_TREES.coda,
    id: 'coda', name: 'Coda',
    description: "Release a physical nova that consumes all banked Verses to deal 30% more damage per Verse spent, knocking enemies back with a 25% chance to bewilder.",
    tags: ['spell', 'song', 'aoe', 'physical'], color: '#e8c8f0',
    manaCost: 10, cooldown: 4, useTime: 0.5,
    baseDamage: { physical: [12, 20] },
    chargeCost: { charge: 'verse', amount: 'all', optional: true, damagePerCharge: 0.3 },
    delivery: { type: 'nova', radius: 180 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 60 },
      { type: 'status', status: 'bewilder', chance: 0.25 },
    ],
    requirements: { charisma: 14 },
    ai: { range: 150, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  // The Beguiler's whisper: no new fabric — the MADDENED status (the
  // miasma's madness) delivered as a single pointed suggestion.
  beguile: {
    tree: BOND_STARTER_TREES.beguile,
    id: 'beguile', name: 'Beguile',
    description: "Fire a chaos projectile that maddens the target into attacking the nearest unit regardless of allegiance, with a 40% chance to also befuddle.",
    tags: ['spell', 'projectile', 'chaos', 'duration'], color: '#c890d8',
    manaCost: 14, cooldown: 6, useTime: 0.45,
    baseDamage: { chaos: [4, 7] },
    delivery: { type: 'projectile', speed: 460, radius: 8, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'maddened', chance: 1 },
      { type: 'status', status: 'befuddlement', chance: 0.4 },
    ],
    requirements: { charisma: 12 },
    ai: { range: 440, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('statusMagnitude', 'increased', 0.05)] },
  },

  // --- The ASCETIC's discipline (stillness as power) ------------------------
  // The palm ramps ITSELF (self-stack, the kata grammar); the exhale is a
  // held breath (charge cast). Both read willpower, neither reads rage.
  mantra_strike: {
    tree: DISCIPLINE_STARTER_TREES.mantra_strike,
    id: 'mantra_strike', name: 'Mantra Strike',
    description: "Deliver an open-palm melee strike that grants 6% increased damage and 8% increased poise damage with this skill per hit, stacking up to 6 times and decaying one stack at a time when you stop attacking.",
    tags: ['attack', 'melee', 'physical'], color: '#e8e0c8',
    manaCost: 3, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [9, 15] },
    selfStack: {
      mods: [mod('damage', 'increased', 0.06), mod('poiseDamage', 'increased', 0.08)],
      maxStacks: 6, duration: 2.5, decay: 'peel',
    },
    delivery: { type: 'melee', range: 50, arcDeg: 60 },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 10, strength: 8 },
    ai: { range: 55, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // THE UNARMED FLOOR: what an empty hand does when an empty SLOT is pressed
  // (World.applyInputs' null-slot branch mints this for any seat; the local
  // opt-out is Settings.improvisedStrike). No gem, no sockets, no leveling,
  // no requirements — deliberately a FLOOR, never a build: the numbers stand
  // still forever so any real kit outgrows it by level 2, but no character
  // is ever locked out of touching the world (the Tamer between pets, the
  // Chronomancer with every clock spent, the hero whose last gem went to
  // the font). Ordinary in every other way — same cast lock, same aim, same
  // pipeline — and it carries an ai hint, so a monster kit may slot it too
  // (it IS the player-grade claw).
  improvised_strike: {
    id: 'improvised_strike', name: 'Improvised Strike', noDrop: true,
    description: "Swing a basic wide melee arc that costs no mana and requires no skill gem.",
    tags: ['attack', 'melee', 'physical'], color: '#b8b0a0',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'melee', range: 48, arcDeg: 100 },
    effects: [{ type: 'damage' }],
    ai: { range: 50, weight: 1 },
  },

  long_exhale: {
    tree: DISCIPLINE_STARTER_TREES.long_exhale,
    id: 'long_exhale', name: 'Long Exhale',
    description: "Channel to gather breath and release a cone of forced air that scales from 70% damage on a quick release up to 240% damage and 50% wider area after 1.8 seconds, knocking enemies back with a 40% chance to inflict Winded.",
    tags: ['spell', 'physical', 'aoe'], color: '#c8e0d8',
    manaCost: 10, cooldown: 3, useTime: 0,
    castMode: 'charge',
    chargeUp: { maxTime: 1.8, minScale: 0.7, maxScale: 2.4, aoeScaleMax: 1.5 },
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'cone', range: 230, arcDeg: 50 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 130 },
      { type: 'status', status: 'winded', chance: 0.4 },
    ],
    requirements: { willpower: 12 },
    ai: { range: 200, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.04)] },
  },

  // ==================== THE POSSESSION SEAM (engine/possess.ts) ============
  // Seat-to-body verbs: the ENTRY BLOW moves your seat into a weakened
  // enemy (its kit, its stats, its faction worn as a GUISE — while your own
  // flesh stands entranced behind you: the husk is the price), and the FORM
  // GEM mints a beast you have STUDIED and moves you in whole (the husk
  // travels within, beyond reach — the form is the risk instead). Both gems
  // ride the borrowed bar as the GUEST SLOT and present their ending verb
  // there (ConvertSpec 'seatAway' — the button that began the ride ends
  // it). The returns are noDrop utilities: nobody learns to leave; leaving
  // comes with the door.

  possession: {
    id: 'possession', name: 'Possession',
    description: "Targets a weakened enemy to possess their body, controlling their movement and abilities until the duration ends, the host dies, or your vacated body takes too much damage. Press again to end Possession early.",
    tags: ['spell', 'possession', 'melee'], color: '#b8a8e8',
    manaCost: 30, cooldown: 10, useTime: 0.7,
    delivery: { type: 'melee', range: 78, arcDeg: 40 },
    effects: [{ type: 'possess' }],
    convert: { when: 'seatAway', skillId: 'relinquish' },
    requirements: { willpower: 16 },
    minDropLevel: 8, dropWeight: 40,
    leveling: { perLevel: [mod('possessDuration', 'increased', 0.08)] },
  },
  relinquish: {
    id: 'relinquish', name: 'Relinquish', noDrop: true,
    description: "End your possession early, staggering the host body and returning you to your own body.",
    tags: ['possession', 'instant'], color: '#b8a8e8',
    manaCost: 0, cooldown: 0.5, useTime: 0.1,
    delivery: { type: 'self' },
    effects: [{ type: 'possessEnd' }],
  },
  form_of_the_dire_wolf: {
    id: 'form_of_the_dire_wolf', name: 'Form of the Dire Wolf',
    description: "Shapeshifts into a Dire Wolf scaled to your level, replacing your skills with wolf attacks while protecting your true body inside the form. If the wolf form is defeated, you revert to your body and are briefly staggered. Press again to revert early.",
    tags: ['spell', 'possession'], color: '#b8d8a8',
    manaCost: 25, cooldown: 8, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{ type: 'shapeshift', shift: { form: 'dire_wolf' } }],
    convert: { when: 'seatAway', skillId: 'return_to_flesh' },
    requirements: { willpower: 14 },
    minDropLevel: 10, dropWeight: 30,
    leveling: { perLevel: [mod('possessPower', 'flat', 0.02)] },
  },
  return_to_flesh: {
    id: 'return_to_flesh', name: 'Return to Flesh', noDrop: true,
    description: "End your transformation and return to your normal form.",
    tags: ['possession', 'instant'], color: '#b8d8a8',
    manaCost: 0, cooldown: 0.5, useTime: 0.1,
    delivery: { type: 'self' },
    effects: [{ type: 'possessEnd' }],
  },
  // The VACANT kin's kit (the seam's teaching family — data/monsters.ts).
  // One verb, one lesson: the usher shows you what a seat-slap feels like
  // from the OTHER side. noDrop — the player lane is Possession itself.
  ushers_lull: {
    id: 'ushers_lull', name: 'Usher\'s Lull', noDrop: true,
    description: "Fire a chaos projectile that weakens enemies hit, reducing their damage dealt and action speed.",
    tags: ['spell', 'projectile', 'chaos'], color: '#b8a8e8',
    manaCost: 8, cooldown: 4, useTime: 0.5,
    baseDamage: { chaos: [4, 7] },
    delivery: { type: 'projectile', speed: 420, radius: 8, range: 320 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'weaken', chance: 1 },
    ],
    ai: { range: 300, weight: 3, keepDistance: 200 },
  },

  // ======================= THE GRAB FABRIC (engine/grab.ts) ================
  // Sustained bodily control as ordinary skill rows: SEIZE establishes the
  // hold (grabSeize — mass-gated, policy-tiered, struggled against), HEAVE
  // spends it (grabThrow — the holding gate refuses mime work; the impulse
  // rides pushActor, so shove authority, wall wounds, the bowling lane and
  // pit swallows all pay out with credit). The verbs wear the 'grab' and
  // 'throw' tags: supports scope to exactly their half of the art, and the
  // combo grammar reads seize-then-heave measures with no matcher edits.
  // The monk's other argument — the hand that holds before it strikes.

  seize: {
    id: 'seize', name: 'Seize',
    description: "Grabs a nearby enemy in melee and carries them with you until they break free, you drop them, or you throw them with Heave.",
    tags: ['attack', 'melee', 'physical', 'grab'], color: '#d8a06a',
    manaCost: 0, cooldown: 5, useTime: 0.45,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'melee', range: 70, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'grabSeize', grab: { verb: 'carry' } },
    ],
    requirements: { strength: 12 },
    ai: { range: 66, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('gripPower', 'flat', 0.04)] },
  },
  heave: {
    id: 'heave', name: 'Heave',
    description: "Hurl a grabbed target toward your cursor, bowling through lighter enemies along the path and dealing collision damage against walls or dropping them into chasms.",
    tags: ['attack', 'melee', 'physical', 'throw'], color: '#e0b070',
    manaCost: 0, cooldown: 2, useTime: 0.4,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'self' },
    gate: { holding: true, note: 'nothing held' },
    effects: [{ type: 'grabThrow', impulse: 560, damageMult: 1.3 }],
    requirements: { strength: 14 },
    ai: { range: 90, weight: 5 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('shoveAuthority', 'flat', 0.04)] },
  },

  // --- THE GRIP KIN's kit (the traveling holdsmen — data/monsters.ts) ------
  // The same fabric worn monster-side, one verb each so every silhouette
  // teaches one lesson: the gaff DRAGS you out of your line, the clinch
  // PINS you under the yoke, the gulp SWALLOWS you whole and spits you at
  // your friends. All through the one pipeline; all mass-gated; all
  // struggled against. noDrop — the player lane is Seize/Heave.

  gaff_cast: {
    id: 'gaff_cast', name: 'Gaff Cast', noDrop: true,
    description: "Throws a barbed hook that snags the target and drags them behind the caster until they break free.",
    tags: ['attack', 'projectile', 'physical', 'grab'], color: '#b08a5a',
    manaCost: 0, cooldown: 7, useTime: 0.6,
    baseDamage: { physical: [7, 12] },
    delivery: { type: 'projectile', speed: 660, radius: 7, range: 300, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'grabSeize', grab: { verb: 'drag', haul: 'away', breakMult: 1.15 } },
    ],
    requirements: { dexterity: 12 },
    ai: { range: 280, weight: 3, keepDistance: 230 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  mauler_clinch: {
    id: 'mauler_clinch', name: 'Mauler\'s Clinch', noDrop: true,
    description: "Seizes the target in a pinning grapple, holding them in place for follow-up strikes or a throw.",
    tags: ['attack', 'melee', 'physical', 'grab'], color: '#c89058',
    manaCost: 0, cooldown: 8, useTime: 0.55,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'melee', range: 74, arcDeg: 80 },
    effects: [
      { type: 'damage' },
      { type: 'grabSeize', grab: { verb: 'pin', breakMult: 0.9 } },
    ],
    requirements: { strength: 16 },
    ai: { range: 70, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  mauler_toss: {
    id: 'mauler_toss', name: 'Mauler\'s Toss', noDrop: true,
    description: "Hurls a pinned target toward a location, dealing impact damage when they land or collide with terrain.",
    tags: ['attack', 'melee', 'physical', 'throw'], color: '#d8a060',
    manaCost: 0, cooldown: 3, useTime: 0.5,
    baseDamage: { physical: [12, 20] },
    delivery: { type: 'self' },
    gate: { holding: true, note: 'nothing held' },
    effects: [{ type: 'grabThrow', impulse: 620, damageMult: 1.4 }],
    requirements: { strength: 16 },
    ai: { range: 90, weight: 5 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  gulp: {
    id: 'gulp', name: 'Gulp', noDrop: true,
    description: "Swallows a target whole, dealing digestion damage over time and leeching life until the victim breaks free or is spat out as a projectile.",
    tags: ['attack', 'melee', 'physical', 'grab'], color: '#b46a8a',
    manaCost: 0, cooldown: 9, useTime: 0.6,
    baseDamage: { physical: [8, 14] },
    delivery: { type: 'melee', range: 66, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      {
        type: 'grabSeize', grab: {
          verb: 'swallow',
          dot: { type: 'physical', frac: 0.05 }, leech: 0.6,
          burstHurt: 0.07,
          throw: { impulse: 640, spitAt: 'foe' },
        },
      },
    ],
    requirements: { strength: 14 },
    ai: { range: 62, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // --- THE JOTUN SCHOOL (the lair fabric's natives, data/lairs.ts) ---------
  // The yeti's argument, in two verbs the grip kin would recognize: the
  // SNATCH closes a hand the size of your torso, the HURL explains the
  // nearest wall. Same fabric, same struggle ladder, same mass law — worn
  // at a scale where the mass law is usually on the yeti's side.

  yeti_snatch: {
    id: 'yeti_snatch', name: 'Snatch', noDrop: true,
    description: "Strikes and hoists the target in a carry grapple, hauling them along until they break free or are thrown.",
    tags: ['attack', 'melee', 'physical', 'grab'], color: '#cfe0ea',
    manaCost: 0, cooldown: 9, useTime: 0.55,
    baseDamage: { physical: [10, 16] },
    delivery: { type: 'melee', range: 80, arcDeg: 80 },
    effects: [
      { type: 'damage' },
      { type: 'grabSeize', grab: { verb: 'carry', breakMult: 1.05 } },
    ],
    requirements: { strength: 20 },
    ai: { range: 76, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  yeti_hurl: {
    id: 'yeti_hurl', name: 'Mountain Hurl', noDrop: true,
    description: "Hurl a held target at high speed, dealing 150% of this skill's damage where they land or collide.",
    tags: ['attack', 'melee', 'physical', 'throw'], color: '#e6f0f6',
    manaCost: 0, cooldown: 3, useTime: 0.5,
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'self' },
    gate: { holding: true, note: 'nothing held' },
    effects: [{ type: 'grabThrow', impulse: 700, damageMult: 1.5 }],
    requirements: { strength: 22 },
    ai: { range: 95, weight: 5 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // --- THE WELLSPRING'S ARGUMENT (the lair fabric's river naiad) -----------
  // The gaff cast's grammar in water: a lash of current that closes around
  // an ankle and REELS. The naiad never leaves her pool to collect you —
  // the drag seat trails the holder, so the catch is hauled INTO the water
  // she is rooted in, where all her numbers live. Struggle out, or fight
  // the river standing in it.
  undertow_lash: {
    id: 'undertow_lash', name: 'Undertow Lash', noDrop: true,
    description: "Lashes out with a freezing current that deals cold damage to the first target hit and drags them back toward the caster.",
    tags: ['spell', 'projectile', 'cold', 'grab'], color: '#6ac8dc',
    manaCost: 9, cooldown: 8, useTime: 0.55,
    baseDamage: { cold: [7, 12] },
    delivery: { type: 'projectile', speed: 560, radius: 8, range: 320, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'grabSeize', grab: { verb: 'drag', breakMult: 1.1 } },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 300, weight: 3, keepDistance: 140 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // ======================= Trajectories, returns & shrapnel ================
  // §4: the flight levers as skills — zig-zags that shed, bounces that work
  // the room, recurves, selective pierce, arced convergence, aimed spread.

  gyreblade: {
    id: 'gyreblade', name: 'Gyreblade',
    description: "Throw a spinning blade that pierces up to 2 enemies and returns to your hand, granting 1 Gyre charge on catch (up to 6).",
    tags: ['attack', 'projectile', 'physical'], color: '#b8d0d8',
    manaCost: 4, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'projectile', speed: 520, radius: 10, range: 340,
      returns: 'caster', pierce: 2,
      catch: { charge: 'gyre', amount: 1, max: 6 },
      trajectory: { spin: 7 },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 300, weight: 2, keepDistance: 200 },
  },

  gyre_hurl: {
    id: 'gyre_hurl', name: 'Gyre Hurl',
    description: "Leap backward while throwing a fan of blades (1 base blade plus 1 per Gyre charge consumed), dealing 5% more damage per charge spent.",
    tags: ['attack', 'projectile', 'physical', 'movement'], color: '#a8c8d8',
    manaCost: 5, cooldown: 2, useTime: 0,
    chargeCost: { charge: 'gyre', amount: 'all', optional: true, projectilesPerCharge: 1, damagePerCharge: 0.05 },
    baseDamage: { physical: [8, 12] },
    delivery: {
      type: 'projectile', speed: 600, radius: 8, range: 380,
      count: 1, spreadDeg: 70, pierce: 1,
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 18 },
    ai: { range: 250, weight: 1 },
  },

  caroms: {
    id: 'caroms', name: 'Caroms',
    description: "Press up to 3 times within 4 seconds to place 3 anchors; the third press launches a blade that ricochets between the anchors for 5 seconds, hitting each enemy up to once every 0.7 seconds.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#c8d8b0',
    manaCost: 4, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'projectile', speed: 560, radius: 11, range: 400,
      duration: 5, rehit: 0.7,
      caroms: { anchors: 3, window: 4 },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 20 },
    ai: { range: 320, weight: 1, keepDistance: 220 },
  },

  hanging_volley: {
    id: 'hanging_volley', name: 'Hanging Volley',
    description: "Place a suspended ethereal arrow per cast (up to 4, lasting up to 24 seconds). At 4 arrows, when an enemy approaches or you cast again, a blade ricochets between the arrows for 5 seconds.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#a8c8d8',
    manaCost: 5, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'projectile', speed: 600, radius: 11, range: 420,
      duration: 5, rehit: 0.7,
      caroms: { anchors: 4, window: 4, hang: { triggerRadius: 90, duration: 24, look: 'object_hanging_arrow' } },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 24 },
    ai: { range: 320, weight: 1, keepDistance: 220 },
  },

  heartchaser: {
    id: 'heartchaser', name: 'Heartchaser',
    description: "Fire a homing arrow that ignores other enemies to strike the nearest target, with a 60% chance on hit (decaying by 20% per bounce) to curve back and hit again for up to 4 seconds.",
    tags: ['attack', 'projectile', 'physical'], color: '#e8a0b0',
    manaCost: 5, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [14, 22] },
    delivery: {
      type: 'projectile', speed: 560, radius: 8, range: 700,
      duration: 4,
      trajectory: {
        homing: 5, selectivePierce: true,
        recurve: { chance: 0.6, decay: 0.8 },
      },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 22 },
    ai: { range: 480, weight: 2, keepDistance: 300 },
  },

  living_barrage: {
    id: 'living_barrage', name: 'Living Barrage',
    description: "Fire a seeking projectile lasting 4.5 seconds that pierces its target and repeatedly loops back to strike again every 0.55 seconds.",
    tags: ['spell', 'projectile', 'physical', 'duration'], color: '#b0c8a0',
    manaCost: 8, cooldown: 1.5, useTime: 0.55,
    baseDamage: { physical: [6, 9] },
    delivery: {
      type: 'projectile', speed: 380, radius: 12, range: 500,
      duration: 4.5, rehit: 0.55,
      trajectory: { homing: 4.5 },
    },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 18 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  skittering_bolt: {
    id: 'skittering_bolt', name: 'Skittering Bolt',
    description: "Fire a lightning bolt that changes direction every 0.22 seconds and on each pierce (up to 3), shedding a secondary shard along its previous trajectory on every turn with a 20% chance to shock.",
    tags: ['spell', 'projectile', 'lightning'], color: '#d8e858',
    manaCost: 5, cooldown: 0, useTime: 0.5,
    baseDamage: { lightning: [8, 13] },
    delivery: {
      type: 'projectile', speed: 480, radius: 9, range: 620,
      pierce: 3,
      trajectory: { zigzag: { interval: 0.22, angleDeg: 55, onHit: true, shed: 1 } },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 460, weight: 2, keepDistance: 280 },
  },

  frostcreep: {
    id: 'frostcreep', name: 'Frostcreep',
    description: "Launch a slow homing frost orb that tracks the nearest enemy for up to 6 seconds before exploding for cold damage with a 70% chance to chill.",
    tags: ['spell', 'projectile', 'cold', 'duration'], color: '#9ad8f8',
    manaCost: 6, cooldown: 0, useTime: 0.6,
    baseDamage: { cold: [10, 16] },
    delivery: {
      type: 'projectile', speed: 115, radius: 14, range: 800,
      duration: 6,
      explode: { radius: 70, damageScale: 0.7 },
      trajectory: { homing: 1.4 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.7 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
  },

  rimeclaw: {
    id: 'rimeclaw', name: 'Rimeclaw',
    description: "Launch 3 ice talons that fan outward before curving back to detonate at the target location, each burst having a 50% chance to chill.",
    tags: ['spell', 'projectile', 'cold', 'aoe'], color: '#a8d8e8',
    manaCost: 8, cooldown: 1, useTime: 0.6,
    baseDamage: { cold: [9, 14] },
    delivery: {
      type: 'projectile', speed: 480, radius: 9, range: 900,
      count: 3, spreadDeg: 110,
      explode: { radius: 72, damageScale: 0.8 },
      trajectory: { arcTo: 2.2 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
  },

  glacial_march: {
    id: 'glacial_march', name: 'Glacial March',
    description: "Trigger an ice burst at the target location followed by 2 sequential bursts forward along your aim line, each 30% larger and dealing 25% more damage than the last with a 50% chance to chill.",
    tags: ['spell', 'cold', 'aoe'], color: '#b8e0f0',
    manaCost: 9, cooldown: 1.5, useTime: 0.65,
    baseDamage: { cold: [10, 15] },
    delivery: {
      type: 'ground', radius: 66, castRange: 150, delay: 0.15,
      cascade: { count: 2, dir: 'forward', step: 105, scaleStep: 1.3, dmgStep: 1.25, interval: 0.14 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 260, weight: 2 },
  },

  splayshot: {
    id: 'splayshot', name: 'Splayshot',
    description: "Fire 5 arrows simultaneously in a spread whose width adjusts to your cursor distance, from a wide fan at close range to a tight beam at long range.",
    tags: ['attack', 'projectile', 'physical'], color: '#c8b890',
    manaCost: 5, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'projectile', speed: 560, radius: 8, range: 460,
      count: 5, spreadByAim: { near: 95, far: 10, range: 380 },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 360, weight: 2, keepDistance: 240 },
  },

  arrowfall: {
    id: 'arrowfall', name: 'Arrowfall',
    description: "Fire a volley skyward that rains 8 to 11 arrows in rapid sequence across the target area.",
    tags: ['attack', 'projectile', 'physical', 'aoe', 'storm'], color: '#c0b088',
    manaCost: 8, cooldown: 2, useTime: 0.7,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'storm', count: [8, 11], interval: 0.07,
      areaRadius: 130, hitRadius: 44, castRange: 460,
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 18 },
    ai: { range: 420, weight: 2, keepDistance: 280 },
  },

  galewisp: {
    id: 'galewisp', name: 'Galewisp',
    description: "Launch a drifting twister for 5 seconds that pierces and knocks aside enemies in its path while bouncing off walls up to 5 times.",
    tags: ['spell', 'projectile', 'physical', 'duration'], color: '#b8d8c8',
    manaCost: 7, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'projectile', speed: 300, radius: 16, range: 900,
      duration: 5, pierce: 30,
      trajectory: { bounce: 5, erratic: 1.2 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
    ],
    requirements: { intelligence: 16 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  wildwisp: {
    id: 'wildwisp', name: 'Wildwisp',
    description: "Launch an erratic twister for 5 seconds that knocks enemies back and ricochets off each target hit as well as off walls up to 6 times.",
    tags: ['spell', 'projectile', 'physical', 'duration'], color: '#a0c8b0',
    manaCost: 7, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'projectile', speed: 340, radius: 15, range: 900,
      duration: 5,
      trajectory: { bounce: 6, caromOnHit: 0.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 100 },
    ],
    requirements: { intelligence: 18 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  // ======================= Stacks, combos & runes ==========================

  tempest_gathering: {
    id: 'tempest_gathering', name: 'Tempest Gathering',
    description: "Slash in a melee arc of physical and lightning damage to bank 1 Storm charge (up to 8). Stored charges periodically discharge as lightning bolts at 55% damage toward nearby enemies.",
    tags: ['attack', 'melee', 'physical', 'lightning'], color: '#c8e84a',
    manaCost: 3, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 11], lightning: [3, 6] },
    delivery: { type: 'melee', range: 56, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      { type: 'gainCharge', charge: 'storm', amount: 1, max: 8 },
    ],
    discharge: {
      charge: 'storm', interval: 1.1, intervalPerCharge: 0.09,
      range: 340, damageScale: 0.55,
    },
    requirements: { dexterity: 14, intelligence: 10 },
    ai: { range: 60, weight: 2 },
    thresholds: [
      { level: 12, label: 'Gathering front', mods: [mod('chargeCap', 'flat', 3)] },
    ],
  },

  trisect: {
    id: 'trisect', name: 'Trisect',
    description: "Three-part melee sequence: the first swing flows into Bisect, and a third press within 2 seconds unleashes Trisect, a full-circle slash for double damage.",
    tags: ['attack', 'melee', 'physical'], color: '#d8b87a',
    manaCost: 3, cooldown: 0, useTime: 0.5,
    comboChain: { skills: ['bisect_cut', 'trisect_finisher'], window: 2 },
    baseDamage: { physical: [8, 12] },
    delivery: { type: 'melee', range: 55, arcDeg: 90 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 12, dexterity: 12 },
    ai: { range: 58, weight: 2 },
  },

  bisect_cut: {
    id: 'bisect_cut', name: 'Bisect', noDrop: true,
    description: "Perform the second strike of the Trisect sequence, sweeping a wider melee arc for increased damage.",
    tags: ['attack', 'melee', 'physical'], color: '#d8c88a',
    manaCost: 3, cooldown: 0, useTime: 0.45,
    baseDamage: { physical: [10, 15] },
    delivery: { type: 'melee', range: 58, arcDeg: 140 },
    effects: [{ type: 'damage' }],
  },

  trisect_finisher: {
    id: 'trisect_finisher', name: 'Trisect', noDrop: true,
    description: "Perform the final strike of the Trisect sequence, spinning a full circle of steel around yourself for double damage and knocking enemies back.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#e8d89a',
    manaCost: 4, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [16, 24] },
    delivery: { type: 'melee', range: 60, arcDeg: 360 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 60 },
    ],
  },

  carve: {
    id: 'carve', name: 'Carve',
    description: "Slash in melee to grant a stack of 5% increased attack damage and 2% increased attack speed for 2.2 seconds (up to 8 stacks), with each hit refreshing all stacks.",
    tags: ['attack', 'melee', 'physical'], color: '#c89058',
    manaCost: 3, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [7, 11] },
    delivery: { type: 'melee', range: 55, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      {
        type: 'buff', id: 'carve', duration: 2.2, maxStacks: 8,
        mods: [mod('damage', 'increased', 0.05, ['attack']), mod('attackSpeed', 'increased', 0.02)],
      },
    ],
    requirements: { strength: 14 },
    ai: { range: 58, weight: 2 },
  },

  deep_carve: {
    id: 'deep_carve', name: 'Deep Carve',
    description: "Slash in melee to grant an independent stack of 4% increased attack damage lasting 4.5 seconds, up to 12 concurrent stacks.",
    tags: ['attack', 'melee', 'physical'], color: '#a87848',
    manaCost: 4, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'melee', range: 55, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      {
        type: 'buff', id: 'deep_carve', duration: 4.5, maxStacks: 12,
        stackTimers: 'independent',
        mods: [mod('damage', 'increased', 0.04, ['attack'])],
      },
    ],
    requirements: { strength: 16 },
    ai: { range: 58, weight: 2 },
  },

  invocation: {
    tree: RUNEWEAVER_STARTER_TREES.invocation,
    id: 'invocation', name: 'Invocation',
    description: "While on your skill bar, casting fire, cold, lightning, or untyped spells banks Ember, Rime, Arc, or Glyph runes. Activating Invocation consumes all banked runes to cast a combined spell determined by the rune sequence and final rune type, dealing more damage per rune spent.",
    tags: ['spell', 'aoe'], color: '#c8a8e8',
    manaCost: 6, cooldown: 2, useTime: 0.5, // Glyph fuel already costs a separate spell
    invokes: true,
    delivery: { type: 'self' },
    effects: [],
    requirements: { intelligence: 22 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
    thresholds: [
      { level: 12, label: 'Longer weave', mods: [mod('runeCap', 'flat', 2)] },
    ],
  },

  // --- Invocation payloads (noDrop; physical-typed — the closing rune's
  // element SEIZES them via an instance-local conversion) -------------------

  invoke_conflagration: {
    id: 'invoke_conflagration', name: 'Conflagration', noDrop: true,
    description: "Unleash the pure fire triad invocation, creating a wide eruption of burning ground for 2.5 seconds that deals periodic fire damage with an 18% chance to ignite.",
    tags: ['spell', 'aoe', 'duration'], color: '#ff7030',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [16, 24] },
    delivery: {
      type: 'ground', radius: 135, castRange: 480, delay: 0.25,
      lingerDuration: 2.5, tickInterval: 0.4,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.35 },
    ],
  },

  invoke_stormfront: {
    id: 'invoke_stormfront', name: 'Stormfront', noDrop: true,
    description: "Unleash the pure lightning triad invocation, calling down 7 rapid lightning bolts across the target area, each with a 35% chance to shock.",
    tags: ['spell', 'aoe', 'storm'], color: '#ffe14a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [11, 17] },
    delivery: {
      type: 'storm', count: 7, interval: 0.12,
      areaRadius: 190, hitRadius: 62, castRange: 480,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.35 },
    ],
  },

  invoke_glaciation: {
    id: 'invoke_glaciation', name: 'Glaciation', noDrop: true,
    description: "Unleash the pure cold triad invocation, triggering a wide frost burst with an 80% chance to chill and leaving slick ice ground for 4 seconds.",
    tags: ['spell', 'aoe', 'duration'], color: '#9ad8f8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [14, 20] },
    delivery: {
      type: 'ground', radius: 150, castRange: 480, delay: 0.2,
      leaveTerrain: { kind: 'ice', radius: 130, duration: 4 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.8 },
    ],
  },

  invoke_lance: {
    id: 'invoke_lance', name: 'Invoked Lance', noDrop: true,
    description: "Unleash the two-element invocation, firing a fast elemental lance that pierces up to 3 enemies and explodes at the end of its flight.",
    tags: ['spell', 'projectile', 'aoe'], color: '#d8c8f0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [13, 19] },
    delivery: {
      type: 'projectile', speed: 700, radius: 10, range: 560,
      pierce: 3, explode: { radius: 64, damageScale: 0.7 },
    },
    effects: [{ type: 'damage' }],
  },

  invoke_cataclysm: {
    id: 'invoke_cataclysm', name: 'Elemental Cataclysm', noDrop: true,
    description: "Unleash the three-element invocation, calling down 10 elemental strikes across a wide area, each having a 20% chance to shock, 20% chance to chill, and 7% chance to ignite.",
    tags: ['spell', 'aoe', 'storm'], color: '#e8b8f0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [13, 19] },
    delivery: {
      type: 'storm', count: 10, interval: 0.08,
      areaRadius: 230, hitRadius: 70, castRange: 500,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
      { type: 'status', status: 'chill', chance: 0.2 },
      { type: 'status', status: 'burn', chance: 0.2, magnitude: 0.25 },
    ],
  },

  invoke_burst: {
    id: 'invoke_burst', name: 'Rune Release', noDrop: true,
    description: "Expend banked runes in an elemental burst at the target location.",
    tags: ['spell', 'aoe'], color: '#c8b8e0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [20, 30] }, // Glyph's baseline release pays for a two-cast loop
    delivery: { type: 'ground', radius: 110, castRange: 480, delay: 0.15 },
    effects: [{ type: 'damage' }],
  },

  // ======================= Seals, Forms & Oblations ========================
  // Reservation/drain toggles: root-and-ramp Forms, life seals with
  // deactivation payloads, and the corpse-fed offering rites.

  stormbind: {
    id: 'stormbind', name: 'Stormbind',
    description: "Toggle form that roots you in place with an escalating mana drain per second, granting 35% more spell damage and 25% increased cast speed at 25% more mana cost while pulsing lightning damage to nearby enemies.",
    tags: ['spell', 'lightning', 'aura', 'buff', 'aoe'], color: '#e8e84a',
    manaCost: 6, cooldown: 2, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      moveFactor: 0,
      upkeep: { manaPerSec: 3, rampPerSec: 0.14 },
      aura: {
        radius: 190,
        selfMods: [
          mod('damage', 'more', 0.35, ['spell']),
          mod('castSpeed', 'increased', 0.25),
          mod('manaCost', 'more', 0.25),
        ],
        enemyDps: { amount: 6, type: 'lightning' },
      },
    },
    effects: [],
    requirements: { intelligence: 20 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08, ['lightning'])] },
  },

  emberbind: {
    id: 'emberbind', name: 'Emberbind',
    description: "Toggle form that roots you in place with an escalating mana drain per second, granting 30% more fire damage and 30% increased fire ailment magnitude while burning nearby enemies.",
    tags: ['spell', 'fire', 'aura', 'buff', 'aoe'], color: '#ff7030',
    manaCost: 6, cooldown: 2, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      moveFactor: 0,
      upkeep: { manaPerSec: 3.5, rampPerSec: 0.1 },
      aura: {
        radius: 170,
        selfMods: [
          mod('damage', 'more', 0.3, ['fire']),
          mod('statusMagnitude', 'increased', 0.3, ['fire']),
        ],
        enemyDps: { amount: 9, type: 'fire' },
      },
    },
    effects: [],
    requirements: { intelligence: 20 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08, ['fire'])] },
  },

  frostguard: {
    id: 'frostguard', name: 'Frostguard',
    description: "Toggle form with continuous mana upkeep that grants 18% less damage taken, +20% cold resistance, and 35% cold ailment resistance while allowing full movement.",
    tags: ['spell', 'cold', 'aura', 'buff'], color: '#9ad8f8',
    manaCost: 5, cooldown: 2, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      // A REAL drain: flat + a slice of the pool per second, so it visibly
      // outpaces base regeneration — the Form costs something to wear
      // (the pct levers are the resource-degen primitive, reusable).
      upkeep: { manaPerSec: 2.5, manaPctMaxPerSec: 0.03 },
      aura: {
        radius: 12,
        selfMods: [
          mod('damageTaken', 'more', -0.18),
          mod('coldRes', 'flat', 0.2),
          mod('ailmentResist', 'flat', 0.35, ['cold']),
        ],
      },
    },
    effects: [],
    requirements: { intelligence: 16 },
    leveling: { perLevel: [mod('damageTaken', 'increased', -0.012)] },
  },

  mortis_seal: {
    id: 'mortis_seal', name: 'Mortis Seal',
    description: "Seals your life for up to 5 seconds: prevents healing, staggers 45% of incoming hit damage over time, and grants up to 55% damage reduction based on missing life. When the seal ends or is released early, unleashes Death Knell, dealing area damage that scales up to 280% with time held and missing life.",
    tags: ['spell', 'physical', 'chaos', 'aura', 'buff', 'duration'], color: '#8a6888',
    manaCost: 10, cooldown: 9, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      maxDuration: 5,
      seal: { drPerMissing: 0.9, drCap: 0.55, stagger: 0.45 },
      onDeactivate: {
        skillId: 'death_knell',
        scalePerSec: 0.35, maxScale: 2.8, missingLifeScale: 1.2,
      },
      aura: { radius: 12 },
    },
    effects: [],
    requirements: { strength: 14, willpower: 14 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  seal_of_death: {
    id: 'seal_of_death', name: 'Seal of Death',
    description: "Toggle to seal your life: prevents healing, drains 1.5% of life per second (accelerating over time), staggers 55% of incoming hit damage over time, and grants up to 45% damage reduction based on missing life. Releasing the seal unleashes Death Knell, scaling up to 360% damage with time held and missing life.",
    tags: ['spell', 'physical', 'chaos', 'aura', 'buff'], color: '#6a4868',
    manaCost: 8, cooldown: 12, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      seal: { drPerMissing: 0.7, drCap: 0.45, stagger: 0.55 },
      upkeep: { lifeFractionPerSec: 0.015, rampPerSec: 0.08 },
      onDeactivate: {
        skillId: 'death_knell',
        scalePerSec: 0.22, maxScale: 3.6, missingLifeScale: 1.5,
      },
      aura: { radius: 12 },
    },
    effects: [],
    requirements: { strength: 16, willpower: 16 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  death_knell: {
    id: 'death_knell', name: 'Death Knell', noDrop: true,
    description: "Release a nova of physical and chaos damage around the unsealed target with a 40% chance to weaken enemies hit.",
    tags: ['spell', 'physical', 'chaos', 'aoe'], color: '#b090b0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [14, 20], chaos: [10, 15] },
    delivery: { type: 'nova', radius: 185 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'weaken', chance: 0.4 },
    ],
  },

  cerement: {
    id: 'cerement', name: 'Cerement',
    description: "Channel while moving at 45% reduced speed to wrap yourself in grave-fog, causing incoming hits to pass harmlessly through you while draining life and mana and pulsing chaos damage around you with a 35% chance to inflict Decay.",
    tags: ['spell', 'chaos', 'aoe', 'channel', 'duration'], color: '#7a68a8',
    manaCost: 3, lifeCost: 2, cooldown: 4, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.5, windup: 0, move: 'slowed', moveFactor: 0.55,
      cooldownOnEnd: true, trackAim: false,
    },
    baseDamage: { chaos: [6, 9] },
    delivery: { type: 'nova', radius: 135 },
    effects: [
      { type: 'damage' },
      {
        // The shroud itself: refreshed each pulse, gone a breath after the
        // channel drops — hits dodge THROUGH you while it holds.
        type: 'buff', id: 'cerement_shroud', duration: 0.75,
        mods: [mod('hitImmune', 'flat', 1)],
      },
      { type: 'status', status: 'decay', chance: 0.35, magnitude: 0.5 },
    ],
    requirements: { willpower: 22 },
    ai: { range: 110, weight: 2 },
  },

  oblation_of_life: {
    id: 'oblation_of_life', name: 'Oblation of Life',
    description: "Sacrifices 30% of your current life to grant 25% more damage, 18% increased attack speed, and 18% increased cast speed for 5 seconds.",
    tags: ['spell', 'instant', 'buff', 'duration', 'physical'], color: '#c04858',
    manaCost: 0, cooldown: 12, useTime: 0,
    costScaling: { lifePctCur: 0.3 },
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'oblation_life', duration: 5,
      mods: [
        mod('damage', 'more', 0.25),
        mod('attackSpeed', 'increased', 0.18),
        mod('castSpeed', 'increased', 0.18),
      ],
    }],
    requirements: { strength: 12, willpower: 12 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  oblation_of_mana: {
    id: 'oblation_of_mana', name: 'Oblation of Mana',
    description: "Spend 33% of your maximum mana to gain 20% more spell damage, 20% increased area of effect, and +5% spell critical strike chance for 5 seconds.",
    tags: ['spell', 'instant', 'buff', 'duration'], color: '#5a78d8',
    manaCost: 0, cooldown: 12, useTime: 0,
    costScaling: { manaPctMax: 0.33 },
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'oblation_mana', duration: 5,
      mods: [
        mod('damage', 'more', 0.2, ['spell']),
        mod('aoeRadius', 'increased', 0.2),
        mod('critChance', 'flat', 0.05, ['spell']),
      ],
    }],
    requirements: { intelligence: 16 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08)] },
  },

  oblation_of_flesh: {
    id: 'oblation_of_flesh', name: 'Oblation of Flesh',
    description: "Consume a corpse to create a ring of incense for 8 seconds that grants your minions inside 30% increased attack and cast speed and 25% increased movement speed.",
    tags: ['spell', 'corpse', 'aoe', 'duration', 'minion'], color: '#b06888',
    manaCost: 9, cooldown: 6, useTime: 0.45,
    targeting: { target: 'corpse', castRange: 420, plural: true },
    delivery: {
      type: 'ground', radius: 150, castRange: 420,
      lingerDuration: 8, tickInterval: 0.5,
      domain: {
        minionMods: [
          mod('minionHaste', 'increased', 0.3),
          mod('moveSpeed', 'increased', 0.25),
          mod('attackSpeed', 'increased', 0.3),
          mod('castSpeed', 'increased', 0.3),
        ],
      },
    },
    effects: [],
    requirements: { willpower: 16 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  offering_wisp: {
    id: 'offering_wisp', name: 'Offering Wisp', noDrop: true,
    description: "Fire a homing chaos wisp from a risen offering effigy with a 25% chance to inflict Decay.",
    tags: ['spell', 'chaos', 'projectile'], color: '#b06888',
    manaCost: 0, cooldown: 0.8, useTime: 0.4,
    baseDamage: { chaos: [6, 10] },
    delivery: {
      type: 'projectile', speed: 440, radius: 7, range: 380,
      trajectory: { homing: 3 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.25, magnitude: 0.35 },
    ],
  },

  bone_offering: {
    id: 'bone_offering', name: 'Bone Offering',
    description: "Consume a corpse to grant all of your minions +25% block chance and 15% less damage taken for 7 seconds.",
    tags: ['spell', 'corpse', 'buff', 'duration', 'minion'], color: '#d8d0b8',
    manaCost: 8, cooldown: 5, useTime: 0.45,
    targeting: { target: 'corpse', castRange: 420, plural: true },
    delivery: { type: 'target' },
    effects: [{
      type: 'buff', affects: 'minions', id: 'bone_offering', duration: 7,
      mods: [
        mod('blockChance', 'flat', 0.25),
        mod('damageTaken', 'more', -0.15),
      ],
    }],
    requirements: { willpower: 14, intelligence: 10 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  // ======================= The reaping court, javelins & pods ==============
  // This pass: projectile-borne fields, the apex-minion economy, channel
  // persistence, the Impaler family, torpor bubbles, telegraphed storms,
  // and incubation pods. Every skill is a composition over the new levers.

  soulflay: {
    id: 'soulflay', name: 'Soulflay',
    description: "Fires a homing chaos bolt that pierces up to 4 enemies, damages nearby enemies along its flight path, has a 35% chance to inflict Decay, and grants ward equal to 10% of the damage dealt.",
    tags: ['spell', 'chaos', 'projectile', 'duration'], color: '#9a68d8',
    manaCost: 11, cooldown: 0, useTime: 0.6,
    baseDamage: { chaos: [11, 17] },
    innateMods: [mod('wardLeech', 'flat', 0.1)],
    delivery: {
      // SLOW and getting hungrier: a twisting bolt that starts at a crawl
      // and gathers — the wake needs dwell time to actually rot the pack.
      type: 'projectile', speed: 190, radius: 10, range: 560, pierce: 4,
      trajectory: { homing: 2.6, spin: 4, accel: 0.32 },
      aura: { radius: 62, dps: 16, damageType: 'chaos' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.35, magnitude: 0.35 },
    ],
    requirements: { intelligence: 20, willpower: 14 },
    ai: { range: 420, weight: 2, keepDistance: 260 },
  },

  gravewisp: {
    id: 'gravewisp', name: 'Gravewisp',
    description: "Launches a slow homing spirit that pursues an enemy for up to 4.5 seconds and detonates in a chaos burst with a 40% chance to inflict Decay.",
    tags: ['spell', 'chaos', 'projectile', 'duration'], color: '#c8c8e8',
    manaCost: 13, cooldown: 3, useTime: 0.7,
    baseDamage: { chaos: [22, 34] },
    delivery: {
      type: 'projectile', speed: 150, radius: 13, range: 900,
      duration: 4.5,
      trajectory: { homing: 5 },
      explode: { radius: 100, damageScale: 1 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.4, magnitude: 0.4 },
    ],
    requirements: { intelligence: 18, willpower: 16 },
    ai: { range: 500, weight: 2, keepDistance: 300 },
  },

  // --- The Harvester (apex-minion + fodder) --------------------------------

  harvester_scythe: {
    id: 'harvester_scythe', name: 'Harvester Scythe', noDrop: true,
    description: "Sweep a wide frontal scythe arc from the Harvester that deals physical damage with a 35% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#8a4a68',
    manaCost: 0, cooldown: 0, useTime: 0.85,
    baseDamage: { physical: [11, 17] },
    delivery: { type: 'melee', range: 58, arcDeg: 210 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 0.4 },
    ],
    ai: { range: 62, weight: 2 },
  },

  reaper_lunge: {
    id: 'reaper_lunge', name: 'Reaper Lunge', noDrop: true,
    description: "Dash in a straight line as the Harvester, slashing and inflicting Bleed on all enemies passed through.",
    tags: ['attack', 'movement', 'physical', 'melee'], color: '#8a4a68',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'dash', distance: 320, speed: 950, width: 64 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 1, magnitude: 0.6 },
    ],
  },

  harvester_command: {
    id: 'harvester_command', name: 'Reap', noDrop: true,
    description: "Orders the Harvester to dash along your target line, inflicting bleed on enemies in its path.",
    tags: ['minion', 'instant'], color: '#8a4a68',
    manaCost: 6, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'minionCast', skillId: 'reaper_lunge', at: 'aim' }],
  },

  summon_harvester: {
    id: 'summon_harvester', name: 'Summon Harvester',
    description: "Toggle to reserve mana and bind the Harvester, which reforms 8 seconds after death. While active, your other minions deal 20% less damage and have 10% reduced movement speed, and every 5 seconds the Harvester consumes one friendly minion to heal 18% of its life and gain 8% increased damage and 5% increased attack speed (up to 8 stacks). Hold Shift and press to order Reap.",
    tags: ['spell', 'summon', 'minion', 'physical', 'persistent'], color: '#8a4a68',
    manaCost: 20, cooldown: 4, useTime: 0.9,
    delivery: {
      type: 'summon', monsterId: 'harvester', count: 1, maxActive: 1,
      persistent: { reserve: 35, respawnTime: 8, toggle: true },
      presence: {
        minionMods: [
          mod('damage', 'more', -0.2),
          mod('moveSpeed', 'increased', -0.1),
        ],
      },
      devour: {
        interval: 5, radius: 240, heal: 0.18,
        mods: [
          mod('damage', 'increased', 0.08),
          mod('attackSpeed', 'increased', 0.05),
        ],
        maxStacks: 8, duration: 18,
      },
    },
    meta: { skillId: 'harvester_command', label: 'Reap' },
    effects: [],
    requirements: { willpower: 24 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1)] },
  },

  call_harvester: {
    id: 'call_harvester', name: 'Call the Harvester',
    description: "Summon an unbound Harvester for 20 seconds without reserving mana, retaining its aura, minion-devouring behavior, and command sweep.",
    tags: ['spell', 'summon', 'minion', 'physical', 'duration'], color: '#a05a78',
    manaCost: 24, cooldown: 10, useTime: 0.9,
    delivery: {
      type: 'summon', monsterId: 'harvester', count: 1, maxActive: 1,
      duration: 20,
      presence: {
        minionMods: [
          mod('damage', 'more', -0.2),
          mod('moveSpeed', 'increased', -0.1),
        ],
      },
      devour: {
        interval: 5, radius: 240, heal: 0.18,
        mods: [
          mod('damage', 'increased', 0.08),
          mod('attackSpeed', 'increased', 0.05),
        ],
        maxStacks: 8, duration: 18,
      },
    },
    meta: { skillId: 'harvester_command', label: 'Reap' },
    effects: [],
    requirements: { willpower: 20 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1)] },
  },

  reaper_swarm: {
    id: 'reaper_swarm', name: 'Reaper Swarm',
    description: "Summon 4 lesser reapers that fight for you for 14 seconds.",
    tags: ['spell', 'summon', 'minion', 'physical', 'duration'], color: '#b07898',
    manaCost: 18, cooldown: 8, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'lesser_reaper', count: 4, maxActive: 4,
      duration: 14,
    },
    effects: [],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.1)] },
  },

  war_horn: {
    id: 'war_horn', name: 'War Horn',
    description: "Sound a war horn that rallies all of your minions to converge on the target location and focus enemies there for 6 seconds.",
    tags: ['spell', 'minion', 'warcry', 'instant'], color: '#c8a04b',
    manaCost: 7, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', duration: 6 }],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('minionMoveSpeed', 'increased', 0.06)] },
  },

  last_rite: {
    id: 'last_rite', name: 'Last Rite',
    description: "Detonates all of your active re-summonable minions at once, dealing area damage equal to 65% of each minion's maximum life.",
    tags: ['spell', 'minion', 'fire', 'instant'], color: '#e86848',
    manaCost: 12, cooldown: 10, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'detonateMinions', fraction: 0.65 }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('minionExplodeDeath', 'flat', 0.04)] },
  },

  skeletal_lunge: {
    id: 'skeletal_lunge', name: 'Skeletal Lunge', noDrop: true,
    description: "Order a skeletal warrior to dash forward in a line and slash with a 50% chance to inflict Bleed.",
    tags: ['attack', 'movement', 'physical', 'melee'], color: '#cfc8b8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'dash', distance: 230, speed: 850, width: 46 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.5, magnitude: 0.35 },
    ],
  },

  command_skeletal_strike: {
    id: 'command_skeletal_strike', name: 'Skeletal Strike', noDrop: true,
    description: "Orders all minions of the supported skill to dash to their nearest enemy and slash with a 50% chance to inflict bleed.",
    tags: ['minion', 'instant'], color: '#cfc8b8',
    manaCost: 5, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'minionCast', skillId: 'skeletal_lunge', at: 'enemy' }],
  },

  // --- Channel-build → persist-and-decay -----------------------------------

  hailcrown: {
    id: 'hailcrown', name: 'Hailcrown',
    description: "Channel to form a crown of ice that bombards nearby enemies with cold damage and a 50% chance to chill. When released, the hailstorm continues autonomously around you for up to 6 seconds based on how long you channeled.",
    tags: ['spell', 'cold', 'aoe', 'storm', 'channel', 'duration'], color: '#9ad8f0',
    manaCost: 4, cooldown: 2, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.32, windup: 0.25, move: 'slowed', moveFactor: 0.6,
      trackAim: false, cooldownOnEnd: true, maxHold: 7,
      ramp: { per: 0.11, max: 0.7 },
      persist: { perHeldSec: 1.1, maxDuration: 6, minHold: 0.6, fade: 0.35 },
    },
    baseDamage: { cold: [8, 13] },
    delivery: {
      type: 'storm', count: 2, interval: 0, areaRadius: 200, hitRadius: 44,
      castRange: 0, atEnemies: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 180, weight: 2 },
  },

  // --- The Impaler family (javelins) ----------------------------------------

  voltspear: {
    id: 'voltspear', name: 'Voltspear',
    description: "Throw a lightning javelin that pierces up to 3 enemies, with a 30% chance to shock each target hit.",
    tags: ['attack', 'projectile', 'lightning', 'javelin'], color: '#e8e05a',
    manaCost: 6, cooldown: 0, useTime: 0.55,
    baseDamage: { lightning: [10, 16] },
    delivery: {
      type: 'projectile', speed: 660, radius: 7, range: 520, pierce: 3,
      shape: 'line',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { dexterity: 20 },
    ai: { range: 440, weight: 2, keepDistance: 280 },
  },

  blightspear: {
    id: 'blightspear', name: 'Blightspear',
    description: "Throw a javelin that deals physical and chaos damage on hit and bursts into a lingering plague cloud for 2.6 seconds at the end of its flight, with a 40% chance to inflict Decay.",
    tags: ['attack', 'projectile', 'chaos', 'javelin', 'duration'], color: '#9ac860',
    manaCost: 8, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [5, 8], chaos: [8, 13] },
    delivery: {
      type: 'projectile', speed: 500, radius: 8, range: 440,
      shape: 'line',
      endZone: { radius: 95, duration: 2.6, tickInterval: 0.4, damageScale: 0.5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.4, magnitude: 0.4 },
    ],
    requirements: { dexterity: 18, willpower: 12 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  // --- The mire suite: slow flights, breathing ground ------------------------
  // The size-envelope showcase: every pool these lay CONTRACTS over its own
  // duration (SizeEnvelopeSpec — quadIn holds the promise then closes), and
  // the wakes read the flight's LIVE pace (durationBySpeed, exp < 0): slow
  // the glob further and its sheddings linger LONGER. Duration is the one
  // composable everything else hangs from.
  mirespume: {
    id: 'mirespume', name: 'Mirespume',
    description: "Launch a slow homing glob of bog venom that sheds shrinking poison pools along its path and on expiration, dealing chaos damage with a 55% chance to poison.",
    tags: ['spell', 'chaos', 'projectile', 'duration'], color: '#7aa042',
    manaCost: 11, cooldown: 0, useTime: 0.75,
    baseDamage: { chaos: [11, 17] },
    delivery: {
      type: 'projectile', speed: 90, radius: 11, range: 430,
      duration: 4.6,
      trajectory: { homing: 0.8 },
      trail: {
        every: 58,
        zone: {
          radius: 40, duration: 3.0, tickInterval: 0.5, damageScale: 0.3,
          sizeOver: { from: 1, to: 0, curve: 'quadIn' },
          durationBySpeed: { ref: 90, exp: -0.55, min: 0.6, max: 1.8 },
        },
      },
      endZone: {
        radius: 68, duration: 4.0, tickInterval: 0.5, damageScale: 0.55,
        sizeOver: { from: 1.1, to: 0, curve: 'quadIn' },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.55, magnitude: 0.5 },
    ],
    requirements: { willpower: 16 },
    ai: { range: 420, weight: 3, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  marshlight: {
    id: 'marshlight', name: 'Marshlight',
    description: "Launch a steerable lantern projectile that pierces enemies and leaves shrinking poison pools along its path, dealing chaos damage with a 45% chance to poison.",
    tags: ['spell', 'chaos', 'projectile', 'duration'], color: '#9ad4a0',
    manaCost: 12, cooldown: 0, useTime: 0.7,
    baseDamage: { chaos: [9, 14] },
    delivery: {
      type: 'projectile', speed: 150, radius: 9, range: 600,
      duration: 4.2,
      rehit: 0.6,
      trajectory: { guide: 3.0 },
      trail: {
        every: 50,
        zone: {
          radius: 36, duration: 2.6, tickInterval: 0.5, damageScale: 0.26,
          sizeOver: { from: 1, to: 0, curve: 'linear' },
          durationBySpeed: { ref: 150, exp: -0.5, min: 0.6, max: 2.0 },
        },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.45, magnitude: 0.45 },
    ],
    requirements: { willpower: 18 },
    ai: { range: 360, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('effectDuration', 'increased', 0.02)] },
  },

  // The bog dweller's seep — and the venom bloom's burst: a small pure pool
  // that begins LIVE (no impact pop of its own) and contracts into nothing.
  // noDrop: a kit piece, not a gem. Serves BOTH the body-wake kit-part
  // (MonsterDef.wake free-casts it underfoot) and BrittleSpec.fume
  // (mintHazardCloud pops it, envelope and all) — one payload, two seams.
  venom_seep: {
    id: 'venom_seep', name: 'Venom Seep',
    description: "Create a shrinking pool of venom for 2.4 seconds that deals chaos damage over time with a 35% chance to poison.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#8ab84a',
    noDrop: true,
    manaCost: 0, cooldown: 0, useTime: 0.1,
    baseDamage: { chaos: [4, 7] },
    delivery: {
      type: 'ground', radius: 34, castRange: 90,
      lingerDuration: 2.4, tickInterval: 0.5,
      noImpact: true,
      sizeOver: { from: 1, to: 0, curve: 'quadIn' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.35, magnitude: 0.4 },
    ],
  },

  /** The Jelly Replete's dripped rope (MonsterDef.wake payload — sheds as it
   *  bolts): a clinging amber slick that MIRES whoever wades it (the bog's
   *  own terrain status, reused — any clinging goo speaks that word). Barely
   *  a wound; the point is the drag while the swarm is overhead. */
  jelly_trail: {
    id: 'jelly_trail', name: 'Royal Slick',
    description: "Leaves a trail of royal jelly that deals chaos damage over time with a 60% chance to inflict Mired.",
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#f0c060',
    noDrop: true,
    manaCost: 0, cooldown: 0, useTime: 0.1,
    baseDamage: { chaos: [1, 2] },
    delivery: {
      type: 'ground', radius: 30, castRange: 60,
      lingerDuration: 3.0, tickInterval: 0.5,
      noImpact: true,
      sizeOver: { from: 1, to: 0.4, curve: 'quadIn' },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'mired', chance: 0.6 },
    ],
  },

  // --- The GATHER family: capped holds, brimming bars, fuses -----------------
  // The completion-cast vocabulary in four shapes: ChannelSpec.brim banks
  // held time in a PERSISTENT gauge whose fill scales the payoff (its decay,
  // bank threshold, spend policy and fill→power curve all data); maxHold
  // gives a channel a readable CEILING; release.requireFull fires ONLY at
  // true completion (a stun denies everything — the counterplay); and
  // FuseSpec makes any skill's resolutions arrive LATE (Doom, made a lever).
  surgewind: {
    id: 'surgewind', name: 'Surgewind',
    description: "Channel to fill a persistent wind gauge that decays slowly while not channeling. Release to consume the gauge and gain up to 55% increased movement speed and 16% increased attack and cast speed for 5 seconds, scaled by how full the gauge was.",
    tags: ['spell', 'buff', 'duration', 'channel'], color: '#7fd0c8',
    manaCost: 4, cooldown: 0, useTime: 0.4,
    castMode: 'channel',
    channel: {
      interval: 0.5, move: 'slowed', moveFactor: 0.55, windup: 0.2,
      release: { pulses: false },
      brim: { fillTime: 5, decay: 0.16, minRelease: 0.12 },
    },
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'surgewind', duration: 5, powerScaled: true,
      mods: [
        mod('moveSpeed', 'increased', 0.55),
        mod('attackSpeed', 'increased', 0.16),
        mod('castSpeed', 'increased', 0.16),
      ],
    }],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('brimPower', 'increased', 0.03)] },
  },

  marrow_communion: {
    id: 'marrow_communion', name: 'Marrow Communion',
    description: "Channel while stationary to fill a persistent communion gauge that does not decay between uses. Release to consume the gauge and heal yourself and nearby allies for up to 10% of maximum life plus flat life.",
    tags: ['spell', 'heal', 'aoe', 'duration', 'channel'], color: '#8fd08a',
    manaCost: 7, cooldown: 0, useTime: 0.5,
    castMode: 'channel',
    channel: {
      interval: 0.6, move: 'immobile',
      release: { pulses: false },
      brim: { fillTime: 3.5, minRelease: 0.2, minScale: 0.15 },
    },
    delivery: { type: 'nova', radius: 230, affects: 'allies' },
    effects: [
      { type: 'heal', amount: 26, pctMax: 0.1 },
    ],
    requirements: { wisdom: 16 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.08)] },
  },

  kindled_ruin: {
    id: 'kindled_ruin', name: 'Kindled Ruin',
    description: "Channel while stationary for 4 seconds to charge a massive fire nova. Completing the full 4-second channel unleashes an explosion around you for heavy fire damage with an 18% chance to ignite.",
    tags: ['spell', 'fire', 'aoe', 'channel'], color: '#ff8a3a',
    manaCost: 6, cooldown: 8, useTime: 0.45,
    baseDamage: { fire: [34, 52] },
    castMode: 'channel',
    channel: {
      interval: 0.55, move: 'immobile', maxHold: 4, cooldownOnEnd: true,
      release: { pulses: false, requireFull: true, dmgRamp: { per: 0.4, max: 1.6 } },
    },
    delivery: { type: 'nova', radius: 220 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.5 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 190, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('aoeRadius', 'increased', 0.02)] },
  },

  // --- The melt & the deep: lurker/angler armaments ---------------------------
  ember_dart: {
    id: 'ember_dart', name: 'Ember Dart', noDrop: true,
    description: "Fire a small, fast fire projectile with a 9% chance to ignite.",
    tags: ['spell', 'projectile', 'fire'], color: '#ff9a3c',
    manaCost: 3, cooldown: 0, useTime: 0.55,
    baseDamage: { fire: [3, 6] },
    delivery: { type: 'projectile', speed: 300, radius: 6, range: 340 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.25, magnitude: 0.3 },
    ],
    ai: { range: 300, weight: 2, keepDistance: 150 },
  },

  magma_lob: {
    id: 'magma_lob', name: 'Magma Lob',
    description: "Lob a glob of magma that bursts for fire damage on impact and leaves a shrinking burning pool for 3.2 seconds, with a 16% chance to ignite.",
    tags: ['spell', 'fire', 'projectile', 'aoe', 'duration'], color: '#ff7a2a',
    manaCost: 10, cooldown: 0.8, useTime: 0.7,
    baseDamage: { fire: [14, 22] },
    delivery: {
      type: 'projectile', speed: 190, radius: 10, range: 460,
      explode: { radius: 60, damageScale: 0.7 },
      endZone: {
        radius: 62, duration: 3.2, tickInterval: 0.5, damageScale: 0.4,
        sizeOver: { from: 1, to: 0, curve: 'quadOut' },
      },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.45, magnitude: 0.5 },
    ],
    requirements: { intelligence: 14 },
    ai: { range: 430, weight: 3, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  void_hook: {
    id: 'void_hook', name: 'Void Hook',
    description: "Fires a barbed void line that deals chaos damage, pulls the target to your feet, and stuns them for 0.3 seconds on arrival.",
    tags: ['spell', 'chaos', 'projectile'], color: '#8a6ad4',
    manaCost: 8, cooldown: 3, useTime: 0.6,
    baseDamage: { chaos: [10, 16] },
    delivery: { type: 'projectile', speed: 520, radius: 8, range: 420, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.3 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 3, keepDistance: 300 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // --- THE CAULBORN's verbs (the Caul biome's terrain-that-fights kit) ------
  // The lasher's swat: a wide, patient arc from a rooted appendage. The reach
  // is the threat — the wind-up is long and honest, the punish is stepping in
  // without watching the ground.
  caul_lash: {
    id: 'caul_lash', name: 'Caul Lash',
    description: "Sweeps a wide tentacle arc that deals physical damage and knocks enemies back.",
    tags: ['attack', 'melee', 'aoe', 'physical'], color: '#8a6ab0',
    manaCost: 0, cooldown: 2.6, useTime: 0.85,
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'melee', range: 118, arcDeg: 150 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 260, mode: 'shove' },
    ],
    requirements: { strength: 12 },
    ai: { range: 118, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  // The maw's cast-and-reel: void_hook's grammar in meat — a tongue that
  // snaps out, barbs, and DRAGS the catch to the teeth. The pull is also the
  // player's ticket to adjacency; the maw regrets nothing.
  tongue_reel: {
    id: 'tongue_reel', name: 'Tongue Reel',
    description: "Snaps out a barbed tongue in a line that pulls the target to the caster and stuns them for 0.35 seconds on arrival.",
    tags: ['attack', 'projectile', 'physical'], color: '#b46a8a',
    manaCost: 6, cooldown: 4, useTime: 0.7,
    baseDamage: { physical: [8, 14] },
    delivery: { type: 'projectile', speed: 640, radius: 9, range: 340, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.35 },
    ],
    requirements: { dexterity: 12 },
    ai: { range: 320, weight: 3, keepDistance: 140 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  // THE MUTANT'S REEL (contagion Movement III): the grafted plague_tendril's
  // one verb — tongue_reel's grammar at graft scale (shorter, softer,
  // plague-hued): a barbed cord snaps out in a line and PULLS the catch to
  // the host's side. Counterplay is the graft itself: the tendril is its own
  // targetable body, and killing it frees the host of its reach while the
  // host shambles on. Numbers flagged.
  plague_reel: {
    id: 'plague_reel', name: 'Plague Reel', noDrop: true,
    description: "Snaps out a barbed tendril that deals physical and chaos damage, pulls the target in, and stuns them for 0.25 seconds on arrival.",
    tags: ['attack', 'projectile', 'physical', 'chaos'], color: '#8a6ab0',
    manaCost: 8, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [4, 7], chaos: [3, 6] },
    delivery: { type: 'projectile', speed: 560, radius: 8, range: 240, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.25 },
    ],
    ai: { range: 230, weight: 3 },
  },
  // The chew: short, brutal, and it DRINKS — every landed bite knocks a
  // life-orb loose that homes back to the maw (siphonOrb: sustain with
  // travel time, dodgeable by walking away from your own blood).
  devouring_maw: {
    id: 'devouring_maw', name: 'Devouring Maw',
    description: "Bites a target in melee for physical damage and shakes loose a life orb that homes back to the attacker unless intercepted.",
    tags: ['attack', 'melee', 'physical'], color: '#a04a5a',
    manaCost: 0, cooldown: 1.6, useTime: 0.6,
    baseDamage: { physical: [16, 26] },
    delivery: { type: 'melee', range: 64, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      { type: 'siphonOrb', resource: 'life', amount: 10 },
    ],
    requirements: { strength: 14 },
    ai: { range: 64, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  // The weaver's jangle: a soft chaos ring that makes the floor's own nerves
  // fire — brief ensnare, no burst. The dread is the second caster you
  // didn't see while the first held your boots.
  nerve_pulse: {
    id: 'nerve_pulse', name: 'Nerve Pulse',
    description: "Release a chaos nova around yourself with a 40% chance to ensnare enemies hit.",
    tags: ['spell', 'chaos', 'aoe', 'instant'], color: '#9a72c8',
    manaCost: 10, cooldown: 3.2, useTime: 0.65,
    baseDamage: { chaos: [9, 15] },
    delivery: { type: 'nova', radius: 150 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 0.4, magnitude: 1 },
    ],
    requirements: { intelligence: 12, willpower: 10 },
    ai: { range: 150, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },

  // --- THE SYMBIOTE ARTS (the player's half of the Caul vocabulary) --------
  // What the biome does TO you, gems teach you to do BACK: reach-tier lash,
  // a planted maw with a grip wider than its bite, and skin that pays rent.
  tendril_lash: {
    id: 'tendril_lash', name: 'Tendril Lash',
    description: "Sweep a long-reach melee arc that deals physical and chaos damage with a 30% chance to ensnare.",
    tags: ['attack', 'melee', 'aoe', 'chaos'], color: '#8a6ab0',
    manaCost: 4, cooldown: 0, useTime: 0.75,
    baseDamage: { physical: [8, 13], chaos: [6, 10] },
    delivery: { type: 'melee', range: 130, arcDeg: 160 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 0.3, magnitude: 1 },
    ],
    requirements: { strength: 10, willpower: 10 },
    ai: { range: 130, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  maw_bloom: {
    id: 'maw_bloom', name: 'Maw Bloom',
    description: "Plant a carnivorous bloom at the target location for 4 seconds that pulls nearby enemies inward and bites every 0.5 seconds for physical and chaos damage with a 25% chance to ensnare.",
    tags: ['spell', 'duration', 'chaos', 'aoe'], color: '#b46a8a',
    manaCost: 22, cooldown: 5, useTime: 0.7,
    baseDamage: { chaos: [7, 11], physical: [4, 7] },
    delivery: {
      type: 'ground', radius: 70, castRange: 420,
      lingerDuration: 4, tickInterval: 0.5,
      pull: 190, pullRadius: 190,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'ensnared', chance: 0.25, magnitude: 1 },
    ],
    requirements: { intelligence: 14, willpower: 12 },
    ai: { range: 400, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.02)] },
  },
  symbiote_skin: {
    id: 'symbiote_skin', name: 'Symbiote Skin',
    description: "Gain +10 life regeneration per second, 8% increased movement speed, and +15% chaos resistance for 6 seconds.",
    tags: ['spell', 'buff', 'duration'], color: '#9a72c8',
    manaCost: 14, cooldown: 12, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'symbiote_skin', duration: 6,
      mods: [mod('lifeRegen', 'flat', 10), mod('moveSpeed', 'increased', 0.08), mod('chaosRes', 'flat', 0.15)],
    }],
    requirements: { willpower: 14 },
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('cooldownRecovery', 'increased', 0.05)] },
  },

  doomsayers_word: {
    id: 'doomsayers_word', name: 'Doomsayer\'s Word',
    description: "Fire a chaos bolt that marks the target and resolves after 3 seconds based on your stats when the delay ends, dealing chaos damage with a 50% chance to inflict Decay.",
    tags: ['spell', 'chaos', 'projectile'], color: '#b06bd4',
    manaCost: 9, cooldown: 1.2, useTime: 0.55,
    baseDamage: { chaos: [18, 28] },
    fuse: { delay: 3, tell: 'the Word settles…' },
    delivery: { type: 'projectile', speed: 380, radius: 8, range: 520 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'decay', chance: 0.5, magnitude: 0.5 },
    ],
    requirements: { intelligence: 16, willpower: 12 },
    ai: { range: 460, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  skyfall_volley: {
    id: 'skyfall_volley', name: 'Skyfall Volley',
    description: "Launch a volley of javelins skyward to rain 7 to 10 spears across the target area, each hit having a 25% chance to inflict Bleed.",
    tags: ['attack', 'javelin', 'aoe', 'storm', 'physical'], color: '#c8b890',
    manaCost: 11, cooldown: 2, useTime: 0.7,
    baseDamage: { physical: [8, 13] },
    delivery: {
      type: 'storm', count: [7, 10], interval: 0.05,
      areaRadius: 140, hitRadius: 34, castRange: 480,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.25, magnitude: 0.3 },
    ],
    requirements: { dexterity: 22 },
    ai: { range: 420, weight: 2, keepDistance: 280 },
  },

  lancing_flurry: {
    id: 'lancing_flurry', name: 'Lancing Flurry',
    description: "Thrust simultaneously along straight lines toward up to 24 nearby enemies, with a 30% chance on each hit to inflict Bleed.",
    tags: ['attack', 'javelin', 'aoe', 'physical'], color: '#d8c8a0',
    manaCost: 12, cooldown: 3, useTime: 0.5,
    baseDamage: { physical: [12, 19] },
    delivery: { type: 'nova', radius: 230, maxTargets: 24, lanceFx: true },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.35 },
    ],
    requirements: { dexterity: 26 },
    ai: { range: 200, weight: 2 },
  },

  // --- Fields, storms & pods -------------------------------------------------

  torpor_field: {
    tree: CONTROL_STARTER_TREES.torpor_field,
    id: 'torpor_field', name: 'Torpor Field',
    description: "Project a destructible time-slowing dome for 7 seconds (up to 1 active at a time) that reduces enemy projectile speed inside it by 70%.",
    tags: ['spell', 'aoe', 'duration', 'totem'], color: '#88b8d8',
    manaCost: 14, cooldown: 8, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'dome', look: 'device_torpor_field',
      domeMode: 'slow', domeSlow: 0.3, domeRadius: 140,
      range: 0, duration: 7, maxActive: 1, life: 55, placeRange: 320,
    },
    effects: [],
    requirements: { willpower: 14, intelligence: 10 },
    ai: { range: 240, weight: 1 },
  },

  levinfall: {
    id: 'levinfall', name: 'Levinfall',
    description: "Call down 9 to 13 lightning strikes across the marked area after a brief telegraph, each strike having a 30% chance to shock.",
    tags: ['spell', 'lightning', 'aoe', 'storm'], color: '#f0e858',
    manaCost: 13, cooldown: 4, useTime: 0.65,
    baseDamage: { lightning: [9, 15] },
    delivery: {
      // CELESTIAL (occlusion 'free'): the sky empties where the mark is set.
      type: 'storm', count: [9, 13], interval: 0.04,
      areaRadius: 180, hitRadius: 42, castRange: 460, occlusion: 'free',
      telegraph: 0.9,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { intelligence: 20 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
  },

  broodpod: {
    id: 'broodpod', name: 'Broodpod',
    description: "Plant a destructible egg pod (up to 2 active at once) that incubates for 5 seconds before hatching 3 broodling hunters.",
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#a8c860',
    manaCost: 16, cooldown: 6, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_broodpod',
      range: 0, duration: 5, maxActive: 2, life: 65, placeRange: 320,
      hatch: { skillId: 'brood_hatch' },
    },
    effects: [],
    requirements: { willpower: 18 },
    ai: { range: 280, weight: 1 },
  },

  brood_hatch: {
    id: 'brood_hatch', name: 'Brood', noDrop: true,
    description: "Hatch 3 broodling hunters from the pod that fight for 16 seconds, up to 6 active at once.",
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#a8c860',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: {
      type: 'summon', monsterId: 'broodling', count: 3, maxActive: 6,
      duration: 16,
      placeAt: { at: 'cursor', range: 9999, scatter: 36 },
    },
    effects: [],
  },

  nitrocask: {
    id: 'nitrocask', name: 'Nitrocask',
    description: "Place a powder cask (up to 3 active at once) that detonates in a fiery explosion after 2.4 seconds or immediately when damaged by any hit.",
    tags: ['spell', 'fire', 'aoe', 'duration', 'totem'], color: '#e07838',
    manaCost: 10, cooldown: 3, useTime: 0.45,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_nitrocask',
      range: 0, duration: 2.4, maxActive: 3, life: 45, placeRange: 280,
      hatch: { skillId: 'cask_blast', onBreak: 'hatch' },
    },
    effects: [],
    requirements: { dexterity: 14, intelligence: 12 },
    ai: { range: 240, weight: 1 },
  },

  cask_blast: {
    id: 'cask_blast', name: 'Cask Blast', noDrop: true,
    description: "Detonate the powder cask for wide area fire damage, knocking nearby enemies back with an 18% chance to ignite.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff8a3a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [26, 40] },
    delivery: { type: 'ground', radius: 150, castRange: 9999, delay: 0 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.5, magnitude: 0.4 },
      { type: 'knockback', strength: 130 },
    ],
  },

  // ======================= The Ledger, gates & the poke ====================
  // Framework pass: prerequisite gates, banking/deferral toggles, and the
  // greatshield-and-lance stance. The primitives lead; these hang off them.

  bastion_thrust: {
    id: 'bastion_thrust', name: 'Bastion Thrust',
    description: "Thrust a lance down a narrow long-range line with a 35% chance to inflict Bleed, usable while guarding without lowering your shield.",
    tags: ['attack', 'melee', 'physical', 'javelin', 'instant'], color: '#d0c0a0',
    manaCost: 6, cooldown: 1.2, useTime: 0,
    usableWhileGuarding: true,
    baseDamage: { physical: [16, 26] },
    delivery: { type: 'cone', range: 135, arcDeg: 12 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.35, magnitude: 0.4 },
    ],
    requirements: { strength: 20, dexterity: 12 },
    ai: { range: 120, weight: 2 },
  },

  phalanx_thrust: {
    id: 'phalanx_thrust', name: 'Phalanx Thrust', noDrop: true,
    // The AI hint lets shield-drilled MONSTERS poke from behind the wall
    // (pickSkill's guard-combo path) — the same discipline the player runs.
    ai: { range: 120, weight: 3 },
    description: "Thrust a lance from behind a raised guard to deal physical damage and knock the target back. Requires an active guard stance.",
    tags: ['attack', 'melee', 'physical', 'javelin', 'instant'], color: '#c8b890',
    manaCost: 6, cooldown: 1.5, useTime: 0,
    requiresGuard: true,
    usableWhileGuarding: true,
    gate: { guard: true },
    baseDamage: { physical: [14, 22] },
    delivery: { type: 'cone', range: 125, arcDeg: 12 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
    ],
  },

  arrears: {
    id: 'arrears', name: 'Arrears',
    description: "Toggle on to defer 40% of hit damage taken into a debt pool (up to 120% of maximum life) that drains mana per second based on stored debt. Running out of mana ends the toggle and applies all deferred damage at once. Use the secondary command to clear half of the stored debt.",
    tags: ['spell', 'aura', 'buff', 'duration'], color: '#c8a858',
    manaCost: 10, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: { radius: 12 },
      ledger: {
        source: 'damageTaken', rate: 0.4,
        cap: { maxLifePct: 1.2 },
        upkeep: { base: 0.5, perPoint: 0.05 },
        lapse: 'landDamage',
      },
    },
    meta: { skillId: 'absolution', label: 'Absolve' },
    effects: [],
    requirements: { willpower: 20 },
    leveling: { perLevel: [mod('manaRegen', 'flat', 0.4)] },
  },

  absolution: {
    id: 'absolution', name: 'Absolution', noDrop: true,
    description: "Clear 50% of your currently deferred Arrears damage debt.",
    tags: ['spell', 'instant'], color: '#d8c878',
    manaCost: 8, cooldown: 12, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'payLedger', pct: 0.5 }],
  },

  grit_stance: {
    id: 'grit_stance', name: 'Grit',
    description: "While active, 55% of hit damage taken is staggered and dealt smoothly over 6 seconds instead of immediately.",
    tags: ['spell', 'aura', 'buff', 'duration'], color: '#b8a888',
    manaCost: 8, cooldown: 1, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: {
        radius: 12,
        selfMods: [
          mod('staggerFrac', 'flat', 0.55),
          mod('staggerWindow', 'flat', 3),
        ],
      },
      upkeep: { manaPerSec: 1.5 },
    },
    effects: [],
    requirements: { strength: 16, willpower: 14 },
    leveling: { perLevel: [mod('staggerFrac', 'flat', 0.015)] },
  },

  reclamation: {
    id: 'reclamation', name: 'Reclamation',
    description: "While toggled on, stores 65% of your mana regeneration in a reservoir up to 50% of your maximum mana. Reaching low mana or toggling off releases the stored mana to your pool and discharges it as lightning damage around you.",
    tags: ['spell', 'aura', 'lightning', 'duration'], color: '#5a8ad8',
    manaCost: 0, cooldown: 2, useTime: 0,
    delivery: {
      type: 'aura', mode: 'toggle',
      aura: { radius: 12 },
      upkeep: { reserveMana: 24 },
      ledger: {
        source: 'manaRegen', rate: 0.65,
        cap: { maxManaPct: 0.5 },
        lapse: 'ventMana',
        ventDamage: { perPoint: 1.4, radius: 170, damageType: 'lightning' },
        ventBelowMana: 0.18,
      },
    },
    effects: [],
    requirements: { intelligence: 22 },
    leveling: { perLevel: [mod('mana', 'increased', 0.04)] },
  },

  glacier_crown: {
    id: 'glacier_crown', name: 'Glacier Crown',
    description: "Channel to store hail charges without firing, then release to unleash an immediate cold burst around you followed by an autonomous hailstorm that follows you for up to 7 seconds with a 50% chance to chill on hit.",
    tags: ['spell', 'cold', 'aoe', 'storm', 'channel', 'duration'], color: '#b8e8ff',
    manaCost: 4, cooldown: 3, useTime: 0,
    castMode: 'channel',
    channel: {
      interval: 0.32, windup: 0.25, move: 'slowed', moveFactor: 0.6,
      trackAim: false, cooldownOnEnd: true, maxHold: 6,
      ramp: { per: 0.16, max: 1.1 },
      release: { pulses: false, minHold: 0.6, dmgRamp: { per: 0.28, max: 1.6 } },
      persist: { perHeldSec: 1.4, maxDuration: 7, minHold: 0.6, fade: 0.45 },
    },
    baseDamage: { cold: [9, 14] },
    delivery: {
      type: 'storm', count: 2, interval: 0, areaRadius: 200, hitRadius: 44,
      castRange: 0, atEnemies: true,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    requirements: { intelligence: 24 },
    ai: { range: 180, weight: 2 },
  },

  whirlaxe: {
    id: 'whirlaxe', name: 'Whirlaxe',
    description: "Hurls an axe that ricochets off the first enemy hit toward a marked catch circle near you, with a 30% chance to inflict bleed. Catching the axe in the circle grants 1 Gyre charge (up to 5) and refreshes the axe.",
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#d8b878',
    manaCost: 5, cooldown: 0, useTime: 0.45,
    baseDamage: { physical: [13, 20] },
    delivery: {
      type: 'projectile', speed: 520, radius: 10, range: 460,
      catchSpot: { charge: 'gyre', amount: 1, max: 5, duration: 5 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.3 },
    ],
    requirements: { dexterity: 20 },
    ai: { range: 380, weight: 2, keepDistance: 240 },
  },

  holy_relic: {
    id: 'holy_relic', name: 'Holy Relic',
    description: "Summon a floating relic at your shoulder for 14 seconds (up to 1 active at a time) that releases a physical damage and healing pulse whenever you land an attack.",
    tags: ['spell', 'summon', 'minion', 'totem', 'duration', 'heal'], color: '#f0e0b0',
    manaCost: 14, cooldown: 6, useTime: 0.55,
    baseDamage: { physical: [3, 5] },
    delivery: {
      type: 'construct', kind: 'relic', look: 'device_holy_relic', castSkillId: 'relic_pulse',
      range: 0, duration: 14, maxActive: 1, life: 45, placeRange: 60,
      interval: 0.8,
      follows: true,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18 },
    ai: { range: 200, weight: 1 },
  },

  relic_pulse: {
    id: 'relic_pulse', name: 'Relic Pulse', noDrop: true,
    description: "Release a ring of physical damage around the relic that also heals nearby allies for 4 life.",
    tags: ['spell', 'physical', 'aoe', 'heal'], color: '#f0e0b0',
    manaCost: 0, cooldown: 0.55, useTime: 0,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'nova', radius: 95 },
    effects: [
      { type: 'damage' },
      { type: 'heal', amount: 4 },
    ],
  },

  tolling_bell: {
    id: 'tolling_bell', name: 'Tolling Bell',
    description: "Place a great bell for 10 seconds that taunts nearby enemies and emits a physical shockwave whenever hit, knocking attackers back.",
    tags: ['spell', 'physical', 'aoe', 'totem', 'duration'], color: '#c8a858',
    manaCost: 15, cooldown: 9, useTime: 0.6,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'device_tolling_bell', castSkillId: 'bell_toll',
      range: 0, duration: 10, maxActive: 1, life: 150, placeRange: 280,
      interval: 0.6,
      castOnStruck: true,
      taunt: true,
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 18, willpower: 12 },
    ai: { range: 220, weight: 1 },
  },

  bell_toll: {
    id: 'bell_toll', name: 'Bell Toll', noDrop: true,
    description: "Emit a ring of physical damage from the struck bell that knocks nearby enemies back.",
    tags: ['spell', 'physical', 'aoe'], color: '#c8a858',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 90 },
    ],
  },

  claw: {
    id: 'claw', name: 'Claw', noDrop: true,
    description: 'A simple raking melee attack.',
    tags: ['attack', 'melee', 'physical'], color: '#a08878',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'melee', range: 42, arcDeg: 80 },
    effects: [{ type: 'damage' }],
    ai: { range: 48, weight: 2 },
  },

  gloom_nip: {
    id: 'gloom_nip', name: 'Clinging Dark', noDrop: true,
    description: 'A small nip of darkness. Gloomlings cling at close range, draining life until'
      + ' movement or sharp turns fling them off. They remain exposed to attacks while attached.',
    tags: ['attack', 'melee', 'chaos'], color: '#74809e',
    manaCost: 0, cooldown: 0.4, useTime: 0.9,
    baseDamage: { chaos: [1, 2] },
    delivery: { type: 'melee', range: 28, arcDeg: 80 },
    effects: [{ type: 'damage' }],
    ai: { range: 32, weight: 2 },
  },

  // --- THE SCALD BASIN's kit verbs (data/scald.ts; charter §8) ---------------
  // THE VENT CALL (the geyserkin vent-shaman): a live vent called up UNDER
  // your feet — the under-enemy storm (atEnemies, castRange 0: the caller
  // is the storm's centre, the strikes plant under whoever stands inside
  // its reach), an HONEST telegraph ring, then the column: fire, a burn
  // chance, and the blast throws you clear — the geyser's own grammar in a
  // hand. Every number a DIAL.
  scald_vent_storm: {
    id: 'scald_vent_storm', name: 'Vent Call', noDrop: true,
    description: "Calls up a steam vent under the target that erupts after a brief telegraph, dealing fire damage with a 40% chance to ignite and knocking targets back.",
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#8fd8d4',
    manaCost: 14, cooldown: 4.5, useTime: 0.9,
    baseDamage: { fire: [11, 18] },
    delivery: {
      type: 'storm', count: [1, 2], interval: 0.3, areaRadius: 360, hitRadius: 44,
      castRange: 0, atEnemies: true, scatter: 14, telegraph: 1.4,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4 },
      { type: 'knockback', strength: 160 },
    ],
    ai: { range: 340, weight: 3, keepDistance: 240 },
  },
  // THE SCALD JET (the kettleback): the banked steam vented all around it
  // at the brim of its gauge — reserved OUT of the rotation by the brain
  // (the full sac is the only warning).
  scald_jet: {
    id: 'scald_jet', name: 'Scald Jet', noDrop: true,
    description: "Release banked steam in a scalding burst around the caster, dealing fire damage with a 50% chance to burn.",
    tags: ['attack', 'fire', 'aoe'], color: '#eef6f8',
    manaCost: 0, cooldown: 3, useTime: 0.5,
    baseDamage: { fire: [10, 17] },
    delivery: { type: 'nova', radius: 90 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'burn', chance: 0.5 }],
    ai: { range: 80, weight: 1 },
  },
  // THE STILT SPEAR (the stilt-strider): a spear-fisher's thrust from stilt
  // height — reach, a narrow arc.
  stilt_spear: {
    id: 'stilt_spear', name: 'Stilt Spear', noDrop: true,
    description: "Thrusts a long spear from stilt height for physical melee damage with extended reach.",
    tags: ['attack', 'melee', 'physical'], color: '#a8c8b8',
    manaCost: 0, cooldown: 0, useTime: 0.85,
    baseDamage: { physical: [7, 11] },
    delivery: { type: 'melee', range: 66, arcDeg: 40 },
    effects: [{ type: 'damage' }],
    ai: { range: 72, weight: 2 },
  },

  // --- THE SCALD KIT K1 (charter docs/design/scald-kit.md — the monster side
  // + the geyser-step spike; data/scaldkit.ts the census). THE SCALD family
  // banks `scalded` (StatusDef.bank: magnitude accumulates per blow, ×1.5 on
  // a wet body, a 5s managed wound) and RUPTURES it; STEAM plants a bank
  // (the `vent` effect); GEYSER-STEP rides a column (LeapDelivery.vent).
  // Monster verbs are noDrop kit-parts (THE MIRROR LAW: every player piece
  // has a wearer here first); the one player piece is GEYSER-STEP (her
  // spike). Every number a DIAL. -------------------------------------------
  // STEAM VENT (vent_shaman, vaporling): a steam BANK planted at the
  // caster's own feet — the fog fabric's kind (not the crone's conjured
  // cloud, `steam_veil`, which veils her court by status alone): eyes stop
  // at the white (THE VAPOR RIDE), occupants read as fog-veiled;
  // concealment as a castable. (K2's player Steam Veil plants the same
  // bank — at the aim.)
  steam_vent: {
    id: 'steam_vent', name: 'Steam Vent', noDrop: true,
    description: "Vent a cloud of dense steam at the caster's position that blocks ranged line of sight and veils units inside.",
    tags: ['spell', 'fire', 'duration'], color: '#eef6f8',
    manaCost: 10, cooldown: 12, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{ type: 'vent', bank: 'steam', radius: 90, duration: 9 }],
    ai: { range: 260, weight: 1 },
  },
  // VENT-RIDE (vent_shaman — the escape; the geyser-step's monster half):
  // a leap that plants a vent under the caster — the broil under its feet
  // for the wind-up (drawn; dodge-readable), the column at take-off (fire +
  // a banked scald on whoever hugged it), the ride out. Cast AWAY from the
  // target by the shaman's rule. NO-TAG: it relocates, never hovers.
  vent_ride: {
    id: 'vent_ride', name: 'Vent-Ride', noDrop: true,
    description: "Erupts a steam vent beneath the caster that scalds nearby enemies for fire damage and launches the caster to safety.",
    tags: ['spell', 'fire', 'aoe', 'movement'], color: '#8fd8d4',
    manaCost: 12, cooldown: 8, useTime: 0.45,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'leap', range: 300, airTime: 0.5, radius: 50, vent: { columnR: 44, scale: 1 } },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.5 },
    ],
    ai: { range: 110, weight: 1 },
  },
  // SHELL BURST (kettleback — its big hit at the brim): a ground nova of
  // boiling water — fire, a banked scald, and the splash SOAKS what it hits
  // (the `soaked` marker reads as wet for the bank fold), so the NEXT scald
  // banks ×1.5: the self-enabling combo. (K2's rename: the PLAYER's own
  // ground nova took the clean "Kettle Burst" name and id — the book can
  // never print one name for two arts.)
  kettleback_burst: {
    id: 'kettleback_burst', name: 'Shell Burst', noDrop: true,
    description: "Erupts boiling water around the caster for fire damage, inflicting a stacking scald and soaking targets hit so subsequent scalds deal increased damage.",
    tags: ['attack', 'fire', 'aoe'], color: '#d9f7fb',
    manaCost: 0, cooldown: 3, useTime: 0.6,
    baseDamage: { fire: [12, 19] },
    delivery: { type: 'nova', radius: 100 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.55 },
      { type: 'status', status: 'soaked', chance: 1 },
      { type: 'knockback', strength: 120 },
    ],
    ai: { range: 90, weight: 1 },
  },
  // SCALDING LUNGE (stilt_strider): a reaching thrust with boiling water on
  // the spear — fire + a banked scald; the wading prey pays the wet fold.
  scalding_lunge: {
    id: 'scalding_lunge', name: 'Scalding Lunge', noDrop: true,
    description: "Lunges with a boiling spear thrust that deals fire damage and inflicts a stacking scald, dealing extra damage to wet targets.",
    tags: ['attack', 'melee', 'fire'], color: '#9fe4ea',
    manaCost: 0, cooldown: 4, useTime: 0.7,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'melee', range: 84, arcDeg: 30 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.5 },
    ],
    ai: { range: 90, weight: 2 },
  },
  // SINTER LANCE (scald_lancer — the bank verb): a thrown sinter bolt that
  // BANKS scald on the mark (×1.5 wet). Its rotation.
  sinter_lance: {
    id: 'sinter_lance', name: 'Sinter Lance', noDrop: true,
    description: "Hurls a mineral-tipped lance that deals fire damage and inflicts a stacking scald, dealing extra damage to wet targets.",
    tags: ['attack', 'projectile', 'fire'], color: '#b8d8cc',
    manaCost: 0, cooldown: 1.4, useTime: 0.7,
    baseDamage: { fire: [7, 12] },
    delivery: { type: 'projectile', speed: 520, range: 380, radius: 7 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.5 },
    ],
    ai: { range: 360, weight: 3, keepDistance: 220 },
  },
  // PRESSURE THROW (scald_lancer — the RUPTURE verb, the tribe's finisher):
  // a charged lance that RUPTURES the mark's banked scald — 60% of the bank
  // bursts as fire NOW (mitigated, credited to the lancer), the rest keeps
  // burning; no bank, no burst (the hit still lands). One round in the pack
  // (useCharges — a magazine that rebuilds slowly; the worn pressure-pack
  // gauge reads it — THE PRESSURE GAUGE read).
  pressure_throw: {
    id: 'pressure_throw', name: 'Pressure Throw', noDrop: true,
    description: "Hurls a pressurized lance that deals fire damage and ruptures a portion of the target's stacked scald damage immediately.",
    tags: ['attack', 'projectile', 'fire'], color: '#ff9a5a',
    manaCost: 0, cooldown: 2, useTime: 0.9,
    useCharges: { max: 1, recharge: 9 },
    baseDamage: { fire: [10, 16] },
    delivery: { type: 'projectile', speed: 560, range: 380, radius: 8 },
    effects: [
      { type: 'damage' },
      { type: 'rupture', status: 'scalded', fraction: 0.6 },
    ],
    ai: { range: 360, weight: 1, keepDistance: 220 },
  },
  // VAPOR LASH (vaporling): a hot lash out of the white — fire + a banked
  // scald at melee reach.
  vapor_lash: {
    id: 'vapor_lash', name: 'Vapor Lash', noDrop: true,
    description: "Lashes out with scalding vapor for fire damage and inflicts a stacking scald.",
    tags: ['attack', 'melee', 'fire'], color: '#e4f2f4',
    manaCost: 0, cooldown: 0.4, useTime: 0.55,
    baseDamage: { fire: [6, 10] },
    delivery: { type: 'melee', range: 52, arcDeg: 90 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 0.8, magnitude: 0.45 },
    ],
    ai: { range: 56, weight: 2 },
  },
  // BLADDER VENT (kettle_bladder — the brim): the whole bladder as a wide
  // nova of boiling water — fire, a HEAVY banked scald, and the splash
  // soaks (the follow-up banks wet). Reserved for the brim rule.
  bladder_vent: {
    id: 'bladder_vent', name: 'Bladder Vent', noDrop: true,
    description: "Bursts boiling water around the caster for fire damage, inflicting a heavy stacking scald and soaking targets hit.",
    tags: ['attack', 'fire', 'aoe'], color: '#ff9a4a',
    manaCost: 0, cooldown: 4, useTime: 0.45,
    baseDamage: { fire: [14, 22] },
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.8 },
      { type: 'status', status: 'soaked', chance: 1 },
      { type: 'knockback', strength: 140 },
    ],
    ai: { range: 120, weight: 1 },
  },
  // SPOUT HOP (spout_hopper — the geyser-step's skirmish half): the vent-
  // ride as a MAGAZINE — two hops in the pot that rebuild slowly (the rounds
  // ARE the bank; the jet legs read them). The column at take-off scalds
  // lightly; the landing is a small slam.
  spout_hop: {
    id: 'spout_hop', name: 'Spout Hop', noDrop: true,
    description: "Erupts a steam spout beneath the caster to scald nearby enemies and leap to the target location.",
    tags: ['attack', 'fire', 'aoe', 'movement'], color: '#a8d0c4',
    manaCost: 0, cooldown: 1.5, useTime: 0.4,
    useCharges: { max: 2, recharge: 7 },
    baseDamage: { fire: [5, 9] },
    delivery: { type: 'leap', range: 300, airTime: 0.42, radius: 40, vent: { columnR: 34, scale: 0.8 } },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 0.8, magnitude: 0.4 },
    ],
    ai: { range: 280, weight: 1 },
  },
  // HOPPER JAB (spout_hopper): the on-foot poke.
  hopper_jab: {
    id: 'hopper_jab', name: 'Hopper Jab', noDrop: true,
    description: "Jabs quickly with a mineral pick for physical melee damage.",
    tags: ['attack', 'melee', 'physical'], color: '#a8d0c4',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [5, 8] },
    delivery: { type: 'melee', range: 46, arcDeg: 80 },
    effects: [{ type: 'damage' }],
    ai: { range: 52, weight: 2 },
  },
  // MINERAL SLAM (terrace_warden): a heavy plated blow — physical, a short
  // stagger of a shove. The warden's color comes from YOU (tune).
  mineral_slam: {
    id: 'mineral_slam', name: 'Mineral Slam', noDrop: true,
    description: "Slams a plated claw down for physical damage and knocks enemies back.",
    tags: ['attack', 'melee', 'physical'], color: '#d8d0b8',
    manaCost: 0, cooldown: 3.5, useTime: 0.9,
    baseDamage: { physical: [12, 19] },
    delivery: { type: 'melee', range: 58, arcDeg: 100 },
    effects: [{ type: 'damage' }, { type: 'knockback', strength: 110 }],
    ai: { range: 62, weight: 2 },
  },
  // GEYSER-STEP — THE PLAYER SPIKE (her word: "actually sounds incredible
  // and I really want to see how that ends up playing out in-game"; pulled
  // forward from K2). A LEAP that RIDES A COLUMN: the wind-up (0.35s) is a
  // drawn broil under your own feet, the take-off erupts the departure
  // point (fire + a banked scald on enemies in the column — the column is
  // the smaller half), the flight rides lifted on the steam jet, and the
  // landing splashes boiling water: fire + a scald that BANKS (×1.5 on a wet
  // target). OWNER-SAFE (card 4): a player skill is not terrain — allies
  // unhurt. Movement-tagged (refuses from a saddle — the mounts law). THE
  // NO-LOCK LAW: a leap + a fire splash works anywhere; the basin's wet
  // ground is where it SHINES. Single-mode (trees are the skill-modes
  // waves'). ACQUISITION (K2, wired): the scald faces FLOOR it into their
  // own drops (data/scaldkit.ts THE GEM FLOOR — found where it is taught),
  // and the `gem_skills_scald` Vault row carries it into the account-wide
  // pool once any scald ledger stands. The dev Gems tab still lists it, as
  // it lists every skill — that lane was never the gate.
  geyser_step: {
    id: 'geyser_step', name: 'Geyser-Step',
    description: "Erupts a steam vent beneath your feet that deals fire damage and scalds nearby enemies, launching you to the target location where you land in a boiling splash that deals fire damage and inflicts a stacking scald.",
    tags: ['spell', 'fire', 'aoe', 'movement'], color: '#9fe4ea',
    manaCost: 11, cooldown: 5, useTime: 0.35,
    baseDamage: { fire: [9, 15] },
    delivery: { type: 'leap', range: 340, airTime: 0.5, radius: 84, vent: { columnR: 40, scale: 0.6 } },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.5 },
    ],
    requirements: { willpower: 14 },
    minDropLevel: 6,
    ai: { range: 320, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.04)] },
  },

  // --- THE SCALD KIT K2 — THE PLAYER PIECES (charter docs/design/
  // scald-kit.md v3 §3 the five families, §3.1 THE RUPTURE LAW, §7 the
  // roster cut: SCALD + PRESSURE + GEYSER-STEP as skills, STEAM light,
  // PRISM as supports/vestiges). Single-mode first-pass — the mode trees
  // are the skill-modes waves' (§6). THE NO-LOCK LAW binds every piece:
  // fire is everywhere, wet is everywhere water is (a river, a rainstorm,
  // a shore, a sewer channel), occlusion is universal, a bank is pure
  // mechanics, a leap is a leap — the basin is where they SHINE, never the
  // only place they work. THE MIRROR LAW holds the other way: every piece
  // here has a scald monster wearer the player met first (K1). Acquisition
  // is the ledger's (the GEM FLOOR in data/scaldkit.ts + gem_skills_scald
  // in meta/unlocks.ts). Every number a DIAL. ---------------------------

  // SCALD ① — SCALDING LASH (the family's BANK verb): a whipped arc of
  // boiling water. The scald it lays BANKS (StatusDef.bank — each
  // application adds to the standing wound up to capMul × its strongest
  // blow), and a WET target banks ×1.5, so the shore-fighter's opener is
  // to fight where the water is. NO-LOCK: a fire cone that festers is a
  // weapon in any country; the wet fold is the basin's dividend.
  scalding_lash: {
    id: 'scalding_lash', name: 'Scalding Lash',
    description: "Whips an arc of boiling water in front of you that deals fire damage and inflicts a stacking scald, dealing 50% more scald damage against wet targets.",
    tags: ['attack', 'melee', 'fire', 'aoe'], color: '#9fe4ea',
    manaCost: 6, cooldown: 0, useTime: 0.55,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'cone', range: 120, arcDeg: 75 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.5 },
    ],
    requirements: { strength: 12, willpower: 10 },
    minDropLevel: 3,
    ai: { range: 110, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // SCALD ② — KETTLE BURST (the self-enabling combo; the kettleback's
  // Shell Burst in a player's hand — THE MIRROR LAW): a ground-target nova
  // of boiling water that banks a scald AND leaves everything caught
  // SOAKED, so the NEXT scald into that crowd banks ×1.5. Cast it anywhere
  // and you have made your own shore.
  kettle_burst: {
    id: 'kettle_burst', name: 'Kettle Burst',
    description: "Bursts boiling water over the target area for fire damage, inflicting a stacking scald and soaking enemies hit for several seconds so subsequent scalds deal 50% more damage.",
    tags: ['spell', 'fire', 'aoe'], color: '#d9f7fb',
    manaCost: 12, cooldown: 3, useTime: 0.5,
    baseDamage: { fire: [10, 16] },
    delivery: { type: 'ground', radius: 96, castRange: 300 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.45 },
      { type: 'status', status: 'soaked', chance: 1 },
    ],
    requirements: { willpower: 14 },
    minDropLevel: 5,
    ai: { range: 280, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09), mod('aoeRadius', 'increased', 0.03)] },
  },

  // SCALD ③ — BOIL OVER (THE RUPTURE LAW's player payoff, charter §3.1):
  // the family's SPEND. A marked body's banked scald is consumed — the
  // share bursts NOW as fire, mitigated and credited like any blow (a
  // killing burst pays your XP) — and the splash carries the lance to the
  // crowd packed around it. Never over-consumes (the fraction clamps);
  // with no bank standing it is simply a hot lance, which is the honest
  // floor: the two-verb family asks you to bank before you spend.
  boil_over: {
    id: 'boil_over', name: 'Boil Over',
    description: "Strikes an enemy for fire damage and immediately detonates 60% of the total scald damage currently stacked on them while leaving the remaining 40% burning.",
    tags: ['spell', 'fire', 'duration'], color: '#ff9a5a',
    manaCost: 14, cooldown: 5, useTime: 0.5,
    baseDamage: { fire: [9, 14] },
    targeting: { target: 'enemy', castRange: 420 },
    delivery: { type: 'target', splash: 70 },
    effects: [
      { type: 'damage' },
      { type: 'rupture', status: 'scalded', fraction: 0.6 },
    ],
    requirements: { willpower: 16 },
    minDropLevel: 7,
    ai: { range: 400, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09)] },
  },

  // PRESSURE ① — HEAD OF STEAM (the basker's patience as a player stance;
  // card 6: NO new resource — the magazine/empower grammar IS the bank). A
  // channel that pours rounds into every PATIENT BANK you carry
  // (useCharges.still — the PRESSURE family's own temper: those banks fill
  // only while you hold ground and BLEED while you run). Stand and fill;
  // move and hiss it away. NO-LOCK: a charge bank is pure mechanics.
  head_of_steam: {
    id: 'head_of_steam', name: 'Head of Steam',
    description: "Channel while stationary to rapidly refill charges across all of your pressure-banked skills.",
    tags: ['spell', 'fire', 'channel', 'duration'], color: '#c8e8e4',
    manaCost: 4, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.7, move: 'immobile', trackAim: false },
    delivery: { type: 'self' },
    effects: [
      { type: 'restoreSkillCharges', amount: 1, scope: 'still' },
    ],
    requirements: { willpower: 12 },
    minDropLevel: 6,
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.04)] },
  },

  // PRESSURE ② — BLOWHOLE (the spend: THE VENT PRESS): the whole bank goes
  // at once and every round banked is ONE MORE COLUMN erupting under a
  // marked body (the storm's atEnemies grammar — an honest telegraph disc,
  // then the geysers). A DRY press still spits: the plain hot column is
  // always there, the storm is what your patience bought.
  blowhole: {
    id: 'blowhole', name: 'Blowhole',
    description: "Erupts geyser columns beneath enemies in the target area for fire damage and a stacking scald, consuming all banked pressure charges to add 1 extra geyser column per charge spent.",
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#8fd8d4',
    manaCost: 16, cooldown: 0, useTime: 0.6,
    useCharges: { max: 4, recharge: 4, ventAll: true, still: { bleed: 0.5 } },
    baseDamage: { fire: [11, 17] },
    delivery: {
      type: 'storm', count: 1, interval: 0.18, areaRadius: 260, hitRadius: 52,
      castRange: 340, atEnemies: true, scatter: 12, telegraph: 0.9,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.45 },
      { type: 'knockback', strength: 90 },
    ],
    requirements: { willpower: 16, strength: 10 },
    minDropLevel: 8,
    ai: { range: 320, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09)] },
  },

  // GEYSER-STEP ② — VENT HOP (the short dash beside Geyser-Step's leap):
  // the Fire Walker trail grammar with a STEAM BANK instead of burning
  // ground (DashDelivery.trailVent) — a hot white line behind you that
  // eyes STOP at (the vapor ride: ranged kin lose the lock) while shots
  // still fly through. The escape that closes the room's sightlines behind
  // it.
  vent_hop: {
    id: 'vent_hop', name: 'Vent Hop',
    description: "Leap a short distance on a jet of steam, scalding the path crossed and leaving steam clouds that block ranged line of sight.",
    tags: ['spell', 'fire', 'movement', 'instant'], color: '#c8e8e4',
    manaCost: 8, cooldown: 4, useTime: 0,
    baseDamage: { fire: [5, 9] },
    delivery: {
      type: 'dash', distance: 230, speed: 900, width: 56,
      trailVent: { bank: 'steam', radius: 62, duration: 5, spacing: 80 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1, magnitude: 0.4 },
    ],
    requirements: { dexterity: 12, willpower: 10 },
    minDropLevel: 4,
    ai: { range: 240, weight: 1 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08)] },
  },

  // STEAM — VENT VEIL (the player's plant; the vent-shaman's Steam Vent in
  // your own hand — THE MIRROR LAW. Distinct from the Cistern Crone's
  // `steam_veil`, which is a CONJURED cloud of the cloud-craft fabric:
  // this one plants the fog fabric's registered STEAM BANK, the kind that
  // truly stops eyes.) Concealment as a castable, aimed where you point.
  vent_veil: {
    id: 'vent_veil', name: 'Vent Veil',
    description: "Vents a cloud of dense steam at the target location that blocks line of sight and inflicts Fog-Veiled without blocking projectiles.",
    tags: ['spell', 'fire', 'duration', 'aoe'], color: '#eef6f8',
    manaCost: 10, cooldown: 9, useTime: 0.4,
    delivery: { type: 'ground', radius: 100, castRange: 320, noImpact: true },
    effects: [
      { type: 'vent', bank: 'steam', radius: 100, duration: 9 },
    ],
    requirements: { willpower: 12 },
    minDropLevel: 4,
    ai: { range: 260, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06), mod('aoeRadius', 'increased', 0.03)] },
  },

  // --- M3 coda: THE METRONOME LEAN (charter §8b — the cadenced kin) -------
  // THE KETTLE STAMP (the geyserkin tempo-drummer): a light stamp of the
  // beater — the drummer's ONE verb, drummed on its own count. Four in a row
  // close the Kettle Tattoo grammar (data/combos.ts) and the fourth lands
  // the vent burst; the beat pips (a tell — the honest measure) count them.
  tempo_stamp: {
    id: 'tempo_stamp', name: 'Kettle Stamp', noDrop: true,
    description: "Stamps the ground for physical damage; four stamps in a row trigger Kettle Tattoo.",
    tags: ['attack', 'melee', 'physical'], color: '#d8d0b8',
    manaCost: 0, cooldown: 0.9, useTime: 0.5,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'melee', range: 48, arcDeg: 100 },
    effects: [{ type: 'damage' }],
    ai: { range: 54, weight: 2 },
  },
  // THE TATTOO BURST — the tattoo's close (a combo payoff cast at the
  // drummer's own feet, never on its bar): the geyser's grammar in a hand —
  // a scalding column all around, fire, a burn chance, the blast throws.
  // (K2's rename: the tattoo's close was a second "Kettle Burst" in the
  // book — the player's gem holds that name; the drummer's payoff is named
  // for the measure it closes.)
  tempo_vent_burst: {
    id: 'tempo_vent_burst', name: 'Tattoo Burst', noDrop: true,
    description: "Erupt a scalding steam vent around the caster that deals fire damage, knocks enemies back, and has a 35% chance to burn.",
    tags: ['attack', 'fire', 'aoe'], color: '#eef6f8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [9, 15] },
    delivery: { type: 'nova', radius: 84 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35 },
      { type: 'knockback', strength: 150 },
    ],
  },
  // THE CRAB TICK (the clockcrab): a small pinch — two wind the spring.
  crab_tick: {
    id: 'crab_tick', name: 'Crab Tick', noDrop: true,
    description: "Snaps lightly with a claw for physical damage; three in a row prime Tick-Snap.",
    tags: ['attack', 'melee', 'physical'], color: '#c8c0a0',
    manaCost: 0, cooldown: 0.7, useTime: 0.45,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'melee', range: 40, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    ai: { range: 46, weight: 2 },
  },
  // THE CRAB SNAP — the spring let go (the tick-snap's payoff, cast at the
  // crab's own facing): a heavy cone bite that throws.
  crab_snap: {
    id: 'crab_snap', name: 'Crab Snap', noDrop: true,
    description: "Unleashes a heavy claw snap in a frontal cone that deals physical damage and knocks enemies back.",
    tags: ['attack', 'melee', 'physical'], color: '#f0d890',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [11, 17] },
    delivery: { type: 'melee', range: 56, arcDeg: 90 },
    effects: [{ type: 'damage' }, { type: 'knockback', strength: 130 }],
  },

  // --- M3: THE CISTERN CRONE's kit (data/cistern.ts; data/monsters.ts) --------
  // THE BOIL (her verb — THE BROIL LAW as a boss verb): the cistern's pool
  // turns LETHAL in a telegraphed window. A single GROUNDED storm strike
  // centred on the crone (castRange 0, no scatter) whose landing bites ONLY
  // bodies standing on `cistern_water` (StormDelivery.onGround — the dry
  // shore inside the ring is spared) after ~2s in which the water VISIBLY
  // BROILS (render/vis/boilLayer.ts draws the geyser fabric's one roil over
  // exactly the cells the landing will bite — drawn == tested). Heavy fire,
  // the scald sting (the tide the minnows frenzy on, the warmth the matrons'
  // clutches hatch on), and the water THROWS you clear. Every number a DIAL.
  cistern_boil: {
    id: 'cistern_boil', name: 'The Boil', noDrop: true,
    description: "Brings the cistern pool to a rolling boil after a brief telegraph, dealing heavy fire damage, scalding, and knocking back anyone standing in the water.",
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#bff0e6',
    manaCost: 20, cooldown: 9, useTime: 0.8,
    baseDamage: { fire: [26, 40] },
    delivery: {
      type: 'storm', count: [1, 1], interval: 0, areaRadius: 0, hitRadius: 170,
      castRange: 0, telegraph: 2.2,
      onGround: ['cistern_water'],
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1 },
      { type: 'knockback', strength: 140 },
    ],
    ai: { range: 200, weight: 4 },
  },
  // THE SCALD UNDERTOW: the wellspring naiad's lash in the basin's register
  // — a line of scalding current that seizes and REELS the catch back into
  // the pool she is rooted in. Struggle out, or fight her standing in it.
  scald_undertow: {
    id: 'scald_undertow', name: 'Scald Undertow', noDrop: true,
    description: "Fires a line of scalding current that deals fire damage to the first target hit and drags them back toward the caster.",
    tags: ['spell', 'projectile', 'fire', 'grab'], color: '#9fe0d4',
    manaCost: 9, cooldown: 8, useTime: 0.55,
    baseDamage: { fire: [7, 12] },
    delivery: { type: 'projectile', speed: 560, radius: 8, range: 320, shape: 'line' },
    effects: [
      { type: 'damage' },
      { type: 'grabSeize', grab: { verb: 'drag', breakMult: 1.1 } },
    ],
    ai: { range: 300, weight: 3, keepDistance: 140 },
  },
  // THE STEAM VEIL: she breathes a standing cloud of steam over herself and
  // her court (the conjure grammar — the cloud-craft fabric; fog-veiled:
  // detectability down while inside, the fog fabric's own word). Reads as
  // weather, not a spell: the show-don't-tell law's concealment.
  steam_veil: {
    id: 'steam_veil', name: 'Steam Veil', noDrop: true,
    description: "Breathes out a standing cloud of steam that grants Fog-Veiled to the caster and allies inside, making them harder to detect and hit.",
    tags: ['spell', 'aoe', 'duration', 'buff'], color: '#e6f0ee',
    manaCost: 16, cooldown: 14, useTime: 0.6,
    delivery: { type: 'self' },
    effects: [
      { type: 'conjure', radius: 90, duration: 7, look: '#e6f0ee', grants: [{ status: 'fogveiled', side: 'allies' }] },
    ],
    ai: { range: 360, weight: 1.5 },
  },

  // --- M2b: THE CHAR'S TEETH + THE DOWNSTREAM + FAUNA WAVE 2 (data/scald.ts) --
  // THE BURN RAIN's droplet (engine/geysers.ts GEYSER_CFG.rain — World.burnRain
  // fires it BY THE FIXTURE at a great vent's burst edge through the weather
  // strike's casterless posture; hitAll / spareDormant / spareRoofed ride as
  // zone data): a scalding splash — fire + the scalded sting. No hand ever
  // casts it (noDrop, no ai hint: it is terrain, not a spell).
  scald_rain_drop: {
    id: 'scald_rain_drop', name: 'Burn Rain', noDrop: true,
    description: "Drops splashing geyser water that deals fire damage and scalds targets standing in the open.",
    tags: ['spell', 'fire', 'aoe'], color: '#8fd8d4',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [9, 15] },
    delivery: { type: 'ground', radius: 34, castRange: 600, delay: 0.8, occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1 },
    ],
  },
  // THE CINDERWIND's falling cinder (data/scald.ts — the weather strike row:
  // a sparse sky hazard through the shared strike machinery; roofs shelter).
  cinder_fall: {
    id: 'cinder_fall', name: 'Falling Cinder', noDrop: true,
    description: "Drop a wind-borne cinder that deals fire damage in a small area with a 30% chance to burn, blocked by overhead cover.",
    tags: ['spell', 'fire', 'aoe'], color: '#ff9a4a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [6, 10] },
    delivery: { type: 'ground', radius: 44, castRange: 600, delay: 0.7, occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.3 },
    ],
  },
  // THE SHALLOWS BROOD MATRON's clutch (the formic matriarch's pod grammar):
  // egg pods laid at her feet that incubate on the clock — OR hatch EARLY the
  // moment WARMTH finds them (hatch.onScorch — the warm hatch: the burn
  // rain's landing, the runoff's wash, a column's heat, a pool's rim). Every
  // great eruption is followed by something small and hungry downstream.
  lay_brood_clutch: {
    id: 'lay_brood_clutch', name: 'Lay Brood Clutch', noDrop: true,
    description: "Places an egg clutch in the shallows (up to 3 active clutches) that hatches into 2 Scald Spawn after 28 seconds, or immediately when hit by scalding water.",
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#9fe0e8',
    manaCost: 12, cooldown: 9, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pod', look: 'device_lay_brood_clutch',
      range: 0, duration: 28, maxActive: 3, life: 40, placeRange: 90,
      hatch: { skillId: 'brood_clutch_hatch', onScorch: 1.6 },
    },
    effects: [],
    ai: { range: 220, weight: 2, keepDistance: 140 },
  },
  brood_clutch_hatch: {
    id: 'brood_clutch_hatch', name: 'The Clutch Hatches', noDrop: true,
    description: "Hatches a brood clutch into 2 fast Scald Spawn (up to a shared cap of 8) that last for up to 60 seconds.",
    tags: ['spell', 'summon', 'minion'], color: '#9fe0e8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'scald_spawn', count: 2, maxActive: 8, duration: 45 },
    effects: [],
  },
  // THE WALLOW's reach (the pool-bound tank — the demeanor shelf): a long
  // scalding sweep from the wallow. Reach, never pursuit — the fight has a
  // door, and this is the arm that reaches through it.
  wallow_reach: {
    id: 'wallow_reach', name: 'Wallow Reach', noDrop: true,
    description: "Sweep a long-reach melee blow that deals physical and fire damage with a 35% chance to scald.",
    tags: ['attack', 'melee', 'physical', 'fire'], color: '#8aa89a',
    manaCost: 0, cooldown: 0, useTime: 0.95,
    baseDamage: { physical: [9, 14], fire: [4, 7] },
    delivery: { type: 'melee', range: 118, arcDeg: 55 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'scalded', chance: 0.35 }],
    ai: { range: 124, weight: 3 },
  },

  // --- M3: THE GEYSERMAW's verbs (the great geyser den's apex — data/greatgeyser.ts,
  // engine/ventDweller.ts). The maw lives IN the heart vent and fights only in
  // its window; its kit is the country's own grammar at boss scale: THE COLUMN
  // (a live vent called up under you — the shaman's vent-call, wider, harder:
  // an honest ring, then the column and the throw) and THE SCALD SPRAY (the
  // burn rain's grammar, thrown by a body — a scatter of scalding droplets over
  // your ground, each a ring you can read). Both noDrop kit pieces; the gulp
  // (the gorge gulper's own row) is the third verb. Every number a DIAL.
  geysermaw_column: {
    id: 'geysermaw_column', name: 'Column Call', noDrop: true,
    description: "Calls up a massive column of scalding steam after a brief ring telegraph, dealing fire damage, scalding, and knocking targets back.",
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#9fe0e8',
    manaCost: 22, cooldown: 7, useTime: 1.0,
    baseDamage: { fire: [24, 36] },
    delivery: {
      type: 'storm', count: [1, 1], interval: 0, areaRadius: 900, hitRadius: 62,
      castRange: 0, atEnemies: true, scatter: 0, telegraph: 1.6,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1 },
      { type: 'knockback', strength: 300 },
    ],
    ai: { range: 880, weight: 3 },
  },
  geysermaw_spray: {
    id: 'geysermaw_spray', name: 'Scald Spray', noDrop: true,
    description: "Lob a scatter of boiling droplets across the target area, each dealing fire damage and scalding the ground where it lands.",
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#9fe0e8',
    manaCost: 26, cooldown: 9, useTime: 1.2,
    baseDamage: { fire: [10, 16] },
    delivery: {
      type: 'storm', count: [6, 9], interval: 0.12, areaRadius: 700, hitRadius: 40,
      castRange: 0, atEnemies: true, scatter: 150, telegraph: 0.9,
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'scalded', chance: 1 },
    ],
    ai: { range: 680, weight: 2 },
  },

  // --- THE MANTID SCHOOL's verbs (the Readers — enemies whose POSTURE is
  // the information; engine/tells.ts 'casting'/'feinting'/'foecast'). Five
  // stances, five noDrop kit pieces; the numbers are deliberately modest —
  // the interest is the MIND wearing them, never the stat block.
  mantis_scythe: {
    id: 'mantis_scythe', name: 'Scythe Cut', noDrop: true,
    description: "Slash in a clean frontal melee crescent after a brief windup.",
    tags: ['attack', 'melee', 'physical'], color: '#8ed060',
    manaCost: 0, cooldown: 1.2, useTime: 0.6,
    baseDamage: { physical: [11, 17] },
    delivery: { type: 'melee', range: 62, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    ai: { range: 66, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  headsman_arc: {
    id: 'headsman_arc', name: 'Headsman\'s Arc', noDrop: true,
    description: "Wind up both scythes for a wide, uninterruptible melee sweep that knocks enemies back, followed by a recovery window.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#5a8a46',
    manaCost: 0, cooldown: 4, useTime: 1.7,
    baseDamage: { physical: [34, 48] },
    delivery: { type: 'melee', range: 84, arcDeg: 110 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 120 },
    ],
    ai: { range: 74, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  barb_spit: {
    id: 'barb_spit', name: 'Barb Spit', noDrop: true,
    description: "Fire a fast chitin needle as a physical projectile.",
    tags: ['attack', 'projectile', 'physical'], color: '#b8d878',
    manaCost: 0, cooldown: 0.8, useTime: 0.45,
    baseDamage: { physical: [7, 11] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 430 },
    effects: [{ type: 'damage' }],
    ai: { range: 400, weight: 3, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  penitent_lunge: {
    id: 'penitent_lunge', name: 'Answered Prayer', noDrop: true,
    description: "Release a coiled stance into a fast, long-range melee lunge.",
    tags: ['attack', 'melee', 'physical'], color: '#6aa858',
    manaCost: 0, cooldown: 2.5, useTime: 0.3,
    baseDamage: { physical: [22, 32] },
    delivery: { type: 'melee', range: 92, arcDeg: 50 },
    effects: [{ type: 'damage' }],
    ai: { range: 88, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  bulwark_set: {
    id: 'bulwark_set', name: 'Set the Bulwark', noDrop: true,
    description: "Lock armor plates in place for 6 seconds, granting +60 armor and 50% less damage taken.",
    tags: ['buff', 'duration'], color: '#8a8068',
    manaCost: 0, cooldown: 12, useTime: 1.0,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'bulwark_set', duration: 6,
      mods: [
        mod('armor', 'flat', 60),
        mod('damageTaken', 'more', -0.5),
      ],
    }],
    ai: { range: 200, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.05)] },
  },

  // THE THRONG's kit whacks (engine/throng.ts kinds) — ordinary catalog
  // pieces, so supports, statuses and the whole hit pipeline apply while
  // a rider swings them from its seat (engine/cling.ts).
  cinder_bite: {
    id: 'cinder_bite', name: 'Cinder Bite', noDrop: true,
    description: "Deliver a close-range bite that deals fire damage.",
    tags: ['attack', 'melee', 'fire'], color: '#e08848',
    manaCost: 0, cooldown: 0, useTime: 0.85,
    baseDamage: { fire: [4, 7] },
    delivery: { type: 'melee', range: 40, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    ai: { range: 46, weight: 2 },
  },
  pale_zap: {
    id: 'pale_zap', name: 'Pale Zap', noDrop: true,
    description: "Fire a thin, slow-moving bolt of cold damage.",
    tags: ['spell', 'projectile', 'cold'], color: '#b8d8e8',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { cold: [4, 6] },
    delivery: { type: 'projectile', speed: 380, radius: 6, range: 300 },
    effects: [{ type: 'damage' }],
    ai: { range: 280, weight: 2, keepDistance: 170 },
  },
  gnat_nip: {
    id: 'gnat_nip', name: 'Gnat Nip', noDrop: true,
    description: "Deliver a small physical bite that erodes target armor.",
    tags: ['attack', 'melee', 'physical'], color: '#a8b860',
    manaCost: 0, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [4, 5] },
    delivery: { type: 'melee', range: 34, arcDeg: 60 },
    effects: [{ type: 'damage' }],
    ai: { range: 40, weight: 2 },
  },

  // The Rimebound's melee verb: every court fang carries the cold — bites
  // BUILD CHILL (the stacking ladder toward the freeze), so a pack that
  // corners you is a countdown, not just a mauling. One kit skill; the
  // whole faction's melee tier shares it (claw's grammar, winter's teeth).
  rime_fang: {
    id: 'rime_fang', name: 'Rime Fang', noDrop: true,
    description: "Bite in melee for physical and cold damage with a 50% chance to chill.",
    tags: ['attack', 'melee', 'physical', 'cold'], color: '#9fd8f0',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { physical: [4, 6], cold: [2, 4] },
    delivery: { type: 'melee', range: 42, arcDeg: 80 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.5 },
    ],
    ai: { range: 48, weight: 2 },
  },

  bone_arrow: {
    id: 'bone_arrow', name: 'Bone Arrow', noDrop: true,
    description: "Fire a jagged bone arrow that deals physical damage.",
    tags: ['attack', 'projectile', 'physical'], color: '#d8d0c0',
    manaCost: 0, cooldown: 0, useTime: 1.1,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 420, radius: 6, range: 520 },
    effects: [{ type: 'damage' }],
    ai: { range: 470, weight: 2, keepDistance: 280 },
  },

  // The Sand Sarcophate's melee verb (the rime_fang pattern — one kit skill,
  // the whole wrapped tier shares it): the linen itself reaches. Slightly
  // longer than a claw, and the grave's grip rides it — TORMENT drags the
  // feet, so a tomb line that closes ranks is a tightening noose. Cold-lane
  // = chill; tomb-lane = torment; the ladders never collide.
  entombing_lash: {
    id: 'entombing_lash', name: 'Entombing Lash', noDrop: true,
    description: "Strike in a melee arc with burial wrappings for physical and chaos damage, with a 45% chance to inflict Torment.",
    tags: ['attack', 'melee', 'physical', 'chaos'], color: '#c9a24a',
    manaCost: 0, cooldown: 0, useTime: 0.95,
    baseDamage: { physical: [4, 7], chaos: [2, 3] },
    delivery: { type: 'melee', range: 52, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'torment', chance: 0.45 },
    ],
    ai: { range: 58, weight: 2 },
  },

  // The Coilborn's melee verb (the rime_fang pattern — one kit skill, the
  // whole scaled tier shares it): the strike is a BITE, and the venom is
  // the point — poison STACKS, so a pack of serpents closing in the water
  // you can barely wade is the family thesis in one fight. Cold-lane =
  // chill; tomb-lane = torment; wet-lane = poison; the ladders never collide.
  fang_strike: {
    id: 'fang_strike', name: 'Fang Strike', noDrop: true,
    description: "Lunge forward with a venomous bite for physical and chaos damage, with a 60% chance to poison.",
    tags: ['attack', 'melee', 'physical', 'chaos'], color: '#7ec850',
    manaCost: 0, cooldown: 0, useTime: 0.85,
    baseDamage: { physical: [4, 6], chaos: [1, 3] },
    delivery: { type: 'melee', range: 46, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.6, magnitude: 0.35 },
    ],
    ai: { range: 52, weight: 2 },
  },

  // The siren-adder's verb: the SONG is a slow, wide, visible pull — dodge
  // it or be dragged back through the water the family never feels. Reuses
  // the ensnared clutch (the terrain vocabulary) so the drag reads in the
  // same language as the ground it drags you into.
  siren_song: {
    id: 'siren_song', name: 'Siren Song', noDrop: true,
    description: "Sings a slow-drifting projectile that deals chaos damage, pulls the target toward the singer, and ensnares them for 1.4 seconds.",
    tags: ['spell', 'projectile', 'chaos', 'duration'], color: '#8ae8d8',
    manaCost: 12, cooldown: 8, useTime: 0.9,
    baseDamage: { chaos: [3, 5] },
    delivery: { type: 'projectile', speed: 190, radius: 16, range: 420 },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.25 },
      { type: 'status', status: 'ensnared', chance: 1, durationOverride: 1.4 },
    ],
    ai: { range: 400, weight: 3, keepDistance: 260 },
  },

  // ================== The LORDS BELOW's war verbs ===========================
  // The Underworld War's three new verbs (everything else the lords cast is
  // the existing demon library, redistributed by banner). Each one reuses an
  // established grammar — siren_song's pull, the selective-CC statuses, the
  // exposed shred — so counterplay is learned once and read everywhere.

  // Vormaul's verb (chain_warden / marshal / the Chainfather himself): the
  // chain is a visible flight you dodge or are REELED by — the anvil doesn't
  // come to you; you go to the anvil. Torment rides the links.
  hellchain_volley: {
    id: 'hellchain_volley', name: 'Hellchain Volley', noDrop: true,
    description: "Throw a barbed chain that deals physical and chaos damage and pulls the target back to the thrower, with a 60% chance to inflict Torment.",
    tags: ['attack', 'projectile', 'physical', 'chaos'], color: '#8a94b8',
    manaCost: 10, cooldown: 7, useTime: 0.85,
    baseDamage: { physical: [5, 9], chaos: [2, 4] },
    delivery: { type: 'projectile', speed: 260, radius: 14, range: 380 },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.2 },
      { type: 'status', status: 'torment', chance: 0.6, magnitude: 0.3 },
    ],
    ai: { range: 360, weight: 3, keepDistance: 200 },
  },

  // Nyxara's verb (hushmaiden / marshal / the Hollow Hush): the toll is a
  // slow, visible bloom of QUIET — casters caught in it stand mute (the
  // selective-CC family: switch verbs or leave the hush).
  hush_toll: {
    id: 'hush_toll', name: 'Hush-Toll', noDrop: true,
    description: "Tolls a bell over the target ground that erupts after a short delay, dealing chaos damage and silencing targets hit for 2.2 seconds.",
    tags: ['spell', 'aoe', 'chaos', 'duration'], color: '#5aa0a0',
    manaCost: 14, cooldown: 9, useTime: 0.95,
    baseDamage: { chaos: [3, 6] },
    delivery: { type: 'ground', radius: 84, castRange: 340, delay: 0.7 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'silence', chance: 1, durationOverride: 2.2 },
    ],
    ai: { range: 320, weight: 3, keepDistance: 220 },
  },

  // Molochai's verb (tithe_reaper / marshal / the Tithe-King): the rake TAKES
  // — the shell is shredded off the debtor (exposed) and the wielder's leech
  // mods carry the collection. What's owed is taken; nothing bespoke drains.
  tithe_rake: {
    id: 'tithe_rake', name: 'Tithe-Rake', noDrop: true,
    description: "Sweep a hooked melee arc for physical and chaos damage, with an 80% chance to expose enemies and reduce their armor.",
    tags: ['attack', 'melee', 'physical', 'chaos'], color: '#8ab04a',
    manaCost: 0, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [6, 10], chaos: [3, 5] },
    delivery: { type: 'melee', range: 56, arcDeg: 100 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'exposed', chance: 0.8, magnitude: 0.5 },
    ],
    ai: { range: 60, weight: 2 },
  },

  // ================== THE MIXTURE LAW — identity verbs ======================
  // Eight fresh mid-tier signatures for bodies whose intent NO shipped verb
  // covers (the other fourteen gains compose from the catalog above). Every
  // one is manaCost 0 — these hang on defs with an empty pool by design, and
  // a body's tier should never have to grow a caster's reservoir to speak.
  //
  // THE LAW they obey: a signature reads DIFFERENT, never STRONGER. Each
  // trades raw bite for a rider its faction's floor language (claw /
  // heavy_strike) cannot say — reach, a root, a slow, a shove, a stagger, a
  // blind — and every damage roll here sits at or below `claw`'s effective
  // weight once its cooldown is paid.

  // The barrow's own grasp: hands come up UNDER you. A telegraphed ground
  // pull with almost no bite — the shambler is slow, and this is how a slow
  // thing arrives. Rooted, not stunned: you may still fight, only not leave.
  grave_grasp: {
    id: 'grave_grasp', name: 'Grave Grasp', noDrop: true,
    description: "Erupt grasping hands from the target ground after a brief delay, dealing physical damage with a 55% chance to root enemies for 1.1 seconds.",
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#8a8270',
    manaCost: 0, cooldown: 6, useTime: 0.9,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'ground', radius: 70, castRange: 260, delay: 0.6 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.55, durationOverride: 1.1 },
    ],
    ai: { range: 240, weight: 2 },
  },

  // Name-demand, at critter scale: the sting is WEAKER than a claw and the
  // poison is the entire point. A scorpion that only pinches is a lie.
  tail_sting: {
    id: 'tail_sting', name: 'Tail Sting', noDrop: true,
    description: "Strike quickly with a barbed tail for physical and chaos damage, with a 50% chance to poison.",
    tags: ['attack', 'melee', 'physical', 'chaos'], color: '#c8a86a',
    manaCost: 0, cooldown: 1.6, useTime: 0.7,
    baseDamage: { physical: [2, 4], chaos: [1, 2] },
    delivery: { type: 'melee', range: 40, arcDeg: 55 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'poison', chance: 0.5, magnitude: 0.25 },
    ],
    ai: { range: 44, weight: 2 },
  },

  // The choir's note made physical. Tiny damage, a BRIEF stagger — short
  // enough that a whole crested choir cannot chain it into a lock, long
  // enough to read as an interruption rather than a scratch.
  crag_peal: {
    id: 'crag_peal', name: 'Crag Peal', noDrop: true,
    description: "Release a concussive physical nova around the caster with a 30% chance to stun.",
    tags: ['spell', 'physical', 'aoe'], color: '#ffd05a',
    manaCost: 0, cooldown: 5, useTime: 0.6,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'nova', radius: 110 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 0.3, durationOverride: 0.28 },
    ],
    ai: { range: 100, weight: 2 },
  },

  // The wake trail, fired FORWARD — same amber, same `mired`, one journey's
  // worth of denial spent deliberately instead of dripped. The skirmisher's
  // whole argument is the gap; this is how it buys one back.
  sap_jet: {
    id: 'sap_jet', name: 'Sap Jet', noDrop: true,
    description: "Spray a frontal cone of sticky sap that deals physical damage with a 70% chance to mire and slow enemies.",
    tags: ['attack', 'physical', 'aoe'], color: '#d8a850',
    manaCost: 0, cooldown: 4, useTime: 0.7,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'cone', range: 150, arcDeg: 45 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'mired', chance: 0.7 },
    ],
    ai: { range: 140, weight: 2, keepDistance: 110 },
  },

  // The gel's one verb: it comes DOWN over you. Small radius, slow wind-up
  // (readable), and the payload is `smothered` — sight and aim, not health.
  engulf_slam: {
    id: 'engulf_slam', name: 'Engulf', noDrop: true,
    description: "Rear up and slam down in a physical burst around the caster, with a 60% chance to smother enemies hit.",
    tags: ['attack', 'physical', 'aoe'], color: '#7fa04e',
    manaCost: 0, cooldown: 4, useTime: 1.0,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'nova', radius: 76 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'smothered', chance: 0.6 },
    ],
    ai: { range: 70, weight: 2 },
  },

  // The herd-driver's pole: REACH and a shove, not a wound. It prods you
  // back into the pen's line of fire and never closes to claw range itself.
  goad_jab: {
    id: 'goad_jab', name: 'Goad Jab', noDrop: true,
    description: "Jab forward in a long, narrow thrust that deals physical damage and knocks the target back.",
    tags: ['attack', 'melee', 'physical'], color: '#94a850',
    manaCost: 0, cooldown: 2, useTime: 0.55,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'cone', range: 120, arcDeg: 14 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 90 },
    ],
    ai: { range: 110, weight: 3, keepDistance: 95 },
  },

  // The worm-kin sweep: a WIDE, shoving arc off the body's own length. The
  // width is the identity — you do not sidestep a coil, you leave its circle.
  coil_lash: {
    id: 'coil_lash', name: 'Coil Lash', noDrop: true,
    description: "Sweep a wide melee arc around the caster that deals physical damage and knocks enemies back.",
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#6a9a62',
    manaCost: 0, cooldown: 3, useTime: 0.85,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'melee', range: 100, arcDeg: 160 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 150, mode: 'shove' },
    ],
    ai: { range: 100, weight: 2 },
  },

  // The cavalry lesson at MONSTER scale. The shipped `bastion_thrust` is the
  // player's committed greatshield lance (21 mean every 1.2s = 17.5 sustained
  // dps — nearly triple an xp-20 body's floor language), so the lancer gets
  // its own: the REACH is the whole identity (145 vs heavy_strike's 50 — you
  // are hit from outside your own melee range), and the per-cast bite sits
  // BELOW the heavy strike it rides beside. Carries no 'movement' tag, so the
  // mount fabric lets it fire from the saddle.
  couched_lance: {
    id: 'couched_lance', name: 'Couched Lance', noDrop: true,
    description: "Thrust a lance down a long, narrow line for physical damage with a 30% chance to inflict Bleed.",
    tags: ['attack', 'melee', 'physical'], color: '#a8b8c8',
    manaCost: 0, cooldown: 3, useTime: 0.5,
    baseDamage: { physical: [12, 18] },
    delivery: { type: 'cone', range: 145, arcDeg: 14 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.4 },
    ],
    ai: { range: 130, weight: 2 },
  },

  // NAME-DEMAND, kept genuinely WEAK per the ruling. Calibrated to `pale_zap`
  // (the trash-tier ranged standard) and then cut BELOW `claw`: the shipped
  // `spark_bolt` is a component payload at 18.8 sustained dps, which is not
  // what "keep the verb weak" means. Shorter reach than a pale zap, too — a
  // tiny arc, not artillery. The globule's volatile still pops the real bolt.
  static_jolt: {
    id: 'static_jolt', name: 'Static Jolt', noDrop: true,
    description: "Fire a small, fast lightning projectile with a 15% chance to shock.",
    tags: ['spell', 'projectile', 'lightning'], color: '#c8e86a',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { lightning: [3, 6] },
    delivery: { type: 'projectile', speed: 400, radius: 5, range: 220 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.15 },
    ],
    ai: { range: 200, weight: 2, keepDistance: 140 },
  },

  // THE TOLL, and it is a toll: almost no damage, but every touch BANKS a
  // stack of faintness — and six stacks build into a swoon. A swarm body that
  // arrives in numbers should charge in numbers. (The shipped `siphon_strike`
  // was wrong twice over here: 16.7 sustained dps on an xp-12 body, and its
  // siphonOrb pays mana to a wretch whose base sheet has no mana pool at all
  // — an inert rider.)
  soul_toll: {
    id: 'soul_toll', name: 'Soul-Toll', noDrop: true,
    description: "Touch an enemy at close range for chaos damage with a 70% chance to inflict Faintness.",
    tags: ['spell', 'chaos'], color: '#7c766a',
    manaCost: 0, cooldown: 2.5, useTime: 0.8,
    baseDamage: { chaos: [3, 6] },
    delivery: { type: 'melee', range: 46, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'faintness', chance: 0.7 },
    ],
    ai: { range: 50, weight: 2 },
  },

  // A puff of spent fire. Almost no damage — the blind is the verb, and it
  // is cut to 1.6s on purpose so a whole smoulder cannot stack you dark.
  ash_smother: {
    id: 'ash_smother', name: 'Ash Smother', noDrop: true,
    description: "Release a burst of hot ash around the caster for fire damage with a 50% chance to blind for 1.6 seconds.",
    tags: ['spell', 'fire', 'aoe'], color: '#8a7a72',
    manaCost: 0, cooldown: 5, useTime: 0.5,
    baseDamage: { fire: [2, 4] },
    delivery: { type: 'nova', radius: 60 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'blind', chance: 0.5, durationOverride: 1.6 },
    ],
    ai: { range: 56, weight: 2 },
  },

  // ======================= The EMPYREAN kata ================================
  // The Aetherial's own arts — verticality, radiance, judgement — brought
  // down by whoever survives the crossing. Five distinct rhythms (the samurai
  // lesson): a dive, a ramping halo, a spoken verdict, a fan of feathers, and
  // a step out of your own silhouette. The Vigilant Host casts the same five.

  skyfall: {
    id: 'skyfall', name: 'Skyfall',
    description: "Leap untargetably over obstacles to the target location, landing in a physical and lightning shockwave that knocks enemies back with a 30% chance to shock.",
    tags: ['attack', 'melee', 'physical', 'lightning', 'aoe', 'movement'], color: '#ffe9a8',
    manaCost: 14, cooldown: 6, useTime: 0,
    baseDamage: { physical: [10, 16], lightning: [8, 14] },
    delivery: { type: 'leap', range: 380, airTime: 0.7, radius: 130 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 48 },
      { type: 'status', status: 'shock', chance: 0.3 },
    ],
    requirements: { strength: 18, dexterity: 14 },
    minDropLevel: 10,
    ai: { range: 340, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('aoeRadius', 'increased', 0.05)] },
  },

  aureole: {
    id: 'aureole', name: 'Aureole',
    description: "Release a lightning nova around yourself with a 20% chance to shock. Each cast grants 6% increased damage and 5% increased cast speed for 2.4 seconds, stacking up to 6 times.",
    tags: ['spell', 'lightning', 'aoe'], color: '#fff2c8',
    manaCost: 11, cooldown: 0, useTime: 0.6,
    baseDamage: { lightning: [9, 15] },
    selfStack: {
      mods: [mod('damage', 'increased', 0.06), mod('castSpeed', 'increased', 0.05)],
      maxStacks: 6, duration: 2.4, decay: 'peel',
    },
    delivery: { type: 'nova', radius: 140 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { intelligence: 16, willpower: 10 },
    minDropLevel: 10,
    ai: { range: 130, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('aoeRadius', 'increased', 0.04)] },
  },

  judgement_pillar: {
    id: 'judgement_pillar', name: 'Judgement Pillar',
    description: "Call down a column of white fire at the target location for 2.6 seconds that repeatedly deals fire and lightning damage with a 14% chance to ignite, and triggers a secondary buried detonation partway through.",
    tags: ['spell', 'fire', 'lightning', 'aoe', 'duration'], color: '#ffd27f',
    manaCost: 19, cooldown: 3.5, useTime: 0.75,
    baseDamage: { fire: [7, 11], lightning: [6, 10] },
    delivery: {
      type: 'ground', radius: 42, castRange: 320,
      lingerDuration: 2.6, tickInterval: 0.35,
      pulse: { delay: 1.3 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.4, magnitude: 0.5 },
    ],
    requirements: { intelligence: 22 },
    minDropLevel: 12,
    ai: { range: 300, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('effectDuration', 'increased', 0.05)] },
  },

  starcall: {
    id: 'starcall', name: 'Starcall',
    description: "Mark the ground to call down a falling star after 2 seconds, dealing fire and physical damage in an area with a 12% chance to ignite.",
    tags: ['spell', 'fire', 'physical', 'aoe', 'duration'], color: '#ffd9a0',
    manaCost: 24, cooldown: 5, useTime: 0.7,
    baseDamage: { fire: [9, 14], physical: [7, 12] },
    delivery: {
      type: 'ground', radius: 64, castRange: 380,
      lingerDuration: 0.1, tickInterval: 0.1,
      pulse: { delay: 2.0 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.5 },
    ],
    requirements: { intelligence: 24 },
    minDropLevel: 12,
    ai: { range: 340, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
    thresholds: [
      { level: 10, label: 'The longer fall', mods: [mod('aoeRadius', 'increased', 0.2)] },
      { level: 18, label: 'A heavier sky', mods: [mod('damage', 'increased', 0.25)] },
    ],
  },

  feather_volley: {
    id: 'feather_volley', name: 'Feather Volley',
    description: "Fire a tight fan of 5 razor feathers that deal physical damage with a 20% chance to inflict Bleed.",
    tags: ['attack', 'projectile', 'physical'], color: '#eef2fb',
    manaCost: 9, cooldown: 0, useTime: 0.85,
    baseDamage: { physical: [7, 12] },
    delivery: { type: 'projectile', count: 5, spreadDeg: 32, speed: 520, radius: 6, range: 480 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.2, magnitude: 0.4 },
    ],
    requirements: { dexterity: 20 },
    minDropLevel: 10,
    ai: { range: 430, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
    thresholds: [
      { level: 8, label: 'A fuller wing', mods: [mod('projectileCount', 'flat', 1)] },
      { level: 16, label: 'Both wings', mods: [mod('projectileCount', 'flat', 1)] },
    ],
  },

  cloudstep: {
    tree: BOND_STARTER_TREES.cloudstep,
    id: 'cloudstep', name: 'Cloudstep',
    description: "Glide untargetably through enemies to the target location while leaving a decoy image behind for 1.4 seconds.",
    tags: ['attack', 'physical', 'movement'], color: '#cfe0f4',
    manaCost: 10, cooldown: 4, useTime: 0,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'dash', distance: 260, speed: 1600, width: 0, phase: true, decoyDuration: 1.4 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16, willpower: 8 },
    minDropLevel: 10,
    ai: { range: 240, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('damage', 'increased', 0.08)] },
  },

  // The kata's second wing (the Host expansion): the Powers' lance, the
  // Heralds' horn, the Lampads' candle-light — all lootable, like everything
  // the enemy knows.

  radiant_lance: {
    id: 'radiant_lance', name: 'Radiant Lance',
    description: "Hurl a fast spear of light that deals physical and lightning damage and pierces up to 2 enemies, with a 15% chance to shock.",
    tags: ['attack', 'projectile', 'physical', 'lightning', 'javelin'], color: '#ffe9c8',
    manaCost: 8, cooldown: 0, useTime: 0.8,
    baseDamage: { physical: [8, 13], lightning: [5, 9] },
    delivery: { type: 'projectile', speed: 660, radius: 7, range: 560, pierce: 2 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.15 },
    ],
    requirements: { strength: 14, dexterity: 14 },
    minDropLevel: 10,
    ai: { range: 500, weight: 2, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
    thresholds: [
      { level: 10, label: 'It keeps going', mods: [mod('pierceCount', 'flat', 2)] },
    ],
  },

  trumpet_peal: {
    tree: DISCIPLINE_STARTER_TREES.trumpet_peal,
    id: 'trumpet_peal', name: 'Trumpet Peal',
    description: "Project a frontal cone of sound that deals lightning damage, knocks enemies back, and has a 35% chance to bewilder.",
    tags: ['spell', 'warcry', 'aoe', 'lightning'], color: '#f2e2b8',
    manaCost: 15, cooldown: 7, useTime: 0.6,
    baseDamage: { lightning: [7, 12] },
    delivery: { type: 'cone', range: 210, arcDeg: 55 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 44 },
      { type: 'status', status: 'bewilder', chance: 0.35 },
    ],
    requirements: { willpower: 16 },
    minDropLevel: 11,
    ai: { range: 190, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.05)] },
  },

  votive_ward: {
    id: 'votive_ward', name: 'Votive Ward',
    description: "Place a warded candle for 9 seconds that grants you and allies within its radius 6% less damage taken and heals for 3% of maximum life every 2.5 seconds.",
    tags: ['spell', 'aura', 'buff', 'aoe', 'duration', 'heal'], color: '#ffd9a0',
    manaCost: 26, cooldown: 12, useTime: 0.6,
    delivery: {
      type: 'aura', mode: 'duration', duration: 9,
      aura: {
        radius: 135,
        allyMods: [mod('damageTaken', 'more', -0.06)],
        pulse: { interval: 2.5, healAllies: { base: 'maxLife', amount: 0.03 } },
      },
    },
    effects: [],
    requirements: { willpower: 18 },
    minDropLevel: 11,
    ai: { range: 150, weight: 1.5 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.05)] },
  },

  // ==========================================================================
  // THE AUREOLE KATA — the Seraph City's deferred player family (the queued
  // chip of the aether_gloria/aether_seraphal pass): CIRCULAR JUDGEMENT that
  // CONVENES ON THE ACCUSED. Every shipped circle centers its geometry on
  // the CASTER — the orbiters' tethers, aureole's own brow-ring, Halo's
  // outward wash, the consecrated floors underfoot. This kata sends the
  // court OUT: the crown descends on a head and hunts, the colonnade
  // convenes around the aim, the hemicycle closes on its own stage. Pure
  // composition of shipped levers — no new engine machinery.
  // ==========================================================================

  gloriole: {
    id: 'gloriole', name: 'Gloriole',
    description: "Conjure a radiant ring at the target location for 5 seconds that spirals outward and homes toward nearby enemies, dealing fire and lightning damage up to once every 0.8 seconds per target with a 20% chance to shock.",
    tags: ['spell', 'fire', 'lightning', 'projectile', 'duration'], color: '#ffecb0',
    manaCost: 17, cooldown: 5, useTime: 0.55,
    baseDamage: { fire: [6, 10], lightning: [5, 9] },
    delivery: {
      type: 'projectile', speed: 28, radius: 12, range: 9999,
      duration: 5, rehit: 0.8,
      origin: 'cursor', originRange: 340,
      // UNTETHERED spiral (no orbit): the anchor is the CAST POINT, and
      // homing drifts it onto prey (advanceProjectile's stalking-anchor
      // branch) — the crown lands where aimed, then rides the nearest
      // head. The radius unwinds from 0 at spiral × speed × 0.1 ≈ 15 u/s:
      // a tight coronet early, a court-wide gloriole by the last breath.
      trajectory: { spiral: 5.2, homing: 2.2 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.2 },
    ],
    requirements: { willpower: 18, intelligence: 10 },
    minDropLevel: 11,
    ai: { range: 320, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('effectDuration', 'increased', 0.04)] },
    thresholds: [
      { level: 10, label: 'The longer reign', mods: [mod('effectDuration', 'increased', 0.25)] },
      { level: 18, label: 'A crueler crown', mods: [mod('damage', 'increased', 0.25)] },
    ],
  },

  colonnade: {
    id: 'colonnade', name: 'Colonnade',
    description: "Raise a wide open ring of 5 light columns around the target area for 6 seconds; every 1.2 seconds, a column fires an Aureate Lash projectile at an enemy inside the ring.",
    // 'totem' = the deployed-object umbrella tag (solar_orb's precedent),
    // so totem supports board the columns.
    tags: ['spell', 'fire', 'lightning', 'totem', 'duration', 'aoe'], color: '#f4e2c0',
    manaCost: 24, cooldown: 9, useTime: 0.7,
    // The columns never strike ON PLANT — this roll exists for CONSTRUCT-FX
    // readers (bone_prison's precedent: Pulsing Ramparts' beat and Violent
    // Genesis' arrival scale off the host's roll). Per-column, kept lean.
    baseDamage: { fire: [5, 8] },
    delivery: {
      type: 'construct', kind: 'pylon', look: 'device_colonnade',
      // The colonnade LAW (vs bone_prison's tight ten-bar cage): FIVE
      // columns on a WIDE ring — a court you duel across, never a wall.
      ring: { segments: 5, radius: 118 },
      range: 240, interval: 1.2, duration: 6, maxActive: 5,
      life: 30, placeRange: 340,
      castSkillId: 'aureate_lash',
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 20, intelligence: 12 },
    minDropLevel: 12,
    ai: { range: 300, weight: 1.5, keepDistance: 240 },
    // Host levels grow the COURT (the ring rides aoeScale, the session
    // rides effectDuration); the lash is minted at effectiveSkillLevel and
    // carries the family's damage growth itself.
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05), mod('effectDuration', 'increased', 0.06)] },
    thresholds: [
      { level: 14, label: 'The wider court', mods: [mod('aoeRadius', 'increased', 0.2)] },
    ],
  },

  aureate_lash: {
    id: 'aureate_lash', name: 'Aureate Lash', noDrop: true,
    description: "Fire a fast needle of lightning and fire damage from a Colonnade pillar with a 15% chance to shock.",
    tags: ['spell', 'fire', 'lightning', 'projectile'], color: '#ffe6b8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { lightning: [7, 11], fire: [3, 6] },
    delivery: { type: 'projectile', speed: 640, radius: 7, range: 300 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.15 },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  gloria: {
    id: 'gloria', name: 'Gloria',
    description: "Conjure a wide crescent of fire and lightning around the target location that sweeps inward toward its center, hitting each enemy once with a 12% chance to ignite before detonating at the center for 55% damage.",
    tags: ['spell', 'fire', 'lightning', 'aoe', 'duration'], color: '#ffe4a8',
    manaCost: 20, cooldown: 5.5, useTime: 0.65,
    baseDamage: { fire: [14, 21], lightning: [11, 17] },
    delivery: {
      type: 'ground', radius: 150, castRange: 330,
      shape: 'crescent', arcDeg: 175,
      lingerDuration: 1.15, tickInterval: 0.1,
      // THE CLOSING COURT: the hemicycle collapses onto its center over
      // the linger (quadIn — holds a beat, then the verdict falls). With
      // hitOnce the shrinking band is a moving HIT SURFACE: each seated
      // enemy is struck exactly once as the light crosses them. The
      // impact stays off (noImpact — the pass does the judging) and the
      // endBurst is the sentence spoken at the stage.
      sizeOver: { from: 1, to: 0.12, curve: 'quadIn' },
      hitOnce: true, noImpact: true,
      endBurst: { damageScale: 0.55, radiusScale: 0.3 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'burn', chance: 0.35, magnitude: 0.4 },
    ],
    requirements: { willpower: 16, intelligence: 14 },
    minDropLevel: 11,
    ai: { range: 300, weight: 2, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11), mod('aoeRadius', 'increased', 0.05)] },
  },

  // ==========================================================================
  // THE CIRRUS KATA — the HIGH AIR itself, learned from the wild sky: vapor
  // condensed to blade and body. Where the Empyrean speaks judgement and the
  // Gale lays roads, the Cirrus CHANGES WHAT YOU ARE: its signature is
  // CLOUDFORM (the 'levitation' stat — every vertical fabric reads it), a
  // breath of walking on nothing. Loot of the zephyrid kin — the fauna of
  // the open sky casts these five back at you first.
  // ==========================================================================

  updraft_burst: {
    id: 'updraft_burst', name: 'Updraft Burst',
    description: "Detonates a geyser of rising vapor at the target location after a brief delay, dealing cold and physical damage, knocking enemies back, and inflicting Winded.",
    tags: ['spell', 'cold', 'physical', 'aoe', 'duration'], color: '#cfe8f8',
    manaCost: 16, cooldown: 2.5, useTime: 0.65,
    baseDamage: { cold: [8, 13], physical: [6, 10] },
    delivery: {
      type: 'ground', radius: 55, castRange: 340,
      lingerDuration: 0.9, tickInterval: 0.9,
      pulse: { delay: 0.55 },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 52 },
      { type: 'status', status: 'winded', chance: 1 },
    ],
    requirements: { intelligence: 16, dexterity: 10 },
    minDropLevel: 9,
    ai: { range: 320, weight: 2, keepDistance: 200 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('aoeRadius', 'increased', 0.04)] },
    thresholds: [
      { level: 10, label: 'The sky inhales deeper', mods: [mod('knockback', 'increased', 0.5)] },
    ],
  },

  cirrus_veil: {
    id: 'cirrus_veil', name: 'Cirrus Veil',
    description: "Condenses your body into Cloudform for a short duration, allowing you to walk across open air and dissolving ground without falling until the effect expires.",
    tags: ['spell', 'buff', 'movement', 'duration'], color: '#dceafc',
    manaCost: 18, cooldown: 9, useTime: 0.3,
    delivery: { type: 'self' },
    effects: [{ type: 'status', status: 'cloudform', chance: 1 }],
    requirements: { intelligence: 14, willpower: 12 },
    minDropLevel: 9,
    ai: { range: 200, weight: 0.5 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.07), mod('cooldownRecovery', 'increased', 0.03)] },
    thresholds: [
      { level: 12, label: 'The condensation holds', mods: [mod('effectDuration', 'increased', 0.35)] },
    ],
  },

  skyhook: {
    id: 'skyhook', name: 'Skyhook',
    description: "Fires a fast wind projectile that deals physical and cold damage, pulls the target to your feet, and inflicts Winded.",
    tags: ['spell', 'projectile', 'physical', 'cold'], color: '#b8d8ec',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    baseDamage: { physical: [5, 9], cold: [4, 7] },
    delivery: { type: 'projectile', speed: 700, radius: 7, range: 420 },
    effects: [
      { type: 'damage' },
      { type: 'pull', stun: 0.3 },
      { type: 'status', status: 'winded', chance: 1 },
    ],
    requirements: { dexterity: 14, willpower: 10 },
    minDropLevel: 11,
    ai: { range: 380, weight: 1.5, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('projectileSpeed', 'increased', 0.04)] },
  },

  squall_bite: {
    id: 'squall_bite', name: 'Squall Bite',
    description: "Dash through the target line, dealing physical and cold damage to all enemies along your path with a 30% chance to inflict Bleed.",
    tags: ['attack', 'physical', 'cold', 'movement'], color: '#c8dcee',
    manaCost: 8, cooldown: 3, useTime: 0,
    baseDamage: { physical: [7, 11], cold: [3, 6] },
    delivery: { type: 'dash', distance: 230, speed: 1400, width: 30 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.3, magnitude: 0.4 },
    ],
    requirements: { dexterity: 18 },
    minDropLevel: 9,
    ai: { range: 210, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  static_discharge: {
    id: 'static_discharge', name: 'Static Discharge',
    description: "Release a lightning nova around yourself with a 25% chance to shock, granting a stack of 7% increased damage and 4% increased area of effect for 2.6 seconds (up to 6 stacks).",
    tags: ['spell', 'lightning', 'aoe'], color: '#e8e8a8',
    manaCost: 10, cooldown: 0, useTime: 0.55,
    baseDamage: { lightning: [8, 14] },
    selfStack: {
      mods: [mod('damage', 'increased', 0.07), mod('aoeRadius', 'increased', 0.04)],
      maxStacks: 6, duration: 2.6, decay: 'peel',
    },
    delivery: { type: 'nova', radius: 125 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.25 },
    ],
    requirements: { intelligence: 18 },
    minDropLevel: 9,
    ai: { range: 120, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  // ==========================================================================
  // THE GALE FAMILY — wind made a weapon, and made a ROAD. Loot of the
  // Driftways (the aether_drift biome): skills that shove, hasten, and —
  // the family's signature — CONJURE STANDING CLOUD (the flux fabric's
  // second half). Over the drift they bridge basins and melted causeways;
  // over solid land the same cloud STANDS AS WEATHER (the presence half:
  // drawn vapor granting its gifts to whoever keeps inside), so every
  // conjure is a bridge in one country and a domain in all the others.
  // ==========================================================================

  zephyr_step: {
    id: 'zephyr_step', name: 'Zephyr Step',
    description: "Dashes forward with the wind, leaving a trail of standing cloud for 4 seconds that bridges gaps and grants Windlane to allies, increasing their movement speed.",
    tags: ['movement'], color: '#bfe8f4',
    manaCost: 14, cooldown: 3.5, useTime: 0,
    delivery: {
      type: 'dash', distance: 260, speed: 920, width: 0,
      trailConjure: { radius: 40, duration: 4, grants: [{ status: 'windlane', side: 'allies' }] },
    },
    effects: [],
    requirements: { dexterity: 16 },
    minDropLevel: 8,
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.04)] },
    thresholds: [
      { level: 10, label: 'The sky remembers longer', mods: [mod('effectDuration', 'increased', 0.4)] },
    ],
  },

  cloudcall: {
    id: 'cloudcall', name: 'Cloudcall',
    description: "Conjures a standing cloud at the target location for 6 seconds that serves as walkable ground over gaps and grants Cloudhaven to allies inside, reducing enemy accuracy against them.",
    tags: ['spell', 'aoe', 'duration', 'buff'], color: '#cfeaff',
    manaCost: 22, cooldown: 8, useTime: 0.5,
    delivery: { type: 'ground', radius: 60, castRange: 480, occlusion: 'free' },
    effects: [
      { type: 'conjure', radius: 60, duration: 6, grants: [{ status: 'cloudhaven', side: 'allies' }] },
    ],
    requirements: { willpower: 15 },
    minDropLevel: 9,
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06), mod('aoeRadius', 'increased', 0.04)] },
    thresholds: [
      { level: 12, label: 'A wider answer', mods: [mod('aoeRadius', 'increased', 0.3)] },
    ],
  },

  gale_lash: {
    id: 'gale_lash', name: 'Gale Lash',
    description: "Crack a whip of compressed air in a frontal cone for physical damage, knocking enemies back with a 35% chance to inflict Winded.",
    tags: ['attack', 'aoe', 'physical'], color: '#dce8f4',
    manaCost: 7, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [9, 15] },
    delivery: { type: 'cone', range: 200, arcDeg: 70 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 60 },
      { type: 'status', status: 'winded', chance: 0.35 },
    ],
    requirements: { strength: 12, dexterity: 12 },
    minDropLevel: 8,
    ai: { range: 180, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
    thresholds: [
      { level: 10, label: 'The wind leans harder', mods: [mod('apply_winded', 'flat', 0.25)] },
    ],
  },

  downburst: {
    id: 'downburst', name: 'Downburst',
    description: "Call down a column of cold air at range after a brief delay, dealing cold and physical damage in a wide area, knocking enemies back, and having a 50% chance to inflict Winded.",
    tags: ['spell', 'aoe', 'cold', 'duration'], color: '#a8d4e8',
    manaCost: 24, cooldown: 6, useTime: 0.55,
    baseDamage: { cold: [14, 22], physical: [6, 10] },
    delivery: { type: 'ground', radius: 95, castRange: 460, delay: 0.9 },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
      { type: 'status', status: 'winded', chance: 0.5 },
    ],
    requirements: { willpower: 18 },
    minDropLevel: 10,
    ai: { range: 420, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('aoeRadius', 'increased', 0.04)] },
  },

  gust_burst: {
    id: 'gust_burst', name: 'Gust Burst',
    description: "Release a non-damaging ring of compressed wind around yourself that knocks all nearby enemies back with a 60% chance to inflict Winded.",
    tags: ['spell', 'warcry', 'aoe'], color: '#d8ecf8',
    manaCost: 18, cooldown: 9, useTime: 0.4,
    delivery: { type: 'nova', radius: 130 },
    effects: [
      { type: 'knockback', strength: 85 },
      { type: 'status', status: 'winded', chance: 0.6 },
    ],
    requirements: { willpower: 12 },
    minDropLevel: 9,
    ai: { range: 120, weight: 2 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  squall_dart: {
    id: 'squall_dart', name: 'Squall Dart',
    description: "Fire an erratic storm needle that weaves in flight, dealing lightning and physical damage on hit with a 12% chance to shock.",
    tags: ['spell', 'projectile', 'lightning'], color: '#bfe0f8',
    manaCost: 6, cooldown: 0, useTime: 0.55,
    baseDamage: { lightning: [7, 12], physical: [3, 5] },
    delivery: { type: 'projectile', speed: 540, radius: 6, range: 520 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'shock', chance: 0.12 },
    ],
    requirements: { willpower: 12, dexterity: 10 },
    minDropLevel: 9,
    ai: { range: 460, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('damage', 'increased', 0.11)] },
  },

  wisp_call: {
    id: 'wisp_call', name: 'Wisp Call',
    description: "Summon a cloud wisp (up to 3 active at once) that darts at and attacks nearby enemies.",
    tags: ['spell', 'summon', 'minion'], color: '#dcecf8',
    manaCost: 18, cooldown: 3, useTime: 0.7,
    delivery: { type: 'summon', monsterId: 'cirrus_fingerling', count: 1, maxActive: 3 },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { willpower: 14 },
    minDropLevel: 12,
    ai: { range: 400, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.12)] },
  },

  tailwind: {
    id: 'tailwind', name: 'Tailwind',
    description: "Grant yourself and nearby allies 14% increased movement speed, 6% increased attack speed, and 6% increased cast speed for 8 seconds.",
    tags: ['spell', 'aura', 'buff', 'aoe', 'duration'], color: '#bfe0f8',
    manaCost: 25, cooldown: 12, useTime: 0.6,
    delivery: {
      type: 'aura', mode: 'duration', duration: 8,
      aura: {
        radius: 140,
        allyMods: [
          mod('moveSpeed', 'increased', 0.14),
          mod('attackSpeed', 'increased', 0.06),
          mod('castSpeed', 'increased', 0.06),
        ],
      },
    },
    effects: [],
    requirements: { willpower: 14, dexterity: 12 },
    minDropLevel: 9,
    ai: { range: 150, weight: 1.5 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.05)] },
  },

  // ==========================================================================
  // THE CLOUDHERD CANON — clouds put to WORK. Where the Gale lays roads and
  // the Cirrus changes what you are, the Cloudherd keeps WEATHER the way
  // farmers keep stock: every skill here calls a standing cloud (the
  // conjure seam — bridge over the hungry sky, domain over honest dirt)
  // and each names a different GIFT for whoever keeps inside it. All pure
  // data on one seam: a new herd-cloud is a ConjureEffect row with its own
  // grants, never an engine edit.
  // ==========================================================================

  own_sky: {
    id: 'own_sky', name: 'Own Sky',
    description: "Summons a personal cloud underfoot for 8 seconds that creates walkable ground over gaps as you move and grants Cloudhaven to you and nearby allies.",
    tags: ['spell', 'buff', 'duration', 'aoe'], color: '#d8ecff',
    manaCost: 28, cooldown: 14, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [
      { type: 'conjure', radius: 46, duration: 8, follow: true, grants: [{ status: 'cloudhaven', side: 'allies' }] },
    ],
    requirements: { willpower: 16, intelligence: 10 },
    minDropLevel: 11,
    ai: { range: 220, weight: 0.8 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06), mod('aoeRadius', 'increased', 0.03)] },
    thresholds: [
      { level: 12, label: 'The nimbus learns your name', mods: [mod('effectDuration', 'increased', 0.35)] },
    ],
  },

  stormcradle: {
    id: 'stormcradle', name: 'Stormcradle',
    description: "Raises a thunderhead at the target location for 7 seconds that serves as walkable ground over gaps, grants Stormlaced to allies inside to add lightning damage to their hits, and inflicts Winded on enemies inside.",
    tags: ['spell', 'aoe', 'duration', 'lightning', 'buff'], color: '#e8e8c0',
    manaCost: 24, cooldown: 10, useTime: 0.55,
    delivery: { type: 'ground', radius: 70, castRange: 420, occlusion: 'free' },
    effects: [
      {
        type: 'conjure', radius: 70, duration: 7, look: '#e8e8b0',
        grants: [
          { status: 'stormlaced', side: 'allies' },
          { status: 'winded', side: 'enemies' },
        ],
      },
    ],
    requirements: { willpower: 18, intelligence: 12 },
    minDropLevel: 12,
    ai: { range: 380, weight: 1.6 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06), mod('aoeRadius', 'increased', 0.04)] },
    thresholds: [
      { level: 10, label: 'The cradle holds its charge', mods: [mod('effectDuration', 'increased', 0.3)] },
    ],
  },

  balmcloud: {
    id: 'balmcloud', name: 'Balmcloud',
    description: "Settles a silver-lined cloud over the target area for 7 seconds that grants Silverlined to allies beneath it, regenerating their life and mana while they remain inside.",
    tags: ['spell', 'aoe', 'duration', 'buff', 'heal'], color: '#e4f0fa',
    manaCost: 24, cooldown: 11, useTime: 0.5,
    delivery: { type: 'ground', radius: 64, castRange: 400, occlusion: 'free' },
    effects: [
      { type: 'conjure', radius: 64, duration: 7, look: '#e4f0fa', grants: [{ status: 'silverlined', side: 'allies' }] },
    ],
    requirements: { willpower: 17 },
    minDropLevel: 10,
    ai: { range: 200, weight: 1.2 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.07), mod('aoeRadius', 'increased', 0.04)] },
  },

  mistral_causeway: {
    id: 'mistral_causeway', name: 'Mistral Causeway',
    description: "Paves a bridge of standing cloud from your feet to the target location for 5 seconds that crosses gaps as walkable ground and grants Windlane to allies traveling along it.",
    tags: ['spell', 'aoe', 'duration', 'buff'], color: '#cfe6f8',
    manaCost: 26, cooldown: 12, useTime: 0.6,
    delivery: { type: 'ground', radius: 34, castRange: 520, occlusion: 'free' },
    effects: [
      { type: 'conjure', radius: 34, duration: 5, line: true, grants: [{ status: 'windlane', side: 'allies' }] },
    ],
    requirements: { willpower: 14, dexterity: 12 },
    minDropLevel: 10,
    ai: { range: 300, weight: 0.5 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.07), mod('aoeRadius', 'increased', 0.03)] },
    thresholds: [
      { level: 12, label: 'The road remembers', mods: [mod('effectDuration', 'increased', 0.4)] },
    ],
  },

  low_ceiling: {
    id: 'low_ceiling', name: 'Low Ceiling',
    description: "Drops a dense cloud over the target area for 6 seconds that inflicts Smothered on enemies inside, reducing their vision range and accuracy.",
    tags: ['spell', 'aoe', 'duration'], color: '#aab6cc',
    manaCost: 22, cooldown: 9, useTime: 0.55,
    delivery: { type: 'ground', radius: 66, castRange: 440, occlusion: 'free' },
    effects: [
      { type: 'conjure', radius: 66, duration: 6, look: '#9aa8c2', grants: [{ status: 'smothered', side: 'enemies' }] },
    ],
    requirements: { intelligence: 15, willpower: 12 },
    minDropLevel: 11,
    ai: { range: 400, weight: 1.8, keepDistance: 220 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06), mod('aoeRadius', 'increased', 0.04)] },
  },

  // THE ULTIMATE ARTS (data/ultimates.ts → engine/ultimates.ts): super
  // skills on super cooldowns wearing THE EYECATCH. Absorbed inside the
  // record so every catalog consumer and the capability folds below treat
  // them as ordinary rows.
  ...ULTIMATE_SKILLS,
  ...LIVING_SKILLS,
  ...REACTIVE_SKILLS,
};

// THE CONSTRUCT CAPABILITY FOLD: every construct-delivery skill IS
// 'construct'-capable by construction — the tag is derived here, once, so a
// new trap/barrier/pod def can never forget it and construct-generic
// supports (constructFx, breakableGraft) gate on one honest word. Family
// identity tags (totem/trap/mine) stay hand-authored beside it.
for (const def of Object.values(SKILLS)) {
  if (def.delivery.type === 'construct' && !def.tags.includes('construct')) {
    def.tags.push('construct');
  }
}

// THE CONJURE CAPABILITY FOLD (the construct fold's sibling): every skill
// that CALLS CLOUD — a conjure effect, or a conjuring trail on its delivery
// — IS 'conjure'-capable by construction, so a new herd-cloud can never
// forget the word and cloud-generic supports (Thunderhead, Silver Lining,
// Slow Weather) gate on it honestly. Cloudborne grantsTags the same word
// onto whatever movement skill it teaches to conjure.
for (const def of Object.values(SKILLS)) {
  const callsCloud = def.effects.some(fx => fx.type === 'conjure')
    || (def.delivery.type === 'dash' && !!def.delivery.trailConjure);
  if (callsCloud && !def.tags.includes('conjure')) def.tags.push('conjure');
}

// THE THRONG CAPABILITY FOLD (the construct fold's sibling): every anchor
// carrying a ThrongSpec IS 'throng'-capable by construction — a new gather
// skill can never forget the word, and throng-scoped supports (source
// grafts, the find levers) plus tag-filtered investment gate on it
// honestly, never socketing into a skill with no roster to grow.
for (const def of Object.values(SKILLS)) {
  if (def.throng && !def.tags.includes('throng')) def.tags.push('throng');
}

for (const def of Object.values(SKILLS)) {
  if (def.equipMods?.some(m => m.stat === 'orbOnHit_life' || m.stat === 'orbOnHit_mana')) {
    def.description += ORB_HIT_CADENCE_TEXT;
  }
}

export const SKILL_LIST: SkillDef[] = Object.values(SKILLS);
registerCompanionGrants(SKILL_LIST);

// THE GRANTED SKILL stat family (engine/skills.ts skillGrantStat — THE
// LEGEND FABRIC, docs/engine/legends.md): one registered stat per catalog
// skill, labeled with the skill's name, so a legend's "Grants Level N X"
// line validates, prints ("Grants Level 2 Firebolt") and folds like any
// other stat — the slot-graft registration's exact pattern (supports.ts
// tail). A skill that leaves the catalog leaves the family with it.
for (const def of SKILL_LIST) {
  STAT_DEFS[skillGrantStat(def.id)] = { label: `Granted Skill: ${def.name}`, base: 0, min: 0 };
}
