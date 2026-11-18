// ---------------------------------------------------------------------------
// THE ULTIMATE ARTS — super skills on super cooldowns (engine/ultimates.ts).
//
// Ordinary catalog rows wearing `ultimate` (THE EYECATCH pane + the held
// beat) and priced under THE PRICE FLOOR (ULT_CFG.minCooldown — the census
// probe is the censor). Each debut is a COMPOSE of standing fabrics, no new
// engine verbs:
//
//   · the Hundred Partings — SkillDef.chrono (the timeflow fabric) under an
//     at-enemies slash storm: the world stops, the cuts land, time resumes
//     already owing. The pane's beat defaults to 0 — the stop IS the movie.
//   · Hollow Star — GroundDelivery.pull at event-horizon reach (the Cold
//     Vortex lane, priced up) with a follow-up collapse a breath after the
//     well closes (SkillDef.followUp — fired free at the same aim).
//   · the Woken Hollow — the possession seam's 'shapeshift' effect: wear
//     the hollow at your own level for a while, powerFactor above 1 (the
//     one form that is NOT the weaker vessel — the cooldown is the price),
//     press again to be only yourself (the seatAway convert, dire-wolf
//     idiom).
//
// The form body registers here too (the mu.ts apparition idiom: data files
// may seat their own defs — monsters.ts is fully evaluated first). SKILLS
// absorbs this file by spread (data/skills.ts tail).
// ---------------------------------------------------------------------------

import { mod } from '../engine/stats';
import type { SkillDef } from '../engine/skills';
import type { MonsterDef } from './monsters';

