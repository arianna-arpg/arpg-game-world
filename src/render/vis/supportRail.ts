import type { SupportMark } from '../../engine/supportPresentation';
import type { CosmeticHotbarStyle } from '../../data/cosmeticStyles';
import type { BuffIconRect } from './buffIcons';
import { drawSupportCounter } from './supportCounters';
import { drawSkillIcon, supportIconFace } from '../skillIcons';
import type { CosmeticLoadout } from '../../engine/cosmetics';
import { drawSupportEmblem } from './supportEmblems';

/** Keep a stable left-to-right order; reserve one cell for an overflow count at narrow widths. */
export function supportRailLayout(count:number,width:number) {
  const cells=Math.min(count,Math.max(1,Math.floor(width/8)));
  const visible=cells<count ? cells-1 : cells;
  const pitch=Math.min(15,width/Math.max(1,cells));
  return {visible,hidden:count-visible,pitch,left:(width-cells*pitch)/2};
}
export function drawSupportRail(ctx:CanvasRenderingContext2D,marks:readonly SupportMark[],x:number,y:number,w:number,skin:CosmeticHotbarStyle,art?:CosmeticLoadout['hotbarSocketArt']) {
  if (!marks.length || w<6) return;
  const {visible,hidden,pitch,left}=supportRailLayout(marks.length,w);
  const size=Math.min(13,pitch-1), top=y-size+2;
  ctx.save();ctx.fillStyle=skin.rail;
  ctx.fillRect(x+left,top-1,w-2*left,size+3);
  for(let i=0;i<visible;i++) {
    const m=marks[i], px=x+left+i*pitch+(pitch-size)/2;
    ctx.globalAlpha=m.serving && m.lit!==false ? 1 : .55;
    if (art==='engraved') drawSupportEmblem(ctx,m,px,top,size);
    else drawSkillIcon(ctx,supportIconFace(m),px,top,size);
    ctx.globalAlpha=1;
    ctx.fillStyle=m.color;ctx.fillRect(px,top+size,size,1);
    if (m.graft) {
      ctx.fillStyle=skin.trim;ctx.beginPath();ctx.moveTo(px,top);
      ctx.lineTo(px+3,top);ctx.lineTo(px,top+3);ctx.fill();
    }
    if (m.lit || m.fired) {
      ctx.strokeStyle=m.fired?'#fff6dc':skin.trim;ctx.lineWidth=m.fired?1.7:1;
      ctx.strokeRect(px+.5,top+.5,size-1,size-1);
    }
  }
  if(hidden) {
    ctx.font='bold 8px Verdana';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f6ecdb';
    ctx.fillText('+'+hidden,x+left+(visible+.5)*pitch,top+size*.5,pitch);
  }
  ctx.restore();
}
export function drawSupportMeter(ctx:CanvasRenderingContext2D,mark:SupportMark,rect:BuffIconRect,skin:CosmeticHotbarStyle) {
  if (!mark.meter) return;
  ctx.save();
  if(mark.lit===false) ctx.globalAlpha*=.65;
  drawSupportCounter(ctx,mark,mark.meter,rect,skin);
  ctx.restore();
}
