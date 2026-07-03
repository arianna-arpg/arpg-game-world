// ---------------------------------------------------------------------------
// WALKABILITY — the model-agnostic seam for non-convex zone topology.
//
// Today (Phase 1) the engine's only walkability model is the convex one baked
// into shape.ts + World.clampPos: walkable = inside the rect/ellipse bounds,
// minus the union of blocking doodad discs. That stays authoritative; a layout
// generator that needs nothing more (plains, and the bridge-islands proof, which
// expresses its gaps as chasm+bridge discs the convex model already understands)
// leaves GeneratedLayout.walk undefined.
//
// This interface RESERVES the slot for Phase 2's real non-convex layouts (true
// islands-in-a-sea, mazes, rooms+tunnels). A WalkField is whatever can answer
// "is this point walkable / where's the nearest walkable point / how do I step
// toward a target" — so the coarse boolean GRID is implementation #1 and a full
// NAVMESH can drop in later as #2 WITHOUT touching any consumer (clampPos, the
// spawn samplers, the AI steerer all program against this interface, not a grid).
// Grid-into-navmesh, exactly the long-run path we want.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';

export interface WalkField {
  /** Grid cell size if grid-based — the granularity a swept collision check steps
   *  at (so it can't skip over a thin wall). Optional: a non-grid impl may omit it
   *  and the sweeper falls back to a safe default. */
  cellSize?: number;
  /** Is this point standable ground (not void / sea / wall)? */
  isWalkable(x: number, y: number): boolean;
  /** The REGION KIND id at a point (Phase 3 typed regions) — drives the collision
   *  policy + per-frame region effects. Optional so a minimal impl may omit it. */
  regionAt?(x: number, y: number): string;
  /** Resolve a point to the nearest walkable point — what clampPos calls when an
   *  actor would land off-region (snap back onto land), instead of the convex
   *  rect/ellipse rim projection. */
  snapToWalkable(p: Vec2): Vec2;
  /** Is `from` connected to `to` by walkable ground? Drives reachability-aware
   *  spawn placement (no bosses/loot stranded across a gap). */
  reachable?(from: Vec2, to: Vec2): boolean;
  /** One step from `from` toward `to` that respects walls/gaps — the AI pathing
   *  hook (a grid flow-field or a navmesh path both satisfy this). Null = no path.
   *  Optional: Phase-1 has no impl, so steering stays straight-line. */
  pathStep?(from: Vec2, to: Vec2): Vec2 | null;
}
