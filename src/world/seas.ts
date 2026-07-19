// ---------------------------------------------------------------------------
// THE SEA FABRIC — every contiguous body of water, known WHOLE.
//
// The moment generation touches any ocean cell, this module fills the entire
// CONTIGUOUS component it belongs to (4-neighbour over the continent macro
// lattice — the sailing-true adjacency: the coast streamer seals diagonal
// gaps, so water joined only at a corner is two seas, and a BRIDGE blocks
// the boat, so waters joined under one are two seas too). Knowing the whole
// shape, the sea gets everything a hand-placed sea would have:
//
//   CLASS  — pond → lagoon → sea → great sea → ocean (data/seas.ts ladder)
//   NAME   — "the Mourning Sea", seeded per sea
//   PORTS  — a deliberate, FINITE port system: one HAVEN + coves at
//            explicit, evenly-spread points around the coastline. These are
//            the ONLY landing zones a voyage may dock at — free-docking (and
//            its infinite-shore-zone abuse) is gone; between spots the shore
//            is breakers.
//
// THE FOREORDAINED TENET: everything here is a PURE FUNCTION of the world
// seed — entry-invariant (fill from any member cell, get the same sea, the
// same name, the same ports), never persisted, computed whole the moment any
// part is touched, revealed to the player only as found. Hand-tailored feel,
// zero hand-tailoring.
//
// Pure leaf: continents + data + core rng only. The World wires discovery
// (minting the spots as veiled port zones, lanes, beacons, landings).
// Probe: npx tsx balance/probe_seas.ts. Docs: docs/engine/seas.md.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { SEA_CFG, SEA_CLASSES, type SeaClassDef } from '../data/seas';
import { CONTINENT_CFG, cellKind, cellSite, continentCellAt, continentSeedFrom } from './continents';
import type { MapCoord } from './coords';

export interface SeaPortSpot {
  /** Stable id — also the minted port ZONE's id (`sea_3_-2_p1`). */
  id: string;
  seaId: string;
  /** The LAND anchor the port zone mints at (a step inland of the shore). */
  coord: MapCoord;
  /** The nearshore WATER point it watches — the quay beacon's seat and the
   *  landing test's center. */
  shore: MapCoord;
  tier: 'haven' | 'cove';
}

export interface Sea {
  id: string;
  /** Member ocean cells, `${gx},${gy}`. */
  cells: ReadonlySet<string>;
  cellCount: number;
  /** The fill hit SEA_CFG.fillCap — an astronomically-rare giant; classed as
   *  the top row, ports planned on the filled reach. */
  capped: boolean;
  cls: SeaClassDef;
  /** "the Mourning Sea" (lowercase article — surfaces capitalize as needed). */
  name: string;
  centroid: MapCoord;
  ports: SeaPortSpot[];
}

const key = (gx: number, gy: number): string => `${gx},${gy}`;

/** Memo: continent seed → cell key → its Sea (shared object across members).
 *  Pure derivation — the memo is a speed detail, never state. */
const memo = new Map<number, Map<string, Sea>>();

function memoFor(contSeed: number): Map<string, Sea> {
  let m = memo.get(contSeed);
  if (!m) { m = new Map(); memo.set(contSeed, m); }
  return m;
}

/** TEST SEAM: drop every memoized sea (probes re-fill across seeds). */
export function clearSeaMemo(): void { memo.clear(); }

/** The sea at a node-space coordinate, or null on land/bridge. `fieldSeed`
 *  is the BIOME-field seed (the continent seed derives internally — same
 *  convention as the island field). */
export function seaAt(coord: MapCoord, fieldSeed: number): Sea | null {
  const contSeed = continentSeedFrom(fieldSeed);
  const cell = continentCellAt(coord, contSeed);
  if (cell.kind !== 'ocean') return null;
  return seaOfCell(cell.gx, cell.gy, contSeed);
}

