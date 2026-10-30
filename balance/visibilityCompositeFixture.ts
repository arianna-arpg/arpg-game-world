import { Renderer } from '../src/render/renderer';
import { SightVeil } from '../src/render/vis/sightVeil';
import { RoomVeil } from '../src/render/vis/roomVeil';
import { LightLayer } from '../src/render/vis/lights';
import { GridWalkField } from '../src/world/gridWalk';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { VIS_CFG } from '../src/render/vis/visConfig';
import type { ForesightGeo } from '../src/engine/foresight';

type Check = { name:string; ok:boolean; detail?:unknown };
const width=800,height=600;
function canvas(){const c=document.createElement('canvas');c.width=width;c.height=height;return c}
function pixels(c:HTMLCanvasElement){const copy=canvas(),ctx=copy.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(c,0,0);return ctx.getImageData(0,0,width,height).data}
function changed(a:Uint8ClampedArray,b:Uint8ClampedArray){let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n}
function state(ctx:CanvasRenderingContext2D){const t=ctx.getTransform();return JSON.stringify({alpha:ctx.globalAlpha,blend:ctx.globalCompositeOperation,filter:ctx.filter,
 transform:[t.a,t.b,t.c,t.d,t.e,t.f],shadow:[ctx.shadowBlur,ctx.shadowColor,ctx.shadowOffsetX,ctx.shadowOffsetY]})}

/** Exercises the finished canvas, including hostile casts after the actor's
 * body save/restore. Mask-only checks cannot detect a suppressed composite. */
