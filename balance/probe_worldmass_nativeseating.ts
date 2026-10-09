import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {compareNativeSeating} from './nativeSeatingSurvey';
import {massAdventure} from '../src/worldmass/preset';
import {nativeRegionalSources} from '../src/worldmass/nativeRegionalSources';
import {MassNativeRegional} from '../src/worldmass/nativeRegional';
import {nativeRegionalSeat,NATIVE_REGIONAL_SEATING} from '../src/worldmass/nativeRegionalSeating';
import {nativeRegionalCircle,nativeRegionalMaterial} from '../src/worldmass/nativeRegionalGeometry';
import {MassGenerator,makeMassRun} from '../src/worldmass/generator';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {MassStream} from '../src/worldmass/stream';
import {MassState} from '../src/worldmass/state';
import {address,moveAddress,localOffset,latticeAt} from '../src/worldmass/address';
import {canonical,massDigest} from '../src/worldmass/random';
import type {MassSpec} from '../src/worldmass/contracts';
void makeSimWorld;
const copy=<T>(v:T):T=>JSON.parse(canonical(v));
const catalogue=nativeRegionalSources();let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}
const flat=(biome='downs',span=960):MassSpec=>({id:'native-seating-proof',version:1,addressSpan:span,terrainCell:30,fields:[],
 surfaces:[{id:'plain',priority:0,when:[],region:'ground',biome,color:'#445533'}],places:[],
 nativeRegional:{...copy(catalogue.policy),chance:1,seating:NATIVE_REGIONAL_SEATING}});

test('all native envelopes keep snapped scenery and reservations within their lattice at every seat',()=>{
 for(const source of catalogue.policy.sources)for(const seats of [1,3,8,16])for(let seed=0;seed<16;seed++)for(let seat=0;seat<seats;seat++){
  const g=source.geometry,p=nativeRegionalSeat(g,9600,120,seed,'containment',seat,seats),r=Math.hypot(g.width,g.height)/2+120;
  const x=Math.floor((p.x-g.width/2)/30)*30+g.width/2,y=Math.floor((p.y-g.height/2)/30)*30+g.height/2;
  assert.ok(x-r>=0&&y-r>=0&&x+r<=9600&&y+r<=9600,source.id);
 }
 const g=catalogue.policy.sources[0].geometry,r=Math.hypot(g.width,g.height)/2+150,extent=9600-r*2;
 for(let seed=0;seed<20;seed++){
  const rows=Array.from({length:16},(_,i)=>nativeRegionalSeat(g,9600,120,seed,'strata',i,16));
  for(const axis of ['x','y'] as const)assert.equal(new Set(rows.map(p=>Math.floor((p[axis]-r)/extent*16))).size,16);
 }
});

test('every source admits intact in its own biome including large and woodland envelopes',()=>{
 for(const recipe of catalogue.policy.recipes)for(const id of recipe.sources){
  const spec=flat(recipe.biomes[0]);spec.nativeRegional={...spec.nativeRegional!,sources:catalogue.policy.sources.filter(s=>s.id===id),recipes:[{...recipe,sources:[id]}]};
  const gen=new MassGenerator(makeMassRun(713,'seating-source',spec),spec),p=gen.nativeRegional!.candidate('surface',-3n,4n)!;assert.ok(p,id);
  assert.equal(p.source.hash,catalogue.policy.sources.find(s=>s.id===id)!.hash);
  for(const t of p.source.terminals){const at=moveAddress(p.origin,t,spec.addressSpan);assert.equal(gen.nativeRegional!.formationAt(at)?.id,p.id);assert.equal(gen.terrainAt(at).region,nativeRegionalMaterial(p.source.geometry,t.x,t.y));}
 }
});

