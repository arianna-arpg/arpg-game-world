// ---------------------------------------------------------------------------
// STRUCTURE FLOORS — real interiors underfoot. Each placed structure's floor
// rects (and paved courtyards) bake into the terrain chunks in the style its
// def names (FLOOR_STYLES): BOARDS with staggered butt joints and knots,
// COBBLE set in grout, FLAGSTONE slabs, temple TILE, PACKED earth. Every
// pattern is deterministic from position — the same room is always the same
// room — and each floor closes with a soft inner AO rim so interiors feel
// grounded, not decaled. Add a style = one registry row + (for a genuinely
// new geometry) one pattern branch here.
// ---------------------------------------------------------------------------

import { floorStyleOf, type FloorStyle } from '../../data/structures';
import type { World } from '../../engine/world';
import { hash01, shade, withAlpha } from './color';

interface Rect { x: number; y: number; w: number; h: number }

/** Bake every structure floor that intersects the chunk at (ox, oy, size C).
 *  The ctx is chunk-local (translate by -ox, -oy before drawing rect coords). */
export function paintStructureFloors(ctx: CanvasRenderingContext2D, world: World,
  ox: number, oy: number, C: number): void {
  const structures = world.structures;
  if (!structures?.length) return;
  for (const st of structures) {
    const floor = floorStyleOf(st.floorStyle);
    if (floor) {
      for (const r of st.floors) paintIfVisible(ctx, r, floor, ox, oy, C);
    }
    const yard = floorStyleOf(st.courtyardFloorStyle);
    if (yard) {
      for (const r of st.courtyards) paintIfVisible(ctx, r, yard, ox, oy, C);
    }
  }
}

function paintIfVisible(ctx: CanvasRenderingContext2D, r: Rect, style: FloorStyle,
  ox: number, oy: number, C: number): void {
  if (r.x + r.w < ox || r.y + r.h < oy || r.x > ox + C || r.y > oy + C) return;
  ctx.save();
  ctx.translate(-ox, -oy);
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  paintFloorRect(ctx, r, style);
  ctx.restore();
}

