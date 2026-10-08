import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { populationChoices, validatePopulationLimits, reserveMassGuardians, MASS_GARRISON_COMPOSITION } from '../src/worldmass/population';
import { canonical, massRandom } from '../src/worldmass/random';
import { MONSTERS } from '../src/data/monsters';
import type { MassPopulation } from '../src/worldmass/progression';

const restore=seedGlobalRandom(65531), cfg=massAdventure();
const limited=cfg.content.flatMap(c=>c.levels??[]).filter(p=>p.limits?.length);
assert.ok(limited.length>0);
for(const p of cfg.content.flatMap(c=>c.levels??[])){
  validatePopulationLimits(p);
  if(p.level>2)assert.ok(!p.limits?.some(l=>l.source.startsWith('worldmass/opening-composition')));
}
for(const p of limited) for(let seed=0;seed<256;seed++){
  const rng=massRandom(seed,['probe/composition']),picked:string[]=[];
  for(let i=0;i<16;i++)picked.push(rng.weighted(populationChoices(p,picked)).id);
  for(const limit of p.limits!)assert.ok(picked.filter(id=>limit.ids.includes(id)).length<=limit.max);
  assert.equal(picked.length,16);
}
assert.ok(limited.some(p=>p.limits![0].ids.length),'native ranged species remain eligible');
assert.ok(limited.some(p=>p.limits!.some(l=>l.source.endsWith('/small-bodies'))),'small bodies remain an accent in opening groups, with larger native bodies carrying the fight');
console.log('PASS bounded opening composition across 256 seeds per native roster; later levels retain native variety');

// Use the real objective predicate as an independent oracle for the saved quotas.
const eligibilityWorld=makeSimWorld('warrior',701);
const eligible=new Map<string,boolean>();
for(const c of cfg.content)for(const row of c.levels??[])for(const r of row.table)
  if(!eligible.has(r.id))eligible.set(r.id,eligibilityWorld.objectiveCountable(eligibilityWorld.createMonster(r.id,row.level,'enemy')));
let wildlifeSeen=false, oldEmpty=0, checked=0;
for(const c of cfg.content.filter(c=>c.site?.completion))for(const row of c.levels??[])for(let seed=0;seed<64;seed++){
  const pick=(p:MassPopulation)=>{
    const rng=massRandom(seed,['garrison',c.id,row.level]),ids:string[]=[];
    for(let i=0;i<c.count;i++)ids.push(rng.weighted(populationChoices(p,ids)).id);
    return ids;
  };
  const ids=pick(row);
  assert.ok(ids.some(id=>eligible.get(id)),c.id+' must retain an eligible guardian');
  wildlifeSeen ||= ids.some(id=>!eligible.get(id));checked++;
  const old={...row,limits:row.limits?.filter(l=>l.source!==MASS_GARRISON_COMPOSITION.source)};
  if(!pick(old).some(id=>eligible.get(id)))oldEmpty++;
}
assert.ok(wildlifeSeen,'eligible garrisons do not erase accompanying native wildlife');
assert.ok(oldEmpty>0,'negative control must demonstrate the all-exempt population hole');
const animals:MassPopulation={level:1,table:[{id:'dire_wolf',weight:1}]};
assert.throws(()=>reserveMassGuardians(animals,2));
assert.equal(reserveMassGuardians(animals,2,0),animals,'authors can explicitly opt out');
console.log('PASS '+checked+' landmark populations retain native eligible guardians and wildlife; old rules produced '+oldEmpty+' empty garrisons');

const table=limited[0].table;
for(const limits of [
  [{source:'bad',ids:[table[0].id],max:-1}], [{source:'bad',ids:['missing'],max:1}],
  [{source:'bad',ids:table.map(r=>r.id),max:0}], [{source:'bad',ids:[table[0].id,table[0].id],max:1}],
])assert.throws(()=>validatePopulationLimits({level:1,table,limits}));
const overlap:MassPopulation={level:1,table:[{id:'a',weight:1},{id:'b',weight:1},{id:'c',weight:1}],
 limits:[{source:'one',ids:['a','b'],max:1},{source:'two',ids:['b'],max:0}]};
validatePopulationLimits(overlap);
assert.deepEqual(populationChoices(overlap,['a']),[{id:'c',weight:1}]);
console.log('PASS invalid quotas refuse; overlapping quotas retain an unrestricted choice');

const fixture:MassAdventure=JSON.parse(canonical(cfg));
delete fixture.settlement;delete fixture.journey;delete fixture.ecology;delete fixture.progression;
delete fixture.terrain.patches;delete fixture.terrain.landforms;
fixture.terrain.fields =[];
fixture.terrain.surfaces=[{id:'land',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}];
fixture.terrain.places=[{id:'population',version:1,content:'population',period:1800,radius:250,jitter:0,chance:1,when:[],priority:1}];
fixture.content=[{...limited[0],id:'population',source:'probe/composition',count:4}];
fixture.populationRadius=500;
const make=(seed:number,config=fixture)=>{
 const w=makeSimWorld('warrior',15),m=new WorldMassRuntime(seed,'population:'+seed,config);
 m.attach(w);w.player.pos={x:900,y:900};m.update(w,true);return {w,m};
};
let rangedSeen=false;
for(let seed=10;seed<18;seed++){
 const {w,m}=make(seed),saved=m.snapshot(w);
 assert.equal(saved.enemies.length,4);
 const ranged=fixture.content[0].limits![0].ids;
 rangedSeen ||= saved.enemies.some(e=>ranged.includes(e.monster));
 assert.ok(saved.enemies.filter(e=>ranged.includes(e.monster)).length<=1);
 const victim=w.actors.find(a=>a.defId===saved.enemies[0].monster&&a.team==='enemy')!;
 w.kill(victim,false,w.player);m.update(w,true);
 const survivors=m.snapshot(w).enemies;
 assert.equal(survivors.length,3);
 w.player.pos={x:-8000,y:-8000};m.update(w,true);
 w.player.pos={x:900,y:900};m.update(w,true);
 assert.deepEqual(m.snapshot(w).enemies.filter(e=>survivors.some(s=>s.id===e.id)),survivors);
 const snap=m.snapshot(w),again=makeSimWorld('warrior',23),replay=new WorldMassRuntime(seed,'population:'+seed,snap.config,snap);
 replay.attach(again,snap);again.player.pos={...snap.player};replay.update(again,true);
 assert.deepEqual(replay.snapshot(again).enemies,snap.enemies);
 assert.deepEqual(replay.config.content[0].limits,fixture.content[0].limits);
}
assert.ok(rangedSeen);
console.log('PASS real four-body groups retain native ranged presence, casualties, travel identity and saved quotas');

const legacy:MassAdventure=JSON.parse(canonical(fixture));delete legacy.content[0].limits;
const {m,w}=make(77,legacy),p=m.generator.placesInCell(m.walk.at(900,900)).find(p=>p.content==='population')!;
const rng=massRandom(77,['population',p.id,legacy.content[0].source]),expected:string[]=[];
for(let i=0;i<4;i++){
 const id=rng.weighted(legacy.content[0].table).id;expected.push(id);
 rng.range(0,Math.PI*2);rng.range(30,p.radius*.65);
 if(MONSTERS[id].scaleVariance)rng.range(...MONSTERS[id].scaleVariance!);
}
assert.deepEqual(m.snapshot(w).enemies.map(e=>e.monster),expected);
assert.equal(populationChoices(legacy.content[0],expected),legacy.content[0].table);
console.log('PASS omitted policy preserves original population random stream and saved legacy encounter identity');
restore();
