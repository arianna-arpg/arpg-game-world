import type { Vec2 } from '../../core/math';
import { combatRectsOverlap, type CombatRect } from './combatFocus';
import { VIS_CFG } from './visConfig';

interface Body { pos: Vec2; radius: number; rect: CombatRect }
interface Meter { key: object; rect: CombatRect; paint: (() => void)[] }
interface Memory { offset: Vec2; clearSince?: number }
const shifted = (r: CombatRect, p: Vec2): CombatRect => ({...r, x:r.x+p.x, y:r.y+p.y});
const padded = (r: CombatRect, gap: number): CombatRect =>
  ({x:r.x-gap,y:r.y-gap,w:r.w+gap*2,h:r.h+gap*2});
const union = (a: CombatRect, b: CombatRect): CombatRect => {
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  return {x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};
};

/** Presentation only: a body's native meters move together, away from visible
 * bodies and each other. Hidden bodies never reserve space or push visible
 * meters. The caller retains the native visibility/paint rules. */
export class CombatMeterLayout {
  private bodies = new Map<object,Body>();
  private rows = new Map<object,Meter>();
  private concealed = new Set<object>();
  private memory = new WeakMap<object,Memory>();
  private time=0;
  private relocate=false;
  readonly footprints: CombatRect[]=[];
  begin(time: number, relocate: boolean = VIS_CFG.combatFocus.meters.enabled): void {
    if(this.relocate!==relocate)this.memory=new WeakMap();
    this.relocate=relocate;
    this.time=time;this.bodies.clear();this.rows.clear();this.concealed.clear();this.footprints.length=0;
  }
  /** Caller supplies the same cover admission as the body's native labels. */
  conceal(key: object): void { this.concealed.add(key); }
  body(key: object, pos: Vec2, radius: number): void {
    const c=VIS_CFG.combatFocus.meters,r=radius*c.bodyScale+c.bodyPad;
    this.bodies.set(key,{pos,radius,rect:{x:pos.x-r,y:pos.y-r,w:r*2,h:r*2}});
  }
  /** Only admitted visible bodies and their painted readouts may temper light. */
  readabilityBounds(): CombatRect[] {
    return [...this.bodies].filter(([key])=>!this.concealed.has(key))
      .map(([,body])=>({...body.rect})).concat(this.footprints.map(rect=>({...rect})));
  }
  add(key: object, rect: CombatRect, paint: () => void): void {
    // Native fog is translucent: drawing a concealed meter beneath it still
    // leaks the owner's presence. Concealment also applies with layout disabled.
    if(this.concealed.has(key))return;
    // Off-screen/unregistered meters keep their original pass and cannot
    // influence the layout of a visible body.
    if(!this.relocate || !this.bodies.has(key)){
      if(this.bodies.has(key))this.footprints.push({...rect});
      paint();return;
    }
    const row=this.rows.get(key);
    if(row){row.rect=union(row.rect,rect);row.paint.push(paint);}
    else this.rows.set(key,{key,rect,paint:[paint]});
  }
  paint(ctx: CanvasRenderingContext2D): void {
    const c=VIS_CFG.combatFocus.meters, occupied:CombatRect[]=[], bodies=[...this.bodies];
    for(const row of this.rows.values()){
      const body=this.bodies.get(row.key)!;
      const link=(rect:CombatRect)=>{
        const end={x:rect.x+rect.w/2,y:rect.y+rect.h+c.linkGap};
        const dx=end.x-body.pos.x,dy=end.y-body.pos.y,length=Math.hypot(dx,dy);
        if(length<=body.radius+c.linkGap)return undefined;
        const f=(body.radius+c.linkGap)/length;
        return {start:{x:body.pos.x+dx*f,y:body.pos.y+dy*f},end};
      };
      const clear=(p:Vec2)=>{
        const rect=shifted(row.rect,p),box=padded(rect,c.gap);
        if(occupied.some(r=>combatRectsOverlap(r,box)) || bodies.some(([key,b])=>
          combatRectsOverlap(box,key===row.key
            ?{x:b.pos.x-b.radius,y:b.pos.y-b.radius,w:b.radius*2,h:b.radius*2}:b.rect)))return false;
        const line=(p.x||p.y)?link(rect):undefined;
        if(!line)return true;
        const {start,end}=line,dx=end.x-start.x,dy=end.y-start.y,len2=dx*dx+dy*dy;
        // A leader must not run through a different body: that would falsely
        // attribute this actor's health/cast to the intervening creature.
        return !bodies.some(([key,b])=>{
          if(key===row.key)return false;
          const t=Math.max(0,Math.min(1,((b.pos.x-start.x)*dx+(b.pos.y-start.y)*dy)/len2));
          return Math.hypot(start.x+dx*t-b.pos.x,start.y+dy*t-b.pos.y)<b.radius+c.linkGap;
        });
      };
      const origin={x:0,y:0},prior=this.memory.get(row.key);
      let offset=prior?.offset??origin,clearSince=prior?.clearSince;
      if(!this.relocate){offset=origin;clearSince=undefined;}
      else{
        // Keep a live cluster steady while bodies move. Return it home only
        // after its own anchor has stayed clear for a short simulation interval.
        if(clear(origin)){
          clearSince??=this.time;
          if(!prior||this.time-clearSince>=c.settleSec)offset=origin;
        }else clearSince=undefined;
        if(!clear(offset)){
          let found=false;
          for(let ring=1;ring<=c.rings&&!found;ring++){
            const d=ring*c.step;
            for(const [x,y] of [[0,-d],[-d,0],[d,0],[-d,-d],[d,-d]]){
              const candidate={x,y};
              if(clear(candidate)){offset=candidate;found=true;break;}
            }
          }
          // Saturated crowds retain every native readout. Never discard a
          // meter, shrink its value or move it arbitrarily far from its body.
          if(!found)offset=origin;
        }
      }
      this.memory.set(row.key,{offset,clearSince});
      const rect=shifted(row.rect,offset);
      this.footprints.push(rect);occupied.push(padded(rect,c.gap));
      ctx.save();
      if(this.relocate&&(offset.x||offset.y)){
        const line=link(rect);
        if(line){
          ctx.beginPath();ctx.moveTo(line.start.x,line.start.y);ctx.lineTo(line.end.x,line.end.y);
          ctx.strokeStyle=c.linkEdge;ctx.lineWidth=c.linkWidth+2;ctx.stroke();
          ctx.strokeStyle=c.linkColor;ctx.lineWidth=c.linkWidth;ctx.stroke();
        }
      }
      ctx.translate(offset.x,offset.y);
      for(const paint of row.paint)paint();
      ctx.restore();
    }
  }
}
