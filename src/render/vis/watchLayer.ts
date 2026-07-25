// --- THE WATCH FABRIC's drawn read (engine/watch.ts) -------------------------
//
// A watcher's attention is a LADDER; this layer is where the ladder becomes
// SPACE. Each un-locked watcher paints its sense field on the ground: a fan
// whose radius at every bearing is the reach the perception scan itself
// would test there — the front cone at full reach, the rear-hearing ring
// behind it, an alerted mind's full circle — with every ray clipped by the
// SAME sight raycast (World.sightClipD → castRay 'sight' + the elevation
// law) that decides whether the watcher can see at all.
//
// DRAWN == TESTED, by construction:
//  - the geometry reads the actor's STAMPED sense scalars (Actor.sense* —
//    the exact numbers the last scan tested, never a re-derivation),
//  - the radial fold is the scan's own senseReach (one function),
//  - the wall clip is the scan's own ray (one channel, one elevation law),
//  - the reach is folded vs the LOCAL hero — detectability and stealth
//    included, so your shroud visibly SHRINKS their cones.
//
// Color climbs the rungs (calm → stir → search); a sleeping drowser's
// collapsed cone reads as its bare hearing ring; a LOCKED watcher draws
// nothing — the fight is the read. The tracker's second read is its
// quarry's trail: the yet-unconsumed prints it is following, oldest first,
// and a dashed nose-line to the print it walks.
//
// Dials in VIS_CFG.watch. Probe: balance/probe_watchers.ts pins the fan
// boundary against live acquisition on both sides of walls.
// ---------------------------------------------------------------------------

import {
  senseReach, WATCH_CFG, watchRungOf, watchValueOf, type TrailPoint,
} from '../../engine/watch';
import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import { VIS_CFG } from './visConfig';

/** Scratch (single-threaded render loop): fan bearings + gathered prints. */
const RELS: number[] = [];
const PRINTS: TrailPoint[] = [];

/** The fan's boundary radius at one bearing — THE tested fold: senseReach
 *  over the stamped scalars, then the sight-ray clip. Exported for the
 *  probe (drawn == tested is pinned against THIS function). */
export function watchFanRadius(
  world: World, a: Actor, rel: number,
  viewerDetectability: number, viewerStealthed: boolean,
): number {
  // (strict <, matching the scan: a sleeper's collapsed arc admits nothing.)
  const inCone = a.senseAlerted || Math.abs(rel) < a.senseArcHalf;
  const reach = senseReach(a.senseDetect, viewerDetectability, viewerStealthed,
    a.senseAlerted, inCone, a.senseRearMul);
  if (reach <= 1) return 0;
  const ang = a.facing + rel;
  const clip = world.sightClipD(a.pos,
    { x: a.pos.x + Math.cos(ang) * reach, y: a.pos.y + Math.sin(ang) * reach },
    a.tier);
  return Math.min(reach, clip);
}

/** Paint every un-locked watcher's sense fan (world space). Viewer = the
 *  local hero the reach is folded against (seat 0 under couch). */
export function drawWatchSense(
  ctx: CanvasRenderingContext2D, world: World, viewer: Actor,
): void {
  const cfg = VIS_CFG.watch;
  if (!cfg.enabled) return;
  const det = viewer.sheet.get('detectability');
  const sneaking = (viewer.charges.get('stealth') ?? 0) > 0;
  let drawn = 0;
  for (const a of world.actors) {
    const w = a.watch;
    if (!w || w.cone === false || a.dead || a.senseDetect <= 0) continue;
    const dx = a.pos.x - viewer.pos.x, dy = a.pos.y - viewer.pos.y;
    if (dx * dx + dy * dy > cfg.cullDist * cfg.cullDist) continue;
    const v = watchValueOf(a, w, world.time);
    if (v >= 1) continue; // locked: the fight is the read
    if (drawn++ >= cfg.maxCones) break;

    // The fan bearings: uniform rays + exact cone-edge pairs (crisp arc).
    RELS.length = 0;
    const n = Math.max(12, cfg.rays);
    for (let k = 0; k < n; k++) RELS.push(-Math.PI + (Math.PI * 2 * k) / n);
    const ah = a.senseArcHalf;
    if (!a.senseAlerted && ah > 0.01 && ah < Math.PI - 0.01) {
      RELS.push(-ah - 0.001, -ah + 0.001, ah - 0.001, ah + 0.001);
      RELS.sort((x, y) => x - y);
    }

    const rung = watchRungOf(v);
    const color = a.senseAlerted || rung >= 2 ? cfg.colors.search
      : rung === 1 ? cfg.colors.stir : cfg.colors.calm;
    const boost = 1 + cfg.valueBoost * v;
    const breathe = 0.85 + 0.15 * Math.sin(world.time * 2.1 + a.id * 1.7);

    ctx.beginPath();
    let opened = false;
    for (let i = 0; i < RELS.length; i++) {
      const r = watchFanRadius(world, a, RELS[i], det, sneaking);
      const ang = a.facing + RELS[i];
      const px = a.pos.x + Math.cos(ang) * r;
      const py = a.pos.y + Math.sin(ang) * r;
      if (!opened) { ctx.moveTo(px, py); opened = true; }
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = cfg.fillAlpha * boost * breathe;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = cfg.lineAlpha * boost * breathe;
    if (rung === 0) ctx.setLineDash([6, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

/** The tracker's read: the yet-unconsumed prints of the trail it follows
 *  (oldest first — the path it will walk), and the dashed nose-line to
 *  the print it is walking right now. */
export function drawWatchTrails(ctx: CanvasRenderingContext2D, world: World): void {
  const cfg = VIS_CFG.watch;
  if (!cfg.enabled) return;
  for (const a of world.actors) {
    const w = a.watch;
    if (!w?.scent || a.dead || a.watchQuarryId === undefined) continue;
    const v = watchValueOf(a, w, world.time);
    if (v < WATCH_CFG.rungs.stir || v >= 1) continue;
    const q = world.actorById(a.watchQuarryId);
    const trail = q?.trail;
    if (!trail?.length) continue;
    const maxAge = w.scent.maxAge ?? WATCH_CFG.scent.maxAge;
    PRINTS.length = 0;
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      if (p.t > a.watchTrailT && world.time - p.t <= maxAge) PRINTS.push(p);
    }
    if (!PRINTS.length) continue;
    PRINTS.sort((x, y) => x.t - y.t);
    const count = Math.min(cfg.trail.max, PRINTS.length);
    ctx.fillStyle = cfg.trail.color;
    for (let i = 0; i < count; i++) {
      const p = PRINTS[i];
      const fade = 1 - (world.time - p.t) / maxAge;
      ctx.globalAlpha = cfg.trail.alpha * Math.max(0.15, fade) * (1 - i / (count + 2));
      ctx.beginPath();
      ctx.arc(p.x, p.y, cfg.trail.size, 0, Math.PI * 2);
      ctx.fill();
      // The off-beat toe mark — prints read as a walked line, not beads.
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(p.t * 7) * 4, p.y + Math.cos(p.t * 7) * 4,
        cfg.trail.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    if (cfg.trail.noseLine && a.watchAt) {
      ctx.strokeStyle = cfg.trail.color;
      ctx.globalAlpha = cfg.trail.alpha * 0.6;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.moveTo(a.pos.x, a.pos.y);
      ctx.lineTo(a.watchAt.x, a.watchAt.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}
