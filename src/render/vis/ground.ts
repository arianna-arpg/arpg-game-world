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
import type { Doodad } from '../../engine/levelgen';
import type { World } from '../../engine/world';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { adjust, hash01, mix, shade, valueNoise, withAlpha } from './color';
import { liquidBodyIsLive, paintBlendUnderlay, paintLiquidStatics, type DoodadVisualDef } from './painters';
import { paintStructureFloors } from './floors';
import { VIS_CFG } from './visConfig';

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

export class GroundRenderer {
  private chunks = new Map<string, { img: HTMLCanvasElement; v: number; b: number }>();
  private zoneRef: unknown = null;
  private seed = 0;
  private staticGroups: StaticGroup[] = [];
  private staticCount = -1;
  /** Bumped whenever the static bed/body groups re-gather (doodad set
   *  changed) — chunks baked under an older rev are STALE, not discarded:
   *  they keep drawing while the budgeted loop re-bakes them a few per
   *  frame. The old clear() rebaked the whole viewport in ONE frame — a
   *  guaranteed hitch every time a barrel popped mid-fight. */
  private bedsRev = 0;

  /** Blit the visible floor. The caller owns any arena clip (rect/ellipse).
   *  Chunks carry the walk-grid version they baked at; a repaint re-bakes
   *  ONLY the chunks its dirty rect touched, spread over frames by a budget
   *  (a stale chunk keeps drawing its old self until its turn) — so a door
   *  break or a crawling fissure never rebakes a whole screen in one frame. */
  draw(ctx: CanvasRenderingContext2D, world: World,
    camX: number, camY: number, vw: number, vh: number): void {
    if (this.zoneRef !== world.zone) {
      this.chunks.clear();
      this.zoneRef = world.zone;
      this.seed = strSeed(`${world.zone.id}|${world.zone.name}`);
      this.staticCount = -1; // re-gather the static groups for the new zone
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
    let rebakes = 0;
    let bakedNew = false;
    const bakeT0 = performance.now();
    const budgetLeft = (): boolean =>
      performance.now() - bakeT0 < VIS_CFG.ground.bakeBudgetMs;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${cx},${cy}`;
        let entry = this.chunks.get(key);
        if (entry) {
          // LRU touch.
          this.chunks.delete(key);
          this.chunks.set(key, entry);
          const bedsStale = entry.b !== this.bedsRev;
          if (bedsStale || (entry.v < ver && wf)) {
            const touched = bedsStale
              || (wf ? this.chunkStale(wf, entry.v, cx * C, cy * C, C) : false);
            if (!touched) {
              entry.v = ver; // untouched by any repaint — just adopt the version
            } else if (rebakes < VIS_CFG.ground.rebakesPerFrame && budgetLeft()) {
              entry.img = this.bake(world, wf, cx, cy);
              entry.v = ver;
              entry.b = this.bedsRev;
              rebakes++;
            } // else: budget spent — keep drawing the old bake, retry next frame
          }
        } else {
          // A never-baked visible chunk: guarantee ONE bake per frame so
          // streaming always progresses, then hold the rest to the TIME
          // budget — the old unbounded path baked a whole screenful in one
          // frame after a teleport or a cache flush (the zone-entry stall).
          if (!bakedNew || budgetLeft()) {
            entry = { img: this.bake(world, wf, cx, cy), v: ver, b: this.bedsRev };
            bakedNew = true;
            this.chunks.set(key, entry);
            while (this.chunks.size > VIS_CFG.ground.maxChunks) {
              const oldest = this.chunks.keys().next().value;
              if (oldest === undefined) break;
              this.chunks.delete(oldest);
            }
          } else {
            // Over budget: a flat floor stand-in this frame; the real bake
            // lands within the next frame or two.
            ctx.fillStyle = world.zone.theme.floor;
            ctx.fillRect(cx * C, cy * C, C, C);
            continue;
          }
        }
        ctx.drawImage(entry.img, cx * C, cy * C);
      }
    }
    // PREFETCH: bake at most one not-yet-baked chunk in the ring just
    // outside the viewport, so walking streams floor in ahead of arrival
    // instead of hitching the frame a new column first appears on.
    if (rebakes === 0 && budgetLeft()) {
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
          this.chunks.set(key, { img: this.bake(world, wf, cx, cy), v: ver, b: this.bedsRev });
          while (this.chunks.size > VIS_CFG.ground.maxChunks) {
            const oldest = this.chunks.keys().next().value;
            if (oldest === undefined) break;
            this.chunks.delete(oldest);
          }
          break outer;
        }
      }
    }
  }

  /** Did any repaint since `bakedV` touch this chunk's rect? Falls back to
   *  stale when the dirty ring has already dropped rects that new. */
  private chunkStale(wf: GridWalkField, bakedV: number, ox: number, oy: number, C: number): boolean {
    if (bakedV <= wf.dirtyFloodV) return true;
    for (const r of wf.dirty) {
      if (r.v <= bakedV) continue;
      if (r.x1 < ox || r.x0 > ox + C || r.y1 < oy || r.y0 > oy + C) continue;
      return true;
    }
    return false;
  }

  /** Gather (or re-gather when the doodad list changed) every kind whose
   *  blend bed and/or liquid body bakes with the floor. Bake-time consumers
   *  only — never per frame. */
  private syncStaticGroups(world: World): void {
    if (this.staticCount === world.doodads.length) return;
    this.staticCount = world.doodads.length;
    // Doodad set changed (a brittle popped, a growth landed) → baked beds/
    // bodies are stale. MARK, never clear: live chunks keep drawing their
    // old bake and re-bake through the per-frame budget, so a mid-fight
    // barrel pop costs a few staggered rebakes instead of one whole-screen
    // hitch frame.
    this.bedsRev++;
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
    }
    this.staticGroups.sort((a, b) => (a.def.order ?? 50) - (b.def.order ?? 50));
  }

  private bake(world: World, wf: GridWalkField | null, cx: number, cy: number): HTMLCanvasElement {
    const CFG = VIS_CFG.ground;
    const C = CFG.chunk;
    const theme = world.zone.theme;
    const c = document.createElement('canvas');
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
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, C, C);
    const cell = CFG.cell;
    const ns = CFG.noiseScale / (gs.scale ?? 1);
    const nsx = ns / (gs.stretchX ?? 1);
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
        if (pal) {
          const t = n * (pal.length - 1);
          const i = Math.min(pal.length - 2, Math.floor(t));
          ctx.fillStyle = mix(pal[i], pal[i + 1], t - i);
          // Coverage shaping: by default the gradient's MIDDLE thins so the
          // base floor patches through (mottle); `evenness` flattens that
          // toward uniform strength — a pure color-to-color blend.
          const shaped = 0.4 + 0.6 * Math.abs(n - 0.5) * 2;
          const even = clamp(gs.evenness ?? 0, 0, 1);
          ctx.globalAlpha = alphaCap * strength * (shaped + (1 - shaped) * even);
        } else if (n < 0.5) {
          ctx.globalAlpha = Math.min(1, (0.5 - n) * 2) * alphaCap;
          ctx.fillStyle = dark;
        } else {
          ctx.globalAlpha = Math.min(1, (n - 0.5) * 2) * alphaCap;
          ctx.fillStyle = light;
        }
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
      ctx.globalAlpha = CFG.speckleAlpha;
      if (theme.grass && roll < 0.4) {
        ctx.strokeStyle = theme.grass;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 2); ctx.lineTo(sx - 2, sy - 3);
        ctx.moveTo(sx, sy + 2); ctx.lineTo(sx + 2, sy - 4);
        ctx.stroke();
      } else if (theme.lava && roll > 0.9) {
        ctx.fillStyle = shade(theme.lava, 0.35);
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const tone = roll > 0.65 ? shade(theme.obstacle, 0.15) : mix(theme.floor, theme.obstacle, 0.5);
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
    let wallFill = theme.wall ?? theme.obstacle ?? '#07070b';
    const lum = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    };
    const gap = lum(wallFill) - lum(theme.floor);
    if (Math.abs(gap) < 0.09) {
      wallFill = lum(theme.floor) > 0.24 ? shade(wallFill, -0.35) : shade(wallFill, 0.3);
    }
    const wallLit = shade(wallFill, 0.18);
    const wallDark = shade(wallFill, -0.3);
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
          // Static visuals bake; ANIMATED ones stay live (renderer overlay).
          if (!vis.animate) {
            ctx.globalAlpha = vis.alpha ?? 1;
            ctx.fillStyle = vis.fill;
            ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
            ctx.globalAlpha = 1;
          }
          // BOUNDARY EDGE (RegionVisualSpec.edge): a bright rim on every side
          // facing walkable ground, so a wall in its floor's own tones still
          // reads as a wall (the flesh biome taught us). Bakes even for
          // animated fills — the rim itself is static.
          if (vis.edge && !def?.walkable) {
            const ew = vis.edge.width ?? 4;
            const open = (nx: number, ny: number): boolean =>
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
        const wn = valueNoise((ox + x) * CFG.noiseScale * 1.6, (oy + y) * CFG.noiseScale * 1.6, this.seed + 31);
        ctx.fillStyle = wn > 0.5 ? wallFill : mix(wallFill, wallDark, 0.5);
        ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
        // STRUCTURE MASONRY (RegionVisualSpec.masonry): dressed-stone courses
        // in running bond — mortar seams, per-block tone, a chisel highlight
        // along each course — so a RAISED wall reads BUILT, never the same
        // rock as a cave face. World-coord aligned: the bond runs unbroken
        // across cells and chunk borders. A data flag, not an id compare.
        if (regionKind(id)?.visual?.masonry) {
          this.bakeMasonry(ctx, x, y, cell, ox, oy, wallFill, wallDark, wallLit);
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
        ctx.globalAlpha = CFG.bevelAlpha;
        if (openN) { ctx.fillStyle = wallLit; ctx.fillRect(x, y, cell, bevel); }
        if (openW) { ctx.fillStyle = wallLit; ctx.fillRect(x, y, bevel, cell); }
        if (openS) { ctx.fillStyle = wallDark; ctx.fillRect(x, y + cell - bevel, cell, bevel); }
        if (openE) { ctx.fillStyle = wallDark; ctx.fillRect(x + cell - bevel, y, bevel, cell); }
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
}
