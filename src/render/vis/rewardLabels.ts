import type { Vec2 } from '../../core/math';
import { combatRectsOverlap, type CombatRect } from './combatFocus';
import { VIS_CFG } from './visConfig';

interface RewardLabelTuning { readonly enabled: boolean; readonly gap: number;
  readonly step: number; readonly rings: number; readonly maxLabels: number }
/** Client-only, bounded packing for persistent ground names. Exhausted names
 * wait on their still-visible glyph, rather than cover bodies or other names.
 * Native UID keys survive snapshot replacement; stale keys retire each frame. */
export class RewardLabelLayout {
  constructor(private tuning: () => RewardLabelTuning = () => VIS_CFG.drops.rewardLabels) {}
  private offsets = new Map<number | object, Vec2>();
  private occupied: CombatRect[] = [];
  private bounds: CombatRect = { x: 0, y: 0, w: 0, h: 0 };
  readonly footprints: CombatRect[] = [];
  begin(ids: readonly (number | object)[], obstacles: CombatRect[], bounds: CombatRect): void {
    const live = new Set(ids);
    for (const id of this.offsets.keys()) if (!live.has(id)) this.offsets.delete(id);
    this.occupied = obstacles.slice(); this.bounds = bounds; this.footprints.length = 0;
  }
  place(id: number | object, anchor: Vec2, width: number, height: number,
    allowed: (rect: CombatRect) => boolean = () => true): CombatRect | null {
    const c = this.tuning(), b = this.bounds;
    if (![anchor.x, anchor.y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
    const rect = (p: Vec2): CombatRect => ({ x: p.x-width/2, y: p.y, w: width, h: height });
    const clear = (r: CombatRect) => r.x>=b.x && r.y>=b.y && r.x+r.w<=b.x+b.w && r.y+r.h<=b.y+b.h
      && allowed(r) && !this.occupied.some(o=>combatRectsOverlap(
        {x:r.x-c.gap,y:r.y-c.gap,w:r.w+c.gap*2,h:r.h+c.gap*2},o));
    if (!c.enabled) {
      const r=rect(anchor); if (!allowed(r)) return null;
      this.footprints.push(r); return r;
    }
    if (this.footprints.length>=c.maxLabels) return null;
    const prior=this.offsets.get(id);
    let chosen=rect(prior ? {x:anchor.x+prior.x,y:anchor.y+prior.y}:anchor);
    if (!clear(chosen)) {
      let found=false;
      for (let ring=0;ring<=c.rings&&!found;ring++) {
        const d=ring*c.step;
        for (const [dx,dy] of [[0,-d],[-d,0],[d,0],[-d,-d],[d,-d]]) {
          const r=rect({x:anchor.x+dx,y:anchor.y+dy});
          if (clear(r)) {chosen=r;found=true;break;}
        }
      }
      if (!found) return null;
    }
    this.offsets.set(id,{x:chosen.x+width/2-anchor.x,y:chosen.y-anchor.y});
    this.occupied.push(chosen); this.footprints.push(chosen); return chosen;
  }
}
