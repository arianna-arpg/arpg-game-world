import { STATUS_DEFS, type ActiveStatus, type StatusDef } from '../../engine/status';
import type { AfflictionPressure } from '../../engine/afflictionPressure';
import { AFFLICTION_CUE_CFG } from '../../data/afflictionCues';
import { VIS_CFG } from './visConfig';
import {activeDebuffs,statusPresentation} from '../statusPresentation';

export interface StatusReadoutRow {
  id: string; label: string; color: string; stacks: number;
  remaining?: number; firstExpiry?: number; detail: string; priority: number;
}
/** Same definitions, clocks and host-resolved pressure as the native ailment
 * layers. Presence is never a promise of future damage or a death forecast. */
export function statusReadoutRows(statuses: readonly ActiveStatus[], pressure: AfflictionPressure,
  inactive = false): StatusReadoutRow[] {
  if (inactive) return [];
  const rows = new Map<string, StatusReadoutRow>();
  for (const s of activeDebuffs(statuses)) {
    const def:Partial<StatusDef> = STATUS_DEFS[s.id] ?? {};
    const presentation = statusPresentation(s)!;
    const dot = s.dps > 0 || s.screenDot;
    const armed = (s.rupture ?? 0) > 0 || !!def.cullsAtLethal || !!def.dischargeOnHit;
    const severe = (pressure[s.id] ?? 0) >= AFFLICTION_CUE_CFG.pressureFull;
    const detail = def.hardCC ? 'Unable to move or act'
      : dot ? (severe ? 'Severe damage over time' : 'Damage over time')
        : armed ? (severe ? 'Severe armed damage' : 'Armed damage') : '';
    // Stable within a class: counting down must not shuffle the player's read.
    const priority = def.hardCC ? 4 : severe ? 3 : dot || armed ? 2 : 1;
    const clock = s.remainingKnown !== false && Number.isFinite(s.remaining) ? s.remaining : undefined;
    const row = rows.get(s.id);
    if (row) {
      row.stacks += s.stacks;
      row.priority = Math.max(row.priority, priority);
      if (detail) row.detail = detail;
      // One unknown application means the complete expiry is unknown.
      if (clock === undefined || row.remaining === undefined) {
        row.remaining = undefined; row.firstExpiry = undefined;
      } else {
        row.remaining = Math.max(row.remaining, clock);
        row.firstExpiry = Math.min(row.firstExpiry!, clock);
      }
    } else rows.set(s.id, { id:s.id,label:presentation.label,color:presentation.color,stacks:s.stacks,
      remaining:clock,firstExpiry:clock,detail,priority });
  }
  return [...rows.values()].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
export function statusReadoutTime(row: StatusReadoutRow): string {
  const seconds = (n:number) => n >= 60 ? Math.ceil(n / 60) + 'm' : (Math.ceil(n * 10) / 10).toFixed(1) + 's';
  if (row.remaining === undefined) return '';
  return row.firstExpiry !== undefined && Math.ceil(row.firstExpiry*10) !== Math.ceil(row.remaining*10)
    ? seconds(row.firstExpiry) + '–' + seconds(row.remaining) : seconds(row.remaining);
}

/** Returns the next header baseline so announcements reserve this space too. */
export function drawStatusReadout(ctx: CanvasRenderingContext2D, rows: readonly StatusReadoutRow[],
  x:number,y:number,availableWidth:number,align:'left'|'right'): number {
  const c=VIS_CFG.statusReadout,width=Math.min(c.maxWidth,availableWidth);
  if (!c.enabled || !rows.length || width<c.minWidth) return y;
  const left=align==='left'?x:x-width;
  const fit=(text:string,max:number)=>{
    const letters=[...text];
    if(ctx.measureText(text).width<=max)return text;
    while(letters.length&&ctx.measureText(letters.join('')+'…').width>max)letters.pop();
    return letters.join('')+'…';
  };
  ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';
  for(const row of rows.slice(0,c.maxRows)){
    const height=row.detail?c.rowHeight:c.lineHeight;
    ctx.fillStyle=c.background;ctx.fillRect(left,y-c.ascent,width,height-c.gap);
    ctx.fillStyle=row.color;ctx.fillRect(left,y-c.ascent,c.stripe,height-c.gap);
    ctx.font=c.font;ctx.fillStyle=c.text;
    const time=statusReadoutTime(row),timeWidth=ctx.measureText(time).width;
    const label=row.label+(row.stacks>1?' ×'+row.stacks:'');
    ctx.fillText(fit(label,width-c.pad*2-timeWidth-(time?c.pad:0)),left+c.pad,y);
    if(time){ctx.textAlign='right';ctx.fillText(time,left+width-c.pad,y);ctx.textAlign='left';}
    if(row.detail){ctx.font=c.detailFont;ctx.fillStyle=c.detail;ctx.fillText(fit(row.detail,width-c.pad*2),left+c.pad,y+c.detailOffset);}
    y+=height;
  }
  if(rows.length>c.maxRows){
    ctx.font=c.detailFont;ctx.fillStyle=c.detail;
    ctx.fillText('+'+(rows.length-c.maxRows)+' other effects',left+c.pad,y);y+=c.lineHeight;
  }
  ctx.restore();return y;
}

/** A stable screen-space lane near the hero, bounded above the native hotbar.
 * Couch seats retain separate halves even when their bodies meet. */
export function statusReadoutAnchor(focus: {x:number;y:number}, width:number, height:number,
  side?: 'left' | 'right', rows?: readonly StatusReadoutRow[]): {x:number;y:number;width:number} {
  const c=VIS_CFG.statusReadout, start=side==='right'?width/2:0, end=side==='left'?width/2:width;
  const available=Math.max(0,end-start-c.margin*2), w=Math.min(c.maxWidth,available);
  const contentHeight=rows ? rows.slice(0,c.maxRows).reduce((h,r)=>h+(r.detail?c.rowHeight:c.lineHeight),0)
    +(rows.length>c.maxRows?c.lineHeight:0) : c.maxRows*c.rowHeight+c.lineHeight;
  const lower=Math.min(height-c.bottomReserve-contentHeight,focus.y+c.focusOffset);
  // If a short viewport cannot fit below the body, reserve a lane above it.
  const baseline=lower>=focus.y+c.bodyClearance ? lower : focus.y-c.bodyClearance-contentHeight;
  return {x:Math.max(start+c.margin,Math.min(end-c.margin-w,focus.x-w/2)),
    y:Math.max(c.ascent+c.margin,baseline),width:w};
}
