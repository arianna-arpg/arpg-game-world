import type { Actor } from '../../engine/actor';
import { meleeReachCueOf } from '../../engine/meleeReach';
import { AOE_SHAPE, bandSwingGeo } from '../../engine/skills';
import { traceAoePath } from './aoeTrace';
import { VIS_CFG } from './visConfig';

/** A quiet weapon footprint on the ground, never a target or hit guarantee. */
export function drawMeleeReach(ctx:CanvasRenderingContext2D,a:Actor):void {
  const c=VIS_CFG.meleeReach;if(!c.enabled)return;
  const cue=meleeReachCueOf(a);if(!cue)return;
  const progress=a.casting!.total>0?Math.max(0,Math.min(1,a.casting!.elapsed/a.casting!.total)):1;
  const {reach,arc,shape,facing}=cue;
  ctx.save();ctx.translate(a.pos.x,a.pos.y);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();
  if(shape===AOE_SHAPE.band){
    const g=bandSwingGeo(reach,arc);
    traceAoePath(ctx,Math.cos(facing)*g.standoff,Math.sin(facing)*g.standoff,g.halfWidth,shape,facing);
  }else if(shape===AOE_SHAPE.square||shape===AOE_SHAPE.triangle){
    traceAoePath(ctx,0,0,reach,shape,facing);
  }else{
    ctx.beginPath();
    if(arc>=Math.PI*2-.01)ctx.arc(0,0,reach,0,Math.PI*2);
    else{ctx.moveTo(0,0);ctx.arc(0,0,reach,facing-arc/2,facing+arc/2);ctx.closePath();}
  }
  ctx.fillStyle=c.color;ctx.globalAlpha=c.fillAlpha*progress;ctx.fill();
  ctx.globalAlpha=c.alpha+c.progressAlpha*progress;
  ctx.strokeStyle=c.edge;ctx.lineWidth=c.width+c.outline;ctx.stroke();
  ctx.strokeStyle=c.color;ctx.lineWidth=c.width;ctx.stroke();ctx.restore();
}
