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
