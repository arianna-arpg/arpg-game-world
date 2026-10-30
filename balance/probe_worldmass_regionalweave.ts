import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address, localOffset, moveAddress } from '../src/worldmass/address';
import type { MassSpec } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { landformCell, type MassLandformPlan, type MassLandformShape } from '../src/worldmass/landforms';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { regionalLandformPolicy } from '../src/worldmass/regionalLandformSources';
import { layeredRegionalTerrainGrammar, wovenRegionalTerrainGrammar, generateRegionalTerrain } from '../src/worldmass/regionalTerrainGrammar';
import { defaultRegionalPathWeave, regionalWovenPath, validateRegionalPathWeave, type RegionalPathWeave } from '../src/worldmass/regionalPathWeave';
import { defaultRegionalTransitions, regionalFeatherTerrain, validateRegionalTransitions } from '../src/worldmass/regionalTransitions';
import { validateRegionalTerrainWeave } from '../src/worldmass/regionalWeave';
import { sculptedRegionalCourtMorphology, validateRegionalCourtMorphology } from '../src/worldmass/regionalCourtShapes';
import { canonical, massDigest } from '../src/worldmass/random';
import { massAdventure } from '../src/worldmass/preset';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { WorldMassRuntime } from '../src/worldmass/runtime';

void makeSimWorld;
const copy=<T>(value:T):T=>JSON.parse(canonical(value));
const small=massLandformPolicy();
const at=(x:number,y:number)=>address('surface','0','0',x,y,960);
const dry=(c:string|undefined)=>c==='g'||c==='c';
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}

// Captured from schema15 BEFORE path-weave and sculpted-court edits.
test('omitted weave preserves every historical schema15 source identity',()=>{
  const policy=layeredRegionalTerrainGrammar();assert.equal(massDigest(policy),'82623228e789c6ea');
  assert.equal(massDigest(Array.from({length:256},(_,i)=>massDigest(generateRegionalTerrain(policy,small.shapes,i+1)))),'fe9f70e216a29f99');
});

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

function pinnedChildren(shape:MassLandformShape):number {
  const shaped=shape.grammar?.nodes.some(n=>n.court&&n.court.family!=='circle'),occupiedSupports=new Set<string>();
  let count=0;
  for(const child of shape.components??[]){
    const source=small.shapes.find(s=>s.id===child.shape);assert.ok(source,child.shape+' saved native source');assert.equal(child.size,source.rows.length);
    let validSupport:Set<string>|undefined;
    for(const mirror of [false,true])for(let turn=0;turn<4;turn++){
      const pose={shape:source,turn,mirror} as MassLandformPlan;let valid=true;
      const support=new Set<string>();
      for(let y=0;y<child.size;y++)for(let x=0;x<child.size;x++){
        const expected=landformCell(pose,x,y),actual=shape.rows[child.y+y]?.[child.x+x];
        if(expected!=='.'){
          if(expected!==actual)valid=false;
          for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)support.add((x+dx)+','+(y+dy));
        }else if(!shaped&&!dry(actual))valid=false;
      }
      if(shaped)for(const cell of support){
        const [x,y]=cell.split(',').map(Number),expected=landformCell(pose,x,y),actual=shape.rows[child.y+y]?.[child.x+x];
        if(expected==='.'&&actual!=='g')valid=false;
        if(shape.foundationRows?.[child.y+y]?.[child.x+x]!=='g')valid=false;
      }
      else for(let d=-1;d<=child.size;d++)for(const [x,y] of [[-1,d],[child.size,d],[d,-1],[d,child.size]])if(!dry(shape.rows[child.y+y]?.[child.x+x]))valid=false;
      if(valid)validSupport=support;
    }
    assert.ok(validSupport,shape.id+' retains every occupied '+child.shape+' cell and its complete dry support feather');
    if(shaped)for(const cell of validSupport){const [x,y]=cell.split(',').map(Number),key=(x+child.x)+','+(y+child.y);
      assert.ok(!occupiedSupports.has(key),'nested child support feathers do not overlap');occupiedSupports.add(key);}
    count++;
  }
  return count;
}


