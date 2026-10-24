import { beforeWildernessPaths } from './worldmassFixtures';
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { landformHabitatSeat, landformHabitatStand } from '../src/worldmass/landformHabitats';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { nativeMassEncounters } from '../src/worldmass/encounters';
import { address, localOffset } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { regionKind } from '../src/world/regions';
import { serializeCharacter } from '../src/meta/character';

const restore=seedGlobalRandom(73381),copy=<T>(x:T):T=>JSON.parse(canonical(x));
const policy=massLandformPolicy(), at=(x:number,y:number)=>address('surface','0','0',x,y,960);
let passed=0;
function test(name:string,fn:()=>void){fn();passed++;console.log('PASS '+name);}
function config(shape=policy.shapes[0].id):MassAdventure {
  const c=copy(beforeWildernessPaths(structuredClone(massAdventure())));delete c.terrain.regionalDiscoveries;delete c.terrain.nativeRegional;
  delete c.settlement;delete c.journey;delete c.ecology;delete c.progression;delete c.nativeCountry;delete c.geography;delete c.terrain.patches;
  c.startRadius=0;c.maxPopulation=4;c.populationRadius=1200;
  c.terrain.fields=[{id:'elevation',base:0,layers:[]}];
  c.terrain.surfaces=[{id:'flat',priority:0,when:[],region:'ground',color:'#445544',biome:'downs'}];
  c.terrain.landforms={...copy(policy),jitter:0,chance:1,recipes:[{id:'habitat-course',biomes:['downs'],when:[],shapes:[shape],barrier:{region:'drystone',color:'#555555'}}]};
  c.terrain.places=[{id:'habitat',version:1,content:'wolves',period:2880,chance:1,radius:180,jitter:0,priority:1,when:[],landformHabitat:true}];
  c.content=[{id:'wolves',source:'native/downs/landform-probe',level:1,count:4,table:[{id:'plains_wolf',weight:1}]}];
  return c;
}
function start(c=config(),seed=713) {
  const w=makeSimWorld('warrior',seed),m=new WorldMassRuntime(seed,'landform-habitats',c);m.attach(w);
  const p=m.generator.landforms!.at(at(1440,1440))!;assert.ok(p);
  const center=localOffset(at(1440,1440),{...m.origin,x:0,y:0},960);
  w.player.pos={x:center.x,y:center.y-500};m.update(w,true);
  return {w,m,center};
}
// Independent body-vs-raster oracle, including cells touched only diagonally.
function dryBody(m:WorldMassRuntime,pos:{x:number;y:number},r:number):boolean {
  const cell=m.walk.cellSize;
  for(let y=Math.floor((pos.y-r)/cell);y<=Math.floor((pos.y+r)/cell);y++)for(let x=Math.floor((pos.x-r)/cell);x<=Math.floor((pos.x+r)/cell);x++) {
    const nearX=Math.max(x*cell,Math.min(pos.x,(x+1)*cell)),nearY=Math.max(y*cell,Math.min(pos.y,(y+1)*cell));
    if(Math.hypot(pos.x-nearX,pos.y-nearY)>=r-1e-8)continue;
    const region=regionKind(m.walk.regionAt((x+.5)*cell,(y+.5)*cell));
    if(!region?.walkable||region.blocks||region.standStatusDeep)return false;
  }
  return true;
}

test('saved opt-in composes population without erasing protected sites or historical terrain',()=>{
  const c=config(),g=new MassGenerator(makeMassRun(713,'policy',c.terrain),c.terrain);
  assert.ok(g.landforms!.at(at(1440,1440)));
  const legacy=copy(c);delete legacy.terrain.places[0].landformHabitat;
  assert.equal(new MassGenerator(makeMassRun(713,'policy',legacy.terrain),legacy.terrain).landforms!.at(at(1440,1440)),null);
  for(const invalid of [false,null,'true']) {
    const bad:any=copy(c);bad.terrain.places[0].landformHabitat=invalid;
    assert.throws(()=>new WorldMassRuntime(713,'invalid',bad),/landformHabitat/);
  }
  const painted=copy(c);painted.terrain.places[0].surface={region:'ground',color:'#ffffff'};
  assert.throws(()=>new WorldMassRuntime(713,'painted',painted),/landformHabitat/);
  const authored=copy(c);authored.content[0].site={name:'Protected',source:'probe/site',doodads:[],fixtures:[]};
  assert.throws(()=>new WorldMassRuntime(713,'authored',authored),/landformHabitat/);
  const protectedSite=copy(c);protectedSite.terrain.places=[...protectedSite.terrain.places,{id:'protected',version:1,content:'protected',period:2880,chance:1,radius:80,jitter:0,priority:2,when:[]}];
  assert.equal(new MassGenerator(makeMassRun(713,'protected',protectedSite.terrain),protectedSite.terrain).landforms!.at(at(1440,1440)),null);
});

