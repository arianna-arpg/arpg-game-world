import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { address, cellKey, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import type { MassSpec, MassTerrain } from '../src/worldmass/contracts';
import { MassRegionalLandforms } from '../src/worldmass/regionalLandforms';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { landformCell, type MassLandformPlan, type MassLandformShape } from '../src/worldmass/landforms';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { regionalLandformPolicy } from '../src/worldmass/regionalLandformSources';
import { regionalTerrainCircle, regionalTerrainBox } from '../src/worldmass/regionalTerrainFootprint';
import { defaultRegionalTerrainGrammar, generateRegionalTerrain } from '../src/worldmass/regionalTerrainGrammar';
import { massAdventure } from '../src/worldmass/preset';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { canonical, massDigest } from '../src/worldmass/random';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';

void makeSimWorld;
const copy=<T>(value:T):T=>JSON.parse(canonical(value));
const small=massLandformPolicy(),regional=regionalLandformPolicy();
const at=(x:number,y:number)=>address('surface','0','0',x,y,960);
const dry=(c:string|undefined)=>c==='g'||c==='c';
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}

/** Independent half-cell circle test: transparency never acts as traversable
 * terrain in an interior proof, including protected sites and unowned pockets. */
function bodyRoutes(shape:MassLandformShape){
  const n=shape.rows.length,N=n*2,radius=15,stands=new Uint8Array(N*N),seen=new Uint8Array(N*N);
  let total=0,start=-1;
  for(let iy=1;iy<N;iy++)for(let ix=1;ix<N;ix++){
    const x=ix*15,y=iy*15;let safe=true;
    for(let yy=Math.floor((y-radius)/30);yy<=Math.floor((y+radius)/30)&&safe;yy++)
      for(let xx=Math.floor((x-radius)/30);xx<=Math.floor((x+radius)/30);xx++){
        const dx=Math.max(xx*30-x,0,x-(xx+1)*30),dy=Math.max(yy*30-y,0,y-(yy+1)*30);
        if(dx*dx+dy*dy<radius*radius-1e-8&&!dry(shape.rows[yy]?.[xx])){safe=false;break;}
      }
    if(safe){stands[iy*N+ix]=1;total++;if(start<0)start=iy*N+ix;}
  }
  assert.ok(start>=0,shape.id+' has body-clear terrain');
  const queue=new Int32Array(N*N);let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const k=queue[head++],x=k%N,y=Math.floor(k/N);
    for(const j of [x?k-1:-1,x+1<N?k+1:-1,y?k-N:-1,y+1<N?k+N:-1])
      if(j>=0&&stands[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}
  }
  return {total,reached:tail,seen,N};
}

/** Normalize the occupied bounding box into a fixed grid before considering
 * all eight square symmetries. A resized, translated, turned or reflected
 * copy therefore cannot earn novelty solely from its presentation. */
function normalizedTerrain(shape:MassLandformShape,outline=false):string {
  const points=shape.rows.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='.'?[]:[{x,y}]));
  assert.ok(points.length);const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),
    minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),N=48;
  const matrix=Array.from({length:N},(_,y)=>Array.from({length:N},(_,x)=>{
    const xx=minX+Math.min(maxX-minX,Math.floor((x+.5)*(maxX-minX+1)/N)),
      yy=minY+Math.min(maxY-minY,Math.floor((y+.5)*(maxY-minY+1)/N)),c=shape.rows[yy][xx];
    return outline?(c==='.'?'.':'#'):c;
  }));
  const forms:string[]=[];
  for(const mirror of [false,true])for(let turns=0;turns<4;turns++){
    let rows=matrix.map(row=>mirror?[...row].reverse():[...row]);
    for(let i=0;i<turns;i++)rows=rows.map((row,y)=>row.map((_,x)=>rows[N-1-x][y]));
    forms.push(rows.map(row=>row.join('')).join(''));
  }
  return forms.sort()[0];
}

function pinnedChildren(shape:MassLandformShape):number {
  let count=0;
  for(const child of shape.components??[]){
    const source=small.shapes.find(s=>s.id===child.shape);assert.ok(source,child.shape+' names a saved native source');
    assert.equal(child.size,source.rows.length);let matched=false;
    for(const mirror of [false,true])for(let turn=0;turn<4;turn++){
      const pose={shape:source,turn,mirror} as MassLandformPlan;let valid=true;
      for(let y=0;y<child.size&&valid;y++)for(let x=0;x<child.size;x++){
        const expected=landformCell(pose,x,y),actual=shape.rows[child.y+y]?.[child.x+x];
        if(expected==='.'?!dry(actual):expected!==actual){valid=false;break;}
      }
      if(valid)matched=true;
    }
    assert.ok(matched,shape.id+' must retain every cell of '+child.shape);
    for(let d=-1;d<=child.size;d++)for(const [x,y] of [[child.x-1,child.y+d],[child.x+child.size,child.y+d],
      [child.x+d,child.y-1],[child.x+d,child.y+child.size]])assert.ok(dry(shape.rows[y]?.[x]),shape.id+' child dry collar');
    count++;
  }
  return count;
}

