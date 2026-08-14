// ---------------------------------------------------------------------------
// THE CONNECTIVE TISSUE (seamless-world M0, re-scoped M1.5) — the country
// between and around the zones, synthesized at gameplay grain.
//
// Charter law 2 as AMENDED by the partition law (docs/design/seamless-world.md
// §M1.5): the map's nodes claim non-overlapping CELLS (world/cells.ts — ONE
// fold, the fitted mint's own), and the tissue re-scopes from
// country-between-places to THE BORDER BLEND — every sample's tone belongs to
// somebody: a cell's ground wears its OWN zone's tone out to the border (a
// wide cell's margin is its own outskirts, never no-man's-land), within
// PARTITION_CFG.blendBandPx of a border the two zones' tones gradient into
// each other (the meld fabric's edge-band grammar at world grain —
// data/melds.ts grows a ~250px band of the foreign kit along a melded edge;
// blendBandPx is that band's world-grain twin), and the unclaimed WEDGES the
// axis-cut fold opens at triple points blend their nearest cells' tones.
// The raw biome-field tone — the no-man's lavender — survives only as the
// zero-cells fallback and as THE SHORE EXCEPTION (below).
//
// THE GRADIENT SHAPE (flagged; her eye owed): a SMOOTH LERP over the cells'
// tones, not a position-hash dither. The meld grammar realizes its band as
// discrete foreign STAMPS — ferns pressing through the treeline — but a
// flat fill has no kit vocabulary to scatter: at the draw lane's 30px
// lattice a two-tone dither reads as noise, a wash reads as country changing
// hands. M2's real theme dress inherits the true stamp-dither grammar; the
// flat tissue takes the honest wash. The lerp also keeps the TissueSample
// contract UNCHANGED (tone arrives pre-resolved — the draw lane needs no new
// field and no edit) and makes the gradient per-sample monotonic, so the
// probe pins it directly.
//
// THE ONE WEIGHT LAW (total + continuous by construction): for a sample at
// p, every captured cell i contributes wᵢ = max(0, 1 − (dᵢ − dmin)/band)
// where dᵢ = euclidean distance from p to cell i's rect (0 inside) and
// dmin = min dᵢ; tone = Σwᵢ·toneᵢ / Σwᵢ. One formula serves every regime —
// no containment special case, no seams between laws:
//   · deep inside a cell: dmin = 0 (own), every neighbor > band ⇒ pure own;
//   · at a shared border: both sides read d = 0 ⇒ the exact 50/50 mix, and
//     the mix slides monotonically to pure own by band's reach — continuous
//     ACROSS the border because rect distance is continuous through it;
//   · at a triple-point corner: equal thirds, continuous from every side;
//   · in a wedge (no cell): the nearest cell anchors at weight 1 and the
//     next blends by how much FARTHER it is — the nearest-pair gradient the
//     partition law asks of interstices, with no all-zero hole for a deep
//     wedge to fall through (Σw ≥ 1 always);
//   · in clamp-separated remainder country (a long link): each half wears
//     its own zone's outskirts tone with a band-wide meet at the spine.
// THE SHORE EXCEPTION: ocean ground (the SAME biomeAt read the walkable lane
// refuses on) keeps the sea's own mapColor — the sea is nobody's outskirts,
// a cell's claim stops at the shore, and drawn == tested keeps riding one
// read. Cliff-class land inside a cell wears the cell's (blended) tone; the
// draw lane's non-walkable darkening does the rest.
//
// THE PURITY LAW (unchanged in kind, grown in scope): the capture happens
// ONCE at build time — the road segments + spatial bins (pure graph
// geometry), and now THE CELL CAPTURE: the partition fold over the same
// web's surface seats (foldCells — pure f(seats), the fitted mint's own
// derivation, so the blend and the mint can never disagree about WHERE a
// zone's ground ends) plus each cell's tone source (ZoneDef.biome — the
// zone's own minted identity, graph data like the segments; a def without
// one falls back to the biome field AT ITS SEAT, read lazily off the
// PASSED worldSeed through a per-seed memo — invisible by the same law:
// same (graph, seed) → same answers forever, cached or cold). M0's note
// stands: a stale sampler is never wrong about the graph it captured,
// merely blind to ground charted after it; the placement lane owns WHEN
// to rebuild.
//
// THE CELL ROSTER (flagged): cells fold over the PARTITION'S surface web —
// dimension 'surface', no caveDepth, no pocket, no floating (probe_cells'
// own roster: the seats that claim ground on the surface plane; interiors
// and pockets stay portal'd by charter and claim none). The ROAD capture
// keeps its wider dimension-only filter unchanged — roads are the graph's
// ways, cells are its ground claims. '?' frontiers have no def, no seat, no
// cell — every captured cell is a MINTED zone's by construction.
//
// INSTALL IS NOT HERE: the placement lane calls setTissueSampler — this
// module only exports the builder, so the null seam stays the placement
// lane's to open and the sim rigs' to leave shut.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { ZoneDef } from '../data/zones';
import { Rng } from '../core/rng';
import { PORTAL_EDGE_INSET } from '../engine/worldgen';
import { MASSDRESS_CFG, ROADDRESS_CFG, ROAD_TONE_DEFAULT, WAYSIDE_GLYPHS, massKitFor } from '../data/enclosure';
import { PARTITION_CFG, SEAMLESS_CFG, type CellRect, type TissueSample, type TissueSampler } from './seamless';
import { borderAgreedPoint, foldCells, type CellSeat } from './cells';
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
 *  if a biome id ever resolves to no BiomeInfo (boot validation forbids it).
 *  The blend band's width is NOT here — PARTITION_CFG.blendBandPx is the
 *  contract file's dial (flagged there); this module only consumes it. */