/** The sea a known-ocean CELL belongs to (fills + memoizes the component). */
export function seaOfCell(gx: number, gy: number, contSeed: number): Sea {
  const m = memoFor(contSeed);
  const hit = m.get(key(gx, gy));
  if (hit) return hit;
  // FILL: BFS, 4-neighbour, ocean-only, capped. Track the lexicographic min
  // (gy, then gx) — the CANONICAL cell every entry point agrees on.
  const cells = new Set<string>([key(gx, gy)]);
  const queue: [number, number][] = [[gx, gy]];
  let cgx = gx, cgy = gy;
  let capped = false;
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (y < cgy || (y === cgy && x < cgx)) { cgx = x; cgy = y; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      const k = key(nx, ny);
      if (cells.has(k)) continue;
      if (cellKind(nx, ny, contSeed) !== 'ocean') continue;
      if (cells.size >= SEA_CFG.fillCap) { capped = true; continue; }
      cells.add(k);
      queue.push([nx, ny]);
    }
  }
  const id = `sea_${cgx}_${cgy}`;
  // CLASS: the biggest ascending row the size meets (capped ⇒ the top row).
  let cls = SEA_CLASSES[0];
  for (const c of SEA_CLASSES) if (cells.size >= c.atCells) cls = c;
  if (capped) cls = SEA_CLASSES[SEA_CLASSES.length - 1];
  // IDENTITY rolls off the canonical cell — entry-invariant by construction.
  const rng = new Rng((hash2(cgx, cgy, contSeed) ^ 0x5ea5) >>> 0);
  const name = `the ${rng.pick(cls.nameFirst)} ${rng.pick(cls.nameSecond)}`;
  let sx = 0, sy = 0;
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number);
    const s = cellSite(x, y, contSeed);
    sx += s.x; sy += s.y;
  }
  const centroid = { x: sx / cells.size, y: sy / cells.size };
  const sea: Sea = { id, cells, cellCount: cells.size, capped, cls, name, centroid, ports: [] };
  sea.ports = planPorts(sea, contSeed, rng);
  // Every member cell resolves to the SAME object from now on.
  for (const k of cells) m.set(k, sea);
  return sea;
}

/** PLAN THE PORT SYSTEM: sample the component's nearshore water on a coarse
 *  grid, then choose spots by greedy max-min spacing (deliberate, even,
 *  seed-fixed placement), snapping each to a land anchor a step inland.
 *  Honest under-budget: a tiny coastline yields fewer spots, never crowded
 *  ones. Spot 0 is the HAVEN when the class rates one. */
function planPorts(sea: Sea, contSeed: number, rng: Rng): SeaPortSpot[] {
  const span = CONTINENT_CFG.cellSpan;
  const step = SEA_CFG.coastStep;
  const probe = SEA_CFG.coastProbe;
  const cand: { water: MapCoord; out: MapCoord }[] = [];
  for (const k of sea.cells) {
    const [gx, gy] = k.split(',').map(Number);
    // Sample this cell's bounding square; keep points whose WINNING cell is
    // this component's water and that have land within one probe step.
    for (let sy = 0; sy < Math.ceil(span / step); sy++) {
      for (let sx = 0; sx < Math.ceil(span / step); sx++) {
        const pt = { x: (gx + (sx + 0.5) * step / span) * span, y: (gy + (sy + 0.5) * step / span) * span };
        const win = continentCellAt(pt, contSeed);
        if (win.kind !== 'ocean' || !sea.cells.has(key(win.gx, win.gy))) continue;
        let out: MapCoord | null = null;
        for (let d = 0; d < 8; d++) {
          const a = (d / 8) * Math.PI * 2;
          const q = { x: pt.x + Math.cos(a) * probe, y: pt.y + Math.sin(a) * probe };
          if (continentCellAt(q, contSeed).kind !== 'ocean') { out = { x: Math.cos(a), y: Math.sin(a) }; break; }
        }
        if (out) cand.push({ water: pt, out });
      }
    }
  }
  if (!cand.length) return [];
  const want = rng.int(sea.cls.ports[0], sea.cls.ports[1]);
  // Greedy max-min: seed with the hash-max candidate (entry-invariant), then
  // repeatedly take the candidate farthest from everything chosen.
  const score = (p: MapCoord): number => hash2(Math.round(p.x), Math.round(p.y), contSeed ^ 0x9047);
  let first = cand[0];
  for (const c of cand) if (score(c.water) > score(first.water)) first = c;
  const chosen = [first];
  while (chosen.length < want) {
    let best: { water: MapCoord; out: MapCoord } | null = null;
    let bestD = -1;
    for (const c of cand) {
      let dMin = Infinity;
      for (const ch of chosen) {
        const d = Math.hypot(c.water.x - ch.water.x, c.water.y - ch.water.y);
        if (d < dMin) dMin = d;
      }
      if (dMin > bestD) { bestD = dMin; best = c; }
    }
    if (!best || bestD < SEA_CFG.portMinSep) break; // honest under-budget
    chosen.push(best);
  }
  const spots: SeaPortSpot[] = [];
  for (let i = 0; i < chosen.length; i++) {
    const c = chosen[i];
    // Land anchor: march outward past the shoreline, then a half-step inland.
    let landAt: MapCoord | null = null;
    for (let d = 1; d <= 6; d++) {
      const q = { x: c.water.x + c.out.x * probe * d * 0.6, y: c.water.y + c.out.y * probe * d * 0.6 };
      if (continentCellAt(q, contSeed).kind !== 'ocean') {
        landAt = { x: q.x + c.out.x * SEA_CFG.shoreInset, y: q.y + c.out.y * SEA_CFG.shoreInset };
        break;
      }
    }
    if (!landAt) continue;
    spots.push({
      id: `${sea.id}_p${i}`, seaId: sea.id,
      coord: landAt, shore: { x: c.water.x, y: c.water.y },
      tier: sea.cls.haven && i === 0 ? 'haven' : 'cove',
    });
  }
  return spots;
}

