import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { nativeMassPuzzle, validateMassPuzzle } from '../src/worldmass/puzzles';
import { PUZZLE_CFG, type PuzzleRun } from '../src/engine/puzzles';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { beforeMassStreaming } from './worldmassFixtures';
const guts=(w:World)=>w as unknown as {puzzles:PuzzleRun[];puzzleStruck(n:Actor,p:Actor,wounding:boolean):void;updatePuzzles(dt:number):void};
const arrive=(w:World)=>{
 const m=w.massRuntime!,p=m.journey!.places.find(p=>p.content==='paired-stones')!;
 w.player.pos=m.journey!.local(p);m.update(w,true);
 return {m,p,run:guts(w).puzzles.find(r=>r.spec.kind==='accord')!};
};
const knock=(w:World,r:PuzzleRun,indices:number[])=>{
 for(const i of indices)guts(w).puzzleStruck(r.nodes[i],w.player,false);
 guts(w).updatePuzzles(0);
};
const resume=(w:World)=>{
 const s=serializeCharacter(w),r=makeSimWorld('warrior',8931);
 assert.ok(applySavedCharacter(r,s));assert.ok(r.adoptWorldState(s.world));
 r.startWorldMass(s.world!.worldmass!.state.run.seed,s.world!.worldmass);return r;
};
const restore=seedGlobalRandom(819451);
try{
 for(const seed of [1,42,451,7108,99871]){
  const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);const {m,p,run}=arrive(w);
  assert.ok(run);assert.equal(run.nodes.length,4);assert.equal(run.spec.linger,PUZZLE_CFG.accordLinger);
  assert.equal(run.spec.spill,'all');assert.equal(run.spec.spacing,128);
  assert.ok(run.nodes.every(n=>w.walk!.isWalkable(n.pos.x,n.pos.y)&&!w.pointInSolid(n.pos.x,n.pos.y,n.radius)));
  const trail=m.journey!.trails.find(t=>t.id===p.id+'/approach')!;
  const from=m.journey!.places.find(p=>p.content==='memorial-grove')!;
  assert.deepEqual(trail.points[0],m.journey!.local(from));assert.deepEqual(trail.points.at(-1),m.journey!.local(p));
  assert.equal(m.config.content.find(c=>c.id===p.content)!.count,0);assert.ok(m.population<=m.config.maxPopulation);
  const before=canonical(m.puzzles.snapshot(w));m.update(w,true);assert.equal(canonical(m.puzzles.snapshot(w)),before);
 }
 console.log('PASS five seeded four-node native courts, physical geometry, continuous grove branch and duplicate-free shared capacity');
 // Keep the original non-retiring reservation contract under its saved policy.
 // Streaming residency and default country Continue have separate live probes.
 const crowded=makeSimWorld('warrior',99871);
 new WorldMassRuntime(99871,'expedition:99871',beforeMassStreaming(structuredClone(massAdventure()) as MassAdventure)).attach(crowded);
 const cm=crowded.massRuntime!;
 for(const pos of [{x:-6000,y:0},{x:6000,y:0},{x:0,y:-6000},{x:0,y:6000}]){crowded.player.pos=pos;cm.update(crowded,true);}
 const retained=cm.snapshot(crowded).enemies;assert.ok(retained.length>20,'fixture genuinely fills incidental encounters');
 for(const place of cm.journey!.places){
  crowded.player.pos=cm.journey!.local(place);cm.update(crowded,true);
  const site=cm.config.content.find(c=>c.id===place.content)!.site!;
  assert.ok(site.puzzles?.length?cm.puzzles.owns(place.id):crowded.chests.some(c=>c.rewardSource===canonical([place.id,'cache'])),place.content);
  assert.ok(cm.population<=cm.config.maxPopulation);
 }
 const after=cm.snapshot(crowded);
 for(const old of retained)assert.deepEqual(after.enemies.find(e=>e.id===old.id),old,'reservation never evicts or heals a retained body');
 assert.equal(after.schema,9);const again=resume(crowded);
 assert.deepEqual(again.massRuntime!.snapshot(again).enemies,after.enemies);
 assert.deepEqual(again.massRuntime!.puzzles.snapshot(again),after.puzzles);
 assert.throws(()=>new WorldMassRuntime(99871,'old',after.config,{...after,schema:7}),/checkpoint/);
 const invalid=structuredClone(massAdventure()) as MassAdventure;invalid.journey!.reservePopulation='yes' as unknown as boolean;
 assert.throws(()=>new WorldMassRuntime(99871,'invalid',invalid),/reservation/);
 console.log('PASS crowded exploration reserves every opening activity inside the same cap, exact retained bodies and Continue, strict policy and downgrade refusal');
 const w=makeSimWorld('warrior',42);w.startWorldMass(42);const {m,p,run}=arrive(w);w.time=100;
 knock(w,run,[0,2]);assert.deepEqual(run.state.bound,[true,false]);knock(w,run,[1]);
 w.time+=1.25;guts(w).updatePuzzles(0);
 const before=m.puzzles.snapshot(w),scene=canonical([w.player.pos,w.drops,run.state]),read=m.puzzles.snapshot(w);
 assert.deepEqual(read,before);assert.equal(canonical([w.player.pos,w.drops,run.state]),scene);
 const re=resume(w),rr=guts(re).puzzles.find(r=>r.id===run.id)!;
 assert.deepEqual(re.massRuntime!.puzzles.snapshot(re),before);
 const pending=rr.state.pending as ({half:number;until:number}|null)[];
 assert.ok(Math.abs(pending[1]!.until-re.time-1.75)<1e-9);
 assert.ok(rr.nodes[0].statuses.some(s=>s.id===PUZZLE_CFG.kindleStatus));
 assert.ok(rr.nodes[2].statuses.some(s=>s.id===PUZZLE_CFG.kindleStatus));
 assert.ok(rr.nodes[1].statuses.some(s=>s.id===PUZZLE_CFG.kindleStatus));
 re.time+=2;guts(re).updatePuzzles(2);assert.deepEqual(rr.state.bound,[true,false]);assert.equal((rr.state.pending as unknown[])[1],null);
 re.player.pos={x:-18000,y:-18000};re.massRuntime!.update(re,true);
 const far=resume(re);assert.deepEqual(far.massRuntime!.puzzles.snapshot(far),re.massRuntime!.puzzles.snapshot(re));
 assert.equal(far.puzzleViews().some(r=>r.id===run.id),false);
 assert.equal(far.massRuntime!.puzzles.snapshot(far).find(r=>r.id===run.id)!.resident,false);
 far.player.pos={...rr.at};far.massRuntime!.update(far,true);
 const fin=guts(far).puzzles.find(r=>r.id===run.id)!;assert.ok(fin);
 knock(far,fin,[1,3]);assert.equal(fin.done,true);assert.ok(far.massRuntime!.siteActivity(p.id)!.complete);
 assert.equal(far.massRuntime!.snapshot(far).rewards,undefined,'native riddle does not issue a retired support choice');
 const paid=far.massRuntime!.snapshot(far),done=resume(far),proof=guts(done).puzzles.find(r=>r.id===run.id)!;
 assert.deepEqual(done.massRuntime!.puzzles.snapshot(done),paid.puzzles);
 assert.equal(canonical(done.massRuntime!.snapshot(done).contents),canonical(paid.contents));
 knock(done,proof,[0,1,2,3]);assert.equal(canonical(done.massRuntime!.snapshot(done).contents),canonical(paid.contents));
 console.log('PASS matching-pair spill, partial binding, pure capture, exact pending clocks, distant Continue, expiry and once-only solved reward');
 for(const state of [null,{}, {bound:[true,false],pending:[null,{half:0,left:1}]},
  {bound:[true,false],pending:[{half:0,left:1},null]}, {bound:[true,false],pending:[null,{half:1,left:4}]},
  {bound:[true,false],pending:[null,{half:1,left:-1}]}, {bound:[true,true],pending:[null,null]},
  {bound:['yes',false],pending:[null,null]}, {bound:[true,false],pending:[null,{half:5,left:1}]}]){
  const bad=structuredClone(m.snapshot(w));bad.puzzles!.find(r=>r.id===run.id)!.progress.state=state;
  assert.throws(()=>new WorldMassRuntime(42,'bad',bad.config,bad).attach(makeSimWorld('warrior',9123),bad),/accord checkpoint/);
 }
 const row=nativeMassPuzzle('twin_accord',0,0,'Ring matching pairs',4);
 for(const spec of [{...row.spec,count:[5,5]},{...row.spec,count:[4,6]},{...row.spec,linger:0},
  {...row.spec,linger:Infinity},{...row.spec,tones:['unknown']},{...row.spec,grid:[2,2]},{...row.spec,gutter:3}]){
  assert.throws(()=>validateMassPuzzle({...row,spec:spec as typeof row.spec},350),/Unsupported/);
 }
 const tiny=structuredClone(massAdventure()) as MassAdventure;tiny.maxPopulation=3;
 const small=makeSimWorld('warrior',9152);new WorldMassRuntime(42,'small',tiny).attach(small);arrive(small);
 assert.equal(guts(small).puzzles.some(r=>r.spec.kind==='accord'),false,'never admit a partial pair court');
 const legacy=structuredClone(massAdventure()) as MassAdventure;
 delete legacy.bounties;delete legacy.journey!.reservePopulation;
 legacy.content=legacy.content.filter(c=>c.id!=='paired-stones');legacy.journey!.extensions=legacy.journey!.extensions!.filter(e=>e.content!=='paired-stones');
 const old=makeSimWorld('warrior',9124);new WorldMassRuntime(42,'legacy',legacy).attach(old);
 assert.equal(old.massRuntime!.journey!.places.length,7);assert.equal(resume(old).massRuntime!.journey!.places.length,7);
 console.log('PASS invalid partial clocks/indices/bindings, exact even geometry, atomic population and legacy map preservation');
}finally{restore();}