function flat(composition=true):MassSpec {
  const shape=regional.shapes.find(s=>s.builder==='cloister_walk'&&s.params.extent===6600)!;
  const policy={...copy(regional),chance:1,jitter:0,shapes:[copy(shape)],
    recipes:[{id:'variation-course',biomes:['downs'],when:[],shapes:[shape.id],barrier:{region:'drystone',color:'#595345'}}]};
  if(composition)policy.composition={...copy(defaultRegionalTerrainGrammar()),chance:1};else delete policy.composition;
  return {id:'terrain-variation-proof',version:1,addressSpan:960,terrainCell:30,
    fields:[{id:'elevation',base:.1,layers:[]}],
    surfaces:[{id:'base',when:[],priority:0,region:'ground',color:'#445533',biome:'downs'}],places:[],
    landforms:{...copy(small),chance:1,regional:policy}};
}
const gen=(spec:MassSpec,seed=713)=>new MassGenerator(makeMassRun(seed,'terrain-variation-proof',spec),spec);

// Recorded from committed schema-13 generation before composition was added.
// These constants compare actual old results, not two instances of new code.
test('omitted composition preserves historical source, placements and terrain byte identities',()=>{
  const spec=flat(false),g=gen(spec),points=[at(4800,4800),at(-4800,-4800),at(14400,4800)];
  assert.equal(massDigest(spec),'4225203d67bebfb4');
  assert.deepEqual(points.map(q=>massDigest(g.landforms!.regionalLandforms!.formationAt(q))),
    ['768c276ac9be6b82','e3dacb049360e357','a92d8fc4f85f9964']);
  assert.deepEqual(points.map(q=>massDigest(g.terrainAt(q))),
    ['22367805fd6e127d','d2364fc9625b5a48','a7c078de12557656']);
});

type Point={x:number;y:number};
function graphProof(shape:MassLandformShape):string {
  const graph=shape.grammar;assert.ok(graph,'generated geometry retains its graph receipt');
  const count=graph.nodes.length,adjacency=Array.from({length:count},()=>new Set<number>()),keys=new Set<string>();
  assert.ok(count>=4&&count<=10,'bounded node count');
  for(const node of graph.nodes){
    assert.ok(Number.isFinite(node.x)&&Number.isFinite(node.y)&&node.radius>0);
    assert.ok(dry(shape.foundationRows?.[Math.floor(node.y)]?.[Math.floor(node.x)]??shape.rows[Math.floor(node.y)]?.[Math.floor(node.x)]),
      'graph junction has an actual original dry stand');
  }
  for(const edge of graph.edges){
    assert.ok(Number.isSafeInteger(edge.a)&&Number.isSafeInteger(edge.b)&&edge.a>=0&&edge.b>=0&&edge.a<count&&edge.b<count&&edge.a!==edge.b);
    const key=[edge.a,edge.b].sort((a,b)=>a-b).join('/');assert.ok(!keys.has(key),'no duplicate graph link');keys.add(key);
    adjacency[edge.a].add(edge.b);adjacency[edge.b].add(edge.a);assert.ok(edge.points.length>=2);
    assert.equal(edge.points[0].x,graph.nodes[edge.a].x);assert.equal(edge.points[0].y,graph.nodes[edge.a].y);
    assert.equal(edge.points[edge.points.length-1].x,graph.nodes[edge.b].x);assert.equal(edge.points[edge.points.length-1].y,graph.nodes[edge.b].y);
    for(let i=1;i<edge.points.length;i++){
      const a=edge.points[i-1],b=edge.points[i],steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)*2));
      for(let j=0;j<=steps;j++){
        const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
        assert.ok(dry((shape.foundationRows??shape.rows)[y]?.[x]),'recorded edge must follow its original dry corridor');
      }
    }
  }
  const seen=new Set([0]),todo=[0];
  for(let i=0;i<todo.length;i++)for(const node of adjacency[todo[i]])if(!seen.has(node)){seen.add(node);todo.push(node);}
  assert.equal(seen.size,count,'graph is connected');
  const cycles=graph.edges.length-count+1;assert.ok(cycles>=0&&cycles<=3);
  const degrees=adjacency.map(a=>a.size).sort((a,b)=>a-b);
  // A proper crossing between unrelated links creates an unrecorded junction.
  // Shared-node chambers may merge the routes intended to meet there.
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for(let i=0;i<graph.edges.length;i++)for(let j=i+1;j<graph.edges.length;j++){
    const a:{a:number;b:number;points:readonly Point[]}=graph.edges[i],b:{a:number;b:number;points:readonly Point[]}=graph.edges[j];if([a.a,a.b].some(k=>k===b.a||k===b.b))continue;
    for(let aa=1;aa<a.points.length;aa++)for(let bb=1;bb<b.points.length;bb++){
      const p:Point=a.points[aa-1],q:Point=a.points[aa],r:Point=b.points[bb-1],s:Point=b.points[bb];
      assert.ok(!(cross(p,q,r)*cross(p,q,s)<-1e-8&&cross(r,s,p)*cross(r,s,q)<-1e-8),'unrecorded crossing of unrelated graph links');
    }
  }
  return count+'/'+cycles+'/'+degrees.join(',');
}

