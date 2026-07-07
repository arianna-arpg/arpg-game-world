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
import type { World } from '../../engine/world';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { adjust, hash01, mix, shade, valueNoise, withAlpha } from './color';
import { VIS_CFG } from './visConfig';

function strSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0) % 100000;
}

export class GroundRenderer {
  private chunks = new Map<string, HTMLCanvasElement>();
  private zoneRef: unknown = null;
  private seed = 0;

  /** Blit the visible floor. The caller owns any arena clip (rect/ellipse). */
  draw(ctx: CanvasRenderingContext2D, world: World,
    camX: number, camY: number, vw: number, vh: number): void {
    if (this.zoneRef !== world.zone) {
      this.chunks.clear();
      this.zoneRef = world.zone;
      this.seed = strSeed(`${world.zone.id}|${world.zone.name}`);
    }
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
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${cx},${cy},${ver}`;
        let img = this.chunks.get(key);
        if (img) {
          // LRU touch.
          this.chunks.delete(key);
          this.chunks.set(key, img);
        } else {
          img = this.bake(world, wf, cx, cy);
          this.chunks.set(key, img);
          while (this.chunks.size > VIS_CFG.ground.maxChunks) {
            const oldest = this.chunks.keys().next().value;
            if (oldest === undefined) break;
            this.chunks.delete(oldest);
          }
        }
        ctx.drawImage(img, cx * C, cy * C);
      }
    }
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
    for (let gy = 0; gy < C; gy += cell) {
      for (let gx = 0; gx < C; gx += cell) {
        const nn = valueNoise((ox + gx) * nsx, (oy + gy) * ns, this.seed);
        let n = clamp(0.5 + (nn - 0.5) * 2.6, 0, 1);
        if (biasExp !== 1) n = 1 - Math.pow(1 - n, biasExp);
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
    const wallFill = theme.wall ?? theme.obstacle ?? '#07070b';
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
          continue;
        }
        if (def?.walkable) continue;
        // Wall cell: themed fill + noise so long runs don't read as vinyl.
        const wn = valueNoise((ox + x) * CFG.noiseScale * 1.6, (oy + y) * CFG.noiseScale * 1.6, this.seed + 31);
        ctx.fillStyle = wn > 0.5 ? wallFill : mix(wallFill, wallDark, 0.5);
        ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
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
}
