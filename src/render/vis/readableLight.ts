import type { CombatRect } from './combatFocus';
import { VIS_CFG } from './visConfig';
import { baked } from './sprites';

/** Subtract only ambient darkness from already-admitted combat silhouettes and
 * readouts. Existing cover pixels, status fades and world geometry remain in
 * the underlying frame. No light source, bloom, visibility or simulation state
 * is created. Elliptical feathering avoids hard bright rectangles at night. */
export function drawReadableLightMask(ctx: CanvasRenderingContext2D, rects: readonly CombatRect[],
  dark: number, camX: number, camY: number, scale: number): void {
  const c=VIS_CFG.lights.readability;
  if(!c.enabled||dark<=c.maxDark||!rects.length)return;
  const mask=baked('combat-readable-darkness',64,64,paint=>{
    const g=paint.createRadialGradient(0,0,0,0,0,32);
    g.addColorStop(0,'#000');g.addColorStop(.6,'#000');g.addColorStop(1,'rgba(0,0,0,0)');
    paint.fillStyle=g;paint.fillRect(-32,-32,64,64);
  });
  ctx.save();ctx.globalCompositeOperation='destination-out';
  ctx.globalAlpha=1-c.maxDark/dark;
  for(const r of rects){
    ctx.drawImage(mask,(r.x-c.feather-camX)*scale,(r.y-c.feather-camY)*scale,
      (r.w+c.feather*2)*scale,(r.h+c.feather*2)*scale);
  }
  ctx.restore();
}
