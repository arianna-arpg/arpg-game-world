import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PROGRESSION } from '../src/data/classes';
import { objectiveRewardXp } from '../src/data/objectiveRewards';
import { massAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { localOffset } from '../src/worldmass/address';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { Actor } from '../src/engine/actor';
import type { MassPlace } from '../src/worldmass/contracts';
const restore=seedGlobalRandom(71123);
const natives=(m:WorldMassRuntime)=>(m as unknown as {natives:Map<string,Actor>}).natives;
const earned=(w:ReturnType<typeof makeSimWorld>)=>w.meta.xp+
 Array.from({length:w.player.level-1},(_,i)=>PROGRESSION.xpForLevel(i+1)).reduce((a,b)=>a+b,0);
const find=(m:WorldMassRuntime,kind:string):MassPlace=>{
 const span=m.config.terrain.addressSpan;
 for(let ring=1;ring<=10;ring++)for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++){
  if(Math.max(Math.abs(x),Math.abs(y))!==ring)continue;
  const p=m.placesInCell(m.walk.at(x*span,y*span)).find(p=>p.content===kind);
  if(p)return p;
 }throw Error('No naturally generated '+kind);
};
for(const seed of [42,81,142])for(const kind of ['wayside-camp','pillaged-ruin']){
 const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);const m=w.massRuntime!,p=find(m,kind);
 const center=localOffset(p.center,{...m.origin,x:0,y:0},m.config.terrain.addressSpan);
 w.landPartyAt(center);m.update(w,true);
 const row=m.config.content.find(c=>c.id===kind)!,slots=Array.from({length:row.count},(_,i)=>canonical([p.id,i]));
 assert.ok(slots.every(id=>natives(m).has(id)));
 const guards=slots.filter(id=>m.state.claimed('site-guardian',id));assert.ok(guards.length>=1);
 const c=w.chests.find(c=>c.rewardSource===canonical([p.id,'cache']))!;assert.ok(c);
 assert.match(m.siteActivity(p.id)!.text,/remaining/);assert.equal(m.cacheHoldRate(w,c),1);
 const target=natives(m).get(guards[0])!;target.life*=.6;
 if(guards.length>1)w.kill(natives(m).get(guards[1])!,false,w.player);
 m.update(w,true);assert.ok(!m.siteCleared(p.id));
 const save=serializeCharacter(w),next=makeSimWorld('warrior',seed+1);
 assert.ok(next.adoptWorldState(save.world));next.startWorldMass(seed,save.world!.worldmass);applySavedCharacter(next,save);
 const n=next.massRuntime!;assert.ok(n);assert.equal(natives(n).get(guards[0])!.life,target.life);
 assert.equal(n.siteActivity(p.id)!.text,m.siteActivity(p.id)!.text);
 for(const id of guards){const a=natives(n).get(id);if(a&&!a.dead)next.kill(a,false,next.player);}
 const before=earned(next);n.update(next,true);
 assert.equal(earned(next)-before,objectiveRewardXp(n.populationFor(p).level,row.site!.completion!));
 assert.ok(n.siteCleared(p.id));const after=earned(next);n.update(next,true);assert.equal(earned(next),after);
 const cache=next.chests.find(x=>x.rewardSource===c.rewardSource)!;
 next.player.pos={...cache.pos};
 for(const a of next.actors)if(a!==next.player&&!a.dead)a.pos={x:50000,y:50000};
 assert.equal(n.cacheHoldRate(next,cache),cache.maxLock/.35);
 const foreign=next.createMonster('zombie',2,'enemy');foreign.pos={x:cache.pos.x+80,y:cache.pos.y};next.actors.push(foreign);
 assert.equal(n.cacheHoldRate(next,cache),1);foreign.pos.x+=3000;
 const tick=(dt:number)=>(next as unknown as {updateChests(dt:number):void}).updateChests(dt);
 tick(.3);assert.ok(!cache.opened);tick(.06);assert.ok(cache.opened);
 const drops=next.drops.length;tick(5);assert.equal(next.drops.length,drops);
 assert.match(n.siteActivity(p.id)!.text,/Garrison defeated.*Cache searched/);
 console.log('PASS natural '+kind+' seed '+seed+': native eligible guards, wounded Continue, once-only XP and pressured/quiet cache');
}
const old=structuredClone(massAdventure());
for(const c of old.content)if(['wayside-camp','pillaged-ruin'].includes(c.id)){
 delete c.site!.completion;delete c.site!.cache!.clearedHoldSeconds;
}
const w=makeSimWorld('warrior',9),m=new WorldMassRuntime(42,'legacy-country',old);m.attach(w);
const p=find(m,'pillaged-ruin');w.landPartyAt(localOffset(p.center,{...m.origin,x:0,y:0},m.config.terrain.addressSpan));m.update(w,true);
const c=w.chests.find(c=>c.rewardSource===canonical([p.id,'cache']))!;
const save=serializeCharacter(w),next=makeSimWorld('warrior',10);
assert.ok(next.adoptWorldState(save.world));next.startWorldMass(42,save.world!.worldmass);applySavedCharacter(next,save);
assert.equal(next.massRuntime!.config.content.find(c=>c.id==='pillaged-ruin')!.site!.completion,undefined);
assert.equal(next.massRuntime!.cacheHoldRate(next,next.chests.find(x=>x.rewardSource===c.rewardSource)!),1);
console.log('PASS omitted existing expedition clearance and cache policies remain unchanged');
restore();
