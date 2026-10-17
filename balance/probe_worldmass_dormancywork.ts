/** Descriptor-only dependency certification: independent a6f62a2d scanner and exact
 * pin/getter coverage. Optional --bench compares identical populated worlds;
 * it measures cold and warm descriptor traversal, never changes actor policy. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { massDormancyPins } from '../src/worldmass/dormancy';
import { freezeData, isMassFrozenData } from '../src/worldmass/random';
import { isOwnedTerrainRecord } from '../src/worldmass/ownedTerrain';
import { scanOwnedDependencyCache } from '../src/worldmass/ownedDependencyCache';

// Exact scanner declarations from a6f62a2d. No runtime Git dependency; never
// update this oracle to match an optimization.
const archivedSource = String.raw`const entityKeys = new Set(['aiTargetId','aiHitById','lastFoeId','watchQuarryId','aiRingTarget',
  'mountId','patrolFollow','bornOf','lifelineId','gateLink','heldBy','casterId','targetId','ownerId',
  'sourceId','victimId','preyId','quarryId','orbitAnchorId','echoPrey','necroId','cartId']);
// Attribution histories are not live dependency leases. They still remap in saves.
const dependencyKeys = new Set([...entityKeys].filter(k=>!['aiHitById','lastFoeId'].includes(k)));
/** A certificate covers only deeply immutable, plain, dependency-free data.
 * Actor identities, numeric reference fields, accessors, mutable collections,
 * unknown classes and cycles always fall back to ordinary dependency scanning.
 * Weak membership neither retains terrain history nor needs a mutation epoch:
 * every property of a certified graph is a frozen data descriptor. */
const dependencyFreeData=new WeakSet<object>();
function isDependencyFreeData(value:object,active?:Set<object>,budget?:{left:number}):boolean {
  if(dependencyFreeData.has(value))return true;
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null&&proto!==Array.prototype||!Object.isFrozen(value))return false;
  active??=new Set<object>();budget??={left:4096};
  if(--budget.left<0||active.size>=64||active.has(value))return false;
  active.add(value);
  try {
    for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))){
      if(!descriptor.enumerable)continue;
      // Inspection never invokes getters. Fallback keeps the original scanner
      // semantics, including one ordinary read of an enumerable accessor.
      if(!('value' in descriptor))return false;
      const child:unknown=descriptor.value;
      // Reject possible IDs even before they belong to this owner. Otherwise a
      // future actor could make a formerly harmless frozen record a live lease.
      if(typeof child==='number'&&dependencyKeys.has(key))return false;
      if(child!==null&&typeof child==='object'&&!isDependencyFreeData(child,active,budget))return false;
    }
    dependencyFreeData.add(value);return true;
  } finally {active.delete(value);}
}

