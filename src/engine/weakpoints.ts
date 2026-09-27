import type { Actor } from './actor';
import { STATUS_DEFS } from './status';
import { ANATOMY_CUE_STYLES, type AnatomyCueSpec } from '../data/anatomyCues';

export interface WeakPointWindow {
  lo: number; hi: number; bonus: number; active: boolean;
  profile: string; color: string;
}
export function anatomyMaterial(spec: AnatomyCueSpec | undefined, fallback: string) {
  const profile = spec?.profile && Object.hasOwn(ANATOMY_CUE_STYLES, spec.profile) ? spec.profile : fallback;
  return { profile, color: spec?.color ?? ANATOMY_CUE_STYLES[profile].color };
}
/** The stamped health interval stays fixed when life changes or a mark refreshes.
 * Pure reads: damage previews must not consume a status, roll dice or write stats. */
export function weakPointBonus(a: Actor): number {
  if (a.dead) return 0;
  const frac = a.life / Math.max(1, a.maxLife());
  let bonus = 0;
  for (const s of a.statuses) {
    if (s.remaining <= 0 || !s.window || frac < s.window.lo || frac > s.window.hi) continue;
    bonus = Math.max(bonus, STATUS_DEFS[s.id]?.weakSpot?.bonus ?? 0);
  }
  return bonus;
}
export function weakPointWindows(a: Actor): WeakPointWindow[] {
  if (a.dead) return [];
  const frac = a.life / Math.max(1, a.maxLife());
  return a.statuses.flatMap(s => {
    const spec = STATUS_DEFS[s.id]?.weakSpot;
    if (!s.window || !spec || spec.cue === false || s.remaining <= 0 || frac < s.window.lo) return [];
    return [{ ...s.window, bonus: spec.bonus, active: frac <= s.window.hi,
      ...anatomyMaterial(spec.cue, 'weakness') }];
  });
}
/** One authoritative retirement point for spent windows. Expiry/cleanse never
 * creates a false shatter. Also used on death so a lethal crossing leaves a cue. */
export function takeWeakPointBreaks(a: Actor): WeakPointWindow[] {
  const frac = a.life / Math.max(1, a.maxLife()), out: WeakPointWindow[] = [];
  for (let i = a.statuses.length - 1; i >= 0; i--) {
    const s = a.statuses[i];
    if (!s.window || frac >= s.window.lo) continue;
    a.statuses.splice(i, 1);
    if (!a.statuses.some(o => o.id === s.id)) a.sheet.removeSource('status:' + s.id);
    const spec = STATUS_DEFS[s.id]?.weakSpot;
    if (spec && spec.cue !== false && s.remaining > 0) out.push({ ...s.window, bonus: spec.bonus,
      active: false, ...anatomyMaterial(spec.cue, 'weakness') });
  }
  return out;
}