function exteriorProof(shape:MassLandformShape):void {
  const rows=shape.foundationRows??shape.rows,n=rows.length,seen=new Uint8Array(n*n),queue=new Int32Array(n*n);
  let head=0,tail=1;queue[0]=0;seen[0]=1;
  assert.equal(rows[0][0],'.');
  while(head<tail){
    const k=queue[head++],x=k%n,y=Math.floor(k/n);
    for(const j of [x?k-1:-1,x+1<n?k+1:-1,y?k-n:-1,y+1<n?k+n:-1])
      if(j>=0&&!seen[j]&&rows[Math.floor(j/n)][j%n]==='.') {seen[j]=1;queue[tail++]=j;}
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(rows[y][x]==='.')
    assert.equal(seen[y*n+x],1,shape.id+' transparent pocket must connect to actual exterior');
}
/** Remove chamber interiors from the raster, then discover each remaining
 * corridor component's actual incident chambers. This detects wide passages
 * meeting even when their mathematical centerlines do not cross. */
function rasterGraphProof(shape:MassLandformShape):void {
  const graph=shape.grammar!,rows=shape.foundationRows??shape.rows,n=rows.length,
    rooms=new Int16Array(n*n),seen=new Uint8Array(n*n),queue=new Int32Array(n*n);
  rooms.fill(-1);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if(!dry(rows[y][x]))continue;
    for(let i=0;i<graph.nodes.length;i++){
      const p=graph.nodes[i];if(Math.hypot(x-p.x,y-p.y)<=p.radius+.5){
        assert.equal(rooms[y*n+x],-1,'separate graph chambers must not overlap in raster');rooms[y*n+x]=i;
      }
    }
  }
  const expected=new Set(graph.edges.map(e=>[e.a,e.b].sort((a,b)=>a-b).join('/'))),actual=new Set<string>();
  for(let start=0;start<n*n;start++){
    if(seen[start]||rooms[start]>=0||!dry(rows[Math.floor(start/n)][start%n]))continue;
    const touch=new Set<number>();let head=0,tail=1;queue[0]=start;seen[start]=1;
    while(head<tail){
      const k=queue[head++],x=k%n,y=Math.floor(k/n);
      for(const j of [x?k-1:-1,x+1<n?k+1:-1,y?k-n:-1,y+1<n?k+n:-1]){
        if(j<0||!dry(rows[Math.floor(j/n)][j%n]))continue;
        if(rooms[j]>=0){touch.add(rooms[j]);continue;}
        if(!seen[j]){seen[j]=1;queue[tail++]=j;}
      }
    }
    assert.ok(touch.size<=2,shape.id+' unrecorded raster junction joins '+touch.size+' chambers');
    if(touch.size===2){const key=[...touch].sort((a,b)=>a-b).join('/');
      assert.ok(expected.has(key),shape.id+' raster has extra chamber link '+key);actual.add(key);}
  }
  assert.deepEqual([...actual].sort(),[...expected].sort(),shape.id+' graph links are represented in actual raster');
}
test('seeded topology varies beyond orientation and scale in a finite 256-source corpus',()=>{
  const policy=defaultRegionalTerrainGrammar(),rasters=new Set<string>(),terrains=new Set<string>(),outlines=new Set<string>(),
    graphs=new Set<string>(),nodeCounts=new Set<number>(),cycleCounts=new Set<number>(),children=new Set<string>();
  let produced=0,nested=0;
  for(let seed=1;seed<=256;seed++){
    const shape=generateRegionalTerrain(policy,small.shapes,seed);assert.ok(shape,'source seed '+seed+' failed to generate');produced++;
    assert.ok(Object.isFrozen(shape)&&Object.isFrozen(shape.rows),'generated source is immutable');
    const digest=massDigest(shape.rows);assert.ok(!rasters.has(digest),'exact terrain repeat at seed '+seed);rasters.add(digest);
    terrains.add(normalizedTerrain(shape));outlines.add(normalizedTerrain(shape,true));graphs.add(graphProof(shape));rasterGraphProof(shape);exteriorProof(shape);
    nodeCounts.add(shape.grammar!.nodes.length);cycleCounts.add(shape.grammar!.edges.length-shape.grammar!.nodes.length+1);
    nested+=pinnedChildren(shape);for(const c of shape.components??[])children.add(c.shape);
    assert.equal(shape.ports!.length,4);assert.equal(new Set(shape.ports!.map(p=>p.dx+'/'+p.dy)).size,4);
    for(const port of shape.ports!)for(let side=-1;side<=1;side++)
      assert.equal(shape.rows[port.y+port.dy+port.dx*side]?.[port.x+port.dx-port.dy*side],'.','each port contacts three real substrate cells');
    {const body=bodyRoutes(shape);assert.equal(body.reached,body.total,'seed '+seed+' isolated body-width interior');
      for(const p of shape.navigation!)assert.ok(body.seen[(p.y*2+1)*body.N+p.x*2+1],'seed '+seed+' inaccessible route terminal');}
    if(seed<=8)assert.equal(canonical(generateRegionalTerrain(copy(policy),copy(small.shapes),seed)),canonical(shape),'saved source inputs reproduce exact geometry');
  }
  console.log(JSON.stringify({corpus:produced,exactRasters:rasters.size,normalizedTerrains:terrains.size,normalizedOutlines:outlines.size,
    graphSignatures:graphs.size,nodeCounts:[...nodeCounts].sort(),cycleCounts:[...cycleCounts].sort(),nested,childSources:[...children].sort()}));
  assert.equal(terrains.size,produced,'no canonical terrain repeats after scale and square symmetries');
  assert.ok(outlines.size>=produced*.95,'most silhouette variation survives scale and square symmetries');
  assert.ok(graphs.size>=12&&nodeCounts.size>=4&&cycleCounts.size>=3,'variation changes connectivity, not merely raster decoration');
  assert.ok(nested>=8&&children.size>=2,'complete native discoveries occur across the corpus');
});