export const TISSUE_CFG = {
  slopeStepUnits: 1,
  slopeMax: 0.004,
  fallbackTone: '#3d4351',
} as const;

/** One road segment of a linked pair's ROUTED way, in world px — the
 *  ribbon's own spine (M2 wave 8b: a pair contributes one chord, an agreed
 *  two-piece bend, or a seat+mouth elbow polyline — the capture carries the
 *  routing law). PUBLIC (M2 wave 8): the road-face painter consumes the
 *  capture's segments through the carried read (roadSegsForChunk), so the
 *  drawn ribbon and the walkable verdict share ONE geometry. */
export interface TissueRoadSeg { ax: number; ay: number; bx: number; by: number }
type RoadSeg = TissueRoadSeg;

/** Squared distance from a point to a segment (the ribbon test's kernel). */
function segDistSq(px: number, py: number, s: RoadSeg): number {
  const dx = s.bx - s.ax, dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = s.ax + dx * t, qy = s.ay + dy * t;
  return (px - qx) * (px - qx) + (py - qy) * (py - qy);
}

/** Parse a #rgb/#rrggbb hex into [r,g,b]; null on anything else (a captured
 *  tone that fails falls back to TISSUE_CFG.fallbackTone's channels). */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const s = m[1];
  if (s.length === 3) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  }
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function formatHex(r: number, g: number, b: number): string {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Build a TissueSampler off this world's CURRENT zone graph. Export-only:
 * nothing here installs it (setTissueSampler is the placement lane's call).
 *
 * - walkable: THE SOLID BETWEEN (M2 wave 5 — her enclosure doctrine, item 3:
 *   "massive gaps between zones… filled in as untraversable walls colored
 *   per the bounding biomes"). OUTSIDE every cell, walkable ground narrows
 *   to the PASSAGE CORRIDORS — the road ribbon (as before) plus a MOUTH
 *   APRON (PARTITION_CFG.mouthApronPx) around each agreed border point
 *   between two resident-eligible linked cells; wedges and long-link
 *   remainder country beyond the corridors REFUSE, wearing the blend's
 *   tones as impassable mass (the draw lane already leans non-walkable
 *   ground dark — the look follows free; real mass dress is later M2).
 *   This AMENDS M0's open-tissue law deliberately — the world reads as
 *   zones joined by passes, never featureless country. INSIDE a cell the
 *   old law stands (the ground belongs to its zone; when resident, the
 *   zone's own grid rules through the rim verdict, and the ring admits
 *   the zone before deep entry). The standing refusals are untouched and
 *   rank ABOVE the corridor law: the sea grows no tissue (open ocean →
 *   false — read off the SAME lane as the shore exception: biomeAt answers
 *   OCEAN_BIOME exactly when continentAt says ocean, biomes.ts's own
 *   landmass-layer law, so drawn and tested agree by construction; a
 *   'bridge' cell is the walkable isthmus by continents.ts's own design),
 *   and relief steeper than TISSUE_CFG.slopeMax per node unit (centered
 *   ±slopeStepUnits read of elevationAt — relief.ts, THE elevation read)
 *   → false. Roads alone are ALWAYS walkable (M0's honest TODO stands).
 * - tone: THE BORDER BLEND (module header carries the law) — the sample's
 *   cell's own zone tone, gradiented with its neighbors inside the blend
 *   band, nearest-pair blended in wedges; ocean keeps the sea's own
 *   mapColor; the raw field tone speaks only when the capture holds no
 *   cells at all. A zone's tone is BIOMES[def.biome].mapColor — the same
 *   tint the world-map wash paints that zone's country with — falling back
 *   to the field at its seat when the def carries no biome (Lastlight and
 *   authored kin).
 * - road: within SEAMLESS_CFG.roadHalfPx of THE ROUTED WAY between two
 *   LINKED surface nodes (the graph's exits, both directions deduped; '?'
 *   frontiers have no far seat yet and cross-dimension ways are gates, not
 *   ground). M2 wave 8b: the way is a POLYLINE through the pair's true
 *   crossing — the agreed border point where the cells abut, the door
 *   seats + rim mouths where a tissue strip lies between (the capture
 *   block carries the law); pairs no pairing applies to keep the bare
 *   center-to-center chord. TODO(M0-honest): a road piece may cross open
 *   water (a port's causeway link) and reads walkable over it — real
 *   causeway ground and shore honesty are M2's.
 */
export function buildTissueSampler(world: World): TissueSampler {
  const zoneMap = world.zoneMap;

  // --- THE CELL CAPTURE: the partition fold over the same web's surface
  // seats (the roster the module header states), flattened for the per-
  // sample scan. Hoisted above the road capture (M2 wave 8b): THE ROUTED
  // WAY below consults the fold's cells. Tones resolve per cell: a minted
  // def.biome is captured seed-independent NOW; a def without one marks a
  // lazy seat-field read (per-seed memo below — the invisible-cache law).
  const cellZones = Object.values(zoneMap).filter(z =>
    (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket && !z.floating);
  const cellSeats: CellSeat[] = cellZones.map(z => ({ id: z.id, ...mapToPx(z.map) }));
  const fold = foldCells(cellSeats);
  const nCells = cellSeats.length;
  const cx0 = new Float64Array(nCells), cy0 = new Float64Array(nCells);
  const cx1 = new Float64Array(nCells), cy1 = new Float64Array(nCells);
  /** Seed-independent tone hex per cell, or null = lazy seat-field tone. */
  const mintedTone: (string | null)[] = new Array(nCells);
  /** Seat map coord per cell (the lazy lane's biomeAt argument). */
  const seatCoord: { x: number; y: number }[] = new Array(nCells);
  /** Cell identity + mint provenance (THE MASS-DRESS READ's flank voice —
   *  massKitFor keys on the tileset a flanking zone minted from). */
  const cellIds: string[] = new Array(nCells);
  const cellTileset: (string | undefined)[] = new Array(nCells);
  /** THE ROAD-TONE CAPTURE (M2 wave 8): each cell's own drawn-road color —
   *  the zone theme's `road` lane, the road doodad's exact resolveColor
   *  ladder ('theme:road|#574f44'), so the tissue ribbon continues in the
   *  SAME color the zone's own gravel wears. Seed-independent minted data,
   *  parsed once (rgb triples for the weight fold). */
  const cellRoadRgb = new Float64Array(nCells * 3);
  const roadDefaultRgb = parseHex(ROAD_TONE_DEFAULT)!;
  for (let i = 0; i < nCells; i++) {
    const z = cellZones[i];
    const c = fold.get(z.id)!;
    cx0[i] = c.x0; cy0[i] = c.y0; cx1[i] = c.x1; cy1[i] = c.y1;
    mintedTone[i] = (z.biome && BIOMES[z.biome]?.mapColor) || null;
    seatCoord[i] = z.map;
    cellIds[i] = z.id;
    cellTileset[i] = z.tileset;
    const rr = (z.theme?.road && parseHex(z.theme.road)) || roadDefaultRgb;
    cellRoadRgb[i * 3] = rr[0]; cellRoadRgb[i * 3 + 1] = rr[1]; cellRoadRgb[i * 3 + 2] = rr[2];
  }

  // --- THE ROUTED WAY (M2 wave 8b — her feel report: "the transitions don't
  // actually align"): a linked pair's way is a POLYLINE through its true
  // crossing, never a bare center-to-center chord. ABUTTING resident-
  // eligible pairs bend through their agreed border point — the SAME pure
  // borderAgreedPoint the engine seats and carves the mouth by (world.ts
  // seamlessAgreedWays), so the ribbon and the carved mouth meet at ONE
  // world point BY CONSTRUCTION. NON-ABUTTING eligible pairs (a real tissue
  // strip between) route center → door SEAT → door MOUTH → partner mouth →
  // partner seat → center: the seat is placeExit's own edge formula over
  // the fitted cell (the fitted arena IS the cell, its origin the cell
  // corner; worldgen's PORTAL_EDGE_INSET the one shared inset), and the
  // mouth is that seat's rim projection along the def side — exactly where
  // the mint carves its corridor and the border treatment opens its gap
  // window — so the strip piece runs gap-center to gap-center and the
  // crossing is walkable door-to-door BY CONSTRUCTION (the 2026-08-14 route
  // census: bare seat-to-seat strip pieces crossed the rim OUTSIDE the
  // carved gap window on 62% of non-abutting pairs — the oblique class the
  // mouth elbow closes). Ineligible ends, missing cells, and a one-sided
  // link's unknown half keep the chord — no pairing applies (towns keep
  // their doors; degradation, never a strand). Pure f(def rows, the fold) —
  // no live mint state, no rng: the capture law and the determinism pins
  // hold unchanged, and a partner re-fit moves the route only at the next
  // rebuild (the mouths pass's own active-stand residual, at tissue grain).
  const doorWayFor = (z: ZoneDef, destId: string, cell: CellRect):
    { seat: { x: number; y: number }; mouth: { x: number; y: number } } | null => {
    const e = z.exits.find(ex => ex.to === destId && !ex.crossDim);
    if (!e) return null;
    const w = cell.x1 - cell.x0, h = cell.y1 - cell.y0;
    const t = e.at ?? 0.5, inset = PORTAL_EDGE_INSET;
    const cl = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
    const sx = e.side === 'w' ? inset : e.side === 'e' ? w - inset : cl(w * t, inset, w - inset);
    const sy = e.side === 'n' ? inset : e.side === 's' ? h - inset : cl(h * t, inset, h - inset);
    const mx = e.side === 'w' ? 0 : e.side === 'e' ? w : sx;
    const my = e.side === 'n' ? 0 : e.side === 's' ? h : sy;
    return { seat: { x: cell.x0 + sx, y: cell.y0 + sy }, mouth: { x: cell.x0 + mx, y: cell.y0 + my } };
  };
  const routePointsFor = (za: ZoneDef, zb: ZoneDef): Array<{ x: number; y: number }> => {
    const a = mapToPx(za.map), b = mapToPx(zb.map);
    if (!world.seamlessResidentEligible(za) || !world.seamlessResidentEligible(zb)) return [a, b];
    const ca = fold.get(za.id), cb = fold.get(zb.id);
    if (!ca || !cb) return [a, b];
    const p = borderAgreedPoint(ca, cb);
    if (p) return [a, { x: p.x, y: p.y }, b];
    const wa = doorWayFor(za, zb.id, ca), wb = doorWayFor(zb, za.id, cb);
    const pts: Array<{ x: number; y: number }> = [a];
    if (wa) pts.push(wa.seat, wa.mouth);
    if (wb) pts.push(wb.mouth, wb.seat);
    pts.push(b);
    return pts;
  };

  // --- THE CAPTURE: linked surface pairs → THE ROUTED WAY's polyline pieces
  // in world px (every piece is an ordinary road segment: the bins, the
  // walkable ribbon, the drawn face and the wayside march all consume pieces
  // exactly as they consumed chords). The pair defs ride along for THE MOUTH
  // APRONS below (the solid between's second corridor class needs to know
  // which links can ever CROSS).
  const segs: RoadSeg[] = [];
  const segPairs: Array<[ZoneDef, ZoneDef]> = [];
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
      const pts = routePointsFor(z, dest);
      for (let k = 1; k < pts.length; k++) {
        const p0 = pts[k - 1], p1 = pts[k];
        if (Math.abs(p1.x - p0.x) < 1e-6 && Math.abs(p1.y - p0.y) < 1e-6) continue; // co-located joint
        segs.push({ ax: p0.x, ay: p0.y, bx: p1.x, by: p1.y });
      }
      segPairs.push([z, dest]);
    }
  }

  // --- THE MOUTH APRONS (M2 wave 5, THE SOLID BETWEEN): one walkable pocket
  // per agreed border point between two LINKED, RESIDENT-ELIGIBLE cells —
  // the same borderAgreedPoint the engine seats its walk-ways at (world/
  // cells.ts, pure f(the two cells)), so the tissue's corridor and the
  // carved mouth meet at the identical world point BY CONSTRUCTION. The
  // eligibility gate mirrors the mouth carve's own (a way toward ineligible
  // ground keeps its DOOR — no crossing, no apron; the town's border stays
  // solid). Pure capture — graph data + the fold, no rng.
  const aprons: Array<{ x: number; y: number }> = [];
  for (const [za, zb] of segPairs) {
    if (!world.seamlessResidentEligible(za) || !world.seamlessResidentEligible(zb)) continue;
    const ca = fold.get(za.id), cb = fold.get(zb.id);
    if (!ca || !cb) continue;
    const p = borderAgreedPoint(ca, cb);
    if (p) aprons.push({ x: p.x, y: p.y });
  }

  // The per-seed resolved-tone memo (rgb triples; almost always one seed a
  // session — the world's own). Invisible by law: same (graph, seed) →
  // same tones, memoized or cold.
  let toneSeedRef = -1;
  let toneRgb: Float64Array | null = null;
  const fallbackRgb = parseHex(TISSUE_CFG.fallbackTone)!;
  const resolveTones = (seed: number): Float64Array => {
    if (toneRgb && toneSeedRef === seed) return toneRgb;
    const out = new Float64Array(nCells * 3);
    for (let i = 0; i < nCells; i++) {
      const hex = mintedTone[i]
        ?? BIOMES[biomeAt(seatCoord[i], seed)]?.mapColor
        ?? TISSUE_CFG.fallbackTone;
      const rgb = parseHex(hex) ?? fallbackRgb;
      out[i * 3] = rgb[0]; out[i * 3 + 1] = rgb[1]; out[i * 3 + 2] = rgb[2];
    }
    toneSeedRef = seed;
    toneRgb = out;
    return out;
  };

  /** Euclidean distance from a point to cell i's rect (0 inside). */
  const rectDistToCell = (i: number, x: number, y: number): number => {
    const dx = x < cx0[i] ? cx0[i] - x : x > cx1[i] ? x - cx1[i] : 0;
    const dy = y < cy0[i] ? cy0[i] - y : y > cy1[i] ? y - cy1[i] : 0;
    return dx === 0 ? dy : dy === 0 ? dx : Math.hypot(dx, dy);
  };

  /** Inside ANY cell (borders inclusive — a border point belongs to both its
   *  cells, so the crossing line itself is never "between"). THE SOLID
   *  BETWEEN's containment read; same flat arrays as the tone fold. */
  const insideAnyCell = (x: number, y: number): boolean => {
    for (let i = 0; i < nCells; i++) {
      if (x >= cx0[i] && x <= cx1[i] && y >= cy0[i] && y <= cy1[i]) return true;
    }
    return false;
  };

  /** Within `r` of a mouth apron center — r = mouthApronPx is THE SOLID
   *  BETWEEN's second corridor class (the walkable law's own read); the
   *  mass-dress lane asks the same list with its shoulder added. */
  const apronWithin = (x: number, y: number, r: number): boolean => {
    const rSq = r * r;
    for (const a of aprons) {
      const dx = x - a.x, dy = y - a.y;
      if (dx * dx + dy * dy <= rSq) return true;
    }
    return false;
  };
  const nearApron = (x: number, y: number): boolean =>
    apronWithin(x, y, PARTITION_CFG.mouthApronPx);

  /** THE BORDER BLEND's tone at a land sample (the one weight law — module
   *  header). Two passes over the flat cell arrays, allocation-free. */
  const cellToneAt = (x: number, y: number, seed: number): string => {
    let dmin = Infinity;
    for (let i = 0; i < nCells; i++) {
      const d = rectDistToCell(i, x, y);
      if (d < dmin) dmin = d;
    }
    const band = PARTITION_CFG.blendBandPx;
    const tones = resolveTones(seed);
    let wSum = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < nCells; i++) {
      const w = 1 - (rectDistToCell(i, x, y) - dmin) / band;
      if (w <= 0) continue;
      wSum += w;
      r += w * tones[i * 3]; g += w * tones[i * 3 + 1]; b += w * tones[i * 3 + 2];
    }
    return formatHex(r / wSum, g / wSum, b / wSum);
  };

  // --- Spatial bins at the chunk grain (SEAMLESS_CFG.chunkPx): each segment
  // registered into every chunk cell its ribbon-inflated bbox touches, so a
  // sample consults only its own cell's list. Registration inflates by the
  // ribbon PLUS the mass-dress shoulder so the widened corridor test below
  // reads the same bins — a wider superset never changes a verdict (the
  // compare is the exact segment distance either way). Pure build-time
  // geometry — the invisible-cache law holds trivially (no per-call state
  // ever mutates).
  const span = SEAMLESS_CFG.chunkPx, pad = SEAMLESS_CFG.roadHalfPx;
  const binPad = pad + MASSDRESS_CFG.shoulderPx;
  const bins = new Map<string, RoadSeg[]>();
  for (const s of segs) {
    const x0 = Math.floor((Math.min(s.ax, s.bx) - binPad) / span);
    const x1 = Math.floor((Math.max(s.ax, s.bx) + binPad) / span);
    const y0 = Math.floor((Math.min(s.ay, s.by) - binPad) / span);
    const y1 = Math.floor((Math.max(s.ay, s.by) + binPad) / span);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const k = `${gx},${gy}`;
        let arr = bins.get(k);
        if (!arr) bins.set(k, arr = []);
        arr.push(s);
      }
    }
  }
  /** Within `half` of any road segment — half = roadHalfPx is the ribbon
   *  (the walkable/road law's own read); the mass-dress lane adds its
   *  shoulder. Valid for any half ≤ binPad (the bins' registration reach). */
  const roadWithin = (x: number, y: number, half: number): boolean => {
    const arr = bins.get(`${Math.floor(x / span)},${Math.floor(y / span)}`);
    if (!arr) return false;
    const hSq = half * half;
    for (const s of arr) if (segDistSq(x, y, s) <= hSq) return true;
    return false;
  };
  const onRoad = (x: number, y: number): boolean => roadWithin(x, y, pad);

  // --- THE MASS-DRESS READ (M2 wave 6) — carried BY the sampler function
  // (massDressOf below finds it), so the read and the walkable law share ONE
  // capture: the same cells, the same corridor bins, the same apron list —
  // drawn == tested through one closure, and a sampler rebuild (the
  // placement lane's own moment) refreshes both together. The TissueSample
  // contract itself is UNCHANGED.
  const landAt = (x: number, y: number, worldSeed: number): boolean =>
    biomeAt(pxToMap({ x, y }), worldSeed >>> 0) !== OCEAN_BIOME;
  /** Dressable solid mass: LAND outside every cell, off the corridor AND its
   *  clearway shoulder — a strict subset of the walkable law's refusals BY
   *  CONSTRUCTION (everything walkable out here is road or apron, and both
   *  are excluded with margin), so no stamp can ever seed on walkable
   *  ground. Cliff-steep between counts (mass is mass); the sea does not
   *  (it wears water, not country). */
  const massAt = (x: number, y: number, worldSeed: number): boolean => {
    if (!landAt(x, y, worldSeed)) return false;
    if (insideAnyCell(x, y)) return false;
    if (roadWithin(x, y, pad + MASSDRESS_CFG.shoulderPx)) return false;
    if (apronWithin(x, y, PARTITION_CFG.mouthApronPx + MASSDRESS_CFG.shoulderPx)) return false;
    return true;
  };
  /** Signed hillshade in [-1, 1] under THE ONE SUN (MASSDRESS_CFG.lightDir):
   *  >0 = the ground slopes up toward the light (lit face), <0 = away
   *  (shadow face), 0 = flat — or ocean, which wears no relief. Gradient by
   *  the cliff law's own centered elevationAt read (slopeStepUnits),
   *  saturated at shadeSlopeRef. */
  const shadeAt = (x: number, y: number, worldSeed: number): number => {
    const seed = worldSeed >>> 0;
    const c = pxToMap({ x, y });
    if (biomeAt(c, seed) === OCEAN_BIOME) return 0;
    const h = TISSUE_CFG.slopeStepUnits;
    const gx = (elevationAt({ x: c.x + h, y: c.y }, seed) - elevationAt({ x: c.x - h, y: c.y }, seed)) / (2 * h);
    const gy = (elevationAt({ x: c.x, y: c.y + h }, seed) - elevationAt({ x: c.x, y: c.y - h }, seed)) / (2 * h);
    const [lx, ly] = MASSDRESS_CFG.lightDir;
    const s = (gx * lx + gy * ly) / MASSDRESS_CFG.shadeSlopeRef;
    return s < -1 ? -1 : s > 1 ? 1 : s;
  };
  /** THE FLANKS: every cell the ONE WEIGHT LAW gives voice at this point
   *  (w > 0 — the blend's own weights, not a re-derivation), with the zone's
   *  mint provenance for the kit lookup; weight-desc canonical order. Seed-
   *  free geometry (the parameter stands for signature uniformity). */
  const flanksAt = (x: number, y: number, _worldSeed: number): MassFlank[] => {
    const band = PARTITION_CFG.blendBandPx;
    let dmin = Infinity;
    for (let i = 0; i < nCells; i++) {
      const d = rectDistToCell(i, x, y);
      if (d < dmin) dmin = d;
    }
    const out: MassFlank[] = [];
    for (let i = 0; i < nCells; i++) {
      const w = 1 - (rectDistToCell(i, x, y) - dmin) / band;
      if (w <= 0) continue;
      out.push({ zoneId: cellIds[i], tileset: cellTileset[i], weight: w });
    }
    out.sort((a, b) => b.weight - a.weight || (a.zoneId < b.zoneId ? -1 : 1));
    return out;
  };

  // --- THE ROAD-DRESS READS (M2 wave 8) — the road face + wayside lane's
  // half of the carried read. All four ride the SAME capture the walkable
  // law reads (segments, bins, cells, aprons — one closure), so the drawn
  // face and the tested ribbon can never disagree about geometry.
  /** The capture's own per-chunk segment lists (the bins the ribbon test
   *  consults — registered at pad + shoulder reach, so everything the face
   *  or the wayside band touches is present BY CONSTRUCTION). */
  const roadSegsForChunk = (cx: number, cy: number): readonly TissueRoadSeg[] =>
    bins.get(`${cx},${cy}`) ?? EMPTY_SEGS;
  /** The flanks' own drawn-road color at a point — the cell road tones
   *  (theme.road ▷ the packed-grey default) through THE ONE WEIGHT LAW's
   *  own fold, so the ribbon's color slides from one zone's gravel to the
   *  next exactly as the ground tone does. Seed-free minted data (the
   *  parameter stands for signature uniformity). */
  const roadToneAt = (x: number, y: number, _worldSeed: number): string => {
    if (nCells === 0) return ROAD_TONE_DEFAULT;
    let dmin = Infinity;
    for (let i = 0; i < nCells; i++) {
      const d = rectDistToCell(i, x, y);
      if (d < dmin) dmin = d;
    }
    const band = PARTITION_CFG.blendBandPx;
    let wSum = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < nCells; i++) {
      const w = 1 - (rectDistToCell(i, x, y) - dmin) / band;
      if (w <= 0) continue;
      wSum += w;
      r += w * cellRoadRgb[i * 3]; g += w * cellRoadRgb[i * 3 + 1]; b += w * cellRoadRgb[i * 3 + 2];
    }
    return formatHex(r / wSum, g / wSum, b / wSum);
  };
  /** Would this ground draw as MASS (unwalkable land) if the road weren't
   *  here — the sampler's own walkable law verbatim MINUS the road clause
   *  (ocean → false: the sea wears water; cliff-class → true; else outside
   *  every cell off the aprons). The road face's under-color read: a lattice
   *  cell the ribbon only PARTLY covers paints its off-ribbon remainder as
   *  what that ground truly is, so the opaque stroke's smooth edge meets the
   *  right country and the 30px stair-step dies with the lift. */
  const massSansRoadAt = (x: number, y: number, worldSeed: number): boolean => {
    const seed = worldSeed >>> 0;
    const c = pxToMap({ x, y });
    if (biomeAt(c, seed) === OCEAN_BIOME) return false;
    const h = TISSUE_CFG.slopeStepUnits;
    const gx = elevationAt({ x: c.x + h, y: c.y }, seed) - elevationAt({ x: c.x - h, y: c.y }, seed);
    const gy = elevationAt({ x: c.x, y: c.y + h }, seed) - elevationAt({ x: c.x, y: c.y - h }, seed);
    if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) return true;
    return !insideAnyCell(x, y) && !nearApron(x, y);
  };
  /** THE WAYSIDE SEAT TEST: shoulder-band ground a glyph of `bodyR` may
   *  honestly dress — LAND, outside every cell (inside a cell the ground is
   *  walkable and a drawn body would lie), off the mouth aprons by the mass
   *  stamps' own margin (the M0.5 signposts keep their stage), body clear of
   *  EVERY ribbon by waysideRoadGap (the rolled offset already clears its
   *  own road by more), and within the clearway shoulder of SOME road — THE
   *  ONE SHOULDER the mass stamps stop at (MASSDRESS_CFG.shoulderPx), so
   *  the two dress bands partition the roadside BY CONSTRUCTION. Bin-valid
   *  for bodyR ≤ shoulderPx − waysideRoadGap (the registration reach). */
  const shoulderSeatAt = (x: number, y: number, worldSeed: number, bodyR: number): boolean => {
    if (!landAt(x, y, worldSeed)) return false;
    if (insideAnyCell(x, y)) return false;
    if (apronWithin(x, y, PARTITION_CFG.mouthApronPx + MASSDRESS_CFG.shoulderPx)) return false;
    if (roadWithin(x, y, pad + ROADDRESS_CFG.waysideRoadGap + bodyR)) return false;
    return roadWithin(x, y, pad + MASSDRESS_CFG.shoulderPx);
  };

  const sampler: TissueSampler = (x: number, y: number, worldSeed: number): TissueSample => {
    const seed = worldSeed >>> 0;
    const c = pxToMap({ x, y });
    const road = onRoad(x, y);
    // THE MINT LANE: the same biome a zone minted here would read — one read
    // serves the walkable law AND the shore exception (drawn == tested).
    const biome = biomeAt(c, seed);
    let walkable = true;
    if (!road) {
      if (biome === OCEAN_BIOME) {
        walkable = false; // the sea grows no tissue
      } else {
        const h = TISSUE_CFG.slopeStepUnits;
        const gx = elevationAt({ x: c.x + h, y: c.y }, seed) - elevationAt({ x: c.x - h, y: c.y }, seed);
        const gy = elevationAt({ x: c.x, y: c.y + h }, seed) - elevationAt({ x: c.x, y: c.y - h }, seed);
        if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) walkable = false;
        // THE SOLID BETWEEN (M2 wave 5): off-road land OUTSIDE every cell is
        // impassable mass unless it sits in a mouth apron — the corridors
        // are the only ways between the zones (module header carries the
        // amended law; ocean/cliff refusals above rank first).
        else if (!insideAnyCell(x, y) && !nearApron(x, y)) walkable = false;
      }
    }
    // THE BORDER BLEND: land tone belongs to the cells; the sea keeps its
    // own; the raw field speaks only for a cell-less capture.
    const tone = biome === OCEAN_BIOME || nCells === 0
      ? (BIOMES[biome]?.mapColor ?? TISSUE_CFG.fallbackTone)
      : cellToneAt(x, y, seed);
    return { walkable, tone, road };
  };
  (sampler as DressedTissueSampler).massDress = {
    massAt, landAt, shadeAt, flanksAt,
    roadSegsForChunk, roadToneAt, massSansRoadAt, shoulderSeatAt,
  };
  return sampler;
}

