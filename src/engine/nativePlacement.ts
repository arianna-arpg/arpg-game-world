import { dist, vec, type Vec2 } from '../core/math';
import { clampToBounds, samplePoint, type Bounds } from '../world/shape';
import type { WalkField } from '../world/walk';
import type { GridWalkField } from '../world/gridWalk';
import type { ZoneDef } from '../data/zones';
import type { Doodad, blocksMovement, hitSurfaceOf, pitRegionOf } from './levelgen';
import type { pushOutOfShape } from './shapes';
import type { regionKind } from '../world/regions';
import type { DeckLike, PitSurface, pitAt, pitSupportedAt } from './pitfall';

export interface NativePlacementOptions { tier?: number }
/** Explicit native area context. A local adapter owns its own walk state; the
 * classic adapter exposes its existing synchronous tier scope. Neither adapter
 * changes another area's zone/geometry or substitutes a capsule proof for the
 * native placement operation. Callbacks retain original ordering and arity. */
export interface NativePlacementHost {
  readonly arena: Bounds;
  walk: WalkField | null;
  readonly tierViews: readonly (WalkField | undefined)[] | null;
  readonly zoneTiers: ZoneDef['tiers'];
  readonly playerPosition: Vec2;
  readonly zoneEntry: Vec2;
  readonly eventAnchors: Vec2[];
  readonly bridges: readonly DeckLike[];
  readonly config: { readonly eventSpacing: number; readonly ledgeGrasp: number; readonly pitSweepGran: number };
  rand(lo: number, hi: number): number;
  isGridWalk(walk: WalkField | null): walk is GridWalkField;
  doodadsAt(x: number, y: number): readonly Doodad[];
  pointInSolid(x: number, y: number, margin?: number, tier?: number): Doodad | null;
  clampPos(p: Vec2, radius: number, from?: undefined, opts?: NativePlacementOptions): Vec2;
  farthestStand(radius: number, needReachable: boolean): Vec2 | null;
  blocksMovement: typeof blocksMovement;
  hitSurfaceOf: typeof hitSurfaceOf;
  pushOutOfShape: typeof pushOutOfShape;
  pitRegionOf: typeof pitRegionOf;
  regionKind: typeof regionKind;
  zonePits(): readonly PitSurface[];
  pitHomeKinds(mover: undefined, pits: readonly PitSurface[]): readonly string[] | null;
  pitAt: typeof pitAt;
  pitSupportedAt: typeof pitSupportedAt;
}

/** The classic fast dispatch accepts ordinary data records only. Inspecting
 * descriptors does not execute point/option getters: accessor-bearing inputs
 * retain the original general clamp's exact read order. This is not a claim
 * of transparent execution for proxies or modified JavaScript intrinsics. */
export function nativePlacementDataInputs(p: Vec2,
  opts?: { tier?: number; mover?: unknown; disp?: unknown; out?: unknown }): boolean {
  if (!p || Object.getPrototypeOf(p) !== Object.prototype) return false;
  for (const key of ['x', 'y']) {
    const d = Object.getOwnPropertyDescriptor(p, key);
    if (!d || !Object.hasOwn(d, 'value') || typeof d.value !== 'number') return false;
  }
  if (opts === undefined) return true;
  if (!opts || Object.getPrototypeOf(opts) !== Object.prototype) return false;
  for (const key of ['mover', 'disp', 'out', 'tier']) {
    const d = Object.getOwnPropertyDescriptor(opts, key);
    if (!d) { if (key in opts) return false; }
    else if (!Object.hasOwn(d, 'value') || (key !== 'tier' && d.value !== undefined)) return false;
  }
  return true;
}

/** The no-origin, no-mover, no-displacement, no-output native clamp branch.
 * General movement stays in World.clampPos. No extra terminal bounds clamp is
 * added: the original pit-union ray result is returned exactly as produced. */
export function nativePlacementClamp(host: NativePlacementHost, p: Vec2, radius: number, tier = 0): Vec2 {
  const b0 = clampToBounds(p, radius, host.arena);
  const out = vec(b0.x, b0.y);
  const mvTier = tier ?? 0;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const o of host.doodadsAt(out.x, out.y)) {
      if ((o.tier ?? 0) !== mvTier) continue;
      if (!host.blocksMovement(o)) continue;
      if (host.pitRegionOf(o)) continue;
      const push = host.pushOutOfShape(host.hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, out.x, out.y, radius);
      if (!push) continue;
      if (o.kind === 'chasm' && host.bridges.some(b => dist(out, b.pos) <= b.radius)) continue;
      moved = true; out.x = push.x; out.y = push.y;
    }
    if (!moved) break;
  }
  const b1 = clampToBounds(out, radius, host.arena);
  out.x = b1.x; out.y = b1.y;
  const moverTier = mvTier;
  let tierSwap: WalkField | null = null;
  if (moverTier >= 1 && host.zoneTiers && host.tierViews && host.walk) {
    const view = host.tierViews[Math.min(moverTier, host.tierViews.length - 1)];
    if (view) { tierSwap = host.walk; host.walk = view; }
  }
  try {
    if (host.walk) {
      const destKind = host.walk.regionAt?.(out.x, out.y) ?? (host.walk.isWalkable(out.x, out.y) ? 'ground' : 'wall');
      const ddef = host.regionKind(destKind);
      const isFall = !!ddef && !ddef.walkable && !ddef.blocks;
      const crossable = isFall && (ddef!.crossableBy ? ddef!.crossableBy({}) : false);
      if (crossable) {
        // The native region callback can explicitly allow a moverless crossing.
      } else if (!host.walk.isWalkable(out.x, out.y)) {
        const s = host.walk.snapToWalkable(out); out.x = s.x; out.y = s.y;
      }
    }
  } finally { if (tierSwap) host.walk = tierSwap; }
  const pits = host.zonePits();
  if (pits.length && moverTier === 0) {
    const grasp = radius * host.config.ledgeGrasp;
    const home = host.pitHomeKinds(undefined, pits);
    if (!host.pitSupportedAt(pits, host.bridges, out.x, out.y, grasp, home)) {
      const over0 = host.pitAt(pits, host.bridges, out.x, out.y, home);
      if (over0) {
        let dx = out.x - over0.x, dy = out.y - over0.y;
        const dl = Math.hypot(dx, dy);
        if (dl < 0.001) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }
        let px = over0.x + dx * (over0.r + radius), py = over0.y + dy * (over0.r + radius);
        for (let s = 0; s < 64 && host.pitAt(pits, host.bridges, px, py, home); s++) {
          px += dx * host.config.pitSweepGran; py += dy * host.config.pitSweepGran;
        }
        out.x = px; out.y = py;
      }
    }
  }
  return out;
}