test('saved construction ranges control topology, physical extent, material and nested-content budget',()=>{
  const base=defaultRegionalTerrainGrammar(),fixed={...copy(base),extent:[6000,6000] as const,nodes:[6,6] as const,
    extraLinks:[0,0] as const,corridor:[90,90] as const,maxChildren:0};
  for(const material of [0,1]){
    const shape=generateRegionalTerrain({...fixed,waterChance:[material,material]},small.shapes,713);assert.ok(shape);
    assert.equal(shape.params.extent,6000);assert.equal(shape.grammar!.nodes.length,6);assert.equal(shape.grammar!.edges.length,5);
    assert.equal(shape.components?.length,0);assert.ok(shape.rows.some(row=>row.includes(material?'w':'b')));
    assert.equal(shape.rows.some(row=>row.includes(material?'b':'w')),false,'pinned material choice owns all generated shoulders');
    graphProof(shape);rasterGraphProof(shape);exteriorProof(shape);
    const body=bodyRoutes(shape);assert.equal(body.reached,body.total);
  }
});
test('new regional grammar survives signed coordinates, reordered requests and cache eviction',()=>{
  const spec=flat(),g=gen(spec),points=[at(4800,4800),at(-4800,-4800),
    address('surface','9007199254741005','-9007199254741015',0,0,960)];
  const before=points.map(q=>{const p=g.landforms!.regionalLandforms!.formationAt(q);assert.ok(p?.shape.grammar);return canonical(p);});
  assert.equal(new Set(points.map(q=>g.landforms!.regionalLandforms!.formationAt(q)!.id)).size,3);
  for(let i=0;i<25;i++)g.landforms!.regionalLandforms!.formationAt(at(4800+i*9600,4800));
  assert.ok(g.landforms!.regionalLandforms!.stats.cached<=16,'source cache remains bounded');
  assert.deepEqual(points.map(q=>canonical(g.landforms!.regionalLandforms!.formationAt(q))),before);
  const fresh=gen(copy(spec));assert.deepEqual([...points].reverse().map(q=>canonical(fresh.landforms!.regionalLandforms!.formationAt(q))),[...before].reverse());
  for(const coordinate of ['-9223372036854775808','9223372036854775807']){
    const q=address('surface',coordinate,coordinate,0,0,960);assert.doesNotThrow(()=>g.landforms!.regionalLandforms!.formationAt(q));
  }
});

