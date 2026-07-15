// ---------------------------------------------------------------------------
// HIT SURFACES — the one collision-shape fabric.
//
// A HitShape is a doodad's (or any anchored thing's) TRUE collision surface,
// expressed relative to an anchor point. Until this fabric, every surface in
// the sim was a disc: fine for boulders and trees, wrong for anything oblong —
// a structure door spanning a 90px breach blocked as a 90px-DIAMETER circle
// bulging through the wall line into the corridor, which is why squeezing
// past a Durance doorway felt like running into invisible hitboxes.
//
// Design contract (the avoid-hardcoding doctrine):
//   - Shapes are pure DATA (a discriminated union), resolved per consumer
//     through ONE resolver (levelgen.hitSurfaceOf) — no consumer ever
//     switches on a doodad KIND to invent geometry.
//   - Every function here has an exact-parity circle branch: a circle-shaped
//     surface reproduces the classic disc math BYTE FOR BYTE, so the fabric's
//     arrival changes nothing for the hundreds of disc kinds.
//   - BROAD PHASE stays a disc: the spatial index inserts by a bounding
//     radius (Doodad.boundR when a shape exceeds the visual radius). The
//     invariant every author must keep — and genqa enforces — is
//     shapeBoundR(hitbox) ≤ max(radius, boundR), or index queries near a
//     rect's corners would miss it.
//
// Consumers: World.clampPos (movement push-out), World.pointInSolid,
// los.castRay (shot + sight channels), World.buildConvexNav (path stamping),
// and the projectile terrain sweep. Renderer debug overlay draws these same
// shapes — what you see IS what collides.
// ---------------------------------------------------------------------------

/** A collision surface anchored at some world position. `rot` is radians,
 *  counter-clockwise, 0 = the rect's local +x axis lies along world +x.
 *  'multi' is a UNION of circles offset from the anchor (dx/dy already in
 *  world frame) — the seed-rolled rock forms (engine/rockForms.ts): every
 *  branch below treats each part with the exact-parity circle math, so a
 *  split boulder is just two honest discs wearing one broad phase. */
export type HitShape =
  | { kind: 'circle'; r: number }
  | { kind: 'rect'; hw: number; hh: number; rot?: number }
  | { kind: 'multi'; parts: { dx: number; dy: number; r: number }[] };

/** The push-out result clampPos consumes: the resolved point + the surface
 *  normal at the contact (what the collision-proc seam classifies against). */
export interface ShapePush { x: number; y: number; nx: number; ny: number }

/** Radius of the smallest disc centered on the anchor that contains the
 *  shape — the broad-phase bound the spatial index must honor. */
export function shapeBoundR(s: HitShape): number {
  if (s.kind === 'circle') return s.r;
  if (s.kind === 'multi') {
    let b = 0;
    for (const q of s.parts) b = Math.max(b, Math.hypot(q.dx, q.dy) + q.r);
    return b;
  }
  return Math.hypot(s.hw, s.hh);
}

/** Axis-aligned half-extents of the shape's bounding box (world frame) —
 *  nav stamping iterates this window. */
export function shapeAabbHalf(s: HitShape): { ex: number; ey: number } {
  if (s.kind === 'circle') return { ex: s.r, ey: s.r };
  if (s.kind === 'multi') {
    let ex = 0, ey = 0;
    for (const q of s.parts) {
      ex = Math.max(ex, Math.abs(q.dx) + q.r);
      ey = Math.max(ey, Math.abs(q.dy) + q.r);
    }
    return { ex, ey };
  }
  const c = Math.abs(Math.cos(s.rot ?? 0)), n = Math.abs(Math.sin(s.rot ?? 0));
  return { ex: c * s.hw + n * s.hh, ey: n * s.hw + c * s.hh };
}

/** Signed distance from a point to the shape's surface (negative = inside).
 *  Circle: dist − r. Rect: the standard box SDF in the local frame.
 *  Multi: the union — the nearest (deepest) part speaks. */
export function shapeDistance(s: HitShape, ax: number, ay: number, px: number, py: number): number {
  if (s.kind === 'circle') {
    return Math.hypot(px - ax, py - ay) - s.r;
  }
  if (s.kind === 'multi') {
    let d = Infinity;
    for (const q of s.parts) d = Math.min(d, Math.hypot(px - ax - q.dx, py - ay - q.dy) - q.r);
    return d;
  }
  const rot = s.rot ?? 0;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const wx = px - ax, wy = py - ay;
  const lx = wx * cos + wy * sin;          // world → local (rotate by −rot)
  const ly = -wx * sin + wy * cos;
  const qx = Math.abs(lx) - s.hw, qy = Math.abs(ly) - s.hh;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0);
}

/** Is the point within `pad` of the shape (strict, matching the classic
 *  `dist < reach` disc tests)? */
export function shapeContains(s: HitShape, ax: number, ay: number, px: number, py: number, pad = 0): boolean {
  return shapeDistance(s, ax, ay, px, py) < pad;
}

/**
 * Push a body of radius `bodyR` at (px,py) out of the shape, or null when
 * already clear. The circle branch reproduces World.clampPos's classic
 * radial slide exactly (including the degenerate dead-center case, which
 * historically slides +x only). The rect branch pushes along the closest-
 * point delta — or, when the body's center is INSIDE the box, out through
 * the nearest face — so walking into a door slab slides you along its face
 * instead of orbiting an invisible circle.
 */
