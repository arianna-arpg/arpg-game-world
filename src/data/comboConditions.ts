import type { ConditionId } from '../engine/stats';

/** Labels attach to native conditions, independent of who grants their modifiers. */
export const COMBO_CONDITION_READOUTS = [
  { id: 'comboVaried', label: 'Varied casts', pattern: 'vary', color: '#99cfe9' },
  { id: 'comboRepeated', label: 'Repeated casts', pattern: 'repeat', color: '#edc28d' },
] as const satisfies readonly { id: ConditionId; label: string; pattern: 'vary' | 'repeat'; color: string }[];

export const COMBO_CONDITION_HUD = {
  width: 244, row: 20, height: 17, gap: 20, font: '11px Verdana',
  background: 'rgba(9,13,20,0.88)', inactive: '#aab2bf',
} as const;
