import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { clamp,vec,dist } from '../src/core/math';
import { Rng,withSeededRandom } from '../src/core/rng';
import { makeSimWorld } from '../src/sim/arena';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { createNativeGeographyReader } from '../src/world/geographySource';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { serializeNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { World } from '../src/engine/world';
import { BIOMES } from '../src/world/biomes';
import { TILESETS } from '../src/data/tilesets';
import { PROCESSION_CFG } from '../src/data/processions';
import { ZONES,START_ZONE } from '../src/data/zones';
import { isFieldPixel } from '../src/world/fieldRegion';
import { exitInside } from '../src/world/shape';
import { placeZoneAt,biomeFrontierTarget,PORTAL_EDGE_INSET,MIN_PORTAL_SEP,PORTAL_RADIUS } from '../src/engine/worldgen';
import * as core from '../src/engine/nativeExitPreparation';
// Original native World methods at264e799c, prior to this extraction. Private
// modifiers/types are erased; the executable bodies are retained in full.
const archive=gunzipSync(Buffer.from('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','base64')).toString('utf8');
assert.equal(createHash('sha256').update(archive).digest('hex'),'1f4396b7d82922309df213f4f6deb3129e83682f70da591b3b84bfec0ad85295');
const methods=JSON.parse(archive) as Record<string,string>;
const leaf=ts.createSourceFile('nativeExitPreparation.ts',readFileSync(new URL('../src/engine/nativeExitPreparation.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
assert.deepEqual(leaf.statements.filter(ts.isImportDeclaration).filter(s=>!s.importClause?.isTypeOnly).map(s=>(s.moduleSpecifier as ts.StringLiteral).text),['../core/math'],'exit core has no runtime registries or World import');

const position=methods.placeExit.slice(0,methods.placeExit.indexOf('    // BOUNDARY GATE:'))+'return pos;\n  }';
const compile=(rows:string[])=>ts.transpileModule('export class Archived {\n'+rows.join('\n')+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const oldModule=compile(Object.values(methods)),positionModule=compile([position]);
const names=['fieldExitPos','placeExit','boundaryGateFor','meldFor','exitRoadAnnotations','pickProcessionDest','separateOverlappingExits'] as const;
type Method=typeof names[number];
const copy=<T>(v:T):T=>structuredClone(v);
const realSources={PORTAL_EDGE_INSET,MIN_PORTAL_SEP,BIOMES,TILESETS,PROCESSION_CFG,isFieldPixel,exitInside,biomeFrontierTarget};
let pairs=0,wrapperPairs=0,reads=0,callbacks=0;
function execute(which:'archive'|'core'|'wrapper',name:Method,index:number,actual:boolean){
  const tape:string[]=[],warns:string[]=[];let recording=true;
  const traced=new WeakMap<object,object>();
  const trace=(value:any,path:string):any=>{if(!value||typeof value!=='object'||value instanceof Map||value instanceof Set)return value;let p=traced.get(value);if(p)return p;p=new Proxy(value,{get(t,k,r){if(recording&&typeof k==='string')tape.push(path+'.'+k);return trace(Reflect.get(t,k,r),path+'.'+String(k));}});traced.set(value,p!);return p;};
  const sides=['n','s','w','e'] as const,side=sides[index%4];
  const defs:any[]=[{to:'neighbor',side,at:.5},{to:'?',side,at:.5},{to:'neighbor',side:sides[(index+1)%4],at:.65,lock:index%3===0?'lock0':undefined}];
  const zone:any={...copy(ZONES[START_ZONE]),id:'native-exit-'+index,biome:index%3===0?'grove':'city',tileset:'meadow',shape:index%2?'ellipse':'rect',size:{w:600+index*3,h:420+index*2},map:{x:index*5,y:-index*4},exits:defs,objective:{kind:index%2?'procession':'none'},dimension:index%7===0?'hell':undefined,boundless:index%11===0};
  if(!actual&&index%3)zone.field={fixture:true};
  const arena={...zone.size,shape:zone.shape};
  const exits:any[]=defs.map((e,i)=>({pos:i===0||index%2===0?{x:90,y:90}:{x:90+i*100,y:140+i*60},to:e.to,defIndex:i,radius:36,label:'fixture'}));
  const edge:any={...defs[index%3],to:index%5===0?'?':index%5===1&&!actual?'cave':index%5===2&&!actual?'missing':'neighbor',lock:index%9===0?'lock0':index%9===1?'foreign':undefined,crossDim:index%13===0};
  if(index%6===0)edge.posFrac={fx:.2,fy:.8};if(index%6===1)edge.at=-.1;if(index%6===2)edge.at=1.2;
  const neighbor:any={...zone,id:'neighbor',name:'Native Neighbor',biome:index%3===0?'city':'jungle',tileset:index%4?'forest':'missing',exits:[],objective:{kind:'waves',waves:index%2},veiled:index%2===0};
  const info=index%5===0?null:{lockId:'lock0',defId:'guard',decorRoad:index%3===0};
  const hdef={gate:'guardian_gate',road:{chance:.5,from:'entry',radius:[16,22],kind:'road'}};
  const callback=(label:string,fn:(...args:any[])=>any)=>(...args:any[])=>{if(recording)tape.push('callback:'+label);return fn(...args);};
  let host:any;
  const sources:any=new Proxy({...realSources,...(!actual?{BIOMES:{grove:{enclave:undefined},city:{enclave:{gate:'city_gate'},meld:'metropolis_meld'},jungle:{meld:'jungle_meld'}},TILESETS:{forest:{meld:'face_meld'}},isFieldPixel:callback('isFieldPixel',(_f:any,x:number,y:number)=>index%4!==0&&x>=48&&y>=48),biomeFrontierTarget:callback('frontier',(z:any,_side:any,biome:any)=>{biome(z.map);return{x:25,y:35};})}:{}),warn:callback('warn',(s:string)=>warns.push(s))},{get(t,k,r){if(recording)tape.push('source:'+String(k));return Reflect.get(t,k,r);}});
  const deps:any={clamp,vec,dist,PORTAL_RADIUS};for(const k of Object.keys(realSources))Object.defineProperty(deps,k,{get:()=>sources[k]});Object.defineProperty(deps,'console',{get:()=>({get warn(){return sources.warn;}})});
  const exports:any={};new Function('deps','exports','with(deps){'+oldModule+'}')(deps,exports);
  const old=exports.Archived.prototype,pex:any={};new Function('deps','exports','with(deps){'+positionModule+'}')(deps,pex);
  const raw:any={zone,arena,exits,zoneMap:{neighbor},caveMap:{cave:neighbor},sim:{holdfastField:index%4===0?null:{infoFor:callback('holdfast.info',()=>info),def:callback('holdfast.def',()=>hdef)}},entryFrom:index%3===0?'neighbor':null,zoneMemory:new Map([[zone.id,{procession:{destIdx:index%4===0?1:99}}]]),
    biomeFor:callback('biome',()=>index%2?'city':'jungle'),dimensionBiomeFor:callback('dimension',()=>callback('dimension.sample',()=>index%2?'city':'jungle')),zoneMemoryFresh:callback('memory.fresh',()=>index%2===0),levelFor:callback('level',()=>17),isIllegalCrossDim:callback('crossDim',()=>!!edge.crossDim),warnCrossDim:callback('crossDim.warn',()=>{}),visited:new Set(index%3?['neighbor']:[]),surveyed:new Set(),inCave:false};
  const prototype=which==='wrapper'?World.prototype:Object.prototype;host=Object.create(prototype);
  for(const [key,value]of Object.entries(raw))Object.defineProperty(host,key,{configurable:true,get(){if(recording)tape.push('host:'+key);return trace(value,key);}});
  const calls:any={fieldExitPos:(e:any)=>core.nativeFieldExitPos(host,e,sources),placeExit:(e:any)=>core.nativeExitPosition(host,e,sources),boundaryGateFor:(e:any)=>core.nativeBoundaryGateFor(host,e,sources),meldFor:(e:any)=>core.nativeMeldFor(host,e,sources),exitRoadAnnotations:(d:any)=>core.nativeExitRoadAnnotations(host,d,sources),pickProcessionDest:(d:any)=>core.nativeProcessionDestination(host,d),separateOverlappingExits:(i:number)=>core.separateNativeExits(host,sources,i)};
  if(which!=='wrapper')for(const n of names)Object.defineProperty(host,n,{value:which==='archive'?old[n].bind(host):calls[n]});
  recording=false;const argument=name==='exitRoadAnnotations'||name==='pickProcessionDest'?trace(zone,'zone'):name==='separateOverlappingExits'?index%3:trace(edge,'edge');tape.length=0;recording=true;
  const random=Math.random,next=Rng.prototype.next,warning=console.warn;if(which==='wrapper')console.warn=message=>warns.push(String(message));Math.random=()=>{throw Error('Exit preparation consumed Math.random');};Rng.prototype.next=()=>{throw Error('Exit preparation consumed native RNG');};
  let result:any;try{result=which==='archive'&&name==='placeExit'&&!actual?pex.Archived.prototype.placeExit.call(host,argument):host[name](argument,index%3);}finally{recording=false;Math.random=random;Rng.prototype.next=next;console.warn=warning;}
  return {result:copy(result),zone:copy(zone),exits:copy(exits),tape,warns};
}
for(let i=0;i<120;i++)for(const name of names){const a=execute('archive',name,i,false),b=execute('core',name,i,false);assert.deepEqual(b,a,'original native '+name+' case '+i);pairs++;reads+=a.tape.length;callbacks+=a.tape.filter(t=>t.startsWith('callback:')).length;}
// Actual classic adapters keep their native registry references and private
// host methods. Explicit fake scene inputs make branch coverage deterministic;
// these are adapter tests, not natural content-distribution evidence.
for(let i=0;i<36;i++)for(const name of names){const a=execute('archive',name,i,true),b=execute('wrapper',name,i,true);assert.deepEqual({result:b.result,zone:b.zone,exits:b.exits,warns:b.warns},{result:a.result,zone:a.zone,exits:a.exits,warns:a.warns},'actual World delegate '+name+' case '+i);wrapperPairs++;}

// Real World loading with the archived methods installed vs the actual
// delegates. This exercises eager/native preparation and the full load owners;
// no authored source, objective, layout or structure is substituted.
const loadFixtures=[{seed:713,target:{x:6765,y:160},mintSeed:2229205504,index:810064},{seed:713,target:{x:-67.5,y:-8745},mintSeed:924637573,index:810108},{seed:991,target:{x:-35,y:1280},mintSeed:1015847609,index:810204}];
function nativeLoad(archived:boolean,f:typeof loadFixtures[number]){
  const original=new Map<string,PropertyDescriptor>();for(const name of names)original.set(name,Object.getOwnPropertyDescriptor(World.prototype,name)!);
  if(archived){const exports:any={},deps={...realSources,clamp,vec,dist,PORTAL_RADIUS,console};new Function('deps','exports','with(deps){'+oldModule+'}')(deps,exports);for(const name of names)Object.defineProperty(World.prototype,name,{...original.get(name)!,value:exports.Archived.prototype[name]});}
  try{return withSeededRandom(f.seed,()=>{
    const w:any=makeSimWorld('warrior',f.seed);w.sim.bindGeographyPolicies();const reader=createNativeGeographyReader(captureNativeGeographySource(f.seed));
    const z=placeZoneAt(f.target,null,w.zoneMap,f.index,{seed:f.mintSeed,level:10,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt});w.zoneMap[z.id]=z;
    const captured=withSeededRandom(f.mintSeed,()=>captureNativeGeneration(z,()=>w.loadZone(z.id)));
    const data={zone:w.zone,arena:w.arena,exits:w.exits,walk:w.walk?.pack?.()??null,doodads:w.doodads,structures:w.structures,sidechannels:captured.sidechannels};
    return {bytes:serializeNativeAreaData(data),counts:{face:z.tileset,doodads:w.doodads.length,structures:w.structures.length,exits:w.exits.length}};
  });}finally{for(const [name,descriptor]of original)Object.defineProperty(World.prototype,name,descriptor);}
}
for(const f of loadFixtures){const a=nativeLoad(true,f),b=nativeLoad(false,f);assert.equal(b.bytes,a.bytes,'actual native full World load '+f.index);console.log('PASS archived-method full World load',JSON.stringify(b.counts));}

console.log('PASS native exit preparation',JSON.stringify({archivePairs:pairs,actualWorldWrapperPairs:wrapperPairs,orderedReadAndCallbackEntries:reads,callbackEntries:callbacks,noRandomDraws:true,archiveSHA256:'1f4396b7d82922309df213f4f6deb3129e83682f70da591b3b84bfec0ad85295'}));
console.log('LIMIT exit geometry/annotations only; graph growth/healing, holdfast rolling, source issuer/build closure and runtime admission remain external owners');
