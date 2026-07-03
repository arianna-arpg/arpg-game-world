// ---------------------------------------------------------------------------
// LANDMARK BUILDERS — six parametric shapes that, with data, become the whole
// geographic vocabulary:
//
//   coast     coast / cove / secluded cove / fjord coast / coastal island /
//             cliff coast — any liquid (water, lava, bog, ice, void)
//   landform  peninsula / isthmus / tombolo (land shapes IN a liquid)
//   crater    crater / caldera / sinkhole / cirque (rim + fill + optional
//             spiral ramp — the volcanic cauldron approach)
//   valley    valley / canyon / secluded valley (flanked or ringed walls)
//   peak      lone mountain / swamp hill (concentric rings + a way up)
//   lake      lake / oasis / frozen lake / lake with island (+ rim clutter)
//
// A LandmarkDef is a builder id + params + a liquid — see data/landmarks.ts
// for the recipe library. Builders write REGIONS through masks (exact walk
// cells) and doodads through the liquid painter; the universal reachability
// invariant guards whatever they carve.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import {
  registerLandmarkBuilder, type LandmarkBuildCtx, type DoodadKind,
} from './levelgen';
import {
  Mask, disc, ring, radial, band, halfPlane, wanderPath, spiralPath,
  paintRegion, paintLiquid, liquidOf, bearingNoise,
} from './genkit';

/** The def's liquid (params.liquid overrides def.liquid; default water). */
function liq(b: LandmarkBuildCtx): ReturnType<typeof liquidOf> {
  return liquidOf(b.param<string | undefined>('liquid', b.def.liquid), 'water');
}

/** A fresh mask framed on the landmark's footprint. */
function frame(b: LandmarkBuildCtx): Mask {
  return Mask.forRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
}

// --- COAST ---------------------------------------------------------------------
// A noisy-edged liquid half-plane with optional coves (bites), fjords (winding
// inland fingers), islands (spared land), a shallow shelf, and a cliff band
// along the shore. One builder, six landmark recipes.
registerLandmarkBuilder('coast', (b) => {
  const { rng, r } = b;
  const angle = b.param('angle', rng.range(0, Math.PI * 2));
  const water = frame(b);
  // (halfPlane's edge noise is a straight coordinate — the lattice version is
  // correct there; only RADIAL rims need the periodic bearing form.)
  halfPlane(water, angle, b.param('offset', -r * 0.1) as number,
    { amp: r * (b.param('edgeAmp', 0.22) as number), wavelength: r * 0.6, seed: rng.int(0, 1 << 30) });

  // Coves: liquid bites INTO the land along the edge.
  for (let i = 0, n = rng.int(...(b.param('coves', [0, 0]) as [number, number])); i < n; i++) {
    const along = rng.range(-r * 0.7, r * 0.7);
    const cx = b.center.x - Math.sin(angle) * along + Math.cos(angle) * b.param('offset', -r * 0.1);
    const cy = b.center.y + Math.cos(angle) * along + Math.sin(angle) * b.param('offset', -r * 0.1);
    disc(water, cx - Math.cos(angle) * r * 0.18, cy - Math.sin(angle) * r * 0.18, rng.range(r * 0.18, r * 0.34));
  }
  // Fjords: narrow winding fingers driving inland (against the normal).
  for (let i = 0, n = rng.int(...(b.param('fjords', [0, 0]) as [number, number])); i < n; i++) {
    const along = rng.range(-r * 0.6, r * 0.6);
    const sx = b.center.x - Math.sin(angle) * along, sy = b.center.y + Math.cos(angle) * along;
    const reach = rng.range(r * 0.5, r * 0.95);
    const pts = wanderPath(rng, vec(sx, sy),
      vec(sx - Math.cos(angle) * reach, sy - Math.sin(angle) * reach),
      { step: 70, wobble: r * 0.08 });
    band(water, pts, rng.range(26, 44));
  }
  // Islands: land spared inside the liquid.
  for (let i = 0, n = rng.int(...(b.param('islands', [0, 0]) as [number, number])); i < n; i++) {
    const d = rng.range(r * 0.3, r * 0.75);
    const along = rng.range(-r * 0.5, r * 0.5);
    const island = frame(b);
    disc(island,
      b.center.x + Math.cos(angle) * d - Math.sin(angle) * along,
      b.center.y + Math.sin(angle) * d + Math.cos(angle) * along,
      rng.range(r * 0.12, r * 0.24));
    water.subtract(island);
  }
  paintLiquid(b.ctx, b.grid, water, liq(b));
  // The land side is the interior (spawns/POIs live on the shore).
  b.interior = water.clone().invert();

  // Cliff coast: a wall band hugging the landward rim, gapped so the shore
  // stays walkable through it (the invariant would catch a sealed shore).
  if (b.param('cliff', false)) {
    const rim = water.clone().grow(1).subtract(water).intersect(b.interior);
    // The GAP anchors on an ACTUAL rim cell's bearing — a uniform 0..2π draw
    // misses the rim's ~160° landward fan on a large share of rolls, shipping
    // an ungapped cliff wall.
    const rimCells: { cx: number; cy: number }[] = [];
    rim.forEach((cx, cy) => rimCells.push({ cx, cy }));
    if (!rimCells.length) { b.interior = water.clone().invert(); return; }
    const anchor = rimCells[rng.int(0, rimCells.length - 1)];
    const ac = rim.center(anchor.cx, anchor.cy);
    const gapAt = Math.atan2(ac.y - b.center.y, ac.x - b.center.x);
    const gapHalf = b.param('cliffGap', 0.55) as number;
    const gapped = rim.like();
    rim.forEach((cx, cy) => {
      const c = rim.center(cx, cy);
      const a = Math.atan2(c.y - b.center.y, c.x - b.center.x);
      const da = Math.abs(Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt)));
      if (da > gapHalf) gapped.set(cx, cy, true);
    });
    paintRegion(b.grid, gapped, b.param('cliffRegion', 'wall') as string);
  }
});