export function pushOutOfShape(s: HitShape, ax: number, ay: number, px: number, py: number, bodyR: number): ShapePush | null {
  if (s.kind === 'circle') {
    return pushOutOfCircle(s.r, ax, ay, px, py, bodyR);
  }
  if (s.kind === 'multi') {
    // Union: escape the DEEPEST-penetrating lobe. One lobe per call — the
    // movement clamp already iterates passes for exactly this blob shape
    // ("escaping one circle can land inside its neighbor"), so a body
    // wedged between lobes walks out the same way it always has.
    let best: { q: { dx: number; dy: number; r: number }; depth: number } | null = null;
    for (const q of s.parts) {
      const depth = Math.hypot(px - ax - q.dx, py - ay - q.dy) - (q.r + bodyR);
      if (depth >= 0) continue;
      if (!best || depth < best.depth) best = { q, depth };
    }
    if (!best) return null;
    return pushOutOfCircle(best.q.r, ax + best.q.dx, ay + best.q.dy, px, py, bodyR);
  }
  const rot = s.rot ?? 0;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const wx = px - ax, wy = py - ay;
  const lx = wx * cos + wy * sin;
  const ly = -wx * sin + wy * cos;
  const cx = Math.max(-s.hw, Math.min(s.hw, lx));
  const cy = Math.max(-s.hh, Math.min(s.hh, ly));
  let ox: number, oy: number, nlx: number, nly: number;
  if (cx !== lx || cy !== ly) {
    // Center outside the box: push along the closest-point delta to bodyR.
    const dx = lx - cx, dy = ly - cy;
    const d = Math.hypot(dx, dy);
    if (d >= bodyR) return null;
    nlx = dx / d; nly = dy / d;
    ox = cx + nlx * bodyR; oy = cy + nly * bodyR;
  } else {
    // Center inside the box: exit through the nearest face.
    const exitX = s.hw - Math.abs(lx), exitY = s.hh - Math.abs(ly);
    if (exitX <= exitY) {
      const sign = lx >= 0 ? 1 : -1;
      nlx = sign; nly = 0;
      ox = sign * (s.hw + bodyR); oy = ly;
    } else {
      const sign = ly >= 0 ? 1 : -1;
      nlx = 0; nly = sign;
      ox = lx; oy = sign * (s.hh + bodyR);
    }
  }
  return {
    x: ax + ox * cos - oy * sin,           // local → world (rotate by +rot)
    y: ay + ox * sin + oy * cos,
    nx: nlx * cos - nly * sin,
    ny: nlx * sin + nly * cos,
  };
}

/** The classic radial slide out of one disc — World.clampPos's historical
 *  math byte-for-byte (including the degenerate dead-center +x case). Both
 *  the circle branch and each 'multi' lobe resolve through here. */
function pushOutOfCircle(cr: number, ax: number, ay: number, px: number, py: number, bodyR: number): ShapePush | null {
  const d = Math.hypot(px - ax, py - ay);
  const minD = cr + bodyR;
  if (d >= minD) return null;
  if (d < 0.01) return { x: ax + minD, y: py, nx: 1, ny: 0 };
  const f = minD / d;
  const x = ax + (px - ax) * f, y = ay + (py - ay) * f;
  const n = Math.hypot(x - ax, y - ay) || 1;
  return { x, y, nx: (x - ax) / n, ny: (y - ay) / n };
}

/**
 * First intersection of the segment from (fx,fy) along (dx,dy) with the
 * shape, as a t in [0,1] — or null when the segment never touches it.
 * A segment STARTING inside returns t=0 (the veil rule: under an unbroken
 * crown you are blind both ways), matching the classic disc sweep.
 */
export function rayShapeT(s: HitShape, ax: number, ay: number, fx: number, fy: number, dx: number, dy: number): number | null {
  if (s.kind === 'circle') {
    return rayCircleT(s.r, ax, ay, fx, fy, dx, dy);
  }
  if (s.kind === 'multi') {
    // Union: the earliest lobe entry wins (a start inside any lobe is t=0
    // through that lobe's own clamp — the veil rule holds per part).
    let tMin: number | null = null;
    for (const q of s.parts) {
      const t = rayCircleT(q.r, ax + q.dx, ay + q.dy, fx, fy, dx, dy);
      if (t !== null && (tMin === null || t < tMin)) tMin = t;
    }
    return tMin;
  }
  // Slab method in the rect's local frame.
  const rot = s.rot ?? 0;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const ox = fx - ax, oy = fy - ay;
  const lfx = ox * cos + oy * sin, lfy = -ox * sin + oy * cos;
  const ldx = dx * cos + dy * sin, ldy = -dx * sin + dy * cos;
  let tMin = 0, tMax = 1;
  for (const [f, d, h] of [[lfx, ldx, s.hw], [lfy, ldy, s.hh]] as const) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(f) > h) return null;    // parallel outside the slab
      continue;
    }
    let t0 = (-h - f) / d, t1 = (h - f) / d;
    if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
    if (t0 > tMin) tMin = t0;
    if (t1 < tMax) tMax = t1;
    if (tMin > tMax) return null;
  }
  // tMin carries the entry; a start inside the box clamps to 0 above.
  // Reject a touch wholly behind the segment start (tMax ≤ 0 handled by the
  // clamp: tMin=0 with tMax<0 fails the tMin>tMax check already).
  return tMin;
}

/** The exact los.ts ray/circle entry math — the circle branch and every
 *  'multi' lobe resolve through here (start-inside = t0 veil rule). */
function rayCircleT(cr: number, ax: number, ay: number, fx: number, fy: number, dx: number, dy: number): number | null {
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-12 || cr <= 0) return null;
  const ox = fx - ax, oy = fy - ay;
  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - cr * cr;
  const disc = b * b - 4 * lenSq * c;
  if (disc <= 0) return null;
  const sq = Math.sqrt(disc);
  const t0 = (-b - sq) / (2 * lenSq);
  const t1 = (-b + sq) / (2 * lenSq);
  if (t1 <= 0 || t0 >= 1) return null;     // wholly behind / beyond the segment
  return Math.max(0, t0);
}
