import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { installNodeMassWorkers, massWorkersStatus } from '../server/massWorkers';
import { massDependencyCacheDefault } from '../src/worldmass/ownedDependencyCache';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address } from '../src/worldmass/address';
import { createNativeFeatureWarmQueue } from '../src/worldmass/nativeWarm';
import { createGeographicPlanWarmQueue } from '../src/worldmass/geographicWarm';
import { createProcessionPlanWarmQueue } from '../src/worldmass/processionWarm';
import { createTerrainWarmQueue } from '../src/worldmass/terrainWarm';
import { prepareTerrainPacket } from '../src/worldmass/terrainPreparation';
import { resolveNativeFeature, type NativeFeatureRequest } from '../src/worldmass/nativeFeatures';
import { compileGeographicPlan, geographicPlanIdentity, type GeographicPlanReply } from '../src/worldmass/geographicPlan';
import { compileProcessionPlan, PROCESSION_PLAN_COMPILER, PROCESSION_ROUTE_POLICY, type ProcessionPlanInput } from '../src/worldmass/processionPlan';
import { makeMassRun } from '../src/worldmass/generator';
import { MassPlanGeneratorCache } from '../src/worldmass/planGeneratorCache';
import { MASS_HIERARCHY_DEFAULT, MassHierarchy } from '../src/worldmass/hierarchy';
import { nativeGeographicSelectionReceipt } from '../src/worldmass/geographicObjectiveChoice';
import { nativeMassProcessionSources, resolveMassProcessionContext } from '../src/worldmass/processionSources';
import { canonical, freezeData, isMassFrozenData, massDigest } from '../src/worldmass/random';
import { massCompileInput, massCompilePort } from '../src/worldmass/compilePort';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';

