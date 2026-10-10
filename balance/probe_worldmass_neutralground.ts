/** NeutralGround: real geographic coverage plus native status/ecology/Continue. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { address, localOffset } from '../src/worldmass/address';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassGround } from '../src/worldmass/ground';
import { massTerrainRegions } from '../src/worldmass/contracts';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { regionKind, regionPathCost } from '../src/world/regions';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { canonical } from '../src/worldmass/random';
const copy=<T>(v:T):T=>JSON.parse(canonical(v)) as T;
const fresh=massAdventure(),previous=copy(fresh);
// Reconstruct only the previous saved choices. Existing saved descriptors already
// contain them; neither Continue nor the generator rewrites old sand to firm sand.
previous.terrain.surfaces=previous.terrain.surfaces.map(s=>s.region==='firm_sand'?{...s,region:'sand'}:s);
previous.terrain.landforms!.interiorRegions=previous.terrain.landforms!.interiorRegions.filter(r=>r!=='firm_sand');
previous.terrain.landforms!.bypassRegions=previous.terrain.landforms!.bypassRegions.filter(r=>r!=='firm_sand');
for(const r of previous.ecology!.rules)if(r.id==='downs'||r.id==='desert')delete r.regions;
for(const r of previous.ecology!.landformDressing!.rules)if(r.regions)r.regions=r.regions.filter(id=>id!=='firm_sand');
const reports=[];
for(const seed of [42,713,2026]){
 const spec=fresh.terrain,g=new MassGenerator(makeMassRun(seed,'neutral-ground-survey',spec),spec);
 const old=new MassGenerator(makeMassRun(seed,'neutral-ground-survey',previous.terrain),previous.terrain);
 const ground=new MassGround(fresh.ground,seed,spec.addressSpan);
 let sampled=0,walkable=0,mired=0,firm=0,compared=0;const sources:Record<string,number>={};
 for(let y=-24000;y<=24000;y+=600)for(let x=-24000;x<=24000;x+=600){
  const at=address('surface','0','0',x,y,960),t=g.terrainAt(at),kind=regionKind(t.region)!;sampled++;
  if(kind.walkable)walkable++;
  if(kind.standStatus==='mired'){mired++;assert.ok(!spec.surfaces.some(s=>s.id===t.source.rule),'broad surface still applies Mired');}
  if(t.region==='firm_sand'){firm++;sources[t.source.rule]=(sources[t.source.rule]??0)+1;assert.equal(kind.standStatus,undefined);}
  if(sampled%79===0){
   const before=old.terrainAt(at);assert.deepEqual(t,{...before,region:before.region==='sand'&&['desert','shore'].includes(before.source.rule)?'firm_sand':before.region});
   assert.deepEqual(ground.color(t,at),ground.color(before,at),'material correction preserves authored color and ground palette');compared++;
  }
 }
 assert.ok(sources.desert>300&&sources.shore>100,'survey must exercise both broad sandy surfaces');
 assert.ok(mired>0&&mired/walkable<.02,'localized hazards remain while broad Mired coverage stays below 2%');
 reports.push({seed,sampled,walkable,mired,percent:mired/walkable*100,firm,sources,compared});
}
mkdirSync('balance/reports',{recursive:true});writeFileSync('balance/reports/neutral-ground-survey.json',JSON.stringify(reports,null,2));
console.log('PASS natural three-seed terrain, localized hazards, unchanged geography and palettes '+JSON.stringify(reports));
assert.ok(massTerrainRegions(fresh.terrain).includes('firm_sand'),'worker material manifest includes the neutral region');
for(const s of fresh.terrain.surfaces)assert.notEqual(regionKind(s.region)?.standStatus,'mired',s.id+' is a broad foundation');
assert.equal(regionPathCost('firm_sand'),1);assert.equal(regionPathCost('sand'),2);
console.log('PASS every fresh broad foundation excludes Mired; worker manifest and native path prices resolve firm sand');

const undo=seedGlobalRandom(719813);
try{
 for(const biome of ['downs','desert']){
  const fixture=(region:string,legacy=false):MassAdventure=>({
   terrain:{id:'neutral-ground-physical',version:1,addressSpan:960,terrainCell:30,fields:[],places:[],
    surfaces:[{id:biome,source:'tilesets/'+biome,priority:0,when:[],region,color:'#595340',biome}]},
   theme:copy(fresh.theme),content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256,
   ecology:{source:'neutral-ground-ecology',spacing:192,rules:[copy((legacy?previous:fresh).ecology!.rules.find(r=>r.id===biome)!)]},
  });
  const build=(config:MassAdventure)=>{const w=makeSimWorld('warrior',813),m=new WorldMassRuntime(713,'neutral-ground-'+biome,config);m.attach(w);return{w,m};};
  const now=build(fixture('firm_sand')),old=build(fixture('sand',true));
  const props=(w:typeof now.w)=>w.doodads.map(d=>canonical([d.kind,d.pos,d.radius,d.rot])).sort();
  assert.ok(props(now.w).length>20,'neutral sand must retain ordinary native scenery');assert.deepEqual(props(now.w),props(old.w));
  const speed=now.w.player.sheet.get('moveSpeed');
  const effects=(w:typeof now.w)=>(w as unknown as {updateTerrainEffects(dt:number):void}).updateTerrainEffects(1/60);
  effects(now.w);effects(old.w);assert.equal(now.w.player.gridRegion,'firm_sand');assert.equal(now.w.player.statuses.some(s=>s.id==='mired'),false);
  assert.equal(now.w.player.sheet.get('moveSpeed'),speed);assert.equal(old.w.player.sheet.get('moveSpeed'),speed*.6);
  for(const original of [now,old]){
   const saved=original.m.snapshot(original.w),again=makeSimWorld('warrior',814),continued=new WorldMassRuntime(713,'neutral-ground-'+biome,saved.config,saved);continued.attach(again,saved);
   assert.equal(canonical(continued.config),canonical(saved.config));assert.deepEqual(props(again),props(original.w));effects(again);
   assert.equal(again.player.gridRegion,original.w.player.gridRegion);assert.equal(again.player.statuses.some(s=>s.id==='mired'),original===old);
  }
  // Native loose deposits must still apply their original slow and step-off linger.
  const wet=now.m.walk.at(500,500),dry=now.m.walk.at(800,800);
  for(const region of ['sand','mud']){
   now.m.state.paint({address:wet,region,color:'#71614a',cause:'probe/localized-deposit'});
   now.w.player.pos={...localOffset(wet,now.m.walk.at(0,0),960)};effects(now.w);
   assert.equal(now.w.player.sheet.get('moveSpeed'),speed*.6);assert.ok(now.w.player.statuses.some(s=>s.id==='mired'));
   now.w.player.pos={...localOffset(dry,now.m.walk.at(0,0),960)};effects(now.w);assert.ok(now.w.player.statuses.some(s=>s.id==='mired'));
   now.w.player.updateTimers(.61);effects(now.w);assert.equal(now.w.player.sheet.get('moveSpeed'),speed);assert.equal(now.w.player.statuses.some(s=>s.id==='mired'),false);
  }
 }
 console.log('PASS native movement speed, unchanged desert/shore scenery, loose sand/mud and linger, fresh and historical cold Continue');
}finally{undo();}
