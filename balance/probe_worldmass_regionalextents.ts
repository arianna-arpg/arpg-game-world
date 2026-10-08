import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { address, cellKey, floorDiv, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import type { MassSpec } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { landformCell, type MassLandformPlan, type MassLandformShape } from '../src/worldmass/landforms';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { captureRegionalShape, regionalLandformPolicy } from '../src/worldmass/regionalLandformSources';
import { composeRegionalSites, regionalRoutesPreserved, type RegionalLandformSite } from '../src/worldmass/regionalLandformComposition';
import { massAdventure } from '../src/worldmass/preset';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { canonical, massDigest } from '../src/worldmass/random';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';

void makeSimWorld;
const copy=<T>(value:T):T=>JSON.parse(canonical(value));
const regional=regionalLandformPolicy(),small=massLandformPolicy();
const at=(x:number,y:number,span=960)=>address('surface','0','0',x,y,span);
const flat=(shape=regional.shapes.find(s=>s.builder==='cloister_walk'&&s.params.extent===6600)!):MassSpec=>({
  id:'regional-extent-proof',version:1,addressSpan:960,terrainCell:30,
  fields:[{id:'elevation',base:.1,layers:[]}],
  surfaces:[{id:'base',when:[],priority:0,region:'ground',color:'#445533',biome:'downs'}],places:[],
  landforms:{...copy(small),chance:1,regional:{...copy(regional),chance:1,jitter:0,shapes:[copy(shape)],
    recipes:[{id:'extent-course',biomes:['downs'],when:[],shapes:[shape.id],barrier:{region:'drystone',color:'#595345'}}]}}});
const gen=(spec:MassSpec,seed=713)=>new MassGenerator(makeMassRun(seed,'regional-extent-proof',spec),spec);
const dry=(c:string|undefined)=>c==='g'||c==='c';
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}

/** Independent circle-vs-cell oracle at half-cell resolution. Transparent cells
 * are unavailable; neither exterior noise nor a lake can stand in for a route.
 * Cardinal edges between these 15-unit samples cannot pass a cell corner between
 * samples, so their dry endpoints also prove the swept circle along the edge. */
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
function distances(shape:MassLandformShape,start:{x:number;y:number}):Int32Array {
  const n=shape.rows.length,out=new Int32Array(n*n);out.fill(-1);
  const queue=[start.y*n+start.x];assert.ok(dry(shape.rows[start.y][start.x]));out[queue[0]]=0;
  for(let i=0;i<queue.length;i++){
    const k=queue[i],x=k%n,y=Math.floor(k/n);
    for(const j of [x?k-1:-1,x+1<n?k+1:-1,y?k-n:-1,y+1<n?k+n:-1])
      if(j>=0&&out[j]<0&&dry(shape.rows[Math.floor(j/n)][j%n])){out[j]=out[k]+1;queue.push(j);}
  }
  return out;
}
const rectDistance=(x:number,y:number,cx:number,cy:number)=>Math.hypot(Math.max(cx*30-x,0,x-(cx+1)*30),Math.max(cy*30-y,0,y-(cy+1)*30));

// Run cheap source checks before the more expensive real-country survey.
test('regional sources are physically large and all dry stands connect at player-body width',()=>{
  assert.deepEqual([...new Set(regional.shapes.map(s=>s.params.extent))].sort((a,b)=>a-b),[3300,6000,6600]);
  const families=new Set<string>();let large=0;
  for(const shape of regional.shapes){
    const route=bodyRoutes(shape);assert.equal(route.reached,route.total,shape.id+' isolated radius-15 stand');
    assert.ok(route.total>1000,shape.id+' substantial traversable interior');
    assert.ok(shape.navigation!.every(p=>route.seen[(p.y*2+1)*route.N+p.x*2+1]),shape.id+' terminal stand');
    const cells=shape.rows.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='.'?[]:[{x,y}]));
    const width=(Math.max(...cells.map(p=>p.x))-Math.min(...cells.map(p=>p.x))+1)*30;
    const height=(Math.max(...cells.map(p=>p.y))-Math.min(...cells.map(p=>p.y))+1)*30;
    if(shape.params.extent>=6000){large++;assert.ok(width>=5400&&height>=5400,shape.id+' actual outline spans several views');}
    families.add(shape.builder);
  }
  assert.ok(large>=8);assert.ok(families.size>=6);
  assert.equal(small.shapes.length,21,'small terrain remains independently available');
});

