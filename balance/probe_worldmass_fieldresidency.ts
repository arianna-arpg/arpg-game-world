import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { address, localOffset } from '../src/worldmass/address';
import { ALTARS } from '../src/data/shrines';
import { serializeCharacter } from '../src/meta/character';

const config=JSON.parse(canonical(massAdventure()));
// Legacy garrison field: these probes intentionally kill all dependents to detach it.
for(const c of config.content)if(c.site?.puzzles){delete c.site.puzzles;c.count=3;}
config.fieldResidency={source:'qa/native-fields',retainRadius:2048,maxResident:4};
const w=makeSimWorld('warrior',791),m=new WorldMassRuntime(791,'field-residency',config);m.attach(w);
const grove=m.journey!.places.find(p=>p.content==='memorial-grove')!;
w.player.pos=m.journey!.local(grove);m.update(w,true);
const altar=w.altars.find(a=>a.massSource)!;assert.ok(altar);
const source=altar.massSource!;
altar.mendTimer=.67;
for(const a of w.actors)if(a!==w.player)a.dead=true;
w.player.pos={x:-22000,y:-22000};m.update(w,true);
assert.equal(m.fields.residentCount,0);
assert.ok(!w.altars.includes(altar));
const sleeping=m.fields.snapshot().find(a=>a.id===source)!;
assert.equal(sleeping.mendTimer,.67);assert.equal(sleeping.resident,false);assert.equal(sleeping.place!.id,grove.id);
(w as any).updateAltars(10);
assert.equal(m.fields.snapshot().find(a=>a.id===source)!.mendTimer,.67);
const saved=serializeCharacter(w),checkpoint=saved.world!.worldmass!;
const next=makeSimWorld('warrior',792);assert.ok(next.adoptWorldState(saved.world));
next.startWorldMass(checkpoint.state.run.seed,checkpoint);
assert.equal(next.massRuntime!.fields.residentCount,0);
assert.equal(next.massRuntime!.fields.snapshot().find(a=>a.id===source)!.mendTimer,.67);
next.player.pos={...altar.pos};next.massRuntime!.update(next,true);
const restored=next.altars.find(a=>a.massSource===source)!;
assert.ok(restored);assert.equal(restored.mendTimer,.67);
next.player.life=20;(next as any).updateAltars(.66);assert.equal(next.player.life,20);
(next as any).updateAltars(.02);assert.ok(next.player.life>20);
next.massRuntime!.update(next,true);assert.equal(next.altars.filter(a=>a.massSource===source).length,1);
console.log('PASS dormant native cadence, actual character Continue, exact re-entry and no duplicate field');

const wr=makeSimWorld('warrior',793),mr=new WorldMassRuntime(791,'source-rekey',config);mr.attach(wr);
const gp=mr.journey!.places.find(p=>p.content==='memorial-grove')!;
wr.player.pos=mr.journey!.local(gp);mr.update(wr,true);
const owned=wr.altars.find(a=>a.massSource)!;
const wrath=ALTARS.find(a=>a.id==='wrath_altar')!;
const before={pos:{...owned.pos},def:wrath,affected:new Set<number>()};
const after={pos:{...owned.pos},def:wrath,affected:new Set<number>()};
wr.altars=[before,owned,after];wr.actors=[wr.player];wr.player.pos={...owned.pos};
(wr as any).updateAltars(.01);
const old0=wr.player.sheet.getSourceMods('altar:0'),old2=wr.player.sheet.getSourceMods('altar:2');
assert.ok(old0&&old2);
wr.player.pos={x:owned.pos.x+5000,y:owned.pos.y+5000};
mr.fields.sync(wr);
assert.deepEqual(wr.altars,[before,after]);
assert.deepEqual(wr.player.sheet.getSourceMods('altar:0'),old0);
assert.deepEqual(wr.player.sheet.getSourceMods('altar:1'),old2);
assert.equal(wr.player.sheet.getSourceMods('altar:2'),undefined);
assert.equal(wr.player.sheet.getSourceMods('altar:'+owned.massSource),undefined);
console.log('PASS detachment clears the owned source and rekeys ordinary native modifiers without dropping them');

const pin=makeSimWorld('warrior',794),pm=new WorldMassRuntime(791,'field-pin',config);pm.attach(pin);
const court=pm.journey!.places.find(p=>p.content==='fallen-court')!;
pin.player.pos=pm.journey!.local(court);pm.update(pin,true);
const storm=pin.altars.find(a=>a.def.bolts)!;assert.ok(storm);
pin.player.pos={x:-22000,y:-22000};pm.fields.sync(pin);
assert.ok(pin.altars.includes(storm),'nearby native garrison keeps its actual field');
storm.boltTimer=0;(pin as any).updateAltars(.01);assert.ok(pin.zones.length);
const pending=pin.zones[0],caster=pending.caster;
for(const a of pin.actors)if(a!==pin.player)a.dead=true;
pm.fields.sync(pin);
assert.ok(!pin.altars.includes(storm));assert.ok(pin.zones.includes(pending));assert.equal(pending.caster,caster);
assert.ok(pending.delay>0,'detaching a quiet field does not cancel or fast-forward its emitted warning');
console.log('PASS living garrison pin and independent in-flight native strike survive residency changes');

