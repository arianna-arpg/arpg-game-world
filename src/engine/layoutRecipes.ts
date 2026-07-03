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
import type { ZoneDef } from '../data/zones';
import {
  registerLayout, layoutParam, ensureGrid, scatterDecoration,
  placeLandmarkById, raiseStructure, type GenCtx,
} from './levelgen';
import {
  Mask, band, disc, wanderPath, spiralPath, paintRegion, paintLiquid, liquidOf,
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
  // The river crosses the LONG axis, winding.
  const horizontal = arena.w >= arena.h;
  const from = horizontal ? vec(30, rng.range(arena.h * 0.3, arena.h * 0.7)) : vec(rng.range(arena.w * 0.3, arena.w * 0.7), 30);
  const to = horizontal ? vec(arena.w - 30, rng.range(arena.h * 0.3, arena.h * 0.7)) : vec(rng.range(arena.w * 0.3, arena.w * 0.7), arena.h - 30);
  const pts = wanderPath(rng, from, to, { step: 150, wobble: 90, bowFrac: 0.2 });
  const width = layoutParam(def, 'riverWidth', [90, 150]) as [number, number];
  const halfW = rng.range(width[0], width[1]) / 2;

  // FREEZE POINT: the course transitions material at freezeAt (0..1) — a
  // winding river coalescing into a frozen run (D2 Act 5). Split the band by
  // path fraction into two masks, pour each liquid.
  const freezeAt = layoutParam<number | undefined>(def, 'freezeAt', undefined);
  if (freezeAt !== undefined) {
    const cut = Math.max(1, Math.min(pts.length - 1, Math.round(pts.length * freezeAt)));
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
