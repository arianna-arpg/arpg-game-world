// ---------------------------------------------------------------------------
// FIELD REGION — the contiguous Field heat-map blob, computed from biomeAt.
//
// The biome field (biomes.ts) is a pure per-coordinate sampler with no notion of
// "regions". A FIELD mega-zone wants exactly that: the ENTIRETY of the contiguous
// Field blob a mint sits in, so the zone IS the heat-map shape. This leaf computes
// it by flood-filling biomeAt over a fixed world-anchored lattice:
//
//   • fieldRegionAt(coord, seed) — the connected Field cells' bbox + a CANONICAL id
//     (the same region floods identically from any entry coord → mint-once key) +
//     the node→pixel SCALE that sizes the (large) arena.
//   • isFieldPixel(field, px, py) — re-sample the SAME raw biomeAt for an in-zone
//     pixel, so the layout generator rasterizes the EXACT silhouette and placeExit
//     can snap portals to the blob's edge.
//
// Pure: imports only the biome sampler + the coord type. Deterministic for a fixed
// seed (raw biomeAt — warp-blind, so a later field WARP never reshapes a minted zone).
// ---------------------------------------------------------------------------

import { biomeAt } from './biomes';
import type { FieldRegion } from '../data/zones';
import type { MapCoord } from './coords';

export const FIELD_BIOME = 'field';

/** Tunables for the region→arena mapping (modular, not scattered literals). The blob
 *  is sized so the FIELD itself renders large and fills most of the arena, with only a
 *  thin pixel hedge-frame around it — a wide, walkable expanse, not a hedge maze. */
export const FIELD_GEN = {
  /** Flood-fill granularity in node units. FINER than a Voronoi cell (~260) so a region
   *  captures the FULL blob — its node-space bbox then matches the heat-map wash on the map
   *  (the node truly SPANS the region) and the arena sizes to the real extent. */
  step: 35,
  /** Safety cap on flooded Field cells. MUST stay FAR above any real region's cell count
   *  (one Voronoi cell ≈ 50 cells at step 35; a few cells ≈ a few hundred). Truncating
   *  mid-flood would make the canonical regionId (the bbox min cell) ENTRY-DEPENDENT and
   *  break mint-once (a region reached from 8 frontier directions must always hash the same).
   *  20000 ≈ a 26×26-Voronoi-cell mega-region — never reached in practice, so the only effect
   *  is a hard ceiling on a pathological flood; the ARENA size is capped separately (above). */
  maxCells: 20000,
  /** THE SHARD LAW — the most lattice cells ONE expanse zone may span per axis.
   *  A merged multi-Voronoi mega-blob used to become a single node claiming an
   *  absurd stretch of the chart (an "enormous" Fields swallowing whole
   *  countries of map). The flood now runs inside a fixed world-anchored MACRO
   *  WINDOW of this many cells (12 × step 35 = 420 node units ≈ 5 cardinal
   *  steps): a blob bigger than the window becomes a CHAIN of adjoining
   *  expanse zones — each shard's flood is still entry-independent (any entry
   *  cell inside the same window floods the same constrained component), so
   *  mint-once holds per shard, and neighbouring shards meet through the
   *  ordinary boundary-frontier law (the expanses link like country). */
  maxSpanCells: 12,
  /** THE DWARF FLOOR — a region must span at least this many cells on BOTH
   *  axes to become an EXPANSE at all. A 1-cell blob (35u) or a 1-wide
   *  ribbon minted as a mega-zone whose core rect is SMALLER than the map's
   *  hover floor: the footprint law had nothing to protect, the hub law
   *  nothing to spread, and a neighbour standing "inside" the rect
   *  deadlocked the settling (the tiny-rect trap, measured live at 30u).
   *  Below the floor the ground mints as ORDINARY country — the field
   *  layout's no-extent fallback still draws it as an inscribed meadow. */
  minSpanCells: 3,
  /** THE HUB SPREAD — the boundary frontier fractions a Field zone deals per
   *  side (world.fieldifyZone): 2 per cardinal side at these 'at' stops, and a
   *  map BERTH stamped at each so roads land on the blob's edge (the
   *  soulriver's many-mouthed law) instead of converging on the node's dot. */
  hubSpread: [0.3, 0.7],
  /** Target render size (px) of the FIELD's long axis, and the scale clamp. A small
   *  sliver gets scaled UP toward this (so it still reads as a big expanse); a large
   *  contiguous region keeps more heat-map boundary detail at a lower scale. */
  targetFieldPx: 4600,
  minScale: 3,
  /** maxScale governs the SMALLEST regions: a lone 1-cell Field patch (~35 node) still
   *  scales up to a substantial ~3000px expanse (35×68+frame). Multi-cell regions sit well
   *  below this (their own targetFieldPx/extent), so they keep an organic boundary. */
  maxScale: 68,
  /** Hard ceiling on the FIELD's long axis (px) so a huge region stays traversable
   *  (overrides minScale — a sprawling region simply renders at a finer scale). */
  hardFieldPx: 5200,
  /** A fixed PIXEL hedge-frame around the field (so the margin doesn't blow up with
   *  scale the way a node-space pad would). The off-blob silhouette lives in here. */
  padPx: 320,
} as const;

