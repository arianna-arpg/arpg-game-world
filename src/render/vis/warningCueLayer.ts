import type { EncounterCue, GuardReleaseCue } from '../../engine/warningCues';
import { encounterCueStyle, WARNING_CUE_CFG as C } from '../../data/warningCues';
import { withAlpha } from './color';

/** Actor-ground space. The boundary is fixed at real reach from the first
 * frame; only the loading ribs advance. A widening boundary would lie. */
export function drawGuardReleaseGround(ctx: CanvasRenderingContext2D,c: GuardReleaseCue): void {
  const start=c.facing-c.arc/2, end=c.facing+c.arc/2, r=c.radius;
  ctx.save();
  const trace=(radius:number)=>{
    ctx.beginPath();if(!c.fullCircle)ctx.moveTo(0,0);
    ctx.arc(0,0,radius,start,end);ctx.closePath();
  };
  trace(r);ctx.fillStyle=withAlpha(c.color,C.bash.fill*(0.5+c.progress));ctx.fill();
  ctx.strokeStyle=withAlpha(c.color,C.bash.rim+0.4*c.progress);ctx.lineWidth=C.bash.width;ctx.stroke();
  // Broken radial ribs load outward without disguising the fixed outer edge.
  for(let i=0;i<C.bash.ribs;i++) {
    const f=(c.progress+i/C.bash.ribs)%1;
    ctx.strokeStyle=withAlpha(c.color,0.12+0.28*f);ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(0,0,r*(0.2+0.75*f),start,end);ctx.stroke();
  }
  ctx.restore();
}

export function warningCueLean(guard: GuardReleaseCue|undefined,encounter: EncounterCue|undefined): number {
  if(guard)return -C.bash.pullback*(0.2+0.8*guard.progress);
  if(!encounter)return 0;
  if(encounter.phase==='recover')return C.encounter.recoverLean*(1-encounter.progress);
  const p=encounterCueStyle(encounter.style);
  return p.lean*(encounter.phase==='warning'?0.2+0.8*encounter.progress:0.25);
}

/** Body space, outside the baked sprite. Paired sweep gestures prepare the
 * native maneuver; they are neither paths nor damage footprints. The larger
 * conductor gesture attributes the coordination, even without an assignment. */
export function drawEncounterCue(ctx: CanvasRenderingContext2D,c: EncounterCue,radius:number): void {
  const p=encounterCueStyle(c.style), t=c.progress, recover=c.phase==='recover';
  const r=radius*p.extent*(c.conductor?C.encounter.leaderScale:1);
  const load=c.phase==='warning'?0.25+0.75*t:c.phase==='commit'?1:1-t;
  ctx.save();ctx.rotate(c.facing);ctx.lineWidth=p.width;ctx.lineCap='round';
  ctx.strokeStyle=withAlpha(recover?C.encounter.recoverColor:c.color,
    recover?C.encounter.recoverAlpha*(1-t):c.phase==='warning'?C.encounter.warningAlpha:C.encounter.commitAlpha);
  if(recover) {
    // Lowered paired strokes fold inward, then disappear on the real clock.
    for(const sign of [-1,1]) {
      ctx.beginPath();ctx.moveTo(-r*0.55,sign*r*(0.35+0.3*load));
      ctx.quadraticCurveTo(-r*0.9,sign*r*0.5,-r*0.65,sign*r*0.15);ctx.stroke();
    }
    ctx.restore();return;
  }
  switch(p.gesture) {
    case 'cover':
      // Sweeping arms close a protective bracket in front of the body.
      for(const sign of [-1,1]) {
        ctx.beginPath();ctx.moveTo(-r*0.15,sign*r*0.7);
        ctx.quadraticCurveTo(r*(0.3+0.3*load),sign*r*0.85,r*0.8,sign*r*(0.6-0.4*load));ctx.stroke();
      }
      break;
    case 'split':
      for(const sign of [-1,1]) {
        const y=sign*r*(0.55+0.4*load);
        ctx.beginPath();ctx.moveTo(r*0.1,sign*r*0.45);ctx.lineTo(r*0.15,y);
        ctx.moveTo(-r*0.08,y-sign*r*0.2);ctx.lineTo(r*0.15,y);ctx.lineTo(r*0.38,y-sign*r*0.2);ctx.stroke();
      }
      break;
    case 'pincer':
      for(const sign of [-1,1]) {
        ctx.beginPath();ctx.moveTo(-r*0.55,sign*r*0.55);
        ctx.quadraticCurveTo(r*0.5,sign*r*(1.1-0.2*load),r*(0.4+0.5*load),sign*r*0.3);ctx.stroke();
      }
      break;
    case 'withdraw':
      for(let i=0;i<p.pieces;i++) {
        const x=-r*(0.35+i*0.3+0.25*load);
        ctx.beginPath();ctx.moveTo(x+r*0.2,-r*0.4);ctx.lineTo(x,0);ctx.lineTo(x+r*0.2,r*0.4);ctx.stroke();
      }
      break;
    case 'gather':
      for(let i=0;i<p.pieces;i++) {
        const a=-Math.PI*0.7+i*Math.PI*1.4/Math.max(1,p.pieces-1);
        const d=r*(1-0.2*load);
        ctx.beginPath();ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);
        ctx.lineTo(Math.cos(a)*(d-r*0.25*load),Math.sin(a)*(d-r*0.25*load));ctx.stroke();
      }
      break;
    case 'focus':
      for(let i=0;i<p.pieces;i++) {
        const y=(i-(p.pieces-1)/2)*r*(0.45-0.25*load);
        ctx.beginPath();ctx.moveTo(r*0.45,y);ctx.lineTo(r*(0.65+0.35*load),y*0.3);ctx.stroke();
      }
      break;
  }
  if(c.conductor) {
    // A second close shoulder sweep belongs only to the actual conductor.
    ctx.lineWidth=p.width*0.65;
    ctx.beginPath();ctx.arc(0,0,r*0.52,Math.PI*0.65,Math.PI*1.35);ctx.stroke();
  }
  ctx.restore();
}
