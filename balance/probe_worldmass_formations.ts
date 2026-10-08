import assert from 'node:assert/strict';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { nativeMassEncounters, validateMassEncounters, massFormation, formationIdentity } from '../src/worldmass/encounters';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { canonical } from '../src/worldmass/random';
import { localOffset } from '../src/worldmass/address';
import { serializeCharacter } from '../src/meta/character';
import { OBJECTIVE_REWARD } from '../src/data/objectiveRewards';

const restore=seedGlobalRandom(92751);
const preset=massAdventure();
let plans=0;
for(const content of preset.content)for(const row of [content,...(content.levels??[])]){
  if(!row.encounters)continue;validateMassEncounters(row.encounters,row.level);plans+=row.encounters.plans.length;
}
assert.ok(plans>100);
assert.equal(nativeMassEncounters('tundra','tundra',3),undefined);
const spec=nativeMassEncounters('tundra','tundra',4)!;
assert.ok(spec.plans.every(p=>p.recipe==='goblin_skirmish_cell'));
spec.chance=1;
for(let seed=0;seed<32;seed++){
  const first=massFormation(spec,seed,'same-country-place')!;
  massFormation(spec,seed,'unrelated-place');
  assert.equal(formationIdentity(first),formationIdentity(massFormation(spec,seed,'same-country-place')!));
}
assert.equal(massFormation({...spec,chance:0},42,'none'),undefined);
assert.throws(()=>validateMassEncounters({...spec,habitat:{...spec.habitat,tileset:'downs'}},4),/Invalid/);
assert.throws(()=>validateMassEncounters(spec,3),/Invalid/);
const partial=JSON.parse(canonical(spec));partial.plans[0].seats.pop();
assert.throws(()=>validateMassEncounters(partial,4),/Incomplete/);
const moved=JSON.parse(canonical(spec));moved.plans[0].seats[0].x+=1;
assert.throws(()=>validateMassEncounters(moved,4),/geometry/);
console.log('PASS native level/habitat/presence gates, snapshotted plans, stable independent selection and complete role geometry');

function config():MassAdventure{
  const c:MassAdventure=JSON.parse(canonical(preset));
  delete c.settlement;delete c.journey;delete c.ecology;delete c.progression;
 delete c.nativeCountry;delete c.geography; // this fixture supplies all its terrain/content; native country is tested separately
  c.startRadius=0;c.maxPopulation=4;c.populationRadius=1000;
  delete c.terrain.patches;delete c.terrain.landforms;
  c.terrain.fields =[];c.terrain.surfaces=[{id:'flat',priority:0,when:[],region:'ground',color:'#445544',biome:'tundra'}];
  c.terrain.places=[{id:'formation',version:1,content:'formation',period:1200,chance:1,radius:240,jitter:0,priority:1,when:[]}];
  c.content=[{id:'formation',source:'native/goblin',level:4,count:2,table:[{id:'plains_wolf',weight:1}],encounters:spec,
    site:{name:'Formation fixture',source:'probe/formations',doodads:[],fixtures:[],
      cache:{x:0,y:140,holdSeconds:1},completion:{source:'objectives/clear',...OBJECTIVE_REWARD}}}];
  return c;
}
const w=makeSimWorld('warrior',1),m=new WorldMassRuntime(42,'formation-test',config());m.attach(w);
const group=w.actors.filter(a=>a.encounterGroup);
assert.equal(group.length,4);assert.equal(new Set(group.map(a=>a.squadId)).size,1);
assert.equal(group.filter(a=>a.squadLeader).length,1);
assert.deepEqual(group.map(a=>a.defId).sort(),['goblin_brute','goblin_shaman','goblin_skirmisher','goblin_skirmisher'].sort());
assert.ok(group.every(a=>a.brain?.squad?.formation==='wedge'&&(a.rarity??'normal')==='normal'));
assert.equal(w.chests.length,1);
for(const a of group)for(const b of group)if(a!==b)assert.ok(Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)>=a.radius+b.radius+4);
const original=group.map(a=>({a,life:a.life,max:a.maxLife(),brain:JSON.stringify(a.brain)}));
m.update(w,true);assert.ok(original.every(s=>s.a.life===s.life&&s.a.maxLife()===s.max&&JSON.stringify(s.a.brain)===s.brain));
console.log('PASS four native roles replace the two-body fallback atomically, with one squad, ordinary rarity and stable native tuning');

