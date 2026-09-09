// Build-around content composed from the existing legend/proc grammar.
// Kept together so additions need no edits to the engine or older legends.
import type { UniqueDef } from '../../engine/items';
import { skillGrantStat } from '../../engine/skills';
import { procPowerStat, procStat, type ProcDef } from '../procs';

const rimewake = {
  id: 'rimewake_release', name: 'Rimewake', color: '#a8e4ff',
  trigger: 'cast', tags: ['movement'], icd: 2,
  effect: { type: 'cast', cast: { skillId: 'frost_nova', count: [1, 1], at: 'self', own: true } },
} satisfies ProcDef;

const mourningBell = {
  id: 'mourning_bell_toll', name: 'The Mourning Bell', color: '#c6b8df',
  trigger: 'minionDeath', icd: 1.5,
  effect: { type: 'ward', pctMaxLife: 0.08 },
} satisfies ProcDef;

const faultline = {
  id: 'faultline_return', name: 'Faultline', color: '#d8b878',
  trigger: 'collision', icd: 2,
  effect: { type: 'cooldown', fraction: 0.25, tags: ['movement'] },
} satisfies ProcDef;

// The parent catalog registers these rows after the older legend procs.
export const EMERGENT_PROCS: ProcDef[] = [rimewake, mourningBell, faultline];

export const EMERGENT_UNIQUES: UniqueDef[] = [
  {
    id: 'rimewake', name: 'Rimewake', baseId: 'boots_evasion_es', weight: 60, minIlvl: 10,
    flavor: 'Winter followed her until she learned to lead it.',
    lines: [
      { stat: skillGrantStat('frost_nova'), kind: 'flat', range: [1, 2], tierScale: 0.3 },
      { stat: procStat(rimewake.id), kind: 'flat', range: [0.65, 0.85], tierScale: 0,
        text: `{v%} chance on using a movement skill to release your Frost Nova around you (once per ${rimewake.icd}s)` },
      { stat: 'damageVs_chill', kind: 'flat', range: [0.12, 0.2] },
      { stat: 'moveSpeed', kind: 'increased', range: [0.1, 0.16] },
      // A persistent trade, not a penalty that grows without bound at depth.
      { stat: 'fireRes', kind: 'flat', range: [-0.15, -0.1], tierScale: 0 },
    ],
  },
  {
    id: 'mourning_bell', name: 'The Mourning Bell', baseId: 'amulet_bone', weight: 55, minIlvl: 12,
    flavor: 'Each name it forgets becomes another wall around the living.',
    lines: [
      { stat: skillGrantStat('summon_skeleton'), kind: 'flat', range: [1, 2], tierScale: 0.3 },
      { stat: procStat(mourningBell.id), kind: 'flat', range: [0.65, 0.85], tierScale: 0,
        text: `{v%} chance when one of your minions dies to gain ${mourningBell.effect.pctMaxLife * 100}% of your maximum Life as Ward (once per ${mourningBell.icd}s)` },
      // The ordinary proc-power and ward-gain folds both apply; owner life
      // buys the ward. Simultaneous deaths share the proc's per-owner ICD.
      { stat: procPowerStat(mourningBell.id), kind: 'increased', range: [0.2, 0.4],
        text: "{v%} increased Ward from The Mourning Bell" },
      { stat: 'life', kind: 'flat', range: [20, 35] },
      { stat: 'minionDamage', kind: 'increased', range: [-0.15, -0.1], tierScale: 0 },
    ],
  },
  {
    id: 'faultline_grips', name: 'Faultline Grips', baseId: 'gloves_armor', weight: 60, minIlvl: 10,
    flavor: 'The wall gave nothing. He took back the distance.',
    lines: [
      { stat: 'knockback', kind: 'flat', range: [45, 65] },
      { stat: procStat(faultline.id), kind: 'flat', range: [0.65, 0.85], tierScale: 0,
        text: `{v%} chance when your knockback is stopped to remove ${faultline.effect.fraction * 100}% of remaining movement-skill cooldowns (once per ${faultline.icd}s)` },
      { stat: 'shoveAuthority', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'impactDamage', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'attackSpeed', kind: 'increased', range: [-0.1, -0.06], tierScale: 0 },
    ],
  },
];
