import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PROGRESSION } from '../src/data/classes';
import { objectiveRewardXp } from '../src/data/objectiveRewards';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { recordMassGuardian, settleMassClearance, validateMassClearance } from '../src/worldmass/clearance';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { massMap } from '../src/worldmass/paint';
import type { Actor } from '../src/engine/actor';

const restore=seedGlobalRandom(5197);
const rig=(seed=42)=>{
 const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);
 const m=w.massRuntime!,place=m.journey!.places.find(p=>p.content==='cinderwatch')!;
 w.player.pos=m.journey!.local(place);m.update(w,true);
 const content=m.config.content.find(c=>c.id===place.content)!;
 const slots=Array.from({length:content.count},(_,i)=>canonical([place.id,i]));
 const natives=(m as unknown as {natives:Map<string,Actor>}).natives;
 return {w,m,place,content,slots,natives};
};
const earned=(w:ReturnType<typeof makeSimWorld>)=>w.meta.xp+
 Array.from({length:w.player.level-1},(_,i)=>PROGRESSION.xpForLevel(i+1)).reduce((a,b)=>a+b,0);
const {w,m,place,content,slots,natives}=rig();
assert.equal(slots.length,2);assert.ok(slots.every(id=>natives.has(id)));
assert.ok(slots.every(id=>m.state.claimed('site-guardian',id)));
const cache=w.chests.find(c=>c.rewardSource===canonical([place.id,'cache']))!;
cache.opened=true;
const before=earned(w);m.update(w,true);
assert.equal(earned(w),before);assert.equal(m.siteCleared(place.id),false,'looting is not a clearance');
w.kill(natives.get(slots[0])!,false,w.player);m.update(w,true);
assert.equal(m.siteCleared(place.id),false,'one survivor keeps its place unfinished');
w.kill(natives.get(slots[1])!,false,w.player);
const killsOnly=earned(w);m.update(w,true);
assert.equal(earned(w)-killsOnly,objectiveRewardXp(m.populationFor(place).level,content.site!.completion!));
assert.ok(m.siteCleared(place.id));assert.ok(m.siteSearched(place.id));
assert.ok(massMap(m,w.player.pos).includes('Garrison defeated'));
assert.equal(w.completedObjectives.has(w.zone.id),false,'a place is not a completed global zone or quest');
const paid=earned(w);
for(let i=0;i<3;i++)m.update(w,true);
assert.equal(earned(w),paid);
console.log('PASS actual native garrison kills pay native completion XP once; chest state and shared zone objectives remain independent');

const saved=serializeCharacter(w), checkpoint=saved.world!.worldmass!;
const again=makeSimWorld('warrior',57);assert.ok(again.adoptWorldState(saved.world));
again.startWorldMass(checkpoint.state.run.seed,checkpoint);
assert.ok(again.massRuntime!.siteCleared(place.id));
assert.ok(slots.every(id=>again.massRuntime!.state.claimed('site-guardian',id)));
const resumedXp=earned(again);again.player.pos=m.journey!.local(place);again.massRuntime!.update(again,true);
assert.equal(earned(again),resumedXp);assert.ok(massMap(again.massRuntime!,again.player.pos).includes('Garrison defeated'));
assert.deepEqual(again.massRuntime!.config.content.find(c=>c.id===place.content)!.site!.completion,content.site!.completion);
console.log('PASS Continue retains eligibility, payout receipt, map state and the saved reward curve without paying again');

const partial=rig(73), found={id:partial.place.id,content:partial.place.content,center:partial.place.center};
const xp=earned(partial.w);
partial.m.state.claim('fallen',partial.slots[0]);
assert.equal(settleMassClearance(partial.w,partial.m.state,found,partial.content,()=>false,1),false);
assert.equal(earned(partial.w),xp,'a missing population slot is not a defeated guardian');
const barrel=partial.w.createMonster('barrel',1,'enemy');
recordMassGuardian(partial.w,partial.m.state,'barrel-fixture',barrel);
assert.equal(partial.m.state.claimed('site-guardian','barrel-fixture'),false);
console.log('PASS partial admission and native scenery/objective exemptions cannot manufacture a clear');

const pending=rig(81);
for(const id of pending.slots)pending.natives.get(id)!.dead=true;
pending.w.player.dead=true;pending.m.update(pending.w,true);
assert.equal(pending.m.siteCleared(pending.place.id),false,'a dead local hero cannot consume the reward');
pending.w.player.dead=false;pending.m.update(pending.w,true);
assert.equal(pending.m.siteCleared(pending.place.id),true);
console.log('PASS unavailable player leaves completion payable rather than losing it');

