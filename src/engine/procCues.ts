import type { Actor } from './actor';
import type { BuffEffect } from './skills';
import { STATUS_DEFS } from './status';
import { RUNE_INFO, type RuneId } from '../data/invocations';
import { PROC_CUE_CFG, PROC_CUE_STYLES, type ProcCueSpec } from '../data/procCues';

export interface ProcCueRow {
  id: string; profile: string; color: string; count: number; cap: number;
  phase: 'stored' | 'gain' | 'release' | 'pop' | 'invoke';
  /** Remaining fraction of an actual event, never a predicted proc chance. */
  remaining?: number;
}
export interface ProcCuePulse extends ProcCueRow { left: number; total: number; }
export function noteProcPop(a: Actor, spec: ProcCueSpec | false, id: string): void {
  if (spec === false || a.dead) return;
  noteProcCue(a, spec, 'pop', id);
  if (a.procPopEvents.length < PROC_CUE_CFG.pulses) a.procPopEvents.push({ ...spec });
}
export function procCueStyle(profile: string) {
  return PROC_CUE_STYLES[Object.hasOwn(PROC_CUE_STYLES, profile) ? profile : 'physical'];
}
export function buffProcCue(def: BuffEffect): ProcCueSpec | false {
  if (def.storedCue === false) return false;
  if (!def.storedCue && !def.nextHit && !def.consumeOn && !def.consumeOnUse) return false;
  const status = def.nextHit?.status ? STATUS_DEFS[def.nextHit.status] : undefined;
  const typed = Object.keys(def.nextHit?.addedDamage ?? {}).find(t => Object.hasOwn(PROC_CUE_STYLES, t));
  const tagged = def.mods.flatMap(m => m.tags ?? []).find(t => ['fire', 'cold', 'lightning', 'chaos'].includes(t));
  return { profile: status?.dotType ?? status?.element ?? typed ?? tagged ?? 'physical', color: status?.color, ...def.storedCue };
}
/** Called only at resolved state changes. Coalescing bounds repeated multi-hit
 * releases without inventing a countdown or accumulating a visual queue. */
export function noteProcCue(a: Actor, spec: ProcCueSpec | false | undefined,
  phase: ProcCueRow['phase'], id: string, count = 1): void {
  if (spec === false || a.dead || count <= 0) return;
  const profile = spec?.profile ?? 'physical', style = procCueStyle(profile);
  const pulse: ProcCuePulse = { id, profile, color: spec?.color ?? style.color,
    count, cap: count, phase, remaining: 1, left: style.life, total: style.life };
  const old = a.procCuePulses.findIndex(p => p.id === id && p.phase === phase);
  if (old >= 0) a.procCuePulses.splice(old, 1);
  a.procCuePulses.push(pulse);
  if (a.procCuePulses.length > PROC_CUE_CFG.pulses) a.procCuePulses.shift();
}
export function tickProcCues(a: Actor, dt: number): void {
  if (a.dead) { a.procCuePulses.length = 0; a.procPopEvents.length = 0; return; }
  for (let i = a.procCuePulses.length - 1; i >= 0; i--) {
    const p = a.procCuePulses[i]; p.left -= dt;
    if (p.left <= 0) a.procCuePulses.splice(i, 1);
    else p.remaining = p.left / p.total;
  }
}
/** Read-only host state, mirrored for every actor kind. No skill-name cases. */
export function procCueRows(a: Actor): ProcCueRow[] {
  if (a.dead) return [];
  if (a.procCues !== undefined) return a.procCues;
  const rows: ProcCueRow[] = [];
  for (const [id, b] of a.buffs) {
    const spec = buffProcCue(b.def);
    if (spec === false || b.stacks <= 0 || b.remaining <= 0) continue;
    const profile = spec.profile ?? 'physical';
    rows.push({ id, profile, color: spec.color ?? procCueStyle(profile).color,
      count: b.stacks, cap: Math.max(b.stacks, b.def.maxStacks ?? b.def.stacksOnApply ?? 1), phase: 'stored' });
  }
  a.runes.forEach((r, i) => {
    const info = RUNE_INFO[r as RuneId];
    rows.push({ id: 'rune:' + i, profile: 'rune', color: info?.color ?? procCueStyle('rune').color,
      count: 1, cap: 1, phase: 'stored' });
  });
  return [...rows, ...a.procCuePulses.map(({ left, total, ...p }) => ({ ...p }))];
}
