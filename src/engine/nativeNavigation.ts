import { vec, type Vec2 } from '../core/math';
import { GridWalkField } from '../world/gridWalk';
import type { Bounds } from '../world/shape';
import type { Doodad, doodadRuleOf } from './levelgen';
import type { blocksMovement, hitSurfaceOf } from './levelgen';
import { shapeAabbHalf, shapeDistance } from './shapes';

/** Original finite analytic navigation, with all area-dependent reads explicit.
 * Callers own source binding, live geometry revisions and tier-field caches. */
export interface NativeNavigationHost {
  readonly arena: Bounds;
  readonly arenaHull: { w: number; h: number };
  readonly doodads: readonly Doodad[];
  readonly grounds: readonly Doodad[];
  readonly pad: number;
  doodadRuleOf: typeof doodadRuleOf;
  blocksMovement: typeof blocksMovement;
  hitSurfaceOf: typeof hitSurfaceOf;
  groundAt(p: Vec2): { kind: string; deep: boolean } | null;
  paintNavGrounds(g: GridWalkField): void;
  stampNavSurface(g: GridWalkField, d: Doodad): void;
}

export function buildNativeConvexNav(host: NativeNavigationHost): GridWalkField {
    // Sized to the ACTIVE union's hull — the base box exactly until an annex
    // opens (hullOf is origin-pinned), so a piece-less zone rakes the grid it
    // always did.
    const g = new GridWalkField(host.arenaHull.w, host.arenaHull.h);
    if (host.arena.shape === 'ellipse') {
      // Row-fill the inscribed ellipse; the corners stay 'wall' so paths
      // never hug ground clampToBounds would drag feet back from.
      const rx = host.arena.w / 2, ry = host.arena.h / 2;
      for (let y = g.cell / 2; y < host.arena.h; y += g.cell) {
        const ny = (y - ry) / ry;
        const k = 1 - ny * ny;
        if (k <= 0) continue;
        const half = Math.sqrt(k) * rx;
        g.fillRect(rx - half, y - g.cell / 2, rx + half, y + g.cell / 2 - 1, true);
      }
    } else {
      g.fillRect(0, 0, host.arena.w, host.arena.h, true);
    }
    // OPEN ANNEX PIECES join the walkable union in their own silhouettes
    // (dormant pieces stay 'wall' — the nav refuses exactly what the clamp
    // refuses, drawn == pathed at the bound). Rows ride the global cell
    // lattice like the base fill, so seams share cells cleanly.
    for (const pc of host.arena.pieces ?? []) {
      if (!pc.active) continue;
      if ((pc.shape ?? 'rect') !== 'ellipse') {
        g.fillRect(pc.x, pc.y, pc.x + pc.w, pc.y + pc.h, true);
      } else {
        const prx = pc.w / 2, pry = pc.h / 2;
        const pcx = pc.x + prx, pcy = pc.y + pry;
        for (let y = g.cell / 2; y < host.arenaHull.h; y += g.cell) {
          if (y < pc.y || y > pc.y + pc.h) continue;
          const ny = (y - pcy) / pry;
          const k = 1 - ny * ny;
          if (k <= 0) continue;
          const half = Math.sqrt(k) * prx;
          g.fillRect(pcx - half, y - g.cell / 2, pcx + half, y + g.cell / 2 - 1, true);
        }
      }
    }
    const solids: Doodad[] = [], spans: Doodad[] = [];
    for (const d of host.doodads) {
      if (host.doodadRuleOf(d.kind).spans) { spans.push(d); continue; }
      if (!host.blocksMovement(d)) continue;
      if (d.kind === 'chasm') {
        host.stampNavSurface(g, d);
      } else {
        solids.push(d);
      }
    }
    // TRAVEL PREFERENCE: paint the SENSED ground kinds under every walkable
    // cell a ground disc covers — sampled through groundAt itself, never a
    // re-derivation, so bridges (null), fords (shallow), way-masked decks and
    // the nastiest-ground priority all price exactly as they play (one-source
    // doctrine: the caldera's lava lakes and the fen's bogs finally EXIST to
    // pathing). Kind cells stay walkable — only the weighted fields read them;
    // region EFFECTS keep flowing from groundAt/walk alone (host.walk is null
    // on convex zones, so painting here double-applies nothing).
    host.paintNavGrounds(g);
    for (const s of spans) g.fillDisc(s.pos.x, s.pos.y, s.radius, 'ground');
    for (const o of solids) host.stampNavSurface(g, o);
    return g;
  }

export function paintNativeNavGrounds(host: NativeNavigationHost, g: GridWalkField): void {
    if (host.grounds.length === 0) return;
    const cell = g.cell;
    // The dedup lattice matches the GRID's own dims (the union hull) — a
    // cols mismatch would fold annex-column indices onto the next row's.
    const cols = Math.ceil(host.arenaHull.w / cell);
    const seen = new Uint8Array(cols * Math.ceil(host.arenaHull.h / cell) + cols + 1);
    const probe = vec(0, 0);
    for (const d of host.grounds) {
      const r2 = (d.radius + cell * 0.5) ** 2;
      const x0 = Math.max(cell / 2, Math.floor((d.pos.x - d.radius) / cell) * cell + cell / 2);
      const y0 = Math.max(cell / 2, Math.floor((d.pos.y - d.radius) / cell) * cell + cell / 2);
      for (let cy = y0; cy <= Math.min(host.arenaHull.h, d.pos.y + d.radius); cy += cell) {
        for (let cx = x0; cx <= Math.min(host.arenaHull.w, d.pos.x + d.radius); cx += cell) {
          if ((cx - d.pos.x) ** 2 + (cy - d.pos.y) ** 2 > r2) continue; // bbox corner, not the disc
          const si = Math.floor(cy / cell) * cols + Math.floor(cx / cell);
          if (seen[si]) continue; // one sample per cell per rebuild
          seen[si] = 1;
          if (!g.isWalkable(cx, cy)) continue; // bounds shape holds
          probe.x = cx; probe.y = cy;
          const ground = host.groundAt(probe);
          if (!ground) continue;
          const kind = ground.kind === 'water' && ground.deep ? 'deep_water' : ground.kind;
          if (kind === 'ground') continue;
          // quiet: no baker ever reads the nav grid's dirty ring — don't churn it.
          g.fillRegion(cx, cy, cx, cy, kind, true);
        }
      }
    }
  }

export function stampNativeNavSurface(host: NativeNavigationHost, g: GridWalkField, d: Doodad): void {
    const s = host.hitSurfaceOf(d, 'move');
    if (s.kind === 'circle') {
      g.fillDisc(d.pos.x, d.pos.y, s.r + host.pad, 'wall');
      return;
    }
    const { ex, ey } = shapeAabbHalf(s);
    const pad = host.pad;
    const step = g.cellSize;
    // March cell centers across the padded bounding window; a center within
    // pad of the surface blocks (matches fillDisc's center-in-reach rule).
    const x0 = d.pos.x - ex - pad, x1 = d.pos.x + ex + pad;
    const y0 = d.pos.y - ey - pad, y1 = d.pos.y + ey + pad;
    for (let cy = (Math.floor(y0 / step) + 0.5) * step; cy <= y1 + step / 2; cy += step) {
      for (let cx = (Math.floor(x0 / step) + 0.5) * step; cx <= x1 + step / 2; cx += step) {
        if (shapeDistance(s, d.pos.x, d.pos.y, cx, cy) < pad) {
          g.fillRegion(cx, cy, cx, cy, 'wall');
        }
      }
    }
  }