/** The road-less chunk's shared empty answer (identity-stable). */
const EMPTY_SEGS: readonly TissueRoadSeg[] = Object.freeze([]);

// ---------------------------------------------------------------------------
// THE MASS-DRESS READ (M2 wave 6) — the solid between wears COUNTRY, draw-time
// only. The reads below are CARRIED by the sampler function (the extension
// travels with the install seam: the placement lane's setTissueSampler hands
// the painter a dress read of the same vintage as the walkable law — one
// capture, zero drift, and the TissueSample contract in world/seamless.ts
// stays byte-untouched). A sampler without the carry (an old stub, a dev
// swap) simply dresses nothing: massDressOf answers null and every consumer
// stands down structurally — the mode law's shape at read grain.
// ---------------------------------------------------------------------------

/** One flanking cell's voice at a point: the ONE WEIGHT LAW's own weight plus
 *  the zone's mint provenance (massKitFor's key). */
export interface MassFlank {
  zoneId: string;
  /** ZoneDef.tileset — undefined (authored towns) draws the default kit. */
  tileset?: string;
  weight: number;
}

/** The reads the mass-dress painter consumes — all pure per (capture, args),
 *  same signature discipline as the sampler itself. */
export interface MassDressRead {
  /** Dressable solid mass (land, outside every cell, off corridor+shoulder). */
  massAt(x: number, y: number, worldSeed: number): boolean;
  /** Land vs the sea (the shore exception's own read, exposed). */
  landAt(x: number, y: number, worldSeed: number): boolean;
  /** Signed hillshade in [-1, 1]; 0 on ocean and flat ground. */
  shadeAt(x: number, y: number, worldSeed: number): number;
  /** The blend's contributing cells at this point, weight-desc. */
  flanksAt(x: number, y: number, worldSeed: number): MassFlank[];
  // --- THE ROAD-DRESS READS (M2 wave 8) — the road face's half. -------------
  /** The road segments whose dressed reach (ribbon + shoulder) touches the
   *  chunk — the capture's own bins, the very lists the ribbon test consults
   *  (drawn geometry == tested geometry BY CONSTRUCTION). */
  roadSegsForChunk(cx: number, cy: number): readonly TissueRoadSeg[];
  /** The flanks' own drawn-road color at a point (theme.road through THE
   *  ONE WEIGHT LAW; the packed-grey default where a theme names none). */
  roadToneAt(x: number, y: number, worldSeed: number): string;
  /** Mass-class ground with the road overlay set aside — the road face's
   *  under-color read (the walkable law verbatim minus the road clause). */
  massSansRoadAt(x: number, y: number, worldSeed: number): boolean;
  /** Wayside-seatable shoulder ground for a glyph body of `bodyR` px (see
   *  buildTissueSampler — off ribbon and aprons, outside cells, in THE ONE
   *  SHOULDER the mass stamps stop at). */
  shoulderSeatAt(x: number, y: number, worldSeed: number, bodyR: number): boolean;
}

