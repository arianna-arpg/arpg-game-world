import assert from 'node:assert/strict';
import { address, moveAddress } from '../src/worldmass/address';
import type { MassSpec, MassTerrain } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassLandforms, landformCell } from '../src/worldmass/landforms';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { massDigest } from '../src/worldmass/random';

const policy=massLandformPolicy();
const flat=(biome='downs',addressSpan=960):MassSpec=>({id:'landform-integrity',version:1,addressSpan,terrainCell:30,
  fields:[{id:'elevation',base:.1,layers:[]}],surfaces:[{id:'base',when:[],priority:0,region:'ground',color:'#445533',biome}],
  places:[],landforms:{...policy,chance:1}});
const gen=(spec:MassSpec,seed=713)=>new MassGenerator(makeMassRun(seed,'integrity-proof',spec),spec);
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}

test('optimized candidates retain the captured plans and terrain at ordinary, negative and far addresses',()=>{
  // Captured from the pre-optimization implementation at a770a855, including
  // source identity, orientation and terrain provenance, not just walkability.
  const results=[];
  for(const seed of [42,713,991])for(const biome of ['downs','forest','marsh','tundra','desert']){
    const g=gen(flat(biome),seed);
    for(const at of [address('surface','0','0',1440,1440,960),address('surface','0','0',-1440,-1440,960),
      address('surface','9007199254740994','-9007199254740998',480,480,960)]){
      const p=g.landforms!.at(at);assert.ok(p,'signature must exercise an admitted plan');
      results.push([p,[0,4,12,20].flatMap(x=>[0,4,12,20].map(y=>g.terrainAt(moveAddress(p.origin,{x:x*30+15,y:y*30+15},960))))]);
    }
  }
  assert.equal(massDigest(results),'39b95bc7a6fbf3dc');
});

test('every captured shape remains sampleable with one terrain cell per address chunk',()=>{
  for(const shape of policy.shapes)for(const offset of [1440,-1440]){
    const spec=flat('downs',30);
    spec.landforms={...policy,chance:1,jitter:0,shapes:[shape],recipes:[{...policy.recipes[0],biomes:['downs'],when:[],shapes:[shape.id]}]};
    const g=gen(spec),p=g.landforms!.at(address('surface','0','0',offset,offset,30));assert.ok(p,shape.id);
    for(let y=0;y<shape.rows.length;y++)for(let x=0;x<shape.rows.length;x++){
      const at=moveAddress(p.origin,{x:x*30+15,y:y*30+15},30),cell=landformCell(p,x,y);
      assert.equal(g.landforms!.at(at)?.id,p.id,shape.id+' spans address chunks');
      assert.equal(g.terrainAt(at).region,cell==='b'?p.recipe.barrier.region:cell==='w'?'water':cell==='c'?'locale_bridge':'ground');
    }
  }
});

test('overlapping rejected seats read each pure substrate address once and release candidate-local data',()=>{
  const shape=policy.shapes.find(s=>s.id==='settlement_blocks/0')!,spec=flat();
  spec.landforms={...policy,chance:1,jitter:0,shapes:[shape],recipes:[{...policy.recipes[0],biomes:['downs'],when:[],shapes:[shape.id]}]};
  const run=makeMassRun(713,'integrity-proof',spec),reads=new Map<string,number>();
  let callCount=0;
  const land=new MassLandforms(spec,run,at=>{
    const key=JSON.stringify(at);reads.set(key,(reads.get(key)??0)+1);callCount++;
    // All four seats fail on the same shore after inspecting most of the body.
    const y=Number(at.cy)*960+at.y;
    return {region:y>=1800?'water':'ground',color:'#445533',biome:'downs',fields:{elevation:.1},
      source:{generator:spec.id,version:1,rule:'shore',source:'integrity-proof',stream:key}} satisfies MassTerrain;
  },()=>true);
  const at=address('surface','0','0',1440,1440,960);
  assert.equal(land.at(at),null);
  assert.ok(callCount>1000,'exercise substantial overlap before rejection');
  assert.ok(callCount<=shape.rows.length**2+1,'all four seats reuse one footprint');
  assert.equal(Math.max(...reads.values()),1,'pure substrate query is unique within one candidate');
  const first=callCount;land.at(at);assert.equal(callCount,first,'negative candidate cache stays hot');
  for(let x=1;x<=128;x++)land.at(address('surface','0','0',x*2880+1440,1440,960));
  assert.equal(land.stats.cached,128,'retained plans remain bounded');
  const before=callCount;land.at(at);
  assert.equal(callCount-before,first,'evicted candidate recomputes; no retained terrain memo grows with travel');
});
console.log(passed+' landform integrity courses passed');
