/** Independent same-model warm tuple-cache regression against actual capture.
 * Promotion: replace ../src/ with ../src/. No ignored fixtures required. */
import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {TILESETS,TILESETS_BY_BIOME,REALM_TILESETS_BY_BIOME,type TilesetDef} from '../src/data/tilesets';
import {BIOMES} from '../src/world/biomes';
import {dimensionDef} from '../src/world/dimensions';
import {captureNativeGeographySource} from '../src/world/captureGeography';
const world=withSeededRandom(6613,()=>makeSimWorld('warrior',6613));world.sim.bindGeographyPolicies();
const capture=()=>captureNativeGeographySource(6613),initial=capture(),initialBytes=JSON.stringify(initial);
const results:{name:string;detail:unknown}[]=[];
function course(name:string,run:()=>unknown){const detail=run();assert.equal(JSON.stringify(capture()),initialBytes,'fixture restoration after '+name);results.push({name,detail});console.log(JSON.stringify({pass:name,detail}));}
function temporarily<T>(object:object,key:PropertyKey,descriptor:PropertyDescriptor,action:()=>T):T {const previous=Object.getOwnPropertyDescriptor(object,key);Object.defineProperty(object,key,{configurable:true,...descriptor});try{return action();}finally{if(previous)Object.defineProperty(object,key,previous);else Reflect.deleteProperty(object,key);}}
function row<T>(rows:readonly (readonly [string,T])[],key:string):T{const found=rows.find(([id])=>id===key);assert(found,'expected native registry row '+key);return found[1];}
const [tileId,tile]=Object.entries(TILESETS).find(([,value])=>value.nameFirst.length>0)!;

