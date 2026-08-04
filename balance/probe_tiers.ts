// THE TIER FABRIC PROBE — the walkable layers pinned structurally
// (engine/tiers.ts): the region rows (including the N-story terrace/ramp
// families), the crossing law across arbitrary spans, all three carves
// (needles decks + sewer ducts + the switchback summits), per-story deck
// reachability, THE ASCENT LAW (entry → summit on foot), determinism, and
// THE ELEVATION LAW (engine/los.ts RayElev): height-aware sight/shot over
// the stack — same-story duels over open deck, rim duels refereed by the
// lerped eye line, the flat flight law, the doodad story band, and the
// SIGHT VEIL's drawn parity (render/vis/sightVeil.ts, headless) — plus
// THE PROACTIVE HUNT (RIG J): World.pathField(story) per-story fields
// (makeTierNav — link cells as walkable seams), the tier-less identity
// law (flat zones return the same object for every story), the stair
// election (World.tierLinkToward), the live crossing (an un-witnessed
// deck hunter elects a ramp and changes story toward a valley player),
// and THE SEVERED BAND (ai.ts severedBandGoal / TIER_CFG.severedBandReach):
// a flanker's orbit defers to the approach lane across a story gap and
// crosses, while long kits keep their rim duel and stand-ground styles
// keep their posts — and THE MAP TELL (RIG M): tierMapTell (ui/panels.ts),
// the world map's fog-gated stacked-ground read, pinned pure and against
// the real minted defs.
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
import { severedBandGoal, updateAI, type KernelCtx } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import { SEG_CFG } from '../src/engine/segments';
import { mod } from '../src/engine/stats';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  generateLayout, hasLayout, registerCluster, registerComposition, registerDoodadRule,
  registerLandmark, validateCompositions, type Doodad, type GeneratedLayout,
} from '../src/engine/levelgen';
import { castRay, LOS_CFG } from '../src/engine/los';
import { SightVeil } from '../src/render/vis/sightVeil';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { massKindOf } from '../src/engine/massif';
import {
  landingTier, linkFlipTier, linkSpanOf, makeTierView, MAX_TIER,
  resolveTierCrossing, storyReachable, tierElevOf, tierFloorAt, tierFloorOf,
  tierLinkOf, UNDER_TIER_LANES,
} from '../src/engine/tiers';
import { insideBounds } from '../src/world/shape';
import { TILESETS } from '../src/data/tilesets';
import type { StampSpec, ZoneDef } from '../src/data/zones';
import { tierMapTell } from '../src/ui/panels';

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
function gen(id: string, layoutType: string, layout: StampSpec[], layoutParams: Record<string, unknown>, seed: number,
  genOpts?: { shape?: 'rect' | 'ellipse' }): { out: GeneratedLayout; def: ZoneDef } {
  const def = {
    id, name: `QA ${id}`, level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType, layoutParams, seed,
    ...(genOpts?.shape ? { shape: genOpts.shape } : {}),
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

// --- RIG H: THE TOUCH-DOWN LAW (the flight fabric's landing) ---------------------
// landingTier — the story a body wears when its wings fold: keep the current
// story while its floor still stands, else the floor under it answers; true
// walls keep the story for the mover snap to resolve on the body's own layer.
{
  check('H1 a settling body keeps a floor that still stands',
    landingTier('butte_top', 1) === 1 && landingTier('ground', 0) === 0
    && landingTier('tier_ramp', 0) === 0 && landingTier('tier_ramp', 1) === 1
    && landingTier('culvert_well', 1) === 1);
  check('H2 landing over the valley re-seats the valley\'s story',
    landingTier('ground', 1) === 0 && landingTier('ground', 5) === 0);
  check('H3 alighting on a deck wears it — however many stories the climb',
    landingTier('butte_top', 0) === 1 && landingTier('peak_terrace_4', 0) === 4
    && landingTier('peak_terrace_2', 5) === 2);
  check('H4 a true wall keeps the story (the mover snap resolves)',
    landingTier('wall', 1) === 1 && landingTier('wall', 0) === 0);
}

// --- RIG G: THE ELEVATION LAW (sight/shot over the stack) ------------------------
// The one occlusion ray (engine/los.ts castRay + RayElev) judged over a REAL
// needles carve: a blocking cell that is tier FLOOR stops only rays below its
// deck (lerped eye → eye), doodads fill one story of air above their own, and
// the SIGHT VEIL's queries mirror the ray exactly (drawn == tested).
{
  interface P { x: number; y: number }
  interface Spots { A: P; B: P; D: P; R: P; Rin: P; V1: P; V2: P }
  /** Hunt one butte for the rig's seats: two interior deck cells (A, B), a
   *  deep-interior cell D behind rim cell R (Rin = one cell behind R), and
   *  valley points V1 (2 cells out) / V2 (8 cells out) on R's own outward
   *  lane — every lane cell verified so the geometry is the law's, never
   *  the carve's accident. */
  const elevSpots = (grid: GridWalkField): Spots | null => {
    const cs = grid.cell, cols = grid.cols, rows = grid.rows;
    const at = (gx: number, gy: number): string => grid.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
    const c = (gx: number, gy: number): P => ({ x: gx * cs + cs / 2, y: gy * cs + cs / 2 });
    const isTop = (gx: number, gy: number): boolean =>
      gx >= 0 && gy >= 0 && gx < cols && gy < rows && at(gx, gy) === 'butte_top';
    const isValley = (gx: number, gy: number): boolean =>
      gx >= 0 && gy >= 0 && gx < cols && gy < rows
      && !tierFloorOf(at(gx, gy)) && grid.isWalkable(gx * cs + cs / 2, gy * cs + cs / 2);
    const interior = (gx: number, gy: number): boolean => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!isTop(gx + dx, gy + dy)) return false;
      }
      return true;
    };
    for (let gy = 1; gy < rows - 1; gy++) {
      for (let gx = 1; gx < cols - 1; gx++) {
        // A row-run of ≥ 6 interior cells: A and B are its ends (same deck).
        let run = 0;
        while (interior(gx + run, gy)) run++;
        if (run < 6) continue;
        const A = c(gx, gy), B = c(gx + run - 1, gy);
        // R: a rim cell with an 8-cell straight valley lane outward, and 5
        // straight deck cells behind it (D sits at the fifth).
        for (let ry = 1; ry < rows - 1; ry++) {
          for (let rx = 1; rx < cols - 1; rx++) {
            if (!isTop(rx, ry)) continue;
            for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
              let lane = true;
              for (let k = 1; k <= 8 && lane; k++) lane = isValley(rx + ox * k, ry + oy * k);
              if (!lane) continue;
              let deck = true;
              for (let k = 1; k <= 5 && deck; k++) deck = isTop(rx - ox * k, ry - oy * k);
              if (!deck) continue;
              return {
                A, B, D: c(rx - ox * 5, ry - oy * 5), R: c(rx, ry),
                Rin: c(rx - ox, ry - oy),
                V1: c(rx + ox * 2, ry + oy * 2), V2: c(rx + ox * 8, ry + oy * 8),
              };
            }
          }
        }
      }
    }
    return null;
  };
  let grid: GridWalkField | null = null;
  let spots: Spots | null = null;
  for (const seed of [515001, 515002, 515003, 515004, 515005]) {
    const ts = TILESETS.needles;
    const { out } = gen('qa_needles_elev', 'needles', ts.layout, { ...ts.layoutParams }, seed);
    if (!(out.walk instanceof GridWalkField)) continue;
    const s = elevSpots(out.walk);
    if (s) { grid = out.walk; spots = s; break; }
  }
  check('G0 the rig finds its butte', !!spots);
  if (grid && spots) {
    const { A, B, D, R, Rin, V1, V2 } = spots;
    const eye = LOS_CFG.elev.eye;
    const env = { doodadsAt: () => [] as readonly Doodad[], walk: grid };
    const s = (t: number): { from: number; to: number } => ({ from: t + eye, to: t + eye });
    const pair = (a: number, b: number): { from: number; to: number } => ({ from: a + eye, to: b + eye });
    check('G1 the legacy flat ray still blocks (no elev = the old read)',
      castRay(env, A, B, 'sight') !== null);
    check('G2 a same-story deck duel is open air (sight + shot)',
      castRay(env, A, B, 'sight', s(1)) === null
      && castRay(env, A, B, 'shot', s(1)) === null);
    check('G3 the deep bench hides from the valley (lerped eye line)',
      castRay(env, V1, D, 'sight', pair(0, 1)) !== null);
    check('G4 a near-rim stander is SEEN from afar (the lerp clears the lip)',
      castRay(env, V2, Rin, 'sight', pair(0, 1)) === null
      && castRay(env, V2, R, 'sight', pair(0, 1)) === null);
    check('G5 the flat flight law: valley arrows die on the cliff, deck arrows rain out',
      castRay(env, V1, D, 'shot', s(0)) !== null
      && castRay(env, D, V2, 'shot', s(1)) === null);
    // The doodad story band: a body fills [tier, tier+band) of air.
    const mid = { x: (V2.x + R.x) / 2, y: (V2.y + R.y) / 2 };
    const rock = { pos: vec(mid.x, mid.y), radius: 20, kind: 'rock', rot: 0 } as unknown as Doodad;
    const envRock = { doodadsAt: () => [rock] as readonly Doodad[], walk: null };
    check('G6 a valley trunk stops valley rays and spares the deck flight',
      castRay(envRock, V2, R, 'sight', pair(0, 0)) !== null
      && castRay(envRock, V2, R, 'sight', pair(1, 1)) === null);
    rock.tier = 1;
    check('G7 deck furniture never shades the street below',
      castRay(envRock, V2, R, 'sight', pair(0, 0)) === null
      && castRay(envRock, V2, R, 'sight', pair(1, 1)) !== null);
    // THE VEIL PARITY (render/vis/sightVeil.ts, headless): the drawn pass's
    // queries walk the same lerp — pixels and rays can never disagree.
    const veilAt = (eyeP: P, tier: number, q: P, qT: number): number => {
      const veil = new SightVeil();
      veil.update({
        player: { pos: eyeP, tier }, walk: grid, zone: {},
        doodads: [] as Doodad[], doodadsNear: () => [], doodadRev: 0,
      }, 0, 1400, 1000);
      return veil.occludedAt(q, qT);
    };
    check('G8 veil: a same-story neighbor draws SOLID (the reported bug)',
      veilAt(A, 1, B, 1) === 0);
    check('G9 veil: the deep bench stays dark from the valley',
      veilAt(V1, 0, D, 1) > 0.2);
    check('G10 veil: the rim-stander pokes above the cliff dark',
      veilAt(V2, 0, R, 1) === 0);
    check('G11 veil: the cliff base hides from the deep deck; the far floor shows',
      veilAt(D, 1, V1, 0) > 0.2 && veilAt(D, 1, V2, 0) === 0);
  }
}

