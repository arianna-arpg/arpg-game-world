// ---------------------------------------------------------------------------
// CANOPY COMPOSITING — the sealed roof as baked chunk SLICES.
//
// A veil patch fades AS ONE BODY (engine/veil.ts): every member crown chases
// the same shared target, so in steady state a sealed forest pays hundreds of
// per-crown sprite blits a frame to express what is ONE number — the patch's
// alpha over one static picture. This module bakes that picture: the STATIC
// (CANOPY_STATIC, non-live) crowns of each veil patch flatten into world-
// space chunk canvases ("slices"), and the whole roof draws as a dozen
// drawImage calls at the patch's smoothed alpha. Live crowns (the cut
// contract's breathing growth), non-veil occluders, and dynamic painters
// (mushroom breath, kelp sway, liana strands, fog) never enter — they keep
// the per-crown path untouched.
//
// WHAT CHANGES VISUALLY: within a slice, overlapping crowns flatten — at
// reveal alpha the roof reads as ONE translucent sheet instead of stacked
// discs darkening where crowns overlap. That is the authored intent ("a
// patch fades as one body"); the lobed texture inside each sprite survives.
//
// DIVERGENCE (the eave peek): the per-crown near-fade can pull one crown
// below its patch's alpha — peeking under a COVERED patch's edge from just
// outside it. Such a crown LEAVES the composite (slices touching it rebake
// without it, hysteresis-guarded so boundary grazes don't flap) and draws
// individually at its own fade until it converges back. A crown re-entering
// the cull set with a stale smoothed fade instead ADOPTS the group's alpha —
// the group speaks for the patch; only hero proximity may dissent.
//
// INVALIDATION IS FREE: patch identity is the OBJECT and the veil index
// rebuilds off the same doodad revs as World.doodadsAt — any pop/push/zone
// swap mints new patches, and this cache keys on them via WeakMap. Slices
// LRU globally (VIS_CFG.canopy.maxSlices) so boundless-zone walks stay
// bounded; bakes pace themselves (bakeBudgetMs/maxBakesPerFrame) with the
// per-crown path as a pixel-identical stand-in, clipped per pending chunk so
// a crown spanning a baked neighbor never draws twice.
//
// THE SEAMLESS AWAY CANOPY (seamless M1 wave 2, SeamlessCanopy below —
// docs/design/seamless-world.md): while the seamless mode stands, resident
// NEIGHBOR regions' static crowns draw as world-keyed OPAQUE slices — the
// ground peer cache's key shape (`zoneId:cx,cy` in WORLD chunk coordinates,
// render/vis/ground.ts worldChunks) applied to the roof, so a threshold
// crossing changes which region is ACTIVE without dropping one world-keyed
// slice (THE CONTINUITY LAW). THE VEIL SPLIT shipped as the documented cut:
// the veil is a live-hero read, so the ACTIVE region keeps this whole live
// composite (CanopySlices — patch alphas, near-fades, divergence,
// byte-identical to discrete play) and every AWAY region draws its crowns
// opaque through the still posture — no veil, no near-fade; nobody stands
// under them. The flip converges structurally: the live composite takes a
// region over the moment it activates (per-crown stand-ins cover its first
// frames), and an away crown at alpha 1 meets the live path's own fade seed
// of 1 — so the crossing pops nothing on either side. Staleness is MINT
// IDENTITY alone (a re-minted record — arrival drift, the exits-key law,
// demote→re-admit — stales its slices; they stay DRAWABLE and converge
// under the bake budget): the ground lane's epoch separates live bakes from
// mint bakes inside one cache, but this lane never live-bakes, so the epoch
// collapses out by construction. Accepted divergence, named: live-only
// crown changes (a felled trunk) reappear standing in the away draw — the
// rampage fabric's own roads back (regrowth, re-mint) make that temporary,
// and a discrete re-entry has always re-minted them standing. Live
// (canopy.live) crowns never join — they keep the flat body-disc read
// (seamlessDraw.ts). Discrete mode never reaches any of it: the renderer's
// hook gates on seamlessDrawActive (THE MODE LAW).
// ---------------------------------------------------------------------------

