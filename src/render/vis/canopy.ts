// ---------------------------------------------------------------------------
// CANOPY COMPOSITING — the sealed roof as baked chunk SLICES.
//
// Distant veil crowns share their sealed cover alpha. Nearby crowns open by
// local presence (engine/veil.ts), independently of canopy connectivity.
// The sealed backdrop need not pay hundreds of sprite blits for one static
// picture. This module bakes that picture: the STATIC
// (CANOPY_STATIC, non-live) crowns of each veil patch flatten into world-
// space chunk canvases ("slices"), and the whole roof draws as a dozen
// drawImage calls at the sealed alpha. Live crowns (the cut
// contract's breathing growth), non-veil occluders, and dynamic painters
// (mushroom breath, kelp sway, liana strands, fog) never enter — they keep
// the per-crown path untouched.
//
// Within a slice, overlapping sealed crowns flatten. Local fading crowns
// leave that picture and retain their own lobed texture and opacity.
//
// DIVERGENCE: local presence pulls a crown below the sealed backdrop's
// alpha. Chunks touching that crown draw individually through ONE union
// clip per group until it closes again. Sealed slices stay immutable and
// warm: walking never invalidates/reuploads them. The union clip also keeps
// fallback crowns from drawing twice across neighboring cached chunks.
//
// INVALIDATION IS FREE: patch identity is the OBJECT and the veil index
// rebuilds off the same doodad revs as World.doodadsAt — any pop/push/zone
// swap mints new patches, and this cache keys on them via WeakMap. Slices
// LRU globally (VIS_CFG.canopy.maxSlices) so boundless-zone walks stay
// bounded; bakes pace themselves (bakeBudgetMs/maxBakesPerFrame) with the
// per-crown path as a pixel-identical stand-in, clipped per pending chunk so
// a crown spanning a baked neighbor never draws twice.
// ---------------------------------------------------------------------------

import { VEIL_DEFAULTS, veilSpecOf, type VeilPatch, type VeilSpec } from '../../engine/veil';
import type { Doodad } from '../../engine/levelgen';
import type { ZoneTheme } from '../../data/zones';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { CANOPY_PAINTERS, CANOPY_STATIC, crownSprite, crownVariantOf } from './painters';
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
  fades: Map<Doodad, number>;
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
  /** Crowns already drawn through a group's combined clip this frame.
   *  One crown spanning several local/pending chunks is submitted once. */
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

  /** Offer a static veil crown to the composite. Returns its drawn alpha
   *  (cached slice or local clipped draw), or null for an ineligible crown. */
  claim(patch: VeilPatch, spec: VeilSpec, o: Doodad, crownFade: number,
    patchTarget: number, near: boolean): number | null {
    let groups = this.groups.get(patch);
    if (!groups) { groups = this.buildGroups(patch); this.groups.set(patch, groups); }
    const g = groups.get(alphaKeyOf(spec));
    if (!g || !g.memberSet.has(o)) return null;
    if (g.frame !== this.frameNo) {
      g.frame = this.frameNo;
      g.fades.clear();
      g.target = patchTarget;
      // A near crown must never seed the entire connected roof's opacity.
      if (g.fade < 0) g.fade = patchTarget;
      g.fade += (g.target - g.fade) * Math.min(1, this.frameDt * VIS_CFG.canopy.fadeRate);
      this.active.push(g);
    }
    const wasDiverged = g.diverged.has(o);
    if (!near) {
      // Away from the hero there is no legitimate per-crown dissent: adopt
      // the group's alpha (heals stale fades from culled-out frames), rejoin.
      if (wasDiverged) g.diverged.delete(o);
      g.fades.set(o, g.fade);
      return g.fade;
    }
    const d = Math.abs(crownFade - g.fade);
    if (wasDiverged) {
      if (d < VIS_CFG.canopy.divergeOut) {
        g.diverged.delete(o);
        g.fades.set(o, g.fade);
        return g.fade;
      }
      g.fades.set(o, crownFade);
      return crownFade;
    }
    if (d > VIS_CFG.canopy.divergeIn) {
      g.diverged.add(o);
      g.fades.set(o, crownFade);
      return crownFade;
    }
    g.fades.set(o, g.fade);
    return g.fade;
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
      const local: { cx: number; cy: number; members: Doodad[] }[] = [];
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const ck = chunkKey(cx, cy);
          const members = g.byChunk.get(ck);
          if (!members) continue;
          // Keep the sealed bitmap immutable as presence moves. Only chunks
          // containing a locally fading crown need individual draws, clipped
          // together ONCE below. Returning to cover reuses the warm slice.
          if (members.some(o => g.diverged.has(o) && g.fades.has(o))) {
            local.push({ cx, cy, members });
            continue;
          }
          let c = g.slices.get(ck);
          if (!c) {
            if (bakes < cfg.maxBakesPerFrame && performance.now() - t0 < cfg.bakeBudgetMs) {
              c = this.bake(g, ck, cx, cy, theme, members);
              bakes++;
            } else {
              local.push({ cx, cy, members });
              continue;
            }
          } else {
            this.lruTouch(g, ck);
          }
          ctx.globalAlpha = a;
          ctx.drawImage(c, cx * chunk, cy * chunk);
        }
      }
      if (local.length) {
        ctx.save();
        ctx.beginPath();
        for (const tile of local) ctx.rect(tile.cx * chunk, tile.cy * chunk, chunk, chunk);
        ctx.clip();
        for (const tile of local) for (const o of tile.members) {
          if (o.gone || o.felled || this.standInDrawn.has(o)) continue;
          this.standInDrawn.add(o);
          const meta = metaOf(o.kind);
          blitCrown(ctx, theme, o, meta.name, meta.params, g.fades.get(o) ?? a);
        }
        ctx.restore();
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
          memberSet: new Set(), byChunk: new Map(), slices: new Map(), diverged: new Set(), fades: new Map(),
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
        if (o.gone || o.felled) continue;
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

}
