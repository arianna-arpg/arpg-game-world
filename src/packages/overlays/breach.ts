// ---------------------------------------------------------------------------
// BREACH FIELD — the net-new package overlay (proves "one overlay = one feature").
//
// A Breach is a tear in reality that OPENS on a random charted combat zone and,
// while it lasts, floods that zone with rift-spawn (the breach faction, injected
// into its spawn table). It seals after a while. Unlike an invasion there is no
// marching host — just a per-zone state with a timer. It opens at a rate scaled
// by its package PRESSURE (the player's Breach weighting) and only while its
// start-level gate is open. Pure overlay over the node graph; reads its live
// gate via the OverlayBuildCtx the registry hands it, and every tunable rides
// the BreachSurge config on the def — nothing here is a hardcoded knob.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

/** The whole ambient-breach mechanic as data (defs/breach.ts owns the values). */
export interface BreachSurge {
  /** Per-step base chance a breach opens (×ignitionMul). */
  igniteChance: number;
  /** Most breaches standing at once (×concurrencyMul via scaledCap). */
  maxConcurrent: number;
  /** Seconds a breach stands before sealing (rolled in this band; the roll is
   *  then stretched by severityMul — a cranked world's tears gape longer). */
  lifeSeconds: [number, number];
  /** Fixed lifecycle step (seconds) between ignition rolls. */
  stepSeconds: number;
}

interface Breach { zoneId: string; age: number; life: number; }

export class BreachField implements WorldOverlay {
  readonly id = 'breach';
  readonly persistence = 'durable' as const; // a standing tear survives a relaunch
  readonly mapLabel = 'Breaches';
  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: BreachSurge;
  private breaches: Breach[] = [];
  private acc = 0;

  constructor(ctx: OverlayBuildCtx, surge: BreachSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    for (const b of this.breaches) b.age += dt;
    for (let i = this.breaches.length - 1; i >= 0; i--) {
      if (this.breaches[i].age >= this.breaches[i].life) this.breaches.splice(i, 1);
    }
    this.acc += dt;
    while (this.acc >= this.cfg.stepSeconds) { this.acc -= this.cfg.stepSeconds; this.maybeOpen(view); }
  }

  onNodeCharted(): void { /* breaches target charted zones by id; no seeding */ }

  affectSpawns(_zone: ZoneDef): SpawnBias {
    // The real in-zone BREACH ENCOUNTER (engine/encounter.ts) now owns rift-spawn
    // — it floods a growing radius around a diamond the player opens. This overlay
    // is demoted to ambient minimap flavor (the pulsing ◈ markers in renderMap)
    // so the two never double-populate a zone.
    return NO_BIAS;
  }

  /** A standing tear keeps its zone restless (feeds the Mycelia bloom). */
  activityAt(zoneId: string): number {
    return this.isBreached(zoneId) ? 1 : 0;
  }

  renderMap(nodes: ZoneDef[]): MapLayer {
    let over = '';
    for (const b of this.breaches) {
      const z = nodes.find(n => n.id === b.zoneId);
      if (!z) continue;
      over += `<circle cx="${z.map.x}" cy="${z.map.y}" r="12" fill="none" `
        + `stroke="#b04ae8" stroke-width="2" stroke-opacity="0.85"><animate attributeName="r" `
        + `values="9;13;9" dur="2s" repeatCount="indefinite"/></circle>`;
      over += `<text x="${z.map.x}" y="${(z.map.y + 4).toFixed(1)}" text-anchor="middle" `
        + `font-size="12" fill="#d9a3ff">◈</text>`;
    }
    return { under: '', over };
  }

  /** Is this zone breached right now? */
  isBreached(zoneId: string): boolean {
    return this.breaches.some(b => b.zoneId === zoneId);
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the standing tears, verbatim. No zones are minted, so no
   *  ownedZones claim rides. */
  snapshot(): unknown {
    return { breaches: this.breaches.map(b => ({ ...b })) };
  }

  restore(snap: unknown): void {
    const s = snap as { breaches?: unknown[] } | null;
    if (!s || !Array.isArray(s.breaches)) return;
    this.breaches = [];
    for (const raw of s.breaches) {
      const b = raw as Partial<Breach> | null;
      if (!b || typeof b.zoneId !== 'string' || !b.zoneId) continue;
      if (![b.age, b.life].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
      if (b.age! >= b.life!) continue; // already sealed — don't resurrect it
      this.breaches.push({ zoneId: b.zoneId, age: b.age!, life: b.life! });
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    this.breaches = this.breaches.filter(b => has(b.zoneId));
  }

  /** DEV (Events tab): tear a breach open NOW — on the named zone, or a random
   *  eligible one. Returns the zone id it opened on (null = nowhere eligible). */
  devIgnite(view: OverlayView, zoneId?: string): string | null {
    const z = zoneId
      ? view.byId[zoneId]
      : this.rng.pick(view.nodes.filter(n => this.eligible(n)));
    if (!z) return null;
    if (this.isBreached(z.id)) return z.id;
    this.breaches.push({ zoneId: z.id, age: 0, life: this.rollLife() });
    return z.id;
  }

  // --- internals -------------------------------------------------------------

  private eligible(z: ZoneDef): boolean {
    return !!z.packs?.table?.length && !this.isBreached(z.id) && eventTargetable(this.id, z);
  }

  private rollLife(): number {
    // severityMul stretches how long a tear gapes (its "size" axis — the
    // in-zone encounter owns the spawn pressure, so life is breach severity).
    // Clamped like the crusade's spread lever: severity compounds with the
    // ignition axis, so an unbounded stretch would run away at high mixes.
    const sev = clamp(this.gate().severityMul || 1, 0.25, 2);
    return this.rng.range(this.cfg.lifeSeconds[0], this.cfg.lifeSeconds[1]) * sev;
  }

  private maybeOpen(view: OverlayView): void {
    const g = this.gate();
    if (!g.active || this.breaches.length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1))) return;
    const cands = view.nodes.filter(z => this.eligible(z));
    if (!cands.length) return;
    const z = this.rng.pick(cands);
    this.breaches.push({ zoneId: z.id, age: 0, life: this.rollLife() });
  }
}
