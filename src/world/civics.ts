// ---------------------------------------------------------------------------
// CIVICS — WHERE civilization stands, as per-seed geometry (never fixed bands
// around the start).
//
// THE CAPITAL POLE: every world seats ONE capital — but never at your door.
// A bearing + distance rolled purely from the world seed places the pole,
// then a deterministic walk pulls it onto the HOME LANDMASS (a bearing that
// points to sea slides the capital ashore — a coastal capital, quays and
// all). The pole becomes the 'capital' climate anchor: the 'civic' axis
// measures distance to it (the capital field bands in world/biomes.ts key on
// that), and the wildness BASIN around it tames the surrounding country so
// the settled biomes' own climate affinities hold there organically.
//
// The roguelike contract: EXISTENCE is a guarantee (one seat, always), the
// ADDRESS is the dice. Everything tunable lives in CIVIC_CFG; future world
// archetypes (twin city-states, riverine capitals, capital-less wild worlds)
// are more pole derivations feeding the same anchor seam — data, not engine.
//
// Pure leaf (coords + continents + climate) — the field discipline: same
// derivation on host, client, and every reload, no replication.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import { cellKind, continentAt, continentCellAt, continentSeedFrom } from './continents';
import { CLIMATE_CFG, setClimateAnchor } from './climate';

export const CIVIC_CFG = {
  /** Pole distance from home, map units [min, max]. Far enough that the
   *  approach is a journey; near rolls let the capital's tamed basin kiss
   *  home's calm (one settled vale), far rolls leave a wild march between —
   *  a deliberate per-seed axis of world character. */
  poleDist: [600, 1050] as [number, number],
  /** The walked-ashore FLOOR: a sea-ward bearing slides the pole toward home,
   *  and below this standoff the capital's forced seat would wall the start —
   *  so a pole that walks under it re-rolls its bearing (`bearingTries`
   *  deterministic attempts; then the farthest joined-land candidate wins,
   *  so derivation never fails). */
  minStandoff: 450,
  bearingTries: 8,
  /** Land-walk: step fraction toward home per try / max tries — the pole
   *  must stand on land WALK-JOINED to home (a walkable approach; sailing
   *  stays optional — a sailing-capital archetype would relax this), and
   *  `joinCells` bounds the connectivity BFS (a chain longer than this
   *  counts as another shore). */
  landWalk: { step: 0.08, tries: 24, joinCells: 64 },
} as const;

/** Integer hash (Rng's family) → deterministic across host / client / reload. */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
const hash01 = (a: number, b: number, seed: number): number => hashCell(a, b, seed) / 0x100000000;

/** Are two coords WALK-JOINED on the continent lattice — same landmass in the
 *  traversable sense: a 4-neighbour chain of land/bridge macro cells links
 *  their winning cells? (`ContinentInfo.landmass` is a per-CELL label, not a
 *  flooded continent id — adjacent land cells wear different labels while
 *  being one shore; this is the honest connectivity read.) Bounded BFS —
 *  pure, cheap at pole scale. */
export function continentWalkJoined(a: MapCoord, b: MapCoord, contSeed: number): boolean {
  const ca = continentCellAt(a, contSeed), cb = continentCellAt(b, contSeed);
  if (ca.kind === 'ocean' || cb.kind === 'ocean') return false;
  const cap = CIVIC_CFG.landWalk.joinCells;
  const key = (gx: number, gy: number): string => `${gx},${gy}`;
  const seen = new Set([key(ca.gx, ca.gy)]);
  const q: [number, number][] = [[ca.gx, ca.gy]];
  for (let head = 0; head < q.length && seen.size <= cap; head++) {
    const [gx, gy] = q[head];
    if (gx === cb.gx && gy === cb.gy) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = gx + dx, ny = gy + dy, k = key(nx, ny);
      if (seen.has(k) || cellKind(nx, ny, contSeed) === 'ocean') continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return false;
}

/** THE CAPITAL POLE for a world seed: rolled bearing + distance from home,
 *  walked ashore until it stands on land WALK-JOINED to home (a sea-ward
 *  bearing slides the capital onto the near coast). A pole that walks under
 *  the standoff floor re-rolls its bearing; the farthest joined-land
 *  candidate is the never-fail fallback. Pure per (fieldSeed, home);
 *  terminates by construction — home's macro-block is land. */
export function deriveCapitalPole(fieldSeed: number, home: MapCoord = CLIMATE_CFG.origin): MapCoord {
  const [dMin, dMax] = CIVIC_CFG.poleDist;
  const contSeed = continentSeedFrom(fieldSeed);
  const { step, tries } = CIVIC_CFG.landWalk;
  let best: MapCoord | null = null, bestD = -1;
  for (let attempt = 0; attempt < CIVIC_CFG.bearingTries; attempt++) {
    const bearing = hash01(11 + attempt, 13, (fieldSeed ^ 0x9c1a17) >>> 0) * Math.PI * 2;
    const dist = dMin + hash01(17 + attempt, 19, (fieldSeed ^ 0x51f0a3) >>> 0) * (dMax - dMin);
    let c = { x: home.x + Math.cos(bearing) * dist, y: home.y + Math.sin(bearing) * dist };
    for (let t = 0; t < tries; t++) {
      if (continentAt(c, contSeed).kind === 'land' && continentWalkJoined(home, c, contSeed)) break;
      c = { x: c.x + (home.x - c.x) * step, y: c.y + (home.y - c.y) * step };
    }
    const d = Math.hypot(c.x - home.x, c.y - home.y);
    if (d > bestD) { bestD = d; best = c; }
    if (d >= CIVIC_CFG.minStandoff) break; // this bearing keeps its distance — take it
  }
  const pole = best ?? home;
  return { x: Math.round(pole.x), y: Math.round(pole.y) };
}

/** Derive + install the pole as the 'capital' climate anchor — the ONE entry
 *  world boot and every probe share (set the climate ORIGIN first; the pole
 *  is home-relative). Returns the pole for logging/tools. */
export function installCapitalPole(fieldSeed: number): MapCoord {
  const pole = deriveCapitalPole(fieldSeed);
  setClimateAnchor('capital', pole);
  return pole;
}
