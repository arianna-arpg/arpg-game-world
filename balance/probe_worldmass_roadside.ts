import { beforeMassStreaming } from './worldmassFixtures';
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassRoadside, validateMassRoadside } from '../src/worldmass/roadside';
import { canonical } from '../src/worldmass/random';
const restore=seedGlobalRandom(81042);
try{
 const counts:number[]=[];
 for(const seed of [42,81,142,812735]){
  const w=makeSimWorld('warrior',seed),m=new WorldMassRuntime(seed,'road-'+seed);m.attach(w);
  const road=m.roadside!,spec=m.config.journey!.roadside!;counts.push(road.places.length);
  assert.ok(road.places.length<=spec.maxPlaces);
  for(const p of road.places){
   const q=road.local(p),content=m.config.content.find(c=>c.id===p.content)!;
   assert.ok(m.journey!.distance(q)<.001);assert.equal(content.site,undefined);assert.equal(content.count,2);
   assert.ok(m.settlement!.distance(q.x,q.y)>=spec.townClearance+p.radius);
   assert.ok(m.journey!.places.every(other=>{const r=m.journey!.local(other);
    return Math.hypot(q.x-r.x,q.y-r.y)>=p.radius+other.radius+spec.siteClearance;}));
   assert.ok(road.places.every(other=>other===p||Math.hypot(road.local(other).x-q.x,road.local(other).y-q.y)>=spec.separation));
   assert.ok(m.placesInCell(p.center).some(other=>other.id===p.id));
  }
  const before=canonical(road.places);
  for(const p of road.places)m.state.paint({address:p.center,region:'ground',color:'#222222',cause:'player/altered-ground'});
  assert.equal(canonical(new MassRoadside(spec,m.journey!,m.settlement!,m.generator,m.walk).places),before);
 }
 assert.ok(counts.every(n=>n>0),'seed sample has no route encounters: '+counts);
 console.log('PASS four seeded routes: '+counts.join(', ')+' bounded groups, no site rewards, route/refuge/landmark spacing and immutable planning after terrain edits');
 const w=makeSimWorld('warrior',42),m=new WorldMassRuntime(42,'road-save');m.attach(w);
 const road=m.roadside!.places[0],q=m.roadside!.local(road),id=canonical([road.id,0]);
 w.landPartyAt(q);m.update(w,true);
 const natives=(m as unknown as {natives:Map<string,typeof w.player>}).natives;
 const a=natives.get(id)!;assert.ok(a);a.life=Math.max(1,a.maxLife()*.43);
 const before={monster:a.defId,life:a.life,pos:{...a.pos},anchor:{...a.aiAnchor!}};
 const hero=w.player;w.landPartyAt({x:q.x+7500,y:q.y+7500});m.update(w,true);w.landPartyAt(q);m.update(w,true);
 assert.equal(w.player,hero);assert.equal(natives.get(id),a);assert.equal(a.life,before.life);
 const save=m.snapshot(w);assert.equal(save.schema,11);
 const rw=makeSimWorld('warrior',43),rm=new WorldMassRuntime(42,'road-save',save.config,save);rm.attach(rw,save);
 assert.deepEqual(rm.roadside!.places,m.roadside!.places);
 const ra=(rm as unknown as {natives:Map<string,typeof w.player>}).natives.get(id)!;
 assert.deepEqual({monster:ra.defId,life:ra.life,pos:ra.pos,anchor:ra.aiAnchor},before);
 assert.equal(rm.sites.discovered.some(s=>s.id===road.id),false);
 assert.equal(rw.chests.some(c=>c.rewardSource===canonical([road.id,'cache'])),false);
 console.log('PASS native bodies keep identity and wounds across page travel, exact enemy birth/position/anchor on Continue, no garrison/cache/map-site loop');
 rw.kill(ra,false,rw.player);rm.update(rw,true);assert.ok(rm.state.claimed('fallen',id));
 const dead=rm.snapshot(rw),dw=makeSimWorld('warrior',44),dm=new WorldMassRuntime(42,'road-save',dead.config,dead);dm.attach(dw,dead);
 dw.landPartyAt(q);dm.update(dw,true);assert.equal((dm as unknown as {natives:Map<string,unknown>}).natives.has(id),false);
 assert.equal(dm.state.claimed('fallen',id),true);
 const legacy=beforeMassStreaming(structuredClone(massAdventure()) as MassAdventure);delete legacy.bounties;delete legacy.journey!.reservePopulation;delete legacy.journey!.roadside;delete legacy.settlement!.quests!.acceptance;delete legacy.settlement!.structurePlans;delete legacy.rewards!.earnFrom;
 for(const c of legacy.content)if(c.site)delete c.site.puzzles;
 const lw=makeSimWorld('warrior',45),lm=new WorldMassRuntime(42,'legacy-road',legacy);lm.attach(lw);
 assert.equal(lm.roadside,null);assert.equal(lm.snapshot(lw).schema,2);
 assert.throws(()=>new WorldMassRuntime(42,'road-save',save.config,{...save,schema:2}),/checkpoint/);
 const spec=massAdventure().journey!.roadside!;
 for(const change of [(s:typeof spec)=>s.radius=0,(s:typeof spec)=>s.maxPlaces=17,
  (s:typeof spec)=>s.habitats[0].content='cinderwatch',(s:typeof spec)=>s.habitats.push(s.habitats[0])]){
  const bad=structuredClone(spec);change(bad);assert.throws(()=>validateMassRoadside(bad,m.config.content),/roadside/);
 }
 console.log('PASS native death stays spent across Continue, legacy descriptors stay unchanged, schema downgrade and invalid roadside policies refuse');
}finally{restore();}
