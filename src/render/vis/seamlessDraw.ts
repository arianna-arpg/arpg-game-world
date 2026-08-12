// ---------------------------------------------------------------------------
// THE SEAMLESS COUNTRY DRAW (seamless-world, the render lane) — what the
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
// THE NEIGHBOR'S GROUND (M1 wave 1) lives in render/vis/ground.ts: the
// world-keyed chunk cache (GroundRenderer.worldChunks) bakes every resident
// region — active AND away — at FULL fidelity through the one bake pipeline,
// keyed on world chunk coordinates so a threshold crossing changes which
// region is active without dropping a single chunk. drawSeamlessCountry
// below hands each away seat to it inside the outside-the-union clip. The
// M0 reduced-fidelity flat ground bake (SeamlessAwayGrounds) RETIRED with
// it — what remains here of the neighbor is SeamlessAwayBodies, the flat
// STANDING-DOODAD discs over that real ground (the doodad painters only run
// live for the active zone; a future wave makes neighbor bodies resident).
// The M0 away DIM retired with the flats too: the crossing may not pop, so
// the neighbor's ground wears its true tones (FLAGGED — if her eye wants
// the not-yet-real veil back, it belongs at draw time, never in the bake).
//
// TWO MODULE CACHES, both steward-registered (render/vis/caches.ts):
//  • SeamlessTissueChunks — per-chunk offscreen canvases keyed `${cx},${cy}`
//    in WORLD px at SEAMLESS_CFG.chunkPx grain, LRU-evicted over a cap: the
//    ground-chunk cache idiom (render/vis/ground.ts GroundRenderer.chunks —
//    Map insertion order as LRU, delete+set touch, evictOverCap) applied to
//    world-keyed tissue. Chunks are pure f(worldSeed, cx, cy) — the sampler's
//    own purity law — so they survive zone swaps VALIDLY (no onZoneSwap
//    handler on purpose: clearing at the threshold would pop the tissue at
//    the exact moment that must feel continuous; the cap is the bound).
//  • SeamlessAwayBodies — one reduced-scale disc bake per resident neighbor.
// (The world-keyed ground cache registers from its own home, ground.ts.)
// ---------------------------------------------------------------------------

import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import type { ZoneDef } from '../../data/zones';
import type { Doodad } from '../../engine/levelgen';
import type { SeamlessMint, World } from '../../engine/world';
import { getTissueSampler, SEAMLESS_CFG, type RegionSeat, type TissueSampler } from '../../world/seamless';
import { activePieces, type BoundsPiece } from '../../world/shape';
import { registerVisCache } from './caches';
import { mix } from './color';
import type { GroundRenderer } from './ground';
import { releaseCanvas } from './sprites';

/** Seamless render-lane dials — ALL FLAGGED (unblessed; her word moves
 *  them). Tone rationale: the road lifts the biome tone just enough to read
 *  as a way without inventing a material; water leans the same tone into
 *  one shared dark so every biome's coast reads as the same sea. */
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
  /** THE WORLD-KEYED GROUND (M1 wave 1, ground.ts worldChunks) — LRU cap on
   *  full-fidelity chunks across ALL resident regions (~0.8MB each at 448²;
   *  72 ≈ 58MB: two regions' views + crossing hysteresis + the prefetch
   *  ring — the ground cache's own byte class, sized for the pair). The
   *  working-set guard means the cap bounds session growth, never the view. */
  maxGroundChunks: 72,
  /** Shared per-frame world-chunk bake budget (ms) — the active pass opens
   *  the ledger, away passes spend the remainder; ONE never-baked chunk per
   *  frame is always allowed regardless (streaming must progress — the
   *  discrete ground lane's own law). Mirrors VIS_CFG.ground.bakeBudgetMs. */
  groundBakeBudgetMs: 6,
  /** Stale world-chunk rebakes per frame — the convergence trickle after a
   *  crossing (epoch turnover), a walk repaint, or a mint refresh. The
   *  discrete lane runs 3; the seamless lane keeps a lighter hand because
   *  convergence bakes are usually pixel-identical to what they replace. */
  groundRebakesPerFrame: 2,
  /** Away BODY discs (SeamlessAwayBodies) bake scale — the M0 cut, now
   *  bodies-only: the ground beneath is full fidelity. */
  awayScale: 1 / 3,
  /** Resident neighbor body bakes kept (LRU). */
  maxAway: 3,
  /** Away body-disc alphas by paint-order class (grounds vs standing). */
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
// THE AWAY BODIES — the neighbor's standing doodads as flat discs, drawn
// OVER its world-keyed full-fidelity ground (M1 wave 1: the M0 flat ground
// bake retired into ground.ts's worldChunks). The doodad painter pass only
// runs live for the active zone, so until a wave makes neighbor bodies
// resident this keeps the treeline readable at the M0 disc fidelity.
// ---------------------------------------------------------------------------

interface AwayEntry { img: HTMLCanvasElement; w: number; h: number; at: number; mint: SeamlessMint }

class SeamlessAwayBodies {
  private bodies = new Map<string, AwayEntry>(); // zoneId → bake (LRU)
  private seq = 0;

