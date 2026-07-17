// ============================================================================
// THE SEGMENT FABRIC — multi-segment bodies as data (docs/engine/segments.md)
//
// A worm/snake body has always been ONE actor (the head) trailing a chain of
// render-only positions (WormBody). This module is the opt-in upgrade that
// makes those trailing segments REAL: each one a hittable body whose hit
// circle IS its drawn circle — the hit-surface doctrine (docs/engine/
// hit-surfaces.md) carried onto creatures. Everything routes through the two
// geometry resolvers below so the renderer and every hit test consume the
// SAME radii — drawn and tested can never disagree.
//
// The contracts (why segments are NOT separate actors):
//   - ONE creature: one kill, one nameplate, one boss bar, one loot/xp
//     attribution, one entry in every objective count — all by construction,
//     because the segment chain never leaves its actor.
//   - LIFE MODEL: the pool is SHARED — a blow landed on any segment feeds the
//     one life bar (the target of resolveHit is the actor; the segment is
//     WHERE the blow landed, never a damage multiplier — an AoE overlapping
//     five coils is still one hit on one creature). Per-segment WOUND states
//     layer on top: each segment carries a wound pool (frac × root max life);
//     draining it TEARS the segment — a permanent visual state, an optional
//     stack of mods laid on the root per wound (rewarding spread damage), and
//     a shrunken hit circle (the torn mass draws smaller, so it tests
//     smaller — honesty again).
//   - Pieces that must independently DIE are the PARTS fabric's job
//     (MonsterPartDef — real anchored actors with break effects); the two
//     compose (a segmented root may still field parts).
//
// THE DRIVE SEAM (the walking-colossus coordination point): segment
// POSITIONS are written by a drive. 'trail' — serpentine trail-the-head
// (World.updateWorms) — is the stock drive. An articulated limb-chain /
// gait drive (the Iron Bell walker) slots in as a new WormSpec.drive kind
// writing the same segments[] array; everything below (hit tests, wounds,
// feedback, wire, renderer) is drive-agnostic and inherits it for free.
// Rigid anchored limbs can instead ride the PARTS fabric — pick per creature.
//
// Absent spec = the legacy render-only trail, byte-identical.
// ============================================================================

import { dist, type Vec2 } from '../core/math';
import type { Actor, WormBody } from './actor';

/** Fabric dials — modular thresholds, never literals at call sites. */
export const SEG_CFG = {
  /** Per-segment hit-feedback flash, seconds (mirrors Actor.hitFlash). */
  flashTime: 0.15,
  /** A TORN segment's drawn+tested radius fraction — the wound reads at a
   *  glance and the hit surface honestly shrinks with the drawing. */
  woundRadiusMult: 0.8,
  /** Torn-segment alpha (the renderer dims what was carved away). */
  woundAlpha: 0.85,
  /** Contact index sentinel for the head body. */
  HEAD: -1,
} as const;

/** Do this actor's trailing segments take hits? (The opt-in gate every
 *  consumer asks — false/absent keeps the legacy render-only trail.) */
export function segsHittable(a: Actor): boolean {
  return !!a.worm?.hittable && !a.dead;
}

/** THE RADIUS LAW — drawn segment i (0-based, head-adjacent first) shrinks
 *  by taper each step back; a torn segment shrinks further. The renderer
 *  draws THIS circle and every hit test tests THIS circle. */
export function segR(a: Actor, i: number): number {
  const w = a.worm!;
  const base = a.radius * Math.pow(w.taper, i + 1);
  return w.wounded?.[i] ? base * SEG_CFG.woundRadiusMult : base;
}

/** One hittable body of a creature: the head (seg = HEAD) or a segment. */
export interface SegBody { pos: Vec2; r: number; seg: number; }

/** Every hittable body, head first. Legacy worms (and every plain monster)
 *  yield only the head — callers stay byte-identical without the spec. */
export function bodiesOf(a: Actor): SegBody[] {
  const out: SegBody[] = [{ pos: a.pos, r: a.radius, seg: SEG_CFG.HEAD }];
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) out.push({ pos: segs[i], r: segR(a, i), seg: i });
  }
  return out;
}

/** First hittable body passing `test`, head first (the classic
 *  single-circle order — byte-identical for plain monsters). The generic
 *  funnel for any containment geometry (zones, pulses, bursts): pass the
 *  shape test, get the CONTACT body back. */
export function bodyWhere(a: Actor, test: (pos: Vec2, r: number) => boolean): SegBody | null {
  if (test(a.pos, a.radius)) return { pos: a.pos, r: a.radius, seg: SEG_CFG.HEAD };
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) {
      const r = segR(a, i);
      if (test(segs[i], r)) return { pos: segs[i], r, seg: i };
    }
  }
  return null;
}

/** Which body does a point-with-pad touch? Head wins ties (it's tested
 *  first — the classic single-circle test, then the chain). Returns the
 *  contact's segment index (HEAD = -1) or null on a clean miss. */
export function bodyContact(a: Actor, p: Vec2, pad = 0): number | null {
  if (dist(a.pos, p) <= a.radius + pad) return SEG_CFG.HEAD;
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) {
      if (dist(segs[i], p) <= segR(a, i) + pad) return i;
    }
  }
  return null;
}

