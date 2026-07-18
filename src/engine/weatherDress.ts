// ---------------------------------------------------------------------------
// WEATHER DRESS — temporary ground set-dressing laid by the sky (the second
// presentation lane of the transience doctrine; docs/engine/transience.md).
//
// Any weather kind may declare a DRESS kit (WeatherDef.dress): doodad rows the
// world PLANTS over a covered zone while the front holds, and DISSOLVES
// (Doodad.evap — the generic drying fabric) as it passes. Nothing persists:
// dress doodads are runtime-only (never in zone memory, never in layouts), so
// a revisit after the front has moved on finds the land exactly as authored.
// The debut kit is the Demon Storm's occupation dress (hell fins, legion
// banners, ember fissures) — the Helltide read: the event FLAVORS the land it
// borrows and hands every piece back.
//
// Split of duties (the fog/creep discipline):
//  - THIS module: the config, the resolved plan, and the PURE piece-roller
//    (seeded rng + a caller-supplied spot predicate → deterministic pieces).
//  - World.updateWeatherDress: the ~1s reconcile glue — reads skyFront (so
//    shelter, crossfade and event pins are already folded), plants when the
//    displayed kind wants dress, evaporates when it no longer does. Presence
//    is derived from the tagged doodads themselves (Doodad.weatherDress), so
//    the reconcile is idempotent across zone hops, HMR and resumed visits.
// ---------------------------------------------------------------------------

import type { Rng } from '../core/rng';
import { WEATHER_DEFS, type WeatherDressRow, type WeatherDressSpec } from '../world/weather';

export const WEATHER_DRESS_CFG = {
  /** Reconcile cadence (seconds) — planting/dissolving is a beat, not a frame. */
  cadenceSec: 1,
  /** Displayed-intensity gates: plant at/above, dissolve below. The hysteresis
   *  band keeps a rim-grazing front from churning dress in and out. */
  plantAbove: 0.25,
  fadeBelow: 0.1,
  /** Default dissolve speed (radius units/sec) — a fin sinks away in ~1s. */
  evapRate: 22,
  /** Default spacing between pieces of one row. */
  minGap: 130,
  /** Cross-row soft spacing (half a minGap keeps kits from clumping). */
  crossGap: 60,
  /** Placement clearances: exit portals / the waypoint / the player. */
  portalClear: 150,
  playerClear: 120,
  /** Arena-edge inset. */
  edgeInset: 70,
  /** Hard cap on pieces per zone across all rows (perf + readability belt). */
  maxPieces: 22,
  /** Rejection-sampling attempts per wanted piece. */
  triesPerPiece: 12,
  /** Solid rows probe a walkable ring this far beyond the seat radius so a
   *  planted solid can never plug a lane (belt — clearances do most of it). */
  solidRingProbe: 20,
  /** Seed salt for the per-zone, per-kind dress stream (never the layout's). */
  salt: 0x77d0e55e,
} as const;

/** A dress plan with every default folded — null when the kind dresses nothing. */
export interface WeatherDressPlan {
  rows: WeatherDressRow[];
  plantAbove: number;
  fadeBelow: number;
  evapRate: number;
}

export function dressPlanFor(kind: string): WeatherDressPlan | null {
  const spec: WeatherDressSpec | undefined = WEATHER_DEFS[kind]?.dress;
  if (!spec || !spec.rows.length) return null;
  return {
    rows: spec.rows,
    plantAbove: spec.plantAbove ?? WEATHER_DRESS_CFG.plantAbove,
    fadeBelow: spec.fadeBelow ?? WEATHER_DRESS_CFG.fadeBelow,
    evapRate: spec.evapRate ?? WEATHER_DRESS_CFG.evapRate,
  };
}

export interface DressPiece {
  row: WeatherDressRow;
  x: number;
  y: number;
  r: number;
  rot: number;
}

/** Roll a plan's pieces — PURE: same rng stream + same predicate answers =
 *  the same pieces (the caller seeds per zone+kind, so a front re-covering a
 *  zone re-plants the same dress it laid last time). `ok` carries the world's
 *  private truth (walk mesh, solids, portals, the player's feet). Counts scale
 *  from count[0] toward count[1] with intensity; the global cap is a belt. */
export function rollDressPieces(
  rng: Rng, plan: WeatherDressPlan, intensity: number,
  bounds: { w: number; h: number },
  ok: (x: number, y: number, r: number, row: WeatherDressRow) => boolean,
): DressPiece[] {
  const out: DressPiece[] = [];
  const inset = WEATHER_DRESS_CFG.edgeInset;
  const k = Math.max(0, Math.min(1, intensity));
  for (const row of plan.rows) {
    if (out.length >= WEATHER_DRESS_CFG.maxPieces) break;
    const want = Math.round(row.count[0] + (row.count[1] - row.count[0]) * k);
    const gap = row.minGap ?? WEATHER_DRESS_CFG.minGap;
    let placed = 0;
    for (let i = 0; i < want * WEATHER_DRESS_CFG.triesPerPiece && placed < want; i++) {
      if (out.length >= WEATHER_DRESS_CFG.maxPieces) break;
      const x = rng.range(inset, Math.max(inset + 1, bounds.w - inset));
      const y = rng.range(inset, Math.max(inset + 1, bounds.h - inset));
      const r = rng.range(row.radius[0], row.radius[1]);
      let clear = true;
      for (const p of out) {
        const need = p.row === row ? gap : WEATHER_DRESS_CFG.crossGap;
        if (Math.hypot(p.x - x, p.y - y) < need) { clear = false; break; }
      }
      if (!clear || !ok(x, y, r, row)) continue;
      out.push({ row, x, y, r, rot: rng.range(0, Math.PI * 2) });
      placed++;
    }
  }
  return out;
}
