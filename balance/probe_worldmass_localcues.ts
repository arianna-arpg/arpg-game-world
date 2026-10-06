import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { HoldFixture } from '../src/engine/holdObjectives';
import { bootPlacedOccSites, OCCURRENCES, type OccSite } from '../src/engine/occurrences';
import { lightwellOf } from '../src/engine/lightwells';
import { PYRE_CFG } from '../src/data/pyres';
import { RIFT_CFG } from '../src/data/rifts';
import { DIG_CFG } from '../src/data/digsites';
import { objectiveRewardXp } from '../src/data/objectiveRewards';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassHierarchy, MASS_HIERARCHY_DEFAULT } from '../src/worldmass/hierarchy';
import { MassObjectives, type MassObjectiveHost, type NativeMassHoldKind } from '../src/worldmass/objectives';
import { MassObjectiveBodies, type MassObjectiveBodiesSave } from '../src/worldmass/objectiveBodies';
import { MassNativeHost } from '../src/worldmass/nativeHost';
import type { NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import type { MassOccurrencesSave } from '../src/worldmass/occurrences';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';

type Access={pyres:HoldFixture[];rifts:HoldFixture[];digs:HoldFixture[];occs:OccSite[];updateObjective(dt:number):void;updateOccurrences(dt:number):void};
const access=(w:World)=>w as unknown as Access;
const holds=(w:World,k:NativeMassHoldKind)=>access(w)[k==='unearth'?'digs':k];
const family={pyres:{kind:PYRE_CFG.kind,done:PYRE_CFG.kindLit,radius:PYRE_CFG.radius,need:5,flare:130,transit:'pyre'},
  rifts:{kind:RIFT_CFG.kind,done:RIFT_CFG.kindSealed,radius:RIFT_CFG.radius,need:9,flare:150,transit:'rift'},
  unearth:{kind:DIG_CFG.kind,done:DIG_CFG.kindDug,radius:DIG_CFG.radius,need:3.5,flare:110,transit:'digsite'}};
// Observe the real text/XP arteries. Native level-up presentation is unrelated
// to local fixture narration and remains free to run inside the actual grant.
// Native gem reward labels likewise belong to the actual loot artery.
function observe(w:World){
  const spoken:{value:string;reward:boolean}[]=[],grants:number[]=[],text=w.text,grant=w.grantXp,gem=w.dropGemAt;let rewarding=false;
  w.text=(...args:Parameters<World['text']>)=>{spoken.push({value:args[1],reward:rewarding});return text.apply(w,args);};
  w.grantXp=(n:number)=>{grants.push(n);const prior=rewarding;rewarding=true;try{return grant.call(w,n);}finally{rewarding=prior;}};
  w.dropGemAt=(...args:Parameters<World['dropGemAt']>)=>{const prior=rewarding;rewarding=true;try{return gem.apply(w,args);}finally{rewarding=prior;}};
  w.text({...w.player.pos},'17','#fff',14);assert.equal(spoken[0].value,'17','ordinary text remains enabled');spoken.length=0;
  return {spoken,grants,silent:()=>assert.deepEqual(spoken.filter(s=>!s.reward),[],'no local narrator text may escape through real World.text')};
}
const flat=():MassAdventure=>{const base=massAdventure();return {terrain:{...base.terrain,fields:[],places:[],surfaces:[{id:'flat',priority:1,when:[],region:'ground',color:'#314232',biome:'downs'}]},theme:base.theme,content:[],startRadius:0,populationRadius:600,maxPopulation:30,pageRadius:1,samplesPerTick:256};};
const undo=seedGlobalRandom(82449);
try {
  // Real finite World callbacks: remaining counts and final banners must be
  // silent without removing the shared start flash, done face, rings or bounty.
  for(const [index,kind]of (['pyres','rifts','unearth'] as const).entries()){
    const w=makeSimWorld('warrior',83100+index),cfg=family[kind];
    const objective=kind==='pyres'?{kind,count:[2,2] as [number,number],kindleSec:cfg.need,contest:false as const}:
      kind==='rifts'?{kind,count:[2,2] as [number,number],sealSec:cfg.need,contest:false as const}:{kind,count:[2,2] as [number,number],digSec:cfg.need,contest:false as const};
    w.zone={...w.zone,id:'finite-local-cue-'+kind,objective};w.objectiveDone=false;w.flashes=[];
    const rows=[500,1050].map(x=>({pos:{x,y:600},charge:0,pourAt:0,recoup:0,doodad:{pos:{x,y:600},kind:cfg.kind,radius:cfg.radius}}));
    access(w)[kind==='unearth'?'digs':kind]=rows;w.doodads.push(...rows.map(r=>r.doodad));const seen=observe(w);
    for(const row of rows){
      w.player.pos={x:row.pos.x+50,y:row.pos.y};w.time+=.5;access(w).updateObjective(.5);
      assert.equal(row.charge,.5);assert.ok(w.dwellRingsView().some(r=>r.kind===cfg.transit&&r.frac>0&&r.frac<1));
      w.time+=cfg.need-.5;access(w).updateObjective(cfg.need-.5);assert.equal(row.charge,cfg.need);assert.equal(row.doodad.kind,cfg.done);
    }
    assert.equal(w.flashes.filter(f=>f.radius===90&&f.maxLife===.5).length,2);
    assert.equal(w.flashes.filter(f=>f.radius===cfg.flare&&f.maxLife===.8).length,2);
    assert.deepEqual(seen.grants,[objectiveRewardXp(w.zone.level)]);assert.ok(w.objectiveDone&&w.completedObjectives.has(w.zone.id));seen.silent();
    const flares=w.flashes.length;access(w).updateObjective(20);w.objectiveDone=false;access(w).updateObjective(0);
    assert.deepEqual(seen.grants,[objectiveRewardXp(w.zone.level)]);assert.equal(w.flashes.length,flares);seen.silent();
  }
  console.log('PASS finite native pyre/rift/dig first-charge flash, progress rings, completed faces/flares and once-only bounty without start/remaining/completion narration');

  // Concurrent geographic owners retain the original native timed pours,
  // opened-mound rewards/ambush and completion receipts with their visual cues.
  const w=makeSimWorld('warrior',82449),runtime=new WorldMassRuntime(74,'native-hold-bodies',flat());runtime.attach(w);w.time=100;w.flashes=[];
  const zone:ZoneDef={...structuredClone(ZONES.crossroads),id:'rift-owner-source',level:1,objective:{kind:'rifts',count:[2,2],sealSec:9},packs:{count:[1,1],size:[1,1],table:[{id:'zombie',weight:1}]}};
  let hierarchy=new MassHierarchy(runtime.generator.run.runId,74,960,MASS_HIERARCHY_DEFAULT,[{id:'native-hold',source:'data/rifts',biomes:['downs'],zone}]);
  const kinds:NativeMassHoldKind[]=['rifts','unearth','pyres'],xs=[[800,1200],[6200,6600,7000,7400],[11600,12000]];
  const owners=xs.map(x=>hierarchy.at(address('surface','0','0',x[0],800,960)).zone),points=xs.map(x=>x.map(x=>address('surface','0','0',x,800,960)));
  const local=(at:MassAddress)=>localOffset(at,{...runtime.origin,x:0,y:0},960);
  const contexts=[{source:'data/rifts',zone},{source:'data/digsites',zone:{...zone,id:'dig-owner-source',objective:{kind:'unearth',count:[4,4],digSec:3.5}} as ZoneDef},
    {source:'data/pyres',zone:{...zone,id:'pyre-owner-source',objective:{kind:'pyres',count:[2,2],kindleSec:5}} as ZoneDef}];
  let bodies:MassObjectiveBodies=new MassObjectiveBodies(w,74,{population:()=>bodies.population,maxPopulation:()=>30}),objectives=new MassObjectives(hierarchy,3);
  const seen=observe(w);let completionCalls=0,driverWords=0;
  const host:MassObjectiveHost={get now(){return w.time;},hold:{...w.massHoldHost(),text:()=>{driverWords++;}},
    installPyres:(o,f)=>w.installMassPyres(o,f),installHolds:(o,k,f)=>w.installMassHolds(o,k,f),installEffects:(o,z,f,s)=>bodies.install(o,z,f,s),
    installChest:(o,c)=>w.installMassObjectiveChest(o,c),canRetire:(f,a)=>w.canRetireMassPyres(f,a),
    complete:(o,z,label)=>{completionCalls++;w.completeMassObjective(o,z,label);}};
  owners.forEach((o,i)=>assert.ok(objectives.admit(o,points[i],host,local,contexts[i],objectives.chestWanted(o,contexts[i])?moveAddress(points[i][0],{x:0,y:170},960):undefined)));
  const step=(dt:number)=>{w.time+=dt;objectives.update(dt,host);};w.player.pos={x:-12000,y:-12000};step(0);
  const due=Math.min(...holds(w,'rifts').map(s=>s.pourAt));assert.ok(due>w.time);step(due-w.time-.001);assert.equal(bodies.population,0);step(.002);
  assert.ok(bodies.population>0);const poured=bodies.population,nextBeat=holds(w,'rifts').map(s=>s.pourAt);step(0);assert.equal(bodies.population,poured);assert.deepEqual(holds(w,'rifts').map(s=>s.pourAt),nextBeat);
  assert.ok(w.flashes.some(f=>f.radius===60&&f.maxLife===.4),'native pour flash accompanies real bodies at the scheduled beat');
  const clearThreats=()=>{for(const a of w.actors)if(a.team==='enemy'){a.dead=true;a.life=0;}};
  for(const kind of kinds)for(const row of holds(w,kind)){
    clearThreats();w.player.pos={x:row.pos.x+50,y:row.pos.y};step(.5);assert.equal(row.charge,.5);
    assert.ok(objectives.rings().some(r=>r.kind===family[kind].transit&&r.frac>0&&r.frac<1));step(family[kind].need-.5);assert.equal(row.doodad.kind,family[kind].done);
  }
  assert.equal(driverWords,0,'adapter must silence a deliberately speaking native hold host');seen.silent();
  assert.equal(w.flashes.filter(f=>f.radius===90&&f.maxLife===.5).length,8);
  for(const [i,kind]of kinds.entries())assert.equal(w.flashes.filter(f=>f.radius===family[kind].flare&&f.maxLife===.8).length,xs[i].length);
  assert.equal(lightwellOf(PYRE_CFG.kindLit)!.feed,PYRE_CFG.feed);assert.equal(completionCalls,3);assert.deepEqual(seen.grants,Array(3).fill(objectiveRewardXp(1)));
  objectives.captureEffects(host);const dig=hierarchy.controller(owners[1].id,'objective:unearth:population')!.state as MassObjectiveBodiesSave;
  assert.ok(dig.births.length>0&&dig.spills.length>0,'fixed native seed must exercise actual ambush and gem spill');
  assert.ok(w.chests.filter(c=>c.massObjectiveOwner).every(c=>objectives.chestReady(c)));
  clearThreats();w.player.pos={x:-12000,y:-12000};step(100);objectives.sync([],host,local);assert.equal(objectives.residentCount,0);
  const drops=JSON.stringify(w.drops),saved=hierarchy.snapshot();
  hierarchy=new MassHierarchy(hierarchy.run,74,960,MASS_HIERARCHY_DEFAULT,[],saved);objectives=new MassObjectives(hierarchy,3);bodies=new MassObjectiveBodies(w,74,{population:()=>bodies.population,maxPopulation:()=>30});
  objectives.sync(owners,host,local);step(20);objectives.captureEffects(host);
  const after=hierarchy.controller(owners[1].id,'objective:unearth:population')!.state as MassObjectiveBodiesSave;
  assert.deepEqual(after.spills,dig.spills);assert.equal(after.births.length,dig.births.length);assert.equal(completionCalls,3);assert.deepEqual(seen.grants,Array(3).fill(objectiveRewardXp(1)));
  assert.equal(JSON.stringify(w.drops),drops);seen.silent();
  for(const [i,kind]of kinds.entries())assert.equal(hierarchy.controller(owners[i].id,'objective:'+kind)!.receipts.length,1);
  console.log('PASS concurrent geographic visual starts/completions, original rift due clock, real dig ambush/gem drops, lightwell and exact once rewards after dormant Continue with no narrator');

  // The same shipped fracture runs through both real World and geographic
  // hosts. Telegraph cracks/rumble, spring rent/flash/wave and recurring clock
  // must all survive suppression of the two local announcement callbacks.
  for(const seamless of [false,true]){
    const world=makeSimWorld('warrior',83023+(seamless?1:0));world.time=100;const watched=observe(world);world.flashes=[];world.shake=0;
    let run:(dt:number)=>void,site:()=>{pos:{x:number;y:number};bank:number;state:string;pourAt:number};
    if(seamless){
      world.startWorldMass(42);const mass=world.massRuntime!,host=(mass as unknown as {nativeHost:MassNativeHost}).nativeHost;
      const p:NativeFeaturePlacement={id:'local-cue-fracture',origin:mass.walk.at(10000,6000),request:{id:'local-cue-fracture',seed:23,source:{kind:'massif',id:'well_court',tileset:'courtland',scope:'landform',poolIndex:1},level:5}};
      assert.ok(mass.nativeFeatures!.sync([p],host).admitted.includes(p.id));run=dt=>{world.time+=dt;mass.updateOccurrences(dt,[]);};
      site=()=>host.occurrences.views().find(v=>v.owner===p.id)!;
    }else{
      access(world).occs=bootPlacedOccSites(world.zone.id,[{id:'abyssal_fracture',x:800,y:600,floorR:100}],[OCCURRENCES.abyssal_fracture]);
      run=dt=>{world.time+=dt;access(world).updateOccurrences(dt);};site=()=>{const s=access(world).occs[0];return {...s,pos:{x:s.x,y:s.y}};};
    }
    watched.spoken.length=0;world.player.pos={...site().pos};run(13);assert.equal(site().bank,13);assert.equal(world.actors.filter(a=>a.tag==='occ_born'&&!a.dead).length,0);
    run(1);assert.equal(site().state,'armed');assert.ok(world.doodads.some(d=>d.kind==='abyss_crack'));assert.ok(world.shake>0);watched.silent();
    run(16);assert.equal(site().state,'sprung');assert.ok(world.doodads.some(d=>d.kind==='abyssal_rent'&&d.fall));assert.ok(world.flashes.some(f=>f.radius===150&&f.maxLife===.5));
    const wave=world.actors.filter(a=>a.tag==='occ_born'&&!a.dead);assert.ok(wave.length>=5&&wave.length<=8);watched.silent();
    const mass=world.massRuntime,event=()=>mass?(mass.snapshot(world).nativeFeatures!.born.find(r=>r.placement.id==='local-cue-fracture')!.changes.native as {occurrences:MassOccurrencesSave}).occurrences:null;
    if(mass)assert.equal(event()!.births.length,1);
    for(const a of wave){a.dead=true;a.life=0;}
    run(0);const clock=site().pourAt;assert.ok(clock>world.time);run(clock-world.time-.001);assert.equal(world.actors.filter(a=>a.tag==='occ_born'&&!a.dead).length,0);
    run(.002);const fresh=world.actors.filter(a=>a.tag==='occ_born'&&!a.dead);assert.ok(fresh.length>=1&&fresh.length<=2);const next=site().pourAt;run(0);assert.equal(site().pourAt,next);assert.ok(next>world.time);watched.silent();
  }
  console.log('PASS finite and generated native fracture cracks/tremor, breach/flash/full wave and exactly scheduled recurring pour remain visible without local narration; ordinary text stays enabled');
} finally {undo();}