course('warm cross-seed captures reuse only frozen registry tuples',()=>{
 assert.equal(capture(),initial,'exact unchanged source may be reused');const other=captureNativeGeographySource(6614);assert.notEqual(other,initial);assert.equal(other.seed,6614);
 for(const key of ['biomes','dimensions','tilesets'] as const){assert.equal(other[key],initial[key]);assert(Object.isFrozen(other[key]));for(const pair of other[key]){assert(Object.isFrozen(pair));assert(Object.isFrozen(pair[1]));}}
 assert.equal(other.pools.shared,initial.pools.shared);for(const [realm,pools]of other.pools.realms){assert.equal(pools,row(initial.pools.realms,realm));assert(Object.isFrozen(pools));}
 return {tilesets:initial.tilesets.length,biomes:initial.biomes.length,dimensions:initial.dimensions.length,realms:initial.pools.realms.length};
});
course('nested tileset mutation invalidates warm tuples without changing old source',()=>{
 const old=tile.nameFirst[0],oldRows=initial.tilesets;
 try{tile.nameFirst[0]=old+' loading capture witness';const changed=capture();assert.notEqual(changed,initial);assert.notEqual(changed.tilesets,oldRows);assert.equal(row(changed.tilesets,tileId).nameFirst[0],tile.nameFirst[0]);assert.equal(row(initial.tilesets,tileId).nameFirst[0],old);assert(Object.isFrozen(row(changed.tilesets,tileId).nameFirst));return {tile:tileId};}finally{tile.nameFirst[0]=old;}
});
course('warm registry insertion deletion and reinsertion retain native key order',()=>{
 const a='loading_tuple_probe_a',b='loading_tuple_probe_b';assert(!Object.hasOwn(TILESETS,a)&&!Object.hasOwn(TILESETS,b));const keys=Object.keys(TILESETS),clone=(id:string):TilesetDef=>({...structuredClone(tile),id});
 try{TILESETS[a]=clone(a);TILESETS[b]=clone(b);let changed=capture();assert.deepEqual(changed.tilesets.map(([key])=>key),[...keys,a,b]);assert.equal(row(changed.tilesets,a).id,a);Reflect.deleteProperty(TILESETS,a);changed=capture();assert.deepEqual(changed.tilesets.map(([key])=>key),[...keys,b]);TILESETS[a]=clone(a);changed=capture();assert.deepEqual(changed.tilesets.map(([key])=>key),[...keys,b,a]);return{inserted:[a,b],reinserted:[b,a]};}finally{Reflect.deleteProperty(TILESETS,a);Reflect.deleteProperty(TILESETS,b);}
});
course('warm raw registry proxy still traverses own keys and descriptors every capture',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(TILESETS,tileId)!;let keys=0,descriptors=0,gets=0;const proxy=new Proxy(tile,{ownKeys(target){keys++;return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){descriptors++;return Reflect.getOwnPropertyDescriptor(target,key);},get(){gets++;throw Error('Raw registry data getter invoked');}});
 return temporarily(TILESETS,tileId,{...descriptor,value:proxy},()=>{assert.equal(JSON.stringify(capture()),initialBytes);const first={keys,descriptors};assert(keys>0&&descriptors>0);assert.equal(JSON.stringify(capture()),initialBytes);assert(keys>first.keys&&descriptors>first.descriptors,'cache must not replace current live traversal');assert.equal(gets,0);return{captures:2,keys,descriptors,rawPropertyReads:gets};});
});
course('warm own accessors on registry definition and nested array are rejected unread',()=>{
 let reads=0;const locations:[object,PropertyKey][]=[[TILESETS,tileId],[tile,'nameFirst'],[tile.nameFirst,'0']];
 for(const [object,key]of locations)temporarily(object,key,{enumerable:true,get(){reads++;throw Error('Unexpected accessor invocation');}},()=>{assert.throws(capture,/own enumerable data/);});assert.equal(reads,0);return{locations:locations.length,reads};
});
course('warm symbol and hidden own registry fields remain invalid',()=>{
 temporarily(TILESETS,Symbol('loading tuple symbol'),{value:tile,enumerable:true},()=>assert.throws(capture,/symbol field/));temporarily(TILESETS,'loading_hidden_tuple',{value:tile,enumerable:false},()=>assert.throws(capture,/own enumerable data/));return{negatives:2};
});
course('warm inherited enumerable object and array pollution is rejected unread',()=>{
 let reads=0;for(const target of [Object.prototype,Array.prototype])temporarily(target,'loadingTupleInherited',{enumerable:true,get(){reads++;throw Error('Inherited getter should not run');}},()=>assert.throws(capture,/inherited enumerable/));assert.equal(reads,0);return{prototypes:2,reads};
});
course('warm inherited toJSON cannot be hidden by row reuse',()=>{
 let reads=0;for(const target of [Object.prototype,Array.prototype])temporarily(target,'toJSON',{enumerable:false,get(){reads++;throw Error('loading tuple toJSON witness');}},()=>assert.throws(capture,/loading tuple toJSON witness/));assert(reads>=2);return{reads};
});
course('shared pool mutations remain ordered duplicate-preserving source data',()=>{
 const [biome,pool]=Object.entries(TILESETS_BY_BIOME).find(([,pool])=>pool.length>0)!;const previous=[...pool];try{pool.push(pool[0]);const changed=capture();assert.notEqual(changed.pools.shared,initial.pools.shared);assert.deepEqual(row(changed.pools.shared,biome),[...previous,previous[0]]);assert.deepEqual(row(initial.pools.shared,biome),previous);return{biome,length:pool.length};}finally{pool.splice(0,pool.length,...previous);}
});
course('nested realm pool mutation invalidates its warm private rows',()=>{
 const [realm,pools]=Object.entries(REALM_TILESETS_BY_BIOME).find(([,pools])=>Object.values(pools).some(pool=>pool.length>0))!;const [biome,pool]=Object.entries(pools).find(([,pool])=>pool.length>0)!;const previous=[...pool];try{pool.push(pool[0]);const changed=capture(),changedPools=row(changed.pools.realms,realm),oldPools=row(initial.pools.realms,realm);assert.notEqual(changedPools,oldPools);assert.deepEqual(row(changedPools,biome),[...previous,previous[0]]);assert.deepEqual(row(oldPools,biome),previous);return{realm,biome};}finally{pool.splice(0,pool.length,...previous);}
});
course('biome row cache observes live label mutation',()=>{
 const [id,biome]=Object.entries(BIOMES)[0],old=biome.label;try{biome.label=old+' loading tuple witness';const changed=capture();assert.notEqual(changed.biomes,initial.biomes);assert.equal(row(changed.biomes,id).label,biome.label);assert.equal(row(initial.biomes,id).label,old);return{id};}finally{biome.label=old;}
});
course('private dimension registry row cache observes actual definition mutation',()=>{
 const dimension=dimensionDef('surface'),old=dimension.label;try{dimension.label=old+' loading tuple witness';const changed=capture();assert.notEqual(changed.dimensions,initial.dimensions);assert.equal(row(changed.dimensions,'surface').label,dimension.label);assert.equal(row(initial.dimensions,'surface').label,old);return{id:'surface'};}finally{dimension.label=old;}
});
assert.equal(JSON.stringify(initial),initialBytes,'all retained initial data stays immutable');
console.log(JSON.stringify({scope:'Independent same-model warm tuple capture checks; actual registered source; no timing or reader-authority claim',cases:results.length,results}));