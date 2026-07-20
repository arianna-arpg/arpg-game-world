// ---------------------------------------------------------------------------
// GROUND CHUNKS — the floor, baked. Each visible chunk of the zone renders
// once into an offscreen canvas: theme-derived noise mottle, sparse speckle
// details (tufts where the theme grows grass, pebbles everywhere, embers
// where it declares lava), a whisper of the old reference grid, the walk
// grid's STATIC region visuals, themed wall cells with bevels, and contact
// occlusion where floor meets wall. Runtime is a handful of drawImage calls.
//
// Everything derives from the zone's OWN theme colors + the region-kind
// registry — no biome enumerations here. Chunks key on the walk grid's
// version, so a broken door or a terraform repaints itself. Animated region
// visuals (flesh throb, water drift) intentionally do NOT bake — the renderer
// overlays them live.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { TILESETS } from '../../data/tilesets';
import type { ZoneTheme } from '../../data/zones';
import { compileBlendField, type BlendSampler } from '../../engine/blend';
import type { Doodad } from '../../engine/levelgen';
import type { World } from '../../engine/world';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind, type RegionVisualSpec } from '../../world/regions';
import { linkSpanOf, tierElevOf, tierFloorAt } from '../../engine/tiers';
import { adjust, hash01, mix, shade, valueNoise, withAlpha } from './color';
import { wallEyeSockets } from './wallEyes';
import { liquidBodyIsLive, paintBlendUnderlay, paintLiquidStatics, type DoodadVisualDef } from './painters';
import { paintStructureFloors } from './floors';
import { releaseCanvas } from './sprites';
import { VIS_ABLATE, VIS_CFG, VIS_TELEMETRY } from './visConfig';

function strSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0) % 100000;
}

/** Per-mottle-cell distance to the nearest disc EDGE, as a chamfer distance
 *  transform over a padded cell grid: stamp every cell whose center lies
 *  inside a disc to 0, then two 3-4 chamfer sweeps. The positional-palette
 *  rules (coast wet-fade, clearing sun-wells) are functions of MIN edge
 *  distance, so one field answers every cell in O(cells) — the old per-cell ×
 *  per-disc loop hit ~500k hypots per chunk under a sealed forest canopy
 *  (hundreds of crowns in presence reach) and baked at ~40ms: a visible
 *  hitch at every chunk boundary while walking. Half-cell quantization on a
 *  ≥85px soft gradient is invisible. */
interface EdgeField { d: Float32Array; cols: number; pad: number; cell: number }

function edgeDistanceField(discs: readonly { x: number; y: number; r: number }[],
  ox: number, oy: number, C: number, cell: number, maxReach: number): EdgeField {
  const pad = Math.ceil(maxReach / cell) + 1;
  const cols = Math.ceil(C / cell) + pad * 2;
  const n = cols * cols;
  const d = new Float32Array(n).fill(1e9);
  const gx0 = ox - pad * cell, gy0 = oy - pad * cell; // world origin of the padded grid
  for (const disc of discs) {
    const r2 = disc.r * disc.r;
    const cx0 = Math.max(0, Math.floor((disc.x - disc.r - gx0) / cell));
    const cx1 = Math.min(cols - 1, Math.floor((disc.x + disc.r - gx0) / cell));
    const cy0 = Math.max(0, Math.floor((disc.y - disc.r - gy0) / cell));
    const cy1 = Math.min(cols - 1, Math.floor((disc.y + disc.r - gy0) / cell));
    for (let cy = cy0; cy <= cy1; cy++) {
      const wy = gy0 + (cy + 0.5) * cell - disc.y;
      for (let cx = cx0; cx <= cx1; cx++) {
        const wx = gx0 + (cx + 0.5) * cell - disc.x;
        if (wx * wx + wy * wy <= r2) d[cy * cols + cx] = 0;
      }
    }
  }
  const orth = cell, diag = cell * 1.4;
  // Forward sweep (top-left → bottom-right), then backward.
  for (let cy = 0; cy < cols; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      let v = d[i];
      if (cx > 0) v = Math.min(v, d[i - 1] + orth);
      if (cy > 0) {
        v = Math.min(v, d[i - cols] + orth);
        if (cx > 0) v = Math.min(v, d[i - cols - 1] + diag);
        if (cx < cols - 1) v = Math.min(v, d[i - cols + 1] + diag);
      }
      d[i] = v;
    }
  }
  for (let cy = cols - 1; cy >= 0; cy--) {
    for (let cx = cols - 1; cx >= 0; cx--) {
      const i = cy * cols + cx;
      let v = d[i];
      if (cx < cols - 1) v = Math.min(v, d[i + 1] + orth);
      if (cy < cols - 1) {
        v = Math.min(v, d[i + cols] + orth);
        if (cx < cols - 1) v = Math.min(v, d[i + cols + 1] + diag);
        if (cx > 0) v = Math.min(v, d[i + cols - 1] + diag);
      }
      d[i] = v;
    }
  }
  return { d, cols, pad, cell };
}

/** Sample an edge field at a chunk-local mottle cell origin (gx, gy). */
function edgeDistAt(f: EdgeField, gx: number, gy: number): number {
  const cx = Math.floor(gx / f.cell) + f.pad;
  const cy = Math.floor(gy / f.cell) + f.pad;
  return f.d[cy * f.cols + cx];
}

/** One kind's full group + reach, gathered once per zone, for everything
 *  that is STATIC per zone and so bakes with the floor: terrain-meld blend
 *  beds and liquid bodies (rim/core/inner union fills). */
interface StaticGroup {
  def: DoodadVisualDef; list: Doodad[]; pad: number;
  blend: boolean; body: boolean;
}

/** One live chunk: its bake, the walk version + beds rev it reflects, and a
 *  monotonic bake stamp (`at`) — the stale queue re-bakes OLDEST first. */
/** One cached floor chunk. `img` is an ImageBitmap on the async-upload path
 *  (null until its first snapshot lands — the flat stand-in draws meanwhile),
 *  or a plain canvas on the legacy sync path. `pending` marks a snapshot in
 *  flight so the stale scan doesn't re-enqueue it every frame. */
interface ChunkEntry { img: HTMLCanvasElement | ImageBitmap | null; pending: boolean; v: number; b: number; at: number }

/** Free a chunk image either way (bitmaps close, canvases zero their store). */
function dropChunkImg(img: HTMLCanvasElement | ImageBitmap | null): void {
  if (!img) return;
  if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) img.close();
  else releaseCanvas(img as HTMLCanvasElement);
}

export class GroundRenderer {
  private chunks = new Map<string, ChunkEntry>();
  private zoneRef: unknown = null;
  private seed = 0;
  private staticGroups: StaticGroup[] = [];
  /** Gather keys — identity, length, rev: the doodadsAt/veilIndex idiom, so
   *  in-place mutations (markDoodadsChanged) re-sync too, and a same-frame
   *  pop+push that nets the same length can't slip through. */
  private staticArr: unknown = null;
  private staticLen = -1;
  private staticRev = -1;
  /** Every baked-kind doodad as of the last gather with the reach rect its
   *  bed/body paints — the identity-keyed diff source for localized
   *  staleness. */
  private prevBaked = new Map<Doodad, { kind: string; x0: number; y0: number; x1: number; y1: number }>();
  private bedsPrimed = false;
  /** Monotonic revision of the baked bed/body set. Changes push their reach
   *  rects onto `bedsDirty` (a bounded ring — overflow raises the flood rev),
   *  so a brittle pop or a melting ice patch stales ONLY the chunks it
   *  touches. The old count-keyed rev staled every chunk in the cache on any
   *  doodad-list change: under churn (temp-ground builds, event spawns) the
   *  whole viewport re-staled every few frames, the per-frame rebake budget
   *  was eaten forever by the first chunks in scan order, and everything
   *  after them starved — on a melting shelf that read as voided clouds
   *  whose visuals never punched through. */
  private bedsRev = 0;
  private bedsDirty: { x0: number; y0: number; x1: number; y1: number; rev: number }[] = [];
  private bedsFloodRev = 0;
  /** Monotonic bake sequence, stamped per bake (see ChunkEntry.at). */
  private bakeSeq = 0;
  /** THE ASYNC UPLOAD SWAP (VIS_CFG.ground.asyncUpload): rebakes raster into
   *  ONE reused scratch canvas, snapshot through createImageBitmap off the
   *  hot path, and the chunk keeps blitting its OLD image until the bitmap
   *  lands — because the hitch was never the raster: blitting a canvas that
   *  was JUST mutated re-uploads its whole texture synchronously INSIDE
   *  drawImage (the self-profiler pinned ~all spike time on the native
   *  drawImage leaf during flood-front wake stamping), and a bitmap swap
   *  moves that upload off the frame entirely. One snapshot in flight at a
   *  time — the queue is just "still stale next frame". */
  private scratch: HTMLCanvasElement | null = null;
  private snapAt = 0;
  private zoneEpoch = 0;
  /** THE BLEND (engine/blend.ts), memoized per zone: the compiled weight
   *  field + the partner tileset's theme a blended zone's bakes mix toward.
   *  null entry = the zone is unblended (the common case, zero cost). */
  private blendMemo: { zoneId: string; info: { at: BlendSampler; theme: ZoneTheme } | null } | null = null;

