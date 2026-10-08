import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { massLandformDressing, landformDressingClear } from '../src/worldmass/landformDressing';
import { validateMassEcology } from '../src/worldmass/ecology';
import { blocksMovement, blocksProjectiles, blocksSightOf, doodadRuleOf } from '../src/engine/levelgen';
import { landformCell } from '../src/worldmass/landforms';
import { address, localOffset, moveAddress, cellKey } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
const copy=<T>(value:T):T=>JSON.parse(canonical(value));
let passed=0;
function test(name:string,fn:()=>void){fn();passed++;console.log('PASS '+name);}
function config(biome='downs',dressed=true):MassAdventure {
  const native=copy(massAdventure()), policy=native.terrain.landforms!;
  policy.chance=1;
  return {terrain:{id:'landform-dressing-proof',version:1,addressSpan:960,terrainCell:30,
    fields:[{id:'elevation',base:.1,layers:[]}],places:[],landforms:policy,
    surfaces:[{id:'flat',biome,region:'ground',color:'#556644',priority:0,when:[]}]},
    theme:native.theme,content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:512,
    ecology:{source:'probe/scenery',spacing:192,rules:[{id:'ordinary',biomes:[biome],chance:1,
      pieces:[{kind:'rock',weight:1,radius:[18,22]}]}],...(dressed?{landformDressing:massLandformDressing()}:{} )}};
}
function fixture(biome='downs',dressed=true){
  const c=config(biome,dressed),w=makeSimWorld('warrior',814),m=new WorldMassRuntime(713,'dressing-proof',c);m.attach(w);
  const p=m.generator.landforms!.at(address('surface','0','0',1440,1440,960))!;assert.ok(p);
  const o=localOffset(p.origin,{...m.origin,x:0,y:0},960);
  w.player.pos=m.walk.snapToWalkable({x:o.x+p.bounds.maxX/2,y:o.y+p.bounds.maxY/2});m.update(w,true);
  const pieces=()=>w.doodads.filter(d=>m.generator.landforms!.at(m.walk.at(d.pos.x,d.pos.y))?.id===p.id);
  return {w,m,p,pieces};
}

test('saved native dressing refuses blockers, hazards, rewards and definition drift',()=>{
  validateMassEcology(config().ecology!,960);
  for(const kind of ['rock','mud','burial_urn','brush','grass','lava','unknown']) {
    const e=config().ecology!;
    e.landformDressing!.rules=[{id:'unsafe',biomes:['downs'],chance:1,pieces:[{kind,weight:1,radius:[12,20]}]}];
    e.landformDressing!.definitions=[{kind,rule:copy(doodadRuleOf(kind))}];
    assert.throws(()=>validateMassEcology(e,960),kind);
  }
  for(const change of [(d:any)=>d.definitions[0].rule.blocksMove=true,(d:any)=>d.clearance=-1,
    (d:any)=>d.definitions=[],(d:any)=>d.source='',(d:any)=>d.rules=[],(d:any)=>d.rules.push(d.rules[0])]){
    const e=config().ecology!;change(e.landformDressing);assert.throws(()=>validateMassEcology(e,960));
  }
});

test('all five climates gain native dressing without blocking paths or obscuring water crossings',()=>{
  for(const biome of ['downs','forest','desert','marsh','tundra']) {
    const {w,m,p,pieces}=fixture(biome),landformDressing=m.config.ecology!.landformDressing!,ds=pieces();
    assert.ok(ds.length>=5,biome+' needs actual regional dressing');
    const allowed=new Set(landformDressing.rules.find(r=>r.biomes.includes(biome))!.pieces.map(p=>p.kind));
    for(const d of ds) {
      assert.ok(allowed.has(d.kind));assert.ok(!blocksMovement(d)&&!blocksProjectiles(d)&&!blocksSightOf(d));
      const q=localOffset(m.walk.at(d.pos.x,d.pos.y),p.origin,960),r=d.radius+landformDressing.clearance;
      assert.ok(q.x-r>=0&&q.y-r>=0&&q.x+r<=p.bounds.maxX&&q.y+r<=p.bounds.maxY);
      // Independent circle-to-grid oracle; test rotated source cells and final ground.
      for(let y=0;y<p.shape.rows.length;y++)for(let x=0;x<p.shape.rows.length;x++) {
        const dx=Math.max(x*30-q.x,0,q.x-(x+1)*30),dy=Math.max(y*30-q.y,0,q.y-(y+1)*30);
        if(dx*dx+dy*dy>=r*r)continue;
        assert.ok('.g'.includes(landformCell(p,x,y)),d.kind+' crosses source obstruction');
        assert.notEqual(m.generator.terrainAt(moveAddress(p.origin,{x:x*30+15,y:y*30+15},960)).region,'water');
      }
    }
    console.log(JSON.stringify({biome,pieces:ds.length,kinds:[...new Set(ds.map(d=>d.kind))]}));
    const before=w.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort();
    const saved=m.snapshot(w),again=makeSimWorld('warrior',815),continued=new WorldMassRuntime(713,'dressing-proof',saved.config,saved);continued.attach(again,saved);
    assert.deepEqual(again.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort(),before);
  }
});

