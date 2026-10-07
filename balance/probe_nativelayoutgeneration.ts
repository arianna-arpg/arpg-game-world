import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {nativeZoneMemoryFresh,nativeCrusadeFixtureSpecs} from '../src/engine/nativeLayoutGeneration';
import {CRUSADE_SURGE} from '../src/packages/defs/crusade';
import {massDormancyPins} from '../src/worldmass/dormancy';
import {Actor} from '../src/engine/actor';
import ts from 'typescript';
import '../src/sim/arena';
import {installHeadlessShims} from '../src/sim/shims';
import {registerAllPackageFactions} from '../src/packages/factionGen';
import {validateContent} from '../src/data/validate';
import {makeAccount} from '../src/meta/account';import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {World} from '../src/engine/world';
import {Rng,rollSeed,withSeededRandom} from '../src/core/rng';
import {vec,clamp,dist} from '../src/core/math';
import {generateLayout} from '../src/engine/levelgen';
import {ZONE_MEMORY_CFG} from '../src/engine/zonecontents';
import {STRUCTURES} from '../src/data/structures';
import {captureNativeGeographySource} from '../src/world/captureGeography';import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import {serializeNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
import {NativeAreaSceneGeneration} from '../src/worldmass/nativeAreaSceneGeneration';
function naturalWorld(index:number){
  const account=makeAccount(),manifest=buildManifest(account,991),w:any=new World(account,Object.freeze(manifest));
  w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});w.sim.bindGeographyPolicies();
  const source=createNativeGeographyReader(captureNativeGeographySource(991));
  const spec=makeMassNativeGeographySpec(source.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'});
  const mapping=new MassNativeGeography(spec),target=index===0?{x:-55,y:160}:{x:-35,y:1280},request=mapping.ownerContext('native-source-course/'+index,mapping.physicalAnchor(target));
  const z=placeZoneAt(request.requestedTarget,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:source.biomeAt,biomeDepthFor:source.biomeDepth,climateFor:source.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});
  w.zoneMap[z.id]=z;return {w,z,manifest,request};
}