test('new source cells agree across cold collision, streamed pages and unchanged terrain state',()=>{
  const g=gen(flat()),p=g.landforms!.regionalLandforms!.formationAt(at(4800,4800))!;assert.ok(p?.shape.grammar);
  const samples:MassAddress[]=[],chunks=new Set<string>();
  for(let y=0;y<p.shape.rows.length;y++)for(let x=0;x<p.shape.rows.length;x++){
    if(p.shape.rows[y][x]==='.')continue;
    const q=moveAddress(p.origin,{x:(x+.5)*30,y:(y+.5)*30},960),key=cellKey(q);
    if(!chunks.has(key)&&samples.length<8)samples.push(q);chunks.add(key);
  }
  assert.ok(chunks.size>=12,'single generated source spans many streamed address chunks');assert.equal(samples.length,8);
  const state=new MassState(g.run,30),stream=new MassStream(g,state,{maxPages:8,maxSamples:8192});
  const expected=samples.map(q=>canonical(g.terrainAt(q)));stream.request(samples);while(stream.stats.pending)stream.step(311);
  for(let i=0;i<samples.length;i++){
    const q=samples[i],page=stream.page(q)!;assert.ok(page);
    const index=Math.floor(q.y/30)*page.cols+Math.floor(q.x/30);
    assert.equal(canonical(page.samples[index]),expected[i]);
  }
  assert.equal(state.snapshot().terrain.length,0,'source geometry does not become mutable terrain edits');
});

const circleCellDistance=(x:number,y:number,cx:number,cy:number)=>Math.hypot(
  Math.max(cx*30-x,0,x-(cx+1)*30),Math.max(cy*30-y,0,y-(cy+1)*30));

test('real seeded country admits varied grammar, complete children and protected native sites together',()=>{
  const recipes=new Set<string>(),graphSignatures=new Set<string>(),rasters=new Set<string>(),childSources=new Set<string>();
  let generated=0,remembered=0,nested=0,protectedSites=0,protectedIntersections=0,unowned=0;
  const summary:unknown[]=[];
  for(const seed of [42,713,991]){
    const regionalLayersHistorical=copy(massAdventure());delete regionalLayersHistorical.terrain.regionalDiscoveries;delete regionalLayersHistorical.terrain.nativeRegional;
    regionalLayersHistorical.terrain.landforms!.regional!.composition=copy(defaultRegionalTerrainGrammar());
    const config=reserveMassOpening(seed,'terrain-variation-proof',regionalLayersHistorical),g=gen(config.terrain,seed),times:number[]=[];
    const cells=Array.from({length:64},(_,i)=>[i%8-4,Math.floor(i/8)-4]);
    if(seed===42)cells.push([-7,-3]); // Complete native pool plus grove regression outside the survey square.
    for(const [x,y] of cells){
      const started=performance.now(),p=g.landforms!.regionalLandforms!.formationAt(at(x*9600+4800,y*9600+4800));times.push(performance.now()-started);
      if(!p)continue;if(!p.shape.grammar){remembered++;continue;}
      generated++;recipes.add(p.recipe.id);graphSignatures.add(graphProof(p.shape));
      for(let yy=0;yy<p.shape.rows.length;yy++)for(let xx=0;xx<p.shape.rows.length;xx++)
        if(p.shape.rows[yy][xx]!=='.')assert.equal(p.regionalTerrainFootprint?.[yy][xx],'#','final paint including site expansions remains reserved');
      const hash=massDigest(p.shape.rows);assert.ok(!rasters.has(hash),'real-country exact repeated grammar geometry');rasters.add(hash);
      nested+=pinnedChildren(p.shape);for(const c of p.shape.components??[])childSources.add(c.shape);
      const route=bodyRoutes(p.shape);assert.equal(route.reached,route.total,p.id+' must retain body-wide dry routes after site composition');
      const n=p.shape.rows.length,places=new Map<string,ReturnType<typeof g.placesInCell>[number]>(),
        lo=p.origin,hi=moveAddress(lo,{x:n*30,y:n*30},960);
      for(let cy=BigInt(lo.cy);cy<=BigInt(hi.cy);cy++)for(let cx=BigInt(lo.cx);cx<=BigInt(hi.cx);cx++)
        for(const place of g.placesInCell({dimension:'surface',cx:cx.toString(),cy:cy.toString()}))
          if(!g.spec.places.find(r=>r.id===place.recipe)?.landformHabitat)places.set(place.id,place);
      for(const place of places.values()){
        const q=localOffset(place.center,p.origin,960),r=place.radius;let hit=0,ownedHole=false;
        for(let yy=Math.max(0,Math.floor((q.y-r)/30));yy<Math.min(n,Math.ceil((q.y+r)/30));yy++)
          for(let xx=Math.max(0,Math.floor((q.x-r)/30));xx<Math.min(n,Math.ceil((q.x+r)/30));xx++)
            if(circleCellDistance(q.x,q.y,xx,yy)<=r){
              assert.equal(p.shape.rows[yy][xx],'.',place.recipe+' whole protected footprint');hit++;
              if(!ownedHole&&p.regionalTerrainFootprint?.[yy][xx]==='#'){
                ownedHole=true;const sample=moveAddress(p.origin,{x:(xx+.5)*30,y:(yy+.5)*30},960);
                assert.equal(g.landforms!.regionalLandforms!.reserves(sample,15),true,'site-cut source hole retains reservation');
              }
            }
        if(hit)protectedSites++;if(ownedHole)protectedIntersections++;
      }
      for(let yy=4;yy<n-4;yy+=9)for(let xx=4;xx<n-4;xx+=9){
        if(p.shape.rows[yy][xx]!=='.')continue;
        const q=moveAddress(p.origin,{x:(xx+.5)*30,y:(yy+.5)*30},960);
        if(!g.landforms!.regionalLandforms!.reserves(q,15))unowned++;
      }
    }
    times.sort((a,b)=>a-b);const measured=g.landforms!.regionalLandforms!.stats;
    assert.ok(measured.seats<=measured.attempts*4);assert.ok(measured.baseReads<=measured.seats*38);
    summary.push({seed,...measured,coldP95Ms:Math.round(times[Math.floor(times.length*.95)]),coldMaxMs:Math.round(times[times.length-1])});
  }
  console.log(JSON.stringify({candidateCells:193,generated,remembered,nested,protectedSites,protectedIntersections,unowned,recipes:[...recipes],
    graphSignatures:graphSignatures.size,childSources:[...childSources],stats:summary}));
  assert.ok(generated>=8,'grammar must occur in real noise country');assert.ok(remembered>=1,'authored landmarks remain a distinct option');
  assert.ok(recipes.size>=3&&graphSignatures.size>=5,'climates admit materially different topology');
  assert.ok(nested>=2&&childSources.size>=2&&protectedIntersections>=1,'actual native content coexists with composed regional terrain');
  assert.ok(unowned>=20,'ordinary content can use exterior pockets inside the former whole-rectangle reservation');
});




