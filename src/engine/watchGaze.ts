import type { Actor } from './actor';
import { angleDiff, angleTo } from '../core/math';
import { WATCH_CFG, WATCH_RUNG, watchRungOf, watchValueOf } from './watch';

/** A quiet watch owns its bearing; a post must not reset it between updates.
 * Travel, combat and incapacitation retain their own facing. */
export function watchGazeActive(a: Actor, now: number): boolean {
  if (!a.watch || a.dead || a.downed || a.aiTargetId !== undefined || a.casting || a.aggroed
    || a.postHoming || a.dash || a.leap || a.push || a.mountId !== undefined || !a.canAct()) return false;
  const rung = watchRungOf(watchValueOf(a, a.watch, now));
  return (rung === WATCH_RUNG.unaware && !!a.watch.sweep)
    || (rung === WATCH_RUNG.stir && !!a.watchAt);
}

/** Advance the actual sensing/body direction every simulation frame. The
 * expensive suspicion/scent sweep keeps its slower cadence. A bounded turn
 * also makes entering the watch or returning from a stimulus continuous. */
export function updateWatchGaze(a: Actor, now: number, dt: number): void {
  if (!(dt > 0) || !watchGazeActive(a, now)) return;
  const w = a.watch!;
  const rung = watchRungOf(watchValueOf(a, w, now));
  let want: number;
  if (rung === WATCH_RUNG.unaware && w.sweep) {
    const base = a.aiPostFacing ?? (a.watchBase ??= a.facing);
    const phase = (((a.id * 2654435761) >>> 9) & 1023) / 1023 * Math.PI * 2;
    want = base + Math.sin(now / w.sweep.sec * Math.PI * 2 + phase)
      * (w.sweep.arcDeg * Math.PI / 180) / 2;
  } else {
    want = angleTo(a.pos, a.watchAt!);
  }
  const delta = angleDiff(a.facing, want), step = WATCH_CFG.turnRadSec * dt;
  a.facing += Math.max(-step, Math.min(step, delta));
}
