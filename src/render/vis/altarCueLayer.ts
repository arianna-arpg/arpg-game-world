import type { AltarInfluence } from '../../engine/altarCues';
import { contrastGuard } from './color';
import { VIS_CFG } from './visConfig';

/** The altar's triangular sigil rides each actual recipient. Inward motes travel
 * from its source direction without drawing a line through occluding scenery. Body paint
 * owns visibility and alpha; this layer cannot reveal a hidden participant. */
export function drawAltarInfluence(ctx:CanvasRenderingContext2D, rows:readonly AltarInfluence[],
  radius:number, pos:{x:number;y:number}, time:number):void {
  const c=VIS_CFG.altar.influence;
  if(!c.enabled||!rows.length)return;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  for(const [i,row] of rows.slice(0,c.maxSources).entries()) {
    const color=contrastGuard(row.color,c.outline,c.contrast,'lighter');
    const r=radius+c.pad+i*c.spacing;
    const direction=Math.atan2(row.y-pos.y,row.x-pos.x);
    ctx.save();ctx.rotate(direction);
    for(let j=0;j<c.motes;j++) {
      const phase=(time/c.period+j/c.motes)%1, x=r+c.travel*(1-phase);
      ctx.beginPath();ctx.moveTo(x+3,-3);ctx.lineTo(x,0);ctx.lineTo(x+3,3);
      ctx.strokeStyle=c.outline;ctx.lineWidth=c.width+2;ctx.stroke();
      ctx.strokeStyle=color;ctx.lineWidth=c.width;ctx.stroke();
    }
    ctx.restore();
    const sx=Math.cos(direction)*r,sy=Math.sin(direction)*r;
    ctx.beginPath();ctx.moveTo(sx,sy-c.sigil);ctx.lineTo(sx+c.sigil,sy+c.sigil*.65);
    ctx.lineTo(sx-c.sigil,sy+c.sigil*.65);ctx.closePath();
    ctx.fillStyle=c.outline;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=c.width;ctx.stroke();
  }
  ctx.restore();
}
