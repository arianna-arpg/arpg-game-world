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
import type { ExitRoadSpec, ZoneDef } from '../data/zones';
import { boundaryGateOf, type BoundaryGateDef } from '../data/boundaryGates';
import { GridWalkField } from '../world/gridWalk';
import {
  registerLayout, layoutParam, ensureGrid, scatterDecoration,
  placeLandmarkById, raiseStructure, setBoundaryGateBuilder, setExitRoadBuilder,
  areaFreeOf, doodadRuleOf, type GenCtx,
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

  // GAME TRAILS — worn ground wandering entry → exit, reserved like every
  // artery so the planting sweep leaves the passage open. Chained road discs
  // ride the existing 'road' kind: path-mode blend, moveScale, one impl.
  const trailN = Math.min(ctx.exits.length,
    rng.int(...(layoutParam(def, 'forestTrails', [1, 2]) as [number, number])));
  for (let i = 0; i < trailN; i++) {
    const pts = wanderPath(rng, ctx.entry, ctx.exits[i], { step: 120, wobble: 55, bowFrac: 0.3 });
    reserveArtery(ctx, pts, 30);
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 30));
      for (let t = 0; t <= steps; t++) {
        ctx.doodads.push({
          pos: vec(a.x + (b.x - a.x) * (t / steps), a.y + (b.y - a.y) * (t / steps)),
          radius: rng.range(16, 22), kind: 'road',
        });
      }
    }
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
      ctx.doodads.push({
        pos: vec(px, py), radius: rng.range(m.radius[0], m.radius[1]),
        kind: m.kind, rot: rng.range(0, Math.PI * 2),
      });
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
      ctx.doodads.push({
        pos: vec(px, py), radius: rng.range(56, 80),
        kind: 'ancient_tree', rot: rng.range(0, Math.PI * 2),
      });
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
  reserveArtery(ctx, pts, 30);
  const band = spec.radius ?? [16, 22];
  const kind = spec.kind ?? 'road';
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 30));
    for (let t = 0; t <= steps; t++) {
      ctx.doodads.push({
        pos: vec(a.x + (b.x - a.x) * (t / steps), a.y + (b.y - a.y) * (t / steps)),
        radius: rng.range(band[0], band[1]), kind,
      });
    }
  }
}
// Register as THE exit-road builder (levelgen lays it per annotated exit).
setExitRoadBuilder(carveApproachRoad);

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