test('body clearance checks wall corners and water, while bounded repair retains dry tangency',()=>{
  const grid={cellSize:30,regionAt:(x:number,y:number)=>x<30&&y<30?'drystone':'ground'};
  assert.equal(landformHabitatStand(grid,{x:35,y:35},10),false,'diagonal cell overlap');
  assert.equal(landformHabitatStand(grid,{x:45,y:15},15),true,'exact tangent');
  const wet={cellSize:30,regionAt:(x:number)=>x<30?'water':'ground'};
  assert.equal(landformHabitatStand(wet,{x:35,y:15},10),false);
  const seat=landformHabitatSeat({x:35,y:15},{x:45,y:15},90,30,q=>landformHabitatStand(wet,q,10));
  assert.ok(seat);assert.equal(landformHabitatStand(wet,seat,10),true);
  let queries=0;assert.equal(landformHabitatSeat({x:0,y:0},{x:0,y:0},100000,30,()=>{queries++;return false;}),null);
  assert.ok(queries<=4097);
});

test('all source motifs admit native packs on dry whole-body seats without changing their roster',()=>{
  let checked=0;
  for(const shape of policy.shapes) {
    const {w,m,center}=start(config(shape.id));
    const enemies=w.actors.filter(a=>a.team==='enemy');
    assert.equal(enemies.length,4,shape.id+' complete ordinary pack');
    for(const a of enemies) {
      assert.equal(a.defId,'plains_wolf');assert.equal(a.life,a.maxLife());
      assert.ok(dryBody(m,a.pos,a.radius),shape.id+' dry body '+JSON.stringify(a.pos));
      assert.ok(!w.pointInSolid(a.pos.x,a.pos.y,a.radius));
      assert.ok(Math.hypot(a.pos.x-center.x,a.pos.y-center.y)<=180);
      for(const b of enemies)if(a!==b)assert.ok(Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)>=a.radius+b.radius+2);
      checked++;
    }
  }
  assert.equal(checked,84);
});

test('native writer and Continue retain habitat casualties, wounds and anchors in their original terrain',()=>{
  const {w,m}=start(config('crypt_wings/1'));
  const group=w.actors.filter(a=>a.team==='enemy');w.kill(group[0],false,w.player);
  group[1].life=group[1].maxLife()*.37;m.update(w,true);
  const saved=serializeCharacter(w),checkpoint=saved.world!.worldmass!;
  assert.equal(checkpoint.enemies.length,3);
  const again=makeSimWorld('warrior',73382);again.adoptWorldState(saved.world);again.startWorldMass(713,checkpoint);
  again.massRuntime!.update(again,true);
  assert.deepEqual(again.massRuntime!.snapshot(again).enemies,checkpoint.enemies);
  again.player.pos={x:10000,y:10000};again.massRuntime!.update(again,true);
  again.player.pos={...checkpoint.player};again.massRuntime!.update(again,true);
  assert.deepEqual(again.massRuntime!.snapshot(again).enemies.filter(e=>checkpoint.enemies.some(p=>p.id===e.id)),checkpoint.enemies);
  assert.ok(again.massRuntime!.config.terrain.places[0].landformHabitat);
});