export interface FieldExtent {
  /** Canonical id of the contiguous region (mint-once key). */
  regionId: string;
  /** Node-space coordinate the arena's (0,0) maps to (field bbox top-left minus the pad). */
  originX: number;
  originY: number;
  /** Pixels per node unit. */
  scale: number;
  /** Arena size in pixels (field extent * scale + the pixel hedge-frame). */
  sizeW: number;
  sizeH: number;
  /** Node-space footprint of the (padded) region — so the MAP can draw the node SPANNING
   *  the whole blob, and frontier targets project from the region BOUNDARY (not the point).
   *  Equal to sizeW/scale, sizeH/scale; stored so consumers needn't redo the division. */
  nodeW: number;
  nodeH: number;
}

/** Flood-fill the contiguous Field region containing `coord` (4-connected over the
 *  fixed world-anchored lattice), returning its bbox + canonical id + arena sizing.
 *  Null when `coord` is not on Field ground. */
export function fieldRegionAt(coord: MapCoord, seed: number): FieldExtent | null {
  const S = FIELD_GEN.step;
  const cellIsField = (gx: number, gy: number): boolean =>
    biomeAt({ x: (gx + 0.5) * S, y: (gy + 0.5) * S }, seed) === FIELD_BIOME;

  const sgx = Math.floor(coord.x / S), sgy = Math.floor(coord.y / S);
  // The mint coord must be on Field (the start cell center, or the exact coord at a
  // ragged region edge) — else there's no Field region here.
  if (!cellIsField(sgx, sgy) && biomeAt(coord, seed) !== FIELD_BIOME) return null;

  // THE SHARD WINDOW (maxSpanCells): the flood is confined to the fixed macro
  // cell the START cell sits in — world-anchored, so every entry inside the
  // same window floods the same constrained component (entry-independent per
  // shard; a mega-blob becomes a CHAIN of window-sized expanses).
  const MS = FIELD_GEN.maxSpanCells;
  const wx0 = Math.floor(sgx / MS) * MS, wy0 = Math.floor(sgy / MS) * MS;
  const inWindow = (gx: number, gy: number): boolean =>
    gx >= wx0 && gx < wx0 + MS && gy >= wy0 && gy < wy0 + MS;

  const seen = new Set<string>([`${sgx},${sgy}`]);
  const queue: { gx: number; gy: number }[] = [{ gx: sgx, gy: sgy }];
  let minX = sgx, maxX = sgx, minY = sgy, maxY = sgy, count = 0;
  while (queue.length && count < FIELD_GEN.maxCells) {
    const c = queue.shift()!;
    if (!inWindow(c.gx, c.gy)) continue;    // beyond the shard window — the next shard's ground
    if (!cellIsField(c.gx, c.gy)) continue; // boundary cell — don't count or expand
    count++;
    if (c.gx < minX) minX = c.gx; if (c.gx > maxX) maxX = c.gx;
    if (c.gy < minY) minY = c.gy; if (c.gy > maxY) maxY = c.gy;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const k = `${c.gx + dx},${c.gy + dy}`;
      if (!seen.has(k)) { seen.add(k); queue.push({ gx: c.gx + dx, gy: c.gy + dy }); }
    }
  }
  // Ragged edge: the start cell center wasn't Field but the coord was — a 1-cell region.
  if (count === 0) { minX = maxX = sgx; minY = maxY = sgy; }

  // THE DWARF FLOOR: too small on either axis to be an expanse — the caller
  // mints ORDINARY country here (the same null as non-Field ground).
  if (maxX - minX + 1 < FIELD_GEN.minSpanCells || maxY - minY + 1 < FIELD_GEN.minSpanCells) return null;

  // The FIELD's own (unpadded) node extent drives the scale, so the meadow — not the
  // hedge frame — is what gets sized up to fill the arena.
  const fieldNodeW = (maxX - minX + 1) * S;
  const fieldNodeH = (maxY - minY + 1) * S;
  const fieldLong = Math.max(fieldNodeW, fieldNodeH);
  let scale = Math.max(FIELD_GEN.minScale, Math.min(FIELD_GEN.maxScale, FIELD_GEN.targetFieldPx / fieldLong));
  if (fieldLong * scale > FIELD_GEN.hardFieldPx) scale = FIELD_GEN.hardFieldPx / fieldLong; // huge region → finer
  const padNode = FIELD_GEN.padPx / scale;
  const sizeW = Math.round(fieldNodeW * scale + 2 * FIELD_GEN.padPx);
  const sizeH = Math.round(fieldNodeH * scale + 2 * FIELD_GEN.padPx);
  return {
    regionId: `field_${minX}_${minY}`,
    originX: minX * S - padNode,
    originY: minY * S - padNode,
    scale, sizeW, sizeH,
    nodeW: sizeW / scale, nodeH: sizeH / scale,
  };
}