test('all path styles have bounded monotone geometry, exact reversed replay and independently varying shapes',()=>{
  const base=defaultRegionalPathWeave(),styles=['direct','meander','switchback','elbow','sweep'] as const,prints=new Set<string>();
  let checked=0;
  for(const style of styles)for(let seed=1;seed<=24;seed++)for(const [start,end] of [
    [{x:0,y:0},{x:100,y:0}],[{x:17,y:-63},{x:17,y:57}],[{x:-22,y:31},{x:68,y:81}]] as const){
    const policy:RegionalPathWeave={...copy(base),styles:[{style,weight:1}]},gap=100,
      path=regionalWovenPath(policy,seed,0,0,start,end,gap),reverse=regionalWovenPath(copy(policy),seed,0,0,end,start,gap);
    assert.equal(path.style,style);assert.deepEqual(path.points[0],start);assert.deepEqual(path.points[path.points.length-1],end);
    assert.deepEqual([...path.points].reverse(),reverse.points,'the same undirected link must not change when its endpoints reverse');
    assert.equal(canonical(regionalWovenPath(copy(policy),seed,0,0,copy(start),copy(end),gap)),canonical(path));
    assert.ok(Object.isFrozen(path)&&Object.isFrozen(path.points));
    const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);let previous=-Infinity,maxDeviation=0;
    for(const point of path.points){
      assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
      const progress=((point.x-start.x)*dx+(point.y-start.y)*dy)/(length*length),
        deviation=Math.abs((point.x-start.x)*dy-(point.y-start.y)*dx)/length;
      assert.ok(progress>=-1e-9&&progress<=1+1e-9&&progress>=previous-1e-9,'path advances along its own reserved link');previous=progress;
      assert.ok(deviation<=.22*gap+1e-8,'path remains inside its admitted lateral envelope');maxDeviation=Math.max(maxDeviation,deviation);
    }
    if(style==='direct')assert.ok(maxDeviation<1e-8);else assert.ok(maxDeviation>1,'non-direct style must change actual geometry');
    prints.add(canonical(path.points.map(p=>[Math.round(p.x*100)/100,Math.round(p.y*100)/100])));checked++;
  }
  assert.equal(checked,360);assert.ok(prints.size>=280,'saved path rules yield genuinely distinct polylines');
  console.log(JSON.stringify({pathProofs:checked,distinctPolylines:prints.size}));
});

function exposedWinding(shape:MassLandformShape):{edges:number;bent:number;max:number}{
  const graph=shape.grammar!;let edges=0,bent=0,max=0;
  for(const edge of graph.edges){
    const start=graph.nodes[edge.a],end=graph.nodes[edge.b],dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
    let deviation=0,exposed=false;
    for(let k=1;k<edge.points.length;k++){
      const a=edge.points[k-1],b=edge.points[k],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2));
      for(let j=0;j<=steps;j++){
        const x=a.x+(b.x-a.x)*j/steps,y=a.y+(b.y-a.y)*j/steps;
        assert.ok(dry((shape.foundationRows??shape.rows)[Math.round(y)]?.[Math.round(x)]),'recorded link follows actual original dry terrain');
        if(graph.nodes.some(n=>Math.hypot(x-n.x,y-n.y)<=n.radius+.5))continue;
        exposed=true;deviation=Math.max(deviation,Math.abs((x-start.x)*dy-(y-start.y)*dx)/length);
      }
    }
    if(exposed){edges++;if(deviation>1)bent++;max=Math.max(max,deviation);}
  }
  return {edges,bent,max};
}

