/** Original/current/local native graph, complete boundary and continued layout/birth courses. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import '../src/sim/arena'; // Registration order; never the quiet makeSimWorld manifest.
import {installHeadlessShims} from '../src/sim/shims';
import {registerAllPackageFactions} from '../src/packages/factionGen';
import {validateContent} from '../src/data/validate';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {TILESETS} from '../src/data/tilesets';
import type {ZoneDef} from '../src/data/zones';
import {World} from '../src/engine/world';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {vec,angleTo,rand} from '../src/core/math';
import {Rng,withSeededRandom} from '../src/core/rng';
import {featuresInRect,atlasSeedInstalled} from '../src/world/atlas';
import {landmarkComplexes} from '../src/world/landmarkComplexes';
import {soulwayInstancesNear,SOULWAY_COURSE} from '../src/world/soulriver';
import {clearSeaMemo} from '../src/world/seas';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt,setRouteGuard} from '../src/engine/worldgen';
import {NativeAreaSceneGraph} from '../src/worldmass/nativeAreaSceneGraph';
import {NativeAreaSceneBoundaries} from '../src/worldmass/nativeAreaSceneBoundaries';
import {NativeAreaSceneGeneration} from '../src/worldmass/nativeAreaSceneGeneration';
import {runComposedNativeBirth} from '../src/worldmass/nativeSceneBirthComposition';
import {completeBirthFixture,completeBirthRoots} from './nativeSceneBirthFixture';
import {nativeGraphArchiveGzip,nativeGraphArchiveHash,nativeGraphOtherWorldHash,nativeGraphOtherWorldCount} from './nativeGraphArchive';
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=gunzipSync(Buffer.from(nativeGraphArchiveGzip,'base64'));assert.equal(hash(bytes),nativeGraphArchiveHash);
const archive=JSON.parse(bytes.toString()) as {methods:Record<string,string>;imports:{module:string;names:string[]}[];helper:string;constant:string;arrivalTail:string};
const arrivalTail=Function('vec','angleTo','rand',emit('return function(def,zoneId,firstVisit,from,isCave){'+archive.arrivalTail+'}'))(vec,angleTo,rand);
const names=Object.keys(archive.methods),bindings:Record<string,unknown>={};
for(const row of archive.imports){const mod=await import(new URL('../src/engine/'+row.module+'.ts',import.meta.url).href);for(const name of row.names)if(!name.startsWith('type '))bindings[name]=mod[name];}
const original=Function(...Object.keys(bindings),emit(archive.constant+'\n'+archive.helper+'\nreturn {\n'+Object.values(archive.methods).join(',\n')+'\n}'))(...Object.values(bindings));
const worldText=read('src/engine/world.ts'),sf=ts.createSourceFile('world.ts',worldText,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const others=cl.members.filter(m=>![...names,'nativeSceneGraphView','nativeSceneGraphHost'].includes(m.name?.getText(sf)??'')).map(m=>m.getText(sf).replace(/\r\n/g,'\n'));
assert.equal(others.length,nativeGraphOtherWorldCount);assert.equal(hash(JSON.stringify(others)),nativeGraphOtherWorldHash);
const core=ts.createSourceFile('core.ts',read('src/engine/nativeSceneGraph.ts'),99,true);
for(const [name,source]of Object.entries(archive.methods)){
 const old=(ts.createSourceFile('old.ts','class A{'+source+'}',99,true).statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const fn=core.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='nativeGraph'+name[0].toUpperCase()+name.slice(1)) as ts.FunctionDeclaration;
 assert.equal(emit('function f()'+fn.body!.getText().replace(/\bhost\b/g,'this')),emit('function f()'+old.body!.getText()),name+' original body');
 assert.equal(emit('function f('+fn.parameters.slice(1).map(p=>p.getText()).join(',')+'){}'),emit('function f('+old.parameters.map(p=>p.getText()).join(',')+'){}'),name+' original defaults');
}
assert.equal(emit(core.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='hashStr')!.getText()),emit(archive.helper));
assert.equal(emit(core.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText()==='CONNECT_DIST'))!.getText()),emit(archive.constant));
const lane=process.argv.find(x=>x.startsWith('--graph-lane='))?.split('=')[1];
if(!lane){
 console.log('PASS all 22 original graph bodies/defaults, native constants and every other World member');
 const receipts:any[]=[];
 for(const selected of ['archive','world','local']){
  const run=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--graph-lane='+selected],{encoding:'utf8',maxBuffer:16e6});
  assert.equal(run.status,0,selected+'\n'+run.stderr+'\n'+run.stdout);
  const line=run.stdout.split(/\r?\n/).find(s=>s.startsWith('GRAPH_RECEIPT '));assert.ok(line);receipts.push(JSON.parse(line.slice(14)));
 }
 assert.deepEqual(receipts[1],receipts[0],'current World matches archived graph');assert.deepEqual(receipts[2],receipts[0],'local campaign graph matches archived graph through birth');
 verifyPolicyScopes();
 console.log('PASS cold original/current/local courses',JSON.stringify({courses:receipts[0].length,receipt:hash(JSON.stringify(receipts[0])),rows:receipts[0].map(({index,mode,face,newZones,coverage,bodies,draws}:any)=>({index,mode,face,newZones,coverage,bodies,draws}))}));
}else{
 installHeadlessShims();registerAllPackageFactions();validateContent();
 const policy=Function('return ('+worldText.match(/const POCKET_CFG = (\{[^;]+\});/)![1]+')')();
 function naturalWorld(index:number){
  const account=makeAccount(),manifest=buildManifest(account,991),w:any=new World(account,Object.freeze(manifest));
  w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});w.sim.bindGeographyPolicies();
  const source=createNativeGeographyReader(captureNativeGeographySource(991));
  const spec=makeMassNativeGeographySpec(source.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'});
  const complexKinds=new Set(landmarkComplexes().map(d=>d.id));
  const complexSite=index===2?featuresInRect({x:-6000,y:-6000},{x:6000,y:6000}).find(f=>complexKinds.has(f.kind)):undefined;
  if(index===2)assert.ok(complexSite,'real installed native atlas complex');
  const mapping=new MassNativeGeography(spec),target=index===0?{x:-55,y:160}:index===1?{x:-35,y:1280}:complexSite!.seat,request=mapping.ownerContext('native-source-course/'+index,mapping.physicalAnchor(target));
  const z=placeZoneAt(request.requestedTarget,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:source.biomeAt,biomeDepthFor:source.biomeDepth,climateFor:source.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});
  w.zoneMap[z.id]=z;if(index===2)assert.ok(z.complex,'complete native complex minted');return {w,z,manifest,request};
}
 function digest(root:any){
  // Host capability declaration order is an adapter detail. Canonicalize only
  // those port names; retain every value/alias and ALL native graph, map, set,
  // body and array insertion orders. No controller or cache is omitted.
  const ports=new Set((root.roots?.theater.theaterRuns??[]).map((r:any)=>r.world));
  const seen=new Map<object,number>();const visit=(v:any):any=>{if(v instanceof Actor)return {actor:v.id};if(v===undefined)return {undefined:true};if(typeof v==='function')return {function:true};if(typeof v==='number'&&!Number.isFinite(v))return {number:String(v)};if(!v||typeof v!=='object')return v;if(seen.has(v))return {ref:seen.get(v)};const id=seen.size;seen.set(v,id);if(v instanceof Map)return {id,map:[...v].map(([k,x])=>[visit(k),visit(x)])};if(v instanceof Set)return {id,set:[...v].map(visit)};if(ArrayBuffer.isView(v))return {id,type:v.constructor.name,data:Array.from(v as any)};return {id,type:Object.getPrototypeOf(v)?.constructor?.name??null,fields:(ports.has(v)?Object.keys(v).sort():Object.keys(v)).map(k=>[k,visit(v[k])])};};return hash(JSON.stringify(visit(root)));}
 const receipts:any[]=[];
 for(const index of [0,1,2])for(const mode of index===2?['fresh','remembered']:['fresh','remembered','held','holdfast','failure','river']){
  clearSeaMemo();resetActorIdCounter(650000);
  receipts.push(withSeededRandom(991,()=>{
   const {w,z,manifest,request}=naturalWorld(index);
   if(lane==='archive')for(const name of names)w[name]=original[name];
   if(mode==='remembered'){w.loadZone(z.id);for(const a of w.actors)if(a!==w.player&&a.fromZoneGen)a.life*=.57;w.captureZoneMemory();}
   const stop=Symbol('native pre-boundary');let args:any[]=[];
   w.runNativeAreaBoundaries=(...a:any[])=>{args=a;throw stop;};
   try{w.loadZone(z.id);}catch(e){if(e!==stop)throw e;}
   assert.equal(args[0],z);assert.equal(args[1],mode!=='remembered');assert.equal(args[2],false);assert.ok(w.visited.has(z.id));
   const notices:unknown[]=[];w.text=(...a:any[])=>notices.push(['text',a]);w.notice=(...a:any[])=>notices.push(['notice',a]);
   const local=lane==='local'?completeBirthFixture(w,policy):null;
   const input=local?.input,campaign=input?.campaign??w,coast=input?.coast;
   if(input)campaign.mintVeil=w.mintVeil;
   const graph=coast?new NativeAreaSceneGraph({coast,campaign}):null;
   const boundary=graph?new NativeAreaSceneBoundaries(graph):null;
   const scene=input?.scene??w,geometry=input?.geometry??w;
   const generation=input?new NativeAreaSceneGeneration({scene:input.scene,geometry,campaign,state:input.descent.input.state}):null;
   const transition=input?.descent.input.state??w,owner:any=graph??w;
   if(mode==='held'){const field=campaign.sim.crusadeField;assert.ok(field,'real registered crusade');field.update(0,coast?coast.simView():w.simView());assert.ok(field.devIgnite(coast?coast.simView():w.simView(),z.id,180));assert.ok(field.crusadeOn(z.id)?.cityFill);}
   if(mode==='holdfast')assert.ok(campaign.sim.holdfastField?.devForce(z),'real registered holdfast');
   const initial=Object.entries(campaign.zoneMap),initialIds=new Set(Object.keys(campaign.zoneMap)),tape:any[]=[],draws:number[]=[];
   for(const name of names){const fn=owner[name];owner[name]=function(...a:any[]){tape.push(['call',name,a.map(v=>v===z?'zone':typeof v)]);const result=fn.apply(owner,a);tape.push(['return',name]);return result;};}
   if(mode==='failure'){const chart=owner.chartNeighborsOf;owner.chartNeighborsOf=function(...a:any[]){const result=chart.apply(owner,a);if(campaign.mintVeil&&Object.keys(campaign.zoneMap).length>initialIds.size)throw Error('after native graph publication');return result;};}
   if(local){for(const key of [...names,'zone','actors','exits','doodads','walk','arena','biomeFor','levelFor','continentFor','climateFor','biomeDepthFor','ensureSeaPorts','roadIsWet','landRoute','linkBackTo','placeExit','dimensionBiomeFor','liveCourses','simView','runNativeLayoutGeneration','runNativeAreaLayout','runNativeAreaBirth'])Object.defineProperty(w,key,{configurable:true,get(){throw Error('Foreign World graph/scene '+key);},set(){throw Error('Foreign World graph/scene '+key);}});}
   const next=Rng.prototype.next;Rng.prototype.next=function(){const n=next.call(this);draws.push(n);return n;};
   const course=()=>{try{
    let error:string|undefined;
    try{if(boundary)boundary.prepare(z,args[1],false);else (World.prototype as any).runNativeAreaBoundaries.call(w,...args);}catch(e){error=(e as Error).message;}
    const newZones=Object.values(campaign.zoneMap as Record<string,ZoneDef>).filter(n=>!initialIds.has(n.id));
    assert.ok(newZones.length>0||mode==='remembered'||index===2,index+'/'+mode+' '+error);for(const [id,ref]of initial)assert.equal(campaign.zoneMap[id],ref);
    assert.equal(campaign.mintVeil,false);if(mode==='failure')assert.equal(error,'after native graph publication');else assert.equal(error,undefined);
    const refs=Object.values(campaign.zoneMap as Record<string,ZoneDef>).filter(n=>n.tileset&&TILESETS[n.tileset]).map(n=>{const t=TILESETS[n.tileset!];return [n.id,n.packs===t.packs,n.theme===t.theme,n.puzzles===t.puzzles,n.scenery===t.scenery,n.hollows===t.hollows];});
    const coverage={pockets:newZones.filter(n=>n.pocket).length,fields:newZones.filter(n=>n.field).length,underways:newZones.filter(n=>n.underways?.length).length,ports:newZones.filter(n=>n.port).length,rivers:newZones.filter(n=>n.kind==='soulriver').length,locales:newZones.filter(n=>n.locale).length,complexes:newZones.filter(n=>n.complex).length};
    if(mode==='holdfast')assert.ok(coverage.pockets>0,'real earned ground, not only a gate flag');
    const boundaryHash=digest({zone:z,initial,zoneMap:campaign.zoneMap,caveMap:campaign.caveMap,exits:geometry.exits,visited:campaign.visited,surveyed:campaign.surveyed,nextGenId:campaign.nextGenId,mintVeil:campaign.mintVeil,overlays:campaign.sim.snapshotOverlays(),refs,tape,draws});
    let layoutHash:string|undefined,birthHash:string|undefined,bodies=0;
    if(!error&&mode==='river'){
     let inst:ReturnType<typeof soulwayInstancesNear>[number]|undefined;const span=SOULWAY_COURSE.strew!.span;
     for(let r=0;r<12&&!inst;r++)for(let y=-r;y<=r&&!inst;y++)for(let x=-r;x<=r&&!inst;x++)if(Math.max(Math.abs(x),Math.abs(y))===r)inst=soulwayInstancesNear({x:x*span+span/2,y:y*span+span/2},campaign.sim.biomeField.fieldSeed)[0];
     assert.ok(inst,'real dealt river');const river=owner.mintSoulriverZone(z,inst);
     assert.equal(river.kind,'soulriver');assert.ok(river.berths.length>0&&river.exits.length>0);
     const prior=Object.values(campaign.zoneMap);owner.soulriverPorts(river);
     assert.deepEqual(Object.values(campaign.zoneMap),prior,'river ports reuse exact existing owners');
     const port=owner.nearestRiverPort(inst.key,river.map);assert.ok(port&&river.exits.some((e:any)=>e.to===port.id));
     coverage.rivers++;coverage.ports+=river.exits.length;
     birthHash=digest({river,zoneMap:campaign.zoneMap,nextGenId:campaign.nextGenId,overlays:campaign.sim.snapshotOverlays(),tape,draws});
    }else if(!error){
     let generated:any;
     const generate=(entry:any)=>{
      generated=generation?generation.generate(entry):nativeGenerate.call(w,z,entry,z.id);
      if(mode==='remembered')assert.equal(generated.memory,campaign.zoneMemory.get(z.id));else assert.equal(generated.memory,null);
      if(mode==='held')assert.ok(generated.layout.structures?.length,'real held-city fixtures reach layout');
      layoutHash=digest({layout:generated.layout,seed:geometry.currentZoneSeed,rng:generated.rng.snapshot(),memory:generated.memory,transition:{charBorn:transition.charBorn,charRegrowAcc:transition.charRegrowAcc,crusadeWorksAt:transition.crusadeWorksAt},draws});
      return generated;
     };
     const nativeGenerate=local?null:w.runNativeLayoutGeneration;
     // Replay the exact original census filtering and arrival sequence. This
     // facade is test-only transition glue, not an installed source issuer.
     if(local){
      const tailHost={get player(){return scene.player;},get actors(){return scene.actors;},set actors(v){scene.actors=v;},
       seats:campaign.seats,meta:campaign.meta,arena:geometry.arena,exits:geometry.exits,ambientCamShift:w.ambientCamShift,
       clampPos:geometry.clampPos.bind(geometry),endCarom:w.endCarom.bind(w),text:campaign.text,
       runNativeLayoutGeneration:(_def:any,entry:any)=>generate(entry),
       runNativeAreaLayout:(_def:any,layout:any,entry:any)=>geometry.adopt(layout,entry),
       runNativeAreaBirth:(...a:any[])=>runComposedNativeBirth(local.host,...a as Parameters<typeof runComposedNativeBirth> extends [unknown,...infer A]?A:never),
      };
      arrivalTail.call(tailHost,z,z.id,args[1],null,false);
     }else{w.runNativeLayoutGeneration=(_def:any,entry:any)=>generate(entry);arrivalTail.call(w,z,z.id,args[1],null,false);}
     bodies=scene.actors.length;assert.ok(bodies>1,'actual native population');
     birthHash=digest({roots:completeBirthRoots(w,local,notices),rng:generated.rng.snapshot(),draws,tape});
    }
    return {index,mode,seed:request.requestedSeed,face:z.tileset,newZones:newZones.length,coverage,error,boundaryHash,layoutHash,birthHash,bodies,draws:draws.length,ambient:Math.random(),enabled:manifest.packages.filter((p:any)=>p.enabled).map((p:any)=>p.id)};
   }finally{Rng.prototype.next=next;}};
   return graph?graph.withGenerationPolicies(course):course();
  }));
 }
 console.log('GRAPH_RECEIPT '+JSON.stringify(receipts));
}

/** Real generators observe nested scoped owners; both policy families unwind on exceptions. */
function verifyPolicyScopes(){
 installHeadlessShims();registerAllPackageFactions();validateContent();
 withSeededRandom(77101,()=>{
  const make=(seed:number)=>{const account=makeAccount(),w:any=new World(account,Object.freeze(buildManifest(account,seed)));w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});return w;};
  const a=make(991),ia=completeBirthFixture(a,{arrivalGrace:1}).input;ia.campaign.mintVeil=a.mintVeil;
  const ga=new NativeAreaSceneGraph({coast:ia.coast,campaign:ia.campaign});
  const b=make(713),ib=completeBirthFixture(b,{arrivalGrace:1}).input;ib.campaign.mintVeil=b.mintVeil;
  const gb=new NativeAreaSceneGraph({coast:ib.coast,campaign:ib.campaign});
  const seen:string[]=[];
  for(const [name,coast]of [['a',ia.coast],['b',ib.coast]] as const){const fn=coast.landRoute;coast.landRoute=function(...args:any[]){seen.push(name);return fn.apply(coast,args);};}
  const probe=(expected:string)=>{seen.length=0;const z={...a.zone,id:'route-scope-proof',map:{x:0,y:0},exits:[]};placeZoneAt({x:100,y:100},null,{[z.id]:z},9001,{seed:331,tileset:'forest',forceFrontiers:0});assert.ok(seen.length>0,'native mint actually consulted road guard');assert.ok(seen.every(x=>x===expected),JSON.stringify(seen));};
  setRouteGuard(()=>{seen.push('prior');return true;});
  assert.equal(atlasSeedInstalled(),713);probe('prior');
  ga.withGenerationPolicies(()=>{
   assert.equal(atlasSeedInstalled(),991);probe('a');
   assert.throws(()=>gb.withGenerationPolicies(()=>{assert.equal(atlasSeedInstalled(),713);probe('b');throw Error('nested publication fault');}),/nested publication fault/);
   assert.equal(atlasSeedInstalled(),991);probe('a');
  });
  assert.equal(atlasSeedInstalled(),713);probe('prior');
  assert.throws(()=>ga.withGenerationPolicies(()=>{probe('a');throw Error('outer publication fault');}),/outer publication fault/);
  assert.equal(atlasSeedInstalled(),713);probe('prior');
  const before=Object.keys(ia.campaign.zoneMap).length;
  assert.throws(()=>new NativeAreaSceneGraph({coast:ia.coast,campaign:{...ia.campaign}}),/identical coast campaign/);
  assert.throws(()=>new NativeAreaSceneBoundaries(ga).prepare({...ia.scene.zone},true,false),/campaign-owned local zone/);
  assert.throws(()=>new NativeAreaSceneBoundaries(ga).prepare(ia.scene.zone,true,!ia.coast.input.state.inCave),/carried cave transition/);
  assert.equal(Object.keys(ia.campaign.zoneMap).length,before);
  assert.equal(Object.keys(a).includes('nativeSceneGraphView'),false);a.chartWithin(a.zone.map,0,'surface');assert.equal(Object.getOwnPropertyDescriptor(a,'nativeSceneGraphView')?.enumerable,false);
  setRouteGuard(null);
 });
 console.log('PASS nested real campaign/road policies restore on return and failure; mixed identities refuse before mutation');
}
