import { beforeWildernessPaths } from './worldmassFixtures';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { generateLocale, type LocaleBuildContext } from '../src/engine/localeGen';
import { nativeRegionalSources, captureNativeRegional } from '../src/worldmass/nativeRegionalSources';
import { MassNativeRegional, type NativeRegionalPlan } from '../src/worldmass/nativeRegional';
import { nativeRegionalMaterial, nativeRegionalCircle, nativeRegionalRoutes } from '../src/worldmass/nativeRegionalGeometry';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { massAdventure as currentMassAdventure } from '../src/worldmass/preset';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassStream } from '../src/worldmass/stream';
import { MassState } from '../src/worldmass/state';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { address, moveAddress, localOffset } from '../src/worldmass/address';
import { canonical, massDigest } from '../src/worldmass/random';
import { siteOffset } from '../src/worldmass/sites';
import { landformHabitatStand } from '../src/worldmass/landformHabitats';
import type { MassSpec } from '../src/worldmass/contracts';
void makeSimWorld;
const copy=<T>(v:T):T=>JSON.parse(canonical(v));
// Frozen schema-17 course; modern source-fit seating has its own coverage rig.
const massAdventure=()=>{const config=beforeWildernessPaths(copy(currentMassAdventure()));delete config.terrain.nativeRegional!.seating;return config;};
const catalogue=nativeRegionalSources(),start=performance.now();
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}
const flat=(biome='downs',span=960):MassSpec=>({id:'nativeRegional-proof',version:1,addressSpan:span,terrainCell:30,fields:[],
  surfaces:[{id:'plain',priority:0,when:[],region:'ground',biome,color:'#445533'}],places:[],
  nativeRegional:{...copy(catalogue.policy),chance:1,seats:1}});
