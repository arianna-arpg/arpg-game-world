// ---------------------------------------------------------------------------
// BOROUGH FIELD — the map-level half of the Borough package.
//
// The in-zone defense (folk, muster, arming, assault) is a BOROUGH ENCOUNTER —
// engine-side, zone-local, re-rolled per visit off the manifest seed (the
// extraction fabric pointed at people). This overlay is what must OUTLIVE a
// zone visit, and it is the package's whole reason to exist:
//
//  - THE SPENT LEDGER: a settlement that resolved (held or lost) marks its
//    zone spent, so the deterministic placement roll cannot conjure a fresh
//    village on the same ground until the country resettles (cfg.resettleSec;
//    0 = never this run).
//  - THE POPULATION: every villager who walked out alive is a soul in
//    Lastlight, for the rest of the run. This counter is the open economic
//    input other systems read (Brandt's shelf today — data/boroughs.ts;
//    scouting parties and town-building tomorrow), and the founding stone of
//    the run's colony layer.
//
// Durable by pledge: a half-fought stand is a mover (it resets with the
// zone — abandoning the folk forfeits them), but WHO reached Lastlight and
// WHICH ground is spent are world memory and ride the save.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../../data/zones';
import type { WorldBulletin } from '../../world/bulletins';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import type { OverlayBuildCtx, PackageGate } from '../types';

/** The overlay's own knobs (defs/borough.ts owns the values; the in-zone
 *  numbers live on the encounter's BoroughSpec). */
export interface BoroughSurge {
  /** Seconds before a spent settlement's ground may seed a new one (0 =
   *  never this run). World time — the country resettles while you roam. */
  resettleSec: number;
  /** The bulletin spoken when refugees arrive ({n} = the count). */
  arrivalBulletin: string;
  arrivalColor: string;
}

export class BoroughField implements WorldOverlay {
  readonly id = 'borough';
  readonly persistence = 'durable' as const; // refugees + spent ground are world memory
  readonly mapLabel = 'Borough';
  private readonly gate: () => PackageGate;
  private readonly cfg: BoroughSurge;
  /** Souls sheltered in Lastlight this run (refugees only; the town's
   *  founding folk are display-side — data/boroughs.ts POPULATION_CFG.base). */
  population = 0;
  /** Settlements that ran their course, either way (the ledger the tally
   *  reads for "boroughs resolved" style perks later). */
  resolved = 0;
  /** zoneId → world time the settlement resolved (held or lost). */
  private spent: Record<string, number> = {};
  /** Fresh arrival toasts, drained by the bulletin source (transient —
   *  deliberately outside the snapshot; a toast is not world memory). */
  private pending: WorldBulletin[] = [];

  constructor(ctx: OverlayBuildCtx, surge: BoroughSurge) {
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(_dt: number, view: OverlayView): void {
    // Resettlement: spent ground quietly reopens once its clock lapses.
    if (this.cfg.resettleSec <= 0) return;
    for (const [zid, at] of Object.entries(this.spent)) {
      if (view.time - at >= this.cfg.resettleSec) delete this.spent[zid];
    }
  }

  onNodeCharted(): void { /* settlements are found in-zone, never pre-seeded */ }

  affectSpawns(_zone: ZoneDef): SpawnBias {
    // The borough ENCOUNTER owns every spawn; the overlay never populates.
    return NO_BIAS;
  }

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // Settlements are in-zone discoveries; the town pin rides a marker source.
    return { under: '', over: '' };
  }

  /** May the deterministic placement roll seed a settlement here right now?
   *  (World.placeEncounters consults this — the extraction-spent pattern.) */
  siteAvailable(zoneId: string): boolean {
    return !(zoneId in this.spent);
  }

  /** A settlement resolved (held or lost) — rest the ground until it resettles. */
  markSpent(zoneId: string, atTime: number): void {
    this.spent[zoneId] = atTime;
    this.resolved++;
  }

  /** Survivors reach Lastlight: grow the run's population and queue the
   *  arrival toast. THE writer — every future source of settlers (rescues,
   *  scouting returns, births?) funnels through here. */
  addRefugees(n: number): void {
    if (!(n > 0)) return;
    this.population += Math.floor(n);
    this.pending.push({
      text: this.cfg.arrivalBulletin.replace('{n}', String(Math.floor(n))),
      color: this.cfg.arrivalColor,
    });
  }

  /** Bulletin drain (registered in the def): what's new since the last call. */
  drainBulletins(): WorldBulletin[] {
    if (!this.pending.length) return [];
    const out = this.pending;
    this.pending = [];
    return out;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the souls, the resolved tally, the spent ledger. No zones
   *  are minted, so no ownedZones claim rides. */
  snapshot(): unknown {
    return { population: this.population, resolved: this.resolved, spent: { ...this.spent } };
  }

  restore(snap: unknown): void {
    const s = snap as { population?: unknown; resolved?: unknown; spent?: Record<string, unknown> } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.population === 'number' && Number.isFinite(s.population)) {
      this.population = Math.max(0, Math.floor(s.population));
    }
    if (typeof s.resolved === 'number' && Number.isFinite(s.resolved)) {
      this.resolved = Math.max(0, Math.floor(s.resolved));
    }
    this.spent = {};
    if (s.spent && typeof s.spent === 'object') {
      for (const [zid, at] of Object.entries(s.spent)) {
        if (typeof zid !== 'string' || !zid) continue;
        if (typeof at !== 'number' || !Number.isFinite(at)) continue;
        this.spent[zid] = at;
      }
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    for (const zid of Object.keys(this.spent)) {
      if (!has(zid)) delete this.spent[zid];
    }
  }

  /** DEV (Events tab): make `zoneId` settle-eligible NOW — clears its spent
   *  mark and reports whether the structural floor would admit a settlement
   *  (the World's devForceBorough does the in-zone placement; this is the
   *  map-level half + the headless QA seam). */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    delete this.spent[zoneId];
    const z = view.byId[zoneId];
    return !!z && eventTargetable(this.id, z) && this.gate().active;
  }
}
