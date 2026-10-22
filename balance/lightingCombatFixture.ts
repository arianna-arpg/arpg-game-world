import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Renderer } from '../src/render/renderer';
import { GridWalkField } from '../src/world/gridWalk';
import { mod } from '../src/engine/stats';
import type { Doodad } from '../src/engine/levelgen';

/** Real simulation + renderer, with active pursuing actors, dense cover and
 * transient flashes. Timing is reported, not asserted against one machine. */
export function combatProfile(instrumentMovement = false) {
 const restore=seedGlobalRandom(71379);
 const w=makeSimWorld('warrior',71379),g=new GridWalkField(4800,4800,24);
 g.fillRegion(0,0,4799,4799,'ground');g.fillDisc(2700,2400,120,'wall');
 w.walk=g;w.zone.size={w:4800,h:4800};w.zone.theme={...w.zone.theme,ambientDark:.55};
 w.arena={w:4800,h:4800,shape:'rect'};w.arenaHull={w:4800,h:4800};
 w.player.pos={x:2100,y:2400};w.actors=[w.player];w.doodads=[];w.exits=[];w.structures=[];
 w.player.sheet.setSource('lighting-qa',[mod('life','override',1000000),mod('lifeRegen','override',1000000)]);
 w.player.fillResources();
 for(let i=0;i<1050;i++){
  const a=i*2.399963, r=180+(i%73)*12;
  w.doodads.push({kind:'cliff',radius:8,pos:{x:2400+Math.cos(a)*r,y:2400+Math.sin(a)*r}} as Doodad);
 }
 for(let i=0;i<120;i++){
  const a=i*2.399963,r=100+(i%27)*24;
  w.doodads.push({kind:i%2?'lava':'magma_core',radius:15,pos:{x:2400+Math.cos(a)*r,y:2400+Math.sin(a)*r}} as Doodad);
 }
 w.markDoodadsChanged();
 for(let i=0;i<80;i++){const a=w.createMonster('zombie',1,'enemy');a.pos={x:2250+(i%10)*22,y:2300+Math.floor(i/10)*22};w.actors.push(a);}
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=960;document.body.appendChild(canvas);
 const renderer=new Renderer(canvas);renderer.worldOnly=true;
 const times:number[]=[],sim:number[]=[],detail:Record<string,number[]>={};
 const internal=renderer as unknown as {lightLayer:{collect:(...a:unknown[])=>unknown;render:(...a:unknown[])=>unknown};sightVeil:{update:(...a:unknown[])=>unknown;draw:(...a:unknown[])=>unknown}};
 let measuring=false;
 const movement:Record<string,{calls:number;ms:number}>={};
 if(instrumentMovement)for(const key of ['clampPos','sweepDoodadMove','findFreeSpot','doodadsAt','doodadsNear','updateTerrainEffects','separateActors','walkResolve']){
  const obj=w as unknown as Record<string,(...a:unknown[])=>unknown>,fn=obj[key];if(!fn)continue;
  const entry=movement[key]={calls:0,ms:0};
  obj[key]=function(...args:unknown[]){const t=performance.now();try{return fn.apply(this,args)}finally{if(measuring){entry.calls++;entry.ms+=performance.now()-t}}};
 }
 for(const [name,obj,key] of [['lightCollect',internal.lightLayer,'collect'],['lightDraw',internal.lightLayer,'render'],['sightUpdate',internal.sightVeil,'update'],['sightDraw',internal.sightVeil,'draw']] as const){
  const target=obj as unknown as Record<string,(...a:unknown[])=>unknown>,fn=target[key];detail[name]=[];
  target[key]=function(...args:unknown[]){const t=performance.now();try{return fn.apply(this,args)}finally{if(measuring)detail[name].push(performance.now()-t)}};
 }
 let maxActors=0,maxFlashes=0;
 for(let i=0;i<150;i++){
  w.player.pos={x:2100+Math.sin(i/60)*70,y:2350+i*.7};
  for(let j=0;j<8;j++)w.flashes.push({pos:{x:2200+(j%4)*42,y:2300+Math.floor(j/4)*50},radius:20,color:'#ff8844',life:.25,maxLife:.25});
  measuring=i>=30;
  const t0=performance.now();w.update(1/60);const t1=performance.now();renderer.render(w);const t2=performance.now();
  if(i>=30){times.push(t2-t1);sim.push(t1-t0);}
  maxActors=Math.max(maxActors,w.actors.length);maxFlashes=Math.max(maxFlashes,w.flashes.length);
 }
 const p=(a:number[],q:number)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*q)];
 const passes=Object.fromEntries(Object.entries(detail).map(([k,a])=>[k,{p50:p(a,.5),p95:p(a,.95),max:Math.max(...a)}]));
 const result={passes,movement,frames:times.length,maxActors,maxFlashes,render:{p50:p(times,.5),p95:p(times,.95),max:Math.max(...times)},simulation:{p50:p(sim,.5),p95:p(sim,.95)},finite:times.every(Number.isFinite)};
 canvas.remove();restore();return result;
}