  /** Resolve (and memoize) the current zone's blend for the bake passes. */
  private blendFor(world: World): { at: BlendSampler; theme: ZoneTheme } | null {
    const z = world.zone;
    if (this.blendMemo?.zoneId === z.id) return this.blendMemo.info;
    const partner = z.blend ? TILESETS[z.blend.with]?.theme : undefined;
    const info = z.blend && partner
      ? { at: compileBlendField(z.blend.field, { w: z.size.w, h: z.size.h }, z.seed ?? 0), theme: partner }
      : null;
    this.blendMemo = { zoneId: z.id, info };
    return info;
  }

  /** Blit the visible floor. The caller owns any arena clip (rect/ellipse).
   *  Chunks carry the walk-grid version + beds rev they baked at; a repaint
   *  re-bakes ONLY the chunks its dirty rects touched, spread over frames by
   *  a budget (a stale chunk keeps drawing its old self until its turn) — so
   *  a door break or a crawling fissure never rebakes a whole screen in one
   *  frame. Three phases: inventory the window, bake fairly (never-baked
   *  first, then stale OLDEST-BAKE-first — the old single scan spent the
   *  whole budget on the first stale chunks in reading order every frame, so
   *  under sustained churn the bottom of the screen never repainted), then
   *  blit in spatial order. */
  draw(ctx: CanvasRenderingContext2D, world: World,
    camX: number, camY: number, vw: number, vh: number): void {
    if (VIS_ABLATE.has('ground')) return; // perf forensics (visConfig)
    if (this.zoneRef !== world.zone) {
      // Release the old zone's whole cache NOW (≈ maxChunks × chunk² of
      // pixels): left to the GC, a few zone hops of discarded floors pile
      // up GPU-side and the collection lands as a hitch storm mid-play.
      for (const e of this.chunks.values()) dropChunkImg(e.img);
      this.chunks.clear();
      this.zoneEpoch++; // in-flight snapshots for the old zone land dead
      this.snapAt = 0;
      this.zoneRef = world.zone;
      this.seed = strSeed(`${world.zone.id}|${world.zone.name}`);
      // Re-arm the static gather for the new zone.
      this.staticArr = null; this.staticLen = -1; this.staticRev = -1;
      this.prevBaked.clear();
      this.bedsDirty.length = 0;
      this.bedsPrimed = false;
      this.blendMemo = null;
    }
    if (VIS_CFG.ground.bakeBlend || VIS_CFG.ground.bakeLiquidBody) this.syncStaticGroups(world);
    const C = VIS_CFG.ground.chunk;
    const wf = world.walk instanceof GridWalkField ? world.walk : null;
    const ver = wf ? wf.version : 0;
    let x0 = Math.floor(camX / C), x1 = Math.floor((camX + vw) / C);
    let y0 = Math.floor(camY / C), y1 = Math.floor((camY + vh) / C);
    if (!world.arena.boundless) {
      x0 = Math.max(0, x0); y0 = Math.max(0, y0);
      x1 = Math.min(Math.floor(Math.max(0, world.arena.w - 1) / C), x1);
      y1 = Math.min(Math.floor(Math.max(0, world.arena.h - 1) / C), y1);
    }
    const bakeT0 = performance.now();
    const budgetLeft = (): boolean =>
      performance.now() - bakeT0 < VIS_CFG.ground.bakeBudgetMs;

    // The async swap needs createImageBitmap and the config's word; the
    // legacy sync path stays whole behind the same branch (ablate/rollback).
    const async = VIS_CFG.ground.asyncUpload && typeof createImageBitmap === 'function';
    // A wedged snapshot (hidden tab, driver loss) must not dam the pipe
    // forever — past this age the next one may start over it. Checked LIVE
    // at each start site, so a snap begun this very frame never reads as
    // wedged to a later pass.
    const snapBusy = (): boolean => {
      if (this.snapAt === 0) return false;
      if (performance.now() - this.snapAt <= 500) return true;
      this.snapAt = 0; // wedged — stop waiting on it
      return false;
    };

    // --- PASS 1: inventory the visible window. LRU-touch live entries; sort
    // what needs work into never-baked vs stale (walk repaint or bed change).
    const missing: { key: string; cx: number; cy: number }[] = [];
    const stale: { entry: ChunkEntry; key: string; cx: number; cy: number }[] = [];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${cx},${cy}`;
        const entry = this.chunks.get(key);
        if (!entry) { missing.push({ key, cx, cy }); continue; }
        this.chunks.delete(key); this.chunks.set(key, entry); // LRU touch
        if (entry.pending) continue; // its snapshot is already in flight
        const bedsStale = entry.b < this.bedsFloodRev
          || this.bedsTouched(entry.b, cx * C, cy * C, C);
        if (bedsStale || (wf && entry.v < ver)) {
          const touched = bedsStale
            || (wf ? this.chunkStale(wf, entry.v, cx * C, cy * C, C) : false);
          // Untouched by any repaint — just adopt the current stamps.
          if (!touched) { entry.v = ver; entry.b = this.bedsRev; }
          else stale.push({ entry, key, cx, cy });
        }
      }
    }

    // --- PASS 2: bake. Never-baked chunks first (ONE is always allowed —
    // streaming must progress; the rest hold to the time budget), then stale
    // chunks oldest-bake-first under the count + time budgets. Sync path: a
    // stale chunk re-bakes INTO its own canvas — zero alloc (the old
    // release+create pair churned ~0.8MB of backing store per rebake). Async
    // path: the raster lands in the shared scratch and the SWAP waits for
    // the bitmap — the chunk's live image is never mutated, so blitting it
    // stays a texture reference, never a re-upload.
    let rebakes = 0;
    let bakedNew = false;
    for (const m of missing) {
      if (bakedNew && !budgetLeft()) break; // stand in flat this frame
      if (async) {
        if (snapBusy()) break; // one snapshot at a time
        this.startSnap(world, wf, m.cx, m.cy, m.key, null, ver);
      } else {
        this.chunks.set(m.key,
          { img: this.bake(world, wf, m.cx, m.cy), pending: false, v: ver, b: this.bedsRev, at: ++this.bakeSeq });
      }
      bakedNew = true;
      this.evictOverCap();
    }
    stale.sort((a, b) => a.entry.at - b.entry.at);
    for (const s of stale) {
      if (rebakes >= VIS_CFG.ground.rebakesPerFrame || !budgetLeft()) break;
      if (async) {
        if (snapBusy()) break;
        this.startSnap(world, wf, s.cx, s.cy, s.key, s.entry, ver);
      } else {
        s.entry.img = this.bake(world, wf, s.cx, s.cy, s.entry.img as HTMLCanvasElement);
        s.entry.v = ver; s.entry.b = this.bedsRev; s.entry.at = ++this.bakeSeq;
      }
      rebakes++;
    }

    // --- PASS 3: blit the window in spatial order. Chunks whose bake (or
    // whose first snapshot) didn't land yet draw the flat floor stand-in, or
    // their old self until the swap comes.
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const entry = this.chunks.get(`${cx},${cy}`);
        if (entry?.img) {
          ctx.drawImage(entry.img, cx * C, cy * C);
        } else {
          ctx.fillStyle = world.zone.theme.floor;
          ctx.fillRect(cx * C, cy * C, C, C);
        }
      }
    }
    // PREFETCH: bake at most one not-yet-baked chunk in the ring just
    // outside the viewport, so walking streams floor in ahead of arrival
    // instead of hitching the frame a new column first appears on.
    if (rebakes === 0 && budgetLeft() && (!async || !snapBusy())) {
      let bx0 = x0 - 1, bx1 = x1 + 1, by0 = y0 - 1, by1 = y1 + 1;
      if (!world.arena.boundless) {
        bx0 = Math.max(0, bx0); by0 = Math.max(0, by0);
        bx1 = Math.min(Math.floor(Math.max(0, world.arena.w - 1) / C), bx1);
        by1 = Math.min(Math.floor(Math.max(0, world.arena.h - 1) / C), by1);
      }
      outer: for (let cy = by0; cy <= by1; cy++) {
        for (let cx = bx0; cx <= bx1; cx++) {
          if (cy >= y0 && cy <= y1 && cx >= x0 && cx <= x1) continue; // visible: handled above
          const key = `${cx},${cy}`;
          if (this.chunks.get(key)) continue;
          if (async) {
            this.startSnap(world, wf, cx, cy, key, null, ver);
          } else {
            this.chunks.set(key,
              { img: this.bake(world, wf, cx, cy), pending: false, v: ver, b: this.bedsRev, at: ++this.bakeSeq });
          }
          this.evictOverCap();
          break outer;
        }
      }
    }
  }

  /** Raster a chunk into the shared scratch, then snapshot it into an
   *  ImageBitmap OFF the frame and swap it in when it lands. The entry keeps
   *  its old image (or the flat stand-in) meanwhile — exactly the contract
   *  stale chunks always had, now covering the upload too. Serialized: one
   *  snapshot in flight, the rest stay stale and re-enter next frame. */
  private startSnap(world: World, wf: GridWalkField | null, cx: number, cy: number,
    key: string, entry: ChunkEntry | null, ver: number): void {
    const C = VIS_CFG.ground.chunk;
    if (!this.scratch) this.scratch = document.createElement('canvas');
    this.bake(world, wf, cx, cy, this.scratch);
    const e: ChunkEntry = entry
      ?? { img: null, pending: false, v: ver, b: this.bedsRev, at: ++this.bakeSeq };
    if (!entry) this.chunks.set(key, e);
    e.pending = true;
    const epoch = this.zoneEpoch;
    const bRev = this.bedsRev;
    const seq = ++this.bakeSeq;
    this.snapAt = performance.now();
    createImageBitmap(this.scratch, 0, 0, C, C).then(bmp => {
      if (this.snapAt !== 0) this.snapAt = 0;
      // The world moved on while we uploaded? A dead snapshot closes quietly:
      // zone swapped (epoch), or the entry was evicted from the cache.
      if (epoch !== this.zoneEpoch || this.chunks.get(key) !== e) { bmp.close(); return; }
      dropChunkImg(e.img);
      e.img = bmp;
      e.pending = false;
      e.v = ver; e.b = bRev; e.at = seq;
    }).catch(() => {
      if (this.snapAt !== 0) this.snapAt = 0;
      if (epoch === this.zoneEpoch && this.chunks.get(key) === e) e.pending = false;
    });
  }

  /** Drop least-recently-used chunks past the cache cap, freeing their
   *  backing stores eagerly (see releaseCanvas). */
  private evictOverCap(): void {
    while (this.chunks.size > VIS_CFG.ground.maxChunks) {
      const oldest = this.chunks.keys().next().value;
      if (oldest === undefined) break;
      const old = this.chunks.get(oldest);
      if (old) dropChunkImg(old.img);
      this.chunks.delete(oldest);
    }
  }

  /** Did any repaint since `bakedV` touch this chunk's rect? Padded by one
   *  walk cell: the bake reads a one-cell ring PAST its border (rim edges,
   *  bevels, contact AO), so a repaint just outside — a melt on the far side
   *  of a chunk seam — must stale this side's cloud-lip too. Falls back to
   *  stale when the dirty ring has already dropped rects that new. */
  private chunkStale(wf: GridWalkField, bakedV: number, ox: number, oy: number, C: number): boolean {
    if (bakedV <= wf.dirtyFloodV) return true;
    const pad = wf.cell;
    for (const r of wf.dirty) {
      if (r.v <= bakedV) continue;
      if (r.x1 < ox - pad || r.x0 > ox + C + pad || r.y1 < oy - pad || r.y0 > oy + C + pad) continue;
      return true;
    }
    return false;
  }

  /** Did any baked bed/body CHANGE since `bakedB` touch this chunk's rect?
   *  (The rects already carry their full blend reach — no extra pad.) */
  private bedsTouched(bakedB: number, ox: number, oy: number, C: number): boolean {
    for (const r of this.bedsDirty) {
      if (r.rev <= bakedB) continue;
      if (r.x1 < ox || r.x0 > ox + C || r.y1 < oy || r.y0 > oy + C) continue;
      return true;
    }
    return false;
  }

  /** Gather (or re-gather when the doodad list changed) every kind whose
   *  blend bed and/or liquid body bakes with the floor, then DIFF the baked
   *  set against the last gather (object identity) and stale only what a
   *  change actually reaches. MARK, never clear: live chunks keep drawing
   *  their old bake and re-bake through the per-frame budget, so a mid-fight
   *  barrel pop costs a few staggered LOCAL rebakes — not one whole-screen
   *  hitch, and not (the count-keyed rev's failure) a whole-viewport
   *  staleness storm on every temp-ground tick. Bake-time consumers only —
   *  the gather itself re-runs only when (identity, length, rev) move. */
  private syncStaticGroups(world: World): void {
    if (this.staticArr === world.doodads && this.staticLen === world.doodads.length
      && this.staticRev === world.doodadRev) return;
    this.staticArr = world.doodads;
    this.staticLen = world.doodads.length;
    this.staticRev = world.doodadRev;
    const byKind = new Map<string, Doodad[]>();
    for (const d of world.doodads) {
      const def = DOODAD_VISUALS[d.kind];
      if (!def) continue;
      const blend = VIS_CFG.ground.bakeBlend && def.blend && !def.blend.live;
      const body = def.painter === 'liquid' && !liquidBodyIsLive(def);
      if (!blend && !body) continue;
      const arr = byKind.get(d.kind);
      if (arr) arr.push(d); else byKind.set(d.kind, [d]);
    }
    this.staticGroups = [];
    const next = new Map<Doodad, { kind: string; x0: number; y0: number; x1: number; y1: number }>();
    let flood = false;
    for (const [kind, list] of byKind) {
      const def = DOODAD_VISUALS[kind]!;
      let maxR = 0;
      for (const d of list) maxR = Math.max(maxR, d.radius);
      const blend = !!(VIS_CFG.ground.bakeBlend && def.blend && !def.blend.live);
      // pathBand strokes whole segments: a neighbour up to (rA+rB)·1.35 away
      // can reach into this chunk, so pad by the worst span, not just feather.
      // Blob pad 1.4·maxR covers melt crust plates spilling into the union.
      const pad = (blend ? def.blend!.feather : 0)
        + maxR * (def.blend?.mode === 'path' ? 3.7 : 1.4) + 8; // +8: rim/core grow
      this.staticGroups.push({
        def, list, pad, blend,
        body: def.painter === 'liquid' && !liquidBodyIsLive(def),
      });
      for (const d of list) {
        const reach = d.radius + pad;
        next.set(d, {
          kind,
          x0: d.pos.x - reach, y0: d.pos.y - reach,
          x1: d.pos.x + reach, y1: d.pos.y + reach,
        });
      }
    }
    this.staticGroups.sort((a, b) => (a.def.order ?? 50) - (b.def.order ?? 50));

    // First gather of a zone: nothing is baked yet — adopt without staling.
    if (!this.bedsPrimed) {
      this.bedsPrimed = true;
      this.prevBaked = next;
      return;
    }
    // THE DIFF: appeared, vanished, or reshaped since the last gather. A
    // 'path' blend kind floods instead — pathBand strokes whole CHAINS, so a
    // changed node redraws segments far beyond its own reach (runtime path
    // changes are rare; roads are generation-time).
    const changed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const mark = (kind: string, r: { x0: number; y0: number; x1: number; y1: number }): void => {
      if (DOODAD_VISUALS[kind]?.blend?.mode === 'path') flood = true;
      else changed.push(r);
    };
    for (const [d, r] of next) {
      const old = this.prevBaked.get(d);
      if (!old) { mark(r.kind, r); continue; }
      this.prevBaked.delete(d); // consumed — whatever remains has vanished
      if (old.kind !== r.kind || old.x0 !== r.x0 || old.y0 !== r.y0
        || old.x1 !== r.x1 || old.y1 !== r.y1) {
        mark(old.kind, old);
        mark(r.kind, r);
      }
    }
    for (const [, old] of this.prevBaked) mark(old.kind, old);
    this.prevBaked = next;
    if (!flood && !changed.length) return; // churn was all non-baked kinds — nothing stales
    this.bedsRev++;
    if (flood) {
      this.bedsFloodRev = this.bedsRev;
      this.bedsDirty.length = 0;
    } else {
      for (const r of changed) this.bedsDirty.push({ ...r, rev: this.bedsRev });
      while (this.bedsDirty.length > VIS_CFG.ground.bedsDirtyMax) {
        const dropped = this.bedsDirty.shift()!;
        this.bedsFloodRev = Math.max(this.bedsFloodRev, dropped.rev);
      }
    }
  }

  /** Bake one chunk. Pass `reuse` (the chunk's outgoing canvas) on a REBAKE:
   *  re-setting width resets the surface in place, so a continuously-melting
   *  floor re-bakes into the same backing store instead of churning a fresh
   *  ~0.8MB canvas per rebake through the allocator (the GC-hitch tax). */
  private bake(world: World, wf: GridWalkField | null, cx: number, cy: number,
    reuse?: HTMLCanvasElement): HTMLCanvasElement {
    VIS_TELEMETRY.groundBakes++;
    const CFG = VIS_CFG.ground;
    const C = CFG.chunk;
    const theme = world.zone.theme;
    const c = reuse ?? document.createElement('canvas');
    c.width = C; c.height = C;
    const ctx = c.getContext('2d')!;
    const ox = cx * C, oy = cy * C; // world coords of the chunk origin

    // --- Base + noise mottle: the floor stops being one flat rectangle. ---
    // The tone swing is HUE-PRESERVING: lightness moves, saturation gets a
    // small boost, hue drifts warm on the lit side / cool on the shaded side
    // — so the ground reads as MORE of the biome's color, never a greyscale
    // grain over it (mixing toward pure white/black desaturates; the first
    // draft did exactly that and every floor washed out to salt-and-pepper).
    // Value noise clusters near 0.5, so a contrast curve widens the hump.
    // Per-theme GROUND STYLE (ZoneTheme.ground) scales the features: a
    // desert rolls 2.5×-stretched dunes, a grove keeps the fine mottle.
    const gs = theme.ground ?? {};
    const strength = gs.strength ?? 1;
    const alphaCap = gs.alpha ?? CFG.mottleAlpha;
    const dark = mix(adjust(theme.floor, 8, 1.3, -0.075 * strength), theme.grid, 0.18);
    const light = adjust(theme.floor, -7, 1.22, 0.08 * strength);
    // BIAS: skew the noise toward the light end (>0.5) or the dark end
    // (<0.5) via a power curve — "less black, more flourish" is one number.
    const bias = clamp(gs.bias ?? 0.5, 0.08, 0.92);
    const biasExp = Math.log(1 - bias) / Math.log(0.5);
    // PALETTE: a multi-stop gradient the noise samples — full floor art
    // direction as data. Alpha rises toward the swatch ends so mid-noise
    // stays translucent and the base floor breathes through.
    const pal = gs.palette && gs.palette.length >= 2 ? gs.palette : null;
    // THE BLEND (engine/blend.ts): a blended zone samples BOTH themes' mottle
    // per cell and mixes by the weight field — the partner country's own
    // ground style (palette, grain scale, bias) reads at its end, the run
    // between them a true rasterized transition. Unblended zones (blend ==
    // null, the common case) skip every branch below.
    const blend = this.blendFor(world);
    const bTheme = blend?.theme;
    const bgs = bTheme?.ground ?? {};
    const bStrength = bgs.strength ?? 1;
    const bAlphaCap = bgs.alpha ?? CFG.mottleAlpha;
    const bDark = bTheme ? mix(adjust(bTheme.floor, 8, 1.3, -0.075 * bStrength), bTheme.grid, 0.18) : '';
    const bLight = bTheme ? adjust(bTheme.floor, -7, 1.22, 0.08 * bStrength) : '';
    const bBias = clamp(bgs.bias ?? 0.5, 0.08, 0.92);
    const bBiasExp = Math.log(1 - bBias) / Math.log(0.5);
    const bPal = bgs.palette && bgs.palette.length >= 2 ? bgs.palette : null;
    /** One palette gradient sample (shared by both sides). */
    const palCol = (p: string[], t0: number): string => {
      const t = t0 * (p.length - 1);
      const i = Math.min(p.length - 2, Math.floor(t));
      return mix(p[i], p[i + 1], t - i);
    };
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, C, C);
    const cell = CFG.cell;
    const ns = CFG.noiseScale / (gs.scale ?? 1);
    const nsx = ns / (gs.stretchX ?? 1);
    const bNs = CFG.noiseScale / (bgs.scale ?? 1);
    const bNsx = bNs / (bgs.stretchX ?? 1);
    // POSITIONAL PALETTE RULES (palette themes only): gather this chunk's
    // nearby feature discs ONCE, then slide each cell's gradient sample by
    // proximity — a wet fade hugging every waterline (`coast`), a sun-well
    // where no crown covers (`clearing`). Bake-time cost only.
    const coast = pal ? gs.coast : undefined;
    const clearing = pal ? gs.clearing : undefined;
    const coastReach = coast?.reach ?? 90;
    const clearReach = clearing?.reach ?? 130;
    const waterKinds = coast?.kinds ?? ['water', 'deep_water'];
    type Disc = { x: number; y: number; r: number };
    const near = (pad: number, want: (k: string) => boolean): Disc[] => {
      const out: Disc[] = [];
      for (const d of world.doodads) {
        if (!want(d.kind)) continue;
        if (d.pos.x + d.radius + pad < ox || d.pos.x - d.radius - pad > ox + C
          || d.pos.y + d.radius + pad < oy || d.pos.y - d.radius - pad > oy + C) continue;
        out.push({ x: d.pos.x, y: d.pos.y, r: d.radius });
      }
      return out;
    };
    const waterDiscs = coast ? near(coastReach, k => waterKinds.includes(k)) : [];
    // Crowns influence out to the PRESENCE ring (a clearing is only a clearing
    // when canopy stands near-but-not-over) — pad the gather to the full ring
    // or the effect seams at chunk borders.
    const presenceReach = clearReach * 2.2;
    const crownDiscs = clearing
      ? near(presenceReach, k => !!DOODAD_VISUALS[k]?.canopy) : [];
    // Both positional rules read MIN distance-to-nearest-edge — one chamfer
    // field each answers every cell (see edgeDistanceField; the per-cell ×
    // per-disc form was the forest's 40ms chunk-bake hitch).
    const coastField = waterDiscs.length
      ? edgeDistanceField(waterDiscs, ox, oy, C, cell, coastReach) : null;
    const crownField = crownDiscs.length
      ? edgeDistanceField(crownDiscs, ox, oy, C, cell, presenceReach) : null;
    for (let gy = 0; gy < C; gy += cell) {
      for (let gx = 0; gx < C; gx += cell) {
        const nn = valueNoise((ox + gx) * nsx, (oy + gy) * ns, this.seed);
        let n = clamp(0.5 + (nn - 0.5) * 2.6, 0, 1);
        if (biasExp !== 1) n = 1 - Math.pow(1 - n, biasExp);
        if (coast && coastField) {
          // Proximity 1 at the water's edge → 0 at reach; slide the sample.
          const de = edgeDistAt(coastField, gx, gy);
          if (de < coastReach) {
            const prox = 1 - Math.max(0, de) / coastReach;
            n = clamp(n + coast.shift * prox, 0, 1);
          }
        }
        if (clearing && crownField) {
          // A CLEARING is a gap IN a forest: glow needs crowns NEAR (presence)
          // but not OVER (cover). Open country far from any crown gets no lift
          // — otherwise a sparse meadow washes wall-to-wall (it did).
          const de = edgeDistAt(crownField, gx, gy);
          const cover = de <= 0 ? 1 : de < clearReach ? 1 - de / clearReach : 0;
          const presence = de < presenceReach ? 1 - de / presenceReach : 0;
          const glow = presence * (1 - cover);
          if (glow > 0) n = clamp(n + clearing.lift * glow, 0, 1);
        }
        let col: string;
        let a: number;
        if (pal) {
          col = palCol(pal, n);
          // Coverage shaping: by default the gradient's MIDDLE thins so the
          // base floor patches through (mottle); `evenness` flattens that
          // toward uniform strength — a pure color-to-color blend.
          const shaped = 0.4 + 0.6 * Math.abs(n - 0.5) * 2;
          const even = clamp(gs.evenness ?? 0, 0, 1);
          a = alphaCap * strength * (shaped + (1 - shaped) * even);
        } else if (n < 0.5) {
          a = Math.min(1, (0.5 - n) * 2) * alphaCap;
          col = dark;
        } else {
          a = Math.min(1, (n - 0.5) * 2) * alphaCap;
          col = light;
        }
        // BLEND MIX: where the partner's weight rises, its floor coats the
        // cell (the base coat its mottle expects) and its own noise sample —
        // its grain scale, bias, palette — mixes over the base side's.
        if (blend && bTheme) {
          const wb = blend.at(ox + gx, oy + gy);
          if (wb > 0.004) {
            ctx.globalAlpha = wb;
            ctx.fillStyle = bTheme.floor;
            ctx.fillRect(gx, gy, cell, cell);
            const nn2 = valueNoise((ox + gx) * bNsx, (oy + gy) * bNs, this.seed + 47);
            let n2 = clamp(0.5 + (nn2 - 0.5) * 2.6, 0, 1);
            if (bBiasExp !== 1) n2 = 1 - Math.pow(1 - n2, bBiasExp);
            let col2: string;
            let a2: number;
            if (bPal) {
              col2 = palCol(bPal, n2);
              const shaped2 = 0.4 + 0.6 * Math.abs(n2 - 0.5) * 2;
              const even2 = clamp(bgs.evenness ?? 0, 0, 1);
              a2 = bAlphaCap * bStrength * (shaped2 + (1 - shaped2) * even2);
            } else if (n2 < 0.5) {
              a2 = Math.min(1, (0.5 - n2) * 2) * bAlphaCap;
              col2 = bDark;
            } else {
              a2 = Math.min(1, (n2 - 0.5) * 2) * bAlphaCap;
              col2 = bLight;
            }
            col = wb >= 1 ? col2 : mix(col, col2, wb);
            a = a + (a2 - a) * wb;
          }
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.fillRect(gx, gy, cell, cell);
      }
    }
    ctx.globalAlpha = 1;

    // --- Speckle: sparse details from the theme's own vocabulary. ---------
    // Tufts only where the theme declares grass; embers only where it
    // declares lava; pebbles from the obstacle tone everywhere. The ground
    // style scales density (a dune sea is bare; a forest floor is busy).
    const n = Math.round(CFG.speckles * (gs.speckles ?? 1));
    for (let i = 0; i < n; i++) {
      const sx = hash01(cx * 31 + i, cy * 17, this.seed) * C;
      const sy = hash01(cx * 13, cy * 41 + i, this.seed + 7) * C;
      const roll = hash01(i, cx * 7 + cy * 3, this.seed + 13);
      // BLENDED SPECKLES speak the vocabulary of whichever country holds
      // that spot (a dither vs the weight — bone chips on one side, grass
      // tufts on the other; discrete details PICK a side, never tint-mix).
      const th = blend && bTheme
        && hash01(i * 53, cx * 19 + cy * 7, this.seed + 91) < blend.at(ox + sx, oy + sy)
        ? bTheme : theme;
      ctx.globalAlpha = CFG.speckleAlpha;
      if (th.grass && roll < 0.4) {
        ctx.strokeStyle = th.grass;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 2); ctx.lineTo(sx - 2, sy - 3);
        ctx.moveTo(sx, sy + 2); ctx.lineTo(sx + 2, sy - 4);
        ctx.stroke();
      } else if (th.lava && roll > 0.9) {
        ctx.fillStyle = shade(th.lava, 0.35);
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const tone = roll > 0.65 ? shade(th.obstacle, 0.15) : mix(th.floor, th.obstacle, 0.5);
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 1.5 + roll * 2.2, 1.1 + roll * 1.6, roll * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // --- STATIC DOODAD LAYERS: blend beds + liquid bodies ------------------
    // The soft rings that mesh ground kinds into the land (DoodadVisualDef
    // .blend) and the rim/core/inner union fills of liquid pools are both
    // static per zone — they bake with the floor instead of re-rasterizing
    // merged group silhouettes several times per frame (kinds opt back into
    // the live passes via blend.live / params.liveBody). Painted in
    // ascending kind order, exactly as the live pass layered them.
    if (this.staticGroups.length) {
      ctx.save();
      ctx.translate(-ox, -oy);
      const env = { ctx, theme, time: 0, world };
      for (const g of this.staticGroups) {
        // ONLY the discs whose reach touches this chunk: pixels inside the
        // chunk are identical either way, and a spiral's 3,000-disc lava
        // pour must never be path-built (or clipped against) per chunk —
        // that read as a multi-second bake spike on zone load. 'path' blend
        // groups are the exception: pathBand needs the CHAIN intact (a
        // filtered gap fakes a chain break), and roads stay small.
        const wholeChain = g.blend && g.def.blend!.mode === 'path';
        const sub: Doodad[] = [];
        for (const d of g.list) {
          if (d.pos.x + d.radius + g.pad < ox || d.pos.x - d.radius - g.pad > ox + C
            || d.pos.y + d.radius + g.pad < oy || d.pos.y - d.radius - g.pad > oy + C) continue;
          sub.push(d);
        }
        if (!sub.length) continue;
        if (g.blend) paintBlendUnderlay(env, wholeChain ? g.list : sub, g.def);
        if (g.body) paintLiquidStatics(env, sub, g.def);
      }
      ctx.restore();
    }

    // --- STRUCTURE FLOORS: boards/cobble/flagstone under buildings --------
    // (vis/floors.ts) — townsfolk don't live in the mud. Painted over the
    // mottle, under the walk-grid walls, baked once like everything here.
    paintStructureFloors(ctx, world, ox, oy, C);

    // --- The reference grid, now a whisper. -------------------------------
    if (CFG.gridAlpha > 0) {
      ctx.globalAlpha = CFG.gridAlpha;
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const step = CFG.gridStep;
      for (let x = Math.ceil(ox / step) * step; x <= ox + C; x += step) {
        ctx.moveTo(x - ox, 0); ctx.lineTo(x - ox, C);
      }
      for (let y = Math.ceil(oy / step) * step; y <= oy + C; y += step) {
        ctx.moveTo(0, y - oy); ctx.lineTo(C, y - oy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // --- Walk-grid pass: static region visuals, walls, bevel + AO. --------
    if (wf) this.bakeRegions(ctx, world, wf, ox, oy, C);
    return c;
  }

  /** Region cells inside (and one ring around) the chunk: static visuals fill
   *  over the mottle, walls take the themed fill with a lit/shaded bevel, and
   *  the floor picks up contact occlusion along wall edges — carved space. */
  private bakeRegions(ctx: CanvasRenderingContext2D, world: World,
    wf: GridWalkField, ox: number, oy: number, C: number): void {
    const CFG = VIS_CFG.ground;
    const theme = world.zone.theme;
    // CONTRAST GUARD: a biome whose wall tone sits within a whisker of its
    // floor (field greens on field greens) swallows the boundary — walls
    // must READ. If the luminance gap is too small, push the wall darker
    // (or lighter for near-black floors) until it clears the floor.
    const lum = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    };
    const guard = (wall: string, floor: string): string => {
      const gap = lum(wall) - lum(floor);
      if (Math.abs(gap) >= 0.09) return wall;
      return lum(floor) > 0.24 ? shade(wall, -0.35) : shade(wall, 0.3);
    };
    const wallFill = guard(theme.wall ?? theme.obstacle ?? '#07070b', theme.floor);
    const wallLit = shade(wallFill, 0.18);
    const wallDark = shade(wallFill, -0.3);
    // THE BLEND: wall tones mix toward the partner theme's (each guarded
    // against its OWN floor) by the weight at every wall cell — the tomb's
    // pale bone masonry gives way to sandstone exactly where the ground does.
    const blend = this.blendFor(world);
    const bWallFill = blend ? guard(blend.theme.wall ?? blend.theme.obstacle ?? '#07070b', blend.theme.floor) : '';
    const bWallLit = blend ? shade(bWallFill, 0.18) : '';
    const bWallDark = blend ? shade(bWallFill, -0.3) : '';
    /** The wall triple at a world position (mixed only when blended). */
    const wallAt = (wx: number, wy: number): { fill: string; lit: string; dark: string } => {
      if (!blend) return { fill: wallFill, lit: wallLit, dark: wallDark };
      const wb = blend.at(wx, wy);
      if (wb <= 0.004) return { fill: wallFill, lit: wallLit, dark: wallDark };
      if (wb >= 0.996) return { fill: bWallFill, lit: bWallLit, dark: bWallDark };
      return {
        fill: mix(wallFill, bWallFill, wb),
        lit: mix(wallLit, bWallLit, wb),
        dark: mix(wallDark, bWallDark, wb),
      };
    };
    const cell = wf.cell;
    const c0 = Math.max(0, Math.floor(ox / cell) - 1);
    const c1 = Math.min(wf.cols - 1, Math.floor((ox + C) / cell) + 1);
    const r0 = Math.max(0, Math.floor(oy / cell) - 1);
    const r1 = Math.min(wf.rows - 1, Math.floor((oy + C) / cell) + 1);
    const idAt = (gx: number, gy: number): string =>
      gx < 0 || gy < 0 || gx >= wf.cols || gy >= wf.rows
        ? 'wall' : wf.regionAt((gx + 0.5) * cell, (gy + 0.5) * cell);
    const isWall = (gx: number, gy: number): boolean => {
      const def = regionKind(idAt(gx, gy));
      return !def?.walkable && !def?.visual;
    };
    for (let gy = r0; gy <= r1; gy++) {
      for (let gx = c0; gx <= c1; gx++) {
        const id = idAt(gx, gy);
        if (id === 'ground') continue;
        const def = regionKind(id);
        const x = gx * cell - ox, y = gy * cell - oy;
        const vis = def?.visual;
        if (vis) {
          // WINDOW regions (RegionVisualSpec.window): PUNCH the cell clear —
          // erase base fill, mottle, speckle, beds, everything — so whatever
          // draws BENEATH the ground layer (the understory: the zone far
          // below a cloud shelf) shows through the hole. The rim edge below
          // still bakes: a torn cloud-lip around every gap.
          if (vis.window) {
            ctx.clearRect(x, y, cell + 0.6, cell + 0.6);
          } else if (!vis.animate) {
            // Static visuals bake; ANIMATED ones stay live (renderer overlay).
            ctx.globalAlpha = vis.alpha ?? 1;
            ctx.fillStyle = vis.fill;
            ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
            ctx.globalAlpha = 1;
            // TEXTURE FLAGS ON VISUAL ROWS: masonry / foliage / eyes are
            // declared on RegionVisualSpec, but the bakes below only ran on
            // the theme-tinted (visual-less) wall branch — every coursed row
            // (drystone, ruin_wall, rampart, the durance…) silently baked
            // flat. Honor them here in the row's OWN tones (ramp derived
            // from vis.fill), under the boundary edge so the rim still wins.
            if (!def?.walkable) {
              const vDark = mix(vis.fill, '#000000', 0.42);
              const vLit = mix(vis.fill, '#ffffff', 0.34);
              if (vis.masonry) this.bakeMasonry(ctx, x, y, cell, ox, oy, vis.fill, vDark, vLit);
              if (vis.foliage) this.bakeFoliage(ctx, x, y, cell, ox, oy, vis.fill, vDark, vLit);
              if (vis.eyes) this.bakeWallEyes(ctx, x, y, cell, ox, oy, vis.fill, vDark, vLit);
            }
            // THE STEPPED WAY (RegionVisualSpec.steps): a FLOOR texture —
            // it bakes on walkable link rows too (ramps and spans are
            // floors), unlike the wall dressings above.
            if (vis.steps) this.bakeSteps(ctx, x, y, cell, ox, oy, gx, gy, idAt, vis, id);
          }
          // BOUNDARY EDGE (RegionVisualSpec.edge): a bright rim on every side
          // facing walkable ground, so a wall in its floor's own tones still
          // reads as a wall (the flesh biome taught us). Bakes even for
          // animated fills — the rim itself is static. CLIFF rows swap in
          // tier honesty: the rim paints only toward LOWER floors, and any
          // side meeting a floor of this row's own story (a ramp, a span,
          // the same bench) sits FLUSH — the way up reads hewn from the
          // rock, never pasted over it.
          if (vis.edge && !def?.walkable) {
            const ew = vis.edge.width ?? 4;
            const myTier = def?.tier ?? 0;
            const open = vis.cliff && myTier >= 1
              ? (nx: number, ny: number): boolean => {
                const nid = idAt(nx, ny);
                if (tierFloorAt(nid, myTier)) return false;   // flush: same story
                const el = tierElevOf(nid);
                return el !== null && el < myTier;            // rim toward lower floors only
              }
              : (nx: number, ny: number): boolean =>
                !!regionKind(idAt(nx, ny))?.walkable;
            ctx.fillStyle = vis.edge.color;
            ctx.globalAlpha = 0.9;
            if (open(gx, gy - 1)) ctx.fillRect(x, y, cell + 0.6, ew);
            if (open(gx, gy + 1)) ctx.fillRect(x, y + cell - ew, cell + 0.6, ew);
            if (open(gx - 1, gy)) ctx.fillRect(x, y, ew, cell + 0.6);
            if (open(gx + 1, gy)) ctx.fillRect(x + cell - ew, y, ew, cell + 0.6);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        if (def?.walkable) continue;
        // Wall cell: themed fill + noise so long runs don't read as vinyl.
        const wt = wallAt(ox + x, oy + y);
        const wn = valueNoise((ox + x) * CFG.noiseScale * 1.6, (oy + y) * CFG.noiseScale * 1.6, this.seed + 31);
        ctx.fillStyle = wn > 0.5 ? wt.fill : mix(wt.fill, wt.dark, 0.5);
        ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
        // STRUCTURE MASONRY (RegionVisualSpec.masonry): dressed-stone courses
        // in running bond — mortar seams, per-block tone, a chisel highlight
        // along each course — so a RAISED wall reads BUILT, never the same
        // rock as a cave face. World-coord aligned: the bond runs unbroken
        // across cells and chunk borders. A data flag, not an id compare.
        if (regionKind(id)?.visual?.masonry) {
          this.bakeMasonry(ctx, x, y, cell, ox, oy, wt.fill, wt.dark, wt.lit);
        }
        // ORGANIC FOLIAGE (RegionVisualSpec.foliage): a LIVING wall reads as
        // packed vegetation, never flat paint — seeded leaf clumps in the
        // wall's own shade ramp, sprig curls, a canopy-lit skew toward each
        // cell's top. World-coord keyed so the growth runs unbroken across
        // cells and chunk borders. A data flag, not an id compare — any
        // future organic wall (fungal, coral, flesh?) opts in with one word.
        if (regionKind(id)?.visual?.foliage) {
          this.bakeFoliage(ctx, x, y, cell, ox, oy, wt.fill, wt.dark, wt.lit);
        }
        // EYES IN THE WALL (RegionVisualSpec.eyes): the sockets bake here —
        // rim, sclera, lid crease in the wall's own ramp — and the live
        // wallEyes pass paints the seeking pupils over them (one geometry:
        // both halves derive from wallEyeSockets on grid indices alone).
        if (regionKind(id)?.visual?.eyes) {
          this.bakeWallEyes(ctx, x, y, cell, ox, oy, wt.fill, wt.dark, wt.lit);
        }
      }
    }
    // Bevel + AO in a second pass so fills never overpaint them.
    const bevel = Math.max(2, cell * 0.16);
    const aoDepth = cell * 0.7;
    for (let gy = r0; gy <= r1; gy++) {
      for (let gx = c0; gx <= c1; gx++) {
        if (!isWall(gx, gy)) continue;
        const x = gx * cell - ox, y = gy * cell - oy;
        const openN = !isWall(gx, gy - 1), openS = !isWall(gx, gy + 1);
        const openW = !isWall(gx - 1, gy), openE = !isWall(gx + 1, gy);
        // Lit top / shaded bottom edges of the wall block itself.
        const bt = wallAt(ox + x, oy + y);
        ctx.globalAlpha = CFG.bevelAlpha;
        if (openN) { ctx.fillStyle = bt.lit; ctx.fillRect(x, y, cell, bevel); }
        if (openW) { ctx.fillStyle = bt.lit; ctx.fillRect(x, y, bevel, cell); }
        if (openS) { ctx.fillStyle = bt.dark; ctx.fillRect(x, y + cell - bevel, cell, bevel); }
        if (openE) { ctx.fillStyle = bt.dark; ctx.fillRect(x + cell - bevel, y, bevel, cell); }
        ctx.globalAlpha = 1;
        // Contact occlusion bleeding onto the neighboring FLOOR.
        const ao = (fx: number, fy: number, fw: number, fh: number,
          gx0: number, gy0: number, gx1: number, gy1: number): void => {
          const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
          g.addColorStop(0, withAlpha('#000000', CFG.aoAlpha));
          g.addColorStop(1, withAlpha('#000000', 0));
          ctx.fillStyle = g;
          ctx.fillRect(fx, fy, fw, fh);
        };
        if (openS) ao(x, y + cell, cell, aoDepth, 0, y + cell, 0, y + cell + aoDepth);
        if (openN) ao(x, y - aoDepth, cell, aoDepth, 0, y, 0, y - aoDepth);
        if (openE) ao(x + cell, y, aoDepth, cell, x + cell, 0, x + cell + aoDepth, 0);
        if (openW) ao(x - aoDepth, y, aoDepth, cell, x, 0, x - aoDepth, 0);
      }
    }
    // THE CLIFF READ (RegionVisualSpec.cliff, third pass): elevated tier
    // rows cast an ELEVATION shadow onto every lower floor they rim — the
    // height read from below, scaled by the drop (a summit bench looms
    // deeper than a butte lip), the south throw longest (the bevel pass's
    // own light), plus a crevice seam hugging the boundary's foot. A pass
    // of its own so no later fill overpaints the throw. Opt-in per row —
    // covered layers (bored galleries, ducts) keep their faces unbroken.
    for (let gy = r0; gy <= r1; gy++) {
      for (let gx = c0; gx <= c1; gx++) {
        const id = idAt(gx, gy);
        const def = regionKind(id);
        const vis = def?.visual;
        if (!vis?.cliff || !def || def.walkable || def.tierLink || (def.tier ?? 0) < 1) continue;
        const myTier = def.tier!;
        const x = gx * cell - ox, y = gy * cell - oy;
        const dropAt = (nx: number, ny: number): number => {
          const nid = idAt(nx, ny);
          if (tierFloorAt(nid, myTier)) return 0;          // flush: same story
          const el = tierElevOf(nid);
          if (el === null || el >= myTier) return 0;       // wall or higher: no throw
          return myTier - el;
        };
        const cast = (drop: number, south: boolean,
          fx: number, fy: number, fw: number, fh: number,
          lx0: number, ly0: number, lx1: number, ly1: number): void => {
          const a = Math.min(0.34, (0.14 + 0.06 * drop) * (south ? 1.3 : 1));
          const g = ctx.createLinearGradient(lx0, ly0, lx1, ly1);
          g.addColorStop(0, withAlpha('#000000', a));
          g.addColorStop(1, withAlpha('#000000', 0));
          ctx.fillStyle = g;
          ctx.fillRect(fx, fy, fw, fh);
        };
        const reachOf = (drop: number, south: boolean): number =>
          cell * (0.45 + 0.22 * Math.min(3, drop)) * (south ? 1.5 : 1);
        let d = dropAt(gx, gy + 1);
        if (d) { const rr = reachOf(d, true); cast(d, true, x, y + cell, cell, rr, 0, y + cell, 0, y + cell + rr); }
        d = dropAt(gx, gy - 1);
        if (d) { const rr = reachOf(d, false); cast(d, false, x, y - rr, cell, rr, 0, y, 0, y - rr); }
        d = dropAt(gx + 1, gy);
        if (d) { const rr = reachOf(d, false); cast(d, false, x + cell, y, rr, cell, x + cell, 0, x + cell + rr, 0); }
        d = dropAt(gx - 1, gy);
        if (d) { const rr = reachOf(d, false); cast(d, false, x - rr, y, rr, cell, x, 0, x - rr, 0); }
        ctx.fillStyle = withAlpha('#000000', 0.3);
        if (dropAt(gx, gy + 1)) ctx.fillRect(x, y + cell, cell + 0.6, 1.4);
        if (dropAt(gx, gy - 1)) ctx.fillRect(x, y - 1.4, cell + 0.6, 1.4);
        if (dropAt(gx + 1, gy)) ctx.fillRect(x + cell, y, 1.4, cell + 0.6);
        if (dropAt(gx - 1, gy)) ctx.fillRect(x - 1.4, y, 1.4, cell + 0.6);
      }
    }
  }

  /** THE STEPPED WAY (RegionVisualSpec.steps): one link/deck cell's carved
   *  treads, clipped to the cell. The ascent direction derives from the
   *  NEIGHBORING floors' tier elevations (uphill = toward higher stories);
   *  a flat run (a span deck) falls back to its own long axis, which turns
   *  the same flag into bridge PLANKS. Tread lines key on WORLD-projected
   *  distance so the stair climbs unbroken across cells and chunk seams;
   *  flank rails shade the sides the way is cut through (higher rock) and
   *  lip the sides it hangs over (open drops). Colors ramp from the row's
   *  own fill — the stair is the ground's stone, worked. */
  private bakeSteps(ctx: CanvasRenderingContext2D, x: number, y: number,
    cell: number, ox: number, oy: number, gxi: number, gyi: number,
    idAt: (gx: number, gy: number) => string, vis: RegionVisualSpec, id: string): void {
    const spacing = typeof vis.steps === 'object' && vis.steps.spacing ? vis.steps.spacing : 10;
    const riser = mix(vis.fill, '#000000', 0.42);
    const treadLit = mix(vis.fill, '#ffffff', 0.3);
    const rail = mix(vis.fill, '#000000', 0.52);
    const rk = regionKind(id);
    const myEl = rk?.tierLink
      ? (linkSpanOf(rk)[0] + linkSpanOf(rk)[1]) / 2
      : (tierElevOf(id) ?? 0);
    // ASCENT GRADIENT over two neighbor rings: floors above pull, floors
    // below push; walls and the way's own run say nothing.
    let vx = 0, vy = 0;
    for (let r = 1; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nid = idAt(gxi + dx, gyi + dy);
          if (nid === id) continue;
          const el = tierElevOf(nid);
          if (el === null) continue;
          const dl = Math.hypot(dx, dy) || 1;
          const w = (el - myEl) / r;
          vx += (dx / dl) * w; vy += (dy / dl) * w;
        }
      }
    }
    let ux: number, uy: number; // the tread NORMAL (points uphill)
    const vlen = Math.hypot(vx, vy);
    if (vlen > 0.12) { ux = vx / vlen; uy = vy / vlen; }
    else {
      // FLAT WAY: principal axis of the same-kind run, folded to a
      // half-plane so opposite arms reinforce — treads lie ACROSS it.
      let ax = 0, ay = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          if (idAt(gxi + dx, gyi + dy) !== id) continue;
          const dl = Math.hypot(dx, dy);
          let sx = dx / dl, sy = dy / dl;
          if (sx < 0 || (sx === 0 && sy < 0)) { sx = -sx; sy = -sy; }
          ax += sx; ay += sy;
        }
      }
      const al = Math.hypot(ax, ay);
      if (al > 0.01) { ux = ax / al; uy = ay / al; } else { ux = 1; uy = 0; }
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell + 0.6, cell + 0.6);
    ctx.clip();
    // Tread pairs at world-aligned intervals along the ascent: a shadowed
    // riser lip with a lit tread edge just uphill of it.
    const wcx = ox + x + cell / 2, wcy = oy + y + cell / 2;
    const c0 = wcx * ux + wcy * uy;
    const half = cell * 1.5;
    const pxp = -uy, pyp = ux;
    const i0 = Math.floor((c0 - half) / spacing), i1 = Math.ceil((c0 + half) / spacing);
    for (let i = i0; i <= i1; i++) {
      const t = i * spacing + (hash01(i, 7, this.seed + 173) - 0.5) * spacing * 0.22;
      const px = (x + cell / 2) + (t - c0) * ux, py = (y + cell / 2) + (t - c0) * uy;
      ctx.strokeStyle = withAlpha(riser, 0.5);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(px - pxp * half, py - pyp * half);
      ctx.lineTo(px + pxp * half, py + pyp * half);
      ctx.stroke();
      ctx.strokeStyle = withAlpha(treadLit, 0.42);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px + ux * 1.7 - pxp * half, py + uy * 1.7 - pyp * half);
      ctx.lineTo(px + ux * 1.7 + pxp * half, py + uy * 1.7 + pyp * half);
      ctx.stroke();
    }
    // FLANK RAILS: the cut's walls and the causeway's lips.
    const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [sdx, sdy] of sides) {
      const nid = idAt(gxi + sdx, gyi + sdy);
      if (nid === id) continue;
      const el = tierElevOf(nid);
      const throughRock = el === null || el > myEl + 0.4; // the rock the stair cuts through
      const overDrop = el !== null && el < myEl - 0.6;    // open air beside the way
      if (!throughRock && !overDrop) continue;
      ctx.fillStyle = throughRock ? withAlpha(rail, 0.5) : withAlpha(riser, 0.6);
      const rw = throughRock ? 3.2 : 2.2;
      if (sdx === 1) ctx.fillRect(x + cell - rw, y, rw, cell + 0.6);
      else if (sdx === -1) ctx.fillRect(x, y, rw, cell + 0.6);
      else if (sdy === 1) ctx.fillRect(x, y + cell - rw, cell + 0.6, rw);
      else ctx.fillRect(x, y, cell + 0.6, rw);
    }
    ctx.restore();
  }

  /** One rampart cell's dressed-stone coursework, clipped to the cell. Blocks
   *  key on WORLD course/column indices so the running bond survives every
   *  cell and chunk seam; tone jitters per block off the bake seed. */
  private bakeMasonry(ctx: CanvasRenderingContext2D, x: number, y: number,
    cell: number, ox: number, oy: number,
    fill: string, seam: string, lit: string): void {
    const courseH = cell / 2;
    const blockW = cell * (2 / 3);
    const wx = ox + x, wy = oy + y;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell + 0.6, cell + 0.6);
    ctx.clip();
    const row0 = Math.floor(wy / courseH), row1 = Math.floor((wy + cell) / courseH);
    for (let row = row0; row <= row1; row++) {
      const ly = row * courseH - oy;
      const off = (row % 2 + 2) % 2 ? blockW * 0.5 : 0;
      const col0 = Math.floor((wx - off) / blockW), col1 = Math.floor((wx + cell - off) / blockW);
      for (let col = col0; col <= col1; col++) {
        const lx = col * blockW + off - ox;
        // Per-block tone: quarried stone, no two alike.
        ctx.fillStyle = shade(fill, (hash01(col, row, this.seed + 53) - 0.5) * 0.16);
        ctx.globalAlpha = 0.55;
        ctx.fillRect(lx, ly, blockW, courseH);
      }
      ctx.globalAlpha = 1;
      // Mortar bed under the course, chisel light along its top.
      ctx.fillStyle = withAlpha(seam, 0.85);
      ctx.fillRect(x, ly + courseH - 1.2, cell + 0.6, 1.2);
      ctx.fillStyle = withAlpha(lit, 0.22);
      ctx.fillRect(x, ly, cell + 0.6, 1);
      // Head joints (vertical mortar) per block.
      ctx.fillStyle = withAlpha(seam, 0.7);
      for (let col = col0; col <= col1; col++) {
        const lx = col * blockW + off - ox;
        ctx.fillRect(lx - 0.6, ly, 1.2, courseH);
      }
    }
    ctx.restore();
  }

  /** One organic wall cell's FOLIAGE dressing, clipped to the cell: layered
   *  leaf clumps (dark under, mid mass, lit crowns) + the odd sprig curl,
   *  every position/size/tone hashed off WORLD lattice indices so the
   *  growth reads as one continuous mass across cells and chunk seams.
   *  Baked per chunk like everything here — zero per-frame cost. */
  private bakeFoliage(ctx: CanvasRenderingContext2D, x: number, y: number,
    cell: number, ox: number, oy: number,
    fill: string, dark: string, lit: string): void {
    const wx = ox + x, wy = oy + y;
    const gx = Math.round(wx / cell), gy = Math.round(wy / cell);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell + 0.6, cell + 0.6);
    ctx.clip();
    // Three tonal layers, small→large seed spaces so clumps interleave.
    const layers: { tone: string; n: number; r0: number; r1: number; a: number }[] = [
      { tone: shade(dark, -0.1), n: 4, r0: 0.2, r1: 0.34, a: 0.5 },
      { tone: fill, n: 4, r0: 0.16, r1: 0.28, a: 0.55 },
      { tone: shade(lit, 0.06), n: 3, r0: 0.1, r1: 0.2, a: 0.4 },
    ];
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      ctx.globalAlpha = L.a;
      for (let i = 0; i < L.n; i++) {
        const h1 = hash01(gx * 3 + i, gy * 5 + li, this.seed + 71);
        const h2 = hash01(gx * 7 + li, gy * 3 + i, this.seed + 89);
        const h3 = hash01(gx + i * 11, gy + li * 13, this.seed + 107);
        const px = x + h1 * cell;
        // The lit layer crowds each cell's TOP (the canopy catches the sun).
        const py = y + (li === 2 ? h2 * cell * 0.6 : h2 * cell);
        const r = cell * (L.r0 + h3 * (L.r1 - L.r0));
        ctx.fillStyle = shade(L.tone, (h3 - 0.5) * 0.14);
        ctx.beginPath();
        // A leaf clump: two overlapped ellipses at a hashed cant.
        const cant = h1 * Math.PI;
        ctx.ellipse(px, py, r, r * 0.62, cant, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + r * 0.4, py - r * 0.3, r * 0.7, r * 0.45, cant + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // A sprig curl escaping the mass, one cell in three.
    if (hash01(gx, gy, this.seed + 131) < 0.34) {
      const sx = x + hash01(gx + 5, gy, this.seed + 137) * cell;
      const sy = y + hash01(gx, gy + 5, this.seed + 139) * cell;
      const sl = cell * 0.32;
      const sa = hash01(gx + 9, gy + 9, this.seed + 149) * Math.PI * 2;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = shade(lit, 0.14);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(sa) * sl * 0.7, sy + Math.sin(sa) * sl * 0.7,
        sx + Math.cos(sa + 0.9) * sl, sy + Math.sin(sa + 0.9) * sl);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** EYES IN THE WALL (RegionVisualSpec.eyes — the flesh country's watching
   *  shell): bake each cell's SOCKETS — a sunken rim, a rheumy sclera, a
   *  heavy lid crease — in the wall's own ramp. The pupils are NOT baked:
   *  the live wallEyes pass draws those seeking the hero, on the same
   *  wallEyeSockets geometry (grid-index seeded — never this.seed, or the
   *  live half could not agree). */
  private bakeWallEyes(ctx: CanvasRenderingContext2D, x: number, y: number,
    cell: number, ox: number, oy: number,
    fill: string, dark: string, lit: string): void {
    const wx = ox + x, wy = oy + y;
    const gx = Math.round(wx / cell), gy = Math.round(wy / cell);
    const sockets = wallEyeSockets(gx, gy, cell);
    if (!sockets.length) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell + 0.6, cell + 0.6);
    ctx.clip();
    for (const s of sockets) {
      const lx = s.x - ox, ly = s.y - oy;
      // The sunken rim: flesh folded back around the opening.
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = shade(dark, -0.22);
      ctx.beginPath();
      ctx.ellipse(lx, ly, s.r * 1.3, s.r * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // The rheumy white, dimmer than a body's eye — it lives in a wall.
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#c9bcae';
      ctx.beginPath();
      ctx.ellipse(lx, ly, s.r, s.r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      // The heavy lid crease over the top, in the wall's lit tone.
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = shade(lit, -0.05);
      ctx.lineWidth = Math.max(1, s.r * 0.22);
      ctx.beginPath();
      ctx.arc(lx, ly - s.r * 0.1, s.r * 1.05, Math.PI + 0.4, -0.4);
      ctx.stroke();
      // A vein or two feeding the socket from the mass.
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shade(fill, 0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx - s.r * 1.6, ly + s.r * 0.5);
      ctx.quadraticCurveTo(lx - s.r * 1.1, ly + s.r * 0.2, lx - s.r * 0.9, ly);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
