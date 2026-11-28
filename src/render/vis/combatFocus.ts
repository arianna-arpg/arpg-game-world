import type { Vec2 } from '../../core/math';
import { VIS_CFG } from './visConfig';

export interface CombatRect { x: number; y: number; w: number; h: number }
export function combatBodyRect(pos: Vec2, radius: number): CombatRect {
  const c = VIS_CFG.combatFocus.numbers;
  return { x: pos.x - radius - c.bodyPad, y: pos.y - radius - c.barRise,
    w: (radius + c.bodyPad) * 2, h: radius * 2 + c.barRise + c.bodyPad };
}
export function combatRectsOverlap(a: CombatRect, b: CombatRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
const TEXT_STEP_DIRS = [[-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]] as const;
/** Client-only placement. Values, lifetimes, colours and host positions remain
 * untouched. Stable offsets keep an existing number from snapping back whenever
 * an older one expires; collision can push it farther as a body approaches. */
interface TextPlacementTuning { readonly enabled: boolean; readonly gap: number; readonly step: number; readonly rings: number }
export class CombatTextLayout {
  constructor(private tuning: () => TextPlacementTuning = () => VIS_CFG.combatFocus.numbers) {}
  private offsets = new WeakMap<object, Vec2>();
  private occupied: CombatRect[] = [];
  private occCount = 0;
  private bounds?: CombatRect;
  begin(bodies: CombatRect[], bounds?: CombatRect): void {
    this.occCount = bodies.length;
    for (let i = 0; i < bodies.length; i++) {
      const src = bodies[i];
      let slot = this.occupied[i];
      if (!slot) { slot = { x: src.x, y: src.y, w: src.w, h: src.h }; this.occupied[i] = slot; }
      else { slot.x = src.x; slot.y = src.y; slot.w = src.w; slot.h = src.h; }
    }
    this.bounds = bounds;
  }
  forget(key: object): void { this.offsets.delete(key); }
  private isClear(px: number, py: number, width: number, height: number, gap: number): boolean {
    const rx = px - width * 0.5 - gap, ry = py - height - gap;
    const rw = width + gap * 2, rh = height + gap * 2;
    const rx2 = rx + rw, ry2 = ry + rh;
    const b = this.bounds;
    if (b && (rx < b.x || ry < b.y || rx2 > b.x + b.w || ry2 > b.y + b.h)) return false;
    for (let i = 0; i < this.occCount; i++) {
      const o = this.occupied[i];
      if (rx < o.x + o.w && o.x < rx2 && ry < o.y + o.h && o.y < ry2) return false;
    }
    return true;
  }
  place(key: object, pos: Vec2, width: number, height: number): Vec2 {
    const c = this.tuning();
    if (!c.enabled) return pos;
    const gap = c.gap;
    const prior = this.offsets.get(key);
    let cx = prior ? pos.x + prior.x : pos.x;
    let cy = prior ? pos.y + prior.y : pos.y;
    if (!this.isClear(cx, cy, width, height, gap)) {
      let found = false;
      // Prefer a nearby upper flank to the space below a body, where incoming
      // ground threats must remain legible. Search is bounded even in a crowd.
      for (let ring = 1; ring <= c.rings && !found; ring++) {
        const d = ring * c.step;
        for (let s = 0; s < TEXT_STEP_DIRS.length; s++) {
          const dir = TEXT_STEP_DIRS[s];
          const tx = pos.x + dir[0] * d, ty = pos.y + dir[1] * d;
          if (this.isClear(tx, ty, width, height, gap)) { cx = tx; cy = ty; found = true; break; }
        }
      }
      // Saturated screen: keep the original read rather than silently discard
      // damage. The local player marker still composites above all number text.
      if (!found) { cx = pos.x; cy = pos.y; }
    }
    if (prior) { prior.x = cx - pos.x; prior.y = cy - pos.y; }
    else this.offsets.set(key, { x: cx - pos.x, y: cy - pos.y });
    let slot = this.occupied[this.occCount];
    const rx = cx - width * 0.5 - gap, ry = cy - height - gap;
    const rw = width + gap * 2, rh = height + gap * 2;
    if (!slot) { slot = { x: rx, y: ry, w: rw, h: rh }; this.occupied[this.occCount] = slot; }
    else { slot.x = rx; slot.y = ry; slot.w = rw; slot.h = rh; }
    this.occCount++;
    return cx === pos.x && cy === pos.y ? pos : { x: cx, y: cy };
  }
}
/** Four square corners identify the local controlled body, unlike the native
 * round rarity/guard/pack tells. A small nose follows actual facing. */
export function drawPlayerFocus(ctx: CanvasRenderingContext2D, pos: Vec2, radius: number, facing: number, crowded: boolean): void {
  const c=VIS_CFG.combatFocus.player;
  if(!c.enabled)return;
  const r=radius+c.pad, length=c.corner;
  ctx.save();ctx.translate(pos.x,pos.y);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.globalAlpha*=crowded?c.crowdAlpha:c.restAlpha; // drawPlayerFocus respects Aim Tick opacity
  ctx.beginPath();
  for(const sx of [-1,1])for(const sy of [-1,1]){
    ctx.moveTo(sx*(r-length),sy*r);ctx.lineTo(sx*r,sy*r);ctx.lineTo(sx*r,sy*(r-length));
  }
  const nx=Math.cos(facing),ny=Math.sin(facing),reach=r+c.nose;
  ctx.moveTo(nx*(reach-c.nose)-ny*c.nose*.5,ny*(reach-c.nose)+nx*c.nose*.5);
  ctx.lineTo(nx*reach,ny*reach);
  ctx.lineTo(nx*(reach-c.nose)+ny*c.nose*.5,ny*(reach-c.nose)-nx*c.nose*.5);
  ctx.strokeStyle=c.edge;ctx.lineWidth=c.width+c.outline*2;ctx.stroke();
  ctx.strokeStyle=c.color;ctx.lineWidth=c.width;ctx.stroke();ctx.restore();
}
