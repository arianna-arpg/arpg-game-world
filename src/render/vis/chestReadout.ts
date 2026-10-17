import { dist, type Vec2 } from '../../core/math';
import type { World, Chest } from '../../engine/world';
import { chestInReach } from '../../engine/chestInteraction';
import { VIS_CFG } from './visConfig';

/** One local affordance, admitted through native sight. No mimic identity or
 * invented host clocks leak into a mirror or an unopened container's readout. */
export function chestReadout(world: World, aim: Vec2 | null): { chest: Chest; text: string } | null {
  const cfg=VIS_CFG.chestReadout,p=world.player;
  if(!cfg.enabled||world.clientActionHook||p.dead)return null;
  let best:{chest:Chest;text:string;score:number}|null=null;
  for(const c of world.chests){
    if(c.opened||c.kind!=='timed'||c.maxLock<=0)continue;
    const distance=dist(c.pos,p.pos);
    if(distance>cfg.range)continue;
    const near=chestInReach(c,p),hover=!!aim&&dist(c.pos,aim)<=cfg.hoverRadius;
    if(!near&&!hover&&c.lockTime>=c.maxLock)continue;
    if(!world.lineOfSight(p.pos,c.pos,p.tier))continue;
    const score=(near?0:hover?cfg.range:cfg.range*2)+distance;
    if(!best||score<best.score)best={chest:c,text:near?cfg.searching:cfg.approach,score};
  }
  return best&&{chest:best.chest,text:best.text};
}
export function drawChestReadout(ctx: CanvasRenderingContext2D, text: string, pos: Vec2): void {
  const c=VIS_CFG.chestReadout;ctx.save();ctx.font=c.font;ctx.textAlign='center';
  const points=Array.from(text);let label=text;
  while(points.length&&ctx.measureText(label).width>c.width){points.pop();label=points.join('')+'…';}
  ctx.lineJoin='round';ctx.lineWidth=c.outline;ctx.strokeStyle=c.edge;
  ctx.strokeText(label,pos.x,pos.y+c.y);ctx.fillStyle=c.text;ctx.fillText(label,pos.x,pos.y+c.y);ctx.restore();
}