// --- RIG I: THE BAND LAW (tether bands vs. masonry) ------------------------------
// A tether band is not a placement but a LINE strung between two anchors, so its
// arc has to run from BOTH of them to the ground it burns (LOS_CFG.tetherLinks +
// World.tetherOcclusion/tetherSees): masonry across the run eats the bite AND the
// ally mend, the attitude is DATA rather than a literal at the tick site, a
// skill's own `occlusion` word still overrides, a phasing owner burns through —
// and every hittable body is refereed against its OWN line, so a serpent's coils
// can never disagree about one pillar.
{
  check('I1 the band lanes are DATA (LOS_CFG.tetherLinks), payload lanes blocked',
    LOS_CFG.tetherLinks.caster === 'blocked' && LOS_CFG.tetherLinks.network === 'blocked'
    && LOS_CFG.tetherLinks.target === 'blocked' && LOS_CFG.tetherLinks.pack === 'blocked'
    // Momentary payload-less visual arcs stay unenrolled — unlisted reads free,
    // exactly as unlisted delivery types do.
    && LOS_CFG.tetherLinks.zap === undefined);

  const w = makeSimWorld('summoner', 0x7be1);
  type Band = ReturnType<typeof makeSimWorld>['tethers'][number];
  const drive = (dt: number): void =>
    (w as unknown as { updateTethers(dt: number): void }).updateTethers(dt);

  // The band runs due east through the arena's middle; ONE wall stands on its
  // line at the midpoint. It severs the run past itself from either end, and
  // shadows nothing that stands wide enough to be seen around.
  const cx = 800, cy = 600;
  const A = { x: cx - 300, y: cy }, B = { x: cx + 300, y: cy };
  const far = { x: cx + 150, y: cy };   // ON the band, east of the wall
  const wide = { x: cx, y: cy + 90 };   // ON the band, wide of the wall
  w.player.pos = vec(A.x, A.y);
  const anchor = w.createMonster('zombie', 3, 'player');
  anchor.pos = vec(B.x, B.y);
  w.actors.push(anchor);
  w.doodads.push({ pos: vec(cx, cy), radius: 50, kind: 'wall' } as never);
  w.markDoodadsChanged();

  check('I2 the fixture is honest: the wall eats the west line to the far seat, and neither line to the wide one',
    !w.lineOfFire(vec(A.x, A.y), vec(far.x, far.y))
    && w.lineOfFire(vec(B.x, B.y), vec(far.x, far.y))
    && w.lineOfFire(vec(A.x, A.y), vec(wide.x, wide.y))
    && w.lineOfFire(vec(B.x, B.y), vec(wide.x, wide.y)));

  /** A fresh body per case — one tether tick is deliberately a heavy blow, so
   *  no seat is ever asked to answer twice. */
  const seat = (team: 'enemy' | 'player', at: { x: number; y: number }): Actor => {
    const e = w.createMonster('zombie', 3, team);
    e.pos = vec(at.x, at.y);
    w.actors.push(e);
    return e;
  };
  /** Re-string the ONE band under test (the attitude resolves once per band,
   *  so every case gets a fresh one). */
  const band = (over: Partial<Band> = {}): Band => {
    const t: Band = {
      a: w.player, b: anchor, owner: w.player,
      skillId: 'probe_band', link: 'target',
      amounts: { physical: 500 }, heal: 0, affects: 'enemies',
      width: 120, remaining: 999, tickTimer: 0, color: '#fff',
      ax: A.x, ay: A.y, bx: B.x, by: B.y,
      ...over,
    };
    w.tethers.length = 0;
    w.tethers.push(t);
    return t;
  };

  {
    const walled = seat('enemy', far), open = seat('enemy', wide);
    const t = band();
    const l0 = walled.life, o0 = open.life;
    drive(0.5);
    check('I3 the band lane reads BLOCKED off the registry', w.tetherOcclusion(t) === 'blocked');
    check('I4 a hostile the band only reaches THROUGH stone takes no tick', walled.life === l0);
    check('I5 ...while one the whole band still reaches is bitten', open.life < o0);
  }
  {
    // The mend obeys the same wall — succor is not a loophole.
    const ally = seat('player', far), mate = seat('player', wide);
    ally.life = 10; mate.life = 10;
    band({ amounts: {}, heal: 200, affects: 'allies' });
    drive(0.5);
    check('I6 a walled-off ally receives no mend either', ally.life === 10);
    check('I7 ...while an ally the band reaches is healed', mate.life > 10);
  }
  {
    // A positive `phasing` on the owner frees the whole band, exactly as it
    // frees every other delivery lane.
    const walled = seat('enemy', far);
    w.player.sheet.setSource('probe_phasing', [mod('phasing', 'flat', 1)]);
    const t = band();
    const l0 = walled.life;
    drive(0.5);
    check('I8 a phasing owner\'s band burns straight through the stone',
      w.tetherOcclusion(t) === 'free' && walled.life < l0);
    w.player.sheet.setSource('probe_phasing', []);
  }
  {
    // The laying skill's own word still overrides the lane default.
    const walled = seat('enemy', far);
    const t = band({ inst: { def: { id: 'probe_free', delivery: { type: 'target', occlusion: 'free' } } } as never });
    const l0 = walled.life;
    drive(0.5);
    check('I9 the skill\'s own `occlusion: free` overrides the lane',
      w.tetherOcclusion(t) === 'free' && walled.life < l0);
  }
  {
    // THE SEGMENT GRAIN: a serpent whose HEAD stands past the wall and whose
    // first coil stands wide of it. Gated once per actor centre the head's
    // blocked line would spare the whole creature; gated per BODY the coil is
    // honestly bitten — and the flash lands on the coil that was actually hit.
    const coiled = seat('enemy', far);
    coiled.worm = {
      length: 1, spacing: 30, taper: 0.9, hittable: true,
      segments: [vec(wide.x, wide.y)],
    };
    band();
    const c0 = coiled.life;
    drive(0.5);
    check('I10 a serpent\'s coils each answer their OWN line (walled head, open coil → the coil bites)',
      coiled.life < c0 && coiled.worm.flash?.[0] === SEG_CFG.flashTime);
  }
}