test('regional capture accepts reusable physical extents without changing corridor grain',()=>{
  const child=small.shapes.find(s=>s.id==='stepping_pools/0')!;
  const shape=captureRegionalShape('stepping_pools',1,4200,child);
  assert.equal(shape.params.extent,4200);assert.equal(shape.rows.length,(4200+240)/30);
  const route=bodyRoutes(shape);assert.ok(route.total>1000);assert.equal(route.reached,route.total);
  for(const extent of [4230,7020])assert.throws(()=>captureRegionalShape('stepping_pools',1,extent,child));
});

test('complete native pond children cannot turn a short parent route into a long detour',()=>{
  const child=small.shapes.find(s=>s.id==='stepping_pools/0')!,n=80,offset=20;
  const rows:string[][]=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>!x||!y||x===n-1||y===n-1?'.':'g'));
  const navigation=[{x:offset+11,y:offset+10},{x:offset+11,y:offset+17},{x:5,y:5},{x:74,y:74}];
  const before:MassLandformShape={id:'parent-court',source:'probe/open-court',builder:'probe',params:{},rows:rows.map(r=>r.join('')),navigation};
  for(let y=0;y<child.rows.length;y++)for(let x=0;x<child.rows.length;x++)
    if(child.rows[y][x]!=='.')rows[offset+y][offset+x]=child.rows[y][x];
  const after={...before,rows:rows.map(r=>r.join('')),components:[{shape:child.id,x:offset,y:offset,size:child.rows.length}]};
  const route=bodyRoutes(after);assert.equal(route.reached,route.total,'the child still permits every dry stand');
  const terminal=navigation[1].y*n+navigation[1].x;
  assert.equal(distances(before,navigation[0])[terminal],7);
  assert.equal(distances(after,navigation[0])[terminal],17,'complete pond forces a real detour');
  assert.equal(regionalRoutesPreserved(before,before,30),true);
  const reasons:string[]=[];assert.equal(regionalRoutesPreserved(before,after,30,r=>reasons.push(r)),false);
  assert.deepEqual(reasons,['detour'],'connectivity alone does not preserve the parent route');
});

test('nested pond components retain every native source cell and a dry local perimeter',()=>{
  let children=0,yParents=0;
  for(const shape of regional.shapes)for(const child of shape.components??[]){
    const source=small.shapes.find(s=>s.id===child.shape);assert.ok(source,child.shape+' has a pinned source');
    assert.equal(child.size,source.rows.length);children++;if(shape.builder==='cloister_walk')yParents++;
    let water=0;
    for(let y=0;y<child.size;y++)for(let x=0;x<child.size;x++){
      const c:string=source.rows[y][x],actual:string=shape.rows[child.y+y][child.x+x];
      if(c!=='.')assert.equal(actual,c,shape.id+' clipped or overwritten child '+x+','+y);
      else assert.equal(actual,'g',shape.id+' child apron inherited dry parent');
      if(c==='w')water++;
    }
    for(let d=-1;d<=child.size;d++)for(const [x,y] of [[child.x-1,child.y+d],[child.x+child.size,child.y+d],[child.x+d,child.y-1],[child.x+d,child.y+child.size]])
      assert.ok(dry(shape.rows[y]?.[x]),shape.id+' unbroken child collar');
    assert.ok(water>20,'nested source retains actual ponds');
  }
  assert.ok(children>=2&&yParents>=1,'nested terrain exists in the shipped branching family');
});

test('one large owner spans many chunks and cold, streamed and reordered samples agree',()=>{
  const spec=flat(),g=gen(spec),p=g.landforms!.at(at(4800,4800))!;assert.ok(p?.regionalExtent);
  const state=new MassState(g.run,30),stream=new MassStream(g,state,{maxPages:8,maxSamples:8192});
  const chunks=new Set<string>(),samples:MassAddress[]=[];
  for(let y=0;y<p.shape.rows.length;y+=3)for(let x=0;x<p.shape.rows.length;x+=3){
    const c=landformCell(p,x,y),q=moveAddress(p.origin,{x:(x+.5)*30,y:(y+.5)*30},960);
    assert.equal(g.landforms!.at(q)?.id,p.id);if(c!=='.')chunks.add(cellKey(q));
    assert.equal(g.terrainAt(q).region,c==='b'?p.recipe.barrier.region:c==='w'?'water':c==='c'?'locale_bridge':'ground');
    if(samples.length<8&&c==='b'&&!samples.some(a=>cellKey(a)===cellKey(q)))samples.push(q);
  }
  assert.ok(chunks.size>=30,'single owner affects at least thirty address chunks');assert.equal(samples.length,8);
  const expected=samples.map(q=>canonical(g.terrainAt(q)));
  stream.request(samples);while(stream.stats.pending)stream.step(311);
  for(let i=0;i<samples.length;i++){
    const q=samples[i],page=stream.page(q)!;assert.ok(page);
    const index=Math.floor(q.y/30)*page.cols+Math.floor(q.x/30);
    assert.equal(canonical(page.samples[index]),expected[i]);
  }
  const again=gen(copy(spec));assert.deepEqual([...samples].reverse().map(q=>canonical(again.terrainAt(q))),[...expected].reverse());
  assert.equal(state.snapshot().terrain.length,0,'regional source is not saved as terrain edits');
});