/** A sampler that carries the dress read (buildTissueSampler's product). */
export interface DressedTissueSampler extends TissueSampler { massDress: MassDressRead }

/** Find the dress read on an installed sampler — null when the sampler is
 *  null or carries none (stand down; never throw — the null-seam law). */
export function massDressOf(s: TissueSampler | null): MassDressRead | null {
  if (!s) return null;
  const d = (s as Partial<DressedTissueSampler>).massDress;
  return d && typeof d.massAt === 'function' ? d : null;
}

/** One stamp seat the mass painter will draw: world-px position, glyph
 *  vocabulary id (data/enclosure.ts MassStampRow.kind), rolled radius, and
 *  the glyph's own wobble seed. `tileset` records the flank that voiced it
 *  (probe/debug — the draw needs only kind + geometry). */
export interface MassStampSeat {
  x: number;
  y: number;
  kind: string;
  r: number;
  varSeed: number;
  tileset?: string;
}

/**
 * THE STAMP SCATTER's seat derivation — the painter's skip predicate made an
 * exported pure helper (the probe asserts through it): for one tissue chunk,
 * the full list of stamp seats, deterministic per (dress capture, worldSeed,
 * cx, cy). The stream is chunk-keyed off the world seed (the far-field
 * dress streamer's own salt idiom) with a PER-ATTEMPT fork, so a skipped
 * attempt (non-mass ground) never shifts a neighbor's roll — the throng
 * pockets' fork law. Each seated attempt voices ONE flank drawn by the
 * blend's own weights (a mire flank scatters its dead trees into its half
 * of the mass; a wedge blends both by weight), then one kit row by the
 * kit's weights, then radius + wobble. DOM-free on purpose: the painter
 * turns seats into pixels; headless consumers (probes) read the same list.
 */