test('site collision and finite enumeration refusal are distinct and both preserve the twenty-four-attempt bound',()=>{
 const spec=flat(),run=makeMassRun(42,'seating-bounds',spec),terrain={region:'ground',biome:'downs',color:'#445533',fields:{},source:{generator:'proof',version:1,source:'proof',rule:'proof',stream:'proof'}};
 for(const budget of [false,true]){
  let reads=0;const layer=new MassNativeRegional(spec,run,()=>{reads++;return terrain;},()=>budget?null:[{id:'protected',x:2000,y:1800,radius:10000}]);
  assert.equal(layer.candidate('surface',0n,0n),null);assert.equal(layer.counters.tried,24);assert.equal(reads,24);
  assert.equal(layer.counters.siteBudget,budget?24:0);assert.equal(layer.counters.sites,budget?0:24);
 }
 const excluded=copy(spec);excluded.nativeRegional!.exclusions=[{source:'opening',origin:address('surface','0','0',0,0,960),bounds:{minX:0,minY:0,maxX:9600,maxY:9600}}];
 const opening=new MassNativeRegional(excluded,makeMassRun(42,'opening',excluded),()=>terrain,()=>[]);
 assert.equal(opening.candidate('surface',0n,0n),null);assert.equal(opening.counters.opening,24);
 for(const value of [null,{},false,{kind:'source-fit',version:2},{kind:'other',version:1},{kind:'source-fit',version:1,fallbackSeats:9},{kind:'source-fit',version:1,fallbackSeats:0},{kind:'source-fit',version:1,fallbackSeats:8,extra:1}]){
  const invalid=copy(spec);(invalid.nativeRegional as any).seating=value;assert.throws(()=>makeMassRun(42,'invalid',invalid));
 }
});

test('biome-only selection matches material reads through site surfaces and skips all full reads for refused seats',()=>{
 const spec=flat();spec.fields=[{id:'wet',base:0,layers:[{id:'country',period:8200,amplitude:1}]}];
 spec.surfaces=[{id:'forest',priority:2,when:[{field:'wet',min:0}],region:'ground',biome:'forest',color:'#224422'},...spec.surfaces];
 spec.places=[{id:'paint',version:1,content:'paint',period:1800,chance:1,radius:800,jitter:0,priority:1,when:[],surface:{region:'water',color:'#334455'}}];
 const g=new MassGenerator(makeMassRun(713,'biome-read-proof',spec),spec);
 const view=g as unknown as {baseTerrainAt(at:ReturnType<typeof address>):ReturnType<MassGenerator['terrainAt']>;nativeRegionalBiomeAt(at:ReturnType<typeof address>):string};
 let painted=0;const biomes=new Set<string>();
 for(const cx of ['-9007199254740999','-3','0','9007199254740999'])for(const cy of ['-2','3'])for(const x of [15,495,945]){
  const at=address('surface',cx,cy,x,495,960),full=view.baseTerrainAt(at);if(full.region==='water')painted++;
  biomes.add(full.biome);assert.equal(view.nativeRegionalBiomeAt(at),full.biome);
 }
 assert.ok(painted>0&&biomes.size===2,'actual painted sites and both geographic surfaces were exercised');
 for(const seating of [undefined,NATIVE_REGIONAL_SEATING]){
  const policy=copy(spec);if(seating)policy.nativeRegional!.seating=seating;else delete policy.nativeRegional!.seating;
  const run=makeMassRun(713,'biome-read-proof',policy),blocked=()=>[{id:'protected',x:2000,y:1800,radius:10000}];
  const full=new MassNativeRegional(policy,run,at=>view.baseTerrainAt(at),blocked);
  const fast=new MassNativeRegional(policy,run,at=>view.baseTerrainAt(at),blocked,at=>view.nativeRegionalBiomeAt(at));
  for(const [x,y] of [[-3n,4n],[9007199254740999n,-9007199254741009n]]){
   assert.equal(full.candidate('surface',x,y),null);assert.equal(fast.candidate('surface',x,y),null);
  }
  assert.equal(full.counters.reads,full.counters.tried);assert.equal(fast.counters.reads,0);
  const {reads:_full,...fullCounts}=full.counters,{reads:_fast,...fastCounts}=fast.counters;assert.deepEqual(fastCounts,fullCounts);
 }
});

