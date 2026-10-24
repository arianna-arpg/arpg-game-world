import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { withSeededRandom } from '../src/core/rng';
import { TILESETS } from '../src/data/tilesets';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { copyNativeGeographyData, snapshotNativeGeographyData, createNativeGeographyReader, hydrateNativeGeographySource, restoreNativeGeographySource } from '../src/world/geographySource';

// Independent cache-boundary course. For balance/ promotion, change only the
// three-level source import prefix to ../src; preserve every assertion.
const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const freeze = <T>(value:T):T => { if(value && typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value; };
const world=withSeededRandom(713,()=>makeSimWorld('warrior',713));world.sim.bindGeographyPolicies();
const full=captureNativeGeographySource(713);
const tiny:any=clone(full),tile=tiny.tilesets[0];
tiny.seed=2713;tiny.biomes=tiny.biomes.filter(([id]:[string])=>id==='grove'||id==='desert');
tiny.tilesets=[tile];tiny.pools={shared:[['grove',[tile[0],tile[0]]]],realms:[['test',[['only_realm',[tile[0]]],['grove',[tile[0]]]]]]};
tiny.field.table=[{biome:'grove'}];tiny.field.bands=[];tiny.field.floors=[];
tiny.climate={schema:1,algorithm:'native-climate-v1',origin:{x:0,y:0},anchors:[],dimensions:[],axes:[['temperature',{id:'temperature',label:'Temperature',base:.5,layers:[{kind:'noise',cell:1200,amp:.1}]}]],bands:[['temperature',[['mild',{from:0,to:1}]]]]};
tiny.dimensions=[['surface',{id:'surface',label:'Surface',color:'#ffffff'}]];
const results:{name:string;status:'PASS'|'FAIL';detail?:unknown;error?:string}[]=[];
function course(name:string,run:()=>unknown):void{try{const detail=run();results.push({name,status:'PASS',detail});console.log('PASS',name,JSON.stringify(detail??null));}catch(error){const message=error instanceof Error?error.stack??error.message:String(error);results.push({name,status:'FAIL',error:message});console.error('FAIL',name,message);}}
function proto<T>(target:object,key:PropertyKey,descriptor:PropertyDescriptor,run:()=>T):T{const prior=Object.getOwnPropertyDescriptor(target,key);Object.defineProperty(target,key,{configurable:true,...descriptor});try{return run();}finally{if(prior)Object.defineProperty(target,key,prior);else Reflect.deleteProperty(target,key);}}
const fresh=(seed:number)=>{const value=clone(tiny);value.seed=seed;return value;};
const probe=hydrateNativeGeographySource(tiny),bytes=probe.identity;

course('module output sharing never brands mutable or externally frozen caller input',()=>{
 const raw=fresh(3001),a=hydrateNativeGeographySource(raw);assert.notEqual(a.source,raw);assert.equal(hydrateNativeGeographySource(a.source),a);
 raw.seed=3002;const b=hydrateNativeGeographySource(raw);assert.notEqual(a.identity,b.identity);assert.equal(a.source.seed,3001);
 raw.climate.axes[0][1].base='invalid';assert.throws(()=>hydrateNativeGeographySource(raw));
 const frozen=freeze(fresh(3001));let ownKeys=0;const proxy=new Proxy(frozen,{ownKeys(target){ownKeys++;return Reflect.ownKeys(target);}});
 assert.equal(hydrateNativeGeographySource(proxy).identity,a.identity);assert.ok(ownKeys>0,'externally frozen matching bytes must still be copied/validated');
 const malformed=fresh(3001);malformed.climate.axes[0][1].base='invalid';assert.throws(()=>hydrateNativeGeographySource(freeze(malformed)));
 let getters=0;const accessor=fresh(3001);Object.defineProperty(accessor.field,'hidden',{enumerable:true,get(){getters++;return 1;}});Object.freeze(accessor.field);Object.freeze(accessor);assert.throws(()=>hydrateNativeGeographySource(accessor));assert.equal(getters,0,'input accessors must not execute');
 return {distinctCallerSeeds:[a.source.seed,b.source.seed],frozenProxyOwnKeys:ownKeys,accessorCalls:getters};
});

course('exact serialized bytes refuse normalization but retain valid insertion order',()=>{
 restoreNativeGeographySource(bytes);
 const malformed=[bytes+' ',JSON.stringify(JSON.parse(bytes),null,2),bytes.replace('{"schema":1,','{"schema":1,"schema":1,'),bytes.replace('"seed":2713','"seed":2.713e3'),bytes.replace('native-geography-v1','native-geograph\\u0079-v1'),bytes.replace('"seed":2713','"seed":-0')];
 for(const text of malformed){assert.notEqual(text,bytes);assert.throws(()=>restoreNativeGeographySource(text));}
 assert.throws(()=>restoreNativeGeographySource(42 as unknown as string));
 const changed=fresh(3003),changedBytes=JSON.stringify(changed);const changedSource=restoreNativeGeographySource(changedBytes);assert.equal(changedSource.seed,3003);assert.equal(JSON.stringify(changedSource),changedBytes);
 const ordered=Object.fromEntries(Object.entries(tiny).reverse()),orderedBytes=JSON.stringify(ordered);assert.notEqual(orderedBytes,bytes);const reordered=restoreNativeGeographySource(orderedBytes);assert.equal(JSON.stringify(reordered),orderedBytes,'valid own insertion order is identity, never sorted');
 assert.equal(JSON.stringify(restoreNativeGeographySource(bytes)),bytes);
 return {malformedCases:malformed.length+1,changedSeed:changedSource.seed,distinctValidOrder:true};
});

course('warm object and byte hits preserve dirty prototype refusals',()=>{
 const source=restoreNativeGeographySource(bytes),plain=clone(tiny);let cases=0,toJsonCalls=0;
 for(const [target,key,descriptor]of [
  [Object.prototype,'memoInherited',{enumerable:true,value:1}],
  [Array.prototype,'memoInherited',{enumerable:true,value:1}],
  [Object.prototype,'stops',{enumerable:false,value:42}],
  [Object.prototype,'anchor',{enumerable:false,value:42}],
  [Object.prototype,'toJSON',{enumerable:false,get(){toJsonCalls++;throw Error('memo toJSON witness');}}],
  [Array.prototype,'toJSON',{enumerable:false,get(){toJsonCalls++;throw Error('memo array toJSON witness');}}],
 ] as [object,string,PropertyDescriptor][]){
  proto(target,key,descriptor,()=>{assert.throws(()=>hydrateNativeGeographySource(source),key+' warmed source');assert.throws(()=>hydrateNativeGeographySource(plain),key+' cold source');assert.throws(()=>restoreNativeGeographySource(bytes),key+' warmed bytes');});cases++;
  assert.equal(JSON.stringify(restoreNativeGeographySource(bytes)),bytes);
 }
 assert.ok(toJsonCalls>=6);return{prototypeCases:cases,toJsonCalls};
});

course('dirty successful hydration cannot poison clean object or byte admission',()=>{
 const bad=fresh(3101);delete bad.climate.axes[0][1].base;const badBytes=JSON.stringify(bad);
 let held:ReturnType<typeof hydrateNativeGeographySource>|undefined;let restored:ReturnType<typeof restoreNativeGeographySource>|undefined;
 proto(Object.prototype,'base',{enumerable:false,value:0},()=>{held=hydrateNativeGeographySource(bad);restored=restoreNativeGeographySource(badBytes);assert.equal(Object.hasOwn(held.source.climate.axes[0][1],'base'),false);});
 assert.ok(held&&restored);assert.throws(()=>hydrateNativeGeographySource(held!.source));assert.throws(()=>hydrateNativeGeographySource(restored!));assert.throws(()=>restoreNativeGeographySource(badBytes));
 return{dirtyLegacyAcceptanceObserved:true,cleanObjectAndByteRefused:true};
});

course('proxy-induced self-clearing prototype pollution cannot create a trusted output',()=>{
 const bad=fresh(3102);delete bad.climate.axes[0][1].base;let planted=false,reads=0;
 const prior=Object.getOwnPropertyDescriptor(Object.prototype,'base');
 const hostile=new Proxy(bad,{ownKeys(target){if(!planted){planted=true;Object.defineProperty(Object.prototype,'base',{configurable:true,enumerable:false,get(){reads++;Reflect.deleteProperty(Object.prototype,'base');return 0;}});}return Reflect.ownKeys(target);}});
 let held:ReturnType<typeof hydrateNativeGeographySource>|undefined;
 try{held=hydrateNativeGeographySource(hostile);}finally{if(prior)Object.defineProperty(Object.prototype,'base',prior);else Reflect.deleteProperty(Object.prototype,'base');}
 assert.ok(held&&planted);assert.equal(reads,1,'fixture must actually affect the intermediate strict validator');
 assert.throws(()=>hydrateNativeGeographySource(held!.source),'intermediate dirty validation must not brand output');assert.throws(()=>restoreNativeGeographySource(held!.identity),'intermediate dirty validation must not populate exact-byte memo');
 return{proxyPlanted:planted,prototypeReads:reads,subsequentCleanRefusals:2};
});

course('entry and byte limits evict exact sources while retained weak outputs stay valid',()=>{
 const rows=Array.from({length:7},(_,i)=>hydrateNativeGeographySource(fresh(3200+i)));
 const before=rows[0],again=restoreNativeGeographySource(before.identity);assert.notEqual(again,before.source,'more than four sources must evict earliest strong entry');assert.deepEqual(again,before.source);assert.equal(hydrateNativeGeographySource(before.source),before,'eviction must not mutate a held output');
 const four=Array.from({length:4},(_,i)=>hydrateNativeGeographySource(fresh(3300+i)));assert.equal(restoreNativeGeographySource(four[0].identity),four[0].source);hydrateNativeGeographySource(fresh(3304));assert.equal(restoreNativeGeographySource(four[0].identity),four[0].source,'byte access refreshes LRU');assert.notEqual(restoreNativeGeographySource(four[1].identity),four[1].source,'untouched oldest entry evicts');
 const large=fresh(3400);large.biomes[0][1].label='x'.repeat(600000);const a=hydrateNativeGeographySource(large);large.seed=3401;const b=hydrateNativeGeographySource(large);assert.ok(a.identity.length*2<2*1024*1024&&a.identity.length*2+b.identity.length*2>2*1024*1024);assert.notEqual(restoreNativeGeographySource(a.identity),a.source,'byte budget must evict before four entries');
 return{churnedSources:rows.length,lruRefreshed:true,byteBudgetWitness:[a.identity.length*2,b.identity.length*2]};
});

course('oversized valid sources remain usable without strong-cache retention',()=>{
 const value=fresh(3500);value.biomes[0][1].label='x'.repeat(2*1024*1024);const a=hydrateNativeGeographySource(value);assert.ok(a.identity.length*2>2*1024*1024);
 const b=restoreNativeGeographySource(a.identity),c=restoreNativeGeographySource(a.identity);assert.notEqual(a.source,b);assert.notEqual(b,c);assert.deepEqual(b,c);assert.equal(hydrateNativeGeographySource(a.source),a);
 return{serializedUtf16Bytes:a.identity.length*2,freshStrongRestores:true};
});

course('same-source readers retain independent sequence-dependent field memos',()=>{
 const value=fresh(3600);value.dimensions[0][1].biomes=[{biome:'desert',weight:1}];const source=hydrateNativeGeographySource(value).source;
 const points=[{x:1,y:1},{x:130,y:130},{x:-520,y:780},{x:30,y:-8810}];
 const read=(r:ReturnType<typeof createNativeGeographyReader>,order:'region'|'realm')=>points.map(at=>{if(order==='region'){const region=r.regionWinner(at);return{region,realm:r.dimensionBiomeAt('surface',at)};}const realm=r.dimensionBiomeAt('surface',at);return{region:r.regionWinner(at),realm};});
 const a=createNativeGeographyReader(source),b=createNativeGeographyReader(source),first=read(a,'region'),second=read(b,'realm');assert.notDeepEqual(first,second,'fixture must expose native sequence-dependent memo behavior');
 assert.deepEqual(read(createNativeGeographyReader(source),'region'),first);assert.deepEqual(read(createNativeGeographyReader(source),'realm'),second);assert.deepEqual(read(a,'region'),first);assert.deepEqual(read(b,'realm'),second);
 const returned=a.climateAt(points[0]);returned.temperature=-123;assert.notEqual(b.climateAt(points[0]).temperature,-123);
 const site=a.cellSite(0,0);site.x=-123;assert.notEqual(b.cellSite(0,0).x,-123);
 return{readers:4,points:points.length,distinctOrderWitness:true,freshResults:true};
});

course('climate warnings and external RNG pool arguments stay reader-owned',()=>{
 const source=hydrateNativeGeographySource(fresh(3700)).source,a=createNativeGeographyReader(source),b=createNativeGeographyReader(source);let warnings=0;const warn=console.warn;
 try{console.warn=()=>{warnings++;};for(const reader of[a,b]){reader.climateEnvelope('temperature','memo-unknown');reader.climateEnvelope('temperature','memo-unknown');}}finally{console.warn=warn;}
 assert.equal(warnings,2,'unknown-band warning ledger must be per reader');
 const calls:(readonly unknown[])[]=[];let ranges=0;const rng={pick<T>(values:readonly T[]):T{assert.equal(this,rng);calls.push(values);return values[0];},range(){ranges++;return 0;}};
 for(const reader of[a,a,b])assert.equal(reader.pickTilesetForBiome('grove',rng),tile[0]);
 assert.equal(calls[0],calls[1],'same reader retains same frozen direct pool');assert.notEqual(calls[0],calls[2],'different readers never share direct caller-visible pool arrays');assert.ok(calls.slice(0,3).every(Object.isFrozen));
 for(const reader of[a,a,b])assert.equal(reader.pickTilesetForBiome('only_realm',rng,undefined,'test'),tile[0]);
 assert.equal(calls[3],calls[4]);assert.notEqual(calls[3],calls[5]);assert.ok(calls.slice(3,6).every(Object.isFrozen));
 assert.equal(ranges,0);assert.deepEqual(calls[0],[tile[0],tile[0]],'pool duplicates and order survive');
 return{warnings,externalPickCalls:calls.length,rangeCalls:ranges,perReaderPoolIdentity:true};
});


course('immutable snapshots traverse every current raw child and preserve strict structural refusals',()=>{
 const child={value:1},raw:any={one:child,two:child,list:[1,2],label:'first'},original=clone(raw),old=snapshotNativeGeographyData(raw);
 assert.deepEqual(old,original);assert.ok(Object.isFrozen(old)&&Object.isFrozen(old.one)&&Object.isFrozen(old.list));
 raw.one.value=7;raw.list.reverse();raw.label='second';const next=snapshotNativeGeographyData(raw);assert.deepEqual(next,copyNativeGeographyData(raw));assert.deepEqual(old,original);assert.equal(next.one.value,7);assert.equal(next.two.value,7);
 const independent=copyNativeGeographyData(raw);independent.one.value=99;assert.equal(next.one.value,7);assert.equal(raw.one.value,7,'ordinary copier remains independent and writable');
 delete raw.one;raw.one={value:8};const ordered=snapshotNativeGeographyData(raw);assert.deepEqual(Object.keys(ordered),Object.keys(raw));assert.deepEqual(ordered,copyNativeGeographyData(raw));
 let getters=0;
 const changes:((value:any)=>void)[]=[v=>{v.list[0]=-0;},v=>{delete v.list[0];},v=>{v[Symbol('hidden')]=1;},v=>{v.loop=v;},v=>{Object.setPrototypeOf(v.one,null);},v=>{Object.defineProperty(v.one,'hidden',{enumerable:false,value:1});},v=>{Object.defineProperty(v.one,'value',{enumerable:true,get(){getters++;return 1;}});}];
 for(const change of changes){const value=clone(raw);snapshotNativeGeographyData(value);change(value);assert.throws(()=>snapshotNativeGeographyData(value));assert.throws(()=>copyNativeGeographyData(value));}
 assert.equal(getters,0);proto(Object.prototype,'memoSnapshotInherited',{enumerable:true,value:1},()=>{assert.throws(()=>snapshotNativeGeographyData(old));assert.throws(()=>snapshotNativeGeographyData(raw));});
 const malformed=fresh(3801);malformed.schema=999;const frozen=snapshotNativeGeographyData(malformed);assert.ok(Object.isFrozen(frozen));assert.throws(()=>hydrateNativeGeographySource(frozen),'structural snapshot brand never means semantic validation');
 return{currentChildChanges:4,malformedStructuralCases:changes.length,getterCalls:getters,semanticSnapshotRefused:true};
});

course('dirty semantic rejection preserves validation-before-serialization side effects',()=>{
 const bad=fresh(3802);bad.schema=999;let calls=0;
 proto(Object.prototype,'toJSON',{enumerable:false,get(){calls++;throw Error('must not serialize rejected source');}},()=>{assert.throws(()=>hydrateNativeGeographySource(bad),/unsupported schema\/algorithm/);});
 assert.equal(calls,0,'invalid semantic source must reject before inherited serialization callbacks');return{toJsonCalls:calls};
});

course('same-seed capture observes live nested registry changes without modifying old snapshots',()=>{
 const seed=713,before=captureNativeGeographySource(seed),beforeBytes=JSON.stringify(before),key=Object.keys(TILESETS)[0],row=TILESETS[key],old=row.nameFirst[0];
 let changed:string='';try{row.nameFirst[0]=old+' memo live witness';const after=captureNativeGeographySource(seed);changed=JSON.stringify(after);assert.notEqual(changed,beforeBytes);assert.equal(after.tilesets.find(([id])=>id===key)![1].nameFirst[0],old+' memo live witness');assert.equal(JSON.stringify(before),beforeBytes);}finally{row.nameFirst[0]=old;}
 assert.equal(JSON.stringify(captureNativeGeographySource(seed)),beforeBytes);return{sameSeed:seed,nestedLiveChangeObserved:true,oldSnapshotStable:true,liveRegistryRestored:true};
});

const failed=results.filter(row=>row.status==='FAIL');console.log('GEOGRAPHY_MEMO_REVIEW',JSON.stringify({passed:results.length-failed.length,failed:failed.length,results}));
if(failed.length)process.exitCode=1;