export function massStampSeatsForChunk(dress: MassDressRead, worldSeed: number,
  cx: number, cy: number): MassStampSeat[] {
  const seed = worldSeed >>> 0;
  const C = SEAMLESS_CFG.chunkPx;
  const base = (Math.imul(cx, 0x9e3779b1) ^ Math.imul(cy, 0x85ebca6b) ^ seed ^ MASSDRESS_CFG.salt) >>> 0;
  const seats: MassStampSeat[] = [];
  for (let i = 0; i < MASSDRESS_CFG.stampAttempts; i++) {
    const r = new Rng((base + Math.imul(i + 1, 0xc2b2ae35)) >>> 0);
    const x = cx * C + r.next() * C;
    const y = cy * C + r.next() * C;
    if (!dress.massAt(x, y, seed)) continue;
    const flanks = dress.flanksAt(x, y, seed);
    const flank = flanks.length ? r.weighted(flanks) : null;
    const kit = massKitFor(flank?.tileset);
    const row = r.weighted(kit);
    seats.push({
      x, y,
      kind: row.kind,
      r: r.range(row.radius[0], row.radius[1]),
      varSeed: Math.floor(r.next() * 4294967296) >>> 0,
      tileset: flank?.tileset,
    });
  }
  return seats;
}

/**
 * THE WAYSIDE DRESS's seat derivation (M2 wave 8) — the road's shoulder
 * furniture as an exported pure helper (the massStampSeatsForChunk idiom;
 * the probe asserts through it): for one tissue chunk, every wayside glyph
 * seat, deterministic per (dress capture, worldSeed, cx, cy).
 *
 * THE MARCH IS THE STREAM: candidates pace each road segment's own arc at
 * ROADDRESS_CFG.waysideStepPx (the discrete layWaysideDress's cadence
 * grammar at world grain), each candidate drawing from its OWN fork of a
 * SEGMENT-keyed salted stream (endpoints quantized at 0.1px are the
 * identity — pure f(graph), so every chunk that holds the segment derives
 * the identical candidate and a skipped attempt never shifts a neighbor:
 * the throng pockets' fork law). A candidate rolls chance, side, along
 * jitter, offset, glyph row (WAYSIDE_GLYPHS by weight) and radius, seats at
 * ribbon-edge + offset + body radius on the rolled side, then stands ONLY
 * where the sampler's own shoulderSeatAt admits — off the ribbon and every
 * crossing road by arithmetic, outside every cell, clear of the mouth
 * aprons (the M0.5 signposts keep their stage), inside THE ONE SHOULDER.
 * Chunk ownership is by seat point (the painter gathers 3×3 for paint
 * reach, the mass scatter's own law). DOM-free: the painter turns seats
 * into pixels; probes read the same list.
 */
