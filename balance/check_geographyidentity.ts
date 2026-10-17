/** Independent exact-source serialization and capture provenance regressions.
 * Standalone promotion requires only the quoted source import path relocation. */
import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {TILESETS} from '../src/data/tilesets';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {hydrateNativeGeographySource,restoreNativeGeographySource,serializeNativeGeographySource,createNativeGeographyReader, type NativeGeographySource} from '../src/world/geographySource';
const nativeStringify=JSON.stringify;
const world=withSeededRandom(7707,()=>makeSimWorld('warrior',7707));world.sim.bindGeographyPolicies();
const source=captureNativeGeographySource(7707),bytes=nativeStringify(source);
const results:{name:string;detail:unknown}[]=[];
function course(name:string,run:()=>unknown){const detail=run();results.push({name,detail});console.log(nativeStringify({pass:name,detail}));}
function replaceStringify<T>(value:typeof JSON.stringify,run:()=>T):T{const before=Object.getOwnPropertyDescriptor(JSON,'stringify')!;Object.defineProperty(JSON,'stringify',{...before,value});try{return run();}finally{Object.defineProperty(JSON,'stringify',before);}}
function proto<T>(key:PropertyKey,descriptor:PropertyDescriptor,run:()=>T):T{const before=Object.getOwnPropertyDescriptor(Object.prototype,key);Object.defineProperty(Object.prototype,key,{configurable:true,...descriptor});try{return run();}finally{if(before)Object.defineProperty(Object.prototype,key,before);else Reflect.deleteProperty(Object.prototype,key);}}
const clone=(seed:number)=>Object.assign(JSON.parse(bytes),{seed}) as NativeGeographySource;
course('owned warm source exact bytes and caller clones retain original serialization behavior',()=>{
 assert.equal(serializeNativeGeographySource(source),bytes);assert.equal(serializeNativeGeographySource(captureNativeGeographySource(7707)),bytes);
 const frozen=Object.freeze(JSON.parse(bytes));assert.equal(serializeNativeGeographySource(frozen),bytes);
 let calls=0;const arbitrary=Object.freeze({...JSON.parse(bytes),toJSON(){calls++;return 'caller own serialization';}});
 assert.equal(serializeNativeGeographySource(arbitrary),nativeStringify(arbitrary));assert.equal(calls,2);
 let proxyReads=0;const proxy=new Proxy(source,{get(target,key,receiver){if(key==='toJSON'){proxyReads++;return ()=> 'proxy serialization';}return Reflect.get(target,key,receiver);}});
 assert.equal(serializeNativeGeographySource(proxy),'"proxy serialization"');assert.equal(proxyReads,1);return{characters:bytes.length,callerOwnToJsonCalls:calls,proxyReads};
});
course('changed serializer is called with JSON receiver for warm and unowned sources',()=>{
 let calls=0;replaceStringify(function(this:unknown,value:unknown){assert.equal(this,JSON);calls++;return value===source?'warm replacement':'cold replacement';} as typeof JSON.stringify,()=>{
  assert.equal(serializeNativeGeographySource(source),'warm replacement');assert.equal(serializeNativeGeographySource(Object.freeze(JSON.parse(bytes))),'cold replacement');
 });assert.equal(serializeNativeGeographySource(source),bytes);return{calls};
});
course('hydration under replacement cannot poison later native serialization even through a hydration hit',()=>{
 const changed=clone(7711);let owned!:Readonly<NativeGeographySource>,identity='';
 replaceStringify(function(this:unknown){assert.equal(this,JSON);return 'replacement identity 7711';} as typeof JSON.stringify,()=>{const result=hydrateNativeGeographySource(changed);owned=result.source;identity=result.identity;});
 assert.equal(identity,'replacement identity 7711');const expected=nativeStringify(owned);assert.notEqual(expected,identity);
 assert.equal(serializeNativeGeographySource(owned),expected);assert.equal(hydrateNativeGeographySource(owned).identity,identity,'fixture keeps prior hydration identity, so serializer must have its own provenance');assert.equal(serializeNativeGeographySource(owned),expected);return{replacementIdentity:identity,nativeCharacters:expected.length};
});
course('serializer changed by a raw child trap during hydration cannot admit cached replacement bytes',()=>{
 let owned!:Readonly<NativeGeographySource>;const changed=clone(7712),before=Object.getOwnPropertyDescriptor(JSON,'stringify')!,replacement=function(this:unknown){assert.equal(this,JSON);return 'trap replacement identity 7712';} as typeof JSON.stringify;
 const proxy=new Proxy(changed,{ownKeys(target){Object.defineProperty(JSON,'stringify',{...before,value:replacement});return Reflect.ownKeys(target);}});
 try{owned=hydrateNativeGeographySource(proxy).source;}finally{Object.defineProperty(JSON,'stringify',before);}
 assert.equal(serializeNativeGeographySource(owned),nativeStringify(owned));assert.notEqual(serializeNativeGeographySource(owned),'trap replacement identity 7712');return{nativeCharacters:nativeStringify(owned).length};
});
course('dirty prototype toJSON fallback preserves getters exceptions receiver and restoration',()=>{
 let gets=0,calls=0;
 proto('toJSON',{enumerable:false,get(){gets++;return function(this:unknown){calls++;assert.equal(this,source);return 'inherited serialization';};}},()=>{assert.equal(serializeNativeGeographySource(source),'"inherited serialization"');});
 assert.equal(gets,1);assert.equal(calls,1);
 proto('toJSON',{enumerable:false,get(){throw Error('inherited exact refusal');}},()=>assert.throws(()=>serializeNativeGeographySource(source),/inherited exact refusal/));
 assert.equal(serializeNativeGeographySource(source),bytes);return{gets,calls};
});
course('warm capture still sees same-seed changes and failed capture never displaces accepted data',()=>{
 const id=Object.keys(TILESETS)[0],tile=TILESETS[id],name=tile.nameFirst[0],captured=captureNativeGeographySource(7707);
 try{tile.nameFirst[0]=name+' exact serialized witness';const changed=captureNativeGeographySource(7707);assert.notEqual(changed,captured);assert.notEqual(serializeNativeGeographySource(changed),bytes);assert.equal(nativeStringify(captured),bytes);Object.defineProperty(tile,'__serializationBad',{value:1,enumerable:false,configurable:true});assert.throws(()=>captureNativeGeographySource(7707));}
 finally{tile.nameFirst[0]=name;Reflect.deleteProperty(tile,'__serializationBad');}
 assert.equal(serializeNativeGeographySource(captureNativeGeographySource(7707)),bytes);return{sameSeed:7707,priorFrozen:true,recovered:true};
});
course('execution dictionary reuse exposes neither mutable definitions nor cross-reader pools',()=>{
 const a=createNativeGeographyReader(source),b=createNativeGeographyReader(source),dimension=a.dimensionDef();assert.equal(dimension,source.dimensions.find(([id])=>id==='surface')![1]);assert(Object.isFrozen(dimension));
 const old=dimension.label;assert.equal(Reflect.set(dimension,'label','mutated'),false);assert.equal(b.dimensionDef().label,old);
 const rows=source.pools.shared.find(([,pool])=>pool.length>0)!;const calls:(readonly unknown[])[]=[];const rng={pick<T>(values:readonly T[]):T{calls.push(values);assert(Object.isFrozen(values));return values[0];},range(){return 0;}};
 a.pickTilesetForBiome(rows[0],rng);a.pickTilesetForBiome(rows[0],rng);b.pickTilesetForBiome(rows[0],rng);assert.equal(calls[0],calls[1]);assert.notEqual(calls[0],calls[2]);return{directPoolCalls:calls.length,ordinaryDimensionPrototype:Object.getPrototypeOf(dimension)===Object.prototype};
});
course('cold restored parsed source pairs with separately checked live snapshots and survives changed failed capture',()=>{
 const seed=7719,coldBytes=nativeStringify(clone(seed)),restored=restoreNativeGeographySource(coldBytes);
 const first=captureNativeGeographySource(seed);assert.equal(first,restored,'cold parsed restoration supplies the hydrated source');
 assert.equal(captureNativeGeographySource(seed),restored);assert.equal(serializeNativeGeographySource(first),coldBytes);
 const id=Object.keys(TILESETS)[0],tile=TILESETS[id],name=tile.nameFirst[0];
 try{tile.nameFirst[0]=name+' cold pair mutation';const changed=captureNativeGeographySource(seed);assert.notEqual(changed,restored);assert.notEqual(serializeNativeGeographySource(changed),coldBytes);Object.defineProperty(tile,'__coldPairBad',{value:1,enumerable:false,configurable:true});assert.throws(()=>captureNativeGeographySource(seed));assert.equal(nativeStringify(restored),coldBytes);}
 finally{tile.nameFirst[0]=name;Reflect.deleteProperty(tile,'__coldPairBad');}
 const recovered=captureNativeGeographySource(seed);assert.equal(serializeNativeGeographySource(recovered),coldBytes);assert.equal(nativeStringify(restored),coldBytes);assert.equal(serializeNativeGeographySource(captureNativeGeographySource(seed)),coldBytes);
 return{seed,coldCharacters:coldBytes.length,parsedSourceRetained:true,failedMutationRecovered:true};
});
course('empty array iterator cannot hide dirty prototypes from warm serialized identity guard',()=>{
 let calls=0,actual='';const descriptor=Object.getOwnPropertyDescriptor(Array.prototype,Symbol.iterator)!;
 proto('toJSON',{enumerable:false,value:function(this:unknown){assert.equal(this,source);calls++;return 'dirty iterator native serialization';}},()=>{
  try{Object.defineProperty(Array.prototype,Symbol.iterator,{...descriptor,value:function*(){}});actual=serializeNativeGeographySource(source);}
  finally{Object.defineProperty(Array.prototype,Symbol.iterator,descriptor);}
 });assert.equal(actual,'"dirty iterator native serialization"');assert.equal(calls,1);assert.equal(serializeNativeGeographySource(source),bytes);return{inheritedCalls:calls};
});
console.log(nativeStringify({scope:'Independent same-model exact source serialization/capture provenance checks; no performance claim',cases:results.length,results}));
