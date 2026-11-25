import type { SupportMark } from '../../engine/supportPresentation';
import type { BuffIconRect } from './buffIcons';
import { VIS_CFG } from './visConfig';

/** Keep the drum clear of other face readouts on narrow co-op slots. */
export function compactChargeCounters(marks:readonly SupportMark[],width:number,bank:()=>{count:number;cap:number}) {
  if(width>=VIS_CFG.buffMagazine.minFaceWidth || !marks.some(m=>m.useBank)) return marks;
  return marks.flatMap(m=>m.useBank ? [...(m.meter ? [m] : []),{...m,meter:bank(),readout:'Skill charges',extraReadings:undefined}] : [m]);
}

export interface CounterSlot { meters:number; magazines:number; meta:boolean }
export interface CounterLink { left:number; right:number; center:number; y:number }

/** Every counter, magazine and hover target stays in the column of its skill.
 * Reflow depends on the local counter count and seat width, never on the balance. */
export function supportCounterLayout(slots:readonly CounterSlot[],left:number,barY:number,width:number,gap:number) {
  const cfg=VIS_CFG.buffMagazine, pitch=width+gap;
  const links:CounterLink[]=[];
  let clearance:number=VIS_CFG.buffIcons.barClearance;
  const groups=slots.map((slot,i)=>{
    const x=left+i*pitch, cx=x+width/2;
    const inside=Math.max(0,width-2*cfg.inset);
    const columns=slot.meters>1 && inside>=2*cfg.minCounterWidth+cfg.gap ? 2 : 1;
    const height=slot.meters>1 ? cfg.compactHeight : cfg.height;
    const bottom=barY-(slot.meta ? cfg.metaClearance : cfg.slotClearance)-(columns===2 ? cfg.linkHeight : 0);
    const cell=(inside-(columns-1)*cfg.gap)/columns;
    const meters:BuffIconRect[]=[], magazines:BuffIconRect[]=[];
    const rows=Math.ceil(slot.meters/columns);
    for(let j=0;j<slot.meters;j++) {
      const row=Math.floor(j/columns), column=j%columns;
      const lone=column===0 && j+1===slot.meters;
      meters.push({x:x+cfg.inset+column*(cell+cfg.gap),y:bottom-height-row*(height+cfg.gap),
        w:lone ? inside : cell,h:height});
    }
    if(columns===2) links.push({left:meters[0].x+cell/2,right:meters[1].x+cell/2,center:cx,y:bottom});
    const bankBottom=bottom-rows*(height+cfg.gap);
    for(let j=0;j<slot.magazines;j++)
      magazines.push({x:x+cfg.inset,y:bankBottom-cfg.height-j*(cfg.height+cfg.gap),w:inside,h:cfg.height});
    const top=magazines.at(-1) ?? meters.at(-1);
    if(top) clearance=Math.max(clearance,barY-top.y+VIS_CFG.buffIcons.gap);
    return {meters,magazines};
  });
  return {groups,links,clearance};
}

export function drawCounterLinks(ctx:CanvasRenderingContext2D,links:readonly CounterLink[],trim:string) {
  if(!links.length) return;
  ctx.save();ctx.strokeStyle=trim;ctx.globalAlpha=.8;ctx.lineWidth=1;
  for(const {left,right,center,y} of links) {
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left,y+2);ctx.lineTo(right,y+2);ctx.lineTo(right,y);
    ctx.moveTo(center,y+2);ctx.lineTo(center,y+VIS_CFG.buffMagazine.linkHeight);ctx.stroke();
  }
  ctx.restore();
}
