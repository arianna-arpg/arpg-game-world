import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { massAdventure } from '../src/worldmass/preset';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { landformCell, type MassLandformShape } from '../src/worldmass/landforms';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { address, moveAddress } from '../src/worldmass/address';
import { canonical, massDigest } from '../src/worldmass/random';
import { regionKind } from '../src/world/regions';
import type { MassSpec } from '../src/worldmass/contracts';

void makeSimWorld;
const copy=<T>(x:T):T=>JSON.parse(canonical(x));
const policy=massLandformPolicy();
const flat=(biome='downs',elevation=.1):MassSpec=>({id:'landform-proof',version:1,addressSpan:960,terrainCell:30,
  fields:[{id:'elevation',base:elevation,layers:[]}],surfaces:[{id:'base',when:[],priority:0,region:'ground',color:'#445533',biome}],places:[],landforms:{...copy(policy),chance:1}});
const gen=(s=flat(),seed=713)=>new MassGenerator(makeMassRun(seed,'regional-proof',s),s);
const at=(x:number,y:number)=>address('surface','0','0',x,y,960);
let passed=0;
function test(name:string,fn:()=>void) {fn();passed++;console.log('PASS '+name);}
// Independent radius-15 circle/swept-grid oracle on a half-cell lattice.
// The half cells include the center of two-cell (60-unit) corridors.
function routes(shape:MassLandformShape) {
  const n=shape.rows.length,N=n*2,step=15,radius=15;
  const blocked=(x:number,y:number)=>x<0||y<0||x>=n||y>=n||['b','w'].includes(shape.rows[y][x]);
  const safe=(ix:number,iy:number)=>{
    const x=ix*step,y=iy*step;if(x<radius||y<radius||x>n*30-radius||y>n*30-radius)return false;
    for(let ty=Math.floor((y-radius)/30);ty<=Math.floor((y+radius)/30);ty++)for(let tx=Math.floor((x-radius)/30);tx<=Math.floor((x+radius)/30);tx++) {
      const dx=Math.max(tx*30-x,0,x-(tx+1)*30),dy=Math.max(ty*30-y,0,y-(ty+1)*30);
      if(dx*dx+dy*dy<radius*radius-1e-8&&blocked(tx,ty))return false;
    }
    return true;
  };
  const stands=new Uint8Array(N*N);for(let y=1;y<N;y++)for(let x=1;x<N;x++)stands[y*N+x]=safe(x,y)?1:0;
  const seen=new Set<number>(),queue=[N+1];seen.add(N+1);
  for(let i=0;i<queue.length;i++)for(const d of [-1,1,-N,N]) {
    const k=queue[i]+d;if(!seen.has(k)&&stands[k]){seen.add(k);queue.push(k);}
  }
  let interior=0,unreachable=0;
  for(let y=8;y<N-8;y++)for(let x=8;x<N-8;x++)if(stands[y*N+x]){interior++;if(!seen.has(y*N+x))unreachable++;}
  return {seen,interior,unreachable,n:N};
}
test('all 21 native motifs preserve connected body-wide approaches and an outer bypass',()=>{
  assert.equal(policy.shapes.length,21);
  for(const shape of policy.shapes) {
    const r=routes(shape);assert.ok(r.interior>80,shape.id+' interior');assert.equal(r.unreachable,0,shape.id+' disconnected stands');
    const n=r.n;
    for(let i=1;i<n-1;i++)for(const k of [n+i,(n-2)*n+i,i*n+1,i*n+n-2])assert.ok(r.seen.has(k),shape.id+' bypass');
  }
});
test('neighboring geographic candidates differ by builder, not merely rotation or seed',()=>{
  for(const [biome,e] of [['downs',.1],['downs',.6],['forest',.1],['tundra',.1],['marsh',.1],['desert',.1]] as const) {
    const g=gen(flat(biome,e));for(let y=-4;y<4;y++)for(let x=-4;x<4;x++) {
      const a=g.landforms!.at(at(x*2880+1440,y*2880+1440))!;
      const b=g.landforms!.at(at((x+1)*2880+1440,y*2880+1440))!;
      const c=g.landforms!.at(at(x*2880+1440,(y+1)*2880+1440))!;
      assert.ok(a&&b&&c);assert.notEqual(a.shape.builder,b.shape.builder);assert.notEqual(a.shape.builder,c.shape.builder);
    }
  }
});
test('all native terrain materials agree with cold collision and streamed chunks',()=>{
  let wet=0;
  for(const shape of policy.shapes) {
  const s=flat();s.landforms!.recipes=[{...s.landforms!.recipes[0],id:'material-course',biomes:['downs'],when:[],shapes:[shape.id]}];
  const g=gen(s),state=new MassState(g.run,30),stream=new MassStream(g,state,{maxPages:16,maxSamples:16000}),walk=new MassWalk(stream,{dimension:'surface',cx:'0',cy:'0'});
  const p=g.landforms!.at(at(1440,1440))!;assert.ok(p);
  let blocked=0,crossChunk=new Set<string>();
  for(let y=0;y<p.shape.rows.length;y++)for(let x=0;x<p.shape.rows.length;x++) {
    const q=moveAddress(p.origin,{x:(x+.5)*30,y:(y+.5)*30},960),t=g.terrainAt(q),c=landformCell(p,x,y);
    assert.equal(regionKind(t.region)?.walkable,c!=='b');
    if(c==='w'){assert.equal(t.region,'water');wet++;}if(c==='c')assert.equal(t.region,'locale_bridge');
    assert.equal(walk.isWalkable(Number(q.cx)*960+q.x,Number(q.cy)*960+q.y),c!=='b');
    if(c==='b'||c==='w')blocked++;crossChunk.add(q.cx+','+q.cy);
  }
  assert.ok(blocked>50);assert.ok(crossChunk.size>1);
  const cells=[...crossChunk].map(s=>{const [cx,cy]=s.split(',');return {dimension:'surface',cx,cy};});
  stream.request(cells);while(stream.stats.pending)stream.step(137);
  for(const cell of cells)assert.ok(stream.page(cell));
  }
  assert.ok(wet>100,'water keeps native wading/swimming semantics; dry passages are optional alternatives');
});
test('saved descriptors, query order, eviction and far negative coordinates preserve exact landforms',()=>{
  const spec=flat('forest'),g=gen(spec),fresh=gen(copy(spec)),points=[at(1440,1440),at(-1440,-1440),address('surface','9007199254740994','-9007199254740998',480,480,960)];
  const plans=points.map(p=>g.landforms!.at(p));assert.ok(plans.every(Boolean),'real far-address footprints, not empty samples');assert.equal(new Set(plans.map(p=>p!.id)).size,3);
  const before=points.map(p=>canonical(g.terrainAt(p)));
  for(let i=0;i<160;i++)g.landforms!.at(at(i*2880+1440,1440));
  assert.ok(g.landforms!.stats.cached<=128);
  assert.deepEqual(points.map(p=>canonical(g.terrainAt(p))),before);
  assert.deepEqual([...points].reverse().map(p=>canonical(fresh.terrainAt(p))),[...before].reverse());
  const old=copy(spec);delete old.landforms;assert.equal(gen(old).landforms,null);assert.equal(gen(old).terrainAt(at(1440,1440)).region,'ground');
});
test('whole footprints refuse shores, protected sites and opening reservations',()=>{
  for(const kind of ['shore','site','opening']) {
    const s=flat();if(kind==='shore')s.surfaces=[{...s.surfaces[0],region:'water'}];
    if(kind==='site')s.places=[{id:'reserved',version:1,content:'reserved',period:2880,chance:1,jitter:0,radius:300,priority:1,when:[]}];
    if(kind==='opening')s.landforms!.exclusions=[{source:'opening',origin:at(0,0),bounds:{minX:0,minY:0,maxX:2880,maxY:2880}}];
    assert.equal(gen(s).landforms!.at(at(1440,1440)),null,kind);
  }
});
test('invalid immutable policy refuses before generation',()=>{
  for(const change of [(s:any)=>s.landforms=null,(s:any)=>s.landforms.spacing=1,(s:any)=>s.landforms.shapes[0].rows[0]='bad',
    (s:any)=>s.landforms.shapes[0].rows[0]='b'.repeat(38),(s:any)=>s.landforms.recipes[0].shapes=['missing'],(s:any)=>s.landforms.jitter=.9,
    (s:any)=>s.landforms.bypassRegions=['water'],(s:any)=>s.landforms.recipes[0].barrier.region='ground',
    (s:any)=>{const rows=s.landforms.shapes[0].rows.map((r:string)=>[...r]);for(let y=16;y<=20;y++)for(let x=16;x<=20;x++)rows[y][x]='b';rows[18][18]='g';s.landforms.shapes[0].rows=rows.map((r:string[])=>r.join(''));}]) {
    const s=flat();change(s);assert.throws(()=>gen(s));
  }
});
test('structural diversity ignores labels, rotation, reflection and overall scale',()=>{
  const N=32;
  const image=(shape:MassLandformShape)=>Array.from({length:N},(_,y)=>Array.from({length:N},(_,x)=>{
    const c=shape.rows[4+Math.floor((y+.5)*(shape.rows.length-8)/N)][4+Math.floor((x+.5)*(shape.rows.length-8)/N)];
    return c==='b'?1:c==='w'?2:0;
  }));
  const images=policy.shapes.map(image);let closest=1,pair:string[]=[];
  for(let i=0;i<images.length;i++)for(let j=i+1;j<images.length;j++) {
    let difference=1;
    for(const mirror of [false,true]) {
      let b=images[j].map(r=>mirror?[...r].reverse():r);
      for(let turn=0;turn<4;turn++) {
        const d=images[i].reduce((sum,row,y)=>sum+row.filter((v,x)=>v!==b[y][x]).length,0)/(N*N);
        difference=Math.min(difference,d);b=b[0].map((_,x)=>b.map(r=>r[x]).reverse());
      }
    }
    if(difference<closest){closest=difference;pair=[policy.shapes[i].id,policy.shapes[j].id];}
  }
  console.log(JSON.stringify({closestStructuralDifference:closest,pair}));
  assert.ok(closest>=.10,'distinct names must not hide duplicated terrain');
});
test('real player movement stops at the generated wall and cold Continue agrees',()=>{
  const config={terrain:flat(),theme:copy(massAdventure().theme),content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256};
  const w=makeSimWorld('warrior',814),mass=new WorldMassRuntime(713,'landform-movement',config);mass.attach(w);
  const p=mass.generator.landforms!.at(at(1440,1440))!;let barrier:{x:number;y:number}|undefined;
  for(let y=3;y<p.shape.rows.length-3&&!barrier;y++)for(let x=4;x<p.shape.rows.length-1;x++) {
    if(landformCell(p,x,y)==='b'&&[1,2,3].every(d=>[y-1,y,y+1].every(y=>!['b','w'].includes(landformCell(p,x-d,y))))) {barrier={x,y};break;}
  }
  assert.ok(barrier);const q=moveAddress(p.origin,{x:barrier.x*30,y:(barrier.y+.5)*30},960);
  const edge={x:Number(q.cx)*960+q.x,y:Number(q.cy)*960+q.y};w.player.pos={x:edge.x-90,y:edge.y};
  for(let i=0;i<120;i++)w.moveActor(w.player,1,0,1/60);
  assert.ok(w.player.pos.x<edge.x+.01,'native movement stops at the physical region boundary');
  assert.ok(w.player.pos.x>edge.x-60,'the player actually reached the obstacle');
  const saved=mass.snapshot(w),again=makeSimWorld('warrior',815),continued=new WorldMassRuntime(713,'landform-movement',saved.config,saved);continued.attach(again,saved);
  assert.equal(canonical(continued.generator.landforms!.at(at(1440,1440))),canonical(p));assert.deepEqual(again.player.pos,w.player.pos);
  assert.equal(continued.walk.isWalkable(edge.x+15,edge.y),false);
  assert.equal(mass.state.snapshot().terrain.length,0,'terrain is a generated foundation, not thousands of save edits');
});
test('opening reservation is pinned alongside ordinary mire protection',()=>{
  const saved=reserveMassOpening(713,'landform-opening',massAdventure());
  assert.deepEqual(saved.terrain.landforms!.exclusions,saved.terrain.patches!.exclusions);
  const g=gen(saved.terrain),e=saved.terrain.landforms!.exclusions![0];
  for(let y=e.bounds.minY;y<=e.bounds.maxY;y+=960)for(let x=e.bounds.minX;x<=e.bounds.maxX;x+=960)
    assert.equal(g.landforms!.at(moveAddress(e.origin,{x,y},960)),null);
});
test('default seamless country actually admits regional terrain beyond the protected opening',()=>{
  const s=copy(massAdventure().terrain),found=new Set<string>(),recipes=new Set<string>(); // regionalExtent legacy survey copy
  delete s.landforms!.regional;delete s.regionalDiscoveries; // regionalExtent has a separate default-world survey
  for (const seed of [42,713,991]) { const g=gen(s,seed);
  for(let y=-10;y<10;y++)for(let x=-10;x<10;x++) {
    const p=g.landforms!.at(at(x*2880+1440,y*2880+1440));if(p){found.add(seed+'/'+p.id);recipes.add(p.recipe.id);}
  }
  }
  console.log(JSON.stringify({accepted:found.size,recipes:[...recipes],source:massDigest(policy)}));
  assert.ok(found.size>=35,'regional terrain must be common enough to encounter');assert.equal(recipes.size,6,'climate variety');
});
console.log(passed+' regional landform courses passed');