export function waysideSeatsForChunk(dress: MassDressRead, worldSeed: number,
  cx: number, cy: number): MassStampSeat[] {
  const seed = worldSeed >>> 0;
  const C = SEAMLESS_CFG.chunkPx;
  const x0 = cx * C, y0 = cy * C;
  const pad = SEAMLESS_CFG.roadHalfPx;
  const step = ROADDRESS_CFG.waysideStepPx;
  const seats: MassStampSeat[] = [];
  for (const s of dress.roadSegsForChunk(cx, cy)) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    if (len < step) continue;
    const ux = dx / len, uy = dy / len;
    const segKey = (Math.imul(Math.round(s.ax * 10), 0x9e3779b1)
      ^ Math.imul(Math.round(s.ay * 10), 0x85ebca6b)
      ^ Math.imul(Math.round(s.bx * 10), 0xc2b2ae35)
      ^ Math.imul(Math.round(s.by * 10), 0x27d4eb2f)) >>> 0;
    const base = (segKey ^ seed ^ ROADDRESS_CFG.salt) >>> 0;
    const n = Math.floor(len / step);
    for (let i = 1; i <= n; i++) {
      const r = new Rng((base + Math.imul(i, 0x51a7cd7)) >>> 0);
      // Every roll lands BEFORE the tests (the fork law makes order moot
      // across attempts; within one it keeps the draw ledger fixed).
      const chanceRoll = r.next();
      const side = r.next() < 0.5 ? -1 : 1;
      const along = (i - 0.5 + (r.next() - 0.5) * 0.6) * step;
      const off = r.range(ROADDRESS_CFG.waysideOff[0], ROADDRESS_CFG.waysideOff[1]);
      const row = r.weighted(WAYSIDE_GLYPHS);
      const rr = r.range(row.radius[0], row.radius[1]);
      const varSeed = Math.floor(r.next() * 4294967296) >>> 0;
      if (chanceRoll >= ROADDRESS_CFG.waysideChance) continue;
      const px = s.ax + ux * along - uy * side * (pad + off + rr);
      const py = s.ay + uy * along + ux * side * (pad + off + rr);
      if (px < x0 || px >= x0 + C || py < y0 || py >= y0 + C) continue; // another chunk's seat
      if (!dress.shoulderSeatAt(px, py, seed, rr)) continue;
      seats.push({ x: px, y: py, kind: row.kind, r: rr, varSeed });
    }
  }
  return seats;
}
