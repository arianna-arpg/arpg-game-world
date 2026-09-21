// Cross-system uniques: a build comes from combining ordinary shared mechanics.
import type { UniqueDef } from '../../engine/items';
import { companionGrantStat } from '../../engine/companionGrants';
import { skillGrantStat } from '../../engine/skills';
import { mod } from '../../engine/stats';
import { procPowerStat, procStat, type ProcDef } from '../procs';

export const CINDER_CONDUCTOR = {
  id: 'cinder_conductor', name: 'Cinder Conductance', color: '#ffad68',
  trigger: 'hit', hitType: 'fire', minionCarry: true, icd: 2,
  effect: { type: 'restore', resource: 'mana', pctMax: 0.03 },
} satisfies ProcDef;

export const BREACH_BELL = {
  id: 'breach_bell', name: 'The Breach Bell', color: '#dfc07e',
  trigger: 'poiseBreakDealt', icd: 8,
  effect: { type: 'cast', cast: { skillId: 'war_cry', count: [1, 1], at: 'self', own: true } },
} satisfies ProcDef;

export const UNSPENT_REPLY = {
  id: 'unspent_reply', name: 'Unspent Reply', color: '#b8cee8',
  trigger: 'block', icd: 3,
  effect: { type: 'buff', buff: {
    type: 'buff', id: 'unspent_reply', label: 'Unspent Reply', duration: 5,
    mods: [mod('manaUseCost', 'more', -1, ['spell']), mod('aoeRadius', 'increased', 0.4, ['spell'])],
    consumeOnUse: { tags: ['spell'] },
  } },
} satisfies ProcDef;

export const ACCORD_PROCS: ProcDef[] = [CINDER_CONDUCTOR, BREACH_BELL, UNSPENT_REPLY];

export const ACCORD_UNIQUES: UniqueDef[] = [
  {
    id: 'cinder_conductor', name: 'The Cinder Conductor', baseId: 'amulet_opal', minIlvl: 16, weight: 45,
    flavor: 'It taught the last coal how to pay for the next flame.',
    lines: [
      { stat: companionGrantStat('summon_fire_golem'), kind: 'flat', range: [1, 2], tierScale: 0.3,
        text: 'A Fire Golem from Level {vf} Summon Fire Golem follows you without a skill slot or Mana Reservation; reforms after death' },
      { stat: procStat(CINDER_CONDUCTOR.id), kind: 'flat', range: [0.65, 0.85], tierScale: 0,
        text: `{v%} chance when you or your minions land a hit dominated by Fire damage to restore ${CINDER_CONDUCTOR.effect.pctMax * 100}% of your maximum Mana (shared ${CINDER_CONDUCTOR.icd}s cooldown)` },
      { stat: procPowerStat(CINDER_CONDUCTOR.id), kind: 'increased', range: [0.2, 0.4],
        text: '{v%} increased Mana restored by Cinder Conductance' },
      { stat: 'minionDamage', kind: 'increased', range: [0.12, 0.2] },
      { stat: 'manaRegen', kind: 'more', range: [-0.25, -0.15], tierScale: 0 },
    ],
  },
  {
    id: 'bell_of_the_breach', name: 'The Bell of the Breach', baseId: 'belt_poise', minIlvl: 12, weight: 55,
    flavor: 'Their walls taught it the note.',
    lines: [
      { stat: skillGrantStat('war_cry'), kind: 'flat', range: [1, 2], tierScale: 0.3 },
      { stat: procStat(BREACH_BELL.id), kind: 'flat', range: [0.7, 0.9], tierScale: 0,
        text: `{v%} chance when your hit breaks an enemy's Poise to trigger your War Cry without using a skill slot (once per ${BREACH_BELL.icd}s)` },
      { stat: 'poiseDamage', kind: 'increased', range: [0.15, 0.25] },
      { stat: 'poise', kind: 'flat', range: [8, 14] },
      { stat: 'moveSpeed', kind: 'more', range: [-0.08, -0.05], tierScale: 0 },
    ],
  },
  {
    id: 'unspent_reply', name: 'The Unspent Reply', baseId: 'gloves_armor_es', minIlvl: 14, weight: 50,
    flavor: 'An answer held behind a closed hand.',
    lines: [
      { stat: procStat(UNSPENT_REPLY.id), kind: 'flat', range: [0.75, 0.9], tierScale: 0,
        text: `{v%} chance on Block to prepare your next Spell for ${UNSPENT_REPLY.effect.buff.duration}s: it costs no Mana and has ${UNSPENT_REPLY.effect.buff.mods[1].value * 100}% increased Area of Effect (one preparation, once per ${UNSPENT_REPLY.icd}s)` },
      { stat: 'blockChance', kind: 'flat', range: [0.04, 0.06], tierScale: 0 },
      { stat: 'energyShield', kind: 'flat', range: [12, 20] },
      { stat: 'manaCost', kind: 'increased', range: [0.15, 0.2], tags: ['spell'], tierScale: 0 },
    ],
  },
];
