import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassPuzzles, nativeMassPuzzle } from '../src/worldmass/puzzles';
import { MassShrines, nativeMassShrine } from '../src/worldmass/shrines';
import { address, localOffset } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import type { MassPlace } from '../src/worldmass/contracts';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { PuzzleRun } from '../src/engine/puzzles';
import { PUZZLE_CFG } from '../src/engine/puzzles';

const hooks=(w:World)=>w as unknown as {
  puzzles:PuzzleRun[];puzzleStruck(node:Actor,striker:Actor,wounding:boolean):void;
  updatePuzzles(dt:number):void;updateShrines():void;
};
const config=structuredClone(massAdventure()) as MassAdventure;
config.shrineResidency={source:'qa/repeated-shrines',retainRadius:2048,maxResident:2};
config.puzzleResidency={source:'qa/repeated-riddles',retainRadius:2048,maxResident:2};
const content=structuredClone(config.content.find(c=>c.id==='memorial-grove')!);
content.id='country-activity';content.count=0;content.source='qa/native-country-activity';
content.site!.name='Country Riddle Court';
content.site!.doodads=[];content.site!.fixtures=[];delete content.site!.altars;delete content.site!.cache;delete content.site!.completion;
content.site!.puzzles=[nativeMassPuzzle('charged_lattice',0,0,'Kindle the whole native lattice')];
content.site!.shrines=[nativeMassShrine('swiftness',230,0)];
config.content.push(content);
config.terrain.places=[{id:'repeat-activity',version:1,content:content.id,period:4800,chance:1,radius:340,jitter:.1,when:[],priority:100,
  surface:{region:'ground',color:'#4a5944'}}];
const fresh=(configuration:MassAdventure=config)=>{const w=makeSimWorld('warrior',8101);new WorldMassRuntime(42,'country-native-activities',configuration).attach(w);w.player.invulnerable=true;return w;};
const at=(w:World,p:MassPlace)=>localOffset(p.center,{...w.massRuntime!.origin,x:0,y:0},config.terrain.addressSpan);
const enter=(w:World,p:MassPlace)=>{w.landPartyAt(at(w,p));w.massRuntime!.update(w,true);};
const away=(w:World)=>{w.player.pos={x:-62400,y:-62400};w.massRuntime!.puzzles.sync(w);w.massRuntime!.shrines.sync(w);};
const checkpoint=(w:World)=>{const saved=serializeCharacter(w),r=makeSimWorld('warrior',8102);
  assert.ok(applySavedCharacter(r,saved));assert.ok(r.adoptWorldState(saved.world));
  r.startWorldMass(saved.world!.worldmass!.state.run.seed,saved.world!.worldmass);return r;};