import { VEIL_DEFAULTS, veilSpecOf, type VeilPatch, type VeilSpec } from '../../engine/veil';
import { doodadRuleOf, type Doodad } from '../../engine/levelgen';
import type { ZoneTheme } from '../../data/zones';
import type { SeamlessMint } from '../../engine/world';
import type { RegionSeat } from '../../world/seamless';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { CANOPY_PAINTERS, CANOPY_STATIC, crownSprite, crownVariantOf } from './painters';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';
import { VIS_CFG } from './visConfig';

/** The zone/arena sliver of World the composite needs (structural — the vis
 *  layer never imports the engine's World). */
interface WorldView { zone: object; arena: { w: number; h: number; boundless?: boolean } }

/** Shared empty params: registry-def IDENTITY feeds sprite-bake keys, so
 *  canopy defs that declare none must all share ONE object — a fresh `{}`
 *  per call would mint a fresh bake key per frame (the 250ms-forest lesson). */
export const EMPTY_PARAMS: Record<string, unknown> = {};

/** Blit one crown's variant-baked sprite — THE static canopy draw, shared by
 *  the renderer's per-crown path, the slice bake, and the pending stand-in,
 *  so all three are pixel-identical by construction. */
export function blitCrown(ctx: CanvasRenderingContext2D, theme: ZoneTheme,
  o: Doodad, name: string, params: Record<string, unknown>, alpha: number): void {
  const painter = CANOPY_PAINTERS[name] ?? CANOPY_PAINTERS.discCrown;
  const spr = crownSprite(name, painter, theme, params, o.radius, crownVariantOf(o));
  const rq = Math.max(8, Math.round(o.radius / 5) * 5);
  const scale = o.radius / rq;
  const half = (spr.width / 2) * scale;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  if (o.rot !== undefined) ctx.rotate(o.rot);
  ctx.globalAlpha = alpha;
  ctx.drawImage(spr, -half, -half, spr.width * scale, spr.height * scale);
  ctx.restore();
}

/** The canopy def bits the composite needs per KIND, memoized (registry defs
 *  are static). `eligible` mirrors the renderer's own static-blit gate. */
interface KindMeta { name: string; params: Record<string, unknown>; eligible: boolean }
const kindMeta = new Map<string, KindMeta>();
function metaOf(kind: string): KindMeta {
  let m = kindMeta.get(kind);
  if (!m) {
    const cdef = DOODAD_VISUALS[kind]?.canopy;
    const name = cdef?.painter ?? 'discCrown';
    m = { name, params: cdef?.params ?? EMPTY_PARAMS, eligible: !!CANOPY_STATIC[name] && !cdef?.live };
    kindMeta.set(kind, m);
  }
  return m;
}

/** Groups bucket a patch's composite members by their veil ALPHA VALUES —
 *  kinds are registry singletons but `veil: {}` objects differ per kind, and
 *  a mixed patch (palm + tree + colossus) must still flatten into ONE slice
 *  set when its specs agree on cover/reveal (they nearly always do). */
const alphaKeys = new WeakMap<VeilSpec, string>();
function alphaKeyOf(spec: VeilSpec): string {
  let k = alphaKeys.get(spec);
  if (!k) {
    k = `${spec.cover ?? VEIL_DEFAULTS.cover}|${spec.reveal ?? VEIL_DEFAULTS.reveal}`;
    alphaKeys.set(spec, k);
  }
  return k;
}

/** A crown sprite's draw reach past its center (crownSprite bakes at
 *  rq·2·1.5 px and blits scaled back to radius — half-extent radius·1.5). */
const CROWN_REACH = 1.5;

function chunkKey(cx: number, cy: number): number {
  return (cx + 4096) * 8192 + (cy + 4096);
}