test('far signed addresses, negative candidates and bounded eviction reproduce full source ownership',()=>{
  const spec=flat(),g=gen(spec),points=[at(4800,4800),at(-4800,-4800),
    address('surface','9007199254741005','-9007199254741015',0,0,960)];
  const before=points.map(q=>{const p=g.landforms!.at(q);assert.ok(p?.regionalExtent);return canonical(p);});
  assert.equal(new Set(points.map(q=>g.landforms!.at(q)!.id)).size,3);
  for(let i=0;i<25;i++)g.landforms!.regionalLandforms!.at(at(4800+i*9600,4800));
  assert.ok(g.landforms!.regionalLandforms!.stats.cached<=16);
  assert.deepEqual(points.map(q=>canonical(g.landforms!.at(q))),before);
  const fresh=gen(copy(spec));assert.deepEqual([...points].reverse().map(q=>canonical(fresh.landforms!.at(q))),[...before].reverse());
  for(const coord of ['-9223372036854775808','9223372036854775807']){
    const q=address('surface',coord,coord,0,0,960);assert.doesNotThrow(()=>g.landforms!.regionalLandforms!.at(q));
  }
});

test('signed boundary admission includes protected-site inhibition and surface page halos',()=>{
  const period=9600n;
  for(const span of [30,7680])for(const chance of [0,.75])for(const side of ['minimum','maximum']){
    const spec=flat();spec.addressSpan=span;
    spec.places=[span===30
      ? {id:'far-protected',version:1,content:'protected',period:30000,chance,jitter:0,radius:10000,priority:1,when:[]}
      : {id:'edge-surface',version:1,content:'protected',period:150,chance,jitter:0,radius:1,priority:1,when:[],surface:{region:'ground',color:'#445533'}}];
    const minimum=-(1n<<63n)*BigInt(span),maximum=(1n<<63n)*BigInt(span);
    const candidate=side==='minimum'?-floorDiv(-minimum,period):floorDiv(maximum,period)-1n;
    assert.ok(candidate*period>=minimum&&(candidate+1n)*period<=maximum,'the candidate itself fits the signed domain');
    const center=candidate*period+period/2n,coordinate=floorDiv(center,BigInt(span)),offset=Number(center-coordinate*BigInt(span));
    const q=address('surface',coordinate.toString(),coordinate.toString(),offset,offset,span),g=gen(spec);
    assert.equal(g.landforms!.regionalLandforms!.at(q),null,span+'/'+chance+'/'+side+' refuses the whole dependent footprint');
    assert.equal(g.landforms!.regionalLandforms!.stats.baseReads,0,'unsafe neighbor/page dependencies refuse before substrate reads');
    assert.equal(g.landforms!.regionalLandforms!.stats.seats,0,'no partially prepared boundary owner');
  }
});

