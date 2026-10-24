import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { canonical } from '../src/worldmass/random';
import { massGarrisonSlots } from '../src/worldmass/clearance';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { serializeCharacter } from '../src/meta/character';
import { garrisonCaption } from '../src/render/vis/garrisonName';
import type { Actor } from '../src/engine/actor';

const restore=seedGlobalRandom(9837);
try {
 for(const seed of [42,73,81]) {
  const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);const m=w.massRuntime!;
  const place=m.journey!.places.find(p=>p.content==='cinderwatch')!;
  w.landPartyAt(m.journey!.local(place));m.update(w,true);
  const native=(m as unknown as {natives:Map<string,Actor>}).natives;
  const content=m.config.content.find(c=>c.id===place.content)!;
  const entries=massGarrisonSlots(content,place.id).filter(id=>native.has(id)&&m.state.claimed('site-guardian',id)).map(id=>[id,native.get(id)!] as const);
  assert.ok(entries.length);
  const [id,a]=entries[0],name=m.config.content.find(c=>c.id===place.content)!.site!.name;
  assert.equal(m.garrisonName(a),name);
  const before=canonical([m.state.snapshot(),m.sites.discovered,w.meta.xp,a.pos,a.life]);
  for(let i=0;i<20;i++)assert.equal(m.garrisonName(a),name);
  assert.equal(canonical([m.state.snapshot(),m.sites.discovered,w.meta.xp,a.pos,a.life]),before);
  const sameSpecies=w.createMonster(a.defId!,1,'enemy');sameSpecies.pos={...a.pos};
  assert.equal(m.garrisonName(sameSpecies),null,'species and proximity do not mint membership');
  a.pos.x+=500;assert.equal(m.garrisonName(a),name,'roaming does not change the original owner');
  a.team='player';assert.equal(m.garrisonName(a),null);a.team='enemy';
  a.dead=true;assert.equal(m.garrisonName(a),null);a.dead=false;
  const discovered=m.sites.snapshot(w);m.sites.restore({...discovered,found:[]},w.time);
  assert.equal(m.garrisonName(a),null,'undiscovered names cannot leak through an admitted body');
  m.sites.restore(discovered,w.time);
  const save=serializeCharacter(w),resume=makeSimWorld('warrior',seed+100);
  assert.ok(resume.adoptWorldState(save.world));
  resume.startWorldMass(save.world!.worldmass!.state.run.seed,save.world!.worldmass!);
  const rm=resume.massRuntime!,ra=(rm as unknown as {natives:Map<string,Actor>}).natives.get(id)!;
  assert.ok(ra);assert.equal(rm.garrisonName(ra),name);
  assert.equal(rm.garrisonName(a),null,'stale instances cannot claim a resumed identity');
  resume.kill(ra,false,resume.player);rm.update(resume,true);assert.equal(rm.garrisonName(ra),null);
 }
 console.log('PASS three seeds: admitted discovered affiliation, roaming, native Continue, fallen/team/stale and foreign exclusions, read-only queries');
 const cfg=JSON.parse(canonical(massAdventure()));
 delete cfg.settlement.quests;
 for(const c of cfg.content)if(c.site){delete c.site.completion;if(c.site.cache)delete c.site.cache.clearedHoldSeconds;}
 const w=makeSimWorld('warrior',183),m=new WorldMassRuntime(42,'old-garrison',cfg);m.attach(w);
 const p=m.journey!.places.find(p=>p.content==='cinderwatch')!;
 w.landPartyAt(m.journey!.local(p));m.update(w,true);
 for(const a of (m as unknown as {natives:Map<string,Actor>}).natives.values())assert.equal(m.garrisonName(a),null);
 console.log('PASS older descriptors gain no invented affiliation');
 const measure=(s:string)=>[...s].length*7;
 assert.equal(garrisonCaption('Cinderwatch',measure,500),'Garrison · Cinderwatch');
 const long=garrisonCaption('An exceptionally distant 🦉 court '.repeat(8),measure,160);
 assert.ok(long.startsWith('Garrison · '));assert.ok(long.endsWith('…'));assert.ok(measure(long)<=160);
 assert.equal(garrisonCaption('wide',measure,0),'');
 assert.ok(!/[\uD800-\uDBFF]$/.test(long.slice(0,-1)),'code points are not split');
 console.log('PASS bounded role-first captions preserve Unicode and do not change source names');
} finally {restore();}
