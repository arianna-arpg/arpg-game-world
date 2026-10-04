import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter } from '../src/meta/character';

const restore = seedGlobalRandom(88218);
const world = makeSimWorld('warrior',42);
world.startWorldMass(42); world.player.invulnerable = true;
const mass = world.massRuntime!;
const gate = mass.journey!.places.find(p=>p.content==='broken-gate')!;
world.player.pos = mass.journey!.local(gate); mass.update(world,true);
const cohort = world.actors.filter(a=>a.magicPack?.mechanic==='footfall');
assert.equal(cohort.length,4);
assert.equal(new Set(cohort.map(a=>a.magicPack!.id)).size,1);
assert.deepEqual(cohort.map(a=>a.magicPack!.slot).sort(),[0,1,2,3]);
assert.ok(cohort.every(a=>a.rarity==='magic' && a.level===mass.populationFor(gate).level));
assert.ok(cohort.every(a=>!world.pointInSolid(a.pos.x,a.pos.y,a.radius)));
const live = cohort.map(a=>({a,radius:a.radius,max:a.maxLife(),xp:a.xpValue}));
mass.update(world,true);
assert.ok(live.every(s=>s.a.radius===s.radius && s.a.maxLife()===s.max && s.a.xpValue===s.xp));
console.log('PASS complete native cohorts use native promotion once and fit their physical landmark');

world.player.pos = {...cohort[0].pos};
world.refreshMagicPacks(3.1);
assert.ok(world.magicPackEffects.some(v=>v.kind==='burst' && v.warning),'native warning must precede damage');
const inWarning = serializeCharacter(world), warningSave = inWarning.world!.worldmass!;
const warningAgain = makeSimWorld('warrior',43);
warningAgain.adoptWorldState(inWarning.world); warningAgain.startWorldMass(42,warningSave);
assert.equal(warningAgain.actors.filter(a=>a.magicPack?.mechanic==='footfall').length,4);
assert.ok(!warningAgain.magicPackEffects.some(v=>v.kind==='burst' && !v.warning),
  'Continue cannot resume an unseen already-firing hazard');
console.log('PASS native ground warning works; Continue re-arms danger through native warning policy');

world.kill(cohort[0],false,world.player); cohort[1].life = cohort[1].maxLife()*.42;
mass.update(world,true);
assert.ok(cohort.slice(1).every(a=>a.magicPack!.fallen===1));
const court = mass.journey!.places.find(p=>p.content==='fallen-court')!;
world.player.pos = mass.journey!.local(court); mass.update(world,true);
const healers = world.actors.filter(a=>a.magicPack?.mechanic==='bloodfont');
assert.equal(healers.length,4);
assert.notEqual(healers[0].magicPack!.id,cohort[1].magicPack!.id);
const records = world.actors.filter(a=>!a.dead&&a.magicPack).map(a=>({
  slot:a.magicPack!.slot,mechanic:a.magicPack!.mechanic,fallen:a.magicPack!.fallen,
  name:a.name,life:a.life,max:a.maxLife(),radius:a.radius,
})).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
const saved = serializeCharacter(world), stored = saved.world!.worldmass!;
const again = makeSimWorld('warrior',44);
again.adoptWorldState(saved.world); again.startWorldMass(42,stored);
const restored = again.actors.filter(a=>!a.dead&&a.magicPack);
assert.equal(new Set(restored.map(a=>a.magicPack!.id)).size,2);
assert.deepEqual(restored.map(a=>({
  slot:a.magicPack!.slot,mechanic:a.magicPack!.mechanic,fallen:a.magicPack!.fallen,
  name:a.name,life:a.life,max:a.maxLife(),radius:a.radius,
})).sort((a,b)=>canonical(a).localeCompare(canonical(b))),records);
again.player.pos = again.massRuntime!.journey!.local(gate); again.massRuntime!.update(again,true);
assert.equal(again.actors.filter(a=>!a.dead&&a.magicPack?.mechanic==='footfall').length,3);
console.log('PASS separate cohorts retain casualty count, survivors, wounds, names and native power on Continue');