interface PatchGroup {
  id: number;
  /** Smoothed shared alpha (-1 = seeded from the first claimer). Advanced
   *  ONCE per frame at first claim with the exact per-crown lerp, so members
   *  and group trace identical trajectories and never falsely diverge. */
  fade: number;
  target: number;
  frame: number;
  memberSet: Set<Doodad>;
  byChunk: Map<number, Doodad[]>;
  slices: Map<number, HTMLCanvasElement>;
  diverged: Set<Doodad>;
}

export class CanopySlices {
  private groups = new WeakMap<VeilPatch, Map<string, PatchGroup>>();
  /** Global slice LRU across every group (token `${group.id}|${chunkKey}`) —
   *  bounds boundless-zone walks; ground.ts's delete+set touch idiom. */
  private lru = new Map<string, { g: PatchGroup; ck: number }>();
  /** Recycled slice canvases: bakes pop, evictions push. GPU-side canvas
   *  alloc/free is the hitch-storm class faad384 measured — reuse beats
   *  release beats GC (releaseCanvas only past the pool cap). */
  private pool: HTMLCanvasElement[] = [];
  private active: PatchGroup[] = [];
  /** Crowns already stood in for THIS frame — a pending crown spanning two
   *  pending chunks draws once, unclipped (a per-chunk clip is a raster
   *  state flush; ~70 of them a frame was the jungle GPU stall). */
  private standInDrawn = new Set<Doodad>();
  private zoneRef: object | null = null;
  private arenaRef: { w: number; h: number; boundless?: boolean } | null = null;
  private frameNo = 0;
  private frameDt = 0;
  private nextGroupId = 1;

  /** Once per frame, before any claim — resets the active set and, on a zone
   *  swap, eagerly releases the old zone's slices NOW (ground.ts's lesson:
   *  left to the GC, a few hops of discarded canvases land as a GPU hitch
   *  storm mid-play). The pool survives hops — blank buffers recycle. */
  begin(dt: number, world: WorldView): void {
    this.frameNo++;
    this.frameDt = dt;
    this.active.length = 0;
    this.standInDrawn.clear();
    if (this.zoneRef !== world.zone) {
      this.zoneRef = world.zone;
      for (const { g, ck } of this.lru.values()) {
        const c = g.slices.get(ck);
        if (c) { g.slices.delete(ck); this.recycle(c); }
      }
      this.lru.clear();
    }
    this.arenaRef = world.arena;
  }

  private recycle(c: HTMLCanvasElement): void {
    if (this.pool.length < 12) this.pool.push(c);
    else releaseCanvas(c);
  }

  /** Offer a static veil crown to the composite. Returns the alpha the crown
   *  ADOPTED (slice will draw it — caller records the fade and skips its own
   *  draw), or null when the crown must draw itself (diverged near-fade, or
   *  not a member of any composite group). */
  claim(patch: VeilPatch, spec: VeilSpec, o: Doodad, crownFade: number,
    patchTarget: number, near: boolean): number | null {
    let groups = this.groups.get(patch);
    if (!groups) { groups = this.buildGroups(patch); this.groups.set(patch, groups); }
    const g = groups.get(alphaKeyOf(spec));
    if (!g || !g.memberSet.has(o)) return null;
    if (g.frame !== this.frameNo) {
      g.frame = this.frameNo;
      g.target = patchTarget;
      if (g.fade < 0) g.fade = crownFade;
      g.fade += (g.target - g.fade) * Math.min(1, this.frameDt * VIS_CFG.canopy.fadeRate);
      this.active.push(g);
    }
    const wasDiverged = g.diverged.has(o);
    if (!near) {
      // Away from the hero there is no legitimate per-crown dissent: adopt
      // the group's alpha (heals stale fades from culled-out frames), rejoin.
      if (wasDiverged) { g.diverged.delete(o); this.dropSlicesOf(g, o); }
      return g.fade;
    }
    const d = Math.abs(crownFade - g.fade);
    if (wasDiverged) {
      if (d < VIS_CFG.canopy.divergeOut) {
        g.diverged.delete(o); this.dropSlicesOf(g, o);
        return g.fade;
      }
      return null;
    }
    if (d > VIS_CFG.canopy.divergeIn) {
      g.diverged.add(o); this.dropSlicesOf(g, o);
      return null;
    }
    return crownFade;
  }