// --- RIG J: THE PROACTIVE HUNT (per-story pathField + the stair election) --------
// The other half of the tier chase: a pursuer that never SAW a crossing still
// routes onto a link and changes story on its own hunt. World.pathField(story)
// serves each story's own floor (makeTierNav — links as walkable seams), flat
// zones return the identical old field for EVERY story (object identity), and
// the live run drives a deck zombie down a ramp toward a valley player with
// the reactive aiTierGoal lane provably silent throughout.
{
  const w = makeSimWorld('warrior', 0x71e21);
  const hyp = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
    Math.hypot(a.x - b.x, a.y - b.y);

  // J1 — THE IDENTITY LAW on tier-less ground, both lanes. The sim arena
  // (convex nav) and a farmland mint (walk grid, no def.tiers) must answer
  // every story with the SAME object the flat call returns.
  {
    const f0 = w.pathField();
    check('J1a a tier-less convex zone answers every story with ONE field',
      !!f0 && w.pathField(0) === f0 && w.pathField(3) === f0);
    const zid = w.devMintTileset('farmland', 1, 5, { seed: 909170 });
    const g0 = w.pathField();
    check('J1b a tier-less GRID zone answers every story with the base grid',
      !!zid && !!g0 && w.pathField(0) === g0 && w.pathField(2) === g0 && w.pathField(9) === g0);
  }

  // The needles fixture: mint through the REAL path (placeZoneAt → loadZone),
  // then hunt the carve for the rig's seats — a ramp (link cluster), an
  // interior deck cell a real walk from it, and a valley cell the ramp's foot
  // can reach. Seeds re-rolled until the geometry stands (the RIG G idiom).
  interface JSpots { deck: { x: number; y: number }; ramp: { x: number; y: number }; valley: { x: number; y: number } }
  const findSpots = (grid: GridWalkField): JSpots | null => {
    const cs = grid.cell, cols = grid.cols, rows = grid.rows;
    const at = (gx: number, gy: number): string => grid.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
    const c = (gx: number, gy: number): { x: number; y: number } => ({ x: gx * cs + cs / 2, y: gy * cs + cs / 2 });
    const links: [number, number][] = [];
    for (let gy = 1; gy < rows - 1; gy++) {
      for (let gx = 1; gx < cols - 1; gx++) if (tierLinkOf(at(gx, gy))) links.push([gx, gy]);
    }
    for (const [lx, ly] of links) {
      // The link's own story-1 country: BFS deck floor (links included) and
      // keep the interior deck cells (all four neighbours story-1 floor).
      const seen = new Uint8Array(cols * rows);
      const q: number[] = [ly * cols + lx];
      seen[ly * cols + lx] = 1;
      const deck: [number, number][] = [];
      for (let h = 0; h < q.length; h++) {
        const cell = q[h], cx = cell % cols, cy = Math.floor(cell / cols);
        const k = at(cx, cy);
        if (tierFloorAt(k, 1) && !tierLinkOf(k)) {
          let interior = true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            if (!tierFloorAt(at(cx + dx, cy + dy), 1)) { interior = false; break; }
          }
          if (interior) deck.push([cx, cy]);
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
          const n = ny * cols + nx;
          if (seen[n] || !tierFloorAt(at(nx, ny), 1)) continue;
          seen[n] = 1; q.push(n);
        }
      }
      // The hunter's seat: an interior deck cell a REAL march from the stair
      // (5–10 cells — routing, not adjacency), yet near enough that the
      // whole fixture fits one detection bubble.
      let seat: [number, number] | null = null, seatD = 0;
      for (const [gx, gy] of deck) {
        const d = Math.hypot(gx - lx, gy - ly);
        if (d >= 5 && d <= 10 && d > seatD) { seatD = d; seat = [gx, gy]; }
      }
      if (!seat) continue;
      // The quarry's ground: open valley floor (no story above it), a
      // mid-range walk from the stair's foot, connected to it, and inside
      // the hunter's detect bubble (≤ 13 cells ≈ 390 px < the warrior's 442).
      const ramp = c(lx, ly);
      let valley: { x: number; y: number } | null = null, vScore = Infinity;
      for (let gy = 1; gy < rows - 1; gy++) {
        for (let gx = 1; gx < cols - 1; gx++) {
          const k = at(gx, gy);
          if (tierFloorOf(k) || tierLinkOf(k)) continue;
          const p = c(gx, gy);
          if (!grid.isWalkable(p.x, p.y)) continue;
          const dCells = Math.hypot(gx - lx, gy - ly);
          if (dCells < 8 || dCells > 14) continue;
          if (Math.hypot(gx - seat[0], gy - seat[1]) > 13) continue;
          // RIM STANDOFF: no story floor within 4 cells — a rim-duel claw
          // from the lip must never reach the quarry, so the DESCENT is the
          // only road to blood (the thing under test).
          let standoff = true;
          for (let oy = -4; oy <= 4 && standoff; oy++) {
            for (let ox = -4; ox <= 4; ox++) {
              const nx = gx + ox, ny = gy + oy;
              if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
              if (tierFloorOf(at(nx, ny))) { standoff = false; break; }
            }
          }
          if (!standoff) continue;
          const score = Math.abs(dCells - 12);
          if (score < vScore && grid.reachable(vec(ramp.x, ramp.y), vec(p.x, p.y))) {
            vScore = score; valley = p;
          }
        }
      }
      if (valley) return { deck: c(seat[0], seat[1]), ramp, valley };
    }
    return null;
  };

  let grid: GridWalkField | null = null;
  let spots: JSpots | null = null;
  for (const [i, seed] of [909171, 909172, 909173].entries()) {
    const zid = w.devMintTileset('needles', 2 + i, 8, { seed, layoutType: 'needles' });
    if (!zid) continue;
    const pf = w.pathField(0);
    if (!(pf instanceof GridWalkField)) continue;
    const s = findSpots(pf);
    if (s) { grid = pf; spots = s; break; }
  }
  check('J0 the rig finds its butte, stair and valley', !!grid && !!spots);

  if (grid && spots) {
    const { deck, ramp, valley } = spots;
    // A quiet stage: the mint's own fauna leaves (this rig hunts alone).
    for (const a of w.actors) if (a !== w.player) a.dead = true;
    w.update(1 / 30);
    w.player.pos = vec(valley.x, valley.y);
    w.player.tier = 0;

    // J2 — the per-story field itself.
    const pf1 = w.pathField(1);
    check('J2a story 1 gets its OWN field; story 0 keeps the base grid',
      !!pf1 && pf1 !== grid && w.pathField(0) === grid && w.pathField() === grid);
    if (pf1) {
      check('J2b the deck is floor up here and wall below',
        pf1.isWalkable(deck.x, deck.y) && !grid.isWalkable(deck.x, deck.y));
      check('J2c the valley is floor below and wall up here',
        !pf1.isWalkable(valley.x, valley.y) && grid.isWalkable(valley.x, valley.y));
      check('J2d the link is a SEAM — floor on BOTH fields',
        pf1.isWalkable(ramp.x, ramp.y) && grid.isWalkable(ramp.x, ramp.y));
      check('J2e the story field is cached (one object per story per grid)',
        w.pathField(1) === pf1);
    }

    // J3 — the stair election, unit grain. The hunter is chosen with care:
    // the shambling zombie is AUTHORED mindless (pathing 'none' — it can
    // never elect anything), and tight-range kernels (the flanker's orbit)
    // steer DIRECTLY once in band — only the basic APPROACH kernel walks
    // moveToward the whole way in, which is the lane under test. A skeleton
    // warrior: basic brain, field pathing, breathless bone (no kite lapse).
    const m = w.createMonster('skeleton_warrior', 8, 'enemy');
    m.pos = vec(deck.x, deck.y);
    m.tier = 1;
    w.actors.push(m);
    const seat = w.tierLinkToward(m, valley);
    check('J3a the election returns a crossing on the hunter\'s own floor',
      !!seat && tierLinkOf(pf1?.regionAt?.(seat.x, seat.y)) && (pf1?.isWalkable(seat.x, seat.y) ?? false),
      seat ? `${Math.round(seat.x)},${Math.round(seat.y)}` : 'null');
    check('J3b an own-floor goal elects nothing (the field handles it)',
      w.tierLinkToward(m, deck) === null);

    // J4 — THE LIVE CROSSING: the deck hunter, engagement held (the rim
    // duel: target + aggro + the alerted all-around gaze re-primed per
    // frame — brains are the CALLER's to tick, the main.ts/runner idiom),
    // no crossing ever witnessed — it must elect the ramp, ride the ladder
    // toggle and close on the valley player, with the REACTIVE goal lane
    // silent the whole run.
    const d0 = hyp(m.pos, w.player.pos);
    // The quarry is the fixture, not the fight: tank it through the SHEET
    // (a life mod never gates targeting the way `invulnerable` would).
    w.player.sheet.setSource('probe_tank', [mod('life', 'flat', 1e6)]);
    w.player.life = w.player.maxLife();
    let sawLink = false, usedReactive = false;
    let steps = 0;
    for (; steps < 1800; steps++) {
      m.aiTargetId = w.player.id;
      m.aggroed = true;
      m.alertUntil = w.time + 5;
      for (const a of w.actors) updateAI(a, w, 1 / 30);
      w.update(1 / 30);
      sawLink = sawLink || m.onTierLink;
      usedReactive = usedReactive || m.aiTierGoal !== undefined;
      if (m.tier === 0 && !m.onTierLink && hyp(m.pos, w.player.pos) < 240) break;
      if (m.dead || w.player.dead) break;
    }
    const d1 = hyp(m.pos, w.player.pos);
    check('J4a the un-witnessed hunter crosses a link and changes story',
      !m.dead && m.tier === 0 && sawLink,
      `tier=${m.tier} link=${sawLink} dead=${m.dead} steps=${steps}`);
    check('J4b ...proactively — the reactive aiTierGoal lane stayed silent', !usedReactive);
    check('J4c ...and closes on the valley player', d1 < 240 && d1 < d0,
      `dist ${Math.round(d0)} → ${Math.round(d1)}`);
    check('J4d the quarry never crossed (the un-witnessed premise held)', w.player.tier === 0);
    // J5 — the crossing rode the LADDER TOGGLE: the zone-local ledger (the
    // reactive lane's source, untouched by this pass) stamped the hunter.
    const crossings = (w as unknown as { tierCrossings: { actorId: number }[] }).tierCrossings;
    check('J5 the ledger stamped the hunter\'s own crossing', crossings.some(r => r.actorId === m.id),
      `${crossings.length} stamped`);

    // J6 — THE SEVERED BAND (TIER_CFG.severedBandReach): the same fixture,
    // a FLANKER-brain hunter. Its orbit kernel steers directly once flat
    // distance sits in band — before the deferral it pinned at the rim
    // above the quarry for a full minute, the stair election one cell away
    // and never consulted (the measured stall this law exists for). Severed
    // now, runKernel yields to the approach lane and it crosses like the
    // warrior did.
    m.dead = true; // the warrior leaves the stage
    w.update(1 / 30);
    const g = w.createMonster('deadwake_ghoul', 8, 'enemy');
    g.pos = vec(deck.x, deck.y);
    g.tier = 1;
    w.actors.push(g);
    const gd0 = hyp(g.pos, w.player.pos);
    let gSawLink = false, gReactive = false;
    let gSteps = 0;
    for (; gSteps < 1800; gSteps++) {
      g.aiTargetId = w.player.id;
      g.aggroed = true;
      g.alertUntil = w.time + 5;
      for (const a of w.actors) updateAI(a, w, 1 / 30);
      w.update(1 / 30);
      gSawLink = gSawLink || g.onTierLink;
      gReactive = gReactive || g.aiTierGoal !== undefined;
      if (g.tier === 0 && !g.onTierLink && hyp(g.pos, w.player.pos) < 240) break;
      if (g.dead || w.player.dead) break;
    }
    const gd1 = hyp(g.pos, w.player.pos);
    check('J6a THE SEVERED BAND: the flanker defers its orbit and crosses',
      !g.dead && g.tier === 0 && gSawLink,
      `tier=${g.tier} link=${gSawLink} steps=${gSteps}`);
    check('J6b ...closing like the warrior did', gd1 < 240 && gd1 < gd0,
      `dist ${Math.round(gd0)} → ${Math.round(gd1)}`);
    check('J6c ...with the reactive lane still silent', !gReactive);

    // J7 — THE REACH GATE at unit grain (mint-independent by design: LIVE
    // archer conduct is legitimately free — a blocked volley lane lets
    // approach march and honestly elect the stair, which is the PREVIOUS
    // law working — so this rig pins the severed-band VERDICT at its own
    // exported seam, never the walk).
    g.dead = true;
    w.update(1 / 30);
    const ar = w.createMonster('skeleton_archer', 8, 'enemy');
    ar.pos = vec(deck.x, deck.y);
    ar.tier = 1;
    w.actors.push(ar);
    const g2 = w.createMonster('deadwake_ghoul', 8, 'enemy');
    g2.pos = vec(deck.x, deck.y);
    g2.tier = 1;
    w.actors.push(g2);
    const ctxOf = (a: Actor): KernelCtx =>
      ({ a, world: w, target: w.player, spec: {}, goal: w.player.pos } as unknown as KernelCtx);
    const sg = severedBandGoal(ctxOf(g2), 'orbit');
    check('J7a the melee band reads SEVERED (claw cannot cross a story)',
      !!sg && Math.abs(sg.x - w.player.pos.x) < 1 && Math.abs(sg.y - w.player.pos.y) < 1);
    check('J7b a kit that RAINS OUT never defers (bone_arrow 470 > the reach dial)',
      severedBandGoal(ctxOf(ar), 'approach') === null
      && severedBandGoal(ctxOf(ar), 'orbit') === null);
    check('J7c stand-ground styles are exempt however short the kit',
      severedBandGoal(ctxOf(g2), 'hold') === null
      && severedBandGoal(ctxOf(g2), 'turtle') === null
      && severedBandGoal(ctxOf(g2), 'interpose') === null);
    check('J7d authored mindlessness never defers',
      severedBandGoal({ ...ctxOf(g2), spec: { style: 'orbit', pathing: 'none' } } as KernelCtx, 'orbit') === null);
    g2.tier = 0; // a valley hunter shares the quarry's floor —
    check('J7e a shared floor reads no severance', severedBandGoal(ctxOf(g2), 'orbit') === null);
  }
}

