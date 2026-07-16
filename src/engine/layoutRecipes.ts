// ---------------------------------------------------------------------------
// LAYOUT RECIPES — whole-zone topologies composed from the genkit primitives.
// Every recipe reads its knobs from the zone's merged layoutParams (spec ▷
// tileset ▷ biome), so ONE recipe serves many biomes:
//
//   winding    the Maggot Lair: a wandering gut entry→exits, branch stubs,
//              chambers at the joints — carved from solid wall
//   spiral     the volcanic cauldron: a coiling causeway from rim to heart;
//              the negative space is wall, void, or a liquid (params)
//   riverland  a liquid river crossing the zone with causeways/fords — the
//              River of Flame (lava), a frozen river (freezeAt: water→ice
//              mid-course, D2 Act 5), or a plain forded river
//   expanse    wide-open country: heavy decoration + landmark headroom
//   lakelands  great lakes + sparse rock packs (pure composition proof)
//   metropolis a street lattice with building plots — intact (roofed plan
//              houses) or ruined (broken walls + rubble) by `ruined`
//
// Each guarantees its own entry/exit connectivity (stems to the spine); the
// universal reachability invariant backstops whatever composition follows.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import type { ExitRoadSpec, ZoneDef } from '../data/zones';
import { boundaryGateOf, type BoundaryGateDef } from '../data/boundaryGates';
import { meldOf, MELD_CFG } from '../data/melds';
import { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import {
  registerLayout, layoutParam, ensureGrid, scatterDecoration,
  placeLandmarkById, raiseStructure, setBoundaryGateBuilder, setExitRoadBuilder,
  setMeldBuilder, stamp, areaFreeOf, doodadRuleOf, type DoodadKind, type GenCtx,
  layTraveledWay, onClearway, overgrowthOf,
} from './levelgen';
import {
  Mask, band, disc, ellipseDisc, wanderPath, spiralPath, paintRegion, paintLiquid, liquidOf,
} from './genkit';

/** The negative-space region a carved recipe leaves between its passages —
 *  'wall' reads as rock (true wall: blocks shots + sight); a biome may swap
 *  in flesh_wall, fungal_wall, or anything registered. */
function negativeRegion(def: ZoneDef): string {
  return layoutParam(def, 'negative', 'wall');
}

/** RESERVE an artery (the gut, the coil, a causeway): circles along the
 *  polyline so the tileset scatter that follows (and later landmark rolls)
 *  can never re-plug the zone's only passage — findSpot/blobs/landmarks all
 *  honor reservations. */
function reserveArtery(ctx: GenCtx, pts: Vec2[], halfW: number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x, ay = pts[i].y, bx = pts[i + 1].x, by = pts[i + 1].y;
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len / 100));
    for (let s = 0; s <= steps; s++) {
      ctx.reserved.push({
        pos: vec(ax + (bx - ax) * (s / steps), ay + (by - ay) * (s / steps)),
        radius: halfW + 30,
      });
    }
  }
}

// --- WINDING (the Maggot Lair) --------------------------------------------------
function windingLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const all = Mask.forRect(0, 0, arena.w, arena.h);
  all.invert(); // full coverage
  paintRegion(grid, all, negativeRegion(def));

  const gutW = layoutParam(def, 'gutWidth', [64, 96]) as [number, number];
  const carve = Mask.forRect(0, 0, arena.w, arena.h);
  // The main gut: entry → each exit, one continuous winding artery per exit —
  // RESERVED so the tileset scatter that follows can never plug the passage.
  const anchors = [ctx.entry, ...ctx.exits];
  for (let i = 1; i < anchors.length; i++) {
    const pts = wanderPath(rng, anchors[0], anchors[i], { step: 130, wobble: 60, bowFrac: 0.34 });
    const halfW = rng.range(gutW[0], gutW[1]) / 2;
    band(carve, pts, halfW);
    reserveArtery(ctx, pts, halfW);
  }
  // Branch stubs: dead-end pockets off the gut (loot corners, ambush nooks).
  const branches = layoutParam(def, 'branches', [2, 4]) as [number, number];
  const carveCells: Vec2[] = [];
  carve.forEach((cx, cy) => carveCells.push(carve.center(cx, cy)));
  for (let i = 0, n = rng.int(branches[0], branches[1]); i < n && carveCells.length; i++) {
    const from = carveCells[rng.int(0, carveCells.length - 1)];
    const ang = rng.range(0, Math.PI * 2);
    const reach = rng.range(180, 420);
    const to = vec(
      Math.max(60, Math.min(arena.w - 60, from.x + Math.cos(ang) * reach)),
      Math.max(60, Math.min(arena.h - 60, from.y + Math.sin(ang) * reach)));
    band(carve, wanderPath(rng, from, to, { step: 90, wobble: 40 }), rng.range(30, 44));
    disc(carve, to.x, to.y, rng.range(60, 110)); // the terminal chamber
    ctx.pois.push(vec(to.x, to.y));
  }
  // Chambers along the spine (fight rooms).
  const chambers = layoutParam(def, 'chambers', [2, 4]) as [number, number];
  for (let i = 0, n = rng.int(chambers[0], chambers[1]); i < n && carveCells.length; i++) {
    const at = carveCells[rng.int(0, carveCells.length - 1)];
    disc(carve, at.x, at.y, rng.range(90, 150));
  }
  // Portal mouths breathe.
  for (const pt of anchors) disc(carve, pt.x, pt.y, 100);
  paintRegion(grid, carve, 'ground');
  scatterDecoration(ctx, def);
}
registerLayout('winding', windingLayout);

// --- KARST (the chasm maze) -----------------------------------------------------
// THE KARST REACH: above-ground cavern country whose NEGATIVE SPACE is the
// maze — branching chasm gulfs (the 'chasm' fall region: bodies can't cross,
// shots and sight sail over) between pockets of solid ground, the whole reach
// ringed by a crag rim. NO BRIDGES by design: you walk the pocket-graph around
// every gap while artillery kin duel you across it and melee kin hold the
// pinches. Connectivity is guaranteed BY CONSTRUCTION — a spanning tree over
// the pocket graph plus rolled loop edges — so the universal reachability net
// never has to rescue-carve a causeway through the gulf.
function karstLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);

  // Dials (spec ▷ tileset ▷ biome — the recipe discipline; defaults are the
  // committed reference maze).
  const rimW = layoutParam(def, 'karstRim', [80, 130]) as [number, number];
  const pocketR = layoutParam(def, 'karstPocketR', [85, 140]) as [number, number];
  const gap = layoutParam(def, 'karstGap', [300, 380]) as [number, number];
  const corW = layoutParam(def, 'karstCorridorW', [52, 72]) as [number, number];
  const loopChance = layoutParam(def, 'karstLoops', 0.22);
  const cragN = layoutParam(def, 'karstCrags', [1, 3]) as [number, number];
  const wobble = layoutParam(def, 'karstWobble', 46);
  // The gulf region is a dial too — another country may pour 'abyss' or 'void'
  // between its pockets without touching the recipe.
  const gulf = layoutParam(def, 'karstGulf', 'chasm');

  // 1) Negatives: crag wall out to the frame, the chasm sea inside the rim.
  const rim = rng.range(rimW[0], rimW[1]);
  grid.fillRegion(0, 0, arena.w, arena.h, 'wall');
  grid.fillRegion(rim, rim, arena.w - rim, arena.h - rim, gulf);

  // 2) Pocket nodes: portals first (a portal mouth IS a maze room), then a
  // jittered lattice across the interior — the ground the gulfs run between.
  const anchors = [ctx.entry, ...ctx.exits];
  const nodes: { pos: Vec2; r: number }[] = [];
  for (const a of anchors) nodes.push({ pos: vec(a.x, a.y), r: rng.range(88, 116) });
  const step = rng.range(gap[0], gap[1]);
  const inset = rim + pocketR[1] * 0.7;
  for (let y = inset; y <= arena.h - inset; y += step) {
    for (let x = inset; x <= arena.w - inset; x += step) {
      const px = x + rng.range(-0.28, 0.28) * step;
      const py = y + rng.range(-0.28, 0.28) * step;
      if (anchors.some(a => Math.hypot(a.x - px, a.y - py) < step * 0.55)) continue;
      nodes.push({ pos: vec(px, py), r: rng.range(pocketR[0], pocketR[1]) });
    }
  }

  // 3) The maze graph: Prim's spanning tree from the entry guarantees ONE
  // connected pocket-maze (dead-end leaves are the maze's prize corners);
  // rolled near-neighbor extras braid loops in so it offers routes, not
  // only backtracks.
  const n = nodes.length;
  const edges: [number, number][] = [];
  const deg = new Uint32Array(n);
  const dAt = (i: number, j: number) =>
    Math.hypot(nodes[i].pos.x - nodes[j].pos.x, nodes[i].pos.y - nodes[j].pos.y);
  {
    const inTree = new Uint8Array(n);
    const best = new Float64Array(n).fill(Infinity);
    const bestFrom = new Int32Array(n).fill(-1);
    inTree[0] = 1;
    for (let j = 1; j < n; j++) { best[j] = dAt(0, j); bestFrom[j] = 0; }
    for (let added = 1; added < n; added++) {
      let bj = -1, bd = Infinity;
      for (let j = 0; j < n; j++) if (!inTree[j] && best[j] < bd) { bd = best[j]; bj = j; }
      if (bj < 0) break;
      inTree[bj] = 1;
      edges.push([bestFrom[bj], bj]); deg[bestFrom[bj]]++; deg[bj]++;
      for (let j = 0; j < n; j++) {
        if (inTree[j]) continue;
        const dd = dAt(bj, j);
        if (dd < best[j]) { best[j] = dd; bestFrom[j] = bj; }
      }
    }
  }
  const joined = new Set(edges.map(([a, b]) => (a < b ? a * 4096 + b : b * 4096 + a)));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (joined.has(i * 4096 + j) || dAt(i, j) > step * 1.45) continue;
      if (!rng.chance(loopChance)) continue;
      joined.add(i * 4096 + j); edges.push([i, j]); deg[i]++; deg[j]++;
    }
  }

  // 4) Ground: pocket discs + wobbled corridor bands (RESERVED so the scatter
  // that follows can never plug a pinch); portal mouths breathe through the
  // rim to their first pocket.
  const ground = Mask.forRect(0, 0, arena.w, arena.h);
  for (const nd of nodes) disc(ground, nd.pos.x, nd.pos.y, nd.r);
  for (const [i, j] of edges) {
    const halfW = rng.range(corW[0], corW[1]) / 2;
    const pts = wanderPath(rng, nodes[i].pos, nodes[j].pos, { step: 110, wobble, bowFrac: 0.16 });
    band(ground, pts, halfW);
    reserveArtery(ctx, pts, halfW);
  }
  for (const a of anchors) disc(ground, a.x, a.y, 104);
  paintRegion(grid, ground, 'ground');

  // 5) Crag towers: wall islets standing in the gulf — the LOS breakers the
  // chasm itself deliberately isn't (shots sail every gap; a crag is cover).
  const groundGrown = ground.clone().grow(2);
  const cragMask = ground.like();
  let cragWant = rng.int(cragN[0], cragN[1]);
  for (let tries = 0; cragWant > 0 && tries < 30; tries++) {
    const cx = rng.range(inset, arena.w - inset), cy = rng.range(inset, arena.h - inset);
    if (groundGrown.has(cx, cy)) continue;
    disc(cragMask, cx, cy, rng.range(56, 104));
    cragWant--;
  }
  cragMask.subtract(groundGrown);
  paintRegion(grid, cragMask, 'wall');

  // 6) A few dead-end pockets are marked as the maze's prize corners.
  const leaves: number[] = [];
  for (let i = anchors.length; i < n; i++) if (deg[i] === 1) leaves.push(i);
  for (let i = 0; i < Math.min(3, leaves.length); i++) {
    ctx.pois.push(vec(nodes[leaves[i]].pos.x, nodes[leaves[i]].pos.y));
  }

  // 7) Tileset furniture lands walk-gated on the pockets (cave mouths, rocks,
  // spires); the void-float sweep keeps solids off the gulf.
  scatterDecoration(ctx, def);
}
registerLayout('karst', karstLayout);

