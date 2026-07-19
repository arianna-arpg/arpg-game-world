// ---------------------------------------------------------------------------
// THE VOYAGE — the sailing traversal context. This name is canon: the system
// is "the Voyage system", one sail is "a voyage", the pseudo-zone is the
// Voyage sea, and the island content layer is "Voyage Islands".
//
// Sailing is a MODE, not a place: dwelling at a port's dock casts off into a
// boundless pseudo-zone where the hero IS the boat and the CONTINENT FIELD
// streams in around them as coastline collision (the Lost Ark loop: navigate
// the open sea yourself; nose up to any shore and linger to LAND). Landing
// mints (or links, or harbors) a real zone with its own port at the water's
// edge, so the sea is an overarching explorable web of generated side zones.
//
// VOYAGE ISLANDS ride on top: a deterministic island field over open-ocean
// cells — each island a one-off content site (its own tileset, population,
// objective, boss) that streams into view as a beaconed shore while sailing,
// reveals itself on the world map, and gates its dock behind its objective —
// a sailable mapping system (PoE maps / Lost Ark islands / PoE2 Expedition).
//
// This is the first TRAVERSAL CONTEXT built on the pattern the Descent proved
// (boundless arena + streamed terrain + an exit rule); a future mode (an
// airship, a burrowing wyrm) clones the shape: a CFG here, an enter/update/
// exit trio in the engine, and a renderer skin.
// ---------------------------------------------------------------------------

import { continentAt, continentSeedFrom } from './continents';
import { climateAt, climateAffinity } from './climate';
import { islandMulAt } from './seas';
import { VOYAGE_ISLANDS, type VoyageIslandDef } from '../data/voyageIslands';

export const VOYAGE_CFG = {
  /** Sailing-arena pixels per node-space unit — the world's scale at sea. A
   *  continent macro-cell (1150 node units) reads as ~8km of coast to cruise. */
  pxPerNode: 7,
  /** Node-units between coast samples (collision resolution — smaller = finer
   *  coastline, more streamed doodads). */
  streamStep: 30,
  /** Pixels around the boat kept materialized; beyond it the sea is culled.
   *  Scaled by the ship's SPYGLASS (a better hull sees further). */
  streamRadius: 2600,
  /** Re-stream when the boat has moved this fraction of streamRadius. */
  restreamFrac: 0.3,
  /** Landmass disc radius as a fraction of the sample cell (≥ 0.71 keeps the
   *  diagonal sealed so the boat can't slip between samples into the land). */
  coastDiscFrac: 0.75,
  /** How near a shore's edge (px) counts as "nosed up to land". */
  landingProbe: 130,
  /** Linger this long at a shore to make landfall (× the ship's landing mul). */
  landingDwell: 0.9,
  /** Landing suppression right after casting off (so the harbor you just left
   *  doesn't immediately reel you back in while you get underway). */
  castOffGrace: 2.5,
  // (dedupRadius retired with free docking: landings resolve through the sea
  //  fabric's planned port spots — world/seas.ts SEA_CFG.landingSlack.)
  /** The boat is quicker than boots — a move-speed multiplier while sailing
   *  (× the ship's own speed multiplier). */
  boatSpeedMul: 1.35,
  /** Extra node-units past the spyglass radius that island SIGHTING scans
   *  (so an island's shore blob never pops in half-materialized). */
  islandSightPad: 80,
};

/** The Voyage pseudo-zone's stable id (off-graph, like the Descent abyss). */
export const VOYAGE_ZONE_ID = 'voyage_sea';

// --- THE ISLAND FIELD --------------------------------------------------------
// Deterministic per (cell, seed) — the same jittered-hash idiom as the biome
// and continent fields, an octave below the continent span so islands pepper
// the open water between landmasses. Pure: same seed → same islands on every
// machine, reload, and co-op client.