  count(): number { return this.bodies.size; }
  bytes(): number {
    let b = 0;
    for (const e of this.bodies.values()) b += e.img.width * e.img.height * 4;
    return b;
  }

  clear(): void {
    for (const e of this.bodies.values()) releaseCanvas(e.img);
    this.bodies.clear();
  }

  /** Draw one away seat's bodies if its footprint touches the view. The
   *  doodads come from the placement lane's OWN resident mint
   *  (World.seamlessMints — the same layout the threshold sweep lands on,
   *  so drawn == arrived-at); the bake is lazy and view-gated, and a
   *  re-minted record (the exits-key refresh) re-bakes by mint identity. */
  draw(ctx: CanvasRenderingContext2D, world: World, seat: RegionSeat,
    originX: number, originY: number, camX: number, camY: number, vw: number, vh: number): void {
    const def = world.zoneMap[seat.zoneId];
    const mint = world.seamlessMints.get(seat.zoneId);
    if (!def || def.boundless || !mint) return; // no mint = stand down
    const w = mint.span.w || def.size.w, h = mint.span.h || def.size.h;
    const lx = seat.originPx.x - originX, ly = seat.originPx.y - originY; // zone-local top-left
    if (lx > camX + vw || ly > camY + vh || lx + w < camX || ly + h < camY) return;
    let entry = this.bodies.get(seat.zoneId);
    if (!entry || entry.mint !== mint) {
      if (entry) releaseCanvas(entry.img);
      entry = this.bake(def, mint, w, h);
      this.bodies.delete(seat.zoneId); this.bodies.set(seat.zoneId, entry);
      while (this.bodies.size > SEAMLESS_DRAW_CFG.maxAway) {
        const oldest = this.bodies.keys().next().value;
        if (oldest === undefined) break;
        const old = this.bodies.get(oldest);
        if (old) releaseCanvas(old.img);
        this.bodies.delete(oldest);
      }
    } else {
      this.bodies.delete(seat.zoneId); this.bodies.set(seat.zoneId, entry); // LRU touch
    }
    ctx.drawImage(entry.img, lx, ly, entry.w, entry.h);
  }

  /** The disc bake: silhouette-clipped (an ellipse neighbor's corners stay
   *  transparent for the ground/tissue below), doodads as flat discs in
   *  ascending paint order (grounds under standing bodies) — the def's own
   *  params.color where it speaks hex, else a theme-derived dark. No
   *  painters, by the M0 law; no floor, no walls, no dim — the world-keyed
   *  chunks beneath are the real ground. */
  private bake(def: ZoneDef, mint: SeamlessMint, w: number, h: number): AwayEntry {
    const S = SEAMLESS_DRAW_CFG.awayScale;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * S));
    c.height = Math.max(1, Math.ceil(h * S));
    const g = c.getContext('2d')!;
    g.scale(S, S);
    if (awayShapeOf(def) === 'ellipse') {
      g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.clip();
    }
    const dressed = [...mint.layout.doodads].sort((a, b) => orderOf(a) - orderOf(b));
    for (const d of dressed) {
      const order = orderOf(d);
      g.globalAlpha = order < 44
        ? SEAMLESS_DRAW_CFG.groundDoodadAlpha : SEAMLESS_DRAW_CFG.standingDoodadAlpha;
      g.fillStyle = doodadToneOf(d, def.theme.floor);
      g.beginPath();
      g.arc(d.pos.x, d.pos.y, d.radius, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    return { img: c, w, h, at: ++this.seq, mint };
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
 *  makeArena is world-private and the mint stores only the span). The
 *  world-keyed ground chunks and the body bake both clip by it — the drift
 *  risk retires only when the world side stamps the shape onto the mint
 *  record itself (one line in seamlessMintResident, inside its scoped swap:
 *  `shape: this.arena.shape` on SeamlessMint — the deferred prescription;
 *  adopt it here as `mint.shape ?? awayShapeOf(def)` when it lands). */
export function awayShapeOf(def: ZoneDef): 'rect' | 'ellipse' {
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
const away = new SeamlessAwayBodies();

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

/** Everything past the active rim, seamless-mode: the tissue country, then
 *  each neighbor's full-fidelity world-keyed ground (the GroundRenderer's
 *  own away pass — chunks are cache peers with the active zone's, so the
 *  threshold crossing pops nothing), then its flat body discs over that.
 *  Runs under the world transform with the same (cam, view) frame
 *  drawVoidFrame takes; the caller has already gated on seamlessDrawActive
 *  and lends its ground renderer (the renderer owns the one instance). */
export function drawSeamlessCountry(ctx: CanvasRenderingContext2D, world: World,
  ground: GroundRenderer, camX: number, camY: number, vw: number, vh: number): void {
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
    ground.drawSeamlessAway(ctx, world, s, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
    away.draw(ctx, world, s, seat.originPx.x, seat.originPx.y, camX, camY, vw, vh);
  }
  ctx.restore();
}

// (The interim dev proof rig — ?seamrig, which installed the sampler and a
// current-zone seat fill before the placement lane landed — is gone: the
// real installer (World.seamlessEnsureBoot) stands, and a second seat-filler
// would fight the resident pair it picks. Plain ?seamless is the whole boot.)