// --- RIG M: THE MAP TELL (the world map's tier read, ui/panels.ts) ----------------
// tierMapTell distills ZoneDef.tiers for the map node — PURE, fog-gated by the
// SAME predicate the biome fill and zone-kind glyph ride (the loop's
// `known || scouted` arrives as `revealed`): null on flat ground, null while
// fogged, 'open' and 'covered' exposures distinguishable at a glance, the
// stack hinted through `floors`. The real recipes then ground it: minted
// needles / warrens / switchback defs speak through the same helper the
// panel calls.
{
  check('M1 flat ground tells nothing', tierMapTell({}, true) === null);
  const open = tierMapTell({ tiers: { kind: 'over', exposure: 'open' } }, true);
  const covered = tierMapTell({ tiers: { kind: 'under', exposure: 'covered' } }, true);
  check('M2 an open two-layer zone tells its stack', open?.mark === 'open' && open?.floors === 2);
  check('M3 a covered lattice tells its stack', covered?.mark === 'covered' && covered?.floors === 2);
  check('M4 the two exposures read DIFFERENT', !!open && !!covered
    && open.mark !== covered.mark && open.tint !== covered.tint);
  check('M5 THE FOG GATE: an unrevealed zone keeps its secret',
    tierMapTell({ tiers: { kind: 'over', exposure: 'open' } }, false) === null
    && tierMapTell({}, false) === null);
  const stack = tierMapTell({ tiers: { kind: 'over', exposure: 'open', levels: 3 } }, true);
  check('M6 a multi-story stack hints TALLER than the classic pair',
    !!stack && !!open && stack.floors > open.floors, `floors=${stack?.floors}`);
  const tall = tierMapTell({ tiers: { kind: 'over', exposure: 'open', levels: 9 } }, true);
  check('M7 ...clamped to what a node can legibly stack', tall?.floors === stack?.floors);
  // The real stamps: the defs the recipes mint (RIG C/D/E's own fixtures)
  // answer through the helper exactly as the authored shapes did.
  const nd = gen('qa_map_needles', 'needles', TILESETS.needles.layout,
    { ...TILESETS.needles.layoutParams }, 515001);
  check('M8 a minted needles def tells open — and only once revealed',
    tierMapTell(nd.def, true)?.mark === 'open' && tierMapTell(nd.def, false) === null);
  const metro = TILESETS.metropolis;
  const warrens = metro.variants?.find(v => v.name === 'the warrens');
  let carved = 0, told = 0;
  for (const seed of [616001, 616002, 616003, 616004, 616005, 616006]) {
    const { def } = gen('qa_map_warrens', 'district', warrens?.layout ?? metro.layout,
      { ...metro.layoutParams, ...warrens?.layoutParams, sewerTier: 1 }, seed);
    if (!def.tiers) continue; // the lattice honestly declined (RIG D's tolerance)
    carved++;
    if (tierMapTell(def, true)?.mark === 'covered') told++;
  }
  check('M9 every carved warren tells covered', carved >= 1 && told === carved, `${told}/${carved}`);
  const pk = gen('qa_map_peak', 'switchback', TILESETS.pinnacle.layout,
    { ...TILESETS.pinnacle.layoutParams }, 717001);
  check('M10 a minted summit stacks taller than the classic pair',
    tierMapTell(pk.def, true)?.floors === 3, `floors=${tierMapTell(pk.def, true)?.floors}`);
}

