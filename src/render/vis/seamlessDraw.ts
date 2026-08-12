// ---------------------------------------------------------------------------
// THE SEAMLESS COUNTRY DRAW (seamless-world M0, the render lane) — what the
// view shows PAST the active layout's rim when the mode stands: connective
// TISSUE poured from the global fields, and the NEIGHBOR layouts standing at
// their map seats. Charter: docs/design/seamless-world.md; contracts:
// world/seamless.ts (RegionSeat, TissueSample, getTissueSampler).
//
// THE MODE LAW (Law 1) is structural here: every entry point gates on
// `seamlessDrawActive(world)` — flag off, sampler null, seats empty, or the
// active zone unseated ⇒ false ⇒ the renderer runs today's void-frame path
// byte-identically. Null sampler = "no tissue exists"; nothing here throws.
//
// M0 IS HONEST, NOT PRETTY: tissue is flat lattice tones (biome hex from the
// sampler), the road is a flat lighter band, water is a darkened lean, and
// the neighbor is a reduced-fidelity flat bake — no new painters anywhere.
//
// TWO CACHES, both steward-registered (render/vis/caches.ts):
//  • SeamlessTissueChunks — per-chunk offscreen canvases keyed `${cx},${cy}`
//    in WORLD px at SEAMLESS_CFG.chunkPx grain, LRU-evicted over a cap: the
//    ground-chunk cache idiom (render/vis/ground.ts GroundRenderer.chunks —
//    Map insertion order as LRU, delete+set touch, evictOverCap) applied to
//    world-keyed tissue. Chunks are pure f(worldSeed, cx, cy) — the sampler's
//    own purity law — so they survive zone swaps VALIDLY (no onZoneSwap
//    handler on purpose: clearing at the threshold would pop the tissue at
//    the exact moment that must feel continuous; the cap is the bound).
//  • SeamlessAwayGrounds — one reduced-scale flat bake per resident neighbor.
//
// THE NEIGHBOR CUT (documented choice): the ground-chunk cache is too
// zone-coupled to serve two zones in M0 (GroundRenderer keys its whole cache
// on `world.zone` identity and bakes off the LIVE walk grid/doodad list/zone
// theme — a second zone would need a second World view). So the neighbor
// draws the chip's sanctioned simpler cut: FLAT GRID TONES + doodad discs at
// reduced scale, dimmed — painted from the placement lane's OWN resident
// mint (World.seamlessMints, minted through the same derivation loadZone
// runs, true exits and road dress included), never a second render-side
// generation. A seat without a mint draws nothing (structurally impossible
// while the placement lane fills both together; the guard is the stand-down
// law's shape). M1 replaces this bake with world-keyed real ground chunks.
// ---------------------------------------------------------------------------

import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import type { ZoneDef } from '../../data/zones';
import type { Doodad, GeneratedLayout } from '../../engine/levelgen';
import type { World } from '../../engine/world';
import { getTissueSampler, SEAMLESS_CFG, type RegionSeat, type TissueSampler } from '../../world/seamless';
import { activePieces, type BoundsPiece } from '../../world/shape';
import { registerVisCache } from './caches';
import { mix, withAlpha } from './color';
import { releaseCanvas } from './sprites';

/** M0 render-lane dials — ALL FLAGGED (unblessed; her word moves them).
 *  Tone/dim rationale: the road lifts the biome tone just enough to read as
 *  a way without inventing a material; water leans the same tone into one
 *  shared dark so every biome's coast reads as the same sea; the away dim
 *  is a light hand — the neighbor should read as REAL ground you haven't
 *  reached, not a ghost. */