test('woven sources change playable paths outside courts while preserving native cells, topology and body routes',()=>{
  const policy=wovenRegionalTerrainGrammar(),terrains=new Set<string>(),outlines=new Set<string>(),families=new Set<string>();
  let children=0,exposed=0,bent=0,maxDeviation=0;
  for(let seed=1;seed<=128;seed++){
    const shape=generateRegionalTerrain(policy,small.shapes,seed);assert.ok(shape,'woven source '+seed);
    assert.ok(Object.isFrozen(shape)&&Object.isFrozen(shape.rows)&&Object.isFrozen(shape.grammar));
    const fingerprint=normalizedTerrain(shape);assert.ok(!terrains.has(fingerprint),'repeat after translation, D4 symmetry and scale');terrains.add(fingerprint);
    outlines.add(normalizedTerrain(shape,true));for(const node of shape.grammar!.nodes)families.add(node.court!.family);
    rasterGraphProof(shape);exteriorProof(shape);children+=pinnedChildren(shape);
    const body=bodyRoutes(shape);assert.equal(body.reached,body.total,'woven source '+seed+' disconnected body-width floor');
    for(const point of shape.navigation!)assert.ok(body.seen[(point.y*2+1)*body.N+point.x*2+1],'woven terminal reachable');
    for(const port of shape.ports!)for(let side=-1;side<=1;side++)
      assert.equal(shape.rows[port.y+port.dy+port.dx*side]?.[port.x+port.dx-port.dy*side],'.','three actual exterior contacts remain open');
    const wind=exposedWinding(shape);exposed+=wind.edges;bent+=wind.bent;maxDeviation=Math.max(maxDeviation,wind.max);
    if(seed<=8)assert.equal(canonical(generateRegionalTerrain(copy(policy),copy(small.shapes),seed)),canonical(shape),'saved weave reproduces exact source');
  }
  assert.equal(terrains.size,128);assert.ok(outlines.size>=120);assert.ok(families.size>=12,'new and familiar courts both appear');
  assert.ok(children>=10,'nested native motifs still compose through the changed courts and paths');
  assert.ok(exposed>=200&&bent>=exposed*.5,'most actual inter-court links vary outside circular court envelopes');
  assert.ok(maxDeviation>=4,'at least one exposed path visibly deviates by four cells');
  console.log(JSON.stringify({wovenSources:128,normalizedTerrains:terrains.size,normalizedOutlines:outlines.size,courtFamilies:families.size,
    nativeChildren:children,exposedEdges:exposed,bentExposedEdges:bent,maxExposedDeviationCells:maxDeviation}));
});

function flat():MassSpec {
  const regional=copy(regionalLandformPolicy()),source=regional.shapes.find(s=>s.builder==='cloister_walk'&&s.params.extent===6600)!;
  return {id:'regional-weave-proof',version:1,addressSpan:960,terrainCell:30,
    fields:[{id:'elevation',base:.1,layers:[]}],surfaces:[{id:'base',when:[],priority:0,region:'ground',color:'#445533',biome:'downs'}],places:[],
    landforms:{...copy(small),chance:1,regional:{...regional,chance:1,jitter:0,shapes:[source],composition:{...copy(wovenRegionalTerrainGrammar()),chance:1},
      recipes:[{id:'weave-course',biomes:['downs'],when:[],shapes:[source.id],barrier:{region:'drystone',color:'#595345'}}]}}};
}
const gen=(spec:MassSpec,seed=713)=>new MassGenerator(makeMassRun(seed,'regional-weave-proof',spec),spec);

test('woven plans and terrain retain exact JSON, reverse order, cache eviction and far signed identities',()=>{
  const spec=flat(),g=gen(spec),points=[at(4800,4800),at(-4800,-4800),address('surface','9007199254741005','-9007199254741015',0,0,960)];
  const plans=points.map(q=>{const p=g.landforms!.regionalLandforms!.formationAt(q);assert.ok(p?.shape.grammar);return p;}),before=plans.map(p=>canonical(p)),
    samples=plans.map(p=>moveAddress(p.origin,{x:(p.shape.navigation![0].x+.5)*30,y:(p.shape.navigation![0].y+.5)*30},960)),terrain=samples.map(q=>canonical(g.terrainAt(q)));
  for(let i=0;i<25;i++)g.landforms!.regionalLandforms!.formationAt(at(4800+i*9600,4800));
  assert.ok(g.landforms!.regionalLandforms!.stats.cached<=16);assert.deepEqual(points.map(q=>canonical(g.landforms!.regionalLandforms!.formationAt(q))),before);
  assert.deepEqual(samples.map(q=>canonical(g.terrainAt(q))),terrain);
  const cold=gen(copy(spec));assert.deepEqual([...points].reverse().map(q=>canonical(cold.landforms!.regionalLandforms!.formationAt(q))),[...before].reverse());
  for(const coordinate of ['-9223372036854775808','9223372036854775807'])assert.doesNotThrow(()=>g.landforms!.regionalLandforms!.formationAt(address('surface',coordinate,coordinate,0,0,960)));
});

