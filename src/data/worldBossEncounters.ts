import type { MonsterDef } from './monsters';
import type { SkillDef } from '../engine/skills';
import type { AIAction, BrainDef, PhaseDef } from '../engine/brain';
import type { AttackPattern } from '../engine/attackPatterns';
import type { LookDef } from '../render/vis/parts';
import { mod, type Modifier, type SkillTag } from '../engine/stats';

/** Colossi compose the same warning, skill, part and phase grammar as any
 * creature. Coordinates are world pixels; +x is forward at the warning.
 * Nothing here tracks the player after the marks have appeared. */
export const WORLDBOSS_ENCOUNTER_PATTERNS = {
  leftHand: { points: [180, 340, 500].map((x, i) => ({ x, y: -175, after: i * 0.22 })),
    radius: 88, delay: 1.8 },
  rightHand: { points: [180, 340, 500].map((x, i) => ({ x, y: 175, after: i * 0.22 })),
    radius: 88, delay: 1.8 },
  crownfall: { points: [{ x: 0, y: 0 }], radius: 92, delay: 2 },
  fault: { points: [180, 340, 500, 660].flatMap((x, i) =>
    [-155, 155].map(y => ({ x, y, after: i * 0.24 }))), radius: 64, delay: 1.7 },
  venom: { points: [{ x: 0, y: 0 }], radius: 80, delay: 1.8, linger: 3, tickInterval: 1 },
  upheaval: { points: Array.from({ length: 10 }, (_, i) => {
    const a = i * Math.PI * 2 / 10;
    return { x: Math.cos(a) * 290, y: Math.sin(a) * 290 };
  }), radius: 66, delay: 2.1 },
} satisfies Record<string, AttackPattern>;

const art = (id: string, name: string, color: string, damage: SkillDef['baseDamage'],
  description: string): SkillDef => ({
  id, name, color, description, noDrop: true,
  tags: ['spell', 'aoe', ...Object.keys(damage ?? {}) as SkillTag[]],
  manaCost: 0, cooldown: 5, useTime: 0.8, baseDamage: damage,
  effects: [{ type: 'damage' }],
  delivery: { type: 'ground', radius: 80, castRange: 1000, delay: 1.8 },
  ai: { range: 900, weight: 1 },
});

export const WORLDBOSS_ENCOUNTER_SKILLS: Record<string, SkillDef> = {
  primeval_left_hand: art('primeval_left_hand', 'Mountain Hand', '#c6a67a', { physical: [18, 24] },
    'The left fist breaks a flank in three impacts. Break that fist to cancel its marks.'),
  primeval_right_hand: art('primeval_right_hand', 'Valley Hand', '#aabdce', { physical: [18, 24] },
    'The right fist breaks the opposite flank. The central approach stays open.'),
  primeval_crownfall: art('primeval_crownfall', 'Crownfall', '#e2c596', { physical: [22, 29] },
    'A piece of the mountain marks your position. Move before it lands; the mark never follows.'),
  primeval_fault: art('primeval_fault', 'Sundered Earth', '#c5c28b', { physical: [16, 22] },
    'Two fissures race forward, leaving an open seam between them.'),
  primeval_venom_well: art('primeval_venom_well', 'Primeval Seep', '#9fe07a', { chaos: [8, 12] },
    'Venom wells up at a marked position, then dries. Break the Sunder-Maw to silence it.'),
  primeval_upheaval: art('primeval_upheaval', 'Continental Heave', '#beab85', { physical: [20, 27] },
    'A broken ring of earth erupts around the colossus. Stay close or cross between the marks.'),
};

const mark = (skill: string, pattern: AttackPattern,
  at: 'self' | 'target' = 'self'): AIAction =>
  ({ do: 'attackPattern', skill, pattern, at, bearing: 'actor' });

/** Reusable attack/recovery cycle authoring. Health transitions happen at
 * the end of recovery, so burst damage cannot skip the promised opening.
 * Cycles never pay entry rewards: re-entering cannot mint infinite gems. */
function cycle(id: string, actions: AIAction[], options: {
  warning: string; attackFor: number; recoveryFor: number; exposure: number;
  planted?: boolean; walkFor?: number;
  next?: { id: string; life: number }; mods?: Modifier[];
}): PhaseDef[] {
  return [
    { id, announce: options.warning,
      use: options.planted === false ? undefined : { move: { style: 'hold' } },
      mods: options.mods, onEnter: actions,
      goto: [{ to: `${id}_open`, after: options.attackFor }] },
    { id: `${id}_open`, announce: 'Exposed',
      use: { move: { style: 'hold' } },
      mods: [...(options.mods ?? []), mod('damageTaken', 'increased', options.exposure)],
      goto: [
        ...(options.next ? [{ to: options.next.id, atLifeFrac: options.next.life, after: options.recoveryFor }] : []),
        { to: `${id}_walk`, after: options.recoveryFor },
      ] },
    { id: `${id}_walk`, mods: options.mods,
      goto: [{ to: id, after: options.walkFor ?? 3 }] },
  ];
}