test('exact regional ownership releases exterior pockets while reserving routes and throat contacts',()=>{
  const spec=flat(),g=gen(spec);let pockets=0,smallWithin=0;
  for(let gy=-1;gy<=1;gy++)for(let gx=-1;gx<=1;gx++){
    const p=g.landforms!.regionalLandforms!.formationAt(at(gx*9600+4800,gy*9600+4800));assert.ok(p?.regionalTerrainFootprint);
    const n=p.shape.rows.length,mask=p.regionalTerrainFootprint;
    for(let y=4;y<n-4;y+=7)for(let x=4;x<n-4;x+=7){
      const q=moveAddress(p.origin,{x:(x+.5)*30,y:(y+.5)*30},960);
      if(mask[y][x]==='#')assert.equal(g.landforms!.regionalLandforms!.reserves(q,15),true,'interior routes remain unavailable to blocking scenery');
      else if(!g.landforms!.regionalLandforms!.reserves(q,15)){
        pockets++;assert.equal(g.landforms!.regionalLandforms!.at(q),null,'unowned outline pockets do not select regional source');
        const plan=g.landforms!.at(q);
        if(plan&&!plan.regionalExtent){
          smallWithin++;
          assert.equal(g.landforms!.regionalLandforms!.regionalTerrainIntersects(plan.origin,plan.bounds),false,'ordinary complete source fits the exact exterior mask');
        }
      }
    }
    for(const port of p.shape.ports!)for(let side=-1;side<=1;side++){
      const q=moveAddress(p.origin,{x:(port.x+.5+port.dx-port.dy*side)*30,y:(port.y+.5+port.dy+port.dx*side)*30},960);
      assert.equal(g.landforms!.regionalLandforms!.reserves(q,15),true,'outside body-wide throat is not available to scenery');
    }
  }
  console.log(JSON.stringify({unownedFlatSamples:pockets,ordinarySmallSamplesInsideRegionalEnvelope:smallWithin}));
  assert.ok(pockets>100,'sparse regional union releases substantial countryside');
  assert.ok(smallWithin>0,'small complete terrain can actually occur in regional envelope pockets');
});