// --- PARKLAND (scattered stands on open ground) ----------------------------------
// The PATCHWORK shape: discrete tree STANDS — each a knitted-crown clump with
// its own heart — on wide-open floor studded with lone solids, instead of the
// forest recipe's sealed roof. Savanna parkland is the ecological term; the
// Petrified Weald is the first wearer (stone copses on karst pavement — each
// stand one veil-sealed cover pocket AND one resonance alarm-unit: shatter
// your own clump and the whole stand's ground rings), but every mix is a dial,
// so a living parkland (aspen groves, orchard rows gone wild) is one
// layoutParams block away. Convex on purpose: the open floor IS the topology,
// the portal-clear splice and doodad-navigability net do the policing.
function parklandLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  interface MixRow { kind: string; weight: number; radius: [number, number] }
  const pickMix = (mix: MixRow[]): MixRow => {
    const total = mix.reduce((a, m) => a + m.weight, 0);
    let roll = rng.range(0, total);
    for (const m of mix) { roll -= m.weight; if (roll <= 0) return m; }
    return mix[mix.length - 1];
  };

  // Dials (spec ▷ tileset ▷ biome). Defaults sketch a LIVING parkland so the
  // recipe stands alone (genqa's bare-layout case); the weald feeds stone.
  const groveN = layoutParam(def, 'parklandGroves', [7, 11]) as [number, number];
  const groveR = layoutParam(def, 'parklandGroveR', [130, 230]) as [number, number];
  const groveGap = layoutParam(def, 'parklandGroveGap', [430, 620]) as [number, number];
  const trees = layoutParam(def, 'parklandTrees',
    [{ kind: 'tree', weight: 1, radius: [22, 34] }]) as MixRow[];
  const hearts = layoutParam(def, 'parklandHearts',
    [{ kind: 'ancient_tree', weight: 1, radius: [40, 54] }]) as MixRow[];
  const heartExtra = layoutParam<{ kind: string; chance: number; radius: [number, number] } | undefined>(
    def, 'parklandHeartExtra', undefined);
  const floor = layoutParam(def, 'parklandFloor',
    [{ kind: 'rock', weight: 2, radius: [16, 30] }, { kind: 'brush', weight: 3, radius: [14, 24] }]) as MixRow[];
  const floorN = layoutParam(def, 'parklandFloorN', [26, 44]) as [number, number];
  const portalClear = layoutParam(def, 'parklandPortalClear', 230);

  const portals = [ctx.entry, ...ctx.exits];
  const clearOfPortals = (x: number, y: number, pad: number): boolean =>
    portals.every(p => Math.hypot(p.x - x, p.y - y) > portalClear + pad);

  // 1) Stand sites: a jittered lattice thinned to the rolled count — spacing
  // keeps stands DISCRETE (the patchwork read), the portal ring keeps every
  // mouth in open country.
  const gap = rng.range(groveGap[0], groveGap[1]);
  const inset = 120 + groveR[1];
  const sites: { x: number; y: number; r: number }[] = [];
  for (let y = inset; y <= arena.h - inset; y += gap) {
    for (let x = inset; x <= arena.w - inset; x += gap) {
      const px = x + rng.range(-0.3, 0.3) * gap;
      const py = y + rng.range(-0.3, 0.3) * gap;
      const r = rng.range(groveR[0], groveR[1]);
      if (!clearOfPortals(px, py, r)) continue;
      sites.push({ x: px, y: py, r });
    }
  }
  // Thin to the rolled stand count, dropping deterministically by rng index.
  const want = rng.int(groveN[0], groveN[1]);
  while (sites.length > want) sites.splice(rng.int(0, sites.length - 1), 1);

  // 2) Each stand: hearts at the core, the clump ringed center-biased around
  // them (trunks packed inside crown span so the veil knits the stand into
  // ONE sealed patch), a scree skirt at the drip line.
  for (const s of sites) {
    const placed: { x: number; y: number }[] = [];
    const plant = (m: MixRow, px: number, py: number): void => {
      if (hitsReservation(ctx, px, py, 14) || !clearOfPortals(px, py, 0)) return;
      ctx.doodads.push({
        pos: vec(px, py), radius: rng.range(m.radius[0], m.radius[1]),
        kind: m.kind as DoodadKind, rot: rng.range(0, Math.PI * 2),
      });
      placed.push({ x: px, y: py });
    };
    const heartN = rng.int(1, 2);
    for (let i = 0; i < heartN; i++) {
      plant(pickMix(hearts), s.x + rng.range(-0.2, 0.2) * s.r, s.y + rng.range(-0.2, 0.2) * s.r);
    }
    if (heartExtra && rng.chance(heartExtra.chance)) {
      plant({ kind: heartExtra.kind, weight: 1, radius: heartExtra.radius },
        s.x + rng.range(-0.3, 0.3) * s.r, s.y + rng.range(-0.3, 0.3) * s.r);
    }
    const treeN = Math.round(s.r / 14) + rng.int(-1, 2);
    for (let i = 0; i < treeN; i++) {
      // Center-biased ring fill, resampled off its own clump-mates so trunks
      // spread while crowns still knit.
      for (let tries = 0; tries < 8; tries++) {
        const a = rng.range(0, Math.PI * 2);
        const d = Math.pow(rng.range(0, 1), 0.7) * s.r * 0.9;
        const px = s.x + Math.cos(a) * d, py = s.y + Math.sin(a) * d;
        if (placed.some(q => Math.hypot(q.x - px, q.y - py) < 34)) continue;
        plant(pickMix(trees), px, py);
        break;
      }
    }
    const skirtN = rng.int(2, 4);
    for (let i = 0; i < skirtN; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = s.r * rng.range(0.9, 1.15);
      const px = s.x + Math.cos(a) * d, py = s.y + Math.sin(a) * d;
      if (hitsReservation(ctx, px, py, 10) || !clearOfPortals(px, py, 0)) continue;
      ctx.doodads.push({ pos: vec(px, py), radius: rng.range(16, 26), kind: 'scree', rot: rng.range(0, Math.PI * 2) });
    }
  }

  // 3) The open floor between stands: lone solids (spires, stones, downed
  // boles — the indestructible punctuation between the breakable clumps).
  // Density is a dial and deliberately MODEST: several of these kinds paint
  // live (the boulder spire family never bakes — the weald's perf lesson).
  const floorWant = rng.int(floorN[0], floorN[1]);
  for (let i = 0, placed = 0; i < floorWant * 3 && placed < floorWant; i++) {
    const px = rng.range(100, arena.w - 100), py = rng.range(100, arena.h - 100);
    if (!clearOfPortals(px, py, 0)) continue;
    if (sites.some(s => Math.hypot(s.x - px, s.y - py) < s.r + 40)) continue;
    if (hitsReservation(ctx, px, py, 12)) continue;
    const m = pickMix(floor);
    ctx.doodads.push({
      pos: vec(px, py), radius: rng.range(m.radius[0], m.radius[1]),
      kind: m.kind as DoodadKind, rot: rng.range(0, Math.PI * 2),
    });
    placed++;
  }

  // 4) A few stand hearts are the zone's anchors (spawn/loot placement bias).
  for (let i = 0; i < Math.min(3, sites.length); i++) ctx.pois.push(vec(sites[i].x, sites[i].y));

  // 5) Tileset furniture (cave mouths, formations, watchers) lands in the
  // open with the ordinary gates; the portal-clear splice polices the rest.
  scatterDecoration(ctx, def);
}
registerLayout('parkland', parklandLayout);

// --- SPIRAL (the cauldron) ------------------------------------------------------
function spiralLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const cx = arena.w / 2, cy = arena.h / 2;
  const R = Math.min(arena.w, arena.h) * 0.46;

  const neg = Mask.forRect(0, 0, arena.w, arena.h);
  neg.invert();
  // The negative space: rock walls by default, or a LIQUID (a spiral causeway
  // over a lava sea — the cauldron; over the void — a sky-spiral).
  const negLiquid = layoutParam<string | undefined>(def, 'negativeLiquid', undefined);
  if (negLiquid) paintLiquid(ctx, grid, neg, liquidOf(negLiquid));
  else paintRegion(grid, neg, negativeRegion(def));

  const carve = Mask.forRect(0, 0, arena.w, arena.h);
  const turns = layoutParam(def, 'turns', 2.2);
  const a0 = rng.range(0, Math.PI * 2);
  const coil = spiralPath(cx, cy, R, R * 0.1, turns, { a0, step: 36 });
  const causewayHalf = layoutParam(def, 'causewayWidth', 68) / 2;
  band(carve, coil, causewayHalf);
  reserveArtery(ctx, coil, causewayHalf); // the coil is the only road — nothing may plug it
  disc(carve, cx, cy, layoutParam(def, 'heartRadius', 150)); // the heart chamber
  ctx.pois.push(vec(cx, cy));
  // Entry + exits: stems from each portal to the NEAREST point ON the coil
  // itself (the rim circle only meets the spiral at its outer end — aiming
  // there stranded portals between the arms).
  const nearestOnCoil = (p: Vec2): Vec2 => {
    let best = coil[0], bd = Infinity;
    for (const q of coil) {
      const d = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
      if (d < bd) { bd = d; best = q; }
    }
    return vec(best.x, best.y);
  };
  for (const pt of [ctx.entry, ...ctx.exits]) {
    disc(carve, pt.x, pt.y, 100);
    const stem = wanderPath(rng, pt, nearestOnCoil(pt), { step: 90, wobble: 20 });
    band(carve, stem, 34);
    reserveArtery(ctx, stem, 34);
  }
  paintRegion(grid, carve, 'ground');
  // A liquid negative pours OVER the whole arena before the carve — splice its
  // doodads off the causeway so the walkway is truly clean stone. Tested by
  // INTERSECTION (a grown mask), not center-in-carve: a lava disc centered on
  // the bank still overhangs half the walkway with its rim.
  if (negLiquid) {
    const lq = liquidOf(negLiquid);
    if (lq.doodad) {
      const clear = carve.clone().grow(2); // ≈ liquid disc radius + actor clearance
      for (let k = ctx.doodads.length - 1; k >= 0; k--) {
        const d = ctx.doodads[k];
        if (d.kind === lq.doodad && clear.has(d.pos.x, d.pos.y)) ctx.doodads.splice(k, 1);
      }
    }
  }
  scatterDecoration(ctx, def);
}
registerLayout('spiral', spiralLayout);

// --- RIVERLAND (River of Flame / frozen river / forded river) --------------------
function riverlandLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const liquidId = layoutParam(def, 'riverLiquid', 'water');
  // ORIENTATION: riverSides [enterSide, exitSide] carves the spine between
  // those zone edges — a COURSE (world/courses.ts) hands every zone on a
  // throughline its up/downstream pair so consecutive zones read as ONE
  // continuous flow. Absent = the classic long-axis crossing. Either path
  // draws exactly TWO rng values (the endpoint laterals) — the draw-order
  // contract that keeps course-less riverlands byte-identical.
  const sides = layoutParam<[string, string] | undefined>(def, 'riverSides', undefined);
  const edgePoint = (side: string): Vec2 =>
    side === 'w' ? vec(30, rng.range(arena.h * 0.3, arena.h * 0.7))
      : side === 'e' ? vec(arena.w - 30, rng.range(arena.h * 0.3, arena.h * 0.7))
        : side === 'n' ? vec(rng.range(arena.w * 0.3, arena.w * 0.7), 30)
          : vec(rng.range(arena.w * 0.3, arena.w * 0.7), arena.h - 30);
  const horizontal = arena.w >= arena.h;
  const from = sides ? edgePoint(sides[0])
    : horizontal ? vec(30, rng.range(arena.h * 0.3, arena.h * 0.7)) : vec(rng.range(arena.w * 0.3, arena.w * 0.7), 30);
  const to = sides ? edgePoint(sides[1])
    : horizontal ? vec(arena.w - 30, rng.range(arena.h * 0.3, arena.h * 0.7)) : vec(rng.range(arena.w * 0.3, arena.w * 0.7), arena.h - 30);
  const pts = wanderPath(rng, from, to, { step: 150, wobble: 90, bowFrac: 0.2 });
  const width = layoutParam(def, 'riverWidth', [90, 150]) as [number, number];
  const halfW = rng.range(width[0], width[1]) / 2;

  // FREEZE POINT: the course transitions material at freezeAt (0..1) — a
  // winding river coalescing into a frozen run (D2 Act 5). Split the band by
  // path fraction into two masks, pour each liquid.
  const freezeAt = layoutParam<number | undefined>(def, 'freezeAt', undefined);
  if (freezeAt !== undefined) {
    // Clamp to length-2: band() needs ≥2 points, so a cut at length-1 would
    // slice a single-point tail and silently paint NO frozen section at all
    // (a freezeAt ≳ 0.95 river lost its whole D2-Act-5 frozen run).
    const cut = Math.max(1, Math.min(pts.length - 2, Math.round(pts.length * freezeAt)));
    const flowing = Mask.forRect(0, 0, arena.w, arena.h);
    band(flowing, pts.slice(0, cut + 1), halfW);
    const frozen = Mask.forRect(0, 0, arena.w, arena.h);
    band(frozen, pts.slice(cut), halfW);
    frozen.subtract(flowing);
    paintLiquid(ctx, grid, flowing, liquidOf(liquidId));
    paintLiquid(ctx, grid, frozen, liquidOf(layoutParam(def, 'frozenLiquid', 'ice')));
  } else {
    const river = Mask.forRect(0, 0, arena.w, arena.h);
    band(river, pts, halfW);
    paintLiquid(ctx, grid, river, liquidOf(liquidId));
  }

  // CAUSEWAYS: walkable crossings re-carved over the liquid (the River of
  // Flame's stone walkways) — the liquid doodads under them are spliced so a
  // causeway is truly clean ground, plus bridge planks for the look.
  const crossings = layoutParam(def, 'causeways', [2, 3]) as [number, number];
  const n = rng.int(crossings[0], crossings[1]);
  for (let i = 0; i < n; i++) {
    const idx = Math.max(1, Math.min(pts.length - 2, Math.round(((i + 1) / (n + 1)) * pts.length)));
    const at = pts[idx];
    const along = Math.atan2(pts[idx + 1].y - pts[idx - 1].y, pts[idx + 1].x - pts[idx - 1].x);
    const perp = along + Math.PI / 2;
    const reach = halfW * 1.6;
    // Splice liquid doodads INTERSECTING the causeway strip (full radius —
    // a rim overhanging half the walkway blocks it as surely as a center).
    for (let k = ctx.doodads.length - 1; k >= 0; k--) {
      const d = ctx.doodads[k];
      const rel = { x: d.pos.x - at.x, y: d.pos.y - at.y };
      const alongD = Math.abs(rel.x * Math.cos(perp) + rel.y * Math.sin(perp));
      const acrossD = Math.abs(-rel.x * Math.sin(perp) + rel.y * Math.cos(perp));
      if (alongD < reach + d.radius && acrossD < 40 + d.radius) ctx.doodads.splice(k, 1);
    }
    for (let s = -reach; s <= reach; s += 18) {
      ctx.doodads.push({
        pos: vec(at.x + Math.cos(perp) * s, at.y + Math.sin(perp) * s),
        radius: 24, kind: 'bridge', dir: perp,
      });
    }
    // The crossing is the zone's artery — reserve it against the scatter.
    reserveArtery(ctx, [
      vec(at.x - Math.cos(perp) * reach, at.y - Math.sin(perp) * reach),
      vec(at.x + Math.cos(perp) * reach, at.y + Math.sin(perp) * reach),
    ], 44);
  }
  // MID-RIVER ISLES: walkable islets spliced out of the flow — obsidian bars
  // in a river of flame, gravel bars in a ford — perch/loot pockets (each
  // joins ctx.pois). Rolls NOTHING unless the biome asks: the [0,0] default
  // draws zero rng, so every course-less riverland stream stays byte-identical.
  const isles = layoutParam(def, 'isles', [0, 0]) as [number, number];
  if (isles[1] > 0) {
    const liquidKinds = new Set([
      liquidOf(liquidId).doodad,
      ...(freezeAt !== undefined ? [liquidOf(layoutParam(def, 'frozenLiquid', 'ice')).doodad] : []),
    ].filter((k): k is NonNullable<typeof k> => !!k));
    for (let i = 0, n2 = rng.int(isles[0], isles[1]); i < n2; i++) {
      const idx = Math.max(1, Math.min(pts.length - 2, rng.int(1, pts.length - 2)));
      const at = pts[idx];
      const along = Math.atan2(pts[idx + 1].y - pts[idx - 1].y, pts[idx + 1].x - pts[idx - 1].x);
      const perp = along + Math.PI / 2;
      const off = rng.range(-halfW * 0.35, halfW * 0.35);
      const c = vec(at.x + Math.cos(perp) * off, at.y + Math.sin(perp) * off);
      const r = rng.range(40, Math.max(46, halfW * 0.55));
      // Splice the liquid off the islet — rim-aware (the causeway discipline):
      // a disc overhanging the islet blocks it as surely as one centered there.
      for (let k = ctx.doodads.length - 1; k >= 0; k--) {
        const d = ctx.doodads[k];
        if (liquidKinds.has(d.kind) && Math.hypot(d.pos.x - c.x, d.pos.y - c.y) < r + d.radius * 0.7) {
          ctx.doodads.splice(k, 1);
        }
      }
      ctx.pois.push(vec(c.x, c.y));
    }
  }
  // A forest biome's river still wears its ROOF (data-gated on forestTrees —
  // the fix for treeless gloamwood riverlands; hell's flame course declares
  // no trees and stays bare). Planted before the furniture so decoration
  // pools into what the crowns leave open, same as the forest recipe.
  const roofDodge = new Set([
    liquidOf(liquidId).doodad,
    ...(freezeAt !== undefined ? [liquidOf(layoutParam(def, 'frozenLiquid', 'ice')).doodad] : []),
  ].filter((k): k is NonNullable<typeof k> => !!k));
  plantRiverbankRoof(ctx, def, roofDodge);
  scatterDecoration(ctx, def);
}
registerLayout('riverland', riverlandLayout);

// --- EXPANSE (open country beyond the Field) --------------------------------------
function expanseLayout(ctx: GenCtx, def: ZoneDef): void {
  // Wide-open ground: the tileset's decoration, plus EXTRA landmark headroom —
  // the zone's own landmark rolls run in generateLayout; the expanse adds a
  // bonus roll pass so open country reads geographically rich.
  scatterDecoration(ctx, def);
  const bonus = layoutParam(def, 'bonusLandmarks', [1, 2]) as [number, number];
  const pool = (def.landmarks ?? []).map(r => r.landmark);
  if (pool.length) {
    for (let i = 0, n = ctx.rng.int(bonus[0], bonus[1]); i < n; i++) {
      placeLandmarkById(ctx, pool[ctx.rng.int(0, pool.length - 1)]);
    }
  }
}
registerLayout('expanse', expanseLayout);