/** Every port spot within `radius` node-units of a coordinate — the quay
 *  beacon stream + landing tests. Scans the cells the radius box touches;
 *  memoized fills make repeats cheap. */
export function seaSpotsNear(coord: MapCoord, radius: number, fieldSeed: number): SeaPortSpot[] {
  const contSeed = continentSeedFrom(fieldSeed);
  const span = CONTINENT_CFG.cellSpan;
  const gx0 = Math.floor((coord.x - radius) / span), gx1 = Math.floor((coord.x + radius) / span);
  const gy0 = Math.floor((coord.y - radius) / span), gy1 = Math.floor((coord.y + radius) / span);
  const seen = new Set<string>();
  const out: SeaPortSpot[] = [];
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
      const sea = seaOfCell(gx, gy, contSeed);
      if (seen.has(sea.id)) continue;
      seen.add(sea.id);
      for (const s of sea.ports) {
        if (Math.hypot(s.shore.x - coord.x, s.shore.y - coord.y) <= radius) out.push(s);
      }
    }
  }
  return out;
}

/** Resolve a sea by its ID (`sea_<gx>_<gy>` — the canonical cell rides in
 *  the name, so a baked ZoneDef.seaId re-derives its whole sea without a
 *  water coordinate). Null on a malformed id or a cell that isn't ocean
 *  under this seed (a foreign save's id degrades quietly). */
export function seaById(id: string, fieldSeed: number): Sea | null {
  const m = /^sea_(-?\d+)_(-?\d+)$/.exec(id);
  if (!m) return null;
  const gx = Number(m[1]), gy = Number(m[2]);
  const contSeed = continentSeedFrom(fieldSeed);
  if (cellKind(gx, gy, contSeed) !== 'ocean') return null;
  return seaOfCell(gx, gy, contSeed);
}

/** The island-chance multiplier at a water coordinate (the per-class island
 *  lever, data/seas.ts) — 1 on land or unclassed water. Takes the CONTINENT
 *  seed (the island field already derived it). */
export function islandMulAt(coord: MapCoord, contSeed: number): number {
  const cell = continentCellAt(coord, contSeed);
  if (cell.kind !== 'ocean') return 1;
  return seaOfCell(cell.gx, cell.gy, contSeed).cls.islandMul;
}

/** FNV-ish 2-int hash (the continent field's idiom, local copy — pure). */
function hash2(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
