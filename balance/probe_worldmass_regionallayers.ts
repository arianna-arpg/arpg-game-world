import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure } from '../src/worldmass/preset';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { puzzleSeats } from '../src/worldmass/puzzles';
import { siteOffset } from '../src/worldmass/sites';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import type { MassPlace, MassSpec } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { landformCell, type MassLandformPlan, type MassLandformShape } from '../src/worldmass/landforms';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { regionalLandformPolicy } from '../src/worldmass/regionalLandformSources';
import { defaultRegionalTerrainGrammar, layeredRegionalTerrainGrammar, generateRegionalTerrain } from '../src/worldmass/regionalTerrainGrammar';
import { generateRegionalDiscoveries, type RegionalDiscoverySpec } from '../src/worldmass/regionalDiscoveries';
// RegionalWeave keeps this course pinned to the schema15 vocabulary and policy.
const regionalCourtFamilies = layeredRegionalTerrainGrammar().morphology!.families.map(f => f.family);
function regionalWeaveHistorical() {
  const config = JSON.parse(JSON.stringify(massAdventure())) as ReturnType<typeof massAdventure>;
  config.terrain.landforms!.regional!.composition = layeredRegionalTerrainGrammar();
  Reflect.deleteProperty(config.terrain, 'nativeRegional');
  return config;
}
import { canonical, massDigest } from '../src/worldmass/random';

void makeSimWorld;
const copy=<T>(value:T):T=>JSON.parse(canonical(value));
const small=massLandformPolicy();
const at=(x:number,y:number)=>address('surface','0','0',x,y,960);
const dry=(c:string|undefined)=>c==='g'||c==='c';
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}