// --- LANDFORM -------------------------------------------------------------------
// Land shapes IN a liquid: peninsula (a finger from the mainland), isthmus
// (two landmasses joined by a neck), tombolo (an island tied to the mainland
// by a thin bar). The footprint floods with liquid; land is spared through it.
registerLandmarkBuilder('landform', (b) => {
  const { rng, r } = b;
  const shape = b.param('shape', 'peninsula') as 'peninsula' | 'isthmus' | 'tombolo';
  const angle = rng.range(0, Math.PI * 2);
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  const water = frame(b);
  disc(water, b.center.x, b.center.y, r);
  const land = frame(b);

  if (shape === 'peninsula') {
    // Mainland at one rim + a wandering finger toward the far rim.
    disc(land, b.center.x - dirX * r, b.center.y - dirY * r, r * 0.72);
    const pts = wanderPath(rng, vec(b.center.x - dirX * r * 0.5, b.center.y - dirY * r * 0.5),
      vec(b.center.x + dirX * r * 0.62, b.center.y + dirY * r * 0.62), { step: 80, wobble: r * 0.09 });
    band(land, pts, rng.range(r * 0.14, r * 0.22));
    disc(land, b.center.x + dirX * r * 0.62, b.center.y + dirY * r * 0.62, r * 0.2);
  } else if (shape === 'isthmus') {
    disc(land, b.center.x - dirX * r * 0.72, b.center.y - dirY * r * 0.72, r * 0.5);
    disc(land, b.center.x + dirX * r * 0.72, b.center.y + dirY * r * 0.72, r * 0.5);
    const pts = wanderPath(rng, vec(b.center.x - dirX * r * 0.4, b.center.y - dirY * r * 0.4),
      vec(b.center.x + dirX * r * 0.4, b.center.y + dirY * r * 0.4), { step: 70, wobble: r * 0.05 });
    band(land, pts, rng.range(r * 0.09, r * 0.14)); // the strategic neck
  } else { // tombolo
    disc(land, b.center.x - dirX * r, b.center.y - dirY * r, r * 0.8); // mainland shoulder
    disc(land, b.center.x + dirX * r * 0.55, b.center.y + dirY * r * 0.55, r * 0.26); // the tied island
    const pts = wanderPath(rng, vec(b.center.x - dirX * r * 0.25, b.center.y - dirY * r * 0.25),
      vec(b.center.x + dirX * r * 0.55, b.center.y + dirY * r * 0.55), { step: 60, wobble: r * 0.03 });
    band(land, pts, r * 0.07); // the sandbar
  }
  water.subtract(land);
  paintLiquid(b.ctx, b.grid, water, liq(b));
  b.interior = land;
});