// --- LAKELANDS (composition proof: landmarks + clusters, nothing bespoke) --------
function lakelandsLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng } = ctx;
  for (let i = 0, n = rng.int(1, 2); i < n; i++) placeLandmarkById(ctx, 'great_lake');
  if (rng.chance(0.6)) placeLandmarkById(ctx, 'lake');
  scatterDecoration(ctx, def);
}
registerLayout('lakelands', lakelandsLayout);

// --- FOREST (the deep wood: CANOPY as terrain) -------------------------------------
// A CONVEX recipe — no walk grid; the floor stays open between trunks. The
// forest's body is its canopy: VEILED walk-under trees planted through a
// smooth noise density mask whose coverage scales with geo.biomeDepth — a
// zone deep inside its forest region is a near-sealed roof of leaves, a
// fringe zone breathes. Crowns overlap ON PURPOSE: the veil system
// (engine/veil.ts) merges them into contiguous patches that hide everything
// beneath until you walk in under the same mass — growing density obscures
// vision; mobility and positioning keep a target in sight. Clearings punch
// sun-wells through the roof, GAME TRAILS wander entry→exits as worn 'road'
// ground (the tileset's road color reads as beaten earth; the moveScale seam
// rides along), the understory thickens beneath the crowns, and the tileset's
// decoration scatter runs last — its solids self-sort into the gaps the
// canopy left, because findSpot already refuses solid-on-solid.
// Every knob reads from layoutParams (spec ▷ tileset ▷ biome), so any biome
// can pour its own woods (a package could roll a 'forest' of fungal towers).

/** Smooth 2-octave value noise in 0..1 — the planner's density mask. Local
 *  hash (the Rng family) so ONE seed draw covers the whole lattice sweep. */
function forestHash(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return (h >>> 0) / 0x100000000;
}
function forestValueNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = forestHash(gx, gy, seed), b = forestHash(gx + 1, gy, seed);
  const c = forestHash(gx, gy + 1, seed), d = forestHash(gx + 1, gy + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
function forestNoise(x: number, y: number, seed: number): number {
  return 0.65 * forestValueNoise(x, y, 340, seed)
    + 0.35 * forestValueNoise(x, y, 130, (seed ^ 0x51ed) >>> 0);
}

/** Circle-vs-reservation test covering both Reservation shapes. */
function hitsReservation(ctx: GenCtx, x: number, y: number, r: number): boolean {
  for (const res of ctx.reserved) {
    if ('pos' in res) {
      const dx = x - res.pos.x, dy = y - res.pos.y;
      const reach = res.radius + r;
      if (dx * dx + dy * dy < reach * reach) return true;
    } else {
      const m = (res.margin ?? 0) + r;
      if (x > res.rect.x - m && x < res.rect.x + res.rect.w + m
        && y > res.rect.y - m && y < res.rect.y + res.rect.h + m) return true;
    }
  }
  return false;
}

interface ForestTreeMix { kind: string; weight: number; radius: [number, number] }

function forestLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const depth = def.geo?.biomeDepth ?? 0.5;
  const coverEdge = layoutParam(def, 'forestCoverEdge', 0.44);
  const coverDeep = layoutParam(def, 'forestCoverDeep', 0.86);
  const sd = depth * depth * (3 - 2 * depth); // smoothstep: the heart seals fast
  const cover = coverEdge + (coverDeep - coverEdge) * sd;
  const spacing = layoutParam(def, 'forestSpacing', 46);
  // ONE rng draw seeds the whole density mask; per-tree rolls draw only for
  // trees that actually place, so retuning coverage can't shift what an
  // unrelated later stamp rolls out from under a fixed zone seed.
  const noiseSeed = rng.int(0, 0x7fffffff);

  // CLEARINGS — sun-wells the canopy never claims. POIs so patrols/quests
  // find them; the decoration scatter's solids sort into them naturally.
  const clearingN = layoutParam(def, 'forestClearings', [2, 4]) as [number, number];
  const clearings: { x: number; y: number; r: number }[] = [];
  for (let i = 0, n = rng.int(clearingN[0], clearingN[1]); i < n; i++) {
    const c = {
      x: rng.range(arena.w * 0.15, arena.w * 0.85),
      y: rng.range(arena.h * 0.15, arena.h * 0.85),
      r: rng.range(130, 230),
    };
    clearings.push(c);
    ctx.pois.push(vec(c.x, c.y));
  }

  // GAME TRAILS — worn ground wandering entry → exit, laid through THE
  // way-layer (layTraveledWay): path-mode blend, moveScale, clearway
  // right-of-way and the zone's overgrowth dial, one implementation. Live
  // stretches reserve their ground so the planting sweep leaves the passage
  // open; OVERGROWN stretches reserve nothing and stand aside from the
  // clearway carve — the deep wood wins those back, trees and all.
  const trailN = Math.min(ctx.exits.length,
    rng.int(...(layoutParam(def, 'forestTrails', [1, 2]) as [number, number])));
  for (let i = 0; i < trailN; i++) {
    const pts = wanderPath(rng, ctx.entry, ctx.exits[i], { step: 120, wobble: 55, bowFrac: 0.3 });
    layTraveledWay(ctx, pts, { reserve: true });
  }

  // THE CANOPY — a jittered lattice sweep through the density mask. Crowns
  // are sized to knit (spacing < neighbouring crown radii sums), so the veil
  // index reads whole stands as single patches.
  const mix = layoutParam(def, 'forestTrees', [
    { kind: 'forest_oak', weight: 5, radius: [38, 58] },
    { kind: 'tree', weight: 3, radius: [20, 32] },
    { kind: 'conifer', weight: 2, radius: [20, 30] },
    { kind: 'briarwood', weight: 1, radius: [18, 26] },
  ] as ForestTreeMix[]);
  const totalW = mix.reduce((a, m) => a + m.weight, 0);
  const portals = [ctx.entry, ...ctx.exits];
  const portalClear = layoutParam(def, 'forestPortalClear', 140);
  const margin = 40;
  for (let y = margin; y < arena.h - margin; y += spacing) {
    for (let x = margin; x < arena.w - margin; x += spacing) {
      if (forestNoise(x, y, noiseSeed) > cover) continue;
      const px = x + (forestHash(x, y, (noiseSeed ^ 0x77) >>> 0) - 0.5) * spacing * 0.9;
      const py = y + (forestHash(x, y, (noiseSeed ^ 0xa1) >>> 0) - 0.5) * spacing * 0.9;
      if (clearings.some(c => (px - c.x) ** 2 + (py - c.y) ** 2 < c.r * c.r)) continue;
      if (portals.some(p => (px - p.x) ** 2 + (py - p.y) ** 2 < portalClear * portalClear)) continue;
      if (hitsReservation(ctx, px, py, 14)) continue;
      let roll = rng.range(0, totalW);
      let m = mix[mix.length - 1];
      for (const cand of mix) { roll -= cand.weight; if (roll <= 0) { m = cand; break; } }
      const treeR = rng.range(m.radius[0], m.radius[1]);
      const treeRot = rng.range(0, Math.PI * 2);
      // CLEARWAY (the precise gate — reservations are lumpy sausages): the
      // TRUNK stays off live trail ground while the crown may overhang it;
      // overgrown (wild) stretches admit the wood back. Post-roll rejection,
      // acceptance-only — the draw stream stays deterministic.
      if (onClearway(ctx, vec(px, py), treeR * (doodadRuleOf(m.kind).bodyScale ?? 1))) continue;
      ctx.doodads.push({ pos: vec(px, py), radius: treeR, kind: m.kind, rot: treeRot });
    }
  }

  // ELDERS — the deep wood's anchors (huge veiled crowns; whole packs wait
  // beneath one). Fringe zones may see a single elder; the heart grows more.
  const elderN = depth > 0.45 ? rng.int(1, 3) : rng.int(0, 1);
  for (let i = 0; i < elderN; i++) {
    for (let tries = 0; tries < 12; tries++) {
      const px = rng.range(arena.w * 0.2, arena.w * 0.8);
      const py = rng.range(arena.h * 0.2, arena.h * 0.8);
      if (forestNoise(px, py, noiseSeed) > cover) continue;
      if (clearings.some(c => (px - c.x) ** 2 + (py - c.y) ** 2 < c.r * c.r)) continue;
      if (portals.some(p => (px - p.x) ** 2 + (py - p.y) ** 2 < 180 * 180)) continue;
      if (hitsReservation(ctx, px, py, 30)) continue;
      const elderR = rng.range(56, 80);
      const elderRot = rng.range(0, Math.PI * 2);
      if (onClearway(ctx, vec(px, py), elderR * (doodadRuleOf('ancient_tree').bodyScale ?? 1))) continue;
      ctx.doodads.push({ pos: vec(px, py), radius: elderR, kind: 'ancient_tree', rot: elderRot });
      break;
    }
  }

  // UNDERSTORY — brush and fern thicken beneath the crowns (concealment
  // fields the stealth statuses already speak); berries where light leaks.
  const area = arena.w * arena.h;
  const underN = Math.round((area / 260000) * (6 + cover * 10));
  for (let i = 0; i < underN; i++) {
    const px = rng.range(margin, arena.w - margin);
    const py = rng.range(margin, arena.h - margin);
    if (forestNoise(px, py, noiseSeed) > cover) continue;
    if (portals.some(p => (px - p.x) ** 2 + (py - p.y) ** 2 < 120 * 120)) continue;
    if (hitsReservation(ctx, px, py, 10)) continue;
    const roll = rng.range(0, 1);
    const kind = roll < 0.5 ? 'brush' : roll < 0.85 ? 'fern' : 'berry_bush';
    ctx.doodads.push({ pos: vec(px, py), radius: rng.range(12, 22), kind, rot: rng.range(0, Math.PI * 2) });
  }

  // The tileset's own decoration last: rocks/rivers/ruins/camps findSpot into
  // whatever the canopy left open — furniture pools in clearings for free.
  scatterDecoration(ctx, def);
}
registerLayout('forest', forestLayout);

/** THE BANK ROOF — a riverland crossing a FOREST biome keeps its canopy.
 *  Data-gated on the biome declaring layoutParams.forestTrees (the
 *  gloamwood's crooked roof follows its rivers; the River of Flame, which
 *  declares none, stays bare — no biome names in code). A compact sibling
 *  of forestLayout's sweep: own noise seed, same mix/cover/spacing params,
 *  portals + reservations (causeways, trails) respected — and the poured
 *  flow dodged EXPLICITLY (bucketed liquid occupancy: tree rules carry no
 *  forbidOn water, so the planting must keep the river's daylight itself). */
function plantRiverbankRoof(ctx: GenCtx, def: ZoneDef, liquidKinds: ReadonlySet<string>): void {
  const mix = layoutParam<ForestTreeMix[] | undefined>(def, 'forestTrees', undefined);
  if (!mix?.length) return;
  const { rng, arena } = ctx;
  const depth = def.geo?.biomeDepth ?? 0.5;
  const coverEdge = layoutParam(def, 'forestCoverEdge', 0.44);
  const coverDeep = layoutParam(def, 'forestCoverDeep', 0.86);
  const sd = depth * depth * (3 - 2 * depth);
  // Banks read a touch opener than the sealed wood — the river IS the clearing.
  const cover = (coverEdge + (coverDeep - coverEdge) * sd) * layoutParam(def, 'riverBankCover', 0.9);
  const spacing = layoutParam(def, 'forestSpacing', 46);
  const noiseSeed = rng.int(0, 0x7fffffff);
  const B = 60;
  const wet = new Set<number>();
  for (const d of ctx.doodads) {
    if (!liquidKinds.has(d.kind)) continue;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        wet.add(Math.floor((d.pos.x + ox * d.radius) / B) * 8192 + Math.floor((d.pos.y + oy * d.radius) / B));
      }
    }
  }
  const isWet = (x: number, y: number): boolean => wet.has(Math.floor(x / B) * 8192 + Math.floor(y / B));
  const totalW = mix.reduce((a, m) => a + m.weight, 0);
  const portals = [ctx.entry, ...ctx.exits];
  const portalClear = layoutParam(def, 'forestPortalClear', 140);
  const margin = 40;
  for (let y = margin; y < arena.h - margin; y += spacing) {
    for (let x = margin; x < arena.w - margin; x += spacing) {
      if (forestNoise(x, y, noiseSeed) > cover) continue;
      const px = x + (forestHash(x, y, (noiseSeed ^ 0x77) >>> 0) - 0.5) * spacing * 0.9;
      const py = y + (forestHash(x, y, (noiseSeed ^ 0xa1) >>> 0) - 0.5) * spacing * 0.9;
      if (isWet(px, py)) continue;
      if (portals.some(p => (px - p.x) ** 2 + (py - p.y) ** 2 < portalClear * portalClear)) continue;
      if (hitsReservation(ctx, px, py, 14)) continue;
      let roll = rng.range(0, totalW);
      let m = mix[mix.length - 1];
      for (const cand of mix) { roll -= cand.weight; if (roll <= 0) { m = cand; break; } }
      const treeR = rng.range(m.radius[0], m.radius[1]);
      const treeRot = rng.range(0, Math.PI * 2);
      // CLEARWAY (the precise gate — reservations are lumpy sausages): the
      // TRUNK stays off live trail ground while the crown may overhang it;
      // overgrown (wild) stretches admit the wood back. Post-roll rejection,
      // acceptance-only — the draw stream stays deterministic.
      if (onClearway(ctx, vec(px, py), treeR * (doodadRuleOf(m.kind).bodyScale ?? 1))) continue;
      ctx.doodads.push({ pos: vec(px, py), radius: treeR, kind: m.kind, rot: treeRot });
    }
  }
  // A thin understory so the banks read lived-in, not decorated.
  const underN = Math.round((arena.w * arena.h / 260000) * (3 + cover * 5));
  for (let i = 0; i < underN; i++) {
    const px = rng.range(margin, arena.w - margin);
    const py = rng.range(margin, arena.h - margin);
    if (forestNoise(px, py, noiseSeed) > cover || isWet(px, py)) continue;
    if (portals.some(p => (px - p.x) ** 2 + (py - p.y) ** 2 < 120 * 120)) continue;
    if (hitsReservation(ctx, px, py, 10)) continue;
    const roll = rng.range(0, 1);
    const kind = roll < 0.5 ? 'brush' : roll < 0.85 ? 'fern' : 'berry_bush';
    ctx.doodads.push({ pos: vec(px, py), radius: rng.range(12, 22), kind, rot: rng.range(0, Math.PI * 2) });
  }
}

// --- OPEN SEA (the VOYAGE's boundless pseudo-zone) ---------------------------------
// Deliberately EMPTY: the sea's terrain is the continent field, STREAMED in
// around the boat at runtime (world.streamCoast) — nothing is generated ahead.
registerLayout('open_sea', () => { /* streamed, not generated */ });

