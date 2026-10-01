import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { populationChoices, validatePopulationLimits } from '../src/worldmass/population';
import { canonical, massRandom } from '../src/worldmass/random';
import { MONSTERS } from '../src/data/monsters';
import type { MassPopulation } from '../src/worldmass/progression';

const restore=seedGlobalRandom(65531), cfg=massAdventure();
const limited=cfg.content.flatMap(c=>c.levels??[]).filter(p=>p.limits?.length);
assert.ok(limited.length>0);
for(const p of cfg.content.flatMap(c=>c.levels??[])){
  validatePopulationLimits(p);
  if(p.level>2)assert.equal(p.limits,undefined);
}
for(const p of limited) for(let seed=0;seed<256;seed++){
  const rng=massRandom(seed,['probe/composition']),picked:string[]=[];
  for(let i=0;i<16;i++)picked.push(rng.weighted(populationChoices(p,picked)).id);
  for(const limit of p.limits!)assert.ok(picked.filter(id=>limit.ids.includes(id)).length<=limit.max);
  assert.equal(picked.length,16);
}
assert.ok(limited.some(p=>p.limits![0].ids.length),'native ranged species remain eligible');
console.log('PASS bounded opening composition across 256 seeds per native roster; later levels retain native variety');

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
fixture.terrain.fields=[];
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