test('saved path vocabulary rejects malformed ranges, unknown styles and invalid geometric inputs',()=>{
  const edits:((p:any)=>void)[]=[p=>p.source='',p=>p.version=2,p=>p.styles=[],p=>p.styles[0].style='zigzag_stamp',p=>p.styles[0].weight=0,
    p=>p.styles.push({...p.styles[0]}),p=>p.amplitude=[.03,.22],p=>p.amplitude=[.12,.23],p=>p.amplitude=[.2,.1],
    p=>p.turns=[1,4],p=>p.turns=[1.5,2],p=>p.samples=[11,32],p=>p.samples=[12,33],p=>p.taper=[.11,.3],p=>p.taper=[.3,.2]];
  for(const edit of edits){const policy=copy(defaultRegionalPathWeave());edit(policy);assert.throws(()=>validateRegionalPathWeave(policy),/path weave/);}
  const path=defaultRegionalPathWeave();
  for(const gap of [0,-1,NaN,4097])assert.throws(()=>regionalWovenPath(path,42,0,0,{x:0,y:0},{x:100,y:0},gap));
  for(const seed of [-1,.5,0x100000000])assert.throws(()=>regionalWovenPath(path,seed,0,0,{x:0,y:0},{x:100,y:0},100));
  assert.throws(()=>regionalWovenPath(path,42,0,0,{x:0,y:0},{x:0,y:0},100),/separate endpoints/);
});

test('schema16 Continue retains woven terrain while historical schema15 remains readable',()=>{
  const config={terrain:flat(),theme:copy(massAdventure().theme),content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256};
  const world=makeSimWorld('warrior',16200),mass=new WorldMassRuntime(713,'regional-weave-proof',config);mass.attach(world);
  const plan=mass.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800));assert.ok(plan);
  const stand=plan.shape.navigation![4]??plan.shape.navigation![0];
  world.landPartyAt(localOffset(moveAddress(plan.origin,{x:(stand.x+.5)*30,y:(stand.y+.5)*30},960),{...mass.origin,x:0,y:0},960));const saved=mass.snapshot(world);assert.equal(saved.schema,16);
  const next=makeSimWorld('warrior',16201),resume=new WorldMassRuntime(713,'regional-weave-proof',saved.config,saved);resume.attach(next,saved);
  assert.equal(canonical(resume.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800))),canonical(plan));assert.deepEqual(next.player.pos,world.player.pos);
  const wrong=copy(saved);wrong.schema=15;assert.throws(()=>new WorldMassRuntime(713,'regional-weave-proof',wrong.config,wrong),/Invalid worldmass checkpoint/);
  const oldConfig=copy(config);oldConfig.terrain.landforms!.regional!.composition=layeredRegionalTerrainGrammar();
  const oldWorld=makeSimWorld('warrior',16202),old=new WorldMassRuntime(713,'regional-weave-old',oldConfig);old.attach(oldWorld);const prior=old.snapshot(oldWorld);assert.equal(prior.schema,15);
  const oldNext=makeSimWorld('warrior',16203),oldResume=new WorldMassRuntime(713,'regional-weave-old',prior.config,prior);oldResume.attach(oldNext,prior);
  assert.equal(canonical(oldResume.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800))),canonical(old.generator.landforms!.regionalLandforms!.formationAt(at(4800,4800))));
});

