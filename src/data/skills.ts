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

  // ======================= Warrior / melee =================================

  cleave: {
    id: 'cleave', name: 'Cleave',
    description: 'A wide swing that strikes all enemies in front of you.',
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
    description: 'A crushing blow with a chance to stun and knock back.',
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
    description: 'Slam the earth, damaging and rattling everything around you.',
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
    description: 'The colossus commits its next footfall: a long, honest wind-up — then the ground beneath the foot is unmade, and everything near is hurled aside.',
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
    description: 'The carried bell RINGS: a portion of the bearer\'s banked afflictions shed at once, and the near field is stunned senseless.',
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

  war_cry: {
    id: 'war_cry', name: 'War Cry',
    description: 'Bellow a battle cry, rallying yourself for greater damage.',
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
    description: 'A rapid strike that stokes your fury — stacks attack speed and damage.',
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
    description: 'CHANNELED: spin with blades extended for as long as the button is held, shredding everything nearby while you keep moving (a little slower).',
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
    description: 'CHANNELED: the inverse of every spin-to-scatter — open a drowning current around yourself that DRAGS everything near it inward while the water works them over. The current only deepens: more violence every held second, and less of your own footing, until you are the anchor of your own drowning pool.',
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
    description: 'A blade brought down the way the SEA comes in — the cut is cold, and what it soaks it slows.',
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
    description: 'Kelp-wrapped hands break the ground like a surface and SEIZE — everything near the reaching is dragged toward it, and what they catch they hold under.',
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
    description: 'The sea rises to stand between its regent and the argument — a swell of cold light that only its own ebb can lower.',
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
    description: 'A cut from a hand that seems a stride LEFT of where it lands — heat-bent light makes the blade hard to answer.',
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
    description: 'Step SIDEWAYS through the shimmer and leave a double of hot air standing in the argument — it holds a blade, for a while.',
    tags: ['spell', 'summon', 'fire'], color: '#f0d8b0',
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
    description: 'The cured dead do not bleed — they SHATTER outward, a ring of stinging brine-shard.',
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
    description: 'Spin the ground itself into a scouring cone — sand at speed argues with skin, and wins.',
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
    description: 'A verse the sun taught the sand: speak it and BURN brighter for a while. (The Court\'s priests teach it to their whole line — the brain buffs kin; the gem buffs you.)',
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
    description: 'Fuse sand to a running spear of glass mid-throw — it arrives hot, fast, and honest.',
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
    description: 'Ride a standing wave of sand through the line — whoever it breaks over is SHOVED and scorched.',
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
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  mirage_step: {
    id: 'mirage_step', name: 'Mirage Step',
    description: 'Be briefly where the light says you are not — a blink that leaves your outline arguing behind you.',
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
    description: 'Call the noon wind down in a ring of scouring heat — everything it touches starts to BAKE (sunscorch stacks, the desert\'s own arithmetic).',
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
    description: 'Point the sun at someone. The mark bakes on scorch after scorch until the light is done with them.',
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
    description: 'Hurl an explosive orb of flame that can ignite its victim.',
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
    description: 'Sweep a sheet of fire across everything in front of you.',
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
    description: 'Tear open the ground at a target point; it erupts after a short delay.',
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
    description: 'The ground tears open and what the war left beneath it comes through. The torment lingers.',
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
    description: 'Hurl a mote of undoing. It does not burn; it LOOSENS — the victim begins to unravel.',
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
    description: 'Open a slow seam of un-place. It does not strike; it SEEPS — those who stand in it come apart thread by thread.',
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
    description: 'Speak the syllable the world was never meant to keep: a ring of undoing, and everything it touches starts to unravel.',
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
    description: 'Crack a burning whip in a long, shallow stripe. The weal CAUTERIZES: victims take half healing while it sears.',
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
    description: 'Lob a salvo of brimstone mortars across an area — each arc bursts on impact and may set the ground\'s victims alight.',
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
    description: 'Smother an area under a slow ashfall — a FUME the victims must breathe: a beat of standing inside before the searing starts, and every breath cauterizes (healing halved).',
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

  doom_chant: {
    id: 'doom_chant', name: 'Doom Chant',
    description: 'CURSE: chant the victims\' names into the pit. DOOM pumps a six-second keg that bursts EARLY if it ever covers what life remains — while torment drags at their feet.',
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
    description: 'Tear one deep, ragged wound — a HEMORRHAGE that bleeds long and slow, and POPS a share of whatever it was still owed when reopened.',
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
    description: 'Tear a whelp-gate in the air: each cast drags a lesser demon through — ash-whelps mostly, now and then a true imp.',
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
    description: 'A shard of ice that chills whatever it strikes.',
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
    description: 'A burst of rime that chills everything around you.',
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
    description: 'Release a fan of erratic sparks that may shock enemies.',
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
    description: 'A single erratic spark. A component payload: riders, emitters and constructs fling these.',
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
    description: 'Hurl an unstable bolt whose damage rolls across a chasm-wide range. Rolls near the top of the dice SHORT-CIRCUIT — detonating, arcing to nearby enemies, or both at once.',
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
    description: 'Call a bolt of lightning down on a target point.',
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
    description: 'Call a crystal down out of the high dark. It arrives with the cold of the space it crossed.',
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
    description: 'A burst of flame around you. Enemies caught may ERUPT in kind after a beat — and eruptions beget eruptions, each less likely than the last.',
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
    description: 'Loose a heavy ember. Where its flight ENDS — a body struck or its reach spent — a Pyre Nova blooms; and what the nova starts, its contagion may finish.',
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
    description: 'A blazing rock plummets from a rift in the sky and erupts on impact.',
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
    description: 'Spit a bolt of virulent toxin. Poisons stack.',
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
    description: 'A wide, workmanlike cut — brush, vines and whatever hides in them all part the same way. Bleeds what it doesn\'t fell.',
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
    description: 'A whisper of a shot with an argument on its tip. Barely wounds; profoundly poisons.',
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
    description: 'Cast a living creeper and REEL: the catch is dragged to your feet and held rooted a breath — close enough to answer for itself.',
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
    description: 'Seed the air itself: a drifting bloom that the unhurried breathe in and regret. Linger and the jungle does your fighting.',
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
    description: 'The predator\'s answer to distance: airborne and untouchable, then all claws at once. Bleeds the landing.',
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
    description: 'The maw\'s embrace: dragged in, held fast, and squeezed while it decides which end of you is food.',
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
    description: 'Five breaths in one: a fan of poisoned darts from the treeline.',
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
    description: 'Exhale a ring of virulence — a circle of slow venom bolts that leave a long, merciless poison. The ring settles differently with every breath.',
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
    description: 'Channel to plant sparks beneath your enemies — loosely, where the storm decides. RELEASE, and every spark detonates in the order it was laid.',
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
    description: 'A whispered mending on one ally: strong regeneration over 8 seconds. Quiet, portable, stackable with everything.',
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
    description: 'Put the shield up and RUN: a bowling charge that batters everything in the corridor aside, with a chance to stun.',
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
    ai: { range: 240, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1, ['melee'])] },
  },

  // AEGIS OF DAWN: the guard that SHELTERS — while held, allies in its
  // shadow mend (the guardMend stat, worn innately here and grantable
  // anywhere).
  aegis_of_dawn: {
    id: 'aegis_of_dawn', name: 'Aegis of Dawn',
    description: 'Raise a consecrated guard: while you hold it, allies near you heal steadily. The wall that keeps the line alive.',
    tags: ['guard', 'heal', 'duration'], color: '#f8e8c8',
    manaCost: 6, cooldown: 3, useTime: 0,
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
    description: 'A ring of light races outward from you, striking each foe once as it passes and mending allies it washes over — gone at its widest breath.',
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
    description: 'Call down a small winged mender for a while: it flits to the wounded and closes what it can.',
    tags: ['spell', 'summon', 'minion', 'heal', 'duration'], color: '#f8e8c8',
    manaCost: 24, cooldown: 8, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'cherub', count: 1, maxActive: 1, duration: 30 },
    effects: [],
    requirements: { willpower: 16, charisma: 6 },
    ai: { range: 400, weight: 2, keepDistance: 280 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.15), mod('effectDuration', 'increased', 0.08)] },
  },

  // THE SHAMAN'S ANSWER (and the grave_shaman's whole kit): raise the
  // fallen FROM THEIR CORPSE — the risen is whatever died there. Obliterate
  // the bodies or kill the caller, or the war never ends.
  shamans_call: {
    id: 'shamans_call', name: "Shaman's Call",
    description: 'Call a corpse back to its feet: the risen is whatever fell there. The grave shamans will not stop until the bodies are spent — or they are.',
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
    description: 'A soft snap of hexed air (the pulse-cadence grounds\' own beat).',
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
    description: 'Pass sentence on one foe: holy fire, and three seconds of enforced quiet — no spells while silenced.',
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
    description: 'Press both palms to an ally\'s wounds and give everything: a massive heal on a long clock.',
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
    description: 'Anoint an ally or minion: their next 3 landed blows carry heavy added physical damage.',
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
    description: 'A consecrated arc that burns brighter for every foe pressing in — 5% more damage per point of crowd power (bosses count for many), and the fervor quickens your hands.',
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
    description: 'For 10 seconds, 12% of the damage you deal flows as healing to allies near you — the congregation drinks from your wrath.',
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
    description: 'Hurl a lance of dawnlight. A share of its damage mends allies around you.',
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
    description: 'Bond your light to an ally: while the bond holds, 20% of the damage you deal heals them. One bond at a time; skills like Ruin feed it far harder.',
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
    description: 'A bolt of consuming twilight. Feeds your Guardian Bond at triple share — ruin for them, renewal for yours.',
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
    description: 'Hold the note: every beat, allies in the circle are mended. Channel supports (and channel-fed charges) ride the held hymn.',
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
    description: 'A disciplined slash. Every third cut settles the mind: the NEXT blow opens a deep, guaranteed bleed.',
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
    description: 'THE DRAW IS THE CUT: an indicator rides the draw-bar — press it FLAWLESSLY and the stroke lands 150% harder. The cut itself is a PHASING dash: you pass THROUGH the line, mass and poise be damned, and everything in the corridor is slashed and DISARMED. Sheathe, read, vanish.',
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
    description: 'Call a bloated plague-priest for a time. His meta-action, Endow, anoints ALL your minions: their next blows drip virulent poison.',
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
    description: 'Anoint every minion you command: their next 3 landed blows apply a heavy poison.',
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
    description: 'Spend three banked Verdict charges (earned by real uses of the hosting skill) for a free consecrated nova.',
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
    description: 'A dart of pale spirit-stuff. Phantasms throw these; so could you, in theory.',
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
    description: 'Conjure a lingering miasma that poisons those who BREATHE it: the fumes take a beat to reach the blood — a short stand inside before the sickening starts, and stepping out clears the lungs. The cloud does not strike; it seeps.',
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
    description: 'A squall of fractured stone hangs where the tree stood — chips and splinters still falling. It cuts whatever lingers in it.',
    tags: ['spell', 'physical', 'aoe', 'duration'], color: '#9a948a',
    manaCost: 0, cooldown: 0, useTime: 0.3,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'ground', radius: 54, castRange: 200, lingerDuration: 2.2, tickInterval: 0.4, noImpact: true },
    effects: [{ type: 'damage' }],
  },

  // ======================= Summoning =======================================

  summon_skeleton: {
    id: 'summon_skeleton', name: 'Summon Skeleton Warrior',
    description: 'Raise a skeletal warrior to fight for you. Scales with your minion stats.',
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
    description: 'Raise a skeletal archer to fight for you. Scales with your minion stats.',
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
    description: 'Bind a sprite of living flame that casts Fireball — your minions use the same skill system you do.',
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
    description: 'Rain 4-6 meteors across an area in sequence. Each impact burns.',
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
    description: 'Drag a servant from the grave — a skeleton warrior or a zombie, whichever answers.',
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
    description: 'Sprout a sporeling from the spore-mat — the bloom answers its tender.',
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
    description: 'TOGGLE a binding contract: mana is reserved per golem SLOT and stays locked while the contract holds — even while the golems lie in rubble awaiting reassembly. Recast to dismiss and reclaim it.',
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
    description: 'Call an untouchable spirit that hurls frost for a short time. Enemies cannot harm or even target it.',
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
    description: 'A ring of lightning that damages only along its OUTER EDGE — the eye of the storm is safe.',
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
    description: 'A precise sweeping cut that only connects at the very TIP of its arc — stand too close and the blade passes over you.',
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
    description: 'CHANNEL a whirling flurry: rapier SLIVERS lash out at random bearings across a wide arc while you keep your feet moving. Chaos, with footwork.',
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
    description: 'A sluggish bolt of withering energy — a feeble hit, but it leaves its victim decaying for a long time.',
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
    description: 'Infect an area with creeping rot. If anything dies while afflicted, the rot LEAPS to its nearby allies — and keeps leaping with every death.',
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
    description: 'A long, steady draw with a golden window at the end — press again inside it for a devastating, all-piercing shot.',
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
    description: 'A pale mote that WANDERS loosely after its mark — weak guidance, endless patience.',
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
    description: 'CURSE: enemies in the area act 25-30% slower — their cast bars stretch before your eyes.',
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
    description: 'CURSE: enemies in the area have a 35% chance to fumble any attack or spell they begin, stunning themselves — a curse that interrupts.',
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
    description: 'CURSE: enemies in the area lose their aim for 7 seconds — casts scatter wide of the mark, and minds that lead your run forget where you were going.',
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
    description: 'BLESSING: you and allies around you gain 45% increased detection range for 8 seconds — minions hunt prey they could never have noticed.',
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
    description: 'CHANNELED (immobile): a blizzard erupts at the target point immediately and intensifies the longer you hold — up to +150% damage.',
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
    description: 'CHARGED: hold to gather the storm, release to unleash it — damage and area scale with how long you held, up to a cap that duration modifiers extend.',
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
    description: 'CHANNELED: the mouth of the furnace opens — individual GOUTS of rolling flame pour out toward your aim, one after another, each a wave that travels and burns on its own. Let go and the mouth closes; the gouts already loosed keep rolling. The Pit Lord\'s breath.',
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
    description: 'CHANNELED (immobile, ponderous turning): a ray of fire that COMPOUNDS the longer it is held — feeble at first, up to +200% damage and double area for the patient. Commit or don\'t.',
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
    description: 'CHARGED: hold to converge light into a point before you — release to LOOSE the lance. A tap sputters; a full gather fires a screen-length beam of annihilation.',
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
    description: 'CHANNELED (immobile, slow turning): a wide fan of light that FOCUSES the longer it is held — the wedge narrows toward a line while its reach and power climb. Aperture down, intensity up.',
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
    description: 'Melee blows BANK static charge; every beat, one banked charge leaps as a bolt to the nearest enemy — keep swinging and the storm spends itself around you.',
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
    description: 'CHANNELED (slowed): a continuous stream of piercing light that BENDS after your cursor mid-flight — sweep the beam across the field like a lash.',
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
    description: 'A flick of the finger: a razor-thin line of annihilating light that strikes everything along its path the instant it fires. Cheap, quick, precise — a duelist\'s beam.',
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
    description: 'CHANNELED (immobile): a concentrated storm of beam-bolts, each flung with a slight contemptuous variance around your aim — saturation fire for as long as you can pay for it.',
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
    description: 'CHANNELED: erratic detonations hammer the area around your cursor — each blast its own size, on its own beat. Nothing about the barrage is steady; the average is.',
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
    description: 'CHANNELED (immobile): meteors hammer the area around your cursor for as long as you hold. The cooldown begins when the bombardment ends, early or not.',
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
    description: 'A slow, heavy blow with a golden window at the end of its cast bar — press again inside it for 70% more damage.',
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
    description: 'An indicator appears at a random point on the cast bar — press again exactly as the bar crosses it for 120% more damage.',
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
    description: 'MASH: every press during the cast bar adds another slash — each weak alone, devastating in concert (up to 15).',
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
    description: 'Lower your shoulder and barrel toward the target point — once committed, you cannot stop until you arrive. Tramples everything en route.',
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
    ai: { range: 380, weight: 2 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  warp: {
    id: 'warp', name: 'Warp',
    description: 'Fold space toward a location — after a moment\'s delay, you are simply THERE.',
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
    description: 'Slip into the dark and bank 3 STEALTH charges: enemies barely sense you, their backs are yours, and your first blow from the shadows lands as an AMBUSH. Each offensive act spends a charge — with charges left, you fade back in; the struck are ALERTED either way.',
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
    description: 'Wrap yourself in obscuring shadow: enemies must come 65% closer to notice you, and you move a little faster.',
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
    description: 'Vanish ENTIRELY — for a breath. Enemies cannot see or target you (stray blasts still hurt), and your next offensive act SPENDS it outright: the strike from nowhere is the last act of being nowhere.',
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
    description: 'Dash away, leaving a taunting mirage of yourself behind. Enemies prefer attacking it over anything else.',
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
    description: 'Place a glowing pad. Step onto it and it hurls you forward along its facing.',
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
    description: 'Anchor a portal at the target point; cast again to anchor its twin. Step into either to emerge from the other.',
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
    description: 'Inscribe a rune at the target point — the skill becomes Recall. Recall teleports you back to the rune from anywhere, once, then must be re-marked.',
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
    description: 'Detonate a nearby corpse, dealing fire damage in an area plus 15% of the corpse\'s maximum life.',
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
    description: 'Drain 8% of a targeted minion\'s life to detonate dark energy around it — or around yourself, at your own cost, if no minion is targeted.',
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
    description: 'Usable only on a POISONED enemy: violently purge the toxin, dealing chaos damage and leaving a poisonous cloud that can seed further Expunges.',
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
    description: 'A rending strike that tears the flesh off of bone. It has a chance to apply a bleed.',
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
    description: 'Open veins all around you — EVERY creature in the radius, yourself included, suffers a heavy bleed but almost no immediate harm.',
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
    description: 'Consume ALL Fury charges (built by Frenzy) for a devastating blow — 25% more damage per charge consumed.',
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
    description: 'Bind the spirit of a corpse into a PERMANENT allied copy of the slain creature. Only a precious few can be held. MASTER a kind in the Tracker\'s bestiary, then — at the open book — drag its page onto this gem\'s slot to ATTUNE it: the grimoire summons that form outright, no corpse hunted, until you rebind at the book.',
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
    description: 'FOCUS on a living beast and HOLD — the claim fills only while your cursor stays on it. A weakened beast (below half) is a CERTAIN claim; a hale one may resist. Hold the gaze to the end and it is YOURS: a companion that falls DOWNED, never dead. With the bond held, this button IS the Whistle (call it back, revived); shift commands it to ATTACK. Unlearning kills the bond — relearn and it returns downed, owed a revival. Release it at the Tracker.',
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
    description: 'Wrench a corpse briefly back to its feet as a short-lived ally. Cheap, plentiful, and temporary.',
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
    description: 'DEVOUR a corpse where it lies: a share of its life force returns to you as flesh and focus (life and mana), and the meal leaves you briefly WELL FED — mending while it settles. A wagon makes it a banquet: every body eaten feeds the same mouth.',
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
    description: 'Beckon every corpse near your mark into one tight pile — fuel arranged for the detonation, the offering, or the wagon to come. Nothing is consumed; the dead only walk a little.',
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
    description: 'Bolt down a corpse mid-fight: flesh knits, and the meal drives the eater into a brief loping frenzy.',
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
    description: 'Consume a corpse: its unspent heat rises from the body as a CINDER that hunts living flesh and bursts. A fed pile looses a whole flight — one cinder more for every extra body eaten.',
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

  // --- Golems: three skills, ONE shared cap ('golem' pool group) -----------

  summon_fire_golem: {
    id: 'summon_fire_golem', name: 'Summon Fire Golem',
    description: 'Bind a golem of living flame. Golems of all kinds share one summoning pool.',
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
    description: 'Bind a golem of rime and frost. Golems of all kinds share one summoning pool.',
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
    description: 'Bind a golem of clotted vitae. Golems of all kinds share one summoning pool.',
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
    description: 'Hurl a massive spectral hammer that orbits you in an ever-widening circle, striking everything in its path again and again.',
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
    description: 'Loose a ponderous orb of ice that drifts forward, shedding a rotating cascade of Frostbolts as it goes.',
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
    description: 'Fling a spinning blade that weaves a figure-eight along its flight path, slicing whatever drifts into the pattern.',
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
    description: 'Anchor a crackling orb at the target spot; it zaps enemies in its radius with erratic sparks until it dissipates.',
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
    description: 'Plant a totem that hurls Fireballs at enemies in range until it expires or is destroyed.',
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
    description: 'An indestructible ballista that fires Piercing Arrows — but only straight down the lane it was placed facing. No rotation axis.',
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
    description: 'Conceal a trap at the target spot. When an enemy steps close, it erupts in a Frost Nova.',
    tags: ['spell', 'trap', 'cold', 'aoe', 'duration'], color: '#9ad4e8',
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
    description: 'Lay a dormant mine at the target spot. It waits — SHIFT-press the slot to detonate the field (or bind Detonate Mines itself for the dedicated finger).',
    tags: ['spell', 'mine', 'fire', 'aoe', 'duration'], color: '#e8624a',
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
    description: 'Erect a pylon that empowers nearby allies (15% increased damage) and periodically arcs Spark at random enemies in range.',
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
    description: 'A violent fiery burst centered on you. Also the payload of Fire Mine.',
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
    description: 'TOGGLE: burn with holy flame, draining 3.5% of your max life per second and dealing that as fire damage to enemies in the radius.',
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
    description: 'For 6 seconds, siphon the lifeblood of everything within your presence — all damage it deals returns to you as life.',
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
    description: 'TOGGLE: a miasma that slows and weakens enemies inside — and any that die within it may rise as weak zombies under your command.',
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
    description: 'TOGGLE: reserves mana. You and allies within the radius gain +60 armor and take 8% less damage.',
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
    description: 'TOGGLE: your focus pools DOWNWARD — the stance CARVES A FOOTING (+30 maximum poise while held) and spare MANA seeps into it: poise refills in combat, not just in the calm after it (the pump keeps a third of your mana untouchable and idles while the bar is whole). Recomposure quickens too. The unshakable duelist\'s idle: stand, settle, set.',
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
    description: 'For 10 seconds, you and allies inside regenerate +4 life per second, and every 3 seconds a pulse heals 4% of maximum life. (Pulse base is data: maxLife, maxMana, or lifeRegen.)',
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
    description: 'Loose an arrow that punches through multiple enemies.',
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
    description: 'Fling a spray of knives in a wide arc.',
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
    description: 'Lunge toward your cursor, slashing everything along the way.',
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
    description: 'A burst of nimble footwork — move and strike faster for a moment.',
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
    description: 'Harden your flesh, shrugging off a portion of all damage.',
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
    description: 'Raise a frontal guard with its own health: hits and projectiles from the facing arc break against it instead of you. You move slowly and turn heavily while it holds.',
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
    description: 'Raise a WALL OF POINTS: a heavy guard whose face bites back — every blow you block bleeds the striker on the spikes. The wall itself never swings: its answer is PASSIVE, paid out per blow taken, and the longer you stand the more it collects. (An Answering Wall gem can still teach it the release-blow.) The greatshield made spiteful: stand, take, let them cut themselves.',
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
    description: 'The counter-blow\'s license: usable only within three heartbeats of TAKING damage — then it lands like a verdict, a heavy staggering arc that answers what was done to you. The slow style\'s exclamation mark: be hit, then be heard.',
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
    description: 'The answer the block bought: a narrow, vicious poke over the shield rim.',
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
    description: 'A heartbeat of perfect readiness: any frontal blow inside the window is ignored entirely and answered at 220% of its damage. The stance spends itself on the answer.',
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
    description: 'BELLOW A CHALLENGE: every enemy around you is TAUNTED — blades turn to YOU, and whatever still swings at your allies lands soft. Instant, and shoutable from BEHIND A RAISED GUARD: the wall itself calls the fight over.',
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
    description: 'The bulwark\'s rolling dare. A component payload: guard pulses toll these.',
    tags: ['warcry', 'aoe', 'instant'], color: '#e0763a',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 170, affects: 'enemies' },
    effects: [{ type: 'status', status: 'taunted', chance: 1, durationOverride: 2.5 }],
  },

  defiant_bulwark: {
    id: 'defiant_bulwark', name: 'Defiant Bulwark',
    description: 'Raise a JEERING WALL: a broad guard that DARES the field — while it holds, a rolling challenge TAUNTS everything near you every couple of seconds. The tank\'s stance: the fight comes to the shield because the shield insists. The dare is the whole verb — this wall holds court, it doesn\'t swing (Answering Wall can change its mind).',
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
    description: 'Plant a humming stone that WANTS to be hit: every eye nearby prefers it to any living thing (the decoy pull). It is REAL — wound it and it hums on; break it and the spell is spent. The pack-splitter, the trap-baiter, the seam-defender\'s second body.',
    tags: ['spell', 'construct', 'duration'], color: '#a5e3b4',
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
    description: 'A thrown insult with a stone in it: one struck body MUST answer you (taunted), peeled off its pack without waking the rest. The herder\'s crook — pull the brute away from the seam, or the archer away from its wall. Loud by nature: the hit books DOUBLE on the chart.',
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
    description: 'Walk beneath notice: for a few breaths your blows WHISPER on every chart (threat generation cut to a fraction) and your outline reads smaller (harder to detect). The swarm remembers the seam, not you — step aside and let the tide pass; strike from the hush and slip back out of the argument.',
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
    description: 'The phalanx-step: a NARROW tower guard you can genuinely WALK behind — three-quarters pace, shield braced, line advancing. Thinner protection than planting your feet, but the wall MOVES. Release still bashes.',
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
    description: 'A SORCERER\'S GUARD: a rune-lit ward raised like a shield — modest and slow-footed, but spellwork cast from behind it burns 25% HOTTER while the stance holds. Made for Guarded Casting and the guard-beat gems: the bruiser-mage\'s home ground.',
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
    description: 'Raise a COMMUNING WALL: a broad guard fed by your own footing — while the stance holds, POISE drains steadily into the shield, rebuilding it between blows (see engine: the conduit fabric). The pump draws only while the wall is dented and never below a quarter of your bar. Stack poise deep and the stone drinks deep: the bar is the fuel tank, the wall is the engine.',
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
    description: 'A slow overhead CRUMPLER built to break STANCES, not bodies: modest damage, but it hits poise two and a half times as hard and the Sundered it leaves lasts half again as long. The setup half of the executioner\'s grammar.',
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
    description: 'THE EXECUTE: usable only on a SUNDERED target — while their bar lies broken, the blow carries the cleaved poise itself as flat damage (150% of their maximum). Break the stance, then pass sentence; invest in Sundered duration to widen the court\'s hours. Enemies pass it too.',
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
    description: 'A whip-crack aimed at the RHYTHM, not the flesh: it reads true through 60% of the target\'s insight, rarely misses a runner, and half the time leaves them REELING — insight stops replenishing. The counter to everything that never stands still.',
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
    description: 'A humming void-dart that UNSINGS WARDS: every point an energy shield soaks is shredded double, and 60% of hits leave the shield VOIDED — recharge stops cold. Carried by null adepts for exactly one reason: mages.',
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
    description: 'The kata that TEACHES ITSELF: each cut hastens and sharpens THIS BLADE ALONE — eight stacks deep, peeling away in moments when the rhythm rests. Not charges, not a blessing: the skill itself, ramping. Keep cutting.',
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
    description: 'CHARGED: hold to SHEATHE — the blade drinks the stillness — and release a moonlit crescent whose edge and reach grow with the wait, up to 2.6x. The iaijutsu counterweight to Thousand Cuts: one perfect stroke against a thousand.',
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
    description: 'Push out a wide crescent of cold that washes through everything it touches, chilling as it goes.',
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
    description: 'Send a rolling wave of flame grinding forward — slow, wide, and through everything.',
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
    description: 'Hurl a flat wall of force — a beam-wide front that batters a broad lane and shoves whatever survives.',
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
    description: 'Erupt a ring of bone walls at the target point — what is inside stays inside until the bone breaks. Martyrdom and Unstable Flesh make the bars themselves explosive.',
    tags: ['spell', 'summon', 'minion', 'physical', 'duration'], color: '#d8d0b8',
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
    description: 'Slam a tight cage of bone shut around a single enemy. Smaller, meaner, personal.',
    tags: ['spell', 'summon', 'minion', 'physical', 'duration'], color: '#c8bca0',
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
    description: 'TOGGLE: while active, 40% of incoming damage is paid from mana before life, and the shield slowly drinks your mana to sustain itself.',
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
    description: 'A crackling jolt grants 60 energy shield for 8 seconds — filled instantly, recharging immediately.',
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
    description: 'Bless yourself and nearby allies with a 45-point absorption shield — eaten before every other defense — and Warded armor while it holds. A heal cast BEFORE the hit.',
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
    description: 'Raise a wall of three stone segments across your facing. Enemies must shoot it, hack through it, or go around.',
    tags: ['spell', 'guard', 'duration'], color: '#a8a090',
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
    description: 'Conjure a dome of protection: enemy projectiles crossing it dissolve into nothing. Stand inside and let them waste their quivers.',
    tags: ['spell', 'guard', 'aoe', 'duration'], color: '#9ad8c8',
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
    description: 'Hurl yourself through the air — untouchable in flight, clearing chasms — and land with a shockwave. Juggernaut tech.',
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
    description: 'Take to the air — untouchable in flight — and land in a raking sweep. The flock harries, vanishes, returns.',
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
    description: 'A precise thrust that deals 150% MORE damage from behind the target. Pairs viciously with Shadow Step.',
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
    description: 'BLESSING: you and allies around you deal 25% increased damage and move 15% faster for 6 seconds. Commander tech — minions love it.',
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
    description: 'Vomit a fan of caustic bile that eats armor and poisons everything it coats.',
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
    description: 'Loose a slow, crackling orb that ZAPS everything near its path as it drifts downrange.',
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
    description: 'Call the bolt itself: press again inside the golden window for the PERFECT strike — instant, long, and blinding.',
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
    description: 'A bolt that RICOCHETS: it leaps to the nearest unstruck enemy, and leaps again, and again — chains innately, and chain supports stack on top.',
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
    description: 'Rip 12% of the target\'s CURRENT life away as lightning (resistible; it can soften anything, but never kill). The bigger they are, the harder it bites.',
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
    description: 'BECOME the current: streak forward as living lightning, damaging and shocking everything along the line.',
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
    description: 'Pull the storm down on your own head: a zone that pulses fast, SHOVING enemies off you — battered back with every crack, not launched from the ring.',
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
    description: 'Raise a roaring wind over a wide swath: everything caught inside is BATTERED — shoved a random way with every gust, going nowhere good. The storm that toys with its catch.',
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
    description: 'CHANNEL a collapsing point of night: a small disc that ANNIHILATES what it touches, inside a far wider horizon that drags everything toward it. The orb grows the longer you hold — and so does the price, steeply. Greed ends channels.',
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
    description: 'Plant a humming beacon that HATES company: anything that comes near is battered away in pulsing waves. The inverse of the vortex — ground that refuses to be stood on.',
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
    description: 'A concussive ring that batters everything outward.',
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
    description: 'GET OVER HERE: hurl a barbed chain — the catch is STUNNED on the hook, YANKED to your feet, and held dazed through the landing. What it hits on the way over is its problem.',
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
    description: 'CHANNEL a rolling plague: venomous bolts spit out in RANDOM directions all around you, pulse after pulse — no aim, no mercy, just a spreading ring of rot.',
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
    description: 'Every poison you inflict FEEDS the reservoir. Loose it and you WALK as pestilence: the bank vents around you, second after second, until the venom runs dry. Use again to seal it.',
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
    description: 'Every ignite you set FEEDS the charge — point for point — while raw fire adds a quarter. Trigger it and the whole bank goes off around you at once. Arson, collected and repaid.',
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
    description: 'CONSUME a target\'s chill or freeze: the cold collapses inward — a shattering burst around them — and locks the victim SOLID for a fixed two seconds. Unusable until something in reach is cold enough.',
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
    description: 'Split the earth: the slam RIPPLES forward like a skipped stone — each shock a beat later, a step farther, a shade smaller. The first crack is the killer; the ripples chase the routed.',
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
    description: 'Sunder with the patience of a BELL: each shock lands a full beat after the last — a toll, a step farther out, heavier for the wait. The routed can outrun the knell; whatever stands and fights is standing in it.',
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
    description: 'Drive the blow into the ground at your feet: the impact is the WARNING — a modest crack, a shove — while the real violence gathers below. One breath later the broken earth ERUPTS, harder and wider. The lesson never changes: leave where you were.',
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
    description: 'Declare the fault line ELSEWHERE: the named ground cracks at a word — a warning tremor — then detonates TWICE on a rising beat. The far earth obeys the same law as the near: leave where the crack is.',
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
    description: 'Sunder as a THROWN STONE: the first skip is long and proud, and every skip after arrives sooner, smaller, softer — the shockwave pattering out across the field until the earth simply rests. Read the rhythm: the last few land almost together.',
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
    description: 'Condemn a patch of ground and let STRUCTURAL FAILURE do the arguing: a long, groaning stillness — then a collapse, then sooner a smaller one, then sooner again, the falls quickening and shrinking until the ruin settles into gravel. Leave before the mathematics finish.',
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
    description: 'Hang a struck BELL over the ground and let it gather: each toll arrives sooner and rings a little harder, the peals climbing over one another — and when the bronze can take no more, the FINALE: one crashing burst across the whole ring. Music theory, weaponized.',
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
    description: 'The bell swung the OTHER way: a quick nervous chatter of strikes that slows — and GROWS — each toll heavier than the last, spacing out into final blows that land like verdicts. The ritardando: fewer notes, and every one of them means it.',
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
    description: 'Open a hissing VENT in the earth: molten globs LOB OUTWARD from the cone — real projectiles, arcing away, shedding speed, BURSTING where they die — furious at first, settling as the chamber spends itself. The vent itself cooks whatever stands on it. Artillery you plant like a garden.',
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
    description: 'A gout of molten stone, thrown by the mountain.',
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
    description: 'Strike the ground and send it CHURNING: a slow wave of broken earth that rolls forward and GROWS as it goes — small where it starts, a landslide where it arrives.',
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
    description: 'The arrowhead is a KEG: it sticks in the victim, armed on a short fuse — and every further arrow PUMPS the same keg. The charge rides the target wherever they run (Storm Call waits at an address; this one travels).',
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
    description: 'Set a blade SPINNING around you on a held tether: it cuts whatever drifts into the ring, again and again, until it wears out. Cast again for a second blade, a third… the satellite guard, built one knife at a time.',
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
    description: 'A driving thrust that leaves STEEL BEHIND: a third of the blow\'s physical force lodges in the wound as a spearhead, and your NEXT hit drives it through — the stored violence landing as its own separate blow. Stack the steel, then knock it home.',
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
    description: 'WRENCH every lodged spear free at once: each impalement in reach pops its whole stored violence into its host — and the steel itself flies HOME to your hand, piercing whatever stands between. The harvest, called back through the crowd.',
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
    description: 'Lodged steel, recalled the hard way.',
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
    description: 'Hurl a spear that punches through one rank and PLANTS where it lands — a standing shaft the rest of your kit can use (Tripwire Web strings killing fences between planted spears). The battlefield remembers where you threw.',
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
    description: 'The INVERSE Sunder: the first crack is a whisper — and each ripple outward lands BIGGER and harder than the last. The far ring is the killer; the epicenter is the warning.',
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
    description: 'Work the field like GRASS: the scythe crosses left, center, right — three quick arcs sweeping SIDE TO SIDE across your front instead of one cone punched forward. Reap for those who mow.',
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
    description: 'Tear a CLOSE-WORK spirit into being: a wraith that fights at arm\'s length, sweeping its own small reap through whatever crowds it. The same exponential rot as its ranged kin — permanence is never for sale.',
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
    description: 'MASH while the barrel cycles: every press LOADS another burning shell, and each rings out as its own short salvo — the timed-click Barrage. Spits over time; rewards the drummer\'s wrist.',
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

  time_dilation: {
    id: 'time_dilation', name: 'Time Dilation',
    description: 'Pinch the clockwork: every OTHER skill\'s running cooldown sheds 2 seconds and a quarter of what remains. Its own long clock is the price — the winder cannot wind itself (#19).',
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
    description: 'Read the target and PAINT the flaw: a weak spot appears on their health bar just below the wound. Hit them INTO the window and every blow lands 40% harder; punch them THROUGH it and the spot shatters. Aim at the bar, not the body.',
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
    description: 'Speak the sentence: DOOM settles on the target, a counter with a fixed fuse. Every further Word PUMPS it — and the instant the bank covers what life remains, it goes off EARLY. The cull that does its own arithmetic.',
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
    description: 'Usable at its best on the OPENED: consumes every stack of Vulnerable on the target — 45% MORE per stack consumed — in one falling blow. Five wounds opened, one verdict through them all.',
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
    description: 'Clad yourself in patient iron: for six seconds you take 25% LESS damage — and everything that still lands is BANKED. When the ward ends, the whole bill DETONATES around you. Stand in the crowd and make them regret the arithmetic.',
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
    description: 'Every BLOCK — stance or shield-luck — banks a bead of magma (to five). Press to VENT the beads: a molten nova, 40% harder per bead spent. The wall that saves its change and pays in fire.',
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
    description: 'Pressed MID-GUARD (it fires around the raised shield): half your remaining mana crystallizes into shield health — past its maximum. The uber-shield, bought with the blue bar. Combos with Shield Up, Riposte, Ice Shield.',
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
    description: 'Three thorn-shards orbit your shoulders. Every blow that LANDS on you breaks one — and it lands snarling: a burning hound at the attacker\'s heel for eight seconds. Hit me again. See what happens.',
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
    description: 'TOGGLE AURA (reserves 30 mana): you and allies inside grow a coat of iron quills — flat thorns on every landed blow, plus a tenth of each wound reflected. Being hit becomes a tax on the hitter.',
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
    description: 'TOGGLE AURA (reserves 30 mana): a third of every wound you take flows down the link onto your minions instead, split among the living. The wall of bones is a defensive layer — keep it fed.',
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
    description: 'The fight itself STOKES them: kills may kindle a cinderkin husk at the corpse, and BLOWS TRADED — yours and your court\'s — heat a gauge that coughs up embers even from bosses who bring no court of their own. Walk through a kindled husk to claim it; they LATCH to what they reach and bite while it carries them. HOLD to sweep the horde at the cursor.',
    tags: ['spell', 'minion', 'summon', 'fire'], color: '#e08848',
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
    description: 'ATTUNE to the quiet dead: their haunts glimmer for your eye alone, and walking among them makes them YOURS — a finite gathering the world does not regrow. They keep their distance and their zaps PHASE through stone. HOLD to sweep the host at the cursor; release, and they linger on the task, then heel.',
    tags: ['spell', 'minion', 'summon', 'cold'], color: '#b8d8e8',
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
    description: 'Gnats condense out of the air on their own clock — sometimes at your heels, sometimes a walk away — and evaporate if left unclaimed. Each is nearly nothing; the CLOUD is the weapon: riders stack HARRIED on whatever carries them, spoiling aim and attention. HOLD to sweep the veil at the cursor.',
    tags: ['spell', 'minion', 'summon', 'physical'], color: '#a8b860',
    manaCost: 1, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.25, move: 'slowed', moveFactor: 0.85 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: {
      monsterId: 'gnatling', cap: 24, batch: 8,
      sources: [{ kind: 'motes', every: [6, 10], at: 'mixed', ttl: 40 }],
    },
    requirements: { willpower: 10 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.08), mod('minionLife', 'increased', 0.12)] },
    minDropLevel: 5,
  },

  summon_swarmlings: {
    id: 'summon_swarmlings', name: 'Hivecall',
    description: 'TOGGLE a hive contract: mana stays reserved while up to five swarmlings scurry for you, reknitting themselves whenever they fall. SHIFT-press the slot to ENRAGE the horde — a pressed wave of speed and spite.',
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
    description: 'The horde froths: minions strike faster and harder for a few seconds.',
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

  // The COMMAND (also the summons' meta payload): the horde goes where you
  // point — the inverse Bombardment (#39). Equippable on its own, too.
  command_assault: {
    id: 'command_assault', name: 'Command: Assault',
    description: 'Point, and the horde OBEYS: every minion drops its own fight, marches on your mark, and kills whatever holds it. Point AT a foe to pin the whole court on that one. The rift opens at your feet; the teeth arrive where you aim.',
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
    description: 'The pack-leader barks the pack onto its quarry. Every packmate in earshot that HEEDS — obedience is a dial in the brain, and gnolls barely listen — drops its own hunt and converges on the mark.',
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
    description: 'Seize the world\'s clock. Everything outside your own circle hangs mid-breath — arrows frozen in flight, jaws stopped mid-snap — until time remembers itself. What you loose meanwhile waits in the air with them.',
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
    description: 'A needle of unraveled time. The victim it takes hangs OUTSIDE the world — timers, wounds and thought suspended, a statue you may study or shatter — and any it merely grazes drags at half rate.',
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
    description: 'A flick of restoring light: instantly heal the ally under your cursor (or the most wounded in reach — yourself when alone). The support player\'s jab.',
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
    description: 'A measured invocation over an ally\'s wounds — slow to speak, generous to land. The big, deliberate heal.',
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
    description: 'A spoken blessing that lands NOW: everyone on your side around you is mended at once. The instant group heal — the panic button that answers.',
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
    description: 'Gather the congregation and SPEAK: a long invocation that restores everyone around you in a wave of shared light. The big group heal — worth protecting its cast.',
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
    description: 'Call a soft rain over the target ground: allies standing in it are mended every half-second while it falls. Position IS the heal.',
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
    description: 'Sanctify the ground itself: the field SEARS whatever hostile stands on it and MENDS whoever kneels with you — one circle, two verdicts. The paladin\'s floor.',
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
    description: 'CHANNEL a thread of living water onto an ally: quick pulses of mending that FOLLOW the most wounded while you hold. Socket Mending Chain and the stream forks — the channeled chain-heal.',
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
    description: 'Burn the afflictions OFF an ally: strips their newest curses and ailments (blessings untouched) and leaves a little light in the wound.',
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
    description: 'The paladin\'s arc: one swing that WOUNDS the enemies in it and MENDS the allies standing among them — everyone but you. The burden is the point.',
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
    description: 'CHANNEL a thin dark thread into whatever stands before you: their life runs UP the line into yours. Sustain spun straight out of violence.',
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
    description: 'Loose a fan of hungry souls: whatever they bite, a tithe of the wound flies home to you as healing. Damage that pays its keep.',
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
    description: 'Plant a sapling that DRINKS the violence around it — every wound your side deals nearby feeds it, and it visibly swells. When it ends (ripe, felled, or replaced) it BURSTS: everything banked pours out as healing over the grove.',
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
    description: 'Plant a font that TENDS the ground it holds: every beat it seeks the most wounded ally in reach and sends a mending pulse that LEAPS onward to the next-most-hurt. The chain heal, tethered to a place.',
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
    description: 'A pulse of restoration that leaps between the wounded.',
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
    description: 'A small mending laid on the most wounded nearby.',
    tags: ['spell', 'heal', 'targeted'], color: '#a8f0c8',
    manaCost: 8, cooldown: 2.5, useTime: 0.5,
    targeting: { target: 'ally', castRange: 260, fallback: 'fail' },
    delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 8, pctMax: 0.04 }],
    ai: { range: 260, weight: 4 },
  },

  summon_cleric: {
    id: 'summon_cleric', name: 'Summon Skeletal Cleric',
    description: 'Raise a robed servant whose hands remember mending: it follows the fight and lays Soothing Touch on whoever of yours bleeds worst — you included. If the clerics fall, you dig them up again.',
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
    description: 'Bind a floating wisp of warm light to your shoulder: it drifts with you and tends the most wounded ally in reach, over and over, for as long as it holds together.',
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
    description: 'TOGGLE AURA (reserves 35 mana): you and allies inside gain +20% to ALL elemental resistances and shrug one incoming ailment in four.',
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
    description: 'TOGGLE AURA (reserves 25 mana): +35% lightning resistance for everyone covered, and half of all incoming SHOCKS ground out harmlessly.',
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
    description: 'TOGGLE AURA (reserves 40 mana): everyone covered stands 60% more armored, with a further flat plate on top. The line does not break.',
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
    description: 'Split the earth and send the CRACK travelling: a fissure grinds forward, and all along it the ground ERUPTS — gouts of magma bursting from the wound while it stays open.',
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
    description: 'A gout of magma bursts from the broken ground.',
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
    description: 'The target ground DETONATES — a heavy immediate blast, then three seconds of churning fire. The wounds it leaves are CAUTERIZED: healing is halved while they burn (regen, leech, and mending alike).',
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
    description: 'Raise a storm cell over the field: for six seconds, bolts hammer RANDOM victims standing under it — no pattern, no mercy, just weather. Empty sky strikes nothing.',
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
    description: 'A bolt from the cell overhead.',
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
    description: 'Crack the ground for a pittance of damage — and something UNDERNEATH takes interest: tendrils lash up at whatever stands on the wound, two at a time, snaring and shredding while the crack stays open.',
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
    description: 'A tendril whips up from the broken earth.',
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

  talon_rake: {
    id: 'talon_rake', name: 'Talon Rake',
    description: 'A fast raking strike that opens shallow, bleeding cuts — the hunting-bird\'s argument.',
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
    description: 'A skull-splitting wail: those caught in it fumble what they were doing (35% interrupt) and swing weaker while their ears ring.',
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
    description: 'The ground knots itself under your victims, then HEAVES — damage and a true ROOT (movement skills forbidden) for those who linger in the telegraph.',
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
    description: 'A whipping fan of green-wood switches: shallow cuts that SNARE — the caught wade as if through briar.',
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
    description: 'Loose a fan of jagged splinters — heartwood shrapnel that sticks and bleeds.',
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
    description: 'Call a drifting rain of spore-clusters over an area — each puff bursts soft and SICKENS.',
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
    description: 'Shake the ceiling loose over the marked ground — stone teeth rain in a drumming sequence, and what they strike they STAGGER.',
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
    description: 'Vent a choking ring of spores from the body — poison in the blood, static in the mind (a chance to befuddle).',
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
    description: 'A retched sheet of caustic bile — everything it coats begins to DECAY.',
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
    description: 'A held, lidless stare — a thin ray that BUILDS the weight of being watched (beheld, stack by stack).',
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
    description: 'Meet them with the mountain\'s regard — a thin, held stare that settles WEIGHT into the victim, stack by stack, toward stone. Statues take the shattering blow a little wider.',
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
    description: 'Lance a thin beam of SPLIT light — fire, cold and lightning riding one ray. Crystals take your strongest color.',
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
    description: 'The lidless serpent stare — weight settles into your limbs, stack by stack, toward stone.',
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
    description: 'A shivering nova of stinging tears — heads go LIGHT where the salt mist settles (faintness).',
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
    description: 'A lobbed gob of half-digested matter that bursts SOUR — the splash turns stomachs (queasy).',
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
    description: 'FOCUS on an enemy and HOLD — the stare fills only while your cursor rides the target (the concentration art; the Ocular\'s own trick, learned back off its walls). Hold it to the end and they are SEEN: marked meat, taking increased damage while the mark rides. Break early and the focus drains, not drops.',
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
    description: 'A snap of falling pressure — a nova that turns every head in reach LIGHT (faintness, stack on stack), and lands harder on the already-pale. Pale the room, then collapse it: at the cap the ladder does the rest (swoon).',
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
    description: 'Condemn ground to the stomach\'s arithmetic: a bile pool that SPREADS as it works (the Gutworks\' patience, bottled), souring stomachs and dissolving what stands its ground. Leave before the mathematics finish, or make sure they finish first.',
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
    description: 'A flung gout of the country\'s own humor that BLINDS what it coats — aim crushed, perception halved. The eye country hates nothing more than its own trick; everything else just hates being blind.',
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
    description: 'Ring a bell only the inner ear hears — every head in reach loses another cardinal (disoriented, stack on stack). At the fifth the world TURNS: they walk widdershins, feet contrary to every intent. Herding monsters ABOUT — off ledges, out of their own auras, into the ground you laid — is the art.',
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
    description: 'A hex that crosses the wires between wanting and doing: the struck hand keeps REACHING WRONG (addled) — pressed casts may fire the kit\'s neighbor instead, and cooldowns burn at the worst possible moment. Watch a warcaster spend its opener on a wall.',
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
    description: 'Point at one mind and turn it WIDDERSHINS outright — no ladder, no patience: every step it takes runs contrary while the hex rides. A charger flees, a fleer charges, and the melee that wanted your throat spends the whole spell walking somewhere honest. Never a stun: it keeps its hands; you take its feet.',
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
    description: 'Heave a wet knot of viscera. It hits like a sack of rot and leaves the victim VULNERABLE — opened a little wider for everything after.',
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
    description: 'TOGGLE: wear a guard on your BACK — a directional shell across the half-circle behind you that EATS hits arriving through it (their ailments and knockback with them) until it breaks, then knits itself whole after a quiet breath. Strength scales with Guard Strength. Turn your back only on what you trust it to hold.',
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
    description: 'The snare closes: iron jaws and a held ankle.',
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
    description: 'Spit a hooked line of silk: a weak hit that ROOTS the caught for a breath — long enough for what spun it to arrive.',
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
    description: 'Unseen hands rip something loose and THROW it — a stone, a chair, a headstone. Heavy enough to stagger.',
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
    description: 'Whistle a wing of crimson bats out of the dark to harry your prey.',
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
    description: 'The lacquered door swings and the kept come out hungry.',
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
    description: 'Deposit a swollen egg sac. Seven seconds later it SPLITS and the brood boils out — unless someone stamps it first.',
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#c8c0a0',
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
    description: 'The egg splits: spiderlings boil out.',
    tags: ['spell', 'summon', 'minion'], color: '#c8c0a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'summon', monsterId: 'spiderling', count: 2, maxActive: 8 },
    effects: [],
  },
  lay_chitin_clutch: {
    id: 'lay_chitin_clutch', name: 'Lay Chitin Clutch',
    description: 'Seal a clutch of eggs in resin. Left alone it SPLITS and the seethe boils out — unless someone stamps it first.',
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#d8b06a',
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
    description: 'The resin cracks: drones boil out.',
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
    description: 'The wings catch: the body lifts from the reachable world and rides the swarm-wind.',
    tags: ['spell', 'buff', 'movement'], color: '#e8d8a0',
    manaCost: 0, cooldown: 1.2, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'status', status: 'aloft', chance: 1 }],
  },
  locust_dive: {
    id: 'locust_dive', name: 'Stooping Bite', noDrop: true,
    description: 'The weave tightens, the wings fold, and the locust falls on the mark — readable from the ring it paints.',
    tags: ['attack', 'physical', 'movement'], color: '#e0b054',
    manaCost: 0, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [6, 11] },
    delivery: { type: 'leap', range: 420, airTime: 0.85, radius: 60, telegraph: true },
    effects: [{ type: 'shed', status: 'aloft' }, { type: 'damage' }],
    ai: { range: 400, weight: 1 },
  },
  saltant_slam: {
    id: 'saltant_slam', name: 'Stooping Crush', noDrop: true,
    description: 'The saltant folds its great femurs and drops like a thrown stone — the crater is promised before it lands.',
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
    description: 'The wings still; the body settles onto the sand.',
    tags: ['spell', 'movement'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'shed', status: 'aloft' }],
  },
  // --- THE MOUNTAIN'S OWN (the highland country kin) ------------------------
  condor_stoop: {
    id: 'condor_stoop', name: 'Stooping Talons', noDrop: true,
    description: 'The condor folds off its thermal and falls — the ring on the ground is the only warning it owes.',
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
    description: 'A long note off the horn — and the slope answers: what looked like rubble stands up hungry.',
    tags: ['spell', 'summon'], color: '#b8ab90',
    manaCost: 40, cooldown: 12, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'scree_skitter', count: 2, maxActive: 4 },
    effects: [],
    ai: { range: 600, weight: 1.4, keepDistance: 320 },
  },
  stridulate: {
    id: 'stridulate', name: 'Stridulation', noDrop: true,
    description: 'The singer saws its wing-combs and the whole murmuration answers — a furor carried on the drone.',
    tags: ['spell', 'buff', 'aoe', 'duration'], color: '#e8c878',
    manaCost: 12, cooldown: 12, useTime: 0.8,
    delivery: { type: 'nova', radius: 260, affects: 'allies' },
    effects: [{ type: 'status', status: 'furor', chance: 1 }],
    ai: { range: 300, weight: 2, keepDistance: 220 },
  },
  lay_grub_clutch: {
    id: 'lay_grub_clutch', name: 'Lay Grub Clutch',
    description: 'Bury a clutch of pale eggs. Left alone they HATCH a wave of maggots; broken, they are only a smear.',
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#d0c8a8',
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
    description: 'The clutch quivers, splits, and spills.',
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
    description: 'Plant a fat, pulsing SEED among them — a thing with a schedule. A moment\'s incubation and it BLOOMS: a ring of grasping vines that rends and snares everything in reach. Break it early and it blooms ANYWAY, insulted. Gardening, as a threat.',
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
    description: 'The seed\'s answer: a ring of grasping vines.',
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
    description: 'Grow a fence of thorned bramble across the way: it stands, it scratches, it does not apologize. The hedge answers to FIRE poorly on purpose — your own flame clears it double-quick when the garden needs re-planning — and every torn-out section leaves a parting spray of thorns.',
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
    description: 'Loose a low tide of bramble that CRAWLS forward and PUTS ON MASS as it goes — a hedgerow with ambitions, dragging its thorns across everything it overtakes. Slow, inevitable, wider every yard: the garden is coming.',
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
    description: 'Inscribe a circle of standing power at your feet: allies INSIDE it cast 25% harder and 15% faster. The rune does not follow — the discipline is standing your ground on it.',
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
    description: 'Claim the ground itself: everything hostile standing in the dominion is OPPRESSED — 12% more damage taken, slowed, and steadily poisoned. Your terms, your terrain.',
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
    description: 'Loose a pale, sweet fog with NO teeth at all — nothing about it hurts. Anything that BREATHES it for a heartbeat and a half goes heavy: slowed to a trudge, swings drooping, guard sagging open. The fume is the trap; the follow-up is your business.',
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
    description: 'Light the swinging censer: a wreath of consecrated smoke RIDES you, and any ally who walks in it long enough to truly breathe — a slow second — carries the blessing while they stay: harder blows, quicker hands, a steady mending. Faith as an atmosphere; devotion, measured in dwell time.',
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
    description: 'Wind the repeater, then let it SING: the shots pour out one after another as the mechanism cycles — and it keeps tracking your aim through the burst. A canceled windup fires nothing.',
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
    description: 'The air itself turns hostile: a shard of deep cold CONDENSES at your mark — not in your hand — and bores onward, bursting where it ends.',
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
    description: 'CHANNEL a stream of crackling missiles that CHASE YOUR CURSOR — drag the swarm across the field like a brush loaded with lightning.',
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
    description: 'Tear a rift at your mark: for six seconds it SPEWS fire missiles that loosely chase your cursor — point at what should burn and the rift obliges.',
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
    description: 'A gobbet of riftfire that wanders after its master\'s mark.',
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
    description: 'Conjure a mirage of yourself that hovers at your shoulder, loosing spectral arrows at nearby foes on its own clock. It is a ghost: untouchable, tireless, and thinner than you.',
    tags: ['attack', 'projectile', 'mirage', 'duration'], color: '#8fd4c8',
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
    description: 'An arrow of shimmer and spite.',
    tags: ['attack', 'projectile', 'physical'], color: '#8fd4c8',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [7, 12] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 560 },
    effects: [{ type: 'damage' }],
  },

  shadow_clone: {
    id: 'shadow_clone', name: 'Shadow Clone',
    description: 'Substitution: step back in smoke, leaving a shadow of yourself standing your ground. For its brief life it MIRRORS your strikes from where it stands, at a fraction of your power, on a throttled beat — two ninjas, one kill. It can be cut down.',
    tags: ['spell', 'clone', 'duration'], color: '#6f5f9e',
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
    description: 'A whirling sliver of night.',
    tags: ['attack', 'projectile', 'physical'], color: '#4a4066',
    manaCost: 0, cooldown: 0, useTime: 0.6,
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 540, radius: 5, range: 420 },
    effects: [{ type: 'damage' }],
    ai: { range: 380, weight: 2, keepDistance: 200 },
  },

  shadow_slash: {
    id: 'shadow_slash', name: 'Shadow Slash', noDrop: true,
    description: 'A backhand of cold umbra.',
    tags: ['attack', 'melee', 'physical'], color: '#4a4066',
    manaCost: 0, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [9, 14] },
    delivery: { type: 'melee', range: 55, arcDeg: 110 },
    effects: [{ type: 'damage' }],
    ai: { range: 60, weight: 3 },
  },

  reap: {
    id: 'reap', name: 'Reap',
    description: 'Swing the scythe and LET GO: a crescent of shear leaves your hands and travels forward, harvesting each foe it passes through exactly once. Duration investment carries it further.',
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
    description: 'One press, one full turn: the blade walks a circle around you, arc by arc.',
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
    description: 'A shrieking skull of flame boils out and RUSHES your foes for a few seconds. The cap is twenty — a race no one wins without cast-speed investment.',
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
    description: 'CHANNELED: the pyre pours out raging spirits on the beat — and the longer it burns, the HOTTER each newborn skull (quadratic, to triple). Shares the twenty-skull pool.',
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
    description: 'Tear a hungry spirit into being. It is not on a clock — it is on a CURVE: an exponential rot no healing outruns for long. Minion-life investment buys real seconds; permanence is never for sale.',
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
    description: 'Tear the ground open AT YOUR MARK: four waves of paired demons boil out where you point — re-aimed at your live cursor per wave — and rush the nearest thing to detonate.',
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
    description: 'A spear of raw arcana whose price is a TITHE of your whole pool — and every point of mana spent returns as added lightning. The deeper the well, the heavier the lance.',
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
    description: 'Open your own veins and DETONATE the tithe: a nova of blood whose damage grows with every drop of life the cast drank.',
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
    description: 'Call the host HOME: every mobile minion blinks to your side and mends (~3% of its life over 2 seconds). Anchored things stay planted.',
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
    description: 'TOGGLE: while running, an empty mana pool refuses to say no — unaffordable casts OVERDRAFT their cost into reservation instead. Repayment flows only after a breather (2.5s without an overdraft), and the toggle is LOCKED ON until the debt clears. The boost is now; the bill is soon.',
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
    description: 'TOGGLE: when your life cannot pay a blood price, the debt BORROWS the top of your pool instead — your ceiling drops until it is repaid. Repayment metabolizes through life regeneration, FASTER the quicker you swing. Locked on while the mortgage stands.',
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
    description: 'TOGGLE: give yourself to the red. Your life BURNS AWAY in earnest — but every wound you deal drinks some back, your attacks quicken and harden, and while you stand above half health the rage WILL NOT let go. Melee blows stoke RAGE charges: each one is speed AND raw attack damage, cooling once the hitting stops. Swing or bleed out.',
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
    description: 'The thirst BUILDS on its own — a charge every few heartbeats, more on every kill — and holds until you UNLEASH it. Then it only drains: speed and fury bleeding away charge by charge, and NOTHING can stall it or feed it until the last drop burns.',
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
    description: 'A reliquary that DRINKS the dying: anything that falls nearby yields a SOUL (they seep away if hoarded). Release consumes every soul for a nova of grave-cold — 35% more per soul burned. The soul-collector, baked into one gem.',
    tags: ['spell', 'chaos', 'cold', 'aoe'], color: '#9a86e8',
    manaCost: 10, cooldown: 2, useTime: 0.6,
    // The passive IS the skill: deaths near you bank fuel while it's equipped.
    chargeGain: [{ charge: 'soul', amount: 1, max: 12, on: 'enemyDeath', radius: 420 }],
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
    description: 'Anoint your weapons in living fire: your next 6 ATTACK uses carry added fire and a strong chance to ignite. Each swing spends a round; the last one gutters out.',
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
    description: 'Load a quiver of envenomed heads: your next 8 PROJECTILE uses drip chaos and poison on whatever they find. One volley, one round — reload when the quiver runs dry.',
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
    description: 'CHANNEL: an expanding ring of wind and lightning — the eye stays calm while the wall of the storm grows outward around you.',
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
    description: 'Wear the storm for a while: lightning gnaws everything around you, and the charged air feeds your mana.',
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
    description: 'Clap the air apart: an instant concussive burst that staggers and shoves everything beside you.',
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
    description: 'Detonate the static: SHATTERS shock on everything it hits — the shock is consumed for 80% MORE damage. Stack shocks, then flip the breaker.',
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
    description: 'TOGGLE AURA (reserves 30 mana): the air around you stays charged — enemies inside take 15% more damage and a slow lightning gnaw.',
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
    description: 'Charge your sinews: for 10 seconds, 40% of your attacks\' physical damage becomes lightning and your hands move faster.',
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
    description: 'A crackling orb that ORBITS you on a widening tether, zapping everything its storm touches — composition of primitives, weaponized.',
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
    description: 'The classic: a heavy orb of flame that EXPLODES on impact, splashing fire across everything near the strike.',
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
    description: 'Detonate a burning enemy: their ignite is CONSUMED — its remaining damage lands at once — and the fire leaps to everything nearby, igniting anew.',
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
    description: 'Draw a spear of white flame: press again inside the golden window for the PERFECT throw. Pierces everything in line.',
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
    description: 'A whip-fast dart of flame that punches through two ranks. Cheap, quick, relentless.',
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
    description: 'CHANNEL a swelling core of flame — NOTHING fires while you gather, only the price ticks. RELEASE to detonate everything you banked at the mark: damage and area compound with every held second. A tap fizzles; patience levels city blocks.',
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
    description: 'MULTITUDE: hammer the button during the cast — every press is another burning shell out of the barrel.',
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
    description: 'CHARGE: hold to gather the mountain, release to raise it. The volcano spits exploding magma at random ground around it — charge longer for a longer, angrier eruption.',
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
    description: 'A gob of molten rock that bursts where it lands.',
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
    description: 'Kindle a mote of living fire that orbits your shoulder for a while, spitting bolts at whatever comes close. Untouchable; it simply burns out.',
    tags: ['spell', 'fire', 'summon', 'minion', 'duration'], color: '#ffc05a',
    manaCost: 24, cooldown: 9, useTime: 0.6,
    delivery: { type: 'summon', monsterId: 'flame_core', count: 1, maxActive: 2, duration: 10 },
    effects: [],
    requirements: { intelligence: 18, willpower: 14 },
    ai: { range: 400, weight: 1, keepDistance: 300 },
  },

  solar_orb: {
    id: 'solar_orb', name: 'Solar Orb',
    description: 'Hang a small sun over the field: everything in its light slowly cooks.',
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
    description: 'Snap your fingers: the target is simply ON FIRE. The fuel for Combustion and Powderkeg alike.',
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
    description: 'Crown yourself in fire: for 10 seconds your attacks carry added fire damage.',
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
    description: 'Curse a target into ordnance: when the mark expires, they DETONATE — themselves and everything beside them.',
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
    description: 'Raise a ring of fire that immediately sears the rim — then CLOSES INWARD, cooking everything that lingers inside the cage. Sigils reshape the cage itself.',
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
    description: 'Draw a burning line across the field — walk through it and burn. A sigil bends the wall into a square or triangle; Elemental Conduction lets YOUR projectiles drink from it as they pass.',
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
    description: 'Take wing in a sheath of flame and crash down — untouchable in the air, igniting everything under the landing.',
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
    description: 'Loose a flurry of mad embers that weave drunkenly downrange, igniting whatever they blunder into.',
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
    description: 'The fire INHALES: a searing cone that drags its victims toward you. Feed the flames.',
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
    description: 'Dash in a streak of flame, sowing burning ground the whole way. The shortest path between two points is on fire now.',
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
    description: 'Hurl a spear of ice that SHATTERS on impact — five shards rake the cone behind whatever it strikes.',
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
    description: 'A sliver of flying ice.',
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
    description: 'A jagged splinter of the shattered projectile.',
    tags: ['projectile', 'physical'], color: '#c8c0b0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [5, 9] },
    delivery: { type: 'projectile', speed: 520, radius: 5, range: 180 },
    effects: [{ type: 'damage' }],
  },

  icy_comet: {
    id: 'icy_comet', name: 'Icy Comet',
    description: 'Call down a comet of ice: a delayed impact that leaves a sheet of REAL ice behind — slippery for everyone.',
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
    description: 'The crown answers: a driven ring of frost that HURLS bodies outward — and on glare ice, a shove keeps travelling. The arena is the other half of this blow.',
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
    description: 'The dark under the ice INHALES: a delayed maw that drags everything toward its centre. Stand where the blades are not about to be.',
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
    description: 'Breathe a sheet of polished ice over the ground — REAL ice: traction becomes a rumor there, for everyone.',
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
    description: 'CHANNEL: spray a continuous fan of tiny ice shards while the trigger is held.',
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
    description: 'Open a swirling pocket of dead cold that DRAGS enemies toward its center while it gnaws at them.',
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
    description: 'Send a field of grinding frost CREEPING forward, chilling everything it crawls over.',
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
    description: 'Detonate your own cold projectile wherever it flies (150% damage) — pop a Frozen Orb mid-orbit. With nothing in the air, the snap bursts around you instead.',
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
    description: 'A crushing pulse that SHATTERS the chilled and the frozen: their cold statuses are consumed for 100% MORE damage. Chill first, then break.',
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
    description: 'GUARD: encase yourself in a 360° shell of ice. You cannot move — but nothing gets through until the shell breaks or you release it, and either way it EXPLODES in cold. The burst is a true COLD hit: your cold and spell power grow it, it can crit, it can chill the room — the caster\'s bash, weaker per point of shell but built to scale.',
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
    description: 'A dagger of living ice — a tight, fast thrust with a vicious critical edge. Press again on the mark for the flawless cut.',
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
    description: 'CHANNEL: a widening cone of crushing snow that builds the longer you hold it — damage and area RAMP, and the wall of white shoves everything backward.',
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
    description: 'Blink forward — and the place you stood ERUPTS in frost and freezes over into real ice. Leave them something to remember you by.',
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
    description: 'TOGGLE AURA (reserves 30 mana): allies inside gain +30 energy shield while the cold itself gnaws at enemies and slows their hands.',
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
    description: 'The altar drags the nearby dead up through the soil.',
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
    description: 'The hive node splits at the seams and the brood pours out.',
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
    description: 'The rift spits burning things into the world.',
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
    description: 'The stone exhales frozen servants.',
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
    description: 'The stone calves glittering young.',
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
    description: 'A chime that rings through everything standing near — friend, foe, and the crystals themselves.',
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
    description: 'A shriek out of key — everything near takes the wrong note.',
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
    description: 'The sac swells and calves another crop of the Bloom.',
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
    description: 'The eggs quiver, split, and spill the brood.',
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
    description: 'The bloom sloughs living gobbets of itself.',
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

  // --- THE HARROWING (the Gloamwood country's fear-craft) --------------------
  // The player-facing pool the haunted manor unlocks ('manor_entered' gates
  // the Vault bundle) plus the Carven Court's own verbs. The family identity
  // is the FEAR LADDER (status.ts harrowing → horrified): build dread, break
  // nerve, and fight things while they flee — the CC class that repositions.

  gourd_bomb: {
    id: 'gourd_bomb', name: 'Gourd Bomb',
    description: 'Lob a carved gourd packed with wick and dread. It bursts in flame — and whatever the carving means, those caught reading it lose their nerve.',
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
    description: 'Set a hand-lit wick where you point: a small standing light that feeds the Light of everyone in its glow. It burns for every body it warms — share it and it spends twice as fast — and gutters out when the pool is drunk. Duration deepens the wick; area widens the glow.',
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
    description: 'A wail with a winter in it. Builds HARROWING on everything in the cone — trembling hands, backward feet — until the nerve BREAKS and they rout outright.',
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
    description: 'Plant a bound scarecrow to watch your field. Its blows carry the Harrowing by nature. Scales with your minion stats.',
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
    description: 'The sower lobs one of its carvings, still grinning.',
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
    description: 'The watcher opens its arms and the field answers.',
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
    description: 'The ground splits and the warren answers.',
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

  festering_bite: {
    id: 'festering_bite', name: 'Festering Bite', noDrop: true,
    description: 'A filthy bite that leaves the wound ROTTING.',
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

  // --- THE LONG CANDLE's verbs (the Wax Court & the Umbral Parliament) ------
  // The drip and the re-light are RESPONSE payloads (MonsterDef.onHitByType
  // free-casts them — no ai hint needed, no def.skills listing); the pulse is
  // the candle-shrine's working verb.

  wax_drip: {
    id: 'wax_drip', name: 'Dripping Wax', noDrop: true,
    description: 'The melt runs off in a burning pool.',
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#f0c26a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [3, 5] },
    delivery: { type: 'ground', radius: 38, castRange: 60, lingerDuration: 2.5, tickInterval: 0.5, noImpact: true },
    effects: [{ type: 'damage' }],
  },

  wax_flare: {
    id: 'wax_flare', name: 'Wax Flare', noDrop: true,
    description: 'The pool takes the flame and ANSWERS.',
    tags: ['spell', 'fire', 'aoe'], color: '#ffb45e',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [8, 13] },
    delivery: { type: 'nova', radius: 70 },
    effects: [{ type: 'damage' }],
  },

  waxlight_pulse: {
    id: 'waxlight_pulse', name: 'Waxlight', noDrop: true,
    description: 'The candle sees you. Everything the candle sees, the Court sees — and shadows most of all.',
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
    description: 'A wide, committed swing paid from a bank of THREE charges — spam them down to empty, then wait as one restores every few seconds. The reference charge economy: gems and passives add charges and quicken the refill.',
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
    description: 'An eight-bolt drum worked as fast as the finger — no trickle, no mercy. Spending the LAST bolt starts the reload clock; when it runs out the drum racks itself full in one motion. Mid-drum, the clock never moves.',
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
    description: 'THREE shells of wide, brutal shot — and no clock to save you: the empty gun BECOMES its own reload, a shell-by-shell channel you may cut short and fight on whatever you racked. Shift reloads early; a topped drum lowers your hands itself.',
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
    description: 'Shell by shell the drum refills — one per beat of the channel. Cut it short and fight with what you racked; a topped drum lowers the hands itself.',
    tags: ['reload', 'munition', 'channel'], color: '#d89050',
    manaCost: 0, cooldown: 0, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.55, windup: 0.4, move: 'slowed', moveFactor: 0.55 },
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges', amount: 1 }],
  },

  arquebus: {
    id: 'arquebus', name: 'Long Arquebus',
    description: 'One round. One thunderclap that pierces a rank. Then the gun IS the reload — a long, honest ram stood still before it speaks again. Charge investment deepens the bank, and one full rite fills all of it.',
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
    description: 'Powder, wad, ball, rod — the full rite, stood still. The bank fills to its cap when the bar completes.',
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
    description: 'Draw the spent chambers back to brimming — a stood rite that refills the vessel to its cap.',
    tags: ['reload', 'munition'], color: '#9ae0c8',
    manaCost: 0, cooldown: 0, useTime: 1.2,
    delivery: { type: 'self' },
    effects: [{ type: 'restoreSkillCharges' }],
  },

  grenado: {
    id: 'grenado', name: 'Grenado',
    description: 'A fizzing iron apple, thrown by the fistful — three to the satchel, then buckles and straps (the refill clock) while you run. Bursts where it lands; the burst is the point.',
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
    description: 'STATIC builds as you walk and when you are struck. Release it to hurl lightning at up to five of the nearest enemies — every banked charge burned makes the discharge crueler.',
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
    description: 'A frontal sweep that knocks the AZURE loose: every enemy struck sheds a mana orb that homes back to you. The caster\'s generator — swing to drink.',
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
    description: 'Tear the blood straight out of a nearby victim: the wound sheds a LIFE orb that flies home to you. Rip, then drink — sustain with travel time.',
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
    description: 'Fire a fan of piercing marrow shards paid in a cut of your CURRENT health — cheap when bleeding out, dear at full blood. No mana asked; none given.',
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
    description: 'A fount of THREE sips — every life orb you scoop banks one. Drinking spends a single sip and pours a fixed draught of healing over a few seconds, deeper as the skill levels. A REFLEX: drinkable even mid-cast, and never wasted — a brimming heart refuses the pour. Carried on the bar, it shakes life orbs loose from your hits.',
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#d04848',
    manaCost: 0, cooldown: 2, useTime: 0, reflex: true,
    gate: { missing: { kind: 'life' }, note: 'brimming' },
    chargeGain: [{ charge: 'flask_life', amount: 1, max: 3, on: 'orbPickup', orbKind: 'life' }],
    chargeCost: { charge: 'flask_life', amount: 1 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.05)],
    delivery: { type: 'self' },
    effects: [
      { type: 'restoreOverTime', resource: 'life', amount: 16, amountPerLevel: 4, duration: 3 },
      // The pour's public face: gates, procs and passives key on it.
      { type: 'buff', id: 'quaffing', duration: 3, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Deeper draught', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', -0.04)] },
  },

  mana_flask: {
    id: 'mana_flask', name: 'Mana Flask',
    description: 'A fount of THREE sips — every mana orb you scoop banks one. Drinking spends a single sip and pours a fixed draught of mana over a few seconds, deeper as the skill levels. A REFLEX: drinkable even mid-cast, and never wasted — a brimming well refuses the pour. Carried on the bar, it shakes mana orbs loose from your hits.',
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#4a78d8',
    manaCost: 0, cooldown: 2, useTime: 0, reflex: true,
    gate: { missing: { kind: 'mana' }, note: 'brimming' },
    chargeGain: [{ charge: 'flask_mana', amount: 1, max: 3, on: 'orbPickup', orbKind: 'mana' }],
    chargeCost: { charge: 'flask_mana', amount: 1 },
    equipMods: [mod('orbOnHit_mana', 'flat', 0.05)],
    delivery: { type: 'self' },
    effects: [
      { type: 'restoreOverTime', resource: 'mana', amount: 13, amountPerLevel: 3, duration: 3 },
      { type: 'buff', id: 'quaffing', duration: 3, mods: [] },
    ],
    thresholds: [
      { level: 12, label: 'Deeper draught', mods: [mod('chargeCap', 'flat', 1)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', -0.04)] },
  },

  catalyst_flask: {
    id: 'catalyst_flask', name: 'Catalyst Flask',
    description: 'The alchemist\'s vice: EVERY orb kind feeds the catalyst, and drinking it GULPS the whole bank — a fuller catalyst trickles life and mana longer, and the reaction leaves you burning brighter for a spell. A REFLEX: drinkable even mid-cast — and at ANY fullness, because the high is never moot (no thirst gate; the gulp is yours to judge).',
    tags: ['instant', 'buff', 'duration', 'flask'], color: '#c8a848',
    manaCost: 0, cooldown: 5, useTime: 0, reflex: true,
    chargeGain: [{ charge: 'flask_catalyst', amount: 1, max: 6, on: 'orbPickup' }],
    chargeCost: { charge: 'flask_catalyst', amount: 'all', minimum: 2 },
    equipMods: [mod('orbOnHit_life', 'flat', 0.025), mod('orbOnHit_mana', 'flat', 0.025)],
    delivery: { type: 'self' },
    effects: [
      { type: 'restoreOverTime', resource: 'life', amount: 7, duration: 3.5, perCharge: true },
      { type: 'restoreOverTime', resource: 'mana', amount: 6, duration: 3.5, perCharge: true },
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
    description: 'A fount of THREE sips — any orb you scoop banks one. Drinking pours QUICKNESS: a hard burst of move speed while it lasts. A REFLEX: drinkable mid-cast, mid-dash, mid-anything — the heels answer even when the hands are full.',
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
    description: 'A fount of THREE sips — any orb you scoop banks one. Drinking pours HIDE: your armor hardens sharply while it lasts. A REFLEX: the classic mid-slam answer — drink through the wind-up and take the hit on stone.',
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
    description: 'A fount of TWO sips — any orb you scoop banks one. Drinking SCOURS: harmful ailments are cleansed on the spot and your blood runs clean against new ones for a while. A REFLEX: the cure that never waits for the cast to finish.',
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
    description: 'The dregs bite: a corrosive ring flung off the drink, searing whoever crowds the drinker.',
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
    description: 'The drink kicks: a short surge of tempo behind whatever you were doing.',
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
    description: 'A pull from a pocket brew — the enemy\'s own flask rule: a REFLEX even mid-swing, and never wasted on a full heart.',
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
    description: 'Your armor detonates in a ring of burning shrapnel — the blast gains 3 added fire and 3 added physical damage per 50 armor you wear. Carried on the bar, your hits and kills shake Wakeflame orbs loose, and each flame you scoop rekindles Cindershell by 1s.',
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
    description: 'TOGGLE: light the vigil. Igniting it costs 1 Wakeflame and FLARES — you surge for a few seconds — then the watch holds: steady power for everyone in the ring while the vigil FEEDS on your banked Wakeflames, one every 2 seconds, guttering out when the bank runs dry. Carried on the bar, your kills shake Wakeflame orbs loose.',
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
    description: 'Speak the last words: consume EVERY banked Wakeflame for a mourning nova — 40% more damage per flame consumed. Each Wakeflame orb you scoop refunds 1.5s of the rite\'s long cooldown, and carried on the bar your hits occasionally shake one loose.',
    tags: ['spell', 'fire', 'aoe'], color: '#f0c060',
    manaCost: 20, cooldown: 14, useTime: 0.7,
    baseDamage: { fire: [16, 26] },
    delivery: { type: 'nova', radius: 150 },
    chargeCost: { charge: 'wakeflame', amount: 'all', minimum: 1, damagePerCharge: 0.4 },
    innateMods: [mod('orbRefund_wakeflame', 'flat', 1.5)],
    equipMods: [mod('orbOnHit_wakeflame', 'flat', 0.07)],
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
    description: 'BLINK into the fray and DETONATE on arrival — and the FULLER the bank, the longer the flicker: each press steps once per charge held (spending only one), every step re-aimed at the nearest living thing. Three banked is a knife-storm; one is a knife.',
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
    description: 'MASH the key while the bar runs: every press BANKS one more step, and the bar\'s end spends them all — a staggered flicker of arrivals, each re-aimed at the nearest living thing, each detonating where you appear. You are wherever the knives are.',
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
    description: 'The Riftstep that CHAINS: one teleport-strike always — then one MORE step per Frenzy charge banked, spent as it goes (kills feed the bank: quicker hands, quicker heels while it holds). Zero charges is a step; five is a storm.',
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
    description: 'HOLD to become the fireball: release to hurtle down your aim as a burning comet — the longer the gather, the crueler the launch-and-landing blasts, the wider they bloom, and the SLOWER the laden comet travels: a tap is a dart, the full gather a rolling sun that cooks its whole corridor.',
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
    description: 'The gap-closer that PICKS ITS OWN prey: lunge at the nearest enemy near your aim, jaws first — the corridor cuts and the arrival bites.',
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
    description: 'CHANNEL and WEAR the storm: everything caught inside is battered in random directions — thrown around the funnel, never simply ejected — while the wind gnaws hardest near your heart. The funnel RAMPS wider and crueler every held second, to a ceiling; then it must exhale.',
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
    description: 'CHANNEL three throats of hunger: every pulse latches the nearest victims around your aim — up to three at once — tearing chaos out of them and drinking a share home as blood. The pack is the meal.',
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
    description: 'Open the rift at YOUR feet and give the ORDER in one breath: every mobile minion blinks to your side, then surges at the mark to fight whatever holds it. The retreat and the charge, one button.',
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
    description: 'CHANNEL the grave-hunger: every beat CONSUMES one of your minions near you, and the release FUSES the fed mass into one towering horror — bigger, harder and longer-lived for every body it ate (up to eight). Your army was always ingredients.',
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
    description: 'A frontal smash with a CHANCE, on every line struck, to CONSCRIPT an animated weapon that fights beside you (up to three). No weapon stats yet to inherit — when arms exist, the forge will remember them.',
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
    description: 'Plant a relic that ANSWERS you: every attack you complete, it flares a holy shock around itself — scaling with your minion investment. Position it where the answer hurts.',
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
    description: 'The relic answers.',
    tags: ['spell', 'physical', 'aoe', 'minion'], color: '#e8d8a0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [8, 13] },
    delivery: { type: 'nova', radius: 120 },
    effects: [{ type: 'damage' }],
  },

  mender_relic: {
    id: 'mender_relic', name: 'Mender Relic',
    description: 'The relic\'s gentler vow: every attack you complete, it washes healing over the allies around it. Fight NEAR the relic; the rhythm of your violence is the congregation\'s pulse.',
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
    description: 'The relic keeps its vow.',
    tags: ['spell', 'heal', 'aoe', 'minion'], color: '#a8e0b8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 150, affects: 'allies' },
    effects: [{ type: 'heal', amount: 6 }],
  },

  shambler_horde: {
    id: 'shambler_horde', name: 'Shambler Horde',
    description: 'Raise shambling dead by the fistful — slow, cheap, and numerous. The wall the rest of the necromancy stands behind.',
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
    description: 'Drag TWO fresh corpses up out of the ground at your mark — fuel, on demand, for every detonation, offering and raising you know. The graveyard travels with you.',
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
    description: 'The horde\'s last instruction: every hard-resummonable minion detonates for most of its life. Contract bodies refuse — they were never yours to spend.',
    tags: ['spell', 'minion', 'instant'], color: '#e86848',
    manaCost: 0, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'detonateMinions', fraction: 0.8 }],
  },

  shatter_totem: {
    id: 'shatter_totem', name: 'Shatterrite', noDrop: true,
    description: 'Your standing totems burst as ordnance.',
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
    description: 'The afflicted are ANNOUNCEMENTS: strike the marked ground and every status riding every victim there LEAPS to the flesh around them — full strength, clocks wound fresh. You do not cure a plague. You deliver it.',
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
    description: 'The vessel opens: every affliction on every ally near you is PULLED onto your own flesh, clocks still running — and each drawn wound closes a little of yours. Carry it well; you decide where it all goes next.',
    tags: ['spell', 'chaos', 'instant'], color: '#9a78b8',
    manaCost: 10, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'siphonStatus', radius: 280, from: 'allies', healPer: 8 }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('aoeRadius', 'increased', 0.05)] },
  },

  transfusion: {
    id: 'transfusion', name: 'Transfusion',
    description: 'Empty the vessel INTO the marked: every affliction you carry pours onto the target at full strength on a fresh clock — and gushes over whoever crowds them. What was yours is now very much theirs.',
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
    description: 'Pour a rotting chaos DoT over the ground — and every OTHER curse on your bar is laid alongside it, for the misery swells with company: more damage and longer torment per linked hex. Build the bar like a grimoire.',
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
    description: 'Pronounce the sentence: a chaos burst that CONSUMES every hex and curse on its victim, amplified for the consuming — and the splash pronounces it on their neighbors too, stripping and searing whatever they carried.',
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
    description: 'DEVOUR the souls of the cursed around you: only the hexed are touched, and every soul torn loose flies home as a fragment of WARD — a decaying shell fed by cruelty. Curse wide, then feast.',
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
    description: 'Brand a victim with a living web of lightning: while it rides them, bolts LASH their nearby allies on a beat — proximity to the marked becomes the sin. The web does not care who it catches.',
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
    description: 'A brand with ONE promise: it detonates when its victim DIES or when its fuse runs out — whichever answers first. Kill them fast and the brand pays early; stall, and it pays anyway.',
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
    description: 'Lob a fat globe of unmaking at the mark while two acolyte-globes SEEK the nearby faithless — and as the rite closes, chaos LASHES the ground around the officiant. Everything near you or your mark regrets the ceremony.',
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
    description: 'A CONE of wildfire that catches at the rim and COOKS INWARD — the pillar-of-flame discipline bent into a wedge. Stand past the hollow heart and you have a breath; the fire is patient.',
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
    description: 'The TRUE side-to-side harvest: face north and the blade crosses east→west in ONE committed pass — a crescent at arm\'s length (the near deadzone is the discipline: keep them at blade\'s reach). The blade hurts only where it PASSES. Socket Return Stroke to teach it the way back.',
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
    description: 'The close harvest: a SOLID wedge — no hollow heart, no deadzone — swung once across your front from hip to hip. Everything from your boots to a blade-length out is cut exactly once. Reaver\'s Sweep keeps the longer reach and the gap; this one keeps nothing off the edge.',
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
    description: 'The two-part reaping taught as ONE lesson: a hard straight cut to drop the nearest — then, a beat later, the blade comes all the way around on its own: a full slow sweep across your front, free. Strike; the harvest follows.',
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
    description: 'The blade comes around on its own — the swing\'s second thought.',
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
    description: 'Two blades, one breath: a sweep rises from EACH wing and they close on your bearing together — the clap of a god\'s hands. Each wing cuts once; whatever stands where they MEET is cut by both. Herd them to the middle, then applaud.',
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
    description: 'Plant sparks BENEATH the enemies themselves — each one a personal telegraph with a short fuse. The crowd carries its own doom around for a breath, then the field goes up.',
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
    description: 'Release a ring of living wind that EXPANDS around you — hasting you inside it, shocking whatever the wall touches — then RETRACTS, and DETONATES at your feet as it closes. Breathe out, breathe in, thunder.',
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
    description: 'Wear a biting cloud for a few seconds: everything beside you is CHEWED, tick after tick. One swarm at a time — recasting relocates the hunger to now.',
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
    description: 'Coil the cold around your shoulders — a worn freezing field, each cast its OWN layer on its own clock. Stack three coats and walk into the pack: the mantle does the arguing.',
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
    description: 'TEAR the earth open along your aim: a crack races out segment by segment, hurting everything it opens under — then SNAPS SHUT, zipping home and hurting them again. Supports fan extra cracks and fork branches.',
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
    description: 'Fire the CRACK ITSELF: a shot that is the TEAR-HEAD of a travelling fissure — the ground rips open along its whole flight and SNAPS SHUT behind it, hurting both ways. The wound follows the shot wherever the flight bends: bounce it, curve it, and the crack bounces and curves with it.',
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
    description: 'Open ONE wound in the world — a crack that stays open, cooking whatever stands over it while SPIRITS rise from its length to hunt the living and lay TORMENT on them. Casting again closes the old wound and opens a new one.',
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
    description: 'A grave-light that seeks the living and lays Torment on them.',
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
    description: 'Split the ground AT YOUR OWN FEET and let something patient live in it: a crack that holds its place while tendrils lash from its whole length — SEIZING whatever strays near, wringing the speed out of them, and envenoming what little they keep. Casting again relocates the tenant. Stand by your wound; it works for you.',
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
    description: 'A tendril whips out of the chasm and takes HOLD — the grip slows, the venom stays.',
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
    description: 'SLAM the ground at your feet and PROJECT the break: a fissure tears out from within arm\'s reach, splitting whatever stands along the line. The crack is the weapon — warp it, arm it, fan it.',
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
    description: 'A STANCE, not a spell: while it burns, the ground near you refuses to stay whole — every few heartbeats a fissure TEARS OUT from you in a random direction, all on its own. Your crack gems ride every beat; extra fissures fan every tear. Press again to let the earth rest.',
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
    description: 'REVEAL the restless dead around you for a few seconds: spirits that wander where they will, withering whatever they drift through with Torment. They answer to no aim — only to the crowd of them (more projectiles, more ghosts) and to how long the veil stays open.',
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
    description: 'Loose a bolt of packed ice — STRAIGHT, no seeking — that BURSTS where it lands and leaves a patch of murderous winter. The bolt flies dumb; the WINTER does the hunting: the patch slinks after whatever lives nearby, gnawing and chilling everything it slides beneath.',
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
    description: 'SLAM the earth and raise a crown of stone around the mark — spires that stand in the way, and BREAK the way you choose: your own blows demolish them at four times the rate, and every spire DETONATES as it dies, stone shrapnel and staggered flesh. Conjure the wall; then decide it was ammunition.',
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
    description: 'Raise a rampart of ICE across the way: the segments SHOVE the crowd out as they rise and chill whatever presses close — and they answer to YOUR frost: cold spells crack them at a savage rate, each broken segment bursting into freezing shrapnel. A wall first; a volley whenever you say so.',
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
    description: 'Raise a rampart of LIVING MEAT across the way — slabs of anonymous muscle that soak what comes and do not complain. Your own blows carve it three times as fast, and every slab DETONATES as it dies: bone shrapnel, hooked gristle, and a lesson about standing near meat. Butchery is a siege discipline.',
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
    description: 'The ground remembers it was ALIVE once: hooked spurs of raw flesh erupt at the mark and rend everything standing there — and the meat TWITCHES: one more convulsion a breath later, harder. Anatomy, weaponized twice.',
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
    description: 'Crack a rift in the air that FIRES ice-shard barrages down its lane for a few seconds — a persistent emitter you place like artillery and feed with position.',
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
    description: 'One barrage out of the rift.',
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
    description: 'PLACE a mark; after a breath, lightning takes it — and every OTHER living mark with it. Stack marks across the field and one firing collapses the whole set in a ripple of bolts. The cap grows with storm investment.',
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
    description: 'CHANNEL a swarm of slow energy orbs that drift at your mark, each bursting small where it lands — and when you LET GO, every orb still in the air DETONATES at once, twice as hard. Hold to spread the swarm; release to close the trap.',
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
    description: 'Hurl a spear that skewers the line and LODGES where it stops. Run a lodged spear over to DETONATE it under whoever stands near — or socket Enduring Snares and the spears re-arm on their own clocks: a minefield you replant by walking it.',
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
    description: 'The lodged spear shatters into a ring of splinters.',
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
    description: 'Plant a brand that ERUPTS on arrival, then calls a short-lived elemental storm down around itself — artillery you place and walk away from.',
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
    description: 'One tongue of the beacon\'s storm.',
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
    description: 'Loose a sheaf of charged arrows that LODGE where they land — and every lodged arrow periodically ARCS a beam to its nearest kin, cooking the line between. The volley is the tripwire; add the Tripwire gems for a second web.',
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
    description: 'Raise a wall of living ice across your facing — TRUE collision the enemy must break or walk around — that PULSES killing cold at everything near it: stand behind your weather.',
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
    description: 'Raise a rampart of razor frost as GROUND, not stone: it SHOVES everyone off the line as it rises, and every attempted crossing thereafter CUTS and shoves them back — no collision, only consequences. The wall you can walk through, once you\'ve paid.',
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
    description: 'Lay a trap that, sprung, spins up a REVOLVING tongue of flame — a burning clock-hand sweeping the ground around it, over and over, until the fire dies.',
    tags: ['spell', 'fire', 'trap', 'aoe', 'duration'], color: '#ff8a3a',
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
    description: 'The sprung trap\'s revolving flame.',
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
    description: 'A searing sphere that ORBITS you, burning whatever it touches while lightning ARCS off it into the crowd — a moon with opinions. Pure composition: tethered orbit, re-hitting contact, flight-long zaps.',
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
    description: 'A trap whose spring is only the FIRST word: the blast scatters into aftershocks rippling out around the victim — the packaged Aftershocks support, buried under a tripplate.',
    tags: ['spell', 'physical', 'trap', 'aoe'], color: '#c8a878',
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
    description: 'The snare\'s blast — and its echoes.',
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
    description: 'One blow, placed like a foundation: a slow crushing jab that BANKS TWO Fury and leans hard on the target\'s poise. The engine of the style that does not stop — bank with this, spend with Reckoning.',
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
    description: 'Drop into the hunter\'s hush: for a long while you read SMALLER to every eye (harder to notice) and your acts book QUIETER on the threat chart — at a careful step. The approach that lets a held gaze finish: the wild answers those who arrive unannounced.',
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
    description: 'Sling a fistful of forged spikes across the ground: whatever crosses the strewn field takes little cuts that BLEED — and half the time leaves REELING, its rhythm bled out through a punctured sole. The cheapest word for "not through here".',
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
    description: 'Work the jab: fast, cheap knuckles that BANK Fury a hit at a time — and every THIRD beat is the cross, arming the next blow to land stunning. The pit\'s arithmetic: one, two, THREE.',
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
    description: 'Load the hips and SWING: a wound-up hook that spends EVERY banked Fury — each charge putting more weight behind it — and sends the catch REELING across the pit. The knockout is optional; the flight is not.',
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
    description: 'PLANT THE COLORS: a standing banner that rallies everyone fighting beneath it — harder blows, quicker feet — for as long as the cloth flies. Cut it down and the argument ends early; the line holds where the banner does.',
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
    description: 'NAME the one that dies first: the called target MUST answer you (taunted) and stands EXPOSED — a window on its health bar everyone in the warband can read. Loud by design: the call books double on the chart.',
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
    description: 'RAISE THE MARCHING VERSE: a ring of battle-music rides you, and allies who keep the beat inside it strike harder and faster while it plays. Every singing BANKS a Verse — the Coda spends them all.',
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
    description: 'SING THE WRONG NOTE, on purpose, at everything: a grinding discord rides you, chewing at whoever stands in it and half-convincing them their own hands are wrong (befuddled). Every singing BANKS a Verse for the Coda.',
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
    description: 'END THE SONG ON EVERYONE AT ONCE: a crashing final chord that spends EVERY banked Verse — each one swelling the blast — and leaves the crowd\'s ears ringing wrong (bewildered). Silence, as a weapon, arrives loudest.',
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
    description: 'A whispered suggestion with a hook in it: the struck mind turns MADDENED — swinging at whatever stands nearest, friend first — and half forget what their hands were doing (befuddled). You never drew a blade; that was the point.',
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
    description: 'The open palm, repeated like a spoken truth: each strike settles the mantra deeper — THIS palm alone quickening and hitting harder, stroke on stroke, until the rhythm rests. Not fury. Practice.',
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
    description: 'No gem, no discipline, no excuse — the swing you were born holding. It will never grow stronger, and it can never be taken away.',
    tags: ['attack', 'melee', 'physical'], color: '#b8b0a0',
    manaCost: 0, cooldown: 0, useTime: 0.55,
    baseDamage: { physical: [4, 7] },
    delivery: { type: 'melee', range: 48, arcDeg: 100 },
    effects: [{ type: 'damage' }],
    ai: { range: 50, weight: 1 },
  },

  long_exhale: {
    id: 'long_exhale', name: 'Long Exhale',
    description: 'HOLD THE BREATH — the stillness gathers into the lungs — then let it OUT: a rolling wall of forced air whose weight grows with the wait, shoving the line back WINDED. The monk\'s argument: patience, exhaled.',
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
    description: 'Close the distance and CLOSE THE HAND: the catch is hoisted bodily and CARRIED — struggling, jostling, worth every step — until you drop it, lose it, or Heave it somewhere instructive. The mass law is the whole contract: grow your weight and grip, or hold only what is smaller than your argument.',
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
    description: 'Spend the catch: what your hands hold leaves them AT SPEED, toward the cursor, with your whole weight behind it. Walls end the flight the hard way, lighter bodies in the lane are bowled through, and a chasm keeps what it is given — with your name on the credit. Nothing held, nothing thrown.',
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
    description: 'A barbed hook on a waxed line, thrown flat and hauled home — the catch comes DRAGGED behind the wrangler, out of its line and away from its friends, until the grip is struggled off or torn open.',
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
    description: 'The yoke-bearer\'s answer to footwork: both fists close and the catch goes DOWN, pinned under old timber and older technique, held for the hammering — or for the toss.',
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
    description: 'The whole argument in one bite: the catch goes IN — hidden, digested, and leeched — until it carves its way back out, is torn free by its friends, or is SPAT, at speed, at whoever the gullet\'s owner likes least. The gulletsack bulges while it works. That is not decoration; that is your friend.',
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

  // ======================= Trajectories, returns & shrapnel ================
  // §4: the flight levers as skills — zig-zags that shed, bounces that work
  // the room, recurves, selective pierce, arced convergence, aimed spread.

  gyreblade: {
    id: 'gyreblade', name: 'Gyreblade',
    description: 'Hurl a whirling blade that flies back to your hand — CATCH it and it banks a Gyre charge. Bank a few, then let GYRE HURL fling every caught blade back out as shrapnel. The juggler\'s economy.',
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
    description: 'Spring backward and FLING the whole caught arsenal: one shard per banked Gyre charge fans out where you stood. Empty-handed it still throws one desperate knife.',
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
    description: 'PLANT three anchors with three presses — the third RELEASES the blade, and it shuttles anchor-to-anchor for its whole flight, cutting everything that stands in the lanes. Geometry is the weapon; draw a good triangle.',
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
    description: 'HANG four ethereal arrows in the air, one per press — passive, patient, glinting. A FULL set is a set trap: prey straying near ANY arrow (or your own re-press) COLLAPSES them into the ping-pong volley, the blade shuttling arrow-point to arrow-point through everything that sprang it. Draw the killing geometry BEFORE the fight.',
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
    description: 'An arrow with ONE name on it: it hunts the nearest heart, passing HARMLESSLY through every other body — and on striking may RECURVE to strike again, and again (each miracle rarer than the last). When its prey falls, it picks a new name.',
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
    description: 'A projectile with a MIND: it pierces its victim, wheels around, and comes back for more — a tornado of small cruelties that will not let up until its time runs out. Pure composition: seeking, re-hitting, duration-lived.',
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
    description: 'A bolt that refuses a straight line: it KINKS on a beat and on every body it survives, and each turn SHEDS a shard down the road not taken. Steer it (Puppet Strings) and draw your own angles.',
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
    description: 'A slow, patient seeker of cold that CREEPS toward whatever lives — easy to outwalk, terrible to ignore. Duration investment stretches the stalk.',
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
    description: 'Three talons of ice: one flies straight, two swing WIDE — and all three hook back to CONVERGE on your mark, detonating in a frost burst where the claw closes.',
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
    description: 'Three ice-bursts MARCH out along your aim, each larger and crueler than the last — the third is the argument. Pure cascade composition: forward, growing, compounding.',
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
    description: 'A volley whose SHAPE is aimed: point-blank it splays wide as a rampart, at the cursor\'s full reach it chokes to a tight lance. Where you hold the mark decides what leaves the string.',
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
    description: 'Loose a sheaf skyward and let the WEATHER do the work: arrows rain across the marked ground in a drumming sequence.',
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
    description: 'Loose a drifting twister that BOUNCES off rock and rampart, shouldering through the crowd and knocking bodies aside for as long as the wind holds. Fire it into a canyon and let the walls aim for you.',
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
    description: 'The unruly twin: NO pierce at all — every body it strikes DEFLECTS it somewhere new, and every wall throws it back into the pit. A pinball of wind that hits, and hits, and will not settle.',
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
    description: 'Every swing GATHERS the storm: strikes bank Storm charges, and each second one charge LEAPS as a bolt to the nearest enemy — the fuller the bank, the FASTER the bolts come. Stop swinging and the storm disperses.',
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
    description: 'ONE key, three cuts: the opening UNISECT, the answering BISECT, and — pressed again in rhythm — the TRISECT: a full circle of steel at double weight. Miss the beat and the figure resets.',
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
    description: 'The answering cut — wider, harder.',
    tags: ['attack', 'melee', 'physical'], color: '#d8c88a',
    manaCost: 3, cooldown: 0, useTime: 0.45,
    baseDamage: { physical: [10, 15] },
    delivery: { type: 'melee', range: 58, arcDeg: 140 },
    effects: [{ type: 'damage' }],
  },

  trisect_finisher: {
    id: 'trisect_finisher', name: 'Trisect', noDrop: true,
    description: 'The closing figure: a full circle at double weight.',
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
    description: 'Dig the blade in and KEEP IT MOVING: every swing stacks fervor that decays FAST — but any fresh cut refreshes the ENTIRE pile. The rhythm is the build.',
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
    description: 'The patient inverse: each wound burns on its OWN clock — nothing refreshes, everything ADDS. Old cuts close as new ones open; sustained pressure holds a deeper pile than any flurry.',
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
    description: 'The rune-weaver\'s release. Carried on the bar, every fire, cold or lightning cast BANKS its rune — Ember, Rime, Arc — and channels weave one per held second. Cast to CONSUME the whole sequence: the combination and ORDER pick the working, the closing rune names its element, and every rune burned is more.',
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
    description: 'The pure fire triad: a roaring ground-burst that keeps burning.',
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
    description: 'The pure lightning triad: a battery of falling bolts.',
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
    description: 'The pure cold triad: a spreading sheet of killing frost.',
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
    description: 'An ordered pair hurled as a piercing lance that detonates.',
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
    description: 'All three schools woven at once: the sky forgets whose side it was on.',
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
    description: 'Loose runes, honestly spent: a clean elemental burst.',
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
    description: 'FORM: bind yourself into the storm. You are ROOTED and the mana drain MOUNTS every held second — but your spells surge, your casts quicken (all of them costlier), and lightning gnaws everything near you while the bind holds.',
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
    description: 'FORM: the fire twin — rooted, the drain mounting, your fire spells stoked while a righteous ring of flame COOKS everything around you. A mana-fuelled pyre with your name on it.',
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
    description: 'FORM: wear the cold as armor. While the drain holds you take noticeably less damage and shrug the chill off entirely — walkable, resource-agnostic (Blood Price pays it in blood), and off the moment the mana runs dry.',
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
    description: 'SEAL your health where it stands for a few heartbeats: nothing raises it, incoming blows partly SPREAD over time, and the deeper your missing health the harder your shell. When the seal breaks — by your hand or its own fuse — the DEATH KNELL tolls, louder for every held second and every drop of missing blood.',
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
    description: 'The open-ended pact: your health SEALS and your life bleeds away while the toggle holds — no fuse but your nerve. The Knell scales with the whole held span (to a cap) and with how deep you let the wound get. Release it yourself; the seal will not save you from your own greed.',
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
    description: 'The seal breaks and the bell tolls — a ring of grave-force around the unsealed.',
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
    description: 'HOLD to wrap yourself in cursed grave-fog: every incoming HIT passes through you like mist while necrosis gnaws all who stand near — but the shroud feeds on your blood every pulse, and damage over time still finds you.',
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
    description: 'The old rite: open your own veins on the altar of the moment. A deep cut of your CURRENT health buys a brief, ferocious empowerment.',
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
    description: 'Pour a third of your wellspring out on the ground and let the vapors carry you: wider workings, sharper focus, for as long as the incense burns.',
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
    description: 'Consume a corpse into a ring of grave-incense: YOUR minions inside it move, strike and cast in a frenzy while the smoke holds. The offering stands where the body fell.',
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
    description: 'The risen effigy\'s spat grave-flame: a seeking wisp off the incense.',
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
    description: 'Grind a corpse to powdered bone and cast it over the horde: your minions gain a bone-white shell — a real chance to BLOCK and harder frames beneath it. Communal Rites shares a portion with the officiant.',
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
    description: 'A bolt that HUNTS: it curves toward the living ahead, PIERCES what it strikes, and drags a caul of soul-rot behind it — everything near its wake decays while it flies. A share of every wound crystallizes on you as WARD. Fire it through the pack, not at it.',
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
    description: 'Loose a slow bone-spirit that HUNTS one heart — a minion-shaped bullet drifting after its quarry — and DETONATES on arrival, or wherever its unlife runs out. Patience, weaponized.',
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
    description: 'The great reaper\'s sweeping harvest.',
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
    description: 'The commanded dash: the Harvester crosses the field and opens everything on the way.',
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
    description: 'Bind THE HARVESTER — one great reaper under contract (reserved mana holds the pact; it re-forms when felled). Its PRESENCE dims your other minions, and on its beat it EATS one — healing itself and feasting toward greater cruelty. ⇧ orders the Reap: a dash down your mark that opens everything on the way. Feed it or starve beside it.',
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
    description: 'The unbound form: call the Harvester for a brief hire — no reservation, no re-forming, twenty seconds of scythe. Presence, appetite and the ⇧ Reap order all apply; when the hire lapses, so does the terror.',
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
    description: 'The court without its king: four LESSER reapers, briefly hired — no presence, no appetite, just wheeling blades. Socket a Ravenous Pact and teach them hunger anyway.',
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
    description: 'Sound the horn and the WHOLE court marches: every minion you own converges on your mark and fights whatever holds it. The socketed Assault metas order one skill\'s retinue; the horn is the universal call — its own slot, your explicit choice.',
    tags: ['spell', 'minion', 'warcry', 'instant'], color: '#c8a04b',
    manaCost: 7, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', duration: 6 }],
    requirements: { willpower: 14 },
    leveling: { perLevel: [mod('minionMoveSpeed', 'increased', 0.06)] },
  },

  last_rite: {
    id: 'last_rite', name: 'Last Rite',
    description: 'The universal LAST instruction: every hard-resummonable minion you own detonates for most of its life — the whole congregation spent in one breath. Socketed Self-Destruct metas spend one skill\'s bodies; the Rite spends everyone, from its own slot, because you chose it.',
    tags: ['spell', 'minion', 'fire', 'instant'], color: '#e86848',
    manaCost: 12, cooldown: 10, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'detonateMinions', fraction: 0.65 }],
    requirements: { willpower: 18 },
    leveling: { perLevel: [mod('minionExplodeDeath', 'flat', 0.04)] },
  },

  skeletal_lunge: {
    id: 'skeletal_lunge', name: 'Skeletal Lunge', noDrop: true,
    description: 'The ordered dash-strike: bone closes the gap and cuts.',
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
    description: 'Every minion of the ordered skill DASHES its nearest enemy and cuts.',
    tags: ['minion', 'instant'], color: '#cfc8b8',
    manaCost: 5, cooldown: 6, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'minionCast', skillId: 'skeletal_lunge', at: 'enemy' }],
  },

  // --- Channel-build → persist-and-decay -----------------------------------

  hailcrown: {
    id: 'hailcrown', name: 'Hailcrown',
    description: 'CHANNEL to raise a crown of ice overhead that pelts the ground around you — bursting hail planted UNDER whatever stands near. Every held second builds the crown; RELEASE and it keeps raining on its own, fading, for as long again as you fed it. Channel, then run — the weather follows.',
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
    description: 'A javelin re-forged as LIGHTNING: it lances through rank after rank, shocking what it splits. The Impaler\'s answer to armor is voltage.',
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
    description: 'A javelin with a SECOND payload: wherever its flight ends — flesh or dirt — a cloud of plague-gas BURSTS and lingers, rotting whoever stands in it. Throw it into the doorway, not the man.',
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
    description: 'Cough up a fat glob of living bog that DAWDLES after prey on a sluggish appetite of its own, shedding venom pools in its wake — and a deeper pool where it dies. Every pool CLOSES like drying mud, gone exactly as its duration ends; the slower the glob crawls, the longer its sheddings linger. Slow on purpose: everything here is duration, and duration is yours to shape.',
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
    description: 'Loose a corpse-lantern on a leash of will: it bends after your cursor, never dies on what it burns, and sheds closing venom pools along whatever path you write. Drag it out to hound the fleeing — or wheel it around yourself and stand inside the moat it leaves. The wake reads its pace: a slow, deliberate hand lays longer-lived ground.',
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
    description: 'A slick of bog-venom that closes like a drying wound.',
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
    description: 'A dropped rope of royal jelly — sweet, heavy, and clinging.',
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
    description: 'Scream the storm into your blood: the held channel FILLS a gauge that survives between holds (it bleeds away while you rest), and the release spends it as five seconds of stride and swiftness whose STRENGTH is exactly how full the bar ran. Haste fills it faster; a bare sliver fizzles. Let go early for a taste — hold to the brim for the whole gale.',
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
    description: 'Kneel into the wound-song and pour time into the bar — and the bar KEEPS whatever you bank, however long ago you knelt. Release it and the stored communion mends you and every ally around, scaled to the fill; a thin bar refuses to spend at all. Brim it in the quiet, carry a second life into the loud. The risk is the kneeling.',
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
    description: 'Four held seconds of gathering fire under a bar the whole room can read — and NOTHING until it finishes: break the channel (or the caster) and the ruin never comes. Survive the kindling and it arrives all at once, a furnace nova at full gather. The deliberate cast, weaponized.',
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
    description: 'A spat coal — quick, small, and eager to catch. The wildfire kin\'s pelting verb.',
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
    description: 'Heave a gout of living melt in a lazy arc — it bursts where it lands and leaves a pool of fire that CLOSES like cooling slag, gone exactly as its duration dies.',
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
    description: 'A barbed line of nothing, cast and REELED: the catch is dragged bodily to the caster\'s feet and left reeling. In an angler\'s grip that means dragged toward the edge it fishes from — mind your footing, or turn the gift around: the reel-in is also how you get close enough to gut the angler.',
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
    description: 'A rooted appendage unknots and SWATS — a long, patient arc that shoves whatever it catches. The ground was never just ground.',
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
    description: 'A glistening tongue snaps out, barbs, and REELS the catch bodily to the teeth. Mind the ground between you and the maw — or spend the trip planning what you\'ll do when you arrive.',
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
  // The chew: short, brutal, and it DRINKS — every landed bite knocks a
  // life-orb loose that homes back to the maw (siphonOrb: sustain with
  // travel time, dodgeable by walking away from your own blood).
  devouring_maw: {
    id: 'devouring_maw', name: 'Devouring Maw',
    description: 'The teeth close. What they take, they KEEP — each bite shakes loose a bead of life that homes back into the maw unless its owner outruns it.',
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
    description: 'A ring of misfiring nerves rolls out through the floor — a soft chaos snap that seizes boots mid-stride. The Caul knows where you stand; you are standing on it.',
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
    description: 'Your arm remembers being something longer: a wide, reaching arc of living cord that SNARES what it stripes. Reach-tier melee — the lasher\'s patience, on your side of the bargain.',
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
    description: 'Plant a seed of the Caul and let it OPEN: a toothed bloom whose grip reaches far past its bite — everything nearby is dragged flowerward while the petals chew. The vor maw\'s bargain, potted.',
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
    description: 'Invite the membrane to wear YOU for a while: for a few breaths your skin drinks light, seals cuts, and moves like it has somewhere better to be. It always lets go. So far.',
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
    description: 'Speak the sentence and let it ride: the bolt lands soft as a whisper — and three seconds later the Word RESOLVES all at once, rolled at whatever your power has become by then. The mark can read the clock; so can everything you socket (a Slow Match stretches the wait and sharpens the verdict).',
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
    description: 'Hurl a fistful of javelins SKYWARD and let them fall as weather: a rain of iron over your mark, each landing its own wound. The Impaler\'s artillery arc.',
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
    description: 'One wind-up — then EVERY nearby enemy is lanced AT ONCE, each down its own razor-straight line from your hand. Not a fan, not a wash: a flurry of simultaneous spear-thrusts with your name on all of them.',
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
    description: 'Raise a bubble of THICKENED time: enemy shots inside it crawl — the volley you could never dodge becomes weather you stroll out of. The defensive face of every speed lever; the deflecting dome\'s patient sibling.',
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
    description: 'Mark a circle and SHOW it — then the sky empties into it: lightning scattered across the promised ground, area by area. No seeking, no mercy for the mark: the circle is the contract (Thunderstorm\'s honest cousin).',
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
    description: 'Plant a gravid POD and hold the line while it swells: five seconds of incubation, then it HATCHES a brood of skittering hunters at the spot. Broken early, it dies quietly — the defense is the price of the birth.',
    tags: ['spell', 'summon', 'minion', 'duration'], color: '#a8c860',
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
    description: 'The pod splits: the brood boils out.',
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
    description: 'Set down a cask of blasting powder on a SHORT fuse. It goes up when the fuse does — or the moment anything BREAKS it, yours included. Place it, bait them onto it, or shoot it yourself: powder honors no plan.',
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#e07838',
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
    description: 'The powder answers.',
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
    description: 'A COMMITTED lance thrust: one razor-narrow line of iron, arm\'s length past your shoulder — no fan, no wash, a POKE with your whole weight behind it. Thrusts cleanly around a RAISED GUARD without lowering it: the greatshield-and-spear discipline, on its own button.',
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
    description: 'The lance from BEHIND the wall: thrust around the raised guard without lowering it — greatshield discipline. Not ready until the guard is up.',
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
    description: 'Open an account with pain: while the toggle burns, 40% of every wound is NOT taken — it BANKS. The balance siphons mana faster the deeper it runs, and the day you cannot pay, the toggle closes and EVERYTHING lands at once. ⇧ pays half of it down on a long clock — diligence turns the time bomb into an investment.',
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
    description: 'Pay HALF the Arrears balance down — the future-sighted act, on a long clock.',
    tags: ['spell', 'instant'], color: '#d8c878',
    manaCost: 8, cooldown: 12, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'payLedger', pct: 0.5 }],
  },

  grit_stance: {
    id: 'grit_stance', name: 'Grit',
    description: 'The monk\'s discipline: while the stance holds, over half of every hit is STAGGERED — smeared across six slow seconds instead of landing as a spike. Sustain outruns what patience spreads thin; a burst that would have dropped you becomes a bill you heal through.',
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
    description: 'Dam the wellspring: while toggled, a share of your mana regeneration is HELD BACK, accruing against the day you run dry — and when you do, the dam BREAKS: the balance floods home as mana and DISCHARGES as lightning around you. Pressing it off cashes out the same way. Starve on purpose.',
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
    description: 'The BACKLOADED crown: channel and NOTHING falls — the orb only gathers, silent overhead. Release, and everything you banked comes down at once: a burst at the exhale, then seconds of autonomous hail that follow you and fade. Patience first, weather after.',
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
    description: 'Hurl the axe — and the first flesh it FINDS flings it onward to a marked circle near you. Stand in the circle, CATCH the returning steel, bank a Gyre. Miss the catch and the axe lies where it fell until its time runs out. Aim is half the skill; footwork is the other half.',
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
    description: 'A relic that KEEPS UP: it glides at your shoulder, and every attack you complete it ANSWERS — a ring of consecrated force that cuts the enemy and mends the faithful around it. The warden that walks.',
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
    description: 'The walking relic\'s answer: harm around it, mending in it.',
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
    description: 'Raise a great bell that WANTS to be struck: it taunts the room, and every blow it takes RINGS a shockwave off its skin. Park it in the melee and let their own violence do your work — the bell tolls for whoever hits it.',
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
    description: 'The bell answers the blow.',
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

  // THE THRONG's kit whacks (engine/throng.ts kinds) — ordinary catalog
  // pieces, so supports, statuses and the whole hit pipeline apply while
  // a rider swings them from its seat (engine/cling.ts).
  cinder_bite: {
    id: 'cinder_bite', name: 'Cinder Bite', noDrop: true,
    description: 'A hot little mouthful.',
    tags: ['attack', 'melee', 'fire'], color: '#e08848',
    manaCost: 0, cooldown: 0, useTime: 0.85,
    baseDamage: { fire: [4, 7] },
    delivery: { type: 'melee', range: 40, arcDeg: 70 },
    effects: [{ type: 'damage' }],
    ai: { range: 46, weight: 2 },
  },
  pale_zap: {
    id: 'pale_zap', name: 'Pale Zap', noDrop: true,
    description: 'A cold thread of the other side.',
    tags: ['spell', 'projectile', 'cold'], color: '#b8d8e8',
    manaCost: 0, cooldown: 0, useTime: 0.9,
    baseDamage: { cold: [4, 6] },
    delivery: { type: 'projectile', speed: 380, radius: 6, range: 300 },
    effects: [{ type: 'damage' }],
    ai: { range: 280, weight: 2, keepDistance: 170 },
  },
  gnat_nip: {
    id: 'gnat_nip', name: 'Gnat Nip', noDrop: true,
    description: 'Barely a bite. Barely.',
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
    description: 'A biting strike sheathed in hoarfrost — it chills what it tears.',
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
    description: 'A jagged arrow of sharpened bone.',
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
    description: 'The wrappings uncoil and strike — and the grave\'s grip drags at whatever they touch.',
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
    description: 'A lunging bite over recurved fangs — the wound is small; what it leaves behind is not.',
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
    description: 'A rolling note you feel in your knees — it pulls you to the singer, and the water does the rest.',
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
    description: 'A barbed chain hurled from the anvil-line — what it hooks, it hauls home.',
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
    description: 'A soundless bell swung once — inside its bloom, no word of power leaves a throat.',
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
    description: 'A collector\'s hooked sweep — it peels the armor you owe and keeps what it draws.',
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

  // ======================= The EMPYREAN kata ================================
  // The Aetherial's own arts — verticality, radiance, judgement — brought
  // down by whoever survives the crossing. Five distinct rhythms (the samurai
  // lesson): a dive, a ramping halo, a spoken verdict, a fan of feathers, and
  // a step out of your own silhouette. The Vigilant Host casts the same five.

  skyfall: {
    id: 'skyfall', name: 'Skyfall',
    description: 'Hurl yourself skyward — untouchable, clearing every gap — and come down as the judgement of altitude: a radiant shockwave that throws the unworthy from their feet.',
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
    description: 'A ring of dawn bursts from your brow — and the halo BRIGHTENS: each pulse within its rhythm sharpens and hastens the next, six stacks deep, fading when the light rests.',
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
    description: 'Name the ground and the sky answers: a column of white fire stands there, burning all it holds — then speaks its verdict a SECOND time (the buried strike). The Host\'s dominions bring these down unbidden.',
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
    description: 'Ask the night for one of its own: a long breath later a star arrives where you pointed, and the ground remembers it. The Vesperlands\' keepers call them down like punctuation.',
    tags: ['spell', 'fire', 'physical', 'aoe'], color: '#ffd9a0',
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
    description: 'A wing\'s worth of razor feathers, fanned across the arc — light as breath leaving, heavy as verdicts arriving.',
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
    description: 'Step OUT of yourself: a soundless phasing glide, leaving your own image standing behind to be struck in your stead. The gap closes; the cloud you were disperses.',
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
    description: 'A spear of hardened dawn, thrown flat and FAST — it passes through the first bodies it judges and keeps going. The Powers carry ranks of these.',
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
    description: 'One note, spoken AT you: a flattening wedge of sound that throws the line back and leaves ears ringing — bewildered hands aim at where the world used to be. The Choir\'s heralds open every engagement with it.',
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
    description: 'Light a standing candle of the Host: for its span, you and allies inside shrug a share of all harm, and every few heartbeats the flame closes wounds. The Lampads carry these against the dark between the stars.',
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
  // THE CIRRUS KATA — the HIGH AIR itself, learned from the wild sky: vapor
  // condensed to blade and body. Where the Empyrean speaks judgement and the
  // Gale lays roads, the Cirrus CHANGES WHAT YOU ARE: its signature is
  // CLOUDFORM (the 'levitation' stat — every vertical fabric reads it), a
  // breath of walking on nothing. Loot of the zephyrid kin — the fauna of
  // the open sky casts these five back at you first.
  // ==========================================================================

  updraft_burst: {
    id: 'updraft_burst', name: 'Updraft Burst',
    description: 'Name a patch of sky-floor and the high air REMEMBERS the geyser: a heartbeat later a column of rising vapor detonates there, hurling bodies aside and stealing the wind from their knees.',
    tags: ['spell', 'cold', 'physical', 'aoe'], color: '#cfe8f8',
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
    description: 'Breathe OUT and condense: for a few strides your body is stabilized cloud-stuff — the dissolving ground cannot claim it, the open sky holds it up, and the gaps in the world are only weather. Lapse over nothing, and you are a falling thing again.',
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
    description: 'Cast a crook of hardened wind and REEL: the caught body is dragged to your feet, breathless. The zephyrid matrons shepherd strays back onto the cloud with it — or off it.',
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
    description: 'The shrike\'s lesson: BE the gust. A flat, shrieking dive through the target line — the wound arrives before the wind does.',
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
    description: 'Dry air owes a debt and you collect it: every cast winds the charge tighter — six turns deep — and the halo of sparks that leaps out grows crueler each time. The thunderheads of the high sky do nothing else all day.',
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
    description: 'Run WITH the wind for a breath — and the sky remembers where you ran: the dash lays a trail of standing cloud behind it, a bridge at full sprint over any gap the heavens left open. Over honest ground the trail is a WIND-LANE — allies who run where you ran borrow the sky\'s pace.',
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
    description: 'Ask the sky for GROUND: a standing cloud gathers where you point, holds a handful of heartbeats, and lets go the way all clouds do. A bridge, a sniper\'s perch past the rim, a rescue under a falling friend — and over land that never needed holding, a HAVEN: the vapor swallows allied outlines and softens the aim against them.',
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
    description: 'A flat whipcrack of compressed air: it cuts, it THROWS, and on the drift a throw is a sentence — the shove that puts a body past a pad\'s edge lets the sky finish the argument.',
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
    description: 'Pull a column of high cold air DOWN: a heartbeat of gathering stillness, then the sky lands all at once — flattened grass, thrown bodies, and ears that ring like struck bronze.',
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
    description: 'Clap the air FLAT: a ring of hard wind that harms nothing and MOVES everything — thrown back, winded, and (on shifting ground) suddenly negotiating with the edge. The drift-folk\'s hello.',
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
    description: 'A stitched needle of storm-charge that rides the wind\'s own weave — it arrives when the air says so, not when the eye does. The zephyr eels spit ranks of these.',
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
    description: 'Whistle down a handful of cirrus fingerlings — quick, biting scraps of living cloud that harry whatever you\'re pointing at. The shepherds never travel alone.',
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
    description: 'Set the wind at every friendly back: for its span, allies inside move like the weather is on their side — because it is. The drift-folk cross whole basins on one good tailwind.',
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
    description: 'Whistle a nimbus down to HEEL: a personal cloud rides at your knees, swallowing outlines and softening the aim against whoever huddles close — and where the world runs out, it pours itself under your feet, a stride of standing cloud paid out step by step for as long as it lasts.',
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
    description: 'Call down a thunderhead and make CAMP in it: allies inside lace every blow with the cloud\'s own charge and swing the heavier for it, while the winds that cradle them keep stealing the enemy\'s breath. Over the open sky it is also, of course, ground.',
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
    description: 'Low weather with a silver underside: allies beneath it knit flesh and focus for as long as they keep to the damp — step out and the mending fades with it. The herd-folk raise one over every camp, every stand, every slow retreat.',
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
    description: 'Lay a ROAD of standing cloud from your feet to where you point — a causeway over the hungry sky, a wind-lane over honest dirt that keeps the whole party at the weather\'s pace. The drift-folk pave their processions with it.',
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
    description: 'Drop the weather ON them: a pressing cloud that swallows THEIR sight and spoils THEIR aim while it squats where you put it. The herd\'s answer to archers, watchposts and anything that thinks distance is safety — walk your own murk in after it.',
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

export const SKILL_LIST: SkillDef[] = Object.values(SKILLS);
