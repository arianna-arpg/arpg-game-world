import type { MassTrail } from './journey';
import type { Vec2 } from '../core/math';
import { massHash } from './random';

/** Presentation only. Widths are fractions of the saved physical route width;
 * spacing is in world units. No camera coordinates or simulation RNG. */
export const MASS_TRAIL_VIEW = {
  enabled: true, sampleSpacing: 28, laneOffset: .20, laneWidth: .12,
  laneEdge: 'rgba(29,27,20,.055)', laneBed: 'rgba(40,34,24,.10)',
  wearLengths: [91,17,163,9,57,23] as readonly number[],
  laneWander: .022, pebbleSpacing: 19, pebbleMin: .65, pebbleMax: 2.2,
  pebbleDark: 'rgba(31,32,26,.34)', pebbleLight: 'rgba(186,180,145,.36)',
  grassSpacing: 44, grassChance: .61, grassColor: 'rgba(104,118,65,.37)',
};
export type MassTrailView = typeof MASS_TRAIL_VIEW;
interface Sample { pos: Vec2; normal: Vec2 }
interface Bounds { x: number; y: number; w: number; h: number }
/** Linear geometry prepared once per trail, with distance measured from its
 * authored origin. Zero-length points do not create a tangent or a divide. */
function sampler(trail: MassTrail): { length: number; at: (distance: number) => Sample } | undefined {
  const segments: { a: Vec2; dx: number; dy: number; start: number; length: number }[]=[];
  let total=0;
  for(let i=1;i<trail.points.length;i++){
    const a=trail.points[i-1],b=trail.points[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    if(!Number.isFinite(length))return;
    if(length>0){segments.push({a,dx:dx/length,dy:dy/length,start:total,length});total+=length;}
  }
  if(!total||!Number.isFinite(trail.width)||trail.width<=0)return;
  return {length:total,at(distance){
    const s=segments.find(s=>distance<=s.start+s.length)??segments[segments.length-1];
    const d=Math.max(0,Math.min(s.length,distance-s.start));
    return {pos:{x:s.a.x+s.dx*d,y:s.a.y+s.dy*d},normal:{x:-s.dy,y:s.dx}};
  }};
}
/** Paints in local world coordinates, under the caller's terrain mask. Each
 * page sees identical full-route paths and distance-keyed stones/blades. */
export function paintMassTrailWear(ctx: CanvasRenderingContext2D, trails: readonly MassTrail[],
  bounds: Bounds, seed: number, cfg: MassTrailView=MASS_TRAIL_VIEW): void {
  if(!cfg.enabled)return;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  for(const trail of trails){
    const margin=trail.width;
    if(trail.points.every(p=>p.x<bounds.x-margin)||trail.points.every(p=>p.x>bounds.x+bounds.w+margin)
      ||trail.points.every(p=>p.y<bounds.y-margin)||trail.points.every(p=>p.y>bounds.y+bounds.h+margin))continue;
    const route=sampler(trail);if(!route)continue;
    const salt=massHash(trail.id,seed),random=(n:number)=>massHash(String(n),salt)/0x100000000;
    const inside=(p:Vec2,pad:number)=>p.x>=bounds.x-pad&&p.x<=bounds.x+bounds.w+pad
      &&p.y>=bounds.y-pad&&p.y<=bounds.y+bounds.h+pad;
    const samples=Math.ceil(route.length/Math.max(8,cfg.sampleSpacing));
    for(const side of [-1,1]){
      ctx.beginPath();
      for(let i=0;i<=samples;i++){
        const distance=route.length*i/samples,s=route.at(distance);
        const shift=trail.width*(side*cfg.laneOffset+Math.sin(distance/133+random(0)*6.28)*cfg.laneWander);
        const x=s.pos.x+s.normal.x*shift,y=s.pos.y+s.normal.y*shift;
        if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.setLineDash([...cfg.wearLengths]);ctx.lineDashOffset=random(901+side)*200;
      ctx.strokeStyle=cfg.laneEdge;ctx.lineWidth=trail.width*cfg.laneWidth*1.6;ctx.stroke();
      ctx.lineWidth=trail.width*cfg.laneWidth;ctx.stroke();
      ctx.strokeStyle=cfg.laneBed;ctx.lineWidth=trail.width*cfg.laneWidth*.50;ctx.stroke();
      ctx.setLineDash([]);
    }
    for(let distance=0,i=0;distance<=route.length;distance+=Math.max(8,cfg.pebbleSpacing),i++){
      const s=route.at(distance),offset=(random(i*11+1)-.5)*trail.width*.80;
      const p={x:s.pos.x+s.normal.x*offset,y:s.pos.y+s.normal.y*offset};
      if(!inside(p,5))continue;
      const r=cfg.pebbleMin+random(i*11+2)*(cfg.pebbleMax-cfg.pebbleMin),angle=random(i*11+3)*Math.PI;
      ctx.fillStyle=cfg.pebbleDark;ctx.beginPath();ctx.ellipse(p.x,p.y,r*1.5,r,angle,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=cfg.pebbleLight;ctx.beginPath();ctx.ellipse(p.x-.35,p.y-.45,r*.8,r*.5,angle,0,Math.PI*2);ctx.fill();
    }
    for(let distance=0,i=0;distance<=route.length;distance+=Math.max(12,cfg.grassSpacing),i++){
      if(random(i*17+7001)>cfg.grassChance)continue;
      const s=route.at(distance),offset=(random(i*17+7002)-.5)*trail.width*.12;
      const p={x:s.pos.x+s.normal.x*offset,y:s.pos.y+s.normal.y*offset};
      if(!inside(p,10))continue;
      ctx.strokeStyle=cfg.grassColor;ctx.lineWidth=.9;ctx.beginPath();
      for(let blade=0;blade<3;blade++){
        const length=3+random(i*17+7003+blade)*5,dx=(blade-1)*2.3;
        ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x+dx*.4,p.y-length*.65,p.x+dx,p.y-length);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
