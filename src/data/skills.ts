// ---------------------------------------------------------------------------
// THE SKILL CATALOG.
//
// Every ability in the game — player, monster, or minion — lives here as a
// plain data entry. To create a new skill: pick a delivery, attach effects,
// set tags (tags decide which stat modifiers scale it), optionally gate it
// behind attributes, and give it an `ai` hint so monsters can use it too.
// No engine changes required.
// ---------------------------------------------------------------------------

import { mod } from '../engine/stats';
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
    requirements: { strength: 18 },
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
    requirements: { strength: 14, dexterity: 14 },
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

  // ======================= Fire (environmental) ============================

  // The Demon Storm's falling rock — an environmental hazard the Demon-Invasion
  // overlay rains on in-radius zones (cast by a synthetic caster, like the storm
  // bolt). Not a player gem; it lives here so the world can field it by id.
  meteor: {
    id: 'meteor', name: 'Meteor', noDrop: true,
    description: 'A blazing rock plummets from a rift in the sky and erupts on impact.',
    tags: ['spell', 'fire', 'aoe'], color: '#ff6024',
    manaCost: 0, cooldown: 0, useTime: 0.6,
    baseDamage: { fire: [20, 38] },
    delivery: { type: 'ground', radius: 96, castRange: 600, delay: 0.9 },
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
    targeting: { target: 'corpse', castRange: 400 },
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
  iai_strike: {
    id: 'iai_strike', name: 'Iai Strike',
    description: 'The draw IS the cut: heavy single-target damage, and the victim is DISARMED — no attacks for three seconds.',
    tags: ['attack', 'melee', 'physical', 'targeted'], color: '#e8e4d8',
    manaCost: 9, cooldown: 12, useTime: 0.7,
    baseDamage: { physical: [30, 46] },
    targeting: { target: 'enemy', castRange: 120 },
    delivery: { type: 'target' },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'disarm', chance: 1 },
    ],
    requirements: { dexterity: 16, prowess: 10 },
    ai: { range: 110, weight: 3 },
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

  // ======================= Summoning =======================================

  summon_skeleton: {
    id: 'summon_skeleton', name: 'Summon Skeleton Warrior',
    description: 'Raise a skeletal warrior to fight for you. Scales with your minion stats.',
    tags: ['spell', 'summon', 'minion'], color: '#cfc8b8',
    manaCost: 22, cooldown: 1.5, useTime: 0.9,
    delivery: { type: 'summon', monsterId: 'skeleton_warrior', count: 1, maxActive: 4 },
    meta: { skillId: 'command_assault', label: 'Attack!' },
    effects: [],
    requirements: { willpower: 16 },
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
    requirements: { willpower: 16 },
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
    delivery: { type: 'storm', count: [4, 6], interval: 0.25, areaRadius: 150, hitRadius: 55, castRange: 480 },
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
    // The random SECTOR is a lever set: forward-biased 180° here (reined in
    // from 240 — the flurry stays a fighter, not a sprinkler). Data or
    // supports move it: Wild Abandon rounds it toward a full circle,
    // Measured Blade focuses it, offsetDeg can lock it aside or behind.
    aim: { random: { offsetDeg: 0, spreadDeg: 180 } },
    baseDamage: { physical: [6, 10] },
    delivery: { type: 'cone', range: 150, arcDeg: 12 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.2, magnitude: 0.25 },
    ],
    requirements: { dexterity: 18 },
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

  meteoric_bombardment: {
    id: 'meteoric_bombardment', name: 'Meteoric Bombardment',
    description: 'CHANNELED (immobile): meteors hammer the area around your cursor for as long as you hold. The cooldown begins when the bombardment ends, early or not.',
    tags: ['spell', 'fire', 'aoe', 'storm', 'channel', 'duration'], color: '#ff5a2a',
    manaCost: 9, cooldown: 5, useTime: 0,
    castMode: 'channel',
    channel: { interval: 0.8, move: 'immobile', trackAim: true, cooldownOnEnd: true },
    baseDamage: { fire: [12, 18] },
    delivery: { type: 'storm', count: [2, 3], interval: 0.12, areaRadius: 130, hitRadius: 50, castRange: 480 },
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
    requirements: { dexterity: 22, intelligence: 10 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  decoy: {
    id: 'decoy', name: 'Decoy',
    description: 'Dash away, leaving a taunting mirage of yourself behind. Enemies prefer attacking it over anything else.',
    tags: ['movement', 'duration'], color: '#88b8c8',
    manaCost: 10, cooldown: 6, useTime: 0,
    delivery: { type: 'dash', distance: 240, speed: 800, width: 0, decoyDuration: 6 },
    effects: [],
    requirements: { dexterity: 16 },
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
    targeting: { target: 'corpse', castRange: 420, corpseLifeDamage: 0.15 },
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
    requirements: { strength: 14 },
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
    requirements: { strength: 14, dexterity: 10 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  raise_spectre: {
    id: 'raise_spectre', name: 'Raise Spectre',
    description: 'Bind the spirit of a corpse into a PERMANENT allied copy of the slain creature. Only a precious few can be held.',
    tags: ['spell', 'summon', 'minion', 'corpse'], color: '#a8b8d8',
    manaCost: 30, cooldown: 2, useTime: 1,
    targeting: { target: 'corpse', castRange: 420 },
    delivery: { type: 'summon', fromCorpse: true, count: 1, maxActive: 2 },
    effects: [],
    requirements: { willpower: 22 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },

  revive: {
    id: 'revive', name: 'Revive',
    description: 'Wrench a corpse briefly back to its feet as a short-lived ally. Cheap, plentiful, and temporary.',
    tags: ['spell', 'summon', 'minion', 'corpse', 'duration'], color: '#88a878',
    manaCost: 12, cooldown: 0.8, useTime: 0.7,
    targeting: { target: 'corpse', castRange: 420 },
    delivery: { type: 'summon', fromCorpse: true, count: 1, maxActive: 6, duration: 15 },
    effects: [],
    requirements: { willpower: 16 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.1), mod('minionDamage', 'increased', 0.12)] },
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
    requirements: { strength: 16, intelligence: 10 },
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
    requirements: { dexterity: 22 },
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
      // Release with ≥25% shield: the stance converts into a bash.
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
    description: 'Raise a WALL OF POINTS: a heavy guard whose face bites back — every blow you block bleeds the striker on the spikes, and the release still bashes. The greatshield made spiteful: stand, take, answer.',
    tags: ['guard', 'channel', 'duration', 'physical'], color: '#a8988a',
    manaCost: 9, cooldown: 5, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 150, shieldLife: 85, moveFactor: 0.35, turnRate: 2.2,
      bash: { mult: 1.15, range: 95, arcDeg: 120, stunChance: 0.3, knockback: 30 },
    },
    innateMods: [mod('thorns', 'flat', 8, undefined, 'guarding')],
    delivery: { type: 'self' },
    effects: [],
    requirements: { strength: 18 },
    ai: { range: 220, weight: 2 },
    leveling: { perLevel: [mod('guardStrength', 'increased', 0.14), mod('thorns', 'flat', 2, undefined, 'guarding')] },
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
    requirements: { strength: 20 },
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
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_bone',
      ring: { segments: 10, radius: 78 },
      range: 0, duration: 6, maxActive: 10, life: 30, placeRange: 340,
    },
    effects: [],
    requirements: { willpower: 18, intelligence: 12 },
    ai: { range: 320, weight: 1, keepDistance: 260 },
  },

  bone_cage: {
    id: 'bone_cage', name: 'Bone Cage',
    description: 'Slam a tight cage of bone shut around a single enemy. Smaller, meaner, personal.',
    tags: ['spell', 'summon', 'minion', 'physical', 'duration'], color: '#c8bca0',
    manaCost: 16, cooldown: 6, useTime: 0.6,
    targeting: { target: 'enemy', castRange: 320 },
    delivery: {
      type: 'construct', kind: 'barrier', look: 'construct_barrier_bone',
      ring: { segments: 8, radius: 50 },
      range: 0, duration: 4, maxActive: 8, life: 20, placeRange: 320,
    },
    effects: [],
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
    requirements: { willpower: 18, strength: 10 },
    ai: { range: 220, weight: 1 },
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.08), mod('aoeRadius', 'increased', 0.06)] },
  },

  stone_rampart: {
    id: 'stone_rampart', name: 'Stone Rampart',
    description: 'Raise a wall of three stone segments across your facing. Enemies must shoot it, hack through it, or go around.',
    tags: ['spell', 'guard', 'duration'], color: '#a8a090',
    manaCost: 18, cooldown: 8, useTime: 0.6,
    delivery: {
      type: 'construct', kind: 'barrier',
      range: 0, duration: 12, maxActive: 6, life: 70,
      placeRange: 160, wallSegments: 3,
    },
    effects: [],
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
    requirements: { dexterity: 22 },
    ai: { range: 52, weight: 3 },
  },

  rallying_howl: {
    id: 'rallying_howl', name: 'Rallying Howl',
    description: 'BLESSING: you and allies around you deal 25% increased damage and move 15% faster for 6 seconds. Commander tech — minions love it.',
    tags: ['warcry', 'buff', 'aoe', 'duration'], color: '#e8a040',
    manaCost: 15, cooldown: 9, useTime: 0.5,
    delivery: { type: 'nova', radius: 220, affects: 'allies' },
    effects: [{ type: 'status', status: 'rally', chance: 1 }],
    requirements: { strength: 14, willpower: 14 },
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
    requirements: { strength: 16, dexterity: 12 },
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
    requirements: { strength: 22 },
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
    requirements: { intelligence: 20 },
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
    requirements: { strength: 14, vitality: 12 },
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
    description: 'Point, and the horde OBEYS: every mobile minion marches on your mark and fights whatever holds it. The rift opens at your feet; the teeth arrive where you aim.',
    tags: ['spell', 'minion', 'instant'], color: '#d0a858',
    manaCost: 6, cooldown: 5, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'commandMinions', duration: 6 }],
    requirements: { willpower: 12 },
    ai: { range: 500, weight: 1 },
    leveling: { perLevel: [mod('cooldownRecovery', 'increased', 0.08)] },
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
    requirements: { willpower: 16, strength: 8 },
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
    requirements: { strength: 10, willpower: 12 },
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
    effects: [],
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
      type: 'construct', kind: 'barrier',
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
      type: 'construct', kind: 'eruptor', castSkillId: 'hellfire_missile',
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
    requirements: { dexterity: 16, intelligence: 12 },
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
      type: 'construct', kind: 'pylon',
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
    requirements: { intelligence: 26 },
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
      type: 'ground', radius: 95, castRange: 460, delay: 0.9,
      leaveTerrain: { kind: 'ice', radius: 95, duration: 6 },
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'chill', chance: 0.6 },
    ],
    requirements: { intelligence: 22 },
    ai: { range: 430, weight: 2, keepDistance: 300 },
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
    description: 'GUARD: encase yourself in a 360° shell of ice. You cannot move — but nothing gets through until the shell breaks or you release it, and either way it EXPLODES in cold.',
    tags: ['spell', 'cold', 'guard', 'channel', 'aoe', 'duration'], color: '#bce8f8',
    manaCost: 14, cooldown: 7, useTime: 0,
    castMode: 'guard',
    guard: {
      arcDeg: 360, shieldLife: 90, moveFactor: 0, turnRate: 10,
      bash: { mult: 0.6, range: 95, arcDeg: 360, stunChance: 0.3, knockback: 55 },
      bashOnBreak: true,
    },
    delivery: { type: 'self' },
    effects: [],
    requirements: { intelligence: 20, strength: 8 },
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
  // the drink spends the bank as a restore-over-time. Learned flasks also
  // carry a passive drop chance (equipMods) — the alchemist's loop.

  life_flask: {
    id: 'life_flask', name: 'Life Flask',
    description: 'A fount that BANKS every life orb you scoop (up to 5 sips). Drink to pour the whole bank back as healing over a few seconds. Carried on the bar, it shakes life orbs loose from your hits.',
    tags: ['instant', 'buff', 'duration'], color: '#d04848',
    manaCost: 0, cooldown: 2, useTime: 0,
    chargeGain: [{ charge: 'flask_life', amount: 1, max: 5, on: 'orbPickup', orbKind: 'life' }],
    chargeCost: { charge: 'flask_life', amount: 'all', minimum: 1 },
    equipMods: [mod('orbDropLife', 'flat', 0.05)],
    delivery: { type: 'self' },
    effects: [{ type: 'restoreOverTime', resource: 'life', amount: 16, duration: 3, perCharge: true }],
    thresholds: [
      { level: 12, label: 'Deeper draught', mods: [mod('chargeCap', 'flat', 2)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', -0.04)] },
  },

  mana_flask: {
    id: 'mana_flask', name: 'Mana Flask',
    description: 'A fount that BANKS every mana orb you scoop (up to 5 sips). Drink to pour the bank back as mana over a few seconds. Carried on the bar, it shakes mana orbs loose from your hits.',
    tags: ['instant', 'buff', 'duration'], color: '#4a78d8',
    manaCost: 0, cooldown: 2, useTime: 0,
    chargeGain: [{ charge: 'flask_mana', amount: 1, max: 5, on: 'orbPickup', orbKind: 'mana' }],
    chargeCost: { charge: 'flask_mana', amount: 'all', minimum: 1 },
    equipMods: [mod('orbDropMana', 'flat', 0.05)],
    delivery: { type: 'self' },
    effects: [{ type: 'restoreOverTime', resource: 'mana', amount: 13, duration: 3, perCharge: true }],
    thresholds: [
      { level: 12, label: 'Deeper draught', mods: [mod('chargeCap', 'flat', 2)] },
    ],
    leveling: { perLevel: [mod('effectDuration', 'increased', -0.04)] },
  },

  catalyst_flask: {
    id: 'catalyst_flask', name: 'Catalyst Flask',
    description: 'The alchemist\'s vice: EVERY orb kind feeds the catalyst. Drink to transmute the bank — life and mana trickle together and the reaction leaves you burning brighter for a spell.',
    tags: ['instant', 'buff', 'duration'], color: '#c8a848',
    manaCost: 0, cooldown: 5, useTime: 0,
    chargeGain: [{ charge: 'flask_catalyst', amount: 1, max: 6, on: 'orbPickup' }],
    chargeCost: { charge: 'flask_catalyst', amount: 'all', minimum: 2 },
    equipMods: [mod('orbDropLife', 'flat', 0.025), mod('orbDropMana', 'flat', 0.025)],
    delivery: { type: 'self' },
    effects: [
      { type: 'restoreOverTime', resource: 'life', amount: 7, duration: 3.5, perCharge: true },
      { type: 'restoreOverTime', resource: 'mana', amount: 6, duration: 3.5, perCharge: true },
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
      statuses: ['despair', 'agony', 'indecision', 'befuddlement', 'torment', 'doombrand', 'doom'],
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
      type: 'construct', kind: 'sentry', castSkillId: 'rift_shard',
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
      type: 'construct', kind: 'barrier',
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
    targeting: { target: 'corpse', castRange: 420 },
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
    targeting: { target: 'corpse', castRange: 420 },
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
    requirements: { intelligence: 18 },
    ai: { range: 240, weight: 1 },
  },

  levinfall: {
    id: 'levinfall', name: 'Levinfall',
    description: 'Mark a circle and SHOW it — then the sky empties into it: lightning scattered across the promised ground, area by area. No seeking, no mercy for the mark: the circle is the contract (Thunderstorm\'s honest cousin).',
    tags: ['spell', 'lightning', 'aoe', 'storm'], color: '#f0e858',
    manaCost: 13, cooldown: 4, useTime: 0.65,
    baseDamage: { lightning: [9, 15] },
    delivery: {
      type: 'storm', count: [9, 13], interval: 0.04,
      areaRadius: 180, hitRadius: 42, castRange: 460,
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
      type: 'construct', kind: 'pod',
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
      type: 'construct', kind: 'barrier', castSkillId: 'bell_toll',
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
};

export const SKILL_LIST: SkillDef[] = Object.values(SKILLS);