test('protected site circles stay untouched while admitted collars preserve the parent routes',()=>{
  const source=regional.shapes.find(s=>s.builder==='stepping_pools'&&s.params.extent===6000)!;
  let composed:MassLandformShape|null=null,site:RegionalLandformSite|undefined,attempts=0;
  for(let y=5;y<source.rows.length-5&&!composed;y+=3)for(let x=5;x<source.rows.length-5&&!composed;x+=3){
    if(source.rows[y][x]!=='w'||![-5,5].some(d=>dry(source.rows[y+d]?.[x])||dry(source.rows[y]?.[x+d])))continue;
    if(++attempts>60)break;
    const candidate={id:'protected-native-site',x:(x+.5)*30,y:(y+.5)*30,radius:90};
    composed=composeRegionalSites(source,[candidate],30,regional.siteApron,regional.maxAlteredFraction);if(composed)site=candidate;
  }
  assert.ok(composed&&site,'at least one authored site composes at a pool edge');
  let untouched=0,collar=0,erasedObstacle=0;
  for(let y=0;y<source.rows.length;y++)for(let x=0;x<source.rows.length;x++){
    const d=rectDistance(site.x,site.y,x,y),before:string=source.rows[y][x],after:string=composed.rows[y][x];
    if(d<=site.radius){assert.equal(after,'.','complete protected circle');untouched++;}
    else if(d<=site.radius+regional.siteApron&&before!=='.'){assert.ok(dry(after),'dry authored exterior collar');collar++;}
    if((before==='b'||before==='w')&&after!==before)erasedObstacle++;
  }
  assert.ok(untouched>20&&collar>40&&erasedObstacle>0,'course really intersects physical terrain');
  const routes=bodyRoutes(composed);assert.equal(routes.reached,routes.total,'all radius-15 collar stands join parent');
  for(const a of source.navigation!){
    const before=distances(source,a),after=distances(composed,a),n=source.rows.length;
    for(const b of source.navigation!){const k=b.y*n+b.x;
      assert.ok(after[k]>=0,'route terminal still reachable');
      assert.ok(after[k]>=before[k]*.70-6,'site must not erase the parent detour');
      assert.ok(after[k]<=before[k]*1.4+6,'site must not strand a long former route');
    }
  }
  const childParent=regional.shapes.find(s=>s.components?.length)!;assert.ok(childParent);
  const child=childParent.components![0];
  assert.equal(composeRegionalSites(childParent,[{id:'cannot-clip-child',x:(child.x+child.size/2)*30,y:(child.y+child.size/2)*30,radius:90}],30,120,.12),null);
});

test('historical default country admits diverse multi-screen owners without overwriting protected site circles',()=>{
  const stats:unknown[]=[],families=new Set<string>(),recipes=new Set<string>();let total=0,large=0,nested=0,protectedCount=0;
  for(const seed of [42,713,991]){
    const terrainVariationLegacyPolicy=copy(massAdventure());delete terrainVariationLegacyPolicy.terrain.landforms!.regional!.composition;delete terrainVariationLegacyPolicy.terrain.regionalDiscoveries;
    const config=reserveMassOpening(seed,'regional-extent-proof',terrainVariationLegacyPolicy),g=gen(config.terrain,seed),coldMs:number[]=[];
    for(let y=-5;y<5;y++)for(let x=-5;x<5;x++){
      const started=performance.now(),p=g.landforms!.regionalLandforms!.at(at(x*9600+4800,y*9600+4800));
      coldMs.push(performance.now()-started);if(!p)continue;
      total++;families.add(p.shape.builder);recipes.add(p.recipe.id);if(p.shape.params.extent>=6000)large++;if(p.shape.components?.length)nested++;
      const body=bodyRoutes(p.shape);assert.equal(body.reached,body.total,p.shape.id+' composed body-wide connectivity');
      for(const child of p.shape.components??[]){
        const source=small.shapes.find(s=>s.id===child.shape);assert.ok(source);assert.equal(source.rows.length,child.size);
        let complete=false;
        for(const mirror of [false,true])for(let turn=0;turn<4;turn++){
          const pose={shape:source,turn,mirror} as MassLandformPlan;let matches=true;
          for(let yy=0;yy<child.size&&matches;yy++)for(let xx=0;xx<child.size;xx++){
            const c=landformCell(pose,xx,yy),actual=landformCell(p,child.x+xx,child.y+yy);
            if(c==='.'?!dry(actual):actual!==c){matches=false;break;}
          }
          if(matches)complete=true;
        }
        assert.ok(complete,p.shape.id+' complete nested cells survive real site composition');
      }
      const places=new Map<string,ReturnType<typeof g.placesInCell>[number]>(),n=p.shape.rows.length;
      const lo=p.origin,hi=moveAddress(lo,{x:n*30,y:n*30},960);
      for(let cy=BigInt(lo.cy);cy<=BigInt(hi.cy);cy++)for(let cx=BigInt(lo.cx);cx<=BigInt(hi.cx);cx++)
        for(const place of g.placesInCell({dimension:'surface',cx:cx.toString(),cy:cy.toString()}))
          if(!g.spec.places.find(r=>r.id===place.recipe)?.landformHabitat)places.set(place.id,place);
      for(const place of places.values()){
        const q=localOffset(place.center,p.origin,960),r=place.radius;let hit=0;
        for(let yy=Math.max(0,Math.floor((q.y-r)/30));yy<Math.min(n,Math.ceil((q.y+r)/30));yy++)
          for(let xx=Math.max(0,Math.floor((q.x-r)/30));xx<Math.min(n,Math.ceil((q.x+r)/30));xx++)
            if(rectDistance(q.x,q.y,xx,yy)<=r){assert.equal(landformCell(p,xx,yy),'.',place.recipe+' protected cells');hit++;}
        if(hit)protectedCount++;
      }
    }
    const measured=g.landforms!.regionalLandforms!.stats;coldMs.sort((a,b)=>a-b);
    assert.ok(measured.seats<=measured.attempts*4,'finite regional seats per candidate');
    assert.ok(measured.baseReads<=measured.seats*38,'finite substrate probes per attempted regional seat');
    stats.push({seed,...measured,coldP95Ms:Math.round(coldMs[Math.floor(coldMs.length*.95)]),coldMaxMs:Math.round(coldMs[coldMs.length-1])});
  }
  console.log(JSON.stringify({regionalCandidates:300,accepted:total,large,nested,protectedCount,families:[...families],recipes:[...recipes],stats,source:massDigest(regional)}));
  assert.ok(total>=10,'large formations must be encountered in real seeded country');
  assert.ok(large>=3,'real country admits actual multi-screen geometry');
  assert.ok(families.size>=4&&recipes.size>=4,'real admission preserves terrain and climate variety');
  assert.ok(nested>=1,'nested pools survive real site admission');assert.ok(protectedCount>=1,'real sites coexist with large owners');
});

