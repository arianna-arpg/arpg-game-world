import { WATER_SURFACE } from '../../data/waterSurface';
import { hash01 } from './color';
export interface WaterBounds { x: number; y: number; w: number; h: number }
/** World-anchored, simulation-clock motion; page and camera boundaries cannot
 * restart a wave. Callers clip to the actual wet union, including shallow fords. */
export function waterRipple(gx: number, gy: number, time: number) {
  const seed = (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 0;
  const phase = hash01(seed, 3) * Math.PI * 2;
  return { x: (gx + .2 + hash01(seed, 1) * .6) * WATER_SURFACE.spacingX,
    y: (gy + .2 + hash01(seed, 2) * .6) * WATER_SURFACE.spacingY
      + Math.sin(time * .31 + phase) * WATER_SURFACE.drift,
    phase: phase + time * WATER_SURFACE.speed,
    length: WATER_SURFACE.length * (.6 + hash01(seed, 4) * .6),
    alpha: WATER_SURFACE.opacity * (.6 + .4 * Math.sin(time * .43 + phase) ** 2) };
}
export function paintWaterSurface(ctx: CanvasRenderingContext2D, bounds: WaterBounds, time: number, opacityAt?: (x: number, y: number) => number): void {
  const c = WATER_SURFACE;
  ctx.save(); ctx.lineWidth = 1; ctx.lineCap = 'round';
  for (let gy = Math.floor(bounds.y / c.spacingY) - 1; gy <= Math.ceil((bounds.y + bounds.h) / c.spacingY); gy++)
    for (let gx = Math.floor(bounds.x / c.spacingX) - 1; gx <= Math.ceil((bounds.x + bounds.w) / c.spacingX); gx++) {
      const wave = waterRipple(gx, gy, time);
      const opacity = opacityAt?.(wave.x, wave.y) ?? 1;
      if (opacity <= 0) continue;
      for (let band = 0; band < 2; band++) {
        ctx.globalAlpha = wave.alpha * opacity * (band ? .5 : 1);
        ctx.strokeStyle = band ? c.shadow : c.highlight;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, x = wave.x + (t - .5) * wave.length * 2;
          const y = wave.y + Math.sin(t * Math.PI * 2 + wave.phase) * c.amplitude + band * 3;
          if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  ctx.restore();
}