test('audit all135 native variants without stripping cave/urn owners',()=>{
  assert.equal(catalogue.policy.coverage.length,135);
  assert.equal(catalogue.policy.sources.length,49);
  assert.equal(new Set(catalogue.policy.sources.map(s=>s.program)).size,21);
  assert.equal(catalogue.policy.coverage.filter(s=>s.unsupported.length).length,86);
  for(const s of catalogue.policy.sources) {
    const ctx:LocaleBuildContext={arena:s.plan.size!,entry:s.ports[0],exits:s.ports.slice(1),pois:[],doodads:[],caveSeeds:[]};
    generateLocale(ctx,copy(s.plan));
    assert.equal(canonical(ctx.doodads),canonical(s.doodads),s.id+' complete native dressing');
    assert.equal(canonical(ctx.localeReport),canonical(s.report),s.id+' complete district/link report');
    for(let y=0;y<s.geometry.height;y+=30)for(let x=0;x<s.geometry.width;x+=30) {
      const actual=nativeRegionalMaterial(s.geometry,x+15,y+15),native=ctx.walk!.regionAt!(x+15,y+15);
      if(actual!==undefined)assert.equal(actual,native,s.id+' exact native material');
      else assert.equal(native,'wall',s.id+' only unused exterior wall may be transparent');
    }
    assert.ok(nativeRegionalRoutes(s.geometry,s.terminals,s.doodads));
  }
});
test('cold worker terrain reproduces native materials, admission and signed source samples without game bootstrap',()=>{
  for(const biome of ['downs','forest','highland','marsh']) {
    const spec=flat(biome),run=makeMassRun(42,'nativeRegional-worker',spec),gen=new MassGenerator(run,spec);
    const cells=[['5','-8'],['9007199254740999','-9007199254741009']];
    const observe=(g:MassGenerator)=>cells.map(([x,y])=>{const p=g.nativeRegional!.candidate('surface',BigInt(x),BigInt(y))!;
      assert.ok(p);return {hash:massDigest(p),samples:p.source.terminals.map(t=>g.terrainAt(moveAddress(p.origin,t,spec.addressSpan)))};});
    const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',`
      import {readFileSync} from 'node:fs';
      import {MassGenerator} from './src/worldmass/generator.ts';
      import {massDigest} from './src/worldmass/random.ts';
      import {moveAddress} from './src/worldmass/address.ts';
      const {spec,run,cells}=JSON.parse(readFileSync(0,'utf8')),g=new MassGenerator(run,spec);
      console.log(JSON.stringify(cells.map(([x,y])=>{const p=g.nativeRegional.candidate('surface',BigInt(x),BigInt(y));
        return {hash:massDigest(p),samples:p.source.terminals.map(t=>g.terrainAt(moveAddress(p.origin,t,spec.addressSpan)))};})));
    `],{input:canonical({spec,run,cells}),encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
    assert.equal(child.status,0,child.stderr||String(child.error));assert.equal(canonical(JSON.parse(child.stdout)),canonical(observe(gen)));
  }
});
test('scale is shared data and preserves authored links and physical corridor widths',()=>{
  const a=captureNativeRegional('waterside_ward','procession',3600,991),b=captureNativeRegional('waterside_ward','procession',4800,991);
  assert.notEqual(a.geometry.width,b.geometry.width);assert.equal(canonical(a.plan.links),canonical(b.plan.links));
  assert.equal(a.plan.river!.width,b.plan.river!.width);assert.equal(a.plan.districts.length,b.plan.districts.length);
  assert.deepEqual(a.unsupported,[]);assert.deepEqual(b.unsupported,[]);
});
test('every saved source admits whole in its geographic recipe, with query-independent scenery orientation',()=>{
  for(const recipe of catalogue.policy.recipes)for(const id of recipe.sources) {
    const spec=flat(recipe.biomes[0]);spec.nativeRegional={...spec.nativeRegional!,sources:catalogue.policy.sources.filter(s=>s.id===id),recipes:[{...recipe,sources:[id]}]};
    const gen=new MassGenerator(makeMassRun(713,'nativeRegional-source-proof',spec),spec);
    const p=gen.nativeRegional!.candidate('surface',-3n,4n)!;assert.ok(p,id);
    const g=p.source.geometry,center=moveAddress(p.origin,{x:g.width/2,y:g.height/2},960),place=gen.regionalPlacesInCell(center).find(v=>v.id===p.id)!;
    assert.ok(place);assert.deepEqual(siteOffset(place,123,-91),{x:123,y:-91,angle:0});
    assert.equal(gen.placesInCell(center).length,0,'ordinary terrain admission never sees its content children');
    for(const t of p.source.terminals)assert.equal(gen.terrainAt(moveAddress(p.origin,t,960)).region,nativeRegionalMaterial(g,t.x,t.y));
  }
});
test('complete protected sites and opening foundations cause bounded whole-source refusal',()=>{
  const spec=flat(),run=makeMassRun(42,'nativeRegional-exclusion',spec),terrain={region:'ground',biome:'downs',color:'#445533',fields:{},source:{generator:'proof',version:1,source:'proof',rule:'proof',stream:'proof'}};
  const layer=new MassNativeRegional(spec,run,()=>terrain,()=>[{id:'protected',x:2000,y:1800,radius:10000}]);
  assert.equal(layer.candidate('surface',0n,0n),null);assert.equal(layer.counters.tried,1);assert.equal(layer.counters.sites,1);
  const excluded=copy(spec);excluded.patches={source:'proof',version:1,spacing:960,jitter:0,bypass:60,recipes:[],exclusions:[
    {source:'opening',origin:address('surface','0','0',0,0,960),bounds:{minX:0,minY:0,maxX:9600,maxY:9600}}]};
  const standalone=copy(massAdventure());delete standalone.terrain.landforms;delete standalone.terrain.patches;delete standalone.terrain.regionalDiscoveries;
  const reserved=reserveMassOpening(42,'nativeRegional-standalone',standalone);assert.ok(reserved.terrain.nativeRegional!.exclusions?.length);
  const g={nativeRegional:new MassNativeRegional(excluded,run,()=>terrain,()=>[])};
  assert.equal(g.nativeRegional!.candidate('surface',0n,0n),null);assert.equal(g.nativeRegional!.counters.opening,1);
});
test('large signed coordinates, small address spans, eviction and opposite query order reproduce exact plans',()=>{
  for(const span of [30,960]){
    const spec=flat('forest',span),run=makeMassRun(991,'nativeRegional-order',spec),a=new MassGenerator(run,spec),b=new MassGenerator(run,copy(spec));
    const cells=Array.from({length:36},(_,i)=>({x:9007199254740999n+BigInt(i),y:-9007199254741009n-BigInt(i)}));
    const expected=cells.map(c=>massDigest(a.nativeRegional!.candidate('surface',c.x,c.y)));
    cells.slice().reverse().forEach(c=>b.nativeRegional!.candidate('surface',c.x,c.y));
    assert.ok(a.nativeRegional!.stats.cached<=32);
    cells.forEach((c,i)=>assert.equal(massDigest(b.nativeRegional!.candidate('surface',c.x,c.y)),expected[i]));
    const p=a.nativeRegional!.candidate('surface',cells[0].x,cells[0].y)!;
    const at=moveAddress(p.origin,p.source.terminals[0],span),state=new MassState(run,30),stream=new MassStream(a,state,{maxPages:1,maxSamples:2048});
    stream.request([at]);stream.step((span/30)**2);
    assert.equal(canonical(stream.sample(at)),canonical(a.terrainAt(at)));
  }
});
test('saved descriptors reject geometry corruption, unsafe rules, unsupported sources and unbounded work',()=>{
  for(const change of [(s:MassSpec)=>{s.nativeRegional!.sources[0].geometry.rows as unknown; (s.nativeRegional as any).sources[0].hash='invalid';},
    (s:MassSpec)=>{(s.nativeRegional as any).seats=17;},(s:MassSpec)=>{(s.nativeRegional as any).sources[0].unsupported=['urn'];},
    (s:MassSpec)=>{(s.nativeRegional as any).sources[0].sceneryRules[0].rule.brittle={on:['touch']};}]) {
    const s=flat();change(s);assert.throws(()=>makeMassRun(42,'nativeRegional-invalid',s));
  }
});
let natural:NativeRegionalPlan;
test('naturally admitted multi-screen native regions retain complete sources and protected-site clearances',()=>{
  const spec=massAdventure().terrain,g=new MassGenerator(makeMassRun(42,'nativeRegional-runtime',spec),spec),found:NativeRegionalPlan[]=[];
  for(const [x,y] of [[5,-8],[2,-4],[-1,-1]]){const p=g.nativeRegional!.candidate('surface',BigInt(x),BigInt(y));if(p)found.push(p);}
  assert.equal(found.length,3);assert.ok(found.some(p=>p.source.geometry.width===4800));natural=found[0];
  for(const p of found){
    const shape=p.source.geometry,seen=new Set<string>();
    for(let y=15;y<shape.height;y+=240)for(let x=15;x<shape.width;x+=240){
      const at=moveAddress(p.origin,{x,y},960);seen.add(at.cx+','+at.cy);
      const r=nativeRegionalMaterial(shape,x,y);
      if(r!==undefined)assert.equal(g.terrainAt(at).region,r);
      for(const site of g.placesInCell(at)) {
        if(spec.places.find(r=>r.id===site.recipe)?.landformHabitat)continue;
        const q=localOffset(site.center,p.origin,960,100000);
        assert.equal(nativeRegionalCircle(shape,q.x,q.y,site.radius+spec.nativeRegional!.clearance),false);
      }
    }
    assert.ok(seen.size>=12);
  }
});
test('native scenery, habitat body clearance, mutation and schema17 cold Continue share durable owners',()=>{
  seedGlobalRandom(2193);const world=makeSimWorld('warrior',2193),mass=new WorldMassRuntime(42,'nativeRegional-runtime',massAdventure());mass.attach(world);
  const target=moveAddress(natural.origin,natural.source.terminals[4],960);
  let q=localOffset(target,{...mass.origin,x:0,y:0},960,100000);world.landPartyAt(q);mass.update(world,true);
  const p=mass.generator.nativeRegional!.formationAt(target)!;assert.ok(p);
  const place=mass.placesInCell(target).find(s=>s.id===p.id)!;assert.ok(place);
  const source=p.source.geometry,center=moveAddress(p.origin,{x:source.width/2,y:source.height/2},960);
  const localCenter=localOffset(center,{...mass.origin,x:0,y:0},960,100000);
  assert.equal(mass.populationFor(place).level,mass.levelAt(localCenter));
  const spec=mass.config.content.find(c=>c.id===place.content)!.site!;
  const owned=spec.doodads.map(d=>world.doodads.find(v=>v.kind===d.kind&&Math.hypot(v.pos.x-localCenter.x-d.pos.x,v.pos.y-localCenter.y-d.pos.y)<.01));
  assert.ok(owned.length>20&&owned.every(Boolean),'all native scenery loaded in exact orientation');
  const changed=owned[0]!;world.doodads=world.doodads.filter(d=>d!==changed);world.markDoodadsChanged();
  const enemies=world.actors.filter(a=>a.team==='enemy'&&!a.dead);
  for(const a of enemies)if(mass.generator.nativeRegional!.reserves(mass.walk.at(a.pos.x,a.pos.y),a.radius))
    assert.ok(landformHabitatStand(mass.walk,a.pos,a.radius));
  const nativeBodies=(mass as unknown as {natives:Map<string,import('../src/engine/actor').Actor>}).natives;
  const regionBodies=[...nativeBodies.values()]
    .filter(a=>!a.dead&&mass.generator.nativeRegional!.formationAt(mass.walk.at(a.pos.x,a.pos.y))?.id===p.id);
  assert.ok(regionBodies.length>=2,'actual native habitat bodies live in the admitted region');
  const woundedId=[...nativeBodies].find(([,a])=>a===regionBodies[0])![0],fallenId=[...nativeBodies].find(([,a])=>a===regionBodies[1])![0];
  regionBodies[0].life=regionBodies[0].maxLife()*.37;world.kill(regionBodies[1],false,world.player);mass.update(world,true);
  const saved=mass.snapshot(world);assert.equal(saved.schema,17);
  const savedText=canonical(saved),restoredWorld=makeSimWorld('warrior',2194),restored=new WorldMassRuntime(42,'nativeRegional-runtime',saved.config,saved);
  restored.attach(restoredWorld,saved);assert.equal(canonical(saved),savedText);
  assert.equal(massDigest(restored.generator.nativeRegional!.formationAt(target)),massDigest(p));
  assert.equal(canonical(restored.sites.snapshot(restoredWorld).changes),canonical(saved.sites!.changes));
  const continued=restored.snapshot(restoredWorld);
  assert.equal(continued.enemies.find(e=>e.id===woundedId)!.life,regionBodies[0].life);
  assert.ok(!continued.enemies.some(e=>e.id===fallenId)&&continued.state.claims.some(([kind,id])=>kind==='fallen'&&id===fallenId));
  // The native restore path allocates fresh squad numbers. Normalize only those
  // numbers by first occurrence, preserving the complete group membership graph.
  const stableBodies=(rows:typeof saved.enemies)=>{const groups=new Map<number,number>(),packs=new Map<number,number>();
    const stable=(m:Map<number,number>,id:number)=>{if(!m.has(id))m.set(id,m.size);return m.get(id)!;};
    return rows.map(e=>({...e,...(e.encounterGroup?{encounterGroup:{...e.encounterGroup,id:stable(groups,e.encounterGroup.id)}}:{}),
      ...(e.magicPack?{magicPack:{...e.magicPack,id:stable(packs,e.magicPack.id)}}:{})}));};
  assert.deepEqual(stableBodies(continued.enemies),stableBodies(saved.enemies),'native wounds, casualties, anchors and formations survive Continue');
  for(const port of p.source.terminals) {
    const at=moveAddress(p.origin,port,960);assert.equal(restored.generator.terrainAt(at).region,mass.generator.terrainAt(at).region);
  }
  const old=copy(saved);old.schema=15;assert.throws(()=>new WorldMassRuntime(42,'nativeRegional-runtime',old.config,old),/Invalid worldmass checkpoint/);
  console.log('Native bodies checked:',enemies.length,'scenery:',owned.length);
});
console.log('nativeRegional:',passed,'checks;',Math.round(performance.now()-start),'ms');