// --- METROPOLIS (sprawling city, intact or ruined) --------------------------------
function metropolisLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const ruined = layoutParam(def, 'ruined', 0);
  const blockPx = layoutParam(def, 'blockSize', 420);
  const streetW = layoutParam(def, 'streetWidth', 100);
  const cols = Math.max(2, Math.floor(arena.w / blockPx));
  const rows = Math.max(2, Math.floor(arena.h / blockPx));
  const bw = arena.w / cols, bh = arena.h / rows;

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const cx = (bx + 0.5) * bw, cy = (by + 0.5) * bh;
      // Portal-adjacent plots stay open (plazas), so streets breathe at the gates.
      const nearPortal = [ctx.entry, ...ctx.exits].some(p => Math.hypot(p.x - cx, p.y - cy) < Math.max(bw, bh) * 0.8);
      const roll = rng.range(0, 1);
      if (nearPortal || roll < 0.25) {
        // Plaza: open ground, maybe a centerpiece.
        if (!nearPortal && rng.chance(0.4)) {
          ctx.doodads.push({ pos: vec(cx, cy), radius: rng.range(14, 22), kind: 'rock', rot: rng.range(0, Math.PI * 2) });
        }
        continue;
      }
      if (roll < 0.25 + (1 - ruined) * 0.6 && rng.chance(1 - ruined)) {
        // INTACT block: a roofed city house (plan structure — doors, roof
        // reveal, the works), sized under the plot.
        raiseStructure(ctx, 'metro_house', vec(cx, cy));
      } else {
        // RUINED block: a broken wall rim + rubble (the sacked quarter).
        const w = bw - streetW, h = bh - streetW;
        const segR = 12;
        for (const [sx, sy, dx, dy, len] of [
          [cx - w / 2, cy - h / 2, 1, 0, w], [cx - w / 2, cy + h / 2, 1, 0, w],
          [cx - w / 2, cy - h / 2, 0, 1, h], [cx + w / 2, cy - h / 2, 0, 1, h],
        ] as const) {
          const steps = Math.ceil(len / (segR * 1.8));
          for (let s = 0; s <= steps; s++) {
            if (rng.chance(0.28 + ruined * 0.4)) continue; // the breach-riddled walls
            ctx.doodads.push({ pos: vec(sx + dx * (s / steps) * len, sy + dy * (s / steps) * len), radius: segR, kind: 'wall' });
          }
        }
        for (let k = 0, kn = rng.int(1, 3); k < kn; k++) {
          ctx.doodads.push({
            pos: vec(cx + rng.range(-w / 3, w / 3), cy + rng.range(-h / 3, h / 3)),
            radius: rng.range(10, 20), kind: 'rock', rot: rng.range(0, Math.PI * 2),
          });
        }
        if (rng.chance(0.5)) ctx.pois.push(vec(cx, cy));
      }
    }
  }
  void grid; // ensured so structures paint + streets stay walkable ground
  scatterDecoration(ctx, def);
}
registerLayout('metropolis', metropolisLayout);

// --- STEPPES (the Underworld's outer marches) --------------------------------------
// Open scorched country partitioned by RUINED WALL RUNS: long angular rampart
// remnants (true walls — block movement, shots, and sight) with breaches and
// open ends, so the plain is wide but never straight: you navigate AROUND the
// fortifications hell abandoned. Optionally a GATE TERRACE at the entry — a
// raised floored ledge flanked by masonry whose only way down is a switchback
// stair: the descent out of a fortress gate and onto the steppe. Every knob
// reads from layoutParams (spec ▷ tileset ▷ biome), and the terrace is an
// EXPORTED composable (carveGateTerrace) — a surface battlefield or a glacier
// shelf can pour its own ruin-field or descent without touching this recipe.

/** Fill a world-space rect (plus margin) into a mask — the rect counterpart of
 *  disc/band for portal clears and footprint exclusions. */
function rectInto(m: Mask, r: { x: number; y: number; w: number; h: number }, margin = 0): void {
  const x0 = m.cx(r.x - margin), x1 = m.cx(r.x + r.w + margin);
  const y0 = m.cy(r.y - margin), y1 = m.cy(r.y + r.h + margin);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) m.set(cx, cy, true);
  }
}

export interface GateTerraceParams {
  /** Roll chance when the object is present (default 1 — always). */
  chance?: number;
  /** Platform half-width across the portal (world units; lattice-snapped). */
  halfWidth?: number;
  /** Platform reach into the zone (world units; lattice-snapped). */
  depth?: number;
  /** Width of the stair mouth in the front lip (≥ 3 cells). */
  stairWidth?: number;
  /** Flank/lip wall region (default 'rampart' — dressed fortress masonry). */
  wallRegion?: string;
  /** Baked floor under the platform (default 'flagstone'). */
  floorStyle?: string;
  /** The lights flanking the stair mouth ('' skips them). */
  brazierKind?: string;
  /** The stair doodad kind (default 'gate_stair'). */
  stairKind?: string;
}

export interface GateTerrace {
  rect: { x: number; y: number; w: number; h: number };
  /** Center of the stair mouth, on the lip's inner plane. */
  mouth: Vec2;
  /** Unit cardinal pointing DOWN the stairs, into the zone. */
  inward: Vec2;
}

/** Which arena wall does a portal hug? Unit CARDINAL pointing INWARD from
 *  that edge — the one alignment convention every portal-grown feature
 *  shares (gate terraces, boundary gates, approach roads, and the World's
 *  runtime pieces seated at a gate's mouth). Tie-breaks left→right→top→
 *  bottom, the order the original inline blocks used. */
export function inwardCardinal(arena: { w: number; h: number }, at: Vec2): Vec2 {
  const dl = at.x, dr = arena.w - at.x, dt = at.y, db = arena.h - at.y;
  const m = Math.min(dl, dr, dt, db);
  const ix = m === dl ? 1 : m === dr ? -1 : 0;
  return vec(ix, ix !== 0 ? 0 : (m === dt ? 1 : -1));
}

/** The resolved GEOMETRY of a boundary gate raised at a portal — inward
 *  cardinal, tangent, quantized footprint, the mouth on the façade line and
 *  the throat's INNER opening — computed ONCE here so the terrain carve and
 *  the World's runtime (sealed bars, toll wardens, prompts) seat against the
 *  same stone. Pure math, no rng; `g` absent falls to the registry defaults
 *  so callers may resolve an unregistered id defensively. */
export interface GateThroat {
  /** Unit cardinal pointing INWARD (into the zone) from the portal's wall. */
  inward: Vec2;
  /** Unit tangent along the façade. */
  tangent: Vec2;
  /** Mouth center on the façade line (the arch stands here). */
  mouth: Vec2;
  /** Center of the throat's INNER opening — where the lane meets the zone. */
  inner: Vec2;
  /** The gate's full footprint rect (clamped into the arena). */
  rect: { x: number; y: number; w: number; h: number };
  halfWidth: number; depth: number; back: number; mouthWidth: number;
}

export function gateThroatAt(arena: { w: number; h: number }, at: Vec2,
  g?: BoundaryGateDef): GateThroat {
  const CELL = 30;
  const q = (v: number): number => Math.round(v / CELL) * CELL;
  const inward = inwardCardinal(arena, at);
  const ix = inward.x, iy = inward.y;
  const tx = -iy, ty = ix; // tangent along the façade
  const halfW = Math.max(CELL * 5, q(g?.halfWidth ?? 240));
  const depth = Math.max(CELL * 4, q(g?.depth ?? 180));
  const mouthW = Math.max(CELL * 3, q(g?.mouthWidth ?? 130));
  const back = CELL * 2; // the façade tucks behind the portal line
  // Footprint: tangent span ±halfW, from just behind the portal to depth inward.
  const c0 = vec(at.x - ix * back, at.y - iy * back);
  const x0 = q(Math.min(c0.x, c0.x + ix * (depth + back)) - Math.abs(tx) * halfW);
  const y0 = q(Math.min(c0.y, c0.y + iy * (depth + back)) - Math.abs(ty) * halfW);
  const w = ix !== 0 ? depth + back : halfW * 2;
  const h = ix !== 0 ? halfW * 2 : depth + back;
  const rect = {
    x: Math.max(0, Math.min(arena.w - w, x0)),
    y: Math.max(0, Math.min(arena.h - h, y0)),
    w, h,
  };
  // The mouth's tangent coordinate (the façade strip's gap) and the two
  // centers the runtime cares about: the mouth on the façade line, and the
  // inner opening where the throat's flank walls end.
  const mouthLo = ix !== 0 ? q(at.y - mouthW / 2) : q(at.x - mouthW / 2);
  let mouth: Vec2, inner: Vec2;
  if (ix !== 0) {
    const fx = ix > 0 ? rect.x : rect.x + rect.w - CELL;
    mouth = vec(fx + CELL / 2, mouthLo + mouthW / 2);
    inner = vec(fx + (ix > 0 ? depth : CELL - depth), mouthLo + mouthW / 2);
  } else {
    const fy = iy > 0 ? rect.y : rect.y + rect.h - CELL;
    mouth = vec(mouthLo + mouthW / 2, fy + CELL / 2);
    inner = vec(mouthLo + mouthW / 2, fy + (iy > 0 ? depth : CELL - depth));
  }
  return { inward, tangent: vec(tx, ty), mouth, inner, rect, halfWidth: halfW, depth, back, mouthWidth: mouthW };
}

/** Raise a GATE TERRACE at a portal: a raised, floored ledge grown inward from
 *  the portal's own wall, flanked by wall bands, closed by a front lip whose
 *  one opening is a switchback stair down to the field — the "descending out
 *  of the fortress" moment as a reusable feature. The footprint is reserved
 *  (scatter/landmarks/structures all route around it), the floor bakes via a
 *  synthetic structure record (no roofs, no doors — the blacksmith-yard
 *  precedent), and the ground past the stair joins the reachability contract. */
export function carveGateTerrace(ctx: GenCtx, at: Vec2,
  p: GateTerraceParams = {}): GateTerrace | null {
  const grid = ensureGrid(ctx);
  const { arena } = ctx;
  const CELL = 30;
  const q = (v: number): number => Math.round(v / CELL) * CELL;
  // Which wall does the portal hug? The terrace grows INWARD from that edge.
  const { x: ix, y: iy } = inwardCardinal(arena, at);
  const halfW = Math.max(CELL * 4, q(p.halfWidth ?? 200));
  const depth = Math.max(CELL * 5, q(p.depth ?? 250));
  const stairW = Math.max(CELL * 3, q(p.stairWidth ?? 120));
  const wallRegion = p.wallRegion ?? 'rampart';
  const back = CELL; // the platform tucks slightly behind the portal line
  let x0: number, y0: number, w: number, h: number;
  if (ix !== 0) {
    w = depth + back; h = halfW * 2;
    x0 = ix > 0 ? q(at.x - back) : q(at.x + back) - w;
    y0 = q(at.y - halfW);
  } else {
    h = depth + back; w = halfW * 2;
    y0 = iy > 0 ? q(at.y - back) : q(at.y + back) - h;
    x0 = q(at.x - halfW);
  }
  x0 = Math.max(0, Math.min(arena.w - w, x0));
  y0 = Math.max(0, Math.min(arena.h - h, y0));
  const rect = { x: x0, y: y0, w, h };
  const wall = (wx: number, wy: number, ww: number, wh: number): void => {
    if (ww > 0.5 && wh > 0.5) grid.fillRegion(wx, wy, wx + ww - 0.01, wy + wh - 0.01, wallRegion);
  };
  // Floor first (the whole platform is walkable ground under the baked floor),
  // then the flanks along the long sides, then the LIP closing the inner end —
  // except for the stair mouth, centered on the portal's own axis.
  grid.fillRegion(x0, y0, x0 + w - 0.01, y0 + h - 0.01, 'ground');
  let mouth: Vec2;
  if (ix !== 0) {
    wall(x0, y0, w, CELL);
    wall(x0, y0 + h - CELL, w, CELL);
    const lipX = ix > 0 ? x0 + w - CELL : x0;
    const g0 = Math.max(y0 + CELL, Math.min(q(at.y - stairW / 2), y0 + h - CELL - stairW));
    const g1 = g0 + stairW;
    wall(lipX, y0, CELL, g0 - y0);
    wall(lipX, g1, CELL, y0 + h - g1);
    mouth = vec(ix > 0 ? x0 + w : x0, g0 + stairW / 2);
  } else {
    wall(x0, y0, CELL, h);
    wall(x0 + w - CELL, y0, CELL, h);
    const lipY = iy > 0 ? y0 + h - CELL : y0;
    const g0 = Math.max(x0 + CELL, Math.min(q(at.x - stairW / 2), x0 + w - CELL - stairW));
    const g1 = g0 + stairW;
    wall(x0, lipY, g0 - x0, CELL);
    wall(g1, lipY, x0 + w - g1, CELL);
    mouth = vec(g0 + stairW / 2, iy > 0 ? y0 + h : y0);
  }
  const inward = vec(ix, iy);
  // THE DESCENT: the stair flight spanning the mouth, braziers on the lip ends
  // flanking it. Direct pushes (no findSpot): the geometry IS the placement,
  // and the reserved footprint spares them from the portal-clear splice.
  ctx.doodads.push({
    pos: vec(mouth.x + inward.x * 14, mouth.y + inward.y * 14),
    radius: stairW * 0.55, kind: (p.stairKind ?? 'gate_stair'),
    rot: Math.atan2(inward.y, inward.x),
  });
  const brazierKind = p.brazierKind ?? 'brazier';
  if (brazierKind) {
    const tx = -inward.y, ty = inward.x;
    for (const s of [-1, 1]) {
      ctx.doodads.push({
        pos: vec(mouth.x - inward.x * (CELL / 2) + tx * s * (stairW / 2 + 22),
          mouth.y - inward.y * (CELL / 2) + ty * s * (stairW / 2 + 22)),
        radius: 9, kind: brazierKind,
      });
    }
  }
  // Bookkeeping: reserve the footprint (scatter, landmark and structure rolls
  // all honor it), bake the floor via a synthetic structure record, keep the
  // landing lane open, and hand the invariant the ground past the stair.
  ctx.reserved.push({ rect, margin: 10 });
  reserveArtery(ctx, [vec(mouth.x, mouth.y),
    vec(mouth.x + inward.x * 280, mouth.y + inward.y * 280)], 60);
  ctx.structures = ctx.structures ?? [];
  ctx.structures.push({
    id: `gate_terrace#${ctx.structures.length}`, defId: 'gate_terrace',
    rect, cellSize: CELL, roofs: [], roofStyle: 'stone',
    floors: [{ ...rect }], floorStyle: p.floorStyle ?? 'flagstone',
    courtyards: [], doors: [], slots: [],
  });
  ctx.mustReach = ctx.mustReach ?? [];
  ctx.mustReach.push(vec(mouth.x + inward.x * 150, mouth.y + inward.y * 150));
  return { rect, mouth, inward };
}

/** Raise a BOUNDARY GATE at a portal: the monumental face an ENCLAVE biome
 *  shows the world (data/boundaryGates.ts). A façade wall band pierced by one
 *  arched mouth on the portal's own axis, a walled THROAT you walk through —
 *  "entering the structure" as terrain — pylons bookending the face, cold
 *  lights on the lip, the enclave's toll dressed along the front. Runs for
 *  EVERY layout family (generateLayout raises it off def.exitBoundaries via
 *  the registered-builder seam), so it splices whatever scatter came before
 *  it out of its footprint, reserves it against whatever comes after, bakes
 *  its floor through the synthetic-structure record, and hands the invariant
 *  the ground past the throat (the carveGateTerrace discipline, faced the
 *  other way: the terrace descends OUT of a fortress; the gate walks IN). */
