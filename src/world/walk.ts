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

/** TRAVEL PREFERENCE — an actor's priced view of the ground (the wayfaring
 *  fabric). `costOf` answers "what does a cell of this region kind cost ME,
 *  as a multiplier of plain floor" — 1 neutral, >1 detoured, <1 sought.
 *  Resolution order lives with the World (MonsterDef.pathCosts override →
 *  terrain-damage insurance neutralizes → the RegionKind's own price), so
 *  what hurts a body and what its feet avoid can never disagree. `key` is
 *  the stable intern identity: equal keys MUST answer costOf identically —
 *  a WalkField caches per-key cost tables and distance fields against it. */
export interface PathProfile {
  key: string;
  costOf(kind: string): number;
}

export interface WalkField {
  /** Grid cell size if grid-based — the granularity a swept collision check steps
   *  at (so it can't skip over a thin wall). Optional: a non-grid impl may omit it
   *  and the sweeper falls back to a safe default. */
  cellSize?: number;
  /** Is this point standable ground (not void / sea / wall)? */
  isWalkable(x: number, y: number): boolean;
  /** LEDGE GRASP: is any part of a body disc (center, radius) still over
   *  something that holds it — walkable ground or blocking mass, anything but
   *  open void? Drives the vertical fabrics' fall tests + the swept confine so
   *  touching a lip is a grasp, not a fall (WALK_CFG.ledgeGrasp scales the
   *  radius). Optional: a model with no void concept omits it and callers
   *  fall back to isWalkable. */
  supportedAt?(x: number, y: number, r: number): boolean;
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
   *  Optional: Phase-1 has no impl, so steering stays straight-line.
   *  `profile` (the wayfaring fabric) weights the field by the asker's priced
   *  view of the ground — omitted or uniform, the step is byte-identical to
   *  the classic unweighted flow field. */
  pathStep?(from: Vec2, to: Vec2, profile?: PathProfile): Vec2 | null;
  /** Is the STRAIGHT line from→to entirely walkable? The any-angle shortcut:
   *  steering beelines whenever this is true and consults pathStep only when
   *  something actually stands in the way — open ground keeps its beelines
   *  (no 4-connected staircase), warrens path exactly as before. */
  lineWalkable?(from: Vec2, to: Vec2): boolean;
  /** The any-angle shortcut, PRICED: walkable AND no crossed cell costs the
   *  asker more than plain floor. Steering with a non-uniform profile gates
   *  its beeline here, so a hazard the flow field would route around also
   *  breaks the straight-line shortcut that would have marched through it.
   *  Optional — a model without costs omits it and callers fall back to
   *  lineWalkable. */
  linePreferred?(from: Vec2, to: Vec2, profile: PathProfile): boolean;
  /** Per-tick housekeeping seam: the World calls this once at the top of each
   *  sim tick so an implementation can reset its per-tick cache budgets (the
   *  grid's stale path-field refresh allowance). Optional — a model with no
   *  tick-scoped caches simply omits it. Tick-driven, never wall-clock, so
   *  the deterministic sim harness sees identical behavior. */
  beginFrame?(): void;
}
