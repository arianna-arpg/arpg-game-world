// ---------------------------------------------------------------------------
// THE FOURTH WALL — the camera's drawn frame as a gameplay surface, as data.
//
// The screen's edge has always been REAL to the player — it is where sight
// ends — but never to the engine. This fabric makes it one honest surface,
// four laws deep:
//
//   THE PUBLISH   The renderer publishes the frame it ACTUALLY DREW every
//                 frame (World.publishViewFrame — camera top-left + view
//                 dims in world units; the couchConfine idiom generalized),
//                 so drawn == tested by construction wherever a drawing
//                 exists.
//   THE READ      World.viewRectFor(body) is the ONE resolver for "which
//                 frame governs this body": a stamped frame LOCK first,
//                 then the live published frame for player-team bodies,
//                 then THE FALLBACK — a synthetic frame of
//                 FOURTH_WALL_CFG.fallback half-dims centered on the body's
//                 root owner. Headless play (the balance harness, probes)
//                 and enemy bodies are therefore deterministic by
//                 construction: their "screen" is a pure function of the
//                 body it governs, and an enemy never tests against the
//                 PLAYER's drawn frame — fairness is structural.
//   THE LOCK      StatusDef.frameLock — any status may declare it (the
//                 flight/panic/conceals idiom). While worn, the bearer's
//                 governing frame FREEZES where the status found it
//                 (stamped once at the rising edge onto Actor.frameLockRect,
//                 re-derived each tick; cleared when the last frameLock
//                 status leaves). The camera pins to the stamped rect's
//                 center — BELOW the cinematic eye: a running scene still
//                 owns the camera outright — and every fourth-wall consumer
//                 tests the frozen rect, so the walls cannot drift while
//                 the ball is in play.
//   THE MATH      frameReflect — the one reflection every consumer shares:
//                 flights and bodies bank off the frame by component flip +
//                 clamp, so "the wall" can never disagree with itself
//                 between fabrics.
//
// CONSUMERS (this pass): the projectile step's FRAME REBOUND lane
// (TrajectorySpec.frameBounce seeds it, the projFrameBounce stat deepens it
// — the kindred law, projBounce's exact shape; each rebound re-arms the
// flight's range and hit ledger, the re-throw idiom, so the shot stays a
// live threat while its rebounds last) and THE CAROM MOTOR (CaromDelivery →
// Actor.caromRun, the third carried-body motor beside dash and leap: the
// body flies at a fixed speed, banks off walls and the frame alike, and
// pays its skill's whole payload through resolveHit at every body contact —
// supports, statuses, knockback and credit all arrive from the one
// pipeline).
//
// LAWS: player-facing text says "the edge of your vision", never "the
// camera". Nothing here reads pixels — everything is world-unit geometry.
// Docs: docs/engine/fourthwall.md. Probe: balance/probe_fourthwall.ts.
// ---------------------------------------------------------------------------

/** One frame in world units: camera top-left + view dims. */
export interface ViewRect { x: number; y: number; w: number; h: number }

export const FOURTH_WALL_CFG = {
  /** THE FALLBACK half-dims (world units): the synthetic frame that stands
   *  in wherever no drawn frame governs — headless sim, probes, enemy
   *  bodies. ≈ the default drawn frame (a 1600×900 canvas at the renderer's
   *  base zoom 1.3 shows ~1231×692 world units). */
  fallback: { halfW: 660, halfH: 380 },
  /** A published frame older than this (seconds of world time) is STALE —
   *  the pane hid, the sim never drew — and the read falls back. Generous:
   *  the renderer republishes every rAF. */
  publishGraceSec: 0.5,
  /** The frame-rebound lane (projectiles). */
  proj: {
    /** Step-clear inset off the wall after a rebound, units — one wall is
     *  never struck twice by the same arrival. */
    edgePad: 2,
    /** Flash radius bump at the rebound point — the unseen wall's tell. */
    flashPad: 6,
  },
  /** The carom motor (CaromDelivery defaults). */
  carom: {
    /** Per-victim re-hit clock, seconds (CaromDelivery.rehit overrides). */
    rehitSec: 0.55,
    /** Contact reach past the two bodies' own radii, units. */
    contactPad: 2,
    /** An axis whose achieved step fell under this fraction of its asked
     *  step was BLOCKED by standing world — flip that velocity component
     *  (the wall rebound). */
    blockedFrac: 0.5,
    /** Judge an axis only when it asked at least this much travel — a
     *  near-tangent glide is not a wall. Units. */
    blockedMin: 0.05,
  },
};

/** THE ONE REFLECTION: bank a heading off the inside of `rect`. Returns the
 *  corrected position + heading when the body (radius `r`) pressed past a
 *  wall, or null when it stayed clear. Component flip + clamp — a corner
 *  flips both axes in the same call, honestly. A rect too small to hold the
 *  body degenerates to its center line and still terminates. */
export function frameReflect(
  x: number, y: number, dir: number, r: number, rect: ViewRect, pad = 0,
): { x: number; y: number; dir: number } | null {
  let dx = Math.cos(dir), dy = Math.sin(dir);
  const loX = rect.x + r + pad, hiX = rect.x + rect.w - r - pad;
  const loY = rect.y + r + pad, hiY = rect.y + rect.h - r - pad;
  const midX = (loX + hiX) / 2, midY = (loY + hiY) / 2;
  let nx = x, ny = y, hit = false;
  if (nx < loX) { nx = loX <= hiX ? loX : midX; if (dx < 0) dx = -dx; hit = true; }
  else if (nx > hiX) { nx = loX <= hiX ? hiX : midX; if (dx > 0) dx = -dx; hit = true; }
  if (ny < loY) { ny = loY <= hiY ? loY : midY; if (dy < 0) dy = -dy; hit = true; }
  else if (ny > hiY) { ny = loY <= hiY ? hiY : midY; if (dy > 0) dy = -dy; hit = true; }
  return hit ? { x: nx, y: ny, dir: Math.atan2(dy, dx) } : null;
}

/** The rect's center — the camera's pin while a lock holds. */
export function rectCenter(rect: ViewRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** The fallback frame centered on a point — THE READ's last resort, and the
 *  headless stand-in the probes pin. */
export function fallbackRect(cx: number, cy: number): ViewRect {
  const f = FOURTH_WALL_CFG.fallback;
  return { x: cx - f.halfW, y: cy - f.halfH, w: f.halfW * 2, h: f.halfH * 2 };
}