export function massDormancyPins(world: World, owned: ReadonlyMap<string,Actor>,
  excludedOwners: ReadonlySet<object> = new Set()): Set<Actor> {
  const native=new Set(owned.values()), ids=new Map([...native].map(a=>[a.id,a]));
  const pinned=new Set<Actor>(), seen=new Set<object>([world]);
  const visit=(value:unknown,key=''):void=> {
    if(typeof value==='number' && dependencyKeys.has(key)) {const a=ids.get(value);if(a)pinned.add(a);return;}
    if(!value||typeof value!=='object'||seen.has(value)||excludedOwners.has(value))return;
    if(value instanceof Actor){if(native.has(value))pinned.add(value);return;}
    if(isDependencyFreeData(value))return;
    // Certified immutable graphs already have permanent cycle-free coverage;
    // only graphs we actually traverse need the per-query seen set.
    seen.add(value);
    if(value instanceof WeakMap||value instanceof WeakSet){for(const a of native)if(value.has(a))pinned.add(a);return;}
    if(value instanceof Map){for(const [k,v]of value){if(typeof k==='number'){const a=ids.get(k);if(a)pinned.add(a);}else if(k!==null&&typeof k==='object')visit(k);if(v!==null&&typeof v==='object')visit(v);}return;}
    if(value instanceof Set){for(const v of value){if(typeof v==='number'){const a=ids.get(v);if(a)pinned.add(a);}else if(v!==null&&typeof v==='object')visit(v);}return;}
    for(const [k,v]of Object.entries(value))visit(v,k);
  };
  for(const [key,value] of Object.entries(world)) {
    if(['actors','massRuntime','actorGrid','actorGridBuiltFor'].includes(key))continue;
    visit(value,key);
  }
  // Actors outside this owner can still aim at, carry, bind or depend on it.
  for(const a of world.actors)if(!native.has(a))for(const [k,v]of Object.entries(a))visit(v,k);
  return pinned;
}`;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
assert.equal(sha(archivedSource),'93bbe3995f28790fe91517665e765243300d29408ee484c2000758ee0845c783');
type Scan=typeof massDormancyPins;
function factory(source:string):()=>Scan {
  const js=ts.transpileModule(source.replace(/^export /gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const build=Function('Actor','isMassFrozenData','isOwnedTerrainRecord','scanOwnedDependencyCache',js+';return massDormancyPins;');
  return()=>build(Actor,isMassFrozenData,isOwnedTerrainRecord,scanOwnedDependencyCache) as Scan;
}
const archived=factory(archivedSource);
const actors=Array.from({length:8},(_,i)=>new Actor('pin proof '+i,'enemy',{x:0,y:0}));
const owned=new Map(actors.map((a,i)=>['body/'+i,a]));
const ids=(pins:Set<Actor>)=>[...pins].map(a=>a.id);
let comparisons=0;
function compare(label:string,graph:object,expected:number[],owners:ReadonlyMap<string,Actor>=owned):void {
  const world={actors:[],graph} as unknown as World,prior=archived();
  for(const temperature of ['cold','warm']) {
    const actual=ids(massDormancyPins(world,owners)),before=ids(prior(world,owners));
    assert.deepEqual(actual,before,label+' '+temperature+' archived parity');
    assert.deepEqual(actual,expected,label+' '+temperature+' exact order');comparisons++;
  }
}
const clean=freezeData({terrain:{region:'grass',fields:{height:.4}},items:[1,2,null,true]});
assert.ok(isMassFrozenData(clean));
compare('deep proven aliases',{a:clean,b:[clean,clean]},[]);
const numbered=freezeData({targetId:actors[0].id,child:{ownerId:actors[1].id},attribution:{aiHitById:actors[7].id}});
assert.ok(isMassFrozenData(numbered));
compare('proven numeric keys',{numbered},actors.slice(0,2).map(a=>a.id));
const lateWorld={actors:[],late:freezeData({nested:{targetId:actors[2].id}})} as unknown as World;
const reduced=new Map([...owned].filter(([,a])=>a!==actors[2])),priorLate=archived();
for(const owners of [reduced,owned,reduced,owned]){
  const actual=ids(massDormancyPins(lateWorld,owners));assert.deepEqual(actual,ids(priorLate(lateWorld,owners)));
  assert.deepEqual(actual,owners.has('body/2')?[actors[2].id]:[]);comparisons++;
}
const namedArray=Object.assign([1,2,3],{targetId:actors[3].id});
const frozenArray=freezeData(namedArray);assert.ok(isMassFrozenData(frozenArray));
compare('proven named array reference',{frozenArray},[actors[3].id]);
let reads=0,target=actors[4];
const getter=Object.freeze(Object.defineProperty({},'actor',{enumerable:true,get(){reads++;return target;}}));
assert.equal(isMassFrozenData(getter),false);
const getterWorld={actors:[],a:getter,aliases:[getter,getter]} as unknown as World,priorGetter=archived();
for(const next of [actors[4],actors[5],actors[4]]){
  target=next;const before=reads,actual=ids(massDormancyPins(getterWorld,owned));
  assert.equal(reads,before+1);assert.deepEqual(actual,ids(priorGetter(getterWorld,owned)));
  assert.equal(reads,before+2);assert.deepEqual(actual,[next.id]);comparisons++;
}
const cycle:Record<string,unknown>={ownerId:actors[6].id};cycle.self=cycle;Object.freeze(cycle);
const map=Object.freeze(new Map<unknown,unknown>([[actors[0].id,clean]]));
const weak=Object.freeze(new WeakMap([[actors[1],true]]));
compare('arbitrary frozen cycle and mutable collections',{cycle,map,weak},[actors[6].id,actors[0].id,actors[1].id]);
map.set(actors[2],clean);weak.set(actors[3],true);
compare('frozen collections remain live',{map,weak},[actors[0].id,actors[2].id,actors[1].id,actors[3].id]);
const hidden=freezeData(Object.defineProperty({clean},'targetId',{value:actors[0].id,enumerable:false}));
compare('nonenumerable dependency remains ignored',{hidden},[]);
let deep:object=freezeData({targetId:actors[7].id});
for(let i=0;i<70;i++)deep=freezeData({next:deep});
compare('depth fallback still finds numeric lease',{deep},[actors[7].id]);
const large=freezeData(Array.from({length:4100},(_,i)=>({index:i})));
compare('budget fallback and shared proven graph',{large,shared:[large,large],last:{actor:actors[1]}},[actors[1].id]);

// freezeData proves immutable descriptor VALUES, not that a value is not a
// Proxy. Even a frozen data property can have an observable/throwing get trap.
// Preserve the archived reflective trap order and never introduce an ordinary
// read during certification. Numeric leases still cause the ordinary fallback.
for(const behavior of ['side-effect','throw'] as const)for(const hasLease of [false,true]){
  const fixture=()=>{
    const tape:string[]=[];let armed=false,getReads=0;
    const target:Record<string,unknown>={height:1,nested:freezeData({height:.4})};
    if(hasLease)target.targetId=actors[6].id;
    Object.defineProperty(target,'hidden',{value:2,enumerable:false});
    const proxy=new Proxy(target,{
      get(object,key,receiver){
        if(armed){tape.push('get:'+String(key));getReads++;if(behavior==='throw')throw Error('armed proxy get');}
        return Reflect.get(object,key,receiver);
      },
      ownKeys(object){if(armed)tape.push('ownKeys');return Reflect.ownKeys(object);},
      getOwnPropertyDescriptor(object,key){if(armed)tape.push('descriptor:'+String(key));return Reflect.getOwnPropertyDescriptor(object,key);},
      getPrototypeOf(object){if(armed)tape.push('prototype');return Reflect.getPrototypeOf(object);},
      isExtensible(object){if(armed)tape.push('extensible');return Reflect.isExtensible(object);},
    });
    freezeData(proxy);assert.ok(isMassFrozenData(proxy),'a plain frozen Proxy can earn the existing data proof');
    armed=true;
    return{world:{actors:[],proxy} as unknown as World,tape,reads:()=>getReads};
  };
  const baseline=fixture(),current=fixture(),oldScan=archived();
  const capture=(scan:Scan,world:World)=>{
    try{return{pins:ids(scan(world,owned))};}
    catch(error){assert.ok(error instanceof Error);return{error:{name:error.name,message:error.message}};}
  };
  for(const temperature of ['cold','warm']){
    baseline.tape.length=current.tape.length=0;
    const expected=capture(oldScan,baseline.world),actual=capture(massDormancyPins,current.world);
    assert.deepEqual(actual,expected,behavior+' '+hasLease+' '+temperature+' proxy outcome');
    assert.deepEqual(current.tape,baseline.tape,behavior+' '+hasLease+' '+temperature+' exact proxy reflection/read tape');
    assert.equal(current.reads(),baseline.reads(),'same number of observable get-trap calls');
    if(!hasLease){assert.deepEqual(actual,{pins:[]});assert.equal(current.reads(),0,'certifying a data-only Proxy never reads get');}
    else if(behavior==='throw')assert.deepEqual(actual,{error:{name:'Error',message:'armed proxy get'}});
    else assert.deepEqual(actual,{pins:[actors[6].id]});
    comparisons++;
  }
}

// Count semantic work separately from timing. These objects have a proof from
// freezeData, but no dependency certificate yet. Plain Object.freeze wrappers
// and proven data both retain descriptor-only inspection. This optimization
// may remove entry tuples, never the descriptors or their observable traps.
const fresh=freezeData(Array.from({length:256},(_,i)=>({height:i/256,source:{name:'terrain'}})));
const countWorld={actors:[],wrapper:Object.freeze({fresh})} as unknown as World;
const descriptors=Object.getOwnPropertyDescriptors;
function descriptorCount(scan:Scan,world:World,owners:ReadonlyMap<string,Actor>){
  let count=0,descriptorEntryPairs=0;
  const dictionaries=new WeakSet<object>(),entries=Object.entries;
  Object.getOwnPropertyDescriptors=((value:object)=>{
    count++;const result=descriptors(value);dictionaries.add(result);return result;
  }) as typeof Object.getOwnPropertyDescriptors;
  Object.entries=((value:object)=>{
    const result=entries(value);if(dictionaries.has(value))descriptorEntryPairs+=result.length;return result;
  }) as typeof Object.entries;
  try{return {pins:ids(scan(world,owners)),count,descriptorEntryPairs};}
  finally{Object.getOwnPropertyDescriptors=descriptors;Object.entries=entries;}
}
const oldCount=descriptorCount(archived(),countWorld,owned),newCount=descriptorCount(massDormancyPins,countWorld,owned);
assert.deepEqual(newCount.pins,oldCount.pins);assert.equal(newCount.count,oldCount.count);assert.equal(oldCount.count,514);
assert.ok(oldCount.descriptorEntryPairs>0,'archived descriptor iteration allocates entry pairs');
assert.equal(newCount.descriptorEntryPairs,0,'descriptor-key iteration creates no descriptor entry pairs');
console.log(JSON.stringify({result:'PASS descriptor-only dependency certification',comparisons,archivedSha256:sha(archivedSource),descriptorCalls:{archived:oldCount.count,current:newCount.count},descriptorEntryPairs:{archived:oldCount.descriptorEntryPairs,current:newCount.descriptorEntryPairs}}));

if(process.argv.includes('--bench')){
  const {makeSimWorld}=await import('../src/sim/arena');
  const {seedGlobalRandom}=await import('../src/sim/rng');
  const current=readFileSync(new URL('../src/worldmass/dormancy.ts',import.meta.url),'utf8');
  const tree=ts.createSourceFile('dormancy.ts',current,ts.ScriptTarget.Latest,true);
  const names=new Set(['entityKeys','dependencyKeys','dependencyFreeData','hasDependencyFreeCertificate','isDependencyFreeData','massDormancyPins']);
  const currentSource=tree.statements.flatMap(s=>{
    if(ts.isFunctionDeclaration(s)&&s.name&&names.has(s.name.text))return[s.getText(tree)];
    if(ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.has(d.name.getText(tree))))return[s.getText(tree)];
    return[];
  }).join('\n');
  const factories={archived,current:factory(currentSource)};
  const undo=seedGlobalRandom(901743),w=makeSimWorld('warrior',901743);w.startWorldMass(901743);const m=w.massRuntime!;
  try{
    const span=m.config.terrain.addressSpan;
    w.landPartyAt({x:21660-Number(BigInt(m.origin.cx))*span,y:13500-Number(BigInt(m.origin.cy))*span});
    m.update(w,true);while(m.stream.stats.pending)m.stream.step(8192);
    const liveOwned=(m as unknown as {natives:ReadonlyMap<string,Actor>}).natives,bodies=[...liveOwned.values()];
    assert.ok(bodies.length>=3);
    Reflect.set(w,'pinBenchmarkController',{direct:bodies[0],numeric:{targetId:bodies[1].id},weak:new WeakMap([[bodies[2],true]])});
    const expected=ids(archived()(w,liveOwned));
    assert.deepEqual(ids(massDormancyPins(w,liveOwned)),expected);
    const state=()=>JSON.stringify({world:w.actors.map(a=>a.id),natives:bodies.map(a=>[a.id,a.life,a.mana,a.es,a.dead,m.dormancy?.isSleeping(a)]),terrain:m.stream.stats,time:w.time});
    const before=state();
    const realOldCount=descriptorCount(archived(),w,liveOwned),realNewCount=descriptorCount(factories.current(),w,liveOwned);
    assert.deepEqual(realOldCount.pins,expected);assert.deepEqual(realNewCount.pins,expected);
    const report={base:'a6f62a2d',node:process.version,method:'One populated world, no updates during timing. Four alternating rounds. Cold has a new certificate WeakSet for each of three scans; warm primes once then repeats25 scans. Compilation, fixture preparation, priming and descriptor counting are excluded. This isolates the dormancy change; other current dependencies are shared.',sourceDigests:{archived:sha(archivedSource),current:sha(currentSource)},fixture:{actors:w.actors.length,owned:liveOwned.size,terrain:m.stream.stats,orderedPins:expected},descriptorCalls:{archived:realOldCount.count,current:realNewCount.count},rows:[] as object[]};
    const run=(kind:'cold'|'warm',name:keyof typeof factories)=>{
      const scans=kind==='cold'?Array.from({length:3},()=>factories[name]()):[factories[name]()];
      if(kind==='warm')scans[0](w,liveOwned);
      const results:number[][]=[],count=kind==='cold'?3:25,started=performance.now();
      for(let i=0;i<count;i++)results.push(ids(scans[kind==='cold'?i:0](w,liveOwned)));
      const ms=performance.now()-started;
      for(const result of results)assert.deepEqual(result,expected);
      return{ms,queries:count,digest:sha(JSON.stringify(results))};
    };
    for(const name of ['archived','current'] as const)factories[name]()(w,liveOwned);
    for(const kind of ['cold','warm'] as const)for(let trial=0;trial<4;trial++){
      const order=trial%2===0?['archived','current'] as const:['current','archived'] as const;
      const result={} as Record<keyof typeof factories,ReturnType<typeof run>>;
      for(const name of order)result[name]=run(kind,name);
      assert.equal(result.archived.digest,result.current.digest);
      const row={kind,trial,...result};report.rows.push(row);console.log(JSON.stringify(row));
    }
    assert.equal(state(),before,'fixed-work scans must preserve actor order/resources/sleep and terrain state');
    writeFileSync('.claude/ownership.dormancy6-bench.local.json',JSON.stringify(report,null,2));
    writeFileSync('.claude/ownership.dormancy6-reference.local.txt',archivedSource);
    writeFileSync('.claude/ownership.dormancy6-candidate.local.txt',currentSource);
    console.log(JSON.stringify({result:'PASS identical real-world ordered pins and state',descriptorCalls:report.descriptorCalls,fixture:report.fixture}));
  }finally{m.dispose();undo();}
}
