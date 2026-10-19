import { hash01, shade, withAlpha } from './color';
import type { CaveMouthParams } from './painters';

/** An upright rock escarpment with a walk-in opening. The threshold is at the
 * native doodad position; all relief rises behind it. This is paint only. */
export function paintRockFaceEntrance(ctx: CanvasRenderingContext2D, r: number, seed: number,
  base: string, edge: string, throat: string, glow: string, flick: number,
  p: CaveMouthParams, vines?: string): void {
  const polygon = (points: number[][], color: string | CanvasGradient, outline = false) => {
    ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x*r,y*r) : ctx.moveTo(x*r,y*r));
    ctx.closePath(); ctx.fillStyle=color; ctx.fill();
    if (outline) { ctx.strokeStyle=edge; ctx.lineWidth=1.2; ctx.stroke(); }
  };
  // A broad, broken skyline and vertical facets read as a cliff, not a ring.
  const peak = -1.65 - hash01(seed, 43)*.16;
  polygon([[-1.5,.15],[-1.48,-.65],[-1.08,-1.44],[-.43,peak],
    [.15,peak+.13],[.72,-1.56],[1.33,-1.01],[1.52,-.34],[1.46,.2]],shade(base,-.16),true);
  polygon([[-1.48,-.65],[-1.08,-1.44],[-.43,peak],[-.52,-.99],[-1.15,-.64]],shade(base,.24));
  polygon([[-.43,peak],[.15,peak+.13],[.72,-1.56],[.94,-.98],[.35,-.83],[-.52,-.99]],shade(base,.13));
  polygon([[.72,-1.56],[1.33,-1.01],[1.52,-.34],[1.46,.2],[1.04,-.08],[.94,-.98]],shade(base,-.31));
  polygon([[-1.48,-.65],[-1.15,-.64],[-.86,-.14],[-.91,.28],[-1.5,.15]],shade(base,-.05));
  // The opening's flat sill is a floor. Its ceiling rises into the cliff.
  const opening = () => {
    ctx.beginPath();ctx.moveTo(-.78*r,.26*r);ctx.lineTo(-.76*r,-.34*r);
    ctx.bezierCurveTo(-.72*r,-.78*r,-.38*r,-1.06*r,.02*r,-1.08*r);
    ctx.bezierCurveTo(.48*r,-1.07*r,.76*r,-.74*r,.79*r,-.3*r);
    ctx.lineTo(.81*r,.26*r);ctx.closePath();
  };
  opening();ctx.fillStyle=throat;ctx.fill();
  ctx.save();opening();ctx.clip();
  // A diminishing floor leads inward; a faint far glow invites exploration.
  const floor=ctx.createLinearGradient(0,-.64*r,0,.3*r);
  floor.addColorStop(0,throat);floor.addColorStop(.65,shade(base,-.52));floor.addColorStop(1,shade(base,-.23));
  polygon([[-.81,.28],[-.27,-.63],[.26,-.63],[.84,.28]],floor);
  const light=ctx.createRadialGradient(.18*r,-.57*r,0,.18*r,-.57*r,.72*r);
  light.addColorStop(0,withAlpha(glow,.16*flick));light.addColorStop(1,withAlpha(glow,0));
  ctx.fillStyle=light;ctx.fillRect(-r,-1.2*r,r*2,r*1.6);
  ctx.strokeStyle=withAlpha(glow,.16);ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-.43*r,.22*r);ctx.lineTo(-.13*r,-.57*r);ctx.stroke();
  ctx.restore();
  // Heavy side jambs and a broken brow sit in front of the dark recess.
  polygon([[-1.15,-.64],[-.66,-.94],[-.78,-.29],[-.78,.28],[-1.03,.32]],shade(base,.02),true);
  polygon([[.58,-.99],[1.05,-.65],[1.13,.28],[.81,.29],[.78,-.31]],shade(base,-.22),true);
  polygon([[-.94,-.79],[-.53,-1.2],[.13,-1.27],[.61,-1.08],[.88,-.73],
    [.57,-.87],[.03,-1.02],[-.46,-.85]],shade(base,.11),true);
  ctx.strokeStyle=withAlpha(shade(base,.42),.65);ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-1.08*r,-1.42*r);ctx.lineTo(-.59*r,-1.31*r);ctx.lineTo(-.53*r,-1.2*r);ctx.stroke();
  ctx.beginPath();ctx.moveTo(.86*r,-1.29*r);ctx.lineTo(1.01*r,-1.02*r);ctx.lineTo(.96*r,-.74*r);ctx.stroke();
  if(p.teeth)for(let i=0;i<3;i++) {
    const x=-.42+i*.4, y=-.92+Math.abs(x)*.23;
    polygon([[x-.07,y],[x+.07,y],[x+.02,y+.12+hash01(seed,i+100)*.13]],shade(base,-.19));
  }
  if(p.rubble)for(let i=0;i<6;i++) {
    const side=i%2?-1:1,x=side*(.93+hash01(seed,i+140)*.38),y=.2+hash01(seed,i+160)*.3;
    const z=.055+hash01(seed,i+180)*.065;
    polygon([[x-z,y],[x-z*.6,y-z],[x+z*.7,y-z*.6],[x+z,y],[x,y+z*.4]],shade(base,(i%3)*.12-.2));
  }
  if(vines)for(let i=0;i<3;i++) {
    const x=(i-1)*.71,y=-1.35+Math.abs(x)*.18,len=.22+hash01(seed,i+220)*.22;
    ctx.strokeStyle=withAlpha(vines,.8);ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(x*r,y*r);ctx.quadraticCurveTo((x-.05)*r,(y+len*.6)*r,(x+.025)*r,(y+len)*r);ctx.stroke();
  }
}
