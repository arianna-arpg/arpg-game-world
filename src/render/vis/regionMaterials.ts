/** Native static wall materials shared by finite and continuous ground.
 * Coordinates and seed are explicit; no simulation state or random consumption. */
import { hash01, shade, withAlpha } from './color';

export function paintRegionMasonry(ctx: CanvasRenderingContext2D, x: number, y: number,
    cell: number, ox: number, oy: number,
    fill: string, seam: string, lit: string, seed: number): void {
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
        ctx.fillStyle = shade(fill, (hash01(col, row, seed + 53) - 0.5) * 0.16);
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

export function paintRegionFoliage(ctx: CanvasRenderingContext2D, x: number, y: number,
    cell: number, ox: number, oy: number,
    fill: string, dark: string, lit: string, seed: number): void {
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
        const h1 = hash01(gx * 3 + i, gy * 5 + li, seed + 71);
        const h2 = hash01(gx * 7 + li, gy * 3 + i, seed + 89);
        const h3 = hash01(gx + i * 11, gy + li * 13, seed + 107);
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
    if (hash01(gx, gy, seed + 131) < 0.34) {
      const sx = x + hash01(gx + 5, gy, seed + 137) * cell;
      const sy = y + hash01(gx, gy + 5, seed + 139) * cell;
      const sl = cell * 0.32;
      const sa = hash01(gx + 9, gy + 9, seed + 149) * Math.PI * 2;
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
