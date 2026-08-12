// ---------------------------------------------------------------------------
// THE CONNECTIVE TISSUE (seamless-world M0) — the between-zones country
// synthesized from the global fields, at gameplay grain.
//
// Charter law 2 (docs/design/seamless-world.md): zones stay authored PLACES
// embedded in tissue poured from the global fields — this module is the pour.
// `buildTissueSampler(world)` closes over the world's CURRENT zone graph
// (roads only) and answers the TissueSampler contract (world/seamless.ts):
// walkable / tone / road, pure f(graph, worldSeed, x, y).
//
// THE PURITY LAW: the graph is captured ONCE at build time (segment list +
// spatial bins — pure graph geometry, seed-independent), and every field read
// (continents, relief, biome) is pure seed math off the PASSED worldSeed — so
// two samplers built off the same world answer byte-identically forever, and
// any internal cache is invisible (same answers cached or cold; the segment
// bins are exactly that). M0's fixture graph is STATIC by design: this module
// guarantees each build is honest to its capture, and M1 revisits graph-growth
// invalidation (a grown web wants a rebuilt sampler — the placement lane owns
// WHEN to rebuild; a stale sampler is never wrong about the graph it captured,
// merely blind to ground charted after it).
//
// INSTALL IS NOT HERE: the placement lane calls setTissueSampler — this
// module only exports the builder, so the null seam stays the placement
// lane's to open and the sim rigs' to leave shut.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import { SEAMLESS_CFG, type TissueSample, type TissueSampler } from './seamless';
import { mapToPx, pxToMap } from './coords';
import { BIOMES, OCEAN_BIOME, biomeAt } from './biomes';
import { elevationAt } from './relief';

/** M0 tissue dials — ALL FLAGGED (unblessed; her word moves them).
 *  `slopeStepUnits` is the ±1 lattice step of the brief (one node unit — the
 *  map lattice's own grain). `slopeMax` was calibrated 2026-08-12 over three
 *  seeds (±6000-unit land windows): the elevation field's per-unit slope is
 *  naturally BIMODAL — p99 of land reads ≈0.0013/unit while a discrete cliff
 *  class (~0.52% of land, the ridge creases + coastal steps) jumps past
 *  0.008 with nothing in between — so 0.004 sits mid-gap and the cliff share
 *  is threshold-insensitive across 0.002..0.008. `fallbackTone` only speaks
 *  if a biome id ever resolves to no BiomeInfo (boot validation forbids it). */
export const TISSUE_CFG = {
  slopeStepUnits: 1,
  slopeMax: 0.004,
  fallbackTone: '#3d4351',
} as const;

/** One road segment between two linked nodes' seats, in world px. */
interface RoadSeg { ax: number; ay: number; bx: number; by: number }

/** Squared distance from a point to a segment (the ribbon test's kernel). */
function segDistSq(px: number, py: number, s: RoadSeg): number {
  const dx = s.bx - s.ax, dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = s.ax + dx * t, qy = s.ay + dy * t;
  return (px - qx) * (px - qx) + (py - qy) * (py - qy);
}

/**
 * Build a TissueSampler off this world's CURRENT zone graph. Export-only:
 * nothing here installs it (setTissueSampler is the placement lane's call).
 *
 * - walkable: the sea grows no tissue (open ocean → false — read off the SAME
 *   lane as tone: biomeAt answers OCEAN_BIOME exactly when continentAt says
 *   ocean, biomes.ts's own landmass-layer law, so drawn and tested agree by
 *   construction; a 'bridge' cell is the walkable isthmus by continents.ts's
 *   own design). Relief steeper than TISSUE_CFG.slopeMax per node unit
 *   (centered ±slopeStepUnits read of elevationAt — relief.ts, THE elevation
 *   read) → false. Roads are ALWAYS walkable.
 * - tone: the biome the MINT PATH would read at this ground — biomeAt(coord,
 *   seed), the exact lane BiomeField.sampleBiome delegates to and worldgen's
 *   biomeFor consumes (world.ts) — colored by that biome's own
 *   BiomeInfo.mapColor, the SAME tint the world-map wash paints its cells
 *   with (BiomeField.renderMap), so M0 tissue and the map pane agree by
 *   construction. M2 replaces the flat tone with real theme dress.
 * - road: within SEAMLESS_CFG.roadHalfPx of the segment between two LINKED
 *   surface nodes' mapToPx seats (the graph's exits, both directions deduped;
 *   '?' frontiers have no far seat yet and cross-dimension ways are gates,
 *   not ground). TODO(M0-honest): a road segment may cross open water (a
 *   port's causeway link) and reads walkable over it — real causeway ground
 *   and shore honesty are M2's.
 */
