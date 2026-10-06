import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { LootResult } from '../src/engine/loot';
import type { ZoneDef } from '../src/data/zones';
import type { MemoryProvenance } from '../src/engine/memories';
import { PUZZLE_CFG, PUZZLE_KINDS, type PuzzleRun } from '../src/engine/puzzles';
import { PUZZLES, type CourtShrineSpec } from '../src/data/puzzles';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { MassNativeHost } from '../src/worldmass/nativeHost';
import type { NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { canonical } from '../src/worldmass/random';

type Inner='accord'|'tempo'|'ember'|'refrain';
type Hooks={mintLootResult(at:{x:number;y:number},result:LootResult,owed:boolean,from?:string|MemoryProvenance,context?:Readonly<ZoneDef>):void;puzzles:PuzzleRun[];puzzleStruck(node:Actor,striker:Actor|null,wounding:boolean):void;updatePuzzles(dt:number):void};
const hooks=(w:World)=>w as unknown as Hooks;
const nativeHost=(w:World)=>(w.massRuntime! as unknown as {nativeHost:MassNativeHost}).nativeHost;
const fresh=(seed=42)=>{const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);w.time=100;return w;};
const request=(kind:Inner,seed:number)=>({id:'court-continuity/'+kind,seed,source:{kind:'massif' as const,id:'well_court',tileset:'courtland',scope:'landform' as const,poolIndex:1},level:11});
const same=(a:unknown,b:unknown):void=>{
  if(typeof a==='number'&&typeof b==='number'){assert.ok(Math.abs(a-b)<1e-8);return;}
  if(Array.isArray(a)&&Array.isArray(b)){assert.equal(a.length,b.length);a.forEach((v,i)=>same(v,b[i]));return;}
  if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const key of Object.keys(a))same(Reflect.get(a,key),Reflect.get(b,key));return;}
  assert.deepEqual(a,b);
};
const court=(w:World,id:string)=>{const r=hooks(w).puzzles.find(r=>r.owner===id);assert.ok(r,'actual native court must be enrolled');return r;};
const tick=(w:World,dt:number)=>{w.time+=dt;hooks(w).updatePuzzles(dt);};
const strike=(w:World,run:PuzzleRun,index:number)=>{w.time+=.41;hooks(w).puzzleStruck(run.nodes[index],w.player,false);hooks(w).updatePuzzles(0);};
const answer=(w:World,run:PuzzleRun)=>{w.player.pos={...run.at};for(let i=0;run.state.phase==='play'&&i<30;i++)tick(w,Math.max(0,(run.state.at as number)-w.time)+.001);assert.equal(run.state.phase,'answer');};
const partial=(w:World,r:PuzzleRun)=>{
  if(r.kind.id==='refrain'){answer(w,r);strike(w,r,(r.state.seq as number[])[0]);}
  else if(r.kind.id==='tempo')strike(w,r,(r.state.order as number[])[0]);
  else if(r.kind.id==='accord'){strike(w,r,0);strike(w,r,r.nodes.length/2);strike(w,r,1);}
  else strike(w,r,0);
  assert.equal(r.done,false);
};
const solve=(w:World,r:PuzzleRun)=>{
  w.player.pos={...r.at};
  if(r.kind.id==='refrain'){answer(w,r);const seq=r.state.seq as number[];for(let i=r.state.progress as number;i<seq.length;i++)strike(w,r,seq[i]);}
  else if(r.kind.id==='tempo'){const order=r.state.order as number[];for(let i=r.state.progress as number;i<order.length;i++)strike(w,r,order[i]);}
  else if(r.kind.id==='accord'){const pairs=r.nodes.length/2;for(let i=0;i<pairs;i++){strike(w,r,i);strike(w,r,i+pairs);}}
  else for(let i=0;i<r.nodes.length;i++)strike(w,r,i);
  assert.ok(r.done,'only real queued native knocks complete a court');
};
function observe(w:World){const text=w.text,spoken:string[]=[];w.text=(...args:Parameters<World['text']>)=>{if(args[4]!=='drop'&&args[4]!=='progression')spoken.push(args[1]);return text.apply(w,args);};return spoken;}
const undo=seedGlobalRandom(84712);
try {
  for(const [kind,seed]of [['accord',2],['tempo',5],['ember',6],['refrain',21]] as const){
    let w=fresh(),m=w.massRuntime!,host=nativeHost(w);const placement:NativeFeaturePlacement={id:request(kind,seed).id,origin:m.walk.at(10000,6000),request:request(kind,seed)};
    const result=m.nativeFeatures!.sync([placement],host);assert.ok(result.admitted.includes(placement.id),kind+': '+JSON.stringify(result)+' '+m.nativeFeatures!.refusals(placement.id));
    let run=court(w,placement.id);const descriptor=m.nativeFeatures!.snapshot(w.time).born.find(r=>r.placement.id===placement.id)!.descriptor;
    const row=descriptor.sidechannels!.puzzles[0],spec=row.spec as CourtShrineSpec,source=canonical(spec),oldRegistry=PUZZLES[row.id];
    assert.equal(run.spec.kind,'court_shrine');assert.equal(run.kind,PUZZLE_KINDS[kind]);assert.equal(spec.shrine.kind,kind);assert.ok(Object.isFrozen(run.spec));
    const geometry=()=>{
      assert.equal(run.at.x,spec.shrine.x+10000);assert.equal(run.at.y,spec.shrine.y+6000);assert.equal(run.nodes.length,spec.count![0]);
      run.nodes.forEach((node,i)=>{const a=spec.shrine.a0+i/run.nodes.length*Math.PI*2;assert.equal(node.defId,spec.node);same(node.pos,{x:run.at.x+Math.cos(a)*spec.shrine.ringR,y:run.at.y+Math.sin(a)*spec.shrine.ringR});});
      assert.equal(canonical(spec),source,'frozen compiler-local geometry is never translated in place');
    };geometry();
    let spoken=observe(w);w.player.pos={...run.at};
    assert.ok(w.puzzleViews().some(v=>v.id===run.id),'nearby same-story court retains its native requested detail');
    w.player.pos={x:run.at.x+PUZZLE_CFG.earshot+1,y:run.at.y};assert.ok(!w.puzzleViews().some(v=>v.id===run.id),'distant court detail does not follow the traveler');
    w.player.pos={...run.at};const story=w.player.tier;w.player.tier=1;assert.ok(!w.puzzleViews().some(v=>v.id===run.id),'court below another story is not a local view');w.player.tier=story;
    // A queued landed hit belongs to the live ring until the native drain.
    hooks(w).puzzleStruck(run.nodes[0],w.player,false);w.player.pos={x:-80000,y:-80000};
    assert.ok(m.nativeFeatures!.sync([],host).deferred.includes(placement.id));assert.ok(hooks(w).puzzles.includes(run));hooks(w).updatePuzzles(0);
    // The source factory is not allowed to query today's mutable preset again.
    PUZZLES[row.id]={kind:'unregistered-foreign-puzzle'};
    try {
      w.player.pos={...run.at};partial(w,run);run.nodes[0].life*=.67;const wound=run.nodes[0].life;
      const exact=structuredClone(w.capturePlacedPuzzle(run));
      // At an unchanged world clock actual CharacterSave Continue preserves
      // native state, wounded node and wrapped source without a second ring.
      const save=serializeCharacter(w);let next=makeSimWorld('warrior',84331);assert.ok(applySavedCharacter(next,save));assert.ok(next.adoptWorldState(save.world));next.startWorldMass(42,save.world!.worldmass);
      w=next;m=w.massRuntime!;host=nativeHost(w);m.nativeFeatures!.sync([placement],host);run=court(w,placement.id);geometry();same(w.capturePlacedPuzzle(run),exact);assert.equal(run.nodes[0].life,wound);assert.equal(hooks(w).puzzles.filter(r=>r.owner===placement.id).length,1);spoken=observe(w);
      // A remote foreign target also owns an outstanding claim on this ring.
      const foreign=w.createMonster('zombie',1,'enemy');foreign.pos={x:-70000,y:70000};foreign.aiTargetId=run.nodes[0].id;w.actors.push(foreign);
      w.player.pos={x:-80000,y:-80000};assert.ok(m.nativeFeatures!.sync([],host).deferred.includes(placement.id));foreign.aiTargetId=undefined;w.actors=w.actors.filter(a=>a!==foreign);
      // A foreign queued fixture may still name our node as its striker.
      const foreignNode=w.createMonster('ember_crystal',11,'enemy');foreignNode.puzzleNode={id:'foreign-queued-owner',idx:0};
      hooks(w).puzzleStruck(foreignNode,run.nodes[0],false);assert.equal(w.canReleasePlacedPuzzle(run),false);
      assert.ok(m.nativeFeatures!.sync([],host).deferred.includes(placement.id));hooks(w).updatePuzzles(0);
      const before=structuredClone(w.capturePlacedPuzzle(run));assert.ok(m.nativeFeatures!.sync([],host).retired.includes(placement.id));assert.ok(run.nodes.every(n=>!w.actors.includes(n)));assert.ok(!hooks(w).puzzles.includes(run));
      const gap=kind==='refrain'?((before.state as {left:number}).left+5):20;w.time+=gap;
      const sleeping=serializeCharacter(w);next=makeSimWorld('warrior',84332);assert.ok(applySavedCharacter(next,sleeping));assert.ok(next.adoptWorldState(sleeping.world));next.startWorldMass(42,sleeping.world!.worldmass);
      w=next;m=w.massRuntime!;host=nativeHost(w);m.nativeFeatures!.sync([placement],host);run=court(w,placement.id);geometry();assert.equal(run.nodes[0].life,wound);
      const after=w.capturePlacedPuzzle(run);assert.equal(after.done,false);assert.deepEqual(after.hums,[],'elapsed native hum expires instead of pinning the first returning blow');
      assert.ok(before.kindles&&after.kindles,'literal native display clocks are saved');
      same(after.kindles,kind==='refrain'?before.kindles.map(()=>0):before.kindles.map(t=>Math.max(0,t-gap)));
      if(kind==='ember')assert.ok((after.state as number[]).every(n=>n===0));
      if(kind==='accord'){const a=after.state as {bound:boolean[];pending:unknown[]},b=before.state as {bound:boolean[]};assert.deepEqual(a.bound,b.bound);assert.ok(a.pending.every(p=>p===null));}
      if(kind==='tempo'){const a=after.state as {order:number[];progress:number;left:number[]},b=before.state as typeof a;assert.deepEqual(a.order,b.order);assert.equal(a.progress,b.progress);same(a.left,b.left);}
      if(kind==='refrain'){const a=after.state as {seq:number[];phase:string;progress:number;note:number;left:number},b=before.state as {seq:number[]};assert.deepEqual(a.seq,b.seq);assert.equal(a.phase,'play');assert.equal(a.progress,0);assert.equal(a.note,0);same(a.left,.4);}
      // The paying native source owns the loot law even when the global
      // surface shell is deliberately sealed and advertises an unrelated level.
      const shell=w.zone,mint=hooks(w).mintLootResult;let minted=0;w.zone={...shell,spoils:'none',level:777};
      hooks(w).mintLootResult=function(at,result,owed,from,context){
        assert.equal(context,run.rewardZone);assert.equal(context?.level,11);assert.equal(from,run.rewardSource);
        if(result.kind==='item')assert.ok(result.item.ilvl<100,'table level must not leak from the singleton shell');
        minted++;return mint.call(w,at,result,owed,from,context);
      };
      spoken=observe(w);try{solve(w,run);}finally{w.zone=shell;hooks(w).mintLootResult=mint;}assert.ok(minted>0);assert.equal(spoken.length,0,'court phase, mistake and completion use native lights and motion, not narration');
      assert.ok(w.flashes.some(f=>run.nodes.some(n=>n.pos.x===f.pos.x&&n.pos.y===f.pos.y)&&f.maxLife===.5),'actual final native chorus flash');
      assert.ok(w.drops.length>0,'authored court table pays actual native loot');const drops=JSON.stringify(w.drops),count=w.drops.length;
      strike(w,run,0);assert.equal(w.drops.length,count);
      const settled=w.capturePlacedPuzzle(run).kindles;assert.ok(settled);
      w.player.pos={x:-80000,y:-80000};assert.ok(m.nativeFeatures!.sync([],host).retired.includes(placement.id));w.time+=2;
      const done=serializeCharacter(w);next=makeSimWorld('warrior',84333);assert.ok(applySavedCharacter(next,done));assert.ok(next.adoptWorldState(done.world));next.startWorldMass(42,done.world!.worldmass);
      w=next;m=w.massRuntime!;host=nativeHost(w);m.nativeFeatures!.sync([placement],host);run=court(w,placement.id);geometry();assert.ok(run.done);same(w.capturePlacedPuzzle(run).kindles,settled.map(t=>Math.max(0,t-2)));assert.equal(JSON.stringify(w.drops),drops);strike(w,run,0);assert.equal(JSON.stringify(w.drops),drops);
      console.log('PASS native '+kind+' court wrapper/spec/node geometry, queued/foreign pins, exact partial Continue, native timed absence and once-only authored reward');
    } finally {if(oldRegistry)PUZZLES[row.id]=oldRegistry;else delete PUZZLES[row.id];}
  }

  // A failure after court enrollment is rollback, not normal retirement. The
  // nearby hero would correctly veto streaming; it must not strand this group.
  const w=fresh(),m=w.massRuntime!,host=nativeHost(w),p:NativeFeaturePlacement={id:'court-atomic-proof',origin:m.walk.at(10000,6000),request:{...request('ember',6),id:'court-atomic-proof'}};
  w.player.pos={x:11354,y:7408};const actors=[...w.actors],scenery=[...w.doodads],runs=[...hooks(w).puzzles],population=host.population;
  const limit=host.policy.maxPopulation;host.policy.maxPopulation=()=>host.policy.population()+5;
  try{assert.ok(m.nativeFeatures!.sync([p],host).deferred.includes(p.id));assert.deepEqual(w.actors,actors);assert.deepEqual(w.doodads,scenery);assert.deepEqual(hooks(w).puzzles,runs);assert.equal(host.population,population);}
  finally{host.policy.maxPopulation=limit;}
  const prepare=host.occurrences.prepare;
  host.occurrences.prepare=()=>({mount:()=>{throw Error('injected second-controller mount failure');},actors:()=>new Set(),capture:()=>{throw Error('unmounted');},canRetire:()=>true,detach:()=>{},update:()=>{}});
  try{assert.throws(()=>m.nativeFeatures!.sync([p],host),/injected second-controller mount failure/);}finally{host.occurrences.prepare=prepare;}
  assert.deepEqual(w.actors,actors);assert.deepEqual(w.doodads,scenery);assert.deepEqual(hooks(w).puzzles,runs);assert.equal(host.population,population);
  assert.ok(m.nativeFeatures!.sync([p],host).admitted.includes(p.id),'same durable feature can retry after complete rollback');
  console.log('PASS failed composite enrollment rolls back all new court actors/controller/scenery despite nearby hero and admits exactly once on retry');

  {
    // Seed9 has an unsupported burial urn beside its guards. Its complete
    // feature must stay refused; do not strip the urn to exhibit its puzzle.
    const g=fresh(),mass=g.massRuntime!,h=nativeHost(g),blockedId='court-garrison-refused';
    const blocked:NativeFeaturePlacement={id:blockedId,origin:mass.walk.at(10000,6000),request:{...request('refrain',9),id:blockedId}};
    const actors=[...g.actors],decor=[...g.doodads];assert.ok(mass.nativeFeatures!.sync([blocked],h).deferred.includes(blockedId));
    assert.ok(mass.nativeFeatures!.refusals(blockedId).includes('capability:doodad:burial_urn'));assert.deepEqual(g.actors,actors);assert.deepEqual(g.doodads,decor);
    // Seed31 is an unchanged native refrain court with its own actual guard
    // cohort and supported scenery. Every sibling shares one feature owner.
    const id='court-garrison-continuity',place:NativeFeaturePlacement={id,origin:mass.walk.at(10000,6000),request:{...request('refrain',31),id}};
    assert.ok(mass.nativeFeatures!.sync([place],h).admitted.includes(id));const r=court(g,id);assert.equal(r.kind.id,'refrain');
    type GuardReceipt={slot:string;actorId:number;monster:string;dead:boolean;life:number;pos:{x:number;y:number}};
    const receipts=()=>((mass.nativeFeatures!.snapshot(g.time).born.find(b=>b.placement.id===id)!.changes.native) as {bodies:GuardReceipt[]}).bodies;
    const first=receipts(),guards=first.filter(b=>b.slot.startsWith('garrison/')&&!b.dead).map(b=>g.actors.find(a=>a.id===b.actorId)!);
    assert.ok(guards.length>=3);assert.ok(guards.every(Boolean));guards[0].life*=.61;partial(g,r);
    const bodySummary=(rows:GuardReceipt[])=>rows.map(b=>({slot:b.slot,monster:b.monster,dead:b.dead,life:b.life,pos:b.pos}));
    const affiliations=(rows:Actor[])=>rows.map(a=>({slot:a.garrison?.slotId??null,tag:a.tag??null,team:a.team,peers:rows.map(b=>a.squadId!==undefined&&a.squadId===b.squadId)}));
    const expected=bodySummary(receipts()),groups=affiliations(guards),progress=g.capturePlacedPuzzle(r);
    g.player.pos={x:-80000,y:-80000};assert.ok(mass.nativeFeatures!.sync([],h).retired.includes(id));assert.ok([...guards,...r.nodes].every(a=>!g.actors.includes(a)));
    const save=serializeCharacter(g),resumed=makeSimWorld('warrior',84334);assert.ok(applySavedCharacter(resumed,save));assert.ok(resumed.adoptWorldState(save.world));resumed.startWorldMass(42,save.world!.worldmass);
    const country=resumed.massRuntime!,owner=nativeHost(resumed);assert.ok(country.nativeFeatures!.sync([place],owner).admitted.includes(id));
    const saved=(country.nativeFeatures!.snapshot(resumed.time).born.find(b=>b.placement.id===id)!.changes.native) as {bodies:GuardReceipt[]};
    same(bodySummary(saved.bodies),expected);same(affiliations(saved.bodies.filter(b=>b.slot.startsWith('garrison/')&&!b.dead).map(b=>resumed.actors.find(a=>a.id===b.actorId)!)),groups);same(resumed.capturePlacedPuzzle(court(resumed,id)),progress);
    assert.equal(owner.courts.views().filter(run=>run.owner===id).length,1);assert.equal(saved.bodies.filter(b=>!b.dead).length,first.filter(b=>!b.dead).length);
    resumed.player.pos={x:-80000,y:-80000};assert.ok(country.nativeFeatures!.sync([],owner).retired.includes(id),'restored siblings do not pin one another forever');
    console.log('PASS actual garrison-bearing refrain preserves guard wounds, native affiliations and partial court through composite retirement/Continue; unsupported burial-urn source refuses whole');
  }
} finally {undo();}