  /** Blit every active group's visible slices at its shared alpha; bake
   *  missing slices under budget, standing in per-crown (chunk-clipped)
   *  meanwhile. Call after the per-crown canopy loop, same transform. */
  draw(ctx: CanvasRenderingContext2D, theme: ZoneTheme,
    camX: number, camY: number, vw: number, vh: number): void {
    if (!this.active.length) return;
    const cfg = VIS_CFG.canopy;
    const chunk = cfg.compositeChunk;
    const t0 = performance.now();
    let bakes = 0;
    let x0 = Math.floor(camX / chunk), x1 = Math.floor((camX + vw) / chunk);
    let y0 = Math.floor(camY / chunk), y1 = Math.floor((camY + vh) / chunk);
    const arena = this.arenaRef;
    if (arena && !arena.boundless) {
      x0 = Math.max(0, x0); y0 = Math.max(0, y0);
      x1 = Math.min(Math.floor(Math.max(0, arena.w - 1) / chunk), x1);
      y1 = Math.min(Math.floor(Math.max(0, arena.h - 1) / chunk), y1);
    }
    for (const g of this.active) {
      const a = g.fade;
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const ck = chunkKey(cx, cy);
          const members = g.byChunk.get(ck);
          if (!members) continue;
          let c = g.slices.get(ck);
          if (!c) {
            if (bakes < cfg.maxBakesPerFrame && performance.now() - t0 < cfg.bakeBudgetMs) {
              c = this.bake(g, ck, cx, cy, theme, members);
              bakes++;
            } else {
              // PENDING STAND-IN: this chunk's members draw per-crown exactly
              // as the old path did, ONCE per frame (standInDrawn) and
              // unclipped — a crown straddling a baked neighbor may double
              // for the frame or two before its chunk bakes, which beats a
              // per-chunk clip (each clip is a raster state flush; dozens a
              // frame WAS the strangler-court GPU stall).
              for (const o of members) {
                if (o.gone || o.felled || g.diverged.has(o) || this.standInDrawn.has(o)) continue;
                this.standInDrawn.add(o);
                const meta = metaOf(o.kind);
                blitCrown(ctx, theme, o, meta.name, meta.params, a);
              }
              continue;
            }
          } else {
            this.lruTouch(g, ck);
          }
          ctx.globalAlpha = a;
          ctx.drawImage(c, cx * chunk, cy * chunk);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private buildGroups(patch: VeilPatch): Map<string, PatchGroup> {
    const byKey = new Map<string, PatchGroup>();
    const chunk = VIS_CFG.canopy.compositeChunk;
    // A patch below the size floor stays on the per-crown path: a lone tree
    // is cheap to blit but would cost a whole 448² slice per chunk it
    // touches — strangler court's 28 singleton patches alone pushed slice
    // demand past the LRU cap and into walk-evict-rebake churn.
    let eligibleCount = 0;
    for (const d of patch.members) if (metaOf(d.kind).eligible) eligibleCount++;
    if (eligibleCount < VIS_CFG.canopy.minPatchMembers) return byKey;
    for (const d of patch.members) {
      if (!metaOf(d.kind).eligible) continue;
      const spec = veilSpecOf(d.kind);
      if (!spec) continue;
      const key = alphaKeyOf(spec);
      let g = byKey.get(key);
      if (!g) {
        g = {
          id: this.nextGroupId++, fade: -1, target: 1, frame: -1,
          memberSet: new Set(), byChunk: new Map(), slices: new Map(), diverged: new Set(),
        };
        byKey.set(key, g);
      }
      g.memberSet.add(d);
      const r = d.radius * CROWN_REACH;
      const cx0 = Math.floor((d.pos.x - r) / chunk), cx1 = Math.floor((d.pos.x + r) / chunk);
      const cy0 = Math.floor((d.pos.y - r) / chunk), cy1 = Math.floor((d.pos.y + r) / chunk);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const ck = chunkKey(cx, cy);
          const arr = g.byChunk.get(ck);
          if (arr) arr.push(d); else g.byChunk.set(ck, [d]);
        }
      }
    }
    return byKey;
  }

