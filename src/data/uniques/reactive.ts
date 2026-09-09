import type { UniqueDef, RangedLineDef } from '../../engine/items';
import type { UniqueChoiceGroup } from '../../engine/itemchoices';
import { BAR_SLOTS, slotGraftStat } from '../../engine/skills';
import { registerStatusRelay, relayStatusStat, takenAsStat } from '../../engine/reception';
import { registerSympathyLink } from '../../engine/sympathy';
import { SUPPORT_LIST } from '../supports';
import { type ProcDef, procStat } from '../procs';

registerStatusRelay({ id: 'grounding', status: 'shock', radius: 260, name: 'Grounding Relay' });
const discharge = { id: 'lattice_discharge', name: 'Lattice Discharge', color: '#aee8ff',
  trigger: 'struck', receivedTypes: ['lightning'], icd: 1.5,
  effect: { type: 'cast', cast: { skillId: 'lattice_discharge', count: [1, 1], at: 'self' } },
} satisfies ProcDef;
const twister = { id: 'galewright_twister', name: 'Galewright Twister', color: '#b8dfd5',
  trigger: 'pulse', every: 4,
  effect: { type: 'cast', cast: { skillId: 'galewright_twister', count: [1, 1], at: 'self' } },
} satisfies ProcDef;
const cinderAnswer = { id: 'cinder_answer', name: 'A Coal Remembered', color: '#ff925c',
  trigger: 'struck', receivedTypes: ['fire'], icd: 2,
  effect: { type: 'ward', pctMaxLife: 0.05 },
} satisfies ProcDef;
export const REACTIVE_PROCS: ProcDef[] = [discharge, twister, cinderAnswer];

export const LATTICE_LINES: RangedLineDef[] = [
  { stat: relayStatusStat('grounding'), kind: 'flat', range: [1, 1], tierScale: 0,
    text: 'Incoming Shock transfers to the nearest enemy within 260 instead (without a recipient, Shock remains)' },
  { stat: procStat(discharge.id), kind: 'flat', range: [0.3, 0.45], tierScale: 0,
    text: `When struck by Lightning damage: {v%} chance to expel a Shock nova (once per ${discharge.icd}s)` },
];
export const GALEWRIGHT_LINES: RangedLineDef[] = [
  { stat: procStat(twister.id), kind: 'flat', range: [1, 1], tierScale: 0,
    text: `Every ${twister.every}s, attempts to release a short-lived twister that rebounds from walls and enemies` },
];

// All full minions, excluding companions already reached by the stronger bond.
registerSympathyLink({ id: 'cup_minion_flask', label: 'the lesser cup',
  channels: ['restore', 'buff'], tags: ['flask'], to: ['minions'], scale: 1, cap: Infinity });
registerSympathyLink({ id: 'cup_minion_orb', label: 'the lesser cup',
  channels: ['orb'], to: ['minions'], scale: 1, cap: Infinity });
export const CUP_MINION_LINES: RangedLineDef[] = [
  { stat: 'sympathy_cup_minion_flask', kind: 'flat', range: [0.2, 0.3],
    text: 'Flask pours echo to all your non-companion minions at {v}× strength' },
  { stat: 'sympathy_cup_minion_orb', kind: 'flat', range: [0.2, 0.3],
    text: 'Orbs echo to all your non-companion minions at {v}× strength' },
];

// The same positively weighted support catalog as ordinary graft affixes.
// Each finger selects a different support, then its own random bar seat.
const grafts = SUPPORT_LIST.filter(g => g.weight > 0).flatMap(g =>
  Array.from({ length: BAR_SLOTS }, (_, i) => ({ id: `${i + 1}:${g.id}`, exclusiveKey: g.id,
    weight: g.weight / BAR_SLOTS, lines: [{ stat: slotGraftStat(i + 1, g.id), kind: 'flat' as const,
      range: [1, 1] as [number, number], tierScale: 0,
      text: `The skill in Skill Slot ${i + 1} is granted Level {v} ${g.name}` }] })));
const mass = grafts.reduce((n, g) => n + g.weight, 0);
export const ROTE_CHOICES: UniqueChoiceGroup[] = Array.from({ length: 4 }, (_, i) => ({
  id: `finger_${i + 1}`, uniqueBy: 'finger_support', options: i === 0 ? grafts
    : [...grafts, { id: 'bare', weight: mass * 0.35, lines: [] }],
}));

export const REACTIVE_UNIQUES: UniqueDef[] = [
  { id: 'storm_tithe', name: 'The Storm Tithe', baseId: 'belt_endurance', minIlvl: 12, weight: 55,
    flavor: 'Every wound pays the sky its portion.', lines: [
      { stat: takenAsStat('physical', 'lightning'), kind: 'flat', range: [0.2, 0.3], tierScale: 0 },
      { stat: 'lightningRes', kind: 'flat', range: [0.15, 0.25], tierScale: 0 },
      { stat: 'damage', kind: 'increased', range: [0.15, 0.25], tags: ['lightning'] },
      { stat: 'coldRes', kind: 'flat', range: [-0.15, -0.1], tierScale: 0 },
    ] },
  { id: 'coal_remembered', name: 'A Coal Remembered', baseId: 'ring_ruby', minIlvl: 10, weight: 55,
    flavor: 'The hearth remembers every stone thrown into it.', lines: [
      { stat: takenAsStat('cold', 'fire'), kind: 'flat', range: [0.2, 0.3], tierScale: 0 },
      { stat: procStat(cinderAnswer.id), kind: 'flat', range: [0.4, 0.6], tierScale: 0,
        text: `When struck by Fire damage: {v%} chance to gain 5% of maximum Life as Ward (once per ${cinderAnswer.icd}s)` },
      { stat: 'fireRes', kind: 'flat', range: [0.12, 0.2], tierScale: 0 },
      { stat: 'mana', kind: 'increased', range: [-0.15, -0.1], tierScale: 0 },
    ] },
];
