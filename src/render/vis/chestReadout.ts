import { dist, type Vec2 } from '../../core/math';
import type { World, Chest } from '../../engine/world';
import { chestInReach } from '../../engine/chestInteraction';
import { VIS_CFG } from './visConfig';

/** One local affordance, admitted through native sight. No mimic identity or
 * invented host clocks leak into a mirror or an unopened container's readout. */
export interface ChestReadout { chest: Chest; searching: boolean; progress: number }
export function chestReadout(world: World, aim: Vec2 | null): ChestReadout | null {
  const cfg=VIS_CFG.chestReadout,p=world.player;
  if(!cfg.enabled||world.clientActionHook||p.dead)return null;
  let best:(ChestReadout & {score:number})|null=null;
  for(const c of world.chests){
    if(c.opened||c.kind!=='timed'||c.maxLock<=0)continue;
    const distance=dist(c.pos,p.pos);
    if(distance>cfg.range)continue;
    const near=chestInReach(c,p),hover=!!aim&&dist(c.pos,aim)<=cfg.hoverRadius;
    if(!near&&!hover&&c.lockTime>=c.maxLock)continue;
    if(!world.lineOfSight(p.pos,c.pos,p.tier))continue;
    const score=(near?0:hover?cfg.range:cfg.range*2)+distance;
    if(!best||score<best.score)best={chest:c,searching:near,
      progress:Math.max(0,Math.min(1,1-c.lockTime/c.maxLock)),score};
  }
  return best;
}
export function drawChestReadout(ctx: CanvasRenderingContext2D, cue: ChestReadout, pos: Vec2, time: number): void {
  const c=VIS_CFG.chestReadout;
  ctx.save();ctx.translate(pos.x,pos.y-5);
  // A quiet latch glint invites approach. While searching, sparks travel
  // into the latch and its arc fills from the real interaction clock.
  ctx.globalAlpha*=cue.searching?.85:.35+.2*Math.sin(time*c.pulseHz*Math.PI*2);
  ctx.strokeStyle=c.edge;ctx.lineWidth=c.width+2;
  ctx.beginPath();ctx.arc(0,0,c.radius,-Math.PI/2,-Math.PI/2+Math.PI*2*(cue.searching?Math.max(.04,cue.progress):.18));ctx.stroke();
  ctx.strokeStyle=c.color;ctx.lineWidth=c.width;ctx.stroke();
  ctx.fillStyle=c.color;
  if(cue.searching)for(let i=0;i<c.motes;i++){
    const phase=(time*c.pulseHz+i/c.motes)%1,angle=i*Math.PI*2/c.motes+time;
    const r=c.radius*(1.8-phase);
    ctx.globalAlpha=.7*(1-phase);
    ctx.beginPath();ctx.arc(Math.cos(angle)*r,Math.sin(angle)*r,1.3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
