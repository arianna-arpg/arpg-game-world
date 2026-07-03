// ---------------------------------------------------------------------------
// BRIGAND FIELD — a NOMADIC bandit RAID that strikes one zone (pure overlay).
//
// A Warband-LIKE mechanic that needs NO territory: a single band of thieves musters at
// one charted place, then MARCHES across the map toward ONE target zone — shown
// "invading" on the map (a marching arrowhead + dashed line to the mark, just like a war
// host). It is NOT a Migration: there's no growing column and no stream of bodies through
// every zone it crosses. When the band ARRIVES at its target (and the player is there) it
// materializes as ONE coherent pack that then simply WANDERS the zone looking for marks —
// no destination, no marching-on. The pack is NEUTRAL until a player strays within its
// aggro range (the proximity rouse wakes the cohort), and loses interest if you back off
// (the engine's NEUTRAL_RESET). Unanchored: origin + target are sampled from any two
// charted zones, so a raid can fall anywhere.
//
// PURE of the engine: it owns the cross-map raid lifecycle (muster → march → present);
// the engine reads brigandOn() to drop the pack on arrival + run the wander/rouse, then
// calls retire() to clear the spent raid. Reuses the 'bandit' faction (grafted by
// Holdfast). The march-to-a-target / strike-on-arrival shape is a reusable seam for
// future "something invades a zone" events.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist, type MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const ARRIVE_DIST = 16;        // band pos within this of the target node = ARRIVED
const BRIGAND_RUST = '#9a6a3a';

/** A flavour a fresh raid rolls — how big the ONE pack it unleashes is. */
export interface BrigandVariant {
  id: string;
  name: string;
  weight: number;
  /** Headcount of the single pack the band materializes on arrival. */
  packSize: number;
  color?: string;
}

/** The whole nomadic-raid mechanic as data — every number a knob. */
export interface BrigandSurge {
  /** Per-STEP chance a fresh raid sets out (gated by pressure + the concurrency cap). */
  igniteChance: number;
  maxConcurrent: number;
  /** Seconds the band MUSTERS at its origin before marching (rolled in range). */
  musterSeconds: [number, number];
  /** March speed toward the target zone (node-units/sec). */
  marchSpeed: number;
  /** Seconds an ARRIVED band lingers on its target before dispersing UNSEEN (the player
   *  never came). Once it materializes its pack (player present), the band is consumed. */
  presentSeconds: [number, number];
  /** Seconds the materialized pack PROWLS a zone (calm) before drifting off to an exit,
   *  looking for easier marks. Engaging them (a rouse) pauses + refills this, so a fight
   *  keeps them around; only a long-ignored pack moves on. */
  lingerSeconds: [number, number];
  /** Map-glyph ring size (cosmetic — the marching/arrival marker). */
  radius: number;
  faction: string;
  /** The pack's ROSTER + the level bonus. */
  roster: PackTableEntry[];
  levelBonus: number;
  /** A brigand within this of a player TURNS HOSTILE (the proximity rouse). MUST stay below
   *  the 'brigand' NEUTRAL_RESET.disengageDist (ai.ts) — else you can never out-run them to
   *  cool the band (aggro would re-fire inside the disengage band). */
  aggroRadius: number;
  /** When one brigand is roused, kin within this WAKE with it (the cohort turns). */
  rouseRadius: number;
  /** The raid flavours. */
  variants: BrigandVariant[];
  color?: string;
  /** Min node-distance origin→target (a real march in). */
  minSpan: number;
}

/** What the engine reads to drop the pack on the zone the band has reached. */
export interface BrigandInfo {
  id: string;
  faction: string;
  color: string;
  /** origin→target unit dir — the side the pack enters the zone from. */
  dir: MapCoord;
  packSize: number;
  aggroRadius: number;
  rouseRadius: number;
  variant: string;
}

interface ActiveBand {
  id: string;
  origin: MapCoord;
  target: MapCoord;
  targetZoneId: string;
  phase: 'muster' | 'march' | 'present';
  pos: MapCoord;             // the band's current map position (marches origin → target)
  musterLeft: number;
  presentLeft: number;       // linger-at-target countdown once arrived
  packSize: number;
  color: string;
  variant: string;
}

export class BrigandField implements WorldOverlay {
  readonly id = 'brigands';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: BrigandSurge;
  private bands: ActiveBand[] = [];
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: BrigandSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();

