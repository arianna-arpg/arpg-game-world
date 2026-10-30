import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { nativeMassPuzzle, validateMassPuzzle } from '../src/worldmass/puzzles';
import { PUZZLES } from '../src/data/puzzles';
import { PUZZLE_CFG, puzzleRewardOf, type PuzzleRun } from '../src/engine/puzzles';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

const guts=(w:World)=>w as unknown as {puzzles:PuzzleRun[];puzzleStruck(n:Actor,p:Actor,wounding:boolean):void;updatePuzzles(dt:number):void};
const arrive=(w:World)=>{
 const m=w.massRuntime!,place=m.journey!.places.find(p=>p.content==='windworn-shrine')!;
 w.player.pos=m.journey!.local(place);m.update(w,true);
 return {m,place,run:guts(w).puzzles.find(r=>r.spec.kind==='ember')!};
};
const knock=(w:World,r:PuzzleRun,indices:number[])=>{
 for(const i of indices)guts(w).puzzleStruck(r.nodes[i],w.player,false);
 guts(w).updatePuzzles(0);
};
const resume=(w:World)=>{
 const s=serializeCharacter(w),r=makeSimWorld('warrior',4812);
 assert.ok(applySavedCharacter(r,s));assert.ok(r.adoptWorldState(s.world));
 r.startWorldMass(s.world!.worldmass!.state.run.seed,s.world!.worldmass);return r;
};
const restore=seedGlobalRandom(18994);
try{
 for(const seed of [1,42,451,7108,99871]){
  const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);
  const {m,place,run}=arrive(w);assert.ok(run);assert.equal(run.nodes.length,6);
  assert.equal(run.spec.gutter,PUZZLE_CFG.emberGutter);assert.equal(run.spec.spill,'all');
  assert.ok(run.nodes.every(n=>w.walk!.isWalkable(n.pos.x,n.pos.y)&&!w.pointInSolid(n.pos.x,n.pos.y,n.radius)));
  assert.equal(m.config.content.find(c=>c.id===place.content)!.count,0);
  assert.equal(w.chests.some(c=>c.rewardSource===canonical([place.id,'cache'])),false);
  assert.ok(m.population<=m.config.maxPopulation);
  const before=canonical(m.puzzles.snapshot(w));m.update(w,true);assert.equal(canonical(m.puzzles.snapshot(w)),before);
  assert.equal(guts(w).puzzles.filter(r=>r.id===run.id).length,1);
 }
 console.log('PASS five seeded native ember courts, exact ring geometry, quiet activity and atomic duplicate-free admission');

 const w=makeSimWorld('warrior',42);w.startWorldMass(42);const {m,place,run}=arrive(w);
 w.time=100;knock(w,run,[0,1]);assert.equal(run.done,false);
 assert.equal((run.state.litUntil as number[]).filter(t=>t>w.time).length,2,'one broad blow can kindle multiple nodes');
 w.time+=1.25;guts(w).updatePuzzles(0);
 const before=m.puzzles.snapshot(w),savedSpec=run.spec.gutter,old=PUZZLES.ember_ring.gutter;
 let re:World;
 try{PUZZLES.ember_ring.gutter=60;re=resume(w);}finally{PUZZLES.ember_ring.gutter=old;}
 const rr=guts(re!).puzzles.find(r=>r.id===run.id)!;
 assert.equal(rr.spec.gutter,savedSpec);assert.deepEqual(re!.massRuntime!.puzzles.snapshot(re!),before);
 const remain=(rr.state.litUntil as number[])[0]-re!.time;assert.ok(Math.abs(remain-5.75)<1e-9);
 const flame=rr.nodes[0].statuses.find(s=>s.id===PUZZLE_CFG.kindleStatus)!;
 assert.ok(flame,'restored timer restores the native worn flame');
 re!.time+=6;guts(re!).updatePuzzles(6);
 assert.equal((rr.state.litUntil as number[]).filter(Boolean).length,0);
 assert.equal(rr.done,false);assert.equal(re!.massRuntime!.siteActivity(place.id)!.complete,false);
 console.log('PASS native multi-node spill, exact remaining clocks and hums, saved recipe isolation and post-Continue expiry');

 re!.player.pos={x:-18000,y:-18000};re!.massRuntime!.update(re!,true);
 const far=resume(re!);assert.deepEqual(far.massRuntime!.puzzles.snapshot(far),re!.massRuntime!.puzzles.snapshot(re!));
 assert.equal(far.puzzleViews().some(r=>r.id===run.id),false);
 assert.equal(far.massRuntime!.puzzles.snapshot(far).find(r=>r.id===run.id)!.resident,false);
 far.player.pos={...rr.at};far.massRuntime!.update(far,true);
 const fin=guts(far).puzzles.find(r=>r.id===run.id)!;assert.ok(fin);
 const nativeText=far.texts.length,nativeFlares=far.flashes.length,nativeDrops=far.drops.length;
 knock(far,fin,[0,1,2,3,4,5]);
 assert.equal(fin.done,true);assert.equal(far.texts.length,nativeText,'native light and physical loot carry completion without local narration');
 assert.ok(fin.nodes.every(n=>n.statuses.some(s=>s.id===PUZZLE_CFG.kindleStatus&&s.sourceName==='the refrain'&&s.remaining>0)),
  'every solved coal still wears its native flame');
 const flares=far.flashes.slice(nativeFlares),finish=flares.filter(f=>f.maxLife===.5);
 assert.equal(finish.length,fin.nodes.length,'exactly one native finishing flare per coal');
 for(const n of fin.nodes)assert.ok(finish.some(f=>f.pos.x===n.pos.x&&f.pos.y===n.pos.y&&f.radius===n.radius+26));
 assert.ok(far.drops.length>nativeDrops,'fixed seed exercises actual native ember_spoils on the ground');
 assert.ok(flares.some(f=>f.fx==='sparkle'&&f.radius===24&&f.maxLife===.35),'the native reward mint glints physically');
 const wash=far.player.statuses.find(s=>s.id==='attuned_lightning'&&s.sourceName==='attunement');
 assert.ok(wash);assert.equal(wash.remaining,puzzleRewardOf(fin)!.washFor,'native reward wash keeps its exact duration');
 const paid=far.massRuntime!.snapshot(far),done=resume(far);
 assert.deepEqual(done.massRuntime!.puzzles.snapshot(done),paid.puzzles);
 assert.equal(canonical(done.massRuntime!.snapshot(done).contents),canonical(paid.contents));
 assert.deepEqual(done.massRuntime!.legacyRewards.snapshot(),far.massRuntime!.legacyRewards.snapshot());
 const proof=guts(done).puzzles.find(r=>r.id===fin.id)!;
 assert.ok((proof.state.litUntil as number[]).every(t=>t===Infinity));
 assert.ok(proof.nodes.every(n=>n.statuses.some(s=>s.id===PUZZLE_CFG.kindleStatus&&s.remaining>0)));
 const resumedFlares=done.flashes.length,resumedWords=done.texts.length;
 assert.equal(done.player.statuses.some(s=>s.id==='attuned_lightning'),false,'Continue restores solved dressing without replaying the transient reward wash');
 knock(done,proof,[0,1,2,3,4,5]);
 assert.equal(canonical(done.massRuntime!.snapshot(done).contents),canonical(paid.contents));
 assert.deepEqual(done.massRuntime!.legacyRewards.snapshot(),far.massRuntime!.legacyRewards.snapshot());
 assert.equal(done.flashes.length,resumedFlares);assert.equal(done.texts.length,resumedWords);
 assert.equal(done.player.statuses.some(s=>s.id==='attuned_lightning'),false);
 console.log('PASS distant native Continue, broad-hit solve, exact coal flares/kindling, physical reward glint and wash; solved dressing survives without reward/cue/wash replay');

 const row=nativeMassPuzzle('ember_ring',0,0,'Kindle every coal',6);
 for(const spec of [{...row.spec,count:[5,6]},{...row.spec,count:[9,9]},{...row.spec,gutter:Infinity},
  {...row.spec,gutter:0},{...row.spec,grid:[3,3]},{...row.spec,kind:'refrain'}]){
  assert.throws(()=>validateMassPuzzle({...row,spec:spec as typeof row.spec},310),/Unsupported/);
 }
 assert.throws(()=>validateMassPuzzle({...row,x:200},310),/exceeds/);
 for(const state of [[-1,0,0,0,0,0],[8,0,0,0,0,0],[1,1,1,1,1,1],[0],['1',0,0,0,0,0]]){
  const bad=structuredClone(m.snapshot(w));bad.puzzles![0].progress.state=state;
  assert.throws(()=>new WorldMassRuntime(42,'bad',bad.config,bad).attach(makeSimWorld('warrior',4846),bad),/ember checkpoint/);
 }
 const c=structuredClone(massAdventure()) as MassAdventure;c.maxPopulation=5;
 const small=makeSimWorld('warrior',4841);new WorldMassRuntime(42,'small',c).attach(small);arrive(small);
 assert.equal(small.massRuntime!.puzzles.population,0,'never admit part of a six-coal ring');
 console.log('PASS bounded fixed geometry, invalid clocks/progress refuse and atomic shared population capacity');
}finally{restore();}
