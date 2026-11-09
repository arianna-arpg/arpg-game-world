import type { LookDef } from '../render/vis/parts';

/** Reuses the part grammar, preserving ranged/melee/caster silhouettes. */
export const SYLVAN_LOOKS: Record<string, LookDef> = {
  sylvan_boneblade: { parts: [
    { kind: 'fronds', params: { n: 5 } }, { kind: 'torso', role: 'wood', scale: .9 },
    { kind: 'pauldrons', role: 'wood', scale: .85 }, { kind: 'sword', scale: 1.2 },
    { kind: 'eyes', params: { spread: .4, dist: .55, size: .09 } },
  ] },
  sylvan_boughbow: { parts: [
    { kind: 'fronds', params: { n: 3 } }, { kind: 'torso', role: 'wood', scale: .75 },
    { kind: 'bow', scale: 1.25 }, { kind: 'eyes', params: { spread: .4, dist: .55, size: .09 } },
  ] },
  sylvan_rootseer: { parts: [
    { kind: 'fronds', params: { n: 7 } }, { kind: 'robe', role: 'wood', scale: .9 },
    { kind: 'staff', scale: 1.3, params: { orb: '#c4ff9a' } },
    { kind: 'halo', scale: 1.1, alpha: .25 }, { kind: 'eyes', params: { spread: .4, dist: .55, size: .09 } },
  ] },
};