export function carveBoundaryGate(ctx: GenCtx, at: Vec2, gateId: string): void {
  const g = boundaryGateOf(gateId);
  if (!g) return;
  const grid = ensureGrid(ctx);
  const { arena, rng } = ctx;
  const CELL = 30;
  const q = (v: number): number => Math.round(v / CELL) * CELL;
  // The SHARED geometry (gateThroatAt): which wall the portal hugs, the
  // quantized footprint, the mouth and inner-opening centers — the World's
  // runtime (sealed bars, wardens) seats against these same numbers.
  const throat = gateThroatAt(arena, at, g);
  const ix = throat.inward.x, iy = throat.inward.y;
  const tx = throat.tangent.x, ty = throat.tangent.y;
  const { halfWidth: halfW, depth, mouthWidth: mouthW, rect } = throat;
  const wallRegion = g.wallRegion ?? 'rampart';
  // The gate arrives AFTER the base layout — splice whatever scatter/liquid
  // discs it would swallow (rim-aware, the causeway discipline).
  for (let k = ctx.doodads.length - 1; k >= 0; k--) {
    const d = ctx.doodads[k];
    if (d.pos.x > rect.x - d.radius && d.pos.x < rect.x + rect.w + d.radius
      && d.pos.y > rect.y - d.radius && d.pos.y < rect.y + rect.h + d.radius) {
      ctx.doodads.splice(k, 1);
    }
  }
  // Ground first (the whole footprint is walkable under the baked floor)...
  grid.fillRegion(rect.x, rect.y, rect.x + rect.w - 0.01, rect.y + rect.h - 0.01, 'ground');
  const wall = (wx: number, wy: number, ww: number, wh: number): void => {
    if (ww > 0.5 && wh > 0.5) grid.fillRegion(wx, wy, wx + ww - 0.01, wy + wh - 0.01, wallRegion);
  };
  // ...then the FAÇADE band across the portal line (mouth gap on the portal's
  // own tangent coordinate), then the THROAT's flank walls running inward.
  const mouthLo = ix !== 0 ? q(at.y - mouthW / 2) : q(at.x - mouthW / 2);
  let mouthC: Vec2;
  if (ix !== 0) {
    const fx = ix > 0 ? rect.x : rect.x + rect.w - CELL; // façade strip at the outer face
    wall(fx, rect.y, CELL, Math.max(0, mouthLo - rect.y));
    wall(fx, mouthLo + mouthW, CELL, Math.max(0, rect.y + rect.h - (mouthLo + mouthW)));
    const t0 = fx + (ix > 0 ? CELL : -depth + CELL);
    wall(t0, mouthLo - CELL, depth - CELL, CELL);
    wall(t0, mouthLo + mouthW, depth - CELL, CELL);
    mouthC = vec(fx + CELL / 2, mouthLo + mouthW / 2);
  } else {
    const fy = iy > 0 ? rect.y : rect.y + rect.h - CELL;
    wall(rect.x, fy, Math.max(0, mouthLo - rect.x), CELL);
    wall(mouthLo + mouthW, fy, Math.max(0, rect.x + rect.w - (mouthLo + mouthW)), CELL);
    const t0 = fy + (iy > 0 ? CELL : -depth + CELL);
    wall(mouthLo - CELL, t0, CELL, depth - CELL);
    wall(mouthLo + mouthW, t0, CELL, depth - CELL);
    mouthC = vec(mouthLo + mouthW / 2, fy + CELL / 2);
  }
  const inward = vec(ix, iy);
  // THE DRESSING — direct pushes (the geometry IS the placement): the arch
  // spanning the mouth, pylons bookending the face, lights on the throat's
  // lip, the enclave's toll along the outer front.
  if (g.archKind !== '') {
    ctx.doodads.push({
      pos: vec(mouthC.x + inward.x * (CELL * 0.6), mouthC.y + inward.y * (CELL * 0.6)),
      radius: mouthW * 0.55, kind: g.archKind ?? 'gate_arch',
      rot: Math.atan2(ty, tx),
    });
  }
  if (g.pylonKind) {
    for (const s of [-1, 1]) {
      ctx.doodads.push({
        pos: vec(mouthC.x + tx * s * (halfW - CELL * 1.4), mouthC.y + ty * s * (halfW - CELL * 1.4)),
        radius: 24, kind: g.pylonKind, rot: Math.atan2(ty, tx),
      });
    }
  }
  const brazierKind = g.brazierKind ?? 'brazier';
  if (brazierKind) {
    for (const s of [-1, 1]) {
      ctx.doodads.push({
        pos: vec(mouthC.x + inward.x * CELL * 1.6 + tx * s * (mouthW / 2 + 20),
          mouthC.y + inward.y * CELL * 1.6 + ty * s * (mouthW / 2 + 20)),
        radius: 10, kind: brazierKind,
      });
    }
  }
  for (const row of g.dress ?? []) {
    const rule = doodadRuleOf(row.kind);
    for (let i = 0, n = rng.int(row.count[0], row.count[1]); i < n; i++) {
      // Along the outer face, never in the mouth's lane. Draws happen BEFORE
      // the filters (findSpot discipline) so a rejected spot never shifts the
      // sequence of later pieces.
      const off = rng.range(-(halfW - 50), halfW - 50);
      const r = rng.range(11, 16);
      const rot = rng.range(0, Math.PI * 2);
      if (Math.abs(off) < mouthW / 2 + 40) continue;
      const p = vec(mouthC.x - inward.x * CELL * 1.6 + tx * off, mouthC.y - inward.y * CELL * 1.6 + ty * off);
      // The dress honors its kind's ground gates like every scatter path —
      // a banner never plants in the river it fronts (genqa's inverse
      // invariant holds for composable pushes too).
      if (rule.forbidOn && !areaFreeOf(ctx, p, r, rule.forbidOn)) continue;
      ctx.doodads.push({ pos: p, radius: r, kind: row.kind, rot });
    }
  }
  // The INNER dressing — the camp a KEPT gate lives around, spread past the
  // throat's inner opening where travelers are actually stopped (a warden's
  // fire, fodder, stacked wood — the toll-gate's lived-in read). Same
  // discipline as the outer dress: draws before filters, ground gates
  // honored, the lane's own width kept clear. Absent = zero draws.
  for (const row of g.dressInner ?? []) {
    const rule = doodadRuleOf(row.kind);
    for (let i = 0, n = rng.int(row.count[0], row.count[1]); i < n; i++) {
      const off = rng.range(-(halfW - 50), halfW - 50);
      const r = rng.range(11, 16);
      const rot = rng.range(0, Math.PI * 2);
      if (Math.abs(off) < mouthW / 2 + 40) continue;
      const p = vec(mouthC.x + inward.x * (depth + CELL) + tx * off,
        mouthC.y + inward.y * (depth + CELL) + ty * off);
      if (rule.forbidOn && !areaFreeOf(ctx, p, r, rule.forbidOn)) continue;
      ctx.doodads.push({ pos: p, radius: r, kind: row.kind, rot });
    }
  }
  // Bookkeeping — the carveGateTerrace discipline: reserve the footprint,
  // keep the walking lane open portal→throat→zone, bake the floor, and hand
  // the invariant the ground past the gate.
  ctx.reserved.push({ rect, margin: 10 });
  reserveArtery(ctx, [
    vec(at.x - inward.x * 40, at.y - inward.y * 40),
    vec(mouthC.x + inward.x * (depth + 120), mouthC.y + inward.y * (depth + 120)),
  ], Math.max(50, mouthW * 0.5));
  ctx.structures = ctx.structures ?? [];
  ctx.structures.push({
    id: `boundary_gate#${ctx.structures.length}`, defId: `boundary_gate:${gateId}`,
    rect, cellSize: CELL, roofs: [], roofStyle: 'stone',
    floors: [{ ...rect }], floorStyle: g.floorStyle ?? 'flagstone',
    courtyards: [], doors: [], slots: [],
  });
  ctx.mustReach = ctx.mustReach ?? [];
  ctx.mustReach.push(vec(mouthC.x + inward.x * (depth + 60), mouthC.y + inward.y * (depth + 60)));
}
// Register as THE boundary-gate builder (levelgen raises it per annotated exit).
setBoundaryGateBuilder(carveBoundaryGate);

/** Carve a TRAVELED WAY from a source portal to an exit — the forest game
 *  trail lifted into the per-exit annotation fabric (ZoneDef.exitRoads): a
 *  wandering polyline, reserved as an artery so nothing re-plugs it, chained
 *  'road' ground discs (path-mode blend + moveScale ride the kind), and a
 *  corridor CUT through walled layouts (the wardens cleared their road; a
 *  convex zone carves nothing — its ground is already open). GATE-AWARE: an
 *  exit that also wears a boundary gate (def.exitBoundaries, same index)
 *  receives the road at its throat's inner opening, so the way reads
 *  source portal → open country → the gate's mouth, never under its walls. */
export function carveApproachRoad(ctx: GenCtx, def: ZoneDef, exitIndex: number,
  spec: ExitRoadSpec): void {
  const target = ctx.exits[exitIndex];
  if (!target) return;
  const { rng, arena } = ctx;
  // Where the way ENDS: the gate's inner opening plus a step of clearance
  // (the camp ground), or the portal itself when no façade stands there.
  const gate = boundaryGateOf(def.exitBoundaries?.[exitIndex]);
  const throat = gate ? gateThroatAt(arena, target, gate) : null;
  const end = throat
    ? vec(throat.inner.x + throat.inward.x * 40, throat.inner.y + throat.inward.y * 40)
    : vec(target.x, target.y);
  // Where it SETS OUT: the entry anchor, or the nearest/farthest OTHER
  // portal — and a source sitting on the destination (the player arrived
  // THROUGH this exit; a portal pair hugging one corner) re-picks the
  // farthest distinct anchor so the way always spans real ground.
  const others = [ctx.entry, ...ctx.exits.filter((_, i) => i !== exitIndex)];
  const d2 = (p: Vec2): number => (p.x - end.x) * (p.x - end.x) + (p.y - end.y) * (p.y - end.y);
  const farthest = (): Vec2 => others.reduce((best, p) => (d2(p) > d2(best) ? p : best), others[0]);
  const mode = spec.from ?? 'entry';
  let from = mode === 'entry' ? ctx.entry
    : mode === 'nearest' ? others.reduce((best, p) => (d2(p) < d2(best) ? p : best), others[0])
      : farthest();
  if (Math.hypot(from.x - end.x, from.y - end.y) < 260) from = farthest();
  if (Math.hypot(from.x - end.x, from.y - end.y) < 260) return; // nothing distinct spans — no road
  // COHERENCE: no DEFAULT gravel way across an aquatic arena (the open
  // seabed) — an annotation that AUTHORS its kind (a sunken flagstone way,
  // a bone causeway) still passes, intent spelled out.
  if (ctx.aquatic && !spec.kind) return;
  const pts = wanderPath(rng, from, end, {
    step: spec.step ?? 120, wobble: spec.wobble ?? 55, bowFrac: spec.bowFrac ?? 0.3,
  });
  // Through a WALLED layout the road is CUT, not just worn: carve a corridor
  // along the way so the gravel always lies on open ground.
  if (ctx.walk instanceof GridWalkField) {
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.walk.carveCorridor(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 54);
    }
  }
  // Laid through THE way-layer: live discs reserve the artery, the zone's
  // overgrowth dial (or the spec's own override) may let the land swallow
  // stretches, and sweepClearways collects the right-of-way from whatever
  // scatter was already standing — the annotation may arrive AFTER the roof
  // was planted and still reads as a kept road, not paint under a canopy.
  layTraveledWay(ctx, pts, {
    band: spec.radius ?? [16, 22],
    kind: (spec.kind ?? 'road') as DoodadKind,
    overgrowth: overgrowthOf(def, spec.overgrowth),
    reserve: true,
  });
}
// Register as THE exit-road builder (levelgen lays it per annotated exit).
setExitRoadBuilder(carveApproachRoad);

/** Grow a BIOME MELD — the NEIGHBOR biome's kit growing across this zone's
 *  edge (ZoneDef.exitMelds, the third rider on the per-exit annotation
 *  fabric): the registered meld's rows are stamped through the ordinary
 *  machinery under an edge WHERE band (axisX/axisY), so every placement
 *  gate — walk-gating, forbidOn, reservations, spacing, the portal splice —
 *  applies as if the tileset had authored them. The rows draw from a
 *  DEDICATED rng (zone seed ^ exit index): a '?' frontier later resolving to
 *  a different biome re-dresses the band WITHOUT shifting the zone's own
 *  layout stream (zone memory replays clean). */
export function buildBiomeMeld(ctx: GenCtx, def: ZoneDef, exitIndex: number,
  meldId: string): void {
  const meld = meldOf(meldId);
  const target = ctx.exits[exitIndex];
  if (!meld || !target) return;
  const { arena } = ctx;
  // Which edge does this exit sit on? The nearest arena side — the same
  // resolution the throat geometry uses for its inward cardinal.
  const dists: [number, 'w' | 'e' | 'n' | 's'][] = [
    [target.x, 'w'], [arena.w - target.x, 'e'], [target.y, 'n'], [arena.h - target.y, 's'],
  ];
  dists.sort((a, b) => a[0] - b[0]);
  const side = dists[0][1];
  const band = meld.band ?? MELD_CFG.band;
  const where = side === 'w' ? { field: 'axisX', max: band / Math.max(1, arena.w) }
    : side === 'e' ? { field: 'axisX', min: 1 - band / Math.max(1, arena.w) }
      : side === 'n' ? { field: 'axisY', max: band / Math.max(1, arena.h) }
        : { field: 'axisY', min: 1 - band / Math.max(1, arena.h) };
  const saved = ctx.rng;
  ctx.rng = new Rng((((def.seed ?? 1) ^ (0x6d31 + exitIndex * 0x9e37)) >>> 0) || 1);
  try {
    for (const row of meld.rows) {
      const n = ctx.rng.int(row.count[0], row.count[1]);
      for (let i = 0; i < n; i++) {
        stamp(ctx, { kind: row.kind, count: [1, 1], radius: row.radius, where });
      }
    }
  } finally {
    ctx.rng = saved;
  }
}
// Register as THE biome-meld builder (levelgen grows it per annotated exit).
setMeldBuilder(buildBiomeMeld);

function steppesLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  // 1) The gate terrace (chance-gated; draws only when configured).
  const gt = layoutParam<GateTerraceParams | undefined>(def, 'gateTerrace', undefined);
  let terrace: GateTerrace | null = null;
  if (gt && rng.chance(gt.chance ?? 1)) terrace = carveGateTerrace(ctx, ctx.entry, gt);

  // 2) RUINED WALL RUNS: angular polylines (cardinal headings, right-angle
  // turns, a breath of wobble) painted as true-wall bands — hell's abandoned
  // fortification lines. 'wander' style trades the corners for winding ridges.
  const runsBand = layoutParam(def, 'ridges', [3, 5]) as [number, number];
  const widthBand = layoutParam(def, 'ridgeWidth', [16, 26]) as [number, number];
  const gapChance = layoutParam(def, 'ridgeGapChance', 0.55);
  const angular = layoutParam(def, 'ridgeStyle', 'angular') === 'angular';
  const region = layoutParam(def, 'ridgeRegion', 'wall');
  const walls = Mask.forRect(0, 0, arena.w, arena.h);
  const openings = walls.like();
  const portals = [ctx.entry, ...ctx.exits];
  for (let i = 0, n = rng.int(runsBand[0], runsBand[1]); i < n; i++) {
    let start: Vec2 | null = null;
    for (let t = 0; t < 14 && !start; t++) {
      const c = vec(rng.range(arena.w * 0.15, arena.w * 0.85), rng.range(arena.h * 0.15, arena.h * 0.85));
      if (portals.some(p => Math.hypot(p.x - c.x, p.y - c.y) < 320)) continue;
      if (terrace && c.x > terrace.rect.x - 140 && c.x < terrace.rect.x + terrace.rect.w + 140
        && c.y > terrace.rect.y - 140 && c.y < terrace.rect.y + terrace.rect.h + 140) continue;
      start = c;
    }
    if (!start) continue;
    const pts: Vec2[] = [start];
    let heading = rng.int(0, 3) * (Math.PI / 2);
    for (let s = 0, segs = rng.int(2, 4); s < segs; s++) {
      if (s > 0 && rng.chance(0.8)) heading += (rng.chance(0.5) ? 1 : -1) * (Math.PI / 2);
      const a = heading + (angular ? rng.range(-0.09, 0.09) : rng.range(-0.55, 0.55));
      const len = rng.range(240, 520);
      const prev = pts[pts.length - 1];
      pts.push(vec(
        Math.max(120, Math.min(arena.w - 120, prev.x + Math.cos(a) * len)),
        Math.max(120, Math.min(arena.h - 120, prev.y + Math.sin(a) * len))));
    }
    band(walls, pts, rng.range(widthBand[0], widthBand[1]));
    // A breach somewhere along the run — these are ruins, not fortifications.
    if (rng.chance(gapChance)) {
      const k = rng.int(0, pts.length - 2);
      const t = rng.range(0.3, 0.7);
      disc(openings, pts[k].x + (pts[k + 1].x - pts[k].x) * t,
        pts[k].y + (pts[k + 1].y - pts[k].y) * t, rng.range(42, 64));
    }
  }
  // Mouths breathe; the terrace and its landing lane keep their own geometry.
  for (const p of portals) disc(openings, p.x, p.y, 160);
  if (terrace) {
    rectInto(openings, terrace.rect, 70);
    for (let s = 0; s <= 320; s += 40) {
      disc(openings, terrace.mouth.x + terrace.inward.x * s,
        terrace.mouth.y + terrace.inward.y * s, 84);
    }
  }
  walls.subtract(openings);
  paintRegion(grid, walls, region);

  // 3) The tileset's dressing — solids walk-gate into the open ground, and the
  // zone's landmark rolls (abyssal maws, demon pits) follow in generateLayout.
  scatterDecoration(ctx, def);
}
registerLayout('steppes', steppesLayout);

