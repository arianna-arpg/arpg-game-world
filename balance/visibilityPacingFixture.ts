import { SightVeil } from '../src/render/vis/sightVeil';
import { RoomVeil } from '../src/render/vis/roomVeil';
import { LightLayer } from '../src/render/vis/lights';
import { Renderer } from '../src/render/renderer';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { GridWalkField } from '../src/world/gridWalk';
import type { Doodad } from '../src/engine/levelgen';
import { ExhaustiveSightVeil } from './visibilityReference';

const width=1307,height=1196,zoom=1.3;
function canvas(w=width,h=height){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
// Read through a separate CPU surface. Repeated getImageData on the production
// canvas can make Chromium change its raster backend halfway through the test.
function pixels(o:unknown){
 const c=(o as {buf:HTMLCanvasElement}).buf,snapshot=canvas(c.width,c.height);
 const ctx=snapshot.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(c,0,0);
 return {w:c.width,h:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};
}
function difference(a:ReturnType<typeof pixels>,b:ReturnType<typeof pixels>){
 if(a.w!==b.w||a.h!==b.h)return Infinity;
 let n=0;for(let i=0;i<a.data.length;i++)if(a.data[i]!==b.data[i])n++;return n;
}
function forest():Doodad[]{
 return Array.from({length:974},(_,i)=>{
  const a=i*2.399963,r=100+(i%79)*11;
  return {kind:'cliff',radius:20,pos:{x:1603.5+Math.cos(a)*r,y:2116+Math.sin(a)*r},
   hitbox:i%7===0?{kind:'rect',hw:6,hh:25,rot:a}:i%11===0?{kind:'multi',parts:[{dx:0,dy:0,r:10},{dx:8,dy:9,r:8}]}:{kind:'circle',r:6+i%8},tier:i%13===0?1:0} as Doodad;
 });
}
export function run(){
 const checks:{name:string;ok:boolean;detail?:unknown}[]=[];
 const check=(name:string,ok:boolean,detail?:unknown)=>checks.push({name,ok,detail});
 const ds=forest(),g=new GridWalkField(4800,4800,24);g.fillRegion(0,0,4799,4799,'ground');
 const view={player:{pos:{x:1603.5,y:2116},tier:0},walk:g,zone:{},doodads:ds,doodadsNear:()=>ds,doodadRev:0};
 const v=new SightVeil(),ref=new ExhaustiveSightVeil();let mismatches=0,queries=0;
 for(let n=0;n<90;n++){
  view.player.pos={x:1603.5+Math.sin(n*.31)*130,y:2116+Math.cos(n*.29)*130};view.player.tier=n%30<15?0:1;
  if(n===30){g.fillDisc(1810,2100,85,'wall');view.doodadRev++}
  if(n===60){g.fillDisc(1810,2100,85,'ground');ds.splice(0,14);view.doodadRev++}
  v.update(view,0,width/zoom,height/zoom);ref.update(view,0,width/zoom,height/zoom);
  for(let j=0;j<200;j++){
   const a=j*Math.PI*2/200,p={x:view.player.pos.x+Math.cos(a)*(j%23)*37,y:view.player.pos.y+Math.sin(a)*(j%23)*37};
   if(v.occludedAt(p,j%2)!==ref.occludedAt(p,j%2))mismatches++;queries++;
  }
  for(const d of ds.slice(n,n+12))if(v.raisedSurfaceReveal(d)!==ref.raisedSurfaceReveal(d))mismatches++;
 }
 check('angular candidates preserve exact visibility and owner exceptions',mismatches===0,{queries,mismatches});

 view.player.pos={x:1603.5,y:2116};view.player.tier=0;v.update(view,0,width/zoom,height/zoom);v.update(view,0,width/zoom,height/zoom);
 const raster={width,height,zoom},cx=1603.5-width/zoom/2,cy=2116-height/zoom/2;
 const out=canvas();v.draw(out.getContext('2d')!,cx,cy,zoom,width,height,raster);const original=pixels(v);
 for(const scale of [.85,.7,.55,1]){
  const c=canvas(Math.round(width*scale),Math.round(height*scale));v.update(view,0,width/zoom,height/zoom);
  v.draw(c.getContext('2d')!,cx,cy,zoom*scale,c.width,c.height,raster);
  check('tree/wall mask is pixel-identical at resolution '+scale,difference(original,pixels(v))===0);
 }
 // Cached masks must be exactly the fresh renderer's answer after every
 // state transition, including empty geometry and replacement grids.
 const compareFresh=(name:string,confine=0)=>{
  v.update(view,confine,width/zoom,height/zoom);v.update(view,confine,width/zoom,height/zoom);
  v.draw(out.getContext('2d')!,cx,cy,zoom,width,height,raster);
  const fresh=new SightVeil();fresh.userMul=v.userMul;fresh.update(view,confine,width/zoom,height/zoom);
  fresh.draw(out.getContext('2d')!,cx,cy,zoom,width,height,raster);
  check(name,difference(pixels(v),pixels(fresh))===0);
 };
 view.player.pos.y+=1;compareFresh('eye motion invalidates the mask');
 v.userMul=.6;compareFresh('darkness preference invalidates the mask');v.userMul=1;
 ds[20].pos.y+=30;view.doodadRev++;compareFresh('caster edits invalidate the mask');
 view.player.tier=1;compareFresh('floor settling invalidates the mask');view.player.tier=0;
 g.fillDisc(1750,2116,40,'wall');compareFresh('terrain/door edits invalidate the mask');
 const replacement=new GridWalkField(4800,4800,24);replacement.fillRegion(0,0,4799,4799,'ground');view.walk=replacement;
 compareFresh('replacement terrain invalidates the mask');compareFresh('room transition invalidates mask strength',.4);
 const held=ds.splice(0);view.doodadRev++;compareFresh('removing every caster clears the old mask');
 ds.push(...held);view.doodadRev++;compareFresh('restoring casters after an empty sheet redraws them');
 const cachedSheet=(v as unknown as {sheetKey:string}).sheetKey;
 const mask=(v as unknown as {mask:HTMLCanvasElement}).mask,maskContext=mask.getContext('2d')!;
 const fill=maskContext.fill.bind(maskContext);let fills=0;
 maskContext.fill=((...args:Parameters<CanvasRenderingContext2D['fill']>)=>{fills++;return fill(...args)}) as CanvasRenderingContext2D['fill'];
 v.update(view,0,width/zoom,height/zoom);v.draw(out.getContext('2d')!,cx,cy,zoom,width,height,raster);
 check('stationary scene reuses its raster without drawing the union again',fills===0&&cachedSheet===(v as unknown as {sheetKey:string}).sheetKey,{fills});
 v.draw(out.getContext('2d')!,cx+.25,cy,zoom,width,height,raster);
 check('camera-only motion rebuilds the raster',fills>0);

 const room=new RoomVeil(),st={id:'test-room',confineVision:true,roofs:[{x:1500,y:2000,w:220,h:230}],doors:[{pos:{x:1720,y:2110},normal:{x:1,y:0},door:{open:true}}]};
 room.update({player:view.player,roofedStructureAt:()=>st},1);
 room.draw(out.getContext('2d')!,cx,cy,zoom,width,height,raster);const roomMask=pixels(room);
 for(const scale of [.85,.7,.55]){
  room.draw(out.getContext('2d')!,cx,cy,zoom*scale,Math.round(width*scale),Math.round(height*scale),raster);
  check('room feather is pixel-identical at resolution '+scale,difference(roomMask,pixels(room))===0);
 }

 const restore=seedGlobalRandom(3383071002),w=makeSimWorld('warrior',3383071002);
 w.walk=replacement;w.zone.size={w:4800,h:4800};w.zone.theme={...w.zone.theme,ambientDark:.8};w.arena={w:4800,h:4800,shape:'rect'};w.arenaHull={w:4800,h:4800};
 w.player.pos={x:1603.5,y:2116};w.actors=[w.player];w.doodads=forest();w.markDoodadsChanged();w.exits=[];w.structures=[];
 const light=new LightLayer();light.collect(w,new Map(),cx,cy,width/zoom,height/zoom);
 light.render(out.getContext('2d')!,cx,cy,zoom,width,height,[],raster);const lightMask=pixels(light);
 for(const scale of [.85,.7,.55]){
  light.render(out.getContext('2d')!,cx,cy,zoom*scale,Math.round(width*scale),Math.round(height*scale),[],raster);
  check('light occlusion is pixel-identical at resolution '+scale,difference(lightMask,pixels(light))===0);
 }
 document.body.append(out);const renderer=new Renderer(out);renderer.worldOnly=true;renderer.setCaptureViewport({w:width,h:height});renderer.render(w);
 const internal=renderer as unknown as {sightVeil:SightVeil;cam:{x:number;y:number}};
 const renderMask=pixels(internal.sightVeil),camera={...internal.cam};
 for(const scale of [.85,.7,.55,1]){
  renderer.setRenderScale(scale);renderer.render(w);
  check('actual renderer keeps camera and shadow fixed at resolution '+scale,
   difference(renderMask,pixels(internal.sightVeil))===0&&camera.x===internal.cam.x&&camera.y===internal.cam.y);
 }
 out.remove();restore();return {checks,failures:checks.filter(c=>!c.ok)};
}
(window as unknown as {visibilityPacing:{run:typeof run}}).visibilityPacing={run};
