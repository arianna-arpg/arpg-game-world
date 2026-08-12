// ---------------------------------------------------------------------------
// THE SKILL CATALOG.
//
// Every ability in the game — player, monster, or minion — lives here as a
// plain data entry. To create a new skill: pick a delivery, attach effects,
// set tags (tags decide which stat modifiers scale it), optionally gate it
// behind attributes, and give it an `ai` hint so monsters can use it too.
// No engine changes required.
// ---------------------------------------------------------------------------

import { mod, linkMod } from '../engine/stats';
import type { SkillDef } from '../engine/skills';

export const SKILLS: Record<string, SkillDef> = {

  // ======================= Mimicry (the blue-mage lane) ====================
  // THE SLOT and its cycle payload (engine/mimic.ts — capture is the
  // fabric's business), plus the Mummers' TEACHING ARTS below the pair:
  // the troupe's own kit, noDrop like every monster art. The only way to
  // cast a teaching art is to capture it — which is the point.

  mimicry: {
    id: 'mimicry', name: 'Mimicry',
    description: 'An empty slot that learns: enemy arts that strike you are captured once their'
      + ' kind is studied to the ARTS tier of the bestiary, and the slot casts the chosen art'
      + ' back at reduced power. Shift-press to change forms.',
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
    description: 'Instantly advance the captured repertoire by one step: the next stolen art'
      + ' takes the Mimicry slot.',
    tags: ['mimic', 'instant'], color: '#c8a0e8',
    manaCost: 0, cooldown: 0.25, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'mimicSelect', step: 1 }],
    noDrop: true,
  },

  mocking_refrain: {
    id: 'mocking_refrain', name: 'Mocking Refrain',
    description: 'A shrieked nova of physical damage around the caster: 50% chance to befuddle'
      + ' everything caught. The voice is yours, wrong in every way that matters.',
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
    description: 'A whirling melee arc of physical and cold damage: 35% chance to leave victims'
      + ' vulnerable. The dance wears mirror-glass, and its cuts do not close.',
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
    description: 'A thrown projectile of chaos damage: 35% chance to leave the victim addled.'
      + ' The face it wears is briefly, horribly yours.',
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
    description: 'A sweeping cone of physical damage in front of the caster that hurls victims'
      + ' back, with a 25% chance to stun. The third act arrives whether the house is ready or'
      + ' not.',
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
    id: 'cleave', name: 'Cleave',
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
    id: 'heavy_strike', name: 'Heavy Strike',
    description: 'A crushing melee blow: 35% chance to stun, and the victim is knocked back.',
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
    description: 'Slam the earth to deal physical damage in a nova around you: 30% chance to'
      + ' stun everything caught.',
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
    description: 'The colossus marks its next footfall, and after a wind-up the marked ground'
      + ' erupts, hurling everything near the impact away. What the Bell steps on is unmade.',
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
    description: 'The carried bell RINGS: a wide nova of physical damage that stuns everything'
      + ' caught for 1.15 seconds, while the bearer sheds a third of its banked affliction'
      + ' stacks.',
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
    description: 'The colossus plants its feet through a long wind-up, then releases an immense'
      + ' nova of physical and fire damage that hurls everything away. It spares nothing:'
      + ' friend and foe alike are struck, and no wall or cover blocks the blast. Nothing near'
      + ' survives; nothing near was meant to.',
    noDrop: true,
    tags: ['spell', 'aoe', 'fire', 'physical'], color: '#9fdc6a',
    manaCost: 0, cooldown: 45, useTime: 4.6,
    baseDamage: { physical: [340, 480], fire: [280, 420] },
    delivery: { type: 'nova', radius: 2600, affects: 'all', occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 720 },
    ],
    ai: { range: 900, weight: 0.4 },
  },

  war_cry: {
    id: 'war_cry', name: 'War Cry',
    description: 'Bellow a war cry: 40% increased damage and 15% increased attack speed for 6'
      + ' seconds.',
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
    description: 'A rapid melee strike of physical damage. Each hit grants a fury charge and'
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
    id: 'whirlwind', name: 'Whirlwind',
    description: 'CHANNELED: spin with blades out for as long as the button is held, dealing'
      + ' physical damage to everything around you while you keep moving at 30% reduced speed.',
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
    description: 'CHANNELED: open a drowning current around yourself that drags nearby enemies'
      + ' inward while dealing cold and physical damage over time, with a 20% chance to chill.'
      + ' Damage ramps the longer you hold the channel, and your movement slows step by step'
      + ' until you stand still.',
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
    description: 'Kelp-wrapped hands break the ground at a target point, dragging nearby'
      + ' enemies toward the grasp and dealing cold and physical damage; 30% chance to root the'
      + ' caught for 0.9 seconds.',
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
    description: 'The caster gains 85 ward: a swell of cold light that soaks the blows that'
      + ' would land. The sea rises to stand between its regent and the argument.',
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
    description: 'A quick melee cut in front of you dealing physical and fire damage. Heat-bent'
      + ' light sets the hand a stride from where the blade lands.',
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
    description: 'Burst a ring of stinging brine shards around you, dealing physical damage to'
      + ' everything caught. The cured dead do not bleed; they shatter.',
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
      + ' shoving victims back.',
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
    description: 'Chant a verse the sun taught the sand: 20% increased fire damage and 10%'
      + ' increased cast speed for 6 seconds. The Court\'s priests teach it to their whole'
      + ' line; from the gem, it warms only you.',
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
    description: 'Fuse sand into a spear of glass mid-throw: a fast projectile dealing physical'
      + ' and fire damage, with a 35% chance to leave the victim sunscorched.',
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
    description: 'Dash forward on a wave of sand, dealing physical damage to everyone in your'
      + ' path: victims are shoved aside and have a 50% chance to be sunscorched.',
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
    description: 'Blink to a target point. For 2.5 seconds after the step, you gain 35%'
      + ' increased evasion and 30% less detectability.',
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
    description: 'Call down the noon wind in a wide nova of fire damage that sunscorches'
      + ' everything caught. The scorch stacks, and the desert keeps count.',
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
    description: 'Mark a single target with the sun\'s regard: fire damage that applies two'
      + ' sunscorch stacks at once, with a 60% chance of a third.',
    tags: ['spell', 'fire', 'duration'], color: '#ffd870',
    manaCost: 11, cooldown: 8, useTime: 0.5,
    baseDamage: { fire: [5, 8] },
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
    id: 'firebolt', name: 'Firebolt',
    description: 'Loose an orb of flame: a projectile dealing fire damage, with a 12% chance to'
      + ' set the victim burning.',
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

  flame_wave: {
    id: 'flame_wave', name: 'Flame Wave',
    description: 'Sweep a sheet of fire damage across a long cone in front of you: 16% chance'
      + ' to set victims burning.',
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
    description: 'Tear open the ground at a target point: after a short delay it erupts in fire'
      + ' damage, with a 60% chance to set victims burning.',
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
    description: 'The ground tears open at a target point and erupts after a short delay,'
      + ' dealing chaos damage with a 50% chance to torment the caught. What the war left'
      + ' beneath comes through.',
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
    description: 'Hurl a mote of undoing: a projectile of chaos damage with a 45% chance to set'
      + ' the victim unravelling.',
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
    description: 'Open a slow seam of un-place at a target point: it strikes no impact blow,'
      + ' but lingers for 4.5 seconds, seeping chaos damage into those who stand in it with a'
      + ' 35% chance to set them unravelling.',
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
    description: 'Utters a ring of 20 chaos bolts that spread outward from you; every enemy'
      + ' struck is left UNRAVELLING. The syllable the world was never meant to keep.',
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
    description: 'Cracks a burning whip in a long, shallow arc in front of you: 50% chance to'
      + ' SEAR, halving the victim\'s healing while it lasts, and 9% chance to set them'
      + ' burning.',
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
    description: 'Lobs 3–4 brimstone mortars across the target area; each bursts on impact for'
      + ' fire and physical damage, with a 12% chance to set victims alight.',
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
    description: 'Smothers an area in slow ashfall for 4.5 seconds. The ash is a FUME: victims'
      + ' must stand inside a moment before it bites, then every tick has a 40% chance to SEAR,'
      + ' halving their healing, and a 7% chance to burn.',
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
    description: 'Heaves 2–3 burning shells high across the whole field; each rings its landing'
      + ' before it falls, then bursts for fire and physical damage with a 9% chance to burn.'
      + ' The blasts spare no banner, the engine\'s own included.',
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
    description: 'Coughs a pair of blazing shells onto whoever presses the engine\'s keeper;'
      + ' each marks its landing an instant before impact, bursting for fire and physical'
      + ' damage with a 7% chance to burn.',
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
    description: 'Plants a squat iron engine, up to 2 at once, that lobs blazing shells at foes'
      + ' pressing you, firing on its own clock. It never needs to SEE its targets; it only'
      + ' needs you to keep fighting. Scales with your minion stats.',
    tags: ['spell', 'summon', 'minion', 'fire'], color: '#d8703a',
    manaCost: 30, cooldown: 4, useTime: 1,
    delivery: { type: 'summon', monsterId: 'hellbore_engine', count: 1, maxActive: 2 },
    effects: [],
    requirements: { intelligence: 16, strength: 12 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.12)] },
  },

  levinshot_volley: {
    id: 'levinshot_volley', name: 'Levinshot Volley',
    description: 'Casts 2–3 brands of levin high across the whole field; each rings its landing'
      + ' before the bolt comes down, bursting for lightning damage with a 35% chance to shock.'
      + ' The sky spares no banner, the caller\'s own included.',
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
    description: 'CURSE the target area: every enemy inside is marked with DOOM, a six-second'
      + ' charge that bursts early the moment it covers what life remains. Each also has a 60%'
      + ' chance to have TORMENT drag at their feet.',
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
    description: 'Rips one deep, ragged melee wound: 60% chance to open a HEMORRHAGE, a long'
      + ' slow bleed that POPS a share of whatever it is still owed when reopened.',
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
    description: 'Tears a whelp-gate in the air; each cast drags one lesser demon through, an'
      + ' ash-whelp 65% of the time and a true imp the other 35%. Up to 5 may serve at once.',
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
    description: 'Fires a shard of ice at the target: cold damage on the hit and a 70% chance'
      + ' to CHILL whatever it strikes.',
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
    id: 'frost_nova', name: 'Frost Nova',
    description: 'Rime bursts outward in a nova around you, dealing cold damage and CHILLING'
      + ' everything it catches.',
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
    description: 'Releases a fan of 2–4 erratic sparks, each dealing lightning damage with a'
      + ' 25% chance to SHOCK. At level 12 each spark chains once.',
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
    description: 'One erratic spark with a 15% chance to SHOCK. A component payload: riders,'
      + ' emitters and constructs fling these.',
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

  // FULMINATE — the high-roller's signature bolt: dice a chasm wide, and
  // BOTH jackpot procs innate at chance 1 — the top 15% of rolls DETONATE
  // (Short Circuit), the top 12% ARC (Overload Arc), the very peak does
  // both at once. damageSpread, luckyChance and highRollWindow investment
  // turn the slot machine into a rigged one.
  fulminate: {
    id: 'fulminate', name: 'Fulminate',
    description: 'Hurls an unstable bolt whose damage rolls across an enormous range. Rolls'
      + ' near the top of the dice SHORT-CIRCUIT: they detonate, arc to nearby enemies, or both'
      + ' at once. Any hit has a 25% chance to SHOCK.',
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
    id: 'storm_call', name: 'Storm Call',
    description: 'Calls a bolt of lightning down on the target point after a short delay, with'
      + ' a 60% chance to SHOCK everything caught in the strike.',
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
    description: 'After a brief delay a crystal slams into the target point, dealing physical'
      + ' and cold damage in the impact with a 45% chance to CHILL.',
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
    description: 'Flame bursts in a nova around you with an 11% chance to set victims burning.'
      + ' Each enemy caught has a 35% chance to ERUPT in kind after a beat, and eruptions beget'
      + ' eruptions, each half as likely as the last.',
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
    description: 'Looses a heavy ember; wherever its flight ends, on a struck body or at the'
      + ' limit of its reach, a Pyre Nova blooms there at 90% strength, contagion and all. The'
      + ' hit itself has a 9% chance to burn.',
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
    description: 'Marks the target ground; after a wind-up a blazing rock plummets through a'
      + ' rift in the sky and erupts, dealing fire damage with an 18% chance to set victims'
      + ' burning. Walls are no shelter from above.',
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
    description: 'Spits a bolt of virulent toxin at the target: an 80% chance to POISON with'
      + ' every hit, and poisons stack.',
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
    description: 'Sweeps a wide, workmanlike cut across a broad cone in front of you, with a'
      + ' 35% chance to open a bleed. Brush, vines and whatever hides in them all part the same'
      + ' way.',
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
    description: 'A whisper-quiet dart that barely wounds: slight physical damage, but an 85%'
      + ' chance to apply a strong POISON.',
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
    description: 'Casts a living creeper in a straight line and REELS the catch to your feet: a'
      + ' brief stun on the drag, then ROOTED where it lands. Close enough to answer for'
      + ' itself.',
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
    description: 'Seeds a drifting spore cloud over the target area for 4 seconds. Victims must'
      + ' breathe it a moment before it takes hold; then each tick deals chaos damage with a'
      + ' 50% chance to POISON.',
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
    description: 'Leap at the target, airborne and untouchable in flight; the landing rakes'
      + ' everything around the impact for physical damage with a 50% chance to open a bleed.',
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
    description: 'Strikes in a line and drags the victim in: a brief stun on the pull, ROOTED'
      + ' at the maw, and a 50% chance to be POISONED in the squeeze. It takes its time'
      + ' deciding which end of you is food.',
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
    description: 'Puffs a fan of 5 darts, each with a 60% chance to POISON. Five breaths in'
      + ' one, from the treeline.',
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
    id: 'poison_nova', name: 'Poison Nova',
    description: 'Exhales a ring of 24 slow venom bolts; every enemy struck is left with a'
      + ' strong POISON lasting 11 seconds. The ring settles a little differently with every'
      + ' breath.',
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
    description: 'CHANNELED: while held, sparks are planted beneath your enemies, loosely,'
      + ' where the storm decides, and you move at half speed. On release every spark detonates'
      + ' in the order it was laid, each with a 20% chance to SHOCK.',
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
    description: 'Mends one ally at range, or yourself if no ally is near: +6 life regeneration'
      + ' for 8 seconds. Quiet, portable, and it stacks with everything.',
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
    id: 'shield_charge', name: 'Shield Charge',
    description: 'Raises the shield and charges: everything in your corridor is battered aside,'
      + ' with a 35% chance to stun each body struck.',
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
    description: 'Brace a consecrated guard for as long as you hold it: it blocks across a wide'
      + ' frontal arc while you creep forward, and allies near you mend steadily. The wall that'
      + ' keeps the line alive.',
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
    description: 'A ring of light races outward from you, striking each enemy once as it passes'
      + ' and mending every ally it washes over, though never the caster. At its widest breath'
      + ' it is gone.',
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
    description: 'Summons a small winged mender for 30 seconds; it flits to the wounded and'
      + ' closes what it can. Only one cherub serves at a time.',
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
    description: 'A sung dart of lightning and fire loosed at range. It is the CALL half of a'
      + ' liturgy: answer it with a different song, Antiphon, and the Responsory closes the'
      + ' measure.',
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
    description: 'The RESPONSE: a burst of fire and lightning around you. Equipping it TEACHES'
      + ' the liturgy: sing two different songs back-to-back and the Responsory answers with a'
      + ' radiant burst that harms enemies and mends allies nearby.',
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
    description: 'Call down a lampad chorister for 40 seconds: a candle-borne warden whose'
      + ' votive flame shields and mends allies who fight inside it. Where the cherub carries'
      + ' the wounded, the lampad carries the LINE.',
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
    description: 'Target a corpse and call it back to its feet as a risen zombie; up to 5 may'
      + ' serve at once. The grave shamans will not stop until the bodies are spent, or they'
      + ' are.',
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
    description: 'An instant snap of chaos damage in a nova around you: the beat that'
      + ' pulse-cadence effects fire on their own clock.',
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
    description: 'Pass sentence on a single foe: fire damage, and 3 seconds of SILENCE in which'
      + ' the victim can cast no spells.',
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
    description: 'Press both palms to an ally\'s wounds: an instant heal that restores 40% of'
      + ' their maximum life on top of a base amount. With no ally in reach, the healing falls'
      + ' on you.',
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
    description: 'Anoint an ally or minion, or yourself: for 12 seconds, their next 3 landed'
      + ' blows each carry added physical damage.',
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
    description: 'A consecrated melee arc of physical and fire damage that feeds on the press:'
      + ' 5% more damage per point of nearby crowd power (bosses count for many), and each'
      + ' point grants a stack of 2% increased attack speed for 6 seconds, up to 10 stacks.',
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
    description: 'For 10 seconds, 12% of the damage you deal flows to allies near you as'
      + ' healing. The congregation drinks from your wrath.',
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
    description: 'Hurl a lance of dawnlight: a fire projectile that pierces one enemy, and 8%'
      + ' of the damage it deals mends allies near you.',
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
    description: 'Bond your light to an ally for 18 seconds: 20% of the damage you deal heals'
      + ' them, and they take 10% increased healing while the bond holds. One bond at a time;'
      + ' skills like Ruin feed it at triple share.',
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
    id: 'ruin', name: 'Ruin',
    description: 'A bolt of consuming twilight: a chaos projectile that feeds your Guardian'
      + ' Bond at triple the usual share. Ruin for them, renewal for yours.',
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
    description: 'CHANNELED: hold the note to mend allies around you every 0.7 seconds for 1.5%'
      + ' of their maximum life plus a small base heal, while you move at 40% of your usual'
      + ' speed. Channel supports and channel-fed charges ride the held hymn.',
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
    id: 'zanshin_cut', name: 'Zanshin Cut',
    description: 'A disciplined melee slash. Every third cut settles the mind: your next melee'
      + ' blow within 8 seconds opens a guaranteed bleed at 2.5 times normal strength.',
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
    id: 'iai_strike', name: 'Iai Strike',
    description: 'A timed draw: press the button as the indicator peaks and the stroke lands'
      + ' 150% harder. The cut is a phasing dash through everything in its corridor, dealing'
      + ' physical damage and DISARMING whatever it touches. Sheathe, read, vanish.',
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
    description: 'Call a bloated plague-priest to serve for 20 seconds. His meta-action, Endow,'
      + ' anoints all your minions: their next 3 landed blows each apply a heavy poison.',
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
    description: 'Every minion you command is anointed: for 12 seconds, their next 3 landed'
      + ' blows each apply poison at 2.5 times normal strength.',
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
    description: 'Spend your banked Verdict charges, 3 required and earned by actual uses of'
      + ' the hosting skill, to loose a free consecrated nova of fire around you.',
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
    description: 'A dart of pale spirit-stuff: a cold projectile with a 15% chance to chill.'
      + ' Phantasms throw these; so could you, in theory.',
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
    description: 'Conjure a miasma at the target point that lingers for 4 seconds. It has no'
      + ' impact hit: the fumes deal chaos damage only once a victim has breathed them for a'
      + ' moment, with a 35% chance to poison on each tick, and stepping out clears the lungs.',
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
    description: 'Where the tree stood, a squall of fractured stone lingers for 2.2 seconds,'
      + ' cutting whatever stays inside with physical damage every beat. Chips and splinters,'
      + ' still falling.',
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#9a948a',
    manaCost: 0, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'ground', radius: 54, castRange: 200, lingerDuration: 2.2, tickInterval: 0.4, noImpact: true },
    effects: [{ type: 'damage' }],
  },

  // ======================= Summoning =======================================

  summon_skeleton: {
    id: 'summon_skeleton', name: 'Summon Skeleton Warrior',
    description: 'Raise a skeletal warrior to fight beside you; up to 4 may serve at once, and'
      + ' their strength scales with your minion stats. The slot\'s meta-action, Attack!,'
      + ' orders an assault on your mark.',
    tags: ['spell', 'summon', 'minion'], color: '#cfc8b8',
    manaCost: 22, cooldown: 1.5, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'skeleton_warrior', count: 1, maxActive: 4 },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { wisdom: 14, willpower: 10 },
    ai: { range: 400, weight: 2, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },
  
  summon_skeleton_archer: {
    id: 'summon_skeleton_archer', name: 'Summon Skeleton Archer',
    description: 'Call up a skeletal archer to shoot for you; up to 2 may serve at once, and'
      + ' their strength scales with your minion stats.',
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
    description: 'Bind a sprite of living flame that casts Fireball at your enemies; up to 2'
      + ' may serve at once. Your minions cast through the same skill system you do.',
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
    description: 'Rain 4–6 meteors one after another across a target area, each dealing fire'
      + ' damage in its blast with a 14% chance to burn. The meteors fall without regard for'
      + ' walls or sight lines.',
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
    id: 'raise_dead', name: 'Raise Dead',
    description: 'Drag a servant from the grave: a skeleton warrior or a zombie, an even chance'
      + ' of either, up to 5 raised at once. The slot\'s meta-action, Attack!, orders an'
      + ' assault on your mark.',
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
    description: 'Sprout a fungal sporeling to fight for you; up to 6 may bloom at once. The'
      + ' mat answers its tender.',
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
    description: 'TOGGLE a binding contract: mana is reserved per golem slot and stays locked'
      + ' while the contract holds, even while a golem lies in rubble awaiting its 8 second'
      + ' reassembly. Recast to dismiss and reclaim the reserve.',
    tags: ['spell', 'summon', 'minion', 'persistent'], color: '#a8a090',
    manaCost: 15, cooldown: 4, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'stone_golem',
      count: 1, maxActive: 1,
      persistent: { reserve: 35, respawnTime: 8, toggle: true },
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // Duration minion that can be neither hit nor harmed: pure lifespan trade.
  conjure_wisp: {
    id: 'conjure_wisp', name: 'Conjure Wisp',
    description: 'Call a spirit wisp that hurls frost at your enemies for 12 seconds; up to 2'
      + ' may drift at once. Enemies cannot harm or even target it.',
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
    description: 'A ring of lightning that damages only along its OUTER EDGE, with a 50% chance'
      + ' to shock; the eye of the storm is safe.',
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
    description: 'A precise sweeping cut that connects only at the very TIP of its arc: enemies'
      + ' too close are passed over. Landed cuts have a 35% chance to open a bleed.',
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
    id: 'wild_strike', name: 'Wild Strike',
    description: 'CHANNELED: rapier slivers lash out at random bearings across a wide arc for'
      + ' as long as the button is held, each with a 20% chance to nick a bleed, while you keep'
      + ' moving at 70% of your usual speed. Chaos, with footwork.',
    tags: ['attack', 'melee', 'physical', 'channel'], color: '#6ab8d8',
    manaCost: 3, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.2, move: 'slowed', moveFactor: 0.7, trackAim: true },
    // The random SECTOR is a lever set: forward-biased 90° here (reined in
    // from 240 — the flurry stays a fighter, not a sprinkler). Data or
    // supports move it: Wild Abandon rounds it toward a full circle,
    // Measured Blade focuses it, offsetDeg can lock it aside or behind.
    aim: { random: { offsetDeg: 0, spreadDeg: 90 } },
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'cone', range: 150, arcDeg: 12 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.2, magnitude: 0.25 },
    ],
    requirements: { dexterity: 16 },
    ai: { range: 130, weight: 2 },
  },

  buckler_strike: {
    id: 'buckler_strike', name: 'Buckler Strike',
    description: 'The swashbuckler\'s double cut: a sweeping strike to one flank, a beat, then the answering cut to the other. Multistrike repeats the whole figure.',
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
    id: 'essence_drain', name: 'Essence Drain',
    description: 'A sluggish bolt of withering chaos: a feeble hit, but it always applies decay'
      + ' at 1.6 times normal strength, rotting its victim long after the impact.',
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
    description: 'Infect the target area with creeping rot, dealing chaos damage and afflicting'
      + ' everything caught with CONTAGION. When an afflicted enemy dies, the rot leaps to its'
      + ' nearby allies, and it keeps leaping with every death.',
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
    description: 'Draw long and steady, with a golden window at the end of the cast bar: press'
      + ' again inside the window and the shot fires empowered. The arrow pierces through every'
      + ' enemy in its path.',
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
    description: 'Pale and unhurried, a mote of chaos drifts after its mark, homing loosely and'
      + ' wavering as it flies, with far more reach than speed. Its guidance is weak; its'
      + ' patience is not.',
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
    id: 'despair', name: 'Despair',
    description: 'CURSE: enemies in the area lose 25% of all resistances for 7 seconds.',
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
    description: 'CURSE: enemies in the area lose most of their armor and a third of their evasion for 7 seconds.',
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
    description: 'CURSE: enemies in the area act 25–30% slower, attacks and casts alike; you'
      + ' can watch their cast bars stretch.',
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
    description: 'CURSE: enemies in the area have a 35% chance to fumble any attack or spell'
      + ' they begin, stunning themselves as the action collapses.',
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
    description: 'CURSE: enemies in the area lose their aim for 7 seconds; their casts scatter'
      + ' wide of the mark, and shooters that lead a running target forget where you were'
      + ' headed.',
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
    description: 'BLESSING: you and allies around you gain 45% increased detection range for 8'
      + ' seconds. Minions hunt prey they could never have noticed.',
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#d8a848',
    manaCost: 14, cooldown: 8, useTime: 0.5,
    delivery: { type: 'nova', radius: 170, affects: 'allies' },
    effects: [{ type: 'status', status: 'belligerence', chance: 1 }],
    requirements: { willpower: 12 },
    ai: { range: 200, weight: 1 },
  },

  furor: {
    id: 'furor', name: 'Furor',
    description: 'BLESSING: you and allies around you gain 20% increased movement, attack and cast speed for 8 seconds.',
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
    description: 'CHANNELED (immobile): a blizzard erupts at the target point the moment you'
      + ' press and intensifies the longer you hold, up to +150% damage. Each pulse of cold has'
      + ' a 50% chance to chill.',
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
    description: 'CHARGED: hold to gather the storm, then release to blast the target area with'
      + ' lightning. A tap fires at half strength; a full gather fires with 140% more damage'
      + ' and 50% more area, and duration modifiers extend that cap. The blast has a 45% chance'
      + ' to shock.',
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
    description: 'CHANNELED: gouts of rolling flame pour toward your aim one after another,'
      + ' each a slow wave that travels and strikes on its own, with an 11% chance to burn'
      + ' whatever it touches. Release and the flow ends, but gouts already loosed keep'
      + ' rolling; while you channel, you move at less than half speed. The Pit Lord\'s breath.',
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
    id: 'infernal_ray', name: 'Infernal Ray',
    description: 'CHANNELED (immobile, ponderous turning): a thin ray of fire that compounds'
      + ' the longer it is held, feeble at first and climbing ever faster, up to +200% damage'
      + ' and double area. Each pulse has a 9% chance to burn.',
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
    description: 'CHARGED: hold to converge light into a point before you, then release to'
      + ' loose the lance, a long piercing beam of fire. Damage scales from a quarter of base'
      + ' at a tap to 3.2 times at a full gather, and every target caught has a 14% chance to'
      + ' burn.',
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
    description: 'CHANNELED (immobile, slow turning): a wide fan of lightning that focuses the'
      + ' longer it is held. The wedge narrows toward a line while its reach and power climb,'
      + ' up to +160% damage at full focus, and each pulse has a 20% chance to shock.',
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
    description: 'Strike in a wide melee arc, dealing physical and lightning damage; each hit'
      + ' banks a STATIC charge, up to 6. On a steady 0.7-second beat, one banked charge leaps'
      + ' to the nearest enemy as a bolt dealing 55% of the hit\'s damage. Blows have a 20%'
      + ' chance to shock.',
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
    description: 'CHANNELED (slowed): a continuous stream of piercing lightning that bends'
      + ' after your cursor mid-flight; sweep the beam across the field like a lash. Each bolt'
      + ' pierces everything it meets and has a 10% chance to shock.',
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
    description: 'Flick a razor-thin line of chaos light from your fingertip: everything along'
      + ' its path is struck the instant it fires, and you keep moving at half speed through'
      + ' the cast.',
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
    description: 'CHANNELED (immobile): a stream of chaos bolts hammers toward your cursor,'
      + ' each flung with slight scatter around your aim, each piercing one enemy. Damage'
      + ' climbs the longer you hold, up to +60%.',
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
    description: 'CHANNELED: erratic fire detonations hammer the area around your cursor; every'
      + ' blast rolls its own size, lands on its own beat, and has an 11% chance to burn. The'
      + ' cooldown begins only when the channel ends. Nothing about the barrage is steady; the'
      + ' average is.',
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
    description: 'CHANNELED (immobile): meteors hammer the area around your cursor for as long'
      + ' as you hold, falling 2–3 per volley, each with a 12% chance to burn what it strikes.'
      + ' The cooldown begins when the bombardment ends, early or not.',
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
    id: 'perfect_strike', name: 'Perfect Strike',
    description: 'A slow, heavy melee blow with a golden window at the end of its cast bar:'
      + ' press again inside the window for 70% more damage. The blow also has a 30% chance to'
      + ' stun.',
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
    description: 'An indicator appears at a random point on the cast bar: press again exactly'
      + ' as the bar crosses it and the strike deals 120% more damage.',
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
    description: 'MASH: every press during the cast bar adds another melee slash, up to 15 in'
      + ' one flurry. Individually weak, collectively ruinous.',
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
    id: 'charge', name: 'Charge',
    description: 'Lower your shoulder and barrel toward the target point; once committed, you'
      + ' cannot stop until you arrive. Everything in your path takes physical damage, is'
      + ' knocked back, and has a 25% chance to be stunned.',
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
  // body the run CONNECTS with is hooked and dragged the remainder of the
  // run, shed forward at the stop. holdSec outlasts any possible remainder
  // (the run is ≤ ~1.02s), so the run's own clock — never the roll —
  // decides the release; mass law, policy tiers and the re-seize grace
  // all gate inside the fabric.
  gore_charge: {
    id: 'gore_charge', name: 'Goring Charge', noDrop: true,
    description: 'Lowered horns and a committed run: the first body the charge connects with'
      + ' is hooked and dragged along the rest of the run, flung loose where it ends.',
    tags: ['attack', 'melee', 'movement', 'physical'], color: '#d89858',
    manaCost: 7, cooldown: 4, useTime: 0,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'dash', distance: 430, speed: 420, width: 85,
      onContact: { grab: { verb: 'drag', holdSec: [1.2, 1.5] } },
    },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
      { type: 'status', status: 'stun', chance: 0.25 },
    ],
    ai: { range: 380, weight: 2, minRange: 140 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  warp: {
    id: 'warp', name: 'Warp',
    description: 'Fold space toward the target point: after a 0.9-second delay, you are simply'
      + ' there.',
    tags: ['spell', 'movement', 'duration'], color: '#a888e8',
    manaCost: 10, cooldown: 3, useTime: 0,
    delivery: { type: 'blink', range: 420, delay: 0.9 },
    effects: [],
    requirements: { intelligence: 14 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  teleport: {
    id: 'teleport', name: 'Teleport',
    description: 'Instantly relocate to the target point. The distance is long; so is the wait to do it again.',
    tags: ['spell', 'movement', 'instant'], color: '#7a9aff',
    manaCost: 18, cooldown: 8, useTime: 0,
    delivery: { type: 'blink', range: 650 },
    effects: [],
    requirements: { intelligence: 20 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  shadow_step: {
    id: 'shadow_step', name: 'Shadow Step',
    description: 'Melt into shadow and reappear directly BEHIND a targeted enemy, blade already turning.',
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
    description: 'Slip into the dark and bank 3 STEALTH charges (cap 5): enemies barely sense'
      + ' you, their backs are open to you, and your first blow from hiding lands as an AMBUSH.'
      + ' Each offensive act spends a charge; with charges left you fade back in, and the'
      + ' struck are ALERTED either way. The cast also grants 15% increased movement speed for'
      + ' 3 seconds.',
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
    id: 'cloak', name: 'Cloak',
    description: 'Wrap yourself in obscuring shadow for 8 seconds: enemies must come 65% closer'
      + ' to notice you, and you move 10% faster.',
    tags: ['movement', 'buff', 'duration'], color: '#587898',
    manaCost: 12, cooldown: 12, useTime: 0.4,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'cloak', duration: 8,
      mods: [mod('detectability', 'more', -0.65), mod('moveSpeed', 'increased', 0.1)],
    }],
    requirements: { dexterity: 14 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  invisibility: {
    id: 'invisibility', name: 'Invisibility',
    description: 'Vanish entirely for 2.5 seconds: enemies cannot see or target you, though'
      + ' stray blasts still hurt, and your next offensive act SPENDS the invisibility'
      + ' outright.',
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
    id: 'decoy', name: 'Decoy',
    description: 'Dash away, leaving a taunting mirage of yourself behind for 6 seconds.'
      + ' Enemies prefer attacking the mirage over anything else.',
    tags: ['movement', 'duration'], color: '#88b8c8',
    manaCost: 10, cooldown: 6, useTime: 0,
    delivery: { type: 'dash', distance: 240, speed: 800, width: 0, decoyDuration: 6 },
    effects: [],
    requirements: { dexterity: 12, charisma: 6 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  corpse_shift: {
    id: 'corpse_shift', name: 'Corpse Shift',
    description: 'Consume a corpse to step through death itself, emerging where it lay. (Soulwalk lets it target a living minion instead, harmlessly.)',
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
    description: 'Place a glowing pad that lasts 12 seconds: step onto it and it hurls you'
      + ' forward along its facing. Up to 2 pads may stand at once, and they cannot be'
      + ' destroyed.',
    tags: ['spell', 'movement', 'totem', 'duration'], color: '#68d8b8',
    manaCost: 9, cooldown: 1.5, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'pad',
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
    description: 'Anchor a portal at the target point, then cast again to anchor its twin: step'
      + ' into either to emerge from the other. Gates last 16 seconds and cannot be destroyed.',
    tags: ['spell', 'movement', 'totem', 'duration'], color: '#b878e8',
    manaCost: 12, cooldown: 1, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'gate',
      range: 0, duration: 16, maxActive: 2, placeRange: 520,
      invulnerable: true,
    },
    effects: [],
    requirements: { intelligence: 18 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1)] },
  },

  mark: {
    id: 'mark', name: 'Mark / Recall',
    description: 'Inscribe a rune at the target point, and the slot becomes Recall. Recall'
      + ' teleports you back to the rune from anywhere, once; then it must be marked again.',
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
    id: 'corpse_explosion', name: 'Corpse Explosion',
    description: 'Detonate a targeted corpse: fire damage in an area around it, plus 15% of the'
      + ' corpse\'s maximum life added to the blast. 11% chance to burn whatever it catches.',
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
    description: 'Drain 8% of a targeted minion\'s life to detonate chaos damage in a ring'
      + ' around it. With no minion targeted, the blast centers on you and the drain comes from'
      + ' your own life.',
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
    description: 'Usable only on a POISONED enemy: violently purge the toxin, dealing chaos'
      + ' damage and leaving a toxic cloud for 3 seconds. The cloud has a 60% chance to poison'
      + ' whatever stands in it, seeding further Expunges.',
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
    id: 'rend', name: 'Rend',
    description: 'Slash in a melee arc in front of you, dealing physical damage: 70% chance to'
      + ' leave the wound bleeding.',
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
    description: 'Open veins in a ring around you: every creature caught, yourself included,'
      + ' suffers a heavy bleed but almost no immediate harm.',
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
    id: 'eviscerate', name: 'Eviscerate',
    description: 'Usable only on a BLEEDING enemy: rip the wound open, consuming the bleed to deal ALL its remaining damage at once, plus a vicious strike.',
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
    id: 'reckoning', name: 'Reckoning',
    description: 'A heavy melee blow that consumes ALL Fury charges (built by Frenzy): 25% more'
      + ' damage per charge consumed, plus a 30% chance to stun. It swings without charges too,'
      + ' at no bonus.',
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
    description: 'Bind the spirit of a corpse into a PERMANENT allied copy of the slain'
      + ' creature; up to 2 spectres may be held. MASTER a kind in the Tracker\'s bestiary,'
      + ' then drag its page onto this gem\'s slot at the open book to ATTUNE it: the grimoire'
      + ' summons that form outright, no corpse needed, until you rebind at the book.',
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
    id: 'tame_beast', name: 'Tame Beast',
    description: 'HOLD your aim on a living beast to fill the 2.4 second claim: sure below half'
      + ' life, a 35% chance on a hale one. A tamed companion falls DOWNED, never dead. With'
      + ' the bond held this slot becomes the Whistle (call it back, revived); shift-press'
      + ' commands it to ATTACK. Unlearning breaks the bond (relearn and it returns downed,'
      + ' owed a revival); release it for good at the Tracker.',
    tags: ['spell', 'minion', 'duration', 'companion'], color: '#a8c87a',
    manaCost: 30, cooldown: 6, useTime: 0,
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
    meta: { skillId: 'command_assault', label: 'Attack!' },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12), mod('minionDamage', 'increased', 0.08)] },
  },

  // The whistle — Tame Beast's meta payload (its own long clock; refunds
  // itself when no bond answers).
  companion_whistle: {
    id: 'companion_whistle', name: 'Whistle', noDrop: true,
    description: 'The bond answers: your companion is pulled to your side, revived if downed, healed whole.',
    tags: ['spell', 'instant', 'companion'], color: '#a8c87a',
    manaCost: 0, cooldown: 45, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'whistleCompanion' }],
  },

  revive: {
    id: 'revive', name: 'Revive',
    description: 'Wrench a corpse back to its feet as an ally for 15 seconds. Up to 6 of the'
      + ' risen may walk at once.',
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
    description: 'DEVOUR a corpse where it lies: 25% of its maximum life returns to you as life'
      + ' and 12% as mana, and the meal leaves you WELL FED, regenerating life for 4 seconds. A'
      + ' wagon makes it a banquet: every body eaten feeds the same mouth.',
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
    description: 'Beckon every corpse near your mark into one tight pile. Nothing is consumed;'
      + ' the dead only walk a little, arranged as fuel for the detonation, the offering, or'
      + ' the wagon to come.',
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
    description: 'Bolt down a corpse mid-fight: the eater restores 60% of the body\'s life and'
      + ' falls into a brief frenzy, 25% increased attack speed and 20% increased move speed'
      + ' for 4 seconds.',
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
    description: 'Consume a corpse and its heat rises as a CINDER: a homing bolt that hunts'
      + ' living flesh and bursts in a small area, 9% chance to burn. A fed pile looses a'
      + ' flight, one cinder for every body eaten.',
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
    description: 'Consume a corpse at your mark and loose three hooked slivers of bone: the'
      + ' fan opens wide, then every sliver bends back to converge on the pile, each'
      + ' detonating where it closes, with a 35% chance to open a bleeding wound. Every'
      + ' extra body eaten looses one more.',
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
    description: 'Bind a golem of living flame as a persistent companion: it reserves mana'
      + ' while it stands and remakes itself 6 seconds after it falls. Cast again to dismiss'
      + ' it. Golems of all kinds share one summoning pool.',
    tags: ['spell', 'summon', 'minion', 'fire', 'persistent'], color: '#e86a3a',
    manaCost: 28, cooldown: 3, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'fire_golem', count: 1, maxActive: 1, poolGroup: 'golem',
      persistent: { reserve: 30, respawnTime: 6, toggle: true },
    },
    effects: [],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  summon_ice_golem: {
    id: 'summon_ice_golem', name: 'Summon Ice Golem',
    description: 'Bind a golem of rime and frost as a persistent companion: it reserves mana'
      + ' while it stands and remakes itself 6 seconds after it falls. Cast again to dismiss'
      + ' it. Golems of all kinds share one summoning pool.',
    tags: ['spell', 'summon', 'minion', 'cold', 'persistent'], color: '#7ac8e8',
    manaCost: 28, cooldown: 3, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'ice_golem', count: 1, maxActive: 1, poolGroup: 'golem',
      persistent: { reserve: 30, respawnTime: 6, toggle: true },
    },
    effects: [],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  summon_blood_golem: {
    id: 'summon_blood_golem', name: 'Summon Blood Golem',
    description: 'Bind a golem of clotted vitae as a persistent companion: it reserves mana'
      + ' while it stands and remakes itself 6 seconds after it falls. Cast again to dismiss'
      + ' it. Golems of all kinds share one summoning pool.',
    tags: ['spell', 'summon', 'minion', 'physical', 'persistent'], color: '#b03848',
    manaCost: 28, cooldown: 3, useTime: 1,
    delivery: {
      type: 'summon', monsterId: 'blood_golem', count: 1, maxActive: 1, poolGroup: 'golem',
      persistent: { reserve: 30, respawnTime: 6, toggle: true },
    },
    effects: [],
    requirements: { willpower: 18, strength: 12 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  // ======================= Trajectory showcases ============================

  hammer_of_judgment: {
    id: 'hammer_of_judgment', name: 'Hammer of Judgment',
    description: 'Hurl a spectral hammer that orbits you in an ever-widening spiral, striking'
      + ' everything in its path again and again: each hit has a 20% chance to stun.',
    tags: ['spell', 'projectile', 'physical', 'duration'], color: '#e8c878',
    manaCost: 15, cooldown: 2, useTime: 0.8,
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
    description: 'Loose a slow orb of ice that drifts forward, shedding a rotating cascade of'
      + ' Frostbolts as it flies; the orb itself chills whatever it touches.',
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
    description: 'Fling a spinning blade that weaves a figure-eight along its flight path,'
      + ' dealing physical and cold damage to whatever drifts into the pattern; one blade can'
      + ' cut the same target more than once.',
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
    description: 'Set a crackling orb at the target spot: every 0.7 seconds it casts Spark at'
      + ' an enemy in range, for 10 seconds. Only one may stand at a time, and it can be'
      + ' destroyed.',
    tags: ['spell', 'totem', 'lightning', 'duration'], color: '#e8e84a',
    manaCost: 14, cooldown: 3, useTime: 0.7,
    delivery: {
      type: 'construct', kind: 'pylon', castSkillId: 'spark',
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
    description: 'Plant a totem that hurls Firebolts at enemies in range for 10 seconds, until'
      + ' it expires or is destroyed. Up to 2 totems may stand at once.',
    tags: ['spell', 'totem', 'fire', 'duration'], color: '#e8824a',
    manaCost: 14, cooldown: 1, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'totem', castSkillId: 'firebolt',
      range: 420, duration: 10, maxActive: 2, life: 55, placeRange: 120,
    },
    effects: [],
    requirements: { intelligence: 14, willpower: 10 },
    ai: { range: 380, weight: 1, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('effectDuration', 'increased', 0.06)] },
  },

  ballista_sentry: {
    id: 'ballista_sentry', name: 'Ballista Sentry',
    description: 'Raise an indestructible ballista that fires Piercing Arrows for 12 seconds,'
      + ' but only straight down the lane it was placed facing: it cannot rotate. Up to 2 may'
      + ' stand at once.',
    tags: ['attack', 'totem', 'physical', 'projectile', 'duration'], color: '#c8b890',
    manaCost: 12, cooldown: 2, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'sentry', castSkillId: 'piercing_arrow',
      range: 540, duration: 12, maxActive: 2, invulnerable: true, placeRange: 110,
    },
    effects: [],
    requirements: { dexterity: 14 },
    ai: { range: 480, weight: 1, keepDistance: 300 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12), mod('effectDuration', 'increased', 0.06)] },
  },

  frost_trap: {
    id: 'frost_trap', name: 'Frost Trap',
    description: 'Conceal a trap at the target spot: when an enemy steps close it erupts in a'
      + ' Frost Nova. Traps last 25 seconds; up to 3 may be armed at once.',
    tags: ['spell', 'trap', 'cold', 'aoe', 'duration', 'totem'], color: '#9ad4e8',
    manaCost: 10, cooldown: 2.5, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'trap', castSkillId: 'frost_nova',
      range: 75, duration: 25, maxActive: 3, placeRange: 380,
    },
    effects: [],
    requirements: { intelligence: 12 },
    ai: { range: 340, weight: 1, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  fire_mine: {
    id: 'fire_mine', name: 'Fire Mine',
    description: 'Lay a dormant mine at the target spot; up to 5 may wait, for 30 seconds each.'
      + ' Shift-press the slot to detonate the field, each mine erupting in an Immolation'
      + ' Blast, or bind Detonate Mines to a slot of its own.',
    tags: ['spell', 'mine', 'fire', 'aoe', 'duration', 'totem'], color: '#e8624a',
    manaCost: 8, cooldown: 0.8, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'mine', castSkillId: 'immolation_blast',
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
    description: 'Trigger all of your placed mines in rapid sequence. Supportable like any skill.',
    tags: ['spell', 'mine'], color: '#ffaa4a',
    manaCost: 4, cooldown: 0.5, useTime: 0,
    delivery: { type: 'detonate' },
    effects: [],
    requirements: { intelligence: 16 },
    ai: { range: 400, weight: 2 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  storm_pylon: {
    id: 'storm_pylon', name: 'Storm Pylon',
    description: 'Erect a pylon for 12 seconds: allies near it gain 15% increased damage, and'
      + ' every 1.2 seconds it arcs Spark at a random enemy in range. The pylon can be'
      + ' destroyed.',
    tags: ['spell', 'totem', 'lightning', 'aura', 'duration'], color: '#d8e84a',
    manaCost: 18, cooldown: 4, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pylon', castSkillId: 'spark',
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
    description: 'A fiery burst in a wide ring around you: 14% chance to burn whatever it'
      + ' catches. Also the payload of Fire Mine.',
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
    description: 'TOGGLE: burn with holy flame. The fire costs you 3.5% of your maximum life'
      + ' per second, and enemies in the ring burn for 3.5% of their maximum life per second as'
      + ' fire damage.',
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
    description: 'For 6 seconds an aura of hunger surrounds you, dealing chaos damage each'
      + ' second to enemies within your presence; all damage the aura deals returns to you as'
      + ' life.',
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
    description: 'TOGGLE: a miasma surrounds you; enemies inside move 25% slower and deal 12%'
      + ' less damage. Any that die within it have a 50% chance to rise for 15 seconds as weak'
      + ' zombies under your command, up to 6 at once.',
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
    description: 'TOGGLE: reserves 40 mana. You and allies within the radius gain +60 armor and'
      + ' take 8% less damage.',
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
    id: 'wellspring_stance', name: 'Wellspring Stance',
    description: 'TOGGLE: while held, +30 maximum poise and 25% increased poise regeneration.'
      + ' Spare mana drains steadily into poise so it refills mid-fight; the pump idles while'
      + ' poise is full and never draws your mana below 35%.',
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
    description: 'For 10 seconds, you and allies in the circle regenerate +4 life per second,'
      + ' and every 3 seconds a pulse heals 4% of maximum life.',
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
    id: 'piercing_arrow', name: 'Piercing Arrow',
    description: 'Loose an arrow that punches straight through the pack, piercing up to 3'
      + ' enemies along its flight.',
    tags: ['attack', 'projectile', 'physical'], color: '#b8d8a0',
    manaCost: 4, cooldown: 0, useTime: 0.65,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'projectile', speed: 520, radius: 6, range: 620, pierce: 3 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 16 },
    ai: { range: 560, weight: 2, keepDistance: 320 },
  },

  fan_of_blades: {
    id: 'fan_of_blades', name: 'Fan of Blades',
    description: 'Fling a fan of 5 knives in a wide arc in front of you; each blade strikes the'
      + ' first enemy in its path.',
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
    id: 'dash_strike', name: 'Dash Strike',
    description: 'Lunge toward your cursor at speed, slashing everything caught in the lane of'
      + ' the dash for physical damage.',
    tags: ['attack', 'melee', 'physical', 'movement'], color: '#6ab8d8',
    manaCost: 6, cooldown: 3, useTime: 0,
    baseDamage: { physical: [10, 15] },
    delivery: { type: 'dash', distance: 230, speed: 950, width: 70 },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 14 },
    ai: { range: 240, weight: 2 },
  },

  quickstep: {
    id: 'quickstep', name: 'Quickstep',
    description: 'Quick feet for 4 seconds: 30% increased movement speed and evasion, and 15%'
      + ' increased attack and cast speed.',
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
    id: 'stone_skin', name: 'Stone Skin',
    description: 'Harden your flesh for 6 seconds, gaining +80 armor and taking 15% less damage'
      + ' from every source.',
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
    id: 'shield_up', name: 'Shield Up',
    description: 'Raise a frontal guard with its own health: hits and projectiles from the'
      + ' facing arc break against it instead of you, while you move at 40% speed and turn'
      + ' heavily. Release to bash: a short blow with a 40% chance to stun and a knockback.',
    tags: ['guard', 'channel', 'duration'], color: '#8ab8d8',
    manaCost: 10, cooldown: 5, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 120, shieldLife: 60, moveFactor: 0.4, turnRate: 2.4,
      // (Parry comes from the Perfect Timing support now — socket it in.)
      // Release at/past the arming line (BASH_CFG.releaseFloor × the
      // bashFloor stat — the guard bar's tic) and the stance converts
      // into the bash. THE teaching guard: wall first, answer second.
      bash: { mult: 0.7, range: 60, arcDeg: 110, stunChance: 0.4, knockback: 70 },
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 14 },
    ai: { range: 240, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.18)] },
  },

  spiked_bulwark: {
    id: 'spiked_bulwark', name: 'Spiked Bulwark',
    description: 'Set a broad, spiked guard. While it holds you gain +12 thorns: every blow'
      + ' taken pays damage back to the striker. The wall has no release blow of its own; an'
      + ' Answering Wall gem can grant one.',
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
    id: 'reprisal', name: 'Reprisal',
    description: 'Usable only within 3 seconds of taking damage: a heavy answering arc in front'
      + ' of you with a 35% chance to stun, knocking the victims back.',
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
    description: 'Spends a riposte charge on a narrow, instant thrust with a 30% chance to'
      + ' inflict bleed. The answer the block bought, poked over the shield rim.',
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
    id: 'riposte', name: 'Riposte',
    description: 'For 0.6 seconds you hold a parrying stance: any frontal blow inside the'
      + ' window is negated entirely and answered at 220% of its damage. The stance spends'
      + ' itself on the counter.',
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
    id: 'challenging_shout', name: 'Challenging Shout',
    description: 'Bellow a challenge: every enemy around you is TAUNTED, turning their blades'
      + ' to you, and whatever still swings at your allies lands softer. Instant, and usable'
      + ' from behind a raised guard.',
    tags: ['warcry', 'aoe', 'duration', 'instant'], color: '#e0763a',
    manaCost: 12, cooldown: 10, useTime: 0,
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
    description: 'Every enemy in a ring around you is TAUNTED for 2.5 seconds. A component'
      + ' payload: guard skills with a pulse toll this dare on their own beat.',
    tags: ['warcry', 'aoe', 'instant'], color: '#e0763a',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 170, affects: 'enemies' },
    effects: [{ type: 'status', status: 'taunted', chance: 1, durationOverride: 2.5 }],
  },

  defiant_bulwark: {
    id: 'defiant_bulwark', name: 'Defiant Bulwark',
    description: 'Raise a broad, jeering guard: while it holds, a rolling challenge TAUNTS'
      + ' everything near you every 1.75 seconds. The wall has no blow of its own; an Answering'
      + ' Wall gem can add one.',
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
    description: 'Plant a humming stone that every nearby enemy prefers to any living target:'
      + ' they attack it while it stands. The stone has its own life and lasts 8 seconds or'
      + ' until broken; one may stand at a time.',
    tags: ['spell', 'construct', 'duration', 'totem'], color: '#a5e3b4',
    manaCost: 26, cooldown: 11, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'totem', taunt: true, aims: false,
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
    id: 'goad', name: 'Goad',
    description: 'Hurl a stone that TAUNTS the one enemy it strikes into answering you, peeling'
      + ' it from its pack without waking the rest. The hit generates double threat.',
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
    id: 'quiet_step', name: 'Quiet Step',
    description: 'Soften your presence for 5 seconds: your blows generate 75% less threat, and'
      + ' 30% reduced detectability makes you harder to pick out of the fight.',
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
    id: 'marching_bulwark', name: 'Marching Bulwark',
    description: 'Advance behind a narrow tower guard: you keep three-quarters of your movement'
      + ' speed while it holds, behind thinner protection than a planted wall. Release to bash,'
      + ' with a 30% chance to stun.',
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
    description: 'Lift a rune-lit ward as a sorcerer\'s guard: modest and slow-footed, but'
      + ' spells cast while the stance holds deal 25% increased damage. Built for Guarded'
      + ' Casting and the guard-beat gems.',
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
    description: 'Brace a broad guard fed by your own footing: while the stance holds, poise'
      + ' drains steadily into the shield, rebuilding it between blows. The pump draws only'
      + ' while the wall is dented and never pulls your poise below 25%.',
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
    id: 'sunder_maul', name: 'Sunder Maul',
    description: 'A slow overhead blow built to break stances rather than bodies: it deals 150%'
      + ' more poise damage, and the SUNDERED it inflicts lasts 50% longer. Pairs with The'
      + ' Verdict, the execute that spends a broken stance.',
    tags: ['attack', 'melee', 'physical'], color: '#c8a058',
    manaCost: 9, cooldown: 3, useTime: 0.7,
    baseDamage: { physical: [14, 24] },
    innateMods: [mod('poiseDamage', 'more', 1.5), mod('sunderDuration', 'increased', 0.5)],
    delivery: { type: 'melee', range: 100, arcDeg: 90 },
    effects: [{ type: 'damage' }],
    requirements: { strength: 18 },
    ai: { range: 95, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.09), mod('poiseDamage', 'increased', 0.1)] },
  },

  verdict: {
    id: 'verdict', name: 'The Verdict',
    description: 'An execute, usable only on a SUNDERED target: the blow adds 150% of the'
      + ' victim\'s maximum poise as flat damage and knocks them back. Break the stance first,'
      + ' then pass sentence; longer Sundered duration widens the window. Enemies carry this'
      + ' verdict too.',
    tags: ['attack', 'melee', 'physical'], color: '#e84a3a',
    manaCost: 14, cooldown: 8, useTime: 0.55,
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
    description: 'A long whip-crack that ignores 60% of the target\'s insight and carries 30%'
      + ' increased accuracy. Half of all hits leave the victim REELING: insight stops'
      + ' replenishing while it lasts.',
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
    description: 'Cast a humming void-dart of chaos damage: energy shields take double damage'
      + ' from the hit, and 60% of strikes leave the shield VOIDED, unable to recharge while'
      + ' the status lasts.',
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
    description: 'Every cut grants this skill 5% increased damage and 5% increased attack'
      + ' speed, stacking up to 8 times. Pause and the stacks peel away one at a time after 2.2'
      + ' seconds; the ramp belongs to this blade alone.',
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
    description: 'CHARGED: hold to sheathe the blade, then release a wide crescent cut. Damage'
      + ' scales with the hold, from 60% up to 260% at a full 2 seconds, and the arc widens as'
      + ' it charges; 40% of hits inflict bleed.',
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
    description: 'TOGGLE AURA (reserves 35 mana): you and allies in the radius gain +40 maximum energy shield. Capacitor and Insulation supports tune the recharge for everyone covered.',
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
    description: 'Push out a wide crescent of cold that washes through everything in its path,'
      + ' piercing up to 6 enemies; 60% of those it touches are chilled.',
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
    description: 'Send a slow, wide wave of flame grinding forward through everything in its'
      + ' path; nothing it meets stops it, and 16% of enemies touched catch fire and burn.',
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
    id: 'shockfront', name: 'Shockfront',
    description: 'Launch a flat wall of force down a broad lane: the front punches through up'
      + ' to 3 enemies and knocks whatever it strikes backward.',
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
    description: 'Erupt a ring of 10 bone walls at the target point: whatever stands inside'
      + ' stays inside until the bars break or 6 seconds pass. Martyrdom and Unstable Flesh'
      + ' supports make the bars themselves explosive.',
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
      type: 'construct', kind: 'barrier', look: 'construct_barrier_bone',
      ring: { segments: 10, radius: 78 },
      range: 0, duration: 6, maxActive: 10, life: 30, placeRange: 340,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 320, weight: 1, keepDistance: 260 },
  },

  bone_cage: {
    id: 'bone_cage', name: 'Bone Cage',
    description: 'Slam a tight ring of 8 bone walls shut around a single targeted enemy,'
      + ' holding it until the bars break or 4 seconds pass.',
    tags: ['spell', 'summon', 'minion', 'physical', 'duration', 'totem'], color: '#c8bca0',
    manaCost: 16, cooldown: 6, useTime: 0.6,
    targeting: { target: 'enemy', castRange: 320 },
    // Construct-fx fodder like bone_prison (roll + damage effect for the
    // grafted pulse/burst hit pipeline): tighter ring, meaner bars.
    baseDamage: { physical: [7, 12] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_bone',
      ring: { segments: 8, radius: 50 },
      range: 0, duration: 4, maxActive: 8, life: 20, placeRange: 320,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 16 },
    ai: { range: 300, weight: 2, keepDistance: 240 },
  },

  mana_shield: {
    id: 'mana_shield', name: 'Mana Shield',
    description: 'TOGGLE: while active, 40% of incoming damage is paid from mana before life;'
      + ' upkeep drains 2 mana per second while the shield holds.',
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
    description: 'A crackling jolt grants +60 energy shield for 8 seconds. The new shield'
      + ' arrives already filled, and your recharge delay resets so energy shield begins'
      + ' recharging at once.',
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
    id: 'aegis_ward', name: 'Aegis Ward',
    description: 'Bless yourself and nearby allies: each gains a 45-point absorb shield for 8'
      + ' seconds, consumed before every other defense, and the WARDED status granting armor'
      + ' while it holds. A heal cast before the hit lands.',
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#d8e8f8',
    manaCost: 25, cooldown: 12, useTime: 0.6,
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
    id: 'stone_rampart', name: 'Stone Rampart',
    description: 'Raise a wall of three stone segments across your facing, each standing for 12'
      + ' seconds until its life is battered down. Up to 6 segments can stand at once; enemies'
      + ' must shoot it, hack through it, or go around.',
    tags: ['spell', 'guard', 'duration', 'totem'], color: '#a8a090',
    manaCost: 18, cooldown: 8, useTime: 0.6,
    // Construct-fx fodder (see bone_prison — roll + damage effect for the
    // grafted hit pipeline): stone hits harder per segment, but only three.
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'construct', kind: 'barrier',
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
    description: 'Conjure a dome of protection that stands for 6 seconds and cannot be'
      + ' destroyed: enemy projectiles crossing it dissolve into nothing. Only one dome may'
      + ' stand at a time.',
    tags: ['spell', 'guard', 'aoe', 'duration', 'totem'], color: '#9ad8c8',
    manaCost: 26, cooldown: 14, useTime: 0.7,
    delivery: {
      type: 'construct', kind: 'dome',
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
    description: 'Hurl yourself through the air, untouchable in flight and able to clear'
      + ' chasms, and land in a physical shockwave: enemies near the impact are knocked back,'
      + ' with a 25% chance to stun.',
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
    description: 'Take to the air, untouchable in flight, and land in a raking sweep of'
      + ' physical damage. The flock harries, vanishes, and returns.',
    tags: ['attack', 'physical', 'movement'], color: '#c8b090',
    manaCost: 0, cooldown: 4, useTime: 0,
    baseDamage: { physical: [4, 8] },
    delivery: { type: 'leap', range: 460, airTime: 1.35, radius: 70 },
    effects: [{ type: 'damage' }],
    noDrop: true,
    ai: { range: 420, weight: 1 },
  },

  backstab: {
    id: 'backstab', name: 'Backstab',
    description: 'A precise melee thrust that deals 150% more damage from behind the target,'
      + ' with a 35% chance to open a bleed. Pairs viciously with Shadow Step.',
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
    id: 'rallying_howl', name: 'Rallying Howl',
    description: 'BLESSING: you and every ally around you gain 25% increased damage and 15%'
      + ' increased movement speed for 6 seconds. Minions count as allies and rally with you.',
    tags: ['warcry', 'buff', 'aoe', 'duration'], color: '#e8a040',
    manaCost: 15, cooldown: 9, useTime: 0.5,
    delivery: { type: 'nova', radius: 220, affects: 'allies' },
    effects: [{ type: 'status', status: 'rally', chance: 1 }],
    requirements: { strength: 10, fortitude: 12 },
    ai: { range: 240, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('aoeRadius', 'increased', 0.06)] },
  },

  acid_spray: {
    id: 'acid_spray', name: 'Acid Spray',
    description: 'Vomit a fan of caustic bile: chaos damage in a cone, a 60% chance to poison'
      + ' everything it coats, and a 25% chance to inflict armor-eating agony.',
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
    description: 'Loose a slow, crackling orb that drifts downrange, pulsing every 0.35 seconds'
      + ' to zap everything near its path for 55% of its lightning damage. Each zap carries a'
      + ' 30% chance to shock.',
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
    description: 'Call the bolt itself: a piercing lance of lightning that passes through up to'
      + ' 2 enemies, with a 40% chance to shock. Press again inside the golden window for the'
      + ' PERFECT strike: instant, longer, and blinding.',
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
    id: 'chain_lightning', name: 'Chain Lightning',
    description: 'A bolt that leaps to the nearest unstruck enemy on every hit, chaining 3'
      + ' times innately with a 30% chance to shock each victim. Chain supports stack on top of'
      + ' the innate count.',
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
    description: 'Rip away 12% of the target\'s CURRENT life as lightning damage, with a 50%'
      + ' chance to shock. Resistances apply, and it can never kill: it softens whatever it'
      + ' touches, biting hardest at full health.',
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
    description: 'Streak forward as living lightning, dealing lightning damage along the whole'
      + ' line of the dash with a 50% chance to shock everything you pass through.',
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
    description: 'Pull the storm down on your own head: for 2.5 seconds the ground around you'
      + ' cracks with lightning every 0.3 seconds. Each pulse shoves enemies a step back rather'
      + ' than launching them, with a 25% chance to shock.',
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
    description: 'Whip up a roaring wind over a wide swath at range: for 5 seconds, gusts land'
      + ' every half second, each shoving whatever is caught inside in a random direction and'
      + ' dealing a little physical damage.',
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
    description: 'CHANNELED: hold a collapsing point of night at range while you stand rooted.'
      + ' A small disc annihilates whatever it touches with chaos damage, inside a far wider'
      + ' horizon that drags everything toward the center. The orb\'s damage and size grow the'
      + ' longer you hold, and the mana cost climbs far faster still. Ending the channel starts'
      + ' the cooldown.',
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
    description: 'Plant an indestructible beacon that stands for 6 seconds, pulsing a ring of'
      + ' lightning every 0.6 seconds that batters everything nearby away from it. Up to 2'
      + ' beacons can stand at once: ground that refuses to be stood on.',
    // 'totem' = the deployed-object umbrella tag (totem supports apply).
    tags: ['spell', 'lightning', 'aoe', 'duration', 'totem'], color: '#8ad0e0',
    manaCost: 18, cooldown: 7, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'pylon', castSkillId: 'repulse_wave',
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
    description: 'A concussive ring of lightning bursts outward from the beacon, battering'
      + ' everything nearby away.',
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
    id: 'chain_pull', name: 'Chain Pull',
    description: 'Fling a barbed chain that deals physical damage, stuns the enemy it hooks,'
      + ' and yanks them to your feet, holding them dazed for 1.4 seconds through the landing.',
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
    description: 'CHANNELED: spit pairs of venomous chaos bolts in random directions all around'
      + ' you, pulse after pulse for as long as the button is held, while you move at half'
      + ' speed. Each bolt carries a 40% chance to poison.',
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
    description: 'Poison damage you inflict feeds a venom reservoir point for point, and raw'
      + ' chaos damage adds 35%. Loose it to walk as pestilence: the bank vents as chaos damage'
      + ' per second around you until the venom runs dry. Use again to seal it.',
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
    description: 'Every point of burn damage you inflict feeds the charge, and raw fire damage'
      + ' adds a quarter. Trigger it and the whole bank goes off around you at once as fire'
      + ' damage. Arson, collected and repaid.',
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
    description: 'Consume a target\'s chill or freeze: cold damage bursts around them, and the'
      + ' victim is locked frozen for a fixed 2 seconds. The cast refuses until something in'
      + ' reach is chilled or frozen.',
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
    description: 'Split the earth in a forward march: the slam echoes 3 times, each physical'
      + ' shock landing a beat later, a step farther on, and 15% smaller and weaker than the'
      + ' last. Every shock knocks back, with a 15% chance to stun.',
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
    description: 'Sunder with the patience of a bell: 4 tolls march forward on a half-second'
      + ' beat, each a step farther out and 12% harder than the last, knocking enemies back'
      + ' with an 18% chance to stun. The routed can outrun it; whatever stands and fights is'
      + ' standing in it.',
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
    id: 'earthquake', name: 'Earthquake',
    description: 'Drive the blow into the ground at your feet: the first crack is only the'
      + ' warning, a shove with a 12% chance to stun. One second later the broken earth erupts'
      + ' again, 2.4 times as hard and a quarter wider. The lesson never changes: leave where'
      + ' you were.',
    tags: ['attack', 'melee', 'aoe', 'physical', 'pulse'], color: '#b89058',
    manaCost: 15, cooldown: 5, useTime: 0.8,
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
    description: 'Name a fault line at range: the marked ground cracks in a warning tremor,'
      + ' then detonates twice more on a 0.9-second beat, each blast 1.8 times the tremor\'s'
      + ' damage and a shade wider, with a 10% chance to stun. Leave where the crack is.',
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
    description: 'Skip the slam across the field in 6 forward shocks: each arrives sooner than'
      + ' the last, a little smaller and softer, the gaps shrinking until the final skips land'
      + ' almost together. Every shock knocks back, with a 12% chance to stun.',
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
    description: 'Condemn a patch of ground at range: after a long stillness it collapses 5'
      + ' times, each fall arriving sooner, smaller, and softer than the last until the ruin'
      + ' settles into gravel. Every fall deals physical damage with a 10% chance to stun.'
      + ' Leave before the mathematics finish.',
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
    description: 'Hang a struck bell over distant ground: 6 tolls, each arriving sooner and'
      + ' ringing 8% harder than the last, every toll with a 10% chance to stun. When the'
      + ' bronze can take no more, the finale: one crashing burst at 2.2 times the damage'
      + ' across a wider ring. Music theory, weaponized.',
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
    description: 'The bell swung the other way: 6 strikes that open as a quick chatter and slow'
      + ' as they grow, each toll landing 28% harder and a shade wider than the last, with a'
      + ' 12% chance to stun. The ritardando: the last blows land like verdicts.',
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
    description: 'Open a hissing vent in the earth for 7 seconds: molten globs lob outward,'
      + ' arcing away and bursting in fire where they fall, furious at first and settling as'
      + ' the chamber spends itself. The vent floor cooks whatever stands on it, with a 12%'
      + ' chance to burn. Artillery you plant like a garden.',
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
    description: 'A gout of molten stone arcs away, shedding speed, and bursts in fire where it'
      + ' falls, with a 14% chance to burn. Thrown by the mountain.',
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
    description: 'Strike the ground and set it churning: a slow wave of broken earth rolls'
      + ' forward for 2.8 seconds, growing as it goes, battering and knocking back whatever it'
      + ' rolls under. Small where it starts, a landslide where it arrives.',
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
    description: 'Loose an arrow whose head is a keg: it lodges in the victim as a POWDER'
      + ' CHARGE armed on a short fuse, and every further arrow pumps the same charge. The keg'
      + ' rides the target wherever they run; Storm Call waits at an address, this one travels.',
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
    description: 'Set a blade spinning in orbit around you: it cuts whatever drifts into its'
      + ' ring, striking the same victim again every 0.9 seconds until the blade wears out.'
      + ' Cast again for a second blade, then a third.',
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
    id: 'skewer', name: 'Skewer',
    description: 'A driving melee thrust that leaves steel behind: 35% of the blow\'s physical'
      + ' damage lodges in the wound as a spearhead, and your next hit drives it through as its'
      + ' own separate blow. Stack the steel, then knock it home.',
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
    id: 'spear_recall', name: 'Extraction',
    description: 'Wrench every lodged spear free at once: each impalement in reach detonates'
      + ' into its host for 120% of its stored damage, and the freed steel flies home to your'
      + ' hand, piercing whatever stands between for half that stored harm.',
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
    description: 'The freed spear flies back to its thrower, piercing every body in its path;'
      + ' each one struck has a 25% chance to be left bleeding. Lodged steel, recalled the hard'
      + ' way.',
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
    id: 'pinning_spear', name: 'Pinning Spear',
    description: 'Hurl a spear that punches through one rank and plants where it lands, a'
      + ' standing shaft that holds for 10 seconds for the rest of your kit to use; Tripwire'
      + ' Web strings killing fences between planted spears. Victims have a 30% chance to'
      + ' bleed.',
    tags: ['attack', 'projectile', 'physical', 'trap', 'duration'], color: '#c8b890',
    manaCost: 8, cooldown: 1.2, useTime: 0.6,
    baseDamage: { physical: [10, 15] },
    delivery: {
      type: 'projectile', speed: 620, radius: 7, range: 460, pierce: 1,
      plantOnLand: { duration: 10, life: 30 },
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
    description: 'Crack the ground ahead: the first impact is a whisper, and three ripples'
      + ' march forward from it, each landing 25% wider and 20% harder than the last, knocking'
      + ' enemies back. The far ring is the killer; the epicenter is the warning.',
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
    description: 'Three quick scythe arcs swing left, center, then right, sweeping side to side'
      + ' across your front instead of punching one cone forward. Each arc has a 25% chance to'
      + ' leave victims bleeding.',
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
    description: 'Summon a wraith that fights at arm\'s length, sweeping its own small reap'
      + ' through whatever crowds it, up to 4 at once. Each wraith begins to rot 4 seconds'
      + ' after it forms, faster and faster; permanence is never for sale.',
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
    description: 'Press repeatedly while the barrel cycles: every press loads another salvo,'
      + ' and each salvo spits a pair of burning shells that burst on impact, with an 11% chance'
      + ' to set victims burning. Rewards the drummer\'s wrist.',
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
    description: 'A rolling cone of flame with an 18% chance to set victims burning. The ember'
      + ' head empties its furnace lungs.',
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
    description: 'Freezing breath washes a cone ahead, with a 70% chance to chill whatever it'
      + ' touches. The rime head exhales a winter that argues with your joints.',
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
    description: 'The bladders clench and empty a cone of swamp-gas, thick enough to chew, with'
      + ' a 50% chance to poison. It holds three of these gouts, and not one more until it'
      + ' breathes.',
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
    description: 'The flat bladders haul air back in and the dregs come out with it: a low pall'
      + ' spreads around its own feet for 2.6 seconds, ticking chaos damage with a 30% chance'
      + ' to poison.',
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
    description: 'Amber weeps where the body passes: sticky ground that dries and shrinks over'
      + ' 6.5 seconds, ticking physical damage with a 55% chance to leave you MIRED. Tacky'
      + ' underfoot, and it points the way it went.',
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
    id: 'time_dilation', name: 'Time Dilation',
    description: 'Pinch the clockwork: every other skill\'s running cooldown sheds 2 seconds'
      + ' plus a quarter of what remains. Its own clock is untouched; the winder cannot wind'
      + ' itself.',
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
    id: 'expose_weakness', name: 'Expose Weakness',
    description: 'Curse the target EXPOSED: a weak spot is painted on their health bar just'
      + ' below the current wound. While their life sits inside that window, every blow lands'
      + ' 40% harder; drive them through it and the spot shatters. Aim at the bar, not the'
      + ' body.',
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
    description: 'Sentence the target with DOOM, a damage bank on a fixed fuse. Every further'
      + ' Word pumps the bank, and the instant it covers what life remains, the doom detonates'
      + ' early. The cull that does its own arithmetic.',
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
    description: 'One falling melee blow that consumes every stack of VULNERABLE on the target,'
      + ' dealing 45% more damage per stack consumed. Five wounds opened, one verdict through'
      + ' them all.',
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
    description: 'Clad yourself in patient iron: for 6 seconds you take 25% less damage, and'
      + ' everything that still lands is banked. When the ward ends, the whole bill detonates'
      + ' around you at 120% of the banked total. Stand in the crowd and make them regret the'
      + ' arithmetic.',
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
    description: 'Every block, stance or shield-luck, banks a magma bead, up to 5. Press to'
      + ' vent them all as a molten nova around you: 40% harder per bead spent, with a 14%'
      + ' chance to set victims burning; it refuses to fire below 2 beads. The wall saves its'
      + ' change and pays in fire.',
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
    id: 'transgression', name: 'Transgression',
    description: 'Usable only mid-guard, fired around the raised shield: half your remaining'
      + ' mana crystallizes into shield health, stacking past the shield\'s maximum. Combos'
      + ' with Shield Up, Riposte, and Ice Shield.',
    tags: ['spell', 'buff', 'instant'], color: '#8ab8d8',
    manaCost: 0, cooldown: 10, useTime: 0,
    requiresGuard: true,
    usableWhileGuarding: true,
    delivery: { type: 'self' },
    effects: [{ type: 'guardSurge', manaFraction: 0.5, ratio: 1.4 }],
    requirements: { strength: 12, intelligence: 12 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.06)] },
  },

  pain_hounds: {
    id: 'pain_hounds', name: 'Pain Hounds',
    description: 'Grow three thorn-shards that orbit your shoulders. Every blow that lands on'
      + ' you breaks one, and it lands snarling: a burning hound at the attacker\'s heel for 8'
      + ' seconds. Hit me again; see what happens.',
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
    id: 'bristleback', name: 'Bristleback',
    description: 'TOGGLE AURA (reserves 30 mana): you and allies inside grow iron quills,'
      + ' dealing flat physical thorns damage to anything whose blow lands, plus a tenth of'
      + ' each wound reflected back. Being hit becomes a tax on the hitter.',
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
    description: 'TOGGLE AURA (reserves 30 mana): a third of every wound you take flows down'
      + ' the link onto your minions instead, split among the living. The wall of bones is'
      + ' armor; keep it fed.',
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
    description: 'Kills have a 28% chance to kindle a cinderkin husk at the corpse, and blows'
      + ' traded, yours and your court\'s, heat a gauge that coughs up 2–3 more, even from'
      + ' bosses who bring no court. Walk through a kindled husk to claim it, up to 10 in the'
      + ' horde; claimed cinderkin LATCH to what they reach and bite while it carries them.'
      + ' HOLD to sweep the horde at the cursor.',
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
    description: 'Attune to the quiet dead: their haunts glimmer for your eye alone, 1–2'
      + ' pockets per zone holding 3–5 wisps each, and walking among them makes them yours, up'
      + ' to 8; the world does not regrow them. Their zaps phase through stone and they keep'
      + ' their distance. HOLD to sweep the host at the cursor; release, and they linger on the'
      + ' task, then heel.',
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
    id: 'raise_gnatveil', name: 'Raise the Gnatveil',
    description: 'Gnats condense out of the air every 6–10 seconds, sometimes at your heels,'
      + ' sometimes a walk away, and evaporate if left unclaimed; gather up to 24. Each is'
      + ' nearly nothing: the cloud is the weapon, riders stacking HARRIED on whatever carries'
      + ' them to spoil aim and attention. HOLD to sweep the veil at the cursor.',
    tags: ['spell', 'minion', 'summon', 'physical', 'channel'], color: '#a8b860',
    manaCost: 1, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, move: 'slowed', moveFactor: 0.85 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: {
      monsterId: 'gnatling', cap: 24, batch: 8,
      sources: [{ kind: 'motes', every: [6, 10], at: 'mixed', ttl: 40 }],
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
    description: 'Corpses give up grubs: 40% chance per kill, and blows traded, yours and your'
      + ' court\'s, fill a gauge that births 1–2 more; walk through one to claim it, up to 8.'
      + ' What they catch they BURROW into: the host\'s own blows cannot find them, and it must'
      + ' shake them loose, briefly bare, before they wriggle back in. While they ride they'
      + ' chew, a gnaw that never misses. HOLD to sweep the brood at the cursor.',
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
    id: 'summon_swarmlings', name: 'Hivecall',
    description: 'TOGGLE a hive contract: mana stays reserved while up to 5 swarmlings scurry'
      + ' for you, and each reknits itself 4 seconds after it falls. SHIFT-press the slot to'
      + ' ENRAGE the horde into a pressed wave of speed and spite.',
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#b8d060',
    manaCost: 12, cooldown: 3, useTime: 0.8,
    delivery: {
      type: 'summon', monsterId: 'swarmling',
      count: 3, maxActive: 5,
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
    description: 'The horde froths: your minions deal 30% more damage with 40% increased attack'
      + ' speed and 25% increased movement speed for 5 seconds.',
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
    id: 'toppling_stroke', name: 'Toppling Stroke',
    description: 'Swing a wide, deliberate demolition arc that hits like falling masonry: 30%'
      + ' chance to leave survivors staggering SUNDERED. Best delivered beside your own'
      + ' rampart, where the argument has walls.',
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
    id: 'cape_feint', name: 'Cape Feint',
    description: 'Step soundlessly through the blow: a dash that phases past bodies and leaves'
      + ' an afterimage holding the cape where you stood for 1.2 seconds. The crowd gasps; the'
      + ' horns find cloth.',
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
    id: 'planted_banderilla', name: 'Planted Banderilla',
    description: 'A ribboned barb thrown to sting and insult: the struck beast is TAUNTED onto'
      + ' you, forgetting every other quarrel, with a 60% chance to be left VULNERABLE where'
      + ' the barb lodged. The third act is yours to schedule.',
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
    id: 'ashen_vow', name: 'Ashen Vow',
    description: 'TOGGLE a covenant that feeds on you, burning 1.2% of your life per second for'
      + ' 10% increased damage. Below half life the bargain turns generous: 25% more damage,'
      + ' 35% increased armor, and 2% of damage leeched as life. Whole men owe; the broken are'
      + ' owed.',
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
    id: 'cast_falcon', name: 'Cast the Falcon',
    description: 'Summon a hunting falcon that latches onto prey and rides it, holding the'
      + ' victim VULNERABLE until it dies or shakes her off, then picking again. The bond is a'
      + ' toggle: 9 mana stays reserved while she flies, and she returns to the glove 5 seconds'
      + ' after any death.',
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
    id: 'thrown_ace', name: 'Thrown Ace',
    description: 'Flick a card flat and spinning: a single projectile that deals physical,'
      + ' fire, cold and lightning damage all in one hit. Whatever turns up, the Sharper dealt'
      + ' it.',
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
    id: 'stack_the_deck', name: 'Stack the Deck',
    description: 'Palm the odds: for 8 seconds you gain +25% luck and 15% increased cooldown'
      + ' recovery, so chance rolls land in your favor and your tricks reset sooner. Nobody can'
      + ' prove anything.',
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
    id: 'incite', name: 'Incite',
    description: 'Speak the wrong truth at the wrong volume: every enemy around you has a 45%'
      + ' chance to go MADDENED, blades turning on the nearest creature, friend first, and a'
      + ' 35% chance of befuddlement. You will be elsewhere when the constables arrive.',
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
    id: 'tuning_strike', name: 'Tuning Strike',
    description: 'Strike the body like a bell: the blow leaves its victim ATTUNED to fire, cold'
      + ' or lightning, one of the three at roughly even odds. An attuned body reads as kin to'
      + ' its own element and as prey to you. A Resonator never asks what something is: they'
      + ' strike, and it says.',
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
    id: 'shatterchord', name: 'Shatterchord',
    description: 'Play every tone at once: a nova of fire, cold and lightning damage around'
      + ' you, and the circle widens with your area of effect. ATTUNED enemies take the worst'
      + ' of it: a struck bell shatters loudest at its own note.',
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
    id: 'command_assault', name: 'Command: Assault',
    description: 'Order every minion to assault: for 6 seconds they drop their own fights and'
      + ' converge on your mark, and aiming at a single foe pins the whole court on that one.',
    tags: ['spell', 'minion', 'instant'], color: '#d0a858',
    manaCost: 6, cooldown: 5, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', duration: 6 }],
    requirements: { willpower: 12 },
    ai: { range: 500, weight: 1 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
  },

  // The ENEMY side of the same lever (the obedience fabric's proof): the
  // pack-leader's bark. `affects: 'squad'` routes the order to squadmates
  // and same-faction kin in earshot instead of summons, and every packmate
  // rolls its brain's `obedience` dial — gnolls are an unruly lot, so only
  // SOME heed the howl while the rest keep their own counsel.
  snarled_orders: {
    id: 'snarled_orders', name: 'Snarled Orders', noDrop: true,
    description: 'The pack-leader barks the pack onto its quarry: every packmate in earshot'
      + ' drops its own hunt and converges on the mark for 4.5 seconds. Whether a given ear'
      + ' HEEDS is a dial in the brain, and gnolls barely listen.',
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
    description: 'Seize the world\'s clock: time stops for everything but you and yours for 2.6'
      + ' seconds, arrows hanging in flight, jaws frozen mid-snap. Whatever you loose during'
      + ' the stop waits in the air with them until time resumes.',
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
    id: 'stasis_lock', name: 'Stasis Lock',
    description: 'Loose a needle of unraveled time: every hit inflicts temporal drag, slowing'
      + ' the victim to half time, and 80% of the time the needle locks them in STASIS,'
      + ' suspended outside the world with timers, wounds and thought paused. A statue you may'
      + ' study or shatter.',
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
    id: 'mend', name: 'Mend',
    description: 'Instantly mend the ally under your cursor, or the most wounded in reach, or'
      + ' yourself when alone: a quick heal plus 5% of the target\'s maximum life.',
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
    description: 'One measured invocation over an ally\'s wounds: slow to speak, generous to'
      + ' land, restoring a heavy heal plus 12% of the target\'s maximum life.',
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
    description: 'Bless everyone at once: an instant nova of healing that mends every ally'
      + ' around you for a modest amount plus 4% of their maximum life. The panic button that'
      + ' answers.',
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
    description: 'Gather the congregation: a long invocation that releases a wave of healing'
      + ' over every ally around you, restoring a large amount plus 10% of their maximum life.'
      + ' Worth protecting the cast.',
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
    description: 'Call a soft rain over the target ground for 5 seconds: allies standing in it'
      + ' are mended every half-second while it falls. Position IS the heal.',
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
    id: 'consecration', name: 'Consecration',
    description: 'Sanctify a circle of ground for 5 seconds: every half-second it deals fire'
      + ' damage to enemies within and a small mend to allies on the same ground. One circle,'
      + ' two verdicts: the paladin\'s floor.',
    tags: ['spell', 'heal', 'fire', 'aoe', 'duration'], color: '#f0d890',
    manaCost: 24, cooldown: 9, useTime: 0.7,
    baseDamage: { fire: [4, 7] },
    delivery: {
      type: 'ground', radius: 110, castRange: 300,
      lingerDuration: 5, tickInterval: 0.5,
    },
    effects: [
      { type: 'damage' },
      { type: 'heal', amount: 3, pctMax: 0.008 },
    ],
    requirements: { willpower: 14 },
    ai: { range: 280, weight: 2 },
    leveling: { perLevel: [mod('healPower', 'increased', 0.07), mod('damage', 'increased', 0.07)] },
  },

  healing_stream: {
    id: 'healing_stream', name: 'Healing Stream',
    description: 'CHANNELED: pour a thread of living water onto an ally for as long as the'
      + ' button is held, pulsing quick mends that follow the most wounded in reach while you'
      + ' move at 40% reduced speed. Socket Mending Chain and the stream forks.',
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
    description: 'Burn the afflictions OFF an ally instantly: strips their 3 newest curses and'
      + ' ailments, blessings untouched, and leaves a small heal behind in the wound.',
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
    id: 'sanctified_strike', name: 'Sanctified Strike',
    description: 'Sweep a wide melee arc: enemies in it take physical and fire damage, and'
      + ' allies standing among them are mended for a small amount plus 2% of their maximum'
      + ' life. Everyone but you: the burden is the point.',
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
    description: 'CHANNELED: fix a thin dark thread on whatever stands before you, pulsing'
      + ' chaos damage for as long as the button is held while you move at half speed. 80% of'
      + ' the damage dealt runs up the line into your life.',
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
    description: 'Send out a fan of 3 hungry souls: chaos projectiles that return 35% of the'
      + ' damage they deal to you as healing. Damage that pays its keep.',
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
    description: 'Plant a sapling that drinks the violence around it, visibly swelling as your'
      + ' side deals damage nearby through its 8 seconds. When it ends, ripe, felled or'
      + ' replaced, it BURSTS: 35% of everything it drank pours out as healing over the allies'
      + ' around it.',
    tags: ['spell', 'heal', 'summon', 'totem', 'aoe', 'duration'], color: '#6fbe5a',
    manaCost: 28, cooldown: 12, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'tree',
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
    description: 'Set a font that tends its ground for 10 seconds: every beat it sends a'
      + ' Mending Pulse to the most wounded ally in reach, and each pulse leaps on to two more'
      + ' of the hurt. The chain heal, tethered to a place.',
    tags: ['spell', 'heal', 'totem', 'duration'], color: '#8ae0c0',
    manaCost: 24, cooldown: 8, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'totem', castSkillId: 'mending_pulse',
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
    description: 'A pulse of restoration mends its target for a small amount plus 2% of their'
      + ' maximum life, then leaps onward to up to 2 more wounded allies.',
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
    description: 'Lay a small mending on the most wounded ally in reach: a modest heal plus 4%'
      + ' of their maximum life.',
    tags: ['spell', 'heal', 'targeted'], color: '#a8f0c8',
    manaCost: 8, cooldown: 2.5, useTime: 0.5,
    targeting: { target: 'ally', castRange: 260, fallback: 'fail' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 8, pctMax: 0.04 }],
    ai: { range: 260, weight: 4 },
  },

  summon_cleric: {
    id: 'summon_cleric', name: 'Summon Skeletal Cleric',
    description: 'Raise a robed skeletal cleric, up to 2 at once: it follows the fight and lays'
      + ' Soothing Touch on whichever of yours bleeds worst, you included. If they fall, you'
      + ' dig them up again.',
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
    description: 'Bind a wisp of warm light to your shoulder for 20 seconds: it drifts with you'
      + ' and tends the most wounded ally in reach, over and over, until it comes apart.',
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
    id: 'purity_of_elements', name: 'Purity of Elements',
    description: 'TOGGLE AURA (reserves 35 mana): you and allies inside gain +20% to fire,'
      + ' cold, lightning and chaos resistance, and shrug off one incoming ailment in four.',
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
    description: 'TOGGLE AURA (reserves 25 mana): +35% fire resistance for everyone covered, and half of all incoming IGNITES and sears simply fail to take.',
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
    description: 'TOGGLE AURA (reserves 25 mana): +35% cold resistance for everyone covered, and half of all incoming CHILLS and freezes shatter harmlessly.',
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
    description: 'TOGGLE AURA (reserves 25 mana): +35% lightning resistance for everyone'
      + ' covered, and half of all incoming SHOCKS discharge harmlessly.',
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
    description: 'TOGGLE AURA (reserves 40 mana): everyone covered gains 60% increased armor'
      + ' and +30 armor on top. The line does not break.',
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
    description: 'Split the earth and send the crack travelling: a grinding fissure of physical'
      + ' and fire damage that erupts in gouts of magma all along its length while the wound'
      + ' stays open. Each bite has an 11% chance to set its victim burning.',
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
    description: 'Magma bursts from the broken ground after a blink of delay: fire damage in a'
      + ' small circle, with a 12% chance to set victims burning.',
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
    description: 'Detonate the target ground: one heavy blast after a breath of delay, then 3'
      + ' seconds of churning fire, each hit carrying a 14% chance to burn. Every wound is'
      + ' SEARED shut: healing is halved while it lasts, regen, leech and mending alike.',
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
    description: 'Raise a storm cell over target ground: for 6 seconds, a lightning bolt'
      + ' hammers a random enemy beneath it every half second. Over empty ground the cell'
      + ' strikes nothing.',
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
    description: 'One strike from the cell overhead: a beat after the ground is marked,'
      + ' lightning damage lands in a small burst with a 50% chance to shock.',
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
    description: 'Crack target ground for a small physical hit, and for 4 seconds tendrils lash'
      + ' up from the open wound, two at a time, at enemies standing on it: each snares its'
      + ' victim and can open a bleed.',
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
    description: 'A tendril whips up from the broken earth: physical and chaos damage in a'
      + ' small burst, a snare that holds the victim for a second, and a 30% chance to open a'
      + ' bleed.',
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
    description: 'A nova of bone shards and bile around the body: physical and chaos damage,'
      + ' with a 50% chance to set DECAY on everything caught. The whole banked meal, returned'
      + ' at once.',
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
    description: 'The stoked furnace vents: a slow ring of fire around the body, with an 18%'
      + ' chance to set everything it catches burning. Every blow that fed the furnace paid for'
      + ' this one.',
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
    description: 'A quick raking strike in a wide arc in front of you; every hit has a 50%'
      + ' chance to open a bleeding wound.',
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
    description: 'A skull-splitting wail in a cone in front of you: physical damage, a 60%'
      + ' chance to befuddle victims so they fumble what they were doing (a 35% interrupt), and'
      + ' a 35% chance to weaken their blows.',
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
    description: 'Knot the ground under target enemies: after a short wind-up it heaves for'
      + ' physical damage, with a 60% chance to ROOT whoever lingered in the telegraph. Rooted'
      + ' victims cannot use movement skills.',
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
    description: 'A whipping fan of green-wood switches in an arc in front of you: 80% chance'
      + ' to ENSNARE the caught for 1.4 seconds so they wade as if through briar, and a 25%'
      + ' chance to open a bleed.',
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
    description: 'Loose a fan of 4 jagged splinters in a spread; each hit has a 30% chance to'
      + ' leave a bleeding wound where it sticks.',
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
    description: 'Call a rain of 3–5 spore-clusters down over target ground; each burst deals'
      + ' chaos damage in a small area with a 50% chance to POISON whoever it coats.',
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
    description: 'Shake 5–7 stone teeth loose over the marked ground in a fast drumming'
      + ' sequence; each strike deals physical and cold damage with a 15% chance to stun.',
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
    description: 'Vent a choking ring of spores around you: chaos damage, a 50% chance to'
      + ' poison, and a 30% chance to befuddle everything caught in the cloud.',
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
    description: 'Retch a sheet of caustic bile in a cone in front of you: chaos damage, with a'
      + ' 50% chance to set DECAY working on everything it coats.',
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
    description: 'A thin, held ray of a lidless stare: chaos damage along the beam, and every'
      + ' hit settles another stack of BEHELD on the victim. The weight of being watched'
      + ' builds.',
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
    description: 'Hold a thin beam of the mountain\'s regard on your victim: physical damage,'
      + ' and every hit settles another stack of PETRIFYING, toward stone. A finished statue'
      + ' takes the shattering blow a little wider.',
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
    description: 'Lance a thin beam of split light: fire, cold and lightning damage riding one'
      + ' ray. A crystal struck by it attunes to your strongest color.',
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
    description: 'The serpent\'s lidless stare, a thin held beam: physical damage, and each hit'
      + ' settles another stack of PETRIFYING into your limbs, toward stone.',
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
    description: 'A shivering nova of stinging tears around the body: chaos damage, with a 65%'
      + ' chance to set FAINTNESS on every head the salt mist settles over.',
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
    description: 'Lob a gob of half-digested matter at the target: chaos damage on the burst,'
      + ' with an 80% chance to turn the victim\'s stomach QUEASY.',
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
    description: 'Fix your stare on one enemy: focus fills only while your cursor rides the'
      + ' target, taking 1.6 seconds to complete. See it through and the victim takes chaos'
      + ' damage and is SEEN, suffering increased damage while the mark lasts. Break away early'
      + ' and the focus drains rather than dropping. The Ocular\'s own trick, learned back off'
      + ' its walls.',
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
    description: 'A snap of falling pressure in a nova around you: chaos damage and a stack of'
      + ' FAINTNESS on every head in reach, landing harder on the already-faint. At full stacks'
      + ' the ladder does the rest and the victim swoons.',
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
    description: 'Condemn target ground to a bile pool for 6 seconds: it ticks chaos damage on'
      + ' whatever stands in it, with a 50% chance per tick to turn stomachs QUEASY, and it'
      + ' spreads as it works, ending near three times the size it began. The Gutworks\''
      + ' patience, bottled.',
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
    description: 'Fling a gout of ichor that BLINDS whatever it coats: chaos damage on the hit,'
      + ' and the blinded lose their aim and half their perception. The eye country hates'
      + ' nothing more than its own trick.',
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
    description: 'Ring a bell only the inner ear hears: chaos damage in a nova around you, and'
      + ' every head in reach gains a stack of DISORIENTED. At the fifth stack the world turns'
      + ' and they walk WIDDERSHINS, feet contrary to every intent. The art is herding: off'
      + ' ledges, out of their own auras, into ground you laid.',
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
    description: 'Hurl a hex that crosses the wires between wanting and doing: chaos damage,'
      + ' and the victim is ADDLED, so pressed casts may fire the kit\'s neighbor instead and'
      + ' cooldowns burn at the worst moment. Watch a warcaster spend its opener on a wall.',
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
    description: 'Point at one enemy and set it WIDDERSHINS outright, no stack ladder needed:'
      + ' chaos damage, and every step it takes runs contrary while the hex rides. A charger'
      + ' flees and a fleer charges straight at you. It is never a stun: the victim keeps its'
      + ' hands; you take its feet.',
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
    description: 'Heave a wet knot of viscera: chaos and physical damage on the hit, with a 40%'
      + ' chance to leave the victim VULNERABLE, opened a little wider for everything after.',
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
    description: 'TOGGLE: reserve mana to wear a shell across the half-circle at your back.'
      + ' Hits arriving through it are eaten whole, ailments and knockback with them, until the'
      + ' shell breaks; after 3 quiet seconds it knits itself back to full. Its strength scales'
      + ' with your Guard Strength. Turn your back only on what you trust it to hold.',
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
    description: 'The snare closes: iron jaws bite everything in a tight ring for physical'
      + ' damage, with an 80% chance to ROOT the caught ankle for 1.6 seconds.',
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
    description: 'Spit a hooked line of silk: a weak physical hit with a 60% chance to ROOT the'
      + ' target for 1.2 seconds. Long enough for what spun it to arrive.',
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#d8d8c8',
    manaCost: 6, cooldown: 3, useTime: 0.65,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'projectile', speed: 340, radius: 8, range: 380 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'rooted', chance: 0.6, durationOverride: 1.2 },
    ],
    requirements: { dexterity: 14 },
    ai: { range: 340, weight: 3, keepDistance: 220 },
    leveling: { perLevel: [mod('damage', 'increased', 0.08), mod('apply_rooted', 'flat', 0.02)] },
  },

  hurl_debris: {
    id: 'hurl_debris', name: 'Hurl Debris',
    description: 'Unseen hands rip something loose and throw it at the target: a physical'
      + ' projectile with a 15% chance to stun on impact. A stone, a chair, a headstone;'
      + ' whatever was nearest.',
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
    description: 'Call a crimson bat out of the dark, one per cast and up to 3 aloft at once.'
      + ' On the attack order the wing converges on your marked target.',
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
    description: 'The lacquered door swings and one of the kept steps out hungry: a feeding'
      + ' thrall three times in four, a vampire thrall the rest, up to 5 loose at once.',
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
    description: 'Deposit a swollen egg sac nearby: after 7 seconds it splits and spiderlings'
      + ' boil out. Up to 3 sacs can stand at once, and each can be stamped out before it'
      + ' hatches.',
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#c8c0a0',
    manaCost: 14, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'pod', look: 'brood_egg',
      range: 0, duration: 7, maxActive: 3, life: 40, placeRange: 80,
      hatch: { skillId: 'egg_hatch_spiders' },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 240, weight: 2, keepDistance: 200 },
  },
  egg_hatch_spiders: {
    id: 'egg_hatch_spiders', name: 'The Clutch Splits', noDrop: true,
    description: 'The egg splits and 2 spiderlings boil out; up to 8 of the brood can swarm at'
      + ' once.',
    tags: ['spell', 'summon', 'minion'], color: '#c8c0a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'spiderling', count: 2, maxActive: 8 },
    effects: [],
  },
  lay_chitin_clutch: {
    id: 'lay_chitin_clutch', name: 'Lay Chitin Clutch',
    description: 'Seal a clutch of eggs in resin nearby: left alone for 7 seconds it splits and'
      + ' chitin drones boil out. Up to 3 clutches can stand at once, and each can be broken'
      + ' before it hatches.',
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#d8b06a',
    manaCost: 14, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'pod', look: 'chitin_clutch',
      range: 0, duration: 7, maxActive: 3, life: 45, placeRange: 80,
      hatch: { skillId: 'egg_hatch_chitin' },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 240, weight: 2, keepDistance: 200 },
  },
  egg_hatch_chitin: {
    id: 'egg_hatch_chitin', name: 'The Clutch Splits', noDrop: true,
    description: 'The resin cracks and 2 chitin drones claw free; up to 8 of the seethe can be'
      + ' alive at once.',
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
    description: 'The creature takes wing, gaining ALOFT: airborne and out of the reachable'
      + ' world until it stoops or settles.',
    tags: ['spell', 'buff', 'movement'], color: '#e8d8a0',
    manaCost: 0, cooldown: 1.2, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'status', status: 'aloft', chance: 1 }],
  },
  locust_dive: {
    id: 'locust_dive', name: 'Stooping Bite', noDrop: true,
    description: 'Folding its wings, the locust falls on the marked point: physical damage'
      + ' where it lands, with ALOFT shed as it drops. The warning ring is painted on the'
      + ' ground before it hits.',
    tags: ['attack', 'physical', 'movement'], color: '#e0b054',
    manaCost: 0, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [6, 11] },
    delivery: { type: 'leap', range: 420, airTime: 0.85, radius: 60, telegraph: true },
    effects: [{ type: 'shed', status: 'aloft' }, { type: 'damage' }],
    ai: { range: 400, weight: 1 },
  },
  saltant_slam: {
    id: 'saltant_slam', name: 'Stooping Crush', noDrop: true,
    description: 'The saltant folds out of the sky and slams the marked ground: physical damage'
      + ' in a wide burst, and everything caught is knocked back. Its landing ring is drawn'
      + ' before it falls, and ALOFT is shed on the drop.',
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
    description: 'Sheds ALOFT: the wings still and the body settles back onto the ground, in'
      + ' reach once more.',
    tags: ['spell', 'movement'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'shed', status: 'aloft' }],
  },
  // --- THE MOUNTAIN'S OWN (the highland country kin) ------------------------
  condor_stoop: {
    id: 'condor_stoop', name: 'Stooping Talons', noDrop: true,
    description: 'Dropping off its thermal, the condor stoops onto the marked point: physical'
      + ' damage at the strike and a 30% chance to BLEED, with ALOFT shed in the fall. The ring'
      + ' on the ground is the only warning it owes.',
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
    description: 'A long note off the horn calls 2 scree skitters up out of the slope, to a'
      + ' band of 4 at once. What looked like rubble stands up hungry.',
    tags: ['spell', 'summon'], color: '#b8ab90',
    manaCost: 40, cooldown: 12, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'scree_skitter', count: 2, maxActive: 4 },
    effects: [],
    ai: { range: 600, weight: 1.4, keepDistance: 320 },
  },
  stridulate: {
    id: 'stridulate', name: 'Stridulation', noDrop: true,
    description: 'Sawing its wing-combs, the singer raises a droning call that grants FUROR to'
      + ' every ally in a wide ring around it. The whole murmuration answers at once.',
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#e8c878',
    manaCost: 12, cooldown: 12, useTime: 0.8,
    delivery: { type: 'nova', radius: 260, affects: 'allies' },
    effects: [{ type: 'status', status: 'furor', chance: 1 }],
    ai: { range: 300, weight: 2, keepDistance: 220 },
  },
  lay_grub_clutch: {
    id: 'lay_grub_clutch', name: 'Lay Grub Clutch',
    description: 'Bury a clutch of pale eggs nearby: left alone for 8 seconds it hatches and'
      + ' giant maggots boil out. Up to 3 clutches can stand at once; broken early, they are'
      + ' only a smear.',
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#d0c8a8',
    manaCost: 14, cooldown: 10, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pod', look: 'grub_egg',
      range: 0, duration: 8, maxActive: 3, life: 45, placeRange: 90,
      hatch: { skillId: 'egg_hatch_maggots' },
    },
    effects: [],
    requirements: { willpower: 16 },
    ai: { range: 240, weight: 2, keepDistance: 180 },
  },
  egg_hatch_maggots: {
    id: 'egg_hatch_maggots', name: 'The Eggs Hatch', noDrop: true,
    description: 'The clutch quivers, splits, and 2 giant maggots spill out; up to 8 can writhe'
      + ' at once.',
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
    description: 'Plant a pulsing seed at your mark. After 1.4 seconds of incubation it BLOOMS:'
      + ' a ring of grasping vines that deals physical and chaos damage and ENSNARES everything'
      + ' in reach, with a chance to open bleeding wounds. Breaking the seed early sets the'
      + ' bloom off at once, and up to 3 seeds can gestate at a time.',
    tags: ['spell', 'chaos', 'physical', 'totem', 'aoe', 'duration'], color: '#7fae4a',
    manaCost: 14, cooldown: 5, useTime: 0.6,
    baseDamage: { physical: [6, 10], chaos: [4, 7] },
    delivery: {
      // A pod on a 1.4s incubation — killed pods HATCH (onBreak: the
      // powder rule): the garden does not accept editorial feedback.
      type: 'construct', kind: 'pod',
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
    description: 'The seed\'s answer: a ring of grasping vines that deals physical and chaos'
      + ' damage, holds victims ENSNARED for 1.4 seconds, and carries a 35% chance to BLEED.',
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
    description: 'Grow a wall of 6 thorned bramble segments across the way: for 12 seconds it'
      + ' blocks passage and rakes whatever presses against it, with a 50% chance to BLEED.'
      + ' Fire tears the hedge down 2.5 times faster and your own blows twice as fast, and'
      + ' every broken segment bursts in a parting spray of thorns.',
    tags: ['spell', 'physical', 'totem', 'duration', 'aoe'], color: '#5a8a3a',
    manaCost: 15, cooldown: 7, useTime: 0.6,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_bramble',
      range: 0, duration: 12, maxActive: 12, life: 38,
      placeRange: 320,
      wallSegments: 6,
      breakable: { ownerMult: 2, affinityTags: ['fire'], affinityMult: 2.5 },
      deathBurst: { radius: 70, damageScale: 0.7 },
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
    description: 'Loose a low tide of bramble that crawls forward and widens as it goes, raking'
      + ' physical and chaos damage into everything it overtakes. Each rake carries a 25%'
      + ' chance to briefly ENSNARE and a 30% chance to BLEED.',
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
    id: 'rune_of_power', name: 'Rune of Power',
    description: 'Inscribe a circle of standing power at your feet: allies inside it gain 25%'
      + ' increased spell damage and 15% increased cast speed for the 8 seconds it stands. The'
      + ' rune does not follow; the discipline is holding your place on it.',
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
    description: 'Claim a stretch of ground for 6 seconds: enemies inside take 12% more damage'
      + ' and have 15% less movement speed, while steady pulses of chaos damage each carry a'
      + ' 40% chance to POISON.',
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
    description: 'A pale, sweet fog with no teeth at all: the cloud deals no damage and hangs'
      + ' for 5 seconds. Anything that breathes it for 1.2 seconds goes heavy while it stays'
      + ' inside, with 35% less movement speed, 20% less attack and cast speed, and 10% more'
      + ' damage taken.',
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
    description: 'Light the swinging censer: a wreath of consecrated smoke rides you for 9'
      + ' seconds. Any ally who breathes it for a full second carries the blessing while they'
      + ' stay inside: 15% increased damage, 8% increased attack and cast speed, and +4 to life'
      + ' regeneration.',
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
    description: 'Wind the repeater, then let it loose: 4 shots pour out in a rapid salvo, and'
      + ' the burst keeps tracking your aim as it fires. A canceled windup fires nothing.',
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
    description: 'A shard of deep cold condenses at your mark, not in your hand, and bores'
      + ' onward from there, bursting in a wider blast where it ends. Each hit carries a 50%'
      + ' chance to CHILL.',
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
    description: 'CHANNELED: pour out a stream of lightning missiles for as long as the button'
      + ' is held, each one weaving after your cursor; drag the swarm across the field while'
      + ' you move at 40% reduced speed. Every missile has a 15% chance to SHOCK.',
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
    description: 'Tear a rift at your mark that stands for 6 seconds, spewing fire missiles'
      + ' which loosely chase your cursor. Up to 2 rifts can burn at once.',
    // 'totem' = the deployed-object umbrella tag (totem supports apply,
    // and Spirit Totem correctly refuses a construct-delivery host).
    tags: ['spell', 'fire', 'projectile', 'duration', 'totem'], color: '#ff6a3a',
    manaCost: 26, cooldown: 9, useTime: 0.8,
    delivery: {
      type: 'construct', kind: 'eruptor', look: 'construct_rift', castSkillId: 'hellfire_missile',
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
    description: 'A wandering gobbet of riftfire that weaves after its master\'s mark, bursting'
      + ' where it lands with an 11% chance to BURN.',
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
    description: 'Conjure a mirage of yourself that hovers at your shoulder for 12 seconds,'
      + ' loosing spectral arrows at nearby foes on its own clock at 75% of your damage. The'
      + ' mirage cannot be struck; it simply runs out.',
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
    description: 'The mirage\'s arrow: a straight-flying physical shot of shimmer and spite.',
    tags: ['attack', 'projectile', 'physical'], color: '#8fd4c8',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 12] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 560 },
    effects: [{ type: 'damage' }],
  },

  shadow_clone: {
    id: 'shadow_clone', name: 'Shadow Clone',
    description: 'Step back in smoke, leaving a shadow of yourself where you stood. For 8'
      + ' seconds it mirrors your strikes from its own position at 35% of your damage, on a'
      + ' throttled beat. The clone has its own life and can be cut down.',
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
    description: 'A thrown sliver of night: a straight physical projectile from the shadow\'s'
      + ' hand.',
    tags: ['attack', 'projectile', 'physical'], color: '#4a4066',
    manaCost: 0, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 540, radius: 5, range: 420 },
    effects: [{ type: 'damage' }],
    ai: { range: 380, weight: 2, keepDistance: 200 },
  },

  shadow_slash: {
    id: 'shadow_slash', name: 'Shadow Slash', noDrop: true,
    description: 'A backhand cut of cold umbra: a wide melee arc of physical damage in front of'
      + ' the shade.',
    tags: ['attack', 'melee', 'physical'], color: '#4a4066',
    manaCost: 0, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'melee', range: 55, arcDeg: 110 },
    effects: [{ type: 'damage' }],
    ai: { range: 60, weight: 3 },
  },

  reap: {
    id: 'reap', name: 'Reap',
    description: 'Swing the scythe and let go: a crescent of shear leaves your hands and'
      + ' travels forward, dealing physical and chaos damage to each foe it passes through'
      + ' exactly once. Duration investment carries it further.',
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
    id: 'whirling_reap', name: 'Whirling Reap',
    description: 'One press, one full turn: six melee arcs walk the blade all the way around'
      + ' you, striking everything in the circle with physical damage.',
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
    id: 'summon_raging_spirit', name: 'Summon Raging Spirit',
    description: 'Summon a shrieking skull of flame that rushes your foes for 5 seconds, then'
      + ' gutters out. Up to 20 can rage at once; only cast speed keeps the swarm near its cap.',
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
    id: 'spirit_pyre', name: 'Spirit Pyre',
    description: 'CHANNELED: the pyre pours out raging spirits on a steady beat while the'
      + ' button is held, and the longer it burns the hotter each newborn skull, ramping'
      + ' quadratically up to triple strength. The spirits share the 20-skull pool, and you'
      + ' move at 45% reduced speed while channeling.',
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
    id: 'summon_wraith', name: 'Summon Wraith',
    description: 'Summons a decay wraith, up to 6 at once. No timer governs it: 4 seconds after'
      + ' rising it begins to rot, draining 4% of its life per second at an ever-compounding'
      + ' rate that healing cannot outpace. Minion life investment stretches those seconds,'
      + ' never to permanence.',
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
    description: 'Calls demons up out of the ground at your mark: 4 waves of 2, each wave'
      + ' erupting at your cursor\'s live position. The demons rush the nearest enemy and'
      + ' detonate themselves; any still standing burn out after 6 seconds.',
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
    description: 'Fires a lance of raw arcana as a lightning projectile. Its cost includes a'
      + ' tithe of 6% of your maximum mana, and every point of mana spent adds 1 lightning'
      + ' damage to the hit; 30% chance to shock.',
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
    id: 'sanguine_burst', name: 'Sanguine Burst',
    description: 'Opens your veins for a nova of blood around you: the cast costs life, 4% of'
      + ' your maximum on top of its base price, and 90% of the life paid is added as physical'
      + ' damage. 40% chance to inflict bleed.',
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
    description: 'Recalls every mobile minion to your side in a blink, then mends the host:'
      + ' 1.5% of each minion\'s life per second for 2 seconds. Anchored minions stay planted.',
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
    description: 'TOGGLE: casts your mana cannot cover still fire, their cost taken as reserved'
      + ' mana instead, up to half your pool. Repayment begins after 2.5 seconds without a new'
      + ' overdraft, and the toggle stays locked on until the debt clears.',
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
    id: 'blood_mortgage', name: 'Blood Mortgage',
    description: 'TOGGLE: a blood price your life cannot pay borrows from the top of your pool'
      + ' instead, lowering your maximum life until repaid, up to 40% of it. After 3 seconds'
      + ' without new borrowing the debt repays through your life regeneration, faster the'
      + ' quicker you swing. Locked on while the mortgage stands.',
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
    description: 'TOGGLE: your life burns away at 3.5% per second while your attacks deal 15%'
      + ' more damage, gain 10% increased attack speed, and leech 3% of damage as life. Above'
      + ' half life the toggle refuses to release. Landed blows stoke RAGE charges, up to 10,'
      + ' each adding attack speed and flat attack damage until the hitting stops.',
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
    description: 'Bloodlust builds on its own: 1 charge per second and another on every kill,'
      + ' up to 20, held until you unleash. Unleashing needs at least 5; from there the pool'
      + ' only drains, 2 charges per second, each remaining charge feeding your speed and fury,'
      + ' and nothing can stall or refill it until the last burns.',
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
    description: 'Deaths near you each yield a SOUL, up to 12, and rare or greater enemies'
      + ' yield one on every landed blow; hoarded souls slowly seep away. Casting consumes'
      + ' every soul for a nova of chaos and cold: 35% more damage per soul burned, with a 30%'
      + ' chance to chill.',
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
    description: 'Anoints your weapons: your next 6 attack uses each carry 8 added fire damage'
      + ' and a 35% chance to ignite, spending one round per use. Unspent rounds gutter out'
      + ' after 20 seconds.',
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
    description: 'Loads a quiver of envenomed heads: your next 8 projectile uses each carry 6'
      + ' added chaos damage and a 50% chance to poison, one round spent per use. The quiver'
      + ' dries up after 25 seconds.',
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
    description: 'CHANNELED: a ring of wind and lightning churns around you while the button is'
      + ' held, striking only along its outer wall; the eye stays calm. The storm widens as you'
      + ' channel, up to 60% more area, you move at 45% speed, and each pulse has a 30% chance'
      + ' to shock.',
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
    description: 'Cloaks you in a storm for 8 seconds: enemies inside the aura take continuous'
      + ' lightning damage, while you and nearby allies gain 5 extra mana regeneration per'
      + ' second.',
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
    description: 'An instant concussive burst of lightning around you: 30% chance to stun, and'
      + ' everything caught is shoved back.',
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
    description: 'Detonates the standing static: a wide lightning nova that consumes shock, and'
      + ' every shocked enemy it hits takes 80% more damage as the shock is spent.',
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
    description: 'TOGGLE AURA: reserves 30 mana while it stands. The air around you stays'
      + ' charged: enemies inside take 15% more damage and a slow lightning gnaw each second.',
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
    description: 'For 10 seconds, 40% of your attacks\' physical damage is converted to'
      + ' lightning and you gain 15% increased attack speed.',
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
    description: 'Looses a crackling orb that orbits you on a widening tether, striking'
      + ' whatever it passes through and zapping nearby enemies every 0.4 seconds for half its'
      + ' damage. Each hit has a 25% chance to shock.',
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
    description: 'Hurls a heavy orb of flame that explodes on impact, splashing 70% of its'
      + ' damage across everything near the strike. 12% chance to ignite.',
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
    description: 'Ruptures the ignite on a burning enemy: the burn is consumed, its remaining'
      + ' damage lands at once, and fire splashes to everything nearby, igniting anew. Only'
      + ' castable on a burning target.',
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
    ai: { range: 360, weight: 2, keepDistance: 260 },
  },

  flame_spear: {
    id: 'flame_spear', name: 'Flame Spear',
    description: 'Readies a spear of white flame, then hurls it through everything in its line;'
      + ' press again inside the golden window for the PERFECT throw. 18% chance to ignite'
      + ' whatever it pierces.',
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
    id: 'flame_arrow', name: 'Flame Arrow',
    description: 'A quick dart of flame that pierces up to 2 enemies, with a 7% chance to'
      + ' ignite each one it passes through.',
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
    description: 'CHANNELED: nothing fires while you gather; the cost ticks as the core swells.'
      + ' Release detonates it at your mark, damage compounding up to 4 times base and area up'
      + ' to 60% wider the longer you hold; a bare tap fizzles. You move at half speed while'
      + ' gathering, and the blast has an 18% chance to ignite.',
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
    description: 'MULTITUDE: hammer the button during the cast and every press looses another'
      + ' burning shell. Each shell explodes where it lands, splashing 60% of its damage, with'
      + ' an 11% chance to ignite.',
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
    description: 'CHARGE: hold to build the cast, release to raise a volcano that lobs'
      + ' exploding magma at random ground around it. Charging longer, up to 2.5 seconds, buys'
      + ' a longer, stronger eruption; only one volcano stands at a time.',
    tags: ['spell', 'fire', 'aoe', 'duration', 'totem'], color: '#e0501e',
    manaCost: 30, cooldown: 12, useTime: 0.4,
    castMode: 'charge',
    chargeUp: { maxTime: 2.5, minScale: 0.7, maxScale: 2.2 },
    delivery: {
      type: 'construct', kind: 'eruptor', castSkillId: 'magma_glob',
      range: 240, duration: 5, maxActive: 1, life: 80, placeRange: 340,
      interval: 0.7,
    },
    effects: [],
    requirements: { intelligence: 28 },
    ai: { range: 320, weight: 1, keepDistance: 260 },
  },

  magma_glob: {
    id: 'magma_glob', name: 'Magma Glob', noDrop: true,
    description: 'A gob of molten rock that bursts where it lands, splashing fire with a 12%'
      + ' chance to ignite whatever it catches.',
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
    description: 'Kindles a mote of living fire that hovers at your shoulder for 10 seconds,'
      + ' spitting bolts at whatever comes close; up to 2 at once. It cannot be harmed, only'
      + ' burn out.',
    tags: ['spell', 'fire', 'summon', 'minion', 'duration'], color: '#ffc05a',
    manaCost: 24, cooldown: 9, useTime: 0.6,
    delivery: { type: 'summon', monsterId: 'flame_core', count: 1, maxActive: 2, duration: 10 },
    effects: [],
    requirements: { intelligence: 18, willpower: 14 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
  },

  solar_orb: {
    id: 'solar_orb', name: 'Solar Orb',
    description: 'Hangs a small sun over the field for 7 seconds: every enemy in its light'
      + ' takes continuous fire damage. The orb cannot be attacked, and only one can stand at a'
      + ' time.',
    // 'totem' = the deployed-object umbrella tag (totem supports apply).
    tags: ['spell', 'fire', 'aoe', 'duration', 'aura', 'totem'], color: '#ffd24a',
    manaCost: 26, cooldown: 10, useTime: 0.7,
    delivery: {
      // aims:false — it hangs and radiates; a sun points at nothing.
      type: 'construct', kind: 'pylon', look: 'construct_sun', aims: false,
      range: 150, duration: 7, maxActive: 1, placeRange: 320, invulnerable: true,
      aura: { radius: 150, enemyDps: { amount: 9, type: 'fire' } },
    },
    effects: [],
    requirements: { intelligence: 24 },
    ai: { range: 300, weight: 1, keepDistance: 240 },
  },

  ignite: {
    id: 'ignite', name: 'Ignite',
    description: 'Instantly sets the target ON FIRE with an exceptionally strong burn. Prime'
      + ' fuel for Combustion and Powderkeg alike.',
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
    description: 'Crowns you in fire for 10 seconds: your attacks carry 9 added fire damage'
      + ' while it lasts.',
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
    description: 'Marks a target as ordnance: the cast strikes with fire, and when the mark'
      + ' expires the victim DETONATES, wounding themselves and everything beside them.',
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
    id: 'pillar_of_flame', name: 'Pillar of Flame',
    description: 'Raises a burning ring at the mark that sears its rim at once, then closes'
      + ' inward over 2.6 seconds, cooking everything still inside; each tick carries a 14%'
      + ' chance to ignite. Sigils reshape the cage itself.',
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
    description: 'Draws a burning line across the field that stands for 5 seconds: anything'
      + ' crossing it takes fire damage with a 60% chance to ignite. A sigil bends the wall'
      + ' into a square or triangle, and Elemental Conduction lets your projectiles pick up'
      + ' fire as they pass through.',
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
    description: 'Leaps to the target point in a sheath of flame, untouchable while airborne,'
      + ' then crashes down: enemies under the landing are knocked back, with a 60% chance to'
      + ' ignite.',
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
    description: 'Looses a spray of 4–6 fire projectiles that weave erratically as they fly,'
      + ' each with an 11% chance to set what it hits burning.',
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
    description: 'Unleash a searing cone of fire damage that drags everything it catches toward'
      + ' you instead of away, with a 12% chance to set victims burning.',
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
    description: 'Dash forward in a streak of flame, sowing burning ground along your path that'
      + ' lasts 2.5 seconds and ticks fire damage at whatever stands in it, with an 18% chance'
      + ' to burn.',
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
    description: 'Hurl a spear of ice that SHATTERS on impact, spraying 5 shards in a cone'
      + ' behind whatever it strikes; the spear itself has a 35% chance to chill.',
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
    description: 'Cast off when an Ice Spear shatters, this sliver of flying ice carries cold'
      + ' damage a short way, with a 25% chance to chill.',
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
    description: 'A jagged splinter loosed when the parent projectile shatters, flying a short'
      + ' way and dealing plain physical damage.',
    tags: ['projectile', 'physical'], color: '#c8c0b0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [5, 9] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 180 },
    effects: [{ type: 'damage' }],
  },

  icy_comet: {
    id: 'icy_comet', name: 'Icy Comet',
    description: 'Call a comet of ice down on the target point. It lands 0.9 seconds later,'
      + ' dealing cold damage in a wide area with a 60% chance to chill, and leaves a sheet of'
      + ' ice for 6 seconds: slick footing for everyone, you included.',
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
    description: 'Drive a ring of frost outward around you, dealing cold and physical damage:'
      + ' everything struck is chilled and hurled away. On glare ice a shove keeps travelling;'
      + ' the ground is the other half of this blow.',
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
    description: 'Mark the ground: 0.9 seconds later a maw opens there for 2.4 seconds,'
      + ' dragging everything from well beyond its edge toward the centre while cold damage'
      + ' ticks, with a 50% chance to chill.',
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
    description: 'Breathe a sheet of polished ice over the target ground. The landing deals'
      + ' cold damage with a 40% chance to chill, and the ice stays for 9 seconds; everyone on'
      + ' it slides, you included.',
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
    description: 'CHANNELED: spray a fan of small ice shards for as long as the button is held,'
      + ' 2–3 per burst with a 15% chance to chill, while you move at 40% reduced speed.',
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
    description: 'Open a swirling vortex at the target point that lasts 3.5 seconds, dragging'
      + ' enemies toward its center while its cold ticks at them, with a 30% chance to chill.',
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
    description: 'Conjure a field of grinding frost close by that crawls steadily forward for 4'
      + ' seconds, ticking cold damage into everything it passes over, with a 50% chance to'
      + ' chill.',
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
    description: 'Detonates one of your cold projectiles wherever it is in flight, consuming it'
      + ' for a cold burst at 150% damage; pop a Frozen Orb mid-orbit. With nothing in the air'
      + ' the snap bursts around you instead, and either way it carries a 50% chance to chill.',
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
    description: 'A crushing pulse around you that SHATTERS the chilled and the frozen: their'
      + ' cold statuses are consumed for 100% MORE damage. Chill first, then break.',
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
    id: 'ice_shield', name: 'Ice Shield',
    description: 'GUARD: encase yourself in a shell of ice that blocks from every side. You'
      + ' cannot move, and nothing gets through until the shell breaks or you release it;'
      + ' either way it explodes in a cold burst at half strength, with a 30% chance to stun,'
      + ' shoving everything nearby back. The burst is a spell hit in its own right: your cold'
      + ' and spell power grow it, and it can crit.',
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
    description: 'A tight, fast melee thrust of cold damage carrying an innate +18% critical'
      + ' chance and +30% critical multiplier, with a 30% chance to chill. Press again on the'
      + ' mark to land the flawless cut.',
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
    description: 'CHANNELED: pour a cone of crushing snow forward for as long as the button is'
      + ' held; the longer you hold, the harder it hits and the wider it spreads, up to 150%'
      + ' extra damage and 60% extra area. You stand rooted, and the wall of white shoves'
      + ' everything back, with a 45% chance to chill.',
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
    description: 'Blink to the target point, and the ground you left erupts in frost: cold'
      + ' damage ticks there for 1.2 seconds, and the spot freezes over into ice that lasts 5'
      + ' seconds.',
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
    description: 'TOGGLE AURA (reserves 30 mana): allies inside gain +30 energy shield, while'
      + ' enemies inside suffer 18% less move speed, 12% less attack and cast speed, and take'
      + ' cold damage every second.',
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
    description: 'Raises one servant from a pool of the dead: zombies and skeleton warriors'
      + ' most often, sometimes a skeleton archer, with up to 6 risen at once. The altar drags'
      + ' them up through the soil.',
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
    description: 'Spills one hatchling per cast, chitin drones three times as often as lancers,'
      + ' with up to 6 of the brood loose at once. The hive node splits at the seams and pours.',
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
    description: 'Calls one burning servant through per cast, a flame sprite or a fire cultist'
      + ' at even odds, with up to 5 in the world at once. The rift spits them out still'
      + ' alight.',
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
    description: 'Exhales one frozen servant per cast, most often a zombie, sometimes a frost'
      + ' witch or a brute, with up to 5 standing at once. The stone breathes them out cold.',
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
    description: 'Calves one crystalline body per cast, resonant shardlings most often, prism'
      + ' creepers and lumen wisps rarer, with up to 6 alive at once. The lattice sheds its'
      + ' glittering young.',
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
    description: 'One chime rings through everything standing near, friend, foe, and crystal'
      + ' alike: lightning damage that leaves every body struck ATTUNED to lightning.',
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
    description: 'Everything near takes the wrong note: a burst of chaos damage around the'
      + ' singer that spares neither friend nor foe.',
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
    description: 'Buds off one growth of the Bloom per cast, sporelings most often, then'
      + ' mushroomlings, rarely a puffball, with up to 5 fruiting at once. The sac swells and'
      + ' splits.',
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
    description: 'Cracks one egg per cast, spilling a rockgrub three times as often as a cave'
      + ' bat, with up to 5 of the brood loose at once. The eggs quiver before they give.',
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
    description: 'Sloughs off one living gobbet per cast, a lesser ooze three times as often as'
      + ' a blood mite, with up to 6 crawling at once. The bloom sheds itself, and the'
      + ' sheddings hunt.',
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
    description: 'Sends up one formic per cast, workers three times as often as soldiers, with'
      + ' up to 5 above ground at once. The worked earth gives up its shift.',
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
    description: 'Sets a clutch of eggs at your feet, up to 3 standing at once. An egg that'
      + ' survives 8 seconds HATCHES into 2 formic workers; an egg broken early is only loam.',
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#b09060',
    manaCost: 16, cooldown: 11, useTime: 0.9,
    delivery: {
      type: 'construct', kind: 'pod', look: 'grub_egg',
      range: 0, duration: 8, maxActive: 3, life: 50, placeRange: 110,
      hatch: { skillId: 'egg_hatch_formics' },
    },
    effects: [],
    requirements: { willpower: 18 },
    ai: { range: 260, weight: 2, keepDistance: 160 },
  },
  egg_hatch_formics: {
    id: 'egg_hatch_formics', name: 'The Clutch Hatches', noDrop: true,
    description: 'Bursts a laid egg into 2 formic workers, up to a shared cap of 8. The seams'
      + ' part and the shift reports for work.',
    tags: ['spell', 'summon', 'minion'], color: '#b09060',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'formic_worker', count: 2, maxActive: 8 },
    effects: [],
  },
  // The sylph's puff: pollen in the eye, pollen in the plan.
  pollen_puff: {
    id: 'pollen_puff', name: 'Pollen Puff', noDrop: true,
    description: 'Gold pollen bursts around the caster: chaos damage with an 80% chance to'
      + ' blind and a 50% chance to addle whatever breathes it.',
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
    description: 'Casts a single mote of light downrange: lightning damage with a 20% chance to'
      + ' blind. One word of cold light; it stings more than it says.',
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
    description: 'A slow, sweet nova around the dancer: 85% chance to leave everything caught'
      + ' TRANSFIXED, walking as through honey and sometimes pressing the wrong hand entirely.'
      + ' The hold is a light too interesting to look away from.',
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
    description: 'Spits a sticky lattice at the target point; after a short delay it knots'
      + ' tight, dealing physical damage with a 60% chance to ROOT whoever trusted the floor.'
      + ' The lamp above was never the trap: the floor was.',
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
    description: 'Flashes a stolen signal in a stolen voice: 70% chance to TRANSFIX everything'
      + ' near the burst, while everything unaware farther out is lured toward the light for 6'
      + ' seconds. Coming close enough to see the truth of it is close enough to be held.',
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
    description: 'Throw a false light. Where it lands it stands and LIES for 8 seconds: unaware'
      + ' enemies from far around drift in and mill about it, their attention gathered'
      + ' somewhere you are not. Learned from something in the grove that hunted you the same'
      + ' way.',
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
    description: 'Mark a victim as PREY with the smell of the eaten. While it clings,'
      + ' everything that HUNTS reads them as food: packs converge, lurkers commit, and hunters'
      + ' smell them from far beyond sight. The marked also take slightly increased damage from'
      + ' everyone.',
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
    description: 'Burst the colony\'s own danger-scent in a ring around you: every enemy caught'
      + ' BOLTS as its nerve breaks, and the pack routs as one. For a few long breaths the'
      + ' fight is running away from you; you do the chasing.',
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
    description: 'Pour a slow gold pool of the herd\'s own sweetness at the target point. For'
      + ' 4.5 seconds it draws everything near toward it, and whatever stands in it is MIRED'
      + ' while chaos damage eats at it. Set the table, then serve what comes.',
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
    description: 'Shed the skin the trouble is stuck to: your 4 newest afflictions come off'
      + ' with it, and for 2.5 seconds you gain 20% more movement speed. Insects have escaped'
      + ' this way for a hundred million years.',
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
    description: 'Sling a carved gourd at the target point; after a short fuse it bursts,'
      + ' dealing fire damage around the impact with a 50% chance to inflict HARROWING and a'
      + ' 9% chance to ignite. Whatever the carving means, those caught reading it lose their'
      + ' nerve.',
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
    description: 'Set a hand-lit wick where you point: a small standing light that feeds the'
      + ' Light of everyone in its glow. It burns for every body it warms, twice as fast when'
      + ' shared by two, and gutters out when the pool is drunk. Duration deepens the wick;'
      + ' area widens the glow.',
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
    id: 'harrowing_wail', name: 'Harrowing Wail',
    description: 'Scream a cone of physical damage in front of you: 85% chance to build'
      + ' HARROWING on everything caught, and when the stacks run deep the nerve BREAKS into'
      + ' outright rout. The wail has a winter in it.',
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
    description: 'Plant a bound scarecrow to watch your field, up to 2 standing at once. Its'
      + ' blows carry HARROWING by nature. Scales with your minion stats.',
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
    description: 'Hurls a lit carving: the projectile deals fire damage with a 40% chance to'
      + ' inflict HARROWING and an 11% chance to ignite. The sower is still grinning.',
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
    description: 'Calls 2 carrion crows to the fight, up to 4 aloft at once. The watcher opens'
      + ' its arms and the field answers.',
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
    description: 'Tears the ground open and a rat claws up from the warren, up to 6 loose at'
      + ' once; about one in four rises festering. The floor was never empty.',
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
    description: 'Pours a crawl of 5–8 vermin from the floor around the caster. The piper calls'
      + ' and the boards answer.',
    tags: ['spell'], color: '#8a7a5a',
    manaCost: 0, cooldown: 7, useTime: 0.9,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'vermin_tide', count: [5, 8], scatter: 60 }],
    ai: { range: 300, weight: 2 },
  },
  hurl_swarmpod: {
    id: 'hurl_swarmpod', name: 'Squirming Bundle', noDrop: true,
    description: 'A thrown, squirming bundle bursts where it lands: physical damage on impact,'
      + ' and 3–5 vermin spill from the wrapping. The cargo has teeth.',
    tags: ['spell', 'projectile'], color: '#9a8a62',
    manaCost: 4, cooldown: 5, useTime: 0.8,
    baseDamage: { physical: [3, 5] },
    delivery: { type: 'projectile', speed: 420, radius: 8, range: 400 },
    effects: [{ type: 'damage' }, { type: 'litePour', monsterId: 'vermin_tide', count: [3, 5], scatter: 34 }],
    ai: { range: 400, weight: 3 },
  },
  vent_mites: {
    id: 'vent_mites', name: 'Marrow Boil', noDrop: true,
    description: 'Boils 4–6 grave mites up out of the midden around the caster. Bone chips with'
      + ' appetite.',
    tags: ['spell'], color: '#b0a488',
    manaCost: 0, cooldown: 8, useTime: 1.0,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'grave_mite', count: [4, 6], scatter: 52 }],
    ai: { range: 250, weight: 2 },
  },
  vent_ticks: {
    id: 'vent_ticks', name: 'Reliquary Muster', noDrop: true,
    description: 'Musters 3–4 vault ticks off the lid to swarm the strongbox\'s attackers.'
      + ' Lockwork re-knitting its keepers.',
    tags: ['spell'], color: '#7a9a8a',
    manaCost: 0, cooldown: 9, useTime: 1.1,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'vault_tick', count: [3, 4], scatter: 48 }],
    ai: { range: 250, weight: 2 },
  },
  vent_souls: {
    id: 'vent_souls', name: 'The Unferried Rise', noDrop: true,
    description: 'Raises 5–8 soul motes from the pale water around the caster, drifting toward'
      + ' the warmth of the living. The unferried do not stay down.',
    tags: ['spell', 'cold'], color: '#9fd8ec',
    manaCost: 12, cooldown: 8, useTime: 0.9,
    delivery: { type: 'self' },
    effects: [{ type: 'litePour', monsterId: 'soul_mote', count: [5, 8], scatter: 64 }],
    ai: { range: 300, weight: 2 },
  },

  festering_bite: {
    id: 'festering_bite', name: 'Festering Bite', noDrop: true,
    description: 'Snaps a filthy melee bite of physical and chaos damage: 50% chance to set'
      + ' DECAY rotting in the wound.',
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
    description: 'Hurl a jarred nest that bursts where it lands: physical damage on impact,'
      + ' and 4–6 vermin spill out already knowing their keeper — the throw itself orders'
      + ' the whole swarm onto its mark. About one kill in five shakes another loose from'
      + ' the boards; walk through it to claim it, up to 12 in the swarm. At heel they ring'
      + ' you and chew whatever presses in.',
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
    description: 'Sheds a burning pool of melt that lingers for 2.5 seconds, dealing fire'
      + ' damage to anything standing in it. Nothing of the candle is wasted.',
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#f0c26a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [3, 5] },
    delivery: { type: 'ground', radius: 38, castRange: 60, lingerDuration: 2.5, tickInterval: 0.5, noImpact: true },
    effects: [{ type: 'damage' }],
  },

  wax_flare: {
    id: 'wax_flare', name: 'Wax Flare', noDrop: true,
    description: 'Erupts in a ring of fire damage around the caster. The pool takes the flame'
      + ' and answers.',
    tags: ['spell', 'fire', 'aoe'], color: '#ffb45e',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'nova', radius: 70 },
    effects: [{ type: 'damage' }],
  },

  waxlight_pulse: {
    id: 'waxlight_pulse', name: 'Waxlight', noDrop: true,
    description: 'Pulses a wide ring that stamps WAXLIGHT on everything it touches: the marked'
      + ' are seen, and what the candle sees the whole Court sees. Shadows most of all.',
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
    description: 'A wide, committed melee swing paid from a bank of 3 charges: spend them down'
      + ' to empty, then one restores every 5 seconds. Gems and passives can add charges and'
      + ' quicken the refill.',
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
    description: 'Fires physical bolts from an 8-bolt drum as fast as you can press, with no'
      + ' trickle between shots. Spending the LAST bolt starts the reload clock; when it runs'
      + ' out the drum racks itself full in one motion. Mid-drum, the clock never moves.',
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
    description: 'Blasts 7 pellets of wide, brutal shot at short reach, paid from 3 shells. No'
      + ' clock saves you: the empty gun becomes its own reload, a shell-by-shell channel you'
      + ' may cut short to fight on whatever you racked. Reload early by hand if you choose; a'
      + ' topped drum lowers itself.',
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
    description: 'CHANNELED: ram shells back into the drum, one per beat of the channel, while'
      + ' you move at 45% reduced speed. Cut it short and fight on what you racked; a topped'
      + ' drum lowers the hands itself.',
    tags: ['reload', 'munition', 'channel'], color: '#d89050',
    manaCost: 0, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.55, windup: 0.4, move: 'slowed', moveFactor: 0.55 },
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges', amount: 1 }],
  },

  arquebus: {
    id: 'arquebus', name: 'Long Arquebus',
    description: 'One round, one thunderclap: a physical shot that pierces up to 2 bodies deep.'
      + ' The emptied gun becomes its own reload, a long ram stood still before it speaks'
      + ' again. Charge investment deepens the bank, and one full rite fills all of it.',
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
    description: 'The full rite, stood still: powder, wad, ball, rod. When the bar completes,'
      + ' the bank fills to its cap.',
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
    description: 'Draw the spent chambers back to brimming: a stood rite that refills the'
      + ' vessel to its charge cap when the bar completes.',
    tags: ['reload', 'munition'], color: '#9ae0c8',
    manaCost: 0, cooldown: 0, useTime: 1.2,
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges' }],
  },

  grenado: {
    id: 'grenado', name: 'Grenado',
    description: 'Lob a fizzing iron grenado that bursts where it lands, dealing fire damage in'
      + ' a wide blast. Three ride the satchel: throw them freely, and spending the last starts'
      + ' the refill clock, buckles and straps working while you run.',
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
    description: 'STATIC builds as you walk and when you are struck, banking up to 10 charges.'
      + ' Release burns the whole bank to hurl lightning at up to 5 of the nearest enemies: 12%'
      + ' more damage per charge spent, and a 30% chance to shock.',
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
    description: 'Sweep a wide melee arc in front of you: every enemy struck sheds an orb of 7'
      + ' mana that homes back to you. The caster\'s generator: swing to drink.',
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
    description: 'Tear the blood out of a targeted victim, dealing physical and chaos damage;'
      + ' the wound sheds an orb of 9 LIFE that flies home to you. Sustain with travel time:'
      + ' rip, then drink.',
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
    description: 'Fires a fan of 5 bone shards that each pierce up to 2 enemies, with a 20%'
      + ' chance to inflict bleed. Costs no mana: each cast is paid with 4% of your CURRENT'
      + ' life, so the price falls as your blood does.',
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
    id: 'life_flask', name: 'Life Flask',
    // Copy FLAGGED for Arianna's word (the two-stream rewrite, 2026-08-08).
    description: 'Holds up to 3 charges; every life orb you pick up banks one. Drinking spends'
      + ' a charge to pour TWO streams at once: a SURGE of 15% of your maximum life over 0.4'
      + ' seconds, and a SETTLE of flat life over 4.5 seconds that deepens as the skill'
      + ' levels. A REFLEX press works even mid-cast but is refused at full life, so a sip is'
      + ' never wasted. While slotted, your hits have a 5% chance to shake a life orb loose.',
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
    id: 'mana_flask', name: 'Mana Flask',
    description: 'Banks one charge per mana orb you pick up, holding up to 3. Drinking spends a'
      + ' charge to restore mana over 3 seconds, deeper as the skill levels; a REFLEX press'
      + ' works even mid-cast but is refused at full mana. While slotted, your hits have a 5%'
      + ' chance to shake a mana orb loose.',
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
    id: 'catalyst_flask', name: 'Catalyst Flask',
    description: 'Any orb you pick up feeds this flask, banking up to 6 charges. Drinking'
      + ' consumes the whole bank (at least 2): every charge adds to a pour of life and mana'
      + ' over 3.5 seconds, and the rush grants 15% increased damage and 10% increased move'
      + ' speed for 6 seconds. A REFLEX with no fullness gate, drinkable mid-cast at any life'
      + ' or mana. While slotted, your hits have a 2.5% chance each to shake life and mana orbs'
      + ' loose.',
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
    id: 'quicksilver_flask', name: 'Quicksilver Flask',
    description: 'Drinking spends one of up to 3 charges, banked from any orb you pick up, and'
      + ' grants 30% increased move speed for 4 seconds. A REFLEX with no fullness gate: usable'
      + ' mid-cast or mid-dash. While slotted, your hits have a 2% chance each to shake life'
      + ' and mana orbs loose.',
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
    id: 'stoneskin_flask', name: 'Stoneskin Flask',
    description: 'Spend one of up to 3 charges, banked from any orb you pick up, to gain 45%'
      + ' increased armor for 4.5 seconds. A REFLEX: drinkable even mid-cast, so you can harden'
      + ' before a wind-up lands. While slotted, your hits have a 2% chance each to shake life'
      + ' and mana orbs loose.',
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
    id: 'antidote_flask', name: 'Antidote Flask',
    description: 'Stores up to 2 charges; any orb you pick up banks one. Drinking cleanses up'
      + ' to 3 harmful ailments and grants +50% ailment resistance for 5 seconds; a REFLEX,'
      + ' usable even mid-cast. While slotted, your hits have a 2% chance each to shake life'
      + ' and mana orbs loose.',
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
    description: 'A ring of chaos damage bursts around the drinker, with a 60% chance to poison'
      + ' everything it splashes. The dregs bite whoever crowds the bottle.',
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
    description: 'Grants 18% increased attack speed and cast speed for 3 seconds. The kick'
      + ' behind the drink.',
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
    description: 'Restores 22% of maximum life over 2.5 seconds, refused unless at least 20% of'
      + ' it is missing. A REFLEX, usable even mid-swing: the enemy drinks by the same flask'
      + ' law you do.',
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
    description: 'Your armor detonates in a ring of fire and physical damage around you, with a'
      + ' 9% chance to burn; the blast gains 3 added fire and 3 added physical damage per 50'
      + ' armor worn. While slotted, 8% of your hits and 30% of your kills shake a Wakeflame'
      + ' orb loose, and each Wakeflame you pick up refunds 1 second of this skill\'s cooldown.',
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
    description: 'TOGGLE: lighting the vigil costs 1 Wakeflame and flares you with 15%'
      + ' increased damage, attack speed and cast speed for 4 seconds. While it burns, allies'
      + ' in the ring gain 12% increased damage and 6% increased move speed, and the vigil'
      + ' feeds on one banked Wakeflame every 2 seconds, going dark when the bank runs dry.'
      + ' While slotted, 35% of your kills shake a Wakeflame orb loose.',
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
    description: 'Consumes every banked Wakeflame (at least 1) for a fire nova around you,'
      + ' dealing 40% more damage per flame consumed, with a 12% chance to burn. Every'
      + ' Wakeflame orb you pick up refunds 1.5 seconds of its cooldown; while slotted, 7% of'
      + ' your hits shake one loose and the skill periodically sheds a stray flame nearby.',
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
    description: 'Blink to your aim and detonate physical damage on arrival. Each press spends'
      + ' only one of 3 banked charges yet steps once per charge HELD, every later step'
      + ' re-aimed at the nearest living enemy; one spent charge returns every 4 seconds.',
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
    description: 'MASH while the cast bar runs: every press banks one more step. When the bar'
      + ' completes, all banked steps fire as a staggered flicker of blinks, each re-aimed at'
      + ' the nearest living enemy and each detonating physical damage on arrival.',
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
    description: 'Teleport-strike your aim for physical damage, then step once MORE per banked'
      + ' Frenzy charge, each repeat re-aimed at the nearest living enemy and the whole storm'
      + ' dealing 12% more damage per charge spent. Kills bank one Frenzy charge, up to 3, and'
      + ' held charges quicken your attacks and movement.',
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
    description: 'HOLD to gather, then release to hurtle along your aim as a burning comet,'
      + ' blasting fire at launch and landing with a 14% chance to burn. Gathering up to 1.8'
      + ' seconds scales the blasts from 0.8x to 2.4x damage and up to 1.8x width, but the'
      + ' fully laden comet travels at 45% speed.',
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
    description: 'Lunges at the nearest enemy near your aim, no manual target needed. Bodies'
      + ' along the dash corridor are cut for reduced damage, the arrival bites hardest, and'
      + ' hits have a 30% chance to inflict bleed.',
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
    description: 'CHANNELED: wear the storm; everything caught inside takes physical damage and'
      + ' is buffeted in random directions around the funnel, never simply thrown clear, while'
      + ' you move at half speed. The longer it is held the wider and stronger it grows, up to'
      + ' +140% damage and +110% area; after 6 seconds it must end.',
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
    description: 'CHANNELED: every pulse latches the nearest enemies near your aim, up to 3 at'
      + ' once, tearing chaos damage from each; 35% of the damage dealt returns to you as life.'
      + ' Each pulse has a 30% chance to inflict decay, and you move at 45% speed while'
      + ' drinking.',
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
    description: 'Opens a rift at your feet: every mobile minion blinks to your side, then'
      + ' surges at your mark to fight whatever holds it for 5 seconds. The retreat and the'
      + ' charge on one button.',
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
    id: 'the_amalgam', name: 'The Amalgam',
    description: 'CHANNELED: you stand rooted while every beat consumes one of your minions'
      + ' nearby. On release the eaten fuse into a towering horror that fights for 22 seconds,'
      + ' gaining 16% damage, 22% life and 9% size per body consumed, up to 8. The army was'
      + ' always ingredients.',
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
    description: 'A melee smash in a wide arc in front of you: each enemy struck has a 30%'
      + ' chance to conscript an animated weapon that fights beside you, up to 3 at once.',
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
    description: 'Plants a relic that stands for 12 seconds: every attack you complete, it'
      + ' answers with a burst of physical damage around itself, scaling with your minion'
      + ' investment. Only one stands at a time, and enemies can destroy it.',
    tags: ['spell', 'summon', 'minion', 'totem', 'duration', 'aoe'], color: '#e8d8a0',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    baseDamage: { physical: [4, 6] },
    delivery: {
      type: 'construct', kind: 'relic', castSkillId: 'relic_burst',
      range: 0, duration: 12, maxActive: 1, life: 50, placeRange: 260,
      interval: 0.7,
    },
    effects: [{ type: 'damage' }],
    requirements: { willpower: 18 },
    ai: { range: 200, weight: 1 },
  },

  relic_burst: {
    id: 'relic_burst', name: 'Relic Burst', noDrop: true,
    description: 'A burst of physical damage in a ring around the Warden Relic, cast each time'
      + ' its owner completes an attack. The relic answers.',
    tags: ['spell', 'physical', 'aoe', 'minion'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'nova', radius: 120 },
    effects: [{ type: 'damage' }],
  },

  mender_relic: {
    id: 'mender_relic', name: 'Mender Relic',
    description: 'Places a relic that stands for 12 seconds: every attack you complete, it'
      + ' washes healing over the allies around it. Only one may stand at a time, and enemies'
      + ' can destroy it.',
    tags: ['spell', 'summon', 'minion', 'totem', 'duration', 'heal'], color: '#a8e0b8',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    delivery: {
      type: 'construct', kind: 'relic', castSkillId: 'relic_mend',
      range: 0, duration: 12, maxActive: 1, life: 50, placeRange: 260,
      interval: 0.9,
    },
    effects: [],
    requirements: { willpower: 20 },
    ai: { range: 200, weight: 1 },
  },

  relic_mend: {
    id: 'relic_mend', name: 'Relic Mend', noDrop: true,
    description: 'Washes healing over allies around the Mender Relic each time its owner'
      + ' completes an attack. The vow, kept.',
    tags: ['spell', 'heal', 'aoe', 'minion'], color: '#a8e0b8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 150, affects: 'allies' },
    effects: [{ type: 'heal', amount: 6 }],
  },

  shambler_horde: {
    id: 'shambler_horde', name: 'Shambler Horde',
    description: 'Raises 2 shambling zombies per cast, up to 8 at once, each lasting 25'
      + ' seconds. Slow and numerous: the wall the rest of your necromancy stands behind.',
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#8aa868',
    manaCost: 11, cooldown: 0, useTime: 0.7,
    delivery: {
      type: 'summon', monsterId: 'zombie',
      count: 2, maxActive: 8, duration: 25,
    },
    effects: [],
    requirements: { willpower: 14 },
    ai: { range: 400, weight: 2, keepDistance: 260 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12), mod('minionDamage', 'increased', 0.1)] },
  },

  exhume: {
    id: 'exhume', name: 'Exhume',
    description: 'Drags 2 fresh corpses out of the ground at your mark, ready fuel for any'
      + ' skill that consumes or raises the dead. The graveyard travels with you.',
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
    description: 'Orders every resummonable minion to detonate, each blast dealing 80% of that'
      + ' minion\'s life as damage. Contract bodies refuse the order; they were never yours to'
      + ' spend.',
    tags: ['spell', 'minion', 'instant'], color: '#e86848',
    manaCost: 0, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'detonateMinions', fraction: 0.8 }],
  },

  shatter_totem: {
    id: 'shatter_totem', name: 'Shatterrite', noDrop: true,
    description: 'Detonates your standing constructs: each bursts in a ring for physical damage'
      + ' equal to 120% of its life.',
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
    description: 'Strikes the marked ground with chaos damage, and every status riding every'
      + ' victim there leaps to the enemies around them at full strength, durations restarted'
      + ' fresh. You do not cure a plague; you deliver it.',
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
    description: 'Pulls every affliction off every ally near you onto your own flesh, clocks'
      + ' still running, and each drawn affliction restores a little of your life. Carry it'
      + ' well: you choose where it all goes next.',
    tags: ['spell', 'chaos', 'instant'], color: '#9a78b8',
    manaCost: 10, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'siphonStatus', radius: 280, from: 'allies', healPer: 8 }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  transfusion: {
    id: 'transfusion', name: 'Transfusion',
    description: 'Empties every affliction you carry onto the target at full strength on fresh'
      + ' clocks, alongside a hit of chaos damage; the poured statuses splash over whoever'
      + ' stands close by. What was yours is now theirs.',
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
    description: 'Pours a lingering pool of chaos damage over the marked ground, inflicting'
      + ' decay on those it touches. Every OTHER curse on your bar strengthens it: +30% damage'
      + ' and +25% duration per linked hex. Build the bar like a grimoire.',
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
    description: 'Pronounce sentence on one enemy: a chaos burst that CONSUMES every hex and'
      + ' curse on the victim, dealing 80% more damage for the consuming. Its splash strips and'
      + ' sears their cursed neighbors the same way.',
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
    description: 'Chaos erupts in a nova around you that touches ONLY the cursed: enemies free'
      + ' of hexes are passed over. Every cursed soul struck feeds you a fragment of decaying'
      + ' WARD. Curse wide, then feast.',
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
    description: 'Brand one enemy with a living web of lightning. While the brand rides them,'
      + ' bolts LASH their nearby allies on a steady beat; proximity to the marked is the sin.',
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
    description: 'Sear a brand onto one enemy that makes a single promise: it DETONATES when'
      + ' its victim dies or when its fuse runs out, whichever answers first. Kill fast and the'
      + ' brand pays early; stall, and it pays anyway.',
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
    description: 'Lob three seeking globes of unmaking that burst where they strike, each with'
      + ' a 40% chance to lay Decay. As the rite closes, chaos lashes the ground around the'
      + ' officiant for a breath.',
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
    description: 'Sweep a cone of wildfire that catches at the RIM and cooks inward: the'
      + ' burning edge fills toward you over a breath while the caught ground ticks fire, each'
      + ' hit carrying a 14% chance to Burn. Past the hollow heart there is a moment of grace;'
      + ' the fire is patient.',
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
    description: 'One committed side-to-side pass: a crescent blade at arm\'s length crosses'
      + ' your whole front, cutting whatever it passes exactly once, with a 25% chance to'
      + ' Bleed. The near ground at your boots goes untouched; keep them at blade\'s reach.',
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
    description: 'The close harvest: a SOLID wedge swung once across your front from hip to'
      + ' hip, no hollow heart, cutting everything from your boots to a blade-length out'
      + ' exactly once, with a 25% chance to Bleed. Reaver\'s Sweep keeps the longer reach and'
      + ' the gap; this one keeps the near ground.',
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
    description: 'A hard straight cut to drop the nearest, with a 30% chance to Bleed. A beat'
      + ' later the blade comes all the way around on its own: a full sweep across your front,'
      + ' free. Strike; the harvest follows.',
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
    description: 'The free second half of Harvest Stroke: the blade comes around on its own in'
      + ' a full sweep across your front, cutting each enemy it crosses once, with a 20% chance'
      + ' to Bleed.',
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
    description: 'Two sweeps rise, one from each flank, and close on your bearing together.'
      + ' Each wing cuts an enemy exactly once, with a 25% chance to Bleed and a 12% chance to'
      + ' stun; whatever stands where the blades MEET is cut by both. Herd them to the middle,'
      + ' then applaud.',
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
    description: 'Seed six sparks directly beneath the enemies in a wide area at your mark,'
      + ' each one a visible telegraph on a short fuse. Then the field goes up, every burst'
      + ' carrying a 30% chance to Shock.',
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
    description: 'Release a ring of living wind that expands around you: you and allies inside'
      + ' it gain 20% increased movement speed and 12% increased attack speed, while the wall'
      + ' shocks what it touches with a 35% chance. After a breath the ring RETRACTS, closing'
      + ' home and detonating at your feet at 2.2 times the damage. Breathe out, breathe in,'
      + ' thunder.',
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
    description: 'Wear a biting cloud that follows you for 4 seconds, chewing everything beside'
      + ' you tick after tick with a 25% chance to Poison. One swarm at a time: recasting'
      + ' relocates the hunger.',
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
    description: 'Coil a freezing field around your shoulders that follows you for 3.5 seconds,'
      + ' each tick carrying a 40% chance to Chill. Every cast is its OWN layer on its own'
      + ' clock: stack coats, then walk into the pack.',
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
    description: 'Tear the earth open along your aim: a crack races out segment by segment,'
      + ' wounding everything it opens under, then SNAPS SHUT and hits them again for 70% of'
      + ' the damage on the way home. Each hit has a 15% chance to stun. Supports fan extra'
      + ' cracks and fork branches.',
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
    description: 'Fire the CRACK itself: a shot that pierces up to two enemies while the ground'
      + ' rips open along its whole flight, ticking while it stands and snapping shut behind'
      + ' for one more hit. Bend the flight and the wound bends with it: bounces and curves'
      + ' carry the crack.',
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
    description: 'Open one wound in the world: a fissure that holds for 6 seconds, cooking'
      + ' whatever stands over it with a 9% chance to Burn, while SPIRITS rise from its length'
      + ' every 1.4 seconds to hunt the living and lay Torment. Casting again closes the old'
      + ' wound and opens a new one.',
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
    description: 'A grave-light loosed from the fissure: it drifts on an erratic path, seeks'
      + ' the living, and lays Torment on whatever it touches.',
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
    description: 'Split the ground at your OWN feet and let something patient live in it: for 7'
      + ' seconds tendrils lash from the crack\'s whole length, seizing whoever strays near,'
      + ' wringing the speed from them, and envenoming what little they keep. Casting again'
      + ' relocates the tenant. Stand by your wound; it works for you.',
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
    description: 'One lash out of the chasm: the tendril takes HOLD, ensnaring its victim for'
      + ' 1.5 seconds, with a 60% chance to Poison. The grip slows; the venom stays.',
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
    description: 'SLAM the ground within arm\'s reach and project the break: a fissure tears'
      + ' outward along your aim, splitting whatever stands on the line, with a 12% chance to'
      + ' stun. The crack is the weapon: warp it, arm it, fan it.',
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
    description: 'A stance, not a single cast: while it burns, a fissure TEARS OUT from you in'
      + ' a random direction every 2.6 seconds, all on its own, each tear carrying an 8% chance'
      + ' to stun. Your fissure gems ride every beat; extra fissures fan every tear. Press'
      + ' again to let the earth rest.',
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
    description: 'Four restless spirits rise in a ring around you and wander where they will'
      + ' for 5 seconds, drifting through everything, laying Torment on whatever they cross,'
      + ' and biting the same victim again as they linger. They answer to no aim: more'
      + ' projectiles means more ghosts, and more duration keeps the veil open longer.',
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
    description: 'Loose a straight bolt of packed ice, no seeking, that BURSTS where it lands'
      + ' and leaves a patch of winter for 4.5 seconds. The bolt flies dumb; the patch does the'
      + ' hunting, slinking after whatever lives nearby and gnawing everything it slides'
      + ' beneath, with a 60% chance to Chill.',
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
    description: 'A crown of five stone spires rises around the mark: standing cover that'
      + ' blocks the way for up to 12 seconds. Your own blows demolish a spire at four times'
      + ' the rate, and every spire DETONATES as it dies, each burst carrying a 20% chance to'
      + ' stun. Conjure the wall; then decide it was ammunition.',
    tags: ['spell', 'physical', 'aoe', 'totem', 'duration'], color: '#b0a08a',
    manaCost: 15, cooldown: 6, useTime: 0.6,
    baseDamage: { physical: [10, 16] },
    delivery: {
      type: 'construct', kind: 'barrier',
      range: 0, duration: 12, maxActive: 10, life: 44,
      placeRange: 240,
      ring: { segments: 5, radius: 85 },
      breakable: { ownerMult: 4 },
      deathBurst: { radius: 95, damageScale: 1 },
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
    description: 'Raise a rampart of ice, six segments across the way: they SHOVE the crowd'
      + ' aside as they rise and pulse cold over whatever presses close, with a 90% chance to'
      + ' Chill. The wall answers to frost: your own blows crack a segment at 2.5 times the'
      + ' rate and cold damage at twice the rate, and every broken segment bursts into freezing'
      + ' shrapnel. A wall first; a volley whenever you say so.',
    tags: ['spell', 'cold', 'aoe', 'totem', 'duration'], color: '#9ad4f0',
    manaCost: 16, cooldown: 7, useTime: 0.6,
    baseDamage: { cold: [8, 13] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_ice',
      range: 0, duration: 9, maxActive: 12, life: 32,
      placeRange: 340,
      wallSegments: 6,
      breakable: { ownerMult: 2.5, affinityTags: ['cold'], affinityMult: 2 },
      deathBurst: { radius: 85, damageScale: 0.8 },
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
    description: 'Wall the way with five slabs of living meat that soak whatever comes,'
      + ' standing up to 11 seconds. Your own blows carve a slab three times as fast, and every'
      + ' slab DETONATES as it dies, its shrapnel carrying a 45% chance to Bleed. Butchery is a'
      + ' siege discipline.',
    tags: ['spell', 'physical', 'chaos', 'totem', 'duration', 'aoe'], color: '#c05a4a',
    manaCost: 17, cooldown: 8, useTime: 0.7,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_bone',
      range: 0, duration: 11, maxActive: 10, life: 55,
      placeRange: 300,
      wallSegments: 5,
      breakable: { ownerMult: 3 },
      deathBurst: { radius: 85, damageScale: 0.9 },
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
    description: 'Hooked spurs of raw flesh erupt at the mark, rending everything standing'
      + ' there with a 40% chance to Bleed. Then the meat TWITCHES: one more convulsion a'
      + ' breath later at 1.5 times the damage, over slightly wider ground. Anatomy, weaponized'
      + ' twice.',
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
    description: 'Crack a rift in the air where you place it: for 4 seconds it fires an'
      + ' ice-shard barrage down its lane every half second. Up to two rifts stand at once, and'
      + ' the rift itself cannot be struck. Artillery you place, then feed with position.',
    tags: ['spell', 'cold', 'projectile', 'totem', 'duration'], color: '#9ac8f0',
    manaCost: 12, cooldown: 5, useTime: 0.55,
    baseDamage: { cold: [3, 5] },
    delivery: {
      type: 'construct', kind: 'sentry', look: 'construct_rift', castSkillId: 'rift_shard',
      range: 440, duration: 4, maxActive: 2, invulnerable: true,
      placeRange: 300, interval: 0.5,
    },
    effects: [{ type: 'damage' }],
    requirements: { intelligence: 18 },
    ai: { range: 380, weight: 2, keepDistance: 260 },
  },

  rift_shard: {
    id: 'rift_shard', name: 'Rift Shard', noDrop: true,
    description: 'One barrage out of the rift: three shards in a tight fan, each able to pierce'
      + ' a single enemy, with a 35% chance to Chill.',
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
    description: 'Place a mark; after a breath, lightning takes it, and every OTHER living mark'
      + ' fires with it. Up to five marks stand at once, so one firing collapses the whole set'
      + ' in a ripple of bolts, each with a 30% chance to Shock. The cap grows with storm'
      + ' investment.',
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
    description: 'CHANNELED: while the button is held, slow orbs of energy drift toward your'
      + ' mark, each bursting small where it lands, and you move at 40% reduced speed. Let go'
      + ' and every orb still in the air DETONATES at once at 2.1 times the damage. Hold to'
      + ' spread the swarm; release to close the trap.',
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
    description: 'Hurl a spear that pierces up to two enemies and LODGES where it stops,'
      + ' standing for 10 seconds. Run over a lodged spear to DETONATE it under whoever stands'
      + ' near. Socket Enduring Snares and the spears re-arm on their own clocks: a minefield'
      + ' you replant by walking it.',
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#c8b090',
    manaCost: 5, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [11, 17] },
    delivery: {
      type: 'projectile', speed: 620, radius: 9, range: 380, pierce: 2,
      plantOnLand: {
        duration: 10, life: 30,
        embed: { runOver: 'detonate', detonateSkillId: 'lance_burst' },
      },
    },
    effects: [{ type: 'damage' }],
    requirements: { strength: 16, dexterity: 12 },
    ai: { range: 340, weight: 2, keepDistance: 200 },
  },

  lance_burst: {
    id: 'lance_burst', name: 'Lance Burst', noDrop: true,
    description: 'The lodged spear shatters into a ring of splinters around itself, with a 30%'
      + ' chance to Bleed.',
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
    description: 'Drive a brand into the target ground: it erupts with fire, lightning and cold'
      + ' on arrival, then calls storm-bolts down around itself for 5 seconds. Up to 2 can'
      + ' stand at once. Artillery you place and walk away from.',
    tags: ['spell', 'fire', 'lightning', 'cold', 'aoe', 'totem', 'duration'], color: '#d8a84a',
    manaCost: 14, cooldown: 6, useTime: 0.6,
    baseDamage: { fire: [4, 7], lightning: [4, 7], cold: [4, 7] },
    delivery: {
      type: 'construct', kind: 'eruptor', castSkillId: 'beacon_bolt',
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
    description: 'A small burst of fire, lightning and cold strikes the marked ground after a'
      + ' brief delay: 12% chance each to shock and chill, and a 4% chance to burn. One tongue'
      + ' of the beacon\'s storm.',
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
    description: 'Loose a fan of 4 charged arrows that lodge where they land for 6 seconds;'
      + ' every lodged arrow arcs a beam to its nearest kin each second, damaging everything'
      + ' along the line. Hits have a 20% chance to shock. The Tripwire gems add a second web.',
    tags: ['attack', 'projectile', 'lightning', 'duration', 'aoe'], color: '#d8e86a',
    manaCost: 9, cooldown: 1.5, useTime: 0.7,
    baseDamage: { physical: [5, 8], lightning: [5, 9] },
    delivery: {
      type: 'projectile', speed: 540, radius: 7, range: 420,
      count: 4, spreadDeg: 46,
      plantOnLand: {
        duration: 6, life: 20,
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
    description: 'Raise a five-segment wall of ice across your facing that blocks movement:'
      + ' enemies must break it or walk around. For 7 seconds it pulses cold damage at'
      + ' everything near it, with a 65% chance to chill. Stand behind your weather.',
    tags: ['spell', 'cold', 'totem', 'aoe', 'duration'], color: '#a8d8f0',
    manaCost: 13, cooldown: 7, useTime: 0.6,
    baseDamage: { cold: [6, 10] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_ice',
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
    description: 'Lay a line of razor frost as ground, not stone: no collision, but it deals'
      + ' cold damage and shoves everyone off the line as it rises, and every attempted'
      + ' crossing for 6 seconds cuts and shoves them back, with an 80% chance to chill. A wall'
      + ' you can walk through, once you have paid.',
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
    description: 'Set a trap that waits up to 20 seconds: when sprung, it spins up a revolving'
      + ' tongue of flame that sweeps the ground around it over and over, with a 14% chance to'
      + ' burn whatever it catches. Up to 3 can wait at once.',
    tags: ['spell', 'fire', 'trap', 'aoe', 'duration', 'totem'], color: '#ff8a3a',
    manaCost: 10, cooldown: 3, useTime: 0.45,
    baseDamage: { fire: [8, 13] },
    delivery: {
      type: 'construct', kind: 'trap', castSkillId: 'cinder_whirl',
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
    description: 'A burning crescent revolves around the sprung trap for 3.5 seconds, striking'
      + ' whatever it sweeps across: 12% chance to burn.',
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
    description: 'Conjure a searing sphere that orbits you for 6 seconds, dealing fire and'
      + ' lightning damage to whatever it touches again and again, while lightning arcs off it'
      + ' into nearby enemies throughout its flight. Every hit has a 9% chance to burn. A moon'
      + ' with opinions.',
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
    id: 'aftershock_snare', name: 'Aftershock Snare',
    description: 'Bury a tripplate that waits up to 20 seconds: the spring\'s physical blast'
      + ' scatters into 2 aftershocks rippling out around the victim, with a 30% chance to'
      + ' stun. Up to 3 can wait at once. The Aftershocks support, packaged as a trap.',
    tags: ['spell', 'physical', 'trap', 'aoe', 'totem'], color: '#c8a878',
    manaCost: 9, cooldown: 2.5, useTime: 0.45,
    baseDamage: { physical: [10, 16] },
    delivery: {
      type: 'construct', kind: 'trap', castSkillId: 'snare_shock',
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
    description: 'One burst of physical damage around the victim that scatters into 2 trailing'
      + ' aftershocks: 25% chance to stun. The snare\'s blast, and its echoes.',
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
    id: 'piledriver', name: 'Piledriver',
    description: 'One blow, placed like a foundation: a slow crushing melee strike that banks 2'
      + ' Fury (to a cap of 5), deals 50% more poise damage, and has a 15% chance to stun. Bank'
      + ' with this, spend with Reckoning.',
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
    id: 'stalk', name: 'Stalk',
    description: 'Drop into the hunter\'s hush for 10 seconds: you are 45% less detectable,'
      + ' your acts generate 35% less threat, and you move at 8% reduced speed. The wild'
      + ' answers those who arrive unannounced.',
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
    id: 'caltrops', name: 'Caltrops',
    description: 'Strew forged spikes across the target ground for 8 seconds: whatever crosses'
      + ' the field takes repeated small physical cuts, with a 50% chance to bleed and a 40%'
      + ' chance to be left reeling. The cheapest word for "not through here".',
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
  // fury banked a knuckle at a time, the third beat swinging heavier.
  one_two: {
    id: 'one_two', name: 'One-Two',
    description: 'Work the jab: a fast melee strike that banks 1 Fury per hit (to a cap of 5).'
      + ' Every third cast arms the cross, and your next melee blow within 6 seconds lands'
      + ' stunning. The pit\'s arithmetic: one, two, three.',
    tags: ['attack', 'melee', 'physical'], color: '#d8a878',
    manaCost: 2, cooldown: 0, useTime: 0.35,
    baseDamage: { physical: [6, 10] },
    castCycle: {
      count: 3,
      buff: {
        type: 'buff', id: 'one_two_cross', duration: 6, maxStacks: 1,
        mods: [],
        nextHit: { tags: ['melee'], status: 'stun', statusScale: 1.5 },
      },
    },
    delivery: { type: 'melee', range: 46, arcDeg: 50 },
    effects: [
      { type: 'damage' },
      { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
    ],
    requirements: { prowess: 10 },
    ai: { range: 50, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('attackSpeed', 'increased', 0.02)] },
  },

  // The Brawler's answer to Reckoning — same Fury court, different verdict:
  // Reckoning buys damage, the haymaker buys DISPLACEMENT. Spend where the
  // wall is.
  haymaker: {
    id: 'haymaker', name: 'Haymaker',
    description: 'Load the hips and swing: a wound-up melee hook that spends every banked Fury,'
      + ' each charge spent adding 15% damage, and knocks the victim flying back across the'
      + ' pit, with a 25% chance to stun and 35% more poise damage. The knockout is optional;'
      + ' the flight is not.',
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
    id: 'battle_standard', name: 'Battle Standard',
    description: 'Plant the colors: a standing banner grants allies fighting beneath it 12%'
      + ' increased damage and 5% increased movement speed for as long as the cloth flies, up'
      + ' to 16 seconds. Enemies can cut it down early. The line holds where the banner does.',
    tags: ['spell', 'totem', 'aura', 'duration', 'warcry'], color: '#e0b060',
    manaCost: 20, cooldown: 10, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'pylon', aims: false,
      range: 0, duration: 16, maxActive: 1, life: 70, placeRange: 240,
      aura: {
        radius: 180,
        allyMods: [mod('damage', 'increased', 0.12), mod('moveSpeed', 'increased', 0.05)],
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
    id: 'single_out', name: 'Single Out',
    description: 'Call out a single enemy: it is taunted, forced to answer you, and stands'
      + ' exposed, its health readable by the whole warband. The call is loud by design,'
      + ' generating 50% more threat.',
    tags: ['warcry', 'targeted', 'duration'], color: '#e8c04a',
    manaCost: 10, cooldown: 8, useTime: 0.3,
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
    id: 'war_chant', name: 'War Chant',
    description: 'Raise the marching verse: a ring of battle-music follows you for 6 seconds,'
      + ' granting allies inside 10% increased damage and 6% increased attack and cast speed.'
      + ' Each singing banks a Verse, to a cap of 5; the Coda spends them all.',
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
    id: 'dissonance', name: 'Dissonance',
    description: 'Sing the wrong note on purpose: a ring of grinding discord follows you for 6'
      + ' seconds, dealing chaos damage to whoever stands in it with a 15% chance per hit to'
      + ' befuddle. Each singing banks a Verse, to a cap of 5, for the Coda.',
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
    id: 'coda', name: 'Coda',
    description: 'End the song on everyone at once: a crashing physical nova that spends every'
      + ' banked Verse, each one adding 30% damage, and knocks the crowd back with a 25% chance'
      + ' to bewilder. Silence, as a weapon, arrives loudest.',
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
    id: 'beguile', name: 'Beguile',
    description: 'Hurl a whispered suggestion as a chaos projectile: the struck mind turns'
      + ' maddened, swinging at whatever stands nearest, friend first, with a 40% chance to'
      + ' also be befuddled. You never drew a blade; that was the point.',
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
    id: 'mantra_strike', name: 'Mantra Strike',
    description: 'An open-palm melee strike that settles deeper with repetition: each hit'
      + ' stacks 6% increased damage and 8% increased poise damage for this skill alone, up to'
      + ' 6 stacks, and the stacks peel away one at a time once the rhythm rests. Not fury.'
      + ' Practice.',
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
    description: 'The swing you were born holding: a wide melee arc that costs nothing and'
      + ' needs no gem. It will never grow stronger, and it can never be taken away.',
    tags: ['attack', 'melee', 'physical'], color: '#b8b0a0',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'melee', range: 48, arcDeg: 100 },
    effects: [{ type: 'damage' }],
    ai: { range: 50, weight: 1 },
  },

  long_exhale: {
    id: 'long_exhale', name: 'Long Exhale',
    description: 'Hold the button to gather breath, then release a rolling cone of forced air:'
      + ' damage scales with the hold, from 0.7x on a quick release to 2.4x at a full'
      + ' 1.8-second hold, and the cone widens up to 1.5x. The blast shoves enemies back with a'
      + ' 40% chance to leave them winded. The monk\'s argument: patience, exhaled.',
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
    description: 'Lay a hand on a WEAKENED enemy and step out of your own flesh into theirs:'
      + ' their legs, their arts, their standing among their kind, until the clock runs out,'
      + ' the body fails, or your abandoned husk suffers enough to call you home. The husk'
      + ' stands entranced and mortal the whole while; what you risk was never the borrowed'
      + ' body. Press again to relinquish.',
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
    description: 'Let the borrowed flesh go. It remembers nothing kindly: it staggers where you'
      + ' drop it, and you wake in your own body, wherever you left that.',
    tags: ['possession', 'instant'], color: '#b8a8e8',
    manaCost: 0, cooldown: 0.5, useTime: 0.1,
    delivery: { type: 'self' },
    effects: [{ type: 'possessEnd' }],
  },
  form_of_the_dire_wolf: {
    id: 'form_of_the_dire_wolf', name: 'Form of the Dire Wolf',
    description: 'Wear the wolf you have studied: a minted body at your own level, its legs,'
      + ' its rend, its hunger, while your flesh travels WITHIN, beyond any reach. The form\'s'
      + ' death throws you back into yourself, staggered. Press again to return.',
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
    description: 'Shed the form. It disperses like breath off a pane, and'
      + ' your own body takes the next step as if it had walked here.',
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
    description: 'A pale mote of chaos that weakens whoever it strikes: the struck sit a'
      + ' half-step loose in their own seat, softer, slower to argue.',
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
    description: 'Close the hand: a melee grab that hoists the victim and CARRIES it,'
      + ' struggling and jostling, until you drop it, lose the grip, or Heave it somewhere'
      + ' instructive. Mass is the whole contract: grow your weight and grip, or hold only what'
      + ' is smaller than your argument.',
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
    description: 'Spend the catch: whatever your hands hold leaves them at speed toward the'
      + ' cursor, with your whole weight behind it. Walls end the flight the hard way, lighter'
      + ' bodies in the lane are bowled through, and a chasm keeps what it is given, with your'
      + ' name on the credit. Nothing held, nothing thrown.',
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
    description: 'A barbed hook thrown flat on a waxed line: the catch is hauled in and DRAGGED'
      + ' behind the wrangler, out of its line and away from its friends, until the grip is'
      + ' struggled off or torn open.',
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
    description: 'The yoke-bearer\'s answer to footwork: both fists close and the catch goes'
      + ' DOWN, pinned under old timber and older technique, held for the hammering, or for the'
      + ' toss.',
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
    description: 'What the clinch caught, the toss SPENDS: the pinned body leaves the yoke-mauler\'s hands toward whatever will stop it least gently. The old schools called the pair one word.',
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
    description: 'The whole argument in one bite: the catch is swallowed, hidden, digested, and'
      + ' leeched, until it carves its way back out, is torn free by its friends, or is SPAT at'
      + ' speed at whoever the gullet\'s owner likes least. The gulletsack bulges while it'
      + ' works. That is not decoration; that is your friend.',
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
    description: 'The swing wounds what it catches and closes a CARRY grip: the victim is'
      + ' hoisted and hauled wherever the yeti walks until the grip is struggled off, torn open'
      + ' by allied blows, or spends itself. A hand the size of a door, and you are the'
      + ' luggage.',
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
    description: 'Usable only while a body is held: the yeti spends its catch, hurling the'
      + ' carried victim at avalanche speed to strike for half again this skill\'s damage'
      + ' wherever the flight ends, at a wall, down a drop, or through the rest of your'
      + ' expedition. Winter does not aim carefully.',
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
    description: 'A line of living current: the first body it strikes takes cold damage and is'
      + ' seized in a DRAG grip, reeled back toward the naiad and the water she stands in.'
      + ' Struggling breaks the hold like any other; where you stand when it snaps is the'
      + ' lesson.',
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
    description: 'Hurl a spinning blade that pierces up to 2 bodies and wheels back to your'
      + ' hand: each catch banks 1 Gyre charge, up to 6 held. Gyre Hurl spends the bank as'
      + ' extra blades.',
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
    description: 'Spring backward as you throw: one blade, plus one more per banked Gyre charge'
      + ' spent, fans out from where you stood, and every spent charge adds 5% damage. With an'
      + ' empty bank it still throws the one desperate knife.',
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
    description: 'Each press plants an anchor, three in all inside a 4 second window; the third'
      + ' press looses the blade, which shuttles anchor to anchor for 5 seconds and can cut the'
      + ' same body as often as every 0.7 seconds. Draw a good triangle.',
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
    description: 'One ethereal arrow hangs in the air per press, up to 4, each waiting up to 24'
      + ' seconds. A full set is a live trap: prey straying near any arrow, or your own next'
      + ' press, collapses them into the volley, the blade shuttling point to point for 5'
      + ' seconds through everything that sprang it. Draw the killing geometry before the'
      + ' fight.',
    tags: ['attack', 'projectile', 'physical', 'duration'], color: '#a8c8d8',
    manaCost: 5, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [9, 14] },
    delivery: {
      type: 'projectile', speed: 600, radius: 11, range: 420,
      duration: 5, rehit: 0.7,
      caroms: { anchors: 4, window: 4, hang: { triggerRadius: 90, duration: 24 } },
    },
    effects: [{ type: 'damage' }],
    requirements: { dexterity: 24 },
    ai: { range: 320, weight: 1, keepDistance: 220 },
  },

  heartchaser: {
    id: 'heartchaser', name: 'Heartchaser',
    description: 'An arrow with one name on it: it homes on the nearest enemy and passes'
      + ' harmlessly through every other body. Striking gives it a 60% chance to recurve and'
      + ' hit again, that chance shrinking by a fifth with each pass; if its prey falls, it'
      + ' picks a new mark. Up to 4 seconds in the air.',
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
    description: 'Loose a seeking projectile with a 4.5 second life: it pierces its victim,'
      + ' wheels around, and returns for more, able to strike the same body as often as every'
      + ' 0.55 seconds until its time runs out.',
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
    description: 'A bolt that refuses the straight line: it kinks hard every 0.22 seconds of'
      + ' flight and on each body it pierces, up to 3, and every turn sheds 1 shard down the'
      + ' path not taken. Each hit has a 20% chance to shock; Puppet Strings can steer the'
      + ' angles.',
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
    description: 'A slow, patient seeker of cold: it creeps toward the nearest living thing for'
      + ' up to 6 seconds and bursts where it connects, with a 70% chance to chill. Easy to'
      + ' outwalk, costly to ignore; duration investment stretches the stalk.',
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
    description: 'Three talons of ice fan out wide and hook back to converge on your mark, each'
      + ' detonating in a frost burst where the claw closes. Every burst carries a 50% chance'
      + ' to chill.',
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
    description: 'An ice burst strikes your mark, then 2 more march onward along your aim, each'
      + ' 30% larger and dealing 25% more damage than the last. Every burst has a 50% chance to'
      + ' chill.',
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
    description: 'Where you hold the mark decides the volley\'s shape: 5 arrows leave at once,'
      + ' splayed wide as a wall at point-blank aim and choked to a tight lance at full reach.',
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
    description: 'Loose a sheaf skyward and let it fall: 8–11 arrows rain across the marked'
      + ' ground in a rapid drumming sequence, each striking a small patch where it lands.',
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
    description: 'Send out a slow, drifting twister that lives for 5 seconds: it wanders as it'
      + ' flies, passes through every body it hits, knocks each aside, and bounces off walls up'
      + ' to 5 times. Fired down a canyon, the walls aim it for you.',
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
    description: 'The unruly twin pierces nothing: every body it strikes deflects it onto a new'
      + ' line and is shoved hard away, and walls throw it back up to 6 times across its 5'
      + ' second life. It hits, and hits, and does not settle.',
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
    description: 'Each swing cuts an arc of physical and lightning damage and banks 1 Storm'
      + ' charge, up to 8. On a clock that quickens as the bank fills, a charge leaps free as a'
      + ' bolt at 55% of the swing\'s damage toward the nearest enemy; stop swinging and the'
      + ' stored storm spends itself dry.',
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
    description: 'One button, three cuts: the opener flows into the wider BISECT, and a third'
      + ' press in rhythm closes the TRISECT, a full circle of steel at double weight. Each'
      + ' follow-up must come within 2 seconds or the figure resets.',
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
    description: 'The answering cut of the Trisect figure: a wider melee arc that lands harder'
      + ' than the opener.',
    tags: ['attack', 'melee', 'physical'], color: '#d8c88a',
    manaCost: 3, cooldown: 0, useTime: 0.45,
    baseDamage: { physical: [10, 15] },
    delivery: { type: 'melee', range: 58, arcDeg: 140 },
    effects: [{ type: 'damage' }],
  },

  trisect_finisher: {
    id: 'trisect_finisher', name: 'Trisect', noDrop: true,
    description: 'The closing figure of the Trisect chain: a full circle of steel around you at'
      + ' roughly double the opener\'s weight, knocking enemies back.',
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
    description: 'Every landed swing stacks fervor: 5% increased attack damage and 2% increased'
      + ' attack speed per stack, up to 8. Stacks fade after 2.2 seconds, but any fresh cut'
      + ' refreshes the entire pile.',
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
    description: 'The patient inverse of Carve: each hit adds a stack of 4% increased attack'
      + ' damage, up to 12, and every stack burns down its own 4.5 second clock. Nothing'
      + ' refreshes; old cuts close as new ones open, and steady pressure holds the deepest'
      + ' pile.',
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
    id: 'invocation', name: 'Invocation',
    description: 'Carried on your bar, every fire, cold, or lightning cast banks its rune'
      + ' (Ember, Rime, or Arc), and channels weave one rune per held second. Casting consumes'
      + ' the whole sequence: the combination and its order choose the working, the closing'
      + ' rune sets the element, and every rune spent makes the release stronger.',
    tags: ['spell', 'aoe'], color: '#c8a8e8',
    manaCost: 9, cooldown: 2, useTime: 0.5,
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
    description: 'The pure fire triad\'s working: a wide ground eruption that lingers for 2.5'
      + ' seconds, ticking damage the whole while, with an 18% chance to set victims burning.',
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
    description: 'The pure lightning triad\'s working: 7 bolts hammer the target ground in'
      + ' rapid sequence, each with a 35% chance to shock.',
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
    description: 'The pure cold triad\'s working: a burst of frost across the target ground'
      + ' with an 80% chance to chill, leaving a sheet of ice underfoot for 4 seconds.',
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
    description: 'An ordered pair\'s working: a fast lance that pierces up to 3 bodies and'
      + ' detonates in a burst where its flight ends.',
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
    description: 'All three schools woven at once: 10 strikes fall across a wide field, each'
      + ' carrying a 20% chance to shock and to chill, and a 7% chance to burn. The sky stops'
      + ' picking sides.',
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
    description: 'The working of a sequence matching no greater pattern: one clean elemental'
      + ' burst at the marked ground. Runes never go to waste.',
    tags: ['spell', 'aoe'], color: '#c8b8e0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [12, 18] },
    delivery: { type: 'ground', radius: 110, castRange: 480, delay: 0.15 },
    effects: [{ type: 'damage' }],
  },

  // ======================= Seals, Forms & Oblations ========================
  // Reservation/drain toggles: root-and-ramp Forms, life seals with
  // deactivation payloads, and the corpse-fed offering rites.

  stormbind: {
    id: 'stormbind', name: 'Stormbind',
    description: 'FORM: bind yourself into the storm. You stand rooted while the mana drain'
      + ' mounts every second, but you gain 35% more spell damage and 25% increased cast speed'
      + ' at 25% more mana cost, and lightning gnaws everything near you while the bind holds.',
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
    description: 'FORM: the fire twin. Rooted, the drain mounting each second, you deal 30%'
      + ' more fire damage with 30% increased fire status magnitude while a ring of flame cooks'
      + ' everything around you.',
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
    description: 'FORM: wear the cold as armor. While the upkeep holds you take 18% less damage'
      + ' and gain +20% cold resistance and 35% resistance to cold ailments, and you stay free'
      + ' to walk. It drops the moment the pool runs dry; Blood Price pays it in blood instead.',
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
    description: 'SEAL your health in place for up to 5 seconds: nothing can raise it, 45% of'
      + ' every incoming blow is spread out over time, and your damage reduction climbs with'
      + ' missing health, up to 55%. Breaking the seal, by your hand or its own fuse, tolls the'
      + ' DEATH KNELL: 35% stronger per held second, capped at 2.8x, and stronger again the'
      + ' more blood you were missing.',
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
    description: 'The open-ended pact: your health seals with no fuse but your nerve, 55% of'
      + ' each blow spreads over time, and damage reduction climbs with missing health up to'
      + ' 45%. Your life bleeds away at 1.5% per second while it holds, faster every second. On'
      + ' release the DEATH KNELL grows 22% per held second, capped at 3.6x, and swells with'
      + ' how deep you let the wound get.',
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
    description: 'Grave-force rings out in a nova around the unsealed, dealing physical and'
      + ' chaos damage with a 40% chance to weaken each victim. The seal breaks, and the bell'
      + ' tolls once.',
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
    description: 'CHANNELED: wrap yourself in cursed grave-fog for as long as the button is'
      + ' held. Incoming hits pass through you entirely, though damage over time still finds'
      + ' you, and every pulse deals chaos damage around you with a 35% chance to decay. The'
      + ' shroud drinks your life as well as your mana each pulse, and you move at 45% reduced'
      + ' speed.',
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
    description: 'Spend 30% of your CURRENT life to gain 25% more damage, 18% increased attack'
      + ' speed and 18% increased cast speed for 5 seconds.',
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
    description: 'Pour out a third of your maximum mana for 5 seconds of sharpened focus: 20%'
      + ' more spell damage, 20% increased area of effect and +5% spell critical chance.',
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
    description: 'Consume a corpse into a ring of grave-incense that stands where the body'
      + ' fell. For 8 seconds, your minions inside it gain 30% increased haste, attack speed'
      + ' and cast speed, plus 25% increased movement speed.',
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
    description: 'A seeking wisp of grave-flame: this homing chaos projectile carries a 25%'
      + ' chance to decay what it strikes. The risen effigy spits it off the incense.',
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
    description: 'Grind a corpse to powdered bone and cast it over the horde: your minions gain'
      + ' +25% block chance and take 15% less damage for 7 seconds. Communal Rites shares a'
      + ' portion with the officiant.',
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
    description: 'A chaos bolt that hunts: it curves toward the living, pierces up to 4'
      + ' enemies, and trails a rotting aura that deals chaos damage to everything near its'
      + ' flight. Hits carry a 35% chance to decay, and 10% of the damage you deal with it'
      + ' returns to you as WARD. Fire it through the pack, not at it.',
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
    description: 'Loose a slow bone-spirit that drifts after one quarry and DETONATES in a'
      + ' chaos burst on arrival, or wherever its 4.5 second unlife runs out. The blast carries'
      + ' a 40% chance to decay everything caught. Patience, weaponized.',
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
    description: 'A wide scythe sweep in front of the Harvester: physical damage with a 35%'
      + ' chance to bleed everything caught in the arc. The great reaper takes its harvest.',
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
    description: 'The Harvester dashes in a straight line across the field; everything it'
      + ' passes through is opened and bleeds.',
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
    description: 'Order the Harvester to your mark: it DASHES the line and everything along it BLEEDS.',
    tags: ['minion', 'instant'], color: '#8a4a68',
    manaCost: 6, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'minionCast', skillId: 'reaper_lunge', at: 'aim' }],
  },

  summon_harvester: {
    id: 'summon_harvester', name: 'Summon Harvester',
    description: 'Bind THE HARVESTER: one great reaper held by reserved mana, re-forming 8'
      + ' seconds after it falls. Its presence leaves your other minions dealing 20% less'
      + ' damage with 10% reduced movement speed, and every 5 seconds it EATS one of them,'
      + ' healing itself for 18% and gaining 8% increased damage and 5% increased attack speed'
      + ' per feast, up to 8 stacks. ⇧ orders the Reap: a dash down your mark that cuts'
      + ' everything on the way.',
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
    description: 'Call the Harvester unbound for 20 seconds: no reserved mana, no re-forming'
      + ' when it falls. Its presence, its appetite for your other minions and the ⇧ Reap order'
      + ' all work as they do on Summon Harvester; when the hire lapses, so does the terror.',
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
    description: 'Summon 4 lesser reapers for 14 seconds: no presence, no appetite, just'
      + ' wheeling blades. Socket a Ravenous Pact and teach them hunger anyway.',
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
    description: 'Sound the horn and the whole court marches: every minion you own converges on'
      + ' your mark and fights whatever holds it for 6 seconds. Socketed Assault metas order'
      + ' one skill\'s retinue; the horn is the universal call, cast from its own slot.',
    tags: ['spell', 'minion', 'warcry', 'instant'], color: '#c8a04b',
    manaCost: 7, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', duration: 6 }],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('minionMoveSpeed', 'increased', 0.06)] },
  },

  last_rite: {
    id: 'last_rite', name: 'Last Rite',
    description: 'The universal last instruction: every re-summonable minion you own DETONATES'
      + ' for 65% of its life, the whole congregation spent in one breath. Socketed'
      + ' Self-Destruct metas spend one skill\'s bodies; the Rite spends everyone, from its own'
      + ' slot.',
    tags: ['spell', 'minion', 'fire', 'instant'], color: '#e86848',
    manaCost: 12, cooldown: 10, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'detonateMinions', fraction: 0.65 }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('minionExplodeDeath', 'flat', 0.04)] },
  },

  skeletal_lunge: {
    id: 'skeletal_lunge', name: 'Skeletal Lunge', noDrop: true,
    description: 'An ordered dash-strike: bone closes the gap in a line and cuts, with a 50%'
      + ' chance to bleed.',
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
    description: 'Every minion of the ordered skill DASHES its nearest enemy and cuts, with a'
      + ' 50% chance to bleed.',
    tags: ['minion', 'instant'], color: '#cfc8b8',
    manaCost: 5, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'minionCast', skillId: 'skeletal_lunge', at: 'enemy' }],
  },

  // --- Channel-build → persist-and-decay -----------------------------------

  hailcrown: {
    id: 'hailcrown', name: 'Hailcrown',
    description: 'CHANNELED: raise a crown of ice overhead that pelts the ground around you,'
      + ' planting bursts of cold damage under nearby enemies with a 50% chance to chill. Every'
      + ' held second builds the crown, and on release it keeps raining on its own, fading, for'
      + ' about as long again as you fed it, up to 6 seconds. Channel, then run; the weather'
      + ' follows.',
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
    description: 'A javelin thrown as a line of lightning: it pierces up to 3 enemies, and each'
      + ' one split carries a 30% chance to be shocked. The Impaler\'s answer to armor is'
      + ' voltage.',
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
    description: 'One javelin, two payloads: the throw deals physical and chaos damage, and'
      + ' wherever its flight ends, flesh or dirt, a plague-gas cloud bursts and lingers for'
      + ' 2.6 seconds with a 40% chance to decay whoever stands in it. Throw it into the'
      + ' doorway, not the man.',
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
    description: 'Cough up a slow glob of living bog that dawdles after prey, shedding venom'
      + ' pools in its wake and a deeper pool where it dies. Every pool deals chaos damage with'
      + ' a 55% chance to poison and shrinks closed as its duration ends. The slower the glob'
      + ' crawls, the longer its sheddings linger: everything here is duration, and duration is'
      + ' yours to shape.',
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
    description: 'Send out a corpse-lantern on a leash of will: it bends after your cursor,'
      + ' passes through what it burns rather than dying on it, and sheds closing venom pools'
      + ' with a 45% chance to poison along whatever path you write. A slow, deliberate hand'
      + ' lays longer-lived pools. Drag it out to hound the fleeing, or wheel it around'
      + ' yourself and stand inside the moat it leaves.',
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
    description: 'A slick of bog-venom laid on the ground: chaos damage with a 35% chance to'
      + ' poison whoever stands in it, shrinking closed over 2.4 seconds.',
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
    description: 'A dropped rope of royal jelly: chaos damage and a 60% chance to MIRE whoever'
      + ' wades through it while it lingers. Sweet, heavy, clinging.',
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
    description: 'CHANNELED: hold to fill a gauge that survives between holds, bleeding away'
      + ' while you rest; haste fills it faster. Release spends the bar as 5 seconds of up to'
      + ' 55% increased movement speed and 16% increased attack and cast speed, scaled to how'
      + ' full it ran, and a bare sliver fizzles entirely. Let go early for a taste, or hold to'
      + ' the brim for the whole gale.',
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
    description: 'CHANNELED: kneel rooted and pour time into a bar that KEEPS whatever you'
      + ' bank, however long ago you knelt. Release mends you and every ally around you for 10%'
      + ' of maximum life plus a flat amount, scaled to the fill; a thin bar refuses to spend'
      + ' at all. Brim it in the quiet, carry a second life into the loud.',
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
    description: 'CHANNELED: gather fire for 4 rooted seconds, and nothing arrives until the'
      + ' gather completes; break the channel, or the caster, and the ruin never comes. At full'
      + ' hold it erupts as a fire nova around you with an 18% chance to burn everything caught.'
      + ' The deliberate cast, weaponized.',
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
    description: 'A spat coal of fire damage, quick and small, with a 9% chance to burn what'
      + ' it strikes. The wildfire kin\'s pelting shot.',
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
    description: 'Heave a gout of living melt in a lazy arc: it bursts in fire damage where it'
      + ' lands and leaves a burning pool that shrinks closed over 3.2 seconds. Every hit'
      + ' carries a 16% chance to burn.',
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
    description: 'Cast a barbed line of nothing and REEL: the hook deals chaos damage and drags'
      + ' the catch bodily to the caster\'s feet, stunned for 0.3 seconds on arrival. In an'
      + ' angler\'s grip, mind your footing; in yours, the reel-in brings the fight to you.',
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
    description: 'A rooted appendage unknots and SWATS in a long, patient arc, dealing physical'
      + ' damage and shoving whatever it catches away. The ground was never just ground.',
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
    description: 'A glistening tongue snaps out in a line, barbs, and REELS the catch bodily to'
      + ' the teeth, leaving it stunned for 0.35 seconds on arrival. Mind the ground between'
      + ' you and the maw, or spend the trip planning your arrival.',
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
    description: 'A barbed cord of warped flesh snaps out in a line: physical and chaos damage,'
      + ' and the catch is REELED bodily to the tendril, stunned for 0.25 seconds on arrival.',
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
    description: 'A close bite of physical damage: every strike shakes loose a bead of life'
      + ' that homes back to the biter unless its owner outruns it. What the teeth take, they'
      + ' KEEP.',
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
    description: 'A ring of misfiring nerves rolls out around you: chaos damage in a nova, with'
      + ' a 40% chance to ensnare each enemy it crosses. The Caul knows where you stand; you'
      + ' are standing on it.',
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
    description: 'Lash a wide, far-reaching melee arc of living cord: physical and chaos'
      + ' damage, with a 30% chance to ensnare what it stripes. Your arm remembers being'
      + ' something longer.',
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
    description: 'Plant a toothed bloom at the target point for 4 seconds: it drags enemies'
      + ' inward from well beyond its bite while the petals chew for chaos and physical damage'
      + ' every half second, each bite with a 25% chance to ensnare. The vor maw\'s bargain,'
      + ' potted.',
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
    description: 'Invite the membrane to wear you for 6 seconds: +10 life regeneration per'
      + ' second, 8% increased movement speed, and +15% chaos resistance. It always lets go. So'
      + ' far.',
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
    description: 'Looses a chaos bolt that lands gently and waits: 3 seconds later the Word'
      + ' resolves all at once, rolled at whatever your power has become by then, with a 50%'
      + ' chance to inflict decay. Socket a Slow Match to stretch the wait and sharpen the'
      + ' verdict.',
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
    description: 'Hurl javelins skyward to fall as a rain of iron over the target area: 7–10'
      + ' spears land one after another, each hit with a 25% chance to inflict bleed. The'
      + ' Impaler\'s artillery arc.',
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
    description: 'One gathering motion, then every nearby enemy is lanced at once, each down'
      + ' its own straight line from your hand: up to 24 targets, every thrust with a 30%'
      + ' chance to inflict bleed.',
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
    id: 'torpor_field', name: 'Torpor Field',
    description: 'Project a destructible dome of thickened time for 7 seconds: enemy shots'
      + ' inside it crawl at 30% of their speed. Only one dome may stand at a time.',
    tags: ['spell', 'aoe', 'duration', 'totem'], color: '#88b8d8',
    manaCost: 14, cooldown: 8, useTime: 0.5,
    delivery: {
      type: 'construct', kind: 'dome',
      domeMode: 'slow', domeSlow: 0.3, domeRadius: 140,
      range: 0, duration: 7, maxActive: 1, life: 55, placeRange: 320,
    },
    effects: [],
    requirements: { willpower: 14, intelligence: 10 },
    ai: { range: 240, weight: 1 },
  },

  levinfall: {
    id: 'levinfall', name: 'Levinfall',
    description: 'Mark a circle and show it, then the sky empties into it: 9–13 lightning'
      + ' strikes scattered across the promised ground, each with a 30% chance to shock. The'
      + ' strikes seek nothing; the circle is the contract.',
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
    description: 'Plant a gravid pod that incubates for 5 seconds, then hatches a brood of 3'
      + ' skittering hunters at the spot. Broken before term, it dies quietly and nothing is'
      + ' born. Up to 2 pods may stand at once.',
    tags: ['spell', 'summon', 'minion', 'duration', 'totem'], color: '#a8c860',
    manaCost: 16, cooldown: 6, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'pod',
      range: 0, duration: 5, maxActive: 2, life: 65, placeRange: 320,
      hatch: { skillId: 'brood_hatch' },
    },
    effects: [],
    requirements: { willpower: 18 },
    ai: { range: 280, weight: 1 },
  },

  brood_hatch: {
    id: 'brood_hatch', name: 'Brood', noDrop: true,
    description: 'The pod splits and 3 broodlings boil out to hunt for 16 seconds. Up to 6 may'
      + ' swarm at once.',
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
    description: 'Set down a powder cask on a 2.4 second fuse: it detonates in a fiery blast'
      + ' when the fuse runs out, or the instant anything breaks it, your own shots included.'
      + ' Up to 3 casks may stand at once. Powder honors no plan.',
    tags: ['spell', 'fire', 'aoe', 'duration', 'totem'], color: '#e07838',
    manaCost: 10, cooldown: 3, useTime: 0.45,
    delivery: {
      type: 'construct', kind: 'pod', look: 'construct_cask',
      range: 0, duration: 2.4, maxActive: 3, life: 45, placeRange: 280,
      hatch: { skillId: 'cask_blast', onBreak: 'hatch' },
    },
    effects: [],
    requirements: { dexterity: 14, intelligence: 12 },
    ai: { range: 240, weight: 1 },
  },

  cask_blast: {
    id: 'cask_blast', name: 'Cask Blast', noDrop: true,
    description: 'The cask detonates: fire damage in a wide blast, an 18% chance to inflict'
      + ' burn, and everything nearby is knocked back.',
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
    description: 'A committed lance thrust down one razor-narrow line, reaching well past your'
      + ' shoulder: 35% chance to inflict bleed. It thrusts cleanly around a raised guard'
      + ' without lowering it: the greatshield-and-spear discipline on its own button.',
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
    description: 'The lance from behind the wall: a narrow thrust around the raised guard that'
      + ' shoves its victim back. It cannot be used unless the guard is up.',
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
    description: 'While the toggle burns, 40% of every wound is not taken: it banks as debt, up'
      + ' to 120% of your maximum life. The balance siphons mana faster the deeper it runs, and'
      + ' the moment you cannot pay, the toggle closes and everything banked lands at once. Its'
      + ' Absolve press pays half the debt down on a long clock.',
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
    description: 'Pays half of the standing Arrears balance down, wiping that much banked'
      + ' damage before it can land.',
    tags: ['spell', 'instant'], color: '#d8c878',
    manaCost: 8, cooldown: 12, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'payLedger', pct: 0.5 }],
  },

  grit_stance: {
    id: 'grit_stance', name: 'Grit',
    description: 'The monk\'s discipline: while the stance holds, 55% of every hit is'
      + ' staggered, smeared across six slow seconds instead of landing as a spike. Sustain'
      + ' outruns what patience spreads thin; a burst that would have dropped you becomes a'
      + ' bill you heal through.',
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
    description: 'Dam the wellspring: while toggled, 65% of your mana regeneration is held'
      + ' back, banked up to half your maximum mana. When your mana runs nearly dry the dam'
      + ' breaks, flooding the balance home as mana and discharging it as lightning around you.'
      + ' Toggling off cashes out the same way. Starve on purpose.',
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
    description: 'CHANNELED: while the button is held nothing falls; the crown only gathers. On'
      + ' release everything banked comes down at once: a burst of cold hail at enemies around'
      + ' you, then autonomous hail follows you for up to 7 seconds, each strike with a 50%'
      + ' chance to chill. Longer holds strike harder and persist longer.',
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
    description: 'Hurl the axe: the first enemy it strikes flings it onward to a marked catch'
      + ' circle near you. Stand in the circle to catch the returning steel and bank a GYRE'
      + ' charge, up to 5; each hit has a 30% chance to inflict bleed. A missed catch leaves'
      + ' the axe where it fell until its time runs out.',
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
    description: 'Summon a relic that glides at your shoulder for 14 seconds: every attack you'
      + ' land, it answers with a ring of physical damage around itself that also mends nearby'
      + ' allies. Only one relic serves at a time.',
    tags: ['spell', 'summon', 'minion', 'totem', 'duration', 'heal'], color: '#f0e0b0',
    manaCost: 14, cooldown: 6, useTime: 0.55,
    baseDamage: { physical: [3, 5] },
    delivery: {
      type: 'construct', kind: 'relic', castSkillId: 'relic_pulse',
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
    description: 'The relic\'s answer: a ring of physical damage around it, and 4 life mended'
      + ' to allies inside it.',
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
    description: 'Raise a great bell for 10 seconds that taunts nearby enemies into striking'
      + ' it. Every blow it takes rings a shockwave of physical damage off its skin, knocking'
      + ' attackers away. The bell tolls for whoever hits it.',
    tags: ['spell', 'physical', 'aoe', 'totem', 'duration'], color: '#c8a858',
    manaCost: 15, cooldown: 9, useTime: 0.6,
    baseDamage: { physical: [7, 11] },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_bell', castSkillId: 'bell_toll',
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
    description: 'The struck bell rings out a shockwave: physical damage in a ring around it,'
      + ' knocking enemies back.',
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

  // --- THE MANTID SCHOOL's verbs (the Readers — enemies whose POSTURE is
  // the information; engine/tells.ts 'casting'/'feinting'/'foecast'). Five
  // stances, five noDrop kit pieces; the numbers are deliberately modest —
  // the interest is the MIND wearing them, never the stat block.
  mantis_scythe: {
    id: 'mantis_scythe', name: 'Scythe Cut', noDrop: true,
    description: 'A folded arm unfolds into one clean melee crescent. The cast bar is the'
      + ' warning; which arm loads is the truth, and the duelist\'s shield-side flare is a lie'
      + ' about to drop.',
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
    description: 'Both scythes rise together and fall as one wide melee edge that hurls'
      + ' whatever it strikes away. Once begun it cannot stop: no cancel, no bluff, the blade'
      + ' lands exactly where the body points. Be elsewhere when the arc closes; the long'
      + ' recovery after is yours to spend.',
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
    description: 'A single chitin needle coughed flat: a quick physical projectile. It costs'
      + ' the reader nothing to make you flinch, and everything you cast in answer is'
      + ' information.',
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
    description: 'The held coil spends itself in one released line: a fast, far-reaching melee'
      + ' strike. The blow was wound long before you moved; your commitment merely finished the'
      + ' prayer.',
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
    description: 'Plate by plate the redoubt seals shut: +60 armor and 50% less damage taken'
      + ' for 6 seconds, a box with nothing left to argue with. Go around, or wait for the'
      + ' plates to part and spend the opening well.',
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
    description: 'Fire damage in a small snapping bite: a hot little mouthful.',
    tags: ['attack', 'melee', 'fire'], color: '#e08848',
    manaCost: 0, cooldown: 0, useTime: 0.85,
    baseDamage: { fire: [4, 7] },
    delivery: { type: 'melee', range: 40, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    ai: { range: 46, weight: 2 },
  },
  pale_zap: {
    id: 'pale_zap', name: 'Pale Zap', noDrop: true,
    description: 'Cold damage in a thin, slow bolt. A thread from the other side.',
    tags: ['spell', 'projectile', 'cold'], color: '#b8d8e8',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { cold: [4, 6] },
    delivery: { type: 'projectile', speed: 380, radius: 6, range: 300 },
    effects: [{ type: 'damage' }],
    ai: { range: 280, weight: 2, keepDistance: 170 },
  },
  gnat_nip: {
    id: 'gnat_nip', name: 'Gnat Nip', noDrop: true,
    description: 'The tiniest melee nip of physical damage: barely a bite. Barely.',
    tags: ['attack', 'melee', 'physical'], color: '#a8b860',
    manaCost: 0, cooldown: 0, useTime: 0.7,
    baseDamage: { physical: [1, 2] },
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
    description: 'Hoarfrost sheathes this biting melee strike of physical and cold damage: 50%'
      + ' chance to chill what it tears.',
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
    description: 'Looses a jagged arrow of sharpened bone: a single straight-flying projectile'
      + ' dealing physical damage.',
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
    description: 'Burial wrappings uncoil and strike in a melee arc, dealing physical and chaos'
      + ' damage: 45% chance to inflict torment. The grave\'s grip drags at whatever they'
      + ' touch.',
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
    description: 'A lunging bite over recurved fangs dealing physical and chaos damage: 60%'
      + ' chance to poison. The wound is small; what the venom leaves behind is not.',
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
    description: 'One rolling note sung out as a slow-drifting projectile: chaos damage on the'
      + ' struck, who is pulled toward the singer and ENSNARED for 1.4 seconds. The water does'
      + ' the rest.',
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
    description: 'Flings a barbed chain: a projectile of physical and chaos damage that hauls'
      + ' whatever it hooks back to the thrower, with a 60% chance to inflict torment.',
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
    description: 'Swings a soundless bell over the marked ground: after a short wind-up the'
      + ' bloom erupts with chaos damage and SILENCES everything caught for 2.2 seconds.',
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
    description: 'A collector\'s hooked sweep across a wide melee arc, dealing physical and'
      + ' chaos damage: 80% chance to leave victims exposed, their armor peeled open.',
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
    description: 'Hands rise from the marked ground after a brief delay, dealing physical'
      + ' damage: 55% chance to root the caught for 1.1 seconds. The barrow floor remembers how'
      + ' to hold.',
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
    description: 'The tail flicks over the back in one quick strike, dealing physical and chaos'
      + ' damage: 50% chance to poison. A wound you could miss, carrying everything that'
      + ' matters.',
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
    description: 'Flat and hard, one note rings off the crest as a nova around the singer:'
      + ' physical damage with a 30% chance to briefly stun. The rock answers; the choir is not'
      + ' singing to you.',
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
    description: 'Vents its whole reservoir forward at once: a cone of sticky amber dealing'
      + ' physical damage, with a 70% chance to mire victims, slowing their movement.',
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
    description: 'The whole mass rears and falls in a crushing burst around itself, dealing'
      + ' physical damage: 60% chance to smother whatever it lands on. For a moment the world'
      + ' is warm, green, and very close.',
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
    description: 'The drover\'s prod jabs out in one long, narrow thrust: physical damage, and'
      + ' the victim is knocked back. It is for driving, not killing.',
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
    description: 'Its whole length sweeps around at once in a wide melee arc, dealing physical'
      + ' damage and shoving everything caught away. There is no edge to this attack, only an'
      + ' inside and an outside.',
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
    description: 'Delivered at the charge: a lance thrust in a long, narrow line dealing'
      + ' physical damage, with a 30% chance to inflict bleed. It does not need to reach you'
      + ' quickly, only first.',
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
    description: 'Spits the charge it has been holding as a small, fast lightning projectile:'
      + ' 15% chance to shock. Barely a spark, but it was never going to be anything else.',
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
    description: 'It only ever touches you: a grave-cold brush at arm\'s reach dealing chaos'
      + ' damage, with a 70% chance to inflict faintness. It never takes much, and it has all'
      + ' the time there is.',
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
    description: 'Coughs up a burst of grit and ash around itself, dealing fire damage: 50%'
      + ' chance to blind for 1.6 seconds.',
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
    description: 'Leap to the target point, untouchable in the air and clearing every gap, and'
      + ' land in a shockwave of physical and lightning damage that knocks enemies away: 30%'
      + ' chance to shock.',
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
    description: 'Lightning bursts from your brow as a nova: 20% chance to shock. Each cast'
      + ' grants 6% increased damage and 5% increased cast speed for 2.4 seconds, stacking up'
      + ' to 6 times; stacks peel away one at a time as they lapse.',
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
    description: 'Name the ground and a column of white fire stands there for 2.6 seconds,'
      + ' striking everything it holds again and again with fire and lightning damage: 14%'
      + ' chance to burn, and partway through the pillar detonates a second buried strike. The'
      + ' Host\'s dominions bring these down unbidden.',
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
    description: 'Ask the night for one of its own: 2 seconds after you mark the ground, a star'
      + ' lands there in a burst of fire and physical damage, with a 12% chance to burn. The'
      + ' Vesperlands\' keepers call them down like punctuation.',
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
    description: 'Fans 5 razor feathers across a tight spread: physical projectiles with a 20%'
      + ' chance to inflict bleed.',
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
    id: 'cloudstep', name: 'Cloudstep',
    description: 'Glide to the target point as soundless cloud, phasing through whatever stands'
      + ' between, and leave a decoy image of yourself behind for 1.4 seconds to be struck in'
      + ' your stead.',
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
    description: 'Hurl a spear of hardened dawn: a fast, flat projectile of physical and'
      + ' lightning damage that pierces up to 2 bodies, with a 15% chance to shock. The Powers'
      + ' carry ranks of these.',
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
    id: 'trumpet_peal', name: 'Trumpet Peal',
    description: 'One note, aimed at the line: a wedge of sound dealing lightning damage in a'
      + ' cone, throwing enemies back, with a 35% chance to bewilder them into striking at'
      + ' where the world used to be. The Choir\'s heralds open every engagement with it.',
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
    description: 'Light a standing candle of the Host: for 9 seconds, you and allies within its'
      + ' glow take 6% less damage, and every 2.5 seconds the flame heals 3% of maximum life.'
      + ' The Lampads carry these against the dark between the stars.',
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
    description: 'Set a crown of dawn turning at the target point: for 5 seconds it spirals'
      + ' outward and homes onto the nearest head, dealing fire and lightning damage with every'
      + ' pass and striking each victim at most once every 0.8 seconds; 20% chance to shock.'
      + ' The one halo in the catalog that circles them, not you.',
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
    description: 'Raise 5 columns of marble-light in a wide ring around the target point: for 6'
      + ' seconds, every 1.2 seconds one column casts Aureate Lash, a needle of gilt fire, at'
      + ' whoever stands within the court. The ring is open by law: shots, sight, and the'
      + ' judged all pass freely between the pillars.',
    // 'totem' = the deployed-object umbrella tag (solar_orb's precedent),
    // so totem supports board the columns.
    tags: ['spell', 'fire', 'lightning', 'totem', 'duration', 'aoe'], color: '#f4e2c0',
    manaCost: 24, cooldown: 9, useTime: 0.7,
    // The columns never strike ON PLANT — this roll exists for CONSTRUCT-FX
    // readers (bone_prison's precedent: Pulsing Ramparts' beat and Violent
    // Genesis' arrival scale off the host's roll). Per-column, kept lean.
    baseDamage: { fire: [5, 8] },
    delivery: {
      type: 'construct', kind: 'pylon',
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
    description: 'Fired by one column of the court: a needle of gilt fire, a fast projectile'
      + ' dealing lightning and fire damage with a 15% chance to shock.',
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
    description: 'Convene a crescent of dawnfire around the point you name, its open chord'
      + ' facing you: the crescent closes on its own center over a heartbeat, striking each'
      + ' body it passes over exactly once with fire and lightning damage, 12% chance to burn,'
      + ' and a final smaller burst at 55% damage lands where they were herded.',
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
    description: 'Mark a patch of ground: a heartbeat later a geyser of rising vapor detonates'
      + ' there, dealing cold and physical damage that hurls bodies aside and leaves everyone'
      + ' caught WINDED.',
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
    description: 'Condense your body into stabilized cloud for a short span: while CLOUDFORM'
      + ' holds, dissolving ground cannot claim you and the open air bears your weight across'
      + ' every gap. When it lapses over nothing, you fall.',
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
    description: 'Cast a crook of hardened wind: a fast projectile of physical and cold damage'
      + ' that reels the caught body to your feet and leaves it WINDED. The zephyrid matrons'
      + ' shepherd strays back onto the cloud with it, or off it.',
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
    description: 'Dash flat through the target line, striking everything along the path with'
      + ' physical and cold damage: 30% chance to inflict bleed. The wound arrives before the'
      + ' wind does.',
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
    description: 'Loose a nova of sparks around you, dealing lightning damage with a 25% chance'
      + ' to shock. Each cast winds the charge one turn tighter: 7% increased damage and 4%'
      + ' increased radius per stack, up to 6 stacks that peel away one by one after 2.6'
      + ' seconds.',
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
    description: 'Dash with the wind, laying a trail of standing cloud behind you for 4'
      + ' seconds. The trail holds as a bridge over any gap, and allies who run along it gain'
      + ' WINDLANE, borrowing the wind\'s pace.',
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
    description: 'Conjure a standing cloud where you point: for 6 seconds it holds as walkable'
      + ' ground over any drop, and allies inside gain CLOUDHAVEN, their outlines blurred and'
      + ' enemy aim against them softened.',
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
    description: 'Crack a flat whip of compressed air in a cone before you, dealing physical'
      + ' damage: struck enemies are knocked back, with a 35% chance to leave them winded. A'
      + ' shove past an edge lets the sky finish the fight.',
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
    description: 'Drag a column of high cold air down on a distant point. After a breath of'
      + ' gathering stillness the sky lands all at once: cold and physical damage across a wide'
      + ' circle, bodies hurled back, and a 50% chance to leave them winded.',
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
    description: 'Clap the air flat: a ring of hard wind around you that deals no damage but'
      + ' hurls everything back, with a 60% chance to leave enemies winded. The drift-folk\'s'
      + ' hello.',
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
    description: 'Spit a stitched needle of storm-charge that weaves on the wind rather than'
      + ' flying true, dealing lightning and physical damage to whatever it strikes, with a 12%'
      + ' chance to shock.',
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
    description: 'Call down a cirrus fingerling, a quick, biting scrap of living cloud that'
      + ' harries whatever you point it at. Each cast summons one, up to 3 at once.',
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
    description: 'Set the wind at every ally\'s back: for 8 seconds, allies around you gain 14%'
      + ' increased movement speed, 6% increased attack speed and 6% increased cast speed.',
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
    description: 'Whistle a nimbus to heel: a small cloud follows at your feet for 8 seconds,'
      + ' wrapping nearby allies in CLOUDHAVEN, outlines blurred and enemy aim softened. Where'
      + ' the world runs out, it pours itself under your stride as standing ground.',
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
    description: 'Raise a thunderhead at the target point for 7 seconds: allies inside are'
      + ' STORMLACED, their blows carrying the cloud\'s charge and landing heavier, while'
      + ' enemies within stay winded. Over the open sky, the cradle itself is walkable ground.',
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
    description: 'Settle a low cloud with a silver underside over the target area for 7'
      + ' seconds. Allies beneath it are SILVERLINED, steadily mending flesh and focus; step'
      + ' out from under it and the mending fades.',
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
    description: 'Pave a road of standing cloud from your feet to the target point, holding for'
      + ' 5 seconds. The lane bridges any gap as walkable ground, and allies traveling it gain'
      + ' WINDLANE, moving at the weather\'s pace. The drift-folk lay their processions along'
      + ' it.',
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
    description: 'Drop the weather on them: a pressing cloud squats on the target area for 6'
      + ' seconds, and enemies inside are SMOTHERED, their sight swallowed and their aim'
      + ' spoiled. An answer to archers and watchposts; walk your own murk in after it.',
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

export const SKILL_LIST: SkillDef[] = Object.values(SKILLS);