// --- DUNEFIELD (the Great Erg) ----------------------------------------------------
// The desert's signature topology: long crescent RIDGES marching across one
// seeded PREVAILING WIND — bodies detour while shots and sight sail over (the
// duneface region is sand's parapet), slipface BREACHES are the passes, the
// loose LEE of every ridge wades slow (softsand), and wind-rammed HARDPAN
// lanes run the grain of the land like roads nobody built. Every dial is a
// layoutParam so the desert's faces (waste/erg/glasspan) tune ONE recipe:
//   duneGap            spacing between ridge rails along the wind
//   duneCrestW         painted crest half-width band
//   duneWobble/duneBow ridge wander + barchan bowing
//   duneBreachEvery/R  slip-pass cadence + mouth radius
//   duneLee            softsand reach shed downwind of each crest
//   dunePans           hardpan lane count band
//   duneCombEvery      crest-comb doodad cadence (0 = no comb art)
// Reachability is guaranteed twice: breaches every few hundred px per rail,
// then a reachable()-checked corridor per exit (the field recipe's lesson).
function dunefieldLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  // ONE prevailing wind per zone: every ridge, lee, pan and comb agrees.
  const wind = rng.int(0, 7) * (Math.PI / 4) + rng.range(-0.16, 0.16);
  const across = wind + Math.PI / 2;
  const dirX = Math.cos(wind), dirY = Math.sin(wind);
  const acX = Math.cos(across), acY = Math.sin(across);
  const cx = arena.w / 2, cy = arena.h / 2;
  const diag = Math.hypot(arena.w, arena.h);

  const gapBand = layoutParam(def, 'duneGap', [300, 440]) as [number, number];
  const crestWBand = layoutParam(def, 'duneCrestW', [22, 36]) as [number, number];
  const wobble = layoutParam(def, 'duneWobble', 46);
  const bow = layoutParam(def, 'duneBow', 0.2);
  const breachEvery = layoutParam(def, 'duneBreachEvery', [380, 620]) as [number, number];
  const breachR = layoutParam(def, 'duneBreachR', [46, 68]) as [number, number];
  const leeReach = layoutParam(def, 'duneLee', 46);
  const panBand = layoutParam(def, 'dunePans', [1, 2]) as [number, number];
  const combEvery = layoutParam(def, 'duneCombEvery', 72);

  const crests = Mask.forRect(0, 0, arena.w, arena.h);
  const lee = crests.like();
  const pans = crests.like();
  const openings = crests.like();
  const portals = [ctx.entry, ...ctx.exits];

  // HARDPAN lanes first — they breach whatever ridge they cross.
  for (let i = 0, n = rng.int(panBand[0], panBand[1]); i < n; i++) {
    const off = rng.range(-0.3, 0.3) * diag;
    const drift = rng.range(-260, 260);
    const from = vec(cx - dirX * diag * 0.6 + acX * off, cy - dirY * diag * 0.6 + acY * off);
    const to = vec(cx + dirX * diag * 0.6 + acX * (off + drift), cy + dirY * diag * 0.6 + acY * (off + drift));
    band(pans, wanderPath(rng, from, to, { step: 190, wobble: 60, bowFrac: 0.16 }), rng.range(26, 40));
  }

  // RIDGE RAILS: ridgelines march ACROSS the wind, spaced down its length.
  const rails: Vec2[][] = [];
  let at = -diag / 2 + rng.range(120, gapBand[0]);
  while (at < diag / 2 - 140) {
    const rcx = cx + dirX * at, rcy = cy + dirY * at;
    const from = vec(rcx - acX * diag * 0.62, rcy - acY * diag * 0.62);
    const to = vec(rcx + acX * diag * 0.62, rcy + acY * diag * 0.62);
    const pts = wanderPath(rng, from, to, { step: 160, wobble, bowFrac: bow });
    rails.push(pts);
    const w = rng.range(crestWBand[0], crestWBand[1]);
    band(crests, pts, w);
    // The LEE: the same line shed downwind — the slog behind every crest.
    band(lee, pts.map(p => vec(p.x + dirX * (w + leeReach * 0.8), p.y + dirY * (w + leeReach * 0.8))), leeReach);
    // SLIPFACE BREACHES: passes opened along the ridge on a seeded cadence.
    let walked = 0;
    let next = rng.range(breachEvery[0], breachEvery[1]) * rng.range(0.35, 0.7);
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      while (walked + seg >= next) {
        const t = (next - walked) / seg;
        const bx = a.x + (b.x - a.x) * t, by = a.y + (b.y - a.y) * t;
        if (bx > 70 && by > 70 && bx < arena.w - 70 && by < arena.h - 70) {
          disc(openings, bx, by, rng.range(breachR[0], breachR[1]));
          // A few passes become POIs: patrols and quests find the throats.
          if (ctx.pois.length < 8 && rng.chance(0.3)) ctx.pois.push(vec(bx, by));
        }
        next += rng.range(breachEvery[0], breachEvery[1]);
      }
      walked += seg;
    }
    at += rng.range(gapBand[0], gapBand[1]);
  }

  // Mouths and earlier reservations always breathe (composition courts, sites).
  for (const p of portals) disc(openings, p.x, p.y, 170);
  for (const r of ctx.reserved) {
    if ('pos' in r) disc(openings, r.pos.x, r.pos.y, r.radius + 24);
    else disc(openings, r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2,
      Math.hypot(r.rect.w, r.rect.h) / 2 + (r.margin ?? 0) + 24);
  }

  crests.subtract(pans).subtract(openings);
  lee.subtract(crests).subtract(pans);
  paintRegion(grid, pans, 'hardpan');
  paintRegion(grid, lee, 'softsand');
  paintRegion(grid, crests, 'duneface');

  // Belt-and-suspenders: every exit stays walkable from the entry, whatever
  // the ridge dice rolled (the field recipe's guarantee).
  for (const e of ctx.exits) {
    if (!grid.reachable(ctx.entry, e)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, e.x, e.y, 30);
  }

  // THE CREST COMB — ridge art laid along the painted rails (inert; the
  // region is the collision truth). Skipped under LITE, skippable by data.
  if (!ctx.lite && combEvery > 0) {
    for (const pts of rails) {
      let walked = 0, next = combEvery * 0.5;
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        const t0 = Math.atan2(b.y - a.y, b.x - a.x);
        // Local +y must fall DOWNWIND so the painter's lee shadow lands true.
        const rot = Math.sin(wind - t0) < 0 ? t0 + Math.PI : t0;
        while (walked + seg >= next) {
          const t = (next - walked) / seg;
          const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
          next += combEvery * rng.range(0.82, 1.24);
          if (px < 60 || py < 60 || px > arena.w - 60 || py > arena.h - 60) continue;
          if (openings.has(px, py) || pans.has(px, py)) continue;
          ctx.doodads.push({
            pos: vec(px, py), radius: rng.range(38, 56),
            kind: 'dune_crest', rot: rot + rng.range(-0.12, 0.12),
          });
        }
        walked += seg;
      }
    }
  }

  // The tileset's own dressing pools into the troughs (self-gates under lite).
  scatterDecoration(ctx, def);
}
registerLayout('dunefield', dunefieldLayout);

// --- COLOSSEUM (the grand arena) --------------------------------------------------
// Daresso's bones: a bright SAND PIT under open sky, ringed by a thick STAND
// the crowd fills (spectator rows facing the fight), gate mouths breaching it
// where the portals stem in, banners and braziers on the pit rim. Beyond the
// stands: the outer works (solid negative). Everything a knob: layoutParams
// {pitFracX/Y, standWidth, mouthWidth, crowdKind, crowdStep, crowdRows,
// rimBanners} — and the crowd kind is data, so any event can seat its own.
function colosseumLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const cx = arena.w / 2, cy = arena.h / 2;
  const rx = arena.w * layoutParam(def, 'pitFracX', 0.3);
  const ry = arena.h * layoutParam(def, 'pitFracY', 0.3);
  const standW = layoutParam(def, 'standWidth', 130);
  const mouthHalf = layoutParam(def, 'mouthWidth', 88) / 2;

  // Outside the outer works: solid dark.
  const neg = Mask.forRect(0, 0, arena.w, arena.h);
  neg.invert();
  paintRegion(grid, neg, negativeRegion(def));

  // A point on the pit-rim ellipse toward `p` (the stems aim here, the crowd
  // seats ride scaled copies of the same parametric ring).
  const rimToward = (p: Vec2): Vec2 => {
    const a = Math.atan2((p.y - cy) / Math.max(1, ry), (p.x - cx) / Math.max(1, rx));
    return vec(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  };

  // THE STANDS: an elliptical annulus of wall, breached by a mouth at every
  // portal stem (subtract, then paint — the steppes' openings discipline).
  const stands = Mask.forRect(0, 0, arena.w, arena.h);
  ellipseDisc(stands, cx, cy, rx + standW, ry + standW);
  const pit = Mask.forRect(0, 0, arena.w, arena.h);
  ellipseDisc(pit, cx, cy, rx, ry);
  const mouths = Mask.forRect(0, 0, arena.w, arena.h);
  const stemAngles: number[] = [];
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const rim = rimToward(pt);
    stemAngles.push(Math.atan2(rim.y - cy, rim.x - cx));
    const stem = wanderPath(rng, pt, rim, { step: 80, wobble: 8 });
    band(mouths, stem, mouthHalf);
    disc(mouths, pt.x, pt.y, 96);
    reserveArtery(ctx, stem, mouthHalf);
  }
  stands.subtract(pit);
  stands.subtract(mouths);
  paintRegion(grid, stands, 'wall');
  // Paint the WALKABLE back over the negative (paint-over order is the
  // recipe discipline): the pit floor, then every mouth stem + portal pocket.
  paintRegion(grid, pit, 'ground');
  paintRegion(grid, mouths, 'ground');
  ctx.pois.push(vec(cx, cy));
  // Keep the fight floor swept: the pit reserves against scatter (the rim
  // dressing below is deliberate; a reservation is how a clearing promises).
  reserveArtery(ctx, [vec(cx - rx * 0.5, cy), vec(cx + rx * 0.5, cy)], Math.min(rx, ry) * 0.62);

  // THE CROWD: seated rows along the stand, facing the pit (rot → center),
  // skipping the mouths. Two tiers by default; all data.
  const crowdKind = layoutParam(def, 'crowdKind', 'crowd_row');
  const crowdRows = layoutParam(def, 'crowdRows', 2);
  const crowdStep = layoutParam(def, 'crowdStep', 58);
  for (let row = 0; row < crowdRows; row++) {
    const f = (row + 0.62) / (crowdRows + 0.55); // seat depth within the stand
    const crx = rx + standW * f, cry = ry + standW * f;
    const circumference = Math.PI * (3 * (crx + cry) - Math.sqrt((3 * crx + cry) * (crx + 3 * cry)));
    const n = Math.max(8, Math.round(circumference / crowdStep));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + row * 0.5 * (crowdStep / crx);
      if (stemAngles.some(s => {
        let d = Math.abs(a - s) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        return d < (mouthHalf + 34) / Math.min(crx, cry);
      })) continue;
      const p = vec(cx + Math.cos(a) * crx, cy + Math.sin(a) * cry);
      // Face the pit: the row looks INWARD (its painter fans heads along rot's
      // perpendicular, bobbing toward the fight).
      ctx.doodads.push({ pos: p, radius: 24, kind: crowdKind, rot: a + Math.PI });
    }
  }

  // The pit rim's dressing: standards + braziers pacing the rail (skip mouths).
  const rimBanners = layoutParam(def, 'rimBanners', 8);
  for (let i = 0; i < rimBanners; i++) {
    const a = (i / rimBanners) * Math.PI * 2 + 0.18;
    if (stemAngles.some(s => {
      let d = Math.abs(a - s) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < (mouthHalf + 40) / Math.min(rx, ry);
    })) continue;
    const p = vec(cx + Math.cos(a) * (rx - 26), cy + Math.sin(a) * (ry - 26));
    ctx.doodads.push({ pos: p, radius: 10, kind: i % 2 === 0 ? 'banner_post' : 'brazier', rot: a });
  }

  // The tileset's dressing (kept sparse — the arena IS the set-piece).
  scatterDecoration(ctx, def);
}
registerLayout('colosseum', colosseumLayout);