const limited: MassAdventure = JSON.parse(canonical(massAdventure()));
limited.maxPopulation = 1;
const narrowWorld=makeSimWorld('warrior',45),narrow=new WorldMassRuntime(42,'limited-cohort',limited);
narrow.attach(narrowWorld);
const limitedGate=narrow.journey!.places.find(p=>p.content==='broken-gate')!;
narrowWorld.player.pos=narrow.journey!.local(limitedGate);narrow.update(narrowWorld,true);
assert.ok(!narrowWorld.actors.some(a=>a.magicPack));
assert.ok(!narrowWorld.chests.some(c=>c.rewardSource===canonical([limitedGate.id,'cache'])));
const fieldConfig: MassAdventure=JSON.parse(canonical(limited));
delete fieldConfig.journey; delete fieldConfig.settlement;
fieldConfig.terrain.places=[{id:'cohort-field',version:1,content:'broken-gate',period:1100,chance:1,radius:180,jitter:.1,priority:1,when:[]}];
delete fieldConfig.content.find(c=>c.id==='broken-gate')!.site;
const fieldWorld=makeSimWorld('warrior',49),field=new WorldMassRuntime(42,'field-cohort',fieldConfig);
field.attach(fieldWorld);
assert.equal(field.snapshot(fieldWorld).enemies.length,0,'unstructured cohorts obey the same total body cap');
console.log('PASS population saturation cannot introduce a partial magic group or an unguarded cache');

const atomicConfig: MassAdventure = JSON.parse(canonical(massAdventure()));
atomicConfig.terrain.places=[];delete atomicConfig.journey!.stops;
// The single-gate cohort fixture does not retain the public circuit's notices.
delete atomicConfig.journey!.notices;
// The isolated gate keeps only extensions whose parent destination remains.
atomicConfig.journey!.extensions=atomicConfig.journey!.extensions!.filter(e=>e.from==='north-ruin');
// This isolated Broken Gate fixture deliberately omits the western contract.
delete atomicConfig.settlement!.quests;
atomicConfig.journey!.destinations=atomicConfig.journey!.destinations.filter(d=>d.content==='broken-gate');
const atomicWorld=makeSimWorld('warrior',48),atomic=new WorldMassRuntime(42,'atomic-cohort',atomicConfig);
atomic.attach(atomicWorld);
const atomicGate=atomic.journey!.places[0],find=atomicWorld.findFreeSpot;
let calls=0;
atomicWorld.findFreeSpot=function(...args){
  if(++calls===3)return {x:100000,y:100000};
  return find.apply(this,args);
};
atomicWorld.player.pos=atomic.journey!.local(atomicGate);atomic.update(atomicWorld,true);
assert.equal(atomic.snapshot(atomicWorld).enemies.length,0,'one failed seat cannot publish a partial cohort');
assert.equal(atomicWorld.chests.length,0);
atomicWorld.findFreeSpot=find;atomic.update(atomicWorld,true);
assert.equal(atomicWorld.actors.filter(a=>a.magicPack?.mechanic==='footfall').length,4);
console.log('PASS failed seating leaves no partial encounter; later retry admits the complete native cohort');

const legacy: MassAdventure = JSON.parse(canonical(massAdventure()));
for(const c of legacy.content)delete c.magicPack;
const oldWorld=makeSimWorld('warrior',46),old=new WorldMassRuntime(42,'plain-landmarks',legacy);
old.attach(oldWorld);oldWorld.player.pos=old.journey!.local(old.journey!.places.find(p=>p.content==='broken-gate')!);old.update(oldWorld,true);
const oldSave=old.snapshot(oldWorld),oldAgain=makeSimWorld('warrior',47);
new WorldMassRuntime(42,'plain-landmarks',legacy,oldSave).attach(oldAgain,oldSave);
assert.ok(!oldAgain.actors.some(a=>a.magicPack),'existing descriptors cannot acquire new encounters');
const invalid: MassAdventure=JSON.parse(canonical(massAdventure()));
invalid.content.find(c=>c.id==='broken-gate')!.magicPack!.mechanic='__proto__';
assert.throws(()=>new WorldMassRuntime(42,'invalid-cohort',invalid),/Invalid native worldmass cohort/);
console.log('PASS existing plain encounters remain plain; unknown coordinated mechanics rejected');
restore();