  private bake(g: PatchGroup, ck: number, cx: number, cy: number,
    theme: ZoneTheme, members: readonly Doodad[]): HTMLCanvasElement {
    const chunk = VIS_CFG.canopy.compositeChunk;
    const c = this.pool.pop() ?? document.createElement('canvas');
    c.width = chunk; c.height = chunk; // width set resets the bitmap (recycled or fresh)
    const bctx = c.getContext('2d');
    if (bctx) {
      bctx.translate(-cx * chunk, -cy * chunk);
      for (const o of members) {
        // A crushed crown leaves the composite (the rampage fabric — the
        // rebuilt veil index drops it; this guards the same-frame window).
        if (o.gone || o.felled || g.diverged.has(o)) continue;
        const meta = metaOf(o.kind);
        blitCrown(bctx, theme, o, meta.name, meta.params, 1);
      }
    }
    g.slices.set(ck, c);
    this.lru.set(`${g.id}|${ck}`, { g, ck });
    while (this.lru.size > VIS_CFG.canopy.maxSlices) {
      const [tok, ent] = this.lru.entries().next().value as [string, { g: PatchGroup; ck: number }];
      const old = ent.g.slices.get(ent.ck);
      ent.g.slices.delete(ent.ck);
      this.lru.delete(tok);
      if (old) this.recycle(old);
    }
    return c;
  }

  private lruTouch(g: PatchGroup, ck: number): void {
    const tok = `${g.id}|${ck}`;
    const ent = this.lru.get(tok);
    if (ent) { this.lru.delete(tok); this.lru.set(tok, ent); }
  }

