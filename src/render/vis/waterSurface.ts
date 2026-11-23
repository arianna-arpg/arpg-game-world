import { WATER_SURFACE } from '../../data/waterSurface';
import { hash01 } from './color';

export interface WaterBounds { x: number; y: number; w: number; h: number }
export interface WaterDiscLike { pos: { x: number; y: number }; radius: number }

/** World-anchored, simulation-clock motion; page and camera boundaries cannot
 * restart a wave. Callers clip to the actual wet union, including shallow fords. */
export function waterRipple(gx: number, gy: number, time: number) {
  const seed = (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 0;
  const phase = hash01(seed, 3) * Math.PI * 2;
  return {
    x: (gx + .2 + hash01(seed, 1) * .6) * WATER_SURFACE.spacingX,
    y: (gy + .2 + hash01(seed, 2) * .6) * WATER_SURFACE.spacingY
      + Math.sin(time * .31 + phase) * WATER_SURFACE.drift,
    phase: phase + time * WATER_SURFACE.speed,
    length: WATER_SURFACE.length * (.6 + hash01(seed, 4) * .6),
    alpha: WATER_SURFACE.opacity * (.6 + .4 * Math.sin(time * .43 + phase) ** 2),
  };
}

// Zero-allocation scratch structures for quantized-alpha stroke batching and
// analytical disc-union trimming (eliminates full-screen non-convex Skia GPU
// clip-mask uploads and collapses ~2,200 per-wave stroke() calls to <= 8!).
const ALPHA_BINS = 4;
const BUCKET_ALPHAS = [0.65, 0.77, 0.88, 1.0] as const;
const bucketPaths: number[][] = Array.from({ length: ALPHA_BINS * 2 }, () => []);

const GRID_CELL = 128;
let gridHead = new Int32Array(256);
let gridNext = new Int32Array(512);
let gridDiscIdx = new Int32Array(512);
const nearX: number[] = [];
const nearY: number[] = [];
const nearR2: number[] = [];

function pushPolyMove(buf: number[], x: number, y: number): void {
  buf.push(NaN, x, y);
}
function pushPolyLine(buf: number[], x: number, y: number): void {
  buf.push(x, y);
}

function inNearDiscs(x: number, y: number, count: number): boolean {
  for (let i = 0; i < count; i++) {
    const dx = x - nearX[i], dy = y - nearY[i];
    if (dx * dx + dy * dy <= nearR2[i]) return true;
  }
  return false;
}

export function paintWaterSurface(
  ctx: CanvasRenderingContext2D,
  bounds: WaterBounds,
  time: number,
  opacityAt?: (x: number, y: number) => number,
  discs?: readonly WaterDiscLike[],
): void {
  if (bounds.w <= 0 || bounds.h <= 0) return;
  const c = WATER_SURFACE;
  for (let b = 0; b < bucketPaths.length; b++) bucketPaths[b].length = 0;

  // Build spatial grid over `bounds` when `discs` are supplied so dry cells skip
  // in O(1), interior cells batch without clipping, and shoreline ripples trim
  // analytically against their 1–3 overlapping circles with zero ctx.clip()!
  let useDiscs = false;
  let gOx = 0, gOy = 0, gCols = 0, gRows = 0;
  if (discs && discs.length > 0) {
    useDiscs = true;
    const pad = c.length * 1.3 + c.amplitude + 8;
    gOx = Math.floor((bounds.x - pad) / GRID_CELL);
    gOy = Math.floor((bounds.y - pad) / GRID_CELL);
    const gX1 = Math.floor((bounds.x + bounds.w + pad) / GRID_CELL);
    const gY1 = Math.floor((bounds.y + bounds.h + pad) / GRID_CELL);
    gCols = Math.max(1, gX1 - gOx + 1);
    gRows = Math.max(1, gY1 - gOy + 1);
    const totalCells = gCols * gRows;
    if (gridHead.length < totalCells) {
      gridHead = new Int32Array(Math.max(totalCells, gridHead.length * 2));
    }
    gridHead.fill(-1, 0, totalCells);
    let nodeCount = 0;
    const bx0 = bounds.x - pad, by0 = bounds.y - pad;
    const bx1 = bounds.x + bounds.w + pad, by1 = bounds.y + bounds.h + pad;
    for (let di = 0; di < discs.length; di++) {
      const d = discs[di];
      const r = d.radius;
      if (d.pos.x + r < bx0 || d.pos.x - r > bx1 || d.pos.y + r < by0 || d.pos.y - r > by1) continue;
      const cx0 = Math.max(0, Math.floor((d.pos.x - r) / GRID_CELL) - gOx);
      const cx1 = Math.min(gCols - 1, Math.floor((d.pos.x + r) / GRID_CELL) - gOx);
      const cy0 = Math.max(0, Math.floor((d.pos.y - r) / GRID_CELL) - gOy);
      const cy1 = Math.min(gRows - 1, Math.floor((d.pos.y + r) / GRID_CELL) - gOy);
      for (let cy = cy0; cy <= cy1; cy++) {
        const rowOff = cy * gCols;
        for (let cx = cx0; cx <= cx1; cx++) {
          if (nodeCount >= gridNext.length) {
            const nextCap = gridNext.length * 2;
            const nn = new Int32Array(nextCap);
            nn.set(gridNext);
            gridNext = nn;
            const nd = new Int32Array(nextCap);
            nd.set(gridDiscIdx);
            gridDiscIdx = nd;
          }
          const cell = rowOff + cx;
          gridDiscIdx[nodeCount] = di;
          gridNext[nodeCount] = gridHead[cell];
          gridHead[cell] = nodeCount++;
        }
      }
    }
    if (nodeCount === 0) return;
  }

  const gy0 = Math.floor(bounds.y / c.spacingY) - 1;
  const gy1 = Math.ceil((bounds.y + bounds.h) / c.spacingY);
  const gx0 = Math.floor(bounds.x / c.spacingX) - 1;
  const gx1 = Math.ceil((bounds.x + bounds.w) / c.spacingX);
  const padY = c.amplitude + 3.5;

  for (let gy = gy0; gy <= gy1; gy++) {
    const gyHash = Math.imul(gy, 19349663);
    for (let gx = gx0; gx <= gx1; gx++) {
      const seed = (Math.imul(gx, 73856093) ^ gyHash) >>> 0;
      const phase0 = hash01(seed, 3) * Math.PI * 2;
      const waveX = (gx + .2 + hash01(seed, 1) * .6) * c.spacingX;
      const waveY = (gy + .2 + hash01(seed, 2) * .6) * c.spacingY + Math.sin(time * .31 + phase0) * c.drift;
      const waveLen = c.length * (.6 + hash01(seed, 4) * .6);

      let insideAll = !useDiscs;
      let nearCount = 0;
      if (useDiscs && discs) {
        const cellX = Math.floor(waveX / GRID_CELL) - gOx;
        const cellY = Math.floor(waveY / GRID_CELL) - gOy;
        if (cellX < 0 || cellX >= gCols || cellY < 0 || cellY >= gRows) continue;
        for (let node = gridHead[cellY * gCols + cellX]; node !== -1; node = gridNext[node]) {
          const d = discs[gridDiscIdx[node]];
          const adx = Math.abs(waveX - d.pos.x);
          const ady = Math.abs(waveY - d.pos.y);
          const r = d.radius;
          if (adx > r + waveLen || ady > r + padY) continue;
          const farX = adx + waveLen;
          const farY = ady + padY;
          if (farX * farX + farY * farY <= r * r) {
            insideAll = true;
            nearCount = 1;
            break;
          }
          nearX[nearCount] = d.pos.x;
          nearY[nearCount] = d.pos.y;
          nearR2[nearCount] = r * r;
          nearCount++;
        }
        if (!insideAll && nearCount === 0) continue;
      }

      const opacity = opacityAt ? opacityAt(waveX, waveY) : 1;
      if (opacity <= 0) continue;

      const s = Math.sin(time * .43 + phase0);
      const ratio = (.6 + .4 * s * s) * opacity;
      const bin = ratio < 0.71 ? 0 : ratio < 0.825 ? 1 : ratio < 0.94 ? 2 : 3;
      const wavePhase = phase0 + time * c.speed;

      for (let band = 0; band < 2; band++) {
        const buf = bucketPaths[band * ALPHA_BINS + bin];
        const bandOff = band * 3;
        if (insideAll) {
          for (let i = 0; i <= 8; i++) {
            const t = i * 0.125;
            const x = waveX + (t - .5) * waveLen * 2;
            const y = waveY + Math.sin(t * Math.PI * 2 + wavePhase) * c.amplitude + bandOff;
            if (i === 0) pushPolyMove(buf, x, y);
            else pushPolyLine(buf, x, y);
          }
        } else {
          let penDown = false;
          let prevX = 0, prevY = 0;
          for (let i = 0; i <= 8; i++) {
            const t = i * 0.125;
            const x = waveX + (t - .5) * waveLen * 2;
            const y = waveY + Math.sin(t * Math.PI * 2 + wavePhase) * c.amplitude + bandOff;
            const wet = inNearDiscs(x, y, nearCount);
            if (wet) {
              if (!penDown) {
                if (i > 0) {
                  const mx = (prevX + x) * 0.5, my = (prevY + y) * 0.5;
                  if (inNearDiscs(mx, my, nearCount)) pushPolyMove(buf, mx, my);
                  else pushPolyMove(buf, x, y);
                  if (inNearDiscs(mx, my, nearCount)) pushPolyLine(buf, x, y);
                } else {
                  pushPolyMove(buf, x, y);
                }
                penDown = true;
              } else {
                pushPolyLine(buf, x, y);
              }
            } else if (penDown) {
              const mx = (prevX + x) * 0.5, my = (prevY + y) * 0.5;
              if (inNearDiscs(mx, my, nearCount)) pushPolyLine(buf, mx, my);
              penDown = false;
            }
            prevX = x; prevY = y;
          }
        }
      }
    }
  }

  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let band = 0; band < 2; band++) {
    ctx.strokeStyle = band ? c.shadow : c.highlight;
    const bandScale = band ? 0.5 : 1;
    for (let bin = 0; bin < ALPHA_BINS; bin++) {
      const buf = bucketPaths[band * ALPHA_BINS + bin];
      if (buf.length === 0) continue;
      ctx.globalAlpha = c.opacity * BUCKET_ALPHAS[bin] * bandScale;
      ctx.beginPath();
      let i = 0;
      while (i < buf.length) {
        if (Number.isNaN(buf[i])) {
          ctx.moveTo(buf[i + 1], buf[i + 2]);
          i += 3;
        } else {
          ctx.lineTo(buf[i], buf[i + 1]);
          i += 2;
        }
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
