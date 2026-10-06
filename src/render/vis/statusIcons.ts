import { STATUS_DEFS, type ActiveStatus, type StatusDef } from '../../engine/status';
import { STAT_DEFS } from '../../engine/stats';
import { VIS_CFG } from './visConfig';
import {statusPresentation} from '../statusPresentation';
import { statusReadoutRows, statusReadoutTime, type StatusReadoutRow } from './statusReadout';
import type { AfflictionPressure } from '../../engine/afflictionPressure';

export const STATUS_ICON_VIEW = VIS_CFG.statusIcons;
export interface StatusIcon extends StatusReadoutRow { fraction?:number; }
export interface StatusIconRect { icon:StatusIcon; x:number; y:number; w:number; h:number; }
export interface StatusIconHover { rect:StatusIconRect; left:number; right:number; }
/** Stable identity order: changes in damage pressure cannot move hover targets. */
export function statusIcons(statuses:readonly ActiveStatus[],pressure:AfflictionPressure,inactive=false):StatusIcon[] {
  return statusReadoutRows(statuses,pressure,inactive).map(row=>{
    const lanes=statuses.filter(s=>s.id===row.id && s.remaining>0 && s.stacks>0);
    const latest=lanes.find(s=>s.remaining===row.remaining);
    const span=latest?.statusDuration ?? latest?.total;
    const fraction=row.remaining!==undefined && span!==undefined && Number.isFinite(span) && span>0
      ? Math.max(0,Math.min(1,row.remaining/span)) : undefined;
    return {...row,fraction};
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
export function layoutStatusIcons(icons:readonly StatusIcon[],orb:{x:number;y:number;radius:number},
  left:number,right:number):StatusIconRect[] {
  const c=STATUS_ICON_VIEW,columns=Math.max(1,Math.min(c.columns,Math.floor((right-left-c.margin*2+c.gap)/(c.size+c.gap))));
  const width=Math.min(columns,icons.length)*(c.size+c.gap)-c.gap;
  const x=Math.max(left+c.margin,Math.min(right-c.margin-width,orb.x-width/2));
  // Bottom row stays nearest Life as effects accumulate upwards.
  return icons.map((icon,i)=>({icon,x:x+(i%columns)*(c.size+c.gap),
    y:orb.y-orb.radius-c.orbClearance-c.size-Math.floor(i/columns)*(c.size+c.gap),w:c.size,h:c.size}));
}

/** Color plus a shape for common ailments; all other registry entries receive a
 * name mnemonic, so information never depends on color alone. */
export function drawStatusIcons(ctx:CanvasRenderingContext2D,rects:readonly StatusIconRect[]):void {
  const c=STATUS_ICON_VIEW;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const r of rects){
    const {icon}=r;ctx.fillStyle=c.background;ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.strokeStyle=icon.color;ctx.lineWidth=1;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);
    const glyph=statusPresentation(icon)?.glyph;
    if(glyph){ctx.save();ctx.translate(r.x+3,r.y+1);ctx.scale((r.w-6)/24,(r.h-5)/24);
      ctx.strokeStyle=icon.color;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(new Path2D(glyph));ctx.restore();}
    else {const words=icon.label.split(/\s+/);const label=(words.length>1?words.map(w=>[...w][0]).join(''):[...icon.label].slice(0,2).join('')).toUpperCase();
      ctx.fillStyle=icon.color;ctx.font='bold 10px Verdana';ctx.fillText(label,r.x+r.w/2,r.y+r.h/2-1,r.w-4);}
    // A thin draining track leaves the glyph and the playfield visible.
    if(icon.fraction!==undefined){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(r.x+2,r.y+r.h-4,r.w-4,2);
      ctx.fillStyle=icon.color;ctx.fillRect(r.x+2,r.y+r.h-4,(r.w-4)*icon.fraction,2);}
    if(icon.stacks>1){ctx.font='bold 9px Verdana';ctx.textAlign='right';ctx.strokeStyle='#070c12';ctx.lineWidth=2.5;
      ctx.strokeText(String(icon.stacks),r.x+r.w-1,r.y+5);ctx.fillStyle=c.ink;ctx.fillText(String(icon.stacks),r.x+r.w-1,r.y+5);ctx.textAlign='center';}
  }ctx.restore();
}
/** Qualitative rules come from the actual definition, not invented damage
 * forecasts or unscaled base percentages masquerading as live magnitudes. */
export function statusIconDetails(icon:StatusIcon):string[] {
  const def:Partial<StatusDef>=STATUS_DEFS[icon.id]??{},lines:string[]=[];
  if(icon.detail)lines.push(icon.detail);
  if(def.forbidsTags?.length)lines.push('Cannot use '+def.forbidsTags.join(' / ')+' skills');
  if(def.invertMove)lines.push('Movement direction reversed');
  if(def.interruptChance)lines.push('Skills may fizzle and briefly stun you');
  if(def.scrambleChance)lines.push('Skills may trigger a different ready skill');
  if(def.buildup)lines.push('At full stacks: '+(STATUS_DEFS[def.buildup.into]?.label??def.buildup.into));
  for(const mod of def.mods??[])if(mod.value!==0)lines.push((STAT_DEFS[mod.stat]?.label??mod.stat)+(mod.value<0?' reduced':' increased'));
  if(!lines.length)lines.push('Active debuff');
  return [...new Set(lines)];
}
/** Exactly one bounded hover card; returns its bounds for the HUD's hit ledger. */
export function drawStatusIconHover(ctx:CanvasRenderingContext2D,hover:StatusIconHover):{x:number;y:number;w:number;h:number}|undefined {
  const c=STATUS_ICON_VIEW,{rect,left,right}=hover,{icon}=rect;
  const width=Math.min(c.cardWidth,right-left-c.margin*2),inner=width-16;
  if(inner<40)return;
  ctx.save();ctx.font='11px Verdana';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  const wrap=(line:string)=>{const rows:string[]=[];let row='';for(const word of line.split(' ')){
    if(row && ctx.measureText(row+' '+word).width>inner){rows.push(row);row='';}row+=(row?' ':'')+word;
  }if(row)rows.push(row);return rows;};
  const clock=statusReadoutTime(icon);
  const lines=[...wrap(icon.label+(icon.stacks>1?' ×'+icon.stacks:'')),
    clock+(clock?(icon.firstExpiry!==icon.remaining?' until first / last expiry':' remaining'):'Duration unavailable'),
    ...statusIconDetails(icon).flatMap(wrap)];
  const budget=Math.max(2,Math.floor((rect.y-c.margin-24)/c.lineHeight));
  const shown=lines.length>budget?[...lines.slice(0,budget-1),'…']:lines;
  const height=shown.length*c.lineHeight+24;
  const x=Math.max(left+c.margin,Math.min(right-c.margin-width,rect.x+rect.w/2-width/2)),y=Math.max(c.margin,rect.y-height-6);
  ctx.fillStyle='rgba(12,16,20,.88)';ctx.fillRect(x,y,width,height);
  ctx.strokeStyle=icon.color;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,width-1,height-1);
  shown.forEach((line,i)=>{ctx.fillStyle=i===0?icon.color:c.ink;ctx.fillText(line,x+8,y+17+i*c.lineHeight,inner);});
  if(icon.fraction!==undefined){ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x+8,y+height-9,inner,3);
    ctx.fillStyle=icon.color;ctx.fillRect(x+8,y+height-9,inner*icon.fraction,3);}
  ctx.restore();return {x,y,w:width,h:height};
}
