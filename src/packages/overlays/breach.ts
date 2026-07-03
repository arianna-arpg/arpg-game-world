// ---------------------------------------------------------------------------
// BREACH FIELD — the net-new package overlay (proves "one overlay = one feature").
//
// A Breach is a tear in reality that OPENS on a random charted combat zone and,
// while it lasts, floods that zone with rift-spawn (the breach faction, injected
// into its spawn table). It seals after a while. Unlike an invasion there is no
// marching host — just a per-zone state with a timer. It opens at a rate scaled
// by its package PRESSURE (the player's Breach weighting) and only while its
// start-level gate is open. Pure overlay over the node graph; reads its live
// gate via the OverlayBuildCtx the registry hands it.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const OPEN_CHANCE = 0.05;            // per step, at pressure 1
const MAX_BREACHES = 2;
const BREACH_LIFE: [number, number] = [70, 130];

interface Breach { zoneId: string; age: number; life: number; }

export class BreachField implements WorldOverlay {
  readonly id = 'breach';
  private rng: Rng;
  private readonly gate: () => PackageGate;
  private breaches: Breach[] = [];
  private acc = 0;

  constructor(ctx: OverlayBuildCtx) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
  }

  update(dt: number, view: OverlayView): void {
    for (const b of this.breaches) b.age += dt;
    for (let i = this.breaches.length - 1; i >= 0; i--) {
      if (this.breaches[i].age >= this.breaches[i].life) this.breaches.splice(i, 1);
    }
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; this.maybeOpen(view); }
  }

  onNodeCharted(): void { /* breaches target charted zones by id; no seeding */ }

  affectSpawns(_zone: ZoneDef): SpawnBias {
    // The real in-zone BREACH ENCOUNTER (engine/encounter.ts) now owns rift-spawn
    // — it floods a growing radius around a diamond the player opens. This overlay
    // is demoted to ambient minimap flavor (the pulsing ◈ markers in renderMap)
    // so the two never double-populate a zone.
    return NO_BIAS;
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

  private maybeOpen(view: OverlayView): void {
    const g = this.gate();
    if (!g.active || this.breaches.length >= scaledCap(MAX_BREACHES, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(OPEN_CHANCE * g.ignitionMul, 0, 1))) return;
    const cands = view.nodes.filter(z =>
      z.objective.kind !== 'safe' && !!z.packs?.table?.length && !this.isBreached(z.id)
      && eventAllowed('breach', z));
    if (!cands.length) return;
    const z = this.rng.pick(cands);
    this.breaches.push({ zoneId: z.id, age: 0, life: this.rng.range(BREACH_LIFE[0], BREACH_LIFE[1]) });
  }
}