test('coherent transition fringes preserve native terrain, dry routes and contacts while changing the owned outline',()=>{
  const old={...copy(layeredRegionalTerrainGrammar()),maxChildren:0},shape=generateRegionalTerrain(old,small.shapes,42)!;
  const rows=shape.foundationRows!,ports=shape.ports!,policy=defaultRegionalTransitions(),n=rows.length,prints=new Set<string>();let totalAdded=0;
  const before=canonical(rows);
  for(let seed=1;seed<=24;seed++){
    const result=regionalFeatherTerrain(rows,ports,policy,seed,0);assert.ok(Object.isFrozen(result));
    assert.equal(canonical(regionalFeatherTerrain(copy(rows),copy(ports),copy(policy),seed,0)),canonical(result));prints.add(massDigest(result));
    const distances=new Int16Array(n*n),queue=new Int32Array(n*n);distances.fill(-1);let head=0,tail=0,added=0;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const c=rows[y][x],next=result[y][x],k=y*n+x;
      if(c!=='.')assert.equal(next,c,'fringes never overwrite any original native cell');
      if(c==='b'||c==='w'){distances[k]=0;queue[tail++]=k;}
      if(c!==next){assert.equal(c,'.');assert.ok(next==='b'||next==='w');added++;}
      if(x===0||y===0||x===n-1||y===n-1)assert.equal(next,c,'outer source boundary remains transparent');
    }
    while(head<tail){const k=queue[head++],x=k%n,y=Math.floor(k/n);
      for(const j of [x?k-1:-1,x+1<n?k+1:-1,y?k-n:-1,y+1<n?k+n:-1])if(j>=0&&distances[j]<0&&result[Math.floor(j/n)][j%n]===result[y][x]){
        distances[j]=distances[k]+1;queue[tail++]=j;}
    }
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(rows[y][x]!==result[y][x])
      assert.ok(distances[y*n+x]>0&&distances[y*n+x]<=policy.width[1],'every new shoulder cell has a bounded connected same-material ancestry');
    for(const p of ports)for(let side=-1;side<=1;side++)assert.equal(result[p.y+p.dy+p.dx*side]?.[p.x+p.dx-p.dy*side],'.');
    assert.ok(added>100,'saved transition settings change a substantial source outline');totalAdded+=added;
    const proof=bodyRoutes({...shape,rows:result});assert.equal(proof.reached,proof.total,'transitions cannot sever original body paths');
  }
  assert.equal(canonical(rows),before);assert.equal(prints.size,24,'edge variation comes from seeded coherent fields');
  assert.deepEqual(regionalFeatherTerrain(rows,ports,{...policy,width:[0,0]},42,0),rows,'zero transition width is a true omission');
  console.log(JSON.stringify({transitionVariants:prints.size,addedShoulderCells:totalAdded}));
});

test('saved weave and sculpted court vocabularies reject unsupported versions and unsafe settings',()=>{
  const morphology=sculptedRegionalCourtMorphology();assert.doesNotThrow(()=>validateRegionalCourtMorphology(morphology));
  assert.throws(()=>validateRegionalCourtMorphology({...copy(morphology),version:1}),/morphology/,'new shape families cannot masquerade as schema15 data');
  const edits:((w:any)=>void)[]=[w=>w.source='',w=>w.version=2,w=>w.nodeJitter=.11,w=>w.nodeJitter=-.01,w=>w.courtScale=[.64,1],w=>w.courtScale=[1,.8],
    w=>w.broadChance=1.01,w=>w.paths.amplitude=[.2,.3],w=>w.transitions.width=[0,9],w=>w.transitions.wavelength=[3,20]];
  for(const edit of edits){const grammar=copy(wovenRegionalTerrainGrammar());edit(grammar.weave);
    assert.throws(()=>validateRegionalTerrainWeave(grammar.weave!),/regional/);
    const spec=flat();spec.landforms!.regional!.composition=grammar;assert.throws(()=>gen(spec),/regional/);}
  for(const width of [[-1,2],[2,1],[0,8.5]])assert.throws(()=>validateRegionalTransitions({...defaultRegionalTransitions(),width:width as [number,number]}),/transitions/);
});

