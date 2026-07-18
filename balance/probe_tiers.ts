// THE TIER FABRIC PROBE — the second walkable layer pinned structurally
// (engine/tiers.ts): the region rows, the crossing law, both debut carves
// (needles decks + sewer ducts), deck reachability, and determinism.
//   npx tsx balance/probe_tiers.ts

import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/massifs';
import '../src/data/compositions';
import '../src/data/settled';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { generateLayout, hasLayout, type GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { massKindOf } from '../src/engine/massif';
import { makeTierView, resolveTierCrossing, tierFloorOf, tierLinkOf } from '../src/engine/tiers';
import { TILESETS } from '../src/data/tilesets';
import type { StampSpec, ZoneDef } from '../src/data/zones';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

// --- RIG A: the registry weave ----------------------------------------------------
{
  check('A1 needles layout registered', hasLayout('needles'));
  check('A2 butte kind seats butte_top', massKindOf('butte')?.region === 'butte_top');
  const top = regionKind('butte_top'), span = regionKind('butte_span');
  const ramp = regionKind('tier_ramp'), duct = regionKind('sewer_duct');
  const uw = regionKind('sewer_under_wall'), well = regionKind('culvert_well');
  check('A3 butte_top: wall below, floor above', !!top && !top.walkable && top.tier === 1 && !!top.blocksShot);
  check('A4 butte_span: one cell, two floors', !!span && !!span.walkable && span.tier === 1 && !span.blocksShot);
  check('A5 tier_ramp + culvert_well are CROSSINGS', !!ramp?.tierLink && !!well?.tierLink && !!ramp?.walkable && !!well?.walkable);
  check('A6 sewer_duct: street above keeps its face', !!duct && !!duct.walkable && duct.tier === 1 && !duct.visual && !!duct.tierVisual);
  check('A7 sewer_under_wall: brick above, tunnel below', !!uw && !uw.walkable && uw.tier === 1 && !!uw.visual && !!uw.tierVisual);
}

// --- RIG B: the crossing law (pure) --------------------------------------------------
{
  const cell: Record<string, string> = { '0,0': 'tier_ramp', '1,0': 'butte_top', '-1,0': 'ground' };
  const grid = { regionAt: (x: number, y: number) => cell[`${Math.round(x / 30)},${Math.round(y / 30)}`] ?? 'ground', cell: 30 };
  check('B1 link → deck-only ground flips 0→1',
    resolveTierCrossing(grid, 0, vec(0, 0), vec(30, 0)) === 1);
  check('B2 link → valley-only ground flips 1→0',
    resolveTierCrossing(grid, 1, vec(0, 0), vec(-30, 0)) === 0);
  check('B3 off-link steps never flip',
    resolveTierCrossing(grid, 0, vec(-30, 0), vec(-60, 0)) === 0);
  check('B4 predicates', tierFloorOf('butte_top') && tierFloorOf('tier_ramp') && tierLinkOf('culvert_well') && !tierFloorOf('ground'));
}

// --- Layout harness ------------------------------------------------------------------
const arena = { w: 3400, h: 2500 };
const entry = vec(150, arena.h / 2);
const exits = [vec(arena.w - 150, arena.h / 2), vec(arena.w / 2, 150)];
const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
function gen(id: string, layoutType: string, layout: StampSpec[], layoutParams: Record<string, unknown>, seed: number): { out: GeneratedLayout; def: ZoneDef } {
  const def = {
    id, name: `QA ${id}`, level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType, layoutParams, seed,
  } as unknown as ZoneDef;
  const out = generateLayout(def, arena, new Rng(seed), entry, exits);
  return { out, def };
}
/** Census + deck-reachability over the tier layer: BFS the tier grid from
 *  every LINK cell; every tier-1 floor cell must be reached (no orphan deck). */
function tierStats(out: GeneratedLayout): { tierCells: number; linkCells: number; orphan: number } | null {
  const grid = out.walk;
  if (!(grid instanceof GridWalkField)) return null;
  const view = makeTierView(grid);
  const cs = grid.cell;
  const cols = grid.cols, rows = grid.rows;
  const at = (gx: number, gy: number): string => grid.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
  let tierCells = 0, linkCells = 0;
  const idx = (gx: number, gy: number): number => gy * cols + gx;
  const seen = new Uint8Array(cols * rows);
  const q: number[] = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const k = at(gx, gy);
      if (tierFloorOf(k)) tierCells++;
      if (tierLinkOf(k)) { linkCells++; if (!seen[idx(gx, gy)]) { seen[idx(gx, gy)] = 1; q.push(idx(gx, gy)); } }
    }
  }
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % cols, cy = Math.floor(c / cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = idx(nx, ny);
      if (seen[n] || !tierFloorOf(at(nx, ny))) continue;
      seen[n] = 1; q.push(n);
    }
  }
  let orphan = 0;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (tierFloorOf(at(gx, gy)) && !seen[idx(gx, gy)]) orphan++;
    }
  }
  void view;
  return { tierCells, linkCells, orphan };
}

// --- RIG C: the needles (open exposure) ---------------------------------------------
{
  const ts = TILESETS.needles;
  for (const seed of [515001, 515002, 515003]) {
    const { out, def } = gen('qa_needles', 'needles', ts.layout, { ...ts.layoutParams }, seed);
    const st = tierStats(out);
    if (!st) { check(`C needles grid (seed ${seed})`, false); continue; }
    check(`C1 the decks STAND (seed ${seed})`, st.tierCells > 150, `cells=${st.tierCells}`);
    check(`C2 the ramps CUT (seed ${seed})`, st.linkCells > 0, `links=${st.linkCells}`);
    check(`C3 no orphan deck (seed ${seed})`, st.orphan === 0, `orphans=${st.orphan}`);
    check(`C4 the zone DECLARES its layer (seed ${seed})`,
      def.tiers?.kind === 'over' && def.tiers?.exposure === 'open');
  }
  const a = gen('qa_needles', 'needles', ts.layout, { ...ts.layoutParams }, 999);
  const b = gen('qa_needles', 'needles', ts.layout, { ...ts.layoutParams }, 999);
  const fp = (o: GeneratedLayout): string => o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`).join('|');
  check('C5 needles byte-deterministic', fp(a.out) === fp(b.out));
}

// --- RIG D: the sewer under-lattice (covered exposure) --------------------------------
{
  const metro = TILESETS.metropolis;
  const warrens = metro.variants?.find(v => v.name === 'the warrens');
  let carved = 0, orphans = 0, declared = 0, tried = 0;
  for (const seed of [616001, 616002, 616003, 616004, 616005, 616006]) {
    const { out, def } = gen('qa_warrens', 'district', warrens?.layout ?? metro.layout,
      { ...metro.layoutParams, ...warrens?.layoutParams, sewerTier: 1 }, seed);
    tried++;
    const st = tierStats(out);
    if (!st || st.tierCells === 0) continue; // the lattice honestly declined (no clear legs)
    carved++;
    orphans += st.orphan;
    if (def.tiers?.kind === 'under' && def.tiers?.exposure === 'covered') declared++;
  }
  check('D1 the duct web carves in most warrens', carved >= 4, `${carved}/${tried}`);
  check('D2 no orphan duct anywhere', orphans === 0, `orphans=${orphans}`);
  check('D3 carved zones DECLARE covered/under', declared === carved, `${declared}/${carved}`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
