import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { MassFoci, MassObserverIndex, type MassFocus } from '../src/worldmass/foci';
import { cellKey } from '../src/worldmass/address';
import { CLASSES } from '../src/data/classes';
import { NullInput } from '../src/net/intent';
import { canonical } from '../src/worldmass/random';

const undo=seedGlobalRandom(65531);
const cfg=structuredClone(massAdventure());
delete cfg.settlement;delete cfg.journey;delete cfg.ecology;delete cfg.progression;delete cfg.nativeCountry;delete cfg.geography;delete cfg.wildernessPaths;
delete cfg.terrain.patches;delete cfg.terrain.landforms;delete cfg.terrain.regionalDiscoveries;delete cfg.terrain.nativeRegional;
cfg.terrain.fields=[];
cfg.terrain.surfaces=[{id:'land',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}];
cfg.terrain.places=[{id:'focus',version:1,content:'focus',period:1800,radius:250,jitter:0,chance:1,when:[],priority:1}];
cfg.content=[{id:'focus',source:'probe/foci',count:4,level:1,table:[{id:'skeleton_warrior',weight:1}],
  site:{name:'Focus clearing',source:'probe/foci',doodads:[],fixtures:[]}}];
cfg.startRadius=0;cfg.populationRadius=600;cfg.maxPopulation=4;cfg.pageRadius=1;
const w=makeSimWorld('warrior',15),m=new WorldMassRuntime(19,'foci:19',cfg);m.attach(w);
const a:MassFocus={id:'a',pos:{x:900,y:900},tier:0},b:MassFocus={id:'b',pos:{x:6300,y:900},tier:0};
try{
  w.player.pos={...a.pos};
  m.update(w,true,[a,b]);
  let save=m.snapshot(w);
  assert.equal(m.massFoci.groups.length,2);
  assert.equal(save.enemies.length,8,'each distant cluster receives its own complete four-body budget');
  for(const focus of [a,b]){
    assert.equal(save.enemies.filter(e=>Math.hypot(e.x-focus.pos.x,e.y-focus.pos.y)<600).length,4);
    assert.ok(m.state.claimed('explored',cellKey(m.walk.at(focus.pos.x,focus.pos.y))));
    assert.ok(m.survey.known(m.walk.at(focus.pos.x,focus.pos.y)),'each actual focus reveals its own survey cell');
    assert.equal(m.availablePopulation('',focus.pos),0);
  }
  const originalSave=canonical(m.snapshot(w)), limits=[m.populationLimit(),m.populationLimit('',a.pos),m.populationLimit('',b.pos)];
  const hostBudget={total:6,floor:1};m.setPopulationBudget(hostBudget);hostBudget.total=0;
  assert.deepEqual(m.populationStats(),{total:8,groups:[{members:['a'],live:4,limit:3},{members:['b'],live:4,limit:3}]});
  assert.equal(m.populationLimit(),6);assert.equal(m.availablePopulation('',a.pos),0);
  assert.equal(canonical(m.snapshot(w)),originalSave,'host budget neither mutates land/digest nor serializes into a save');
  m.setPopulationBudget({total:0,floor:2});assert(m.populationStats().groups.every(g=>g.limit===2),'floor wins below the total budget');
  assert.equal(m.population,8,'lowering only refuses future births, never removes existing actors');
  m.setPopulationBudget({total:10000,floor:0});assert(m.populationStats().groups.every(g=>g.limit===4),'authored population remains the ceiling');
  for(const budget of [{total:NaN,floor:1},{total:-1,floor:0},{total:2.5,floor:0},{total:8,floor:5},{total:8,floor:-1}])assert.throws(()=>m.setPopulationBudget(budget),/Invalid population/);
  m.setPopulationBudget(null);
  assert.deepEqual([m.populationLimit(),m.populationLimit('',a.pos),m.populationLimit('',b.pos)],limits,'null restores original admission exactly');
  assert.equal(canonical(m.snapshot(w)),originalSave,'null returns the exact original full save');
  assert.equal(m.stream.stats.requested,18,'both disjoint nine-page neighborhoods remain requested');
  assert.equal(m.sites.discovered.length,2,'each distant player discovers their own clearing');
  const remote=w.addSeat('remote',CLASSES[0],new NullInput(),{startingCompanions:false,startingFlasks:false});
  remote.actor.pos={...b.pos};m.update(w,true);
  assert.equal(m.massFoci.groups.length,2,'ordinary remote seats automatically become runtime foci');
  assert.equal(m.stream.stats.requested,18);
  w.removeSeat('remote');m.update(w,true);
  assert.equal(m.massFoci.groups.length,1,'disconnected seats release their focus');
  m.update(w,true,[a,b]);
  const identities=save.enemies.map(e=>e.id).sort();
  m.update(w,true,[b,a]);
  assert.deepEqual(m.snapshot(w).enemies.map(e=>e.id).sort(),identities,'focus order cannot duplicate or retire the other cluster');
  const victim=w.actors.find(x=>x.defId==='skeleton_warrior'&&Math.hypot(x.pos.x-b.pos.x,x.pos.y-b.pos.y)<600)!;
  victim.dead=true;victim.life=0;m.update(w,true,[a,b]);
  assert.equal(m.snapshot(w).enemies.length,7,'a recorded casualty never respawns');
  assert.equal(m.availablePopulation('',a.pos),0);assert.equal(m.availablePopulation('',b.pos),1);
  m.update(w,true,[a,{...b,pos:{x:950,y:900}}]);
  assert.equal(m.massFoci.groups.length,1,'overlapping players share one budget');
  assert.ok(m.population>m.populationLimit('',a.pos),'merging clusters preserves existing bodies without erasing over-capacity checks');
  assert.equal(m.stream.stats.requested,9,'overlapping pages deduplicate');
  m.update(w,true,[a,b]);
  assert.equal(m.stream.stats.requested,18);
  assert.equal(m.snapshot(w).enemies.length,7,'separation retains survivor identities and casualties');
  m.update(w,true,[]);assert.equal(m.stream.stats.requested,0,'an empty shard schedules no new terrain');
  m.update(w,true,[a,b]);save=m.snapshot(w);
  const again=makeSimWorld('warrior',23),replay=new WorldMassRuntime(19,'foci:19',save.config,save);
  try{replay.attach(again,save);replay.update(again,true,[a,b]);
    assert.deepEqual(replay.snapshot(again).enemies.map(e=>[e.id,e.life]).sort(),save.enemies.map(e=>[e.id,e.life]).sort());
  }finally{replay.dispose();}
  console.log('PASS distant complete budgets, overlap, reversed order, empty shard, casualties and cold replay');

  // Schema-19 destination reservations must follow both neighborhoods, including
  // a player far from the primary seat and the opening settlement's roads.
  const wilderness=structuredClone(cfg);
  const {zone,source,apron,blend}=massAdventure().settlement!;
  wilderness.settlement={zone,source,apron,blend};
  wilderness.journey={source:'probe/focus-reservations',width:90,color:'#665544',clearingColor:'#665544',
    reservePopulation:true,nearbyReservations:true,
    destinations:[{id:'opening',content:'focus',edge:'east',distance:1800,radius:250,jitter:0}]};
  const rw=makeSimWorld('warrior',24),rm=new WorldMassRuntime(19,'foci:wilderness',wilderness);
  try{
    rm.attach(rw);const left={...a,pos:{x:9900,y:9900}},right={...b,pos:{x:15300,y:9900}};
    rw.player.pos={...left.pos};rm.update(rw,true,[left,right]);
    const born=rm.snapshot(rw);
    assert.equal(born.schema,19);
    for(const focus of [left,right])assert.equal(born.enemies.filter(e=>Math.hypot(e.x-focus.pos.x,e.y-focus.pos.y)<600).length,4,
      'each distant player admits a complete destination under nearby reservations');
    rm.update(rw,true,[right,left]);
    assert.deepEqual(rm.snapshot(rw).enemies.map(e=>e.id).sort(),born.enemies.map(e=>e.id).sort());
    console.log('PASS schema-19 destination reservations preserve complete distant player budgets and identities');
  }finally{rm.dispose();}

  const bw=makeSimWorld('warrior',25),bm=new WorldMassRuntime(19,'foci:budget',cfg);
  try {
    bm.setPopulationBudget({total:4,floor:1});bm.attach(bw);bw.player.pos={...a.pos};bm.update(bw,true,[a,b]);
    assert.equal(bm.population,0,'complete four-body cohorts cannot enter two-body group budgets');
    bm.setPopulationBudget({total:8,floor:1});bm.update(bw,true,[a,b]);assert.equal(bm.population,8,'raising restores admission to both groups');
    bm.setPopulationBudget({total:2,floor:1});bm.update(bw,true,[a,{...b,pos:{x:950,y:900}}]);
    assert.equal(bm.populationStats().groups.length,1);assert.equal(bm.populationStats().groups[0].limit,2);
    bm.update(bw,true,[a,b]);assert.equal(bm.snapshot(bw).enemies.length,8,'merge and split preserve all existing identities under a lower budget');
    bm.update(bw,true,[]);assert.deepEqual(bm.populationStats().groups,[]);assert.equal(bm.availablePopulation(),0,'empty world admits no new population');
    bm.setPopulationBudget(null);
  } finally {bm.dispose();}
  console.log('PASS transient host population limits, floors, ceiling, validation, exact reset, full cohorts and no despawn');
  const groups=new MassFoci();groups.set([a,b],600);
  assert.throws(()=>groups.set([a,a],600));
  const observers=[a.pos,b.pos,{x:-1200,y:-2200}],index=new MassObserverIndex(observers,600);
  for(let x=-2400;x<9000;x+=177)for(let y=-2800;y<2000;y+=237)for(const radius of [0,600,1500])
    assert.equal(index.near({x,y},radius),observers.some(p=>Math.hypot(p.x-x,p.y-y)<=radius));
  console.log('PASS observer broad phase matches an independent brute-force oracle across negative and distant cells');
}finally{m.dispose();undo();}
