/** Independent primitive quote-cache check. --isolated skips real world/catalog
 * setup while profiling runs. Promotion changes only ../../../src/ to ../src/. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import {canonical,massDigest} from '../src/worldmass/random';
import {nativeSourceDigest} from '../src/worldmass/nativeSourceDigest';
const base='fcbfefd748b055679a1ec5e54be72d7e96168c83';
const randomFile=new URL('../src/worldmass/random.ts',import.meta.url),root=path.resolve(path.dirname(fileURLToPath(randomFile)),'../..');
const originalSource=execFileSync('git',['show',base+':src/worldmass/random.ts'],{cwd:root,encoding:'utf8'});
const compile=(source:string)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
// Host intrinsics let the unchanged predecessor inspect the same actual plain
// data objects, without treating our test's realm as a foreign object prototype.
const originalContext=vm.createContext({exports:{},require:()=>({}),Object,Array,Set,Map,WeakSet,WeakMap,JSON,Number,Math});
vm.runInContext(compile(originalSource),originalContext);
const original=originalContext.exports as {canonical:(value:unknown)=>string;massDigest:(value:unknown)=>string};
const quotedSource=fs.readFileSync(new URL('../src/worldmass/canonicalString.ts',import.meta.url),'utf8');
const results:{name:string;detail:unknown}[]=[];
function course(name:string,run:()=>unknown){const detail=run();results.push({name,detail});console.log(JSON.stringify({pass:name,detail}));}
function equality(value:unknown){assert.equal(canonical(value),original.canonical(value));assert.equal(massDigest(value),original.massDigest(value));}
const long='native source '.repeat(6000);
course('exact predecessor canonical and digest preserve escapes unicode and lone surrogates',()=>{
 const tails=['','"\\\b\f\n\r\t\u0000\u001f','é 漢字 😀','\ud800','\udfff','\ud800x\udfff','\ud83d\ude00','\u2028\u2029','/ <script> </script>'];
 for(const tail of tails)for(const value of [tail,long+tail]){equality(value);equality(value);equality({z:[value,value],a:{nested:value}});assert.equal(JSON.parse(canonical(value)),value);}
 for(const length of [0,1,4095,4096,4097])equality('x'.repeat(length));return{tails:tails.length,thresholds:5};
});
course('nonstring finite data and invalid input behavior match exact predecessor',()=>{
 for(const value of [null,false,true,0,-0,1,-2.5,[],{},Object.assign(Object.create(null),{z:long,a:1}),{z:long,a:[null,true,3,long]}])equality(value);
 const cycle:{self?:unknown}={};cycle.self=cycle;
 for(const value of [undefined,NaN,Infinity,-Infinity,1n,Symbol('bad'),()=>1,new Date(),cycle,[long,undefined],{a:long,z:NaN}]){assert.throws(()=>canonical(value));assert.throws(()=>original.canonical(value));}
 let reads=0,current:unknown=long;const live={get payload(){reads++;return current;}};equality(live);const before=reads;current=long+'changed';equality(live);assert(reads>before);current=NaN;assert.throws(()=>canonical(live));return{invalidCases:11,liveGetterReads:reads};
});
course('primitive quoting never invokes inherited toJSON',()=>{
 let reads=0;for(const prototype of [String.prototype,Object.prototype]){const prior=Object.getOwnPropertyDescriptor(prototype,'toJSON');Object.defineProperty(prototype,'toJSON',{configurable:true,get(){reads++;throw Error('String toJSON must not execute');}});try{equality(long+'inherited '+reads);equality(long+'inherited '+reads);}finally{if(prior)Object.defineProperty(prototype,'toJSON',prior);else Reflect.deleteProperty(prototype,'toJSON');}}
 assert.equal(reads,0);return{reads};
});
function fixture(){let calls=0,switchAfter=false;const intrinsic=JSON.stringify;const json:{stringify:typeof JSON.stringify}={stringify:undefined as unknown as typeof JSON.stringify};
 const first=function(value:unknown):string{calls++;const result=intrinsic(value);if(switchAfter){switchAfter=false;json.stringify=(()=> 'replacement during quote') as typeof JSON.stringify;}return result;};json.stringify=first as typeof JSON.stringify;
 const context=vm.createContext({exports:{},JSON:json});vm.runInContext(compile(quotedSource),context);
 return{quote:(context.exports as {quoteCanonicalString:(value:string)=>string}).quoteCanonicalString,get calls(){return calls;},json,first:first as typeof JSON.stringify,switchAfter:()=>{switchAfter=true;}};
}
course('four entry LRU evicts full exact strings and keeps refreshed entry',()=>{
 const f=fixture(),values=Array.from({length:6},(_,i)=>long+i);for(const value of values.slice(0,4))assert.equal(f.quote(value),JSON.stringify(value));assert.equal(f.calls,4);f.quote(values[0]);assert.equal(f.calls,4);f.quote(values[4]);assert.equal(f.calls,5);f.quote(values[0]);assert.equal(f.calls,5);f.quote(values[1]);assert.equal(f.calls,6);return{nativeQuotes:f.calls};
});
course('combined key and quoted payload budget and oversized bypass',()=>{
 const f=fixture(),a='a'.repeat(600000),b='b'.repeat(600000);assert((a.length+JSON.stringify(a).length)*2<4*1024*1024);f.quote(a);f.quote(b);assert.equal(f.calls,2);f.quote(a);assert.equal(f.calls,3,'two combined payloads exceed4MiB');
 const huge='h'.repeat(1024*1024);assert((huge.length+JSON.stringify(huge).length)*2>4*1024*1024);f.quote(huge);f.quote(huge);assert.equal(f.calls,5,'oversized ordinary string bypasses strong map');
 const escaped='\u0000'.repeat(400000);assert((escaped.length+JSON.stringify(escaped).length)*2>4*1024*1024);f.quote(escaped);f.quote(escaped);assert.equal(f.calls,7,'expanded escaping output is included in byte budget');f.quote(a);assert.equal(f.calls,7,'oversized bypass does not evict valid resident');return{nativeQuotes:f.calls};
});
course('replacement serializer preserves receiver and cannot poison warm or missed entries',()=>{
 const f=fixture(),warm=long+'warm',miss=long+'miss';f.quote(warm);assert.equal(f.calls,1);let replacementCalls=0;
 f.json.stringify=function(this:unknown,value:unknown){assert.equal(this,f.json,'replacement receives JSON as original member call');replacementCalls++;return 'replacement:'+String(value);} as typeof JSON.stringify;
 assert.equal(f.quote(warm),'replacement:'+warm);assert.equal(f.quote(miss),'replacement:'+miss);assert.equal(replacementCalls,2);assert.equal(f.calls,1);
 f.json.stringify=f.first;assert.equal(f.quote(warm),JSON.stringify(warm));assert.equal(f.calls,1);assert.equal(f.quote(miss),JSON.stringify(miss));assert.equal(f.calls,2,'replacement miss was not admitted');return{replacementCalls,nativeQuotes:f.calls};
});
course('serializer changing during miss cannot admit output',()=>{
 const f=fixture(),value=long+'switch';f.switchAfter();assert.equal(f.quote(value),JSON.stringify(value));assert.equal(f.calls,1);f.json.stringify=f.first;assert.equal(f.quote(value),JSON.stringify(value));assert.equal(f.calls,2,'clean admission is rechecked after serializer returns');f.quote(value);assert.equal(f.calls,2);return{nativeQuotes:f.calls};
});
course('canonical only routes long primitive values to bounded quote helper',()=>{
 let helperCalls=0;const context=vm.createContext({exports:{},Object,Array,Set,Map,WeakSet,WeakMap,JSON,Number,Math,require:(id:string)=>id==='./canonicalString'?{quoteCanonicalString:(value:string)=>{helperCalls++;return JSON.stringify(value);}}:{}});
 vm.runInContext(compile(fs.readFileSync(randomFile,'utf8')),context);const candidate=(context.exports as {canonical:(value:unknown)=>string}).canonical;
 for(const value of ['', 'short', 'x'.repeat(4095)]){assert.equal(candidate(value),original.canonical(value));assert.equal(candidate(value),original.canonical(value));}assert.equal(helperCalls,0);candidate('x'.repeat(4096));assert.equal(helperCalls,1);candidate({a:long,b:true,c:null,d:42});assert.equal(helperCalls,2);return{helperCalls};
});
course('actual source checksum follows replacement serializer on warm and missed keys and restores native output',()=>{
 const warm=long+'source digest warm',miss=long+'source digest miss',native=JSON.stringify,initial=nativeSourceDigest(warm);let calls=0;
 try{JSON.stringify=function(this:unknown,value:unknown){assert.equal(this,JSON);calls++;return native('replaced digest '+String(value));} as typeof JSON.stringify;
  assert.equal(nativeSourceDigest(warm),massDigest(warm));assert.notEqual(nativeSourceDigest(warm),initial);assert.equal(nativeSourceDigest(miss),massDigest(miss));
 }finally{JSON.stringify=native;}
 assert.equal(nativeSourceDigest(warm),massDigest(warm));assert.equal(nativeSourceDigest(warm),initial);assert.equal(nativeSourceDigest(miss),massDigest(miss));return{replacementCalls:calls};
});
course('source checksum admission refuses serializer switched during computation',()=>{
 const source=fs.readFileSync(new URL('../src/worldmass/nativeSourceDigest.ts',import.meta.url),'utf8');let calls=0,switchAfter=true;
 const native=JSON.stringify,json:{stringify:typeof JSON.stringify}={stringify:native},replacement=(()=> 'replacement') as typeof JSON.stringify;
 const context=vm.createContext({exports:{},JSON:json,require:()=>({massDigest:(value:string)=>{calls++;const result=json.stringify(value);if(switchAfter){switchAfter=false;json.stringify=replacement;}return result;}})});
 vm.runInContext(compile(source),context);const digest=(context.exports as {nativeSourceDigest:(value:string)=>string}).nativeSourceDigest,value=long+'digest admission';
 assert.equal(digest(value),native(value));assert.equal(calls,1);json.stringify=native;assert.equal(digest(value),native(value));assert.equal(calls,2,'interrupted provenance was not admitted');digest(value);assert.equal(calls,2);return{computations:calls};
});
if(!process.argv.includes('--isolated')){
 const {makeSimWorld}=await import('../src/sim/arena');const {withSeededRandom}=await import('../src/core/rng');const {captureNativeGeographySource}=await import('../src/world/captureGeography');const {createNativeGeographyReader}=await import('../src/world/geographySource');const {makeNativeGeographyCatalogSpec,NativeGeographyCatalog}=await import('../src/worldmass/nativeGeographyCatalog');
 const world=withSeededRandom(7703,()=>makeSimWorld('warrior',7703));world.sim.bindGeographyPolicies();const source=captureNativeGeographySource(7703),sourceJson=createNativeGeographyReader(source).identity,spec=makeNativeGeographyCatalogSpec(sourceJson),catalog=new NativeGeographyCatalog(spec);
 course('actual complete native geography specs and catalog keep exact predecessor identity',()=>{
  for(const entry of spec.entries){equality(entry.geography);assert.equal(catalog.select(entry.dimension).identity,original.canonical(entry.geography));assert.equal(JSON.parse(canonical(entry.geography)).sourceJson,sourceJson);}
  equality(spec);assert.equal(catalog.identity,original.canonical(spec));catalog.assertCompatible(structuredClone(spec));equality({catalog:spec,records:[spec.entries[0].geography,spec.entries[0].geography],sourceJson});
  return{sourceCharacters:sourceJson.length,dimensions:spec.entries.length,identityCharacters:catalog.identity.length};
 });
}
console.log(JSON.stringify({scope:'Independent same-model canonical quote-cache check; exact fcb predecessor oracle; no performance claim',mode:process.argv.includes('--isolated')?'isolated':'full',cases:results.length,results}));