const getRun=(w:World,p:MassPlace)=>hooks(w).puzzles.find(r=>r.id===canonical([p.id,'puzzle','charged_lattice']))!;
const strike=(w:World,r:PuzzleRun,i:number)=>{w.time+=1;hooks(w).puzzleStruck(r.nodes[i],w.player,false);hooks(w).updatePuzzles(0);};
// Native deadlines are restored as now+remaining; subtraction may round the
// last binary place. State identity stays exact apart from this clock epsilon.
const sameCheckpoint=(actual:unknown,expected:unknown):void=>{
  if(typeof actual==='number'&&typeof expected==='number'){assert.ok(Math.abs(actual-expected)<1e-9);return;}
  if(Array.isArray(actual)&&Array.isArray(expected)){assert.equal(actual.length,expected.length);actual.forEach((v,i)=>sameCheckpoint(v,expected[i]));return;}
  if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){
    assert.deepEqual(Object.keys(actual),Object.keys(expected));
    for(const key of Object.keys(actual))sameCheckpoint(Reflect.get(actual,key),Reflect.get(expected,key));return;
  }
  assert.deepEqual(actual,expected);
};
const solve=(w:World,r:PuzzleRun)=>{
  let solution=-1;
  for(let mask=0;mask<512;mask++){
    const trial=[...r.state.lit as boolean[]];
    for(let i=0;i<9;i++)if(mask&(1<<i))for(const [dx,dy]of[[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
      const x=i%3+dx,y=Math.floor(i/3)+dy;if(x>=0&&x<3&&y>=0&&y<3)trial[y*3+x]=!trial[y*3+x];
    }
    if(trial.every(Boolean)){solution=mask;break;}
  }
  assert.ok(solution>=0);for(let i=0;i<9;i++)if(solution&(1<<i))strike(w,r,i);
  assert.ok(r.done,'native queued knocks solve the actual board');
};

const restore=seedGlobalRandom(8101);
try{
  let w=fresh(),m=w.massRuntime!;
  const places=new Map<string,MassPlace>();
  for(let x=12;places.size<28&&x<240;x+=5){
    for(const p of m.placesInCell(address('surface',String(x),'17',0,0,960)))if(p.content===content.id)places.set(p.id,p);
  }
  assert.ok(places.size>=28);const country=[...places.values()];
  const first=country[0];assert.ok(!m.journey!.places.some(p=>p.id===first.id));enter(w,first);
  let run=getRun(w,first);assert.ok(run);assert.equal(m.puzzles.population,9);
  const shrine=w.shrines.find(s=>s.massSource===canonical([first.id,'shrine','swiftness']))!;assert.ok(shrine);
  // Keep the real pending knock: leaving must not erase delivery awaiting the native drain.
  hooks(w).puzzleStruck(run.nodes[0],w.player,false);away(w);
  assert.ok(hooks(w).puzzles.includes(run));hooks(w).updatePuzzles(0);
  const partial=structuredClone(w.capturePlacedPuzzle(run));
  away(w);assert.equal(m.puzzles.residentCount,0);assert.equal(m.puzzles.population,0);
  assert.ok(run.nodes.every(n=>!w.actors.includes(n)));assert.ok(!hooks(w).puzzles.includes(run));
  assert.deepEqual(m.puzzles.snapshot(w).find(r=>r.id===run.id)!.progress,partial);
  assert.equal(m.puzzles.activity(first.id)!.complete,false);
  w.time+=25;assert.deepEqual(m.puzzles.snapshot(w).find(r=>r.id===run.id)!.progress,partial,'dormancy preserves native remaining-clock policy');
  const asleep=canonical(m.puzzles.snapshot(w));
  w=checkpoint(w);m=w.massRuntime!;
  assert.equal(m.puzzles.population,0);assert.equal(canonical(m.puzzles.snapshot(w)),asleep,'all-dormant actual character Continue keeps ownership/progress');
  enter(w,first);run=getRun(w,first);assert.ok(run);
  sameCheckpoint(w.capturePlacedPuzzle(run),partial);
  assert.equal(hooks(w).puzzles.filter(r=>r.id===run.id).length,1);
  console.log('PASS generated nonjourney owner, queued-knock retention, exact native partial progress and all-dormant character Continue');

  const enemy=w.createMonster('skeleton_warrior',1,'enemy');enemy.pos={...run.nodes[0].pos};w.actors.push(enemy);
  away(w);assert.equal(m.puzzles.residentCount,1,'near native combat participant pins the court');
  enemy.tier=1;away(w);assert.equal(m.puzzles.residentCount,0,'a separated story is not a nearby participant');
  w.actors=w.actors.filter(a=>a!==enemy);enter(w,first);run=getRun(w,first);
  const targeter=w.createMonster('skeleton_warrior',1,'enemy');targeter.pos={x:run.at.x+9000,y:run.at.y};targeter.aiTargetId=run.nodes[0].id;w.actors.push(targeter);
  away(w);assert.equal(m.puzzles.residentCount,1,'a distant native actor reference is still a dependency');
  targeter.aiTargetId=undefined;w.actors=w.actors.filter(a=>a!==targeter);away(w);assert.equal(m.puzzles.residentCount,0);
  console.log('PASS same-story participant and distant native target references prevent destructive puzzle eviction');

  enter(w,first);run=getRun(w,first);solve(w,run);
  const solved=structuredClone(w.capturePlacedPuzzle(run)),rewards=canonical(m.rewards.snapshot());
  const used=w.shrines.find(s=>s.massSource===shrine.massSource)!;
  w.player.pos={...used.pos};hooks(w).updateShrines();assert.ok(used.used);
  const texts=w.texts.length;away(w);
  assert.equal(m.puzzles.activity(first.id)!.complete,true,'dormant solved receipt remains available to bounty completion');
  assert.equal(m.shrines.residentCount,0);
  const spent=m.shrines.snapshot().find(s=>s.id===used.massSource)!;assert.ok(spent.used);assert.equal(spent.resident,false);
  assert.equal(w.texts.length,texts,'eviction executes no additional reward');
  w=checkpoint(w);m=w.massRuntime!;assert.equal(m.puzzles.activity(first.id)!.complete,true);
  enter(w,first);run=getRun(w,first);sameCheckpoint(w.capturePlacedPuzzle(run),solved);
  assert.equal(canonical(m.rewards.snapshot()),rewards);
  const sameShrine=w.shrines.find(s=>s.massSource===shrine.massSource)!;assert.ok(sameShrine.used);
  const before=w.texts.length;w.player.pos={...sameShrine.pos};hooks(w).updateShrines();assert.equal(w.texts.length,before);
  strike(w,run,0);assert.ok(run.done);assert.equal(canonical(m.rewards.snapshot()),rewards);
  console.log('PASS native solve and spent shrine survive eviction/Continue/remount without paying or applying their boon twice');

  away(w);
  for(const place of country.slice(1,28)){
    enter(w,place);assert.ok(getRun(w,place),'every generated owner admits its own native court');
    assert.ok(m.puzzles.residentCount<=2&&m.shrines.residentCount<=2);away(w);
  }
  assert.equal(m.puzzles.population,0);assert.ok(m.puzzles.snapshot(w).length>=28);
  assert.ok(m.shrines.snapshot().length>=28,'durable owner receipts are not restricted to the legacy lifetime cap');
  const all=serializeCharacter(w),corrupt=structuredClone(all.world!.worldmass!);
  corrupt.puzzles![0].progress.done=true;corrupt.puzzles![0].progress.state=[false];
  const bad=makeSimWorld('warrior',8103);
  assert.throws(()=>new WorldMassRuntime(42,'bad',corrupt.config,corrupt).attach(bad,corrupt),/lattice checkpoint|placed puzzle/,
    'dormant done flags cannot bypass the native codec and claim a bounty');
  const foreign=structuredClone(all.world!.worldmass!);foreign.shrines![0].place!.center.x+=1;
  assert.throws(()=>new WorldMassRuntime(42,'bad',foreign.config,foreign).attach(makeSimWorld('warrior',8104),foreign),/shrine|address/);
  console.log('PASS twenty-eight generated activity owners, bounded live residency, persistent sparse receipts and corrupt dormant-save refusal');

  for(const kind of ['ember','accord'] as const){
    const timed=structuredClone(config),id=kind==='ember'?'ember_ring':'twin_accord';
    timed.content.find(c=>c.id===content.id)!.site!.puzzles=[nativeMassPuzzle(id,0,0,'Keep the native voices alight',kind==='ember'?6:4)];
    let tw=fresh(timed);enter(tw,first);
    let tr=hooks(tw).puzzles.find(r=>r.spec.kind===kind)!;assert.ok(tr);
    tw.time=100;
    for(const i of kind==='ember'?[0,1]:[0,2,1])hooks(tw).puzzleStruck(tr.nodes[i],tw.player,false);
    hooks(tw).updatePuzzles(0);tw.time+=1.25;hooks(tw).updatePuzzles(0);
    const native=structuredClone(tw.capturePlacedPuzzle(tr));
    assert.ok(tr.nodes.some(n=>n.statuses.some(s=>s.id===PUZZLE_CFG.kindleStatus)));
    away(tw);assert.equal(tw.massRuntime!.puzzles.residentCount,0,'intrinsic native kindle/tone status permits exact safe release');
    tw.time+=100;tw=checkpoint(tw);enter(tw,first);tr=hooks(tw).puzzles.find(r=>r.spec.kind===kind)!;
    sameCheckpoint(tw.capturePlacedPuzzle(tr),native);
    const statuses=tr.nodes[0].statuses,own=statuses.find(s=>s.id===PUZZLE_CFG.kindleStatus)!;
    const source=own.sourceName;own.sourceName='a foreign spell';away(tw);
    assert.equal(tw.massRuntime!.puzzles.residentCount,1,'a foreign effect cannot be erased as native dressing');
    own.sourceName=source;away(tw);assert.equal(tw.massRuntime!.puzzles.residentCount,0);
    enter(tw,first);tr=hooks(tw).puzzles.find(r=>r.spec.kind===kind)!;
    tw.time+=kind==='ember'?6:2;hooks(tw).updatePuzzles(kind==='ember'?6:2);
    if(kind==='ember')assert.ok((tr.state.litUntil as number[]).every(t=>t===0));
    else{assert.deepEqual(tr.state.bound,[true,false]);assert.deepEqual(tr.state.pending,[null,null]);}
    assert.equal(tr.done,false);
    console.log('PASS '+kind+' native clock, intrinsic status, foreign-effect pinning and post-remount expiry');
  }

  const legacyShrine=new MassShrines(),legacyPuzzle=new MassPuzzles();
  assert.equal(legacyShrine.residentCount,0);assert.equal(legacyPuzzle.population,0);
  console.log('PASS policy omission retains native legacy construction');
}finally{restore();}
