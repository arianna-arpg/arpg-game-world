import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {serializeCharacter,applySavedCharacter} from '../src/meta/character';
import {canonical} from '../src/worldmass/random';
import type {PuzzleRun} from '../src/engine/puzzles';
import type {Actor} from '../src/engine/actor';
import type {World} from '../src/engine/world';
const guts=(w:World)=>w as unknown as {puzzles:PuzzleRun[];puzzleStruck(n:Actor,p:Actor,wounding:boolean):void;updatePuzzles(dt:number):void};
const fresh=(id='magician')=>{
 const w=makeSimWorld(id,42);w.startWorldMass(42);
 const m=w.massRuntime!,p=m.journey!.places.find(p=>p.content==='memorial-grove')!;
 w.landPartyAt(m.journey!.local(p));m.update(w,true);return w;
};
const board=(w:World)=>guts(w).puzzles.find(r=>r.spec.kind==='lattice')!;
const solve=(w:World)=>{
 const r=board(w);let solution=-1;
 for(let mask=0;mask<512;mask++){
  const trial=[...r.state.lit as boolean[]];
  for(let i=0;i<9;i++)if(mask&(1<<i)){
   const x=i%3,y=Math.floor(i/3);
   for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<3&&yy>=0&&yy<3)trial[yy*3+xx]=!trial[yy*3+xx];}
  }
  if(trial.every(Boolean)){solution=mask;break;}
 }
 assert.ok(solution>=0);
 for(let i=0;i<9;i++)if(solution&(1<<i)){w.time+=1;guts(w).puzzleStruck(r.nodes[i],w.player,false);guts(w).updatePuzzles(0);}
 assert.equal(r.done,true);return r;
};
const resume=(w:World)=>{
 const s=serializeCharacter(w),r=makeSimWorld('magician',43);assert.ok(applySavedCharacter(r,s));assert.ok(r.adoptWorldState(s.world));
 r.startWorldMass(s.world!.worldmass!.state.run.seed,s.world!.worldmass);return r;
};

const restore=seedGlobalRandom(9842);
try {
 for(const id of ['magician','warrior','rogue']) {
  const w=fresh(id),m=w.massRuntime!;
  const account=canonical([...w.account.unlockedSupports]),attrs=canonical(w.meta.attrs);
  solve(w);assert.equal(m.snapshot(w).rewards,undefined);
  assert.equal(canonical([...w.account.unlockedSupports]),account);assert.equal(canonical(w.meta.attrs),attrs);
  assert.ok(w.drops.length||w.meta.items.length,'native riddle loot still pays');
  assert.ok(w.player.statuses.length,'native attunement still pays');
  const again=resume(w);assert.ok(board(again).done);
  const contents=canonical(again.massRuntime!.snapshot(again).contents);
  guts(again).puzzleStruck(board(again).nodes[0],again.player,false);guts(again).updatePuzzles(0);
  assert.equal(canonical(again.massRuntime!.snapshot(again).contents),contents,'no replayed native loot');
  assert.equal(again.massRuntime!.snapshot(again).rewards,undefined);
 }
 console.log('PASS native lattice solve for three classes, ordinary loot/attunement and exact solved Continue without any support-choice issuance');
}finally{restore();}