const P = WORLDBOSS_ENCOUNTER_PATTERNS;
export const WORLDBOSS_WYRM_BRAIN: BrainDef = {
  type: 'juggernaut',
  script: [
    ...cycle('coiled', [mark('primeval_fault', P.fault), mark('primeval_venom_well', P.venom, 'target')], {
      warning: 'Sundered Earth',
      attackFor: 5.2, recoveryFor: 3, exposure: 0.2, next: { id: 'thrash', life: 0.62 },
      planted: false, walkFor: 6,
    }),
    ...cycle('thrash', [mark('primeval_upheaval', P.upheaval), mark('primeval_venom_well', P.venom, 'target')], {
      warning: 'Continental Heave',
      attackFor: 5.2, recoveryFor: 3.5, exposure: 0.3, next: { id: 'fury', life: 0.28 },
      planted: false, walkFor: 6,
      mods: [mod('damage', 'more', 0.15)],
    }),
    ...cycle('fury', [mark('primeval_fault', P.fault), mark('primeval_upheaval', P.upheaval)], {
      warning: 'Worldrend',
      attackFor: 3.2, recoveryFor: 3, exposure: 0.35,
      planted: false, walkFor: 6,
      mods: [mod('damage', 'more', 0.25)],
    }),
  ],
  rules: [{ when: { lifeBelow: 0.28 }, once: true,
    announce: 'Broodcall',
    actions: [{ do: 'summon', monster: 'primeval_spawn', count: 5, ring: 320, tag: 'wyrm_brood' }] }],
};

export const WORLDBOSS_ENCOUNTER_MONSTERS: Record<string, MonsterDef> = {
  primeval_cragmaw: {
    id: 'primeval_cragmaw', name: 'Cragmaw, the Orogeny',
    color: '#b0916a', shape: 'octagon', radius: 100, material: 'stone', look: 'primeval_orogen',
    base: { life: 1050, moveSpeed: 38, accuracy: 125, armor: 85, mana: 220, manaRegen: 12, weight: 18 },
    mods: [mod('fireRes', 'flat', 0.3), mod('coldRes', 'flat', 0.3), mod('damage', 'increased', 0.4)],
    skills: [], xp: 780, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.8, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 0.55,
    rampage: true, scaling: { life: { incPerLevel: 0.15 } },
    parts: [
      { monster: 'primeval_cragmaw_fist', dx: 0.8, dy: -1.5, lifeFrac: 0.22, breakDamage: 0.1,
        breakDisables: ['primeval_left_hand'], breakMods: [mod('damageTaken', 'increased', 0.1)] },
      { monster: 'primeval_cragmaw_fist', dx: 0.8, dy: 1.5, lifeFrac: 0.22, breakDamage: 0.1,
        breakDisables: ['primeval_right_hand'], breakMods: [mod('damageTaken', 'increased', 0.1)] },
    ],
    brain: { type: 'juggernaut', script: [
      ...cycle('mountain', [mark('primeval_left_hand', P.leftHand), mark('primeval_right_hand', P.rightHand)], {
        warning: 'Mountain Hands',
        attackFor: 3, recoveryFor: 3.5, exposure: 0.25, next: { id: 'barrage', life: 0.55 },
      }),
      ...cycle('barrage', [mark('primeval_left_hand', P.leftHand), mark('primeval_right_hand', P.rightHand),
        mark('primeval_crownfall', P.crownfall, 'target')], {
        warning: 'Crownfall',
        attackFor: 3, recoveryFor: 3.5, exposure: 0.3, next: { id: 'landslide', life: 0.22 },
        mods: [mod('damage', 'more', 0.15)],
      }),
      ...cycle('landslide', [mark('primeval_left_hand', P.leftHand), mark('primeval_right_hand', P.rightHand),
        mark('primeval_upheaval', P.upheaval)], {
        warning: 'Orogeny',
        attackFor: 3, recoveryFor: 4, exposure: 0.4,
        mods: [mod('damage', 'more', 0.25)],
      }),
    ] },
  },
  primeval_cragmaw_fist: {
    id: 'primeval_cragmaw_fist', name: 'Orogen Fist',
    color: '#9a7c56', shape: 'octagon', radius: 44, material: 'stone', look: 'primeval_orogen_fist',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 130, moveSpeed: 0, mana: 0, poise: 100, weight: 12 },
    skills: [], xp: 0,
  },
};

export const WORLDBOSS_ENCOUNTER_LOOKS: Record<string, LookDef> = {
  primeval_orogen: { parts: [
    { kind: 'blob', scale: 1, params: { irr: 0.15, seed: 817 } },
    { kind: 'sinterPlates', role: 'base', scale: 1, params: { n: 6 } },
    { kind: 'stalactites', x: -0.35, scale: 0.85, role: 'base', params: { n: 5 } },
    { kind: 'mossPatch', x: -0.2, scale: 0.7, color: '#66704e', alpha: 0.6 },
    { kind: 'lavaCracks', scale: 0.8, color: '#d5b777', alpha: 0.55 },
    { kind: 'runes', scale: 0.45, color: '#e6c982', params: { n: 3 } },
    { kind: 'eyes', color: '#ffda85', params: { spread: 0.3, dist: 0.6, size: 0.08 } },
  ], shadowScale: 1.45 },
  primeval_orogen_fist: { parts: [
    { kind: 'blob', params: { irr: 0.12, seed: 819 } },
    { kind: 'sinterPlates', role: 'base', scale: 0.95, params: { n: 3 } },
    { kind: 'runes', scale: 0.55, color: '#e6c982', params: { n: 2 } },
  ] },
};