const limited=JSON.parse(canonical(config));limited.fieldResidency.maxResident=1;
const cap=makeSimWorld('warrior',795),cm=new WorldMassRuntime(791,'field-cap',limited);cm.attach(cap);
const first=cm.journey!.places.find(p=>p.content==='memorial-grove')!;
cap.player.pos=cm.journey!.local(first);cm.update(cap,true);assert.equal(cm.fields.residentCount,1);
const second=cm.journey!.places.find(p=>p.content==='stoneward')!;
cap.player.pos=cm.journey!.local(second);const population=cm.population;cm.update(cap,true);
assert.equal(cm.fields.residentCount,1);
assert.ok(!cap.altars.some(a=>a.def.id==='wrath_altar'));
assert.ok(!cap.chests.some(c=>c.rewardSource===canonical([second.id,'cache'])));
assert.ok(!cap.actors.some(a=>a.defId==='stone_sentinel'),'capacity refusal precedes the required native guardian');
assert.ok(cm.population>=population);
console.log('PASS bounded admission cannot expose a partial shrine encounter or its reward');

for(const patch of [{retainRadius:100},{maxResident:0},{maxResident:129},{retainRadius:Infinity}]){
 const invalid=JSON.parse(canonical(config));Object.assign(invalid.fieldResidency,patch);
 assert.throws(()=>new WorldMassRuntime(791,'bad',invalid));
}
const invalid=structuredClone(checkpoint);invalid.fields![0].place!.center.x+=1;
const bad=makeSimWorld('warrior',797);
assert.throws(()=>new WorldMassRuntime(791,'bad',invalid.config,invalid).attach(bad,invalid),/Unknown saved|field address/);
console.log('PASS invalid policies and displaced saved identities are refused');

const generatedExamples:Record<string,{seed:number;runId:string;center:import('../src/worldmass/address').MassAddress}>={};
for(const seed of [42,713,991]){
 const runtime=new WorldMassRuntime(seed,'field-country-'+seed);
 runtime.attach(makeSimWorld('warrior',seed)); // Survey the actual opening and its reservations.
 const ids=new Set(['mending-hollow','red-cairn','still-circle']);
 const found=new Map<string,import('../src/worldmass/contracts').MassPlace>();
 const pages:{at:import('../src/worldmass/address').MassAddress;ids:string[]}[]=[];
 for(let y=-15;y<=15;y+=2)for(let x=-15;x<=15;x+=2){
  const at=address('surface',String(x),String(y),0,0,960),places=runtime.placesInCell(at);
  pages.push({at,ids:places.map(p=>p.id)});
  for(const p of places)if(ids.has(p.content))found.set(p.id,p);
 }
 assert.ok(found.size>0,'each seeded region contains repeated field destinations');
 console.log('Country field seed '+seed+': '+[...new Set([...found.values()].map(p=>p.content))].sort().join(', '));
 const reverse=new WorldMassRuntime(seed,'field-country-'+seed);
 reverse.attach(makeSimWorld('warrior',seed+1000));
 for(const page of pages.reverse())assert.deepEqual(reverse.placesInCell(page.at).map(p=>p.id),page.ids);
 for(const p of found.values()){
  assert.ok(runtime.placesInCell(p.center).some(q=>canonical(q)===canonical(p)));
  assert.equal(runtime.generator.terrainAt(p.center).region,'ground');
  const local=localOffset(p.center,{...runtime.origin,x:0,y:0},960);
  assert.ok(runtime.journey&&!runtime.journey.reserves(local,p.radius));
  generatedExamples[p.content]??={seed,runId:runtime.generator.run.runId,center:p.center};
 }
}
assert.deepEqual(Object.keys(generatedExamples).sort(),['mending-hollow','red-cairn','still-circle']);
console.log('PASS three repeated native field families across three seeds, reverse query order, clearings and opening reserves');
console.log(JSON.stringify(generatedExamples));

for(const [id,example] of Object.entries(generatedExamples)){
 const world=makeSimWorld('warrior',812),runtime=new WorldMassRuntime(example.seed,example.runId);
 runtime.attach(world);
 const place=runtime.placesInCell(example.center).find(p=>p.content===id)!;
 world.landPartyAt(localOffset(place.center,{...runtime.origin,x:0,y:0},960));runtime.update(world,true);
 const field=world.altars.find(a=>a.massSource===canonical([place.id,'altar',runtime.config.content.find(c=>c.id===id)!.site!.altars![0].id]))!;
 assert.ok(field,'generated native field admitted with its garrison');
 assert.equal(world.pointInSolid(field.pos.x,field.pos.y,16)?.kind,'altar_plinth');
 assert.ok(!world.pointInSolid(field.pos.x+50,field.pos.y,16),'a body-clear approach remains beside the altar');
 const chest=world.chests.find(c=>c.rewardSource===canonical([place.id,'cache']))!;
 assert.ok(chest&&!world.pointInSolid(chest.pos.x,chest.pos.y,20));
 for(const a of world.actors)if(a!==world.player)a.dead=true;
 field.mendTimer=field.def.mend?.every;
 world.player.pos={x:field.pos.x+6000,y:field.pos.y+6000};runtime.fields.sync(world);
 const checkpoint=serializeCharacter(world);
 const restored=makeSimWorld('warrior',813);
 assert.ok(restored.adoptWorldState(checkpoint.world));
 restored.startWorldMass(example.seed,checkpoint.world!.worldmass);
 assert.ok(!restored.altars.some(a=>a.massSource===field.massSource));
 restored.player.pos={...field.pos};restored.massRuntime!.update(restored,true);
 const again=restored.altars.find(a=>a.massSource===field.massSource)!;
 assert.ok(again);assert.deepEqual(again.def,field.def);assert.equal(again.level,field.level);
 assert.equal(again.mendTimer,field.mendTimer);
 const before=restored.massRuntime!.fields.snapshot();
 restored.massRuntime!.update(restored,true);assert.deepEqual(restored.massRuntime!.fields.snapshot(),before);
}
console.log('PASS generated country fields and reachable caches, dormant native character Continue and exact geographic re-entry');