export const SEAMLESS_DRAW_CFG = {
  /** Tissue sample lattice inside a chunk, px (720/30 = 24 cells exactly).
   *  Coarser = cheaper bakes; finer = smoother biome borders. */
  latticePx: 30,
  /** LRU cap on live tissue chunks (ground.ts maxChunks idiom: 60 × 448²
   *  ≈ 48MB there; 24 × 720² ≈ 50MB here — the same byte class). */
  maxTissueChunks: 24,
  /** Fresh tissue bakes per frame — pop-in fills a view in a few frames and
   *  a walker can never outrun a 720px chunk per frame. */
  tissueBakesPerFrame: 2,
  /** Road ribbon: tone lifted toward white by this much (flat honest band). */
  roadLighten: 0.16,
  /** Non-walkable tissue (sea, cliff-class relief): tone leaned toward
   *  waterDark by waterMix — one shared dark, biome-tinted. */
  waterDark: '#0a1826',
  waterMix: 0.62,
  /** Neighbor ground bake scale (reduced fidelity — the documented M0 cut). */
  awayScale: 1 / 3,
  /** The away-region read: dim wash baked over the neighbor (source-atop, so
   *  an ellipse neighbor's transparent corners stay tissue). */
  awayDim: 0.24,
  awayDimInk: '#05070e',
  /** Resident neighbor bakes kept (LRU). */
  maxAway: 3,
  /** Neighbor wall-cell tone: floor leaned this far toward black. */
  wallDarken: 0.45,
  /** Neighbor doodad disc alphas by paint-order class (grounds vs standing). */
  groundDoodadAlpha: 0.55,
  standingDoodadAlpha: 0.9,
} as const;

/** The seed lane the engine itself reads for climate/continents
 *  (world.ts climateFor/continentFor: `this.sim.biomeField.fieldSeed`) —
 *  the tissue sampler's worldSeed parameter is the same number. */
function worldSeedOf(world: World): number {
  return world.sim.biomeField.fieldSeed >>> 0;
}

/** THE ONE PREDICATE every render-lane entry gates on. True only when the
 *  mode is on, a tissue sampler stands, seats exist, AND the active zone
 *  holds a seat (without its origin, world px are unaddressable — the town
 *  and every off-pair zone keep today's void frame even while the mode is
 *  on). Anything less = stand down structurally = today's draw,
 *  byte-identical. */
export function seamlessDrawActive(world: World): boolean {
  if (!world.seamless) return false;
  if (!getTissueSampler()) return false;
  const seats = world.seamlessRegions;
  if (!seats.length) return false;
  for (const s of seats) if (s.zoneId === world.zone.id) return true;
  return false;
}

/** The active zone's seat (callers have already passed seamlessDrawActive). */
function activeSeatOf(world: World): RegionSeat | null {
  for (const s of world.seamlessRegions) if (s.zoneId === world.zone.id) return s;
  return null;
}

// ---------------------------------------------------------------------------
// THE TISSUE CHUNKS — the country fill, baked at chunk grain.
// ---------------------------------------------------------------------------

interface TissueEntry { img: HTMLCanvasElement; at: number }

class SeamlessTissueChunks {
  /** Map insertion order as LRU (the ground.ts chunk-cache idiom). */
  private chunks = new Map<string, TissueEntry>();
  private seedRef = -1;
  private seq = 0;

  count(): number { return this.chunks.size; }
  bytes(): number { return this.chunks.size * SEAMLESS_CFG.chunkPx * SEAMLESS_CFG.chunkPx * 4; }

  clear(): void {
    for (const e of this.chunks.values()) releaseCanvas(e.img);
    this.chunks.clear();
  }

