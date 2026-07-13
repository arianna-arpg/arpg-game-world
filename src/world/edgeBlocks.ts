// ---------------------------------------------------------------------------
// EDGE BLOCKS — the runtime ROAD-BLOCKADE registry.
//
// A living event can seal a ROAD of the zone graph — not a zone, the EDGE
// between two zones (the world-serpent's body lying across the passes). This
// is the third travel lock beside the holdfast toll (a per-exit `lock` id
// resolved against HoldfastField) and the objective seal (boss/spawner zones):
// where those are data-on-the-exit or zone-state, an EDGE BLOCK is transient
// event state that comes and goes with no ZoneDef edit — the def stays clean,
// the block lives on the event's own overlay.
//
// Shape mirrors mapMarkers/zoneInfo/bulletins: sources register at import time
// (zero engine edits per new event), and the engine consults ONE fold at its
// existing travel gate (World.isExitLocked) plus the sealed-exit hint. Blocks
// are DIRECTIONLESS — a road closed one way is closed both ways (sources
// receive (from, to) but should answer symmetrically).
//
// Contract for sources: NEVER block an edge whose removal would strand the
// player — an event picking edges must keep the charted graph connected
// (WorldBossField BFS-guards its serpent paths). Waypoint fast-travel is
// deliberately NOT gated here: blocks close ROADS, not places; an attuned
// waypoint into a besieged zone is the sanctioned way around a long blockade.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';

/** One live blockade on a road. */
export interface EdgeBlock {
  /** Short human line shown at the sealed exit ("the wyrm's coils seal the pass"). */
  reason: string;
  /** Accent for hints / future map styling (falls back to the seal red). */
  color?: string;
  /** The event that owns the block (diagnostics; e.g. 'worldboss'). */
  source: string;
}

/** A registered blockade source: answer with the block holding the road
 *  fromZoneId → toZoneId, or null. Called from the travel gate (hot-ish path:
 *  a few exits per frame) — sources should be O(1) lookups over their own
 *  event state, never scans. */
export type EdgeBlockSource = (world: World, fromZoneId: string, toZoneId: string) => EdgeBlock | null;

const EDGE_BLOCK_SOURCES: EdgeBlockSource[] = [];

/** Register a blockade source (import-time, like registerMarkerSource). */
export function registerEdgeBlockSource(s: EdgeBlockSource): void {
  EDGE_BLOCK_SOURCES.push(s);
}

/** The one fold: the first live block on this road, or null. */
export function edgeBlockAt(world: World, fromZoneId: string, toZoneId: string): EdgeBlock | null {
  for (const s of EDGE_BLOCK_SOURCES) {
    const b = s(world, fromZoneId, toZoneId);
    if (b) return b;
  }
  return null;
}
