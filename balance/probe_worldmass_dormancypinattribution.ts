import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massDormancyPins } from '../src/worldmass/dormancy';
import { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import type { MassTerrain } from '../src/worldmass/contracts';

// Pre-certificate scanner contract, independent of the candidate's cache.
// Equality against this oracle catches extra and missing pins, not only known
// positive cases. Keep deliberately direct and uncached.
function referencePins(world:World,owned:ReadonlyMap<string,Actor>):Set<Actor>{
  const keys=new Set(['aiTargetId','watchQuarryId','aiRingTarget','mountId','patrolFollow','bornOf','lifelineId','gateLink','heldBy','casterId','targetId','ownerId','sourceId','victimId','preyId','quarryId','orbitAnchorId','echoPrey','necroId','cartId']);
  const native=new Set(owned.values()),ids=new Map([...native].map(a=>[a.id,a])),pins=new Set<Actor>(),seen=new Set<object>([world]);
  const visit=(value:unknown,key=''):void=>{
    if(typeof value==='number'&&keys.has(key)){const a=ids.get(value);if(a)pins.add(a);return;}
    if(!value||typeof value!=='object'||seen.has(value))return;
    if(value instanceof Actor){if(native.has(value))pins.add(value);return;}seen.add(value);
    if(value instanceof WeakMap||value instanceof WeakSet){for(const a of native)if(value.has(a))pins.add(a);return;}
    if(value instanceof Map){for(const[k,v]of value){if(typeof k==='number'){const a=ids.get(k);if(a)pins.add(a);}else visit(k);visit(v);}return;}
    if(value instanceof Set){for(const v of value){if(typeof v==='number'){const a=ids.get(v);if(a)pins.add(a);}else visit(v);}return;}
    for(const[k,v]of Object.entries(value))visit(v,k);
  };
  for(const[key,value]of Object.entries(world))if(!['actors','massRuntime','actorGrid','actorGridBuiltFor'].includes(key))visit(value,key);
  for(const a of world.actors)if(!native.has(a))for(const[k,v]of Object.entries(a))visit(v,k);
  return pins;
}

// Independent attribution only: this probe never patches the production
// dependency scanner or changes live controllers. Existing excludedOwners supplies a diagnostic
// counterfactual, never an instruction to retire an actor or skip a controller.
const restore=seedGlobalRandom(901743);
try {
  const w=makeSimWorld('warrior',901743);w.startWorldMass(901743);const m=w.massRuntime!;
  const span=m.config.terrain.addressSpan;
  w.landPartyAt({x:21660-Number(BigInt(m.origin.cx))*span,y:13500-Number(BigInt(m.origin.cy))*span});
  m.update(w,true);
  while(m.stream.stats.pending)m.stream.step(8192);
  const owned=(m as unknown as {readonly natives:ReadonlyMap<string,Actor>}).natives;const walk=w.walk!;assert.ok(owned.size>=3);
  const bodies=[...owned.values()],expected=bodies.slice(0,3),liveBefore=[...w.actors];
  const resources=bodies.map(a=>({actor:a,life:a.life,mana:a.mana,es:a.es}));
  const unknownController={nested:{targetId:expected[0].id},direct:expected[1],weak:new WeakMap<Actor,boolean>([[expected[2],true]])};
  Reflect.set(w,'probeUnknownNativeController',unknownController);
  const entries=Object.entries;
  const profile=(excluded:ReadonlySet<object>)=>{
    let visited=0,walkVisits=0,streamVisits=0,generatorVisits=0;
    const visitCounts=new Map<string,number>();
    Object.entries=((value:object)=>{visited++;if(value===walk)walkVisits++;if(value===m.stream)streamVisits++;if(value===m.generator)generatorVisits++;
      const name=value?.constructor?.name??'null';visitCounts.set(name,(visitCounts.get(name)??0)+1);return entries(value);}) as typeof Object.entries;
    let pins:Set<Actor>;const before=performance.now();
    try{pins=massDormancyPins(w,owned,excluded);}finally{Object.entries=entries;}
    return {pins,diagnosticMs:performance.now()-before,visited,walkVisits,streamVisits,generatorVisits,topKinds:[...visitCounts].sort((a,b)=>b[1]-a[1]).slice(0,10)};
  };
  const all=profile(new Set()),warm=profile(new Set()),withoutWalk=profile(new Set([walk]));
  const ids=(pins:ReadonlySet<Actor>)=>[...pins].map(a=>a.id).sort((a,b)=>a-b);
  assert.deepEqual(ids(warm.pins),ids(all.pins));
  assert.deepEqual(ids(all.pins),ids(referencePins(w,owned)),'cold and warm exact pin set must match the uncached prior scanner');
  assert.deepEqual(ids(withoutWalk.pins),ids(all.pins),'excluding the concrete derived MassWalk branch must not change these actual live pin identities');
  assert.ok(expected.every(a=>all.pins.has(a)&&withoutWalk.pins.has(a)),'unknown nested numeric/direct/weak owners must retain dependencies');
  assert.equal(all.walkVisits,1);assert.equal(all.streamVisits,1);assert.equal(all.generatorVisits,1);
  assert.equal(withoutWalk.walkVisits,0);assert.equal(withoutWalk.streamVisits,0);assert.equal(withoutWalk.generatorVisits,0);
  assert.ok(all.visited>withoutWalk.visited+10000,'the actual warm terrain graph must account for substantial extra reflective traversal');
  assert.deepEqual(w.actors,liveBefore);assert.ok(resources.every(r=>r.actor.life===r.life&&r.actor.mana===r.mana&&r.actor.es===r.es));
  assert.equal(w.massRuntime,m);assert.equal(w.walk,m.walk);
  console.log('PASS actual warmed native-world pin traversal includes derived MassWalk/stream/generator caches; unknown controllers and exact actor resources stay intact');
  for(const[label,r]of [['cold-all',all],['warm-all',warm],['diagnostic-excluded-walk',withoutWalk]] as const){const{pins,...stats}=r;console.log(JSON.stringify({label,pinIds:ids(pins),...stats}));}
  console.log(JSON.stringify({terrain:m.stream.stats,classicOwned:owned.size,native:m.nativeFeatures?.stats,limit:'Diagnostic timings include Object.entries counting; use operation counts and browser dormancy owner timing, not these as a release benchmark.'}));
  // A blanket walk exclusion is UNSAFE: arbitrary live references can be
  // attached to the real walk, including frozen containers and dynamic getters.
  let getterActor=bodies[5],getterCalls=0;
  const dynamic=Object.freeze(Object.defineProperty({},'actor',{enumerable:true,get(){getterCalls++;return getterActor;}}));
  const mutableMap=Object.freeze(new Map<unknown,unknown>([[bodies[6].id,true]]));
  const mutableSet=Object.freeze(new Set<unknown>([bodies[7]]));
  const mutableWeak=Object.freeze(new WeakMap<Actor,boolean>([[bodies[8],true]]));
  class ForeignController {constructor(readonly actor:Actor){}}
  const cycle:Record<string,unknown>={targetId:bodies[10].id};cycle.self=cycle;Object.freeze(cycle);
  const refs={direct:Object.freeze({actor:bodies[3]}),numeric:Object.freeze({targetId:bodies[4].id}),
    dynamic,mutableMap,mutableSet,mutableWeak,foreign:Object.freeze(new ForeignController(bodies[9])),cycle};
  Reflect.set(walk,'probeActualLiveReferences',refs);
  const check=(label:string)=>{const before=getterCalls,actual=profile(new Set());
    assert.equal(getterCalls,before+1,'certificate inspection must not invoke an accessor in addition to the native scan');
    assert.ok(bodies.slice(0,11).every(a=>actual.pins.has(a)),label+' lost an actual walk/controller dependency');
    assert.deepEqual(ids(actual.pins),ids(referencePins(w,owned)),label+' changed the full native pin set');
    return actual;
  };
  check('cold actual-walk refs');check('hot actual-walk refs');
  const unsafeSkip=profile(new Set([walk]));assert.ok(!unsafeSkip.pins.has(bodies[3]),'this proves blanket World.walk skipping loses dependencies');
  getterActor=bodies[11];mutableMap.set(bodies[12],true);mutableSet.add(bodies[13]);mutableWeak.set(bodies[14],true);
  const changed=profile(new Set());assert.ok(bodies.slice(11,15).every(a=>changed.pins.has(a)),'mutable collections/getters inside frozen containers must remain live');
  assert.deepEqual(ids(changed.pins),ids(referencePins(w,owned)),'mutation must preserve the full pin set');
  const late=Object.freeze({targetId:bodies[15].id});Reflect.set(walk,'probeLateOwner',late);
  const reduced=new Map([...owned].filter(([,a])=>a!==bodies[15]));massDormancyPins(w,reduced);
  const later=massDormancyPins(w,owned);assert.ok(later.has(bodies[15]),'a later owned identity must match a previously observed frozen numeric reference');
  assert.deepEqual(ids(later),ids(referencePins(w,owned)),'late owner must preserve the full pin set');
  console.log('PASS actual-walk direct/numeric/weak/class/cyclic references; changing getter and frozen mutable collections; late owned identity; blanket walk skipping correctly fails this contract');
  Reflect.deleteProperty(walk,'probeActualLiveReferences');Reflect.deleteProperty(walk,'probeLateOwner');
  Reflect.deleteProperty(w,'probeUnknownNativeController');
  // The production stream publishes immutable cache entries. Verify that hits
  // reuse entries while edits/restore replace them, without mutation or a
  // whole-owner exemption in the dependency scanner.
  const samples=(m.stream as unknown as {samples:Map<string,Readonly<{terrain:MassTerrain;revision:number}>>}).samples;
  const wrappers=[...samples.values()];assert.equal(wrappers.length,32768);
  assert.ok(wrappers.every(Object.isFrozen),'all actual production sample entries must be frozen');
  const wrapperCold=profile(new Set()),wrapperWarm=profile(new Set());
  assert.deepEqual(ids(wrapperCold.pins),ids(referencePins(w,owned)));
  assert.deepEqual(ids(wrapperWarm.pins),ids(wrapperCold.pins));
  assert.ok(wrapperWarm.visited<10000,'warm data-only certification must avoid traversing the32,768 immutable sample wrappers');
  const at={...m.origin,x:w.player.pos.x,y:w.player.pos.y},stateBefore=m.state.snapshot();
  m.stream.sample(at);const key=m.state.key(at),old=samples.get(key)!;assert.ok(Object.isFrozen(old));
  const oldRevision=old.revision,oldTerrain=old.terrain;m.stream.sample(at);assert.equal(samples.get(key),old);
  m.state.paint({address:at,region:'wall',color:'#123456',cause:'probe/immutable-entry'});m.stream.sample(at);
  const changedEntry=samples.get(key)!;assert.notEqual(changedEntry,old);assert.equal(changedEntry.terrain.region,'wall');
  assert.equal(old.revision,oldRevision);assert.equal(old.terrain,oldTerrain);assert.ok(Object.isFrozen(changedEntry));
  m.state.restore(stateBefore);m.stream.sample(at);assert.notEqual(samples.get(key),changedEntry);
  assert.equal(old.revision,oldRevision);assert.equal(changedEntry.terrain.region,'wall');assert.ok(Object.isFrozen(samples.get(key)));
  assert.equal(Reflect.set(old,'revision',-1),false,'frozen entries cannot be mutated even through reflection');
  assert.ok(samples.size<=m.stream.config.maxSamples);
  for(const[label,r]of [['production-wrapper-cold',wrapperCold],['production-wrapper-warm',wrapperWarm]]as const){const{pins,...stats}=r;console.log(JSON.stringify({label,pinIds:ids(pins),...stats}));}
  console.log('PASS production immutable entries: full pin equality, exact sample-hit reuse, frozen patch/restore replacement, old entries unchanged, residency bound');
  m.dispose();
} finally { restore(); }