// --- CRATER --------------------------------------------------------------------
// A wobbled rim around a fill: crater (rocky rim + floor), caldera (rim +
// liquid pool + optional SPIRAL ramp down — the cauldron), sinkhole (void
// fill), cirque (a part-circle bowl). Rim gaps keep the floor accessible
// unless the recipe declares a pocket.
registerLandmarkBuilder('crater', (b) => {
  const { rng, r } = b;
  const seed = rng.int(0, 1 << 30);
  // Periodic bearing noise (no ±π seam) + a CLAMP so the inner rim can never
  // wobble past the outer and punch unintended holes at thin rimWidths.
  const wob = (a: number, base: number): number => base + bearingNoise(a, r * 0.08, seed);
  const rimOuter = frame(b);
  const rimW = b.param('rimWidth', 0.16) as number;
  const gapArc = b.param('gapArc', 0.5) as number;      // radians half-width of the opening
  const openAt = rng.range(0, Math.PI * 2);
  const arcSpan = b.param('arcSpan', Math.PI * 2) as number; // cirque: < 2π
  radial(rimOuter, b.center.x, b.center.y, (a) => {
    const da = Math.abs(Math.atan2(Math.sin(a - openAt), Math.cos(a - openAt)));
    if (da < gapArc) return 0;                          // the opening
    if (arcSpan < Math.PI * 2) {
      const span = Math.abs(Math.atan2(Math.sin(a - openAt - Math.PI), Math.cos(a - openAt - Math.PI)));
      if (span > arcSpan / 2) return 0;                 // cirque: only the back arc
    }
    return wob(a, r * 0.92);
  });
  const inner = frame(b);
  const seed2 = rng.int(0, 1 << 30);
  radial(inner, b.center.x, b.center.y, (a) =>
    // Clamped a full rim-width below the outer at the same bearing.
    Math.min(wob(a, r * (0.92 - rimW)) + bearingNoise(a, r * 0.03, seed2), wob(a, r * 0.92) - r * rimW * 0.6));
  const rim = rimOuter.clone().subtract(inner);
  paintRegion(b.grid, rim, b.param('rimRegion', 'wall') as string);

  const fill = b.param('fill', 'ground') as string;
  if (fill !== 'ground') {
    const pool = frame(b);
    radial(pool, b.center.x, b.center.y, (a) => wob(a, r * (0.92 - rimW - 0.1)));
    paintLiquid(b.ctx, b.grid, pool, liquidOf(fill));
  }
  // The spiral ramp: a walkable band coiling from the opening to the heart —
  // carved AFTER the fill so the cauldron has a way down (ground overwrites),
  // and the fill's DOODAD liquid is spliced off the ramp by intersection (a
  // lava blob's rim overhanging half the walkway blocks it as surely as a
  // centered one — the spiral-layout lesson).
  if (b.param('spiralRamp', false)) {
    const ramp = frame(b);
    band(ramp, spiralPath(b.center.x, b.center.y, r * 0.9, r * 0.12, b.param('turns', 1.6) as number,
      { a0: openAt, step: 34 }), b.param('rampWidth', 46) as number);
    paintRegion(b.grid, ramp, 'ground');
    const lq = liquidOf(fill);
    if (fill !== 'ground' && lq.doodad) {
      const clear = ramp.clone().grow(2);
      for (let k = b.ctx.doodads.length - 1; k >= 0; k--) {
        const d = b.ctx.doodads[k];
        if (d.kind === lq.doodad && clear.has(d.pos.x, d.pos.y)) b.ctx.doodads.splice(k, 1);
      }
    }
  }
  b.interior = inner;
});

