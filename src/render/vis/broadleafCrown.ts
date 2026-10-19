import { hash01, shade, withAlpha } from './color';
import { VIS_CFG } from './visConfig';

export interface BroadleafCrownSpec {
  boughs?: number; leaflets?: number; irregularity?: number;
}
/** Static crown-local foliage. Seeded clusters replace the circular under-heart;
 * the native canopy cache, visibility fade and solid trunk remain the owners. */
export function paintBroadleafCrown(ctx: CanvasRenderingContext2D, radius: number,
  base: string, seed: number, spec: BroadleafCrownSpec): void {
  const count=(n:number|undefined,fallback:number,lo:number,hi:number)=>
    Number.isFinite(n)?Math.max(lo,Math.min(hi,Math.round(n!))):fallback;
  const boughs=count(spec.boughs,7,5,12),leaflets=count(spec.leaflets,22,8,40);
  const irregularity=Number.isFinite(spec.irregularity)?Math.max(0,Math.min(.5,spec.irregularity!)):.3;
  const phase=hash01(seed,17)*Math.PI*2;
  const clusters:{x:number;y:number;r:number;key:number;angle:number;height:number}[]=[];
  for(let i=0;i<boughs;i++){
    const angle=phase+i/boughs*Math.PI*2+(hash01(seed,i+41)-.5)*.65;
    const distance=radius*(.52+(hash01(seed,i+61)-.5)*irregularity*.5);
    clusters.push({x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,
      r:radius*(.30+hash01(seed,i+83)*.075),key:i,angle,height:0});
  }
  // Off-centre upper foliage conceals the branch junction without a round cap.
  for(let i=0;i<4;i++){
    const angle=phase+i*Math.PI*.5+.3;
    clusters.push({x:Math.cos(angle)*radius*.22,y:Math.sin(angle)*radius*.20,
      r:radius*(.28+hash01(seed,i+107)*.055),key:i+boughs,angle,height:1});
  }
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=shade(base,-.62);ctx.lineWidth=radius*.065;
  for(const c of clusters){
    ctx.beginPath();ctx.moveTo(0,0);
    ctx.quadraticCurveTo(c.x*.55-c.y*.12,c.y*.55+c.x*.12,c.x,c.y);ctx.stroke();
  }
  for(const c of clusters){
    const points:{x:number;y:number}[]=[];
    for(let j=0;j<16;j++){
      const a=j/16*Math.PI*2,reach=c.r*(.76+hash01(seed,c.key*43+j+151)*.24);
      points.push({x:c.x+Math.cos(a)*reach,y:c.y+Math.sin(a)*reach});
    }
    const shape=new Path2D(),last=points[15],first=points[0];
    shape.moveTo((last.x+first.x)/2,(last.y+first.y)/2);
    for(let j=0;j<16;j++){
      const a=points[j],b=points[(j+1)%16];
      shape.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);
    }
    shape.closePath();
    const lx=Math.cos(VIS_CFG.lightAngle),ly=Math.sin(VIS_CFG.lightAngle);
    const sun=Math.cos(c.angle-VIS_CFG.lightAngle)*.035+c.height*.04;
    const fill=ctx.createLinearGradient(c.x-lx*c.r,c.y-ly*c.r,c.x+lx*c.r,c.y+ly*c.r);
    fill.addColorStop(0,shade(base,-.48+sun));fill.addColorStop(.55,shade(base,-.10+sun));
    fill.addColorStop(1,shade(base,.12+sun));
    ctx.fillStyle=fill;ctx.fill(shape);
    ctx.save();ctx.clip(shape);
    for(let j=0;j<leaflets;j++){
      const key=c.key*97+j,angle=hash01(seed,key+401)*Math.PI*2;
      const d=Math.sqrt(hash01(seed,key+503))*c.r*.94;
      const x=c.x+Math.cos(angle)*d,y=c.y+Math.sin(angle)*d;
      const length=radius*(.027+hash01(seed,key+607)*.030);
      const light=((x-c.x)*lx+(y-c.y)*ly)/c.r;
      ctx.fillStyle=withAlpha(shade(base,j%4===0?-.55:.10+sun+light*.07),j%4===0?.42:.58);
      ctx.beginPath();ctx.ellipse(x,y,length,length*.44,angle+.7,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
