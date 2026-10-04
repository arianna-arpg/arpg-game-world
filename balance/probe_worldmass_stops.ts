import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { MassJourney, trailStation, segmentDistance } from '../src/worldmass/journey';
import { makeMassRun, MassGenerator } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { canonical } from '../src/worldmass/random';

const restore=seedGlobalRandom(81229),cfg=massAdventure();
assert.deepEqual(trailStation([{x:0,y:0},{x:100,y:0},{x:100,y:300}],.5),
 {pos:{x:100,y:100},normal:{x:-1,y:0}});
assert.deepEqual(trailStation([{x:0,y:0},{x:0,y:0},{x:100,y:0}],1).pos,{x:100,y:0});
assert.deepEqual(trailStation([{x:0,y:0},{x:100,y:0},{x:100,y:0}],1).pos,{x:100,y:0});
assert.throws(()=>trailStation([{x:0,y:0}],.5));
assert.throws(()=>trailStation([{x:0,y:0},{x:100,y:0}],NaN));
console.log('PASS route stations use arc length through bends and reject invalid geometry');

const w=makeSimWorld('warrior',42),m=new WorldMassRuntime(42,'stops',cfg);m.attach(w);
const oldConfig:MassAdventure=JSON.parse(canonical(cfg));delete oldConfig.journey!.stops;
const ow=makeSimWorld('warrior',42),old=new WorldMassRuntime(42,'stops',oldConfig);old.attach(ow);
assert.deepEqual(m.journey!.places.slice(0,6),old.journey!.places);
assert.deepEqual(m.journey!.trails.slice(0,10),old.journey!.trails);
const legacySave=old.snapshot(ow),legacyWorld=makeSimWorld('warrior',43);
const legacy=new WorldMassRuntime(42,'stops',legacySave.config,legacySave);legacy.attach(legacyWorld,legacySave);
assert.equal(legacy.journey!.places.length,6);
console.log('PASS route stops leave every original place/trail unchanged; old Continue gains no stops');

for(let seed=0;seed<64;seed++){
 const generator=new MassGenerator(makeMassRun(seed,'station-geometry',cfg.terrain),cfg.terrain);
 const state=new MassState(generator.run,cfg.terrain.terrainCell);
 const stream=new MassStream(generator,state,{maxPages:25,maxSamples:32768});
 const walk=new MassWalk(stream,m.origin);
 const journey=new MassJourney(cfg.journey!,m.settlement!,generator,walk);
 for(const stop of cfg.journey!.stops!){
  const place=journey.places.find(p=>p.recipe===stop.id)!;
  const spur=journey.trails.find(t=>t.id===place.id+'/approach')!;
  const parent=journey.places.find(p=>p.recipe===stop.from)!;
  const road=journey.trails.find(t=>t.id===parent.id+'/'+stop.trail)!;
  assert.ok(road.points.slice(1).some((p,i)=>segmentDistance(spur.points[0],road.points[i],p)<1e-6));
  assert.deepEqual(spur.points.at(-1),journey.local(place));
  assert.ok(!m.settlement!.reserves(journey.local(place).x,journey.local(place).y,place.radius));
 }
}
console.log('PASS 64 seeded route plans keep both spurs attached, detached clearings and settlement reserves');

for(const content of ['caravan-wreck']){
 const place=m.journey!.places.find(p=>p.content===content)!;
 w.player.pos=m.journey!.local(place);m.update(w,true);
 const native=m.snapshot(w).enemies.filter(e=>e.id===canonical([place.id,0])||e.id===canonical([place.id,1])
   || e.id===canonical([place.id,'fixture',0]));
 assert.ok(native.length>=2);
 assert.ok(native.every(e=>e.level===2));
 assert.ok(w.chests.some(c=>c.rewardSource===canonical([place.id,'cache'])));
}
const archer=m.snapshot(w).enemies.find(e=>e.encounterGroup?.recipe==='undead_caravan_watch'&&e.monster==='skeleton_archer')!;
const archerId=archer.id;
assert.equal(archer.monster,'skeleton_archer');assert.ok(m.state.claimed('site-guardian',archerId));
const shrine=m.journey!.places.find(p=>p.content==='windworn-shrine')!;
w.player.pos=m.journey!.local(shrine);m.update(w,true);
assert.ok(w.altars.some(a=>a.def.id==='haste_altar'&&a.level===2));
assert.equal(m.puzzles.population,6);
assert.equal(w.chests.some(c=>c.rewardSource===canonical([shrine.id,'cache'])),false);
const before=m.snapshot(w),continuedWorld=makeSimWorld('warrior',44);
const continued=new WorldMassRuntime(42,'stops',before.config,before);continued.attach(continuedWorld,before);
assert.deepEqual(continued.journey!.trails,m.journey!.trails);
// Native numeric squad IDs are rebuilt; compare exact membership and every other field.
const groups=(rows:typeof before.enemies)=>rows.map(e=>e.encounterGroup?{...e,encounterGroup:{...e.encounterGroup,
 id:rows.filter(r=>r.encounterGroup?.id===e.encounterGroup!.id).map(r=>r.id).sort()}}:e);
assert.deepEqual(groups(continued.snapshot(continuedWorld).enemies),groups(before.enemies));
const ordered=(rows:typeof m.sites.discovered)=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(ordered(continued.sites.discovered),ordered(m.sites.discovered));
assert.equal(continuedWorld.altars.filter(a=>a.def.id==='haste_altar').length,1);
console.log('PASS distinct stops admit native garrison/cache and timed riddle/field, retaining identities through Continue');

for(const patch of [
 {from:'missing'}, {trail:'missing'}, {id:'north-ruin'}, {radius:NaN}, {offset:100},
 {offset:Infinity}, {at:-.1}, {at:1.1}, {content:'missing'},
]){
 const bad:MassAdventure=JSON.parse(canonical(cfg));Object.assign(bad.journey!.stops![0],patch);
 assert.throws(()=>new WorldMassRuntime(42,'bad-stop',bad).attach(makeSimWorld('warrior',45)));
}
const malformed:MassAdventure=JSON.parse(canonical(cfg));
(malformed.journey as unknown as {stops:object}).stops={};
assert.throws(()=>new WorldMassRuntime(42,'bad-stop',malformed));
console.log('PASS unresolved routes/content, duplicate IDs, invalid offsets/positions and malformed stops refuse');
restore();