    // LIFECYCLE — muster ⇒ march toward the target node ⇒ present (linger, then disperse
    // if the player never showed). A band that materializes its pack is retire()'d early.
    for (let i = this.bands.length - 1; i >= 0; i--) {
      const b = this.bands[i];
      if (b.phase === 'muster') {
        b.musterLeft -= dt;
        if (b.musterLeft <= 0) b.phase = 'march';
      } else if (b.phase === 'march') {
        const dx = b.target.x - b.pos.x, dy = b.target.y - b.pos.y;
        const d = Math.hypot(dx, dy);
        if (d <= ARRIVE_DIST) {
          b.phase = 'present';
          b.presentLeft = this.rng.range(this.cfg.presentSeconds[0], this.cfg.presentSeconds[1]);
        } else {
          const step = Math.min(this.cfg.marchSpeed * dt, d);
          b.pos.x += (dx / d) * step; b.pos.y += (dy / d) * step;
        }
      } else {
        b.presentLeft -= dt;
        if (b.presentLeft <= 0) this.bands.splice(i, 1); // dispersed unseen
      }
    }

    // IGNITION — passively launch a fresh raid (gate + cap + ≥2 charted nodes).
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.bands.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  onNodeCharted(): void { /* raids target sampled coordinates, not freshly-charted ids */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // the pack is engine-spawned, not a table bias

  renderMap(): MapLayer {
    let over = '';
    for (const b of this.bands) {
      const col = b.color;
      if (b.phase === 'present') {
        // Arrived: a pulsing raid ring sitting on the struck zone.
        const tx = b.target.x.toFixed(1), ty = b.target.y.toFixed(1);
        over += `<circle cx="${tx}" cy="${ty}" r="${(this.cfg.radius * 0.5).toFixed(1)}" fill="none" stroke="${col}" stroke-width="2" stroke-opacity="0.9">`
          + `<animate attributeName="r" values="${(this.cfg.radius * 0.4).toFixed(1)};${this.cfg.radius.toFixed(1)};${(this.cfg.radius * 0.4).toFixed(1)}" dur="1.4s" repeatCount="indefinite"/></circle>`;
        continue;
      }
      // Marching (or mustering): a dashed line of march to the mark + a pointing arrowhead.
      const x = b.pos.x, y = b.pos.y, r = this.cfg.radius * 0.62;
      const ang = Math.atan2(b.target.y - y, b.target.x - x);
      over += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${b.target.x.toFixed(1)}" y2="${b.target.y.toFixed(1)}" `
        + `stroke="${col}" stroke-width="1.5" stroke-dasharray="3 5" stroke-opacity="0.8"/>`;
      const p0 = `${(x + Math.cos(ang) * r).toFixed(1)} ${(y + Math.sin(ang) * r).toFixed(1)}`;
      const p1 = `${(x + Math.cos(ang + 2.5) * r).toFixed(1)} ${(y + Math.sin(ang + 2.5) * r).toFixed(1)}`;
      const p2 = `${(x + Math.cos(ang - 2.5) * r).toFixed(1)} ${(y + Math.sin(ang - 2.5) * r).toFixed(1)}`;
      over += `<path d="M ${p0} L ${p1} L ${p2} Z" fill="${col}" stroke="#0a0a0e" stroke-width="0.5"/>`;
      over += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(this.cfg.radius * 0.9).toFixed(1)}" fill="none" stroke="${col}" stroke-width="1" stroke-opacity="0.5"/>`;
    }
    return { under: '', over };
  }

  // --- accessors the engine reads --------------------------------------------

  surge(): BrigandSurge { return this.cfg; }

  /** The band that has ARRIVED at this zone (its raid target) and not yet been consumed. */
  brigandOn(zoneId: string): BrigandInfo | null {
    const z = this.nodesById[zoneId];
    if (!z || !this.raidable(z)) return null;
    for (const b of this.bands) {
      if (b.phase !== 'present' || b.targetZoneId !== zoneId) continue;
      const dx = b.target.x - b.origin.x, dy = b.target.y - b.origin.y;
      const len = Math.hypot(dx, dy) || 1;
      return {
        id: b.id, faction: this.cfg.faction, color: b.color, dir: { x: dx / len, y: dy / len },
        packSize: b.packSize, aggroRadius: this.cfg.aggroRadius, rouseRadius: this.cfg.rouseRadius, variant: b.variant,
      };
    }
    return null;
  }

  /** A band MARCHING ON or arrived at this zone (any phase) — drives the zone-info tell. */
  bandTargeting(zoneId: string): { variant: string; color: string; present: boolean } | null {
    for (const b of this.bands) {
      if (b.targetZoneId === zoneId) return { variant: b.variant, color: b.color, present: b.phase === 'present' };
    }
    return null;
  }

  /** The engine calls this once it materializes a band's pack — clears the spent raid. */
  retire(id: string): void { this.bands = this.bands.filter(b => b.id !== id); }