test('missing regional policy preserves historical sources and malformed nested policy refuses',()=>{
  const current=flat(),legacy=copy(current);delete legacy.landforms!.regional;
  const old=gen(legacy);assert.equal(old.landforms!.regionalLandforms,null);
  const fresh=gen(copy(legacy));
  for(const q of [at(1440,1440),at(-1440,-1440)])assert.equal(canonical(old.terrainAt(q)),canonical(fresh.terrainAt(q)));
  const changes:((s:any)=>void)[]=[s=>s.landforms.regional=null,s=>s.landforms.regional.spacing=3000,
    s=>s.landforms.regional.shapes[0].rows[0]='bad',s=>s.landforms.regional.recipes[0].shapes=['missing'],
    s=>s.landforms.regional.shapes[0].ports[0].dx=2,s=>s.landforms.regional.shapes[0].navigation[0]={x:-1,y:2},
    s=>s.landforms.regional.shapes[0].components[0].shape='missing-native-child',
    s=>s.landforms.regional.shapes[0].components[0].size=16,
    s=>{const shape=s.landforms.regional.shapes[0],port=shape.ports[0],row=shape.foundationRows[port.y];
      shape.foundationRows[port.y]=row.slice(0,port.x)+'b'+row.slice(port.x+1);},
    s=>s.landforms.regional.maxAlteredFraction=.21];
  assert.ok(current.landforms!.regional!.shapes[0].components?.length,'malformed component fixture has a child');
  for(const change of changes){const s=copy(current);change(s);assert.throws(()=>gen(s));}
});

test('cold Continue preserves large source bytes and schema prevents older interpretation',()=>{
  const config={terrain:flat(),theme:copy(massAdventure().theme),content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256};
  const world=makeSimWorld('warrior',811),mass=new WorldMassRuntime(713,'regional-extent-proof',config);mass.attach(world);
  const plan=mass.generator.landforms!.at(at(4800,4800))!;assert.ok(plan?.regionalExtent);
  const barrier=plan.shape.rows.flatMap((r,y)=>[...r].flatMap((c,x)=>c==='b'?[{x,y}]:[]))[0];assert.ok(barrier);
  const q=moveAddress(plan.origin,{x:(barrier.x+.5)*30,y:(barrier.y+.5)*30},960);
  world.player.pos={x:4800,y:4800};
  const saved=mass.snapshot(world);assert.equal(saved.schema,13);
  const resumedWorld=makeSimWorld('warrior',812),resumed=new WorldMassRuntime(713,'regional-extent-proof',saved.config,saved);resumed.attach(resumedWorld,saved);
  assert.equal(canonical(resumed.generator.landforms!.at(at(4800,4800))),canonical(plan));
  assert.equal(canonical(resumed.generator.terrainAt(q)),canonical(mass.generator.terrainAt(q)));
  assert.deepEqual(resumedWorld.player.pos,world.player.pos);assert.equal(saved.state.terrain.length,0);
  const downgraded=copy(saved);downgraded.schema=12;assert.throws(()=>new WorldMassRuntime(713,'regional-extent-proof',downgraded.config,downgraded),/Invalid worldmass checkpoint/);
  const oldConfig=copy(config);delete oldConfig.terrain.landforms!.regional;
  const oldWorld=makeSimWorld('warrior',813),oldMass=new WorldMassRuntime(713,'legacy-extents',oldConfig);oldMass.attach(oldWorld);
  assert.ok(oldMass.snapshot(oldWorld).schema<13,'omission never silently activates regional content');
});
console.log(passed+' regional extent courses passed');