/** Surface reach: distance from p to the creature's NEAREST hittable
 *  surface (≤ 0 = touching/inside). Plain monsters: dist − radius, exactly
 *  the classic test — range checks and aim assist ride this everywhere. */
export function reachTo(a: Actor, p: Vec2): number {
  let best = dist(a.pos, p) - a.radius;
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) {
      const d = dist(segs[i], p) - segR(a, i);
      if (d < best) best = d;
    }
  }
  return best;
}

/** The nearest hittable body to p (aim assist snaps to bodies, not only
 *  heads; a minion melees the coil beside it, not the head across the room). */
export function nearestBody(a: Actor, p: Vec2): SegBody {
  let best: SegBody = { pos: a.pos, r: a.radius, seg: SEG_CFG.HEAD };
  let bd = dist(a.pos, p) - a.radius;
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) {
      const r = segR(a, i);
      const d = dist(segs[i], p) - r;
      if (d < bd) { bd = d; best = { pos: segs[i], r, seg: i }; }
    }
  }
  return best;
}

/** Does a swept ray (from → to, half-width pad) touch any hittable body?
 *  Returns the FIRST body along the sweep (parameterized t) or null — the
 *  projectile pass asks this so a bolt connects with the first coil it
 *  crosses, exactly as drawn. */
export function sweepContact(
  a: Actor, from: Vec2, to: Vec2, pad = 0,
): { seg: number; t: number } | null {
  let best: { seg: number; t: number } | null = null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  const test = (pos: Vec2, r: number, seg: number) => {
    // Closest point on the sweep segment to the body center.
    const t = len2 > 0
      ? Math.max(0, Math.min(1, ((pos.x - from.x) * dx + (pos.y - from.y) * dy) / len2))
      : 0;
    const cx = from.x + dx * t, cy = from.y + dy * t;
    const dd = Math.hypot(pos.x - cx, pos.y - cy);
    if (dd <= r + pad && (!best || t < best.t)) best = { seg, t };
  };
  test(a.pos, a.radius, SEG_CFG.HEAD);
  if (segsHittable(a)) {
    const segs = a.worm!.segments;
    for (let i = 0; i < segs.length; i++) test(segs[i], segR(a, i), i);
  }
  return best;
}

/** Remember WHICH body the collection geometry touched — call at COLLECTION
 *  time, immediately before resolveHit. The latch is CONSUMED (read +
 *  cleared) by the one damage funnel (applyHit), so wound accounting and
 *  the per-segment flash ride landed damage only — an evaded or fully
 *  blocked swing never marks a scale. Paths that bank the hit for later
 *  (fuses) clear the latch instead; the late landing feeds the shared pool
 *  with no segment attribution — a burn gnaws the creature, not a coil. */
export function noteBodyHit(a: Actor, seg: number): void {
  a.segHitPending = seg;
}

/** Per-segment hit FEEDBACK: the struck coil flashes, exactly the
 *  Actor.hitFlash idiom (same funnel, same never-on-a-miss honesty). */
export function stampSegFlash(a: Actor, seg: number): void {
  const w = a.worm;
  if (!w?.hittable || seg < 0) return;
  (w.flash ??= [])[seg] = SEG_CFG.flashTime;
}

/** Wound-pool accounting: feed `dmg` of a landed blow into the struck
 *  segment's pool. Returns true when this blow TORE it (crossed to 0) —
 *  the caller (world) lays the root mods / text / fx. Pure math, no World. */
export function feedWound(a: Actor, seg: number, dmg: number): boolean {
  const w = a.worm;
  if (!w?.hittable || !w.wounds || seg < 0 || dmg <= 0) return false;
  if (w.wounded?.[seg]) return false;                  // already torn
  const pool = (w.woundHp ??= []);
  if (pool[seg] === undefined) pool[seg] = w.wounds.frac * a.maxLife();
  pool[seg] -= dmg;
  if (pool[seg] > 0) return false;
  (w.wounded ??= [])[seg] = true;
  return true;
}

/** How many segments are torn (the root-mod stack count + probe surface). */
export function woundCount(a: Actor): number {
  const wd = a.worm?.wounded;
  if (!wd) return 0;
  let n = 0;
  for (const t of wd) if (t) n++;
  return n;
}

/** Decay per-segment flashes (rides the one worm update; dt-driven like
 *  Actor.hitFlash so host and probes stay deterministic). */
export function tickSegFlash(w: WormBody, dt: number): void {
  if (!w.flash) return;
  for (let i = 0; i < w.flash.length; i++) {
    if (w.flash[i] > 0) w.flash[i] = Math.max(0, w.flash[i] - dt);
  }
}

/** Resolve the KIT-PART look for segment i (data/monsters.ts WormSpec.looks):
 *  tail cap on the last segment, every-nth accents (fins, spine sails), body
 *  plates between — so a chain reads as ONE animal, never a run of blobs.
 *  Returns undefined where the spec is silent (legacy: the head's own bake). */
export function segLook(w: WormBody, i: number): string | undefined {
  const L = w.looks;
  if (!L) return undefined;
  if (i === w.length - 1 && L.tail) return L.tail;
  if (L.every && (i + 1) % L.every.n === 0 && i !== w.length - 1) return L.every.look;
  return L.body;
}