export const ISLAND_FIELD = {
  /** Island macro-cell span in node units (< continent cellSpan — islands live
   *  in the water BETWEEN landmasses). */
  cellSpan: 420,
  /** Chance an open-ocean cell hosts an island — scaled per SEA CLASS at the
   *  roll (SeaClassDef.islandMul, world/seas.ts: bigger waters, thicker
   *  archipelagos). */
  chance: 0.42,
  /** Cell-center jitter (0..0.5 of span) — organic scatter, not a grid. */
  jitter: 0.4,
  /** The island's streamed SHORE blob radius range, node units. */
  shoreRadius: [34, 62] as [number, number],
};

/** One rolled island site: a stable id, its node-space coord, and its def. */
export interface IslandSpot {
  id: string;
  coord: { x: number; y: number };
  def: VoyageIslandDef;
  /** Deterministic per-island hash — name picks, size, level jitter. */
  h: number;
}

function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** The island (if any) of one island-field cell. Pure. `fieldSeed` is the
 *  BIOME-field seed — the continent seed derives internally (islands and
 *  landmasses stay the same world), and the def pick samples the CLIMATE at
 *  the island's coord so fire atolls rise in scorching seas and frozen
 *  strands in the frigid ones (weight × affinity, the biome field's law). */
export function islandAtCell(gx: number, gy: number, fieldSeed: number): IslandSpot | null {
  const seed = continentSeedFrom(fieldSeed);
  const span = ISLAND_FIELD.cellSpan;
  const h = hashCell(gx, gy, (seed ^ 0x15a4d) >>> 0);
  const jit = ISLAND_FIELD.jitter;
  const coord = {
    x: (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * 2 * jit) * span,
    y: (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * 2 * jit) * span,
  };
  // Only OPEN WATER hosts a voyage island — a coord that lands on a continent
  // (or a bridge) is just coastline; the mainland already has its own zones.
  if (continentAt(coord, seed).kind !== 'ocean') return null;
  // THE PER-CLASS ISLAND LEVER (world/seas.ts): the existence roll reads the
  // hosting SEA's class multiplier — great waters grow thicker archipelagos.
  // Pure + memoized; ordered after the ocean test so land cells pay nothing.
  if ((h / 0x100000000) >= ISLAND_FIELD.chance * islandMulAt(coord, seed)) return null;
  const defs = Object.values(VOYAGE_ISLANDS);
  if (!defs.length) return null;
  // Weighted pick off a second hash (decoupled from the existence roll),
  // shaped by each def's climate affinity at this island's own waters. A
  // fully-zeroed table falls back to the raw weights (the field never starves).
  const climate = climateAt(coord, fieldSeed);
  const weights = defs.map(d => (d.weight ?? 1) * climateAffinity(d.climate, climate));
  let total = weights.reduce((a, w) => a + w, 0);
  let effective = weights;
  if (total <= 0) {
    effective = defs.map(d => d.weight ?? 1);
    total = effective.reduce((a, w) => a + w, 0);
  }
  const h2 = hashCell(gx, gy, (seed ^ 0x7e11e5) >>> 0);
  let r = (h2 / 0x100000000) * total;
  let def = defs[defs.length - 1];
  for (let i = 0; i < defs.length; i++) { r -= effective[i]; if (r <= 0) { def = defs[i]; break; } }
  return { id: `isle_${gx}_${gy}`, coord, def, h: h2 };
}

/** Every island within `radius` node-units of a coord (box-scan the cells).
 *  `fieldSeed` = the biome-field seed (see islandAtCell). */
export function islandsNear(
  coord: { x: number; y: number }, radius: number, fieldSeed: number,
): IslandSpot[] {
  const span = ISLAND_FIELD.cellSpan;
  const gx0 = Math.floor((coord.x - radius) / span), gx1 = Math.floor((coord.x + radius) / span);
  const gy0 = Math.floor((coord.y - radius) / span), gy1 = Math.floor((coord.y + radius) / span);
  const out: IslandSpot[] = [];
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const s = islandAtCell(gx, gy, fieldSeed);
      if (!s) continue;
      const dx = s.coord.x - coord.x, dy = s.coord.y - coord.y;
      if (dx * dx + dy * dy <= radius * radius) out.push(s);
    }
  }
  return out;
}
