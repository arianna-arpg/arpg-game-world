import { combatProfile } from './lightingCombatFixture';
import { castGridRay } from '../src/engine/los';
import { LightLayer } from '../src/render/vis/lights';
import { litPolygon, polygonPath } from '../src/render/vis/sight';
import { SightVeil } from '../src/render/vis/sightVeil';
import { GridWalkField } from '../src/world/gridWalk';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { FEEDING_CUE_STYLES } from '../src/data/feedingCues';
import { feedingStyle } from '../src/engine/feedingCues';
import type { World } from '../src/engine/world';
import type { Doodad } from '../src/engine/levelgen';

type Result = { name: string; ok: boolean; detail: unknown };
const width=1280, height=960;
function grid() { const g=new GridWalkField(6000,6000,20); g.fillRegion(0,0,5999,5999,'ground'); return g; }
function world(doodads: Doodad[] = []) {
  return { walk:grid(), time:0, skyTime:0, player:{pos:{x:1800,y:1800},tier:0,dead:false},
    zone:{id:'lighting-qa',theme:{ambientDark:.65}}, doodads,doodadRev:0,flashes:[],projectiles:[],orbs:[],actors:[],exits:[],
    radiance:()=>.5, gloomDarkness:()=>0,descentView:()=>null,couchActive:()=>false,
    doodadFamilyRev:()=>0,lightwellDoodads:()=>[],encountersView:()=>[],spoilStoryAt:()=>0,
    doodadsNear:()=>doodads,storeyedStructures:()=>[]
  } as unknown as World;
}
function canvas() { const c=document.createElement('canvas'); c.width=width;c.height=height; return c; }
function draw(layer:LightLayer, x:number,y:number) {
  const c=canvas(),ctx=c.getContext('2d')!;ctx.fillStyle='#808080';ctx.fillRect(0,0,width,height);
  layer.render(ctx,x,y,1,width,height); return ctx;
}
function run() {
  const results:Result[]=[];
  const check=(name:string,ok:boolean,detail:unknown=null)=>results.push({name,ok,detail});
  check('restoration has its own material',!!FEEDING_CUE_STYLES.restoration && feedingStyle('restoration')!==feedingStyle('flesh'));
  {
    const g=new GridWalkField(400,400,10);g.fillRegion(0,0,399,399,'ground');g.fillRegion(200,200,209,209,'wall');
    const p=litPolygon({walk:g},140,149,110)!;
    const ray=p.find(p=>Math.abs((p.x-140)-(p.y-149))<1e-5 && p.x>140)!;
    check('finite wall corner stops the light ray',!!ray && Math.hypot(ray.x-140,ray.y-149)<90,ray);
  }
  {
    const ds:Doodad[]=[];
    // Four independent steady materials per world bin deliberately exceed
    // the former shared light cap; actual production collectors and raster.
    for(let kind=0;kind<4;kind++) {
      const id='__light_qa_'+kind;
      DOODAD_VISUALS[id]={...DOODAD_VISUALS.lava,light:{radius:65,color:'#ff6a26',intensity:.55}};
      for(let y=0;y<6;y++) for(let x=0;x<8;x++) ds.push({kind:id,radius:20,
        pos:{x:1200+x*176+kind*20,y:1300+y*176+kind*14}} as Doodad);
    }
    const w=world(ds),l=new LightLayer(),cx=1200,cy=1300;
    l.collect(w,new Map(),cx,cy,width,height);const before=draw(l,cx,cy).getImageData(0,0,width,height);
    for(let i=0;i<40;i++) w.flashes.push({pos:{x:cx+20,y:cy+20},radius:8,color:'#ffffff',life:1,maxLife:1});
    l.collect(w,new Map(),cx,cy,width,height);const busy=draw(l,cx,cy).getImageData(0,0,width,height);
    let changed=0,max=0;
    for(let y=180;y<height-100;y+=8)for(let x=180;x<width-100;x+=8){
      const at=(y*width+x)*4;const d=Math.abs(before.data[at]-busy.data[at]);max=Math.max(max,d);if(d>4)changed++;
    }
    check('combat bursts cannot extinguish remote terrain lights',changed===0,{changed,max});
    // A two-pixel pan across the old quantized selection boundary. Compare
    // the same WORLD pixels, excluding edges and intentional light movement.
    w.flashes=[];
    const edge=176*Math.round((cx+width/2)/176)-width/2;
    l.collect(w,new Map(),edge-1,cy,width,height);const a=draw(l,edge-1,cy).getImageData(0,0,width,height);
    l.collect(w,new Map(),edge+1,cy,width,height);const b=draw(l,edge+1,cy).getImageData(0,0,width,height);
    changed=0;max=0;
    for(let y=120;y<height-120;y+=8)for(let x=120;x<width-120;x+=8){
      const d=Math.abs(a.data[(y*width+x)*4]-b.data[(y*width+x-2)*4]);max=Math.max(max,d);if(d>8)changed++;
    }
    check('camera bin crossings keep stationary lighting continuous',changed===0,{changed,max});
    for(let kind=0;kind<4;kind++) delete DOODAD_VISUALS['__light_qa_'+kind];
  }
  {
    // Isolate the old gather-cap boundary: 768 close casters on the left,
    // one visible tree on the right. It must not lose its entire shadow
    // because unrelated trees occupy the collector's first 768 seats.
    const ds:Doodad[]=[];
    for(let i=0;i<768;i++) ds.push({kind:'cliff',radius:6,pos:{x:1710-(i%32),y:1750+Math.floor(i/32)}} as Doodad);
    ds.push({kind:'cliff',radius:20,pos:{x:2200,y:1800}} as Doodad);
    const w=world(ds),v=new SightVeil();
    v.update(w,0,width,height);
    const c=canvas(),ctx=c.getContext('2d')!;v.draw(ctx,1160,1320,1,width,height);
    const alpha=ctx.getImageData(1120,480,1,1).data[3]; // world (2280,1800)
    check('dense forest retains every on-screen caster',alpha>100,{alpha,occlusion:v.occludedAt({x:2280,y:1800})});
  }
  {
    const w=world(),g=w.walk as GridWalkField;w.player.tier=1;
    g.fillRegion(0,0,5999,5999,'butte_top');
    const l=new LightLayer();l.collect(w,new Map(),1160,1320,width,height);
    const raised=draw(l,1160,1320).getImageData(720,480,1,1).data[0];
    g.fillRegion(0,0,5999,5999,'ground');l.collect(w,new Map(),1160,1320,width,height);
    const open=draw(l,1160,1320).getImageData(720,480,1,1).data[0];
    check('lantern stays lit on its own plateau floor',Math.abs(raised-open)<=2,{raised,open});
  }
  {
    const g=new GridWalkField(400,400,10);g.fillRegion(0,0,399,399,'ground');g.fillRegion(200,200,209,209,'wall');
    const raster=(y:number,radialOnly=false)=>{const c=canvas(),ctx=c.getContext('2d')!;
      const p=radialOnly ? Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a);
        const hit=castGridRay(g,{x:140,y},{x:140+dx*110,y:y+dy*110},'sight');
        const reach=hit===null?110:Math.min(110,hit*110+3);return {x:140+dx*reach,y:y+dy*reach};}) : litPolygon({walk:g},140,y,110);if(p)ctx.clip(polygonPath(p));
      ctx.fillStyle='white';ctx.beginPath();ctx.arc(140,y,110,0,Math.PI*2);ctx.fill();return ctx.getImageData(0,0,400,400);};
    const a=raster(149.999),b=raster(150.001);let changed=0;
    for(let y=195;y<255;y++)for(let x=195;x<250;x++)if(Math.abs(a.data[(y*400+x)*4+3]-b.data[(y*400+x)*4+3])>32)changed++;
    const c=raster(149.999,true),d=raster(150.001,true);let controlChanged=0;
    for(let y=195;y<255;y++)for(let x=195;x<250;x++)if(Math.abs(c.data[(y*400+x)*4+3]-d.data[(y*400+x)*4+3])>32)controlChanged++;
    check('subpixel corner crossing does not switch a light wedge',changed<8&&controlChanged>8,{changed,controlChanged});
  }

  return {results,failures:results.filter(r=>!r.ok)};
}
declare global { interface Window { lightingFixture:{run:typeof run;combatProfile:typeof combatProfile} } }
window.lightingFixture={run,combatProfile};
