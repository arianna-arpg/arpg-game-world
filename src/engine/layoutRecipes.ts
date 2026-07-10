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