  activeCount(): number { return this.bands.length; }

  /** Read-only snapshot for the map markers — one glyph per band at its current position. */
  peek(): ReadonlyArray<{ id: string; color: string; variant: string; x: number; y: number; present: boolean }> {
    return this.bands.map(b => ({
      id: b.id, color: b.color, variant: b.variant,
      x: b.phase === 'present' ? b.target.x : b.pos.x,
      y: b.phase === 'present' ? b.target.y : b.pos.y,
      present: b.phase === 'present',
    }));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: drop a band PRESENT on the player's current zone, so its pack lands at once. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.raidable(here)) return false;
    const origin = { x: here.map.x - 700, y: here.map.y - 120 };
    const b = this.makeBand(origin, here.map, here.id);
    b.phase = 'present'; b.pos = { x: here.map.x, y: here.map.y }; b.presentLeft = 9999; b.musterLeft = 0;
    this.bands.push(b);
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May a raid TARGET / strike this zone? */
  private raidable(z: ZoneDef): boolean {
    return !z.id.startsWith('cave_') && !z.special && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && eventAllowed('brigands', z);
  }

  private makeBand(origin: MapCoord, target: MapCoord, targetZoneId: string): ActiveBand {
    const v = this.rng.weighted(this.cfg.variants);
    return {
      id: `brigands_${this.seq++}`,
      origin: { x: origin.x, y: origin.y }, target: { x: target.x, y: target.y }, targetZoneId,
      phase: 'muster', pos: { x: origin.x, y: origin.y },
      musterLeft: this.rng.range(this.cfg.musterSeconds[0], this.cfg.musterSeconds[1]),
      presentLeft: 0,
      packSize: v.packSize,
      color: v.color ?? this.cfg.color ?? FACTION_COLORS[this.cfg.faction] ?? BRIGAND_RUST,
      variant: v.name,
    };
  }

  /** Muster a fresh raid at one charted zone, bound to STRIKE another (unanchored — outlaws
   *  raid anywhere, no biome blob needed). Both ends are visited so the march shows on the map. */
  private tryIgnite(view: OverlayView): void {
    const nodes = view.nodes.filter(n => view.visited.has(n.id) && this.raidable(n));
    if (nodes.length < 2) return;
    // ONE raid per zone at a time — a fresh band never targets a zone a live band already
    // claims (no double-pour / double-count); origin may still be any visited node.
    const taken = new Set(this.bands.map(b => b.targetZoneId));
    const targets = nodes.filter(n => !taken.has(n.id));
    if (!targets.length) return;
    const target = targets[this.rng.int(0, targets.length - 1)];
    let origin = nodes[this.rng.int(0, nodes.length - 1)];
    for (let t = 0; t < 6 && coordDist(origin.map, target.map) < this.cfg.minSpan; t++) {
      origin = nodes[this.rng.int(0, nodes.length - 1)];
    }
    if (coordDist(origin.map, target.map) < this.cfg.minSpan) return;
    this.bands.push(this.makeBand(origin.map, target.map, target.id));
  }
}

// --- map markers + zone-info (registered on import) ---------------------------
registerMarkerSource((world: World): MapMarker[] => {
  const bf = world.sim.brigandField;
  if (!bf) return [];
  return bf.peek().map(b => ({
    id: `brigands-${b.id}`, coord: { x: b.x, y: b.y },
    glyph: '⚔', fill: '#1c140a', stroke: b.color, text: '#f0d8a0', r: 7,
    title: b.present ? `Brigands — a ${b.variant} descends here` : `Brigands — a ${b.variant} marches`,
    fog: 'always', z: 16,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const t = world.sim.brigandField?.bandTargeting(zoneId);
  if (t) {
    const here = zoneId === world.zone.id;
    return [{
      kind: 'event', icon: '⚔', color: t.color, label: `Brigands · ${t.variant}`,
      detail: t.present
        ? (here ? 'a band of thieves prowls this ground — keep your distance or fight' : 'a band of thieves has fallen upon this ground')
        : 'a roving band of brigands marches on this ground',
      z: 15,
    }];
  }
  // The band retired the instant it struck, but its pack is still wandering the loaded zone —
  // keep the tell alive while the brigands are physically here (gone once they're all slain/drift off).
  if (zoneId === world.zone.id && world.actors.some(a => a.tag === 'brigand' && !a.dead)) {
    return [{
      kind: 'event', icon: '⚔', color: FACTION_COLORS['bandit'] ?? BRIGAND_RUST, label: 'Brigands',
      detail: 'a band of thieves prowls this ground — keep your distance or fight', z: 15,
    }];
  }
  return [];
});