test('real climate country preserves protected native sites, complete motifs and discovery approaches through woven formations',()=>{
  let candidates=0,formations=0,nested=0,discoveries=0,protectedCells=0;const recipes=new Set<string>(),styles=new Set<string>(),times:number[]=[];
  for(const seed of [42,713]){
    const base=copy(massAdventure());Reflect.deleteProperty(base.terrain,'nativeRegional');
    const config=reserveMassOpening(seed,'regional-weave-proof',base),g=gen(config.terrain,seed);
    for(let y=-4;y<4;y++)for(let x=-4;x<4;x++){
      candidates++;const started=performance.now(),plan=g.landforms!.regionalLandforms!.formationAt(at(x*9600+4800,y*9600+4800));times.push(performance.now()-started);
      if(!plan?.shape.grammar)continue;formations++;recipes.add(plan.recipe.id);nested+=pinnedChildren(plan.shape);
      for(const edge of plan.shape.grammar.edges)styles.add((edge as {style?:string}).style??'historical');
      const body=bodyRoutes(plan.shape);assert.equal(body.reached,body.total,'real native holes and children preserve body-width routes');
      for(const point of plan.shape.navigation!)assert.ok(body.seen[(point.y*2+1)*body.N+point.x*2+1],'real terminal remains reachable');
      const n=plan.shape.rows.length,lo=plan.origin,hi=moveAddress(lo,{x:n*30,y:n*30},960),sites=new Map<string,ReturnType<typeof g.placesInCell>[number]>();
      for(let cy=BigInt(lo.cy);cy<=BigInt(hi.cy);cy++)for(let cx=BigInt(lo.cx);cx<=BigInt(hi.cx);cx++)
        for(const site of g.placesInCell({dimension:'surface',cx:cx.toString(),cy:cy.toString()}))
          if(!g.spec.places.find(p=>p.id===site.recipe)?.landformHabitat)sites.set(site.id,site);
      for(const site of sites.values()){
        const p=localOffset(site.center,plan.origin,960),r=site.radius;
        for(let yy=Math.max(0,Math.floor((p.y-r)/30));yy<Math.min(n,Math.ceil((p.y+r)/30));yy++)
          for(let xx=Math.max(0,Math.floor((p.x-r)/30));xx<Math.min(n,Math.ceil((p.x+r)/30));xx++){
            const dx=Math.max(xx*30-p.x,0,p.x-(xx+1)*30),dy=Math.max(yy*30-p.y,0,p.y-(yy+1)*30);
            if(dx*dx+dy*dy>r*r)continue;assert.equal(plan.shape.rows[yy][xx],'.','weave and fringe preserve complete authored site footprint');protectedCells++;
          }
      }
      for(const place of g.regionalDiscoveries!.forPlan(plan)){
        const p=localOffset(place.center,plan.origin,960),r=place.radius+config.terrain.regionalDiscoveries!.clearance;discoveries++;
        for(let yy=Math.floor((p.y-r)/30);yy<=Math.floor((p.y+r)/30);yy++)for(let xx=Math.floor((p.x-r)/30);xx<=Math.floor((p.x+r)/30);xx++){
          const dx=Math.max(xx*30-p.x,0,p.x-(xx+1)*30),dy=Math.max(yy*30-p.y,0,p.y-(yy+1)*30);
          if(dx*dx+dy*dy<=r*r)assert.equal(plan.shape.rows[yy]?.[xx],'g','native discovery retains its complete terrain-cleared approach');
        }
        assert.equal(g.regionalPlacesInCell(place.center).filter(p=>p.id===place.id).length,1);
      }
    }
  }
  times.sort((a,b)=>a-b);console.log(JSON.stringify({realCandidates:candidates,wovenFormations:formations,nativeChildren:nested,discoveries,protectedCells,
    recipes:[...recipes],styles:[...styles],coldP95Ms:Math.round(times[Math.floor(times.length*.95)]),coldMaxMs:Math.round(times[times.length-1])}));
  assert.ok(formations>=4&&discoveries>=6&&protectedCells>=100,'new woven terrain and native content must actually coexist in climate country');
  assert.ok(recipes.size>=2&&styles.size>=4,'real countries contain different materials and path styles');
});

/** Independent shortest body-clear traversal outside the entire court union.
 * Eight-neighbor steps are allowed only with both orthogonal stands clear, so
 * diagonal corner cuts cannot artificially shorten the path. The chord uses
 * the closest two terminal sets and is a lower bound for any connecting walk. */
