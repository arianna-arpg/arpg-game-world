// ---------------------------------------------------------------------------
// EXTRACTION FIELD — the map-level half of the Extraction package.
//
// The in-zone defense (node, dwell, swarm, yield) is an EXTRACT ENCOUNTER —
// engine-side, zone-local, re-rolled per visit off the manifest seed (the
// breach-diamond fabric, inverted). This overlay is the part that must OUTLIVE
// a zone visit: THE SPENT LEDGER. A drained (or shattered) seam marks its zone
// spent so the deterministic placement roll cannot hand the same essence
// faucet back on re-entry — the economy hole a pure re-roll would open. Seams
// REPLENISH after a long while (cfg.respawnSec; 0 = never this run), so the
// world keeps breathing without ever being farmable on a door-hinge.
//
// Durable by pledge: half-drained defenses are movers (they reset with the
// zone — abandoning a stand forfeits it), but WHICH ground is spent is world
// memory and rides the save.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../../data/zones';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import type { OverlayBuildCtx, PackageGate } from '../types';

/** The overlay's own knobs (defs/extraction.ts owns the values; the in-zone
 *  numbers live on the encounter's ExtractSpec). */
export interface ExtractionSurge {
  /** Seconds before a spent seam may seed again (0 = never this run). The
   *  clock is world time, so it keeps counting while you adventure elsewhere. */
  respawnSec: number;
}

export class ExtractionField implements WorldOverlay {
  readonly id = 'extraction';
  readonly persistence = 'durable' as const; // spent ground is world memory
  readonly mapLabel = 'Extraction';
  private readonly gate: () => PackageGate;
  private readonly cfg: ExtractionSurge;
  /** zoneId → world time the seam was spent (drained or shattered). */
  private spent: Record<string, number> = {};

  constructor(ctx: OverlayBuildCtx, surge: ExtractionSurge) {
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(_dt: number, view: OverlayView): void {
    // Replenishment: a spent seam quietly refills once its clock lapses.
    if (this.cfg.respawnSec <= 0) return;
    for (const [zid, at] of Object.entries(this.spent)) {
      if (view.time - at >= this.cfg.respawnSec) delete this.spent[zid];
    }
  }

  onNodeCharted(): void { /* seams are discovered in-zone, never pre-seeded */ }

  affectSpawns(_zone: ZoneDef): SpawnBias {
    // The extract ENCOUNTER owns every spawn; the overlay never populates.
    return NO_BIAS;
  }

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // Seams are in-zone discoveries — the map stays quiet about them.
    return { under: '', over: '' };
  }

  /** May the deterministic placement roll seed a seam in this zone right now?
   *  (World.placeEncounters consults this — the mycelia-suppression pattern.) */
  nodeAvailable(zoneId: string): boolean {
    return !(zoneId in this.spent);
  }

  /** A seam ended (drained or shattered) — burn the ground until it refills. */
  markSpent(zoneId: string, atTime: number): void {
    this.spent[zoneId] = atTime;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the spent ledger, verbatim. No zones are minted, so no
   *  ownedZones claim rides. */
  snapshot(): unknown {
    return { spent: { ...this.spent } };
  }

  restore(snap: unknown): void {
    const s = snap as { spent?: Record<string, unknown> } | null;
    if (!s || !s.spent || typeof s.spent !== 'object') return;
    this.spent = {};
    for (const [zid, at] of Object.entries(s.spent)) {
      if (typeof zid !== 'string' || !zid) continue;
      if (typeof at !== 'number' || !Number.isFinite(at)) continue;
      this.spent[zid] = at;
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    for (const zid of Object.keys(this.spent)) {
      if (!has(zid)) delete this.spent[zid];
    }
  }

  /** DEV (Events tab): make `zoneId` seam-eligible NOW — clears its spent
   *  mark and reports whether the structural floor would admit a seam at all
   *  (the World's devForceExtraction does the actual in-zone placement; this
   *  is the map-level half + the headless QA seam). */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    delete this.spent[zoneId];
    const z = view.byId[zoneId];
    return !!z && eventTargetable(this.id, z) && this.gate().active;
  }
}
