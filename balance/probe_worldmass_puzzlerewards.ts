import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {massAdventure,type MassAdventure} from '../src/worldmass/preset';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {validateMassRewards} from '../src/worldmass/rewards';
import {serializeCharacter,applySavedCharacter} from '../src/meta/character';
import {canonical} from '../src/worldmass/random';
import {explorationRewardOffersHtml} from '../src/ui/explorationRewards';
import type {PuzzleRun} from '../src/engine/puzzles';
import type {Actor} from '../src/engine/actor';
import type {World} from '../src/engine/world';
import {autoPlace} from '../src/engine/inventory';
import {makeSupportGemItem} from '../src/engine/gemitems';
import {SUPPORTS} from '../src/data/supports';

const guts=(w:World)=>w as unknown as {puzzles:PuzzleRun[];puzzleStruck(n:Actor,p:Actor,wounding:boolean):void;updatePuzzles(dt:number):void};
const fresh=(id='magician',legacy=false)=>{
 const w=makeSimWorld(id,42),c=structuredClone(massAdventure()) as MassAdventure;if(legacy)delete c.rewards!.earnFrom;
 new WorldMassRuntime(42,'puzzle-reward',c).attach(w);
 const p=w.massRuntime!.journey!.places.find(p=>p.content==='memorial-grove')!;
 w.landPartyAt(w.massRuntime!.journey!.local(p));w.massRuntime!.update(w,true);
 return w;
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
try{
 for(const id of ['magician','warrior','rogue']){
  const w=fresh(id),m=w.massRuntime!,r=board(w);
  m.earnPuzzleReward(w,{...r,done:true});m.earnPuzzleReward(w,r);assert.equal(m.rewards.pending,false);
  const before=canonical(m.snapshot(w)),html=explorationRewardOffersHtml(w);
  assert.equal(html,'');assert.equal(canonical(m.snapshot(w)),before,'reading UI cannot solve or pay');
  const account=canonical([...w.account.unlockedSupports]),attrs=canonical(w.meta.attrs);
  solve(w);assert.equal(m.rewards.snapshot().length,1);assert.equal(m.rewards.snapshot()[0].source,r.id);
  assert.equal(m.rewards.snapshot()[0].label,'Memorial Grove');
  assert.ok(w.explorationRewardOffers()[0].choices.every(c=>c.hosts.length),'each class earns currently compatible choices');
  assert.equal(canonical([...w.account.unlockedSupports]),account);assert.equal(canonical(w.meta.attrs),attrs);
  assert.ok(w.drops.length||w.meta.items.length,'native riddle loot still pays');
  assert.ok(w.player.statuses.length,'native attunement still pays');
  const text=explorationRewardOffersHtml(w);assert.ok(text.includes('Memorial Grove'));assert.ok(!text.includes("cache's"));
 }
 console.log('PASS three classes earn usable choices through native lattice completion; unsolved/forged identity and pure UI refuse; original loot/attunement and unlock gates remain');

 const w=fresh();solve(w);const m=w.massRuntime!,earned=canonical(m.rewards.snapshot()),pending=resume(w);
 assert.equal(canonical(pending.massRuntime!.rewards.snapshot()),earned);
 const po=pending.explorationRewardOffers()[0];assert.ok(po.choices.some(c=>c.id==='splitting'));
 pending.meta.items=[];while(autoPlace(pending.meta.items,makeSupportGemItem({def:SUPPORTS.precision,level:1}))){}
 assert.equal(pending.claimExplorationReward(po.source,'splitting'),false);assert.equal(canonical(pending.massRuntime!.rewards.snapshot()),earned);
 pending.meta.items=[];
 pending.requestMeta({t:'explorationReward',source:po.source,choiceId:'splitting'});
 const gem=pending.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='splitting')!;
 assert.ok(gem);assert.ok(pending.socketSupport(gem.uid,'firebolt'));
 assert.equal(pending.claimExplorationReward(po.source,'splitting'),false);
 const paid=resume(pending);assert.equal(paid.meta.knownSkills.get('firebolt')!.sockets[0]!.def.id,'splitting');
 assert.equal(paid.explorationRewardOffers().length,0);assert.deepEqual(paid.explorationRewardReceipts(),pending.explorationRewardReceipts());
 const contents=canonical(paid.massRuntime!.snapshot(paid).contents);
 paid.massRuntime!.earnPuzzleReward(paid,board(paid));assert.equal(paid.massRuntime!.rewards.snapshot().length,1);
 guts(paid).puzzleStruck(board(paid).nodes[0],paid.player,false);guts(paid).updatePuzzles(0);
 assert.equal(canonical(paid.massRuntime!.snapshot(paid).contents),contents);
 console.log('PASS exact pending and fitted native Continue, full-pack retry, native reward intent/socket, once-only receipt and no replayed native loot');

 const old=fresh('magician',true);solve(old);assert.equal(old.explorationRewardOffers().length,0);
 assert.equal(old.massRuntime!.snapshot(old).schema,6);const oldAgain=resume(old);assert.equal(oldAgain.explorationRewardOffers().length,0);
 const noKit=fresh();noKit.player.skills=[];solve(noKit);assert.equal(noKit.massRuntime!.rewards.snapshot().length,0);
 const noKitAgain=resume(noKit);assert.equal(noKitAgain.massRuntime!.rewards.snapshot().length,0,'restoration never retroactively mints');
 const mirror=fresh();mirror.clientActionHook=()=>{};solve(mirror);assert.equal(mirror.explorationRewardOffers().length,0);
 const sealed=fresh();sealed.zone={...sealed.zone,spoils:'none'};solve(sealed);assert.equal(sealed.explorationRewardOffers().length,0);
 const duplicate=fresh();assert.ok(duplicate.massRuntime!.rewards.earn(duplicate,'cache-already-earned','Earlier cache'));
 solve(duplicate);assert.equal(duplicate.massRuntime!.rewards.snapshot().length,1,'cache and puzzle share one budget');
 const checkpoint=m.snapshot(w);assert.equal(checkpoint.schema,7);
 assert.throws(()=>new WorldMassRuntime(42,'downgrade',checkpoint.config,{...checkpoint,schema:6}),/checkpoint/);
 for(const bad of [[],['unknown'],['puzzle','puzzle'],null,'puzzle'])
  assert.throws(()=>validateMassRewards({...massAdventure().rewards!,earnFrom:bad} as never),/triggers/);
 const puzzleOnly=fresh();assert.ok(puzzleOnly.massRuntime!.rewards.admits('puzzle'));assert.ok(puzzleOnly.massRuntime!.rewards.admits('cache'));
 console.log('PASS old descriptors never gain choices, unfit kit leaves budget free, mirrors cannot mint, cache shares budget, strict triggers and downgrade refusal');
}finally{restore();}