w.kill(group.find(a=>a.squadLeader)!,false,w.player);
const survivor=group.find(a=>!a.dead)!;survivor.life=survivor.maxLife()*.37;m.update(w,true);
const saved=serializeCharacter(w),checkpoint=saved.world!.worldmass!;
const malformed=JSON.parse(JSON.stringify(checkpoint));malformed.enemies[0].encounterGroup=null;
assert.throws(()=>new WorldMassRuntime(42,'formation-test',malformed.config,malformed),/Invalid worldmass survivor/);
const records=(world:typeof w)=>world.actors.filter(a=>a.encounterGroup&&!a.dead).map(a=>({
  monster:a.defId,slot:a.encounterGroup!.slot,name:a.name,life:a.life,max:a.maxLife(),brain:JSON.stringify(a.brain),
  anchor:a.aiAnchor,leader:a.squadLeader,
})).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
const again=makeSimWorld('warrior',2);again.adoptWorldState(saved.world);again.startWorldMass(42,checkpoint);
assert.deepEqual(records(again),records(w));assert.equal(again.actors.filter(a=>a.encounterGroup&&!a.dead).length,3);
assert.equal(new Set(again.actors.filter(a=>a.encounterGroup).map(a=>a.squadId)).size,1);
again.massRuntime!.update(again,true);assert.equal(again.actors.filter(a=>a.encounterGroup&&!a.dead).length,3);
const place=again.massRuntime!.placesInCell(again.massRuntime!.walk.at(survivor.pos.x,survivor.pos.y)).find(p=>
  checkpoint.enemies.some(e=>[0,1,2,3].some(i=>e.id===canonical([p.id,i]))))!;
again.player.pos={...survivor.pos};
for(const a of again.actors.filter(a=>a.encounterGroup&&!a.dead))again.kill(a,false,again.player);
again.massRuntime!.update(again,true);
assert.ok(again.massRuntime!.state.claimed('site-cleared',place.id));
console.log('PASS native writer/Continue retains roles, leader casualty, wounded survivors, names and homes; clearance follows all four original seats');

const limited=config();limited.maxPopulation=3;
const narrow=makeSimWorld('warrior',3);new WorldMassRuntime(42,'limited-formation',limited).attach(narrow);
assert.equal(narrow.actors.filter(a=>a.encounterGroup).length,0);assert.equal(narrow.chests.length,0);
const blocked=makeSimWorld('warrior',4),find=blocked.findFreeSpot;
blocked.findFreeSpot=()=>({x:100000,y:100000});
const bm=new WorldMassRuntime(42,'blocked-formation',config());bm.attach(blocked);
assert.equal(bm.population,0);assert.equal(blocked.chests.length,0);
blocked.findFreeSpot=find;bm.update(blocked,true);
assert.equal(blocked.actors.filter(a=>a.encounterGroup).length,4);
const legacy=config();delete legacy.content[0].encounters;
const old=makeSimWorld('warrior',5);new WorldMassRuntime(42,'legacy-formation',legacy).attach(old);
assert.equal(old.actors.filter(a=>a.encounterGroup).length,0);
assert.ok(old.actors.some(a=>a.defId==='plains_wolf'));
console.log('PASS saturated and blocked formations produce no partial group/cache; retry admits all roles; omitted descriptors retain ordinary populations');
const country=makeSimWorld('warrior',92752);country.startWorldMass(42);
const mass=country.massRuntime!;
let destination:import('../src/worldmass/contracts').MassPlace|undefined;
search:for(let y=-20000;y<=20000;y+=2000)for(let x=-20000;x<=20000;x+=2000){
  destination=mass.placesInCell(mass.walk.at(x,y)).find(p=>massFormation(mass.populationFor(p).encounters,42,p.id)?.recipe==='spear_net');
  if(destination)break search;
}
assert.ok(destination,'current generated country has a native Spear Net');
const target=destination!,level=mass.populationFor(target).level;
country.landPartyAt(localOffset(target.center,{...mass.origin,x:0,y:0},mass.config.terrain.addressSpan));
mass.update(country,true);
const natural=country.actors.filter(a=>a.encounterGroup?.recipe==='spear_net');
assert.equal(natural.length,4);assert.ok(natural.every(a=>a.level===level&&!country.pointInSolid(a.pos.x,a.pos.y,a.radius)));
console.log('PASS unmodified seed-42 country naturally admits a Spear Net with all native roles at geographic level '+level);
restore();
