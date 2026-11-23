// ---------------------------------------------------------------------------
// Shared types & builders for Hollow Wake's multi-pass passive expansion.
// ---------------------------------------------------------------------------

import {
  mod as m,
  type ConditionId,
  type Modifier,
  type SkillTag,
} from '../engine/stats';
import { registerProc, type ProcDef } from './procs';

export type ExpansionShape = 'diamond' | 'fork' | 'tiered' | 'keystoneTail' | 'dualNotableKeystone' | 'splitKeystone' | 'sideWing';
export type ExpansionKind = 'small' | 'notable' | 'keystone';
export type ExpansionPass = 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;

export interface ExpansionNodeSpec {
  /** Suffix appended to `${cluster.id}_` (or '' for the primary capstone). */
  suffix: string;
  name: string;
  description: string;
  kind: ExpansionKind;
  mods: Modifier[];
}

export interface ExpansionCluster {
  id: string;
  /** Target wedge attribute ID ('int'|'cha'|'dex'|'str'|'for'|'prw'|'fin'|'wil'|'wis'). */
  wedge: 'int' | 'cha' | 'dex' | 'str' | 'for' | 'prw' | 'fin' | 'wil' | 'wis';
  /** Branch theme key in passiveNodeThemes.ts. */
  theme: string;
  shape: ExpansionShape;
  /** Expansion pass provenance (1 = Core Expansion, 2 = Genre Archetypes, 3 = Cult ARPG Mechanics, 4 = Tag Rhythms, 5 = Cross-Mechanic Bridges). */
  pass?: ExpansionPass;
  nodes: ExpansionNodeSpec[];
}

export const EXPANSION_PROCS: ProcDef[] = [];

export const n = (
  suffix: string,
  kind: ExpansionKind,
  name: string,
  description: string,
  ...mods: Modifier[]
): ExpansionNodeSpec => ({ suffix, kind, name, description, mods });

export const unlessMod = (
  stat: string,
  kind: Modifier['kind'],
  value: number,
  unless: ConditionId,
  tags?: SkillTag[],
): Modifier => ({ stat, kind, value, unless, ...(tags ? { tags } : {}) });

export function procNode(
  suffix: string,
  kind: ExpansionKind,
  procId: string,
  name: string,
  description: string,
  color: string,
  def: Omit<ProcDef, 'id' | 'name' | 'color'>,
  ...mods: Modifier[]
): ExpansionNodeSpec {
  const proc: ProcDef = { id: `exp_${procId}`, name, color, ...def };
  registerProc(proc);
  EXPANSION_PROCS.push(proc);
  return { suffix, kind, name, description, mods: [m(`proc_${proc.id}`, 'flat', 1), ...mods] };
}