// --- AETHER LATTICE (the cloud shelves above the world) -------------------------
// A drift of cloud ISLES over open sky, joined by winding causeways — the
// negative space is `skyRegion` (cloud_void by default: a WINDOW down onto
// whatever the understory shows, never a black wall), and big isles are
// punched with smaller sky-holes so the whole shelf reads as torn lace.
// The far end raises the ASCENDANT GATE on its own reserved landing — the
// realm-gate doodad the dwell loop consults, the never-melting platform the
// collapse fabric's spine runs to (CollapseSpec.goal names it). mustReach
// makes the generation invariant own the promise the collapse relies on.
// All knobs are layoutParams: the sanctum face runs the same recipe dense
// and unbroken; a frontier shelf runs it airy and riddled.
function aetherLatticeLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  // The open sky first: everything is a window down.
  const all = Mask.forRect(0, 0, arena.w, arena.h);
  all.invert();
  paintRegion(grid, all, layoutParam(def, 'skyRegion', 'cloud_void'));

  const carve = Mask.forRect(0, 0, arena.w, arena.h);
  const M = 100;
  const isleR = layoutParam(def, 'isleRadius', [140, 250]) as [number, number];
  const isleN = layoutParam(def, 'isles', [6, 9]) as [number, number];
  const isles: Vec2[] = [];
  for (let i = 0, n = rng.int(isleN[0], isleN[1]); i < n; i++) {
    const r = rng.range(isleR[0], isleR[1]);
    const cx = rng.range(M + r * 0.6, Math.max(M + r * 0.6, arena.w - M - r * 0.6));
    const cy = rng.range(M + r * 0.6, Math.max(M + r * 0.6, arena.h - M - r * 0.6));
    // Lobed, not round: 2-3 overlapping discs per isle so coasts read torn.
    disc(carve, cx, cy, r);
    for (let l = 0, ln = rng.int(1, 2); l < ln; l++) {
      const a = rng.range(0, Math.PI * 2);
      disc(carve, cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * rng.range(0.45, 0.7));
    }
    isles.push(vec(cx, cy));
  }
  // Portal isles: the entry + every exit stands on its own cloud.
  for (const pt of [ctx.entry, ...ctx.exits]) {
    disc(carve, pt.x, pt.y, 130);
    isles.push(vec(pt.x, pt.y));
  }
  // THE GATE LANDING: the far end of the crossing — the isle farthest from
  // the entry, given a clean reserved platform of its own.
  let gate = isles[0];
  let bd = -1;
  for (const p of isles) {
    const d = (p.x - ctx.entry.x) ** 2 + (p.y - ctx.entry.y) ** 2;
    if (d > bd) { bd = d; gate = p; }
  }
  disc(carve, gate.x, gate.y, 150);

  // CAUSEWAYS: chain every isle to its nearest already-linked neighbour
  // (one connected drift), then a couple of long loops so the lattice has
  // more than one answer. Reserved — scatter can never plug the crossing.
  const cwW = layoutParam(def, 'causewayWidth', [46, 66]) as [number, number];
  const linked: Vec2[] = [isles[isles.length - 1]];
  const pending = isles.slice(0, -1);
  while (pending.length) {
    let bi = 0, bj = 0, best = Infinity;
    for (let i = 0; i < pending.length; i++) {
      for (let j = 0; j < linked.length; j++) {
        const d = (pending[i].x - linked[j].x) ** 2 + (pending[i].y - linked[j].y) ** 2;
        if (d < best) { best = d; bi = i; bj = j; }
      }
    }
    const from = linked[bj], to = pending.splice(bi, 1)[0];
    const pts = wanderPath(rng, from, to, { step: 110, wobble: 46, bowFrac: 0.22 });
    const halfW = rng.range(cwW[0], cwW[1]) / 2;
    band(carve, pts, halfW);
    reserveArtery(ctx, pts, halfW);
    linked.push(to);
  }
  for (let i = 0, n = rng.int(1, 3); i < n && isles.length > 2; i++) {
    const a = rng.pick(isles), b = rng.pick(isles);
    if (a === b) continue;
    band(carve, wanderPath(rng, a, b, { step: 120, wobble: 60, bowFrac: 0.3 }), rng.range(20, 30));
  }
  paintRegion(grid, carve, 'ground');

  // SKY-HOLES: punch the lace — small windows down through the big isles,
  // kept clear of portals and the gate landing (a hole under a portal is a
  // trap, not a view). The sanctum face sets holes: [0, 0].
  const holeN = layoutParam(def, 'holes', [7, 12]) as [number, number];
  const holes = Mask.forRect(0, 0, arena.w, arena.h);
  const keepClear = [...isles.slice(-1 - ctx.exits.length), gate, ctx.entry, ...ctx.exits];
  for (let i = 0, n = rng.int(holeN[0], holeN[1]); i < n; i++) {
    const at = rng.pick(isles);
    const hx = at.x + rng.range(-120, 120), hy = at.y + rng.range(-120, 120);
    const hr = rng.range(28, 64);
    if (keepClear.some(p => (p.x - hx) ** 2 + (p.y - hy) ** 2 < (hr + 150) ** 2)) continue;
    disc(holes, hx, hy, hr);
  }
  paintRegion(grid, holes, layoutParam(def, 'skyRegion', 'cloud_void'));

  // The gate itself: the crossing's whole point. POI + mustReach — the
  // reachability invariant now owns the promise the collapse spine keeps.
  ctx.doodads.push({ pos: vec(gate.x, gate.y), radius: 26, kind: 'ascendant_gate' });
  ctx.pois.push(vec(gate.x, gate.y));
  (ctx.mustReach ??= []).push(vec(gate.x, gate.y));
  ctx.reserved.push({ pos: vec(gate.x, gate.y), radius: 120 });

  // The tileset's dressing scatters walk-gated over the standing cloud.
  scatterDecoration(ctx, def);
}
registerLayout('aether_lattice', aetherLatticeLayout);

// --- AETHER SPIRES (the High Heavens) --------------------------------------------
// Great BASES of cloudscape crowned with AUREATE COURTS — pale marble floors,
// tiered spires, statue rings, braziers — joined by narrow, ephemeral SPANS.
// The architecture is FOREVER: courts, portals and stable decks never melt.
// The frailty lives at the edges of things: every base wears a FRAYING RIM of
// cloud_frail, and each bridge ROLLS stable or frail — the shimmering wash IS
// the warning (CollapseSpec.melts names cloud_frail alone, so a fight on a
// frail span drops the span, never the court). D3's High Heavens, walked.
// Knobs are layoutParams: bases, baseRadius, courtFrac, frailRim,
// bridgeFrailChance, spans width.
function aetherSpiresLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const all = Mask.forRect(0, 0, arena.w, arena.h);
  all.invert();
  paintRegion(grid, all, layoutParam(def, 'skyRegion', 'cloud_void'));

  const M = 120;
  const baseR = layoutParam(def, 'baseRadius', [210, 300]) as [number, number];
  const baseN = layoutParam(def, 'bases', [4, 6]) as [number, number];
  const frailRim = layoutParam(def, 'frailRim', 0.22) as number; // rim share that frays
  interface Base { x: number; y: number; r: number; court: boolean }
  const bases: Base[] = [];
  for (let i = 0, n = rng.int(baseN[0], baseN[1]); i < n; i++) {
    const r = rng.range(baseR[0], baseR[1]);
    const cx = rng.range(M + r * 0.7, Math.max(M + r * 0.7, arena.w - M - r * 0.7));
    const cy = rng.range(M + r * 0.7, Math.max(M + r * 0.7, arena.h - M - r * 0.7));
    bases.push({ x: cx, y: cy, r, court: false });
  }
  // Portal footings: the entry + every exit stands on its own small STABLE deck.
  for (const pt of [ctx.entry, ...ctx.exits]) bases.push({ x: pt.x, y: pt.y, r: 135, court: false });

  // Paint each base: a frail SKIRT first, the stable deck over its heart —
  // so the rim (and only the rim) may let go. Lobes keep coasts torn.
  const frail = Mask.forRect(0, 0, arena.w, arena.h);
  const deck = Mask.forRect(0, 0, arena.w, arena.h);
  for (const b of bases) {
    disc(frail, b.x, b.y, b.r);
    disc(deck, b.x, b.y, b.r * (1 - frailRim));
    for (let l = 0, ln = rng.int(1, 2); l < ln; l++) {
      const a = rng.range(0, Math.PI * 2);
      const lr = b.r * rng.range(0.4, 0.6);
      const lx = b.x + Math.cos(a) * b.r * 0.6, ly = b.y + Math.sin(a) * b.r * 0.6;
      disc(frail, lx, ly, lr);
      disc(deck, lx, ly, lr * (1 - frailRim));
    }
  }

  // THE SPANS: chain every base to its nearest linked neighbour, then a loop
  // or two. Each span ROLLS its footing — stable stone-cloud, or the
  // ephemeral frail ribbon that shimmers and lets go. Straight and built
  // (low wobble): these are BRIDGES, not game trails. All reserved.
  // WIDTH FLOOR: band() marks cells whose CENTER falls inside halfW — under
  // ~GEN_CELL*0.75 a span rasterizes as broken dashes (the genqa
  // unreachable-exit lesson), so the narrowest honest bridge is ~46 wide.
  const spanW = layoutParam(def, 'spans', [46, 58]) as [number, number];
  const frailChance = layoutParam(def, 'bridgeFrailChance', 0.45) as number;
  const linked: Base[] = [bases[bases.length - 1]];
  const pending = bases.slice(0, -1);
  const bridge = (a: Base, b: Base): void => {
    const pts = wanderPath(rng, { x: a.x, y: a.y }, { x: b.x, y: b.y }, { step: 150, wobble: 20, bowFrac: 0.1 });
    const halfW = rng.range(spanW[0], spanW[1]) / 2;
    band(rng.chance(frailChance) ? frail : deck, pts, halfW);
    reserveArtery(ctx, pts, halfW);
    // Gateposts: braziers FLANKING each span mouth (perpendicular offset —
    // never in the throat: a lamp that seals its own bridge lights nothing).
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    for (const end of [a, b]) {
      const out = end === a ? ang : ang + Math.PI;
      const mx = end.x + Math.cos(out) * (end.r * 0.6);
      const my = end.y + Math.sin(out) * (end.r * 0.6);
      for (const s of [-1, 1]) {
        ctx.doodads.push({
          pos: vec(mx + Math.cos(out + Math.PI / 2) * s * (halfW + 16),
            my + Math.sin(out + Math.PI / 2) * s * (halfW + 16)),
          radius: rng.range(9, 11), kind: 'aureate_brazier',
        });
      }
    }
  };
  while (pending.length) {
    let bi = 0, bj = 0, best = Infinity;
    for (let i = 0; i < pending.length; i++) {
      for (let j = 0; j < linked.length; j++) {
        const d = (pending[i].x - linked[j].x) ** 2 + (pending[i].y - linked[j].y) ** 2;
        if (d < best) { best = d; bi = i; bj = j; }
      }
    }
    const to = pending.splice(bi, 1)[0];
    bridge(linked[bj], to);
    linked.push(to);
  }
  for (let i = 0, n = rng.int(1, 2); i < n && bases.length > 3; i++) {
    const a = rng.pick(bases), b = rng.pick(bases);
    if (a !== b) bridge(a, b);
  }

  // Lay the ground: frail skirt UNDER, stable deck OVER (paint order is the
  // guarantee — decks and courts always win where they overlap the fray).
  paintRegion(grid, frail, 'cloud_frail');
  paintRegion(grid, deck, 'ground');

  // THE COURTS: the largest bases raise architecture — a marble floor, the
  // tiered spire (or a statue court on lesser ones), braziers at the rim.
  const courts = [...bases].filter(b => b.r > 170).sort((a, b) => b.r - a.r)
    .slice(0, rng.int(2, 3));
  const court = Mask.forRect(0, 0, arena.w, arena.h);
  courts.forEach((b, i) => {
    b.court = true;
    disc(court, b.x, b.y, b.r * 0.52);
    ctx.pois.push(vec(b.x, b.y));
    ctx.reserved.push({ pos: vec(b.x, b.y), radius: 60 });
    if (i === 0) {
      // The grandest court holds the Spire of Dawn itself.
      ctx.doodads.push({ pos: vec(b.x, b.y), radius: rng.range(28, 36), kind: 'spire_of_dawn' });
      (ctx.mustReach ??= []).push(vec(b.x, b.y));
    } else {
      // Lesser courts: a bowed ring of the Host's marble.
      const n = rng.int(4, 6);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rng.range(0, 0.5);
        ctx.doodads.push({
          pos: vec(b.x + Math.cos(a) * b.r * 0.34, b.y + Math.sin(a) * b.r * 0.34),
          radius: rng.range(16, 22), kind: 'seraph_statue', rot: a + Math.PI,
        });
      }
    }
    // Court rim: braziers pacing the marble's edge.
    const braziers = rng.int(3, 5);
    for (let k = 0; k < braziers; k++) {
      const a = (k / braziers) * Math.PI * 2 + 0.4;
      ctx.doodads.push({
        pos: vec(b.x + Math.cos(a) * b.r * 0.5, b.y + Math.sin(a) * b.r * 0.5),
        radius: rng.range(9, 12), kind: 'aureate_brazier',
      });
    }
  });
  paintRegion(grid, court, 'aureate_court');

  // The tileset's dressing scatters walk-gated over deck and fray alike.
  scatterDecoration(ctx, def);
}
registerLayout('aether_spires', aetherSpiresLayout);

