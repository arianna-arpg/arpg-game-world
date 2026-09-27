import type { Actor } from './actor';
import type { ReserveStage } from './reserves';
import { poolReadOf, poolVentRead } from './skills';
import { COMBAT_CUE_STYLES } from '../data/combatCues';
import { POOL_VENT_CUES, type PoolVentStyle } from '../data/reserveCues';

export function reserveStageCue(stage: ReserveStage): string | undefined {
  if (stage.cue === false) return undefined;
  const key = stage.cue ?? 'reserve_spent';
  return Object.hasOwn(COMBAT_CUE_STYLES, key) ? key : 'reserve_spent';
}
export interface PoolCueRow {
  id: string; skillId: string; color: string; profile: string | false;
  banked: number; min: number; cap: number; venting: boolean;
  radius: number; rate: number;
}
export function poolVentStyle(profile: string | false): PoolVentStyle | undefined {
  if (profile === false) return undefined;
  return Object.hasOwn(POOL_VENT_CUES, profile) ? POOL_VENT_CUES[profile] : POOL_VENT_CUES.mist;
}
/** Host-derived resource/footprint read. Duplicate pool ids use the same first
 * equipped skill as updateVents; no duplicated visual or damage authority. */
export function poolCueRows(a: Actor): PoolCueRow[] {
  // Existing vents keep ticking on a downed owner; the visible hazard must too.
  if (a.dead) return [];
  if (a.poolCues) return a.poolCues;
  const rows: PoolCueRow[] = [];
  for (const inst of a.skills) {
    if (!inst?.def.pool) continue;
    const read = poolReadOf(a, inst)!;
    const first = a.skills.find(s => s?.def.pool?.id === read.spec.id)!;
    const vent = poolVentRead(a, first);
    rows.push({ id: read.spec.id, skillId: inst.def.id, color: first.def.color,
      profile: first.def.pool!.ventCue ?? 'mist', banked: read.banked, min: read.min, cap: read.cap,
      venting: read.venting && read.banked > 0 && !!vent && vent.rate > 0,
      radius: vent?.radius ?? 0, rate: vent?.rate ?? 0 });
  }
  return rows;
}