// --- VALLEY --------------------------------------------------------------------
// A winding floor flanked by wall bands (valley/canyon), or a walled ring
// with one mouth (secluded valley — the hidden meadow).
registerLandmarkBuilder('valley', (b) => {
  const { rng, r } = b;
  if (b.param('secluded', false)) {
    const wall = frame(b);
    const seed = rng.int(0, 1 << 30);
    const mouthAt = rng.range(0, Math.PI * 2);
    radial(wall, b.center.x, b.center.y, (a) => {
      const da = Math.abs(Math.atan2(Math.sin(a - mouthAt), Math.cos(a - mouthAt)));
      return da < (b.param('mouthArc', 0.4) as number) ? 0
        : r * 0.9 + bearingNoise(a, 0.06 * r, seed);
    });
    const hollow = frame(b);
    radial(hollow, b.center.x, b.center.y, () => r * 0.68);
    wall.subtract(hollow);
    paintRegion(b.grid, wall, b.param('wallRegion', 'wall') as string);
    b.interior = hollow;
    return;
  }
  // Open valley/canyon: a wandering floor between two flanking wall bands.
  const angle = rng.range(0, Math.PI * 2);
  const from = vec(b.center.x - Math.cos(angle) * r * 0.9, b.center.y - Math.sin(angle) * r * 0.9);
  const to = vec(b.center.x + Math.cos(angle) * r * 0.9, b.center.y + Math.sin(angle) * r * 0.9);
  const spine = wanderPath(rng, from, to, { step: 90, wobble: r * 0.08 });
  const floorW = b.param('floorWidth', 90) as number;
  const wallW = b.param('wallWidth', 60) as number;
  const corridorPlusWalls = frame(b);
  band(corridorPlusWalls, spine, floorW / 2 + wallW);
  const floor = frame(b);
  band(floor, spine, floorW / 2);
  const walls = corridorPlusWalls.subtract(floor);
  // OPEN THE MOUTHS: the wall band's rounded end-caps wrap around the floor's
  // ends — without these subtractions, diagonal-ish rolls seal the corridor
  // into an inaccessible capsule (its whole point is being a pass-through).
  const mouths = frame(b);
  disc(mouths, spine[0].x, spine[0].y, floorW / 2 + wallW + 8);
  disc(mouths, spine[spine.length - 1].x, spine[spine.length - 1].y, floorW / 2 + wallW + 8);
  walls.subtract(mouths);
  paintRegion(b.grid, walls, b.param('wallRegion', 'wall') as string);
  b.interior = floor;
});

// --- PEAK ----------------------------------------------------------------------
// A lone mountain: concentric wall rings, each with an offset gap, so the way
// up WINDS (a switchback in plan view); the summit is a POI-worthy eyrie.
// swamp hill: one low ring with a liquid skirt.
registerLandmarkBuilder('peak', (b) => {
  const { rng, r } = b;
  const rings = b.param('rings', 3) as number;
  const seed = rng.int(0, 1 << 30);
  let gapAt = rng.range(0, Math.PI * 2);
  for (let k = 0; k < rings; k++) {
    const rr = r * (0.9 - k * (0.7 / rings));
    const ringMask = frame(b);
    radial(ringMask, b.center.x, b.center.y, (a) => {
      const da = Math.abs(Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt)));
      return da < (b.param('gapArc', 0.45) as number) ? 0
        : rr + bearingNoise(a, 0.05 * r, (seed ^ (k * 0x9e37)) >>> 0);
    });
    const hollow = frame(b);
    radial(hollow, b.center.x, b.center.y, () => rr - (b.param('ringWidth', 40) as number));
    ringMask.subtract(hollow);
    paintRegion(b.grid, ringMask, b.param('wallRegion', 'wall') as string);
    gapAt += Math.PI * (0.7 + rng.range(0, 0.6)); // the switchback: next gap swings around
  }
  // Liquid skirt (the swamp hill's moat of mire).
  const skirt = b.param<string | undefined>('skirt', undefined);
  if (skirt) {
    const sk = frame(b);
    ring(sk, b.center.x, b.center.y, r * 0.92, r * 1.0);
    paintLiquid(b.ctx, b.grid, sk, liquidOf(skirt));
  }
  const summit = frame(b);
  disc(summit, b.center.x, b.center.y, r * 0.16);
  b.interior = summit;
});