function traversalDetours(shape:MassLandformShape):{style:string;ratio:number;length:number;chord:number}[]{
 const rows=shape.foundationRows!,n=rows.length,N=n*2,graph=shape.grammar!,stand=new Uint8Array(N*N),room=new Int16Array(N*N),seen=new Uint8Array(N*N);room.fill(-1);
 const dry=(c:string|undefined)=>c==='g'||c==='c';
 for(let y=1;y<N;y++)for(let x=1;x<N;x++){
  let safe=true;
  for(let yy=Math.floor((y-1)/2);yy<=Math.floor((y+1)/2)&&safe;yy++)for(let xx=Math.floor((x-1)/2);xx<=Math.floor((x+1)/2);xx++){
   const dx=Math.max(xx*2-x,0,x-(xx+1)*2),dy=Math.max(yy*2-y,0,y-(yy+1)*2);
   if(dx*dx+dy*dy<1-1e-8&&!dry(rows[yy]?.[xx])){safe=false;break;}
  }
  if(!safe)continue;const k=y*N+x;stand[k]=1;
  for(let i=0;i<graph.nodes.length;i++){const q=graph.nodes[i];if(Math.hypot(x/2-.5-q.x,y/2-.5-q.y)<=q.radius+.5){room[k]=i;break;}}
 }
 const results:{style:string;ratio:number;length:number;chord:number}[]=[];
 for(let start=0;start<stand.length;start++){
  if(seen[start]||!stand[start]||room[start]>=0)continue;
  const list=[start],ends=new Map<number,Set<number>>();seen[start]=1;
  for(let head=0;head<list.length;head++){
   const k=list[head],x=k%N,y=Math.floor(k/N);
   for(const j of [x?k-1:-1,x+1<N?k+1:-1,y?k-N:-1,y+1<N?k+N:-1]){
    if(j<0||!stand[j])continue;
    if(room[j]>=0){if(!ends.has(room[j]))ends.set(room[j],new Set());ends.get(room[j])!.add(k);continue;}
    if(!seen[j]){seen[j]=1;list.push(j);}
   }
  }
  if(ends.size!==2)continue;const [a,b]=[...ends.keys()],aa=[...ends.get(a)!],bb=[...ends.get(b)!],edge=graph.edges.find((e)=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));if(!edge)throw Error('extra');
  const allowed=new Set(list),targets=new Set(bb),dist=new Map<number,number>(),heap:{k:number,d:number}[]=[];
  const push=(row:{k:number,d:number})=>{heap.push(row);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].d<=row.d)break;heap[i]=heap[p];i=p;}heap[i]=row;};
  const pop=()=>{const row=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].d<heap[c].d)c++;if(heap[c].d>=last.d)break;heap[i]=heap[c];i=c;}heap[i]=last;}return row;};
  for(const k of aa){dist.set(k,0);push({k,d:0});}
  let best=Infinity;
  while(heap.length){const {k,d}=pop();if(d!==dist.get(k))continue;if(targets.has(k)){best=d;break;}
   const x=k%N,y=Math.floor(k/N);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy,j=yy*N+xx;if(xx<0||xx>=N||yy<0||yy>=N||!allowed.has(j))continue;
    if(dx&&dy&&(!allowed.has(y*N+xx)||!allowed.has(yy*N+x)))continue;
    const nd=d+Math.hypot(dx,dy);if(nd<(dist.get(j)??Infinity)){dist.set(j,nd);push({k:j,d:nd});}
   }
  }
  let chord=Infinity;for(const p of aa)for(const q of bb)chord=Math.min(chord,Math.hypot(p%N-q%N,Math.floor(p/N)-Math.floor(q/N)));
  if(chord>4)results.push({style:edge.style??'historical',ratio:best/chord,length:best*15,chord:chord*15});
 }
 return results;
}

test('winding creates measurable actual detours after corridor widths and court interiors are removed',()=>{
  const rows:{seed:number;style:string;ratio:number;length:number;chord:number}[]=[];
  for(let seed=1;seed<=32;seed++){
    const shape=generateRegionalTerrain(wovenRegionalTerrainGrammar(),small.shapes,seed)!;assert.ok(shape);
    rows.push(...traversalDetours(shape).map(row=>({seed,...row})));
  }
  const summary=['direct','meander','switchback','elbow','sweep'].map(style=>{
    const group=rows.filter(r=>r.style===style).sort((a,b)=>a.ratio-b.ratio);assert.ok(group.length>=10);
    return {style,count:group.length,median:group[Math.floor(group.length*.5)].ratio,max:group[group.length-1].ratio,
      over115:group.filter(r=>r.ratio>=1.15).length,over150:group.filter(r=>r.ratio>=1.5).length};
  });
  assert.ok(summary.find(r=>r.style==='direct')!.max<1.1,'straight-link control measures only small raster anisotropy');
  for(const style of ['meander','switchback']){
    const row=summary.find(r=>r.style===style)!;assert.ok(row.median>1.1&&row.over115>=row.count*.35,style+' materially lengthens actual playable crossings');
  }
  assert.ok(rows.filter(r=>r.ratio>=1.5).length>=4,'some routes require substantially more travel around actual terrain');
  console.log(JSON.stringify({actualDryTraversalSummary:summary,longest:rows.reduce((a,b)=>a.ratio>b.ratio?a:b)}));
});