export const ULTIMATE_SKILLS: Record<string, SkillDef> = {

  hundred_partings: {
    id: 'hundred_partings', name: 'the Hundred Partings',
    description: 'Stop time for 1.5 seconds for everything except yourself while unleashing a'
      + ' storm of 14 dimensional cuts across enemies near your target area, dealing physical'
      + ' damage with a 50% chance to inflict bleed.',
    tags: ['attack', 'physical', 'aoe', 'storm', 'duration', 'chrono', 'ultimate'], color: '#b8c8e8',
    manaCost: 45, cooldown: 90, useTime: 0.4,
    baseDamage: { physical: [30, 48] },
    // A TIGHT storm: every enemy in the disc takes a cut planted straight
    // under it (atEnemies), and the leftover cuts scatter close enough to
    // keep biting a lone quarry — the disc is deliberately narrow so the
    // art concentrates instead of decorating the field.
    delivery: {
      type: 'storm', count: 14, interval: 0.07, areaRadius: 240, hitRadius: 60,
      castRange: 420, atEnemies: true, scatter: 14, occlusion: 'free',
    },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'bleed', chance: 0.5 },
    ],
    chrono: { scale: 0, duration: 1.5, exempt: 'caster' },
    // No style named — the fabric's default cut-in ('flank': the world stays
    // in the shot while the stop lands). `style: 'sunder'` opts the full
    // movie back in any time.
    ultimate: { sub: 'the stilled hour, spent' },
    requirements: { dexterity: 30 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 380, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  hollow_star: {
    id: 'hollow_star', name: 'Hollow Star',
    description: 'Conjure a collapsing star at the target point for 3 seconds that pulls nearby'
      + ' enemies toward its center while dealing chaos damage over time, then detonates in a'
      + ' massive burst when it expires.',
    tags: ['spell', 'chaos', 'aoe', 'duration', 'ultimate'], color: '#8a5ae8',
    manaCost: 60, cooldown: 75, useTime: 0.8,
    baseDamage: { chaos: [9, 14] },
    delivery: {
      type: 'ground', radius: 120, castRange: 460, occlusion: 'free', delay: 0.35,
      lingerDuration: 3, tickInterval: 0.3, pull: 260, pullRadius: 320,
    },
    effects: [{ type: 'damage' }],
    // The collapse fires FREE at the same aim a breath after the well closes
    // (0.35 telegraph + 3.0 linger) — the follow-through beat, minted at the
    // host's effective level.
    followUp: { skillId: 'hollow_star_collapse', delay: 3.5 },
    ultimate: { sub: 'the sky forgets a light' },
    requirements: { intelligence: 30 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 420, weight: 4, keepDistance: 280 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  hollow_star_collapse: {
    id: 'hollow_star_collapse', name: 'Hollow Star: Collapse', noDrop: true,
    description: 'Detonate the collapsing star in a burst of chaos damage that knocks back'
      + ' enemies and has a 50% chance to stun.',
    // Wears the 'ultimate' TAG with no mark: the collapse is the art's own
    // follow-through, so ultimate-scoped scaling reaches it — but a payload
    // pays no price floor and runs no pane (THE SPEC IS THE MARK).
    tags: ['spell', 'chaos', 'aoe', 'ultimate'], color: '#8a5ae8',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [55, 85] },
    delivery: { type: 'ground', radius: 200, castRange: 520, occlusion: 'free' },
    effects: [
      { type: 'damage' },
      { type: 'knockback', strength: 70 },
      { type: 'status', status: 'stun', chance: 0.5 },
    ],
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  woken_hollow: {
    id: 'woken_hollow', name: 'the Woken Hollow',
    description: 'Transform into the Woken Hollow for 14 seconds, gaining increased damage, cast'
      + ' speed, damage reduction, and the ability to cross pits and chasms. Activate again to'
      + ' return to your normal form early.',
    tags: ['spell', 'possession', 'duration', 'ultimate'], color: '#e8b34a',
    manaCost: 50, cooldown: 120, useTime: 0.5,
    delivery: { type: 'self' },
    effects: [{
      type: 'shapeshift',
      shift: { form: 'ult_woken_hollow', powerFactor: 1.35, duration: 14 },
    }],
    convert: { when: 'seatAway', skillId: 'return_to_flesh' },
    // The pane shows what you are BECOMING — the avatar override lever.
    ultimate: {
      tint: '#e8b34a', sub: 'stop holding it shut',
      avatarDefId: 'ult_woken_hollow',
    },
    requirements: { willpower: 26 },
    minDropLevel: 14, dropWeight: 8,
    leveling: { perLevel: [mod('possessPower', 'flat', 0.02)] },
  },

  // ======================= THE VAAL WAVE (engine/gauge.ts) ==================
  // Super arts priced in the world's own events instead of seconds — and
  // the two resource shapes the gauge fabric opens: per-skill GAUGES fed by
  // deaths (Grave Tide, the Reaper's Toll below) and a per-actor POOL that
  // regenerates on its own clock (Wisps → the Hush). The cooldown arts
  // (Doom Bell, Last Rites, Stormcrown) round the roster with three more
  // fantasies: the screen-clearing bell, the low-life comeback, the sky
  // that spares no one.

  grave_tide: {
    id: 'grave_tide', name: 'Grave Tide',
    description: 'Gather souls from nearby enemy deaths, with elite kills granting extra souls.'
      + ' Spend up to 30 souls to raise up to 8 skeletons and zombies for 22 seconds (maximum'
      + ' 12 active), or cast early with at least 3 souls for a smaller summoning. Cannot gain'
      + ' souls for 12 seconds after use.',
    tags: ['spell', 'summon', 'minion', 'duration', 'ultimate'], color: '#cfc8b8',
    manaCost: 40, cooldown: 0, useTime: 0.9,
    delivery: {
      type: 'summon',
      pool: [{ id: 'skeleton_warrior', weight: 3 }, { id: 'zombie', weight: 2 }],
      count: 8, maxActive: 12, duration: 22,
    },
    effects: [],
    // THE GAUGE: deaths within reach feed it whether or not the blow was
    // yours (souls rise to whoever stands closest); an elite you slay
    // yourself counts for more. Priced in bodies — no cooldown at all.
    gauge: {
      need: 30, unit: 'souls', lockoutSec: 12,
      feeds: [
        { on: 'enemyDeath', amount: 1, radius: 420 },
        { on: 'kill', amount: 2, eliteVictim: true },
      ],
      // THE PARTIAL PRESS: from three souls the tide may be called early —
      // a quarter of its power at the floor, the full eight at thirty.
      partial: { minFrac: 0.1, floorPower: 0.25 },
    },
    ultimate: { sub: 'they were never asleep' },
    requirements: { willpower: 24 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 400, weight: 4, keepDistance: 260 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12), mod('minionDamage', 'increased', 0.1)] },
    // THE UPGRADE TREE (the D4 Prime/Supreme shape on the skill-mode
    // fabric — docs/design/skill-modes.md): two walked identities + the
    // neutral, every rung an ordinary modifier row.
    tree: {
      level: 5,
      branches: [
        {
          id: 'unburied', name: 'The Unburied',
          description: 'Increase the durability and duration of risen minions and shorten the soul lockout.',
          rungs: [
            { id: 'gt_unburied', name: 'The Unburied', description: 'Risen minions have 30% increased life and 20% increased duration.',
              mods: [mod('minionLife', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)] },
            { id: 'gt_long_vigil', name: 'The Long Vigil', description: '30% increased duration and 25% reduced soul lockout duration.',
              mods: [mod('effectDuration', 'increased', 0.3), mod('gaugeLockout', 'increased', -0.25)] },
            { id: 'gt_grave_legion', name: 'Grave Legion', description: 'Summon 2 additional undead per cast.',
              mods: [mod('summonCount', 'flat', 2)] },
          ],
        },
        {
          id: 'grave_court', name: 'The Grave Court',
          description: 'Increase minion damage, soul generation, and reduce the souls required.',
          rungs: [
            { id: 'gt_grave_court', name: 'The Grave Court', description: 'Risen minions deal 35% increased damage.',
              mods: [mod('minionDamage', 'increased', 0.35)] },
            { id: 'gt_bone_choir', name: 'Bone Choir', description: '25% increased soul gain.',
              mods: [mod('gaugeGain', 'increased', 0.25)] },
            { id: 'gt_tide_turns', name: 'The Tide Turns', description: 'Risen minions deal 30% increased damage and the full cast requires 20% fewer souls.',
              mods: [mod('minionDamage', 'increased', 0.3), mod('gaugeNeed', 'increased', -0.2)] },
          ],
        },
      ],
      neutral: { id: 'gt_soul_ledger', name: 'Soul Ledger', description: 'Requires 15% fewer souls.',
        mods: [mod('gaugeNeed', 'increased', -0.15)] },
    },
  },

  doom_bell: {
    id: 'doom_bell', name: 'Doom Bell',
    description: 'Unleash a wide physical shockwave around you that stuns and knocks back all'
      + ' enemies hit, dealing more damage for each enemy within range.',
    tags: ['spell', 'aoe', 'physical', 'ultimate'], color: '#c8a84b',
    manaCost: 55, cooldown: 60, useTime: 0.6,
    baseDamage: { physical: [40, 62] },
    delivery: { type: 'nova', radius: 400 },
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'stun', chance: 1 },
      { type: 'knockback', strength: 90 },
    ],
    empower: { radius: 400, dmgPerPower: 0.06 },
    ultimate: { sub: 'every debt, at once' },
    requirements: { strength: 24 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 300, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  last_rites: {
    id: 'last_rites', name: 'Last Rites',
    description: 'Usable only while below 50% life. Instantly heal for 40% of your maximum'
      + ' life, deal 35% more damage for 6 seconds, and trigger a physical shockwave after a'
      + ' brief delay that stuns nearby enemies.',
    tags: ['spell', 'buff', 'instant', 'ultimate'], color: '#b84a4a',
    manaCost: 0, cooldown: 75, useTime: 0,
    delivery: { type: 'self' },
    effects: [
      { type: 'heal', pctMax: 0.4 },
      { type: 'buff', id: 'last_rites_fury', duration: 6, mods: [mod('damage', 'more', 0.35)] },
    ],
    // THE LOW-LIFE LICENSE: the thirst gate, read as a comeback — the rites
    // are only yours to read when you are the one dying.
    gate: { missing: { kind: 'life', pct: 0.5 }, note: 'not yet dying' },
    followUp: { skillId: 'last_rites_toll', delay: 0.25 },
    reflex: true,
    ultimate: { sub: 'read them yourself' },
    requirements: { strength: 20 },
    minDropLevel: 12, dropWeight: 8,
    leveling: { perLevel: [mod('healPower', 'increased', 0.08)] },
  },

  last_rites_toll: {
    id: 'last_rites_toll', name: 'Last Rites: the Toll', noDrop: true,
    description: 'Release a burst of physical damage around you that stuns all enemies hit.',
    tags: ['spell', 'aoe', 'physical', 'ultimate'], color: '#b84a4a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [50, 80] },
    delivery: { type: 'nova', radius: 240 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'stun', chance: 1 }],
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  stormcrown: {
    id: 'stormcrown', name: 'Stormcrown',
    description: 'Call down 24 lightning bolts across the target area over 4 seconds, dealing'
      + ' lightning damage with a 60% chance to shock. Strikes hit all creatures in the area'
      + ' indiscriminately, including allies and yourself.',
    tags: ['spell', 'lightning', 'aoe', 'storm', 'duration', 'ultimate'], color: '#ffe94a',
    manaCost: 65, cooldown: 80, useTime: 0.7,
    baseDamage: { lightning: [22, 44] },
    delivery: {
      type: 'storm', count: 24, interval: 0.16, areaRadius: 300, hitRadius: 72,
      castRange: 480, occlusion: 'free', sky: true, telegraph: 0.4,
    },
    effects: [{ type: 'damage' }, { type: 'status', status: 'shock', chance: 0.6 }],
    ultimate: { sub: 'the sky spares no one' },
    requirements: { intelligence: 26 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 440, weight: 4, keepDistance: 300 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  hush_of_the_wake: {
    id: 'hush_of_the_wake', name: 'Hush of the Wake',
    description: 'Spend 5 Wisps (passively generated every 4 seconds while equipped) to heal'
      + ' for 20% of your maximum life, gain a 240-point absorb shield for 5 seconds, and gain'
      + ' 50% reduced damage taken and 25% increased movement speed for 4 seconds.',
    tags: ['spell', 'buff', 'instant', 'ultimate'], color: '#8fa8d8',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [
      { type: 'absorb', amount: 240, duration: 5 },
      { type: 'heal', pctMax: 0.2 },
      {
        type: 'buff', id: 'hushed', duration: 4,
        mods: [mod('damageTaken', 'more', -0.5), mod('moveSpeed', 'increased', 0.25)],
      },
    ],
    // THE POOL: the wisp bank (engine/charges.ts — regen 2.5 per 10s while
    // a spender is carried) IS the price; the press drinks it whole.
    chargeCost: { charge: 'wisp', amount: 5 },
    reflex: true,
    ultimate: { sub: 'nothing reaches you here' },
    requirements: { willpower: 22 },
    minDropLevel: 12, dropWeight: 8,
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
  },

  // The gauge fabric standing ALONE — no super mark, an ordinary drop: the
  // kill-speed build-around. Eight kills ring it; four seconds of silence.
  reapers_toll: {
    id: 'reapers_toll', name: 'Reaper\'s Toll',
    description: 'Collect a soul with each kill. At 8 souls, unleash a nova of chaos damage'
      + ' around yourself, followed by a 4-second lockout before souls can be gathered again.',
    tags: ['spell', 'chaos', 'aoe'], color: '#7a5aa8',
    manaCost: 12, cooldown: 0, useTime: 0.3,
    baseDamage: { chaos: [18, 30] },
    delivery: { type: 'nova', radius: 170 },
    effects: [{ type: 'damage' }],
    gauge: { need: 8, unit: 'souls', lockoutSec: 4, feeds: [{ on: 'kill', amount: 1 }] },
    requirements: { intelligence: 14 },
    minDropLevel: 6, dropWeight: 20,
    ai: { range: 150, weight: 3 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },

  // ======================= THE D4 ROSTER (the gauge's two new modes) =====
  // Diablo-4-shaped ultimates, one per house, each an honest compose — and
  // each wearing the Prime/Supreme-style upgrade tree on the skill-mode
  // fabric. Two debut the gauge's new modes: THE OVERFLOW + THE HASTENING
  // (Red Hour — the resource hurries the clock, then the effect grows) and
  // THE PARTIAL PRESS on a storm (Rain of Knives — fewer marks, fewer knives).

  // The Berserker's Wrath — THE TWO-PHASE ART: while the Hour's clock runs,
  // every landed blow shaves it; once clear, blows and kills bank WRATH and
  // the press wears the whole bank as stacks (10 at a full purse, 30 at a
  // brimming one). No silence — the cooldown is the price.
  red_hour: {
    id: 'red_hour', name: 'Red Hour',
    description: 'While on cooldown, landing hits reduces the remaining cooldown. Once ready,'
      + ' hits and kills build Wrath (12 to activate, up to 36 maximum). Activate to consume'
      + ' all Wrath and gain 10 to 30 stacks for 8 seconds, each granting 4% increased damage,'
      + ' 2% increased attack speed, 1% increased movement speed, and 1.5% reduced damage taken.',
    tags: ['spell', 'buff', 'instant', 'ultimate'], color: '#c83a2a',
    manaCost: 0, cooldown: 90, useTime: 0,
    delivery: { type: 'self' },
    effects: [{
      type: 'buff', id: 'red_hour', duration: 8, maxStacks: 30, powerStacks: 10,
      mods: [
        mod('damage', 'increased', 0.04), mod('attackSpeed', 'increased', 0.02),
        mod('moveSpeed', 'increased', 0.01), mod('damageTaken', 'more', -0.015),
      ],
    }],
    gauge: {
      need: 12, unit: 'wrath', lockoutSec: 0, bankMult: 3, overflow: true, cooldownPer: 1.5,
      feeds: [{ on: 'hit', amount: 1 }, { on: 'kill', amount: 4 }],
    },
    reflex: true,
    ultimate: { sub: 'the hour is red' },
    requirements: { strength: 26 },
    minDropLevel: 12, dropWeight: 8,
    leveling: { perLevel: [mod('effectDuration', 'increased', 0.06)] },
    tree: {
      level: 5,
      branches: [
        {
          id: 'unbroken', name: 'The Unbroken',
          description: 'Increase damage reduction, duration, and cooldown recovery.',
          rungs: [
            { id: 'rh_unbroken', name: 'The Unbroken', description: 'Take 20% less damage while active and increase duration by 20%.',
              mods: [mod('damageTaken', 'more', -0.2), mod('effectDuration', 'increased', 0.2)] },
            { id: 'rh_iron_hour', name: 'Iron Hour', description: '25% increased duration and 15% increased cooldown recovery.',
              mods: [mod('effectDuration', 'increased', 0.25), mod('cooldownRecovery', 'increased', 0.15)] },
            { id: 'rh_last_stand', name: 'Last Stand', description: '30% increased Wrath gain.',
              mods: [mod('gaugeGain', 'increased', 0.3)] },
          ],
        },
        {
          id: 'bloodletter', name: 'The Bloodletter',
          description: 'Increase critical strike chance, critical multiplier, and Wrath generation.',
          rungs: [
            { id: 'rh_bloodletter', name: 'The Bloodletter', description: '+8% critical strike chance.',
              mods: [mod('critChance', 'flat', 0.08)] },
            { id: 'rh_open_vein', name: 'The Open Vein', description: '25% increased Wrath gain.',
              mods: [mod('gaugeGain', 'increased', 0.25)] },
            { id: 'rh_red_end', name: 'The Red End', description: '30% increased critical strike multiplier and 10% increased cooldown recovery.',
              mods: [mod('critMulti', 'increased', 0.3), mod('cooldownRecovery', 'increased', 0.1)] },
          ],
        },
      ],
      neutral: { id: 'rh_second_wind', name: 'Second Wind', description: '12% increased cooldown recovery.',
        mods: [mod('cooldownRecovery', 'increased', 0.12)] },
    },
  },

  // The Sorcerer's Deep Freeze — hold the cold and let nothing reach you: a
  // freezing burst, three seconds of near-immunity, then the shatter.
  long_cold: {
    id: 'long_cold', name: 'The Long Cold',
    description: 'Unleash a burst of cold around you that freezes all enemies hit and grants you'
      + ' 80% reduced damage taken for 3 seconds, followed by a second shattering burst of cold'
      + ' damage when the effect ends.',
    tags: ['spell', 'cold', 'aoe', 'buff', 'ultimate'], color: '#9ad8f0',
    manaCost: 60, cooldown: 80, useTime: 0.3,
    baseDamage: { cold: [30, 50] },
    delivery: { type: 'nova', radius: 260 },
    // The caster's stillness rides a BUFF (allies-only by the buff law);
    // never an `absorb` here — on a damaging delivery, absorb shields the
    // victims it touches (the per-target effect loop), and a shielded field
    // would eat its own shatter.
    effects: [
      { type: 'damage' },
      { type: 'status', status: 'frozen', chance: 1 },
      { type: 'buff', id: 'long_cold', duration: 3, mods: [mod('damageTaken', 'more', -0.8)] },
    ],
    followUp: { skillId: 'long_cold_shatter', delay: 3 },
    ultimate: { sub: 'nothing reaches you here either' },
    requirements: { intelligence: 26 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 220, weight: 4 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
    tree: {
      level: 5,
      branches: [
        {
          id: 'deep_winter', name: 'Deep Winter',
          description: 'Increase duration, radius, and cooldown recovery.',
          rungs: [
            { id: 'lc_deep_winter', name: 'Deep Winter', description: '30% increased effect duration.',
              mods: [mod('effectDuration', 'increased', 0.3)] },
            { id: 'lc_white_silence', name: 'White Silence', description: '25% increased area radius.',
              mods: [mod('aoeRadius', 'increased', 0.25)] },
            { id: 'lc_permafrost', name: 'Permafrost', description: '20% increased cooldown recovery.',
              mods: [mod('cooldownRecovery', 'increased', 0.2)] },
          ],
        },
        {
          id: 'shatter', name: 'The Shatter',
          description: 'Increase cold damage and critical strike potency.',
          rungs: [
            { id: 'lc_shatter', name: 'The Shatter', description: '25% increased damage.',
              mods: [mod('damage', 'increased', 0.25)] },
            { id: 'lc_brittle', name: 'Brittle', description: '+10% critical strike chance.',
              mods: [mod('critChance', 'flat', 0.1)] },
            { id: 'lc_glass_world', name: 'Glass World', description: '30% increased damage and 25% increased critical strike multiplier.',
              mods: [mod('damage', 'increased', 0.3), mod('critMulti', 'increased', 0.25)] },
          ],
        },
      ],
      neutral: { id: 'lc_cold_snap', name: 'Cold Snap', description: '20% reduced mana cost.',
        mods: [mod('manaCost', 'increased', -0.2)] },
    },
  },

  long_cold_shatter: {
    id: 'long_cold_shatter', name: 'The Long Cold: Shatter', noDrop: true,
    description: 'Release a secondary burst of cold damage around you that knocks enemies back.',
    tags: ['spell', 'cold', 'aoe', 'ultimate'], color: '#9ad8f0',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { cold: [60, 100] },
    delivery: { type: 'nova', radius: 280 },
    effects: [{ type: 'damage' }, { type: 'knockback', strength: 60 }],
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  // The Rogue's Rain of Arrows — THE PARTIAL PRESS on a storm: from five
  // marks the rain may be called early, fewer knives and lighter, the full
  // twenty-four at twenty.
  rain_of_knives: {
    id: 'rain_of_knives', name: 'Rain of Knives',
    description: 'Build marks by landing hits and scoring kills. Spend 20 marks to rain 24'
      + ' knives across the target area, dealing physical damage with a 35% chance to inflict'
      + ' bleed, or cast early from 5 marks with reduced count and damage. Followed by an'
      + ' 8-second mark lockout.',
    tags: ['attack', 'physical', 'aoe', 'storm', 'ultimate'], color: '#a8b8c8',
    manaCost: 30, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [16, 26] },
    delivery: {
      type: 'storm', count: 24, interval: 0.05, areaRadius: 220, hitRadius: 40,
      castRange: 520, atEnemies: true, scatter: 20, occlusion: 'free',
    },
    effects: [{ type: 'damage' }, { type: 'status', status: 'bleed', chance: 0.35 }],
    gauge: {
      need: 20, unit: 'marks', lockoutSec: 8,
      feeds: [{ on: 'hit', amount: 1 }, { on: 'kill', amount: 3 }],
      partial: { minFrac: 0.25, floorPower: 0.3 },
    },
    ultimate: { sub: 'the sky is full of knives' },
    requirements: { dexterity: 26 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 460, weight: 4, keepDistance: 300 },
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
    tree: {
      level: 5,
      branches: [
        {
          id: 'second_volley', name: 'The Second Volley',
          description: 'Increase knife count, area radius, and reduce lockout duration.',
          rungs: [
            { id: 'rk_second_volley', name: 'The Second Volley', description: '+6 knives per volley.',
              mods: [mod('stormCount', 'flat', 6)] },
            { id: 'rk_wide_sky', name: 'The Wide Sky', description: '25% increased area radius.',
              mods: [mod('aoeRadius', 'increased', 0.25)] },
            { id: 'rk_no_silence', name: 'No Silence', description: '50% reduced mark lockout duration.',
              mods: [mod('gaugeLockout', 'increased', -0.5)] },
          ],
        },
        {
          id: 'poisoned_rain', name: 'The Poisoned Rain',
          description: 'Increase damage, mark generation, and critical strikes.',
          rungs: [
            { id: 'rk_poisoned_rain', name: 'The Poisoned Rain', description: '25% increased damage.',
              mods: [mod('damage', 'increased', 0.25)] },
            { id: 'rk_marked_men', name: 'Marked Men', description: '30% increased mark gain.',
              mods: [mod('gaugeGain', 'increased', 0.3)] },
            { id: 'rk_red_rain', name: 'Red Rain', description: '+12% critical strike chance and 30% increased critical strike multiplier.',
              mods: [mod('critChance', 'flat', 0.12), mod('critMulti', 'increased', 0.3)] },
          ],
        },
      ],
      neutral: { id: 'rk_light_hand', name: 'The Light Hand', description: 'Requires 20% fewer marks.',
        mods: [mod('gaugeNeed', 'increased', -0.2)] },
    },
  },

  // The Paladin's Heaven's Fury (the Cleric's house here) — the sky judges,
  // then mends: radiant shafts on the enemies near the mark, and a breath
  // after the last, a third of every ally's life given back.
  litany_of_dawn: {
    id: 'litany_of_dawn', name: 'Litany of Dawn',
    description: 'Call down 10 shafts of radiant fire onto enemies near your target over 2'
      + ' seconds, dealing fire damage and weakening targets hit, then heal all allies within'
      + ' range for 33% of their maximum life.',
    tags: ['spell', 'fire', 'aoe', 'storm', 'ultimate'], color: '#f0d890',
    manaCost: 55, cooldown: 70, useTime: 0.6,
    baseDamage: { fire: [24, 40] },
    delivery: {
      type: 'storm', count: 10, interval: 0.2, areaRadius: 240, hitRadius: 70,
      castRange: 400, atEnemies: true, scatter: 16, occlusion: 'free', telegraph: 0.3,
    },
    effects: [{ type: 'damage' }, { type: 'status', status: 'weaken', chance: 1 }],
    followUp: { skillId: 'litany_of_dawn_mend', delay: 2.4 },
    ultimate: { sub: 'and the light was enough' },
    requirements: { willpower: 24 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 380, weight: 4, keepDistance: 240 },
    leveling: { perLevel: [mod('damage', 'increased', 0.1), mod('healPower', 'increased', 0.05)] },
    tree: {
      level: 5,
      branches: [
        {
          id: 'dawns_mercy', name: 'Dawn\'s Mercy',
          description: 'Increase healing potency, weaken duration, and cooldown recovery.',
          rungs: [
            { id: 'ld_dawns_mercy', name: 'Dawn\'s Mercy', description: '30% increased healing power.',
              mods: [mod('healPower', 'increased', 0.3)] },
            { id: 'ld_long_light', name: 'The Long Light', description: '40% increased effect duration.',
              mods: [mod('effectDuration', 'increased', 0.4)] },
            { id: 'ld_early_dawn', name: 'Early Dawn', description: '20% increased cooldown recovery.',
              mods: [mod('cooldownRecovery', 'increased', 0.2)] },
          ],
        },
        {
          id: 'dawns_wrath', name: 'Dawn\'s Wrath',
          description: 'Increase shaft count, fire damage, and critical strike chance.',
          rungs: [
            { id: 'ld_dawns_wrath', name: 'Dawn\'s Wrath', description: '+3 radiant shafts.',
              mods: [mod('stormCount', 'flat', 3)] },
            { id: 'ld_white_fire', name: 'White Fire', description: '25% increased damage.',
              mods: [mod('damage', 'increased', 0.25)] },
            { id: 'ld_judgement', name: 'Judgement', description: '+10% critical strike chance and 20% increased damage.',
              mods: [mod('critChance', 'flat', 0.1), mod('damage', 'increased', 0.2)] },
          ],
        },
      ],
      neutral: { id: 'ld_first_light', name: 'First Light', description: '25% reduced mana cost.',
        mods: [mod('manaCost', 'increased', -0.25)] },
    },
  },

  litany_of_dawn_mend: {
    id: 'litany_of_dawn_mend', name: 'Litany of Dawn: the Mending', noDrop: true,
    description: 'Heal all nearby allies for 33% of their maximum life.',
    tags: ['spell', 'heal', 'aoe', 'ultimate'], color: '#f0d890',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 300 },
    effects: [{ type: 'heal', pctMax: 0.33 }],
  },

};

// THE FORM BODIES — the Woken Hollow itself: a gold revenant minted at the
// caster's level through the one createMonster path (the shapeshift press).
// Exported for data/monsters.ts to absorb BEFORE its registry-close folds
// (type-only knowledge of MonsterDef here, so no import cycle: skills.ts
// and monsters.ts both value-import THIS file, never the reverse). The kit
// is three standing, hinted, affordable arts — the anatomy probe's nets
// hold over this def like any other.
export const ULTIMATE_FORMS: Record<string, MonsterDef> = {
  ult_woken_hollow: {
    id: 'ult_woken_hollow', name: 'the Woken Hollow',
    color: '#e8b34a', shape: 'star', radius: 17, material: 'ethereal',
    look: 'spirit', adorn: 'horns',
    base: {
      life: 420, moveSpeed: 160, accuracy: 150, armor: 30,
      energyShield: 120, mana: 200, manaRegen: 12,
    },
    mods: [
      mod('damage', 'increased', 0.35),
      mod('castSpeed', 'increased', 0.2),
      mod('damageTaken', 'more', -0.15),
    ],
    skills: ['cleave', 'ground_slam', 'meteor_storm'],
    xp: 0, // a worn form, never a bounty
    levitates: true, // above the ground's opinion — pits and chasms concede
    noBestiary: true, noNemesis: true,
  },
};