test('native formations compose with corridors atomically and preserve their casualty state',()=>{
  const c=config('arcade_rows/1'),encounters=nativeMassEncounters('tundra','tundra',4)!;encounters.chance=1;
  c.content[0]={...c.content[0],level:4,encounters};
  const {w,m}=start(c),group=w.actors.filter(a=>a.encounterGroup);
  assert.equal(group.length,4);assert.equal(new Set(group.map(a=>a.squadId)).size,1);
  for(const a of group)assert.ok(dryBody(m,a.pos,a.radius));
  w.kill(group.find(a=>a.squadLeader)!,false,w.player);const survivor=group.find(a=>!a.dead)!;survivor.life=survivor.maxLife()*.41;m.update(w,true);
  const saved=serializeCharacter(w),checkpoint=saved.world!.worldmass!;
  const again=makeSimWorld('warrior',73383);again.adoptWorldState(saved.world);again.startWorldMass(713,checkpoint);again.massRuntime!.update(again,true);
  assert.equal(again.actors.filter(a=>a.encounterGroup&&!a.dead).length,3);
  assert.deepEqual(again.massRuntime!.snapshot(again).enemies,checkpoint.enemies);
  const blocked=makeSimWorld('warrior',73384),bm=new WorldMassRuntime(713,'landform-habitats',c);
  blocked.pointInSolid=()=>({kind:'rock'} as any);bm.attach(blocked);blocked.player.pos={x:1440,y:940};bm.update(blocked,true);
  assert.equal(bm.population,0);assert.equal(blocked.actors.filter(a=>a.encounterGroup).length,0);
});

test('ordinary habitat composition increases real terrain density while retaining real habitats',()=>{
  let current=0,legacy=0,overlaps=0;const recipes=new Set<string>();
  for(const seed of [42,713,991]) {
    const currentSpec=copy(beforeWildernessPaths(structuredClone(massAdventure())).terrain); delete currentSpec.landforms!.regional;delete currentSpec.regionalDiscoveries;delete currentSpec.nativeRegional; // regionalExtent is surveyed separately
    const oldSpec=copy(currentSpec);
    for(const p of oldSpec.places)delete p.landformHabitat;
    const now=new MassGenerator(makeMassRun(seed,'density',currentSpec),currentSpec),old=new MassGenerator(makeMassRun(seed,'density',oldSpec),oldSpec);
    for(let y=-10;y<10;y++)for(let x=-10;x<10;x++) {
      const center=at(x*2880+1440,y*2880+1440),p=now.landforms!.at(center);
      legacy+=Number(!!old.landforms!.at(center));
      if(!p)continue;current++;recipes.add(p.recipe.id);
      const size=p.shape.rows.length*30;
      for(let yy=0;yy<size;yy+=960)for(let xx=0;xx<size;xx+=960) {
        const cell=address(p.origin.dimension,p.origin.cx,p.origin.cy,p.origin.x+xx,p.origin.y+yy,960);
        for(const place of now.placesInCell(cell))if(currentSpec.places.find(r=>r.id===place.recipe)?.landformHabitat) {
          const q=localOffset(place.center,p.origin,960);
          if(q.x>=0&&q.y>=0&&q.x<size&&q.y<size)overlaps++;
        }
      }
    }
  }
  assert.equal(legacy,61);assert.ok(current>=150);assert.ok(current>legacy*2);assert.equal(recipes.size,6);assert.ok(overlaps>30);
  console.log(JSON.stringify({legacy,current,habitatFootprintHits:overlaps,recipes:[...recipes].sort()}));
});

test('coordinated habitat repair retains final promoted body spacing',()=>{
  const c=config(),shape=copy(policy.shapes[0]);
  // A connected court isolates body separation from source corridor width.
  // The native large bodies start a little off the repair lattice; using their
  // pre-promotion peer radii admitted a 0.3986-unit physical overlap here.
  shape.rows=shape.rows.map((row,y)=>[...row].map((_,x)=>x<4||y<4||x>=row.length-4||y>=shape.rows.length-4
    ?'.':x===8&&y===8?'b':'g').join(''));
  c.terrain.landforms!.shapes=[shape];
  c.content[0].table=[{id:'primeval_cragmaw_fist',weight:1}];
  c.content[0].magicPack={source:'probe/promoted-habitat-bodies',mechanic:'footfall'};
  const w=makeSimWorld('warrior',73385),m=new WorldMassRuntime(713,'landform-habitats',c);m.attach(w);
  w.findFreeSpot=()=>({x:1441,y:1439});w.player.pos={x:1440,y:940};m.update(w,true);
  const promotedHabitatBodies=w.actors.filter(a=>a.magicPack);
  assert.equal(promotedHabitatBodies.length,4,'complete native promotion remains atomic');
  for(const a of promotedHabitatBodies){
    assert.ok(dryBody(m,a.pos,a.radius));
    for(const b of promotedHabitatBodies)if(a!==b)
      assert.ok(Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)>=a.radius+b.radius+2,'final promoted bodies retain the generation gap');
  }
});

console.log(passed+' landform habitat courses passed');
restore();