const archivedBytes=gunzipSync(Buffer.from('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','base64'));
assert.equal(createHash('sha256').update(archivedBytes).digest('hex'),'75a4afd22db55048001d9592869d6f7080b0215155284862ff358ff168dca6ba');
type LayoutArchive={base:string;methods:{name:string;text:string;body:string}[];body:string};
const archive=JSON.parse(archivedBytes.toString()) as LayoutArchive;
const bindings={Rng,rollSeed,vec,clamp,dist,generateLayout,ZONE_MEMORY_CFG,STRUCTURES};
const compile=(s:string)=>Function(...Object.keys(bindings),ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(...Object.values(bindings));
const methods=Object.fromEntries(archive.methods.map((m:any)=>[m.name,compile('return function'+m.text.slice(m.text.indexOf('(')))]));
const original=compile('return function(def,entry,zoneId){'+archive.body+'return {memory,layoutSeed,rng,layout};}');
installHeadlessShims();registerAllPackageFactions();validateContent();
function graph(root:unknown):unknown {const seen=new Map<object,number>();function visit(v:any):any{if(typeof v==='function')return {fn:String(v)};if(!v||typeof v!=='object')return v;if(seen.has(v))return {ref:seen.get(v)};const id=seen.size;seen.set(v,id);if(ArrayBuffer.isView(v))return {id,type:v.constructor.name,values:Array.from(v as any)};if(v instanceof Map)return {id,type:'Map',entries:[...v].map(([k,x])=>[visit(k),visit(x)])};if(v instanceof Set)return{id,type:'Set',values:[...v].map(visit)};return{id,type:v.constructor?.name??'null',fields:Object.keys(v).map(k=>[k,visit(v[k])])};}return visit(root);}
const receipts:any[]=[];let totalDoodads=0,totalStructures=0,totalDraws=0;
for(let index=0;index<2;index++)withSeededRandom(991,()=>{
 const {w,z}=naturalWorld(index);w.loadZone(z.id);
 const actual={sim:w.sim,arena:w.arena,exits:w.exits,player:w.player,actors:w.actors};
 const field=actual.sim.crusadeField;field?.update(0,w.simView());
 for(const held of [false,true]){
  if(held){assert(field?.devIgnite(w.simView(),z.id,180),'actual native crusade ignition');assert(field.crusadeOn(z.id)?.cityFill,'actual held city');}
  for(const mode of ['fresh','remembered','boundless','seedless','zero-seed']){
   const def={...z,...(mode==='boundless'?{boundless:true}:{}),...(mode==='seedless'?{seed:undefined}:mode==='zero-seed'?{seed:0}:{})};
   const entry=vec(w.zoneEntry.x,w.zoneEntry.y),memory={seed:1031,charBorn:21,savedAt:99,enemies:[]};
   const run=(lane:'archive'|'local'|'world')=>{
    const local=lane==='local';
    const tape:any[]=[],values:any={zoneMemory:new Map(mode==='remembered'||mode==='boundless'?[[def.id,memory]]:[]),time:101,inCave:false,sim:actual.sim,arena:actual.arena,exits:actual.exits,currentZoneSeed:789,charBorn:65,charRegrowAcc:13,farPointDraws:57,crusadeWorksAt:vec(6,8)};
    const properties=(keys:string[])=>{const o:any={};for(const key of keys)Object.defineProperty(o,key,{enumerable:true,configurable:true,get(){tape.push(['get',key]);return values[key];},set(v){tape.push(['set',key]);values[key]=v;}});return o;};
    const scene={zone:def,actors:actual.actors,player:actual.player};
    const geometry=Object.assign(properties(['arena','exits','currentZoneSeed','farPointDraws']),{state:scene});
    const state=properties(['inCave','charBorn','charRegrowAcc','crusadeWorksAt']);
    const campaign=properties(['zoneMemory','time','sim']);
    const owner=local?new NativeAreaSceneGeneration({scene,geometry,state,campaign}):null;
    const host=properties(Object.keys(values));
    for(const name of ['zoneMemoryFresh','crusadeFixtureSpecs'])Object.defineProperty(host,name,{get(){return(...a:unknown[])=>methods[name].apply(host,a);}});
    const restore:(()=>void)[]=[];
    if(lane==='world'||local)for(const key of [...Object.keys(values),...(local?['zone','zoneMemoryFresh','crusadeFixtureSpecs','runNativeLayoutGeneration']:[])]){
     const old=Object.getOwnPropertyDescriptor(w,key);Object.defineProperty(w,key,{configurable:true,...(local?{get(){throw Error('foreign standing World '+key);}}:Object.getOwnPropertyDescriptor(host,key))});restore.push(()=>{if(old)Object.defineProperty(w,key,old);else delete w[key];});
    }
    let draws=0;const stream=new Rng(62415),prior=Math.random;Math.random=()=>{draws++;return stream.next();};
    try{
     const out=local?owner!.generate(entry):lane==='world'?w.runNativeLayoutGeneration(def,entry,def.id):original.call(host,def,entry,def.id);
     assert.equal(out.memory,mode==='remembered'?memory:null,'native memory identity');
     assert.equal(values.currentZoneSeed,out.layoutSeed);assert.equal(values.charBorn,mode==='remembered'?21:101);
     assert.equal(values.charRegrowAcc,0);assert.equal(values.farPointDraws,0);
     return {layout:graph(out.layout),seed:out.layoutSeed,cursor:out.rng.snapshot(),values:serializeNativeAreaData({currentZoneSeed:values.currentZoneSeed,charBorn:values.charBorn,charRegrowAcc:values.charRegrowAcc,farPointDraws:values.farPointDraws,crusadeWorksAt:values.crusadeWorksAt}),tape,draws,ambient:stream.snapshot(),doodads:out.layout.doodads.length,structures:out.layout.structures?.length??0};
    }finally{Math.random=prior;for(const undo of restore.reverse())undo();}
   };
   const before=run('archive'),after=run('local'),world=run('world');assert.deepEqual(after,before,index+'/'+held+'/'+mode+' local');assert.deepEqual(world,before,index+'/'+held+'/'+mode+' World');
   assert(before.doodads>0);if(held)assert(before.structures>0,'native works passed into physical layout');
   totalDoodads+=before.doodads;totalStructures+=before.structures;totalDraws+=before.draws;
   receipts.push({index,held,mode,doodads:before.doodads,structures:before.structures,draws:before.draws});
  }
 }
});

console.log('PASS',receipts.length,'complete native layout triples',totalDoodads,'doodads',totalStructures,'structures',totalDraws,'ambient draws');

// Independently authored archived source/read/held-city controls.
function sourceControls(archive:LayoutArchive,source:string){
const sf=ts.createSourceFile('core.ts',source,ts.ScriptTarget.Latest,true),functions=Object.fromEntries(sf.statements.filter(ts.isFunctionDeclaration).map(n=>[n.name!.text,n]));
const print=(s:string)=>ts.createPrinter({removeComments:true}).printFile(ts.createSourceFile('x.ts','function f(){'+s+'}',ts.ScriptTarget.Latest,true));
for(const [name,original]of [['nativeZoneMemoryFresh','zoneMemoryFresh'],['nativeCrusadeFixtureSpecs','crusadeFixtureSpecs']]){
 const fn=functions[name];assert.equal(print(fn.body!.getText(sf).slice(1,-1).replace(/\bhost\./g,'this.')),print(archive.methods.find((m:any)=>m.name===original)!.body.slice(1,-1)));
}
const coreBody=functions.generateNativeAreaLayout.body!.getText(sf).slice(1,-1).replace(/\bhost\./g,'this.').replace(/\s*return \{memory,layoutSeed,rng,layout\};\s*$/,'');assert.equal(print(coreBody),print(archive.body));
const compile=(args:string[],code:string,bindings:string[],values:unknown[])=>Function(...bindings,'"use strict";'+ts.transpileModule('return function('+args.join(',')+'){'+code+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(...values);
const method=(name:string)=>compile(['def','entry'],archive.methods.find((m:any)=>m.name===name)!.body.slice(1,-1),['ZONE_MEMORY_CFG','STRUCTURES','Rng','vec','clamp','dist'],[ZONE_MEMORY_CFG,STRUCTURES,Rng,vec,clamp,dist]);
const fixtureOriginal=method('crusadeFixtureSpecs');let fixtures=0,cityRows=0;
for(const tier of CRUSADE_SURGE.tiers)for(const seed of [0,991,0xffffffff])for(const arena of [{w:800,h:700},{w:3400,h:3600},{w:5200,h:4200}]){
 const info={...tier},host:any={inCave:false,sim:{crusadeField:{crusadeOn(id:string){assert.equal(this,host.sim.crusadeField);assert.equal(id,'held');return info;}}},arena,exits:[{pos:{x:80,y:100}},{pos:{x:arena.w-70,y:arena.h-80}}]};
 const def:any={id:'held',seed,objective:{kind:'clear'}},entry={x:300,y:400};
 const attempt=(local:boolean)=>{const next=Rng.prototype.next,draws:number[]=[];Rng.prototype.next=function(){const v=next.call(this);draws.push(v);return v;};try{return {value:local?nativeCrusadeFixtureSpecs(host,def,entry):fixtureOriginal.call(host,def,entry),draws};}finally{Rng.prototype.next=next;}};
 const a=attempt(false),b=attempt(true);assert.deepEqual(b,a);fixtures++;if(tier.cityFill){assert(a.value!.fixtures.length>1,'real city adds fill/square at least once in each course');cityRows+=a.value!.fixtures.length;}
}
let mechanisms=0;
for(const mode of ['fresh','memory','expired','boundless','memory-zero','seed-zero','roll'])for(const failure of ['none','currentZoneSeed','charBorn','crusadeFixtureSpecs','exits','generateLayout']){
 const attempt=(local:boolean)=>{
  const tape:unknown[]=[],memory={seed:mode==='memory-zero'?0:55,charBorn:23,savedAt:10};let armed=false;
  const state:any={zoneMemory:new Map([['zone',memory]]),time:30,currentZoneSeed:1,charBorn:2,charRegrowAcc:3,farPointDraws:4,crusadeWorksAt:{x:7,y:8},arena:{w:3400,h:3600},exits:[{pos:{x:1,y:2}}]};const host:any={};
  for(const k of Object.keys(state))Object.defineProperty(host,k,{get(){tape.push(['get',k]);if(armed&&k===failure)throw Error(k);return state[k];},set(v){tape.push(['set',k,v]);if(k===failure)throw Error(k);state[k]=v;}});
  Object.defineProperty(host,'zoneMemoryFresh',{get(){tape.push('select-memory');return function(this:unknown,id:string){assert.equal(this,host);tape.push(['memory',id]);return ['memory','memory-zero'].includes(mode);};}});
  Object.defineProperty(host,'crusadeFixtureSpecs',{get(){tape.push('select-fixture');if(failure==='crusadeFixtureSpecs')throw Error(failure);return function(this:unknown,...a:unknown[]){assert.equal(this,host);tape.push(['fixture',a]);armed=true;return {center:{x:70,y:80},fixtures:[{structure:'crusade_bastion',x:70,y:80}]};};}});
  const def:any={boundless:mode==='boundless',seed:mode==='roll'?undefined:mode==='seed-zero'?0:991},entry={x:9,y:10};
  const rollSeed=function(this:unknown){assert.equal(this,undefined);tape.push('rollSeed');return 77;};
  const generateLayout=function(this:unknown,...a:any[]){assert.equal(this,undefined);tape.push(['generateLayout',a.map(x=>x instanceof Rng?['rng',x.snapshot()]:x)]);if(failure==='generateLayout')throw Error(failure);return {identity:'whole-layout'};};
  const body=local?functions.generateNativeAreaLayout.body!.getText(sf).slice(1,-1):archive.body+'\nreturn {memory,layoutSeed,rng,layout};';
  const fn=compile(local?['host','def','entry','zoneId']:['def','entry','zoneId'],body,['Rng','rollSeed','vec','generateLayout'],[Rng,rollSeed,vec,generateLayout]);
  let result:any,error:string|undefined;try{result=local?fn(host,def,entry,'zone'):fn.call(host,def,entry,'zone');}catch(e){error=(e as Error).message;}
  return {tape,error,state:{...state,zoneMemory:[...state.zoneMemory]},result:result?{...result,rng:result.rng.snapshot(),memoryAlias:result.memory===memory}:undefined};
 };assert.deepEqual(attempt(true),attempt(false),mode+'/'+failure);mechanisms++;
}
// Short-circuit source reads: a missing memo must not read the clock.
const memoOld=compile(['zoneId'],archive.methods.find((m:any)=>m.name==='zoneMemoryFresh')!.body.slice(1,-1),['ZONE_MEMORY_CFG'],[ZONE_MEMORY_CFG]);
for(const saved of [null,{savedAt:0},{savedAt:20}]){const h:any={zoneMemory:new Map(saved?[['x',saved]]:[]),get time(){if(!saved)throw Error('eager clock');return 20;}};assert.equal(nativeZoneMemoryFresh(h,'x'),memoOld.call(h,'x'));}
return {astBodies:3,fixtures,cityRows,mechanisms,memoryControls:3};
}
console.log('PASS layout source/ordering controls',sourceControls(archive,fs.readFileSync(new URL('../src/engine/nativeLayoutGeneration.ts',import.meta.url),'utf8')));

function bindingAndCacheControls(){return withSeededRandom(991,()=>{
 const {w,z}=naturalWorld(0),scene={zone:z,actors:w.actors,player:w.player};
 const geometry:any={state:scene,arena:w.arena,exits:w.exits,currentZoneSeed:1,farPointDraws:2};
 const state:any={inCave:false,charBorn:3,charRegrowAcc:4,crusadeWorksAt:null};
 const campaign:any={zoneMemory:new Map(),time:10,sim:w.sim};const raw={scene,geometry,state,campaign};let refusals=0;
 for(const key of Object.keys(raw)){let reads=0;const bad={...raw};Object.defineProperty(bad,key,{get(){reads++;throw Error('binding getter');}});assert.throws(()=>new NativeAreaSceneGeneration(bad));assert.equal(reads,0);refusals++;}
 assert.throws(()=>new NativeAreaSceneGeneration({...raw,scene:{...scene}}));refusals++;
 let reads=0;const badGeometry={...geometry};Object.defineProperty(badGeometry,'state',{get(){reads++;return scene;}});assert.throws(()=>new NativeAreaSceneGeneration({...raw,geometry:badGeometry}));assert.equal(reads,0);refusals++;
 const owner=new NativeAreaSceneGeneration(raw);raw.state={...state};raw.campaign={...campaign};raw.geometry={...geometry};
 assert.strictEqual(owner.input.geometry,geometry);assert.strictEqual(owner.input.state,state);assert.strictEqual(owner.input.campaign,campaign);assert.ok(Object.isFrozen(owner.input)&&Object.isFrozen(owner.host));assert.equal(Object.keys(owner).length,0);
 for(const key of ['input','host']){const d=Object.getOwnPropertyDescriptor(owner,key)!;assert.equal(d.writable,false);assert.equal(d.configurable,false);assert.equal(d.enumerable,false);}
 const body=new Actor('layout-cache-body','enemy',{x:0,y:0});w.actors.push(body);const owned=new Map<string,Actor>([['layout-body',body]]);
 delete w.nativeLayoutGenerationView;assert.equal(massDormancyPins(w,owned).has(body),false);
 const worldHost=w.nativeLayoutGenerationHost();assert.strictEqual(w.nativeLayoutGenerationHost(),worldHost);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeLayoutGenerationView')?.enumerable,false);
 w.layoutReviewOwner=owner;assert.equal(massDormancyPins(w,owned).has(body),false,'local hidden roots and cached World host cannot pin census');
 const beforeTarget=w.player.aiTargetId;w.player.aiTargetId=body.id;assert.equal(massDormancyPins(w,owned).has(body),true,'real native dependency still pins');w.player.aiTargetId=beforeTarget;
 let selections=0;
 for(const target of [owner as any,w])for(const key of ['zoneMemoryFresh','crusadeFixtureSpecs']){
  const old=Object.getOwnPropertyDescriptor(target,key),tape:unknown[]=[];let selected=0;
  try{
   Object.defineProperty(target,key,{configurable:true,get(){selected++;return function(this:unknown,...args:unknown[]){tape.push(['old',this===target,args]);return 731;};}});
   if(target===w)delete w.nativeLayoutGenerationView;
   const host=target===w?w.nativeLayoutGenerationHost():owner.host;assert.equal(selected,0);if(target===w){assert.strictEqual(w.nativeLayoutGenerationHost(),host);assert.equal(selected,0);}
   const argument={get value(){tape.push('argument');Object.defineProperty(target,key,{configurable:true,value:function(this:unknown,...args:unknown[]){tape.push(['new',this===target,args]);return 919;}});return 17;}};
   assert.equal(host[key](argument.value,undefined,'tail'),731);assert.equal(host[key](19),919);assert.deepEqual(tape,['argument',['old',true,[17,undefined,'tail']],['new',true,[19]]]);assert.equal(selected,1);
   let argumentsRead=0;Object.defineProperty(target,key,{configurable:true,get(){throw Error('member selection');}});assert.throws(()=>host[key](++argumentsRead),/member selection/);assert.equal(argumentsRead,0);selections++;
  }finally{if(old)Object.defineProperty(target,key,old);else delete target[key];}
 }
 const local:any=owner.host;let liveReads=0,liveWrites=0;
 for(const [provider,keys]of [[geometry,['arena','exits','currentZoneSeed','farPointDraws']],[state,['inCave','charBorn','charRegrowAcc','crusadeWorksAt']],[campaign,['zoneMemory','time','sim']]] as const){for(const key of keys){const before=provider[key],replacement=key==='zoneMemory'?new Map():typeof before==='number'?901:typeof before==='boolean'?!before:Array.isArray(before)?[]:{};try{provider[key]=replacement;assert.strictEqual(local[key],replacement);liveReads++;}finally{provider[key]=before;}}}
 for(const [provider,keys]of [[geometry,['currentZoneSeed','farPointDraws']],[state,['charBorn','charRegrowAcc','crusadeWorksAt']]] as const)for(const key of keys){const before=provider[key],replacement=key==='crusadeWorksAt'?{x:37,y:81}:81;local[key]=replacement;assert.strictEqual(provider[key],replacement);local[key]=before;liveWrites++;}
 assert.equal(massDormancyPins(w,owned).has(body),false);delete w.layoutReviewOwner;
 return {refusals,selections,throwingSelections:selections,liveReads,liveWrites,nonEnumerable:true,realPinWitness:true};
});}
console.log('PASS layout local/World binding and cache controls',bindingAndCacheControls());
console.log('LIMIT exact layout preparation over supplied campaign/graph state; installed source issuance and complete mutable-scene runtime admission remain separate');
