import assert from 'node:assert/strict';
import { installNodeMassWorkers, massWorkersStatus } from '../server/massWorkers';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address } from '../src/worldmass/address';
import { createNativeFeatureWarmQueue } from '../src/worldmass/nativeWarm';
import { createGeographicPlanWarmQueue } from '../src/worldmass/geographicWarm';
import { createProcessionPlanWarmQueue } from '../src/worldmass/processionWarm';
import { resolveNativeFeature, type NativeFeatureRequest } from '../src/worldmass/nativeFeatures';
import { compileGeographicPlan } from '../src/worldmass/geographicPlan';
import { compileProcessionPlan, PROCESSION_PLAN_COMPILER, PROCESSION_ROUTE_POLICY, type ProcessionPlanInput } from '../src/worldmass/processionPlan';
import { makeMassRun } from '../src/worldmass/generator';
import { MASS_HIERARCHY_DEFAULT, MassHierarchy } from '../src/worldmass/hierarchy';
import { nativeGeographicSelectionReceipt } from '../src/worldmass/geographicObjectiveChoice';
import { nativeMassProcessionSources, resolveMassProcessionContext } from '../src/worldmass/processionSources';
import { canonical, freezeData, isMassFrozenData, massDigest } from '../src/worldmass/random';
import { massCompileInput } from '../src/worldmass/compilePort';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';

async function ready<T>(take:()=>T|undefined,error:()=>string|null):Promise<T>{
  const end=Date.now()+30_000;
  while(Date.now()<end){assert.equal(error(),null);const value=take();if(value)return value;await new Promise(r=>setTimeout(r,5));}
  throw Error('Node preparation timed out');
}
const undo=seedGlobalRandom(901743);installNodeMassWorkers();
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

  const terrain={id:'shard-worker-route',version:1,addressSpan:960,terrainCell:24,fields:[],
    surfaces:[{id:'dry',priority:0,when:[],region:'ground',color:'#445533',biome:'grassland'}],places:[]};
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
