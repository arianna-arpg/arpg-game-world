// THE TIER FABRIC PROBE — the walkable layers pinned structurally
// (engine/tiers.ts): the region rows (including the N-story terrace/ramp
// families), the crossing law across arbitrary spans, all three carves
// (needles decks + sewer ducts + the switchback summits), per-story deck
// reachability, THE ASCENT LAW (entry → summit on foot), and determinism.
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
import {
  linkFlipTier, linkSpanOf, makeTierView, MAX_TIER, resolveTierCrossing,
  tierElevOf, tierFloorAt, tierFloorOf, tierLinkOf,
} from '../src/engine/tiers';
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

// --- RIG B′: the N-STORY laws (pure) --------------------------------------------------
{
  // The terrace/ramp family stands, story by story.
  let family = true;
  for (let k = 1; k <= MAX_TIER; k++) {
    const t = regionKind(`peak_terrace_${k}`), r = regionKind(`peak_ramp_${k}`);
    family = family && !!t && !t.walkable && !!t.blocks && t.tier === k && !!t.blocksShot && !!t.blocksSight
      && !!r && !!r.tierLink && r.tier === k && (k === 1 ? !!r.walkable : !r.walkable && !!r.blocks);
  }
  check(`B5 the family stands to MAX_TIER (${MAX_TIER})`, family);
  // Span derivation: walkable links touch the ground floor; high stairs
  // join the story below — no new field needed anywhere.
  const spans = (id: string): string => linkSpanOf(regionKind(id)!).join(':');
  check('B6 span derivation', spans('tier_ramp') === '0:1' && spans('culvert_well') === '0:1'
    && spans('peak_ramp_1') === '0:1' && spans('peak_ramp_2') === '1:2' && spans(`peak_ramp_${MAX_TIER}`) === `${MAX_TIER - 1}:${MAX_TIER}`);
  // The crossing law across a high span.
  const cell: Record<string, string> = { '0,0': 'peak_ramp_2', '1,0': 'peak_terrace_2', '-1,0': 'peak_terrace_1' };
  const grid = { regionAt: (x: number, y: number) => cell[`${Math.round(x / 30)},${Math.round(y / 30)}`] ?? 'ground', cell: 30 };
  check('B7 high stair → upper bench flips 1→2',
    resolveTierCrossing(grid, 1, vec(0, 0), vec(30, 0)) === 2);
  check('B8 high stair → lower bench flips 2→1',
    resolveTierCrossing(grid, 2, vec(0, 0), vec(-30, 0)) === 1);
  check('B9 the ladder toggle flips to the span\'s other end',
    linkFlipTier('peak_ramp_2', 2) === 1 && linkFlipTier('peak_ramp_2', 1) === 2
    && linkFlipTier('culvert_well', 0) === 1 && linkFlipTier('culvert_well', 1) === 0);
  check('B10 per-story floors', tierFloorAt('peak_terrace_3', 3) && !tierFloorAt('peak_terrace_3', 2)
    && !tierFloorAt('peak_terrace_3', 0) && tierFloorAt('peak_ramp_3', 2) && tierFloorAt('peak_ramp_3', 3)
    && !tierFloorAt('peak_ramp_3', 0) && tierFloorAt('tier_ramp', 0) && tierFloorAt('tier_ramp', 1));
  check('B11 elevations for flights', tierElevOf('ground') === 0 && tierElevOf('wall') === null
    && tierElevOf('butte_top') === 1 && tierElevOf('peak_terrace_4') === 4 && tierElevOf('peak_ramp_4') === 4);
}