  /** Draw every baked chunk the view (+seedAhead margin) touches; bake the
   *  nearest missing ones under the per-frame budget. originX/Y = the active
   *  seat's world-px origin (zone-local = world − origin, one affine). */
  draw(ctx: CanvasRenderingContext2D, world: World, originX: number, originY: number,
    camX: number, camY: number, vw: number, vh: number): void {
    const sampler = getTissueSampler();
    if (!sampler) return;
    const seed = worldSeedOf(world);
    if (seed !== this.seedRef) { this.clear(); this.seedRef = seed; }
    const C = SEAMLESS_CFG.chunkPx, ahead = SEAMLESS_CFG.seedAhead;
    const wx0 = camX + originX, wy0 = camY + originY; // view origin in world px
    const x0 = Math.floor((wx0 - ahead) / C), x1 = Math.floor((wx0 + vw + ahead) / C);
    const y0 = Math.floor((wy0 - ahead) / C), y1 = Math.floor((wy0 + vh + ahead) / C);
    const ccx = (wx0 + vw / 2) / C, ccy = (wy0 + vh / 2) / C; // view center, chunk units
    const drawFloor = this.seq; // entries touched below are this frame's working set
    const missing: { cx: number; cy: number; d2: number }[] = [];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${cx},${cy}`;
        const entry = this.chunks.get(key);
        if (entry) {
          this.chunks.delete(key); this.chunks.set(key, entry); // LRU touch
          entry.at = ++this.seq;
          ctx.drawImage(entry.img, cx * C - originX, cy * C - originY);
        } else {
          missing.push({ cx, cy, d2: (cx + 0.5 - ccx) ** 2 + (cy + 0.5 - ccy) ** 2 });
        }
      }
    }
    if (missing.length) {
      missing.sort((a, b) => a.d2 - b.d2); // nearest-first: the view center fills first
      const budget = Math.min(SEAMLESS_DRAW_CFG.tissueBakesPerFrame, missing.length);
      for (let i = 0; i < budget; i++) {
        const m = missing[i];
        const img = this.bake(sampler, seed, m.cx, m.cy);
        this.chunks.set(`${m.cx},${m.cy}`, { img, at: ++this.seq });
        ctx.drawImage(img, m.cx * C - originX, m.cy * C - originY);
      }
    }
    // Evict past the cap — but never a chunk this very frame drew (a wide dev
    // zoom's working set may exceed the cap; thrashing it would leave holes
    // that rebake forever, so the cap bounds SESSION growth, not the view).
    while (this.chunks.size > SEAMLESS_DRAW_CFG.maxTissueChunks) {
      const oldest = this.chunks.entries().next().value;
      if (oldest === undefined || oldest[1].at > drawFloor) break;
      releaseCanvas(oldest[1].img);
      this.chunks.delete(oldest[0]);
    }
  }

  /** One chunk: sample the tissue on the lattice, fill flat run-merged rows.
   *  Pure f(worldSeed, cx, cy) — same seed, same chunk, same pixels forever
   *  (the sampler's own contract carries the proof). */
  private bake(sampler: TissueSampler, seed: number, cx: number, cy: number): HTMLCanvasElement {
    const C = SEAMLESS_CFG.chunkPx, L = SEAMLESS_DRAW_CFG.latticePx;
    const cells = Math.ceil(C / L);
    const c = document.createElement('canvas');
    c.width = C; c.height = C;
    const g = c.getContext('2d')!;
    for (let j = 0; j < cells; j++) {
      const wy = cy * C + (j + 0.5) * L;
      let runStart = 0;
      let runColor = '';
      for (let i = 0; i < cells; i++) {
        const s = sampler(cx * C + (i + 0.5) * L, wy, seed);
        const color = !s.walkable
          ? mix(s.tone, SEAMLESS_DRAW_CFG.waterDark, SEAMLESS_DRAW_CFG.waterMix)
          : s.road ? mix(s.tone, '#ffffff', SEAMLESS_DRAW_CFG.roadLighten) : s.tone;
        if (color !== runColor) {
          if (i > runStart) { g.fillStyle = runColor; g.fillRect(runStart * L, j * L, (i - runStart) * L, L); }
          runStart = i; runColor = color;
        }
      }
      g.fillStyle = runColor;
      g.fillRect(runStart * L, j * L, (cells - runStart) * L, L);
    }
    return c;
  }
}

// ---------------------------------------------------------------------------
// THE AWAY GROUNDS — the neighbor's layout at its seat, flat and dimmed.
// ---------------------------------------------------------------------------

interface AwayEntry { img: HTMLCanvasElement; w: number; h: number; at: number }

class SeamlessAwayGrounds {
  private grounds = new Map<string, AwayEntry>(); // zoneId → bake (LRU)
  private seq = 0;

  count(): number { return this.grounds.size; }
  bytes(): number {
    let b = 0;
    for (const e of this.grounds.values()) b += e.img.width * e.img.height * 4;
    return b;
  }

  clear(): void {
    for (const e of this.grounds.values()) releaseCanvas(e.img);
    this.grounds.clear();
  }

  /** Draw one away seat if its footprint touches the view. The ground comes
   *  from the placement lane's OWN resident mint (World.seamlessMints — the
   *  same layout the threshold sweep lands on, so drawn == arrived-at); the
   *  bake is lazy and view-gated, so an off-screen neighbor costs nothing. */
  draw(ctx: CanvasRenderingContext2D, world: World, seat: RegionSeat,
    originX: number, originY: number, camX: number, camY: number, vw: number, vh: number): void {
    const def = world.zoneMap[seat.zoneId];
    const mint = world.seamlessMints.get(seat.zoneId);
    if (!def || def.boundless || !mint) return; // no mint = stand down
    const w = mint.span.w || def.size.w, h = mint.span.h || def.size.h;
    const lx = seat.originPx.x - originX, ly = seat.originPx.y - originY; // zone-local top-left
    if (lx > camX + vw || ly > camY + vh || lx + w < camX || ly + h < camY) return;
    let entry = this.grounds.get(seat.zoneId);
    if (!entry) {
      entry = this.bake(def, mint.layout, w, h);
      this.grounds.set(seat.zoneId, entry);
      while (this.grounds.size > SEAMLESS_DRAW_CFG.maxAway) {
        const oldest = this.grounds.keys().next().value;
        if (oldest === undefined) break;
        const old = this.grounds.get(oldest);
        if (old) releaseCanvas(old.img);
        this.grounds.delete(oldest);
      }
    } else {
      this.grounds.delete(seat.zoneId); this.grounds.set(seat.zoneId, entry); // LRU touch
    }
    ctx.drawImage(entry.img, lx, ly, entry.w, entry.h);
  }

  /** The reduced-fidelity flat bake: silhouette-clipped floor tone, walk-grid
   *  wall cells where the layout carries a WalkField, doodads as flat discs
   *  in paint order, then the away dim washed source-atop (painted pixels
   *  only — an ellipse neighbor's corners stay transparent for the tissue
   *  below). */
  private bake(def: ZoneDef, layout: GeneratedLayout, w: number, h: number): AwayEntry {
    const S = SEAMLESS_DRAW_CFG.awayScale;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * S));
    c.height = Math.max(1, Math.ceil(h * S));
    const g = c.getContext('2d')!;
    g.scale(S, S);
    const ell = awayShapeOf(def) === 'ellipse';
    if (ell) { g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.clip(); }
    const floor = def.theme.floor;
    g.fillStyle = floor;
    g.fillRect(0, 0, w, h);
    // Wall cells (non-convex layouts only — convex plains carry no WalkField
    // and read as open floor + doodads, which is what they are).
    const walk = layout.walk;
    if (walk?.cellSize && walk.isWalkable) {
      const cs = walk.cellSize;
      const wall = mix(floor, '#000000', SEAMLESS_DRAW_CFG.wallDarken);
      g.fillStyle = wall;
      for (let y = cs / 2; y < h; y += cs) {
        let runStart = -1;
        for (let x = cs / 2; x < w; x += cs) {
          const open = walk.isWalkable(x, y);
          if (!open && runStart < 0) runStart = x - cs / 2;
          if (open && runStart >= 0) { g.fillRect(runStart, y - cs / 2, x - cs / 2 - runStart, cs); runStart = -1; }
        }
        if (runStart >= 0) g.fillRect(runStart, y - cs / 2, w - runStart, cs);
      }
    }
    // Doodads as flat discs, painted in ascending paint order (grounds under
    // standing bodies) — the def's own params.color where it speaks hex,
    // else a theme-derived dark. No painters, by M0 law.
    const dressed = [...layout.doodads].sort((a, b) => orderOf(a) - orderOf(b));
    for (const d of dressed) {
      const order = orderOf(d);
      g.globalAlpha = order < 44
        ? SEAMLESS_DRAW_CFG.groundDoodadAlpha : SEAMLESS_DRAW_CFG.standingDoodadAlpha;
      g.fillStyle = doodadToneOf(d, floor);
      g.beginPath();
      g.arc(d.pos.x, d.pos.y, d.radius, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // THE AWAY DIM (flagged): baked in once, source-atop.
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = withAlpha(SEAMLESS_DRAW_CFG.awayDimInk, SEAMLESS_DRAW_CFG.awayDim);
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    return { img: c, w, h, at: ++this.seq };
  }
}

function orderOf(d: Doodad): number {
  return DOODAD_VISUALS[d.kind]?.order ?? 46;
}

/** A doodad's flat preview tone: params.color when it is a plain hex or a
 *  'theme:x|#hex' spec's fallback hex; else the floor leaned dark. */
function doodadToneOf(d: Doodad, floor: string): string {
  const c = DOODAD_VISUALS[d.kind]?.params?.color;
  if (typeof c === 'string') {
    if (c.startsWith('#')) return c;
    const bar = c.indexOf('|#');
    if (bar >= 0) return c.slice(bar + 1);
  }
  return mix(floor, '#000000', 0.35);
}

/** The neighbor's silhouette shape — ZoneDef.shape where authored, else the
 *  same FNV pick World.makeArena derives (world.ts ~1993; replicated because
 *  makeArena is world-private and the mint stores only the span — M1's
 *  world-keyed ground chunks retire this, drift risk dies with them). */
function awayShapeOf(def: ZoneDef): 'rect' | 'ellipse' {
  if (def.shape) return def.shape === 'ellipse' ? 'ellipse' : 'rect';
  if (def.objective.kind === 'safe' || def.fixtures) return 'rect';
  let hsh = 2166136261;
  for (let i = 0; i < def.id.length; i++) hsh = ((hsh ^ def.id.charCodeAt(i)) * 16777619) >>> 0;
  return (hsh % 100) < 25 ? 'ellipse' : 'rect';
}

// ---------------------------------------------------------------------------
// The module singletons + their steward rows (module caches register at load
// — render/vis/caches.ts's own idiom). World-keyed on purpose: no onZoneSwap
// (tissue/neighbor bakes stay valid across a threshold; the caps bound them),
// run swap releases everything.
// ---------------------------------------------------------------------------

const tissue = new SeamlessTissueChunks();
const away = new SeamlessAwayGrounds();

registerVisCache({
  id: 'seamlessTissue',
  count: () => tissue.count(),
  bytes: () => tissue.bytes(),
  onRunSwap: () => tissue.clear(),
});
registerVisCache({
  id: 'seamlessAway',
  count: () => away.count(),
  bytes: () => away.bytes(),
  onRunSwap: () => away.clear(),
});

// ---------------------------------------------------------------------------
// THE COUNTRY DRAW — drawFloor's tail in seamless mode (in place of the
// union mask + void frame): tissue, then the neighbors, all clipped OUTSIDE
// the active union so the live layout's own ground always wins the overlap.
// ---------------------------------------------------------------------------

/** Clip to OUTSIDE one active-union member — the voidFrame.ts clipOutside
 *  idiom verbatim: sequential calls intersect, outside(base) ∩ outside(A) ∩ …
 *  = outside the whole union (overlap-safe where one even-odd fill is not). */
function clipOutsideMember(ctx: CanvasRenderingContext2D, w: number, h: number,
  ell: boolean, pc: BoundsPiece | null): void {
  ctx.beginPath();
  ctx.rect(-1e6, -1e6, 2e6, 2e6);
  if (!pc) {
    if (ell) ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.rect(0, 0, w, h);
  } else if ((pc.shape ?? 'rect') === 'ellipse') {
    ctx.ellipse(pc.x + pc.w / 2, pc.y + pc.h / 2, pc.w / 2, pc.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(pc.x, pc.y, pc.w, pc.h);
  }
  ctx.clip('evenodd');
}

/** Everything past the active rim, seamless-mode: the tissue country and the
 *  neighbor layouts at their seats. Runs under the world transform with the
 *  same (cam, view) frame drawVoidFrame takes; the caller has already gated
 *  on seamlessDrawActive. */
export function drawSeamlessCountry(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const seat = activeSeatOf(world);
  if (!seat) return; // stand down (the predicate said yes a frame ago; races are harmless)
  const az = world.arena;
  const ell = az.shape === 'ellipse';
  ctx.save();
  // Paint only the view, and only OUTSIDE the active union.
  ctx.beginPath();
  ctx.rect(camX, camY, vw, vh);
  ctx.clip();
  clipOutsideMember(ctx, az.w, az.h, ell, null);
  for (const pc of activePieces(az)) clipOutsideMember(ctx, az.w, az.h, ell, pc);
  tissue.draw(ctx, world, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
  for (const s of world.seamlessRegions) {
    if (s.zoneId === world.zone.id) continue;
    away.draw(ctx, world, s, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
  }
  ctx.restore();
}

// (The interim dev proof rig — ?seamrig, which installed the sampler and a
// current-zone seat fill before the placement lane landed — is gone: the
// real installer (World.seamlessEnsureBoot) stands, and a second seat-filler
// would fight the resident pair it picks. Plain ?seamless is the whole boot.)