// --- RIG N: THE UNDER-TIER LANES + THE ROOT TIER (batch 23 — THE ROOTED WEB) ------
// The sewer carve generalized into a REGISTERED vocabulary (UNDER_TIER_LANES,
// engine/tiers.ts) and the garden's debut lane: root galleries sunk beneath
// the plot's floor, dialed by `underTier`/`underTierChance` at the
// generateLayout tail (any recipe, no recipe edits — the trapworks-pass
// idiom), taproot throats as the crossings, and the surface faces' taproot
// gates pulled down into the galleries STORY-STAMPED (doorTier 'seat' —
// drawn == dwelled from below; World's mouthTier gate is the runtime half).
{
  // N1 the registry: both lanes stand; the roots lane seats the garden door.
  check('N1 the lane registry', !!UNDER_TIER_LANES.sewer && !!UNDER_TIER_LANES.roots
    && UNDER_TIER_LANES.roots.deepDoorKinds?.includes('taproot_gate') === true
    && UNDER_TIER_LANES.roots.doorTier === 'seat'
    && UNDER_TIER_LANES.sewer.doorTier === undefined);
  const duct = regionKind('root_duct'), well = regionKind('root_well');
  check('N2 root_duct: the plot above keeps its face',
    !!duct && !!duct.walkable && duct.tier === 1 && !duct.visual && !!duct.tierVisual);
  check('N3 root_well is a CROSSING', !!well?.tierLink && !!well?.walkable && well.tier === 1);
  // N4-N8 the carve on a real garden face (petalfields' parkland recipe),
  // chance forced — gates forced too, so the relocation has bodies to seat.
  const pf = TILESETS.petalfields;
  let carved = 0, declared = 0, throats = 0, orphans = 0;
  let sunkGates = 0, sunkOffStory = 0, surfGates = 0;
  for (const seed of [818001, 818002, 818003, 818004, 818005, 818006]) {
    const { out, def } = gen('qa_roots', 'parkland',
      [...pf.layout, { kind: 'taproot_gate', count: [2, 2] } as StampSpec],
      { ...pf.layoutParams, underTier: 'roots', underTierChance: 1 }, seed);
    const st = tierStats(out);
    if (!st || st.tierCells === 0) continue; // the lattice honestly declined (RIG D's tolerance)
    carved++;
    orphans += st.orphan;
    if (def.tiers?.kind === 'under' && def.tiers?.exposure === 'covered'
      && def.tiers?.lane === 'roots') declared++;
    throats += out.doodads.filter(d => d.kind === 'taproot_throat').length;
    const grid = out.walk as GridWalkField;
    for (const d of out.doodads) {
      if (d.kind !== 'taproot_gate') continue;
      if ((d as { tier?: number }).tier === 1) {
        sunkGates++;
        // drawn == dwelled: a sunken gate stands on the story's own floor.
        const k = grid.regionAt(d.pos.x, d.pos.y);
        if (!(k === 'root_duct' || k === 'root_well')) sunkOffStory++;
      } else surfGates++;
    }
  }
  check('N4 the root tier carves in most plots', carved >= 4, `${carved}/6`);
  check('N5 carved plots DECLARE covered/under + the lane', declared === carved, `${declared}/${carved}`);
  check('N6 every carved plot wears its throats', carved === 0 || throats >= carved * 2, `throats=${throats}`);
  check('N7 no orphan gallery anywhere', orphans === 0, `orphans=${orphans}`);
  check('N8 gates SINK story-stamped onto the story\'s own floor',
    sunkGates >= 1 && sunkOffStory === 0,
    `sunk=${sunkGates} offStory=${sunkOffStory} surface=${surfGates}`);
  // N9 absent == identical: a dial-less plot mints flat — no root region, no
  // tiers stamp (the tail pass reads nothing, draws nothing).
  {
    const { underTier: _u, underTierChance: _c, ...flat } = (pf.layoutParams ?? {}) as Record<string, unknown>;
    const { out, def } = gen('qa_roots_flat', 'parkland', pf.layout, flat, 818001);
    const st = tierStats(out);
    check('N9 absent == identical: no dial, no layer',
      (st?.tierCells ?? 0) === 0 && def.tiers === undefined);
  }
  // N10 determinism: same seed, byte-equal furniture AND ground.
  const fpN = (o: GeneratedLayout): string => {
    const g = o.walk as GridWalkField;
    let s = o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}:${(d as { tier?: number }).tier ?? 0}`).join('|');
    for (let gy = 0; gy < g.rows; gy += 2) for (let gx = 0; gx < g.cols; gx += 2) s += g.regionAt(gx * g.cell + 15, gy * g.cell + 15).length;
    return s;
  };
  const na = gen('qa_roots', 'parkland', [...pf.layout, { kind: 'taproot_gate', count: [2, 2] } as StampSpec],
    { ...pf.layoutParams, underTier: 'roots', underTierChance: 1 }, 818009);
  const nb = gen('qa_roots', 'parkland', [...pf.layout, { kind: 'taproot_gate', count: [2, 2] } as StampSpec],
    { ...pf.layoutParams, underTier: 'roots', underTierChance: 1 }, 818009);
  check('N10 the root tier is byte-deterministic', fpN(na.out) === fpN(nb.out));
}

// --- RIG N2: THE SECOND LANE (batch 24 — the crypts under the downs) --------------
// The vocabulary's proof of generality: a THIRD row (sewer/roots/crypts)
// registered from its own kit file (data/catacombs.ts, loaded via the sim
// arena's side-effect imports), carving the SAME engine with nothing but
// different data — bone regions, lych stairs, the downs' named crypt gates
// sunk story-stamped. Grammar = RIG N's, verbatim, on the downs' own massif
// recipe (a mint that rolls another fabric's layer first — the massif bores
// — honestly declines: one zone, one stack; the carve rate absorbs it).
{
  check('N2.1 the crypts lane registry (kit-file registration)',
    !!UNDER_TIER_LANES.crypts
    && UNDER_TIER_LANES.crypts.deepDoorKinds?.includes('crypt_gate') === true
    && UNDER_TIER_LANES.crypts.doorTier === 'seat'
    && UNDER_TIER_LANES.crypts.duct === 'crypt_duct'
    && UNDER_TIER_LANES.crypts.stairKind === 'crypt_stair');
  const duct = regionKind('crypt_duct'), well = regionKind('crypt_well');
  check('N2.2 crypt_duct: the turf above keeps its face',
    !!duct && !!duct.walkable && duct.tier === 1 && !duct.visual && !!duct.tierVisual);
  check('N2.3 crypt_well is a CROSSING', !!well?.tierLink && !!well?.walkable && well.tier === 1);
  const dn = TILESETS.downs;
  check('N2.4 the downs SHIP the dial (underTier crypts on the base face)',
    (dn.layoutParams as Record<string, unknown> | undefined)?.underTier === 'crypts');
  let carved = 0, declared = 0, stairs = 0, orphans = 0;
  let sunkGates = 0, sunkOffStory = 0, surfGates = 0;
  for (const seed of [824001, 824002, 824003, 824004, 824005, 824006]) {
    const { out, def } = gen('qa_crypts', 'massif',
      [...dn.layout, { kind: 'crypt_gate', count: [2, 2] } as StampSpec],
      { ...dn.layoutParams, underTier: 'crypts', underTierChance: 1 }, seed);
    const st = tierStats(out);
    if (!st || st.tierCells === 0) continue; // another layer stood first, or the lattice declined
    if (def.tiers?.kind === 'under' && def.tiers?.lane === 'crypts' && def.tiers?.exposure === 'covered') declared++;
    else continue; // a massif-bore layer is not this rig's business
    carved++;
    orphans += st.orphan;
    stairs += out.doodads.filter(d => d.kind === 'crypt_stair').length;
    const grid = out.walk as GridWalkField;
    for (const d of out.doodads) {
      if (d.kind !== 'crypt_gate') continue;
      if ((d as { tier?: number }).tier === 1) {
        sunkGates++;
        // drawn == dwelled: a sunken gate stands on the story's own floor.
        const k = grid.regionAt(d.pos.x, d.pos.y);
        if (!(k === 'crypt_duct' || k === 'crypt_well')) sunkOffStory++;
      } else surfGates++;
    }
  }
  check('N2.5 the crypts carve under most heaths', carved >= 3, `${carved}/6`);
  check('N2.6 every carved heath wears its lych stairs', carved === 0 || stairs >= carved * 2, `stairs=${stairs}`);
  check('N2.7 no orphan gallery anywhere', orphans === 0, `orphans=${orphans}`);
  check('N2.8 crypt gates SINK story-stamped onto the story\'s own floor',
    sunkGates >= 1 && sunkOffStory === 0,
    `sunk=${sunkGates} offStory=${sunkOffStory} surface=${surfGates}`);
  // absent == identical: strip the SHIPPED dial — the heath mints FLAT (no
  // crypt region, no lane-tagged tiers stamp).
  {
    const { underTier: _u, underTierChance: _c, ...flat } = (dn.layoutParams ?? {}) as Record<string, unknown>;
    const { out, def } = gen('qa_crypts_flat', 'massif', dn.layout, flat, 824001);
    const flatCrypt = ((): boolean => {
      const g = out.walk;
      if (!(g instanceof GridWalkField)) return false;
      for (let gy = 0; gy < g.rows; gy++) {
        for (let gx = 0; gx < g.cols; gx++) {
          const k = g.regionAt(gx * g.cell + 15, gy * g.cell + 15);
          if (k === 'crypt_duct' || k === 'crypt_well') return true;
        }
      }
      return false;
    })();
    check('N2.9 absent == identical: no dial, no crypt layer',
      !flatCrypt && def.tiers?.lane !== 'crypts');
  }
  // Determinism: same seed, byte-equal furniture AND ground.
  const fpN2 = (o: GeneratedLayout): string => {
    const g = o.walk as GridWalkField;
    let s = o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}:${(d as { tier?: number }).tier ?? 0}`).join('|');
    for (let gy = 0; gy < g.rows; gy += 2) for (let gx = 0; gx < g.cols; gx += 2) s += g.regionAt(gx * g.cell + 15, gy * g.cell + 15).length;
    return s;
  };
  const na2 = gen('qa_crypts', 'massif', [...dn.layout, { kind: 'crypt_gate', count: [2, 2] } as StampSpec],
    { ...dn.layoutParams, underTier: 'crypts', underTierChance: 1 }, 824009);
  const nb2 = gen('qa_crypts', 'massif', [...dn.layout, { kind: 'crypt_gate', count: [2, 2] } as StampSpec],
    { ...dn.layoutParams, underTier: 'crypts', underTierChance: 1 }, 824009);
  check('N2.10 the crypt tier is byte-deterministic', fpN2(na2.out) === fpN2(nb2.out));
  // N2.11 THE RIM LAW (task_e2243782): the SAME carve on an ELLIPSE def — the
  // playable ground is the inscribed ellipse (clampPos projects every body
  // inside it), the carve grid is rect-blind, and the corners the rim seals
  // off are exactly where the farthest-seat preferences loved to seat doors
  // (the 264px dead-door divergence). Every DWELL fixture — crypt gates on
  // BOTH stories, the wells' lych stairs — must stand inside the rim at the
  // mouth clamp's own 28u margin (the math re-derived here, deliberately not
  // imported: the rig must not test through the law it pins), and the lane
  // must still FUNCTION on ellipse ground (the law heals seats, never
  // starves the layer).
  {
    const inRim = (p: { x: number; y: number }): boolean => {
      const rx = Math.max(8, arena.w / 2 - 28), ry = Math.max(8, arena.h / 2 - 28);
      const nx = (p.x - arena.w / 2) / rx, ny = (p.y - arena.h / 2) / ry;
      return nx * nx + ny * ny <= 1;
    };
    let outOfRim = 0, sunkE = 0, stairsE = 0, gatesE = 0;
    for (const seed of [824021, 824022, 824023, 824024, 824025, 824026]) {
      const { out } = gen('qa_crypts_ellipse', 'massif',
        [...dn.layout, { kind: 'crypt_gate', count: [2, 2] } as StampSpec],
        { ...dn.layoutParams, underTier: 'crypts', underTierChance: 1 }, seed, { shape: 'ellipse' });
      for (const d of out.doodads) {
        if (d.kind !== 'crypt_gate' && d.kind !== 'crypt_stair') continue;
        if (d.kind === 'crypt_gate') { gatesE++; if ((d as { tier?: number }).tier === 1) sunkE++; }
        else stairsE++;
        if (!inRim(d.pos)) outOfRim++;
      }
    }
    check('N2.11 the rim law: every ellipse dwell seat (gates + stairs) stands inside the rim',
      outOfRim === 0, `${outOfRim} beyond the rim (gates=${gatesE} sunk=${sunkE} stairs=${stairsE})`);
    check('N2.11b the ellipse lane still functions (sunk gates + stairs exist across the seeds)',
      sunkE >= 1 && stairsE >= 2, `sunk=${sunkE} stairs=${stairsE}`);
  }
}