// --- RIG F: the drawn-read data (steps + cliff flags) ---------------------------------
{
  const steps = (id: string): boolean => !!regionKind(id)?.visual?.steps;
  const cliff = (id: string): boolean => !!regionKind(id)?.visual?.cliff;
  let rampSteps = true;
  for (let k = 1; k <= MAX_TIER; k++) rampSteps = rampSteps && steps(`peak_ramp_${k}`);
  check('F1 every stepped way declares its treads',
    steps('tier_ramp') && steps('butte_span') && steps('tor_mouth') && rampSteps);
  let terrCliff = true;
  for (let k = 1; k <= MAX_TIER; k++) terrCliff = terrCliff && cliff(`peak_terrace_${k}`);
  check('F2 the open rims declare the cliff read', cliff('butte_top') && terrCliff);
  check('F3 covered layers stay unbroken (no cliff leak)',
    !cliff('tor_gallery') && !cliff('sewer_under_wall') && !cliff('sewer_duct'));
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
/** Census + deck-reachability over the tier layers: per STORY, BFS that
 *  story's floor from every link whose span touches it; every floor cell of
 *  the story must be reached (no orphan deck, no orphan bench). */
function tierStats(out: GeneratedLayout, levels = 1): { tierCells: number; linkCells: number; orphan: number } | null {
  const grid = out.walk;
  if (!(grid instanceof GridWalkField)) return null;
  const view = makeTierView(grid);
  const cs = grid.cell;
  const cols = grid.cols, rows = grid.rows;
  const at = (gx: number, gy: number): string => grid.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
  let tierCells = 0, linkCells = 0, orphan = 0;
  const idx = (gx: number, gy: number): number => gy * cols + gx;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const k = at(gx, gy);
      if (tierFloorOf(k)) tierCells++;
      if (tierLinkOf(k)) linkCells++;
    }
  }
  for (let t = 1; t <= levels; t++) {
    const seen = new Uint8Array(cols * rows);
    const q: number[] = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const k = at(gx, gy);
        if (!tierLinkOf(k)) continue;
        const [a, b] = linkSpanOf(regionKind(k)!);
        if (a !== t && b !== t) continue;
        const n = idx(gx, gy);
        if (!seen[n]) { seen[n] = 1; q.push(n); }
      }
    }
    for (let h = 0; h < q.length; h++) {
      const c = q[h], cx = c % cols, cy = Math.floor(c / cols);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = idx(nx, ny);
        if (seen[n] || !tierFloorAt(at(nx, ny), t)) continue;
        seen[n] = 1; q.push(n);
      }
    }
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const k = at(gx, gy);
        if (tierFloorAt(k, t) && !tierLinkOf(k) && !seen[idx(gx, gy)]) orphan++;
      }
    }
  }
  void view;
  return { tierCells, linkCells, orphan };
}

/** THE ASCENT LAW: BFS over (cell, story) states from the valley entry —
 *  same-story steps on that story's floor, story flips on link cells (the
 *  crossing law's graph form). True iff the TOP bench is stood upon. */