export function nativeFarPoint(host: NativePlacementHost, minFromPlayer: number, spaceFromEvents = false, draw: (a: number, c: number) => number = host.rand): Vec2 {
  let best = vec(host.arena.w / 2, host.arena.h / 2);
  let bestScore = -Infinity;
  for (let tries = 0; tries < 40; tries++) {
    const sp = samplePoint(host.arena, 90, draw);
    const p = vec(sp.x, sp.y);
    if (host.walk && !host.walk.isWalkable(p.x, p.y)) continue; // walk zones: on-mesh only
    if (host.pointInSolid(p.x, p.y, 16)) continue; // never anchor an event/pack inside a rock blob
    const dPlayer = dist(p, host.playerPosition);
    let dEvents = Infinity;
    if (spaceFromEvents) for (const a of host.eventAnchors) dEvents = Math.min(dEvents, dist(p, a));
    if (dPlayer >= minFromPlayer && (!spaceFromEvents || dEvents >= host.config.eventSpacing)) {
      if (spaceFromEvents) host.eventAnchors.push(p);
      return p;
    }
    // Track the best compromise: maximize whichever constraint is worst.
    const score = Math.min(dPlayer, spaceFromEvents ? dEvents : Infinity);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  // Every sample missed the mesh (a mostly-solid carve): `best` would still
  // be the raw arena center — inside rock, snapping wherever clampPos lands
  // it. Degrade to the true farthest walkable stand instead.
  if (bestScore === -Infinity) {
    const far = host.farthestStand(16, false);
    if (far) best = far;
  }
  if (spaceFromEvents) host.eventAnchors.push(best);
  return best;
}

export function nativeFarthestStand(host: NativePlacementHost, radius: number, needReachable: boolean): Vec2 | null {
  // Sample every walk cell's center: a fixed 60px stride can skip a whole
  // 30px-wide corridor, including the only stand outside arrival grace.
  const step = host.isGridWalk(host.walk) ? Math.min(60, host.walk.cell) : 60;
  const start = host.isGridWalk(host.walk) ? Math.ceil(90 / step) * step + step / 2 : 90;
  let best: Vec2 | null = null;
  let bd = -1;
  let bestOpen: Vec2 | null = null; // the walkable-only understudy
  let bo = -1;
  for (let y = start; y < host.arena.h - 60; y += step) {
    for (let x = start; x < host.arena.w - 60; x += step) {
      if (host.walk && !host.walk.isWalkable(x, y)) continue;
      if (host.pointInSolid(x, y, radius * 0.5)) continue;
      // Score the full-radius landing, not a point clamping may move.
      const stand = host.clampPos(vec(x, y), radius);
      const d = dist(stand, host.playerPosition);
      if (d > bo) { bo = d; bestOpen = stand; }
      if (needReachable && host.walk?.reachable
        && !host.walk.reachable(host.zoneEntry, stand)) continue;
      if (d > bd) { bd = d; best = stand; }
    }
  }
  // Reachability that eliminated EVERY stand is a broken metric (an entry
  // sitting off-mesh reports nothing reachable) — a far walkable stand
  // still beats the entry stack the callers would otherwise fall to.
  return best ?? bestOpen;
}

export function nativeFindFreeSpot(host: NativePlacementHost, at: Vec2, radius: number, tier = 0): Vec2 {
  // LAYER SOVEREIGNTY: the whole hunt happens on ONE story — solids of the
  // body's own layer reject, the clamp confines against that story's floor
  // (ClampOpts.tier), and the walkability read is the story's own view
  // (the base grid is another layer's truth: a "free" spot judged on it
  // would strand an under-story runner off its own web). tier 0 (every
  // legacy caller) walks the identical path it always did.
  const opts = tier >= 1 ? { tier } : undefined;
  const walkAt = tier >= 1 && host.tierViews
    ? host.tierViews[Math.min(tier, host.tierViews.length - 1)] ?? host.walk
    : host.walk;
  const p = host.clampPos(vec(at.x, at.y), radius, undefined, opts);
  if (!host.pointInSolid(p.x, p.y, radius * 0.4, tier)) return p;
  for (let ring = 1; ring <= 7; ring++) {
    const rr = ring * 55;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + ring * 0.73;
      const q = host.clampPos(vec(at.x + Math.cos(a) * rr, at.y + Math.sin(a) * rr), radius, undefined, opts);
      if (host.pointInSolid(q.x, q.y, radius * 0.4, tier)) continue;
      if (walkAt && !walkAt.isWalkable(q.x, q.y)) continue;
      return q;
    }
  }
  return p; // no clear ground within ~385u — keep the clamp (never loop forever)
}