// --- RIG N3: THE ARRIVAL STORY (the arrivalStory law — batch 25) ------------------
// Arianna's live report (2026-08-03): entering the Undergrowth THROUGH a
// story-seated taproot gate left her IMMOBILE in the pocket (the stale layer
// index met the cave's empty tier view at every clamp), and the climb-out
// stood her on the plot face ABOVE the gallery instead of at the door. The
// law pinned here, both directions, on REAL minted geometry:
//   inbound — a zone arrival lands on the GROUND story (tier 0) and a real
//     step lands (mobility is the symptom, so mobility is the assert);
//   outbound — the climb-out re-seats the party at the mouth ON the mouth's
//     own recorded story (caveReturn.tier), standing on story floor, mobile;
//   the rung — the exact-resume ladder writes + rebuilds the story, so her
//     literal repro (restart mid-cave, then exit) lands story-true too;
//   the classic mouth — tier-0 doors keep the classic step-off bytes.
// Downs twin (crypt gates → the catacombs) walks the same law.
{
  seedGlobalRandom(0xa15701);
  type N3Cm = { pos: { x: number; y: number }; seed: number; kind: string; underSpan?: string; mouthTier?: number };
  type N3Innards = {
    enterSidezone(cm: { pos: { x: number; y: number }; seed: number; kind: string; underSpan?: string }): void;
    travelThrough(e: { to: string; side: 'n' | 's' | 'e' | 'w' }): void;
    caveEntrances: N3Cm[];
    walk: { regionAt?(x: number, y: number): string } | null;
  };
  const regionAtOf = (w: ReturnType<typeof makeSimWorld>, x: number, y: number): string | undefined =>
    innardsOf(w).walk?.regionAt?.(x, y);
  const innardsOf = (w: ReturnType<typeof makeSimWorld>): N3Innards => w as unknown as N3Innards;
  /** Strip live hostiles so the walk asserts measure the GRID, not a shove. */
  const clearField = (w: ReturnType<typeof makeSimWorld>): void => {
    for (const a of w.actors) { if (a.team === 'enemy' && !a.dead) a.dead = true; }
  };
  /** Best displacement over four compass walks from `seat` (real moveActor
   *  steps — the immobility bug refused every one of these). */
  const bestStep = (w: ReturnType<typeof makeSimWorld>, seat: { x: number; y: number }): number => {
    let best = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      w.player.pos.x = seat.x; w.player.pos.y = seat.y;
      for (let i = 0; i < 6; i++) w.moveActor(w.player, dx, dy, 0.1);
      best = Math.max(best, Math.hypot(w.player.pos.x - seat.x, w.player.pos.y - seat.y));
    }
    w.player.pos.x = seat.x; w.player.pos.y = seat.y;
    return best;
  };
  /** Mint tileset zones on pinned seeds until one carries a SUNK named gate
   *  (mouthTier 1 — the relocated door on the story's own floor). */
  const mintWithSunkGate = (
    w: ReturnType<typeof makeSimWorld>, tileset: string, gate: string, seeds: number[],
  ): { zoneId: string; cm: N3Cm } | null => {
    for (let i = 0; i < seeds.length; i++) {
      const zid = w.devMintTileset(tileset, i, 8, { seed: seeds[i] });
      if (!zid) continue;
      const cm = innardsOf(w).caveEntrances.find(en => en.kind === gate && en.mouthTier === 1);
      if (cm) return { zoneId: zid, cm };
    }
    return null;
  };
  const walkLane = (label: string, tileset: string, gate: string, seeds: number[]): void => {
    const w = makeSimWorld('warrior', 0x1157);
    w.player.invulnerable = true;
    const found = mintWithSunkGate(w, tileset, gate, seeds);
    check(`N3.1 ${label}: a mint stands with a SUNK ${gate} (story-seated door)`, !!found);
    if (!found) return;
    const inN = innardsOf(w);
    const gardenId = w.zone.id;
    const mouthAt = { x: found.cm.pos.x, y: found.cm.pos.y };
    // The dwell's honest state: standing ON the gate, on ITS story (the
    // mouthTier gate guarantees this pairing live; the probe reaches the
    // private seam structurally — the dwell is merely enterSidezone's input).
    w.player.pos.x = mouthAt.x; w.player.pos.y = mouthAt.y;
    w.player.tier = 1;
    inN.enterSidezone(found.cm);
    check(`N3.2 ${label}: the gate opens a pocket`, w.zone.id.startsWith('cave_'), w.zone.id);
    const pocketId = w.zone.id;
    // INBOUND — the arrival story is the GROUND story, and a step LANDS.
    check(`N3.3 ${label}: the arrival wears the ground story (tier 0)`, w.player.tier === 0, `tier=${w.player.tier}`);
    clearField(w);
    const inStep = bestStep(w, { x: w.player.pos.x, y: w.player.pos.y });
    check(`N3.4 ${label}: the arrival is MOBILE (a real step lands)`, inStep > 15, `step=${inStep.toFixed(1)}px`);
    check(`N3.5 ${label}: the rung remembers the mouth's story`, w.caveReturn?.tier === 1,
      `caveReturn.tier=${w.caveReturn?.tier}`);
    // THE RUNG — the save writes the story; the rebuild restores it (her
    // literal repro: restart mid-cave, THEN climb out).
    const save = w.serializeWorldState();
    const rungs = save.player?.cave?.rungs ?? [];
    check(`N3.6 ${label}: the written rung carries the story`,
      rungs.length >= 1 && rungs[rungs.length - 1].tier === 1,
      `rungs=${JSON.stringify(rungs.map(r => r.tier ?? 0))}`);
    const w2 = makeSimWorld('warrior', 0x1158);
    w2.player.invulnerable = true;
    const adopted = w2.adoptWorldState(save);
    w2.resumeSpawn('exact', save.player);
    check(`N3.7 ${label}: the resumed wake stands in the pocket with the rung's story rebuilt`,
      adopted && w2.zone.id === pocketId && w2.caveReturn?.tier === 1,
      `zone=${w2.zone.id} tier=${w2.caveReturn?.tier}`);
    // OUTBOUND on the RESUMED world (the restart repro): climb out, land ON
    // the mouth wearing ITS story, standing on story floor, mobile.
    clearField(w2);
    innardsOf(w2).travelThrough({ to: gardenId, side: 'n' });
    const p2 = w2.player;
    const dBack = Math.hypot(p2.pos.x - mouthAt.x, p2.pos.y - mouthAt.y);
    check(`N3.8 ${label}: the climb-out stands AT the door (no step off a sunken mouth)`,
      w2.zone.id === gardenId && dBack < 2, `zone=${w2.zone.id} d=${dBack.toFixed(1)}`);
    const doorDd = w2.doodads.filter(dd => dd.kind === gate)
      .sort((a2, b2) => Math.hypot(a2.pos.x - mouthAt.x, a2.pos.y - mouthAt.y)
        - Math.hypot(b2.pos.x - mouthAt.x, b2.pos.y - mouthAt.y))[0];
    check(`N3.9 ${label}: the return wears the mouth's story on story floor`,
      p2.tier === 1 && tierFloorAt(regionAtOf(w2, p2.pos.x, p2.pos.y), 1),
      `tier=${p2.tier} kind=${regionAtOf(w2, p2.pos.x, p2.pos.y)}`
      + (doorDd ? ` doorDd=${doorDd.pos.x.toFixed(0)},${doorDd.pos.y.toFixed(0)}`
        + `@${regionAtOf(w2, doorDd.pos.x, doorDd.pos.y)} rowNudge=${Math.hypot(mouthAt.x - doorDd.pos.x, mouthAt.y - doorDd.pos.y).toFixed(1)}px` : ' doorDd=NONE'));
    // The pairing law (task_e2243782): the drawn door and the dwell seat are
    // ONE point — a story-seated mouth keeps its exact relocated seat (the
    // mouthSeat rule), so the return stands AT the drawn gate, never on
    // ground a clamp projected it to.
    check(`N3.9b ${label}: the drawn door stands AT the dwell seat (drawn == dwelled)`,
      !!doorDd && Math.hypot(mouthAt.x - doorDd.pos.x, mouthAt.y - doorDd.pos.y) < 2,
      doorDd ? `rowNudge=${Math.hypot(mouthAt.x - doorDd.pos.x, mouthAt.y - doorDd.pos.y).toFixed(1)}px` : 'doorDd=NONE');
    clearField(w2);
    const outStep = bestStep(w2, { x: p2.pos.x, y: p2.pos.y });
    check(`N3.10 ${label}: the return is MOBILE on its story`, outStep > 15, `step=${outStep.toFixed(1)}px`);
    // THE CLASSIC MOUTH keeps its bytes: a ground-story door (synthetic,
    // the F idiom) still steps off the hole on exit, tier 0 throughout.
    const seat = { x: p2.pos.x, y: p2.pos.y };
    p2.tier = 0;
    innardsOf(w2).enterSidezone({ pos: seat, seed: 4242, kind: 'cave_entrance' });
    const classicPocket = w2.zone.id;
    check(`N3.11 ${label}: the classic descent still opens (tier 0 rung)`,
      classicPocket.startsWith('cave_') && (w2.caveReturn?.tier ?? 0) === 0, classicPocket);
    innardsOf(w2).travelThrough({ to: gardenId, side: 'n' });
    check(`N3.12 ${label}: the classic climb-out keeps the step off the hole, ground story`,
      w2.zone.id === gardenId && w2.player.tier === 0
      && Math.abs(w2.player.pos.y - (seat.y + 40)) < 45 && Math.abs(w2.player.pos.x - seat.x) < 45,
      `tier=${w2.player.tier} at=${w2.player.pos.x.toFixed(0)},${w2.player.pos.y.toFixed(0)} mouth=${seat.x.toFixed(0)},${seat.y.toFixed(0)}`);
  };
  // (petalfields for the WALK: the parkland face rolls sunk gates on early
  // pinned seeds. The forest face's starvation that once dropped stalkwood's
  // promised gates entirely is healed by THE DOOR GUARANTEE — levelgen's
  // doorGuaranteeSeat — pinned as its own census below at N3.13.)
  walkLane('garden', 'petalfields', 'taproot_gate', [951001, 951002, 951003, 951004, 951005, 951006, 951007, 951008, 951009, 951010]);
  // (952006 was once skipped here: its ellipse mint seated the sunk gate
  // beyond the rim — the dead-door divergence. THE RIM LAW now guarantees
  // in-shape dwell seats, so the original family stands and that once-cursed
  // mint is this lane's own regression specimen; N3.9b pins the pairing.)
  // (Ladder re-pinned 2026-08-04, the hunt-debts pass: the bone-massif rows
  // joining the downs base + barrowfield mixes re-rolled those faces' mints,
  // and none of the original 16 stood a sunk gate any longer — 952017-952020
  // appended through THIS rig's own run (the process-stream law; 952020 is
  // the finder). The walked specimens before it, 952006 included, stand.)
  walkLane('downs', 'downs', 'crypt_gate', [952001, 952002, 952003, 952004, 952005, 952006, 952007, 952008, 952009, 952010, 952011, 952012, 952013, 952014, 952015, 952016, 952017, 952018, 952019, 952020]);
  // THE DOOR GUARANTEE (levelgen doorGuaranteeSeat — the stalkwood heal):
  // the packed forest face whose 10-seed census once placed ZERO of its
  // promised common [1,1] taproot gates now stands one on EVERY mint —
  // same devMint lane, same seed family that measured the starvation.
  {
    const w = makeSimWorld('warrior', 0x1159);
    let stood = 0, tried = 0;
    for (let i = 0; i < 6; i++) {
      const zid = w.devMintTileset('stalkwood', i, 8, { seed: 951001 + i });
      if (!zid) continue;
      tried++;
      if (w.doodads.some(d => d.kind === 'taproot_gate')) stood++;
    }
    check('N3.13 the door guarantee: every stalkwood mint stands its promised taproot gate',
      tried >= 4 && stood === tried, `${stood}/${tried}`);
  }
}

