// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CELL FOLD (seamless M1.5, the partition law's keel).
// world/cells.ts: every surface node claims an axis-cut, clamped,
// NON-OVERLAPPING cell — the WHERE her edge-to-edge ruling asks the map to
// drive. Pins:
//   A. determinism — two folds over the same seats answer byte-identically.
//   B. every seat stands strictly inside its own cell.
//   C. THE NON-OVERLAP LAW — no two cells share interior area, over a real
//      grown web (shared edges allowed; that is what borders are).
//   D. linked surface pairs meet: most share a true border; where axis-cut
//      triple points open an interstice, the truly-unclaimed run stays
//      BOUNDED (wedges are the border blend's food by design — small
//      walkable tissue at awkward corners; the fold guarantees non-overlap,
//      never full coverage). Measured worst on grown webs: ~614px; the 900px
//      ceiling catches the approximation DEGRADING, not the wedges existing.
//   E. the clamp holds (no cell exceeds 2×cellMaxHalfPx on either axis) and
//      the degenerate floor answers totally (co-close synthetic seats get
//      the min span, never a throw, never an inverted rect).
//
//   npx tsx balance/probe_cells.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mapToPx } from '../src/world/coords';
import { PARTITION_CFG } from '../src/world/seamless';
import { cellForSeat, cellsShareBorder, foldCells, type CellSeat } from '../src/world/cells';
import type { ZoneDef } from '../src/data/zones';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) { pass++; console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

bootSimEngine();
seedGlobalRandom(909101); // the web grows on the global stream — seed it or
                          // every run measures a DIFFERENT web (the D1 wedge
                          // tail flaked 535→1494 across unseeded rolls)
const w = makeSimWorld('warrior', 909101);

// Grow the chart through the real frontier resolution (the persistence-G /
// webperf idiom) so the fold meets a REAL web, not a toy roster.
const priv = w as unknown as { chartNeighborsOf(z: ZoneDef): void };
for (let r = 0; r < 6; r++) {
  const batch = Object.values(w.zoneMap).filter(z =>
    (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket
    && z.objective.kind !== 'safe' && !z.floating
    && z.exits.some(e => e.to === '?'));
  for (const z of batch) priv.chartNeighborsOf(z);
}

const surface = Object.values(w.zoneMap).filter(z =>
  (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket && !z.floating);
const seats: CellSeat[] = surface.map(z => ({ id: z.id, ...mapToPx(z.map) }));
check('fixture: the grown web offers real scale', seats.length >= 25, `${seats.length} surface seats`);

// --- A. determinism ---------------------------------------------------------
const fold1 = foldCells(seats);
const fold2 = foldCells(seats);
check('A1 two folds answer byte-identically',
  JSON.stringify([...fold1]) === JSON.stringify([...fold2]));

// --- B. seats inside their own cells ---------------------------------------
{
  let out = 0;
  for (const s of seats) {
    const c = fold1.get(s.id)!;
    if (!(s.x > c.x0 && s.x < c.x1 && s.y > c.y0 && s.y < c.y1)) out++;
  }
  check('B1 every seat stands strictly inside its own cell', out === 0, `${out} outside`);
}

// --- C. THE NON-OVERLAP LAW -------------------------------------------------
{
  const cells = [...fold1.entries()];
  let overlaps = 0; let worst = 0;
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = cells[i][1], b = cells[j][1];
    const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ox > 0.01 && oy > 0.01) { overlaps++; worst = Math.max(worst, Math.min(ox, oy)); }
  }
  check('C1 no two cells share interior area (the law itself)',
    overlaps === 0, overlaps ? `${overlaps} pairs, worst ${worst.toFixed(1)}px` : `${cells.length} cells clean`);
}

// --- D. linked pairs meet (bounded interstice) ------------------------------
{
  const inCell = (x: number, y: number, c: { x0: number; y0: number; x1: number; y1: number }): boolean =>
    x >= c.x0 - 0.01 && x <= c.x1 + 0.01 && y >= c.y0 - 0.01 && y <= c.y1 + 0.01;
  let pairs = 0, touching = 0, worstGap = 0;
  for (const z of surface) {
    for (const e of z.exits) {
      if (e.to === '?' || e.to <= z.id) continue;
      const oz = w.zoneMap[e.to];
      if (!oz || !fold1.has(oz.id) || (oz.dimension ?? 'surface') !== 'surface') continue;
      const a = fold1.get(z.id)!, b = fold1.get(oz.id)!;
      const sa = seats.find(s => s.id === z.id)!, sb = seats.find(s => s.id === oz.id)!;
      if (Math.abs(sb.x - sa.x) >= PARTITION_CFG.cellMaxHalfPx * 2
        || Math.abs(sb.y - sa.y) >= PARTITION_CFG.cellMaxHalfPx * 2) continue; // clamp-separated
      pairs++;
      if (cellsShareBorder(a, b)) { touching++; continue; }
      // Walk the seat-to-seat segment; measure the run claimed by NO cell at
      // all (a third zone's corner on the way is CLAIMED ground — crossing a
      // neighbor's edge en route is the partition working, not a gap; only
      // truly unclaimed slivers belong to the blend band).
      let gap = 0;
      const steps = 400;
      const all = [...fold1.values()];
      for (let t = 0; t <= steps; t++) {
        const x = sa.x + (sb.x - sa.x) * (t / steps), y = sa.y + (sb.y - sa.y) * (t / steps);
        if (!all.some(c => inCell(x, y, c))) gap += Math.hypot(sb.x - sa.x, sb.y - sa.y) / steps;
      }
      worstGap = Math.max(worstGap, gap);
    }
  }
  check('D1 linked pairs meet or leave only a bounded wedge (the blend band owns interstices)',
    pairs > 0 && worstGap <= 900,
    `${touching}/${pairs} share a border; worst unclaimed wedge ${worstGap.toFixed(0)}px (ceiling 900; measured ~614 at the fold's birth)`);
}

// --- E. the clamp + the degenerate floor ------------------------------------
{
  let over = 0;
  for (const c of fold1.values()) {
    if (c.x1 - c.x0 > PARTITION_CFG.cellMaxHalfPx * 2 + 0.01
      || c.y1 - c.y0 > PARTITION_CFG.cellMaxHalfPx * 2 + 0.01) over++;
  }
  check('E1 the clamp holds on every cell', over === 0, `${over} over`);
  const tight = cellForSeat({ id: 'a', x: 0, y: 0 }, [
    { id: 'b', x: 60, y: 0 }, { id: 'c', x: -60, y: 0 },
    { id: 'd', x: 0, y: 60 }, { id: 'e', x: 0, y: -60 },
  ]);
  check('E2 the degenerate floor answers totally (min span, never inverted)',
    tight.x1 - tight.x0 >= PARTITION_CFG.minCellSpanPx - 0.01
    && tight.y1 - tight.y0 >= PARTITION_CFG.minCellSpanPx - 0.01
    && tight.x1 > tight.x0 && tight.y1 > tight.y0,
    `${(tight.x1 - tight.x0).toFixed(0)}×${(tight.y1 - tight.y0).toFixed(0)}`);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