const oldConfig=JSON.parse(canonical(massAdventure()));
for(const c of oldConfig.content)if(c.site)delete c.site.completion;
const oldWorld=makeSimWorld('warrior',92), old=new WorldMassRuntime(42,'legacy-clearance',oldConfig);old.attach(oldWorld);
const oldPlace=old.journey!.places.find(p=>p.content==='cinderwatch')!;
oldWorld.player.pos=old.journey!.local(oldPlace);old.update(oldWorld,true);
for(const a of (old as unknown as {natives:Map<string,Actor>}).natives.values())a.dead=true;
const oldXp=earned(oldWorld);old.update(oldWorld,true);
assert.equal(earned(oldWorld),oldXp);assert.equal(old.siteCleared(oldPlace.id),false);
assert.throws(()=>validateMassClearance({source:'bad',xpBase:-1,xpPerLevel:30}));
assert.throws(()=>validateMassClearance({source:'bad',xpBase:40,xpPerLevel:Infinity}));
console.log('PASS older land keeps its original progression; malformed reward data refuses');

const authored=JSON.parse(canonical(massAdventure()));
const authoredCamp=authored.content.find((c:{id:string})=>c.id==='cinderwatch');
authoredCamp.site.completion={source:'test/authored-clear',xpBase:7,xpPerLevel:11};
// This regression requires two mandatory guardians; native wildlife can be exempt.
for(const row of [authoredCamp,...authoredCamp.levels]){row.table=[{id:'gnoll_prowler',weight:1}];delete row.limits;}
const halfWorld=makeSimWorld('warrior',119), half=new WorldMassRuntime(42,'partial-clearance',authored);half.attach(halfWorld);
const hp=half.journey!.places.find(p=>p.content==='cinderwatch')!;
halfWorld.player.pos=half.journey!.local(hp);half.update(halfWorld,true);
const hs=[0,1].map(i=>canonical([hp.id,i]));
assert.ok(hs.every(id=>half.state.claimed('site-guardian',id)));
halfWorld.kill((half as unknown as {natives:Map<string,Actor>}).natives.get(hs[0])!,false,halfWorld.player);
half.update(halfWorld,true);assert.equal(half.siteCleared(hp.id),false);
const halfSave=serializeCharacter(halfWorld), continued=makeSimWorld('warrior',120);
assert.ok(continued.adoptWorldState(halfSave.world));
continued.startWorldMass(halfSave.world!.worldmass!.state.run.seed,halfSave.world!.worldmass!);
const cm=continued.massRuntime!, remaining=(cm as unknown as {natives:Map<string,Actor>}).natives;
assert.equal(remaining.has(hs[0]),false);assert.ok(remaining.has(hs[1]));
continued.kill(remaining.get(hs[1])!,false,continued.player);
const beforeCompletion=earned(continued);cm.update(continued,true);
assert.equal(earned(continued)-beforeCompletion,18,'partial Continue uses its authored curve, not current default rewards');
assert.ok(cm.siteCleared(hp.id));
console.log('PASS unfinished garrison Continue preserves fallen slots and pays its saved custom curve on the final native kill');

// Save in the half-second between the last native kill and clearance settlement.
const late=rig();
for(const id of late.slots)late.w.kill(late.natives.get(id)!,false,late.w.player);
late.w.player.life=31;late.w.player.mana=4;
const lateSave=serializeCharacter(late.w);
assert.equal(late.m.siteCleared(late.place.id),false);
const lateResume=makeSimWorld('warrior',921);
assert.ok(applySavedCharacter(lateResume,lateSave));
assert.ok(lateResume.adoptWorldState(lateSave.world));
lateResume.startWorldMass(lateSave.world!.worldmass!.state.run.seed,lateSave.world!.worldmass!);
assert.equal(lateResume.massRuntime!.siteCleared(late.place.id),false,'building the scene cannot spend the pending receipt');
lateResume.resumeSpawn('exact',lateSave.world!.player);
const lateBefore=earned(lateResume);
lateResume.massRuntime!.update(lateResume);
assert.equal(earned(lateResume)-lateBefore,70);
assert.equal(lateResume.player.level,2);
assert.equal(lateResume.player.life,lateResume.player.maxLife(),'saved wounds cannot erase the earned level-up recovery');
assert.equal(lateResume.player.mana,lateResume.player.maxMana());
lateResume.massRuntime!.update(lateResume,true);
assert.equal(earned(lateResume)-lateBefore,70);
console.log('PASS final-kill Save/Continue pays after saved vitals restore, retaining native level-up recovery exactly once');

restore();