// --- AETHER DRIFT (the Driftways) -------------------------------------------
// The Aetherial's WIND COUNTRY: anchor isles of standing cloud strung across
// open sky, joined not by causeways but by the DRIFT — stepping-stone chains
// of phasing pads and long carrier lanes, all of it painted region kinds the
// flux fabric (engine/flux.ts) wakes at runtime. The platformer's promise as
// generation: every crossing is walkable AT GENERATION TIME (the
// reachability invariant and genqa prove the whole route), and honest at
// RUNTIME (the fabric makes exactly that ground come and go).
//
// THE ALTERNATOR IDIOM: pad chains interleave cloud_flux / cloud_flux_b so
// consecutive stepping stones TOUCH (contiguity for generation) yet remain
// SEPARATE platforms (flux components split per kind — each phases alone).
// Adaptive stepping guarantees each overlap is at least a rasterized cell
// wide (the band() width-floor lesson, applied to lenses).
//
// Knobs are layoutParams: isles, isleRadius, basinHalf, padR, padOverlap,
// satelliteEvery, laneHalf, loops.
function aetherDriftLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  // The open sky first (the lipped OUTER void — flux basins repaint their
  // own lip-less sky under every crossing).
  const all = Mask.forRect(0, 0, arena.w, arena.h);
  all.invert();
  paintRegion(grid, all, layoutParam(def, 'skyRegion', 'cloud_void'));

  const M = 120;
  const isleR = layoutParam(def, 'isleRadius', [130, 190]) as [number, number];
  const isleN = layoutParam(def, 'isles', [4, 6]) as [number, number];
  interface Isle { x: number; y: number; r: number; anchor: boolean }
  const isles: Isle[] = [];
  for (let i = 0, n = rng.int(isleN[0], isleN[1]); i < n; i++) {
    const r = rng.range(isleR[0], isleR[1]);
    isles.push({
      x: rng.range(M + r * 0.7, Math.max(M + r * 0.7, arena.w - M - r * 0.7)),
      y: rng.range(M + r * 0.7, Math.max(M + r * 0.7, arena.h - M - r * 0.7)),
      r, anchor: false,
    });
  }
  // THE MONUMENT ISLE: the farthest true isle raises the Spire of Gales —
  // picked before the portal footings join so it stands in country, not on
  // a doorstep.
  let monument = isles[0];
  let bd = -1;
  for (const p of isles) {
    const d = (p.x - ctx.entry.x) ** 2 + (p.y - ctx.entry.y) ** 2;
    if (d > bd) { bd = d; monument = p; }
  }
  // Portal footings: the entry + every exit stands on its own standing cloud.
  for (const pt of [ctx.entry, ...ctx.exits]) isles.push({ x: pt.x, y: pt.y, r: 125, anchor: true });

  // Paint the isles (lobed coasts, the lattice's read).
  const carve = Mask.forRect(0, 0, arena.w, arena.h);
  for (const b of isles) {
    disc(carve, b.x, b.y, b.r);
    for (let l = 0, ln = rng.int(1, 2); l < ln; l++) {
      const a = rng.range(0, Math.PI * 2);
      disc(carve, b.x + Math.cos(a) * b.r * 0.55, b.y + Math.sin(a) * b.r * 0.55, b.r * rng.range(0.4, 0.6));
    }
  }

  // --- THE CROSSINGS: chain every isle to its nearest linked neighbour, ----
  // then a loop or two. Each link rolls PAD CHAIN or CARRIER LANE — and the
  // zone always carries both moods: the longest link is forced a lane, the
  // shortest a chain.
  const basinHalfP = layoutParam(def, 'basinHalf', [100, 135]) as [number, number];
  const padRP = layoutParam(def, 'padR', [44, 58]) as [number, number];
  const padOverlapP = layoutParam(def, 'padOverlap', [26, 38]) as [number, number];
  const satEvery = layoutParam(def, 'satelliteEvery', 3) as number;
  const laneHalfP = layoutParam(def, 'laneHalf', [26, 31]) as [number, number];
  const basin = Mask.forRect(0, 0, arena.w, arena.h);
  const laneM = Mask.forRect(0, 0, arena.w, arena.h);
  const padA = Mask.forRect(0, 0, arena.w, arena.h);
  const padB = Mask.forRect(0, 0, arena.w, arena.h);
  const padC = Mask.forRect(0, 0, arena.w, arena.h); // satellites only

  interface Link { a: Isle; b: Isle; len: number }
  const links: Link[] = [];
  const linked: Isle[] = [isles[isles.length - 1]];
  const pending = isles.slice(0, -1);
  while (pending.length) {
    let bi = 0, bj = 0, best = Infinity;
    for (let i = 0; i < pending.length; i++) {
      for (let j = 0; j < linked.length; j++) {
        const d = (pending[i].x - linked[j].x) ** 2 + (pending[i].y - linked[j].y) ** 2;
        if (d < best) { best = d; bi = i; bj = j; }
      }
    }
    const to = pending.splice(bi, 1)[0];
    links.push({ a: linked[bj], b: to, len: Math.sqrt(best) });
    linked.push(to);
  }
  // Loop links DEDUPE against every existing pair: two crossings routed
  // between the same two isles overlap paths and fuse their pad chains.
  const linkKey = (a: Isle, b: Isle): string =>
    `${Math.min(isles.indexOf(a), isles.indexOf(b))}:${Math.max(isles.indexOf(a), isles.indexOf(b))}`;
  const seenLinks = new Set(links.map(l => linkKey(l.a, l.b)));
  for (let i = 0, n = rng.int(1, layoutParam(def, 'loops', 2) as number); i < n && isles.length > 3; i++) {
    const a = rng.pick(isles), b = rng.pick(isles);
    if (a === b || seenLinks.has(linkKey(a, b))) continue;
    seenLinks.add(linkKey(a, b));
    links.push({ a, b, len: Math.hypot(b.x - a.x, b.y - a.y) });
  }
  let longest = links[0], shortest = links[0];
  for (const l of links) {
    if (l.len > longest.len) longest = l;
    if (l.len < shortest.len) shortest = l;
  }

  const lanterns: { x: number; y: number }[] = [];
  for (const link of links) {
    const isLane = link === longest ? true : link === shortest ? false
      : rng.chance(link.len > 520 ? 0.55 : 0.25);
    if (isLane) {
      // A CARRIER LANE: straight and deliberate (a shipping run, not a game
      // trail). The band rides the width floor honestly (52-62 wide).
      const pts = wanderPath(rng, { x: link.a.x, y: link.a.y }, { x: link.b.x, y: link.b.y },
        { step: 160, wobble: 16, bowFrac: 0.08 });
      const halfW = rng.range(laneHalfP[0], laneHalfP[1]);
      band(basin, pts, halfW + rng.range(basinHalfP[0], basinHalfP[1]) * 0.55);
      band(laneM, pts, halfW);
      reserveArtery(ctx, pts, halfW + 24);
      // Dock lanterns flanking each mouth (perpendicular — never in the
      // throat: the span-brazier lesson) and WIDE of the raft's sweep: the
      // stakes are pass-through, but a lantern the raft plows past every
      // run reads wrong.
      const ang = Math.atan2(link.b.y - link.a.y, link.b.x - link.a.x);
      for (const end of [link.a, link.b]) {
        const out = end === link.a ? ang : ang + Math.PI;
        const mx = end.x + Math.cos(out) * (end.r * 0.72);
        const my = end.y + Math.sin(out) * (end.r * 0.72);
        for (const s of [-1, 1]) {
          lanterns.push({
            x: mx + Math.cos(out + Math.PI / 2) * s * (halfW + 44),
            y: my + Math.sin(out + Math.PI / 2) * s * (halfW + 44),
          });
        }
      }
    } else {
      // A PAD CHAIN: stepping stones walked off the wander path with
      // ADAPTIVE spacing — each pad overlaps its neighbour by a full
      // rasterized cell (contiguous at generation), alternating kinds so
      // each remains its own platform at runtime. LOW wobble: a fold-back
      // brings same-kind pads k and k+2 into contact and fuses them.
      const pts = wanderPath(rng, { x: link.a.x, y: link.a.y }, { x: link.b.x, y: link.b.y },
        { step: 120, wobble: 24, bowFrac: 0.12 });
      band(basin, pts, rng.range(basinHalfP[0], basinHalfP[1]));
      reserveArtery(ctx, pts, 70);
      // Walk the polyline by arc length, dropping pads as we go.
      const cum: number[] = [0];
      for (let k = 1; k < pts.length; k++) {
        cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
      }
      const total = cum[cum.length - 1];
      const at = (d: number): Vec2 => {
        let k = 1;
        while (k < cum.length - 1 && cum[k] < d) k++;
        const seg = Math.max(0.001, cum[k] - cum[k - 1]);
        const f = Math.min(1, Math.max(0, (d - cum[k - 1]) / seg));
        return vec(pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f, pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f);
      };
      // The stepper keeps TWO invariants at once: adjacent (opposite-kind)
      // pads overlap by a rasterized cell (contiguity), and same-kind pads
      // two apart stay separated by a margin that survives the arc→chord
      // shrink (fusion cascades read as one mega-platform — the live-QA
      // lesson). Feasible by construction for the roll ranges here.
      let dNow = 0, flip = rng.chance(0.5), padIdx = 0;
      let rCur = rng.range(padRP[0], padRP[1]);
      let dBack1 = -Infinity, rBack1 = 0; // the pad just placed (opposite kind)
      let dBack2 = -Infinity, rBack2 = 0; // two back — the SAME kind as this one
      while (dNow < total) {
        // Same-kind separation guard against the pad two back (arc distance
        // with a margin that survives the arc→chord shrink).
        if (dNow - dBack2 < rCur + rBack2 + 14) {
          dNow = dBack2 + rCur + rBack2 + 14;
          if (dNow >= total) break;
        }
        const p = at(dNow);
        // The basin grows UNDER every pad (grown past its rim): a flux kind
        // must never border the lipped outer sky — the cloud_void edge bakes
        // by its neighbors' LIVE walkability, and the fabric's quiet writes
        // (bake-inert by contract) would leave that lip stale when the pad
        // phased out. The fabric's own lip-less void is the spacer.
        disc(basin, p.x, p.y, rCur + 36);
        disc(flip ? padA : padB, p.x, p.y, rCur);
        // A satellite hop every few pads: a side stone for the risk-taker's
        // shortcut or the stranded moment's out. ALWAYS the third kind — it
        // touches its host without fusing to either chain kind (a same-kind
        // satellite bridging pads k and k+1 cascade-merged whole chains).
        if (padIdx > 0 && padIdx % satEvery === 0 && dNow + 120 < total) {
          const q = at(Math.min(total, dNow + 24));
          const tang = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
          const sr = rng.range(34, 46);
          const side = rng.chance(0.5) ? 1 : -1;
          const off = rCur + sr - rng.range(26, 34);
          const sx = p.x + Math.cos(tang) * side * off, sy = p.y + Math.sin(tang) * side * off;
          disc(basin, sx, sy, sr + 36);
          disc(padC, sx, sy, sr);
        }
        dBack2 = dBack1; rBack2 = rBack1;
        dBack1 = dNow; rBack1 = rCur;
        const rNext = rng.range(padRP[0], padRP[1]);
        dNow += rCur + rNext - rng.range(padOverlapP[0], padOverlapP[1]);
        rCur = rNext;
        flip = !flip;
        padIdx++;
      }
    }
  }

  // Lay the ground: basins' own lip-less sky UNDER, lanes and pads over it,
  // the standing isles LAST (coasts always win where a crossing lands).
  paintRegion(grid, basin, layoutParam(def, 'fluxRegion', 'flux_void'));
  paintRegion(grid, laneM, 'cloud_lane');
  paintRegion(grid, padA, 'cloud_flux');
  paintRegion(grid, padB, 'cloud_flux_b');
  paintRegion(grid, padC, 'cloud_flux_c');
  paintRegion(grid, carve, 'ground');

  // SELF-AUDIT (genqa surfaces console warns): no flux kind may border an
  // EDGE-BEARING kind — that edge bakes by the flux cell's LIVE walkability,
  // and the fabric's quiet writes would leave it stale mid-phase. The basin
  // growth above is the guarantee; this scan is the tripwire that keeps it.
  {
    const fluxKinds = new Set(['cloud_flux', 'cloud_flux_b', 'cloud_flux_c', 'cloud_lane']);
    let lipRisk = 0;
    const cell = grid.cell;
    for (let gy = 0; gy < grid.rows; gy++) {
      for (let gx = 0; gx < grid.cols; gx++) {
        if (!fluxKinds.has(grid.regionAt((gx + 0.5) * cell, (gy + 0.5) * cell))) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
          const nk = grid.regionAt((nx + 0.5) * cell, (ny + 0.5) * cell);
          if (regionKind(nk)?.visual?.edge) { lipRisk++; break; }
        }
      }
    }
    if (lipRisk > 0) {
      console.warn(`[aether_drift] ${lipRisk} flux cell(s) border an edge-bearing kind — stale-lip risk (grow the basin)`);
    }
  }

  // The monument: the Spire of Gales, POI + mustReach (genqa proves the
  // drift can be crossed to it — the runtime fabric keeps it honest).
  ctx.doodads.push({ pos: vec(monument.x, monument.y), radius: rng.range(26, 32), kind: 'spire_of_gales' });
  ctx.pois.push(vec(monument.x, monument.y));
  (ctx.mustReach ??= []).push(vec(monument.x, monument.y));
  ctx.reserved.push({ pos: vec(monument.x, monument.y), radius: 110 });
  // Dock lanterns placed after the ground exists (they stand on coasts).
  for (const l of lanterns) {
    ctx.doodads.push({ pos: vec(l.x, l.y), radius: rng.range(8, 11), kind: 'sky_lantern' });
  }

  // The tileset's dressing scatters walk-gated over the standing cloud.
  scatterDecoration(ctx, def);
}
registerLayout('aether_drift', aetherDriftLayout);

// --- SHIP DECK (the Wraithsail's boards) -----------------------------------------
// A HULL as a zone: one long pointed form — bow to the north portal, stern to
// the south — walled by the dark beyond the bulwark. The SAME recipe serves
// every deck of a boarding chain; `layoutParams.deck` stages the furniture:
//   'weather'  masts down the centerline, rails along the gunwale, lashed cargo
//   'hold'     support posts, coffer breakables (params.coffers), dense freight
//   'cabin'    one mizzen aft + a brazier ring amidships — a court, not a deck
// Deterministic furniture is planted here (masts/rails/coffers are the ship's
// anatomy, not scatter); the tileset's dressing rows land walk-gated after.
function shipDeckLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);
  const deck = layoutParam(def, 'deck', 'weather') as string;
  const cofferBand = layoutParam(def, 'coffers', [2, 4]) as [number, number];

  // 1) Negative space: everything beyond the hull is the dark past the rail.
  grid.fillRegion(0, 0, arena.w, arena.h, negativeRegion(def));

  // 2) The hull: discs along the vertical centerline, radius following a
  //    beam profile — pointed bow, full midship, rounded stern.
  const cx = arena.w / 2;
  const rim = 70;
  const y0 = rim, y1 = arena.h - rim;
  const halfBeam = Math.min(arena.w * 0.3, 340);
  const beamAt = (t: number): number => {
    // t 0 = bow, 1 = stern: a sharp entry swelling to the full beam by ~0.3,
    // holding through midship, easing to a squared stern counter.
    const bow = Math.min(1, t / 0.3);
    const stern = t > 0.85 ? 1 - (t - 0.85) / 0.15 * 0.25 : 1;
    return halfBeam * (0.2 + 0.8 * bow * bow * (3 - 2 * bow)) * stern;
  };
  const ground = Mask.forRect(0, 0, arena.w, arena.h);
  const steps = Math.ceil((y1 - y0) / 34);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(ground, cx, y0 + t * (y1 - y0), beamAt(t));
  }
  // Portal aprons + gangways: each mouth breathes through the bulwark and a
  // boarding plank runs it to the spine — wherever the harness set the portal,
  // the hull is guaranteed to meet it.
  for (const a of [ctx.entry, ...ctx.exits]) {
    disc(ground, a.x, a.y, 96);
    const jy = Math.max(y0 + 40, Math.min(y1 - 40, a.y));
    band(ground, [vec(a.x, a.y), vec(cx, jy)], 54);
  }
  paintRegion(grid, ground, 'ground');

  // 3) The ship's anatomy, planted deterministically.
  const mastYs = deck === 'weather' ? [0.3, 0.55, 0.78]
    : deck === 'hold' ? [0.4, 0.68]
    : [0.74]; // the cabin keeps one mizzen aft
  for (const mt of mastYs) {
    const my = y0 + mt * (y1 - y0);
    const mr = deck === 'hold' ? rng.range(11, 13) : rng.range(16, 19);
    ctx.doodads.push({ pos: vec(cx, my), radius: mr, kind: 'ship_mast' });
    ctx.reserved.push({ pos: vec(cx, my), radius: mr + 46 });
  }
  // Rails trace the gunwale — dressing laid just inside the hull line, angled
  // along it (pure read: the wall behind them is the actual blocker).
  const railN = 9;
  for (let i = 1; i < railN; i++) {
    const t = i / railN;
    const y = y0 + t * (y1 - y0);
    const b = beamAt(t) - 26;
    if (b < halfBeam * 0.35) continue; // no rails on the point of the bow
    const dt = 0.02;
    const slope = (beamAt(Math.min(1, t + dt)) - beamAt(Math.max(0, t - dt))) / (2 * dt * (y1 - y0));
    for (const s of [-1, 1]) {
      ctx.doodads.push({
        pos: vec(cx + s * b, y), radius: rng.range(13, 16), kind: 'ship_rail',
        rot: Math.PI / 2 + Math.atan(slope) * -s,
      });
    }
  }
  if (deck === 'hold') {
    // The freight: coffer breakables between the posts — the holds PAY.
    const n = rng.int(cofferBand[0], cofferBand[1]);
    for (let i = 0; i < n; i++) {
      const t = 0.25 + (i + rng.range(0.1, 0.9)) / (n + 1) * 0.55;
      const y = y0 + t * (y1 - y0);
      const x = cx + rng.range(-0.55, 0.55) * (beamAt(t) - 90);
      ctx.breakables.push({ id: 'drowned_coffer', pos: vec(x, y) });
    }
  }
  if (deck === 'cabin') {
    // The court amidships: a ring of cold braziers around the audience floor.
    const ay = y0 + 0.45 * (y1 - y0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.doodads.push({
        pos: vec(cx + Math.cos(a) * halfBeam * 0.52, ay + Math.sin(a) * halfBeam * 0.52),
        radius: rng.range(10, 12), kind: 'brazier',
      });
    }
    ctx.pois.push(vec(cx, ay));
    ctx.reserved.push({ pos: vec(cx, ay), radius: 130 });
  }

  // 4) The tileset's dressing lands walk-gated on the boards.
  scatterDecoration(ctx, def);
}
registerLayout('ship_deck', shipDeckLayout);
