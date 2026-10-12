/** Exact native station dwell state, shared by real retained local gates. */
import type {Seat} from './world';
import {clamp} from '../core/math';
export class NativeSceneDwell {
  private t = 0;
  private consumed = false;
  /** World seconds when the latch last fired (or was consumed) — THE SHIMMY
   *  LAW's reference: a willed step taken AFTER this re-arms it. */
  private consumedAt = -Infinity;
  constructor(private readonly clock: () => number) {}
  fire(building: boolean, engaged: boolean, dt: number, threshold: number): boolean {
    if (!engaged) { this.t = 0; this.consumed = false; return false; }
    if (this.consumed || !building) { this.t = 0; return false; }
    this.t += dt;
    if (this.t < threshold) return false;
    this.consumed = true;
    this.consumedAt = this.clock();
    return true;
  }
  /** Force the latch CONSUMED (as if it just fired): the caller placed the
   *  player INSIDE the dwell radius (a sail landing drops you at the dock) and
   *  the gate must not re-fire until they break the dwell by stepping away —
   *  or, THE SHIMMY LAW, take a willed step where they stand. */
  consume(): void { this.consumed = true; this.consumedAt = this.clock(); }
  /** THE SHIMMY LAW (2026-09-11, her ask): a GENUINE step — Seat.lastMovedAt,
   *  stamped only by moveActor's willed movement, never a shove, a gale or a
   *  ride — taken AFTER the latch fired re-arms it while the seat still
   *  stands in range, so a dialog closed by mistake re-opens on the next
   *  still linger without walking out of range and back. The linger itself
   *  is unchanged: the step must END (seatIdle) before the clock builds.
   *  True when it re-armed (the station latches re-add their key on it). */
  rearmIfWilled(seats: readonly Seat[]): boolean {
    if (!this.consumed || !seats.some(s => s.lastMovedAt > this.consumedAt)) return false;
    this.consumed = false;
    this.t = 0;
    return true;
  }
  /** THE DWELL TELL's read: how far the linger has built toward `threshold`
   *  (0..1) — 0 while spent, so a fired latch's ring empties at once. */
  frac(threshold: number): number {
    return this.consumed ? 0 : clamp(this.t / Math.max(0.01, threshold), 0, 1);
  }
}
export type NativeDwell=Pick<NativeSceneDwell,'fire'|'consume'|'rearmIfWilled'|'frac'>;
