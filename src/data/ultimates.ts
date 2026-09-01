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
    description: 'Still the world and read its endings: time stops for everything but you while'
      + ' a storm of dimensional cuts falls on every enemy near your mark, each with a 50%'
      + ' chance to leave them bleeding. When the world remembers how to move, it has already'
      + ' been parted.',
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
    description: 'Collapse a dead star into being at the target point: for 3 seconds its grip'
      + ' reaches far past the light, dragging everything toward the heart and crushing what'
      + ' arrives — and when the well closes, it lets go of the world all at once.',
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
    description: 'The star lets go: one crushing burst where the well stood, flinging free'
      + ' whatever it had gathered.',
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
    description: 'Stop carrying what you are, and WEAR it: for 14 seconds the hollow stands up'
      + ' in your place — faster, heavier-handed, and above the ground\'s opinion of you.'
      + ' Press again to be only yourself.',
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
    description: 'Every death near you is a coin in a purse only you can spend. At thirty souls'
      + ' — the worthy count for three — the ground gives up its tenants: eight of the dead'
      + ' rise at your mark for 22 seconds, twelve at most. The purse takes nothing for'
      + ' twelve seconds after you spend it.',
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
    },
    ultimate: { sub: 'they were never asleep' },
    requirements: { willpower: 24 },
    minDropLevel: 12, dropWeight: 8,
    ai: { range: 400, weight: 4, keepDistance: 260 },
    leveling: { perLevel: [mod('minionLife', 'increased', 0.12), mod('minionDamage', 'increased', 0.1)] },
  },

  doom_bell: {
    id: 'doom_bell', name: 'Doom Bell',
    description: 'Ring the one bell that answers every debt at once: a physical shockwave 400'
      + ' units wide that stuns everything it reaches, throws it back, and rings louder the'
      + ' more stand inside it.',
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
    description: 'Usable only below half life: read your own rites aloud. Mend 40% of your'
      + ' maximum life, deal 35% more damage for 6 seconds, and a breath later the toll'
      + ' lands — a physical burst that stuns whatever thought it was winning.',
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
    description: 'The toll lands: a burst around the reader that stuns what it reaches.',
    tags: ['spell', 'aoe', 'physical', 'ultimate'], color: '#b84a4a',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [50, 80] },
    delivery: { type: 'nova', radius: 240 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'stun', chance: 1 }],
    leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  },

  stormcrown: {
    id: 'stormcrown', name: 'Stormcrown',
    description: 'Crown the sky and let it rule: 24 bolts fall across 300 units for four'
      + ' seconds, each with a 60% chance to shock. The storm is weather, not a duel — it'
      + ' spares no one under it: friend, foe, or you.',
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
    description: 'Spend five Wisps — one gathers every four seconds while you carry this — to'
      + ' fall silent: 240 points of absorption for 5 seconds, half of all damage turned'
      + ' aside for 4, a fifth of your life mended, and a quickened step to leave with.'
      + ' Nothing reaches you here.',
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
    description: 'Every kill you land is a coin; at eight the toll rings — a burst of chaos 170'
      + ' units wide around you. The purse takes nothing for four seconds after it rings.'
      + ' The faster you kill, the more often it rings.',
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