export function buildTissueSampler(world: World): TissueSampler {
  // --- THE CAPTURE: linked surface pairs → road segments in world px.
  const zoneMap = world.zoneMap;
  const segs: RoadSeg[] = [];
  const seen = new Set<string>();
  for (const z of Object.values(zoneMap)) {
    if ((z.dimension ?? 'surface') !== 'surface') continue;
    for (const e of z.exits) {
      if (e.to === '?' || e.crossDim) continue;
      const dest = zoneMap[e.to];
      if (!dest || (dest.dimension ?? 'surface') !== 'surface') continue;
      const key = z.id < e.to ? `${z.id}|${e.to}` : `${e.to}|${z.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const a = mapToPx(z.map), b = mapToPx(dest.map);
      segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
  }

  // --- Spatial bins at the chunk grain (SEAMLESS_CFG.chunkPx): each segment
  // registered into every chunk cell its ribbon-inflated bbox touches, so a
  // sample consults only its own cell's list. Pure build-time geometry — the
  // invisible-cache law holds trivially (no per-call state ever mutates).
  const span = SEAMLESS_CFG.chunkPx, pad = SEAMLESS_CFG.roadHalfPx;
  const bins = new Map<string, RoadSeg[]>();
  for (const s of segs) {
    const x0 = Math.floor((Math.min(s.ax, s.bx) - pad) / span);
    const x1 = Math.floor((Math.max(s.ax, s.bx) + pad) / span);
    const y0 = Math.floor((Math.min(s.ay, s.by) - pad) / span);
    const y1 = Math.floor((Math.max(s.ay, s.by) + pad) / span);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const k = `${gx},${gy}`;
        let arr = bins.get(k);
        if (!arr) bins.set(k, arr = []);
        arr.push(s);
      }
    }
  }
  const ribbonSq = pad * pad;
  const onRoad = (x: number, y: number): boolean => {
    const arr = bins.get(`${Math.floor(x / span)},${Math.floor(y / span)}`);
    if (!arr) return false;
    for (const s of arr) if (segDistSq(x, y, s) <= ribbonSq) return true;
    return false;
  };

  return (x: number, y: number, worldSeed: number): TissueSample => {
    const seed = worldSeed >>> 0;
    const c = pxToMap({ x, y });
    const road = onRoad(x, y);
    // THE MINT LANE: the same biome a zone minted here would wear.
    const biome = biomeAt(c, seed);
    const tone = BIOMES[biome]?.mapColor ?? TISSUE_CFG.fallbackTone;
    let walkable = true;
    if (!road) {
      if (biome === OCEAN_BIOME) {
        walkable = false; // the sea grows no tissue
      } else {
        const h = TISSUE_CFG.slopeStepUnits;
        const gx = elevationAt({ x: c.x + h, y: c.y }, seed) - elevationAt({ x: c.x - h, y: c.y }, seed);
        const gy = elevationAt({ x: c.x, y: c.y + h }, seed) - elevationAt({ x: c.x, y: c.y - h }, seed);
        if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) walkable = false;
      }
    }
    return { walkable, tone, road };
  };
}
