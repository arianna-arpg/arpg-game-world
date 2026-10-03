import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { nativeMassPuzzle, validateMassPuzzle } from '../src/worldmass/puzzles';
import { PUZZLES } from '../src/data/puzzles';
import type { PuzzleRun } from '../src/engine/puzzles';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

const guts=(w:World)=>w as unknown as {puzzles:PuzzleRun[];puzzleStruck(n:Actor,p:Actor,wounding:boolean):void;updatePuzzles(dt:number):void};
const grove=(w:World)=>{
 const m=w.massRuntime!,p=m.journey!.places.find(p=>p.content==='memorial-grove')!;
 w.player.pos=m.journey!.local(p);m.update(w,true);
 return {m,p};
};
const ring=(w:World,run:PuzzleRun,i:number)=>{
 w.time+=1;guts(w).puzzleStruck(run.nodes[i],w.player,false);guts(w).updatePuzzles(0);
};
const resume=(w:World)=>{
 const s=serializeCharacter(w),r=makeSimWorld('warrior',812);
 assert.ok(applySavedCharacter(r,s));assert.ok(r.adoptWorldState(s.world));
 r.startWorldMass(s.world!.worldmass!.state.run.seed,s.world!.worldmass);
 return r;
};
const restore=seedGlobalRandom(18484);
try{
 for(const seed of [1,42,451,7108,99871]){
  const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);
  const {m,p}=grove(w),run=guts(w).puzzles.find(r=>r.spec.kind==='lattice')!;
  assert.ok(run);assert.equal(run.nodes.length,9);
  assert.ok(run.nodes.every(n=>w.walk!.isWalkable(n.pos.x,n.pos.y)&&!w.pointInSolid(n.pos.x,n.pos.y,n.radius)));
  assert.equal(m.puzzles.population,9);assert.ok(m.population<=m.config.maxPopulation);
  assert.equal(w.chests.some(c=>c.rewardSource===canonical([p.id,'cache'])),false);
  assert.equal(m.config.content.find(c=>c.id===p.content)!.count,0);
  assert.equal(m.siteActivity(p.id)!.complete,false);
  const before=canonical(m.puzzles.snapshot(w));m.update(w,true);assert.equal(canonical(m.puzzles.snapshot(w)),before);
  assert.equal(guts(w).puzzles.filter(r=>r.id===run.id).length,1);
 }
 console.log('PASS five seeded physical native lattices, quiet grove, no cache/garrison substitution, bounded duplicate-free admission');

 const w=makeSimWorld('warrior',42);w.startWorldMass(42);const {m,p}=grove(w);
 const run=guts(w).puzzles.find(r=>r.spec.kind==='lattice')!,lit=()=>run.state.lit as boolean[];
 const before=[...lit()];ring(w,run,0);
 assert.deepEqual(lit(),before.map((v,i)=>[0,1,3].includes(i)?!v:v),'landed non-wounding knocks use native adjacency');
 const after=[...lit()];guts(w).puzzleStruck(run.nodes[0],w.player,false);guts(w).updatePuzzles(0);
 assert.deepEqual(lit(),after,'native hum refuses an immediate echo');
 const snapshot=m.puzzles.snapshot(w),spec=PUZZLES.charged_lattice,old=spec.scramble;
 let resumed:World;
 try{spec.scramble=[1,1];resumed=resume(w);}finally{spec.scramble=old;}
 assert.deepEqual(resumed!.massRuntime!.puzzles.snapshot(resumed!),snapshot,'exact partial board, life and remaining hum; no registry reroll');
 const rr=guts(resumed!).puzzles.find(r=>r.id===run.id)!;
 assert.deepEqual(rr.nodes.map(n=>n.tone),run.nodes.map(n=>n.tone));
 const same=canonical(resumed!.massRuntime!.puzzles.snapshot(resumed!));
 resumed!.player.pos={x:-18000,y:-18000};resumed!.massRuntime!.update(resumed!,true);
 assert.equal(canonical(resumed!.massRuntime!.puzzles.snapshot(resumed!)),same);
 assert.equal(resumed!.puzzleViews().some(r=>r.id===run.id),false,'distant placed riddles do not flood the current zone panel');
 const far=resume(resumed!);assert.deepEqual(far.massRuntime!.puzzles.snapshot(far),resumed!.massRuntime!.puzzles.snapshot(resumed!));
 far.player.pos={...rr.at};far.massRuntime!.update(far,true);
 assert.equal(guts(far).puzzles.filter(r=>r.id===run.id).length,1);
 console.log('PASS native hit adjacency/hum, exact partial and distant Continue, immutable descriptor and no remote HUD clutter');

 const board=guts(far).puzzles.find(r=>r.id===run.id)!;
 // Exhaust the tiny 3x3 fixture state space to choose a legal winning sequence;
 // each move still goes through the native knock queue and completion.
 let solution=-1;
 for(let mask=0;mask<512;mask++){
  const trial=[...board.state.lit as boolean[]];
  for(let i=0;i<9;i++)if(mask&(1<<i)){
   const x=i%3,y=Math.floor(i/3);
   for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
    const xx=x+dx,yy=y+dy;if(xx>=0&&xx<3&&yy>=0&&yy<3)trial[yy*3+xx]=!trial[yy*3+xx];
   }
  }
  if(trial.every(Boolean)){solution=mask;break;}
 }
 assert.ok(solution>=0,'native scramble stays solvable');
 const nativeText=far.texts.length;
 for(let i=0;i<9;i++)if(solution&(1<<i))ring(far,board,i);
 assert.equal(board.done,true);assert.equal(far.massRuntime!.siteActivity(p.id)!.complete,true);
 assert.ok(far.texts.length>nativeText,'native completion announces its result');
 assert.ok(far.player.statuses.length>0,'native finishing-tone wash executes');
 const resolved=far.massRuntime!.puzzles.snapshot(far),contents=canonical(far.massRuntime!.snapshot(far).contents);
 const done=resume(far);assert.deepEqual(done.massRuntime!.puzzles.snapshot(done),resolved);
 assert.equal(canonical(done.massRuntime!.snapshot(done).contents),contents,'restoration cannot replay loot');
 const final=guts(done).puzzles.find(r=>r.id===run.id)!;ring(done,final,0);
 assert.equal(final.done,true);assert.deepEqual(final.state.lit,Array(9).fill(true));
 assert.equal(canonical(done.massRuntime!.snapshot(done).contents),contents,'solved strikes cannot pay again');
 console.log('PASS legitimate native solve and finishing wash, solved progress/loot Continue and one-shot reward latch');

 const legacy=structuredClone(massAdventure()) as MassAdventure;
 for(const c of legacy.content)if(c.site)delete c.site.puzzles;
 const oldWorld=makeSimWorld('warrior',840);new WorldMassRuntime(42,'old-puzzle',legacy).attach(oldWorld);
 assert.equal(oldWorld.massRuntime!.snapshot(oldWorld).schema,3);
 assert.equal(resume(oldWorld).massRuntime!.puzzles.population,0);
 const saved=m.snapshot(w);assert.equal(saved.schema,4);
 assert.throws(()=>new WorldMassRuntime(42,'bad',saved.config,{...saved,schema:3}),/checkpoint/);
 const unknown=structuredClone(saved);unknown.puzzles![0].id='foreign';
 assert.throws(()=>new WorldMassRuntime(42,'bad',unknown.config,unknown).attach(makeSimWorld('warrior',845),unknown),/Unknown worldmass puzzle/);
 const bad=structuredClone(saved);bad.puzzles![0].progress.state=[true];
 assert.throws(()=>new WorldMassRuntime(42,'bad',bad.config,bad).attach(makeSimWorld('warrior',846),bad),/lattice checkpoint/);
 const c=structuredClone(massAdventure()) as MassAdventure;c.maxPopulation=8;
 const small=makeSimWorld('warrior',841);new WorldMassRuntime(42,'small',c).attach(small);grove(small);
 assert.equal(small.massRuntime!.puzzles.population,0,'never admit part of a nine-node board');
 const row=nativeMassPuzzle('charged_lattice',0,0,'Kindle the whole board');
 assert.throws(()=>validateMassPuzzle({...row,spec:{...row.spec,scramble:[0,0]}},330),/Unsupported/);
 assert.throws(()=>validateMassPuzzle({...row,spec:{...row.spec,kind:'refrain'}},330),/Unsupported/);
 assert.throws(()=>validateMassPuzzle({...row,x:300},330),/exceeds/);
 const repeated=structuredClone(massAdventure()) as MassAdventure;
 repeated.terrain.places=[...repeated.terrain.places,{...repeated.terrain.places[0],id:'unbounded-puzzle',content:'memorial-grove',radius:330}];
 assert.throws(()=>new WorldMassRuntime(42,'repeated',repeated),/finite journey owner/);
 console.log('PASS legacy descriptors unchanged, schema downgrade and invalid owner/progress/geometry refuse, atomic shared-budget admission');
}finally{restore();}