// --- PILLARS (Pillars of Arun) ---------------------------------------------------
// A void field studded with walkable ISLAND POCKETS — reachable only by
// jump/blink displacement (the reachability invariant exempts them via the
// recipe's `pocket` flag; ambient spawning skips them automatically because
// they are grid-unreachable). Pocket dwellers ride the recipe's `spawns`.
registerLandmarkBuilder('pillars', (b) => {
  const { rng, r } = b;
  const voidMask = frame(b);
  const seed = rng.int(0, 1 << 30);
  radial(voidMask, b.center.x, b.center.y, (a) => r * 0.9 + bearingNoise(a, 0.08 * r, seed));
  const isles = frame(b);
  const n = b.param('pillars', [3, 5]) as [number, number];
  for (let i = 0, k = rng.int(n[0], n[1]); i < k; i++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(0, r * 0.6);
    disc(isles, b.center.x + Math.cos(a) * d, b.center.y + Math.sin(a) * d,
      rng.range(...(b.param('pillarRadius', [60, 110]) as [number, number])));
  }
  voidMask.subtract(isles);
  paintLiquid(b.ctx, b.grid, voidMask, liquidOf(b.param('gulf', 'void')));
  // The islands stay whatever the ground was; they ARE the interior (spawn
  // sampling lands the dwellers on the pillars, never in the gulf).
  b.interior = isles;
});

// --- PIT ------------------------------------------------------------------------
// An open pit: a broken rim around a sunken floor crawling with its dwellers
// (the recipe's `spawns`). For a Belial-style EMERGENCE, put a monster with a
// dormant/roused brain in the spawn table — the dormancy machinery (rouse
// rules) already wakes it when the player wades in; no engine code.
registerLandmarkBuilder('pit', (b) => {
  const { rng, r } = b;
  const seed = rng.int(0, 1 << 30);
  const gapAt = rng.range(0, Math.PI * 2);
  const rim = frame(b);
  radial(rim, b.center.x, b.center.y, (a) => {
    const da = Math.abs(Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt)));
    return da < (b.param('gapArc', 0.6) as number) ? 0
      : r * 0.88 + bearingNoise(a, 0.06 * r, seed);
  });
  const floor = frame(b);
  radial(floor, b.center.x, b.center.y, () => r * 0.7);
  rim.subtract(floor);
  paintRegion(b.grid, rim, b.param('rimRegion', 'wall') as string);
  // A sunken-floor wash (data ground kinds compose: gore, cinder, mud…).
  const floorKind = b.param<string | undefined>('floorKind', undefined);
  if (floorKind) paintLiquid(b.ctx, b.grid, floor, liquidOf(floorKind));
  b.interior = floor;
});

// --- LAKE ----------------------------------------------------------------------
// A wobbled liquid body: lake, frozen lake (ice), oasis (water + palm/grass
// ring), optionally an ISLAND at its heart; rim clutter scatters around the
// shore (sparse rock packs around a great lake).
registerLandmarkBuilder('lake', (b) => {
  const { rng, r } = b;
  const seed = rng.int(0, 1 << 30);
  const body = frame(b);
  radial(body, b.center.x, b.center.y, (a) => r * 0.85 + bearingNoise(a, 0.1 * r, seed));
  if (b.param('island', false)) {
    const isle = frame(b);
    disc(isle, b.center.x + rng.range(-r * 0.1, r * 0.1), b.center.y + rng.range(-r * 0.1, r * 0.1), r * 0.22);
    body.subtract(isle);
  }
  paintLiquid(b.ctx, b.grid, body, liq(b));
  // Rim clutter: doodads scattered just OUTSIDE the shore.
  const rim = b.param<{ kind: string; count: [number, number]; radius: [number, number] } | undefined>('rim', undefined);
  if (rim) {
    const shore = body.clone().grow(2).subtract(body);
    const cells: Vec2[] = [];
    shore.forEach((cx, cy) => cells.push(shore.center(cx, cy)));
    if (cells.length) {
      for (let i = 0, n = rng.int(rim.count[0], rim.count[1]); i < n; i++) {
        const c = cells[rng.int(0, cells.length - 1)];
        b.ctx.doodads.push({
          pos: vec(c.x + rng.range(-10, 10), c.y + rng.range(-10, 10)),
          radius: rng.range(rim.radius[0], rim.radius[1]),
          kind: rim.kind as DoodadKind,
          rot: rng.range(0, Math.PI * 2),
        });
      }
    }
  }
  b.interior = body.clone().invert();
});
