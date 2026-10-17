import { hash01, shade, withAlpha } from './color';
import { VIS_CFG } from './visConfig';

export interface NeedleCrownSpec {
  layers?: number; boughs?: number; needlePairs?: number; irregularity?: number;
}
/** Static, seeded bough geometry in crown-local space. Native crown baking,
 * rotation, visibility and contact geometry remain owned by their callers. */
export function paintNeedleCrown(ctx: CanvasRenderingContext2D, radius: number,
  base: string, seed: number, spec: NeedleCrownSpec): void {
  const count=(n:number|undefined,fallback:number,lo:number,hi:number)=>
    Number.isFinite(n)?Math.max(lo,Math.min(hi,Math.round(n!))):fallback;
  const layers=count(spec.layers,3,2,5),boughs=count(spec.boughs,9,5,14);
  const pairs=count(spec.needlePairs,7,3,12);
  const irregularity=Number.isFinite(spec.irregularity)?Math.max(0,Math.min(.5,spec.irregularity!)):.22;
  const phase=hash01(seed,71)*Math.PI*2;
  ctx.save();
  ctx.lineJoin='round';ctx.lineCap='round';
  for(let layer=0;layer<layers;layer++){
    const scale=Math.pow(.66,layer);
    for(let branch=0;branch<boughs;branch++){
      const key=layer*37+branch;
      const angle=phase+branch/boughs*Math.PI*2+layer*.39+(hash01(seed,key+101)-.5)*irregularity;
      const length=radius*scale*(1-irregularity*hash01(seed,key+151));
      const width=length*(.20+hash01(seed,key+191)*.06);
      const light=Math.cos(angle-VIS_CFG.lightAngle)*.08+layer*.035;
      ctx.save();ctx.rotate(angle);
      const fill=ctx.createLinearGradient(0,0,length,0);
      fill.addColorStop(0,shade(base,-.50+layer*.055));
      fill.addColorStop(.45,shade(base,-.16+light));
      fill.addColorStop(1,shade(base,.08+light));
      ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(length,0);
      // Paired, staggered branchlets taper towards the tip, leaving an uneven
      // fine edge instead of a regular polygon. No branch extends past radius.
      for(const side of [1,-1]){
        for(let n=0;n<pairs;n++){
          const t=side===1?1-(n+1)/(pairs+1):(n+1)/(pairs+1);
          const spread=width*Math.sin(Math.PI*t)*(.68+.32*hash01(seed,key*31+n+233));
          ctx.lineTo(length*(t+.035),side*spread);
          ctx.lineTo(length*(t-.035),side*spread*.30);
        }
        if(side===1)ctx.lineTo(length*.025,0);
      }
      ctx.closePath();ctx.fill();
      ctx.strokeStyle=withAlpha(shade(base,-.55),.46);ctx.lineWidth=Math.max(.5,radius*.009);ctx.stroke();
      // The branch spine and feathered highlights stay inside each silhouette.
      ctx.strokeStyle=withAlpha(shade(base,.20+light),.58);ctx.lineWidth=Math.max(.5,radius*.008);
      ctx.beginPath();ctx.moveTo(length*.09,0);ctx.lineTo(length*.92,0);
      for(let n=1;n<pairs;n++){
        const t=n/(pairs+1),spread=width*Math.sin(Math.PI*t)*.50;
        ctx.moveTo(length*(t-.06),0);ctx.lineTo(length*(t+.01),spread);
        ctx.moveTo(length*(t-.045),0);ctx.lineTo(length*(t+.025),-spread);
      }
      ctx.stroke();ctx.restore();
    }
  }
  ctx.restore();
}