/** One floor rect in world coords (caller has clipped + translated). */
function paintFloorRect(ctx: CanvasRenderingContext2D, r: Rect, style: FloorStyle): void {
  const seed = ((r.x * 7 + r.y * 13) | 0) >>> 0;
  const unit = style.unit ?? 14;
  ctx.fillStyle = style.fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  switch (style.pattern) {
    case 'boards': {
      // Planks run the rect's LONG axis, butt joints staggered per row.
      const along = r.w >= r.h;
      const rows = Math.ceil((along ? r.h : r.w) / unit);
      const span = along ? r.w : r.h;
      ctx.lineWidth = 1;
      for (let i = 0; i < rows; i++) {
        const v0 = (along ? r.y : r.x) + i * unit;
        // Per-plank tone.
        ctx.fillStyle = shade(style.fill, hash01(i, seed) * 0.16 - 0.08);
        if (along) ctx.fillRect(r.x, v0, r.w, unit);
        else ctx.fillRect(v0, r.y, unit, r.h);
        // Seam between rows.
        ctx.strokeStyle = withAlpha(style.seam, 0.9);
        ctx.beginPath();
        if (along) { ctx.moveTo(r.x, v0); ctx.lineTo(r.x + r.w, v0); }
        else { ctx.moveTo(v0, r.y); ctx.lineTo(v0, r.y + r.h); }
        ctx.stroke();
        // Staggered butt joints + the odd knot.
        const joints = Math.floor(span / (unit * 4.2));
        for (let j = 0; j <= joints; j++) {
          const u0 = (along ? r.x : r.y)
            + ((j + hash01(i * 7 + j, seed + 3) * 0.6) * span) / (joints + 1);
          ctx.beginPath();
          if (along) { ctx.moveTo(u0, v0); ctx.lineTo(u0, v0 + unit); }
          else { ctx.moveTo(v0, u0); ctx.lineTo(v0 + unit, u0); }
          ctx.stroke();
          if (hash01(i * 13 + j, seed + 9) > 0.82) {
            ctx.fillStyle = withAlpha(style.seam, 0.75);
            ctx.beginPath();
            if (along) ctx.arc(u0 + unit, v0 + unit * 0.5, 1.5, 0, Math.PI * 2);
            else ctx.arc(v0 + unit * 0.5, u0 + unit, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'cobble': {
      // Grout base, then offset rows of rounded stones with tone jitter.
      ctx.fillStyle = style.seam;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      const rows = Math.ceil(r.h / unit) + 1;
      const cols = Math.ceil(r.w / unit) + 1;
      for (let i = 0; i < rows; i++) {
        const off = i % 2 ? unit * 0.5 : 0;
        for (let j = 0; j < cols; j++) {
          const cx = r.x + j * unit + off + unit * 0.5;
          const cy = r.y + i * unit + unit * 0.5;
          const rr = unit * (0.38 + hash01(i * 31 + j, seed) * 0.08);
          ctx.fillStyle = shade(style.fill, hash01(i * 17 + j, seed + 5) * 0.2 - 0.1);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rr * 1.12, rr, 0, 0, Math.PI * 2);
          ctx.fill();
          // A lit crown on each stone.
          ctx.fillStyle = withAlpha(shade(style.fill, 0.22), 0.5);
          ctx.beginPath();
          ctx.ellipse(cx - rr * 0.25, cy - rr * 0.3, rr * 0.45, rr * 0.3, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'flagstone': {
      // Big staggered slabs, seam-stroked, tones drifting slab to slab.
      const rows = Math.ceil(r.h / unit);
      for (let i = 0; i < rows; i++) {
        const off = i % 2 ? unit * 0.7 : 0;
        let x = r.x - off;
        let j = 0;
        while (x < r.x + r.w) {
          const w = unit * (1.2 + hash01(i * 11 + j, seed) * 0.9);
          ctx.fillStyle = shade(style.fill, hash01(i * 23 + j, seed + 7) * 0.18 - 0.09);
          ctx.fillRect(x, r.y + i * unit, w - 2, unit - 2);
          ctx.strokeStyle = withAlpha(style.seam, 0.95);
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x, r.y + i * unit, w - 2, unit - 2);
          x += w;
          j++;
        }
      }
      break;
    }
    case 'tile': {
      // A quiet two-tone checker under a seam grid — halls and temples.
      const cols = Math.ceil(r.w / unit), rows = Math.ceil(r.h / unit);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          ctx.fillStyle = (i + j) % 2 ? shade(style.fill, 0.07) : shade(style.fill, -0.05);
          ctx.fillRect(r.x + j * unit, r.y + i * unit, unit, unit);
        }
      }
      ctx.strokeStyle = withAlpha(style.seam, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 0; j <= cols; j++) { ctx.moveTo(r.x + j * unit, r.y); ctx.lineTo(r.x + j * unit, r.y + r.h); }
      for (let i = 0; i <= rows; i++) { ctx.moveTo(r.x, r.y + i * unit); ctx.lineTo(r.x + r.w, r.y + i * unit); }
      ctx.stroke();
      break;
    }
    case 'packed': {
      // Trampled earth: the base fill + faint wear blotches. Barely-there.
      for (let i = 0; i < 6; i++) {
        const x = r.x + hash01(i, seed) * r.w;
        const y = r.y + hash01(i, seed + 3) * r.h;
        ctx.fillStyle = withAlpha(shade(style.fill, hash01(i, seed + 5) > 0.5 ? 0.08 : -0.1), 0.5);
        ctx.beginPath();
        ctx.ellipse(x, y, unit * (0.5 + hash01(i, seed + 7) * 0.5), unit * 0.35, hash01(i, seed + 9) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  // INNER AO RIM: the floor settles into its walls — a soft inward shadow
  // around the perimeter so rooms read grounded, never decaled.
  const D = Math.min(10, Math.min(r.w, r.h) * 0.2);
  const edges: [number, number, number, number, number, number, number, number][] = [
    [r.x, r.y, r.w, D, 0, r.y, 0, r.y + D],
    [r.x, r.y + r.h - D, r.w, D, 0, r.y + r.h, 0, r.y + r.h - D],
    [r.x, r.y, D, r.h, r.x, 0, r.x + D, 0],
    [r.x + r.w - D, r.y, D, r.h, r.x + r.w, 0, r.x + r.w - D, 0],
  ];
  for (const [rx, ry, rw, rh, gx0, gy0, gx1, gy1] of edges) {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  }
}