test('signed source-fit plans reproduce after eviction, streaming and cold worker compilation',()=>{
 for(const span of [30,960])for(const biome of ['downs','forest','highland','marsh']){
  const spec=flat(biome,span),run=makeMassRun(911,'seating-far',spec),a=new MassGenerator(run,spec),b=new MassGenerator(run,copy(spec));
  const cells=Array.from({length:34},(_,i)=>({x:9007199254740999n+BigInt(i),y:-9007199254741009n-BigInt(i)}));
  const hashes=cells.map(c=>massDigest(a.nativeRegional!.candidate('surface',c.x,c.y)));
  for(const c of cells.slice().reverse())b.nativeRegional!.candidate('surface',c.x,c.y);
  cells.forEach((c,i)=>assert.equal(massDigest(b.nativeRegional!.candidate('surface',c.x,c.y)),hashes[i]));assert.ok(a.nativeRegional!.stats.cached<=32);
  const p=a.nativeRegional!.candidate('surface',cells[0].x,cells[0].y)!,at=moveAddress(p.origin,p.source.terminals[0],span);
  const lattice=latticeAt(at,span,9600);assert.equal(lattice.gx,cells[0].x);assert.equal(lattice.gy,cells[0].y);
  const stream=new MassStream(a,new MassState(run,30),{maxPages:1,maxSamples:2048});stream.request([at]);stream.step((span/30)**2);assert.deepEqual(stream.sample(at),a.terrainAt(at));
  if(span===960){const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',`
   import{readFileSync}from'node:fs';import{MassGenerator}from'./src/worldmass/generator.ts';import{massDigest}from'./src/worldmass/random.ts';
   const {spec,run,x,y}=JSON.parse(readFileSync(0,'utf8')),g=new MassGenerator(run,spec);console.log(massDigest(g.nativeRegional.candidate('surface',BigInt(x),BigInt(y))));
  `],{input:canonical({spec,run,x:cells[0].x.toString(),y:cells[0].y.toString()}),encoding:'utf8',timeout:60000});assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),hashes[0]);}
 }
});

test('every source can use fallback without replacing its complete source or crossing biome recipes',()=>{
 for(const recipe of catalogue.policy.recipes)for(const id of recipe.sources){
  const spec=flat(recipe.biomes[0]);spec.nativeRegional={...spec.nativeRegional!,seats:1,sources:catalogue.policy.sources.filter(s=>s.id===id),recipes:[{...recipe,sources:[id]}]};
  const run=makeMassRun(713,'forced-fallback',spec),old=copy(spec);delete old.nativeRegional!.seating;
  const terrain={region:'ground',biome:recipe.biomes[0],color:'#445533',fields:{},source:{generator:'proof',version:1,source:'proof',rule:'proof',stream:'proof'}};
  const blocked=new Set<string>(),historical=new MassNativeRegional(old,makeMassRun(713,'forced-fallback',old),()=>terrain,origin=>{blocked.add(canonical(origin));return null;});
  assert.equal(historical.candidate('surface',-3n,4n),null);
  const make=()=>new MassNativeRegional(spec,run,()=>terrain,origin=>blocked.has(canonical(origin))?null:[]);
  const layer=make(),p=layer.candidate('surface',-3n,4n)!;assert.ok(p,id);assert.equal(layer.counters.fallbackAccepted,1);assert.equal(p.source.id,id);assert.equal(p.recipe,recipe.id);
  assert.equal(massDigest(make().candidate('surface',-3n,4n)),massDigest(p));
  for(const t of p.source.terminals){const at=moveAddress(p.origin,t,960);assert.equal(layer.sample(at,terrain)?.region,nativeRegionalMaterial(p.source.geometry,t.x,t.y));}
 }
});

let survey:ReturnType<typeof compareNativeSeating>;
test('repeatable three-seed natural survey reports gains, missing families, widths and exact historical identities',()=>{
 survey=compareNativeSeating();mkdirSync('balance/reports',{recursive:true});writeFileSync('balance/reports/native-seating-survey.json',JSON.stringify(survey,null,2));
 // Golden complete-plan identities captured before the biome-read optimization.
 assert.deepEqual(survey.map(r=>({historical:r.historical.accepted.map(p=>p.hash),sourceFit:r.sourceFit.accepted.map(p=>p.hash)})),[{"historical":["ab053ae48c830b06","2d3b50b8566d8b45","b03f57d7a5cfce4e"],"sourceFit":["0cea795f970bbd19","ab053ae48c830b06","e825db36d1c939c6","2d3b50b8566d8b45","b03f57d7a5cfce4e"]},{"historical":["b8454bc9fc0bcb27","0633bb9e472bf5a6","827a7b26b2321a38","ef5b6133c86e6911","5cac5dd88bd619c8","308cdc63f690aa7c","2f2845b999203b78","a11f5efa72cf1f9a","0deab20a924b46e4"],"sourceFit":["cb1129496b4f8390","b8454bc9fc0bcb27","0633bb9e472bf5a6","827a7b26b2321a38","ef5b6133c86e6911","5cac5dd88bd619c8","308cdc63f690aa7c","2f2845b999203b78","9bc4f807a497c6ca","a11f5efa72cf1f9a","03047d82a88470ed","0deab20a924b46e4"]},{"historical":["cac05874709733cb","970c40632d5b8684","85c218876d92f9f2","cae27e659dac6504","cf0e5107f53efc2b","8341790aa4950e13","7fd5a724e7d9f2a6","9f06cec06f165481"],"sourceFit":["cac05874709733cb","58cb14e488198dad","970c40632d5b8684","85c218876d92f9f2","cae27e659dac6504","cf0e5107f53efc2b","8341790aa4950e13","7fd5a724e7d9f2a6","9f06cec06f165481"]}]);
 for(const row of survey)for(const mode of [row.historical,row.sourceFit])assert.equal(mode.counters.biomeReads,mode.counters.tried);
 assert.deepEqual(survey.map(r=>r.historical.accepted.length),[3,9,8]);assert.deepEqual(survey.map(r=>r.sourceFit.accepted.length),[5,12,9]);
 assert.deepEqual(survey[0].historical.accepted.map(p=>p.hash),['ab053ae48c830b06','2d3b50b8566d8b45','b03f57d7a5cfce4e']);
 for(const row of survey){assert.ok(row.sourceFit.accepted.length>row.historical.accepted.length);assert.ok(row.sourceFit.counters.tried<=256*24);assert.equal(row.sourceFit.counters.siteBudget,0);}
 assert.equal(Object.keys(survey[0].sourceFit.byRecipe).length,2);
 for(const row of survey)for(const old of row.historical.accepted)assert.deepEqual(row.sourceFit.accepted.find(p=>p.x===old.x&&p.y===old.y),old,'every previously admitted source stays byte-identical');
 for(const row of survey)for(const [recipe,n] of Object.entries(row.historical.byRecipe))assert.ok(row.sourceFit.byRecipe[recipe]>=n);
 console.log('Natural survey:',JSON.stringify(survey.map(r=>({seed:r.historical.seed,before:r.historical.accepted.length,after:r.sourceFit.accepted.length,recipes:r.sourceFit.byRecipe,widths:r.sourceFit.byWidth,reads:r.sourceFit.reads,ms:r.sourceFit.elapsedMs}))));
});

test('real cold workers reproduce fallback-only natural regions and retained original regions',()=>{
 for(const row of survey){const spec=massAdventure().terrain,run=makeMassRun(row.sourceFit.seed,'nativeRegional-runtime',spec);
  const added=row.sourceFit.accepted.filter(p=>!row.historical.accepted.some(h=>h.x===p.x&&h.y===p.y));assert.ok(added.length);
  const targets=[...added,row.historical.accepted[0]],child=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',
   "import{readFileSync}from'node:fs';import{MassGenerator}from'./src/worldmass/generator.ts';import{massDigest}from'./src/worldmass/random.ts';const{spec,run,targets}=JSON.parse(readFileSync(0,'utf8'));const g=new MassGenerator(run,spec);console.log(JSON.stringify(targets.map(t=>massDigest(g.nativeRegional.candidate('surface',BigInt(t.x),BigInt(t.y))))));"
  ],{input:canonical({spec,run,targets}),encoding:'utf8',timeout:60000});assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),targets.map(t=>t.hash));
 }
});

const woodland={seed:713,accepted:[{x:-1,y:23,hash:'363b9080e5f39cc6'}]};
test('natural woodland admits one complete Sacred Groves source only after historical seats fail',()=>{
 const spec=massAdventure().terrain,old=copy(spec);delete old.nativeRegional!.seating;
 const before=new MassGenerator(makeMassRun(713,'nativeRegional-runtime',old),old);
 assert.equal(before.nativeRegional!.candidate('surface',-1n,23n),null);
 const g=new MassGenerator(makeMassRun(713,'nativeRegional-runtime',spec),spec),p=g.nativeRegional!.candidate('surface',-1n,23n)!;
 assert.ok(p);assert.equal(massDigest(p),woodland.accepted[0].hash);assert.equal(p.recipe,'nativeRegional-woodland');
 assert.equal(p.source.program,'sacred_groves');assert.equal(p.source.variant,'three_approaches');assert.equal(p.source.geometry.width,3600);
 assert.equal(g.nativeRegional!.counters.tried,19);assert.equal(g.nativeRegional!.counters.fallbackAccepted,1);
 const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',
  "import{readFileSync}from'node:fs';import{MassGenerator}from'./src/worldmass/generator.ts';import{massDigest}from'./src/worldmass/random.ts';const{spec,run}=JSON.parse(readFileSync(0,'utf8'));const g=new MassGenerator(run,spec);console.log(massDigest(g.nativeRegional.candidate('surface',-1n,23n)));"
 ],{input:canonical({spec,run:g.run}),encoding:'utf8',timeout:60000});assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),woodland.accepted[0].hash);
});

test('all surveyed native regions preserve exact cells and whole protected site clearances',()=>{
 for(const row of [...survey,{sourceFit:woodland}]){const spec=massAdventure().terrain,g=new MassGenerator(makeMassRun(row.sourceFit.seed,'nativeRegional-runtime',spec),spec);
  for(const found of row.sourceFit.accepted){const p=g.nativeRegional!.candidate('surface',BigInt(found.x),BigInt(found.y))!,shape=p.source.geometry;
   assert.equal(massDigest(p),found.hash);
   const lo=moveAddress(p.origin,{x:-120,y:-120},960),hi=moveAddress(p.origin,{x:shape.width+120,y:shape.height+120},960),seen=new Set<string>();
   for(let cy=BigInt(lo.cy);cy<=BigInt(hi.cy);cy++)for(let cx=BigInt(lo.cx);cx<=BigInt(hi.cx);cx++)
    for(const site of g.placesInCell({dimension:'surface',cx:cx.toString(),cy:cy.toString()})){
     if(seen.has(site.id)||spec.places.find(r=>r.id===site.recipe)?.landformHabitat)continue;seen.add(site.id);
     const q=localOffset(site.center,p.origin,960,100000);assert.equal(nativeRegionalCircle(shape,q.x,q.y,site.radius+120),false);
    }
   for(let y=15;y<shape.height;y+=30)for(let x=15;x<shape.width;x+=30){const region=nativeRegionalMaterial(shape,x,y);if(region)assert.equal(g.terrainAt(moveAddress(p.origin,{x,y},960)).region,region);}
  }
 }
});

test('new schema18 persists complete source-fit geometry and rejects old-client downgrade',()=>{
 seedGlobalRandom(2193);const world=makeSimWorld('warrior',2193),mass=new WorldMassRuntime(42,'nativeRegional-runtime',massAdventure());mass.attach(world);
 const pick=survey[0].sourceFit.accepted.find(p=>p.recipe==='nativeRegional-waterlands')!,plan=mass.generator.nativeRegional!.candidate('surface',BigInt(pick.x),BigInt(pick.y))!;
 const at=moveAddress(plan.origin,plan.source.terminals[4],960);world.landPartyAt(localOffset(at,{...mass.origin,x:0,y:0},960,100000));mass.update(world,true);
 const saved=mass.snapshot(world);assert.equal(saved.schema,18);const restoredWorld=makeSimWorld('warrior',2194),restored=new WorldMassRuntime(42,'nativeRegional-runtime',saved.config,saved);restored.attach(restoredWorld,saved);
 assert.equal(massDigest(restored.generator.nativeRegional!.formationAt(at)),massDigest(plan));
 assert.equal(canonical(restored.sites.snapshot(restoredWorld).changes),canonical(saved.sites!.changes));
 const old=copy(saved);old.schema=17;assert.throws(()=>new WorldMassRuntime(42,'nativeRegional-runtime',old.config,old),/Invalid worldmass checkpoint/);
 mass.dispose();restored.dispose();
});
console.log('nativeSeating:',passed,'checks');
