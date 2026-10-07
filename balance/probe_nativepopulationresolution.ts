import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { World } from '../src/engine/world';
import { Rng, withSeededRandom } from '../src/core/rng';
import { clamp } from '../src/core/math';
import { MONSTERS, FACTIONS, WILDLIFE, CAVE_POOL_CFG, CAVE_POOLS } from '../src/data/monsters';
import { TILESETS, CAVE_FACE_IDS } from '../src/data/tilesets';
import { ZONES, START_ZONE, type ZoneDef } from '../src/data/zones';
import { presenceMul } from '../src/engine/presence';
import { factionAllowed } from '../src/world/zonePolicy';
import { clearSeaMemo } from '../src/world/seas';
import { resetActorIdCounter, type Actor } from '../src/engine/actor';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { serializeNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { createNativeGeographyReader } from '../src/world/geographySource';
import { placeZoneAt } from '../src/engine/worldgen';
import { NativeAreaPopulation } from '../src/worldmass/nativeAreaPopulation';
import * as core from '../src/engine/nativePopulationResolution';
// Immutable original methods from 8dcfa9e1. No Git or ignored-file dependency
// at test time. Complete source hash remains separately pinned in the archive.
const archive=gunzipSync(Buffer.from('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','base64')).toString('utf8');
const archiveHash='b066edc1fd10d061a2ff3e2478dc53d69229bc839c61b7052aa13b7604f84d0f';
assert.equal(createHash('sha256').update(archive).digest('hex'),archiveHash);
const original=JSON.parse(archive) as {commit:string;worldHash:string;methods:Record<string,string>};
assert.equal(original.worldHash,'67d4fa4c23011c6ce4d684f3b218c17712f6fd3aaa8227c7c98b6b09f8b1bdfc');
const compiled=ts.transpileModule('export class World {static get CAVE_POOL_SALT(){return deps.CAVE_POOL_SALT;}\n'+Object.values(original.methods).join('\n')+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const leaf=ts.createSourceFile('nativePopulationResolution.ts',readFileSync(new URL('../src/engine/nativePopulationResolution.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
assert.deepEqual(leaf.statements.filter(ts.isImportDeclaration).filter(s=>!s.importClause?.isTypeOnly).map(s=>(s.moduleSpecifier as ts.StringLiteral).text),['../core/math']);
const realSources:core.NativePopulationSources={FACTIONS,MONSTERS,WILDLIFE,TILESETS,CAVE_FACE_IDS,CAVE_POOL_CFG,CAVE_POOLS,CAVE_POOL_SALT:0xca9e51,Rng,factionAllowed,presenceMul};
function oldClass(sources:core.NativePopulationSources){const deps:any={clamp};for(const k of Object.keys(realSources))Object.defineProperty(deps,k,{get:()=> (sources as any)[k]});const out:any={};new Function('deps','exports','with(deps){'+compiled+'}')(deps,out);return out.World;}
const Old=oldClass(realSources);
bootSimEngine();
let corePairs=0,wrapperPairs=0,readEntries=0,privateDraws=0;
const names=['simView','baseTable','effectiveSpawn','wildlifeTableFor','caveAirFor'] as const;
type Method=typeof names[number];
function execute(mode:'archive'|'core'|'wrapper',method:Method,i:number,actual=false) {
 const tape:string[]=[],draws:number[]=[];let recording=true;
 const cache=new WeakMap<object,object>();
 const trace=(value:any,path:string):any=>{
  if(!value||typeof value!=='object'||value instanceof Set||value instanceof Map)return value;
  let p=cache.get(value);if(p)return p;
  p=new Proxy(value,{get(t,k,r){if(recording&&typeof k==='string')tape.push(path+'.'+k);return trace(Reflect.get(t,k,r),path+'.'+String(k));}});cache.set(value,p!);return p;
 };
 const cb=(name:string,fn:(...args:any[])=>any)=>(...args:any[])=>{if(recording)tape.push('call:'+name);return fn(...args);};
 const fids=Object.keys(FACTIONS).slice(0,3),mids=Object.keys(MONSTERS).slice(0,3),caveIds=CAVE_FACE_IDS.slice(0,3);
 const packs={count:[1,1],size:[1,1],table:[{id:mids[0],weight:2},{id:mids[1],weight:3}]};
 const synthetic:any={...realSources,FACTIONS:Object.fromEntries(fids.map((id,k)=>[id,{table:[{id:mids[k],weight:11+k}]}])),MONSTERS:Object.fromEntries(mids.map((id,k)=>[id,{faction:fids[k]}])),
  WILDLIFE:{plains:[{id:mids[0],chance:1,count:[1,2]}],grove:[{id:mids[1],chance:.3,count:[2,4]}]},
  TILESETS:{[caveIds[0]]:{packs,caveFace:{biomes:i%3===0?{'*':10,grove:{w:8}}:{plains:.1}}}},CAVE_FACE_IDS:caveIds,
  CAVE_POOL_CFG:{themedBar:4,anchorEcho:2},CAVE_POOLS:[{faces:[caveIds[0]],weight:2,strata:{min:1},table:[{id:mids[2],chance:1,count:[1,1]}],anchors:{plains:2,'*':.5}}],
  factionAllowed:cb('factionAllowed',(f:string)=>i%3===0?false:i%3===1?f!==fids[0]:true),presenceMul:cb('presenceMul',()=>i%7===0?0:1)};
 const values=actual?realSources:synthetic;
 const sources:any=new Proxy(values,{get(t,k,r){if(recording)tape.push('source:'+String(k));return trace(Reflect.get(t,k,r),'source.'+String(k));}});
 // Keep constructor identity native; record only its explicit stream draws.
 const oldRange=Rng.prototype.range;
 Rng.prototype.range=function(a:number,b:number){const v=oldRange.call(this,a,b);draws.push(v);return v;};
 const z:any={...ZONES[START_ZONE],id:'population-'+i,cohort:i%7===0?'authored':undefined,packs:actual?TILESETS[caveIds[i%caveIds.length]]?.packs:packs,
  caveDepth:i%11===0?undefined:1+i%8,seed:7000+i,dimension:i%5===0?'hell':undefined,
  anchor:i%4===0?'missing':i%4===1?undefined:'plains',biome:i%6===0?'grove':i%6===1?'missing':undefined};
 if(i%9===0)z.fauna=[];if(i%9===1)z.faunaProvenance=[];if(i%13===0)z.seed=undefined;if(i%17===0)z.packs=undefined;
 const sim:any={
  crusadeField:i%4===0?undefined:{crusadeOn:cb('crusadeOn',()=>({suppressNatives:i%3===0,faction:i%8===0?'missing':fids[0]}))},
  faction:{conquerorOf:cb('conquerorOf',()=>i%4===1?fids[1]:i%4===2?'missing':undefined)},
  hellWarField:i%6===0?undefined:{dimension:'hell',zoneWar:cb('zoneWar',()=>({heartland:i%3!==1,lord:{faction:fids[2]}}))},
  gatesFor:cb('gatesFor',(level:number)=>new Map([['gate',{active:true,share:level/100,pressure:1}]])),
  resolve:cb('resolve',(_zone:any,base:any,view:any)=>{view.terrain({x:2,y:3});return {table:base,countMul:[.1,.5,1,3][i%4],injectFactions:[fids[0],fids[0],fids[1]]};}),
  verminfallField:i%3===0?undefined:{townPressure:cb('townPressure',()=>1.25)},
 };
 let host:any;
 const raw:any={actors:[{team:'enemy',dead:false,faction:fids[0]},{team:'enemy',dead:false,faction:fids[0]},{team:'enemy',dead:true,faction:fids[1]},{team:'ally',dead:false,faction:fids[2]},{team:'enemy',dead:false,faction:''}],
  player:i%5===0?undefined:{level:30+i},zone:z,zoneMap:{a:z,b:{...z,id:'surface',dimension:'surface'},c:{...z,id:'hell',dimension:'hell'}},time:600+i,sim,
  visited:new Set(['a']),surveyed:new Set(['b']),continentFor:cb('continentFor',()=>({kind:'land'}))};
 host=Object.create(mode==='wrapper'?World.prototype:Object.prototype);
 for(const [key,value]of Object.entries(raw))Object.defineProperty(host,key,{configurable:true,get(){if(recording)tape.push('host:'+key);return trace(value,key);}});
 const archived=oldClass(sources);
 if(mode!=='wrapper')Object.defineProperty(host,'simView',{value:()=>mode==='archive'?archived.prototype.simView.call(host):core.nativeSimView(host)});
 const real=(World as any).nativePopulationSources;
 if(mode==='wrapper')(World as any).nativePopulationSources=()=>sources;
 recording=false;const zone=trace(z,'zone'),base=trace(packs.table,'base');tape.length=0;recording=true;
 const random=Math.random;Math.random=()=>{throw Error('Population resolution consumed ambient RNG');};
 let result:any;
 try {
  if(mode==='archive')result=method==='wildlifeTableFor'||method==='caveAirFor'?archived[method](zone):archived.prototype[method].call(host,zone,base);
  else if(mode==='wrapper')result=method==='wildlifeTableFor'||method==='caveAirFor'?(World as any)[method](zone):host[method](zone,base);
  else result=method==='simView'?core.nativeSimView(host):method==='baseTable'?core.nativeBaseTable(host,sources,zone):method==='effectiveSpawn'?core.nativeEffectiveSpawn(host,sources,zone,base):method==='caveAirFor'?core.nativeCaveAirFor(sources,zone):core.nativeWildlifeTableFor(sources,zone,d=>core.nativeCaveAirFor(sources,d));
  if(method==='simView')result.terrain({x:1,y:2});
 }finally{recording=false;Math.random=random;Rng.prototype.range=oldRange;(World as any).nativePopulationSources=real;}
 if(method==='simView')result={...result,terrain:undefined,gates:[...result.gates],visited:[...result.visited],surveyed:[...result.surveyed]};
 const data=serializeNativeAreaData(result);
 return {data,tape,draws};
}
for(let i=0;i<126;i++)for(const method of names){const a=execute('archive',method,i),b=execute('core',method,i);assert.deepEqual(b,a,method+' core '+i);corePairs++;readEntries+=a.tape.length;privateDraws+=a.draws.length;}
for(let i=0;i<48;i++)for(const method of names){const a=execute('archive',method,i,true),b=execute('wrapper',method,i,true);assert.deepEqual(b,a,method+' World '+i);wrapperPairs++;}
console.log('PASS population ordered source/host/callback parity',JSON.stringify({corePairs,wrapperPairs,readEntries,privateDraws}));
// Actual installed cave source graph, including its packs-reference law. Every
// result is the original table object; no sorting, copying or pool narrowing.
let cavePairs=0;
const sentry=Math.random;Math.random=()=>{throw Error('Fauna resolver consumed global RNG');};
try {
 for(const face of CAVE_FACE_IDS)for(const depth of [0,1,2,5,9,20])for(const anchor of [undefined,'plains','volcanic','missing'])for(const seed of [0,713,0xffffffff]) {
  const def={...ZONES[START_ZONE],id:'cave-source-control',fauna:undefined,faunaProvenance:undefined,biome:undefined,caveDepth:depth,seed,anchor,packs:TILESETS[face]?.packs};
  delete def.dimension;
  assert.equal(core.nativeCaveAirFor(realSources,def),Old.caveAirFor(def));
  assert.equal(World.wildlifeTableFor(def),Old.wildlifeTableFor(def));cavePairs+=2;
 }
 const def={...ZONES[START_ZONE],fauna:undefined,faunaProvenance:undefined,biome:undefined,caveDepth:3,seed:713,packs:TILESETS[CAVE_FACE_IDS[0]]?.packs,anchor:'plains'};delete def.dimension;
 const detached=structuredClone(def);
 assert.equal(core.nativeCaveAirFor(realSources,detached),Old.caveAirFor(detached));
 assert.equal(core.nativeCaveAirFor(realSources,detached),undefined,'detached packs are not authenticated native face identity');
 for(const fauna of [[],WILDLIFE.plains]) {
  assert.equal(core.nativeWildlifeTableFor(realSources,{...def,fauna},()=>{throw Error('authored fauna read cave');}),fauna);
  assert.equal(core.nativeWildlifeTableFor(realSources,{...def,faunaProvenance:fauna},()=>{throw Error('saved provenance read cave');}),fauna);
 }
 assert.equal(core.nativeWildlifeTableFor(realSources,{...def,biome:'missing'},()=>{throw Error('biome miss read cave');}),undefined);
 const host={get sim():core.NativePopulationSim {throw Error('authored cohort read campaign');}};
 assert.equal(core.nativeBaseTable(host,realSources,{...def,cohort:'authored'}),def.packs?.table);
 assert.equal(core.nativeVerminPressure({sim:{verminfallField:undefined} as any}),1);
 assert.equal(core.nativeVerminPressure({sim:{verminfallField:{townPressure:()=>0}} as any}),0);
 assert.equal(core.nativeVerminPressure({sim:{verminfallField:{townPressure:()=>1.75}} as any}),1.75);
} finally {Math.random=sentry;}
console.log('PASS actual cave/wildlife source identity and early gates',cavePairs);

// Actual full native loads: use every original objective/environment stage.
// These snapshots compare complete retained generation and every monster birth
// attempt/body; the helper does not itself own or reorder those stages.
const loadFixtures=[{seed:713,target:{x:6765,y:160},mintSeed:2229205504,index:810064},{seed:713,target:{x:-67.5,y:-8745},mintSeed:924637573,index:810108},{seed:991,target:{x:-35,y:1280},mintSeed:1015847609,index:810204}];
const natural:ZoneDef[]=[],naturalBodies:Actor[][]=[],naturalPlayers:Actor[]=[];
let fullBirths=0,fullDraws=0;
function nativeLoad(archived:boolean,f:typeof loadFixtures[number]) {
 const instanceNames=['simView','baseTable','effectiveSpawn'] as const,staticNames=['wildlifeTableFor','caveAirFor'] as const;
 const descriptors=instanceNames.map(name=>[name,Object.getOwnPropertyDescriptor(World.prototype,name)!] as const);
 const staticDescriptors=staticNames.map(name=>[name,Object.getOwnPropertyDescriptor(World,name)!] as const);
 const created:Actor[]=[],stageTape:unknown[]=[],rngTape:number[]=[];
 const originalFactory=World.prototype.createMonster,originalNext=Rng.prototype.next;
 for(const [name,descriptor]of descriptors)Object.defineProperty(World.prototype,name,{...descriptor,value:function(this:any,...args:any[]){
  const result=(archived?Old.prototype[name]:descriptor.value).apply(this,args);
  const value=name==='simView'?{...result,terrain:undefined,gates:[...result.gates],visited:[...result.visited],surveyed:[...result.surveyed]}:result;
  stageTape.push([name,serializeNativeAreaData(value)]);return result;
 }});
 for(const [name,descriptor]of staticDescriptors)Object.defineProperty(World,name,{...descriptor,value:function(...args:any[]){const result=(archived?Old[name]:descriptor.value)(...args);stageTape.push([name,serializeNativeAreaData(result)]);return result;}});
 World.prototype.createMonster=function(...args:Parameters<typeof originalFactory>){const a=originalFactory.apply(this,args);created.push(a);return a;};
 Rng.prototype.next=function(){const n=originalNext.call(this);rngTape.push(n);return n;};
 // Sea identity owns a private memo/stream. Compare equally cold native
 // loads, including those draws, rather than comparing cold against warm.
 clearSeaMemo();resetActorIdCounter(10000);
 try{return withSeededRandom(f.seed,()=>{
  const w:any=makeSimWorld('warrior',f.seed);w.sim.bindGeographyPolicies();const reader=createNativeGeographyReader(captureNativeGeographySource(f.seed));
  const z=placeZoneAt(f.target,null,w.zoneMap,f.index,{seed:f.mintSeed,level:10,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt});w.zoneMap[z.id]=z;
  created.length=0;stageTape.length=0;rngTape.length=0;
  const captured=withSeededRandom(f.mintSeed,()=>captureNativeGeneration(z,()=>w.loadZone(z.id)));
  const births=created.map(a=>captureNativeActorState(a));assert.ok(births.every(Boolean),'complete native monster birth capture');
  const residents=w.actors.filter((a:Actor)=>a!==w.player).map((a:Actor)=>captureNativeActorState(a));assert.ok(residents.every(Boolean),'complete resident non-player body capture');
  const data={zone:w.zone,arena:w.arena,exits:w.exits,walk:w.walk?.pack?.()??null,doodads:w.doodads,structures:w.structures,sidechannels:captured.sidechannels,births,residents,stageTape,rngTape,next:Math.random()};
  return {zone:z,actors:w.actors.filter((a:Actor)=>a!==w.player) as Actor[],player:w.player as Actor,data,bytes:serializeNativeAreaData(data),counts:{id:z.id,face:z.tileset,doodads:w.doodads.length,structures:w.structures.length,births:births.length,residents:residents.length,draws:rngTape.length,stages:stageTape.length}};
 });}finally{for(const [name,d]of descriptors)Object.defineProperty(World.prototype,name,d);for(const [name,d]of staticDescriptors)Object.defineProperty(World,name,d);World.prototype.createMonster=originalFactory;Rng.prototype.next=originalNext;}
}
for(const f of loadFixtures){const a=nativeLoad(true,f),b=nativeLoad(false,f);if(b.bytes!==a.bytes){for(const key of Object.keys(a.data) as (keyof typeof a.data)[]){const av=serializeNativeAreaData(a.data[key]),bv=serializeNativeAreaData(b.data[key]);if(av!==bv){let at=0;while(at<Math.min(av.length,bv.length)&&av[at]===bv[at])at++;console.error('NATIVE LOAD MISMATCH',f.index,key,at,JSON.stringify({old:av.slice(Math.max(0,at-150),at+300),current:bv.slice(Math.max(0,at-150),at+300)}));}}throw Error('Complete native population load mismatch '+f.index);}natural.push(b.zone);naturalBodies.push(b.actors);naturalPlayers.push(b.player);fullBirths+=b.counts.births;fullDraws+=b.counts.draws;console.log('PASS actual archived population World load',JSON.stringify(b.counts));}

// A/B/A with real campaign controllers and naturally minted area definitions,
// while a different live World remains standing elsewhere. Only named campaign
// services are trusted; every current-zone/player/census fallback is forbidden.
const foreign=withSeededRandom(411,()=>makeSimWorld('warrior',411)) as any;
const savedForeign={zone:foreign.zone,actors:foreign.actors,player:foreign.player};
const sim=foreign.sim,graph={...foreign.zoneMap,...Object.fromEntries(natural.map(z=>[z.id,z]))},visited=new Set(natural.map(z=>z.id)),surveyed=new Set<string>();
const campaign={zoneMap:graph,time:777,visited,surveyed,sim,continentFor:(c:{x:number;y:number})=>({kind:(c.x<0?'ocean':'land') as 'land'|'ocean'})};
const fids=Object.keys(FACTIONS).slice(0,2);
const staged=naturalBodies.map(bodies=>bodies.slice()),players=naturalPlayers;
const stagedBefore=staged.map(bodies=>serializeNativeAreaData(bodies.map(a=>captureNativeActorState(a))));
const originalForeign=new Map<string,PropertyDescriptor|undefined>();
for(const key of ['zone','actors','player']){originalForeign.set(key,Object.getOwnPropertyDescriptor(foreign,key));Object.defineProperty(foreign,key,{configurable:true,get(){throw Error('borrowed standing World '+key);}});}
const originalMethods=new Map<string,unknown>();for(const key of ['simView','baseTable','effectiveSpawn','nativePopulationHost']){originalMethods.set(key,foreign[key]);foreign[key]=()=>{throw Error('borrowed standing World '+key);};}
let areaComparisons=0;
try {
 const bindings=natural.map((zone,i)=>new NativeAreaPopulation({zone,actors:staged[i],player:players[i],campaign,sources:realSources}));
 for(const i of [0,1,0,2,1,0]) {
  const zone=natural[i],actors=staged[i],player=players[i];
  const expectedHost:any={zone,actors,player,...campaign,simView(){return Old.prototype.simView.call(this);}};
  const expected=Old.prototype.effectiveSpawn.call(expectedHost,zone,Old.prototype.baseTable.call(expectedHost,zone));
  const actual=bindings[i].packs();assert.deepEqual(actual,expected);
  const view=bindings[i].view();assert.equal(view.currentZoneId,zone.id);assert.equal(view.charLevel,player.level);assert.deepEqual(view.census,expectedHost.simView().census);
  assert.equal(bindings[i].wildlifeTableFor(),Old.wildlifeTableFor(zone));
  assert.equal(bindings[i].verminPressure(),sim.verminfallField?.townPressure()??1);
  assert.throws(()=>bindings[i].wildlifeTableFor(natural[(i+1)%natural.length]),/Foreign zone/);
  areaComparisons++;
 }
 assert.deepEqual(staged.map(bodies=>serializeNativeAreaData(bodies.map(a=>captureNativeActorState(a)))),stagedBefore,'resolution preserves every staged native body');
 const otherBefore=bindings[1].view().census;
 const prior=bindings[0].view().census[fids[0]]??0;staged[0].push({team:'enemy',dead:false,faction:fids[0]} as Actor);
 assert.equal(bindings[0].view().census[fids[0]],prior+1,'census reads the current staged bodies');
 assert.deepEqual(bindings[1].view().census,otherBefore,'another area does not inherit staged additions');
 let touched=0;const invalid:any={zone:natural[0],actors:staged[0],player:players[0],campaign,sources:realSources};
 Object.defineProperty(invalid,'zone',{get(){touched++;return savedForeign.zone;}});assert.throws(()=>new NativeAreaPopulation(invalid),/own area data/);assert.equal(touched,0);
}finally{for(const [key,d]of originalForeign){if(d)Object.defineProperty(foreign,key,d);else delete foreign[key];}for(const [key,v]of originalMethods)foreign[key]=v;}
assert.equal(foreign.zone,savedForeign.zone);assert.equal(foreign.actors,savedForeign.actors);assert.equal(foreign.player,savedForeign.player);
console.log('PASS native area population isolation',JSON.stringify({areaComparisons,fullBirths,fullDraws}));
console.log('LIMIT trusted live campaign and installed sources, exact cave reference identity, separate original stages; no complete source capture, issuer or runtime admission');
// Original imports call their functions without a receiver. The getter-tape
// harness above uses a with-environment only to observe lexical source reads;
// use direct lexical bindings here to independently pin the real call receiver.
{
 const receivers:string[]=[];
 const packs={...TILESETS[CAVE_FACE_IDS[0]].packs!};
 const sources={...realSources,TILESETS:{probe:{packs,caveFace:{biomes:{}}}},CAVE_FACE_IDS:['probe'],
  CAVE_POOLS:[{faces:['probe'],weight:1,strata:{from:1},table:WILDLIFE.plains}],
  factionAllowed:function(this:unknown){assert.equal(this,undefined);receivers.push('faction');return true;},
  presenceMul:function(this:unknown){assert.equal(this,undefined);receivers.push('presence');return 1;}} as unknown as core.NativePopulationSources;
 const args={...sources,clamp};const out:any={};
 const LexicalOld=new Function('exports','deps',...Object.keys(args),compiled+'\nreturn exports.World;')(out,{CAVE_POOL_SALT:sources.CAVE_POOL_SALT},...Object.values(args));
 const def={...ZONES[START_ZONE],fauna:undefined,faunaProvenance:undefined,biome:undefined,dimension:undefined,caveDepth:2,seed:991,packs};
 const base=packs.table,host:any={sim:{resolve:()=>({table:base,countMul:1,injectFactions:[]})},simView:()=>({})};
 LexicalOld.prototype.effectiveSpawn.call(host,def,base);LexicalOld.caveAirFor(def);const expected=receivers.splice(0);
 core.nativeEffectiveSpawn(host,sources,def,base);core.nativeCaveAirFor(sources,def);assert.deepEqual(receivers,expected);assert.ok(receivers.includes('presence')&&receivers.includes('faction'));
 console.log('PASS original unbound native source function receivers',receivers.length);
}