  /** Drop every slice a crown's draw rect touches (divergence flips, both
   *  directions) — they rebake without/with it under the frame budget. */
  private dropSlicesOf(g: PatchGroup, o: Doodad): void {
    const chunk = VIS_CFG.canopy.compositeChunk;
    const r = o.radius * CROWN_REACH;
    const cx0 = Math.floor((o.pos.x - r) / chunk), cx1 = Math.floor((o.pos.x + r) / chunk);
    const cy0 = Math.floor((o.pos.y - r) / chunk), cy1 = Math.floor((o.pos.y + r) / chunk);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const ck = chunkKey(cx, cy);
        const c = g.slices.get(ck);
        if (c) {
          g.slices.delete(ck);
          this.lru.delete(`${g.id}|${ck}`);
          this.recycle(c);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// THE SEAMLESS AWAY CANOPY — the world-keyed lane (module header law above).
// ---------------------------------------------------------------------------

/** Away-canopy dials — ALL FLAGGED (unblessed; her word moves them). Slice
 *  grain is the composite's own compositeChunk (448² ≈ 0.8 MB each), so the
 *  byte class mirrors the discrete cap: 64 here + 96 there ≈ the ground
 *  world-cache's 72-chunk envelope. Budgets are a lighter hand than the
 *  discrete composite's (away crowns converge off-screen-first; nothing
 *  waits on them mid-fight), with the ONE never-baked slice per frame
 *  always allowed — streaming must progress (the ground lane's own law). */
export const SEAMLESS_CANOPY_CFG = {
  /** LRU cap on world-keyed away slices across ALL resident regions. */
  maxSlices: 64,
  /** Per-frame away bake budget (ms) — first bake exempt (the guarantee). */
  bakeBudgetMs: 2,
  /** Fresh away bakes per frame past the first. */
  maxBakesPerFrame: 3,
  /** Stale (re-minted record) rebakes per frame — the convergence trickle. */
  maxRebakesPerFrame: 2,
} as const;

/** The World sliver the away lane reads (structural — this module keeps the
 *  vis layer's no-engine-import law; SeamlessMint/RegionSeat arrive as
 *  erased type imports, the ground lane's own idiom). */
export interface SeamlessCanopyView {
  zone: { id: string };
  seamlessRegions: readonly RegionSeat[];
  seamlessMints: ReadonlyMap<string, SeamlessMint>;
  zoneMap: Record<string, { theme: ZoneTheme } | undefined>;
}

/** One away region's crown index, keyed to the mint record that produced it
 *  (a re-mint rebuilds): every static canopy-bearing crown of the mint's
 *  doodad list, bucketed by the WORLD chunks its draw reach touches. Seat
 *  origins are stable identities by the placement lane's own law (upsert
 *  keeps the standing seat; def.size never moves), so world coordinates
 *  baked into the index survive demote→re-admit cycles byte-equal. */
interface AwayCanopyRegion {
  mint: SeamlessMint;
  theme: ZoneTheme;
  originX: number;
  originY: number;
  byChunk: Map<number, Doodad[]>;
}

/** One world-keyed away slice (`zoneId:cx,cy`). `at` is the draw/LRU stamp
 *  (the working-set guard reads it); `bakedAt` orders stale rebakes
 *  oldest-first; `mint` is the record identity — a re-minted region stales
 *  its slices (frozen-DRAWABLE, converging under the budget), the lane's
 *  whole staleness vocabulary (no epoch: this cache never live-bakes). */
interface AwaySliceEntry {
  img: HTMLCanvasElement;
  at: number;
  bakedAt: number;
  mint: SeamlessMint;
}

export class SeamlessCanopy {
  /** Map insertion order is the LRU (the ground world-cache's idiom) —
   *  survives every zone swap and threshold crossing BY LAW; only the run
   *  boundary (steward) and the cap release entries. */
  private slices = new Map<string, AwaySliceEntry>();
  /** Away regions' memoized crown indexes, keyed by zone id, invalidated by
   *  mint identity; pruned to the resident set as seats demote. */
  private regions = new Map<string, AwayCanopyRegion>();
  /** Draw/LRU sequence for the working-set guard. */
  private seq = 0;

  constructor() {
    // The steward row (renderer-owned instance — the ground world-cache's
    // registration posture). NO zone handler on purpose: a threshold
    // crossing must keep every resident's slices (THE CONTINUITY LAW);
    // the run boundary releases everything.
    registerVisCache({
      id: 'seamlessCanopy',
      count: () => this.slices.size,
      bytes: () => this.slices.size * VIS_CFG.canopy.compositeChunk * VIS_CFG.canopy.compositeChunk * 4,
      onRunSwap: () => this.clear(),
    });
  }

  /** Release every slice + region index (run boundary only). */
  private clear(): void {
    for (const e of this.slices.values()) releaseCanvas(e.img);
    this.slices.clear();
    this.regions.clear();
  }

  /** An away region's crown index (rebuilt when its mint record refreshes):
   *  static canopy-bearing crowns only — the composite's own eligibility
   *  (CANOPY_STATIC painter, not canopy.live) over occlude/veil kinds; live
   *  crowns keep the flat body-disc read (the documented cut). Felled and
   *  gone crowns stay out (the mint list is static, so build-time filtering
   *  is complete). */
  private regionFor(zoneId: string, mint: SeamlessMint, theme: ZoneTheme,
    seat: RegionSeat): AwayCanopyRegion {
    const hit = this.regions.get(zoneId);
    if (hit && hit.mint === mint) return hit;
    const chunk = VIS_CFG.canopy.compositeChunk;
    const byChunk = new Map<number, Doodad[]>();
    for (const d of mint.layout.doodads) {
      if (d.gone || d.felled) continue;
      const rule = doodadRuleOf(d.kind);
      if (!rule.occlude && !rule.veil) continue;
      if (!metaOf(d.kind).eligible) continue;
      const r = d.radius * CROWN_REACH;
      const wx = d.pos.x + seat.originPx.x, wy = d.pos.y + seat.originPx.y;
      const cx0 = Math.floor((wx - r) / chunk), cx1 = Math.floor((wx + r) / chunk);
      const cy0 = Math.floor((wy - r) / chunk), cy1 = Math.floor((wy + r) / chunk);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const ck = chunkKey(cx, cy);
          const arr = byChunk.get(ck);
          if (arr) arr.push(d); else byChunk.set(ck, [d]);
        }
      }
    }
    const reg: AwayCanopyRegion = {
      mint, theme, originX: seat.originPx.x, originY: seat.originPx.y, byChunk,
    };
    this.regions.set(zoneId, reg);
    return reg;
  }

  /** Draw every away region's crowns the view touches, as opaque world-keyed
   *  slices — called from the renderer's canopy pass BEFORE the active
   *  region's own loop (away under active: the live layout's crowns win the
   *  overlap, the country draw's own doctrine), in the active seat's frame
   *  (the caller has already gated on seamlessDrawActive). Missing slices
   *  bake nearest-view-center-first under the budget with per-crown opaque
   *  stand-ins meanwhile; stale (re-minted) slices keep drawing and rebake
   *  oldest-first; eviction never touches a slice drawn this frame. */
  draw(ctx: CanvasRenderingContext2D, world: SeamlessCanopyView,
    camX: number, camY: number, vw: number, vh: number): void {
    const seats = world.seamlessRegions;
    if (!seats.length) return;
    let active: RegionSeat | null = null;
    for (const s of seats) if (s.zoneId === world.zone.id) { active = s; break; }
    if (!active) return;
    // Prune region indexes that lost their seat (demotions) — the memo map
    // stays exactly the resident set's size.
    if (this.regions.size >= seats.length) {
      for (const id of this.regions.keys()) {
        if (!seats.some(s => s.zoneId === id)) this.regions.delete(id);
      }
    }
    const chunk = VIS_CFG.canopy.compositeChunk;
    const cfg = SEAMLESS_CANOPY_CFG;
    const t0 = performance.now();
    const drawFloor = this.seq;
    // OPAQUE means SET: the pass we run inside inherits whatever alpha the
    // previous layer left (the sight veil parks it near zero), and every
    // standing draw path re-asserts its own — so must this lane, or the
    // slices blit invisibly (the live-proof lesson, 2026-08-12).
    ctx.globalAlpha = 1;
    const originX = active.originPx.x, originY = active.originPx.y;
    const wx0 = camX + originX, wy0 = camY + originY;
    const x0 = Math.floor(wx0 / chunk), x1 = Math.floor((wx0 + vw) / chunk);
    const y0 = Math.floor(wy0 / chunk), y1 = Math.floor((wy0 + vh) / chunk);
    const ccx = (wx0 + vw / 2) / chunk, ccy = (wy0 + vh / 2) / chunk;
    const missing: { key: string; reg: AwayCanopyRegion; cx: number; cy: number; d2: number }[] = [];
    const stale: { entry: AwaySliceEntry; reg: AwayCanopyRegion; cx: number; cy: number }[] = [];
    for (const s of seats) {
      if (s.zoneId === world.zone.id) continue;
      const mint = world.seamlessMints.get(s.zoneId);
      const def = world.zoneMap[s.zoneId];
      if (!mint || !def) continue; // no mint = stand down (the ground lane's law)
      const reg = this.regionFor(s.zoneId, mint, def.theme, s);
      if (!reg.byChunk.size) continue;
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          if (!reg.byChunk.get(chunkKey(cx, cy))) continue;
          const key = `${s.zoneId}:${cx},${cy}`;
          const entry = this.slices.get(key);
          if (entry) {
            this.slices.delete(key); this.slices.set(key, entry); // LRU touch
            entry.at = ++this.seq;
            // A slice of a RE-MINTED record repaints (drawable meanwhile).
            if (entry.mint !== reg.mint) stale.push({ entry, reg, cx, cy });
            ctx.drawImage(entry.img, cx * chunk - originX, cy * chunk - originY);
          } else {
            missing.push({ key, reg, cx, cy, d2: (cx + 0.5 - ccx) ** 2 + (cy + 0.5 - ccy) ** 2 });
          }
        }
      }
    }
    // Bake nearest-first — ONE per frame always allowed; the rest hold to
    // the count + ms budget. Pending chunks stand in per-crown, opaque,
    // once per crown per frame (a crown spanning two pending chunks must
    // not double-darken its translucent lobes — the composite's own rule).
    let bakes = 0;
    let standIn: Set<Doodad> | null = null;
    missing.sort((a, b) => a.d2 - b.d2);
    for (const m of missing) {
      if (bakes === 0 || (bakes < cfg.maxBakesPerFrame && performance.now() - t0 < cfg.bakeBudgetMs)) {
        const img = this.bake(m.reg, m.cx, m.cy);
        this.slices.set(m.key, { img, at: ++this.seq, bakedAt: ++this.seq, mint: m.reg.mint });
        bakes++;
        ctx.drawImage(img, m.cx * chunk - originX, m.cy * chunk - originY); // no one-frame hole
      } else {
        const members = m.reg.byChunk.get(chunkKey(m.cx, m.cy));
        if (!members) continue;
        if (!standIn) standIn = new Set();
        ctx.save();
        ctx.translate(m.reg.originX - originX, m.reg.originY - originY);
        for (const o of members) {
          if (standIn.has(o)) continue;
          standIn.add(o);
          const meta = metaOf(o.kind);
          blitCrown(ctx, m.reg.theme, o, meta.name, meta.params, 1);
        }
        ctx.restore();
      }
    }
    stale.sort((a, b) => a.entry.bakedAt - b.entry.bakedAt);
    let rebakes = 0;
    for (const s of stale) {
      if (rebakes >= cfg.maxRebakesPerFrame || performance.now() - t0 >= cfg.bakeBudgetMs) break;
      const img = this.bake(s.reg, s.cx, s.cy);
      if (s.entry.img !== img) releaseCanvas(s.entry.img);
      s.entry.img = img;
      s.entry.mint = s.reg.mint;
      s.entry.bakedAt = ++this.seq;
      rebakes++;
    }
    // Evict past the cap — never a slice drawn this frame (the working-set
    // guard: the cap bounds SESSION growth, not the view).
    while (this.slices.size > cfg.maxSlices) {
      const oldest = this.slices.entries().next().value;
      if (oldest === undefined || oldest[1].at > drawFloor) break;
      releaseCanvas(oldest[1].img);
      this.slices.delete(oldest[0]);
    }
  }

  /** Bake one away slice: the region's member crowns flattened OPAQUE into a
   *  world-frame chunk canvas. blitCrown is already world-free (theme +
   *  doodad + params — CANOPY_STATIC's own assertion), so the ground lane's
   *  scoped world swap collapses to parameter passing here; crown variants
   *  hash the doodad's mint-LOCAL position, which equals its live zone-local
   *  position by the one-affine seat law — away and live bakes are
   *  pixel-identical by construction. */
  private bake(reg: AwayCanopyRegion, cx: number, cy: number): HTMLCanvasElement {
    const chunk = VIS_CFG.canopy.compositeChunk;
    const c = document.createElement('canvas');
    c.width = chunk; c.height = chunk;
    const bctx = c.getContext('2d');
    const members = reg.byChunk.get(chunkKey(cx, cy));
    if (bctx && members) {
      // Members hold mint-local positions; the slice lives in world frame.
      bctx.translate(reg.originX - cx * chunk, reg.originY - cy * chunk);
      for (const o of members) {
        if (o.gone || o.felled) continue; // build-time filtered; same-frame guard idiom
        const meta = metaOf(o.kind);
        blitCrown(bctx, reg.theme, o, meta.name, meta.params, 1);
      }
    }
    return c;
  }
}