test('circle and box ownership include exact tangencies from all cardinal directions',()=>{
  const rows=Array.from({length:11},(_,y)=>Array.from({length:11},(_,x)=>x===5&&y===5?'#':'.').join(''));
  const plan:MassLandformPlan={id:'mask-tangencies',origin:at(0,0),turn:0,mirror:false,
    bounds:{minX:0,minY:0,maxX:330,maxY:330},regionalTerrainFootprint:rows,
    shape:{id:'single-cell',source:'probe',builder:'probe',params:{},rows:rows.map(row=>row.replace('#','b'))},
    recipe:{id:'probe',biomes:['downs'],when:[],shapes:['single-cell'],barrier:{region:'drystone',color:'#445533'}}};
  const epsilon=.000001;
  for(const padding of [0,120])for(const radius of [0,15])for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const edge={x:dx<0?150:dx>0?180:165,y:dy<0?150:dy>0?180:165},r=radius+padding,
      point={x:edge.x+dx*r,y:edge.y+dy*r};
    assert.equal(regionalTerrainCircle(plan,point.x,point.y,radius,30,padding),true,'circle tangent '+[padding,radius,dx,dy]);
    assert.equal(regionalTerrainCircle(plan,point.x+dx*epsilon,point.y+dy*epsilon,radius,30,padding),false,'circle just beyond tangent');
    assert.equal(regionalTerrainCircle(plan,point.x-dx*epsilon,point.y-dy*epsilon,radius,30,padding),true,'circle just inside tangent');
  }
  for(const padding of [0,120])for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const edge={x:dx<0?150:dx>0?180:165,y:dy<0?150:dy>0?180:165},
      p={x:edge.x+dx*padding,y:edge.y+dy*padding},
      box={minX:dx<0?p.x-10:dx>0?p.x:160,maxX:dx<0?p.x:dx>0?p.x+10:170,
        minY:dy<0?p.y-10:dy>0?p.y:160,maxY:dy<0?p.y:dy>0?p.y+10:170};
    assert.equal(regionalTerrainBox(plan,box,30,padding),true,'box tangent '+[padding,dx,dy]);
    assert.equal(regionalTerrainBox(plan,{minX:box.minX+dx*epsilon,maxX:box.maxX+dx*epsilon,
      minY:box.minY+dy*epsilon,maxY:box.maxY+dy*epsilon},30,padding),false,'box just beyond tangent');
  }
  assert.equal(regionalTerrainCircle(plan,147,146,5,30,0),true,'exact diagonal circle tangent');
  assert.equal(regionalTerrainCircle(plan,147-epsilon,146,5,30,0),false,'outside diagonal circle tangent');
});
test('regional inland selection ignores wet exterior gaps and rejects wet owned samples',()=>{
  const spec=flat(),g=gen(spec);let course:{query:MassAddress;plan:Readonly<MassLandformPlan>;gaps:Set<string>;owned:Set<string>}|undefined;
  for(let i=0;i<16&&!course;i++){
    const query=at(i%4*9600+4800,Math.floor(i/4)*9600+4800),plan=g.landforms!.regionalLandforms!.formationAt(query);assert.ok(plan?.shape.grammar);
    const gaps=new Set<string>(),owned=new Set<string>(),size=plan.shape.rows.length*30;
    for(let y=1;y<=5;y++)for(let x=1;x<=5;x++){
      const px=size*x/6,py=size*y/6,q=moveAddress(plan.origin,{x:px,y:py},960);
      (plan.shape.rows[Math.floor(py/30)][Math.floor(px/30)]==='.'?gaps:owned).add(canonical(q));
    }
    if(gaps.size>=6&&owned.size)course={query,plan,gaps,owned};
  }
  assert.ok(course,'fixture includes enough exterior water samples to fail the historical whole-box rule');
  const terrain=(q:MassAddress,wet:ReadonlySet<string>):MassTerrain=>({region:wet.has(canonical(q))?'water':'ground',
    color:'#445533',biome:'downs',fields:{elevation:.1},source:{generator:spec.id,version:1,rule:'base',source:'probe',stream:'probe'}});
  const gaps=new MassRegionalLandforms(g.spec,g.run,q=>terrain(q,course!.gaps),()=>[]),besideLake=gaps.formationAt(course.query);
  assert.ok(besideLake?.shape.grammar);assert.equal(besideLake.shape.grammar.seed,course.plan.shape.grammar!.seed,'unowned wet samples do not reseat source');
  assert.equal(canonical(besideLake.shape.rows),canonical(course.plan.shape.rows));assert.equal(gaps.stats.water,0);
  const owned=new MassRegionalLandforms(g.spec,g.run,q=>terrain(q,course!.owned),()=>[]),onLake=owned.formationAt(course.query);
  assert.ok(owned.stats.water>=1,'wet owned samples reject the original seat');
  assert.notEqual(onLake?.shape.grammar?.seed,course.plan.shape.grammar!.seed,'only a separately admitted seat may survive');
  assert.ok(gaps.stats.baseReads<=gaps.stats.seats*38&&owned.stats.baseReads<=owned.stats.seats*38,'inland sample work stays bounded');
});
test('malformed grammar policies refuse before generation and JSON persistence pins all construction rules',()=>{
  const config=flat();assert.doesNotThrow(()=>gen(copy(config)));
  const changes:((s:any)=>void)[]=[s=>s.landforms.regional.composition=null,
    s=>s.landforms.regional.composition.source='',s=>s.landforms.regional.composition.version=2,
    s=>s.landforms.regional.composition.chance=1.01,s=>s.landforms.regional.composition.chance=-.01,
    s=>s.landforms.regional.composition.extent=[6600,3300],s=>s.landforms.regional.composition.extent=[3300,7000],
    s=>s.landforms.regional.composition.nodes=[3,10],s=>s.landforms.regional.composition.nodes=[6,11],
    s=>s.landforms.regional.composition.nodes=[6.5,9],s=>s.landforms.regional.composition.extraLinks=[0,5],
    s=>s.landforms.regional.composition.corridor=[60,150],s=>s.landforms.regional.composition.waterChance=[-.1,.75],
    s=>s.landforms.regional.composition.waterChance=[.5,.2],s=>s.landforms.regional.composition.maxChildren=5,
    s=>s.landforms.regional.composition.motifs=[],s=>s.landforms.regional.composition.motifs[0].shape='unowned-shape',
    s=>s.landforms.regional.composition.motifs[0].weight=0,
    s=>s.landforms.regional.composition.motifs.push({...s.landforms.regional.composition.motifs[0]})];
  for(const change of changes){const spec=copy(config);change(spec);assert.throws(()=>gen(spec),/Invalid regional terrain grammar/);}
  for(const seed of [-1,.25,0x100000000,NaN])assert.equal(generateRegionalTerrain(defaultRegionalTerrainGrammar(),small.shapes,seed),null);
  const impossible={...defaultRegionalTerrainGrammar(),nodes:[4,4] as const,extraLinks:[2,2] as const,maxChildren:0};
  assert.equal(generateRegionalTerrain(impossible,small.shapes,713),null,'a four-room square cannot silently reduce two required cycles to one');
  const feasible={...impossible,extraLinks:[1,1] as const};
  assert.equal(generateRegionalTerrain(feasible,small.shapes,713)?.params.extraLinks,1,'feasible cycle minimum is realized');
});

