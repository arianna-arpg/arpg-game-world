import { shade, withAlpha } from './color';

/** A held guard is a raised face, distinct from the thin shell/poise rings.
 * Geometry follows the native facing/arc; wear reads the real shield pool. */
export const RAISED_GUARD_VIEW = {
  enabled: true, depth: 9, outerLip: 2, segmentArc: Math.PI/4,
  maxPanels: 12, seam: .016, rim: 1.1, rivet: 1.15,
  edge: '#192630', light: '#e1eff0', crack: '#26363a',
};
export function drawRaisedGuard(ctx: CanvasRenderingContext2D, radius: number,
  facing: number, arc: number, fraction: number, color: string, alpha: number): void {
  const c=RAISED_GUARD_VIEW;
  if(!c.enabled||alpha<=0||!Number.isFinite(radius)||radius<=0||!Number.isFinite(arc)||arc<=0)return;
  const strength=Math.max(0,Math.min(1,fraction)),coverage=Math.min(Math.PI*2,arc);
  const count=Math.min(c.maxPanels,Math.max(1,Math.ceil(coverage/c.segmentArc)));
  const inner=Math.max(1,radius-c.depth),outer=radius+c.outerLip;
  ctx.save();ctx.globalAlpha=alpha*(.58+.32*strength);ctx.lineJoin='round';
  for(let i=0;i<count;i++){
    const start=facing-coverage/2+i*coverage/count+c.seam;
    const end=facing-coverage/2+(i+1)*coverage/count-c.seam,middle=(start+end)/2;
    if(end<=start)continue;
    ctx.beginPath();ctx.arc(0,0,outer,start,end);
    ctx.arc(0,0,inner,end,start,true);ctx.closePath();
    ctx.fillStyle=shade(color,-.33+.16*strength);ctx.fill();
    ctx.strokeStyle=c.edge;ctx.lineWidth=c.rim*2;ctx.stroke();
    ctx.strokeStyle=withAlpha(color,.8);ctx.lineWidth=c.rim;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,outer-c.rim,start+c.seam,end-c.seam);
    ctx.strokeStyle=withAlpha(c.light,.36+.24*strength);ctx.stroke();
    const r=(inner+outer)/2,x=Math.cos(middle)*r,y=Math.sin(middle)*r;
    ctx.fillStyle=withAlpha(c.light,.54);ctx.beginPath();ctx.arc(x,y,c.rivet,0,Math.PI*2);ctx.fill();
    // Cracks mark remaining strength without opening false interception holes.
    if(strength<.72){
      ctx.strokeStyle=c.crack;ctx.lineWidth=1.15;ctx.beginPath();
      const reach=(1-strength)*c.depth;
      ctx.moveTo(Math.cos(middle-.06)*outer,Math.sin(middle-.06)*outer);
      ctx.lineTo(Math.cos(middle+.035)*(outer-reach*.55),Math.sin(middle+.035)*(outer-reach*.55));
      ctx.lineTo(Math.cos(middle-.035)*(outer-reach),Math.sin(middle-.035)*(outer-reach));ctx.stroke();
    }
  }
  ctx.restore();
}
