import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MASS_BIOME_FAMILIES, MASS_CLIMATE_ECOLOGY } from '../src/worldmass/biomes';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { address } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { validateMassEcology, type MassEcologySpec } from '../src/worldmass/ecology';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { presenceTable } from '../src/engine/presence';

const restore=seedGlobalRandom(62042),config=massAdventure();
assert.equal(config.terrain.version,8);
for(const family of MASS_BIOME_FAMILIES){
 const content=config.content.find(c=>c.id===family.id)!;assert.ok(content);
 for(const row of content.levels!){
  const native=presenceTable(TILESETS[family.id].packs.table,row.level,id=>MONSTERS[id]?.presence)
   .filter(r=>MONSTERS[r.id]&&!MONSTERS[r.id].habitat).map(r=>({id:r.id,weight:r.weight}));
  assert.deepEqual(row.table,native);assert.ok(row.table.length);
 }
}
console.log('PASS five saved climate families retain exact native level envelopes and eligible rosters');

const found=new Map<string,{seed:number;x:number;y:number;region:string}>(),regions=new Set<string>();
for(const seed of [42,713,991]){
 const gen=new MassGenerator(makeMassRun(seed,'climate-'+seed,config.terrain),config.terrain);
 const samples=[];
 for(let y=-24000;y<=24000;y+=2400)for(let x=-24000;x<=24000;x+=2400){
  const at=address('surface','0','0',x,y,960),terrain=gen.terrainAt(at);
  samples.push({at,terrain});regions.add(terrain.region);
  if(MASS_BIOME_FAMILIES.some(f=>f.id===terrain.biome)&&!found.has(terrain.biome))
   found.set(terrain.biome,{seed,x,y,region:terrain.region});
 }
 for(const {at,terrain} of samples.filter((_,i)=>i%37===0).reverse())assert.equal(canonical(gen.terrainAt(at)),canonical(terrain));
 const edge=address('surface','-1000000000000000','1000000000000000',959.999,0,960);
 assert.equal(canonical(gen.terrainAt(edge)),canonical(gen.terrainAt(address(edge.dimension,'-999999999999999',edge.cy,-.001,0,960))));
}
assert.deepEqual([...found.keys()].sort(),MASS_BIOME_FAMILIES.map(f=>f.id).sort());
for(const id of ['ice'])assert.ok(regions.has(id),id+' absent from survey');
console.log('PASS seeded surveys find every climate and native ice; localized wet patches have their own full-footprint probe; reverse reads and extreme page boundaries agree');
console.log(JSON.stringify(Object.fromEntries(found)));

function fixture(biome:string,region:string,explicit=true):MassAdventure{
 const c:MassAdventure=JSON.parse(canonical(config));
 delete c.settlement;delete c.journey;delete c.progression;
 delete c.nativeCountry;delete c.geography; // this fixture supplies all its terrain/content; native country is tested separately
 delete c.terrain.patches;delete c.terrain.landforms; // fixed surface fixture owns no geographic terrain layers
 c.terrain.fields=[];c.terrain.places=[];c.content=[];c.startRadius=0;c.populationRadius=0;c.maxPopulation=0;c.pageRadius=1;
 c.terrain.surfaces=[{id:'fixture',priority:0,when:[],region,biome,color:'#65757a'}];
 const row=JSON.parse(canonical(MASS_CLIMATE_ECOLOGY.find(r=>r.id===biome)!));
 row.chance=1;if(!explicit)delete row.regions;
 c.ecology={source:'probe/climate-scenery',spacing:192,rules:[row]};
 return c;
}
for(const [biome,region,status] of [['tundra','ice','slippery'],['marsh','mud','mired'],['marsh','swamp','sodden']]){
 const c=fixture(biome,region),w=makeSimWorld('warrior',102),mass=new WorldMassRuntime(42,biome+region,c);mass.attach(w);
 assert.ok(mass.ecology!.stats.pieces>0,'explicit native surface admits scenery');
 const expected=w.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort();
 const save=mass.snapshot(w),again=makeSimWorld('warrior',103);
 new WorldMassRuntime(42,biome+region,save.config,save).attach(again,save);
 assert.deepEqual(again.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort(),expected);
 w.doodads=[];w.markDoodadsChanged();w.actors=[w.player];
 (w as unknown as {updateTerrainEffects(dt:number):void}).updateTerrainEffects(1/60);
 assert.ok(w.player.statuses.some(s=>s.id===status),region+' applies native status');
 // A dry patch is the same route operation used by the opening journey.
 for(let y=-90;y<=90;y+=30)for(let x=-90;x<=90;x+=30)
  mass.state.paint({address:mass.walk.at(w.player.pos.x+x,w.player.pos.y+y),region:'ground',color:'#454331',cause:'probe/dry-route'});
 w.player.endStatus(status);
 (w as unknown as {updateTerrainEffects(dt:number):void}).updateTerrainEffects(1/60);
 assert.ok(!w.player.statuses.some(s=>s.id===status),'dry route does not reapply '+status);
 const omitted=fixture(biome,region,false);omitted.terrain.version=5;
 const old=makeSimWorld('warrior',104),legacy=new WorldMassRuntime(42,'legacy-'+region,omitted);legacy.attach(old);
 assert.equal(legacy.ecology!.stats.pieces,0,'omitted regions retain ground/sand-only admission');
 const oldSave=legacy.snapshot(old),resumed=makeSimWorld('warrior',105);
 new WorldMassRuntime(42,'legacy-'+region,oldSave.config,oldSave).attach(resumed,oldSave);
 assert.equal(resumed.massRuntime!.generator.run.version,5);assert.equal(resumed.massRuntime!.ecology!.stats.pieces,0);
}
console.log('PASS explicit wet/frozen ecology and exact Continue; native terrain statuses respect dry route patches; legacy omission stays unchanged');
for(const regions of [[],['bog','bog'],['unknown-region'],null]){
 const bad=fixture('marsh','mud').ecology! as MassEcologySpec;
 (bad.rules[0] as unknown as {regions:unknown}).regions=regions;
 assert.throws(()=>validateMassEcology(bad,960),/scenery regions/);
}
console.log('PASS invalid ecological surface lists are refused');
restore();
