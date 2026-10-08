import {NativeAreaLocal,type NativeAreaLocalInput} from '../src/worldmass/nativeAreaLocal';
import {captureNativeAreaGeometry} from '../src/worldmass/nativeAreaGeometryCapture';
import {serializeNativeAreaData,restoreNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
import {NAV_CFG} from '../src/engine/world';
import {WALK_CFG} from '../src/world/gridWalk';
import {PIT_CFG} from '../src/engine/pitfall';
import {DiscIndex} from '../src/engine/spatial';
import {gunzipSync} from 'node:zlib';
import {makeSimWorld} from '../src/sim/arena';
import {generateLayout,hitSurfaceOf,normalizeDoodadBound} from '../src/engine/levelgen';
import {captureNativeGeneration} from '../src/worldmass/nativeGeneration';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {placeZoneAt} from '../src/engine/worldgen';
import type {ZoneDef} from '../src/data/zones';
import type {Bounds} from '../src/world/shape';
import {withSeededRandom} from '../src/core/rng';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import { GridWalkField } from '../src/world/gridWalk';
import { castRay, LOS_CFG } from '../src/engine/los';
import { tierElevOf } from '../src/engine/tiers';
import { vec, dist, type Vec2 } from '../src/core/math';
import type { Doodad } from '../src/engine/levelgen';
import { Rng } from '../src/core/rng';
import * as draft from '../src/engine/nativeSight';
const archive = {"commit":"8dcfa9e1","worldHash":"67d4fa4c23011c6ce4d684f3b218c17712f6fd3aaa8227c7c98b6b09f8b1bdfc","methods":{"floorElevAt":"private floorElevAt(p: Vec2): number {\n    const e = this.walk?.regionAt ? tierElevOf(this.walk.regionAt(p.x, p.y)) : null;\n    return e ?? 0;\n  }","rayElev":"private rayElev(from: Vec2, to: Vec2, fromTier?: number, toTier?: number): RayElev | undefined {\n    if (!this.zone.tiers) return undefined;\n    const eye = LOS_CFG.elev.eye;\n    return {\n      from: (fromTier ?? this.floorElevAt(from)) + eye,\n      to: (toTier ?? this.floorElevAt(to)) + eye,\n    };\n  }","shotElev":"private shotElev(from: Vec2, story?: number): RayElev | undefined {\n    if (!this.zone.tiers) return undefined;\n    const h = (story ?? this.floorElevAt(from)) + LOS_CFG.elev.eye;\n    return { from: h, to: h };\n  }","lineOfSight":"lineOfSight(from: Vec2, to: Vec2, fromTier?: number, toTier?: number): boolean {\n    return castRay(this, from, to, 'sight', this.rayElev(from, to, fromTier, toTier)) === null;\n  }","sightClipD":"sightClipD(from: Vec2, to: Vec2, fromTier?: number, toTier?: number): number {\n    const hit = castRay(this, from, to, 'sight', this.rayElev(from, to, fromTier, toTier));\n    return hit ? hit.d : Infinity;\n  }","lineOfFire":"lineOfFire(from: Vec2, to: Vec2, story?: number): boolean {\n    return castRay(this, from, to, 'shot', this.shotElev(from, story)) === null;\n  }","clipShot":"clipShot(from: Vec2, to: Vec2, story?: number): Vec2 {\n    const hit = castRay(this, from, to, 'shot', this.shotElev(from, story));\n    if (!hit) return to;\n    const back = Math.max(0, hit.d - LOS_CFG.clipBackoff);\n    const len = dist(from, to) || 1;\n    return vec(from.x + (to.x - from.x) * (back / len),\n               from.y + (to.y - from.y) * (back / len));\n  }"},"methodsHash":"3898c304f8da528f44423d33865d5bee49e0cc7e9ac9c82d464856b2873bd14a"};
const hash=(v:string)=>crypto.createHash('sha256').update(v).digest('hex');
assert.equal(hash(Object.values(archive.methods).join('\n')),archive.methodsHash);
// These seven complete method bodies are lexical, pinned originals. The scope
// supplies module bindings lazily to observe read order. Binding functions are
// bound to undefined to retain ordinary ESM lexical-call receiver semantics;
// no archived body is rewritten into the implementation under test.
const oldJs=ts.transpileModule('class Archived {\n'+Object.values(archive.methods).join('\n')+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const archived=(scope:object)=>new Function('scope','with(scope){'+oldJs+';return Archived;}')(scope);
const functions:Record<string,Function>={floorElevAt:draft.nativeFloorElevAt,rayElev:draft.nativeRayElev,shotElev:draft.nativeShotElev,lineOfSight:draft.nativeLineOfSight,sightClipD:draft.nativeSightClipD,lineOfFire:draft.nativeLineOfFire,clipShot:draft.nativeClipShot};
const names=Object.keys(functions);
interface Fixture { id:string; region?:string; tiers?:boolean; doodads?:Doodad[]; fog?:'middle'|'origin'; split?:boolean; noRegion?:boolean; walk?:GridWalkField|null; }
const d=(kind:string,x=300,y=180,radius=40,more:Partial<Doodad>={}):Doodad=>({kind,pos:{x,y},radius,...more});
const fixtures:Fixture[]=[
 {id:'analytic-clear'}, {id:'grid-ground',region:'ground'},
 ...['wall','window','parapet','arena_stands','water','chasm','butte_top','peak_terrace_3','sewer_under_wall'].map(region=>({id:'grid-'+region,region,tiers:region.includes('terrace')||region==='butte_top'||region==='sewer_under_wall'})),
 {id:'split-floor',region:'butte_top',tiers:true,split:true},
 {id:'analytic-region-absent',tiers:true,noRegion:true},
 {id:'rock',doodads:[d('rock')]},
 {id:'rock-satellites',doodads:[d('rock',300,180,55,{seed:713} as Partial<Doodad>)]},
 {id:'door-rotated',doodads:[d('door',300,180,55,{hitbox:{kind:'rect',hw:60,hh:9,rot:Math.PI/5},door:{id:'oracle/door',mode:'dwell'}})]},
 {id:'door-open',doodads:[d('door',300,180,55,{hitbox:{kind:'rect',hw:60,hh:9,rot:Math.PI/5},door:{id:'oracle/door',mode:'dwell',open:true}})]},
 {id:'door-broken',doodads:[d('door',300,180,55,{door:{id:'oracle/door',mode:'breakable',broken:true}})]},
 {id:'doodad-window',doodads:[d('window')]},
 {id:'pit-discs',doodads:[d('chasm',220),d('water',360)]},
 {id:'raised-rock',tiers:true,doodads:[d('rock',300,180,40,{tier:1})]},
 {id:'tree-trunk',doodads:[d('tree',300,180,95)]},
 {id:'tree-felled',doodads:[d('tree',300,180,95,{felled:{at:0,wake:999}})]},
 {id:'forest-cover',doodads:[d('brush',270,180,45),d('reeds',335,180,45)]},
 {id:'cover-duplicate',doodads:(()=>{const a=d('brush',300,180,55);return[a,a,a];})()},
 {id:'cover-gone',doodads:[d('brush',300,180,55,{gone:true})]},
 {id:'fog-middle',fog:'middle'}, {id:'fog-origin',fog:'origin'},
 {id:'fog-before-wall',fog:'middle',region:'wall'},
 {id:'mixed-grid-shapes',region:'parapet',tiers:true,doodads:[d('tree',240,110,55),d('door',330,210,45,{hitbox:{kind:'rect',hw:44,hh:8,rot:-.6},tier:1}),d('brush',270,170,60)]},
];
const rays:[Vec2,Vec2][]=[
 [vec(60,180),vec(540,180)],[vec(540,180),vec(60,180)],
 [vec(60,40),vec(540,320)],[vec(300,180),vec(540,180)],
 [vec(60,220),vec(540,220)],[vec(60,295),vec(540,295)],
 [vec(300,180),vec(300,180)],[vec(270,30),vec(270,330)],
 [vec(-30,180),vec(620,180)],[vec(60,180),vec(60+1e-7,180)],
];
const stories:[number|undefined,number|undefined][]=[[undefined,undefined],[0,0],[1,1],[0,3],[3,0]];
const failMarker=Object.freeze({nativeSightInjectedFailure:true});
let pairs=0,readEvents=0,rayCalls=0,exceptions=0;
function run(mode:'old'|'new',fixture:Fixture,method:string,ray:[Vec2,Vec2],story:[number|undefined,number|undefined],failAt=0) {
 const tape:unknown[][]=[];let reads=0;const ids=new WeakMap<object,string>();let nextId=0;
 const tag=(v:unknown):unknown=>{if(v===undefined)return '<undefined>';if(typeof v==='function'||v&&typeof v==='object'){if(!ids.has(v as object))ids.set(v as object,'object'+nextId++);return ids.get(v as object);}return v;};
 const log=(name:string,...args:unknown[])=>{tape.push([name,...args.map(tag)]);if(++reads===failAt)throw failMarker;};
 const sourcePoint=(p:Vec2,label:string)=>new Proxy({...p},{get(t,k,r){if(k==='x'||k==='y')log(label+'.'+String(k));return Reflect.get(t,k,r);}});
 const from=sourcePoint(ray[0],'from'),to=ray[0]===ray[1]?from:sourcePoint(ray[1],'to');ids.set(from,'from');ids.set(to,'to');
 const region=fixture.region;let walk:any=null;
 if(fixture.walk||region){
  const grid=fixture.walk??new GridWalkField(600,360,30);
  if(!fixture.walk){grid.fillRegion(0,0,599,359,'ground');grid.fillRegion(270,0,fixture.split?599:329,359,region!);}
  walk=new Proxy(grid,{get(t,k){if(['regionAt','cellSize','cellOcclusion','version'].includes(String(k)))log('walk.get.'+String(k));
   if(k==='regionAt')return function(this:unknown,x:number,y:number){log('walk.regionAt',this===walk,x,y);return grid.regionAt(x,y);};
   return Reflect.get(t,k,t);}});
 } else if(fixture.noRegion)walk={isWalkable:()=>true,snapToWalkable:(p:Vec2)=>p};
 if(walk)ids.set(walk,'walk');
 const zone=new Proxy({tiers:fixture.tiers?{levels:3}:undefined},{get(t,k,r){log('zone.get.'+String(k));return Reflect.get(t,k,r);}});ids.set(zone,'zone');
 const config=new Proxy(LOS_CFG,{get(t,k,r){log('config.get.'+String(k));const value=Reflect.get(t,k,r);return k==='elev'?new Proxy(value,{get(tt,kk,rr){log('config.elev.'+String(kk));return Reflect.get(tt,kk,rr);}}):value;}});
 const body:Record<string,unknown>={walk,zone};let host:any,sources:any,Old:any;
 const bindingValues:Record<string,unknown>={LOS_CFG:config};
 for(const [key,fn]of Object.entries({castRay,tierElevOf,dist,vec}))bindingValues[key]=function(this:unknown,...args:any[]){
  log('source.call.'+key,this===undefined,...args);
  const result=Reflect.apply(fn,undefined,args);
  if(key==='castRay'){tape.push(['ray.result',result===null?null:{...result}]);}
  return result;
 };
 // Getter reads correspond to resolving a free module binding in the archive,
 // and to reading the explicit provider slot in the new operation.
 const sourceTarget:Record<string,unknown>={};
 for(const key of Object.keys(bindingValues))Object.defineProperty(sourceTarget,key,{enumerable:true,get(){log('source.get.'+key);return bindingValues[key];}});
 sources=sourceTarget;
 const lexicalScope=new Proxy(sourceTarget,{has(t,k){return Object.hasOwn(t,k);},get(t,k,r){if(k===Symbol.unscopables)return undefined;const value=Reflect.get(t,k,r);return typeof value==='function'?value.bind(undefined):value;}});
 Old=archived(lexicalScope);
 for(const name of names)body[name]=function(this:unknown,...args:unknown[]){log('host.call.'+name,this===host,...args);return mode==='old'?Reflect.apply(Old.prototype[name],host,args):functions[name](host,sources,...args);};
 body.doodadsAt=function(this:unknown,x:number,y:number){log('host.doodadsAt',this===host,x,y);return fixture.doodads??[];};
 if(fixture.fog)body.opaqueAt=function(this:unknown,x:number,y:number){log('host.opaqueAt',this===host,x,y);return fixture.fog==='origin'||x>=180&&x<=420;};
 host=new Proxy(body,{get(t,k,r){log('host.get.'+String(k));return Reflect.get(t,k,r);}});ids.set(host,'host');
 const args=method==='floorElevAt'?[from]:method==='shotElev'?[from,story[0]]:[from,to,story[0],story[1]];
 let value:unknown,error:unknown;try{value=mode==='old'?Reflect.apply(Old.prototype[method],host,args):functions[method](host,sources,...args);}catch(e){error=e;}
 return {value:value===to?ray[1]:value,error,tape,returnsTo:value===to,reads};
}
function paired(f:Fixture,name:string,ray:[Vec2,Vec2],story:[number|undefined,number|undefined],failAt=0){
 const a=run('old',f,name,ray,story,failAt),b=run('new',f,name,ray,story,failAt);
 assert.equal(b.error,a.error,f.id+'/'+name+' exception identity');
 assert.deepEqual(b.value,a.value,f.id+'/'+name+' result');assert.equal(b.returnsTo,a.returnsTo,'clear shot returns original to alias');
 assert.deepEqual(b.tape,a.tape,f.id+'/'+name+' complete source/host/grid/point/config read and receiver tape');
 if(failAt){assert.equal(a.error,failMarker);exceptions++;}else{assert.equal(a.error,undefined);pairs++;readEvents+=a.reads;rayCalls+=a.tape.filter(r=>r[0]==='ray.result').length;}
 return a;
}

// Three complete actual native pre-layout inputs already pinned in the local
// area course: nothing is filtered or repainted for this sight comparison.
const naturalInputs=JSON.parse(gunzipSync(Buffer.from('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','base64')).toString('utf8')) as {seed:number;zone:ZoneDef;arena:Bounds;entry:Vec2;exits:Vec2[];doodads:number}[];
const naturalRows:{fixture:Fixture;arena:Bounds;entry:Vec2;count:number;face:string;layout:string;zone:ZoneDef;layoutData:ReturnType<typeof generateLayout>}[]=[];
const liveWorld=withSeededRandom(811,()=>makeSimWorld('warrior',811));
for(const f of naturalInputs){
 const zone=structuredClone(f.zone);
 const layout=withSeededRandom(zone.seed!,()=>captureNativeGeneration(zone,()=>generateLayout(zone,structuredClone(f.arena),new Rng(zone.seed!),structuredClone(f.entry),structuredClone(f.exits),[]))).value;
 assert.equal(layout.doodads.length,f.doodads);
 naturalRows.push({zone,layoutData:layout,fixture:{id:'whole-archived-'+zone.id,walk:layout.walk as GridWalkField??null,doodads:layout.doodads,tiers:!!zone.tiers},arena:f.arena,entry:f.entry,count:layout.doodads.length,face:zone.tileset!,layout:zone.layoutType??'plains'});
}
// Actual native field/depth/climate selection fixes this fourth control's forest
// face before layout; the fixture does not ask for an easier substitute face.
const forestWorld=withSeededRandom(991,()=>makeSimWorld('warrior',991));forestWorld.sim.bindGeographyPolicies();
const reader=createNativeGeographyReader(captureNativeGeographySource(991));
const forest=placeZoneAt({x:-55,y:160},null,structuredClone(forestWorld.zoneMap),810156,{seed:2468017101,level:10,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt});
assert.equal(forest.tileset,'forest');assert.equal(forest.layoutType,'districts');
const arena={...forest.size,shape:forest.shape!};const entry=vec(arena.w/2,arena.h/2);
const exits=forest.exits.map(e=>e.side==='n'?vec(arena.w*(e.at??.5),0):e.side==='s'?vec(arena.w*(e.at??.5),arena.h):e.side==='w'?vec(0,arena.h*(e.at??.5)):vec(arena.w,arena.h*(e.at??.5)));
const forestLayout=withSeededRandom(forest.seed!,()=>captureNativeGeneration(forest,()=>generateLayout(forest,arena,new Rng(forest.seed!),entry,exits,[]))).value;
naturalRows.push({zone:forest,layoutData:forestLayout,fixture:{id:'whole-natural-forest',walk:forestLayout.walk as GridWalkField??null,doodads:forestLayout.doodads,tiers:!!forest.tiers},arena,entry,count:forestLayout.doodads.length,face:forest.tileset!,layout:forest.layoutType!});

const heartwood=placeZoneAt({x:2165,y:160},null,structuredClone(forestWorld.zoneMap),810141,{seed:3451115045,level:10,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt});
assert.equal(heartwood.tileset,'heartwood');assert.equal(heartwood.layoutType,'forest');
const heartBounds={...heartwood.size,shape:heartwood.shape!},heartEntry=vec(heartBounds.w/2,heartBounds.h/2);
const heartExits=heartwood.exits.map(e=>e.side==='n'?vec(heartBounds.w*(e.at??.5),0):e.side==='s'?vec(heartBounds.w*(e.at??.5),heartBounds.h):e.side==='w'?vec(0,heartBounds.h*(e.at??.5)):vec(heartBounds.w,heartBounds.h*(e.at??.5)));
const heartLayout=withSeededRandom(heartwood.seed!,()=>captureNativeGeneration(heartwood,()=>generateLayout(heartwood,heartBounds,new Rng(heartwood.seed!),heartEntry,heartExits,[]))).value;
assert.equal(heartLayout.walk,undefined,'actual native analytic forest remains analytic; no filled synthetic rectangle');
naturalRows.push({zone:heartwood,layoutData:heartLayout,fixture:{id:'whole-natural-heartwood',walk:null,doodads:heartLayout.doodads,tiers:!!heartwood.tiers},arena:heartBounds,entry:heartEntry,count:heartLayout.doodads.length,face:heartwood.tileset!,layout:heartwood.layoutType!});

const naturalEvidence:unknown[]=[];let naturalPairs=0,livePairs=0;

const realRandom=Math.random;let randomDraws=0;Math.random=()=>{randomDraws++;throw Error('sight consumed ambient RNG');};
try{
 for(const f of fixtures)for(const ray of rays)for(const story of stories)for(const name of names)paired(f,name,ray,story);
 const fixture=fixtures.find(f=>f.id==='mixed-grid-shapes')!;
 for(const name of names){const a=run('old',fixture,name,rays[0],[undefined,undefined]);
  const points=[...new Set([1,2,3,4,5,6,7,8,9,10,a.reads,...a.tape.flatMap((r,i)=>String(r[0]).startsWith('source.call')?[i+1]:[])])].filter(n=>n>0&&n<=a.reads);
  // Tape rows for RayHit observations are not reads, so inject the first/last
  // read positions and source-prefix reads separately without claiming row=index.
  for(const at of points.filter(n=>n<=Math.min(10,a.reads)||n===a.reads))paired(fixture,name,rays[0],[undefined,undefined],at);
 }

 for(const row of naturalRows){
  const {w,h}=row.arena,center=vec(w/2,h/2),random=new Rng(0x517171);
  const rayList:[Vec2,Vec2][]=[[row.entry,center],[vec(45,h*.25),vec(w-45,h*.75)],[vec(w-45,h*.25),vec(45,h*.75)],
   ...Array.from({length:5},()=>[vec(random.range(0,w),random.range(0,h)),vec(random.range(0,w),random.range(0,h))] as [Vec2,Vec2])];
  for(const ray of rayList)for(const story of stories.slice(0,3))for(const name of names){paired(row.fixture,name,ray,story);naturalPairs++;}
  naturalEvidence.push({id:row.fixture.id,face:row.face,layout:row.layout,walk:row.fixture.walk?'full-native-grid':'native-analytic',doodads:row.count,rayPairs:rayList.length});
 }
 const liveSources={castRay,tierElevOf,dist,vec,LOS_CFG};const LiveOld=archived(liveSources);
 for(const method of names)for(const ray of rays.slice(0,6)){
  const args=method==='floorElevAt'?[ray[0]]:method==='shotElev'?[ray[0],undefined]:[...ray,undefined,undefined];
  const old=Reflect.apply(LiveOld.prototype[method],liveWorld,args),actual=Reflect.apply((liveWorld as any)[method],liveWorld,args);
  const next=functions[method](liveWorld,liveSources,...args);assert.deepEqual(actual,old,'actual World '+method);assert.deepEqual(next,old,'native draft vs actual World '+method);livePairs++;
 }

 assert.equal(randomDraws,0);
}finally{Math.random=realRandom;}
// Physical assertions independent of the old-v-new equality, so the course
// cannot pass merely because both paths missed the relevant fixture.
const result=(id:string,name:string,story:[number|undefined,number|undefined]=[undefined,undefined],ray=rays[0])=>run('new',fixtures.find(f=>f.id===id)!,name,ray,story).value;
for(const id of ['grid-window','grid-parapet','grid-water','grid-chasm','door-open','door-broken','doodad-window','pit-discs','tree-felled','cover-gone'])assert.equal(result(id,'lineOfSight'),true,id+' sight passes');
assert.equal(result('grid-wall','lineOfSight'),false);assert.equal(result('grid-wall','lineOfFire'),false);
assert.equal(result('grid-arena_stands','lineOfSight'),true);assert.equal(result('grid-arena_stands','lineOfFire'),false);
const rockShape=hitSurfaceOf(fixtures.find(f=>f.id==='rock-satellites')!.doodads![0],'shot');assert.equal(rockShape.kind,'multi');
assert.equal(result('door-rotated','lineOfFire'),false);assert.equal(result('rock','lineOfFire'),false);
assert.equal(result('grid-butte_top','lineOfFire',[0,0]),false);assert.equal(result('grid-butte_top','lineOfFire',[1,1]),true);
assert.equal(result('raised-rock','lineOfFire',[0,0]),true);assert.equal(result('raised-rock','lineOfFire',[1,1]),false);
assert.equal(result('forest-cover','lineOfSight'),false);assert.equal(result('forest-cover','lineOfFire'),true);
assert.equal(result('fog-origin','sightClipD'),0);assert.equal(result('fog-middle','lineOfSight'),false);assert.equal(result('fog-middle','lineOfFire'),true);
assert.equal(result('analytic-clear','sightClipD'),Infinity);assert.equal(result('analytic-region-absent','floorElevAt'),0);
// Preserve exact early gates: absent tiers never consult eye/floors; explicit
// tier zero does not fall through; shot rays do not even read opaqueAt.
for(const method of ['rayElev','shotElev']){
 const a=run('new',fixtures[0],method,rays[0],[undefined,undefined]);assert.equal(a.value,undefined);
 assert.equal(a.tape.some(t=>String(t[0]).startsWith('source.get.LOS_CFG')||String(t[0]).startsWith('host.call.floorElevAt')),false);
}
const shot=run('new',fixtures.find(f=>f.id==='fog-middle')!,'lineOfFire',rays[0],[0,0]);assert.equal(shot.tape.some(t=>String(t[0]).includes('opaqueAt')),false);
const tierZero=run('new',fixtures.find(f=>f.id==='split-floor')!,'rayElev',rays[0],[0,0]);assert.equal(tierZero.tape.some(t=>t[0]==='host.call.floorElevAt'),false);

// Production adapters: cold whole geometry and an explicit optical owner.
let localPairs=0,opticalRefusals=0;const localInputs:NativeAreaLocalInput[]=[];
const cfg={navigationPad:NAV_CFG.pad,eventSpacing:240,ledgeGrasp:WALK_CFG.ledgeGrasp,pitSweepGran:PIT_CFG.sweepGran};
const worldCache=(liveWorld as any).nativeSightHost();assert.equal((liveWorld as any).nativeSightHost(),worldCache);
assert.equal(Object.getOwnPropertyDescriptor(liveWorld,'nativeSightContext')!.enumerable,false);
assert.equal(Object.keys(liveWorld).includes('nativeSightContext'),false);
const foreign=withSeededRandom(37,()=>makeSimWorld('warrior',37));
const foreignKeys=['zone','walk','doodads','actors','player'];const foreignBefore=foreignKeys.map(k=>(foreign as any)[k]);let foreignReads=0;
for(const key of ['lineOfSight','lineOfFire','clipShot','doodadsAt','opaqueAt'])Object.defineProperty(foreign,key,{configurable:true,value(){foreignReads++;throw Error('foreign world borrowed for local sight');}});
const sourceBindings={LOS_CFG,castRay,tierElevOf,dist,vec};const AreaOld=archived(sourceBindings);
for(const row of naturalRows){
 const geometry=captureNativeAreaGeometry({sourceIdentity:'sight-native/'+row.zone.id,bounds:row.arena,layout:row.layoutData});
 const input:NativeAreaLocalInput={zone:row.zone,geometry,entry:row.entry,playerPosition:row.entry,config:cfg};localInputs.push(input);
 const bytes=serializeNativeAreaData(input),local=new NativeAreaLocal(input),cold=new NativeAreaLocal(restoreNativeAreaData<NativeAreaLocalInput>(bytes));
 const originalDoodads=structuredClone(row.layoutData.doodads);for(const body of originalDoodads)normalizeDoodadBound(body);const index=new DiscIndex<Doodad>();index.build(originalDoodads);
 const testRays:[Vec2,Vec2][]=[[row.entry,vec(row.arena.w/2,row.arena.h/2)],[vec(50,row.arena.h/2),vec(row.arena.w-50,row.arena.h/2)],[vec(row.arena.w*.2,row.arena.h*.2),vec(row.arena.w*.8,row.arena.h*.8)]];
 for(const fog of [false,true])for(const ray of testRays)for(const story of stories.slice(0,3))for(const method of ['lineOfSight','sightClipD','lineOfFire','clipShot']){
  const oldTape:unknown[]=[],newTape:unknown[]=[],coldTape:unknown[]=[];
  const service=(tape:unknown[])=>{const own={fog,opaqueAt(this:unknown,x:number,y:number){assert.equal(this,own);tape.push([x,y]);return own.fog&&x>=row.arena.w*.3&&x<=row.arena.w*.7;}};return own;};
  const a=service(oldTape),b=service(newTape),c=service(coldTape);
  const oldHost=Object.assign(Object.create(AreaOld.prototype),{zone:row.zone,walk:row.fixture.walk??null,doodadsAt:(x:number,y:number)=>index.at(x,y),opaqueAt:(x:number,y:number)=>a.opaqueAt(x,y)});
  const args=[...ray,story[0],story[1]],expected=Reflect.apply(oldHost[method],oldHost,args);
  const actual=Reflect.apply((local.sight(b) as any)[method],undefined,args),restored=Reflect.apply((cold.sight(c) as any)[method],undefined,args);
  assert.deepEqual(actual,expected,row.fixture.id+' local '+method);assert.deepEqual(restored,expected,row.fixture.id+' cold '+method);
  assert.deepEqual(newTape,oldTape,'same explicit optical callback order');assert.deepEqual(coldTape,oldTape,'cold optical callback order');localPairs++;
 }
 assert.equal(serializeNativeAreaData(input),bytes,'sight leaves complete generated source unchanged');
}
assert.equal(foreignReads,0);foreignKeys.forEach((key,i)=>assert.equal((foreign as any)[key],foreignBefore[i]));
const plainInput=structuredClone(localInputs[0]);plainInput.zone={...plainInput.zone,tiers:undefined};plainInput.geometry=captureNativeAreaGeometry({sourceIdentity:'sight-empty-control',bounds:plainInput.geometry.bounds,layout:{doodads:[],pois:[],camps:[],breakables:[],npcs:[],garrisons:[],caveSeeds:[]}});
const plain=new NativeAreaLocal(plainInput);
for(const services of [undefined,{},Object.create({opaqueAt:()=>false}),{opaqueAt:3}]){assert.throws(()=>plain.sight(services as any));opticalRefusals++;}
let opticalGets=0;assert.throws(()=>plain.sight(Object.defineProperty({},'opaqueAt',{enumerable:true,get(){opticalGets++;return()=>false;}}) as any));assert.equal(opticalGets,0);opticalRefusals++;
const moving={opaque:true,opaqueAt(){return this.opaque;}};const movingSight=plain.sight(moving),a=vec(100,100),b=vec(300,100);
assert.equal(movingSight.lineOfSight(a,b),false);moving.opaque=false;assert.equal(movingSight.lineOfSight(a,b),true,'explicit local fog state remains live');
// Validate the capability itself once, then retain that same authority: removing
// an own service must not silently replace it with a process prototype service.
const pinned:{opaqueAt?:()=>boolean}={opaqueAt:()=>true};const pinnedSight=plain.sight(pinned as any);delete pinned.opaqueAt;
Object.defineProperty(Object.prototype,'opaqueAt',{configurable:true,value:()=>false});
try{assert.equal(pinnedSight.lineOfSight(a,b),false,'own validated optical capability cannot fall through to inherited function');}finally{delete (Object.prototype as any).opaqueAt;}

const report={localPairs,opticalRefusals,naturalPairs,livePairs,naturalEvidence,archiveCommit:archive.commit,archiveWorldHash:archive.worldHash,archiveMethodsHash:archive.methodsHash,fixtures:fixtures.map(f=>f.id),pairs,readEvents,rayCalls,exceptions,randomDraws,status:'PASS',scope:'Same native castRay and rules; explicit fog callback is not live fog-field/controller ownership.'};
if(process.env.NATIVE_SIGHT_REVIEW_REPORT)fs.writeFileSync(process.env.NATIVE_SIGHT_REVIEW_REPORT,JSON.stringify(report,null,2));
console.log('Native sight independent oracle PASS',report);
