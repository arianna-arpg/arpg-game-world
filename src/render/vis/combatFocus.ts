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
/** Client-only placement. Values, lifetimes, colours and host positions remain
 * untouched. Stable offsets keep an existing number from snapping back whenever
 * an older one expires; collision can push it farther as a body approaches. */
interface TextPlacementTuning { readonly enabled: boolean; readonly gap: number; readonly step: number; readonly rings: number }
export class CombatTextLayout {
  constructor(private tuning: () => TextPlacementTuning = () => VIS_CFG.combatFocus.numbers) {}
  private offsets = new WeakMap<object, Vec2>();
  private occupied: CombatRect[] = [];
  private bounds?: CombatRect;
  begin(bodies: CombatRect[], bounds?: CombatRect): void { this.occupied = bodies.slice(); this.bounds = bounds; }
  forget(key: object): void { this.offsets.delete(key); }
  place(key: object, pos: Vec2, width: number, height: number): Vec2 {
    const c = this.tuning();
    if (!c.enabled) return pos;
    const rect = (p: Vec2): CombatRect => ({ x: p.x - width/2 - c.gap, y: p.y - height - c.gap,
      w: width + c.gap*2, h: height + c.gap*2 });
    const clear = (p: Vec2) => {
      const r=rect(p),b=this.bounds;
      return (!b || r.x>=b.x && r.y>=b.y && r.x+r.w<=b.x+b.w && r.y+r.h<=b.y+b.h)
        && !this.occupied.some(other=>combatRectsOverlap(other,r));
    };
    const prior = this.offsets.get(key);
    let chosen = prior ? { x: pos.x+prior.x, y: pos.y+prior.y } : pos;
    if (!clear(chosen)) {
      let found = false;
      // Prefer a nearby upper flank to the space below a body, where incoming
      // ground threats must remain legible. Search is bounded even in a crowd.
      for (let ring=1; ring<=c.rings&&!found; ring++) {
        const d=ring*c.step;
        for (const [dx,dy] of [[-d,0],[d,0],[0,-d],[-d,-d],[d,-d]]) {
          const p={x:pos.x+dx,y:pos.y+dy};
          if(clear(p)){chosen=p;found=true;break;}
        }
      }
      // Saturated screen: keep the original read rather than silently discard
      // damage. The local player marker still composites above all number text.
      if(!found)chosen=pos;
    }
    this.offsets.set(key,{x:chosen.x-pos.x,y:chosen.y-pos.y});
    this.occupied.push(rect(chosen));
    return chosen;
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
