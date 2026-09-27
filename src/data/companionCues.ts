import type { EmergeSpec } from '../engine/emerge';

export interface CompanionCueSpec { profile?: string; color?: string; }
export type RecoveryCueKind = 'revive' | 'undying' | 'arrive';
/** These motions never grant a new hold or invulnerability window. */
export type RecoveryCueSpec = Omit<EmergeSpec, 'hold'>;
export interface FieldCueSpec { color?: string; form?: string; release?: string; }
export const COMPANION_CUE_STYLES: Record<string, { color: string; shape: 'collar' | 'chain' | 'hunt' | 'guard' | 'heel' }> = {
  bond: { color: '#afd7aa', shape: 'collar' },
  thrall: { color: '#e4ca85', shape: 'chain' },
  mend: { color: '#7eddb4', shape: 'collar' },
  hunt: { color: '#dc956f', shape: 'hunt' },
  guard: { color: '#dec16e', shape: 'guard' },
  heel: { color: '#abc5e9', shape: 'heel' },
};
export const RECOVERY_CUES: Record<RecoveryCueKind, RecoveryCueSpec> = {
  revive: { motion: 'stir', life: 0.5, grains: [3, 5], voice: false },
  undying: { motion: 'rise', ground: 'ash', life: 0.65, grains: [5, 8], voice: false },
  arrive: { motion: 'condense', ground: 'light', life: 0.55, grains: [6, 9], voice: false },
};
export const COMPANION_CUE_CFG = {
  outline: '#151b24', links: 32, linkAlpha: 0.22, width: 1.4, bodyPad: 5,
  markRadius: 14, eventPad: 10,
};