/** The biome at an in-zone PIXEL of a Field zone — re-samples the exact raw biomeAt
 *  the region was minted from (warp-blind, stable), so the rasterized blob is the
 *  true heat-map silhouette and portal snapping lands on the real edge. */
export function fieldBiomeAtPixel(f: FieldRegion, px: number, py: number): string {
  return biomeAt({ x: f.originX + px / f.scale, y: f.originY + py / f.scale }, f.seed);
}

/** Is an in-zone pixel inside the Field blob (a walkable Field cell)? */
export function isFieldPixel(f: FieldRegion, px: number, py: number): boolean {
  return fieldBiomeAtPixel(f, px, py) === FIELD_BIOME;
}

/** THE CORE RECT — a Field zone's node-space footprint with the pixel hedge
 *  frame stripped back off (the pad is arena dressing, not claimed country).
 *  This is the rect the FOOTPRINT LAW reads: mints keep their spacing from it,
 *  no both-ends-outside road may cut across it, and the mint-once containment
 *  fallback (old saves whose regionId predates the shard law) matches inside
 *  it. `size` backstops a pre-nodeW save (nodeW = size.w / scale). Pure. */
export function fieldCoreRect(
  f: FieldRegion, size: { w: number; h: number },
): { x0: number; y0: number; x1: number; y1: number } {
  const nodeW = f.nodeW ?? size.w / f.scale;
  const nodeH = f.nodeH ?? size.h / f.scale;
  const pad = FIELD_GEN.padPx / f.scale;
  return {
    x0: f.originX + pad, y0: f.originY + pad,
    x1: f.originX + nodeW - pad, y1: f.originY + nodeH - pad,
  };
}