// Captured directly from committed schema-14 code before the morphology pass.
// This compares against old output, rather than two instances of the new code.
test('omitted morphology preserves 256 historical source identities',()=>{
  const policy=defaultRegionalTerrainGrammar();
  assert.equal(massDigest(policy),'f95e181cba0eb454');
  assert.equal(massDigest(Array.from({length:256},(_,i)=>massDigest(generateRegionalTerrain(policy,small.shapes,i+1)))),'7279f5fe1ee9539f');
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

/** Count actual dry-room departures from a circular footprint without counting
 * corridor shoulders or nested native motifs. A descriptor name alone is not
 * evidence that the playable court changed shape. */
function courtDeparture(shape:MassLandformShape,index:number):{checked:number;missing:number}{
  const graph=shape.grammar!,node=graph.nodes[index],rows=shape.foundationRows??shape.rows;
  let checked=0,missing=0;
  const segmentDistance=(x:number,y:number,a:{x:number;y:number},b:{x:number;y:number})=>{
    const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
  };
  for(let y=Math.ceil(node.y-node.radius);y<=Math.floor(node.y+node.radius);y++)
    for(let x=Math.ceil(node.x-node.radius);x<=Math.floor(node.x+node.radius);x++){
      const d=Math.hypot(x-node.x,y-node.y);
      if(d<node.radius*.55||d>node.radius*.96)continue;
      // The four exterior throats and any recorded links may fill a deliberate
      // concavity, so measure only court interiors outside their five-cell band.
      const nearLink=graph.edges.some(edge=>edge.points.slice(1).some((b,i)=>segmentDistance(x,y,edge.points[i],b)<=5))
        || shape.ports!.some(port=>Math.abs(port.x-x)<=5&&Math.abs(node.x-port.x)<=.1||Math.abs(port.y-y)<=5&&Math.abs(node.y-port.y)<=.1);
      if(nearLink)continue;
      checked++;if(!dry(rows[y]?.[x]))missing++;
    }
  return {checked,missing};
}

test('mixed morphology makes actual noncircular courts with distinct normalized terrain and valid routes',()=>{
  const policy=layeredRegionalTerrainGrammar(),terrains=new Set<string>(),outlines=new Set<string>(),families=new Set<string>();
  const nodesByFamily=new Map<string,{nodes:number;noncircular:number;missing:number;checked:number}>();
  let nested=0,bodySamples=0;
  for(let seed=1;seed<=192;seed++){
    const shape=generateRegionalTerrain(policy,small.shapes,seed);assert.ok(shape,'morphology source '+seed);
    assert.ok(Object.isFrozen(shape)&&Object.isFrozen(shape.rows)&&Object.isFrozen(shape.grammar));
    assert.equal(new Set(shape.ports!.map(p=>p.dx+'/'+p.dy)).size,4);
    for(const port of shape.ports!)for(let side=-1;side<=1;side++)
      assert.equal(shape.rows[port.y+port.dy+port.dx*side]?.[port.x+port.dx-port.dy*side],'.','ports contact real unowned terrain');
    const normalized=normalizedTerrain(shape);assert.ok(!terrains.has(normalized),'normalized source repeat at '+seed);terrains.add(normalized);
    outlines.add(normalizedTerrain(shape,true));rasterGraphProof(shape);exteriorProof(shape);
    const body=bodyRoutes(shape);assert.equal(body.reached,body.total,'all body-width dry stands connected at '+seed);bodySamples++;
    for(const p of shape.navigation!)assert.equal(body.seen[(p.y*2+1)*body.N+p.x*2+1],1,'terminal reachable at '+seed);
    for(let i=0;i<shape.grammar!.nodes.length;i++){
      const node=shape.grammar!.nodes[i] as {x:number;y:number;radius:number;court?:{family:string}};
      assert.ok(node.court);assert.ok(Object.isFrozen(node.court),'profile frozen');families.add(node.court.family);
      const difference=courtDeparture(shape,i),row=nodesByFamily.get(node.court.family)??{nodes:0,noncircular:0,missing:0,checked:0};
      row.nodes++;row.checked+=difference.checked;row.missing+=difference.missing;
      if(difference.checked&&difference.missing/difference.checked>.05)row.noncircular++;
      nodesByFamily.set(node.court.family,row);
    }
    nested+=pinnedChildren(shape);
    if(seed<=6)assert.equal(canonical(generateRegionalTerrain(copy(policy),copy(small.shapes),seed)),canonical(shape),'saved policy reproduces exact profile and cells');
  }
  assert.ok(families.size>=7,'many genuine court families occur');
  assert.ok(outlines.size>=180,'silhouette variety survives translation, symmetry and scale');
  for(const [family,row] of nodesByFamily)if(family!=='circle')assert.ok(row.noncircular>=row.nodes*.8,family+' changes the actual court rather than only its label');
  assert.ok(nested>0,'whole native motifs still nest inside morphology');
  console.log(JSON.stringify({morphologySources:192,normalizedTerrains:terrains.size,normalizedOutlines:outlines.size,
    bodySamples,nested,families:[...nodesByFamily.entries()].map(([family,row])=>({family,...row}))}));
});

function flat():MassSpec {
  const regional=copy(regionalLandformPolicy()),source=regional.shapes.find(s=>s.builder==='cloister_walk'&&s.params.extent===6600)!;
  return {id:'regional-layers-proof',version:1,addressSpan:960,terrainCell:30,
    fields:[{id:'elevation',base:.1,layers:[]}],surfaces:[{id:'base',when:[],priority:0,region:'ground',color:'#445533',biome:'downs'}],places:[],
    landforms:{...copy(small),chance:1,regional:{...regional,chance:1,jitter:0,shapes:[source],
      composition:{...copy(layeredRegionalTerrainGrammar()),chance:1},
      recipes:[{id:'layers-course',biomes:['downs'],when:[],shapes:[source.id],barrier:{region:'drystone',color:'#595345'}}]}}};
}
const gen=(spec:MassSpec,seed=713)=>new MassGenerator(makeMassRun(seed,'regional-layers-proof',spec),spec);

test('layered planning preserves JSON, reverse requests, cache eviction and far signed addresses',()=>{
  const spec=flat(),g=gen(spec),points=[at(4800,4800),at(-4800,-4800),
    address('surface','9007199254741005','-9007199254741015',0,0,960)];
  const before=points.map(q=>{const p=g.landforms!.regionalLandforms!.formationAt(q);assert.ok(p?.shape.grammar);return canonical(p);});
  for(let i=0;i<25;i++)g.landforms!.regionalLandforms!.formationAt(at(4800+i*9600,4800));
  assert.ok(g.landforms!.regionalLandforms!.stats.cached<=16);
  assert.deepEqual(points.map(q=>canonical(g.landforms!.regionalLandforms!.formationAt(q))),before);
  const cold=gen(copy(spec));assert.deepEqual([...points].reverse().map(q=>canonical(cold.landforms!.regionalLandforms!.formationAt(q))),[...before].reverse());
  for(const edge of ['-9223372036854775808','9223372036854775807'])assert.doesNotThrow(()=>g.landforms!.regionalLandforms!.formationAt(address('surface',edge,edge,0,0,960)));
});

test('all court families retain body-clear paths at the saved proportion bounds',()=>{
  const base=layeredRegionalTerrainGrammar();let sources=0;
  for(const family of regionalCourtFamilies)for(const aspect of [.6,1])for(const depth of [.08,.4])for(const seed of [19,42,73,128]){
    const policy={...copy(base),maxChildren:0,morphology:{...copy(base.morphology!),families:[{family,weight:1}],
      aspect:[aspect,aspect] as const,depth:[depth,depth] as const}};
    const shape=generateRegionalTerrain(policy,small.shapes,seed);assert.ok(shape,family+' extreme source '+seed);sources++;
    const body=bodyRoutes(shape);assert.equal(body.reached,body.total,family+' extreme body-width route '+seed);
    rasterGraphProof(shape);exteriorProof(shape);
    assert.ok(shape.grammar!.nodes.every(n=>(n as {court?:{family:string}}).court?.family===family),'pinned family means actual selected profiles');
  }
  assert.equal(sources,128);console.log('128 proportion-bound source proofs passed');
});

test('malformed saved morphology refuses construction before terrain publication',()=>{
  const edits:((p:any)=>void)[]=[p=>p.morphology=null,p=>p.morphology.source='',p=>p.morphology.version=3, // RegionalWeave accepts v2; v3 stays unsupported.
    p=>p.morphology.families=[],p=>p.morphology.families=[{family:'triangle-fan',weight:1}],
    p=>p.morphology.families[0].weight=0,p=>p.morphology.families[0].weight=NaN,
    p=>p.morphology.families.push({...p.morphology.families[0]}),p=>p.morphology.aspect=[.59,1],
    p=>p.morphology.aspect=[1.01,1.01],p=>p.morphology.aspect=[.9,.8],p=>p.morphology.depth=[.08,.41],
    p=>p.morphology.lobes=[2,8],p=>p.morphology.facets=[4,11],p=>p.morphology.facets=[4.5,7]];
  for(const edit of edits){const policy=copy(layeredRegionalTerrainGrammar());edit(policy);
    assert.equal(generateRegionalTerrain(policy,small.shapes,713),null,'malformed morphology cannot construct a partial shape');
    const spec=flat();spec.landforms!.regional!.composition=policy;
    assert.throws(()=>gen(spec),/morphology|finite JSON/,'invalid saved policy must fail admission');
  }
});

test('circle-only morphology consumes no historical topology, shoulder or nested-content draws',()=>{
  const policy=layeredRegionalTerrainGrammar(),circle={...copy(policy),morphology:{...copy(policy.morphology!),families:[{family:'circle' as const,weight:1}]}};
  for(let seed=1;seed<=64;seed++){
    const old=generateRegionalTerrain(defaultRegionalTerrainGrammar(),small.shapes,seed)!,now=generateRegionalTerrain(circle,small.shapes,seed)!;
    assert.deepEqual(now.rows,old.rows);assert.deepEqual(now.foundationRows,old.foundationRows);assert.deepEqual(now.components,old.components);
    assert.deepEqual(now.ports,old.ports);assert.deepEqual(now.navigation,old.navigation);const topology=(shape:MassLandformShape)=>shape.grammar!.edges.map(e=>({a:e.a,b:e.b,points:e.points.map(p=>({x:p.x,y:p.y}))}));assert.deepEqual(topology(now),topology(old));
  }
});

function socketSpec():RegionalDiscoverySpec {
  return {source:'regional-layers-sockets-proof',version:1,chance:1,count:[3,3],clearance:90,separation:120,
    choices:[{content:'cache-proof',radius:90,weight:1},{content:'shrine-proof',radius:90,weight:1},{content:'objective-proof',radius:90,weight:1}]};
}
function socketPlan():MassLandformPlan {
  const policy={...copy(layeredRegionalTerrainGrammar()),nodes:[4,4] as const,extent:[6000,6000] as const,maxChildren:0};
  const shape=generateRegionalTerrain(policy,small.shapes,713)!;assert.ok(shape);
  const size=shape.rows.length*30;
  return {id:'regional-layers-socket-fixture',shape,origin:at(-3000,-3000),turn:0,mirror:false,regionalExtent:true,
    bounds:{minX:0,minY:0,maxX:size,maxY:size},recipe:{id:'socket-host',biomes:['downs'],when:[],shapes:[shape.id],barrier:{region:'drystone',color:'#595345'}}};
}
function socketFootprint(plan:MassLandformPlan,point:MassAddress,radius:number):void {
  const q=localOffset(point,plan.origin,960),n=plan.shape.rows.length;
  for(let y=Math.floor((q.y-radius)/30);y<=Math.floor((q.y+radius)/30);y++)
    for(let x=Math.floor((q.x-radius)/30);x<=Math.floor((q.x+radius)/30);x++){
      const dx=Math.max(x*30-q.x,0,q.x-(x+1)*30),dy=Math.max(y*30-q.y,0,q.y-(y+1)*30);
      if(dx*dx+dy*dy>=radius*radius)continue;
      assert.ok(x>=0&&y>=0&&x<n&&y<n,'whole discovery body plus approach stays inside source');
      assert.equal(plan.shape.rows[y][x],'g','whole discovery body plus approach respects final terrain and protected site holes');
    }
}

test('fixed terrain receives independent deterministic content and positions on reachable final-floor sockets',()=>{
  const plan=socketPlan(),policy=socketSpec(),before=canonical(plan),positions=new Set<string>(),contents=new Set<string>(),body=bodyRoutes(plan.shape);
  assert.equal(body.total,body.reached);
  for(let seed=1;seed<=32;seed++){
    const places=generateRegionalDiscoveries(plan,policy,seed,960);assert.ok(places.length>=1&&places.length<=3);
    assert.ok(Object.isFrozen(places)&&places.every(p=>Object.isFrozen(p)),'published discovery plan immutable');
    assert.equal(new Set(places.map(p=>p.id)).size,places.length,'each socket has a unique durable owner');
    assert.equal(canonical(generateRegionalDiscoveries(copy(plan),copy(policy),seed,960)),canonical(places),'JSON reproduces content and positions');
    for(let i=0;i<places.length;i++){
      const p=places[i],q=localOffset(p.center,plan.origin,960);socketFootprint(plan,p.center,p.radius+policy.clearance);
      assert.equal(body.seen[Math.round(q.y/15)*body.N+Math.round(q.x/15)],1,'socket is connected to the actual dry terrain network');
      assert.ok(p.regionalSocket);assert.equal(p.regionalSocket.formation,plan.id);assert.ok(p.regionalSocket.court>=0&&p.regionalSocket.court<plan.shape.grammar!.nodes.length);
      assert.ok(['court','motif'].includes(p.regionalSocket.layer));
      positions.add(Math.round(q.x)+'/'+Math.round(q.y));contents.add(p.content);
      for(let j=0;j<i;j++){const other=localOffset(places[j].center,plan.origin,960);
        assert.ok(Math.hypot(q.x-other.x,q.y-other.y)>=p.radius+places[j].radius+policy.separation,'whole sibling sites retain their separation');}
    }
    assert.equal(canonical(plan),before,'content variation never mutates terrain geometry');
  }
  assert.ok(positions.size>=48,'fixed terrain does not force repeated POI seats');assert.equal(contents.size,3,'content and position vary independently');
  const forward=[2,17,31].map(seed=>canonical(generateRegionalDiscoveries(plan,policy,seed,960)));
  assert.deepEqual([31,17,2].map(seed=>canonical(generateRegionalDiscoveries(plan,policy,seed,960))),forward.reverse());
  const empty={...copy(plan),shape:{...copy(plan.shape),rows:plan.shape.rows.map(r=>'.'.repeat(r.length))}};
  assert.equal(generateRegionalDiscoveries(empty,policy,42,960).length,0,'a protected or missing final floor never receives floating content');
  assert.equal(generateRegionalDiscoveries(plan,{...policy,chance:0},42,960).length,0,'saved discovery chance controls admission');
  console.log(JSON.stringify({fixedGeometrySeed:713,discoveryRolls:32,distinctSeats:positions.size,contentChoices:contents.size}));
});

test('discovery owners appear across intersecting chunks and remain exact after reverse, JSON, far travel and cache eviction',()=>{
  const spec=flat();spec.regionalDiscoveries=socketSpec();Object.assign(spec.landforms!.regional!.composition!,{nodes:[4,4],extent:[6000,6000],maxChildren:0});
  const g=gen(spec),queries=[at(4800,4800),at(-4800,-4800),address('surface','9007199254741005','-9007199254741015',0,0,960)],before:string[]=[];
  let memberships=0;
  for(const q of queries){
    const plan=g.landforms!.regionalLandforms!.formationAt(q)!;assert.ok(plan);
    const places=g.regionalDiscoveries!.forPlan(plan);assert.ok(places.length);before.push(canonical(places));
    for(const place of places){
      socketFootprint(plan,place.center,place.radius+spec.regionalDiscoveries.clearance);
      const lo=moveAddress(place.center,{x:-place.radius,y:-place.radius},960),hi=moveAddress(place.center,{x:place.radius,y:place.radius},960);
      for(let cy=BigInt(lo.cy);cy<=BigInt(hi.cy);cy++)for(let cx=BigInt(lo.cx);cx<=BigInt(hi.cx);cx++){
        const origin=address('surface',cx.toString(),cy.toString(),0,0,960),p=localOffset(place.center,origin,960),dx=Math.max(-p.x,0,p.x-960),dy=Math.max(-p.y,0,p.y-960);
        if(dx*dx+dy*dy>place.radius*place.radius)continue;
        assert.equal(g.regionalDiscoveries!.inCell(origin).filter(v=>v.id===place.id).length,1,'intersected chunk retains same owner');
        assert.equal(g.regionalPlacesInCell(origin).filter(v=>v.id===place.id).length,1,'combined native query exposes socket owner exactly once');memberships++;
      }
    }
  }
  for(let i=0;i<68;i++){
    const p=g.landforms!.regionalLandforms!.formationAt(at(4800+i*9600,4800));if(p)g.regionalDiscoveries!.forPlan(p);
  }
  assert.ok(g.regionalDiscoveries!.stats.cached<=64,'content plan cache remains bounded');
  assert.deepEqual(queries.map(q=>canonical(g.regionalDiscoveries!.forPlan(g.landforms!.regionalLandforms!.formationAt(q)!))),before);
  const cold=gen(copy(spec));assert.deepEqual([...queries].reverse().map(q=>canonical(cold.regionalDiscoveries!.forPlan(cold.landforms!.regionalLandforms!.formationAt(q)!))),[...before].reverse());
  for(const edge of ['-9223372036854775808','9223372036854775807'])assert.doesNotThrow(()=>g.regionalPlacesInCell(address('surface',edge,edge,0,0,960)));
  assert.ok(memberships>=9);console.log(JSON.stringify({persistentDiscoveryChunks:memberships,cached:g.regionalDiscoveries!.stats.cached}));
});

test('malformed discovery policies refuse before publication',()=>{
  const edits:((s:any)=>void)[]=[s=>s.regionalDiscoveries=null,s=>s.regionalDiscoveries.source='',s=>s.regionalDiscoveries.version=2,
    s=>s.regionalDiscoveries.chance=1.01,s=>s.regionalDiscoveries.count=[0,5],s=>s.regionalDiscoveries.count=[3,2],s=>s.regionalDiscoveries.count=[1.5,2],
    s=>s.regionalDiscoveries.clearance=89,s=>s.regionalDiscoveries.separation=89,s=>s.regionalDiscoveries.choices=[],
    s=>s.regionalDiscoveries.choices[0].radius=89,s=>s.regionalDiscoveries.choices[0].radius=401,
    s=>s.regionalDiscoveries.choices[0].weight=0,s=>s.regionalDiscoveries.choices.push({...s.regionalDiscoveries.choices[0]}),
    s=>delete s.landforms.regional.composition];
  for(const edit of edits){const spec=flat();spec.regionalDiscoveries=socketSpec();edit(spec);assert.throws(()=>gen(spec),/regional discovery/);}
});

const realRun='regional-layers-ui',realExamples=new Map<string,MassPlace>();
test('real default noise country hosts all native discovery classes inside final layered terrain',()=>{
  const config=reserveMassOpening(42,realRun,regionalWeaveHistorical()),g=new MassGenerator(makeMassRun(42,realRun,config.terrain),config.terrain),
    contentKinds=new Set<string>(),contentIds=new Set<string>(),families=new Set<string>(),receipts=new Set<string>(),times:number[]=[];
  let generated=0,discoveries=0,motifs=0,nativeChildren=0;
  const candidates=Array.from({length:225},(_,i)=>[i%15-7,Math.floor(i/15)-7]);candidates.push([9,-5]);
  for(const [x,y] of candidates){
    const started=performance.now(),plan=g.landforms!.regionalLandforms!.formationAt(at(x*9600+4800,y*9600+4800));
    if(!plan?.shape.grammar){times.push(performance.now()-started);continue;}
    generated++;nativeChildren+=pinnedChildren(plan.shape);
    const route=bodyRoutes(plan.shape);assert.equal(route.reached,route.total,'final native-site and motif composition retains every body-width dry stand');
    for(const point of plan.shape.navigation!)assert.ok(route.seen[(point.y*2+1)*route.N+point.x*2+1],'final route terminal remains body-accessible');
    for(const node of plan.shape.grammar.nodes)families.add(node.court!.family);
    const before=canonical(plan),places=g.regionalDiscoveries!.forPlan(plan);times.push(performance.now()-started);
    assert.equal(new Set(places.map(p=>p.content)).size,places.length,'one formation does not repeat the same discovery payload');
    for(const place of places){
      socketFootprint(plan,place.center,place.radius+config.terrain.regionalDiscoveries!.clearance);
      assert.equal(g.regionalPlacesInCell(place.center).filter(p=>p.id===place.id).length,1,'actual combined query publishes the generated owner');
      const content=config.content.find(c=>c.id===place.content)!;assert.ok(content?.site);discoveries++;
      const kind=content.site.cache?'cache':content.site.shrines?.length?'shrine':content.site.altars?.length?'altar':content.site.puzzles?.[0].spec.kind;
      assert.ok(kind);contentKinds.add(kind);contentIds.add(content.id);if(!realExamples.has(kind))realExamples.set(kind,place);
      assert.ok(!receipts.has(place.id));receipts.add(place.id);if(place.regionalSocket.layer==='motif')motifs++;
      assert.ok(content.levels?.some(p=>p.level===24),'discovery snapshots retain higher native reward levels');
    }
    assert.equal(canonical(plan),before,'native discovery placement leaves terrain and site holes unchanged');
  }
  times.sort((a,b)=>a-b);
  assert.ok(generated>=8&&discoveries>=20,'default noise country visibly uses layered discoveries');
  assert.deepEqual([...contentKinds].sort(),['accord','altar','cache','ember','lattice','shrine']);
  assert.ok(contentIds.size>=10&&families.size>=7,'default content and terrain families both vary');
  assert.ok(nativeChildren>=2,'real country retains complete native children inside morphology');
  assert.ok(motifs>=1,'default discovery placement can inhabit a native child motif');
  console.log(JSON.stringify({realCandidateCells:candidates.length,generated,discoveries,nativeChildren,nestedMotifDiscoveries:motifs,contentIds:contentIds.size,
    contentKinds:[...contentKinds],courtFamilies:families.size,coldP95Ms:Math.round(times[Math.floor(times.length*.95)]),coldMaxMs:Math.round(times[times.length-1])}));
});

test('terrain-owned native cache, shrine, fields and puzzles use real owners, physical stands and durable Continue',()=>{
  const restore=seedGlobalRandom(828142);
  try{
    const world=makeSimWorld('warrior',828142),mass=new WorldMassRuntime(42,realRun,regionalWeaveHistorical());mass.attach(world);
    const hooks=world as unknown as {updateChests(dt:number):void;updateShrines():void};
    let chestSource:string|undefined,shrineSource:string|undefined,shrineDef:string|undefined;
    const examined:string[]=[];
    for(const kind of ['cache','shrine','altar','lattice','ember','accord']){
      const place=realExamples.get(kind)!;assert.ok(place,kind+' real owner');
      assert.ok(mass.placesInCell(place.center).some(p=>p.id===place.id),'runtime admission includes the '+kind+' owner');
      const q=localOffset(place.center,{...mass.origin,x:0,y:0},960);world.landPartyAt(q);mass.update(world,true);
      const content=mass.config.content.find(c=>c.id===place.content)!,level=mass.populationFor(place).level;
      assert.ok(level>1,'far discoveries use actual geographic level');
      for(const doodad of content.site!.doodads){const offset=siteOffset(place,doodad.pos.x,doodad.pos.y);
        assert.ok(world.doodads.some(d=>d.kind===doodad.kind&&Math.hypot(d.pos.x-q.x-offset.x,d.pos.y-q.y-offset.y)<.01),'native discovery scenery materialized');}
      if(kind==='cache'){
        chestSource=canonical([place.id,'cache']);const chest=world.chests.find(c=>c.rewardSource===chestSource)!;assert.ok(chest);
        assert.equal(chest.rewardLevel,level);assert.ok(!world.pointInSolid(chest.pos.x,chest.pos.y,15));
        world.landPartyAt(chest.pos);hooks.updateChests(chest.maxLock+1);assert.ok(chest.opened,'native timed chest actually opens');
        assert.equal(world.chests.filter(c=>c.rewardSource===chestSource).length,1);
      } else if(kind==='shrine'){
        const def=content.site!.shrines![0];shrineSource=canonical([place.id,'shrine',def.id]);shrineDef=def.def.id;
        const shrine=world.shrines.find(s=>s.massSource===shrineSource)!;assert.ok(shrine);assert.equal(shrine.used,false);
        assert.ok(!world.pointInSolid(shrine.pos.x,shrine.pos.y,15));world.landPartyAt(shrine.pos);hooks.updateShrines();
        assert.ok(shrine.used&&world.player.buffs.has('shrine_'+shrineDef),'native shrine applies its real once-only buff');
      } else if(kind==='altar'){
        const altar=world.altars.find(a=>a.massSource===canonical([place.id,'altar',content.site!.altars![0].id]));assert.ok(altar,'native altar field materialized');assert.equal(altar.level,level);
      } else {
        const expected=content.site!.puzzles![0],saved=mass.puzzles.snapshot(world).find(p=>p.id===canonical([place.id,'puzzle',expected.id]));
        assert.ok(saved,'native '+kind+' puzzle owner admitted');
        for(const seat of puzzleSeats(expected)){const pos=siteOffset(place,expected.x+seat.x,expected.y+seat.y);
          assert.ok(mass.walk.isWalkable(q.x+pos.x,q.y+pos.y)&&!world.pointInSolid(q.x+pos.x,q.y+pos.y,15),'actual native puzzle node remains reachable');}
      }
      examined.push(kind);
    }
    const puzzleStates=canonical(mass.puzzles.snapshot(world));
    const saved=mass.snapshot(world);assert.equal(saved.schema,15);const frozen=canonical(saved);
    const resumedWorld=makeSimWorld('warrior',828143),resumed=new WorldMassRuntime(42,realRun,saved.config,saved);resumed.attach(resumedWorld,saved);
    assert.equal(canonical(saved),frozen,'Continue leaves the supplied checkpoint immutable');
    assert.equal(canonical(resumed.puzzles.snapshot(resumedWorld)),puzzleStates,'all native puzzle definitions and progress survive Continue');
    const cachePlace=realExamples.get('cache')!,cachePos=localOffset(cachePlace.center,{...resumed.origin,x:0,y:0},960);
    resumedWorld.landPartyAt(cachePos);resumed.update(resumedWorld,true);
    const cache=resumedWorld.chests.find(c=>c.rewardSource===chestSource)!;assert.ok(cache?.opened,'opened native cache remains spent after distant travel and Continue');
    const drops=canonical(resumed.snapshot(resumedWorld).contents.drops);resumedWorld.landPartyAt(cache.pos);
    (resumedWorld as unknown as {updateChests(dt:number):void}).updateChests(20);
    assert.equal(canonical(resumed.snapshot(resumedWorld).contents.drops),drops,'spent regional cache cannot refill loot');
    assert.equal(resumedWorld.chests.filter(c=>c.rewardSource===chestSource).length,1);
    const shrinePlace=realExamples.get('shrine')!,shrinePos=localOffset(shrinePlace.center,{...resumed.origin,x:0,y:0},960);
    resumedWorld.landPartyAt(shrinePos);resumed.update(resumedWorld,true);
    const shrine=resumedWorld.shrines.find(s=>s.massSource===shrineSource)!;assert.ok(shrine?.used,'consumed native shrine stays spent across eviction and Continue');
    resumedWorld.player.updateTimers(4000);resumedWorld.landPartyAt(shrine.pos);
    (resumedWorld as unknown as {updateShrines():void}).updateShrines();
    assert.equal(resumedWorld.player.buffs.has('shrine_'+shrineDef),false,'spent shrine cannot reapply after its buff expires');
    const downgraded=copy(saved);downgraded.schema=14;
    assert.throws(()=>new WorldMassRuntime(42,realRun,downgraded.config,downgraded),/Invalid worldmass checkpoint/);
    console.log(JSON.stringify({nativeDiscoveryKinds:examined,openedChest:!!chestSource,consumedShrine:!!shrineSource,schema:saved.schema}));
  }finally{restore();}
});

test('a native cache can nest inside a complete pools motif inside a shaped regional court',()=>{
  const shape=generateRegionalTerrain(layeredRegionalTerrainGrammar(),small.shapes,3)!;assert.ok(shape);assert.ok(pinnedChildren(shape)>0);
  const plan:MassLandformPlan={...socketPlan(),id:'regional-layers-motif-3',shape,origin:at(0,0),
    bounds:{minX:0,minY:0,maxX:shape.rows.length*30,maxY:shape.rows.length*30}};
  const choice=regionalWeaveHistorical().terrain.regionalDiscoveries!.choices.find(c=>c.content==='regional-discovery-wayfarer-cache')!;assert.ok(choice);
  const policy:RegionalDiscoverySpec={...socketSpec(),source:'motif-proof',count:[1,1],choices:[choice]};
  let found:ReturnType<typeof generateRegionalDiscoveries>[number]|undefined,roll=0;
  for(roll=1;roll<=64&&!found;roll++)found=generateRegionalDiscoveries(plan,policy,roll,960).find(p=>p.regionalSocket.layer==='motif');
  assert.ok(found,'bounded independent rolls can choose a socket inside a complete native motif');
  const child=shape.components!.find(c=>c.shape===found.regionalSocket.feature)!;assert.ok(child);
  const q=localOffset(found.center,plan.origin,960);socketFootprint(plan,found.center,found.radius+policy.clearance);
  assert.ok(q.x-found.radius>=child.x*30&&q.y-found.radius>=child.y*30&&q.x+found.radius<=(child.x+child.size)*30&&q.y+found.radius<=(child.y+child.size)*30);
  const body=bodyRoutes(shape);assert.equal(body.reached,body.total);assert.ok(body.seen[Math.round(q.y/15)*body.N+Math.round(q.x/15)]);
  console.log(JSON.stringify({nestedSocketContent:found.content,feature:found.regionalSocket.feature,sourceSeed:3,discoveryRoll:roll-1}));
});

console.log(passed+' regional layer courses passed');
