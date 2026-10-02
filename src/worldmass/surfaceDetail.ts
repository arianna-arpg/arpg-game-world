import { massHash } from './random';

interface Bounds { x:number; y:number; w:number; h:number }
export interface MassSurfaceDetail {
  kind:'fractures'|'pools'|'ripples';
  spacing:number; chance:number; extent:number;
  dark:string; light:string; width:number;
  /** Ripple bands share a geographic bearing; no gameplay current is implied. */
  bands?:number; amplitude?:number;
}
/** Surface identity is physical, not an inference from its color or biome.
 * The caller clips each pattern to surviving native-region cells. */
export const MASS_SURFACE_VIEW: {enabled:boolean;regions:Record<string,MassSurfaceDetail>} = {
  enabled:true,
  regions:{
    water:{kind:'ripples',spacing:180,chance:.84,extent:112,bands:3,amplitude:5,
      dark:'rgba(8,29,39,.24)',light:'rgba(158,205,210,.22)',width:.9},
    ice:{kind:'fractures',spacing:148,chance:.84,extent:94,
      dark:'rgba(32,64,77,.18)',light:'rgba(218,241,244,.32)',width:.85},
    swamp:{kind:'pools',spacing:112,chance:.80,extent:35,
      dark:'rgba(7,23,24,.36)',light:'rgba(122,159,140,.24)',width:1.1},
    mud:{kind:'pools',spacing:151,chance:.43,extent:20,
      dark:'rgba(7,18,19,.26)',light:'rgba(122,139,103,.16)',width:.8},
  },
};
/** Geographic motifs are recomputed independently on either side of a page.
 * Halo includes each motif's full extent; clipping never changes its geometry. */
export function paintMassSurfaceDetail(ctx:CanvasRenderingContext2D,bounds:Bounds,
  seed:number,region:string,cfg:typeof MASS_SURFACE_VIEW=MASS_SURFACE_VIEW):void {
  const spec=cfg.regions[region];
  if(!cfg.enabled||!spec||!Number.isFinite(spec.spacing)||spec.spacing<16
    ||!Number.isFinite(spec.extent)||spec.extent<=0||spec.extent>spec.spacing)return;
  const {spacing,extent}=spec,pad=extent*(spec.kind==='ripples'?1.35:1)+4;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=spec.width;
  for(let gy=Math.floor((bounds.y-pad)/spacing);gy<=Math.floor((bounds.y+bounds.h+pad)/spacing);gy++)
    for(let gx=Math.floor((bounds.x-pad)/spacing);gx<=Math.floor((bounds.x+bounds.w+pad)/spacing);gx++){
      const salt=massHash('surface/'+region+'/'+gx+','+gy,seed);
      const random=(n:number)=>massHash(String(n),salt)/0x100000000;
      if(random(0)>spec.chance)continue;
      const x=(gx+.16+random(1)*.68)*spacing,y=(gy+.16+random(2)*.68)*spacing;
      ctx.save();
      const angle=spec.kind==='fractures'?random(3)*Math.PI*2:(random(3)-.5)*.6;
      const cos=Math.cos(angle),sin=Math.sin(angle);
      // Geographic quarter-pixel vertices keep independently baked pages aligned.
      const point=(px:number,py:number)=>({x:Math.round((x+px*cos-py*sin)*4)/4,y:Math.round((y+px*sin+py*cos)*4)/4});
      const move=(px:number,py:number)=>{const p=point(px,py);ctx.moveTo(p.x,p.y);};
      const line=(px:number,py:number)=>{const p=point(px,py);ctx.lineTo(p.x,p.y);};
      if(spec.kind==='fractures'){
        const points=[{x:-extent*.70,y:0},{x:-extent*.26,y:(random(4)-.5)*extent*.34},
          {x:extent*.18,y:(random(5)-.5)*extent*.30},{x:extent*.70,y:(random(6)-.5)*extent*.36}];
        const stroke=(offset:number,color:string)=>{
          ctx.strokeStyle=color;ctx.beginPath();move(points[0].x,points[0].y+offset);
          for(const p of points.slice(1))line(p.x,p.y+offset);
          const branch=points[1];move(branch.x,branch.y+offset);
          line(branch.x+extent*.06,branch.y+extent*.28+offset);
          line(branch.x+extent*.31,branch.y+extent*.46+offset);ctx.stroke();
        };
        stroke(1.1,spec.dark);stroke(0,spec.light);
      }else if(spec.kind==='ripples'){
        const alpha=ctx.globalAlpha,bands=Math.max(1,Math.min(6,Math.round(spec.bands??3)));
        const amplitude=Math.max(0,Math.min(extent*.15,spec.amplitude??5));
        for(let band=0;band<bands;band++){
          const length=extent*(.55+random(30+band)*.40),by=(band-(bands-1)/2)*extent*.18;
          const offset=(random(40+band)-.5)*extent*.30,phase=random(50+band)*Math.PI*2;
          const stroke=(dy:number,color:string)=>{
            ctx.strokeStyle=color;ctx.beginPath();
            for(let n=0;n<=16;n++){
              const t=n/16,px=offset+(t-.5)*length*2;
              const py=by+Math.sin(t*Math.PI*2+phase)*amplitude+dy;
              if(n===0)move(px,py);else line(px,py);
            }
            ctx.stroke();
          };
          ctx.globalAlpha=alpha*(band===1?.9:.55);
          stroke(1.4,spec.dark);stroke(0,spec.light);
        }
      }else{
        const r=extent*(.55+random(4)*.45),ry=r*(.45+random(5)*.3);
        const outline=Array.from({length:16},(_,i)=>{
          const a=i/16*Math.PI*2,wobble=.76+random(10+i)*.24;
          return {x:Math.cos(a)*r*wobble,y:Math.sin(a)*ry*wobble};
        });
        ctx.fillStyle=spec.dark;ctx.beginPath();move(outline[0].x,outline[0].y);
        for(const p of outline.slice(1))line(p.x,p.y);ctx.closePath();ctx.fill();
        // Broken horizontal sky reflections distinguish shallow pools from foliage.
        ctx.strokeStyle=spec.light;ctx.beginPath();move(-r*.46,-ry*.27);line(r*.05,-ry*.27);
        move(r*.15,-ry*.27);line(r*.43,-ry*.27);ctx.stroke();
        ctx.globalAlpha*=.5;ctx.beginPath();move(-r*.10,ry*.12);line(r*.30,ry*.12);ctx.stroke();
      }
      ctx.restore();
    }
  ctx.restore();
}