test('legacy omission preserves bare terrain and ordinary ecology outside landforms exactly',()=>{
  const {w,m,p,pieces}=fixture('downs',true),old=fixture('downs',false);
  assert.equal(old.pieces().length,0);assert.ok(pieces().length>0);
  const ordinary=(world:typeof w,mass:typeof m)=>world.doodads.filter(d=>!mass.generator.landforms!.at(mass.walk.at(d.pos.x,d.pos.y)))
    .map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort();
  assert.deepEqual(ordinary(w,m),ordinary(old.w,old.m));
  assert.equal(canonical(p),canonical(old.p));
});

test('native scenery removal survives eviction and cold Continue without adding terrain edits',()=>{
  const {w,m,pieces}=fixture();const removed=pieces()[0],removedKey=canonical([removed.kind,removed.pos,removed.radius,removed.rot]);
  w.doodads=w.doodads.filter(d=>d!==removed);w.markDoodadsChanged();
  const saved=m.snapshot(w);assert.ok(saved.ecology!.changes.some(([,v])=>v===null));
  const again=makeSimWorld('warrior',815),continued=new WorldMassRuntime(713,'dressing-proof',saved.config,saved);continued.attach(again,saved);
  assert.ok(!again.doodads.some(d=>canonical([d.kind,d.pos,d.radius,d.rot])===removedKey));
  assert.equal(continued.state.snapshot().terrain.length,0);
  const homeCells=[...new Map(w.doodads.map(d=>{const at=m.walk.at(d.pos.x,d.pos.y);return [cellKey(at),{dimension:at.dimension,cx:at.cx,cy:at.cy}] as const;})).values()];
  const expected=w.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort();
  w.player.pos={x:30000,y:30000};w.actors=[w.player];m.ecology!.sync(w,[]);assert.equal(w.doodads.length,0);
  m.ecology!.sync(w,homeCells);assert.deepEqual(w.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort(),expected);
  assert.ok(!w.doodads.some(d=>canonical([d.kind,d.pos,d.radius,d.rot])===removedKey));
});

test('new landform composition checkpoints refuse a downgraded schema while legacy descriptors stay readable',()=>{
  const {w,m}=fixture(),save=m.snapshot(w);assert.equal(save.schema,12);
  const downgraded=copy(save);downgraded.schema=11;
  assert.throws(()=>new WorldMassRuntime(713,'dressing-proof',save.config,downgraded),/Invalid worldmass checkpoint/);
  const legacy=fixture('downs',false),old=legacy.m.snapshot(legacy.w);assert.equal(old.schema,1);
  assert.doesNotThrow(()=>new WorldMassRuntime(713,'dressing-proof',old.config,old));
});

test('admission reads present player edits and keeps bridges, walls and deep water clear',()=>{
  const {p}=fixture('marsh');const at=moveAddress(p.origin,{x:45,y:45},960);
  const clear=(region:string)=>landformDressingClear(p,at,20,960,30,()=>region);
  assert.equal(clear('ground'),true);
  for(const region of ['sand','ice'])assert.equal(landformDressingClear(p,at,20,960,30,()=>region,[region]),true,'explicit native dry substrate');for(const region of ['water','wall','bog','lava','mud','swamp'])assert.equal(clear(region),false);
  for(let y=0;y<p.shape.rows.length;y++)for(let x=0;x<p.shape.rows.length;x++)if('bwc'.includes(landformCell(p,x,y)))
    assert.equal(landformDressingClear(p,moveAddress(p.origin,{x:x*30+15,y:y*30+15},960),1,960,30,()=> 'ground'),false);
});
console.log(passed+' landform dressing courses passed');
