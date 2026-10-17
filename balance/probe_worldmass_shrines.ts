import { beforeMassStreaming } from './worldmassFixtures';
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { MassShrines, nativeMassShrine, validateMassShrine } from '../src/worldmass/shrines';
import { SHRINES } from '../src/data/shrines';
import { captureZoneContents, restoreZoneContents } from '../src/engine/zonecontents';
import type { World } from '../src/engine/world';

const hooks = (w: World) => w as unknown as { updateShrines(): void };
const restore = seedGlobalRandom(73042);
const resume = (w: World) => {
  const saved = serializeCharacter(w), next = makeSimWorld('warrior', 731);
  assert.ok(applySavedCharacter(next,saved)); assert.ok(next.adoptWorldState(saved.world));
  next.startWorldMass(saved.world!.worldmass!.state.run.seed,saved.world!.worldmass);
  return next;
};
try {
  for (const seed of [42,81,142]) {
    const w=makeSimWorld('warrior',seed),m=new WorldMassRuntime(seed,'shrines-'+seed);m.attach(w);
    for (const content of ['cinderwatch','broken-gate','stoneward']) {
      const p=m.journey!.places.find(p=>p.content===content)!;w.player.pos=m.journey!.local(p);m.update(w,true);
      const expected=m.config.content.find(c=>c.id===content)!.site!.shrines![0],id=canonical([p.id,'shrine',expected.id]);
      const s=w.shrines.find(s=>s.massSource===id)!;assert.ok(s);
      assert.ok(w.walk!.isWalkable(s.pos.x,s.pos.y)&&!w.pointInSolid(s.pos.x,s.pos.y,14));
      assert.deepEqual(s.def,expected.def);assert.equal(s.used,false);
      const old=canonical(m.shrines.snapshot());m.update(w,true);assert.equal(canonical(m.shrines.snapshot()),old);
      assert.equal(w.shrines.filter(s=>s.massSource===id).length,1);
    }
    assert.equal(m.shrines.snapshot().length,3);
  }
  console.log('PASS three native shrine families across three seeds: physical admission, saved definitions and duplicate-free revisits');
  const w=makeSimWorld('warrior',42),m=new WorldMassRuntime(42,'one-shot-shrine');m.attach(w);
  const p=m.journey!.places.find(p=>p.content==='cinderwatch')!;w.player.pos=m.journey!.local(p);m.update(w,true);
  const s=w.shrines.find(s=>s.def.id==='swiftness')!;
  const unspent=m.shrines.snapshot(),oldDef=SHRINES.find(s=>s.id==='swiftness')!,duration=oldDef.duration;
  let pending:World;
  try { oldDef.duration=999; pending=resume(w); } finally {oldDef.duration=duration;}
  assert.deepEqual(pending!.massRuntime!.shrines.snapshot(),unspent);
  const restored=pending!.shrines.find(r=>r.massSource===s.massSource)!;
  assert.equal(restored.def.duration,duration,'run definition wins over later registry tuning');
  const speed=pending!.player.sheet.get('moveSpeed');
  pending!.player.pos={x:restored.pos.x+200,y:restored.pos.y};hooks(pending!).updateShrines();assert.equal(restored.used,false);
  pending!.player.pos={...restored.pos};hooks(pending!).updateShrines();
  assert.ok(restored.used);assert.ok(pending!.player.sheet.get('moveSpeed')>speed);
  assert.equal(pending!.player.buffs.get('shrine_swiftness')!.remaining,duration);
  pending!.player.updateTimers(2);const remaining=pending!.player.buffs.get('shrine_swiftness')!.remaining;
  hooks(pending!).updateShrines();assert.equal(pending!.player.buffs.get('shrine_swiftness')!.remaining,remaining,'used shrine cannot refresh');
  const spent=resume(pending!);assert.deepEqual(spent.massRuntime!.shrines.snapshot(),pending!.massRuntime!.shrines.snapshot());
  spent.player.updateTimers(duration+1);hooks(spent).updateShrines();
  assert.equal(spent.player.buffs.has('shrine_swiftness'),false,'Continue cannot drink a consumed shrine again');
  const original=spent.massRuntime!.shrines.snapshot();spent.player.pos={x:-22000,y:-22000};spent.massRuntime!.update(spent,true);
  spent.player.pos={...s.pos};spent.massRuntime!.update(spent,true);
  assert.deepEqual(spent.massRuntime!.shrines.snapshot(),original);
  assert.equal(spent.shrines.filter(s=>s.massSource===restored.massSource).length,1);
  console.log('PASS native touch, modifiers and remaining duration; exact unspent/consumed character Continue, native expiry and distant return without a new boon');

  const ordinary={pos:{x:19,y:27},def:SHRINES[0],used:true};spent.shrines.push(ordinary);
  const contents=captureZoneContents(spent);assert.equal(contents.shrines.length,1);
  assert.deepEqual(contents.shrines[0],{pos:ordinary.pos,id:ordinary.def.id,used:true});
  const native=makeSimWorld('warrior',733);restoreZoneContents(native,contents);
  assert.equal(native.shrines.length,1);assert.equal(native.shrines[0].used,true);
  const legacy=beforeMassStreaming(structuredClone(massAdventure()) as MassAdventure);delete legacy.bounties;delete legacy.journey!.reservePopulation;
  delete legacy.journey!.roadside;delete legacy.settlement!.quests!.acceptance;delete legacy.settlement!.structurePlans;delete legacy.rewards;
  for(const c of legacy.content)if(c.site){delete c.site.shrines;delete c.site.puzzles;}
  const old=makeSimWorld('warrior',734);new WorldMassRuntime(42,'legacy-shrine',legacy).attach(old);
  old.player.pos=old.massRuntime!.journey!.local(old.massRuntime!.journey!.places.find(p=>p.content==='cinderwatch')!);old.massRuntime!.update(old,true);
  const oldAgain=resume(old);assert.equal(oldAgain.massRuntime!.shrines.snapshot().length,0);
  assert.equal(oldAgain.shrines.filter(s=>s.massSource).length,0);
  console.log('PASS ordinary zone contents keep native shrines; the expedition owns its own records once; old descriptors gain no new stands');

  const full=JSON.parse(JSON.stringify(serializeCharacter(w).world!.worldmass!));
  assert.equal(full.schema,19); // WildernessPathsSchema on fresh expeditions
  const downgraded={...full,schema:1};
  assert.throws(()=>new WorldMassRuntime(42,'downgraded',full.config,downgraded),/checkpoint/);
  assert.equal(serializeCharacter(old).world!.worldmass!.schema,1,'old descriptors retain their original checkpoint version');
  full.shrines[0].id+='foreign';
  const badWorld=makeSimWorld('warrior',735);
  assert.throws(()=>new WorldMassRuntime(42,'bad',full.config,full).attach(badWorld,full),/Unknown worldmass shrine/);
  assert.throws(()=>new MassShrines([unspent[0],unspent[0]]),/checkpoint/);
  assert.throws(()=>new MassShrines([{...unspent[0],pos:{x:NaN,y:0}}]),/checkpoint/);
  assert.throws(()=>validateMassShrine({...nativeMassShrine('wrath',0,0),def:{...SHRINES[0],duration:-1}},310),/Unsupported/);
  assert.throws(()=>validateMassShrine(nativeMassShrine('wrath',400,0),310),/Unsupported/);
  const repeated=beforeMassStreaming(structuredClone(massAdventure()) as MassAdventure);
  repeated.terrain.places=[...repeated.terrain.places,{...repeated.terrain.places[0],id:'unbounded-shrines',content:'cinderwatch'}];
  assert.throws(()=>new WorldMassRuntime(42,'repeated',repeated),/finite journey owner/);
  const many=structuredClone(massAdventure()) as MassAdventure;
  many.journey!.extensions=[...(many.journey!.extensions ?? []),...Array.from({length:17},(_,i)=>({id:'shrine-'+i,from:'west-camp',content:'cinderwatch',offset:{x:0,y:2000},radius:310,jitter:0}))];
  assert.throws(()=>new WorldMassRuntime(42,'too-many',many),/shrine count/);
  const saturated=structuredClone(massAdventure()) as MassAdventure;saturated.maxPopulation=0;
  const blocked=makeSimWorld('warrior',736);new WorldMassRuntime(42,'blocked-shrine',saturated).attach(blocked);
  blocked.player.pos=blocked.massRuntime!.journey!.local(blocked.massRuntime!.journey!.places.find(p=>p.content==='cinderwatch')!);
  blocked.massRuntime!.update(blocked,true);assert.equal(blocked.massRuntime!.shrines.snapshot().length,0,'no free boon when its encounter cannot be admitted');
  console.log('PASS foreign/malformed saves, invalid definitions, unsupported repeated placement and over-budget configurations refuse; population saturation cannot expose a free stand');
} finally { restore(); }
