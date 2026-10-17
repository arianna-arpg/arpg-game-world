// THE PING (docs/design/shard-world.md card 17 A; dials in data/identityCues.ts
// PING_CUE): the pure half — the mark's shape, its pruning, the off-screen edge
// math the renderer and the probes share. World.placePing is the one writer
// (host-judged: reach, cadence, one standing mark per seat); the snapshot ships
// the live marks; a client expires them on the clock it already follows.

export interface WorldPing {
  /** The seat that set it. */
  seat: string;
  /** Where it stands (world px). */
  pos: { x: number; y: number };
  /** The pinger's story at the press (a mark is SIGHT — drawn across stories). */
  tier: number;
  /** World-clock seconds: set at, stands until. */
  at: number;
  until: number;
}

/** The marks still standing at `now` (a new array; the input is untouched). */
export function prunePings(list: readonly WorldPing[], now: number): WorldPing[] {
  return list.filter(p => p.until > now);
}

/** THE REACH: a point farther than `maxReach` from `from` lands on the reach ring
 *  along the same bearing — clamped, never refused (a mate across the field still
 *  reads the direction). A point within reach is returned as given. */
export function clampPingReach(from: { x: number; y: number }, to: { x: number; y: number }, maxReach: number): { x: number; y: number } {
  const dx = to.x - from.x, dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (!(d > maxReach) || d === 0) return { x: to.x, y: to.y };
  const k = maxReach / d;
  return { x: from.x + dx * k, y: from.y + dy * k };
}

export interface PingEdgePoint { x: number; y: number; ang: number }

/** Where an OFF-SCREEN mark's chevron sits: on the view rect inset by `pad`
 *  (world px), along the ray from the view's centre to the mark, facing it.
 *  Null while the mark stands inside the inset view (the mark itself is drawn). */
export function pingEdgePoint(view: { x: number; y: number; w: number; h: number }, pos: { x: number; y: number }, pad: number): PingEdgePoint | null {
  const x0 = view.x + pad, y0 = view.y + pad, x1 = view.x + view.w - pad, y1 = view.y + view.h - pad;
  if (x1 <= x0 || y1 <= y0) return null;
  if (pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1) return null;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const dx = pos.x - cx, dy = pos.y - cy;
  const ang = Math.atan2(dy, dx);
  // The ray from the centre meets the inset rect where the larger normalized
  // component reaches its half-extent.
  const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  const sx = dx === 0 ? Infinity : hw / Math.abs(dx), sy = dy === 0 ? Infinity : hh / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s, ang };
}
