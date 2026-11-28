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
type CounterLayoutResult = {
  groups: { meters: BuffIconRect[]; magazines: BuffIconRect[] }[];
  links: CounterLink[];
  clearance: number;
};

let memoLeft = NaN, memoBarY = NaN, memoWidth = NaN, memoGap = NaN;
let memoCfgStamp = '';
let memoSlotPacked: number[] = [];
let memoResult: CounterLayoutResult | null = null;

function packSlot(s: CounterSlot): number {
  return (s.meters << 16) | (s.magazines << 1) | (s.meta ? 1 : 0);
}

/** Every counter, magazine and hover target stays in the column of its skill.
 * Reflow depends on the local counter count and seat width, never on the balance. */
export function supportCounterLayout(slots:readonly CounterSlot[],left:number,barY:number,width:number,gap:number): CounterLayoutResult {
  const cfg=VIS_CFG.buffMagazine, bi=VIS_CFG.buffIcons;
  const cfgStamp = `${cfg.inset}|${cfg.minCounterWidth}|${cfg.gap}|${cfg.compactHeight}|${cfg.height}|${cfg.metaClearance}|${cfg.slotClearance}|${cfg.linkHeight}|${bi.barClearance}|${bi.gap}`;
  if (
    memoResult !== null &&
    left === memoLeft && barY === memoBarY && width === memoWidth && gap === memoGap &&
    cfgStamp === memoCfgStamp && slots.length === memoSlotPacked.length
  ) {
    let same = true;
    for (let i = 0; i < slots.length; i++) {
      if (packSlot(slots[i]) !== memoSlotPacked[i]) { same = false; break; }
    }
    if (same) return memoResult;
  }
  const pitch=width+gap;
  const links:CounterLink[]=[];
  let clearance:number=bi.barClearance;
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
    if(top) clearance=Math.max(clearance,barY-top.y+bi.gap);
    return {meters,magazines};
  });
  memoLeft = left; memoBarY = barY; memoWidth = width; memoGap = gap;
  memoCfgStamp = cfgStamp;
  memoSlotPacked = slots.map(packSlot);
  memoResult = {groups,links,clearance};
  return memoResult;
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
