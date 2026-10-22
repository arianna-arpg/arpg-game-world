import { discShadowPath, SightVeil } from '../src/render/vis/sightVeil';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { Doodad } from '../src/engine/levelgen';
import { captureVisibilityCanvas } from '../src/render/vis/visibilityDiagnostics';
import { takeMovementRecords } from '../src/engine/movementDiagnostics';

function canvas() { const c=document.createElement('canvas');c.width=1200;c.height=1000;return c; }
function mask(x:number) {
 const c=canvas(),ctx=c.getContext('2d')!;ctx.fillStyle='white';ctx.beginPath();
 discShadowPath(ctx,200+40/Math.sin(Math.PI/12),500,40,1,x,500,1800,0,0,1);ctx.fill();
 return ctx.getImageData(0,0,c.width,c.height).data;
}
function run() {
 const checks:{name:string;ok:boolean;detail?:unknown}[]=[];
 const check=(name:string,ok:boolean,detail?:unknown)=>checks.push({name,ok,detail});
 const a=mask(199.999),b=mask(200.001);let changed=0;
 for(let i=3;i<a.length;i+=4)if(Math.abs(a[i]-b[i])>32)changed++;
 check('subpixel angle crossing does not replace a shadow crescent',changed<10,{changed});
 for(const [kind,shape,at] of [
  ['disc',{kind:'circle',r:30},{x:235,y:500}],
  ['slab',{kind:'rect',hw:10,hh:35},{x:280,y:500}],
 ] as const) {
  const ds=[{kind:'cliff',radius:40,pos:{...at},hitbox:shape}] as Doodad[];
  const eye={x:200,y:500},v=new SightVeil();
  const view={player:{pos:eye,tier:0},walk:null,zone:{},doodads:ds,doodadRev:0,doodadsNear:()=>ds};
  v.update(view,0,1200,1000);const c=canvas(),ctx=c.getContext('2d')!;v.draw(ctx,0,0,1,1200,1000);
  const x=kind==='disc'?480:790,occ=v.occludedAt({x,y:500}),alpha=ctx.getImageData(x,500,1,1).data[3];
  check(kind+' painted and queried range agree',occ===0&&alpha<8,{occ,alpha});
  eye.x=at.x;v.update(view,0,1200,1000);ctx.clearRect(0,0,1200,1000);v.draw(ctx,0,0,1,1200,1000);
  check(kind+' displaced eye inside body has matching reveal',v.occludedAt({x:400,y:500})===0,{occlusion:v.occludedAt({x:400,y:500})});
 }
 const restore=seedGlobalRandom(281903),w=makeSimWorld('rogue',281903);
 w.walk=null;w.actors=[w.player];w.exits=[];w.structures=[];
 w.doodads=[
  [804.5665064221248,624.7950490587391,21.79984090430662],
  [864.7723651188426,613.915098500438,25.93121799454093],
  [760.6842267420143,594.2352787521668,36.75921646691859],
  [795.3123474866152,618.054571102839,17.114701353013515],
  [826.3512178114615,586.1246635811403,20.526845450978726],
 ].map(([x,y,r])=>({kind:'tree',radius:50,pos:{x,y},hitbox:{kind:'circle',r}})) as Doodad[];
 w.markDoodadsChanged();w.player.pos={x:817.3299944563769,y:662.9393292940222};
 w.player.push={vx:(805.7571451438348-w.player.pos.x)*30,vy:(616.355328190755-w.player.pos.y)*30};
 const v=new SightVeil(),c=canvas(),ctx=c.getContext('2d')!;let maxTravel=0,embedded=0,maxShadowChange=0,prev:Uint8ClampedArray|undefined;
 for(let i=0;i<32;i++){
  const from={...w.player.pos};w.update(1/30);maxTravel=Math.max(maxTravel,Math.hypot(w.player.pos.x-from.x,w.player.pos.y-from.y));
  if(w.pointInSolid(w.player.pos.x,w.player.pos.y,w.player.radius-1e-4))embedded++;
  v.update(w,0,1200,1000);ctx.clearRect(0,0,1200,1000);v.draw(ctx,200,100,1,1200,1000);
  const data=ctx.getImageData(0,0,1200,1000).data;
  if(prev){let sum=0;for(let j=3;j<data.length;j+=16)sum+=Math.abs(data[j]-prev[j]);maxShadowChange=Math.max(maxShadowChange,sum/300000);}
  prev=data;
 }
 check('real shove stays outside cover and needs no recovery jump',embedded===0&&maxTravel<48.001,{embedded,maxTravel,maxShadowChange});
 const trace=takeMovementRecords({player:w.player});
 check('capture identifies knockback without an unstuck teleport',trace.events.some(e=>e.reason==='knockback')&&!trace.events.some(e=>e.reason==='unstuck'),{events:trace.events.length,dropped:trace.dropped});
 const worldCanvas=document.createElement('canvas'),overlay=document.createElement('canvas');
 worldCanvas.width=640;worldCanvas.height=480;overlay.width=1280;overlay.height=960;
 const wc=worldCanvas.getContext('2d')!,oc=overlay.getContext('2d')!;
 wc.fillStyle='#123456';wc.fillRect(0,0,640,480);oc.fillStyle='#abcdef';oc.fillRect(900,100,100,100);
 document.body.append(worldCanvas,overlay);
 const shot=captureVisibilityCanvas(worldCanvas,overlay),sc=shot.getContext('2d')!;
 check('capture includes reduced-resolution world and full-resolution overlay',
  sc.getImageData(100,100,1,1).data[0]===0x12&&sc.getImageData(950,150,1,1).data[0]===0xab);
 overlay.style.display='none';
 check('hidden overlay is excluded from capture',captureVisibilityCanvas(worldCanvas,overlay).getContext('2d')!.getImageData(950,150,1,1).data[0]===0x12);
 worldCanvas.remove();overlay.remove();
 restore();return {checks,failures:checks.filter(c=>!c.ok)};
}
(window as unknown as {collisionShadowFixture:{run:typeof run}}).collisionShadowFixture={run};