test('Continue reproduces schema14 sources while schema13 omission remains historical',()=>{
  const config={terrain:flat(),theme:copy(massAdventure().theme),content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256};
  const world=makeSimWorld('warrior',861),mass=new WorldMassRuntime(713,'terrain-variation-proof',config);mass.attach(world);
  const plan=mass.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800));assert.ok(plan?.shape.grammar&&plan.regionalTerrainFootprint);
  const cell=plan.shape.rows.flatMap((r,y)=>[...r].flatMap((c,x)=>c==='b'?[{x,y}]:[]))[0];assert.ok(cell);
  const q=moveAddress(plan.origin,{x:(cell.x+.5)*30,y:(cell.y+.5)*30},960);
  world.player.pos={x:4800,y:4800};const saved=mass.snapshot(world);assert.equal(saved.schema,14);
  const resumeWorld=makeSimWorld('warrior',862),resume=new WorldMassRuntime(713,'terrain-variation-proof',saved.config,saved);resume.attach(resumeWorld,saved);
  assert.equal(canonical(resume.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800))),canonical(plan));
  assert.equal(canonical(resume.generator.terrainAt(q)),canonical(mass.generator.terrainAt(q)));
  assert.deepEqual(resumeWorld.player.pos,world.player.pos);assert.equal(saved.state.terrain.length,0);
  const downgraded=copy(saved);downgraded.schema=13;
  assert.throws(()=>new WorldMassRuntime(713,'terrain-variation-proof',downgraded.config,downgraded),/Invalid worldmass checkpoint/);
  const oldConfig={...copy(config),terrain:flat(false)},oldWorld=makeSimWorld('warrior',863),old=new WorldMassRuntime(713,'terrain-variation-proof',oldConfig);old.attach(oldWorld);
  const oldSaved=old.snapshot(oldWorld);assert.equal(oldSaved.schema,13);
  const oldResumeWorld=makeSimWorld('warrior',864),oldResume=new WorldMassRuntime(713,'terrain-variation-proof',oldSaved.config,oldSaved);oldResume.attach(oldResumeWorld,oldSaved);
  assert.equal(canonical(oldResume.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800))),canonical(old.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800))));
});
console.log(passed+' terrain variation courses passed');