async function ready<T>(take:()=>T|undefined,error:()=>string|null):Promise<T>{
  const end=Date.now()+30_000;
  while(Date.now()<end){assert.equal(error(),null);const value=take();if(value)return value;await new Promise(r=>setTimeout(r,5));}
  throw Error('Node preparation timed out');
}
const undo=seedGlobalRandom(901743);
// Installing independent experiment policies must stay lazy. Environment
// changes affect only this probe process, and all original values are restored.
const priorTerrainFlag=process.env.HOLLOW_WAKE_TERRAIN_PREPARATION;
const priorDependencyFlag=process.env.HOLLOW_WAKE_DEPENDENCY_CACHE;
const checkInstallation=(options:Parameters<typeof installNodeMassWorkers>[0],dependency:boolean,terrain:boolean)=>{
  installNodeMassWorkers(options);
  assert.equal(massDependencyCacheDefault(),dependency,'independent dependency-cache construction policy');
  const port=massCompilePort('terrain');
  try{assert.equal(port!==undefined,terrain,'independent terrain-port policy');}
  finally{port?.terminate();}
  const content=massCompilePort('native');
  try{assert.ok(content,'ordinary content preparation remains available');}
  finally{content?.terminate();}
  assert.equal(massWorkersStatus().threads,0,'installing/selecting policies never starts a worker');
  assert.equal(massWorkersStatus().ports,0,'unsubmitted test ports are released');
};
try{
  delete process.env.HOLLOW_WAKE_TERRAIN_PREPARATION;delete process.env.HOLLOW_WAKE_DEPENDENCY_CACHE;
  checkInstallation({},false,false);
  process.env.HOLLOW_WAKE_DEPENDENCY_CACHE='1';checkInstallation({},true,false);
  delete process.env.HOLLOW_WAKE_DEPENDENCY_CACHE;process.env.HOLLOW_WAKE_TERRAIN_PREPARATION='1';
  checkInstallation({},false,true);
  process.env.HOLLOW_WAKE_DEPENDENCY_CACHE='1';
  checkInstallation({terrainPreparation:false,dependencyCache:false},false,false);
  process.env.HOLLOW_WAKE_TERRAIN_PREPARATION='0';process.env.HOLLOW_WAKE_DEPENDENCY_CACHE='0';
  checkInstallation({terrainPreparation:true,dependencyCache:true},true,true);
}finally{
  if(priorTerrainFlag===undefined)delete process.env.HOLLOW_WAKE_TERRAIN_PREPARATION;
  else process.env.HOLLOW_WAKE_TERRAIN_PREPARATION=priorTerrainFlag;
  if(priorDependencyFlag===undefined)delete process.env.HOLLOW_WAKE_DEPENDENCY_CACHE;
  else process.env.HOLLOW_WAKE_DEPENDENCY_CACHE=priorDependencyFlag;
}
installNodeMassWorkers({terrainPreparation:false,dependencyCache:false});
assert.equal(massCompilePort('terrain'),undefined,'ordinary hosts do not activate the experimental terrain lane');
assert.equal(massWorkersStatus().threads,0,'declining preparation does not start a compiler');
installNodeMassWorkers({terrainPreparation:true,dependencyCache:false});
const world=makeSimWorld('warrior',901743);
world.startWorldMass(901743);const mass=world.massRuntime!;
const native=createNativeFeatureWarmQueue()!,geographic=createGeographicPlanWarmQueue()!,procession=createProcessionPlanWarmQueue();
try{
  const request:NativeFeatureRequest={id:'shard-worker-tor',seed:42,source:{kind:'massif',id:'tor',tileset:'downs',scope:'landform',variant:'the grey tors',poolIndex:0},rockEntrance:true};
  native.offer([{id:request.id,origin:address('surface','0','0',0,0,960),request}]);
  let beats=0;const timer=setInterval(()=>beats++,5);
  let result:NonNullable<ReturnType<typeof native.takeReady>>;
  try{result=await ready(()=>native.takeReady(),()=>native.error);}finally{clearInterval(timer);}
  assert.ok(beats>0,'the host event loop runs while native generation executes');
  assert.equal(result.preparation.descriptor?.hash,resolveNativeFeature(request).hash);

  let input:ReturnType<NonNullable<typeof mass.geography>['preparationInput']>=null;
  for(let y=-6;y<=6&&!input;y++)for(let x=-6;x<=6&&!input;x++)input=mass.geography!.preparationInput(address('surface','0','0',x*5400+2700,y*5400+2700,960));
  assert.ok(input,'a native geographic source is available');
  assert.equal(massCompileInput({...input}),input,'unchanged dynamic inputs reuse the bounded immutable envelope');
  assert.equal(massCompileInput({...input,fixtureCount:input.fixtureCount+1}).terrain,input.terrain,'dynamic changes retain the same trusted land');
  assert.ok(canonical(input).length*2>1024*1024,'current land exceeds the former envelope limit');
  geographic.offer([input]);assert.ok(geographic.stats.inflight);
  const geographical=await ready(()=>geographic.takeReady(),()=>geographic.error);
  assert.equal(canonical(geographical.preparation.plan),canonical(compileGeographicPlan(input).plan));
  // Exercise the browser entry with the same current source as the hosted and
  // synchronous kernels, including its isolated imports and RNG behavior.
  const browserWorker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');require('tsx/cjs');globalThis.self=globalThis;globalThis.postMessage=value=>parentPort.postMessage(value);require(workerData.file);Math.random=()=>{throw Error('Worker consumed ambient RNG')};parentPort.on('message',data=>self.onmessage({data}));`,
    {eval:true,env:{...process.env,TSX_DISABLE_CACHE:'1'},workerData:{file:path.resolve('src/worldmass/geographicPlan.worker.ts')}});
  try{
    const response=new Promise<GeographicPlanReply>((resolve,reject)=>{browserWorker.once('message',resolve);browserWorker.once('error',reject);});
    browserWorker.postMessage({protocol:1,token:1,input,...geographicPlanIdentity(input),maxBytes:262144});
    const reply=await response;assert.ok(reply.preparation,reply.error??'missing browser worker result');
    assert.equal(canonical(reply.preparation.plan),canonical(geographical.preparation.plan),'browser and hosted workers produce the same current plan');
    console.log('PASS actual browser geographic worker equals the hosted and synchronous current plan without ambient RNG');
  }finally{await browserWorker.terminate();}

  const terrain={id:'shard-worker-route',version:1,addressSpan:960,terrainCell:24,fields:[],
    surfaces:[{id:'dry',priority:0,when:[],region:'ground',color:'#445533',biome:'grassland'}],places:[]};
  const cache=new MassPlanGeneratorCache(),peerCache=new MassPlanGeneratorCache();
  const cacheRun=makeMassRun(17,'plan-cache',terrain),firstGenerator=cache.get(cacheRun,terrain);
  assert.equal(cache.get(structuredClone(cacheRun),structuredClone(terrain)),firstGenerator,'equivalent messages reuse the generator');
  assert.notEqual(peerCache.get(cacheRun,terrain),firstGenerator,'workers and ports never share mutable generator caches');
  assert.throws(()=>cache.get({...cacheRun,manifest:'stale'},terrain),/manifest mismatch/);
  assert.equal(cache.get(cacheRun,terrain),firstGenerator,'failed construction preserves the last valid entry');
  const nextRun=makeMassRun(18,'plan-cache',terrain);
  assert.notEqual(cache.get(nextRun,terrain),firstGenerator,'a changed run replaces the cache');
  const changedTerrain={...terrain,version:2},changedRun=makeMassRun(18,'plan-cache',changedTerrain);
  const secondGenerator=cache.get(nextRun,terrain);
  assert.notEqual(cache.get(changedRun,changedTerrain),secondGenerator,'changed terrain replaces the cache');
  assert.notEqual(cache.get(cacheRun,terrain),firstGenerator,'returning to an older source reconstructs it; only one entry is retained');
  assert.equal(peerCache.get(cacheRun,terrain).run.seed,17,'replacing one cache cannot alter its peer');
  console.log('PASS shared planning cache reuse, per-port isolation, run/terrain replacement and failure recovery');
  const source=nativeMassProcessionSources().find(s=>s.tileset==='grassland')!;
  let route:ProcessionPlanInput|undefined;
  for(let seed=1;seed<200&&!route;seed++){
    const run=makeMassRun(seed,'shard-worker-route',terrain),hierarchy=new MassHierarchy(run.runId,seed,960,MASS_HIERARCHY_DEFAULT);
    const owner=hierarchy.at(address('surface','0','0',2700,2700,960)).zone,selection=[source],selectionReceipt=nativeGeographicSelectionReceipt(seed,owner.id,selection);
    if(!selectionReceipt.selected)continue;
    const ts=TILESETS[source.tileset!],zone:ZoneDef={id:owner.id,name:'Worker route',level:3,size:{w:5400,h:5400},objective:source.objective,
      theme:ts.theme,biome:ts.biome,tileset:ts.id,exits:[],map:{x:0,y:0},layout:ts.layout,packs:ts.packs};
    route={compiler:PROCESSION_PLAN_COMPILER,policy:PROCESSION_ROUTE_POLICY,run,terrain,owner,context:resolveMassProcessionContext(zone,source,3),
      selection,selectionReceipt,patches:[],regions:{ground:{walkable:true,dry:true}},reservations:{revision:'birth0',circles:[],boxes:[],capsules:[]}};
  }
  assert.ok(route);procession.offer([route]);const prepared=await ready(()=>procession.takeReady(),()=>procession.error);
  assert.equal(canonical(prepared.preparation),canonical(compileProcessionPlan(route)));
  assert.equal(procession.stats.fallbackSteps,0);assert.equal(massWorkersStatus().threads,1,'all compiler queues share one thread');
  assert.equal(massWorkersStatus().failed,0);
  const terrainQueue=createTerrainWarmQueue(mass.generator);assert.ok(terrainQueue,'ordinary production generator supports background preparation');
  try{
    const half=mass.generator.spec.terrainCell/2;
    const center=address('surface','-9007199254740993','0',half,half,mass.generator.spec.addressSpan);
    terrainQueue.offer([center]);
    assert.equal(massWorkersStatus().threads,2,'terrain has a separate lazy lane');
    let terrainBeats=0;const pulse=setInterval(()=>terrainBeats++,5);
    let value:NonNullable<ReturnType<typeof terrainQueue.take>>;
    try{value=await ready(()=>terrainQueue.stats.ready?terrainQueue.take(center):undefined,()=>terrainQueue.error);}finally{clearInterval(pulse);}
    assert.ok(terrainBeats>0,'host remains available during real terrain compiler work');
    assert.deepEqual(prepareTerrainPacket(value),prepareTerrainPacket(mass.generator.baseTerrainAt(center)),'real worker preserves exact base values, prototypes, frozen/owned brands and key order');
    assert.equal(terrainQueue.stats.adopted,1);
  }finally{terrainQueue.dispose();}
  assert.equal(massWorkersStatus().threads,1,'terrain disposal preserves the content lane');
  const dynamic={nested:{value:1}},shallow=Object.freeze(dynamic),first=massDigest(shallow);dynamic.nested.value=2;
  assert.notEqual(massDigest(shallow),first,'shallow freeze cannot conceal changed children');
  const frozen=freezeData({nested:{value:1}});assert.equal(canonical(frozen),'{"nested":{"value":1}}');
  assert.equal(isMassFrozenData(freezeData(Array(1))),false,'sparse arrays cannot certify inherited index values');
  let clock=1;const accessor=freezeData({get value(){return clock;}});const before=massDigest(accessor);clock++;
  assert.notEqual(massDigest(accessor),before,'frozen accessors are never treated as static data');
  console.log('PASS real Node native/geographic/procession parity, large land envelopes, responsive host, one thread and immutable identity safety',JSON.stringify({beats,...massWorkersStatus()}));
}finally{native.dispose();geographic.dispose();procession.dispose();mass.dispose();undo();}
assert.equal(massWorkersStatus().ports,0);assert.equal(massWorkersStatus().threads,0);
console.log('PASS disposal releases all compiler ports and the final worker');