test('extreme saved weave bounds admit only body-clear sources with intact graph adjacency and exterior contacts',()=>{
  let attempted=0,admitted=0,refused=0;
  for(const extent of [2160,6960])for(const nodes of [4,10])for(const scale of [.65,1])for(const seed of [3,19,42,73]){
    const grammar=copy(wovenRegionalTerrainGrammar());grammar.extent=[extent,extent];grammar.nodes=[nodes,nodes];grammar.corridor=[150,150];
    Object.assign(grammar.weave!,{nodeJitter:.1,courtScale:[scale,scale]});
    Object.assign(grammar.weave!.paths,{amplitude:[.22,.22],turns:[3,3],samples:[12,12]});grammar.weave!.transitions.width=[8,8];
    attempted++;const shape=generateRegionalTerrain(grammar,small.shapes,seed);if(!shape){refused++;continue;}admitted++;
    rasterGraphProof(shape);exteriorProof(shape);pinnedChildren(shape);
    const body=bodyRoutes(shape);assert.equal(body.reached,body.total,'extreme body width '+[extent,nodes,scale,seed].join('/'));
    for(const point of shape.navigation!)assert.ok(body.seen[(point.y*2+1)*body.N+point.x*2+1],'extreme terminal remains reachable');
    for(const port of shape.ports!)for(let side=-1;side<=1;side++)assert.equal(shape.rows[port.y+port.dy+port.dx*side]?.[port.x+port.dx-port.dy*side],'.');
  }
  assert.equal(attempted,32);assert.ok(admitted>=4,'bounded extreme corpus still contains usable terrain');
  console.log(JSON.stringify({extremeWeaveAttempts:attempted,admitted,refused}));
});

test('real woven terrain nests a complete pools motif and a native cache inside that motif',()=>{
  const restore=seedGlobalRandom(16220);try{
  const base=copy(massAdventure());Reflect.deleteProperty(base.terrain,'nativeRegional');
  const config=reserveMassOpening(42,'regional-weave-proof',base),g=gen(config.terrain,42),
    plan=g.landforms!.regionalLandforms!.formationAt(at(5*9600+4800,-7*9600+4800));assert.ok(plan?.shape.grammar);
  assert.ok(pinnedChildren(plan.shape)>=1,'directed real formation retains a complete native motif and support feather');
  const body=bodyRoutes(plan.shape);assert.equal(body.reached,body.total);
  const place=g.regionalDiscoveries!.forPlan(plan).find(p=>p.regionalSocket.layer==='motif');assert.ok(place,'native discovery occurs inside the child terrain');
  const source=config.content.find(c=>c.id===place.content)!;assert.ok(source.site?.cache,'directed witness uses an actual native cache');
  const child=plan.shape.components!.find(c=>c.shape===place.regionalSocket.feature)!;assert.ok(child);
  const q=localOffset(place.center,plan.origin,960),r=place.radius+config.terrain.regionalDiscoveries!.clearance;
  assert.ok(q.x-place.radius>=child.x*30&&q.y-place.radius>=child.y*30&&q.x+place.radius<=(child.x+child.size)*30&&q.y+place.radius<=(child.y+child.size)*30);
  for(let y=Math.floor((q.y-r)/30);y<=Math.floor((q.y+r)/30);y++)for(let x=Math.floor((q.x-r)/30);x<=Math.floor((q.x+r)/30);x++){
    const dx=Math.max(x*30-q.x,0,q.x-(x+1)*30),dy=Math.max(y*30-q.y,0,q.y-(y+1)*30);
    if(dx*dx+dy*dy<=r*r)assert.equal(plan.shape.rows[y]?.[x],'g','entire native cache and bypass fit the final nested terrain');
  }
  assert.equal(g.regionalPlacesInCell(place.center).filter(p=>p.id===place.id).length,1);
  const world=makeSimWorld('warrior',16220),mass=new WorldMassRuntime(42,'regional-weave-proof',base);mass.attach(world);
  world.landPartyAt(localOffset(place.center,{...mass.origin,x:0,y:0},960));mass.update(world,true);
  const cache=world.chests.find(c=>c.rewardSource===canonical([place.id,'cache']));assert.ok(cache,'real native cache actually materializes in the nested motif');
  assert.equal(cache.rewardLevel,mass.populationFor(place).level);assert.ok(mass.walk.isWalkable(cache.pos.x,cache.pos.y)&&!world.pointInSolid(cache.pos.x,cache.pos.y,15));
  console.log(JSON.stringify({realNestedWitness:{seed:42,grid:[5,-7],formation:plan.shape.id,feature:child.shape,content:place.content,
    world:localOffset(place.center,at(0,0),960),rewardLevel:cache.rewardLevel}}));
  }finally{restore();}
});

console.log(passed+' regional weave courses passed');