// --- RIG O: THE ALOFT SEAT (batch 28 — LandmarkDef.siteTier / CompositionSite.siteTier)
// THE ALOFT LANE: a claim SEATED on an upper story deliberately. The laws
// pinned here on probe-local qa_aloft content (the real debut — the baboon
// king's midden — walks probe_lairs): the aimed story dart with THE
// QUANTIZE-HOP KILLER (the judged center IS the built center), THE
// SOVEREIGN CENTER (never a ramp, never a shared deck), THE RIM LAW
// (ellipse mints keep the dwell seat in-shape), THE STORY ROAD (every seat
// asserted reachable through the stack's own links), the story stamp on the
// builder's furniture, THE ALOFT WINDOW for composition entries, the
// story-less refusal (plains places nothing, loudly), determinism, and the
// boot-validation refusals (structures + POI clusters at aloft sites).
// The engine-substrate A/B (absent == byte-identical vs pristine HEAD,
// 15 tilesets × 5 seeds) was proven worktree-grade at build time — the rig
// pins the lane's live behavior (the sitewalk rig-S precedent).
{
  seedGlobalRandom(0xa10f2);
  registerDoodadRule('qa_aloft_door', { overlap: 'trigger', spacing: 60 });
  registerLandmark({
    id: 'qa_aloft_site', builder: 'den_mouth', size: [180, 250], clearSite: true,
    siteTier: 1,
    params: {
      mouthKind: 'qa_aloft_door',
      dress: [
        { kind: 'bone_pile', count: [3, 5], radius: [10, 15] },
        { kind: 'rock', count: [1, 3], radius: [12, 18] },
      ],
    },
  });
  registerCluster({
    id: 'qa_aloft_cairns', anchor: { radius: 26 },
    pieces: [{ kind: 'cairn', radius: [10, 14], count: [3, 5], ring: [20, 70], rot: true }],
  });
  registerComposition({
    id: 'qa_aloft_court',
    sites: [{ id: 'perch', radius: [60, 90], siteTier: 1 }],
    post: [{ kind: 'cluster', cluster: 'qa_aloft_cairns', at: 'perch', count: [1, 1] }],
  });

  const tsO = TILESETS.needles;
  const WO = 3600, HO = 2700;
  const entryO = vec(140, HO / 2);
  const exitsO = [vec(WO - 140, HO / 2)];
  const mkAloft = (over: Partial<ZoneDef>): ZoneDef => ({
    id: 'qa_aloft_zone', name: 'QA Aloft', level: 8,
    size: { w: WO, h: HO },
    theme: { ...tsO.theme },
    layoutType: 'needles',
    layout: tsO.layout,
    layoutParams: { ...tsO.layoutParams },
    objective: { kind: 'none' },
    packs: tsO.packs,
    exits: [{ to: 'qa_aloft_home', side: 's' }],
    map: { x: 0, y: 0 }, seed: 0,
    geo: { biomeDepth: 0.7 },
    landmarks: [{ landmark: 'qa_aloft_site', chance: 1 }],
    ...over,
  });
  const genO = (def: ZoneDef, seed: number): GeneratedLayout =>
    generateLayout({ ...def, seed }, { w: WO, h: HO }, new Rng(seed), entryO, exitsO);

  // O1-O4: the 12-seed forced sweep — placement, sovereign story seats, the
  // rim, the story road, the stamped ring.
  let placedO = 0, sovereignO = 0, rimO = 0, reachO = 0, ringO = 0;
  for (let i = 0; i < 12; i++) {
    const seed = (0xa10f7 + i * 7919) >>> 0;
    const out = genO(mkAloft({}), seed);
    const mouth = out.doodads.find(d => d.kind === 'qa_aloft_door');
    if (!mouth) continue;
    placedO++;
    const walkO = out.walk as GridWalkField | undefined;
    if (mouth.tier === 1 && walkO?.regionAt
      && walkO.regionAt(mouth.pos.x, mouth.pos.y) === 'butte_top') sovereignO++;
    if (insideBounds(mouth.pos, 28, { w: WO, h: HO, shape: 'rect' })) rimO++;
    if (walkO && storyReachable(walkO, entryO, mouth.pos, 1)) reachO++;
    const ring = out.doodads.filter(d => (d.kind === 'bone_pile' || d.kind === 'rock')
      && d.tier === 1 && Math.hypot(d.pos.x - mouth.pos.x, d.pos.y - mouth.pos.y) < 160);
    if (ring.length >= 2) ringO++;
  }
  check('O1 the aloft dart seats the claim (12-seed forced sweep)', placedO >= 11, `${placedO}/12`);
  check('O2 every seat is a SOVEREIGN story center (butte_top, tier-stamped mouth)',
    sovereignO === placedO, `${sovereignO}/${placedO}`);
  check('O3 every seat obeys the rim and the STORY ROAD reaches it from the entry',
    rimO === placedO && reachO === placedO, `rim=${rimO} road=${reachO} of ${placedO}`);
  check('O4 the midden ring is the STORY\'s furniture (≥2 aloft-stamped pieces at the door)',
    ringO >= Math.max(1, placedO - 2), `${ringO}/${placedO}`);

  // O5: the ellipse batch — the rim law bites where the shape does.
  let placedE = 0, rimE = 0;
  for (let i = 0; i < 6; i++) {
    const seed = (0xe111 + i * 7919) >>> 0;
    const out = genO(mkAloft({ shape: 'ellipse' }), seed);
    const mouth = out.doodads.find(d => d.kind === 'qa_aloft_door');
    if (!mouth) continue;
    placedE++;
    if (insideBounds(mouth.pos, 28, { w: WO, h: HO, shape: 'ellipse' })) rimE++;
  }
  check('O5 ellipse mints keep every aloft dwell seat in-shape', placedE >= 4 && rimE === placedE,
    `placed=${placedE} rim=${rimE}`);

  // O6: THE ALOFT WINDOW — a composition site on the story: its cluster
  // pieces gate on the story's floor and wear its stamp.
  let cairnsAloft = 0, cairnsUnstamped = 0;
  for (let i = 0; i < 8; i++) {
    const seed = (0xc0a7 + i * 104729) >>> 0;
    const out = genO(mkAloft({
      landmarks: [],
      compositions: [{ composition: 'qa_aloft_court', chance: 1 }],
    }), seed);
    const walkO = out.walk as GridWalkField | undefined;
    for (const d of out.doodads) {
      if (d.kind !== 'cairn') continue;
      const onStory = !!walkO?.regionAt && tierFloorAt(walkO.regionAt(d.pos.x, d.pos.y), 1);
      if (d.tier === 1 && onStory) cairnsAloft++;
      else if (onStory && d.tier === undefined) cairnsUnstamped++;
    }
  }
  check('O6 the aloft window stamps the bundle onto the story (cairns aloft, none unstamped)',
    cairnsAloft >= 6 && cairnsUnstamped === 0, `aloft=${cairnsAloft} unstamped=${cairnsUnstamped}`);

  // O7: the story-less refusal — a plains mint places NOTHING (no valley
  // fallback), and the same def keeps generating (no crash, exits carved).
  let refusedOk = true;
  for (let i = 0; i < 6; i++) {
    const seed = (0xbee5 + i * 104729) >>> 0;
    const out = genO(mkAloft({ layoutType: undefined, layoutParams: {} }), seed);
    if (out.doodads.some(d => d.kind === 'qa_aloft_door')) refusedOk = false;
  }
  check('O7 a story-less layout refuses the aloft claim whole (no valley seat, ever)', refusedOk);

  // O8: determinism — same seed, same stack (kind:pos:tier print).
  {
    const a = genO(mkAloft({}), 0xd00d);
    const b = genO(mkAloft({}), 0xd00d);
    const print = (o: GeneratedLayout): string =>
      o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}:${d.tier ?? 0}`).join('|');
    check('O8 the aloft seat is deterministic (same seed, same stack)', print(a) === print(b));
  }

  // O9: the boot-validation refusals — masonry and tier-0 promises never
  // stand at an aloft site.
  registerCluster({
    id: 'qa_aloft_poi_cairns', anchor: { radius: 26 }, poi: true,
    pieces: [{ kind: 'cairn', radius: [10, 14], count: [1, 2] }],
  });
  registerComposition({
    id: 'qa_aloft_bad',
    sites: [{ id: 'perch', radius: [60, 90], siteTier: 1 }],
    post: [
      { kind: 'structure', structure: 'watchtower', at: 'perch', count: [1, 1] },
      { kind: 'cluster', cluster: 'qa_aloft_poi_cairns', at: 'perch', count: [1, 1] },
    ],
  });
  const errsO = validateCompositions();
  check('O9 validation refuses structures + POI clusters at aloft sites',
    errsO.some(e => e.includes('qa_aloft_bad') && e.includes('flatten the story'))
    && errsO.some(e => e.includes('qa_aloft_bad') && e.includes('tier-0 promise')),
    errsO.filter(e => e.includes('qa_aloft_bad')).join(' | ') || '(no errors)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