function ascentReaches(grid: GridWalkField, from: { x: number; y: number }, top: number): boolean {
  const cs = grid.cell, cols = grid.cols, rows = grid.rows;
  const at = (gx: number, gy: number): string => grid.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
  const idx = (gx: number, gy: number, t: number): number => (t * rows + gy) * cols + gx;
  const seen = new Uint8Array(cols * rows * (top + 1));
  const q: [number, number, number][] = [];
  const g0x = Math.min(cols - 1, Math.max(0, Math.floor(from.x / cs)));
  const g0y = Math.min(rows - 1, Math.max(0, Math.floor(from.y / cs)));
  if (!tierFloorAt(at(g0x, g0y), 0)) return false;
  seen[idx(g0x, g0y, 0)] = 1; q.push([g0x, g0y, 0]);
  for (let h = 0; h < q.length; h++) {
    const [cx, cy, t] = q[h];
    const kHere = at(cx, cy);
    const rkHere = regionKind(kHere);
    if (t === top && rkHere?.tier === top && !rkHere.tierLink) return true;
    if (rkHere?.tierLink) {
      const [a, b] = linkSpanOf(rkHere);
      const other = t === a ? b : t === b ? a : -1;
      if (other >= 0 && other <= top && !seen[idx(cx, cy, other)]) {
        seen[idx(cx, cy, other)] = 1; q.push([cx, cy, other]);
      }
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (seen[idx(nx, ny, t)] || !tierFloorAt(at(nx, ny), t)) continue;
      seen[idx(nx, ny, t)] = 1; q.push([nx, ny, t]);
    }
  }
  return false;
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

// --- RIG E: the switchback summit (the multi-story debut) ------------------------------
{
  const ts = TILESETS.pinnacle;
  check('E0 pinnacle rides the switchback above the crowns',
    ts?.biome === 'highland' && ts?.forceLayout === 'switchback' && hasLayout('switchback')
    && !!ts.depthAffinity && !ts.geoAffinity);
  const runCase = (name: string, params: Record<string, unknown>, seed: number): void => {
    const { out, def } = gen('qa_peak', 'switchback', ts.layout, { ...ts.layoutParams, ...params }, seed);
    const grid = out.walk;
    if (!(grid instanceof GridWalkField)) { check(`${name}: grid stands`, false); return; }
    const lv = def.tiers?.levels ?? 0;
    check(`${name}: the zone declares its stack`,
      def.tiers?.kind === 'over' && def.tiers?.exposure === 'open' && !!def.tiers?.rimDuels && lv >= 2,
      `levels=${lv}`);
    if (lv < 1) return;
    const cs = grid.cell, cols = grid.cols, rows = grid.rows;
    const at = (gx: number, gy: number): string => grid.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
    const terr = new Array(lv + 1).fill(0), ramps = new Array(lv + 1).fill(0);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const k = at(gx, gy);
        let m = /^peak_terrace_(\d+)$/.exec(k);
        if (m) { if (+m[1] <= lv) terr[+m[1]]++; continue; }
        m = /^peak_ramp_(\d+)$/.exec(k);
        if (m && +m[1] <= lv) ramps[+m[1]]++;
      }
    }
    const all = (arr: number[]): boolean => { for (let t = 1; t <= lv; t++) if (arr[t] <= 0) return false; return true; };
    check(`${name}: every bench STANDS`, all(terr), JSON.stringify(terr.slice(1)));
    check(`${name}: every rim is CUT`, all(ramps), JSON.stringify(ramps.slice(1)));
    const st = tierStats(out, lv);
    check(`${name}: no orphan bench on any story`, !!st && st.orphan === 0, `orphans=${st?.orphan}`);
    check(`${name}: THE ASCENT LAW — the peak is reached on foot`, ascentReaches(grid, entry, lv));
    check(`${name}: the valley skirt carries every exit`, exits.every(e => grid.reachable(entry, e)));
    // The crown keeps a reward: peakKit furniture stamped to the TOP story.
    const topKit = out.doodads.filter(d => (d as { tier?: number }).tier === lv);
    check(`${name}: the crown is DRESSED (story-stamped kit)`, topKit.length >= 1, `top-tier doodads=${topKit.length}`);
  };
  runCase('E1 the great cone', { peakArc: 'full', peakLevels: [4, 5] }, 717001);
  runCase('E2 the shoulder road', { peakArc: 'half', peakLevels: [3, 4] }, 717002);
  runCase('E3 the rolled face', {}, 717003);
  // Determinism: same seed, byte-equal furniture AND byte-equal ground.
  const fpr = (o: GeneratedLayout): string => {
    const g = o.walk as GridWalkField;
    let s = o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`).join('|');
    for (let gy = 0; gy < g.rows; gy += 2) for (let gx = 0; gx < g.cols; gx += 2) s += g.regionAt(gx * g.cell + 15, gy * g.cell + 15).length;
    return s;
  };
  const a = gen('qa_peak', 'switchback', ts.layout, { ...ts.layoutParams }, 717009);
  const b = gen('qa_peak', 'switchback', ts.layout, { ...ts.layoutParams }, 717009);
  check('E4 the summit is byte-deterministic', fpr(a.out) === fpr(b.out));
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