export function visibilityCompositeChecks():Check[]{
 const checks:Check[]=[],check=(name:string,ok:boolean,detail?:unknown)=>checks.push({name,ok,detail});
 const restore=seedGlobalRandom(71388),w=makeSimWorld('warrior',71388);
 const g=new GridWalkField(1800,1800,20);g.fillRegion(0,0,1799,1799,'ground');g.fillRegion(720,200,759,999,'wall');
 w.walk=g;w.zone.size={w:1800,h:1800};w.zone.theme={...w.zone.theme,ambientDark:.55};
 w.arena={w:1800,h:1800,shape:'rect'};w.arenaHull={w:1800,h:1800};w.player.pos={x:600,y:600};
 w.doodads=[];w.markDoodadsChanged();w.exits=[];w.structures=[];w.actors=[w.player];w.flashes=[];
 const v=new SightVeil();v.update(w,0,width,height);
 const room=new RoomVeil();room.update({player:w.player,roofedStructureAt:()=>({id:'qa',confineVision:true,roofs:[{x:500,y:500,w:180,h:180}],doors:[]})},1);
 const light=new LightLayer();light.collect(w,new Map(),200,300,width,height);
 const passes:[string,(ctx:CanvasRenderingContext2D)=>void][]=[
  ['sight',ctx=>v.draw(ctx,200,300,1,width,height)],
  ['room',ctx=>room.draw(ctx,200,300,1,width,height)],
  ['light',ctx=>light.render(ctx,200,300,1,width,height)],
 ];
 for(const [name,draw]of passes){
  const c=canvas(),ctx=c.getContext('2d')!;
  ctx.fillStyle='#989898';ctx.fillRect(0,0,width,height);draw(ctx);const expected=pixels(c);
  for(const alpha of [0,.00001,.55,1]){
   ctx.resetTransform();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowColor='transparent';
   ctx.fillStyle='#989898';ctx.fillRect(0,0,width,height);
   ctx.globalAlpha=alpha;ctx.globalCompositeOperation='lighter';ctx.filter='opacity(25%)';ctx.translate(30,40);
   ctx.shadowColor='#ff0000';ctx.shadowBlur=8;ctx.shadowOffsetX=5;
   const before=state(ctx);draw(ctx);const diff=changed(expected,pixels(c));
   check(`${name} composite owns opacity/blend/filter at inherited alpha ${alpha}`,diff===0,{changed:diff});
   check(`${name} restores caller state at inherited alpha ${alpha}`,state(ctx)===before);
  }
 }
 // Roof overlays retain their deliberate world-space clip and authored opacity.
 {
  const c=canvas(),ctx=c.getContext('2d')!,rects=[{x:500,y:0,w:200,h:200}];
  const paint=(dirty:boolean)=>{
   ctx.resetTransform();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.clearRect(0,0,width,height);
   ctx.translate(10,20);
   if(dirty){ctx.globalAlpha=0;ctx.globalCompositeOperation='lighter';ctx.filter='opacity(25%)';}
   const before=state(ctx);v.compositeOver(ctx,rects,.5);
   check('roof composite restores its caller state '+dirty,state(ctx)===before);
   return pixels(c);
  };
  const expected=paint(false),actual=paint(true);
  check('roof mask retains its clip and authored opacity',changed(expected,actual)===0
   &&actual[(100*width+600)*4+3]>50&&actual[(100*width+750)*4+3]===0);
 }
 // Real renderer: an enemy hidden by the wall begins and ends each kind of
 // warning. No unrelated effect is present to accidentally reset its leak.
 const c=canvas();document.body.append(c);const renderer=new Renderer(c);renderer.worldOnly=true;renderer.setCaptureViewport({w:width,h:height});
 const enemy=w.createMonster('zombie',1,'enemy');enemy.pos={x:850,y:600};w.actors.push(enemy);
 const inst=enemy.skills.find(s=>s)!;if(!inst)throw Error('Fixture needs an ordinary enemy skill');
 const internal=renderer as unknown as {sightVeil:SightVeil;overlay:HTMLCanvasElement};
 let incomingAlpha=NaN;const draw=internal.sightVeil.draw.bind(internal.sightVeil);
 internal.sightVeil.draw=(ctx,...args)=>{incomingAlpha=ctx.globalAlpha;return draw(ctx,...args)};
 const common={aim:{x:600,y:600},reach:100,inner:0,arcRad:Math.PI/2,ang:Math.PI,color:'#ff8040'};
 const geometries:ForesightGeo[]=[{...common,kind:'ground'}, {...common,kind:'wedge'},
  {...common,kind:'wedge',arcRad:Math.PI*2}, {...common,kind:'wedge',band:{standoff:50,halfWidth:30}},
  {...common,kind:'wedge',track:true}];
 // Finish the static floor before comparing warning states. Its normal
 // time budget can otherwise replace a flat stand-in between these frames,
 // creating a machine-speed-dependent pixel change unrelated to shadows.
 // Only preparation is synchronous; all assertions use the ordinary config.
 const ground=VIS_CFG.ground as {bakeBudgetMs:number;asyncUpload:boolean};
 const {bakeBudgetMs,asyncUpload}=ground;
 try {
  ground.bakeBudgetMs=Infinity;ground.asyncUpload=false;
  renderer.render(w);
 } finally {
  ground.bakeBudgetMs=bakeBudgetMs;ground.asyncUpload=asyncUpload;
 }
 const settled=pixels(c);renderer.render(w);
 check('casting fixture starts with settled floor pixels',changed(settled,pixels(c))===0);
 check('casting fixture enemy is actually occluded',internal.sightVeil.occludedAt(enemy.pos)>.99);
 for(const [i,geo]of geometries.entries()){
  enemy.casting={inst,mode:'cast',aim:{...common.aim},elapsed:.5,total:1,held:true,baseMult:1,foresight:geo};
  renderer.render(w);const afterCast=incomingAlpha;
  const castPixels=pixels(c);
  enemy.casting=null;renderer.render(w);const afterIdle=incomingAlpha;
  check(`hidden enemy warning ${i} cannot suppress the shadow pass`,afterCast===1&&afterIdle===1,{afterCast,afterIdle});
  const idlePixels=pixels(c);let changes=0;
  for(let y=50;y<120;y+=10)for(let x=620;x<780;x+=10){
   const at=(y*width+x)*4;for(let k=0;k<4;k++)if(castPixels[at+k]!==idlePixels[at+k])changes++;
  }
  check('hidden enemy warning '+i+' keeps final wall-shadow pixels stable',changes===0,{changed:changes});
 }
 // The original bug multiplied fades through later actors. Alternate casts
 // under a moving camera; inspect the compositor input on every frame.
 let bad=0;
 for(let i=0;i<90;i++){
  w.time+=1/60;w.player.pos.y=600+Math.sin(i/20)*35;
  enemy.casting=i%6<3?{inst,mode:'cast',aim:{...common.aim},elapsed:.5,total:1,held:true,baseMult:1,foresight:geometries[i%geometries.length]}:null;
  renderer.render(w);if(incomingAlpha!==1)bad++;
 }
 check('moving combat never inherits a hidden caster opacity',bad===0,{frames:90,bad});
 // A paused scene with the same world can redraw repeatedly without changing
 // final world pixels (camera/lighting fixed, no dynamic effects or HUD).
 enemy.casting=null;w.actors=[w.player];w.player.pos.y=600;
 renderer.render(w);const baseline=pixels(c);renderer.render(w);
 check('quiet final scene remains deterministic',changed(baseline,pixels(c))===0);
 c.remove();internal.overlay.remove();restore();return checks;
}
